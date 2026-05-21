import { setState, STATE, registerRenderCallback } from '../core/state.js';
import { CrossPageState } from '../core/cross-page-state.js';
import { renderSidebar } from '../components/sidebar.js';
import { renderHeader } from '../components/header.js';
import { ViewModeStore, AuthStore } from '../services/auth.js';
import { PartyModule } from '../modules/party.js';

renderSidebar('party');
renderHeader('party');

const savedState = CrossPageState.load();
AuthStore.setActiveRole('party', savedState.selectedRole || 'org-commissioner');
if (savedState.stance) AuthStore.setPrimaryRole(savedState.stance);
ViewModeStore.setMode('party', 'manage');

const accent = '#CE1126';
const accentRgba = 'rgba(206,17,38,0.1)';
const accentBorder = 'rgba(206,17,38,0.3)';

function renderOrgPartyUI() {
  const container = document.getElementById('org-party-content');
  if (!container) return;

  container.innerHTML = `
    <div class="flex gap-2 mb-4">
      <button class="orgp-tab-btn px-4 py-2 text-xs font-medium rounded-lg transition-colors" data-orgp-tab="candidates" style="background:${accentRgba};color:${accent};border:1px solid ${accentBorder};">追踪看板</button>
      <button class="orgp-tab-btn px-4 py-2 text-xs font-medium rounded-lg transition-colors" data-orgp-tab="material" style="background:white;color:#6B7280;border:1px solid #E5E7EB;">材料催缴</button>
      <button class="orgp-tab-btn px-4 py-2 text-xs font-medium rounded-lg transition-colors" data-orgp-tab="thought" style="background:white;color:#6B7280;border:1px solid #E5E7EB;">思想汇报</button>
      <button class="orgp-tab-btn px-4 py-2 text-xs font-medium rounded-lg transition-colors" data-orgp-tab="compliance" style="background:white;color:#6B7280;border:1px solid #E5E7EB;">合规文件</button>
    </div>
    <div id="orgp-tab-content"></div>
  `;

  container.querySelectorAll('.orgp-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.orgp-tab-btn').forEach(b => {
        b.style.background = 'white'; b.style.color = '#6B7280'; b.style.border = '1px solid #E5E7EB';
      });
      btn.style.background = accentRgba; btn.style.color = accent; btn.style.border = `1px solid ${accentBorder}`;
      const tab = btn.dataset.orgpTab;
      _renderTab(tab);
    });
  });

  _renderTab('candidates');
}

function _renderTab(tab) {
  const tc = document.getElementById('orgp-tab-content');
  if (!tc) return;

  if (tab === 'candidates') {
    PartyModule.refreshCandidateTracker();
    const list = document.getElementById('organizer-candidates-list');
    if (list) {
      tc.innerHTML = `<div class="card rounded-2xl p-5 border-l-4" style="border-left-color:#CE1126;"><h4 class="font-title-cn text-sm font-bold text-gray-700 mb-3">发展党员追踪</h4><div id="organizer-candidates-list"></div></div>`;
      PartyModule.refreshCandidateTracker();
    } else {
      tc.innerHTML = `<div class="card rounded-2xl p-5 border-l-4" style="border-left-color:#CE1126;"><h4 class="font-title-cn text-sm font-bold text-gray-700 mb-3">发展党员追踪</h4><div id="organizer-candidates-list"><p class="text-xs text-gray-400">数据加载中...</p></div></div>`;
      setTimeout(() => PartyModule.refreshCandidateTracker(), 100);
    }
  } else if (tab === 'material') {
    tc.innerHTML = `<div class="card rounded-2xl p-5 border-l-4" style="border-left-color:#CE1126;"><h4 class="font-title-cn text-sm font-bold text-gray-700 mb-3">材料催缴</h4><div id="organizer-material-list"><p class="text-xs text-gray-400">数据加载中...</p></div></div>`;
    setTimeout(() => PartyModule.refreshMaterialRemind(), 100);
  } else if (tab === 'thought') {
    tc.innerHTML = `<div class="card rounded-2xl p-5 border-l-4" style="border-left-color:#CE1126;"><h4 class="font-title-cn text-sm font-bold text-gray-700 mb-3">思想汇报</h4><div id="organizer-thought-list"><p class="text-xs text-gray-400">数据加载中...</p></div></div>`;
    setTimeout(() => PartyModule.refreshThoughtReport(), 100);
  } else if (tab === 'compliance') {
    tc.innerHTML = `<div class="card rounded-2xl p-5 border-l-4" style="border-left-color:#CE1126;"><h4 class="font-title-cn text-sm font-bold text-gray-700 mb-3">合规文件</h4><div id="organizer-compliance-file-list"></div><div id="organizer-compliance-reader" class="mt-3"></div></div>`;
    setTimeout(() => PartyModule.renderComplianceRefs('organizer-compliance-file-list', 'organizer-compliance-reader'), 100);
  }
}

registerRenderCallback(renderOrgPartyUI);

PartyModule.loadAll();
setState({ domain: 'party', role: 'org-commissioner', activeModule: 'party', status: STATE.IDLE, selectedRole: 'org-commissioner' });
renderOrgPartyUI();
