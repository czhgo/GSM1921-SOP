// role: [工程师]+[AI]
// server/test/meeting-attendance-rules.test.mjs — 附录⑩ A批·S1 会务考勤规则域（2026-09-06 书记裁定）
// 纯 Node 测试（无浏览器、不起 server、无 localStorage stub——roster/person 均以 typeof 守卫惰性访问）：
//   覆盖 ① recorderByType 记录人映射（正式化单一源）、② 未到标因 reasons 固定枚举、
//   ③ 滞留到场补录（预应到 K → 补录 L → 实际应到 K+L）与落行字段（status=present + detainedMakeup；
//   纪检更正清除标记）、④ 党小组会考勤只读视图数据（组长小组会列表归属，纪检纪律台只读掌握）。
// 口径/枚举单一源 = core/policy-defaults.js attendance（recorderByType / reasons / roster）。
// ⚠️ 对 docs/src 的相对 import 必须带与源码一致的 ?v=20260903c query（模块缓存键一致性，同 attendance-batch）。
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { mockDB } from '../../docs/src/core/domain.js?v=20260903c';
import { POLICY_DEFAULTS } from '../../docs/src/core/policy-defaults.js?v=20260903c';
import {
  upsertMeetingAttendance,
  loadAttendanceRecords,
  attendanceToLong,
  recorderRolesOf,
  ATTENDANCE_RECORDER_BY_TYPE,
  ABSENCE_REASONS,
  absenceReasonLabel,
  countExpectedWithMakeup,
  listGroupMeetingAttendance,
} from '../../docs/src/services/attendance.js?v=20260903c';
import {
  getRosterStats,
  getMeetingRosterIds,
  getMeetingRosterCandidates,
} from '../../docs/src/services/roster.js?v=20260903c';

// ── 测试身份（demo 单源）────────────────────────────────────
// 纪检委员 = 'p10'（role 'disc-commissioner'；DISC_COMMISSIONER_ID 单源在
//   docs/src/entries/tabs/disc/_shared.js = 'p10'，该文件依赖浏览器组件不可直导 → 字面量 + 锚定出处）。
const DISC = 'p10';
// 示范滞留党员（docs/src/mock/people.js）：p5（第二党小组）、p9（第一党小组），均正式党员
const DETAINED_P5 = 'p5';
// 组长 = 记录人锚点：第一党小组组长 p1（罗文杰）、第二党小组组长 p2（郭子睿）——role 'leader'

let seq = 0;

/** 每例独立现场：造唯一「纪检可上传的会议考勤」活动 + 清空考勤落盘区（同 attendance-batch 模式） */
function freshMeeting(type) {
  seq += 1;
  const activityId = `act-s1-${seq}`;
  mockDB.activities = [{ id: activityId, title: `S1 测试会 ${seq}`, date: '2026-09-10', type, archived: false, organizer: 'p10' }];
  mockDB.attendances = [];
  return {
    activityId,
    cleanup: () => { mockDB.activities = []; mockDB.attendances = []; },
  };
}

const savedOf = (activityId) => loadAttendanceRecords().filter(r => r.activityId === activityId);

// ── a) recorderByType：记录人按活动类型（R1-1 正式化单一源）────────
test('policy recorderByType：支部大会/组织生活会/支委会=纪检、党课=书记或纪检、党小组会=组长；未入表类型=空', () => {
  const rbt = POLICY_DEFAULTS.attendance.recorderByType;
  assert.deepEqual(rbt['支部党员大会'], ['disc-commissioner']);
  assert.deepEqual(rbt['组织生活会'], ['disc-commissioner']);
  assert.deepEqual(rbt['支委会'], ['disc-commissioner']);
  assert.deepEqual(rbt['党课'], ['secretary', 'deputy-secretary', 'disc-commissioner']);
  assert.deepEqual(rbt['党小组会'], ['leader'], '党小组会记录人=组长');
  // 派生出口同源（拷贝）
  assert.deepEqual(recorderRolesOf('党小组会'), ['leader']);
  assert.deepEqual(recorderRolesOf('党课'), ['secretary', 'deputy-secretary', 'disc-commissioner']);
  assert.deepEqual(recorderRolesOf('主题党日'), [], '主题党日=组织者位（assignments 定），不入会议考勤记录人表');
  assert.notEqual(ATTENDANCE_RECORDER_BY_TYPE, POLICY_DEFAULTS.attendance.recorderByType);
  assert.notEqual(ATTENDANCE_RECORDER_BY_TYPE['支部党员大会'], POLICY_DEFAULTS.attendance.recorderByType['支部党员大会'], '派生拷贝数组为新数组（消费点改动不穿透 policy 单一源）');
});

