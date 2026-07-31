import { getAppState, setState, STATE, registerRenderCallback } from '../core/state.js';
import { BranchService } from '../services/runtime.js';
import { _fmtDate, showToast, _currentYearMonth } from '../core/utils.js';
import { populateMonthSelector, renderCalendarByActivities } from '../components/calendar.js';
import { renderInspectorFromState } from '../components/inspector.js';
import { computeSecretaryStats } from '../services/roles.js';
import { AuthStore } from '../services/auth.js';
import { bootstrapPage } from '../core/bootstrap.js';
import { getPersonById } from '../mock/index.js';
import { mockDB } from '../core/domain.js';
import { ROLE_LABELS, ISSUE_STATUS_LABELS, ISSUE_CLOSED_REASON_LABELS, DRAFT_TYPE_LABELS } from '../core/constants.js';
import { PersonPicker } from '../components/person-picker.js';
import { DecisionTreeState, renderWorkflowPanel, writeActivityWithSOP } from '../services/decision-tree.js';
import { FeedbackStore } from '../services/feedback.js';
import { IssueStore, deriveIssueDisplayState, IssueNotify } from '../services/issues.js';
import { loadActivities } from '../services/activity.js';
import { loadWorkspaceData } from '../core/data-loader.js';
import { renderQueryView } from '../components/query-view.js';
import { icon } from '../core/icons.js';
import { renderTodoList } from '../components/todo-list.js';
import { TodoStore, seedTodos, TodoStatus } from '../services/todo.js';

await bootstrapPage({ module: 'workspace' });

// 书记工作台使用固定红色作为强调色（与 HTML 中 .sec-tab-btn 样式一致）
const accent = '#B91C1C';

// ── Tab 切换 ──
const SEC_TAB_STORAGE_KEY = 'workflowos_tab_secretary';
let _secActiveTab = 'todo';
let _secTabsBound = false;

function _bindSecTabs() {
  if (_secTabsBound) return;
  _secTabsBound = true;
  const buttons = document.querySelectorAll('.sec-tab-btn');
  const panes = document.querySelectorAll('.sec-tab-pane');
  const accentStyle = '--tab-accent:#B91C1C;--tab-accent-bg:rgba(185,28,28,0.10);--tab-accent-border:rgba(185,28,28,0.25)';

  // 读取 localStorage 记忆的 Tab（优先级：localStorage > 默认 todo）
  let initialTab = 'todo';
  try {
    const saved = localStorage.getItem(SEC_TAB_STORAGE_KEY);
    if (saved && document.querySelector(`.sec-tab-btn[data-sec-tab="${saved}"]`)) {
      initialTab = saved;
    }
  } catch (_) { /* localStorage 不可用时静默降级 */ }
  _secActiveTab = initialTab;

  // 应用初始 Tab 状态（覆盖 HTML 静态默认）
  buttons.forEach(b => { b.classList.remove('tab-btn-active'); b.removeAttribute('style'); });
  panes.forEach(p => p.classList.add('hidden'));
  const initialBtn = document.querySelector(`.sec-tab-btn[data-sec-tab="${initialTab}"]`);
  if (initialBtn) {
    initialBtn.classList.add('tab-btn-active');
    initialBtn.setAttribute('style', accentStyle);
  }
  const initialPane = document.getElementById(`sec-tab-${initialTab}`);
  if (initialPane) initialPane.classList.remove('hidden');

  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      _secActiveTab = btn.dataset.secTab;
      buttons.forEach(b => { b.classList.remove('tab-btn-active'); b.removeAttribute('style'); });
      btn.classList.add('tab-btn-active');
      btn.setAttribute('style', accentStyle);
      panes.forEach(p => p.classList.add('hidden'));
      const targetPane = document.getElementById(`sec-tab-${_secActiveTab}`);
      if (targetPane) targetPane.classList.remove('hidden');
      // 记忆到 localStorage
      try { localStorage.setItem(SEC_TAB_STORAGE_KEY, _secActiveTab); } catch (_) { /* 静默降级 */ }
    });
  });
}

function renderSecretaryUI(state) {
  _bindSecTabs();
  const activities = state.activities || [];
  const allActivities = loadActivities();
  if (activities.length === 0 && allActivities.length > 0) {
    const mapped = allActivities.map(a => ({
      ...a,
      visibility: a.visibility || 'branch',
      executor: a.organizer || 'u_exec',
      supervisor: null,
      createdBy: a.organizer || 'u_exec',
      createdAt: a.date || new Date().toISOString(),
    }));
    setState({ activities: mapped, viewType: 'manager', managementRole: 'secretary' });
    return;
  }

  const stats = computeSecretaryStats(activities);
  const statsEl = document.getElementById('secretary-stats');
  if (statsEl) {
    // 统计条：紧凑文本概览（圆点+数字+标签），替代原 4 张大卡平铺
    const items = [
      { label: '待赋权活动', value: stats.pendingAuth, color: '#D97706' },
      { label: '活跃活动', value: stats.activeEvents, color: '#059669' },
      { label: '本月活动', value: stats.monthEvents, color: '#2563EB' },
      { label: '已赋权记录', value: stats.authGranted, color: '#0E7490' },
    ];
    statsEl.innerHTML = items.map(s => `
      <span class="inline-flex items-center gap-1.5">
        <span class="inline-block w-1.5 h-1.5 rounded-full" style="background:${s.color};"></span>
        <span class="font-semibold text-gray-700">${s.value}</span>
        <span>${s.label}</span>
      </span>
    `).join('');
  }

  const filterBrand = state.filterBrand || false;
  const displayActivities = filterBrand
    ? activities.filter(a => a.isBrand)
    : activities;

  const filteredState = { ...state, activities: displayActivities };
  renderCalendarByActivities(filteredState, state.displayMonth || _currentYearMonth());
  renderInspectorFromState(filteredState);
  populateMonthSelector(activities);

  // 品牌筛选按钮，移入 Tab 工具栏（C1）
  const toolbar = document.getElementById('sec-toolbar');
  if (toolbar) {
    let filterBtn = document.getElementById('brand-filter-btn');
    if (!filterBtn) {
      filterBtn = document.createElement('button');
      filterBtn.id = 'brand-filter-btn';
      filterBtn.className = 'font-stheiti text-sm px-3 py-1.5 rounded-lg transition-colors';
      filterBtn.addEventListener('click', () => {
        setState({ filterBrand: !filterBrand });
      });
      toolbar.appendChild(filterBtn);
    }
    filterBtn.style.cssText = filterBrand
      ? 'background:rgba(234,179,8,0.15);color:var(--brand-amber-dark);border:1px solid rgba(234,179,8,0.40);'
      : 'background:rgba(156,163,175,0.10);color:#6B7280;border:1px solid rgba(156,163,175,0.30);';
    filterBtn.textContent = filterBrand ? '品牌活动（筛选中）' : '品牌活动';
  }

  // ── 活动查询视图（容器已在 HTML 中，位于折叠面板内） ──
  const queryContainer = document.getElementById('secretary-query-container');
  if (queryContainer) {
    const typeOptions = [...new Set(displayActivities.map(a => a.type).filter(Boolean))].map(t => ({ value: t, label: t }));
    renderQueryView(queryContainer, {
      searchPlaceholder: '搜索活动名称...',
      searchKey: 'title',
      filters: [{ key: 'type', label: '活动类型', options: typeOptions }],
      data: displayActivities,
      renderRow: (a) => `
        <div class="flex items-center justify-between p-3 rounded-xl bg-white transition-colors">
          <div class="flex-1 min-w-0">
            <div class="text-sm font-medium text-gray-800">${a.title || '未命名'}</div>
            <div class="text-xs text-gray-500 mt-0.5">${a.date || ''}${a.type ? ' · ' + a.type : ''}</div>
          </div>
          ${a.type ? `<span class="text-[10px] px-1.5 py-0.5 rounded-full bg-red-50 text-red-600">${a.type}</span>` : ''}
        </div>
      `,
      emptyMessage: '暂无匹配活动',
      accentColor: '#B91C1C',
      sortKey: 'date',
      sortDir: 'desc',
    });
  }

  // 活动查询折叠面板绑定（默认折叠，点击展开/收起）
  const queryToggle = document.getElementById('query-toggle');
  const queryCollapsible = document.getElementById('query-collapsible');
  const queryToggleIcon = document.getElementById('query-toggle-icon');
  if (queryToggle && queryCollapsible && !queryToggle.dataset.bound) {
    queryToggle.dataset.bound = '1';
    queryToggle.addEventListener('click', () => {
      const isHidden = queryCollapsible.classList.toggle('hidden');
      if (queryToggleIcon) queryToggleIcon.style.transform = isHidden ? 'rotate(0deg)' : 'rotate(180deg)';
    });
  }

  // ── 决策树引导式写入面板 ──────────────────────────────────────────
  // 仅在面板未初始化时渲染，避免全局状态刷新时丢失用户输入
  const writeArea = document.getElementById('write-form-area');
  if (writeArea && !writeArea.dataset.panelInit) {
    writeArea.dataset.panelInit = '1';
    renderWritePanel(writeArea);
  }

  const assignArea = document.getElementById('assign-area');
  if (assignArea && assignArea.childElementCount === 0) {
    assignArea.innerHTML = `
      <p class="text-xs text-gray-500 mb-3">设党小组组长——角色指派靠口头/群聊，系统内设+记录可追溯</p>
      <button id="ws-sec-assign-btn" class="text-sm px-4 py-2 rounded-lg bg-orange-50 text-orange-700 border border-orange-200 hover:bg-orange-100 transition-colors">设党小组组长</button>
    `;
    assignArea.querySelector('#ws-sec-assign-btn')?.addEventListener('click', () => {
      toggleAuthPanel(assignArea);
    });
  }

  // ── issue 管理（GitHub Issue 风格，替代旧 P3-1 反馈管理）──
  renderIssueManagement();

  // ── 通知发布（党务） ──
  renderNotificationPanel();

  // ── 待办 tab 内容渲染（最小三成本原则落地） ──
  _renderTodoContent();
}

