// role: [人机]
// ════════════════════════════════════════════════════════════════
//  inspection.js — 考察记录 CRUD 服务
// ════════════════════════════════════════════════════════════════

import { mockDB } from '../core/domain.js';
import { saveDB } from '../services/mock.js';
import { INSPECTION_RECORDS } from '../mock/index.js';

export function loadInspectionRecords() {
  return mockDB.inspections.length > 0 ? [...mockDB.inspections] : [...INSPECTION_RECORDS];
}

export function saveInspectionRecords(records) {
  mockDB.inspections = [...records];
  saveDB();
}
