// role: [工程师]+[AI]
// 参与者工作台 Tab：我的复盘（T-304 C1 组织者承载面）
// SOP 复盘提交归「组织者」——组织者可能是党小组组长，也可能是被赋权的普通成员。
// 本 tab 让担任组织者/深度参与者的成员在自己的工作台即可提交复盘，复盘提交人 = 当前用户（组织者）。

import { loadActivities, reviewRequestOf } from '../../../services/activity/activity.js?v=20261028a';
// 复盘表单（字段/校验/提交链路）唯一实现 = services/governance/review.js（2026-09-10 A③）：
// 成员端本 tab 与支书「代提交复盘」共用同一套字段与落库链路，勿在此另写表单。
import { loadActivityReviews, renderActivityReviewFormHtml, submitActivityReviewForm } from '../../../services/governance/review.js?v=20261028a';
import { mockDB, ReviewStatus, REVIEW_STATUS_LABELS } from '../../../core/domain/domain.js?v=20261028a';
import { liveMembers, PersonStore } from '../../../services/member/person.js?v=20261028a';
// 数据域接线收口（2026-09-03）：支部成员名单经 services/member/person.js 获取（原直连 mock PEOPLE）
// 实时视图（非快照）：成员增删即时可见——见 services/member/person.js liveMembers 说明
const PEOPLE = liveMembers();
import { AuthStore } from '../../../services/core/auth.js?v=20261028a';
// 待批活动的可见性单一源（2026-09-22 批次 151）：成员台非支委层 ⇒ 待批活动不进「我的复盘」清单
import { filterActivitiesForViewer } from '../../../services/core/visibility.js?v=20261028a';
import { showToast } from '../../../core/base/utils.js?v=20261028a';
import { renderTabHeader } from '../../../components/shell/page-frame.js?v=20261028a';
import { scrollDetailIntoView, focusActivityAnchor } from '../../../components/ui/detail-anchor.js?v=20261028a';
// 统一检索引擎（支书 2026-09-13 裁定）：第一列是活动的表格一律接入（关键词 + 分面；≤8 行自动不渲染检索条）
import { renderFilteredList, activityKeyword, activityFacets } from '../../../components/ui/list-filter.js?v=20261028a';
// 活动「仍在办」口径单一源（2026-09-13 收敛）：替代手写 status!=='cancelled' && !archived
import { isActivityLive } from '../../../core/domain/constants.js?v=20261028a';

// 私有状态（随模块自持，不污染入口）
let _reviewExpandedId = null;

/**
 * A03：活动组织者判据（与活动详情 / organizer-transfer 同源）——
 * 工作组主源 role=organizer 优先，`assignments` 次之，`act.organizer` 仅兜底。
 * @returns {string[]} 组织者 personId 列表
 */
function _organizerIdsOf(act) {
  const workgroupId = act.workgroupId || `wg-activity-${act.id}`;
  const wgOrganizers = (mockDB.workgroupMembers || [])
    .filter((row) => row && row.workgroupId === workgroupId && row.status !== 'removed' && row.role === 'organizer')
    .map((row) => row.personId);
  const assignmentOrganizers = Array.isArray(act.assignments)
    ? act.assignments.filter((x) => x && x.role === 'organizer').map((x) => x.personId)
    : [];
  const derived = [...new Set([...wgOrganizers, ...assignmentOrganizers].filter(Boolean))];
  return derived.length ? derived : (act.organizer ? [act.organizer] : []);
}

/**
 * 我的复盘 tab：展示当前用户担任组织者/深度参与者的活动，
 * 待复盘活动可展开填写复盘总结并提交 → 纪检委员批注/确认。
 */
