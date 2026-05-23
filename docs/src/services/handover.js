// role: [人机]
// ════════════════════════════════════════════════════════════════
//  handover.js — 交接记录 CRUD 服务
// ════════════════════════════════════════════════════════════════

import { mockDB } from '../core/domain.js';
import { saveDB } from '../services/mock.js';

export function loadHandoverRecords() {
  if (!mockDB.handovers) mockDB.handovers = [];
  return [...mockDB.handovers];
}

export function saveHandoverRecords(records) {
  mockDB.handovers = records;
  saveDB();
}

export function addHandoverRecord(record) {
  const records = loadHandoverRecords();
  records.push(record);
  saveHandoverRecords(records);
}

export function updateHandoverRecord(id, updates) {
  const records = loadHandoverRecords();
  const idx = records.findIndex(r => r.id === id);
  if (idx !== -1) {
    records[idx] = { ...records[idx], ...updates };
    saveHandoverRecords(records);
  }
}

export function completeHandoverItem(recordId, itemIndex) {
  const records = loadHandoverRecords();
  const record = records.find(r => r.id === recordId);
  if (record && record.items && record.items[itemIndex]) {
    record.items[itemIndex].status = 'completed';
    saveHandoverRecords(records);
  }
}
