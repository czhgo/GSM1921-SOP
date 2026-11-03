// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  entries/tabs/secretary/group-progress-tab.js — 支书工作台·党小组 tab
// ════════════════════════════════════════════════════════════════
// 沿革：2026-09-08 D8 新增「党小组进展」（跨组只读知情）；2026-09-14 批次 25 升级为「党小组」；2026-09-25 更名「党小组与活动」并收编「党小组活动」分区（判据单一源见文件末）——
//   党小组升为一等实体（data/mock/party-groups.js + services/member/party-group.js），本 tab 由**纯只读**升级为
//   「管理区（写） + 进展区（只读）」两层。
//   **2026-11-01 批次 525 Task 4（本页整页重做为主从双栏）**：
//     左栏（约 320px）＝党小组选择器：未分组行置顶（人数 + 「归组」展开写口）→ 每组一行
//       （组名 / 组长 / 党员·成员 / 待答复徽标，选中态）→ 行尾「管理」（改名 / 解散）→ 底部「+ 新建党小组」；
//     右栏＝选中组详情：组名 / 组长 / 人数 + 「设 / 改组长」→「活动台账」一张表（日期 / 活动 / 复盘状态 /
//       应到·实到；默认 6 行 + 查看全部）→「组员汇报（待答复）」→ 底部「变更记录（N）」原地展开。
//     「活动台账」合并原「本组活动复盘状态」与「本组活动与考勤概览」（同一活动只出现一行）；
//     删除「选择党小组」独立卡、裸 `h4.disclosure__title` 折叠壳与 `<section>`（改普通容器）；
//     标题层级：页头 H2 → 左右两卡 H3 → 卡内分区 H4；≤640 左栏转横向组选择条、台账转卡片行。
//   写口（逐条保留，DOM 钩子不变）：未分组 `.gp-assign-select`（assignMemberToGroup）· 新增 `.gp-add-group`
//     · 改名 `.gp-rename` / `#gp-rename-name` · 解散 `.gp-dissolve` · 设 / 改组长 `.gp-assign-leader`
//     （`#gp-leader-assign-host` + `#assign-area`）· 行内撤销 `.gp-revoke-leader` · 请组长关注 `.gp-ask-leader`。
// 语义：支书/副支书同界面共享；组员向组长提交的汇报最近若干条（谁/主题/时间/状态），
//   对「待答复」行提供「请组长关注」轻动作——复用 IssueStore.requestReport 向组长发请求（不落答复）。
// 数据源/口径：组聚合在 services/member/group-view.js（成员档案 partyGroup）；组清单/写口/权限门/留痕在
//   services/member/party-group.js（组名与权限的**单一来源**，本文件禁手写组名数组）；roster.js 禁改→只读复用。
// 纪律：同步渲染优先（activities/attendance/review/members 均同步源先渲），汇报区唯一异步源
//   IssueStore.loadAll 首拉期间以轻量加载行占位（无 0 高后插）；空态统一 text-xs 灰字。
// 事件：组切换/台账展开/复盘展开以元素级绑定（元素随 innerHTML 重建，幂等）；容器级委托只注册一次
//   （dataset 标记）——归组下拉 change / 新增 / 改名 / 解散 / 留痕折叠 / 请组长关注 / 未分组展开 / 台账查看全部。
// 规范：筛选一律用下拉（禁 chip 筛选）；表格样式单一源（styles.css::.data-table 提供表头/行线/悬停/内边距，
//   数据格与表头一律由该 CSS 类族提供，各表勿再重复声明）；弹窗走 components/ui/modal.js；
//   提示走 showToast(type, message)。本页禁用 SVG 图标（支书台裁定），类别用色点+文字区分。
// 区块顺序（2026-11-01 批次 525）：页头 H2 → 主从双栏（左栏组选择器 / 右栏组详情），顶层只有这两块。
//   **2026-10-04 批次 373 按对象归位**：原「党小组活动」分区与「项目赋权」整卡（含 已赋权记录·活动/专班）
//   ⇒ 迁「活动管理」页（`calendar-tab.js`，`mountActivityProjectAuth`）——本页只留「组」。
//   **沿革/判据**：2026-09-27 批次 215 曾把「支委身份配置」拆为支部层独立卡置于党小组清单之前
//   （母本 `content/02_institution/COMMISSIONER_DUTY_FRAMEWORK.md` §A「支委会领导党小组」）；**本批（2026-09-27）按支书裁定**
//   「支委配置归支委会」——「支部大会选举支委 → 支委会讨论分工」⇒ 支委身份配置（情景①b）整体迁入支书台
//   「支委会」tab（2026-10-18 起由 committee-meeting-tab 的委员表行内改派承载，写口仍为
//   services/branch/appointment.js；assign-tab 的整块表单导出保留但不再有宿主）；
//   本 tab 只余 情景①a 组长指派（组层）。
//   ⚠ **只动渲染结构 / 分层与落点**，不改任何功能、权限判定与写口——DOM ID 全保留，真机流程不失配。
// ════════════════════════════════════════════════════════════════

