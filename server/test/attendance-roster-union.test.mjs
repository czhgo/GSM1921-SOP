// 活动考勤率按冻结原应到名单与实际到场名单的去重并集计算。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mockDB } from '../../docs/src/core/domain/domain.js?v=20261110b';
import { summarizeAttendanceByActivity } from '../../docs/src/services/activity/attendance.js?v=20261110b';
import { getMeetingRosterIds } from '../../docs/src/services/member/roster.js?v=20261110b';

test('考勤分母是冻结原应到与实际到场的去重并集，重复考勤行不重复计数', () => {
  const previous = { activities: mockDB.activities, attendances: mockDB.attendances, attendanceRosters: mockDB.attendanceRosters };
  mockDB.activities = [{ id: 'act-roster-union', title: '名单并集验证', date: '2026-10-22', type: '主题党日' }];
  const records = [
    { id: 'a1', activityId: 'act-roster-union', personId: '2400012345', status: 'absent' },
    { id: 'a2', activityId: 'act-roster-union', personId: '2400012346', status: 'leave' },
    { id: 'a3', activityId: 'act-roster-union', personId: '2400012347', status: 'present' }, // 跨组实际到场
    { id: 'a3-duplicate', activityId: 'act-roster-union', personId: '2400012347', status: 'present' },
    { id: 'a4', activityId: 'act-roster-union', personId: '2400012348', status: 'absent' }, // 未在原名单且未到场
  ];
  const rosters = [{ activityId: 'act-roster-union', personIds: ['2400012345', '2400012346', '2400012346'], frozen: true }];
  try {
    const result = summarizeAttendanceByActivity({ records, rosterSnapshots: rosters });
    assert.equal(result.rows.length, 1);
    assert.equal(result.rows[0].total, 3, '2400012345/2400012346 原应到与 2400012347 实际到场合并去重');
    assert.equal(result.rows[0].present, 1);
    assert.equal(result.rows[0].leave, 1);
    assert.equal(result.rows[0].absent, 1);
    assert.equal(result.rows[0].coverage, 100);
    assert.equal(result.rows[0].rate, 33);
  } finally {
    mockDB.activities = previous.activities;
    mockDB.attendances = previous.attendances;
    mockDB.attendanceRosters = previous.attendanceRosters;
  }
});

test('党小组会缺小组归属（无 hostGroup 且组织者无 partyGroup）⇒ 分母回退支部在册应到，覆盖率不恒为 100%', () => {
  const previous = { activities: mockDB.activities, attendances: mockDB.attendances, attendanceRosters: mockDB.attendanceRosters };
  mockDB.activities = [{
    id: 'act-gm-no-group', title: '无小组归属的小组会', date: '2026-10-23', type: '党小组会',
    organizer: 'ghost-organizer', // 查无此人 ⇒ 无 partyGroup，且活动无 hostGroup
  }];
  const records = [{ id: 'g1', activityId: 'act-gm-no-group', personId: '2400012345', status: 'present' }];
  try {
    const result = summarizeAttendanceByActivity({ records, rosterSnapshots: [] });
    const branchRoster = getMeetingRosterIds({ type: '支部党员大会' });
    assert.equal(result.rows.length, 1);
    assert.equal(result.rows[0].rosterFallback, true, '缺小组归属 ⇒ 按支部应到计');
    assert.equal(result.rows[0].total, branchRoster.length, '分母 = 支部在册应到人数，不得只剩实际到场');
    assert.ok(result.rows[0].coverage < 100, '覆盖率按真实记录计算，不得恒为 100%');
  } finally {
    mockDB.activities = previous.activities;
    mockDB.attendances = previous.attendances;
    mockDB.attendanceRosters = previous.attendanceRosters;
  }
});

// ── T7（2026-11-16 支书裁定）：未录 ≠ 全员缺勤 ──────────────────────────
test('T7 该场一条考勤记录都没有 ⇒ ratePending=true（页面 / 首页「待录入」、导出单元格留空）', () => {
  const previous = { activities: mockDB.activities, attendances: mockDB.attendances, attendanceRosters: mockDB.attendanceRosters };
  mockDB.activities = [{ id: 'act-t7-pending', title: '未录考勤的场次', date: '2026-11-10', type: '主题党日' }];
  const rosters = [{ activityId: 'act-t7-pending', personIds: ['2400012345', '2400012346'], frozen: true }];
  try {
    const result = summarizeAttendanceByActivity({ records: [], rosterSnapshots: rosters });
    assert.equal(result.rows.length, 1);
    assert.equal(result.rows[0].ratePending, true, '无任何记录 ⇒ 未录（展示「待录入」、导出留空不写 0%）');
    assert.equal(result.rows[0].coverage, 0);
    assert.equal(result.recordedTotal, 0, '本月合计行同理留空（导出按 recordedTotal 判）');
  } finally {
    mockDB.activities = previous.activities;
    mockDB.attendances = previous.attendances;
    mockDB.attendanceRosters = previous.attendanceRosters;
  }
});

test('T7 有考勤记录但全员缺席 ⇒ ratePending=false 且 rate=0（未录不得一刀切成缺勤，也不得反推）', () => {
  const previous = { activities: mockDB.activities, attendances: mockDB.attendances, attendanceRosters: mockDB.attendanceRosters };
  mockDB.activities = [{ id: 'act-t7-all-absent', title: '全员缺席的场次', date: '2026-11-11', type: '主题党日' }];
  const rosters = [{ activityId: 'act-t7-all-absent', personIds: ['2400012345', '2400012346'], frozen: true }];
  const records = [
    { id: 't7a', activityId: 'act-t7-all-absent', personId: '2400012345', status: 'absent' },
    { id: 't7b', activityId: 'act-t7-all-absent', personId: '2400012346', status: 'absent' },
  ];
  try {
    const result = summarizeAttendanceByActivity({ records, rosterSnapshots: rosters });
    assert.equal(result.rows[0].ratePending, false, '已有考勤记录 ⇒ 不是「未录」');
    assert.equal(result.rows[0].rate, 0, '全员缺勤按 0% 显示（区别于「待录入」）');
    assert.equal(result.rows[0].coverage, 100);
  } finally {
    mockDB.activities = previous.activities;
    mockDB.attendances = previous.attendances;
    mockDB.attendanceRosters = previous.attendanceRosters;
  }
});
