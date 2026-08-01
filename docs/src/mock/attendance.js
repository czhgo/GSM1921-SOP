// 修复（T175）：不再从 ./index.js 导入 _personName 等辅助函数，
// 消除 mock/index.js ↔ mock/attendance.js 循环依赖。
// 直接依赖 services/person.js + mock/activities.js。
import { getPersonName } from '../services/person.js';
import { ACTIVITIES } from './activities.js';
import { AttendanceStatus, ATTENDANCE_STATUS_LABELS } from '../core/domain.js';

const _personName = (id) => getPersonName(id);
const _activityTitle = (id) => ACTIVITIES.find(a => a.id === id)?.title || id;
const _activityType = (id) => ACTIVITIES.find(a => a.id === id)?.type || '未知';

// 最后更新：2026-07-16（T-2026-07-006 第 5 轮 mock 数据迭代）
// ID 重排为连续序列 att1~att43，补充 recordedAt 字段
// act-19（组织生活会）记录补充 studentId/developStage/partyGroup
// 已完成补课任务（mk3/mk5）对应考勤记录 status='made_up'
export const ATTENDANCE_RECORDS = [
  // ── act-1 (2026-03-15) 3月党小组会 ─────────────────────────
  { id: 'att1',  personId: 'p1',  activityId: 'act-1',  status: AttendanceStatus.PRESENT,  recordedBy: null,  recordedAt: '2026-03-15T18:00:00Z', overdue: false },
  { id: 'att2',  personId: 'p3',  activityId: 'act-1',  status: AttendanceStatus.PRESENT,  recordedBy: null,  recordedAt: '2026-03-15T18:00:00Z', overdue: false },

  // ── act-2 (2026-03-18) 3月支委会 ───────────────────────────
  { id: 'att3',  personId: 'p2',  activityId: 'act-2',  status: AttendanceStatus.ABSENT,   recordedBy: 'p10', recordedAt: '2026-03-18T18:00:00Z', overdue: false },
  { id: 'att4',  personId: 'p1',  activityId: 'act-2',  status: AttendanceStatus.PRESENT,  recordedBy: 'p10', recordedAt: '2026-03-18T18:00:00Z', overdue: false },
  { id: 'att5',  personId: 'p4',  activityId: 'act-2',  status: AttendanceStatus.ABSENT,   recordedBy: 'p10', recordedAt: '2026-03-18T18:00:00Z', overdue: false },
  { id: 'att6',  personId: 'p13', activityId: 'act-2',  status: AttendanceStatus.PRESENT,  recordedBy: null,  recordedAt: '2026-03-18T18:00:00Z', overdue: false },
  { id: 'att7',  personId: 'p14', activityId: 'act-2',  status: AttendanceStatus.PRESENT,  recordedBy: null,  recordedAt: '2026-03-18T18:00:00Z', overdue: false },

  // ── act-3 (2026-03-22) 3月主题党日：学习两会精神 ─────────────
  { id: 'att8',  personId: 'p3',  activityId: 'act-3',  status: AttendanceStatus.PRESENT,  recordedBy: null,  recordedAt: '2026-03-22T18:00:00Z', overdue: false },
  { id: 'att9',  personId: 'p2',  activityId: 'act-3',  status: AttendanceStatus.PRESENT,  recordedBy: null,  recordedAt: '2026-03-22T18:00:00Z', overdue: false },

  // ── act-4 (2026-04-12) 4月党小组会 ─────────────────────────
  { id: 'att10', personId: 'p4',  activityId: 'act-4',  status: AttendanceStatus.LEAVE,    recordedBy: null,  recordedAt: '2026-04-12T18:00:00Z', overdue: true },
  { id: 'att11', personId: 'p5',  activityId: 'act-4',  status: AttendanceStatus.LEAVE,    recordedBy: null,  recordedAt: '2026-04-12T18:00:00Z', overdue: false },

  // ── act-5 (2026-04-15) 4月支委会 ───────────────────────────
  { id: 'att12', personId: 'p5',  activityId: 'act-5',  status: AttendanceStatus.PRESENT,  recordedBy: 'p10', recordedAt: '2026-04-15T18:00:00Z', overdue: false },
  { id: 'att13', personId: 'p7',  activityId: 'act-5',  status: AttendanceStatus.PRESENT,  recordedBy: 'p10', recordedAt: '2026-04-15T18:00:00Z', overdue: false },

  // ── act-6 (2026-04-25) 4月党课：新时代青年担当 ──────────────
  // p15 缺勤后完成补课（mk5），status='made_up'
  { id: 'att14', personId: 'p15', activityId: 'act-6',  status: AttendanceStatus.MADE_UP,  recordedBy: 'p10', recordedAt: '2026-04-25T18:00:00Z', overdue: false },

  // ── act-8 (2026-05-10) 5月支部党员大会 ─────────────────────
  { id: 'att15', personId: 'p1',  activityId: 'act-8',  status: AttendanceStatus.PRESENT,  recordedBy: null,  recordedAt: '2026-05-10T18:00:00Z', overdue: false },
  { id: 'att16', personId: 'p2',  activityId: 'act-8',  status: AttendanceStatus.PRESENT,  recordedBy: null,  recordedAt: '2026-05-10T18:00:00Z', overdue: false },
  { id: 'att17', personId: 'p4',  activityId: 'act-8',  status: AttendanceStatus.LEAVE,    recordedBy: 'p10', recordedAt: '2026-05-10T18:00:00Z', overdue: false },
  { id: 'att18', personId: 'p6',  activityId: 'act-8',  status: AttendanceStatus.PRESENT,  recordedBy: null,  recordedAt: '2026-05-10T18:00:00Z', overdue: false },
  { id: 'att19', personId: 'p9',  activityId: 'act-8',  status: AttendanceStatus.PRESENT,  recordedBy: null,  recordedAt: '2026-05-10T18:00:00Z', overdue: false },
  { id: 'att20', personId: 'p11', activityId: 'act-8',  status: AttendanceStatus.PRESENT,  recordedBy: null,  recordedAt: '2026-05-10T18:00:00Z', overdue: false },
  { id: 'att21', personId: 'p13', activityId: 'act-8',  status: AttendanceStatus.PRESENT,  recordedBy: null,  recordedAt: '2026-05-10T18:00:00Z', overdue: false },
  { id: 'att22', personId: 'p14', activityId: 'act-8',  status: AttendanceStatus.PRESENT,  recordedBy: null,  recordedAt: '2026-05-10T18:00:00Z', overdue: false },
  { id: 'att23', personId: 'p15', activityId: 'act-8',  status: AttendanceStatus.PRESENT,  recordedBy: 'p10', recordedAt: '2026-05-10T18:00:00Z', overdue: false },

  // ── act-9 (2026-05-14) 5月党小组会 ─────────────────────────
  // p7 缺勤后完成补课（mk3），status='made_up'
  { id: 'att24', personId: 'p3',  activityId: 'act-9',  status: AttendanceStatus.PRESENT,  recordedBy: null,  recordedAt: '2026-05-14T18:00:00Z', overdue: false },
  { id: 'att25', personId: 'p5',  activityId: 'act-9',  status: AttendanceStatus.PRESENT,  recordedBy: null,  recordedAt: '2026-05-14T18:00:00Z', overdue: false },
  { id: 'att26', personId: 'p6',  activityId: 'act-9',  status: AttendanceStatus.PRESENT,  recordedBy: null,  recordedAt: '2026-05-14T18:00:00Z', overdue: false },
  { id: 'att27', personId: 'p7',  activityId: 'act-9',  status: AttendanceStatus.MADE_UP,  recordedBy: 'p10', recordedAt: '2026-05-14T18:00:00Z', overdue: false },
  { id: 'att28', personId: 'p8',  activityId: 'act-9',  status: AttendanceStatus.PRESENT,  recordedBy: null,  recordedAt: '2026-05-14T18:00:00Z', overdue: false },
  { id: 'att29', personId: 'p15', activityId: 'act-9',  status: AttendanceStatus.PRESENT,  recordedBy: 'p10', recordedAt: '2026-05-14T18:00:00Z', overdue: false },

  // ── act-10 (2026-05-18) 5月主题党日：五四精神传承 ────────────
  { id: 'att30', personId: 'p8',  activityId: 'act-10', status: AttendanceStatus.PRESENT,  recordedBy: null,  recordedAt: '2026-05-18T18:00:00Z', overdue: false },
  { id: 'att31', personId: 'p9',  activityId: 'act-10', status: AttendanceStatus.PRESENT,  recordedBy: null,  recordedAt: '2026-05-18T18:00:00Z', overdue: false },
  { id: 'att32', personId: 'p1',  activityId: 'act-10', status: AttendanceStatus.PRESENT,  recordedBy: null,  recordedAt: '2026-05-18T18:00:00Z', overdue: false },
  { id: 'att33', personId: 'p2',  activityId: 'act-10', status: AttendanceStatus.LEAVE,    recordedBy: 'p10', recordedAt: '2026-05-18T18:00:00Z', overdue: true },
  { id: 'att34', personId: 'p4',  activityId: 'act-10', status: AttendanceStatus.PRESENT,  recordedBy: null,  recordedAt: '2026-05-18T18:00:00Z', overdue: false },
  { id: 'att35', personId: 'p10', activityId: 'act-10', status: AttendanceStatus.PRESENT,  recordedBy: null,  recordedAt: '2026-05-18T18:00:00Z', overdue: false },
  { id: 'att36', personId: 'p12', activityId: 'act-10', status: AttendanceStatus.PRESENT,  recordedBy: null,  recordedAt: '2026-05-18T18:00:00Z', overdue: false },

  // ── act-11 (2026-05-20) 5月支委会 ──────────────────────────
  { id: 'att37', personId: 'p10', activityId: 'act-11', status: AttendanceStatus.PRESENT,  recordedBy: null,  recordedAt: '2026-05-20T18:00:00Z', overdue: false },
  { id: 'att38', personId: 'p5',  activityId: 'act-11', status: AttendanceStatus.ABSENT,   recordedBy: 'p10', recordedAt: '2026-05-20T18:00:00Z', overdue: false },

  // ── act-19 (2026-05-28) 5月组织生活会 ──────────────────────
  // 组织生活会考勤记录需补充 studentId/developStage/partyGroup（D-239 中文枚举）
  { id: 'att39', personId: 'p1',  activityId: 'act-19', status: AttendanceStatus.PRESENT,  recordedBy: 'p10', recordedAt: '2026-05-28T18:00:00Z', overdue: false, studentId: '2400012345', developStage: '正式党员', partyGroup: '第一党小组' },
  { id: 'att40', personId: 'p4',  activityId: 'act-19', status: AttendanceStatus.PRESENT,  recordedBy: 'p10', recordedAt: '2026-05-28T18:00:00Z', overdue: false, studentId: '2400012348', developStage: '正式党员', partyGroup: '第三党小组' },
  { id: 'att41', personId: 'p6',  activityId: 'act-19', status: AttendanceStatus.PRESENT,  recordedBy: 'p10', recordedAt: '2026-05-28T18:00:00Z', overdue: false, studentId: '2400012350', developStage: '发展对象', partyGroup: '第一党小组' },
  { id: 'att42', personId: 'p7',  activityId: 'act-19', status: AttendanceStatus.ABSENT,   recordedBy: 'p10', recordedAt: '2026-05-28T18:00:00Z', overdue: false, studentId: '2400012351', developStage: '积极分子', partyGroup: '第三党小组' },
  { id: 'att43', personId: 'p8',  activityId: 'act-19', status: AttendanceStatus.LEAVE,    recordedBy: 'p10', recordedAt: '2026-05-28T18:00:00Z', overdue: false, studentId: '2400012352', developStage: '正式党员', partyGroup: '第二党小组' },

  // ── act-26 (2026-08-07) 8月党小组会（暑期线上） ─────────────
  { id: 'att44', personId: 'p1',  activityId: 'act-26', status: AttendanceStatus.PRESENT,  recordedBy: null,  recordedAt: '2026-08-07T20:00:00Z', overdue: false },
  { id: 'att45', personId: 'p3',  activityId: 'act-26', status: AttendanceStatus.PRESENT,  recordedBy: null,  recordedAt: '2026-08-07T20:00:00Z', overdue: false },

  // ── act-26 考勤扩充（p16~p50 代表，2026-08-01）──────────────
  // 50 人规模整合：三党小组代表参与 8 月线上党小组会，统一待纪检确认（recordedBy null）
  // 第一党小组
  { id: 'att46', personId: 'p16', activityId: 'act-26', status: AttendanceStatus.PRESENT,  recordedBy: null,  recordedAt: '2026-08-07T20:00:00Z', overdue: false },
  { id: 'att47', personId: 'p17', activityId: 'act-26', status: AttendanceStatus.PRESENT,  recordedBy: null,  recordedAt: '2026-08-07T20:00:00Z', overdue: false },
  { id: 'att48', personId: 'p18', activityId: 'act-26', status: AttendanceStatus.PRESENT,  recordedBy: null,  recordedAt: '2026-08-07T20:00:00Z', overdue: false },
  { id: 'att49', personId: 'p28', activityId: 'act-26', status: AttendanceStatus.PRESENT,  recordedBy: null,  recordedAt: '2026-08-07T20:00:00Z', overdue: false },
  // 第二党小组
  { id: 'att50', personId: 'p19', activityId: 'act-26', status: AttendanceStatus.PRESENT,  recordedBy: null,  recordedAt: '2026-08-07T20:00:00Z', overdue: false },
  { id: 'att51', personId: 'p20', activityId: 'act-26', status: AttendanceStatus.LEAVE,    recordedBy: null,  recordedAt: '2026-08-07T20:00:00Z', overdue: false },
  { id: 'att52', personId: 'p22', activityId: 'act-26', status: AttendanceStatus.PRESENT,  recordedBy: null,  recordedAt: '2026-08-07T20:00:00Z', overdue: false },
  { id: 'att53', personId: 'p29', activityId: 'act-26', status: AttendanceStatus.PRESENT,  recordedBy: null,  recordedAt: '2026-08-07T20:00:00Z', overdue: false },
  // 第三党小组
  { id: 'att54', personId: 'p23', activityId: 'act-26', status: AttendanceStatus.PRESENT,  recordedBy: null,  recordedAt: '2026-08-07T20:00:00Z', overdue: false },
  { id: 'att55', personId: 'p24', activityId: 'act-26', status: AttendanceStatus.PRESENT,  recordedBy: null,  recordedAt: '2026-08-07T20:00:00Z', overdue: false },
  { id: 'att56', personId: 'p26', activityId: 'act-26', status: AttendanceStatus.PRESENT,  recordedBy: null,  recordedAt: '2026-08-07T20:00:00Z', overdue: false },
  { id: 'att57', personId: 'p30', activityId: 'act-26', status: AttendanceStatus.PRESENT,  recordedBy: null,  recordedAt: '2026-08-07T20:00:00Z', overdue: false },
  // 50 人新批次代表
  { id: 'att58', personId: 'p32', activityId: 'act-26', status: AttendanceStatus.PRESENT,  recordedBy: null,  recordedAt: '2026-08-07T20:00:00Z', overdue: false },
  { id: 'att59', personId: 'p39', activityId: 'act-26', status: AttendanceStatus.PRESENT,  recordedBy: null,  recordedAt: '2026-08-07T20:00:00Z', overdue: false },
  { id: 'att60', personId: 'p44', activityId: 'act-26', status: AttendanceStatus.PRESENT,  recordedBy: null,  recordedAt: '2026-08-07T20:00:00Z', overdue: false },
];

export function attendanceToLong(records) {
  return records.map(r => ({
    id: r.id,
    name: _personName(r.personId),
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
