// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  attendance.js — 考勤记录 CRUD 服务
// ════════════════════════════════════════════════════════════════

import { mockDB, AttendanceStatus, ATTENDANCE_STATUS_LABELS } from '../core/domain.js?v=20260921f';
import { POLICY_DEFAULTS } from '../core/policy-defaults.js?v=20260921f';
import { persist } from '../core/data-adapter.js?v=20260921f';
import { generateId } from '../core/id.js?v=20260921f';
import { bumpToken } from '../core/version-token.js?v=20260921f'; // P0 域缓存失效（spec §二.3）
import { ATTENDANCE_RECORDS } from '../mock/index.js?v=20260921f';
import { isInitStateActive } from './init-reset.js?v=20260921f'; // C2 修复（2026-09-08）：init 态空态不回退演示种子
import { PersonStore, getPersonById, getPersonName } from './person.js?v=20260921f';
import { getRosterStats } from './roster.js?v=20260921f';
import { loadActivities, isActivityOrganizer } from './activity.js?v=20260921f';

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
  bumpToken('attendance'); // P0：考勤写口统一 bump（纪检确认/组织者上传/纪检录入等均经本函数落库）
  persist();
}

// ── A1 写入门禁（2026-09-05 落代码，操作位语义见 SYSTEM_ROLE_PERMISSION §9b/§9f + CF §C.1a）──

/**
 * 会议考勤的上传位的活动类型（CF §C.1a「会议考勤」）。
 * 2026-09-21 批次 124（支书 2026-09-20 定案「会议考勤上传收归组织者」）：本表是**会议考勤类型清单**
 *   （应到名单口径 / 表单列活动用），**不再等于「纪检的上传位」**——会议考勤的上传主体＝**该场会议的组织者**
 *   （`canUploadAttendance` 按组织者身份判定），**纪检管确认 / 录入总表与统计核对**。
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
 * 活动归属党小组（dogfood 权限专项 2026-09-13）
 * 判据：优先活动 hostGroup（组长写入时固化）；缺省回退组织者所属小组（种子活动无 hostGroup）。
 * 与之同判据的实现见 inspection.js::_activityPartyGroup（勿各自改口径）。
 */
function _activityPartyGroup(activity) {
  if (!activity) return null;
  if (activity.hostGroup) return activity.hostGroup;
  const orgId = activity.organizer
    || (Array.isArray(activity.assignments) ? (activity.assignments.find(x => x.role === 'organizer') || {}).personId : null);
  return orgId ? ((getPersonById(orgId) || {}).partyGroup || null) : null;
}

/**
 * 考勤上传位门禁：谁可对某活动做「上传（追加提交）」
 * - **该场活动的组织者**（判据单一源 = services/activity.js::isActivityOrganizer）——**含会议考勤**
 *   （2026-09-21 批次 124：支书 2026-09-20 定案「会议考勤上传收归组织者」；此前会议类活动由纪检
 *   直接持上传位，现随 `D-287`「材料上传主体一律组织者」收归组织者，**纪检管统计与核对**）
 * - 支书/副支书：例外承担（§9b 注，制度固定）
 * - 党小组会：组长兼组织者（本组上传位）
 */
export function canUploadAttendance(personId, activityId) {
  if (!personId || !activityId) return false;
  const activity = loadActivities().find(a => a.id === activityId);
  if (!activity || activity.archived) return false;
  const role = (getPersonById(personId) || {}).role;
  // 支书/副支书例外承担（§9b 注）：角色数组单源 = policy-defaults attendance.uploaderExceptions.secretaryDeputy
  if (POLICY_DEFAULTS.attendance.uploaderExceptions.secretaryDeputy.includes(role)) return true;
  if (role === 'leader' && activity.type === '党小组会') {
    // 本组上传位（组长手册 §2.1「上传本组考勤」）：仅本组活动；跨组只能督促（只读）。
    // dogfood 权限专项 2026-09-13：此前仅判类型 → 任一组长可代录他组小组会考勤（实测下拉出现
    //   别组小组会且可提交成功），与制度「本组」口径不符。
    const myGroup = (getPersonById(personId) || {}).partyGroup;
    return !!myGroup && _activityPartyGroup(activity) === myGroup;
  }
  // 该活动组织者（组织者按活动身份，组长兼组织者同）——判据单一源 = services/activity.js::isActivityOrganizer
  // （2026-09-19 批次 91 · SOP-B-17：组织者是「这场事上被指定的人」，不是静态角色）
  // 会议考勤（党课/支部党员大会/组织生活会/支委会）与其余活动同规：**上传位只在组织者手上**。
  return isActivityOrganizer(personId, activityId);
}

