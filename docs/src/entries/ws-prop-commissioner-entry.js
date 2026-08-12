﻿﻿﻿﻿﻿import { renderTabBar } from '../components/tab-bar.js?v=20260812d';
import { renderReportEntryHtml, bindReportEntry } from '../components/report-entry.js?v=20260812d';
import { renderWorkOverview } from '../components/work-overview.js?v=20260812d';
import { AuthStore } from '../services/auth.js?v=20260812d';
import { getAppState, setState, registerRenderCallback } from '../core/state.js?v=20260812d';
import { BranchService, isApiMode } from '../services/runtime.js?v=20260812d';
import { showToast, flashHighlight } from '../core/utils.js?v=20260812d';
import { CrossPageState } from '../core/cross-page-state.js?v=20260812d';
import { bootstrapPage } from '../core/bootstrap.js?v=20260812d';
import { solidAccentStyle } from '../core/constants.js?v=20260812d';
import { TaskForceRecordStore } from '../services/taskforce.js?v=20260812d';
import { _personName } from '../mock/index.js?v=20260812d';
import { loadWorkspaceData } from '../core/data-loader.js?v=20260812d';
import { icon } from '../core/icons.js?v=20260812d';
import { mockDB } from '../core/domain.js?v=20260812d';
import { persist, getAuthToken, getApiBaseUrl } from '../core/data-adapter.js?v=20260812d';
import { loadActivities } from '../services/activity.js?v=20260812d';
import { renderMyDispatchTab, bindMyDispatchEvents } from '../services/issues.js?v=20260812d';
import { renderTodoList } from '../components/todo-list.js?v=20260812d';
import { TodoStore, TodoSourceType, seedTodos } from '../services/todo.js?v=20260812d';
import { NoticeStore } from '../services/notice.js?v=20260812d';
import { badgeHtml } from '../components/badge.js?v=20260812d';
import { addExternalDispatch } from '../services/external-dispatch.js?v=20260812d';

const { accent, accentRgba, accentBorder } = await bootstrapPage({ module: 'workspace', accentRole: 'prop-commissioner' });

let _propNavTarget = null; // { tfId, actId } URL 导航目标（跨重渲染保持，定位完成后清除）
// "有待办必见待办"一次性消费标志（书记 2026-08-10 裁定）
let _todoPriorityConsumed = false;

function renderPropUI(state) {
  let activities = state.activities || [];
  const allActivities = loadActivities();
  if (activities.length === 0 && allActivities.length > 0) {
    activities = allActivities.map(a => ({ ...a, visibility: 'branch', executor: a.organizer || 'u_exec', supervisor: null, createdBy: a.organizer || 'u_exec', createdAt: a.date || new Date().toISOString() }));
    setState({ activities });
    return;
  }

  const container = document.getElementById('prop-content');
  if (!container) return;

  const taskforces = TaskForceRecordStore.getAll();
  const propTf = taskforces.filter(t => t.name.includes('宣传') || t.initiator === 'p12');

  // 有待办必见待办（书记 2026-08-10 裁定）：仅首次渲染生效
  let priorityTab;
  if (!_todoPriorityConsumed) {
    _todoPriorityConsumed = true;
    priorityTab = TodoStore.getGroupedByAction('prop-commissioner').length > 0 ? 'todo' : undefined;
  }

  const tabBar = renderTabBar({
    prefix: 'prop',
    tabs: [
      { id: 'todo', label: '待办', render: () => _renderTodoContent(), groupLabel: '工作台' },
      // 工作概况（书记 2026-08-10 裁定：全部角色新增——汇报/卡点/在办三区总览 + 条线数据注入）
      { id: 'overview', label: '工作概况', render: () => { const el = document.getElementById('prop-tab-content'); if (el) return renderWorkOverview(el, { role: 'prop-commissioner', personId: AuthStore.getCurrentUser()?.personId || 'p12', accent, prefix: 'prop' }); }, groupLabel: '工作台' },
      { id: 'tasks', label: '宣传任务', render: (ctx) => _renderTasksContent(), groupLabel: '党建' },
      { id: 'kanban', label: '项目看板', render: (ctx) => _renderKanbanContent(ctx.activities, ctx.propTf), groupLabel: '党建' },
      { id: 'weekly', label: '周报报送', render: (ctx) => _renderWeeklyContent(), groupLabel: '党建' },
      { id: 'archive', label: '档案归档', render: (ctx) => _renderArchiveContent(), groupLabel: '党建' },
      { id: 'my-dispatch', label: '我的处置', render: () => { const el = document.getElementById('prop-tab-content'); if (el) { el.innerHTML = renderMyDispatchTab('prop-commissioner', 'u_prop'); bindMyDispatchEvents(el, 'prop-commissioner', 'u_prop'); } }, groupLabel: '反馈' },
    ],
    accentColor: { accent, accentRgba, accentBorder },
    extraRightHtml: renderReportEntryHtml({ accent, accentRgba }),
    renderCtx: { activities, propTf },
    storageKey: 'workflowos_tab_prop',
    defaultTab: 'todo',
    priorityTab,
  });

  container.innerHTML = tabBar.html;

  tabBar.bindEvents(container);
  bindReportEntry(container);
  tabBar.activate(tabBar.activeTab);

  // ── 首页跳转落点（书记 2026-08-08 裁定：activityId / view=activities / taskforceId 必须消费）──
  // 目标保持到定位完成（loadWorkspaceData 双 setState 会重渲染），提取后立即清除 URL 参数。
  // 宣传无活动/专班专属 tab，由「项目看板」承载（现状即权限，只做定位），定位高亮目标卡片。
  if (!_propNavTarget) {
    const urlParams = CrossPageState.getURLParams();
    const tfId = urlParams.taskforceId;
    const actId = urlParams.activityId;
    if (tfId || actId || urlParams.view === 'activities') {
      _propNavTarget = { tfId, actId };
      CrossPageState.clearParam('activityId');
      CrossPageState.clearParam('taskforceId');
      CrossPageState.clearParam('view');
    }
  }
  if (_propNavTarget) {
    tabBar.activate('kanban');
    if (_propNavTarget.tfId || _propNavTarget.actId) {
      setTimeout(() => {
        const target = _propNavTarget.tfId
          ? container.querySelector(`.kanban-card[data-kt="taskforce"][data-ki="${_propNavTarget.tfId}"]`)
          : container.querySelector(`.kanban-card[data-kt="activity"][data-ki="${_propNavTarget.actId}"]`);
        if (target) {
          target.scrollIntoView({ behavior: 'smooth', block: 'center' });
          flashHighlight(target);
        }
        _propNavTarget = null; // 无论成败：最终 DOM 已稳定，清除导航目标
      }, 150);
    } else {
      _propNavTarget = null; // 纯 view=activities：无定位目标，立即清除
    }
  }
}

// ── 待办列表+详情面板（最小三成本原则落地） ───────────────────
let _selectedTodoId = null;
let _todoAggregates = null;

function _renderTodoContent() {
  const container = document.getElementById('prop-tab-content');
  if (!container) return;

  // 刷新过期状态
  TodoStore.refreshExpiredStatus();

  _todoAggregates = TodoStore.getGroupedByAction('prop-commissioner');
  const stats = TodoStore.getStatsByRole('prop-commissioner');
  // 自动选中首条（书记 2026-08-10 裁定推广）：进入待办即见第一条详情，减一次点击
  if (!_selectedTodoId && _todoAggregates.length > 0) {
    _selectedTodoId = _todoAggregates[0].groupKey;
  }
  const selectedTodo = _selectedTodoId ? (
    _todoAggregates.find(g => g.groupKey === _selectedTodoId) || TodoStore.getById(_selectedTodoId)
  ) : null;

  const { html: todoListHtml, bindEvents } = renderTodoList({
    prefix: 'prop',
    groupedAggregates: _todoAggregates,
    stats,
    accent,
    onSelectTodo: (todo) => {
      _selectedTodoId = todo.groupKey || todo.id;
      _renderTodoContent();
    },
    onActionTodo: (todo) => {
      _handleTodoAction(todo);
    },
  });

  const detailHtml = selectedTodo ? _renderTodoDetail(selectedTodo) : `
    <div class="text-center py-12 text-gray-400">
      <p class="text-sm">点击左侧待办查看详情</p>
      <p class="text-xs mt-1">或直接点击"去赋权/去审核"等按钮处理</p>
    </div>
  `;

  container.innerHTML = `
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div class="lg:col-span-2">
        <div class="card rounded-xl p-5">
          <div class="flex items-center justify-between mb-4">
            <h3 class="font-title-cn text-base font-semibold text-gray-800">我的待办</h3>
          </div>
          ${todoListHtml}
        </div>
      </div>
      <div class="lg:col-span-1">
        <div class="card rounded-xl p-5 sticky top-20">
          <h3 class="font-title-cn text-base font-semibold text-gray-800 mb-4">详情</h3>
          ${detailHtml}
        </div>
      </div>
    </div>
  `;

  bindEvents(container);
  _bindTodoDetailEvents();
}

