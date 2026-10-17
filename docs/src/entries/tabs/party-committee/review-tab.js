// role: [工程师]+[AI]
// 党委工作台 Tab：支部上报（P3 党委后台，2026-09-02；**2026-10-04 批次 374 由「上报审批」改名**）
// 党委侧处理端（双向通道党委半侧）：各支部上报（发展节点/活动报备）在此逐项批/驳，
// 意见随结论回传支部侧；已处理历史可查。
// **名实**（2026-10-04 批次 374 · 支书圈丙）：支书逐字「**党委不上报，而是接收信息，回复支部信息！**」
//   ⇒ 页签名按**对象**（**支部上报事项台账**），**批 / 驳是页内动作**（原「上报审批」＝对象＋动作混名）。
// **支部筛选**（同批 · 支书圈甲「按下设支部筛选信息」）：页首共用件 `components/governance/branch-filter.js`。
// 数据源：reviewRequests（services/governance/review-request.js，mock 与 API 双引擎同源）
// 设计权威源：content/04_web_design/evolution/PARTY_COMMITTEE_DESIGN.md §5 P3

import { mockDB } from '../../../core/domain/domain.js?v=20261018a';
import { AuthStore } from '../../../services/core/auth.js?v=20261018a';
import { getPersonName } from '../../../services/member/person.js?v=20261018a';
import { getBranchById } from '../../../services/branch/branch.js?v=20261018a';
import { decideReviewRequest, listReviewRequests } from '../../../services/governance/review-request.js?v=20261018a';
import { showToast, escHtml as esc, fmtDt } from '../../../core/base/utils.js?v=20261018a';
// 统一检索引擎（2026-09-14 批次 37）：待批复 / 已处理两区各接一个实例（关键词 + 类型/状态分面 + 分页）
import { renderFilteredList } from '../../../components/ui/list-filter.js?v=20261018a';
// 支部筛选共用件（2026-10-04 批次 374 · 支书「按下设支部筛选信息」）——三页复用同一件，不各写一份
import { renderBranchFilter, filterByBranch } from '../../../components/governance/branch-filter.js?v=20261018a';

/** 本页支部筛选的 stateKey（选择随模块自持，页内重绘不丢） */
const BRANCH_FILTER_STATE = 'pc-review';
let reviewMode = 'pending';

const TYPE_META = {
  'develop-node': { label: '发展节点' },
  'activity-report': { label: '活动报备' },
};
const STATUS_META = {
  pending: { label: '待批复', cls: 'bg-amber-50 text-amber-700' },
  approved: { label: '已批准', cls: 'bg-green-50 text-green-700' },
  rejected: { label: '已驳回', cls: 'bg-gray-100 text-gray-600' },
};

// HTML 转义/日期格式化统一走 core/base/utils.js（escHtml/fmtDt，2026-09-03 去重收口）
function branchName(branchId) {
  const b = getBranchById(branchId);
  return b?.config?.headerTitle || b?.name || branchId;
}

