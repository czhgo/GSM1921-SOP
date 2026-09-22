// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  makeup.js — 补课任务 CRUD 服务
// ════════════════════════════════════════════════════════════════
// 补课判据（现行口径 = 制度，2026-09-18 批次 83 落地；出处 `D-293` / `D-306` / `D-399`）：
//   ① 范围（制度默认）＝**支部党员大会 + 党课**（不是整个三会一课）；
//   ② **支委会不补课**；**主题党日不强制补课**（不在补课名单内）；
//   ③ **党小组会不默认补课**——该场活动**写入时勾选**「本次要求补课」（`activity.requireMakeup`）才补；
//   ④ 判据三分：请假 + **线上参会** → 不补课；请假 + 未参会 → 须补课；未请假而缺席 → 须补课。
//   线上参会的落点＝考勤记录 `onlineAttend` 标记（发布三会一课通知 → 确认收到时申报，`SOP-B-5`），
//   线上参会**不计入出席**（记「请假」）、**只免补课**。
//
// **活动级勾选与制度范围的两层关系（支书 2026-09-20 定案 · 批次 123）**：
//   支书原话「**分类型：硬要求刚性，其余可关**」——① **制度硬要求类型（＝`MAKEUP_DEFAULT_ACTIVITY_TYPES`）
//   的补课，任何单场活动都关不掉**：活动级勾选对它们**只能加、不能减**（勾了仍要补、不勾也照补，
//   写入侧也无「关闭」入口）；② **其余类型**（党小组会、支委会、主题党日等，本就不在制度默认范围内）
//   **逐场开关**：勾 = 本场要补、不勾 = 本场不补。⇒「只有两项的名单」是硬要求名单**唯一的判据源**，
//   消费点勿另写第二份，也别把某项从这里挪走当成「关掉」。见 `D-467` / `D-545`。

import { mockDB, AttendanceStatus } from '../core/domain.js?v=20260922g';
import { persist } from '../core/data-adapter.js?v=20260922g';
import { PEOPLE } from '../mock/index.js?v=20260922g';
import { getPersonById } from './person.js?v=20260922g';
import { loadAttendanceRecords, saveAttendanceRecords } from '../services/attendance.js?v=20260922g';
import { findActivityById } from '../services/activity.js?v=20260922g';
import { generateId } from '../core/id.js?v=20260922g';

/**
 * 补课范围的**制度默认**活动类型（单一源；消费点勿另写字面量）。
 * 现行口径 = 支部党员大会 + 党课（`D-293` / `D-306`）；支委会、党小组会、主题党日**不在**默认范围内。
 * 党小组会等「按该次活动情形定」的场合，走活动级勾选 `activity.requireMakeup`（`SOP-B-6`）。
 */
export const MAKEUP_DEFAULT_ACTIVITY_TYPES = ['支部党员大会', '党课'];

/**
 * 该场活动是否要求补课（补课范围判据的**单一出口**）
 * · `activity.requireMakeup === true` → 要求（活动级勾选：党小组会等按需，写入活动时勾选）；
 * · 其余按制度默认范围（仅支部党员大会 / 党课）。
 * ⚠ **只能加、不能减**（支书 2026-09-20 定案「硬要求刚性，其余可关」）：活动级标记为 `false` /
 *   缺省时，制度默认范围**照旧生效**——支部党员大会与党课不因单场未勾（或显式置 false）而免补课。
 *   故本函数**不读「显式 false」**：那是不可减的表达，不是「关」。
 * @param {Object|null} activity
 * @returns {boolean}
 */
export function isMakeupRequired(activity) {
  if (!activity) return false;
  if (activity.requireMakeup === true) return true;
  return MAKEUP_DEFAULT_ACTIVITY_TYPES.includes(activity.type);
}

/**
 * 该条考勤记录是否触发补课任务（判据三分，单一出口）
 * · 出勤 / 已补 → 不补；
 * · 请假 + **线上参会**（`onlineAttend`）→ 不补（线上参会只免补课、不计出席）；
 * · 请假 + 未参会 / 未请假而缺席 → 补（且该场活动在补课范围内）。
 * @param {Object} attendanceRecord
 * @param {Object|null} activity
 * @returns {boolean}
 */
export function shouldGenerateMakeupTask(attendanceRecord, activity) {
  const status = (attendanceRecord || {}).status;
  if (status !== AttendanceStatus.ABSENT && status !== AttendanceStatus.LEAVE) return false;
  if ((attendanceRecord || {}).onlineAttend === true) return false;
  return isMakeupRequired(activity);
}

export function loadMakeupTasks() {
  if (!mockDB.makeupTasks) mockDB.makeupTasks = [];
  return [...mockDB.makeupTasks];
}

export function saveMakeupTasks(tasks) {
  mockDB.makeupTasks = tasks;
  persist();
}

function addMakeupTask(task) {
  const tasks = loadMakeupTasks();
  tasks.push(task);
  saveMakeupTasks(tasks);
}

/**
 * 自动生成补课任务
 * 在考勤确认时触发，为「该场活动在补课范围内、且判据成立」的缺勤/请假人员生成补课任务。
 * 判据单一出口 = shouldGenerateMakeupTask（范围 D-293 / 判据三分 D-293）。
 *
 * @param {Object} attendanceRecord — 考勤记录（含可选 onlineAttend 标记）
 */
export function autoGenerateMakeupTask(attendanceRecord) {
  const { personId, activityId } = attendanceRecord;

  const activity = findActivityById(activityId);
  if (!activity) return;

  if (!shouldGenerateMakeupTask(attendanceRecord, activity)) return;

  const tasks = loadMakeupTasks();

  // 防重复：同一人员同一活动已有补课任务则跳过
  if (tasks.some(t => t.personId === personId && t.activityId === activityId)) return;

  const person = getPersonById(personId);
  const absentDate = activity.date || new Date().toISOString().split('T')[0];
  const deadline = new Date(absentDate);
  deadline.setDate(deadline.getDate() + 7);

  const task = {
    id: generateId('mk'),
    personId,
    activityId,
    attendanceRecordId: attendanceRecord.id,
    activityName: activity.title || activity.name,
    personName: person ? person.name : personId,
    absentDate,
    deadline: deadline.toISOString().split('T')[0],
    status: 'pending',
    // 生成即「要求补课」（范围判据已收敛）：走进名单的一律必修
    isMandatory: true,
    proofContent: null,
    completedAt: null,
    createdAt: new Date().toISOString(),
  };

  addMakeupTask(task);
  return task;
}
