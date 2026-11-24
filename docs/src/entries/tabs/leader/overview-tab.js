// role: [工程师]+[AI]
// 组长工作台 Tab：工作概况（T-279 M2 拆分）
// 支书 2026-08-10 裁定：全部角色新增——汇报/卡点/在办三区总览，个人视角。
// IA-C2 收敛（2026-09-06）：概况顶部挂「待答复 n · 去处理」直达条；
// 组长收件位 = 本组组员汇报（组员进展 tab 行内答复）。
// 2026-10-18 繁专项 Task 6：work-overview 汇报区已降为只读摘要 +「去我的处置」，
// 顶部直达条属重复动作 ⇒ 外壳不再挂条，只保留骨架占位。
// U3（2026-09-07）：先 beginOverviewShell 骨架/槽位占位 → 原地渲染概况（不推挤正文）。

import { renderWorkOverview } from '../../../components/governance/work-overview.js?v=20261120a';
import { currentUserId } from '../../../services/core/auth.js?v=20261120a';
import { beginOverviewShell } from '../../../components/governance/overview-dispatch-bar.js?v=20261120a';
import { calendarCardShouldOpen, renderCalendarCard } from '../shared/activity-calendar-tab.js?v=20261120a';
import { CommitteeProposalStore } from '../../../services/governance/committee-proposal.js?v=20261120a';
import { PROPOSAL_STATUS_LABELS, PROPOSAL_TYPE_LABELS, PROPOSAL_SOURCE_LABELS } from '../../../core/domain/committee-proposal.js?v=20261120a';
import { openModal, closeModal } from '../../../components/ui/modal.js?v=20261120a';
import { textInput, selectInput, textareaField } from '../../../components/ui/forms.js?v=20261120a';
import { emptyStateHtml } from '../../../components/ui/empty-state.js?v=20261120a';
import { showToast, escHtml } from '../../../core/base/utils.js?v=20261120a';


function _badge(status) {
  return `<span class="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">${escHtml(PROPOSAL_STATUS_LABELS[status] || status)}</span>`;
}

async function _renderProposalCard(host, ctx) {
  if (!host) return;
  const me = currentUserId();
  const rows = await CommitteeProposalStore.list({ role: 'leader', personId: me });
  host.innerHTML = `
    <section class="card rounded-xl p-4" aria-labelledby="leader-proposal-title">
      <div class="flex items-center justify-between gap-2 mb-3">
        <h3 id="leader-proposal-title" class="font-title-cn text-sm font-bold text-gray-700">支部提案</h3>
        <button type="button" id="leader-proposal-new" class="btn-accent-soft px-3 py-2">新建提案</button>
      </div>
      <div id="leader-proposal-list" class="flex flex-col gap-2">
        ${rows.length ? rows.map((row) => `
          <div class="flex items-center justify-between gap-2 rounded-lg border border-gray-200 px-3 py-2">
            <div class="min-w-0">
              <p class="text-sm text-gray-800 truncate">${escHtml(row.title || '未命名提案')}</p>
              <p class="text-body-sm text-gray-500">${escHtml(PROPOSAL_SOURCE_LABELS[row.sourceType] || row.sourceType)} · ${escHtml(PROPOSAL_TYPE_LABELS[row.suggestedType] || row.suggestedType)}</p>
            </div>
            ${_badge(row.status)}
          </div>`).join('') : emptyStateHtml({ text: '暂无提案。', variant: 'inline' })}
      </div>
    </section>`;
  host.querySelector('#leader-proposal-new')?.addEventListener('click', () => _openProposalForm(ctx));
}

