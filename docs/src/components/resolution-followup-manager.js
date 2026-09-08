// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  components/resolution-followup-manager.js — 决议「待落实」跟进管理器（附录⑩ S2 R2-2，2026-09-06）
//  展示位：书记/副书记在活动详情（inspector）「表决汇总」卡片下方（记录决议视图）——
//  每条已记录「通过」的议程（决议）下：勾选/录入待落实项（事项/责任人/时限）→ 保存后
//  services/resolution-followup.js 落库并派生责任人跟进待办（到期催办）；逾期进书记台待办。
//  数据读写全部走服务层，本组件只做视图与事件；保存/销项后经 onChanged 触发整体重绘。
//  责任人候选 = 支委角色 + 具体成员（与 workforce-panel 发起分工的负责人下拉同口径）。
// ════════════════════════════════════════════════════════════════

import { escHtml as esc, showToast } from '../core/utils.js?v=20260908c';
import { BRANCH_COMMISSION_ROLES, ROLE_LABELS } from '../core/constants.js?v=20260908c';
import { PersonStore } from '../services/person.js?v=20260908c';
import { AuthStore } from '../services/auth.js?v=20260908c';
import {
  saveFollowups, completeFollowup, reopenFollowup,
  FOLLOWUP_STATUS, ownerLabelOf,
} from '../services/resolution-followup.js?v=20260908c';

/** 责任人下拉选项（value 编码 type:id，与 workforce-panel 同口径） */
function _ownerOptionsHtml() {
  const roles = BRANCH_COMMISSION_ROLES.map((r) =>
    `<option value="role:${r}">${esc(ROLE_LABELS[r] || r)}</option>`).join('');
  const members = PersonStore.getMembers()
    .map((p) => `<option value="person:${p.id}">${esc(p.name || p.id)}（${esc(ROLE_LABELS[p.role] || p.role || '成员')}）</option>`)
    .join('');
  return `<optgroup label="支委角色">${roles}</optgroup><optgroup label="具体成员（到人）">${members}</optgroup>`;
}

/** 单条待落实行（已有） */
function _rowHtml(f, { canManage }) {
  const done = f.status === FOLLOWUP_STATUS.COMPLETED;
  const act = canManage
    ? (done
      ? `<button type="button" class="fu-act shrink-0 text-[11px] px-2 py-0.5 rounded-lg border border-gray-200 text-gray-500 hover:text-amber-700 hover:border-amber-200" data-act="reopen" data-fid="${esc(f.id)}" title="误销项可恢复为待落实">恢复</button>`
      : `<button type="button" class="fu-act shrink-0 text-[11px] px-2 py-0.5 rounded-lg text-white font-medium bg-green-600 hover:bg-green-700" data-act="complete" data-fid="${esc(f.id)}" title="确认该项已落实（销项，责任人跟进待办同步完成）">销项</button>`)
    : '';
  return `
    <div class="fu-row flex items-start gap-2 rounded-lg bg-gray-50 px-2.5 py-1.5 mb-1.5 text-xs">
      <span class="mt-1 inline-block w-1.5 h-1.5 rounded-full flex-shrink-0 ${done ? 'bg-green-500' : 'bg-amber-400'}"></span>
      <div class="flex-1 min-w-0">
        <div class="text-gray-800 ${done ? 'line-through text-gray-400' : ''}">${esc(f.item)}</div>
        <div class="text-gray-400 mt-0.5">责任人：${esc(ownerLabelOf(f))} · 时限：${esc(f.deadline)}${done && f.completedAt ? ` · 已落实：${esc(String(f.completedAt).slice(0, 10))}` : ''}</div>
      </div>
      ${act}
    </div>`;
}

/** 单条决议（已通过议程项）的落实卡 HTML */
function _cardHtml(activity, item, { canManage }) {
  const followups = Array.isArray(item.followups) ? item.followups : [];
  const doneCount = followups.filter((f) => f.status === FOLLOWUP_STATUS.COMPLETED).length;
  const chip = followups.length > 0
    ? `<span class="text-[10px] px-1.5 py-0.5 rounded-full ${doneCount === followups.length ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}">落实 ${doneCount}/${followups.length}</span>`
    : '';
  const rows = followups.length > 0
    ? followups.map((f) => _rowHtml(f, { canManage })).join('')
    : `<div class="text-[11px] text-gray-400 mb-1.5">决议已通过；如需跟踪落实，请在下栏添加「待落实」项（责任人＋时限）。</div>`;
  const addForm = canManage ? `
    <div class="mt-2 pt-2 border-t border-dashed border-gray-200 flex flex-col gap-1.5">
      <div class="flex flex-wrap items-center gap-1.5">
        <input class="fu-new-item rounded-lg border border-gray-200 px-2 py-1.5 text-xs bg-white min-w-[180px] flex-1" placeholder="待落实事项，如：补充××材料" />
        <select class="fu-new-owner rounded-lg border border-gray-200 px-2 py-1.5 text-xs bg-white min-w-[140px]"><option value="">责任人…</option>${_ownerOptionsHtml()}</select>
        <input type="date" class="fu-new-deadline rounded-lg border border-gray-200 px-2 py-1.5 text-xs bg-white" title="落实时限" />
        <button type="button" class="fu-add px-2.5 py-1.5 rounded-lg text-xs font-medium text-white bg-red-600 hover:bg-red-700">添加待落实</button>
      </div>
      <p class="text-[10px] text-gray-400">保存即生成责任人跟进待办：到期当天可见（催办），逾期自动进书记台待办督办。</p>
    </div>` : '';
  return `
    <div class="fu-card rounded-xl border border-gray-200 bg-white p-3.5 mt-3" data-activity-id="${esc(activity.id)}" data-item-id="${esc(item.id)}">
      <div class="flex items-center gap-2 mb-2 flex-wrap">
        <p class="font-title-cn text-xs font-bold text-gray-800">决议落实：${esc(item.item || '(未命名议题)')}</p>
        ${chip}
      </div>
      ${rows}
      ${addForm}
    </div>`;
}

