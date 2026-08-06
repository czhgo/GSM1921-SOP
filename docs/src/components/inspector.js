// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  inspector.js — 右侧检查器面板渲染逻辑
//  包含：filterTasksByManagementRole, renderInspectorFromState,
//        renderInspectorList, renderInspectorDetail
// ════════════════════════════════════════════════════════════════

import { setState, STATE, getAppState } from '../core/state.js';
import { ROLE_COLORS, ROLE_LABELS, ROLE_THEME_CLASS, COMMISSIONER_ROLES } from '../core/constants.js';
import { _fmtChinese, showToast } from '../core/utils.js';
import { icon } from '../core/icons.js';
import { PEOPLE, getPersonById } from '../mock/index.js';
import { BranchService } from '../services/runtime.js';
import { AuthStore } from '../services/auth.js';
import { statusBadgeHtml, bindStatusBadge } from './status-badge.js';
import { persist } from '../core/data-adapter.js';

// T-217 §2.4：任务状态定义（status-badge 用，色点 + 文字）
const TASK_STATUSES = {
  pending:     { label: '待处理', color: '#9CA3AF' },
  in_progress: { label: '进行中', color: '#D97706' },
  completed:   { label: '已完成', color: '#16A34A' },
};

// T-218：活动执行态由任务进度派生（书记裁决 2026-08-05「进度驱动活动状态」）
// - 有关联任务且全部 completed → 'completed'（已完成）
// - 有关联任务且未全部完成 → 'ongoing'（进行中）
// - 无关联任务 → 保持计划态（draft/published）原样
// 以全活动任务为准（呼应书记「书记看全部任务」裁决）；展示与写联动统一走本函数。
export function deriveActivityExecutionStatus(activity, allTasks) {
  const actTasks = allTasks.filter(t => t.activityId === activity.id);
  if (actTasks.length === 0) return activity.status;
  const allDone = actTasks.every(t => t.status === 'completed');
  return allDone ? 'completed' : 'ongoing';
}

// T-218：活动执行态徽章语义色（替代原中性灰 badge-time，与任务徽章色系一致）
const ACT_STATUS_STYLE = {
  draft:     { bg: 'rgba(107,114,128,0.12)', fg: '#6B7280' },  // 草稿
  published: { bg: 'rgba(37,99,235,0.12)',   fg: '#2563EB' },  // 已发布
  ongoing:   { bg: 'rgba(217,119,6,0.14)',   fg: '#D97706' },  // 进行中
  completed: { bg: 'rgba(22,163,74,0.14)',   fg: '#16A34A' },  // 已完成
};
function activityBadgeHtml(status, label) {
  const s = ACT_STATUS_STYLE[status] || ACT_STATUS_STYLE.draft;
  return `<span class="badge-time flex-shrink-0" style="background:${s.bg};color:${s.fg};">${label}</span>`;
}

