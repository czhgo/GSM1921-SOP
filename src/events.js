// ════════════════════════════════════════════════════════════════
//  events.js — DOM 事件绑定与推演工作台控制台初始化
//  对外暴露 setupEventListeners()，由 main.js 在启动时调用
// ════════════════════════════════════════════════════════════════

import { getAppState, setState, STATE } from './state.js';
import { _fmtDate, showToast } from './utils.js';
import { instantiateSOP } from './sop.js';
import { BranchService } from './service.runtime.js';

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

  // 场景切换：主题党日时显示党员姓名输入框，其他场景隐藏并清空
  const scSelect = document.getElementById('scenario-select-cal');
  const participantWrap = document.getElementById('participant-name-wrap');
  const participantInput = document.getElementById('participant-name-input');
  if (scSelect && participantWrap && participantInput) {
    scSelect.addEventListener('change', () => {
      if (scSelect.value === 'theme-party') {
        participantWrap.classList.remove('hidden');
      } else {
        participantWrap.classList.add('hidden');
        participantInput.value = '';
      }
    });
  }

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
    const scIds    = scVal === 'all-timed' ? ['org-life', 'theme-party'] : [scVal];

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

    // 读取党员姓名（独立字段，不拼入标题）
    const participantName = (participantInput && !participantWrap.classList.contains('hidden'))
      ? participantInput.value.trim()
      : '';

    // 读取活动组织者姓名与深度参与者姓名（Phase 1 新增字段）
    const organizerNameInput     = document.getElementById('organizer-name-input');
    const deepParticipantInput   = document.getElementById('deep-name-input');
    const organizerName          = organizerNameInput    ? organizerNameInput.value.trim()   : '';
    const deepParticipantName    = deepParticipantInput  ? deepParticipantInput.value.trim() : '';

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
      if (participantName)     actPayload.participantName     = participantName;
      if (organizerName)       actPayload.organizerName       = organizerName;
      if (deepParticipantName) actPayload.deepParticipantName = deepParticipantName;

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
      const currentRole = getAppState().managementRole;
      setState({
        status:             STATE.SUCCESS,
        activities,
        tasks,
        displayMonth:       dateStr.slice(0, 7),
        selectedDate:       dateStr,
        viewMode:           'detail',
        selectedActivityId: newAct.id,
        viewType:           'manager',
        managementRole:     currentRole === 'participant' ? 'organizer' : currentRole,
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
      setState({ activeModule: tab.dataset.module });
      closeSidebar();
    });
  });

  // ── 领域按钮 ─────────────────────────────────────────────────
  document.querySelectorAll('.domain-btn[data-domain]').forEach(btn => {
    btn.addEventListener('click', () => {
      setState({ domain: btn.dataset.domain });
    });
  });

  // ── 角色按钮（参考指南模块，严格圈定容器防串台）────────────
  document.querySelectorAll('#sidebar-reference-menu .role-btn[data-role]').forEach(btn => {
    btn.addEventListener('click', () => {
      setState({ role: btn.dataset.role });
      closeSidebar();
    });
  });

  // ── 推演工作台侧边栏 RBAC 角色按钮分发 ──────────────────────
  const calMenu = document.getElementById('sidebar-calendar-menu');
  if (calMenu) {
    calMenu.querySelectorAll('.role-btn[data-role]').forEach(btn => {
      btn.addEventListener('click', () => {
        const r = btn.dataset.role;
        if (r === 'archived') {
          setState({
            viewArchived:      true,
            viewType:          'manager',
            viewMode:          'list',
            selectedActivityId: null,
          });
        } else if (r === 'participant') {
          setState({
            viewArchived:      false,
            viewType:          'participant',
            managementRole:    'participant',
            viewMode:          'list',
            selectedActivityId: null,
          });
        } else {
          setState({ viewArchived: false, viewType: 'manager', managementRole: r });
        }
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

  // ── 月份检索按钮 ─────────────────────────────────────────────
  const monthSearchBtn = document.getElementById('month-search-btn');
  const monthSelector  = document.getElementById('month-selector');
  if (monthSearchBtn && monthSelector) {
    monthSearchBtn.addEventListener('click', () => {
      const val = monthSelector.value;
      if (!val) return;
      setState({ displayMonth: val, selectedDate: null, viewMode: 'list' });
    });
  }

  // ── 推演工作台控制台 ─────────────────────────────────────────
  _initCalendarModule();
}
