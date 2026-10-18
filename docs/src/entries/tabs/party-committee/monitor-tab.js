// Branch monitoring: compare organization-level state without exposing member-level records.
import { mockDB } from '../../../core/domain/domain.js?v=20261018f';
import { PersonStore } from '../../../services/member/person.js?v=20261018f';
import { getRosterStats } from '../../../services/member/roster.js?v=20261018f';
import { listReviewRequests } from '../../../services/governance/review-request.js?v=20261018f';
import { bindBranchReadOnlyButtons } from '../../../services/core/branch-readonly-nav.js?v=20261018f';
import { renderBranchFilter, filterByBranch } from '../../../components/governance/branch-filter.js?v=20261018f';
import { escHtml as esc } from '../../../core/base/utils.js?v=20261018f';
import { renderSectionHeader } from '../../../components/shell/page-frame.js?v=20261018f';

const BRANCH_FILTER_STATE = 'pc-monitor';

export async function renderContent(ctx) {
  const host = document.getElementById('party-committee-tab-content');
  if (!host) return;
  host.dataset.currentTab = 'monitor';

  const allBranches = (mockDB.branches || []).filter((branch) => branch && branch.id);
  const branches = filterByBranch(allBranches, BRANCH_FILTER_STATE);
  const activities = ctx?.activities || mockDB.activities || [];
  const pending = listReviewRequests({ status: 'pending' });
  const apiMode = document.documentElement.dataset.dataSource === 'api';

  const rows = branches.map((branch) => {
    const branchMembers = apiMode && branch.summary?.memberCount == null
      ? null
      : PersonStore.getMembers().filter((person) => person.branchId === branch.id);
    const roster = getRosterStats({ branchId: branch.id });
    const memberCount = branch.summary?.memberCount ?? (branchMembers ? branchMembers.length : null);
    const partyCount = branch.summary?.partyMemberCount ?? (branchMembers ? roster.partyTotal : null);
    const activityCount = activities.filter((activity) => (activity.branchId || 'br-b1') === branch.id).length;
    const pendingCount = pending.filter((request) => request.branchId === branch.id).length;
    return { branch, memberCount, partyCount, activityCount, pendingCount };
  });

  host.innerHTML = `
    <div class="page-section-stack">
      <section class="card p-5" aria-label="支部运行台账">
        ${renderSectionHeader({ title: '支部运行台账', description: '按支部对比运行状态与待批复数量' })}
        <div id="pc-monitor-branch-filter" class="mb-4 mt-4"></div>
        ${rows.length ? `<div class="pc-table-scroll pc-table-scroll--branches">
          <table class="data-table data-table--compare">
            <caption class="visually-hidden">支部运行台账：比较支部状态、成员、活动与待批复数量</caption>
            <thead><tr><th scope="col">支部</th><th scope="col">状态</th><th scope="col">成员</th><th scope="col">在册党员</th><th scope="col">待批复</th><th scope="col">活动</th><th scope="col">查看</th></tr></thead>
            <tbody>${rows.map(({ branch, memberCount, partyCount, activityCount, pendingCount }) => `
              <tr>
                <td><div class="font-medium text-gray-900">${esc(branch.config?.headerTitle || branch.name || branch.id)}</div><div class="mt-0.5 text-xs text-gray-500">${esc(branch.type || '支部')}</div></td>
                <td><span class="text-sm font-medium ${branch.status === 'inactive' ? 'text-gray-600' : 'text-green-700'}">${branch.status === 'inactive' ? '已停用' : '运行中'}</span></td>
                <td class="tabular-nums">${memberCount == null ? '—' : `${memberCount} 人`}</td>
                <td class="tabular-nums">${partyCount == null ? '—' : `${partyCount} 人`}</td>
                <td class="tabular-nums ${pendingCount ? 'font-semibold text-amber-800' : ''}">${pendingCount
                  ? `<a class="hover:underline" href="?tab=review&amp;branchId=${encodeURIComponent(branch.id)}" title="查看该支部待批复上报">${pendingCount} 项</a>`
                  : '0 项'}</td>
                <td class="tabular-nums">${activityCount} 项</td>
                <td><button type="button" class="btn-outline branch-readonly-enter whitespace-nowrap px-3 py-2 text-xs font-medium" data-branch-id="${esc(branch.id)}">查看该支部</button></td>
              </tr>`).join('')}</tbody>
          </table>
        </div>` : `<p class="py-8 text-sm text-gray-600" role="status">当前筛选下没有支部。</p>`}
      </section>
      <p class="text-sm leading-6 text-gray-600">只读下钻会显示当前支部范围。党委可查该支部档案，日常事务仍由支部办理。</p>
    </div>`;

  renderBranchFilter(host.querySelector('#pc-monitor-branch-filter'), {
    stateKey: BRANCH_FILTER_STATE,
    onChange: () => renderContent(ctx),
  });
  bindBranchReadOnlyButtons(host);
}
