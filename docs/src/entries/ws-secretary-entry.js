import { getAppState, setState, registerRenderCallback } from '../core/state.js';
import { BranchService } from '../services/runtime.js';
import { _fmtDate, showToast, getBasePath } from '../core/utils.js';
import { populateMonthSelector, renderCalendarByActivities } from '../components/calendar.js';
import { renderInspectorFromState } from '../components/inspector.js';
import { computeSecretaryStats } from '../services/roles.js';
import { AuthStore } from '../services/auth.js';
import { bootstrapPage } from '../core/bootstrap.js';
import { getPersonById, getPersonName, PEOPLE } from '../mock/index.js';
import { ROLE_LABELS, DRAFT_TYPE_LABELS } from '../core/constants.js';
import { TaskForceRecordStore } from '../services/taskforce.js';
import { PersonPicker } from '../components/person-picker.js';
import { openModal, closeModal } from '../components/modal.js';
import { DecisionTreeState, renderWorkflowPanel, writeActivityWithSOP } from '../services/decision-tree.js';
import { IssueStore, deriveIssueDisplayState, IssueNotify } from '../services/issues.js';
import { loadActivities } from '../services/activity.js';
import { loadWorkspaceData } from '../core/data-loader.js';
import { renderQueryView } from '../components/query-view.js';
import { icon } from '../core/icons.js';
import { renderTodoList } from '../components/todo-list.js';
import { renderTabBar } from '../components/tab-bar.js';
import { TodoStore, seedTodos } from '../services/todo.js';
import { loadAttendanceRecords } from '../services/attendance.js';
import { SecretaryOverviewStore, SecretaryTodoDeriver } from '../services/secretary-overview.js';
import { NoticeStore } from '../services/notice.js';

await bootstrapPage({ module: 'workspace' });

// 书记工作台使用固定红色作为强调色
const accent = '#B91C1C';

// ── Tab 切换（renderTabBar 统一架构，分组：工作台/党建/反馈） ──
const SEC_TAB_STORAGE_KEY = 'workflowos_tab_secretary';
let _secTabBar = null;
let _secTabBarInited = false;
let _secCurrentTab = 'todo';

// 各 Tab 内容骨架模板（复用原 HTML 静态容器结构，由 render 函数按需注入）
const SEC_CALENDAR_TAB_HTML = `
  <!-- 统计条（紧凑文本概览） -->
  <div id="secretary-stats" class="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-gray-500 mb-4 py-2 border-b border-gray-100"></div>
  <!-- 活动日历（2026-08-05：「写入活动」并入日历卡片头部，删除原独立活动写入卡片） -->
  <div class="card rounded-2xl p-6 mb-4">
    <div class="flex items-center justify-between mb-4">
      <h3 class="font-title-cn text-base font-semibold text-gray-800">活动日历</h3>
      <button id="ws-sec-write-btn" type="button" class="shrink-0 text-sm px-4 py-2 rounded-lg bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 transition-colors inline-flex items-center gap-1.5">
        ${icon('pencil', { className: 'w-3.5 h-3.5' })}
        写入活动
      </button>
    </div>
    <div id="calendar-view-section" class="grid grid-cols-1 lg:grid-cols-5 gap-4">
      <div class="lg:col-span-3">
        <select id="month-selector" class="input-flat text-xs mb-3"></select>
        <div id="cal-main-grid"></div>
        <div id="calendar-legend" class="mt-3"></div>
      </div>
      <div id="inspector-container" class="lg:col-span-2 rounded-xl bg-gray-50/50 border border-gray-100 p-3">
        <div id="inspector-default" class="text-sm text-gray-400 text-center py-8">点击日期查看活动详情，或点击活动条目直接进入详情</div>
        <div id="inspector-content" class="hidden">
          <h4 id="inspector-date-title" class="text-sm font-bold text-gray-800 mb-3"></h4>
          <div id="inspector-cards"></div>
        </div>
      </div>
    </div>
  </div>
  <!-- 考勤概况（从首页迁移；t5a 就地方案：书记只读监督。2026-08-05：移至日历之后，不再压顶） -->
  <div class="card rounded-xl p-4 mb-4">
    <div class="flex items-center justify-between mb-3">
      <h4 class="font-title-cn text-sm font-bold text-gray-700">考勤概况</h4>
      <button id="secretary-att-detail-toggle" type="button" class="text-xs text-blue-600 hover:text-blue-800 inline-flex items-center gap-1 transition-colors">
        <span id="secretary-att-detail-toggle-text">查看明细</span>
        <svg id="secretary-att-detail-toggle-icon" class="w-3.5 h-3.5 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
      </button>
    </div>
    <div id="secretary-attendance-summary" class="text-sm text-gray-500"><p>暂无考勤数据</p></div>
    <div id="secretary-attendance-detail" class="hidden mt-3 pt-3 border-t border-gray-100"></div>
  </div>
  <!-- 活动查询（默认折叠，点击展开） -->
  <div class="card rounded-2xl">
    <button id="query-toggle" type="button" class="w-full px-6 py-3 text-left flex items-center justify-between hover:bg-gray-50 transition-colors rounded-2xl">
      <span class="font-title-cn text-base font-semibold text-gray-800">活动查询</span>
      <svg id="query-toggle-icon" class="w-4 h-4 text-gray-400 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7"/>
      </svg>
    </button>
    <div id="query-collapsible" class="hidden px-6 pb-6">
      <div id="secretary-query-container"></div>
    </div>
  </div>
`;

const SEC_ASSIGN_TAB_HTML = `
  <div class="card rounded-2xl p-6 mb-6">
    <h3 class="font-title-cn text-base font-semibold text-gray-800 mb-4">常设赋权</h3>
    <p class="text-xs text-gray-500 mb-3">设党小组组长——角色指派靠口头/群聊，系统内设+记录可追溯</p>
    <button id="ws-sec-assign-btn" class="text-sm px-4 py-2 rounded-lg bg-orange-50 text-orange-700 border border-orange-200 hover:bg-orange-100 transition-colors">设党小组组长</button>
    <div id="assign-area"></div>
    <div class="border-t border-gray-100 mt-6 pt-4">
      <h4 class="font-title-cn text-sm font-bold text-gray-700 mb-3">当前党小组组长</h4>
      <div id="assign-leaders-list"></div>
    </div>
  </div>
  <div class="card rounded-2xl p-6">
    <h3 class="font-title-cn text-base font-semibold text-gray-800 mb-4">项目赋权</h3>
    <p class="text-xs text-gray-500 mb-4">为同志赋权项目角色（组织者/深度参与者），赋权后该同志在对应活动/专班中拥有相应权限。</p>
    <div id="project-auth-panel"></div>
  </div>
`;

const SEC_FEEDBACK_TAB_HTML = `
  <!-- 列表面板 -->
  <div id="issue-list-panel" class="card rounded-2xl p-6">
    <div class="flex items-center justify-between mb-4">
      <h3 class="font-title-cn text-base font-semibold text-gray-800">反馈管理</h3>
      <div class="flex items-center gap-2 text-xs">
        <span id="issue-summary-pill" class="px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">0 条</span>
      </div>
    </div>
    <p class="text-xs text-gray-500 mb-4">开源讨论集思广益；书记保留处置权（指派/审核/状态/隐藏/合并）</p>

    <!-- 待审核草稿 -->
    <details class="mb-4 rounded-lg border border-orange-200 bg-orange-50/40" id="issue-drafts-details">
      <summary class="px-3 py-2 cursor-pointer text-sm font-medium text-orange-700 flex items-center justify-between">
        <span>待审核草稿</span>
        <span id="issue-drafts-count" class="text-xs px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-700">0</span>
      </summary>
      <div id="issue-drafts-list" class="px-3 pb-3 space-y-2"></div>
    </details>

    <!-- 筛选条（T-217 §2.5 统一顺序：搜索框 → 筛选器们 → 清除） -->
    <div class="flex flex-wrap items-center gap-2 mb-3">
      <input type="text" id="issue-filter-keyword" class="input-flat text-xs flex-1 min-w-[140px]" placeholder="搜索标题或正文...">
      <select id="issue-filter-status" class="input-flat text-xs w-24">
        <option value="all">全部状态</option>
        <option value="open">开放中</option>
        <option value="assigned">已指派</option>
        <option value="pending-review">待终审</option>
        <option value="closed">已关闭</option>
      </select>
      <select id="issue-filter-assignee" class="input-flat text-xs w-32">
        <option value="all">全部指派</option>
        <option value="unassigned">未指派</option>
        <option value="secretary">书记处置中</option>
        <option value="org-commissioner">组织委员</option>
        <option value="prop-commissioner">宣传委员</option>
        <option value="disc-commissioner">纪检委员</option>
        <option value="leader">党小组组长</option>
      </select>
      <button id="issue-filter-clear" type="button" class="text-xs px-2.5 py-1 rounded bg-white border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors">清除</button>
    </div>

    <!-- 全部反馈 -->
    <div id="issue-secretary-list" class="space-y-2"></div>

    <!-- 工具区 -->
    <div class="pt-3 mt-3 border-t border-gray-100 text-right space-x-2">
      <button id="btn-export-issues-json" class="text-xs px-2 py-1 rounded bg-white border border-gray-200 text-gray-600 hover:bg-gray-50">导出反馈数据</button>
      <button id="btn-clear-issue-cache" class="text-xs px-2 py-1 rounded bg-white border border-gray-200 text-gray-600 hover:bg-gray-50">清除缓存</button>
    </div>
  </div>

  <!-- 详情面板（点击列表项进入，默认 hidden） -->
  <div id="issue-detail-panel" class="hidden"></div>
`;

