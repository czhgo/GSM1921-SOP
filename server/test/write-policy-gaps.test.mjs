// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  server/test/write-policy-gaps.test.mjs —— 写入口权限矩阵 6 条真实缺口回归（2026-11-03 Task 4）
//
//  覆盖（每条都真跑 HTTP + 临时 :memory: 库，不连 3000）：
//   ① DELETE /attendances/:id：普通成员删他人考勤 403；本场组织者 / 记录人 / 支委 可删
//   ② POST /actSubRecords：普通成员写他人活动子记录 403；本场组织者 201
//   ③ PATCH /actSubRecords/:id：普通成员改他人子记录 403；组织者 200；不得把子记录挪到他人父键 403
//   ④ POST /tfSubRecords：普通成员 403；专班组织者 201
//   ⑤ PATCH /tfSubRecords/:id：普通成员 403；专班组织者 200
//   ⑥ POST /issue-unread：普通成员替他人写未读 403；本人 / 支委派发 / 事项当事人 200
//
//  为什么用「种子里的真实账号」：角色/组织者判据复用 constants.js 与既有活动/专班数据，
//  自定义假账号会掩盖「判据读的是哪一份字段」的问题。
// ════════════════════════════════════════════════════════════════

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../app.js';
import { seedDatabase } from '../seed.js';

process.env.DISABLE_PASSWORD_CHECK = '1';

// 种子账号（docs/src/data/mock/people.js / activities.js 单一源）
const SECRETARY = '2300010001';     // 支书（支委层）
const ORGANIZER_A = '2400012347';   // 普通成员；act-3 组织者、tf-003 组织者
const ORGANIZER_B = '2400012346';   // 第二党小组组长；act-gapB 组织者
const MEMBER = '2400012350';        // 普通成员（发展对象）
const TARGET = '2400012349';        // 普通成员（被指派对象）

let server, base, db, app;

const H = (token) => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${token}` });

before(async () => {
  app = createApp({ dbPath: ':memory:' });
  db = app.locals.db;
  await seedDatabase(db);
  server = app.listen(0);
  base = `http://127.0.0.1:${server.address().port}`;
});

after(() => {
  server.closeAllConnections?.();
  return new Promise((resolve) => server.close(resolve));
});

