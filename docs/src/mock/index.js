import { PEOPLE } from './people.js?v=20260903c';

// ════════════════════════════════════════════════════════════════
//  种子数据仓（re-export 收口，2026-09-03 数据域接线试点）
//  人员数据域唯一出口 = services/person.js（PersonStore + getPersonById/getPersonName）。
//  本文件不再中转 person 函数（UI/服务层禁从 mock 取人名）；
//  PEOPLE（人员种子数组）与各业务种子/展示格式化函数仍由此中转（收口批次推进中）。
// ════════════════════════════════════════════════════════════════

export { PEOPLE };

export { ACTIVITIES } from './activities.js?v=20260903c';
export { ATTENDANCE_RECORDS } from './attendance.js?v=20260903c';
export { INSPECTION_RECORDS } from './inspection.js?v=20260903c';
export { THOUGHT_REPORTS } from './thought-reports.js?v=20260903c';
export { REVIEW_RECORDS, TASKFORCE_REVIEW_RECORDS } from './review.js?v=20260903c';
export { MOCK_NOTICES } from './notices.js?v=20260903c';
export { MOCK_TASKFORCES } from './taskforces.js?v=20260903c';
