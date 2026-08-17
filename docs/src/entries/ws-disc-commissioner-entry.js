import { setState, registerRenderCallback } from '../core/state.js?v=20260812a';
import { showToast } from '../core/utils.js?v=20260812a';
import { CrossPageState } from '../core/cross-page-state.js?v=20260812a';
import { bootstrapPage } from '../core/bootstrap.js?v=20260812f';
import { mockDB, AttendanceStatus, ATTENDANCE_STATUS_LABELS, ReviewStatus, SourceType, OutputType, deriveOutputRoute } from '../core/domain.js?v=20260812a';
import { solidAccentStyle } from '../core/constants.js?v=20260812a';
import { persist } from '../core/data-adapter.js?v=20260812a';
import { attendanceToLong, attendanceToWide, inspectionToLong, inspectionToWide, reviewToDisplay, getPersonName } from '../mock/index.js?v=20260812a';
import { loadWorkspaceData } from '../core/data-loader.js?v=20260812a';
import { renderTabBar } from '../components/tab-bar.js?v=20260812a';
import { renderReportEntryHtml, bindReportEntry } from '../components/report-entry.js?v=20260812a';
import { renderWorkOverview } from '../components/work-overview.js?v=20260812a';
import { AuthStore } from '../services/auth.js?v=20260812a';
import { openFormModal } from '../components/modal.js?v=20260812a';
import { autoGenerateMakeupTask, loadMakeupTasks, saveMakeupTasks } from '../services/makeup.js?v=20260812a';
import { loadAttendanceRecords, loadActiveAttendanceRecords, saveAttendanceRecords } from '../services/attendance.js?v=20260812a';
import { loadInspectionRecords, loadActiveInspectionRecords, getOverdueRecords, confirmInspectionRecord, deleteInspectionRecord, getRecordsBySource } from '../services/inspection.js?v=20260812a';
import { TaskForceRecordStore } from '../services/taskforce.js?v=20260812a';
import { loadActivities } from '../services/activity.js?v=20260812a';
import { loadActivityReviews, loadActiveActivityReviews, loadTaskforceReviews, updateReviewById } from '../services/review.js?v=20260812a';
import { renderMyDispatchTab, bindMyDispatchEvents } from '../services/issues.js?v=20260812a';
import { renderTodoList } from '../components/todo-list.js?v=20260812a';
import { TodoStore, TodoSourceType, TodoCategory, TodoActionType, seedTodos } from '../services/todo.js?v=20260812a';
import { enhanceSelects } from '../components/custom-select.js?v=20260812a';
import { badgeHtml } from '../components/badge.js?v=20260812a';

const { accent, accentRgba, accentBorder } = await bootstrapPage({ module: 'workspace', accentRole: 'disc-commissioner' });

const DISC_COMMISSIONER_ID = 'p10'; // 纪检委员 personId
let _discNavTarget = null; // { tfId, actId } URL 导航目标（跨重渲染保持，定位完成后清除）
// "有待办必见待办"一次性消费标志（书记 2026-08-10 裁定）
let _todoPriorityConsumed = false;

// ── 公邮管理 seed 数据（2026-08-05：seed 常量 + mockDB 持久化，刷新不再丢失）──
const MAILBOX_CONFIG_SEED = {
  email: 'gsm1921_branch@edu.cn',
  checkCycleDays: 3,
  lastCheckAt: '2026-07-27T10:00:00Z',
};

const MAILBOX_HISTORY_SEED = [
  { id: 'mh1', checkedAt: '2026-07-27T10:00:00Z', checkedBy: 'p10', summary: '收到学院通知1封，已转发至支委群', hasAction: false },
  { id: 'mh2', checkedAt: '2026-07-24T09:30:00Z', checkedBy: 'p10', summary: '收到组织关系转接确认函，已归档', hasAction: true },
  { id: 'mh3', checkedAt: '2026-07-21T11:00:00Z', checkedBy: 'p10', summary: '无新邮件', hasAction: false },
  { id: 'mh4', checkedAt: '2026-07-18T10:15:00Z', checkedBy: 'p10', summary: '收到主题党日通知，已安排宣传委员跟进', hasAction: true },
  { id: 'mh5', checkedAt: '2026-07-15T09:45:00Z', checkedBy: 'p10', summary: '收到党委文件1份，已存档', hasAction: true },
];

// 从 mockDB 读取（seed 兜底注入一次）；写操作须更新 mockDB.mailboxConfig/mailboxHistory 后调用 persist()
function _loadMailboxConfig() {
  if (!mockDB.mailboxConfig) {
    mockDB.mailboxConfig = { ...MAILBOX_CONFIG_SEED };
  }
  return mockDB.mailboxConfig;
}

function _loadMailboxHistory() {
  if (mockDB.mailboxHistory.length === 0 && MAILBOX_HISTORY_SEED.length > 0) {
    mockDB.mailboxHistory = MAILBOX_HISTORY_SEED.map(h => ({ ...h }));
  }
  return mockDB.mailboxHistory;
}

// ── 经验沉淀数据层（mockDB） ────────────────────────────

function _loadDeposits() {
  return mockDB.experienceDeposits.length > 0 ? [...mockDB.experienceDeposits] : [];
}

function _saveDeposits(deposits) {
  mockDB.experienceDeposits = [...deposits];
  persist();
}

function renderDiscUI(state) {
  let activities = state.activities || [];
  const allActivities = loadActivities();
  if (activities.length === 0 && allActivities.length > 0) {
    activities = allActivities.map(a => ({ ...a, visibility: 'branch', executor: a.organizer || 'u_exec', supervisor: null, createdBy: a.organizer || 'u_exec', createdAt: a.date || new Date().toISOString() }));
    setState({ activities });
    return;
  }

  const container = document.getElementById('disc-content');
  if (!container) return;

  // 有待办必见待办（书记 2026-08-10 裁定）：仅首次渲染生效
  let priorityTab;
  if (!_todoPriorityConsumed) {
    _todoPriorityConsumed = true;
    priorityTab = TodoStore.getGroupedByAction('disc-commissioner').length > 0 ? 'todo' : undefined;
  }

  const tabBar = renderTabBar({
    prefix: 'disc',
    tabs: [
      { id: 'todo', label: '待办', render: () => _renderTodoContent(), groupLabel: '工作台' },
      // 工作概况（书记 2026-08-10 裁定：全部角色新增——汇报/卡点/在办三区总览 + 条线数据注入）
      { id: 'overview', label: '工作概况', render: () => { const el = document.getElementById('disc-tab-content'); if (el) return renderWorkOverview(el, { role: 'disc-commissioner', personId: AuthStore.getCurrentUser()?.personId || DISC_COMMISSIONER_ID, accent, prefix: 'disc' }); }, groupLabel: '工作台' },
      { id: 'attendance', label: '考勤管理', render: () => _renderAttendanceContent(null), groupLabel: '党建' },
      { id: 'review', label: '活动监督复盘', render: () => _renderReviewContent(), groupLabel: '党建' },
      { id: 'inspection', label: '考察管理', render: () => _renderInspectionContent(), groupLabel: '党建' },
      { id: 'makeup', label: '补课制度', render: () => _renderMakeupContent(), groupLabel: '党建' },
      { id: 'mailbox', label: '公邮管理', render: () => _renderMailboxContent(), groupLabel: '党建' },
      // 专班查看（知情权：无职责≠无知情权，书记 2026-08-08 裁定新增）
      { id: 'tf-view', label: '专班查看', render: () => { const el = document.getElementById('disc-tab-content'); if (el) return import('../components/taskforce-view.js?v=20260812a').then(m => m.renderTaskforceView(el, { highlightId: _discNavTarget?.tfId || null, onLocated: () => { _discNavTarget = null; } })); }, groupLabel: '党建' },
      { id: 'my-dispatch', label: '我的处置', render: () => { const el = document.getElementById('disc-tab-content'); if (el) { el.innerHTML = renderMyDispatchTab('disc-commissioner', 'u_disc'); bindMyDispatchEvents(el, 'disc-commissioner', 'u_disc'); } }, groupLabel: '反馈' },
    ],
    accentColor: { accent, accentRgba, accentBorder },
    defaultTab: 'todo',
    renderCtx: {},
    storageKey: 'workflowos_tab_disc',
    priorityTab,
    extraRightHtml: renderReportEntryHtml({ accent, accentRgba }),
  });

  container.innerHTML = `
    ${tabBar.html}
  `;

  tabBar.bindEvents(container);
  bindReportEntry(container); // 一键汇报入口（书记 2026-08-10 裁定：复用 Issue 体系）

  // ── 首页跳转落点（书记 2026-08-08 裁定：activityId / view=activities / taskforceId 必须消费）──
  // 目标保持到定位完成（loadWorkspaceData 双 setState 会重渲染），提取后立即清除 URL 参数。
  if (!_discNavTarget) {
    const urlParams = CrossPageState.getURLParams();
    const tfId = urlParams.taskforceId;
    const actId = urlParams.activityId;
    if (tfId || actId || urlParams.view === 'activities') {
      _discNavTarget = { tfId, actId };
      CrossPageState.clearParam('activityId');
      CrossPageState.clearParam('taskforceId');
      CrossPageState.clearParam('view');
    }
  }
  if (_discNavTarget) {
    if (_discNavTarget.tfId) {
      // 专班查看（纪检无专班职责≠无知情权）
      tabBar.activate('tf-view');
    } else {
      // 活动：落考勤管理（纪检活动相关承载，现状即权限；activityId 直达该活动考勤）
      tabBar.activate('attendance');
      _renderAttendanceContent(_discNavTarget.actId || null);
      _discNavTarget = null; // 考勤落点由 _renderAttendanceContent 消费完成
    }
  } else {
    tabBar.activate(tabBar.activeTab);
  }
}

