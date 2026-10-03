// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  service.soft-void.js — 业务记录「作废（软）」统一写口
//  2026-10-02 批次 346 · 支书 `D-744`②「业务过程类补『作废·停用』软入口（走审批门，同 #1 已落口径）」。
//
//  口径（与 `#1` 待办作废逐条对齐 · `D-742`）：
//    · **软作废、不硬删**——只给记录打 `voided`（含原因 / 申请人 / 时间 / 确认人），其余字段一字不动；
//    · **走审批门**——责任人 `requestVoid`（写 `voidPending`、记录**不出列**、带「待支委会确认」），
//      支委层在**支书台「待办 → 待办作废待确认」**面 `confirmVoid`（落 `voided`、出列）或 `rejectVoid`（回原状）；
//      **支委层**亦可 `confirmVoid` 直接作废（跳过申请）。**全程不硬删、各档皆留痕。**
//    · **读侧过滤**——各表用 `filterActive(resource, rows)` 把 `voided` 挡在默认列表外（留痕仍可回查）。
//
//  写口形态与 `services/branch/branch.js::renameBranch` / `services/governance/todo.js` 同款：
//    `getAdapter()[resource].update` → 本地 `mockDB` 同步 → `persist()`（mock 与 api 两形态同码）。
//
//  ⚠ **落点逐批开**：本批（346）只开 **`makeupTasks`（纪检台「考勤管理 → 补课」）** 一张样板；
//    其余 5 张（`imageRecords` / `weeklyReports` / `externalDispatches` / `experienceDeposits` / `tasks`）
//    按同一注册表逐批加——**部分表当前没有「列出行」的表面**，落点须先与支书定，见 `.ctx/REVIEW_QUEUE.md`。
// ════════════════════════════════════════════════════════════════
import { mockDB } from '../../core/domain/domain.js?v=20261003d';
import { getAdapter, persist } from '../../data/data-adapter.js?v=20261003d';

/** 登记「可软作废」的资源：key ＝ 资源名（**同时是 `getAdapter()` 的键与 `mockDB` 的域键**，六张业务表三者同名） */
export const SOFT_VOID_RESOURCES = {
  makeupTasks: {
    storeKey: 'makeupTasks',
    label: '补课任务',
    ownerRole: 'disc-commissioner',       // 责任人角色（支书台待确认组行上的角色胶囊）
    titleOf: (r) => r.activityName || r.id,
  },
};

function _def(resource) {
  const d = SOFT_VOID_RESOURCES[resource];
  if (!d) throw new Error(`soft-void：未登记的资源「${resource}」`);
  return d;
}

function _rowsOf(resource) {
  const d = _def(resource);
  return mockDB[d.storeKey] || [];
}

/** 读侧过滤：默认列表把 `voided` 挡在外面（作废＝不办了、从列表消失；留痕仍可回查） */
export function filterActive(resource, rows) {
  return (rows || []).filter((r) => !r.voided);
}

/** 某资源待确认的作废申请（已申请、尚未裁决） */
export function listPending(resource) {
  return _rowsOf(resource).filter((r) => r.voidPending && !r.voided);
}

/** 全部资源待确认的作废申请——映射成**支书台「待办作废待确认」组可直接消费的形状**
 *  （`id` 用 `"<资源>:<记录id>"` 前缀编码，裁决时据 `parseRecordVoidId` 路由回本模块）。 */
export function listVoidPending() {
  const out = [];
  for (const [resource, d] of Object.entries(SOFT_VOID_RESOURCES)) {
    for (const r of listPending(resource)) {
      out.push({
        id: `${resource}:${r.id}`,
        title: `${d.label} · ${d.titleOf(r)}`,
        role: d.ownerRole,
        voidPending: r.voidPending,
      });
    }
  }
  return out;
}

/** `"<资源>:<记录id>"` → `{ resource, id }`；非本模块形状返回 `null`（供裁决派发分流） */
export function parseRecordVoidId(id) {
  const s = String(id || '');
  const i = s.indexOf(':');
  if (i <= 0) return null;
  const resource = s.slice(0, i);
  if (!SOFT_VOID_RESOURCES[resource]) return null;
  return { resource, id: s.slice(i + 1) };
}

/** 统一写口：改记录 → 同步 `mockDB` → `persist()`（`null` 返回＝记录不存在，不动本地） */
async function _write(resource, id, patch) {
  const next = await getAdapter()[resource].update(id, patch);
  if (!next) return null;
  const rows = _rowsOf(resource);
  const idx = rows.findIndex((r) => r.id === id);
  if (idx >= 0) mockDB[_def(resource).storeKey] = [...rows.slice(0, idx), next, ...rows.slice(idx + 1)];
  persist();
  return next;
}

/** 责任人发起作废申请（审批门第一段；`reason` 必填——无原因不得作废，与「完成」的分野） */
export async function requestVoid(resource, id, { reason, byPersonId } = {}) {
  const why = String(reason || '').trim();
  if (!why) return null;
  return _write(resource, id, {
    voidPending: { reason: why, byPersonId: byPersonId || '', at: new Date().toISOString() },
  });
}

/** 确认作废（支委层；可直接对未申请的记录调用＝直接作废）。原因优先取申请、缺则用 `note`。 */
export async function confirmVoid(resource, id, { byPersonId, note } = {}) {
  const cur = _rowsOf(resource).find((r) => r.id === id);
  if (!cur) return null;
  const pend = cur.voidPending || null;
  const reason = String((pend && pend.reason) || note || '').trim();
  if (!reason) return null; // 同理：无原因不作废
  return _write(resource, id, {
    voidPending: null,
    voided: {
      reason,
      byPersonId: (pend && pend.byPersonId) || '',
      at: (pend && pend.at) || new Date().toISOString(),
      confirmedBy: byPersonId || '',
      confirmedAt: new Date().toISOString(),
    },
  });
}

/** 驳回作废申请（支委层）：撤销 `voidPending`、记录回原状并留一行驳回记录 */
export async function rejectVoid(resource, id, { byPersonId, note } = {}) {
  const cur = _rowsOf(resource).find((r) => r.id === id);
  if (!cur) return null;
  const pend = cur.voidPending || null;
  return _write(resource, id, {
    voidPending: null,
    voidRejected: pend
      ? {
        reason: pend.reason,
        byPersonId: pend.byPersonId,
        at: pend.at,
        rejectedBy: byPersonId || '',
        rejectedAt: new Date().toISOString(),
        note: String(note || ''),
      }
      : null,
  });
}
