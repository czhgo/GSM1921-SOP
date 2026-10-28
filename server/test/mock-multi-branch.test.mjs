// role: [工程师]+[AI]
// server/test/mock-multi-branch.test.mjs — Phase 0 · mock 多支部隔离守卫（2026-10-20）
// ════════════════════════════════════════════════════════════════
// 立据：mock adapter 各 list 原不做支部过滤（api 形态由服务端按 actor/branchId 过滤），
//   多支部隔离无法在 mock 演示/测试中复现。本守卫钉住三件事：
//   ① `list({ branchId })` 只返回本支部（users/activities/notices/attendances/todos/assignments）；
//   ② 不传 branchId 保持全量（单支部演示不受影响）；
//   ③ 与 api 形态读数逐值一致（服务端 branch-scope.js 同口径；含「无 branchId 由关联活动派生」的行）。
//
// 造数：br-b1 用既有种子（与服务端 seed.js 同源导出），br-b2 造独立用户/活动/通知/考勤/待办/分工。
// 比较器：照 mock-api-parity.test.mjs 的 normalize/diffOf（按 id 排序 + 逐字段 JSON 比较）。
// 运行：`node --test test/mock-multi-branch.test.mjs`（server 目录；需 DISABLE_PASSWORD_CHECK=1 或带口令）。
import { test, after } from 'node:test';
import assert from 'node:assert/strict';

// ── localStorage 内存桩（成员档案读链惰性访问需要；与 mock-api-parity 同款）──
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
import { mockDB } from '../../docs/src/core/domain/domain.js?v=20261028b';
import { MockAdapter } from '../../docs/src/data/mock-adapter.js?v=20261028b';
import { PEOPLE } from '../../docs/src/data/mock/people.js?v=20261028b';
import { ACTIVITIES } from '../../docs/src/data/mock/activities.js?v=20261028b';
import { MOCK_NOTICES } from '../../docs/src/data/mock/notices.js?v=20261028b';
import { ATTENDANCE_RECORDS } from '../../docs/src/data/mock/attendance.js?v=20261028b';
import { SEED_ASSIGNMENTS } from '../../docs/src/data/mock/seed.js?v=20261028b';
import { SEED_TODOS } from '../../docs/src/services/governance/todo.js?v=20261028b';
import { ensureLegacySourceWorkgroups, normalizeSeedActivitySeedRows } from '../../docs/src/data/workgroup-seed-sync.js?v=20261028b';
// Task 1（2026-10-25）：种子只存事实；mock 侧用同一派生器补回运行时形状后再与 API 比对。
import { applyDerivedFacts } from '../../docs/src/data/mock/derive.js?v=20261028b';
// R3-P1（F-06）：通知读口按受众投影（私信/定向）——本守卫的 api 侧同样经该判据，mock 侧须同源对齐。
import { canReadNotice } from '../../docs/src/services/governance/notice.js?v=20261028b';

const BRANCH_B1 = 'br-b1';
const BRANCH_B2 = 'br-b2';
const UNKNOWN_BRANCH = 'br-none';

// ── 第二支部夹具：用户/活动/通知显式带 branchId；考勤/待办/分工不带 branchId，
//    用于验证「按关联活动派生归属」与服务端 branch-scope.js 同口径。 ──
const B2 = {
  users: [
    { id: 'p-b2', name: '第二支部成员', role: 'participant', developStage: '正式党员', branchId: BRANCH_B2 },
    { id: 'p-b3', name: '第二支部书记', role: 'secretary', developStage: '正式党员', branchId: BRANCH_B2 },
  ],
  activities: [
    { id: 'act-b2', branchId: BRANCH_B2, title: '第二支部活动', status: 'active', assignments: [] },
  ],
  notices: [
    { id: 'notice-b2', branchId: BRANCH_B2, title: '第二支部通知', content: '第二支部专用通知', publishDate: '2026-09-01', read: false, kind: 'announcement', archivedBy: [] },
  ],
  attendances: [
    { id: 'att-b2', personId: 'p-b2', activityId: 'act-b2', status: 'present', recordedBy: null, recordedAt: '2026-09-01T00:00:00Z', overdue: false },
  ],
  todos: [
    { id: 'todo-b2', title: '第二支部待办', role: 'secretary', status: 'pending', sourceType: 'activity', sourceId: 'act-b2' },
  ],
  assignments: [
    { id: 'assign-b2', activityId: 'act-b2', workName: '第二支部分工', assigneeId: 'p-b2', status: 'pending' },
  ],
};