function _renderTodoDetail(todo) {
  // 聚合对象：概要 + 处理入口（明细在业务界面逐条处理）
  if (todo.groupKey) {
    return `
      <div class="space-y-3">
        <div class="flex items-center gap-2">
          <span class="agg-count-badge text-xs px-1.5 py-0.5 rounded-full font-semibold tabular-nums">${todo.count} 条待处理</span>
          ${todo.priority === 'urgent' ? badgeHtml('紧急', 'warning') : ''}
        </div>
        <p class="font-title-cn text-sm font-bold text-gray-800">${todo.title}</p>
        ${todo.flow ? `<p class="text-xs text-gray-600 leading-relaxed">${todo.flow}</p>` : ''}
        ${todo.deadline ? `<div class="text-xs text-gray-500">最早截止：${todo.deadline}</div>` : ''}
        <div class="pt-3 border-t border-gray-100 flex gap-2">
          <button class="prop-todo-detail-action text-xs px-3 py-1.5 rounded-lg text-white transition-colors hover:opacity-90" style="${solidAccentStyle(accent, accentBorder)}">去处理</button>
        </div>
      </div>
    `;
  }

  const statusLabel = {
    pending: '待处理',
    in_progress: '进行中',
    completed: '已完成',
    expired: '已过期',
  }[todo.status] || todo.status;

  const statusColor = {
    pending: 'bg-orange-100 text-orange-700',
    in_progress: 'bg-blue-100 text-blue-700',
    completed: 'bg-green-100 text-green-700',
    expired: 'bg-red-100 text-red-700',
  }[todo.status] || 'bg-gray-100 text-gray-500';

  return `
    <div class="space-y-3">
      <div>
        <div class="flex items-center gap-2 mb-2">
          <span class="text-xs px-1.5 py-0.5 rounded-full ${statusColor}">${statusLabel}</span>
          ${todo.priority === 'urgent' ? badgeHtml('紧急', 'warning') : ''}
        </div>
        <p class="font-title-cn text-sm font-bold text-gray-800">${todo.title}</p>
      </div>
      ${todo.description ? `<p class="text-xs text-gray-600 leading-relaxed">${todo.description}</p>` : ''}
      ${todo.deadline ? `<div class="text-xs text-gray-500">截止：${todo.deadline}</div>` : ''}
      <div class="text-xs text-gray-400">创建：${(todo.createdAt || '').slice(0, 16).replace('T', ' ')}</div>
      <div class="pt-3 border-t border-gray-100 flex gap-2">
        ${todo.actionType ? `<button class="prop-todo-detail-action text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">处理</button>` : ''}
      </div>
    </div>
  `;
}

function _handleTodoAction(todo) {
  // 通知阅读待办（T-234 F1）：直达通知详情页（聚合时取首条 noticeId）
  const firstNotice = (todo.items && todo.items[0]) || todo;
  if (firstNotice.sourceType === 'notice' && (firstNotice.actionData?.noticeId || todo.actionData?.noticeId)) {
    const noticeId = firstNotice.actionData?.noticeId || todo.actionData?.noticeId;
    const basePath = window.location.pathname.includes('/workspace/') ? '../' : '';
    window.location.href = `${basePath}notice.html?id=${noticeId}`;
    return;
  }
  // 根据 actionType 跳转到对应 tab
  const tabMap = {
    submit: 'tasks',
    archive: 'archive',
  };
  const targetTab = tabMap[todo.actionType];
  if (targetTab) {
    const btn = document.querySelector(`.prop-tab-btn[data-prop-tab="${targetTab}"]`);
    if (btn) btn.click();
    const tabLabels = { submit: '宣传任务', archive: '档案归档' };
    showToast('info', `已跳转到${tabLabels[todo.actionType] || '对应功能'}，请处理：${todo.title}`);
  } else {
    showToast('info', `请处理：${todo.title}`);
  }
}

function _bindTodoDetailEvents() {
  const container = document.getElementById('prop-tab-content');
  if (!container) return;
  container.querySelector('.prop-todo-detail-action')?.addEventListener('click', () => {
    if (!_selectedTodoId) return;
    const group = _todoAggregates?.find(g => g.groupKey === _selectedTodoId);
    if (group) { _handleTodoAction(group); return; }
    const todo = TodoStore.getById(_selectedTodoId);
    if (todo) _handleTodoAction(todo);
  });
}

// ── 宣传任务 mock 数据（2026-08-05：seed 常量 + mockDB 持久化，刷新不再丢失）──
const PROP_TASKS_SEED = [
  { id: 'pt1', source: '支部委员会', type: '新闻稿', summary: '七一主题党日活动新闻稿', status: 'pending', createdAt: '2026-07-25' },
  { id: 'pt2', source: '副书记', type: '推送排版', summary: '发展对象公示推送排版', status: 'in_progress', createdAt: '2026-07-24' },
  { id: 'pt3', source: '支部委员会', type: '素材归档', summary: '上半年活动照片归档整理', status: 'in_progress', createdAt: '2026-07-22' },
  { id: 'pt4', source: '组织委员', type: '周报报送', summary: '第30周党建工作周报', status: 'submitted', createdAt: '2026-07-21' },
  { id: 'pt5', source: '支部委员会', type: '新闻稿', summary: '预备党员转正大会新闻稿', status: 'pending', createdAt: '2026-07-20' },
  { id: 'pt6', source: '副书记', type: '推送排版', summary: '组织生活会预告推送', status: 'pending', createdAt: '2026-07-19' },
  { id: 'pt7', source: '支部委员会', type: '素材归档', summary: '入党积极分子培训资料归档', status: 'submitted', createdAt: '2026-07-18' },
  { id: 'pt8', source: '组织委员', type: '周报报送', summary: '第29周党建工作周报', status: 'submitted', createdAt: '2026-07-14' },
];

// 从 mockDB 读取（seed 兜底注入一次）；写操作须更新 mockDB.propTasks 后调用 persist()
function _loadPropTasks() {
  if (mockDB.propTasks.length === 0 && PROP_TASKS_SEED.length > 0) {
    mockDB.propTasks = PROP_TASKS_SEED.map(t => ({ ...t }));
  }
  return mockDB.propTasks;
}

// 任务状态流转：待接收 → 进行中 → 已提交
const TASK_STATUS_FLOW = { pending: 'in_progress', in_progress: 'submitted' };
const TASK_STATUS_LABEL = { pending: '待接收', in_progress: '进行中', submitted: '已提交' };
const TASK_STATUS_STYLE = {
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  in_progress: 'bg-blue-50 text-blue-700 border-blue-200',
  submitted: 'bg-green-50 text-green-700 border-green-200',
};
const TASK_TYPE_STYLE = {
  '素材归档': 'bg-purple-50 text-purple-700',
  '新闻稿': 'bg-rose-50 text-rose-700',
  '推送排版': 'bg-sky-50 text-sky-700',
  '周报报送': 'bg-teal-50 text-teal-700',
};

function _renderTasksContent() {
  const container = document.getElementById('prop-tab-content');
  if (!container) return;

  // 按状态分组
  const pending = _loadPropTasks().filter(t => t.status === 'pending');
  const inProgress = _loadPropTasks().filter(t => t.status === 'in_progress');
  const submitted = _loadPropTasks().filter(t => t.status === 'submitted');

  container.innerHTML = `
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
      <div class="card rounded-xl p-0 overflow-hidden">
        <div class="px-4 py-3 font-title-cn text-sm font-bold" style="--acc-bg-dark:rgba(251,191,36,0.10);--acc-text-dark:#FBBF24;--acc-border-dark:rgba(251,191,36,0.25);background:rgba(245,158,11,0.06);color:#d97706;border-bottom:2px solid rgba(245,158,11,0.15);">待接收 (${pending.length})</div>
        <div class="p-3 space-y-2 min-h-[120px]">
          ${pending.length === 0 ? '<p class="text-xs text-gray-400 text-center py-6">暂无待接收任务</p>' :
            pending.map(t => _renderTaskCard(t)).join('')}
        </div>
      </div>
      <div class="card rounded-xl p-0 overflow-hidden">
        <div class="px-4 py-3 font-title-cn text-sm font-bold" style="--acc-bg-dark:rgba(96,165,250,0.10);--acc-text-dark:#60A5FA;--acc-border-dark:rgba(96,165,250,0.25);background:rgba(59,130,246,0.06);color:#3b82f6;border-bottom:2px solid rgba(59,130,246,0.15);">进行中 (${inProgress.length})</div>
        <div class="p-3 space-y-2 min-h-[120px]">
          ${inProgress.length === 0 ? '<p class="text-xs text-gray-400 text-center py-6">暂无进行中任务</p>' :
            inProgress.map(t => _renderTaskCard(t)).join('')}
        </div>
      </div>
      <div class="card rounded-xl p-0 overflow-hidden">
        <div class="px-4 py-3 font-title-cn text-sm font-bold" style="--acc-bg-dark:rgba(52,211,153,0.10);--acc-text-dark:#34D399;--acc-border-dark:rgba(52,211,153,0.25);background:rgba(16,185,129,0.06);color:#10b981;border-bottom:2px solid rgba(16,185,129,0.15);">已提交 (${submitted.length})</div>
        <div class="p-3 space-y-2 min-h-[120px]">
          ${submitted.length === 0 ? '<p class="text-xs text-gray-400 text-center py-6">暂无已提交任务</p>' :
            submitted.map(t => _renderTaskCard(t)).join('')}
        </div>
      </div>
    </div>
  `;

  // 推进状态按钮事件
  container.querySelectorAll('.task-advance-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const taskId = btn.dataset.taskId;
      const task = _loadPropTasks().find(t => t.id === taskId);
      if (!task) return;
      const nextStatus = TASK_STATUS_FLOW[task.status];
      if (!nextStatus) return;
      task.status = nextStatus;
      persist();
      showToast('success', `任务「${task.summary}」已${TASK_STATUS_LABEL[nextStatus]}`);
      _renderTasksContent();
    });
  });
}

