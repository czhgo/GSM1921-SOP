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

renderSidebar('workspace');
renderHeader('workspace');

const savedState = CrossPageState.load();
AuthStore.setActiveRole('workspace', savedState.selectedRole || 'secretary');
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

  const filteredState = { ...state, activities };
  renderCalendarByActivities(filteredState, state.displayMonth || _currentYearMonth());
  renderInspectorFromState(filteredState);
  populateMonthSelector(activities);

  const writeArea = document.getElementById('write-form-area');
  if (writeArea && writeArea.childElementCount === 0) {
    writeArea.innerHTML = `
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div>
          <label class="text-xs text-gray-500 mb-1 block">日期</label>
          <input type="date" id="ws-sec-date" class="w-full text-sm border rounded-lg px-3 py-2">
        </div>
        <div>
          <label class="text-xs text-gray-500 mb-1 block">地点</label>
          <input type="text" id="ws-sec-location" class="w-full text-sm border rounded-lg px-3 py-2" placeholder="活动地点">
        </div>
        <div>
          <label class="text-xs text-gray-500 mb-1 block">活动名称</label>
          <input type="text" id="ws-sec-title" class="w-full text-sm border rounded-lg px-3 py-2" placeholder="活动名称">
        </div>
      </div>
      <button id="ws-sec-submit" class="text-sm px-4 py-2 rounded-lg bg-red-700 text-white hover:bg-red-800 transition-colors">写入活动</button>
    `;
    writeArea.querySelector('#ws-sec-submit')?.addEventListener('click', () => {
      showToast('info', '活动写入 — 待接入持久化层');
    });
  }

  const assignArea = document.getElementById('assign-area');
  if (assignArea && assignArea.childElementCount === 0) {
    assignArea.innerHTML = `
      <p class="text-xs text-gray-500 mb-3">书记可对活动进行赋权操作，将活动分配给对应角色</p>
      <button id="ws-sec-assign-btn" class="text-sm px-4 py-2 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition-colors">赋权管理</button>
    `;
    assignArea.querySelector('#ws-sec-assign-btn')?.addEventListener('click', () => {
      showToast('info', '赋权管理面板 — 待实现');
    });
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
