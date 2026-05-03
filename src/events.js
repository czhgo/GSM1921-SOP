// role: [人机]
// ════════════════════════════════════════════════════════════════
//  events.js — DOM 事件绑定与推演工作台控制台初始化
//  对外暴露 setupEventListeners()，由 main.js 在启动时调用
// ════════════════════════════════════════════════════════════════

import { getAppState, setState, STATE } from './state.js';
import { _fmtDate, showToast } from './utils.js';
import { instantiateSOP } from './workflow/index.js';
import { BranchService } from './service.runtime.js';
import { PartyModule } from './party.js';

// ── 防竞态：当前请求 ID（模块私有）────────────────────────────
let _currentRequestId = 0;

// ════════════════════════════════════════════════════════════════
//  侧边栏统一状态机（CSS Transform 驱动）
// ════════════════════════════════════════════════════════════════
function _getSidebar()  { return document.getElementById('sidebar-main'); }
function _getOverlay()  { return document.getElementById('sidebar-overlay'); }

function openSidebar() {
  const sb = _getSidebar();
  if (!sb) return;
  sb.classList.remove('sidebar-collapsed');
  const ov = _getOverlay();
  if (ov) ov.classList.add('visible');
}

function closeSidebar() {
  const sb = _getSidebar();
  if (!sb) return;
  sb.classList.add('sidebar-collapsed');
  const ov = _getOverlay();
  if (ov) ov.classList.remove('visible');
}

function toggleSidebar() {
  const sb = _getSidebar();
  if (sb && sb.classList.contains('sidebar-collapsed')) {
    openSidebar();
  } else {
    closeSidebar();
  }
}

