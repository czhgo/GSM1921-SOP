// Regression contract for the updated branch-confined anonymous feedback policy.
import { test, before, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../app.js';
import { seedDatabase } from '../seed.js';

let app, server, base;

before(async () => {
  app = createApp({ dbPath: ':memory:' });
  await seedDatabase(app.locals.db);
  app.locals.db.prepare('INSERT INTO users (id, data) VALUES (?, ?)').run('p98', JSON.stringify({
    id: 'p98', name: '乙支部支书', role: 'secretary', branchId: 'br-b2',
  }));
  server = app.listen(0);
  base = `http://127.0.0.1:${server.address().port}`;
});

after(() => server?.close());

beforeEach(() => {
  app.locals.db.prepare("DELETE FROM issues WHERE id IN ('issue-a', 'issue-b')").run();
  app.locals.db.prepare('DELETE FROM issue_reveals').run();
});

async function login(personId) {
  const res = await fetch(`${base}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ personId, password: '123456' }),
  });
  assert.equal(res.status, 200);
  return (await res.json()).token;
}

function auth(token) { return { Authorization: `Bearer ${token}` }; }

function putIssue(id, branchId, submitter) {
  app.locals.db.prepare('INSERT INTO issues (id, data) VALUES (?, ?)').run(id, JSON.stringify({
    id, number: 900 + (id === 'issue-a' ? 1 : 2), branchId, title: id, body: 'body', scope: 'local',
    types: ['bug'], status: 'open', anonymous: true, submittedBy: '匿名', _realPersonId: submitter,
    participants: [], comments: [], commentCount: 0,
  }));
}

test('issues list requires login and is limited to the actor branch; Party Committee gets no list', async () => {
  putIssue('issue-a', 'br-b1', 'p5');
  putIssue('issue-b', 'br-b2', 'p98');

  assert.equal((await fetch(`${base}/api/v1/issues`)).status, 401, '匿名访问不应读取反馈');

  const b1 = await fetch(`${base}/api/v1/issues`, { headers: auth(await login('p13')) });
  assert.equal(b1.status, 200);
  const b1Rows = await b1.json();
  assert.ok(b1Rows.some((row) => row.id === 'issue-a'));
  assert.ok(!b1Rows.some((row) => row.id === 'issue-b'), 'B1 列表不得包含 B2 反馈');

  const b2 = await fetch(`${base}/api/v1/issues`, { headers: auth(await login('p98')) });
  assert.equal(b2.status, 200);
  assert.deepEqual((await b2.json()).map((row) => row.id), ['issue-b']);

  const party = await fetch(`${base}/api/v1/issues`, { headers: auth(await login('p_pc')) });
  assert.equal(party.status, 200, '党委 bootstrap 保持空列表形状');
  assert.deepEqual(await party.json(), [], '党委不可读取支部内部反馈');
});

test('issue submission requires a branch account and derives branchId from the authenticated actor', async () => {
  const body = JSON.stringify({ title: 'scoped', body: 'body', scope: 'local', types: ['bug'], anonymous: true, branchId: 'br-b2' });
  const party = await fetch(`${base}/api/v1/issues`, {
    method: 'POST', headers: { ...auth(await login('p_pc')), 'Content-Type': 'application/json' }, body,
  });
  assert.equal(party.status, 403, '党委不是匿名反馈入口');

  const branchToken = await login('p13');
  const createdRes = await fetch(`${base}/api/v1/issues`, {
    method: 'POST', headers: { ...auth(branchToken), 'Content-Type': 'application/json' }, body,
  });
  assert.equal(createdRes.status, 201);
  const created = await createdRes.json();
  assert.equal(created.branchId, 'br-b1', '客户端伪造的 branchId 不得改变归属');
  assert.equal(JSON.parse(app.locals.db.prepare('SELECT data FROM issues WHERE id = ?').get(created.id).data)._realPersonId, 'p13');
});

test('issue disposition is branch-scoped and Party Committee cannot read or reveal identities', async () => {
  putIssue('issue-a', 'br-b1', 'p5');
  putIssue('issue-b', 'br-b2', 'p98');

  const b1Token = await login('p13');
  const ownPatch = await fetch(`${base}/api/v1/issues/issue-a`, {
    method: 'PATCH', headers: { ...auth(b1Token), 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'processing' }),
  });
  assert.equal(ownPatch.status, 200, '本支部处置角色仍可处理反馈');

  const foreignPatch = await fetch(`${base}/api/v1/issues/issue-b`, {
    method: 'PATCH', headers: { ...auth(b1Token), 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'closed' }),
  });
  assert.equal(foreignPatch.status, 403, '不得处置其他支部反馈');

  const partyToken = await login('p_pc');
  const reveal = await fetch(`${base}/api/v1/issues/reveal`, { headers: auth(partyToken) });
  assert.equal(reveal.status, 403, '党委不能查看或揭名匿名反馈');
  assert.deepEqual(app.locals.db.prepare('SELECT id FROM issue_reveals').all(), [], '被拒的党委访问不留揭名审计记录');
});
