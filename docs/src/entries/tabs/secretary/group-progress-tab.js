// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  entries/tabs/secretary/group-progress-tab.js — 书记工作台·党小组进展 tab（2026-09-08 D8）
// ════════════════════════════════════════════════════════════════
// 语义（书记 2026-09-08 新增裁：书记/副书记同界面共享；多党小组多套数据）：
//   书记/副书记跨组只读掌握各党小组进展（知情≠操作），两层结构：
//   ① 组切换层（页顶）：支部内党小组卡片（组名/组长/组内党员数/待答复汇报数）；
//   ② 组内数据层（选中组只读视角）：
//       - 组员进展摘要：组员向组长提交的汇报最近若干条（谁/主题/时间/状态=组长已答复或待答复），
//         书记不代组长答复；对「待答复」行提供「请组长关注」轻动作——复用书记「了解进展」请求
//         通道 IssueStore.requestReport 向组长发请求（不落答复，组长在其「我的处置」跟进/汇报）；
//       - 本组活动复盘状态：待复盘/已复盘 + 点击展开复盘详情（只读；与组长台 review-tab 同口径同表）；
//       - 本组活动与考勤概览：近期活动 + 本组党小组会应到/实到（纯读 attendance/roster 口径）。
// 数据源/口径：组聚合在 services/group-view.js（成员档案 partyGroup；roster.js 禁改→只读复用）；
//   待答复汇报数 = 组员发起开放汇报数（与组长台「组员汇报」收件箱同集）；本组活动 = organizer 属本组。
// 纪律：同步渲染优先（activities/attendance/review/members 均同步源先渲），汇报区唯一异步源
//   IssueStore.loadAll 首拉期间以轻量加载行占位（无 0 高后插）；空态统一 text-xs 灰字。
// 事件：组切换/复盘展开/请组长均以 container 级委托绑定（fill 改写行 DOM 不重复绑定）。
// 本页禁用 SVG 图标（书记台裁定），类别用色点+文字区分；?v= 沿用统一收口版本号。
// ════════════════════════════════════════════════════════════════

import { AuthStore } from '../../../services/auth.js?v=20260909e';
import { PersonStore, getPersonName } from '../../../services/person.js?v=20260909e';
import { getBranchIdOfPerson } from '../../../services/branch.js?v=20260909e';
import { IssueStore } from '../../../services/issues.js?v=20260909e';
import { loadActivities } from '../../../services/activity.js?v=20260909e';
import { loadActivityReviews } from '../../../services/review.js?v=20260909e';
import { loadAttendanceRecords } from '../../../services/attendance.js?v=20260909e';
import { AttendanceStatus, ReviewStatus, REVIEW_STATUS_LABELS } from '../../../core/domain.js?v=20260909e';
import { getMeetingRosterIds } from '../../../services/roster.js?v=20260909e';
import { showToast, escHtml as esc } from '../../../core/utils.js?v=20260909e';
import {
  listPartyGroups, memberScopeOfGroup, countOpenReportsByGroup,
  groupActivitiesOf, reviewBucketOf, GROUP_REVIEW_COLOR,
} from '../../../services/group-view.js?v=20260909e';

// ── 模块级状态（随模块自持；tab 切走再回保持，页面刷新回退首组） ──
let _selectedGroup = null;      // 当前选中党小组名
let _expandedReviewId = null;   // 已展开复盘详情活动 id（只读展开态）
let _issuesLoaded = false;      // issues 权威源是否已加载（避免未载时徽标误显 0）

/** tab 入口（懒加载；ctx 提供 accent 等主题上下文） */
export function renderContent() {
  const container = document.getElementById('secretary-tab-content');
  if (!container) return;
  _renderAll(container);
}