// ── mock 形态：与 server/seed.js 同源播种六张表（不做 mock-adapter 的额外字段加工，
//    以保证两侧比较的是同一份语料）；再追加第二支部夹具。 ──
// 2026-10-21 批次 499：与服务端 seed 同一归一口径（组织落点/跨组招募字段），否则两形态读数不一致。
// B-499-4（2026-10-21）：服务端 seed 已按数据模型补齐 `visibility/createdBy/createdAt`
// 装载默认（原先只有 mock-adapter `_seedInitialData` 补）——本夹具用同一归一函数，保持两形态同源。
mockDB.activities = normalizeSeedActivitySeedRows(ACTIVITIES);
mockDB.notices = MOCK_NOTICES.map((row) => ({ ...row }));
mockDB.attendances = ATTENDANCE_RECORDS.map((row) => ({ ...row }));
mockDB.todos = SEED_TODOS.map((row) => ({ ...row }));
mockDB.assignments = SEED_ASSIGNMENTS.map((row) => ({ ...row }));
// server/seed.js 播种活动前先跑 ensureLegacySourceWorkgroups（写入 workgroupId）——mock 侧同法，
// 否则两侧 activities 行会因 workgroupId 不同而出现无意义的差异。
mockDB.workgroups = [];
mockDB.workgroupMembers = [];
mockDB.workgroupGrants = [];
applyDerivedFacts(mockDB, { people: PEOPLE });
ensureLegacySourceWorkgroups(mockDB);
for (const [key, rows] of Object.entries(B2)) {
  if (key === 'users') continue; // users.list 读 PEOPLE + members 覆盖层
  mockDB[key] = [...mockDB[key], ...rows.map((row) => ({ ...row }))];
}
// 第二支部成员走 members 持久覆盖层（MockAdapter.users.list 的 mock 形态读链）
storage.setItem('gsm1921-members-overlay', JSON.stringify({ version: 1, upserts: B2.users, removedIds: [] }));

// ── api 形态：内存服务 + 同源播种 + 同一批第二支部夹具 + 党委组织员登录 ──
const app = createApp({ dbPath: ':memory:' });
const db = app.locals.db;
await seedDatabase(db);
const write = (table, row) => db.prepare(`INSERT OR REPLACE INTO ${table} (id, data) VALUES (?, ?)`)
  .run(String(row.id), JSON.stringify(row));
