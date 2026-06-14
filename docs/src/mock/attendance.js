import { _personName, _activityTitle, _activityType } from './index.js';
import { AttendanceStatus, ATTENDANCE_STATUS_LABELS } from '../core/domain.js';

export const ATTENDANCE_RECORDS = [
  { id: 'att1', userId: 'p1', activityId: 'act-1', status: AttendanceStatus.PRESENT, recordedBy: null, overdue: false },
  { id: 'att2', userId: 'p2', activityId: 'act-2', status: AttendanceStatus.ABSENT, recordedBy: 'p10', overdue: false },
  { id: 'att3', userId: 'p3', activityId: 'act-3', status: AttendanceStatus.PRESENT, recordedBy: null, overdue: false },
  { id: 'att4', userId: 'p4', activityId: 'act-4', status: AttendanceStatus.LEAVE, recordedBy: null, overdue: true },
  { id: 'att5', userId: 'p5', activityId: 'act-5', status: AttendanceStatus.PRESENT, recordedBy: 'p10', overdue: false },
  { id: 'att6', userId: 'p1', activityId: 'act-2', status: AttendanceStatus.PRESENT, recordedBy: 'p10', overdue: false },
  { id: 'att7', userId: 'p3', activityId: 'act-1', status: AttendanceStatus.PRESENT, recordedBy: null, overdue: false },
  { id: 'att8', userId: 'p2', activityId: 'act-3', status: AttendanceStatus.PRESENT, recordedBy: null, overdue: false },
  { id: 'att9', userId: 'p4', activityId: 'act-2', status: AttendanceStatus.ABSENT, recordedBy: 'p10', overdue: false },
  { id: 'att10', userId: 'p5', activityId: 'act-4', status: AttendanceStatus.LEAVE, recordedBy: null, overdue: false },
  { id: 'att11', userId: 'p6', activityId: 'act-3', status: AttendanceStatus.PRESENT, recordedBy: null, overdue: false },
  { id: 'att12', userId: 'p7', activityId: 'act-5', status: AttendanceStatus.PRESENT, recordedBy: 'p10', overdue: false },
  { id: 'att13', userId: 'p1', activityId: 'act-8', status: AttendanceStatus.PRESENT, recordedBy: null, overdue: false },
  { id: 'att14', userId: 'p2', activityId: 'act-8', status: AttendanceStatus.PRESENT, recordedBy: null, overdue: false },
  { id: 'att15', userId: 'p3', activityId: 'act-9', status: AttendanceStatus.PRESENT, recordedBy: null, overdue: false },
  { id: 'att16', userId: 'p4', activityId: 'act-8', status: AttendanceStatus.LEAVE, recordedBy: 'p10', overdue: false },
  { id: 'att17', userId: 'p5', activityId: 'act-9', status: AttendanceStatus.PRESENT, recordedBy: null, overdue: false },
  { id: 'att18', userId: 'p6', activityId: 'act-8', status: AttendanceStatus.PRESENT, recordedBy: null, overdue: false },
  { id: 'att19', userId: 'p7', activityId: 'act-9', status: AttendanceStatus.ABSENT, recordedBy: 'p10', overdue: false },
  { id: 'att20', userId: 'p8', activityId: 'act-10', status: AttendanceStatus.PRESENT, recordedBy: null, overdue: false },
  { id: 'att21', userId: 'p9', activityId: 'act-10', status: AttendanceStatus.PRESENT, recordedBy: null, overdue: false },
  { id: 'att22', userId: 'p10', activityId: 'act-11', status: AttendanceStatus.PRESENT, recordedBy: null, overdue: false },
  { id: 'att25', userId: 'p1', activityId: 'act-10', status: AttendanceStatus.PRESENT, recordedBy: null, overdue: false },
  { id: 'att26', userId: 'p2', activityId: 'act-10', status: AttendanceStatus.LEAVE, recordedBy: 'p10', overdue: true },
  { id: 'att28', userId: 'p4', activityId: 'act-10', status: AttendanceStatus.PRESENT, recordedBy: null, overdue: false },
  { id: 'att29', userId: 'p5', activityId: 'act-11', status: AttendanceStatus.ABSENT, recordedBy: 'p10', overdue: false },
  { id: 'att32', userId: 'p8', activityId: 'act-9', status: AttendanceStatus.PRESENT, recordedBy: null, overdue: false },
  { id: 'att33', userId: 'p9', activityId: 'act-8', status: AttendanceStatus.PRESENT, recordedBy: null, overdue: false },
  { id: 'att34', userId: 'p10', activityId: 'act-10', status: AttendanceStatus.PRESENT, recordedBy: null, overdue: false },
  { id: 'att35', userId: 'p11', activityId: 'act-8', status: AttendanceStatus.PRESENT, recordedBy: null, overdue: false },
  { id: 'att36', userId: 'p12', activityId: 'act-10', status: AttendanceStatus.PRESENT, recordedBy: null, overdue: false },
];

export function attendanceToLong(records) {
  return records.map(r => ({
    id: r.id,
    name: _personName(r.userId),
    activity: _activityTitle(r.activityId),
    type: _activityType(r.activityId),
    status: ATTENDANCE_STATUS_LABELS[r.status] || r.status,
    statusKey: r.status,
    confirmer: r.recordedBy ? _personName(r.recordedBy) : '—',
    overdue: r.overdue,
  }));
}

export function attendanceToWide(records) {
  const personMap = {};
  const activityIds = [...new Set(records.map(r => r.activityId))];
  records.forEach(r => {
    if (!personMap[r.userId]) {
      personMap[r.userId] = { name: _personName(r.userId), userId: r.userId, cells: {} };
    }
    personMap[r.userId].cells[r.activityId] = ATTENDANCE_STATUS_LABELS[r.status] || r.status;
  });
  return {
    columns: activityIds.map(id => ({ id, title: _activityTitle(id), type: _activityType(id) })),
    rows: Object.values(personMap),
  };
}
