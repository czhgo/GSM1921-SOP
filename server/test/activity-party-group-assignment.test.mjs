// 跨组活动的党小组落实（2026-10-21 批次 499 · 支书补充口径）
//   ① 所有非支部级活动必须有唯一责任党小组；cross-group 不再等于 hostGroupId=null
//   ② 支委会 / 党员大会 / 党课单列 branch；旧客户端不传 scope 时按 type 推断
//   ③ 历史 legacyHostGroup 行只能由支书/副书记或组织委员补选责任组，且组织委员只能改落点三字段
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../app.js';
import { seedDatabase } from '../seed.js';

let server, base, db;
const tokens = {};

before(async () => {
  const app = createApp({ dbPath: ':memory:' });
  await seedDatabase(app.locals.db);
  db = app.locals.db;
  server = app.listen(0);
  base = `http://127.0.0.1:${server.address().port}`;
  for (const id of ['2400012345', '2400012346', '2300010001', '2300010002', '2400012355', '2400012349']) {
    const response = await fetch(`${base}/api/v1/auth/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ personId: id, password: '123456' }),
    });
    assert.equal(response.status, 200);
    tokens[id] = (await response.json()).token;
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
  const data = response.status === 204 ? null : await response.json();
  return { status: response.status, data };
}

const activityRow = (id) => JSON.parse(db.prepare('SELECT data FROM activities WHERE id = ?').get(id)?.data || 'null');
const workgroupRow = (id) => JSON.parse(db.prepare('SELECT data FROM workgroups WHERE id = ?').get(id)?.data || 'null');

test('支书创建跨组活动必须选择责任党小组；未选拒绝且文案可懂', async () => {
  const missing = await request('activities', '2300010001', 'POST', {
    title: '跨组无责任组', type: '主题党日', date: '2026-10-25',
    organizingScope: 'cross-group', hostGroupId: null, assignments: [],
  });
  assert.equal(missing.status, 403);
  assert.match(missing.data.error, /责任党小组/);

  const ok = await request('activities', '2300010001', 'POST', {
    title: '跨组有责任组', type: '主题党日', date: '2026-10-25',
    organizingScope: 'cross-group', hostGroupId: 'pg-2', hostGroup: '第二党小组', assignments: [],
  });
  assert.equal(ok.status, 201);
  assert.equal(ok.data.hostGroupId, 'pg-2');
  const workgroup = workgroupRow(ok.data.workgroupId);
  assert.equal(workgroup.organizingScope, 'cross-group');
  assert.equal(workgroup.hostGroupId, 'pg-2');
});

test('组内活动责任组固定本组：组长不能把本组活动挂到其他党小组', async () => {
  const wrong = await request('activities', '2400012345', 'POST', {
    title: '组长挂错组', type: '党小组会', date: '2026-10-25',
    organizingScope: 'party-group', hostGroupId: 'pg-2', hostGroup: '第二党小组', assignments: [],
  });
  assert.equal(wrong.status, 403);
  assert.match(wrong.data.error, /本党小组|责任党小组|组内/);
});

test('支部级法定会议单列 branch：不指定责任组；旧客户端不传 scope 时按 type 推断', async () => {
  const withGroup = await request('activities', '2300010001', 'POST', {
    title: '支委会误挂党小组', type: '支委会', date: '2026-10-25',
    organizingScope: 'branch', hostGroupId: 'pg-1', assignments: [],
  });
  assert.equal(withGroup.status, 403);
  assert.match(withGroup.data.error, /不指定责任党小组/);

  const legacyClient = await request('activities', '2300010001', 'POST', {
    title: '旧客户端支委会', type: '支委会', date: '2026-10-25', assignments: [],
  });
  assert.equal(legacyClient.status, 201);
  assert.equal(legacyClient.data.organizingScope, 'branch');
  assert.equal(legacyClient.data.hostGroupId, null);
});

test('历史 legacyHostGroup 只能补选责任组；组织委员仅可改落点三字段', async () => {
  const legacyId = 'act-legacy-host-499';
  db.prepare('INSERT INTO activities (id, data) VALUES (?, ?)').run(legacyId, JSON.stringify({
    id: legacyId, title: '历史跨组活动', type: '主题党日', date: '2026-09-01',
    branchId: 'br-b1', organizingScope: 'cross-group', hostGroupId: null, legacyHostGroup: true,
    assignments: [], createdBy: '2300010001', workgroupId: `wg-activity-${legacyId}`,
  }));
  db.prepare('INSERT INTO workgroups (id, data) VALUES (?, ?)').run(`wg-activity-${legacyId}`, JSON.stringify({
    id: `wg-activity-${legacyId}`, branchId: 'br-b1', kind: 'activity', sourceType: 'activity', sourceId: legacyId,
    name: '历史跨组活动', status: 'active', organizingScope: 'cross-group', hostGroupId: null,
    migrationState: 'pending-review', createdBy: '2300010001', createdAt: '2026-09-01T00:00:00.000Z',
  }));

  const editable = await request(`activities/${legacyId}`, '2400012355', 'PATCH', {
    hostGroupId: 'pg-3', hostGroup: '第三党小组', organizingScope: 'cross-group',
  });
  assert.equal(editable.status, 200, JSON.stringify(editable.data));
  const updated = activityRow(legacyId);
  assert.equal(updated.hostGroupId, 'pg-3');
  assert.equal(updated.legacyHostGroup, undefined, '补选后清除历史标记');
  assert.equal(workgroupRow(`wg-activity-${legacyId}`).hostGroupId, 'pg-3', '工作组同步责任组');
  assert.equal(workgroupRow(`wg-activity-${legacyId}`).migrationState, 'ready');

  // 组织委员不得借补选之名改其他字段
  const secondLegacy = 'act-legacy-host-499b';
  db.prepare('INSERT INTO activities (id, data) VALUES (?, ?)').run(secondLegacy, JSON.stringify({
    id: secondLegacy, title: '历史跨组活动乙', type: '主题党日', date: '2026-09-02',
    branchId: 'br-b1', organizingScope: 'cross-group', hostGroupId: null, legacyHostGroup: true,
    assignments: [], createdBy: '2300010001',
  }));
  const overreach = await request(`activities/${secondLegacy}`, '2400012355', 'PATCH', {
    hostGroupId: 'pg-1', hostGroup: '第一党小组', status: 'completed',
  });
  assert.equal(overreach.status, 403);
  assert.match(overreach.data.error, /只能修改组织落点/);
});

test('非历史记录的承办范围创建后仍不可改', async () => {
  const created = await request('activities', '2300010001', 'POST', {
    title: '普通跨组活动', type: '主题党日', date: '2026-10-26',
    organizingScope: 'cross-group', hostGroupId: 'pg-1', hostGroup: '第一党小组', assignments: [],
  });
  assert.equal(created.status, 201);
  const changed = await request(`activities/${created.data.id}`, '2300010001', 'PATCH', {
    hostGroupId: 'pg-2', hostGroup: '第二党小组',
  });
  assert.equal(changed.status, 400);
  assert.match(changed.data.error, /不可修改/);
});
