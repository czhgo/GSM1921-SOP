// ════════════════════════════════════════════════════════════════
//  main.js — 状态驱动 UI 入口 (State-Driven UI Entry)
//  光华管理学院本科生党支部 SOP 引擎 v8.5
//  架构：Domain → Service → Runtime → Main(UI)
//  兼容：GitHub Pages (原生 ESM，无构建工具)
// ════════════════════════════════════════════════════════════════

import { BranchService } from './service.runtime.js';

// ── STATE 枚举 ──────────────────────────────────────────────────
const STATE = {
  IDLE:       0,
  LOADING:    1,  // 页面加载活动列表（占位中）
  SUBMITTING: 2,  // 表单提交中（按钮 disabled）
  SUCCESS:    3,  // 操作成功，更新列表 + Toast
  ERROR:      4,  // 操作失败，恢复按钮 + Toast
};

// ── 当前月份辅助（YYYY-MM），在 _fmtDate 定义前即可用 ──────────
function _currentYearMonth() {
  const n = new Date();
  return n.getFullYear() + '-' + String(n.getMonth() + 1).padStart(2, '0');
}

// ── 应用全局状态 ────────────────────────────────────────────────
let appState = {
  // 服务层状态
  status:      STATE.IDLE,
  activities:  [],
  tasks:       [],
  error:       null,
  // UI 视图状态
  domain:      'activity',
  role:        'all',
  activeModule: 'calendar',
  // 列表/详情双视图状态
  viewMode:            'list',   // 'list' | 'detail'
  selectedActivityId:  null,     // 当前详情视图对应的活动 ID
  selectedDate:        null,     // 当前选中日期 (YYYY-MM-DD)
  displayMonth:        _currentYearMonth(), // 当前显示月份 YYYY-MM
  // RBAC 双轨视图状态
  viewType:            'participant', // 'participant' | 'manager'
  managementRole:      'participant', // 'participant'|'leader'|'commissioner'|'organizer'|'deep'
};

// ── 防竞态：当前请求 ID ────────────────────────────────────────
let currentRequestId = 0;

// ── Immutable 状态更新 + 驱动渲染 ─────────────────────────────
function setState(patch) {
  appState = { ...appState, ...patch };
  renderUI(appState);
}

