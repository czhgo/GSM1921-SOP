// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  server/test/activity-creation-transaction.test.mjs
//  Phase 0 · R4-D02：活动创建事务（mock 写口）
//
//  立据：主写入链 `writeActivityWithSOP → BranchService.createActivity` 此前在 mock 形态
//  只写活动本身（activities），不生成 `workgroupId` / `workgroups` / `workgroupMembers`；
//  工作组要等下次 `loadDB` 的 seed-sync 才补齐 ⇒ 本会话内活动详情按 `wg-activity-<id>`
//  读不到工作组、后续赋权（/workgroups/<id>/grants）因工作组不存在而失败。
//  服务端 `POST /activities` 走 `createActivityWorkgroup` 同步建组 ⇒ mock 写口须同口径。
//
//  判据：
//   T1 mock 形态经 `BranchService.createActivity` 创建 ⇒ workgroups / workgroupMembers 立即存在，
//      且按 `wg-activity-<id>` 能读到；赋权写口（grants.create）不落空。
//   T2 `writeActivityWithSOP` 创建活动后，本会话内同样读得到工作组，组织者/深度参与者成员正确。
//   T3 刷新（`MockAdapter.loadDB`）不重复建组、不重复成员（幂等）。
//
//  运行：`cd server && node --test test/activity-creation-transaction.test.mjs`
//  ⚠ 对 docs/src 的相对 import 必须带与源码一致的 `?v=` query（模块缓存键一致性）。
// ════════════════════════════════════════════════════════════════
import { test, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';

// ── localStorage / sessionStorage 内存桩（mock 持久化链需要；照 mock-api-parity 同款）──
function makeStorage() {
  const m = new Map();
  return {
    getItem: (k) => (m.has(String(k)) ? m.get(String(k)) : null),
    setItem: (k, v) => m.set(String(k), String(v)),
    removeItem: (k) => { m.delete(String(k)); },
    clear: () => { m.clear(); },
    key: (i) => [...m.keys()][i] ?? null,
    get length() { return m.size; },
  };
}
const _store = makeStorage();
globalThis.localStorage = _store;
globalThis.sessionStorage = makeStorage();

const { mockDB } = await import('../../docs/src/core/domain/domain.js?v=20261023c');
const { MockAdapter } = await import('../../docs/src/data/mock-adapter.js?v=20261023c');
const { getAdapter } = await import('../../docs/src/data/data-adapter.js?v=20261023c');
// runtime 注册 mock/api 适配器并 setDataSource('mock')
const { BranchService } = await import('../../docs/src/services/core/runtime.js?v=20261023c');
const { writeActivityWithSOP } = await import('../../docs/src/services/activity/decision-tree.js?v=20261023c');

const ORIGINAL = {
  activities: mockDB.activities,
  tasks: mockDB.tasks,
  notices: mockDB.notices,
  todos: mockDB.todos,
  workgroups: mockDB.workgroups,
  workgroupMembers: mockDB.workgroupMembers,
  workgroupGrants: mockDB.workgroupGrants,
};

const ASSIGNMENTS = [
  { personId: '2400012355', role: 'organizer' },
  { personId: '2400012349', role: 'deep' },
];

beforeEach(() => {
  _store.clear();
  mockDB.activities = [];
  mockDB.tasks = [];
  mockDB.notices = [];
  mockDB.todos = [];
  mockDB.workgroups = [];
  mockDB.workgroupMembers = [];
  mockDB.workgroupGrants = [];
  // 跳过 loadDB 的持久化守卫（本测试的「刷新」用例单独回落 false 再 loadDB）
  mockDB._loaded = true;
});

after(() => {
  Object.assign(mockDB, ORIGINAL);
});

const membersOf = (workgroupId) => mockDB.workgroupMembers
  .filter((row) => row.workgroupId === workgroupId && row.status !== 'removed');
const groupsOf = (workgroupId) => mockDB.workgroups.filter((row) => row.id === workgroupId);

test('T1 mock 写口创建活动 ⇒ 工作组与成员关系同事务建立，赋权不落空', async () => {
  const act = await BranchService.createActivity({
    title: '事务测试 · 党小组会', type: '党小组会', date: '2026-10-30', branchId: 'br-b1',
    createdBy: '2400012355', organizer: '2400012355', organizingScope: 'party-group', hostGroupId: 'pg-1',
    assignments: ASSIGNMENTS,
  });
  const workgroupId = `wg-activity-${act.id}`;

  assert.equal(act.workgroupId, workgroupId, '活动主源须带回 workgroupId');
  assert.equal(groupsOf(workgroupId).length, 1, '活动工作组须立即存在（不等下次 loadDB）');
  const wg = groupsOf(workgroupId)[0];
  assert.equal(wg.sourceType, 'activity');
  assert.equal(wg.sourceId, act.id);
  assert.equal(wg.branchId, 'br-b1');

  assert.deepEqual(
    membersOf(workgroupId).map((row) => `${row.personId}:${row.role}`).sort(),
    ['2400012349:deep', '2400012355:organizer'],
    '组织者/深度参与者成员关系须已存在',
  );

  // 赋权写口（mock adapter）要求工作组与成员都已存在；能建成即证明授权不会落到不存在的工作组。
  const grant = await getAdapter().workgroups.grants.create(workgroupId, { personId: '2400012349', templateKey: 'deep' });
  assert.ok(grant && grant.workgroupId === workgroupId);
  assert.equal(grant.status, 'active');
});

test('T2 writeActivityWithSOP 创建后，本会话内即读得到工作组与成员', async () => {
  const before = mockDB.activities.length;
  const { activity } = await writeActivityWithSOP({
    title: '事务测试 · 党课', type: '党课', date: '2026-10-30', targetDate: '2026-10-30',
    location: '线上', branchId: 'br-b1', createdBy: '2400012355', organizer: '2400012355',
    organizingScope: 'branch', hostGroupId: null, assignments: ASSIGNMENTS,
  }, 'party-lecture', '2026-10-30');

  assert.equal(mockDB.activities.length, before + 1, '活动须写入主源');
  const workgroupId = `wg-activity-${activity.id}`;
  assert.equal(activity.workgroupId, workgroupId);
  assert.equal(groupsOf(workgroupId).length, 1, '本会话内按 wg-activity-<id> 须读到工作组');
  assert.deepEqual(
    membersOf(workgroupId).map((row) => `${row.personId}:${row.role}`).sort(),
    ['2400012349:deep', '2400012355:organizer'],
  );
});

test('T3 刷新后不重复建组、不重复成员（幂等）', async () => {
  const act = await BranchService.createActivity({
    title: '事务测试 · 幂等', type: '党小组会', date: '2026-10-31', branchId: 'br-b1',
    createdBy: '2400012355', organizer: '2400012355', organizingScope: 'party-group', hostGroupId: 'pg-1',
    assignments: ASSIGNMENTS,
  });
  const workgroupId = `wg-activity-${act.id}`;
  const before = { groups: groupsOf(workgroupId).length, members: membersOf(workgroupId).length };
  assert.equal(before.groups, 1);
  assert.equal(before.members, 2);

  // 模拟刷新：内存库清空后从持久化恢复（mock-adapter 的 seed-sync 会再跑一遍）
  mockDB._loaded = false;
  MockAdapter.loadDB();
  MockAdapter.loadDB();

  assert.equal(groupsOf(workgroupId).length, before.groups, '刷新后不得重复建组');
  assert.equal(membersOf(workgroupId).length, before.members, '刷新后不得重复成员');
  assert.deepEqual(
    membersOf(workgroupId).map((row) => `${row.personId}:${row.role}`).sort(),
    ['2400012349:deep', '2400012355:organizer'],
  );
  assert.equal(mockDB.activities.find((row) => row.id === act.id)?.workgroupId, workgroupId,
    '刷新后活动仍指向同一工作组');
});
