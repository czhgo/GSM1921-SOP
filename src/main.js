// ════════════════════════════════════════════════════════════════
//  main.js — 极简入口 (Slim Entry Point)
//  光华管理学院本科生党支部 SOP 引擎 v9.0
//  架构：Domain → Service → Runtime → Modules → Main(UI)
//  兼容：GitHub Pages (原生 ESM，无构建工具)
// ════════════════════════════════════════════════════════════════

import { BranchService } from './service.runtime.js';
import { STATE, setState, registerRenderCallback } from './state.js';
import { enterEl, leaveEl, _fmtDate, showToast } from './utils.js';
import { populateMonthSelector, renderCalendarByActivities } from './calendar.js';
import { renderInspectorFromState } from './inspector.js';
import { setupEventListeners } from './events.js';
import { instantiateSOP } from './sop.js';

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
      txt.textContent = '状态机 v9.0';
    }
  }

  // ── 推演工作台：月份选择器 & 日历 & 检查器状态路由 ───────────
  if (activeModule === 'calendar') {
    // 侧边栏 RBAC 按钮激活态
    if (calMenu) {
      calMenu.querySelectorAll('.role-btn[data-role]').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.role === state.managementRole);
      });
    }
    const targetMonth = populateMonthSelector(state.activities);
    renderCalendarByActivities(state.activities, targetMonth);
    renderInspectorFromState(state);
  }

  if (activeModule !== 'reference') return;

  // ── 以下仅参考指南模块需要 ─────────────────────────────────

  document.querySelectorAll('.domain-btn[data-domain]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.domain === domain);
  });

  document.querySelectorAll('.role-btn[data-role]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.role === role);
  });

  const activeRoleBtn = document.querySelector(`.role-btn[data-role="${role}"]`);
  if (activeRoleBtn) {
    const hl = document.getElementById('role-headline');
    const sl = document.getElementById('role-subline');
    if (hl) hl.textContent = activeRoleBtn.dataset.headline || '';
    if (sl) sl.textContent = activeRoleBtn.dataset.subline || '';
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

  setState({ domain: 'activity', role: 'all', activeModule: 'calendar', status: STATE.LOADING });

  try {
    let [activities, tasks] = await Promise.all([
      BranchService.listActivities(),
      typeof BranchService.listTasks === 'function' ? BranchService.listTasks() : Promise.resolve([]),
    ]);

    // ── 空状态引导：自动创建示例活动 ──────────────────────────────
    if (activities.length === 0) {
      const today = new Date();
      const targetDate = new Date(today);
      targetDate.setDate(targetDate.getDate() + 7);
      const targetDateStr = targetDate.toISOString().slice(0, 10);
      const newAct = await BranchService.createActivity({
        title:      '示例：组织生活会演练',
        domain:     'activity',
        scenarioId: 'org-life',
        date:       targetDateStr,
        executor:   'organizer',
      });
      const sopTasks = instantiateSOP(['org-life'], targetDateStr);
      await Promise.allSettled(
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
      [activities, tasks] = await Promise.all([
        BranchService.listActivities(),
        BranchService.listTasks(),
      ]);
      showToast('info', '已为您创建示例活动，可体验任务管理功能');
    }

    setState({ status: STATE.IDLE, activities, tasks });
  } catch (err) {
    console.warn('[initApp] 初始化加载失败：', err);
    setState({ status: STATE.ERROR, error: err });
  }
}());
