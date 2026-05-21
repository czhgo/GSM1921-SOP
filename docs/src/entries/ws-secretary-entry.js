import { getAppState, setState, STATE, registerRenderCallback } from '../core/state.js';
import { BranchService } from '../services/runtime.js';
import { _fmtDate, showToast, _currentYearMonth } from '../core/utils.js';
import { populateMonthSelector, renderCalendarByActivities } from '../components/calendar.js';
import { renderInspectorFromState } from '../components/inspector.js';
import { CrossPageState } from '../core/cross-page-state.js';
import { renderSidebar } from '../components/sidebar.js';
import { renderHeader } from '../components/header.js';
import { computeSecretaryStats } from '../services/roles.js';
import { ViewModeStore, AuthStore } from '../services/auth.js';
import { ACTIVITIES } from '../mock/index.js';
import { MOCK_TASKFORCES } from '../mock/taskforces.js';
import { PEOPLE } from '../mock/people.js';
import { ROLE_LABELS } from '../core/constants.js';
import { PersonPicker } from '../components/person-picker.js';
import { sopDatabase } from '../workflow/sopData.js';
import { instantiateSOP } from '../workflow/sop.js';
import { renderWorkflow } from '../workflow/renderer.js';
import { FeedbackStore } from '../services/feedback.js';

renderSidebar('workspace');
renderHeader('workspace');

const savedState = CrossPageState.load();
AuthStore.setActiveRole('workspace', savedState.selectedRole || 'secretary');
if (savedState.stance) AuthStore.setPrimaryRole(savedState.stance);
ViewModeStore.setMode('workspace', 'manage');

function renderSecretaryUI(state) {
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
      { label: '已赋权记录', value: stats.authGranted, color: '#7C3AED' },
    ];
    statsEl.innerHTML = items.map(s => `
      <div class="card rounded-xl p-4 flex items-center gap-3">
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

  // 品牌筛选按钮
  const inspectorContainer = document.getElementById('inspector-container');
  if (inspectorContainer && !document.getElementById('brand-filter-btn')) {
    const filterBtn = document.createElement('button');
    filterBtn.id = 'brand-filter-btn';
    filterBtn.className = 'font-stheiti text-xs px-3 py-1.5 rounded-lg transition-colors mb-3';
    filterBtn.style.cssText = filterBrand
      ? 'background:rgba(234,179,8,0.15);color:#B45309;border:1px solid rgba(234,179,8,0.40);'
      : 'background:rgba(156,163,175,0.10);color:#6B7280;border:1px solid rgba(156,163,175,0.30);';
    filterBtn.textContent = filterBrand ? '★ 品牌活动（筛选中）' : '☆ 品牌活动';
    filterBtn.addEventListener('click', () => {
      setState({ filterBrand: !filterBrand });
    });
    inspectorContainer.insertBefore(filterBtn, inspectorContainer.firstChild);
  } else if (document.getElementById('brand-filter-btn')) {
    const filterBtn = document.getElementById('brand-filter-btn');
    filterBtn.style.cssText = filterBrand
      ? 'background:rgba(234,179,8,0.15);color:#B45309;border:1px solid rgba(234,179,8,0.40);'
      : 'background:rgba(156,163,175,0.10);color:#6B7280;border:1px solid rgba(156,163,175,0.30);';
    filterBtn.textContent = filterBrand ? '★ 品牌活动（筛选中）' : '☆ 品牌活动';
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
      <button id="ws-sec-assign-btn" class="text-sm px-4 py-2 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition-colors">赋权管理</button>
    `;
    assignArea.querySelector('#ws-sec-assign-btn')?.addEventListener('click', () => {
      toggleAuthPanel(assignArea);
    });
  }

  // ── 意见反馈管理（P3-1） ──
  renderFeedbackManagement();
}

// ════════════════════════════════════════════════════════════════
//  决策树引导式写入面板 — D-185 决策实现
//  L1 组织场景 → L2 活动形式 → L3 时长 → L4 发起方向 → 表单
// ════════════════════════════════════════════════════════════════

