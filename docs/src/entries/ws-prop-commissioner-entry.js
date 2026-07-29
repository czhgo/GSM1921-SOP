import { renderTabBar } from '../components/tab-bar.js';
import { getAppState, setState, STATE, registerRenderCallback } from '../core/state.js';
import { BranchService } from '../services/runtime.js';
import { showToast } from '../core/utils.js';
import { bootstrapPage } from '../core/bootstrap.js';
import { TaskForceRecordStore } from '../services/taskforce.js';
import { ACTIVITIES, _personName } from '../mock/index.js';
import { loadWorkspaceData } from '../core/data-loader.js';

const { accent, accentRgba, accentBorder } = bootstrapPage({ module: 'workspace', accentRole: 'prop-commissioner' });

function renderPropUI(state) {
  let activities = state.activities || [];
  if (activities.length === 0 && ACTIVITIES.length > 0) {
    activities = ACTIVITIES.map(a => ({ ...a, visibility: 'branch', executor: a.organizer || 'u_exec', supervisor: null, createdBy: a.organizer || 'u_exec', createdAt: a.date || new Date().toISOString() }));
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
      { id: 'tasks', label: '宣传任务', render: (ctx) => _renderTasksContent() },
      { id: 'kanban', label: '活动与专班', render: (ctx) => _renderKanbanContent(ctx.activities, ctx.propTf) },
    ],
    accentColor: { accent, accentRgba, accentBorder },
    renderCtx: { activities, propTf },
    storageKey: 'workflowos_tab_prop',
  });

  container.innerHTML = tabBar.html;

  tabBar.bindEvents(container);
  tabBar.activate(tabBar.activeTab);
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
    ? `<button class="task-advance-btn text-[10px] px-2 py-1 rounded bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 transition-colors mt-1" data-task-id="${task.id}" onclick="event.stopPropagation();">${advanceLabel}</button>`
    : '';
  const typeStyle = TASK_TYPE_STYLE[task.type] || 'bg-gray-50 text-gray-700';
  const statusStyle = TASK_STATUS_STYLE[task.status];

  return `
    <div class="p-3 rounded-xl bg-white hover:bg-gray-50 transition-colors">
      <div class="flex items-center gap-2 mb-1">
        <span class="text-[10px] px-1.5 py-0.5 rounded-full ${typeStyle}">${task.type}</span>
        <span class="text-[10px] px-1.5 py-0.5 rounded-full border ${statusStyle}">${TASK_STATUS_LABEL[task.status]}</span>
      </div>
      <div class="text-sm font-medium text-gray-800 mt-1">${task.summary}</div>
      <div class="flex items-center justify-between mt-1.5">
        <span class="text-[10px] text-gray-400">来自：${task.source} · ${task.createdAt}</span>
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
        <div class="px-4 py-3 font-title-cn text-sm font-bold" style="background:rgba(206,17,38,0.06);color:#ce1126;border-bottom:2px solid rgba(206,17,38,0.15);">待启动 (${pending.length})</div>
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
    ? '<span class="text-[10px] px-1.5 py-0.5 rounded-full bg-green-50 text-green-700">专班</span>'
    : (item.type ? `<span class="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-700">${item.type}</span>` : '');
  const subInfo = isTf
    ? `<span class="text-[10px] text-gray-400">${item.filled}/${item.capacity} 人</span>`
    : '';
  const completeBtn = showCompleteBtn
    ? (isTf
      ? `<button class="tf-complete-btn text-[10px] px-2 py-1 rounded bg-green-50 text-green-600 border border-green-200 hover:bg-green-100 transition-colors mt-1" data-tf-id="${item.id}" onclick="event.stopPropagation();">确认完成</button>`
      : `<button class="activity-complete-btn text-[10px] px-2 py-1 rounded bg-green-50 text-green-600 border border-green-200 hover:bg-green-100 transition-colors mt-1" data-act-id="${item.id}" onclick="event.stopPropagation();">确认完成</button>`)
    : '';
  return `
    <div class="p-3 rounded-xl bg-white hover:bg-gray-200 transition-colors cursor-pointer">
      <div class="flex items-center gap-2 mb-0.5">
        <span class="text-sm font-medium text-gray-800">${item.title || '未命名'}</span>
        ${typeTag}
      </div>
      <div class="text-xs text-gray-500 mt-0.5">${item.date || ''} ${subInfo}</div>
      ${isTf && item.task ? `<div class="text-[11px] text-gray-400 mt-0.5 line-clamp-1">${item.task}</div>` : ''}
      ${completeBtn}
    </div>`;
}

// ── 专班工作量区块（融入活动与专班 tab 底部） ──
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
        <span class="text-[10px] px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-700">${propTf.length} 个专班</span>
      </div>
      ${members.length === 0 ? '<p class="text-xs text-gray-400">暂无宣传专班成员数据</p>' :
        `<div class="space-y-2">${members.map(m => `
          <div class="flex items-center justify-between p-2 rounded-lg bg-white">
            <div class="flex items-center gap-2">
              <span class="text-xs font-medium text-gray-700">${_personName(m.personId)}</span>
              <span class="text-[10px] text-gray-400">${Array.from(m.roles).join('·')}</span>
            </div>
            <div class="flex items-center gap-3 text-[10px] text-gray-500">
              <span>${m.contributions} 产出</span>
              <span>${m.tfCount} 专班</span>
            </div>
          </div>
        `).join('')}</div>`}
    </div>
  `;
}

registerRenderCallback(renderPropUI);

loadWorkspaceData({ role: 'prop-commissioner', storeInits: [() => TaskForceRecordStore.init()], fallbackData: () => ACTIVITIES, logTag: 'ws-prop' });
