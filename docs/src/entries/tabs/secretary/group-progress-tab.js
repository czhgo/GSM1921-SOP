// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  entries/tabs/secretary/group-progress-tab.js — 支书工作台·党小组 tab
// ════════════════════════════════════════════════════════════════
// 沿革：2026-09-08 D8 新增「党小组进展」（跨组只读知情）；2026-09-14 批次 25 升级为「党小组」——
//   党小组升为一等实体（mock/party-groups.js + services/party-group.js），本 tab 由**纯只读**升级为
//   「管理区（写） + 进展区（只读）」两层：
//   ① 未分组归组条：ungroupedMembers() 非空时显示「未分组 N 人」，每人一个活组下拉（groupOptions()）
//      + 「移出党小组」项（值 ''）——选定即 assignMemberToGroup(personId, 组名, {by, role})，行内逐个归组；
//   ② 党小组清单（管理区）：组名 / 序号 / 组长（由 services/group-view.js::listPartyGroups 派生）/
//      人数 / 党员数 / 状态 + 每行「改名」「解散」；「+ 新增党小组」走服务层默认名（第 N 党小组）；
//      解散允许非空组，确认弹窗写明「组内 N 人将转为「未分组」」；按钮显隐与写口校验同源
//      （canManagePartyGroups(role)，单一源 core/constants.js::SECRETARY_AND_DEPUTY_ROLES）；
//      组级变更留痕（服务层 history）由 listGroupHistory() 折叠展示；
//   ③ 进展区（2026-09-08 原样保留，仅位置下移）：组切换卡片层 / 组员进展摘要 / 本组活动复盘状态 /
//      本组活动与考勤概览——支书跨组只读掌握（知情≠操作），不代组长答复。
// 语义（进展区）：支书/副支书同界面共享；组员向组长提交的汇报最近若干条（谁/主题/时间/状态），
//   对「待答复」行提供「请组长关注」轻动作——复用 IssueStore.requestReport 向组长发请求（不落答复）。
// 数据源/口径：组聚合在 services/group-view.js（成员档案 partyGroup）；组清单/写口/权限门/留痕在
//   services/party-group.js（组名与权限的**单一来源**，本文件禁手写组名数组）；roster.js 禁改→只读复用。
// 纪律：同步渲染优先（activities/attendance/review/members 均同步源先渲），汇报区唯一异步源
//   IssueStore.loadAll 首拉期间以轻量加载行占位（无 0 高后插）；空态统一 text-xs 灰字。
// 事件：组切换/复盘展开以元素级绑定（元素随 innerHTML 重建，幂等）；容器级委托只注册一次
//   （dataset 标记）——归组下拉 change / 新增 / 改名 / 解散 / 留痕折叠 / 请组长关注，防多次渲染累积监听。
// 规范：筛选一律用下拉（禁 chip 筛选）；表格样式单一源（styles.css::.data-table 提供表头/行线/悬停/内边距，
//   数据格与表头一律由该 CSS 类族提供，各表勿再重复声明）；弹窗走 components/modal.js；
//   提示走 showToast(type, message)。本页禁用 SVG 图标（支书台裁定），类别用色点+文字区分。
// ════════════════════════════════════════════════════════════════

import { AuthStore } from '../../../services/auth.js?v=20260922l';
import { PersonStore, getPersonName } from '../../../services/person.js?v=20260922l';
import { getBranchIdOfPerson } from '../../../services/branch.js?v=20260922l';
import { IssueStore } from '../../../services/issues.js?v=20260922l';
import { loadActivities } from '../../../services/activity.js?v=20260922l';
import { loadActivityReviews } from '../../../services/review.js?v=20260922l';
import { loadAttendanceRecords } from '../../../services/attendance.js?v=20260922l';
import { AttendanceStatus, ReviewStatus, REVIEW_STATUS_LABELS } from '../../../core/domain.js?v=20260922l';
import { getMeetingRosterIds } from '../../../services/roster.js?v=20260922l';
import { showToast, escHtml as esc, getBasePath } from '../../../core/utils.js?v=20260922l';
// 统一检索引擎（2026-09-13 表格统一化批次 A）：组员进展摘要（按人）接入关键词 + 分面
import { renderFilteredList, personKeyword, personFacets, roleLabelOf } from '../../../components/list-filter.js?v=20260922l';
import { openModal, closeModal } from '../../../components/modal.js?v=20260922l';
// 党小组一等实体服务层（组清单 / 写口 / 权限门 / 留痕——组名唯一来源，禁本文件手写组名数组）
import {
  loadPartyGroups, groupOptions, defaultGroupName, nextGroupSeq,
  addGroup, renameGroup, dissolveGroup, assignMemberToGroup, ungroupedMembers,
  canManagePartyGroups, listGroupHistory,
} from '../../../services/party-group.js?v=20260922l';
import {
  listPartyGroups, memberScopeOfGroup, countOpenReportsByGroup,
  groupActivitiesOf, reviewBucketOf, GROUP_REVIEW_COLOR,
} from '../../../services/group-view.js?v=20260922l';