/**
 * 会议考勤录入（**上传位即确认**，recordedBy=上传者本人；CF §C.1a 会议考勤）
 * 上传主体（2026-09-21 批次 124：支书 2026-09-20 定案「会议考勤上传收归组织者」）＝**该场会议的组织者**
 *   ——门禁仍走 `canUploadAttendance`（含支书/副支书例外承担）；**纪检不再持会议考勤上传位**，
 *   纪检的位置在「待确认队列 · 打包确认」与考勤明细 / 统计核对（`D-287` 材料上传主体一律组织者）。
 * - 默认（不传 opts.overwrite）：同人同活动已有记录（含待复核异常）→ 跳过（不可覆盖已有记录，改走纪检确认界面）
 * - 上传者更正（opts.overwrite=true，支书已批方案A 2026-09-06）：
 *   批量上传时，若该 (activityId,personId) 已有记录且为本人权威所录（recordedBy===actorId，即本人
 *   此前经本入口录入/确认），按本次状态覆盖更正，并写 updatedBy/updatedAt；
 *   他人权威所录记录仍跳过（不可覆盖非本人录入，改走纪检确认界面）。
 * @param {Object} params
 * @param {string} params.actorId 操作人（该场会议组织者本人）
 * @param {Array}  params.records 待录入记录（含 personId/activityId/status）
 * @param {Object} [opts={}]     可选参数
 * @param {boolean} [opts.overwrite=false] true=更正模式：允许覆盖本人已录记录
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
          // 线上参会标记同族处置（D-293 / SOP-B-5）：状态更正为到场时清除——否则「线上参会只免补课」
          // 的标记会挂在一个「已出勤」的记录上，补课判据读到自相矛盾的两件事。
          delete exist.onlineAttend;
        } else if (r.absenceReason) {
          exist.absenceReason = r.absenceReason;
        }
        // 线上参会（申报来源：发布三会一课通知 → 确认收到时填写）经纪检更正入口一并落库
        if (r.status === AttendanceStatus.LEAVE && r.onlineAttend !== undefined) {
          exist.onlineAttend = !!r.onlineAttend;
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

/**
 * 线上参会申报落考勤（SOP-B-5 / `D-293`，2026-09-18 批次 83）
 * 场景：发布三会一课通知时关联本次活动 → 被通知人在通知详情「确认读取」时申报**能线上参会**。
 * 落库形状：该场考勤记 **status = 请假**（线上参会**不计入出席**）+ `onlineAttend = true`（**只免补课**）。
 * 说明：**不**代填出勤——实际到会与否由该场考勤记录与纪检确认决定；`recordedBy` 留空（待纪检确认）。
 * 幂等：同人同活动已有记录一律不覆盖（重复申报返回已申报；状态更正走纪检更正入口）。
 * @param {{ activityId: string, personId: string }} params
 * @returns {{ ok: boolean, reason?: string }}
 */
