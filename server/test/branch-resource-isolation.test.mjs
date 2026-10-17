import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createApp } from '../app.js';
import { seedDatabase } from '../seed.js';
import { UPLOAD_DIR } from '../routes/uploads.js';

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
  write('users', { id: 'p98', name: '第二支部书记', role: 'secretary', branchId: 'br-b2' });
  for (const id of ['p1', 'p11', 'p13', 'p98', 'p99']) {
    const raw = db.prepare('SELECT data FROM users WHERE id = ?').get(id);
    const user = raw ? JSON.parse(raw.data) : null;
    if (user) write('users', { ...user, selfProfile: { futureDirection: `protected-${id}` } });
  }
  write('activities', { id: 'act-b2', branchId: 'br-b2', title: '第二支部活动', status: 'active', assignments: [] });
  write('taskforces', { id: 'tf-b2', branchId: 'br-b2', name: '第二支部工作组', task: '测试任务', status: 'recruiting', initiator: 'p98', members: [] });
  write('signups', { id: 'signup-b2-fixture', sourceType: 'taskforce', sourceId: 'tf-b2', personId: 'p98', role: 'participant', status: 'approved' });
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
  write('workgroup_grants', { id: 'wgg-pc-b2', branchId: 'br-b2', workgroupId: 'wg-b2', personId: 'p_pc', status: 'active' });
  write('attendance_rosters', { id: 'atr-act-b2', branchId: 'br-b2', activityId: 'act-b2', personIds: ['p99'], frozen: true });
  server = app.listen(0);
  base = `http://127.0.0.1:${server.address().port}/api/v1`;
  for (const personId of ['p1', 'p11', 'p13', 'p98', 'p99', 'p_pc']) {
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
  const signups = await get('p13', '/signups');
  assert.ok(!signups.body.some((row) => row.id === 'signup-b2-fixture'));
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

test('成员列表与 bootstrap 只向本人及本支部支委投影自我描述', async () => {
  const memberList = await get('p1', '/users');
  const own = memberList.body.find((row) => row.id === 'p1');
  const colleague = memberList.body.find((row) => row.id === 'p13');
  assert.equal(own.selfProfile.futureDirection, 'protected-p1');
  assert.equal(colleague.selfProfile, undefined, '普通成员不得从通用名册读取他人自我描述');
  assert.ok(colleague.name, '脱敏不影响组织所需的基础名册字段');

  const committeeList = await get('p11', '/users');
  assert.equal(committeeList.body.find((row) => row.id === 'p13').selfProfile.futureDirection, 'protected-p13');
  const committeeBootstrap = await get('p11', '/bootstrap');
  assert.equal(committeeBootstrap.body.users.find((row) => row.id === 'p1').selfProfile.futureDirection, 'protected-p1');

  const otherCommittee = await get('p98', '/users');
  assert.equal(otherCommittee.body.find((row) => row.id === 'p99').selfProfile.futureDirection, 'protected-p99');
  assert.ok(!otherCommittee.body.some((row) => row.id === 'p13'), '支部支委仍受支部范围约束');

  const partyStaff = await get('p_pc', '/users?branchId=br-b1');
  assert.ok(partyStaff.body.length > 0, '党委组织员选中支部后读取该支部名册');
  assert.ok(partyStaff.body.every((row) => row.selfProfile === undefined), '党委组织员不得读取支部个人自述');
  const partyBootstrap = await get('p_pc', '/bootstrap?branchId=br-b1');
  assert.ok(partyBootstrap.body.users.every((row) => row.selfProfile === undefined));

  const getProfile = (viewerId, targetId, branchId = '') => get(viewerId,
    `/members/${targetId}/profile${branchId ? `?branchId=${encodeURIComponent(branchId)}` : ''}`);
  const selfProfile = await getProfile('p1', 'p1');
  assert.equal(selfProfile.response.status, 200);
  assert.equal(selfProfile.body.selfProfile.futureDirection, 'protected-p1');
  const committeeProfile = await getProfile('p11', 'p13');
  assert.equal(committeeProfile.response.status, 200);
  assert.equal(committeeProfile.body.selfProfile.futureDirection, 'protected-p13');
  assert.equal((await getProfile('p1', 'p13')).response.status, 403, '普通成员不能打开他人档案');
  assert.equal((await getProfile('p98', 'p13')).response.status, 403, '其他支部支委不能打开本支部档案');
  assert.equal((await getProfile('p_pc', 'p13')).response.status, 403, '党委未选支部时不能打开个人档案');
  const selectedPartyProfile = await getProfile('p_pc', 'p13', 'br-b1');
  assert.equal(selectedPartyProfile.response.status, 200, '党委明确选择所属支部后可只读查看完整档案');
  assert.equal(selectedPartyProfile.body.selfProfile.futureDirection, 'protected-p13');
  assert.equal((await getProfile('p_pc', 'p13', 'br-b2')).response.status, 403, '所选支部与成员归属不一致时拒绝');
  const selectedOtherBranchProfile = await getProfile('p_pc', 'p99', 'br-b2');
  assert.equal(selectedOtherBranchProfile.response.status, 200, '选择第二支部后只读查看该支部档案');
  assert.equal(selectedOtherBranchProfile.body.selfProfile.futureDirection, 'protected-p99');
  assert.equal(db.pragma('integrity_check', { simple: true }), 'ok', '只读档案请求不得损坏数据库');
});

test('党委未选支部时只可读取支部目录，选中后才可读取该支部明细', async () => {
  const all = await get('p_pc', '/activities');
  assert.deepEqual(all.body, [], '无选中支部时不得从通用列表读取任何跨支部活动明细');
  const directory = await get('p_pc', '/branches');
  assert.deepEqual(directory.body.map((row) => row.id).sort(), ['br-b1', 'br-b2']);
  assert.ok(directory.body.every((row) => !row.secretaryId && !row.config?.policyOverrides), '未选择时目录仅保留选支部所需的基本信息');
  const secondBranchSummary = directory.body.find((row) => row.id === 'br-b2').summary;
  assert.equal(secondBranchSummary.memberCount, 2);
  assert.equal(secondBranchSummary.activityCount, 1);
  assert.ok(Object.values(secondBranchSummary).every((value) => typeof value === 'number'), '跨支部只提供数字汇总，不暴露人员或活动明细');
  const unselectedBootstrap = await get('p_pc', '/bootstrap');
  assert.deepEqual(unselectedBootstrap.body.activities, []);
  assert.deepEqual(unselectedBootstrap.body.users, []);
  assert.deepEqual(Object.keys(unselectedBootstrap.body.actSubRecords[0].body), [], '聚合子记录也不得绕过支部选择');
  assert.deepEqual((await get('p_pc', '/workgroups')).body, []);
  assert.deepEqual((await get('p_pc', '/workgroup-grants')).body, [], '党委未选支部时不能读工作组授权留痕');
  assert.equal((await get('p_pc', '/workgroups/wg-b2/members')).response.status, 400);
  assert.equal((await get('p_pc', '/activities/act-b2/expected-roster')).response.status, 400);

  const selected = await get('p_pc', '/activities?branchId=br-b2');
  assert.deepEqual(selected.body.map((row) => row.id), ['act-b2']);
  assert.equal((await get('p_pc', '/workgroups/wg-b2/members?branchId=br-b2')).response.status, 200);
  assert.equal((await get('p_pc', '/workgroups/wg-b2/members?branchId=br-b1')).response.status, 403);
  const scopedGrants = await get('p_pc', '/workgroup-grants?branchId=br-b2');
  assert.deepEqual(scopedGrants.body.map((row) => row.id), ['wgg-pc-b2']);

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
  const unselectedProgress = await get('p_pc', '/leader/member-progress?personIds=p99');
  assert.equal(unselectedProgress.response.status, 400, '跨支部个人进展须先选中一个支部');
  const unselectedReport = await get('p_pc', '/report/activity');
  assert.equal(unselectedReport.response.status, 400, '明细型报表须先选中一个支部');
});

test('党委下载附件必须选择其所属支部，不能用文件 URL 绕过支部范围', async () => {
  const name = `branch-scope-${Date.now()}.pdf`;
  const rel = `/api/v1/uploads/${name}`;
  const fullPath = path.join(UPLOAD_DIR, name);
  fs.writeFileSync(fullPath, 'scope-check');
  db.prepare('INSERT INTO attachments (id, filename, path, size, uploaded_by, uploaded_at) VALUES (?, ?, ?, ?, ?, ?)')
    .run(`attachment-${name}`, name, rel, 12, 'p99', new Date().toISOString());
  try {
    const download = `${base}/uploads/${name}`;
    const unselected = await fetch(download, { headers: { Authorization: `Bearer ${tokens.get('p_pc')}` } });
    assert.equal(unselected.status, 400, '未选支部时不得直接下载跨支部附件');
    const wrongBranch = await fetch(`${download}?branchId=br-b1`, { headers: { Authorization: `Bearer ${tokens.get('p_pc')}` } });
    assert.equal(wrongBranch.status, 403, '附件上传人支部与选中支部不同必须拒绝');
    const correctBranch = await fetch(`${download}?branchId=br-b2`, { headers: { Authorization: `Bearer ${tokens.get('p_pc')}` } });
    assert.equal(correctBranch.status, 200);
    assert.equal(await correctBranch.text(), 'scope-check');
  } finally {
    db.prepare('DELETE FROM attachments WHERE path = ?').run(rel);
    fs.rmSync(fullPath, { force: true });
  }
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

test('报名写入按来源支部、本人身份和业务状态变更逐项授权', async () => {
  const headers = (personId) => ({ Authorization: `Bearer ${tokens.get(personId)}`, 'Content-Type': 'application/json' });
  const foreignSource = await fetch(`${base}/signups`, {
    method: 'POST', headers: headers('p99'),
    body: JSON.stringify({ id: 'signup-cross-branch', sourceType: 'activity', sourceId: 'act-11', personId: 'p99', role: 'participant', status: 'approved' }),
  });
  assert.equal(foreignSource.status, 403, '不能把本支部报名挂到其他支部活动');

  const impersonation = await fetch(`${base}/signups`, {
    method: 'POST', headers: headers('p99'),
    body: JSON.stringify({ id: 'signup-impersonation', sourceType: 'activity', sourceId: 'act-b2', personId: 'p13', role: 'participant', status: 'approved' }),
  });
  assert.equal(impersonation.status, 403, '不能替其他成员报名');

  const spoofStatus = await fetch(`${base}/signups`, {
    method: 'POST', headers: headers('p99'),
    body: JSON.stringify({ id: 'signup-status-spoof', sourceType: 'activity', sourceId: 'act-b2', personId: 'p99', role: 'organizer', status: 'approved', reviewedBy: 'p99', reviewedAt: '2026-01-01' }),
  });
  assert.equal(spoofStatus.status, 403, '报名人不能自批 organizer/deep 报名');

  const create = await fetch(`${base}/signups`, {
    method: 'POST', headers: headers('p99'),
    body: JSON.stringify({ id: 'signup-b2-pending', sourceType: 'taskforce', sourceId: 'tf-b2', personId: 'p99', role: 'organizer', status: 'pending', reviewedBy: null, reviewedAt: null }),
  });
  assert.equal(create.status, 201);
  const created = await create.json();
  assert.equal(created.branchId, 'br-b2');
  assert.equal(created.status, 'pending');

  const memberReview = await patch('p99', '/signups/signup-b2-pending', { status: 'approved', reviewedBy: 'p99', reviewedAt: '2026-01-01' });
  assert.equal(memberReview.status, 403, '普通成员不能审核报名');
  const secretaryReview = await patch('p98', '/signups/signup-b2-pending', { status: 'approved' });
  assert.equal(secretaryReview.status, 200, '本支部书记可以审核报名');
  const reviewed = await secretaryReview.json();
  assert.equal(reviewed.reviewedBy, 'p98', '审核人由服务端填入');
});

test('报名快照不能伪造报名人、状态或移除留痕记录', async () => {
  const versions = (await get('p99', '/snapshot/versions')).body.versions;
  const current = (await get('p99', '/signups')).body;
  const apiHeaders = { Authorization: `Bearer ${tokens.get('p99')}`, 'Content-Type': 'application/json' };
  const spoof = await fetch(`${base}/snapshot`, {
    method: 'POST', headers: apiHeaders,
    body: JSON.stringify({
      signups: [...current, { id: 'signup-snapshot-spoof', sourceType: 'activity', sourceId: 'act-b2', personId: 'p13', role: 'participant', status: 'approved' }],
      _versions: { signups: versions.signups || 0 },
    }),
  });
  assert.equal(spoof.status, 403, '快照不能冒名创建报名');

  const removed = await fetch(`${base}/snapshot`, {
    method: 'POST', headers: apiHeaders,
    body: JSON.stringify({ signups: [], _versions: { signups: versions.signups || 0 } }),
  });
  assert.equal(removed.status, 403, '快照不能物理删除报名留痕');
});

test('系统通知的业务来源按资源精确校验支部，不能借未列举资源越界', async () => {
  const response = await fetch(`${base}/system-notices`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokens.get('p13')}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      kind: 'record-void-decided', sourceId: 'task-b2',
      payload: { resource: 'tasks', label: '第二支部任务', decision: 'confirmed', reason: '跨支部测试' },
    }),
  });
  assert.equal(response.status, 403, '支部支委不能为其他支部业务记录生成通知');
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