export function renderContent() {
  const el = document.getElementById('party-committee-tab-content');
  if (!el) return;
  el.dataset.currentTab = 'review'; // 跨 tab 共享容器约定（同 today/group-progress/insight-view 体例）：登记当前 tab，防 party-config 守卫读到陈旧标记而残留
  const me = AuthStore.getCurrentUser();
  if (!me) return;

  // 支部筛选（2026-10-04 批次 374 · 支书「按下设支部筛选信息」）：过滤后待批复 / 已处理两区与页首计数同步收窄
  const rows = filterByBranch(listReviewRequests({}), BRANCH_FILTER_STATE);
  const n = s => rows.filter(r => r.status === s).length;
  const highlightId = new URLSearchParams(window.location.search).get('highlight') || '';
  let pending = rows.filter(r => r.status === 'pending');
  let done = rows.filter(r => r.status !== 'pending');
  const highlightFirst = (list) => highlightId
    ? list.slice().sort((a, b) => Number(b.id === highlightId) - Number(a.id === highlightId))
    : list;
  pending = highlightFirst(pending);
  done = highlightFirst(done);
  if (highlightId && !rows.some((row) => row.id === highlightId && row.status === 'pending')) reviewMode = 'done';
  else if (highlightId) reviewMode = 'pending';

  el.innerHTML = `
    <div class="party-page">
      <header class="party-page__header">
        <div class="party-page__heading">
        <p class="text-xs font-medium text-gray-500">党委 · 全院范围</p>
        <h2 class="mt-1 font-title-cn text-xl font-bold text-gray-900">支部上报</h2>
        <p class="mt-1 text-sm text-gray-600">党委逐项批复，决定和意见会回传提交支部。</p>
        <p class="mt-2 text-xs text-gray-500">待批复 ${n('pending')} 项 · 已处理 ${done.length} 项</p>
        </div>
      </header>
      <section class="card p-5" aria-label="支部上报处理">
      <div id="pc-review-branch-filter" class="mb-4"></div>
      <div class="flex gap-1 border-b border-gray-200" role="tablist" aria-label="上报状态">
        <button id="pc-review-tab-pending" type="button" class="px-3 py-2 text-sm ${reviewMode === 'pending' ? 'border-b-2 border-red-700 font-semibold text-gray-900' : 'text-gray-600'}" data-review-view="pending" role="tab" aria-controls="pc-review-pending-section" aria-selected="${reviewMode === 'pending'}" tabindex="${reviewMode === 'pending' ? '0' : '-1'}">待批复 <span class="ml-1 tabular-nums">${pending.length}</span></button>
        <button id="pc-review-tab-done" type="button" class="px-3 py-2 text-sm ${reviewMode === 'done' ? 'border-b-2 border-red-700 font-semibold text-gray-900' : 'text-gray-600'}" data-review-view="done" role="tab" aria-controls="pc-review-done-section" aria-selected="${reviewMode === 'done'}" tabindex="${reviewMode === 'done' ? '0' : '-1'}">已处理 <span class="ml-1 tabular-nums">${done.length}</span></button>
      </div>
      <section id="pc-review-pending-section" role="tabpanel" aria-labelledby="pc-review-tab-pending" tabindex="0" ${reviewMode !== 'pending' ? 'hidden' : ''} aria-label="待批复上报"><div id="pc-review-pending-host"></div></section>
      <section id="pc-review-done-section" role="tabpanel" aria-labelledby="pc-review-tab-done" tabindex="0" ${reviewMode !== 'done' ? 'hidden' : ''} aria-label="已处理上报"><div id="pc-review-done-host"></div></section>
      </section>
    </div>
  `;

  // 支部筛选（共用件；变更即重渲本页，计数与两区同步收窄）
  renderBranchFilter(el.querySelector('#pc-review-branch-filter'), {
    stateKey: BRANCH_FILTER_STATE,
    onChange: () => renderContent(),
  });
  const reviewTabs = [...el.querySelectorAll('[data-review-view]')];
  reviewTabs.forEach((button, index) => {
    button.addEventListener('click', () => {
    reviewMode = button.dataset.reviewView === 'done' ? 'done' : 'pending';
    renderContent();
    });
    button.addEventListener('keydown', (event) => {
      const nextIndex = event.key === 'ArrowRight' ? (index + 1) % reviewTabs.length
        : event.key === 'ArrowLeft' ? (index + reviewTabs.length - 1) % reviewTabs.length
          : event.key === 'Home' ? 0 : event.key === 'End' ? reviewTabs.length - 1 : -1;
      if (nextIndex < 0) return;
      event.preventDefault();
      const nextView = reviewTabs[nextIndex].dataset.reviewView;
      reviewTabs[nextIndex].click();
      el.querySelector(`[data-review-view="${nextView}"]`)?.focus();
    });
  });

  // 两区各接一个引擎实例（stateKey 各异；行内「批准/驳回」改事件委托，挂在待批复宿主上）
  const pendingHost = el.querySelector('#pc-review-pending-host');
  renderFilteredList(pendingHost, {
    stateKey: 'party-committee-review-pending',
    rows: pending,
    keyword: { keys: ['title', 'content'], placeholder: '搜索事项标题 / 说明…' },
    facets: [
      { key: 'type', label: '类型', format: (v) => (TYPE_META[v] || {}).label || v },
      { key: 'status', label: '状态', format: (v) => (STATUS_META[v] || {}).label || v },
    ],
    countUnit: '条',
    listClass: 'divide-y divide-gray-200',
    // 原「暂无待批复的上报」空态块迁移为 emptyMessage（两行文案合并）
    emptyMessage: '暂无待批复的上报 · 支部发起上报后，将出现在这里等待党委审批',
    rowHtml: (row) => cardHtml(row, row.id === highlightId),
  });
  // 行内批准/驳回：事件委托（引擎翻页/筛选会重绘行，行内直接绑定会失效）；
  // 驳回须填意见的守卫保持原样。
  pendingHost.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-rq-act]');
    if (!btn) return;
    const card = btn.closest('[data-rq-card]');
    const id = card?.dataset.rqCard;
    if (!id) return;
    if (btn.dataset.rqAct === 'approve') {
      const note = card.querySelector('.rq-decision')?.value.trim() || '';
      await decideReviewRequest({ id, decision: 'approved', decidedBy: me.personId, decisionNote: note });
      showToast('success', '已批准该上报（批复已送达支部）');
      reviewMode = 'done';
      renderContent();
      return;
    }
    const note = card.querySelector('.rq-decision')?.value.trim();
    // 批次 47-P（2026-09-16）：**三处单参 showToast 已修**（原为 `showToast('文案')`）——
    // `showToast(type, message)` 是两参接口，单参会把整句文案当成 **type**（不在 COLORS 表 ⇒ 回落 `info`），
    // 而 `message` 为 undefined ⇒ 用户看到的是一条**只有图标、没有文字**的蓝点气泡：
    //   驳回失败时「为什么不让驳回」一字不说，批准/驳回成功后也**看不到任何结论**。
    if (!note) { showToast('error', '驳回请填写意见，便于支部知悉整改方向'); return; }
    await decideReviewRequest({ id, decision: 'rejected', decidedBy: me.personId, decisionNote: note });
    showToast('success', '已驳回该上报（意见已反馈支部）');
    reviewMode = 'done';
    renderContent();
  });

  const doneHost = el.querySelector('#pc-review-done-host');
  renderFilteredList(doneHost, {
    stateKey: 'party-committee-review-done',
    rows: done,
    keyword: { keys: ['title', 'content'], placeholder: '搜索事项标题 / 说明…' },
    facets: [
      { key: 'type', label: '类型', format: (v) => (TYPE_META[v] || {}).label || v },
      { key: 'status', label: '状态', format: (v) => (STATUS_META[v] || {}).label || v },
    ],
    countUnit: '条',
    listClass: 'divide-y divide-gray-200',
    emptyMessage: '暂无已处理的上报',
    rowHtml: (row) => cardHtml(row, row.id === highlightId),
  });
  const focused = highlightId
    ? [...el.querySelectorAll('[data-rq-card]')].find((card) => card.dataset.rqCard === highlightId)
    : null;
  if (focused && !focused.closest('[hidden]')) {
    focused.tabIndex = -1;
    focused.focus({ preventScroll: true });
    focused.scrollIntoView?.({ block: 'nearest' });
    const nextUrl = new URL(window.location.href);
    nextUrl.searchParams.delete('highlight');
    window.history.replaceState(null, '', nextUrl.toString());
  }
}

