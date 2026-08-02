// server/server.js — 入口：初始化数据库，空库自动导入种子，启动服务
import { createApp } from './app.js';
import { initDb } from './db.js';
import { seedDatabase } from './seed.js';
import { fileURLToPath } from 'node:url';

const PORT = process.env.PORT || 3000;
const DB_PATH = process.env.DB_PATH || fileURLToPath(new URL('./data.db', import.meta.url));

const db = initDb(DB_PATH);
if (db.prepare('SELECT COUNT(*) AS c FROM users').get().c === 0) {
  await seedDatabase(db);
  console.log('[server] 已导入种子数据');
}
db.close();
const app = createApp({ dbPath: DB_PATH });
app.listen(PORT, () => console.log(`[server] 光华党支部管理引擎后端已启动: http://localhost:${PORT}`));
