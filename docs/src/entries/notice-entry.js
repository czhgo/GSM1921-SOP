// role: [工程师]+[AI]
// notice-entry.js — 通知详情独立入口
// 2026-07-30: 增加邮件要素（通知者/被通知者/时间），但不采用邮箱 UI
import { renderSidebar } from '../components/sidebar.js?v=20260921p';
import { renderHeader } from '../components/header.js?v=20260921p';
import { NoticeStore, resolveNoticeUrl, canReadNotice } from '../services/notice.js?v=20260921p';
import { getBasePath, showToast } from '../core/utils.js?v=20260921p';
import { AuthStore } from '../services/auth.js?v=20260921p';
import { getPersonById } from '../services/person.js?v=20260921p';
import { badgeHtml } from '../components/badges.js?v=20260921p';
// S1（2026-09-12）：通知详情页必须先完成数据 hydrate（loadDB/API init）再按 id 取数，
// 否则 NoticeStore 只剩 MOCK_NOTICES 内存兜底 → 用户/服务端通知一律「不存在或已过期」。
import { registerApiAdapter, init as dataInit, setDataSource, notifyDataLoaded } from '../core/data-adapter.js?v=20260921p';
import { ApiAdapter } from '../core/api-adapter.js?v=20260921p';
import { BranchService } from '../services/runtime.js?v=20260921p';
// SOP-B-5（D-293）：通知确认时填「能否线上参会」——线上参会落该场考勤为「请假 + 线上」、只免补课
import { declareOnlineAttend } from '../services/attendance.js?v=20260921p';
import { loadActivities } from '../services/activity.js?v=20260921p';

renderSidebar('dashboard');
renderHeader('dashboard');

/** 通知详情页数据 hydrate：API 会话走 data-adapter init（服务端权威）；否则本地 loadDB。 */
async function _hydrateData() {
  try {
    registerApiAdapter(ApiAdapter);
    let token = null;
    try { token = sessionStorage.getItem('gsm1921-api-token'); } catch (_) { /* 隐私模式无 sessionStorage */ }
    if (token) {
      setDataSource('api', { apiBaseUrl: '', authToken: token });
      try {
        await dataInit();
      } catch (e) {
        console.warn('[notice-entry] API 数据加载失败，回退本地 mock', e);
        setDataSource('mock');
        BranchService.loadDB();
      }
    } else {
      BranchService.loadDB();
    }
  } catch (e) {
    console.warn('[notice-entry] 数据加载异常（仍尝试内存兜底）', e);
  } finally {
    // 通知角标等初始快照据实刷新
    try { notifyDataLoaded(); } catch (_) { /* 静默 */ }
  }
}

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

(async () => {
  await _hydrateData();

  if (!noticeId) {
    if (cardEl) {
      cardEl.innerHTML = '<p class="text-sm text-gray-500 text-center py-12">未指定通知</p>';
    }
    return;
  }

  // 单一取数口：已持久化通知直接命中；派生通知（仅在待办中）按 id 重建正文
  // （Q-22-1：取数已不带可见性门——可见性由 canReadNotice 单独判定）
  const notice = NoticeStore.getById(noticeId);

  if (!notice) {
    if (cardEl) {
      cardEl.innerHTML = '<p class="text-sm text-gray-500 text-center py-12">通知不存在或已过期</p>';
    }
  } else if (!canReadNotice(notice)) {
    // Q-22-1：不可读与「不存在」区分——不得把权限问题伪装成「不存在或已过期」
    const noSession = !AuthStore.getCurrentUser();
    if (cardEl) {
      cardEl.innerHTML = `
        <p class="text-sm text-gray-500 text-center py-12">无权查看该通知</p>
        ${noSession ? `<div class="text-center pb-12"><a href="${getBasePath()}login.html" class="text-sm text-blue-600 hover:text-blue-800">去登录</a></div>` : ''}
      `;
    }
  } else {
    renderNoticeDetail(notice);
  }
})();

