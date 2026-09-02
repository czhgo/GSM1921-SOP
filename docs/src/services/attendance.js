// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  attendance.js — 考勤记录 CRUD 服务
// ════════════════════════════════════════════════════════════════

import { mockDB } from '../core/domain.js?v=20260901y';
import { persist } from '../core/data-adapter.js?v=20260901y';
import { ATTENDANCE_RECORDS } from '../mock/index.js?v=20260901y';
import { loadActivities } from './activity.js?v=20260901y';

export function loadAttendanceRecords() {
  return mockDB.attendances.length > 0 ? [...mockDB.attendances] : [...ATTENDANCE_RECORDS];
}

/**
 * 读取活跃活动的考勤记录（2026-08-08 归档闭环）
 * 已归档活动的考勤随活动退出工作区展示。
 * ⚠️ 写流程（确认考勤等读取→修改→整表写回）必须使用 loadAttendanceRecords 原始版，
 *    否则整表写回会丢失已归档活动的考勤记录。
 */
export function loadActiveAttendanceRecords() {
  const activeIds = new Set(loadActivities().filter(a => !a.archived).map(a => a.id));
  return loadAttendanceRecords().filter(r => activeIds.has(r.activityId));
}

export function saveAttendanceRecords(records) {
  mockDB.attendances = [...records];
  persist();
}
