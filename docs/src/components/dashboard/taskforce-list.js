// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  dashboard/taskforce-list.js — 首页「工作组进展」卡（2026-10-18 重组）
//  职责单一：读 mockDB.workgroups / workgroupMembers / workgroupTasks，
//  按「活动工作组」「专班工作组」两类分组，各取前 3 条渲染为统一列表行。
//  单一源关系：
//   · 数据 = core/domain/domain.js 的 mockDB（hydrate 后与当前数据源同步，不新增接口）；
//   · 行结构 = components/ui/list-row.js 的 listRowHtml / listGroupHtml（分隔线由 .list-group 出）；
//     行型为导航行（rowType: 'nav'），状态以行尾 .state-badge 呈现（运行中 success / 招募中 info）；
//   · 样式 = docs/src/styles.css 的 .list-row / .list-group / .state-badge 段与间距令牌。
//  口径：仅取 status 为 active / recruiting 的工作组；成员数＝status !== 'removed' 的成员行；
//  任务完成数＝completed 数 / 非 cancelled 任务总数，无任务显示「—」；两类皆空则整卡隐藏。
// ════════════════════════════════════════════════════════════════

import { mockDB, isTaskforceActiveStatus } from '../../core/domain/domain.js?v=20261021b';
import { listRowHtml, listGroupHtml } from '../ui/list-row.js?v=20261021b';
import { AuthStore } from '../../services/core/auth.js?v=20261021b';
import { getBasePath } from '../../core/base/utils.js?v=20261021b';

const GROUP_LIMIT = 3;
const STATUS_BADGE = {
  active: { label: '运行中', tone: 'success' },
  recruiting: { label: '招募中', tone: 'info' },
};

// 「查看全部」按两类分组分别落地（2026-10-19）：
//   首页卡同时列「活动工作组」「专班工作组」，单一入口无法覆盖两类——
//   活动段落该台活动日历 / 活动动态；专班段落知情查看 / 专班管理 / 专班动态。
//   角色→页面单一源与首页既有入口同口径；未登录按普通成员页（工作台门控会转登录）。
const ROLE_PAGE = {
  secretary: 'secretary.html',
  'deputy-secretary': 'secretary.html',
  'org-commissioner': 'org.html',
  'prop-commissioner': 'prop.html',
  'disc-commissioner': 'disc.html',
  leader: 'leader.html',
  participant: 'visitor.html',
  'party-staff': 'party-committee.html',
};
const ACTIVITY_TAB = {
  secretary: 'calendar',
  'deputy-secretary': 'calendar',
  'org-commissioner': 'calendar',
  'prop-commissioner': 'calendar',
  'disc-commissioner': 'calendar',
  leader: 'calendar',
  participant: 'activities',
  // 2026-10-20 批次 489：党委台无活动日历页签，活动工作组「查看全部」落支部管理（汇总面）。
  'party-staff': 'branches',
};
// 2026-10-20 批次 489（IA-A01/A03 裁定）：纪检/组长台已不再用「知情查看」承载专班
//   ⇒ 专班「查看全部」改落专班详情页（见 TASKFORCE_HREF）。
// R2-45（2026-10-20）：原表内的 disc/leader → `tf-view` 两键是**死映射**（两台已无该页签，
//   且 TASKFORCE_HREF 抢先覆盖），直接删除，避免后续以为是有效落点。
const TASKFORCE_HREF = {
  'disc-commissioner': 'taskforce.html',
  leader: 'taskforce.html',
};
const TASKFORCE_TAB = {
  secretary: 'tf-view',
  'deputy-secretary': 'tf-view',
  'org-commissioner': 'taskforce',
  'prop-commissioner': 'kanban',
  participant: 'tf-view',
  // 2026-10-20 批次 489：党委台无专班页签，专班工作组「查看全部」落支部管理（汇总面）。
  'party-staff': 'branches',
};

function _viewAllHref(kind) {
  const user = AuthStore.getCurrentUser();
  // 未登录：与其他首页入口同口径，直达登录页（不保留工作台直达链接）。
  if (!user) return `${getBasePath()}login.html`;
  const role = user.role || 'participant';
  // 纪检/组长的专班知情已改由详情页承载（页签已删/不再出专班段）。
  if (kind === 'taskforce' && TASKFORCE_HREF[role]) return `${getBasePath()}${TASKFORCE_HREF[role]}`;
  const page = ROLE_PAGE[role] || 'visitor.html';
  const tab = (kind === 'activity' ? ACTIVITY_TAB : TASKFORCE_TAB)[role] || 'tf-view';
  return `${getBasePath()}workspace/${page}?tab=${tab}`;
}

