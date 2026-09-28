// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  server/routes/resources/approval-gates.js —— **活动批准门**（服务端状态转移门 + 绕行路径收口）
//  判据单一源＝ docs/src/services/activity/activity.js（自带 import 随块搬迁）。
// ════════════════════════════════════════════════════════════════

import { listTable } from './store.js';

// ════════════════════════════════════════════════════════════════
//  活动批准门的**服务端**状态转移门（2026-09-22 批次 151 · 支书裁定「加一道」）
// ════════════════════════════════════════════════════════════════
// 支书裁定（2026-09-22，逐字）：「加一道（推荐）」——选项说明逐字：「现在"只在前端判状态"，直调 API 可以
//   绕过这道门（数据能对上，但不严谨）。」
// 为什么落在**既有 PATCH 上判状态转移**（而不另开专用审批端点）：前端写入链早已收敛到
//   `docs/src/services/activity/activity.js::approveActivity / rejectActivity` 两枚写口（二者产出的补丁天然带
//   `status` ＋ `approval` 语义）⇒ 在 PATCH 上加一条**状态转移判据**即可一一对应、不必新增端点与适配器方法；
//   且门是**叠加**在既有角色门之后的第二道（角色门答「谁能写活动」，本门答「谁能把待批改成已发布/已取消」）。
// 判据（单一源＝`docs/src/services/activity/activity.js::canApproveActivity` / `PENDING_APPROVAL_STATUS`，勿在此另写）：
//   · 既有行**不是** `pending-approval` ⇒ 不拦（本门只管批准门这道关）；
//   · 补丁仍把状态留在 `pending-approval` ⇒ 不拦（没改状态）；
//   · 离开待批态 ⇒ 必须**带批准语义**（发布＝`approval.state='approved'`；终止＝`'rejected'`）**且**写者角色
//     符合**该活动上固化的档位**（`prevRow.approval.mode`，不采信补丁自述的 `mode`——否则持支委身份者可
//     自选「支委会」档把自己那一票放行）——否则 403。
// ⚠ **批次 152 已收口**：`POST /api/v1/snapshot`（整表写穿）与 `POST /api/v1/activities`（直建）两条绕行路径
//   已按支书 2026-09-22 裁定「一并堵上」处置，见文末「活动批准门的两条绕行路径收口」段（快照口**只拦状态迁移**、
//   其余整表写入照旧放行）。
// ⚠ 本块（含 import）置于文件末尾：**不改动上文任何行号**——README-server.md 里有 380 处 `文件:行号` 引用
//   指向本文件（`doc-line-ref` 守卫逐条核），插入一行即整段漂移；ESM 的 import 声明在模块顶层任意位置均被提升，
//   置末尾不影响语义（本项目既有同法：`services/activity/decision-tree.js` 用动态 import 保行号）。
import { canApproveActivity, PENDING_APPROVAL_STATUS, pendingApprovalPatchOnWrite } from '../../../docs/src/services/activity/activity.js';

/** 批准门状态转移拦截文案 */
const ACTIVITY_APPROVAL_TRANSITION_DENY_MSG = '无权限：该活动处于「待批」，不得直接改为发布/取消——须经批准（补丁须携带批准语义 approval.state）';
const ACTIVITY_APPROVAL_ROLE_DENY_MSG = '无权限：当前批准档位下你无权批准/驳回该活动';

/**
 * 批准门状态转移门（**纯判定**）：允许 → null；拦截 → 403 文案。
 * @param {Object} prevRow 既有活动行（未合并前的库内值）
 * @param {Object} body 本次 PATCH 补丁
 * @param {{role?:string}} actor 写者（requireAuth 注入）
 * @returns {string|null}
 */
export function _activityApprovalGateDeny(prevRow, body, actor) {
  if (!prevRow || prevRow.status !== PENDING_APPROVAL_STATUS) return null;
  const patch = (body && typeof body === 'object' && !Array.isArray(body)) ? body : {};
  const nextStatus = patch.status !== undefined ? patch.status : prevRow.status;
  if (nextStatus === PENDING_APPROVAL_STATUS) return null;
  const appr = (patch.approval && typeof patch.approval === 'object') ? patch.approval : {};
  const hasSemantics = (nextStatus === 'published' && appr.state === 'approved')
    || (nextStatus === 'cancelled' && appr.state === 'rejected');
  if (!hasSemantics) return ACTIVITY_APPROVAL_TRANSITION_DENY_MSG;
  const rowMode = prevRow.approval && prevRow.approval.mode; // 档位以活动上固化的为准（不采信补丁自述）
  if (!canApproveActivity(actor && actor.role, rowMode)) return ACTIVITY_APPROVAL_ROLE_DENY_MSG;
  return null;
}

