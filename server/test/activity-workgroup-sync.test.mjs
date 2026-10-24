// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  server/test/activity-workgroup-sync.test.mjs — 活动 ↔ 工作组同事务同步（R9 Task 4.3）
// ════════════════════════════════════════════════════════════════
// 判据：
//   S1 服务端：创建活动 → 工作组字段由活动投影（name/organizingScope/hostGroupId/recruitmentScope）；
//   S2 服务端：PATCH 改名 → 工作组 name 同步（首页 / 组织台读到的就是新名）；
//   S3 服务端：归档 → 工作组 status='archived'，成员 / 任务 / 产出写口一律拒绝；
//   S4 服务端：删除活动 → 工作组随之移除；
//   M1 mock 形态：updateActivity 改名 / archiveActivity 归档 / deleteActivity 删除 同步工作组与首页缓存。
// 运行：node --test test/activity-workgroup-sync.test.mjs（server 目录）
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';

function makeStorage() {
  const store = new Map();
  return {
    getItem: (key) => (store.has(String(key)) ? store.get(String(key)) : null),
    setItem: (key, value) => store.set(String(key), String(value)),
    removeItem: (key) => { store.delete(String(key)); },
    clear: () => store.clear(),
    key: (index) => [...store.keys()][index] ?? null,
    get length() { return store.size; },
  };
}
globalThis.localStorage = makeStorage();
globalThis.sessionStorage = makeStorage();

import { createApp } from '../app.js';
import { seedDatabase } from '../seed.js';
import { mockDB } from '../../docs/src/core/domain/domain.js?v=20261024c';
import { MockAdapter } from '../../docs/src/data/mock-adapter.js?v=20261024c';
import { registerMockAdapter, setDataSource } from '../../docs/src/data/data-adapter.js?v=20261024c';
import { BranchService } from '../../docs/src/services/core/runtime.js?v=20261024c';

let server, base, db;
const tokens = {};