/**
 * 生成决议落实区 HTML（仅展示 result='passed' 的议程项；无已通过决议返回空串）
 * @param {{activity:Object, canManage:boolean}} opts
 */
export function resolutionFollowupSectionHtml({ activity, canManage = false }) {
  if (!activity || !Array.isArray(activity.agenda)) return '';
  const passedItems = activity.agenda.filter((a) => a && a.result === 'passed' && a.id);
  if (passedItems.length === 0) return '';
  return `
    <div class="mt-3 pt-3 border-t border-gray-100">
      <p class="text-[10px] text-gray-400 mb-1">决议待落实 · 自动督办（生成跟进任务 → 到期催办 → 逾期进书记待办）</p>
      ${passedItems.map((item) => _cardHtml(activity, item, { canManage })).join('')}
    </div>`;
}

/**
 * 绑定决议落实区事件（保存/销项/恢复 → 服务层落库 → onChanged 重绘）
 * @param {{root:HTMLElement, activity:Object, canManage:boolean, onChanged:()=>void}} opts
 */
export function bindResolutionFollowupSection({ root, activity, canManage = false, onChanged }) {
  if (!root || !canManage || !activity) return;
  const cards = root.querySelectorAll('.fu-card');
  const currentUserId = AuthStore.getCurrentUser()?.personId || null;

  cards.forEach((card) => {
    const activityId = card.dataset.activityId;
    const agendaItemId = card.dataset.itemId;
    const agendaItem = (activity.agenda || []).find((i) => i.id === agendaItemId);
    if (!agendaItem) return;

    // 销项 / 恢复
    card.querySelectorAll('.fu-act').forEach((btn) => {
      btn.addEventListener('click', async () => {
        if (btn.dataset.processing === '1') return;
        btn.dataset.processing = '1';
        btn.disabled = true;
        try {
          const followupId = btn.dataset.fid;
          if (btn.dataset.act === 'complete') {
            await completeFollowup({ activityId, agendaItemId, followupId, actorId: currentUserId });
            showToast('success', '已销项：该决议待落实完成');
          } else {
            await reopenFollowup({ activityId, agendaItemId, followupId, actorId: currentUserId });
            showToast('success', '已恢复为待落实');
          }
          if (typeof onChanged === 'function') onChanged();
        } catch (e) {
          console.warn('[followup] 销项/恢复失败', e);
          showToast('error', (e && e.message) || '操作失败，请重试');
          btn.dataset.processing = '';
          btn.disabled = false;
        }
      });
    });

    // 添加待落实
    const addBtn = card.querySelector('.fu-add');
    if (addBtn) {
      addBtn.addEventListener('click', async () => {
        if (addBtn.dataset.processing === '1') return;
        const itemText = card.querySelector('.fu-new-item').value.trim();
        const ownerVal = card.querySelector('.fu-new-owner').value;
        const deadline = card.querySelector('.fu-new-deadline').value;
        if (!itemText) { showToast('warn', '请填写待落实事项'); return; }
        if (!ownerVal) { showToast('warn', '请选择责任人'); return; }
        if (!deadline) { showToast('warn', '请选择落实时限'); return; }
        const [ownerType, ownerId] = ownerVal.split(':');
        addBtn.dataset.processing = '1';
        addBtn.disabled = true;
        try {
          const existing = Array.isArray(agendaItem.followups) ? agendaItem.followups : [];
          await saveFollowups({
            activityId,
            agendaItemId,
            followups: [...existing, { item: itemText, ownerType, ownerId, deadline }],
            actorId: currentUserId,
          });
          showToast('success', '已生成跟进任务（责任人待办已同步）');
          if (typeof onChanged === 'function') onChanged();
        } catch (e) {
          console.warn('[followup] 添加待落实失败', e);
          showToast('error', (e && e.message) || '保存失败，请重试');
          addBtn.dataset.processing = '';
          addBtn.disabled = false;
        }
      });
    }
  });
}
