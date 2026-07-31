// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  todo-list.js — 待办列表组件
//  最小三成本原则落地：进入工作台第一眼即见待办
//  Source: content/04_web_design/DATA_ARCHITECTURE.md §2.18.2
//         content/04_web_design/DESIGN_SYSTEM.md §一 第6条
// ════════════════════════════════════════════════════════════════

import {
  TodoCategory,
  TODO_CATEGORY_LABELS,
  TodoStatus,
  TODO_STATUS_LABELS,
  DEFAULT_EXPANDED_CATEGORIES,
} from '../services/todo.js';

/**
 * 渲染待办列表组件
 *
 * @param {Object} opts
 * @param {string} opts.prefix              — 命名前缀（如 'leader'/'secretary'）
 * @param {Object} opts.groupedTodos        — 按分类分组的待办（TodoStore.getGroupedByCategory 返回值）
 * @param {Object} opts.stats               — 待办统计（TodoStore.getStatsByRole 返回值）
 * @param {string} opts.accent              — 强调色
 * @param {Function} [opts.onSelectTodo]    — 点击待办项回调 (todo) => void
 * @param {Function} [opts.onCompleteTodo]  — 完成待办回调 (todoId) => void
 * @param {Function} [opts.onActionTodo]    — 行动按钮回调 (todo) => void（如"去赋权"）
 *
 * @returns {{ html: string, bindEvents: (container: HTMLElement) => void }}
 */
export function renderTodoList(opts) {
  const {
    prefix,
    groupedTodos,
    stats,
    accent,
    onSelectTodo = () => {},
    onCompleteTodo = () => {},
    onActionTodo = () => {},
  } = opts;

  const today = new Date().toISOString().slice(0, 10);

  // 渲染统计条
  const totalNonExpired = stats._total - (stats._expired || 0);
  const statsHtml = `
    <div class="flex items-center gap-4 mb-4 text-xs text-gray-500">
      <span class="inline-flex items-center gap-1.5">
        <span class="inline-block w-1.5 h-1.5 rounded-full" style="background:${accent};"></span>
        <span class="font-semibold text-gray-700">${stats._total}</span>
        <span>待办</span>
      </span>
      ${stats._expired > 0 ? `
      <span class="inline-flex items-center gap-1.5">
        <span class="inline-block w-1.5 h-1.5 rounded-full bg-red-500"></span>
        <span class="font-semibold text-red-600">${stats._expired}</span>
        <span class="text-red-500">已过期</span>
      </span>
      ` : ''}
    </div>
  `;

  // 渲染各分类分组
  const categoryOrder = [
    TodoCategory.AUTH,
    TodoCategory.REVIEW,
    TodoCategory.ARCHIVE,
    TodoCategory.NOTICE,
    TodoCategory.SUBMIT,
    TodoCategory.TRACK,
  ];

  const groupsHtml = categoryOrder
    .filter(cat => groupedTodos[cat] && groupedTodos[cat].length > 0)
    .map(cat => _renderCategoryGroup(prefix, cat, groupedTodos[cat], accent, today))
    .join('');

  const emptyHtml = (!groupsHtml) ? `
    <div class="text-center py-12 text-gray-400">
      <p class="text-sm">暂无待办</p>
      <p class="text-xs mt-1">所有任务已完成</p>
    </div>
  ` : '';

  const html = `
    <div class="${prefix}-todo-list">
      ${statsHtml}
      ${groupsHtml}
      ${emptyHtml}
    </div>
  `;

  function bindEvents(container) {
    if (!container) return;

    // 分类折叠/展开
    container.querySelectorAll(`.${prefix}-todo-group-header`).forEach(header => {
      header.addEventListener('click', () => {
        const group = header.closest(`.${prefix}-todo-group`);
        const items = group?.querySelector(`.${prefix}-todo-group-items`);
        const arrow = header.querySelector(`.${prefix}-todo-arrow`);
        if (items) {
          items.classList.toggle('hidden');
          if (arrow) arrow.style.transform = items.classList.contains('hidden') ? 'rotate(-90deg)' : 'rotate(0deg)';
        }
      });
    });

    // 待办项点击
    container.querySelectorAll(`.${prefix}-todo-item`).forEach(item => {
      item.addEventListener('click', (e) => {
        // 排除按钮区域点击
        if (e.target.closest('button')) return;
        const todoId = item.dataset.todoId;
        const todo = _findTodoInGrouped(groupedTodos, todoId);
        if (todo) onSelectTodo(todo);
      });
    });

    // 完成按钮
    container.querySelectorAll(`.${prefix}-todo-complete-btn`).forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const todoId = btn.dataset.todoId;
        onCompleteTodo(todoId);
      });
    });

    // 行动按钮（如"去赋权"）
    container.querySelectorAll(`.${prefix}-todo-action-btn`).forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const todoId = btn.dataset.todoId;
        const todo = _findTodoInGrouped(groupedTodos, todoId);
        if (todo) onActionTodo(todo);
      });
    });
  }

  return { html, bindEvents };
}