/** 单条上报行；决定、理由和回传结果在同一对象内连贯呈现。 */
function cardHtml(r, highlighted = false) {
  const t = TYPE_META[r.type] || { label: r.type || '上报' };
  const s = STATUS_META[r.status] || { label: r.status, cls: 'bg-gray-100 text-gray-600' };
  return `
    <article class="py-4 ${highlighted ? 'rounded-md bg-amber-50/50 px-3 ring-2 ring-amber-300' : ''}" data-rq-card="${esc(r.id)}" data-rq-status="${r.status}">
      <div class="flex items-center gap-2 flex-wrap mb-1.5">
        <span class="text-xs px-2 py-0.5 rounded-full bg-gray-50 border border-gray-200 text-gray-500">${esc(branchName(r.branchId))}</span>
        <span class="text-xs px-2 py-0.5 rounded-full ${r.type === 'develop-node' ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-blue-600'}">${t.label}</span>
        <span class="text-xs px-2 py-0.5 rounded-full ${s.cls}">${s.label}</span>
      </div>
      <p class="text-sm font-medium text-gray-800">${esc(r.title)}</p>
      <p class="text-xs text-gray-500 mt-1 leading-5 whitespace-pre-wrap">${esc(r.content)}</p>
      <p class="text-xs text-gray-500 mt-1.5">${esc(getPersonName(r.submittedBy) || r.submittedBy)} 提交 · ${fmtDt(r.createdAt)}</p>
      ${r.status === 'pending' ? `
      <div class="mt-2.5 pt-2.5 border-t border-gray-100">
        <textarea class="rq-decision input-flat w-full resize-none" rows="2" placeholder="审批意见（驳回必填；批准可选填写指导意见）"></textarea>
        <div class="flex justify-end gap-2 mt-2">
          <button data-rq-act="reject" class="btn-outline text-xs px-3 py-1.5">驳回</button>
          <button data-rq-act="approve" class="btn-accent text-xs px-3 py-1.5 font-medium">批准</button>
        </div>
      </div>` : `
      <div class="mt-2.5 rounded-lg ${r.status === 'approved' ? 'bg-green-50/60' : 'bg-gray-50'} p-2.5">
        <p class="text-xs text-gray-600 leading-5">
          <span class="font-medium ${r.status === 'approved' ? 'text-green-700' : 'text-gray-600'}">${r.status === 'approved' ? '批准' : '驳回'}</span>
          · ${esc(getPersonName(r.decidedBy) || r.decidedBy || '党委')} · ${fmtDt(r.decidedAt)}
          ${r.decisionNote ? `<br/>${esc(r.decisionNote)}` : ''}
        </p>
      </div>`}
    </article>`;
}

