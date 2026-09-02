// server/server.js — 入口：初始化数据库，空库自动导入种子，启动服务
import { createApp } from './app.js';
import { initDb } from './db.js';
import { seedDatabase } from './seed.js';
import { startScheduler } from './services/reporting.js';
import { fileURLToPath } from 'node:url';

const PORT = process.env.PORT || 3000;
const DB_PATH = process.env.DB_PATH || fileURLToPath(new URL('./data.db', import.meta.url));
// 真实部署开关（2026-09-02 部署件）：DISABLE_SEED=1 时空库也不导入演示种子，
// 供真实支部全新建库直接录入真实数据（避免先导入 50 人演示支部再清理）。
const SEED_DISABLED = process.env.DISABLE_SEED === '1';

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
