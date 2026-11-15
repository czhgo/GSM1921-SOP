// server/test/roster-denominator-guard.test.mjs — 考勤分母不得塌陷（2026-11-15 批次 553）
//
// 病灶（批次 552 跨层专项）：党小组会缺 `hostGroup` 且组织者无 `partyGroup` 时，
//   旧实现把「实际到场」当分母 ⇒ 覆盖率恒 100%、未录恒 0。修复在活动语境层回退支部在册应到。
//   本守卫用行为断言盯住「分母非空且不等于实际到场」，防止再次回归。
//
// 判据：
//   R1 支部有在册成员时，一场无任何考勤记录的党小组会（无 hostGroup、组织者不存在）
//      必须有 total > 0，且 coverage = 0、rate = 0（未录不得显示 100%）。
//   R2 非空转：同一场景下 `getMeetingRosterIds({ branchId })` 必须与 total 一致（回退口径同源）。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mockDB } from '../../docs/src/core/domain/domain.js?v=20261110b';
import { summarizeAttendanceByActivity } from '../../docs/src/services/activity/attendance.js?v=20261110b';
import { getMeetingRosterIds } from '../../docs/src/services/member/roster.js?v=20261110b';

test('R1 党小组会缺小组语境 ⇒ 分母回退支部在册，不得等于实际到场', () => {
  const prev = {
    activities: mockDB.activities,
    attendances: mockDB.attendances,
    attendanceRosters: mockDB.attendanceRosters,
  };
  mockDB.activities = [{
    id: 'guard-group-no-context',
    title: '缺小组语境的党小组会',
    date: '2026-11-15',
    type: '党小组会',
    hostGroup: '',
    organizer: 'guard-no-such-person',
  }];
  mockDB.attendances = [];
  mockDB.attendanceRosters = [];
  try {
    const rosterSize = getMeetingRosterIds({ branchId: undefined }).length;
    assert.ok(rosterSize > 0, '前置：演示名册应有在册成员');

    const result = summarizeAttendanceByActivity({ records: [], rosterSnapshots: [] });
    assert.equal(result.rows.length, 1, '该场应占位（分母非空）');
    assert.equal(result.rows[0].total, rosterSize, '分母应回退支部在册应到（与名册同源）');
    assert.equal(result.rows[0].coverage, 0, '无记录时覆盖率必须为 0，不得恒 100%');
    assert.equal(result.rows[0].rate, 0, '无记录时出勤率为 0（不得因分母塌陷显示 100%）');
  } finally {
    mockDB.activities = prev.activities;
    mockDB.attendances = prev.attendances;
    mockDB.attendanceRosters = prev.attendanceRosters;
  }
});
