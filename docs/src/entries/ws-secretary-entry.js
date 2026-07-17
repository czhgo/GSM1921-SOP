import { getAppState, setState, STATE, registerRenderCallback } from '../core/state.js';
import { BranchService } from '../services/runtime.js';
import { _fmtDate, showToast, _currentYearMonth } from '../core/utils.js';
import { populateMonthSelector, renderCalendarByActivities } from '../components/calendar.js';
import { renderInspectorFromState } from '../components/inspector.js';
import { computeSecretaryStats } from '../services/roles.js';
import { AuthStore } from '../services/auth.js';
import { bootstrapPage } from '../core/bootstrap.js';
import { ACTIVITIES, MOCK_TASKFORCES, getPersonById } from '../mock/index.js';
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
      filterBtn.className = 'font-stheiti text-xs px-3 py-1.5 rounded-lg transition-colors';
      filterBtn.addEventListener('click', () => {
        setState({ filterBrand: !filterBrand });
      });
      toolbar.appendChild(filterBtn);
    }
    filterBtn.style.cssText = filterBrand
      ? 'background:rgba(234,179,8,0.15);color:var(--brand-amber-dark);border:1px solid rgba(234,179,8,0.40);'
      : 'background:rgba(156,163,175,0.10);color:#6B7280;border:1px solid rgba(156,163,175,0.30);';
    filterBtn.textContent = filterBrand ? '🔥品牌活动（筛选中）' : '🔥品牌活动';
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
        <div class="flex items-center justify-between p-3 rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors">
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
      <p class="text-xs text-gray-500 mb-3">书记可对活动进行赋权操作，将活动分配给对应角色</p>
      <button id="ws-sec-assign-btn" class="text-sm px-4 py-2 rounded-lg bg-orange-50 text-orange-700 border border-orange-200 hover:bg-orange-100 transition-colors">赋权管理</button>
    `;
    assignArea.querySelector('#ws-sec-assign-btn')?.addEventListener('click', () => {
      toggleAuthPanel(assignArea);
    });
  }

  // ── issue 管理（GitHub Issue 风格，替代旧 P3-1 反馈管理）──
  renderIssueManagement();
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
    html += `<div class="mb-4 px-3 py-2 rounded-lg bg-gray-100 border border-gray-100">`;
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
    html += `<button data-action="select-L1" data-value="${opt.value}" class="w-full text-left bg-white rounded-xl p-4 transition-all ${isSelected ? 'ring-2 ring-red-200 bg-red-50/50' : 'hover:bg-gray-50'}">`;
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
        html += `<button data-action="select-L1Sub" data-value="${sub.value}" class="text-sm px-4 py-2 rounded-lg transition-all ${isSubSelected ? 'bg-red-50 text-red-600 border border-red-200 font-medium' : 'bg-white text-gray-600 border border-gray-200 hover:border-red-200 hover:text-red-500'}">${sub.label}</button>`;
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
      ? `background:${opt.bg};color:${opt.color};border:1px solid ${opt.border};`
      : `background:white;color:#4B5563;border:1px solid #E5E7EB;`;
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
    html += `<button data-action="select-L3" data-value="${opt.value}" class="flex-1 text-left bg-white rounded-xl p-4 transition-all ${isSelected ? 'ring-2 ring-red-200 bg-red-50/50' : 'hover:bg-gray-50'}">`;
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
    html += `<button data-action="select-L4" data-value="${opt.value}" class="flex-1 text-left bg-white rounded-xl p-4 transition-all ${isSelected ? 'ring-2 ring-red-200 bg-red-50/50' : 'hover:bg-gray-50'}">`;
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
    html += `<div class="mb-4 px-3 py-2 rounded-lg bg-blue-50 border border-blue-100">`;
    html += `<p class="text-xs text-blue-600 font-medium">SOP 场景：${scenarioTitle}</p>`;
    html += `<p class="text-xs text-blue-400 mt-0.5">写入后将自动生成对应任务节点</p>`;
    html += `</div>`;
  }

  html += `<div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">`;

  // T-0 日期（必填）
  html += `<div>`;
  html += `<label class="text-xs text-gray-500 mb-1 block">T-0 日期 <span class="text-red-500">*</span></label>`;
  html += `<input type="date" id="wp-date" value="${today}" class="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:border-red-300 focus:ring-1 focus:ring-red-200 outline-none transition-all">`;
  html += `</div>`;

  // 活动地点（必填）
  html += `<div>`;
  html += `<label class="text-xs text-gray-500 mb-1 block">活动地点 <span class="text-red-500">*</span></label>`;
  html += `<input type="text" id="wp-location" class="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:border-red-300 focus:ring-1 focus:ring-red-200 outline-none transition-all" placeholder="活动地点">`;
  html += `</div>`;

  html += `</div>`;

  // 活动名称（必填）
  html += `<div class="mb-4">`;
  html += `<label class="text-xs text-gray-500 mb-1 block">活动名称 <span class="text-red-500">*</span></label>`;
  html += `<input type="text" id="wp-title" class="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:border-red-300 focus:ring-1 focus:ring-red-200 outline-none transition-all" placeholder="活动名称">`;
  html += `</div>`;

  // 活动描述（选填）
  html += `<div class="mb-5">`;
  html += `<label class="text-xs text-gray-500 mb-1 block">活动描述 <span class="text-gray-300">（选填）</span></label>`;
  html += `<textarea id="wp-desc" rows="3" class="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:border-red-300 focus:ring-1 focus:ring-red-200 outline-none transition-all resize-none" placeholder="简要描述活动内容、目标等"></textarea>`;
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
//  赋权管理面板 → P0-4
//  功能：PersonPicker 选择人员 → 角色选择 → 范围选择 → 关联选择 → 确认赋权
//  赋权记录列表：展示当前所有赋权记录，支持撤销
// ════════════════════════════════════════════════════════════════

