// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  inspection.js — 考察记录 CRUD 服务
// ════════════════════════════════════════════════════════════════

import { mockDB, SourceType, SOURCE_TYPE_LABELS, PARTICIPATION_LEVEL_LABELS } from '../core/domain.js?v=20260903c';
import { POLICY_DEFAULTS } from '../core/policy-defaults.js?v=20260903c';
import { persist } from '../core/data-adapter.js?v=20260903c';
import { bumpToken } from '../core/version-token.js?v=20260903c'; // P0 域缓存失效（spec §二.3）
import { INSPECTION_RECORDS } from '../mock/index.js?v=20260903c';
import { ACTIVITIES } from '../mock/activities.js?v=20260903c';
import { getPersonById, getPersonName } from './person.js?v=20260903c';
import { TodoStore, TodoSourceType } from './todo.js?v=20260903c';
import { loadActivities } from './activity.js?v=20260903c';

export function loadInspectionRecords() {
  return mockDB.inspections.length > 0 ? [...mockDB.inspections] : [...INSPECTION_RECORDS];
}

/**
 * 读取活跃活动的考察记录（2026-08-08 归档闭环）
 * 活动类考察随活动归档退出工作区展示；专班类考察（sourceType=taskforce）保留
 * （组织/宣传工作台按专班呈现已完结记录，属既有设计）。
 * ⚠️ 写流程必须使用 loadInspectionRecords 原始版，避免整表写回丢失归档记录。
 */
export function loadActiveInspectionRecords() {
  const activeIds = new Set(loadActivities().filter(a => !a.archived).map(a => a.id));
  return loadInspectionRecords().filter(r =>
    r.sourceType === SourceType.TASKFORCE || activeIds.has(r.activityId)
  );
}

export function saveInspectionRecords(records) {
  mockDB.inspections = [...records];
  bumpToken('inspection'); // P0：考察写口统一 bump（录入/删除/纪检确认等均经本函数落库）
  persist();
}

// ── A1 上传位门禁（2026-09-05 落代码，语义见 SYSTEM_ROLE_PERMISSION §9b/§9f + CF §C.1a 考察管理）──

/**
 * 考察上传位门禁
 * - 活动类：上传/修改=该活动组织者（assignments organizer 或顶层 organizer 派生；组长兼组织者同）；
 *   组长非组织者=本组监督位（督促上传，见组长页监督提示）
 * - 专班类：上传=专班实际负责人——身份（指派到人/角色）待书记另裁（§9b 组织委员行注）；
 *   裁决前暂按页面可达放行（组委/组长既有入口保留），recordedBy 记真实操作人
 */
export function canUploadInspection(personId, sourceType, sourceId) {
  if (!personId || !sourceType || !sourceId) return false;
  const role = (getPersonById(personId) || {}).role;
  if (role === 'secretary' || role === 'deputy-secretary') return true; // 书记/副书记例外承担
  if (sourceType === SourceType.TASKFORCE) return true; // 专班负责人位待身份编码，暂放行（见上）
  const activity = loadActivities().find(a => a.id === sourceId);
  if (!activity || activity.archived) return false;
  if (role === 'leader' && activity.type === '党小组会') return true; // 组长兼组织者（本组上传位）
  const isOrg = (Array.isArray(activity.assignments) && activity.assignments.some(x => x.personId === personId && x.role === 'organizer'))
    || activity.organizer === personId;
  return !!isOrg;
}

/** 更新考察记录 */
function updateInspectionRecord(id, updates) {
  const records = loadInspectionRecords();
  const idx = records.findIndex(r => r.id === id);
  if (idx !== -1) {
    records[idx] = { ...records[idx], ...updates };
    saveInspectionRecords(records);
  }
}

/** 删除考察记录（仅待确认状态可删） */
export function deleteInspectionRecord(id) {
  const records = loadInspectionRecords();
  const idx = records.findIndex(r => r.id === id && r.status === 'pending');
  if (idx !== -1) {
    records.splice(idx, 1);
    saveInspectionRecords(records);
    return true;
  }
  return false;
}

