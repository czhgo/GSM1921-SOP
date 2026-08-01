// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  attendance.js — 考勤记录 CRUD 服务
// ════════════════════════════════════════════════════════════════

import { mockDB } from '../core/domain.js';
import { persist } from '../core/data-adapter.js';
import { ATTENDANCE_RECORDS } from '../mock/index.js';

export function loadAttendanceRecords() {
  return mockDB.attendances.length > 0 ? [...mockDB.attendances] : [...ATTENDANCE_RECORDS];
}

export function saveAttendanceRecords(records) {
  mockDB.attendances = [...records];
  persist();
}