/** 缺省支部（与 services/party-group.js / mock/domain 既有兼容口径一致：老数据无 branchId 视为 br-b1） */
const DEFAULT_BRANCH_ID = 'br-b1';

// ── 模块级状态（随模块自持；tab 切走再回保持，页面刷新回退首组） ──
let _selectedGroup = null;      // 当前选中党小组名（进展区）
let _expandedReviewId = null;   // 已展开复盘详情活动 id（只读展开态）
let _issuesLoaded = false;      // issues 权威源是否已加载（避免未载时徽标误显 0）
let _historyOpen = false;       // 组级变更留痕是否展开

/** 当前登录人（personId + role；role 供权限门与写口双重校验同源） */
function _me() {
  return AuthStore.getCurrentUser() || {};
}

/** 当前登录人所属支部（缺省 br-b1） */
function _branchId() {
  return getBranchIdOfPerson(_me().personId) || DEFAULT_BRANCH_ID;
}

/** tab 入口（懒加载；ctx 提供 accent 等主题上下文） */
export function renderContent() {
  const container = document.getElementById('secretary-tab-content');
  if (!container) return;
  _renderAll(container);
}

// ════════════════════════════════════════════════════════════════
//  整页渲染（未分组条 + 管理区 + 留痕 + 进展区）
// ════════════════════════════════════════════════════════════════
function _renderAll(container) {
  const branchId = _branchId();
  const members = PersonStore.getMembers();
  const viewGroups = listPartyGroups({ members, branchId }); // 成员档案派生（组长/人数/党员数）
  const entities = _branchGroupEntities(branchId);           // 一等实体清单（序号/状态）
  const statOf = _statMap(viewGroups);
  const canManage = canManagePartyGroups(_me().role);
  const ungrouped = ungroupedMembers(branchId);              // 服务层单一源（partyGroup 为空；限本支部，与名册同口径）

  const activities = loadActivities();
  const attRecords = loadAttendanceRecords();
  const reviews = loadActivityReviews();
  const issues = IssueStore.getAll(); // 已缓存则同步渲染；未载由 _fillReports 增量填充

  // 选中组兜底：组已解散/改名后旧名失效 → 回退首组（无组则进展区为空态）
  if (!viewGroups.some(g => g.groupName === _selectedGroup)) {
    _selectedGroup = viewGroups.length ? viewGroups[0].groupName : null;
  }
  const group = viewGroups.find(g => g.groupName === _selectedGroup) || null;

  const history = listGroupHistory();
  container.innerHTML = `
    <div class="space-y-4">
      ${_ungroupedBarHtml(ungrouped, canManage)}
      ${_manageCardHtml(entities, statOf, canManage)}
      ${history.length ? _historyCardHtml(history) : ''}
      ${group ? `
        ${_groupSwitchHtml(viewGroups, group, issues)}
        ${_memberProgressCardHtml(group, issues)}
        ${_reviewStatusCardHtml(group, members, activities, reviews)}
        ${_activityAttendanceCardHtml(group, members, branchId, activities, attRecords)}`
      : _noGroupHintHtml()}
    </div>`;

  _bindEvents(container);
  // 已载则先同步渲染（未载由 _fillReports 首拉后增量填充，避免 0 高后插）
  if (group && _issuesLoaded) _renderReportsList(container.querySelector('#gp-reports'), group, issues);
  if (group) _fillReports(container, group, members);
}

/** 本支部党小组实体清单（active 置前，其后按 seq 升序；含已解散以显示状态） */
function _branchGroupEntities(branchId) {
  return loadPartyGroups()
    .filter(g => !branchId || (g.branchId || DEFAULT_BRANCH_ID) === branchId)
    .sort((a, b) => {
      const sa = a.status === 'active' ? 0 : 1;
      const sb = b.status === 'active' ? 0 : 1;
      return sa - sb || (Number(a.seq) || 0) - (Number(b.seq) || 0);
    });
}

/** 组名 → 派生统计（组长/人数/党员数；来自 group-view.js，不由本文件重算） */
function _statMap(viewGroups) {
  const map = new Map();
  for (const g of viewGroups) {
    map.set(g.groupName, { leaderId: g.leaderId, memberCount: g.memberCount, partyCount: g.partyCount });
  }
  return map;
}

