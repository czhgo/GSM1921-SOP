// role: [工程师]+[AI]
// notice-entry.js — 通知详情独立入口
import { renderSidebar } from '../components/sidebar.js';
import { renderHeader } from '../components/header.js';
import { NoticeStore } from '../services/notice.js';
import { getBasePath } from '../core/utils.js';
import { showToast } from '../core/utils.js';
import { icon } from '../core/icons.js';

renderSidebar('dashboard');
renderHeader('dashboard');

// 从 URL 参数获取通知 id
const params = new URLSearchParams(window.location.search);
const noticeId = params.get('id');

const cardEl = document.getElementById('notice-detail-card');

// 返回按钮
const backBtn = document.getElementById('notice-back-btn');
backBtn?.addEventListener('click', () => {
  if (window.history.length > 1) {
    window.history.back();
  } else {
    window.location.href = getBasePath() + 'index.html';
  }
});

if (!noticeId) {
  if (cardEl) {
    cardEl.innerHTML = '<p class="text-sm text-gray-400 text-center py-12">未指定通知</p>';
  }
} else {
  const notice = NoticeStore.list({ activeOnly: false }).find(n => n.id === noticeId);

  if (!notice) {
    if (cardEl) {
      cardEl.innerHTML = '<p class="text-sm text-gray-400 text-center py-12">通知不存在或已过期</p>';
    }
  } else {
    renderNoticeDetail(notice);
  }
}

function renderNoticeDetail(n) {
  if (!cardEl) return;

  const priorityBadge = {
    urgent: '<span class="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full bg-red-100 text-red-700">紧急</span>',
    normal: '<span class="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-700">重要</span>',
  };

  const isUnread = !n.read;

  // 确认读取按钮
  const confirmReadBtn = isUnread
    ? `<button id="notice-confirm-read-btn" class="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100">
        确认读取
      </button>`
    : '<span class="inline-flex items-center gap-1 text-xs text-gray-400">已读</span>';

  // 目标模块跳转
  let targetLink = '';
  if (n.targetUrl) {
    const base = getBasePath();
    targetLink = `<a href="${base}${n.targetUrl}" class="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors bg-red-50 text-red-700 border border-red-200 hover:bg-red-100">
      前往查看 →
    </a>`;
  } else if (n.targetModule) {
    const moduleUrls = {
      activity: 'index.html',
      party: 'workspace/secretary.html',
      workspace: 'workspace/secretary.html',
      attendance: 'workspace/disc-commissioner.html',
    };
    const base = getBasePath();
    const url = moduleUrls[n.targetModule] || 'index.html';
    targetLink = `<a href="${base}${url}" class="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors bg-red-50 text-red-700 border border-red-200 hover:bg-red-100">
      前往相关页面 →
    </a>`;
  }

  cardEl.innerHTML = `
    <div class="mb-6">
      <div class="flex items-center gap-3 mb-4">
        ${priorityBadge[n.priority] || ''}
        <span class="text-xs text-gray-400">${n.publishDate || ''}</span>
        ${n.expireDate ? `<span class="text-xs text-gray-400">· 截止 ${n.expireDate}</span>` : ''}
      </div>
      <h2 class="font-title-cn text-xl font-bold text-gray-800 leading-snug mb-4">${n.title}</h2>
      <div class="text-base text-gray-700 leading-relaxed whitespace-pre-wrap">${n.content || ''}</div>
    </div>
    <div class="flex items-center gap-3 pt-4 border-t border-gray-100">
      ${confirmReadBtn}
      ${targetLink}
    </div>
  `;

  // 绑定确认读取
  const confirmBtn = document.getElementById('notice-confirm-read-btn');
  if (confirmBtn) {
    confirmBtn.addEventListener('click', () => {
      NoticeStore.markRead(n.id);
      // 视觉反馈：替换按钮为"已读"
      const wrapper = confirmBtn.parentElement;
      confirmBtn.replaceWith(
        Object.assign(document.createElement('span'), {
          className: 'inline-flex items-center gap-1 text-xs text-gray-400',
          textContent: '已读',
        })
      );
      showToast('success', '已确认读取');
    });
  }
}