// ════════════════════════════════════════════════════════════════
//  推演工作台控制台（写入活动 + SOP 任务挂载）
// ════════════════════════════════════════════════════════════════
function _initCalendarModule() {
  const genBtn  = document.getElementById('gen-schedule-cal-btn');
  const t0Input = document.getElementById('t0-input-cal');
  if (!genBtn || !t0Input) return;

  t0Input.value = _fmtDate(new Date());

  // 场景切换：承办党小组仅在"主题党日/党小组会/组织生活会"时显示，切换至其他场景时隐藏并清空
  const scSelect    = document.getElementById('scenario-select-cal');
  const hostGroupWrap   = document.getElementById('host-group-wrap');
  const hostGroupSelect = document.getElementById('host-group-select');
  const HOST_GROUP_SCENES = new Set(['theme-party', 'party-group-meeting', 'org-life']);

  function _syncHostGroupVisibility() {
    if (!hostGroupWrap || !hostGroupSelect) return;
    if (HOST_GROUP_SCENES.has(scSelect ? scSelect.value : '')) {
      hostGroupWrap.classList.remove('hidden');
    } else {
      hostGroupWrap.classList.add('hidden');
      hostGroupSelect.value = '';
    }
  }

  if (scSelect) {
    scSelect.addEventListener('change', _syncHostGroupVisibility);
  }
  // 初始化：与默认选中场景对齐
  _syncHostGroupVisibility();

  genBtn.addEventListener('click', async () => {
    const appState = getAppState();
    if (appState.status === STATE.SUBMITTING || appState.status === STATE.LOADING) return;

    const dateStr = t0Input.value;
    if (!dateStr) {
      t0Input.style.borderColor = '#CE1126';
      t0Input.style.boxShadow   = '0 0 0 2px rgba(206,17,38,0.2)';
      setTimeout(() => { t0Input.style.boxShadow = ''; }, 1500);
      return;
    }

    const scVal    = scSelect ? scSelect.value : 'org-life';
    const scIds    = [scVal];

    const nameInput = document.getElementById('activity-name-input');
    const actName   = nameInput ? nameInput.value.trim() : '';
    if (!actName) {
      if (nameInput) {
        nameInput.focus();
        nameInput.style.boxShadow = '0 0 0 2px rgba(239,68,68,0.55)';
        setTimeout(() => { nameInput.style.boxShadow = ''; }, 1800);
      }
      showToast('error', '请先在「活动名称」输入框中填写活动名称。');
      return;
    }

    // 读取活动组织者姓名与深度参与者姓名（Phase 1 新增字段）
    const organizerNameInput     = document.getElementById('organizer-name-input');
    const deepParticipantInput   = document.getElementById('deep-name-input');
    const organizerName          = organizerNameInput    ? organizerNameInput.value.trim()   : '';
    const deepParticipantName    = deepParticipantInput  ? deepParticipantInput.value.trim() : '';

    // 读取承办党小组（承办党小组已在外层作用域声明 hostGroupSelect）
    const hostGroup = hostGroupSelect ? hostGroupSelect.value : '';

    const reqId = ++_currentRequestId;

    genBtn.disabled = true;
    genBtn.textContent = '写入中…';
    setState({ status: STATE.SUBMITTING, error: null });

    try {
      const actPayload = {
        title:      actName,
        domain:     'activity',
        scenarioId: scIds[0],
        date:       dateStr,
        executor:   'organizer',
        createdBy:  'u_exec',
      };
      if (organizerName)       actPayload.organizerName       = organizerName;
      if (deepParticipantName) actPayload.deepParticipantName = deepParticipantName;
      if (hostGroup)           actPayload.hostGroup           = hostGroup;

      const newAct = await BranchService.createActivity(actPayload);

      if (reqId !== _currentRequestId) return;

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

      if (reqId !== _currentRequestId) return;

      const [activities, tasks] = await Promise.all([
        BranchService.listActivities(),
        typeof BranchService.listTasks === 'function' ? BranchService.listTasks() : Promise.resolve([]),
      ]);
      setState({
        status:             STATE.SUCCESS,
        activities,
        tasks,
        displayMonth:       dateStr.slice(0, 7),
        selectedDate:       dateStr,
        selectedActivityId: newAct.id,
      });
      showToast('success', `活动「${actName.trim()}」已写入，${sopTasks.length} 个任务节点已挂载。`);
      if (nameInput) nameInput.value = '';
    } catch (err) {
      if (reqId !== _currentRequestId) return;
      setState({ status: STATE.ERROR, error: err });
      showToast('error', (err && err.message) ? err.message : '操作失败，请稍后重试。');
    } finally {
      genBtn.disabled = false;
      genBtn.textContent = '写入活动';
    }
  });
}

// ════════════════════════════════════════════════════════════════
//  活动快速寻址器数据填充（保鲜：由 renderUI 在每次 setState 后调用）
// ════════════════════════════════════════════════════════════════
export function populateActivitySelector(activities) {
  const sel = document.getElementById('activity-selector');
  if (!sel) return;
  const current = sel.value;
  const unarchived = (activities || [])
    .filter(a => !a.archived)
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  sel.innerHTML = '<option value="">快速聚焦活动...</option>'
    + unarchived.map(a =>
        `<option value="${a.id}">${a.title}${a.date ? ' — ' + a.date : ''}</option>`
      ).join('');
  if (current && unarchived.some(a => a.id === current)) sel.value = current;
}

