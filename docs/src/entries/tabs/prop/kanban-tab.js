// role: [工程师]+[AI]
// 宣传委员工作台 Tab：项目看板（T-279 M3 拆分，照 M2 样板）
// 活动/专班合并看板（活动+专班分桶）+ 专班工作量区块；从 TaskForceRecordStore 动态派生（H-1 数据断裂修复）。

import { badgeHtml } from '../../../components/badges.js?v=20260920a';
import { BranchService } from '../../../services/runtime.js?v=20260920a';
import { TaskForceRecordStore } from '../../../services/taskforce.js?v=20260920a';
import { TodoStore, TodoSourceType } from '../../../services/todo.js?v=20260920a';
import { NoticeStore } from '../../../services/notice.js?v=20260920a';
import { persist } from '../../../core/data-adapter.js?v=20260920a';
import { showToast, escHtml as esc } from '../../../core/utils.js?v=20260920a';
import { setState } from '../../../core/state.js?v=20260920a';
// 统一检索引擎（2026-09-14 批次 37）：三桶各接一个实例（keyword null + facets [] → 仅分页，保持三桶观感）
import { renderFilteredList } from '../../../components/list-filter.js?v=20260920a';

export function renderContent(ctx) {
  const container = document.getElementById('prop-tab-content');
  if (!container) return;

  const activities = ctx.activities || [];
  const propTf = ctx.propTf || [];

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
    ...pendingTf.map(t => ({ _type: 'taskforce', id: t.id, title: t.name, date: t.deadline || t.createdAt, type: '专班', status: t.status, task: t.task, capacity: t.capacity, filled: t.members.filter(m => m.personId).length, contributions: t.members.reduce((s, m) => s + ((m.contributions || []).length), 0) })),
  ].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  // 合并进行中：活动 + 专班（T223 桶内新者在前）
  const active = [
    ...activeActs.map(a => ({ _type: 'activity', ...a })),
    ...activeTf.map(t => ({ _type: 'taskforce', id: t.id, title: t.name, date: t.deadline || t.createdAt, type: '专班', status: t.status, task: t.task, capacity: t.capacity, filled: t.members.filter(m => m.personId).length, contributions: t.members.reduce((s, m) => s + ((m.contributions || []).length), 0) })),
  ].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  // 合并已归档：活动 + 专班（T223 桶内新者在前）
  const completed = [
    ...completedActs.map(a => ({ _type: 'activity', ...a })),
    ...completedTf.map(t => ({ _type: 'taskforce', id: t.id, title: t.name, date: t.deadline || t.createdAt, type: '专班', status: t.status, task: t.task, capacity: t.capacity, filled: t.members.filter(m => m.personId).length, contributions: t.members.reduce((s, m) => s + ((m.contributions || []).length), 0) })),
  ].sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  container.innerHTML = `
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
      <div class="card rounded-xl p-0 overflow-hidden">
        <div class="px-4 py-3 font-title-cn text-sm font-bold" style="--acc-bg-dark:rgba(96,165,250,0.10);--acc-text-dark:#60A5FA;--acc-border-dark:rgba(96,165,250,0.25);background:rgba(37,99,235,0.06);color:#2563eb;border-bottom:2px solid rgba(37,99,235,0.15);">待启动 (${pending.length})</div>
        <div class="p-3 space-y-2 min-h-[120px]" id="kanban-pending-host"></div>
      </div>
      <div class="card rounded-xl p-0 overflow-hidden">
        <div class="px-4 py-3 font-title-cn text-sm font-bold" style="--acc-bg-dark:rgba(96,165,250,0.10);--acc-text-dark:#60A5FA;--acc-border-dark:rgba(96,165,250,0.25);background:rgba(59,130,246,0.06);color:color-mix(in srgb, #3b82f6 60%, #000);border-bottom:2px solid rgba(59,130,246,0.15);">进行中 (${active.length})</div>
        <div class="p-3 space-y-2 min-h-[120px]" id="kanban-active-host"></div>
      </div>
    </div>
    ${completed.length > 0 ? `
    <details class="card rounded-xl p-0 overflow-hidden">
      <summary class="px-4 py-3 font-title-cn text-sm font-bold cursor-pointer select-none" style="--acc-bg-dark:rgba(148,163,184,0.10);--acc-text-dark:#94A3B8;--acc-border-dark:rgba(148,163,184,0.25);background:rgba(107,114,128,0.06);color:#4B5563;border-bottom:2px solid rgba(107,114,128,0.15);">已归档 (${completed.length})</summary>
      <div class="p-3 space-y-2" id="kanban-completed-host"></div>
    </details>` : ''}
  `;

  // 三桶各接一个引擎实例（keyword null + facets [] → 引擎不渲染检索条，只出分页；≤8 行不出翻页控件）。
  // 卡片 HTML 逐字保留；行内「确认完成/归档」与整卡跳转改事件委托，挂在各桶宿主上。
  const _detailBase = window.location.pathname.includes('/workspace/') ? '../' : '';
  [
    { host: container.querySelector('#kanban-pending-host'), stateKey: 'prop-kanban-pending', rows: pending, emptyMessage: '暂无待启动项目', showComplete: false },
    { host: container.querySelector('#kanban-active-host'), stateKey: 'prop-kanban-active', rows: active, emptyMessage: '暂无进行中项目', showComplete: true },
    { host: container.querySelector('#kanban-completed-host'), stateKey: 'prop-kanban-completed', rows: completed, emptyMessage: '暂无已归档项目', showComplete: false },
  ].forEach(({ host, stateKey, rows, emptyMessage, showComplete }) => {
    if (!host) return;
    renderFilteredList(host, {
      stateKey,
      rows,
      keyword: null,
      facets: [],
      countUnit: '个',
      listClass: 'space-y-2',
      emptyMessage,
      rowHtml: (item) => _renderKanbanItem(item, showComplete),
    });
    // 卡内「确认完成 / 归档」按钮自带 inline onclick stopPropagation（行 HTML 逐字保留，不改），
    // 故用捕获阶段委托挂宿主：在按钮目标阶段 stopPropagation 前先拦到点击；再判整卡跳转。
    host.addEventListener('click', (e) => {
      const actBtn = e.target.closest('.activity-complete-btn');
      if (actBtn) {
        const actId = actBtn.dataset.actId;
        const activity = activities.find(a => a.id === actId);
        if (!activity) return;
        const confirmed = window.confirm(`确认完成活动「${activity.title || '未命名'}」？完成后将归入已归档。`);
        if (!confirmed) return;
        activity.status = 'completed';
        BranchService.updateActivity(actId, { status: 'completed' });
        persist(); // 扎口修复（Z1/Z3）：updateActivity 内部不落盘，必须显式 persist 写穿
        // 做事即销待办：活动完成 → 销宣传侧「活动归档」/支书「待复盘」
        TodoStore.completeBySource(TodoSourceType.ACTIVITY, actId);
        TodoStore.completeBySource(TodoSourceType.ACTIVITY, `review_${actId}`);
        showToast('success', `活动「${activity.title || '未命名'}」已完成并归档`);
        setState({});
        return;
      }
      const tfBtn = e.target.closest('.tf-complete-btn');
      if (tfBtn) {
        const tfId = tfBtn.dataset.tfId;
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
        setState({});
        return;
      }
      // 看板条目跳转详情（活动→activity.html / 专班→taskforce.html）
      const card = e.target.closest('.kanban-card');
      if (!card) return;
      const id = card.dataset.ki;
      if (!id) return;
      window.location.href = card.dataset.kt === 'taskforce'
        ? `${_detailBase}taskforce.html?id=${id}`
        : `${_detailBase}activity.html?id=${id}`;
    }, true);
    // dogfood #13（2026-09-12）：卡片为 role=button 的 div，补 Enter/Space 键盘激活
    host.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      const card = e.target.closest('.kanban-card');
      if (!card) return;
      e.preventDefault();
      card.click();
    });
  });
}

