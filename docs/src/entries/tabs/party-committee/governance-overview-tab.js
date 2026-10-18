// Party governance home: show real work first, then organizational exceptions.
import { mockDB } from '../../../core/domain/domain.js?v=20261018e';
import { buildPartyOverviewModel } from '../../../core/domain/party-overview.js?v=20261018e';
import { listReviewRequests } from '../../../services/governance/review-request.js?v=20261018e';
import { getBranchById } from '../../../services/branch/branch.js?v=20261018e';
import { escHtml as esc, fmtDt, getBasePath } from '../../../core/base/utils.js?v=20261018e';
import { renderSectionHeader } from '../../../components/shell/page-frame.js?v=20261018e';

const TYPE_LABELS = { 'develop-node': '发展节点', 'activity-report': '活动报备' };
// 2026-10-18 繁专项（Top 7）：总览只预览待批复前 N 条，完整队列回「支部上报」页
const PENDING_PREVIEW_LIMIT = 5;

export function renderContent() {
  const host = document.getElementById('party-committee-tab-content');
  if (!host) return;
  host.dataset.currentTab = 'governance-overview';

  const branches = (mockDB.branches || []).filter((branch) => branch && branch.id);
  const model = buildPartyOverviewModel({ branches, reviewRequests: listReviewRequests({}) });
  const pendingPreview = model.pending.slice(0, PENDING_PREVIEW_LIMIT);
  const branchLabel = (id) => {
    const branch = getBranchById(id);
    return branch?.config?.headerTitle || branch?.name || id || '所属支部未标注';
  };

  host.innerHTML = `
    <div class="page-section-stack">
      <section class="card p-5" aria-labelledby="party-action-queue-title">
        ${renderSectionHeader({
          titleId: 'party-action-queue-title',
          title: '党委待处理',
          description: `待批复上报 · 共 ${model.pendingCount} 项`,
          actions: `<a class="btn-outline px-3 py-1.5 text-xs" href="${getBasePath()}workspace/party-committee.html?tab=review">查看全部上报</a>`,
        })}
        ${pendingPreview.length ? `<ol class="mt-4 divide-y divide-gray-200 border-y border-gray-200">
          ${pendingPreview.map((row) => `
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
        ${renderSectionHeader({
          titleId: 'party-org-exceptions-title',
          title: '组织待补',
          description: `运行中的支部尚未任命支书 · ${model.exceptionCount} 个`,
        })}
        ${model.exceptions.length ? `<ul class="mt-3 divide-y divide-gray-100 border-y border-gray-200">
          ${model.exceptions.map((branch) => `
            <li class="flex flex-wrap items-center justify-between gap-3 py-3">
              <span class="text-sm font-medium text-gray-800">${esc(branch.config?.headerTitle || branch.name || branch.id)}</span>
              <div class="flex flex-wrap items-center gap-3">
                <span class="text-xs text-amber-800">待任命支书</span>
                <a class="btn-outline px-3 py-1.5 text-xs" href="${getBasePath()}branch-config.html?branchId=${encodeURIComponent(branch.id)}">去任命</a>
              </div>
            </li>`).join('')}
        </ul>` : `<p class="mt-3 border-y border-gray-200 py-4 text-sm text-gray-600">没有待补任的支部。</p>`}
      </section>
    </div>`;
}
