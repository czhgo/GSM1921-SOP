// role: [工程师]+[AI]
// 组长工作台 Tab：本组活动复盘状态（T-279 M2 拆分 · IA-C2 收敛 2026-09-06）
// C2 裁定：复盘统一提交入口 = 活动组织者/深度参与者（成员端「我的复盘」visitor/review-tab）；
// 本页改为本组活动复盘状态只读列表（待复盘/已复盘 + 徽标），页内不提供提交表单（登记 2026-09-06）。

import { loadActivities } from '../../../services/activity.js?v=20260903c';
import { loadActivityReviews } from '../../../services/review.js?v=20260903c';
import { ReviewStatus, REVIEW_STATUS_LABELS } from '../../../core/domain.js?v=20260903c';
import { PersonStore } from '../../../services/person.js?v=20260903c';
// 数据域接线收口（2026-09-03）：支部成员名单经 services/person.js 获取（原直连 mock PEOPLE）
const PEOPLE = PersonStore.getMembers();
import { currentLeaderGroup } from './_shared.js?v=20260903c';

// 私有状态（随模块自持，不污染入口）
let _reviewExpandedId = null;

/**
 * 本组活动复盘状态（只读）：
 *  - 待复盘：本组活动尚未提交复盘 / 已打回——行内提示「复盘由活动组织者/深度参与者提交」，无填写表单；
 *  - 已复盘：可展开查看复盘内容 / 纪检批注（只读）。
 * K2 登记：组长若同时是组织者 → 其复盘提交入口 = 成员端「我的复盘」（visitor/review-tab，勿改其规则）；
 *  mock 种子中组长组织活动均带 assignments organizer 赋权行（如 act-4/9/16/17/21/23/26/29），
 *  故其活动会出现在该组长「我的复盘」；运行时新建活动如缺 organizer 赋权行则需赋权补齐后才会出现。
 */
export function renderContent(ctx) {
  const container = document.getElementById('leader-tab-content');
  if (!container) return;

  // 当前组长所属党小组（数据驱动：AuthStore 当前用户 → partyGroup）
  const { group: myGroup } = currentLeaderGroup();

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

  /** 待复盘行（只读，行内提示提交人规则，无展开表单） */
  function renderPendingCard(item) {
    const { act, rev } = item;
    const statusLabel = rev ? REVIEW_STATUS_LABELS[rev.reviewStatus] : '未提交';
    const statusColor = reviewColorMap[rev?.reviewStatus || ReviewStatus.NOT_SUBMITTED] || 'bg-gray-100 text-gray-500';
    return `
      <div class="leader-review-item p-3 rounded-xl bg-white ${rev?.reviewStatus === ReviewStatus.REJECTED ? 'border border-red-100' : 'border border-gray-50'}">
        <div class="flex items-center justify-between">
          <div class="flex-1 min-w-0">
            <div class="text-sm font-medium text-gray-800">${act.title || '未命名'}</div>
            <div class="text-xs text-gray-500 mt-0.5">${act.date || ''} ${act.type ? '· ' + act.type : ''}</div>
            <div class="text-[11px] text-gray-400 mt-1">复盘由活动组织者 / 深度参与者提交</div>
          </div>
          <div class="flex items-center gap-2 ml-4">
            <span class="text-xs px-1.5 py-0.5 rounded-full ${statusColor}">${statusLabel}</span>
            ${rev?.reviewStatus === ReviewStatus.REJECTED ? '<span class="text-xs text-red-500">需修改</span>' : ''}
          </div>
        </div>
      </div>`;
  }

  /** 已复盘行（只读；可展开查看复盘详情/批注） */
  function renderCompletedCard(item) {
    const { act, rev } = item;
    const statusLabel = REVIEW_STATUS_LABELS[rev?.reviewStatus];
    const statusColor = reviewColorMap[rev?.reviewStatus] || 'bg-gray-100 text-gray-500';
    const isExpanded = _reviewExpandedId === act.id;
    return `
      <div class="leader-review-item p-3 rounded-xl bg-white hover:bg-gray-50 transition-colors cursor-pointer review-toggle" data-act-id="${act.id}">
        <div class="flex items-center justify-between">
          <div class="flex-1 min-w-0">
            <div class="text-sm font-medium text-gray-800">${act.title || '未命名'}</div>
            <div class="text-xs text-gray-500 mt-0.5">${act.date || ''} ${act.type ? '· ' + act.type : ''}</div>
          </div>
          <div class="flex items-center gap-2 ml-4">
            <span class="text-xs px-1.5 py-0.5 rounded-full ${statusColor}">${statusLabel}</span>
          </div>
        </div>
        ${isExpanded && rev ? _renderReviewDetail(rev) : ''}
      </div>`;
  }

  container.innerHTML = `
    <div class="card rounded-xl p-5">
      <div class="flex items-center justify-between mb-4">
        <h3 class="font-title-cn text-base font-semibold text-gray-800">本组活动复盘状态</h3>
      </div>
      <div class="text-xs text-gray-500 mb-4">复盘由活动组织者 / 深度参与者提交（成员端「我的复盘」）；本页仅展示本组活动复盘状态，不提供提交。</div>

      <!-- 待复盘 -->
      <div class="mb-4">
        <div class="text-xs font-bold text-gray-600 mb-2">待复盘 <span class="text-gray-400 font-normal">(${pending.length})</span></div>
        <div class="space-y-2" id="leader-review-pending">
          ${pending.length === 0 ? '<p class="text-xs text-gray-400 text-center py-3">暂无待复盘活动</p>' :
            pending.map(item => renderPendingCard(item)).join('')}
        </div>
      </div>

      <!-- 已复盘 -->
      <div class="pt-3 border-t border-gray-100">
        <div class="text-xs font-bold text-gray-600 mb-2">已复盘 <span class="text-gray-400 font-normal">(${completed.length})</span></div>
        <div class="space-y-2" id="leader-review-completed">
          ${completed.length === 0 ? '<p class="text-xs text-gray-400 text-center py-3">暂无已复盘活动</p>' :
            completed.map(item => renderCompletedCard(item)).join('')}
        </div>
      </div>
    </div>
  `;

  // 已复盘卡片点击展开/收起详情（只读；待复盘行无交互）
  container.querySelectorAll('.review-toggle').forEach(toggle => {
    toggle.addEventListener('click', () => {
      const item = toggle.closest('.leader-review-item');
      const actId = item?.dataset.actId;
      _reviewExpandedId = _reviewExpandedId === actId ? null : actId;
      renderContent(ctx);
    });
  });
}

/** 渲染复盘详情（已复盘活动展开时 · 只读） */
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