export function declareOnlineAttend({ activityId, personId } = {}) {
  if (!activityId || !personId) return { ok: false, reason: '缺少活动或申报人' };
  const all = loadAttendanceRecords();
  const exist = all.find(x => x.personId === personId && x.activityId === activityId);
  if (exist) {
    if (exist.status === AttendanceStatus.LEAVE && exist.onlineAttend === true) return { ok: true, reason: 'already' };
    return { ok: false, reason: '该活动已有您的考勤记录，如需更正请联系纪检委员' };
  }
  all.push({
    id: generateId('att'),
    personId,
    activityId,
    status: AttendanceStatus.LEAVE,
    onlineAttend: true,
    // SOP-B-16⑤（2026-09-19 批次 94）：线上参会**不由人认档**（不是事假、也不是病假）⇒ 沿用通用键
    // `leave`（显示「请假」，见 ABSENCE_REASON_LEGACY_LABELS）；档别由纪检复核时认定。
    absenceReason: 'leave',
    submittedBy: personId,
    recordedBy: null,
    overdue: false,
  });
  saveAttendanceRecords(all);
  return { ok: true };
}

// ════════════════════════════════════════════════════════════════
//  出勤申诉与「打回」回退态（SOP-B-42 / `D-456`，2026-09-18 批次 85）
// ════════════════════════════════════════════════════════════════
// 制度原文（纪检委员工作流程指南 §1.1）：「确认后数据锁定……如需更正，由纪检委员打回，
//   交活动组织方重新确认，修改痕迹留存。同学反映『出勤了但没记上』时，纪检委员先调查核实，
//   确属漏记的按打回处理。」`D-456`：**打回是「打包确认」里的例外处理路径**。
// 落成：
//   · 申诉队列 = 本模块自管 localStorage 键 `gsm1921-attendance-appeals`
//     （`gsm1921-` 前缀 → `?reset=demo` 自动清理；做法同 services/member-confirmation.js 的自管键；
//      mock-adapter / 服务端资源表清单不动，本队列只承载读链）。
//   · 「打回」的**回退态**落在考勤记录本体上（`returnedBy / returnedAt / returnReason`）：
//     记录回到「待确认」，且打回留痕**可见**（不再只藏 updatedBy/updatedAt）。
export const ATTENDANCE_APPEALS_KEY = 'gsm1921-attendance-appeals';

/** 读取出勤申诉队列（存储不可用 / 数据损坏 → []） */
export function loadAttendanceAppeals() {
  try {
    if (typeof localStorage === 'undefined') return [];
    const arr = JSON.parse(localStorage.getItem(ATTENDANCE_APPEALS_KEY) || '[]');
    return Array.isArray(arr) ? arr : [];
  } catch (_) { return []; }
}

function _saveAttendanceAppeals(list) {
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem(ATTENDANCE_APPEALS_KEY, JSON.stringify(list));
  } catch (_) { /* 存储不可用：不阻塞流程 */ }
}

/**
 * 提交出勤申诉（成员侧「我参加了但没记上」）。
 * 同人同活动已有未处理（pending）申诉 → 不重复登记。
 * @param {{personId:string, activityId:string, note?:string}} params
 * @returns {{ok:boolean, reason?:string}}
 */
export function createAttendanceAppeal({ personId, activityId, note } = {}) {
  if (!personId || !activityId) return { ok: false, reason: '缺少活动或申诉人' };
  const all = loadAttendanceAppeals();
  if (all.some(a => a.personId === personId && a.activityId === activityId && a.status === 'pending')) {
    return { ok: false, reason: 'already' };
  }
  all.push({
    id: generateId('appeal'),
    personId,
    activityId,
    note: String(note || '').trim(),
    status: 'pending',
    createdAt: new Date().toISOString(),
  });
  _saveAttendanceAppeals(all);
  return { ok: true };
}

/**
 * 关闭申诉（纪检核实后：不属实 / 已另行处理）——留痕可见。
 * @param {string} appealId
 * @param {{by?:string, note?:string, status?:string}} [opts]
 */
export function closeAttendanceAppeal(appealId, { by, note, status = 'closed' } = {}) {
  const all = loadAttendanceAppeals();
  const it = all.find(a => a.id === appealId);
  if (!it) return { ok: false };
  it.status = status;
  it.decidedBy = by || null;
  it.decidedAt = new Date().toISOString();
  if (note) it.decisionNote = String(note);
  _saveAttendanceAppeals(all);
  return { ok: true };
}

