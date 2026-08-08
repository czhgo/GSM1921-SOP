// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  makeup.js — 补课任务 CRUD 服务
// ════════════════════════════════════════════════════════════════

import { mockDB, AttendanceStatus } from '../core/domain.js?v=20260808e';
import { persist } from '../core/data-adapter.js?v=20260808e';
import { PEOPLE, getPersonById } from '../mock/index.js?v=20260808e';
import { loadAttendanceRecords, saveAttendanceRecords } from '../services/attendance.js?v=20260808e';
import { findActivityById } from '../services/activity.js?v=20260808e';

const MANDATORY_ACTIVITY_TYPES = ['支部党员大会', '党小组会', '党课'];

export function loadMakeupTasks() {
  if (!mockDB.makeupTasks) mockDB.makeupTasks = [];
  return [...mockDB.makeupTasks];
}

export function saveMakeupTasks(tasks) {
  mockDB.makeupTasks = tasks;
  persist();
}

export function addMakeupTask(task) {
  const tasks = loadMakeupTasks();
  tasks.push(task);
  saveMakeupTasks(tasks);
}

/**
 * 自动生成补课任务
 * 在考勤确认时触发，为缺勤/请假人员生成补课任务
 *
 * @param {Object} attendanceRecord — 考勤记录
 */
export function autoGenerateMakeupTask(attendanceRecord) {
  const { personId, activityId, status } = attendanceRecord;
  if (status !== AttendanceStatus.ABSENT && status !== AttendanceStatus.LEAVE) return;

  const activity = findActivityById(activityId);
  if (!activity) return;

  const isMandatory = MANDATORY_ACTIVITY_TYPES.includes(activity.type) || activity.type === '主题党日';
  const tasks = loadMakeupTasks();

  // 防重复：同一人员同一活动已有补课任务则跳过
  if (tasks.some(t => t.personId === personId && t.activityId === activityId)) return;

  const person = getPersonById(personId);
  const absentDate = activity.date || new Date().toISOString().split('T')[0];
  const deadline = new Date(absentDate);
  deadline.setDate(deadline.getDate() + 7);

  const task = {
    id: 'mk_' + Date.now() + '_' + personId,
    personId,
    activityId,
    attendanceRecordId: attendanceRecord.id,
    activityName: activity.title || activity.name,
    personName: person ? person.name : personId,
    absentDate,
    deadline: deadline.toISOString().split('T')[0],
    status: 'pending',
    isMandatory,
    proofContent: null,
    completedAt: null,
    createdAt: new Date().toISOString(),
  };

  addMakeupTask(task);
  return task;
}
