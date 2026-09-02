// role: [工程师]+[AI]
// 纪检委员工作台 Tab：活动监督复盘（T-279 M3 拆分）
// 活动流程监督（超时提醒）+ 活动复盘监督（批注/打回/确认）+ 经验沉淀督促清单。

import { mockDB, ReviewStatus } from '../../../core/domain.js?v=20260901h';
import { persist } from '../../../core/data-adapter.js?v=20260901h';
import { reviewToDisplay } from '../../../mock/index.js?v=20260901h';
import { loadActiveActivityReviews, loadTaskforceReviews, updateReviewById } from '../../../services/review.js?v=20260901h';
import { showToast } from '../../../core/utils.js?v=20260901h';
import { openFormModal } from '../../../components/modal.js?v=20260901h';
import { DISC_COMMISSIONER_ID } from './_shared.js?v=20260901h';

// ── 经验沉淀数据层（mockDB） ────────────────────────────
function _loadDeposits() {
  return mockDB.experienceDeposits.length > 0 ? [...mockDB.experienceDeposits] : [];
}

function _saveDeposits(deposits) {
  mockDB.experienceDeposits = [...deposits];
  persist();
}

export function renderContent(ctx) {
  const container = document.getElementById('disc-tab-content');
  if (!container) return;

  const progressColor = { '已完成':'bg-green-100 text-green-700', '超时':'bg-red-100 text-red-700', '进行中':'bg-blue-100 text-blue-700' };
  const reviewColor = { '已上传':'bg-orange-100 text-orange-700', '未提交':'bg-red-100 text-red-700', '—':'bg-gray-100 text-gray-500' };
  const reviewData = reviewToDisplay(loadActiveActivityReviews(), loadTaskforceReviews());

  // 经验沉淀交叉引用：判断已完成复盘的活动是否已有沉淀
  const deposits = _loadDeposits();
  const depositedSources = new Set(deposits.map(d => d.sourceName));
  function hasDeposit(reviewItem) {
    const name = reviewItem.sourceName || reviewItem.activity;
    return depositedSources.has(name);
  }

  // 经验沉淀督促清单：已确认复盘但未沉淀的活动
  const unDepositedReviews = reviewData.filter(r => r.reviewStatus === '已确认' && !hasDeposit(r));

  container.innerHTML = `
    <div class="space-y-4">
      <div class="card rounded-xl p-5">
        <h3 class="font-title-cn text-base font-semibold text-gray-800 mb-3">活动流程监督</h3>
        <div class="text-xs text-gray-500 mb-3">阅览党小组活动/专班工作时间流 · 超时确认后邮件提醒</div>
        <div class="space-y-2">
          ${reviewData.map(r => `
            <div class="flex items-center justify-between p-3 rounded-xl bg-white ${r.overdue ? 'border border-red-100' : ''}">
              <div class="flex-1 min-w-0">
                <div class="text-sm font-medium text-gray-800">${r.activity}</div>
                <div class="text-xs text-gray-500 mt-0.5">组织者：${r.organizer}</div>
              </div>
              <div class="flex items-center gap-2 ml-4">
                <span class="text-xs px-1.5 py-0.5 rounded-full ${progressColor[r.progress] || 'bg-gray-100 text-gray-500'}">${r.progress}</span>
                ${r.overdue ? `<button class="btn-action btn-action-red btn-disc-remind" data-review-id="${r.id}">邮件提醒</button>` : ''}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
      <div class="card rounded-xl p-5">
        <h3 class="font-title-cn text-base font-semibold text-gray-800 mb-3">活动复盘监督</h3>
        <div class="text-xs text-gray-500 mb-3">复盘状态流转：已上传 → 批注中 → 确认/打回</div>
        <div class="space-y-2">
          ${reviewData.filter(r => r.reviewStatus !== '—').map(r => `
            <div class="p-3 rounded-xl bg-white">
              <div class="flex items-center justify-between mb-2">
                <div class="text-sm font-medium text-gray-800">${r.activity}</div>
                <div class="flex items-center gap-2">
                  <span class="text-xs px-1.5 py-0.5 rounded-full ${reviewColor[r.reviewStatus] || 'bg-gray-100 text-gray-500'}">${r.reviewStatus}</span>
                  ${r.reviewStatus === '已确认' ? `<span class="text-xs px-1.5 py-0.5 rounded-full ${hasDeposit(r) ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}">${hasDeposit(r) ? '已沉淀' : '未沉淀'}</span>` : ''}
                </div>
              </div>
              ${r.reviewContent ? `<div class="text-xs text-gray-600 mb-2 p-2 bg-white rounded-lg border border-gray-100">${r.reviewContent}</div>` : ''}
              ${(r.issues && r.issues.length) ? `<div class="mb-2 p-2 rounded-lg border border-amber-100 bg-amber-50">
                <div class="text-[11px] text-amber-700 font-bold mb-0.5">提出的真问题（${r.issues.length}）</div>
                <ul class="space-y-0.5">${r.issues.map(i => `<li class="text-xs text-amber-800">· ${i}</li>`).join('')}</ul>
              </div>` : ''}
              <div class="flex gap-2">
                ${r.reviewStatus === '已上传' ? `
                  <button class="btn-action btn-action-orange btn-disc-annotate" data-review-id="${r.id}">批注</button>
                  <button class="btn-action btn-action-red btn-disc-reject" data-review-id="${r.id}">打回</button>
                  <button class="btn-action btn-action-green btn-disc-confirm" data-review-id="${r.id}">确认</button>
                ` : ''}
                ${r.reviewStatus === '未提交' ? `
                  <button class="btn-action btn-action-red btn-disc-remind-review" data-review-id="${r.id}">邮件提醒</button>
                ` : ''}
                ${r.reviewStatus === '已确认' && !hasDeposit(r) ? `
                  <button class="btn-action btn-action-amber btn-disc-urge-deposit" data-review-id="${r.id}" data-activity-name="${r.sourceName || r.activity}" data-organizer="${r.organizer}">督促沉淀</button>
                ` : ''}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
      ${unDepositedReviews.length > 0 ? `
      <div class="card rounded-xl p-5">
        <h3 class="font-title-cn text-base font-semibold text-gray-800 mb-3">经验沉淀督促清单</h3>
        <div class="text-xs text-gray-500 mb-3">以下活动复盘已确认但尚未沉淀经验，请督促深度参与者提交</div>
        <div class="space-y-2">
          ${unDepositedReviews.map(r => `
            <div class="flex items-center justify-between p-3 rounded-xl bg-white">
              <div class="flex-1 min-w-0">
                <div class="text-sm font-medium text-gray-800">${r.activity}</div>
                <div class="text-xs text-gray-500 mt-0.5">组织者：${r.organizer}</div>
              </div>
              <button class="text-xs px-3 py-1.5 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 btn-disc-urge-deposit" style="cursor:pointer;" data-activity-name="${r.sourceName || r.activity}" data-organizer="${r.organizer}">督促沉淀</button>
            </div>
          `).join('')}
        </div>
      </div>
      ` : ''}
    </div>
  `;

  // ── 复盘真操作（2026-08-05 修复：批注/打回/确认/邮件提醒均落库，不再只弹 toast） ──
  container.querySelectorAll('.btn-disc-remind').forEach(btn => btn.addEventListener('click', () => {
    const id = btn.dataset.reviewId;
    if (id) updateReviewById(id, { remindedAt: new Date().toISOString(), reminderType: 'overdue' });
    showToast('success', '超时邮件提醒已发送');
  }));
  container.querySelectorAll('.btn-disc-annotate').forEach(btn => btn.addEventListener('click', () => {
    const reviewId = btn.dataset.reviewId;
    openFormModal({
      id: 'annotation',
      title: '添加批注',
      fields: [
        { key: 'type', label: '批注类型', type: 'select', required: true, options: [
          { value: 'suggestion', label: '建议' },
          { value: 'question', label: '疑问' },
          { value: 'correction', label: '纠正' },
          { value: 'praise', label: '肯定' }
        ]},
        { key: 'content', label: '批注内容', type: 'textarea', required: true, placeholder: '请输入批注内容...' }
      ],
      onSubmit: (values) => {
        const updated = updateReviewById(reviewId, {
          reviewStatus: ReviewStatus.ANNOTATING,
          annotation: values.content,
          annotationType: values.type,
          annotatedBy: DISC_COMMISSIONER_ID,
          annotatedAt: new Date().toISOString(),
        });
        if (!updated) { showToast('error', '复盘记录不存在'); return; }
        showToast('success', '批注已添加，复盘状态更新为批注中');
        renderContent(ctx);
      },
      accentColor: ctx.accent || 'var(--accent-disc-commissioner)'
    });
  }));
  container.querySelectorAll('.btn-disc-reject').forEach(btn => btn.addEventListener('click', () => {
    const id = btn.dataset.reviewId;
    const updated = updateReviewById(id, {
      reviewStatus: ReviewStatus.REJECTED,
      annotatedBy: DISC_COMMISSIONER_ID,
      annotatedAt: new Date().toISOString(),
    });
    if (!updated) { showToast('error', '复盘记录不存在'); return; }
    showToast('success', '复盘已打回，要求重新提交');
    renderContent(ctx);
  }));
  container.querySelectorAll('.btn-disc-confirm').forEach(btn => btn.addEventListener('click', () => {
    const id = btn.dataset.reviewId;
    const updated = updateReviewById(id, {
      reviewStatus: ReviewStatus.CONFIRMED,
      confirmedAt: new Date().toISOString(),
    });
    if (!updated) { showToast('error', '复盘记录不存在'); return; }
    showToast('success', '复盘总结已确认，录入后台，活动结束');
    renderContent(ctx);
  }));
  container.querySelectorAll('.btn-disc-remind-review').forEach(btn => btn.addEventListener('click', () => {
    const id = btn.dataset.reviewId;
    if (id) updateReviewById(id, { remindedAt: new Date().toISOString(), reminderType: 'resubmit' });
    showToast('success', '复盘超期邮件提醒已发送至组织者');
  }));
  // 督促沉淀按钮（B 档 CRUD 补全：督促 → 直接在本界面记录经验沉淀，落库同源）
  container.querySelectorAll('.btn-disc-urge-deposit').forEach(btn => btn.addEventListener('click', () => {
    const reviewId = btn.dataset.reviewId;
    const activityName = btn.dataset.activityName || btn.dataset.organizer || '该活动';
    openFormModal({
      id: 'deposit',
      title: '记录经验沉淀',
      fields: [
        { key: 'title', label: '沉淀主题', type: 'input', required: true, placeholder: `如：${activityName}的组织经验` },
        { key: 'content', label: '经验内容', type: 'textarea', required: true, placeholder: '做了什么、怎么做的、为什么这样做（可操作、有边界）' },
        { key: 'scenario', label: '适用场景', type: 'input', required: false, placeholder: '什么情况下可用这条经验（选填）' },
        { key: 'counter', label: '常见误区/反例', type: 'textarea', required: false, placeholder: '不这样做会怎样 / 什么情况下不适用（选填）' },
      ],
      onSubmit: (values) => {
        const deposits = _loadDeposits();
        deposits.push({
          id: 'exp_' + Date.now(),
          sourceName: activityName,
          sourceType: 'activity',
          reviewId: reviewId || null,
          title: values.title,
          content: values.content,
          scenario: values.scenario || '',
          counter: values.counter || '',
          submittedBy: DISC_COMMISSIONER_ID,
          createdAt: new Date().toISOString(),
        });
        _saveDeposits(deposits);
        if (reviewId) updateReviewById(reviewId, { remindedAt: new Date().toISOString(), reminderType: 'deposit', depositedAt: new Date().toISOString() });
        showToast('success', '经验沉淀已记录');
        renderContent(ctx);
      },
      accentColor: ctx.accent || 'var(--accent-disc-commissioner)'
    });
  }));
}