/** 赋权面板状态*/
const authPanel = {
  open: false,
  selectedPersonId: null,
  role: null,        // 'organizer' | 'deep'
  scope: null,       // 'activity' | 'taskforce'
  scopeRef: null,    // 关联活动/专班 ID
  personPicker: null,
};

/** 可赋权角色选项 */
const AUTH_ROLE_OPTIONS = [
  { value: 'organizer', label: '组织者', desc: '负责活动/专班的策划与执行统筹', color: '#06B6D4', bg: 'rgba(6,182,212,0.08)', border: 'rgba(6,182,212,0.25)' },
  { value: 'deep', label: '深度参与者', desc: '承担具体工作任务的骨干成员', color: '#10B981', bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.25)' },
];

/** 赋权范围选项 */
const AUTH_SCOPE_OPTIONS = [
  { value: 'activity', label: '活动', desc: '赋权范围覆盖指定活动', color: '#0E7490' },
  { value: 'taskforce', label: '专班', desc: '赋权范围覆盖指定专班', color: '#B45309' },
];

/** 切换赋权面板展开/收起 */
function toggleAuthPanel(assignArea) {
  authPanel.open = !authPanel.open;
  const btn = document.getElementById('ws-sec-assign-btn');
  if (authPanel.open) {
    if (btn) btn.textContent = '收起面板';
    renderAuthPanel(assignArea);
  } else {
    if (btn) btn.textContent = '赋权管理';
    const panel = document.getElementById('auth-panel-container');
    if (panel) panel.remove();
    // 销毁 PersonPicker
    if (authPanel.personPicker) {
      authPanel.personPicker.destroy();
      authPanel.personPicker = null;
    }
  }
}

