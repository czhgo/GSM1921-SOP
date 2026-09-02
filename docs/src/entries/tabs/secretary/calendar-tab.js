// role: [工程师]+[AI]
// entries/tabs/secretary/calendar-tab.js — 书记工作台·活动管理 tab（懒加载模块）
// 2026-08-07 自 ws-secretary-entry.js 拆分：统计条 + 活动日历 + 写入活动悬浮表单 + 考勤概况 + 活动查询。

import { getAppState, setState } from '../../../core/state.js?v=20260901z';
import { _fmtDate, showToast } from '../../../core/utils.js?v=20260901z';
import { populateMonthSelector, renderCalendarByActivities } from '../../../components/calendar.js?v=20260901z';
import { renderInspectorFromState } from '../../../components/inspector.js?v=20260901z';
import { computeSecretaryStats } from '../../../services/roles.js?v=20260901z';
import { PersonPicker } from '../../../components/person-picker.js?v=20260901z';
import { openModal, closeModal } from '../../../components/modal.js?v=20260901z';
import { DecisionTreeState, renderWorkflowPanel, writeActivityWithSOP } from '../../../services/decision-tree.js?v=20260901z';
import { loadActivities } from '../../../services/activity.js?v=20260901z';
import { renderQueryView } from '../../../components/query-view.js?v=20260901z';
import { icon } from '../../../core/icons.js?v=20260901z';
import { loadAttendanceRecords } from '../../../services/attendance.js?v=20260901z';
import { getPersonName, PEOPLE } from '../../../mock/index.js?v=20260901z';
import { NoticeStore } from '../../../services/notice.js?v=20260901z';
import { BranchService } from '../../../services/runtime.js?v=20260901z';
import { ACTIVITY_CLASSIFICATION, classifyActivityType, getAccentColors, resolveAccentRole, dotDarkVars } from '../../../core/constants.js?v=20260901z';
import { badgeHtml } from '../../../components/badge.js?v=20260901z';
import { collectAgendaRows } from './agenda-form.js?v=20260901z';
import { defaultVoteConfig, isDecisionScenario, resolveVoterIds } from '../../../services/vote-config.js?v=20260901z';
import { getAdapter } from '../../../core/data-adapter.js?v=20260901z';

const accent = getAccentColors(resolveAccentRole('secretary')).accent;

// 成员发展阶段（议程「待讨论名单」类型：名单统一阶段转换选项；与 people.js developStage 口径一致）
const DEVELOP_STAGES = ['积极分子', '发展对象', '预备党员', '正式党员'];

// 议程类型 chips（2026-09-01 书记裁决：类型不互斥，一条议程可多类型；按自增列表思路写入）
// 「待讨论名单」替代原「成员变更」：多选人员 + 名单统一阶段转换（书记 2026-09-01 裁决）
const AGENDA_KIND_CHIPS = [
  { kind: 'discussion-file', label: '讨论文件' },
  { kind: 'attendee-list', label: '待讨论名单' },
];

