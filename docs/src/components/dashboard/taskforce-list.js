// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  dashboard/taskforce-list.js — 首页「工作组进展」卡（2026-10-18 重组）
//  职责单一：读 mockDB.workgroups / workgroupMembers / workgroupTasks，
//  按「活动工作组」「专班工作组」两类分组，各取前 3 条渲染为统一列表行。
//  单一源关系：
//   · 数据 = core/domain/domain.js 的 mockDB（hydrate 后与当前数据源同步，不新增接口）；
//   · 行结构 = components/ui/list-row.js 的 listRowHtml / listGroupHtml（分隔线由 .list-group 出）；
//   · 样式 = docs/src/styles.css 的 .list-row / .list-group 段与间距令牌。
//  口径：仅取 status 为 active / recruiting 的工作组；成员数＝status !== 'removed' 的成员行；
//  任务完成数＝completed 数 / 非 cancelled 任务总数，无任务显示「—」；两类皆空则整卡隐藏。
// ════════════════════════════════════════════════════════════════

import { mockDB } from '../../core/domain/domain.js?v=20261018g';
import { listRowHtml, listGroupHtml } from '../ui/list-row.js?v=20261018g';

const GROUP_LIMIT = 3;
const STATUS_LABEL = { active: '运行中', recruiting: '招募中' };

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

/** 单条工作组行：组名 + 成员/进度/状态 + 行尾「进入」；整行可点，落对应详情 */
function groupRowHtml(group, sourceById) {
  const { total, completed } = taskStats(group.id);
  const source = sourceById.get(group.sourceId) || null;
  let progress;
  if (total > 0) progress = `任务 ${completed}/${total}`;
  else if (group.kind === 'activity') progress = source?.date ? `日期 ${source.date}` : '任务 —';
  else progress = source?.deadline ? `截止 ${source.deadline}` : '任务 —';
  const meta = [
    `成员 ${memberCount(group.id)} 人`,
    progress,
    STATUS_LABEL[group.status],
  ].filter(Boolean).join(' · ');
  const detailAttr = group.kind === 'activity'
    ? { 'data-activity-id': group.sourceId }
    : { 'data-tf-id': group.sourceId };

  return listRowHtml({
    title: group.name,
    meta,
    trailing: '<span class="text-xs text-blue-600 whitespace-nowrap">进入</span>',
    interactive: true,
    dataAttrs: detailAttr,
  });
}

/** 组头：组名 + 该组总数（行只展示前 3 条） */
function groupHeadHtml(label, count, isFirst) {
  return `<div class="flex items-center gap-2 px-3 ${isFirst ? '' : 'mt-3'} pb-1">
    <span class="text-xs font-semibold text-gray-600">${label}</span>
    <span class="text-xs text-gray-500">${count}</span>
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
    .filter((group) => group.status === 'active' || group.status === 'recruiting')
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
    { label: '活动工作组', total: activityGroups.length, items: activityGroups.slice(0, GROUP_LIMIT) },
    { label: '专班工作组', total: taskforceGroups.length, items: taskforceGroups.slice(0, GROUP_LIMIT) },
  ].filter((section) => section.items.length > 0);

  if (sections.length === 0) {
    card?.classList.add('hidden');
    container.innerHTML = '';
    return;
  }
  card?.classList.remove('hidden');

  container.innerHTML = sections.map((section, index) => (
    groupHeadHtml(section.label, section.total, index === 0)
    + listGroupHtml(section.items.map((group) => groupRowHtml(group, sourceById)))
  )).join('');
}
