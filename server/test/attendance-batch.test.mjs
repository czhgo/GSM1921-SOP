// role: [工程师]+[AI]
// server/test/attendance-batch.test.mjs — 会议考勤批量录入 + 更正（方案A，2026-09-06）
// 纯 Node 测试（无浏览器、不起 server、无 localStorage stub）：
//   覆盖 upsertMeetingAttendance 批量语义——新增 / 旧语义跳过 / 上传者本人覆盖更正 /
//   他人权威拒盖 / 批量混合计数 / MEETING_ATTENDANCE_TYPES 单一源 /
//   **上传位按会议类型分**（2026-09-21 批次 132 · 支书口径一，**修正批次 124 的「一律组织者」**——
//   党课 / 支部党员大会＝纪检委员；支委会＝不考勤；组织者位活动仍认组织者）。
//   用例 a–e 的现场类型取 `meetingTypes[0]`（＝党课）且组织者设为被操作人（纪检 p10），故上传位成立。
// 导入链说明：attendance.js → core(domain/data-adapter/policy-defaults)/mock/person/activity
//   全部纯 node 可载（先例 server/test/policy-config.test.mjs 的 T2/T3 已直接导入 attendance.js 并跑绿）；
//   data-adapter persist() 在未注册 mock 适配器时空安全（_mockAdapter?.saveDB），
//   模块顶层 pagehide 注册带 typeof window 守卫 → node 下自动跳过，无需任何全局注入。
// ⚠️ 对 docs/src 的相对 import 必须带与源码一致的 ?v= query：
//   Node ESM 以「含 query 的完整 URL」为模块缓存键——不带 query 会得到第二个 domain.js 实例，
//   本文件的 mockDB 重置将不作用于被测 attendance.js 所见状态（实测：同 query 共享实例、异 query 分裂）。
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { mockDB } from '../../docs/src/core/domain.js?v=20260922e';
import { POLICY_DEFAULTS } from '../../docs/src/core/policy-defaults.js?v=20260922e';
import {
  upsertMeetingAttendance,
  MEETING_ATTENDANCE_TYPES,
  canUploadAttendance,
  loadAttendanceRecords,
} from '../../docs/src/services/attendance.js?v=20260922e';

// ── 测试身份（demo 单源）────────────────────────────────────
// 被操作人 = 'p10'（role 'disc-commissioner'；DISC_COMMISSIONER_ID 单源在
//   docs/src/entries/tabs/disc/_shared.js = 'p10'，该文件依赖浏览器组件不可直导 → 字面量 + 锚定出处）。
//   2026-09-21 批次 132 起党课 / 支部党员大会的上传位＝纪检委员，故 freshState() 造党课并设其为组织者。
const DISC = 'p10';
// 他人权威（非本人所录，用于拒盖用例；亦用于「非组织者不可上传」用例）：组织委员 'p11'（role 'org-commissioner'，docs/src/mock/people.js）
const OTHER_AUTH = 'p11';

// 会议考勤类型的活动类型（policy-defaults 单一源，取首个「党课」造活动；用例 f 再整表深等校验）
const MEETING_TYPE = POLICY_DEFAULTS.attendance.meetingTypes[0];

let seq = 0;

/**
 * 每例独立现场：造唯一活动（会议考勤类型、未归档、**组织者＝DISC**）+ 清空考勤落盘区。
 * 静态种子 ATTENDANCE_RECORDS 的活动 id 均为真实活动（非 act-att-batch-* 前缀）→
 * 自定义活动上不存在任何种子记录，用例间组合天然互斥，可任意顺序执行。
 */
function freshState() {
  seq += 1;
  const activityId = `act-att-batch-${seq}`;
  mockDB.activities = [{ id: activityId, type: MEETING_TYPE, archived: false, organizer: DISC }];
  mockDB.attendances = [];
  return activityId;
}

/** 取某活动下已落盘记录（按 activityId 过滤，避开静态种子噪音） */
const savedOf = (activityId) => loadAttendanceRecords().filter(r => r.activityId === activityId);

// ── a) 新增：组织者批量上传 2 条新人 ──────────────────────────
test('新增：组织者批量上传 2 条新人 → added:2/updated:0/skipped:0，落盘含 submittedBy/recordedBy=本人', () => {
  const activityId = freshState();
  const res = upsertMeetingAttendance({
    actorId: DISC,
    records: [
      { personId: 'p1', activityId, status: 'present' },
      { personId: 'p2', activityId, status: 'absent' },
    ],
  });
  assert.deepEqual(res, { added: 2, updated: 0, skipped: 0 });

  const saved = savedOf(activityId);
  assert.equal(saved.length, 2, '该活动应恰好落盘 2 条');
  for (const r of saved) {
    assert.equal(r.submittedBy, DISC, 'submittedBy = 上传者本人');
    assert.equal(r.recordedBy, DISC, 'recordedBy = 上传者本人（上传位即确认）');
    assert.equal(r.overdue, false);
  }
  assert.equal(saved.find(r => r.personId === 'p1').status, 'present');
  assert.equal(saved.find(r => r.personId === 'p2').status, 'absent');
});

