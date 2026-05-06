// role: [人机]
// workspace-entry.js — 党建工作台独立入口
// 权限对齐 ROADMAP §0.2A:
//   活动写入: 仅 secretary / leader
//   专班招募: 仅 secretary / org-commissioner
//   专班发起: secretary / leader / org-commissioner / prop-commissioner / disc-commissioner
//   条条支委: 看板视图 (非日历) — 宣传/纪检服务于活动与专班
//   组织者/深度参与者: 日历视图 (关注何时何地参会)
//   日历范围: 只读模式全员 + 管理模式仅 organizer/deep
import { getAppState, setState, STATE, registerRenderCallback } from './state.js';
import { BranchService } from './service.runtime.js';
import { _fmtDate, showToast, _currentYearMonth } from './utils.js';
import { populateMonthSelector, renderCalendarByActivities } from './calendar.js';
import { renderInspectorFromState } from './inspector.js';
import { instantiateSOP } from './workflow/index.js';
import { CrossPageState } from './cross-page-state.js';
import { renderSidebar } from './components/sidebar.js';
import { renderHeader } from './components/header.js';
import { addAssignedRole, assignedRoles, computeSecretaryStats } from './service.roles.js';
import { ViewModeStore } from './service.auth.js';

renderSidebar('workspace');
renderHeader('workspace');

document.addEventListener('sidebar:role-select', (e) => {
  const { role, mode } = e.detail;
  if (e.detail.module !== 'workspace') return;
  setState({ selectedRole: role, viewArchived: false, selectedActivityId: null });
  if (role) CrossPageState.save({ selectedRole: role, activeModule: 'workspace', initialMode: mode || 'observe' });
});

document.addEventListener('sidebar:role-restore', (e) => {
  const { role, mode } = e.detail;
  if (e.detail.module === 'workspace') {
    setState({ selectedRole: role, viewArchived: false, selectedActivityId: null });
  }
});

document.addEventListener('view:mode-change', (e) => {
  if (e.detail.module === 'workspace') {
    _applyModeClass(e.detail.mode);
    renderCalendarUI(getAppState());
  }
});

const savedState = CrossPageState.load();
if (savedState.selectedRole) setState({ selectedRole: savedState.selectedRole });

function _applyModeClass(mode) {
  const main = document.querySelector('.sidebar-main-content');
  if (!main) return;
  main.classList.remove('mode-observe', 'mode-manage');
  main.classList.add(mode === 'manage' ? 'mode-manage' : 'mode-observe');
}
_applyModeClass(ViewModeStore.getMode('workspace'));

// ══════════════════════════════════════════════════════════════
//  工作台角色面板路由（对齐 ROADMAP §0.2A）
// ══════════════════════════════════════════════════════════════

const ROLE_PANEL = {
  _writeRoles:         new Set(['secretary', 'leader']),
  _recruitRoles:       new Set(['secretary', 'org-commissioner']),
  _commissionerRoles:  new Set(['org-commissioner', 'prop-commissioner', 'disc-commissioner']),
  _compositeRoles:     new Set(['commissioner-group']),
};

