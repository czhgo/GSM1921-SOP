// 反馈 / 内部汇报的受众投影（2026-10-21 批次 498 立，批次 500 · B-499-2 扩展）
//   ① 内部汇报（kind='report'）：支委层（五角色）+ 当事人（汇报人 / 被请求人 / 被指派人）
//      + 该汇报所挂活动 / 专班工作组的组织者 + 汇报人所在党小组的组长（leader / deputy-leader）；
//   ② 隐藏反馈：支书层 + 处置人（按人 / 按角色指派）——批次 498 匿名面不变；
//   ③ 汇报的可选父键：只认本支部工作组，跨支部 / 不存在一律拒绝。
// 列表（GET /issues）与直连（canReadIssue / 前端 getById）都必须同一判据。
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../app.js';
import { seedDatabase } from '../seed.js';

let app, server, base;

const SECRETARY = '2300010001';
const MEMBER = '2400012349';
const LEADER = '2400012345';
const ORG = '2400012355';

before(async () => {
  app = createApp({ dbPath: ':memory:' });
  await seedDatabase(app.locals.db);
  server = app.listen(0);
  base = `http://127.0.0.1:${server.address().port}`;
});

after(() => server?.close());

async function login(personId) {
  const res = await fetch(`${base}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ personId, password: '123456' }),
  });
  assert.equal(res.status, 200, `${personId} 应可登录`);
  return (await res.json()).token;
}

const auth = (token) => ({ Authorization: `Bearer ${token}` });

function seedIssue(row) {
  const full = {
    number: 800, branchId: 'br-b1', title: row.id, body: 'body', status: 'open',
    scope: 'report', types: ['progress'], comments: [], participants: [], commentCount: 0,
    ...row,
  };
  app.locals.db.prepare('INSERT OR REPLACE INTO issues (id, data) VALUES (?, ?)').run(full.id, JSON.stringify(full));
  return full;
}

async function listIds(personId) {
  const res = await fetch(`${base}/api/v1/issues`, { headers: auth(await login(personId)) });
  assert.equal(res.status, 200);
  return (await res.json()).map((row) => row.id);
}

test('内部汇报按新受众面收敛；隐藏反馈只给支书层与处置人', async () => {
  seedIssue({ id: 'ap-other-report', kind: 'report', submittedBy: MEMBER, assignee: null });
  seedIssue({ id: 'ap-my-report', kind: 'report', submittedBy: LEADER, assignee: null });
  seedIssue({ id: 'ap-request', kind: 'report', submittedBy: SECRETARY, requestedBy: SECRETARY, assignee: ORG });
  seedIssue({ id: 'ap-hidden', hidden: true, assignee: ORG, kind: undefined });
  seedIssue({ id: 'ap-public', kind: undefined });

  const memberIds = await listIds(MEMBER);
  assert.ok(memberIds.includes('ap-other-report'), '本人汇报应可见');
  assert.ok(memberIds.includes('ap-public'), '公开反馈应可见');
  assert.ok(!memberIds.includes('ap-my-report'), '他人的内部汇报不得可见');
  assert.ok(!memberIds.includes('ap-request'), '被请求人的汇报请求不得对第三人可见');
  assert.ok(!memberIds.includes('ap-hidden'), '隐藏反馈不得对普通成员可见');

  const leaderIds = await listIds(LEADER);
  assert.ok(leaderIds.includes('ap-my-report'), '本人汇报应可见');
  assert.ok(!leaderIds.includes('ap-other-report'), '他人的内部汇报不得可见');
  assert.ok(!leaderIds.includes('ap-hidden'), '隐藏反馈不得对普通成员可见');

  // 与本讨论无关的普通成员（2400012352）——既非当事人、组织者、组长，也非支委层
  const unrelatedIds = await listIds('2400012352');
  assert.ok(unrelatedIds.includes('ap-public'), '公开反馈应可见');
  for (const id of ['ap-other-report', 'ap-my-report', 'ap-request', 'ap-hidden']) {
    assert.ok(!unrelatedIds.includes(id), `无关成员不得读 ${id}`);
  }

  // 组织委员＝支委层：按批次 500 口径可读本支部全部内部汇报（含被指派隐藏行）
  const orgIds = await listIds(ORG);
  for (const id of ['ap-other-report', 'ap-my-report', 'ap-request', 'ap-hidden', 'ap-public']) {
    assert.ok(orgIds.includes(id), `支委层应可见 ${id}`);
  }

  const secretaryIds = await listIds(SECRETARY);
  for (const id of ['ap-other-report', 'ap-my-report', 'ap-request', 'ap-hidden', 'ap-public']) {
    assert.ok(secretaryIds.includes(id), `支书应可见 ${id}`);
  }
});

test('服务端按同一判据拒绝详情越权（列表与详情不出现两套口径）', async () => {
  seedIssue({ id: 'ap-detail-report', kind: 'report', submittedBy: LEADER, assignee: null });
  const memberToken = await login(MEMBER);
  const rows = await (await fetch(`${base}/api/v1/issues`, { headers: auth(memberToken) })).json();
  assert.ok(!rows.some((row) => row.id === 'ap-detail-report'));
  // 出口脱敏不受影响：汇报带名，但真身同族键仍不得出现
  assert.ok(rows.every((row) => !('_realPersonId' in row) && !('submitterId' in row)));
});

// ── 批次 500 · B-499-2：支委层 / 组织者 / 组长 / 当事人 / 无关成员 ──────────
// 固定现场（种子事实，people.js / activities.js / workgroup-seed-sync.js）：
//   · wg-activity-act-1  组织者 2400012347（第一党小组）
//   · wg-activity-act-32 组织者 2400012346（第二党小组组长）
//   · 2400012350 第一党小组；2400012351 第三党小组；2400012349 第二党小组；
//   · 组长：2400012345 第一 / 2400012346 第二 / 2400012348 第三。
const WG_A = 'wg-activity-act-1';
const WG_B = 'wg-activity-act-32';
const ORG_A = '2400012347';
const ORG_B = '2400012346';
const REPORTER_A = '2400012350';
const REPORTER_B = '2400012351';
const LEADER_G1 = '2400012345';
const LEADER_G2 = '2400012346';
const LEADER_G3 = '2400012348';
const UNRELATED = '2400012352';
const ASSIGNEE = '2500010014';
const REQUESTED = '2500010015';

function rowData(table) {
  return app.locals.db.prepare(`SELECT data FROM ${table}`).all().map((row) => JSON.parse(row.data));
}

test('支委层五角色可读本支部全部内部汇报', async () => {
  seedIssue({ id: 'ap-aud-wg-a', kind: 'report', submittedBy: REPORTER_A, workgroupId: WG_A });
  seedIssue({ id: 'ap-aud-wg-b', kind: 'report', submittedBy: REPORTER_B, workgroupId: WG_B });
  seedIssue({ id: 'ap-aud-group', kind: 'report', submittedBy: REPORTER_A });
  seedIssue({ id: 'ap-aud-party', kind: 'report', submittedBy: '2500010001' });
  for (const [personId, role] of [
    ['2300010001', 'secretary'], ['2300010002', 'deputy-secretary'],
    ['2400012355', 'org-commissioner'], ['2400012356', 'prop-commissioner'],
    ['2400012354', 'disc-commissioner'],
  ]) {
    const ids = await listIds(personId);
    for (const id of ['ap-aud-wg-a', 'ap-aud-wg-b', 'ap-aud-group', 'ap-aud-party']) {
      assert.ok(ids.includes(id), `${role}（${personId}）应可读内部汇报 ${id}`);
    }
  }
});

test('工作组组织者：只读本组汇报；非本组组织者读不到', async () => {
  // 现场校验：组织者身份来自 workgroup_members，而不是测试自述
  const members = rowData('workgroup_members');
  assert.ok(members.some((row) => row.workgroupId === WG_A && row.personId === ORG_A
    && row.role === 'organizer' && row.status !== 'removed'), `${WG_A} 应有组织者 ${ORG_A}`);
  assert.ok(members.some((row) => row.workgroupId === WG_B && row.personId === ORG_B
    && row.role === 'organizer' && row.status !== 'removed'), `${WG_B} 应有组织者 ${ORG_B}`);

  const orgAIds = await listIds(ORG_A);
  assert.ok(orgAIds.includes('ap-aud-wg-a'), '本组组织者应可读本组汇报');
  assert.ok(!orgAIds.includes('ap-aud-wg-b'), '非本组组织者不得读其他工作组汇报');
  assert.ok(!orgAIds.includes('ap-aud-group'), '组织者不因身份自动扩到个人汇报');

  const orgBIds = await listIds(ORG_B);
  assert.ok(orgBIds.includes('ap-aud-wg-b'), '本组组织者应可读本组汇报');
  assert.ok(!orgBIds.includes('ap-aud-wg-a'), '非本组组织者不得读其他工作组汇报');
});

test('党小组组长：可读本组成员汇报；非本组组长读不到', async () => {
  const g1 = await listIds(LEADER_G1);
  assert.ok(g1.includes('ap-aud-group'), '第一党小组组长应可读本组组员汇报');
  assert.ok(!g1.includes('ap-aud-party'), '非本组汇报不得扩给组长');

  const g2 = await listIds(LEADER_G2);
  assert.ok(!g2.includes('ap-aud-group'), '第二党小组组长不得读第一党小组组员汇报');
  assert.ok(g2.includes('ap-aud-wg-b'), '本组组织者身份仍应生效');

  const g3 = await listIds(LEADER_G3);
  assert.ok(g3.includes('ap-aud-party'), '第三党小组组长应可读本组组员汇报');
  assert.ok(!g3.includes('ap-aud-group'), '非本组汇报不得扩给组长');
});

test('当事人与无关成员：提交人 / 被指派人 / 被请求人可读；无关成员列表读不到', async () => {
  seedIssue({ id: 'ap-aud-assignee', kind: 'report', submittedBy: '2300010001', assignee: ASSIGNEE });
  seedIssue({ id: 'ap-aud-requested', kind: 'report', submittedBy: '2300010001', requestedBy: REQUESTED });

  assert.ok((await listIds(REPORTER_A)).includes('ap-aud-wg-a'), '汇报人应可读自己的汇报');
  assert.ok((await listIds(ASSIGNEE)).includes('ap-aud-assignee'), '被指派人应可读该条');
  assert.ok((await listIds(REQUESTED)).includes('ap-aud-requested'), '被请求人应可读该条');

  const unrelatedIds = await listIds(UNRELATED);
  for (const id of ['ap-aud-wg-a', 'ap-aud-wg-b', 'ap-aud-group', 'ap-aud-party', 'ap-aud-assignee', 'ap-aud-requested']) {
    assert.ok(!unrelatedIds.includes(id), `无关成员不得读 ${id}`);
  }
});

test('直连判据 canReadIssue：五类支委 / 组织者 / 组长 / 当事人 / 无关成员', async () => {
  const { canReadIssue } = await import('../../docs/src/core/domain/issue-visibility.js?v=20261028d');
  const report = { kind: 'report', submittedBy: REPORTER_A, workgroupId: WG_A };
  // 解析回调按观看者各自绑定（由 server / 前端在每次请求时构造，不是全局常量）
  const accessFor = ({ workgroupId = null, leaderOf = null } = {}) => ({
    isWorkgroupOrganizer: (id) => !!workgroupId && id === workgroupId,
    isPartyGroupLeaderOf: (pid) => !!leaderOf && pid === leaderOf,
  });

  for (const role of ['secretary', 'deputy-secretary', 'org-commissioner', 'prop-commissioner', 'disc-commissioner']) {
    assert.equal(canReadIssue(report, { personId: 'x', role }), true, `${role} 应可读内部汇报`);
  }
  assert.equal(canReadIssue(report, { personId: ORG_A, role: 'participant' }, accessFor({ workgroupId: WG_A })), true, '本组组织者可读');
  assert.equal(canReadIssue(report, { personId: ORG_B, role: 'participant' }, accessFor({ workgroupId: WG_B })), false, '非本组组织者不可读');
  assert.equal(canReadIssue(report, { personId: LEADER_G1, role: 'leader' }, accessFor({ leaderOf: REPORTER_A })), true, '本组组长可读');
  assert.equal(canReadIssue(report, { personId: LEADER_G2, role: 'leader' }, accessFor({ leaderOf: '2500010001' })), false, '非本组组长不可读');
  assert.equal(canReadIssue(report, { personId: REPORTER_A, role: 'participant' }), true, '汇报人可读');
  assert.equal(canReadIssue(report, { personId: UNRELATED, role: 'participant' }), false, '无关成员不可读');

  // 匿名面（批次 498）不变：隐藏反馈仍只给支书层与处置人
  const hidden = { kind: 'feedback', hidden: true, assignee: ASSIGNEE };
  assert.equal(canReadIssue(hidden, { personId: '2300010001', role: 'secretary' }), true);
  assert.equal(canReadIssue(hidden, { personId: ASSIGNEE, role: 'participant' }), true);
  assert.equal(canReadIssue(hidden, { personId: 'x', role: 'org-commissioner' }), false,
    '隐藏反馈不因支委层内部汇报放开而扩大');
});

test('汇总 scope：按工作组 / 党小组过滤，条数与列表同一判据', async () => {
  // 前端范围过滤是纯函数（只读 PersonStore 档案），node 侧补最小存储桩即可直测。
  if (!globalThis.localStorage) {
    const store = new Map();
    globalThis.localStorage = {
      getItem: (k) => (store.has(String(k)) ? store.get(String(k)) : null),
      setItem: (k, v) => store.set(String(k), String(v)),
      removeItem: (k) => { store.delete(String(k)); },
      clear: () => { store.clear(); },
      key: (i) => [...store.keys()][i] ?? null,
      get length() { return store.size; },
    };
  }
  const { filterReportsByScope } = await import('../../docs/src/components/record/report-inbox.js?v=20261028d');
  const rows = [
    { id: 'r-wg-a', kind: 'report', submittedBy: REPORTER_A, workgroupId: WG_A },
    { id: 'r-wg-b', kind: 'report', submittedBy: REPORTER_B, workgroupId: WG_B },
    { id: 'r-parent', kind: 'report', submittedBy: REPORTER_A, sourceType: 'activity', sourceId: 'act-9' },
    { id: 'r-other', kind: 'report', submittedBy: UNRELATED },
  ];
  assert.deepEqual(filterReportsByScope(rows, { workgroupId: WG_A }).map((r) => r.id), ['r-wg-a'],
    '按工作组过滤只留本组');
  assert.deepEqual(filterReportsByScope(rows, { workgroupId: 'wg-activity-act-9' }).map((r) => r.id), ['r-parent'],
    'sourceType/sourceId 还原稳定工作组键');
  assert.deepEqual(filterReportsByScope(rows, { partyGroup: '第一党小组' }).map((r) => r.id),
    ['r-wg-a', 'r-parent'], '按党小组过滤只留本组组员');
  assert.equal(filterReportsByScope(rows, { partyGroup: '第三党小组' }).length, 1, '第三党小组仅一条');
  assert.equal(filterReportsByScope(rows, { workgroupId: 'wg-not-exist' }).length, 0, '无匹配即 0 条（空态 —）');
});

test('前端直连读口 getById 与列表共用同一投影（非本组组织者读不到）', async () => {
  assert.ok(globalThis.localStorage, '上一用例已建存储桩');
  const { mockDB } = await import('../../docs/src/core/domain/domain.js?v=20261028d');
  const { setDataSource } = await import('../../docs/src/data/data-adapter.js?v=20261028d');
  const { IssueStore } = await import('../../docs/src/services/governance/issues.js?v=20261028d');
  setDataSource('mock');
  mockDB.activities = [];
  mockDB.workgroupMembers = [
    { id: 'wgm-a', workgroupId: WG_A, personId: ORG_A, role: 'organizer', status: 'active' },
  ];
  const rows = [
    { id: 'front-wg-a', number: 9101, branchId: 'br-b1', kind: 'report', submittedBy: REPORTER_A, workgroupId: WG_A, status: 'open' },
    { id: 'front-group', number: 9102, branchId: 'br-b1', kind: 'report', submittedBy: REPORTER_A, status: 'open' },
  ];
  IssueStore.clearCache();
  localStorage.setItem('gsm1921-issue-cache-version', '4');
  localStorage.setItem('gsm1921-issue-cache-v3', JSON.stringify(rows));
  await IssueStore.loadAll();

  const loginAs = (personId, role) => localStorage.setItem('gsm1921-login-user', JSON.stringify({ personId, role }));

  loginAs(UNRELATED, 'participant');
  assert.equal(IssueStore.getById('front-wg-a'), undefined, '无关成员直连读不到本组汇报');
  assert.equal(IssueStore.getAll().some((row) => row.id === 'front-wg-a'), false, '无关成员列表同样读不到');

  loginAs(ORG_A, 'participant');
  assert.ok(IssueStore.getById('front-wg-a'), '本组组织者直连可读');
  assert.equal(IssueStore.getById('front-group'), undefined, '组织者不因身份扩到个人汇报');

  loginAs(LEADER_G1, 'leader');
  assert.ok(IssueStore.getById('front-group'), '本组组长直连可读组员汇报');
});



test('一键汇报可选父键：落在本支部工作组上并回读；跨支部/不存在一律拒绝', async () => {
  const wgRow = app.locals.db.prepare('SELECT id, data FROM workgroups').all()
    .map((row) => JSON.parse(row.data))
    .find((row) => row.branchId === 'br-b1');
  assert.ok(wgRow, '种子应有 br-b1 工作组');
  const wg = wgRow;
  const memberToken = await login(MEMBER);

  const okRes = await fetch(`${base}/api/v1/issues`, {
    method: 'POST',
    headers: { ...auth(memberToken), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      kind: 'report', reportCategory: 'blocked', body: '父键汇报正文',
      workgroupId: wg.id, sourceName: '客户端伪造名称不会被采信',
    }),
  });
  assert.equal(okRes.status, 201);
  const created = await okRes.json();
  assert.equal(created.kind, 'report');
  assert.equal(created.workgroupId, wg.id);
  assert.equal(created.sourceType, wg.kind);
  assert.equal(created.sourceId, wg.sourceId);
  assert.notEqual(created.sourceName, '客户端伪造名称不会被采信', '名称按源对象现取');
  assert.equal(created.submittedBy, MEMBER, '汇报必须带名');
  assert.equal(created.title, '【卡点汇报】');

  const missing = await fetch(`${base}/api/v1/issues`, {
    method: 'POST',
    headers: { ...auth(memberToken), 'Content-Type': 'application/json' },
    body: JSON.stringify({ kind: 'report', body: '无此工作组', workgroupId: 'wg-activity-not-exist' }),
  });
  assert.equal(missing.status, 400, '不存在的父键应拒绝');

  // 跨支部父键：把工作组临时改到 br-b2 再试
  const other = { ...wg, id: 'wg-activity-cross', branchId: 'br-b2', sourceId: 'act-cross' };
  app.locals.db.prepare('INSERT OR REPLACE INTO workgroups (id, data) VALUES (?, ?)').run(other.id, JSON.stringify(other));
  const cross = await fetch(`${base}/api/v1/issues`, {
    method: 'POST',
    headers: { ...auth(memberToken), 'Content-Type': 'application/json' },
    body: JSON.stringify({ kind: 'report', body: '跨支部父键', workgroupId: other.id }),
  });
  assert.equal(cross.status, 403, '跨支部父键应拒绝');

  // 个人汇报：不挂父键合法
  const personal = await fetch(`${base}/api/v1/issues`, {
    method: 'POST',
    headers: { ...auth(memberToken), 'Content-Type': 'application/json' },
    body: JSON.stringify({ kind: 'report', reportCategory: 'ask', body: '个人事项，无关联' }),
  });
  assert.equal(personal.status, 201);
  const personalRow = await personal.json();
  assert.equal(personalRow.workgroupId, null);
  assert.equal(personalRow.sourceName, '');
});

test('党委账号不能提交汇报或反馈（支部内闭环）', async () => {
  const partyToken = await login('9000000001');
  const res = await fetch(`${base}/api/v1/issues`, {
    method: 'POST',
    headers: { ...auth(partyToken), 'Content-Type': 'application/json' },
    body: JSON.stringify({ kind: 'report', body: 'x' }),
  });
  assert.equal(res.status, 403);
});
