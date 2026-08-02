import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../app.js';
import { seedDatabase } from '../seed.js';

let server, base, app;

before(async () => {
  app = createApp({ dbPath: ':memory:' });
  await seedDatabase(app.locals.db);
  server = app.listen(0);
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => server.close());

test('登录成功返回 token 与用户信息', async () => {
  const res = await fetch(`${base}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ personId: 'p13' }),
  });
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.ok(body.token, '应返回 token');
  assert.equal(body.user.id, 'p13');
  assert.equal(body.user.role, 'secretary');
});

test('登录失败（未知人员）返回 401', async () => {
  const res = await fetch(`${base}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ personId: 'nobody' }),
  });
  assert.equal(res.status, 401);
});

test('me 接口携带 token 返回当前用户', async () => {
  const loginRes = await fetch(`${base}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ personId: 'p11' }),
  });
  const { token } = await loginRes.json();
  const res = await fetch(`${base}/api/v1/auth/me`, { headers: { Authorization: `Bearer ${token}` } });
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.id, 'p11');
});
