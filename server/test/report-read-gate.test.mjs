// role: [工程师]+[AI]
// report-read-gate.test.mjs — 报表读口收权（本批 P0-3）
//
// 判据：
//   R1 普通成员 GET /report/:domain 与 /report/export → 403；
//   R2 组织委员 / 支书 GET 两读口 → 200。
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../app.js';

const BRANCHES = [
  { id: 'br-b1', name: '本科第一党支部', type: '本科生', status: 'active', createdAt: '2026-01-01T00:00:00.000Z' },
];
const USERS = [
  { id: 'sec-1', name: '支书', studentId: '2300010001', role: 'secretary', branchId: 'br-b1', developStage: '正式党员', partyGroup: '第一党小组' },
  { id: 'org-1', name: '组织委员', studentId: '2300010002', role: 'org-commissioner', branchId: 'br-b1', developStage: '正式党员', partyGroup: '第一党小组' },
  { id: 'mem-1', name: '成员', studentId: '2400012349', role: 'participant', branchId: 'br-b1', developStage: '正式党员', partyGroup: '第一党小组' },
];

let app, server, base, db;
const tokens = {};
const call = (token, method, path) => fetch(`${base}${path}`, {
  method,
  headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
});

before(async () => {
  app = createApp({ dbPath: ':memory:' });
  db = app.locals.db;
  const ib = db.prepare('INSERT INTO branches (id, data) VALUES (?, ?)');
  for (const b of BRANCHES) ib.run(b.id, JSON.stringify(b));
  const iu = db.prepare('INSERT INTO users (id, data) VALUES (?, ?)');
  for (const u of USERS) iu.run(u.id, JSON.stringify(u));
  server = app.listen(0);
  base = `http://127.0.0.1:${server.address().port}`;
  for (const u of USERS) {
    const res = await fetch(`${base}/api/v1/auth/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ personId: u.id, password: '123456' }),
    });
    assert.equal(res.status, 200, `登录失败：${u.id}`);
    tokens[u.id] = (await res.json()).token;
  }
});

after(() => server.close());

test('R1 普通成员读报表 → 403', async () => {
  assert.equal((await call(tokens['mem-1'], 'GET', '/api/v1/report/member')).status, 403);
  assert.equal((await call(tokens['mem-1'], 'GET', '/api/v1/report/export?domain=member')).status, 403);
});

test('R2 组织委员 / 支书读报表 → 200', async () => {
  assert.equal((await call(tokens['org-1'], 'GET', '/api/v1/report/member')).status, 200);
  assert.equal((await call(tokens['org-1'], 'GET', '/api/v1/report/export?domain=member')).status, 200);
  assert.equal((await call(tokens['sec-1'], 'GET', '/api/v1/report/attendance')).status, 200);
});