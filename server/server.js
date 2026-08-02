import { createApp } from './app.js';
import { fileURLToPath } from 'node:url';

const PORT = process.env.PORT || 3000;
const DB_PATH = process.env.DB_PATH || fileURLToPath(new URL('./data.db', import.meta.url));

const app = createApp({ dbPath: DB_PATH });
app.listen(PORT, () => {
  console.log(`[server] 光华党支部管理引擎后端已启动: http://localhost:${PORT}`);
});
