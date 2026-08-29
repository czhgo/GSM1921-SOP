// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  todo-list.js — 待办列表组件
//  最小三成本原则落地：进入工作台第一眼即见待办
//  Source: content/04_web_design/data/DATA_ARCHITECTURE.md §2.18.2
//         content/04_web_design/design-system/DESIGN_SYSTEM.md §一 第6条
// ════════════════════════════════════════════════════════════════

import {
  TodoCategory,
  TODO_CATEGORY_LABELS,
  TodoStatus,
  TODO_STATUS_LABELS,
  DEFAULT_EXPANDED_CATEGORIES,
} from '../services/todo.js?v=20260829h';
import { badgeHtml } from './badge.js?v=20260829h';
import { solidAccentStyle, dotDarkVars } from '../core/constants.js?v=20260829h';

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
 * @param {Function} [opts.onDeleteTodo]    — 删除待办回调 (todo) => void（B 档 CRUD 补全：传入才渲染删除键）
 *
 * @returns {{ html: string, bindEvents: (container: HTMLElement) => void }}
 */
export function renderTodoList(opts) {
  const {
    prefix,
    groupedTodos,
    stats,
    accent,
    selectedTodoId = null,
    onSelectTodo = () => {},
    onCompleteTodo = () => {},
    onActionTodo = () => {},
    onDeleteTodo = null,
    // 聚合待办（TodoStore.getGroupedByAction 返回值）；传入时列表按聚合卡渲染，替代明细列表
    groupedAggregates = null,
    // 行动按钮自定义内联样式（默认使用角色 accent 实心；visitor 传金色系，T-144 推广轮 2026-08-01）
    actionBtnStyle = '',
    // 空态引导文案（T-234 W1：默认通用引导；各工作台可 per-role 覆盖）
    emptyHint = '当前暂无待办。有新的活动、通知或待审事项时，会第一时间出现在这里。',
  } = opts;

  const today = new Date().toISOString().slice(0, 10);

  // 渲染统计条
  const totalNonExpired = stats._total - (stats._expired || 0);
  const statsHtml = `
    <div class="flex items-center gap-4 mb-4 text-xs text-gray-500">
      <span class="inline-flex items-center gap-1.5">
        <span class="inline-block w-1.5 h-1.5 rounded-full" style="${dotDarkVars(accent)}background:${accent};"></span>
        <span class="font-semibold text-gray-700 tabular-nums">${stats._total}</span>
        <span>待办</span>
      </span>
      ${stats._expired > 0 ? `
      <span class="inline-flex items-center gap-1.5">
        <span class="inline-block w-1.5 h-1.5 rounded-full bg-red-500"></span>
        <span class="font-semibold text-red-600 tabular-nums">${stats._expired}</span>
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

  const isAggregateMode = Array.isArray(groupedAggregates);

  let groupsHtml = '';
  if (isAggregateMode) {
    // 聚合模式：按分类分组，组内渲染聚合卡
    const byCat = {};
    for (const cat of categoryOrder) byCat[cat] = [];
    for (const g of groupedAggregates) {
      if (!byCat[g.category]) byCat[g.category] = [];
      byCat[g.category].push(g);
    }
    groupsHtml = categoryOrder
      .filter(cat => byCat[cat] && byCat[cat].length > 0)
      .map(cat => _renderAggregateGroup(prefix, cat, byCat[cat], accent, today, selectedTodoId, actionBtnStyle, onDeleteTodo))
      .join('');
  } else {
    groupsHtml = categoryOrder
      .filter(cat => groupedTodos[cat] && groupedTodos[cat].length > 0)
      .map(cat => _renderCategoryGroup(prefix, cat, groupedTodos[cat], accent, today, selectedTodoId, actionBtnStyle, onDeleteTodo))
      .join('');
  }

  const emptyHtml = (!groupsHtml) ? `
    <div class="text-center py-12 text-gray-400">
      <p class="text-sm">${emptyHint}</p>
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

    // 待办项点击（主体按钮区，右侧操作/完成按钮单独绑定）
    container.querySelectorAll(`.${prefix}-todo-item-main`).forEach(main => {
      main.addEventListener('click', () => {
        const todoId = main.dataset.todoId;
        const todo = _findTodoInGrouped(groupedTodos, todoId);
        if (todo) onSelectTodo(todo);
      });
    });

    // 聚合卡点击
    container.querySelectorAll(`.${prefix}-todo-item-main[data-group-key]`).forEach(main => {
      main.addEventListener('click', () => {
        const groupKey = main.dataset.groupKey;
        const g = _findGroupInAggregates(groupedAggregates, groupKey);
        if (g) onSelectTodo(g);
      });
    });

    // 聚合卡行动按钮（"处理"）
    container.querySelectorAll(`.${prefix}-todo-action-btn[data-group-key]`).forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const groupKey = btn.dataset.groupKey;
        const g = _findGroupInAggregates(groupedAggregates, groupKey);
        if (g) onActionTodo(g);
      });
    });

    // 行动按钮（如"去赋权"，data-todo-id 限定普通明细按钮）
    container.querySelectorAll(`.${prefix}-todo-action-btn[data-todo-id]`).forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const todoId = btn.dataset.todoId;
        const todo = _findTodoInGrouped(groupedTodos, todoId);
        if (todo) onActionTodo(todo);
      });
    });

    // 删除按钮（B 档 CRUD 补全：onDeleteTodo 传入时渲染；明细与聚合均支持）
    if (typeof onDeleteTodo === 'function') {
      container.querySelectorAll(`.${prefix}-todo-del-btn`).forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const groupKey = btn.dataset.groupKey;
          if (groupKey) {
            const g = _findGroupInAggregates(groupedAggregates, groupKey);
            if (g) onDeleteTodo(g);
            return;
          }
          const todoId = btn.dataset.todoId;
          const todo = _findTodoInGrouped(groupedTodos, todoId);
          if (todo) onDeleteTodo(todo);
        });
      });
    }
  }

  return { html, bindEvents };
}

// ── 渲染单个分类分组 ──────────────────────────────────────────
function _renderCategoryGroup(prefix, category, todos, accent, today, selectedTodoId, actionBtnStyle, onDeleteTodo) {
  const label = TODO_CATEGORY_LABELS[category] || category;
  const isExpanded = DEFAULT_EXPANDED_CATEGORIES.has(category);
  const hasExpired = todos.some(t => _isExpired(t, today));

  const itemsHtml = todos.map(todo => _renderTodoItem(prefix, todo, accent, today, selectedTodoId, actionBtnStyle, onDeleteTodo)).join('');

  return `
    <div class="${prefix}-todo-group mb-3" data-category="${category}">
      <button type="button" class="${prefix}-todo-group-header w-full text-left flex items-center justify-between px-3 py-2 rounded-t-lg cursor-pointer bg-transparent border-0 hover:bg-gray-50 transition-colors">
        <div class="flex items-center gap-2">
          <svg class="${prefix}-todo-arrow w-3 h-3 text-gray-400 transition-transform" style="transform:${isExpanded ? 'rotate(0deg)' : 'rotate(-90deg)'};" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 9l-7 7-7-7"/>
          </svg>
          <span class="font-title-cn text-sm font-bold text-gray-700">${label}</span>
          ${hasExpired ? badgeHtml('含过期', 'danger') : ''}
        </div>
        <span class="text-xs text-gray-400 tabular-nums">${todos.length}</span>
      </button>
      <div class="${prefix}-todo-group-items ${isExpanded ? '' : 'hidden'} rounded-b-lg">
        ${itemsHtml}
      </div>
    </div>
  `;
}

// ── 渲染单个待办项（单行紧凑式：色条+标题+截止/状态+行动/完成按钮）──
function _renderTodoItem(prefix, todo, accent, today, selectedTodoId, actionBtnStyle, onDeleteTodo) {
  const isExpired = _isExpired(todo, today);
  const isUrgent = todo.priority === 'urgent';
  const isSelected = todo.id === selectedTodoId;
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
    deadlineHtml = `<span class="text-xs ${color}">${prefix_text}${d}</span>`;
  }

  // 行动按钮文案
  const actionLabels = {
    authorize: '去赋权',
    archive: '去归档',
    review: '去审核',
    read: '去阅读',
    submit: '去提交',
    track: '去追踪',
    participate: '去参与',
  };
  const actionLabel = actionLabels[todo.actionType] || '处理';

  const flagHtml =
    (isExpired ? badgeHtml('过期', 'danger') : '') +
    (isUrgent && !isExpired ? badgeHtml('紧急', 'warning') : '');

  // 数据上下游标注（E2：标题下内嵌小字展示，无 flow 不显示）
  const flowHtml = todo.flow
    ? `<span class="block text-[11px] text-gray-400 truncate">${todo.flow}</span>`
    : '';

  // T223 卡片统一：移除行内左竖条（选中/紧急改用「紧急」标签 + 选中背景表达，不再画竖线）

  return `
    <div class="${prefix}-todo-item flex items-center border-b border-gray-50 last:border-b-0" data-todo-id="${todo.id}">
      <button type="button" class="${prefix}-todo-item-main flex-1 min-w-0 flex items-center gap-2 px-3 py-2.5 text-left bg-transparent border-0 transition-colors hover:bg-gray-50 ${isSelected ? 'bg-gray-50' : ''}" data-todo-id="${todo.id}">
        <span class="flex flex-col items-start gap-0.5 min-w-0 flex-1">
          <span class="flex items-center gap-1.5 min-w-0 w-full">
            ${flagHtml}
            <span class="text-sm font-medium text-gray-800 truncate">${todo.title}</span>
          </span>
          ${flowHtml}
        </span>
        <span class="flex items-center gap-2 flex-shrink-0">
          ${deadlineHtml}
          <span class="text-xs text-gray-400">${statusLabel}</span>
        </span>
      </button>
      <div class="flex items-center gap-1.5 ml-2 pr-3 flex-shrink-0">
        ${hasAction ? `
          <button type="button" class="${prefix}-todo-action-btn text-xs px-3 py-1.5 rounded-lg transition-colors hover:opacity-90" data-todo-id="${todo.id}" style="${actionBtnStyle || solidAccentStyle(accent)}">${actionLabel}</button>
        ` : ''}
        ${onDeleteTodo ? `<button type="button" class="${prefix}-todo-del-btn text-xs text-gray-300 hover:text-red-500 px-1.5 py-1 rounded hover:bg-red-50 transition-colors" data-todo-id="${todo.id}" title="删除该待办" style="cursor:pointer;">✕</button>` : ''}
      </div>
    </div>
  `;
}

// ── 渲染聚合分类分组 ────────────────────────────────────────
function _renderAggregateGroup(prefix, category, groups, accent, today, selectedTodoId, actionBtnStyle, onDeleteTodo) {
  const label = TODO_CATEGORY_LABELS[category] || category;
  const isExpanded = DEFAULT_EXPANDED_CATEGORIES.has(category);
  const hasExpired = groups.some(g => g.items.some(t => _isExpired(t, today)));

  const itemsHtml = groups.map(g => _renderAggregateItem(prefix, g, accent, today, selectedTodoId, actionBtnStyle, onDeleteTodo)).join('');

  return `
    <div class="${prefix}-todo-group mb-3" data-category="${category}">
      <button type="button" class="${prefix}-todo-group-header w-full text-left flex items-center justify-between px-3 py-2 rounded-t-lg cursor-pointer bg-transparent border-0 hover:bg-gray-50 transition-colors">
        <div class="flex items-center gap-2">
          <svg class="${prefix}-todo-arrow w-3 h-3 text-gray-400 transition-transform" style="transform:${isExpanded ? 'rotate(0deg)' : 'rotate(-90deg)'};" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 9l-7 7-7-7"/>
          </svg>
          <span class="font-title-cn text-sm font-bold text-gray-700">${label}</span>
          ${hasExpired ? badgeHtml('含过期', 'danger') : ''}
        </div>
        <span class="text-xs text-gray-400 tabular-nums">${groups.reduce((s, g) => s + g.count, 0)}</span>
      </button>
      <div class="${prefix}-todo-group-items ${isExpanded ? '' : 'hidden'} rounded-b-lg">
        ${itemsHtml}
      </div>
    </div>
  `;
}

// ── 渲染单个聚合卡（同跳转目标合并，数量角标 + 处理按钮）──
function _renderAggregateItem(prefix, g, accent, today, selectedTodoId, actionBtnStyle, onDeleteTodo) {
  const isSelected = g.groupKey === selectedTodoId;
  const hasExpired = g.items.some(t => _isExpired(t, today));

  // 2026-08-07 闭环化：actionKey 优先决定按钮文案（同 actionType 不同业务域区分），actionType 兜底
  const actionLabels = {
    'attendance-confirm': '去确认',
    'inspection-confirm': '去确认',
    'activity-archive': '去归档',
    'taskforce-archive': '去归档',
    'notice-read': '去阅读',
    'review-submit': '去提交',
    'review-confirm': '去复核',
    'signup-review': '去审核',
    authorize: '去赋权',
    archive: '去归档',
    review: '去审核',
    read: '去阅读',
    submit: '去提交',
    track: '去追踪',
    participate: '去参与',
  };
  const actionLabel = actionLabels[g.actionKey] || actionLabels[g.actionType] || '处理';

  return `
    <div class="${prefix}-todo-item flex items-center border-b border-gray-50 last:border-b-0" data-group-key="${g.groupKey}">
      <button type="button" class="${prefix}-todo-item-main flex-1 min-w-0 flex items-center gap-2 px-3 py-2.5 text-left bg-transparent border-0 transition-colors hover:bg-gray-50 ${isSelected ? 'bg-gray-50' : ''}" data-group-key="${g.groupKey}">
        <span class="flex flex-col items-start gap-0.5 min-w-0 flex-1">
          <span class="flex items-center gap-1.5 min-w-0 w-full">
            ${hasExpired ? badgeHtml('含过期', 'danger') : ''}
            <span class="text-sm font-medium text-gray-800 truncate">${g.title}</span>
            <span class="agg-count-badge text-xs px-1.5 py-0.5 rounded-full font-semibold tabular-nums flex-shrink-0">${g.count}</span>
          </span>
          ${g.flow ? `<span class="block text-[11px] text-gray-400 truncate">${g.flow}</span>` : ''}
        </span>
        <span class="flex items-center gap-2 flex-shrink-0">
          ${g.deadline ? `<span class="text-xs ${_isExpired({ status: 'pending', deadline: g.deadline }, today) ? 'text-red-600' : 'text-gray-400'}">${g.deadline}</span>` : ''}
        </span>
      </button>
      <div class="flex items-center gap-1.5 ml-2 pr-3 flex-shrink-0">
        <button type="button" class="${prefix}-todo-action-btn text-xs px-3 py-1.5 rounded-lg transition-colors hover:opacity-90" data-group-key="${g.groupKey}" style="${actionBtnStyle || solidAccentStyle(accent)}">${actionLabel}</button>
        ${onDeleteTodo ? `<button type="button" class="${prefix}-todo-del-btn text-xs text-gray-300 hover:text-red-500 px-1.5 py-1 rounded hover:bg-red-50 transition-colors" data-group-key="${g.groupKey}" title="删除该组待办" style="cursor:pointer;">✕</button>` : ''}
      </div>
    </div>
  `;
}

// ── 工具函数 ──────────────────────────────────────────────────
function _findGroupInAggregates(groups, groupKey) {
  if (!Array.isArray(groups)) return null;
  return groups.find(g => g.groupKey === groupKey) || null;
}

function _isExpired(todo, today) {
  if (todo.status === 'expired') return true;
  if (todo.status !== 'pending') return false;
  if (!todo.deadline) return false;
  return todo.deadline < today;
}

function _findTodoInGrouped(groupedTodos, todoId) {
  if (!groupedTodos || typeof groupedTodos !== 'object') return null; // 聚合模式下不传 groupedTodos
  for (const cat of Object.keys(groupedTodos)) {
    const found = groupedTodos[cat].find(t => t.id === todoId);
    if (found) return found;
  }
  return null;
}