const COMMISSIONER_MOCKS = {
  tf: {
    pending: [
      { id:'t1', title:'宣传联络专班', count:4, skill:'文案写作·摄影·排版', duration:'2026春', desc:'为支部品牌活动提供日常宣传支持，产出新闻稿与活动推送', sub:[
        { id:'t1-s1', title:'招募文案撰写人', done:false },
        { id:'t1-s2', title:'对接各党小组活动日程', done:false },
        { id:'t1-s3', title:'搭建宣传材料模板库', done:false },
      ]},
      { id:'t2', title:'学术研讨专班', count:5, skill:'政策研究·数据分析', duration:'2026春~夏', desc:'围绕习近平经济思想开展理论研讨，产出学习心得与研讨简报', sub:[
        { id:'t2-s1', title:'确定研讨主题清单', done:true },
        { id:'t2-s2', title:'招募学术骨干成员', done:false },
      ]},
    ],
    active: [
      { id:'t3', title:'考勤纪检专班', count:3, skill:'考勤记录·数据整理', duration:'2026全年', desc:'统筹支部全体活动考勤，按月产出出勤统计报告，跟踪补课进度', sub:[
        { id:'t3-s1', title:'建立考勤登记模板', done:true },
        { id:'t3-s2', title:'Q1考勤数据汇总', done:false },
        { id:'t3-s3', title:'补课通知机制上线', done:false },
        { id:'t3-s4', title:'月度复盘报告模板', done:true },
      ]},
      { id:'t4', title:'支部大会筹备专班', count:6, skill:'会务统筹·主持·记录', duration:'2026-05', desc:'筹备二季度支部党员大会，统筹议程、主持、会议记录各项分工', sub:[
        { id:'t4-s1', title:'拟定大会议程', done:true },
        { id:'t4-s2', title:'通知全体党员', done:false },
        { id:'t4-s3', title:'准备大会材料', done:false },
      ]},
    ],
  },
  prop: {
    pending: [
      { id:'pa1', title:'四月主题党日新闻稿', type:'活动', domain:'宣传', desc:'活动已完成，待撰写推送稿件，配图待筛选', sub:[
        { id:'pa1-s1', title:'活动照片整理', done:true },
        { id:'pa1-s2', title:'撰写新闻稿初稿', done:false },
        { id:'pa1-s3', title:'推送排版与审核', done:false },
      ]},
      { id:'pt1', title:'宣传联络专班', type:'专班', domain:'宣传', desc:'为支部品牌活动提供日常宣传支持', sub:[
        { id:'pt1-s1', title:'招募文案撰写人', done:false },
        { id:'pt1-s2', title:'搭建宣传材料模板库', done:false },
      ]},
    ],
    active: [
      { id:'pa2', title:'支部品牌宣传方案', type:'活动', domain:'宣传', desc:'讨论中，初稿待审', sub:[
        { id:'pa2-s1', title:'调研兄弟支部宣传模式', done:true },
        { id:'pa2-s2', title:'撰写品牌方案初稿', done:false },
        { id:'pa2-s3', title:'提交支委会审议', done:false },
      ]},
    ],
  },
  disc: {
    pending: [
      { id:'da1', title:'四月党小组会考勤统计', type:'活动', domain:'纪检', desc:'3个党小组考勤数据待汇总录入', sub:[
        { id:'da1-s1', title:'第一党小组考勤表收集', done:true },
        { id:'da1-s2', title:'第二党小组考勤表收集', done:true },
        { id:'da1-s3', title:'第三党小组考勤表收集', done:false },
        { id:'da1-s4', title:'全支部出勤率汇总', done:false },
      ]},
      { id:'dt1', title:'考勤纪检专班', type:'专班', domain:'纪检', desc:'统筹支部全体活动考勤', sub:[
        { id:'dt1-s1', title:'补课通知机制上线', done:false },
        { id:'dt1-s2', title:'月度复盘报告模板', done:false },
      ]},
    ],
    active: [
      { id:'da2', title:'季度考勤报告', type:'活动', domain:'纪检', desc:'Q1出勤率统计中', sub:[
        { id:'da2-s1', title:'Q1全量活动列表核对', done:true },
        { id:'da2-s2', title:'逐活动统计出勤数据', done:false },
        { id:'da2-s3', title:'补课完成情况检查', done:true },
      ]},
    ],
  },
};

const ACCENT = { org:'#3B82F6', prop:'#10B981', disc:'#D97706' };

function _showCommissionerKanban(role) {
  const kanbanPanel = document.getElementById('commissioner-kanban-panel');
  if (!kanbanPanel) return;
  kanbanPanel.classList.remove('hidden');

  const orgView = document.getElementById('org-taskforce-view');
  const commView = document.getElementById('comm-activity-view');
  if (orgView) orgView.classList.add('hidden');
  if (commView) commView.classList.add('hidden');

  if (role === 'org-commissioner') {
    _showOrgTaskForceView();
  } else {
    _showCommActivityView(role);
  }
}