// ════════════════════════════════════════════════════════════════
//  全量 DOM 事件绑定入口
// ════════════════════════════════════════════════════════════════
export function setupEventListeners() {
  // ── 侧边栏初始状态（桌面展开，移动收起）───────────────────────
  if (window.innerWidth < 768) {
    closeSidebar();
  } else {
    openSidebar();
  }

  const hamburgerBtn = document.getElementById('hamburger-btn');
  if (hamburgerBtn) hamburgerBtn.addEventListener('click', toggleSidebar);

  const overlay = _getOverlay();
  if (overlay) overlay.addEventListener('click', closeSidebar);

  // ── 模块 Tab 点击 ───────────────────────────────────────────
  document.querySelectorAll('.module-tab[data-module]').forEach(tab => {
    tab.addEventListener('click', () => {
      const targetModule = tab.dataset.module;
      if (targetModule === 'reference') {
        setState({ activeModule: targetModule, selectedRole: 'global', viewArchived: false });
      } else if (targetModule === 'calendar') {
        setState({ activeModule: targetModule, selectedRole: 'participant', viewArchived: false });
      } else if (targetModule === 'party') {
        setState({ activeModule: targetModule, selectedRole: getAppState().selectedRole || 'participant' });
      } else if (targetModule === 'search') {
        setState({ activeModule: 'search' });
      } else {
        setState({ activeModule: targetModule });
      }
      closeSidebar();
    });
  });

  // ── 领域按钮 ─────────────────────────────────────────────────
  document.querySelectorAll('.domain-btn[data-domain]').forEach(btn => {
    btn.addEventListener('click', () => {
      setState({ domain: btn.dataset.domain });
    });
  });

  // ── 统一角色菜单按钮分发（推演工作台和参考指南共用）───────────
  const roleMenu = document.getElementById('sidebar-role-menu');
  if (roleMenu) {
    roleMenu.querySelectorAll('[data-role]').forEach(btn => {
      btn.addEventListener('click', () => {
        const r = btn.dataset.role;

        if (r === 'commissioner-group') {
          const modal = document.getElementById('commissioner-modal');
          closeSidebar();
          if (modal) {
            const isHidden = modal.classList.contains('hidden');
            if (!isHidden) {
              modal.classList.add('hidden');
              return;
            }
            modal.classList.remove('hidden');
          }
          return;
        }

        if (r === 'archived') {
          setState({
            viewArchived:      true,
            viewMode:          'list',
            selectedActivityId: null,
          });
        } else if (r === 'participant') {
          setState({
            selectedRole:      'participant',
            viewArchived:      false,
            viewMode:          'list',
            selectedActivityId: null,
          });
        } else {
          setState({
            selectedRole:      r,
            viewArchived:      false,
            viewMode:          'list',
            selectedActivityId: null,
          });
        }

        _updateManagerVisibility();
        closeSidebar();
      });
    });
  }

  // ── 展开/折叠（WWH 区域）────────────────────────────────────
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

  // ── 月份筛选（实时响应）──────────────────────────────────────
  const monthSelector = document.getElementById('month-selector');
  if (monthSelector) {
    monthSelector.addEventListener('change', () => {
      const val = monthSelector.value;
      setState({ displayMonth: val || null, selectedDate: null, viewMode: 'list' });
    });
  }

  // ── 活动快速寻址器（一键穿透至管理详情）─────────────────────
  const activitySelector = document.getElementById('activity-selector');
  if (activitySelector) {
    activitySelector.addEventListener('change', () => {
      const id = activitySelector.value;
      if (!id) return;
      setState({ viewMode: 'detail', selectedActivityId: id, viewType: 'manager' });
      activitySelector.value = '';
    });
  }

  // ── 推演工作台控制台 ─────────────────────────────────────────
  _initCalendarModule();

  // ── 党务管理：支委面板子 tab 切换 ─────────────────────────────
  document.querySelectorAll('.commissioner-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const panel = tab.closest('.commissioner-panel');
      if (!panel) return;
      const commissioner = panel.dataset.commissioner;
      const subtab = tab.dataset.subtab;
      if (commissioner && subtab) {
        PartyModule.switchSubTab(commissioner, subtab);
      }
    });
  });

  // ── 党务管理：刷新按钮 ───────────────────────────────────────
  const refreshBtn = document.getElementById('btn-party-refresh');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      PartyModule.refreshAll();
    });
  }

  // ── 党务管理：初始化 Mock 数据 ───────────────────────────────
  PartyModule.loadAll();

  // ── 管理视图控制 + 赋权面板 ─────────────────────────────────
  _initManagerControls();
}