// ── ① 未分组归组条（写；无权限只读） ──────────────────────────
function _ungroupedBarHtml(ungrouped, canManage) {
  if (!ungrouped.length) return '';
  const options = groupOptions();
  const canAssign = canManage && options.length > 0;
  return `
    <div class="card rounded-xl p-4">
      <div class="flex items-center justify-between mb-1">
        <h4 class="font-title-cn text-sm font-bold text-gray-700">未分组 <span class="text-xs text-gray-500 font-normal">${ungrouped.length} 人</span></h4>
        <span class="text-xs text-gray-500">${canAssign ? '选定即归入' : '只读查看'}</span>
      </div>
      <p class="text-[11px] text-gray-500 mb-2.5">${options.length === 0
        ? '支部暂无在册党小组，请先在下方「党小组清单」新增党小组，再逐个归组。'
        : (canAssign
          ? '逐个选择所属党小组即完成归组；选择「移出党小组」保持未分组。'
          : '归组由支书/副支书办理（当前为只读查看）。')}</p>
      <div class="flex flex-wrap gap-x-5 gap-y-2">
        ${ungrouped.map(p => _ungroupedRowHtml(p, options, canAssign)).join('')}
      </div>
    </div>`;
}

function _ungroupedRowHtml(p, options, canAssign) {
  const opts = [
    '<option value="" selected>移出党小组</option>',
    ...options.map(o => `<option value="${esc(o)}">${esc(o)}</option>`),
  ].join('');
  const control = canAssign
    ? `<select class="gp-assign-select input-flat text-xs" data-person="${esc(p.id)}">${opts}</select>`
    : '<span class="text-xs text-gray-500">未分组</span>';
  return `
    <div class="flex items-center gap-2 shrink-0">
      <a href="${getBasePath()}person.html?id=${encodeURIComponent(p.id)}" class="text-xs text-gray-800 hover:underline hover:text-sky-700 transition-colors" title="查看完整档案">${esc(p.name || getPersonName(p.id))}</a>
      ${control}
    </div>`;
}

// ── ② 党小组清单（管理区；写口显隐与校验同源 canManagePartyGroups） ──
function _manageCardHtml(entities, statOf, canManage) {
  const rows = entities.length
    ? entities.map(g => _manageRowHtml(g, statOf.get(g.name), canManage)).join('')
    : `<tr><td colspan="7" class="py-2 px-3 text-gray-500">支部暂无党小组，点右上「新增党小组」建立第一组</td></tr>`;
  return `
    <div class="card rounded-xl p-4">
      <div class="flex items-center justify-between mb-1">
        <h4 class="font-title-cn text-sm font-bold text-gray-700">党小组清单</h4>
        <div class="flex items-center gap-2">
          <span class="text-xs text-gray-500">${canManage ? '支书/副支书可管理' : '只读查看'}</span>
          ${canManage ? '<button type="button" class="gp-add-group text-xs px-3 py-1.5 rounded-lg text-white transition-colors hover:opacity-90" style="background:#CE1126;cursor:pointer;">+ 新增党小组</button>' : ''}
        </div>
      </div>
      <p class="text-[11px] text-gray-500 mb-2.5">组长由成员档案（组长身份 + 组内归属）派生，指派入口在「赋权管理」；改名会同步改写该组全部成员的档案归属；解散允许非空组，组内成员转为「未分组」。</p>
      <div class="overflow-x-auto">
        <table class="data-table">
          <thead>
            <tr>
              <th>组名</th>
              <th>序号</th>
              <th>组长</th>
              <th>人数</th>
              <th>党员数</th>
              <th>状态</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </div>`;
}

function _manageRowHtml(g, stat, canManage) {
  const active = g.status === 'active';
  const leader = stat && stat.leaderId ? getPersonName(stat.leaderId) : '—';
  const actions = (canManage && active)
    ? `<div class="flex items-center gap-2">
        <button type="button" class="gp-rename text-gray-600 hover:text-gray-800 transition-colors" style="cursor:pointer;" data-id="${esc(g.id)}">改名</button>
        <button type="button" class="gp-dissolve text-red-600 hover:text-red-700 transition-colors" style="cursor:pointer;" data-id="${esc(g.id)}">解散</button>
      </div>`
    : '<span class="text-gray-500">—</span>';
  return `
    <tr>
      <td class="text-gray-800 font-medium">${esc(g.name)}</td>
      <td class="text-gray-600 tabular-nums">${Number(g.seq) || 0}</td>
      <td class="text-gray-600">${esc(leader)}</td>
      <td class="text-gray-600 tabular-nums">${stat ? stat.memberCount : 0}</td>
      <td class="text-gray-600 tabular-nums">${stat ? stat.partyCount : 0}</td>
      <td><span class="text-xs px-1.5 py-0.5 rounded-full ${active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}">${active ? '在册' : '已解散'}</span></td>
      <td>${actions}</td>
    </tr>`;
}