// ── 通知者推断 ──
// 根据 targetModule 推断通知的发布角色
function inferPublisher(n) {
  const modulePublisherMap = {
    activity: '支书',
    party: '组织委员',
    workspace: '支书',
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
    ? `<button id="notice-confirm-read-btn" class="inline-flex items-center gap-1.5 text-sm px-4 py-1.5 rounded-lg font-medium transition-colors bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100">
        确认读取
      </button>`
    : '<span class="inline-flex items-center gap-1 text-xs text-gray-500 px-4 py-2">已读</span>';

  // SOP-B-5（D-293）：关联了三会一课活动的通知 → 确认收到时填「能否线上参会」
  // 「线上参会不计入出席（记请假）、只免补课」——故这里只申报「能不能线上参会」，
  // 实际出勤与否仍由该场考勤记录（纪检确认）说了算。
  const meetingActivity = n.meetingActivityId
    ? loadActivities().find(a => a.id === n.meetingActivityId && !a.archived)
    : null;
  const onlineAttendBlock = meetingActivity ? `
    <div class="mt-5 pt-4 border-t border-gray-100">
      <div class="text-xs text-gray-500 mb-2">关联会议：<b class="text-gray-700">${meetingActivity.title || '会议活动'}</b>${meetingActivity.date ? `（${meetingActivity.date}）` : ''}</div>
      <label class="text-xs text-gray-500 mb-1.5 block font-medium" for="notice-online-attend">本次会议您能否线上参会？<span class="text-gray-500">（选填；确认收到时填写）</span></label>
      <select id="notice-online-attend" class="input-flat w-full">
        <option value="">暂不申报</option>
        <option value="yes">能，线上参加</option>
      </select>
      <p class="text-[11px] text-gray-500 mt-1 leading-5">申诉「能，线上参加」后：本场考勤记<b>请假</b>、<b>不计入出席、不补课</b>（纪检委员确认时以实际记录为准）。不申报或不能线上参会的，按实际考勤记录判：请假未参会、未请假缺席均须补课。</p>
    </div>` : '';

  // 目标模块跳转（业务页直达优先，与全站统一 resolveNoticeUrl）
  let targetLink = '';
  const dest = resolveNoticeUrl(n, currentUser?.role || null);
  if (dest.direct) {
    targetLink = `<a href="${dest.url}" class="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors bg-red-50 text-red-700 border border-red-200 hover:bg-red-100">
      前往相关页面 →
    </a>`;
  }

  cardEl.innerHTML = `
    <!-- 元信息区：优先级 + 时间 + 通知者/被通知者 -->
    <div class="mb-5 pb-4 border-b border-gray-100">
      <div class="flex items-center gap-2.5 mb-3">
        <span class="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full ${pri.bg} ${pri.text}">${pri.label}</span>
        ${isUnread ? badgeHtml('未读', 'warning') : ''}
        ${n.source === 'committee' ? '<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium text-white" style="background:#C8102E;">党委下发</span>' : ''}
      </div>

      <!-- 通知者 / 被通知者 / 时间 —— 信息条，非邮箱 UI -->
      <div class="space-y-2 text-sm">
        <div class="flex items-start gap-3">
          <span class="text-gray-500 flex-shrink-0 w-16 text-right text-xs leading-6">通知者</span>
          <span class="text-gray-800 font-medium">${publisher}</span>
        </div>
        <div class="flex items-start gap-3">
          <span class="text-gray-500 flex-shrink-0 w-16 text-right text-xs leading-6">被通知者</span>
          <span class="text-gray-700">${recipients}</span>
        </div>
        <div class="flex items-start gap-3">
          <span class="text-gray-500 flex-shrink-0 w-16 text-right text-xs leading-6">时间</span>
          <span class="text-gray-600">${n.publishDate || '—'}${n.expireDate ? ' <span class="text-gray-500">· 截止 ' + n.expireDate + '</span>' : ''}</span>
        </div>
      </div>
    </div>

    <!-- 标题 -->
    <h2 class="font-title-cn text-xl font-bold text-gray-800 leading-snug mb-4">${n.title}</h2>

    <!-- 正文 -->
    <div class="text-base text-gray-700 leading-relaxed whitespace-pre-wrap mb-6">${n.content || ''}</div>

    ${onlineAttendBlock}

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
      // SOP-B-5：先落「能否线上参会」申报（选了「能，线上参加」才写考勤），再确认已读
      let declared = false;
      const onlineSel = document.getElementById('notice-online-attend');
      if (meetingActivity && onlineSel && onlineSel.value === 'yes') {
        const me = AuthStore.getCurrentUser();
        if (!me || !me.personId) {
          showToast('error', '请先登录后再申报线上参会');
          return;
        }
        const res = declareOnlineAttend({ activityId: meetingActivity.id, personId: me.personId });
        if (!res.ok) {
          // 已有考勤记录时不覆盖：如实说明，改状态走纪检更正（不静默吞掉申报）
          showToast('error', res.reason || '线上参会申报失败');
          return;
        }
        declared = true;
      }
      NoticeStore.markRead(n.id);
      confirmBtn.replaceWith(
        Object.assign(document.createElement('span'), {
          className: 'inline-flex items-center gap-1 text-xs text-gray-500 px-4 py-2',
          textContent: '已读',
        })
      );
      showToast('success', declared
        ? '已申报线上参会：本场考勤记「请假」、不计出席、不补课'
        : '已确认读取');
    });
  }
}
