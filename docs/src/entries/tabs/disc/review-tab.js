// role: [工程师]+[AI]
// 纪检委员工作台 Tab：活动监督复盘（T-279 M3 拆分）
// 活动流程监督（超时提醒）+ 活动复盘监督（批注/打回/确认）+ 经验沉淀督促清单。

import { mockDB, ReviewStatus } from '../../../core/domain.js?v=20260922d';
import { persist } from '../../../core/data-adapter.js?v=20260922d';
import { reviewToDisplay } from '../../../services/review.js?v=20260922d';
import { loadActiveActivityReviews, loadTaskforceReviews, updateReviewById } from '../../../services/review.js?v=20260922d';
import { loadActivities } from '../../../services/activity.js?v=20260922d';
import { showToast } from '../../../core/utils.js?v=20260922d';
import { openFormModal } from '../../../components/modal.js?v=20260922d';
import { NoticeStore } from '../../../services/notice.js?v=20260922d';
import { generateId } from '../../../core/id.js?v=20260922d';
import { getPersonById } from '../../../services/person.js?v=20260922d';
import { DISC_COMMISSIONER_ID } from './_shared.js?v=20260922d';
// 统一检索引擎（支书 2026-09-13 裁定）：第一列是活动的表格一律接入（关键词 + 分面；≤8 行自动不渲染检索条）
import { renderFilteredList, activityKeyword, activityFacets } from '../../../components/list-filter.js?v=20260922d';

// ── 超期提醒真实触达（2026-09-10）───────────────────────────────
// 依据：纪检委员工作流程指南 §3.1「超时确认后可触发邮件提醒」、党小组组长工作手册
//   「超期未提交考勤/考察/复盘时，纪检委员会通过邮件提醒你」。
// 既有链路 = NoticeStore（站内信优先，辅以邮件；actionable → 通知待办派生）；
//   remindedAt 留痕与既有按钮态保持原样（本函数只补通知，不改状态机）。
// 受众定位：复盘记录人 = organizerId → 其成员角色（组长 leader / 组织者 participant 等）；
//   普通参与者（participant）待办聚合键 = visitor（与 VisitorTodoDeriver 一致）。
function _notifyReviewOrganizer(item, kind) {
  const person = getPersonById(item.organizerId);
  const role = person?.role || 'leader';
  const todoRole = role === 'participant' ? 'visitor' : role;
  try {
    // R-22（2026-09-13）：系统派生通知改由服务端生成（kind 注册表复算授权 + 文案）；
    // 活动复盘 → activity 模块；专班复盘 → workspace（避免 party 模块对正式党员的普通通知过滤）。
    // 落点：活动复盘绑定来源活动 activityId（服务端按 sourceId 派生 targetType/targetId）；
    // 专班复盘记录无 taskforceId，保留 targetModule 角色自适应兜底。
    NoticeStore.addSystem(kind, item.id, {
      activity: item.activity,
      targetModule: item.sourceType === 'taskforce' ? 'workspace' : 'activity',
      targetType: item.activityId ? 'activity' : null,
      targetId: item.activityId || null,
      actionRoles: [todoRole],
    });
  } catch (e) { console.warn('[disc-review] 提醒通知失败（不影响留痕）：', e); }
}