/** 渲染赋权管理面板 */
function renderAuthPanel(assignArea) {
  // 移除旧面板
  const oldPanel = document.getElementById('auth-panel-container');
  if (oldPanel) oldPanel.remove();

  const panel = document.createElement('div');
  panel.id = 'auth-panel-container';
  panel.className = 'bg-gray-100 rounded-xl p-6 mt-4 border border-gray-100';

  // ── 赋权表单 ──
  let html = '';

  // 1. 人员选择
  html += `<div class="mb-4">`;
  html += `<label class="text-xs text-gray-500 mb-1.5 block font-medium">选择被赋权同志<span class="text-red-500">*</span></label>`;
  html += `<div id="auth-person-picker-slot"></div>`;
  html += `</div>`;

  // 2. 角色选择
  html += `<div class="mb-4">`;
  html += `<label class="text-xs text-gray-500 mb-1.5 block font-medium">赋权角色 <span class="text-red-500">*</span></label>`;
  html += `<div class="flex gap-3">`;
  AUTH_ROLE_OPTIONS.forEach(opt => {
    const isSelected = authPanel.role === opt.value;
    html += `<button data-auth-action="select-role" data-value="${opt.value}" class="flex-1 text-left bg-white rounded-xl p-3 transition-all ${isSelected ? 'ring-2 ring-red-200 bg-red-50/50' : 'hover:bg-gray-50'}">`;
    html += `<p class="text-sm font-medium ${isSelected ? 'text-red-700' : 'text-gray-700'}">${opt.label}</p>`;
    html += `<p class="text-xs text-gray-400 mt-0.5">${opt.desc}</p>`;
    html += `</button>`;
  });
  html += `</div>`;
  html += `</div>`;

  // 3. 赋权范围
  html += `<div class="mb-4">`;
  html += `<label class="text-xs text-gray-500 mb-1.5 block font-medium">赋权范围 <span class="text-red-500">*</span></label>`;
  html += `<div class="flex gap-3">`;
  AUTH_SCOPE_OPTIONS.forEach(opt => {
    const isSelected = authPanel.scope === opt.value;
    html += `<button data-auth-action="select-scope" data-value="${opt.value}" class="flex-1 text-left bg-white rounded-xl p-3 transition-all ${isSelected ? 'ring-2 ring-red-200 bg-red-50/50' : 'hover:bg-gray-50'}">`;
    html += `<p class="text-sm font-medium ${isSelected ? 'text-red-700' : 'text-gray-700'}">${opt.label}</p>`;
    html += `<p class="text-xs text-gray-400 mt-0.5">${opt.desc}</p>`;
    html += `</button>`;
  });
  html += `</div>`;
  html += `</div>`;

  // 4. 关联活动/专班选择器（根据 scope 动态渲染）
  if (authPanel.scope === 'activity') {
    html += `<div class="mb-4">`;
    html += `<label class="text-xs text-gray-500 mb-1.5 block font-medium">关联活动 <span class="text-red-500">*</span></label>`;
    html += `<select id="auth-scope-ref" class="input-flat text-xs w-full">`;
    html += `<option value="">请选择活动</option>`;
    ACTIVITIES.forEach(a => {
      const selected = authPanel.scopeRef === a.id ? ' selected' : '';
      html += `<option value="${a.id}"${selected}>${a.title}（${a.date}）</option>`;
    });
    html += `</select>`;
    html += `</div>`;
  } else if (authPanel.scope === 'taskforce') {
    html += `<div class="mb-4">`;
    html += `<label class="text-xs text-gray-500 mb-1.5 block font-medium">关联专班 <span class="text-red-500">*</span></label>`;
    html += `<select id="auth-scope-ref" class="input-flat text-xs w-full">`;
    html += `<option value="">请选择专班</option>`;
    MOCK_TASKFORCES.forEach(tf => {
      const selected = authPanel.scopeRef === tf.id ? ' selected' : '';
      html += `<option value="${tf.id}"${selected}>${tf.name}（${tf.status}）</option>`;
    });
    html += `</select>`;
    html += `</div>`;
  }

  // 5. 确认赋权按钮
  html += `<button data-auth-action="confirm" class="text-sm px-5 py-2.5 rounded-lg bg-red-700 text-white hover:bg-red-800 transition-colors font-medium">确认赋权</button>`;

  // ── 分隔线──
  html += `<div class="border-t border-gray-100 mt-6 pt-4">`;
  html += `<h4 class="font-title-cn text-sm font-bold text-gray-700 mb-3">赋权记录</h4>`;
  html += `<div id="auth-records-list"></div>`;
  html += `</div>`;

  panel.innerHTML = html;
  assignArea.appendChild(panel);

  // ── 初始化 PersonPicker ──
  const pickerSlot = document.getElementById('auth-person-picker-slot');
  if (pickerSlot) {
    // 销毁旧实例
    if (authPanel.personPicker) {
      authPanel.personPicker.destroy();
    }
    authPanel.personPicker = new PersonPicker({
      mode: 'single',
      placeholder: '选择被赋权同志',
      accentColor: '#B91C1C',
      onSelect: (ids) => {
        authPanel.selectedPersonId = ids[0] || null;
      },
    });
    // 如果已有选中，恢复
    if (authPanel.selectedPersonId) {
      authPanel.personPicker.setSelected([authPanel.selectedPersonId]);
    }
    authPanel.personPicker.render(pickerSlot);
  }

  // ── 绑定事件 ──
  panel.querySelectorAll('[data-auth-action]').forEach(el => {
    el.addEventListener('click', handleAuthAction);
  });

  // scope-ref select 变更
  const scopeRefSelect = document.getElementById('auth-scope-ref');
  if (scopeRefSelect) {
    scopeRefSelect.addEventListener('change', (e) => {
      authPanel.scopeRef = e.target.value || null;
    });
  }

  // ── 渲染赋权记录列表 ──
  renderAuthRecords();
}

