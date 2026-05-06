// role: [人机]
// feedback-entry.js — 意见反馈独立入口
import { renderSidebar } from './components/sidebar.js';
import { renderHeader } from './components/header.js';
import { FeedbackStore } from './service.feedback.js';
import { showToast } from './utils.js';

renderSidebar('feedback');
renderHeader('feedback');

document.getElementById('btn-submit-feedback')?.addEventListener('click', () => {
  const scopeEl = document.querySelector('input[name="scope"]:checked');
  const scope = scopeEl ? scopeEl.value : '';
  const painPoint = document.getElementById('pain-point-input')?.value.trim() || '';
  const painPointDetail = document.getElementById('pain-point-detail')?.value.trim() || '';
  const proposedFix = document.getElementById('proposed-fix-input')?.value.trim() || '';
  const submittedBy = document.getElementById('submitter-input')?.value.trim() || '匿名';

  if (!scope) {
    showToast('error', '请选择影响范围');
    return;
  }
  if (!painPoint && !proposedFix) {
    showToast('error', '请至少填写痛点或期望更改');
    return;
  }

  const record = FeedbackStore.add({
    scope,
    painPoint: painPoint + (painPointDetail ? ' | ' + painPointDetail : ''),
    proposedFix,
    submittedBy,
  });

  // 清空表单
  document.querySelectorAll('input[name="scope"]').forEach(r => r.checked = false);
  document.getElementById('pain-point-input').value = '';
  document.getElementById('pain-point-detail').value = '';
  document.getElementById('proposed-fix-input').value = '';
  document.getElementById('submitter-input').value = '';

  const msg = document.getElementById('feedback-submit-msg');
  if (msg) { msg.classList.remove('hidden'); setTimeout(() => msg.classList.add('hidden'), 3000); }

  showToast('success', '反馈已提交！感谢你的贡献。');
  renderRecentFeedback();
});

function renderRecentFeedback() {
  const container = document.getElementById('recent-feedback-list');
  if (!container) return;

  const items = FeedbackStore.getAll().slice(-10).reverse();
  if (items.length === 0) {
    container.innerHTML = '<p class="text-sm text-gray-400 text-center py-8">暂无反馈记录。欢迎提交第一条意见！</p>';
    return;
  }

  const scopeLabels = {
    permanent: '底层架构',
    global: '全局通用',
    role: '权责调整',
    scenario: '特定场景',
  };

  container.innerHTML = items.map(f => `
    <div class="p-4 rounded-xl border border-gray-100 bg-gray-50/50">
      <div class="flex items-center justify-between mb-2">
        <span class="text-xs px-2 py-0.5 rounded-full font-medium ${f.status === 'pending' ? 'bg-amber-100 text-amber-700' : f.status === 'processing' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}">${f.status === 'pending' ? '待处理' : f.status === 'processing' ? '处理中' : '已处理'}</span>
        <span class="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-600">${scopeLabels[f.scope] || f.scope}</span>
      </div>
      ${f.painPoint ? `<p class="text-sm text-gray-700 mb-1"><span class="text-gray-400">痛点：</span>${f.painPoint}</p>` : ''}
      ${f.proposedFix ? `<p class="text-sm text-gray-700"><span class="text-gray-400">建议：</span>${f.proposedFix}</p>` : ''}
      <div class="flex items-center justify-between mt-2 text-xs text-gray-400">
        <span>${f.submittedBy}</span>
        <span>${f.submittedAt}</span>
      </div>
    </div>
  `).join('');
}

renderRecentFeedback();
