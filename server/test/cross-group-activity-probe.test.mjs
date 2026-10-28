// 跨组活动余项聚焦 probe（2026-10-21 · B-499-1）
// ════════════════════════════════════════════════════════════════
// 一条链走完「跨组活动 → 责任党小组 → 跨组深参 → 组织委员协调」：
//   ① 支书创建跨组活动：承办组 pg-1 必填、组织落点恒为 party-group，工作组 hostGroupId 同步；
//   ② 未标记 recruitmentScope 时，第二党小组深参入组 ⇒ 403（文案指向组织委员协调）；
//   ③ 同一活动（另建带标记）带 recruitmentScope='cross-group' + 协调人 ⇒ 深参 201，
//      成员行与活动镜像写 crossGroup/coordinatedBy；
//   ④ 组织委员 coordinate complete ⇒ 200，工作组与成员行留协调状态；reset ⇒ 200；
//   ⑤ 未标记活动 coordinate ⇒ 409；普通成员 coordinate ⇒ 403；
//   ⑥ mock 适配器走同一链路，确认 API / mock 的错误文案与写入结构同口径。
// 口径源：server/routes/resources/workgroup-routes.js（activityCreationDeny / validAssignments /
//   POST /workgroups/:id/coordinate）与 docs/src/data/mock-adapter.js。
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';

// ── localStorage 内存桩（mock 适配器持久化 / 协调人身份读取需要）──
function makeStorage(init = {}) {
  const m = new Map(Object.entries(init).map(([k, v]) => [String(k), String(v)]));
  return {
    getItem: (k) => (m.has(String(k)) ? m.get(String(k)) : null),
    setItem: (k, v) => m.set(String(k), String(v)),
    removeItem: (k) => { m.delete(String(k)); },
    clear: () => { m.clear(); },
    key: (i) => [...m.keys()][i] ?? null,
    get length() { return m.size; },
  };
}
const storage = makeStorage();
globalThis.localStorage = storage;

import { createApp } from '../app.js';
import { seedDatabase } from '../seed.js';
import { mockDB } from '../../docs/src/core/domain/domain.js?v=20261028e';
import { MockAdapter } from '../../docs/src/data/mock-adapter.js?v=20261028e';
import { PEOPLE } from '../../docs/src/data/mock/people.js?v=20261028e';
import { PARTY_GROUPS } from '../../docs/src/data/mock/party-groups.js?v=20261028e';

const SECRETARY = '2300010001';
const ORG_COMMISSIONER = '2400012355';
const PG2_MEMBER = '2400012349'; // 宋佳宁 · 第二党小组
const HOST_GROUP = 'pg-1';       // 第一党小组

let server, base, db;
const tokens = {};