// ── ③ 组级变更留痕（可折叠；服务层 history 汇总） ──────────────
function _historyCardHtml(history) {
  const rows = history.slice(0, 10);
  return `
    <div class="card rounded-xl p-4">
      <div class="flex items-center justify-between">
        <h4 class="font-title-cn text-sm font-bold text-gray-700">变更留痕 <span class="text-xs text-gray-500 font-normal">${history.length} 条</span></h4>
        <button type="button" class="gp-history-toggle text-xs text-gray-500 hover:text-gray-700 transition-colors" style="cursor:pointer;">${_historyOpen ? '收起' : '展开最近 10 条'}</button>
      </div>
      ${_historyOpen ? `<div class="mt-2.5 pt-2.5 border-t border-gray-100 divide-y divide-gray-50">
        ${rows.map(_historyRowHtml).join('')}
      </div>` : ''}
    </div>`;
}

function _historyRowHtml(h) {
  const at = String(h.at || '').slice(0, 16).replace('T', ' ');
  const who = h.by ? getPersonName(h.by) : '';
  const what = h.action === 'rename'
    ? `改名：「${String(h.from || '')}」→「${String(h.to || '')}」`
    : h.action === 'dissolve' ? `解散${h.note ? `（${h.note}）` : ''}`
      : h.action === 'create' ? '新增党小组' : String(h.action || '变更');
  return `
    <div class="flex items-center gap-2.5 py-1.5">
      <span class="text-xs text-gray-500 w-32 shrink-0 tabular-nums">${esc(at)}</span>
      <span class="text-xs px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600 shrink-0">${esc(h.groupName)}</span>
      <span class="text-xs text-gray-700 flex-1 min-w-0 truncate">${esc(what)}</span>
      <span class="text-xs text-gray-500 shrink-0">${esc(who || '—')}</span>
    </div>`;
}

/** 进展区空态（支部尚无成员归组时） */
function _noGroupHintHtml() {
  return `
    <div class="card rounded-xl p-8 text-center">
      <p class="text-sm text-gray-500">支部暂无党小组成员</p>
      <p class="text-xs text-gray-500 mt-1">成员归入党小组后，此处显示跨组进展（组员汇报 / 复盘状态 / 活动与考勤）</p>
    </div>`;
}

// ── ④ 组切换层（页顶卡片） ────────────────────────────────────
function _groupSwitchHtml(groups, activeGroup, issues) {
  return `
    <div class="card rounded-xl p-4">
      <div class="flex items-center justify-between mb-3">
        <h4 class="font-title-cn text-sm font-bold text-gray-700">跨组进展</h4>
        <span class="text-xs text-gray-500">${groups.length} 个党小组 · 支书只读知情</span>
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
      style="${isActive ? 'border-color:rgba(185,28,28,0.45);--acc-bg-dark:rgba(239,68,68,0.12);' : 'border-color:#F3F4F6;'}">
      <div class="flex items-center justify-between gap-2">
        <span class="text-sm font-semibold text-gray-800">${esc(g.groupName)}</span>
        <span class="gp-open-badge text-xs px-1.5 py-0.5 rounded-full ${openCount ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'}">
          ${openCount === null ? '…' : `待答复 ${openCount}`}
        </span>
      </div>
      <div class="text-xs text-gray-500 mt-1.5">组长：${g.leaderId ? esc(getPersonName(g.leaderId)) : '<span class="text-gray-500">未设置</span>'}</div>
      <div class="text-[11px] text-gray-500 mt-0.5">党员 ${g.partyCount} 人 · 成员 ${g.memberCount} 人</div>
    </button>`;
}