/**
 * 纪检核实属实 → 打回，交活动组织方确认（`D-456`）。
 * ① 申诉置 `returned`（留痕：谁在何时打回、打回说明）；
 * ② 若该人该场**已有考勤记录**，记录一并置回退态（清确认人 + 写 returnedBy/returnedAt/returnReason）
 *    ——回到「待确认」，由组织者重新确认或更正，修改痕迹留存。
 * @returns {{ok:boolean, hadRecord:boolean}}
 */
export function returnAttendanceAppeal(appealId, { by, note } = {}) {
  const all = loadAttendanceAppeals();
  const it = all.find(a => a.id === appealId);
  if (!it || it.status !== 'pending') return { ok: false, hadRecord: false };
  const at = new Date().toISOString();
  it.status = 'returned';
  it.returnedBy = by || null;
  it.returnedAt = at;
  it.returnNote = String(note || '').trim();
  _saveAttendanceAppeals(all);
  const records = loadAttendanceRecords();
  const rec = records.find(r => r.personId === it.personId && r.activityId === it.activityId);
  if (rec) {
    rec.returnedBy = by || null;
    rec.returnedAt = at;
    rec.returnReason = it.returnNote || '出勤申诉核实';
    delete rec.recordedBy;
    delete rec.recordedAt;
    saveAttendanceRecords(records);
  }
  return { ok: true, hadRecord: !!rec };
}

/**
 * 对单个考勤记录打回（纪检「打包确认」的例外路径）：清确认人 + 写打回留痕 → 回到「待确认」。
 * @returns {{ok:boolean}}
 */
export function returnAttendanceRecord(recordId, { by, note } = {}) {
  const records = loadAttendanceRecords();
  const rec = records.find(r => r.id === recordId);
  if (!rec) return { ok: false };
  rec.returnedBy = by || null;
  rec.returnedAt = new Date().toISOString();
  rec.returnReason = String(note || '').trim() || '纪检打回';
  delete rec.recordedBy;
  delete rec.recordedAt;
  saveAttendanceRecords(records);
  return { ok: true };
}

/** 组织者确认的公共写口（改状态 + 清打回痕 + 回「待确认」；异常仍待纪检复核，出勤/已补由源头审校自动确认） */
function _applyOrganizerReconfirmation(rec, records, { actorId, status, absenceReason } = {}) {
  if (status) rec.status = status;
  if (rec.status === AttendanceStatus.PRESENT || rec.status === AttendanceStatus.MADE_UP) {
    delete rec.absenceReason;
    delete rec.onlineAttend;
  } else if (absenceReason) {
    rec.absenceReason = absenceReason;
  }
  delete rec.returnedBy;
  delete rec.returnedAt;
  delete rec.returnReason;
  rec.submittedBy = actorId || rec.submittedBy;
  delete rec.recordedBy;
  delete rec.recordedAt;
  saveAttendanceRecords(records);
  return { ok: true };
}

/**
 * 组织者重新确认（打回后可恢复的另一半）：把回退态记录改成组织者认定的状态、清打回痕、回「待确认」。
 * @param {string} recordId
 * @param {{actorId:string, status?:string, absenceReason?:string}} opts
 */
export function reconfirmReturnedRecord(recordId, { actorId, status, absenceReason } = {}) {
  const records = loadAttendanceRecords();
  const rec = records.find(r => r.id === recordId);
  if (!rec) return { ok: false };
  return _applyOrganizerReconfirmation(rec, records, { actorId, status, absenceReason });
}

/**
 * 组织者对「出勤申诉」的确认（打回后闭环）：按核实结论写入/更正该场该人的考勤（组织者口径），并关闭申诉。
 * @param {{appealId:string, actorId:string, status?:string, absenceReason?:string, note?:string}} params
 */