const SEC_NOTIFICATION_TAB_HTML = `
  <div class="card rounded-2xl p-6 mb-6">
    <h3 class="font-title-cn text-base font-semibold text-gray-800 mb-4">发布通知</h3>
    <div id="notification-form-area"></div>
  </div>
  <div class="card rounded-2xl p-6">
    <h3 class="font-title-cn text-base font-semibold text-gray-800 mb-4">已发布通知</h3>
    <div id="notification-list-area"></div>
  </div>
`;

const SEC_OVERVIEW_TAB_HTML = `
  <div id="secretary-overview-content"></div>
`;

/** 初始化书记 Tab 栏（仅首次构建，state 变化时仅刷新内容） */
function _ensureSecTabBar() {
  const container = document.getElementById('secretary-content');
  if (!container || _secTabBarInited) return;

  _secTabBar = renderTabBar({
    prefix: 'secretary',
    tabs: [
      { id: 'todo', label: '待办', render: () => _renderTodoTabContent(), groupLabel: '工作台' },
      { id: 'overview', label: '全局概况', render: () => _renderOverviewTabContent() },
      { id: 'calendar', label: '活动管理', render: () => _renderCalendarTabContent(getAppState()), groupLabel: '党建' },
      { id: 'assign', label: '赋权管理', render: () => _renderAssignTabContent() },
      { id: 'notification', label: '通知发布', render: () => _renderNotificationTabContent(), groupLabel: '党建' },
      { id: 'feedback', label: '反馈管理', render: () => _renderFeedbackTabContent(), groupLabel: '反馈' },
    ],
    accentColor: { accent, accentRgba: 'rgba(185,28,28,0.10)', accentBorder: 'rgba(185,28,28,0.25)' },
    defaultTab: 'todo',
    extraRightHtml: `<div class="flex items-center gap-2" id="sec-toolbar"></div>`,
    storageKey: SEC_TAB_STORAGE_KEY,
    onTabChange: (tabId) => { _secCurrentTab = tabId; },
  });

  container.innerHTML = _secTabBar.html;
  _secTabBar.bindEvents(container);
  _secTabBarInited = true;
  _secCurrentTab = _secTabBar.currentTab;
}

/** 渲染当前激活 Tab 内容（state 变化时增量刷新） */
function _renderSecCurrentTab(state) {
  if (!_secTabBarInited) return;
  switch (_secCurrentTab) {
    case 'calendar': _renderCalendarTabContent(state); break;
    case 'assign': _renderAssignTabContent(); break;
    case 'feedback': _renderFeedbackTabContent(); break;
    case 'notification': _renderNotificationTabContent(); break;
    case 'overview': _renderOverviewTabContent(); break;
    default: _renderTodoTabContent();
  }
}

function renderSecretaryUI(state) {
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
  _ensureSecTabBar();
  _renderSecCurrentTab(state);
}

// ── 各 Tab 内容渲染（renderTabBar 统一驱动） ─────────────────

/** 待办 tab：双栏（列表+详情） */
function _renderTodoTabContent() {
  _renderTodoContent();
}

/** 全局概况 tab */
function _renderOverviewTabContent() {
  const tc = document.getElementById('secretary-tab-content');
  if (!tc) return;
  if (tc.dataset.currentTab !== 'overview') {
    tc.innerHTML = SEC_OVERVIEW_TAB_HTML;
    tc.dataset.currentTab = 'overview';
  }
  _renderOverviewContent();
}

/** 活动管理 tab：统计条+考勤+日历+写入+查询（增量刷新，写入面板防重渲染） */
function _renderCalendarTabContent(state) {
  const tc = document.getElementById('secretary-tab-content');
  if (!tc) return;
  if (tc.dataset.currentTab !== 'calendar') {
    tc.innerHTML = SEC_CALENDAR_TAB_HTML;
    tc.dataset.currentTab = 'calendar';
  }

  const activities = state.activities || [];
  _ensureBrandFilterBtn(state.filterBrand || false);
  _renderSecretaryStats(activities);
  _renderAttendanceSummary(activities);

  const filterBrand = state.filterBrand || false;
  const displayActivities = filterBrand ? activities.filter(a => a.isBrand) : activities;
  const filteredState = { ...state, activities: displayActivities };
  // 月份一致性：以月份选择器为准（含"默认跟随当前月"规则），避免与 state.displayMonth 分叉
  const displayMonth = populateMonthSelector(displayActivities);
  renderCalendarByActivities(filteredState, displayMonth);
  renderInspectorFromState(filteredState);
  _bindMonthSelector();
  _renderQueryView(displayActivities);
  _bindQueryToggle();

  // 写入活动 → 悬浮表单（T-217 §3：原内联 #write-form-area 迁移至 modal，按钮防重绑定）
  const writeBtn = document.getElementById('ws-sec-write-btn');
  if (writeBtn && !writeBtn.dataset.bound) {
    writeBtn.dataset.bound = '1';
    writeBtn.addEventListener('click', openWriteModal);
  }
}

/** 赋权管理 tab（常设赋权 + 项目赋权，书记 2026-08-02 迁入） */
function _renderAssignTabContent() {
  const tc = document.getElementById('secretary-tab-content');
  if (!tc) return;
  if (tc.dataset.currentTab !== 'assign') {
    tc.innerHTML = SEC_ASSIGN_TAB_HTML;
    tc.dataset.currentTab = 'assign';
    const assignArea = document.getElementById('assign-area');
    document.getElementById('ws-sec-assign-btn')?.addEventListener('click', () => {
      toggleAuthPanel(assignArea);
    });
    _renderProjectAuthPanel();
  }
  _renderAssignLeaders();
  _renderProjectAuthRecords();
}

/** 渲染当前党小组组长列表（默认展示，无需展开面板即可查看） */
function _renderAssignLeaders() {
  const listEl = document.getElementById('assign-leaders-list');
  if (!listEl) return;
  const leaderRecords = AuthStore.getAuthorizations().filter(r => r.role === 'leader');
  if (leaderRecords.length === 0) {
    listEl.innerHTML = '<p class="text-xs text-gray-400 text-center py-4">暂无党小组组长记录</p>';
    return;
  }
  listEl.innerHTML = leaderRecords.map(record => {
    const person = getPersonById(record.targetPersonId);
    const personName = person ? person.name : record.targetPersonId;
    const groupName = record.scopeRef || '未指定';
    return `
      <div class="flex items-center gap-3 py-2.5 px-3 rounded-lg bg-white transition-colors group" data-record-id="${record.id}">
        <div class="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 bg-red-50 text-red-700 text-xs font-bold">${personName.charAt(0)}</div>
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-2 flex-wrap">
            <span class="text-sm font-medium text-gray-700">${personName}</span>
            <span class="text-xs font-medium px-1.5 py-0.5 rounded bg-red-50 text-red-700 border border-red-200">党小组组长</span>
          </div>
          <p class="text-xs text-gray-400 mt-0.5">${groupName} · ${record.authorizedAt}</p>
        </div>
      </div>
    `;
  }).join('');
}

// ── 项目角色赋权（organizer/deep，2026-08-02 自 members.html 迁入书记工作台） ──
/** 项目赋权 PersonPicker 实例（选人规范 §2.2：选择具体人一律用 PersonPicker，可搜索） */
let _projectAuthPicker = null;

/** 渲染项目赋权表单（首次进入 tab 时构建，避免全局刷新丢失输入） */
function _renderProjectAuthPanel() {
  const container = document.getElementById('project-auth-panel');
  if (!container) return;

  const projectRoles = ['organizer', 'deep'];
  // 候选被赋权人：排除支委（支委为常设角色，无需被赋权项目角色）

  container.innerHTML = `
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
      <div>
        <label class="text-xs text-gray-500 mb-1.5 block font-medium">选择被赋权人</label>
        <div id="project-auth-picker-container"></div>
      </div>
      <div>
        <label class="text-xs text-gray-500 mb-1.5 block font-medium">选择项目类型</label>
        <select id="project-type-select" class="input-flat text-xs w-full">
          <option value="activity">活动</option>
          <option value="taskforce">专班</option>
        </select>
      </div>
      <div>
        <label class="text-xs text-gray-500 mb-1.5 block font-medium">选择项目</label>
        <select id="project-id-select" class="input-flat text-xs w-full">
          ${[...loadActivities()].sort((a, b) => (b.date || '').localeCompare(a.date || '')).map(a => `<option value="${a.id}" data-type="activity">${a.title}（${a.date}）</option>`).join('')}
        </select>
      </div>
      <div>
        <label class="text-xs text-gray-500 mb-1.5 block font-medium">选择角色</label>
        <div class="flex gap-3 pt-1">
          ${projectRoles.map(r => `
            <label class="flex items-center gap-2 text-sm">
              <input type="radio" name="project-role" value="${r}" class="project-role-radio">
              <span>${ROLE_LABELS[r] || r}</span>
            </label>
          `).join('')}
        </div>
      </div>
    </div>
    <button id="confirm-project-auth-btn" type="button" class="text-sm px-4 py-2 rounded-lg bg-red-700 text-white hover:bg-red-800 transition-colors">
      确认赋权
    </button>
    <div class="mt-6">
      <h4 class="text-xs font-medium text-gray-600 mb-2">已赋权记录</h4>
      <div id="project-auth-records-list"></div>
    </div>
  `;

  // 选人规范 §2.2：被赋权人选择用 PersonPicker（姓名/学号搜索），替换原 select 罗列人名
  _projectAuthPicker?.destroy();
  const pickerContainer = document.getElementById('project-auth-picker-container');
  _projectAuthPicker = new PersonPicker({
    mode: 'single',
    placeholder: '搜索姓名或学号选择被赋权人',
    filter: p => !AuthStore.isCommissioner(p.role),
    accentColor: accent,
    onSelect: () => {},
  });
  _projectAuthPicker.render(pickerContainer);

  _bindProjectTypeSwitch();
  _bindConfirmProjectAuth();
  _renderProjectAuthRecords();
}

