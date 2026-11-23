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
} from '../../services/member/group-view.js?v=20261120a';
import { PersonStore, getPersonName } from '../../services/member/person.js?v=20261120a';
import { badgeHtml } from '../ui/badges.js?v=20261120a';
import { AuthStore } from '../../services/core/auth.js?v=20261120a';
import { getBranchIdOfPerson } from '../../services/branch/branch.js?v=20261120a';
import { IssueStore } from '../../services/governance/issues.js?v=20261120a';
import { loadActivities } from '../../services/activity/activity.js?v=20261120a';
import { loadActivityReviews } from '../../services/governance/review.js?v=20261120a';
import { loadAttendanceRecords } from '../../services/activity/attendance.js?v=20261120a';
import { loadInspectionRecords } from '../../services/activity/inspection.js?v=20261120a';
import { getMeetingRosterIds } from '../../services/member/roster.js?v=20261120a';
import { AttendanceStatus } from '../../core/domain/domain.js?v=20261120a';
import { escHtml as esc, todayLocal } from '../../core/base/utils.js?v=20261120a';
import { getAdapter, getDataSource } from '../../data/data-adapter.js?v=20261120a';

import { emptyStateHtml } from '../ui/empty-state.js?v=20261120a';
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
  let issuesError = '';
  try {
    await IssueStore.loadAll();
    issues = IssueStore.getAll();
  } catch (err) {
    console.warn('[other-groups-view] 汇报数据加载失败：', err);
    issuesError = '汇报数据加载失败';
    issues = IssueStore.getAll() || [];
  }

  // 跨组应到 / 实到（Task 10）：优先取服务端只读汇总（`H32` 计数只在服务端算）；
  //   演示数据源或接口失败时回落「同一份已拉取数据」的本地累加（兜底不造事实）。
  let summaryByGroup = null;
  if (getDataSource() === 'api') {
    try {
      const summary = await getAdapter().groupAttendanceSummary.get();
      summaryByGroup = new Map((summary.items || []).map((item) => [item.groupName, item]));
    } catch (err) {
      console.warn('[other-groups-view] 跨组应到汇总加载失败，回落本地累加：', err);
    }
  }

  const ctx = {
    members, issues, branchId, summaryByGroup,
    activities: loadActivities(),
    reviews: loadActivityReviews(),
    attRecords: loadAttendanceRecords(),
    inspections: loadInspectionRecords(),
  };
  const groups = listPartyGroups({ members, branchId }).filter(g => g.groupName !== myGroup);

  const errStrip = issuesError
    ? `<div class="card rounded-xl card-standard flex items-center justify-between gap-2 mb-3">
         <span class="text-sm text-[var(--status-error-text)]">${issuesError}</span>
         <button type="button" class="btn-outline btn-sm" data-og-retry>重新载入</button>
       </div>`
    : '';
  container.innerHTML = `${errStrip}${groups.length
    ? `<div class="space-y-3">${groups.map(g => _cardHtml(g, ctx)).join('')}</div>`
    : `<div class="card rounded-xl card-standard">
         ${emptyStateHtml({ variant: 'panel', text: `支部暂无其他党小组${myGroup ? `（你所在：「${myGroup}」）` : ''}` })}
       </div>`}`;
  const retryBtn = container.querySelector('[data-og-retry]');
  if (retryBtn) retryBtn.addEventListener('click', () => renderOtherGroupsView(container));
}

/** 单组只读卡（组长 / 党员数 · 待答复汇报 · 复盘状态 · 活动与考勤 · 考察汇总 · 组员进展摘要） */
function _cardHtml(g, ctx) {
  const { members, activities, reviews, attRecords, inspections, issues, branchId } = ctx;
  const openCount = countOpenReportsByGroup(issues, g);
  const reports = groupReportRowsOf(issues, g, 3);
  const groupActs = groupActivitiesOf(activities, members, g.groupName);
  const { pending, completed } = reviewBucketOf(groupActs, reviews);

  // 已发生党小组会 应到 / 实到（口径单一源：服务端 `group-attendance-summary` 与 `roster-eligibility` 同源）
  const summary = ctx.summaryByGroup?.get(g.groupName) || null;
  let expected = 0;
  let present = 0;
  if (summary) {
    expected = Number(summary.expected) || 0;
    present = Number(summary.present) || 0;
  } else {
    const today = todayLocal();
    const metActs = groupActs.filter(a => a.type === '党小组会' && a.date <= today && a.status !== 'cancelled' && !a.archived);
    for (const a of metActs) {
      const recs = attRecords.filter(r => r.activityId === a.id);
      if (!recs.length) continue;
      const eligible = getMeetingRosterIds({ type: '党小组会', groupId: g.groupName, branchId });
      const eligibleSet = new Set(eligible.map(String));
      expected += eligible.length;
      // 实到只认应到名单内的在册人员，一人一次（与服务端端点同口径）
      present += new Set(recs
        .filter(r => (r.status === AttendanceStatus.PRESENT || r.status === AttendanceStatus.MADE_UP) && eligibleSet.has(String(r.personId)))
        .map(r => String(r.personId))).size;
    }
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
        <span>待答复汇报 <span class="font-semibold ${openCount ? 'text-[var(--status-warning-text)]' : 'text-gray-700'}">${openCount}</span></span>
        <span>待复盘 <span class="font-semibold">${pending.length}</span> · 已复盘 <span class="font-semibold">${completed.length}</span></span>
        <span>党小组会 应到 <span class="font-semibold">${expected}</span> · 实到 <span class="font-semibold">${present}</span></span>
        <span>考察 <span class="font-semibold">${groupInsp.length}</span> 条${inspPending ? ` · <span class="text-[var(--status-warning-text)]">待确认 ${inspPending}</span>` : ''}</span>
      </div>
      <div class="pt-2 border-t border-gray-100">
        <div class="text-xs font-bold text-gray-600 mb-1">组员进展（只读）</div>
        ${reports.length
          ? `<div class="space-y-1">${reports.map(_reportRowHtml).join('')}</div>`
          : emptyStateHtml({ text: '暂无组员汇报', variant: 'inline' })}
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
      ${badgeHtml(st.label, st.tone)}
    </div>`;
}
