// role: [工程师]+[AI]
// entries/tabs/secretary/overview-tab.js — 支书工作台·全局概况 tab（懒加载模块）
// 2026-10-18 工作台密度与组件重组 Task 7：支书概况并入六台统一三层骨架
//（结论带 / 条线表 / 待我处理），渲染唯一源 = components/governance/work-overview.js。
// 原「汇报 / 卡点 / 进度」三卡与按人视图、书记工作队列随本次统一骨架下线；
// 待办定位、活动/专班只读详情、文件外发确认、「去我的处置」等既有下钻由共享渲染保留。
// U-01（2026-10-19）：补「周期归档待审核」卡与通知深链 ?highlight=<periodicArchiveId> 定位——
// 审核状态位 / 写口 / 待审口径单一源 = services/governance/secretary-overview.js
//（listPeriodicArchivesPendingReview / reviewPeriodicArchive / PERIODIC_ARCHIVE_REVIEW_STATUS），
// 本页只做呈现与交互，不另写状态名、不改后端 API/数据模型/权限链。

import { currentUserId } from '../../../services/core/auth.js?v=20261024b';
import { renderWorkOverview } from '../../../components/governance/work-overview.js?v=20261024b';
import {
  listPeriodicArchivesPendingReview, reviewPeriodicArchive,
} from '../../../services/governance/secretary-overview.js?v=20261024b';
import { getPersonName } from '../../../services/member/person.js?v=20261024b';
import { listRowHtml, listGroupHtml } from '../../../components/ui/list-row.js?v=20261024b';
import { emptyStateHtml } from '../../../components/ui/empty-state.js?v=20261024b';
import { openModal, closeModal } from '../../../components/ui/modal.js?v=20261024b';
import {
  showToast, flashHighlight, getBasePath, escHtml as esc,
} from '../../../core/base/utils.js?v=20261024b';

const OVERVIEW_TAB_HTML = `
  <div id="secretary-overview-content"></div>
`;

const PERIODIC_REVIEW_MODAL_ID = 'secretary-periodic-archive-return';

// 通知落点 ?highlight=<periodicArchiveId> 的**一次性**消费标记：
// 工作台壳（components/shell/workspace-shell.js）会先清掉 URL 上的 highlight 参数，再把
// ctx.navTarget 交给 tab；故首次渲染同时回退读 ctx.navTarget.hl。本页审核后的重渲染
// 不得再次定位/提示「已处理或不存在」。
let _highlightConsumed = false;

/** 读取通知深链 id：URL 优先（保留任务要求的直接消费口径），壳已清理时回退 ctx.navTarget.hl */
function _resolveHighlightId(ctx) {
  let fromUrl = '';
  try { fromUrl = new URLSearchParams(location.search).get('highlight') || ''; } catch (_) { /* 非浏览器环境忽略 */ }
  return fromUrl || ctx?.navTarget?.hl || '';
}

/** 渲染全局概况 tab（六台共用同一骨架 + 支书专属「周期归档待审核」卡） */
export async function renderContent(ctx = {}) {
  const tc = document.getElementById('secretary-tab-content');
  if (!tc) return null;
  if (tc.dataset.currentTab !== 'overview') {
    tc.innerHTML = OVERVIEW_TAB_HTML;
    tc.dataset.currentTab = 'overview';
  }
  const container = document.getElementById('secretary-overview-content');
  if (!container) return null;
  // P1-11：失效会话不再回落到组长 p1（原兜底会把支书的写操作记到别人名下）；
  //   读口照常渲染，写口在 _mountPeriodicReview 内显式拒绝并提示重新登录。
  const personId = currentUserId();
  const highlightId = _highlightConsumed ? '' : _resolveHighlightId(ctx);
  const pendingReports = listPeriodicArchivesPendingReview();
  return renderWorkOverview(container, {
    role: 'secretary',
    personId,
    accent: ctx.accent,
    prefix: 'secretary',
    title: '全局概况',
    // 附加区块：由本页持有呈现与交互，work-overview 只负责放进统一 .stack-page 骨架
    extraSections: [{
      html: _periodicReviewSectionHtml(pendingReports),
      mount: (host) => _mountPeriodicReview(host, personId, ctx),
    }],
  }).then(() => {
    if (!highlightId) return;
    _highlightConsumed = true;
    _locatePeriodicArchive(container, highlightId);
  });
}