// ── 渲染单个分类分组 ──────────────────────────────────────────
function _renderCategoryGroup(prefix, category, todos, accent, today) {
  const label = TODO_CATEGORY_LABELS[category] || category;
  const isExpanded = DEFAULT_EXPANDED_CATEGORIES.has(category);
  const hasExpired = todos.some(t => _isExpired(t, today));

  const itemsHtml = todos.map(todo => _renderTodoItem(prefix, todo, accent, today)).join('');

  return `
    <div class="${prefix}-todo-group mb-3" data-category="${category}">
      <div class="${prefix}-todo-group-header flex items-center justify-between px-3 py-2 rounded-t-lg cursor-pointer hover:bg-gray-50 transition-colors ${hasExpired ? 'border-l-2 border-red-400' : ''}" style="border-left:3px solid ${hasExpired ? '#EF4444' : accent + '40'};">
        <div class="flex items-center gap-2">
          <svg class="${prefix}-todo-arrow w-3 h-3 text-gray-400 transition-transform" style="transform:${isExpanded ? 'rotate(0deg)' : 'rotate(-90deg)'};" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 9l-7 7-7-7"/>
          </svg>
          <span class="font-title-cn text-sm font-bold text-gray-700">${label}</span>
          ${hasExpired ? `<span class="text-[10px] px-1.5 py-0.5 rounded-full bg-red-100 text-red-600">含过期</span>` : ''}
        </div>
        <span class="text-xs text-gray-400">${todos.length}</span>
      </div>
      <div class="${prefix}-todo-group-items ${isExpanded ? '' : 'hidden'} bg-white rounded-b-lg border border-gray-100 border-t-0">
        ${itemsHtml}
      </div>
    </div>
  `;
}

// ── 渲染单个待办项 ────────────────────────────────────────────
function _renderTodoItem(prefix, todo, accent, today) {
  const isExpired = _isExpired(todo, today);
  const isUrgent = todo.priority === 'urgent';
  const statusLabel = TODO_STATUS_LABELS[todo.status] || todo.status;
  const hasAction = !!todo.actionType;

  // 截止时间展示
  let deadlineHtml = '';
  if (todo.deadline) {
    const d = todo.deadline;
    const isToday = d === today;
    const isPast = d < today;
    const color = isPast ? 'text-red-600' : isToday ? 'text-orange-600' : 'text-gray-400';
    const prefix_text = isPast ? '已过期 ' : isToday ? '今日 ' : '';
    deadlineHtml = `<span class="text-[10px] ${color}">${prefix_text}${d}</span>`;
  }

  // 行动按钮文案
  const actionLabels = {
    authorize: '去赋权',
    archive: '去归档',
    review: '去审核',
    read: '去阅读',
    submit: '去提交',
    track: '去追踪',
  };
  const actionLabel = actionLabels[todo.actionType] || '处理';

  return `
    <div class="${prefix}-todo-item flex items-center justify-between px-3 py-2.5 border-b border-gray-50 last:border-b-0 hover:bg-gray-50 transition-colors cursor-pointer ${isExpired ? 'bg-red-50' : ''}" data-todo-id="${todo.id}">
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-1.5 mb-0.5">
          ${isExpired ? '<span class="text-[10px] px-1 py-0.5 rounded bg-red-100 text-red-600 font-medium">过期</span>' : ''}
          ${isUrgent && !isExpired ? '<span class="text-[10px] px-1 py-0.5 rounded bg-orange-100 text-orange-600 font-medium">紧急</span>' : ''}
          <span class="text-sm font-medium ${isExpired ? 'text-red-700' : 'text-gray-800'} truncate">${todo.title}</span>
        </div>
        <div class="flex items-center gap-2">
          ${deadlineHtml}
          <span class="text-[10px] text-gray-400">${statusLabel}</span>
        </div>
      </div>
      <div class="flex items-center gap-1.5 ml-2 flex-shrink-0">
        ${hasAction ? `
          <button class="${prefix}-todo-action-btn text-[10px] px-2 py-1 rounded text-white transition-colors hover:opacity-90" data-todo-id="${todo.id}" style="background:${accent};">${actionLabel}</button>
        ` : ''}
        <button class="${prefix}-todo-complete-btn text-[10px] px-2 py-1 rounded border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors" data-todo-id="${todo.id}" title="标记完成">✓</button>
      </div>
    </div>
  `;
}

// ── 工具函数 ──────────────────────────────────────────────────
function _isExpired(todo, today) {
  if (todo.status === 'expired') return true;
  if (todo.status !== 'pending') return false;
  if (!todo.deadline) return false;
  return todo.deadline < today;
}

function _findTodoInGrouped(groupedTodos, todoId) {
  for (const cat of Object.keys(groupedTodos)) {
    const found = groupedTodos[cat].find(t => t.id === todoId);
    if (found) return found;
  }
  return null;
}
