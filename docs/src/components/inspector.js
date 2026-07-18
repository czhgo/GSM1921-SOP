// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  inspector.js — 右侧检查器面板渲染逻辑
//  包含：filterTasksByManagementRole, renderInspectorFromState,
//        renderInspectorList, renderInspectorDetail
// ════════════════════════════════════════════════════════════════

import { setState, STATE } from '../core/state.js';
import { ROLE_COLORS, ROLE_LABELS, ROLE_THEME_CLASS, COMMISSIONER_ROLES } from '../core/constants.js';
import { _fmtChinese, showToast } from '../core/utils.js';
import { icon } from '../core/icons.js';
import { PEOPLE, getPersonById } from '../mock/index.js';
import { BranchService } from '../services/runtime.js';
import { AuthStore } from '../services/auth.js';

// ════════════════════════════════════════════════════════════════
//  RBAC 任务过滤核
//  commissioner 系列：兼容多种 executor/supervisor 字符串
// ════════════════════════════════════════════════════════════════
export function filterTasksByManagementRole(tasks, managementRole) {
  if (managementRole === 'participant' || !managementRole) return tasks;
  return tasks.filter(t => {
    const ex  = t.executor  || '';
    const sup = t.supervisor || '';
    if (managementRole === 'org-commissioner' || managementRole === 'prop-commissioner' || managementRole === 'disc-commissioner') {
      return COMMISSIONER_ROLES.has(ex) || COMMISSIONER_ROLES.has(sup) || ex === managementRole || sup === managementRole;
    }
    return ex === managementRole || sup === managementRole;
  });
}

// ════════════════════════════════════════════════════════════════
//  检查器状态路由分发（根据 viewMode / viewType 切换 List / Detail）
// ════════════════════════════════════════════════════════════════
export function renderInspectorFromState(state) {
  if (state.viewType === 'participant') {
    renderInspectorList(state.activities, state.selectedDate, state.viewType, state.viewArchived);
    return;
  }

  if (state.viewMode === 'detail' && state.selectedActivityId && state.viewType === 'manager') {
    const act = state.activities.find(a => a.id === state.selectedActivityId);
    if (act) {
      const actTasks = state.tasks.filter(t => t.activityId === act.id);
      renderInspectorDetail(act, actTasks, state.managementRole);
    } else {
      renderInspectorList(state.activities, state.selectedDate, state.viewType, state.viewArchived);
    }
  } else {
    renderInspectorList(state.activities, state.selectedDate, state.viewType, state.viewArchived);
  }
}

// ════════════════════════════════════════════════════════════════
//  轻量参与者浮层（DOM Modal）
// ════════════════════════════════════════════════════════════════
function _showParticipantModal(act) {
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.45);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px;';
  const card = document.createElement('div');
  card.style.cssText = 'background:#fff;border-radius:var(--radius-lg);padding:20px 22px;max-width:320px;width:100%;box-shadow:0 12px 40px rgba(0,0,0,0.18);';

  let extraHtml = '';
  const orgPerson = getPersonById(act.organizer);
  if (orgPerson) {
    extraHtml += `<p class="font-stheiti text-sm text-gray-700 mb-1">组织者：${orgPerson.name}</p>`;
  }
  if (act.participants && act.participants.length > 0) {
    const deepNames = act.participants
      .filter(pid => pid !== act.organizer)
      .map(pid => getPersonById(pid)?.name)
      .filter(Boolean);
    if (deepNames.length > 0) {
      extraHtml += `<p class="font-stheiti text-sm text-gray-700 mb-1">参与者：${deepNames.join('、')}</p>`;
    }
  }

  card.innerHTML =
    '<p class="font-stheiti font-bold text-sm text-gray-800 mb-3">【活动摘要】</p>'
    + `<p class="font-stheiti text-sm text-gray-700 mb-1">标题：${act.title}</p>`
    + `<p class="font-stheiti text-sm text-gray-700 mb-2">日期：${act.date || '未设定'}</p>`
    + extraHtml
    + '<p class="font-stheiti text-xs text-gray-500 border-t border-gray-100 pt-3 mt-2 leading-relaxed">'
    + '如需查看任务详情，请在左侧切换管理视图。</p>'
    + '<button class="font-stheiti text-xs text-white px-4 py-1.5 rounded-lg mt-4 w-full transition-colors" '
    + 'style="background:#CE1126;">关闭</button>';
  card.querySelector('button').addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
  card.addEventListener('click', e => e.stopPropagation());
  overlay.appendChild(card);
  document.body.appendChild(overlay);
}

