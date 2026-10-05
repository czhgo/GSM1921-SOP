// role: [工程师]+[AI]
// 宣传委员工作台 Tab：宣传任务（T-279 M3 拆分，照 M2 样板）
// 任务状态流转：待接收 → 进行中 → 已提交（seed 常量 + mockDB 持久化，刷新不再丢失）。

import { mockDB } from '../../../core/domain/domain.js?v=20261005m';
import { persist } from '../../../data/data-adapter.js?v=20261005m';
import { showToast, downloadCSV, _fmtDate } from '../../../core/base/utils.js?v=20261005m';
// 2026-10-03 批次 358（`D-751`）：宣传任务「作废（软）」——弹窗**单一源**（原因必填那句校验只此一处）
import { openVoidModal } from '../../../components/ui/void-record.js?v=20261005m';
import { filterActive } from '../../../services/governance/soft-void.js?v=20261005m';

// ── 宣传任务 mock 数据（2026-08-05：seed 常量 + mockDB 持久化，刷新不再丢失）──
// 2026-09-28 批次 234：常量**搬到内容单一源** `docs/src/data/mock/prop.js`（服务端 `server/seed.js` 同源 import，
//   原先此处私有常量被服务端逐字复刻一份 ⇒ 两份字面量，本批收成一份；取值与顺序一字未改）。
import { PROP_TASKS_SEED } from '../../../data/mock/prop.js?v=20261005m';

// 从 mockDB 读取（seed 兜底注入一次）；写操作须更新 mockDB.propTasks 后调用 persist()
function _loadPropTasks() {
  if (mockDB.propTasks.length === 0 && PROP_TASKS_SEED.length > 0) {
    mockDB.propTasks = PROP_TASKS_SEED.map(t => ({ ...t }));
  }
  return mockDB.propTasks;
}

// 读侧出列（2026-10-03 批次 358 · `D-751`）：被「作废（软）」的宣传任务不进列表 / 分组计数 / 导出；
//   写路径（`_loadPropTasks()` 的 seed 兜底与行内状态推进）仍用**原始数组**，故另立本读口。
function _activePropTasks() {
  return filterActive('propTasks', _loadPropTasks());
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
  const pending = _activePropTasks().filter(t => t.status === 'pending');
  const inProgress = _activePropTasks().filter(t => t.status === 'in_progress');
  const submitted = _activePropTasks().filter(t => t.status === 'submitted');

  container.innerHTML = `
    <div class="flex items-center justify-between mb-4">
      <h3 class="font-title-cn text-base font-semibold text-gray-800">宣传任务</h3>
      <button class="prop-task-export-btn btn-tab" style="cursor:pointer;">导出 CSV</button>
    </div>
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
      <div class="card rounded-xl p-0 overflow-hidden">
        <div class="px-4 py-3 font-title-cn text-sm font-bold" style="--acc-bg-dark:rgba(251,191,36,0.10);--acc-text-dark:#FBBF24;--acc-border-dark:rgba(251,191,36,0.25);background:rgba(245,158,11,0.06);color:color-mix(in srgb, var(--accent-amber) 60%, #000);border-bottom:2px solid rgba(245,158,11,0.15);">待接收 (${pending.length})</div>
        <div class="p-3 space-y-2 min-h-[120px]">
          ${pending.length === 0 ? '<p class="text-xs text-gray-500 text-center py-6">暂无待接收任务</p>' :
            pending.map(t => _renderTaskCard(t)).join('')}
        </div>
      </div>
      <div class="card rounded-xl p-0 overflow-hidden">
        <div class="px-4 py-3 font-title-cn text-sm font-bold" style="--acc-bg-dark:rgba(96,165,250,0.10);--acc-text-dark:#60A5FA;--acc-border-dark:rgba(96,165,250,0.25);background:rgba(59,130,246,0.06);color:color-mix(in srgb, var(--accent-blue) 60%, #000);border-bottom:2px solid rgba(59,130,246,0.15);">进行中 (${inProgress.length})</div>
        <div class="p-3 space-y-2 min-h-[120px]">
          ${inProgress.length === 0 ? '<p class="text-xs text-gray-500 text-center py-6">暂无进行中任务</p>' :
            inProgress.map(t => _renderTaskCard(t)).join('')}
        </div>
      </div>
      <div class="card rounded-xl p-0 overflow-hidden">
        <div class="px-4 py-3 font-title-cn text-sm font-bold" style="--acc-bg-dark:rgba(52,211,153,0.10);--acc-text-dark:#34D399;--acc-border-dark:rgba(52,211,153,0.25);background:rgba(16,185,129,0.06);color:color-mix(in srgb, var(--functional-success) 60%, #000);border-bottom:2px solid rgba(16,185,129,0.15);">已提交 (${submitted.length})</div>
        <div class="p-3 space-y-2 min-h-[120px]">
          ${submitted.length === 0 ? '<p class="text-xs text-gray-500 text-center py-6">暂无已提交任务</p>' :
            submitted.map(t => _renderTaskCard(t)).join('')}
        </div>
      </div>
    </div>
  `;

  // T-304 A 档下载闭环：宣传任务导出 CSV
  container.querySelector('.prop-task-export-btn')?.addEventListener('click', () => {
    const rows = _activePropTasks().map(t => [t.source, t.type, t.summary, TASK_STATUS_LABEL[t.status] || t.status, t.createdAt]);
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
      showToast('success', `任务「${task.summary}」状态已更新为「${TASK_STATUS_LABEL[nextStatus]}」`);
      renderContent();
    });
  });

  // 作废（软）——2026-10-03 批次 358（`D-751`）：弹窗走单一源 `components/ui/void-record.js`；
  //   支委层直接作废、其余人报支委会；作废后读侧即出列（`_activePropTasks()`）⇒ 就地重渲染。
  container.querySelectorAll('.prop-task-void-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const task = _activePropTasks().find(t => t.id === btn.dataset.taskId);
      if (!task) return;
      openVoidModal({
        resource: 'propTasks',
        id: task.id,
        subject: task.summary || task.id,
        label: '宣传任务',
        modalId: 'prop-task-void-modal',
        reasonId: 'prop-task-void-reason',
        okAttr: 'data-prop-task-void-ok',
        cancelAttr: 'data-prop-task-void-cancel',
        onDone: () => renderContent(),
      });
    });
  });
}

function _renderTaskCard(task) {
  const isFinal = task.status === 'submitted';
  const advanceLabel = task.status === 'pending' ? '接收' : '提交';
  const advanceBtn = !isFinal
    ? `<button class="btn-accent-soft task-advance-btn text-xs px-3 py-1.5 mt-1" data-task-id="${task.id}" onclick="event.stopPropagation();">${advanceLabel}</button>`
    : '';
  // 批次 358（`D-751`）：行内「作废（软）」键（软作废 · 留痕 · 默认列表出列；原因必填在弹窗单一源里）
  const voidBtn = `<button class="btn-ghost prop-task-void-btn text-xs px-2 py-1 mt-1" data-task-id="${task.id}" title="作废（软 · 留痕）">作废</button>`;
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
        <span class="text-xs text-gray-500">来自：${task.source} · ${task.createdAt}</span>
        <span class="inline-flex items-center gap-1.5">${advanceBtn}${voidBtn}</span>
      </div>
    </div>`;
}
