// role: [工程师]+[AI]
// issue-unread-gate.test.mjs — 待办角标写权（D-871）
//
// 判据：
//   U1 支书 / 副支书清 `secretary-review` 角标（unread:false）→ 200；
//   U2 组织委员清同一角标 → 403（不放开给全体支委）；
//   U3 事项提交人把 `secretary-review` 置 unread:true → 200（保留原语义）。
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../app.js';

const BRANCHES = [
  { id: 'br-b1', name: '本科第一党支部', type: '本科生', status: 'active', createdAt: '2026-01-01T00:00:00.000Z' },
];
const USERS = [
  { id: 'sec-1', name: '支书', studentId: '2300010001', role: 'secretary', branchId: 'br-b1', developStage: '正式党员', partyGroup: '第一党小组' },
  { id: 'dep-1', name: '副支书', studentId: '2300010009', role: 'deputy-secretary', branchId: 'br-b1', developStage: '正式党员', partyGroup: '第一党小组' },
  { id: 'org-1', name: '组织委员', studentId: '2300010002', role: 'org-commissioner', branchId: 'br-b1', developStage: '正式党员', partyGroup: '第一党小组' },
  { id: 'leader-1', name: '组长', studentId: '2400012345', role: 'leader', branchId: 'br-b1', developStage: '正式党员', partyGroup: '第一党小组' },
];

let app, server, base, db;
const tokens = {};
const call = (token, method, path, body) => fetch(`${base}${path}`, {
  method,
  headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  ...(body ? { body: JSON.stringify(body) } : {}),
});
const unreadBody = (unread) => ({ assigneeId: 'secretary-review', issueId: 'issue-1', unread });

before(async () => {
  app = createApp({ dbPath: ':memory:' });
  db = app.locals.db;
  const ib = db.prepare('INSERT INTO branches (id, data) VALUES (?, ?)');
  for (const b of BRANCHES) ib.run(b.id, JSON.stringify(b));
  const iu = db.prepare('INSERT INTO users (id, data) VALUES (?, ?)');
  for (const u of USERS) iu.run(u.id, JSON.stringify(u));
  db.prepare('INSERT INTO issues (id, data) VALUES (?, ?)').run('issue-1', JSON.stringify({
    id: 'issue-1', branchId: 'br-b1', title: '测试事项', submittedBy: 'leader-1', assignee: 'leader-1',
    status: 'open', createdAt: '2026-11-01T00:00:00.000Z',
  }));
  server = app.listen(0);
  base = `http://127.0.0.1:${server.address().port}`;
  for (const u of USERS) {
    const res = await call(null, 'POST', '/api/v1/auth/login', { personId: u.id, password: '123456' });
    assert.equal(res.status, 200, `登录失败：${u.id}`);
    tokens[u.id] = (await res.json()).token;
  }
});

after(() => server.close());

test('U1 支书 / 副支书可清 secretary-review 角标', async () => {
  assert.equal((await call(tokens['sec-1'], 'POST', '/api/v1/issue-unread', unreadBody(false))).status, 200);
  assert.equal((await call(tokens['dep-1'], 'POST', '/api/v1/issue-unread', unreadBody(false))).status, 200);
});

test('U2 组织委员清同一角标 → 403', async () => {
  assert.equal((await call(tokens['org-1'], 'POST', '/api/v1/issue-unread', unreadBody(false))).status, 403);
});

test('U3 事项提交人置 secretary-review 角标 → 200', async () => {
  assert.equal((await call(tokens['leader-1'], 'POST', '/api/v1/issue-unread', unreadBody(true))).status, 200);
});