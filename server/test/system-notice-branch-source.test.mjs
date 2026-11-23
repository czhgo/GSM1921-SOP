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
  const token = await login('2400012355');
  const res = await fetch(`${base}/api/v1/system-notices`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ kind: 'member-change-approved', sourceId: 'mcr-b2', payload: {} }),
  });
  assert.equal(res.status, 403, 'B1 组织委员不能为 B2 成员变更申请触发通知');
  assert.equal(app.locals.db.prepare('SELECT COUNT(*) AS n FROM notices').get().n, noticeCount, '拒绝时不落通知');
});

test('B-552-5 eventKey 幂等：同键两次只落一条并返回既有记录（200）；无 eventKey 行为不变', async () => {
  app.locals.db.prepare('INSERT INTO todos (id, data) VALUES (?, ?)').run('td-eventkey', JSON.stringify({
    id: 'td-eventkey', title: '幂等通知用例', role: 'secretary', category: 'governance',
    priority: 'normal', status: 'pending', branchId: 'br-b1', createdAt: '2026-11-18T00:00:00.000Z',
  }));
  const token = await login('2300010001');
  const post = (extra) => fetch(`${base}/api/v1/system-notices`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ kind: 'todo-void-decided', sourceId: 'td-eventkey', payload: { decision: 'confirmed', reason: '测试' }, ...extra }),
  });
  const count = () => app.locals.db.prepare("SELECT COUNT(*) AS n FROM notices WHERE json_extract(data,'$.eventKey') = 'evt-1'").get().n;

  const first = await post({ eventKey: 'evt-1' });
  assert.equal(first.status, 201, '首次投递应 201');
  const firstBody = await first.json();
  assert.equal(firstBody.eventKey, 'evt-1');
  const second = await post({ eventKey: 'evt-1' });
  assert.equal(second.status, 200, '同键重复投递应 200（不新增）');
  assert.equal((await second.json()).id, firstBody.id, '应返回既有记录');
  assert.equal(count(), 1, '同 eventKey 只保留一条');

  const before = app.locals.db.prepare('SELECT COUNT(*) AS n FROM notices').get().n;
  assert.equal((await post({})).status, 201);
  assert.equal((await post({})).status, 201);
  assert.equal(app.locals.db.prepare('SELECT COUNT(*) AS n FROM notices').get().n, before + 2, '无 eventKey 时行为不变（每次都落库）');
});

test('B-552-5 eventKey 不符：同键但 kind / sourceId 不一致 ⇒ 409（不得返回旧记录）', async () => {
  app.locals.db.prepare('INSERT INTO todos (id, data) VALUES (?, ?)').run('td-eventkey-2', JSON.stringify({
    id: 'td-eventkey-2', title: '幂等键冲突用例', role: 'secretary', category: 'governance',
    priority: 'normal', status: 'pending', branchId: 'br-b1', createdAt: '2026-11-18T00:00:00.000Z',
  }));
  const token = await login('2300010001');
  const post = (extra) => fetch(`${base}/api/v1/system-notices`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ kind: 'todo-void-decided', sourceId: 'td-eventkey-2', payload: { decision: 'confirmed', reason: '测试' }, ...extra }),
  });
  app.locals.db.prepare('INSERT INTO todos (id, data) VALUES (?, ?)').run('td-eventkey-3', JSON.stringify({
    id: 'td-eventkey-3', title: '幂等键另一来源用例', role: 'secretary', category: 'governance',
    priority: 'normal', status: 'pending', branchId: 'br-b1', createdAt: '2026-11-18T00:00:00.000Z',
  }));
  const first = await post({ eventKey: 'evt-conflict' });
  assert.equal(first.status, 201);
  const otherSource = await post({ eventKey: 'evt-conflict', sourceId: 'td-eventkey-3' });
  assert.equal(otherSource.status, 409, '同 eventKey 指向不同来源须 409');
  // 类型不一致：直接造一条同键不同类型的既有通知行，再投同一 eventKey
  app.locals.db.prepare('INSERT INTO notices (id, data) VALUES (?, ?)').run('ntc-conflict-kind', JSON.stringify({
    id: 'ntc-conflict-kind', branchId: 'br-b1', eventKey: 'evt-conflict-kind',
    systemKind: 'committee-vote-locked', sourceId: 'td-eventkey-2',
  }));
  const otherKind = await post({ eventKey: 'evt-conflict-kind' });
  assert.equal(otherKind.status, 409, '同 eventKey 指向不同通知类型须 409');
});
