// ════════════════════════════════════════════════════════════════
//  inspector.js — 右侧检查器面板渲染逻辑
//  包含：filterTasksByManagementRole, renderInspectorFromState,
//        renderInspectorList, renderInspectorDetail
// ════════════════════════════════════════════════════════════════

import { setState, STATE } from './state.js';
import { ROLE_COLORS, ROLE_LABELS, ROLE_THEME_CLASS, COMMISSIONER_ROLES } from './constants.js';
import { _fmtChinese, showToast } from './utils.js';
import { BranchService } from './service.runtime.js';

// ════════════════════════════════════════════════════════════════
//  RBAC 任务过滤核
//  commissioner 系列：兼容多种 executor/supervisor 字符串
// ════════════════════════════════════════════════════════════════
export function filterTasksByManagementRole(tasks, managementRole) {
  if (managementRole === 'participant' || !managementRole) return tasks;
  return tasks.filter(t => {
    const ex  = t.executor  || '';
    const sup = t.supervisor || '';
    if (managementRole === 'commissioner') {
      return COMMISSIONER_ROLES.has(ex) || COMMISSIONER_ROLES.has(sup);
    }
    return ex === managementRole || sup === managementRole;
  });
}

// ════════════════════════════════════════════════════════════════
//  检查器状态路由分发（根据 viewMode / viewType 切换 List / Detail）
// ════════════════════════════════════════════════════════════════
export function renderInspectorFromState(state) {
  if (state.viewMode === 'detail' && state.selectedActivityId && state.viewType === 'manager') {
    const act = state.activities.find(a => a.id === state.selectedActivityId);
    if (act) {
      const actTasks = state.tasks.filter(t => t.activityId === act.id);
      renderInspectorDetail(act, actTasks, state.managementRole);
    } else {
      renderInspectorList(state.activities, state.selectedDate, state.viewType);
    }
  } else {
    renderInspectorList(state.activities, state.selectedDate, state.viewType);
  }
}

// ════════════════════════════════════════════════════════════════
//  列表视图：渲染指定日期的未归档活动列表
// ════════════════════════════════════════════════════════════════
export function renderInspectorList(activities, dateKey, viewType) {
  const defEl     = document.getElementById('inspector-default');
  const contentEl = document.getElementById('inspector-content');
  const titleEl   = document.getElementById('inspector-date-title');
  const cardsEl   = document.getElementById('inspector-cards');
  if (!defEl || !contentEl) return;

  const dateActivities = dateKey
    ? activities.filter(a => !a.archived && a.date === dateKey)
    : [];

  if (dateActivities.length === 0) {
    defEl.classList.remove('hidden');
    contentEl.classList.add('hidden');
    return;
  }

  defEl.classList.add('hidden');
  contentEl.classList.remove('hidden');

  if (titleEl) {
    titleEl.textContent = _fmtChinese(new Date(dateKey + 'T00:00:00')) + ' · 活动列表';
  }

  const isParticipant = viewType === 'participant' || !viewType;

  const statusMap = { draft: '草稿', published: '已发布', ongoing: '进行中', completed: '已完成' };
  let html = '';
  dateActivities.forEach(act => {
    const label = statusMap[act.status] || act.status;
    if (isParticipant) {
      html += `<div class="inspector-card" data-act-id="${act.id}">`;
      html += `<div class="flex items-start justify-between gap-2 mb-1">`;
      html += `<p class="font-stheiti font-bold text-sm text-gray-800 leading-snug flex-1">${act.title}</p>`;
      html += `<span class="badge-time flex-shrink-0">${label}</span>`;
      html += '</div>';
      html += '<p class="font-stheiti text-[10px] text-gray-400">👀 参与视图 · 仅展示</p>';
      html += '</div>';
    } else {
      html += `<div class="inspector-card" style="cursor:pointer;" data-act-id="${act.id}">`;
      html += `<div class="flex items-start justify-between gap-2 mb-1">`;
      html += `<p class="font-stheiti font-bold text-sm text-gray-800 leading-snug flex-1">${act.title}</p>`;
      html += `<span class="badge-time flex-shrink-0">${label}</span>`;
      html += '</div>';
      html += '<p class="font-stheiti text-[10px] text-gray-400">点击查看任务详情 →</p>';
      html += '</div>';
    }
  });

  if (cardsEl) {
    cardsEl.innerHTML = html;
    if (!isParticipant) {
      cardsEl.querySelectorAll('[data-act-id]').forEach(card => {
        card.addEventListener('click', () => {
          setState({ viewMode: 'detail', selectedActivityId: card.dataset.actId });
        });
      });
    } else {
      cardsEl.querySelectorAll('[data-act-id]').forEach(card => {
        card.addEventListener('click', () => {
          showToast('info', '提示：详情任务节点仅管理视图可见，请在左侧切换管理角色。');
        });
      });
    }
  }
}

