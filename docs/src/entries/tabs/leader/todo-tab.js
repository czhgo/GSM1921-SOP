// role: [工程师]+[AI]
// 组长工作台 Tab：待办（T-279 M2 拆分）
// 最小三成本原则落地：进入即见首条详情，减一次点击。

import { TodoStore, TodoStatus } from '../../../services/todo.js?v=20260829o';
import { renderTodoList } from '../../../components/todo-list.js?v=20260829o';
import { badgeHtml } from '../../../components/badge.js?v=20260829o';
import { showToast } from '../../../core/utils.js?v=20260829o';
import { solidAccentStyle } from '../../../core/constants.js?v=20260829o';

// 私有状态（随模块自持，不污染入口）
let _selectedTodoId = null;
let _todoAggregates = null;

export function renderContent(ctx) {
  const container = document.getElementById('leader-tab-content');
  if (!container) return;

  // 刷新过期状态
  TodoStore.refreshExpiredStatus();

  _todoAggregates = TodoStore.getGroupedByAction('leader');
  const stats = TodoStore.getStatsByRole('leader');
  // 自动选中首条（书记 2026-08-10 裁定推广）：进入待办即见第一条详情，减一次点击
  if (!_selectedTodoId && _todoAggregates.length > 0) {
    _selectedTodoId = _todoAggregates[0].groupKey;
  }
  const selectedTodo = _selectedTodoId ? (
    _todoAggregates.find(g => g.groupKey === _selectedTodoId) || TodoStore.getById(_selectedTodoId)
  ) : null;

  const { html: todoListHtml, bindEvents } = renderTodoList({
    prefix: 'leader',
    groupedAggregates: _todoAggregates,
    stats,
    accent: ctx.accent,
    onSelectTodo: (todo) => {
      _selectedTodoId = todo.groupKey || todo.id;
      renderContent(ctx);
    },
    onActionTodo: (todo) => {
      _handleTodoAction(todo, ctx);
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
  });

  const detailHtml = selectedTodo ? _renderTodoDetail(selectedTodo, ctx) : `
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
  _bindTodoDetailEvents(container, ctx);
}

function _renderTodoDetail(todo, ctx) {
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
          <button class="leader-todo-detail-action text-xs px-3 py-1.5 rounded-lg text-white transition-colors hover:opacity-90" style="${solidAccentStyle(ctx.accent, ctx.accentBorder)};">去处理</button>
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
        ${todo.actionType ? `<button class="leader-todo-detail-action text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">处理</button>` : ''}
      </div>
    </div>
  `;
}

function _handleTodoAction(todo, ctx) {
  // 通知阅读待办（T-234 F1）：直达通知详情页（聚合时取首条 noticeId）
  const firstNotice = (todo.items && todo.items[0]) || todo;
  if (firstNotice.sourceType === 'notice' && (firstNotice.actionData?.noticeId || todo.actionData?.noticeId)) {
    const noticeId = firstNotice.actionData?.noticeId || todo.actionData?.noticeId;
    const basePath = window.location.pathname.includes('/workspace/') ? '../' : '';
    window.location.href = `${basePath}notice.html?id=${noticeId}`;
    return;
  }
  // 报名审核待办（T233）：直达活动/专班详情页（多源聚合时取首条 sourceId）
  if (todo.actionKey === 'signup-review' || (todo.actionType === 'review' && ((todo.actionData && todo.actionData.signupId) || (todo.items || []).some(i => i.actionData && i.actionData.signupId)))) {
    const first = (todo.items && todo.items[0]) || todo;
    const srcId = first.sourceId || (first.actionData && first.actionData.sourceId);
    if (srcId) {
      const base = window.location.pathname.includes('/workspace/') ? '../' : '';
      const page = srcId.startsWith('tf-') ? 'taskforce.html' : 'activity.html';
      window.location.href = `${base}${page}?id=${srcId}`;
      return;
    }
  }
  // 根据 actionType 跳转到对应 tab
  // 2026-08-24 T-280-B1 实测修复：actionKey 优先（同 actionType 多业务域区分，
  // 对齐 disc todo-tab 的 actionKey 级 tabMap）——review-submit 归复盘提交而非考勤上传
  const actionKeyMap = {
    'attendance-upload': 'attendance',
    'review-submit': 'review',
  };
  const tabMap = {
    authorize: 'write',
    submit: 'attendance',
    review: 'review',
  };
  const targetTab = (todo.actionKey && actionKeyMap[todo.actionKey]) || tabMap[todo.actionType];
  if (targetTab) {
    // 激活对应 tab
    const btn = document.querySelector(`.leader-tab-btn[data-leader-tab="${targetTab}"]`);
    if (btn) btn.click();
    // T-190 赋权待办兜底：直达活动详情内联编辑（≤2 跳）
    // 2026-08-24 T-280-B1 实测修复：① 聚合对象无 sourceId（getGroupedByAction 聚合不含该字段），
    // 须从 items[0] 取；② 目标 tab 为懒加载动态 import 渲染异步 + 渲染中间态元素可能被重建，
    // 以「详情面板打开」为完成条件轮询重试点击
    const authSrcId = todo.sourceId || (todo.items && todo.items[0] && todo.items[0].sourceId);
    if (todo.actionType === 'authorize' && authSrcId) {
      let tries = 0;
      const timer = setInterval(() => {
        const actItem = document.querySelector(`.leader-act-item[data-act-id="${authSrcId}"]`);
        const panel = document.getElementById('leader-act-detail');
        if (panel && !panel.classList.contains('hidden')) { clearInterval(timer); return; } // 详情已打开
        if (actItem) actItem.click();
        if (++tries > 40) clearInterval(timer); // 4s 超时（懒加载渲染 + 重建窗口）
      }, 100);
    }
    const tabLabel = { write: '活动写入', attendance: '考勤上传', review: '复盘提交' }[targetTab] || '';
    showToast('info', `已跳转到${tabLabel}，请处理：${todo.title}`);
  } else {
    showToast('info', `请处理：${todo.title}`);
  }
}

// 绑定详情面板按钮事件（在 renderContent 之后由 render 回调触发）
function _bindTodoDetailEvents(container, ctx) {
  container.querySelector('.leader-todo-detail-action')?.addEventListener('click', () => {
    if (!_selectedTodoId) return;
    const group = _todoAggregates?.find(g => g.groupKey === _selectedTodoId);
    if (group) { _handleTodoAction(group, ctx); return; }
    const todo = TodoStore.getById(_selectedTodoId);
    if (todo) _handleTodoAction(todo, ctx);
  });
}
