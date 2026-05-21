import { setState, STATE, registerRenderCallback } from '../core/state.js';
import { CrossPageState } from '../core/cross-page-state.js';
import { renderSidebar } from '../components/sidebar.js';
import { renderHeader } from '../components/header.js';
import { ViewModeStore, AuthStore } from '../services/auth.js';
import { PartyModule } from '../modules/party.js';

renderSidebar('party');
renderHeader('party');

const savedState = CrossPageState.load();
AuthStore.setActiveRole('party', savedState.selectedRole || 'prop-commissioner');
if (savedState.stance) AuthStore.setPrimaryRole(savedState.stance);
ViewModeStore.setMode('party', 'manage');

const accent = '#10B981';
const accentRgba = 'rgba(16,185,129,0.1)';
const accentBorder = 'rgba(16,185,129,0.3)';

function renderPropPartyUI() {
  const container = document.getElementById('prop-party-content');
  if (!container) return;

  container.innerHTML = `
    <div class="flex gap-2 mb-4">
      <button class="propp-tab-btn px-4 py-2 text-xs font-medium rounded-lg transition-colors" data-propp-tab="archives" style="background:${accentRgba};color:${accent};border:1px solid ${accentBorder};">档案归档</button>
      <button class="propp-tab-btn px-4 py-2 text-xs font-medium rounded-lg transition-colors" data-propp-tab="standards" style="background:white;color:#6B7280;border:1px solid #E5E7EB;">材料标准</button>
      <button class="propp-tab-btn px-4 py-2 text-xs font-medium rounded-lg transition-colors" data-propp-tab="weekly" style="background:white;color:#6B7280;border:1px solid #E5E7EB;">周报报送</button>
    </div>
    <div id="propp-tab-content"></div>
  `;

  container.querySelectorAll('.propp-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.propp-tab-btn').forEach(b => {
        b.style.background = 'white'; b.style.color = '#6B7280'; b.style.border = '1px solid #E5E7EB';
      });
      btn.style.background = accentRgba; btn.style.color = accent; btn.style.border = `1px solid ${accentBorder}`;
      _renderTab(btn.dataset.proppTab);
    });
  });

  _renderTab('archives');
}

function _renderTab(tab) {
  const tc = document.getElementById('propp-tab-content');
  if (!tc) return;

  if (tab === 'archives') {
    tc.innerHTML = `<div class="card rounded-2xl p-5 border-l-4" style="border-left-color:#10B981;"><h4 class="font-title-cn text-sm font-bold text-gray-700 mb-3">档案归档</h4><div id="publicity-archives-list"><p class="text-xs text-gray-400">数据加载中...</p></div></div>`;
    setTimeout(() => PartyModule.refreshArchives(), 100);
  } else if (tab === 'standards') {
    tc.innerHTML = `<div class="card rounded-2xl p-5 border-l-4" style="border-left-color:#10B981;"><h4 class="font-title-cn text-sm font-bold text-gray-700 mb-3">材料标准</h4><div id="publicity-standards-content"><p class="text-xs text-gray-400">数据加载中...</p></div></div>`;
    setTimeout(() => PartyModule.refreshMaterialStandards(), 100);
  } else if (tab === 'weekly') {
    tc.innerHTML = `<div class="card rounded-2xl p-5 border-l-4" style="border-left-color:#10B981;"><h4 class="font-title-cn text-sm font-bold text-gray-700 mb-3">周报报送</h4><div id="publicity-weekly-list"><p class="text-xs text-gray-400">数据加载中...</p></div></div>`;
    setTimeout(() => PartyModule.refreshWeeklyReport(), 100);
  }
}

registerRenderCallback(renderPropPartyUI);

PartyModule.loadAll();
setState({ domain: 'party', role: 'prop-commissioner', activeModule: 'party', status: STATE.IDLE, selectedRole: 'prop-commissioner' });
renderPropPartyUI();