// ── b) reasons：未到标因固定枚举（R1-2）───────────────────────
test('policy reasons：未到标因固定枚举（请假/无故/其它，键唯一 + 中文标签），派生出口同源拷贝', () => {
  const reasons = POLICY_DEFAULTS.attendance.reasons;
  assert.deepEqual(reasons, [
    { key: 'leave', label: '请假' },
    { key: 'unexcused', label: '无故' },
    { key: 'other', label: '其它' },
  ]);
  assert.equal(new Set(reasons.map(r => r.key)).size, reasons.length, '键唯一（禁造新枚举）');
  assert.deepEqual(ABSENCE_REASONS, reasons);
  assert.notEqual(ABSENCE_REASONS, reasons, '派生拷贝而非同一引用');
  assert.equal(absenceReasonLabel('leave'), '请假');
  assert.equal(absenceReasonLabel('unexcused'), '无故');
  assert.equal(absenceReasonLabel('other'), '其它');
  assert.equal(absenceReasonLabel(''), '');
  assert.equal(absenceReasonLabel('unknown_key'), 'unknown_key', '未知键回退键原文');
});

// ── c) 滞留到场补录（R1-3）：落行字段 + 统计 K→L→K+L + 更正清除标记 ──
test('滞留到场补录：纪检录入落行 present+detainedMakeup；K→L→K+L 统计；更正普通重提清除标记', () => {
  const { activityId, cleanup } = freshMeeting('支部党员大会');
  try {
    // K = 会前预应到 = 在册党员 − 滞留剔除（支部口径：21 − 2 = 19）
    const K = getRosterStats({ type: '支部党员大会' }).expected;
    assert.equal(K, 19);

    const res = upsertMeetingAttendance({
      actorId: DISC,
      records: [
        { personId: 'p1', activityId, status: 'present' },
        { personId: DETAINED_P5, activityId, status: 'present', detainedMakeup: true }, // 滞留线下到场补录
      ],
    });
    assert.deepEqual(res, { added: 2, updated: 0, skipped: 0 });

    const rec = loadAttendanceRecords().find(r => r.personId === DETAINED_P5 && r.activityId === activityId);
    assert.ok(rec, '滞留补录记录已落盘');
    assert.equal(rec.status, 'present', '补录即「到席」（档案按在场展示）');
    assert.equal(rec.detainedMakeup, true, '携带补录标记字段');
    assert.equal(rec.submittedBy, DISC);
    assert.equal(rec.recordedBy, DISC);
    assert.equal(rec.overdue, false);

    const normal = loadAttendanceRecords().find(r => r.personId === 'p1' && r.activityId === activityId);
    assert.equal(normal.detainedMakeup, undefined, '普通在场行不携带补录标记');

    // 展示格式化兼容：补录行按「出勤」展示（既有读取不破坏）
    const longRows = attendanceToLong(savedOf(activityId));
    assert.equal(longRows.length, 2);
    assert.ok(longRows.every(x => x.status === '出勤'));

    // 应到名单口径不变（补录只影响到席统计，不改 roster 定义）；统计 = K → L=1 → K+1
    assert.equal(getRosterStats({ type: '支部党员大会' }).expected, K);
    assert.deepEqual(countExpectedWithMakeup({ type: '支部党员大会', activityId }),
      { expectedPre: K, makeupArrival: 1, actualExpected: K + 1 });
    // 无补录活动（未指 activityId 或无该活动补录）→ L=0
    assert.deepEqual(countExpectedWithMakeup({ type: '支部党员大会' }),
      { expectedPre: K, makeupArrival: 0, actualExpected: K });

    // 纪检更正：补录行「普通在场」重提（误勾撤销/身份恢复）→ 清除 detainedMakeup，防历史补录误延续
    const r2 = upsertMeetingAttendance(
      { actorId: DISC, records: [{ personId: DETAINED_P5, activityId, status: 'present' }] },
      { overwrite: true },
    );
    assert.deepEqual(r2, { added: 0, updated: 1, skipped: 0 });
    const recAfter = loadAttendanceRecords().find(r => r.personId === DETAINED_P5 && r.activityId === activityId);
    assert.equal(recAfter.detainedMakeup, undefined, '普通重提清除补录标记');
    assert.deepEqual(countExpectedWithMakeup({ type: '支部党员大会', activityId }),
      { expectedPre: K, makeupArrival: 0, actualExpected: K });
  } finally {
    cleanup();
  }
});

