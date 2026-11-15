// server/test/multi-branch-five-proof.test.mjs — T13 双支部「五证」结果夹具（先红后绿）
// ════════════════════════════════════════════════════════════════
// 由来：`.trae/specs/close-six-dim-gaps/spec.md`「多支部隔离（N=1 为特例）」＋ tasks.md T13；
//   设计定稿见 `content/04_web_design/evolution/ARCHITECTURE_EVOLUTION.md §10.6–10.9`（判定点 /
//   失败开放点 / 施工顺序）。本文件把五证固化成可复跑的结果断言，**先于实现落地**：
//     ① 读隔离：A 支部读不到 B 支部任何行；
//     ② 跨支部写被拒：单行 / PATCH 外支部行 / 快照含外支部行 一律 403，且不产生部分写入；
//     ③ N=1 等价：单支部 `br-b1` 下读集合与 bootstrap 摘要逐字节不变（存量缺字段行的可见性不变）；
//     ④ 匿名归档 fail-closed：无 token `GET /archiveRecords` 不得返回任何支部行（10.7-1 病灶）；
//     ⑤ `todo-groups` 与 `todos` 支部判定一致：同一行两处可见性相同（10.7-3/4 病灶）。
//
// 边界：`ALLOW_MULTI_BRANCH` 保持关闭（本文件不读也不改该开关）；库为 `:memory:`，不落运行库。
// ════════════════════════════════════════════════════════════════
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createApp } from '../app.js';

const BRANCHES = [
  {
    id: 'br-a',
    name: '甲支部',
    people: { secretary: '7100000001', org: '7100000003' },
  },
  {
    id: 'br-b',
    name: '乙支部',
    people: { secretary: '7200000001', org: '7200000003' },
  },
];

/** 每个支部一套最小行集（id 后缀取支部末位，便于断言「甲看不到乙」） */
function branchFixture({ id, people }) {
  const suffix = id.slice(-1);
  return {
    users: [
      { id: people.secretary, studentId: people.secretary, name: `支书${suffix}`, role: 'secretary', branchId: id, developStage: '正式党员' },
      { id: people.org, studentId: people.org, name: `组织委员${suffix}`, role: 'org-commissioner', branchId: id, developStage: '正式党员' },
    ],
    activities: [
      { id: `act-${suffix}`, branchId: id, title: `支部活动${suffix}`, status: 'active', date: '2026-11-01', organizer: people.secretary, assignments: [] },
    ],
    notices: [
      {
        id: `ntc-${suffix}`, branchId: id, title: `支部通知${suffix}`, content: '本支部通知',
        kind: 'announcement', audience: ['all'], priority: 'normal', publishDate: '2026-11-01', source: 'branch',
      },
    ],
    todos: [
      { id: `todo-${suffix}`, branchId: id, personId: people.org, role: 'org-commissioner', title: `支部待办${suffix}`, status: 'pending' },
    ],
    archiveRecords: [
      { id: `ar-${suffix}`, branchId: id, title: `支部归档${suffix}`, status: 'archived' },
    ],
  };
}

const FIXTURES = BRANCHES.map(branchFixture);

/** 存量缺字段的专班赋权待办（无 branchId / 无活动归属）：`todos` 走 branchLegacy，`todo-groups` 必须同判 */
const LEGACY_TODO = {
  id: 'todo-lk', actionKey: 'taskforce-authorize', actionType: 'authorize',
  personId: BRANCHES[0].people.org, role: 'org-commissioner', title: '专班赋权待办', status: 'pending',
};

const dbWrite = (db) => (table, row) => db.prepare(`INSERT OR REPLACE INTO ${table} (id, data) VALUES (?, ?)`)
  .run(row.id, JSON.stringify(row));

// ── N=2 夹具（① ② ⑤）──────────────────────────────────────────────────────
let app2;
let server2;
let base2;
let db2;
const tokens = new Map();

