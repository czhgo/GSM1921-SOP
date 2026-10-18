import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildAttendanceMatrixModel } from '../../docs/src/services/activity/attendance-matrix.js?v=20261018g';

test('考勤矩阵把冻结应到名单、考勤事实和跨活动人员关系合成一份可解释矩阵', () => {
  const activities = [
    { id: 'act-a', title: '支部活动 A' },
    { id: 'act-b', title: '支部活动 B' },
    { id: 'act-empty', title: '没有名单也没有事实' },
  ];
  const records = [
    { id: 'r1', activityId: 'act-a', personId: 'p1', status: 'present' },
    { id: 'r3', activityId: 'act-a', personId: 'p3', status: 'present' }, // 跨组实际到场者扩入本场应到关系
    { id: 'r4', activityId: 'act-b', personId: 'p4', status: 'leave' },
  ];
  const rosterSnapshots = [
    { activityId: 'act-a', personIds: ['p1', 'p2'], frozen: true },
    { activityId: 'act-b', personIds: ['p4'], frozen: true },
  ];

  const model = buildAttendanceMatrixModel({ activities, records, rosterSnapshots });
  assert.deepEqual(model.activities.map((row) => row.id), ['act-a', 'act-b'], '只展示有冻结名单或考勤事实的活动');
  assert.deepEqual(model.personIds, ['p1', 'p2', 'p3', 'p4']);
  assert.deepEqual(model.cell('p1', 'act-a'), { kind: 'recorded', status: 'present', recordId: 'r1' });
  assert.deepEqual(model.cell('p2', 'act-a'), { kind: 'unrecorded' }, '冻结应到但无考勤事实显示未录');
  assert.deepEqual(model.cell('p4', 'act-a'), { kind: 'not-applicable' }, '不在该活动冻结名单且无实际记录显示非应到');
  assert.deepEqual(model.cell('p3', 'act-b'), { kind: 'not-applicable' });
  assert.deepEqual(model.cell('p3', 'act-a'), { kind: 'recorded', status: 'present', recordId: 'r3' });
});

test('无冻结名单时不把未知状态误标为未录或非应到', () => {
  const model = buildAttendanceMatrixModel({
    activities: [{ id: 'act-c' }],
    records: [{ id: 'r1', activityId: 'act-c', personId: 'p1', status: 'absent' }],
    rosterSnapshots: [],
  });
  assert.deepEqual(model.cell('p1', 'act-c'), { kind: 'recorded', status: 'absent', recordId: 'r1' });
});