// ── ⑤ 组员进展摘要（汇报区；首拉异步填充后增量刷新） ───────────
function _memberProgressCardHtml(group, issues) {
  // 已载：空宿主交由统一检索引擎渲染；未载：轻量加载行占位
  const inner = _issuesLoaded ? '' : _reportsLoadingHtml();
  const leaderNote = group.leaderId ? '' : '<span class="text-xs text-gray-500">（本组暂无组长，「请组长关注」不可用）</span>';
  return `
    <div class="card rounded-xl p-4">
      <div class="flex items-center justify-between mb-1">
        <h4 class="font-title-cn text-sm font-bold text-gray-700">组员进展摘要</h4>
        <span class="text-xs text-gray-500">组员向组长汇报 · 支书只读</span>
      </div>
      <p class="text-[11px] text-gray-500 mb-2.5">支书不代组长答复；对待答复行可「请组长关注」——请求直达组长「我的处置」，不落答复 ${leaderNote}</p>
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

/** 汇报行派生状态（组长已答复 / 待答复 / 待汇报 / 卡点 / 已办结） */
function _reportRowState(issue) {
  if (issue.status === 'closed') return { label: '已办结', cls: 'bg-gray-100 text-gray-600' };
  const hasLeaderReply = (issue.comments || []).some(c => !c.hidden && c.kind === 'reply' && c.authorRole === 'leader');
  if (hasLeaderReply) return { label: '组长已答复', cls: 'bg-green-100 text-green-700' };
  // 上级（支书/组长）「了解进展」请求行：尚未回应 → 待汇报；组员/被请人已回应(resultPending) → 待答复
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

/** 组员进展摘要列表（统一检索引擎：关键词 + 分面；每组 ≤8 行 → 引擎自动不渲染检索条） */
function _renderReportsList(hostEl, group, allIssues) {
  if (!hostEl) return;
  renderFilteredList(hostEl, {
    stateKey: `secretary-group-progress-reports-${group.groupName}`,
    rows: _groupReportRows(allIssues, group),
    keyword: personKeyword(),
    facets: personFacets({ roleLabel: roleLabelOf }),
    countUnit: '人',
    listClass: 'space-y-1.5',
    emptyMessage: '暂无本组组员汇报，组员汇报答复在组长台完成',
    rowHtml: (r) => {
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
            <a href="${getBasePath()}person.html?id=${encodeURIComponent(r.submittedBy)}" class="text-sm font-medium text-gray-800 shrink-0 hover:underline hover:text-sky-700 transition-colors" title="查看完整档案">${esc(submitterName)}</a>
            <span class="text-xs text-gray-600 flex-1 min-w-0 truncate">${esc(r.title)}</span>
          </div>
          <div class="text-[11px] text-gray-500">${esc(r.submittedAt || '')}${r.requestedBy ? ' · ' + esc(getPersonName(r.requestedBy)) + ' 请汇报' : ''}</div>
        </div>
        <span class="text-xs px-1.5 py-0.5 rounded-full ${st.cls} shrink-0">${st.label}</span>
        ${askBtn}
      </div>`;
    },
  });
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
  const branchId = _branchId();
  const groups = listPartyGroups({ members, branchId });
  const curGroup = groups.find(x => x.groupName === _selectedGroup) || group;

  container.querySelectorAll('.gp-open-badge').forEach(badge => {
    const gName = badge.closest('.gp-group-card')?.dataset.group;
    const g = groups.find(x => x.groupName === gName);
    const n = g ? countOpenReportsByGroup(issues, g) : 0;
    badge.textContent = `待答复 ${n}`;
    badge.className = `gp-open-badge text-xs px-1.5 py-0.5 rounded-full ${n ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'}`;
  });

  const listEl = container.querySelector('#gp-reports');
  if (!listEl) return;
  _renderReportsList(listEl, curGroup, issues);
}

// ── ⑥ 本组活动复盘状态（只读；与组长台同口径同表） ─────────────
function _reviewStatusCardHtml(group, members, activities, reviews) {
  const groupActs = groupActivitiesOf(activities, members, group.groupName);
  const { pending, completed } = reviewBucketOf(groupActs, reviews);
  const statusColor = (st) => GROUP_REVIEW_COLOR[st] || 'bg-gray-100 text-gray-600';

  const pendingRows = pending.length === 0
    ? '<p class="text-xs text-gray-500 py-1">暂无待复盘活动</p>'
    : pending.map(({ act, rev }) => {
        const label = rev ? REVIEW_STATUS_LABELS[rev.reviewStatus] : '未提交';
        return `
          <div class="p-2.5 rounded-lg bg-white border border-gray-50">
            <div class="flex items-center justify-between gap-3">
              <div class="min-w-0 flex-1">
                <a href="../activity.html?id=${encodeURIComponent(act.id || '')}" class="block" style="text-decoration:none;color:inherit;" title="查看活动详情">
                  <div class="text-sm font-medium text-gray-800 truncate">${esc(act.title || '未命名')}</div>
                  <div class="text-xs text-gray-500 mt-0.5">${esc(act.date || '')}${act.type ? ' · ' + esc(act.type) : ''}</div>
                </a>
              </div>
              <span class="text-xs px-1.5 py-0.5 rounded-full ${statusColor(rev?.reviewStatus || ReviewStatus.NOT_SUBMITTED)} shrink-0">
                ${label}${rev?.reviewStatus === ReviewStatus.REJECTED ? ' · 需修改' : ''}
              </span>
            </div>
          </div>`;
      }).join('');

  const completedRows = completed.length === 0
    ? '<p class="text-xs text-gray-500 py-1">暂无已复盘活动</p>'
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
                <span class="text-xs text-gray-500">${isExpanded ? '收起' : '详情'}</span>
              </div>
            </div>
            ${isExpanded && rev ? _reviewDetailHtml(rev) : ''}
          </div>`;
      }).join('');

  return `
    <div class="card rounded-xl p-4">
      <div class="flex items-center justify-between mb-2">
        <h4 class="font-title-cn text-sm font-bold text-gray-700">本组活动复盘状态</h4>
        <span class="text-xs text-gray-500">待复盘 ${pending.length} · 已复盘 ${completed.length}</span>
      </div>
      <p class="text-[11px] text-gray-500 mb-3">复盘由活动组织者 / 深度参与者提交（成员端「我的复盘」）；支书只读查看，点击已复盘行可展开详情。</p>
      <div class="mb-3">
        <div class="text-xs font-bold text-gray-600 mb-1.5">待复盘 <span class="text-gray-500 font-normal">(${pending.length})</span></div>
        <div class="space-y-1.5">${pendingRows}</div>
      </div>
      <div class="pt-2.5 border-t border-gray-100">
        <div class="text-xs font-bold text-gray-600 mb-1.5">已复盘 <span class="text-gray-500 font-normal">(${completed.length})</span></div>
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
        <ul class="space-y-0.5">${issues.map(i => `<li class="text-xs text-amber-800" style="--acc-text-dark:#FBBF24;">· ${esc(i)}</li>`).join('')}</ul>
      </div>` : ''}
      ${rev.submittedAt ? `<div class="text-xs text-gray-500 mt-1">提交时间：${esc(String(rev.submittedAt).slice(0, 16).replace('T', ' '))}</div>` : ''}
      ${rev.annotation ? `
        <div class="mt-2 p-2 rounded-lg bg-blue-50 border border-blue-100">
          <div class="text-xs text-blue-500 font-bold mb-1">纪检委员批注</div>
          <div class="text-xs text-blue-700 whitespace-pre-wrap">${esc(rev.annotation)}</div>
        </div>` : ''}
    </div>`;
}