/** 项目类型切换：活动/专班联动项目下拉 */
function _bindProjectTypeSwitch() {
  const typeSelect = document.getElementById('project-type-select');
  const idSelect = document.getElementById('project-id-select');
  if (!typeSelect || !idSelect) return;

  typeSelect.addEventListener('change', () => {
    const type = typeSelect.value;
    if (type === 'activity') {
      idSelect.innerHTML = [...loadActivities()].sort((a, b) => (b.date || '').localeCompare(a.date || '')).map(a => `<option value="${a.id}" data-type="activity">${a.title}（${a.date}）</option>`).join('');
    } else {
      // T223 专班新者在前（createdAt 降序）
      idSelect.innerHTML = TaskForceRecordStore.getAll()
        .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
        .map(tf => `<option value="${tf.id}" data-type="taskforce">${tf.name}</option>`).join('');
    }
  });
}

/** 确认项目赋权（organizer/deep） */
function _bindConfirmProjectAuth() {
  const btn = document.getElementById('confirm-project-auth-btn');
  if (!btn) return;

  btn.addEventListener('click', async () => {
    const personId = (_projectAuthPicker?.getSelected() || [])[0] || '';
    const projectId = document.getElementById('project-id-select')?.value;
    const role = document.querySelector('input[name="project-role"]:checked')?.value;

    if (!personId) { showToast('error', '请选择被赋权人'); return; }
    if (!projectId) { showToast('error', '请选择项目'); return; }
    if (!role) { showToast('error', '请选择角色'); return; }

    const result = await AuthStore.authorize(
      AuthStore.getCurrentUser()?.personId,
      personId,
      role,
      { projectId }
    );

    if (result.ok) {
      showToast('success', '项目角色赋权成功');
      _renderProjectAuthRecords();
    } else if (result.id) {
      showToast('warn', '该同志在此项目已有相同角色赋权');
    } else {
      showToast('error', '赋权失败，您可能无权赋权该角色');
    }
  });
}

/** 渲染项目角色赋权记录（organizer/deep + 撤销） */
function _renderProjectAuthRecords() {
  const listEl = document.getElementById('project-auth-records-list');
  if (!listEl) return;

  const records = AuthStore.getAuthorizations().filter(r =>
    ['organizer', 'deep'].includes(r.role) && r.scopeRef
  );

  if (records.length === 0) {
    listEl.innerHTML = '<p class="text-xs text-gray-400">暂无项目角色赋权记录</p>';
    return;
  }

  listEl.innerHTML = records.map(r => {
    const person = getPersonById(r.targetPersonId);
    const project = loadActivities().find(a => a.id === r.scopeRef) || TaskForceRecordStore.getAll().find(t => t.id === r.scopeRef);
    const projectName = project ? (project.title || project.name) : r.scopeRef;
    const roleLabel = ROLE_LABELS[r.role] || r.role;
    const personName = person?.name || r.targetPersonId;
    return `
      <div class="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50">
        <div>
          <span class="text-sm font-medium text-gray-700">${personName}</span>
          <span class="text-xs text-gray-500 ml-2">${projectName}</span>
          <span class="text-xs px-1.5 py-0.5 rounded ml-2" style="background:#FEE2E2;color:#9B0000;">${roleLabel}</span>
          <span class="text-xs text-gray-400 ml-2">${r.authorizedAt || ''}</span>
        </div>
        <button type="button" class="revoke-project-auth text-xs text-gray-400 hover:text-red-600" data-record-id="${r.id}">撤销</button>
      </div>
    `;
  }).join('');

  listEl.querySelectorAll('.revoke-project-auth').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (await AuthStore.revokeAuthorization(btn.dataset.recordId)) {
        showToast('success', '已撤销赋权');
        _renderProjectAuthRecords();
      }
    });
  });
}

/** 反馈管理 tab */
function _renderFeedbackTabContent() {
  const tc = document.getElementById('secretary-tab-content');
  if (!tc) return;
  if (tc.dataset.currentTab !== 'feedback') {
    tc.innerHTML = SEC_FEEDBACK_TAB_HTML;
    tc.dataset.currentTab = 'feedback';
  }
  renderIssueManagement();
}

/** 通知发布 tab */
function _renderNotificationTabContent() {
  const tc = document.getElementById('secretary-tab-content');
  if (!tc) return;
  if (tc.dataset.currentTab !== 'notification') {
    tc.innerHTML = SEC_NOTIFICATION_TAB_HTML;
    tc.dataset.currentTab = 'notification';
  }
  renderNotificationPanel();
}

// ── 活动管理 tab 子模块 ──────────────────────────────────

/** 统计条：紧凑文本概览（圆点+数字+标签） */
function _renderSecretaryStats(activities) {
  const stats = computeSecretaryStats(activities);
  const statsEl = document.getElementById('secretary-stats');
  if (!statsEl) return;
  const items = [
    { label: '待赋权活动', value: stats.pendingAuth, color: accent },
    { label: '活跃活动', value: stats.activeEvents, color: accent },
    { label: '本月活动', value: stats.monthEvents, color: accent },
    { label: '已赋权记录', value: stats.authGranted, color: accent },
  ];
  statsEl.innerHTML = items.map(s => `
    <span class="inline-flex items-center gap-1.5">
      <span class="inline-block w-1.5 h-1.5 rounded-full" style="background:${s.color};"></span>
      <span class="font-semibold text-gray-700">${s.value}</span>
      <span>${s.label}</span>
    </span>
  `).join('');
}

/** 品牌筛选按钮（Tab 工具栏）——语义：动作按钮表达"切换筛选" */
function _ensureBrandFilterBtn(filterBrand) {
  const toolbar = document.getElementById('sec-toolbar');
  if (!toolbar) return;
  let filterBtn = document.getElementById('brand-filter-btn');
  if (!filterBtn) {
    filterBtn = document.createElement('button');
    filterBtn.id = 'brand-filter-btn';
    filterBtn.className = ' text-sm px-3 py-1.5 rounded-lg transition-colors';
    filterBtn.addEventListener('click', () => {
      setState({ filterBrand: !getAppState().filterBrand });
    });
    toolbar.appendChild(filterBtn);
  }
  filterBtn.style.cssText = filterBrand
    ? 'background:rgba(234,179,8,0.15);color:var(--brand-amber-dark);border:1px solid rgba(234,179,8,0.40);'
    : 'background:rgba(156,163,175,0.10);color:#6B7280;border:1px solid rgba(156,163,175,0.30);';
  filterBtn.textContent = filterBrand ? '显示全部活动' : '只看品牌活动';
}

