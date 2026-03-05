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
        { taskId: '1a-1', title: '确定会议主题',        executor: 'leader',           supervisor: null,         timeOffset: -7, desc: '条条组长根据支委会部署确定会议主题，确保与年度工作重点一致。' },
        { taskId: '1a-2', title: '会前谈心谈话',        executor: 'leader',           supervisor: null,         timeOffset: -7, desc: '组长与本组党员逐一谈心，了解思想状况，为会议提供信息基础。' },
        { taskId: '1a-3', title: '布置对照检查材料',    executor: 'leader',           supervisor: null,         timeOffset: -7, desc: '通知本组党员提前撰写个人对照检查材料，明确检查角度与格式要求。' },
        { taskId: '1a-4', title: '发布会议通知',        executor: 'leader',           supervisor: null,         timeOffset: -3, desc: '条条组长通过党小组群发送正式会议通知，注明时间、地点、参会要求，必须提前至少3天。' },
        { taskId: '1a-5', title: '签到与刚性考勤',      executor: 'disc-commissioner',supervisor: 'leader',     timeOffset:  0, desc: '执行刚性考勤（三会一课范畴）。事假须提前1天申请；病假可事后补假。缺勤须记录留档。' },
        { taskId: '1a-6', title: '自评互评与组长总结',  executor: 'all',              supervisor: null,         timeOffset:  0, desc: '个人自我批评 → 相互批评（要有辣味，直指问题）→ 条条组长做总结发言。' },
        { taskId: '1a-7', title: '宣传产出（摘要+配图）',executor: 'prop-commissioner',supervisor: 'leader',    timeOffset:  3, desc: '摘要性文字+配图，纳入月度推送。无需逐字记录发言；无需宣传预热。' },
        { taskId: '1a-8', title: '考勤记录与档案归档',  executor: 'disc-commissioner',supervisor: 'leader',     timeOffset:  3, desc: '纪检委员记录考勤并归档（T+3天）；宣传委员归档全部会议材料，含签到表、对照检查材料、会议记录。' },
      ],
    },
    {
      scenarioId: 'theme-party', title: '【活动建设】党小组主题党日活动',
      domain: 'activity', description: '弹性考勤 · 全体支部成员可参与',
      tasks: [
        { taskId: '1b-1', title: '活动发起',              executor: 'organizer',        supervisor: 'leader',     timeOffset: -7, desc: '策划活动方案，确定路径 a（有品牌活动，条条组长主导招募）或路径 b（无现成活动，策划参与成本低且有组织效应的活动）。' },
        { taskId: '1b-2', title: '组长审批',              executor: 'leader',           supervisor: null,         timeOffset: -7, desc: '必须报条条组长审批同意后方可推进。组长评估活动是否符合党支部组织意图，以及资源与时间是否可行。' },
        { taskId: '1b-3', title: '联系块块委员',          executor: 'organizer',        supervisor: 'leader',     timeOffset: -7, desc: '按需联系组织委员（通知）、宣传委员（宣传指导）、纪检委员（考勤督办），说明活动计划与需求。' },
        { taskId: '1b-4', title: '发布活动通知',          executor: 'leader',           supervisor: null,         timeOffset: -2, desc: '条条组长通过党小组群发布本组活动通知；外出活动提前2天完成建群并确保所有人员到位。' },
        { taskId: '1b-5', title: '考勤督办（微信备忘录）',executor: 'disc-commissioner',supervisor: 'leader',     timeOffset: -2, desc: '邀请纪检委员加入活动小群，在群内发送标准化微信备忘录，说明考勤要求与复盘底线。' },
        { taskId: '1b-6', title: '活动实施',              executor: 'organizer',        supervisor: 'leader',     timeOffset:  0, desc: '组织者全程负责。核查清单：签到 · 现场拍照（全景/互动/细节各至少1张）· 关键发言记录 · 活动结束前确认材料收齐。' },
        { taskId: '1b-7', title: '活动复盘',              executor: 'organizer',        supervisor: 'leader',     timeOffset:  7, desc: '完成活动复盘（积极分子可代完成，但条条组长须起指导作用）。参考：《活动复盘模板》。' },
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
      domain: 'organization', description: '主导角色：块块委员',
      tasks: [
        { taskId: '2-1', title: '起草制度初稿',                 executor: 'org-commissioner', supervisor: 'leader', timeOffset: null },
        { taskId: '2-2', title: '本组试点征求初步意见',         executor: 'org-commissioner', supervisor: 'leader', timeOffset: null },
        { taskId: '2-3', title: '条条组长征求各组意见',         executor: 'leader',           supervisor: null,     timeOffset: null },
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
  commissioner:        '块块委员',
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

function renderLargeCalendar(tasks, baseDate) {
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

  const taskMap = {};
  tasks.forEach(t => {
    const k = _fmtDate(t.date);
    if (!taskMap[k]) taskMap[k] = [];
    taskMap[k].push(t);
  });

  const sy = tasks[0].date.getFullYear(), sm = tasks[0].date.getMonth();
  const ey = tasks[tasks.length - 1].date.getFullYear(), em = tasks[tasks.length - 1].date.getMonth();
  let html = '', y = sy, m = sm;
  while (y < ey || (y === ey && m <= em)) {
    html += _renderLargeMonth(y, m, taskMap, baseDate);
    m++;
    if (m > 11) { m = 0; y++; }
  }
  grid.innerHTML = html;

  grid.querySelectorAll('.cal-cell-large.has-tasks').forEach(cell => {
    cell.addEventListener('click', () => {
      grid.querySelectorAll('.cal-cell-large.selected').forEach(c => c.classList.remove('selected'));
      cell.classList.add('selected');
      renderInspector(taskMap[cell.dataset.date] || [], cell.dataset.date);
    });
  });
}

function _renderLargeMonth(year, month, taskMap, baseDate) {
  const MN = ['一月','二月','三月','四月','五月','六月','七月','八月','九月','十月','十一月','十二月'];
  const DN = ['一','二','三','四','五','六','日'];
  const rawFirst = new Date(year, month, 1).getDay();
  const firstDow = (rawFirst + 6) % 7;
  const days     = new Date(year, month + 1, 0).getDate();
  const todayKey = _fmtDate(new Date());
  const baseKey  = _fmtDate(baseDate);

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
    let cls   = 'cal-cell-large';
    if (ct.length > 0) cls += ' has-tasks';
    if (isT)           cls += ' is-today';
    if (isB)           cls += ' is-base';
    h += `<div class="${cls}" data-date="${k}">`;
    h += `<div class="font-stheiti text-[11px] font-semibold mb-1 ${isT ? 'text-red-600' : 'text-gray-600'}">${day}</div>`;
    if (isB) h += '<div class="font-stheiti text-[9px] font-bold leading-none mb-1" style="color:#CE1126;">T-0</div>';
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
//  检查器面板渲染（执行 vs 督办 拆分展示，WWH 保留）
// ════════════════════════════════════════════════════════════════
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

// 角色按钮
document.querySelectorAll('.role-btn[data-role]').forEach(btn => {
  btn.addEventListener('click', () => {
    setState({ role: btn.dataset.role, activeModule: 'reference' });
    closeSidebar(); // 移动端选角色后收起侧边栏
  });
});

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
//  推演工作台控制台初始化（含防竞态 createActivity 示例）
// ════════════════════════════════════════════════════════════════
(function initCalendarModule() {
  const genBtn   = document.getElementById('gen-schedule-cal-btn');
  const t0Input  = document.getElementById('t0-input-cal');
  const scSelect = document.getElementById('scenario-select-cal');
  if (!genBtn) return;

  // 默认日期为今天
  t0Input.value = _fmtDate(new Date());

  genBtn.addEventListener('click', async () => {
    // 防止连点：SUBMITTING 期间禁止再次触发
    if (appState.status === STATE.SUBMITTING || appState.status === STATE.LOADING) return;

    const dateStr = t0Input.value;
    if (!dateStr) {
      t0Input.style.borderColor = '#CE1126';
      t0Input.style.boxShadow   = '0 0 0 2px rgba(206,17,38,0.2)';
      setTimeout(() => { t0Input.style.boxShadow = ''; }, 1500);
      return;
    }

    const scVal    = scSelect.value;
    const scIds    = scVal === 'all-timed' ? ['org-life', 'theme-party'] : [scVal];
    const tasks    = instantiateSOP(scIds, dateStr);
    const baseDate = new Date(dateStr + 'T00:00:00');

    // ── 防竞态 createActivity ─────────────────────────────────
    const reqId = ++currentRequestId;

    // 按钮 disabled + 文案变更
    genBtn.disabled = true;
    genBtn.textContent = '云端推演中…';
    setState({ status: STATE.SUBMITTING, error: null });

    try {
      await BranchService.createActivity({
        title:      `${scIds.join('+')} 排期`,
        domain:     'activity',
        scenarioId: scIds[0],
        date:       dateStr,
        executor:   'organizer',
        createdBy:  'u_exec',
      });

      if (reqId !== currentRequestId) return; // 过期请求，丢弃
      setState({ status: STATE.SUCCESS, activities: [...appState.activities] });
      showToast('success', '推演排期已生成，活动已记录。');
    } catch (err) {
      if (reqId !== currentRequestId) return;
      setState({ status: STATE.ERROR, error: err });
      showToast('error', (err && err.message) ? err.message : '操作失败，请稍后重试。');
    } finally {
      // 无论成功或失败，恢复按钮
      genBtn.disabled = false;
      genBtn.textContent = '生成排期';
    }

    // 清空检查器，渲染日历
    renderInspector([], null);
    renderLargeCalendar(tasks, baseDate);
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