async function login(personId) {
  const res = await fetch(`${base}/api/v1/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ personId }),
  });
  assert.equal(res.status, 200, `登录失败 ${personId}`);
  return (await res.json()).token;
}

function put(table, row) {
  db.prepare(`INSERT OR REPLACE INTO ${table} (id, data) VALUES (?, ?)`).run(row.id, JSON.stringify(row));
}
function readPayload(table, id) {
  const found = db.prepare(`SELECT data FROM ${table} WHERE id = ?`).get(id);
  return found ? JSON.parse(found.data) : null;
}

// ── ① 考勤删除 ────────────────────────────────────────────────
test('① DELETE /attendances/:id：普通成员删他人考勤 403；组织者/记录人/支委可删', async () => {
  const memberToken = await login(MEMBER);
  const organizerToken = await login(ORGANIZER_A);
  const committeeToken = await login(SECRETARY);

  put('attendances', {
    id: 'att-gap-other', activityId: 'act-3', personId: TARGET,
    status: 'absent', recordedBy: ORGANIZER_A, branchId: 'br-b1',
  });
  const denied = await fetch(`${base}/api/v1/attendances/att-gap-other`, { method: 'DELETE', headers: H(memberToken) });
  assert.equal(denied.status, 403, '普通成员不得删除他人考勤');
  assert.ok(readPayload('attendances', 'att-gap-other'), '越权删除后行仍在');

  const byOrganizer = await fetch(`${base}/api/v1/attendances/att-gap-other`, { method: 'DELETE', headers: H(organizerToken) });
  assert.equal(byOrganizer.status, 204, '本场活动组织者可删除');

  // 记录人本人（普通成员）也可删除自己录的行
  put('attendances', {
    id: 'att-gap-self', activityId: 'act-3', personId: TARGET,
    status: 'present', recordedBy: MEMBER, branchId: 'br-b1',
  });
  const byRecorder = await fetch(`${base}/api/v1/attendances/att-gap-self`, { method: 'DELETE', headers: H(memberToken) });
  assert.equal(byRecorder.status, 204, '记录人本人可删除自己录的考勤');

  // 支委层可删
  put('attendances', {
    id: 'att-gap-committee', activityId: 'act-3', personId: TARGET,
    status: 'leave', recordedBy: ORGANIZER_A, branchId: 'br-b1',
  });
  const byCommittee = await fetch(`${base}/api/v1/attendances/att-gap-committee`, { method: 'DELETE', headers: H(committeeToken) });
  assert.equal(byCommittee.status, 204, '支委层可删除本支部考勤');
});

// ── ②③ 活动子记录 ─────────────────────────────────────────────
test('②③ actSubRecords：普通成员写/改他人活动子记录 403；组织者可写；不得挪到他人父键', async () => {
  const memberToken = await login(MEMBER);
  const organizerToken = await login(ORGANIZER_A);

  // POST：普通成员写 act-3（组织者 ORGANIZER_A）→ 403
  const postDenied = await fetch(`${base}/api/v1/actSubRecords`, {
    method: 'POST', headers: H(memberToken),
    body: JSON.stringify({ body: { 'act-3': { publicity: [{ title: '越权初稿' }] } } }),
  });
  assert.equal(postDenied.status, 403, '普通成员不得写他人活动子记录');

  // POST：本场组织者 → 201
  const postOk = await fetch(`${base}/api/v1/actSubRecords`, {
    method: 'POST', headers: H(organizerToken),
    body: JSON.stringify({ body: { 'act-3': { publicity: [{ title: '组织者初稿' }] } } }),
  });
  assert.equal(postOk.status, 201, '本场活动组织者可写活动子记录');

  // 准备 __root__ 聚合行
  put('act_sub_records', { id: '__root__', body: {} });

  // PATCH：普通成员 → 403
  const patchDenied = await fetch(`${base}/api/v1/actSubRecords/__root__`, {
    method: 'PATCH', headers: H(memberToken),
    body: JSON.stringify({ body: { 'act-3': { publicity: [{ title: '越权改写' }] } } }),
  });
  assert.equal(patchDenied.status, 403, '普通成员不得改写他人活动子记录');

  // PATCH：组织者 → 200
  const patchOk = await fetch(`${base}/api/v1/actSubRecords/__root__`, {
    method: 'PATCH', headers: H(organizerToken),
    body: JSON.stringify({ body: { 'act-3': { publicity: [{ title: '组织者改写' }] } } }),
  });
  assert.equal(patchOk.status, 200, '本场活动组织者可改写活动子记录');

  // 另一个活动（组织者 ORGANIZER_B）：把子记录挪到它下面 → 403
  put('activities', {
    id: 'act-gapB', title: '他人活动', type: '主题党日', status: 'published',
    organizer: ORGANIZER_B, branchId: 'br-b1', assignments: [{ personId: ORGANIZER_B, role: 'organizer' }],
  });
  const current = readPayload('act_sub_records', '__root__').body || {};
  put('act_sub_records', { id: '__root__', body: { ...current, 'act-gapB': { publicity: [] } } });
  const afterMovePrep = readPayload('act_sub_records', '__root__').body || {};
  const moveDenied = await fetch(`${base}/api/v1/actSubRecords/__root__`, {
    method: 'PATCH', headers: H(organizerToken),
    body: JSON.stringify({ body: { ...afterMovePrep, 'act-gapB': { publicity: [{ title: '挪过来的' }] } } }),
  });
  assert.equal(moveDenied.status, 403, '不得把子记录挪到他人父记录（新父键同样受判据约束）');

  // 未变父键跳过：整对象回传（含他人活动且值未变）应放行 → 200
  const unchanged = await fetch(`${base}/api/v1/actSubRecords/__root__`, {
    method: 'PATCH', headers: H(organizerToken),
    body: JSON.stringify({ body: afterMovePrep }),
  });
  assert.equal(unchanged.status, 200, '未变父键不应误拒（整对象回传）');
});

// ── ④⑤ 专班子记录 ────────────────────────────────────────────
test('④⑤ tfSubRecords：普通成员写/改他人专班子记录 403；专班组织者可写', async () => {
  const memberToken = await login(MEMBER);
  const organizerToken = await login(ORGANIZER_A);

  // tf-003 的 members 中 ORGANIZER_A 为 organizer
  const postDenied = await fetch(`${base}/api/v1/tfSubRecords`, {
    method: 'POST', headers: H(memberToken),
    body: JSON.stringify({ body: { 'tf-003': { outputs: [{ title: '越权产出' }] } } }),
  });
  assert.equal(postDenied.status, 403, '普通成员不得写他人专班子记录');

  const postOk = await fetch(`${base}/api/v1/tfSubRecords`, {
    method: 'POST', headers: H(organizerToken),
    body: JSON.stringify({ body: { 'tf-003': { outputs: [{ title: '组织者产出' }] } } }),
  });
  assert.equal(postOk.status, 201, '专班组织者可写专班子记录');

  put('tf_sub_records', { id: '__root__', body: {} });
  const patchDenied = await fetch(`${base}/api/v1/tfSubRecords/__root__`, {
    method: 'PATCH', headers: H(memberToken),
    body: JSON.stringify({ body: { 'tf-003': { outputs: [{ title: '越权改写' }] } } }),
  });
  assert.equal(patchDenied.status, 403, '普通成员不得改写他人专班子记录');

  const patchOk = await fetch(`${base}/api/v1/tfSubRecords/__root__`, {
    method: 'PATCH', headers: H(organizerToken),
    body: JSON.stringify({ body: { 'tf-003': { outputs: [{ title: '组织者改写' }] } } }),
  });
  assert.equal(patchOk.status, 200, '专班组织者可改写专班子记录');
});

// ── ⑥ 意见反馈未读标记 ────────────────────────────────────────
test('⑥ POST /issue-unread：普通成员替他人写未读 403；本人/支委派发/事项当事人 200', async () => {
  const memberToken = await login(MEMBER);
  const selfToken = await login(TARGET);
  const committeeToken = await login(SECRETARY);
  const leaderToken = await login(ORGANIZER_B);

  put('issues', {
    id: 'issue-gap', branchId: 'br-b1', title: '缺口测试事项', body: 'x', status: 'open',
    submittedBy: TARGET, assignee: TARGET, assigneeRole: 'participant',
    dispatchHistory: [{ from: null, to: TARGET, by: SECRETARY, at: '2026-11-01' }],
  });

  const setUnread = (token, assigneeId) => fetch(`${base}/api/v1/issue-unread`, {
    method: 'POST', headers: H(token),
    body: JSON.stringify({ assigneeId, issueId: 'issue-gap', unread: true }),
  });

  assert.equal((await setUnread(memberToken, TARGET)).status, 403, '普通成员不得替他人写未读');
  assert.equal((await setUnread(selfToken, TARGET)).status, 200, '本人可写自己的未读');
  assert.equal((await setUnread(committeeToken, TARGET)).status, 200, '支委派发位可替被指派人写未读');
  assert.equal((await setUnread(leaderToken, TARGET)).status, 200, '党小组组长派发位可写未读');

  // 派发位可替同支部成员写未读（前端 assignIssue / requestReport 的真实语义；
  // 强校验 issue.assignee 会与 fire-and-forget 的 PATCH 竞态，故判据只锁角色不锁对象）
  assert.equal((await setUnread(committeeToken, ORGANIZER_A)).status, 200, '支委派发位可写同支部成员的未读');

  // 角色保留键 secretary-review：只有事项提交人/被指派人可写
  const setSecretaryReview = (token) => fetch(`${base}/api/v1/issue-unread`, {
    method: 'POST', headers: H(token),
    body: JSON.stringify({ assigneeId: 'secretary-review', issueId: 'issue-gap', unread: true }),
  });
  assert.equal((await setSecretaryReview(memberToken)).status, 403, '非事项当事人不得写 secretary-review');
  assert.equal((await setSecretaryReview(selfToken)).status, 200, '事项提交人/被指派人可写 secretary-review');
});
