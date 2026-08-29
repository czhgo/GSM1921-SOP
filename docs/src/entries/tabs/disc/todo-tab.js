// role: [工程师]+[AI]
// 纪检委员工作台 Tab：待办（T-279 M3 拆分，照 M2 样板）
// 真实闭环：考勤/考察待确认数量由业务数据实时计算，确认后数量自动下降。

import { showToast } from '../../../core/utils.js?v=20260829q';
import { TodoStore, TodoSourceType, TodoCategory, TodoActionType, seedTodos } from '../../../services/todo.js?v=20260829q';
import { renderTodoList } from '../../../components/todo-list.js?v=20260829q';
import { solidAccentStyle } from '../../../core/constants.js?v=20260829q';
import { badgeHtml } from '../../../components/badge.js?v=20260829q';
import { loadActiveAttendanceRecords } from '../../../services/attendance.js?v=20260829q';
import { AttendanceStatus } from '../../../core/domain.js?v=20260829q';
import { loadActiveInspectionRecords } from '../../../services/inspection.js?v=20260829q';
import { getPersonName } from '../../../mock/index.js?v=20260829q';

// 私有状态（随模块自持，不污染入口）
let _selectedTodoId = null;
let _todoAggregates = null;

export function renderContent(ctx) {
  const container = document.getElementById('disc-tab-content');
  if (!container) return;

  // 补种子 + 清理废弃种子（T232 闭环化）
  seedTodos();
  TodoStore.refreshExpiredStatus();

  _todoAggregates = _buildDiscAggregates();
  const stats = _buildDiscStats(_todoAggregates);
  const selectedTodo = _selectedTodoId ? (
    _todoAggregates.find(g => g.groupKey === _selectedTodoId) || TodoStore.getById(_selectedTodoId)
  ) : null;

  const { html: todoListHtml, bindEvents } = renderTodoList({
    prefix: 'disc',
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
  });

  const detailHtml = selectedTodo ? _renderTodoDetail(selectedTodo, ctx) : `
    <div class="text-center py-12 text-gray-400">
      <p class="text-sm">点击左侧待办查看详情</p>
      <p class="text-xs mt-1">或直接点击"去审核/去确认"等按钮处理</p>
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

// ── 纪检聚合构建（2026-08-07 闭环化） ────────────────────────
// 真实闭环：考勤/考察待确认数量由业务数据实时计算，确认后数量自动下降，
// 不再依赖过期种子待办（种子来源与销项动作不匹配，无法闭环）。
function _buildDiscAggregates() {
  const todoGroups = TodoStore.getGroupedByAction('disc-commissioner');
  const dynamic = [];
  // 动态组1：考勤待确认（T-304 第5轮 · 源头审校+异常驱动：出勤/已补上传方已审校自动确认，
  // 纪检只处理异常=缺勤/请假未确认；仅活跃活动，归档活动退出工作区）
  const pendingAtt = loadActiveAttendanceRecords().filter(r => !r.recordedBy && r.status !== AttendanceStatus.PRESENT && r.status !== AttendanceStatus.MADE_UP);
  if (pendingAtt.length > 0) {
    dynamic.push({
      groupKey: 'disc-commissioner:attendance-confirm',
      actionKey: 'attendance-confirm',
      title: '考勤待确认',
      category: TodoCategory.REVIEW,
      actionType: TodoActionType.REVIEW,
      flow: '考勤上传 → 纪检确认 → 考勤总表',
      deadline: null,
      count: pendingAtt.length,
      items: pendingAtt.map(r => ({ id: r.id, title: `确认考勤：${getPersonName(r.personId)}`, sourceType: TodoSourceType.ACTIVITY, sourceId: r.activityId })),
    });
  }
  // 动态组2：考察待确认（status 非 confirmed；仅活跃活动，专班类保留）
  const pendingInsp = loadActiveInspectionRecords().filter(r => r.status !== 'confirmed');
  if (pendingInsp.length > 0) {
    dynamic.push({
      groupKey: 'disc-commissioner:inspection-confirm',
      actionKey: 'inspection-confirm',
      title: '考察待确认',
      category: TodoCategory.REVIEW,
      actionType: TodoActionType.REVIEW,
      flow: '纪检录入考察 → 纪检确认 → 组织建档',
      deadline: null,
      count: pendingInsp.length,
      items: pendingInsp.map(r => ({ id: r.id, title: `确认考察：${getPersonName(r.personId)}`, sourceType: TodoSourceType.ACTIVITY, sourceId: r.activityId ? `insp_${r.id}` : null })),
    });
  }
  // 合并：同 groupKey 时并集（TodoStore 派生组 + 动态组），取最早截止
  const map = new Map();
  for (const g of [...todoGroups, ...dynamic]) {
    if (!map.has(g.groupKey)) { map.set(g.groupKey, g); continue; }
    const cur = map.get(g.groupKey);
    cur.items = [...(cur.items || []), ...(g.items || [])];
    cur.count = cur.items.length;
    if (g.deadline && (!cur.deadline || g.deadline < cur.deadline)) cur.deadline = g.deadline;
  }
  return [...map.values()];
}

/** 纪检聚合统计（总数 = 聚合卡数量之和；过期 = 明细有截止且已过期的条目） */
function _buildDiscStats(aggregates) {
  const today = new Date().toISOString().slice(0, 10);
  const total = aggregates.reduce((s, g) => s + g.count, 0);
  let expired = 0;
  for (const g of aggregates) {
    for (const it of g.items || []) {
      if (it.deadline && it.deadline < today && it.status !== 'completed') expired++;
    }
  }
  return { _total: total, _expired: expired };
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
          <button class="disc-todo-detail-action text-xs px-3 py-1.5 rounded-lg text-white transition-colors hover:opacity-90" style="${solidAccentStyle(ctx.accent, ctx.accentBorder)}">去处理</button>
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
        ${todo.actionType ? `<button class="disc-todo-detail-action text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">处理</button>` : ''}
      </div>
    </div>
  `;
}

function _handleTodoAction(todo) {
  // 2026-08-07 闭环化：聚合对象优先按 actionKey 跳转（区分同 actionType 的业务域），普通明细按 actionType 兜底
  const jump = {
    'attendance-confirm': { tab: 'attendance', label: '考勤管理' },
    'inspection-confirm': { tab: 'inspection', label: '考察管理' },
    'review-submit':      { tab: 'review', label: '活动监督复盘' },
    'review-confirm':     { tab: 'review', label: '活动监督复盘' },
    'handoff-material-shortage': { tab: 'makeup', label: '补课制度' },
    review:   { tab: 'review', label: '活动监督复盘' },
    submit:   { tab: 'attendance', label: '考勤管理' },
    confirm:  { tab: 'inspection', label: '考察管理' },
  };
  const target = jump[todo.actionKey] || jump[todo.actionType];
  if (target) {
    const btn = document.querySelector(`.disc-tab-btn[data-disc-tab="${target.tab}"]`);
    if (btn) btn.click();
    showToast('info', `已跳转到${target.label}，请处理：${todo.title}`);
  } else {
    showToast('info', `请处理：${todo.title}`);
  }
}

// 绑定详情面板按钮事件（在 renderContent 之后由 render 回调触发）
function _bindTodoDetailEvents(container) {
  container.querySelector('.disc-todo-detail-action')?.addEventListener('click', () => {
    if (!_selectedTodoId) return;
    const group = _todoAggregates?.find(g => g.groupKey === _selectedTodoId);
    if (group) { _handleTodoAction(group); return; }
    const todo = TodoStore.getById(_selectedTodoId);
    if (todo) _handleTodoAction(todo);
  });
}