// ── ⑦ 本组活动与考勤概览（纯读） ──────────────────────────────
function _activityAttendanceCardHtml(group, members, branchId, activities, attRecords) {
  const groupActs = groupActivitiesOf(activities, members, group.groupName);
  const recentActs = groupActs.slice(0, 4);
  const today = new Date().toISOString().slice(0, 10);

  const recentRows = recentActs.length === 0
    ? '<p class="text-xs text-gray-500 py-1">暂无本组活动</p>'
    : recentActs.map(a => `
        <div class="flex items-center gap-2.5 py-1.5">
          <span class="text-xs text-gray-500 w-20 shrink-0">${esc(a.date || '')}</span>
          <span class="text-xs px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600 shrink-0">${esc(a.type || '活动')}</span>
          <span class="text-xs text-gray-700 flex-1 min-w-0 truncate">${esc(a.title || '未命名')}</span>
        </div>`).join('');

  // 已发生的本组党小组会 → 应到/实到概况（roster 组口径应到 + attendance 记录实到）
  const metRows = groupActs.filter(a => a.type === '党小组会' && a.date <= today);
  const attRowsHtml = metRows.length === 0
    ? '<p class="text-xs text-gray-500 py-1">暂无已发生的党小组会（考勤生成后此处显示应到/实到）</p>'
    : metRows.map(a => {
        const expected = getMeetingRosterIds({ type: '党小组会', groupId: group.groupName, branchId }).length;
        const recs = attRecords.filter(r => r.activityId === a.id);
        if (!recs.length) {
          return `
            <div class="flex items-center gap-2.5 py-1.5">
              <span class="text-xs text-gray-500 w-20 shrink-0">${esc(a.date || '')}</span>
              <span class="text-xs text-gray-600 flex-1 min-w-0 truncate">${esc(a.title || '未命名')}</span>
              <span class="text-xs text-gray-500 shrink-0">考勤未生成</span>
            </div>`;
        }
        const present = recs.filter(r => r.status === AttendanceStatus.PRESENT || r.status === AttendanceStatus.MADE_UP).length;
        const absent = recs.filter(r => r.status === AttendanceStatus.ABSENT || r.status === AttendanceStatus.LEAVE).length;
        return `
            <div class="flex items-center gap-2.5 py-1.5">
              <span class="text-xs text-gray-500 w-20 shrink-0">${esc(a.date || '')}</span>
              <span class="text-xs text-gray-600 flex-1 min-w-0 truncate">${esc(a.title || '未命名')}</span>
              <span class="text-xs text-gray-600 shrink-0 tabular-nums" title="考勤应到＝正式＋预备党员（剔除滞留），与表决「应到（有表决权党员）」口径不同">应到 ${expected} · 实到 ${present}</span>
              <span class="text-xs text-gray-500 shrink-0 tabular-nums">未到 ${absent}</span>
            </div>`;
      }).join('');

  return `
    <div class="card rounded-xl p-4">
      <div class="flex items-center justify-between mb-2">
        <h4 class="font-title-cn text-sm font-bold text-gray-700">本组活动与考勤概览</h4>
        <span class="text-xs text-gray-500">组织者属本组 · 只读</span>
      </div>
      <p class="text-[11px] text-gray-500 mb-3">近期活动按日期降序${groupActs.length > 4 ? `，共 ${groupActs.length} 场，仅示最近 4 场` : ''}</p>
      <div class="mb-3">
        <div class="text-xs font-bold text-gray-600 mb-1.5">近期活动</div>
        <div class="space-y-0.5">${recentRows}</div>
      </div>
      <div class="pt-2.5 border-t border-gray-100">
        <div class="text-xs font-bold text-gray-600 mb-1.5">党小组会应到/实到 <span class="text-gray-500 font-normal">（按本组党员统计，含已发生）</span></div>
        <div class="space-y-0.5">${attRowsHtml}</div>
      </div>
    </div>`;
}

