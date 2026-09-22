// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  taskforce-entry.js — 专班详情独立入口
//  支书 2026-08-11 裁定：专班拥有自己的界面与数据集（便于长期共享）。
//  数据源 TaskForceRecordStore（独立持久化 workflowos_taskforces_v1），
//  报名面板复用 signup-panel.js 组件（与活动详情页共用，避免重复散落）。
// ════════════════════════════════════════════════════════════════
import { renderSidebar } from '../components/sidebar.js?v=20260922g';
import { renderHeader } from '../components/header.js?v=20260922g';
import { BranchService } from '../services/runtime.js?v=20260922g';
import { TaskForceRecordStore } from '../services/taskforce.js?v=20260922g';
import { NoticeStore } from '../services/notice.js?v=20260922g';
import { SignupStore } from '../services/signup.js?v=20260922g';
import { AuthStore } from '../services/auth.js?v=20260922g';
import { getPersonById } from '../services/person.js?v=20260922g';
import { getBasePath } from '../core/utils.js?v=20260922g';
import { badgeHtml } from '../components/badges.js?v=20260922g';
import { enhanceSelects } from '../components/custom-select.js?v=20260922g';
import { canSignup, renderSignupSection, renderSignupList, bindSignupEvents, roleLabel } from '../components/signup-panel.js?v=20260922g';
import { renderShareButtonHtml, bindShareButton } from '../components/share-button.js?v=20260922g';
// 批次 87：本页必须先 hydrate API 数据源再渲染/报名——与 activity.html（批次 83 修好后的标准形）同款。
// 此前本页只调 BranchService.loadDB()（API 模式直接 return）⇒ api 形态下专班与报名都退回本地 mock 读，
// 报名只写进本机备份、服务端 `/signups` 为空。
import { registerApiAdapter, init as dataInit, setDataSource, notifyDataLoaded } from '../core/data-adapter.js?v=20260922g';
import { ApiAdapter } from '../core/api-adapter.js?v=20260922g';

renderSidebar('dashboard');
renderHeader('dashboard');

/** 数据 hydrate（批次 87）：API 会话走 data-adapter init（服务端权威）；否则本地 loadDB。 */
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
        console.warn('[taskforce-entry] API 数据加载失败，回退本地 mock', e);
        setDataSource('mock');
        BranchService.loadDB();
      }
    } else {
      BranchService.loadDB();
    }
  } catch (e) {
    console.warn('[taskforce-entry] 数据加载异常（仍尝试内存兜底）', e);
  } finally {
    try { notifyDataLoaded(); } catch (_) { /* 静默 */ }
  }
}

const cardEl = document.getElementById('taskforce-detail-card');
const backBtn = document.getElementById('taskforce-back-btn');
backBtn?.addEventListener('click', () => {
  if (window.history.length > 1) window.history.back();
  else window.location.href = getBasePath() + 'index.html';
});

const currentUser = AuthStore.getCurrentUser();
const myId = currentUser?.personId || '';

/** 状态 → 徽章（专班专用） */
const STATUS_BADGE = {
  recruiting: ['招募中', 'success'],
  active: ['进行中', 'info'],
  archived: ['已归档', 'neutral'],
  dissolved: ['已解散', 'danger'],
};
/** 招募中但已过报名截止日（dogfood 党员#3：状态由截止日派生，与首页专班列表/成员端同口径） */
function recruitClosed(tf) {
  if (!tf || tf.status !== 'recruiting' || !tf.deadline) return false;
  return tf.deadline < new Date().toISOString().slice(0, 10);
}
function statusBadge(status, tf) {
  if (status === 'recruiting' && recruitClosed(tf)) return badgeHtml('报名已截止', 'neutral');
  const cfg = STATUS_BADGE[status];
  return cfg ? badgeHtml(cfg[0], cfg[1]) : badgeHtml(status || '—', 'neutral');
}

// ════════════════════════════════════════════════════════════════
//  入口：仅接受 tf-* 专班 id
// ════════════════════════════════════════════════════════════════

const params = new URLSearchParams(window.location.search);
const sourceId = params.get('id') || '';

