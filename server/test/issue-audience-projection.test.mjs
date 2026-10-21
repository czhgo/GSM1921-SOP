// 反馈 / 内部汇报的受众投影（2026-10-21 批次 498 · 支书裁定）
//   ① 内部汇报（kind='report'）：支书层 + 当事人（汇报人 / 被请求人 / 被指派人）；
//   ② 隐藏反馈：支书层 + 处置人（按人 / 按角色指派）；
//   ③ 汇报的可选父键：只认本支部工作组，跨支部 / 不存在一律拒绝。
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

test('内部汇报只给支书层与当事人；隐藏反馈只给支书层与处置人', async () => {
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

  const orgIds = await listIds(ORG);
  assert.ok(orgIds.includes('ap-request'), '被指派人应可见请其汇报的请求');
  assert.ok(orgIds.includes('ap-hidden'), '处置人应可见隐藏行');
  assert.ok(!orgIds.includes('ap-other-report'), '未被指派的汇报不得可见');

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