// ── 待办列表+详情面板（最小三成本原则落地） ───────────────────
let _selectedTodoId = null;

function _renderTodoContent() {
  const container = document.getElementById('sec-tab-todo');
  if (!container) return;

  // 刷新过期状态
  TodoStore.refreshExpiredStatus();

  const groupedTodos = TodoStore.getGroupedByCategory('secretary');
  const stats = TodoStore.getStatsByRole('secretary');
  const selectedTodo = _selectedTodoId ? TodoStore.getById(_selectedTodoId) : null;

  const { html: todoListHtml, bindEvents } = renderTodoList({
    prefix: 'secretary',
    groupedTodos,
    stats,
    accent,
    onSelectTodo: (todo) => {
      _selectedTodoId = todo.id;
      _renderTodoContent();
    },
    onCompleteTodo: (todoId) => {
      TodoStore.complete(todoId);
      if (_selectedTodoId === todoId) _selectedTodoId = null;
      showToast('success', '待办已完成');
      _renderTodoContent();
    },
    onActionTodo: (todo) => {
      _handleTodoAction(todo);
    },
  });

  const detailHtml = selectedTodo ? _renderTodoDetail(selectedTodo) : `
    <div class="text-center py-12 text-gray-400">
      <p class="text-sm">点击左侧待办查看详情</p>
      <p class="text-xs mt-1">或直接点击"去赋权/去审核"等按钮处理</p>
    </div>
  `;

  container.innerHTML = `
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div class="lg:col-span-2">
        <div class="card rounded-xl p-5 border-l-4" style="border-left-color:${accent};">
          <div class="flex items-center justify-between mb-4">
            <h4 class="font-title-cn text-sm font-bold text-gray-700">我的待办</h4>
          </div>
          ${todoListHtml}
        </div>
      </div>
      <div class="lg:col-span-1">
        <div class="card rounded-xl p-5 sticky top-20">
          <h4 class="font-title-cn text-sm font-bold text-gray-700 mb-4">详情</h4>
          ${detailHtml}
        </div>
      </div>
    </div>
  `;

  bindEvents(container);
  _bindTodoDetailEvents();
}