// ════════════════════════════════════════════════════════════════
//  整页渲染（组切换层 + 选中组三层；汇报区异步加载完成后增量刷新）
// ════════════════════════════════════════════════════════════════
function _renderAll(container) {
  const me = AuthStore.getCurrentUser();
  const branchId = getBranchIdOfPerson(me?.personId);
  const members = PersonStore.getMembers();
  const groups = listPartyGroups({ members, branchId });

  if (!groups.length) {
    container.innerHTML = `
      <div class="card rounded-xl p-8 text-center">
        <p class="text-sm text-gray-500">支部暂无党小组分组</p>
        <p class="text-xs text-gray-400 mt-1">成员档案未设置 partyGroup 时，本页无可查看的党小组</p>
      </div>`;
    return;
  }
  if (!groups.some(g => g.groupName === _selectedGroup)) _selectedGroup = groups[0].groupName;
  const group = groups.find(g => g.groupName === _selectedGroup);
  if (!group) return;

  const activities = loadActivities();
  const attRecords = loadAttendanceRecords();
  const reviews = loadActivityReviews();
  const issues = IssueStore.getAll(); // 已缓存则同步渲染；未载由 _fillReports 增量填充

  container.innerHTML = `
    <div class="space-y-4">
      ${_groupSwitchHtml(groups, group, issues)}
      ${_memberProgressCardHtml(group, issues)}
      ${_reviewStatusCardHtml(group, members, activities, reviews)}
      ${_activityAttendanceCardHtml(group, members, branchId, activities, attRecords)}
    </div>`;

  _bindEvents(container);
  _fillReports(container, group, members);
}

// ── ① 组切换层（页顶卡片） ────────────────────────────────────
function _groupSwitchHtml(groups, activeGroup, issues) {
  return `
    <div class="card rounded-xl p-4">
      <div class="flex items-center justify-between mb-3">
        <h4 class="font-title-cn text-sm font-bold text-gray-700">党小组</h4>
        <span class="text-xs text-gray-400">${groups.length} 个党小组 · 书记只读知情</span>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-2">
        ${groups.map(g => _groupCardHtml(g, activeGroup, issues)).join('')}
      </div>
    </div>`;
}

function _groupCardHtml(g, activeGroup, issues) {
  const isActive = g.groupName === activeGroup.groupName;
  const openCount = _issuesLoaded ? countOpenReportsByGroup(issues, g) : null;
  return `
    <button type="button" class="gp-group-card text-left rounded-xl border p-3 transition-colors ${isActive ? 'bg-red-50/50' : 'bg-white hover:bg-gray-50'}"
      data-group="${esc(g.groupName)}"
      style="${isActive ? 'border-color:rgba(185,28,28,0.45);' : 'border-color:#F3F4F6;'}">
      <div class="flex items-center justify-between gap-2">
        <span class="text-sm font-semibold text-gray-800">${esc(g.groupName)}</span>
        <span class="gp-open-badge text-xs px-1.5 py-0.5 rounded-full ${openCount ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'}">
          ${openCount === null ? '…' : `待答复 ${openCount}`}
        </span>
      </div>
      <div class="text-xs text-gray-500 mt-1.5">组长：${g.leaderId ? esc(getPersonName(g.leaderId)) : '<span class="text-gray-400">未设置</span>'}</div>
      <div class="text-[11px] text-gray-400 mt-0.5">党员 ${g.partyCount} 人 · 成员 ${g.memberCount} 人</div>
    </button>`;
}

// ── ② 组员进展摘要（汇报区；首拉异步填充后增量刷新） ───────────
function _memberProgressCardHtml(group, issues) {
  const inner = _issuesLoaded ? _reportsRowsHtml(issues, group) : _reportsLoadingHtml();
  const leaderNote = group.leaderId ? '' : '<span class="text-xs text-gray-400">（本组暂无组长，「请组长关注」不可用）</span>';
  return `
    <div class="card rounded-xl p-4">
      <div class="flex items-center justify-between mb-1">
        <h4 class="font-title-cn text-sm font-bold text-gray-700">组员进展摘要</h4>
        <span class="text-xs text-gray-400">组员向组长汇报 · 书记只读</span>
      </div>
      <p class="text-[11px] text-gray-400 mb-2.5">书记不代组长答复；对待答复行可「请组长关注」——请求直达组长「我的处置」，不落答复 ${leaderNote}</p>
      <div id="gp-reports" class="space-y-1.5">${inner}</div>
    </div>`;
}

