// role: [工程师]+[AI]
// committee-flow-guard.test.mjs — 提案 ↔ 议程单一事实（D-869 / 本批 P0-1）
//
// 判据：
//   F1 排期 ⇒ 会议议程出现 kinds:['proposal'] 且 proposalId 对上；
//   F2 决议 ⇒ 提案 decided 且会议议程项 result 已回写（同一事务、同值）；
//   F3 重复决议 ⇒ 400，且不新增第二份 draft 活动；
//   F4 受影响人可读提案（D-867 决议受众含受影响人）。
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../app.js';

const BRANCHES = [
  { id: 'br-b1', name: '本科第一党支部', type: '本科生', status: 'active', createdAt: '2026-01-01T00:00:00.000Z' },
];
const USERS = [
  { id: 'sec-1', name: '支书', studentId: '2300010001', role: 'secretary', branchId: 'br-b1', developStage: '正式党员', partyGroup: '第一党小组' },
  { id: 'org-1', name: '组织委员', studentId: '2300010002', role: 'org-commissioner', branchId: 'br-b1', developStage: '正式党员', partyGroup: '第一党小组' },
  { id: 'leader-1', name: '组长', studentId: '2400012345', role: 'leader', branchId: 'br-b1', developStage: '正式党员', partyGroup: '第一党小组' },
  { id: 'mem-1', name: '成员', studentId: '2400012349', role: 'participant', branchId: 'br-b1', developStage: '正式党员', partyGroup: '第一党小组' },
];

let app, server, base, db;
const tokens = {};
const call = (token, method, path, body) => fetch(`${base}${path}`, {
  method,
  headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  ...(body ? { body: JSON.stringify(body) } : {}),
});
const readMeeting = () => JSON.parse(db.prepare("SELECT data FROM activities WHERE id='act-meeting-1'").get().data);

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

test('F1-F3 排期写议程、决议回写议程、重复决议不生成第二份草案', async () => {
  const created = await (await call(tokens['leader-1'], 'POST', '/api/v1/committee/proposals', {
    title: '申请支部级主题党日', reason: '需要全支部参与', sourceType: 'activity',
    draft: { title: '支部级主题党日', type: '主题党日', date: '2026-07-01' }, suggestedType: 'decision',
  })).json();

  assert.equal((await call(tokens['org-1'], 'PATCH', `/api/v1/committee/proposals/${created.id}`, { action: 'accept' })).status, 200);
  const scheduled = await (await call(tokens['sec-1'], 'PATCH', `/api/v1/committee/proposals/${created.id}`, {
    action: 'schedule', meetingActivityId: 'act-meeting-1',
  })).json();
  assert.equal(scheduled.status, 'on-agenda');
  const agendaItem = readMeeting().agenda.find((a) => a.proposalId === created.id);
  assert.ok(agendaItem, 'F1 排期后会议议程须含该提案');
  assert.deepEqual(agendaItem.kinds, ['proposal'], 'F1 议程项 kinds 须为 proposal');

  const decided = await (await call(tokens['sec-1'], 'PATCH', `/api/v1/committee/proposals/${created.id}`, {
    action: 'decide', result: 'passed', note: '同意',
  })).json();
  assert.equal(decided.status, 'decided');
  assert.ok(decided.sourceId, 'F2 通过后须生成草案并回指 sourceId');
  const afterDecide = readMeeting().agenda.find((a) => a.proposalId === created.id);
  assert.equal(afterDecide.result, 'passed', 'F2 决议须同事务回写会议议程项 result');
  assert.equal(afterDecide.recordedBy, 'sec-1', 'F2 议程项须留记录人');

  const again = await call(tokens['sec-1'], 'PATCH', `/api/v1/committee/proposals/${created.id}`, {
    action: 'decide', result: 'passed', note: '重复',
  });
  assert.equal(again.status, 400, 'F3 已决议提案不得再次决议');
  const drafts = db.prepare("SELECT data FROM activities WHERE json_extract(data,'$.sourceProposalId') = ?").all(created.id);
  assert.equal(drafts.length, 1, 'F3 重复决议不得生成第二份草案');
});

test('F4 受影响人可读提案', async () => {
  const created = await (await call(tokens['leader-1'], 'POST', '/api/v1/committee/proposals', {
    title: '成员事项', reason: '涉及本人', sourceType: 'member', sourceId: 'mem-1', suggestedType: 'discussion',
  })).json();
  const res = await call(tokens['mem-1'], 'GET', `/api/v1/committee/proposals/${created.id}`);
  assert.equal(res.status, 200, 'F4 受影响人（sourceId 指向本人）应可读提案');
});