before(async () => {
  const app = createApp({ dbPath: ':memory:' });
  await seedDatabase(app.locals.db);
  db = app.locals.db;
  server = app.listen(0);
  base = `http://127.0.0.1:${server.address().port}`;
  for (const id of [SECRETARY, ORG_COMMISSIONER, PG2_MEMBER]) {
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

const workgroupRow = (id) => JSON.parse(db.prepare('SELECT data FROM workgroups WHERE id = ?').get(id)?.data || 'null');
const memberRow = (workgroupId, personId) => JSON.parse(db.prepare('SELECT data FROM workgroup_members WHERE id = ?')
  .get(`wgm-${encodeURIComponent(workgroupId)}-${encodeURIComponent(personId)}`)?.data || 'null');

function activityBody({ title, marked = false }) {
  return {
    title, type: '主题党日', date: '2026-10-31',
    organizingScope: 'party-group', hostGroupId: HOST_GROUP, hostGroup: '第一党小组', createdBy: SECRETARY,
    ...(marked ? { recruitmentScope: 'cross-group', crossGroupCoordinatorId: ORG_COMMISSIONER } : {}),
    assignments: [{ personId: SECRETARY, role: 'organizer' }],
  };
}

test('API：跨组活动责任组 → 深参门 → 组织委员协调 完整链', async () => {
  // ① 支书创建跨组活动，责任组 pg-1
  const plain = await request('activities', SECRETARY, 'POST', activityBody({ title: 'probe-未标记跨组招募' }));
  assert.equal(plain.status, 201, JSON.stringify(plain.data));
  assert.equal(plain.data.organizingScope, 'party-group');
  assert.equal(plain.data.hostGroupId, HOST_GROUP);
  const plainGroup = workgroupRow(plain.data.workgroupId);
  assert.equal(plainGroup.hostGroupId, HOST_GROUP, '工作组必须同步责任党小组');
  assert.equal(plainGroup.recruitmentScope, 'group');

  // ② 同支部第二党小组深参，未标记招募 ⇒ 403
  const denied = await request(`workgroups/${plain.data.workgroupId}/members`, SECRETARY, 'POST', {
    personId: PG2_MEMBER, role: 'deep',
  });
  assert.equal(denied.status, 403);
  assert.match(denied.data.error, /组织委员协调/);

  // ③ 带 recruitmentScope + 协调人的活动 ⇒ 深参入组 201，行上留跨组标记
  const marked = await request('activities', SECRETARY, 'POST', activityBody({ title: 'probe-已标记跨组招募', marked: true }));
  assert.equal(marked.status, 201, JSON.stringify(marked.data));
  const markedGroup = workgroupRow(marked.data.workgroupId);
  assert.equal(markedGroup.recruitmentScope, 'cross-group');
  assert.equal(markedGroup.crossGroupCoordinatorId, ORG_COMMISSIONER);

  const added = await request(`workgroups/${marked.data.workgroupId}/members`, SECRETARY, 'POST', {
    personId: PG2_MEMBER, role: 'deep',
  });
  assert.equal(added.status, 201, JSON.stringify(added.data));
  assert.equal(added.data.crossGroup, true);
  assert.equal(added.data.coordinatedBy, ORG_COMMISSIONER);
  const mirrored = JSON.parse(db.prepare('SELECT data FROM activities WHERE id = ?').get(marked.data.id).data)
    .assignments.find((row) => row.personId === PG2_MEMBER);
  assert.equal(mirrored.crossGroup, true, '活动镜像须与成员主源同形');

  // ④ 组织委员标记协调完成 / 撤销
  const completed = await request(`workgroups/${marked.data.workgroupId}/coordinate`, ORG_COMMISSIONER, 'POST', { action: 'complete' });
  assert.equal(completed.status, 200, JSON.stringify(completed.data));
  assert.equal(completed.data.workgroup.crossGroupCoordinatedBy, ORG_COMMISSIONER);
  assert.ok(completed.data.workgroup.crossGroupCoordinatedAt);
  const coordinatedMember = memberRow(marked.data.workgroupId, PG2_MEMBER);
  assert.equal(coordinatedMember.crossGroup, true);
  assert.equal(coordinatedMember.coordinatedBy, ORG_COMMISSIONER);
  assert.ok(coordinatedMember.coordinatedAt);

  const reset = await request(`workgroups/${marked.data.workgroupId}/coordinate`, ORG_COMMISSIONER, 'POST', { action: 'reset' });
  assert.equal(reset.status, 200);
  assert.equal(reset.data.workgroup.crossGroupCoordinatedBy, null);
  assert.equal(reset.data.workgroup.crossGroupCoordinatedAt, null);
  const resetMember = memberRow(marked.data.workgroupId, PG2_MEMBER);
  assert.equal(resetMember.coordinatedBy, ORG_COMMISSIONER, '撤销后回落到协调人，不丢跨组关系');
  assert.equal(resetMember.coordinatedAt, null, '撤销后不得残留完成时间');

  // ⑤ 未标记活动无需协调 ⇒ 409；普通成员无协调资格 ⇒ 403
  const notNeeded = await request(`workgroups/${plain.data.workgroupId}/coordinate`, ORG_COMMISSIONER, 'POST', { action: 'complete' });
  assert.equal(notNeeded.status, 409);
  assert.match(notNeeded.data.error, /未标记跨组招募/);

  const normalMember = await request(`workgroups/${marked.data.workgroupId}/coordinate`, PG2_MEMBER, 'POST', { action: 'complete' });
  assert.equal(normalMember.status, 403);
});

test('mock：同一链路的结构与拒绝文案必须与 API 同口径', async () => {
  mockDB.users = PEOPLE.map((row) => ({ ...row }));
  mockDB.partyGroups = PARTY_GROUPS.map((row) => ({ ...row }));
  mockDB.activities = [];
  mockDB.workgroups = [];
  mockDB.workgroupMembers = [];
  localStorage.setItem('gsm1921-login-user', JSON.stringify({ personId: ORG_COMMISSIONER }));

  // ① 未标记活动：创建成功；第二党小组深参被拒
  const plain = await MockAdapter.activities.create(activityBody({ title: 'probe-mock-未标记' }));
  const plainGroup = mockDB.workgroups.find((row) => row.id === plain.workgroupId);
  assert.equal(plainGroup.hostGroupId, HOST_GROUP);
  assert.equal(plainGroup.recruitmentScope, 'group');
  await assert.rejects(
    () => MockAdapter.workgroups.members.add(plain.workgroupId, { personId: PG2_MEMBER, role: 'deep' }),
    (error) => error?.type === 'PermissionError' && /组织委员协调/.test(error.message),
  );

  // ② 标记活动：深参入组写 crossGroup/coordinatedBy
  const marked = await MockAdapter.activities.create(activityBody({ title: 'probe-mock-已标记', marked: true }));
  const added = await MockAdapter.workgroups.members.add(marked.workgroupId, { personId: PG2_MEMBER, role: 'deep' });
  assert.equal(added.crossGroup, true);
  assert.equal(added.coordinatedBy, ORG_COMMISSIONER);

  // ③ 协调 complete / reset
  const completed = await MockAdapter.workgroups.coordinate(marked.workgroupId, { action: 'complete' });
  assert.equal(completed.workgroup.crossGroupCoordinatedBy, ORG_COMMISSIONER);
  assert.ok(completed.workgroup.crossGroupCoordinatedAt);
  const coordinatedMember = mockDB.workgroupMembers.find((row) => row.workgroupId === marked.workgroupId && row.personId === PG2_MEMBER);
  assert.equal(coordinatedMember.coordinatedBy, ORG_COMMISSIONER);
  assert.ok(coordinatedMember.coordinatedAt);

  const reset = await MockAdapter.workgroups.coordinate(marked.workgroupId, { action: 'reset' });
  assert.equal(reset.workgroup.crossGroupCoordinatedBy, null);
  assert.equal(reset.workgroup.crossGroupCoordinatedAt, null);

  // ④ 未标记活动 ⇒ ConflictError（与 API 409 同文案）
  await assert.rejects(
    () => MockAdapter.workgroups.coordinate(plain.workgroupId, { action: 'complete' }),
    (error) => error?.type === 'ConflictError' && /未标记跨组招募/.test(error.message),
  );

  // ⑤ 普通成员无协调资格 ⇒ PermissionError（与 API 403 同文案）
  localStorage.setItem('gsm1921-login-user', JSON.stringify({ personId: PG2_MEMBER }));
  await assert.rejects(
    () => MockAdapter.workgroups.coordinate(marked.workgroupId, { action: 'complete' }),
    (error) => error?.type === 'PermissionError' && /组织委员/.test(error.message),
  );
});
