import { getAppState, setState, STATE, registerRenderCallback } from '../core/state.js';
import { BranchService } from '../services/runtime.js';
import { _fmtDate, showToast, _currentYearMonth } from '../core/utils.js';
import { populateMonthSelector, renderCalendarByActivities } from '../components/calendar.js';
import { renderInspectorFromState } from '../components/inspector.js';
import { computeSecretaryStats } from '../services/roles.js';
import { AuthStore } from '../services/auth.js';
import { bootstrapPage } from '../core/bootstrap.js';
import { ACTIVITIES, MOCK_TASKFORCES, getPersonById } from '../mock/index.js';
import { mockDB } from '../core/domain.js';
import { ROLE_LABELS } from '../core/constants.js';
import { PersonPicker } from '../components/person-picker.js';
import { DecisionTreeState, DECISION_TREE_CONFIGS, renderWorkflowPanel, writeActivityWithSOP } from '../services/decision-tree.js';
import { FeedbackStore } from '../services/feedback.js';
import { IssueStore } from '../services/issues.js';
import { loadWorkspaceData } from '../core/data-loader.js';
import { renderQueryView } from '../components/query-view.js';
import { icon } from '../core/icons.js';

bootstrapPage({ module: 'workspace' });

// ── Tab 切换 ──
const SEC_TAB_STORAGE_KEY = 'workflowos_tab_secretary';
let _secActiveTab = 'calendar';
let _secTabsBound = false;

