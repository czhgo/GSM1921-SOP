// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  todo-read-policy.mjs — 待办行读权限**单一源**（2026-11-10 批次 541 · 待办读权限单源）
// ════════════════════════════════════════════════════════════════
// 为什么有本文件：同一判据（到人只给本人 / 角色待办按当前角色可见）原在
//   `routes/resources/index.js::_canReadTodoRow` 与 `routes/todo-groups.js::canReadTodoRow` 各写一份，
//   口径变更要两处同改——漏一处即出现「`GET /todos` 读不到、`GET /todo-groups` 读得到」的越权面。
//   现抽成零依赖叶子件，两端 import 同一函数。
// 语义：到人主责只给本人；角色待办按当前角色可见（与前端 `TodoStore.getByRole` 同口径）。
// 纯函数、零 IO、零依赖 ⇒ 路由与单测可直接 import。
// ════════════════════════════════════════════════════════════════

/**
 * 待办行读权限（读口 `GET /todos` 与派生口 `GET /todo-groups` 共用）。
 * @param {{personId?:string, role?:string, [k:string]:any}} row 待办行或范围请求体
 * @param {{id:string, role:string}} actor 会话用户
 * @returns {boolean}
 */
export function canReadTodoRow(row, actor) {
  if (!row || !actor) return false;
  // 到人主责只给本人；角色待办按当前角色可见（与前端 TodoStore.getByRole 同口径）。
  if (row.personId) return row.personId === actor.id;
  return row.role === actor.role;
}