function _renderTaskCard(task) {
  const isFinal = task.status === 'submitted';
  const advanceLabel = task.status === 'pending' ? '接收' : '提交';
  const advanceBtn = !isFinal
    ? `<button class="task-advance-btn text-xs px-3 py-1.5 rounded-lg bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100 transition-colors mt-1" data-task-id="${task.id}" onclick="event.stopPropagation();">${advanceLabel}</button>`
    : '';
  const typeStyle = TASK_TYPE_STYLE[task.type] || 'bg-gray-50 text-gray-700';
  const statusStyle = TASK_STATUS_STYLE[task.status];

  return `
    <div class="p-3 rounded-xl bg-white hover:bg-gray-50 transition-colors">
      <div class="flex items-center gap-2 mb-1">
        <span class="text-xs px-1.5 py-0.5 rounded-full ${typeStyle}">${task.type}</span>
        <span class="text-xs px-1.5 py-0.5 rounded-full border ${statusStyle}">${TASK_STATUS_LABEL[task.status]}</span>
      </div>
      <div class="text-sm font-medium text-gray-800 mt-1">${task.summary}</div>
      <div class="flex items-center justify-between mt-1.5">
        <span class="text-xs text-gray-400">来自：${task.source} · ${task.createdAt}</span>
        ${advanceBtn}
      </div>
    </div>`;
}

function _renderKanbanContent(activities, propTf) {
  const container = document.getElementById('prop-tab-content');
  if (!container) return;

  // ── 从 TaskForceRecordStore 动态派生看板数据（H-1 数据断裂修复） ──
  // 活动按状态分桶
  const pendingActs = activities.filter(a => a.status === 'draft');
  const activeActs = activities.filter(a => a.status === 'published' || a.status === 'ongoing');
  const completedActs = activities.filter(a => a.status === 'completed');

  // 专班按状态分桶（宣传相关）
  const pendingTf = propTf.filter(t => t.status === 'draft' || t.status === 'pending_review' || t.status === 'recruiting');
  const activeTf = propTf.filter(t => t.status === 'active');
  const completedTf = propTf.filter(t => t.status === 'completed' || t.status === 'archived');

  // 合并待启动：活动 + 专班（T223 桶内新者在前）
  const pending = [
    ...pendingActs.map(a => ({ _type: 'activity', ...a })),
    ...pendingTf.map(t => ({ _type: 'taskforce', id: t.id, title: t.name, date: t.deadline || t.createdAt, type: '专班', status: t.status, task: t.task, capacity: t.capacity, filled: t.members.filter(m => m.personId).length })),
  ].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  // 合并进行中：活动 + 专班（T223 桶内新者在前）
  const active = [
    ...activeActs.map(a => ({ _type: 'activity', ...a })),
    ...activeTf.map(t => ({ _type: 'taskforce', id: t.id, title: t.name, date: t.deadline || t.createdAt, type: '专班', status: t.status, task: t.task, capacity: t.capacity, filled: t.members.filter(m => m.personId).length })),
  ].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  // 合并已归档：活动 + 专班（T223 桶内新者在前）
  const completed = [
    ...completedActs.map(a => ({ _type: 'activity', ...a })),
    ...completedTf.map(t => ({ _type: 'taskforce', id: t.id, title: t.name, date: t.deadline || t.createdAt, type: '专班', status: t.status, task: t.task, capacity: t.capacity, filled: t.members.filter(m => m.personId).length })),
  ].sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  container.innerHTML = `
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
      <div class="card rounded-xl p-0 overflow-hidden">
        <div class="px-4 py-3 font-title-cn text-sm font-bold" style="--acc-bg-dark:rgba(96,165,250,0.10);--acc-text-dark:#60A5FA;--acc-border-dark:rgba(96,165,250,0.25);background:rgba(37,99,235,0.06);color:#2563eb;border-bottom:2px solid rgba(37,99,235,0.15);">待启动 (${pending.length})</div>
        <div class="p-3 space-y-2 min-h-[120px]">
          ${pending.length === 0 ? '<p class="text-xs text-gray-400 text-center py-6">暂无待启动项目</p>' :
            pending.map(item => _renderKanbanItem(item)).join('')}
        </div>
      </div>
      <div class="card rounded-xl p-0 overflow-hidden">
        <div class="px-4 py-3 font-title-cn text-sm font-bold" style="--acc-bg-dark:rgba(96,165,250,0.10);--acc-text-dark:#60A5FA;--acc-border-dark:rgba(96,165,250,0.25);background:rgba(59,130,246,0.06);color:#3b82f6;border-bottom:2px solid rgba(59,130,246,0.15);">进行中 (${active.length})</div>
        <div class="p-3 space-y-2 min-h-[120px]">
          ${active.length === 0 ? '<p class="text-xs text-gray-400 text-center py-6">暂无进行中项目</p>' :
            active.map(item => _renderKanbanItem(item, true)).join('')}
        </div>
      </div>
    </div>
    ${completed.length > 0 ? `
    <details class="card rounded-xl p-0 overflow-hidden">
      <summary class="px-4 py-3 font-title-cn text-sm font-bold cursor-pointer select-none" style="--acc-bg-dark:rgba(148,163,184,0.10);--acc-text-dark:#94A3B8;--acc-border-dark:rgba(148,163,184,0.25);background:rgba(107,114,128,0.06);color:#6B7280;border-bottom:2px solid rgba(107,114,128,0.15);">已归档 (${completed.length})</summary>
      <div class="p-3 space-y-2">
        ${completed.map(item => _renderKanbanItem(item)).join('')}
      </div>
    </details>` : ''}
    ${_renderWorkloadBlock(propTf)}
  `;

  // ── "确认完成"按钮事件绑定 ──
  container.querySelectorAll('.activity-complete-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const actId = btn.dataset.actId;
      const activity = activities.find(a => a.id === actId);
      if (!activity) return;
      const confirmed = window.confirm(`确认完成活动「${activity.title || '未命名'}」？完成后将归入已归档。`);
      if (!confirmed) return;
      activity.status = 'completed';
      BranchService.updateActivity(actId, { status: 'completed' });
      persist(); // 扎口修复（Z1/Z3）：updateActivity 内部不落盘，必须显式 persist 写穿
      // 做事即销待办：活动完成 → 销宣传侧「活动归档」/书记「待复盘」
      TodoStore.completeBySource(TodoSourceType.ACTIVITY, actId);
      TodoStore.completeBySource(TodoSourceType.ACTIVITY, `review_${actId}`);
      showToast('success', `活动「${activity.title || '未命名'}」已完成并归档`);
      renderPropUI(getAppState());
    });
  });
  container.querySelectorAll('.tf-complete-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const tfId = btn.dataset.tfId;
      const tf = TaskForceRecordStore.getAll().find(r => r.id === tfId);
      if (!tf || tf.status !== 'active') return;
      // T-224 §7 关闭权归组织委员：宣传端仅「归档」（active→archived 合法迁移），不置 completed（解散语义）
      const confirmed = window.confirm(`确认归档专班「${tf.name}」？归档不回收赋权、不生成工作量报告；解散由组织委员执行。`);
      if (!confirmed) return;
      TaskForceRecordStore.updateStatus(tfId, 'archived');
      // 做事即销待办：专班归档 → 销「专班归档」待办
      TodoStore.completeBySource(TodoSourceType.TASKFORCE, tfId);
      // 2026-08-08 归档闭环：专班归档 → 配套通知随之一并归档，退出工作区
      NoticeStore.archiveBySource('taskforce', tfId);
      showToast('success', `专班「${tf.name}」已归档`);
      renderPropUI(getAppState());
    });
  });
}

