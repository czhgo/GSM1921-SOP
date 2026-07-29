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
      { id: 'kanban', label: '项目看板', render: (ctx) => _renderKanbanContent(ctx.activities, ctx.propTf) },
      { id: 'archive', label: '档案归档', render: (ctx) => _renderArchiveContent() },
      { id: 'weekly', label: '周报报送', render: (ctx) => _renderWeeklyContent() },
    ],
    accentColor: { accent, accentRgba, accentBorder },
    renderCtx: { activities, propTf },
    storageKey: 'workflowos_tab_prop',
  });

  container.innerHTML = tabBar.html;

  // 在「项目看板」和「档案归档」之间插入党务分组指示器
  const kanbanBtn = container.querySelector('[data-prop-tab="kanban"]');
  const archiveBtn = container.querySelector('[data-prop-tab="archive"]');
  if (kanbanBtn && archiveBtn) {
    const divider = document.createElement('span');
    divider.className = 'self-stretch w-px bg-gray-300 mx-1 my-1.5';
    divider.setAttribute('aria-hidden', 'true');
    kanbanBtn.insertAdjacentElement('afterend', divider);
    // 在「档案归档」前加党务标签
    const label = document.createElement('span');
    label.className = 'text-[10px] text-gray-400 font-medium self-center px-1 select-none';
    label.textContent = '党务';
    divider.insertAdjacentElement('afterend', label);
  }

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
        <input id="archive-search" type="text" placeholder="搜索活动名称..." class="w-full pl-8 pr-3 py-2 text-xs rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-200 transition" />
        <svg class="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
      </div>
      <select id="archive-filter-category" class="px-3 py-2 text-xs rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-200">
        <option value="">全部类别</option>
        <option value="新闻稿">新闻稿</option>
        <option value="照片">照片</option>
        <option value="视频">视频</option>
        <option value="其他">其他</option>
      </select>
      <select id="archive-filter-status" class="px-3 py-2 text-xs rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-200">
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
          <svg class="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
          <span class="text-sm font-semibold text-gray-700">材料标准</span>
        </div>
        <div class="space-y-2">
          ${MATERIAL_STANDARDS.map(s => `
            <div class="p-2.5 rounded-lg bg-gray-50">
              <span class="text-[10px] px-1.5 py-0.5 rounded-full ${ARCHIVE_CATEGORY_STYLE[s.category]} mr-1.5">${s.category}</span>
              <span class="text-xs text-gray-600">${s.standard}</span>
            </div>
          `).join('')}
        </div>
      </div>

      <div class="card rounded-xl p-5">
        <div class="flex items-center gap-2 mb-3">
          <svg class="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
          <span class="text-sm font-semibold text-gray-700">模板下载</span>
        </div>
        <div class="space-y-2">
          ${ARCHIVE_TEMPLATES.map(t => `
            <div class="flex items-center justify-between p-2.5 rounded-lg bg-gray-50">
              <div>
                <span class="text-xs font-medium text-gray-700">${t.name}</span>
                <span class="text-[10px] px-1.5 py-0.5 rounded-full ${ARCHIVE_CATEGORY_STYLE[t.category]} ml-1.5">${t.category}</span>
              </div>
              <button class="archive-tpl-btn text-[10px] px-2 py-1 rounded bg-white text-blue-600 border border-blue-200 hover:bg-blue-50 transition-colors" data-tpl-name="${t.name}">下载</button>
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

  // 归档推进按钮
  container.querySelectorAll('.archive-advance-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const recordId = btn.dataset.recordId;
      const record = ARCHIVE_RECORDS.find(r => r.id === recordId);
      if (!record || record.status === 'archived') return;
      const nextStatus = record.status === 'pending' ? 'in_progress' : 'archived';
      record.status = nextStatus;
      showToast('success', `「${record.activityName}」${ARCHIVE_STATUS_LABEL[nextStatus]}`);
      _renderArchiveContent();
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
  return records.map(r => {
    const catStyle = ARCHIVE_CATEGORY_STYLE[r.category] || 'bg-gray-50 text-gray-600';
    const statusStyle = ARCHIVE_STATUS_STYLE[r.status];
    const isFinal = r.status === 'archived';
    const advanceLabel = r.status === 'pending' ? '开始归档' : '确认归档';
    const advanceBtn = !isFinal
      ? `<button class="archive-advance-btn text-[10px] px-2 py-1 rounded bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 transition-colors" data-record-id="${r.id}" onclick="event.stopPropagation();">${advanceLabel}</button>`
      : '';
    return `
      <div class="p-3 rounded-xl bg-white hover:bg-gray-50 transition-colors flex items-center justify-between gap-3">
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 mb-0.5">
            <span class="text-sm font-medium text-gray-800 truncate">${r.activityName}</span>
            <span class="text-[10px] px-1.5 py-0.5 rounded-full ${catStyle} shrink-0">${r.category}</span>
            <span class="text-[10px] px-1.5 py-0.5 rounded-full border ${statusStyle} shrink-0">${ARCHIVE_STATUS_LABEL[r.status]}</span>
          </div>
          <span class="text-[10px] text-gray-400">归档日期：${r.archiveDate}</span>
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
          <svg class="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
          <span class="text-sm font-semibold text-gray-700">填写周报</span>
          ${draftReport ? `<span class="text-[10px] px-1.5 py-0.5 rounded-full border ${WEEKLY_STATUS_STYLE.draft}">${draftReport.week}</span>` : ''}
        </div>
        <div class="space-y-3">
          <div>
            <label class="block text-[11px] font-medium text-gray-600 mb-1">选择周次</label>
            <select id="weekly-week" class="w-full px-3 py-2 text-xs rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-200">
              ${WEEKLY_REPORTS.map(r => `<option value="${r.id}" ${r.status === 'draft' ? 'selected' : ''}>${r.week}（${r.weekRange}）</option>`).join('')}
            </select>
          </div>
          <div>
            <label class="block text-[11px] font-medium text-gray-600 mb-1">周报内容</label>
            <textarea id="weekly-content" rows="6" placeholder="请填写本周工作内容，每条一行..." class="w-full px-3 py-2 text-xs rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-200 resize-none">${draftReport ? draftReport.content : ''}</textarea>
          </div>
          <button id="weekly-submit-btn" class="w-full py-2 text-xs font-medium text-white rounded-lg transition-colors" style="background:${accent}">报送</button>
        </div>
      </div>

      <div class="lg:col-span-3 card rounded-xl p-5">
        <div class="flex items-center gap-2 mb-3">
          <svg class="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
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
          <span class="text-[10px] text-gray-400">${report.weekRange}</span>
          <span class="text-[10px] px-1.5 py-0.5 rounded-full border ${statusStyle}">${WEEKLY_STATUS_LABEL[report.status]}</span>
        </div>
        <div class="flex items-center gap-2">
          ${isSubmitted && report.submittedAt ? `<span class="text-[10px] text-gray-400">报送于 ${report.submittedAt}</span>` : ''}
          ${report.content ? `<button class="weekly-detail-toggle text-[10px] px-2 py-0.5 rounded bg-gray-50 text-gray-500 hover:bg-gray-100 transition-colors">展开</button>` : ''}
        </div>
      </div>
      ${report.content ? `<div class="weekly-detail-content hidden mt-2 p-2.5 rounded-lg bg-gray-50 text-xs text-gray-600 whitespace-pre-line">${report.content}</div>` : '<p class="text-[10px] text-gray-400 mt-1">暂无内容</p>'}
    </div>`;
}

registerRenderCallback(renderPropUI);

loadWorkspaceData({ role: 'prop-commissioner', storeInits: [() => TaskForceRecordStore.init()], fallbackData: () => ACTIVITIES, logTag: 'ws-prop' });