// ════════════════════════════════════════════════════════════════
//  事件（元素级：组切换 / 复盘展开；容器级委托：归组下拉 / 管理动作 / 请组长关注）
// ════════════════════════════════════════════════════════════════
function _bindEvents(container) {
  // 组切换（元素随 innerHTML 重建，逐次绑定即幂等）
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

  _bindDelegated(container);
}

/** 容器级委托：容器常驻 → 只注册一次（防多次重渲染累积监听导致重复写入） */
function _bindDelegated(container) {
  if (container.dataset.gpDelegated === '1') return;
  container.dataset.gpDelegated = '1';

  container.addEventListener('click', (e) => {
    const ask = e.target.closest('.gp-ask-leader');
    if (ask) { _onAskLeader(container, ask); return; }
    if (e.target.closest('.gp-add-group')) { _openAddGroupModal(container); return; }
    const ren = e.target.closest('.gp-rename');
    if (ren) { _openRenameModal(container, ren.dataset.id); return; }
    const dis = e.target.closest('.gp-dissolve');
    if (dis) { _openDissolveModal(container, dis.dataset.id); return; }
    if (e.target.closest('.gp-history-toggle')) {
      _historyOpen = !_historyOpen;
      _renderAll(container);
    }
  });

  // 未分组行内下拉：选定即归组/移出（assignMemberToGroup 单一写口）
  container.addEventListener('change', (e) => {
    const sel = e.target.closest('.gp-assign-select');
    if (!sel) return;
    _onAssignChange(container, sel.dataset.person, sel.value);
  });
}

/** 归组/移出（成功后 toast + 局部重渲染；失败回读实际值） */
async function _onAssignChange(container, personId, groupName) {
  const me = _me();
  const r = await assignMemberToGroup(personId, groupName, { by: me.personId, role: me.role });
  if (!r || r.ok === false) {
    showToast('error', (r && r.reason) || '归组失败');
    _renderAll(container);
    return;
  }
  showToast('success', groupName
    ? `已将「${getPersonName(personId)}」归入「${groupName}」`
    : `已将「${getPersonName(personId)}」移出党小组`);
  _renderAll(container);
}

/** 「请组长关注」轻动作：复用支书「了解进展」请求通道（requestReport 直达组长），不落答复 */
function _onAskLeader(container, btn) {
  const note = btn.dataset.note || '';
  const branchId = _branchId();
  const group = listPartyGroups({ members: PersonStore.getMembers(), branchId })
    .find(x => x.groupName === _selectedGroup);
  if (!group || !group.leaderId) { showToast('error', '该组暂无组长，无法发起'); return; }
  IssueStore.requestReport(group.leaderId, 'leader', note);
  showToast('success', `已请组长「${getPersonName(group.leaderId)}」关注本组进展`);
  _fillReports(container, group, PersonStore.getMembers()); // 刷新徽标/行
}

// ── 管理动作（新增 / 改名 / 解散；权限门 = canManagePartyGroups 单一源） ──
const BTN_CANCEL = 'text-xs px-3 py-1.5 rounded-lg text-gray-500 hover:bg-gray-50 transition-colors';
const BTN_PRIMARY = 'text-xs px-3 py-1.5 rounded-lg text-white transition-colors hover:opacity-90';

function _openAddGroupModal(container) {
  const defName = defaultGroupName(nextGroupSeq()); // 默认名与服务层同源（第 N 党小组）
  openModal({
    id: 'gp-add-group',
    title: '新增党小组',
    width: '480px',
    accentColor: '#CE1126',
    bodyHtml: `
      <div class="space-y-3">
        <div>
          <label class="text-xs text-gray-500 mb-1.5 block font-medium" for="gp-add-name">组名</label>
          <input type="text" id="gp-add-name" class="input-flat w-full" placeholder="留空则用「${esc(defName)}」">
        </div>
        <p class="text-xs text-gray-500">同一支部内活组组名不得重复；成立后可在清单行「改名」，成员在页面顶部「未分组」一行逐个归组。</p>
      </div>
      <div class="flex justify-end gap-2 mt-4">
        <button type="button" id="gp-add-cancel" class="${BTN_CANCEL}" style="cursor:pointer;">取消</button>
        <button type="button" id="gp-add-confirm" class="${BTN_PRIMARY}" style="background:#CE1126;cursor:pointer;">新增</button>
      </div>`,
    onMount: (panel) => {
      panel.querySelector('#gp-add-cancel')?.addEventListener('click', () => closeModal('gp-add-group'));
      panel.querySelector('#gp-add-confirm')?.addEventListener('click', async () => {
        const name = panel.querySelector('#gp-add-name')?.value?.trim() || '';
        const me = _me();
        const r = await addGroup({ name, by: me.personId, role: me.role, branchId: _branchId() });
        if (!r || r.ok === false) { showToast('error', (r && r.reason) || '新增失败'); return; }
        closeModal('gp-add-group');
        showToast('success', `已新增「${r.group.name}」`);
        _renderAll(container);
      });
    },
  });
}

