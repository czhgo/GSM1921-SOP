// role: [工程师]+[AI]
// 个人档案读取边界的单一纯函数源；服务端强制执行，mock 页面镜像展示状态。
import { BRANCH_COMMISSION_ROLES, ORG_COMMISSIONER_ROLES, DEFAULT_BRANCH_ID } from './constants.js?v=20261020h';
import { POLICY_DEFAULTS } from './policy-defaults.js?v=20261020h';

/**
 * 账号/成员的实际支部归属。
 * 为什么区分 null 与 undefined（R2-50）：
 *   · `branchId: null` = IAAA 建号后**待支部确认**，语义是「无支部」——不得回落到 br-b1，
 *     否则 br-b1 组织委员会读到待归属者档案，与「确认前什么也看不到」冲突；
 *   · 只有历史数据缺字段（undefined）才沿用存量口径回落默认支部。
 * @returns {string|null}
 */
function _branchIdOf(record) {
  if (!record) return null;
  if (record.branchId === null) return null;
  return record.branchId || DEFAULT_BRANCH_ID;
}

export const MEMBER_PROFILE_READ_FIELDS = Object.freeze([
  'id', 'name', 'studentId', 'enrollYear', 'partyGroup', 'developStage',
  'developStageSince', 'role', 'branchId', 'residenceStatus', 'residenceNote',
  'residenceHistory', 'selfProfile',
]);

/** 档案访问是“本人”或“同支部支委”；支部读取策略仅能由全组织制度裁定修改。 */
export function canReadMemberProfile(actor, member, selectedBranchId = actor?.selectedBranchId) {
  if (!actor?.id || !member?.id) return false;
  // 党委组织员不属于支部。只有从党委工作台明确选定支部后，才可在该范围内只读查阅档案。
  // 必须精确匹配显式 branchId，未归属成员与其他支部成员都不进入该视图。
  if (actor.role === 'party-staff') {
    return !!selectedBranchId && member.role !== 'party-staff' && member.branchId === selectedBranchId;
  }
  if (String(actor.id) === String(member.id)) return true;
  if (POLICY_DEFAULTS.profile?.selfProfileReadScope !== 'self-and-branch-committee') return false;
  const actorBranchId = _branchIdOf(actor);
  const memberBranchId = _branchIdOf(member);
  // 待归属（null）不参与「同支部」判定：无支部权限，不是「默认支部成员」。
  if (!actorBranchId || !memberBranchId) return false;
  return BRANCH_COMMISSION_ROLES.includes(actor.role) && actorBranchId === memberBranchId;
}

/** 名册档案字段写权仍归同支部组织委员；查看档案与编辑字段不是同一授权。 */
export function canMaintainMemberProfileFields(actor, member) {
  if (!actor?.id || !member?.id || !ORG_COMMISSIONER_ROLES.includes(actor.role)) return false;
  const actorBranchId = _branchIdOf(actor);
  const memberBranchId = _branchIdOf(member);
  // R2-50：显式 null（待归属）即无支部，禁止任何组织委员以默认支部身份维护。
  if (!actorBranchId || !memberBranchId) return false;
  return actorBranchId === memberBranchId;
}

/** 普通名册仍保留其日常组织工作所需字段，但不能顺带暴露个人自我描述。 */
export function projectMemberListRow(member, actor) {
  if (canReadMemberProfile(actor, member) || !Object.hasOwn(member || {}, 'selfProfile')) return member;
  const { selfProfile: _protectedProfile, ...rosterRow } = member;
  return rosterRow;
}

/** 专用档案端点只返回档案白名单，避免夹带认证或服务端内部字段。 */
export function projectMemberProfile(member) {
  return Object.fromEntries(MEMBER_PROFILE_READ_FIELDS
    .filter((field) => Object.hasOwn(member || {}, field))
    .map((field) => [field, member[field]]));
}
