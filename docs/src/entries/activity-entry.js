// role: [工程师]+[AI]
// activity-entry.js — 活动/专班统一详情页入口（T233 报名渠道）
//  URL 前缀分流：act-* 渲染活动详情，tf-* 渲染专班详情。
//  报名区仅在「可报名」时展示（活动 published/ongoing 且日期未过、专班 recruiting 且未截止）。
import { renderSidebar } from '../components/sidebar.js?v=20260922h';
import { renderHeader } from '../components/header.js?v=20260922h';
import { BranchService } from '../services/runtime.js?v=20260922h';
import { mockDB } from '../core/domain.js?v=20260922h';
import { TaskForceRecordStore } from '../services/taskforce.js?v=20260922h';
import { NoticeStore } from '../services/notice.js?v=20260922h';
import { SignupStore, canCloseActivitySignup, closeActivitySignup, SignupStatus } from '../services/signup.js?v=20260922h';
import { AuthStore } from '../services/auth.js?v=20260922h';
import { getPersonById } from '../services/person.js?v=20260922h';
// 品牌认定（2026-09-21 批次 132 · 支书口径二「支委/党小组组长均可以提案，支委会通过后确定」）：
// 判据与写口单一源 = services/activity.js；本页**不再有「点一下即认定」**（提案 / 撤回 / 取消认定三种动作）。
import { canProposeBrand, brandProposalOf, proposeBrandDesignation, withdrawBrandProposal, revokeBrandDesignation } from '../services/activity.js?v=20260922h';
// 追加复盘要求（2026-09-21 批次 135 · 裁定二「按推荐档落」）：支委会可额外要求本场组织者完成复盘；
// 判据与写口单一源 = services/activity.js；另有「交回状态」须读该场复盘记录（services/review.js）。
import { reviewRequestOf, isReviewReturned, isReviewRequestEligibleActivity, requestOrganizerReview, withdrawReviewRequest } from '../services/activity.js?v=20260922h';
import { loadActivityReviews } from '../services/review.js?v=20260922h';
import { getBasePath, escHtml as esc, showToast } from '../core/utils.js?v=20260922h';
import { getActivityTypeColors } from '../core/constants.js?v=20260922h';
import { getAppState } from '../core/state.js?v=20260922h';
import { badgeHtml } from '../components/badges.js?v=20260922h';
// 活动生命周期展示态单一源（2026-09-13 收敛）：徽章/文案不得本地另写一套中文状态映射
import { activityLifecycleBadgeHtml } from '../components/inspector.js?v=20260922h';
import { enhanceSelects } from '../components/custom-select.js?v=20260922h';
import { canSignup as _canSignup, renderSignupSection, renderSignupList, bindSignupEvents, roleLabel } from '../components/signup-panel.js?v=20260922h';
import { renderShareButtonHtml, bindShareButton } from '../components/share-button.js?v=20260922h';
import { renderVoteWidget } from '../components/vote-widget.js?v=20260922h';
import { fetchVotes } from '../services/committee-vote.js?v=20260922h';
// SOP-B-2（批次 83）：本页必须先 hydrate API 数据源再渲染——见 _hydrateData 注释
import { registerApiAdapter, init as dataInit, setDataSource, notifyDataLoaded } from '../core/data-adapter.js?v=20260922h';
import { ApiAdapter } from '../core/api-adapter.js?v=20260922h';
// 批次 123：「关闭报名」后按批次 49「存好了才报成功」同一口径——先结算在途落库再刷新
import { settleWrites } from '../core/pending-writes.js?v=20260922h';

renderSidebar('dashboard');
renderHeader('dashboard');

/**
 * 数据 hydrate（2026-09-18 批次 83 · SOP-B-2 报名链的前提修复）
 *
 * 病灶（真机实测）：本页原只调 `BranchService.loadDB()`。该函数在 API 模式下**直接 return**
 * （数据由 `data-adapter.init()` 从服务器填充），而本页从未 `registerApiAdapter` / `init`
 * ⇒ 实际退回 mock 读：活动是**从本机 localStorage 备份**里读的，报名也只写进那份本地备份
 * ——**服务端一条都没有**。后果：组长台 / 纪检台（API 态，读服务端）永远看不到这份报名，
 * 「考勤候选默认选中报名者」（`D-288`）随之落空（真机实测：服务端 `/signups` 该活动为空，
 * 本地备份里有 `p13:approved`）。
 *
 * 处置：与 notice-entry.js 的既有做法同款——有 API 会话时先切数据源并 `init()` 拉全量，再渲染。
 */
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
        console.warn('[activity-entry] API 数据加载失败，回退本地 mock', e);
        setDataSource('mock');
        BranchService.loadDB();
      }
    } else {
      BranchService.loadDB();
    }
  } catch (e) {
    console.warn('[activity-entry] 数据加载异常（仍尝试内存兜底）', e);
  } finally {
    try { notifyDataLoaded(); } catch (_) { /* 静默 */ }
  }
}