before(async () => {
  const app = createApp({ dbPath: ':memory:' });
  await seedDatabase(app.locals.db);
  db = app.locals.db;
  server = app.listen(0);
  base = `http://127.0.0.1:${server.address().port}`;
  for (const id of ['2400012345', '2300010001', '2400012355']) {
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
  const contentType = response.headers.get('content-type') || '';
  const data = response.status === 204 ? null : contentType.includes('application/json') ? await response.json() : await response.text();
  return { response, data };
}

async function createActivity(personId, payload = {}) {
  return request('activities', personId, 'POST', {
    title: 'R9 同步测试活动', type: '党小组会', date: '2026-11-01', status: 'planned', branchId: 'br-b1',
    organizingScope: 'party-group', hostGroupId: 'pg-1', hostGroup: '第一党小组',
    recruitmentScope: 'cross-group', crossGroupCoordinatorId: '2400012355',
    assignments: [{ personId: '2400012345', role: 'organizer' }],
    ...payload,
  });
}

const workgroupOf = (id) => JSON.parse(db.prepare('SELECT data FROM workgroups WHERE id = ?').get(id).data);

test('S1/S2 创建与 PATCH 改名：工作组字段随活动投影同源', async () => {
  const created = await createActivity('2400012345');
  assert.equal(created.response.status, 201);
  const workgroupId = created.data.workgroupId || `wg-activity-${created.data.id}`;
  const beforeGroup = workgroupOf(workgroupId);
  assert.equal(beforeGroup.name, 'R9 同步测试活动');
  assert.equal(beforeGroup.organizingScope, 'party-group');
  assert.equal(beforeGroup.hostGroupId, 'pg-1');
  assert.equal(beforeGroup.recruitmentScope, 'cross-group');
  assert.equal(beforeGroup.crossGroupCoordinatorId, '2400012355');

  const renamed = await request(`activities/${created.data.id}`, '2400012345', 'PATCH', { title: 'R9 改名后的活动' });
  assert.equal(renamed.response.status, 200);
  const afterGroup = workgroupOf(workgroupId);
  assert.equal(afterGroup.name, 'R9 改名后的活动', '改名后工作组 name 必须同步（首页 / 组织台读的就是它）');
  assert.equal(afterGroup.organizingScope, 'party-group');
  assert.equal(afterGroup.status, 'active', '普通编辑不得改变工作组状态');
});

test('S3 归档：工作组置 archived，成员 / 任务 / 产出写口拒绝', async () => {
  const created = await createActivity('2400012345', { title: 'R9 归档同步活动' });
  assert.equal(created.response.status, 201);
  const workgroupId = created.data.workgroupId || `wg-activity-${created.data.id}`;

  const archived = await request(`activities/${created.data.id}/archive`, '2400012345', 'POST');
  assert.equal(archived.response.status, 200);
  assert.equal(archived.data.archived, true);
  assert.equal(workgroupOf(workgroupId).status, 'archived', '归档活动的工作组必须 archived');

  const addMember = await request(`workgroups/${workgroupId}/members`, '2400012345', 'POST', { personId: '2400012352', role: 'deep' });
  assert.equal(addMember.response.status, 409);
  const addTask = await request(`workgroups/${workgroupId}/tasks`, '2400012345', 'POST', { title: '归档后不得加任务' });
  assert.equal(addTask.response.status, 409);
  const addOutput = await request(`workgroups/${workgroupId}/outputs`, '2400012345', 'POST', { title: '归档后不得加产出' });
  assert.equal(addOutput.response.status, 409);
});

test('S4 删除活动：工作组随之移除', async () => {
  const created = await createActivity('2400012345', { title: 'R9 删除同步活动' });
  assert.equal(created.response.status, 201);
  const workgroupId = created.data.workgroupId || `wg-activity-${created.data.id}`;
  assert.ok(db.prepare('SELECT id FROM workgroups WHERE id = ?').get(workgroupId));

  const removed = await request(`activities/${created.data.id}`, '2400012345', 'DELETE');
  assert.equal(removed.response.status, 200);
  assert.equal(db.prepare('SELECT id FROM workgroups WHERE id = ?').get(workgroupId), undefined, '活动删除后工作组不得残留');
});

test('M1 mock 形态：改名 / 归档 / 删除同步工作组缓存', async () => {
  registerMockAdapter(MockAdapter);
  setDataSource('mock');
  mockDB._loaded = false;
  MockAdapter.loadDB();

  const created = await BranchService.createActivity({
    title: 'mock 同步活动', type: '党小组会', date: '2026-11-02', status: 'planned', branchId: 'br-b1',
    organizingScope: 'party-group', hostGroupId: 'pg-1', hostGroup: '第一党小组',
    organizer: '2400012345', createdBy: '2400012345', assignments: [{ personId: '2400012345', role: 'organizer' }],
  });
  const workgroupId = `wg-activity-${created.id}`;
  assert.equal(mockDB.workgroups.find((row) => row.id === workgroupId)?.name, 'mock 同步活动');

  await BranchService.updateActivity(created.id, { title: 'mock 改名活动' });
  assert.equal(mockDB.workgroups.find((row) => row.id === workgroupId)?.name, 'mock 改名活动', '首页读 workgroups.name ⇒ 必须同步');

  await BranchService.archiveActivity(created.id);
  assert.equal(mockDB.workgroups.find((row) => row.id === workgroupId)?.status, 'archived');

  const second = await BranchService.createActivity({
    title: 'mock 待删活动', type: '党小组会', date: '2026-11-03', status: 'planned', branchId: 'br-b1',
    organizingScope: 'party-group', hostGroupId: 'pg-1', hostGroup: '第一党小组',
    organizer: '2400012345', createdBy: '2400012345', assignments: [{ personId: '2400012345', role: 'organizer' }],
  });
  const secondGroupId = `wg-activity-${second.id}`;
  mockDB.workgroupTasks = [...mockDB.workgroupTasks, {
    id: 'wgt-mock-delete', workgroupId: secondGroupId, title: '删除前进度任务', status: 'open',
  }];
  await BranchService.deleteActivity(second.id);
  assert.equal(mockDB.workgroups.some((row) => row.id === secondGroupId), false);
  assert.equal(mockDB.workgroupTasks.some((row) => row.id === 'wgt-mock-delete'), false);
});