/** 处理赋权面板操作 */
function handleAuthAction(e) {
  const btn = e.currentTarget;
  const action = btn.dataset.authAction;

  switch (action) {
    case 'select-role': {
      authPanel.role = btn.dataset.value;
      break;
    }
    case 'select-scope': {
      const newScope = btn.dataset.value;
      if (authPanel.scope !== newScope) {
        authPanel.scope = newScope;
        authPanel.scopeRef = null; // 切换范围时清空关联选择
      }
      break;
    }
    case 'confirm': {
      handleConfirmAuth();
      return; // 不重新渲染面板
    }
    default:
      return;
  }

  // 重新渲染面板（保留状态）
  const assignArea = document.getElementById('assign-area');
  if (assignArea) renderAuthPanel(assignArea);
}

/** 确认赋权 */
function handleConfirmAuth() {
  // 读取 scopeRef（从 select 中获取最新值）
  const scopeRefEl = document.getElementById('auth-scope-ref');
  if (scopeRefEl) authPanel.scopeRef = scopeRefEl.value || null;

  // 校验
  if (!authPanel.selectedPersonId) {
    showToast('error', '请选择被赋权同志');
    return;
  }
  if (!authPanel.role) {
    showToast('error', '请选择赋权角色');
    return;
  }
  if (!authPanel.scope) {
    showToast('error', '请选择赋权范围');
    return;
  }
  if (!authPanel.scopeRef) {
    const scopeLabel = authPanel.scope === 'activity' ? '活动' : '专班';
    showToast('error', `请选择关联${scopeLabel}`);
    return;
  }

  // 调用 AuthStore
  const result = AuthStore.authorize(
    AuthStore.getCurrentUser()?.personId,
    authPanel.selectedPersonId,
    authPanel.role,
    { projectId: authPanel.scopeRef },
  );

  if (result.ok) {
    const person = getPersonById(authPanel.selectedPersonId);
    const personName = person ? person.name : authPanel.selectedPersonId;
    const roleLabel = ROLE_LABELS[authPanel.role] || authPanel.role;
    showToast('success', `已为 ${personName} 赋予 ${roleLabel} 角色`);

    // 重置表单（保留面板打开）
    authPanel.selectedPersonId = null;
    authPanel.role = null;
    authPanel.scope = null;
    authPanel.scopeRef = null;

    // 重新渲染面板
    const assignArea = document.getElementById('assign-area');
    if (assignArea) renderAuthPanel(assignArea);
  } else {
    if (result.id) {
      showToast('warn', '该同志在此范围已有相同角色赋权');
    } else {
      showToast('error', '赋权失败，请检查参数');
    }
  }
}