// HTML 转义统一走 core/utils.js escHtml（2026-09-03 去重收口）
const cardEl = document.getElementById('activity-detail-card');
const backBtn = document.getElementById('activity-back-btn');
backBtn?.addEventListener('click', () => {
  if (window.history.length > 1) window.history.back();
  else window.location.href = getBasePath() + 'index.html';
});

const ACTIVITY_TYPE_COLORS = getActivityTypeColors();
const currentUser = AuthStore.getCurrentUser();
const myId = currentUser?.personId || '';

// HTML 转义统一走 core/utils.js escHtml（2026-09-03 去重收口）

/** 活动状态 → 徽章（2026-09-13 收敛：活动一律走生命周期展示态单一源 components/inspector.js，
 *  不再本地另写中文状态映射；专班保留本页映射 —— 词表 = 运行中/已完结） */
const TF_STATUS_BADGE = {
  recruiting: ['招募中', 'success'],
  active: ['运行中', 'info'],
  completed: ['已完结', 'neutral'],
  dissolved: ['已解散', 'danger'],
  archived: ['已归档', 'neutral'],
};
function statusBadge(act, kind) {
  if (kind === 'tf') {
    const cfg = TF_STATUS_BADGE[act.status];
    return cfg ? badgeHtml(cfg[0], cfg[1]) : badgeHtml(act.status || '—', 'neutral');
  }
  return activityLifecycleBadgeHtml(act, getAppState()?.tasks || []);
}

// ════════════════════════════════════════════════════════════════
//  入口分流
// ════════════════════════════════════════════════════════════════

const params = new URLSearchParams(window.location.search);
const sourceId = params.get('id') || '';

// 渲染前必须先 hydrate（数据源初始化 + 各 Store init）：Store init 若跑在 API 数据到位之前，
// 会按「空集合」走种子兜底（如 SignupStore 回填 SEED_SIGNUPS），把服务端数据挡在外面。
(async () => {
  await _hydrateData();
  TaskForceRecordStore.init();
  NoticeStore.init();
  SignupStore.init();

  if (!sourceId) {
    if (cardEl) cardEl.innerHTML = '<p class="text-sm text-gray-500 text-center py-12">未指定对象</p>';
  } else if (sourceId.startsWith('tf-')) {
    const tf = TaskForceRecordStore.getAll().find(t => t.id === sourceId);
    if (!tf) {
      if (cardEl) cardEl.innerHTML = '<p class="text-sm text-gray-500 text-center py-12">专班不存在或已解散</p>';
    } else {
      renderTaskforce(tf);
    }
  } else {
    renderActivity(sourceId);
  }
})();

// ════════════════════════════════════════════════════════════════
//  活动详情
// ════════════════════════════════════════════════════════════════