function _renderKanbanItem(item, showCompleteBtn = false) {
  const isTf = item._type === 'taskforce';
  const typeTag = isTf
    ? badgeHtml('专班', 'success')
    : (item.type ? badgeHtml(item.type, 'info') : '');
  const subInfo = isTf
    ? `<span class="text-xs text-gray-400">${item.filled}/${item.capacity} 人</span>`
    : '';
  const completeBtn = showCompleteBtn
    ? (isTf
      ? `<button class="tf-complete-btn text-xs px-3 py-1.5 rounded-lg bg-green-50 text-green-600 border border-green-200 hover:bg-green-100 transition-colors mt-1" data-tf-id="${item.id}" onclick="event.stopPropagation();">归档专班</button>`
      : `<button class="activity-complete-btn text-xs px-3 py-1.5 rounded-lg bg-green-50 text-green-600 border border-green-200 hover:bg-green-100 transition-colors mt-1" data-act-id="${item.id}" onclick="event.stopPropagation();">确认完成</button>`)
    : '';
  return `
    <div class="kanban-card p-3 rounded-xl bg-white hover:bg-gray-200 transition-colors cursor-pointer" data-kt="${item._type}" data-ki="${item.id}">
      <div class="flex items-center gap-2 mb-0.5">
        <span class="text-sm font-medium text-gray-800">${item.title || '未命名'}</span>
        ${typeTag}
      </div>
      <div class="text-xs text-gray-500 mt-0.5">${item.date || ''} ${subInfo}</div>
      ${isTf && item.task ? `<div class="text-[12px] text-gray-400 mt-0.5 line-clamp-1">${item.task}</div>` : ''}
      ${completeBtn}
    </div>`;
}

// ── 专班工作量区块（融入项目看板 tab 底部） ──
function _renderWorkloadBlock(propTf) {
  const workloadMap = {};
  propTf.forEach(tf => {
    tf.members.forEach(m => {
      if (!m.personId) return;
      if (!workloadMap[m.personId]) workloadMap[m.personId] = { personId: m.personId, contributions: 0, tfCount: 0, roles: new Set() };
      workloadMap[m.personId].contributions += (m.contributions || []).length;
      workloadMap[m.personId].tfCount += 1;
      workloadMap[m.personId].roles.add(m.role);
    });
  });
  const members = Object.values(workloadMap);

  return `
    <div class="card rounded-xl p-5 mt-4">
      <div class="flex items-center gap-2 mb-3">
        <h4 class="text-sm font-bold text-gray-700">专班工作量</h4>
        ${badgeHtml(`${propTf.length} 个专班`, 'warning')}
      </div>
      ${members.length === 0 ? '<p class="text-xs text-gray-400">暂无宣传专班成员数据</p>' :
        `<div class="space-y-2">${members.map(m => `
          <div class="flex items-center justify-between p-2 rounded-lg bg-white">
            <div class="flex items-center gap-2">
              <span class="text-xs font-medium text-gray-700">${_personName(m.personId)}</span>
              <span class="text-xs text-gray-400">${Array.from(m.roles).join('·')}</span>
            </div>
            <div class="flex items-center gap-3 text-xs text-gray-500">
              <span>${m.contributions} 产出</span>
              <span>${m.tfCount} 专班</span>
            </div>
          </div>
        `).join('')}</div>`}
    </div>
  `;
}

// ── 档案归档 ─────────────────────────────────────────────
// 种子数据已提升为全局（mock/seed.js SEED_ARCHIVE_RECORDS，loadDB 时注入），
// 保证产出物区/关闭条件等跨页同源读取；本页只做纯读。
function _loadArchiveRecords() {
  return mockDB.archiveRecords || [];
}

const ARCHIVE_CATEGORY_STYLE = {
  '新闻稿': 'bg-rose-50 text-rose-700',
  '照片': 'bg-sky-50 text-sky-700',
  '视频': 'bg-violet-50 text-violet-700',
  '其他': 'bg-gray-50 text-gray-600',
};
const ARCHIVE_STATUS_LABEL = { pending: '待归档', in_progress: '归档中', archived: '已归档' };
const ARCHIVE_STATUS_STYLE = {
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  in_progress: 'bg-blue-50 text-blue-700 border-blue-200',
  archived: 'bg-green-50 text-green-700 border-green-200',
};

// ── 材料标准数据 ──
const MATERIAL_STANDARDS = [
  { category: '新闻稿', standard: '含标题、正文、配图（3张以上）、署名，Word + PDF 双格式' },
  { category: '照片', standard: '原图（≥3MB），横版为主，含全景+特写，命名：日期_活动名_序号' },
  { category: '视频', standard: '1080p 及以上，稳定画面，含字幕更佳，MP4 格式' },
  { category: '其他', standard: '根据材料类型确保完整性和可追溯性' },
];

// ── 模板数据 ──
const ARCHIVE_TEMPLATES = [
  { id: 'tpl1', name: '活动新闻稿模板', category: '新闻稿', format: 'Word' },
  { id: 'tpl2', name: '照片归档清单模板', category: '照片', format: 'Excel' },
  { id: 'tpl3', name: '视频元数据表模板', category: '视频', format: 'Excel' },
];

function _renderArchiveContent() {
  const container = document.getElementById('prop-tab-content');
  if (!container) return;

  container.innerHTML = `
    <div class="mb-4 flex flex-col sm:flex-row gap-3">
      <div class="relative flex-1">
        <input id="archive-search" type="text" placeholder="搜索活动名称..." class="input-flat text-xs flex-1 pl-8" />
        ${icon('search', { className: 'absolute left-2.5 top-2.5 w-3.5 h-3.5 text-gray-400' })}
      </div>
      <select id="archive-filter-category" class="input-flat text-xs">
        <option value="">全部类别</option>
        <option value="新闻稿">新闻稿</option>
        <option value="照片">照片</option>
        <option value="视频">视频</option>
        <option value="其他">其他</option>
      </select>
      <select id="archive-filter-status" class="input-flat text-xs">
        <option value="">全部状态</option>
        <option value="pending">待归档</option>
        <option value="in_progress">归档中</option>
        <option value="archived">已归档</option>
      </select>
      <button id="archive-upload-btn" class="text-xs px-3 py-2 rounded-lg text-white transition-colors hover:opacity-90 flex-shrink-0 flex items-center justify-center gap-1.5" style="${solidAccentStyle(accent, accentBorder)}">
        ${icon('upload', { className: 'w-3.5 h-3.5' })}
        <span>上传材料</span>
      </button>
    </div>

    <div id="archive-list" class="space-y-2 mb-6">
      ${_renderArchiveList(_loadArchiveRecords())}
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div class="card rounded-xl p-5">
        <div class="flex items-center gap-2 mb-3">
          ${icon('fileText', { className: 'w-4 h-4 text-blue-600' })}
          <span class="text-sm font-semibold text-gray-700">材料标准</span>
        </div>
        <div class="space-y-2">
          ${MATERIAL_STANDARDS.map(s => `
            <div class="p-2.5 rounded-lg bg-gray-50">
              <span class="text-xs px-1.5 py-0.5 rounded-full ${ARCHIVE_CATEGORY_STYLE[s.category]} mr-1.5">${s.category}</span>
              <span class="text-xs text-gray-600">${s.standard}</span>
            </div>
          `).join('')}
        </div>
      </div>

      <div class="card rounded-xl p-5">
        <div class="flex items-center gap-2 mb-3">
          ${icon('download', { className: 'w-4 h-4 text-purple-600' })}
          <h4 class="text-sm font-bold text-gray-700">模板下载</h4>
        </div>
        <div class="space-y-2">
          ${ARCHIVE_TEMPLATES.map(t => `
            <div class="flex items-center justify-between p-2.5 rounded-lg bg-gray-50">
              <div>
                <span class="text-xs font-medium text-gray-700">${t.name}</span>
                <span class="text-xs px-1.5 py-0.5 rounded-full ${ARCHIVE_CATEGORY_STYLE[t.category]} ml-1.5">${t.category}</span>
              </div>
              <button class="archive-tpl-btn text-xs px-3 py-1.5 rounded-lg bg-white text-blue-600 border border-blue-200 hover:bg-blue-50 transition-colors" data-tpl-name="${t.name}">下载</button>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;

  // 搜索/筛选事件
  const searchInput = container.querySelector('#archive-search');
  const filterCategory = container.querySelector('#archive-filter-category');
  const filterStatus = container.querySelector('#archive-filter-status');
  const applyFilter = () => {
    const keyword = searchInput.value.trim().toLowerCase();
    const cat = filterCategory.value;
    const status = filterStatus.value;
    const filtered = _loadArchiveRecords().filter(r => {
      if (keyword && !r.activityName.toLowerCase().includes(keyword)) return false;
      if (cat && r.category !== cat) return false;
      if (status && r.status !== status) return false;
      return true;
    });
    container.querySelector('#archive-list').innerHTML = _renderArchiveList(filtered);
  };
  searchInput.addEventListener('input', applyFilter);
  filterCategory.addEventListener('change', applyFilter);
  filterStatus.addEventListener('change', applyFilter);

  // 归档推进按钮：弹出材料确认浮窗而非直接推进
  container.querySelectorAll('.archive-advance-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const recordId = btn.dataset.recordId;
      const record = _loadArchiveRecords().find(r => r.id === recordId);
      if (!record || record.status === 'archived') return;
      _showArchiveAdvancePopover(record, btn);
    });
  });

  // 模板下载按钮
  container.querySelectorAll('.archive-tpl-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      showToast('info', `模板「${btn.dataset.tplName}」下载已开始`);
    });
  });

  // 上传材料按钮（attachments 双模式：mock base64 / server multipart）
  container.querySelector('#archive-upload-btn')?.addEventListener('click', () => {
    _showArchiveUploadModal();
  });
}

