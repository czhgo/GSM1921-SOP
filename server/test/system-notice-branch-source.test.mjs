// A source record outside RESOURCE_TABLES must still be resolved for branch authorization.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../app.js';
import { seedDatabase } from '../seed.js';

let app, server, base;

before(async () => {
  app = createApp({ dbPath: ':memory:' });
  await seedDatabase(app.locals.db);
  app.locals.db.prepare('INSERT INTO member_change_requests (id, data) VALUES (?, ?)').run('mcr-b2', JSON.stringify({
    id: 'mcr-b2', branchId: 'br-b2', personId: 'p98', fromStage: '积极分子', toStage: '发展对象',
  }));
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

test('member-change notice resolves its source row and rejects another branch source', async () => {
  const noticeCount = app.locals.db.prepare('SELECT COUNT(*) AS n FROM notices').get().n;
  const token = await login('p11');
  const res = await fetch(`${base}/api/v1/system-notices`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ kind: 'member-change-approved', sourceId: 'mcr-b2', payload: {} }),
  });
  assert.equal(res.status, 403, 'B1 组织委员不能为 B2 成员变更申请触发通知');
  assert.equal(app.locals.db.prepare('SELECT COUNT(*) AS n FROM notices').get().n, noticeCount, '拒绝时不落通知');
});
