// role: [工程师]+[AI]
// 宣传委员工作台 Tab：宣传任务（T-279 M3 拆分，照 M2 样板）
// 任务状态流转：待接收 → 进行中 → 已提交（seed 常量 + mockDB 持久化，刷新不再丢失）。

import { mockDB } from '../../../core/domain.js?v=20260901z';
import { persist } from '../../../core/data-adapter.js?v=20260901z';
import { showToast, downloadCSV, _fmtDate } from '../../../core/utils.js?v=20260901z';

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

export function renderContent() {
  const container = document.getElementById('prop-tab-content');
  if (!container) return;

  // 按状态分组
  const pending = _loadPropTasks().filter(t => t.status === 'pending');
  const inProgress = _loadPropTasks().filter(t => t.status === 'in_progress');
  const submitted = _loadPropTasks().filter(t => t.status === 'submitted');

  container.innerHTML = `
    <div class="flex items-center justify-between mb-4">
      <h3 class="font-title-cn text-base font-semibold text-gray-800">宣传任务</h3>
      <button class="prop-task-export-btn btn-tab" style="cursor:pointer;">导出 CSV</button>
    </div>
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

  // T-304 A 档下载闭环：宣传任务导出 CSV
  container.querySelector('.prop-task-export-btn')?.addEventListener('click', () => {
    const rows = _loadPropTasks().map(t => [t.source, t.type, t.summary, TASK_STATUS_LABEL[t.status] || t.status, t.createdAt]);
    downloadCSV(`宣传任务_${_fmtDate(new Date())}.csv`, ['来源', '类型', '任务内容', '状态', '创建日期'], rows);
    showToast('success', '宣传任务已导出');
  });

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
      renderContent();
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