function _renderArchiveList(records) {
  if (records.length === 0) {
    return '<p class="text-xs text-gray-400 text-center py-8">无匹配的归档记录</p>';
  }
  // 按日期降序排列（新日期在前）
  const sorted = [...records].sort((a, b) => (b.archiveDate || '').localeCompare(a.archiveDate || ''));
  return sorted.map(r => {
    const catStyle = ARCHIVE_CATEGORY_STYLE[r.category] || 'bg-gray-50 text-gray-600';
    const statusStyle = ARCHIVE_STATUS_STYLE[r.status];
    const isFinal = r.status === 'archived';
    const isInProgress = r.status === 'in_progress';
    const advanceLabel = r.status === 'pending' ? '开始归档' : '确认归档';
    const advanceBtn = !isFinal
      ? `<button class="archive-advance-btn text-xs px-3 py-1.5 rounded-lg bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100 transition-colors" data-record-id="${r.id}" onclick="event.stopPropagation();">${advanceLabel}</button>`
      : '';
    // 归档中状态显示进度
    const progressHtml = isInProgress && r._checklistState
      ? `<span class="text-xs text-blue-600">材料 ${r._checklistState.checked}/${r._checklistState.total}</span>`
      : '';
    // 已归档状态显示完成标记
    const doneHtml = isFinal
      ? `<span class="text-xs text-green-600">✓</span>`
      : '';
    return `
      <div class="p-3 rounded-xl bg-white hover:bg-gray-50 transition-colors flex items-center justify-between gap-3">
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 mb-0.5">
            <span class="text-sm font-medium text-gray-800 truncate">${r.activityName}</span>
            <span class="text-xs px-1.5 py-0.5 rounded-full ${catStyle} shrink-0">${r.category}</span>
            <span class="text-xs px-1.5 py-0.5 rounded-full border ${statusStyle} shrink-0">${ARCHIVE_STATUS_LABEL[r.status]}</span>
            ${progressHtml}${doneHtml}
          </div>
          <span class="text-xs text-gray-400">归档日期：${r.archiveDate}</span>
        </div>
        ${advanceBtn}
      </div>`;
  }).join('');
}

// ── 周报报送 seed 数据（2026-08-05：seed 常量 + mockDB 持久化，刷新不再丢失）──
const WEEKLY_REPORTS_SEED = [
  { id: 'wr1', week: '第30周', weekRange: '2026-07-21 ~ 2026-07-25', content: '1. 七一主题党日活动新闻稿发布\n2. 发展对象公示推送排版完成\n3. 上半年活动照片归档整理进行中', status: 'submitted', submittedAt: '2026-07-25' },
  { id: 'wr2', week: '第29周', weekRange: '2026-07-14 ~ 2026-07-18', content: '1. 入党积极分子培训资料归档完成\n2. 组织生活会预告推送发布\n3. 配合组织委员完成发展对象材料审核', status: 'submitted', submittedAt: '2026-07-18' },
  { id: 'wr3', week: '第28周', weekRange: '2026-07-07 ~ 2026-07-11', content: '1. 预备党员转正大会新闻稿起草\n2. 七一活动素材整理\n3. 宣传专栏内容更新', status: 'submitted', submittedAt: '2026-07-11' },
  { id: 'wr4', week: '第31周', weekRange: '2026-07-28 ~ 2026-08-01', content: '', status: 'draft', submittedAt: null },
];

// 从 mockDB 读取（seed 兜底注入一次）；写操作须更新 mockDB.weeklyReports 后调用 persist()
function _loadWeeklyReports() {
  if (mockDB.weeklyReports.length === 0 && WEEKLY_REPORTS_SEED.length > 0) {
    mockDB.weeklyReports = WEEKLY_REPORTS_SEED.map(r => ({ ...r }));
  }
  return mockDB.weeklyReports;
}

const WEEKLY_STATUS_LABEL = { draft: '草稿', submitted: '已报送' };
const WEEKLY_STATUS_STYLE = {
  draft: 'bg-amber-50 text-amber-700 border-amber-200',
  submitted: 'bg-green-50 text-green-700 border-green-200',
};

function _renderWeeklyContent() {
  const container = document.getElementById('prop-tab-content');
  if (!container) return;

  const draftReport = _loadWeeklyReports().filter(r => r.status === 'draft').sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))[0] || null;

  container.innerHTML = `
    <div class="grid grid-cols-1 lg:grid-cols-5 gap-4 mb-4">
      <div class="lg:col-span-2 card rounded-xl p-5">
        <div class="flex items-center justify-between mb-4">
          <div class="flex items-center gap-2">
            ${icon('pencil', { className: 'w-4 h-4 text-blue-600' })}
            <h4 class="text-sm font-bold text-gray-700">填写周报</h4>
            ${draftReport ? `<span class="text-xs px-1.5 py-0.5 rounded-full border ${WEEKLY_STATUS_STYLE.draft}">${draftReport.week}</span>` : ''}
          </div>
          <button id="weekly-add-btn" class="text-xs px-3 py-1.5 rounded-lg border border-blue-200 text-blue-600 hover:bg-blue-50 transition-colors">+ 新增周次</button>
        </div>
        <!-- T-209 改进项②：新建周次内联表单（周次标签 + 日期范围） -->
        <div id="weekly-add-form" class="hidden mb-3 p-3 rounded-lg bg-blue-50/50 border border-blue-100">
          <div class="text-[12px] font-bold text-gray-600 mb-2">新建周次</div>
          <div class="flex flex-col gap-2 mb-2">
            <input id="weekly-add-week" type="text" placeholder="周次标签，如：第32周" class="w-full px-3 py-2 text-xs rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-200" />
            <input id="weekly-add-range" type="text" placeholder="日期范围，如：2026-08-04 ~ 2026-08-08" class="w-full px-3 py-2 text-xs rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-200" />
          </div>
          <div class="flex gap-2 justify-end">
            <button id="weekly-add-cancel" type="button" class="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">取消</button>
            <button id="weekly-add-save" type="button" class="text-xs px-3 py-1.5 rounded-lg text-white transition-colors" style="${solidAccentStyle(accent, accentBorder)}">保存</button>
          </div>
        </div>
        <div class="space-y-3">
          <div>
            <label class="text-xs text-gray-500 mb-1.5 block font-medium">选择周次</label>
            <select id="weekly-week" class="input-flat text-xs w-full">
              ${_loadWeeklyReports().map(r => `<option value="${r.id}" ${draftReport && r.id === draftReport.id ? 'selected' : ''}>${r.week}（${r.weekRange}）</option>`).join('')}
            </select>
          </div>
          <div>
            <label class="text-xs text-gray-500 mb-1.5 block font-medium">周报内容</label>
            <textarea id="weekly-content" rows="6" placeholder="请填写本周工作内容，每条一行..." class="w-full px-3 py-2 text-xs rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-200 resize-none">${draftReport ? draftReport.content : ''}</textarea>
          </div>
          <button id="weekly-submit-btn" class="w-full text-sm px-4 py-[7px] font-medium text-white rounded-lg transition-colors" style="${solidAccentStyle(accent, accentBorder)}">报送</button>
        </div>
      </div>

      <div class="lg:col-span-3 card rounded-xl p-5">
        <div class="flex items-center gap-2 mb-3">
          ${icon('clock', { className: 'w-4 h-4 text-gray-500' })}
          <h4 class="text-sm font-bold text-gray-700">报送历史</h4>
        </div>
        <div class="space-y-2">
          ${_loadWeeklyReports().map(r => _renderWeeklyReportItem(r)).join('')}
        </div>
      </div>
    </div>
  `;

  // T-209 改进项②：新增周次表单（展开/取消/保存）
  container.querySelector('#weekly-add-btn').addEventListener('click', () => {
    container.querySelector('#weekly-add-form').classList.toggle('hidden');
  });
  container.querySelector('#weekly-add-cancel')?.addEventListener('click', () => {
    container.querySelector('#weekly-add-form').classList.add('hidden');
  });
  container.querySelector('#weekly-add-save')?.addEventListener('click', () => {
    const week = container.querySelector('#weekly-add-week').value.trim();
    const weekRange = container.querySelector('#weekly-add-range').value.trim();
    if (!week) { showToast('error', '请填写周次标签'); return; }
    if (!weekRange) { showToast('error', '请填写日期范围'); return; }
    const reports = _loadWeeklyReports();
    if (reports.some(r => r.week === week)) { showToast('error', '该周次已存在'); return; }
    reports.push({
      id: 'wr_' + Date.now(),
      week,
      weekRange,
      content: '',
      status: 'draft',
      submittedAt: null,
      createdAt: new Date().toISOString(),
      createdBy: AuthStore.getCurrentUser()?.personId || 'u_prop',
    });
    mockDB.weeklyReports = reports;
    persist();
    showToast('success', '已新建周次，自动选中待填写');
    _renderWeeklyContent();
  });

  // 报送按钮
  const submitBtn = container.querySelector('#weekly-submit-btn');
  submitBtn.addEventListener('click', () => {
    const selectEl = container.querySelector('#weekly-week');
    const textareaEl = container.querySelector('#weekly-content');
    const reportId = selectEl.value;
    const content = textareaEl.value.trim();
    if (!content) {
      showToast('error', '请填写周报内容');
      return;
    }
    const report = _loadWeeklyReports().find(r => r.id === reportId);
    if (!report) return;
    report.content = content;
    report.status = 'submitted';
    report.submittedAt = new Date().toISOString().slice(0, 10);
    persist();
    showToast('success', `${report.week}周报已报送`);
    _renderWeeklyContent();
  });

  // 展开/折叠历史详情
  container.querySelectorAll('.weekly-detail-toggle').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const detailEl = btn.closest('.weekly-report-item').querySelector('.weekly-detail-content');
      if (detailEl) {
        detailEl.classList.toggle('hidden');
        btn.textContent = detailEl.classList.contains('hidden') ? '展开' : '收起';
      }
    });
  });
}