// ════════════════════════════════════════════════════════════════
//  管理视图控制 + 赋权面板
// ════════════════════════════════════════════════════════════════

const assignedRoles = [];

function _initManagerControls() {
  // 管理视图显示控制
  _updateManagerVisibility();

  // 赋权面板开关
  const openBtn = document.getElementById('open-assign-panel-btn');
  const modal = document.getElementById('assign-modal');
  const closeBtn = document.getElementById('close-assign-modal-btn');
  const cancelBtn = document.getElementById('cancel-assign-btn');
  const confirmBtn = document.getElementById('confirm-assign-btn');

  if (openBtn) openBtn.addEventListener('click', () => { modal.classList.remove('hidden'); _renderAssignedList(); });
  if (closeBtn) closeBtn.addEventListener('click', () => modal.classList.add('hidden'));
  if (cancelBtn) cancelBtn.addEventListener('click', () => modal.classList.add('hidden'));

  if (confirmBtn) {
    confirmBtn.addEventListener('click', () => {
      const name = document.getElementById('assign-name-input').value.trim();
      const role = document.getElementById('assign-role-input').value;
      const activity = document.getElementById('assign-activity-input').value.trim();
      if (!name) return;

      assignedRoles.push({ name, role, activity, assignedAt: new Date().toISOString() });

      const msg = document.getElementById('assign-success-msg');
      msg.classList.remove('hidden');
      setTimeout(() => msg.classList.add('hidden'), 2000);

      document.getElementById('assign-name-input').value = '';
      document.getElementById('assign-activity-input').value = '';
      _renderAssignedList();
    });
  }

  const commModal = document.getElementById('commissioner-modal');
  const commCloseBtn = document.getElementById('close-commissioner-modal-btn');
  if (commCloseBtn) commCloseBtn.addEventListener('click', () => commModal.classList.add('hidden'));
  if (commModal) {
    commModal.addEventListener('click', (e) => {
      if (e.target === commModal) commModal.classList.add('hidden');
    });
    commModal.querySelectorAll('.comm-modal-option').forEach(opt => {
      opt.addEventListener('click', () => {
        const role = opt.dataset.role;
        setState({
          selectedRole: role,
          viewArchived: false,
          viewMode: 'list',
          selectedActivityId: null,
        });
        commModal.classList.add('hidden');
        _updateManagerVisibility();
        closeSidebar();
      });
    });
  }
}

function _updateManagerVisibility() {
  const state = getAppState();
  const isManager = state.viewType === 'manager';
  const controls = document.getElementById('manager-only-controls');
  if (controls) {
    controls.classList.toggle('hidden', !isManager);
  }
}

function _renderAssignedList() {
  const list = document.getElementById('assigned-list');
  if (!list) return;
  if (assignedRoles.length === 0) {
    list.innerHTML = '<div class="text-xs text-gray-400 text-center py-2">暂无赋权记录</div>';
    return;
  }
  list.innerHTML = assignedRoles.map((a, i) => {
    const roleLabel = a.role === 'organizer' ? '组织者' : '深度参与者';
    return `<div class="flex items-center justify-between p-2 rounded-lg" style="background:var(--neutral-50);border:1px solid var(--neutral-200);">
      <div><span class="text-sm font-medium text-gray-700">${a.name}</span> <span class="text-xs text-gray-400">${roleLabel}</span></div>
      <button class="text-xs text-red-400 hover:text-red-600" data-revoke="${i}" style="background:none;border:none;cursor:pointer;">撤销</button>
    </div>`;
  }).join('');

  list.querySelectorAll('[data-revoke]').forEach(btn => {
    btn.addEventListener('click', () => {
      assignedRoles.splice(parseInt(btn.dataset.revoke), 1);
      _renderAssignedList();
    });
  });
}