before(async () => {
  app2 = createApp({ dbPath: ':memory:' });
  db2 = app2.locals.db;
  const write = dbWrite(db2);
  for (const [index, branch] of BRANCHES.entries()) {
    write('branches', { id: branch.id, name: branch.name, status: 'active', secretaryId: branch.people.secretary, config: {} });
    for (const user of FIXTURES[index].users) write('users', user);
  }
  for (const fixture of FIXTURES) {
    for (const row of fixture.activities) write('activities', row);
    for (const row of fixture.notices) write('notices', row);
    for (const row of fixture.todos) write('todos', row);
    for (const row of fixture.archiveRecords) write('archive_records', row);
  }
  write('todos', LEGACY_TODO);

  server2 = app2.listen(0);
  base2 = `http://127.0.0.1:${server2.address().port}/api/v1`;
  for (const personId of BRANCHES.flatMap((branch) => Object.values(branch.people))) {
    const response = await fetch(`${base2}/auth/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ personId, password: '123456' }),
    });
    assert.equal(response.status, 200, `登录失败：${personId}`);
    tokens.set(personId, (await response.json()).token);
  }
});

after(() => {
  server2?.close();
  db2?.close();
});

async function request(personId, path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (personId) headers.Authorization = `Bearer ${tokens.get(personId)}`;
  const response = await fetch(`${base2}${path}`, { ...options, headers });
  const text = await response.text();
  let body = text;
  try { body = JSON.parse(text); } catch { /* 非 JSON 原样返回 */ }
  return { response, body };
}
const get = (personId, path) => request(personId, path);
const post = (personId, path, payload) => request(personId, path, { method: 'POST', body: JSON.stringify(payload) });
const patch = (personId, path, payload) => request(personId, path, { method: 'PATCH', body: JSON.stringify(payload) });

/** 对方支部的可见标识：branchId / 行 id / 人员 id —— 整段 JSON 都不得出现 */
function foreignMarkers(branchIndex) {
  const other = BRANCHES[1 - branchIndex];
  const fixture = FIXTURES[1 - branchIndex];
  return [
    other.id,
    ...Object.values(other.people),
    ...fixture.activities.map((row) => row.id),
    ...fixture.notices.map((row) => row.id),
    ...fixture.todos.map((row) => row.id),
    ...fixture.archiveRecords.map((row) => row.id),
  ];
}

function assertNoForeign(body, markers, label) {
  const text = JSON.stringify(body);
  for (const marker of markers) {
    assert.ok(!text.includes(marker), `${label} 泄漏了其他支部标识：${marker}`);
  }
}

// ── ① 读隔离 ───────────────────────────────────────────────────────────────
for (const [index, branch] of BRANCHES.entries()) {
  test(`① ${branch.name}账号读不到另一支部的任何行（含归档与待办）`, async () => {
    const markers = foreignMarkers(index);
    for (const endpoint of ['/activities', '/notices', '/todos', '/archiveRecords', '/users']) {
      const { response, body } = await get(branch.people.secretary, endpoint);
      assert.equal(response.status, 200, `${endpoint} 应可读（${branch.name}支书）`);
      assertNoForeign(body, markers, `${branch.name}支书 ${endpoint}`);
    }
    // 非空转：本支部行必须可见（否则「读不到对方」可能因为读口一律返回空）
    const own = await get(branch.people.secretary, '/activities');
    assert.deepEqual(own.body.map((row) => row.id), [`act-${branch.id.slice(-1)}`]);
  });
}

// ── ② 跨支部写被拒 ─────────────────────────────────────────────────────────
test('② 跨支部写一律 403 且不产生部分写入（单行 / PATCH / 快照整表替换）', async () => {
  const actor = BRANCHES[0].people.secretary;

  const create = await post(actor, '/activities', {
    id: 'act-foreign', branchId: 'br-b', title: '越权创建', status: 'active', date: '2026-11-02', organizer: actor, assignments: [],
  });
  assert.equal(create.response.status, 403, '单行创建到外支部必须 403');

  const update = await patch(actor, '/activities/act-b', { title: '越权改写' });
  assert.equal(update.response.status, 403, 'PATCH 外支部行必须 403');

  const snapshot = await post(actor, '/snapshot', {
    _versions: { activities: 0 },
    activities: [{ id: 'act-b', branchId: 'br-b', title: '快照越权改写', status: 'active', date: '2026-11-01', assignments: [] }],
  });
  assert.equal(snapshot.response.status, 403, '快照含外支部行必须 403');

  // 不产生部分写入：乙支部行保持原样、越权新行未落库（用乙支部自己的读口核对，避免跨支部读取）
  const foreignRows = await get(BRANCHES[1].people.secretary, '/activities');
  assert.equal(foreignRows.response.status, 200);
  const foreignRow = foreignRows.body.find((row) => row.id === 'act-b');
  assert.ok(foreignRow, '乙支部行仍应可见');
  assert.equal(foreignRow.title, '支部活动b', '外支部行不得被改写');
  assert.ok(!foreignRows.body.some((row) => row.id === 'act-foreign'), '越权创建不得落库');
});

// ── ③ N=1 等价（单支部基线固化）───────────────────────────────────────────
// 单支部 `br-b1` 下的存量缺字段行：activities / notices 依赖历史兼容回落，users / todos / archiveRecords 不回落。
// 摘要取 `/bootstrap` 全集合（确定性响应，无时间戳）；改造前后必须逐字节一致。
const N1_BASELINE_DIGEST = 'a308adac0dae3cbd';

test('③ N=1（br-b1）读集合与 bootstrap 摘要与改造前一致', async () => {
  const app = createApp({ dbPath: ':memory:' });
  const db = app.locals.db;
  const write = dbWrite(db);
  const server = app.listen(0);
  const base = `http://127.0.0.1:${server.address().port}/api/v1`;
  try {
    write('branches', { id: 'br-b1', name: '第一支部', status: 'active', secretaryId: '6100000001', config: {} });
    write('users', { id: '6100000001', studentId: '6100000001', name: '支书', role: 'secretary', branchId: 'br-b1', developStage: '正式党员' });
    write('users', { id: '6100000002', studentId: '6100000002', name: '成员', role: 'participant', branchId: 'br-b1', developStage: '正式党员' });
    write('users', { id: '6100000003', studentId: '6100000003', name: '缺字段成员', role: 'participant', developStage: '正式党员' });
    write('activities', { id: 'act-1', title: '历史活动', status: 'active', date: '2026-11-01', organizer: '6100000001', assignments: [] });
    write('notices', { id: 'ntc-1', title: '历史通知', content: '存量', kind: 'announcement', audience: ['all'], priority: 'normal', publishDate: '2026-11-01', source: 'branch' });
    write('todos', { id: 'todo-1', branchId: 'br-b1', personId: '6100000002', role: 'participant', title: '本支部待办', status: 'pending' });
    write('todos', { id: 'todo-2', personId: '6100000001', role: 'secretary', title: '存量待办', status: 'pending' });
    write('archive_records', { id: 'ar-legacy', title: '未归属归档', status: 'archived' });
    write('tasks', { id: 'task-legacy', activityId: 'act-1', title: '历史任务' });

    const login = await fetch(`${base}/auth/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ personId: '6100000001', password: '123456' }),
    });
    assert.equal(login.status, 200);
    const { token } = await login.json();
    const read = async (path) => {
      const response = await fetch(`${base}${path}`, { headers: { Authorization: `Bearer ${token}` } });
      assert.equal(response.status, 200, `${path} 应可读`);
      return response.json();
    };
    const ids = (rows) => rows.map((row) => row.id);

    const activities = await read('/activities');
    assert.deepEqual(ids(activities), ['act-1'], '历史活动缺 branchId 仍归缺省支部（10.8-③ 基线）');
    const notices = await read('/notices');
    assert.deepEqual(ids(notices), ['ntc-1'], '历史通知缺 branchId 仍归缺省支部（10.8-③ 基线）');
    const users = await read('/users');
    assert.deepEqual(ids(users).sort(), ['6100000001', '6100000002'], '缺 branchId 的成员对支部不可见（10.8-③ 基线）');
    const todos = await read('/todos');
    assert.deepEqual(ids(todos).sort(), ['todo-1', 'todo-2'], '存量待办走 branchLegacy 可见（10.8-③ 基线）');
    assert.equal(todos.find((row) => row.id === 'todo-2')?.branchLegacy, true, '存量待办须标 branchLegacy');
    const archiveRecords = await read('/archiveRecords');
    assert.deepEqual(ids(archiveRecords), [], '未归属归档记录对支部不可见（10.8-③ 基线）');
    const tasks = await read('/tasks');
    assert.deepEqual(ids(tasks), ['task-legacy'], '活动归属可解析的任务行仍可见（历史兼容）');

    const bootstrap = await read('/bootstrap');
    const digest = createHash('sha256').update(JSON.stringify(bootstrap), 'utf8').digest('hex').slice(0, 16);
    assert.equal(digest, N1_BASELINE_DIGEST,
      `N=1 bootstrap 摘要变化（读集合不再逐字节等价）：实际 ${digest}；若确为有意变更，须写明理由并同批改准本常量`);
  } finally {
    server.closeAllConnections?.();
    await new Promise((resolve) => server.close(resolve));
    db.close();
  }
});

// ── ④ 匿名归档 fail-closed ────────────────────────────────────────────────
test('④ 匿名 GET /archiveRecords fail-closed（不返回任何支部行）', async () => {
  const { response, body } = await get(null, '/archiveRecords');
  assert.equal(response.status, 200, '公共归档读口仍可选登录');
  assert.deepEqual(body, [], '无支部上下文不得返回支部归档行（10.7-1 失败开放点）');

  const archived = await get(null, '/activities?archived=true');
  assert.equal(archived.response.status, 200);
  assert.ok(!JSON.stringify(archived.body).includes('act-a'), '匿名归档活动不得含支部行');
  assert.ok(!JSON.stringify(archived.body).includes('act-b'), '匿名归档活动不得含支部行');

  // 匿名不得靠 `?branchId=` 造出支部上下文（参数只对已登录调用方生效）
  const spoofed = await get(null, '/archiveRecords?branchId=br-a');
  assert.equal(spoofed.response.status, 200);
  assert.deepEqual(spoofed.body, [], '匿名带 ?branchId= 也不得返回该支部行');
});

// ── ⑤ todo-groups 与 todos 判定一致 ───────────────────────────────────────
test('⑤ 存量待办在 todos 与 todo-groups 同判（同一行两处可见性一致）', async () => {
  const actor = BRANCHES[0].people.org;

  const todos = await get(actor, '/todos');
  assert.equal(todos.response.status, 200);
  const legacy = todos.body.find((row) => row.id === LEGACY_TODO.id);
  assert.ok(legacy, '存量待办（无 branchId）应经 branchLegacy 在 /todos 可见');
  assert.equal(legacy.branchLegacy, true);

  const groups = await get(actor, `/todo-groups?role=org-commissioner&personId=${actor}`);
  assert.equal(groups.response.status, 200);
  const group = groups.body.groups.find((row) => row.groupKey === 'org-commissioner:taskforce-authorize');
  assert.ok(group, '同一行必须由 /todo-groups 派生出（两处支部判定不一致＝10.7-3/4 病灶）');
  assert.ok(group.items.some((row) => row.id === LEGACY_TODO.id), '派生组内必须含该存量待办');
});