export function resolveAttendanceAppeal({ appealId, actorId, status, absenceReason, note } = {}) {
  const all = loadAttendanceAppeals();
  const it = all.find(a => a.id === appealId);
  if (!it) return { ok: false };
  const records = loadAttendanceRecords();
  const rec = records.find(r => r.personId === it.personId && r.activityId === it.activityId);
  if (rec) {
    _applyOrganizerReconfirmation(rec, records, { actorId, status, absenceReason });
  } else {
    const next = {
      id: generateId('att'),
      personId: it.personId,
      activityId: it.activityId,
      status: status || AttendanceStatus.PRESENT,
      submittedBy: actorId,
      recordedBy: null,
      overdue: false,
    };
    if (next.status !== AttendanceStatus.PRESENT && next.status !== AttendanceStatus.MADE_UP) {
      next.absenceReason = absenceReason || 'other';
    }
    records.push(next);
    saveAttendanceRecords(records);
  }
  it.status = 'closed';
  it.decidedBy = actorId || null;
  it.decidedAt = new Date().toISOString();
  if (note) it.decisionNote = String(note);
  _saveAttendanceAppeals(all);
  return { ok: true };
}

// ── 展示格式化（2026-09-03 数据域接线批次二：自 mock/attendance.js 原样提升）──
const _personName = (id) => getPersonName(id);
// R-16（2026-09-13）：改从 loadActivities()（mockDB 优先）取——API 模式下新建活动不在静态种子
// ACTIVITIES 中，此前台账只显示 act-xxxx 原始 id（人会看不懂是哪场活动）
const _activityTitle = (id) => loadActivities().find(a => a.id === id)?.title || id;
const _activityType = (id) => loadActivities().find(a => a.id === id)?.type || '未知';

/** 考勤记录展示长格式（记录 → 姓名/学号/发展阶段/所属党小组/活动/类别/状态/确认人） */
export function attendanceToLong(records) {
  return records.map(r => {
    // SOP-B-20（D-331）：汇总表第一列是人——人员的三项属性（学号/发展阶段/所属党小组）
    // 与活动侧字段同表呈现；人员属性一律现取（禁用记录内快照）。
    const m = getPersonById(r.personId) || {};
    return {
      id: r.id,
      name: _personName(r.personId),
      // Q-21-7（2026-09-13）：透出 personId 供「考勤明细」姓名列接成员档案页入口（与 activityId 同型——
      // 服务层唯一出口，勿在页面各自反查记录）
      personId: r.personId,
      studentId: m.studentId || '',
      developStage: m.developStage || '',
      partyGroup: m.partyGroup || '',
      // R-16：透出来源活动标识，供台账行补「查看该活动」链接（服务层唯一出口，勿在页面各自反查）
      activityId: r.activityId || null,
      activity: _activityTitle(r.activityId),
      type: _activityType(r.activityId),
      status: ATTENDANCE_STATUS_LABELS[r.status] || r.status,
      statusKey: r.status,
      // 线上参会（D-293 / SOP-B-5）：线上参会不计入出席（记「请假」）、只免补课——
      // 单列字段供各展示点标注「· 线上参会」，勿把它并进 status 中文标签（状态筛选按 statusKey 判）。
      onlineAttend: r.onlineAttend === true,
      confirmer: r.recordedBy ? _personName(r.recordedBy) : '—',
      overdue: r.overdue,
    };
  });
}

/**
 * 活动参与汇总（SOP-B-30 / `D-396`）：**以人为第一列**、按**各类活动**汇总参与情况（写工作总结时可直接引用）。
 * 口径：**参与＝出勤 / 已补**（线上参会只免补课、不计出席，故不计入）；一条记录计一次；请假 / 缺勤不计。
 * 列＝数据里出现过的活动类别（活动 type，按中文序）；行＝有过考勤记录的人（无记录者不占位）。
 * 纯数据辅助（无 DOM）：组织委员台「发展数据」tab 的「活动参与汇总」卡消费；单测可直导。
 * @param {Array} [records] 考勤记录（缺省 = 活跃记录）
 * @returns {{ types: string[], rows: Array<Object> }}
 */
