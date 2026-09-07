// role: [工程师]+[AI]
// 党委工作台 Tab：上报审批（P3 党委后台，2026-09-02）
// 党委侧处理端（双向通道党委半侧）：各支部上报（发展节点/活动报备）在此逐项批/驳，
// 意见随结论回传支部侧；已处理历史可查。
// 数据源：reviewRequests（services/review-request.js，mock 与 API 双引擎同源）
// 设计权威源：content/04_web_design/evolution/PARTY_COMMITTEE_DESIGN.md §5 P3

import { mockDB } from '../../../core/domain.js?v=20260903c';
import { AuthStore } from '../../../services/auth.js?v=20260903c';
import { getPersonName } from '../../../services/person.js?v=20260903c';
import { getBranchById } from '../../../services/branch.js?v=20260903c';
import { decideReviewRequest, listReviewRequests } from '../../../services/review-request.js?v=20260903c';
import { showToast, escHtml as esc, fmtDt } from '../../../core/utils.js?v=20260903c';

const TYPE_META = {
  'develop-node': { label: '发展节点' },
  'activity-report': { label: '活动报备' },
};
const STATUS_META = {
  pending: { label: '待批复', cls: 'bg-amber-50 text-amber-600' },
  approved: { label: '已批准', cls: 'bg-green-50 text-green-600' },
  rejected: { label: '已驳回', cls: 'bg-gray-100 text-gray-500' },
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
      <div class="rounded-xl border border-gray-200 bg-white p-4 flex items-center justify-between gap-3">
        <div class="min-w-0">
          <p class="font-title-cn text-base font-bold text-gray-800">上报审批</p>
          <p class="text-xs text-gray-400 mt-0.5">上报关键事项（发展节点/活动报备），党委逐项批复并反馈支部</p>
        </div>
        <div class="flex items-center gap-2 shrink-0 flex-wrap">
          <span class="text-xs px-2.5 py-1 rounded-full bg-amber-50 text-amber-600">待批复 ${n('pending')}</span>
          <span class="text-xs px-2.5 py-1 rounded-full bg-green-50 text-green-600">已批准 ${n('approved')}</span>
          <span class="text-xs px-2.5 py-1 rounded-full bg-gray-100 text-gray-500">已驳回 ${n('rejected')}</span>
        </div>
      </div>
      ${pending.length ? `
      <div>
        <p class="text-xs text-gray-400 mb-2">待批复（${pending.length}）</p>
        <div class="space-y-3">${pending.map(cardHtml).join('')}</div>
      </div>` : `
      <div class="rounded-xl border border-gray-200 bg-white p-6 text-center">
        <p class="text-sm text-gray-500">暂无待批复的上报</p>
        <p class="text-xs text-gray-400 mt-1">支部发起上报后，将出现在这里等待党委审批</p>
      </div>`}
      ${done.length ? `
      <div>
        <p class="text-xs text-gray-400 mb-2">已处理（${done.length}）</p>
        <div class="space-y-3">${done.map(cardHtml).join('')}</div>
      </div>` : ''}
    </div>
  `;

  el.querySelectorAll('[data-rq-card]').forEach(card => {
    const id = card.dataset.rqCard;
    const status = card.dataset.rqStatus;
    if (status !== 'pending') return;
    card.querySelector('[data-rq-act="approve"]')?.addEventListener('click', async () => {
      const note = card.querySelector('.rq-decision')?.value.trim() || '';
      await decideReviewRequest({ id, decision: 'approved', decidedBy: me.personId, decisionNote: note });
      showToast('已批准该上报（批复已送达支部）');
      renderContent();
    });
    card.querySelector('[data-rq-act="reject"]')?.addEventListener('click', async () => {
      const note = card.querySelector('.rq-decision')?.value.trim();
      if (!note) { showToast('驳回请填写意见，便于支部知悉整改方向'); return; }
      await decideReviewRequest({ id, decision: 'rejected', decidedBy: me.personId, decisionNote: note });
      showToast('已驳回该上报（意见已反馈支部）');
      renderContent();
    });
  });
}

/** 单条上报卡（待批复带批/驳操作区） */
function cardHtml(r) {
  const t = TYPE_META[r.type] || { label: r.type || '上报' };
  const s = STATUS_META[r.status] || { label: r.status, cls: 'bg-gray-100 text-gray-500' };
  return `
    <div class="rounded-xl border border-gray-200 bg-white p-4" data-rq-card="${esc(r.id)}" data-rq-status="${r.status}">
      <div class="flex items-center gap-2 flex-wrap mb-1.5">
        <span class="text-xs px-2 py-0.5 rounded-full bg-gray-50 border border-gray-200 text-gray-500">${esc(branchName(r.branchId))}</span>
        <span class="text-xs px-2 py-0.5 rounded-full ${r.type === 'develop-node' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}">${t.label}</span>
        <span class="text-xs px-2 py-0.5 rounded-full ${s.cls}">${s.label}</span>
      </div>
      <p class="text-sm font-medium text-gray-800">${esc(r.title)}</p>
      <p class="text-xs text-gray-500 mt-1 leading-5 whitespace-pre-wrap">${esc(r.content)}</p>
      <p class="text-xs text-gray-400 mt-1.5">${esc(getPersonName(r.submittedBy) || r.submittedBy)} 提交 · ${fmtDt(r.createdAt)}</p>
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
