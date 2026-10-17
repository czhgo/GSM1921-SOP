import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../app.js';
import { seedDatabase } from '../seed.js';

let app, server, base, db;
const tokens = {};

before(async () => {
  app = createApp({ dbPath: ':memory:' });
  await seedDatabase(app.locals.db);
  db = app.locals.db;
  server = app.listen(0);
  base = `http://127.0.0.1:${server.address().port}`;
  for (const personId of ['p11', 'p13', 'p3']) {
    const response = await fetch(`${base}/api/v1/auth/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ personId, password: '123456' }),
    });
    assert.equal(response.status, 200);
    tokens[personId] = (await response.json()).token;
  }
});

after(() => {
  server?.closeAllConnections?.();
  return new Promise((resolve) => server?.close(resolve));
});

async function request(personId, method, path, body) {
  const response = await fetch(`${base}/api/v1/${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokens[personId]}` },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const data = response.status === 204 ? null : await response.json();
  return { status: response.status, data };
}

test('授权审计由服务端认定操作者，且只接受其有权执行的同支部工作组变更', async () => {
  const created = await request('p11', 'POST', 'taskforces', {
    name: '审计范围测试专班', task: '核对授权留痕', status: 'recruiting', branchId: 'br-b1', members: [],
  });
  assert.equal(created.status, 201);
  const workgroupId = created.data.workgroupId;
  const member = await request('p11', 'POST', `workgroups/${workgroupId}/members`, { personId: 'p7', role: 'deep' });
  assert.equal(member.status, 201);

  const grant = await request('p11', 'POST', 'auth-audit', {
    id: 'auth-scope-grant', targetPersonId: 'p7', role: 'deep', scopeRef: created.data.id,
    authorizedBy: 'p13', authorizedAt: '1999-01-01', action: 'grant',
  });
  assert.equal(grant.status, 201);
  assert.equal(grant.data.authorizedBy, 'p11', '服务端应以已认证账号为准');
  assert.notEqual(grant.data.authorizedAt, '1999-01-01', '客户端不得伪造授权时间');

  const forgedByAnotherActor = await request('p3', 'POST', 'auth-audit', {
    id: 'auth-scope-forged-actor', targetPersonId: 'p7', role: 'deep', scopeRef: created.data.id, action: 'grant',
  });
  assert.equal(forgedByAnotherActor.status, 403, '没有相应工作组授权权的登录成员不能造留痕');

  const absentChange = await request('p11', 'POST', 'auth-audit', {
    id: 'auth-scope-no-change', targetPersonId: 'p8', role: 'organizer', scopeRef: created.data.id, action: 'grant',
  });
  assert.equal(absentChange.status, 403, '留痕必须对应已由该操作者完成的成员变更');

  db.prepare('INSERT INTO branches (id, data) VALUES (?, ?)').run('br-b2', JSON.stringify({ id: 'br-b2', name: '第二支部', status: 'active' }));
  db.prepare('INSERT INTO users (id, data) VALUES (?, ?)').run('p-b2', JSON.stringify({ id: 'p-b2', name: '异支部成员', role: 'participant', branchId: 'br-b2' }));
  const crossBranch = await request('p11', 'POST', 'auth-audit', {
    id: 'auth-scope-cross-branch', targetPersonId: 'p-b2', role: 'deep', scopeRef: created.data.id, action: 'grant',
  });
  assert.equal(crossBranch.status, 403, '支部外的授权留痕必须拒绝');

  const removed = await request('p11', 'DELETE', `workgroups/${workgroupId}/members/p7`);
  assert.equal(removed.status, 204);
  const revoke = await request('p11', 'POST', 'auth-audit', {
    id: 'auth-scope-revoke', targetPersonId: 'p7', role: 'deep', scopeRef: created.data.id, action: 'revoke',
  });
  assert.equal(revoke.status, 201);
  assert.equal(revoke.data.authorizedBy, 'p11');
});
