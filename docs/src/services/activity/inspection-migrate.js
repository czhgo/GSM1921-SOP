// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  inspection-migrate.js — 考察记录工作组键回填（IA 审查 R4-D04）
//
//  为什么需要：旧考察记录只按 `sourceName === 专班名` 挂载，记录本身没有 workgroupId /
//  taskforceId ⇒ 专班改名即断链、同名专班串数据、服务端也无法按工作组校验成员与支部。
//  本迁移只改 JSON 行内的字段（**不动表结构**）：按 `sourceName` + `taskforceId` + 现有
//  taskforces/workgroups 稳定 id 回填 `workgroupId`；无法唯一回填的标 `legacy:true` 只读。
//
//  幂等：已带有效 workgroupId 的行原样保留（第二次运行 filled=0）；legacy 只对仍无法回填者计数，重跑不增。
//  纯函数 + 可注入数据源：mock hydrate 与 server 启动迁移共用同一实现（单一源）。
// ════════════════════════════════════════════════════════════════

const TASKFORCE = 'taskforce';

/** 专班稳定工作组键（与 workgroup-seed-sync / server v3 迁移同一派生规则） */
function _workgroupIdOfTaskforce(taskforce) {
  return taskforce?.workgroupId || `wg-taskforce-${taskforce?.id}`;
}

/** 由 workgroupId 反查专班（workgroups.sourceId 优先，其次专班自身 workgroupId） */
function _taskforceByWorkgroupId(workgroupId, { groupsById, taskforces }) {
  const group = groupsById.get(String(workgroupId));
  if (group && group.kind === TASKFORCE && group.sourceId) {
    const bySource = taskforces.find((tf) => String(tf.id) === String(group.sourceId));
    if (bySource) return bySource;
  }
  return taskforces.find((tf) => String(_workgroupIdOfTaskforce(tf)) === String(workgroupId)) || null;
}

/**
 * 回填考察记录的稳定父键（纯函数；不写库、不改入参）。
 * @param {{records?:Array<Object>, workgroups?:Array<Object>, taskforces?:Array<Object>}} input
 * @returns {{rows:Array<Object>, total:number, filled:number, legacy:number, rate:number}}
 *   total   = 需要父键的专班类考察条数
 *   filled  = **本次**新回填条数（重跑为 0）
 *   legacy  = 仍无法回填、已标只读的条数（稳定值）
 *   rate    = (total - legacy) / total，0–1
 */
export function migrateInspectionWorkgroupKeys({ records, workgroups, taskforces } = {}) {
  const source = Array.isArray(records) ? records : [];
  const groups = Array.isArray(workgroups) ? workgroups : [];
  const tfs = Array.isArray(taskforces) ? taskforces : [];

  const groupsById = new Map(groups.map((row) => [String(row.id), row]));
  const taskforcesById = new Map(tfs.map((tf) => [String(tf.id), tf]));
  // 名称仅在「历史回填」这一处作为线索；必须唯一命中，否则标 legacy（同名专班不猜）。
  const taskforcesByName = new Map();
  for (const tf of tfs) {
    const key = String(tf.name || '');
    if (!key) continue;
    if (!taskforcesByName.has(key)) taskforcesByName.set(key, []);
    taskforcesByName.get(key).push(tf);
  }

  let total = 0;
  let filled = 0;
  let legacy = 0;

  const rows = source.map((record) => {
    if (!record || record.sourceType !== TASKFORCE) return record;
    total += 1;

    const existing = record.workgroupId
      ? (_taskforceByWorkgroupId(record.workgroupId, { groupsById, taskforces: tfs })
        // 已有 workgroupId：即使专班行已归档/下架，只要工作组主记录还在就保留父键，不按名称改写。
        || (groupsById.get(String(record.workgroupId))?.kind === TASKFORCE
          ? { id: groupsById.get(String(record.workgroupId)).sourceId, workgroupId: record.workgroupId }
          : null))
      : null;
    if (existing) {
      // 已有稳定键：只补兼容快照，不改父键；legacy 若还在则移除（数据已可关联）。
      const next = { ...record, workgroupId: record.workgroupId, taskforceId: record.taskforceId || existing.id };
      delete next.legacy;
      return next;
    }

    // 回填线索（按可信度）：显式 taskforceId → 唯一名称 → 唯一工作组名称。
    let resolved = record.taskforceId ? taskforcesById.get(String(record.taskforceId)) : null;
    if (!resolved && record.sourceName) {
      const byName = taskforcesByName.get(String(record.sourceName)) || [];
      if (byName.length === 1) resolved = byName[0];
    }
    if (!resolved && record.sourceName) {
      const groupsByName = groups.filter((group) => group.kind === TASKFORCE && group.name === record.sourceName);
      const candidates = groupsByName
        .map((group) => taskforcesById.get(String(group.sourceId)))
        .filter(Boolean);
      if (candidates.length === 1) resolved = candidates[0];
    }

    if (!resolved) {
      legacy += 1;
      return record.legacy ? record : { ...record, legacy: true };
    }

    filled += 1;
    const next = {
      ...record,
      workgroupId: _workgroupIdOfTaskforce(resolved),
      taskforceId: record.taskforceId || resolved.id,
    };
    delete next.legacy;
    return next;
  });

  const rate = total === 0 ? 1 : (total - legacy) / total;
  const result = { rows, total, filled, legacy, rate };
  // 回填率必须有读数（R4-D04 的验收要求）：一行 console.info，便于 mock/api 两侧对账。
  console.info(`[inspection-migrate] 考察工作组键回填：total=${total} filled=${filled} legacy=${legacy} rate=${(rate * 100).toFixed(1)}%`);
  return result;
}