// ── d) 标因落行（R1-2）：缺勤/请假带 absenceReason；纪检更正语义 ──
test('标因落行：缺勤/请假携 absenceReason；纪检更正换因/转出勤清除旧标因', () => {
  const { activityId, cleanup } = freshMeeting('党课');
  try {
    // 新增：请假 + 标因请假
    let res = upsertMeetingAttendance({
      actorId: DISC,
      records: [{ personId: 'p2', activityId, status: 'leave', absenceReason: 'leave' }],
    });
    assert.deepEqual(res, { added: 1, updated: 0, skipped: 0 });
    let rec = loadAttendanceRecords().find(r => r.personId === 'p2' && r.activityId === activityId);
    assert.equal(rec.status, 'leave');
    assert.equal(rec.absenceReason, 'leave');

    // 纪检更正：缺勤 + 标因无故（overwrite）
    res = upsertMeetingAttendance(
      { actorId: DISC, records: [{ personId: 'p2', activityId, status: 'absent', absenceReason: 'unexcused' }] },
      { overwrite: true },
    );
    assert.deepEqual(res, { added: 0, updated: 1, skipped: 0 });
    rec = loadAttendanceRecords().find(r => r.personId === 'p2' && r.activityId === activityId);
    assert.equal(rec.status, 'absent');
    assert.equal(rec.absenceReason, 'unexcused');

    // 更正转出勤（不携标因）→ 清除旧标因
    res = upsertMeetingAttendance(
      { actorId: DISC, records: [{ personId: 'p2', activityId, status: 'present' }] },
      { overwrite: true },
    );
    assert.deepEqual(res, { added: 0, updated: 1, skipped: 0 });
    rec = loadAttendanceRecords().find(r => r.personId === 'p2' && r.activityId === activityId);
    assert.equal(rec.status, 'present');
    assert.equal(rec.absenceReason, undefined, '出勤记录不带标因');
  } finally {
    cleanup();
  }
});

// ── e) 只读视图数据辅助（裁定④）：组长小组会列表归属 ──────────
test('只读视图：党小组会考勤按组聚合归属组长（组长=记录人 submittedBy 可辨）；无记录不占位', () => {
  mockDB.activities = [
    { id: 'act-s1-gm1', title: '第一党小组 9 月会', date: '2026-09-05', type: '党小组会', organizer: 'p1', archived: false },
    { id: 'act-s1-gm2', title: '第二党小组 9 月会', date: '2026-09-04', type: '党小组会', organizer: 'p2', archived: false },
  ];
  mockDB.attendances = [
    { id: 's1gm1a', personId: 'p1', activityId: 'act-s1-gm1', status: 'present', submittedBy: 'p1', recordedBy: 'p10', recordedAt: '2026-09-05T10:00:00.000Z' },
    { id: 's1gm1b', personId: 'p3', activityId: 'act-s1-gm1', status: 'leave', submittedBy: 'p1', recordedBy: null, recordedAt: '2026-09-05T10:00:00.000Z', absenceReason: 'other' },
    { id: 's1gm2a', personId: 'p2', activityId: 'act-s1-gm2', status: 'present', submittedBy: 'p2', recordedBy: 'p10', recordedAt: '2026-09-04T10:00:00.000Z' },
  ];
  try {
    const view = listGroupMeetingAttendance();
    assert.equal(view.length, 2);
    // 日期降序：第一组（09-05）在前
    assert.equal(view[0].activityId, 'act-s1-gm1');

    const gm1 = view.find(v => v.activityId === 'act-s1-gm1');
    assert.equal(gm1.groupName, '第一党小组', '组别由活动 organizer 所属党小组推导');
    assert.equal(gm1.leaderId, 'p1', '组长=记录人语义锚点');
    assert.equal(gm1.uploaderId, 'p1', '上传人=组长本人（submittedBy 可辨）');
    assert.equal(gm1.leaderName, gm1.uploaderName);
    assert.equal(gm1.total, 2);
    assert.equal(gm1.present, 1);
    const leaveRow = gm1.rows.find(r => r.personId === 'p3');
    assert.equal(leaveRow.status, 'leave');
    assert.equal(leaveRow.absenceReasonLabel, '其它', '标因中文标签透出');
    assert.equal(leaveRow.absenceReason, 'other');

    const gm2 = view.find(v => v.activityId === 'act-s1-gm2');
    assert.equal(gm2.groupName, '第二党小组');
    assert.equal(gm2.leaderId, 'p2');
    assert.equal(gm2.uploaderId, 'p2');

    // 无考勤记录的小组会不占位（组长未上传 → 纪检台不显示空块）
    mockDB.activities.push({ id: 'act-s1-gm3', title: '第三党小组空会', date: '2026-09-03', type: '党小组会', organizer: 'p4', archived: false });
    assert.equal(listGroupMeetingAttendance().length, 2, '无记录的小组会不占位');
    mockDB.activities.pop();
  } finally {
    mockDB.activities = [];
    mockDB.attendances = [];
  }
});

// ── f) 回归：应到/候选与滞留补录边界（全选不串滞留；禁造新状态）──
test('回归：滞留者仍在候选（灰态可见）但不在应到/全选范围；纪律与 roster 定义一致', () => {
  const { candidates, disabledIds } = getMeetingRosterCandidates({ type: '支部党员大会' });
  const disabled = new Set(disabledIds);
  assert.ok(candidates.some(p => p.id === DETAINED_P5), '滞留者 p5 在候选可见（灰态禁选，供纪检看到原因）');
  assert.ok(disabled.has(DETAINED_P5) && disabled.has('p9'), '示范滞留 p5/p9 均禁选');
  const rosterIds = getMeetingRosterIds({ type: '支部党员大会' });
  assert.ok(!rosterIds.includes(DETAINED_P5) && !rosterIds.includes('p9'), '滞留者不在应到');
  assert.equal(rosterIds.some(id => disabled.has(id)), false, '应到与禁用集合不相交（全选应到不含滞留）');
});
