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
app.listen(PORT, () => console.log(`[server] 光华党支部管理引擎后端已启动: http://localhost:${PORT}`));
// 定时任务（部署文档 §六.4）：每日 03:00 批量上报 + 每 10 分钟会议提醒扫描
startScheduler(app.locals.db);

// ════════════════════════════════════════════════════════════════
//  P0-4（2026-09-23 支书裁定「一周内上服务器」· 六项 P0）：库内「真人 / 演示账号」自检
// ════════════════════════════════════════════════════════════════
// 生产形态已**默认不播种**（见上方 SEED_DISABLED），但**存量库**可能在上线前被灌过演示种子
// ⇒ 启动时打印 users 计数与「演示种子账号」计数，让「库内是否只有真人」**可核对**（不必靠记忆）。
// 判据 = 前端演示数据源 `docs/src/mock/people.js::PEOPLE` 的 id 集（与 `seedDatabase` 灌的是同一份）。
// ⚠ 本段置于文件末尾：上方 `server.js:12-18`（DISABLE_SEED）/`:21`/`:22-23` 是 README-server.md 的取证靶点。
{
  const userIds = app.locals.db.prepare('SELECT id FROM users').all().map((r) => r.id);
  let demoIds = null;
  try {
    const { PEOPLE } = await import('../docs/src/mock/people.js');
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
