// role: [工程师]+[AI]
// 纪检委员工作台 Tab：复盘（T-279 M3 拆分；2026-10-04 批次 368 页签名由「活动监督复盘」改「复盘」——原名＝动作＋对象混轴）
// 活动流程监督（超时提醒）+ 活动复盘监督（批注/打回/确认）+ 经验沉淀督促清单。

import { mockDB, ReviewStatus } from '../../../core/domain/domain.js?v=20261024a';
import { persist } from '../../../data/data-adapter.js?v=20261024a';
import { reviewToDisplay } from '../../../services/governance/review.js?v=20261024a';
import { loadActiveActivityReviews, loadTaskforceReviews, updateReviewById } from '../../../services/governance/review.js?v=20261024a';
import { loadActivities } from '../../../services/activity/activity.js?v=20261024a';
// R7-33：复盘「超期」按「活动日 + 复盘提交期限（policy）」现算，不再直读记录上的 overdue 快照
import { isReviewOverdue } from '../../../core/domain/policy-defaults.js?v=20261024a';
import { showToast, escHtml } from '../../../core/base/utils.js?v=20261024a';
import { openFormModal, openModal, closeModal } from '../../../components/ui/modal.js?v=20261024a';
// 批次 352（`D-746` · `D-744`② 业务过程类余项）：经验沉淀「作废（软）」——统一写口 ＋ 支委层判据
import * as SoftVoid from '../../../services/governance/soft-void.js?v=20261024a';
import { openVoidModal } from '../../../components/ui/void-record.js?v=20261024a';
import { NoticeStore } from '../../../services/governance/notice.js?v=20261024a';
import { generateId } from '../../../core/base/id.js?v=20261024a';
import { getPersonById } from '../../../services/member/person.js?v=20261024a';
import { requireDiscCommissionerId } from './_shared.js?v=20261024a';
// 统一检索引擎（支书 2026-09-13 裁定）：第一列是活动的表格一律接入（关键词 + 分面；≤8 行自动不渲染检索条）
import { renderFilteredList, activityKeyword, activityFacets } from '../../../components/ui/list-filter.js?v=20261024a';
import { renderTabHeader } from '../../../components/shell/page-frame.js?v=20261024a';
// 材料页深链 focusActivityId 的通用定位（只滚动 + 闪烁，不另造筛选器）
import { focusActivityAnchor } from '../../../components/ui/detail-anchor.js?v=20261024a';

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

/** 批次 352（`D-746`）：**有效**沉淀＝未作废的（作废＝出列、留痕仍可回查）。
 *  ⚠ 过滤只在此处做——`_loadDeposits()` 保持原样，否则 `_saveDeposits` 写回时会丢掉已作废行。 */
function _activeDeposits() {
  return SoftVoid.filterActive('experienceDeposits', _loadDeposits());
}

function _saveDeposits(deposits) {
  mockDB.experienceDeposits = [...deposits];
  persist();
}

// ── 复盘 / 沉淀的稳定父键（P1-05/M1，2026-10-20）────────────────────
// 为什么：名称是可变展示快照，改名即断链、同名即串数据。活动复盘以 activityId 为父键，
//   专班复盘以 taskforceId（缺省 workgroupId）为父键；两边写入同一 `type:id` 形态后即可直接比对。
function _reviewParentKey(review) {
  if (!review) return null;
  if (review.sourceType === 'taskforce') {
    if (review.taskforceId) return `taskforce:${review.taskforceId}`;
    if (review.workgroupId) return `workgroup:${review.workgroupId}`;
    return null;
  }
  return review.activityId ? `activity:${review.activityId}` : null;
}

function _depositParentKey(deposit) {
  if (!deposit) return null;
  if (deposit.sourceType === 'taskforce') {
    if (deposit.taskforceId) return `taskforce:${deposit.taskforceId}`;
    if (deposit.workgroupId) return `workgroup:${deposit.workgroupId}`;
    return null;
  }
  if (deposit.activityId) return `activity:${deposit.activityId}`;
  if (deposit.sourceId) return `${deposit.sourceType || 'activity'}:${deposit.sourceId}`;
  return null;
}

