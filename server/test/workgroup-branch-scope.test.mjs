// 支部归属写门（2026-10-21 批次 498 · 支书裁定）：
//   党委账号未选支部时，不得回落 `br-b1` 执行写入；一律 403 并提示先选择支部。
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../app.js';
import { seedDatabase } from '../seed.js';

let app, server, base;

before(async () => {
  app = createApp({ dbPath: ':memory:' });
  await seedDatabase(app.locals.db);
  server = app.listen(0);
  base = `http://127.0.0.1:${server.address().port}`;
});

after(() => server?.close());

async function login(personId) {
  const res = await fetch(`${base}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ personId, password: '123456' }),
  });
  assert.equal(res.status, 200);
  return (await res.json()).token;
}

const auth = (token) => ({ Authorization: `Bearer ${token}` });

test('党委未选支部：整库快照写入被拒且提示选择支部', async () => {
  const token = await login('9000000001');
  const res = await fetch(`${base}/api/v1/snapshot`, {
    method: 'POST',
    headers: { ...auth(token), 'Content-Type': 'application/json' },
    body: JSON.stringify({ todos: [] }),
  });
  assert.equal(res.status, 403);
  const body = await res.json();
  assert.match(body.error, /选择支部/, '提示须说明先选择支部');
});

test('党委未选支部：活动应到名单冻结被拒（不回落 br-b1）', async () => {
  const act = app.locals.db.prepare('SELECT id FROM activities').all()[0];
  assert.ok(act, '种子应有活动');
  const token = await login('9000000001');
  const res = await fetch(`${base}/api/v1/activities/${encodeURIComponent(act.id)}/expected-roster`, {
    method: 'PUT',
    headers: { ...auth(token), 'Content-Type': 'application/json' },
    body: JSON.stringify({ frozen: true, personIds: [] }),
  });
  assert.equal(res.status, 403);
  const body = await res.json();
  assert.match(body.error, /选择支部/);
});

test('支部账号不受影响：支书可读本支部工作组列表', async () => {
  const token = await login('2300010001');
  const res = await fetch(`${base}/api/v1/workgroups`, { headers: auth(token) });
  assert.equal(res.status, 200);
  const rows = await res.json();
  assert.ok(Array.isArray(rows));
  assert.ok(rows.every((row) => row.branchId === 'br-b1'), '只读本支部工作组');
});
