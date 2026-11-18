import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { initDb } from './db.js';
import { createAuthRouter } from './routes/auth.js';
import { createResourcesRouter } from './routes/resources/index.js';
import { createUploadsRouter } from './routes/uploads.js';
import { createReportRouter } from './routes/report.js';
import { createMemberRouter } from './routes/member.js';
import { createCommitteeRouter } from './routes/committee.js';
import { createCommitteeProposalsRouter } from './routes/committee-proposals.js';
import { createSystemNoticesRouter } from './routes/system-notices.js';
import { createLeaderProgressRouter } from './routes/leader-progress.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DOCS_DIR = path.resolve(__dirname, '../docs');

export function createApp({ dbPath = ':memory:' } = {}) {
  const app = express();
  // 2026-09-01 快照 gzip：/api/v1/snapshot 用 raw body（快照 payload 全量 25 域 ~66KB，
  // 前端压缩后传输；路由内手动 gunzip + parse）。须在 express.json 之前挂载，否则 gzip
  // 二进制会被 json parser 误解析。
  app.use(createRequestLogger()); app.use(createMetricsMiddleware(() => app.locals.metrics)); app.use('/api/v1/snapshot', express.raw({ type: '*/*', limit: '24mb' })); // T2：请求 id ＋ 结构化日志（脱敏）最先挂载，后续 403/5xx 也能凭 id 串起（见 services/logger.js）；T3：同一行追加最小指标计数（services/metrics.js）；不新增行以保 README-server 取证行号；B-552-4：请求体上限抬到 24MB（预留传输开销），解压后 20MB 上限由路由内判据负责
  app.use(compression({ threshold: 1024 })); app.use(express.json({ limit: '2mb' })); app.use(createReadOnlyGuard()); // READ_ONLY=1 ⇒ 业务写口统一 403（认证域放行；见 read-only.js）；压缩只处理 >1KB 响应

  app.get('/api/v1/health', (req, res) => res.json({ ok: true }));

  app.locals.db = initDb(dbPath); app.locals.metrics = createMetrics(); app.locals.healthMonitor = createHealthMonitor({ db: app.locals.db, metrics: app.locals.metrics }); // T3：指标累加器 ＋ 深检查告警监视器（同一行追加，不新增行）

  app.use('/api/v1/auth', createAuthRouter(app.locals.db)); app.use('/api/v1/public', createPublicInfoRouter(app.locals.db)); app.use('/api/v1/health', createHealthRouter(app.locals.db, { metrics: app.locals.metrics, monitor: app.locals.healthMonitor })); // 未登录最小公开读口（见 routes/public-info.js）；**须在下方 resources 路由的统一鉴权中间件之前**挂载，否则会被 401 拦掉（本行原为单条 auth 挂载，保持行数不漂移以免 README-server 取证行号失效）；T2 深检查 `GET /api/v1/health/deep` 同行挂载（浅检查仍是上方 `:26` 的既有读口）；T3 指标 `GET /api/v1/health/metrics` 与告警监视器在同一行接入

  app.use('/api/v1', createBranchViewGuard(app.locals.db)); app.use('/api/v1', createResourcesRouter(app.locals.db)); // T14：党委进入支部后写口只读（留痕行在 branch_visits；退出 PATCH 与认证域放行）

  // 系统派生通知（R-22，2026-09-13）：POST /api/v1/system-notices —— 生成权在服务端，
  // 按 kind 注册表复算授权并生成文案，不再依赖客户端自述的 systemDerived 标记。
  app.use('/api/v1', createSystemNoticesRouter(app.locals.db));

  // 组长台「组员进展」服务端汇总（2026-09-15 批次 47-I，Q-23-41 ②）：支书裁定把「逐人归集」改为
  // 服务端汇总。聚合口径单一源 = docs/src/services/member/member-progress.js（前端 mock 态同一函数）。
  app.use('/api/v1', createLeaderProgressRouter(app.locals.db));

  // 成员变更审批链路（议程记录通过 → 组织委员审批广播 → 支书确认更新阶段）
  app.use('/api/v1', createMemberRouter(app.locals.db));

  // 线上支委会表态链路（异步表态 → 支书汇总/截止）
  app.use('/api/v1', createCommitteeRouter(app.locals.db));

  // 支委提案（统一上会事项）与回执（D-869）
  app.use('/api/v1', createCommitteeProposalsRouter(app.locals.db));

  app.use('/api/v1', createUploadsRouter(app.locals.db));

  // 数据上报（智慧党建/党校系统协同，T-304 部署文档 §六落地）：
  // GET /api/v1/report/:domain（JSON 拉取）/ /report/export（CSV）/ POST /report/trigger（手动推送）
  app.use('/api/v1', createReportRouter(app.locals.db));

  // 部署形态注入：server 模式下前端 deploy.js 应标记为 'server' ＋空域种子回退开关 SEED_FALLBACK（§六·构建时注入）；
  // 生产形态未显式给值时注入 false（Task 7.1）；显式 `0` ⇒ false、非生产未给值 ⇒ true（既有行为不变）。
  app.get('/src/config/deploy.js', (req, res) => {
    res.setHeader('Cache-Control', 'no-store'); const seedFallback = process.env.SEED_FALLBACK === undefined ? !isProductionEnv() : process.env.SEED_FALLBACK !== '0'; res.type('application/javascript').send(`export const DEPLOY_MODE = "server";\nexport const SEED_FALLBACK = ${seedFallback ? 'true' : 'false'};\nexport const DEMO_READONLY = ${process.env.DEMO_READONLY === '0' ? 'false' : 'true'};\n`);
  });

  // 静态托管：无后缀请求自动补 .html（T-304 遗留修复——登录跳转在部分浏览器/内嵌视图
  // 会把 workspace/xxx.html 剥成 workspace/xxx 导致 404，extensions 选项兜底解析）
  // 静态资源：强制回源校验（no-cache）——开发/测试期防浏览器启发式缓存命中旧模块
  // （2026-09-03 工程标准修复：此前无 Cache-Control → Last-Modified 启发缓存致「改了代码看不到」）
  app.use(express.static(DOCS_DIR, {
    extensions: ['html'],
    setHeaders: (res) => res.setHeader('Cache-Control', /[?&]v=/.test(res.req?.originalUrl || '') ? 'public, max-age=31536000, immutable' : 'no-cache, must-revalidate'),
  }));

  // 统一 JSON 错误响应：multer 大小超限 → 413，其余 → 500（避免默认 HTML 错误页破坏 API 契约）
  // 2026-08-03（I2）：express.json 超限（2mb）抛出的 PayloadTooLargeError 自带 err.status=413，
  // 先前被误判为 500 —— 有 err.status 的（body-parser/multer 等）优先透传其状态码。
  app.use((err, req, res, next) => {
    if (err.status) {
      return res.status(err.status).json({ error: err.message });
    }
    if (err && err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ error: '文件超过大小限制' });
    }
    console.error(`[server] 未处理错误 requestId=${req.requestId || '-'}:`, err); // T2：凭请求 id 串起 5xx（访问日志同一 id；见 services/logger.js）
    // 对外固定通用文案：内部错误串（SQL / 路径 / 堆栈片段）只进服务端日志，不回传客户端。
    res.status(500).json({ error: '服务器内部错误' });
  });

  // IAAA 统一身份认证入站链路（2026-09-29 批次 271）：**必须挂在这里**——上方每一行（`:22`/`:23`/`:25`/`:27`/
  // `:29-51`/`:55-57`/`:63-66`/`:71-80`）都是 `README-server.md` 的**取证靶点**，插在中间会整体漂移。
  // 挂在 `express.static` 与错误处理之后**功能上仍正确**：4 参错误处理中间件对正常请求会被 Express 跳过，
  // 未命中静态文件的请求会继续往下走 ⇒ `/api/v1/auth/iaaa/*` 照常命中。
  app.use('/api/v1/auth/iaaa', createIaaaRouter(app.locals.db));
  // 部署与对接自检（2026-09-29 批次 273：党委台「部署与对接」面板的数据源）。同上，挂在这里以保住上方行号。
  app.use('/api/v1/setup', createSetupRouter(app.locals.db));
  // 名册整表导入（Task 7.5）：PUT /api/v1/branches/:id/roster —— 单事务替换；前端只调一次。
  app.use('/api/v1', createBranchRosterRouter(app.locals.db));

  // 未登录公共门厅只读接口（2026-11-08 批次 536 · Task 6）：**追加在 createApp 末尾**——
  // 上方 `:22`–`:90` 是 `README-server.md` 的取证靶点，中间插行会整体漂移。
  app.use('/api/public', createPublicPortalRouter(app.locals.db));

  return app;
}

// ⚠ import 声明被提升，**置尾不影响语义**（与 `server.js` 同一手法）：目的是保住上方行号不漂。
import { createIaaaRouter } from './routes/iaaa.js';
import { createSetupRouter } from './routes/setup.js';
import { createReadOnlyGuard } from './read-only.js'; import { createBranchViewGuard } from './branch-view.js'; // T14：党委进入支部只读门（挂载点在 `:32` 同行追加）
import { isProductionEnv } from './env.js';
import { createBranchRosterRouter } from './routes/branch-roster.js';
import { createPublicInfoRouter } from './routes/public-info.js';
import { createPublicPortalRouter } from './routes/public-portal.js';
import compression from 'compression';
// T2 可观测底座（2026-11-15）：请求日志与深健康检查；调用点在上方 `:23` / `:30`（同行追加，不新增行）。
import { createRequestLogger } from './services/logger.js';
import { createHealthRouter } from './routes/health.js';
// T3 运维读数与告警（2026-11-15）：最小指标集 ＋ 深检查告警；调用点在上方 `:23` / `:28` / `:30`（同行追加，不新增行）。
import { createMetrics, createMetricsMiddleware } from './services/metrics.js';
import { createHealthMonitor } from './services/health-alerts.js';