function _reportsLoadingHtml() {
  return `
    <div class="flex items-center gap-1.5 text-xs rounded-lg bg-gray-100 px-3 py-1.5 w-fit" style="color:#9CA3AF;">
      <span class="inline-block w-3 h-3 rounded-full animate-spin" style="border:2px solid #E5E7EB;border-top-color:#9CA3AF;"></span>
      加载汇报…
    </div>`;
}

/** 组员相关汇报行集合（含组长向组员发起的「了解进展」请求行） */
function _groupReportRows(allIssues, group) {
  const scope = new Set(memberScopeOfGroup(group));
  const leaderId = group.leaderId;
  return allIssues
    .filter(i =>
      i && i.kind === 'report' && !i.hidden && !i.mergedInto &&
      (scope.has(i.submittedBy) || (leaderId && i.requestedBy === leaderId && scope.has(i.assignee)))
    )
    .sort((a, b) => String(b.submittedAt || '').localeCompare(String(a.submittedAt || '')))
    .slice(0, 8);
}

/** 汇报行派生状态（组长已答复 / 待答复 / 待汇报 / 卡点 / 已闭环） */
function _reportRowState(issue) {
  if (issue.status === 'closed') return { label: '已闭环', cls: 'bg-gray-100 text-gray-500' };
  const hasLeaderReply = (issue.comments || []).some(c => !c.hidden && c.kind === 'reply' && c.authorRole === 'leader');
  if (hasLeaderReply) return { label: '组长已答复', cls: 'bg-green-100 text-green-700' };
  // 上级（书记/组长）「了解进展」请求行：尚未回应 → 待汇报；组员/被请人已回应(resultPending) → 待答复
  if (issue.requestedBy && !issue.resultPending) return { label: '待汇报', cls: 'bg-blue-100 text-blue-700' };
  if (issue.resultPending) return { label: '待答复', cls: 'bg-amber-100 text-amber-700' };
  if (issue.reportCategory === 'blocked') return { label: '卡点上报', cls: 'bg-red-100 text-red-700' };
  return { label: '待答复', cls: 'bg-amber-100 text-amber-700' };
}

/** 汇报行是否可「请组长关注」（组长存在 + open + 非组长自身发起 + 组长尚未答复） */
function _canAskLeader(issue, group) {
  if (!group.leaderId || issue.status !== 'open' || issue.submittedBy === group.leaderId) return false;
  return !(issue.comments || []).some(c => !c.hidden && c.kind === 'reply' && c.authorRole === 'leader');
}

/** 汇报行列表 HTML（含空态；不绑定事件——事件走 container 委托） */
function _reportsRowsHtml(allIssues, group) {
  const rows = _groupReportRows(allIssues, group);
  if (!rows.length) {
    return `
      <p class="text-xs text-gray-400 py-1 flex items-center gap-1.5">
        <span class="w-2 h-2 rounded-full bg-green-500 flex-shrink-0"></span>
        暂无本组组员汇报，组员汇报答复在组长台完成
      </p>`;
  }
  return rows.map(r => {
    const st = _reportRowState(r);
    const submitterName = getPersonName(r.submittedBy) || '匿名';
    const askBtn = _canAskLeader(r, group)
      ? `<button type="button" class="gp-ask-leader text-xs px-2.5 py-1 rounded-lg shrink-0 bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
           data-note="${esc(`本组组员汇报待跟进：${submitterName} · ${r.title}`)}">请组长关注</button>`
      : '';
    return `
      <div class="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors">
        ${_reportDot(r)}
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-2 min-w-0">
            <span class="text-sm font-medium text-gray-800 shrink-0">${esc(submitterName)}</span>
            <span class="text-xs text-gray-600 flex-1 min-w-0 truncate">${esc(r.title)}</span>
          </div>
          <div class="text-[11px] text-gray-400">${esc(r.submittedAt || '')}${r.requestedBy ? ' · ' + esc(getPersonName(r.requestedBy)) + ' 请汇报' : ''}</div>
        </div>
        <span class="text-xs px-1.5 py-0.5 rounded-full ${st.cls} shrink-0">${st.label}</span>
        ${askBtn}
      </div>`;
  }).join('');
}

