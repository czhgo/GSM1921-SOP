// server/test/handoff-state-guard.test.mjs — 跨角色交接四项守卫（IA 修复 Task 4）
// 覆盖：
//   D01 考察确认：确认/打回白名单（纪检/支书/副支书）＋ 禁止自确认（recordedBy === actor）；
//   D06 会议考勤：取方案 (b)「录入即确认」——上传后 recordedBy=录入人，且不进入待确认队列；
//   D04 自动交接：auto 交接不派生接收方待办；confirm 幂等、不重复写；台账留痕仍在；
//   D08 组织委员考察写门：前端判据 / 服务端写门 / constants 三处同一角色集（含 org-commissioner）。
// 说明：D01/D06/D04 直导前端服务层（纯 Node 可载，先例 attendance-batch / todo-deriver-domain）；
//   D08 与 D01 的服务端面另起 HTTP（createApp + seedDatabase），验证「直连 API 也拦得住」。
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';

import { createApp } from '../app.js';
import { seedDatabase } from '../seed.js';

import { mockDB } from '../../docs/src/core/domain/domain.js?v=20261021a';
import {
  INSPECTION_WRITE_ROLES,
  INSPECTION_CONFIRM_ROLES,
} from '../../docs/src/core/domain/constants.js?v=20261021a';
import {
  INSPECTION_ROLE_WRITE,
  INSPECTION_ROLE_CONFIRM,
  canUploadInspection,
  confirmInspectionRecord,
  returnInspectionRecord,
} from '../../docs/src/services/activity/inspection.js?v=20261021a';
import {
  INSPECTION_WRITE_ROLE_SET,
  INSPECTION_CONFIRM_ROLE_SET,
} from '../routes/resources/gates.js';
import { HandoffStore } from '../../docs/src/services/governance/handoff.js?v=20261021a';
import { TodoStore } from '../../docs/src/services/governance/todo.js?v=20261021a';
import {
  upsertMeetingAttendance,
  appendAttendanceRecords,
  isAttendancePendingConfirm,
  listPendingAttendanceConfirm,
} from '../../docs/src/services/activity/attendance.js?v=20261021a';

let server, base;

