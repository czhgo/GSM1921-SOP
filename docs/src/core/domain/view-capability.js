// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  core/domain/view-capability.js — 资源级「可写 / 只读」派生（批次 524 · 2026-11-01）
// ════════════════════════════════════════════════════════════════
// 由来（支书第十条评议：「只读」应当是可计算的功能变量，不是写死的字符串）。
//   此前 `workgroup-view.js:140` / `taskforce-view.js:60` / `activity-view.js:54` /
//   `insight-view.js:99` 各自写死「· 只读」，无法随角色变化，也无法机检。
//
// 口径（看 ≠ 做）：
//   · 只判**资源级写权限**两态：能写 ⇒ 不显示「只读」；不能写 ⇒ 显示「只读」；
//   · 角色键取自 `core/domain/constants.js::ROLE_KEYS`（不在这里自造别名字符串）；
//   · 未登记的 kind（如 `insight` 知情查看）⇒ 一律只读：知情权是看，不是做；
//   · 纯函数、不读 DOM / 不读存储 ⇒ node 可直接 import 做单测。
//   · 本表是**唯一落点**：将来某台可写，只改此表一处，调用点文案自动跟随。

/** kind → 可写角色（与 `constants.js::ROLE_KEYS` 同键） */
export const RESOURCE_WRITE_ROLES = {
  workgroup: ['secretary', 'deputy-secretary', 'org-commissioner'],
  taskforce: ['secretary', 'deputy-secretary'],
  activity: ['secretary', 'deputy-secretary', 'org-commissioner', 'leader', 'deputy-leader'],
  archive: ['prop-commissioner', 'secretary', 'deputy-secretary'],
};

/**
 * 当前用户对某类资源是否可写。
 * @param {string} kind — 资源键（workgroup / taskforce / activity / archive；未登记 ⇒ 不可写）
 * @param {{role?:string}|null} [user]
 * @returns {boolean}
 */
export function canWriteResource(kind, user) {
  if (!user || !user.role) return false;
  return (RESOURCE_WRITE_ROLES[kind] || []).includes(user.role);
}

/**
 * 卡头副题里的权限约束：可写 ⇒ `''`（不显示），不可写 ⇒ `'只读'`。
 * @param {string} kind
 * @param {{role?:string}|null} [user]
 * @returns {''|'只读'}
 */
export function readonlyMeta(kind, user) {
  return canWriteResource(kind, user) ? '' : '只读';
}