/** 类别色点（progress/blocked/ask，同汇报收件箱） */
function _reportDot(issue) {
  const color = issue.reportCategory === 'blocked' ? '#EF4444'
    : issue.reportCategory === 'ask' ? '#F59E0B' : '#16A34A';
  return `<span class="w-2 h-2 rounded-full flex-shrink-0 mt-1.5" style="background:${color};"></span>`;
}

/** issues 首拉/增量刷新：组卡徽标 + 汇报行（幂等；DOM 已同步渲染则内容相同） */
async function _fillReports(container, group, members) {
  let issues;
  try {
    await IssueStore.loadAll();
    issues = IssueStore.getAll();
  } catch (_) {
    issues = IssueStore.getAll() || [];
  }
  _issuesLoaded = true;
  const branchId = getBranchIdOfPerson(AuthStore.getCurrentUser()?.personId);
  const groups = listPartyGroups({ members, branchId });
  const curGroup = groups.find(x => x.groupName === _selectedGroup) || group;

  container.querySelectorAll('.gp-open-badge').forEach(badge => {
    const gName = badge.closest('.gp-group-card')?.dataset.group;
    const g = groups.find(x => x.groupName === gName);
    const n = g ? countOpenReportsByGroup(issues, g) : 0;
    badge.textContent = `待答复 ${n}`;
    badge.className = `gp-open-badge text-xs px-1.5 py-0.5 rounded-full ${n ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'}`;
  });

  const listEl = container.querySelector('#gp-reports');
  if (!listEl) return;
  listEl.innerHTML = _reportsRowsHtml(issues, curGroup);
}

// ── ③ 本组活动复盘状态（只读；与组长台同口径同表） ─────────────
function _reviewStatusCardHtml(group, members, activities, reviews) {
  const groupActs = groupActivitiesOf(activities, members, group.groupName);
  const { pending, completed } = reviewBucketOf(groupActs, reviews);
  const statusColor = (st) => GROUP_REVIEW_COLOR[st] || 'bg-gray-100 text-gray-500';

  const pendingRows = pending.length === 0
    ? '<p class="text-xs text-gray-400 py-1">暂无待复盘活动</p>'
    : pending.map(({ act, rev }) => {
        const label = rev ? REVIEW_STATUS_LABELS[rev.reviewStatus] : '未提交';
        return `
          <div class="p-2.5 rounded-lg bg-white border border-gray-50">
            <div class="flex items-center justify-between gap-3">
              <div class="min-w-0 flex-1">
                <div class="text-sm font-medium text-gray-800 truncate">${esc(act.title || '未命名')}</div>
                <div class="text-xs text-gray-500 mt-0.5">${esc(act.date || '')}${act.type ? ' · ' + esc(act.type) : ''}</div>
              </div>
              <span class="text-xs px-1.5 py-0.5 rounded-full ${statusColor(rev?.reviewStatus || ReviewStatus.NOT_SUBMITTED)} shrink-0">
                ${label}${rev?.reviewStatus === ReviewStatus.REJECTED ? ' · 需修改' : ''}
              </span>
            </div>
          </div>`;
      }).join('');

  const completedRows = completed.length === 0
    ? '<p class="text-xs text-gray-400 py-1">暂无已复盘活动</p>'
    : completed.map(({ act, rev }) => {
        const isExpanded = _expandedReviewId === act.id;
        return `
          <div class="gp-review-item p-2.5 rounded-lg bg-white border border-gray-50 cursor-pointer hover:bg-gray-50 transition-colors gp-review-toggle" data-act-id="${act.id}">
            <div class="flex items-center justify-between gap-3">
              <div class="min-w-0 flex-1">
                <div class="text-sm font-medium text-gray-800 truncate">${esc(act.title || '未命名')}</div>
                <div class="text-xs text-gray-500 mt-0.5">${esc(act.date || '')}${act.type ? ' · ' + esc(act.type) : ''}</div>
              </div>
              <div class="flex items-center gap-2 shrink-0">
                <span class="text-xs px-1.5 py-0.5 rounded-full ${statusColor(rev?.reviewStatus)}">${REVIEW_STATUS_LABELS[rev?.reviewStatus]}</span>
                <span class="text-xs text-gray-400">${isExpanded ? '收起' : '详情'}</span>
              </div>
            </div>
            ${isExpanded && rev ? _reviewDetailHtml(rev) : ''}
          </div>`;
      }).join('');

  return `
    <div class="card rounded-xl p-4">
      <div class="flex items-center justify-between mb-2">
        <h4 class="font-title-cn text-sm font-bold text-gray-700">本组活动复盘状态</h4>
        <span class="text-xs text-gray-400">待复盘 ${pending.length} · 已复盘 ${completed.length}</span>
      </div>
      <p class="text-[11px] text-gray-400 mb-3">复盘由活动组织者 / 深度参与者提交（成员端「我的复盘」）；书记只读查看，点击已复盘行可展开详情。</p>
      <div class="mb-3">
        <div class="text-xs font-bold text-gray-600 mb-1.5">待复盘 <span class="text-gray-400 font-normal">(${pending.length})</span></div>
        <div class="space-y-1.5">${pendingRows}</div>
      </div>
      <div class="pt-2.5 border-t border-gray-100">
        <div class="text-xs font-bold text-gray-600 mb-1.5">已复盘 <span class="text-gray-400 font-normal">(${completed.length})</span></div>
        <div class="space-y-1.5">${completedRows}</div>
      </div>
    </div>`;
}

