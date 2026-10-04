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
//  ⚠ **落点逐批开**：批次 346 开 **`makeupTasks`**（纪检台「考勤管理 → 补课」）样板；
//    批次 352（`D-746`）续开 **`imageRecords`（宣传台照片墙）· `weeklyReports`（宣传台报送历史）·
//    `experienceDeposits`（纪检台复盘台「已沉淀」清单）** 三张；
//    **余 2 张（`externalDispatches` / `tasks`）** 的读面受限随批次 352b 另办——
//    `externalDispatches` 的既有读面落在**禁改文件**（支书台「全局概况」）须特批或另择承载，
//    `tasks` 须先定「作废一条 SOP 派生任务」的语义（见 `.ctx/REVIEW_QUEUE.md`）。
// ════════════════════════════════════════════════════════════════
import { mockDB } from '../../core/domain/domain.js?v=20261004j';
import { getAdapter, persist } from '../../data/data-adapter.js?v=20261004j';

/** 登记「可软作废」的资源：key ＝ 资源名（**同时是 `getAdapter()` 的键与 `mockDB` 的域键**，六张业务表三者同名） */
export const SOFT_VOID_RESOURCES = {
  makeupTasks: {
    storeKey: 'makeupTasks',
    label: '补课任务',
    ownerRole: 'disc-commissioner',       // 责任人角色（支书台待确认组行上的角色胶囊）
    titleOf: (r) => r.activityName || r.id,
  },
  // ── 批次 352（`D-746` · `D-744`② 业务过程类余项）──
  imageRecords: {
    storeKey: 'imageRecords',
    label: '照片',
    ownerRole: 'prop-commissioner',
    titleOf: (r) => r.title || r.fileName || r.id,
  },
  weeklyReports: {
    storeKey: 'weeklyReports',
    label: '周报',
    ownerRole: 'prop-commissioner',
    titleOf: (r) => r.week || r.id,
  },
  experienceDeposits: {
    storeKey: 'experienceDeposits',
    label: '经验沉淀',
    ownerRole: 'disc-commissioner',
    titleOf: (r) => r.title || r.id,
  },
  // ── 批次 352b（`D-746` · 余 2 张之一）──
  //   `externalDispatches` 的既有列表面（「文件流外发确认」）在**禁改文件**（概况侧）⇒ 本批**不改它**，
  //   改由**服务层读口** `loadActiveDispatches()` 统一出列（发送方与接收方同时不再显示），
  //   作废键落在**记录产生地**＝宣传台「档案归档」行内外发单元。
  externalDispatches: {
    storeKey: 'externalDispatches',
    label: '外发记录',
    ownerRole: 'prop-commissioner',
    titleOf: (r) => r.refLabel || r.id,
  },
  // 批次 352b（`D-746` · 余 2 张之二）：文书台/组长台可见的那条 SOP 派生任务「作废（软）」。
  //   支书 2026-10-03 取「**活动详情页行内作废**」⇒ 读面＝活动详情页「任务清单」（`components/record/inspector.js`），
  //   读侧出列点＝`services/core/mock.js::listTasks()`（voided 不进 `state.tasks`）⇒ 活动进度推导随之外列。
  tasks: {
    storeKey: 'tasks',
    label: '任务',
    ownerRole: 'secretary',
    titleOf: (r) => r.title || r.id,
  },
  // ── 批次 358（`D-751` · C 档 2 张）──
  //   支书 2026-10-03 取「**补「作废（软）」**」⇒ 两张各补一条，**口径完全沿用本表既有机制**。
  //   落点＝**记录产生地 / 管理面**：
  //     · `signups` ⇒ 活动详情页与专班详情页**共用组件** `components/governance/signup-panel.js`
  //       的「**已通过名单**」行内（待审核行已有「通过 / 拒绝」，语义已覆盖 ⇒ 不另加键；
  //       读侧出列点＝`services/activity/signup.js::SignupStore.getAll()` 与 `today-summary.js`）。
  //     · `propTasks` ⇒ 宣传台「宣传任务」卡行内（读侧出列点＝该 tab 的 `_activePropTasks()`）。
  signups: {
    storeKey: 'signups',
    label: '报名记录',
    ownerRole: 'org-commissioner',
    titleOf: (r) => `${r.sourceType === 'taskforce' ? '专班' : '活动'}报名 · ${r.sourceId || r.id}`,
  },
  propTasks: {
    storeKey: 'propTasks',
    label: '宣传任务',
    ownerRole: 'prop-commissioner',
    titleOf: (r) => r.summary || r.id,
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

/** 统一写口：改记录 → 同步 `mockDB` → `persist()`（`null` 返回＝记录不存在，不动本地）
 *  ⚠ **不假设适配器 `update` 的返回形状**（批次 352b 实读教训）：`MockAdapter.tasks.update` 历史上返回
 *    **整个数组**（与旧 `mock.js` 同款），若照抄返回值回填就会把该行替换成一个数组；故**先判**返回值是否为
 *    「该记录对象」，不是则**按 patch 在本地合成**（mock 形态 mockDB 即源；api 形态服务端已落 patch）。 */
async function _write(resource, id, patch) {
  const res = await getAdapter()[resource].update(id, patch);
  const rows = _rowsOf(resource);
  const idx = rows.findIndex((r) => r.id === id);
  const isRecord = res && typeof res === 'object' && !Array.isArray(res) && res.id === id;
  const next = isRecord ? res : (idx >= 0 ? { ...rows[idx], ...patch } : null);
  if (!next) return null;
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
