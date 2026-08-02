// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  handover.js — 交接记录 CRUD 服务
// ════════════════════════════════════════════════════════════════

import { mockDB } from '../core/domain.js';
import { persist } from '../core/data-adapter.js';

export function loadHandoverRecords() {
  if (!mockDB.handovers) mockDB.handovers = [];
  return [...mockDB.handovers];
}

function saveHandoverRecords(records) {
  mockDB.handovers = records;
  persist();
}

export function updateHandoverRecord(id, updates) {
  const records = loadHandoverRecords();
  const idx = records.findIndex(r => r.id === id);
  if (idx !== -1) {
    records[idx] = { ...records[idx], ...updates };
    saveHandoverRecords(records);
  }
}
