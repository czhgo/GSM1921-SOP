// Party governance home: show real work first, then organizational exceptions.
import { mockDB } from '../../../core/domain/domain.js?v=20261018a';
import { buildPartyOverviewModel } from '../../../core/domain/party-overview.js?v=20261018a';
import { listReviewRequests } from '../../../services/governance/review-request.js?v=20261018a';
import { getBranchById } from '../../../services/branch/branch.js?v=20261018a';
import { escHtml as esc, fmtDt, getBasePath } from '../../../core/base/utils.js?v=20261018a';

const TYPE_LABELS = { 'develop-node': '发展节点', 'activity-report': '活动报备' };

export function renderContent() {
  const host = document.getElementById('party-committee-tab-content');
  if (!host) return;
  host.dataset.currentTab = 'governance-overview';

  const branches = (mockDB.branches || []).filter((branch) => branch && branch.id);
  const model = buildPartyOverviewModel({ branches, reviewRequests: listReviewRequests({}) });
  const branchLabel = (id) => {
    const branch = getBranchById(id);
    return branch?.config?.headerTitle || branch?.name || id || '所属支部未标注';
  };

  host.innerHTML = `
    <div class="party-page">
      <header class="party-page__header">
        <div>
          <p class="text-xs font-medium text-gray-500">党委 · 全院范围</p>
          <h2 class="mt-1 font-title-cn text-xl font-bold text-gray-900">治理总览</h2>
          <p class="mt-1 text-sm text-gray-600">先处理待批复事项；需要补任支书的支部单独列出。</p>
        </div>
        <nav class="flex flex-wrap gap-x-4 gap-y-2 text-sm" aria-label="党委治理入口">
          <a class="text-blue-700 underline underline-offset-2" href="${getBasePath()}workspace/party-committee.html?tab=monitor">支部动态</a>
          <a class="text-blue-700 underline underline-offset-2" href="${getBasePath()}workspace/party-committee.html?tab=branches">支部管理</a>
        </nav>
      </header>

      <section class="card p-5" aria-labelledby="party-action-queue-title">
        <div class="flex flex-wrap items-baseline justify-between gap-3">
          <div>
            <h3 id="party-action-queue-title" class="font-title-cn text-base font-bold text-gray-900">党委待处理</h3>
            <p class="mt-1 text-xs text-gray-500">待批复上报 · ${model.pendingCount} 项</p>
          </div>
          <a class="text-sm text-blue-700 underline underline-offset-2" href="${getBasePath()}workspace/party-committee.html?tab=review">查看全部上报</a>
        </div>
        ${model.pending.length ? `<ol class="mt-4 divide-y divide-gray-200 border-y border-gray-200">
          ${model.pending.map((row) => `
            <li class="flex flex-wrap items-center gap-x-4 gap-y-2 py-3">
              <div class="min-w-0 flex-1">
                <div class="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span class="text-xs font-medium text-gray-600">${esc(branchLabel(row.branchId))}</span>
                  <span class="text-xs text-gray-400">${esc(TYPE_LABELS[row.type] || '支部上报')}</span>
                </div>
                <p class="mt-1 truncate text-sm font-medium text-gray-900">${esc(row.title || '未命名事项')}</p>
                <p class="mt-1 line-clamp-2 text-xs leading-5 text-gray-600">${esc(row.content || '未附说明')}</p>
              </div>
              <time class="shrink-0 text-xs tabular-nums text-gray-500">${esc(fmtDt(row.createdAt))}</time>
              <a class="btn-accent inline-flex shrink-0 px-3 py-1.5 text-xs font-medium" href="${getBasePath()}workspace/party-committee.html?tab=review&amp;highlight=${encodeURIComponent(row.id)}">处理上报</a>
            </li>`).join('')}
        </ol>` : `<p class="mt-3 border-y border-gray-200 py-6 text-sm text-gray-600" role="status">当前没有待批复上报。</p>`}
      </section>

      <section class="card p-5" aria-labelledby="party-org-exceptions-title">
        <div class="flex flex-wrap items-baseline justify-between gap-3">
          <div>
            <h3 id="party-org-exceptions-title" class="font-title-cn text-base font-bold text-gray-900">组织待补</h3>
            <p class="mt-1 text-xs text-gray-500">运行中的支部尚未任命支书 · ${model.exceptionCount} 个</p>
          </div>
          <a class="text-sm text-blue-700 underline underline-offset-2" href="${getBasePath()}workspace/party-committee.html?tab=branches">前往支部管理</a>
        </div>
        ${model.exceptions.length ? `<ul class="mt-3 divide-y divide-gray-100 border-y border-gray-200">
          ${model.exceptions.map((branch) => `
            <li class="flex flex-wrap items-center justify-between gap-3 py-3">
              <span class="text-sm font-medium text-gray-800">${esc(branch.config?.headerTitle || branch.name || branch.id)}</span>
              <span class="text-xs text-amber-800">待任命支书</span>
            </li>`).join('')}
        </ul>` : `<p class="mt-3 border-y border-gray-200 py-4 text-sm text-gray-600">没有待补任的支部。</p>`}
      </section>
    </div>`;
}
