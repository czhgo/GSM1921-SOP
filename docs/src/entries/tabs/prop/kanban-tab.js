// role: [工程师]+[AI]
// 宣传委员工作台 Tab：项目看板（T-279 M3 拆分，照 M2 样板）
// 活动/专班合并看板（活动+专班分桶）+ 专班工作量区块；从 TaskForceRecordStore 动态派生（H-1 数据断裂修复）。

import { badgeHtml } from '../../../components/ui/badges.js?v=20261026a';
import { BranchService } from '../../../services/core/runtime.js?v=20261026a';
import { TodoStore, TodoSourceType } from '../../../services/governance/todo.js?v=20261026a';
import { persist } from '../../../data/data-adapter.js?v=20261026a';
import { showToast, escHtml as esc } from '../../../core/base/utils.js?v=20261026a';
import { setState } from '../../../core/base/state.js?v=20261026a';
import { resolveDocumentUrl } from '../../../core/base/page-url.js?v=20261026a';
// 「已归档」判据单一源（只看 archived === true；不得再把 status === 'completed' 当归档）
import { isActivityArchived, activityTypeBadgeVariant } from '../../../core/domain/constants.js?v=20261026a';
// 统一检索引擎（2026-09-14 批次 37）：三桶各接一个实例（keyword null + facets [] → 仅分页，保持三桶观感）
import { renderFilteredList } from '../../../components/ui/list-filter.js?v=20261026a';
import { renderTabHeader } from '../../../components/shell/page-frame.js?v=20261026a';
// Task 6：项目看板是跨对象聚合面 ⇒ 活动/专班卡直达完整详情页（direct）。
import { objectDetailHref } from '../../../core/domain/object-route.js?v=20261026a';