function _renderTodoDetail(todo) {
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
          <span class="text-[10px] px-1.5 py-0.5 rounded-full ${statusColor}">${statusLabel}</span>
          ${todo.priority === 'urgent' ? '<span class="text-[10px] px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-700">紧急</span>' : ''}
        </div>
        <p class="font-title-cn text-sm font-bold text-gray-800">${todo.title}</p>
      </div>
      ${todo.description ? `<p class="text-xs text-gray-600 leading-relaxed">${todo.description}</p>` : ''}
      ${todo.deadline ? `<div class="text-xs text-gray-500">截止：${todo.deadline}</div>` : ''}
      <div class="text-xs text-gray-400">创建：${(todo.createdAt || '').slice(0, 16).replace('T', ' ')}</div>
      <div class="pt-3 border-t border-gray-100 flex gap-2">
        ${todo.status !== 'completed' ? `
          <button class="secretary-todo-detail-complete text-xs px-4 py-1.5 rounded-lg text-white transition-colors hover:opacity-90" style="background:${accent};">标记完成</button>
          ${todo.actionType ? `<button class="secretary-todo-detail-action text-xs px-4 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">处理</button>` : ''}
        ` : '<span class="text-xs text-green-600">已完成</span>'}
      </div>
    </div>
  `;
}

function _handleTodoAction(todo) {
  // 根据 actionType 跳转到对应 tab
  const tabMap = {
    authorize: 'assign',
    write: 'calendar',
    review: 'feedback',
    notify: 'notification',
  };
  const targetTab = tabMap[todo.actionType];
  if (targetTab) {
    const btn = document.querySelector(`.sec-tab-btn[data-sec-tab="${targetTab}"]`);
    if (btn) btn.click();
    showToast('info', `已跳转，请处理：${todo.title}`);
  } else {
    showToast('info', `请处理：${todo.title}`);
  }
}

function _bindTodoDetailEvents() {
  const container = document.getElementById('sec-tab-todo');
  if (!container) return;
  container.querySelector('.secretary-todo-detail-complete')?.addEventListener('click', () => {
    if (_selectedTodoId) {
      TodoStore.complete(_selectedTodoId);
      _selectedTodoId = null;
      showToast('success', '待办已完成');
      _renderTodoContent();
    }
  });
  container.querySelector('.secretary-todo-detail-action')?.addEventListener('click', () => {
    if (_selectedTodoId) {
      const todo = TodoStore.getById(_selectedTodoId);
      if (todo) _handleTodoAction(todo);
    }
  });
}

// ════════════════════════════════════════════════════════════════
//  活动写入面板（2 步：模板选择 → 表单填写）
//  2026-07-30 重新设计：取消原 5 步决策树，改为更直观的 2 步式
// ════════════════════════════════════════════════════════════════

/** 决策树状态（已迁移至 services/decision-tree.js，仅复用 selections/step 字段）*/
const wp = new DecisionTreeState('secretary');

/**
 * 活动模板配置（2 步式 Step 1 使用）
 * 两类：三会一课（党建红）/ 主题党日（党建蓝）
 */
const WRITE_TEMPLATES = [
  {
    category: 'three-meetings',
    categoryLabel: '三会一课',
    color: '#CE1126',
    bg: 'rgba(206,17,38,0.08)',
    border: 'rgba(206,17,38,0.25)',
    subtypes: [
      { value: 'branch-party-meeting', label: '支部党员大会', scenarioId: 'branch-party-meeting' },
      { value: 'branch-committee', label: '支委会', scenarioId: 'branch-committee' },
      { value: 'party-group-meeting', label: '党小组会', scenarioId: 'party-group-meeting' },
      { value: 'party-lecture', label: '党课', scenarioId: 'party-lecture' },
    ],
  },
  {
    category: 'theme-day',
    categoryLabel: '主题党日',
    color: '#2563EB',
    bg: 'rgba(37,99,235,0.08)',
    border: 'rgba(37,99,235,0.25)',
    subtypes: [
      { value: 'study', label: '学习', scenarioId: 'theme-party', activityType: 'study' },
      { value: 'visit', label: '参访', scenarioId: 'theme-party', activityType: 'visit' },
      { value: 'forum', label: '座谈', scenarioId: 'theme-party', activityType: 'forum' },
      { value: 'co-build', label: '共建', scenarioId: 'theme-party', activityType: 'co-build' },
      { value: 'meeting', label: '会议', scenarioId: 'theme-party', activityType: 'meeting' },
    ],
  },
];

// ── 渲染函数 ──────────────────────────────────────────────────

/** 主渲染入口（2 步：模板选择 → 表单填写）*/
function renderWritePanel(container) {
  let html = '';

  // 面包屑（替代原 5 步指示器）
  const step1Active = wp.step === 1;
  html += `<div class="flex items-center gap-2 mb-5 text-xs">`;
  html += `<span class="${step1Active ? 'text-red-700 font-semibold' : 'text-gray-400'}">① 选模板</span>`;
  html += `<span class="text-gray-300">›</span>`;
  html += `<span class="${!step1Active ? 'text-red-700 font-semibold' : 'text-gray-400'}">② 填表单</span>`;
  html += `</div>`;

  // 当前步骤内容
  if (wp.step === 1) {
    html += renderTemplateStep();
  } else {
    html += renderFormStep();
  }

  // 返回按钮（step 2 时显示，返回 step 1 重选模板）
  if (wp.step > 1) {
    html += `<button data-action="wp-back" class="mt-4 text-xs text-gray-400 hover:text-gray-600 transition-colors flex items-center gap-1">`;
    html += icon('chevronLeft', { className: 'w-3 h-3' });
    html += `返回选模板</button>`;
  }

  container.innerHTML = html;
  bindWritePanelEvents(container);
}

/** Step 1 · 选模板（一屏卡片选择）*/
function renderTemplateStep() {
  let html = `<div>`;
  html += `<p class="text-sm font-medium text-gray-700 mb-3">选择活动模板</p>`;
  html += `<div class="grid grid-cols-1 md:grid-cols-2 gap-3">`;

  WRITE_TEMPLATES.forEach(tpl => {
    html += `<div class="rounded-xl border border-gray-200 overflow-hidden">`;
    // 类别标题色块
    html += `<div class="px-3 py-2" style="background:${tpl.bg};border-bottom:1px solid ${tpl.border};">`;
    html += `<span class="text-sm font-semibold" style="color:${tpl.color};">${tpl.categoryLabel}</span>`;
    html += `</div>`;
    // 子类型按钮列表
    html += `<div class="p-2 space-y-1">`;
    tpl.subtypes.forEach(sub => {
      const isSelected = wp.selections.L1 === tpl.category && wp.selections.L1Sub === sub.value;
      html += `<button data-action="select-template" data-category="${tpl.category}" data-subtype="${sub.value}" data-scenario-id="${sub.scenarioId}" data-activity-type="${sub.activityType || ''}" data-color="${tpl.color}" class="w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${isSelected ? 'bg-red-50 text-red-700 font-medium' : 'text-gray-700 hover:bg-gray-50'}">`;
      html += sub.label;
      html += `</button>`;
    });
    html += `</div>`;
    html += `</div>`;
  });

  html += `</div>`;
  html += `</div>`;
  return html;
}

/** Step 2 · 填表单（一屏完成）*/
function renderFormStep() {
  // 找到当前选中模板
  const tpl = WRITE_TEMPLATES.find(t => t.category === wp.selections.L1);
  if (!tpl) {
    // 未选模板时回退到 Step 1
    wp.step = 1;
    return renderTemplateStep();
  }
  const sub = tpl.subtypes.find(s => s.value === wp.selections.L1Sub);
  if (!sub) {
    wp.step = 1;
    return renderTemplateStep();
  }

  const scenarioTitle = wp.getScenarioTitle();
  const today = new Date().toISOString().slice(0, 10);

  let html = `<div>`;
  // 已选模板提示
  html += `<div class="mb-4 px-3 py-2 rounded-lg" style="background:${tpl.bg};border:1px solid ${tpl.border};">`;
  html += `<p class="text-xs font-medium" style="color:${tpl.color};">已选模板：${tpl.categoryLabel} · ${sub.label}</p>`;
  if (scenarioTitle) {
    html += `<p class="text-[11px] text-gray-500 mt-0.5">SOP 场景：${scenarioTitle}（写入后自动生成任务节点）</p>`;
  }
  html += `</div>`;

  // 标题（必填）
  html += `<div class="mb-3">`;
  html += `<label class="text-xs text-gray-500 mb-1 block">活动名称 <span class="text-red-500">*</span></label>`;
  html += `<input type="text" id="wp-title" class="input-flat w-full" placeholder="活动名称">`;
  html += `</div>`;

  // 日期 + 时间
  html += `<div class="grid grid-cols-2 gap-3 mb-3">`;
  html += `<div>`;
  html += `<label class="text-xs text-gray-500 mb-1 block">日期 <span class="text-red-500">*</span></label>`;
  html += `<input type="date" id="wp-date" value="${today}" class="input-flat w-full">`;
  html += `</div>`;
  html += `<div>`;
  html += `<label class="text-xs text-gray-500 mb-1 block">时间 <span class="text-gray-300">（选填）</span></label>`;
  html += `<input type="text" id="wp-time" class="input-flat w-full" placeholder="如 14:00-16:00">`;
  html += `</div>`;
  html += `</div>`;

  // 地点（必填）
  html += `<div class="mb-3">`;
  html += `<label class="text-xs text-gray-500 mb-1 block">地点 <span class="text-red-500">*</span></label>`;
  html += `<input type="text" id="wp-location" class="input-flat w-full" placeholder="活动地点">`;
  html += `</div>`;

  // 主持人（默认当前用户）
  html += `<div class="mb-3">`;
  html += `<label class="text-xs text-gray-500 mb-1 block">主持人 <span class="text-gray-300">（选填）</span></label>`;
  html += `<input type="text" id="wp-host" class="input-flat w-full" placeholder="默认为当前用户">`;
  html += `</div>`;

  // 备注
  html += `<div class="mb-3">`;
  html += `<label class="text-xs text-gray-500 mb-1 block">备注 <span class="text-gray-300">（选填）</span></label>`;
  html += `<textarea id="wp-desc" rows="2" class="input-flat w-full" placeholder="活动内容/目标等"></textarea>`;
  html += `</div>`;

  // 高级选项（折叠）
  html += `<details class="mb-4">`;
  html += `<summary class="text-xs text-gray-400 cursor-pointer hover:text-gray-600">高级选项（发起方向 / 时长）</summary>`;
  html += `<div class="mt-2 grid grid-cols-2 gap-3">`;
  // 发起方向
  html += `<div>`;
  html += `<label class="text-xs text-gray-500 mb-1 block">发起方向</label>`;
  html += `<select id="wp-direction" class="input-flat w-full">`;
  html += `<option value="">不指定</option>`;
  html += `<option value="top-down">自上而下</option>`;
  html += `<option value="bottom-up">自下而上</option>`;
  html += `</select>`;
  html += `</div>`;
  // 时长
  html += `<div>`;
  html += `<label class="text-xs text-gray-500 mb-1 block">时长</label>`;
  html += `<select id="wp-duration" class="input-flat w-full">`;
  html += `<option value="">不指定</option>`;
  html += `<option value="short">短期</option>`;
  html += `<option value="long">长期</option>`;
  html += `</select>`;
  html += `</div>`;
  html += `</div>`;
  html += `</details>`;

  // 写入按钮
  const btnText = wp.submitting ? '写入中...' : '创建活动';
  const btnDisabled = wp.submitting ? 'opacity-50 cursor-not-allowed' : '';
  html += `<button data-action="wp-submit" class="text-sm px-5 py-2.5 rounded-lg bg-red-700 text-white hover:bg-red-800 transition-colors font-medium ${btnDisabled}">${btnText}</button>`;

  html += `</div>`;
  return html;
}

// ── 事件绑定 ──────────────────────────────────────────────────

function bindWritePanelEvents(container) {
  container.querySelectorAll('[data-action]').forEach(el => {
    el.addEventListener('click', handleWritePanelAction);
  });
}

function handleWritePanelAction(e) {
  const btn = e.currentTarget;
  const action = btn.dataset.action;

  switch (action) {
    case 'select-template': {
      // 2 步式：选择模板后直接进入 Step 2（表单填写）
      wp.selections.L1 = btn.dataset.category;
      wp.selections.L1Sub = btn.dataset.subtype;
      // 兼容旧字段：L2 = 'meeting'（三会一课）/ activityType（主题党日）
      wp.selections.L2 = btn.dataset.activityType || 'meeting';
      // 携带模板色（用于 Step 2 提示条）
      wp.selections._tplColor = btn.dataset.color || '';
      wp.selections._scenarioId = btn.dataset.scenarioId || '';
      wp.step = 2;
      break;
    }

    case 'wp-back': {
      // Step 2 → Step 1（重选模板）
      wp.step = 1;
      // 保留 L1/L1Sub 以便 Step 1 显示选中态
      break;
    }

    case 'wp-submit': {
      handleSubmitActivity();
      return; // 不重新渲染面板
    }

    default:
      return;
  }

  // 重新渲染面板
  const container = document.getElementById('write-form-area');
  if (container) renderWritePanel(container);
}

// ── 写入活动逻辑 ──────────────────────────────────────────────

async function handleSubmitActivity() {
  const dateEl = document.getElementById('wp-date');
  const locationEl = document.getElementById('wp-location');
  const titleEl = document.getElementById('wp-title');
  const descEl = document.getElementById('wp-desc');
  const timeEl = document.getElementById('wp-time');
  const hostEl = document.getElementById('wp-host');
  const directionEl = document.getElementById('wp-direction');
  const durationEl = document.getElementById('wp-duration');

  const date = dateEl?.value?.trim();
  const location = locationEl?.value?.trim();
  const title = titleEl?.value?.trim();
  const desc = descEl?.value?.trim();
  const time = timeEl?.value?.trim() || '';
  const host = hostEl?.value?.trim() || '';
  const direction = directionEl?.value || '';
  const duration = durationEl?.value || '';

  // 校验必填项
  if (!title) { showToast('error', '请填写活动名称'); titleEl?.focus(); return; }
  if (!date) { showToast('error', '请选择日期'); dateEl?.focus(); return; }
  if (!location) { showToast('error', '请填写活动地点'); locationEl?.focus(); return; }

  const scenarioId = wp.selections._scenarioId || wp.getScenarioId?.();
  if (!scenarioId) { showToast('error', '场景信息缺失，请重新选择模板'); return; }

  wp.submitting = true;
  const container = document.getElementById('write-form-area');
  if (container) renderWritePanel(container);

  try {
    const activityData = {
      title,
      type: wp.selections.L1 === 'three-meetings' ? '三会一课' : '主题党日',
      subtype: wp.selections.L1Sub || '',
      status: 'draft',
      visibility: 'branch',
      date,
      targetDate: date,
      time,
      location,
      description: desc || '',
      host: host || '',
      scenarioId,
      domain: 'activity',
      executor: 'secretary',
      supervisor: null,
      createdBy: 'u_sec',
      // 2 步式元数据（替代旧 _dt_L3/L4）
      _dt_L1: wp.selections.L1,
      _dt_L1Sub: wp.selections.L1Sub || '',
      _dt_L2: wp.selections.L2 || '',
      _dt_direction: direction,
      _dt_duration: duration,
    };
    const { taskCount } = await writeActivityWithSOP(activityData, scenarioId, date);
    showToast('success', `活动写入成功，已生成 ${taskCount} 个任务节点`);

    // 4. 渲染工作流可视化面板
    const definitionId = wp.mapToDefinitionId();
    renderWorkflowPanel('secretary-workflow', 'secretary-write', definitionId, title);

    // 5. 重置面板状态
    wp.reset();

    // 5. 刷新活动列表
    try {
      const activities = await BranchService.listActivities();
      setState({ activities });
    } catch (_) { /* 列表刷新失败不影响写入结果*/ }

  } catch (err) {
    console.error('[WritePanel] 写入失败', err);
    const msg = err.type === 'NetworkError' ? '网络连接失败，请稍后重试'
      : err.type === 'PermissionError' ? '权限不足'
      : '写入失败：' + (err.message || '未知错误');
    showToast('error', msg);
    wp.submitting = false;
  }

  // 重新渲染面板（无论成功或失败），重置初始化标记以确保渲染
  if (container) {
    delete container.dataset.panelInit;
    renderWritePanel(container);
  }
}

// ════════════════════════════════════════════════════════════════
//  常设赋权面板
//  功能：设党小组组长 — 选择人员 → 选择党小组 → 确认赋权
//  当前党小组组长列表（只读）
// ════════════════════════════════════════════════════════════════

/** 赋权面板状态 */
const authPanel = {
  open: false,
  selectedPersonId: null,
  selectedGroup: null,
  personPicker: null,
};

/** 党小组列表 */
const PARTY_GROUPS = ['第一党小组', '第二党小组', '第三党小组'];

/** 切换赋权面板展开/收起 */
function toggleAuthPanel(assignArea) {
  authPanel.open = !authPanel.open;
  const btn = document.getElementById('ws-sec-assign-btn');
  if (authPanel.open) {
    if (btn) btn.textContent = '收起面板';
    renderAuthPanel(assignArea);
  } else {
    if (btn) btn.textContent = '设党小组组长';
    const panel = document.getElementById('auth-panel-container');
    if (panel) panel.remove();
    if (authPanel.personPicker) {
      authPanel.personPicker.destroy();
      authPanel.personPicker = null;
    }
  }
}

/** 渲染常设赋权面板 */
function renderAuthPanel(assignArea) {
  const oldPanel = document.getElementById('auth-panel-container');
  if (oldPanel) oldPanel.remove();

  const panel = document.createElement('div');
  panel.id = 'auth-panel-container';
  panel.className = 'rounded-xl p-6 mt-4 bg-white';

  let html = '';

  // 1. 人员选择
  html += `<div class="mb-4">`;
  html += `<label class="text-xs text-gray-500 mb-1.5 block font-medium">选择同志 <span class="text-red-500">*</span></label>`;
  html += `<div id="auth-person-picker-slot"></div>`;
  html += `</div>`;

  // 2. 党小组选择
  html += `<div class="mb-5">`;
  html += `<label class="text-xs text-gray-500 mb-1.5 block font-medium">指定为党小组组长 <span class="text-red-500">*</span></label>`;
  html += `<div class="flex gap-2">`;
  PARTY_GROUPS.forEach(group => {
    const isSelected = authPanel.selectedGroup === group;
    const cls = isSelected
      ? 'text-sm px-4 py-2 rounded-lg font-medium border border-red-200 text-red-700 bg-red-50'
      : 'text-sm px-4 py-2 rounded-lg border border-gray-200 text-gray-600 hover:border-red-200 hover:text-red-500';
    html += `<button data-auth-action="select-group" data-value="${group}" class="${cls}">${group}</button>`;
  });
  html += `</div>`;
  html += `</div>`;

  // 3. 确认按钮
  html += `<button data-auth-action="confirm" class="text-sm px-5 py-2.5 rounded-lg bg-red-700 text-white hover:bg-red-800 transition-colors font-medium">确认设为党小组组长</button>`;

  // ── 分隔线 ──
  html += `<div class="border-t border-gray-100 mt-6 pt-4">`;
  html += `<h4 class="font-title-cn text-sm font-bold text-gray-700 mb-3">当前党小组组长</h4>`;
  html += `<div id="auth-records-list"></div>`;
  html += `</div>`;

  panel.innerHTML = html;
  assignArea.appendChild(panel);

  // 初始化 PersonPicker
  const pickerSlot = document.getElementById('auth-person-picker-slot');
  if (pickerSlot) {
    if (authPanel.personPicker) authPanel.personPicker.destroy();
    authPanel.personPicker = new PersonPicker({
      mode: 'single',
      placeholder: '选择同志',
      accentColor: '#B91C1C',
      onSelect: (ids) => {
        authPanel.selectedPersonId = ids[0] || null;
      },
    });
    if (authPanel.selectedPersonId) {
      authPanel.personPicker.setSelected([authPanel.selectedPersonId]);
    }
    authPanel.personPicker.render(pickerSlot);
  }

  // 绑定事件
  panel.querySelectorAll('[data-auth-action]').forEach(el => {
    el.addEventListener('click', handleAuthAction);
  });

  renderAuthRecords();
}

/** 处理常设赋权面板操作 */
function handleAuthAction(e) {
  const btn = e.currentTarget;
  const action = btn.dataset.authAction;

  switch (action) {
    case 'select-group': {
      authPanel.selectedGroup = btn.dataset.value;
      break;
    }
    case 'confirm': {
      handleConfirmLeader();
      return;
    }
    default:
      return;
  }

  const assignArea = document.getElementById('assign-area');
  if (assignArea) renderAuthPanel(assignArea);
}

/** 确认设为党小组组长 */
function handleConfirmLeader() {
  if (!authPanel.selectedPersonId) {
    showToast('error', '请选择同志');
    return;
  }
  if (!authPanel.selectedGroup) {
    showToast('error', '请选择党小组');
    return;
  }

  // 调用 AuthStore，role='leader', scope='group', scopeRef=党小组名
  const result = AuthStore.authorize(
    AuthStore.getCurrentUser()?.personId,
    authPanel.selectedPersonId,
    'leader',
    { projectId: authPanel.selectedGroup },
  );

  if (result.ok) {
    const person = getPersonById(authPanel.selectedPersonId);
    const personName = person ? person.name : authPanel.selectedPersonId;
    showToast('success', `已将 ${personName} 设为 ${authPanel.selectedGroup} 组长`);

    authPanel.selectedPersonId = null;
    authPanel.selectedGroup = null;

    const assignArea = document.getElementById('assign-area');
    if (assignArea) renderAuthPanel(assignArea);
  } else {
    if (result.id) {
      showToast('warn', '该同志已是该党小组组长');
    } else {
      showToast('error', '设置失败，请检查参数');
    }
  }
}

/** 渲染当前党小组组长列表 */
function renderAuthRecords() {
  const listEl = document.getElementById('auth-records-list');
  if (!listEl) return;

  const allRecords = AuthStore.getAuthorizations();
  const leaderRecords = allRecords.filter(r => r.role === 'leader');

  if (leaderRecords.length === 0) {
    listEl.innerHTML = `<p class="text-xs text-gray-400 text-center py-4">暂无党小组组长记录</p>`;
    return;
  }

  listEl.innerHTML = leaderRecords.map(record => {
    const person = getPersonById(record.targetPersonId);
    const personName = person ? person.name : record.targetPersonId;
    const groupName = record.scopeRef || '未指定';

    return `
      <div class="flex items-center justify-between py-2.5 px-3 rounded-lg bg-white transition-colors group" data-record-id="${record.id}">
        <div class="flex items-center gap-3 min-w-0 flex-1">
          <div class="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 bg-red-50 text-red-700 text-xs font-bold">
            ${personName.charAt(0)}
          </div>
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2 flex-wrap">
              <span class="text-sm font-medium text-gray-700">${personName}</span>
              <span class="text-xs font-medium px-1.5 py-0.5 rounded bg-red-50 text-red-700 border border-red-200">党小组组长</span>
            </div>
            <p class="text-xs text-gray-400 mt-0.5">${groupName} · ${record.authorizedAt}</p>
          </div>
        </div>
        <button data-auth-action="revoke" data-record-id="${record.id}" class="text-xs text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 ml-2 flex-shrink-0 px-2 py-1 rounded hover:bg-red-50">
          撤销
        </button>
      </div>
    `;
  }).join('');

  listEl.querySelectorAll('[data-auth-action="revoke"]').forEach(btn => {
    btn.addEventListener('click', () => {
      const recordId = btn.dataset.recordId;
      const success = AuthStore.revokeAuthorization(recordId);
      if (success) {
        showToast('success', '已撤销党小组组长');
        renderAuthRecords();
      } else {
        showToast('error', '撤销失败');
      }
    });
  });
}

// ════════════════════════════════════════════════════════════════
//  反馈管理 → GitHub Issue 风格反馈管理面板（替代旧 P3-1）
//  功能：草稿审核（通过/驳回） 全部反馈列表 + 导出/清除
// ════════════════════════════════════════════════════════════════

function renderIssueManagement() {
  // ── 草稿审核 ──
  const draftsEl = document.getElementById('issue-drafts-list');
  const draftsCountEl = document.getElementById('issue-drafts-count');
  if (draftsEl) {
    const drafts = IssueStore.getDrafts().filter(d => d.status === 'pending');
    if (draftsCountEl) draftsCountEl.textContent = drafts.length;
    if (drafts.length === 0) {
      draftsEl.innerHTML = '<p class="text-xs text-gray-400">暂无待审核草稿</p>';
    } else {
      draftsEl.innerHTML = drafts.map(d => renderDraftRow(d)).join('');
      bindDraftEvents();
    }
  }

  // ── 全部反馈列表（带派生状态+指派人徽章+筛选） ──
  const listEl = document.getElementById('issue-secretary-list');
  const pillEl = document.getElementById('issue-summary-pill');
  if (listEl) {
    let issues = IssueStore.getAll().filter(i => !i.hidden && !i.mergedInto);
    // 筛选
    const filterStatus = document.getElementById('issue-filter-status')?.value || 'all';
    const filterAssignee = document.getElementById('issue-filter-assignee')?.value || 'all';
    const filterKeyword = (document.getElementById('issue-filter-keyword')?.value || '').trim().toLowerCase();

    const filtered = issues.filter(i => {
      const ds = deriveIssueDisplayState(i);
      if (filterStatus !== 'all') {
        if (filterStatus === 'assigned' && ds.key !== 'assigned') return false;
        if (filterStatus === 'pending-review' && ds.key !== 'pending-review') return false;
        if (filterStatus === 'open' && ds.key !== 'open') return false;
        if (filterStatus === 'closed' && ds.key !== 'closed') return false;
      }
      if (filterAssignee !== 'all') {
        if (filterAssignee === 'unassigned' && i.assignee) return false;
        if (filterAssignee === 'secretary' && i.assigneeRole !== 'secretary') return false;
        if (['org-commissioner', 'prop-commissioner', 'disc-commissioner', 'leader'].includes(filterAssignee) && i.assigneeRole !== filterAssignee) return false;
      }
      if (filterKeyword) {
        const match = (i.title || '').toLowerCase().includes(filterKeyword) || (i.body || '').toLowerCase().includes(filterKeyword);
        if (!match) return false;
      }
      return true;
    });

    // 摘要
    const counts = { open: 0, assigned: 0, 'pending-review': 0, closed: 0 };
    issues.forEach(i => { const ds = deriveIssueDisplayState(i); counts[ds.key] = (counts[ds.key] || 0) + 1; });
    if (pillEl) pillEl.textContent = `${issues.length} 条 · ${counts.open} 开放 · ${counts.assigned} 已指派 · ${counts['pending-review']} 待终审 · ${counts.closed} 已关闭`;

    if (filtered.length === 0) {
      listEl.innerHTML = '<p class="text-xs text-gray-400 text-center py-4">无匹配反馈</p>';
    } else {
      listEl.innerHTML = filtered.map(i => {
        const ds = deriveIssueDisplayState(i);
        const assigneeLabel = i.assigneeRole ? ROLE_LABELS[i.assigneeRole] || i.assigneeRole : null;
        const isReviewUnread = IssueNotify.getSecretaryReviewUnread().includes(i.id);
        return `
          <div class="p-3 rounded-xl bg-white border border-gray-100 hover:border-gray-200 cursor-pointer transition-all" data-issue-action="open-detail" data-issue-id="${i.id}">
            <div class="flex items-center justify-between mb-1">
              <span class="text-xs text-gray-400 font-mono">#${i.number}</span>
              <div class="flex items-center gap-1.5">
                ${isReviewUnread ? '<span class="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">待终审</span>' : ''}
                <span class="text-[10px] px-1.5 py-0.5 rounded-full ${ds.badgeClass}">${ds.label}</span>
                ${assigneeLabel ? `<span class="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600">→${assigneeLabel}</span>` : ''}
              </div>
            </div>
            <p class="text-sm text-gray-800 font-medium">${i.title}</p>
            <div class="text-[10px] text-gray-400 mt-1">${i.submittedBy} · ${i.commentCount || 0} 评论 · ${i.submittedAt}</div>
          </div>
        `;
      }).join('');

      // 绑定点击事件 → 打开详情面板
      listEl.querySelectorAll('[data-issue-action="open-detail"]').forEach(el => {
        el.addEventListener('click', () => {
          _openIssueDetail(el.dataset.issueId);
        });
      });
    }
  }

  // 筛选联动
  ['issue-filter-status', 'issue-filter-assignee', 'issue-filter-keyword'].forEach(id => {
    const el = document.getElementById(id);
    if (el && !el.dataset.bound) {
      el.dataset.bound = '1';
      el.addEventListener(el.tagName === 'INPUT' ? 'input' : 'change', () => renderIssueManagement());
    }
  });

  // 工具按钮
  document.getElementById('btn-export-issues-json')?.addEventListener('click', () => {
    const json = IssueStore.exportJSON();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `feedback-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  });

  document.getElementById('btn-clear-issue-cache')?.addEventListener('click', () => {
    if (confirm('确定清除本地缓存？此操作不影响反馈数据权威源，仅清除浏览器缓存与草稿')) {
      IssueStore.clearCache();
      renderIssueManagement();
    }
  });
}

