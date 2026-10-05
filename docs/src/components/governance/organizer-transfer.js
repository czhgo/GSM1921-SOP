// role: [工程师]+[AI]
// components/governance/organizer-transfer.js — 「转交组织者」（活动 / 专班共用）
//
// 依据（2026-10-01 **批次 327**）：`SOP-G-2-②` 母本《常见工作场景快速指南》`:125`「**组织者退出需经
//   支委会确定好接手的组织者并负责地完成工作交接后方可退出**」；支书 2026-10-01 裁 **「乙：直接转交 ＋
//   留痕」**（**不走「先上会再转交」那条重链**）＋ 可发起人 **「丙：支书 / 副支书 / 组织委员 /
//   现任组织者本人」**。同批 `SOP-G-2-③④⑤` 已裁「暂不进系统」；本件只做 ②。
//
// **单一源**：**判据**（谁能转交）与**写口**（转交给谁、怎么落）都只在本文件出现一次；各宿主面
//   （活动详情页 / 支书台活动详情面板 / 专班详情）只调 `openOrganizerTransfer()` 并把 `onDone` 挂上。
// **留痕**＝**不新造第二套台账**：复用 `AuthStore.syncProjectRoles` 的既有三合一
//   （写主源 assignments/members ＋ 追加审计快照「旧组织者 revoke ＋ 新人 grant，各带操作人与日期」＋
//   通知被赋权人）。⇒ 「退出与接手人」两者都在既有审计链里可查。
// **不改权限门**：本件不新增任何写权限——能否转交由本文件判据决定，底层写入仍走既有写口。

import { openModal, closeModal } from '../ui/modal.js?v=20261005l';
import { PersonPicker } from './pickers.js?v=20261005l';
import { AuthStore } from '../../services/core/auth.js?v=20261005l';
import { getPersonName } from '../../services/member/person.js?v=20261005l';
import { showToast, escHtml } from '../../core/base/utils.js?v=20261005l';
import { mockDB } from '../../core/domain/domain.js?v=20261005l';
// 「做事即销待办」：转交完成＝本对象已完成「指定组织者」这件事 ⇒ 与两处既有「保存角色」同款，
//   销掉该对象的赋权待办（`TodoSourceType.ACTIVITY` / `TASKFORCE`）——**不一致会留下悬空待办**。
import { TodoStore, TodoSourceType } from '../../services/governance/todo.js?v=20261005l';
// 通知**被退出的原组织者**（2026-10-01 批次 330 · 支书裁「补：通知原组织者」）：走系统派生通知单一源
//   （kind `organizer-transferred`，服务端按注册表复算授权；受众＝到人定向，文案/落点在模板单一源）。
import { NoticeStore } from '../../services/governance/notice.js?v=20261005l';

/** 可发起「转交组织者」的角色 —— **单一源**（支书 / 副支书 / 组织委员；现任组织者本人另按人判，见下） */
const TRANSFER_ROLES = ['secretary', 'deputy-secretary', 'org-commissioner'];

/** 取该对象（活动 / 专班）的项目角色行（organizer / deep） */
function _projOf(subject, scopeRef) {
  if (subject === 'taskforce') {
    const tf = (mockDB.taskforces || []).find(t => t.id === scopeRef);
    return tf ? (tf.members || []).filter(m => m && (m.role === 'organizer' || m.role === 'deep')) : null;
  }
  const act = (mockDB.activities || []).find(a => a.id === scopeRef);
  return act ? (act.assignments || []).filter(x => x && (x.role === 'organizer' || x.role === 'deep')) : null;
}

/** 该场**现任组织者** personId（无则空串） */
export function organizerOf(subject, scopeRef) {
  const proj = _projOf(subject, scopeRef);
  if (!proj) return '';
  const row = proj.find(x => x.role === 'organizer');
  return row ? row.personId : '';
}

/**
 * 谁能发起「转交组织者」（**单一源**）：① 支书 / 副支书 / 组织委员；② **该场现任组织者本人**。
 * @param {'activity'|'taskforce'} subject
 * @param {string} scopeRef 活动 / 专班 ID
 * @param {string} personId 发起人 personId
 */
export function canTransferOrganizer(subject, scopeRef, personId) {
  if (!personId) return false;
  const me = AuthStore.getCurrentUser();
  if (me && TRANSFER_ROLES.includes(me.role)) return true;
  return organizerOf(subject, scopeRef) === personId;
}

/**
 * 直接转交（**立即生效**）：旧组织者退出、新人接手，经既有 `syncProjectRoles` 落主源 ＋ 留痕 ＋ 通知。
 * @param {{subject:'activity'|'taskforce', scopeRef:string, toPersonId:string, actorId:string}} o
 * @returns {Promise<{ok:boolean, reason?:string, from?:string, to?:string}>}
 */
