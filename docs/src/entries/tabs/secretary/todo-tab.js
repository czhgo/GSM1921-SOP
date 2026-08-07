// role: [工程师]+[AI]
// entries/tabs/secretary/todo-tab.js — 书记工作台·待办 tab（懒加载模块）
// 2026-08-07 自 ws-secretary-entry.js 拆分：按 tab 代码分割，首屏只加载默认 tab。

import { showToast } from '../../../core/utils.js?v=20260807c';
import { renderTodoList } from '../../../components/todo-list.js?v=20260807c';
import { TodoStore, seedTodos } from '../../../services/todo.js?v=20260807c';
import { SecretaryTodoDeriver } from '../../../services/secretary-overview.js?v=20260807c';
import { badgeHtml } from '../../../components/badge.js?v=20260807c';

const accent = '#B91C1C';

let _selectedTodoId = null;

/** 渲染待办 tab（双栏：列表+详情） */
export function renderContent() {
  const container = document.getElementById('secretary-tab-content');
  if (!container) return;
  container.dataset.currentTab = 'todo';

  // 补种子数据 + 派生活动/专班/考勤异常待办（幂等，确保首访即有数据，不依赖先打开全局概况）
  seedTodos();
  SecretaryTodoDeriver.deriveAll();

  // 刷新过期状态
  TodoStore.refreshExpiredStatus();

  const groupedTodos = TodoStore.getGroupedByCategory('secretary');
  const stats = TodoStore.getStatsByRole('secretary');

  // 未选中任何待办时自动选中第一条（按分类顺序）——避免右卡空占位造成的左右失衡
  let selectedTodo = _selectedTodoId ? TodoStore.getById(_selectedTodoId) : null;
  if (!selectedTodo && stats._total > 0) {
    for (const cat of Object.keys(groupedTodos)) {
      const first = (groupedTodos[cat] || [])[0];
      if (first) { selectedTodo = first; _selectedTodoId = first.id; break; }
    }
  }

  const { html: todoListHtml, bindEvents } = renderTodoList({
    prefix: 'secretary',
    groupedTodos,
    stats,
    accent,
    selectedTodoId: _selectedTodoId,
    onSelectTodo: (todo) => {
      _selectedTodoId = todo.id;
      renderContent();
    },
    onCompleteTodo: (todoId) => {
      TodoStore.complete(todoId);
      if (_selectedTodoId === todoId) _selectedTodoId = null;
      showToast('success', '待办已完成');
      renderContent();
    },
    onActionTodo: (todo) => {
      handleTodoAction(todo);
    },
  });

  const detailHtml = selectedTodo ? renderTodoDetail(selectedTodo) : `
    <div class="text-center py-10 text-gray-400">
      <p class="text-sm">暂无待办</p>
      <p class="text-xs mt-1">所有任务已完成</p>
    </div>
  `;

  container.innerHTML = `
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div class="lg:col-span-2">
        <div class="card rounded-xl p-5"">
          <div class="flex items-center justify-between mb-4">
            <h4 class="font-title-cn text-sm font-bold text-gray-700">我的待办</h4>
          </div>
          ${todoListHtml}
        </div>
      </div>
      <div class="lg:col-span-1">
        <div class="card rounded-xl p-5 lg:sticky lg:top-20">
          <h4 class="font-title-cn text-sm font-bold text-gray-700 mb-4">待办详情</h4>
          ${detailHtml}
        </div>
      </div>
    </div>
  `;

  bindEvents(container);
  bindTodoDetailEvents();
}

function renderTodoDetail(todo) {
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
        ${todo.status !== 'completed' ? `
          <button class="secretary-todo-detail-complete text-xs px-3 py-1.5 rounded-lg text-white transition-colors hover:opacity-90" style="background:${accent};">标记完成</button>
          ${todo.actionType ? `<button class="secretary-todo-detail-action text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">处理</button>` : ''}
        ` : '<span class="text-xs text-green-600">已完成</span>'}
      </div>
    </div>
  `;
}

function handleTodoAction(todo) {
  // 根据 actionType 跳转到对应 tab（renderTabBar 统一按钮类名）
  const tabMap = {
    authorize: 'assign',
    write: 'calendar',
    review: 'feedback',
    notify: 'notification',
  };
  const targetTab = tabMap[todo.actionType];
  if (targetTab) {
    const btn = document.querySelector(`.secretary-tab-btn[data-secretary-tab="${targetTab}"]`);
    if (btn) btn.click();
    // t5c：切 tab 后自动展开目标面板（最小三成本——行动按钮一次直达可操作状态）
    if (targetTab === 'assign' && todo.actionType === 'authorize') {
      expandAssignPanelForTodo(todo);
    }
    showToast('info', `已跳转，请处理：${todo.title}`);
  } else {
    showToast('info', `请处理：${todo.title}`);
  }
}

/** t5c：赋权管理 tab 落地后，按待办 scope 自动展开对应赋权面板 */
function expandAssignPanelForTodo(todo) {
  const scope = todo.actionData?.scope;
  const sourceId = todo.actionData?.sourceId;
  if (scope === 'leader') {
    // 常设赋权（设党小组组长）：若面板未展开则自动展开
    const assignBtn = document.getElementById('ws-sec-assign-btn');
    if (assignBtn && assignBtn.textContent.includes('设党小组组长')) assignBtn.click();
  } else if (scope === 'activity' || scope === 'taskforce') {
    // 项目赋权：预选项目类型与项目并滚动到表单
    const typeSelect = document.getElementById('project-type-select');
    const idSelect = document.getElementById('project-id-select');
    if (typeSelect && idSelect) {
      typeSelect.value = scope;
      typeSelect.dispatchEvent(new Event('change'));
      const opt = [...idSelect.options].find(o => o.value === sourceId);
      if (opt) idSelect.value = sourceId;
      document.getElementById('project-auth-panel')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }
}

function bindTodoDetailEvents() {
  const container = document.getElementById('secretary-tab-content');
  if (!container) return;
  container.querySelector('.secretary-todo-detail-complete')?.addEventListener('click', () => {
    if (_selectedTodoId) {
      TodoStore.complete(_selectedTodoId);
      _selectedTodoId = null;
      showToast('success', '待办已完成');
      renderContent();
    }
  });
  container.querySelector('.secretary-todo-detail-action')?.addEventListener('click', () => {
    if (_selectedTodoId) {
      const todo = TodoStore.getById(_selectedTodoId);
      if (todo) handleTodoAction(todo);
    }
  });
}