export function renderContent(ctx) {
  const container = document.getElementById('prop-tab-content');
  if (!container) return;

  const activities = ctx.activities || [];
  const propTf = ctx.propTf || [];

  // ── 从 TaskForceRecordStore 动态派生看板数据（H-1 数据断裂修复） ──
  // A07（2026-10-20 IA 修复批次）：本页**不再保留归档桶**——归档动作统一落「档案归档」页签
  //   （`?tab=archive`）。已归档活动仍按单一源 isActivityArchived 挡在在办视图之外，
  //   但不再于本页列出（避免与 archive 页形成第二个同构入口）。
  const unarchivedActs = activities.filter(a => !isActivityArchived(a));
  const pendingActs = unarchivedActs.filter(a => a.status === 'draft');
  const activeActs = unarchivedActs.filter(a => a.status === 'published' || a.status === 'ongoing');

  // 专班按状态分桶（宣传相关；专班无 archived 活动判据，保持现状）
  const pendingTf = propTf.filter(t => t.status === 'draft' || t.status === 'pending_review' || t.status === 'recruiting');
  const activeTf = propTf.filter(t => t.status === 'active');

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

  container.innerHTML = `
    ${renderTabHeader({ title: '项目看板', description: '活动与专班合并看板：待启动 / 进行中。' })}
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
      <div class="card rounded-xl p-0 overflow-hidden">
        <div class="px-4 py-3 font-title-cn text-sm font-bold tint-section tint-section--head" data-tone="neutral">待启动 (${pending.length})</div>
        <div class="p-3 space-y-2 min-h-[120px]" id="kanban-pending-host"></div>
      </div>
      <div class="card rounded-xl p-0 overflow-hidden">
        <div class="px-4 py-3 font-title-cn text-sm font-bold tint-section tint-section--head" data-tone="neutral">进行中 (${active.length})</div>
        <div class="p-3 space-y-2 min-h-[120px]" id="kanban-active-host"></div>
      </div>
    </div>
    <!-- A07：归档统一落「档案归档」页签；本页只承接待启动 / 进行中，不再设归档桶。 -->
    <p class="mb-4 text-xs text-gray-500">
      <a class="font-medium text-accent hover:underline" href="./workspace/prop.html?tab=archive">去档案归档</a>
      <span class="ml-1">（活动结束后的正式归档统一在档案归档页办理）</span>
    </p>
    <!-- 宣传任务泳道（2026-10-25 IA 62→45）：原「宣传任务」页签并入本页；渲染函数单一源＝prop/tasks-tab.js::renderBoard -->
    <div class="card rounded-xl p-0 overflow-hidden" id="prop-tasks-lane">
      <div class="px-4 py-3 font-title-cn text-sm font-bold tint-section tint-section--head" data-tone="neutral">宣传任务</div>
      <div class="p-3" id="prop-tasks-host"></div>
    </div>
  `;

  // 各桶各接一个引擎实例（keyword null + facets [] → 引擎不渲染检索条，只出分页；≤8 行不出翻页控件）。
  // A07：活动结束沿活动流程（结束后状态为 completed，正式归档在档案归档页）；本页不再承载归档桶。
  //   工作组收尾由组织委员统一办理，宣传看板仅提供详情入口。
  [
    { host: container.querySelector('#kanban-pending-host'), stateKey: 'prop-kanban-pending', rows: pending, emptyMessage: '暂无待启动项目', showComplete: false },
    { host: container.querySelector('#kanban-active-host'), stateKey: 'prop-kanban-active', rows: active, emptyMessage: '暂无进行中项目', showComplete: true },
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
    // 卡内「确认完成」按钮自带 inline onclick stopPropagation（行 HTML 逐字保留，不改），
    // 故用捕获阶段委托挂宿主：在按钮目标阶段 stopPropagation 前先拦到点击；再判整卡跳转。
    host.addEventListener('click', (e) => {
      const actBtn = e.target.closest('.activity-complete-btn');
      if (actBtn) {
        const actId = actBtn.dataset.actId;
        const activity = activities.find(a => a.id === actId);
        if (!activity) return;
        const confirmed = window.confirm(`确认结束活动「${activity.title || '未命名'}」？标记结束后请到「档案归档」页签完成正式归档。`);
        if (!confirmed) return;
        activity.status = 'completed';
        BranchService.updateActivity(actId, { status: 'completed' });
        persist(); // 扎口修复（Z1/Z3）：updateActivity 内部不落盘，必须显式 persist 写穿
        // 做事即销待办：活动完成 → 销宣传侧「活动归档」/支书「待复盘」
        TodoStore.completeBySource(TodoSourceType.ACTIVITY, actId);
        TodoStore.completeBySource(TodoSourceType.ACTIVITY, `review_${actId}`);
        showToast('success', `活动「${activity.title || '未命名'}」已标记结束，待档案归档`);
        setState({});
        return;
      }
      // 看板条目跳转详情（活动→activity.html / 专班→taskforce.html）
      const card = e.target.closest('.kanban-card');
      if (!card) return;
      const id = card.dataset.ki;
      if (!id) return;
      const type = card.dataset.kt === 'taskforce' ? 'taskforce' : 'activity';
      const href = objectDetailHref(type, id, { entry: 'workspace-aggregate' });
      if (href) window.location.href = resolveDocumentUrl(href.split('?')[0], { searchParams: { id } });
    }, true);
    // dogfood #13（2026-09-12）：卡片为 role=button 的 div，补 Enter/Space 键盘激活
    host.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      // 内层按钮 / 链接 / 表单件自有原生键盘激活，勿连带触发整卡跳转（「确认完成」回车执行自身动作）
      if (e.target.closest('button,a,input,textarea,select')) return;
      const card = e.target.closest('.kanban-card');
      if (!card) return;
      e.preventDefault();
      card.click();
    });
  });

  // 宣传任务泳道（2026-10-25 IA 62→45）：复用 `tasks-tab.js::renderBoard`（列表 / 登记 / 推进 / 作废单一源）。
  const tasksHost = container.querySelector('#prop-tasks-host');
  if (tasksHost) {
    import('./tasks-tab.js?v=20261026a').then((m) => {
      if (tasksHost.isConnected) m.renderBoard(tasksHost, ctx, { header: false });
    });
    // 旧深链 `?tab=kanban&lane=tasks`：滚到本条泳道并给可见落点。
    if (ctx?.navTarget?.lane === 'tasks') {
      container.querySelector('#prop-tasks-lane')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
}

function _renderKanbanItem(item, showCompleteBtn = false) {
  const isTf = item._type === 'taskforce';
  const typeTag = isTf
    ? badgeHtml('专班', 'success')
    : (item.type ? badgeHtml(item.type, activityTypeBadgeVariant(item.type)) : '');
  const subInfo = isTf
    ? `<span class="text-xs text-gray-500">${item.filled}/${item.capacity} 人 × ${item.contributions} 产出</span>`
    : '';
  const completeBtn = showCompleteBtn && !isTf
    ? `<button class="btn-accent-soft activity-complete-btn text-xs px-3 py-1.5 mt-1" data-act-id="${item.id}" onclick="event.stopPropagation();">确认完成</button>`
    : (showCompleteBtn && isTf ? '<span class="text-xs text-gray-500">收尾由组织委员办理</span>' : '');
  return `
    <div class="kanban-card p-3 rounded-xl bg-white hover:bg-surface-hover transition-colors cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#CE1126]" role="button" tabindex="0" aria-label="查看 ${esc(item.title || '未命名')} 详情" data-kt="${item._type}" data-ki="${item.id}">
      <div class="flex items-center gap-2 mb-0.5">
        <span class="text-sm font-medium text-gray-800">${item.title || '未命名'}</span>
        ${typeTag}
      </div>
      <div class="text-xs text-gray-500 mt-0.5">${item.date || ''} ${subInfo}</div>
      ${isTf && item.task ? `<div class="text-[12px] text-gray-500 mt-0.5 line-clamp-1">${item.task}</div>` : ''}
      ${completeBtn}
    </div>`;
}