import { AuthStore } from '../../../services/core/auth.js?v=20261102b';
import { isApiMode } from '../../../services/core/runtime.js?v=20261102b';
import { PersonStore, getPersonName } from '../../../services/member/person.js?v=20261102b';
import { getBranchIdOfPerson } from '../../../services/branch/branch.js?v=20261102b';
import { IssueStore } from '../../../services/governance/issues.js?v=20261102b';
import { loadActivities } from '../../../services/activity/activity.js?v=20261102b';
import { loadActivityReviews } from '../../../services/governance/review.js?v=20261102b';
import { loadAttendanceRecords } from '../../../services/activity/attendance.js?v=20261102b';
import { AttendanceStatus, ReviewStatus, REVIEW_STATUS_LABELS } from '../../../core/domain/domain.js?v=20261102b';
import { getMeetingRosterIds } from '../../../services/member/roster.js?v=20261102b';
import { showToast, escHtml as esc, getBasePath, todayLocal } from '../../../core/base/utils.js?v=20261102b';
// 统一检索引擎（2026-09-13 表格统一化批次 A）：组员汇报（按人）接入关键词 + 分面
import { renderFilteredList, personKeyword, personFacets, roleLabelOf } from '../../../components/ui/list-filter.js?v=20261102b';
// 活动类型胶囊（批次 301）：变体判据＝单一源 `activityTypeBadgeVariant`（三会一课＝brand 红 / 主题党日＝gold 金），
//   渲染唯一源＝`components/ui/badge.js`；**不在本文件手写色值**（支书 2026-09-30：颜色是最好的信息展示方式）。
import { activityTypeBadgeVariant, DEFAULT_BRANCH_ID } from '../../../core/domain/constants.js?v=20261102b';
import { badgeHtml } from '../../../components/ui/badges.js?v=20261102b'; // 扎口出口（批次 304 收回，勿直连 badge.js）
import { openModal, closeModal } from '../../../components/ui/modal.js?v=20261102b';
import { renderTabHeader, renderCardHeader } from '../../../components/shell/page-frame.js?v=20261102b';
// 党小组一等实体服务层（组清单 / 写口 / 权限门 / 留痕——组名唯一来源，禁本文件手写组名数组）
import {
  loadPartyGroups, groupOptions, defaultGroupName, nextGroupSeq,
  addGroup, renameGroup, dissolveGroup, assignMemberToGroup, ungroupedMembers,
  canManagePartyGroups, listGroupHistory,
} from '../../../services/member/party-group.js?v=20261102b';
import {
  listPartyGroups, countOpenReportsByGroup,
  groupActivitiesOf, GROUP_REVIEW_COLOR, groupLeadershipOf,
  groupReportRowsOf, reportRowStateOf,
} from '../../../services/member/group-view.js?v=20261102b';
// 赋权分块（2026-09-25 支书裁「全按对象归位」）：情景①a（设党小组组长 / 副组长）由本 tab 左栏行内 /
//   右栏头部「设 / 改组长」开同一面板（2026-10-04 批次 373 去冗余：撤独立「组长指派」块）；
//   **情景①b 支委身份配置已按 2026-09-27 支书裁定迁「支委会」**；**情景②③ 项目赋权整卡按 2026-10-04
//   批次 373 迁「活动管理」页**（`calendar-tab.js`）。
//   实现单一源＝entries/tabs/secretary/assign-tab.js（该文件已不注册为 tab，仅余 mount* 分块）
//   ⇒ **不新造第二套视觉/表单**，只把既有分块挂到本 tab 的落点。
import { mountLeaderAssign, openLeaderAssignPanel } from './assign-tab.js?v=20261102b';
// Task 6：组员进展是跨对象聚合面 ⇒ 活动行直达完整详情页（direct）。
import { objectDetailHref } from '../../../core/domain/object-route.js?v=20261102b';

// R2-17：缺省支部单一源 = core/domain/constants.js::DEFAULT_BRANCH_ID。

// ── 模块级状态（随模块自持；tab 切走再回保持，页面刷新回退首组） ──
import { emptyStateHtml } from '../../../components/ui/empty-state.js?v=20261102b';
let _selectedGroup = null;      // 当前选中党小组名（右栏详情）
let _expandedReviewId = null;   // 已展开复盘详情活动 id（只读展开态）
let _issuesLoaded = false;      // issues 权威源是否已加载（避免未载时徽标误显 0）
let _historyOpen = false;       // 组级变更记录是否展开
let _ungroupedOpen = false;     // 左栏「未分组」归组面板是否展开
let _ledgerAll = false;         // 活动台账是否已展开全部（默认 6 行）

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
  if (!container) throw new Error('[group-progress-tab] 缺少内容容器 #secretary-tab-content'); container.dataset.currentTab = 'group-progress'; // 跨 tab 共享容器约定（同 todo/overview/…）：登记当前 tab 标记，防「活动管理 → 本 tab → 活动管理」残留旧内容
  _renderAll(container);
}

