// role: [工程师]+[AI]
// committee-proposal-routes.test.mjs — 支委提案 API 权限 / 状态机 / 回执（D-869）
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../app.js';

const BRANCHES = [
  { id: 'br-b1', name: '本科第一党支部', type: '本科生', status: 'active', createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'br-b2', name: '本科第二党支部', type: '本科生', status: 'active', createdAt: '2026-01-01T00:00:00.000Z' },
];
const USERS = [
  { id: 'sec-1', name: '支书', studentId: '2300010001', role: 'secretary', branchId: 'br-b1', developStage: '正式党员', partyGroup: '第一党小组' },
  { id: 'org-1', name: '组织委员', studentId: '2300010002', role: 'org-commissioner', branchId: 'br-b1', developStage: '正式党员', partyGroup: '第一党小组' },
  { id: 'leader-1', name: '组长', studentId: '2400012345', role: 'leader', branchId: 'br-b1', developStage: '正式党员', partyGroup: '第一党小组' },
  { id: 'mem-1', name: '成员', studentId: '2400012349', role: 'participant', branchId: 'br-b1', developStage: '正式党员', partyGroup: '第一党小组' },
  { id: 'sec-2', name: '外支部支书', studentId: '2300010003', role: 'secretary', branchId: 'br-b2', developStage: '正式党员', partyGroup: '第二党小组' },
];

let app, server, base, db;
const tokens = {};
const call = (token, method, path, body) => fetch(`${base}${path}`, {
  method,
  headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  ...(body ? { body: JSON.stringify(body) } : {}),
});

before(async () => {
  app = createApp({ dbPath: ':memory:' });
  db = app.locals.db;
  const ib = db.prepare('INSERT INTO branches (id, data) VALUES (?, ?)');
  for (const b of BRANCHES) ib.run(b.id, JSON.stringify(b));
  const iu = db.prepare('INSERT INTO users (id, data) VALUES (?, ?)');
  for (const u of USERS) iu.run(u.id, JSON.stringify(u));
  db.prepare('INSERT INTO activities (id, data) VALUES (?, ?)').run('act-meeting-1', JSON.stringify({
    id: 'act-meeting-1', branchId: 'br-b1', title: '六月支委会', type: '支委会', date: '2026-06-10',
    status: 'published', organizingScope: 'branch', hostGroupId: null, agenda: [], createdAt: '2026-06-01T00:00:00.000Z',
  }));
  server = app.listen(0);
  base = `http://127.0.0.1:${server.address().port}`;
  for (const u of USERS) {
    const res = await call(null, 'POST', '/api/v1/auth/login', { personId: u.id, password: '123456' });
    assert.equal(res.status, 200, `登录失败：${u.id}`);
    tokens[u.id] = (await res.json()).token;
  }
});

after(() => server.close());

test('组长可提交新事项提案；支委可见、普通成员不可见', async () => {
  const res = await call(tokens['leader-1'], 'POST', '/api/v1/committee/proposals', {
    title: '申请支部级主题党日', reason: '需要全支部参与', sourceType: 'activity',
    draft: { title: '支部级主题党日', type: '主题党日', date: '2026-07-01' }, suggestedType: 'decision',
  });
  assert.equal(res.status, 201);
  const row = await res.json();
  assert.equal(row.status, 'pending');
  assert.equal(row.branchId, 'br-b1');
  assert.equal(row.proposedBy, 'leader-1');

  const committee = await (await call(tokens['org-1'], 'GET', '/api/v1/committee/proposals')).json();
  assert.equal(committee.length, 1);
  const member = await (await call(tokens['mem-1'], 'GET', '/api/v1/committee/proposals')).json();
  assert.equal(member.length, 0);

  const foreign = await call(tokens['sec-2'], 'GET', `/api/v1/committee/proposals/${row.id}`);
  assert.equal(foreign.status, 404, '跨支部不可见');
});

test('受理 → 排期 → 决议通过：写议程并生成草案活动', async () => {
  const list = await (await call(tokens['leader-1'], 'GET', '/api/v1/committee/proposals')).json();
  const id = list[0].id;
  assert.equal((await call(tokens['org-1'], 'PATCH', `/api/v1/committee/proposals/${id}`, { action: 'accept' })).status, 200);
  assert.equal((await call(tokens['org-1'], 'PATCH', `/api/v1/committee/proposals/${id}`, { action: 'schedule', meetingActivityId: 'act-meeting-1' })).status, 403, '普通支委不能排期');
  const scheduled = await (await call(tokens['sec-1'], 'PATCH', `/api/v1/committee/proposals/${id}`, { action: 'schedule', meetingActivityId: 'act-meeting-1' })).json();
  assert.equal(scheduled.status, 'on-agenda');
  const meeting = JSON.parse(db.prepare("SELECT data FROM activities WHERE id='act-meeting-1'").get().data);
  assert.ok(meeting.agenda.some((a) => a.proposalId === id), '提案须写入会议议程');
  const decided = await (await call(tokens['sec-1'], 'PATCH', `/api/v1/committee/proposals/${id}`, { action: 'decide', result: 'passed', note: '同意' })).json();
  assert.equal(decided.status, 'decided');
  assert.ok(decided.sourceId, '通过后须生成草案活动并回指 sourceId');
  const created = db.prepare('SELECT data FROM activities WHERE id = ?').get(decided.sourceId);
  assert.ok(created, '草案活动须落库');
});

test('驳回必须写理由；决议后回执落库到提案人', async () => {
  const created = await (await call(tokens['leader-1'], 'POST', '/api/v1/committee/proposals', {
    title: '第二个提案', reason: '测试驳回', sourceType: 'taskforce', draft: { name: '测试专班', task: '测试' }, suggestedType: 'discussion',
  })).json();
  assert.equal((await call(tokens['org-1'], 'PATCH', `/api/v1/committee/proposals/${created.id}`, { action: 'reject' })).status, 400);
  assert.equal((await call(tokens['org-1'], 'PATCH', `/api/v1/committee/proposals/${created.id}`, { action: 'reject', note: '不属于支部事项' })).status, 200);
  const notices = db.prepare("SELECT data FROM notices WHERE json_extract(data,'$.systemKind') LIKE 'committee-proposal-%'").all()
    .map((r) => JSON.parse(r.data));
  assert.ok(notices.length >= 2, `应有提案回执，实测 ${notices.length}`);
  assert.ok(notices.some((n) => (n.audiencePersons || []).includes('leader-1')), '提案人须收到回执');
});
