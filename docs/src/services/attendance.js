// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  attendance.js — 考勤记录 CRUD 服务
// ════════════════════════════════════════════════════════════════

import { mockDB, AttendanceStatus, ATTENDANCE_STATUS_LABELS } from '../core/domain.js?v=20260903c';
import { persist } from '../core/data-adapter.js?v=20260903c';
import { ATTENDANCE_RECORDS } from '../mock/index.js?v=20260903c';
import { ACTIVITIES } from '../mock/activities.js?v=20260903c';
import { getPersonById, getPersonName } from './person.js?v=20260903c';
import { loadActivities } from './activity.js?v=20260903c';

export function loadAttendanceRecords() {
  return mockDB.attendances.length > 0 ? [...mockDB.attendances] : [...ATTENDANCE_RECORDS];
}

/**
 * 读取活跃活动的考勤记录（2026-08-08 归档闭环）
 * 已归档活动的考勤随活动退出工作区展示。
 * ⚠️ 写流程（确认考勤等读取→修改→整表写回）必须使用 loadAttendanceRecords 原始版，
 *    否则整表写回会丢失已归档活动的考勤记录。
 */
export function loadActiveAttendanceRecords() {
  const activeIds = new Set(loadActivities().filter(a => !a.archived).map(a => a.id));
  return loadAttendanceRecords().filter(r => activeIds.has(r.activityId));
}

export function saveAttendanceRecords(records) {
  mockDB.attendances = [...records];
  persist();
}

// ── A1 写入门禁（2026-09-05 落代码，操作位语义见 SYSTEM_ROLE_PERMISSION §9b/§9f + CF §C.1a）──

/** 考勤记录是否已闭环锁定（不可由上传侧覆盖）：出勤/已补 = 源头审校已确认；recordedBy 非空 = 纪检已复核 */
function isAttendanceLocked(r) {
  if (!r) return true;
  if (r.status === AttendanceStatus.PRESENT || r.status === AttendanceStatus.MADE_UP) return true;
  return !!r.recordedBy;
}

/**
 * 考勤上传位门禁：谁可对某活动做「上传（追加提交）」
 * - 纪检委员：会议考勤上传位（CF §C.1a）；书记/副书记：例外承担（§9b 注）
 * - 党小组会：组长兼组织者（本组上传位）
 * - 其余类型：仅该活动组织者（assignments organizer 或顶层 organizer 派生）
 */
export function canUploadAttendance(personId, activityId) {
  if (!personId || !activityId) return false;
  const activity = loadActivities().find(a => a.id === activityId);
  if (!activity || activity.archived) return false;
  const role = (getPersonById(personId) || {}).role;
  if (role === 'secretary' || role === 'deputy-secretary') return true; // 书记/副书记例外承担
  if (role === 'disc-commissioner') {
    // 纪检：会议考勤上传位（党课/支部党员大会/组织生活会/支委会等会议类，CF §C.1a）；党小组会与主题党日归组长/组织者
    return ['党课', '支部党员大会', '组织生活会', '支委会'].includes(activity.type);
  }
  if (role === 'leader' && activity.type === '党小组会') return true;
  // 该活动组织者（组织者按活动身份，组长兼组织者同）
  const isOrg = (Array.isArray(activity.assignments) && activity.assignments.some(x => x.personId === personId && x.role === 'organizer'))
    || activity.organizer === personId;
  return !!isOrg;
}

/**
 * 纪检会议考勤直接录入（上传位即确认，recordedBy=纪检；CF §C.1a 会议考勤：上传/修改/确认/录入）
 * 同人同活动已有记录（含待复核异常）→ 跳过（不可覆盖已有记录，改走纪检确认界面）
 * @returns {{ added: number, skipped: number }}
 */
export function upsertMeetingAttendance({ actorId, records = [] }) {
  const res = { added: 0, skipped: 0 };
  if (!actorId || !Array.isArray(records) || records.length === 0) return res;
  const all = loadAttendanceRecords();
  records.forEach(r => {
    if (!r.personId || !r.activityId) return;
    if (!canUploadAttendance(actorId, r.activityId)) { res.skipped += 1; return; }
    const exist = all.find(x => x.personId === r.personId && x.activityId === r.activityId);
    if (exist) { res.skipped += 1; return; }
    all.push({ ...r, submittedBy: actorId, recordedBy: actorId, overdue: false });
    res.added += 1;
  });
  if (res.added > 0) saveAttendanceRecords(all);
  return res;
}

/**
 * 考勤追加提交（组织者上传位语义）：
 * - 同人同活动已有记录且已闭环锁定（出勤/已补/纪检已复核）→ 跳过（重复上传，不覆盖已确认记录）
 * - 同人同活动已有待纪检复核的异常（缺勤/请假）→ 拦截（改/删走纪检确认流程，见 CF §C.1a）
 * - 其余 → 追加（submittedBy=上传者）
 * @returns {{ added: number, skipped: number, blocked: number, denied: boolean }}
 */
export function appendAttendanceRecords({ actorId, actorRole, records = [] }) {
  const res = { added: 0, skipped: 0, blocked: 0, denied: false };
  if (!actorId || !Array.isArray(records) || records.length === 0) return res;
  const all = loadAttendanceRecords();
  records.forEach(r => {
    if (!r.personId || !r.activityId) return;
    // 上传位门禁：每一条记录的活动都须在上传者权限内
    if (!canUploadAttendance(actorId, r.activityId)) {
      res.blocked += 1;
      return;
    }
    const exist = all.find(x => x.personId === r.personId && x.activityId === r.activityId);
    if (exist) {
      if (isAttendanceLocked(exist)) { res.skipped += 1; return; }
      // 待纪检复核的异常记录：组长改状态走纪检确认，不上传侧直改
      res.blocked += 1;
      return;
    }
    all.push({ ...r, submittedBy: actorId, recordedBy: null, overdue: false });
    res.added += 1;
  });
  if (res.added > 0) saveAttendanceRecords(all);
  return res;
}

// ── 展示格式化（2026-09-03 数据域接线批次二：自 mock/attendance.js 原样提升）──
const _personName = (id) => getPersonName(id);
const _activityTitle = (id) => ACTIVITIES.find(a => a.id === id)?.title || id;
const _activityType = (id) => ACTIVITIES.find(a => a.id === id)?.type || '未知';

/** 考勤记录展示长格式（记录 → 姓名/活动/状态/确认人） */
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