// ── b) 旧语义：同 (人,活动) 再提交（不带 overwrite）→ 跳过 ──
test('旧语义：同人同活动再提交（不传 overwrite）→ skipped:1，原记录不变', () => {
  const activityId = freshState();
  upsertMeetingAttendance({
    actorId: DISC,
    records: [{ personId: 'p1', activityId, status: 'present' }],
  });
  const again = upsertMeetingAttendance({
    actorId: DISC,
    records: [{ personId: 'p1', activityId, status: 'absent' }],
  });
  assert.deepEqual(again, { added: 0, updated: 0, skipped: 1 });

  const rec = loadAttendanceRecords().find(r => r.personId === 'p1' && r.activityId === activityId);
  assert.equal(rec.status, 'present', '原记录状态未被覆盖');
  assert.equal(rec.recordedBy, DISC);
  assert.equal(rec.updatedBy, undefined, '旧语义不写更新审计');
  assert.equal(rec.updatedAt, undefined);
});

// ── c) 上传者本人覆盖（overwrite=true）──
test('更正：本人对已录条 overwrite 提交 status=leave → updated:1，写 updatedBy/updatedAt', () => {
  const activityId = freshState();
  upsertMeetingAttendance({
    actorId: DISC,
    records: [{ personId: 'p1', activityId, status: 'present' }],
  });
  const res = upsertMeetingAttendance(
    { actorId: DISC, records: [{ personId: 'p1', activityId, status: 'leave' }] },
    { overwrite: true },
  );
  assert.deepEqual(res, { added: 0, updated: 1, skipped: 0 });

  const rec = loadAttendanceRecords().find(r => r.personId === 'p1' && r.activityId === activityId);
  assert.equal(rec.status, 'leave', '状态被覆盖更正');
  assert.equal(rec.updatedBy, DISC, 'updatedBy = 上传者本人');
  assert.ok(rec.updatedAt && !Number.isNaN(Date.parse(rec.updatedAt)), 'updatedAt 应为可解析 ISO 时间');
  // 创建侧字段不回退
  assert.equal(rec.submittedBy, DISC);
  assert.equal(rec.recordedBy, DISC);
});

// ── d) 他人权威拒盖（overwrite 仍 skip）──
test('更正：existing.recordedBy=他人权威（组织委员 p11）→ overwrite 仍 skipped，原记录不动', () => {
  const activityId = freshState();
  // 直接构造一条「他人权威所录」的既有记录（组织委员已录 present），
  // 模拟非本人权威的录入——此为 overwrite 分支的拒盖语义路径
  // （他人权威记录不可覆盖，改走纪检确认界面）。
  mockDB.attendances = [{
    id: `att-${activityId}-p1`,
    personId: 'p1',
    activityId,
    status: 'present',
    recordedBy: OTHER_AUTH,
    recordedAt: '2026-09-01T00:00:00.000Z',
  }];
  const res = upsertMeetingAttendance(
    { actorId: DISC, records: [{ personId: 'p1', activityId, status: 'leave' }] },
    { overwrite: true },
  );
  assert.deepEqual(res, { added: 0, updated: 0, skipped: 1 });

  const rec = loadAttendanceRecords().find(r => r.personId === 'p1' && r.activityId === activityId);
  assert.equal(rec.status, 'present', '状态未被覆盖');
  assert.equal(rec.recordedBy, OTHER_AUTH, '权威归属不变');
  assert.equal(rec.updatedBy, undefined, '未写更新审计');
  assert.equal(rec.updatedAt, undefined);
});

// ── e) 批量混合：2 新增 + 1 既有本人记录改状态 ──
test('批量混合：一批 3 条（2 新增 + 1 既有本人记录改状态）→ added:2/updated:1/skipped:0，落盘总量对', () => {
  const activityId = freshState();
  upsertMeetingAttendance({
    actorId: DISC,
    records: [{ personId: 'p1', activityId, status: 'present' }],
  });
  const res = upsertMeetingAttendance(
    {
      actorId: DISC,
      records: [
        { personId: 'p2', activityId, status: 'absent' }, // 新成员
        { personId: 'p3', activityId, status: 'leave' },  // 新成员
        { personId: 'p1', activityId, status: 'leave' },  // 既有本人记录 → 覆盖更正
      ],
    },
    { overwrite: true },
  );
  assert.deepEqual(res, { added: 2, updated: 1, skipped: 0 });

  const saved = savedOf(activityId);
  assert.equal(saved.length, 3, '该活动落盘应恰好 3 条（2 新 + 1 更正不重复）');
  const p1 = saved.find(r => r.personId === 'p1');
  assert.equal(p1.status, 'leave');
  assert.equal(p1.updatedBy, DISC);
  assert.equal(saved.find(r => r.personId === 'p2').status, 'absent');
  assert.equal(saved.find(r => r.personId === 'p3').status, 'leave');
});

