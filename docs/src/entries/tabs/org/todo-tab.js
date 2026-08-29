// role: [工程师]+[AI]
// 组织委员工作台 Tab：待办（T-279 M3 拆分，照 M2 样板）
// 最小三成本原则落地：进入即见首条详情，减一次点击。

import { TodoStore } from '../../../services/todo.js?v=20260829j';
import { renderTodoList } from '../../../components/todo-list.js?v=20260829j';
import { badgeHtml } from '../../../components/badge.js?v=20260829j';
import { showToast } from '../../../core/utils.js?v=20260829j';
import { solidAccentStyle } from '../../../core/constants.js?v=20260829j';
import { renderHandoffInboxHtml, bindHandoffInbox } from '../../../components/handoff-inbox.js?v=20260829j';
import { HandoffStore } from '../../../services/handoff.js?v=20260829j';
import { openFormModal } from '../../../components/modal.js?v=20260829j';

// 私有状态（随模块自持，不污染入口）
let _selectedTodoId = null;
let _todoAggregates = null;

export function renderContent(ctx) {
  const container = document.getElementById('org-tab-content');
  if (!container) return;

  // 刷新过期状态
  TodoStore.refreshExpiredStatus();

  _todoAggregates = TodoStore.getGroupedByAction('org-commissioner');
  const stats = TodoStore.getStatsByRole('org-commissioner');
  // 自动选中首条（书记 2026-08-10 裁定推广）：进入待办即见第一条详情，减一次点击
  if (!_selectedTodoId && _todoAggregates.length > 0) {
    _selectedTodoId = _todoAggregates[0].groupKey;
  }
  const selectedTodo = _selectedTodoId ? (
    _todoAggregates.find(g => g.groupKey === _selectedTodoId) || TodoStore.getById(_selectedTodoId)
  ) : null;

  const { html: todoListHtml, bindEvents } = renderTodoList({
    prefix: 'org',
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
    ${renderHandoffInboxHtml({
      to: 'org-commissioner',
      accent: ctx.accent,
      title: '数据交接·考察建档',
      extraActionHtml: `<div class="mt-2 pt-2 border-t border-gray-100">
        <button id="org-shortage-btn" class="text-xs px-3 py-1.5 rounded-lg bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 transition-colors" style="cursor:pointer;">标记补课材料缺失（通知纪检）</button>
      </div>`,
    })}
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
  // T-304 C2 数据交接：组织确认考察建档（纪检提交 → 组织接收，后台自动派生待办）
  bindHandoffInbox(container, { to: 'org-commissioner', onDone: () => { showToast('success', '考察记录已接收建档'); renderContent(ctx); } });
  // T-304 C2 数据交接：组织标记补课材料缺失 → 纪检补课制度高亮（回执机制）
  container.querySelector('#org-shortage-btn')?.addEventListener('click', () => {
    openFormModal({
      id: 'shortage',
      title: '标记补课材料缺失',
      fields: [
        { key: 'source', label: '关联活动/专班', type: 'input', required: true, placeholder: '如：5月主题党日：五四精神传承' },
        { key: 'note', label: '缺失说明', type: 'textarea', required: true, placeholder: '如：张三缺勤补课材料（心得）未提交' },
      ],
      onSubmit: (values) => {
        HandoffStore.create({
          type: 'material-shortage',
          refType: 'activity',
          refLabel: values.source,
          refId: 'shortage_' + Date.now(),
          note: values.note,
        });
        showToast('success', '补课需求回执已发送至纪检委员');
        renderContent(ctx);
      },
      accentColor: ctx.accent || '#3B82F6',
    });
  });
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
          <button class="org-todo-detail-action text-xs px-3 py-1.5 rounded-lg text-white transition-colors hover:opacity-90" style="${solidAccentStyle(ctx.accent, ctx.accentBorder)};">去处理</button>
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
        ${todo.actionType ? `<button class="org-todo-detail-action text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">处理</button>` : ''}
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
  const tabMap = {
    authorize: 'taskforce',
    review: 'inspection',
    track: 'development',
  };
  const targetTab = tabMap[todo.actionType];
  if (targetTab) {
    const btn = document.querySelector(`.org-tab-btn[data-org-tab="${targetTab}"]`);
    if (btn) btn.click();
    // T-190 赋权待办兜底：直达专班详情成员角色编辑（≤2 跳）
    if (todo.actionType === 'authorize' && todo.sourceId) {
      const tfCard = document.querySelector(`.tf-store-card[data-tf-id="${todo.sourceId}"]`);
      if (tfCard) tfCard.click();
    }
    const tabLabels = { authorize: '专班管理', review: '考察上传', track: '发展数据' };
    showToast('info', `已跳转到${tabLabels[todo.actionType] || '对应功能'}，请处理：${todo.title}`);
  } else {
    showToast('info', `请处理：${todo.title}`);
  }
}

function _bindTodoDetailEvents(container, ctx) {
  container.querySelector('.org-todo-detail-action')?.addEventListener('click', () => {
    if (!_selectedTodoId) return;
    const group = _todoAggregates?.find(g => g.groupKey === _selectedTodoId);
    if (group) { _handleTodoAction(group, ctx); return; }
    const todo = TodoStore.getById(_selectedTodoId);
    if (todo) _handleTodoAction(todo, ctx);
  });
}