// ════════════════════════════════════════════════════════════════
//  SOP 数据库 v7.0 — JSON Schema-Driven Architecture
//  字段说明：timeOffset 单位为天，null = 无时间锚点
// ════════════════════════════════════════════════════════════════
const sopDatabase = {
  scenarios: [
    {
      scenarioId: 'org-life', title: '【活动建设】组织生活会',
      domain: 'activity', description: '刚性考勤 · 仅限党员和预备党员',
      tasks: [
        { taskId: '1a-0', title: '时间统筹（三组长协调）',  executor: 'leader',           supervisor: null,             timeOffset: -7, desc: '三位党小组长各自统计本组党员可用时间，取最大公因数（重叠时间段）；在支委群中同步结果；由支部书记在党支部大群统一发布，要求全员至少参与一场。' },
        { taskId: '1a-1', title: '确定会议主题',        executor: 'leader',           supervisor: null,         timeOffset: -7, desc: '块块组长根据支委会部署确定会议主题，确保与年度工作重点一致。' },
        { taskId: '1a-2', title: '会前谈心谈话',        executor: 'leader',           supervisor: null,         timeOffset: -7, desc: '组长与本组党员逐一谈心，了解思想状况，为会议提供信息基础。' },
        { taskId: '1a-2b', title: '全员述职回顾',       executor: 'all',              supervisor: 'leader',     timeOffset: -5, desc: '会前5天，全体参会党员回顾总结过去一年在党支部中承担的工作（述职），作为个人对照检查材料的基础素材。 - Source: knowledge/SOP/常见工作场景快速指南.md#活动建设组织生活会严肃政治会议' },
        { taskId: '1a-4', title: '通知到人',          executor: 'leader',           supervisor: null,         timeOffset: -3, desc: '块块组长通过党小组群发送正式会议通知，注明时间、地点、参会要求，必须提前至少3天；如需覆盖全支部，由支部书记通过党支部大群统一发布。' },
        { taskId: '1a-4b', title: '发布考勤二维码',     executor: 'leader',           supervisor: null,         timeOffset:  0, desc: '现场组织的党小组长负责在会议现场发布考勤二维码，供与会党员扫码签到。 - Source: knowledge/SOP/常见工作场景快速指南.md#活动建设组织生活会严肃政治会议' },
        { taskId: '1a-5', title: '签到考勤',            executor: 'disc-commissioner',supervisor: 'leader',     timeOffset:  0, desc: '执行刚性考勤（三会一课范畴）。组长发布二维码后，纪检委员同步记录到场情况。事假须提前1天申请；病假可事后补假。缺勤须记录留档。' },
        { taskId: '1a-6a', title: '个人自评',            executor: 'all',              supervisor: null,         timeOffset:  0, desc: '每位党员做个人自我批评，结合述职回顾内容展开。' },
        { taskId: '1a-6c', title: '互相批评',            executor: 'all',              supervisor: null,         timeOffset:  0, desc: '开展批评与自我批评，要有辣味，直指问题。' },
        { taskId: '1a-6d', title: '组长总结',            executor: 'leader',           supervisor: null,         timeOffset:  0, desc: '块块组长做总结发言，对本次组织生活会进行回顾与总结。' },
        { taskId: '1a-6b', title: '摄影留存宣传底稿',   executor: 'leader',           supervisor: null,         timeOffset:  3, desc: '现场主持的党小组长负责摄影留存，形成宣传底稿（照片+简要文字记录），提交宣传委员备用。 - Source: knowledge/SOP/常见工作场景快速指南.md#活动建设组织生活会严肃政治会议' },
        { taskId: '1a-7b', title: '后台考勤汇总',       executor: 'disc-commissioner',supervisor: 'leader',     timeOffset:  3, desc: '纪检委员在后台考勤小程序中统一汇总出勤数据，字段含：姓名、学号、发展阶段、所属党小组；导出后提交宣传委员归档。 - Source: knowledge/SOP/纪检委员工作流程指南.md#二考勤管理三会一课' },
        { taskId: '1a-8', title: '汇总组织生活会记录',  executor: 'leader',           supervisor: null,         timeOffset:  5, desc: '党小组组长会后收集过去一年承担较多工作的骨干同志的检查材料，与图片汇总整理形成完整的组织生活会记录（含述职摘要+对照检查材料精选）。 - Source: knowledge/SOP/常见工作场景快速指南.md#活动建设组织生活会严肃政治会议' },
        { taskId: '1a-9', title: '档案归档',            executor: 'prop-commissioner',supervisor: 'leader',     timeOffset:  5, desc: '宣传委员归档会议材料（组织生活会记录），上传智慧党建平台，T+5天完成。' },
      ],
    },
    {
      scenarioId: 'theme-party', title: '【活动建设】党小组主题党日活动',
      domain: 'activity', description: '弹性考勤 · 全体支部成员可参与',
      tasks: [
        { taskId: '1b-1', title: '活动发起',              executor: 'organizer',        supervisor: 'leader',     timeOffset: -7, desc: '策划活动方案，确定路径 a（有品牌活动，块块组长主导招募）或路径 b（无现成活动，策划参与成本低且有组织效应的活动）。' },
        { taskId: '1b-2', title: '组长审批',              executor: 'leader',           supervisor: null,         timeOffset: -7, desc: '必须报块块组长审批同意后方可推进。组长评估活动是否符合党支部组织意图，以及资源与时间是否可行。' },
        { taskId: '1b-3', title: '联系条条委员',          executor: 'organizer',        supervisor: 'leader',     timeOffset: -7, desc: '按需联系组织委员（通知）、宣传委员（宣传指导）、纪检委员（考勤督办），说明活动计划与需求。' },
        { taskId: '1b-4', title: '发布活动通知',          executor: 'leader',           supervisor: null,         timeOffset: -2, desc: '块块组长通过党小组群发布本组活动通知；外出活动提前2天完成建群并确保所有人员到位。' },
        { taskId: '1b-5', title: '考勤督办（微信备忘录）',executor: 'disc-commissioner',supervisor: 'leader',     timeOffset: -2, desc: '邀请纪检委员加入活动小群，在群内发送标准化微信备忘录，说明考勤要求与复盘底线。' },
        { taskId: '1b-6', title: '活动实施',              executor: 'organizer',        supervisor: 'leader',     timeOffset:  0, desc: '组织者全程负责。核查清单：签到 · 现场拍照（全景/互动/细节各至少1张）· 关键发言记录 · 活动结束前确认材料收齐。' },
        { taskId: '1b-7', title: '活动复盘',              executor: 'organizer',        supervisor: 'leader',     timeOffset:  7, desc: '完成活动复盘（积极分子可代完成，但块块组长须起指导作用）。参考：《活动复盘模板》。' },
        { taskId: '1b-8', title: '宣传产出（摘要+配图）', executor: 'deep',             supervisor: 'commissioner', timeOffset: 3, desc: '活动摘要+配图，纳入月度推送；无需宣传预热。宣传委员角色是指导，深度参与者负责执行。' },
        { taskId: '1b-9', title: '材料归档',              executor: 'organizer',        supervisor: 'leader',     timeOffset:  7, desc: '将全部活动材料主动交给宣传委员归档。参考：《活动总结模板》。' },
      ],
    },
    {
      scenarioId: 'joint-event', title: '【活动建设】团支部合办活动',
      domain: 'activity', description: '党小组主导 · 团班配合执行',
      tasks: [
        { taskId: '4-1', title: '评估契合度',           executor: 'leader',           supervisor: null,         timeOffset: null },
        { taskId: '4-2', title: '共同策划活动方案',     executor: 'leader',           supervisor: null,         timeOffset: null },
        { taskId: '4-3', title: '块块职能支持',         executor: 'org-commissioner', supervisor: 'leader',     timeOffset: null },
        { taskId: '4-4', title: '活动实施',             executor: 'organizer',        supervisor: 'leader',     timeOffset: null },
      ],
    },
    {
      scenarioId: 'brand-activity', title: '【活动建设】党小组品牌活动建设',
      domain: 'activity', description: '考察积极分子的重点场域',
      tasks: [
        { taskId: '8-1', title: '明确定位与设计方案',   executor: 'organizer',        supervisor: 'leader',     timeOffset: null },
        { taskId: '8-2', title: '锁定 Who/What/How',   executor: 'organizer',        supervisor: 'leader',     timeOffset: null },
        { taskId: '8-3', title: '试点实施与迭代优化',   executor: 'organizer',        supervisor: 'leader',     timeOffset: null },
        { taskId: '8-4', title: '总结与持续跟进',       executor: 'organizer',        supervisor: 'leader',     timeOffset: null },
      ],
    },
    {
      scenarioId: 'new-system', title: '【组织建设】制度制定与迭代',
      domain: 'organization', description: '主导角色：条条委员',
      tasks: [
        { taskId: '2-1', title: '起草制度初稿',                 executor: 'org-commissioner', supervisor: 'leader', timeOffset: null },
        { taskId: '2-2', title: '本组试点征求初步意见',         executor: 'org-commissioner', supervisor: 'leader', timeOffset: null },
        { taskId: '2-3', title: '块块组长征求各组意见',         executor: 'leader',           supervisor: null,     timeOffset: null },
        { taskId: '2-4', title: '修改完善并提交支委会审议',     executor: 'org-commissioner', supervisor: 'leader', timeOffset: null },
        { taskId: '2-5', title: '支部党员大会表决',             executor: 'all',              supervisor: null,     timeOffset: null },
        { taskId: '2-6', title: '监督落实与适时修订',           executor: 'org-commissioner', supervisor: 'leader', timeOffset: null },
      ],
    },
    {
      scenarioId: 'develop-activist', title: '【组织建设】考察积极分子',
      domain: 'organization', description: '培养考察期至少1年',
      tasks: [
        { taskId: '3-1', title: '日常观察（态度+能力）',        executor: 'leader',           supervisor: null,     timeOffset: null },
        { taskId: '3-2', title: '建立与维护考察档案',           executor: 'org-commissioner', supervisor: 'leader', timeOffset: null },
        { taskId: '3-3', title: '归档思想汇报',                 executor: 'org-commissioner', supervisor: 'leader', timeOffset: null, desc: '接收纪检委员转交的思想汇报并归档；字数标准统一为1500字以上。' },
        { taskId: '3-4', title: '向书记反馈考察意见',           executor: 'leader',           supervisor: null,     timeOffset: null },
        { taskId: '3-5', title: '支委会讨论与党员大会表决',     executor: 'all',              supervisor: null,     timeOffset: null },
      ],
    },
    {
      scenarioId: 'info-platform', title: '【组织建设】信息平台支持',
      domain: 'organization', description: '提前至少2天联系',
      tasks: [
        { taskId: '5-1', title: '提出信息平台支持需求',         executor: 'all',              supervisor: null,     timeOffset: -2 },
        { taskId: '5-2', title: '公邮定时查收与分发',           executor: 'disc-commissioner',supervisor: 'leader', timeOffset: null, desc: '纪检委员每周查看支部公邮1次；查收、汇总与必要转发/提醒，转交组织委员归档。' },
        { taskId: '5-3', title: '材料复核督办与档案维护',       executor: 'org-commissioner', supervisor: 'leader', timeOffset: null, desc: '实际材料审核工作由党办进行；组织委员负责提醒与协调进度。' },
      ],
    },
    {
      scenarioId: 'attendance-check', title: '【组织建设】查考勤记录',
      domain: 'organization', description: '考勤与考察分离体系',
      tasks: [
        { taskId: '6-1', title: '查三会一课考勤',               executor: 'disc-commissioner',supervisor: 'leader', timeOffset: null },
        { taskId: '6-2', title: '查考察档案与活动参与统计',     executor: 'org-commissioner', supervisor: 'leader', timeOffset: null },
      ],
    },
    {
      scenarioId: 'branch-discussion', title: '【组织建设】支部讨论重要事项',
      domain: 'organization', description: '支委会每月1次 · 党员大会每季度1次',
      tasks: [
        { taskId: '7-1', title: '党小组日常事务（组长负责制）', executor: 'leader',           supervisor: null,     timeOffset: null },
        { taskId: '7-2', title: '制度建设事项',                 executor: 'org-commissioner', supervisor: 'leader', timeOffset: null },
        { taskId: '7-3', title: '党员发展与重大事项',           executor: 'all',              supervisor: null,     timeOffset: null },
      ],
    },
    {
      scenarioId: 'feedback-handling', title: '【组织建设】处理意见建议反馈',
      domain: 'organization', description: '支部全体成员可提出',
      tasks: [
        { taskId: '9-1', title: '提出意见或建议',               executor: 'all',              supervisor: null,     timeOffset: null },
        { taskId: '9-2', title: '纪检委员统一收集意见',         executor: 'disc-commissioner',supervisor: 'leader', timeOffset: null },
        { taskId: '9-3', title: '支委会讨论处理',               executor: 'all',              supervisor: null,     timeOffset: null },
        { taskId: '9-4', title: '反馈处理结果',                 executor: 'org-commissioner', supervisor: 'leader', timeOffset: null },
      ],
    },
  ],
};