// ── f) 常量：MEETING_ATTENDANCE_TYPES 深等 policy meetingTypes ──
test('常量：MEETING_ATTENDANCE_TYPES 深等 policy attendance.meetingTypes（党课/支部党员大会/组织生活会；支委会不考勤不在内）', () => {
  assert.deepEqual(
    MEETING_ATTENDANCE_TYPES,
    POLICY_DEFAULTS.attendance.meetingTypes,
  );
  assert.deepEqual(POLICY_DEFAULTS.attendance.meetingTypes, ['党课', '支部党员大会', '组织生活会']);
  assert.deepEqual(POLICY_DEFAULTS.attendance.noAttendanceTypes, ['支委会'], '支委会不考勤（2026-09-21 批次 132 · 支书口径一）');
  // 派生拷贝而非同一引用：消费点数组被改不穿透 policy 单一源
  assert.notEqual(MEETING_ATTENDANCE_TYPES, POLICY_DEFAULTS.attendance.meetingTypes);
});

// ── g) 上传位按会议类型分（2026-09-21 批次 132 · 支书口径一，**修正批次 124 的「一律组织者」**）──
test('上传位：党课/支部党员大会＝纪检（支书/副支书例外）；支委会＝不考勤（任何人无上传位）；组织者位活动仍认组织者', () => {
  // 党课：该场组织者＝组织委员 OTHER_AUTH，但上传位在纪检 ⇒ 组织者不可传、纪检可传
  mockDB.activities = [{ id: 'act-132-a', type: '党课', archived: false, organizer: OTHER_AUTH }];
  mockDB.attendances = [];
  assert.equal(canUploadAttendance(DISC, 'act-132-a'), true, '党课＝纪检上传位');
  assert.equal(canUploadAttendance(OTHER_AUTH, 'act-132-a'), false, '党课的组织者（非纪检）不持上传位');
  assert.equal(canUploadAttendance('p13', 'act-132-a'), true, '支书例外承担');
  assert.equal(canUploadAttendance('p14', 'act-132-a'), true, '副支书例外承担');
  const denied = upsertMeetingAttendance({
    actorId: OTHER_AUTH,
    records: [{ personId: 'p1', activityId: 'act-132-a', status: 'present' }],
  });
  assert.deepEqual(denied, { added: 0, updated: 0, skipped: 1 }, '非纪检（组织者）提交不落记录');
  assert.equal(savedOf('act-132-a').length, 0, '不落任何记录');

  // 支部党员大会：同为纪检上传位（组织者 p11 组织委员不可传）
  mockDB.activities = [{ id: 'act-132-b', type: '支部党员大会', archived: false, organizer: OTHER_AUTH }];
  assert.equal(canUploadAttendance(DISC, 'act-132-b'), true, '支部党员大会＝纪检上传位');
  assert.equal(canUploadAttendance(OTHER_AUTH, 'act-132-b'), false, '组织者不持党员大会上传位');

  // 支委会：不考勤 ⇒ 任何人无上传位（纪检 / 组织者 / 支书一律 false）
  mockDB.activities = [{ id: 'act-132-c', type: '支委会', archived: false, organizer: DISC }];
  assert.equal(canUploadAttendance(DISC, 'act-132-c'), false, '支委会不考勤：纪检亦无上传位');
  assert.equal(canUploadAttendance(OTHER_AUTH, 'act-132-c'), false, '支委会不考勤：组织者亦无上传位');
  assert.equal(canUploadAttendance('p13', 'act-132-c'), false, '支委会不考勤：支书亦无上传位');

  // 组织者位活动（组织生活会 / 主题党日）＝该场组织者（本批未动）
  mockDB.activities = [{ id: 'act-132-d', type: '组织生活会', archived: false, organizer: OTHER_AUTH }];
  assert.equal(canUploadAttendance(OTHER_AUTH, 'act-132-d'), true, '组织生活会＝该场组织者（本批未动）');
  assert.equal(canUploadAttendance(DISC, 'act-132-d'), false, '非该场组织者的纪检不持组织生活会上传位');

  // 党小组会：本组组长（兼组织者）＝上传位；跨组组长不可
  mockDB.activities = [{ id: 'act-132-e', type: '党小组会', archived: false, organizer: 'p1' }];
  assert.equal(canUploadAttendance('p1', 'act-132-e'), true, '本组组长（兼该场组织者）持本组小组会上传位');
  mockDB.activities = [];
  mockDB.attendances = [];
});
