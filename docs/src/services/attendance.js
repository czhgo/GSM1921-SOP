// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  attendance.js — 考勤记录 CRUD 服务
// ════════════════════════════════════════════════════════════════

import { mockDB, AttendanceStatus, ATTENDANCE_STATUS_LABELS } from '../core/domain.js?v=20260909e';
import { POLICY_DEFAULTS } from '../core/policy-defaults.js?v=20260909e';
import { persist } from '../core/data-adapter.js?v=20260909e';
import { bumpToken } from '../core/version-token.js?v=20260909e'; // P0 域缓存失效（spec §二.3）
import { ATTENDANCE_RECORDS } from '../mock/index.js?v=20260909e';
import { ACTIVITIES } from '../mock/activities.js?v=20260909e';
import { isInitStateActive } from './init-reset.js?v=20260909e'; // C2 修复（2026-09-08）：init 态空态不回退演示种子
import { PersonStore, getPersonById, getPersonName } from './person.js?v=20260909e';
import { getRosterStats } from './roster.js?v=20260909e';
import { loadActivities } from './activity.js?v=20260909e';

export function loadAttendanceRecords() {
  if (mockDB.attendances.length > 0) return [...mockDB.attendances];
  // C2 修复（2026-09-08）：init 态下 mockDB 空 = 合法空支部态，不回退演示种子（同 loadActivities）。
  return isInitStateActive() ? [] : [...ATTENDANCE_RECORDS];
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
  bumpToken('attendance'); // P0：考勤写口统一 bump（纪检确认/组长上传/纪检录入等均经本函数落库）
  persist();
}

// ── A1 写入门禁（2026-09-05 落代码，操作位语义见 SYSTEM_ROLE_PERMISSION §9b/§9f + CF §C.1a）──

/**
 * 会议考勤上传位的活动类型（纪检直接上传并录入，CF §C.1a「会议考勤」）。
 * P3c 单一源 = core/policy-defaults.js（派生导出，导出去重冻结导出面）：
 * 默认=本科生党支部口径（党课/支部党员大会/组织生活会/支委会）；
 * 党小组会/主题党日归组长·组织者位，不入此列。见 .ctx/ENGINEERING_ASSESSMENT.md 行动线 P3b。
 */
export const MEETING_ATTENDANCE_TYPES = [...POLICY_DEFAULTS.attendance.meetingTypes];

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
  // 书记/副书记例外承担（§9b 注）：角色数组单源 = policy-defaults attendance.uploaderExceptions.secretaryDeputy
  if (POLICY_DEFAULTS.attendance.uploaderExceptions.secretaryDeputy.includes(role)) return true;
  if (role === 'disc-commissioner') {
    // 纪检：会议考勤上传位（CF §C.1a）；类型清单单源 = MEETING_ATTENDANCE_TYPES（policy-defaults 派生）
    return MEETING_ATTENDANCE_TYPES.includes(activity.type);
  }
  if (role === 'leader' && activity.type === '党小组会') return true;
  // 该活动组织者（组织者按活动身份，组长兼组织者同）
  const isOrg = (Array.isArray(activity.assignments) && activity.assignments.some(x => x.personId === personId && x.role === 'organizer'))
    || activity.organizer === personId;
  return !!isOrg;
}

/**
 * 纪检会议考勤直接录入（上传位即确认，recordedBy=纪检；CF §C.1a 会议考勤：上传/修改/确认/录入）
 * - 默认（不传 opts.overwrite）：同人同活动已有记录（含待复核异常）→ 跳过（不可覆盖已有记录，改走纪检确认界面）
 * - 纪检更正（opts.overwrite=true，书记已批方案A 2026-09-06）：
 *   批量上传时，若该 (activityId,personId) 已有记录且为本人权威所录（recordedBy===actorId，即纪检本人
 *   此前经会议考勤位录入/确认），按本次状态覆盖更正，并写 updatedBy/updatedAt；
 *   他人权威所录记录仍跳过（不可覆盖非本人录入，改走纪检确认界面）。
 * @param {Object} params
 * @param {string} params.actorId 操作人（纪检本人）
 * @param {Array}  params.records 待录入记录（含 personId/activityId/status）
 * @param {Object} [opts={}]     可选参数
 * @param {boolean} [opts.overwrite=false] true=纪检更正模式：允许覆盖本人已录记录
 * @returns {{ added: number, updated: number, skipped: number }}
 */