// ── 角色颜色 & 标签（完整保留 v7.9 粒化版本）──────────────────
const ROLE_COLORS = {
  leader:              { bg: 'rgba(255, 241, 242, 0.40)', text: '#9b0000',  border: 'rgba(254, 202, 202, 0.70)' },
  commissioner:        { bg: 'rgba(254, 249, 195, 0.40)', text: '#713f12',  border: 'rgba(253, 230, 138, 0.70)' },
  'org-commissioner':  { bg: 'rgba(254, 249, 195, 0.40)', text: '#713f12',  border: 'rgba(253, 230, 138, 0.70)' },
  'prop-commissioner': { bg: 'rgba(254, 249, 195, 0.40)', text: '#713f12',  border: 'rgba(253, 230, 138, 0.70)' },
  'disc-commissioner': { bg: 'rgba(254, 249, 195, 0.40)', text: '#713f12',  border: 'rgba(253, 230, 138, 0.70)' },
  organizer:           { bg: 'rgba(239, 246, 255, 0.40)', text: '#1e40af',  border: 'rgba(191, 219, 254, 0.70)' },
  deep:                { bg: 'rgba(240, 253, 244, 0.40)', text: '#166534',  border: 'rgba(187, 247, 208, 0.70)' },
  all:                 { bg: 'rgba(245, 243, 255, 0.40)', text: '#5b21b6',  border: 'rgba(221, 214, 254, 0.70)' },
};

const ROLE_LABELS = {
  leader:              '党小组组长',
  commissioner:        '条条委员',
  'org-commissioner':  '组织委员',
  'prop-commissioner': '宣传委员',
  'disc-commissioner': '纪检委员',
  organizer:           '活动组织者',
  deep:                '深度参与者',
  all:                 '全体相关',
};

// ════════════════════════════════════════════════════════════════
//  动画工具
// ════════════════════════════════════════════════════════════════
const TRANSITION_DURATION = 320;

function enterEl(el) {
  clearTimeout(el._leaveTimer);
  el.classList.remove('hidden');
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      el.classList.remove('opacity-0', 'translate-y-4');
      el.classList.add('opacity-100', 'translate-y-0');
    });
  });
}

function leaveEl(el) {
  el.classList.remove('opacity-100', 'translate-y-0');
  el.classList.add('opacity-0', 'translate-y-4');
  clearTimeout(el._leaveTimer);
  el._leaveTimer = setTimeout(() => {
    el.classList.add('hidden');
  }, TRANSITION_DURATION);
}

// ════════════════════════════════════════════════════════════════
//  Toast 组件 — 浮层通知（绝对不改变页面流布局）
//  2.5 秒后自动销毁。支持 success / error / info 三种类型。
// ════════════════════════════════════════════════════════════════

/** @type {HTMLElement|null} 当前 Toast 容器（单例）*/
let _toastContainer = null;

/**
 * 显示一条浮层 Toast 通知
 * @param {'success'|'error'|'info'} type
 * @param {string} message
 */
function showToast(type, message) {
  // 确保容器存在（fixed 定位，不影响文档流）
  if (!_toastContainer) {
    _toastContainer = document.createElement('div');
    _toastContainer.id = 'toast-container';
    // position:fixed 确保绝对不影响页面布局
    _toastContainer.style.cssText = [
      'position:fixed', 'bottom:1.5rem', 'right:1.5rem',
      'z-index:9999', 'display:flex', 'flex-direction:column',
      'gap:0.5rem', 'pointer-events:none',
    ].join(';');
    document.body.appendChild(_toastContainer);
  }

  const COLORS = {
    success: { bg: 'rgba(34,197,94,0.15)',  border: '#22c55e', icon: '✅' },
    error:   { bg: 'rgba(239,68,68,0.15)',  border: '#ef4444', icon: '❌' },
    info:    { bg: 'rgba(99,102,241,0.15)', border: '#6366f1', icon: 'ℹ️' },
  };
  const { bg, border, icon } = COLORS[type] || COLORS.info;

  const toast = document.createElement('div');
  toast.style.cssText = [
    `background:${bg}`, 'backdrop-filter:blur(8px)',
    `border:1px solid ${border}`, 'border-radius:0.75rem',
    'padding:0.625rem 1rem', 'display:flex', 'align-items:center',
    'gap:0.5rem', 'font-size:0.875rem', 'color:#f1f5f9',
    'box-shadow:0 4px 24px rgba(0,0,0,0.3)',
    'opacity:0', 'transform:translateY(0.5rem)',
    'transition:opacity 0.25s ease,transform 0.25s ease',
    'pointer-events:none', 'max-width:22rem', 'word-break:break-word',
  ].join(';');
  toast.textContent = icon + '  ' + message;
  _toastContainer.appendChild(toast);

  // 入场动画（双 rAF 确保 transition 生效）
  requestAnimationFrame(() => requestAnimationFrame(() => {
    toast.style.opacity = '1';
    toast.style.transform = 'translateY(0)';
  }));

  // 2.5 秒后自动销毁
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(0.5rem)';
    setTimeout(() => toast.remove(), 300);
  }, 2500);
}