function _showOrgTaskForceView() {
  const view = document.getElementById('org-taskforce-view');
  if (!view) return;
  view.classList.remove('hidden');

  const data = COMMISSIONER_MOCKS.tf;
  _renderTfCol('kanban-tf-pending', data.pending, 'org');
  _renderTfCol('kanban-tf-active', data.active, 'org');

  const form = document.getElementById('tf-publish-form');
  if (form) form.classList.add('hidden');

  _bindTfPublish();
  _bindTfDetail();
}

function _showCommActivityView(role) {
  const view = document.getElementById('comm-activity-view');
  const titleEl = document.getElementById('comm-activity-title');
  if (!view || !titleEl) return;
  view.classList.remove('hidden');

  const labels = { 'prop-commissioner':'宣传委员','disc-commissioner':'纪检委员' };
  const keys  = { 'prop-commissioner':'prop','disc-commissioner':'disc' };
  titleEl.textContent = `${labels[role] || '支委'} · 活动与专班视图`;

  const key = keys[role] || 'prop';
  const data = COMMISSIONER_MOCKS[key];
  const accent = role === 'prop-commissioner' ? ACCENT.prop : ACCENT.disc;
  _renderCaCol('kanban-ca-pending', data.pending, accent);
  _renderCaCol('kanban-ca-active', data.active, accent);

  _bindCaDetail(accent);
}

function _renderTfCol(colId, items, roleKey) {
  const col = document.getElementById(colId);
  if (!col) return;
  if (!items || items.length === 0) {
    col.innerHTML = '<p class="text-xs text-gray-400 text-center py-6">暂无专班</p>';
    return;
  }
  const color = roleKey === 'org' ? ACCENT.org : ACCENT[roleKey] || ACCENT.org;
  col.innerHTML = items.map(t => `
    <div class="kanban-card p-4 rounded-xl border border-gray-100 bg-white cursor-pointer tf-card-item" data-tf-id="${t.id}" data-tf-count="${t.count}" data-tf-skill="${t.skill}" data-tf-duration="${t.duration}" data-tf-desc="${t.desc}" data-tf-sub='${JSON.stringify(t.sub)}'>
      <div class="flex items-start justify-between gap-2 mb-2">
        <span class="text-sm font-semibold text-gray-800 leading-snug">${t.title}</span>
        <span class="text-[10px] px-1.5 py-0.5 rounded-full font-medium" style="background:${color}15;color:${color};">招募中</span>
      </div>
      <div class="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 mb-2">
        <span>👥 ${t.count}人</span><span>📋 ${t.skill}</span><span>📅 ${t.duration}</span>
      </div>
      <p class="text-xs text-gray-400 line-clamp-2">${t.desc}</p>
    </div>
  `).join('');
}

function _renderCaCol(colId, items, accent) {
  const col = document.getElementById(colId);
  if (!col) return;
  if (!items || items.length === 0) {
    col.innerHTML = '<p class="text-xs text-gray-400 text-center py-6">暂无项目</p>';
    return;
  }
  col.innerHTML = items.map(item => `
    <div class="kanban-card p-4 rounded-xl border border-gray-100 bg-white cursor-pointer ca-card-item" data-ca-id="${item.id}" data-ca-title="${item.title}" data-ca-type="${item.type}" data-ca-desc="${item.desc}" data-ca-sub='${JSON.stringify(item.sub)}'>
      <div class="flex items-start justify-between gap-2 mb-2">
        <span class="text-sm font-semibold text-gray-800 leading-snug">${item.title}</span>
        <span class="text-[10px] px-1.5 py-0.5 rounded kanban-domain-tag" data-domain="${item.domain}">${item.type}</span>
      </div>
      <p class="text-xs text-gray-400">${item.desc}</p>
    </div>
  `).join('');
}

function _bindTfPublish() {
  const btnPub = document.getElementById('btn-publish-tf');
  const form = document.getElementById('tf-publish-form');
  const closeBtn = document.getElementById('close-tf-publish-btn');
  const confirmBtn = document.getElementById('confirm-tf-publish-btn');

  if (btnPub && form) {
    btnPub.onclick = () => form.classList.toggle('hidden');
  }
  if (closeBtn && form) {
    closeBtn.onclick = () => form.classList.add('hidden');
  }
  if (confirmBtn) {
    confirmBtn.onclick = () => {
      const name = document.getElementById('tf-name-input')?.value?.trim();
      if (!name) { showToast('error', '请填写专班名称'); return; }
      showToast('success', `「${name}」招募公告已发布，支部成员可见`);
      if (form) form.classList.add('hidden');
    };
  }
}

