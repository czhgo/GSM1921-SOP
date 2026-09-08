// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  services/group-view.js — 支部党小组分组只读聚合（书记台「党小组进展」页签数据源，2026-09-08 D8）
// ════════════════════════════════════════════════════════════════
// 背景：书记/副书记共用书记工作台（secretary.html），跨组只读掌握各党小组进展（知情≠操作）；
//   UI 层 = entries/tabs/secretary/group-progress-tab.js，本模块只提供纯聚合口径。
// 口径与数据源（全部在可改消费方计算；services/roster.js 属禁改清单——只读复用其导出函数，
//   组数据在成员档案 PersonStore.getMembers() 的 partyGroup 上聚合）：
//   - 组清单：members.partyGroup 去重（保留档案出现顺序；过滤空组与跨支部非本支部成员）；
//     组长 = 组内 role 'leader' 成员（党小组组长；无则 leaderId=null）；
//   - 组内党员数：developStage ∈ policy partyStages（roster isPartyMember 同源，含滞留党员——
//     党员身份口径，滞留仅影响「应到」不影响身份）；
//   - 待答复汇报数（开放数）：本组「组员」发起的 kind='report' 且 open 的 issues 数（issues.js
//     可改读接口数据以调用方传入为准，本模块不 import IssueStore → 纯逻辑可 node 单测）；
//     「组员」= 组内非组长成员（与 visibility.js own-group 组长视角同集：组长看本组其他成员；
//     无组长组 = 全组成员）→ 书记所见数量与组长台「组员汇报」收件箱同源；
//   - 本组活动：organizer 属本组（organizer.partyGroup===组名）且非取消/非归档——与组长台
//     leader/review-tab「本组活动复盘状态」同口径 → 书记/组长两视图数据一致；
//   - 复盘分桶：pending = 无复盘记录 / 未提交 / 已打回；completed = 其余（ReviewStatus 枚举）。
// 纯 ESM：仅依赖 person/roster/domain（roster → person/policy-defaults），无 DOM、
//   localStorage 仅在成员档案读链内部以 typeof 守卫惰性访问 → 浏览器 / Node 双端可载（单测直导）。
// ════════════════════════════════════════════════════════════════

import { PersonStore } from './person.js?v=20260908c';
import { isPartyMember } from './roster.js?v=20260908c';
import { ReviewStatus } from '../core/domain.js?v=20260908c';

/**
 * 支部内党小组清单（数据驱动：成员档案 partyGroup 聚合，缺省走 PersonStore 当前档案）
 * @param {Object} [opts]
 * @param {Array}  [opts.members]  成员数组（缺省 = PersonStore.getMembers()；单测可注入）
 * @param {string} [opts.branchId] 支部 id 过滤（缺省不过滤；党委组织员等 branchId=null 的
 *                                 人员 partyGroup 为空 → 自然被组清单剔除）
 * @returns {Array<{ groupName:string, leaderId:string|null, memberIds:string[],
 *                    partyMemberIds:string[], memberCount:number, partyCount:number }>}
 */
export function listPartyGroups({ members, branchId } = {}) {
  const list = (members || PersonStore.getMembers())
    .filter(p => p && String(p.partyGroup || '').trim())
    .filter(p => !branchId || (p.branchId || 'br-b1') === branchId);
  const order = [];
  const acc = new Map(); // groupName → { memberIds, leaderId }
  for (const p of list) {
    const g = String(p.partyGroup).trim();
    if (!acc.has(g)) {
      acc.set(g, { groupName: g, memberIds: [], leaderId: null });
      order.push(g);
    }
    const e = acc.get(g);
    e.memberIds.push(p.id);
    if (!e.leaderId && p.role === 'leader') e.leaderId = p.id;
  }
  return order.map(g => {
    const e = acc.get(g);
    const partyMemberIds = list
      .filter(p => p.partyGroup === g && isPartyMember(p))
      .map(p => p.id);
    return {
      groupName: g,
      leaderId: e.leaderId,
      memberIds: e.memberIds,
      partyMemberIds,
      memberCount: e.memberIds.length,
      partyCount: partyMemberIds.length,
    };
  });
}

/** 取组内「组员」id 集（组长视角口径：组长看本组其他成员；无组长组 = 全组成员） */
export function memberScopeOfGroup(group) {
  if (!group) return [];
  return group.leaderId
    ? group.memberIds.filter(id => id !== group.leaderId)
    : [...group.memberIds];
}

/**
 * 组内相关汇报开放数（卡片「待答复汇报」口径）：
 * 组员（memberScopeOfGroup）发起（submittedBy）的 kind='report' 且 open、
 * 未隐藏 / 未合并的 issues 数。数据经 issues.js 可改读接口（IssueStore.getAll）由调用方传入。
 * @param {Array} issues issues 全量（含非汇报类型亦安全：按 kind 过滤）
 * @param {Object} group listPartyGroups 单项
 * @returns {number}
 */
export function countOpenReportsByGroup(issues, group) {
  if (!Array.isArray(issues) || !group) return 0;
  const scope = new Set(memberScopeOfGroup(group));
  return issues.filter(i =>
    i && i.kind === 'report' && i.status === 'open' &&
    !i.hidden && !i.mergedInto && scope.has(i.submittedBy)
  ).length;
}

/** 活动是否属于某党小组：organizer 属本组（organizer.partyGroup===组名）且非取消/非归档 */
export function isGroupActivity(act, members, groupName) {
  if (!act || !groupName || act.status === 'cancelled' || act.archived) return false;
  const byId = new Map((members || []).map(p => [p.id, p]));
  const org = byId.get(act.organizer);
  return !!org && org.partyGroup === groupName;
}

/** 本组活动列表（date 降序，新者在前；口径 = 组长台 leader/review-tab 同源） */
export function groupActivitiesOf(activities, members, groupName) {
  return (activities || [])
    .filter(a => isGroupActivity(a, members, groupName))
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
}

/**
 * 复盘状态分桶：pending = 无复盘 / 未提交 / 已打回；completed = 其余（已上传/批注中/已确认）
 * @param {Array} groupActs 本组活动（groupActivitiesOf 结果，date 降序）
 * @param {Array} reviews 复盘记录全量（loadActivityReviews 结果）
 * @returns {{ pending: Array<{act,rev}>, completed: Array<{act,rev}> }}
 */
export function reviewBucketOf(groupActs, reviews) {
  const map = new Map();
  (reviews || []).forEach(r => { if (r && r.activityId) map.set(r.activityId, r); });
  const pending = [];
  const completed = [];
  for (const act of groupActs) {
    const rev = map.get(act.id) || null;
    if (!rev || rev.reviewStatus === ReviewStatus.NOT_SUBMITTED || rev.reviewStatus === ReviewStatus.REJECTED) {
      pending.push({ act, rev });
    } else {
      completed.push({ act, rev });
    }
  }
  return { pending, completed };
}

/** 复盘行状态徽标配色（组长台 review-tab 同表） */
export const GROUP_REVIEW_COLOR = {
  [ReviewStatus.NOT_SUBMITTED]: 'bg-red-100 text-red-700',
  [ReviewStatus.UPLOADED]: 'bg-orange-100 text-orange-700',
  [ReviewStatus.ANNOTATING]: 'bg-blue-100 text-blue-700',
  [ReviewStatus.CONFIRMED]: 'bg-green-100 text-green-700',
  [ReviewStatus.REJECTED]: 'bg-red-100 text-red-700',
};