/** 议程行 HTML（议题 + 主持人 + 类型 chips + 折叠的草案/待讨论名单字段） */
function _agendaRowHTML({ item = '', host = '', kinds = [], branchDocId = '', fromStage = '', toStage = '' } = {}) {
  const kindOn = (k) => (kinds.includes(k) ? ' wp-agenda-kind-on' : '');
  const docVisible = kinds.includes('discussion-file') ? '' : ' hidden';
  const memberVisible = kinds.includes('attendee-list') ? '' : ' hidden';
  const stageOptions = (cur) => DEVELOP_STAGES.map((s) =>
    `<option value="${s}" ${s === cur ? 'selected' : ''}>${s}</option>`).join('');
  return `
    <div class="wp-agenda-row border border-gray-100 rounded-lg p-2 space-y-1.5 bg-white">
      <div class="flex items-center gap-2">
        <input type="text" class="wp-agenda-item input-flat w-full text-xs" placeholder="议题，如：讨论关于 N 名发展对象转为预备党员" value="${item}">
        <input type="text" class="wp-agenda-host input-flat w-24 text-xs" placeholder="主持人" value="${host}">
        <button type="button" data-action="agenda-remove" class="text-gray-300 hover:text-red-500 text-sm px-1 shrink-0" title="删除该条">✕</button>
      </div>
      <div class="flex items-center gap-1.5">
        <span class="text-[10px] text-gray-400 shrink-0">类型</span>
        ${AGENDA_KIND_CHIPS.map((c) => `
          <button type="button" data-kind="${c.kind}" class="wp-agenda-kind text-[11px] px-2 py-0.5 rounded-full border border-gray-200 text-gray-500 hover:border-gray-300 transition-colors${kindOn(c.kind)}">${c.label}</button>
        `).join('')}
      </div>
      <div class="wp-agenda-doc-slot${docVisible}">
        <select class="wp-agenda-doc input-flat w-full text-xs">
          <option value="">加载会前草案…</option>
        </select>
        <p class="wp-agenda-doc-hint text-[10px] text-gray-400 mt-1 hidden">暂无会前草案，<a href="search.html" target="_blank" class="text-blue-600 hover:text-blue-800">去资料查询写入 →</a></p>
      </div>
      <div class="wp-agenda-member-slot flex items-center gap-2${memberVisible}">
        <select class="wp-agenda-from input-flat text-xs w-28">${stageOptions(fromStage)}</select>
        <span class="text-gray-300 text-xs shrink-0">→</span>
        <select class="wp-agenda-to input-flat text-xs w-28">${stageOptions(toStage)}</select>
        <div class="wp-agenda-person-slot flex-1"></div>
      </div>
    </div>`;
}

// 各 Tab 内容骨架模板（复用原 HTML 静态容器结构，由 render 函数按需注入）
const CALENDAR_TAB_HTML = `
  <!-- 统计条（紧凑文本概览） -->
  <div id="secretary-stats" class="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-gray-500 mb-4 py-2 border-b border-gray-100"></div>
  <!-- 活动日历（2026-08-05：「写入活动」并入日历卡片头部，删除原独立活动写入卡片） -->
  <div class="card rounded-2xl p-6 mb-4">
    <div class="flex items-center justify-between mb-4">
      <h3 class="font-title-cn text-base font-semibold text-gray-800">活动日历</h3>
      <button id="ws-sec-write-btn" type="button" class="btn-accent-soft shrink-0 text-sm px-4 py-1.5 inline-flex items-center gap-1.5">
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
          <h4 id="inspector-date-title" class="font-title-cn text-sm font-bold text-gray-800 mb-3"></h4>
          <div id="inspector-cards"></div>
        </div>
      </div>
    </div>
  </div>
  <!-- 考勤概况（从首页迁移；t5a 就地方案：书记只读监督。2026-08-05：移至日历之后，不再压顶） -->
  <div class="card rounded-xl p-4 mb-4">
    <div class="flex items-center justify-between mb-3">
      <h3 class="font-title-cn text-base font-semibold text-gray-800">考勤概况</h3>
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
      <h3 class="font-title-cn text-base font-semibold text-gray-800">活动查询</h3>
      <svg id="query-toggle-icon" class="w-4 h-4 text-gray-400 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7"/>
      </svg>
    </button>
    <div id="query-collapsible" class="hidden px-6 pb-6">
      <div id="secretary-query-container"></div>
    </div>
  </div>
`;

/** 渲染活动管理 tab：统计条+考勤+日历+写入+查询（增量刷新，写入面板防重渲染） */
export function renderContent(state) {
  const tc = document.getElementById('secretary-tab-content');
  if (!tc) return;
  if (tc.dataset.currentTab !== 'calendar') {
    tc.innerHTML = CALENDAR_TAB_HTML;
    tc.dataset.currentTab = 'calendar';
  }

  const activities = state.activities || [];
  renderSecretaryStats(activities);
  renderAttendanceSummary(activities);

  // T229：品牌筛选并入活动查询（品牌 chip 开关），日历恢复全量
  const displayActivities = activities;
  const filteredState = { ...state, activities: displayActivities };
  // 月份一致性：以月份选择器为准（含"默认跟随当前月"规则），避免与 state.displayMonth 分叉
  // URL 直达（首页跳转落点 2026-08-08）：携带 selectedActivityId 时优先定位该活动所在月
  const targetAct = state.selectedActivityId
    ? activities.find(a => a.id === state.selectedActivityId)
    : null;
  const targetMonth = targetAct?.date?.slice(0, 7) || state.displayMonth || undefined;
  const displayMonth = populateMonthSelector(displayActivities, targetMonth);
  renderCalendarByActivities(filteredState, displayMonth);
  renderInspectorFromState(filteredState);
  bindMonthSelector();
  renderQueryPanel(displayActivities);
  bindQueryToggle();

  // 写入活动 → 悬浮表单（T-217 §3：原内联 #write-form-area 迁移至 modal，按钮防重绑定）
  const writeBtn = document.getElementById('ws-sec-write-btn');
  if (writeBtn && !writeBtn.dataset.bound) {
    writeBtn.dataset.bound = '1';
    writeBtn.addEventListener('click', openWriteModal);
  }
}

