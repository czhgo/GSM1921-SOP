// role: [工程师]+[AI]
// leader/my-tasks-section.js — 组长台「我的任务」承载面（U-35 · 2026-10-19）
//
// 缺口（Round 1 审计 U-35 / `SOP-B-31` L290-291）：成员台已有「我的任务」（按项目身份派给本人的 SOP 任务），
//   组长台没有同款承载面 ⇒ 组长要完成自己担的那一步必须切到成员台。
// 本件只做**呈现 + 勾掉**：数据与写口全部复用 `services/activity/activity.js` 的
//   `listMyProjectTasks` / `completeMyProjectTask`（不新造数据源、不另立销项口径）。
//
// 与「待办」页的口径区分（写进页面文案，避免两处被读成同一份清单）：
//   · 本段＝**按项目身份**（组织者 / 深度参与者）派给本人的 SOP 任务节点；
//   · 「待办」页＝`TodoStore` 的待办聚合（含通知 / 审核 / 催办等派生项，来源与生命周期不同）。
import { listMyProjectTasks, completeMyProjectTask, deepWorkModeOf, DEEP_WORK_MODE, DEEP_WORK_MODE_LABEL } from '../../../services/activity/activity.js?v=20261018r';
import { isActivityVisibleTo } from '../../../services/core/visibility.js?v=20261018r';
import { AuthStore } from '../../../services/core/auth.js?v=20261018r';
import { ROLE_LABELS } from '../../../core/domain/constants.js?v=20261018r';
import { escHtml as esc, showToast } from '../../../core/base/utils.js?v=20261018r';
import { emptyStateHtml } from '../../../components/ui/empty-state.js?v=20261018r';

const STATUS_LABEL = { pending: '待办', in_progress: '进行中', completed: '已完成' };
const STATUS_CLASS = {
  pending: 'bg-amber-50 text-amber-700',
  in_progress: 'bg-blue-50 text-blue-700',
  completed: 'bg-green-50 text-green-700',
};

/** 本段数据（与成员台同一口径；待批活动按可见性收窄） */
function _myTasks(personId) {
  const role = AuthStore.getCurrentUser()?.role;
  return listMyProjectTasks(personId)
    .filter(x => isActivityVisibleTo(x.activity, role))
    .map(x => ({
      taskId: x.task.id,
      name: x.task.title || '未命名任务',
      project: x.activity.title || '未命名活动',
      projectId: x.activity.id,
      role: x.projectRole,
      status: x.task.status || 'pending',
      date: x.task.date || x.activity.date || '',
      deepMode: x.projectRole === 'deep' ? deepWorkModeOf(x.activity, x.task.taskId) : null,
    }));
}

/**
 * 「我的任务」区块 HTML（挂在「本组活动」页顶部）
 * @param {string} personId 当前登录人
 * @returns {string}
 */
export function myTasksSectionHtml(personId) {
  const rows = _myTasks(personId);
  const body = rows.length === 0
    ? emptyStateHtml('暂无我的任务', {
      actionHtml: '<a class="btn-outline text-xs px-3 py-1.5" href="#leader-activity-lists">查看本组活动</a>',
    })
    : `<div class="space-y-2">${rows.map(_rowHtml).join('')}</div>`;
  return `
    <div class="card rounded-xl p-5 mb-4" id="leader-my-tasks">
      <div class="flex items-center justify-between mb-1">
        <h3 class="font-title-cn text-base font-semibold text-gray-800">我的任务</h3>
        <span class="text-xs text-gray-500">按项目身份分配 · ${rows.length} 项</span>
      </div>
      <p class="text-xs text-gray-500 mb-3">只列按项目身份（组织者 / 深度参与者）派给本人的 SOP 任务；与「待办」页的待办聚合口径不同。</p>
      ${body}
    </div>`;
}

function _rowHtml(r) {
  const done = r.status === 'completed';
  const offline = r.deepMode === DEEP_WORK_MODE.OFFLINE;
  const modeChip = r.deepMode
    ? `<span class="text-[11px] px-1.5 py-0.5 rounded-full border flex-shrink-0 ${offline ? 'bg-amber-50 text-amber-700 border-amber-100' : 'bg-emerald-50 text-emerald-700 border-emerald-100'}" title="${offline ? '组织者已标为「去线下做」——线下完成，由组织者确认' : '组织者已标为「系统内做」——完成后由系统同步产出'}">${DEEP_WORK_MODE_LABEL[r.deepMode]}</span>`
    : '';
  return `
    <div class="flex items-center justify-between gap-3 rounded-xl bg-white border border-gray-100 px-3 py-2.5">
      <div class="min-w-0">
        <div class="flex items-center gap-2">
          <span class="text-[11px] px-1.5 py-0.5 rounded-full flex-shrink-0 ${STATUS_CLASS[r.status] || 'bg-gray-100 text-gray-600'}">${STATUS_LABEL[r.status] || r.status}</span>
          <span class="text-sm font-medium text-gray-800 truncate">${esc(r.name)}</span>
        </div>
        <div class="mt-1 flex items-center gap-2 text-[12px] text-gray-500 min-w-0">
          <span class="truncate">${esc(r.project)}</span>
          ${r.date ? `<span class="flex-shrink-0">${esc(r.date)}</span>` : ''}
          <span class="flex-shrink-0">${esc(ROLE_LABELS[r.role] || r.role)}</span>
          ${modeChip}
        </div>
      </div>
      <span class="flex items-center gap-2 flex-shrink-0">
        <a class="text-xs text-sky-700 hover:underline" href="./activity.html?id=${encodeURIComponent(r.projectId)}">详情</a>
        ${(done || offline) ? '' : `<button type="button" class="btn-outline" data-my-task-complete="${esc(r.taskId)}" style="cursor:pointer;">勾掉</button>`}
      </span>
    </div>`;
}

/**
 * 绑定「勾掉」动作（容器级委托；写口在服务层复算「只认本人担的那步」）。
 * @param {HTMLElement} container 组长台内容容器
 * @param {string} personId 当前登录人
 * @param {{onChange?:Function}} [opts] onChange＝完成后的重渲染回调
 */
export function bindMyTasksSection(container, personId, { onChange } = {}) {
  const host = container.querySelector('#leader-my-tasks');
  if (!host || host.dataset.myTasksBound === '1') return;
  host.dataset.myTasksBound = '1';
  host.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-my-task-complete]');
    if (!btn) return;
    e.stopPropagation();
    const res = completeMyProjectTask(personId, btn.dataset.myTaskComplete);
    if (!res.ok) { showToast('error', '该任务不在你名下，无法勾掉'); return; }
    showToast('success', '已完成该任务');
    if (typeof onChange === 'function') onChange();
  });
}
