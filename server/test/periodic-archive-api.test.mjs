import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../app.js';
import { seedDatabase } from '../seed.js';

let server;
let base;
const tokens = {};

before(async () => {
  const app = createApp({ dbPath: ':memory:' });
  await seedDatabase(app.locals.db);
  server = app.listen(0);
  base = `http://127.0.0.1:${server.address().port}`;
  for (const personId of ['p12', 'p13']) {
    const response = await fetch(`${base}/api/v1/auth/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ personId, password: '123456' }),
    });
    assert.equal(response.status, 200);
    tokens[personId] = (await response.json()).token;
  }
});

after(() => {
  server?.closeAllConnections?.();
  return new Promise((resolve) => server?.close(resolve));
});

async function request(path, personId, method = 'GET', body) {
  const response = await fetch(`${base}/api/v1/${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokens[personId]}` },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  return { response, data: response.status === 204 ? null : await response.json() };
}

test('服务端以当前制度规则生成提交快照，并拒绝客户端伪造或改写历史快照', async () => {
  const monthPolicy = await request('branches/br-b1/config', 'p13', 'PATCH', {
    config: { policyOverrides: { archive: { periodic: { unit: 'month' } } } },
  });
  assert.equal(monthPolicy.response.status, 200);
  const version = monthPolicy.data.config.periodicArchiveVersion;

  const submitted = await request('weeklyReports', 'p12', 'POST', {
    id: 'wr-policy-api', branchId: 'br-b1', week: '客户端自填', weekRange: '2026-10-01 ~ 2026-10-31',
    status: 'submitted', submittedAt: '2026-11-03', content: '归档内容',
    archivePolicySnapshot: { unit: 'week', version: 999, periodLabel: '伪造' },
  });
  assert.equal(submitted.response.status, 201);
  assert.deepEqual(submitted.data.archivePolicySnapshot, {
    id: 'branch-periodic-archive', version, unit: 'month',
    periodKey: '2026-10', periodLabel: '2026年10月', periodRange: '2026-10-01 ~ 2026-10-31',
  });

  const changedPolicy = await request('branches/br-b1/config', 'p13', 'PATCH', {
    config: { policyOverrides: { archive: { periodic: { unit: 'week' } } } },
  });
  assert.equal(changedPolicy.response.status, 200);
  const edited = await request('weeklyReports/wr-policy-api', 'p12', 'PATCH', {
    content: '编辑正文',
    archivePolicySnapshot: { unit: 'week', version: 500, periodLabel: '再次伪造' },
  });
  assert.equal(edited.response.status, 200);
  assert.deepEqual(edited.data.archivePolicySnapshot, submitted.data.archivePolicySnapshot);
});