function _openProposalForm(ctx) {
  openModal({
    id: 'leader-proposal-form',
    title: '新建支部提案',
    width: '560px',
    bodyHtml: `
      <div class="mb-3">
        <label for="lp-title" class="text-[11px] text-gray-500 mb-2 block font-medium">提案标题 <span class="text-red-600">*</span></label>
        ${textInput({ id: 'lp-title', className: 'w-full', attrs: 'required' })}
      </div>
      <div class="mb-3">
        ${textareaField({ id: 'lp-reason', label: '事由', rows: 3, required: true })}
      </div>
      <div class="modal-form-grid mb-3">
        <div>
          <label for="lp-source" class="text-[11px] text-gray-500 mb-2 block font-medium">来源类型</label>
          ${selectInput({
            id: 'lp-source',
            options: [
              { value: 'activity', label: '活动' },
              { value: 'taskforce', label: '专班' },
              { value: 'member', label: '成员' },
              { value: 'institution', label: '制度' },
            ],
            className: 'w-full',
          })}
        </div>
        <div>
          <label for="lp-type" class="text-[11px] text-gray-500 mb-2 block font-medium">建议类型</label>
          ${selectInput({
            id: 'lp-type',
            options: [
              { value: 'decision', label: '决策' },
              { value: 'discussion', label: '讨论' },
              { value: 'sync', label: '同步' },
            ],
            className: 'w-full',
          })}
        </div>
      </div>
      <div class="mb-3">
        <label for="lp-source-id" class="text-[11px] text-gray-500 mb-2 block font-medium">已有对象 ID（新建事项可留空）</label>
        ${textInput({ id: 'lp-source-id', className: 'w-full', placeholder: '如 act_xxx / tf_xxx / p_xxx' })}
      </div>
      <div class="mb-3">
        <label for="lp-expected" class="text-[11px] text-gray-500 mb-2 block font-medium">期望上会时间</label>
        ${textInput({ id: 'lp-expected', type: 'date', className: 'w-full' })}
      </div>
      <div class="flex justify-end gap-2 mt-4">
        <button type="button" class="btn-outline" id="lp-cancel">取消</button>
        <button type="button" class="btn-accent-soft" id="lp-save">提交提案</button>
      </div>`,
  });
  document.getElementById('lp-cancel')?.addEventListener('click', () => closeModal('leader-proposal-form'));
  document.getElementById('lp-save')?.addEventListener('click', async () => {
    const title = document.getElementById('lp-title')?.value?.trim() || '';
    const reason = document.getElementById('lp-reason')?.value?.trim() || '';
    const sourceType = document.getElementById('lp-source')?.value || 'activity';
    const suggestedType = document.getElementById('lp-type')?.value || 'discussion';
    const sourceId = document.getElementById('lp-source-id')?.value?.trim() || null;
    const expectedAt = document.getElementById('lp-expected')?.value || null;
    if (!title || !reason) { showToast('error', '请填写提案标题与事由'); return; }
    const draft = sourceId ? null
      : (sourceType === 'activity'
        ? { title, type: '主题党日', date: expectedAt || '' }
        : (sourceType === 'taskforce' ? { name: title, type: '专项', task: reason } : null));
    if (!sourceId && !draft) { showToast('error', '成员 / 制度提案须填写已有对象 ID'); return; }
    const created = await CommitteeProposalStore.create({
      title, reason, sourceType, sourceId, draft, suggestedType, expectedAt,
    });
    if (!created) { showToast('error', '提案提交失败，请稍后重试'); return; }
    closeModal('leader-proposal-form');
    showToast('success', '提案已提交支委会');
    const host = document.getElementById('leader-proposal-card-host');
    if (host) await _renderProposalCard(host, ctx);
  });
}

export async function renderContent(ctx) {
  const el = document.getElementById('leader-tab-content');
  if (!el) return null;
  const personId = currentUserId();
  // 失效会话不猜人（P1-11）：读口显式显示 —，不再回落到固定的旧演示组长。
  if (!personId) {
    el.innerHTML = '<div class="card rounded-xl card-standard text-center"><p class="text-xs text-gray-500">—（登录态已失效，请重新登录）</p></div>';
    return null;
  }
  beginOverviewShell(el);
  await renderWorkOverview(el, {
    role: 'leader',
    personId,
    accent: ctx.accent,
    prefix: 'leader',
    title: '工作概况',
    // 2026-10-25 IA 62→45：活动日历页签降为本页折叠卡（共享只读日历，单一源不复制）。
    extraSections: [
      {
        html: '<div id="leader-proposal-card-host"></div>',
        mount: (host) => _renderProposalCard(host.querySelector('#leader-proposal-card-host'), ctx),
      },
      {
        html: '<div id="ov-calendar-card-host"></div>',
        mount: (host) => renderCalendarCard(host.querySelector('#ov-calendar-card-host'), undefined, {
          open: calendarCardShouldOpen(ctx?.navTarget),
        }),
      },
    ],
  });
  return null;
}