// ── 待办列表+详情面板（最小三成本原则落地） ───────────────────
let _selectedTodoId = null;
let _todoAggregates = null;

function _renderTodoContent() {
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
    accent,
    onSelectTodo: (todo) => {
      _selectedTodoId = todo.groupKey || todo.id;
      _renderTodoContent();
    },
    onActionTodo: (todo) => {
      _handleTodoAction(todo);
    },
  });

  const detailHtml = selectedTodo ? _renderTodoDetail(selectedTodo) : `
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
  _bindTodoDetailEvents();
}

// ── 纪检聚合构建（2026-08-07 闭环化） ────────────────────────
// 真实闭环：考勤/考察待确认数量由业务数据实时计算，确认后数量自动下降，
// 不再依赖过期种子待办（种子来源与销项动作不匹配，无法闭环）。
function _buildDiscAggregates() {
  const todoGroups = TodoStore.getGroupedByAction('disc-commissioner');
  const dynamic = [];
  // 动态组1：考勤待确认（recordedBy 为空 = 纪检未确认；仅活跃活动，归档活动退出工作区）
  const pendingAtt = loadActiveAttendanceRecords().filter(r => !r.recordedBy);
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
          <button class="disc-todo-detail-action text-xs px-3 py-1.5 rounded-lg text-white transition-colors hover:opacity-90" style="${solidAccentStyle(accent, accentBorder)}">去处理</button>
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

function _bindTodoDetailEvents() {
  const container = document.getElementById('disc-tab-content');
  if (!container) return;
  container.querySelector('.disc-todo-detail-action')?.addEventListener('click', () => {
    if (!_selectedTodoId) return;
    const group = _todoAggregates?.find(g => g.groupKey === _selectedTodoId);
    if (group) { _handleTodoAction(group); return; }
    const todo = TodoStore.getById(_selectedTodoId);
    if (todo) _handleTodoAction(todo);
  });
}

// ── 待处理面板（决策仪表盘·异常驱动，替代数字概况） ──
function _buildDiscDecisionPanelHTML(filterActivityId) {
  const allRecords = loadActiveAttendanceRecords();
  const actById = new Map(loadActivities().map(a => [a.id, a]));
  const now = new Date();

  // 待确认事项：请假 + 异常缺勤（确认窗口仅保留给这两类）
  const pendingItems = allRecords.filter(r => {
    if (r.recordedBy) return false;
    if (filterActivityId && r.activityId !== filterActivityId) return false;
    return r.status === AttendanceStatus.LEAVE || r.status === AttendanceStatus.ABSENT;
  });

  // 超期未确认：活动日期已过且仍未确认
  const overdueItems = allRecords.filter(r => {
    if (r.recordedBy) return false;
    const act = actById.get(r.activityId);
    if (!act || !act.date) return false;
    if (filterActivityId && r.activityId !== filterActivityId) return false;
    return new Date(act.date) < now;
  });

  // 合并去重（超期未确认的请假/缺勤不重复列出）
  const seen = new Set();
  const items = [];
  [...pendingItems, ...overdueItems].forEach(r => {
    if (seen.has(r.id)) return;
    seen.add(r.id);
    items.push(r);
  });

  const leaveCount = pendingItems.filter(r => r.status === AttendanceStatus.LEAVE).length;
  const absentCount = pendingItems.filter(r => r.status === AttendanceStatus.ABSENT).length;
  const overdueCount = overdueItems.length;

  const listHtml = items.length === 0
    ? `
      <div class="flex items-center gap-2 text-xs text-gray-400 py-2">
        <span class="w-2 h-2 rounded-full bg-green-500"></span>
        无待处理事项${filterActivityId ? '（当前筛选活动）' : ''}
      </div>`
    : `
      <div class="space-y-1.5">${items.map(r => {
        const act = actById.get(r.activityId);
        const isOverdue = overdueItems.some(o => o.id === r.id);
        const statusBadge = r.status === AttendanceStatus.ABSENT
          ? badgeHtml('缺勤', 'danger')
          : badgeHtml('请假', 'warning');
        return `
          <div class="flex items-center gap-3 py-1.5 px-2 rounded-lg ${isOverdue ? 'bg-red-50/40' : 'bg-orange-50/20'}">
            <div class="flex-1 min-w-0">
              <p class="text-sm text-gray-800 truncate">${getPersonName(r.personId)}</p>
              <p class="text-xs text-gray-400 truncate">${act ? act.title : ''}${act && act.date ? ' · ' + act.date : ''}</p>
            </div>
            ${statusBadge}
            ${isOverdue ? badgeHtml('超期', 'danger') : ''}
            <button class="btn-action btn-action-orange btn-disc-confirm-dash text-xs" data-record-id="${r.id}">确认</button>
          </div>
        `;
      }).join('')}</div>`;

  return `
    <div class="card rounded-xl p-4 mb-4">
      <div class="flex items-center justify-between mb-3">
        <h3 class="font-title-cn text-base font-semibold text-gray-800">待处理</h3>
        <div class="flex gap-3 text-xs">
          <div class="flex items-center gap-1.5"><span class="w-2 h-2 rounded-full bg-orange-500"></span><span class="text-gray-600">待确认请假</span><span class="font-bold text-orange-700">${leaveCount}</span></div>
          <div class="flex items-center gap-1.5"><span class="w-2 h-2 rounded-full bg-red-500"></span><span class="text-gray-600">待确认缺勤</span><span class="font-bold text-red-700">${absentCount}</span></div>
          <div class="flex items-center gap-1.5"><span class="w-2 h-2 rounded-full bg-amber-500"></span><span class="text-gray-600">超期未确认</span><span class="font-bold text-amber-700">${overdueCount}</span></div>
        </div>
      </div>
      ${listHtml}
    </div>
  `;
}

function _renderAttendanceContent(filterActivityId) {
  const container = document.getElementById('disc-tab-content');
  if (!container) return;

  const allRecords = loadActiveAttendanceRecords();
  const longData = attendanceToLong(allRecords);
  const wideData = attendanceToWide(allRecords);

  // T223 修复：attendanceToLong 长表行不含 activityId，须先按原始记录过滤再转换，
  // 否则活动筛选匹配 0 条、待确认计数恒为 0、一键确认按钮永不出现。
  const filtered = filterActivityId
    ? attendanceToLong(allRecords.filter(r => r.activityId === filterActivityId))
    : longData;
  const filteredWide = filterActivityId
    ? attendanceToWide(allRecords.filter(r => r.activityId === filterActivityId))
    : wideData;

  const filterBanner = filterActivityId
    ? `<div class="mb-3 p-2.5 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-between">
        <span class="text-xs text-blue-700">已筛选：仅显示该活动的考勤记录</span>
        <button class="text-xs text-blue-600 hover:text-blue-800 disc-clear-filter" style="cursor:pointer;">清除筛选</button>
      </div>`
    : '';

  // T223 考勤交互升级：活动选择器（仅列有考勤记录的活动，按 date 降序），先选活动再查看
  const actOptions = (() => {
    const acts = loadActivities();
    const withAttendance = new Set(allRecords.map(r => r.activityId));
    return acts
      .filter(a => withAttendance.has(a.id))
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
      .map(a => `<option value="${a.id}" ${filterActivityId === a.id ? 'selected' : ''}>${a.title}（${a.date}）</option>`)
      .join('');
  })();
  const pendingCount = filtered.filter(r => r.confirmer === '—').length;
  const confirmedCount = filtered.length - pendingCount;
  const bulkConfirmBtn = filterActivityId && pendingCount > 0
    ? `<div class="mb-3">
        <button id="att-bulk-confirm-btn" class="text-xs px-3 py-1.5 rounded-lg text-white transition-colors hover:opacity-90" style="${solidAccentStyle(accent, accentBorder)};cursor:pointer;">
          一键确认本活动全部待确认（${pendingCount} 条）
        </button>
      </div>`
    : '';

  container.innerHTML = `
    ${filterBanner}
    ${_buildDiscDecisionPanelHTML(filterActivityId)}
    <div class="card rounded-xl p-5">
      <div class="flex items-center justify-between mb-4">
        <h3 class="font-title-cn text-base font-semibold text-gray-800">考勤总表</h3>
        <div class="flex items-center gap-3 text-xs">
          <div class="flex items-center gap-1.5"><span class="w-2 h-2 rounded-full bg-orange-500"></span><span class="text-gray-600">待确认</span><span class="font-bold text-orange-700">${pendingCount}</span></div>
          <div class="flex items-center gap-1.5"><span class="w-2 h-2 rounded-full bg-green-500"></span><span class="text-gray-600">已确认</span><span class="font-bold text-green-700">${confirmedCount}</span></div>
        </div>
        <div class="flex gap-2">
          <button class="att-view-btn btn-tab active" data-view="long">活动视图</button>
          <button class="att-view-btn btn-tab" data-view="wide">人视图</button>
        </div>
      </div>
      <div class="text-xs text-gray-500 mb-3">纪检委员维护考勤系统，组织委员的活动出勤数据直接使用本系统</div>
      ${bulkConfirmBtn}
      <div class="flex flex-wrap gap-2 mb-3">
        <select id="att-activity-select" class="input-flat text-xs min-w-[180px]">
          <option value="">全部活动</option>
          ${actOptions}
        </select>
        <input type="text" id="att-search-input" class="input-flat text-xs flex-1 min-w-[140px]" placeholder="搜索姓名或活动名称...">
        <select id="att-status-filter" class="input-flat text-xs w-24">
          <option value="">全部状态</option>
          <option value="${AttendanceStatus.PRESENT}">出勤</option>
          <option value="${AttendanceStatus.ABSENT}">缺勤</option>
          <option value="${AttendanceStatus.LEAVE}">请假</option>
          <option value="${AttendanceStatus.MADE_UP}">已补</option>
        </select>
        <select id="att-confirm-filter" class="input-flat text-xs w-28">
          <option value="">全部确认状态</option>
          <option value="pending">待确认</option>
          <option value="confirmed">已确认</option>
        </select>
      </div>
      <div id="att-table-container"></div>
    </div>
  `;

  container.querySelector('.disc-clear-filter')?.addEventListener('click', () => {
    _renderAttendanceContent(null);
  });

  function applySearchFilter(data) {
    const searchEl = document.getElementById('att-search-input');
    const statusEl = document.getElementById('att-status-filter');
    const confirmEl = document.getElementById('att-confirm-filter');
    if (!searchEl || !statusEl) return data;
    const q = searchEl.value.trim().toLowerCase();
    const s = statusEl.value;
    const c = confirmEl ? confirmEl.value : '';
    return data.filter(r => {
      if (q && !(r.name || '').toLowerCase().includes(q) && !(r.activity || '').toLowerCase().includes(q)) return false;
      if (s && r.status !== s && ATTENDANCE_STATUS_LABELS[r.status] !== s) return false;
      if (c === 'pending' && r.confirmer !== '—') return false;
      if (c === 'confirmed' && r.confirmer === '—') return false;
      return true;
    });
  }

  const searchInput = document.getElementById('att-search-input');
  const statusSelect = document.getElementById('att-status-filter');
  const confirmSelect = document.getElementById('att-confirm-filter');
  if (searchInput) searchInput.addEventListener('input', () => { renderLong(); });
  if (statusSelect) statusSelect.addEventListener('change', () => { renderLong(); });
  if (confirmSelect) confirmSelect.addEventListener('change', () => { renderLong(); });

  function renderLong() {
    const tc = document.getElementById('att-table-container');
    if (!tc) return;
    const displayData = applySearchFilter(filtered);

    // A-10 修复：考勤记录按月分组展示（按活动日期归属月份）
    const recById = new Map(allRecords.map(r => [r.id, r]));
    const actById = new Map(loadActivities().map(a => [a.id, a]));
    const groups = new Map();
    displayData.forEach(a => {
      const actId = recById.get(a.id)?.activityId;
      const date = actId ? actById.get(actId)?.date : null;
      const monthKey = date ? date.slice(0, 7) : '未排期';
      if (!groups.has(monthKey)) groups.set(monthKey, []);
      groups.get(monthKey).push(a);
    });
    // 月份降序（最新在前），未排期放最后
    const monthKeys = [...groups.keys()].sort((x, y) => {
      if (x === '未排期') return 1;
      if (y === '未排期') return -1;
      return y.localeCompare(x);
    });

    // T223：选中具体活动后隐藏「活动」列（清爽）；「全部活动」视图保留活动列
    const showActCol = !filterActivityId;
    const tableHeader = `
      <thead><tr class="border-b border-gray-200">
        <th class="sticky top-0 z-10 bg-white py-2 px-3 text-left text-gray-500 font-medium">姓名</th>
        ${showActCol ? '<th class="sticky top-0 z-10 bg-white py-2 px-3 text-left text-gray-500 font-medium">活动</th>' : ''}
        <th class="sticky top-0 z-10 bg-white py-2 px-3 text-left text-gray-500 font-medium">状态</th>
        <th class="sticky top-0 z-10 bg-white py-2 px-3 text-left text-gray-500 font-medium">确认人</th>
        <th class="sticky top-0 z-10 bg-white py-2 px-3 text-left text-gray-500 font-medium">操作</th>
      </tr></thead>`;

    tc.innerHTML = monthKeys.map(monthKey => {
      const rows = groups.get(monthKey);
      const monthLabel = monthKey === '未排期' ? '未排期活动' : `${monthKey.slice(0, 4)}年${Number(monthKey.slice(5, 7))}月`;
      return `
        <div class="mb-4 last:mb-0">
          <div class="flex items-center gap-2 mb-1.5">
            <h4 class="font-title-cn text-sm font-bold text-gray-700">${monthLabel}</h4>
            ${badgeHtml(`${rows.length} 条`, 'neutral')}
          </div>
          <div class="overflow-x-auto max-h-96 overflow-y-auto">
            <table class="w-full text-xs">
              ${tableHeader}
              <tbody>${rows.map(a => {
                const isPending = a.confirmer === '—';
                return `
                <tr class="border-b border-gray-50 hover:bg-gray-50 ${isPending ? 'bg-orange-50/30' : ''}">
                  <td class="py-2 px-3 font-medium text-gray-800">${a.name}</td>
                  ${showActCol ? `<td class="py-2 px-3 text-gray-600">${a.activity}</td>` : ''}
                  <td class="py-2 px-3"><span class="px-1.5 py-0.5 rounded-full text-xs ${a.status === AttendanceStatus.PRESENT ? 'bg-green-100 text-green-700' : a.status === AttendanceStatus.ABSENT ? 'bg-red-100 text-red-700' : a.status === AttendanceStatus.MADE_UP ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'}">${a.status}</span></td>
                  <td class="py-2 px-3 text-gray-500">${isPending ? '<span class="text-orange-600">待确认</span>' : `<span class="text-green-600">${a.confirmer}</span>`}</td>
                  <td class="py-2 px-3">${isPending ? `<button class="btn-action btn-action-orange btn-disc-confirm-att" data-record-id="${a.id}">确认</button>` : '<span class="text-xs text-green-600">已确认</span>'}</td>
                </tr>
              `}).join('')}</tbody>
            </table>
          </div>
        </div>`;
    }).join('');

    // 绑定确认按钮事件
    tc.querySelectorAll('.btn-disc-confirm-att').forEach(btn => {
      btn.addEventListener('click', () => {
        const recordId = btn.dataset.recordId;
        const records = loadAttendanceRecords();
        const record = records.find(r => r.id === recordId);
        if (record) {
          record.recordedBy = DISC_COMMISSIONER_ID;
          saveAttendanceRecords(records);
          // 做事即销待办：确认考勤 → 销书记「考勤待确认」/纪检提醒
          TodoStore.completeBySource(TodoSourceType.ACTIVITY, record.activityId);
          TodoStore.completeBySource(TodoSourceType.ACTIVITY, `review_${record.activityId}`);
          // 考勤确认后自动生成补课任务
          autoGenerateMakeupTask(record);
          showToast('success', `考勤记录已确认（确认人：${getPersonName(DISC_COMMISSIONER_ID)}）`);
          _renderAttendanceContent(filterActivityId);
        }
      });
    });
  }

  function renderWide() {
    const tc = document.getElementById('att-table-container');
    if (!tc) return;
    const searchEl = document.getElementById('att-search-input');
    const q = searchEl ? searchEl.value.trim().toLowerCase() : '';
    const rows = q
      ? filteredWide.rows.filter(r => (r.name || '').toLowerCase().includes(q))
      : filteredWide.rows;
    tc.innerHTML = `
      <div class="overflow-x-auto">
        <table class="w-full text-xs">
          <thead><tr class="border-b border-gray-200">
            <th class="py-2 px-3 text-left text-gray-500 font-medium sticky left-0 bg-white">姓名</th>
            ${filteredWide.columns.map(c => `<th class="py-2 px-3 text-center text-gray-500 font-medium"><div class="text-xs">${c.title}</div></th>`).join('')}
          </tr></thead>
          <tbody>${rows.map(row => `
            <tr class="border-b border-gray-50 hover:bg-gray-50">
              <td class="py-2 px-3 font-medium text-gray-800 sticky left-0 bg-white">${row.name}</td>
              ${filteredWide.columns.map(c => {
                const val = row.cells[c.key] || '—';
                return `<td class="py-2 px-3 text-center text-xs text-gray-600">${val}</td>`;
              }).join('')}
            </tr>
          `).join('')}</tbody>
        </table>
      </div>
    `;
  }

  container.querySelectorAll('.att-view-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.att-view-btn').forEach(b => {
        b.style.background = 'var(--surface-card)'; b.style.color = 'var(--neutral-500)'; b.style.border = '1px solid var(--neutral-200)';
      });
      btn.style.background = accentRgba; btn.style.color = accent; btn.style.border = `1px solid ${accentBorder}`;
      if (btn.dataset.view === 'long') renderLong(); else renderWide();
    });
  });

  // T223：活动选择器切换 → 重新渲染对应活动考勤（filterActivityId 驱动过滤与活动列显隐）
  const actSelect = document.getElementById('att-activity-select');
  if (actSelect) {
    actSelect.addEventListener('change', () => {
      const v = actSelect.value;
      _renderAttendanceContent(v || null);
    });
  }

  // T223：一键确认本活动全部待确认（统一写 recordedBy + 逐条自动生成补课任务）
  container.querySelector('#att-bulk-confirm-btn')?.addEventListener('click', () => {
    if (!filterActivityId) return;
    const records = loadAttendanceRecords();
    const targets = records.filter(r => r.activityId === filterActivityId && !r.recordedBy);
    if (targets.length === 0) {
      showToast('info', '该活动没有待确认的考勤记录');
      return;
    }
    targets.forEach(r => {
      r.recordedBy = DISC_COMMISSIONER_ID;
      autoGenerateMakeupTask(r);
      // 做事即销待办：确认考勤 → 销书记「考勤待确认」/纪检提醒
      TodoStore.completeBySource(TodoSourceType.ACTIVITY, r.activityId);
      TodoStore.completeBySource(TodoSourceType.ACTIVITY, `review_${r.activityId}`);
    });
    saveAttendanceRecords(records);
    showToast('success', `已一键确认 ${targets.length} 条考勤记录（确认人：${getPersonName(DISC_COMMISSIONER_ID)}）`);
    _renderAttendanceContent(filterActivityId);
  });

  renderLong();
  enhanceSelects(container);

  // 待处理面板（决策仪表盘）确认按钮：请假/缺勤/超期未确认 直达确认
  container.querySelectorAll('.btn-disc-confirm-dash').forEach(btn => {
    btn.addEventListener('click', () => {
      const recordId = btn.dataset.recordId;
      const records = loadAttendanceRecords();
      const record = records.find(r => r.id === recordId);
      if (record) {
        record.recordedBy = DISC_COMMISSIONER_ID;
        saveAttendanceRecords(records);
        // 做事即销待办：确认考勤 → 销书记「考勤待确认」/纪检提醒
        TodoStore.completeBySource(TodoSourceType.ACTIVITY, record.activityId);
        TodoStore.completeBySource(TodoSourceType.ACTIVITY, `review_${record.activityId}`);
        autoGenerateMakeupTask(record);
        showToast('success', `考勤记录已确认（确认人：${getPersonName(DISC_COMMISSIONER_ID)}）`);
        _renderAttendanceContent(filterActivityId);
      }
    });
  });
}

// ── 专班名单区（组织→纪检 自动同步，纪检只读同源 + 考察确认进度） ──
function _buildTaskforceRosterHTML() {
  const tfs = TaskForceRecordStore.getAll().filter(t => t.status === 'recruiting' || t.status === 'active');
  if (tfs.length === 0) return '';
  const allRecords = loadActiveInspectionRecords();
  const statusMeta = {
    recruiting: { label: '招募中', cls: 'bg-blue-100 text-blue-700' },
    active: { label: '进行中', cls: 'bg-green-100 text-green-700' },
  };
  const rows = tfs.map(tf => {
    const meta = statusMeta[tf.status] || statusMeta.active;
    const tfRecords = allRecords.filter(r => r.sourceType === SourceType.TASKFORCE && r.sourceName === tf.name);
    const total = tfRecords.length;
    const confirmed = tfRecords.filter(r => r.status === 'confirmed').length;
    const pending = total - confirmed;
    const memberNames = (tf.members || []).map(m => getPersonName(m.personId) || m.name || m.personId).filter(Boolean).join('、') || '—';
    const progressCls = pending > 0 ? 'text-orange-700' : 'text-green-700';
    // T-224 §8 产出物查看区（纪检项目看板卡片展开面板，同源读取）
    const inspRoute = deriveOutputRoute(OutputType.TASKFORCE_INSPECTION);
    const workloadRoute = deriveOutputRoute(OutputType.WORKLOAD);
    const workloadItems = (tf.members || []).flatMap(m =>
      (m.contributions || []).map(c => ({
        name: getPersonName(m.personId) || m.name || '成员',
        item: typeof c === 'string' ? c : (c.description || c.title || ''),
      }))
    );
    return `
      <div class="rounded-lg border border-gray-100 p-3">
        <div class="flex items-center justify-between mb-1">
          <span class="text-sm font-bold text-gray-800">${tf.name}</span>
          <span class="text-xs px-1.5 py-0.5 rounded-full ${meta.cls}">${meta.label}</span>
        </div>
        <p class="text-xs text-gray-500 mb-1">${tf.task || ''}</p>
        <div class="flex items-center justify-between text-xs">
          <span class="text-gray-600 truncate mr-2">成员：${memberNames}</span>
          <span class="${progressCls} font-medium whitespace-nowrap">考察确认 ${confirmed}/${total}${pending > 0 ? `（待确认 ${pending}）` : ''}</span>
        </div>
        <div class="mt-2 pt-2 border-t border-gray-100">
          <button class="text-xs text-gray-500 hover:text-gray-800 flex items-center gap-1" onclick="this.nextElementSibling.classList.toggle('hidden')">
            产出物 <span>▾</span>
          </button>
          <div class="hidden mt-2 space-y-1.5">
            <div class="flex items-center justify-between text-[11px] text-gray-500">
              <span class="flex items-center gap-1.5"><span class="w-1.5 h-1.5 rounded-full flex-shrink-0" style="background:${inspRoute.color};"></span>考察记录</span>
              <span>${total === 0 ? '未提交' : pending > 0 ? `待确认 ${pending}/${total}` : `已确认 ${total}`}</span>
            </div>
            <div class="flex items-center justify-between text-[11px] text-gray-500">
              <span class="flex items-center gap-1.5"><span class="w-1.5 h-1.5 rounded-full flex-shrink-0" style="background:${workloadRoute.color};"></span>工作量报告</span>
              <span>${workloadItems.length > 0 ? `${workloadItems.length} 项产出` : '未生成'}</span>
            </div>
            ${workloadItems.length > 0 ? `
              <ul class="space-y-0.5 pl-3">
                ${workloadItems.slice(0, 5).map(w => `<li class="text-[11px] text-gray-500 truncate">${w.name}：${w.item}</li>`).join('')}
                ${workloadItems.length > 5 ? `<li class="text-[11px] text-gray-400">…另有 ${workloadItems.length - 5} 项</li>` : ''}
              </ul>` : ''}
          </div>
        </div>
      </div>
    `;
  }).join('');

  return `
    <div class="card rounded-xl p-4 mb-4">
      <div class="flex items-center justify-between mb-3">
        <h3 class="font-title-cn text-base font-semibold text-gray-800">专班名单</h3>
        <span class="text-xs text-gray-500">名单由组织委员管理，纪检只读同步（前置）</span>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-3">${rows}</div>
    </div>
  `;
}

function _renderInspectionContent() {
  const container = document.getElementById('disc-tab-content');
  if (!container) return;

  const allRecords = loadActiveInspectionRecords();
  const longData = inspectionToLong(allRecords);
  const wideData = inspectionToWide(allRecords);
  const overdueRecords = getOverdueRecords(7);
  const tagColor = { 'activity': 'bg-blue-50 text-blue-600', 'taskforce': 'bg-green-50 text-green-600' };
  const statusColor = { 'confirmed': 'bg-green-100 text-green-700', 'pending': 'bg-orange-100 text-orange-700', 'overdue': 'bg-red-100 text-red-700' };

  // 超期提醒
  const overdueHtml = overdueRecords.length > 0 ? `
    <div class="bg-red-50 border border-red-200 rounded-xl p-3 mb-3">
      <div class="flex items-center gap-2 mb-1">
        <span class="text-xs font-bold text-red-700">超期提醒</span>
        ${badgeHtml(`${overdueRecords.length}条`, 'danger')}
      </div>
      <div class="text-xs text-red-600">以下考察记录已超过7天未确认，请尽快处理</div>
    </div>
  ` : '';

  container.innerHTML = `
    ${_buildTaskforceRosterHTML()}
    <div class="card rounded-xl p-5">
      <div class="flex items-center justify-between mb-4">
        <h3 class="font-title-cn text-base font-semibold text-gray-800">考察总表</h3>
        <div class="flex gap-2">
          <button class="insp-view-btn btn-tab active" data-view="long">活动视图</button>
          <button class="insp-view-btn btn-tab" data-view="wide">人视图</button>
        </div>
      </div>
      <div class="text-xs text-gray-500 mb-3">纪检委员管理考察记录，党小组组长/组织委员上传 → 纪检确认 → 录入考察总表</div>
      ${overdueHtml}
      <div class="flex flex-wrap gap-2 mb-3">
        <input type="text" id="insp-search-input" class="input-flat text-xs flex-1 min-w-[140px]" placeholder="搜索姓名或内容...">
        <select id="insp-tag-filter" class="input-flat text-xs w-24">
          <option value="">全部来源</option>
          <option value="activity">活动</option>
          <option value="taskforce">专班</option>
        </select>
        <select id="insp-status-filter" class="input-flat text-xs w-24">
          <option value="">全部状态</option>
          <option value="confirmed">已确认</option>
          <option value="pending">待确认</option>
          <option value="overdue">超期</option>
        </select>
      </div>
      <div id="insp-table-container"></div>
    </div>
  `;

  const overdueIds = new Set(overdueRecords.map(r => r.id));

  function applyInspFilter(data) {
    const searchEl = document.getElementById('insp-search-input');
    const tagEl = document.getElementById('insp-tag-filter');
    const statusEl = document.getElementById('insp-status-filter');
    if (!searchEl) return data;
    const q = searchEl.value.trim().toLowerCase();
    const t = tagEl ? tagEl.value : '';
    const s = statusEl ? statusEl.value : '';
    return data.filter(r => {
      if (q && !(r.name || '').toLowerCase().includes(q) && !(r.role || '').toLowerCase().includes(q) && !(r.source || '').toLowerCase().includes(q)) return false;
      if (t && r.sourceType !== t) return false;
      if (s === 'overdue') return overdueIds.has(r.id);
      if (s && r.status !== s) return false;
      return true;
    });
  }

  const inspSearchInput = document.getElementById('insp-search-input');
  const inspTagSelect = document.getElementById('insp-tag-filter');
  const inspStatusSelect = document.getElementById('insp-status-filter');
  if (inspSearchInput) inspSearchInput.addEventListener('input', () => { renderLong(); });
  if (inspTagSelect) inspTagSelect.addEventListener('change', () => { renderLong(); });
  if (inspStatusSelect) inspStatusSelect.addEventListener('change', () => { renderLong(); });

  function renderLong() {
    const tc = document.getElementById('insp-table-container');
    if (!tc) return;
    const displayData = applyInspFilter(longData);
    tc.innerHTML = `
      <div class="overflow-x-auto">
        <table class="w-full text-xs">
          <thead><tr class="border-b border-gray-200">
            <th class="py-2 px-3 text-left text-gray-500 font-medium">姓名</th>
            <th class="py-2 px-3 text-left text-gray-500 font-medium">来源</th>
            <th class="py-2 px-3 text-left text-gray-500 font-medium">类别</th>
            <th class="py-2 px-3 text-left text-gray-500 font-medium">内容</th>
            <th class="py-2 px-3 text-left text-gray-500 font-medium">状态</th>
            <th class="py-2 px-3 text-left text-gray-500 font-medium">操作</th>
          </tr></thead>
          <tbody>${displayData.map(i => {
            const isPending = i.status === 'pending';
            const isOverdue = overdueIds.has(i.id);
            const rowBg = isOverdue ? 'bg-red-50/40' : isPending ? 'bg-orange-50/30' : '';
            return `
            <tr class="border-b border-gray-50 hover:bg-gray-50 ${rowBg}">
              <td class="py-2 px-3 font-medium text-gray-800">${i.name}</td>
              <td class="py-2 px-3 text-gray-600">${i.source}</td>
              <td class="py-2 px-3"><span class="px-1.5 py-0.5 rounded text-xs ${tagColor[i.sourceType] || 'bg-gray-50 text-gray-500'}">${i.sourceType === 'activity' ? '活动' : '专班'}</span></td>
              <td class="py-2 px-3 text-gray-600">${i.content || i.role}</td>
              <td class="py-2 px-3"><span class="px-1.5 py-0.5 rounded-full text-xs ${isOverdue ? statusColor.overdue : statusColor[i.status] || 'bg-gray-100 text-gray-500'}">${isOverdue ? '超期' : i.status === 'confirmed' ? '已确认' : '待确认'}</span></td>
              <td class="py-2 px-3">${isPending || isOverdue ? `<button class="text-xs px-3 py-1.5 rounded-lg bg-orange-50 text-orange-700 border border-orange-200 hover:bg-orange-100 transition-colors btn-disc-confirm-insp" data-record-id="${i.id}" style="cursor:pointer;">确认</button> <button class="text-xs px-3 py-1.5 rounded-lg bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 transition-colors btn-disc-delete-insp" data-record-id="${i.id}" style="cursor:pointer;">删除</button>` : '<span class="text-xs text-green-600">已确认</span>'}</td>
            </tr>
          `}).join('')}</tbody>
        </table>
      </div>
    `;

    // 绑定确认按钮事件
    tc.querySelectorAll('.btn-disc-confirm-insp').forEach(btn => {
      btn.addEventListener('click', () => {
        const recordId = btn.dataset.recordId;
        confirmInspectionRecord(recordId);
        showToast('success', '考察记录已确认');
        _renderInspectionContent();
      });
    });

    // 绑定删除按钮事件
    tc.querySelectorAll('.btn-disc-delete-insp').forEach(btn => {
      btn.addEventListener('click', () => {
        const recordId = btn.dataset.recordId;
        if (!confirm('确认删除该考察记录？')) return;
        if (deleteInspectionRecord(recordId)) {
          showToast('success', '考察记录已删除');
          _renderInspectionContent();
        } else {
          showToast('error', '只能删除待确认状态的记录');
        }
      });
    });
  }

  function renderWide() {
    const tc = document.getElementById('insp-table-container');
    if (!tc) return;
    const searchEl = document.getElementById('insp-search-input');
    const q = searchEl ? searchEl.value.trim().toLowerCase() : '';
    const rows = q
      ? wideData.rows.filter(r => (r.name || '').toLowerCase().includes(q))
      : wideData.rows;
    tc.innerHTML = `
      <div class="overflow-x-auto">
        <table class="w-full text-xs">
          <thead><tr class="border-b border-gray-200">
            <th class="py-2 px-3 text-left text-gray-500 font-medium sticky left-0 bg-white">姓名</th>
            ${wideData.columns.map(c => `<th class="py-2 px-3 text-center text-gray-500 font-medium"><div class="text-xs">${c.title}</div><div class="text-[11px] ${tagColor[c.type] || 'text-gray-400'}">${c.type}</div></th>`).join('')}
          </tr></thead>
          <tbody>${rows.map(row => `
            <tr class="border-b border-gray-50 hover:bg-gray-50">
              <td class="py-2 px-3 font-medium text-gray-800 sticky left-0 bg-white">${row.name}</td>
              ${wideData.columns.map(c => {
                const val = row.cells[c.key] || '—';
                return `<td class="py-2 px-3 text-center text-xs text-gray-600">${val}</td>`;
              }).join('')}
            </tr>
          `).join('')}</tbody>
        </table>
      </div>
    `;
  }

  container.querySelectorAll('.insp-view-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.insp-view-btn').forEach(b => {
        b.style.background = 'var(--surface-card)'; b.style.color = 'var(--neutral-500)'; b.style.border = '1px solid var(--neutral-200)';
      });
      btn.style.background = accentRgba; btn.style.color = accent; btn.style.border = `1px solid ${accentBorder}`;
      if (btn.dataset.view === 'long') renderLong(); else renderWide();
    });
  });

  renderLong();
}

function _renderReviewContent() {
  const container = document.getElementById('disc-tab-content');
  if (!container) return;

  const progressColor = { '已完成':'bg-green-100 text-green-700', '超时':'bg-red-100 text-red-700', '进行中':'bg-blue-100 text-blue-700' };
  const reviewColor = { '已上传':'bg-orange-100 text-orange-700', '未提交':'bg-red-100 text-red-700', '—':'bg-gray-100 text-gray-500' };
  const reviewData = reviewToDisplay(loadActiveActivityReviews(), loadTaskforceReviews());

  // 经验沉淀交叉引用：判断已完成复盘的活动是否已有沉淀
  const deposits = _loadDeposits();
  const depositedSources = new Set(deposits.map(d => d.sourceName));
  function hasDeposit(reviewItem) {
    const name = reviewItem.sourceName || reviewItem.activity;
    return depositedSources.has(name);
  }

  // 经验沉淀督促清单：已确认复盘但未沉淀的活动
  const unDepositedReviews = reviewData.filter(r => r.reviewStatus === '已确认' && !hasDeposit(r));

  container.innerHTML = `
    <div class="space-y-4">
      <div class="card rounded-xl p-5">
        <h3 class="font-title-cn text-base font-semibold text-gray-800 mb-3">活动流程监督</h3>
        <div class="text-xs text-gray-500 mb-3">阅览党小组活动/专班工作时间流 · 超时确认后邮件提醒</div>
        <div class="space-y-2">
          ${reviewData.map(r => `
            <div class="flex items-center justify-between p-3 rounded-xl bg-white ${r.overdue ? 'border border-red-100' : ''}">
              <div class="flex-1 min-w-0">
                <div class="text-sm font-medium text-gray-800">${r.activity}</div>
                <div class="text-xs text-gray-500 mt-0.5">组织者：${r.organizer}</div>
              </div>
              <div class="flex items-center gap-2 ml-4">
                <span class="text-xs px-1.5 py-0.5 rounded-full ${progressColor[r.progress] || 'bg-gray-100 text-gray-500'}">${r.progress}</span>
                ${r.overdue ? `<button class="btn-action btn-action-red btn-disc-remind" data-review-id="${r.id}">邮件提醒</button>` : ''}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
      <div class="card rounded-xl p-5">
        <h3 class="font-title-cn text-base font-semibold text-gray-800 mb-3">活动复盘监督</h3>
        <div class="text-xs text-gray-500 mb-3">复盘状态流转：已上传 → 批注中 → 确认/打回</div>
        <div class="space-y-2">
          ${reviewData.filter(r => r.reviewStatus !== '—').map(r => `
            <div class="p-3 rounded-xl bg-white">
              <div class="flex items-center justify-between mb-2">
                <div class="text-sm font-medium text-gray-800">${r.activity}</div>
                <div class="flex items-center gap-2">
                  <span class="text-xs px-1.5 py-0.5 rounded-full ${reviewColor[r.reviewStatus] || 'bg-gray-100 text-gray-500'}">${r.reviewStatus}</span>
                  ${r.reviewStatus === '已确认' ? `<span class="text-xs px-1.5 py-0.5 rounded-full ${hasDeposit(r) ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}">${hasDeposit(r) ? '已沉淀' : '未沉淀'}</span>` : ''}
                </div>
              </div>
              ${r.reviewContent ? `<div class="text-xs text-gray-600 mb-2 p-2 bg-white rounded-lg border border-gray-100">${r.reviewContent}</div>` : ''}
              ${(r.issues && r.issues.length) ? `<div class="mb-2 p-2 rounded-lg border border-amber-100 bg-amber-50">
                <div class="text-[11px] text-amber-700 font-bold mb-0.5">提出的真问题（${r.issues.length}）</div>
                <ul class="space-y-0.5">${r.issues.map(i => `<li class="text-xs text-amber-800">· ${i}</li>`).join('')}</ul>
              </div>` : ''}
              <div class="flex gap-2">
                ${r.reviewStatus === '已上传' ? `
                  <button class="btn-action btn-action-orange btn-disc-annotate" data-review-id="${r.id}">批注</button>
                  <button class="btn-action btn-action-red btn-disc-reject" data-review-id="${r.id}">打回</button>
                  <button class="btn-action btn-action-green btn-disc-confirm" data-review-id="${r.id}">确认</button>
                ` : ''}
                ${r.reviewStatus === '未提交' ? `
                  <button class="btn-action btn-action-red btn-disc-remind-review" data-review-id="${r.id}">邮件提醒</button>
                ` : ''}
                ${r.reviewStatus === '已确认' && !hasDeposit(r) ? `
                  <button class="btn-action btn-action-amber btn-disc-urge-deposit" data-review-id="${r.id}" data-activity-name="${r.sourceName || r.activity}" data-organizer="${r.organizer}">督促沉淀</button>
                ` : ''}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
      ${unDepositedReviews.length > 0 ? `
      <div class="card rounded-xl p-5">
        <h3 class="font-title-cn text-base font-semibold text-gray-800 mb-3">经验沉淀督促清单</h3>
        <div class="text-xs text-gray-500 mb-3">以下活动复盘已确认但尚未沉淀经验，请督促深度参与者提交</div>
        <div class="space-y-2">
          ${unDepositedReviews.map(r => `
            <div class="flex items-center justify-between p-3 rounded-xl bg-white">
              <div class="flex-1 min-w-0">
                <div class="text-sm font-medium text-gray-800">${r.activity}</div>
                <div class="text-xs text-gray-500 mt-0.5">组织者：${r.organizer}</div>
              </div>
              <button class="text-xs px-3 py-1.5 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 btn-disc-urge-deposit" style="cursor:pointer;" data-activity-name="${r.sourceName || r.activity}" data-organizer="${r.organizer}">督促沉淀</button>
            </div>
          `).join('')}
        </div>
      </div>
      ` : ''}
    </div>
  `;

  // ── 复盘真操作（2026-08-05 修复：批注/打回/确认/邮件提醒均落库，不再只弹 toast） ──
  container.querySelectorAll('.btn-disc-remind').forEach(btn => btn.addEventListener('click', () => {
    const id = btn.dataset.reviewId;
    if (id) updateReviewById(id, { remindedAt: new Date().toISOString(), reminderType: 'overdue' });
    showToast('success', '超时邮件提醒已发送');
  }));
  container.querySelectorAll('.btn-disc-annotate').forEach(btn => btn.addEventListener('click', () => {
    const reviewId = btn.dataset.reviewId;
    openFormModal({
      id: 'annotation',
      title: '添加批注',
      fields: [
        { key: 'type', label: '批注类型', type: 'select', required: true, options: [
          { value: 'suggestion', label: '建议' },
          { value: 'question', label: '疑问' },
          { value: 'correction', label: '纠正' },
          { value: 'praise', label: '肯定' }
        ]},
        { key: 'content', label: '批注内容', type: 'textarea', required: true, placeholder: '请输入批注内容...' }
      ],
      onSubmit: (values) => {
        const updated = updateReviewById(reviewId, {
          reviewStatus: ReviewStatus.ANNOTATING,
          annotation: values.content,
          annotationType: values.type,
          annotatedBy: DISC_COMMISSIONER_ID,
          annotatedAt: new Date().toISOString(),
        });
        if (!updated) { showToast('error', '复盘记录不存在'); return; }
        showToast('success', '批注已添加，复盘状态更新为批注中');
        _renderReviewContent();
      },
      accentColor: accent || 'var(--accent-disc-commissioner)'
    });
  }));
  container.querySelectorAll('.btn-disc-reject').forEach(btn => btn.addEventListener('click', () => {
    const id = btn.dataset.reviewId;
    const updated = updateReviewById(id, {
      reviewStatus: ReviewStatus.REJECTED,
      annotatedBy: DISC_COMMISSIONER_ID,
      annotatedAt: new Date().toISOString(),
    });
    if (!updated) { showToast('error', '复盘记录不存在'); return; }
    showToast('success', '复盘已打回，要求重新提交');
    _renderReviewContent();
  }));
  container.querySelectorAll('.btn-disc-confirm').forEach(btn => btn.addEventListener('click', () => {
    const id = btn.dataset.reviewId;
    const updated = updateReviewById(id, {
      reviewStatus: ReviewStatus.CONFIRMED,
      confirmedAt: new Date().toISOString(),
    });
    if (!updated) { showToast('error', '复盘记录不存在'); return; }
    showToast('success', '复盘总结已确认，录入后台，活动结束');
    _renderReviewContent();
  }));
  container.querySelectorAll('.btn-disc-remind-review').forEach(btn => btn.addEventListener('click', () => {
    const id = btn.dataset.reviewId;
    if (id) updateReviewById(id, { remindedAt: new Date().toISOString(), reminderType: 'resubmit' });
    showToast('success', '复盘超期邮件提醒已发送至组织者');
  }));
  // 督促沉淀按钮
  container.querySelectorAll('.btn-disc-urge-deposit').forEach(btn => btn.addEventListener('click', () => {
    const id = btn.dataset.reviewId;
    const organizer = btn.dataset.organizer;
    if (id) updateReviewById(id, { remindedAt: new Date().toISOString(), reminderType: 'deposit' });
    showToast('success', `已发送沉淀督促提醒至 ${organizer}`);
  }));
}

/** 格式化时间（月-日 时:分） */
function _discFormatTime(isoStr) {
  if (!isoStr) return '—';
  const d = new Date(isoStr);
  const pad = n => String(n).padStart(2, '0');
  return `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// ── 补课制度 Tab（党建） ──────────────────────────────────────────

function _renderMakeupContent() {
  const container = document.getElementById('disc-tab-content');
  if (!container) return;

  const tasks = loadMakeupTasks();
  const pendingTasks = tasks.filter(t => t.status === 'pending');
  const overdueTasks = pendingTasks.filter(t => new Date(t.deadline) < new Date());

  const statusBadge = (task) => {
    if (task.status === 'completed') return badgeHtml('已完成', 'success');
    if (new Date(task.deadline) < new Date()) return badgeHtml('已超期', 'danger');
    return badgeHtml('待补课', 'warning');
  };

  container.innerHTML = `
    <div class="space-y-4">
      <div class="card rounded-xl p-5">
        <div class="flex items-center justify-between mb-3">
          <h3 class="font-title-cn text-base font-semibold text-gray-800">补课任务</h3>
          <div class="flex gap-4 text-xs">
            <div class="flex items-center gap-1.5"><span class="w-2 h-2 rounded-full bg-orange-500"></span><span class="text-gray-600">待补课</span><span class="font-bold text-orange-700">${pendingTasks.length}</span></div>
            <div class="flex items-center gap-1.5"><span class="w-2 h-2 rounded-full bg-red-500"></span><span class="text-gray-600">已超期</span><span class="font-bold text-red-700">${overdueTasks.length}</span></div>
          </div>
        </div>
        <div class="text-xs text-gray-500 mb-3">缺勤/请假的三会一课、主题党日须在7日内补课，纪检委员确认完成</div>
        ${tasks.length === 0 ? '<div class="text-xs text-gray-400 py-6 text-center">暂无补课任务</div>' : `
        <div class="overflow-x-auto">
          <table class="w-full text-xs">
            <thead><tr class="border-b border-gray-200">
              <th class="py-2 px-3 text-left text-gray-500 font-medium">姓名</th>
              <th class="py-2 px-3 text-left text-gray-500 font-medium">缺席活动</th>
              <th class="py-2 px-3 text-left text-gray-500 font-medium">补课方式</th>
              <th class="py-2 px-3 text-left text-gray-500 font-medium">截止日期</th>
              <th class="py-2 px-3 text-left text-gray-500 font-medium">状态</th>
              <th class="py-2 px-3 text-left text-gray-500 font-medium">操作</th>
            </tr></thead>
            <tbody>${tasks.map(t => {
              const isOverdue = t.status === 'pending' && new Date(t.deadline) < new Date();
              const rowBg = isOverdue ? 'bg-red-50/40' : t.status === 'completed' ? '' : 'bg-orange-50/20';
              return `
              <tr class="border-b border-gray-50 hover:bg-gray-50 ${rowBg}">
                <td class="py-2 px-3 font-medium text-gray-800">${t.personName || getPersonName(t.personId)}</td>
                <td class="py-2 px-3 text-gray-600">${t.activityName || '—'}</td>
                <td class="py-2 px-3 text-gray-600">${t.isMandatory ? badgeHtml('必修', 'danger') + ' 自学+心得' : badgeHtml('选修', 'info') + ' 自学'}</td>
                <td class="py-2 px-3 text-gray-600">${t.deadline || '—'}</td>
                <td class="py-2 px-3">${statusBadge(t)}</td>
                <td class="py-2 px-3">${t.status === 'pending' ? `<button class="btn-action btn-action-green btn-disc-confirm-makeup" data-task-id="${t.id}">确认完成</button>` : '<span class="text-xs text-gray-400">—</span>'}</td>
              </tr>
            `}).join('')}</tbody>
          </table>
        </div>
        `}
      </div>

      ${overdueTasks.length > 0 ? `
      <div class="bg-red-50 border border-red-200 rounded-xl p-3">
        <div class="flex items-center gap-2 mb-1">
          <span class="text-xs font-bold text-red-700">超期提醒</span>
          ${badgeHtml(`${overdueTasks.length}条`, 'danger')}
        </div>
        <div class="text-xs text-red-600">以下补课任务已超期，请尽快督促完成</div>
        <div class="mt-2 space-y-1">
          ${overdueTasks.map(t => `
            <div class="flex items-center justify-between text-xs">
              <span class="text-gray-700">${t.personName || getPersonName(t.personId)} — ${t.activityName || '—'}</span>
              <span class="text-red-500">截止 ${t.deadline}</span>
            </div>
          `).join('')}
        </div>
      </div>
      ` : ''}
    </div>
  `;

  // 绑定"确认完成"按钮事件
  container.querySelectorAll('.btn-disc-confirm-makeup').forEach(btn => {
    btn.addEventListener('click', () => {
      const taskId = btn.dataset.taskId;
      const tasks = loadMakeupTasks();
      const task = tasks.find(t => t.id === taskId);
      if (task) {
        task.status = 'completed';
        task.completedAt = new Date().toISOString();
        saveMakeupTasks(tasks);
        showToast('success', `${task.personName || getPersonName(task.personId)} 的补课任务已确认完成`);
        _renderMakeupContent();
      }
    });
  });
}

// ── 公邮管理 Tab（党建） ──────────────────────────────────────────

function _renderMailboxContent() {
  const container = document.getElementById('disc-tab-content');
  if (!container) return;

  const mailboxConfig = _loadMailboxConfig();
  const mailboxHistory = _loadMailboxHistory();

  // 计算下次查收倒计时
  const lastCheck = new Date(mailboxConfig.lastCheckAt);
  const nextCheck = new Date(lastCheck);
  nextCheck.setDate(nextCheck.getDate() + mailboxConfig.checkCycleDays);
  const now = new Date();
  const diffMs = nextCheck - now;
  const isOverdue = diffMs < 0;
  const absDiffMs = Math.abs(diffMs);
  const daysLeft = Math.floor(absDiffMs / (1000 * 60 * 60 * 24));
  const hoursLeft = Math.floor((absDiffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

  const countdownText = isOverdue
    ? `已超期 ${daysLeft}天${hoursLeft}小时`
    : `${daysLeft}天${hoursLeft}小时`;
  const countdownColor = isOverdue ? 'text-red-600' : 'text-green-600';
  const countdownBg = isOverdue ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200';

  container.innerHTML = `
    <div class="space-y-4">
      <!-- 邮箱信息 + 倒计时 -->
      <div class="card rounded-xl p-5">
        <h3 class="font-title-cn text-base font-semibold text-gray-800 mb-3">支部公邮</h3>
        <div class="flex items-center gap-3 mb-4">
          <div class="flex-1">
            <div class="text-xs text-gray-500 mb-1">邮箱地址</div>
            <div class="text-sm font-mono font-medium text-gray-800">${mailboxConfig.email}</div>
          </div>
          <div class="flex-1">
            <div class="text-xs text-gray-500 mb-1">查收周期</div>
            <div class="text-sm font-medium text-gray-800">每 ${mailboxConfig.checkCycleDays} 天</div>
          </div>
        </div>
        <div class="p-3 rounded-xl border ${countdownBg}">
          <div class="flex items-center justify-between">
            <div>
              <div class="text-xs text-gray-600 mb-0.5">${isOverdue ? '距上次查收已过' : '距下次查收'}</div>
              <div class="text-lg font-bold ${countdownColor}">${countdownText}</div>
            </div>
            <div class="text-right">
              <div class="text-xs text-gray-500">上次查收</div>
              <div class="text-xs text-gray-600">${_discFormatTime(mailboxConfig.lastCheckAt)}</div>
            </div>
          </div>
          ${isOverdue ? '<div class="text-xs text-red-500 mt-2">已超期，请尽快查收公邮</div>' : ''}
        </div>
        <div class="mt-3 flex gap-2">
          <button class="btn-md btn-md-green btn-disc-check-mailbox">标记已查收</button>
        </div>
      </div>

      <!-- 查收历史 -->
      <div class="card rounded-xl p-5">
        <h3 class="font-title-cn text-base font-semibold text-gray-800 mb-3">查收历史</h3>
        <div class="text-xs text-gray-500 mb-3">纪检委员定期查收支部公邮，处理来往邮件</div>
        <div class="space-y-2">
          ${mailboxHistory.map(h => `
            <div class="p-3 rounded-xl bg-white">
              <div class="flex items-center justify-between mb-1">
                <div class="flex items-center gap-2">
                  <span class="text-xs px-1.5 py-0.5 rounded ${h.hasAction ? 'bg-amber-50 text-amber-700' : 'bg-gray-50 text-gray-500'}">${h.hasAction ? '有处理' : '无待办'}</span>
                  <span class="text-xs text-gray-600">${_discFormatTime(h.checkedAt)}</span>
                </div>
                <span class="text-xs text-gray-400">${getPersonName(h.checkedBy)}</span>
              </div>
              <div class="text-xs text-gray-700">${h.summary}</div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;

  // 绑定"标记已查收"按钮事件
  container.querySelector('.btn-disc-check-mailbox')?.addEventListener('click', () => {
    const now = new Date().toISOString();
    const newRecord = {
      id: 'mh_' + Date.now(),
      checkedAt: now,
      checkedBy: DISC_COMMISSIONER_ID,
      summary: '已查收，暂无待处理邮件',
      hasAction: false,
    };
    mailboxHistory.unshift(newRecord);
    mailboxConfig.lastCheckAt = now;
    persist();
    showToast('success', '公邮查收已记录');
    _renderMailboxContent();
  });
}

registerRenderCallback(renderDiscUI);

loadWorkspaceData({ role: 'disc-commissioner', storeInits: [() => TaskForceRecordStore.init()], fallbackData: () => loadActivities(), logTag: 'ws-disc' });
