// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  server/scripts/start-review.mjs —— 视觉检验档启动器（review）
//
//  为什么需要单独入口：`npm start` 缺省指向 `server/data.db`，那份库可能是生产库或
//  含真实名单的库。产品经理做视觉检验时应有一份可随手重建、可含演示数据的独立库，
//  否则「看一眼页面」就可能把演示写入混进生产数据。本入口只做一件事：
//    · 未显式设置 DB_PATH 时，把库指到 `server/data.review.db`；
//    · 其余启动逻辑与 `server.js` 完全一致（不复制一份启动代码）。
//  显式设置 DB_PATH 时尊重用户选择（由部署文档要求其自行确认不是生产库）。
// ════════════════════════════════════════════════════════════════
import { fileURLToPath } from 'node:url';

if (!process.env.DB_PATH) {
  process.env.DB_PATH = fileURLToPath(new URL('../data.review.db', import.meta.url));
  console.log(`[server] review 档使用独立库：${process.env.DB_PATH}（可由 DB_PATH 覆盖）`);
}

await import('../server.js');