/** 确认考察记录（纪检委员操作） */
export function confirmInspectionRecord(id) {
  const res = updateInspectionRecord(id, { status: 'confirmed' });
  // 做事即销待办：确认考察 → 销「考察超期/待确认」待办
  try { TodoStore.completeBySource(TodoSourceType.ACTIVITY, `insp_${id}`); } catch (e) { console.warn('[inspection] 销待办失败', e); }
  return res;
}

/**
 * 获取超期未确认的考察记录
 * 超期标准：待确认状态 + 录入时间超过默认天数（默认 7；P3c 单一源 =
 * core/policy-defaults.js inspection.overdueDays，可经 daysThreshold 覆盖，行为与既有调用兼容）
 */
export function getOverdueRecords(daysThreshold = POLICY_DEFAULTS.inspection.overdueDays) {
  const records = loadInspectionRecords();
  const now = Date.now();
  const threshold = daysThreshold * 24 * 60 * 60 * 1000;
  return records.filter(r => {
    if (r.status !== 'pending') return false;
    const recordedTime = new Date(r.recordedAt).getTime();
    return (now - recordedTime) > threshold;
  });
}

/**
 * 按来源查询考察记录
 * @param {'activity'|'taskforce'} sourceType
 * @param {string} [sourceId] — activityId 或 sourceName
 */
export function getRecordsBySource(sourceType, sourceId) {
  const records = loadInspectionRecords();
  return records.filter(r => {
    if (r.sourceType !== sourceType) return false;
    if (sourceType === SourceType.ACTIVITY) return r.activityId === sourceId;
    return r.sourceName === sourceId;
  });
}

// ── 展示格式化（2026-09-03 数据域接线批次二：自 mock/inspection.js 原样提升）──
const _personName = (id) => getPersonName(id);
const _activityTitle = (id) => ACTIVITIES.find(a => a.id === id)?.title || id;
const _activityType = (id) => ACTIVITIES.find(a => a.id === id)?.type || '未知';

/** 考察记录显示格式（以人为单位聚合展示） */
export function inspectionToDisplay(records) {
  return records.map(r => ({
    id: r.id,
    personId: r.personId,
    personName: _personName(r.personId),
    sourceType: r.sourceType,
    sourceLabel: SOURCE_TYPE_LABELS[r.sourceType] || r.sourceType,
    activityId: r.activityId,
    activityTitle: r.activityId ? _activityTitle(r.activityId) : null,
    sourceName: r.sourceName,
    level: r.level,
    levelLabel: PARTICIPATION_LEVEL_LABELS[r.level] || r.level,
    content: r.content || r.role, // P1-5：content 优先，旧数据以 role 兜底
    role: r.role,
    recordedByName: _personName(r.recordedBy),
    recordedAt: r.recordedAt,
    status: r.status || 'pending',
  }));
}

/**
 * 考察记录长格式（按来源分组展示）
 */
export function inspectionToLong(records) {
  return records.map(r => ({
    id: r.id,
    name: _personName(r.personId),
    source: r.activityId ? _activityTitle(r.activityId) : r.sourceName,
    sourceType: SOURCE_TYPE_LABELS[r.sourceType] || r.sourceType,
    level: PARTICIPATION_LEVEL_LABELS[r.level] || r.level,
    role: r.role,
    content: r.content || r.role, // P1-5：content 优先，旧数据以 role 兜底
    status: r.status,
  }));
}

/**
 * 考察记录宽格式（以人为行、来源为列）
 */
export function inspectionToWide(records) {
  const personMap = {};
  const sourceIds = [];
  records.forEach(r => {
    const sourceKey = r.activityId || r.sourceName;
    if (!sourceIds.find(s => s.key === sourceKey)) {
      sourceIds.push({
        key: sourceKey,
        title: r.activityId ? _activityTitle(r.activityId) : r.sourceName,
        type: SOURCE_TYPE_LABELS[r.sourceType] || r.sourceType,
      });
    }
    if (!personMap[r.personId]) {
      personMap[r.personId] = { name: _personName(r.personId), personId: r.personId, cells: {} };
    }
    personMap[r.personId].cells[sourceKey] = r.content || r.role; // P1-5：content 优先
  });
  return {
    columns: sourceIds,
    rows: Object.values(personMap),
  };
}