// ── 活动管理 tab 子模块 ──────────────────────────────────

/** 统计条：紧凑文本概览（圆点+数字+标签） */
function renderSecretaryStats(activities) {
  const stats = computeSecretaryStats(activities);
  const statsEl = document.getElementById('secretary-stats');
  if (!statsEl) return;
  const items = [
    { label: '待赋权活动', value: stats.pendingAuth, color: accent },
    { label: '活跃活动', value: stats.activeEvents, color: accent },
    { label: '本月活动', value: stats.monthEvents, color: accent },
    { label: '党小组组长', value: stats.authGranted, color: accent },
  ];
  statsEl.innerHTML = items.map(s => `
    <span class="inline-flex items-center gap-1.5">
      <span class="inline-block w-1.5 h-1.5 rounded-full" style="${dotDarkVars(s.color)}background:${s.color};"></span>
      <span class="font-semibold text-gray-700">${s.value}</span>
      <span>${s.label}</span>
    </span>
  `).join('');
}

/** 活动查询视图（包装组件 renderQueryView，组装级联大类 + 品牌 chip 配置） */
function renderQueryPanel(displayActivities) {
  const queryContainer = document.getElementById('secretary-query-container');
  if (!queryContainer) return;
  renderQueryView(queryContainer, {
    searchPlaceholder: '搜索活动名称...',
    searchKey: 'title',
    // T229：类型体系层级化筛选——大类下拉 → 子类 chips 联动（三会一课固定子类 / 主题党日载体）
    category: {
      key: 'category',
      label: '活动类别',
      groups: {
        '三会一课': ACTIVITY_CLASSIFICATION['three-meetings'].subtypes,
        '主题党日': ACTIVITY_CLASSIFICATION['theme-party'].carriers,
      },
      match(item, subValue, catValue) {
        if (subValue) {
          if (catValue === '主题党日') {
            return (item.carriers || []).includes(subValue);
          }
          return item.type === subValue; // 三会一课子类（组织生活会是内容，不单独成子类）
        }
        return classifyActivityType(item.type) === (catValue === '三会一课' ? 'three-meetings' : 'theme-party');
      },
    },
    brandChip: { key: 'brand', label: '只看品牌' },
    data: displayActivities,
    renderRow: (a) => `
      <div class="flex items-center justify-between p-3 rounded-xl bg-white transition-colors">
        <div class="flex-1 min-w-0">
          <div class="text-sm font-medium text-gray-800">${a.title || '未命名'}</div>
          <div class="text-xs text-gray-500 mt-0.5">${a.date || ''}${a.type ? ' · ' + a.type : ''}${a.carriers?.length ? ' · ' + a.carriers.join('/') : ''}</div>
        </div>
        ${badgeHtml(a.type || '活动', 'neutral')}
      </div>
    `,
    emptyMessage: '暂无匹配活动',
    accentColor: accent,
    sortKey: 'date',
    sortDir: 'desc',
    pageSize: 10,      // 活动无上限增长 → 分页（2026-08-07）
    pageParam: 'apage',
  });
}

/** 月份选择器事件绑定（防重复） */
function bindMonthSelector() {
  const sel = document.getElementById('month-selector');
  if (sel && !sel.dataset.bound) {
    sel.dataset.bound = '1';
    sel.addEventListener('change', e => setState({ displayMonth: e.target.value }));
  }
}

