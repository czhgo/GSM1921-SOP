// 支书概况「本月出勤率」分母守卫（R2-46，2026-10-20）
// 口径：分母 = 本月活动应到人次（冻结 roster ∪ 实际到场），不是「已录记录数」；
// 未录出勤时返回 null（呈现「待录入」），不得用少量已录记录算出 100%。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mockDB } from '../../docs/src/core/domain/domain.js?v=20261021c';
import { SecretaryOverviewStore } from '../../docs/src/services/governance/secretary-overview.js?v=20261021c';
import { getMeetingRosterIds } from '../../docs/src/services/member/roster.js?v=20261021c';

const MONTH = new Date().toISOString().slice(0, 7);
const ACTIVITY_ID = 'act-overview-rate';

function withFixture({ records, rosterIds }) {
  const previous = { activities: mockDB.activities, attendances: mockDB.attendances, attendanceRosters: mockDB.attendanceRosters };
  mockDB.activities = [{
    id: ACTIVITY_ID, title: '出勤率分母验证', date: `${MONTH}-15`, status: 'published', type: '主题党日',
  }];
  mockDB.attendances = records;
  mockDB.attendanceRosters = rosterIds
    ? [{ activityId: ACTIVITY_ID, personIds: rosterIds, frozen: true }]
    : [];
  return () => {
    mockDB.activities = previous.activities;
    mockDB.attendances = previous.attendances;
    mockDB.attendanceRosters = previous.attendanceRosters;
  };
}

test('出勤率分母 = 应到人次：4 人应到、仅 2 人出勤 ⇒ 50%（旧实现会算成 100%）', () => {
  const restore = withFixture({
    records: [
      { id: 'att-o1', activityId: ACTIVITY_ID, personId: '2400012345', status: 'present' },
      { id: 'att-o2', activityId: ACTIVITY_ID, personId: '2400012346', status: 'present' },
    ],
    rosterIds: ['2400012345', '2400012346', '2400012347', '2400012348'],
  });
  try {
    const att = SecretaryOverviewStore._computeAttendance();
    assert.equal(att.attendanceTotal, 4, '分母必须是应到人次');
    assert.equal(att.attendancePresent, 2);
    assert.equal(att.attendanceRate, 50, '2/4 = 50%，不得按 2/2 算 100%');
    assert.equal(att.attendanceCoverage, 50, '覆盖率 = 已录 2 / 应到 4');
    assert.equal(att.attendancePending, false);
  } finally {
    restore();
  }
});

test('本月有应到名单但零记录 ⇒ 出勤率 null（待录入），不显示 0% 或 100%', () => {
  const restore = withFixture({ records: [], rosterIds: ['2400012345', '2400012346', '2400012347', '2400012348'] });
  try {
    const att = SecretaryOverviewStore._computeAttendance();
    assert.equal(att.attendanceTotal, 4);
    assert.equal(att.attendanceRate, null, '未录入时不得给百分比');
    assert.equal(att.attendancePending, true);
    assert.equal(att.attendanceCoverage, 0);
  } finally {
    restore();
  }
});

test('名单未冻结时回退支部在册应到名单（不得把实际到场当分母）', () => {
  const roster = getMeetingRosterIds({ type: '主题党日' });
  assert.ok(roster.length > 0, '演示支部应有在册党员可用于应到名单');
  const restore = withFixture({
    records: [{ id: 'att-o3', activityId: ACTIVITY_ID, personId: roster[0], status: 'present' }],
    rosterIds: null,
  });
  try {
    const att = SecretaryOverviewStore._computeAttendance();
    assert.equal(att.attendanceTotal, roster.length, '未冻结时按支部在册应到名单计分母');
    assert.ok(att.attendanceRate < 100, '1 人出勤 / 全部应到，不得显示 100%');
  } finally {
    restore();
  }
});
