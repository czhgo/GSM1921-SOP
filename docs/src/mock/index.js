import { ACTIVITIES } from './activities.js?v=20260812a';
import { PEOPLE } from './people.js?v=20260812a';

// ════════════════════════════════════════════════════════════════
//  人员数据访问 — 从 person.js 统一导入（T-142 Phase 2C）
// ════════════════════════════════════════════════════════════════

// 修复（T174）：re-export 语法不创建当前模块作用域绑定，
// 导致 _personName 内直接引用 getPersonName 抛 ReferenceError。
// 改为显式 import + 显式 re-export，确保绑定可用。
import { getPersonById, getPersonName } from '../services/person.js?v=20260812a';
export { getPersonById, getPersonName };
// PEOPLE 从 mock/people.js 导入并重新导出（向后兼容）
export { PEOPLE };

/** @deprecated 请使用 getPersonName() */
export function _personName(id) {
  return getPersonName(id);
}

export { ACTIVITIES } from './activities.js?v=20260812a';
export { ATTENDANCE_RECORDS, attendanceToLong, attendanceToWide } from './attendance.js?v=20260812a';
export { INSPECTION_RECORDS, inspectionToLong, inspectionToWide, inspectionToDisplay } from './inspection.js?v=20260812a';
export { REVIEW_RECORDS, TASKFORCE_REVIEW_RECORDS, reviewToDisplay } from './review.js?v=20260812a';
export { MOCK_NOTICES } from './notices.js?v=20260812a';
export { MOCK_TASKFORCES } from './taskforces.js?v=20260812a';