// ── 批量确认状态（2026-09-06 纪检批量评议确认）───────────────
// 模块级状态：内部重渲染（renderContent）后仍保留「批量模式开关 + 勾选集合」。
let _batchModeOn = false;           // 批量模式是否开启
const _batchCheckedIds = new Set(); // 已勾选的复盘记录 id（仅「已上传」可勾）

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
  const reviewColor = { '已上传':'bg-orange-100 text-orange-700', '未提交':'bg-red-100 text-red-700', '—':'bg-gray-100 text-gray-600' };
  const reviewData = reviewToDisplay(loadActiveActivityReviews(), loadTaskforceReviews());

  // 批量勾选去重（2026-09-06）：仅在批量模式下生效——行被单行确认/打回或消失后，
  // 已非「已上传」可确认态，自动移出勾选集合，避免批量确认误写已完结行。
  if (_batchModeOn) {
    const confirmableIds = new Set(reviewData.filter(r => r.reviewStatus === ReviewStatus.UPLOADED).map(r => r.id));
    [..._batchCheckedIds].forEach(id => { if (!confirmableIds.has(id)) _batchCheckedIds.delete(id); });
  }

  // 经验沉淀交叉引用：判断已完成复盘的活动是否已有沉淀
  const deposits = _loadDeposits();
  const depositedSources = new Set(deposits.map(d => d.sourceName));
  function hasDeposit(reviewItem) {
    const name = reviewItem.sourceName || reviewItem.activity;
    return depositedSources.has(name);
  }

  // 经验沉淀督促清单：已确认复盘但未沉淀的活动
  const unDepositedReviews = reviewData.filter(r => r.reviewStatus === '已确认' && !hasDeposit(r));

  // ── 统一检索引擎行数据（第一列是活动）：按 activityId 补齐活动字段，供关键词/分面取用 ──
  const _actById = new Map(loadActivities().map(a => [a.id, a]));
  const _withAct = (r) => {
    const a = r.activityId ? _actById.get(r.activityId) : null;
    return { ...r, title: r.activity, date: a?.date || '', type: a?.type || '', status: a?.status, archived: a?.archived };
  };
  const flowRows = reviewData.map(_withAct);
  const itemRows = reviewData.filter(r => r.reviewStatus !== '—').map(_withAct);
  const depositRows = unDepositedReviews.map(_withAct);

  /** 活动流程监督行 */
  const flowRowHtml = (r) => `
            <div class="flex items-center justify-between p-3 rounded-xl bg-white ${r.overdue ? 'border border-red-100' : ''}">
              ${r.activityId
                ? `<a href="../activity.html?id=${encodeURIComponent(r.activityId)}" class="flex-1 min-w-0" style="text-decoration:none;color:inherit;" title="查看活动详情">
                     <div class="text-sm font-medium text-gray-800">${r.activity}</div>
                     <div class="text-xs text-gray-500 mt-0.5">组织者：${r.organizer}</div>
                   </a>`
                : `<div class="flex-1 min-w-0">
                     <div class="text-sm font-medium text-gray-800">${r.activity}</div>
                     <div class="text-xs text-gray-500 mt-0.5">组织者：${r.organizer}</div>
                   </div>`}
              <div class="flex items-center gap-2 ml-4">
                <span class="text-xs px-1.5 py-0.5 rounded-full ${progressColor[r.progress] || 'bg-gray-100 text-gray-600'}">${r.progress}</span>
                ${r.overdue ? `<button class="btn-action btn-action-red btn-disc-remind" data-review-id="${r.id}">站内通知</button>` : ''}
              </div>
            </div>`;

  /** 活动复盘监督行（可确认口径与单行「确认」按钮一致：仅「已上传」行可勾） */
  const itemRowHtml = (r) => {
    const confirmable = r.reviewStatus === ReviewStatus.UPLOADED;
    const checked = _batchCheckedIds.has(r.id);
    return `
            <div class="p-3 rounded-xl bg-white">
              <div class="flex items-center justify-between gap-2 mb-2">
                <div class="flex items-center gap-2 min-w-0">
                  ${_batchModeOn ? `
                  <input type="checkbox" class="js-batch-check w-3.5 h-3.5 rounded shrink-0"
                    data-review-id="${r.id}" ${checked ? 'checked' : ''} ${confirmable ? '' : 'disabled'}
                    title="${confirmable ? '勾选后可由「批量确认所选」统一确认' : '仅「已上传」复盘可勾选确认'}"
                    style="accent-color:${ctx.accent || 'var(--accent-disc-commissioner)'};cursor:${confirmable ? 'pointer' : 'not-allowed'};${confirmable ? '' : 'opacity:0.45;'}" />` : ''}
                  <div class="text-sm font-medium text-gray-800">${r.activity}</div>
                </div>
                <div class="flex items-center gap-2">
                  <span class="text-xs px-1.5 py-0.5 rounded-full ${reviewColor[r.reviewStatus] || 'bg-gray-100 text-gray-600'}">${r.reviewStatus}</span>
                  ${r.reviewStatus === '已确认' ? `<span class="text-xs px-1.5 py-0.5 rounded-full ${hasDeposit(r) ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}">${hasDeposit(r) ? '已沉淀' : '未沉淀'}</span>` : ''}
                </div>
              </div>
              ${r.reviewContent ? `<div class="text-xs text-gray-600 mb-2 p-2 bg-white rounded-lg border border-gray-100">${r.reviewContent}</div>` : ''}
              ${(r.issues && r.issues.length) ? `<div class="mb-2 p-2 rounded-lg border border-amber-100 bg-amber-50">
                <div class="text-[11px] text-amber-700 font-bold mb-0.5">提出的真问题（${r.issues.length}）</div>
                <ul class="space-y-0.5">${r.issues.map(i => `<li class="text-xs text-amber-800" style="--acc-text-dark:#FBBF24;">· ${i}</li>`).join('')}</ul>
              </div>` : ''}
              <div class="flex gap-2">
                ${r.reviewStatus === '已上传' ? `
                  <button class="btn-action btn-action-orange btn-disc-annotate" data-review-id="${r.id}">批注</button>
                  <button class="btn-action btn-action-red btn-disc-reject" data-review-id="${r.id}">打回</button>
                  <button class="btn-action btn-action-green btn-disc-confirm" data-review-id="${r.id}">确认</button>
                ` : ''}
                ${r.reviewStatus === '未提交' ? `
                  <button class="btn-action btn-action-red btn-disc-remind-review" data-review-id="${r.id}">站内通知</button>
                ` : ''}
                ${r.reviewStatus === '已确认' && !hasDeposit(r) ? `
                  <button class="btn-action btn-action-amber btn-disc-urge-deposit" data-review-id="${r.id}" data-activity-name="${r.sourceName || r.activity}" data-organizer="${r.organizer}">督促沉淀</button>
                ` : ''}
              </div>
            </div>`;
  };

  /** 经验沉淀督促行 */
  const depositRowHtml = (r) => `
            <div class="flex items-center justify-between p-3 rounded-xl bg-white">
              <div class="flex-1 min-w-0">
                <div class="text-sm font-medium text-gray-800">${r.activity}</div>
                <div class="text-xs text-gray-500 mt-0.5">组织者：${r.organizer}</div>
              </div>
              <button class="text-xs px-3 py-1.5 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 btn-disc-urge-deposit" style="cursor:pointer;" data-activity-name="${r.sourceName || r.activity}" data-organizer="${r.organizer}">督促沉淀</button>
            </div>`;

  container.innerHTML = `
    <div class="space-y-4">
      <div class="card rounded-lg p-5">
        <h3 class="font-title-cn text-base font-semibold text-gray-800 mb-3">活动流程监督</h3>
        <div class="text-xs text-gray-500 mb-3">阅览党小组活动/专班工作时间流 · 超时确认后站内通知</div>
        <div id="disc-review-flow-list"></div>
      </div>
      <div class="card rounded-lg p-5">
        <div class="flex items-center justify-between gap-2 mb-1">
          <h3 class="font-title-cn text-base font-semibold text-gray-800">活动复盘监督</h3>
          ${(_batchModeOn || reviewData.some(r => r.reviewStatus === ReviewStatus.UPLOADED)) ? `
          <button class="btn-action btn-action-gray js-batch-toggle" style="cursor:pointer;">${_batchModeOn ? '退出批量模式' : '批量确认'}</button>` : ''}
        </div>
        <div class="text-xs text-gray-500 mb-3">复盘流转：已上传 → 批注中 → 确认/打回</div>
        ${_batchModeOn ? `
        <div class="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-gray-50 px-3 py-2 mb-3 text-xs text-gray-600">
          <span>已勾选 <b class="js-batch-count tabular-nums">${_batchCheckedIds.size}</b> 条「已上传」复盘（已确认/打回/批注中/未提交行置灰不可勾）</span>
          <button class="btn-action btn-action-green js-batch-confirm" style="cursor:${_batchCheckedIds.size ? 'pointer' : 'not-allowed'};${_batchCheckedIds.size ? '' : 'opacity:0.5;'}" ${_batchCheckedIds.size ? '' : 'disabled'}>批量确认所选（${_batchCheckedIds.size}）</button>
        </div>` : ''}
        <div id="disc-review-items-list"></div>
      </div>
      ${unDepositedReviews.length > 0 ? `
      <div class="card rounded-lg p-5">
        <h3 class="font-title-cn text-base font-semibold text-gray-800 mb-3">经验沉淀督促清单</h3>
        <div class="text-xs text-gray-500 mb-3">以下活动复盘已确认但尚未沉淀经验，请督促深度参与者提交</div>
        <div id="disc-review-deposit-list"></div>
      </div>
      ` : ''}
    </div>
  `;

  // 统一检索引擎（第一列是活动的列表：关键词 名称/地点 + 分面 月份/类别/类型/状态；≤8 行自动不渲染检索条）
  const _rvKeyword = activityKeyword();
  const _rvFacets = activityFacets();
  renderFilteredList(container.querySelector('#disc-review-flow-list'), {
    stateKey: 'disc-review-flow',
    rows: flowRows,
    keyword: _rvKeyword,
    facets: _rvFacets,
    countUnit: '条',
    listClass: 'space-y-2',
    emptyMessage: '无匹配复盘记录',
    rowHtml: flowRowHtml,
  });
  renderFilteredList(container.querySelector('#disc-review-items-list'), {
    stateKey: 'disc-review-items',
    rows: itemRows,
    keyword: _rvKeyword,
    facets: _rvFacets,
    countUnit: '条',
    listClass: 'space-y-2',
    emptyMessage: '无匹配复盘记录',
    rowHtml: itemRowHtml,
  });
  if (container.querySelector('#disc-review-deposit-list')) {
    renderFilteredList(container.querySelector('#disc-review-deposit-list'), {
      stateKey: 'disc-review-deposit',
      rows: depositRows,
      keyword: _rvKeyword,
      facets: _rvFacets,
      countUnit: '条',
      listClass: 'space-y-2',
      emptyMessage: '无匹配待沉淀活动',
      rowHtml: depositRowHtml,
    });
  }

  // ── 复盘真操作（2026-08-05 修复：批注/打回/确认/邮件提醒均落库，不再只弹 toast） ──
  // 事件委托：引擎筛选会重渲染行，故把监听挂在各列表宿主上（宿主随整页 innerHTML 重建，无监听堆积）
  const _reviewItemOf = (id) => reviewData.find(r => r.id === id);

  // ── 批量确认（2026-09-06 纪检批量评议确认）───────────────────
  // 勾选汇总刷新：更新工具条计数与「批量确认所选（N）」按钮态（初始态已在模板内渲染）
  const refreshBatchBar = () => {
    const n = _batchCheckedIds.size;
    const countEl = container.querySelector('.js-batch-count');
    if (countEl) countEl.textContent = String(n);
    container.querySelectorAll('.js-batch-confirm').forEach(b => {
      b.textContent = `批量确认所选（${n}）`;
      b.disabled = n === 0;
      b.style.cursor = n === 0 ? 'not-allowed' : 'pointer';
      b.style.opacity = n === 0 ? '0.5' : '';
    });
  };

  /** 督促沉淀表单（复盘监督行 / 沉淀清单行共用；B 档 CRUD 补全：落库同源） */
  const _openDepositForm = (btn) => {
    const reviewId = btn.dataset.reviewId;
    const activityName = btn.dataset.activityName || btn.dataset.organizer || '该活动';
    openFormModal({
      id: 'deposit',
      title: '记录经验沉淀',
      // 2026-09-21 批次 139：每台浮窗页脚一条「相关设置」深链（纪检台 → 纪检职责参数）
      settingsLink: { href: './settings.html#domain-disc', text: '纪检职责参数（考察确认超期天数）→ 设置' },
      fields: [
        { key: 'title', label: '沉淀主题', type: 'input', required: true, placeholder: `如：${activityName}的组织经验` },
        { key: 'content', label: '经验内容', type: 'textarea', required: true, placeholder: '做了什么、怎么做的、为什么这样做（可操作、有边界）' },
        { key: 'scenario', label: '适用场景', type: 'input', required: false, placeholder: '什么情况下可用这条经验（选填）' },
        { key: 'counter', label: '常见误区/反例', type: 'textarea', required: false, placeholder: '不这样做会怎样 / 什么情况下不适用（选填）' },
      ],
      onSubmit: (values) => {
        const deposits = _loadDeposits();
        deposits.push({
          id: generateId('exp'),
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
  };

  // 活动流程监督：超期邮件提醒
  container.querySelector('#disc-review-flow-list')?.addEventListener('click', (e) => {
    const btn = e.target.closest('.btn-disc-remind');
    if (!btn) return;
    const id = btn.dataset.reviewId;
    const item = _reviewItemOf(id);
    if (id) updateReviewById(id, { remindedAt: new Date().toISOString(), reminderType: 'overdue' });
    if (item) _notifyReviewOrganizer(item, 'review-overdue-reminder');
    showToast('success', '超时站内通知已发送');
  });

  // 活动复盘监督：勾选（change）+ 行内动作（click）
  const itemsHost = container.querySelector('#disc-review-items-list');
  itemsHost?.addEventListener('change', (e) => {
    const cb = e.target.closest('.js-batch-check');
    if (!cb) return;
    const id = cb.dataset.reviewId;
    if (!id) return;
    // disabled 行（已确认/打回/批注中/未提交）不触发 change，天然置灰不可勾
    if (cb.checked) _batchCheckedIds.add(id); else _batchCheckedIds.delete(id);
    refreshBatchBar();
  });
  itemsHost?.addEventListener('click', (e) => {
    const annotate = e.target.closest('.btn-disc-annotate');
    if (annotate) {
      const reviewId = annotate.dataset.reviewId;
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
      return;
    }
    const reject = e.target.closest('.btn-disc-reject');
    if (reject) {
      const id = reject.dataset.reviewId;
      const item = _reviewItemOf(id);
      // C2 危险操作二次确认：打回即流转要求组织者重交，先确认再落库（2026-09-12）
      if (!window.confirm(`确认打回「${(item && (item.sourceName || item.activity)) || '该复盘'}」？打回后要求组织者重新提交复盘总结。`)) return;
      const updated = updateReviewById(id, {
        reviewStatus: ReviewStatus.REJECTED,
        annotatedBy: DISC_COMMISSIONER_ID,
        annotatedAt: new Date().toISOString(),
      });
      if (!updated) { showToast('error', '复盘记录不存在'); return; }
      showToast('success', '复盘已打回，要求重新提交');
      renderContent(ctx);
      return;
    }
    const confirmBtn = e.target.closest('.btn-disc-confirm');
    if (confirmBtn) {
      const id = confirmBtn.dataset.reviewId;
      const updated = updateReviewById(id, {
        reviewStatus: ReviewStatus.CONFIRMED,
        confirmedAt: new Date().toISOString(),
      });
      if (!updated) { showToast('error', '复盘记录不存在'); return; }
      showToast('success', '复盘总结已确认，录入后台，活动结束');
      renderContent(ctx);
      return;
    }
    const remind = e.target.closest('.btn-disc-remind-review');
    if (remind) {
      const id = remind.dataset.reviewId;
      const item = _reviewItemOf(id);
      if (id) updateReviewById(id, { remindedAt: new Date().toISOString(), reminderType: 'resubmit' });
      if (item) _notifyReviewOrganizer(item, 'review-resubmit-reminder');
      showToast('success', '复盘超期站内通知已发送至组织者');
      return;
    }
    const urge = e.target.closest('.btn-disc-urge-deposit');
    if (urge) { _openDepositForm(urge); return; }
  });

  // 经验沉淀督促清单：督促沉淀
  container.querySelector('#disc-review-deposit-list')?.addEventListener('click', (e) => {
    const urge = e.target.closest('.btn-disc-urge-deposit');
    if (urge) _openDepositForm(urge);
  });

  // 批量模式开关：进入/退出均清空勾选后重渲染（单行批注/打回/确认交互不受影响）
  container.querySelectorAll('.js-batch-toggle').forEach(btn => btn.addEventListener('click', () => {
    _batchModeOn = !_batchModeOn;
    _batchCheckedIds.clear();
    renderContent(ctx);
  }));
  // 批量确认：与单行「确认」同一服务路径 updateReviewById（写 reviewStatus=已确认 + confirmedAt 审计）
  container.querySelectorAll('.js-batch-confirm').forEach(btn => btn.addEventListener('click', () => {
    if (_batchCheckedIds.size === 0) return;
    const now = new Date().toISOString();
    // 落库前二次校验：行仍为「已上传」才确认，否则计为跳过
    const confirmableIds = new Set(reviewData.filter(r => r.reviewStatus === ReviewStatus.UPLOADED).map(r => r.id));
    let ok = 0, skip = 0;
    for (const id of [..._batchCheckedIds]) {
      if (!confirmableIds.has(id)) { skip++; continue; }
      const updated = updateReviewById(id, {
        reviewStatus: ReviewStatus.CONFIRMED,
        confirmedAt: now,
      });
      if (updated) ok++; else skip++;
    }
    _batchCheckedIds.clear();
    if (ok > 0) {
      showToast('success', skip > 0 ? `已确认 ${ok} 条（${skip} 条跳过）` : `已确认 ${ok} 条，复盘结束`);
    } else {
      showToast('error', '批量确认失败：所选复盘均已不可确认');
    }
    renderContent(ctx);
  }));
}