/** 决策树配置 */
const DECISION_TREE = {
  L1: [
    { value: 'three-meetings', label: '三会一课', icon: '三', iconColor: '#CE1126', iconBg: 'rgba(206,17,38,0.10)', hasSub: true },
    { value: 'theme-day', label: '主题党日', icon: '主', iconColor: '#2563EB', iconBg: 'rgba(37,99,235,0.10)', scenarioId: 'theme-party' },
  ],
  L1Sub: {
    'three-meetings': [
      { value: 'branch-party-meeting', label: '支部党员大会', scenarioId: 'branch-party-meeting' },
      { value: 'branch-committee', label: '支委会', scenarioId: 'branch-committee' },
      { value: 'party-group-meeting', label: '党小组会', scenarioId: 'party-group-meeting' },
      { value: 'party-lecture', label: '党课', scenarioId: 'party-lecture' },
    ],
  },
  L2: {
    'three-meetings': [
      { value: 'meeting', label: '会议', color: '#7C3AED', bg: 'rgba(124,58,237,0.10)', border: 'rgba(124,58,237,0.30)' },
    ],
    'theme-day': [
      { value: 'study', label: '学习', color: '#2563EB', bg: 'rgba(37,99,235,0.10)', border: 'rgba(37,99,235,0.30)' },
      { value: 'visit', label: '参访', color: '#059669', bg: 'rgba(5,150,105,0.10)', border: 'rgba(5,150,105,0.30)' },
      { value: 'forum', label: '座谈', color: '#D97706', bg: 'rgba(217,119,6,0.10)', border: 'rgba(217,119,6,0.30)' },
      { value: 'co-build', label: '共建', color: '#DB2777', bg: 'rgba(219,39,119,0.10)', border: 'rgba(219,39,119,0.30)' },
      { value: 'meeting', label: '会议', color: '#7C3AED', bg: 'rgba(124,58,237,0.10)', border: 'rgba(124,58,237,0.30)' },
    ],
  },
  L3: [
    { value: 'short', label: '短期', desc: '单次活动，1天内完成' },
    { value: 'long', label: '长期', desc: '跨天或持续一段时间的活动' },
  ],
  L4: [
    { value: 'top-down', label: '自上而下', desc: '支委/书记发起，向下部署' },
    { value: 'bottom-up', label: '自下而上', desc: '党小组/成员提议，向上申报' },
  ],
};

/** 步骤标签 */
const STEP_LABELS = ['组织场景', '活动形式', '时长', '发起方向', '填写信息'];

/** 写入面板状态 */
const wp = { step: 1, L1: null, L1Sub: null, L2: null, L3: null, L4: null, submitting: false };

/** 根据 L1/L1Sub 选择获取 scenarioId */
function getScenarioId() {
  if (wp.L1 === 'theme-day') return 'theme-party';
  return wp.L1Sub || null;
}

/** 获取场景标题 */
function getScenarioTitle() {
  const sid = getScenarioId();
  if (!sid) return '';
  const sc = sopDatabase.scenarios.find(s => s.scenarioId === sid);
  return sc ? sc.title : '';
}

/** 获取已选路径的文字摘要 */
function getSelectionPath() {
  const parts = [];
  if (wp.L1 === 'three-meetings') {
    const sub = DECISION_TREE.L1Sub['three-meetings'].find(o => o.value === wp.L1Sub);
    parts.push(sub ? sub.label : '三会一课');
  } else if (wp.L1 === 'theme-day') {
    parts.push('主题党日');
  }
  if (wp.L2) {
    const l2Opts = DECISION_TREE.L2[wp.L1] || [];
    const l2 = l2Opts.find(o => o.value === wp.L2);
    if (l2) parts.push(l2.label);
  }
  if (wp.L3) parts.push(wp.L3 === 'short' ? '短期' : '长期');
  if (wp.L4) parts.push(wp.L4 === 'top-down' ? '自上而下' : '自下而上');
  return parts.join(' / ');
}