// ════════════════════════════════════════════════════════════════
//  反馈详情面板（书记视角：指派/状态/评论/隐藏/合并）
//  2026-07-30 新增：点击列表项 → 隐藏列表面板、显示详情面板
// ════════════════════════════════════════════════════════════════

/** 指派目标选项 */
const ASSIGNEE_OPTIONS = [
  { personId: 'u_sec', role: 'secretary', label: '书记处置' },
  { personId: 'u_org_commissioner', role: 'org-commissioner', label: '组织委员' },
  { personId: 'u_prop_commissioner', role: 'prop-commissioner', label: '宣传委员' },
  { personId: 'u_disc_commissioner', role: 'disc-commissioner', label: '纪检委员' },
  { personId: 'u_leader_1', role: 'leader', label: '第一党小组组长' },
  { personId: 'u_leader_2', role: 'leader', label: '第二党小组组长' },
  { personId: 'u_leader_3', role: 'leader', label: '第三党小组组长' },
];

/** 关闭理由选项 */
const CLOSE_REASONS = [
  { value: 'completed', label: '已解决' },
  { value: 'duplicate', label: '重复' },
  { value: 'wontfix', label: '不修复' },
  { value: 'not_planned', label: '暂不计划' },
];

/** 打开详情面板 */
function _openIssueDetail(issueId) {
  const listPanel = document.getElementById('issue-list-panel');
  const detailPanel = document.getElementById('issue-detail-panel');
  if (!listPanel || !detailPanel) return;

  listPanel.classList.add('hidden');
  detailPanel.classList.remove('hidden');
  _renderIssueDetail(issueId);
}

