// server/test/inspection-write-gate.test.mjs — 考察写门（Phase 0 · R4-D05，2026-10-20）
// 口径（任务单）：
//   · 普通成员非本场组织者：POST/PATCH/DELETE /inspections 一律 403，且不落库；
//   · 本场活动组织者的普通成员：POST 本场考察 → 201（recordedBy 由会话决定）；
//   · 纪检 / 支书（支委层）：POST/PATCH/DELETE → 200/201/204。
// 自包含：createApp(:memory:) + seedDatabase；HTTP 直连（无浏览器）。
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../app.js';
import { seedDatabase } from '../seed.js';

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

/** act-7 的组织者是 p3（普通成员）；p7 既非组织者、也非支委层 */
const ACTIVITY_ID = 'act-7';
const inspectionPayload = (content) => ({
  sourceType: 'activity',
  activityId: ACTIVITY_ID,
  personId: 'p9',
  level: 'deep',
  content,
  status: 'pending',
  recordedAt: new Date().toISOString(),
});

test('普通成员非本场组织者：POST/PATCH/DELETE /inspections → 403，且删除不落库', async () => {
  const { token } = await login('p7');

  const post = await fetch(`${base}/api/v1/inspections`, {
    method: 'POST', headers: headers(token), body: JSON.stringify(inspectionPayload('越权新增考察')),
  });
  assert.equal(post.status, 403, `非组织者不得新增考察（实得 ${post.status}：${await post.text()}）`);

  // insp-4 属 act-7，已在种子中（pending）
  const patch = await fetch(`${base}/api/v1/inspections/insp-4`, {
    method: 'PATCH', headers: headers(token), body: JSON.stringify({ content: '越权篡改' }),
  });
  assert.equal(patch.status, 403, `非组织者不得修改考察（实得 ${patch.status}：${await patch.text()}）`);

  const del = await fetch(`${base}/api/v1/inspections/insp-4`, {
    method: 'DELETE', headers: headers(token),
  });
  assert.equal(del.status, 403, `非组织者不得删除考察（实得 ${del.status}：${await del.text()}）`);

  // 非授权删除不落库：支委层读口仍能看到 insp-4，且内容未被篡改
  const { token: secToken } = await login('p13');
  const rows = await (await fetch(`${base}/api/v1/inspections`, { headers: headers(secToken) })).json();
  const row = rows.find((r) => r.id === 'insp-4');
  assert.ok(row, '非授权删除不得落库（insp-4 应仍存在）');
  assert.notEqual(row.content, '越权篡改', '非授权 PATCH 不得落库');
});

test('本场组织者的普通成员：POST 本场考察 → 201，记录人取当前会话', async () => {
  const { token } = await login('p3'); // act-7 组织者（participant）
  const res = await fetch(`${base}/api/v1/inspections`, {
    method: 'POST', headers: headers(token), body: JSON.stringify(inspectionPayload('组织者上传本场考察')),
  });
  const text = await res.text();
  assert.equal(res.status, 201, `本场组织者应可新增（实得 ${res.status}：${text}）`);
  const created = JSON.parse(text);
  assert.equal(created.activityId, ACTIVITY_ID);
  assert.equal(created.recordedBy, 'p3', '考察记录人应由会话决定（不得代署）');

  // 自己组织的场次可修改
  const patch = await fetch(`${base}/api/v1/inspections/${created.id}`, {
    method: 'PATCH', headers: headers(token), body: JSON.stringify({ content: '组织者修订本场考察' }),
  });
  assert.equal(patch.status, 200, `本场组织者应可修改（实得 ${patch.status}：${await patch.text()}）`);
});

test('纪检（disc-commissioner）：POST / PATCH / DELETE → 201 / 200 / 204', async () => {
  const { token } = await login('p10'); // 纪检委员
  const post = await fetch(`${base}/api/v1/inspections`, {
    method: 'POST', headers: headers(token), body: JSON.stringify(inspectionPayload('纪检补录考察')),
  });
  const text = await post.text();
  assert.equal(post.status, 201, `纪检应可新增（实得 ${post.status}：${text}）`);
  const created = JSON.parse(text);

  const patch = await fetch(`${base}/api/v1/inspections/${created.id}`, {
    method: 'PATCH', headers: headers(token), body: JSON.stringify({ status: 'confirmed' }),
  });
  assert.equal(patch.status, 200, `纪检应可确认（实得 ${patch.status}：${await patch.text()}）`);

  const del = await fetch(`${base}/api/v1/inspections/${created.id}`, {
    method: 'DELETE', headers: headers(token),
  });
  assert.equal(del.status, 204, `纪检应可删除（实得 ${del.status}：${await del.text()}）`);
});

test('支书（secretary）：POST / PATCH / DELETE → 201 / 200 / 204', async () => {
  const { token } = await login('p13'); // 支书
  const post = await fetch(`${base}/api/v1/inspections`, {
    method: 'POST', headers: headers(token), body: JSON.stringify(inspectionPayload('支书补录考察')),
  });
  const text = await post.text();
  assert.equal(post.status, 201, `支书应可新增（实得 ${post.status}：${text}）`);
  const created = JSON.parse(text);

  const patch = await fetch(`${base}/api/v1/inspections/${created.id}`, {
    method: 'PATCH', headers: headers(token), body: JSON.stringify({ content: '支书修订考察' }),
  });
  assert.equal(patch.status, 200, `支书应可修改（实得 ${patch.status}：${await patch.text()}）`);

  const del = await fetch(`${base}/api/v1/inspections/${created.id}`, {
    method: 'DELETE', headers: headers(token),
  });
  assert.equal(del.status, 204, `支书应可删除（实得 ${del.status}：${await del.text()}）`);
});
