// role: [工程师]+[AI]
// 参与者工作台 Tab：我的复盘（T-304 C1 组织者承载面）
// SOP 复盘提交归「组织者」——组织者可能是党小组组长，也可能是被赋权的普通成员。
// 本 tab 让担任组织者/深度参与者的成员在自己的工作台即可提交复盘，复盘提交人 = 当前用户（组织者）。

import { loadActivities } from '../../../services/activity.js?v=20260914o';
// 复盘表单（字段/校验/提交链路）唯一实现 = services/review.js（2026-09-10 A③）：
// 成员端本 tab 与支书「代提交复盘」共用同一套字段与落库链路，勿在此另写表单。
import { loadActivityReviews, renderActivityReviewFormHtml, submitActivityReviewForm } from '../../../services/review.js?v=20260914o';
import { ReviewStatus, REVIEW_STATUS_LABELS } from '../../../core/domain.js?v=20260914o';
import { liveMembers, PersonStore } from '../../../services/person.js?v=20260914o';
// 数据域接线收口（2026-09-03）：支部成员名单经 services/person.js 获取（原直连 mock PEOPLE）
// 实时视图（非快照）：成员增删即时可见——见 services/person.js liveMembers 说明
const PEOPLE = liveMembers();
import { AuthStore } from '../../../services/auth.js?v=20260914o';
import { showToast } from '../../../core/utils.js?v=20260914o';
import { scrollDetailIntoView } from '../../../components/detail-anchor.js?v=20260914o';
// 统一检索引擎（支书 2026-09-13 裁定）：第一列是活动的表格一律接入（关键词 + 分面；≤8 行自动不渲染检索条）
import { renderFilteredList, activityKeyword, activityFacets } from '../../../components/list-filter.js?v=20260914o';
// 活动「仍在办」口径单一源（2026-09-13 收敛）：替代手写 status!=='cancelled' && !archived
import { isActivityLive } from '../../../core/constants.js?v=20260914o';

// 私有状态（随模块自持，不污染入口）
let _reviewExpandedId = null;

/**
 * 我的复盘 tab：展示当前用户担任组织者/深度参与者的活动，
 * 待复盘活动可展开填写复盘总结并提交 → 纪检委员批注/确认。
 */