function _renderWeeklyReportItem(report) {
  const statusStyle = WEEKLY_STATUS_STYLE[report.status];
  const isSubmitted = report.status === 'submitted';
  return `
    <div class="weekly-report-item p-3 rounded-xl bg-white hover:bg-gray-50 transition-colors">
      <div class="flex items-center justify-between mb-1">
        <div class="flex items-center gap-2">
          <span class="text-sm font-medium text-gray-800">${report.week}</span>
          <span class="text-xs text-gray-400">${report.weekRange}</span>
          <span class="text-xs px-1.5 py-0.5 rounded-full border ${statusStyle}">${WEEKLY_STATUS_LABEL[report.status]}</span>
        </div>
        <div class="flex items-center gap-2">
          ${isSubmitted && report.submittedAt ? `<span class="text-xs text-gray-400">报送于 ${report.submittedAt}</span>` : ''}
          ${report.content ? `<button class="weekly-detail-toggle text-xs px-3 py-1.5 rounded-lg bg-gray-50 text-gray-500 hover:bg-gray-100 transition-colors">展开</button>` : ''}
        </div>
      </div>
      ${report.content ? `<div class="weekly-detail-content hidden mt-2 p-2.5 rounded-lg bg-gray-50 text-xs text-gray-600 whitespace-pre-line">${report.content}</div>` : '<p class="text-xs text-gray-400 mt-1">暂无内容</p>'}
    </div>`;
}

// ════════════════════════════════════════════════════════════════
//  归档推进浮窗：弹出材料确认清单，而非直接改状态标签
// ════════════════════════════════════════════════════════════════
function _showArchiveAdvancePopover(record, triggerBtn) {
  // 移除已有浮窗
  const existing = document.getElementById('archive-advance-popover');
  if (existing) existing.remove();

  const isStart = record.status === 'pending';
  const nextStatus = isStart ? 'in_progress' : 'archived';
  const nextLabel = ARCHIVE_STATUS_LABEL[nextStatus];

  // 根据归档类别获取材料标准
  const categoryStandard = MATERIAL_STANDARDS.find(s => s.category === record.category) || MATERIAL_STANDARDS[MATERIAL_STANDARDS.length - 1];
  // 拆分材料标准为检查项
  const checklist = _parseChecklistFromStandard(categoryStandard.standard, record.category);

  const popover = document.createElement('div');
  popover.id = 'archive-advance-popover';
  popover.style.cssText = 'position:fixed;z-index:100;background:var(--surface-card);border-radius:14px;box-shadow:0 12px 40px rgba(0,0,0,0.15);border:1px solid var(--neutral-200);padding:0;width:380px;max-height:80vh;overflow-y:auto;';

  // ── 浮窗内容 ──
  let html = '';
  // 标题栏
  html += `<div class="px-5 pt-4 pb-3 border-b border-gray-100">`;
  html += `<div class="flex items-center justify-between mb-1">`;
  html += `<h3 class="font-title-cn text-sm font-semibold text-gray-800">${isStart ? '开始归档' : '确认归档'}</h3>`;
  html += `<button id="archive-popover-close" class="text-gray-400 hover:text-gray-600 text-sm leading-none">&times;</button>`;
  html += `</div>`;
  html += `<div class="text-xs text-gray-500">${record.activityName} · <span class="px-1 py-0.5 rounded ${ARCHIVE_CATEGORY_STYLE[record.category] || ''}">${record.category}</span></div>`;
  html += `</div>`;

  if (isStart) {
    // 开始归档：显示材料标准检查清单
    html += `<div class="px-5 py-4">`;
    html += `<p class="text-xs text-gray-600 mb-3">请确认以下材料标准是否满足：</p>`;
    html += `<div class="space-y-2 mb-4">`;
    checklist.forEach((item, i) => {
      html += `<label class="flex items-start gap-2.5 cursor-pointer group">`;
      html += `<input type="checkbox" class="archive-checklist-item mt-0.5 rounded border-gray-300 text-blue-600 focus:ring-blue-300" data-check-idx="${i}" />`;
      html += `<span class="text-xs text-gray-700 leading-relaxed group-hover:text-gray-900">${item}</span>`;
      html += `</label>`;
    });
    html += `</div>`;
    html += `<div class="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 mb-4">`;
    html += `<p class="text-[12px] text-amber-700">提示：未全部勾选也可推进状态，但请确保后续补齐。</p>`;
    html += `</div>`;
    html += `</div>`;
  } else {
    // 确认归档：显示归档总结
    html += `<div class="px-5 py-4">`;
    html += `<p class="text-xs text-gray-600 mb-3">确认将以下条目归档？归档后将从待处理列表移除。</p>`;
    html += `<div class="rounded-lg bg-gray-50 px-3 py-2.5 mb-4 space-y-1.5">`;
    html += `<div class="flex items-center justify-between text-xs"><span class="text-gray-500">活动名称</span><span class="text-gray-800 font-medium">${record.activityName}</span></div>`;
    html += `<div class="flex items-center justify-between text-xs"><span class="text-gray-500">归档类别</span><span class="text-gray-800">${record.category}</span></div>`;
    html += `<div class="flex items-center justify-between text-xs"><span class="text-gray-500">归档日期</span><span class="text-gray-800">${record.archiveDate}</span></div>`;
    html += `</div>`;
    html += `<div class="rounded-lg bg-blue-50 border border-blue-200 px-3 py-2 mb-4">`;
    html += `<p class="text-[12px] text-blue-700">材料标准：${categoryStandard.standard}</p>`;
    html += `</div>`;
    html += `</div>`;
  }

  // 操作按钮
  html += `<div class="flex justify-end gap-2 px-5 py-3 border-t border-gray-100">`;
  html += `<button id="archive-popover-cancel" class="text-xs px-3 py-1.5 rounded-lg text-gray-500 hover:bg-gray-50 transition-colors">取消</button>`;
  html += `<button id="archive-popover-confirm" class="text-xs px-3 py-1.5 rounded-lg text-white transition-colors" style="${solidAccentStyle(accent, accentBorder)}">${nextLabel}</button>`;
  html += `</div>`;

  popover.innerHTML = html;
  document.body.appendChild(popover);

  // 定位
  const rect = triggerBtn.getBoundingClientRect();
  let top = rect.bottom + 8;
  let left = rect.left;
  if (left + 380 > window.innerWidth) left = Math.max(8, window.innerWidth - 392);
  if (top + popover.offsetHeight > window.innerHeight) top = Math.max(8, rect.top - popover.offsetHeight - 8);
  popover.style.top = top + 'px';
  popover.style.left = left + 'px';

  const closePopover = () => { popover.remove(); };

  popover.querySelector('#archive-popover-close')?.addEventListener('click', closePopover);
  popover.querySelector('#archive-popover-cancel')?.addEventListener('click', closePopover);

  // 确认推进
  popover.querySelector('#archive-popover-confirm')?.addEventListener('click', () => {
    if (isStart) {
      // 开始归档：收集勾选状态
      const checks = popover.querySelectorAll('.archive-checklist-item');
      const checkedCount = [...checks].filter(c => c.checked).length;
      const totalCount = checks.length;
      record._checklistState = { checked: checkedCount, total: totalCount };
    }
    record.status = nextStatus;
    persist();
    closePopover();
    showToast('success', `「${record.activityName}」${nextLabel}${isStart ? '，请按材料标准准备' : ''}`);
    _renderArchiveContent();
  });

  // 点击外部关闭
  const outsideHandler = (e) => {
    if (!popover.contains(e.target) && !triggerBtn.contains(e.target)) {
      closePopover();
      document.removeEventListener('click', outsideHandler, true);
    }
  };
  setTimeout(() => document.addEventListener('click', outsideHandler, true), 0);

  // ESC 关闭
  const escHandler = (e) => {
    if (e.key === 'Escape') { closePopover(); document.removeEventListener('keydown', escHandler); }
  };
  document.addEventListener('keydown', escHandler);
}

