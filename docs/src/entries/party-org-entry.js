import { registerRenderCallback } from '../core/state.js';
import { bootstrapPage } from '../core/bootstrap.js';
import { PartyModule } from '../modules/party.js';
import { loadPartyData } from '../core/data-loader.js';
import { renderTabBar } from '../components/tab-bar.js';
import { renderPartyCrossNav } from '../components/party-cross-nav.js';

const { accent, accentRgba, accentBorder } = bootstrapPage({ module: 'party', accentRole: 'org-commissioner' });

function renderOrgPartyUI() {
  const container = document.getElementById('org-party-content');
  if (!container) return;

  // 跨支委导航栏（A2: party 跨支委查看权限）
  renderPartyCrossNav('org-commissioner', document.getElementById('party-cross-nav'));

  const tabBar = renderTabBar({
    prefix: 'orgp',
    tabs: [
      { id: 'candidates', label: '追踪看板', render: () => _renderTab('candidates') },
      { id: 'material', label: '材料催缴', render: () => _renderTab('material') },
      { id: 'compliance', label: '制度文件', render: () => _renderTab('compliance') },
    ],
    accentColor: { accent, accentRgba, accentBorder },
    defaultTab: 'candidates',
    storageKey: 'workflowos_tab_orgp',
  });

  container.innerHTML = tabBar.html;
  tabBar.bindEvents(container);
  tabBar.activate(tabBar.activeTab);
}

function _renderTab(tab) {
  const tc = document.getElementById('orgp-tab-content');
  if (!tc) return;

  if (tab === 'candidates') {
    PartyModule.refreshCandidateTracker();
    const list = document.getElementById('organizer-candidates-list');
    if (list) {
      tc.innerHTML = `<div class="card rounded-xl p-5 border-l-4" style="border-left-color:${accent};"><h4 class="font-title-cn text-sm font-bold text-gray-700 mb-3">发展党员追踪</h4><div id="organizer-candidates-list"></div></div>`;
      PartyModule.refreshCandidateTracker();
    } else {
      tc.innerHTML = `<div class="card rounded-xl p-5 border-l-4" style="border-left-color:${accent};"><h4 class="font-title-cn text-sm font-bold text-gray-700 mb-3">发展党员追踪</h4><div id="organizer-candidates-list"><p class="text-xs text-gray-400">数据加载中...</p></div></div>`;
      setTimeout(() => PartyModule.refreshCandidateTracker(), 100);
    }
  } else if (tab === 'material') {
    tc.innerHTML = `<div class="card rounded-xl p-5 border-l-4" style="border-left-color:${accent};"><h4 class="font-title-cn text-sm font-bold text-gray-700 mb-3">材料催缴</h4><div id="organizer-material-list"><p class="text-xs text-gray-400">数据加载中...</p></div></div>`;
    setTimeout(() => PartyModule.refreshMaterialRemind(), 100);
  } else if (tab === 'compliance') {
    tc.innerHTML = `<div class="card rounded-xl p-5 border-l-4" style="border-left-color:${accent};"><h4 class="font-title-cn text-sm font-bold text-gray-700 mb-3">制度文件</h4><div id="organizer-compliance-file-list"></div><div id="organizer-compliance-reader" class="mt-3"></div></div>`;
    setTimeout(() => PartyModule.renderComplianceRefs('organizer-compliance-file-list', 'organizer-compliance-reader'), 100);
  }
}

registerRenderCallback(renderOrgPartyUI);

loadPartyData({ role: 'org-commissioner', partyModule: PartyModule, renderFn: renderOrgPartyUI });
