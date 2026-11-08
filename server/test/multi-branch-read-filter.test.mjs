// server/test/multi-branch-read-filter.test.mjs — 波次 E：读过滤 Phase 3（双支部夹具）
// ════════════════════════════════════════════════════════════════
// 目的：用**双支部夹具**证明支部账号在所有主要读口读不到另一支部数据；
//   党委显式选择支部后仍可见该支部（跨支部读取权属党委本职）；生产单支部行为不变。
// 边界：`ALLOW_MULTI_BRANCH` 保持关闭（本测试不读取该开关，也不改它）。
//
// 夹具口径：
//   · 支部甲 `br-a` / 支部乙 `br-b`，各自持有一套 activities / notices / branchDocs /
//     tasks / todos / agenda_votes / attendances / member_change_requests / issues / archive_records；
//   · 党委内容（活动 / 通知 / 院级资料）归 `pc-gsm`，活动 / 通知对支部可见（并集口径）；
//   · 实名 id 段互不重叠（甲 710000000x / 乙 720000000x），断言用「整段 JSON 不含对方标识」。
// ════════════════════════════════════════════════════════════════
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../app.js';

const COMMITTEE_ID = 'pc-gsm';

const BRANCHES = [
  {
    id: 'br-a',
    name: '甲支部',
    people: { secretary: '7100000001', participant: '7100000002', org: '7100000003' },
  },
  {
    id: 'br-b',
    name: '乙支部',
    people: { secretary: '7200000001', participant: '7200000002', org: '7200000003' },
  },
];
const PARTY_STAFF = '9000000001';