function renderActivity(id) {
  if (!cardEl) return;
  const act = mockDB.activities.find(a => a.id === id);
  if (!act) {
    cardEl.innerHTML = '<p class="text-sm text-gray-500 text-center py-12">活动不存在</p>';
    return;
  }

  const typeColor = ACTIVITY_TYPE_COLORS[act.type] || { color: '#6B7280' };
  // 活动类型标签色：金系用深金 text（浅底可读），红系回退 dot（_ACTIVITY_TYPE_BASE 无 color 字段）
  const tagColor = typeColor.text || typeColor.dot || '#6B7280';
  const tagColorDark = { '#CE1126': '#F87171', '#A16207': '#FBBF24', '#FFD700': '#FDE68A' }[tagColor] || '#94A3B8';
  const organizerName = act.organizer ? (getPersonById(act.organizer)?.name || act.organizer) : '—';
  const signups = SignupStore.getAll().filter(s => s.sourceType === 'activity' && s.sourceId === act.id);
  const assignments = Array.isArray(act.assignments) ? act.assignments : [];
  const canSignup = _canSignup('activity', act);
  // 批次 123（支书 2026-09-20 定案）：「不设截止，但组织者可手动关」——**不新增「截止时点」字段**，
  // 只在活动上落布尔 `signupClosed`。关闭入口就在本页既有报名区块旁（不新开页面）；
  // 呈现与放行**共用** services/signup.js::canCloseActivitySignup（组织者本场 ＋ 支书/副支书）。
  const signupClosed = act.signupClosed === true;
  const canCloseSignup = canSignup && canCloseActivitySignup(myId, act);
  // 品牌认定（2026-09-21 批次 132 · 支书口径二「支委/党小组组长均可以提案，支委会……通过后确定」）：
  //   判据单一源＝AuthStore.isCommissioner（支委层）＋ `services/activity.js::canProposeBrand`（含党小组组长）；
  //   **本页不再有「点一下即认定」**——只渲染 提案 / 撤回提案 / 取消已有认定（支委层，留痕）三种动作。
  const isCommittee = !!currentUser && AuthStore.isCommissioner(currentUser.role);
  const isBrandActive = act.isBrand === true;
  const brandProposal = brandProposalOf(act);
  const myRole = currentUser?.role || '';
  let brandCardHtml = '';
  if (isCommittee || canProposeBrand(myRole)) {
    const proposerName = brandProposal && brandProposal.by ? (getPersonById(brandProposal.by)?.name || brandProposal.by) : '';
    const stateText = isBrandActive
      ? `品牌认定（支委会）：本场已认定为品牌活动${act.brandDesignatedAt ? `（${String(act.brandDesignatedAt).slice(0, 10)}）` : ''}`
      : (brandProposal
        ? `品牌认定（支委会）：提案待审议（提案人 ${esc(proposerName || '—')}）`
        : '品牌认定（支委会）：本场尚未认定为品牌活动——须由支委 / 党小组组长提案，经支委会审议通过后认定');
    const action = isBrandActive
      ? (isCommittee ? '<button id="brand-revoke-btn" class="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:text-amber-700 hover:border-amber-200 transition-colors" style="cursor:pointer;">取消品牌认定</button>' : '')
      : (brandProposal
        ? ((isCommittee || brandProposal.by === myId) ? '<button id="brand-withdraw-btn" class="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:text-amber-700 hover:border-amber-200 transition-colors" style="cursor:pointer;">撤回提案</button>' : '')
        : (canProposeBrand(myRole) ? '<button id="brand-propose-btn" class="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:text-amber-700 hover:border-amber-200 transition-colors" style="cursor:pointer;">提议认定为品牌活动</button>' : ''));
    brandCardHtml = `
    <!-- 品牌认定（支委会事项；2026-09-21 批次 132）：提案 → 支委会审议通过后确定。
         本块是给**不在支书台**的支委（组织/宣传/纪检委员）与党小组组长的落点；普通成员与访客看不到该动作。 -->
    <div class="flex items-center justify-between gap-3 rounded-xl border border-gray-100 bg-gray-50/60 px-5 py-3 mb-6">
      <span class="text-xs text-gray-500">${stateText}</span>
      ${action}
    </div>`;
  }
  // 追加复盘要求（2026-09-21 批次 135 · 裁定二「按推荐档落」）：支委会（支委层）可额外要求本场组织者
  //   完成复盘 ⇒ 进本场活动的关闭判据（**只判到「交回」、不判到「确认」**）；**三会一课不适用**；
  //   **不给组织者自行更新入口**（本块只渲染支委侧的「要求 / 撤回」与交回状态）。
  //   本块的落点＝活动详情页——批次 132 给品牌认定做过同样的「不在支书台的支委也有落点」处理，同款。
  const reviewRequest = reviewRequestOf(act);
  const reviewRequestEligible = isReviewRequestEligibleActivity(act);
  const actReview = loadActivityReviews().find(r => r.activityId === act.id) || null;
  let reviewRequestCardHtml = '';
  if (reviewRequestEligible && (isCommittee || reviewRequest)) {
    const reqByName = reviewRequest && reviewRequest.by ? (getPersonById(reviewRequest.by)?.name || reviewRequest.by) : '';
    const reqAt = reviewRequest && reviewRequest.at ? String(reviewRequest.at).slice(0, 10) : '';
    const returned = isReviewReturned(actReview);
    const stateText = reviewRequest
      ? `追加复盘（支委会要求）：已要求组织者完成复盘（${reqAt || '—'} · 发起人 ${esc(reqByName || '—')}）· 交回状态：${returned ? '已交回' : '尚未交回'}`
      : '追加复盘（支委会要求）：本场未追加要求——支委会可额外要求组织者完成复盘（进关闭判据，只判到「交回」）';
    const action = !reviewRequest
      ? (isCommittee ? '<button id="review-request-btn" class="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:text-amber-700 hover:border-amber-200 transition-colors" style="cursor:pointer;">要求组织者复盘</button>' : '')
      : ((isCommittee || reviewRequest.by === myId) ? '<button id="review-request-withdraw-btn" class="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:text-amber-700 hover:border-amber-200 transition-colors" style="cursor:pointer;">撤回要求</button>' : '');
    reviewRequestCardHtml = `
    <!-- 追加复盘要求（2026-09-21 批次 135 · 裁定二）：支委会额外要求组织者复盘 ⇒ 进活动关闭判据，
         只判到「交回」不到「确认」；三会一课不适用；组织者仍走成员端「我的复盘」那张既有表单。 -->
    <div class="flex items-center justify-between gap-3 rounded-xl border border-gray-100 bg-gray-50/60 px-5 py-3 mb-6">
      <span class="text-xs text-gray-500">${stateText}</span>
      ${action}
    </div>`;
  }

  // 关闭后仍要给「已报名者」留出口：**已报者仍可取消**（本批择定）⇒ 报名区不能整块消失。
  // 只对「本人在册（已通过 / 待审核）」渲染报名区（不显示重填入口——重填必被关闭判据挡回，属假入口）。
  const myActiveSignup = myId ? signups.find(s => s.personId === myId
    && (s.status === SignupStatus.APPROVED || s.status === SignupStatus.PENDING)) : null;
  const showSignupCard = canSignup || (signupClosed && !!myActiveSignup);

  // 会议议程区（2026-09-06 点验修复①）：渲染条件放宽为「activity.agenda 存在且 length>0」——
  // 此前议程只随线上异步表决区（voteConfig.mode==='async'）渲染，导致「支部党员大会」等
  // 线下活动的议程在 activity.html 完全不显示。现两种形态：
  //  ① 表决形态（async + 已登录 + 议程含 id 项）→ 保留现有逐条表决挂载（canVote 由固化
  //     应到名单 voteConfig.voterIds 判定，名单外登录人由表决组件提示「仅应到表决人可表态」）；
  //  ② 只读形态（线下活动 / async 但未登录或议程无 id 项）→ 只读议程列表，不渲染投票。
  // 空议程不显示。
  const voterIds = (act.voteConfig && Array.isArray(act.voteConfig.voterIds)) ? act.voteConfig.voterIds : [];
  const canVote = !!currentUser && voterIds.includes(currentUser.personId);
  const agendaList = Array.isArray(act.agenda) ? act.agenda.filter(a => a && a.item) : [];
  const voteAgenda = agendaList.filter(a => a && a.id);
  const isAsyncVote = !!currentUser && act.voteConfig?.mode === 'async' && voteAgenda.length > 0;
  const agendaResultBadge = (r) => (r
    ? `<span class="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium ${r === 'passed' ? 'text-green-700 bg-green-50' : 'text-red-700 bg-red-50'}">${r === 'passed' ? '已通过' : '未通过'}</span>`
    : '');
  let agendaAreaHtml = '';
  if (isAsyncVote) {
    agendaAreaHtml = `
    <!-- 议程与表决（AV4.5：线上异步表决） -->
    <div id="async-vote-section" class="mt-6">
      <h3 class="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2 flex-wrap">
        议程与表决
        <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium text-amber-700 bg-amber-50">线上异步表决</span>
      </h3>
      <div class="space-y-3">
        ${voteAgenda.map((a, i) => `
          <div class="card rounded-xl p-4">
            <div class="flex items-start gap-2 text-sm">
              <span class="text-xs text-gray-500 flex-shrink-0 w-5 pt-0.5">${i + 1}.</span>
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 flex-wrap">
                  <span class="text-sm font-medium text-gray-700">${esc(a.item)}</span>
                  ${a.result ? `<span class="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium ${a.result === 'passed' ? 'text-green-700 bg-green-50' : 'text-red-700 bg-red-50'}">${a.result === 'passed' ? '已通过' : '未通过'}</span>` : ''}
                </div>
                ${a.host ? `<div class="text-xs text-gray-500 mt-0.5">（主持人：${esc(a.host)}）</div>` : ''}
              </div>
            </div>
            <div class="vote-widget-slot" data-vote-item-id="${esc(a.id)}"></div>
          </div>`).join('')}
      </div>
    </div>`;
  } else if (agendaList.length > 0) {
    // 只读议程列表（线下活动等非表决场景）：item + host + result 徽标；kinds 从略，不渲染投票
    agendaAreaHtml = `
    <!-- 会议议程（只读列表：线下活动 / async 未达表决挂载条件） -->
    <div id="agenda-readonly-section" class="mt-6">
      <h3 class="text-sm font-semibold text-gray-700 mb-3">会议议程</h3>
      <div class="space-y-3">
        ${agendaList.map((a, i) => `
          <div class="card rounded-xl p-4">
            <div class="flex items-start gap-2 text-sm">
              <span class="text-xs text-gray-500 flex-shrink-0 w-5 pt-0.5">${i + 1}.</span>
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 flex-wrap">
                  <span class="text-sm font-medium text-gray-700">${esc(a.item)}</span>
                  ${agendaResultBadge(a.result)}
                </div>
                ${a.host ? `<div class="text-xs text-gray-500 mt-0.5">（主持人：${esc(a.host)}）</div>` : ''}
              </div>
            </div>
          </div>`).join('')}
      </div>
    </div>`;
  }

  cardEl.innerHTML = `
    <!-- 标题区 -->
    <div class="mb-5 pb-5 border-b border-gray-100">
      <div class="flex items-center gap-2.5 mb-2 flex-wrap">
        ${statusBadge(act, 'act')}
        <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium" style="background:${tagColor}14;color:color-mix(in srgb, ${tagColor} 60%, #000);--acc-bg-dark:${tagColorDark}24;--acc-text-dark:${tagColorDark};">${act.type || '活动'}</span>
        <span class="text-xs text-gray-500">${act.id}</span>
        <span class="ml-auto">${renderShareButtonHtml()}</span>
      </div>
      <h2 class="font-title-cn text-xl font-bold text-gray-800 leading-snug">${act.title || '未命名活动'}</h2>
      <p class="text-sm text-gray-500 mt-1">${act.date || '—'}${act.location ? ' · ' + act.location : ''}</p>
    </div>

    <!-- 基本信息 -->
    <div class="grid grid-cols-2 gap-3 mb-6">
      <div class="rounded-xl bg-gray-50 px-4 py-3">
        <p class="text-xs text-gray-500 mb-0.5">组织者</p>
        <p class="text-sm font-medium text-gray-800">${organizerName}</p>
      </div>
      <div class="rounded-xl bg-gray-50 px-4 py-3">
        <p class="text-xs text-gray-500 mb-0.5">活动方向</p>
        <p class="text-sm font-medium text-gray-800">${act.direction === 'bottom-up' ? '自下而上（党小组发起）' : '自上而下（支部部署）'}</p>
      </div>
    </div>

    ${showSignupCard ? renderSignupSection({ sourceType: 'activity', sourceId: act.id, title: act.title, signups, myId }) : ''}

    ${signupClosed ? `
    <!-- 报名已关闭（批次 123）：成员侧就地说清为什么报不了名，不静默消失 -->
    <div class="rounded-xl border border-gray-200 bg-gray-50/60 px-5 py-3 mb-6 text-xs text-gray-500">
      报名已关闭（本场组织者手动关闭）——不再接受新的报名；已报名者可自行取消。
    </div>` : ''}
    ${canCloseSignup ? `
    <!-- 报名管理（批次 123）：只对本场组织者 / 支书呈现，非组织者看不到该动作 -->
    <div class="flex items-center justify-between gap-3 rounded-xl border border-gray-100 bg-gray-50/60 px-5 py-3 mb-6">
      <span class="text-xs text-gray-500">报名管理：关闭后成员不能再新报（已报名者仍可自行取消）</span>
      <button id="signup-close-btn" class="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:text-red-600 hover:border-red-200 transition-colors" style="cursor:pointer;">关闭报名</button>
    </div>` : ''}

    ${brandCardHtml}
    ${reviewRequestCardHtml}

    <!-- 报名名单 -->
    ${renderSignupList({ sourceType: 'activity', sourceId: act.id, signups, myId })}

    ${agendaAreaHtml}

    <!-- 参与人员（assignments） -->
    <div class="mt-6">
      <h3 class="text-sm font-semibold text-gray-700 mb-3">参与人员（${assignments.length}）</h3>
      ${assignments.length === 0
        ? '<p class="text-sm text-gray-500">暂无参与人员</p>'
        : `<div class="flex flex-wrap gap-2.5">${assignments.map(x => `
            <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-50">
              <span class="w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-semibold text-white flex-shrink-0" style="background:${typeColor.color};">${(getPersonById(x.personId)?.name || '?').slice(0, 1)}</span>
              <span class="text-xs font-medium text-gray-700">${getPersonById(x.personId)?.name || x.personId}</span>
              <span class="text-[11px] text-gray-500">${roleLabel(x.role)}</span>
            </span>`).join('')}</div>`}
    </div>
  `;

  // 报名区 select 增强为统一自定义下拉（本页无 bootstrap 全局 MutationObserver）
  enhanceSelects(cardEl);
  bindSignupEvents({ sourceType: 'activity', sourceId: act.id, title: act.title, myId, cardEl });
  bindShareButton(cardEl);

  // 「关闭报名」（批次 123）：二次确认（关闭后无「重新开放」入口，属不可逆动作）→ 落库 → 结算 → 刷新。
  // 放行判据在 closeActivitySignup 内复算一次（呈现/动作同源 canCloseActivitySignup），点了没反应＝放行被挡。
  cardEl.querySelector('#signup-close-btn')?.addEventListener('click', async () => {
    if (!window.confirm('确认关闭本场报名？关闭后成员不能再新报（已报名者仍可自行取消）。')) return;
    const res = await closeActivitySignup(act.id, myId);
    if (!res.ok) { showToast('error', res.reason || '关闭报名失败'); return; }
    showToast('success', '本场报名已关闭');
    try { await settleWrites(); } catch (e) { console.warn('[activity-entry] 落库未结算，仍刷新以读取最新状态：', e); }
    window.location.reload();
  });

  // 品牌认定三动作（2026-09-21 批次 132 · 支书口径二「提案 → 支委会通过后确定」）：**认定只能由支委会审议通过产生**。
  //   ① 提案（支委 / 党小组组长）② 撤回提案（提案人或支委层）③ 取消已有认定（支委层，留痕）。
  //   写链单一源 = services/activity.js（落活动主源 → persist/snapshot 写穿服务端）；放行判据在服务函数内复算。
  const afterBrandWrite = async () => {
    try { await settleWrites(); } catch (e) { console.warn('[activity-entry] 落库未结算，仍刷新以读取最新状态：', e); }
    window.location.reload();
  };
  cardEl.querySelector('#brand-propose-btn')?.addEventListener('click', async () => {
    if (!window.confirm('提交「品牌认定」提案？提案只登记待议，须经支委会审议通过后才认定为品牌活动。')) return;
    const res = proposeBrandDesignation({ activityId: act.id, by: myId, role: myRole });
    if (!res.ok) { showToast('error', res.reason || '提案失败'); return; }
    showToast('success', '已提交品牌认定提案（进支委会「拟上会」清单）');
    await afterBrandWrite();
  });
  cardEl.querySelector('#brand-withdraw-btn')?.addEventListener('click', async () => {
    if (!window.confirm('撤回该活动的品牌认定提案？')) return;
    const res = withdrawBrandProposal({ activityId: act.id, by: myId, role: myRole });
    if (!res.ok) { showToast('error', res.reason || '撤回失败'); return; }
    showToast('success', '已撤回品牌认定提案');
    await afterBrandWrite();
  });
  cardEl.querySelector('#brand-revoke-btn')?.addEventListener('click', async () => {
    if (!window.confirm('确认取消本场的品牌认定？（留痕：取消人 / 时间；重新认定为品牌仍须支委会审议通过）')) return;
    const res = revokeBrandDesignation({ activityId: act.id, by: myId, role: myRole });
    if (!res.ok) { showToast('error', res.reason || '取消失败'); return; }
    showToast('success', '已取消品牌认定');
    await afterBrandWrite();
  });

  // 追加复盘要求两动作（2026-09-21 批次 135 · 裁定二「按推荐档落」）：① 要求组织者复盘（支委会全体）
  //   ② 撤回要求（发起人或支委会）。要求须写明一句内容；写链单一源＝services/activity.js，放行在服务内复算。
  cardEl.querySelector('#review-request-btn')?.addEventListener('click', async () => {
    const note = window.prompt('要求组织者复盘——请写明一句要求内容（如「请补充这次活动的改进建议」）：', '');
    if (note === null) return;
    if (!note.trim()) { showToast('error', '请写明一句要求内容'); return; }
    const res = requestOrganizerReview({ activityId: act.id, by: myId, role: myRole, note });
    if (!res.ok) { showToast('error', res.reason || '发起失败'); return; }
    showToast('success', '已要求组织者复盘（进本场关闭判据，只判到「交回」）');
    await afterBrandWrite();
  });
  cardEl.querySelector('#review-request-withdraw-btn')?.addEventListener('click', async () => {
    if (!window.confirm('撤回本场的追加复盘要求？')) return;
    const res = withdrawReviewRequest({ activityId: act.id, by: myId, role: myRole });
    if (!res.ok) { showToast('error', res.reason || '撤回失败'); return; }
    showToast('success', '已撤回追加复盘要求');
    await afterBrandWrite();
  });

  // 线上异步表决区（AV4.5）：加载后 fetchVotes → 逐条议程渲染表决组件；
  // vote-submitted 冒泡（detail.agendaItemId）→ 重拉该条表态并重绘（支持覆盖表态/多议程各自刷新）。
  const voteSection = cardEl.querySelector('#async-vote-section');
  if (voteSection && currentUser) {
    const renderAllVoteWidgets = async () => {
      const votes = await fetchVotes(act.id);
      voteSection.querySelectorAll('.vote-widget-slot').forEach(slot => {
        const item = (act.agenda || []).find(x => x.id === slot.dataset.voteItemId);
        if (item) renderVoteWidget(slot, { activity: act, agendaItem: item, votes, currentUserId: currentUser.personId, canVote });
      });
    };
    renderAllVoteWidgets().catch(e => console.warn('[activity-entry] 表态数据加载失败：', e));
    voteSection.addEventListener('vote-submitted', (e) => {
      const itemId = e.detail?.agendaItemId;
      const slot = itemId ? voteSection.querySelector(`[data-vote-item-id="${CSS.escape(itemId)}"]`) : null;
      if (!slot) return;
      fetchVotes(act.id)
        .then(votes => {
          const item = (act.agenda || []).find(x => x.id === itemId);
          if (item) renderVoteWidget(slot, { activity: act, agendaItem: item, votes, currentUserId: currentUser.personId, canVote });
        })
        .catch(err => console.warn('[activity-entry] 表态刷新失败：', err));
    });
  }
}

