// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  docs/src/data/activity-workgroup-sync.js — 活动 ↔ 工作组字段同步单一源（R9 Task 4.3）
// ════════════════════════════════════════════════════════════════
// 本文件是**无副作用纯数据模块**：不 import 任何模块、不读写存储，服务端（Node）与
//   mock 形态（浏览器）共用同一份字段映射。
//
// 口径：
//   · 活动是**业务事实**，工作组是**执行载体**；两者必须同源：
//     name / organizingScope / hostGroupId / hostGroup / recruitmentScope / crossGroupCoordinatorId
//     一律由活动派生，工作组侧不得各写一份。
//   · 归档（archived=true）或取消（status='cancelled'）⇒ 工作组状态必须为 `archived`
//     （closed 状态：成员 / 授权 / 任务 / 产出写口一律只读）。
//   · 其余编辑**不改**工作组状态（已归档的工作组不因一次改名被重新激活）。
// ════════════════════════════════════════════════════════════════

/**
 * 工作组稳定 id（R10-B07 单一源）：`wg-<kind>-<sourceId>`。
 * 活动/专班工作组主记录 id 一律由此派生，服务端路由、mock 适配器、种子同步同源；
 * ⚠ server/db.js 迁移内联拼法保留（历史迁移不可依赖业务模块），见该文件注释。
 * @param {'activity'|'taskforce'} kind
 * @param {string} sourceId
 * @returns {string|null}
 */
export function workgroupIdFor(kind, sourceId) {
  if (!kind || !sourceId) return null;
  return `wg-${kind}-${sourceId}`;
}

/** 活动对应的工作组 id（沿用既有 `wg-activity-<id>` 约定；活动行已带 workgroupId 时优先） */
export function activityWorkgroupId(activity) {
  if (!activity || !activity.id) return null;
  return activity.workgroupId || workgroupIdFor('activity', activity.id);
}

/**
 * 活动 → 工作组字段投影（纯函数）。
 * @param {Object} activity
 * @returns {{id:string,name:string,organizingScope:?string,hostGroupId:?string,hostGroup:string,recruitmentScope:string,crossGroupCoordinatorId:?string,status?:string}|null}
 */
export function syncActivityWorkgroup(activity) {
  const id = activityWorkgroupId(activity);
  if (!id) return null;
  const archived = activity.archived === true || activity.status === 'cancelled';
  return {
    id,
    name: activity.title || activity.id,
    organizingScope: activity.organizingScope || null,
    hostGroupId: activity.hostGroupId || null,
    hostGroup: activity.hostGroup || '',
    recruitmentScope: activity.recruitmentScope || 'group',
    crossGroupCoordinatorId: activity.crossGroupCoordinatorId || null,
    ...(archived ? { status: 'archived' } : {}),
  };
}

/**
 * mock 缓存侧应用同步（immutable）：更新既有工作组；`create=true` 时缺失则补建主记录。
 * @param {Array} workgroups mockDB.workgroups
 * @param {Object} activity
 * @param {{actorId?:string, at?:string, create?:boolean}} [opts]
 * @returns {Array} 新的 workgroups 数组（无变化时原样返回）
 */
export function applyActivityWorkgroupSync(workgroups, activity, opts = {}) {
  const patch = syncActivityWorkgroup(activity);
  if (!patch) return workgroups;
  const list = Array.isArray(workgroups) ? workgroups : [];
  const index = list.findIndex((row) => row && row.id === patch.id);
  const at = opts.at || new Date().toISOString();
  const actorId = opts.actorId || null;
  if (index === -1) {
    if (!opts.create) return list;
    return [...list, {
      ...patch,
      branchId: activity.branchId || null,
      kind: 'activity', sourceType: 'activity', sourceId: activity.id,
      status: patch.status || 'active',
      migrationState: activity.organizingScope ? 'ready' : 'pending-review',
      createdBy: actorId || activity.createdBy || null,
      createdAt: activity.createdAt || at,
      updatedBy: actorId, updatedAt: at,
    }];
  }
  const current = list[index];
  const next = { ...current, ...patch, updatedBy: actorId || current.updatedBy || null, updatedAt: at };
  // R10-D05（批次 504）：活动恢复归档（archived=false 且非取消）时，工作组必须回到可写；
  //   其余编辑仍不改状态（避免一次改名把已结束的工作组重新打开）。
  if (current.status === 'archived' && activity.archived !== true && activity.status !== 'cancelled') {
    next.status = 'active';
  }
  return [...list.slice(0, index), next, ...list.slice(index + 1)];
}

/**
 * 活动删除时的工作组 id 集合（含 sourceType/sourceId 关联的历史行）。
 * @param {Array} workgroups
 * @param {string} activityId
 * @returns {Set<string>}
 */
export function activityWorkgroupIdsForDelete(workgroups, activityId) {
  const ids = new Set((Array.isArray(workgroups) ? workgroups : [])
    .filter((row) => row && row.sourceType === 'activity' && row.sourceId === activityId)
    .map((row) => row.id));
  const canonical = activityWorkgroupId({ id: activityId });
  if (canonical) ids.add(canonical);
  return ids;
}