export function upsertMeetingAttendance({ actorId, records = [] }, opts = {}) {
  const res = { added: 0, updated: 0, skipped: 0 };
  if (!actorId || !Array.isArray(records) || records.length === 0) return res;
  const overwrite = !!opts.overwrite;
  const all = loadAttendanceRecords();
  records.forEach(r => {
    if (!r.personId || !r.activityId) return;
    if (!canUploadAttendance(actorId, r.activityId)) { res.skipped += 1; return; }
    const exist = all.find(x => x.personId === r.personId && x.activityId === r.activityId);
    if (exist) {
      // 纪检更正（方案A）：仅同一权威（recordedBy===纪检本人）的已录记录可覆盖更正；他人权威仍跳过
      if (overwrite && exist.recordedBy === actorId) {
        exist.status = r.status;
        // 附录⑩ A批·S1 · R1-2/R1-3：更正同步「标因 + 滞留补录标记」——
        //   未到（缺勤/请假）携固定枚举标因 absenceReason；更正为到场（出勤/已补）时清除旧标因；
        //   detainedMakeup 仅当本次携带时写入（普通行重提 → 清除滞留补录标记，防历史补录误延续）。
        if (r.status === AttendanceStatus.PRESENT || r.status === AttendanceStatus.MADE_UP) {
          delete exist.absenceReason;
        } else if (r.absenceReason) {
          exist.absenceReason = r.absenceReason;
        }
        if (r.detainedMakeup !== undefined) exist.detainedMakeup = !!r.detainedMakeup;
        else delete exist.detainedMakeup;
        exist.updatedBy = actorId;
        exist.updatedAt = new Date().toISOString();
        res.updated += 1;
      } else {
        res.skipped += 1;
      }
      return;
    }
    all.push({ ...r, submittedBy: actorId, recordedBy: actorId, overdue: false });
    res.added += 1;
  });
  if (res.added > 0 || res.updated > 0) saveAttendanceRecords(all);
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

// ════════════════════════════════════════════════════════════════
//  附录⑩ A批·S1 会务考勤规则域（书记裁定 2026-09-06）
//  派生出口均以 core/policy-defaults.js attendance 为单一源，业务层勿新写字面量
// ════════════════════════════════════════════════════════════════

/** 会议考勤记录人（按活动类型）— 单源 = policy attendance.recorderByType（R1-1 正式化）；深拷贝防消费点改动穿透 */
export const ATTENDANCE_RECORDER_BY_TYPE = Object.fromEntries(
  Object.entries(POLICY_DEFAULTS.attendance.recorderByType).map(([type, roles]) => [type, [...roles]])
);

/** 取某活动类型的记录人角色键数组（拷贝；未入表的类型（如主题党日=组织者位）= 空表） */
export function recorderRolesOf(type) {
  return [...(ATTENDANCE_RECORDER_BY_TYPE[type] || [])];
}

/** 未到标因固定枚举 — 单源 = policy attendance.reasons（R1-2：纪检认定标因，禁造新枚举） */
export const ABSENCE_REASONS = POLICY_DEFAULTS.attendance.reasons.map(r => ({ ...r }));

/** 标因中文标签（未知键回退键原文；空 → 空串） */
export function absenceReasonLabel(key) {
  if (!key) return '';
  const it = POLICY_DEFAULTS.attendance.reasons.find(r => r.key === key);
  return it ? it.label : key;
}

/**
 * 纪检应到清点（含滞留到场补录，R1-3 书记裁定）：
 * K = 会前预应到 = 口径统计 expected（在册党员 − 滞留剔除）；
 * L = 该活动滞留到场补录人数（落行标记 detainedMakeup=true 的记录数）；
 * 实际应到 = K + L（补录者计「到席」，档案按在场展示）。
 * @param {Object} [params]
 * @param {string} [params.type]     会议类型（'党小组会' 需配 groupId）
 * @param {string} [params.groupId]  党小组名（党小组会必填）
 * @param {string} [params.activityId] 目标活动（缺省 = 不按活动统计 L）
 * @param {Array}  [params.records]  考勤记录（缺省 = 活跃记录，与界面同源）
 * @returns {{ expectedPre:number, makeupArrival:number, actualExpected:number }}
 */
export function countExpectedWithMakeup({ type, groupId, activityId, records } = {}) {
  const stats = getRosterStats({ type, groupId });
  const src = records || loadActiveAttendanceRecords();
  const makeupArrival = activityId
    ? src.filter(r => r.activityId === activityId && r.detainedMakeup).length
    : 0;
  return { expectedPre: stats.expected, makeupArrival, actualExpected: stats.expected + makeupArrival };
}

/**
 * 党小组会考勤只读视图数据（R1-1/裁定④：纪检纪律台只读掌握——组长上传、不代传不审改）。
 * 按小组会活动聚合：组别 = 活动 organizer 所属党小组（缺省取成员多数党小组）；组长 = 该组
 * role 'leader' 成员（记录人语义）；上传人 = submittedBy（组长上传即本人，可辨）。
 * 纯数据辅助：纪检 disc attendance-tab 下方只读浏览块消费；单测直导无 DOM。
 * @param {Array} [records] 考勤记录（缺省 = 活跃记录）
 * @returns {Array<Object>} 按活动降序的聚合视图
 */
export function listGroupMeetingAttendance(records) {
  const src = records || loadActiveAttendanceRecords();
  const acts = loadActivities().filter(a => a.type === '党小组会' && !a.archived);
  const people = PersonStore.getMembers();
  const byId = new Map(people.map(p => [p.id, p]));
  const view = [];
  for (const a of acts) {
    const rows = src.filter(r => r.activityId === a.id);
    if (rows.length === 0) continue; // 无考勤记录的小组会不占位
    const org = a.organizer ? byId.get(a.organizer) : null;
    const memberGroups = [...new Set(rows.map(r => byId.get(r.personId)?.partyGroup).filter(Boolean))];
    // 组别推导：活动组织者所属党小组优先；组织者缺失/串组时取成员多数党小组
    const groupName = org?.partyGroup
      || (memberGroups.length > 0
        ? memberGroups.reduce((acc, g) =>
            (rows.filter(r => byId.get(r.personId)?.partyGroup === g).length
              > rows.filter(r => byId.get(r.personId)?.partyGroup === acc).length ? g : acc), memberGroups[0])
        : '');
    const leader = groupName ? people.find(p => p.role === 'leader' && p.partyGroup === groupName) : null;
    const uploaderId = rows[0]?.submittedBy || null;
    view.push({
      activityId: a.id,
      title: a.title,
      date: a.date || '',
      groupName,
      leaderId: leader ? leader.id : null,
      leaderName: leader ? leader.name : '',
      uploaderId,
      uploaderName: uploaderId ? _personName(uploaderId) : '',
      total: rows.length,
      present: rows.filter(r => r.status === AttendanceStatus.PRESENT || r.status === AttendanceStatus.MADE_UP).length,
      rows: rows.map(r => ({
        personId: r.personId,
        name: _personName(r.personId),
        status: r.status,
        statusLabel: ATTENDANCE_STATUS_LABELS[r.status] || r.status,
        absenceReason: r.absenceReason || null,
        absenceReasonLabel: r.absenceReason ? absenceReasonLabel(r.absenceReason) : '',
        detainedMakeup: !!r.detainedMakeup,
      })),
    });
  }
  return view.sort((x, y) => (y.date || '').localeCompare(x.date || ''));
}