/** 返回列表 */
function _closeIssueDetail() {
  const listPanel = document.getElementById('issue-list-panel');
  const detailPanel = document.getElementById('issue-detail-panel');
  if (listPanel) listPanel.classList.remove('hidden');
  if (detailPanel) detailPanel.classList.add('hidden');
  renderIssueManagement();
}

/** 渲染详情面板 */
function _renderIssueDetail(issueId) {
  const panel = document.getElementById('issue-detail-panel');
  if (!panel) return;

  const issue = IssueStore.getById(issueId);
  if (!issue) {
    panel.innerHTML = '<p class="text-xs text-gray-400 text-center py-8">反馈不存在</p>';
    return;
  }

  // 标记「待终审」已读
  IssueNotify.markSecretaryReviewRead(issueId);

  const ds = deriveIssueDisplayState(issue);
  const assigneeLabel = issue.assigneeRole ? ROLE_LABELS[issue.assigneeRole] || issue.assigneeRole : '未指派';

  let html = `<div class="card rounded-2xl p-6">`;

  // ── Header：返回按钮 + 编号 + 状态徽章 + 操作按钮 ──
  html += `<div class="flex items-center justify-between mb-4">`;
  html += `<div class="flex items-center gap-2">`;
  html += `<button data-detail-action="back" class="text-xs text-gray-400 hover:text-gray-600 transition-colors flex items-center gap-1">`;
  html += icon('chevronLeft', { className: 'w-3.5 h-3.5' });
  html += `返回列表</button>`;
  html += `<span class="text-xs text-gray-400 font-mono">#${issue.number}</span>`;
  html += `</div>`;
  html += `<div class="flex items-center gap-2">`;
  html += `<span class="text-[10px] px-2 py-0.5 rounded-full ${ds.badgeClass}">${ds.label}</span>`;
  if (issue.assignee) {
    html += `<span class="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-600">→${assigneeLabel}</span>`;
  }
  html += `</div></div>`;

  // ── 标题 ──
  html += `<h3 class="text-base font-semibold text-gray-800 mb-2">${issue.title}</h3>`;

  // ── 正文 ──
  if (issue.body) {
    html += `<p class="text-sm text-gray-600 whitespace-pre-wrap mb-4">${issue.body}</p>`;
  }

  // ── 元信息 ──
  html += `<div class="flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-gray-400 mb-4 pb-4 border-b border-gray-100">`;
  html += `<span>范围：${issue.scope || '—'}</span>`;
  html += `<span>类型：${(issue.types || []).join(', ') || '—'}</span>`;
  html += `<span>提交人：${issue.submittedBy || '匿名'}</span>`;
  html += `<span>提交时间：${issue.submittedAt || '—'}</span>`;
  if (issue.closedAt) html += `<span>关闭时间：${issue.closedAt}</span>`;
  html += `</div>`;

  // ── 指派区 ──
  html += `<div class="mb-4 pb-4 border-b border-gray-100">`;
  html += `<div class="flex items-center justify-between mb-2">`;
  html += `<span class="text-xs font-medium text-gray-700">指派</span>`;
  if (issue.status === 'open') {
    html += `<button data-detail-action="show-assign" class="text-[10px] px-2 py-1 rounded bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors">指派</button>`;
  }
  html += `</div>`;
  // 指派历史时间线
  if (issue.dispatchHistory && issue.dispatchHistory.length > 0) {
    html += `<div class="space-y-1">`;
    issue.dispatchHistory.forEach(d => {
      const toLabel = ROLE_LABELS[d.to] || d.to;
      html += `<div class="text-[10px] text-gray-500 flex items-start gap-1">`;
      html += `<span class="text-gray-300">●</span>`;
      html += `<span>${d.at} · ${toLabel}${d.note ? '：' + d.note : ''}</span>`;
      html += `</div>`;
    });
    html += `</div>`;
  } else {
    html += `<p class="text-[10px] text-gray-400">尚未指派</p>`;
  }
  // 指派选择器（默认隐藏）
  html += `<div id="issue-assign-selector" class="hidden mt-2 p-3 rounded-lg bg-blue-50/50 border border-blue-100">`;
  html += `<p class="text-xs text-blue-700 mb-2">选择指派目标</p>`;
  html += `<div class="flex flex-wrap gap-2">`;
  ASSIGNEE_OPTIONS.forEach(opt => {
    const isCurrent = issue.assignee === opt.personId && issue.assigneeRole === opt.role;
    html += `<button data-detail-action="assign" data-assignee-id="${opt.personId}" data-assignee-role="${opt.role}" class="text-[10px] px-2.5 py-1 rounded-lg transition-all ${isCurrent ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:border-blue-300'}">${opt.label}</button>`;
  });
  html += `</div>`;
  html += `<div class="mt-2 flex items-center gap-2">`;
  html += `<input type="text" id="assign-note-input" class="input-flat text-xs flex-1" placeholder="指派备注（选填）">`;
  html += `</div></div>`;
  html += `</div>`;

  // ── 状态操作 ──
  if (issue.status === 'open') {
    html += `<div class="mb-4 pb-4 border-b border-gray-100">`;
    html += `<span class="text-xs font-medium text-gray-700 block mb-2">操作</span>`;
    html += `<div class="flex flex-wrap gap-2">`;
    html += `<button data-detail-action="close" class="text-[10px] px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors">关闭反馈</button>`;
    html += `<button data-detail-action="hide" class="text-[10px] px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors">隐藏</button>`;
    html += `<button data-detail-action="show-merge" class="text-[10px] px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors">合并到…</button>`;
    html += `</div>`;
    // 关闭理由选择器（默认隐藏）
    html += `<div id="issue-close-selector" class="hidden mt-2 p-3 rounded-lg bg-gray-50 border border-gray-200">`;
    html += `<p class="text-xs text-gray-600 mb-2">选择关闭理由</p>`;
    html += `<div class="flex flex-wrap gap-2 mb-2">`;
    CLOSE_REASONS.forEach(r => {
      html += `<button data-detail-action="confirm-close" data-reason="${r.value}" class="text-[10px] px-2.5 py-1 rounded-lg bg-white text-gray-600 border border-gray-200 hover:border-red-300 transition-all">${r.label}</button>`;
    });
    html += `</div>`;
    html += `<input type="text" id="close-note-input" class="input-flat text-xs w-full" placeholder="关闭备注（选填）">`;
    html += `</div>`;
    // 合并选择器（默认隐藏）
    html += `<div id="issue-merge-selector" class="hidden mt-2 p-3 rounded-lg bg-gray-50 border border-gray-200">`;
    html += `<p class="text-xs text-gray-600 mb-2">选择合并目标</p>`;
    const mergeTargets = IssueStore.getAll().filter(i => i.id !== issueId && !i.hidden && !i.mergedInto);
    if (mergeTargets.length > 0) {
      html += `<div class="space-y-1 max-h-32 overflow-y-auto">`;
      mergeTargets.forEach(t => {
        html += `<button data-detail-action="confirm-merge" data-target-id="${t.id}" class="w-full text-left text-xs px-2 py-1.5 rounded-lg hover:bg-gray-100 transition-colors">${t.title} <span class="text-gray-400">#${t.number}</span></button>`;
      });
      html += `</div>`;
    } else {
      html += `<p class="text-[10px] text-gray-400">无可用合并目标</p>`;
    }
    html += `</div>`;
    html += `</div>`;
  } else {
    // 已关闭 → 重新开放
    html += `<div class="mb-4 pb-4 border-b border-gray-100">`;
    html += `<span class="text-xs font-medium text-gray-700 block mb-2">操作</span>`;
    html += `<div class="flex flex-wrap gap-2">`;
    html += `<button data-detail-action="reopen" class="text-[10px] px-3 py-1.5 rounded-lg bg-green-50 text-green-700 hover:bg-green-100 transition-colors">重新开放</button>`;
    html += `</div></div>`;
  }

  // ── 评论时间线 ──
  html += `<div class="mb-4">`;
  html += `<span class="text-xs font-medium text-gray-700 block mb-3">评论与事件</span>`;
  const comments = issue.comments || [];
  if (comments.length === 0) {
    html += `<p class="text-[10px] text-gray-400">暂无评论</p>`;
  } else {
    html += `<div class="space-y-3">`;
    comments.forEach(c => {
      if (c.hidden) return; // 书记可看隐藏评论，但默认不显示
      const kindIcon = c.kind === 'dispatch' ? '→' : c.kind === 'result' ? '✓' : c.kind === 'verdict' ? '★' : '';
      const kindBg = c.kind === 'dispatch' ? 'bg-blue-50' : c.kind === 'result' ? 'bg-green-50' : c.kind === 'verdict' ? 'bg-amber-50' : 'bg-gray-50';
      const authorName = ROLE_LABELS[c.authorRole] || c.author;
      html += `<div class="rounded-lg p-2.5 ${kindBg}">`;
      html += `<div class="flex items-center gap-1.5 mb-1">`;
      html += `<span class="text-[10px] font-medium text-gray-700">${kindIcon} ${authorName}</span>`;
      html += `<span class="text-[10px] text-gray-400">${c.createdAt}</span>`;
      html += `</div>`;
      html += `<p class="text-xs text-gray-600">${c.body}</p>`;
      html += `</div>`;
    });
    html += `</div>`;
  }
  html += `</div>`;

  // ── 评论输入框 ──
  if (issue.status === 'open') {
    html += `<div class="pt-3 border-t border-gray-100">`;
    html += `<div class="flex gap-2">`;
    html += `<input type="text" id="issue-comment-input" class="input-flat text-xs flex-1" placeholder="添加评论…">`;
    html += `<button data-detail-action="add-comment" class="text-[10px] px-3 py-1.5 rounded-lg bg-red-700 text-white hover:bg-red-800 transition-colors">评论</button>`;
    html += `<button data-detail-action="add-verdict" class="text-[10px] px-3 py-1.5 rounded-lg bg-amber-600 text-white hover:bg-amber-700 transition-colors">批复</button>`;
    html += `</div></div>`;
  }

  html += `</div>`;
  panel.innerHTML = html;
  _bindIssueDetailActions(issueId);
}

