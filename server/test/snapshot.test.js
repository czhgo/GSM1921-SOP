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
after(() => server.close());

test('snapshot 全量覆盖保存后能读回新增活动', async () => {
  const tokenRes = await fetch(`${base}/api/v1/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ personId: 'p13' }),
  });
  const { token } = await tokenRes.json();

  const activities = await (await fetch(`${base}/api/v1/activities`)).json();
  activities.push({ id: 'act-new', title: '新增测试活动', date: '2026-08-30' });

  const res = await fetch(`${base}/api/v1/snapshot`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ activities }),
  });
  assert.equal(res.status, 204);

  const after = await (await fetch(`${base}/api/v1/activities`)).json();
  assert.ok(after.some(a => a.id === 'act-new'), '快照保存后应能读回新增活动');
});

test('snapshot 未登录返回 401', async () => {
  const res = await fetch(`${base}/api/v1/snapshot`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ activities: [] }),
  });
  assert.equal(res.status, 401);
});
