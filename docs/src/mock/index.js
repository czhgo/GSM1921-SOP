import { PEOPLE } from './people.js';
import { ACTIVITIES } from './activities.js';

/** 按 ID 查询人员，返回 person 对象或 null */
export function getPersonById(id) {
  if (!id) return null;
  return PEOPLE.find(p => p.id === id) || null;
}

/** 按 ID 查询人员姓名，返回 name 或 fallback 到 id */
export function getPersonName(id) {
  if (!id) return '—';
  return getPersonById(id)?.name || id;
}

export function _personName(id) {
  if (!id) return '—';
  return PEOPLE.find(p => p.id === id)?.name || id;
}

export function _activityTitle(id) {
  return ACTIVITIES.find(a => a.id === id)?.title || id;
}

export function _activityType(id) {
  return ACTIVITIES.find(a => a.id === id)?.type || '未知';
}

export { PEOPLE } from './people.js';
export { ACTIVITIES } from './activities.js';
export { ATTENDANCE_RECORDS, attendanceToLong, attendanceToWide } from './attendance.js';
export { INSPECTION_RECORDS, inspectionToLong, inspectionToWide, inspectionToDisplay } from './inspection.js';
export { REVIEW_RECORDS, TASKFORCE_REVIEW_RECORDS, reviewToDisplay } from './review.js';
export { PARTY_MOCKS, CANDIDATE_STAGES, COMPLIANCE_FILES, PUBLICITY_STANDARDS, TEMPLATE_LIST } from './party.js';
export { MOCK_NOTICES } from './notices.js';
export { MOCK_TASKFORCES } from './taskforces.js';