/** 绑定详情面板操作事件 */
function _bindIssueDetailActions(issueId) {
  const panel = document.getElementById('issue-detail-panel');
  if (!panel) return;

  panel.querySelectorAll('[data-detail-action]').forEach(btn => {
    btn.addEventListener('click', () => {
      const action = btn.dataset.detailAction;
      switch (action) {
        case 'back':
          _closeIssueDetail();
          break;
        case 'show-assign':
          _toggleSubPanel('issue-assign-selector');
          break;
        case 'assign': {
          const note = document.getElementById('assign-note-input')?.value || '';
          IssueStore.assignIssue(issueId, btn.dataset.assigneeId, btn.dataset.assigneeRole, note);
          showToast('success', '指派成功');
          _renderIssueDetail(issueId);
          break;
        }
        case 'close':
          _toggleSubPanel('issue-close-selector');
          break;
        case 'confirm-close': {
          const reason = btn.dataset.reason;
          const note = document.getElementById('close-note-input')?.value || '';
          IssueStore.closeIssue(issueId, reason, note);
          showToast('success', '反馈已关闭');
          _renderIssueDetail(issueId);
          break;
        }
        case 'reopen':
          IssueStore.reopenIssue(issueId);
          showToast('success', '反馈已重新开放');
          _renderIssueDetail(issueId);
          break;
        case 'hide':
          IssueStore.hideIssue(issueId);
          showToast('success', '反馈已隐藏');
          _closeIssueDetail();
          break;
        case 'show-merge':
          _toggleSubPanel('issue-merge-selector');
          break;
        case 'confirm-merge': {
          const targetId = btn.dataset.targetId;
          IssueStore.mergeIssue(issueId, targetId);
          showToast('success', '反馈已合并');
          _closeIssueDetail();
          break;
        }
        case 'add-comment': {
          const body = document.getElementById('issue-comment-input')?.value?.trim();
          if (!body) { showToast('error', '请输入评论内容'); return; }
          const user = AuthStore.getCurrentUser();
          IssueStore.addComment(issueId, user?.personId || 'u_sec', 'secretary', body, 'comment');
          showToast('success', '评论已添加');
          _renderIssueDetail(issueId);
          break;
        }
        case 'add-verdict': {
          const body = document.getElementById('issue-comment-input')?.value?.trim();
          if (!body) { showToast('error', '请输入批复内容'); return; }
          const user = AuthStore.getCurrentUser();
          IssueStore.addComment(issueId, user?.personId || 'u_sec', 'secretary', body, 'verdict');
          showToast('success', '批复已添加');
          _renderIssueDetail(issueId);
          break;
        }
      }
    });
  });
}