/** 「周期归档待审核」卡：期次 / 提交人 / 提交时间 + 行内通过、退回 */
function _periodicReviewSectionHtml(reports) {
  const rows = (reports || []).map((report) => {
    const label = report.archivePolicySnapshot?.periodLabel || report.periodLabel || report.week || '未命名期次';
    const range = report.archivePolicySnapshot?.periodRange || report.periodRange || report.weekRange || '';
    const submitter = getPersonName(report.submittedBy) || report.submittedBy || '提交人';
    const submittedAt = report.submittedAt
      ? String(report.submittedAt).slice(0, 16).replace('T', ' ')
      : '时间未记录';
    return listRowHtml({
      rowType: 'action',
      leading: '<span class="w-2 h-2 rounded-full flex-shrink-0" style="background:var(--functional-warning);"></span>',
      title: label,
      meta: `${submitter} · 提交于 ${submittedAt}`,
      description: range,
      trailing: `<div class="flex items-center gap-2">
        <button type="button" class="btn-outline btn-sm" data-pa-review="returned" data-pa-id="${esc(report.id)}">退回</button>
        <button type="button" class="btn-outline btn-sm text-accent" data-pa-review="approved" data-pa-id="${esc(report.id)}">通过</button>
      </div>`,
      dataAttrs: { 'data-periodic-archive-id': report.id },
    });
  });
  return `<section class="card rounded-xl card-standard stack-section card--static" data-wo-layer="periodic-review" aria-label="周期归档待审核">
    <div class="section-head">
      <h3 class="section-head__title">周期归档待审核</h3>
      <span class="section-head__meta">共 ${(reports || []).length} 条</span>
    </div>
    ${rows.length
      ? listGroupHtml(rows)
      : emptyStateHtml('暂无待审周期归档', {
        // C07（2026-10-20）：支书/副支书已不进宣传台（D-807④，跨台会被身份门弹回）——
        // 改为落本台待办（代归档口径），不再指向 prop.html。
        actionHtml: `<a class="btn-outline btn-sm text-accent" href="${getBasePath()}workspace/secretary.html?tab=todo">去待办（代归档）<span aria-hidden="true">›</span></a>`,
      })}
  </section>`;
}

/** 绑定待审卡：通过直接写；退回先经浮窗填一句说明（不用 window.prompt） */
function _mountPeriodicReview(container, personId, ctx) {
  const section = container.querySelector('[data-wo-layer="periodic-review"]');
  if (!section) return;
  section.addEventListener('click', (event) => {
    const btn = event.target.closest('[data-pa-review]');
    if (!btn) return;
    // P1-11：无登录人不允许写（宁可不写，也不把审核记到猜测的人名下）。
    if (!personId) { showToast('error', '登录态已失效，请重新登录后再审核'); return; }
    const id = btn.dataset.paId;
    if (!id) return;
    if (btn.dataset.paReview === 'approved') {
      const result = reviewPeriodicArchive({ id, decision: 'approved', reviewerId: personId });
      if (!result.ok) { showToast('error', result.reason || '通过失败'); return; }
      showToast('success', '已通过该周期归档');
      renderContent(ctx); // 本页重渲染：待审卡移除该行、待我处理计数同步减少
      return;
    }
    _openReturnModal(id, personId, ctx);
  });
}

/** 退回浮窗：说明为必填一句，写回 reviewNote（写口仍是服务层 reviewPeriodicArchive） */
function _openReturnModal(id, personId, ctx) {
  openModal({
    id: PERIODIC_REVIEW_MODAL_ID,
    title: '退回周期归档',
    width: '460px',
    bodyHtml: `
      <p class="text-xs text-gray-500" style="margin:0 0 10px;">退回后由宣传委员按说明修改并重新提交。</p>
      <label class="text-xs text-gray-500 mb-1.5 block font-medium" for="periodic-return-note">退回说明</label>
      <textarea id="periodic-return-note" rows="3" class="input-flat w-full resize-none" placeholder="请填写一句退回说明"></textarea>`,
    footerHtml: `
      <button type="button" class="btn-outline text-sm px-4 py-1.5" data-pa-return-cancel>取消</button>
      <button type="button" class="btn-accent text-sm px-4 py-1.5 font-medium" data-pa-return-confirm>确认退回</button>`,
    onMount: (panel) => {
      panel.querySelector('[data-pa-return-cancel]')?.addEventListener('click', () => closeModal(PERIODIC_REVIEW_MODAL_ID));
      panel.querySelector('[data-pa-return-confirm]')?.addEventListener('click', () => {
        const note = panel.querySelector('#periodic-return-note')?.value.trim() || '';
        if (!note) { showToast('error', '请填写退回说明'); return; }
        const result = reviewPeriodicArchive({ id, decision: 'returned', reviewerId: personId, note });
        if (!result.ok) { showToast('error', result.reason || '退回失败'); return; }
        closeModal(PERIODIC_REVIEW_MODAL_ID);
        showToast('success', '已退回该周期归档');
        renderContent(ctx);
      });
    },
  });
}

/** 通知深链定位：渲染后找目标行，滚动 + 闪烁高亮；找不到说明已处理或不存在 */
function _locatePeriodicArchive(container, id) {
  const target = [...container.querySelectorAll('[data-periodic-archive-id]')]
    .find((el) => el.dataset.periodicArchiveId === id);
  if (!target) {
    showToast('info', '该周期归档已处理或不存在');
    return;
  }
  target.scrollIntoView({ behavior: 'smooth', block: 'center' });
  flashHighlight(target);
}
