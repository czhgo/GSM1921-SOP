import { _personName, _activityTitle, _activityType } from './index.js';
import { AttendanceStatus, ATTENDANCE_STATUS_LABELS } from '../core/domain.js';

export const ATTENDANCE_RECORDS = [
  { id: 'att1', personId: 'p1', activityId: 'act-1', status: AttendanceStatus.PRESENT, confirmer: null, overdue: false },
  { id: 'att2', personId: 'p2', activityId: 'act-2', status: AttendanceStatus.ABSENT, confirmer: 'p10', overdue: false },
  { id: 'att3', personId: 'p3', activityId: 'act-3', status: AttendanceStatus.PRESENT, confirmer: null, overdue: false },
  { id: 'att4', personId: 'p4', activityId: 'act-4', status: AttendanceStatus.LEAVE, confirmer: null, overdue: true },
  { id: 'att5', personId: 'p5', activityId: 'act-5', status: AttendanceStatus.PRESENT, confirmer: 'p10', overdue: false },
  { id: 'att6', personId: 'p1', activityId: 'act-2', status: AttendanceStatus.PRESENT, confirmer: 'p10', overdue: false },
  { id: 'att7', personId: 'p3', activityId: 'act-1', status: AttendanceStatus.PRESENT, confirmer: null, overdue: false },
  { id: 'att8', personId: 'p2', activityId: 'act-3', status: AttendanceStatus.PRESENT, confirmer: null, overdue: false },
  { id: 'att9', personId: 'p4', activityId: 'act-2', status: AttendanceStatus.ABSENT, confirmer: 'p10', overdue: false },
  { id: 'att10', personId: 'p5', activityId: 'act-4', status: AttendanceStatus.LEAVE, confirmer: null, overdue: false },
  { id: 'att11', personId: 'p6', activityId: 'act-3', status: AttendanceStatus.PRESENT, confirmer: null, overdue: false },
  { id: 'att12', personId: 'p7', activityId: 'act-5', status: AttendanceStatus.PRESENT, confirmer: 'p10', overdue: false },
  { id: 'att13', personId: 'p1', activityId: 'act-8', status: AttendanceStatus.PRESENT, confirmer: null, overdue: false },
  { id: 'att14', personId: 'p2', activityId: 'act-8', status: AttendanceStatus.PRESENT, confirmer: null, overdue: false },
  { id: 'att15', personId: 'p3', activityId: 'act-9', status: AttendanceStatus.PRESENT, confirmer: null, overdue: false },
  { id: 'att16', personId: 'p4', activityId: 'act-8', status: AttendanceStatus.LEAVE, confirmer: 'p10', overdue: false },
  { id: 'att17', personId: 'p5', activityId: 'act-9', status: AttendanceStatus.PRESENT, confirmer: null, overdue: false },
  { id: 'att18', personId: 'p6', activityId: 'act-8', status: AttendanceStatus.PRESENT, confirmer: null, overdue: false },
  { id: 'att19', personId: 'p7', activityId: 'act-9', status: AttendanceStatus.ABSENT, confirmer: 'p10', overdue: false },
  { id: 'att20', personId: 'p8', activityId: 'act-10', status: AttendanceStatus.PRESENT, confirmer: null, overdue: false },
  { id: 'att21', personId: 'p9', activityId: 'act-10', status: AttendanceStatus.PRESENT, confirmer: null, overdue: false },
  { id: 'att22', personId: 'p10', activityId: 'act-11', status: AttendanceStatus.PRESENT, confirmer: null, overdue: false },
  { id: 'att25', personId: 'p1', activityId: 'act-10', status: AttendanceStatus.PRESENT, confirmer: null, overdue: false },
  { id: 'att26', personId: 'p2', activityId: 'act-10', status: AttendanceStatus.LEAVE, confirmer: 'p10', overdue: true },
  { id: 'att28', personId: 'p4', activityId: 'act-10', status: AttendanceStatus.PRESENT, confirmer: null, overdue: false },
  { id: 'att29', personId: 'p5', activityId: 'act-11', status: AttendanceStatus.ABSENT, confirmer: 'p10', overdue: false },
  { id: 'att32', personId: 'p8', activityId: 'act-9', status: AttendanceStatus.PRESENT, confirmer: null, overdue: false },
  { id: 'att33', personId: 'p9', activityId: 'act-8', status: AttendanceStatus.PRESENT, confirmer: null, overdue: false },
  { id: 'att34', personId: 'p10', activityId: 'act-10', status: AttendanceStatus.PRESENT, confirmer: null, overdue: false },
  { id: 'att35', personId: 'p11', activityId: 'act-8', status: AttendanceStatus.PRESENT, confirmer: null, overdue: false },
  { id: 'att36', personId: 'p12', activityId: 'act-10', status: AttendanceStatus.PRESENT, confirmer: null, overdue: false },
];

export function attendanceToLong(records) {
  return records.map(r => ({
    id: r.id,
    name: _personName(r.personId),
    activity: _activityTitle(r.activityId),
    type: _activityType(r.activityId),
    status: ATTENDANCE_STATUS_LABELS[r.status] || r.status,
    statusKey: r.status,
    confirmer: r.confirmer ? _personName(r.confirmer) : '—',
    overdue: r.overdue,
  }));
}

export function attendanceToWide(records) {
  const personMap = {};
  const activityIds = [...new Set(records.map(r => r.activityId))];
  records.forEach(r => {
    if (!personMap[r.personId]) {
      personMap[r.personId] = { name: _personName(r.personId), personId: r.personId, cells: {} };
    }
    personMap[r.personId].cells[r.activityId] = ATTENDANCE_STATUS_LABELS[r.status] || r.status;
  });
  return {
    columns: activityIds.map(id => ({ id, title: _activityTitle(id), type: _activityType(id) })),
    rows: Object.values(personMap),
  };
}
