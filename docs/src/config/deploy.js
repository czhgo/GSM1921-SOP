// role: [工程师]+[AI]
// 部署形态配置 — 构建/部署时注入，标记静态托管 vs 有后端
// 依据 content/04_web_design/deploy/AUTHENTICATION_MODEL.md §六
//
// 'static' = GitHub Pages 静态托管（docs/ 直接部署，无后端，有 about）
// 'server' = Node 一体化后端（server/ 同源，有 /api/v1 + 登录 + 持久化，无 about）
//
// 部署时按形态改此常量（GitHub Pages 保持 'static'；Node server 部署改为 'server'）。
export const DEPLOY_MODE = 'static';

// 空域 seed 回退开关（2026-09-02 部署件）：
// - true  = 演示形态（默认）：API 模式下 attendances/inspections/todos 三域为空时回退注入演示种子，体验不空窗
// - false = 真实部署（server 形态 + 真实账本）务必改 false：
//   否则用户任何一次写触发快照上传时，会把先前空表回退注入的演示种子一并写到服务端，污染真实账本。
// ⚠ **2026-09-23 批次 163 起：本常量「已接线」，改它生效**（此前登记过「全仓无消费点、改它不生效」——已不成立）。
//   唯一消费点 = `docs/src/core/data-adapter.js::init()` 的三域空表回退判据（**命名空间读取**，缺该导出时按 `true`）：
//     `if (SEED_FALLBACK && (!mockDB.attendances.length || !mockDB.inspections.length))`（考勤/考察）
//     `if (SEED_FALLBACK && !mockDB.todos.length)`（待办）
//   ⇒ false 时不注入演示数据（三域保持服务器返回的空态）。
//   **默认值保持 `true`**（不改变既有行为与既有测试基线）；生产部署按部署文档设 `false`。
// ⚠ **两种托管形态的可见性（2026-09-23 批次 163 接线；Node 侧注入于本轮补齐）**：
//   · **静态托管 / 直接以 `docs/` 为根**：本文件即真实模块，开关按上面语义生效。
//   · **Node 托管**：本文件**不会**被浏览器加载——`server/app.js` 对 `/src/config/deploy.js` 有**动态注入**。
//     该注入串现**已一并带上本常量**：由环境变量 `SEED_FALLBACK` 决定（`SEED_FALLBACK=0` ⇒ 注入 `false`；
//     缺省 / 其它值 ⇒ `true`），见 `server/app.js:55-57` 与 `server/.env.example`。⇒ Node 形态下改
//     `SEED_FALLBACK=0` 即可真正关断（此前「Node 托管下改不动」的口径已作废）。
//   边界（如实登记）：本开关**只管** `init()` 里的那三域回退；`services/*` 层另有若干「空集合 → 静态种子」
//   兜底（如 partyGroups / reviewRequests / makeupTasks），它们走的是**服务端种子**（`server/seed.js`）
//   而非本开关，故不在此列——本常量不声称覆盖它们。
export const SEED_FALLBACK = true;