export function listActivityParticipationByPerson(records) {
  const src = records || loadActiveAttendanceRecords();
  const actById = new Map(loadActivities().map(a => [a.id, a]));
  const byPerson = new Map();
  const typeSet = new Set();
  for (const r of src) {
    const act = actById.get(r.activityId);
    if (!act) continue; // 活动已下架（无类别可归）不计入，避免造「未知」列
    const type = act.type || '';
    if (!type) continue;
    typeSet.add(type);
    if (!byPerson.has(r.personId)) {
      const m = getPersonById(r.personId) || {};
      byPerson.set(r.personId, {
        personId: r.personId,
        name: _personName(r.personId),
        studentId: m.studentId || '',
        partyGroup: m.partyGroup || '',
        developStage: m.developStage || '',
        role: m.role || '',
        counts: {},
        total: 0,
      });
    }
    if (r.status === AttendanceStatus.PRESENT || r.status === AttendanceStatus.MADE_UP) {
      const row = byPerson.get(r.personId);
      row.counts[type] = (row.counts[type] || 0) + 1;
      row.total += 1;
    }
  }
  const zh = (a, b) => String(a).localeCompare(String(b), 'zh');
  return {
    types: [...typeSet].sort(zh),
    rows: [...byPerson.values()].sort((a, b) => b.total - a.total || zh(a.name, b.name)),
  };
}

/**
 * 出勤率汇总（SOP-B-35 / `D-412`，2026-09-18 批次 85）：**按场次（活动）**汇总本月出勤率——
 * 出勤含「已补」；线上参会不计出席（记请假）——口径与全站各处一致（单一源，勿在页面另算）。
 * 供纪检台「导出出勤率汇总（支委会内部）」与支书台「偏低提示」同一读口消费。
 * @param {{month?:string, records?:Array}} [params] month 形如 '2026-09'（缺省 = 全部活动）
 * @returns {{month:string, rows:Array<Object>, total:number, presentTotal:number, rate:number}}
 */
export function summarizeAttendanceByActivity({ month, records } = {}) {
  const src = records || loadActiveAttendanceRecords();
  const rows = [];
  for (const a of loadActivities()) {
    if (month && !(a.date || '').startsWith(month)) continue;
    const rs = src.filter(r => r.activityId === a.id);
    if (rs.length === 0) continue; // 无考勤记录的场次不占位
    const present = rs.filter(r => r.status === AttendanceStatus.PRESENT || r.status === AttendanceStatus.MADE_UP).length;
    const leave = rs.filter(r => r.status === AttendanceStatus.LEAVE).length;
    const absent = rs.filter(r => r.status === AttendanceStatus.ABSENT).length;
    rows.push({
      activityId: a.id, activity: a.title, date: a.date || '', type: a.type || '',
      total: rs.length, present, leave, absent,
      rate: Math.round((present / rs.length) * 100),
    });
  }
  rows.sort((x, y) => (y.date || '').localeCompare(x.date || ''));
  const total = rows.reduce((s, r) => s + r.total, 0);
  const presentTotal = rows.reduce((s, r) => s + r.present, 0);
  return { month: month || '', rows, total, presentTotal, rate: total > 0 ? Math.round((presentTotal / total) * 100) : 0 };
}

/**
 * 我的出勤率（SOP-B-15 当事人可见侧，2026-09-20 批次 116 支书定案「支委会 ＋ 当事人本人」）：
 * **只算传入的这一人**——调用侧只传当前登录人（成员台「考勤概况」），故当事人看不到别人的出勤率。
 * 口径与全站一致（单一源，勿在页面另算）：出勤 ＝ 出勤 / 已补；分母 ＝ 该人当月有考勤记录的场次；
 * 线上参会记「请假」、不计出席（与 `summarizeAttendanceByActivity` 同口径）。
 * @param {{personId:string, month?:string}} [params] month 形如 '2026-09'（缺省 = 该人全部活跃记录）
 * @returns {{total:number, present:number, leave:number, absent:number, rate:number}}
 */
