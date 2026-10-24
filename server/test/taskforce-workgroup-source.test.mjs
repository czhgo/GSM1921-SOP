// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  server/test/taskforce-workgroup-source.test.mjs — 专班成员 / 贡献走工作组主源（R9 Task 4.2）
// ════════════════════════════════════════════════════════════════
// 判据：
//   W1 报名审核通过（deep）后 → `workgroup_members` 能查到（不再只写 taskforces.members）；
//   W2 兼容镜像：`taskforces.members` 仍同步可见（旧读口只读保留）；
//   W3 代录贡献 → 写 `workgroup_outputs`（每人一条 kind='contribution'），镜像 contributions 同步。
// 运行：node --test test/taskforce-workgroup-source.test.mjs（server 目录）
// ⚠ docs/src 的相对 import 带与源码一致的 `?v=` query（模块缓存键一致性）。
import { test, before } from 'node:test';
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

import { mockDB } from '../../docs/src/core/domain/domain.js?v=20261024b';
import { MockAdapter } from '../../docs/src/data/mock-adapter.js?v=20261024b';
import { registerMockAdapter, setDataSource } from '../../docs/src/data/data-adapter.js?v=20261024b';
import { TaskForceRecordStore } from '../../docs/src/services/activity/taskforce.js?v=20261024b';
import { SignupStore } from '../../docs/src/services/activity/signup.js?v=20261024b';

const TF_ID = 'tf-001';
const WORKGROUP_ID = `wg-taskforce-${TF_ID}`;

before(() => {
  registerMockAdapter(MockAdapter);
  setDataSource('mock');
  mockDB._loaded = false;
  MockAdapter.loadDB();
  TaskForceRecordStore.init();
  SignupStore.init();
  // 把种子专班改成可报名（recruiting 且未截止），保留其他运行时口径。
  const tf = mockDB.taskforces.find((row) => row.id === TF_ID);
  assert.ok(tf, '种子须含 tf-001');
  tf.status = 'recruiting';
  tf.deadline = '2026-12-31';
  const wg = mockDB.workgroups.find((row) => row.id === WORKGROUP_ID);
  assert.ok(wg, '种子须含 tf-001 的工作组');
  // R10-C16（批次 504）：mock 与 API 同口径——终态工作组只读。本用例要验「报名审核写主源」，
  //   前置须把工作组置于可写态（复现「招募中」的真实组合）。
  wg.status = 'active';
});

test('W1/W2 报名审核通过：写 workgroup_members 主源，taskforces.members 兼容镜像同步', async () => {
  const personId = '2400012350';
  const applied = SignupStore.apply({ sourceType: 'taskforce', sourceId: TF_ID, personId, role: 'deep' });
  assert.equal(applied.ok, true, `报名应成功：${applied.reason || ''}`);
  const reviewed = await SignupStore.review(applied.signup.id, { approve: true, reviewer: '2400012355' });
  assert.equal(reviewed.ok, true, `审核应成功：${reviewed.reason || ''}`);

  const member = mockDB.workgroupMembers.find((row) => row.workgroupId === WORKGROUP_ID
    && row.personId === personId && row.status !== 'removed');
  assert.ok(member, '审核通过后 workgroup_members 必须能查到该成员（主源）');
  assert.equal(member.role, 'deep');

  const mirrored = mockDB.taskforces.find((row) => row.id === TF_ID);
  assert.ok((mirrored.members || []).some((row) => row.personId === personId && row.role === 'deep'),
    'taskforces.members 兼容镜像仍须同步（旧读口只读保留）');
});

test('W3 代录贡献：写 workgroup_outputs，镜像 contributions 同步', async () => {
  const personId = '2400012349';
  const beforeCount = (mockDB.workgroupOutputs || []).filter((row) => row.workgroupId === WORKGROUP_ID).length;
  const result = await TaskForceRecordStore.addContributions(TF_ID, {
    personIds: [personId], desc: 'R9 主源贡献测试', by: '2400012348',
  });
  assert.equal(result?.added, 1);
  const outputs = (mockDB.workgroupOutputs || []).filter((row) => row.workgroupId === WORKGROUP_ID
    && row.kind === 'contribution' && row.title === 'R9 主源贡献测试');
  assert.equal(outputs.length, 1, '贡献必须登记到 workgroup_outputs（主源）');
  assert.equal(outputs[0].personId, personId);
  assert.ok((mockDB.workgroupOutputs || []).filter((row) => row.workgroupId === WORKGROUP_ID).length > beforeCount);

  const tf = TaskForceRecordStore.getAll().find((row) => row.id === TF_ID);
  const member = (tf.members || []).find((row) => row.personId === personId);
  assert.ok((member.contributions || []).some((row) => row && row.desc === 'R9 主源贡献测试'),
    'taskforces.members[].contributions 兼容镜像仍须同步');
});
