// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  service.work-assignment.js — 活动「工作分工」记录（服务端表 `assignments`）**统一读写口**
//  2026-10-03 批次 359（`D-750` 续答）：支书裁「落点＝**活动详情页新增一块**」＋「程度＝**全 CRUD**」。
//
//  ⚠ **术语（`D-750` 术语禁令）**：本面＝**项目分工 / 事上见**——按活动呈现的一件件具体工作；
//    **不得**称「常备性分工」（支书自造、明令不用）。它与「**支部分工**」（＝分管工作、粗）**不是一回事**。
//  ⚠ **与活动内联的 `activity.assignments` 不是同一份数据**：内联那份是**项目角色数组**
//    （`[{personId, role}]`，答「谁在这个项目里是什么角色」，见 `README-server.md §4.1`）；
//    本表行＝**一件具体工作**：`{ id, activityId, workName, workDescription, ddl, assigneeId, status, createdBy, createdAt }`（§4.7）。
//
//  写口形态与 `services/governance/soft-void.js` 同款：`getAdapter().assignments.*` → 同步 `mockDB` → `persist()`，
//  且**不假设适配器返回形状**（`MockAdapter.create` 自己会改 `mockDB`，故本地按 id 幂等合并）。
// ════════════════════════════════════════════════════════════════
import { mockDB } from '../../core/domain/domain.js?v=20261005h';
import { getAdapter, persist } from '../../data/data-adapter.js?v=20261005h';
import { generateId } from '../../core/base/id.js?v=20261005h';
import { isActivityOrganizerIn } from './activity.js?v=20261005h';
import { BRANCH_COMMISSION_ROLES } from '../../core/domain/constants.js?v=20261005h';

export const WORK_ASSIGNMENT_STATUS = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
};
export const WORK_ASSIGNMENT_STATUS_LABELS = {
  pending: '待办',
  in_progress: '进行中',
  completed: '已完成',
};

/**
 * 谁能编本场的「工作分工」：**本场组织者** ∪ **支委层**。
 * 判据单一源——组织者用 `services/activity/activity.js::isActivityOrganizerIn`（不另写一份），
 * 支委层用 `BRANCH_COMMISSION_ROLES`（不另列名单）。**呈现与放行共用本函数**。
 */
export function canManageWorkAssignments(activity, personId, role) {
  if (!activity) return false;
  if (BRANCH_COMMISSION_ROLES.includes(role)) return true;
  return !!personId && isActivityOrganizerIn(activity, personId);
}

/** 本场的工作分工行（读口；按创建先后） */
export function listWorkAssignments(activityId) {
  return (mockDB.assignments || []).filter((r) => r.activityId === activityId);
}

/** 把适配器返回 / 本地合成的一行写回 `mockDB`（**幂等**：同 id 覆盖，不重复追加）并落盘 */
function _commit(rec) {
  const rows = mockDB.assignments || [];
  const idx = rows.findIndex((r) => r.id === rec.id);
  mockDB.assignments = idx >= 0
    ? [...rows.slice(0, idx), rec, ...rows.slice(idx + 1)]
    : [...rows, rec];
  persist();
  return rec;
}

/**
 * 新增一件工作（**C**）。`workName` 必填（**无工作名不成一行**——这是与「占位」的分野）；
 * 其余字段可空，`status` 缺省 `pending`、`createdBy` 记操作人。
 * @returns {Promise<object|null>} 落库后的记录；`null`＝未通过前置（工作名为空）
 */
export async function createWorkAssignment({
  activityId, workName, workDescription = '', ddl = '', assigneeId = '', createdBy = '',
} = {}) {
  const name = String(workName || '').trim();
  if (!name) return null;
  const record = {
    id: generateId('asgn'),
    activityId,
    workName: name,
    workDescription: String(workDescription || '').trim(),
    ddl: ddl || '',
    assigneeId: assigneeId || '',
    status: WORK_ASSIGNMENT_STATUS.PENDING,
    createdBy: createdBy || '',
    createdAt: new Date().toISOString(),
  };
  const res = await getAdapter().assignments.create(record);
  const isRecord = res && typeof res === 'object' && !Array.isArray(res) && res.id;
  return _commit(isRecord ? res : record);
}

/**
 * 改一件工作（**U**）：只接受**白名单字段**的 patch（工作名 / 描述 / 截止 / 负责人 / 状态），
 * 其余键（`id` / `activityId` / `createdAt` / `createdBy`）一律不采信（防误改主键与溯源）。
 * @returns {Promise<object|null>} `null`＝记录不存在或工作名被改成空
 */
export async function updateWorkAssignment(id, patch = {}) {
  const rows = mockDB.assignments || [];
  const cur = rows.find((r) => r.id === id);
  if (!cur) return null;
  const next = {};
  for (const k of ['workName', 'workDescription', 'ddl', 'assigneeId', 'status']) {
    if (k in patch) next[k] = patch[k];
  }
  if ('workName' in next) {
    next.workName = String(next.workName || '').trim();
    if (!next.workName) return null; // 工作名不得改成空（同新增口径）
  }
  if ('workDescription' in next) next.workDescription = String(next.workDescription || '').trim();
  if (next.status && !Object.values(WORK_ASSIGNMENT_STATUS).includes(next.status)) delete next.status;
  if (next.status === WORK_ASSIGNMENT_STATUS.COMPLETED) next.completedAt = new Date().toISOString();
  else if ('status' in next) next.completedAt = null;
  const res = await getAdapter().assignments.update(id, next);
  const isRecord = res && typeof res === 'object' && !Array.isArray(res) && res.id === id;
  return _commit(isRecord ? res : { ...cur, ...next });
}

/**
 * 删一件工作（**D**）。⚠ 这里是**真删**（不是「作废（软）」，那是另一族机制 `services/governance/soft-void.js`）——
 * 本表是**安排性记录**（「这件活谁干」），排错了就该删；`D-750` 续答的「全 CRUD」含 D。
 * @returns {Promise<boolean>} 是否删掉了一行
 */
export async function removeWorkAssignment(id) {
  const rows = mockDB.assignments || [];
  if (!rows.some((r) => r.id === id)) return false;
  await getAdapter().assignments.delete(id);
  mockDB.assignments = (mockDB.assignments || []).filter((r) => r.id !== id);
  persist();
  return true;
}
