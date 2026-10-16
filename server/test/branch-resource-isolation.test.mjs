import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../app.js';
import { seedDatabase } from '../seed.js';

let app;
let server;
let base;
let db;
const tokens = new Map();

before(async () => {
  app = createApp({ dbPath: ':memory:' });
  db = app.locals.db;
  await seedDatabase(db);
  const write = (table, row) => db.prepare(`INSERT OR REPLACE INTO ${table} (id, data) VALUES (?, ?)`)
    .run(row.id, JSON.stringify(row));
  write('branches', { id: 'br-b2', name: '第二支部', status: 'active', config: {} });
  write('users', { id: 'p99', name: '第二支部成员', role: 'participant', branchId: 'br-b2' });
  write('activities', { id: 'act-b2', branchId: 'br-b2', title: '第二支部活动', status: 'active', assignments: [] });
  write('tasks', { id: 'task-b2', activityId: 'act-b2', title: '第二支部任务' });
  write('act_sub_records', { id: '__root__', body: {
    'act-11': { note: '本支部子记录' },
    'act-b2': { note: '第二支部子记录' },
  } });
  write('attendance_appeals', { id: 'appeal-b2', branchId: 'br-b2', personId: 'p99', activityId: 'act-b2', status: 'pending' });
  write('issue_unread', { id: 'p99:issue-b2', assigneeId: 'p99', issueId: 'issue-b2', unread: true });
  write('auth_audit', { id: 'auth-b2', targetPersonId: 'p99', role: 'organizer', scopeRef: 'br-b2', action: 'grant' });
  write('member_confirmations', { id: 'mc-b2', personId: 'p99', action: 'stage-change', to: 'secretary', status: 'pending' });
  write('issues', { id: 'issue-b2', branchId: 'br-b2', title: '第二支部反馈', body: '隔离检查', anonymous: true, status: 'open' });
  write('agenda_votes', { id: 'vote-b2', activityId: 'act-b2', agendaItemId: 'agenda-b2', personId: 'p99', position: 'agree' });
  write('member_change_requests', { id: 'mcr-b2', branchId: 'br-b2', activityId: 'act-b2', personId: 'p99', status: 'pending-org-approval' });
  write('committee_broadcasts', { id: 'cb-b2', branchId: 'br-b2', requestId: 'mcr-b2', recipientId: 'p99', status: 'pending' });
  write('workgroups', { id: 'wg-b2', branchId: 'br-b2', kind: 'taskforce', sourceType: 'taskforce', sourceId: 'tf-b2', status: 'active' });
  write('workgroup_members', { id: 'wgm-b2', branchId: 'br-b2', workgroupId: 'wg-b2', personId: 'p99', status: 'active' });
  write('attendance_rosters', { id: 'atr-act-b2', branchId: 'br-b2', activityId: 'act-b2', personIds: ['p99'], frozen: true });
  server = app.listen(0);
  base = `http://127.0.0.1:${server.address().port}/api/v1`;
  for (const personId of ['p13', 'p99', 'p_pc']) {
    const response = await fetch(`${base}/auth/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ personId, password: '123456' }),
    });
    assert.equal(response.status, 200);
    tokens.set(personId, (await response.json()).token);
  }
});

after(() => {
  server?.close();
  db?.close();
});

async function get(personId, path) {
  const response = await fetch(`${base}${path}`, { headers: { Authorization: `Bearer ${tokens.get(personId)}` } });
  return { response, body: await response.json() };
}

async function patch(personId, path, body) {
  return fetch(`${base}${path}`, {
    method: 'PATCH', headers: { Authorization: `Bearer ${tokens.get(personId)}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

test('支部资源列表与 bootstrap 只返回本支部数据，关联记录按来源支部过滤', async () => {
  const activities = await get('p13', '/activities');
  assert.ok(!activities.body.some((row) => row.id === 'act-b2'));
  assert.ok(activities.body.some((row) => row.id === 'act-11'));

  const tasks = await get('p13', '/tasks');
  assert.ok(!tasks.body.some((row) => row.id === 'task-b2'));

  const appeals = await get('p13', '/attendance-appeals');
  assert.ok(!appeals.body.some((row) => row.id === 'appeal-b2'));
  const unread = await get('p13', '/issue-unread');
  assert.ok(!unread.body.some((row) => row.id === 'p99:issue-b2'));
  const audit = await get('p13', '/auth-audit');
  assert.ok(!audit.body.some((row) => row.id === 'auth-b2'));
  const confirmations = await get('p13', '/member-confirmations');
  assert.ok(!confirmations.body.some((row) => row.id === 'mc-b2'));
  const issues = await get('p13', '/issues');
  assert.ok(!issues.body.some((row) => row.id === 'issue-b2'));
  const votes = await get('p13', '/agenda-votes');
  assert.ok(!votes.body.some((row) => row.id === 'vote-b2'));
  assert.ok(!(await get('p13', '/workgroups')).body.some((row) => row.id === 'wg-b2'));
  assert.ok(!(await get('p13', '/workgroup-members')).body.some((row) => row.id === 'wgm-b2'));
  assert.ok(!(await get('p13', '/attendance-rosters')).body.some((row) => row.id === 'atr-act-b2'));
  assert.ok(!(await get('p13', '/committeeBroadcasts')).body.some((row) => row.id === 'cb-b2'));
  assert.ok(!(await get('p13', '/member-change-requests')).body.some((row) => row.id === 'mcr-b2'));

  const root = await get('p13', '/actSubRecords');
  assert.deepEqual(Object.keys(root.body[0].body), ['act-11']);

  const bootstrap = await get('p13', '/bootstrap');
  assert.ok(!bootstrap.body.activities.some((row) => row.id === 'act-b2'));
  assert.ok(!bootstrap.body.users.some((row) => row.id === 'p99'));
  assert.ok(bootstrap.body.users.some((row) => row.id === 'p13'));
  assert.deepEqual(Object.keys(bootstrap.body.actSubRecords[0].body), ['act-11']);
});

test('党委可按支部筛选，也可读取跨支部汇总', async () => {
  const all = await get('p_pc', '/activities');
  assert.ok(all.body.some((row) => row.id === 'act-11'));
  assert.ok(all.body.some((row) => row.id === 'act-b2'));

  const selected = await get('p_pc', '/activities?branchId=br-b2');
  assert.deepEqual(selected.body.map((row) => row.id), ['act-b2']);

  const bootstrap = await get('p_pc', '/bootstrap?branchId=br-b2');
  assert.deepEqual(bootstrap.body.activities.map((row) => row.id), ['act-b2']);
  assert.ok(bootstrap.body.users.some((row) => row.id === 'p99'));
  assert.ok(!bootstrap.body.users.some((row) => row.id === 'p13'));
  const audit = await get('p_pc', '/auth-audit?branchId=br-b2');
  assert.deepEqual(audit.body.map((row) => row.id), ['auth-b2']);
  const votes = await get('p_pc', '/agenda-votes?branchId=br-b2');
  assert.deepEqual(votes.body.map((row) => row.id), ['vote-b2']);
  const report = await get('p_pc', '/report/activity?branchId=br-b2');
  assert.ok(report.body.items.some((row) => row.id === 'act-b2'));
  const branchReport = await get('p13', '/report/activity');
  assert.ok(!branchReport.body.items.some((row) => row.id === 'act-b2'));
  const foreignProgress = await get('p13', '/leader/member-progress?personIds=p99');
  assert.equal(foreignProgress.response.status, 403);
  const partyProgress = await get('p_pc', '/leader/member-progress?personIds=p99&branchId=br-b2');
  assert.equal(partyProgress.response.status, 200);
});

test('支部账号不能通过查询参数或单行接口跨支部读取、改写', async () => {
  const selected = await fetch(`${base}/activities?branchId=br-b2`, {
    headers: { Authorization: `Bearer ${tokens.get('p13')}` },
  });
  assert.equal(selected.status, 403);

  assert.equal((await patch('p13', '/activities/act-b2', { title: '越权修改' })).status, 403);
  assert.equal((await patch('p13', '/tasks/task-b2', { title: '越权修改' })).status, 403);
  const spoof = await fetch(`${base}/tasks`, {
    method: 'POST', headers: { Authorization: `Bearer ${tokens.get('p13')}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: 'task-spoof', branchId: 'br-b2', title: '越权创建' }),
  });
  assert.equal(spoof.status, 403);
  assert.equal(JSON.parse(db.prepare('SELECT data FROM activities WHERE id = ?').get('act-b2').data).title, '第二支部活动');
});

test('第二支部账号能看到本支部资源与成员，不会得到第一支部数据', async () => {
  const activities = await get('p99', '/activities');
  assert.deepEqual(activities.body.map((row) => row.id), ['act-b2']);
  const bootstrap = await get('p99', '/bootstrap');
  assert.ok(bootstrap.body.users.some((row) => row.id === 'p99'));
  assert.ok(!bootstrap.body.users.some((row) => row.id === 'p13'));
  assert.deepEqual(bootstrap.body.activities.map((row) => row.id), ['act-b2']);
});

test('支部局部快照不会覆盖其他支部，并自动标记新建记录归属', async () => {
  const versions = await (await get('p13', '/snapshot/versions')).body;
  const snapshot = await fetch(`${base}/snapshot`, {
    method: 'POST', headers: { Authorization: `Bearer ${tokens.get('p13')}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      tasks: [{ id: 'task-b1-snapshot', title: '本支部快照任务' }],
      _versions: { tasks: versions.tasks || 0 },
    }),
  });
  assert.equal(snapshot.status, 200);
  const storedTasks = db.prepare('SELECT data FROM tasks').all().map((row) => JSON.parse(row.data));
  assert.ok(storedTasks.some((row) => row.id === 'task-b2'), '整表替换须保留第二支部原有任务');
  assert.equal(storedTasks.find((row) => row.id === 'task-b1-snapshot').branchId, 'br-b1');

  const forbidden = await fetch(`${base}/snapshot`, {
    method: 'POST', headers: { Authorization: `Bearer ${tokens.get('p13')}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      tasks: [{ id: 'task-b2', branchId: 'br-b2', activityId: 'act-b2', title: '越权改写' }],
      _versions: { tasks: (await get('p13', '/snapshot/versions')).body.versions.tasks },
    }),
  });
  assert.equal(forbidden.status, 403);
  assert.equal(JSON.parse(db.prepare('SELECT data FROM tasks WHERE id = ?').get('task-b2').data).title, '第二支部任务');
});

test('快照拒绝绕过专用接口改写成员或支部治理记录', async () => {
  const versions = (await get('p13', '/snapshot/versions')).body.versions;
  const memberWrite = await fetch(`${base}/snapshot`, {
    method: 'POST', headers: { Authorization: `Bearer ${tokens.get('p13')}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      users: [{ id: 'p99', branchId: 'br-b1', role: 'secretary', name: '越权改写' }],
      _versions: { users: versions.users || 0 },
    }),
  });
  assert.equal(memberWrite.status, 403);
  assert.equal(JSON.parse(db.prepare('SELECT data FROM users WHERE id = ?').get('p99').data).branchId, 'br-b2');

  const branchVersions = (await get('p_pc', '/snapshot/versions')).body.versions;
  const branchWrite = await fetch(`${base}/snapshot`, {
    method: 'POST', headers: { Authorization: `Bearer ${tokens.get('p_pc')}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      branches: [{ id: 'br-b2', name: '越权改写', status: 'active', config: {} }],
      _versions: { branches: branchVersions.branches || 0 },
    }),
  });
  assert.equal(branchWrite.status, 403);
  assert.equal(JSON.parse(db.prepare('SELECT data FROM branches WHERE id = ?').get('br-b2').data).name, '第二支部');
});

test('聚合子记录的单行接口拒绝跨支部键，并在本支部更新时保留其他支部键', async () => {
  const denied = await patch('p13', '/actSubRecords/__root__', { body: { 'act-b2': { note: '越权' } } });
  assert.equal(denied.status, 403);

  const accepted = await patch('p13', '/actSubRecords/__root__', { body: { 'act-11': { note: '本支部更新' } } });
  assert.equal(accepted.status, 200);
  const root = JSON.parse(db.prepare('SELECT data FROM act_sub_records WHERE id = ?').get('__root__').data);
  assert.equal(root.body['act-11'].note, '本支部更新');
  assert.equal(root.body['act-b2'].note, '第二支部子记录');
});