export async function transferOrganizer({ subject, scopeRef, toPersonId, actorId }) {
  const proj = _projOf(subject, scopeRef);
  if (!proj) return { ok: false, reason: 'not-found' };
  const fromId = organizerOf(subject, scopeRef);
  if (!fromId) return { ok: false, reason: 'no-organizer' };
  if (!toPersonId) return { ok: false, reason: 'no-target' };
  if (fromId === toPersonId) return { ok: false, reason: 'same-person' };
  // 期望的角色表：原非组织者行保留（deep 等），旧组织者**退出**（整行去掉，不降级），新人接 organizer
  //   —— 新人若原本已是 deep，则去掉其 deep 行（一人只占一格）。
  const next = [
    ...proj.filter(x => x.role !== 'organizer' && x.personId !== toPersonId),
    { personId: toPersonId, role: 'organizer' },
  ];
  const r = await AuthStore.syncProjectRoles({ scopeRef, assignments: next, actorId });
  if (!r || (r.added === 0 && r.removed === 0)) return { ok: false, reason: 'no-change' };
  // 做事即销待办（口径同两处既有「保存角色」）：本对象的赋权待办随之销掉。
  TodoStore.completeBySource(subject === 'taskforce' ? TodoSourceType.TASKFORCE : TodoSourceType.ACTIVITY, scopeRef);
  // 知会**被退出的原组织者**（批次 330 · 支书裁「补：通知原组织者」· 文案取「知会 ＋ 交接提示」）：
  //   受众到人定向（只发给 fromId），不派生待办；失败只告警、不回滚转交（转交已生效，通知是附带动作）。
  try {
    NoticeStore.addSystem('organizer-transferred', scopeRef, {
      removedPersonId: fromId,
      fromName: getPersonName(fromId) || fromId,
      toName: getPersonName(toPersonId) || toPersonId,
      byName: actorId ? (getPersonName(actorId) || actorId) : '',
    });
  } catch (e) {
    console.warn('[organizer-transfer] 通知原组织者失败：', e);
  }
  return { ok: true, from: fromId, to: toPersonId };
}

const MODAL_ID = 'organizer-transfer';

/**
 * 「转交组织者」弹窗（选接手人 → 直接转交）。
 * @param {{subject:'activity'|'taskforce', scopeRef:string, subjectName?:string, onDone?:Function}} o
 */
export function openOrganizerTransfer({ subject, scopeRef, subjectName = '', onDone }) {
  const label = subject === 'taskforce' ? '专班' : '活动';
  const fromId = organizerOf(subject, scopeRef);
  const fromName = fromId ? (getPersonName(fromId) || fromId) : '—';
  let picker = null;
  openModal({
    id: MODAL_ID,
    title: `转交${label}组织者`,
    width: '460px',
    bodyHtml: `
      <p style="margin:0 0 10px;font-size:0.8rem;line-height:1.75;color:var(--neutral-700);">本${label}${subjectName ? `（${escHtml(subjectName)}）` : ''}现任组织者：<b>${escHtml(fromName)}</b>。选定接手人后<b>立即生效</b>——原组织者退出、新人接手，本${label}的任务与通知发布随之归到新人。</p>
      <div id="ot-picker-slot"></div>
      <p style="margin:10px 0 0;font-size:0.72rem;line-height:1.7;color:var(--neutral-500);">更换会记入本${label}的角色变更留痕（谁转给谁、何时），并通知接手人；这不改动任何权限。</p>
      <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:18px;">
        <button type="button" data-ot-cancel class="btn-outline text-xs px-3 py-1.5" style="cursor:pointer;">取消</button>
        <button type="button" data-ot-confirm class="btn-accent text-sm px-4 py-[7px] font-medium">转交</button>
      </div>`,
    onMount: (panel) => {
      const slot = panel.querySelector('#ot-picker-slot');
      if (slot) {
        picker = new PersonPicker({ mode: 'single', placeholder: '搜索姓名或学号选择接手人', onSelect: () => {} });
        picker.render(slot);
      }
      panel.querySelector('[data-ot-cancel]')?.addEventListener('click', () => closeModal(MODAL_ID));
      panel.querySelector('[data-ot-confirm]')?.addEventListener('click', async () => {
        const to = (picker?.getSelected() || [])[0] || '';
        if (!to) { showToast('error', '请选择接手人'); return; }
        closeModal(MODAL_ID);
        const r = await transferOrganizer({
          subject, scopeRef, toPersonId: to, actorId: AuthStore.getCurrentUser()?.personId,
        });
        if (r.ok) {
          showToast('success', `已转交：${getPersonName(r.from) || r.from} → ${getPersonName(r.to) || r.to}`);
          if (typeof onDone === 'function') onDone();
        } else {
          showToast('error', '转交未生效，请刷新后重试');
        }
      });
    },
  });
}
