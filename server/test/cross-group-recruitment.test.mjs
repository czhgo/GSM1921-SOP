// 跨组深度参与者与组织委员协调（2026-10-21 批次 499）
//   ① 跨党小组深参必须有 recruitmentScope='cross-group' + 协调人，否则拒绝且文案可懂
//   ② 通过后成员行写 crossGroup/coordinatedBy；活动镜像同步
//   ③ 组织委员可在协调面标记完成 / 撤销；协调动作不改成员关系，也不获得活动写权
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
  for (const id of ['2300010001', '2300010002', '2400012355', '2400012345', '2400012349']) {
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

const memberRow = (workgroupId, personId) => JSON.parse(db.prepare('SELECT data FROM workgroup_members WHERE id = ?')
  .get(`wgm-${encodeURIComponent(workgroupId)}-${encodeURIComponent(personId)}`)?.data || 'null');
const workgroupRow = (id) => JSON.parse(db.prepare('SELECT data FROM workgroups WHERE id = ?').get(id)?.data || 'null');

test('跨党小组深参未标记跨组招募 ⇒ 拒绝；标记并指定协调人 ⇒ 落 crossGroup/coordinatedBy', async () => {
  const denied = await request('activities', '2300010001', 'POST', {
    title: '跨组深参未协调', type: '主题党日', date: '2026-10-25',
    organizingScope: 'cross-group', hostGroupId: 'pg-1', hostGroup: '第一党小组',
    assignments: [{ personId: '2300010001', role: 'organizer' }, { personId: '2400012349', role: 'deep' }],
  });
  assert.equal(denied.status, 403);
  assert.match(denied.data.error, /组织委员协调/);

  const ok = await request('activities', '2300010001', 'POST', {
    title: '跨组深参已协调', type: '主题党日', date: '2026-10-26',
    organizingScope: 'cross-group', hostGroupId: 'pg-1', hostGroup: '第一党小组',
    recruitmentScope: 'cross-group', crossGroupCoordinatorId: '2400012355',
    assignments: [{ personId: '2300010001', role: 'organizer' }, { personId: '2400012349', role: 'deep' }],
  });
  assert.equal(ok.status, 201, JSON.stringify(ok.data));
  const workgroup = workgroupRow(ok.data.workgroupId);
  assert.equal(workgroup.recruitmentScope, 'cross-group');
  assert.equal(workgroup.crossGroupCoordinatorId, '2400012355');
  const deep = memberRow(ok.data.workgroupId, '2400012349');
  assert.equal(deep.crossGroup, true);
  assert.equal(deep.coordinatedBy, '2400012355');
  const activity = JSON.parse(db.prepare('SELECT data FROM activities WHERE id = ?').get(ok.data.id).data);
  const mirrored = activity.assignments.find((row) => row.personId === '2400012349');
  assert.equal(mirrored.crossGroup, true);
});

test('单加跨组深参同样受招募标记约束；标记后写入跨组字段', async () => {
  const plain = await request('activities', '2300010001', 'POST', {
    title: '未标记跨组招募的活动', type: '主题党日', date: '2026-10-27',
    organizingScope: 'cross-group', hostGroupId: 'pg-1', hostGroup: '第一党小组',
    assignments: [{ personId: '2300010001', role: 'organizer' }],
  });
  assert.equal(plain.status, 201);
  const denied = await request(`workgroups/${plain.data.workgroupId}/members`, '2300010001', 'POST', {
    personId: '2400012349', role: 'deep',
  });
  assert.equal(denied.status, 403);
  assert.match(denied.data.error, /组织委员协调/);

  const marked = await request('activities', '2300010001', 'POST', {
    title: '已标记跨组招募的活动', type: '主题党日', date: '2026-10-28',
    organizingScope: 'cross-group', hostGroupId: 'pg-1', hostGroup: '第一党小组',
    recruitmentScope: 'cross-group', crossGroupCoordinatorId: '2400012355',
    assignments: [{ personId: '2300010001', role: 'organizer' }],
  });
  assert.equal(marked.status, 201);
  const added = await request(`workgroups/${marked.data.workgroupId}/members`, '2300010001', 'POST', {
    personId: '2400012349', role: 'deep',
  });
  assert.equal(added.status, 201, JSON.stringify(added.data));
  assert.equal(added.data.crossGroup, true);
  assert.equal(added.data.coordinatedBy, '2400012355');
});

test('组织委员标记协调完成 / 撤销；不获得活动写权，未标记活动不出现协调动作', async () => {
  const created = await request('activities', '2300010001', 'POST', {
    title: '待协调的跨组活动', type: '主题党日', date: '2026-10-29',
    organizingScope: 'cross-group', hostGroupId: 'pg-1', hostGroup: '第一党小组',
    recruitmentScope: 'cross-group', crossGroupCoordinatorId: '2400012355',
    assignments: [{ personId: '2300010001', role: 'organizer' }, { personId: '2400012349', role: 'deep' }],
  });
  assert.equal(created.status, 201);

  const orgCannotEdit = await request(`activities/${created.data.id}`, '2400012355', 'PATCH', { title: '组织委员改活动' });
  assert.equal(orgCannotEdit.status, 403, '协调身份不授予活动写权');

  const completed = await request(`workgroups/${created.data.workgroupId}/coordinate`, '2400012355', 'POST', { action: 'complete' });
  assert.equal(completed.status, 200, JSON.stringify(completed.data));
  assert.equal(completed.data.workgroup.crossGroupCoordinatedBy, '2400012355');
  assert.ok(completed.data.workgroup.crossGroupCoordinatedAt);
  const coordinatedMember = completed.data.members.find((row) => row.personId === '2400012349');
  assert.equal(coordinatedMember.coordinatedBy, '2400012355');

  const reset = await request(`workgroups/${created.data.workgroupId}/coordinate`, '2400012355', 'POST', { action: 'reset' });
  assert.equal(reset.status, 200);
  assert.equal(reset.data.workgroup.crossGroupCoordinatedBy, null);

  const plain = await request('activities', '2300010001', 'POST', {
    title: '无需协调的活动', type: '主题党日', date: '2026-10-30',
    organizingScope: 'cross-group', hostGroupId: 'pg-1', hostGroup: '第一党小组', assignments: [],
  });
  assert.equal(plain.status, 201);
  const notNeeded = await request(`workgroups/${plain.data.workgroupId}/coordinate`, '2400012355', 'POST', { action: 'complete' });
  assert.equal(notNeeded.status, 409);
  assert.match(notNeeded.data.error, /未标记跨组招募/);

  const normalMember = await request(`workgroups/${created.data.workgroupId}/coordinate`, '2400012349', 'POST', { action: 'complete' });
  assert.equal(normalMember.status, 403);
});