// ════════════════════════════════════════════════════════════════
//  活动批准门的两条绕行路径收口（2026-09-22 批次 152 · 支书裁定「一并堵上」）
// ════════════════════════════════════════════════════════════════
// 支书裁定（2026-09-22，逐字）：「一并堵上（推荐）」——选项说明逐字：「一并堵上，把这道理做严（现在要绕过还是能绕）。」
// 收口两条（批次 151 如实登记的两处未堵）：
//   ① `POST /api/v1/snapshot`（整表写穿通道）——**只拦「不该发生的状态迁移」**：库内行本是 `pending-approval`、
//      本次快照把它改成 `published`/`cancelled` 而**未携带批准语义**（或写者角色不符合该活动固化的档位）⇒ 403。
//      **其余整表写入一律照旧放行**——这张口是前端全部状态同步的落库目标（`data-adapter.js::persist` →
//      `_flushSnapshot` 的脏集合快照），堵过头会把正常同步打瘫；正常同步里不可能出现「待批→发布」而无批准语义的行。
//      判据**逐行复用上面那道 PATCH 门 `_activityApprovalGateDeny`**（喂「库内行 vs 快照行」），**不另写第二套判据**。
//   ② `POST /api/v1/activities`（直建通道）——**档位开启时**按写入链同一补丁落 `pending-approval`（不再由调用方
//      自定「已发布」）；**档位关闭（默认）时一字不改**（原样写入，零行为变化）。
// 档位／补丁怎么取（与写入链同源）：补丁形状单一源＝`docs/src/services/activity/activity.js::pendingApprovalPatchOnWrite`；
//   档位取值＝该支部 `config.policyOverrides.activityApproval.mode`——与前端读侧注入 `applyBranchPolicyOverrides`
//   落进 `POLICY_DEFAULTS` 的是**同一个白名单键**（`core/policy-defaults.js::POLICY_OVERRIDABLE`），
//   **不在服务端另造档位映射 / 阈值**。
// ⚠ 本段（含上一行 import 的追加）置于文件末尾：不改动上文任何行号（理由同上一段）。

/**
 * 快照口的状态迁移门（**纯判定**）：允许 → null；拦截 → 403 文案。
 * 只管「库内已有且处于待批」的活动行；新建行（创建口见 `_activityCreateGatePatch`）/ 未变行 / 非待批行一律放行。
 * 判据逐行复用 `_activityApprovalGateDeny`（与 PATCH 门同一份，勿另写）。
 * @param {Object} db better-sqlite3 实例
 * @param {Object} payload 快照 payload
 * @param {{role?:string}} actor 写者（requireAuth 注入）
 * @returns {string|null}
 */
export function _snapshotActivityApprovalGateDeny(db, payload, actor) {
  const rows = (payload && Array.isArray(payload.activities)) ? payload.activities : null;
  if (!rows) return null;
  const prevById = new Map(listTable(db, 'activities').map(r => [r.id, r]));
  for (const row of rows) {
    if (!row || typeof row !== 'object') continue;
    const prevRow = prevById.get(row.id);
    if (!prevRow) continue;
    const deny = _activityApprovalGateDeny(prevRow, row, actor);
    if (deny) return deny;
  }
  return null;
}

/**
 * 直建口的写入态改写（**纯判定**）：档位开启 ⇒ 写入补丁（待批 ＋ 批准轨迹）；关闭 / 非法档 ⇒ null（原样写入）。
 * 档位读该支部 `config.policyOverrides.activityApproval.mode`（支部查不到 → 'off'）；补丁形状取自
 * `activity.js::pendingApprovalPatchOnWrite`（单一源，勿在此另写 `status` / `approval` 字面量）。
 * @param {Object} db better-sqlite3 实例
 * @param {{branchId?:string}} actor 写者
 * @returns {Object|null}
 */
export function _activityCreateGatePatch(db, actor) {
  let mode = 'off';
  try {
    const row = db.prepare('SELECT data FROM branches WHERE id = ?').get((actor && actor.branchId) || 'br-b1');
    const cfg = row ? JSON.parse(row.data).config : null;
    mode = (cfg && cfg.policyOverrides && cfg.policyOverrides.activityApproval
      && cfg.policyOverrides.activityApproval.mode) || 'off';
  } catch { mode = 'off'; }
  return pendingApprovalPatchOnWrite(mode);
}

