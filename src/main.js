// ════════════════════════════════════════════════════════════════
//  main.js — 极简入口 (Slim Entry Point)
//  光华管理学院本科生党支部 SOP 引擎 v9.0
//  架构：Domain → Service → Runtime → Modules → Main(UI)
//  兼容：GitHub Pages (原生 ESM，无构建工具)
// ════════════════════════════════════════════════════════════════

import { BranchService } from './service.runtime.js';
import { STATE, setState, registerRenderCallback, MANAGEMENT_ROLES } from './state.js';
import { enterEl, leaveEl, _fmtDate, showToast, _currentYearMonth } from './utils.js';
import { populateMonthSelector, renderCalendarByActivities } from './calendar.js';
import { renderInspectorFromState } from './inspector.js';
import { setupEventListeners, populateActivitySelector } from './events.js';
import { instantiateSOP } from './workflow/index.js';

// ════════════════════════════════════════════════════════════════
//  renderUI — 主渲染函数，由 setState 唯一触发
// ════════════════════════════════════════════════════════════════

function renderUI(state) {
  const { domain, role, activeModule, status, error, selectedRole, viewArchived } = state;

  // ── 模块 Tab 激活态 ──────────────────────────────────────────
  document.querySelectorAll('.module-tab[data-module]').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.module === activeModule);
  });

  // ── 统一角色菜单显示/隐藏逻辑 ────────────────────────────────
  const roleMenu = document.getElementById('sidebar-role-menu');
  const tplMenu = document.getElementById('sidebar-templates-menu');
  
  // 角色菜单在推演工作台和参考指南中显示，模板与资产中隐藏
  if (roleMenu) {
    roleMenu.classList.toggle('hidden', activeModule !== 'calendar' && activeModule !== 'reference');
  }
  if (tplMenu) {
    tplMenu.classList.toggle('hidden', activeModule !== 'templates');
  }

  // ── 参与视图、全局视图和归档库显示逻辑 ──────────────────────
  const participantSection = document.getElementById('participant-view-section');
  const archivedSection = document.getElementById('archived-section');
  const globalSection = document.getElementById('global-view-section');
  
  if (participantSection) {
    participantSection.classList.toggle('hidden', activeModule !== 'calendar');
  }
  if (archivedSection) {
    archivedSection.classList.toggle('hidden', activeModule !== 'calendar');
  }
  if (globalSection) {
    globalSection.classList.toggle('hidden', activeModule !== 'reference');
  }

  // ── 主内容区模块切换（带过渡动画）───────────────────────────────
  const viewRef = document.getElementById('view-reference');
  const viewCal = document.getElementById('view-calendar');
  const viewTpl = document.getElementById('view-templates');
  const views = [viewRef, viewCal, viewTpl];
  
  views.forEach(view => {
    if (!view) return;
    const shouldShow = view.id === `view-${activeModule}`;
    
    if (shouldShow) {
      view.classList.remove('hidden');
      view.classList.remove('hidden-completely');
    } else {
      view.classList.add('hidden');
      setTimeout(() => {
        view.classList.add('hidden-completely');
      }, 400);
    }
  });

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
      txt.textContent = '状态机 v9.0';
    }
  }

  // ── 统一角色按钮激活态（推演工作台和参考指南共用）─────────────
  if (roleMenu) {
    roleMenu.querySelectorAll('[data-role]').forEach(btn => {
      const r = btn.dataset.role;
      if (r === 'archived') {
        btn.classList.toggle('active', viewArchived === true);
      } else {
        btn.classList.toggle('active', !viewArchived && r === selectedRole);
      }
    });
  }

  // 推演工作台：月份选择器 & 日历 & 检查器状态路由 ───────────
  if (activeModule === 'calendar') {
    populateMonthSelector(state.activities);
    populateActivitySelector(state.activities);
    const targetMonth = state.displayMonth || _currentYearMonth();
    renderCalendarByActivities(state, targetMonth);
    renderInspectorFromState(state);
    return;
  }

  // ── 以下仅参考指南模块需要 ─────────────────────────────────
  if (activeModule !== 'reference') return;

  document.querySelectorAll('.domain-btn[data-domain]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.domain === domain);
  });

  const activeRoleBtn = document.querySelector(`#sidebar-role-menu [data-role="${selectedRole}"]`);
  if (activeRoleBtn) {
    const hl = document.getElementById('role-headline');
    const sl = document.getElementById('role-subline');
    if (hl) hl.textContent = activeRoleBtn.dataset.headline || '党支部工作指南';
    if (sl) sl.textContent = activeRoleBtn.dataset.subline || '全面了解各项工作流程与职责要求';
  }

  document.querySelectorAll('.scenario-header[data-domain]').forEach(hdr => {
    if (hdr.dataset.domain === domain) {
      enterEl(hdr);
    } else {
      leaveEl(hdr);
    }
  });

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

// ── 注册渲染回调（解决循环依赖）──────────────────────────────────
registerRenderCallback(renderUI);

// ════════════════════════════════════════════════════════════════
//  启动：DOM 初始化
// ════════════════════════════════════════════════════════════════
document.querySelectorAll('.timeline-node[data-domain], .scenario-header[data-domain]').forEach(el => {
  el.classList.add('hidden', 'opacity-0', 'translate-y-4');
});

const pill = document.getElementById('status-pill');
if (pill) pill.classList.remove('hidden');

setupEventListeners();

// ════════════════════════════════════════════════════════════════
//  initApp — 加载持久化数据 → 并发拉取 Activities + Tasks → renderUI
// ════════════════════════════════════════════════════════════════
(async function initApp() {
  try {
    if (typeof BranchService.loadDB === 'function') BranchService.loadDB();
  } catch (e) {
    console.warn('[initApp] loadDB 异常（已忽略，继续初始化）。如果问题持续，请尝试清除本站点的浏览器存储。', e);
  }

  setState({ domain: 'activity', role: 'all', activeModule: 'calendar', status: STATE.LOADING, selectedRole: null });

  try {
    const [activities, tasks] = await Promise.all([
      BranchService.listActivities(),
      typeof BranchService.listTasks === 'function' ? BranchService.listTasks() : Promise.resolve([]),
    ]);

    setState({ status: STATE.IDLE, activities, tasks });
  } catch (err) {
    console.warn('[initApp] 初始化加载失败：', err);
    setState({ status: STATE.ERROR, error: err });
  }
}());