function _bindTfDetail() {
  document.querySelectorAll('.tf-card-item').forEach(card => {
    card.addEventListener('click', () => {
      const panel = document.getElementById('tf-detail-panel');
      if (!panel) return;
      const title = card.dataset.tfId;
      const count = card.dataset.tfCount;
      const skill = card.dataset.tfSkill;
      const duration = card.dataset.tfDuration;
      const desc = card.dataset.tfDesc;
      let sub = [];
      try { sub = JSON.parse(card.dataset.tfSub); } catch {}

      const activeSub = sub.filter(s => !s.done);
      const doneSub  = sub.filter(s => s.done);

      panel.classList.remove('hidden');
      panel.style.borderLeftColor = ACCENT.org;
      panel.innerHTML = `
        <div class="flex items-center justify-between mb-3">
          <h4 class="font-title-cn text-sm font-bold text-gray-800">${title}</h4>
          <button class="close-detail-btn text-xs text-gray-400" style="background:none;border:none;cursor:pointer;">收起 ✕</button>
        </div>
        <div class="flex flex-wrap gap-x-5 gap-y-1 text-xs text-gray-500 mb-3">
          <span>👥 ${count}人</span><span>📋 ${skill}</span><span>📅 ${duration}</span>
        </div>
        <p class="text-sm text-gray-600 mb-4">${desc}</p>
        <h5 class="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">子任务</h5>
        <div class="space-y-2">
          ${activeSub.map(s => `<div class="flex items-center gap-2 text-sm text-gray-700"><span class="w-4 h-4 rounded border-2 border-gray-300 inline-block flex-shrink-0" style="margin-top:1px;"></span>${s.title}</div>`).join('')}
          ${doneSub.map(s => `<div class="flex items-center gap-2 text-sm text-gray-400 line-through" style="opacity:0.5;"><span class="w-4 h-4 rounded flex-shrink-0 inline-flex items-center justify-center" style="margin-top:1px;background:rgba(16,185,129,0.15);"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg></span>${s.title}</div>`).join('')}
        </div>
      `;
      panel.querySelector('.close-detail-btn')?.addEventListener('click', () => {
        panel.classList.add('hidden');
      });
    });
  });
}

function _bindCaDetail(accent) {
  document.querySelectorAll('.ca-card-item').forEach(card => {
    card.addEventListener('click', () => {
      const panel = document.getElementById('ca-detail-panel');
      if (!panel) return;
      const title = card.dataset.caTitle || '';
      const type = card.dataset.caType;
      const desc = card.dataset.caDesc;
      let sub = [];
      try { sub = JSON.parse(card.dataset.caSub); } catch {}

      const activeSub = sub.filter(s => !s.done);
      const doneSub  = sub.filter(s => s.done);

      panel.classList.remove('hidden');
      panel.style.borderLeftColor = accent;
      panel.innerHTML = `
        <div class="flex items-center justify-between mb-3">
          <h4 class="font-title-cn text-sm font-bold text-gray-800">${title}</h4>
          <button class="close-detail-btn text-xs text-gray-400" style="background:none;border:none;cursor:pointer;">收起 ✕</button>
        </div>
        <span class="text-[10px] px-1.5 py-0.5 rounded inline-block mb-2" style="background:${accent}15;color:${accent};">${type === '专班' ? '专班' : '活动'}</span>
        <p class="text-sm text-gray-600 mb-4">${desc}</p>
        <h5 class="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">子任务</h5>
        <div class="space-y-2">
          ${activeSub.map(s => `<div class="flex items-center gap-2 text-sm text-gray-700"><span class="w-4 h-4 rounded border-2 border-gray-300 inline-block flex-shrink-0" style="margin-top:1px;"></span>${s.title}</div>`).join('')}
          ${doneSub.map(s => `<div class="flex items-center gap-2 text-sm text-gray-400 line-through" style="opacity:0.5;"><span class="w-4 h-4 rounded flex-shrink-0 inline-flex items-center justify-center" style="margin-top:1px;background:rgba(16,185,129,0.15);"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg></span>${s.title}</div>`).join('')}
        </div>
      `;
      panel.querySelector('.close-detail-btn')?.addEventListener('click', () => {
        panel.classList.add('hidden');
      });
    });
  });
}