/** 根据决策树选择（L3时长 + L1场景）映射工作流定义ID */
function mapToDefinitionId() {
  if (wp.L1 === 'theme-day') return 'theme-party-day';
  // 三会一课场景：根据 L3 时长决定
  return wp.L3 === 'long' ? 'long-term' : 'short-term';
}

/** 渲染工作流可视化面板 */
function renderWorkflowPanel(definitionId, activityTitle) {
  // 在 secretary-write 卡片下方动态创建工作流面板容器
  const writeCard = document.getElementById('secretary-write');
  if (!writeCard) return;

  // 移除已有的工作流面板（避免重复）
  const existing = document.getElementById('secretary-workflow');
  if (existing) existing.remove();

  // 创建面板容器
  const panel = document.createElement('div');
  panel.id = 'secretary-workflow';
  panel.className = 'workflow-panel-card';
  panel.innerHTML = `
    <div class="workflow-panel-title">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
      工作流追踪 — ${activityTitle || '新活动'}
    </div>
    <div id="secretary-workflow-content"></div>
  `;

  // 插入到 secretary-write 之后
  writeCard.after(panel);

  // 渲染工作流可视化
  const contentEl = document.getElementById('secretary-workflow-content');
  if (contentEl) {
    try {
      renderWorkflow(contentEl, definitionId, false);
    } catch (err) {
      console.warn('[ws-secretary] renderWorkflow failed:', err);
      contentEl.innerHTML = '<p class="text-xs text-gray-400 text-center py-4">工作流渲染失败</p>';
    }
  }

  // 滚动到工作流面板
  panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ── 渲染函数 ──────────────────────────────────────────────────

/** 主渲染入口 */
function renderWritePanel(container) {
  let html = '';

  // 步骤指示器
  html += renderStepper();

  // 已选路径摘要（step > 1 时显示）
  if (wp.step > 1) {
    html += `<div class="mb-4 px-3 py-2 rounded-lg bg-gray-50 border border-gray-100">`;
    html += `<p class="text-xs text-gray-500 mb-0.5">已选路径</p>`;
    html += `<p class="text-sm font-medium text-gray-700">${getSelectionPath()}</p>`;
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
    html += `<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>`;
    html += `返回上一步</button>`;
  }

  container.innerHTML = html;
  bindWritePanelEvents(container);
}

/** 步骤指示器 */
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
    const isSelected = wp.L1 === opt.value;
    const isExpanded = isSelected && opt.hasSub;

    html += `<div class="mb-2">`;
    html += `<button data-action="select-L1" data-value="${opt.value}" class="w-full text-left card rounded-xl p-4 transition-all ${isSelected ? 'ring-2 ring-red-200 bg-red-50/50' : 'hover:bg-gray-50'}">`;
    html += `<div class="flex items-center justify-between">`;
    html += `<div class="flex items-center gap-3">`;
    html += `<div class="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style="background:${opt.iconBg};">`;
    html += `<span class="text-sm font-bold" style="color:${opt.iconColor};">${opt.icon}</span>`;
    html += `</div>`;
    html += `<span class="text-sm font-medium ${isSelected ? 'text-red-700' : 'text-gray-700'}">${opt.label}</span>`;
    html += `</div>`;
    if (opt.hasSub) {
      html += `<svg class="w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>`;
    }
    html += `</div>`;
    html += `</button>`;

    // 三会一课子选项
    if (isExpanded && opt.hasSub) {
      const subs = DECISION_TREE.L1Sub[opt.value] || [];
      html += `<div class="ml-6 mt-2 flex flex-wrap gap-2">`;
      subs.forEach(sub => {
        const isSubSelected = wp.L1Sub === sub.value;
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
  const options = DECISION_TREE.L2[wp.L1] || [];
  let html = `<div>`;
  html += `<p class="text-sm font-medium text-gray-700 mb-3">选择活动形式</p>`;
  html += `<div class="flex flex-wrap gap-2">`;
  options.forEach(opt => {
    const isSelected = wp.L2 === opt.value;
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
    const isSelected = wp.L3 === opt.value;
    html += `<button data-action="select-L3" data-value="${opt.value}" class="flex-1 text-left card rounded-xl p-4 transition-all ${isSelected ? 'ring-2 ring-red-200 bg-red-50/50' : 'hover:bg-gray-50'}">`;
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
    const isSelected = wp.L4 === opt.value;
    html += `<button data-action="select-L4" data-value="${opt.value}" class="flex-1 text-left card rounded-xl p-4 transition-all ${isSelected ? 'ring-2 ring-red-200 bg-red-50/50' : 'hover:bg-gray-50'}">`;
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
  const scenarioTitle = getScenarioTitle();
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
      if (wp.L1 !== val) {
        // 切换 L1 时清除后续选择
        wp.L1 = val;
        wp.L1Sub = null;
        wp.L2 = null;
        wp.L3 = null;
        wp.L4 = null;
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
      wp.L1Sub = val;
      wp.L2 = null;
      wp.L3 = null;
      wp.L4 = null;
      // 三会一课只有"会议"一种形式，自动选择并进入 L3
      if (wp.L1 === 'three-meetings') {
        wp.L2 = 'meeting';
        wp.step = 3;
      }
      break;
    }

    case 'select-L2': {
      wp.L2 = btn.dataset.value;
      wp.L3 = null;
      wp.L4 = null;
      wp.step = 3;
      break;
    }

    case 'select-L3': {
      wp.L3 = btn.dataset.value;
      wp.L4 = null;
      wp.step = 4;
      break;
    }

    case 'select-L4': {
      wp.L4 = btn.dataset.value;
      wp.step = 5;
      break;
    }

    case 'wp-back': {
      if (wp.step > 1) {
        wp.step--;
        // 回退时清除当前步骤及后续的选择
        if (wp.step < 5) { /* form fields are ephemeral */ }
        if (wp.step < 4) wp.L4 = null;
        if (wp.step < 3) wp.L3 = null;
        if (wp.step < 2) { wp.L2 = null; wp.L1Sub = null; }
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

  const scenarioId = getScenarioId();
  if (!scenarioId) { showToast('error', '场景信息缺失，请重新选择'); return; }

  wp.submitting = true;
  const container = document.getElementById('write-form-area');
  if (container) renderWritePanel(container);

  try {
    // 1. 创建活动
    const activityData = {
      title,
      type: wp.L1 === 'three-meetings' ? '三会一课' : '主题党日',
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
      _dt_L1: wp.L1,
      _dt_L1Sub: wp.L1Sub || '',
      _dt_L2: wp.L2 || '',
      _dt_L3: wp.L3 || '',
      _dt_L4: wp.L4 || '',
    };
    const activity = await BranchService.createActivity(activityData);
    console.info('[WritePanel] createActivity 成功, id=' + activity.id);

    // 2. 实例化 SOP 任务节点
    const taskNodes = instantiateSOP([scenarioId], date);
    console.info('[WritePanel] instantiateSOP 生成 ' + taskNodes.length + ' 个任务节点');

    // 3. 为每个任务节点创建 Task
    let createdCount = 0;
    for (const node of taskNodes) {
      try {
        await BranchService.createTask({
          activityId: activity.id,
          title: node.title,
          executor: node.executor,
          supervisor: node.supervisor,
          timeOffset: node.timeOffset,
          date: node.date instanceof Date ? node.date.toISOString().slice(0, 10) : String(node.date),
          status: 'pending',
          scenarioId: node.scenarioId,
          taskId: node.taskId || '',
          desc: node.desc || '',
        });
        createdCount++;
      } catch (taskErr) {
        console.warn('[WritePanel] createTask 失败: ' + node.title, taskErr);
      }
    }

    showToast('success', `活动写入成功，已生成 ${createdCount} 个任务节点`);

    // 4. 渲染工作流可视化面板
    const definitionId = mapToDefinitionId();
    renderWorkflowPanel(definitionId, title);

    // 5. 重置面板状态
    wp.step = 1;
    wp.L1 = null;
    wp.L1Sub = null;
    wp.L2 = null;
    wp.L3 = null;
    wp.L4 = null;
    wp.submitting = false;

    // 5. 刷新活动列表
    try {
      const activities = await BranchService.listActivities();
      setState({ activities });
    } catch (_) { /* 列表刷新失败不影响写入结果 */ }

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
//  赋权管理面板 — P0-4
//  功能：PersonPicker 选择人员 → 角色选择 → 范围选择 → 关联选择 → 确认赋权
//  赋权记录列表：展示当前所有赋权记录，支持撤销
// ════════════════════════════════════════════════════════════════

/** 赋权面板状态 */
const authPanel = {
  open: false,
  selectedUserId: null,
  role: null,        // 'organizer' | 'deep'
  scope: null,       // 'activity' | 'taskforce'
  scopeRef: null,    // 关联活动/专班 ID
  personPicker: null,
};

/** 可赋权角色选项 */
const AUTH_ROLE_OPTIONS = [
  { value: 'organizer', label: '组织者', desc: '负责活动/专班的策划与执行统筹', color: '#1e40af', bg: 'rgba(30,64,175,0.08)', border: 'rgba(30,64,175,0.25)' },
  { value: 'deep', label: '深度参与者', desc: '承担具体工作任务的骨干成员', color: '#166534', bg: 'rgba(22,101,52,0.08)', border: 'rgba(22,101,52,0.25)' },
];

/** 赋权范围选项 */
const AUTH_SCOPE_OPTIONS = [
  { value: 'activity', label: '活动域', desc: '赋权范围覆盖指定活动', color: '#7C3AED' },
  { value: 'taskforce', label: '专班域', desc: '赋权范围覆盖指定专班', color: '#B45309' },
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
  panel.className = 'card rounded-2xl p-6 mt-4 border border-gray-100';

  // ── 赋权表单 ──
  let html = '';

  // 1. 人员选择
  html += `<div class="mb-4">`;
  html += `<label class="text-xs text-gray-500 mb-1.5 block font-medium">选择被赋权同志 <span class="text-red-500">*</span></label>`;
  html += `<div id="auth-person-picker-slot"></div>`;
  html += `</div>`;

  // 2. 角色选择
  html += `<div class="mb-4">`;
  html += `<label class="text-xs text-gray-500 mb-1.5 block font-medium">赋权角色 <span class="text-red-500">*</span></label>`;
  html += `<div class="flex gap-3">`;
  AUTH_ROLE_OPTIONS.forEach(opt => {
    const isSelected = authPanel.role === opt.value;
    html += `<button data-auth-action="select-role" data-value="${opt.value}" class="flex-1 text-left card rounded-xl p-3 transition-all ${isSelected ? 'ring-2 ring-red-200 bg-red-50/50' : 'hover:bg-gray-50'}">`;
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
    html += `<button data-auth-action="select-scope" data-value="${opt.value}" class="flex-1 text-left card rounded-xl p-3 transition-all ${isSelected ? 'ring-2 ring-red-200 bg-red-50/50' : 'hover:bg-gray-50'}">`;
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
    html += `<select id="auth-scope-ref" class="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:border-red-300 focus:ring-1 focus:ring-red-200 outline-none transition-all bg-white">`;
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
    html += `<select id="auth-scope-ref" class="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:border-red-300 focus:ring-1 focus:ring-red-200 outline-none transition-all bg-white">`;
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

  // ── 分隔线 ──
  html += `<div class="border-t border-gray-100 mt-6 pt-4">`;
  html += `<h4 class="font-title-cn text-sm font-semibold text-gray-700 mb-3">赋权记录</h4>`;
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
      onSelect: (ids) => {
        authPanel.selectedUserId = ids[0] || null;
      },
    });
    // 如果已有选中，恢复
    if (authPanel.selectedUserId) {
      authPanel.personPicker.setSelected([authPanel.selectedUserId]);
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
  if (!authPanel.selectedUserId) {
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
    authPanel.selectedUserId,
    authPanel.role,
    authPanel.scope,
    authPanel.scopeRef,
  );

  if (result.ok) {
    const person = PEOPLE.find(p => p.id === authPanel.selectedUserId);
    const personName = person ? person.name : authPanel.selectedUserId;
    const roleLabel = ROLE_LABELS[authPanel.role] || authPanel.role;
    showToast('success', `已为 ${personName} 赋予 ${roleLabel} 角色`);

    // 重置表单（保留面板打开）
    authPanel.selectedUserId = null;
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

  const records = AuthStore.getAuthState();

  if (records.length === 0) {
    listEl.innerHTML = `<p class="text-xs text-gray-400 text-center py-4">暂无赋权记录</p>`;
    return;
  }

  listEl.innerHTML = records.map(record => {
    const person = PEOPLE.find(p => p.id === record.targetUserId);
    const personName = person ? person.name : record.targetUserId;
    const roleLabel = ROLE_LABELS[record.role] || record.role;
    const scopeLabel = record.scope === 'activity' ? '活动域' : '专班域';

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
              <span class="text-xs px-1.5 py-0.5 rounded" style="background:${roleBg};color:${roleColor};border:1px solid ${roleBorder};">${roleLabel}</span>
              <span class="text-xs text-gray-400">${scopeLabel}</span>
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
//  意见反馈管理 — P3-1：书记操作状态流转（待处理→处理中→已办结）
// ════════════════════════════════════════════════════════════════

const scopeLabels = {
  permanent: '底层架构',
  global: '全局通用',
  role: '权责调整',
  scenario: '特定场景',
};

function renderFeedbackManagement() {
  const counts = FeedbackStore.countByStatus();
  const pendingEl = document.getElementById('fb-pending-count');
  const processingEl = document.getElementById('fb-processing-count');
  const doneEl = document.getElementById('fb-done-count');
  if (pendingEl) pendingEl.textContent = `${counts.pending} 待处理`;
  if (processingEl) processingEl.textContent = `${counts.processing} 处理中`;
  if (doneEl) doneEl.textContent = `${counts.done} 已办结`;

  const allFeedback = FeedbackStore.getAll();
  const active = allFeedback.filter(f => f.status !== 'done');
  const archived = allFeedback.filter(f => f.status === 'done');

  // 渲染活跃反馈（待处理+处理中）
  const listEl = document.getElementById('secretary-feedback-list');
  if (listEl) {
    if (active.length === 0) {
      listEl.innerHTML = '<p class="text-xs text-gray-400 text-center py-4">暂无待处理反馈</p>';
    } else {
      listEl.innerHTML = active.map(f => {
        const statusConfig = {
          pending: { label: '待处理', bg: 'bg-amber-100', text: 'text-amber-700', nextLabel: '开始处理', nextStatus: 'processing' },
          processing: { label: '处理中', bg: 'bg-blue-100', text: 'text-blue-700', nextLabel: '办结', nextStatus: 'done' },
        };
        const cfg = statusConfig[f.status] || statusConfig.pending;
        const commentsHtml = (f.comments && f.comments.length > 0)
          ? f.comments.map(c => `<div class="ml-2 pl-2 border-l-2 border-gray-200 py-0.5"><span class="text-[11px] text-gray-500">${c.author}：${c.text}</span></div>`).join('')
          : '';

        return `
          <div class="p-3 rounded-xl bg-gray-50 border border-gray-100" data-fb-id="${f.id}">
            <div class="flex items-center justify-between mb-1.5">
              <span class="text-[10px] px-1.5 py-0.5 rounded-full ${cfg.bg} ${cfg.text} font-medium">${cfg.label}</span>
              <span class="text-[10px] text-gray-400">${scopeLabels[f.scope] || f.scope}${f.scenarioName ? ' · ' + f.scenarioName : ''}</span>
            </div>
            ${f.painPointDetail || f.painPoint ? `<p class="text-xs text-gray-700 mb-1">${f.painPointDetail || f.painPoint}</p>` : ''}
            ${f.proposedFix ? `<p class="text-xs text-gray-500">建议：${f.proposedFix}</p>` : ''}
            ${commentsHtml ? `<div class="mt-1 space-y-0.5">${commentsHtml}</div>` : ''}
            <div class="flex items-center justify-between mt-2">
              <span class="text-[10px] text-gray-400">${f.submittedBy} · ${f.submittedAt}</span>
              <div class="flex gap-1.5">
                <button class="fb-status-btn text-[10px] px-2 py-1 rounded bg-white border border-gray-200 hover:bg-gray-50 transition-colors" data-fb-id="${f.id}" data-next-status="${cfg.nextStatus}">${cfg.nextLabel}</button>
                <button class="fb-comment-btn text-[10px] px-2 py-1 rounded bg-white border border-gray-200 hover:bg-gray-50 transition-colors" data-fb-id="${f.id}">追加评论</button>
              </div>
            </div>
          </div>`;
      }).join('');

      // 绑定状态流转按钮
      listEl.querySelectorAll('.fb-status-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const fbId = btn.dataset.fbId;
          const nextStatus = btn.dataset.nextStatus;
          const statusLabels = { processing: '处理中', done: '已办结' };
          const confirmed = window.confirm(`确认将此反馈标记为「${statusLabels[nextStatus]}」？`);
          if (!confirmed) return;
          FeedbackStore.updateStatus(fbId, nextStatus);
          showToast('success', `反馈已标记为${statusLabels[nextStatus]}`);
          renderFeedbackManagement();
        });
      });

      // 绑定追加评论按钮
      listEl.querySelectorAll('.fb-comment-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const fbId = btn.dataset.fbId;
          const text = prompt('评论内容：');
          if (!text) return;
          FeedbackStore.addComment(fbId, text, '书记');
          showToast('success', '评论已追加');
          renderFeedbackManagement();
        });
      });
    }
  }

  // 渲染已归档反馈
  const archivedEl = document.getElementById('secretary-feedback-archived');
  if (archivedEl) {
    if (archived.length === 0) {
      archivedEl.innerHTML = '<p class="text-xs text-gray-400 text-center py-2">暂无已归档反馈</p>';
    } else {
      archivedEl.innerHTML = archived.map(f => `
        <div class="p-2.5 rounded-xl bg-gray-50/50 border border-gray-50">
          <div class="flex items-center justify-between mb-1">
            <span class="text-[10px] px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">已办结</span>
            <span class="text-[10px] text-gray-400">${scopeLabels[f.scope] || f.scope}</span>
          </div>
          <p class="text-xs text-gray-500 line-through">${f.painPointDetail || f.painPoint || '无内容'}</p>
          <span class="text-[10px] text-gray-400">${f.submittedBy} · ${f.submittedAt}</span>
        </div>
      `).join('');
    }
  }
}

registerRenderCallback(renderSecretaryUI);

document.getElementById('month-selector')?.addEventListener('change', e => {
  setState({ displayMonth: e.target.value });
});

(async function init() {
  try {
    if (typeof BranchService.loadDB === 'function') BranchService.loadDB();
  } catch (e) { console.warn('[ws-secretary] loadDB error', e); }

  setState({ domain: 'activity', role: 'secretary', activeModule: 'workspace', status: STATE.LOADING, selectedRole: 'secretary' });

  try {
    const activities = await BranchService.listActivities();
    setState({ status: STATE.IDLE, activities });
  } catch (err) {
    console.warn('[ws-secretary] load failed', err);
    setState({ status: STATE.IDLE, activities: ACTIVITIES.map(a => ({ ...a, visibility: 'branch', executor: a.organizer || 'u_exec', supervisor: null, createdBy: a.organizer || 'u_exec', createdAt: a.date || new Date().toISOString() })) });
  }
}());