function _openRenameModal(container, id) {
  const g = loadPartyGroups().find(x => x.id === id);
  if (!g) return;
  openModal({
    id: 'gp-rename',
    title: '改组名',
    width: '480px',
    accentColor: '#CE1126',
    bodyHtml: `
      <div class="space-y-3">
        <div>
          <label class="text-xs text-gray-500 mb-1.5 block font-medium" for="gp-rename-name">组名</label>
          <input type="text" id="gp-rename-name" class="input-flat w-full" value="${esc(g.name)}">
        </div>
        <p class="text-xs text-gray-500">改名将同步改写该组全部成员的档案归属（原「${esc(g.name)}」下的成员一并改为新组名），相关活动与考勤口径随之对齐。</p>
      </div>
      <div class="flex justify-end gap-2 mt-4">
        <button type="button" id="gp-rename-cancel" class="${BTN_CANCEL}" style="cursor:pointer;">取消</button>
        <button type="button" id="gp-rename-confirm" class="${BTN_PRIMARY}" style="background:#CE1126;cursor:pointer;">保存</button>
      </div>`,
    onMount: (panel) => {
      panel.querySelector('#gp-rename-cancel')?.addEventListener('click', () => closeModal('gp-rename'));
      panel.querySelector('#gp-rename-confirm')?.addEventListener('click', async () => {
        const name = panel.querySelector('#gp-rename-name')?.value?.trim() || '';
        if (!name) { showToast('error', '组名不能为空'); return; }
        const me = _me();
        const r = await renameGroup(id, name, { by: me.personId, role: me.role });
        if (!r || r.ok === false) { showToast('error', (r && r.reason) || '改组失败'); return; }
        closeModal('gp-rename');
        if (_selectedGroup === g.name) _selectedGroup = name; // 进展区跟随新组名
        showToast('success', r.movedCount
          ? `已改名为「${name}」，同步 ${r.movedCount} 名成员档案归属`
          : `已改名为「${name}」`);
        _renderAll(container);
      });
    },
  });
}

function _openDissolveModal(container, id) {
  const g = loadPartyGroups().find(x => x.id === id);
  if (!g) return;
  const stat = _statMap(listPartyGroups({ members: PersonStore.getMembers(), branchId: _branchId() })).get(g.name);
  const n = stat ? stat.memberCount : 0; // 组内人数（解散后转为「未分组」）
  openModal({
    id: 'gp-dissolve',
    title: '解散党小组',
    width: '480px',
    accentColor: '#CE1126',
    bodyHtml: `
      <p class="text-sm text-gray-800">确认解散「${esc(g.name)}」？</p>
      <p class="text-xs text-gray-500 mt-2">组内 ${n} 人将转为「未分组」，可在页面顶部「未分组」一行再逐个归入其它党小组；该组留痕保留，解散后不再出现在任何下拉与统计中。</p>
      <div class="mt-3">
        <label class="text-xs text-gray-500 mb-1.5 block font-medium" for="gp-dissolve-note">解散原因（可空）</label>
        <input type="text" id="gp-dissolve-note" class="input-flat w-full" placeholder="如：并入其它党小组 / 成员重新分组">
      </div>
      <div class="flex justify-end gap-2 mt-4">
        <button type="button" id="gp-dissolve-cancel" class="${BTN_CANCEL}" style="cursor:pointer;">取消</button>
        <button type="button" id="gp-dissolve-confirm" class="${BTN_PRIMARY}" style="background:#CE1126;cursor:pointer;">确认解散</button>
      </div>`,
    onMount: (panel) => {
      panel.querySelector('#gp-dissolve-cancel')?.addEventListener('click', () => closeModal('gp-dissolve'));
      panel.querySelector('#gp-dissolve-confirm')?.addEventListener('click', async () => {
        const note = panel.querySelector('#gp-dissolve-note')?.value?.trim() || '';
        const me = _me();
        const r = await dissolveGroup(id, { by: me.personId, role: me.role, note });
        if (!r || r.ok === false) { showToast('error', (r && r.reason) || '解散失败'); return; }
        closeModal('gp-dissolve');
        if (_selectedGroup === g.name) _selectedGroup = null; // 进展区回退首组
        showToast('success', `已解散「${g.name}」，${r.movedCount} 名成员转为未分组`);
        _renderAll(container);
      });
    },
  });
}