/** 已复盘展开详情（只读：复盘正文/提出的真问题/纪检批注/时间） */
function _reviewDetailHtml(rev) {
  const issues = Array.isArray(rev.issues) ? rev.issues : [];
  return `
    <div class="mt-3 pt-3 border-t border-gray-100">
      <div class="text-xs text-gray-600 p-2 bg-gray-50 rounded-lg border border-gray-100 whitespace-pre-wrap">${esc(rev.reviewContent || '')}</div>
      ${issues.length ? `<div class="mt-2 p-2 rounded-lg border border-amber-100 bg-amber-50">
        <div class="text-[11px] text-amber-700 font-bold mb-1">提出的真问题（${issues.length}）</div>
        <ul class="space-y-0.5">${issues.map(i => `<li class="text-xs text-amber-800">· ${esc(i)}</li>`).join('')}</ul>
      </div>` : ''}
      ${rev.submittedAt ? `<div class="text-xs text-gray-400 mt-1">提交时间：${esc(String(rev.submittedAt).slice(0, 16).replace('T', ' '))}</div>` : ''}
      ${rev.annotation ? `
        <div class="mt-2 p-2 rounded-lg bg-blue-50 border border-blue-100">
          <div class="text-xs text-blue-500 font-bold mb-1">纪检委员批注</div>
          <div class="text-xs text-blue-700 whitespace-pre-wrap">${esc(rev.annotation)}</div>
        </div>` : ''}
    </div>`;
}