// ════════════════════════════════════════════════════════════════
//  RBAC 任务过滤核
//  commissioner 系列：兼容多种 executor/supervisor 字符串
// ════════════════════════════════════════════════════════════════
export function filterTasksByManagementRole(tasks, managementRole) {
  if (managementRole === 'participant' || !managementRole) return tasks;
  // 书记（党支书）为支部总负责人：活动详情展示该活动全部任务节点，便于全面监督（T-217 书记裁决 2026-08-05）
  if (managementRole === 'secretary') return tasks;
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
  if (state.viewType === 'participant' && state.viewMode !== 'detail') {
    renderInspectorList(state.activities, state.selectedDate, state.viewType, state.viewArchived);
    return;
  }

  if (state.viewMode === 'detail' && state.selectedActivityId) {
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
    extraHtml += `<p class=" text-sm text-gray-700 mb-1">组织者：${orgPerson.name}</p>`;
  }
  if (act.participants && act.participants.length > 0) {
    const deepNames = act.participants
      .filter(pid => pid !== act.organizer)
      .map(pid => getPersonById(pid)?.name)
      .filter(Boolean);
    if (deepNames.length > 0) {
      extraHtml += `<p class=" text-sm text-gray-700 mb-1">参与者：${deepNames.join('、')}</p>`;
    }
  }

  card.innerHTML =
    '<p class=" font-bold text-sm text-gray-800 mb-3">【活动摘要】</p>'
    + `<p class=" text-sm text-gray-700 mb-1">标题：${act.title}</p>`
    + `<p class=" text-sm text-gray-700 mb-2">日期：${act.date || '未设定'}</p>`
    + extraHtml
    + '<p class=" text-xs text-gray-500 border-t border-gray-100 pt-3 mt-2 leading-relaxed">'
    + '如需查看任务详情，请在左侧切换管理视图。</p>'
    + '<button class=" text-xs text-white px-4 py-1.5 rounded-lg mt-4 w-full transition-colors" '
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
    if (viewArchived) {
      defEl.innerHTML = '<p class=" text-sm text-gray-400 text-center py-8">归档库暂无内容</p>';
    } else if (dateKey) {
      defEl.innerHTML = '<div class="text-center text-gray-400 py-8  text-sm">当日暂无活动</div>';
    } else {
      defEl.innerHTML = '<div class="text-center text-gray-400 py-8  text-sm">点击日历日期查看活动</div>';
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

  // 确保 inspector 可见：滚动到视图中
  contentEl.closest('#inspector-container')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

  const isParticipant = !viewArchived && (viewType === 'participant' || !viewType);

  const statusMap = { draft: '草稿', published: '已发布', ongoing: '进行中', completed: '已完成' };
  const allTasks = (getAppState() || {}).tasks || [];
  let html = '';
  dateActivities.forEach(act => {
    // T-218：列表徽章同样走派生执行态（与详情页一致，进度驱动）
    const execStatus = deriveActivityExecutionStatus(act, allTasks);
    const label = statusMap[execStatus] || execStatus;
    const isBrand = !!act.isBrand;
    const brandTag = isBrand
      ? '<span class=" text-xs px-1.5 py-0.5 rounded" style="background:rgba(234,179,8,0.15);color:var(--brand-amber-dark);border:1px solid rgba(234,179,8,0.35);">品牌</span>'
      : '';
    if (isParticipant) {
      html += `<div class="inspector-card" data-act-id="${act.id}" style="${isBrand ? 'border-left:3px solid #EAB308;' : ''}">`;
      html += `<div class="flex items-start justify-between gap-2 mb-1">`;
      html += `<p class=" font-bold text-sm text-gray-800 leading-snug flex-1">${act.title}</p>`;
      html += activityBadgeHtml(execStatus, label);
      html += '</div>';
      html += `<div class="flex items-center gap-1.5">${brandTag}<p class=" text-xs text-gray-400">参与视图 · 仅展示</p></div>`;
      html += '</div>';
    } else {
      html += `<div class="inspector-card" style="cursor:pointer;${isBrand ? 'border-left:3px solid #EAB308;' : ''}" data-act-id="${act.id}">`;
      html += `<div class="flex items-start justify-between gap-2 mb-1">`;
      html += `<div class="flex items-center gap-1.5 flex-1"><p class=" font-bold text-sm text-gray-800 leading-snug">${act.title}</p>${brandTag}</div>`;
      html += activityBadgeHtml(execStatus, label);
      html += '</div>';
      html += `<p class=" text-xs text-gray-400">点击查看任务详情 →</p>`;
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

  // 确保 inspector 可见：滚动到视图中
  contentEl.closest('#inspector-container')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

  const statusMap = { draft: '草稿', published: '已发布', ongoing: '进行中', completed: '已完成' };

  const visibleTasks = filterTasksByManagementRole(tasks, managementRole);
  const themeClass   = ROLE_THEME_CLASS[managementRole] || '';
  const isArchived   = activity.archived === true;
  const _user = AuthStore.getCurrentUser();
  const isSecretary = _user?.role === 'secretary';
  const isBrandActive = !!activity.isBrand;

  let html = '';

  html += '<button id="inspector-back-btn"'
    + ' class=" text-xs text-red-700 hover:text-red-900 mb-3'
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
    html += `<div class="inspector-role-banner ${mgrTheme}"><span class="font-semibold">${mgrLabel}</span> 管理视图</div>`;
  }

  html += '<div class="flex items-center gap-1.5 flex-wrap mb-3">';
  // T-218：顶部徽章改派生执行态（进度驱动活动状态，书记裁决 2026-08-05）
  const actExecStatus = deriveActivityExecutionStatus(activity, tasks);
  html += activityBadgeHtml(actExecStatus, statusMap[actExecStatus] || actExecStatus);
  if (isArchived) {
    html += '<span class=" text-xs px-1.5 py-0.5 rounded" style="background:rgba(156,163,175,0.2);color:#6B7280;">已归档</span>';
  }
  if (activity.date) {
    html += `<span class=" text-xs text-gray-400">${activity.date}</span>`;
  }
  html += '</div>';

  // ── 活动信息（复用写入时收集的详情字段：时间/地点/主持人/组织者/参与者/方向/维度/描述）──
  const infoRows = [];
  if (activity.time) infoRows.push({ label: '时间', value: activity.time });
  if (activity.location) infoRows.push({ label: '地点', value: activity.location });
  if (activity.host) infoRows.push({ label: '主持人', value: activity.host });
  if (activity.organizer) {
    const orgPerson = getPersonById(activity.organizer);
    if (orgPerson) infoRows.push({ label: '组织者', value: orgPerson.name });
  }
  let memberNames = [];
  if (Array.isArray(activity.participants)) {
    memberNames = activity.participants.filter(pid => pid !== activity.organizer).map(pid => getPersonById(pid)?.name).filter(Boolean);
  }
  if (memberNames.length === 0 && Array.isArray(activity.assignments)) {
    memberNames = activity.assignments.filter(a => a.role !== 'organizer').map(a => getPersonById(a.personId)?.name).filter(Boolean);
  }
  if (memberNames.length) infoRows.push({ label: '参与者', value: memberNames.join('、') });
  const directionVal = activity._dt_direction || activity.direction;
  if (directionVal) infoRows.push({ label: '发起方向', value: directionVal === 'top-down' ? '自上而下' : directionVal === 'bottom-up' ? '自下而上' : directionVal });
  const durationVal = activity._dt_duration;
  if (durationVal) infoRows.push({ label: '时长', value: durationVal === 'short' ? '短期' : durationVal === 'long' ? '长期' : durationVal });
  const dimParts = [];
  if (activity.isJoint !== undefined && activity.isJoint !== '') dimParts.push(activity.isJoint === 'true' || activity.isJoint === true ? '共建开展' : '独立开展');
  if (activity.isOutdoor !== undefined && activity.isOutdoor !== '') dimParts.push(activity.isOutdoor === 'true' || activity.isOutdoor === true ? '校外' : '校内');
  if (Array.isArray(activity.carriers) && activity.carriers.length) dimParts.push(activity.carriers.join('、'));
  if (dimParts.length) infoRows.push({ label: '活动维度', value: dimParts.join(' · ') });

  if (infoRows.length) {
    html += '<div class="mb-3 rounded-lg border border-gray-100 bg-gray-50/50 p-3 space-y-1">';
    infoRows.forEach(r => {
      html += `<div class="flex items-start gap-2 text-xs"><span class="text-gray-400 flex-shrink-0 w-14">${r.label}</span><span class="text-gray-700">${r.value}</span></div>`;
    });
    html += '</div>';
  }
  if (activity.description) {
    html += `<div class="mb-3 rounded-lg border border-gray-100 bg-gray-50/50 p-3"><p class="text-xs text-gray-400 mb-1">活动详情</p><p class="text-xs text-gray-700 leading-relaxed">${activity.description}</p></div>`;
  }

  if (visibleTasks.length > 0) {
    const completedCount = visibleTasks.filter(t => t.status === 'completed').length;
    html += `<p class=" text-xs text-gray-500 mb-3">进度：${completedCount}/${visibleTasks.length} 已完成</p>`;
  }

  if (visibleTasks.length > 0) {
    visibleTasks.forEach(t => {
      const cardClass = themeClass ? `inspector-card ${themeClass}` : 'inspector-card';
      html += `<div class="${cardClass}">`;
      html += `<div class="flex items-start justify-between gap-2 mb-1">`;
      html += `<p class=" font-bold text-sm leading-snug flex-1">${t.title}</p>`;
      // T-217 §2.4：任务状态由行内 select 改为 status-badge（色点+文字+悬浮选择器）
      html += statusBadgeHtml(t.status, {
        statuses: TASK_STATUSES,
        disabled: isArchived,
        attrs: `data-task-id="${t.id}"`,
      });
      html += '</div>';
      html += '</div>';
    });
  } else if (tasks.length > 0) {
    html += '<div class=" text-gray-400 text-center py-8">该角色在此活动中暂无专属任务节点</div>';
  } else {
    html += '<p class=" text-xs text-gray-400 py-2">暂无关联任务</p>';
  }

  if (isSecretary && !isArchived) {
    html += '<div class="mt-3">';
    html += `<button id="inspector-brand-toggle-btn" class=" text-xs px-3 py-1.5 rounded-lg transition-colors inline-flex items-center gap-1" style="${isBrandActive ? 'background:rgba(234,179,8,0.15);color:var(--brand-amber-dark);border:1px solid rgba(234,179,8,0.40);' : 'background:rgba(234,179,8,0.06);color:#92400E;border:1px solid rgba(234,179,8,0.25);'}">${isBrandActive ? icon('starFilled', { className: 'w-3 h-3' }) + ' 取消品牌认定' : icon('starOutline', { className: 'w-3 h-3' }) + ' 标记为品牌活动'}</button>`;
    html += '</div>';
  }

  html += '<div class="flex gap-2 mt-4 pt-3 border-t border-gray-100">';
  if (isArchived) {
    html += '<button id="inspector-restore-btn"'
      + ' class=" text-xs text-green-700 hover:text-green-900 px-3 py-1.5 rounded-lg transition-colors"'
      + ' style="background:rgba(16,185,129,0.10);border:1px solid rgba(16,185,129,0.40);">恢复活动</button>';
  } else {
    html += '<button id="inspector-archive-btn"'
      + ' class=" text-xs text-orange-700 hover:text-orange-900 px-3 py-1.5 rounded-lg transition-colors"'
      + ' style="background:rgba(251,191,36,0.10);border:1px solid rgba(251,191,36,0.40);">归档活动</button>';
  }
  html += '<button id="inspector-delete-btn"'
    + ' class=" text-xs text-red-700 hover:text-red-900 px-3 py-1.5 rounded-lg transition-colors"'
    + ' style="background:rgba(239,68,68,0.10);border:1px solid rgba(239,68,68,0.40);">删除活动</button>';
  html += '</div>';

  if (!cardsEl) return;
  cardsEl.innerHTML = html;

  if (!isArchived) {
    cardsEl.querySelectorAll('[data-status-badge]').forEach(badge => {
      bindStatusBadge(badge, {
        statuses: TASK_STATUSES,
        onChange: async (newStatus) => {
          const taskId = badge.dataset.taskId;
          const newTasks = BranchService.updateTask(taskId, { status: newStatus });
          // T-218：进度驱动活动状态——任务变更后重算活动执行态并落库
          // （BranchService 直写路径仅 saveDB() 本地，必须显式 persist() 写穿服务器）
          const newActStatus = deriveActivityExecutionStatus(activity, newTasks);
          if (newActStatus !== activity.status) {
            await BranchService.updateActivity(activity.id, { status: newActStatus });
          }
          setState({
            tasks: newTasks,
            activities: getAppState().activities.map(a => (a.id === activity.id ? { ...a, status: newActStatus } : a)),
          });
          persist();
        },
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
        persist(); // 扎口修复（Z1/Z3）：updateActivity 内部不落盘，必须显式 persist 写穿
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