// ════════════════════════════════════════════════════════════════
//  renderUI — 主渲染函数，由 setState 唯一触发
// ════════════════════════════════════════════════════════════════
function renderUI(state) {
  const { domain, role, activeModule, status, error } = state;

  // ── 模块 Tab 激活态 ──────────────────────────────────────────
  document.querySelectorAll('.module-tab[data-module]').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.module === activeModule);
  });

  // ── 侧边栏子菜单切换 ─────────────────────────────────────────
  const calMenu = document.getElementById('sidebar-calendar-menu');
  const tplMenu = document.getElementById('sidebar-templates-menu');
  if (calMenu) calMenu.classList.toggle('hidden', activeModule !== 'calendar');
  if (tplMenu) tplMenu.classList.toggle('hidden', activeModule !== 'templates');

  // ── 主内容区模块切换 ─────────────────────────────────────────
  const viewRef = document.getElementById('view-reference');
  const viewCal = document.getElementById('view-calendar');
  const viewTpl = document.getElementById('view-templates');
  if (viewRef) viewRef.classList.toggle('hidden', activeModule !== 'reference');
  if (viewCal) viewCal.classList.toggle('hidden', activeModule !== 'calendar');
  if (viewTpl) viewTpl.classList.toggle('hidden', activeModule !== 'templates');

  // ── 状态 Pill（反映服务层状态）──────────────────────────────
  const dot = document.getElementById('status-dot');
  const txt = document.getElementById('status-text');
  if (dot && txt) {
    if (status === STATE.LOADING) {
      dot.className = 'w-1.5 h-1.5 rounded-full bg-blue-300';
      txt.textContent = '加载中…';
    } else if (status === STATE.SUBMITTING) {
      dot.className = 'w-1.5 h-1.5 rounded-full bg-yellow-300';
      txt.textContent = '云端推演中…';
    } else if (status === STATE.ERROR) {
      dot.className = 'w-1.5 h-1.5 rounded-full bg-red-400';
      txt.textContent = error ? error.type || '错误' : '错误';
    } else if (status === STATE.SUCCESS) {
      dot.className = 'w-1.5 h-1.5 rounded-full bg-green-300';
      txt.textContent = '已同步';
    } else {
      dot.className = 'w-1.5 h-1.5 rounded-full bg-green-300';
      txt.textContent = '状态机 v8.5';
    }
  }

  // ── 推演工作台：月份选择器 & 日历 & 检查器状态路由 ───────────
  if (activeModule === 'calendar') {
    // 侧边栏 RBAC 按钮激活态
    const calMenuEl = document.getElementById('sidebar-calendar-menu');
    if (calMenuEl) {
      calMenuEl.querySelectorAll('.role-btn[data-role]').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.role === state.managementRole);
      });
    }
    const targetMonth = populateMonthSelector(state.activities);
    renderCalendarByActivities(state.activities, targetMonth);
    renderInspectorFromState(state);
  }

  if (activeModule !== 'reference') return;

  // ── 以下仅参考指南模块需要 ─────────────────────────────────

  // 1. 顶层领域按钮激活态
  document.querySelectorAll('.domain-btn[data-domain]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.domain === domain);
  });

  // 2. 角色按钮激活态
  document.querySelectorAll('.role-btn[data-role]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.role === role);
  });

  // 3. 标题区更新
  const activeRoleBtn = document.querySelector(`.role-btn[data-role="${role}"]`);
  if (activeRoleBtn) {
    const hl = document.getElementById('role-headline');
    const sl = document.getElementById('role-subline');
    if (hl) hl.textContent = activeRoleBtn.dataset.headline || '';
    if (sl) sl.textContent = activeRoleBtn.dataset.subline || '';
  }

  // 4. 场景标题行 — 仅按 domain 过滤
  document.querySelectorAll('.scenario-header[data-domain]').forEach(hdr => {
    if (hdr.dataset.domain === domain) {
      enterEl(hdr);
    } else {
      leaveEl(hdr);
    }
  });

  // 5. 时间轴节点 — 按 domain + role 过滤
  document.querySelectorAll('.timeline-node[data-domain]').forEach(node => {
    const domainMatch = node.dataset.domain === domain;
    const nodeRole    = node.dataset.role || 'all';
    const roleMatch   = role === 'all' || nodeRole === role || nodeRole === 'all';

    if (domainMatch && roleMatch) {
      enterEl(node);
    } else {
      leaveEl(node);
    }
  });
}

// ════════════════════════════════════════════════════════════════
//  SOP 推演引擎
// ════════════════════════════════════════════════════════════════
function instantiateSOP(scenarioIdArray, targetDateStr) {
  const baseDate = new Date(targetDateStr + 'T00:00:00');
  const results  = [];
  sopDatabase.scenarios.forEach(sc => {
    if (!scenarioIdArray.includes(sc.scenarioId)) return;
    sc.tasks.forEach(task => {
      if (task.timeOffset === null) return;
      const d = new Date(baseDate);
      d.setDate(d.getDate() + task.timeOffset);
      results.push({
        scenarioId:    sc.scenarioId,
        scenarioTitle: sc.title,
        taskId:        task.taskId,
        title:         task.title,
        executor:      task.executor,
        supervisor:    task.supervisor,
        timeOffset:    task.timeOffset,
        desc:          task.desc || '',
        date:          d,
      });
    });
  });
  results.sort((a, b) => a.date - b.date);
  return results;
}

// ════════════════════════════════════════════════════════════════
//  日历渲染
// ════════════════════════════════════════════════════════════════
function _pad(n) { return n < 10 ? '0' + n : '' + n; }
function _fmtDate(d) {
  return d.getFullYear() + '-' + _pad(d.getMonth() + 1) + '-' + _pad(d.getDate());
}
function _fmtChinese(d) {
  const DN = ['日','一','二','三','四','五','六'];
  return d.getFullYear() + '年' + (d.getMonth() + 1) + '月' + d.getDate() + '日（周' + DN[d.getDay()] + '）';
}

function renderLargeCalendar(tasks, baseDate, activities) {
  const grid  = document.getElementById('cal-main-grid');
  const empty = document.getElementById('cal-main-empty');
  if (!grid) return;
  if (tasks.length === 0) {
    if (empty) empty.classList.remove('hidden');
    grid.classList.add('hidden');
    return;
  }
  if (empty) empty.classList.add('hidden');
  grid.classList.remove('hidden');

  // SOP 任务日期映射（日历标签用）
  const taskMap = {};
  tasks.forEach(t => {
    const k = _fmtDate(t.date);
    if (!taskMap[k]) taskMap[k] = [];
    taskMap[k].push(t);
  });

  // 活动日期集合（未归档，用于红点标记）
  const activityDates = new Set(
    (activities || appState.activities)
      .filter(a => !a.archived && typeof a.date === 'string' && a.date.length >= 7)
      .map(a => a.date)
  );

  const sy = tasks[0].date.getFullYear(), sm = tasks[0].date.getMonth();
  const ey = tasks[tasks.length - 1].date.getFullYear(), em = tasks[tasks.length - 1].date.getMonth();
  let html = '', y = sy, m = sm;
  while (y < ey || (y === ey && m <= em)) {
    html += _renderLargeMonth(y, m, taskMap, baseDate, activityDates);
    m++;
    if (m > 11) { m = 0; y++; }
  }
  grid.innerHTML = html;

  grid.querySelectorAll('.cal-cell-large.has-tasks').forEach(cell => {
    cell.addEventListener('click', () => {
      grid.querySelectorAll('.cal-cell-large.selected').forEach(c => c.classList.remove('selected'));
      cell.classList.add('selected');
      // 更新状态 → 触发 renderUI → renderInspectorFromState
      setState({ selectedDate: cell.dataset.date, viewMode: 'list', selectedActivityId: null });
    });
  });
}

function _renderLargeMonth(year, month, taskMap, baseDate, activityDates) {
  const MN = ['一月','二月','三月','四月','五月','六月','七月','八月','九月','十月','十一月','十二月'];
  const DN = ['一','二','三','四','五','六','日'];
  const rawFirst = new Date(year, month, 1).getDay();
  const firstDow = (rawFirst + 6) % 7;
  const days     = new Date(year, month + 1, 0).getDate();
  const todayKey = _fmtDate(new Date());
  const baseKey  = _fmtDate(baseDate);
  const actDates = activityDates || new Set();

  let h = `<div class="mb-6"><div class="font-stheiti text-sm font-bold text-gray-700 mb-3 pb-2 border-b border-gray-100">${year}年 ${MN[month]}</div><div style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px;">`;
  DN.forEach(d => { h += `<div class="font-stheiti text-[11px] text-gray-400 text-center pb-1.5 font-semibold">${d}</div>`; });
  for (let i = 0; i < firstDow; i++) {
    h += '<div class="cal-cell-large" style="background:transparent;border-color:transparent;"></div>';
  }
  for (let day = 1; day <= days; day++) {
    const k   = _fmtDate(new Date(year, month, day));
    const isT = k === todayKey;
    const isB = k === baseKey;
    const ct  = taskMap[k] || [];
    const hasActivity = actDates.has(k);
    let cls   = 'cal-cell-large';
    if (ct.length > 0 || hasActivity) cls += ' has-tasks';
    if (isT)                           cls += ' is-today';
    if (isB)                           cls += ' is-base';
    h += `<div class="${cls}" data-date="${k}">`;
    h += `<div class="font-stheiti text-[11px] font-semibold mb-1 ${isT ? 'text-red-600' : 'text-gray-600'}">${day}</div>`;
    if (isB) h += '<div class="font-stheiti text-[9px] font-bold leading-none mb-1" style="color:#CE1126;">T-0</div>';
    if (hasActivity && ct.length === 0) {
      h += '<div class="font-stheiti text-[9px] font-bold leading-none mb-1" style="color:#CE1126;">● 活动</div>';
    }
    ct.slice(0, 3).forEach(t => {
      const c = ROLE_COLORS[t.executor] || ROLE_COLORS.all;
      h += `<div class="cal-task-tag" style="background:${c.bg};color:${c.text};border:1px solid ${c.border};"><span class="task-dot" style="background:${c.text};"></span><span class="truncate">${t.title}</span></div>`;
    });
    if (ct.length > 3) h += `<div class="font-stheiti text-[9px] text-gray-400 mt-0.5">+${ct.length - 3} 项</div>`;
    h += '</div>';
  }
  h += '</div></div>';
  return h;
}