// ════════════════════════════════════════════════════════════════
//  整页渲染（主从双栏：左栏组选择器 / 右栏组详情）
// ════════════════════════════════════════════════════════════════
function _renderAll(container) {
  const branchId = _branchId();
  const members = PersonStore.getMembers();
  const viewGroups = listPartyGroups({ members, branchId }); // 成员档案派生（组长/人数/党员数）
  const entities = _branchGroupEntities(branchId);           // 一等实体清单（序号/状态）
  const canManage = canManagePartyGroups(_me().role);
  const ungrouped = ungroupedMembers(branchId);              // 服务层单一源（partyGroup 为空；限本支部，与名册同口径）

  const activities = loadActivities();
  const attRecords = loadAttendanceRecords();
  const reviews = loadActivityReviews();
  const issues = IssueStore.getAll(); // 已缓存则同步渲染；未载由 _fillReports 增量填充

  const rows = _activeGroupRows(entities, viewGroups);
  // 选中组兜底：组已解散/改名后旧名失效 → 回退首组（无组则右栏为空态）
  if (!rows.some(r => r.name === _selectedGroup)) {
    _selectedGroup = rows.length ? rows[0].name : null;
  }
  const selected = rows.find(r => r.name === _selectedGroup) || null;
  const group = selected ? selected.group : null;

  const history = listGroupHistory();
  const leaderAssign = _leaderAssignMap(branchId); // 组长 / 副组长：档案派生 ＋ 审计赋权叠加（2026-10-04 批次 373）

  container.innerHTML = `
    ${renderTabHeader({ title: '党小组', description: '左栏选组，右栏看本组活动台账、组员汇报与变更记录。' })}
    <div class="space-y-4">
      <div class="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)] lg:items-start" data-gp-layout>
        ${_groupRailHtml(rows, selected, ungrouped, entities, canManage, issues, leaderAssign)}
        ${group
          ? _groupDetailHtml(group, selected.id, canManage, members, branchId, activities, reviews, attRecords, history, leaderAssign)
          : _noGroupHintHtml()}
      </div>
    </div>`;

  _bindEvents(container);
  _mountAssignBlocks(container); // 组长 / 副组长赋权面板宿主（左栏行内 / 右栏头部「设 / 改」触发）
  if (group) {
    // 汇报区唯一异步源：已缓存则先同步渲一行，未载以加载行占位后再增量填充
    if (_issuesLoaded) _renderReportsList(container.querySelector('#gp-reports'), group, issues, leaderAssign);
    _fillReports(container, group, members);
  }
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

/** 在册组 → 选择器行（实体清单为准：0 成员的新建组也要可选、可管理；统计取档案派生，缺省全 0） */
function _activeGroupRows(entities, viewGroups) {
  return entities
    .filter(e => e.status === 'active')
    .map(e => {
      const view = viewGroups.find(v => v.groupName === e.name);
      return {
        id: e.id,
        name: e.name,
        group: view || {
          groupName: e.name,
          leaderId: null,
          memberIds: [],
          partyMemberIds: [],
          memberCount: 0,
          partyCount: 0,
        },
      };
    });
}

/** 组长 / 副组长赋权面板挂载（2026-10-04 批次 373 去冗余）：宿主随本 tab 渲染，**面板由「设 / 改」触发**
 *  （不单设「组长指派」块）；实现单一源＝assign-tab.js ——本文件只给落点宿主，不新造第二套视觉/表单。
 *  （情景①b 支委身份配置已按 2026-09-27 支书裁定迁支书台「支委会」tab；情景②③ 项目赋权整卡按
 *    2026-10-04 批次 373 迁「活动管理」页。） */
function _mountAssignBlocks(container) {
  mountLeaderAssign(container.querySelector('#gp-leader-assign-host'));
}

// ── 左栏 ① 未分组行（置顶；写口未变） ──────────────────────────
function _ungroupedRailRowHtml(ungrouped, canManage) {
  if (!ungrouped.length) return '';
  const canAssign = canManage && groupOptions().length > 0;
  return `
    <div class="shrink-0 w-[236px] lg:w-auto rounded-lg border border-dashed border-[var(--neutral-200)] bg-[var(--neutral-50)] px-2.5 py-2">
      <div class="flex items-center justify-between gap-2">
        <span class="text-sm font-semibold text-gray-800">未分组 <span class="text-xs text-gray-500 font-normal">${ungrouped.length} 人</span></span>
        ${canAssign
          ? `<button type="button" class="gp-ungrouped-toggle btn-outline btn-sm" aria-controls="gp-ungrouped-panel">${_ungroupedOpen ? '收起' : '归组'}</button>`
          : '<span class="text-xs text-gray-500">只读</span>'}
      </div>
    </div>`;
}

/** 未分组归组面板（展开才渲染；逐人下拉＝既有唯一写口 assignMemberToGroup） */
function _ungroupedPanelHtml(ungrouped, canManage) {
  if (!_ungroupedOpen || !ungrouped.length) return '';
  const options = groupOptions();
  // 2026-11-02 批次 526（审计 C3）：API 形态下成员档案写口由服务端限定 org-commissioner，
  //   支书在党小组页归组会被 403 ⇒ 按实际能力隐藏 select，改为明确指引，避免死入口。
  //   mock 形态无服务端写门，保留就地归组。
  const canAssign = canManage && options.length > 0 && (!isApiMode() || _me().role === 'org-commissioner');
  if (!options.length) {
    return `<div class="mt-2.5">${emptyStateHtml({ variant: 'inline', text: '支部暂无在册党小组 · 下一步：先新增党小组再归组' })}</div>`;
  }
  return `
    <div class="mt-2.5 pt-2.5 border-t border-gray-100">
      <p class="text-xs text-gray-500 mb-2">${canAssign
        ? '逐个选择所属党小组即完成归组；选择「移出党小组」保持未分组。'
        : '归组需组织委员权限：请在「组织台 · 成员名册」办理（当前为只读查看）。'}</p>
      <div class="flex flex-col gap-1.5">
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
    <div class="flex items-center gap-2">
      <a href="${getBasePath()}person.html?id=${encodeURIComponent(p.id)}" class="text-xs text-gray-800 min-w-0 truncate hover:text-[var(--app-accent-soft-text)] transition-colors" title="查看完整档案">${esc(p.name || getPersonName(p.id))}</a>
      ${control}
    </div>`;
}

// ── 左栏 ② 党小组选择器（管理写口：行尾「管理」内 改名 / 解散） ──
function _groupRailHtml(rows, selected, ungrouped, entities, canManage, issues, leaderAssign) {
  const dissolved = entities.filter(e => e.status !== 'active');
  return `
    <aside class="card rounded-xl p-3 card--static min-w-0" aria-labelledby="gp-groups-title">
      ${renderCardHeader({ title: '党小组', titleId: 'gp-groups-title', meta: `${rows.length} 个在册` })}
      <div class="gp-group-list mt-2.5 flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:gap-1.5 lg:overflow-visible lg:pb-0">
        ${_ungroupedRailRowHtml(ungrouped, canManage)}
        ${rows.length
          ? rows.map(r => _manageRowHtml(r, selected, issues, leaderAssign, canManage)).join('')
          : `<div class="shrink-0">${emptyStateHtml({ variant: 'inline', text: '支部暂无在册党小组 · 先「新建党小组」' })}</div>`}
      </div>
      <div id="gp-ungrouped-panel">${_ungroupedPanelHtml(ungrouped, canManage)}</div>
      <div class="mt-2.5 pt-2.5 border-t border-gray-100 flex items-center justify-between gap-2">
        <span class="text-xs text-gray-500 min-w-0 truncate"${dissolved.length ? ` title="已解散：${esc(dissolved.map(e => e.name).join('、'))}"` : ''}>${dissolved.length
          ? `已解散：${esc(dissolved.map(e => e.name).join('、'))}`
          : (canManage ? '支书 / 副支书可管理' : '只读查看')}</span>
        ${canManage ? '<button type="button" class="btn-accent gp-add-group btn-sm shrink-0">+ 新建党小组</button>' : ''}
      </div>
    </aside>`;
}

/** 单个组行：选中按钮（组名 / 组长 / 党员·成员 / 待答复徽标）＋ 行尾「管理」（改名 / 解散）。
 *  设 / 改组长在右栏头部（选中组即当前组），行内仍保留改名 / 解散两条写口。 */
function _manageRowHtml(row, selected, issues, leaderAssign, canManage) {
  const g = row.group;
  const isActive = !!selected && row.name === selected.name;
  const openCount = _issuesLoaded ? countOpenReportsByGroup(issues, g) : null;
  const leaderIds = _groupLeaderIdsOf(leaderAssign, row.name);
  const leaderText = leaderIds.length
    ? leaderIds.map(id => esc(getPersonName(id))).join('、')
    : '<span class="text-gray-500">未设置</span>';
  // 边线色随选中态变（内联只引令牌，不新增 hex）；`border` 与 `border-color` 同串，SD-2 可静态回读
  const borderColor = isActive ? 'var(--app-accent-soft-border)' : 'var(--neutral-100)';
  const stateCls = isActive
    ? 'bg-[var(--app-accent-soft-bg)]'
    : 'bg-white hover:bg-[var(--surface-hover)]';
  return `
    <div class="gp-group-row flex items-start gap-1 shrink-0 w-[236px] lg:w-auto">
      <button type="button" class="gp-group-card flex-1 min-w-0 text-left rounded-lg border px-2.5 py-2 transition-colors ${stateCls}"
        style="border-color:${borderColor};"
        data-group="${esc(row.name)}" aria-pressed="${isActive ? 'true' : 'false'}">
        <span class="flex items-center justify-between gap-2">
          <span class="text-sm font-semibold text-gray-800 truncate">${esc(row.name)}</span>
          <span class="gp-open-badge text-xs px-1.5 py-0.5 rounded-full shrink-0 ${openCount ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'}">
            ${openCount === null ? '…' : `待答复 ${openCount}`}
          </span>
        </span>
        <span class="block text-xs text-gray-500 mt-1 truncate">组长：${leaderText}</span>
        <span class="block text-xs text-gray-500 mt-0.5">党员 ${g.partyCount} 人 · 成员 ${g.memberCount} 人</span>
      </button>
      ${canManage
        ? `<details class="row-more">
            <summary class="btn-outline btn-sm">管理</summary>
            <div class="row-more__menu" role="menu">
              <button type="button" role="menuitem" class="gp-rename btn-outline btn-sm" data-id="${esc(row.id)}">改名</button>
              <button type="button" role="menuitem" class="gp-dissolve btn-danger btn-sm" data-id="${esc(row.id)}">解散</button>
            </div>
          </details>`
        : ''}
    </div>`;
}

/** 组长 / 副组长行内展示（同列双身份；副组长 0..N 人）＋ 行内撤销入口（仅运行时赋权有 recordId）。 */
function _leaderChipsHtml(assign, groupName, canManage) {
  const leaders = (assign && assign.leaders) || [];
  const deputies = (assign && assign.deputies) || [];
  const chips = (persons) => persons.length
    ? persons.map(p => `<span class="inline-flex items-center gap-1 min-w-0">
        <a href="${getBasePath()}person.html?id=${encodeURIComponent(p.personId)}" class="text-xs text-gray-800 min-w-0 truncate hover:text-[var(--app-accent-soft-text)] transition-colors" title="查看完整档案">${esc(getPersonName(p.personId))}</a>
        ${canManage && p.recordId ? `<button type="button" class="gp-revoke-leader btn-danger btn-sm" data-record-id="${esc(p.recordId)}" data-group="${esc(groupName)}" title="撤销该赋权（回落普通成员）">撤销</button>` : ''}
      </span>`).join('、')
    : '<span class="text-xs text-gray-500">未设</span>';
  return `
    <span class="flex items-center gap-x-1.5 gap-y-1 flex-wrap min-w-0">
      <span class="text-xs text-gray-500 shrink-0 whitespace-nowrap">组长</span>${chips(leaders)}
      <span class="text-xs text-gray-300 shrink-0">·</span>
      <span class="text-xs text-gray-500 shrink-0 whitespace-nowrap">副组长</span>${chips(deputies)}
    </span>`;
}

/** 各党小组「组长 / 副组长」名单（档案派生 ＋ 审计赋权叠加）——
 *  判据单一源：档案侧＝`group-view.js::groupLeadershipOf`（与 listPartyGroups 同分组口径）；
 *  审计侧＝`AuthStore.getAuthorizations()`（`role ∈ {leader, deputy-leader}`，按 (人,角色,组) 取最新一条、
 *  排除 revoke）——**授权只写审计快照、不改成员档案**（`auth.js::authorize` 注释），故须两源合并才完整。
 *  @returns {Map<string, {leaders:Array<{personId,recordId}>, deputies:Array<{personId,recordId}>}>} */
function _leaderAssignMap(branchId) {
  const map = new Map();
  const push = (groupName, key, personId, recordId) => {
    if (!map.has(groupName)) map.set(groupName, { leaders: [], deputies: [] });
    const arr = map.get(groupName)[key];
    if (arr.some(x => x.personId === personId)) return;
    arr.push({ personId, recordId });
  };
  for (const e of groupLeadershipOf({ members: PersonStore.getMembers(), branchId }).values()) {
    e.leaderIds.forEach(id => push(e.groupName, 'leaders', id, null));
    e.deputyLeaderIds.forEach(id => push(e.groupName, 'deputies', id, null));
  }
  const latest = new Map(); // `${personId}|${role}|${group}` → 最新一条（数组顺序即时间序）
  for (const r of AuthStore.getAuthorizations()) {
    if ((r.role === 'leader' || r.role === 'deputy-leader') && r.scopeRef) {
      latest.set(`${r.targetPersonId}|${r.role}|${r.scopeRef}`, r);
    }
  }
  for (const r of latest.values()) {
    if (r.action === 'revoke') continue;
    push(r.scopeRef, r.role === 'leader' ? 'leaders' : 'deputies', r.targetPersonId, r.id);
  }
  return map;
}

/**
 * A06：本组组长 id 列表（**唯一 helper**，卡片 / 「请组长关注」/ 汇报提示共用）。
 * 判据与清单行完全一致：档案 role（groupLeadershipOf）＋ 审计赋权（AuthStore.getAuthorizations）
 * 两源合并后的 `_leaderAssignMap`；组长优先，组内无组长时才回落副组长（同 group-view 口径）。
 */
function _groupLeaderIdsOf(leaderAssign, groupName) {
  const row = leaderAssign && leaderAssign.get(groupName);
  const leaders = ((row && row.leaders) || []).map((x) => x.personId);
  if (leaders.length) return leaders;
  return ((row && row.deputies) || []).map((x) => x.personId);
}

// ── 右栏 ③ 组详情（头部 → 活动台账 → 组员汇报 → 变更记录） ──────
function _groupDetailHtml(group, groupId, canManage, members, branchId, activities, reviews, attRecords, history, leaderAssign) {
  const assign = leaderAssign.get(group.groupName);
  const hasLeader = _groupLeaderIdsOf(leaderAssign, group.groupName).length > 0;
  const leaderLine = assign ? _leaderChipsHtml(assign, group.groupName, canManage) : '<span class="text-xs text-gray-500">未设置</span>';
  return `
    <div class="card rounded-xl p-4 card--static min-w-0" id="gp-detail">
      <div class="flex items-start justify-between gap-3 pb-3 border-b border-gray-100">
        <div class="min-w-0">
          <h3 class="font-title-cn text-base font-semibold text-gray-800 truncate" id="gp-detail-title">${esc(group.groupName)}</h3>
          <div class="flex items-center gap-x-2 gap-y-1 flex-wrap mt-1">
            ${leaderLine}
            <span class="text-xs text-gray-500">党员 ${group.partyCount} 人 · 成员 ${group.memberCount} 人</span>
          </div>
        </div>
        <div class="flex items-center gap-1.5 shrink-0">
          ${canManage
            ? `<button type="button" class="gp-assign-leader btn-accent-soft btn-sm" data-group="${esc(group.groupName)}" title="设 / 改本组组长或副组长">设 / 改组长</button>
              <details class="row-more">
                <summary class="btn-outline btn-sm">管理</summary>
                <div class="row-more__menu" role="menu">
                  <button type="button" role="menuitem" class="gp-rename btn-outline btn-sm" data-id="${esc(groupId)}">改名</button>
                  <button type="button" role="menuitem" class="gp-dissolve btn-danger btn-sm" data-id="${esc(groupId)}">解散</button>
                </div>
              </details>`
            : '<span class="text-xs text-gray-500">只读</span>'}
        </div>
      </div>
      <div id="gp-leader-assign-host"></div>
      ${_ledgerSectionHtml(group, members, branchId, activities, reviews, attRecords)}
      ${_reportsSectionHtml(hasLeader)}
      ${_historySectionHtml(history)}
    </div>`;
}

/** 右栏空态（支部尚无在册党小组时） */
function _noGroupHintHtml() {
  return `
    <div class="card rounded-xl p-5 card--static min-w-0" id="gp-detail">
      ${emptyStateHtml({ variant: 'panel', text: '支部暂无党小组 · 下一步：在左栏「+ 新建党小组」建立第一组' })}
    </div>`;
}

// ── ④ 活动台账（合并原「复盘状态」＋「活动与考勤」：同一活动只出现一行） ──
function _ledgerSectionHtml(group, members, branchId, activities, reviews, attRecords) {
  const groupActs = groupActivitiesOf(activities, members, group.groupName); // date 降序
  const revMap = new Map();
  (reviews || []).forEach(r => { if (r && r.activityId) revMap.set(r.activityId, r); });
  const shown = _ledgerAll ? groupActs : groupActs.slice(0, 6);
  const today = todayLocal();
  const rows = shown.length
    ? shown.map(a => _ledgerRowHtml(a, revMap.get(a.id) || null, group, branchId, attRecords, today)).join('')
    : emptyStateHtml({ variant: 'table', text: '暂无本组活动（组织者属本组时出现在此）', colspan: 4 });
  return `
    <div class="pt-3">
      <div class="flex items-center justify-between gap-2 mb-2">
        <h4 class="font-title-cn text-sm font-bold text-gray-700">活动台账</h4>
        <span class="text-xs text-gray-500">${groupActs.length} 场 · 按日期降序</span>
      </div>
      <table class="data-table" data-responsive="cards">
        <thead>
          <tr>
            <th scope="col">日期</th>
            <th scope="col">活动</th>
            <th scope="col">复盘状态</th>
            <th scope="col">应到 · 实到</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      ${groupActs.length > 6
        ? `<div class="mt-2">
            <button type="button" class="gp-ledger-more btn-outline btn-sm">${_ledgerAll ? '收起' : `查看全部（${groupActs.length}）`}</button>
          </div>`
        : ''}
      <p class="help-note" style="margin-top:10px;"><a href="./help.html#card-copy-party-group" class="help-note__link">见帮助 · 党小组与组长</a> · <a href="./help.html#card-copy-review-submit" class="help-note__link">活动复盘</a></p>
    </div>`;
}

function _ledgerRowHtml(act, rev, group, branchId, attRecords, today) {
  const href = `./${objectDetailHref('activity', act.id, { entry: 'workspace-aggregate' })}`;
  return `
    <tr>
      <td data-label="日期" class="text-gray-500 whitespace-nowrap">${esc(act.date || '')}</td>
      <td data-label="活动">
        <span class="inline-flex items-center gap-2 min-w-0 max-w-full">
          ${badgeHtml(esc(act.type || '活动'), activityTypeBadgeVariant(act.type))}
          <a href="${href}" class="text-gray-800 min-w-0 truncate hover:text-[var(--app-accent-soft-text)] transition-colors" title="查看活动详情">${esc(act.title || '未命名')}</a>
        </span>
      </td>
      <td data-label="复盘状态">${_reviewStatusCellHtml(act, rev)}</td>
      <td data-label="应到·实到" class="whitespace-nowrap">${_attendanceCellHtml(act, group, branchId, attRecords, today)}</td>
    </tr>`;
}

/** 复盘状态格：状态徽标；已复盘可原地展开复盘详情（沿用既有 `_reviewDetailHtml`，不新增口径） */
function _reviewStatusCellHtml(act, rev) {
  const status = rev?.reviewStatus || ReviewStatus.NOT_SUBMITTED;
  const label = REVIEW_STATUS_LABELS[status] || '未提交';
  const cls = GROUP_REVIEW_COLOR[status] || 'bg-gray-100 text-gray-600';
  const badge = `<span class="text-xs px-1.5 py-0.5 rounded-full ${cls} shrink-0">${esc(label)}${status === ReviewStatus.REJECTED ? ' · 需修改' : ''}</span>`;
  const expandable = !!rev && status !== ReviewStatus.NOT_SUBMITTED && status !== ReviewStatus.REJECTED;
  if (!expandable) return badge;
  const isExpanded = _expandedReviewId === act.id;
  return `
    <details class="gp-review-item gp-review-toggle" data-act-id="${esc(act.id)}"${isExpanded ? ' open' : ''}>
      <summary class="inline-flex items-center gap-1.5">
        ${badge}<span class="text-xs text-gray-500">${isExpanded ? '收起' : '详情'}</span>
      </summary>
      ${isExpanded ? _reviewDetailHtml(rev) : ''}
    </details>`;
}

/** 应到·实到：仅「党小组会」有；其余活动为「—」。口径同既有（roster 组口径应到 + attendance 实到） */
function _attendanceCellHtml(act, group, branchId, attRecords, today) {
  if (act.type !== '党小组会' || !act.date || act.date > today) return '<span class="text-xs text-gray-500">—</span>';
  const expected = getMeetingRosterIds({ type: '党小组会', groupId: group.groupName, branchId }).length;
  const recs = (attRecords || []).filter(r => r.activityId === act.id);
  if (!recs.length) return `<span class="text-xs text-gray-500 tabular-nums">应到 ${expected} · 实到 —</span>`;
  const present = recs.filter(r => r.status === AttendanceStatus.PRESENT || r.status === AttendanceStatus.MADE_UP).length;
  return `<span class="text-xs text-gray-600 tabular-nums">应到 ${expected} · 实到 ${present}</span>`;
}

// ── ⑤ 组员汇报（待答复；汇报区首拉异步填充后增量刷新） ───────────
function _reportsSectionHtml(hasLeader) {
  // 已载：空宿主交由统一检索引擎渲染；未载：轻量加载行占位
  const inner = _issuesLoaded ? '' : _reportsLoadingHtml();
  const leaderNote = hasLeader ? '' : '<span class="text-xs text-gray-500">（本组暂无组长，「请组长关注」不可用）</span>';
  return `
    <div class="pt-3 mt-3 border-t border-gray-100">
      <div class="flex items-center justify-between gap-2 mb-1">
        <h4 class="font-title-cn text-sm font-bold text-gray-700">组员汇报（待答复）</h4>
      </div>
      <p class="text-xs text-gray-500 mb-2.5">对待答复行可「请组长关注」。 ${leaderNote}</p>
      <div id="gp-reports" class="space-y-1.5">${inner}</div>
    </div>`;
}

function _reportsLoadingHtml() {
  return `
    <div class="flex items-center gap-1.5 text-xs rounded-lg bg-gray-100 px-3 py-1.5 w-fit" style="color:var(--neutral-400);">
      <span class="inline-block w-3 h-3 rounded-full animate-spin" style="border:2px solid var(--neutral-200);border-top-color:var(--neutral-400);"></span>
      加载汇报…
    </div>`;
}

/** 汇报加载失败：可见错误 ＋ 重试（不静默置空） */
function _renderReportsError(container) {
  const listEl = container.querySelector('#gp-reports');
  if (!listEl) return;
  listEl.innerHTML = `
    <div class="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-amber-50 border border-amber-100">
      <span class="text-xs text-amber-800">组员汇报加载失败</span>
      <button type="button" class="gp-reports-retry btn-outline btn-sm">重试</button>
    </div>`;
}

/** 重试汇报加载（先还原加载行，再走同一 _fillReports 通道） */
async function _onReportsRetry(container) {
  const listEl = container.querySelector('#gp-reports');
  if (listEl) listEl.innerHTML = _reportsLoadingHtml();
  const members = PersonStore.getMembers();
  const group = listPartyGroups({ members, branchId: _branchId() })
    .find(x => x.groupName === _selectedGroup);
  if (group) await _fillReports(container, group, members);
}

// 组员相关汇报行集合 / 行状态 / 色点 —— 2026-10-04 批次 373 判据**上移** `services/member/group-view.js`
//   （`groupReportRowsOf` / `reportRowStateOf` / `REPORT_DOT_COLOR`）⇒ 支书台「跨组进展」与组长台「其他组」复用同一份。

/** 汇报行是否可「请组长关注」（组长存在 + open + 非组长自身发起 + 组长尚未答复） */
function _canAskLeader(issue, leaderIds) {
  if (!leaderIds.length || issue.status !== 'open' || leaderIds.includes(issue.submittedBy)) return false;
  return !(issue.comments || []).some(c => !c.hidden && c.kind === 'reply' && c.authorRole === 'leader');
}

/** 组员汇报（待答复）列表（统一检索引擎：关键词 + 分面；每组 ≤8 行 → 引擎自动不渲染检索条） */
function _renderReportsList(hostEl, group, allIssues, leaderAssign) {
  if (!hostEl) return;
  const leaderIds = _groupLeaderIdsOf(leaderAssign, group.groupName);
  renderFilteredList(hostEl, {
    stateKey: `secretary-group-progress-reports-${group.groupName}`,
    rows: groupReportRowsOf(allIssues, group),
    keyword: personKeyword(),
    facets: personFacets({ roleLabel: roleLabelOf }),
    countUnit: '人',
    listClass: 'space-y-1.5',
    emptyMessage: '暂无本组组员汇报，组员汇报答复在组长台完成',
    rowHtml: (r) => {
      const st = reportRowStateOf(r);
      const submitterName = getPersonName(r.submittedBy) || '匿名';
      const askBtn = _canAskLeader(r, leaderIds)
        ? `<button type="button" class="btn-accent-soft btn-sm gp-ask-leader shrink-0"
             data-note="${esc(`本组组员汇报待跟进：${submitterName} · ${r.title}`)}">请组长关注</button>`
        : '';
      return `
      <div class="flex items-center gap-2.5 px-3 py-2 rounded-lg">
        ${_reportDot(r)}
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-2 min-w-0">
            <a href="${getBasePath()}person.html?id=${encodeURIComponent(r.submittedBy)}" class="text-sm font-medium text-gray-800 shrink-0 hover:text-[var(--app-accent-soft-text)] transition-colors" title="查看完整档案">${esc(submitterName)}</a>
            <span class="text-xs text-gray-600 flex-1 min-w-0 truncate">${esc(r.title)}</span>
          </div>
          <div class="text-xs text-gray-500">${esc(r.submittedAt || '')}${r.requestedBy ? ' · ' + esc(getPersonName(r.requestedBy)) + ' 请汇报' : ''}</div>
        </div>
        <span class="text-xs px-1.5 py-0.5 rounded-full ${st.cls} shrink-0">${st.label}</span>
        ${askBtn}
      </div>`;
    },
  });
}

/** 类别色点（progress/blocked/ask，同汇报收件箱）——**留本文件**（色值为既有硬编码存量，随本文件在 `hex-hardcode-guard` 基线内；
 *  `group-view.js` 属纯逻辑域、**不引入色值**）。 */
function _reportDot(issue) {
  const color = issue.reportCategory === 'blocked' ? '#EF4444'
    : issue.reportCategory === 'ask' ? '#F59E0B' : '#16A34A';
  return `<span class="w-2 h-2 rounded-full flex-shrink-0 mt-1.5" style="background:${color};"></span>`;
}

/** issues 首拉/增量刷新：组徽标 + 汇报行（幂等；DOM 已同步渲染则内容相同）。
 *  失败不静默置空：汇报宿主给出可见错误 ＋ 重试（2026-10-19 Task 3）。 */
async function _fillReports(container, group, members) {
  const groupName = group.groupName;
  let issues;
  try {
    await IssueStore.loadAll();
    issues = IssueStore.getAll();
  } catch (_) {
    _renderReportsError(container);
    return;
  }
  if (_selectedGroup !== groupName) return; // 异步返回时组已切换：不覆盖当前组
  _issuesLoaded = true;
  const branchId = _branchId();
  const groups = listPartyGroups({ members, branchId });
  const curGroup = groups.find(x => x.groupName === groupName) || group;

  container.querySelectorAll('.gp-open-badge').forEach(badge => {
    const gName = badge.closest('.gp-group-card')?.dataset.group;
    const g = groups.find(x => x.groupName === gName);
    const n = g ? countOpenReportsByGroup(issues, g) : 0;
    badge.textContent = `待答复 ${n}`;
    badge.className = `gp-open-badge text-xs px-1.5 py-0.5 rounded-full ${n ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'}`;
  });

  const listEl = container.querySelector('#gp-reports');
  if (!listEl) return;
  _renderReportsList(listEl, curGroup, issues, _leaderAssignMap(branchId));
}

// ── ⑥ 变更记录（右栏底部文字链接，原地展开） ──────────────────
function _historySectionHtml(history) {
  const rows = history.slice(0, 10);
  return `
    <div class="pt-3 mt-3 border-t border-gray-100">
      <details class="gp-history" id="gp-history"${_historyOpen ? ' open' : ''}>
        <summary class="gp-history-toggle text-xs text-gray-500 hover:text-[var(--app-accent-soft-text)] transition-colors" id="gp-history-toggle">变更记录（${history.length}）</summary>
        <div class="mt-2 divide-y divide-gray-50">
          ${rows.length
            ? rows.map(_historyRowHtml).join('')
            : `<div class="py-1.5">${emptyStateHtml({ variant: 'inline', text: '暂无组级变更' })}</div>`}
        </div>
      </details>
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

/** 已复盘展开详情（只读：复盘正文/提出的真问题/纪检批注/时间） */
function _reviewDetailHtml(rev) {
  const issues = Array.isArray(rev.issues) ? rev.issues : [];
  return `
    <div class="mt-3 pt-3 border-t border-gray-100">
      <div class="text-xs text-gray-600 p-2 bg-gray-50 rounded-lg border border-gray-100 whitespace-pre-wrap">${esc(rev.reviewContent || '')}</div>
      ${issues.length ? `<div class="mt-2 p-2 rounded-lg border border-amber-100 bg-amber-50">
        <div class="text-xs text-amber-700 font-bold mb-1">提出的真问题（${issues.length}）</div>
        <ul class="space-y-0.5">${issues.map(i => `<li class="text-xs text-amber-700">· ${esc(i)}</li>`).join('')}</ul>
      </div>` : ''}
      ${rev.submittedAt ? `<div class="text-xs text-gray-500 mt-1">提交时间：${esc(String(rev.submittedAt).slice(0, 16).replace('T', ' '))}</div>` : ''}
      ${rev.annotation ? `
        <div class="mt-2 p-2 rounded-lg bg-blue-50 border border-blue-100">
          <div class="text-xs text-blue-500 font-bold mb-1">纪检委员批注</div>
          <div class="text-xs text-blue-700 whitespace-pre-wrap">${esc(rev.annotation)}</div>
        </div>` : ''}
    </div>`;
}

// ════════════════════════════════════════════════════════════════
//  事件（元素级：组切换 / 台账展开 / 复盘展开；容器级委托：归组下拉 / 管理动作 / 请组长关注）
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

  // 变更记录 / 未分组归组 / 台账全部（原生 details / 状态镜像后重渲染）
  container.querySelector('#gp-history')?.addEventListener('toggle', (e) => {
    _historyOpen = e.target.open;
    _renderAll(container);
  });

  // 已复盘行展开/收起（只读 · 原生 details）：状态同步到 `_expandedReviewId` 后局部重渲染
  container.querySelectorAll('.gp-review-toggle').forEach(toggle => {
    toggle.addEventListener('toggle', () => {
      const actId = toggle.closest('.gp-review-item')?.dataset.actId;
      _expandedReviewId = toggle.open ? actId : null;
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
    // 行尾「更多」/「管理」（原生 details）：点击其它区域 / 菜单项时收起
    const clickedMore = e.target.closest('.row-more');
    container.querySelectorAll('.row-more[open]').forEach(d => {
      if (d !== clickedMore || e.target.closest('.row-more__menu')) d.removeAttribute('open');
    });
    const retry = e.target.closest('.gp-reports-retry');
    if (retry) { _onReportsRetry(container); return; }
    const ask = e.target.closest('.gp-ask-leader');
    if (ask) { _onAskLeader(container, ask); return; }
    // 组长 / 副组长：「设 / 改」开同一面板（右栏头部 / 行内共用）
    const assignBtn = e.target.closest('.gp-assign-leader');
    if (assignBtn) { openLeaderAssignPanel({ groupName: assignBtn.dataset.group }); return; }
    // 组长 / 副组长：行内「撤销」直接回收审计赋权记录（支书圈甲）
    const revokeBtn = e.target.closest('.gp-revoke-leader');
    if (revokeBtn) { _onRevokeLeader(container, revokeBtn); return; }
    if (e.target.closest('.gp-add-group')) { _openAddGroupModal(container); return; }
    const ren = e.target.closest('.gp-rename');
    if (ren) { _openRenameModal(container, ren.dataset.id); return; }
    const dis = e.target.closest('.gp-dissolve');
    if (dis) { _openDissolveModal(container, dis.dataset.id); return; }
    if (e.target.closest('.gp-ungrouped-toggle')) {
      _ungroupedOpen = !_ungroupedOpen;
      _renderAll(container);
      return;
    }
    if (e.target.closest('.gp-ledger-more')) {
      _ledgerAll = !_ledgerAll;
      _renderAll(container);
    }
  });

  // Esc 收起行尾「管理」菜单（原生 details 不自行关闭）
  container.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    container.querySelectorAll('.row-more[open]').forEach(d => d.removeAttribute('open'));
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
  // A06：组长判据与行 / 卡同源（档案 role ＋ 审计赋权两源合并）
  const leaderIds = group ? _groupLeaderIdsOf(_leaderAssignMap(branchId), group.groupName) : [];
  if (!group || !leaderIds.length) { showToast('error', '该组暂无组长，无法发起'); return; }
  IssueStore.requestReport(leaderIds[0], 'leader', note);
  showToast('success', `已请组长「${getPersonName(leaderIds[0])}」关注本组进展`);
  _fillReports(container, group, PersonStore.getMembers()); // 刷新徽标/行
}

/** 行内撤销组长 / 副组长赋权（2026-10-04 批次 373 · 支书圈甲「行内撤销」）——
 *  写口单一源＝`AuthStore.revokeAuthorization(recordId)`（只回收审计赋权记录；档案预设无撤销入口）。 */
async function _onRevokeLeader(container, btn) {
  const recordId = btn.dataset.recordId;
  if (!recordId) return;
  const ok = await AuthStore.revokeAuthorization(recordId);
  if (!ok) { showToast('error', '撤销失败'); return; }
  showToast('success', '已撤销该党小组组长 / 副组长赋权');
  _renderAll(container);
}

// ── 管理动作（新增 / 改名 / 解散；权限门 = canManagePartyGroups 单一源） ──

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
        <p class="text-xs text-gray-500">同一支部内活组组名不得重复；成立后可在左栏行尾「管理」改名，成员在左栏「未分组」一行逐个归组。</p>
      </div>`,
    footerHtml: `
      <button type="button" id="gp-add-cancel" class="btn-outline text-sm px-4 py-1.5" style="cursor:pointer;">取消</button>
      <button type="button" id="gp-add-confirm" class="btn-accent text-sm px-4 py-1.5 font-medium">新增</button>`,
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
      </div>`,
    footerHtml: `
      <button type="button" id="gp-rename-cancel" class="btn-outline text-sm px-4 py-1.5" style="cursor:pointer;">取消</button>
      <button type="button" id="gp-rename-confirm" class="btn-accent text-sm px-4 py-1.5 font-medium">保存</button>`,
    onMount: (panel) => {
      panel.querySelector('#gp-rename-cancel')?.addEventListener('click', () => closeModal('gp-rename'));
      panel.querySelector('#gp-rename-confirm')?.addEventListener('click', async () => {
        const name = panel.querySelector('#gp-rename-name')?.value?.trim() || '';
        if (!name) { showToast('error', '组名不能为空'); return; }
        const me = _me();
        const r = await renameGroup(id, name, { by: me.personId, role: me.role });
        if (!r || r.ok === false) { showToast('error', (r && r.reason) || '改组失败'); return; }
        closeModal('gp-rename');
        if (_selectedGroup === g.name) _selectedGroup = name; // 右栏跟随新组名
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
      <p class="text-xs text-gray-500 mt-2">组内 ${n} 人将转为「未分组」，可在左栏「未分组」一行再逐个归入其它党小组；该组留痕保留，解散后不再出现在任何下拉与统计中。不可恢复：如需恢复，只能重新建组并归组。</p>
      <div class="mt-3">
        <label class="text-xs text-gray-500 mb-1.5 block font-medium" for="gp-dissolve-note">解散原因（可空）</label>
        <input type="text" id="gp-dissolve-note" class="input-flat w-full" placeholder="如：并入其它党小组 / 成员重新分组">
      </div>`,
    footerHtml: `
      <button type="button" id="gp-dissolve-cancel" class="btn-outline text-sm px-4 py-1.5" style="cursor:pointer;">取消</button>
      <button type="button" id="gp-dissolve-confirm" class="btn-danger-solid text-sm px-4 py-1.5">确认解散</button>`,
    onMount: (panel) => {
      panel.querySelector('#gp-dissolve-cancel')?.addEventListener('click', () => closeModal('gp-dissolve'));
      panel.querySelector('#gp-dissolve-confirm')?.addEventListener('click', async () => {
        const note = panel.querySelector('#gp-dissolve-note')?.value?.trim() || '';
        const me = _me();
        const r = await dissolveGroup(id, { by: me.personId, role: me.role, note });
        if (!r || r.ok === false) { showToast('error', (r && r.reason) || '解散失败'); return; }
        closeModal('gp-dissolve');
        if (_selectedGroup === g.name) _selectedGroup = null; // 右栏回退首组
        showToast('success', `已解散「${g.name}」，${r.movedCount} 名成员转为未分组`);
        _renderAll(container);
      });
    },
  });
}