export function renderContent(ctx) {
  const container = document.getElementById('visitor-tab-content');
  if (!container) return;

  const { accent, accentBorder } = ctx;
  const currentUserId = AuthStore.getCurrentUser()?.personId || '';
  const authRecords = ctx.authRecords || [];

  // 我参与的活动（组织者/深度参与者）：assignments + authRecords 双源合并
  const myIds = new Set();
  for (const a of loadActivities()) {
    if (Array.isArray(a.assignments)) {
      a.assignments.forEach(x => { if (x.personId === currentUserId && ['organizer', 'deep'].includes(x.role)) myIds.add(a.id); });
    }
  }
  for (const r of authRecords) {
    if (r.targetPersonId === currentUserId && ['organizer', 'deep'].includes(r.role)) myIds.add(r.scopeRef);
  }

  const myActivities = loadActivities()
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
    const orgName = act.organizer ? (PEOPLE.find(p => p.id === act.organizer)?.name || act.organizer) : '—';
    // 展开区（复盘填写表单 / 复盘详情）常驻 DOM，展开态由 hidden 控制（保态折叠 2026-09-06）：
    // 收合/切换只切 hidden，不整页重建，正在填写的复盘总结不因展开/收起丢失
    const bodyContent = isPending
      ? renderActivityReviewFormHtml(act, rev, { accent, accentBorder })
      : (rev ? _renderReviewDetail(rev) : '');
    const bodyHtml = bodyContent
      ? `<div class="visitor-review-body ${isExpanded ? '' : 'hidden'}">${bodyContent}</div>`
      : '';

    return `
      <div class="visitor-review-item p-3 rounded-xl bg-white hover:bg-gray-50 transition-colors ${rev?.reviewStatus === ReviewStatus.REJECTED ? 'border border-red-100' : ''}" data-act-id="${act.id}">
        <div class="flex items-center justify-between cursor-pointer review-toggle">
          <div class="flex-1 min-w-0">
            <div class="text-sm font-medium text-gray-800">${act.title || '未命名'}</div>
            <div class="text-xs text-gray-500 mt-0.5">${act.date || ''} ${act.type ? '· ' + act.type : ''} · 组织者 ${orgName}</div>
          </div>
          <div class="flex items-center gap-2 ml-4">
            <span class="text-xs px-1.5 py-0.5 rounded-full ${statusColor}">${statusLabel}</span>
            ${rev?.reviewStatus === ReviewStatus.REJECTED ? '<span class="text-xs text-red-600">需修改</span>' : ''}
          </div>
        </div>
        ${bodyHtml}
      </div>
    `;
  }

  container.innerHTML = `
    <div class="card rounded-xl p-5">
      <div class="flex items-center justify-between mb-4">
        <h3 class="font-title-cn text-base font-semibold text-gray-800">我的复盘</h3>
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
      emptyMessage: '暂无待复盘活动',
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
      emptyMessage: '暂无已复盘活动',
      rowHtml: (r) => renderActivityCard({ act: r, rev: r.rev }, 'completed'),
    });
  }

  // 绑定活动卡片点击展开/收起（保态折叠 2026-09-06：直接切 .visitor-review-body 的 hidden，
  // 不整页重建——展开中填写的复盘总结在收起/切换时保留；仅提交复盘成功后走 renderContent 重置）
  // 事件委托：引擎筛选会重渲染行，故把监听挂在各列表宿主上（宿主随整页 innerHTML 重建，无监听堆积）
  [pendingHost, completedHost].filter(Boolean).forEach(host => {
    host.addEventListener('click', (e) => {
      // 复盘提交（落库链路 = services/review.js::submitActivityReviewForm 单一源）
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
        renderContent(ctx);
        return;
      }

      const toggle = e.target.closest('.review-toggle');
      if (!toggle) return;
      const item = toggle.closest('.visitor-review-item');
      const actId = item?.dataset.actId;
      const prevId = _reviewExpandedId;
      // 先收起其它展开卡（单选语义）
      container.querySelectorAll('.visitor-review-item').forEach(other => {
        if (other.dataset.actId !== actId) {
          const b = other.querySelector('.visitor-review-body');
          if (b) b.classList.add('hidden');
        }
      });
      if (prevId === actId) { // 点击当前展开卡 → 收起
        const body = item?.querySelector('.visitor-review-body');
        if (body) body.classList.add('hidden');
        _reviewExpandedId = null;
        return;
      }
      _reviewExpandedId = actId;
      const body = item?.querySelector('.visitor-review-body');
      if (body) {
        body.classList.remove('hidden');
        // 触点即落点（全局 UX 反思批次 2026-09-13）：行内展开后若超出视口（复盘表单可达 265px+），
        // 补一次滚动让展开区可见（原先展开后底部内容跑到视口外，需手动下滚）
        scrollDetailIntoView(body, { block: 'nearest' });
      }
    });
  });
}

/** 渲染复盘详情（已复盘活动展开时） */
function _renderReviewDetail(rev) {
  const issues = Array.isArray(rev.issues) ? rev.issues : [];
  return `
    <div class="mt-3 pt-3 border-t border-gray-100">
      <div class="text-xs text-gray-600 p-2 bg-gray-50 rounded-lg border border-gray-100">${rev.reviewContent || ''}</div>
      ${issues.length ? `<div class="mt-2 p-2 rounded-lg border border-amber-200" style="border-left:3px solid #F59E0B;">
        <div class="flex items-center gap-1.5 text-[11px] text-amber-700 font-bold mb-1"><span class="w-1.5 h-1.5 rounded-full" style="background:#F59E0B;"></span>提出的真问题（${issues.length}）</div>
        <ul class="space-y-0.5">${issues.map(i => `<li class="text-xs text-amber-800" style="--acc-text-dark:#FBBF24;">· ${i}</li>`).join('')}</ul>
      </div>` : ''}
      ${rev.submittedAt ? `<div class="text-xs text-gray-500 mt-1">提交时间：${rev.submittedAt.slice(0, 16).replace('T', ' ')}</div>` : ''}
      ${rev.annotation ? `
        <div class="mt-2 p-2 rounded-lg border border-blue-200" style="border-left:3px solid #3B82F6;">
          <div class="flex items-center gap-1.5 text-xs text-blue-600 font-bold mb-1"><span class="w-1.5 h-1.5 rounded-full" style="background:#3B82F6;"></span>纪检委员批注</div>
          <div class="text-xs text-blue-700">${rev.annotation}</div>
        </div>
      ` : ''}
    </div>
  `;
}