// ════════════════════════════════════════════════════════════════
//  列表视图：渲染指定日期的活动列表（普通或归档模式）
// ════════════════════════════════════════════════════════════════
export function renderInspectorList(activities, dateKey, viewType, viewArchived = false) {
  const defEl     = document.getElementById('inspector-default');
  const contentEl = document.getElementById('inspector-content');
  const titleEl   = document.getElementById('inspector-date-title');
  const cardsEl   = document.getElementById('inspector-cards');
  if (!defEl || !contentEl) return;

  let dateActivities;
  if (viewArchived) {
    dateActivities = activities.filter(a => a.archived === true);
  } else {
    dateActivities = dateKey
      ? activities.filter(a => !a.archived && a.date === dateKey)
      : [];
  }

  if (dateActivities.length === 0) {
    defEl.classList.remove('hidden');
    const _mgr = !viewArchived && viewType === 'manager';
    const _guide = '<div class="font-stheiti text-gray-400 text-sm text-center py-4 border-b border-gray-100 mb-4">提示：请从下方列表或顶部下拉框选择活动，以查看您的专属任务流。</div>';
    if (viewArchived) {
      defEl.innerHTML = '<p class="font-stheiti text-sm text-gray-400 text-center py-8">归档库暂无内容</p>';
    } else if (dateKey) {
      defEl.innerHTML = (_mgr ? _guide : '') + '<div class="text-center text-gray-400 py-8 font-stheiti text-sm">当日暂无活动</div>';
    } else if (_mgr) {
      defEl.innerHTML = _guide;
    }
    contentEl.classList.add('hidden');
    return;
  }
  defEl.innerHTML = '';

  defEl.classList.add('hidden');
  contentEl.classList.remove('hidden');

  if (titleEl) {
    titleEl.textContent = viewArchived
      ? '归档库 · 已归档活动'
      : _fmtChinese(new Date(dateKey + 'T00:00:00')) + ' · 活动列表';
  }

  const isParticipant = !viewArchived && (viewType === 'participant' || !viewType);

  const statusMap = { draft: '草稿', published: '已发布', ongoing: '进行中', completed: '已完成' };
  let html = '';
  dateActivities.forEach(act => {
    const label = statusMap[act.status] || act.status;
    const isBrand = !!act.isBrand;
    const brandTag = isBrand
      ? '<span class="font-stheiti text-[10px] px-1.5 py-0.5 rounded" style="background:rgba(234,179,8,0.15);color:var(--brand-amber-dark);border:1px solid rgba(234,179,8,0.35);">品牌</span>'
      : '';
    if (isParticipant) {
      html += `<div class="inspector-card" data-act-id="${act.id}" style="${isBrand ? 'border-left:3px solid #EAB308;' : ''}">`;
      html += `<div class="flex items-start justify-between gap-2 mb-1">`;
      html += `<p class="font-stheiti font-bold text-sm text-gray-800 leading-snug flex-1">${act.title}</p>`;
      html += `<span class="badge-time flex-shrink-0">${label}</span>`;
      html += '</div>';
      html += `<div class="flex items-center gap-1.5">${brandTag}<p class="font-stheiti text-[10px] text-gray-400">参与视图 · 仅展示</p></div>`;
      html += '</div>';
    } else {
      html += `<div class="inspector-card" style="cursor:pointer;${isBrand ? 'border-left:3px solid #EAB308;' : ''}" data-act-id="${act.id}">`;
      html += `<div class="flex items-start justify-between gap-2 mb-1">`;
      html += `<div class="flex items-center gap-1.5 flex-1"><p class="font-stheiti font-bold text-sm text-gray-800 leading-snug">${act.title}</p>${brandTag}</div>`;
      html += `<span class="badge-time flex-shrink-0">${label}</span>`;
      html += '</div>';
      html += `<p class="font-stheiti text-[10px] text-gray-400">点击查看任务详情 →</p>`;
      html += '</div>';
    }
  });

  if (cardsEl) {
    const _guide = (!isParticipant && !viewArchived)
      ? '<div class="font-stheiti text-gray-400 text-sm text-center py-4 border-b border-gray-100 mb-4">提示：请从下方列表或顶部下拉框选择活动，以查看您的专属任务流。</div>'
      : '';
    cardsEl.innerHTML = _guide + html;

    if (!isParticipant) {
      cardsEl.querySelectorAll('[data-act-id]').forEach(card => {
        card.addEventListener('click', () => {
          setState({ viewMode: 'detail', selectedActivityId: card.dataset.actId });
        });
      });
    } else {
      cardsEl.querySelectorAll('[data-act-id]').forEach(card => {
        card.addEventListener('click', () => {
          const act = dateActivities.find(a => a.id === card.dataset.actId);
          if (act) _showParticipantModal(act);
        });
      });
    }
  }
}