/** 某工作组的任务口径：completed / 非 cancelled 总数（无任务时 total 为 0） */
function taskStats(workgroupId) {
  const tasks = (mockDB.workgroupTasks || []).filter(
    (task) => task.workgroupId === workgroupId && task.status !== 'cancelled',
  );
  return {
    total: tasks.length,
    completed: tasks.filter((task) => task.status === 'completed').length,
  };
}

/** 某工作组的成员数：status !== 'removed' 的成员行（不按角色二次筛选） */
function memberCount(workgroupId) {
  return (mockDB.workgroupMembers || []).filter(
    (member) => member.workgroupId === workgroupId && member.status !== 'removed',
  ).length;
}

/** 单条工作组行：组名 + 成员/进度（meta）+ 行尾状态徽章与「进入 →」；整行可点，落对应详情 */
function groupRowHtml(group, sourceById) {
  const { total, completed } = taskStats(group.id);
  const source = sourceById.get(group.sourceId) || null;
  let progress;
  if (total > 0) progress = `任务 ${completed}/${total}`;
  else if (group.kind === 'activity') progress = source?.date ? `日期 ${source.date}` : '任务 —';
  else progress = source?.deadline ? `截止 ${source.deadline}` : '任务 —';
  const meta = [`成员 ${memberCount(group.id)} 人`, progress].join(' · ');
  const status = STATUS_BADGE[group.status];
  const trailing = [
    status ? `<span class="state-badge state-badge--${status.tone}">${status.label}</span>` : '',
    '<span class="text-xs text-accent whitespace-nowrap">进入 →</span>',
  ].join('');
  const detailAttr = group.kind === 'activity'
    ? { 'data-activity-id': group.sourceId }
    : { 'data-tf-id': group.sourceId };

  return listRowHtml({
    title: group.name,
    meta,
    trailing,
    rowType: 'nav',
    interactive: true,
    dataAttrs: detailAttr,
    className: 'taskforce-row',
  });
}

/** 组头：「组名 ·」+ 中性计数徽章 + 本组「查看全部」；非首组用 1px hairline 与上一组分隔 */
function groupHeadHtml(label, count, isFirst, viewAllHref) {
  return `<div class="flex items-center gap-2 px-3 pb-2 ${isFirst ? '' : 'mt-4 pt-4 border-t border-neutral-100'}">
    <span class="section-head__title">${label}</span>
    <span class="state-badge state-badge--neutral">${count}</span>
    ${viewAllHref ? `<a href="${viewAllHref}" class="ml-auto text-xs text-accent whitespace-nowrap">查看全部 →</a>` : ''}
  </div>`;
}

/**
 * 渲染首页「工作组进展」卡。
 * 无 active / recruiting 工作组时整卡隐藏（含标题与「查看全部」），不保留空态占位。
 */
export function renderWorkgroupProgress() {
  const container = document.getElementById('dashboard-taskforce-list');
  if (!container) return;
  const card = document.getElementById('dashboard-taskforce-card');

  const activitiesById = new Map((mockDB.activities || []).map((row) => [row.id, row]));
  const taskforcesById = new Map((mockDB.taskforces || []).map((row) => [row.id, row]));

  const workgroups = (mockDB.workgroups || [])
    .filter((group) => isTaskforceActiveStatus(group.status))
    // 工作组状态是建组时投影；活动后来归档/取消时以业务记录为准，避免首页继续显示已结束的组。
    .filter((group) => {
      if (group.kind !== 'activity') return true;
      const source = activitiesById.get(group.sourceId);
      return !!source && !source.archived && source.status !== 'cancelled';
    })
    .slice()
    .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || ''))
      || String(a.name || '').localeCompare(String(b.name || '')));

  const activityGroups = workgroups.filter((group) => group.kind === 'activity');
  const taskforceGroups = workgroups.filter((group) => group.kind === 'taskforce');
  const sourceById = new Map([...activitiesById, ...taskforcesById]);
  const sections = [
    { kind: 'activity', label: '活动工作组', total: activityGroups.length, items: activityGroups.slice(0, GROUP_LIMIT) },
    { kind: 'taskforce', label: '专班工作组', total: taskforceGroups.length, items: taskforceGroups.slice(0, GROUP_LIMIT) },
  ].filter((section) => section.items.length > 0);

  if (sections.length === 0) {
    card?.classList.add('hidden');
    container.innerHTML = '';
    return;
  }
  card?.classList.remove('hidden');

  container.innerHTML = sections.map((section, index) => (
    groupHeadHtml(section.label, section.total, index === 0, _viewAllHref(section.kind))
    + listGroupHtml(section.items.map((group) => groupRowHtml(group, sourceById)))
  )).join('');
}