// ════════════════════════════════════════════════════════════════
//  详情视图：渲染单个活动的任务列表与危险操作按钮
// ════════════════════════════════════════════════════════════════
export function renderInspectorDetail(activity, tasks, managementRole) {
  const defEl     = document.getElementById('inspector-default');
  const contentEl = document.getElementById('inspector-content');
  const titleEl   = document.getElementById('inspector-date-title');
  const cardsEl   = document.getElementById('inspector-cards');
  if (!defEl || !contentEl) return;

  defEl.classList.add('hidden');
  contentEl.classList.remove('hidden');

  if (titleEl) titleEl.textContent = activity.title;

  const statusMap = { draft: '草稿', published: '已发布', ongoing: '进行中', completed: '已完成' };
  const taskStatusMap = { pending: '待处理', in_progress: '进行中', completed: '已完成' };

  const visibleTasks = filterTasksByManagementRole(tasks, managementRole);
  const themeClass   = ROLE_THEME_CLASS[managementRole] || '';

  let html = '';

  html += '<button id="inspector-back-btn"'
    + ' class="font-stheiti text-xs text-red-700 hover:text-red-900 mb-3'
    + ' flex items-center gap-1 transition-colors"'
    + ' style="background:none;border:none;cursor:pointer;padding:0;">'
    + '← 返回列表</button>';

  html += '<div class="flex items-center gap-1.5 flex-wrap mb-3">';
  html += `<span class="badge-time">${statusMap[activity.status] || activity.status}</span>`;
  if (activity.date) {
    html += `<span class="font-stheiti text-[10px] text-gray-400">${activity.date}</span>`;
  }
  html += '</div>';

  if (visibleTasks.length > 0) {
    visibleTasks.forEach(t => {
      const tlabel = taskStatusMap[t.status] || t.status;
      const cardClass = themeClass ? `inspector-card ${themeClass}` : 'inspector-card';
      html += `<div class="${cardClass}" style="${themeClass ? 'border-left-width:3px;' : ''}">`;
      html += `<div class="flex items-start justify-between gap-2 mb-1">`;
      html += `<p class="font-stheiti font-bold text-sm leading-snug flex-1">${t.title}</p>`;
      html += `<span class="badge-time flex-shrink-0">${tlabel}</span>`;
      html += '</div>';
      html += '</div>';
    });
  } else if (tasks.length > 0) {
    html += '<div class="font-stheiti text-gray-400 text-center py-8">该角色在此活动中暂无专属任务节点</div>';
  } else {
    html += '<p class="font-stheiti text-xs text-gray-400 py-2">暂无关联任务</p>';
  }

  html += '<div class="flex gap-2 mt-4 pt-3 border-t border-gray-100">';
  html += '<button id="inspector-archive-btn"'
    + ' class="font-stheiti text-xs text-amber-700 hover:text-amber-900 px-3 py-1.5 rounded-lg transition-colors"'
    + ' style="background:rgba(251,191,36,0.10);border:1px solid rgba(251,191,36,0.40);">归档活动</button>';
  html += '<button id="inspector-delete-btn"'
    + ' class="font-stheiti text-xs text-red-700 hover:text-red-900 px-3 py-1.5 rounded-lg transition-colors"'
    + ' style="background:rgba(239,68,68,0.10);border:1px solid rgba(239,68,68,0.40);">删除活动</button>';
  html += '</div>';

  if (!cardsEl) return;
  cardsEl.innerHTML = html;

  const backBtn = document.getElementById('inspector-back-btn');
  if (backBtn) {
    backBtn.addEventListener('click', () => {
      setState({ viewMode: 'list', selectedActivityId: null });
    });
  }

  const archiveBtn = document.getElementById('inspector-archive-btn');
  if (archiveBtn) {
    archiveBtn.addEventListener('click', async () => {
      if (!window.confirm('确认归档该活动？它将从主视图消失。')) return;
      try {
        setState({ status: STATE.SUBMITTING });
        await BranchService.archiveActivity(activity.id);
        const [activities, tasks2] = await Promise.all([
          BranchService.listActivities(),
          typeof BranchService.listTasks === 'function' ? BranchService.listTasks() : Promise.resolve([]),
        ]);
        setState({ status: STATE.IDLE, activities, tasks: tasks2, viewMode: 'list', selectedActivityId: null });
        showToast('success', '活动已归档。');
      } catch (err) {
        setState({ status: STATE.ERROR, error: err });
        showToast('error', (err && err.message) ? err.message : '归档失败，请稍后重试。');
      }
    });
  }

  const deleteBtn = document.getElementById('inspector-delete-btn');
  if (deleteBtn) {
    deleteBtn.addEventListener('click', async () => {
      if (!window.confirm('警告：彻底删除该活动及关联数据？')) return;
      try {
        setState({ status: STATE.SUBMITTING });
        await BranchService.deleteActivity(activity.id);
        const [activities, tasks2] = await Promise.all([
          BranchService.listActivities(),
          typeof BranchService.listTasks === 'function' ? BranchService.listTasks() : Promise.resolve([]),
        ]);
        setState({ status: STATE.IDLE, activities, tasks: tasks2, viewMode: 'list', selectedActivityId: null });
        showToast('success', '活动已删除。');
      } catch (err) {
        setState({ status: STATE.ERROR, error: err });
        showToast('error', (err && err.message) ? err.message : '删除失败，请稍后重试。');
      }
    });
  }
}