function renderCalendarUI(state) {
  const role = state.selectedRole;
  populateMonthSelector(state.activities);
  const mode = ViewModeStore.getMode('workspace');

  _updateCalendarHeader(role, mode);
  _routeRolePanel(role, mode, state);

  if (role === 'secretary') {
    _updateSecretaryDashboard(state);
  } else {
    const dash = document.getElementById('secretary-dashboard');
    if (dash) dash.classList.add('hidden');
  }
}

function _routeRolePanel(role, mode, state) {
  const writePanel = document.getElementById('calendar-create-panel');
  const calSection = document.getElementById('calendar-view-section');
  const kanbanPanel = document.getElementById('commissioner-kanban-panel');
  if (!writePanel) return;

  writePanel.querySelectorAll('.write-only').forEach(el => el.classList.add('hidden'));
  const readonlyBanner = writePanel.querySelector('.readonly-banner');
  if (readonlyBanner) readonlyBanner.classList.add('hidden');
  const redirect = writePanel.querySelector('.commissioner-redirect');
  if (redirect) redirect.classList.add('hidden');

  if (calSection) calSection.classList.add('hidden');
  if (kanbanPanel) kanbanPanel.classList.add('hidden');

  if (mode !== 'manage') {
    _showCalendar(state);
    return;
  }

  if (role && ROLE_PANEL._writeRoles.has(role)) {
    _showWritePanel(writePanel);
    _showCalendar(state);
  } else if (role && ROLE_PANEL._commissionerRoles.has(role)) {
    _showCommissionerKanban(role);
  } else if (role && ROLE_PANEL._compositeRoles.has(role)) {
    _showCommissionerRedirect(writePanel);
  } else if (role && (role === 'organizer' || role === 'deep')) {
    _showCalendar(state);
  } else {
    _showCalendar(state);
  }
}

function _showWritePanel(panel) {
  panel.querySelectorAll('.write-only').forEach(el => el.classList.remove('hidden'));
}

function _showCommissionerRedirect(panel) {
  let redirect = panel.querySelector('.commissioner-redirect');
  if (!redirect) {
    redirect = document.createElement('div');
    redirect.className = 'commissioner-redirect mb-6 p-6 rounded-2xl';
    redirect.style.cssText = 'background:linear-gradient(135deg,rgba(217,119,6,0.04) 0%,rgba(206,17,38,0.02) 100%);border:1px solid rgba(217,119,6,0.2);';
    redirect.innerHTML = `
      <div class="text-center mb-4">
        <p class="font-title-cn text-base font-bold text-gray-800 mb-1">条条支委 · 党建工作台</p>
        <p class="text-xs text-gray-500">选择进入具体支委角色的任务看板</p>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
        <button class="comm-pick-card card rounded-xl p-4 text-left" data-pick="org-commissioner" style="background:white;border:1px solid var(--neutral-200);cursor:pointer;transition:all 0.15s;">
          <p class="text-sm font-semibold text-gray-800 mb-1">组织委员</p>
          <p class="text-xs text-gray-500">专班统筹 · 人员调配</p>
          <span class="text-xs text-blue-600 mt-2 inline-block">进入看板 →</span>
        </button>
        <button class="comm-pick-card card rounded-xl p-4 text-left" data-pick="prop-commissioner" style="background:white;border:1px solid var(--neutral-200);cursor:pointer;transition:all 0.15s;">
          <p class="text-sm font-semibold text-gray-800 mb-1">宣传委员</p>
          <p class="text-xs text-gray-500">宣传策划 · 档案管理</p>
          <span class="text-xs text-blue-600 mt-2 inline-block">进入看板 →</span>
        </button>
        <button class="comm-pick-card card rounded-xl p-4 text-left" data-pick="disc-commissioner" style="background:white;border:1px solid var(--neutral-200);cursor:pointer;transition:all 0.15s;">
          <p class="text-sm font-semibold text-gray-800 mb-1">纪检委员</p>
          <p class="text-xs text-gray-500">考勤考察 · 补课管理</p>
          <span class="text-xs text-blue-600 mt-2 inline-block">进入看板 →</span>
        </button>
      </div>
    `;
    panel.appendChild(redirect);

    redirect.querySelectorAll('.comm-pick-card').forEach(btn => {
      btn.addEventListener('click', () => {
        const picked = btn.dataset.pick;
        setState({ selectedRole: picked, viewArchived: false, selectedActivityId: null });
        CrossPageState.save({ selectedRole: picked, activeModule: 'workspace', initialMode: 'manage' });
      });
      btn.addEventListener('mouseenter', () => { btn.style.borderColor = '#D97706'; btn.style.boxShadow = '0 2px 8px rgba(217,119,6,0.12)'; });
      btn.addEventListener('mouseleave', () => { btn.style.borderColor = 'var(--neutral-200)'; btn.style.boxShadow = ''; });
    });
  }
  redirect.classList.remove('hidden');
}