/** 某支部的全套资源行（id 后缀取支部末位，便于断言「甲看不到乙」） */
function branchFixture({ id, people }) {
  const suffix = id.slice(-1);
  const org = people.org;
  return {
    users: [
      { id: people.secretary, studentId: people.secretary, name: `支书${suffix}`, role: 'secretary', branchId: id, developStage: '正式党员' },
      { id: people.participant, studentId: people.participant, name: `支部成员${suffix}`, role: 'participant', branchId: id, developStage: '正式党员' },
      { id: org, studentId: org, name: `组织委员${suffix}`, role: 'org-commissioner', branchId: id, developStage: '正式党员' },
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
    branchDocs: [
      { id: `bd-${suffix}`, branchId: id, title: `支部资料${suffix}`, fileName: 'doc.pdf', uploadedBy: people.secretary },
    ],
    tasks: [
      { id: `task-${suffix}`, activityId: `act-${suffix}`, title: `支部任务${suffix}` },
    ],
    todos: [
      { id: `todo-${suffix}`, branchId: id, personId: people.participant, role: 'participant', title: `支部待办${suffix}`, status: 'pending' },
    ],
    agendaVotes: [
      { id: `vote-${suffix}`, activityId: `act-${suffix}`, agendaItemId: 'agenda-1', personId: people.participant, position: 'agree' },
    ],
    attendances: [
      { id: `att-${suffix}`, branchId: id, activityId: `act-${suffix}`, personId: people.participant, status: 'present' },
    ],
    memberChangeRequests: [
      { id: `mcr-${suffix}`, branchId: id, activityId: `act-${suffix}`, personId: people.participant, status: 'pending-org-approval' },
    ],
    issues: [
      { id: `issue-${suffix}`, branchId: id, title: `支部反馈${suffix}`, body: '隔离检查', anonymous: true, status: 'open' },
    ],
    archiveRecords: [
      { id: `ar-${suffix}`, branchId: id, title: `支部归档${suffix}`, status: 'archived' },
    ],
  };
}

/** 党委自有内容（活动 / 通知 / 院级资料）：对支部可见的并集行 */
const COMMITTEE_FIXTURE = {
  activities: [
    {
      id: 'act-gsm', ownerScope: 'committee', branchId: COMMITTEE_ID, title: '党委下发活动',
      status: 'published', publishScope: 'branch', targetBranchIds: ['all'], date: '2026-11-02',
    },
  ],
  notices: [
    {
      id: 'ntc-gsm', ownerScope: 'committee', branchId: COMMITTEE_ID, title: '党委下发通知',
      content: '党委内容', kind: 'announcement', audience: ['all'], priority: 'normal',
      // 党委下发通知的落库缺省发布范围是 `login`（见 committee-notices.js）；支部登录后可见。
      publishScope: 'login', source: 'committee', publishDate: '2026-11-02',
    },
  ],
  branchDocs: [
    { id: 'bd-gsm', ownerScope: 'committee', branchId: COMMITTEE_ID, title: '院级资料', fileName: 'gsm.pdf', publishScope: 'login' },
  ],
};

const FIXTURES = BRANCHES.map(branchFixture);

/** 主要读口（路径以实际路由为准：考勤资源是 `/attendances`，归档资源是驼峰 `/archiveRecords`） */
const READ_ENDPOINTS = [
  '/activities',
  '/notices',
  '/branchDocs',
  '/users',
  '/tasks',
  '/todo-groups',
  '/agenda-votes',
  '/attendances',
  '/member-change-requests',
  '/issues',
  '/archiveRecords',
  '/branches',
];

let app;
let server;
let base;
let db;
const tokens = new Map();

before(async () => {
  app = createApp({ dbPath: ':memory:' });
  db = app.locals.db;
  const write = (table, row) => db.prepare(`INSERT OR REPLACE INTO ${table} (id, data) VALUES (?, ?)`)
    .run(row.id, JSON.stringify(row));

  for (const [index, branch] of BRANCHES.entries()) {
    write('branches', { id: branch.id, name: branch.name, status: 'active', secretaryId: branch.people.secretary, config: {} });
    for (const user of FIXTURES[index].users) write('users', user);
  }
  write('users', { id: PARTY_STAFF, studentId: PARTY_STAFF, name: '党委组织员', role: 'party-staff', branchId: null });

  for (const fixture of FIXTURES) {
    for (const row of fixture.activities) write('activities', row);
    for (const row of fixture.notices) write('notices', row);
    for (const row of fixture.branchDocs) write('branch_docs', row);
    for (const row of fixture.tasks) write('tasks', row);
    for (const row of fixture.todos) write('todos', row);
    for (const row of fixture.agendaVotes) write('agenda_votes', row);
    for (const row of fixture.attendances) write('attendances', row);
    for (const row of fixture.memberChangeRequests) write('member_change_requests', row);
    for (const row of fixture.issues) write('issues', row);
    for (const row of fixture.archiveRecords) write('archive_records', row);
  }
  for (const row of COMMITTEE_FIXTURE.activities) write('activities', row);
  for (const row of COMMITTEE_FIXTURE.notices) write('notices', row);
  for (const row of COMMITTEE_FIXTURE.branchDocs) write('branch_docs', row);

  server = app.listen(0);
  base = `http://127.0.0.1:${server.address().port}/api/v1`;
  const personIds = [
    ...BRANCHES.flatMap((branch) => Object.values(branch.people)),
    PARTY_STAFF,
  ];
  for (const personId of personIds) {
    const response = await fetch(`${base}/auth/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ personId, password: '123456' }),
    });
    assert.equal(response.status, 200, `登录失败：${personId}`);
    tokens.set(personId, (await response.json()).token);
  }
});

after(() => {
  server?.close();
  db?.close();
});

async function get(personId, path) {
  const response = await fetch(`${base}${path}`, {
    headers: { Authorization: `Bearer ${tokens.get(personId)}` },
  });
  return { response, body: await response.json() };
}

/** 对方支部的可见标识：branchId、行 id、人员 id —— 整段 JSON 都不得出现 */
function foreignMarkers(branchIndex) {
  const other = BRANCHES[1 - branchIndex];
  const fixture = FIXTURES[1 - branchIndex];
  return [
    other.id,
    ...Object.values(other.people),
    ...fixture.activities.map((row) => row.id),
    ...fixture.notices.map((row) => row.id),
    ...fixture.branchDocs.map((row) => row.id),
    ...fixture.tasks.map((row) => row.id),
    ...fixture.todos.map((row) => row.id),
    ...fixture.agendaVotes.map((row) => row.id),
    ...fixture.attendances.map((row) => row.id),
    ...fixture.memberChangeRequests.map((row) => row.id),
    ...fixture.issues.map((row) => row.id),
    ...fixture.archiveRecords.map((row) => row.id),
  ];
}

function assertNoForeign(body, markers, label) {
  const text = JSON.stringify(body);
  for (const marker of markers) {
    assert.ok(!text.includes(marker), `${label} 泄漏了其他支部标识：${marker}`);
  }
}

/** 支部账号自身可见的本支部行 id（用于证明「读口不是一味返回空」） */
function ownIds(branchIndex, endpoint) {
  const fixture = FIXTURES[branchIndex];
  switch (endpoint) {
    case '/activities': return fixture.activities.map((row) => row.id);
    case '/notices': return fixture.notices.map((row) => row.id);
    case '/branchDocs': return fixture.branchDocs.map((row) => row.id);
    case '/users': return fixture.users.map((row) => row.id);
    case '/tasks': return fixture.tasks.map((row) => row.id);
    case '/agenda-votes': return fixture.agendaVotes.map((row) => row.id);
    case '/attendances': return fixture.attendances.map((row) => row.id);
    case '/member-change-requests': return fixture.memberChangeRequests.map((row) => row.id);
    case '/issues': return fixture.issues.map((row) => row.id);
    case '/archiveRecords': return fixture.archiveRecords.map((row) => row.id);
    case '/branches': return [BRANCHES[branchIndex].id];
    default: return [];
  }
}

for (const [index, branch] of BRANCHES.entries()) {
  test(`${branch.name}账号在全部主要读口读不到另一支部数据`, async () => {
    const markers = foreignMarkers(index);
    for (const endpoint of READ_ENDPOINTS) {
      const { response, body } = await get(branch.people.secretary, endpoint);
      assert.equal(response.status, 200, `${endpoint} 应可读（${branch.name}支书）`);
      assertNoForeign(body, markers, `${branch.name}支书 ${endpoint}`);
    }
  });

  test(`${branch.name}普通成员读口同样不跨支部`, async () => {
    const markers = foreignMarkers(index);
    for (const endpoint of READ_ENDPOINTS) {
      const { response, body } = await get(branch.people.participant, endpoint);
      assert.equal(response.status, 200, `${endpoint} 应可读（${branch.name}成员）`);
      assertNoForeign(body, markers, `${branch.name}成员 ${endpoint}`);
    }
  });

  test(`${branch.name}账号读到的就是本支部行`, async () => {
    for (const endpoint of READ_ENDPOINTS) {
      const { body } = await get(branch.people.secretary, endpoint);
      const ids = new Set((Array.isArray(body) ? body : []).map((row) => row && row.id));
      for (const id of ownIds(index, endpoint)) {
        // 通知 / 活动允许并集（党委行同时出现），本支部行必须命中
        assert.ok(ids.has(id), `${endpoint} 未返回本支部行：${id}`);
      }
    }
  });
}

test('党委账号显式选择支部后只见该支部，未选支部时不展开支部明细', async () => {
  const unselectedActivities = await get(PARTY_STAFF, '/activities');
  assert.deepEqual(unselectedActivities.body.map((row) => row.id), ['act-gsm'], '未选支部：只给党委自有活动');

  const unselectedUsers = await get(PARTY_STAFF, '/users');
  assert.deepEqual(unselectedUsers.body, [], '未选支部：不得展开任何支部名册');

  const unselectedNotices = await get(PARTY_STAFF, '/notices');
  assert.deepEqual(unselectedNotices.body.map((row) => row.id), ['ntc-gsm'], '未选支部：只给党委下发通知');

  const unselectedDocs = await get(PARTY_STAFF, '/branchDocs');
  assert.deepEqual(unselectedDocs.body.map((row) => row.id), ['bd-gsm'], '未选支部：只给院级资料');

  const selectedA = await get(PARTY_STAFF, '/activities?branchId=br-a');
  assert.deepEqual(selectedA.body.map((row) => row.id).sort(), ['act-a', 'act-gsm'], '选甲支部：本支部 + 党委下发');

  const selectedB = await get(PARTY_STAFF, '/activities?branchId=br-b');
  assert.deepEqual(selectedB.body.map((row) => row.id).sort(), ['act-b', 'act-gsm'], '选乙支部：本支部 + 党委下发');

  const rosterA = await get(PARTY_STAFF, '/users?branchId=br-a');
  assert.ok(rosterA.body.every((row) => row.branchId === 'br-a'), '选甲支部：名册只含甲支部成员');
  assert.ok(!rosterA.body.some((row) => row.id === BRANCHES[1].people.secretary), '选甲支部：不得夹带乙支部成员');

  const rosterB = await get(PARTY_STAFF, '/users?branchId=br-b');
  assert.ok(rosterB.body.every((row) => row.branchId === 'br-b'), '选乙支部：名册只含乙支部成员');
  assert.ok(!rosterB.body.some((row) => row.id === BRANCHES[0].people.secretary), '选乙支部：不得夹带甲支部成员');
});

test('支部账号带 ?branchId=<own> 时仍保留党委可见行（并集不被 SQL 下推提前砍掉）', async () => {
  for (const [index, branch] of BRANCHES.entries()) {
    const suffix = branch.id.slice(-1);
    const activities = await get(branch.people.secretary, `/activities?branchId=${branch.id}`);
    assert.equal(activities.response.status, 200);
    assert.deepEqual(
      activities.body.map((row) => row.id).sort(),
      [`act-${suffix}`, 'act-gsm'],
      `${branch.name}：带 branchId 的参数化读口也必须保住党委下发活动`,
    );

    const notices = await get(branch.people.secretary, `/notices?branchId=${branch.id}`);
    assert.equal(notices.response.status, 200);
    assert.deepEqual(
      notices.body.map((row) => row.id).sort(),
      [`ntc-${suffix}`, 'ntc-gsm'],
      `${branch.name}：带 branchId 的参数化读口也必须保住党委下发通知`,
    );

    // 生产单支部 / 旧客户端不带参数时的结果必须与带参一致（仅切换取数路径，不改可见集合）
    const plainActivities = await get(branch.people.secretary, '/activities');
    assert.deepEqual(
      plainActivities.body.map((row) => row.id).sort(),
      activities.body.map((row) => row.id).sort(),
      `${branch.name}：带不带 branchId 的可见集合必须一致（活动）`,
    );
    const plainNotices = await get(branch.people.secretary, '/notices');
    assert.deepEqual(
      plainNotices.body.map((row) => row.id).sort(),
      notices.body.map((row) => row.id).sort(),
      `${branch.name}：带不带 branchId 的可见集合必须一致（通知）`,
    );
  }
});

test('支部账号不能借 ?branchId= 读到其他支部（读门仍在）', async () => {
  const foreign = await get(BRANCHES[0].people.secretary, '/activities?branchId=br-b');
  assert.equal(foreign.response.status, 403, '支部账号跨支部参数一律拒绝');
  const foreignRoster = await get(BRANCHES[0].people.secretary, '/users?branchId=br-b');
  assert.equal(foreignRoster.response.status, 403);
});
