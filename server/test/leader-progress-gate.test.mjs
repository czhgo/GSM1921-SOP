// role: [工程师]+[AI]
// leader-progress-gate.test.mjs — 组长进展读口角色 / 组门（本批 P0-5）
//
// 判据：
//   L1 组长读本组 → 200；
//   L2 组长读他组 → 403；
//   L3 普通成员 → 403；
//   L4 支书读全支部 → 200。
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../app.js';

const BRANCHES = [
  { id: 'br-b1', name: '本科第一党支部', type: '本科生', status: 'active', createdAt: '2026-01-01T00:00:00.000Z' },
];
const USERS = [
  { id: 'sec-1', name: '支书', studentId: '2300010001', role: 'secretary', branchId: 'br-b1', developStage: '正式党员', partyGroup: '第一党小组' },
  { id: 'leader-1', name: '一组组长', studentId: '2400012345', role: 'leader', branchId: 'br-b1', developStage: '正式党员', partyGroup: '第一党小组' },
  { id: 'leader-2', name: '二组组长', studentId: '2400012346', role: 'leader', branchId: 'br-b1', developStage: '正式党员', partyGroup: '第二党小组' },
  { id: 'mem-1', name: '一组组员', studentId: '2400012347', role: 'participant', branchId: 'br-b1', developStage: '正式党员', partyGroup: '第一党小组' },
  { id: 'mem-2', name: '二组组员', studentId: '2400012348', role: 'participant', branchId: 'br-b1', developStage: '正式党员', partyGroup: '第二党小组' },
];

let app, server, base, db;
const tokens = {};
const call = (token, path) => fetch(`${base}${path}`, { headers: { Authorization: `Bearer ${token}` } });

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

test('L1 组长读本组 → 200', async () => {
  const res = await call(tokens['leader-1'], '/api/v1/leader/member-progress?personIds=mem-1');
  assert.equal(res.status, 200);
});

test('L2 组长读他组 → 403', async () => {
  assert.equal((await call(tokens['leader-1'], '/api/v1/leader/member-progress?personIds=mem-2')).status, 403);
  assert.equal((await call(tokens['leader-2'], '/api/v1/leader/member-progress?personIds=mem-1')).status, 403);
});

test('L3 普通成员 → 403', async () => {
  assert.equal((await call(tokens['mem-1'], '/api/v1/leader/member-progress?personIds=mem-1')).status, 403);
});

test('L4 支书读全支部 → 200', async () => {
  assert.equal((await call(tokens['sec-1'], '/api/v1/leader/member-progress?personIds=mem-1,mem-2')).status, 200);
});