function _renderKanbanItem(item, showCompleteBtn = false) {
  const isTf = item._type === 'taskforce';
  const typeTag = isTf
    ? badgeHtml('专班', 'success')
    : (item.type ? badgeHtml(item.type, 'info') : '');
  const subInfo = isTf
    ? `<span class="text-xs text-gray-500">${item.filled}/${item.capacity} 人 × ${item.contributions} 产出</span>`
    : '';
  const completeBtn = showCompleteBtn
    ? (isTf
      ? `<button class="tf-complete-btn text-xs px-3 py-1.5 rounded-lg bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 transition-colors mt-1" data-tf-id="${item.id}" onclick="event.stopPropagation();">归档专班</button>`
      : `<button class="activity-complete-btn text-xs px-3 py-1.5 rounded-lg bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 transition-colors mt-1" data-act-id="${item.id}" onclick="event.stopPropagation();">确认完成</button>`)
    : '';
  return `
    <div class="kanban-card p-3 rounded-xl bg-white hover:bg-gray-200 transition-colors cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#CE1126]" role="button" tabindex="0" aria-label="查看 ${esc(item.title || '未命名')} 详情" data-kt="${item._type}" data-ki="${item.id}">
      <div class="flex items-center gap-2 mb-0.5">
        <span class="text-sm font-medium text-gray-800">${item.title || '未命名'}</span>
        ${typeTag}
      </div>
      <div class="text-xs text-gray-500 mt-0.5">${item.date || ''} ${subInfo}</div>
      ${isTf && item.task ? `<div class="text-[12px] text-gray-500 mt-0.5 line-clamp-1">${item.task}</div>` : ''}
      ${completeBtn}
    </div>`;
}
