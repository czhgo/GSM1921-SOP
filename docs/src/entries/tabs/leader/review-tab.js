// role: [工程师]+[AI]
// 组长工作台 Tab：复盘提交（T-279 M2 拆分）
// 党小组组长提交活动复盘总结 → 纪检委员批注/确认。

import { loadActivities } from '../../../services/activity.js?v=20260903c';
import { loadActivityReviews, findActivityReviewIndex, updateActivityReview, addActivityReview } from '../../../services/review.js?v=20260903c';
import { ReviewStatus, REVIEW_STATUS_LABELS } from '../../../core/domain.js?v=20260903c';
import { PersonStore } from '../../../services/person.js?v=20260903c';
// 数据域接线收口（2026-09-03）：支部成员名单经 services/person.js 获取（原直连 mock PEOPLE）
const PEOPLE = PersonStore.getMembers();
import { showToast } from '../../../core/utils.js?v=20260903c';
import { solidAccentStyle } from '../../../core/constants.js?v=20260903c';
import { currentLeaderGroup, getCurrentLeaderId } from './_shared.js?v=20260903c';

// 私有状态（随模块自持，不污染入口）
let _reviewExpandedId = null;

/**
 * 复盘提交 tab：展示本组活动列表，按复盘状态分桶（待复盘/已复盘），
 * 待复盘活动可展开填写复盘总结并提交。
 */
export function renderContent(ctx) {
  const container = document.getElementById('leader-tab-content');
  if (!container) return;

  const { accent, accentBorder } = ctx;

  // 当前组长所属党小组（数据驱动：AuthStore 当前用户 → partyGroup）
  const { group: myGroup } = currentLeaderGroup();
  const currentLeaderId = getCurrentLeaderId();

  // 筛选本组活动（三会一课/主题党日等由本组组长组织的活动；已归档活动退出工作区）
  // T223 排序统一：date 降序（新者在前）
  const myGroupActivities = loadActivities()
    .filter(a => {
      // 按组织者属于本组 或 按 hostGroup 匹配
      const organizer = PEOPLE.find(p => p.id === a.organizer);
      return organizer && organizer.partyGroup === myGroup && a.status !== 'cancelled' && !a.archived;
    })
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  // 获取已有复盘记录
  const reviewMap = {};
  for (const r of loadActivityReviews()) {
    if (r.activityId) reviewMap[r.activityId] = r;
  }

  // 按复盘状态分桶
  const pending = [];   // 待复盘：未提交 / 已打回
  const completed = []; // 已复盘：已上传 / 批注中 / 已确认
  for (const act of myGroupActivities) {
    const rev = reviewMap[act.id];
    if (!rev || rev.reviewStatus === ReviewStatus.NOT_SUBMITTED || rev.reviewStatus === ReviewStatus.REJECTED) {
      pending.push({ act, rev: rev || null });
    } else {
      completed.push({ act, rev });
    }
  }

  // 复盘状态颜色映射
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
    const statusColor = reviewColorMap[rev?.reviewStatus || ReviewStatus.NOT_SUBMITTED] || 'bg-gray-100 text-gray-500';
    const isExpanded = _reviewExpandedId === act.id;

    return `
      <div class="leader-review-item p-3 rounded-xl bg-white hover:bg-gray-50 transition-colors ${rev?.reviewStatus === ReviewStatus.REJECTED ? 'border border-red-100' : ''}" data-act-id="${act.id}">
        <div class="flex items-center justify-between cursor-pointer review-toggle">
          <div class="flex-1 min-w-0">
            <div class="text-sm font-medium text-gray-800">${act.title || '未命名'}</div>
            <div class="text-xs text-gray-500 mt-0.5">${act.date || ''} ${act.type ? '· ' + act.type : ''}</div>
          </div>
          <div class="flex items-center gap-2 ml-4">
            <span class="text-xs px-1.5 py-0.5 rounded-full ${statusColor}">${statusLabel}</span>
            ${rev?.reviewStatus === ReviewStatus.REJECTED ? '<span class="text-xs text-red-500">需修改</span>' : ''}
          </div>
        </div>
        ${isExpanded && isPending ? _renderReviewForm(act, rev, accent, accentBorder) : ''}
        ${isExpanded && !isPending && rev ? _renderReviewDetail(rev) : ''}
      </div>
    `;
  }

  container.innerHTML = `
    <div class="card rounded-xl p-5">
      <div class="flex items-center justify-between mb-4">
        <h3 class="font-title-cn text-base font-semibold text-gray-800">复盘提交</h3>
      </div>
      <div class="text-xs text-gray-500 mb-4">党小组组长提交活动复盘总结 → 纪检委员批注/确认</div>

      <!-- 待复盘 -->
      <div class="mb-4">
        <div class="text-xs font-bold text-gray-600 mb-2">待复盘 <span class="text-gray-400 font-normal">(${pending.length})</span></div>
        <div class="space-y-2" id="leader-review-pending">
          ${pending.length === 0 ? '<p class="text-xs text-gray-400 text-center py-3">暂无待复盘活动</p>' :
            pending.map(item => renderActivityCard(item, 'pending')).join('')}
        </div>
      </div>

      <!-- 已复盘 -->
      <div class="pt-3 border-t border-gray-100">
        <div class="text-xs font-bold text-gray-600 mb-2">已复盘 <span class="text-gray-400 font-normal">(${completed.length})</span></div>
        <div class="space-y-2" id="leader-review-completed">
          ${completed.length === 0 ? '<p class="text-xs text-gray-400 text-center py-3">暂无已复盘活动</p>' :
            completed.map(item => renderActivityCard(item, 'completed')).join('')}
        </div>
      </div>
    </div>
  `;

  // 绑定活动卡片点击展开/收起
  container.querySelectorAll('.review-toggle').forEach(toggle => {
    toggle.addEventListener('click', () => {
      const item = toggle.closest('.leader-review-item');
      const actId = item?.dataset.actId;
      _reviewExpandedId = _reviewExpandedId === actId ? null : actId;
      renderContent(ctx);
    });
  });

  // 绑定复盘表单提交按钮
  container.querySelectorAll('.btn-review-submit').forEach(btn => {
    btn.addEventListener('click', () => {
      const actId = btn.dataset.actId;
      const textarea = container.querySelector(`#review-textarea-${actId}`);
      const content = textarea?.value?.trim();
      if (!content) {
        showToast('error', '请填写复盘总结');
        return;
      }
      // 真问题（每行一条）：书记 KPI「复盘问题」以此计量（书记 2026-08-10 裁定：复盘率 100% 会诱导随意提交，改问题导向）
      const issuesEl = container.querySelector(`#review-issues-${actId}`);
      const issues = (issuesEl?.value || '').split('\n').map(s => s.trim()).filter(Boolean);

      // 在复盘记录中查找或创建
      const existIdx = findActivityReviewIndex(actId);
      if (existIdx >= 0) {
        // 更新已有记录（如已打回重新提交）
        const existing = loadActivityReviews()[existIdx];
        const isResubmit = existing.reviewStatus === ReviewStatus.REJECTED;
        updateActivityReview(actId, {
          reviewContent: content,
          issues,
          reviewStatus: ReviewStatus.UPLOADED,
          submittedAt: new Date().toISOString(),
          ...(isResubmit ? { annotation: '' } : {}),
        });
      } else {
        // 新建复盘记录
        addActivityReview({
          id: 'rev_' + Date.now(),
          activityId: actId,
          organizerId: currentLeaderId,
          progress: '已完成',
          overdue: false,
          reviewStatus: ReviewStatus.UPLOADED,
          reviewContent: content,
          issues,
          submittedAt: new Date().toISOString(),
        });
      }

      _reviewExpandedId = null;
      showToast('success', '复盘总结已提交，等待纪检委员确认');
      renderContent(ctx);
    });
  });
}