export function renderContent(ctx, host) {
  const container = host || document.getElementById('visitor-tab-content');
  if (!container) return;

  const { accent, accentBorder } = ctx;
  const currentUserId = AuthStore.getCurrentUser()?.personId || '';
  const authRecords = ctx.authRecords || [];

  // 我参与的活动（组织者/深度参与者）：assignments + authRecords 双源合并
  const myIds = new Set();
  for (const a of loadActivities()) {
    // A03：组织者身份按派生判据（工作组主源 → assignments → organizer 兜底）；
    //   深度参与者仍读 assignments（该角色只存在于项目角色行）。
    if (_organizerIdsOf(a).includes(currentUserId)) myIds.add(a.id);
    if (Array.isArray(a.assignments)) {
      a.assignments.forEach(x => { if (x.personId === currentUserId && x.role === 'deep') myIds.add(a.id); });
    }
  }
  for (const r of authRecords) {
    if (r.targetPersonId === currentUserId && ['organizer', 'deep'].includes(r.role)) myIds.add(r.scopeRef);
  }

  const myActivities = filterActivitiesForViewer(loadActivities(), AuthStore.getCurrentUser()?.role)
    .filter(a => myIds.has(a.id) && isActivityLive(a))
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  // 获取已有复盘记录
  const reviewMap = {};
  for (const r of loadActivityReviews()) {
    if (r.activityId) reviewMap[r.activityId] = r;
  }

  // 按复盘状态分桶
  const pending = [];
  const completed = [];
  for (const act of myActivities) {
    const rev = reviewMap[act.id];
    if (!rev || rev.reviewStatus === ReviewStatus.NOT_SUBMITTED || rev.reviewStatus === ReviewStatus.REJECTED) {
      pending.push({ act, rev: rev || null });
    } else {
      completed.push({ act, rev });
    }
  }

  const reviewColorMap = {
    [ReviewStatus.NOT_SUBMITTED]: 'bg-red-100 text-red-700',
    [ReviewStatus.UPLOADED]: 'bg-orange-100 text-orange-700',
    [ReviewStatus.ANNOTATING]: 'bg-blue-100 text-blue-700',
    [ReviewStatus.CONFIRMED]: 'bg-green-100 text-green-700',
    [ReviewStatus.REJECTED]: 'bg-red-100 text-red-700',
  };

  function renderActivityCard(item, bucket) {
    const { act, rev } = item;
    const isPending = bucket === 'pending';
    const statusLabel = rev ? REVIEW_STATUS_LABELS[rev.reviewStatus] : '未提交';
    const statusColor = reviewColorMap[rev?.reviewStatus || ReviewStatus.NOT_SUBMITTED] || 'bg-gray-100 text-gray-600';
    const isExpanded = _reviewExpandedId === act.id;
    // 追加复盘要求（2026-09-21 批次 135 · 裁定二「按推荐档落」）：支委会点名的「额外要求复盘」——
    // 组织者侧仍走本页这张既有表单（**不新开第二种填写方式**），只多一个来源标记；
    // 判据单一源＝services/activity/activity.js（本页不另写）。⚠ 不提供任何「已交回后自行更新」入口。
    const req = reviewRequestOf(act);
    const reqBadge = req
      ? `<span class="text-xs px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700" title="支委会要求：${(req.note || '').replace(/"/g, '&quot;')}">支委会要求</span>`
      : '';
    // A03：组织者展示同走派生列表；无组织者时明确「未指定」（不渲染成「—」）。
    const orgIds = _organizerIdsOf(act);
    const orgName = orgIds.length
      ? orgIds.map((id) => PEOPLE.find(p => p.id === id)?.name || id).join('、')
      : '未指定';
    // 展开区常驻 DOM（保态折叠 2026-09-06：正在填写的复盘总结不因展开/收起丢失）。
    // 2026-10-25 Task 3：折叠改为原生 `<details>`——行本身是 `<summary>`（可 Tab 到），
    //   状态由 `open` 属性静态回读，不再用 `div.review-toggle`＋`.hidden`。
    const bodyContent = isPending
      ? renderActivityReviewFormHtml(act, rev, { accent, accentBorder })
      : (rev ? _renderReviewDetail(rev) : '');
    const bodyHtml = bodyContent
      ? `<div class="visitor-review-body">${bodyContent}</div>`
      : '';

    return `
      <details class="visitor-review-item p-3 rounded-xl bg-white transition-colors ${rev?.reviewStatus === ReviewStatus.REJECTED ? 'border border-red-100' : ''}" data-act-id="${act.id}"${isExpanded ? ' open' : ''}>
        <summary class="flex items-center justify-between cursor-pointer review-toggle">
          <span class="flex-1 min-w-0">
            <span class="block text-sm font-medium text-gray-800">${act.title || '未命名'}</span>
            <span class="block text-xs text-gray-500 mt-0.5">${act.date || ''} ${act.type ? '· ' + act.type : ''} · 组织者 ${orgName}</span>
          </span>
          <span class="flex items-center gap-2 ml-4">
            ${reqBadge}
            <span class="text-xs px-1.5 py-0.5 rounded-full ${statusColor}">${statusLabel}</span>
            ${rev?.reviewStatus === ReviewStatus.REJECTED ? '<span class="text-xs text-red-600">需修改</span>' : ''}
          </span>
        </summary>
        ${bodyHtml}
      </details>
    `;
  }

  container.innerHTML = `
    ${host ? '' : renderTabHeader({ title: '我的复盘', description: '组织者 / 深度参与者提交复盘 → 纪检批注确认 → 活动办结。' })}
    <div class="card rounded-xl p-5">
      <div class="flex items-center justify-between mb-4">
        <h3 class="font-title-cn text-sm font-bold text-gray-700">复盘清单（待复盘 ${pending.length} · 已复盘 ${completed.length}）</h3>
        <span class="text-xs text-gray-500">我担任组织者/深度参与者的活动 · 提交人即组织者</span>
      </div>
      <div class="text-xs text-gray-500 mb-4">提交活动复盘总结 → 纪检委员批注/确认 → 活动办结</div>

      <div class="mb-4">
        <div class="text-xs font-bold text-gray-600 mb-2">待复盘 <span class="text-gray-500 font-normal">(${pending.length})</span></div>
        <div id="visitor-review-pending"></div>
      </div>

      <div class="pt-3 border-t border-gray-100">
        <div class="text-xs font-bold text-gray-600 mb-2">已复盘 <span class="text-gray-500 font-normal">(${completed.length})</span></div>
        <div id="visitor-review-completed"></div>
      </div>
    </div>
  `;

  // 统一检索引擎（第一列是活动的列表：关键词 名称/地点 + 分面 月份/类别/类型/状态；≤8 行自动不渲染检索条）
  const _rvKeyword = activityKeyword();
  const _rvFacets = activityFacets();
  const pendingHost = container.querySelector('#visitor-review-pending');
  const completedHost = container.querySelector('#visitor-review-completed');
  if (pendingHost) {
    renderFilteredList(pendingHost, {
      stateKey: 'visitor-review-pending',
      rows: pending.map(it => ({ ...it.act, rev: it.rev })),
      keyword: _rvKeyword,
      facets: _rvFacets,
      countUnit: '条',
      listClass: 'space-y-2',
      emptyMessage: '— 暂无待复盘活动 · 下一步：活动结束后在此提交复盘',
      rowHtml: (r) => renderActivityCard({ act: r, rev: r.rev }, 'pending'),
    });
  }
  if (completedHost) {
    renderFilteredList(completedHost, {
      stateKey: 'visitor-review-completed',
      rows: completed.map(it => ({ ...it.act, rev: it.rev })),
      keyword: _rvKeyword,
      facets: _rvFacets,
      countUnit: '条',
      listClass: 'space-y-2',
      emptyMessage: '— 暂无已复盘活动 · 下一步：提交复盘后在此回看',
      rowHtml: (r) => renderActivityCard({ act: r, rev: r.rev }, 'completed'),
    });
  }

  // 绑定活动卡片点击展开/收起（保态折叠 2026-09-06：直接切 .visitor-review-body 的 hidden，
  // 不整页重建——展开中填写的复盘总结在收起/切换时保留；仅提交复盘成功后走 renderContent 重置）
  // 事件委托：引擎筛选会重渲染行，故把监听挂在各列表宿主上（宿主随整页 innerHTML 重建，无监听堆积）
  [pendingHost, completedHost].filter(Boolean).forEach(host => {
    host.addEventListener('click', (e) => {
      // 复盘提交（落库链路 = services/governance/review.js::submitActivityReviewForm 单一源）
      const submitBtn = e.target.closest('.btn-review-submit');
      if (submitBtn) {
        const actId = submitBtn.dataset.actId;
        const textarea = container.querySelector(`#review-textarea-${actId}`);
        const content = textarea?.value?.trim();
        if (!content) {
          showToast('error', '请填写复盘总结');
          return;
        }
        const issuesEl = container.querySelector(`#review-issues-${actId}`);
        const issues = (issuesEl?.value || '').split('\n').map(s => s.trim()).filter(Boolean);

        const res = submitActivityReviewForm({ activityId: actId, content, issues, actorId: currentUserId });
        if (!res.ok) { showToast('error', res.error); return; }

        _reviewExpandedId = null;
        showToast('success', '复盘总结已提交，等待纪检委员确认');
        renderContent(ctx, host);
        return;
      }

    });
    host.addEventListener('toggle', (e) => {
      const item = e.target;
      if (!item?.matches?.('details.visitor-review-item')) return;
      if (item.open) {
        _reviewExpandedId = item.dataset.actId;
        host.querySelectorAll('details.visitor-review-item[open]').forEach((other) => {
          if (other !== item) other.open = false;
        });
        const body = item.querySelector('.visitor-review-body');
        // 触点即落点（全局 UX 反思批次 2026-09-13）：行内展开后若超出视口（复盘表单可达 265px+），
        // 补一次滚动让展开区可见（原先展开后底部内容跑到视口外，需手动下滚）
        if (body) scrollDetailIntoView(body, { block: 'nearest' });
      } else if (_reviewExpandedId === item.dataset.actId) {
        _reviewExpandedId = null;
      }
    }, true);
  });

  // 材料页深链：本场活动的复盘卡片滚到视野（找不到则静默）。
  focusActivityAnchor(container, ctx?.focusActivityId);
}