export function summarizePersonAttendance({ personId, month } = {}) {
  const empty = { total: 0, present: 0, leave: 0, absent: 0, rate: 0 };
  if (!personId) return empty;
  const actById = new Map(loadActivities().map(a => [a.id, a]));
  const mine = loadActiveAttendanceRecords().filter(r => {
    if (r.personId !== personId) return false;
    const act = actById.get(r.activityId);
    if (!act) return false;
    return !month || (act.date || '').startsWith(month);
  });
  if (mine.length === 0) return empty;
  const present = mine.filter(r => r.status === AttendanceStatus.PRESENT || r.status === AttendanceStatus.MADE_UP).length;
  const leave = mine.filter(r => r.status === AttendanceStatus.LEAVE).length;
  const absent = mine.filter(r => r.status === AttendanceStatus.ABSENT).length;
  return { total: mine.length, present, leave, absent, rate: Math.round((present / mine.length) * 100) };
}

/**
 * 出勤率偏低提示（SOP-B-15 / `SOP-B-7`，2026-09-18 批次 85）：**只作提示、不触发任何动作**
 * （不生成补课 / 不影响评优 / 不生成任何处置）。
 * 判据 = **提示线**（可调参数 `POLICY_DEFAULTS.attendance.lowRateHint`）——**提示线 ≠ 制度门槛**：
 *   母本不设达标线，本函数只用来「让相关成员知道出勤率偏低这件事」。
 * @param {{month?:string, hint?:number}} [params]
 * @returns {{hint:number, month:string, rows:Array<Object>}}
 */
export function listLowAttendanceSessions({ month, hint } = {}) {
  const line = Number.isFinite(hint) ? hint : POLICY_DEFAULTS.attendance.lowRateHint;
  const sum = summarizeAttendanceByActivity({ month });
  return { hint: line, month: sum.month, rows: sum.rows.filter(r => r.rate < line) };
}

// ════════════════════════════════════════════════════════════════
//  附录⑩ A批·S1 会务考勤规则域（支书裁定 2026-09-06）
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

/** 未到标因固定枚举 — 单源 = policy attendance.reasons（R1-2：纪检认定标因，禁造新枚举）
 *  （2026-09-19 批次 94 · SOP-B-16⑤：请假分事假 / 病假两档，各档带时效 note） */
export const ABSENCE_REASONS = POLICY_DEFAULTS.attendance.reasons.map(r => ({ ...r }));

/** 兼容别名（**不出现在可选枚举**，仅供显示）：旧键 `leave`（请假）——存量记录与「线上参会」代记
 *  （`declareOnlineAttend`）仍携该键；显示照旧「请假」，新录入不再可直接选它。 */
const ABSENCE_REASON_LEGACY_LABELS = { leave: '请假' };

/** 标因中文标签（未知键回退键原文；空 → 空串；`leave` 走兼容别名 → 「请假」） */
export function absenceReasonLabel(key) {
  if (!key) return '';
  const it = POLICY_DEFAULTS.attendance.reasons.find(r => r.key === key);
  if (it) return it.label;
  return ABSENCE_REASON_LEGACY_LABELS[key] || key;
}

/** 标因时效提示（SOP-B-16⑤）：事假「须提前 1 天申请」/ 病假「可事后补」——**界面提示，不是校验、不拦提交**。
 *  无 note 的档（无故 / 其它）与未知键返回空串。 */
export function absenceReasonNote(key) {
  if (!key) return '';
  const it = POLICY_DEFAULTS.attendance.reasons.find(r => r.key === key);
  return (it && it.note) || '';
}

/**
 * 纪检应到清点（含滞留到场补录，R1-3 支书 2026-09-06 裁定）：
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
 * 党小组会考勤只读视图数据（R1-1/裁定④：纪检纪律台只读掌握——组织者上传、不代传不审改）。
 * 按小组会活动聚合：组别 = 活动 organizer 所属党小组（缺省取成员多数党小组）；组长 = 该组
 * role 'leader' 成员（记录人语义）；上传人 = submittedBy（组织者上传即本人，可辨）。
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
