// role: [人机]
// feedback-entry.js — 意见反馈独立入口
import { renderSidebar } from '../components/sidebar.js';
import { renderHeader } from '../components/header.js';
import { FeedbackStore } from '../services/feedback.js';
import { showToast } from '../core/utils.js';

renderSidebar('feedback');
renderHeader('feedback');

// ── 场景名称输入框：动态显示/隐藏 ──
const scenarioWrapper = document.getElementById('scenario-name-wrapper');
document.querySelectorAll('input[name="scope"]').forEach(radio => {
  radio.addEventListener('change', () => {
    if (scenarioWrapper) {
      scenarioWrapper.classList.toggle('hidden', radio.value !== 'scenario' || !radio.checked);
    }
  });
});

// ── 提交反馈 ──
document.getElementById('btn-submit-feedback')?.addEventListener('click', () => {
  const scopeEl = document.querySelector('input[name="scope"]:checked');
  const scope = scopeEl ? scopeEl.value : '';
  const scenarioName = document.getElementById('scenario-name-input')?.value.trim() || '';
  const painPointFile = document.getElementById('pain-point-input')?.value.trim() || '';
  const painPointDetail = document.getElementById('pain-point-detail')?.value.trim() || '';
  const proposedFix = document.getElementById('proposed-fix-input')?.value.trim() || '';
  const submittedBy = document.getElementById('submitter-input')?.value.trim() || '匿名';

  if (!scope) {
    showToast('error', '请选择影响范围');
    return;
  }
  if (!painPointFile && !painPointDetail && !proposedFix) {
    showToast('error', '请至少填写痛点或期望更改');
    return;
  }

  const painPoint = painPointFile + (painPointDetail ? ' | ' + painPointDetail : '');

  FeedbackStore.add({
    scope,
    scenarioName,
    painPointFile,
    painPointDetail,
    painPoint,
    proposedFix,
    submittedBy,
  });

  // 清空表单
  document.querySelectorAll('input[name="scope"]').forEach(r => r.checked = false);
  if (scenarioWrapper) scenarioWrapper.classList.add('hidden');
  document.getElementById('scenario-name-input').value = '';
  document.getElementById('pain-point-input').value = '';
  document.getElementById('pain-point-detail').value = '';
  document.getElementById('proposed-fix-input').value = '';
  document.getElementById('submitter-input').value = '';

  const msg = document.getElementById('feedback-submit-msg');
  if (msg) { msg.classList.remove('hidden'); setTimeout(() => msg.classList.add('hidden'), 3000); }

  showToast('success', '反馈已提交！感谢你的贡献。');
  renderRecentFeedback();
});

// ── 近期反馈列表渲染 ──
const scopeLabels = {
  permanent: '底层架构',
  global: '全局通用',
  role: '权责调整',
  scenario: '特定场景',
};

