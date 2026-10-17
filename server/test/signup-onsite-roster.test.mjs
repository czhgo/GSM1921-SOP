// 主题党日报名线下意向、专班角色限制与应到名单派生回归；API 使用内存 SQLite。
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../app.js';
import { seedDatabase } from '../seed.js';
import { deriveExpectedRosterIds } from '../../docs/src/services/activity/attendance-roster.js?v=20261017h';

let server;
let base;
let db;
const tokens = {};

before(async () => {
  const app = createApp({ dbPath: ':memory:' });
  await seedDatabase(app.locals.db);
  db = app.locals.db;
  server = app.listen(0);
  base = `http://127.0.0.1:${server.address().port}/api/v1`;
  for (const id of ['p1', 'p2', 'p3', 'p4', 'p5', 'p13']) {
    const response = await fetch(`${base}/auth/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ personId: id, password: '123456' }),
    });
    assert.equal(response.status, 200);
    tokens[id] = (await response.json()).token;
  }
  db.prepare('INSERT INTO activities (id, data) VALUES (?, ?)').run('act-onsite-contract', JSON.stringify({
    id: 'act-onsite-contract', title: '线下意向测试', type: '主题党日', date: '2099-10-17', status: 'published',
    branchId: 'br-b1', organizer: 'p13', assignments: [{ personId: 'p1', role: 'organizer' }, { personId: 'p2', role: 'deep' }],
  }));
  db.prepare('INSERT INTO activities (id, data) VALUES (?, ?)').run('act-formal-roster-contract', JSON.stringify({
    id: 'act-formal-roster-contract', title: '正式会议名单测试', type: '支部党员大会', date: '2099-10-17', status: 'published',
    branchId: 'br-b1', organizer: 'p13', assignments: [{ personId: 'p1', role: 'participant' }],
  }));
  db.prepare('INSERT INTO taskforces (id, data) VALUES (?, ?)').run('tf-no-participant', JSON.stringify({
    id: 'tf-no-participant', name: '不设普通参与者', task: '任务', status: 'recruiting',
    branchId: 'br-b1', initiator: 'p1', deadline: '2099-10-17', members: [],
  }));
});

after(() => {
  server?.closeAllConnections?.();
  return new Promise((resolve) => server?.close(resolve));
});

async function signup(personId, sourceType, sourceId, role, extra = {}) {
  const response = await fetch(`${base}/signups`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokens[personId]}` },
    body: JSON.stringify({ id: `signup-${personId}-${role}-${sourceType}`, sourceType, sourceId, personId, role, ...extra }),
  });
  return { status: response.status, body: await response.json() };
}

async function review(signupId, approve) {
  return fetch(`${base}/signups/${encodeURIComponent(signupId)}`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokens.p13}` },
    body: JSON.stringify({ status: approve ? 'approved' : 'rejected' }),
  });
}

test('主题党日组织者/深度参与者必须选择线下；普通参与者默认线下且不能伪造缺席', async () => {
  const missingChoice = await signup('p1', 'activity', 'act-onsite-contract', 'organizer');
  assert.equal(missingChoice.status, 403);
  const nonOnsite = await signup('p1', 'activity', 'act-onsite-contract', 'organizer', { onsite: false });
  assert.equal(nonOnsite.status, 201);
  assert.equal((await review(nonOnsite.body.id, true)).status, 200);

  const onsite = await signup('p2', 'activity', 'act-onsite-contract', 'deep', { onsite: true });
  assert.equal(onsite.status, 201);
  assert.equal(onsite.body.onsite, true);
  assert.equal((await review(onsite.body.id, true)).status, 200);
  const mutateChoice = await fetch(`${base}/signups/${encodeURIComponent(onsite.body.id)}`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokens.p2}` },
    body: JSON.stringify({ onsite: false }),
  });
  assert.equal(mutateChoice.status, 403, '报名时选择的线下意向不可事后覆盖');

  const ordinary = await signup('p3', 'activity', 'act-onsite-contract', 'participant', { onsite: false });
  assert.equal(ordinary.status, 201);
  assert.equal(ordinary.body.onsite, true, '普通参与报名由服务端固定为线下');
});

test('专班不接受普通参与报名', async () => {
  const result = await signup('p4', 'taskforce', 'tf-no-participant', 'participant');
  assert.equal(result.status, 403);
});

test('三会一课使用正式名单，不开放活动报名', async () => {
  const result = await signup('p4', 'activity', 'act-formal-roster-contract', 'participant');
  assert.equal(result.status, 403);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM signups WHERE id = ?').get('signup-p4-participant-activity').n, 0);
});

test('服务端冻结主题党日名单时合并报名规则并校验最终支部归属', async () => {
  const response = await fetch(`${base}/activities/act-onsite-contract/expected-roster`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokens.p13}` },
    body: JSON.stringify({ frozen: true, personIds: ['p1', 'p4'] }),
  });
  assert.equal(response.status, 200);
  const roster = await response.json();
  assert.deepEqual(roster.personIds, ['p2', 'p3', 'p4']);
  assert.equal(db.prepare('PRAGMA integrity_check').get().integrity_check, 'ok');
});

test('主题党日冻结名单只合并有效线下报名，并从原名单移除明确不线下的工作组成员', () => {
  const activity = {
    id: 'act-roster-rule', type: '主题党日',
    assignments: [{ personId: 'p1', role: 'organizer' }, { personId: 'p2', role: 'deep' }],
  };
  const signups = [
    { sourceType: 'activity', sourceId: activity.id, personId: 'p1', role: 'organizer', status: 'approved', onsite: false },
    { sourceType: 'activity', sourceId: activity.id, personId: 'p2', role: 'deep', status: 'approved', onsite: true },
    { sourceType: 'activity', sourceId: activity.id, personId: 'p3', role: 'participant', status: 'approved' },
    { sourceType: 'activity', sourceId: activity.id, personId: 'p4', role: 'participant', status: 'pending' },
    { sourceType: 'activity', sourceId: activity.id, personId: 'p5', role: 'deep', status: 'rejected', onsite: true },
    { sourceType: 'activity', sourceId: activity.id, personId: 'p6', role: 'participant', status: 'cancelled' },
    { sourceType: 'activity', sourceId: activity.id, personId: 'p7', role: 'participant', status: 'approved', voided: { confirmedBy: 'p13' } },
    { sourceType: 'activity', sourceId: 'other-act', personId: 'p8', role: 'participant', status: 'approved' },
  ];
  assert.deepEqual(deriveExpectedRosterIds({ activity, originalPersonIds: ['p1', 'p1', 'p9'], signups }), ['p2', 'p3', 'p9']);
});

test('三会一课应到名单不受活动报名角色影响', () => {
  const activity = { id: 'act-formal-meeting', type: '党课', assignments: [{ personId: 'p1', role: 'organizer' }] };
  assert.deepEqual(deriveExpectedRosterIds({
    activity, originalPersonIds: ['p1', 'p1', 'p9'],
    signups: [{ sourceType: 'activity', sourceId: activity.id, personId: 'p2', role: 'participant', status: 'approved' }],
  }), ['p1', 'p9']);
});

test('signup API writes and roster merge preserve SQLite integrity', () => {
  assert.equal(db.prepare('PRAGMA integrity_check').get().integrity_check, 'ok');
});
