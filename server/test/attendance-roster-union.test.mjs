// 活动考勤率按冻结原应到名单与实际到场名单的去重并集计算。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mockDB } from '../../docs/src/core/domain/domain.js?v=20261018a';
import { summarizeAttendanceByActivity } from '../../docs/src/services/activity/attendance.js?v=20261018a';

test('考勤分母是冻结原应到与实际到场的去重并集，重复考勤行不重复计数', () => {
  const previous = { activities: mockDB.activities, attendances: mockDB.attendances, attendanceRosters: mockDB.attendanceRosters };
  mockDB.activities = [{ id: 'act-roster-union', title: '名单并集验证', date: '2026-10-22', type: '主题党日' }];
  const records = [
    { id: 'a1', activityId: 'act-roster-union', personId: 'p1', status: 'absent' },
    { id: 'a2', activityId: 'act-roster-union', personId: 'p2', status: 'leave' },
    { id: 'a3', activityId: 'act-roster-union', personId: 'p3', status: 'present' }, // 跨组实际到场
    { id: 'a3-duplicate', activityId: 'act-roster-union', personId: 'p3', status: 'present' },
    { id: 'a4', activityId: 'act-roster-union', personId: 'p4', status: 'absent' }, // 未在原名单且未到场
  ];
  const rosters = [{ activityId: 'act-roster-union', personIds: ['p1', 'p2', 'p2'], frozen: true }];
  try {
    const result = summarizeAttendanceByActivity({ records, rosterSnapshots: rosters });
    assert.equal(result.rows.length, 1);
    assert.equal(result.rows[0].total, 3, 'p1/p2 原应到与 p3 实际到场合并去重');
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