/** 渲染复盘详情（已复盘活动展开时） */
function _renderReviewDetail(rev) {
  const issues = Array.isArray(rev.issues) ? rev.issues : [];
  return `
    <div class="mt-3 pt-3 border-t border-gray-100">
      <div class="text-xs text-gray-600 p-2 bg-gray-50 rounded-lg border border-gray-100">${rev.reviewContent || ''}</div>
      ${issues.length ? `<div class="mt-2 p-2 rounded-lg border border-amber-200" style="border-left:3px solid var(--status-warning);">
        <div class="flex items-center gap-1.5 text-xs text-amber-700 font-bold mb-1"><span class="w-1.5 h-1.5 rounded-full" style="background:var(--status-warning);"></span>提出的真问题（${issues.length}）</div>
        <ul class="space-y-0.5">${issues.map(i => `<li class="text-xs text-amber-700">· ${i}</li>`).join('')}</ul>
      </div>` : ''}
      ${rev.submittedAt ? `<div class="text-xs text-gray-500 mt-1">提交时间：${rev.submittedAt.slice(0, 16).replace('T', ' ')}</div>` : ''}
      ${rev.annotation ? `
        <div class="mt-2 p-2 rounded-lg border border-blue-200" style="border-left:3px solid var(--color-identity-disc-commissioner);">
          <div class="flex items-center gap-1.5 text-xs font-bold mb-1" style="color:var(--color-identity-disc-commissioner);"><span class="w-1.5 h-1.5 rounded-full" style="background:var(--color-identity-disc-commissioner);"></span>纪检委员批注</div>
          <div class="text-xs text-blue-700">${rev.annotation}</div>
        </div>
      ` : ''}
    </div>
  `;
}