/** 渲染复盘表单（待复盘活动展开时） */
function _renderReviewForm(act, rev, accent, accentBorder) {
  const existingContent = rev?.reviewContent || '';
  const existingIssues = Array.isArray(rev?.issues) ? rev.issues : [];
  const isRejected = rev?.reviewStatus === ReviewStatus.REJECTED;
  return `
    <div class="mt-3 pt-3 border-t border-gray-100">
      ${isRejected && rev.annotation ? `
        <div class="mb-2 p-2 rounded-lg bg-red-50 border border-red-100">
          <div class="text-xs text-red-500 font-bold mb-1">纪检委员批注</div>
          <div class="text-xs text-red-700">${rev.annotation}</div>
        </div>
      ` : ''}
      <textarea id="review-textarea-${act.id}" class="input-flat w-full text-xs resize-none" rows="4" placeholder="请填写复盘总结（活动成效、经验教训、改进建议等）">${existingContent}</textarea>
      <div class="mt-2">
        <label class="text-xs text-gray-500 block mb-1">提出的真问题（每行一条，书记 KPI 以此计量）</label>
        <textarea id="review-issues-${act.id}" class="input-flat w-full text-xs resize-none" rows="2" placeholder="如：讨论时间不足，需预留更多…">${existingIssues.join('\n')}</textarea>
      </div>
      <div class="flex items-center gap-2 mt-2">
        <button class="btn-review-submit text-xs px-3 py-1.5 rounded-lg text-white transition-colors hover:opacity-90" data-act-id="${act.id}" style="${solidAccentStyle(accent, accentBorder)};cursor:pointer;">提交复盘</button>
        <span class="text-xs text-gray-400">提交后纪检委员将在监督复盘tab收到通知</span>
      </div>
    </div>
  `;
}

/** 渲染复盘详情（已复盘活动展开时） */
function _renderReviewDetail(rev) {
  const issues = Array.isArray(rev.issues) ? rev.issues : [];
  return `
    <div class="mt-3 pt-3 border-t border-gray-100">
      <div class="text-xs text-gray-600 p-2 bg-gray-50 rounded-lg border border-gray-100">${rev.reviewContent || ''}</div>
      ${issues.length ? `<div class="mt-2 p-2 rounded-lg border border-amber-100 bg-amber-50">
        <div class="text-[11px] text-amber-700 font-bold mb-1">提出的真问题（${issues.length}）</div>
        <ul class="space-y-0.5">${issues.map(i => `<li class="text-xs text-amber-800">· ${i}</li>`).join('')}</ul>
      </div>` : ''}
      ${rev.submittedAt ? `<div class="text-xs text-gray-400 mt-1">提交时间：${rev.submittedAt.slice(0, 16).replace('T', ' ')}</div>` : ''}
      ${rev.annotation ? `
        <div class="mt-2 p-2 rounded-lg bg-blue-50 border border-blue-100">
          <div class="text-xs text-blue-500 font-bold mb-1">纪检委员批注</div>
          <div class="text-xs text-blue-700">${rev.annotation}</div>
        </div>
      ` : ''}
    </div>
  `;
}
