import { registerRenderCallback } from '../core/state.js';
import { bootstrapPage } from '../core/bootstrap.js';
import { PartyModule } from '../modules/party.js';
import { loadPartyData } from '../core/data-loader.js';
import { renderTabBar } from '../components/tab-bar.js';

const { savedState, accent, accentRgba, accentBorder } = bootstrapPage({ module: 'party', defaultRole: 'prop-commissioner', viewMode: 'manage', accentRole: 'prop-commissioner' });

function renderPropPartyUI() {
  const container = document.getElementById('prop-party-content');
  if (!container) return;

  const tabBar = renderTabBar({
    prefix: 'propp',
    tabs: [
      { id: 'archives', label: '档案归档', render: () => _renderTab('archives') },
      { id: 'standards', label: '材料标准', render: () => _renderTab('standards') },
      { id: 'weekly', label: '周报报送', render: () => _renderTab('weekly') },
    ],
    accentColor: { accent, accentRgba, accentBorder },
    defaultTab: 'archives',
  });

  container.innerHTML = tabBar.html;
  tabBar.bindEvents(container);
  tabBar.activate('archives');
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

loadPartyData({ role: 'prop-commissioner', partyModule: PartyModule, renderFn: renderPropPartyUI });