// ════════════════════════════════════════════════════════════════
//  动态日历渲染引擎 — 按月份 + 活动红点映射
//  取代静态 renderLargeCalendar，由 renderUI 驱动
// ════════════════════════════════════════════════════════════════
function renderCalendarByActivities(activities, targetMonth) {
  const grid  = document.getElementById('cal-main-grid');
  const empty = document.getElementById('cal-main-empty');
  if (!grid) return;

  // 有效月份
  const now = new Date();
  const month = targetMonth || _currentYearMonth();
  const [y, m] = month.split('-').map(Number);

  // 未归档活动 → 活动日期集合（当月）
  const actDates = new Set(
    (activities || [])
      .filter(a => !a.archived && typeof a.date === 'string' && a.date.startsWith(month))
      .map(a => a.date)
  );

  // appState.tasks（字符串日期）→ 按日期分组（当月）
  const tasksByDate = {};
  (appState.tasks || []).forEach(t => {
    if (t.date && typeof t.date === 'string' && t.date.startsWith(month)) {
      if (!tasksByDate[t.date]) tasksByDate[t.date] = [];
      tasksByDate[t.date].push(t);
    }
  });

  // 始终显示日历网格（即使当月无数据）
  if (empty) empty.classList.add('hidden');
  grid.classList.remove('hidden');

  const todayKey = _fmtDate(now);
  const MN = ['一月','二月','三月','四月','五月','六月','七月','八月','九月','十月','十一月','十二月'];
  const DN = ['一','二','三','四','五','六','日'];
  const rawFirst = new Date(y, m - 1, 1).getDay();
  const firstDow = (rawFirst + 6) % 7;
  const daysInMonth = new Date(y, m, 0).getDate();

  let html = `<div class="mb-6">`;
  html += `<div class="font-stheiti text-sm font-bold text-gray-700 mb-3 pb-2 border-b border-gray-100">${y}年 ${MN[m - 1]}</div>`;
  html += `<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px;">`;
  DN.forEach(d => {
    html += `<div class="font-stheiti text-[11px] text-gray-400 text-center pb-1.5 font-semibold">${d}</div>`;
  });
  // 前置空格
  for (let i = 0; i < firstDow; i++) {
    html += '<div class="cal-cell-large" style="background:transparent;border-color:transparent;"></div>';
  }
  // 日期格子
  for (let day = 1; day <= daysInMonth; day++) {
    const k = `${month}-${String(day).padStart(2, '0')}`;
    const isT = k === todayKey;
    const ct = tasksByDate[k] || [];
    const hasActivity = actDates.has(k);
    let cls = 'cal-cell-large';
    if (ct.length > 0 || hasActivity) cls += ' has-tasks';
    if (isT) cls += ' is-today';

    html += `<div class="${cls}" data-date="${k}">`;
    html += `<div class="font-stheiti text-[11px] font-semibold mb-1 ${isT ? 'text-red-600' : 'text-gray-600'}">${day}</div>`;
    // 活动红点
    if (hasActivity) {
      html += '<div class="w-1.5 h-1.5 bg-red-500 rounded-full mx-auto mt-0.5 mb-0.5"></div>';
    }
    // 任务标签
    ct.slice(0, 3).forEach(t => {
      const c = ROLE_COLORS[t.executor] || ROLE_COLORS.all;
      html += `<div class="cal-task-tag" style="background:${c.bg};color:${c.text};border:1px solid ${c.border};">` +
              `<span class="task-dot" style="background:${c.text};"></span>` +
              `<span class="truncate">${t.title}</span></div>`;
    });
    if (ct.length > 3) html += `<div class="font-stheiti text-[9px] text-gray-400 mt-0.5">+${ct.length - 3} 项</div>`;
    html += '</div>';
  }
  html += '</div></div>';
  grid.innerHTML = html;

  // 绑定有任务/活动格子的点击
  grid.querySelectorAll('.cal-cell-large.has-tasks').forEach(cell => {
    cell.addEventListener('click', () => {
      grid.querySelectorAll('.cal-cell-large.selected').forEach(c => c.classList.remove('selected'));
      cell.classList.add('selected');
      setState({ selectedDate: cell.dataset.date, viewMode: 'list', selectedActivityId: null });
    });
  });
}


function renderInspector(tasks, dateKey) {
  const defEl     = document.getElementById('inspector-default');
  const contentEl = document.getElementById('inspector-content');
  const titleEl   = document.getElementById('inspector-date-title');
  const cardsEl   = document.getElementById('inspector-cards');
  if (!defEl || !contentEl) return;

  if (!tasks || tasks.length === 0) {
    defEl.classList.remove('hidden');
    contentEl.classList.add('hidden');
    return;
  }

  defEl.classList.add('hidden');
  contentEl.classList.remove('hidden');

  if (titleEl) titleEl.textContent = _fmtChinese(new Date(dateKey + 'T00:00:00'));

  let html = '';
  tasks.forEach(t => {
    const exColor  = ROLE_COLORS[t.executor]  || ROLE_COLORS.all;
    const supColor = t.supervisor ? (ROLE_COLORS[t.supervisor] || ROLE_COLORS.all) : null;
    const exLabel  = ROLE_LABELS[t.executor]  || t.executor;
    const supLabel = t.supervisor ? (ROLE_LABELS[t.supervisor] || t.supervisor) : null;
    const offsetLabel = t.timeOffset === 0 ? '活动当日（T-0）'
                      : t.timeOffset >  0  ? `T+${t.timeOffset} 天后`
                      :                       `T${t.timeOffset} 天前`;

    html += '<div class="inspector-card">';
    html += `<div class="flex items-start justify-between gap-2 mb-2"><p class="font-stheiti font-bold text-sm text-gray-800 leading-snug flex-1">${t.title}</p><span class="badge-time flex-shrink-0">${offsetLabel}</span></div>`;
    html += `<p class="font-stheiti text-[10px] text-gray-400 mb-1">${t.scenarioTitle}</p>`;
    html += '<div class="flex items-center gap-1.5 flex-wrap mb-2">';
    html += `<span class="inline-block px-2 py-0.5 rounded-full font-stheiti text-[11px] font-semibold" style="background:${exColor.bg};color:${exColor.text};border:1px solid ${exColor.border};">🏃 执行：${exLabel}</span>`;
    if (supLabel) {
      html += `<span class="inline-block px-2 py-0.5 rounded-full font-stheiti text-[11px] font-semibold" style="background:${supColor.bg};color:${supColor.text};border:1px solid ${supColor.border};">👁 督办：${supLabel}</span>`;
    }
    html += '</div>';
    if (t.desc) {
      html += `<p class="font-stheiti text-xs text-gray-600 leading-relaxed border-t border-gray-50 pt-2 mt-1">${t.desc}</p>`;
    }
    html += '</div>';
  });
  if (cardsEl) cardsEl.innerHTML = html;
}