function _bindSecTabs() {
  if (_secTabsBound) return;
  _secTabsBound = true;
  const buttons = document.querySelectorAll('.sec-tab-btn');
  const panes = document.querySelectorAll('.sec-tab-pane');
  const accentStyle = '--tab-accent:#B91C1C;--tab-accent-bg:rgba(185,28,28,0.10);--tab-accent-border:rgba(185,28,28,0.25)';

  // 读取 localStorage 记忆的 Tab（优先级：localStorage > 默认 calendar）
  let initialTab = 'calendar';
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
  if (activities.length === 0 && ACTIVITIES.length > 0) {
    const mapped = ACTIVITIES.map(a => ({
      ...a,
      visibility: a.visibility || 'branch',
      executor: a.organizer || 'u_exec',
      supervisor: null,
      createdBy: a.organizer || 'u_exec',
      createdAt: a.date || new Date().toISOString(),
    }));
    setState({ activities: mapped });
    return;
  }

  const stats = computeSecretaryStats(activities);
  const statsEl = document.getElementById('secretary-stats');
  if (statsEl) {
    const items = [
      { label: '待赋权活动', value: stats.pendingAuth, color: '#D97706' },
      { label: '活跃活动', value: stats.activeEvents, color: '#059669' },
      { label: '本月活动', value: stats.monthEvents, color: '#2563EB' },
      { label: '已赋权记录', value: stats.authGranted, color: '#0E7490' },
    ];
    statsEl.innerHTML = items.map(s => `
      <div class="flex-1 card rounded-xl p-4 flex items-center gap-3">
        <div class="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style="background:${s.color}15;">
          <span class="text-lg font-bold" style="color:${s.color};">${s.value}</span>
        </div>
        <p class="text-xs text-gray-500">${s.label}</p>
      </div>
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

  // ── 活动查询视图（容器已在 HTML 中） ──
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
}

// ════════════════════════════════════════════════════════════════
//  决策树引导式写入面板 → D-185 决策实现
//  L1 组织场景 → L2 活动形式 → L3 时长 → L4 发起方向 → 表单
// ════════════════════════════════════════════════════════════════

/** 决策树状态（已迁移至 services/decision-tree.js）*/
const wp = new DecisionTreeState('secretary');
const DECISION_TREE = DECISION_TREE_CONFIGS.secretary;

/** 步骤标签 */
const STEP_LABELS = ['组织场景', '活动形式', '时长', '发起方向', '填写信息'];

// ── 渲染函数 ──────────────────────────────────────────────────

/** 主渲染入口*/
function renderWritePanel(container) {
  let html = '';

  // 步骤指示器
  html += renderStepper();

  // 已选路径摘要（step > 1 时显示）
  if (wp.step > 1) {
    html += `<div class="mb-4 px-3 py-2 rounded-lg">`;
    html += `<p class="text-xs text-gray-500 mb-0.5">已选路径</p>`;
    html += `<p class="text-sm font-medium text-gray-700">${wp.getSelectionPath()}</p>`;
    html += `</div>`;
  }

  // 当前步骤内容
  switch (wp.step) {
    case 1: html += renderStepL1(); break;
    case 2: html += renderStepL2(); break;
    case 3: html += renderStepL3(); break;
    case 4: html += renderStepL4(); break;
    case 5: html += renderStepForm(); break;
  }

  // 返回按钮（step > 1 时显示）
  if (wp.step > 1) {
    html += `<button data-action="wp-back" class="mt-4 text-xs text-gray-400 hover:text-gray-600 transition-colors flex items-center gap-1">`;
    html += icon('chevronLeft', { size: 0, className: 'w-3 h-3' });
    html += `返回上一步</button>`;
  }

  container.innerHTML = html;
  bindWritePanelEvents(container);
}

/** 步骤指示器*/
function renderStepper() {
  let html = `<div class="flex items-center gap-1 mb-5 overflow-x-auto">`;
  STEP_LABELS.forEach((label, i) => {
    const num = i + 1;
    const isActive = num === wp.step;
    const isCompleted = num < wp.step;
    const dotCls = (isActive || isCompleted)
      ? 'w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold bg-red-700 text-white flex-shrink-0'
      : 'w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold bg-gray-200 text-gray-400 flex-shrink-0';
    const labelCls = (isActive || isCompleted) ? 'text-[11px] text-red-700 font-medium whitespace-nowrap' : 'text-[11px] text-gray-400 whitespace-nowrap';
    html += `<div class="flex items-center gap-1">`;
    html += `<div class="${dotCls}">${isCompleted ? '&#10003;' : num}</div>`;
    html += `<span class="${labelCls}">${label}</span>`;
    if (i < STEP_LABELS.length - 1) {
      const lineCls = isCompleted ? 'bg-red-700' : 'bg-gray-200';
      html += `<div class="w-3 h-px ${lineCls} flex-shrink-0"></div>`;
    }
    html += `</div>`;
  });
  html += `</div>`;
  return html;
}

/** L1 组织场景 */
function renderStepL1() {
  let html = `<div>`;
  html += `<p class="text-sm font-medium text-gray-700 mb-3">选择组织场景</p>`;

  DECISION_TREE.L1.forEach(opt => {
    const isSelected = wp.selections.L1 === opt.value;
    const isExpanded = isSelected && opt.hasSub;

    html += `<div class="mb-2">`;
    html += `<button data-action="select-L1" data-value="${opt.value}" class="w-full text-left rounded-xl p-4 transition-all ${isSelected ? 'ring-2 ring-red-200' : ''}">`;
    html += `<div class="flex items-center justify-between">`;
    html += `<div class="flex items-center gap-3">`;
    html += `<div class="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style="background:${opt.iconBg};">`;
    html += `<span class="text-sm font-bold" style="color:${opt.iconColor};">${opt.icon}</span>`;
    html += `</div>`;
    html += `<span class="text-sm font-medium ${isSelected ? 'text-red-700' : 'text-gray-700'}">${opt.label}</span>`;
    html += `</div>`;
    if (opt.hasSub) {
      html += icon('chevronRight', { size: 0, className: `w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}` });
    }
    html += `</div>`;
    html += `</button>`;

    // 三会一课子选项
    if (isExpanded && opt.hasSub) {
      const subs = DECISION_TREE.L1Sub[opt.value] || [];
      html += `<div class="ml-6 mt-2 flex flex-wrap gap-2">`;
      subs.forEach(sub => {
        const isSubSelected = wp.selections.L1Sub === sub.value;
        html += `<button data-action="select-L1Sub" data-value="${sub.value}" class="text-sm px-4 py-2 rounded-lg transition-all ${isSubSelected ? 'text-red-600 border border-red-200 font-medium' : 'text-gray-600 border border-gray-200 hover:border-red-200 hover:text-red-500'}">${sub.label}</button>`;
      });
      html += `</div>`;
    }

    html += `</div>`;
  });

  html += `</div>`;
  return html;
}

