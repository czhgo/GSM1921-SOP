import { renderTabBar } from '../components/tab-bar.js';
import { getAppState, setState, STATE, registerRenderCallback } from '../core/state.js';
import { BranchService } from '../services/runtime.js';
import { showToast } from '../core/utils.js';
import { bootstrapPage } from '../core/bootstrap.js';
import { TaskForceRecordStore } from '../services/taskforce.js';
import { _personName } from '../mock/index.js';
import { loadWorkspaceData } from '../core/data-loader.js';
import { icon } from '../core/icons.js';
import { loadActivities } from '../services/activity.js';
import { renderMyDispatchTab, bindMyDispatchEvents } from '../services/issues.js';
import { renderTodoList } from '../components/todo-list.js';
import { TodoStore, seedTodos, TodoStatus } from '../services/todo.js';

const { accent, accentRgba, accentBorder } = await bootstrapPage({ module: 'workspace', accentRole: 'prop-commissioner' });

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

  const tabBar = renderTabBar({
    prefix: 'prop',
    tabs: [
      { id: 'todo', label: '待办', render: () => _renderTodoContent(), groupLabel: '工作台' },
      { id: 'tasks', label: '宣传任务', render: (ctx) => _renderTasksContent(), groupLabel: '党建' },
      { id: 'kanban', label: '项目看板', render: (ctx) => _renderKanbanContent(ctx.activities, ctx.propTf) },
      { id: 'archive', label: '档案归档', render: (ctx) => _renderArchiveContent(), groupLabel: '党务' },
      { id: 'weekly', label: '周报报送', render: (ctx) => _renderWeeklyContent(), groupLabel: '党务' },
      { id: 'my-dispatch', label: '我的处置', render: () => { const el = document.getElementById('prop-tab-content'); if (el) { el.innerHTML = renderMyDispatchTab('prop-commissioner', 'u_prop'); bindMyDispatchEvents(el, 'prop-commissioner', 'u_prop'); } }, groupLabel: '反馈' },
    ],
    accentColor: { accent, accentRgba, accentBorder },
    renderCtx: { activities, propTf },
    storageKey: 'workflowos_tab_prop',
    defaultTab: 'todo',
  });

  container.innerHTML = tabBar.html;

  tabBar.bindEvents(container);
  tabBar.activate(tabBar.activeTab);
}

// ── 待办列表+详情面板（最小三成本原则落地） ───────────────────
let _selectedTodoId = null;

