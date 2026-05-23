import { PEOPLE } from './people.js';
import { ACTIVITIES } from './activities.js';

export function _personName(id) {
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
export { KANBAN_MOCKS } from './kanban.js';
export { PARTY_MOCKS, CANDIDATE_STAGES, COMPLIANCE_FILES, PUBLICITY_STANDARDS, TEMPLATE_LIST } from './party.js';
export { MOCK_NOTICES } from './notices.js';
export { MOCK_TASKFORCES } from './taskforces.js';
export { PARTICIPATION_RECORDS, participationToDisplay } from './participation.js';