// ════════════════════════════════════════════════════════════════
//  详情视图：渲染单个活动的任务列表与危险操作按钮
// ════════════════════════════════════════════════════════════════
function renderInspectorDetail(activity, tasks, managementRole) {
  const defEl     = document.getElementById('inspector-default');
  const contentEl = document.getElementById('inspector-content');
  const titleEl   = document.getElementById('inspector-date-title');
  const cardsEl   = document.getElementById('inspector-cards');
  if (!defEl || !contentEl) return;

  defEl.classList.add('hidden');
  contentEl.classList.remove('hidden');

  if (titleEl) titleEl.textContent = activity.title;

  const statusMap = { draft: '草稿', published: '已发布', ongoing: '进行中', completed: '已完成' };

  const visibleTasks = filterTasksByManagementRole(tasks, managementRole);
  const themeClass   = ROLE_THEME_CLASS[managementRole] || '';
  const isArchived   = activity.archived === true;
  const _user = AuthStore.getCurrentUser();
  const isSecretary = _user?.role === 'secretary';
  const isBrandActive = !!activity.isBrand;

  let html = '';

  html += '<button id="inspector-back-btn"'
    + ' class="font-stheiti text-xs text-red-700 hover:text-red-900 mb-3'
    + ' flex items-center gap-1 transition-colors"'
    + ' style="background:none;border:none;cursor:pointer;padding:0;">'
    + '← 返回列表</button>';

  const mgrLabels = {
    'org-commissioner': '组织委员',
    'prop-commissioner': '宣传委员',
    'disc-commissioner': '纪检委员',
    secretary: '党支书',
    organizer: '组织者',
    deep: '深度参与者',
    leader: '党小组组长',
  };
  const mgrLabel = mgrLabels[managementRole] || managementRole;
  const mgrTheme = ROLE_THEME_CLASS[managementRole] || '';
  if (managementRole && managementRole !== 'participant') {
    html += `<div class="inspector-role-banner ${mgrTheme}"><span class="font-title-cn">${mgrLabel}</span> 管理视图</div>`;
  }

  html += '<div class="flex items-center gap-1.5 flex-wrap mb-3">';
  html += `<span class="badge-time">${statusMap[activity.status] || activity.status}</span>`;
  if (isArchived) {
    html += '<span class="font-stheiti text-[10px] px-1.5 py-0.5 rounded" style="background:rgba(156,163,175,0.2);color:#6B7280;">已归档</span>';
  }
  if (activity.date) {
    html += `<span class="font-stheiti text-[10px] text-gray-400">${activity.date}</span>`;
  }
  html += '</div>';

  if (visibleTasks.length > 0) {
    const completedCount = visibleTasks.filter(t => t.status === 'completed').length;
    html += `<p class="font-stheiti text-xs text-gray-500 mb-3">进度：${completedCount}/${visibleTasks.length} 已完成</p>`;
  }

  if (visibleTasks.length > 0) {
    visibleTasks.forEach(t => {
      const cardClass = themeClass ? `inspector-card ${themeClass}` : 'inspector-card';
      html += `<div class="${cardClass}">`;
      html += `<div class="flex items-start justify-between gap-2 mb-1">`;
      html += `<p class="font-stheiti font-bold text-sm leading-snug flex-1">${t.title}</p>`;
      html += `<select class="task-status-select input-flat text-[10px] flex-shrink-0"${isArchived ? ' disabled style="opacity:0.5;cursor:not-allowed;"' : ''} data-task-id="${t.id}" aria-label="任务状态">`;
      html += `<option value="pending"${t.status === 'pending' ? ' selected' : ''}>待处理</option>`;
      html += `<option value="in_progress"${t.status === 'in_progress' ? ' selected' : ''}>进行中</option>`;
      html += `<option value="completed"${t.status === 'completed' ? ' selected' : ''}>已完成</option>`;
      html += '</select>';
      html += '</div>';
      html += '</div>';
    });
  } else if (tasks.length > 0) {
    html += '<div class="font-stheiti text-gray-400 text-center py-8">该角色在此活动中暂无专属任务节点</div>';
  } else {
    html += '<p class="font-stheiti text-xs text-gray-400 py-2">暂无关联任务</p>';
  }

  if (isSecretary && !isArchived) {
    html += '<div class="mt-3">';
    html += `<button id="inspector-brand-toggle-btn" class="font-stheiti text-xs px-3 py-1.5 rounded-lg transition-colors inline-flex items-center gap-1" style="${isBrandActive ? 'background:rgba(234,179,8,0.15);color:var(--brand-amber-dark);border:1px solid rgba(234,179,8,0.40);' : 'background:rgba(234,179,8,0.06);color:#92400E;border:1px solid rgba(234,179,8,0.25);'}">${isBrandActive ? icon('starFilled', { size: 12 }) + ' 取消品牌认定' : icon('starOutline', { size: 12 }) + ' 标记为品牌活动'}</button>`;
    html += '</div>';
  }

  html += '<div class="flex gap-2 mt-4 pt-3 border-t border-gray-100">';
  if (isArchived) {
    html += '<button id="inspector-restore-btn"'
      + ' class="font-stheiti text-xs text-green-700 hover:text-green-900 px-3 py-1.5 rounded-lg transition-colors"'
      + ' style="background:rgba(16,185,129,0.10);border:1px solid rgba(16,185,129,0.40);">恢复活动</button>';
  } else {
    html += '<button id="inspector-archive-btn"'
      + ' class="font-stheiti text-xs text-orange-700 hover:text-orange-900 px-3 py-1.5 rounded-lg transition-colors"'
      + ' style="background:rgba(251,191,36,0.10);border:1px solid rgba(251,191,36,0.40);">归档活动</button>';
  }
  html += '<button id="inspector-delete-btn"'
    + ' class="font-stheiti text-xs text-red-700 hover:text-red-900 px-3 py-1.5 rounded-lg transition-colors"'
    + ' style="background:rgba(239,68,68,0.10);border:1px solid rgba(239,68,68,0.40);">删除活动</button>';
  html += '</div>';

  if (!cardsEl) return;
  cardsEl.innerHTML = html;

  if (!isArchived) {
    cardsEl.querySelectorAll('.task-status-select').forEach(sel => {
      sel.addEventListener('change', () => {
        const newTasks = BranchService.updateTask(sel.dataset.taskId, { status: sel.value });
        setState({ tasks: newTasks });
      });
    });
  }

  const brandToggleBtn = document.getElementById('inspector-brand-toggle-btn');
  if (brandToggleBtn) {
    brandToggleBtn.addEventListener('click', async () => {
      const action = isBrandActive ? '取消品牌认定' : '标记为品牌活动';
      if (!window.confirm(`确认${action}？`)) return;
      try {
        setState({ status: STATE.SUBMITTING });
        await BranchService.toggleBrand(activity.id);
        const activities = await BranchService.listActivities();
        setState({ status: STATE.IDLE, activities });
        showToast('success', `${action}成功`);
      } catch (err) {
        setState({ status: STATE.ERROR, error: err });
        showToast('error', (err && err.message) || '操作失败');
      }
    });
  }

  const backBtn = document.getElementById('inspector-back-btn');
  if (backBtn) {
    backBtn.addEventListener('click', () => {
      setState({ viewMode: 'list', selectedActivityId: null });
    });
  }

  const restoreBtn = document.getElementById('inspector-restore-btn');
  if (restoreBtn) {
    restoreBtn.addEventListener('click', async () => {
      if (!window.confirm('确认将该活动恢复至主视图？')) return;
      try {
        setState({ status: STATE.SUBMITTING });
        await BranchService.updateActivity(activity.id, { archived: false });
        const [activities, tasks2] = await Promise.all([
          BranchService.listActivities(),
          typeof BranchService.listTasks === 'function' ? BranchService.listTasks() : Promise.resolve([]),
        ]);
        setState({ status: STATE.IDLE, activities, tasks: tasks2, viewMode: 'list', selectedActivityId: null, viewArchived: false });
        showToast('success', '活动已恢复，可在主视图中查看。');
      } catch (err) {
        setState({ status: STATE.ERROR, error: err });
        showToast('error', (err && err.message) ? err.message : '恢复失败，请稍后重试。');
      }
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
