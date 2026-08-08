// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  inspection.js — 考察记录 CRUD 服务
// ════════════════════════════════════════════════════════════════

import { mockDB, SourceType } from '../core/domain.js?v=20260808g';
import { persist } from '../core/data-adapter.js?v=20260808g';
import { INSPECTION_RECORDS } from '../mock/index.js?v=20260808g';
import { TodoStore, TodoSourceType } from './todo.js?v=20260808g';
import { loadActivities } from './activity.js?v=20260808g';

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
  persist();
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
 * 超期标准：待确认状态 + 录入时间超过7天
 */
export function getOverdueRecords(daysThreshold = 7) {
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

/** 按人员查询考察记录 */
export function getRecordsByPerson(personId) {
  return loadInspectionRecords().filter(r => r.personId === personId);
}
