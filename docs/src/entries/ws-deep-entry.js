import { getAppState, setState, STATE, registerRenderCallback } from '../core/state.js';
import { BranchService } from '../services/runtime.js';
import { showToast } from '../core/utils.js';
import { CrossPageState } from '../core/cross-page-state.js';
import { renderSidebar } from '../components/sidebar.js';
import { renderHeader } from '../components/header.js';
import { ViewModeStore, AuthStore } from '../services/auth.js';
import { ACTIVITIES } from '../mock/index.js';

renderSidebar('workspace');
renderHeader('workspace');

const savedState = CrossPageState.load();
AuthStore.setActiveRole('workspace', savedState.selectedRole || 'deep');
ViewModeStore.setMode('workspace', 'manage');

function _filterByRole(state, role) {
  const activities = (state.activities || []).filter(a => {
    if (role === 'deep') return a.deepParticipantName || a.deepParticipants;
    return true;
  });
  return { ...state, activities };
}

function renderDeepUI(state) {
  let activities = state.activities || [];
  if (activities.length === 0 && ACTIVITIES.length > 0) {
    activities = ACTIVITIES.map(a => ({ ...a, visibility: 'branch', executor: a.organizer || 'u_exec', supervisor: null, createdBy: a.organizer || 'u_exec', createdAt: a.date || new Date().toISOString() }));
    setState({ activities });
    return;
  }

  const container = document.getElementById('deep-content');
  if (!container) return;

  const filteredState = _filterByRole(state, 'deep');
  const filteredActivities = filteredState.activities || [];

  container.innerHTML = `
    <div class="card rounded-2xl p-5 border-l-4" style="border-left-color:#10B981;">
      <div class="mb-4">
        <h3 class="font-title-cn text-base font-bold text-gray-800">关联活动</h3>
        <p class="text-xs text-gray-500 mt-1">深度参与者可更新关联活动的任务状态</p>
      </div>
      <div class="space-y-2">
        ${filteredActivities.length === 0 ? '<p class="text-xs text-gray-400 text-center py-6">暂无关联活动</p>' :
          filteredActivities.map(a => `
            <div class="flex items-center justify-between p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors">
              <div class="flex-1 min-w-0">
                <div class="text-sm font-medium text-gray-800">${a.title || '未命名'}</div>
                <div class="text-xs text-gray-500 mt-0.5">${a.date || ''} ${a.type ? '· ' + a.type : ''}</div>
              </div>
              <button class="text-xs px-2 py-1 rounded-lg bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 transition-colors" style="cursor:pointer;">更新状态</button>
            </div>
          `).join('')}
      </div>
    </div>
  `;
}

registerRenderCallback(renderDeepUI);

(async function init() {
  try { if (typeof BranchService.loadDB === 'function') BranchService.loadDB(); } catch (e) { console.warn('[ws-deep] loadDB error', e); }
  setState({ domain: 'activity', role: 'deep', activeModule: 'workspace', status: STATE.LOADING, selectedRole: 'deep' });
  try {
    const activities = await BranchService.listActivities();
    setState({ status: STATE.IDLE, activities });
  } catch (err) {
    console.warn('[ws-deep] load failed', err);
    setState({ status: STATE.IDLE, activities: ACTIVITIES.map(a => ({ ...a, visibility: 'branch', executor: a.organizer || 'u_exec', supervisor: null, createdBy: a.organizer || 'u_exec', createdAt: a.date || new Date().toISOString() })) });
  }
}());