function _showCalendar(state) {
  const calSection = document.getElementById('calendar-view-section');
  if (calSection) calSection.classList.remove('hidden');

  const filteredState = _filterByRole(state, state.selectedRole);
  renderCalendarByActivities(filteredState, state.displayMonth || _currentYearMonth());
  renderInspectorFromState(filteredState);
}

function _filterByRole(state, role) {
  if (!state.activities || state.activities.length === 0) return state;
  const all = state.activities.filter(a => !a.archived);
  if (!role) return { ...state, activities: all };
  switch (role) {
    case 'leader':
      return { ...state, activities: all.filter(a => a.direction === 'top-down' || (a.organizerName && a.organizerName.includes('组长'))) };
    case 'organizer':
      return { ...state, activities: all.filter(a => a.organizerName && !a.organizerName.includes('组长')) };
    case 'deep':
      return { ...state, activities: all.filter(a => a.deepParticipantName) };
    default:
      return { ...state, activities: all };
  }
}

function _updateCalendarHeader(role, mode) {
  const panel = document.getElementById('calendar-create-panel');
  if (!panel) return;

  let headerEl = panel.querySelector('.calendar-role-header');
  if (!headerEl) {
    headerEl = document.createElement('div');
    headerEl.className = 'calendar-role-header';
    panel.insertBefore(headerEl, panel.firstChild);
  }

  const configs = {
    leader:              { color: '#CE1126', label: '党小组组长', desc: '活动创建写入' },
    'commissioner-group':{ color: '#D97706', label: '条条支委', desc: '组织/宣传/纪检' },
    'org-commissioner':  { color: '#D97706', label: '组织委员', desc: '专班统筹 · 人员调配' },
    'prop-commissioner': { color: '#D97706', label: '宣传委员', desc: '宣传策档 · 档案管理' },
    'disc-commissioner': { color: '#D97706', label: '纪检委员', desc: '考勤考察 · 补课管理' },
    organizer:           { color: '#3B82F6', label: '活动组织者', desc: '任务分配 · 进度追踪' },
    deep:                { color: '#10B981', label: '深度参与者', desc: '任务状态更新' },
    secretary:           { color: '#CE1126', label: '党支部书记', desc: '全局管理 · 赋权' },
  };

  if (!role) { headerEl.style.display = 'none'; return; }
  headerEl.style.display = '';
  const cfg = configs[role] || configs.leader;
  headerEl.className = 'calendar-role-header mb-4 px-4 py-3 rounded-lg border-l-4';
  headerEl.style.cssText = `background:linear-gradient(135deg,${cfg.color}1A 0%,transparent 100%);border-left-color:${cfg.color};`;
  const canWrite = ViewModeStore.canWriteActivity(role);
  const isManage = mode === 'manage';
  headerEl.innerHTML = `<div class="flex items-center gap-2"><span class="text-sm font-bold" style="color:${cfg.color};">${cfg.label}</span><span class="text-xs text-gray-500">${cfg.desc}</span>${isManage ? (canWrite ? '<span class="text-[10px] px-1.5 py-0.5 rounded bg-red-100 text-red-600 ml-2">写入</span>' : '<span class="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-600 ml-2">管理</span>') : '<span class="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-400 ml-2">只读</span>'}</div>`;
}

