import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../app.js';
import { seedDatabase } from '../seed.js';

let server;
let base;
let db;
const tokens = {};

before(async () => {
  const app = createApp({ dbPath: ':memory:' });
  await seedDatabase(app.locals.db);
  db = app.locals.db;
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

test('通用周期归档 API 与旧周报入口读写同一份提交记录', async () => {
  const submitted = await request('periodicArchives', 'p12', 'POST', {
    id: 'periodic-api-compat', branchId: 'br-b1', status: 'submitted', submittedAt: '2026-11-04',
    periodKey: '2026-11', periodLabel: '2026年11月', periodRange: '2026-11-01 ~ 2026-11-30', content: '通用归档内容',
  });
  assert.equal(submitted.response.status, 201);
  assert.equal(submitted.data.periodLabel, '2026年11月');

  const legacyList = await request('weeklyReports', 'p12');
  assert.equal(legacyList.response.status, 200);
  assert.ok(legacyList.data.some((row) => row.id === 'periodic-api-compat'));

  const edited = await request('weeklyReports/periodic-api-compat', 'p12', 'PATCH', { content: '通过旧入口更新' });
  assert.equal(edited.response.status, 200);
  const canonicalList = await request('periodicArchives', 'p12');
  assert.equal(canonicalList.response.status, 200);
  assert.equal(canonicalList.data.find((row) => row.id === 'periodic-api-compat').content, '通过旧入口更新');
});

test('周期归档 PATCH 拒绝用 null 或空支部归属绕过不可变校验', async () => {
  const p13Row = db.prepare('SELECT data FROM users WHERE id = ?').get('p13');
  const p13 = JSON.parse(p13Row.data);
  db.prepare('UPDATE users SET data = ? WHERE id = ?')
    .run(JSON.stringify({ ...p13, branchId: 'br-b2' }), 'p13');
  const insert = db.prepare('INSERT INTO periodic_archive_submissions (id, data) VALUES (?, ?)');
  for (const id of ['pa-branch-null', 'pa-branch-empty']) {
    insert.run(id, JSON.stringify({ id, branchId: 'br-b2', status: 'draft', content: 'other branch' }));
  }

  try {
    for (const [id, branchId] of [['pa-branch-null', null], ['pa-branch-empty', '']]) {
      const edited = await request(`periodicArchives/${id}`, 'p13', 'PATCH', { branchId });
      assert.equal(edited.response.status, 403);
      assert.equal(JSON.parse(db.prepare('SELECT data FROM periodic_archive_submissions WHERE id = ?').get(id).data).branchId, 'br-b2');
    }
  } finally {
    db.prepare('UPDATE users SET data = ? WHERE id = ?').run(p13Row.data, 'p13');
  }
});

test('旧周报快照集合名写入同一周期归档表并沿用集合版本锁', async () => {
  const baseline = await request('snapshot/versions', 'p12');
  assert.equal(baseline.data.versions.weeklyReports, baseline.data.versions.periodicArchives);
  const submitted = await request('snapshot', 'p12', 'POST', {
    _versions: { weeklyReports: baseline.data.versions.weeklyReports },
    weeklyReports: [{
      id: 'legacy-weekly-snapshot', branchId: 'br-b1', status: 'draft',
      week: '2026-W42', weekRange: '2026-10-12 ~ 2026-10-18', content: '旧客户端快照内容',
    }],
  });
  assert.equal(submitted.response.status, 200);
  const archives = await request('periodicArchives', 'p12');
  assert.equal(archives.response.status, 200);
  assert.equal(archives.data.find((row) => row.id === 'legacy-weekly-snapshot').content, '旧客户端快照内容');

  const ambiguous = await request('snapshot', 'p12', 'POST', {
    _versions: { periodicArchives: submitted.data.versions.periodicArchives },
    weeklyReports: [], periodicArchives: [],
  });
  assert.equal(ambiguous.response.status, 400);
});

test('活动归档专用 API 可以正常归档本支部活动', async () => {
  const archived = await request('activities/act-36/archive', 'p13', 'POST');
  assert.equal(archived.response.status, 200);
  assert.equal(archived.data.archived, true);
});
