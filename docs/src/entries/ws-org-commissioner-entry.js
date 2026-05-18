import { getAppState, setState, STATE, registerRenderCallback } from '../core/state.js';
import { BranchService } from '../services/runtime.js';
import { showToast } from '../core/utils.js';
import { CrossPageState } from '../core/cross-page-state.js';
import { renderSidebar } from '../components/sidebar.js';
import { renderHeader } from '../components/header.js';
import { ViewModeStore, AuthStore } from '../services/auth.js';
import { TaskForceRecordStore } from '../services/taskforce.js';
import { KANBAN_MOCKS, ACTIVITIES } from '../mock/index.js';

renderSidebar('workspace');
renderHeader('workspace');

const savedState = CrossPageState.load();
AuthStore.setActiveRole('workspace', savedState.selectedRole || 'org-commissioner');
ViewModeStore.setMode('workspace', 'manage');

const accent = '#CE1126';
const accentRgba = 'rgba(206,17,38,0.1)';
const accentBorder = 'rgba(206,17,38,0.3)';

const SVG = {
  people: '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
  clipboard: '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M12 11h4"/><path d="M12 16h4"/><path d="M8 11h.01"/><path d="M8 16h.01"/></svg>',
  calendar: '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>',
};

function renderOrgUI(state) {
  let activities = state.activities || [];
  if (activities.length === 0 && ACTIVITIES.length > 0) {
    activities = ACTIVITIES.map(a => ({ ...a, visibility: 'branch', executor: a.organizer || 'u_exec', supervisor: null, createdBy: a.organizer || 'u_exec', createdAt: a.date || new Date().toISOString() }));
    setState({ activities });
    return;
  }

  const container = document.getElementById('org-content');
  if (!container) return;

  const taskforces = TaskForceRecordStore.getAll();
  const pending = taskforces.filter(t => t.status === 'draft' || t.status === 'pending_review');
  const recruiting = taskforces.filter(t => t.status === 'recruiting');
  const active = taskforces.filter(t => t.status === 'active');

  container.innerHTML = `
    <div class="flex gap-2 mb-4">
      <button class="org-tab-btn px-4 py-2 text-xs font-medium rounded-lg transition-colors" data-org-tab="taskforce" style="background:${accentRgba};color:${accent};border:1px solid ${accentBorder};">专班管理</button>
      <button class="org-tab-btn px-4 py-2 text-xs font-medium rounded-lg transition-colors" data-org-tab="tracking" style="background:white;color:#6B7280;border:1px solid #E5E7EB;">追踪看板</button>
      <button id="btn-publish-tf" class="ml-auto text-xs px-3 py-2 rounded-lg bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 transition-colors" style="cursor:pointer;">发布招募</button>
    </div>
    <div id="org-tab-content"></div>
  `;

  container.querySelectorAll('.org-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.org-tab-btn').forEach(b => {
        b.style.background = 'white'; b.style.color = '#6B7280'; b.style.border = '1px solid #E5E7EB';
      });
      btn.style.background = accentRgba; btn.style.color = accent; btn.style.border = `1px solid ${accentBorder}`;
      const tab = btn.dataset.orgTab;
      if (tab === 'taskforce') _renderTaskforceContent(pending, recruiting, active);
      else if (tab === 'tracking') _renderTrackingContent(activities);
    });
  });

  container.querySelector('#btn-publish-tf')?.addEventListener('click', () => showToast('info', '发布招募表单 — 待实现'));

  _renderTaskforceContent(pending, recruiting, active);

  const urlParams = CrossPageState.getURLParams();
  if (urlParams.taskforceId) {
    setTimeout(() => {
      const card = container.querySelector(`.tf-store-card[data-tf-id="${urlParams.taskforceId}"]`);
      if (card) {
        card.click();
        card.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  }
}

function _renderTaskforceContent(pending, recruiting, active) {
  const container = document.getElementById('org-tab-content');
  if (!container) return;

  const statusLabel = { pending_review: '待审核', recruiting: '招募中', active: '运行中', completed: '已完结', draft: '草稿' };
  const statusColor = { pending_review: '#6366F1', recruiting: '#D97706', active: '#10B981', completed: '#3B82F6', draft: '#6B7280' };

  container.innerHTML = `
    <div class="flex flex-wrap gap-2 mb-3">
      <input type="text" id="org-tf-search" class="input-flat text-xs flex-1 min-w-[140px]" placeholder="搜索专班名称或任务...">
    </div>
    <div id="org-tf-kanban"></div>
    <div id="tf-detail-panel" class="hidden card rounded-2xl p-5 border-l-4" style="border-left-color:#CE1126;"></div>
  `;

  function renderKanban() {
    const kb = document.getElementById('org-tf-kanban');
    if (!kb) return;
    const q = (document.getElementById('org-tf-search')?.value || '').trim().toLowerCase();
    const fp = q ? pending.filter(t => (t.name || '').toLowerCase().includes(q) || (t.task || '').toLowerCase().includes(q)) : pending;
    const fr = q ? recruiting.filter(t => (t.name || '').toLowerCase().includes(q) || (t.task || '').toLowerCase().includes(q)) : recruiting;
    const fa = q ? active.filter(t => (t.name || '').toLowerCase().includes(q) || (t.task || '').toLowerCase().includes(q)) : active;
    kb.innerHTML = `
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div class="card rounded-2xl p-0 overflow-hidden">
          <div class="px-4 py-3 font-title-cn text-sm font-bold" style="background:rgba(99,102,241,0.06);color:#6366F1;border-bottom:2px solid rgba(99,102,241,0.15);">待审核 (${fp.length})</div>
          <div class="p-3 space-y-3 min-h-[120px]">
            ${fp.length === 0 ? '<p class="text-xs text-gray-400 text-center py-6">暂无待审核专班</p>' :
              fp.map(t => _renderTfCard(t, statusLabel, statusColor)).join('')}
          </div>
        </div>
        <div class="card rounded-2xl p-0 overflow-hidden">
          <div class="px-4 py-3 font-title-cn text-sm font-bold" style="background:rgba(217,119,6,0.06);color:#D97706;border-bottom:2px solid rgba(217,119,6,0.15);">招募中 (${fr.length})</div>
          <div class="p-3 space-y-3 min-h-[120px]">
            ${fr.length === 0 ? '<p class="text-xs text-gray-400 text-center py-6">暂无招募中专班</p>' :
              fr.map(t => _renderTfCard(t, statusLabel, statusColor)).join('')}
          </div>
        </div>
        <div class="card rounded-2xl p-0 overflow-hidden">
          <div class="px-4 py-3 font-title-cn text-sm font-bold" style="background:rgba(16,185,129,0.06);color:#10B981;border-bottom:2px solid rgba(16,185,129,0.15);">运行中 (${fa.length})</div>
          <div class="p-3 space-y-3 min-h-[120px]">
            ${fa.length === 0 ? '<p class="text-xs text-gray-400 text-center py-6">暂无运行中专班</p>' :
              fa.map(t => _renderTfCard(t, statusLabel, statusColor)).join('')}
          </div>
        </div>
      </div>
    `;
    bindCardClicks();
  }

  document.getElementById('org-tf-search')?.addEventListener('input', renderKanban);
  renderKanban();

  function bindCardClicks() {
    container.querySelectorAll('.tf-store-card').forEach(card => {
    card.addEventListener('click', () => {
      const tfId = card.dataset.tfId;
      const tf = TaskForceRecordStore.getAll().find(r => r.id === tfId);
      if (!tf) return;
      const panel = document.getElementById('tf-detail-panel');
      if (!panel) return;
      panel.classList.remove('hidden');
      const filled = tf.members.filter(m => m.name !== '待招募').length;
      panel.innerHTML = `
        <h4 class="font-title-cn text-sm font-bold text-gray-700 mb-3">${tf.name}</h4>
        <p class="text-xs text-gray-500 mb-2">${tf.task}</p>
        <div class="flex gap-4 text-xs text-gray-400 mb-3">
          <span>${SVG.people} ${filled}/${tf.capacity}</span>
          ${tf.deadline ? `<span>${SVG.calendar} ${tf.deadline}</span>` : ''}
          <span>发起: ${tf.initiator}</span>
        </div>
        <div class="text-xs text-gray-500">成员：${tf.members.map(m => m.name).join('、')}</div>
      `;
    });
  });
  }
}

function _renderTfCard(t, statusLabel, statusColor) {
  const filled = t.members.filter(m => m.name !== '待招募').length;
  const color = statusColor[t.status] || '#6B7280';
  return `
    <div class="kanban-card p-4 rounded-xl border border-gray-100 bg-white cursor-pointer tf-store-card hover:shadow-sm transition-shadow" data-tf-id="${t.id}">
      <div class="flex items-start justify-between gap-2 mb-2">
        <span class="text-sm font-semibold text-gray-800 leading-snug">${t.name}</span>
        <span class="text-[10px] px-1.5 py-0.5 rounded-full font-medium" style="background:${color}15;color:${color};">${statusLabel[t.status] || t.status}</span>
      </div>
      <p class="text-xs text-gray-500 mb-2 line-clamp-2">${t.task}</p>
      <div class="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-400">
        <span>${SVG.people} ${filled}/${t.capacity}</span>
        ${t.deadline ? `<span>${SVG.calendar} ${t.deadline}</span>` : ''}
      </div>
    </div>`;
}

function _renderTrackingContent(activities) {
  const container = document.getElementById('org-tab-content');
  if (!container) return;
  const published = activities.filter(a => a.status === 'published' || a.status === 'ongoing');
  container.innerHTML = `
    <div class="card rounded-2xl p-5 border-l-4" style="border-left-color:#CE1126;">
      <h4 class="font-title-cn text-sm font-bold text-gray-700 mb-3">活动追踪看板</h4>
      <div class="text-xs text-gray-500 mb-3">组织委员可追踪所有已发布活动的执行状态</div>
      <div class="flex flex-wrap gap-2 mb-3">
        <input type="text" id="org-track-search" class="input-flat text-xs flex-1 min-w-[140px]" placeholder="搜索活动名称或类型...">
      </div>
      <div id="org-track-list"></div>
    </div>
  `;

  function renderList() {
    const listEl = document.getElementById('org-track-list');
    if (!listEl) return;
    const q = (document.getElementById('org-track-search')?.value || '').trim().toLowerCase();
    const filtered = q ? published.filter(a => (a.title || '').toLowerCase().includes(q) || (a.type || '').toLowerCase().includes(q)) : published;
    listEl.innerHTML = `
      <div class="space-y-2">
        ${filtered.length === 0 ? '<p class="text-xs text-gray-400 text-center py-6">无匹配活动</p>' :
          filtered.map(a => `
            <div class="flex items-center justify-between p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors">
              <div class="flex-1 min-w-0">
                <div class="text-sm font-medium text-gray-800">${a.title || '未命名'}</div>
                <div class="text-xs text-gray-500 mt-0.5">${a.date || ''} ${a.type ? '· ' + a.type : ''}${a.location ? ' · ' + a.location : ''}</div>
              </div>
              <span class="text-[10px] px-1.5 py-0.5 rounded-full bg-green-100 text-green-700">已发布</span>
            </div>
          `).join('')}
      </div>
    `;
  }

  document.getElementById('org-track-search')?.addEventListener('input', renderList);
  renderList();
}

registerRenderCallback(renderOrgUI);

(async function init() {
  try { if (typeof BranchService.loadDB === 'function') BranchService.loadDB(); TaskForceRecordStore.init(); } catch (e) { console.warn('[ws-org] loadDB error', e); }
  setState({ domain: 'activity', role: 'org-commissioner', activeModule: 'workspace', status: STATE.LOADING, selectedRole: 'org-commissioner' });
  try {
    const activities = await BranchService.listActivities();
    setState({ status: STATE.IDLE, activities });
  } catch (err) {
    console.warn('[ws-org] load failed', err);
    setState({ status: STATE.IDLE, activities: ACTIVITIES.map(a => ({ ...a, visibility: 'branch', executor: a.organizer || 'u_exec', supervisor: null, createdBy: a.organizer || 'u_exec', createdAt: a.date || new Date().toISOString() })) });
  }
}());