/** 切换子面板显隐 */
function _toggleSubPanel(id) {
  const el = document.getElementById(id);
  if (!el) return;
  // 关闭其他子面板
  ['issue-assign-selector', 'issue-close-selector', 'issue-merge-selector'].forEach(pid => {
    if (pid !== id) {
      const other = document.getElementById(pid);
      if (other) other.classList.add('hidden');
    }
  });
  el.classList.toggle('hidden');
}

function renderDraftRow(d) {
  if (d.type === 'new-issue') {
    const p = d.payload;
    return `
      <div class="p-3 rounded-lg bg-white border border-orange-200" data-draft-id="${d.draftId}">
        <div class="flex items-center justify-between mb-1">
          <span class="text-[10px] text-orange-700 font-medium">新建反馈草稿</span>
          <span class="text-[10px] text-gray-500">${d.author} · ${d.createdAt}</span>
        </div>
        <p class="text-sm font-medium text-gray-800">${p.title}</p>
        <p class="text-xs text-gray-600 mt-1 line-clamp-2">${p.body}</p>
        <div class="flex gap-1 mt-2">
          <button class="btn-approve-draft text-[10px] px-2 py-1 rounded bg-green-600 text-white hover:bg-green-700" data-draft-id="${d.draftId}">通过</button>
          <button class="btn-reject-draft text-[10px] px-2 py-1 rounded bg-white border border-red-200 text-red-600 hover:bg-red-50" data-draft-id="${d.draftId}">驳回</button>
        </div>
      </div>
    `;
  }
  if (d.type === 'comment') {
    return `
      <div class="p-3 rounded-lg bg-white border border-blue-200" data-draft-id="${d.draftId}">
        <div class="flex items-center justify-between mb-1">
          <span class="text-[10px] text-blue-700 font-medium">评论草稿 · 目标反馈: ${d.targetIssueId}</span>
          <span class="text-[10px] text-gray-500">${d.author} · ${d.createdAt}</span>
        </div>
        <p class="text-sm text-gray-700">${d.payload.body}</p>
        <div class="flex gap-1 mt-2">
          <button class="btn-approve-draft text-[10px] px-2 py-1 rounded bg-green-600 text-white hover:bg-green-700" data-draft-id="${d.draftId}">通过</button>
          <button class="btn-reject-draft text-[10px] px-2 py-1 rounded bg-white border border-red-200 text-red-600 hover:bg-red-50" data-draft-id="${d.draftId}">驳回</button>
        </div>
      </div>
    `;
  }
  return `<div class="text-xs text-gray-400">未知草稿类型 ${DRAFT_TYPE_LABELS[d.type] || d.type}</div>`;
}