// 渲染前必须先 hydrate（数据源初始化 + 各 Store init）：Store init 若跑在 API 数据到位之前，
// 会按「空集合」走种子兜底，把服务端数据挡在外面。
(async () => {
  await _hydrateData();
  TaskForceRecordStore.init();
  NoticeStore.init();
  SignupStore.init();

  if (!sourceId) {
    if (cardEl) cardEl.innerHTML = '<p class="text-sm text-gray-500 text-center py-12">未指定专班</p>';
  } else {
    const tf = TaskForceRecordStore.getAll().find(t => t.id === sourceId);
    if (!tf) {
      if (cardEl) cardEl.innerHTML = '<p class="text-sm text-gray-500 text-center py-12">专班不存在或已解散</p>';
    } else {
      renderTaskforce(tf);
    }
  }
})();

// ════════════════════════════════════════════════════════════════
//  专班详情
// ════════════════════════════════════════════════════════════════

function renderTaskforce(tf) {
  if (!cardEl) return;
  const signups = SignupStore.getAll().filter(s => s.sourceType === 'taskforce' && s.sourceId === tf.id);
  const members = Array.isArray(tf.members) ? tf.members : [];
  const openForSignup = canSignup('taskforce', tf);
  const initiatorName = tf.initiator ? (getPersonById(tf.initiator)?.name || tf.initiator) : '—';
  const fullLabel = tf.capacity ? `${members.length} / ${tf.capacity}` : `${members.length}`;

  cardEl.innerHTML = `
    <!-- 标题区 -->
    <div class="mb-5 pb-5 border-b border-gray-100">
      <div class="flex items-center gap-2.5 mb-2 flex-wrap">
        ${statusBadge(tf.status, tf)}
        <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-violet-50 text-violet-600">专班</span>
        <span class="text-xs text-gray-500">${tf.id}</span>
        <span class="ml-auto">${renderShareButtonHtml()}</span>
      </div>
      <h2 class="font-title-cn text-xl font-bold text-gray-800 leading-snug">${tf.name || '未命名专班'}</h2>
      <p class="text-sm text-gray-500 mt-1">${tf.task || ''}</p>
    </div>

    <!-- 基本信息 -->
    <div class="grid grid-cols-2 gap-3 mb-6">
      <div class="rounded-xl bg-gray-50 px-4 py-3">
        <p class="text-xs text-gray-500 mb-0.5">发起人</p>
        <p class="text-sm font-medium text-gray-800">${initiatorName}</p>
      </div>
      <div class="rounded-xl bg-gray-50 px-4 py-3">
        <p class="text-xs text-gray-500 mb-0.5">名额</p>
        <p class="text-sm font-medium text-gray-800">${fullLabel}</p>
      </div>
      <div class="rounded-xl bg-gray-50 px-4 py-3">
        <p class="text-xs text-gray-500 mb-0.5">报名截止</p>
        <p class="text-sm font-medium text-gray-800">${tf.deadline || '—'}</p>
      </div>
      <div class="rounded-xl bg-gray-50 px-4 py-3">
        <p class="text-xs text-gray-500 mb-0.5">创建时间</p>
        <p class="text-sm font-medium text-gray-800">${tf.createdAt || '—'}</p>
      </div>
    </div>

    ${openForSignup ? renderSignupSection({ sourceType: 'taskforce', sourceId: tf.id, title: tf.name, signups, myId })
      : (recruitClosed(tf) ? `<div class="rounded-xl bg-gray-50 px-4 py-3 text-xs text-gray-600">报名已于 ${tf.deadline} 截止，不再接受新报名${myId ? '' : '（登录后可查看自己是否已报名）'}。</div>` : '')}

    <!-- 报名名单 -->
    ${renderSignupList({ sourceType: 'taskforce', sourceId: tf.id, signups, myId })}

    <!-- 专班成员 -->
    <div class="mt-6">
      <h3 class="text-sm font-semibold text-gray-700 mb-3">专班成员（${members.length}）</h3>
      ${members.length === 0
        ? '<p class="text-sm text-gray-500">暂无成员</p>'
        : `<div class="flex flex-wrap gap-2.5">${members.map(x => `
            <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-50">
              <span class="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-semibold text-white flex-shrink-0" style="background:#8B5CF6;">${(getPersonById(x.personId)?.name || '?').slice(0, 1)}</span>
              <span class="text-xs font-medium text-gray-700">${getPersonById(x.personId)?.name || x.personId}</span>
              <span class="text-[11px] text-gray-500">${roleLabel(x.role)}</span>
            </span>`).join('')}</div>`}
    </div>
  `;

  // 报名区 select 增强为统一自定义下拉（本页无 bootstrap 全局 MutationObserver）
  enhanceSelects(cardEl);
  bindSignupEvents({ sourceType: 'taskforce', sourceId: tf.id, title: tf.name, myId, cardEl });
  bindShareButton(cardEl);
}