/** 活动查询折叠面板绑定（默认折叠，点击展开/收起，防重复） */
function bindQueryToggle() {
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

function renderAttendanceSummary(activities) {
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
        // 出勤口径统一（2026-08-07）：已补（made_up）计入出勤，与书记概况出勤率一致
        const present = records.filter(r => r.status === 'present' || r.status === 'made_up').length;
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
    // 出勤口径统一（2026-08-07）：已补（made_up）计入出勤，与书记概况出勤率一致
    const present = records.filter(r => r.status === 'present' || r.status === 'made_up').length;
    const absent = records.filter(r => r.status === 'absent').length;
    const leave = records.filter(r => r.status === 'leave').length;
    const total = records.length;
    const rate = total > 0 ? Math.round((present / total) * 100) : 0;
    const rateColor = rate >= 90 ? 'text-green-600' : rate >= 70 ? 'text-orange-600' : 'text-red-600';

    // T-304 Q2 点击热区：纯展示行不加 hover 伪装（COMPONENT_SPEC §4.3）——去 hover:bg-gray-50
    return `
      <div class="flex items-center gap-3 py-2 border-b border-gray-50 last:border-b-0 rounded-lg px-2 -mx-2">
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

// ── 写入活动悬浮表单（T-217 §3 全悬浮化） ──────────────────
const WRITE_MODAL_ID = 'write-activity';

/** 定位当前悬浮面板内的写入面板容器（悬浮已关闭时返回 null） */
function _getWritePanelContainer() {
  return document.getElementById(`modal-overlay-${WRITE_MODAL_ID}`)?.querySelector('.modal-body') || null;
}

/** 品牌名下拉数据源：当前 state 内全部活动（写入面板仅在 tab 渲染后打开，state 已就绪） */
function _getBrandList() {
  return getAppState()?.activities || [];
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
  html += `<span class="${step1Active ? 'text-accent font-semibold' : 'text-gray-400'}">① 选模板</span>`;
  html += `<span class="text-gray-300">›</span>`;
  html += `<span class="${!step1Active ? 'text-accent font-semibold' : 'text-gray-400'}">② 填表单</span>`;
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

  // 清理上次会话遗留的议程行 PersonPicker（防 DOM 泄漏；重渲染前销毁）
  (wp.agendaPickers || []).forEach(({ picker }) => { try { picker.destroy(); } catch (_) {} });
  wp.agendaPickers = [];

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
      // 2026-09-01：唯一选项 → hover 即选（降低点击时间；data-hover-select 由 bindWritePanelEvents 绑定）
      const isSelected = wp.selections.L1 === tpl.category;
      html += `<button data-action="select-template" data-hover-select="1" data-category="${tpl.category}" data-subtype="" data-scenario-id="${tpl.scenarioId || 'theme-party'}" data-activity-type="" data-color="${tpl.color}" class="w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${isSelected ? 'sel-accent-on' : 'text-gray-700 hover:bg-gray-50'}">`;
      html += `选择${tpl.categoryLabel}`;
      html += `</button>`;
    } else {
      tpl.subtypes.forEach(sub => {
        const isSelected = wp.selections.L1 === tpl.category && wp.selections.L1Sub === sub.value;
        html += `<button data-action="select-template" data-category="${tpl.category}" data-subtype="${sub.value}" data-scenario-id="${sub.scenarioId}" data-activity-type="${sub.activityType || ''}" data-color="${tpl.color}" class="w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${isSelected ? 'sel-accent-on' : 'text-gray-700 hover:bg-gray-50'}">`;
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
  const scenarioId = wp.selections._scenarioId || wp.getScenarioId?.() || '';
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

  // 会议形式（2026-09-02 线上异步表决泛化 A 期：仅决策类场景——支委会/支部党员大会；
  // 默认线下开会保持现状；选「线上异步表决」后展开参与范围配置，见 renderVoteConfigSection）
  // 写侧约束（2026-09-02，T-2026-09-006）：本写入面板仅在书记/副书记工作台（secretary.html）
  // 呈现——组长等其它角色工作台写活动无表决配置入口，voteConfig 只能由书记/副书记配置。
  if (isDecisionScenario(scenarioId)) {
    html += renderVoteConfigSection(scenarioId);
  }

  // 会议议程（T-283：三会一课专用；逐条议题 + 可选主持人，行内编辑最少点击）
  if (tpl.category === 'three-meetings') {
    html += `<div class="mb-3 rounded-lg border border-gray-100 bg-gray-50/50 p-3">`;
    html += `<label class="text-xs text-gray-500 mb-1.5 block font-medium">会议议程 <span class="text-gray-300">（选填；类型可多选）</span></label>`;
    html += `<div id="wp-agenda-list" class="space-y-2">`;
    // 初始 1 行空议程（HTML 内嵌，减少首条输入点击；添加/删除由 bindWritePanelEvents 事件处理）
    html += _agendaRowHTML();
    html += `</div>`;
    html += `<button type="button" data-action="agenda-add" class="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 transition-colors">+ 添加议程</button>`;
    html += `</div>`;
  }

  // 品牌（2026-08-07 书记原始意图：看是否延续旧品牌 / 创建新品牌）
  // 2026-09-01：品牌概念仅主题党日适用（三会一课无品牌语义，隐藏该字段）
  if (tpl.category === 'theme-day') {
  const brandNames = [...new Set((_getBrandList() || []).map(a => a.brandName).filter(Boolean))];
  html += `<div class="mb-3">`;
  html += `<label class="text-xs text-gray-500 mb-1.5 block font-medium">品牌 <span class="text-gray-300">（选填）</span></label>`;
  html += `<div class="flex gap-2">`;
  html += `<button type="button" data-wp-brand="none" class="wp-brand-chip wp-brand-on text-xs px-3 py-1.5 rounded-lg border transition-colors">非品牌</button>`;
  html += `<button type="button" data-wp-brand="inherit" class="wp-brand-chip text-xs px-3 py-1.5 rounded-lg border transition-colors">延续已有品牌</button>`;
  html += `<button type="button" data-wp-brand="create" class="wp-brand-chip text-xs px-3 py-1.5 rounded-lg border transition-colors">创建新品牌</button>`;
  html += `</div>`;
  html += `<div id="wp-brand-inherit" class="hidden mt-2">`;
  html += `<select id="wp-brand-select" class="input-flat text-xs w-full">${brandNames.map(n => `<option value="${n}">${n}</option>`).join('')}</select>`;
  html += `</div>`;
  html += `<div id="wp-brand-create" class="hidden mt-2">`;
  html += `<input type="text" id="wp-brand-input" class="input-flat w-full" placeholder="品牌名称，如：人生回望录">`;
  html += `</div>`;
  html += `</div>`;
  }

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
  html += `<button data-action="wp-submit" class="btn-accent text-sm px-4 py-[7px] font-medium ${btnDisabled}">${btnText}</button>`;

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

/** 会议形式配置区（2026-09-02 线上异步表决泛化 A 期：仅决策类场景调用）
 *  参与范围按场景预填：支委会固定「支委」只读文案；支部党员大会可切换
 *  正式党员（默认）/ 正式党员+预备党员；人数经 resolveVoterIds 实时解析。
 *  配置区默认隐藏，选「线上异步表决」后展开（事件见 bindWritePanelEvents）。
 */
function renderVoteConfigSection(scenarioId) {
  const countOf = (scope) => resolveVoterIds(scope).length;
  let html = `<div class="mb-3 rounded-lg border border-gray-100 bg-gray-50/50 p-3">`;
  html += `<label class="text-xs text-gray-500 mb-1.5 block font-medium">会议形式</label>`;
  html += `<div class="flex gap-4 pt-0.5">`;
  html += `<label class="flex items-center gap-2 text-xs cursor-pointer">`;
  html += `<input type="radio" name="wp-meeting-form" value="onsite" class="radio-accent" checked>线下开会`;
  html += `</label>`;
  html += `<label class="flex items-center gap-2 text-xs cursor-pointer">`;
  html += `<input type="radio" name="wp-meeting-form" value="async" class="radio-accent">线上异步表决`;
  html += `</label>`;
  html += `</div>`;
  // 线上异步表决配置区（默认隐藏；「线上异步表决」选中时展开）
  html += `<div id="wp-vote-config" class="hidden mt-2.5 pt-2.5 border-t border-gray-100">`;
  if (scenarioId === 'branch-committee') {
    // 支委会：参与范围固定支委（只读文案，无选择项）
    html += `<p class="text-xs text-gray-600">参与范围：支委（${countOf('committee')} 人）</p>`;
  } else if (scenarioId === 'branch-party-meeting') {
    html += `<label class="text-xs text-gray-500 mb-1.5 block font-medium">参与范围</label>`;
    html += `<div class="flex gap-4 pt-0.5">`;
    html += `<label class="flex items-center gap-2 text-xs cursor-pointer">`;
    html += `<input type="radio" name="wp-vote-scope" value="formal-only" class="radio-accent" checked>正式党员（${countOf('formal-only')} 人）`;
    html += `</label>`;
    html += `<label class="flex items-center gap-2 text-xs cursor-pointer">`;
    html += `<input type="radio" name="wp-vote-scope" value="formal-plus-prep" class="radio-accent">正式党员 + 预备党员（${countOf('formal-plus-prep')} 人）`;
    html += `</label>`;
    html += `</div>`;
    html += `<p class="text-xs text-gray-400 mt-2">表决选项：赞成 / 反对 / 弃权 + 可附言</p>`;
  }
  html += `</div>`;
  html += `</div>`;
  return html;
}

/** 添加一条议程输入行（T-283：议题 + 可选主持人；2026-09-01：类型 chips + 待讨论名单多选） */
function _addAgendaRow(container, item = '', host = '', kinds = [], branchDocId = '', fromStage = '', toStage = '') {
  const list = container.querySelector('#wp-agenda-list');
  if (!list) return;
  const wrapper = document.createElement('div');
  wrapper.innerHTML = _agendaRowHTML({ item, host, kinds, branchDocId, fromStage, toStage });
  const row = wrapper.firstElementChild;
  list.appendChild(row);
  _hydrateDraftDocs(row);
  _bindRowKindChips(row);
  _initRowPersonPicker(row);
}

/** 绑定单个议程行的类型 chips（多选不互斥；选中展开对应字段区） */
function _bindRowKindChips(row) {
  if (!row) return;
  row.querySelectorAll('.wp-agenda-kind').forEach(chip => {
    if (chip.dataset.bound) return;
    chip.dataset.bound = '1';
    chip.addEventListener('click', () => {
      chip.classList.toggle('wp-agenda-kind-on');
      if (chip.dataset.kind === 'discussion-file') row.querySelector('.wp-agenda-doc-slot')?.classList.toggle('hidden');
      if (chip.dataset.kind === 'attendee-list') row.querySelector('.wp-agenda-member-slot')?.classList.toggle('hidden');
    });
  });
}

/** 初始化议程行的待讨论名单多选（PersonPicker multi；实例挂 wp.agendaPickers 供收集读取） */
function _initRowPersonPicker(row) {
  const slot = row.querySelector('.wp-agenda-person-slot');
  if (!slot || slot.dataset.bound) return;
  slot.dataset.bound = '1';
  const picker = new PersonPicker({
    mode: 'multi',
    placeholder: '选择待讨论名单（可多选）',
    accentColor: accent,
    stageBatch: true,
    onSelect: () => {},
  });
  picker.render(slot);
  wp.agendaPickers.push({ row, picker });
}

/** 填充议程行「会前草案」下拉（draft 状态支部文件；异步，不阻塞表单；空态引导去资料查询写入） */
async function _hydrateDraftDocs(row) {
  const select = row?.querySelector('.wp-agenda-doc');
  if (!select) return;
  const hint = row.querySelector('.wp-agenda-doc-hint');
  try {
    const docs = await getAdapter().branchDocs.list();
    const drafts = docs.filter(d => !d.status || d.status === 'draft');
    select.innerHTML = `<option value="">${drafts.length ? '选择会前草案…' : '暂无会前草案'}</option>`
      + drafts.map(d => `<option value="${d.id}">${d.title || d.fileName || '未命名草案'}</option>`).join('');
    if (hint) hint.classList.toggle('hidden', drafts.length > 0);
  } catch (e) {
    console.warn('[calendar] 会前草案加载失败：', e);
    select.innerHTML = '<option value="">草案加载失败</option>';
  }
}

function bindWritePanelEvents(container) {
  container.querySelectorAll('[data-action]').forEach(el => {
    el.addEventListener('click', handleWritePanelAction);
  });
  // 会议议程初始行（T-283：三会一课模板默认 1 行空议程，减少首条输入点击）
  // 置于最前：避免后续参与人选择器（PersonPicker）初始化异常导致议程行被跳过
  const agendaList = container.querySelector('#wp-agenda-list');
  if (agendaList && agendaList.children.length === 0) _addAgendaRow(container);
  if (agendaList) {
    agendaList.querySelectorAll('.wp-agenda-row').forEach((row) => {
      _hydrateDraftDocs(row);
      _initRowPersonPicker(row);
    });
  }
  // 议程类型 chips（2026-09-01：多选不互斥；初始行绑定，新增行在 _addAgendaRow 内绑定）
  container.querySelectorAll('.wp-agenda-row').forEach((row) => _bindRowKindChips(row));
  // 主题党日模板 hover 即选（书记 2026-09-01：第一步只有一个选项时降低点击时间）
  container.querySelectorAll('[data-hover-select="1"]').forEach((btn) => {
    if (btn.dataset.hoverBound) return;
    btn.dataset.hoverBound = '1';
    btn.addEventListener('mouseenter', () => { if (!btn.dataset.selected) btn.click(); });
  });
  // 参与人选择（PersonPicker 多选 + 按阶段批量；重渲染时保留已选，销毁旧实例防泄漏）
  // 2026-09-01：三会一课不强制积极分子参加但鼓励列席——阶段批量选择提供「积极分子」快捷项
  const participantsSlot = container.querySelector('#wp-participants-slot');
  if (participantsSlot) {
    const prevSelected = wp.personPicker ? wp.personPicker.getSelected() : [];
    if (wp.personPicker) wp.personPicker.destroy();
    wp.personPicker = new PersonPicker({
      mode: 'multi',
      placeholder: '选择参与人（选填，可多选）',
      accentColor: accent,
      initialIds: prevSelected,
      stageBatch: true,
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
  // 品牌选择（T229：非品牌 / 延续已有品牌 / 创建新品牌）
  container.querySelectorAll('[data-wp-brand]').forEach(el => {
    el.addEventListener('click', () => {
      container.querySelectorAll('[data-wp-brand]').forEach(o => o.classList.remove('wp-brand-on'));
      el.classList.add('wp-brand-on');
      const mode = el.dataset.wpBrand;
      container.querySelector('#wp-brand-inherit')?.classList.toggle('hidden', mode !== 'inherit');
      container.querySelector('#wp-brand-create')?.classList.toggle('hidden', mode !== 'create');
    });
  });
  // 会议形式（2026-09-02 泛化：决策类场景选「线上异步表决」展开参与范围配置区）
  // I1：组级事件委托——handler 内统一查询组内选中态决定 toggle，不依赖单个 radio 的
  // change 分发顺序（切换时被取消选中与被选中的 radio 都会触发 change，旧逐 radio 实现结果相反）
  const voteConfigArea = container.querySelector('#wp-vote-config');
  if (voteConfigArea && !container.dataset.meetingFormBound) {
    container.dataset.meetingFormBound = '1';
    container.addEventListener('change', (e) => {
      if (e.target?.name !== 'wp-meeting-form') return;
      const isAsync = container.querySelector('input[name="wp-meeting-form"]:checked')?.value === 'async';
      voteConfigArea.classList.toggle('hidden', !isAsync);
    });
  }
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

    case 'agenda-add': {
      _addAgendaRow(_getWritePanelContainer());
      return; // 不重渲染面板
    }

    case 'agenda-remove': {
      const list = btn.closest('#wp-agenda-list');
      const row = btn.closest('.wp-agenda-row');
      if (row) {
        if (list && list.children.length > 1) row.remove();
        else row.querySelectorAll('input, select').forEach(i => { i.value = ''; });
      }
      return;
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

  // 会议议程（T-283：三会一课逐条议题 + 主持人；2026-09-01：类型 chips 多选 + 待讨论名单多选，collectAgendaRows 规范化）
  const agenda = [];
  {
    const formArea = _getWritePanelContainer();
    if (formArea) {
      const rows = [...formArea.querySelectorAll('.wp-agenda-row')];
      agenda.push(...collectAgendaRows(rows.map(row => {
        const kinds = [...row.querySelectorAll('.wp-agenda-kind.wp-agenda-kind-on')].map(c => c.dataset.kind);
        const pickerEntry = (wp.agendaPickers || []).find(entry => entry.row === row);
        return {
          item: row.querySelector('.wp-agenda-item')?.value || '',
          host: row.querySelector('.wp-agenda-host')?.value || '',
          kinds,
          branchDocId: row.querySelector('.wp-agenda-doc')?.value || '',
          personIds: pickerEntry ? pickerEntry.picker.getSelected() : [],
          fromStage: row.querySelector('.wp-agenda-from')?.value || '',
          toStage: row.querySelector('.wp-agenda-to')?.value || '',
        };
      })));
    }
  }

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

  // 品牌（T229：非品牌 / 延续已有品牌 / 创建新品牌）
  let brandMode = 'none';
  let brandName = '';
  {
    const formArea = _getWritePanelContainer();
    const on = formArea?.querySelector('[data-wp-brand].wp-brand-on');
    if (on) {
      brandMode = on.dataset.wpBrand;
      if (brandMode === 'inherit') brandName = document.getElementById('wp-brand-select')?.value || '';
      if (brandMode === 'create') brandName = document.getElementById('wp-brand-input')?.value?.trim() || '';
    }
  }

  // 校验必填项
  if (!title) { showToast('error', '请填写活动名称'); titleEl?.focus(); return; }
  if (!date) { showToast('error', '请选择日期'); dateEl?.focus(); return; }
  if (!location) { showToast('error', '请填写活动地点'); locationEl?.focus(); return; }

  const scenarioId = wp.selections._scenarioId || wp.getScenarioId?.();
  if (!scenarioId) { showToast('error', '场景信息缺失，请重新选择模板'); return; }

  // 会议形式（2026-09-02 线上异步表决泛化：决策类场景选「线上异步表决」→ 写入 voteConfig，
  // 参与范围按用户选择解析固化应到名单 voterIds；线下开会不写 voteConfig）
  const voteFormArea = _getWritePanelContainer();
  const meetingForm = voteFormArea?.querySelector('input[name="wp-meeting-form"]:checked')?.value || 'onsite';
  let voteConfig = null;
  if (meetingForm === 'async') {
    const vc = defaultVoteConfig(scenarioId);
    if (vc) {
      const voterScope = voteFormArea?.querySelector('input[name="wp-vote-scope"]:checked')?.value || vc.voterScope;
      voteConfig = { ...vc, voterScope, voterIds: resolveVoterIds(voterScope) };
    }
  }

  wp.submitting = true;
  const container = _getWritePanelContainer();
  if (container) renderWritePanel(container);

  try {
    const activityData = {
      title,
      type: wp.selections.L1 === 'three-meetings'
        ? (wp.config?.L1Sub?.['three-meetings']?.find(o => o.value === wp.selections.L1Sub)?.label || '三会一课')
        : '主题党日',
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
      // 品牌（延续旧品牌 / 创建新品牌）
      isBrand: brandMode !== 'none' && !!brandName,
      brandName: brandMode !== 'none' ? brandName : '',
      // 参与人（内联赋权：非空则 createActivity 不再派生组长赋权待办）
      assignments: participants.map(pid => ({ personId: pid, role: 'participant' })),
      // 会议议程（T-283：三会一课）
      agenda,
    };
    if (voteConfig) activityData.voteConfig = voteConfig;
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

    // 8. 刷新活动列表（反馈闭环：创建后立即可见）
    // 2026-08-27 T-283 修复：setState 触发链在本场景偶发不刷新日历（实测需手动切 tab 才可见），
    // 加 renderContent 直接兜底重渲染——创建成功即见成果，无需用户二次操作。
    try {
      const activities = await BranchService.listActivities();
      setState({ activities });
    } catch (_) { /* 列表刷新失败不影响写入结果*/ }
    try {
      renderContent(getAppState());
    } catch (e) { console.warn('[T283] 创建后兜底渲染失败', e); }

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