function bindDraftEvents() {
  document.querySelectorAll('.btn-approve-draft').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.draftId;
      IssueStore.approveDraft(id);
      showToast('success', '草稿已通过，已合并至反馈列表');
      renderIssueManagement();
    });
  });
  document.querySelectorAll('.btn-reject-draft').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.draftId;
      const reason = prompt('请输入驳回原因') || '不符合要求';
      IssueStore.rejectDraft(id, reason);
      showToast('info', '草稿已驳回');
      renderIssueManagement();
    });
  });
}

// ════════════════════════════════════════════════════════════════
//  通知发布（党务）
//  功能：书记发布通知（标题+内容+目标受众）+ 已发布通知列表
// ════════════════════════════════════════════════════════════════

const NOTIFICATION_STORAGE_KEY = 'workflowos_notifications';
const NOTIFICATION_AUDIENCES = [
  { value: 'all', label: '全体党员' },
  { value: 'leaders', label: '党小组组长' },
  { value: 'activists', label: '入党积极分子' },
  { value: 'candidates', label: '发展对象' },
];

/** 读取已发布通知 */
function _loadNotifications() {
  try {
    const raw = localStorage.getItem(NOTIFICATION_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (_) { return []; }
}

/** 保存通知列表 */
function _saveNotifications(list) {
  try {
    localStorage.setItem(NOTIFICATION_STORAGE_KEY, JSON.stringify(list));
  } catch (_) { /* 静默降级 */ }
}

/** 渲染通知发布面板（表单 + 列表） */
function renderNotificationPanel() {
  renderNotificationForm();
  renderNotificationList();
}

/** 渲染发布表单 */
function renderNotificationForm() {
  const formArea = document.getElementById('notification-form-area');
  if (!formArea) return;

  let html = '';

  // 通知标题
  html += `<div class="mb-4">`;
  html += `<label class="text-xs text-gray-500 mb-1 block">通知标题 <span class="text-red-500">*</span></label>`;
  html += `<input type="text" id="notif-title" class="input-flat w-full" placeholder="通知标题">`;
  html += `</div>`;

  // 通知内容
  html += `<div class="mb-4">`;
  html += `<label class="text-xs text-gray-500 mb-1 block">通知内容 <span class="text-red-500">*</span></label>`;
  html += `<textarea id="notif-content" rows="4" class="input-flat w-full" placeholder="通知正文"></textarea>`;
  html += `</div>`;

  // 目标受众
  html += `<div class="mb-5">`;
  html += `<label class="text-xs text-gray-500 mb-1.5 block font-medium">目标受众 <span class="text-red-500">*</span></label>`;
  html += `<div class="flex flex-wrap gap-2">`;
  NOTIFICATION_AUDIENCES.forEach(a => {
    html += `<button data-notif-action="select-audience" data-value="${a.value}" class="text-sm px-4 py-2 rounded-lg border border-gray-200 text-gray-600 hover:border-red-200 hover:text-red-500 transition-all">${a.label}</button>`;
  });
  html += `</div>`;
  html += `</div>`;

  // 发布按钮
  html += `<button data-notif-action="publish" class="text-sm px-5 py-2.5 rounded-lg bg-red-700 text-white hover:bg-red-800 transition-colors font-medium">发布通知</button>`;

  formArea.innerHTML = html;

  // 绑定事件
  formArea.querySelectorAll('[data-notif-action]').forEach(el => {
    el.addEventListener('click', handleNotifAction);
  });
}

/** 通知表单状态 */
let _selectedAudience = null;

/** 处理通知面板操作 */
function handleNotifAction(e) {
  const btn = e.currentTarget;
  const action = btn.dataset.notifAction;

  switch (action) {
    case 'select-audience': {
      _selectedAudience = btn.dataset.value;
      // 更新按钮视觉状态
      const formArea = document.getElementById('notification-form-area');
      if (formArea) {
        formArea.querySelectorAll('[data-notif-action="select-audience"]').forEach(b => {
          if (b.dataset.value === _selectedAudience) {
            b.className = 'text-sm px-4 py-2 rounded-lg font-medium border border-red-200 text-red-700 bg-red-50 transition-all';
          } else {
            b.className = 'text-sm px-4 py-2 rounded-lg border border-gray-200 text-gray-600 hover:border-red-200 hover:text-red-500 transition-all';
          }
        });
      }
      break;
    }

    case 'publish': {
      handlePublishNotification();
      break;
    }

    default:
      return;
  }
}

/** 发布通知 */
function handlePublishNotification() {
  const titleEl = document.getElementById('notif-title');
  const contentEl = document.getElementById('notif-content');

  const title = titleEl?.value?.trim();
  const content = contentEl?.value?.trim();

  if (!title) { showToast('error', '请填写通知标题'); titleEl?.focus(); return; }
  if (!content) { showToast('error', '请填写通知内容'); contentEl?.focus(); return; }
  if (!_selectedAudience) { showToast('error', '请选择目标受众'); return; }

  const audience = NOTIFICATION_AUDIENCES.find(a => a.value === _selectedAudience);
  const notifications = _loadNotifications();

  const notification = {
    id: `notif-${Date.now()}`,
    title,
    content,
    audience: _selectedAudience,
    audienceLabel: audience ? audience.label : _selectedAudience,
    publishedAt: new Date().toISOString(),
    publishedBy: '书记',
  };

  notifications.unshift(notification);
  _saveNotifications(notifications);

  showToast('success', `通知「${title}」已发布至${notification.audienceLabel}`);

  // 重置表单
  _selectedAudience = null;
  renderNotificationForm();
  renderNotificationList();
}

/** 渲染已发布通知列表 */
function renderNotificationList() {
  const listArea = document.getElementById('notification-list-area');
  if (!listArea) return;

  const notifications = _loadNotifications();

  if (notifications.length === 0) {
    listArea.innerHTML = '<p class="text-xs text-gray-400 text-center py-6">暂无已发布通知</p>';
    return;
  }

  listArea.innerHTML = notifications.map(n => {
    const dateStr = _fmtDate(n.publishedAt);
    return `
      <div class="py-3 px-4 rounded-xl bg-white transition-colors group" data-notif-id="${n.id}">
        <div class="flex items-center justify-between mb-1">
          <div class="flex items-center gap-2">
            <span class="text-sm font-medium text-gray-800">${n.title}</span>
            <span class="text-[10px] px-1.5 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-200">${n.audienceLabel}</span>
          </div>
          <button data-notif-action="delete" data-notif-id="${n.id}" class="text-xs text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 ml-2 flex-shrink-0 px-2 py-1 rounded hover:bg-red-50">删除</button>
        </div>
        <p class="text-xs text-gray-600 leading-relaxed whitespace-pre-wrap">${n.content}</p>
        <p class="text-[10px] text-gray-400 mt-1.5">${n.publishedBy} · ${dateStr}</p>
      </div>
    `;
  }).join('<div class="border-b border-gray-100"></div>');

  // 绑定删除事件
  listArea.querySelectorAll('[data-notif-action="delete"]').forEach(btn => {
    btn.addEventListener('click', () => {
      const notifId = btn.dataset.notifId;
      const notifications = _loadNotifications().filter(n => n.id !== notifId);
      _saveNotifications(notifications);
      showToast('success', '通知已删除');
      renderNotificationList();
    });
  });
}

registerRenderCallback(renderSecretaryUI);

document.getElementById('month-selector')?.addEventListener('change', e => {
  setState({ displayMonth: e.target.value });
});

loadWorkspaceData({ role: 'secretary', fallbackData: () => loadActivities(), logTag: 'ws-secretary' });
