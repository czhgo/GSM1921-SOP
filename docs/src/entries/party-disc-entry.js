import { registerRenderCallback } from '../core/state.js';
import { bootstrapPage } from '../core/bootstrap.js';
import { PartyModule } from '../modules/party.js';
import { loadPartyData } from '../core/data-loader.js';
import { renderTabBar } from '../components/tab-bar.js';

const { savedState, accent, accentRgba, accentBorder } = bootstrapPage({ module: 'party', defaultRole: 'disc-commissioner', viewMode: 'manage', accentRole: 'disc-commissioner' });

function renderDiscPartyUI() {
  const container = document.getElementById('disc-party-content');
  if (!container) return;

  const tabBar = renderTabBar({
    prefix: 'discp',
    tabs: [
      { id: 'makeup', label: '补课制度', render: () => _renderTab('makeup') },
      { id: 'mailbox', label: '公邮管理', render: () => _renderTab('mailbox') },
    ],
    accentColor: { accent, accentRgba, accentBorder },
    defaultTab: 'makeup',
  });

  container.innerHTML = tabBar.html;
  tabBar.bindEvents(container);
  tabBar.activate('makeup');
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

loadPartyData({ role: 'disc-commissioner', partyModule: PartyModule, renderFn: renderDiscPartyUI });
