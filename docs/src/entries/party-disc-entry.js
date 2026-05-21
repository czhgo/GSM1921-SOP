import { setState, STATE, registerRenderCallback } from '../core/state.js';
import { CrossPageState } from '../core/cross-page-state.js';
import { renderSidebar } from '../components/sidebar.js';
import { renderHeader } from '../components/header.js';
import { ViewModeStore, AuthStore } from '../services/auth.js';
import { PartyModule } from '../modules/party.js';

renderSidebar('party');
renderHeader('party');

const savedState = CrossPageState.load();
AuthStore.setActiveRole('party', savedState.selectedRole || 'disc-commissioner');
if (savedState.stance) AuthStore.setPrimaryRole(savedState.stance);
ViewModeStore.setMode('party', 'manage');

const accent = '#D97706';
const accentRgba = 'rgba(217,119,6,0.1)';
const accentBorder = 'rgba(217,119,6,0.3)';

function renderDiscPartyUI() {
  const container = document.getElementById('disc-party-content');
  if (!container) return;

  container.innerHTML = `
    <div class="flex gap-2 mb-4">
      <button class="discp-tab-btn px-4 py-2 text-xs font-medium rounded-lg transition-colors" data-discp-tab="makeup" style="background:${accentRgba};color:${accent};border:1px solid ${accentBorder};">补课制度</button>
      <button class="discp-tab-btn px-4 py-2 text-xs font-medium rounded-lg transition-colors" data-discp-tab="mailbox" style="background:white;color:#6B7280;border:1px solid #E5E7EB;">公邮管理</button>
    </div>
    <div id="discp-tab-content"></div>
  `;

  container.querySelectorAll('.discp-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.discp-tab-btn').forEach(b => {
        b.style.background = 'white'; b.style.color = '#6B7280'; b.style.border = '1px solid #E5E7EB';
      });
      btn.style.background = accentRgba; btn.style.color = accent; btn.style.border = `1px solid ${accentBorder}`;
      _renderTab(btn.dataset.discpTab);
    });
  });

  _renderTab('makeup');
}

function _renderTab(tab) {
  const tc = document.getElementById('discp-tab-content');
  if (!tc) return;

  if (tab === 'makeup') {
    tc.innerHTML = `<div class="card rounded-2xl p-5 border-l-4" style="border-left-color:#D97706;"><h4 class="font-title-cn text-sm font-bold text-gray-700 mb-3">补课制度</h4><div id="inspector-makeup-list"><p class="text-xs text-gray-400">数据加载中...</p></div></div>`;
    setTimeout(() => PartyModule.refreshMakeupStatus(), 100);
  } else if (tab === 'mailbox') {
    tc.innerHTML = `<div class="card rounded-2xl p-5 border-l-4" style="border-left-color:#D97706;"><h4 class="font-title-cn text-sm font-bold text-gray-700 mb-3">公邮管理</h4><div id="inspector-mailbox-info"><p class="text-xs text-gray-400">数据加载中...</p></div></div>`;
    setTimeout(() => PartyModule.refreshMailboxReminder(), 100);
  }
}

registerRenderCallback(renderDiscPartyUI);

PartyModule.loadAll();
setState({ domain: 'party', role: 'disc-commissioner', activeModule: 'party', status: STATE.IDLE, selectedRole: 'disc-commissioner' });
renderDiscPartyUI();