// ── ④ 本组活动与考勤概览（纯读） ──────────────────────────────
function _activityAttendanceCardHtml(group, members, branchId, activities, attRecords) {
  const groupActs = groupActivitiesOf(activities, members, group.groupName);
  const recentActs = groupActs.slice(0, 4);
  const today = new Date().toISOString().slice(0, 10);

  const recentRows = recentActs.length === 0
    ? '<p class="text-xs text-gray-400 py-1">暂无本组活动</p>'
    : recentActs.map(a => `
        <div class="flex items-center gap-2.5 py-1.5">
          <span class="text-xs text-gray-400 w-20 shrink-0">${esc(a.date || '')}</span>
          <span class="text-xs px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500 shrink-0">${esc(a.type || '活动')}</span>
          <span class="text-xs text-gray-700 flex-1 min-w-0 truncate">${esc(a.title || '未命名')}</span>
        </div>`).join('');

  // 已发生的本组党小组会 → 应到/实到概况（roster 组口径应到 + attendance 记录实到）
  const metRows = groupActs.filter(a => a.type === '党小组会' && a.date <= today);
  const attRowsHtml = metRows.length === 0
    ? '<p class="text-xs text-gray-400 py-1">暂无已发生的党小组会（考勤生成后此处显示应到/实到）</p>'
    : metRows.map(a => {
        const expected = getMeetingRosterIds({ type: '党小组会', groupId: group.groupName, branchId }).length;
        const recs = attRecords.filter(r => r.activityId === a.id);
        if (!recs.length) {
          return `
            <div class="flex items-center gap-2.5 py-1.5">
              <span class="text-xs text-gray-400 w-20 shrink-0">${esc(a.date || '')}</span>
              <span class="text-xs text-gray-600 flex-1 min-w-0 truncate">${esc(a.title || '未命名')}</span>
              <span class="text-xs text-gray-400 shrink-0">考勤未生成</span>
            </div>`;
        }
        const present = recs.filter(r => r.status === AttendanceStatus.PRESENT || r.status === AttendanceStatus.MADE_UP).length;
        const absent = recs.filter(r => r.status === AttendanceStatus.ABSENT || r.status === AttendanceStatus.LEAVE).length;
        return `
            <div class="flex items-center gap-2.5 py-1.5">
              <span class="text-xs text-gray-400 w-20 shrink-0">${esc(a.date || '')}</span>
              <span class="text-xs text-gray-600 flex-1 min-w-0 truncate">${esc(a.title || '未命名')}</span>
              <span class="text-xs text-gray-600 shrink-0 tabular-nums">应到 ${expected} · 实到 ${present}</span>
              <span class="text-xs text-gray-400 shrink-0 tabular-nums">未到 ${absent}</span>
            </div>`;
      }).join('');

  return `
    <div class="card rounded-xl p-4">
      <div class="flex items-center justify-between mb-2">
        <h4 class="font-title-cn text-sm font-bold text-gray-700">本组活动与考勤概览</h4>
        <span class="text-xs text-gray-400">组织者属本组 · 只读</span>
      </div>
      <p class="text-[11px] text-gray-400 mb-3">近期活动按日期降序${groupActs.length > 4 ? `，共 ${groupActs.length} 场，仅示最近 4 场` : ''}</p>
      <div class="mb-3">
        <div class="text-xs font-bold text-gray-600 mb-1.5">近期活动</div>
        <div class="space-y-0.5">${recentRows}</div>
      </div>
      <div class="pt-2.5 border-t border-gray-100">
        <div class="text-xs font-bold text-gray-600 mb-1.5">党小组会应到/实到 <span class="text-gray-400 font-normal">（本组党员口径，含已发生）</span></div>
        <div class="space-y-0.5">${attRowsHtml}</div>
      </div>
    </div>`;
}

// ── 事件（container 级委托：组切换 / 复盘展开 / 请组长关注） ────
function _bindEvents(container) {
  // 组切换
  container.querySelectorAll('.gp-group-card').forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.dataset.group === _selectedGroup) return;
      _selectedGroup = btn.dataset.group;
      _renderAll(container);
    });
  });

  // 已复盘行展开/收起（只读）
  container.querySelectorAll('.gp-review-toggle').forEach(toggle => {
    toggle.addEventListener('click', () => {
      const actId = toggle.closest('.gp-review-item')?.dataset.actId;
      _expandedReviewId = _expandedReviewId === actId ? null : actId;
      _renderAll(container);
    });
  });

  // 「请组长关注」轻动作：复用书记「了解进展」请求通道（requestReport 直达组长），不落答复
  container.addEventListener('click', (e) => {
    const btn = e.target.closest('.gp-ask-leader');
    if (!btn) return;
    const note = btn.dataset.note || '';
    const branchId = getBranchIdOfPerson(AuthStore.getCurrentUser()?.personId);
    const group = listPartyGroups({ members: PersonStore.getMembers(), branchId })
      .find(x => x.groupName === _selectedGroup);
    if (!group || !group.leaderId) { showToast('error', '该组暂无组长，无法发起'); return; }
    IssueStore.requestReport(group.leaderId, 'leader', note);
    showToast('success', `已请组长「${getPersonName(group.leaderId)}」关注本组进展`);
    _fillReports(container, group, PersonStore.getMembers()); // 刷新徽标/行
  });
}
