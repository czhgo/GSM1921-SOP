// role: [工程师]+[AI]
// 参与者工作台 Tab：待办（T-279 M3 拆分，照 M2 样板）
// 最小三成本原则落地：进入即见首条详情，减一次点击。

import { TodoStore } from '../../../services/todo.js?v=20260829f';
import { renderTodoList } from '../../../components/todo-list.js?v=20260829f';
import { badgeHtml } from '../../../components/badge.js?v=20260829f';
import { showToast } from '../../../core/utils.js?v=20260829f';

// 私有状态（随模块自持，不污染入口）
let _selectedTodoId = null;
let _todoAggregates = null;

export function renderContent(ctx) {
  const container = document.getElementById('visitor-tab-content');
  if (!container) return;

  // 刷新过期状态
  TodoStore.refreshExpiredStatus();

  _todoAggregates = TodoStore.getGroupedByAction('visitor');
  const stats = TodoStore.getStatsByRole('visitor');
  // 自动选中首条（书记 2026-08-10 裁定推广）：进入待办即见第一条详情，减一次点击
  if (!_selectedTodoId && _todoAggregates.length > 0) {
    _selectedTodoId = _todoAggregates[0].groupKey;
  }
  const selectedTodo = _selectedTodoId ? (
    _todoAggregates.find(g => g.groupKey === _selectedTodoId) || TodoStore.getById(_selectedTodoId)
  ) : null;

  const { html: todoListHtml, bindEvents } = renderTodoList({
    prefix: 'visitor',
    groupedAggregates: _todoAggregates,
    stats,
    accent: ctx.accent,
    onSelectTodo: (todo) => {
      _selectedTodoId = todo.groupKey || todo.id;
      renderContent(ctx);
    },
    onActionTodo: (todo) => {
      _handleTodoAction(todo);
    },
    // B 档 CRUD 补全：待办删除（确认后删除，聚合卡删除整组）
    onDeleteTodo: (todo) => {
      const items = todo.items && todo.items.length ? todo.items : [todo];
      const label = items.length === 1 ? items[0].title : `${items[0].title} 等 ${items.length} 条`;
      if (!window.confirm(`确认删除待办「${label}」？删除后不可恢复。`)) return;
      items.forEach(t => TodoStore.delete(t.id));
      showToast('success', '待办已删除');
      renderContent(ctx);
    },
    // G3 修正（2026-08-08）：纯亮金 #FFD700 实底过艳 → 金浅底 rgba(255,215,0,0.12)+深金字；
    // 补金边框与详情按钮一致（G2-c 裁定「同页两按钮金感不一致」）
    actionBtnStyle: '--acc-bg-dark:rgba(251,191,36,0.16);--acc-text-dark:#FBBF24;--acc-border-dark:rgba(251,191,36,0.35);background:rgba(255,215,0,0.12);color:#A16207;border:1px solid rgba(255,215,0,0.35);',
  });

  const detailHtml = selectedTodo ? _renderTodoDetail(selectedTodo) : `
    <div class="text-center py-12 text-gray-400">
      <p class="text-sm">点击左侧待办查看详情</p>
      <p class="text-xs mt-1">或直接点击"去阅读/去提交"等按钮处理</p>
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
  _bindTodoDetailEvents(container);
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
          <button class="visitor-todo-detail-action text-xs px-3 py-1.5 rounded-lg transition-colors" style="--acc-bg-dark:rgba(251,191,36,0.16);--acc-text-dark:#FBBF24;--acc-border-dark:rgba(251,191,36,0.35);background:rgba(255,215,0,0.12);color:#A16207;border:1px solid rgba(255,215,0,0.35);">去处理</button>
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
        ${todo.actionType ? `<button class="visitor-todo-detail-action text-xs px-3 py-1.5 rounded-lg transition-colors" style="--acc-bg-dark:rgba(251,191,36,0.16);--acc-text-dark:#FBBF24;--acc-border-dark:rgba(251,191,36,0.35);background:rgba(255,215,0,0.12);color:#A16207;border:1px solid rgba(255,215,0,0.35);">处理</button>` : ''}
      </div>
    </div>
  `;
}

function _handleTodoAction(todo) {
  // 通知类待办：优先跳转通知详情页
  if (todo.sourceType === 'notice' && todo.actionData?.noticeId) {
    const basePath = window.location.pathname.includes('/workspace/') ? '../' : '';
    window.location.href = `${basePath}notice.html?id=${todo.actionData.noticeId}`;
    return;
  }
  // 报名审核待办：活动/专班 → 统一详情页（T233）
  if (todo.actionKey === 'signup-review' || (todo.actionType === 'review' && todo.actionData?.signupId)) {
    const basePath = window.location.pathname.includes('/workspace/') ? '../' : '';
    const srcId = todo.sourceId || todo.actionData?.sourceId;
    if (srcId) {
      const page = srcId.startsWith('tf-') ? 'taskforce.html' : 'activity.html';
      window.location.href = `${basePath}${page}?id=${srcId}`;
      return;
    }
  }
  // 根据 actionType 跳转到对应 tab
  const tabMap = {
    read: 'activities',
    submit: 'inspection',
    participate: 'activities',
  };
  const targetTab = tabMap[todo.actionType];
  if (targetTab) {
    const btn = document.querySelector(`.visitor-tab-btn[data-visitor-tab="${targetTab}"]`);
    if (btn) btn.click();
    const tabLabels = { read: '活动动态', submit: '我的考察', participate: '活动动态' };
    showToast('info', `已跳转到${tabLabels[todo.actionType] || '对应功能'}，请处理：${todo.title}`);
  } else {
    showToast('info', `请处理：${todo.title}`);
  }
}

// 绑定详情面板按钮事件（在 renderContent 之后由 render 回调触发）
function _bindTodoDetailEvents(container) {
  container.querySelector('.visitor-todo-detail-action')?.addEventListener('click', () => {
    if (!_selectedTodoId) return;
    const group = _todoAggregates?.find(g => g.groupKey === _selectedTodoId);
    if (group) { _handleTodoAction(group); return; }
    const todo = TodoStore.getById(_selectedTodoId);
    if (todo) _handleTodoAction(todo);
  });
}