/** 已沉淀清单行（批次 352 · `D-746`）：行尾「作废（软）」——支委可直接作废、其余人报支委会 */
function depositRecordRowHtml(d) {
  return `
    <div class="p-3 rounded-xl bg-white transition-colors flex items-start justify-between gap-3">
      <div class="min-w-0">
        <p class="text-sm font-medium text-gray-800 truncate">${escHtml(d.title || '未命名沉淀')}</p>
        <p class="text-xs text-gray-500 mt-0.5 truncate">来源活动：${escHtml(d.sourceName || '—')} · 记录于 ${escHtml((d.createdAt || '').slice(0, 10) || '—')}</p>
      </div>
      <div class="flex items-center gap-2 flex-shrink-0">
        ${d.voidPending && !d.voided
          ? '<span class="text-[11px] text-gray-500">待支委会确认</span>'
          : `<button class="btn-action btn-action-gray rv-void-deposit" data-deposit-id="${escHtml(d.id)}" title="软作废：沉淀从清单出列、留痕可回查；支委可直接作废，其余人报支委会确认">作废</button>`}
      </div>
    </div>`;
}

export function renderContent(ctx) {
  const container = document.getElementById('disc-tab-content');
  if (!container) return;

  const progressColor = { '已完成':'bg-green-100 text-green-700', '超时':'bg-red-100 text-red-700', '进行中':'bg-blue-100 text-blue-700' };
  const reviewColor = { '已上传':'bg-orange-100 text-orange-700', '未提交':'bg-red-100 text-red-700', '—':'bg-gray-100 text-gray-600' };
  const reviewData = reviewToDisplay(loadActiveActivityReviews(), loadTaskforceReviews());

  // 批量勾选去重（2026-09-06）：仅在批量模式下生效——行被单行确认/打回或消失后，
  // 已非「批注中」可确认态，自动移出勾选集合，避免批量确认误写已完结行。
  // 2026-10-18 繁专项 Task 15：批量确认与单行状态一致——「待批注」只可批注，确认只对「批注中」开放。
  if (_batchModeOn) {
    const confirmableIds = new Set(reviewData.filter(r => r.reviewStatus === ReviewStatus.ANNOTATING).map(r => r.id));
    [..._batchCheckedIds].forEach(id => { if (!confirmableIds.has(id)) _batchCheckedIds.delete(id); });
  }

  // 经验沉淀交叉引用：判断已完成复盘的活动是否已有沉淀（批次 352：**已作废的不算已沉淀**）
  // 2026-10-20 数据生命周期 P1-05/M1：「已沉淀」改按**稳定父键**比对（活动 activityId /
  //   专班 taskforceId），不再以名称字符串为关联键——活动/专班改名后不会永久显示「未沉淀」。
  //   仅对迁移前无父键的存量沉淀保留名称兜底（legacy，回填后自然消失）。
  const activeDeposits = _activeDeposits();
  const depositedKeys = new Set(activeDeposits.map(_depositParentKey).filter(Boolean));
  const legacyDepositNames = new Set(activeDeposits.filter(d => !_depositParentKey(d)).map(d => d.sourceName).filter(Boolean));
  function hasDeposit(reviewItem) {
    const key = _reviewParentKey(reviewItem);
    if (key && depositedKeys.has(key)) return true;
    return legacyDepositNames.has(reviewItem.sourceName || reviewItem.activity);
  }

  // 经验沉淀督促清单：已确认复盘但未沉淀的活动
  const unDepositedReviews = reviewData.filter(r => r.reviewStatus === ReviewStatus.CONFIRMED && !hasDeposit(r));

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
  const flowRowHtml = (r) => {
    const overdue = isReviewOverdue(r);
    return `
            <div class="flex items-center justify-between p-3 rounded-xl bg-white ${overdue ? 'border border-red-100' : ''}" data-act-id="${escHtml(r.activityId || '')}">
              ${r.activityId
                ? `<a href="./activity.html?id=${encodeURIComponent(r.activityId)}" class="flex-1 min-w-0" style="text-decoration:none;color:inherit;" title="查看活动详情">
                     <div class="text-sm font-medium text-gray-800">${r.activity}</div>
                     <div class="text-xs text-gray-500 mt-0.5">组织者：${r.organizer}</div>
                   </a>`
                : `<div class="flex-1 min-w-0">
                     <div class="text-sm font-medium text-gray-800">${r.activity}</div>
                     <div class="text-xs text-gray-500 mt-0.5">组织者：${r.organizer}</div>
                   </div>`}
              <div class="flex items-center gap-2 ml-4">
                <span class="text-xs px-1.5 py-0.5 rounded-full ${progressColor[r.progress] || 'bg-gray-100 text-gray-600'}">${r.progress}</span>
                ${overdue ? `<button class="btn-action btn-action-red btn-disc-remind" data-review-id="${r.id}">站内通知</button>` : ''}
              </div>
            </div>`;
  };

  /** 活动复盘监督行（可确认口径与单行「确认」按钮一致：仅「批注中」行可勾） */
  const itemRowHtml = (r) => {
    const confirmable = r.reviewStatus === ReviewStatus.ANNOTATING;
    const checked = _batchCheckedIds.has(r.id);
    return `
            <div class="p-3 rounded-xl bg-white" data-act-id="${escHtml(r.activityId || '')}">
              <div class="flex items-center justify-between gap-2 mb-2">
                <div class="flex items-center gap-2 min-w-0">
                  ${_batchModeOn ? `
                  <input type="checkbox" class="js-batch-check w-3.5 h-3.5 rounded shrink-0"
                    data-review-id="${r.id}" ${checked ? 'checked' : ''} ${confirmable ? '' : 'disabled'}
                    title="${confirmable ? '勾选后可由「批量确认所选」统一确认' : '仅「批注中」复盘可勾选确认'}"
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
                <ul class="space-y-0.5">${r.issues.map(i => `<li class="text-xs text-amber-700">· ${i}</li>`).join('')}</ul>
              </div>` : ''}
              <div class="flex gap-2">
                ${r.reviewStatus === ReviewStatus.UPLOADED ? `
                  <button class="btn-action btn-action-orange btn-disc-annotate" data-review-id="${r.id}">批注</button>
                ` : ''}
                ${r.reviewStatus === ReviewStatus.ANNOTATING ? `
                  <button class="btn-action btn-action-red btn-disc-reject" data-review-id="${r.id}">打回</button>
                  <button class="btn-action btn-action-green btn-disc-confirm" data-review-id="${r.id}">确认</button>
                ` : ''}
                ${r.reviewStatus === ReviewStatus.NOT_SUBMITTED ? `
                  <button class="btn-action btn-action-red btn-disc-remind-review" data-review-id="${r.id}">站内通知</button>
                ` : ''}
                ${r.reviewStatus === ReviewStatus.CONFIRMED && !hasDeposit(r) ? `
                  <button class="btn-action btn-action-amber btn-disc-urge-deposit" data-review-id="${escHtml(r.id)}" data-activity-name="${r.sourceName || r.activity}" data-organizer="${r.organizer}"
                    data-source-type="${escHtml(r.sourceType || 'activity')}" data-activity-id="${escHtml(r.activityId || '')}" data-taskforce-id="${escHtml(r.taskforceId || '')}" data-workgroup-id="${escHtml(r.workgroupId || '')}">督促沉淀</button>
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
              <button class="btn-accent-soft text-xs px-3 py-1.5 btn-disc-urge-deposit" style="cursor:pointer;" data-review-id="${escHtml(r.id)}" data-activity-name="${r.sourceName || r.activity}" data-organizer="${r.organizer}"
                data-source-type="${escHtml(r.sourceType || 'activity')}" data-activity-id="${escHtml(r.activityId || '')}" data-taskforce-id="${escHtml(r.taskforceId || '')}" data-workgroup-id="${escHtml(r.workgroupId || '')}">督促沉淀</button>
            </div>`;

  // B10（2026-10-20）：「流程监督」与「复盘监督」原为两张并列卡，但同一批复盘先看流程进度、
  //   再批注/确认，属同一任务的先后两段 ⇒ 合并为一张「复盘监督」卡：一个卡头、两个小节；
  //   两个列表宿主 id 与全部按钮/勾选行为原样保留（清单与动作零丢失）。
  container.innerHTML = `
    ${renderTabHeader({ title: '复盘', description: '流程监督与复盘处理；已确认复盘的经验沉淀。' })}
    <div class="space-y-4">
      <div class="card rounded-xl p-5">
        <div class="flex items-center justify-between gap-2 mb-3">
          <h3 class="font-title-cn text-base font-semibold text-gray-800">复盘监督</h3>
          ${(_batchModeOn || reviewData.some(r => r.reviewStatus === ReviewStatus.ANNOTATING)) ? `
          <button class="btn-action btn-action-gray js-batch-toggle" style="cursor:pointer;">${_batchModeOn ? '退出批量模式' : '批量确认'}</button>` : ''}
        </div>
        <section class="mb-5" aria-label="流程监督">
          <h4 class="font-title-cn text-sm font-bold text-gray-700 mb-1">流程监督</h4>
          <div class="text-xs text-gray-500 mb-3">阅览党小组活动/专班工作时间流 · 超时确认后站内通知</div>
          <div id="disc-review-flow-list"></div>
        </section>
        <section aria-label="复盘处理">
          <h4 class="font-title-cn text-sm font-bold text-gray-700 mb-1">复盘处理</h4>
          <div class="text-xs text-gray-500 mb-3">复盘流转：已上传 → 批注中 → 确认/打回 · 留痕台账不提供删除</div>
          ${_batchModeOn ? `
          <div class="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-gray-50 px-3 py-2 mb-3 text-xs text-gray-600">
            <span>已勾选 <b class="js-batch-count tabular-nums">${_batchCheckedIds.size}</b> 条「批注中」复盘（已确认/打回/待批注/未提交行置灰不可勾）</span>
            <button class="btn-action btn-action-green js-batch-confirm" style="cursor:${_batchCheckedIds.size ? 'pointer' : 'not-allowed'};${_batchCheckedIds.size ? '' : 'opacity:0.5;'}" ${_batchCheckedIds.size ? '' : 'disabled'}>批量确认所选（${_batchCheckedIds.size}）</button>
          </div>` : ''}
          <div id="disc-review-items-list"></div>
        </section>
      </div>
      ${unDepositedReviews.length > 0 ? `
      <div class="card rounded-xl p-5">
        <h3 class="font-title-cn text-base font-semibold text-gray-800 mb-3">经验沉淀督促清单</h3>
        <div class="text-xs text-gray-500 mb-3">以下活动复盘已确认但尚未沉淀经验，请督促深度参与者提交</div>
        <div id="disc-review-deposit-list"></div>
      </div>
      ` : ''}
      ${activeDeposits.length > 0 ? `
      <div class="card rounded-xl p-5">
        <h3 class="font-title-cn text-base font-semibold text-gray-800 mb-3">已沉淀清单</h3>
        <div class="text-xs text-gray-500 mb-3">已记录的经验沉淀（${activeDeposits.length} 条）；作废＝软作废（出列、留痕可回查）</div>
        <div id="disc-review-deposit-record-list"></div>
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
  // 批次 352（`D-746`）：已沉淀清单（行尾可作废）——第一列是活动 ⇒ 同接入统一检索引擎
  if (container.querySelector('#disc-review-deposit-record-list')) {
    renderFilteredList(container.querySelector('#disc-review-deposit-record-list'), {
      stateKey: 'disc-review-deposit-record',
      rows: activeDeposits.map(d => ({
        ...d,
        activity: d.sourceName || d.title || '',
        date: (d.createdAt || '').slice(0, 10),
        type: d.scenario || '',
      })),
      keyword: _rvKeyword,
      facets: _rvFacets,
      countUnit: '条',
      listClass: 'space-y-2',
      emptyMessage: '无匹配经验沉淀',
      rowHtml: depositRecordRowHtml,
    });
  }

  // 批次 352（`D-746`）：经验沉淀「作废（软）」——支委直接作废 / 其余人报支委会（单一源弹窗）
  container.querySelectorAll('.rv-void-deposit').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const dep = activeDeposits.find(d => d.id === btn.dataset.depositId);
      if (!dep) return;
      openVoidModal({
        resource: 'experienceDeposits', id: dep.id, label: '经验沉淀',
        subject: dep.title || dep.sourceName || dep.id,
        onDone: () => renderContent(ctx),
      });
    });
  });

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
    // P1-10：记录人＝现任纪检委员（角色派生），无该角色时拒绝写入。
    const submittedBy = requireDiscCommissionerId();
    if (!submittedBy) return;
    const reviewId = btn.dataset.reviewId;
    const activityName = btn.dataset.activityName || btn.dataset.organizer || '该活动';
    // P1-05/M1：沉淀必须落稳定父键（活动 activityId / 专班 taskforceId），sourceName 只作展示快照。
    const sourceType = btn.dataset.sourceType === 'taskforce' ? 'taskforce' : 'activity';
    const activityId = btn.dataset.activityId || null;
    const taskforceId = btn.dataset.taskforceId || null;
    const workgroupId = btn.dataset.workgroupId || null;
    // 无父键不写（否则又回到「只按名称关联」的老问题）。
    if (sourceType === 'activity' && !activityId) { showToast('error', '缺少活动父键，无法记录沉淀'); return; }
    if (sourceType === 'taskforce' && !taskforceId && !workgroupId) { showToast('error', '缺少专班父键，无法记录沉淀'); return; }
    openFormModal({
      id: 'deposit',
      title: '记录经验沉淀',
      // 2026-09-21 批次 139：每台浮窗页脚一条「相关设置」深链（纪检台 → 纪检职责参数）
      settingsLink: { href: './settings.html#domain-disc', text: '制度参数 →' },
      fields: [
        { key: 'title', label: '沉淀主题', type: 'text', required: true, placeholder: `如：${activityName}的组织经验` },
        { key: 'content', label: '经验内容', type: 'textarea', required: true, placeholder: '做了什么、怎么做的、为什么这样做（可操作、有边界）' },
        { key: 'scenario', label: '适用场景', type: 'text', required: false, placeholder: '什么情况下可用这条经验（选填）' },
        { key: 'counter', label: '常见误区/反例', type: 'textarea', required: false, placeholder: '不这样做会怎样 / 什么情况下不适用（选填）' },
      ],
      submitLabel: '保存经验沉淀',
      onSubmit: (values) => {
        const deposits = _loadDeposits();
        deposits.push({
          id: generateId('exp'),
          sourceName: activityName,   // 仅展示快照（改名不回写）
          sourceType,
          sourceId: sourceType === 'taskforce' ? (taskforceId || workgroupId || null) : activityId,
          activityId: sourceType === 'activity' ? activityId : null,
          taskforceId: sourceType === 'taskforce' ? taskforceId : null,
          workgroupId,
          reviewId: reviewId || null,
          title: values.title,
          content: values.content,
          scenario: values.scenario || '',
          counter: values.counter || '',
          submittedBy,
          createdAt: new Date().toISOString(),
        });
        _saveDeposits(deposits);
        if (reviewId) updateReviewById(reviewId, { remindedAt: new Date().toISOString(), reminderType: 'deposit', depositedAt: new Date().toISOString() });
        showToast('success', '经验沉淀已记录');
        renderContent(ctx);
        return true;
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
      // P1-10：批注人＝现任纪检委员（角色派生），无该角色不写。
      const annotatedBy = requireDiscCommissionerId();
      if (!annotatedBy) return;
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
        submitLabel: '保存批注',
        onSubmit: (values) => {
          const updated = updateReviewById(reviewId, {
            reviewStatus: ReviewStatus.ANNOTATING,
            annotation: values.content,
            annotationType: values.type,
            annotatedBy,
            annotatedAt: new Date().toISOString(),
          });
          if (!updated) { showToast('error', '复盘记录不存在'); return { ok: false, reason: '复盘记录不存在' }; }
          showToast('success', '批注已添加，复盘状态更新为批注中');
          renderContent(ctx);
          return true;
        },
        accentColor: ctx.accent || 'var(--accent-disc-commissioner)'
      });
      return;
    }
    const reject = e.target.closest('.btn-disc-reject');
    if (reject) {
      const id = reject.dataset.reviewId;
      const item = _reviewItemOf(id);
      const rejectSubject = (item && (item.sourceName || item.activity)) || '该复盘';
      // C2 危险操作二次确认：打回即流转要求组织者重交，先确认再落库（2026-09-12）
      // 2026-10-23：原生 confirm 改统一浮窗（不另造确认体系）
      openModal({
        id: 'disc-review-reject-confirm',
        title: '打回复盘',
        width: '420px',
        accentColor: ctx.accent || 'var(--accent-disc-commissioner)',
        bodyHtml: `<p style="margin:0;font-size:0.8rem;line-height:1.75;color:var(--neutral-700);">确认打回「${escHtml(rejectSubject)}」？打回后要求组织者重新提交复盘总结。</p>`,
        footerHtml: `
          <button type="button" data-modal-cancel="disc-review-reject-confirm" class="btn-outline text-sm px-4 py-1.5">取消</button>
          <button type="button" data-disc-reject-ok class="btn-accent text-sm px-4 py-1.5 font-medium">打回</button>`,
        onMount: (panel) => {
          panel.querySelector('[data-disc-reject-ok]')?.addEventListener('click', () => {
            closeModal('disc-review-reject-confirm');
            // P1-10：打回人＝现任纪检委员（角色派生），无该角色不写。
            const annotatedBy = requireDiscCommissionerId();
            if (!annotatedBy) return;
            const updated = updateReviewById(id, {
              reviewStatus: ReviewStatus.REJECTED,
              annotatedBy,
              annotatedAt: new Date().toISOString(),
            });
            if (!updated) { showToast('error', '复盘记录不存在'); return; }
            showToast('success', '复盘已打回，要求重新提交');
            renderContent(ctx);
          });
        },
      });
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
    // 落库前二次校验：行仍为「批注中」才确认，否则计为跳过
    const confirmableIds = new Set(reviewData.filter(r => r.reviewStatus === ReviewStatus.ANNOTATING).map(r => r.id));
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

  // 材料页深链：渲染后把本场活动的复盘卡片滚到视野。
  focusActivityAnchor(container, ctx?.focusActivityId);
}
