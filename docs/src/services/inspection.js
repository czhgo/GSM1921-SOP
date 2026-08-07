// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  inspection.js — 考察记录 CRUD 服务
// ════════════════════════════════════════════════════════════════

import { mockDB, SourceType } from '../core/domain.js?v=20260807g';
import { persist } from '../core/data-adapter.js?v=20260807g';
import { INSPECTION_RECORDS } from '../mock/index.js?v=20260807g';

export function loadInspectionRecords() {
  return mockDB.inspections.length > 0 ? [...mockDB.inspections] : [...INSPECTION_RECORDS];
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
  return updateInspectionRecord(id, { status: 'confirmed' });
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