// ════════════════════════════════════════════════════════════════
//  月份选择器：提取活动月份并填充 #month-selector
//  返回当前有效的显示月份 (YYYY-MM)
// ════════════════════════════════════════════════════════════════
let _monthSelectorBound = false;

function populateMonthSelector(activities) {
  const sel = document.getElementById('month-selector');
  const currentMonth = _currentYearMonth();
  if (!sel) return appState.displayMonth || currentMonth;

  // 提取未归档活动的 YYYY-MM，去重倒序
  const months = [...new Set(
    activities
      .filter(a => !a.archived && typeof a.date === 'string' && a.date.length >= 7)
      .map(a => a.date.slice(0, 7))
  )].sort().reverse();

  // 仅在数据变化时重建选项
  const existing = [...sel.options].slice(1).map(o => o.value);
  const changed = months.length !== existing.length || months.some((m, i) => m !== existing[i]);
  if (changed) {
    const prev = sel.value;
    sel.innerHTML = '<option value="">全部月份</option>';
    months.forEach(m => {
      const opt = document.createElement('option');
      opt.value = m;
      opt.textContent = m;
      sel.appendChild(opt);
    });
    // 自动选中：恢复之前的选择 > 最新有活动的月份 > 留空（当前月）
    if (months.includes(prev)) {
      sel.value = prev;
    } else if (months.includes(appState.displayMonth)) {
      sel.value = appState.displayMonth;
    } else if (months.length > 0) {
      sel.value = months[0]; // 最新的有活动的月份
    }
  }

  // 绑定 change 事件（只绑一次）
  if (!_monthSelectorBound) {
    _monthSelectorBound = true;
    sel.addEventListener('change', () => {
      const selectedMonth = sel.value || currentMonth;
      if (sel.value) {
        const t0 = document.getElementById('t0-input-cal');
        if (t0) t0.value = sel.value + '-01';
      }
      // 切换月份 → 更新显示月份，重置日期选择与视图模式
      setState({ displayMonth: selectedMonth, selectedDate: null, viewMode: 'list', selectedActivityId: null });
    });
  }

  return sel.value || appState.displayMonth || currentMonth;
}

// ════════════════════════════════════════════════════════════════
//  RBAC 任务过滤核
//  commissioner 系列：兼容多种 executor/supervisor 字符串
// ════════════════════════════════════════════════════════════════
const COMMISSIONER_ROLES = new Set([
  'commissioner', 'org-commissioner', 'prop-commissioner', 'disc-commissioner',
]);

function filterTasksByManagementRole(tasks, managementRole) {
  if (managementRole === 'participant' || !managementRole) return tasks;
  return tasks.filter(t => {
    const ex  = t.executor  || '';
    const sup = t.supervisor || '';
    if (managementRole === 'commissioner') {
      return COMMISSIONER_ROLES.has(ex) || COMMISSIONER_ROLES.has(sup);
    }
    return ex === managementRole || sup === managementRole;
  });
}

// 角色 → CSS 主题类名映射
const ROLE_THEME_CLASS = {
  leader:       'role-theme-leader',
  commissioner: 'role-theme-commissioner',
  organizer:    'role-theme-organizer',
  deep:         'role-theme-deep',
};

// ════════════════════════════════════════════════════════════════
//  检查器状态路由分发（根据 viewMode / viewType 切换 List / Detail）
// ════════════════════════════════════════════════════════════════
function renderInspectorFromState(state) {
  if (state.viewMode === 'detail' && state.selectedActivityId && state.viewType === 'manager') {
    const act = state.activities.find(a => a.id === state.selectedActivityId);
    if (act) {
      const actTasks = state.tasks.filter(t => t.activityId === act.id);
      renderInspectorDetail(act, actTasks, state.managementRole);
    } else {
      renderInspectorList(state.activities, state.selectedDate, state.viewType);
    }
  } else {
    renderInspectorList(state.activities, state.selectedDate, state.viewType);
  }
}

// ════════════════════════════════════════════════════════════════
//  列表视图：渲染指定日期的未归档活动列表
// ════════════════════════════════════════════════════════════════
function renderInspectorList(activities, dateKey, viewType) {
  const defEl     = document.getElementById('inspector-default');
  const contentEl = document.getElementById('inspector-content');
  const titleEl   = document.getElementById('inspector-date-title');
  const cardsEl   = document.getElementById('inspector-cards');
  if (!defEl || !contentEl) return;

  const dateActivities = dateKey
    ? activities.filter(a => !a.archived && a.date === dateKey)
    : [];

  if (dateActivities.length === 0) {
    defEl.classList.remove('hidden');
    contentEl.classList.add('hidden');
    return;
  }

  defEl.classList.add('hidden');
  contentEl.classList.remove('hidden');

  if (titleEl) {
    titleEl.textContent = _fmtChinese(new Date(dateKey + 'T00:00:00')) + ' · 活动列表';
  }

  // 参与者视界：卡片纯展示，禁止进入详情
  const isParticipant = viewType === 'participant' || !viewType;

  const statusMap = { draft: '草稿', published: '已发布', ongoing: '进行中', completed: '已完成' };
  let html = '';
  dateActivities.forEach(act => {
    const label = statusMap[act.status] || act.status;
    if (isParticipant) {
      html += `<div class="inspector-card" data-act-id="${act.id}">`;
      html += `<div class="flex items-start justify-between gap-2 mb-1">`;
      html += `<p class="font-stheiti font-bold text-sm text-gray-800 leading-snug flex-1">${act.title}</p>`;
      html += `<span class="badge-time flex-shrink-0">${label}</span>`;
      html += '</div>';
      html += '<p class="font-stheiti text-[10px] text-gray-400">👀 参与视图 · 仅展示</p>';
      html += '</div>';
    } else {
      html += `<div class="inspector-card" style="cursor:pointer;" data-act-id="${act.id}">`;
      html += `<div class="flex items-start justify-between gap-2 mb-1">`;
      html += `<p class="font-stheiti font-bold text-sm text-gray-800 leading-snug flex-1">${act.title}</p>`;
      html += `<span class="badge-time flex-shrink-0">${label}</span>`;
      html += '</div>';
      html += '<p class="font-stheiti text-[10px] text-gray-400">点击查看任务详情 →</p>';
      html += '</div>';
    }
  });

  if (cardsEl) {
    cardsEl.innerHTML = html;
    if (!isParticipant) {
      cardsEl.querySelectorAll('[data-act-id]').forEach(card => {
        card.addEventListener('click', () => {
          setState({ viewMode: 'detail', selectedActivityId: card.dataset.actId });
        });
      });
    } else {
      cardsEl.querySelectorAll('[data-act-id]').forEach(card => {
        card.addEventListener('click', () => {
          showToast('info', '提示：详情任务节点仅管理视图可见，请在左侧切换管理角色。');
        });
      });
    }
  }
}

