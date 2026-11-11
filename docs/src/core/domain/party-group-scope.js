// role: [工程师]+[AI]
// party-group-scope.js — 党小组归属判据单一源（本批 P0-5）
//
// 只做纯字符串归一与比较，不读数据源；服务端读门与前端范围算法同引本件，
// 防止「各处自己写一遍 partyGroup 比较」导致口径漂移（H30 / H32）。
export const LEADER_ROLES = new Set(['leader', 'deputy-leader']);

/** 可读全支部成员进展的角色（支书 / 副支书 / 三委员 / 党委） */
export const BRANCH_READ_ROLES = new Set([
  'secretary', 'deputy-secretary', 'org-commissioner', 'prop-commissioner', 'disc-commissioner', 'party-staff',
]);

export function normalizeGroup(value) {
  return String(value == null ? '' : value).trim();
}

/** 人员所属党小组：优先 partyGroup，兼容旧字段 hostGroup；无组返回空串 */
export function groupOf(person) {
  return normalizeGroup(person && (person.partyGroup || person.hostGroup));
}

/** 两人是否同组；任一方无组即 false（不把「无组」当同组） */
export function isSameGroup(a, b) {
  const group = groupOf(a);
  return !!group && group === groupOf(b);
}
