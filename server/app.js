import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { initDb } from './db.js';
import { createAuthRouter } from './routes/auth.js';
import { createResourcesRouter } from './routes/resources.js';
import { createUploadsRouter } from './routes/uploads.js';
import { createReportRouter } from './routes/report.js';
import { createMemberRouter } from './routes/member.js';
import { createCommitteeRouter } from './routes/committee.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DOCS_DIR = path.resolve(__dirname, '../docs');

export function createApp({ dbPath = ':memory:' } = {}) {
  const app = express();
  // 2026-09-01 快照 gzip：/api/v1/snapshot 用 raw body（快照 payload 全量 25 域 ~66KB，
  // 前端压缩后传输；路由内手动 gunzip + parse）。须在 express.json 之前挂载，否则 gzip
  // 二进制会被 json parser 误解析。
  app.use('/api/v1/snapshot', express.raw({ type: '*/*', limit: '4mb' }));
  app.use(express.json({ limit: '2mb' }));

  app.get('/api/v1/health', (req, res) => res.json({ ok: true }));

  app.locals.db = initDb(dbPath);

  app.use('/api/v1/auth', createAuthRouter(app.locals.db));

  app.use('/api/v1', createResourcesRouter(app.locals.db));

  // 成员变更审批链路（议程记录通过 → 组织委员审批广播 → 书记确认更新阶段）
  app.use('/api/v1', createMemberRouter(app.locals.db));

  // 线上支委会表态链路（异步表态 → 书记汇总/截止）
  app.use('/api/v1', createCommitteeRouter(app.locals.db));

  app.use('/api/v1', createUploadsRouter(app.locals.db));

  // 数据上报（智慧党建/党校系统协同，T-304 部署文档 §六落地）：
  // GET /api/v1/report/:domain（JSON 拉取）/ /report/export（CSV）/ POST /report/trigger（手动推送）
  app.use('/api/v1', createReportRouter(app.locals.db));

  // 部署形态注入：server 模式下前端 deploy.js 应标记为 'server'（有后端，无「关于」门面）
  // 依据 content/04_web_design/deploy/AUTHENTICATION_MODEL.md §六（构建时注入，非运行时探测）
  app.get('/src/config/deploy.js', (req, res) => {
    res.type('application/javascript').send('export const DEPLOY_MODE = "server";\n');
  });

  // 静态托管：无后缀请求自动补 .html（T-304 遗留修复——登录跳转在部分浏览器/内嵌视图
  // 会把 workspace/xxx.html 剥成 workspace/xxx 导致 404，extensions 选项兜底解析）
  // 静态资源：强制回源校验（no-cache）——开发/测试期防浏览器启发式缓存命中旧模块
  // （2026-09-03 工程标准修复：此前无 Cache-Control → Last-Modified 启发缓存致「改了代码看不到」）
  app.use(express.static(DOCS_DIR, {
    extensions: ['html'],
    setHeaders: (res) => res.setHeader('Cache-Control', 'no-cache, must-revalidate'),
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
    console.error('[server] 未处理错误:', err);
    res.status(500).json({ error: err.message || '服务器内部错误' });
  });

  return app;
}