// ════════════════════════════════════════════════════════════════
//  本台「写入活动」入口（**不新造表单**）
// ════════════════════════════════════════════════════════════════
// 沿革：2026-09-25 支书裁「按『党小组与活动』这个名落地」时曾收编「党小组活动」分区于此
//   （判据＝活动 `direction === 'bottom-up'`）；**2026-10-04 批次 373 按对象归位**——该分区与「项目赋权」
//   整卡**迁「活动管理」页**（`calendar-tab.js`，判据与渲染随迁），本页只留「组」。
// 本函数仅保留「写入活动」入口供**今日页**（`secretary-workspace.js::onCreateActivity`）等既有消费方复用。
// ⚠ 2026-10-01 批次 317（支书 V-3「功能钮提台顶栏全局固定位」）：按钮 `#ws-sec-write-btn` 已由
//   「活动管理 tab 的日历卡头部」**提到顶栏** ⇒ 本函数**不再需要「切 tab ＋ 轮询等按钮出现」**
//   （原实现即为此），直接点既有按钮即可；选择器一字未改，台账 / 真机守卫照旧命中。
export function openActivityWriteEntry() {
  const topBtn = document.getElementById('ws-sec-write-btn');
  if (topBtn) { topBtn.click(); return; }
  // 顶栏未挂出（只读形态 / 顶栏尚未渲染）时不得静默无效：直接打开既有写入表单（单一写入口）。
  import('./calendar-tab.js?v=20261102b')
    .then((m) => m.openActivityWriteForm())
    .catch((err) => console.warn('[group-progress] 打开写入活动表单失败：', err));
}