// ════════════════════════════════════════════════════════════════
//  专班详情
// ════════════════════════════════════════════════════════════════

function renderTaskforce(tf) {
  if (!cardEl) return;
  const signups = SignupStore.getAll().filter(s => s.sourceType === 'taskforce' && s.sourceId === tf.id);
  const members = Array.isArray(tf.members) ? tf.members : [];
  const canSignup = _canSignup('taskforce', tf);
  const initiatorName = tf.initiator ? (getPersonById(tf.initiator)?.name || tf.initiator) : '—';
  const fullLabel = tf.capacity ? `${members.length} / ${tf.capacity}` : `${members.length}`;

  cardEl.innerHTML = `
    <!-- 标题区 -->
    <div class="mb-5 pb-5 border-b border-gray-100">
      <div class="flex items-center gap-2.5 mb-2 flex-wrap">
        ${statusBadge(tf, 'tf')}
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

    ${canSignup ? renderSignupSection({ sourceType: 'taskforce', sourceId: tf.id, title: tf.name, signups, myId }) : ''}

    <!-- 报名名单 -->
    ${renderSignupList({ sourceType: 'taskforce', sourceId: tf.id, signups, myId })}

    <!-- 专班成员 -->
    <div class="mt-6">
      <h3 class="text-sm font-semibold text-gray-700 mb-3">专班成员（${members.length}）</h3>
      ${members.length === 0
        ? '<p class="text-sm text-gray-500">暂无成员</p>'
        : `<div class="flex flex-wrap gap-2.5">${members.map(x => `
            <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-50">
              <span class="w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-semibold text-white flex-shrink-0" style="background:#8B5CF6;">${(getPersonById(x.personId)?.name || '?').slice(0, 1)}</span>
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