// ════════════════════════════════════════════════════════════════
//  详情视图：渲染单个活动的任务列表与危险操作按钮
// ════════════════════════════════════════════════════════════════
function renderInspectorDetail(activity, tasks, managementRole) {
  const defEl     = document.getElementById('inspector-default');
  const contentEl = document.getElementById('inspector-content');
  const titleEl   = document.getElementById('inspector-date-title');
  const cardsEl   = document.getElementById('inspector-cards');
  if (!defEl || !contentEl) return;

  defEl.classList.add('hidden');
  contentEl.classList.remove('hidden');

  if (titleEl) titleEl.textContent = activity.title;

  const statusMap = { draft: '草稿', published: '已发布', ongoing: '进行中', completed: '已完成' };
  const taskStatusMap = { pending: '待处理', in_progress: '进行中', completed: '已完成' };

  // RBAC 过滤：根据 managementRole 筛选可见任务
  const visibleTasks = filterTasksByManagementRole(tasks, managementRole);
  const themeClass   = ROLE_THEME_CLASS[managementRole] || '';

  let html = '';

  // 返回列表按钮
  html += '<button id="inspector-back-btn"'
    + ' class="font-stheiti text-xs text-red-700 hover:text-red-900 mb-3'
    + ' flex items-center gap-1 transition-colors"'
    + ' style="background:none;border:none;cursor:pointer;padding:0;">'
    + '← 返回列表</button>';

  // 活动元信息
  html += '<div class="flex items-center gap-1.5 flex-wrap mb-3">';
  html += `<span class="badge-time">${statusMap[activity.status] || activity.status}</span>`;
  if (activity.date) {
    html += `<span class="font-stheiti text-[10px] text-gray-400">${activity.date}</span>`;
  }
  html += '</div>';

  // 任务列表（RBAC 过滤后）
  if (visibleTasks.length > 0) {
    visibleTasks.forEach(t => {
      const tlabel = taskStatusMap[t.status] || t.status;
      const cardClass = themeClass ? `inspector-card ${themeClass}` : 'inspector-card';
      html += `<div class="${cardClass}" style="${themeClass ? 'border-left-width:3px;' : ''}">`;
      html += `<div class="flex items-start justify-between gap-2 mb-1">`;
      html += `<p class="font-stheiti font-bold text-sm leading-snug flex-1">${t.title}</p>`;
      html += `<span class="badge-time flex-shrink-0">${tlabel}</span>`;
      html += '</div>';
      html += '</div>';
    });
  } else if (tasks.length > 0) {
    // 有任务但过滤后为空 → 角色专属空状态
    html += '<div class="font-stheiti text-gray-400 text-center py-8">该角色在此活动中暂无专属任务节点</div>';
  } else {
    html += '<p class="font-stheiti text-xs text-gray-400 py-2">暂无关联任务</p>';
  }

  // 危险操作区
  html += '<div class="flex gap-2 mt-4 pt-3 border-t border-gray-100">';
  html += '<button id="inspector-archive-btn"'
    + ' class="font-stheiti text-xs text-amber-700 hover:text-amber-900 px-3 py-1.5 rounded-lg transition-colors"'
    + ' style="background:rgba(251,191,36,0.10);border:1px solid rgba(251,191,36,0.40);">归档活动</button>';
  html += '<button id="inspector-delete-btn"'
    + ' class="font-stheiti text-xs text-red-700 hover:text-red-900 px-3 py-1.5 rounded-lg transition-colors"'
    + ' style="background:rgba(239,68,68,0.10);border:1px solid rgba(239,68,68,0.40);">删除活动</button>';
  html += '</div>';

  if (!cardsEl) return;
  cardsEl.innerHTML = html;

  // 返回按钮
  const backBtn = document.getElementById('inspector-back-btn');
  if (backBtn) {
    backBtn.addEventListener('click', () => {
      setState({ viewMode: 'list', selectedActivityId: null });
    });
  }

  // 归档活动
  const archiveBtn = document.getElementById('inspector-archive-btn');
  if (archiveBtn) {
    archiveBtn.addEventListener('click', async () => {
      if (!window.confirm('确认归档该活动？它将从主视图消失。')) return;
      try {
        setState({ status: STATE.SUBMITTING });
        await BranchService.archiveActivity(activity.id);
        const [activities, tasks2] = await Promise.all([
          BranchService.listActivities(),
          typeof BranchService.listTasks === 'function' ? BranchService.listTasks() : Promise.resolve([]),
        ]);
        setState({ status: STATE.IDLE, activities, tasks: tasks2, viewMode: 'list', selectedActivityId: null });
        showToast('success', '活动已归档。');
      } catch (err) {
        setState({ status: STATE.ERROR, error: err });
        showToast('error', (err && err.message) ? err.message : '归档失败，请稍后重试。');
      }
    });
  }

  // 删除活动
  const deleteBtn = document.getElementById('inspector-delete-btn');
  if (deleteBtn) {
    deleteBtn.addEventListener('click', async () => {
      if (!window.confirm('警告：彻底删除该活动及关联数据？')) return;
      try {
        setState({ status: STATE.SUBMITTING });
        await BranchService.deleteActivity(activity.id);
        const [activities, tasks2] = await Promise.all([
          BranchService.listActivities(),
          typeof BranchService.listTasks === 'function' ? BranchService.listTasks() : Promise.resolve([]),
        ]);
        setState({ status: STATE.IDLE, activities, tasks: tasks2, viewMode: 'list', selectedActivityId: null });
        showToast('success', '活动已删除。');
      } catch (err) {
        setState({ status: STATE.ERROR, error: err });
        showToast('error', (err && err.message) ? err.message : '删除失败，请稍后重试。');
      }
    });
  }
}

// ════════════════════════════════════════════════════════════════
//  侧边栏统一状态机（CSS Transform 驱动）
// ════════════════════════════════════════════════════════════════
const sidebar = document.getElementById('sidebar-main');
const overlay = document.getElementById('sidebar-overlay');

function openSidebar() {
  if (!sidebar) return;
  sidebar.classList.remove('sidebar-collapsed');
  if (overlay) overlay.classList.add('visible');
}

function closeSidebar() {
  if (!sidebar) return;
  sidebar.classList.add('sidebar-collapsed');
  if (overlay) overlay.classList.remove('visible');
}

function toggleSidebar() {
  if (sidebar && sidebar.classList.contains('sidebar-collapsed')) {
    openSidebar();
  } else {
    closeSidebar();
  }
}

// 初始状态：桌面端展开，移动端收起
if (window.innerWidth < 768) {
  closeSidebar();
} else {
  openSidebar();
}

const hamburgerBtn = document.getElementById('hamburger-btn');
if (hamburgerBtn) hamburgerBtn.addEventListener('click', toggleSidebar);
if (overlay) overlay.addEventListener('click', closeSidebar);

// ════════════════════════════════════════════════════════════════
//  事件绑定
// ════════════════════════════════════════════════════════════════

// 模块 Tab 点击
document.querySelectorAll('.module-tab[data-module]').forEach(tab => {
  tab.addEventListener('click', () => {
    setState({ activeModule: tab.dataset.module });
    closeSidebar(); // 移动端选模块后收起侧边栏
  });
});

// 领域按钮
document.querySelectorAll('.domain-btn[data-domain]').forEach(btn => {
  btn.addEventListener('click', () => {
    setState({ domain: btn.dataset.domain });
  });
});

// 角色按钮（参考指南模块）
document.querySelectorAll('.role-btn[data-role]').forEach(btn => {
  btn.addEventListener('click', () => {
    setState({ role: btn.dataset.role });
    closeSidebar(); // 移动端选角色后收起侧边栏
  });
});