/**
 * 从材料标准文本解析出检查清单项
 */
function _parseChecklistFromStandard(standard, category) {
  // 尝试按逗号/顿号分隔
  const parts = standard.split(/[，,、；;]/).map(s => s.trim()).filter(Boolean);
  if (parts.length >= 2) return parts;
  // 无法分隔时按类别返回默认清单
  const defaults = {
    '新闻稿': ['含标题', '正文完整', '配图3张以上', '署名', 'Word+PDF双格式'],
    '照片': ['原图≥3MB', '横版为主', '含全景+特写', '命名：日期_活动名_序号'],
    '视频': ['1080p及以上', '画面稳定', '含字幕（可选）', 'MP4格式'],
    '其他': ['材料完整性确认', '可追溯性确认'],
  };
  return defaults[category] || ['材料完整性确认', '可追溯性确认'];
}

// ── 上传宣传材料（attachments 双模式：mock base64 持久化 / server multipart 落盘）──
// spec §8 增量：宣传委员上传照片/简讯/报送 → 写入 archiveRecords（产出物区/关闭校验同源读取）。
// mock 模式：FileReader → base64 dataURL 存 mockDB.archiveRecords + persist()；
// server 模式：文件本体 POST /api/v1/uploads（multer 落盘 server/uploads/），
// 元数据 POST /api/v1/fileSpaceRecords（server 端无 archiveRecords 表，落文件空间宽表），
// 同时写入内存 archiveRecords 保证当页产出物区/关闭校验联动。
const UPLOAD_MAX_MOCK_MB = 2;  // mock 模式 localStorage 容量约束（base64 膨胀 ~33%）
const UPLOAD_MAX_SERVER_MB = 10; // 与 server/routes/uploads.js 服务端限制一致

function _showArchiveUploadModal() {
  // 移除已有模态
  const existing = document.getElementById('archive-upload-modal');
  if (existing) existing.remove();

  const activities = loadActivities();
  const apiMode = isApiMode();
  const maxMB = apiMode ? UPLOAD_MAX_SERVER_MB : UPLOAD_MAX_MOCK_MB;

  const overlay = document.createElement('div');
  overlay.id = 'archive-upload-modal';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.45);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px;';

  const card = document.createElement('div');
  card.style.cssText = 'background:var(--surface-card);border-radius:14px;padding:0;max-width:440px;width:100%;box-shadow:0 12px 40px rgba(0,0,0,0.18);max-height:86vh;display:flex;flex-direction:column;';

  // T223 排序统一：关联活动下拉按 date 降序（新者在前），与全站一致
  const sortedActivities = [...activities].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  const activityOptions = sortedActivities.length === 0
    ? '<option value="">（暂无活动，请先创建）</option>'
    : `<option value="">请选择关联活动</option>` + sortedActivities.map(a =>
        `<option value="${a.id}">${a.title}（${a.date || '未定日期'}）</option>`
      ).join('');

  card.innerHTML = `
    <div class="px-5 pt-4 pb-3 border-b border-gray-100 flex items-center justify-between">
      <h3 class="font-title-cn text-sm font-semibold text-gray-800">上传宣传材料</h3>
      <button id="upload-modal-close" class="text-gray-400 hover:text-gray-600 text-sm leading-none">&times;</button>
    </div>
    <div class="px-5 py-4 space-y-3.5 overflow-y-auto">
      <div>
        <label class="text-xs text-gray-500 mb-1.5 block font-medium">关联活动 <span class="text-red-500">*</span></label>
        <select id="upload-activity" class="input-flat text-xs w-full">${activityOptions}</select>
      </div>
      <div>
        <label class="text-xs text-gray-500 mb-1.5 block font-medium">材料类别</label>
        <select id="upload-category" class="input-flat text-xs w-full">
          ${MATERIAL_STANDARDS.map(s => `<option value="${s.category}">${s.category}</option>`).join('')}
        </select>
      </div>
      <div>
        <label class="text-xs text-gray-500 mb-1.5 block font-medium">选择文件（可多选）</label>
        <input id="upload-file" type="file" multiple
          accept=".jpg,.jpeg,.png,.pdf,.doc,.docx,.xls,.xlsx,.mp4,.mov"
          class="block w-full text-xs text-gray-600 file:mr-3 file:px-3 file:py-1.5 file:rounded-lg file:border-0 file:bg-blue-50 file:text-blue-600 file:text-xs hover:file:bg-blue-100 transition-colors cursor-pointer" />
        <div id="upload-preview" class="mt-2 space-y-1.5"></div>
      </div>
      <div class="rounded-lg px-3 py-2 text-[11px] leading-relaxed ${apiMode ? 'bg-teal-50 text-teal-700 border border-teal-100' : 'bg-amber-50 text-amber-700 border border-amber-100'}">
        ${apiMode
          ? '服务端模式：文件落服务器磁盘（jpg/png/pdf/docx/xlsx，单文件 ≤' + maxMB + 'MB），元数据写入文件空间记录，产出物区同步可见。'
          : '本地模式：文件以 base64 存入本地存储（单文件 ≤' + maxMB + 'MB），刷新不丢失；产出物区/关闭校验同步可见。'}
      </div>
    </div>
    <div class="flex justify-end gap-2 px-5 py-3 border-t border-gray-100">
      <button id="upload-cancel" class="text-xs px-3 py-1.5 rounded-lg text-gray-500 hover:bg-gray-50 transition-colors">取消</button>
      <button id="upload-confirm" class="text-xs px-3 py-1.5 rounded-lg text-white transition-colors hover:opacity-90" style="${solidAccentStyle(accent, accentBorder)}">上传</button>
    </div>
  `;

  overlay.appendChild(card);
  document.body.appendChild(overlay);

  let selectedFiles = [];
  let previewUrls = [];

  const closeModal = () => {
    previewUrls.forEach(u => URL.revokeObjectURL(u));
    overlay.remove();
  };

  const renderPreview = () => {
    const previewEl = card.querySelector('#upload-preview');
    previewEl.innerHTML = selectedFiles.map((f, i) => {
      const isImage = f.type && f.type.startsWith('image/');
      const thumb = isImage
        ? `<img src="${previewUrls[i]}" class="w-9 h-9 rounded object-cover border border-gray-200 flex-shrink-0" alt="" />`
        : `<span class="w-9 h-9 rounded flex items-center justify-center flex-shrink-0" style="--acc-bg-dark:rgba(96,165,250,0.16);--acc-text-dark:#60A5FA;background:rgba(59,130,246,0.1);color:#3b82f6;">${icon('fileText', { className: 'w-4 h-4' })}</span>`;
      return `<div class="flex items-center gap-2 p-2 rounded-lg bg-gray-50">
        ${thumb}
        <div class="flex-1 min-w-0">
          <p class="text-xs text-gray-700 truncate">${f.name}</p>
          <p class="text-[11px] text-gray-400">${(f.size / 1024).toFixed(1)} KB</p>
        </div>
        <button class="upload-file-remove text-gray-400 hover:text-red-500 text-sm leading-none" data-idx="${i}">&times;</button>
      </div>`;
    }).join('') || '<p class="text-xs text-gray-400 text-center py-3">尚未选择文件</p>';
  };

  // 文件选择：过滤超限文件并渲染预览
  card.querySelector('#upload-file').addEventListener('change', (e) => {
    const files = Array.from(e.target.files || []);
    const maxBytes = maxMB * 1024 * 1024;
    const oversized = files.filter(f => f.size > maxBytes);
    if (oversized.length > 0) {
      showToast('error', `${oversized.map(f => f.name).join('、')} 超出 ${maxMB}MB 限制，已剔除`);
    }
    selectedFiles = files.filter(f => f.size <= maxBytes);
    previewUrls.forEach(u => URL.revokeObjectURL(u));
    previewUrls = selectedFiles.map(f => URL.createObjectURL(f));
    renderPreview();
  });

  // 移除单个文件
  card.querySelector('#upload-preview').addEventListener('click', (e) => {
    const btn = e.target.closest('.upload-file-remove');
    if (!btn) return;
    const idx = Number(btn.dataset.idx);
    selectedFiles.splice(idx, 1);
    URL.revokeObjectURL(previewUrls[idx]);
    previewUrls.splice(idx, 1);
    renderPreview();
  });

  // 提交上传
  card.querySelector('#upload-confirm').addEventListener('click', async () => {
    const activityId = card.querySelector('#upload-activity').value;
    const category = card.querySelector('#upload-category').value;
    if (!activityId) {
      showToast('error', '请先选择关联活动');
      return;
    }
    if (selectedFiles.length === 0) {
      showToast('error', '请先选择文件');
      return;
    }
    const activity = activities.find(a => a.id === activityId);
    const confirmBtn = card.querySelector('#upload-confirm');
    confirmBtn.disabled = true;
    confirmBtn.textContent = '上传中…';
    try {
      const saved = await _handleArchiveUpload(selectedFiles, activityId, activity ? activity.title : '', category);
      if (saved > 0) {
        showToast('success', `已归档 ${saved} 项宣传材料`);
        // 文件流外发确认（书记 2026-08-10 裁定）：材料如需微信外发给对方确认，系统内标记闭环
        _promptExternalDispatch(activityId, activity ? activity.title : '');
        closeModal();
        _renderArchiveContent();
      }
    } finally {
      confirmBtn.disabled = false;
      confirmBtn.textContent = '上传';
    }
  });

  // 关闭
  card.querySelector('#upload-modal-close').addEventListener('click', closeModal);
  card.querySelector('#upload-cancel').addEventListener('click', closeModal);
  overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });
  card.addEventListener('click', e => e.stopPropagation());
}