write('branches', { id: BRANCH_B2, name: '第二支部', type: '本科生', status: 'active', config: {} });
for (const row of B2.users) write('users', row);
for (const row of B2.activities) write('activities', row);
for (const row of B2.notices) write('notices', row);
for (const row of B2.attendances) write('attendances', row);
for (const row of B2.todos) write('todos', row);
for (const row of B2.assignments) write('assignments', row);
const server = app.listen(0);
const base = `http://127.0.0.1:${server.address().port}/api/v1`;
const loginRes = await fetch(`${base}/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ personId: '9000000001', password: '123456' }),
});
assert.equal(loginRes.status, 200, '党委组织员登录须 200');
const { token } = await loginRes.json();

after(async () => {
  server.closeAllConnections?.();
  await new Promise((resolve) => server.close(resolve));
  db.close();
});

const RESOURCES = ['users', 'activities', 'notices', 'attendances', 'todos', 'assignments'];

/** mock 形态读数（显式传 branchId = 只读本支部） */
function mockRows(resource, params) {
  return MockAdapter[resource].list(params);
}

/** api 形态读数（原始行；服务端按 actor/branchId 过滤） */
async function apiRows(resource, branchId) {
  const res = await fetch(`${base}/${resource}?branchId=${encodeURIComponent(branchId)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  assert.equal(res.status, 200, `GET /${resource}?branchId=${branchId} 应 200（实测 ${res.status}）`);
  return res.json();
}

/** 归一（比较用）：按 id 升序 + 逐行 JSON 深拷贝（与 mock-api-parity 同口径） */
function normalize(rows) {
  return [...rows]
    .map((row) => JSON.parse(JSON.stringify(row)))
    .sort((a, b) => String(a.id).localeCompare(String(b.id)));
}

/** 比较器：返回两份归一行的差异清单（空数组＝一致） */
function diffOf(a, b) {
  const out = [];
  if (a.length !== b.length) out.push(`行数不等：${a.length} vs ${b.length}`);
  const n = Math.max(a.length, b.length);
  for (let i = 0; i < n; i++) {
    const x = a[i], y = b[i];
    if (!x || !y) { out.push(`第 ${i} 行缺失`); continue; }
    const fields = new Set([...Object.keys(x), ...Object.keys(y)]);
    for (const f of fields) if (JSON.stringify(x[f]) !== JSON.stringify(y[f])) out.push(`${x.id ?? i}.${f}: ${JSON.stringify(x[f])} ≠ ${JSON.stringify(y[f])}`);
  }
  return out;
}

const idsOf = (rows) => rows.map((row) => row.id).sort();

test('M1 mock list({ branchId }) 只返回本支部：六张表逐表核对', async () => {
  const readings = await Promise.all(RESOURCES.map(async (resource) => {
    const [own1, own2, unknown] = await Promise.all([
      mockRows(resource, { branchId: BRANCH_B1 }),
      mockRows(resource, { branchId: BRANCH_B2 }),
      mockRows(resource, { branchId: UNKNOWN_BRANCH }),
    ]);
    return { resource, own1, own2, unknown };
  }));

  for (const { resource, own1, own2, unknown } of readings) {
    assert.deepEqual(idsOf(own2), B2[resource].map((row) => row.id).sort(),
      `${resource}.list({branchId:'${BRANCH_B2}'}) 应只含第二支部夹具`);
    assert.ok(own1.length > 0, `${resource}.list({branchId:'${BRANCH_B1}'}) 应含第一支部种子数据`);
    for (const row of own1) {
      assert.ok(!B2[resource].some((fixture) => fixture.id === row.id),
        `${resource}.list({branchId:'${BRANCH_B1}'}) 不应含第二支部记录 ${row.id}`);
    }
    assert.deepEqual(unknown, [], `${resource}.list({branchId:'${UNKNOWN_BRANCH}'}) 应返回空数组`);
  }

  // users 特例：未归属支部的党委组织员（branchId:null）不落入任何支部
  const b1Users = await mockRows('users', { branchId: BRANCH_B1 });
  assert.ok(b1Users.some((row) => row.id === '2300010001'), '第一支部名册应含本支部成员 2300010001');
  assert.ok(!b1Users.some((row) => row.id === '9000000001'), '未归属支部的党委组织员不得进入第一支部名册');
  const b2Users = await mockRows('users', { branchId: BRANCH_B2 });
  assert.deepEqual(idsOf(b2Users), ['p-b2', 'p-b3']);
});

test('M2 不传 branchId 保持全量行为（单支部演示不受影响）', async () => {
  const expectedLength = {
    users: PEOPLE.length + B2.users.length,
    activities: mockDB.activities.length,
    notices: mockDB.notices.length,
    attendances: mockDB.attendances.length,
    todos: mockDB.todos.length,
    assignments: mockDB.assignments.length,
  };
  const readings = await Promise.all(RESOURCES.map((resource) => mockRows(resource, undefined)));
  RESOURCES.forEach((resource, index) => {
    const rows = readings[index];
    assert.equal(rows.length, expectedLength[resource], `${resource}.list() 无参应返回全量 ${expectedLength[resource]} 行`);
    assert.ok(rows.some((row) => B2[resource].some((fixture) => fixture.id === row.id)),
      `${resource}.list() 无参应同时含第二支部记录`);
  });
  const users = readings[RESOURCES.indexOf('users')];
  assert.ok(users.some((row) => row.id === '9000000001'), '无参名册应保留党委组织员（原有全量行为）');
});

test('M3 与 api 形态读数逐值一致（两支部 × 六张表）', async () => {
  const problems = [];
  for (const branchId of [BRANCH_B1, BRANCH_B2]) {
    for (const resource of RESOURCES) {
      const [mockSideRaw, apiSide] = await Promise.all([
        mockRows(resource, { branchId }),
        apiRows(resource, branchId),
      ]);
      // R3-P1（F-06）：api 通知读口按登录人受众投影；mock 侧用同一判据对齐（否则比较的是两套口径）
      const mockSide = resource === 'notices'
        ? mockSideRaw.filter((row) => canReadNotice(row, { personId: '9000000001', role: 'party-staff' }))
        : mockSideRaw;
      const diff = diffOf(normalize(mockSide), normalize(apiSide));
      if (diff.length) problems.push(`[${resource} @ ${branchId}] ${diff.slice(0, 6).join('；')}`);
      assert.ok(apiSide.length > 0, `${resource} @ ${branchId}：api 读数不得为空（防「空 == 空」恒真）`);
    }
  }
  assert.deepEqual(problems, [], `mock/api 两形态读数不一致：\n  ${problems.join('\n  ')}`);

  // 非空转自检：比较器能判出人为差异
  const sample = normalize(await mockRows('activities', { branchId: BRANCH_B1 }));
  assert.ok(diffOf(sample, sample.map((row, i) => (i === 0 ? { ...row, title: `${row.title}［改］` } : row))).length > 0,
    '比较器未能判出人为差异——M3 会恒真');
});