before(async () => {
  const app = createApp({ dbPath: ':memory:' });
  await seedDatabase(app.locals.db);
  server = app.listen(0);
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => {
  server.closeAllConnections?.();
  return new Promise((resolve) => server.close(resolve));
});

async function login(personId) {
  const res = await fetch(`${base}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ personId, password: '123456' }),
  });
  assert.equal(res.status, 200, `登录失败 ${personId}`);
  return res.json();
}
const headers = (token) => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${token}` });

// ── D01 服务层：确认/打回白名单 + 自确认禁令 ─────────────────────────────
function freshInspection(recordedBy = '2400012354', id = 'insp-d01') {
  mockDB.inspections = [{
    id,
    sourceType: 'activity',
    activityId: 'act-7',
    sourceName: null,
    personId: '2400012353',
    level: 'deep',
    content: 'D01 现场',
    role: '深度参与者',
    recordedBy,
    recordedAt: new Date().toISOString(),
    status: 'pending',
  }];
  return mockDB.inspections[0];
}

test('D01：recordedBy === actor 时确认/打回均拒绝，且不改记录', () => {
  const rec = freshInspection('2400012354');
  const c = confirmInspectionRecord('insp-d01', { actorId: '2400012354' });
  assert.equal(c.ok, false);
  assert.equal(c.reason, '不能确认自己提交的考察');
  const r = returnInspectionRecord('insp-d01', { actorId: '2400012354', note: '自查' });
  assert.equal(r.ok, false);
  assert.equal(r.reason, '不能确认自己提交的考察');
  assert.equal(rec.status, 'pending', '被拒后状态不变');
  assert.equal(rec.confirmedBy, undefined);
  assert.equal(rec.returnedBy, undefined);
});

test('D01：纪检/支书/副支书可确认并落 confirmedBy/confirmedAt；组织委员与普通成员不可确认', () => {
  for (const actorId of ['2400012354', '2300010001', '2300010002']) { // 纪检 / 支书 / 副支书
    freshInspection('2400012347');
    const res = confirmInspectionRecord('insp-d01', { actorId });
    assert.equal(res.ok, true, `${actorId} 应可确认`);
    // updateInspectionRecord 是「替换对象」写回，故从 mockDB 重取最新行
    const rec = mockDB.inspections.find((r) => r.id === 'insp-d01');
    assert.equal(rec.status, 'confirmed');
    assert.equal(rec.confirmedBy, actorId, '确认人须落库');
    assert.ok(rec.confirmedAt, '确认时间须落库');
  }
  for (const actorId of ['2400012355', '2400012347']) { // 组织委员 / 普通成员
    const rec = freshInspection('2300010001');
    const res = confirmInspectionRecord('insp-d01', { actorId });
    assert.equal(res.ok, false, `${actorId} 不在确认白名单`);
    assert.equal(rec.status, 'pending');
  }
});

test('D01：打回同样落 returnedBy/returnedAt（复用既有字段）', () => {
  const rec = freshInspection('2400012347');
  const res = returnInspectionRecord('insp-d01', { actorId: '2400012354', note: '内容不完整' });
  assert.equal(res.ok, true);
  assert.equal(rec.status, 'pending');
  assert.equal(rec.returnedBy, '2400012354');
  assert.ok(rec.returnedAt);
  assert.equal(rec.returnReason, '内容不完整');
});

// ── D06 会议考勤：方案 (b) 录入即确认 ─────────────────────────────────
test('D06(b)：会议考勤上传后 recordedBy 为录入人，且不进入待确认队列', () => {
  const activityId = 'act-d06';
  mockDB.activities = [{ id: activityId, title: 'D06 党课', date: '2026-10-01', type: '党课', archived: false, organizer: '2400012354' }];
  mockDB.attendances = [];
  const res = upsertMeetingAttendance({
    actorId: '2400012354',
    records: [{ personId: '2400012345', activityId, status: 'absent' }],
  });
  assert.equal(res.added, 1);
  const saved = mockDB.attendances.find((r) => r.activityId === activityId && r.personId === '2400012345');
  assert.equal(saved.recordedBy, '2400012354', '会议考勤录入即确认：记录人=确认人');
  assert.equal(isAttendancePendingConfirm(saved), false, '自己刚录的记录不得进入待确认');
  assert.deepEqual(listPendingAttendanceConfirm([saved]), []);
});

test('D06(b)：对照——组织者上传（recordedBy:null）的异常记录才进待确认队列', () => {
  const activityId = 'act-d06';
  mockDB.activities = [{ id: activityId, title: 'D06 党课', date: '2026-10-01', type: '党课', archived: false, organizer: '2400012354' }];
  mockDB.attendances = [];
  appendAttendanceRecords({
    actorId: '2400012354',
    records: [{ id: 'att-d06', personId: '2400012346', activityId, status: 'leave', absenceReason: 'leave_sick' }],
  });
  // 注意：mockDB 空表时 loadAttendanceRecords 会回退种子，故按 id 取本次落库行
  const saved = mockDB.attendances.find((r) => r.id === 'att-d06');
  assert.equal(saved.recordedBy, null, '组织者上传的异常记录仍待纪检确认');
  assert.equal(isAttendancePendingConfirm(saved), true);
  assert.equal(listPendingAttendanceConfirm([saved]).length, 1);
});

// ── D04 自动交接：不派生待办 + confirm 幂等 ─────────────────────────────
test('D04：auto 交接不派生接收方待办；confirm 两次结果一致且只有一条交接记录', () => {
  mockDB.handoffs = [];
  mockDB.todos = [];
  const beforeOrgTodos = TodoStore.getByRole('org-commissioner').length;

  const auto = HandoffStore.create({
    type: 'attendance-archival', refType: 'attendance', refLabel: '考勤统计', refId: 'attendance',
  });
  assert.equal(auto.status, 'done');
  assert.equal(auto.auto, true);
  assert.equal(auto.confirmedBy, 'system');
  assert.equal(TodoStore.getByRole('org-commissioner').length, beforeOrgTodos, 'auto 交接不得增加接收方待办');
  assert.equal(TodoStore.getAll().filter((t) => t.actionKey === 'handoff-attendance-archival').length, 0);

  const c1 = HandoffStore.confirm(auto.id, 'org-commissioner');
  const c2 = HandoffStore.confirm(auto.id, 'org-commissioner');
  assert.equal(c1, true, '已送达的 auto 交接确认应幂等成功');
  assert.equal(c2, true);
  assert.equal(mockDB.handoffs.filter((h) => h.type === 'attendance-archival').length, 1, 'confirm 不得产生第二条交接');
  assert.equal(mockDB.handoffs.find((h) => h.id === auto.id).confirmedBy, 'system', '重复 confirm 不得改写系统送达留痕');
});

test('D04：material-shortage（真待办类）仍派生纪检待办', () => {
  mockDB.handoffs = [];
  mockDB.todos = [];
  const h = HandoffStore.create({ type: 'material-shortage', refType: 'activity', refLabel: '补课需求', refId: 'act-d04' });
  assert.equal(h.status, 'pending');
  const todos = TodoStore.getByRole('disc-commissioner').filter((t) => t.actionKey === 'handoff-material-shortage');
  assert.equal(todos.length, 1, '需纪检动作的交接仍须派生待办');
});

// ── D08：组织委员正式纳入考察写门（三处同源） ───────────────────────────
test('D08：前端判据 / 服务端写门 / constants 角色集合同源，且含 org-commissioner', () => {
  const norm = (arr) => [...arr].sort();
  assert.deepEqual(norm(INSPECTION_ROLE_WRITE), norm(INSPECTION_WRITE_ROLES), '前端写角色集须取自 constants');
  assert.deepEqual(norm(INSPECTION_WRITE_ROLE_SET), norm(INSPECTION_WRITE_ROLES), '服务端写门角色集须取自 constants');
  assert.deepEqual(norm(INSPECTION_ROLE_CONFIRM), norm(INSPECTION_CONFIRM_ROLES), '前端确认角色集须取自 constants');
  assert.deepEqual(norm(INSPECTION_CONFIRM_ROLE_SET), norm(INSPECTION_CONFIRM_ROLES), '服务端确认角色集须取自 constants');
  assert.ok(INSPECTION_ROLE_WRITE.has('org-commissioner'), 'D08：组织委员纳入写门');
  assert.ok(!INSPECTION_ROLE_CONFIRM.has('org-commissioner'), 'D01：组织委员不在确认白名单');

  mockDB.activities = [{ id: 'act-d08', title: 'D08 活动', date: '2026-10-01', type: '主题党日', archived: false, organizer: '2300010001', assignments: [] }];
  assert.equal(canUploadInspection('2400012355', 'activity', 'act-d08'), true, '组织委员可建档代录');
  assert.equal(canUploadInspection('2400012351', 'activity', 'act-d08'), false, '普通成员非组织者不可写');
});

test('D08/D01 服务端：组织委员可 POST 考察，但不能确认（确认白名单 + 自确认禁令）', async () => {
  const org = await login('2400012355');
  const post = await fetch(`${base}/api/v1/inspections`, {
    method: 'POST',
    headers: headers(org.token),
    body: JSON.stringify({
      sourceType: 'activity', activityId: 'act-7', personId: '2400012353', level: 'deep',
      content: '组织委员建档代录', status: 'pending', recordedAt: new Date().toISOString(),
    }),
  });
  const text = await post.text();
  assert.equal(post.status, 201, `组织委员应可写（实得 ${post.status}：${text}）`);
  const created = JSON.parse(text);
  assert.equal(created.recordedBy, '2400012355', 'recordedBy 落操作人本人');

  const selfConfirm = await fetch(`${base}/api/v1/inspections/${created.id}`, {
    method: 'PATCH', headers: headers(org.token), body: JSON.stringify({ status: 'confirmed' }),
  });
  assert.equal(selfConfirm.status, 403, '组织委员不得确认自己的代录');
  assert.equal((await selfConfirm.json()).error, '不能确认自己提交的考察');

  // 普通成员不可写（写门 403）
  const member = await login('2400012351');
  const denied = await fetch(`${base}/api/v1/inspections`, {
    method: 'POST',
    headers: headers(member.token),
    body: JSON.stringify({ sourceType: 'activity', activityId: 'act-7', personId: '2400012353', content: '越权', status: 'pending' }),
  });
  assert.equal(denied.status, 403, '普通成员非本场组织者不可写');
});

test('D01 服务端：纪检自提交的考察，确认/打回均 403；支书/副支书可确认', async () => {
  const disc = await login('2400012354');
  const post = await fetch(`${base}/api/v1/inspections`, {
    method: 'POST',
    headers: headers(disc.token),
    body: JSON.stringify({
      sourceType: 'activity', activityId: 'act-7', personId: '2400012353', level: 'deep',
      content: '纪检自提交（D01）', status: 'pending', recordedAt: new Date().toISOString(),
    }),
  });
  assert.equal(post.status, 201);
  const created = await post.json();
  assert.equal(created.recordedBy, '2400012354');

  for (const body of [{ status: 'confirmed' }, { returnedBy: '2400012354', returnReason: '自查' }]) {
    const res = await fetch(`${base}/api/v1/inspections/${created.id}`, {
      method: 'PATCH', headers: headers(disc.token), body: JSON.stringify(body),
    });
    assert.equal(res.status, 403, `自确认/自打回应 403（${JSON.stringify(body)}）`);
    assert.equal((await res.json()).error, '不能确认自己提交的考察');
  }

  // 支书确认：200 且 confirmedBy 由会话落定
  const sec = await login('2300010001');
  const ok = await fetch(`${base}/api/v1/inspections/${created.id}`, {
    method: 'PATCH', headers: headers(sec.token), body: JSON.stringify({ status: 'confirmed' }),
  });
  const okText = await ok.text();
  assert.equal(ok.status, 200, `支书应可确认（实得 ${ok.status}：${okText}）`);
  const confirmed = JSON.parse(okText);
  assert.equal(confirmed.status, 'confirmed');
  assert.equal(confirmed.confirmedBy, '2300010001');
  assert.ok(confirmed.confirmedAt);

  // 普通成员确认：403（写门先拦）
  const member = await login('2400012351');
  const denied = await fetch(`${base}/api/v1/inspections/${created.id}`, {
    method: 'PATCH', headers: headers(member.token), body: JSON.stringify({ status: 'confirmed' }),
  });
  assert.equal(denied.status, 403);
});
