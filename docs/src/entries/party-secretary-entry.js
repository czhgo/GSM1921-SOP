import { setState, STATE, registerRenderCallback } from '../core/state.js';
import { CrossPageState } from '../core/cross-page-state.js';
import { renderSidebar } from '../components/sidebar.js';
import { renderHeader } from '../components/header.js';
import { ViewModeStore, AuthStore } from '../services/auth.js';
import { PartyModule } from '../modules/party.js';
import { showToast } from '../core/utils.js';

renderSidebar('party');
renderHeader('party');

const savedState = CrossPageState.load();
AuthStore.setActiveRole('party', savedState.selectedRole || 'secretary');
if (savedState.stance) AuthStore.setPrimaryRole(savedState.stance);
ViewModeStore.setMode('party', 'manage');

const accent = '#7A0010';
const accentRgba = 'rgba(122,0,16,0.08)';
const accentBorder = 'rgba(122,0,16,0.2)';

function renderSecPartyUI() {
  const container = document.getElementById('sec-party-content');
  if (!container) return;

  container.innerHTML = `
    <div class="flex gap-2 mb-4">
      <button class="secp-tab-btn px-4 py-2 text-xs font-medium rounded-lg transition-colors" data-secp-tab="overview" style="background:${accentRgba};color:${accent};border:1px solid ${accentBorder};">全局聚合</button>
      <button class="secp-tab-btn px-4 py-2 text-xs font-medium rounded-lg transition-colors" data-secp-tab="batch" style="background:white;color:#6B7280;border:1px solid #E5E7EB;">批量操作</button>
      <button class="secp-tab-btn px-4 py-2 text-xs font-medium rounded-lg transition-colors" data-secp-tab="feedback" style="background:white;color:#6B7280;border:1px solid #E5E7EB;">意见反馈</button>
    </div>
    <div id="secp-tab-content"></div>
  `;

  container.querySelectorAll('.secp-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.secp-tab-btn').forEach(b => {
        b.style.background = 'white'; b.style.color = '#6B7280'; b.style.border = '1px solid #E5E7EB';
      });
      btn.style.background = accentRgba; btn.style.color = accent; btn.style.border = `1px solid ${accentBorder}`;
      _renderTab(btn.dataset.secpTab);
    });
  });

  _renderTab('overview');
}

function _renderTab(tab) {
  const tc = document.getElementById('secp-tab-content');
  if (!tc) return;

  if (tab === 'overview') {
    tc.innerHTML = `<div id="secretary-aggregate-view"><p class="text-xs text-gray-400">数据加载中...</p></div>`;
    setTimeout(() => PartyModule.refreshSecretaryAggregateView(), 100);
  } else if (tab === 'batch') {
    tc.innerHTML = `
      <div class="card rounded-2xl p-5 border-l-4" style="border-left-color:#7A0010;">
        <h4 class="font-title-cn text-sm font-bold text-gray-700 mb-3">批量操作</h4>
        <div class="flex gap-3 mb-3">
          <button id="btn-batch-remind" class="text-xs px-3 py-2 rounded-lg bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 transition-colors" style="cursor:pointer;">批量催缴</button>
          <button id="btn-batch-archive" class="text-xs px-3 py-2 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors" style="cursor:pointer;">批量归档</button>
          <button id="btn-batch-export" class="text-xs px-3 py-2 rounded-lg bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 transition-colors" style="cursor:pointer;">批量导出</button>
        </div>
        <div id="batch-op-msg"></div>
      </div>
    `;
    tc.querySelector('#btn-batch-remind')?.addEventListener('click', () => showToast('success', '批量催缴提醒已发送'));
    tc.querySelector('#btn-batch-archive')?.addEventListener('click', () => showToast('success', '批量归档完成'));
    tc.querySelector('#btn-batch-export')?.addEventListener('click', () => showToast('success', '数据导出完成'));
  } else if (tab === 'feedback') {
    tc.innerHTML = `
      <div class="card rounded-2xl p-5 border-l-4" style="border-left-color:#7A0010;">
        <h4 class="font-title-cn text-sm font-bold text-gray-700 mb-3">意见反馈数据集</h4>
        <div class="grid grid-cols-3 gap-3 mb-4">
          <div class="text-center p-3 rounded-lg bg-amber-50"><p class="text-lg font-bold text-amber-600" id="sec-fb-pending">—</p><p class="text-[10px] text-gray-500">待处理</p></div>
          <div class="text-center p-3 rounded-lg bg-blue-50"><p class="text-lg font-bold text-blue-600" id="sec-fb-processing">—</p><p class="text-[10px] text-gray-500">处理中</p></div>
          <div class="text-center p-3 rounded-lg bg-green-50"><p class="text-lg font-bold text-green-600" id="sec-fb-done">—</p><p class="text-[10px] text-gray-500">已完成</p></div>
        </div>
        <div id="sec-feedback-list"><p class="text-xs text-gray-400">数据加载中...</p></div>
      </div>
    `;
    setTimeout(() => PartyModule.refreshSecretaryAggregateView(), 100);
  }
}

registerRenderCallback(renderSecPartyUI);

PartyModule.loadAll();
setState({ domain: 'party', role: 'secretary', activeModule: 'party', status: STATE.IDLE, selectedRole: 'secretary' });
renderSecPartyUI();
