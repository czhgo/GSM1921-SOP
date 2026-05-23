import { registerRenderCallback } from '../core/state.js';
import { bootstrapPage } from '../core/bootstrap.js';
import { PartyModule } from '../modules/party.js';
import { loadPartyData } from '../core/data-loader.js';
import { renderTabBar } from '../components/tab-bar.js';

const { savedState, accent, accentRgba, accentBorder } = bootstrapPage({ module: 'party', defaultRole: 'org-commissioner', viewMode: 'manage', accentRole: 'org-commissioner' });

function renderOrgPartyUI() {
  const container = document.getElementById('org-party-content');
  if (!container) return;

  const tabBar = renderTabBar({
    prefix: 'orgp',
    tabs: [
      { id: 'candidates', label: '追踪看板', render: () => _renderTab('candidates') },
      { id: 'material', label: '材料催缴', render: () => _renderTab('material') },
      { id: 'thought', label: '思想汇报', render: () => _renderTab('thought') },
      { id: 'compliance', label: '合规文件', render: () => _renderTab('compliance') },
    ],
    accentColor: { accent, accentRgba, accentBorder },
    defaultTab: 'candidates',
  });

  container.innerHTML = tabBar.html;
  tabBar.bindEvents(container);
  tabBar.activate('candidates');
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

loadPartyData({ role: 'org-commissioner', partyModule: PartyModule, renderFn: renderOrgPartyUI });
