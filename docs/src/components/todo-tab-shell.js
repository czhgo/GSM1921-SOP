// role: [工程师]+[AI]
// components/todo-tab-shell.js — 待办 tab 公共壳（T-304 代码减负 2026-08-30）
// 背景：6 个工作台 todo-tab 骨架逐字重复（选中首条 / renderTodoList / 两栏 HTML / 删除 / 详情按钮绑定），
//       书记 2026-08-30：「模块化只见代码增多少见代码减少」→ 共性抽壳。
// 设计：createTodoTab(opts) 工厂，每个角色一个实例（状态自持，与原模块级私有状态等价）。
// 角色差异经参数注入：containerId/prefix/role/onAction/buildAggregates/buildStats/
//       extraTopHtml/bindExtras/emptyHint/detailBtnClass/detailBtnStyle。
// 行为零变化：各 tab 原有渲染/跳转/删除/绑定逻辑逐字保留于壳内。
// 设计权威源：content/04_web_design/evolution/ARCHITECTURE_EVOLUTION.md §六 M6（共性抽象净减）

import { TodoStore } from '../services/todo.js?v=20260901p';
import { renderTodoList } from './todo-list.js?v=20260901p';
import { badgeHtml } from './badge.js?v=20260901p';
import { showToast } from '../core/utils.js?v=20260901p';
import { solidAccentStyle } from '../core/constants.js?v=20260901p';

/**
 * 创建待办 tab 壳实例
 * @param {Object} opts
 * @param {string} opts.containerId      工作台内容容器 id（如 'org-tab-content'）
 * @param {string} opts.prefix           事件/选择器前缀（如 'org'）
 * @param {string} opts.role             待办角色键（getGroupedByAction/getStatsByRole 用）
 * @param {(todo:Object, ctx:Object)=>void} opts.onAction  角色特有动作处理（必填）
 * @param {(ctx:Object)=>Array} [opts.buildAggregates]     聚合构建（缺省=TodoStore.getGroupedByAction(role)）
 * @param {(aggregates:Array)=>Object} [opts.buildStats]   统计构建（缺省=TodoStore.getStatsByRole(role)）
 * @param {string|(ctx:Object)=>string} [opts.extraTopHtml] 列表上方额外区块 HTML（数据交接等；需 ctx 时用函数）
 * @param {(container:Element, ctx:Object)=>void} [opts.bindExtras] 额外绑定（handoff 等）
 * @param {string} [opts.emptyHint]      空态提示文案（缺省=通用）
 * @param {string} [opts.detailBtnClass] 详情按钮 class（缺省=prefix-todo-detail-action）
 * @param {string} [opts.detailBtnStyle] 详情按钮内联样式（缺省=solidAccentStyle 主题色）
 */
export function createTodoTab(opts) {
  const {
    containerId,
    prefix,
    role,
    onAction,
    buildAggregates,
    buildStats,
    extraTopHtml = '',
    bindExtras,
    emptyHint = '或直接点击"去赋权/去审核"等按钮处理',
    detailBtnClass = `${prefix}-todo-detail-action`,
    detailBtnStyle,
  } = opts;

  // 私有状态（随壳实例自持，不污染入口——与原模块级私有状态等价）
  let _selectedTodoId = null;
  let _todoAggregates = null;

  /** 详情渲染（聚合对象 = 概要 + 处理入口；单项 = 状态 + 描述 + 处理） */
  function _renderTodoDetail(todo, ctx) {
    const btnStyle = detailBtnStyle || solidAccentStyle(ctx.accent, ctx.accentBorder);
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
            <button class="${detailBtnClass} text-xs px-3 py-1.5 rounded-lg text-white transition-colors hover:opacity-90" style="${btnStyle}">去处理</button>
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
          ${todo.actionType ? `<button class="${detailBtnClass} text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">处理</button>` : ''}
        </div>
      </div>
    `;
  }

  function renderContent(ctx) {
    const container = document.getElementById(containerId);
    if (!container) return;

    // 刷新过期状态
    TodoStore.refreshExpiredStatus();

    _todoAggregates = buildAggregates ? buildAggregates(ctx) : TodoStore.getGroupedByAction(role);
    const stats = buildStats ? buildStats(_todoAggregates) : TodoStore.getStatsByRole(role);
    // 自动选中首条（书记 2026-08-10 裁定推广）：进入待办即见第一条详情，减一次点击
    if (!_selectedTodoId && _todoAggregates.length > 0) {
      _selectedTodoId = _todoAggregates[0].groupKey;
    }
    const selectedTodo = _selectedTodoId ? (
      _todoAggregates.find(g => g.groupKey === _selectedTodoId) || TodoStore.getById(_selectedTodoId)
    ) : null;

    const { html: todoListHtml, bindEvents } = renderTodoList({
      prefix,
      groupedAggregates: _todoAggregates,
      stats,
      accent: ctx.accent,
      onSelectTodo: (todo) => {
        _selectedTodoId = todo.groupKey || todo.id;
        renderContent(ctx);
      },
      onActionTodo: (todo) => {
        onAction(todo, ctx);
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
        <p class="text-xs mt-1">${emptyHint}</p>
      </div>
    `;

    container.innerHTML = `
      ${typeof extraTopHtml === 'function' ? extraTopHtml(ctx) : extraTopHtml}
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
    bindExtras?.(container, ctx);
    // 详情面板按钮事件
    container.querySelector(`.${detailBtnClass}`)?.addEventListener('click', () => {
      if (!_selectedTodoId) return;
      const group = _todoAggregates?.find(g => g.groupKey === _selectedTodoId);
      if (group) { onAction(group, ctx); return; }
      const todo = TodoStore.getById(_selectedTodoId);
      if (todo) onAction(todo, ctx);
    });
  }

  return { renderContent };
}
