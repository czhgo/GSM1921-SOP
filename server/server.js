// server/server.js — 入口：初始化数据库，空库自动导入种子，启动服务
import { createApp } from './app.js';
import { initDb } from './db.js';
import { seedDatabase } from './seed.js';
import { startScheduler } from './services/reporting.js';
import { fileURLToPath } from 'node:url';

const PORT = process.env.PORT || 3000;
const DB_PATH = process.env.DB_PATH || fileURLToPath(new URL('./data.db', import.meta.url));
// 真实部署开关（2026-09-02 部署件）：DISABLE_SEED=1 时空库也不导入演示种子（真实部署务必开）；
// **2026-09-23 P0-4**：生产形态（isProductionEnv）**默认不播种**——比「忘了设 DISABLE_SEED 就灌进 50 人演示支部」更安全。
const SEED_DISABLED = process.env.DISABLE_SEED === '1' || isProductionEnv();
if (isProductionEnv() && !process.env.LOGIN_PASSWORD) { console.error('[server] ⛔ 启动被拒：生产形态（APP_ENV=production / NODE_ENV=production）必须显式设置 LOGIN_PASSWORD（所有账号共用该口令，缺省口令不得上线）。请设置该环境变量后重启。'); process.exit(1); } // P0-3：生产形态必须显式设 LOGIN_PASSWORD（全站账号共用该口令）⇒ 未设则启动即拒
const db = initDb(DB_PATH);
if (!SEED_DISABLED && db.prepare('SELECT COUNT(*) AS c FROM users').get().c === 0) {
  await seedDatabase(db);
  console.log('[server] 已导入种子数据');
}
db.close();
const app = createApp({ dbPath: DB_PATH });
const httpServer = app.listen(PORT, () => console.log(`[server] 光华党支部管理引擎后端已启动: http://localhost:${PORT}`));
// 定时任务（部署文档 §六.4）：每日 03:00 批量上报 + 每 10 分钟会议提醒扫描
startScheduler(app.locals.db);

// ════════════════════════════════════════════════════════════════
//  P0-4（2026-09-23 支书裁定「一周内上服务器」· 六项 P0）：库内「真人 / 演示账号」自检
// ════════════════════════════════════════════════════════════════
// 生产形态已**默认不播种**（见上方 SEED_DISABLED），但**存量库**可能在上线前被灌过演示种子
// ⇒ 启动时打印 users 计数与「演示种子账号」计数，让「库内是否只有真人」**可核对**（不必靠记忆）。
// 判据 = 前端演示数据源 `docs/src/data/mock/people.js::PEOPLE` 的 id 集（与 `seedDatabase` 灌的是同一份）。
// ⚠ 本段置于文件末尾：上方 `server.js:12-18`（DISABLE_SEED）/`:21`/`:22-23` 是 README-server.md 的取证靶点。
{
  const userIds = app.locals.db.prepare('SELECT id FROM users').all().map((r) => r.id);
  let demoIds = null;
  try {
    const { PEOPLE } = await import('../docs/src/data/mock/people.js');
    demoIds = new Set(PEOPLE.map((p) => p.id));
  } catch (e) {
    console.warn('[server] 自检：演示账号标识不可得（跳过演示账号计数）：', e && e.message);
  }
  const demoCount = demoIds ? userIds.filter((id) => demoIds.has(id)).length : null;
  console.log(`[server] 自检 · users 计数=${userIds.length}；演示种子账号=${demoCount === null ? '未知（标识不可得）' : demoCount}`);
  if (demoCount) {
    console.warn('[server] ⚠ 库内含演示种子账号（50 人演示支部）。真实使用前请以空库起步（生产形态已默认不播种）并清理演示账号。');
  }
}

// 运行形态判定单一源（P0-3 / P0-4）：`APP_ENV=production` 或 `NODE_ENV=production`，见 server/env.js。
// ⚠ 置尾以保上文行号（`server.js:12-18` / `:21` / `:22-23` 是 README-server.md 的取证靶点）；import 声明被提升，置尾不影响语义。
import { isProductionEnv } from './env.js';

// ════════════════════════════════════════════════════════════════
//  部署前件（2026-09-29 批次 268「部署前筹备检查」）：**优雅关闭** SIGTERM / SIGINT
// ════════════════════════════════════════════════════════════════
// 为什么需要：本服务是**常驻进程**——承载「每日 03:00 批量上报 ＋ 每 10 分钟会议提醒扫描」
//   （见 `services/reporting.js::startScheduler`，启动于上方 `:23`）。systemd / PM2 / 容器停止
//   时发的是 **SIGTERM**，Node 默认行为是**立即终止** ⇒ 在途请求被硬切断。
//   （WAL 模式本身不怕断电；优雅关闭的价值是**让在途请求跑完**、并显式关库，免留 `-wal` 未 checkpoint 的尾巴。）
// 做法：收到信号 ⇒ ① 停止接新连接（`httpServer.close()`）② 等在途连接结束（**上限 5s**，到点强行退出）
//   ③ 关库 ④ 退出码 0。**不改任何业务行为、不新增依赖**。
// 边界（如实登记）：**未处理**「排程中的定时任务」——它随进程退出而中断（下次启动会重新排期）；
//   **未做** readiness/liveness 分离探针（存活探针仍只有 `GET /api/v1/health`，见 `app.js`）。
// ⚠ 本段必须留在文件末尾：上方 `:12-18` / `:21` / `:22-23` 是 `README-server.md` 的取证靶点。
let _closing = false;
for (const sig of ['SIGTERM', 'SIGINT']) {
  process.on(sig, () => {
    if (_closing) return; // 二次信号不重复走流程（连按 Ctrl-C 不炸）
    _closing = true;
    console.log(`[server] 收到 ${sig}，开始优雅关闭（在途请求最多等 5s）…`);
    const timer = setTimeout(() => {
      console.warn('[server] 优雅关闭超时（5s），强制退出。');
      process.exit(0);
    }, 5000);
    timer.unref();
    httpServer.close(() => {
      try { app.locals.db.close(); } catch (_) { /* 库已关：忽略 */ }
      console.log('[server] 已关闭 HTTP 监听与数据库，退出。');
      process.exit(0);
    });
  });
}
