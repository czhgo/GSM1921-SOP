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
//  批次 270（2026-09-29 支书令「部署先行把党委功能设置好，以及一个既存的支部 光华管理学院本科生党支部」）
//  **最小组织基线**：党委账号 1 名 ＋ 既存支部 1 个，**零成员名单**
// ════════════════════════════════════════════════════════════════
// 为什么必须有本段（本批查出的**自举死锁**）：生产形态**默认不播种**（见上方 `:12`）⇒ 空库既无 `users`
//   也无 `branches` ⇒ **谁都登不进来**（登录要查 `users`）、**也没人能建支部**（`POST /branches` 的门是
//   `party-staff`，而库里没有党委账号）。⇒ 本段补「能自举的最小形态」：
//   **一名 `party-staff`（党委组织员，组织级、不属于任一支部）＋ 一个既存支部 `br-b1`
//   （光华管理学院本科生党支部，`config` 取空组织模板口径 ⇒ 模块/块/分工全按默认、支书席位空缺待任命）**。
// 与演示种子的边界（本仓纪律：不混两种东西）：`server/seed.js::seedDatabase()` 是**演示种子**（51 人名单
//   等，为本地测试/演示而存在，仍只由 `DISABLE_SEED`/`APP_ENV` 控制，`:15-18` **一字未改**）；本段是
//   **组织基线**，**任何形态都跑且幂等**（每张表**只在为空时**补；跑过演示种子后它什么都不做）。
// ⚠ **不写任何成员名单**（支书 2026-09-29 第 3 条：「目前所有的名单都不要部署上去，那是错的！！」）。
// 位置：必须在下方自检段（P0-4）**之前**——好让自检打印的是「补完之后」的计数。
// 实现：用**内联 `await import`**，不在文件顶部加 import 声明——上方 `:12-18` / `:21` / `:22-23` 是
//   `README-server.md` 的取证靶点，**行号一个都不能漂**。
const { seedBaseline } = await import('./seed-baseline.js');
seedBaseline(app.locals.db);

// ════════════════════════════════════════════════════════════════
//  P0-4（2026-09-23 支书裁定「一周内上服务器」· 六项 P0）：库内「真人 / 演示账号」自检
// ════════════════════════════════════════════════════════════════
// 生产形态已**默认不播种**（见上方 SEED_DISABLED），但**存量库**可能在上线前被灌过演示种子
// ⇒ 启动时打印 users 计数与「演示种子账号」计数，让「库内是否只有真人」**可核对**（不必靠记忆）。
// 判据 = 前端演示数据源 `docs/src/data/mock/people.js::PEOPLE` 中**属于支部**的那些人的 id 集
//   （与 `seedDatabase` 灌的是同一份）。⚠ **只算「支部成员」**：`PEOPLE` 里的 `p_pc` 是**党委组织员**
//   （`role:'party-staff'`、`branchId: null`、**不属于任何支部**），而生产基线**必然**会建一名
//   （见上方批次 270 的最小组织基线）⇒ 若把它算进来，**每次启动都会误报「库内含演示种子账号」**。
//   本判据修正于 2026-09-29 批次 270（实测：生产空库首启后原判据报「演示种子账号=1」＝假阳性）。
// ⚠ 本段置于文件末尾：上方 `server.js:12-18`（DISABLE_SEED）/`:21`/`:22-23` 是 README-server.md 的取证靶点。
{
  const userIds = app.locals.db.prepare('SELECT id FROM users').all().map((r) => r.id);
  let demoIds = null;
  try {
    const { PEOPLE } = await import('../docs/src/data/mock/people.js');
    demoIds = new Set(PEOPLE.filter((p) => p.branchId).map((p) => p.id));
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