/** 文件流外发确认（书记 2026-08-10 裁定）：材料已归档，如需微信外发则系统内标记闭环 */
function _promptExternalDispatch(activityId, activityName) {
  const user = AuthStore.getCurrentUser();
  if (!user) return;
  const receiverOptions = [
    { value: 'secretary', label: '党支部书记（审核）' },
    { value: 'disc-commissioner', label: '纪检委员（留档）' },
    { value: 'org-commissioner', label: '组织委员' },
  ];
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,0.4);display:flex;align-items:center;justify-content:center;z-index:200;';
  overlay.innerHTML = `
    <div class="card rounded-xl w-full max-w-md" style="max-height:80vh;overflow-y:auto;">
      <div class="px-5 pt-4 pb-3 border-b border-gray-100 flex items-center justify-between">
        <h3 class="font-title-cn text-sm font-semibold text-gray-800">文件外发确认</h3>
        <button id="ed-modal-close" class="text-gray-400 hover:text-gray-600 text-sm leading-none">&times;</button>
      </div>
      <div class="px-5 py-4 space-y-3.5">
        <div class="rounded-lg px-3 py-2 text-[11px] leading-relaxed bg-amber-50 text-amber-700 border border-amber-100">
          宣传材料已归档到系统。若还需通过<b>微信</b>把文件发给对方确认（如新闻稿送书记审核），
          请在此标记「已外发」——对方收到后会在其工作台确认，形成可审计闭环（谁 / 何时 / 发给谁 / 何时确认）。
        </div>
        <div>
          <label class="text-xs text-gray-500 mb-1.5 block font-medium">接收方</label>
          <select id="ed-receiver" class="input-flat text-xs w-full">
            ${receiverOptions.map(o => `<option value="${o.value}">${o.label}</option>`).join('')}
          </select>
        </div>
        <div>
          <label class="text-xs text-gray-500 mb-1.5 block font-medium">备注（可选）</label>
          <input id="ed-note" type="text" class="input-flat text-xs w-full" placeholder="如：新闻稿终稿，请审核…" />
        </div>
      </div>
      <div class="flex justify-end gap-2 px-5 py-3 border-t border-gray-100">
        <button id="ed-skip" class="text-xs px-3 py-1.5 rounded-lg text-gray-500 hover:bg-gray-50 transition-colors">暂不外发</button>
        <button id="ed-confirm" class="text-xs px-3 py-1.5 rounded-lg text-white transition-colors hover:opacity-90" style="${solidAccentStyle(accent, accentBorder)};cursor:pointer;">标记已通过微信发送</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  const close = () => overlay.remove();
  overlay.querySelector('#ed-modal-close').addEventListener('click', close);
  overlay.querySelector('#ed-skip').addEventListener('click', close);
  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
  overlay.querySelector('#ed-confirm').addEventListener('click', () => {
    const receiverRole = overlay.querySelector('#ed-receiver').value;
    const note = overlay.querySelector('#ed-note').value.trim();
    addExternalDispatch({
      refType: 'publicity',
      refLabel: `宣传材料：${activityName || '未命名活动'}`,
      senderId: user.personId,
      senderName: _personName(user.personId) || '宣传委员',
      receiverRole,
      note,
    });
    showToast('success', '已标记外发，对方确认后将闭环');
    close();
  });
}

async function _handleArchiveUpload(files, activityId, activityName, category) {
  const today = new Date().toISOString().slice(0, 10);
  let saved = 0;

  if (isApiMode()) {
    // ── server 模式：文件本体落盘 + 元数据入文件空间宽表 ──
    const token = getAuthToken();
    const baseUrl = getApiBaseUrl();
    for (const file of files) {
      try {
        const fd = new FormData();
        fd.append('file', file);
        const resp = await fetch(`${baseUrl}/api/v1/uploads`, {
          method: 'POST',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: fd,
        });
        if (!resp.ok) throw new Error(`上传失败(${resp.status})`);
        const { path } = await resp.json();
        // 元数据 → fileSpaceRecords（server RESOURCE_TABLES 无 archiveRecords 表）
        const metaResp = await fetch(`${baseUrl}/api/v1/fileSpaceRecords`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          body: JSON.stringify({
            activityId, activityName, category,
            fileName: file.name, fileSize: file.size, filePath: path,
            status: 'archived', archiveDate: today, uploadedBy: 'p12',
          }),
        });
        if (!metaResp.ok) throw new Error(`元数据写入失败(${metaResp.status})`);
        const metaRow = await metaResp.json();
        // 同步写入内存 fileSpaceRecords：persist() 的全量快照会按 mockDB 状态整表覆盖
        // server 端表（快照写穿清表缺口），不 push 则刚落库的元数据被空数组擦除
        mockDB.fileSpaceRecords.push(metaRow);
        // 同步写入内存 archiveRecords → 产出物区/关闭校验同源联动
        mockDB.archiveRecords.push({
          id: `ar-u-${Date.now()}-${saved}`, activityId, activityName,
          archiveDate: today, category, status: 'archived',
          fileName: file.name, fileSize: file.size, filePath: path,
        });
        saved++;
      } catch (err) {
        showToast('error', `「${file.name}」${err.message || '上传失败'}`);
      }
    }
  } else {
    // ── mock 模式：base64 dataURL 持久化 ──
    for (const file of files) {
      try {
        const dataUrl = await _readFileAsDataURL(file);
        mockDB.archiveRecords.push({
          id: `ar-u-${Date.now()}-${saved}`, activityId, activityName,
          archiveDate: today, category, status: 'archived',
          fileName: file.name, fileSize: file.size, fileData: dataUrl,
        });
        saved++;
      } catch (err) {
        showToast('error', `「${file.name}」读取失败`);
      }
    }
  }

  if (saved > 0) persist();
  return saved;
}

function _readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('读取文件失败'));
    reader.readAsDataURL(file);
  });
}

registerRenderCallback(renderPropUI);

// 初始化待办种子数据
seedTodos();

loadWorkspaceData({ role: 'prop-commissioner', storeInits: [() => TaskForceRecordStore.init()], fallbackData: () => loadActivities(), logTag: 'ws-prop' });