/** 渲染赋权记录列表 */
function renderAuthRecords() {
  const listEl = document.getElementById('auth-records-list');
  if (!listEl) return;

  const records = AuthStore.getAuthorizations();

  if (records.length === 0) {
    listEl.innerHTML = `<p class="text-xs text-gray-400 text-center py-4">暂无赋权记录</p>`;
    return;
  }

  listEl.innerHTML = records.map(record => {
    const person = getPersonById(record.targetPersonId);
    const personName = person ? person.name : record.targetPersonId;
    const roleLabel = ROLE_LABELS[record.role] || record.role;
    const scopeLabel = record.scope === 'activity' ? '活动' : '专班';

    // 关联对象名称
    let scopeRefName = '';
    if (record.scope === 'activity') {
      const act = ACTIVITIES.find(a => a.id === record.scopeRef);
      scopeRefName = act ? act.title : record.scopeRef || '未关联';
    } else if (record.scope === 'taskforce') {
      const tf = MOCK_TASKFORCES.find(t => t.id === record.scopeRef);
      scopeRefName = tf ? tf.name : record.scopeRef || '未关联';
    }

    // 角色颜色
    const roleOpt = AUTH_ROLE_OPTIONS.find(o => o.value === record.role);
    const roleColor = roleOpt ? roleOpt.color : '#6B7280';
    const roleBg = roleOpt ? roleOpt.bg : 'rgba(107,114,128,0.08)';
    const roleBorder = roleOpt ? roleOpt.border : 'rgba(107,114,128,0.20)';

    return `
      <div class="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-gray-50 transition-colors group" data-record-id="${record.id}">
        <div class="flex items-center gap-3 min-w-0 flex-1">
          <div class="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 bg-gray-100 text-gray-600 text-xs font-bold">
            ${personName.charAt(0)}
          </div>
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2 flex-wrap">
              <span class="text-sm font-medium text-gray-700">${personName}</span>
              <span class="text-xs font-medium px-1.5 py-0.5 rounded" style="background:${roleBg};color:${roleColor};border:1px solid ${roleBorder};">${roleLabel}</span>
              <span class="text-[11px] text-gray-400">${scopeLabel}</span>
            </div>
            <p class="text-xs text-gray-400 mt-0.5 truncate">${scopeRefName} · ${record.authorizedAt}</p>
          </div>
        </div>
        <button data-auth-action="revoke" data-record-id="${record.id}" class="text-xs text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 ml-2 flex-shrink-0 px-2 py-1 rounded hover:bg-red-50">
          撤销
        </button>
      </div>
    `;
  }).join('');

  // 绑定撤销事件
  listEl.querySelectorAll('[data-auth-action="revoke"]').forEach(btn => {
    btn.addEventListener('click', () => {
      const recordId = btn.dataset.recordId;
      const success = AuthStore.revokeAuthorization(recordId);
      if (success) {
        showToast('success', '已撤销赋权');
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
        <div class="p-2 rounded-lg border border-gray-100 hover:bg-gray-50">
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
      <div class="p-3 rounded-lg bg-orange-50 border border-orange-200" data-draft-id="${d.draftId}">
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
      <div class="p-3 rounded-lg bg-blue-50 border border-blue-200" data-draft-id="${d.draftId}">
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

registerRenderCallback(renderSecretaryUI);

document.getElementById('month-selector')?.addEventListener('change', e => {
  setState({ displayMonth: e.target.value });
});

loadWorkspaceData({ role: 'secretary', fallbackData: () => ACTIVITIES, logTag: 'ws-secretary' });
