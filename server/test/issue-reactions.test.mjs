// role: [工程师]+[AI]
// issue-reactions.test.mjs — 意见反馈「表态」上服务端（2026-11-22 批次 596 · D-906）
//
// 判据：
//   R1 登录成员可 toggle：同 key 两次＝加后撤，回包只含 reactionCounts / myReactions；
//   R2 出口不泄漏表态人：列表与写回响应都不得出现 `reactions` 原始 personId 数组；
//   R3 未登录 401；
//   R4 原支委处置门未被放宽：普通成员 PATCH /issues/:id 仍 403。
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../app.js';

const BRANCHES = [
  { id: 'br-b1', name: '本科第一党支部', type: '本科生', status: 'active', createdAt: '2026-01-01T00:00:00.000Z' },
];
const USERS = [
  { id: 'sec-1', name: '支书', studentId: '2300010001', role: 'secretary', branchId: 'br-b1', developStage: '正式党员', partyGroup: '第一党小组' },
  { id: 'mem-1', name: '成员一', studentId: '2500010001', role: 'member', branchId: 'br-b1', developStage: '正式党员', partyGroup: '第一党小组' },
  { id: 'mem-2', name: '成员二', studentId: '2500010002', role: 'member', branchId: 'br-b1', developStage: '正式党员', partyGroup: '第一党小组' },
];

let app, server, base, db;
const tokens = {};
const call = (token, method, path, body) => fetch(`${base}${path}`, {
  method,
  headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  ...(body ? { body: JSON.stringify(body) } : {}),
});

before(async () => {
  app = createApp({ dbPath: ':memory:' });
  db = app.locals.db;
  const ib = db.prepare('INSERT INTO branches (id, data) VALUES (?, ?)');
  for (const b of BRANCHES) ib.run(b.id, JSON.stringify(b));
  const iu = db.prepare('INSERT INTO users (id, data) VALUES (?, ?)');
  for (const u of USERS) iu.run(u.id, JSON.stringify(u));
  // 匿名反馈：真身只落 `_realPersonId`，出口必须不可反查（D-824）
  db.prepare('INSERT INTO issues (id, data) VALUES (?, ?)').run('issue-anon', JSON.stringify({
    id: 'issue-anon', branchId: 'br-b1', title: '匿名反馈', body: '测试',
    submittedBy: '匿名', anonymous: true, _realPersonId: 'mem-2',
    status: 'open', createdAt: '2026-11-01T00:00:00.000Z',
    reactions: { thumbsUp: [], thumbsDown: [], eyes: [], hooray: [] },
    participants: [], comments: [],
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

test('R1 成员 toggle：同 key 两次＝加后撤，回包只含计数与我的表态', async () => {
  const add = await call(tokens['mem-1'], 'POST', '/api/v1/issues/issue-anon/reactions', { key: 'thumbsUp' });
  assert.equal(add.status, 200);
  const added = await add.json();
  assert.equal(added.reactionCounts.thumbsUp, 1);
  assert.deepEqual(added.myReactions, ['thumbsUp']);
  assert.equal('reactions' in added, false, '写回响应不得带原始 reactions 数组');

  const remove = await call(tokens['mem-1'], 'POST', '/api/v1/issues/issue-anon/reactions', { key: 'thumbsUp' });
  assert.equal(remove.status, 200);
  const removed = await remove.json();
  assert.equal(removed.reactionCounts.thumbsUp, 0);
  assert.deepEqual(removed.myReactions, []);

  // 换人表态：计数按人累加，但谁点的不可见
  const other = await call(tokens['mem-2'], 'POST', '/api/v1/issues/issue-anon/reactions', { key: 'eyes' });
  assert.equal(other.status, 200);
  assert.equal((await other.json()).reactionCounts.eyes, 1);

  // 清理：撤掉 mem-2 的表态，避免影响后续用例
  await call(tokens['mem-2'], 'POST', '/api/v1/issues/issue-anon/reactions', { key: 'eyes' });
});

test('R2 出口不泄漏表态人：列表与写回都不含 reactions 原始数组', async () => {
  await call(tokens['mem-1'], 'POST', '/api/v1/issues/issue-anon/reactions', { key: 'hooray' });
  const res = await call(tokens['mem-1'], 'GET', '/api/v1/issues');
  assert.equal(res.status, 200);
  const rows = await res.json();
  const row = rows.find((r) => r.id === 'issue-anon');
  assert.ok(row, '列表应包含该反馈');
  assert.equal('reactions' in row, false, '列表出口不得带 reactions 数组');
  assert.equal(row.reactionCounts.hooray, 1);
  assert.deepEqual(row.myReactions, ['hooray']);
  const raw = JSON.stringify(row);
  assert.equal(raw.includes('mem-1'), false, '出口不得出现表态人 personId');
  assert.equal(raw.includes('mem-2'), false, '出口不得出现任何成员 personId');
  await call(tokens['mem-1'], 'POST', '/api/v1/issues/issue-anon/reactions', { key: 'hooray' });
});

test('R3 未登录表态 → 401', async () => {
  const res = await call(null, 'POST', '/api/v1/issues/issue-anon/reactions', { key: 'thumbsUp' });
  assert.equal(res.status, 401);
});

test('R4 原支委处置门未放宽：普通成员 PATCH → 403', async () => {
  const res = await call(tokens['mem-1'], 'PATCH', '/api/v1/issues/issue-anon', { status: 'closed' });
  assert.equal(res.status, 403);
});