function renderRecentFeedback() {
  const container = document.getElementById('recent-feedback-list');
  if (!container) return;

  const items = FeedbackStore.getAll().slice(-10).reverse();
  if (items.length === 0) {
    container.innerHTML = '<p class="text-sm text-gray-400 text-center py-8">暂无反馈记录。欢迎提交第一条意见！</p>';
    return;
  }

  container.innerHTML = items.map(f => {
    const commentsHtml = (f.comments && f.comments.length > 0)
      ? f.comments.map(c => `
          <div class="ml-3 pl-3 border-l-2 border-gray-200 py-1">
            <p class="text-sm text-gray-600">${c.text}</p>
            <span class="text-xs text-gray-400">${c.author} · ${c.date}</span>
          </div>
        `).join('')
      : '';

    return `
      <div class="p-4 rounded-xl border border-gray-100 bg-gray-50/50" data-fb-id="${f.id}">
        <div class="flex items-center justify-between mb-2">
          <span class="text-xs px-2 py-0.5 rounded-full font-medium ${f.status === 'pending' ? 'bg-amber-100 text-amber-700' : f.status === 'processing' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}">${f.status === 'pending' ? '待处理' : f.status === 'processing' ? '处理中' : '已处理'}</span>
          <span class="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-600">${scopeLabels[f.scope] || f.scope}${f.scenarioName ? ' · ' + f.scenarioName : ''}</span>
        </div>
        ${f.painPointFile ? `<p class="text-sm text-gray-700 mb-1"><span class="text-gray-400">卡壳文件：</span>${f.painPointFile}</p>` : ''}
        ${f.painPointDetail ? `<p class="text-sm text-gray-700 mb-1"><span class="text-gray-400">实际困难：</span>${f.painPointDetail}</p>` : ''}
        ${(!f.painPointFile && !f.painPointDetail && f.painPoint) ? `<p class="text-sm text-gray-700 mb-1"><span class="text-gray-400">痛点：</span>${f.painPoint}</p>` : ''}
        ${f.proposedFix ? `<p class="text-sm text-gray-700"><span class="text-gray-400">建议：</span>${f.proposedFix}</p>` : ''}
        ${commentsHtml ? `<div class="mt-2 space-y-1">${commentsHtml}</div>` : ''}
        <div class="flex items-center justify-between mt-2 text-xs text-gray-400">
          <span>${f.submittedBy}</span>
          <span>${f.submittedAt}</span>
        </div>
        <div class="mt-2">
          <button class="btn-add-comment text-xs text-blue-600 hover:text-blue-800" data-fb-id="${f.id}">追加评论</button>
          <div class="comment-form hidden mt-2" data-fb-id="${f.id}">
            <div class="flex gap-2">
              <input type="text" class="comment-text input-flat flex-1 text-sm" placeholder="评论内容">
              <input type="text" class="comment-author input-flat w-24 text-sm" placeholder="署名（选填）">
              <button class="btn-submit-comment px-3 py-1 text-sm rounded bg-blue-600 text-white hover:bg-blue-700">提交</button>
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');

  // 绑定追加评论按钮
  container.querySelectorAll('.btn-add-comment').forEach(btn => {
    btn.addEventListener('click', () => {
      const fbId = btn.dataset.fbId;
      const form = container.querySelector(`.comment-form[data-fb-id="${fbId}"]`);
      if (form) form.classList.toggle('hidden');
    });
  });

  // 绑定评论提交按钮
  container.querySelectorAll('.btn-submit-comment').forEach(btn => {
    btn.addEventListener('click', () => {
      const form = btn.closest('.comment-form');
      const fbId = form.dataset.fbId;
      const text = form.querySelector('.comment-text')?.value.trim() || '';
      const author = form.querySelector('.comment-author')?.value.trim() || '匿名';
      if (!text) {
        showToast('error', '请输入评论内容');
        return;
      }
      FeedbackStore.addComment(fbId, text, author);
      showToast('success', '评论已追加');
      renderRecentFeedback();
    });
  });
}

renderRecentFeedback();

// ── 导出为 Markdown ──
document.getElementById('btn-export-md')?.addEventListener('click', () => {
  const items = FeedbackStore.getAll();
  if (items.length === 0) {
    showToast('error', '暂无反馈可导出');
    return;
  }

  const today = new Date().toISOString().slice(0, 10);
  let md = `# SOP 优化提案反馈卡导出\n\n导出日期：${today}\n共 ${items.length} 条反馈\n\n---\n\n`;

  items.forEach((f, i) => {
    md += `## ${i + 1}. [${scopeLabels[f.scope] || f.scope}${f.scenarioName ? ' · ' + f.scenarioName : ''}] ${f.submittedBy} · ${f.submittedAt}\n\n`;
    md += `**状态**：${f.status === 'pending' ? '待处理' : f.status === 'processing' ? '处理中' : '已处理'}\n\n`;
    if (f.painPointFile) md += `**卡壳文件**：${f.painPointFile}\n\n`;
    if (f.painPointDetail) md += `**实际困难**：${f.painPointDetail}\n\n`;
    if (!f.painPointFile && !f.painPointDetail && f.painPoint) md += `**痛点**：${f.painPoint}\n\n`;
    if (f.proposedFix) md += `**建议**：${f.proposedFix}\n\n`;
    if (f.comments && f.comments.length > 0) {
      md += `**评论**：\n\n`;
      f.comments.forEach(c => {
        md += `- ${c.author}（${c.date}）：${c.text}\n`;
      });
      md += '\n';
    }
    md += '---\n\n';
  });

  downloadFile(`feedback-export-${today}.md`, md, 'text/markdown');
  showToast('success', 'Markdown 导出成功');
});

// ── 导出为 JSON ──
document.getElementById('btn-export-json')?.addEventListener('click', () => {
  const items = FeedbackStore.getAll();
  if (items.length === 0) {
    showToast('error', '暂无反馈可导出');
    return;
  }

  const today = new Date().toISOString().slice(0, 10);
  const json = JSON.stringify(items, null, 2);
  downloadFile(`feedback-export-${today}.json`, json, 'application/json');
  showToast('success', 'JSON 导出成功');
});

// ── 导入 JSON ──
document.getElementById('btn-import-json')?.addEventListener('change', (e) => {
  const file = e.target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (ev) => {
    try {
      const data = JSON.parse(ev.target.result);
      if (!Array.isArray(data)) {
        showToast('error', '无效的 JSON 格式：需要数组');
        return;
      }
      const added = FeedbackStore.importAll(data);
      showToast('success', `导入完成：新增 ${added} 条，跳过 ${data.length - added} 条重复`);
      renderRecentFeedback();
    } catch {
      showToast('error', 'JSON 解析失败，请检查文件格式');
    }
  };
  reader.readAsText(file);
  // 重置 input 以允许重复选择同一文件
  e.target.value = '';
});

// ── 工具函数：触发文件下载 ──
function downloadFile(filename, content, mimeType) {
  const blob = new Blob([content], { type: mimeType + ';charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
