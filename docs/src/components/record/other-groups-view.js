// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  components/record/other-groups-view.js — 「其他组」只读一览（组长台「知情查看」分段之一）
// ════════════════════════════════════════════════════════════════
// 2026-10-04 批次 373 · 支书 `#10` Q3 圈**甲**：「**党小组组长是否可以看到别组的情况，我认为是应该
//   可以看到的！！**」⇒ 组长台「知情查看」补一段「其他组」只读一览。
// 口径：**看 ≠ 做**——只读别组的 组员进展 / 复盘状态 / 活动与考勤 / 考察汇总；**本段不提供任何写入口**
//   （写口仍只本组：见组长台「组员进展 / 考勤管理 / 考察管理」）。
// 判据**单一源**＝`services/member/group-view.js`（listPartyGroups / countOpenReportsByGroup /
//   groupReportRowsOf / reportRowStateOf / groupActivitiesOf / reviewBucketOf）——**不第二实现**
//   （`D-765` ⑤ 组件复用纪律：同类面复用同一判据，不做第二个口径）。
// 仅依赖服务层（无 tab 私有状态）；由 `insight-view.js` 作为 `group` 分段懒加载。
import {
  listPartyGroups, countOpenReportsByGroup, groupReportRowsOf, reportRowStateOf,
  groupActivitiesOf, reviewBucketOf,
} from '../../services/member/group-view.js?v=20261006f';
import { PersonStore, getPersonName } from '../../services/member/person.js?v=20261006f';
import { AuthStore } from '../../services/core/auth.js?v=20261006f';
import { getBranchIdOfPerson } from '../../services/branch/branch.js?v=20261006f';
import { IssueStore } from '../../services/governance/issues.js?v=20261006f';
import { loadActivities } from '../../services/activity/activity.js?v=20261006f';
import { loadActivityReviews } from '../../services/governance/review.js?v=20261006f';
import { loadAttendanceRecords } from '../../services/activity/attendance.js?v=20261006f';
import { loadInspectionRecords } from '../../services/activity/inspection.js?v=20261006f';
import { getMeetingRosterIds } from '../../services/member/roster.js?v=20261006f';
import { AttendanceStatus } from '../../core/domain/domain.js?v=20261006f';
import { escHtml as esc, todayLocal } from '../../core/base/utils.js?v=20261006f';

/**
 * 渲染「其他组」只读一览（本支部内除「我所属组」外的所有组，逐组一卡）。
 * @param {HTMLElement} container — `insight-view` 的 `#insight-seg-body`（每次换新节点）
 * @returns {Promise<void>}
 */
export async function renderOtherGroupsView(container) {
  if (!container) return;
  const me = AuthStore.getCurrentUser() || {};
  const branchId = getBranchIdOfPerson(me.personId);
  const members = PersonStore.getMembers();
  const myGroup = (PersonStore.getById(me.personId) || {}).partyGroup || null;

  let issues = [];
  try {
    await IssueStore.loadAll();
    issues = IssueStore.getAll();
  } catch (_) { issues = IssueStore.getAll() || []; }

  const ctx = {
    members, issues, branchId,
    activities: loadActivities(),
    reviews: loadActivityReviews(),
    attRecords: loadAttendanceRecords(),
    inspections: loadInspectionRecords(),
  };
  const groups = listPartyGroups({ members, branchId }).filter(g => g.groupName !== myGroup);

  container.innerHTML = groups.length
    ? `<div class="space-y-3">${groups.map(g => _cardHtml(g, ctx)).join('')}</div>`
    : `<div class="card rounded-xl p-5 text-center">
         <p class="text-sm text-gray-500">支部暂无其他党小组${myGroup ? `（你所在：「${esc(myGroup)}」）` : ''}</p>
         <p class="text-xs text-gray-500 mt-1">其他党小组成立后，此处显示其 组员进展 / 复盘状态 / 活动与考勤 只读一览</p>
       </div>`;
}

/** 单组只读卡（组长 / 党员数 · 待答复汇报 · 复盘状态 · 活动与考勤 · 考察汇总 · 组员进展摘要） */
function _cardHtml(g, ctx) {
  const { members, activities, reviews, attRecords, inspections, issues, branchId } = ctx;
  const openCount = countOpenReportsByGroup(issues, g);
  const reports = groupReportRowsOf(issues, g, 3);
  const groupActs = groupActivitiesOf(activities, members, g.groupName);
  const { pending, completed } = reviewBucketOf(groupActs, reviews);

  // 已发生党小组会 应到 / 实到（口径与支书台「本组活动与考勤概览」同源：roster 应到 + attendance 实到）
  const today = todayLocal();
  const metActs = groupActs.filter(a => a.type === '党小组会' && a.date <= today);
  let expected = 0;
  let present = 0;
  for (const a of metActs) {
    const recs = attRecords.filter(r => r.activityId === a.id);
    if (!recs.length) continue;
    expected += getMeetingRosterIds({ type: '党小组会', groupId: g.groupName, branchId }).length;
    present += recs.filter(r => r.status === AttendanceStatus.PRESENT || r.status === AttendanceStatus.MADE_UP).length;
  }

  // 考察汇总：本组活动上的考察记录（判据与 groupActivitiesOf 同源——organizer 属本组）
  const groupActIds = new Set(groupActs.map(a => a.id));
  const groupInsp = inspections.filter(r => r && r.activityId && groupActIds.has(r.activityId));
  const inspPending = groupInsp.filter(r => r.status !== 'confirmed').length;

  return `
    <div class="card rounded-xl p-4">
      <div class="flex items-center justify-between gap-2 mb-2">
        <h4 class="font-title-cn text-sm font-bold text-gray-800">${esc(g.groupName)}</h4>
        <span class="text-xs text-gray-500">党员 ${g.partyCount} · 成员 ${g.memberCount}${g.leaderId ? ' · 组长 ' + esc(getPersonName(g.leaderId)) : ' · 未设组长'}</span>
      </div>
      <div class="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-600 mb-2.5">
        <span>待答复汇报 <span class="font-semibold ${openCount ? 'text-amber-700' : 'text-gray-700'}">${openCount}</span></span>
        <span>待复盘 <span class="font-semibold">${pending.length}</span> · 已复盘 <span class="font-semibold">${completed.length}</span></span>
        <span>党小组会 应到 <span class="font-semibold">${expected}</span> · 实到 <span class="font-semibold">${present}</span></span>
        <span>考察 <span class="font-semibold">${groupInsp.length}</span> 条${inspPending ? ` · <span class="text-amber-700">待确认 ${inspPending}</span>` : ''}</span>
      </div>
      <div class="pt-2 border-t border-gray-100">
        <div class="text-xs font-bold text-gray-600 mb-1">组员进展（只读）</div>
        ${reports.length
          ? `<div class="space-y-1">${reports.map(_reportRowHtml).join('')}</div>`
          : '<p class="text-xs text-gray-500">暂无组员汇报</p>'}
      </div>
    </div>`;
}

/** 汇报行（只读；状态文案单一源＝`group-view.js::reportRowStateOf`） */
function _reportRowHtml(r) {
  const st = reportRowStateOf(r);
  return `
    <div class="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-gray-50/60">
      <span class="text-xs text-gray-800 shrink-0">${esc(getPersonName(r.submittedBy) || '匿名')}</span>
      <span class="text-xs text-gray-600 flex-1 min-w-0 truncate">${esc(r.title || '')}</span>
      <span class="text-xs px-1.5 py-0.5 rounded-full ${st.cls} shrink-0">${st.label}</span>
    </div>`;
}