/** L2 活动形式 */
function renderStepL2() {
  const options = DECISION_TREE.L2[wp.selections.L1] || [];
  let html = `<div>`;
  html += `<p class="text-sm font-medium text-gray-700 mb-3">选择活动形式</p>`;
  html += `<div class="flex flex-wrap gap-2">`;
  options.forEach(opt => {
    const isSelected = wp.selections.L2 === opt.value;
    const cls = isSelected
      ? `text-sm px-4 py-2 rounded-lg font-medium transition-all`
      : `text-sm px-4 py-2 rounded-lg transition-all`;
    const style = isSelected
      ? `color:${opt.color};border:1px solid ${opt.border};`
      : `color:#4B5563;border:1px solid #E5E7EB;`;
    html += `<button data-action="select-L2" data-value="${opt.value}" class="${cls}" style="${style}">${opt.label}</button>`;
  });
  html += `</div>`;
  html += `</div>`;
  return html;
}

/** L3 时长 */
function renderStepL3() {
  let html = `<div>`;
  html += `<p class="text-sm font-medium text-gray-700 mb-3">选择活动时长</p>`;
  html += `<div class="flex gap-3">`;
  DECISION_TREE.L3.forEach(opt => {
    const isSelected = wp.selections.L3 === opt.value;
    html += `<button data-action="select-L3" data-value="${opt.value}" class="flex-1 text-left rounded-xl p-4 transition-all ${isSelected ? 'ring-2 ring-red-200' : ''}">`;
    html += `<p class="text-sm font-medium ${isSelected ? 'text-red-700' : 'text-gray-700'}">${opt.label}</p>`;
    html += `<p class="text-xs text-gray-400 mt-1">${opt.desc}</p>`;
    html += `</button>`;
  });
  html += `</div>`;
  html += `</div>`;
  return html;
}

/** L4 发起方向 */
function renderStepL4() {
  let html = `<div>`;
  html += `<p class="text-sm font-medium text-gray-700 mb-3">选择发起方向</p>`;
  html += `<div class="flex gap-3">`;
  DECISION_TREE.L4.forEach(opt => {
    const isSelected = wp.selections.L4 === opt.value;
    html += `<button data-action="select-L4" data-value="${opt.value}" class="flex-1 text-left rounded-xl p-4 transition-all ${isSelected ? 'ring-2 ring-red-200' : ''}">`;
    html += `<p class="text-sm font-medium ${isSelected ? 'text-red-700' : 'text-gray-700'}">${opt.label}</p>`;
    html += `<p class="text-xs text-gray-400 mt-1">${opt.desc}</p>`;
    html += `</button>`;
  });
  html += `</div>`;
  html += `</div>`;
  return html;
}

