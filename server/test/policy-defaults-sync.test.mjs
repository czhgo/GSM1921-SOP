// role: [工程师]+[AI]
// server/test/policy-defaults-sync.test.mjs — P3c 防漂移：业务默认集中单一源（2026-09-05）
// 纯 Node 测试（无浏览器）：policy-defaults.js 与消费点导出保持同步，
// 防止消费点在 policy 之外新写字面量导致两套默认漂移。
// 覆盖：考勤会议类型清单 / 票决门槛 / 考察超期默认天数（policy 默认值 + 缺省调用可运行）。
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { POLICY_DEFAULTS } from '../../docs/src/core/policy-defaults.js?v=20260908c';
import { MEETING_ATTENDANCE_TYPES } from '../../docs/src/services/attendance.js?v=20260908c';
import { WORKFORCE_VOTE_DEFAULT } from '../../docs/src/services/workforce.js?v=20260908c';
import { getOverdueRecords } from '../../docs/src/services/inspection.js?v=20260908c';

test('policy 单一源：考察超期默认天数 = 7（branch-default 可覆盖）', () => {
  assert.equal(POLICY_DEFAULTS.inspection.overdueDays, 7);
});

test('attendance 消费点：MEETING_ATTENDANCE_TYPES 深等于 policy attendance.meetingTypes（导出去重冻结导出面）', () => {
  assert.deepEqual(MEETING_ATTENDANCE_TYPES, POLICY_DEFAULTS.attendance.meetingTypes);
  // 派生拷贝而非同一引用：消费点数组被改不穿透 policy 单一源
  assert.notEqual(MEETING_ATTENDANCE_TYPES, POLICY_DEFAULTS.attendance.meetingTypes);
});

test('attendance 消费点：书记/副书记例外角色数组与 policy attendance.uploaderExceptions.secretaryDeputy 一致', () => {
  assert.deepEqual(
    POLICY_DEFAULTS.attendance.uploaderExceptions.secretaryDeputy,
    ['secretary', 'deputy-secretary'],
  );
});

test('workforce 消费点：WORKFORCE_VOTE_DEFAULT 与 policy voteThreshold 一致（quorum/vetoOnObject）', () => {
  assert.deepEqual(WORKFORCE_VOTE_DEFAULT, POLICY_DEFAULTS.workforce.voteThreshold);
  assert.equal(WORKFORCE_VOTE_DEFAULT.quorum, 2 / 3);
  assert.equal(WORKFORCE_VOTE_DEFAULT.vetoOnObject, true);
});

test('inspection 消费点：getOverdueRecords 缺省调用可运行（默认参数引用 policy 单一源）且与显式 7 天口径一致', () => {
  assert.equal(typeof getOverdueRecords, 'function');
  // 缺省参数求值路径 = POLICY_DEFAULTS.inspection.overdueDays（若引用断裂会在此抛错）
  assert.doesNotThrow(() => getOverdueRecords());
  // 默认阈值与显式 7 天结果一致（默认行为零变化）
  assert.deepEqual(getOverdueRecords(), getOverdueRecords(7));
});
