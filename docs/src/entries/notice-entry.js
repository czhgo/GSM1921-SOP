// role: [工程师]+[AI]
// notice-entry.js — 通知详情独立入口
// 2026-07-30: 增加邮件要素（通知者/被通知者/时间），但不采用邮箱 UI
import { renderSidebar } from '../components/sidebar.js';
import { renderHeader } from '../components/header.js';
import { NoticeStore } from '../services/notice.js';
import { getBasePath, showToast } from '../core/utils.js';
import { icon } from '../core/icons.js';
import { AuthStore } from '../services/auth.js';
import { PEOPLE, getPersonById } from '../mock/index.js';

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

// ── 通知者推断 ──
// 根据 targetModule 推断通知的发布角色
function inferPublisher(n) {
  const modulePublisherMap = {
    activity: '书记',
    party: '组织委员',
    workspace: '书记',
    attendance: '纪检委员',
  };
  return n.publisher || modulePublisherMap[n.targetModule] || '系统';
}

// ── 被通知者推断 ──
// 根据优先级和模块推断通知对象
function inferRecipients(n) {
  if (n.recipients) return n.recipients;
  if (n.priority === 'urgent') return '全体党员、预备党员、积极分子';
  const moduleRecipientMap = {
    activity: '全体党员',
    party: '组织委员、相关发展对象',
    workspace: '全体支委',
    attendance: '纪检委员',
  };
  return moduleRecipientMap[n.targetModule] || '全体成员';
}

function renderNoticeDetail(n) {
  if (!cardEl) return;

  const priorityConfig = {
    urgent: { label: '紧急', bg: 'bg-red-100', text: 'text-red-700', icon: 'alert-circle' },
    normal: { label: '重要', bg: 'bg-blue-100', text: 'text-blue-700', icon: 'info' },
  };
  const pri = priorityConfig[n.priority] || priorityConfig.normal;

  const isUnread = !n.read;
  const publisher = inferPublisher(n);
  const recipients = inferRecipients(n);

  // 当前登录用户
  const currentUser = AuthStore.getCurrentUser();
  const currentUserName = currentUser ? (getPersonById(currentUser.personId)?.name || currentUser.role) : '';

  // 确认读取按钮
  const confirmReadBtn = isUnread
    ? `<button id="notice-confirm-read-btn" class="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100">
        确认读取
      </button>`
    : '<span class="inline-flex items-center gap-1 text-xs text-gray-400 px-4 py-2">已读</span>';

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
      attendance: 'workspace/disc.html',
    };
    const base = getBasePath();
    const url = moduleUrls[n.targetModule] || 'index.html';
    targetLink = `<a href="${base}${url}" class="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors bg-red-50 text-red-700 border border-red-200 hover:bg-red-100">
      前往相关页面 →
    </a>`;
  }

  cardEl.innerHTML = `
    <!-- 元信息区：优先级 + 时间 + 通知者/被通知者 -->
    <div class="mb-5 pb-4 border-b border-gray-100">
      <div class="flex items-center gap-2.5 mb-3">
        <span class="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full ${pri.bg} ${pri.text}">${pri.label}</span>
        ${isUnread ? '<span class="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-amber-100 text-amber-700">未读</span>' : ''}
      </div>

      <!-- 通知者 / 被通知者 / 时间 —— 信息条，非邮箱 UI -->
      <div class="space-y-2 text-sm">
        <div class="flex items-start gap-3">
          <span class="text-gray-400 flex-shrink-0 w-16 text-right text-xs leading-6">通知者</span>
          <span class="text-gray-800 font-medium">${publisher}</span>
        </div>
        <div class="flex items-start gap-3">
          <span class="text-gray-400 flex-shrink-0 w-16 text-right text-xs leading-6">被通知者</span>
          <span class="text-gray-700">${recipients}</span>
        </div>
        <div class="flex items-start gap-3">
          <span class="text-gray-400 flex-shrink-0 w-16 text-right text-xs leading-6">时间</span>
          <span class="text-gray-600">${n.publishDate || '—'}${n.expireDate ? ' <span class="text-gray-400">· 截止 ' + n.expireDate + '</span>' : ''}</span>
        </div>
      </div>
    </div>

    <!-- 标题 -->
    <h2 class="font-title-cn text-xl font-bold text-gray-800 leading-snug mb-4">${n.title}</h2>

    <!-- 正文 -->
    <div class="text-base text-gray-700 leading-relaxed whitespace-pre-wrap mb-6">${n.content || ''}</div>

    <!-- 操作区 -->
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
      confirmBtn.replaceWith(
        Object.assign(document.createElement('span'), {
          className: 'inline-flex items-center gap-1 text-xs text-gray-400 px-4 py-2',
          textContent: '已读',
        })
      );
      showToast('success', '已确认读取');
    });
  }
}