/** Step 5 表单 */
function renderStepForm() {
  const scenarioTitle = wp.getScenarioTitle();
  const today = new Date().toISOString().slice(0, 10);

  let html = `<div>`;
  // SOP 场景提示
  if (scenarioTitle) {
    html += `<div class="mb-4 px-3 py-2 rounded-lg">`;
    html += `<p class="text-xs text-blue-600 font-medium">SOP 场景：${scenarioTitle}</p>`;
    html += `<p class="text-xs text-blue-400 mt-0.5">写入后将自动生成对应任务节点</p>`;
    html += `</div>`;
  }

  html += `<div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">`;

  // T-0 日期（必填）
  html += `<div>`;
  html += `<label class="text-xs text-gray-500 mb-1 block">T-0 日期 <span class="text-red-500">*</span></label>`;
  html += `<input type="date" id="wp-date" value="${today}" class="input-flat w-full">`;
  html += `</div>`;

  // 活动地点（必填）
  html += `<div>`;
  html += `<label class="text-xs text-gray-500 mb-1 block">活动地点 <span class="text-red-500">*</span></label>`;
  html += `<input type="text" id="wp-location" class="input-flat w-full" placeholder="活动地点">`;
  html += `</div>`;

  html += `</div>`;

  // 活动名称（必填）
  html += `<div class="mb-4">`;
  html += `<label class="text-xs text-gray-500 mb-1 block">活动名称 <span class="text-red-500">*</span></label>`;
  html += `<input type="text" id="wp-title" class="input-flat w-full" placeholder="活动名称">`;
  html += `</div>`;

  // 活动描述（选填）
  html += `<div class="mb-5">`;
  html += `<label class="text-xs text-gray-500 mb-1 block">活动描述 <span class="text-gray-300">（选填）</span></label>`;
  html += `<textarea id="wp-desc" rows="3" class="input-flat w-full" placeholder="简要描述活动内容、目标等"></textarea>`;
  html += `</div>`;

  // 写入按钮
  const btnText = wp.submitting ? '写入中...' : '写入活动';
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
    case 'select-L1': {
      const val = btn.dataset.value;
      if (wp.selections.L1 !== val) {
        // 切换 L1 时清除后续选择
        wp.selections.L1 = val;
        wp.selections.L1Sub = null;
        wp.selections.L2 = null;
        wp.selections.L3 = null;
        wp.selections.L4 = null;
      }
      // 主题党日无子选项，直接进入 L2
      if (val === 'theme-day') {
        wp.step = 2;
      }
      // 三会一课需要选子选项，停留在 L1
      break;
    }

    case 'select-L1Sub': {
      const val = btn.dataset.value;
      wp.selections.L1Sub = val;
      wp.selections.L2 = null;
      wp.selections.L3 = null;
      wp.selections.L4 = null;
      // 三会一课只有会议"一种形式，自动选择并进入 L3
      if (wp.selections.L1 === 'three-meetings') {
        wp.selections.L2 = 'meeting';
        wp.step = 3;
      }
      break;
    }

    case 'select-L2': {
      wp.selections.L2 = btn.dataset.value;
      wp.selections.L3 = null;
      wp.selections.L4 = null;
      wp.step = 3;
      break;
    }

    case 'select-L3': {
      wp.selections.L3 = btn.dataset.value;
      wp.selections.L4 = null;
      wp.step = 4;
      break;
    }

    case 'select-L4': {
      wp.selections.L4 = btn.dataset.value;
      wp.step = 5;
      break;
    }

    case 'wp-back': {
      if (wp.step > 1) {
        wp.step--;
        // 回退时清除当前步骤及后续的选择
        if (wp.step < 5) { /* form fields are ephemeral */ }
        if (wp.step < 4) wp.selections.L4 = null;
        if (wp.step < 3) wp.selections.L3 = null;
        if (wp.step < 2) { wp.selections.L2 = null; wp.selections.L1Sub = null; }
      }
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

  const date = dateEl?.value?.trim();
  const location = locationEl?.value?.trim();
  const title = titleEl?.value?.trim();
  const desc = descEl?.value?.trim();

  // 校验必填项
  if (!date) { showToast('error', '请填写 T-0 日期'); dateEl?.focus(); return; }
  if (!location) { showToast('error', '请填写活动地点'); locationEl?.focus(); return; }
  if (!title) { showToast('error', '请填写活动名称'); titleEl?.focus(); return; }

  const scenarioId = wp.getScenarioId();
  if (!scenarioId) { showToast('error', '场景信息缺失，请重新选择'); return; }

  wp.submitting = true;
  const container = document.getElementById('write-form-area');
  if (container) renderWritePanel(container);

  try {
    const activityData = {
      title,
      type: wp.selections.L1 === 'three-meetings' ? '三会一课' : '主题党日',
      status: 'draft',
      visibility: 'branch',
      date,
      targetDate: date,
      location,
      description: desc || '',
      scenarioId,
      domain: 'activity',
      executor: 'secretary',
      supervisor: null,
      createdBy: 'u_sec',
      // 决策树元数据
      _dt_L1: wp.selections.L1,
      _dt_L1Sub: wp.selections.L1Sub || '',
      _dt_L2: wp.selections.L2 || '',
      _dt_L3: wp.selections.L3 || '',
      _dt_L4: wp.selections.L4 || '',
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
//  issue 管理 → GitHub Issue 风格反馈管理面板（替代旧 P3-1）
//  功能：草稿审核（通过/驳回） 全部 issue 列表 + 导出/清除
// ════════════════════════════════════════════════════════════════

function renderIssueManagement() {
  // 渲染待审核草稿
  const draftsEl = document.getElementById('issue-drafts-list');
  if (draftsEl) {
    const drafts = IssueStore.getDrafts().filter(d => d.status === 'pending');
    if (drafts.length === 0) {
      draftsEl.innerHTML = '<p class="text-xs text-gray-400">暂无待审核草稿</p>';
    } else {
      draftsEl.innerHTML = drafts.map(d => renderDraftRow(d)).join('');
      bindDraftEvents();
    }
  }

  // 渲染全部 issue
  const listEl = document.getElementById('issue-secretary-list');
  if (listEl) {
    const issues = IssueStore.getAll();
    if (issues.length === 0) {
      listEl.innerHTML = '<p class="text-xs text-gray-400">暂无 issue</p>';
    } else {
      listEl.innerHTML = issues.map(i => `
        <div class="p-2 rounded-lg bg-white">
          <div class="flex items-center justify-between">
            <span class="text-xs text-gray-400 font-mono">#${i.number}</span>
            <span class="text-[10px] px-1.5 py-0.5 rounded-full ${i.status === 'open' ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}">${i.status}</span>
          </div>
          <p class="text-sm text-gray-700 mt-1">${i.title}</p>
          <div class="text-[10px] text-gray-400 mt-1">${i.submittedBy} · ${i.commentCount || 0} 评论 · ${i.submittedAt}</div>
        </div>
      `).join('');
    }
  }

  // 工具按钮
  document.getElementById('btn-export-issues-json')?.addEventListener('click', () => {
    const json = IssueStore.exportJSON();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `issues-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  });

  document.getElementById('btn-clear-issue-cache')?.addEventListener('click', () => {
    if (confirm('确定清除本地缓存？此操作不影响 issues.json 权威源，仅清除浏览器缓存与草稿')) {
      IssueStore.clearCache();
      renderIssueManagement();
    }
  });
}

function renderDraftRow(d) {
  if (d.type === 'new-issue') {
    const p = d.payload;
    return `
      <div class="p-3 rounded-lg bg-white border border-orange-200" data-draft-id="${d.draftId}">
        <div class="flex items-center justify-between mb-1">
          <span class="text-[10px] text-orange-700 font-medium">新建 issue 草稿</span>
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
          <span class="text-[10px] text-blue-700 font-medium">评论草稿 · 目标 issue: ${d.targetIssueId}</span>
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
  return `<div class="text-xs text-gray-400">未知草稿类型 ${d.type}</div>`;
}

function bindDraftEvents() {
  document.querySelectorAll('.btn-approve-draft').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.draftId;
      IssueStore.approveDraft(id);
      showToast('success', '草稿已通过，已合并至 issue 列表');
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

loadWorkspaceData({ role: 'secretary', fallbackData: () => ACTIVITIES, logTag: 'ws-secretary' });