function _renderTodoContent() {
  const container = document.getElementById('prop-tab-content');
  if (!container) return;

  // 刷新过期状态
  TodoStore.refreshExpiredStatus();

  const groupedTodos = TodoStore.getGroupedByCategory('prop-commissioner');
  const stats = TodoStore.getStatsByRole('prop-commissioner');
  const selectedTodo = _selectedTodoId ? TodoStore.getById(_selectedTodoId) : null;

  const { html: todoListHtml, bindEvents } = renderTodoList({
    prefix: 'prop',
    groupedTodos,
    stats,
    accent,
    onSelectTodo: (todo) => {
      _selectedTodoId = todo.id;
      _renderTodoContent();
    },
    onCompleteTodo: (todoId) => {
      TodoStore.complete(todoId);
      if (_selectedTodoId === todoId) _selectedTodoId = null;
      showToast('success', '待办已完成');
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
        <div class="card rounded-xl p-5 border-l-4" style="border-left-color:${accent};">
          <div class="flex items-center justify-between mb-4">
            <h4 class="font-title-cn text-sm font-bold text-gray-700">我的待办</h4>
          </div>
          ${todoListHtml}
        </div>
      </div>
      <div class="lg:col-span-1">
        <div class="card rounded-xl p-5 sticky top-20">
          <h4 class="font-title-cn text-sm font-bold text-gray-700 mb-4">详情</h4>
          ${detailHtml}
        </div>
      </div>
    </div>
  `;

  bindEvents(container);
  _bindTodoDetailEvents();
}

function _renderTodoDetail(todo) {
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
          ${todo.priority === 'urgent' ? '<span class="text-xs px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-700">紧急</span>' : ''}
        </div>
        <p class="font-title-cn text-sm font-bold text-gray-800">${todo.title}</p>
      </div>
      ${todo.description ? `<p class="text-xs text-gray-600 leading-relaxed">${todo.description}</p>` : ''}
      ${todo.deadline ? `<div class="text-xs text-gray-500">截止：${todo.deadline}</div>` : ''}
      <div class="text-xs text-gray-400">创建：${(todo.createdAt || '').slice(0, 16).replace('T', ' ')}</div>
      <div class="pt-3 border-t border-gray-100 flex gap-2">
        ${todo.status !== 'completed' ? `
          <button class="prop-todo-detail-complete text-xs px-4 py-1.5 rounded-lg text-white transition-colors hover:opacity-90" style="background:${accent};">标记完成</button>
          ${todo.actionType ? `<button class="prop-todo-detail-action text-xs px-4 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">处理</button>` : ''}
        ` : '<span class="text-xs text-green-600">已完成</span>'}
      </div>
    </div>
  `;
}

function _handleTodoAction(todo) {
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
  container.querySelector('.prop-todo-detail-complete')?.addEventListener('click', () => {
    if (_selectedTodoId) {
      TodoStore.complete(_selectedTodoId);
      _selectedTodoId = null;
      showToast('success', '待办已完成');
      _renderTodoContent();
    }
  });
  container.querySelector('.prop-todo-detail-action')?.addEventListener('click', () => {
    if (_selectedTodoId) {
      const todo = TodoStore.getById(_selectedTodoId);
      if (todo) _handleTodoAction(todo);
    }
  });
}

// ── 宣传任务 mock 数据 ──
const PROP_TASKS = [
  { id: 'pt1', source: '支部委员会', type: '新闻稿', summary: '七一主题党日活动新闻稿', status: 'pending', createdAt: '2026-07-25' },
  { id: 'pt2', source: '副书记', type: '推送排版', summary: '发展对象公示推送排版', status: 'in_progress', createdAt: '2026-07-24' },
  { id: 'pt3', source: '支部委员会', type: '素材归档', summary: '上半年活动照片归档整理', status: 'in_progress', createdAt: '2026-07-22' },
  { id: 'pt4', source: '组织委员', type: '周报报送', summary: '第30周党建工作周报', status: 'submitted', createdAt: '2026-07-21' },
  { id: 'pt5', source: '支部委员会', type: '新闻稿', summary: '预备党员转正大会新闻稿', status: 'pending', createdAt: '2026-07-20' },
  { id: 'pt6', source: '副书记', type: '推送排版', summary: '组织生活会预告推送', status: 'pending', createdAt: '2026-07-19' },
  { id: 'pt7', source: '支部委员会', type: '素材归档', summary: '入党积极分子培训资料归档', status: 'submitted', createdAt: '2026-07-18' },
  { id: 'pt8', source: '组织委员', type: '周报报送', summary: '第29周党建工作周报', status: 'submitted', createdAt: '2026-07-14' },
];

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
  const pending = PROP_TASKS.filter(t => t.status === 'pending');
  const inProgress = PROP_TASKS.filter(t => t.status === 'in_progress');
  const submitted = PROP_TASKS.filter(t => t.status === 'submitted');

  container.innerHTML = `
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
      <div class="card rounded-xl p-0 overflow-hidden">
        <div class="px-4 py-3 font-title-cn text-sm font-bold" style="background:rgba(245,158,11,0.06);color:#d97706;border-bottom:2px solid rgba(245,158,11,0.15);">待接收 (${pending.length})</div>
        <div class="p-3 space-y-2 min-h-[120px]">
          ${pending.length === 0 ? '<p class="text-xs text-gray-400 text-center py-6">暂无待接收任务</p>' :
            pending.map(t => _renderTaskCard(t)).join('')}
        </div>
      </div>
      <div class="card rounded-xl p-0 overflow-hidden">
        <div class="px-4 py-3 font-title-cn text-sm font-bold" style="background:rgba(59,130,246,0.06);color:#3b82f6;border-bottom:2px solid rgba(59,130,246,0.15);">进行中 (${inProgress.length})</div>
        <div class="p-3 space-y-2 min-h-[120px]">
          ${inProgress.length === 0 ? '<p class="text-xs text-gray-400 text-center py-6">暂无进行中任务</p>' :
            inProgress.map(t => _renderTaskCard(t)).join('')}
        </div>
      </div>
      <div class="card rounded-xl p-0 overflow-hidden">
        <div class="px-4 py-3 font-title-cn text-sm font-bold" style="background:rgba(16,185,129,0.06);color:#10b981;border-bottom:2px solid rgba(16,185,129,0.15);">已提交 (${submitted.length})</div>
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
      const task = PROP_TASKS.find(t => t.id === taskId);
      if (!task) return;
      const nextStatus = TASK_STATUS_FLOW[task.status];
      if (!nextStatus) return;
      task.status = nextStatus;
      showToast('success', `任务「${task.summary}」已${TASK_STATUS_LABEL[nextStatus]}`);
      _renderTasksContent();
    });
  });
}

function _renderTaskCard(task) {
  const isFinal = task.status === 'submitted';
  const advanceLabel = task.status === 'pending' ? '接收' : '提交';
  const advanceBtn = !isFinal
    ? `<button class="task-advance-btn text-xs px-2 py-1 rounded bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100 transition-colors mt-1" data-task-id="${task.id}" onclick="event.stopPropagation();">${advanceLabel}</button>`
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
  const completedTf = propTf.filter(t => t.status === 'completed');

  // 合并待启动：活动 + 专班
  const pending = [
    ...pendingActs.map(a => ({ _type: 'activity', ...a })),
    ...pendingTf.map(t => ({ _type: 'taskforce', id: t.id, title: t.name, date: t.deadline || t.createdAt, type: '专班', status: t.status, task: t.task, capacity: t.capacity, filled: t.members.filter(m => m.personId).length })),
  ];
  // 合并进行中：活动 + 专班
  const active = [
    ...activeActs.map(a => ({ _type: 'activity', ...a })),
    ...activeTf.map(t => ({ _type: 'taskforce', id: t.id, title: t.name, date: t.deadline || t.createdAt, type: '专班', status: t.status, task: t.task, capacity: t.capacity, filled: t.members.filter(m => m.personId).length })),
  ];
  // 合并已归档：活动 + 专班
  const completed = [
    ...completedActs.map(a => ({ _type: 'activity', ...a })),
    ...completedTf.map(t => ({ _type: 'taskforce', id: t.id, title: t.name, date: t.deadline || t.createdAt, type: '专班', status: t.status, task: t.task, capacity: t.capacity, filled: t.members.filter(m => m.personId).length })),
  ];

  container.innerHTML = `
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
      <div class="card rounded-xl p-0 overflow-hidden">
        <div class="px-4 py-3 font-title-cn text-sm font-bold" style="background:rgba(37,99,235,0.06);color:#2563eb;border-bottom:2px solid rgba(37,99,235,0.15);">待启动 (${pending.length})</div>
        <div class="p-3 space-y-2 min-h-[120px]">
          ${pending.length === 0 ? '<p class="text-xs text-gray-400 text-center py-6">暂无待启动项目</p>' :
            pending.map(item => _renderKanbanItem(item)).join('')}
        </div>
      </div>
      <div class="card rounded-xl p-0 overflow-hidden">
        <div class="px-4 py-3 font-title-cn text-sm font-bold" style="background:rgba(59,130,246,0.06);color:#3b82f6;border-bottom:2px solid rgba(59,130,246,0.15);">进行中 (${active.length})</div>
        <div class="p-3 space-y-2 min-h-[120px]">
          ${active.length === 0 ? '<p class="text-xs text-gray-400 text-center py-6">暂无进行中项目</p>' :
            active.map(item => _renderKanbanItem(item, true)).join('')}
        </div>
      </div>
    </div>
    ${completed.length > 0 ? `
    <details class="card rounded-xl p-0 overflow-hidden">
      <summary class="px-4 py-3 font-title-cn text-sm font-bold cursor-pointer select-none" style="background:rgba(107,114,128,0.06);color:#6B7280;border-bottom:2px solid rgba(107,114,128,0.15);">已归档 (${completed.length})</summary>
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
      const confirmed = window.confirm(`确认完成专班「${tf.name}」？完成后将归入已归档。`);
      if (!confirmed) return;
      TaskForceRecordStore.update(tfId, { status: 'completed' });
      showToast('success', `专班「${tf.name}」已完成并归档`);
      renderPropUI(getAppState());
    });
  });
}

function _renderKanbanItem(item, showCompleteBtn = false) {
  const isTf = item._type === 'taskforce';
  const typeTag = isTf
    ? '<span class="text-xs px-1.5 py-0.5 rounded-full bg-green-50 text-green-700">专班</span>'
    : (item.type ? `<span class="text-xs px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-700">${item.type}</span>` : '');
  const subInfo = isTf
    ? `<span class="text-xs text-gray-400">${item.filled}/${item.capacity} 人</span>`
    : '';
  const completeBtn = showCompleteBtn
    ? (isTf
      ? `<button class="tf-complete-btn text-xs px-2 py-1 rounded bg-green-50 text-green-600 border border-green-200 hover:bg-green-100 transition-colors mt-1" data-tf-id="${item.id}" onclick="event.stopPropagation();">确认完成</button>`
      : `<button class="activity-complete-btn text-xs px-2 py-1 rounded bg-green-50 text-green-600 border border-green-200 hover:bg-green-100 transition-colors mt-1" data-act-id="${item.id}" onclick="event.stopPropagation();">确认完成</button>`)
    : '';
  return `
    <div class="p-3 rounded-xl bg-white hover:bg-gray-200 transition-colors cursor-pointer">
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
    <div class="card rounded-xl p-5 border-l-4 mt-4" style="border-left-color:var(--accent-prop-commissioner-light);">
      <div class="flex items-center gap-2 mb-3">
        <span class="text-sm font-semibold text-gray-700">专班工作量</span>
        <span class="text-xs px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-700">${propTf.length} 个专班</span>
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

// ── 档案归档 mock 数据 ──
const ARCHIVE_RECORDS = [
  { id: 'ar1', activityName: '七一主题党日活动', archiveDate: '2026-07-15', category: '新闻稿', status: 'archived' },
  { id: 'ar2', activityName: '七一主题党日活动', archiveDate: '2026-07-15', category: '照片', status: 'archived' },
  { id: 'ar3', activityName: '发展对象公示', archiveDate: '2026-07-22', category: '新闻稿', status: 'pending' },
  { id: 'ar4', activityName: '预备党员转正大会', archiveDate: '2026-07-28', category: '视频', status: 'pending' },
  { id: 'ar5', activityName: '组织生活会', archiveDate: '2026-07-10', category: '其他', status: 'archived' },
  { id: 'ar6', activityName: '入党积极分子培训', archiveDate: '2026-07-18', category: '照片', status: 'in_progress' },
];

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
        <input id="archive-search" type="text" placeholder="搜索活动名称..." class="input-flat text-xs flex-1" />
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
    </div>

    <div id="archive-list" class="space-y-2 mb-6">
      ${_renderArchiveList(ARCHIVE_RECORDS)}
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
          <span class="text-sm font-semibold text-gray-700">模板下载</span>
        </div>
        <div class="space-y-2">
          ${ARCHIVE_TEMPLATES.map(t => `
            <div class="flex items-center justify-between p-2.5 rounded-lg bg-gray-50">
              <div>
                <span class="text-xs font-medium text-gray-700">${t.name}</span>
                <span class="text-xs px-1.5 py-0.5 rounded-full ${ARCHIVE_CATEGORY_STYLE[t.category]} ml-1.5">${t.category}</span>
              </div>
              <button class="archive-tpl-btn text-xs px-2 py-1 rounded bg-white text-blue-600 border border-blue-200 hover:bg-blue-50 transition-colors" data-tpl-name="${t.name}">下载</button>
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
    const filtered = ARCHIVE_RECORDS.filter(r => {
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
      const record = ARCHIVE_RECORDS.find(r => r.id === recordId);
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
      ? `<button class="archive-advance-btn text-xs px-2 py-1 rounded bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100 transition-colors" data-record-id="${r.id}" onclick="event.stopPropagation();">${advanceLabel}</button>`
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

// ── 周报报送 mock 数据 ──
const WEEKLY_REPORTS = [
  { id: 'wr1', week: '第30周', weekRange: '2026-07-21 ~ 2026-07-25', content: '1. 七一主题党日活动新闻稿发布\n2. 发展对象公示推送排版完成\n3. 上半年活动照片归档整理进行中', status: 'submitted', submittedAt: '2026-07-25' },
  { id: 'wr2', week: '第29周', weekRange: '2026-07-14 ~ 2026-07-18', content: '1. 入党积极分子培训资料归档完成\n2. 组织生活会预告推送发布\n3. 配合组织委员完成发展对象材料审核', status: 'submitted', submittedAt: '2026-07-18' },
  { id: 'wr3', week: '第28周', weekRange: '2026-07-07 ~ 2026-07-11', content: '1. 预备党员转正大会新闻稿起草\n2. 七一活动素材整理\n3. 宣传专栏内容更新', status: 'submitted', submittedAt: '2026-07-11' },
  { id: 'wr4', week: '第31周', weekRange: '2026-07-28 ~ 2026-08-01', content: '', status: 'draft', submittedAt: null },
];

const WEEKLY_STATUS_LABEL = { draft: '草稿', submitted: '已报送' };
const WEEKLY_STATUS_STYLE = {
  draft: 'bg-amber-50 text-amber-700 border-amber-200',
  submitted: 'bg-green-50 text-green-700 border-green-200',
};

function _renderWeeklyContent() {
  const container = document.getElementById('prop-tab-content');
  if (!container) return;

  const draftReport = WEEKLY_REPORTS.find(r => r.status === 'draft');

  container.innerHTML = `
    <div class="grid grid-cols-1 lg:grid-cols-5 gap-4 mb-4">
      <div class="lg:col-span-2 card rounded-xl p-5">
        <div class="flex items-center gap-2 mb-4">
          ${icon('pencil', { className: 'w-4 h-4 text-blue-600' })}
          <span class="text-sm font-semibold text-gray-700">填写周报</span>
          ${draftReport ? `<span class="text-xs px-1.5 py-0.5 rounded-full border ${WEEKLY_STATUS_STYLE.draft}">${draftReport.week}</span>` : ''}
        </div>
        <div class="space-y-3">
          <div>
            <label class="text-xs text-gray-500 mb-1.5 block font-medium">选择周次</label>
            <select id="weekly-week" class="w-full px-3 py-2 text-xs rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-200">
              ${WEEKLY_REPORTS.map(r => `<option value="${r.id}" ${r.status === 'draft' ? 'selected' : ''}>${r.week}（${r.weekRange}）</option>`).join('')}
            </select>
          </div>
          <div>
            <label class="text-xs text-gray-500 mb-1.5 block font-medium">周报内容</label>
            <textarea id="weekly-content" rows="6" placeholder="请填写本周工作内容，每条一行..." class="w-full px-3 py-2 text-xs rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-200 resize-none">${draftReport ? draftReport.content : ''}</textarea>
          </div>
          <button id="weekly-submit-btn" class="w-full py-2 text-xs font-medium text-white rounded-lg transition-colors" style="background:${accent}">报送</button>
        </div>
      </div>

      <div class="lg:col-span-3 card rounded-xl p-5">
        <div class="flex items-center gap-2 mb-3">
          ${icon('clock', { className: 'w-4 h-4 text-gray-500' })}
          <span class="text-sm font-semibold text-gray-700">报送历史</span>
        </div>
        <div class="space-y-2">
          ${WEEKLY_REPORTS.map(r => _renderWeeklyReportItem(r)).join('')}
        </div>
      </div>
    </div>
  `;

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
    const report = WEEKLY_REPORTS.find(r => r.id === reportId);
    if (!report) return;
    report.content = content;
    report.status = 'submitted';
    report.submittedAt = new Date().toISOString().slice(0, 10);
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
          ${report.content ? `<button class="weekly-detail-toggle text-xs px-2 py-0.5 rounded bg-gray-50 text-gray-500 hover:bg-gray-100 transition-colors">展开</button>` : ''}
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
  popover.style.cssText = 'position:fixed;z-index:100;background:white;border-radius:14px;box-shadow:0 12px 40px rgba(0,0,0,0.15);border:1px solid #E5E7EB;padding:0;width:380px;max-height:80vh;overflow-y:auto;';

  // ── 浮窗内容 ──
  let html = '';
  // 标题栏
  html += `<div class="px-5 pt-4 pb-3 border-b border-gray-100">`;
  html += `<div class="flex items-center justify-between mb-1">`;
  html += `<span class="font-title-cn text-sm font-semibold text-gray-800">${isStart ? '开始归档' : '确认归档'}</span>`;
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
  html += `<button id="archive-popover-confirm" class="text-xs px-3 py-1.5 rounded-lg text-white transition-colors" style="background:${accent}">${nextLabel}</button>`;
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

registerRenderCallback(renderPropUI);

// 初始化待办种子数据
seedTodos();

loadWorkspaceData({ role: 'prop-commissioner', storeInits: [() => TaskForceRecordStore.init()], fallbackData: () => loadActivities(), logTag: 'ws-prop' });
