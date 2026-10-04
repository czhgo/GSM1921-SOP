// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  components/ui/void-record.js — 业务记录「作废（软）」通用弹窗（**单一源**）
//  2026-10-03 批次 352 · 支书 `D-746`（`D-744`② 业务过程类余项「排批直接修」）。
//
//  口径（与 `#1` 待办作废逐条对齐 · `D-742`；与批次 346 的补课样板块同一套）：
//    · **原因必填**——无原因不得作废（**本文件是这句校验的唯一实现处**，各承载页不再各写一份）；
//    · **支委层**可直接作废（`confirmVoid`）；**其余人**报支委会（`requestVoid`，待支书台
//      「待办 → 待作废待确认」面裁决）；
//    · 软作废、不硬删：记录落 `voided` 留痕、默认列表出列（各承载页用 `SoftVoid.filterActive`）。
//
//  ⚠ **弹窗 id / 校验载体 id / 提交口 attribute 由调用方传入**：批次 346 的补课板块
//    沿用其既有 id（`makeup-void-modal` / `#makeup-void-reason` / `[data-makeup-void-ok]`），
//    以免动到已在册的真机流 `disc-makeup-void-reason` 的选择器。
// ════════════════════════════════════════════════════════════════
import * as SoftVoid from '../../services/governance/soft-void.js?v=20261004d';
import { BRANCH_COMMISSION_ROLES } from '../../core/domain/constants.js?v=20261004d';
import { AuthStore } from '../../services/core/auth.js?v=20261004d';
import { openModal, closeModal } from './modal.js?v=20261004d';
import { showToast, escHtml } from '../../core/base/utils.js?v=20261004d';

/**
 * 打开「作废（软）」弹窗（原因必填 → 支委直接作废 / 其余人报支委会）。
 * @param {Object} o
 * @param {string} o.resource 资源名（须已在 `SOFT_VOID_RESOURCES` 登记）
 * @param {string} o.id 记录 id
 * @param {string} o.subject 弹窗里指代该记录的可读名（人话）
 * @param {string} [o.label] 记录类别名（弹窗标题「作废<label>」）
 * @param {string} [o.modalId] 弹窗 id（缺省通用套）
 * @param {string} [o.reasonId] 原因文本域 id（缺省通用套）
 * @param {string} [o.okAttr] 确认键 attribute（缺省通用套）
 * @param {string} [o.cancelAttr] 取消键 attribute（缺省通用套）
 * @param {Function} [o.onDone] 裁决/申请成功后的回调（各承载页在此重渲染）
 */
export function openVoidModal({
  resource, id, subject,
  label = '记录',
  modalId = 'void-modal',
  reasonId = 'void-reason',
  okAttr = 'data-void-ok',
  cancelAttr = 'data-void-cancel',
  onDone,
} = {}) {
  const me = AuthStore.getCurrentUser() || {};
  const isCommittee = BRANCH_COMMISSION_ROLES.includes(me.role);
  openModal({
    id: modalId,
    title: `作废${label}`,
    accentColor: 'var(--functional-error)',
    bodyHtml: `
      <p class="text-sm text-gray-700 mb-1">作废「${escHtml(subject || id)}」这条${escHtml(label)}？作废＝<b>软作废</b>（留痕、默认列表出列），<b>不硬删</b>；支委可直接作废，其余人需报支委会确认。</p>
      <textarea id="${reasonId}" class="input-flat text-xs w-full mt-2" rows="3" maxlength="200" placeholder="作废原因（必填）"></textarea>
      <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:14px;">
        <button type="button" ${cancelAttr} class="btn-outline text-xs px-3 py-1.5" style="cursor:pointer;">取消</button>
        <button type="button" ${okAttr} class="btn-neutral text-xs px-3 py-1.5">确认作废</button>
      </div>`,
    onMount: (panel) => {
      panel.querySelector(`[${cancelAttr}]`)?.addEventListener('click', () => closeModal(modalId));
      panel.querySelector(`[${okAttr}]`)?.addEventListener('click', async () => {
        const reason = (panel.querySelector(`#${reasonId}`)?.value || '').trim();
        if (!reason) { showToast('error', '请填写作废原因（必填）'); return; }
        closeModal(modalId);
        const r = isCommittee
          ? await SoftVoid.confirmVoid(resource, id, { byPersonId: me.personId || '', note: reason })
          : await SoftVoid.requestVoid(resource, id, { reason, byPersonId: me.personId || '' });
        if (r) showToast('success', isCommittee ? '已作废（留痕、已出列）' : '已报支委会确认——确认后该条出列');
        else showToast('error', '作废失败：请确认原因已填且该记录存在');
        if (typeof onDone === 'function') onDone();
      });
    },
  });
}