/** 活动查询视图 */
function _renderQueryView(displayActivities) {
  const queryContainer = document.getElementById('secretary-query-container');
  if (!queryContainer) return;
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
        ${a.type ? `<span class="text-xs px-1.5 py-0.5 rounded-full bg-red-50 text-red-600">${a.type}</span>` : ''}
      </div>
    `,
    emptyMessage: '暂无匹配活动',
    accentColor: '#B91C1C',
    sortKey: 'date',
    sortDir: 'desc',
  });
}

/** 月份选择器事件绑定（防重复） */
function _bindMonthSelector() {
  const sel = document.getElementById('month-selector');
  if (sel && !sel.dataset.bound) {
    sel.dataset.bound = '1';
    sel.addEventListener('change', e => setState({ displayMonth: e.target.value }));
  }
}

/** 活动查询折叠面板绑定（默认折叠，点击展开/收起，防重复） */
function _bindQueryToggle() {
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
}

// ── 考勤概况渲染（从首页迁移） ──
// 考勤概况明细展开状态（t5a：就地展开，跨渲染保持）
let _secAttDetailOpen = false;

function _renderAttendanceSummary(activities) {
  const container = document.getElementById('secretary-attendance-summary');
  if (!container) return;

  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const monthActivities = activities.filter(a => (a.date || '').startsWith(thisMonth) && !a.archived);

  // ── 明细区（就地方案：书记只读监督，不越界处理） ──
  const detailEl = document.getElementById('secretary-attendance-detail');
  if (detailEl) {
    if (monthActivities.length === 0) {
      detailEl.innerHTML = '<p class="text-xs text-gray-400 text-center py-3">本月暂无考勤明细</p>';
    } else {
      const attendanceRecords = loadAttendanceRecords();
      detailEl.innerHTML = monthActivities.map(act => {
        const records = attendanceRecords.filter(r => r.activityId === act.id);
        const present = records.filter(r => r.status === 'present').length;
        const absent = records.filter(r => r.status === 'absent');
        const leave = records.filter(r => r.status === 'leave');
        const total = records.length;
        const rate = total > 0 ? Math.round((present / total) * 100) : 0;
        const rateColor = rate >= 90 ? 'text-green-600' : rate >= 70 ? 'text-orange-600' : 'text-red-600';
        const nameList = (arr, cls) => arr.length
          ? `<span class="${cls}">${arr.map(r => getPersonName(r.personId)).join('、')}</span>`
          : '<span class="text-gray-400">无</span>';
        return `
          <div class="py-2 border-b border-gray-50 last:border-b-0">
            <div class="flex items-center justify-between gap-3">
              <div class="min-w-0">
                <p class="text-sm text-gray-800 truncate">${act.title}</p>
                <p class="text-xs text-gray-400">${_fmtDate(new Date(act.date))} · 出勤 ${present}/${total}</p>
              </div>
              <span class="text-xs font-medium flex-shrink-0 ${rateColor}">${rate}%</span>
            </div>
            <div class="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs">
              <span class="text-gray-500">缺勤：${nameList(absent, 'text-red-500')}</span>
              <span class="text-gray-500">请假：${nameList(leave, 'text-orange-500')}</span>
            </div>
          </div>
        `;
      }).join('');
    }
    detailEl.classList.toggle('hidden', !_secAttDetailOpen);
  }

  // 明细切换按钮（就地方案：查看/收起，不跳纪检工作台）
  const toggleBtn = document.getElementById('secretary-att-detail-toggle');
  const toggleText = document.getElementById('secretary-att-detail-toggle-text');
  const toggleIcon = document.getElementById('secretary-att-detail-toggle-icon');
  const syncToggleUI = () => {
    if (toggleText) toggleText.textContent = _secAttDetailOpen ? '收起明细' : '查看明细';
    if (toggleIcon) toggleIcon.style.transform = _secAttDetailOpen ? 'rotate(180deg)' : 'rotate(0deg)';
  };
  if (toggleBtn) {
    toggleBtn.onclick = () => {
      _secAttDetailOpen = !_secAttDetailOpen;
      detailEl?.classList.toggle('hidden', !_secAttDetailOpen);
      syncToggleUI();
    };
    syncToggleUI();
  }

  if (monthActivities.length === 0) {
    container.innerHTML = '<p class="text-sm text-gray-400">本月暂无考勤数据</p>';
    return;
  }

  const attendanceRecords = loadAttendanceRecords();
  const rows = monthActivities.map(act => {
    const records = attendanceRecords.filter(r => r.activityId === act.id);
    const present = records.filter(r => r.status === 'present').length;
    const absent = records.filter(r => r.status === 'absent').length;
    const leave = records.filter(r => r.status === 'leave').length;
    const total = records.length;
    const rate = total > 0 ? Math.round((present / total) * 100) : 0;
    const rateColor = rate >= 90 ? 'text-green-600' : rate >= 70 ? 'text-orange-600' : 'text-red-600';

    return `
      <div class="flex items-center gap-3 py-2 border-b border-gray-50 last:border-b-0 hover:bg-gray-50 rounded-lg px-2 -mx-2 transition-all duration-200">
        <div class="flex-1 min-w-0">
          <p class="text-sm text-gray-800 truncate">${act.title}</p>
          <p class="text-xs text-gray-400">${_fmtDate(new Date(act.date))}</p>
        </div>
        <div class="flex items-center gap-3 text-xs whitespace-nowrap">
          <span class="text-green-600">出勤 ${present}</span>
          <span class="text-red-500">缺勤 ${absent}</span>
          <span class="text-orange-500">请假 ${leave}</span>
          <span class="font-medium ${rateColor}">${rate}%</span>
        </div>
      </div>
    `;
  });

  container.innerHTML = rows.join('');
}

// ── 全局概况 tab 渲染（T-143 → P.9 进度总览重设计） ─────────────
// 设计初衷（书记 2026-08-02 确认方向后记录）：
//   为什么有全局概况——书记需同步各支委/组长/委员工作进度，形成党支部整体运行态势总览；
//   解决什么问题——书记只看"进行时和未完成"的工作，快速掌握各维度进度与人员参与总体情况；
//   数据选取原则——同一套底层数据统一自动渲染，异常数据标橙并派生为书记待办。
// 重设计要点：单列进度总览，取消 2x2 四色卡片与四色左边条，主体色统一党建红。
function _renderOverviewContent() {
  const container = document.getElementById('secretary-overview-content');
  if (!container) return;

  const data = SecretaryOverviewStore.getOverview();

  // 党员发展各阶段分布（堆叠段条）
  const stages = [
    { label: '积极分子', value: data.inspection.stageCounts.activist,     color: '#94A3B8' },
    { label: '发展对象', value: data.inspection.stageCounts.target,       color: '#38BDF8' },
    { label: '预备党员', value: data.inspection.stageCounts.probationary, color: '#FBBF24' },
    { label: '正式党员', value: data.inspection.stageCounts.full,         color: '#EF4444' },
  ];
  const stageTotal = stages.reduce((s, x) => s + x.value, 0) || 1;

  const metricChips = (metrics) => metrics.map(m => `
    <span class="inline-flex items-center gap-1.5 text-xs">
      <span class="text-gray-500">${m.label}</span>
      <span class="font-medium ${m.alert ? 'text-orange-600' : 'text-gray-800'}">${m.value}</span>
      ${m.alert && m.urge ? `<button type="button" class="sec-urge-btn text-xs px-1.5 py-0.5 rounded-md border border-orange-200 text-orange-600 hover:bg-orange-50 transition-colors" data-urge="${m.urge}">催办</button>` : ''}
      ${m.alert && m.direct ? `<button type="button" class="sec-urge-btn text-xs px-1.5 py-0.5 rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors" data-direct="${m.direct}">直达</button>` : ''}
    </span>
  `).join('');

  const rows = [
    {
      icon: icon('calendarHero', { className: 'w-4 h-4' }),
      title: '考勤与纪律',
      desc: '本月出勤情况',
      rate: data.attendance.attendanceRate,
      rateLabel: '出勤率',
      metrics: [
        { label: '缺勤', value: data.attendance.absentPeople.length ? data.attendance.absentPeople.join('、') : '无', alert: data.attendance.absentPeople.length > 0, urge: 'attendance-absent' },
        { label: '补课未完成', value: data.attendance.makeupPending, alert: data.attendance.makeupPending > 0, urge: 'attendance-makeup' },
      ],
    },
    {
      icon: icon('users', { className: 'w-4 h-4' }),
      title: '发展与考察',
      desc: '党员发展培养阶段分布',
      stages,
      stageTotal,
      metrics: [
        { label: '考察待确认', value: data.inspection.pendingInspections, alert: data.inspection.pendingInspections > 0, urge: 'inspection-pending' },
        { label: '考察超期', value: data.inspection.overdueInspections, alert: data.inspection.overdueInspections > 0, urge: 'inspection-overdue' },
      ],
    },
    {
      icon: icon('flag', { className: 'w-4 h-4' }),
      title: '活动与专班',
      desc: '活动复盘完成情况',
      rate: data.activity.reviewRate,
      rateLabel: '复盘完成率',
      metrics: [
        { label: '进行中活动', value: data.activity.activeActivities },
        { label: '进行中专班', value: data.activity.activeTaskforces },
        { label: '赋权待审批', value: data.activity.pendingAuth, alert: data.activity.pendingAuth > 0, direct: 'assign' },
      ],
    },
    {
      icon: icon('archive', { className: 'w-4 h-4' }),
      title: '宣传与档案',
      desc: '归档完成情况',
      rate: data.propaganda.archiveRate,
      rateLabel: '归档完成率',
      metrics: [
        { label: '待归档', value: data.propaganda.pendingArchive, alert: data.propaganda.pendingArchive > 0, urge: 'archive-pending' },
        { label: '本月通知', value: data.propaganda.noticeCount },
      ],
    },
  ];

  const rateBar = (rate) => `
    <div class="flex items-center gap-3">
      <div class="flex-1 h-2 rounded-full bg-neutral-100 overflow-hidden">
        <div class="h-2 rounded-full transition-all duration-500" style="width:${rate}%;background:${rate >= 90 ? '#16A34A' : rate >= 70 ? '#D97706' : '#EF4444'};"></div>
      </div>
      <span class="text-xs font-medium text-gray-600 w-10 text-right">${rate}%</span>
    </div>
  `;

  const stageBar = `
    <div class="flex items-center gap-3">
      <div class="flex-1 h-2 rounded-full bg-neutral-100 overflow-hidden flex">
        ${stages.map(s => s.value > 0 ? `<div style="width:${(s.value / stageTotal * 100).toFixed(1)}%;background:${s.color};" title="${s.label} ${s.value}人"></div>` : '').join('')}
      </div>
      <div class="flex items-center gap-2.5 flex-wrap justify-end">
        ${stages.map(s => `
          <span class="inline-flex items-center gap-1 text-xs text-gray-600">
            <span class="w-2 h-2 rounded-full" style="background:${s.color};"></span>${s.label} ${s.value}
          </span>
        `).join('')}
      </div>
    </div>
  `;

  container.innerHTML = `
    <div class="space-y-4">
      <div class="text-xs text-gray-500">党支部整体运行态势 · 只看进行时和未完成</div>
      ${rows.map(row => `
        <div class="card rounded-xl p-5">
          <div class="flex items-center gap-2.5 mb-3">
            <span class="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style="background:var(--neutral-100);color:var(--neutral-600);">${row.icon}</span>
            <div>
              <h4 class="font-title-cn text-sm font-bold text-gray-700 leading-tight">${row.title}</h4>
              <p class="text-xs text-gray-400 mt-0.5">${row.desc}</p>
            </div>
          </div>
          ${row.stages ? stageBar : rateBar(row.rate)}
          <div class="mt-3.5 pt-3 border-t border-gray-100 flex flex-wrap gap-x-5 gap-y-1.5">
            ${metricChips(row.metrics)}
          </div>
        </div>
      `).join('')}
    </div>
  `;

  // t5b：催办/直达按钮绑定（就地方案，书记不越界处理——催办通知对应委员/直达本人工作台）
  container.querySelectorAll('.sec-urge-btn[data-urge]').forEach(btn => {
    btn.addEventListener('click', () => _handleUrge(btn.dataset.urge));
  });
  container.querySelectorAll('.sec-urge-btn[data-direct]').forEach(btn => {
    btn.addEventListener('click', () => {
      const tabId = btn.dataset.direct;
      const tabBtn = document.querySelector(`.secretary-tab-btn[data-secretary-tab="${tabId}"]`);
      if (tabBtn) tabBtn.click();
      showToast('info', '已直达赋权管理，请处理待审批赋权');
    });
  });
}

// t5b：催办映射——全局概况异常指标 → 对应委员（现以系统通知+待办落地，未来接入北大学生邮箱发送）
const URGE_MAP = {
  'attendance-absent': {
    role: 'disc-commissioner',
    title: '考勤催办',
    content: '书记提醒：本月存在缺勤记录，请及时核实确认缺勤情况并跟进补课安排。',
    targetModule: 'attendance',
    targetUrl: 'workspace/disc.html',
  },
  'attendance-makeup': {
    role: 'disc-commissioner',
    title: '补课催办',
    content: '书记提醒：本月存在未完成的补课任务，请跟进确认补课完成情况。',
    targetModule: 'attendance',
    targetUrl: 'workspace/disc.html',
  },
  'inspection-pending': {
    role: 'disc-commissioner',
    title: '考察确认催办',
    content: '书记提醒：存在待确认的考察记录，请及时处理。',
    targetModule: 'party',
    targetUrl: 'workspace/disc.html',
  },
  'inspection-overdue': {
    role: 'disc-commissioner',
    title: '考察超期催办',
    content: '书记提醒：存在考察超期记录，请尽快处理。',
    targetModule: 'party',
    targetUrl: 'workspace/disc.html',
  },
  'archive-pending': {
    role: 'prop-commissioner',
    title: '归档催办',
    content: '书记提醒：存在待归档的档案材料，请及时完成归档。',
    targetModule: 'workspace',
    targetUrl: 'workspace/prop.html',
  },
};

function _handleUrge(urgeKey) {
  const cfg = URGE_MAP[urgeKey];
  if (!cfg) return;
  NoticeStore.add({
    title: cfg.title,
    content: cfg.content,
    priority: 'urgent',
    targetModule: cfg.targetModule,
    targetUrl: cfg.targetUrl,
    actionable: true,
    actionRoles: [cfg.role],
    actionTask: cfg.title,
  }, 'secretary');
  const roleLabel = ROLE_LABELS[cfg.role] || cfg.role;
  showToast('success', `已向${roleLabel}发送催办通知`);
}

// ── 待办列表+详情面板（最小三成本原则落地） ───────────────────
let _selectedTodoId = null;

function _renderTodoContent() {
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
          <span class="text-xs px-1.5 py-0.5 rounded-full ${statusColor}">${statusLabel}</span>
          ${todo.priority === 'urgent' ? '<span class="text-xs px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-700">紧急</span>' : ''}
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
      _expandAssignPanelForTodo(todo);
    }
    showToast('info', `已跳转，请处理：${todo.title}`);
  } else {
    showToast('info', `请处理：${todo.title}`);
  }
}

/** t5c：赋权管理 tab 落地后，按待办 scope 自动展开对应赋权面板 */
function _expandAssignPanelForTodo(todo) {
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

function _bindTodoDetailEvents() {
  const container = document.getElementById('secretary-tab-content');
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
 * 两类：三会一课（党建红）/ 主题党日（党建金）
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
    color: '#FFD700',
    bg: 'rgba(255,215,0,0.12)',
    border: 'rgba(255,215,0,0.35)',
    scenarioId: 'theme-party',
    // 主题党日无固定子分类，采用正交维度（Step 2 表单中呈现：共建性质/是否外出/活动载体）
    subtypes: [],
  },
];

// ── 渲染函数 ──────────────────────────────────────────────────

// ── 写入活动悬浮表单（T-217 §3 全悬浮化） ──────────────────
const WRITE_MODAL_ID = 'write-activity';

/** 定位当前悬浮面板内的写入面板容器（悬浮已关闭时返回 null） */
function _getWritePanelContainer() {
  return document.getElementById(`modal-overlay-${WRITE_MODAL_ID}`)?.querySelector('.modal-body') || null;
}

/** 打开「写入活动」悬浮表单：Step1 选模板 → Step2 填表单（含正交维度），重新打开回到 Step1 */
function openWriteModal() {
  openModal({
    id: WRITE_MODAL_ID,
    title: '写入活动',
    width: '720px',
    accentColor: accent,
    onMount: (panel) => {
      // 清理上次会话遗留的 PersonPicker（防 DOM 泄漏）
      if (wp.personPicker) { wp.personPicker.destroy(); wp.personPicker = null; }
      wp.step = 1;
      renderWritePanel(panel.querySelector('.modal-body'));
    },
  });
}

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
    if (tpl.subtypes.length === 0) {
      // 主题党日无固定子类型，直接选择模板（正交维度在 Step 2 表单中填写）
      const isSelected = wp.selections.L1 === tpl.category;
      html += `<button data-action="select-template" data-category="${tpl.category}" data-subtype="" data-scenario-id="${tpl.scenarioId || 'theme-party'}" data-activity-type="" data-color="${tpl.color}" class="w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${isSelected ? 'bg-red-50 text-red-700 font-medium' : 'text-gray-700 hover:bg-gray-50'}">`;
      html += `选择${tpl.categoryLabel}（正交维度在下一步填写）`;
      html += `</button>`;
    } else {
      tpl.subtypes.forEach(sub => {
        const isSelected = wp.selections.L1 === tpl.category && wp.selections.L1Sub === sub.value;
        html += `<button data-action="select-template" data-category="${tpl.category}" data-subtype="${sub.value}" data-scenario-id="${sub.scenarioId}" data-activity-type="${sub.activityType || ''}" data-color="${tpl.color}" class="w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${isSelected ? 'bg-red-50 text-red-700 font-medium' : 'text-gray-700 hover:bg-gray-50'}">`;
        html += sub.label;
        html += `</button>`;
      });
    }
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
  // 三会一课需选子类；主题党日无固定子类
  const sub = tpl.subtypes.find(s => s.value === wp.selections.L1Sub);
  if (tpl.subtypes.length > 0 && !sub) {
    wp.step = 1;
    return renderTemplateStep();
  }

  const scenarioTitle = wp.getScenarioTitle();
  const today = new Date().toISOString().slice(0, 10);

  let html = `<div>`;
  // 已选模板提示
  html += `<div class="mb-4 px-3 py-2 rounded-lg" style="background:${tpl.bg};border:1px solid ${tpl.border};">`;
  html += `<p class="text-xs font-medium" style="color:${tpl.color};">已选模板：${tpl.categoryLabel}${sub ? ' · ' + sub.label : ''}</p>`;
  if (scenarioTitle) {
    html += `<p class="text-[12px] text-gray-500 mt-0.5">SOP 场景：${scenarioTitle}（写入后自动生成任务节点）</p>`;
  }
  html += `</div>`;

  // 标题（必填）
  html += `<div class="mb-3">`;
  html += `<label class="text-xs text-gray-500 mb-1.5 block font-medium">活动名称 <span class="text-red-500">*</span></label>`;
  html += `<input type="text" id="wp-title" class="input-flat w-full" placeholder="活动名称">`;
  html += `</div>`;

  // 日期 + 时间
  html += `<div class="grid grid-cols-2 gap-3 mb-3">`;
  html += `<div>`;
  html += `<label class="text-xs text-gray-500 mb-1.5 block font-medium">日期 <span class="text-red-500">*</span></label>`;
  html += `<input type="date" id="wp-date" value="${today}" class="input-flat w-full">`;
  html += `</div>`;
  html += `<div>`;
  html += `<label class="text-xs text-gray-500 mb-1.5 block font-medium">时间 <span class="text-gray-300">（选填）</span></label>`;
  html += `<input type="text" id="wp-time" class="input-flat w-full" placeholder="如 14:00-16:00">`;
  html += `</div>`;
  html += `</div>`;

  // 地点（必填）
  html += `<div class="mb-3">`;
  html += `<label class="text-xs text-gray-500 mb-1.5 block font-medium">地点 <span class="text-red-500">*</span></label>`;
  html += `<input type="text" id="wp-location" class="input-flat w-full" placeholder="活动地点">`;
  html += `</div>`;

  // 主题党日正交维度（共建性质 / 是否外出 / 活动载体）
  if (tpl.category === 'theme-day') {
    html += renderThemeDayDimensions();
  }

  // 主持人（默认当前用户）
  html += `<div class="mb-3">`;
  html += `<label class="text-xs text-gray-500 mb-1.5 block font-medium">主持人 <span class="text-gray-300">（选填）</span></label>`;
  html += `<input type="text" id="wp-host" class="input-flat w-full" placeholder="默认为当前用户">`;
  html += `</div>`;

  // 备注
  html += `<div class="mb-3">`;
  html += `<label class="text-xs text-gray-500 mb-1.5 block font-medium">备注 <span class="text-gray-300">（选填）</span></label>`;
  html += `<textarea id="wp-desc" rows="2" class="input-flat w-full" placeholder="活动内容/目标等"></textarea>`;
  html += `</div>`;

  // 参与人选择（选填，多选，2026-08-05 与「发布专班招募」表单对齐）
  html += `<div class="mb-3">`;
  html += `<label class="text-xs text-gray-500 mb-1.5 block font-medium">参与人 <span class="text-gray-300">（选填，可多选）</span></label>`;
  html += `<div id="wp-participants-slot"></div>`;
  html += `</div>`;

  // 自动发布通知（选填，2026-08-05 书记裁决「表单内预拟通知·只跑一次」）
  // 自定义折叠（不用原生 details：保证跨浏览器折叠行为一致）
  html += `<div class="mb-4">`;
  html += `<div class="wp-collapse-toggle text-xs text-gray-400 cursor-pointer hover:text-gray-600 select-none" onclick="this.nextElementSibling.classList.toggle('hidden')">自动发布通知（选填，创建活动后立即通知全体成员）</div>`;
  html += `<div class="mt-2 space-y-3">`;
  html += `<div>`;
  html += `<label class="text-xs text-gray-500 mb-1.5 block font-medium">通知标题</label>`;
  html += `<input type="text" id="wp-notice-title" class="input-flat w-full" placeholder="默认使用活动名称">`;
  html += `</div>`;
  html += `<div>`;
  html += `<label class="text-xs text-gray-500 mb-1.5 block font-medium">通知内容</label>`;
  html += `<textarea id="wp-notice-content" rows="3" class="input-flat w-full" placeholder="如：8月20日 14:00 在光华1号楼101报告厅举行暑期实践总结分享，请全体成员准时参加。"></textarea>`;
  html += `</div>`;
  html += `</div>`;
  html += `</div>`;

  // 高级选项（折叠）
  html += `<div class="mb-4">`;
  html += `<div class="wp-collapse-toggle text-xs text-gray-400 cursor-pointer hover:text-gray-600 select-none" onclick="this.nextElementSibling.classList.toggle('hidden')">高级选项（发起方向 / 时长）</div>`;
  html += `<div class="mt-2 grid grid-cols-2 gap-3">`;
  // 发起方向
  html += `<div>`;
  html += `<label class="text-xs text-gray-500 mb-1.5 block font-medium">发起方向</label>`;
  html += `<select id="wp-direction" class="input-flat w-full">`;
  html += `<option value="">不指定</option>`;
  html += `<option value="top-down">自上而下</option>`;
  html += `<option value="bottom-up">自下而上</option>`;
  html += `</select>`;
  html += `</div>`;
  // 时长
  html += `<div>`;
  html += `<label class="text-xs text-gray-500 mb-1.5 block font-medium">时长</label>`;
  html += `<select id="wp-duration" class="input-flat w-full">`;
  html += `<option value="">不指定</option>`;
  html += `<option value="short">短期</option>`;
  html += `<option value="long">长期</option>`;
  html += `</select>`;
  html += `</div>`;
  html += `</div>`;
  html += `</div>`;

  // 写入按钮
  const btnText = wp.submitting ? '写入中...' : '创建活动';
  const btnDisabled = wp.submitting ? 'opacity-50 cursor-not-allowed' : '';
  html += `<button data-action="wp-submit" class="text-sm px-5 py-2.5 rounded-lg bg-red-700 text-white hover:bg-red-800 transition-colors font-medium ${btnDisabled}">${btnText}</button>`;

  html += `</div>`;
  return html;
}

/** 主题党日正交维度字段组（共建性质 / 是否外出 / 活动载体多选） */
function renderThemeDayDimensions() {
  const dims = wp.config?.THEME_PARTY_DIMENSIONS;
  if (!dims) return '';
  let html = `<div class="mb-3 rounded-lg border border-gray-100 bg-gray-50/50 p-3">`;

  // 维度1 共建性质
  html += `<div class="mb-2.5">`;
  html += `<label class="text-xs text-gray-500 mb-1.5 block font-medium">共建性质</label>`;
  html += `<div class="flex gap-2">`;
  dims.isJoint.forEach(opt => {
    html += `<button type="button" data-wp-dim data-wp-group="isJoint" data-wp-dim-value="${opt.value}" data-wp-multi="false" class="wp-dim-chip text-xs px-3 py-1.5 rounded-lg border transition-colors">${opt.label}</button>`;
  });
  html += `</div>`;
  html += `</div>`;

  // 维度2 是否外出
  html += `<div class="mb-2.5">`;
  html += `<label class="text-xs text-gray-500 mb-1.5 block font-medium">是否外出</label>`;
  html += `<div class="flex gap-2">`;
  dims.isOutdoor.forEach(opt => {
    html += `<button type="button" data-wp-dim data-wp-group="isOutdoor" data-wp-dim-value="${opt.value}" data-wp-multi="false" class="wp-dim-chip text-xs px-3 py-1.5 rounded-lg border transition-colors">${opt.label}</button>`;
  });
  html += `</div>`;
  html += `</div>`;

  // 维度3 活动载体（多选）
  html += `<div>`;
  html += `<label class="text-xs text-gray-500 mb-1.5 block font-medium">活动载体 <span class="text-gray-300">（可多选）</span></label>`;
  html += `<div class="flex flex-wrap gap-2">`;
  dims.carriers.forEach(opt => {
    html += `<button type="button" data-wp-dim data-wp-group="carriers" data-wp-dim-value="${opt.value}" data-wp-multi="true" class="wp-dim-chip text-xs px-3 py-1.5 rounded-lg border transition-colors">${opt.label}</button>`;
  });
  html += `</div>`;
  html += `</div>`;

  html += `</div>`;
  return html;
}

function bindWritePanelEvents(container) {
  container.querySelectorAll('[data-action]').forEach(el => {
    el.addEventListener('click', handleWritePanelAction);
  });
  // 参与人选择（PersonPicker 多选；重渲染时保留已选，销毁旧实例防泄漏）
  const participantsSlot = container.querySelector('#wp-participants-slot');
  if (participantsSlot) {
    const prevSelected = wp.personPicker ? wp.personPicker.getSelected() : [];
    if (wp.personPicker) wp.personPicker.destroy();
    wp.personPicker = new PersonPicker({
      mode: 'multi',
      placeholder: '选择参与人（选填）',
      accentColor: '#B91C1C',
      initialIds: prevSelected,
      onSelect: () => {},
    });
    wp.personPicker.render(participantsSlot);
  }
  // 主题党日正交维度按钮（单选组互斥 / 载体多选）
  container.querySelectorAll('[data-wp-dim]').forEach(el => {
    el.addEventListener('click', () => {
      const group = el.dataset.wpGroup;
      const multi = el.dataset.wpMulti === 'true';
      if (multi) {
        el.classList.toggle('wp-dim-on');
      } else {
        container.querySelectorAll(`[data-wp-group="${group}"]`).forEach(o => o.classList.remove('wp-dim-on'));
        el.classList.add('wp-dim-on');
      }
    });
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

  // 重新渲染悬浮面板（T-217 §3：容器改为从悬浮内部定位）
  const container = _getWritePanelContainer();
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

  // 参与人（多选；须在 wp.submitting 触发重渲染前读取）
  const participants = wp.personPicker ? wp.personPicker.getSelected() : [];

  // 预拟通知（选填，2026-08-05 书记裁决「表单内预拟通知·只跑一次」）
  const noticeTitle = document.getElementById('wp-notice-title')?.value?.trim();
  const noticeContent = document.getElementById('wp-notice-content')?.value?.trim();

  // 主题党日正交维度（共建性质 / 是否外出 / 活动载体多选）
  let dimIsJoint = '';
  let dimIsOutdoor = '';
  let dimCarriers = [];
  if (wp.selections.L1 === 'theme-day') {
    const formArea = _getWritePanelContainer();
    if (formArea) {
      const picked = [...formArea.querySelectorAll('[data-wp-dim].wp-dim-on')];
      dimIsJoint = picked.find(o => o.dataset.wpGroup === 'isJoint')?.dataset.wpDimValue || '';
      dimIsOutdoor = picked.find(o => o.dataset.wpGroup === 'isOutdoor')?.dataset.wpDimValue || '';
      dimCarriers = picked.filter(o => o.dataset.wpGroup === 'carriers').map(o => o.dataset.wpDimValue);
    }
  }

  // 校验必填项
  if (!title) { showToast('error', '请填写活动名称'); titleEl?.focus(); return; }
  if (!date) { showToast('error', '请选择日期'); dateEl?.focus(); return; }
  if (!location) { showToast('error', '请填写活动地点'); locationEl?.focus(); return; }

  const scenarioId = wp.selections._scenarioId || wp.getScenarioId?.();
  if (!scenarioId) { showToast('error', '场景信息缺失，请重新选择模板'); return; }

  wp.submitting = true;
  const container = _getWritePanelContainer();
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
      // 主题党日正交维度（业务首类字段，见 DATA_ARCHITECTURE.md §2.1.2）
      isJoint: dimIsJoint,
      isOutdoor: dimIsOutdoor,
      carriers: dimCarriers,
      // 参与人（内联赋权：非空则 createActivity 不再派生组长赋权待办）
      assignments: participants.map(pid => ({ personId: pid, role: 'participant' })),
    };
    const { taskCount } = await writeActivityWithSOP(activityData, scenarioId, date);
    showToast('success', `活动写入成功，已生成 ${taskCount} 个任务节点`);

    // 4. 渲染工作流可视化面板
    const definitionId = wp.mapToDefinitionId();
    renderWorkflowPanel('secretary-workflow', 'secretary-write', definitionId, title);

    // 5. 预拟通知「只跑一次」（2026-08-05）：仅在表单填写了标题时发布一条通知，
    // NoticeStore.add 单次调用，通知→待办仅派生一次，不重复发。
    if (noticeTitle) {
      NoticeStore.add({
        title: noticeTitle,
        content: noticeContent || `请全体成员关注「${title}」，按时参加。`,
        priority: 'normal',
        publishDate: new Date().toISOString().slice(0, 10),
        expireDate: date,
        targetModule: 'activity',
        read: false,
      });
      showToast('success', '已自动发布通知');
    }

    // 6. 重置面板状态
    wp.reset();

    // 7. 清理参与人选择器（防 DOM 泄漏）
    if (wp.personPicker) { wp.personPicker.destroy(); wp.personPicker = null; }

    // 8. 刷新活动列表
    try {
      const activities = await BranchService.listActivities();
      setState({ activities });
    } catch (_) { /* 列表刷新失败不影响写入结果*/ }

    // 9. 成功后关闭悬浮（T-217 §3 全悬浮化）
    closeModal(WRITE_MODAL_ID);

  } catch (err) {
    console.error('[WritePanel] 写入失败', err);
    const msg = err.type === 'NetworkError' ? '网络连接失败，请稍后重试'
      : err.type === 'PermissionError' ? '权限不足'
      : '写入失败：' + (err.message || '未知错误');
    showToast('error', msg);
    wp.submitting = false;
    // 失败：保留悬浮并重新渲染，恢复提交按钮
    const failContainer = _getWritePanelContainer();
    if (failContainer) renderWritePanel(failContainer);
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
async function handleConfirmLeader() {
  if (!authPanel.selectedPersonId) {
    showToast('error', '请选择同志');
    return;
  }
  if (!authPanel.selectedGroup) {
    showToast('error', '请选择党小组');
    return;
  }

  // 调用 AuthStore，role='leader', scope='group', scopeRef=党小组名
  const result = await AuthStore.authorize(
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

/** 渲染当前党小组组长列表（主源 = PEOPLE 预设 role:'leader' + 审计快照运行时授予） */
function renderAuthRecords() {
  const listEl = document.getElementById('auth-records-list');
  if (!listEl) return;

  // 常设组长主源 = PEOPLE role:'leader'（预设）；运行时授予 = 审计快照 role:'leader'
  const presetLeaders = PEOPLE.filter(p => p.role === 'leader');
  const granted = AuthStore.getAuthorizations().filter(r => r.role === 'leader' && r.action !== 'revoke');
  const grantedById = {};
  granted.forEach(g => { grantedById[g.targetPersonId] = g; });
  const grantedUnique = Object.values(grantedById); // 按人去重（grant→revoke→grant 周期后取最新一条）

  const rows = [];
  presetLeaders.forEach(p => {
    rows.push({ person: p, record: null });
  });
  grantedUnique.forEach(g => {
    const person = getPersonById(g.targetPersonId);
    if (!person || person.role !== 'leader') {
      rows.push({ person: person || { id: g.targetPersonId, name: g.targetPersonId }, record: g });
    }
  });

  if (rows.length === 0) {
    listEl.innerHTML = `<p class="text-xs text-gray-400 text-center py-4">暂无党小组组长记录</p>`;
    return;
  }

  listEl.innerHTML = rows.map(({ person, record }) => {
    const personName = person.name || person.targetPersonId;
    const groupName = record ? (record.scopeRef || '未指定') : (person.partyGroup || '未指定');
    const revokeBtn = record
      ? `<button type="button" data-auth-action="revoke" data-record-id="${record.id}" class="text-xs text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 ml-2 flex-shrink-0 px-2 py-1 rounded hover:bg-red-50">撤销</button>`
      : '<span class="text-xs text-gray-300 ml-2 flex-shrink-0">预设</span>';

    return `
      <div class="flex items-center justify-between py-2.5 px-3 rounded-lg bg-white transition-colors group">
        <div class="flex items-center gap-3 min-w-0 flex-1">
          <div class="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 bg-red-50 text-red-700 text-xs font-bold">
            ${personName.charAt(0)}
          </div>
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2 flex-wrap">
              <span class="text-sm font-medium text-gray-700">${personName}</span>
              <span class="text-xs font-medium px-1.5 py-0.5 rounded bg-red-50 text-red-700 border border-red-200">党小组组长</span>
            </div>
            <p class="text-xs text-gray-400 mt-0.5">${groupName}${record ? ' · ' + (record.authorizedAt || '') : ''}</p>
          </div>
        </div>
        ${revokeBtn}
      </div>
    `;
  }).join('');

  listEl.querySelectorAll('[data-auth-action="revoke"]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const recordId = btn.dataset.recordId;
      if (await AuthStore.revokeAuthorization(recordId)) {
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
    // 书记规则（2026-08-01）：带时间字段的列示按提交时间倒序（最新在前）
    let issues = IssueStore.getAll()
      .filter(i => !i.hidden && !i.mergedInto)
      .sort((a, b) => (b.submittedAt || '').localeCompare(a.submittedAt || ''));
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
                ${isReviewUnread ? '<span class="text-xs px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">待终审</span>' : ''}
                <span class="text-xs px-1.5 py-0.5 rounded-full ${ds.badgeClass}">${ds.label}</span>
                ${assigneeLabel ? `<span class="text-xs px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600">→${assigneeLabel}</span>` : ''}
              </div>
            </div>
            <p class="text-sm text-gray-800 font-medium">${i.title}</p>
            <div class="text-xs text-gray-400 mt-1">${getPersonName(i.submittedBy)} · ${i.commentCount || 0} 评论 · ${i.submittedAt}</div>
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

  // 清除筛选（T-217 §2.5）
  const filterClear = document.getElementById('issue-filter-clear');
  if (filterClear && !filterClear.dataset.bound) {
    filterClear.dataset.bound = '1';
    filterClear.addEventListener('click', () => {
      const statusSel = document.getElementById('issue-filter-status');
      const assigneeSel = document.getElementById('issue-filter-assignee');
      const keywordInput = document.getElementById('issue-filter-keyword');
      if (statusSel) statusSel.value = 'all';
      if (assigneeSel) assigneeSel.value = 'all';
      if (keywordInput) keywordInput.value = '';
      renderIssueManagement();
    });
  }

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
  { personId: 'u_org', role: 'org-commissioner', label: '组织委员' },
  { personId: 'u_prop', role: 'prop-commissioner', label: '宣传委员' },
  { personId: 'u_disc', role: 'disc-commissioner', label: '纪检委员' },
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
  html += `<span class="text-xs px-2 py-0.5 rounded-full ${ds.badgeClass}">${ds.label}</span>`;
  if (issue.assignee) {
    html += `<span class="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-600">→${assigneeLabel}</span>`;
  }
  html += `</div></div>`;

  // ── 标题 ──
  html += `<h3 class="text-base font-semibold text-gray-800 mb-2">${issue.title}</h3>`;

  // ── 正文 ──
  if (issue.body) {
    html += `<p class="text-sm text-gray-600 whitespace-pre-wrap mb-4">${issue.body}</p>`;
  }

  // ── 元信息 ──
  html += `<div class="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-400 mb-4 pb-4 border-b border-gray-100">`;
  html += `<span>范围：${issue.scope || '—'}</span>`;
  html += `<span>类型：${(issue.types || []).join(', ') || '—'}</span>`;
  html += `<span>提交人：${getPersonName(issue.submittedBy) || '匿名'}</span>`;
  html += `<span>提交时间：${issue.submittedAt || '—'}</span>`;
  if (issue.closedAt) html += `<span>关闭时间：${issue.closedAt}</span>`;
  html += `</div>`;

  // ── 指派区 ──
  html += `<div class="mb-4 pb-4 border-b border-gray-100">`;
  html += `<div class="flex items-center justify-between mb-2">`;
  html += `<span class="text-xs font-medium text-gray-700">指派</span>`;
  if (issue.status === 'open') {
    html += `<button data-detail-action="show-assign" class="text-xs px-2 py-1 rounded bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors">指派</button>`;
  }
  html += `</div>`;
  // 指派历史时间线
  if (issue.dispatchHistory && issue.dispatchHistory.length > 0) {
    html += `<div class="space-y-1">`;
    issue.dispatchHistory.forEach(d => {
      const toLabel = ROLE_LABELS[d.to] || d.to;
      html += `<div class="text-xs text-gray-500 flex items-start gap-1">`;
      html += `<span class="text-gray-300">●</span>`;
      html += `<span>${d.at} · ${toLabel}${d.note ? '：' + d.note : ''}</span>`;
      html += `</div>`;
    });
    html += `</div>`;
  } else {
    html += `<p class="text-xs text-gray-400">尚未指派</p>`;
  }
  // 指派选择器（默认隐藏）
  html += `<div id="issue-assign-selector" class="hidden mt-2 p-3 rounded-lg bg-blue-50/50 border border-blue-100">`;
  html += `<p class="text-xs text-blue-700 mb-2">选择指派目标</p>`;
  html += `<div class="flex flex-wrap gap-2">`;
  ASSIGNEE_OPTIONS.forEach(opt => {
    const isCurrent = issue.assignee === opt.personId && issue.assigneeRole === opt.role;
    html += `<button data-detail-action="assign" data-assignee-id="${opt.personId}" data-assignee-role="${opt.role}" class="text-xs px-2.5 py-1 rounded-lg transition-all ${isCurrent ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:border-blue-300'}">${opt.label}</button>`;
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
    html += `<button data-detail-action="close" class="text-xs px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors">关闭反馈</button>`;
    html += `<button data-detail-action="hide" class="text-xs px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors">隐藏</button>`;
    html += `<button data-detail-action="show-merge" class="text-xs px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors">合并到…</button>`;
    html += `</div>`;
    // 关闭理由选择器（默认隐藏）
    html += `<div id="issue-close-selector" class="hidden mt-2 p-3 rounded-lg bg-gray-50 border border-gray-200">`;
    html += `<p class="text-xs text-gray-600 mb-2">选择关闭理由</p>`;
    html += `<div class="flex flex-wrap gap-2 mb-2">`;
    CLOSE_REASONS.forEach(r => {
      html += `<button data-detail-action="confirm-close" data-reason="${r.value}" class="text-xs px-2.5 py-1 rounded-lg bg-white text-gray-600 border border-gray-200 hover:border-gray-300 transition-all">${r.label}</button>`;
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
      html += `<p class="text-xs text-gray-400">无可用合并目标</p>`;
    }
    html += `</div>`;
    html += `</div>`;
  } else {
    // 已关闭 → 重新开放
    html += `<div class="mb-4 pb-4 border-b border-gray-100">`;
    html += `<span class="text-xs font-medium text-gray-700 block mb-2">操作</span>`;
    html += `<div class="flex flex-wrap gap-2">`;
    html += `<button data-detail-action="reopen" class="text-xs px-3 py-1.5 rounded-lg bg-green-50 text-green-700 hover:bg-green-100 transition-colors">重新开放</button>`;
    html += `</div></div>`;
  }

  // ── 评论时间线 ──
  html += `<div class="mb-4">`;
  html += `<span class="text-xs font-medium text-gray-700 block mb-3">评论与事件</span>`;
  const comments = issue.comments || [];
  if (comments.length === 0) {
    html += `<p class="text-xs text-gray-400">暂无评论</p>`;
  } else {
    html += `<div class="space-y-3">`;
    comments.forEach(c => {
      if (c.hidden) return; // 书记可看隐藏评论，但默认不显示
      const kindIcon = c.kind === 'dispatch' ? '→' : c.kind === 'result' ? '✓' : c.kind === 'verdict' ? '★' : '';
      const kindBg = c.kind === 'dispatch' ? 'bg-blue-50' : c.kind === 'result' ? 'bg-green-50' : c.kind === 'verdict' ? 'bg-amber-50' : 'bg-gray-50';
      const authorName = ROLE_LABELS[c.authorRole] || c.author;
      html += `<div class="rounded-lg p-2.5 ${kindBg}">`;
      html += `<div class="flex items-center gap-1.5 mb-1">`;
      html += `<span class="text-xs font-medium text-gray-700">${kindIcon} ${authorName}</span>`;
      html += `<span class="text-xs text-gray-400">${c.createdAt}</span>`;
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
    html += `<button data-detail-action="add-comment" class="text-xs px-3 py-1.5 rounded-lg bg-red-700 text-white hover:bg-red-800 transition-colors">评论</button>`;
    html += `<button data-detail-action="add-verdict" class="text-xs px-3 py-1.5 rounded-lg bg-amber-600 text-white hover:bg-amber-700 transition-colors">批复</button>`;
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
          <span class="text-xs text-orange-700 font-medium">新建反馈草稿</span>
          <span class="text-xs text-gray-500">${getPersonName(d.author)} · ${d.createdAt}</span>
        </div>
        <p class="text-sm font-medium text-gray-800">${p.title}</p>
        <p class="text-xs text-gray-600 mt-1 line-clamp-2">${p.body}</p>
        <div class="flex gap-1 mt-2">
          <button class="btn-approve-draft text-xs px-2 py-1 rounded bg-green-600 text-white hover:bg-green-700" data-draft-id="${d.draftId}">通过</button>
          <button class="btn-reject-draft text-xs px-2 py-1 rounded bg-white border border-gray-200 text-gray-600 hover:bg-gray-50" data-draft-id="${d.draftId}">驳回</button>
        </div>
      </div>
    `;
  }
  if (d.type === 'comment') {
    return `
      <div class="p-3 rounded-lg bg-white border border-blue-200" data-draft-id="${d.draftId}">
        <div class="flex items-center justify-between mb-1">
          <span class="text-xs text-blue-700 font-medium">评论草稿 · 目标反馈: ${d.targetIssueId}</span>
          <span class="text-xs text-gray-500">${getPersonName(d.author)} · ${d.createdAt}</span>
        </div>
        <p class="text-sm text-gray-700">${d.payload.body}</p>
        <div class="flex gap-1 mt-2">
          <button class="btn-approve-draft text-xs px-2 py-1 rounded bg-green-600 text-white hover:bg-green-700" data-draft-id="${d.draftId}">通过</button>
          <button class="btn-reject-draft text-xs px-2 py-1 rounded bg-white border border-gray-200 text-gray-600 hover:bg-gray-50" data-draft-id="${d.draftId}">驳回</button>
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
//  通知发布（党建）
//  功能：书记发布通知（标题+内容+目标受众）+ 已发布通知列表
//  数据源：NoticeStore（与首页/全局概况/visitor 同源，消除双数据源脱节）
// ════════════════════════════════════════════════════════════════

const NOTIFICATION_AUDIENCES = [
  { value: 'all', label: '全体党员' },
  { value: 'leaders', label: '党小组组长' },
  { value: 'activists', label: '入党积极分子' },
  { value: 'candidates', label: '发展对象' },
];

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
  html += `<label class="text-xs text-gray-500 mb-1.5 block font-medium">通知标题 <span class="text-red-500">*</span></label>`;
  html += `<input type="text" id="notif-title" class="input-flat w-full" placeholder="通知标题">`;
  html += `</div>`;

  // 通知内容
  html += `<div class="mb-4">`;
  html += `<label class="text-xs text-gray-500 mb-1.5 block font-medium">通知内容 <span class="text-red-500">*</span></label>`;
  html += `<textarea id="notif-content" rows="4" class="input-flat w-full" placeholder="通知正文"></textarea>`;
  html += `</div>`;

  // 目标受众
  html += `<div class="mb-5">`;
  html += `<label class="text-xs text-gray-500 mb-1.5 block font-medium">目标受众 <span class="text-red-500">*</span></label>`;
  html += `<div class="flex flex-wrap gap-2">`;
  NOTIFICATION_AUDIENCES.forEach(a => {
    html += `<button data-notif-action="select-audience" data-value="${a.value}" class="text-sm px-4 py-2 rounded-lg border border-gray-200 text-gray-600 hover:border-gray-300 hover:text-gray-700 transition-all">${a.label}</button>`;
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
            b.className = 'text-sm px-4 py-2 rounded-lg border border-gray-200 text-gray-600 hover:border-gray-300 hover:text-gray-700 transition-all';
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

/** 发布通知（写入 NoticeStore，与首页/全局概况/visitor 同源） */
function handlePublishNotification() {
  const titleEl = document.getElementById('notif-title');
  const contentEl = document.getElementById('notif-content');

  const title = titleEl?.value?.trim();
  const content = contentEl?.value?.trim();

  if (!title) { showToast('error', '请填写通知标题'); titleEl?.focus(); return; }
  if (!content) { showToast('error', '请填写通知内容'); contentEl?.focus(); return; }
  if (!_selectedAudience) { showToast('error', '请选择目标受众'); return; }

  const audience = NOTIFICATION_AUDIENCES.find(a => a.value === _selectedAudience);
  const notification = {
    title,
    content,
    priority: 'normal',
    publishDate: new Date().toISOString().slice(0, 10),
    expireDate: null,
    targetModule: 'workspace',
    read: false,
    audience: _selectedAudience,
    audienceLabel: audience ? audience.label : _selectedAudience,
    publishedBy: '书记',
  };

  NoticeStore.add(notification, 'secretary');

  showToast('success', `通知「${title}」已发布至${notification.audienceLabel}`);

  // 重置表单
  _selectedAudience = null;
  renderNotificationForm();
  renderNotificationList();
}

/** 渲染已发布通知列表（NoticeStore 全部通知，按发布日期倒序） */
function renderNotificationList() {
  const listArea = document.getElementById('notification-list-area');
  if (!listArea) return;

  const notifications = NoticeStore.getAll()
    .sort((a, b) => (b.publishDate || '').localeCompare(a.publishDate || ''));

  if (notifications.length === 0) {
    listArea.innerHTML = '<p class="text-xs text-gray-400 text-center py-6">暂无已发布通知</p>';
    return;
  }

  listArea.innerHTML = notifications.map(n => {
    const audienceLabel = n.audienceLabel || '全体党员';
    // publishDate 为字符串（'2026-07-15'）时直接切片，兼容 Date 对象走 _fmtDate
    const dateStr = n.publishDate
      ? (typeof n.publishDate === 'string' ? n.publishDate.slice(0, 10) : _fmtDate(n.publishDate))
      : '';
    return `
      <div class="py-3 px-4 rounded-xl bg-white transition-colors group cursor-pointer hover:bg-gray-50" data-notif-id="${n.id}" data-notif-row="1" title="查看通知详情">
        <div class="flex items-center justify-between mb-1">
          <div class="flex items-center gap-2">
            <span class="text-sm font-medium text-gray-800">${n.title}</span>
            <span class="text-xs px-1.5 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-200">${audienceLabel}</span>
          </div>
          <button data-notif-action="delete" data-notif-id="${n.id}" class="text-xs text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 ml-2 flex-shrink-0 px-2 py-1 rounded hover:bg-red-50">删除</button>
        </div>
        <p class="text-xs text-gray-600 leading-relaxed whitespace-pre-wrap">${n.content}</p>
        <p class="text-xs text-gray-400 mt-1.5">${n.publishedBy || '书记'} · ${dateStr}</p>
      </div>
    `;
  }).join('<div class="border-b border-gray-100"></div>');

  // 绑定删除事件（NoticeStore 删除联动清理关联待办；stopPropagation 防止误触行跳转）
  listArea.querySelectorAll('[data-notif-action="delete"]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const notifId = btn.dataset.notifId;
      NoticeStore.remove(notifId, 'secretary');
      showToast('success', '通知已删除');
      renderNotificationList();
    });
  });

  // 绑定行点击：预览已发布通知（跳通知详情页，可回退）
  listArea.querySelectorAll('[data-notif-row="1"]').forEach(row => {
    row.addEventListener('click', () => {
      const notifId = row.dataset.notifId;
      window.location.href = `${getBasePath()}notice.html?id=${notifId}`;
    });
  });
}

registerRenderCallback(renderSecretaryUI);

loadWorkspaceData({ role: 'secretary', storeInits: [() => TaskForceRecordStore.init()], extraLoads: [() => BranchService.listTasks()], fallbackData: () => loadActivities(), logTag: 'ws-secretary' });