// ── 推演工作台侧边栏 RBAC 角色按钮分发 ──────────────────────────
const calMenu = document.getElementById('sidebar-calendar-menu');
if (calMenu) {
  calMenu.querySelectorAll('.role-btn[data-role]').forEach(btn => {
    btn.addEventListener('click', () => {
      const r = btn.dataset.role;
      if (r === 'participant') {
        // 参与者视界：锁定只读，清除选中状态
        setState({
          viewType:       'participant',
          managementRole: 'participant',
          viewMode:       'list',
          selectedActivityId: null,
        });
      } else {
        // 管理视界：进入对应角色的 RBAC 过滤详情
        const patch = {
          viewType:       'manager',
          managementRole: r,
        };
        // 若已在 detail 视图则保留，否则不强制跳转
        if (appState.viewMode === 'detail' && appState.selectedActivityId) {
          // 刷新 detail（renderUI 会自动重新调用 renderInspectorFromState）
        } else {
          // 保持 list 模式，等待用户点击活动卡片
        }
        setState(patch);
      }
      closeSidebar();
    });
  });
}

// 展开/折叠（WWH 区域）
document.querySelectorAll('.js-expand-trigger').forEach(trigger => {
  trigger.addEventListener('click', () => {
    const card = trigger.closest('.tl-card');
    if (!card) return;
    const target  = card.querySelector('.js-expand-target');
    const chevron = trigger.querySelector('.wwh-chevron');
    if (!target) return;
    const isExpanded = target.classList.contains('expanded');
    if (isExpanded) {
      target.classList.remove('expanded');
      if (chevron) chevron.classList.remove('rotated');
    } else {
      target.classList.add('expanded');
      if (chevron) chevron.classList.add('rotated');
    }
  });
});

// ════════════════════════════════════════════════════════════════
//  推演工作台控制台初始化（写入活动 + SOP 任务挂载 + 跳转详情）
// ════════════════════════════════════════════════════════════════
(function initCalendarModule() {
  const genBtn  = document.getElementById('gen-schedule-cal-btn');
  const t0Input = document.getElementById('t0-input-cal');
  if (!genBtn || !t0Input) return;

  // 默认日期为今天
  t0Input.value = _fmtDate(new Date());

  genBtn.addEventListener('click', async () => {
    // 防止连点：SUBMITTING 期间禁止再次触发
    if (appState.status === STATE.SUBMITTING || appState.status === STATE.LOADING) return;

    const dateStr  = t0Input.value;
    if (!dateStr) {
      t0Input.style.borderColor = '#CE1126';
      t0Input.style.boxShadow   = '0 0 0 2px rgba(206,17,38,0.2)';
      setTimeout(() => { t0Input.style.boxShadow = ''; }, 1500);
      return;
    }

    // 读取场景选择器（可选：未找到则默认 org-life）
    const scSelect  = document.getElementById('scenario-select-cal');
    const scVal     = scSelect ? scSelect.value : 'org-life';
    const scIds     = scVal === 'all-timed' ? ['org-life', 'theme-party'] : [scVal];

    // 读取内嵌活动名称输入框
    const nameInput = document.getElementById('activity-name-input');
    const actName = nameInput ? nameInput.value.trim() : '';
    if (!actName) {
      // 输入为空时内联提示，不使用原生弹窗
      if (nameInput) {
        nameInput.focus();
        nameInput.style.boxShadow = '0 0 0 2px rgba(239,68,68,0.55)';
        setTimeout(() => { nameInput.style.boxShadow = ''; }, 1800);
      }
      showToast('error', '请先在「活动名称」输入框中填写活动名称。');
      return;
    }

    // ── 防竞态 ─────────────────────────────────────────────
    const reqId = ++currentRequestId;

    genBtn.disabled = true;
    genBtn.textContent = '写入中…';
    setState({ status: STATE.SUBMITTING, error: null });

    try {
      // Step 1: 创建活动主体，获取 activityId
      const newAct = await BranchService.createActivity({
        title:      actName.trim(),
        domain:     'activity',
        scenarioId: scIds[0],
        date:       dateStr,
        executor:   'organizer',
        createdBy:  'u_exec',
      });

      if (reqId !== currentRequestId) return;

      // Step 2: 实例化 SOP 任务节点，绑定 activityId（并发创建，单任务失败不中断）
      const sopTasks = instantiateSOP(scIds, dateStr);
      const taskResults = await Promise.allSettled(
        sopTasks.map(t => BranchService.createTask({
          activityId: newAct.id,
          title:      t.title,
          status:     'pending',
          executor:   t.executor,
          supervisor: t.supervisor || null,
          timeOffset: t.timeOffset,
          date:       _fmtDate(t.date),
          scenarioId: t.scenarioId,
        }))
      );
      const failedCount = taskResults.filter(r => r.status === 'rejected').length;
      if (failedCount > 0) {
        console.warn(`[initCalendarModule] ${failedCount} 个任务节点创建失败（随机 Mock 错误）`);
      }

      if (reqId !== currentRequestId) return;

      // Step 3: 刷新全局状态，跳转到新建活动的详情视图
      const [activities, tasks] = await Promise.all([
        BranchService.listActivities(),
        typeof BranchService.listTasks === 'function' ? BranchService.listTasks() : Promise.resolve([]),
      ]);
      setState({
        status:             STATE.SUCCESS,
        activities,
        tasks,
        displayMonth:       dateStr.slice(0, 7),  // 跳至活动所在月份
        selectedDate:       dateStr,
        viewMode:           'detail',
        selectedActivityId: newAct.id,
        viewType:           'manager',             // 写入成功后自动进入管理视界以展示任务
        managementRole:     appState.managementRole === 'participant' ? 'organizer' : appState.managementRole,
      });
      showToast('success', `活动「${actName.trim()}」已写入，${sopTasks.length} 个任务节点已挂载。`);
      // 清空活动名称输入框，为下次输入做准备
      if (nameInput) nameInput.value = '';
    } catch (err) {
      if (reqId !== currentRequestId) return;
      setState({ status: STATE.ERROR, error: err });
      showToast('error', (err && err.message) ? err.message : '操作失败，请稍后重试。');
    } finally {
      // 无论成功或失败，恢复按钮文案
      genBtn.disabled = false;
      genBtn.textContent = '写入活动';
    }
  });
}());

// ════════════════════════════════════════════════════════════════
//  启动：初始化状态机
// ════════════════════════════════════════════════════════════════

// 所有节点和场景头初始隐藏
document.querySelectorAll('.timeline-node[data-domain], .scenario-header[data-domain]').forEach(el => {
  el.classList.add('hidden', 'opacity-0', 'translate-y-4');
});

// 显示状态 Pill
const pill = document.getElementById('status-pill');
if (pill) pill.classList.remove('hidden');

// 启动生命周期：加载持久化数据 → 并发拉取 Activities + Tasks → 注入 appState → renderUI
(async function initApp() {
  // 恢复 localStorage 持久化数据（独立 try-catch，失败不阻塞后续初始化）
  try {
    if (typeof BranchService.loadDB === 'function') BranchService.loadDB();
  } catch (e) {
    console.warn('[initApp] loadDB 异常（已忽略，继续初始化）。如果问题持续，请尝试清除本站点的浏览器存储。', e);
  }

  // 初始渲染（LOADING 状态）
  setState({ domain: 'activity', role: 'all', activeModule: 'calendar', status: STATE.LOADING });

  try {
    const [activities, tasks] = await Promise.all([
      BranchService.listActivities(),
      // listTasks 为 v10.0 新增 API；在 USE_MOCK=true 时始终可用
      typeof BranchService.listTasks === 'function' ? BranchService.listTasks() : Promise.resolve([]),
    ]);
    setState({ status: STATE.IDLE, activities, tasks });
  } catch (err) {
    console.warn('[initApp] 初始化加载失败：', err);
    setState({ status: STATE.ERROR, error: err });
  }
}());
