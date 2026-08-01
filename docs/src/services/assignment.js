// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  assignment.js — 分工记录 CRUD 服务
// ════════════════════════════════════════════════════════════════

import { mockDB } from '../core/domain.js';
import { persist } from '../core/data-adapter.js';

export function loadAssignmentRecords() {
  if (!mockDB.assignments) mockDB.assignments = [];
  return [...mockDB.assignments];
}

function saveAssignmentRecords(records) {
  mockDB.assignments = records;
  persist();
}

/**
 * 自动逾期检测：将所有 in_progress 且 DDL 已过的记录更新为 overdue
 * @returns {Array} 更新后的记录列表
 */
export function checkOverdue() {
  const records = loadAssignmentRecords();
  const now = new Date();
  let changed = false;
  records.forEach(r => {
    if (r.status === 'in_progress' && new Date(r.ddl) < now) {
      r.status = 'overdue';
      changed = true;
    }
  });
  if (changed) saveAssignmentRecords(records);
  return records;
}

export function addAssignmentRecord(record) {
  const records = loadAssignmentRecords();
  records.push(record);
  saveAssignmentRecords(records);
}

export function completeAssignmentRecord(id) {
  const records = loadAssignmentRecords();
  const idx = records.findIndex(r => r.id === id);
  if (idx !== -1) {
    records[idx].status = 'completed';
    records[idx].completedAt = new Date().toISOString();
    saveAssignmentRecords(records);
  }
}
