// role: [工程师]+[AI]
// 党委工作台 Tab：上报审批（P3 党委后台，2026-09-02）
// 党委侧处理端（双向通道党委半侧）：各支部上报（发展节点/活动报备）在此逐项批/驳，
// 意见随结论回传支部侧；已处理历史可查。
// 数据源：reviewRequests（services/review-request.js，mock 与 API 双引擎同源）
// 设计权威源：content/04_web_design/evolution/PARTY_COMMITTEE_DESIGN.md §5 P3

import { mockDB } from '../../../core/domain.js?v=20260921o';
import { AuthStore } from '../../../services/auth.js?v=20260921o';
import { getPersonName } from '../../../services/person.js?v=20260921o';
import { getBranchById } from '../../../services/branch.js?v=20260921o';
import { decideReviewRequest, listReviewRequests } from '../../../services/review-request.js?v=20260921o';
import { showToast, escHtml as esc, fmtDt } from '../../../core/utils.js?v=20260921o';
// 统一检索引擎（2026-09-14 批次 37）：待批复 / 已处理两区各接一个实例（关键词 + 类型/状态分面 + 分页）
import { renderFilteredList } from '../../../components/list-filter.js?v=20260921o';

const TYPE_META = {
  'develop-node': { label: '发展节点' },
  'activity-report': { label: '活动报备' },
};
const STATUS_META = {
  pending: { label: '待批复', cls: 'bg-amber-50 text-amber-700' },
  approved: { label: '已批准', cls: 'bg-green-50 text-green-700' },
  rejected: { label: '已驳回', cls: 'bg-gray-100 text-gray-600' },
};

// HTML 转义/日期格式化统一走 core/utils.js（escHtml/fmtDt，2026-09-03 去重收口）
function branchName(branchId) {
  const b = getBranchById(branchId);
  return b?.config?.headerTitle || b?.name || branchId;
}

export function renderContent() {
  const el = document.getElementById('party-committee-tab-content');
  if (!el) return;
  const me = AuthStore.getCurrentUser();
  if (!me) return;

  const rows = listReviewRequests({});
  const n = s => rows.filter(r => r.status === s).length;
  const pending = rows.filter(r => r.status === 'pending');
  const done = rows.filter(r => r.status !== 'pending');

  el.innerHTML = `
    <div class="space-y-4">
      <div class="rounded-lg border border-gray-200 bg-white p-4 flex items-center justify-between gap-3">
        <div class="min-w-0">
          <p class="font-title-cn text-base font-bold text-gray-800">上报审批</p>
          <p class="text-xs text-gray-500 mt-0.5">上报关键事项（发展节点/活动报备），党委逐项批复并反馈支部</p>
        </div>
        <div class="flex items-center gap-2 shrink-0 flex-wrap">
          <span class="text-xs px-2.5 py-1 rounded-full bg-amber-50 text-amber-700">待批复 ${n('pending')}</span>
          <span class="text-xs px-2.5 py-1 rounded-full bg-green-50 text-green-700">已批准 ${n('approved')}</span>
          <span class="text-xs px-2.5 py-1 rounded-full bg-gray-100 text-gray-600">已驳回 ${n('rejected')}</span>
        </div>
      </div>
      <div>
        <p class="text-xs text-gray-500 mb-2">待批复（${pending.length}）</p>
        <div id="pc-review-pending-host"></div>
      </div>
      <div>
        <p class="text-xs text-gray-500 mb-2">已处理（${done.length}）</p>
        <div id="pc-review-done-host"></div>
      </div>
    </div>
  `;

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
    listClass: 'space-y-3',
    // 原「暂无待批复的上报」空态块迁移为 emptyMessage（两行文案合并）
    emptyMessage: '暂无待批复的上报 · 支部发起上报后，将出现在这里等待党委审批',
    rowHtml: cardHtml,
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
    listClass: 'space-y-3',
    emptyMessage: '暂无已处理的上报',
    rowHtml: cardHtml,
  });
}

/** 单条上报卡（待批复带批/驳操作区） */
function cardHtml(r) {
  const t = TYPE_META[r.type] || { label: r.type || '上报' };
  const s = STATUS_META[r.status] || { label: r.status, cls: 'bg-gray-100 text-gray-600' };
  return `
    <div class="rounded-lg border border-gray-200 bg-white p-4" data-rq-card="${esc(r.id)}" data-rq-status="${r.status}">
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
          <button data-rq-act="reject" class="text-xs px-3 py-1.5 rounded-lg text-gray-500 border border-gray-200 hover:border-red-300 hover:text-red-600">驳回</button>
          <button data-rq-act="approve" class="text-xs px-3 py-1.5 rounded-lg text-white font-medium" style="background:#C8102E;">批准</button>
        </div>
      </div>` : `
      <div class="mt-2.5 rounded-lg ${r.status === 'approved' ? 'bg-green-50/60' : 'bg-gray-50'} p-2.5">
        <p class="text-xs text-gray-600 leading-5">
          <span class="font-medium ${r.status === 'approved' ? 'text-green-700' : 'text-gray-600'}">${r.status === 'approved' ? '批准' : '驳回'}</span>
          · ${esc(getPersonName(r.decidedBy) || r.decidedBy || '党委')} · ${fmtDt(r.decidedAt)}
          ${r.decisionNote ? `<br/>${esc(r.decisionNote)}` : ''}
        </p>
      </div>`}
    </div>`;
}