function _updateSecretaryDashboard(state) {
  const dash = document.getElementById('secretary-dashboard');
  if (!dash) return;
  dash.classList.remove('hidden');
  const stats = computeSecretaryStats(state.activities || []);
  const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  set('stat-pending-auth', stats.pendingAuth);
  set('stat-active-events', stats.activeEvents);
  set('stat-month-events', stats.monthEvents);
  set('stat-auth-granted', stats.authGranted);
}

registerRenderCallback(renderCalendarUI);

renderCalendarUI(getAppState());

// ══════════════════════════════════════════════════════════════
//  事件绑定
// ══════════════════════════════════════════════════════════════

document.getElementById('month-selector')?.addEventListener('change', e => {
  setState({ displayMonth: e.target.value });
});

document.getElementById('activity-selector')?.addEventListener('change', e => {
  setState({ selectedActivityId: e.target.value || null });
});

document.getElementById('gen-schedule-cal-btn')?.addEventListener('click', () => {
  const t0 = document.getElementById('t0-input-cal')?.value;
  const location = document.getElementById('location-input-cal')?.value?.trim();
  const scenario = document.getElementById('scenario-select-cal')?.value;
  const title = document.getElementById('activity-name-input')?.value?.trim();
  const typeCheckboxes = document.querySelectorAll('input[name="act-type"]:checked');
  const type = Array.from(typeCheckboxes).map(cb => cb.value).join('+') || 'learning';
  const duration = document.getElementById('duration-input')?.value;
  const direction = document.getElementById('direction-input')?.value;
  const organizer = document.getElementById('organizer-name-input')?.value;
  const deep = document.getElementById('deep-name-input')?.value;

  if (!t0 || !location || !scenario || !title) {
    showToast('error', '请填写必填项：日期、地点、场景、名称');
    return;
  }

  const st = getAppState();
  const newActivity = {
    id: 'act-' + Date.now(),
    title,
    date: t0,
    location,
    scenario,
    activityType: type,
    duration,
    direction,
    organizerName: organizer || '',
    deepParticipantName: deep || '',
    archived: false,
    authorized: direction !== 'bottom-up',
  };

  st.activities.push(newActivity);
  setState({ activities: st.activities });
  showToast('success', '活动已写入');
});

document.getElementById('open-assign-panel-btn')?.addEventListener('click', () => {
  document.getElementById('assign-modal')?.classList.remove('hidden');
});

document.getElementById('close-assign-modal-btn')?.addEventListener('click', () => {
  document.getElementById('assign-modal')?.classList.add('hidden');
});

document.getElementById('cancel-assign-btn')?.addEventListener('click', () => {
  document.getElementById('assign-modal')?.classList.add('hidden');
});

document.getElementById('confirm-assign-btn')?.addEventListener('click', () => {
  const name = document.getElementById('assign-name-input')?.value;
  const role = document.getElementById('assign-role-input')?.value;
  const activity = document.getElementById('assign-activity-input')?.value;
  if (!name) { showToast('error', '请输入姓名'); return; }
  addAssignedRole({ name, role, activity });
  showToast('success', '赋权成功');
  document.getElementById('assign-success-msg')?.classList.remove('hidden');
  setTimeout(() => document.getElementById('assign-success-msg')?.classList.add('hidden'), 2000);
});

const scenarioSelect = document.getElementById('scenario-select-cal');
if (scenarioSelect) {
  scenarioSelect.addEventListener('change', () => {
    const v = scenarioSelect.value;
    const hostWrap = document.getElementById('host-group-wrap');
    if (hostWrap) hostWrap.classList.toggle('hidden', v !== 'party-group-meeting');
  });
}
