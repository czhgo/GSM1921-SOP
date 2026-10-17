// 工作组领域/API 安全回归：工作组成员与系统授权分开，支部归属由服务端复算。
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../app.js';
import { seedDatabase } from '../seed.js';

let server, base, db;
const tokens = {};

before(async () => {
  const app = createApp({ dbPath: ':memory:' });
  await seedDatabase(app.locals.db);
  db = app.locals.db;
  server = app.listen(0);
  base = `http://127.0.0.1:${server.address().port}`;
  for (const id of ['p1', 'p2', 'p10', 'p13', 'p14', 'p5', 'p8', 'p11', 'p_pc']) {
    const response = await fetch(`${base}/api/v1/auth/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ personId: id, password: '123456' }),
    });
    assert.equal(response.status, 200);
    tokens[id] = (await response.json()).token;
  }
  db.prepare('INSERT INTO users (id, data) VALUES (?, ?)').run('p_b2', JSON.stringify({ id: 'p_b2', name: '异支部成员', role: 'participant', branchId: 'br-b2' }));
  db.prepare('INSERT INTO branches (id, data) VALUES (?, ?)').run('br-b2', JSON.stringify({ id: 'br-b2', name: '第二支部', status: 'active' }));
});

after(() => {
  server?.closeAllConnections?.();
  return new Promise((resolve) => server?.close(resolve));
});

async function request(path, personId, method = 'GET', body) {
  const response = await fetch(`${base}/api/v1/${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokens[personId]}` },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const contentType = response.headers.get('content-type') || '';
  const data = response.status === 204 ? null : contentType.includes('application/json') ? await response.json() : await response.text();
  return { response, data };
}

async function createGroupActivity(personId, payload = {}) {
  return request('activities', personId, 'POST', {
    title: '组内活动权限测试', type: '党小组会', date: '2026-10-20', status: 'planned', branchId: 'br-b1',
    organizingScope: 'party-group', hostGroupId: 'pg-1', hostGroup: '第一党小组',
    assignments: [{ personId: 'p1', role: 'organizer' }, { personId: 'p5', role: 'deep' }],
    ...payload,
  });
}

test('组长只能从本人党小组创建组内活动，组内范围不限制跨组参加者', async () => {
  const own = await createGroupActivity('p1');
  assert.equal(own.response.status, 201);
  assert.equal(own.data.organizingScope, 'party-group');
  assert.equal(own.data.hostGroupId, 'pg-1');
  assert.ok(own.data.workgroupId);
  const group = db.prepare('SELECT data FROM workgroups WHERE id = ?').get(own.data.workgroupId);
  assert.equal(JSON.parse(group.data).sourceId, own.data.id);
  const deep = db.prepare('SELECT data FROM workgroup_members').all().map((row) => JSON.parse(row.data))
    .find((row) => row.workgroupId === own.data.workgroupId && row.personId === 'p5');
  assert.equal(deep.role, 'deep');

  const otherGroup = await createGroupActivity('p1', { hostGroupId: 'pg-2', hostGroup: '第二党小组' });
  assert.equal(otherGroup.response.status, 403);
  const crossAsLeader = await createGroupActivity('p1', { organizingScope: 'cross-group', hostGroupId: null, hostGroup: '' });
  assert.equal(crossAsLeader.response.status, 403);
});

test('工作组成员只登记组织者与深度参与者，普通活动参与者必须留在报名域', async () => {
  const activity = await createGroupActivity('p1');
  assert.equal(activity.response.status, 201);
  const activityParticipant = await request(`workgroups/${activity.data.workgroupId}/members`, 'p1', 'POST', {
    personId: 'p8', role: 'participant',
  });
  assert.equal(activityParticipant.response.status, 400);

  const taskforce = await request('taskforces', 'p11', 'POST', {
    name: '专班成员边界', task: '只登记做事角色', status: 'recruiting', branchId: 'br-b1', members: [],
  });
  assert.equal(taskforce.response.status, 201);
  const taskforceParticipant = await request(`workgroups/${taskforce.data.workgroupId}/members`, 'p11', 'POST', {
    personId: 'p8', role: 'participant',
  });
  assert.equal(taskforceParticipant.response.status, 400);
});

test('正式会议保留显式名单，但不把名单成员登记为工作组成员', async () => {
  const meeting = await request('activities', 'p13', 'POST', {
    title: '支部党员大会正式名单', type: '支部党员大会', date: '2026-10-23', status: 'published', branchId: 'br-b1',
    assignments: [{ personId: 'p8', role: 'participant' }],
  });
  assert.equal(meeting.response.status, 201);
  assert.deepEqual(meeting.data.assignments, [{ personId: 'p8', role: 'participant' }]);
  const membership = db.prepare('SELECT data FROM workgroup_members').all().map((row) => JSON.parse(row.data));
  assert.equal(membership.some((row) => row.workgroupId === meeting.data.workgroupId && row.personId === 'p8'), false);

  const topicDayParticipant = await request('activities', 'p13', 'POST', {
    title: '主题党日不得把普通参与人写进角色数组', type: '主题党日', date: '2026-10-24', status: 'published', branchId: 'br-b1',
    assignments: [{ personId: 'p8', role: 'participant' }],
  });
  assert.equal(topicDayParticipant.response.status, 400);
});

test('党小组会考勤记录人角色仍受活动承办党小组范围限制', async () => {
  const activity = await createGroupActivity('p1');
  assert.equal(activity.response.status, 201);

  const otherGroupLeader = await request('attendances', 'p2', 'POST', {
    activityId: activity.data.id, personId: 'p3', status: 'present',
  });
  assert.equal(otherGroupLeader.response.status, 403, '其他党小组组长不能因角色映射而跨组录入');

  const inspectionCommissioner = await request('attendances', 'p10', 'POST', {
    activityId: activity.data.id, personId: 'p3', status: 'present',
  });
  assert.equal(inspectionCommissioner.response.status, 403, '纪检委员不能越过会议记录人规则录入党小组会');

  const hostGroupLeader = await request('attendances', 'p1', 'POST', {
    activityId: activity.data.id, personId: 'p3', status: 'present',
  });
  assert.equal(hostGroupLeader.response.status, 201, '承办党小组组长仍可登记本组活动考勤');

  const committeeMeeting = await request('activities', 'p13', 'POST', {
    title: '支委会不设考勤', type: '支委会', date: '2026-10-23', status: 'published', branchId: 'br-b1',
    organizingScope: 'cross-group', hostGroupId: null, assignments: [],
  });
  assert.equal(committeeMeeting.response.status, 201);
  const forbiddenAttendance = await request('attendances', 'p13', 'POST', {
    activityId: committeeMeeting.data.id, personId: 'p3', status: 'present',
  });
  assert.equal(forbiddenAttendance.response.status, 403, '不设考勤的会议类型不得由书记例外写入');
});

test('跨组活动由书记/副书记创建；参与者的党小组归属不受活动承办范围限制', async () => {
  const created = await request('activities', 'p13', 'POST', {
    title: '跨组筹办测试', type: '主题党日', date: '2026-10-21', status: 'planned', branchId: 'br-b1',
    organizingScope: 'cross-group', hostGroupId: null, hostGroup: '',
    assignments: [{ personId: 'p13', role: 'organizer' }, { personId: 'p2', role: 'deep' }],
  });
  assert.equal(created.response.status, 201);
  assert.equal(created.data.organizingScope, 'cross-group');
  assert.equal(created.data.hostGroupId, null);
  assert.ok(created.data.workgroupId);
  assert.ok(db.prepare('SELECT data FROM workgroup_members').all().map((row) => JSON.parse(row.data))
    .some((row) => row.workgroupId === created.data.workgroupId && row.personId === 'p2'));
  const deputy = await request('activities', 'p14', 'POST', {
    title: '跨组字段不可伪造创建者', type: '主题党日', date: '2026-10-22', status: 'planned', branchId: 'br-b1',
    organizingScope: 'cross-group', hostGroupId: null, hostGroup: '', organizer: 'p14', assignments: [],
  });
  assert.equal(deputy.response.status, 201);
  const crossGroupMeeting = await request('activities', 'p13', 'POST', {
    title: '不应作为跨组活动的党小组会', type: '党小组会', date: '2026-10-22',
    organizingScope: 'cross-group', hostGroupId: null, assignments: [],
  });
  assert.equal(crossGroupMeeting.response.status, 403, '党小组会必须有唯一所属党小组承办');

  const normalMember = await request('activities', 'p5', 'POST', {
    title: '无权活动', type: '主题党日', date: '2026-10-22', organizingScope: 'cross-group', assignments: [],
  });
  assert.equal(normalMember.response.status, 403);
  const unrelatedLeader = await request(`activities/${created.data.id}`, 'p1', 'PATCH', { title: '组长越权改跨组活动' });
  assert.equal(unrelatedLeader.response.status, 403);
  const changeScope = await request(`activities/${created.data.id}`, 'p13', 'PATCH', {
    organizingScope: 'party-group', hostGroupId: 'pg-1',
  });
  assert.equal(changeScope.response.status, 400, '承办责任范围创建后不可改写');
});

test('书记旧客户端未传承办范围时按跨组归属写入活动与工作组', async () => {
  const created = await request('activities', 'p13', 'POST', {
    title: '旧客户端线上支委会', type: '支委会', date: '2026-10-20', status: 'published', branchId: 'br-b1',
    assignments: [{ personId: 'p13', role: 'organizer' }],
  });
  assert.equal(created.response.status, 201);
  assert.equal(created.data.organizingScope, 'cross-group');
  assert.equal(created.data.hostGroupId, null);
  const workgroup = JSON.parse(db.prepare('SELECT data FROM workgroups WHERE id = ?').get(created.data.workgroupId).data);
  assert.equal(workgroup.organizingScope, 'cross-group', '承办范围持久化到活动工作组');
  assert.equal(workgroup.hostGroupId, null);
});

test('工作组成员关系独立于权限；异支部成员与快照伪造授权均被拒绝或忽略', async () => {
  const created = await createGroupActivity('p1');
  assert.equal(created.response.status, 201);
  const member = await request(`workgroups/${created.data.workgroupId}/members`, 'p1', 'POST', {
    personId: 'p8', role: 'deep', branchId: 'br-b1',
  });
  assert.equal(member.response.status, 201);
  const firstGrant = await request(`workgroups/${created.data.workgroupId}/grants`, 'p1', 'POST', {
    personId: 'p8', templateKey: 'deep', permissionKeys: ['activity.edit'], reason: '移出前权限',
  });
  assert.equal(firstGrant.response.status, 201);
  const memberCanEdit = await request(`activities/${created.data.id}`, 'p8', 'PATCH', { title: '移出前可修改' });
  assert.equal(memberCanEdit.response.status, 200);
  const removed = await request(`workgroups/${created.data.workgroupId}/members/p8`, 'p1', 'DELETE');
  assert.equal(removed.response.status, 204);
  const sourceAfterRemoval = JSON.parse(db.prepare('SELECT data FROM activities WHERE id = ?').get(created.data.id).data);
  assert.ok(!sourceAfterRemoval.assignments.some((item) => item.personId === 'p8'), '旧活动角色字段同步移除');
  const memberAfterRemoval = JSON.parse(db.prepare('SELECT data FROM workgroup_members WHERE id = ?')
    .get(`wgm-${encodeURIComponent(created.data.workgroupId)}-${encodeURIComponent('p8')}`).data);
  assert.equal(memberAfterRemoval.status, 'removed');
  const revokedGrant = JSON.parse(db.prepare('SELECT data FROM workgroup_grants WHERE id = ?').get(firstGrant.data.id).data);
  assert.equal(revokedGrant.status, 'revoked', '移出成员时一并撤回其全部有效授权');
  assert.equal(revokedGrant.revokedBy, 'p1');
  assert.ok(revokedGrant.revokedAt);
  const memberAfterRemovalCannotEdit = await request(`activities/${created.data.id}`, 'p8', 'PATCH', { title: '移出后不得修改' });
  assert.notEqual(memberAfterRemovalCannotEdit.response.status, 200);
  const memberAgain = await request(`workgroups/${created.data.workgroupId}/members`, 'p1', 'POST', { personId: 'p8', role: 'deep' });
  assert.equal(memberAgain.response.status, 200, '重新加入恢复同一关系记录');
  const grants = await request(`workgroups/${created.data.workgroupId}/grants`, 'p1');
  assert.equal(grants.response.status, 200);
  assert.equal(grants.data.length, 1, '保留撤回留痕；重新加入不会复活旧授权');
  assert.equal(grants.data[0].status, 'revoked');
  const rejoinedCannotEdit = await request(`activities/${created.data.id}`, 'p8', 'PATCH', { title: '重新加入不恢复权限' });
  assert.notEqual(rejoinedCannotEdit.response.status, 200);

  const crossBranch = await request(`workgroups/${created.data.workgroupId}/members`, 'p1', 'POST', {
    personId: 'p_b2', role: 'deep', branchId: 'br-b1',
  });
  assert.equal(crossBranch.response.status, 403);

  const memberBeforeGrant = await request(`activities/${created.data.id}`, 'p8', 'PATCH', { title: '未授权不能修改' });
  assert.notEqual(memberBeforeGrant.response.status, 200, '工作组成员身份本身不授予活动写权');
  const grant = await request(`workgroups/${created.data.workgroupId}/grants`, 'p1', 'POST', {
    personId: 'p8', templateKey: 'deep', permissionKeys: ['activity.edit'], reason: '按活动职责调整模板权限',
  });
  assert.equal(grant.response.status, 201);
  assert.equal(grant.data.grantedBy, 'p1');
  assert.deepEqual(grant.data.permissionKeys, ['activity.edit']);
  const memberAfterGrant = await request(`activities/${created.data.id}`, 'p8', 'PATCH', { title: '授权后可修改' });
  assert.equal(memberAfterGrant.response.status, 200);
  const memberGrant = await request(`workgroups/${created.data.workgroupId}/grants`, 'p5', 'POST', {
    personId: 'p8', permissionKeys: ['activity.edit'], reason: '越权测试',
  });
  assert.equal(memberGrant.response.status, 403);

  const bypass = await request('snapshot', 'p1', 'POST', {
    workgroupGrants: [{ id: 'forged', workgroupId: created.data.workgroupId, personId: 'p5', permissions: ['*'] }],
  });
  assert.equal(bypass.response.status, 403);
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM workgroup_grants WHERE id = 'forged'").get().n, 0);
});

test('成员批量保存会原子替换成员与授权，移除时撤权，重新加入不复活旧授权', async () => {
  const created = await createGroupActivity('p1');
  assert.equal(created.response.status, 201);
  const workgroupId = created.data.workgroupId;
  const originalGrant = await request(`workgroups/${workgroupId}/grants`, 'p1', 'POST', {
    personId: 'p5', templateKey: 'deep', permissionKeys: ['task.complete'], reason: '原深度参与授权',
  });
  assert.equal(originalGrant.response.status, 201);

  const replaced = await request(`workgroups/${workgroupId}/members`, 'p1', 'PUT', {
    members: [{ personId: 'p8', role: 'deep', templateKey: 'deep', permissionKeys: ['task.complete'], reason: '承担任务' }],
  });
  assert.equal(replaced.response.status, 200);
  const rows = db.prepare('SELECT data FROM workgroup_members').all().map((row) => JSON.parse(row.data))
    .filter((row) => row.workgroupId === workgroupId);
  assert.deepEqual(rows.filter((row) => row.status === 'active').map((row) => [row.personId, row.role]), [['p8', 'deep']]);
  const mirrored = JSON.parse(db.prepare('SELECT data FROM activities WHERE id = ?').get(created.data.id).data);
  assert.deepEqual(mirrored.assignments.filter((row) => ['organizer', 'deep'].includes(row.role)), [{ personId: 'p8', role: 'deep' }]);
  assert.equal(mirrored.organizer, null);
  const grants = (await request(`workgroups/${workgroupId}/grants`, 'p1')).data;
  assert.equal(grants.find((row) => row.id === originalGrant.data.id).status, 'revoked');
  assert.equal(grants.find((row) => row.personId === 'p8' && row.status === 'active').grantedBy, 'p1');
  const memberIdentityDoesNotGrantUnlistedPermission = await request(`activities/${created.data.id}`, 'p8', 'PATCH', { title: '只获得任务权限' });
  assert.notEqual(memberIdentityDoesNotGrantUnlistedPermission.response.status, 200);

  const readded = await request(`workgroups/${workgroupId}/members`, 'p1', 'PUT', {
    members: [{ personId: 'p5', role: 'deep', permissionKeys: [] }],
  });
  assert.equal(readded.response.status, 200);
  const finalGrants = (await request(`workgroups/${workgroupId}/grants`, 'p1')).data;
  assert.equal(finalGrants.filter((row) => row.personId === 'p5' && row.status === 'active').length, 0);
  assert.equal(finalGrants.find((row) => row.id === originalGrant.data.id).status, 'revoked');
});

test('成员批量保存先验证全部条目与审计字段，非法末项不会部分写入', async () => {
  const created = await createGroupActivity('p1');
  assert.equal(created.response.status, 201);
  const workgroupId = created.data.workgroupId;
  const capture = () => ({
    activity: db.prepare('SELECT data FROM activities WHERE id = ?').get(created.data.id)?.data,
    members: db.prepare('SELECT id, data FROM workgroup_members ORDER BY id').all()
      .filter((row) => JSON.parse(row.data).workgroupId === workgroupId),
    grants: db.prepare('SELECT id, data FROM workgroup_grants ORDER BY id').all()
      .filter((row) => JSON.parse(row.data).workgroupId === workgroupId),
    versions: db.prepare('SELECT name, version FROM collection_versions ORDER BY name').all()
      .filter((row) => ['activities', 'workgroup_members', 'workgroup_grants'].includes(row.name)),
  });
  const before = capture();

  const wrongBranchLast = await request(`workgroups/${workgroupId}/members`, 'p1', 'PUT', {
    members: [
      { personId: 'p8', role: 'deep', permissionKeys: ['task.complete'] },
      { personId: 'p_b2', role: 'deep', permissionKeys: [] },
    ],
  });
  assert.equal(wrongBranchLast.response.status, 403);
  assert.deepEqual(capture(), before);

  const forgedAudit = await request(`workgroups/${workgroupId}/members`, 'p1', 'PUT', {
    members: [{ personId: 'p8', role: 'deep', permissionKeys: ['task.complete'], grantedBy: 'p8' }],
  });
  assert.equal(forgedAudit.response.status, 400);
  assert.deepEqual(capture(), before);
});

test('成员与授权批量保存中的数据库失败会回滚所有表及集合版本', async () => {
  const created = await createGroupActivity('p1');
  assert.equal(created.response.status, 201);
  const workgroupId = created.data.workgroupId;
  const capture = () => ({
    activity: db.prepare('SELECT data FROM activities WHERE id = ?').get(created.data.id)?.data,
    members: db.prepare('SELECT id, data FROM workgroup_members ORDER BY id').all()
      .filter((row) => JSON.parse(row.data).workgroupId === workgroupId),
    grants: db.prepare('SELECT id, data FROM workgroup_grants ORDER BY id').all()
      .filter((row) => JSON.parse(row.data).workgroupId === workgroupId),
    versions: db.prepare('SELECT name, version FROM collection_versions ORDER BY name').all()
      .filter((row) => ['activities', 'workgroup_members', 'workgroup_grants'].includes(row.name)),
  });
  const before = capture();
  db.exec(`CREATE TRIGGER force_workgroup_batch_rollback BEFORE INSERT ON workgroup_grants
    WHEN json_extract(NEW.data, '$.reason') = 'force rollback'
    BEGIN SELECT RAISE(ABORT, 'forced workgroup batch failure'); END;`);
  let failed;
  const oldConsoleError = console.error;
  console.error = () => {};
  try {
    failed = await request(`workgroups/${workgroupId}/members`, 'p1', 'PUT', {
      members: [{ personId: 'p8', role: 'deep', permissionKeys: ['task.complete'], reason: 'force rollback' }],
    });
  } finally {
    console.error = oldConsoleError;
    db.exec('DROP TRIGGER IF EXISTS force_workgroup_batch_rollback');
  }
  assert.equal(failed.response.status, 500);
  assert.deepEqual(capture(), before);
  assert.equal(db.pragma('integrity_check', { simple: true }), 'ok');
});

test('专班批量保存只接收做事成员，并保留旧 participant 历史行', async () => {
  const created = await request('taskforces', 'p11', 'POST', {
    name: '批量编辑专班', task: '专班只做事', status: 'recruiting', branchId: 'br-b1', members: [],
  });
  assert.equal(created.response.status, 201);
  const taskforce = JSON.parse(db.prepare('SELECT data FROM taskforces WHERE id = ?').get(created.data.id).data);
  taskforce.members = [{ personId: 'p8', role: 'participant', contributions: ['历史贡献待核'] }];
  db.prepare('UPDATE taskforces SET data = ? WHERE id = ?').run(JSON.stringify(taskforce), taskforce.id);

  const saved = await request(`workgroups/${created.data.workgroupId}/members`, 'p11', 'PUT', {
    members: [{ personId: 'p11', role: 'organizer', permissionKeys: [] }],
  });
  assert.equal(saved.response.status, 200);
  const mirrored = JSON.parse(db.prepare('SELECT data FROM taskforces WHERE id = ?').get(taskforce.id).data);
  assert.ok(mirrored.members.some((row) => row.personId === 'p8' && row.role === 'participant'
    && row.contributions.includes('历史贡献待核')));
  assert.ok(mirrored.members.some((row) => row.personId === 'p11' && row.role === 'organizer'));
  const activeParticipantMembers = db.prepare('SELECT data FROM workgroup_members').all().map((row) => JSON.parse(row.data))
    .filter((row) => row.workgroupId === created.data.workgroupId && row.personId === 'p8' && row.status === 'active');
  assert.equal(activeParticipantMembers.length, 0, '旧 participant 不会变成权限成员');

  const participantDenied = await request(`workgroups/${created.data.workgroupId}/members`, 'p11', 'PUT', {
    members: [{ personId: 'p8', role: 'participant', permissionKeys: [] }],
  });
  assert.equal(participantDenied.response.status, 400);
});

test('专班成员、支部归属和工作组映射不能经通用快照绕过语义接口', async () => {
  const created = await request('taskforces', 'p11', 'POST', {
    name: '快照边界工作组', task: '保护成员与支部关系', status: 'recruiting', branchId: 'br-b1', members: [],
  });
  assert.equal(created.response.status, 201);
  const hardDelete = await request(`taskforces/${created.data.id}`, 'p11', 'DELETE');
  assert.equal(hardDelete.response.status, 409, '工作组语义主记录不得物理删除，撤销须留痕');
  const versionReply = await request('snapshot/versions', 'p11');
  assert.equal(versionReply.response.status, 200);
  const baseline = db.prepare('SELECT id, data FROM taskforces').all().map((row) => ({ id: row.id, ...JSON.parse(row.data) }));
  const write = async (taskforces) => request('snapshot', 'p11', 'POST', {
    taskforces, _versions: { taskforces: versionReply.data.versions.taskforces },
  });
  const memberBypass = await write(baseline.map((row) => row.id === created.data.id
    ? { ...row, members: [{ personId: 'p2', role: 'deep' }] } : row));
  assert.equal(memberBypass.response.status, 403);
  assert.match(memberBypass.data.error, /成员.*语义接口/);
  const branchBypass = await write(baseline.map((row) => row.id === created.data.id ? { ...row, branchId: 'br-b2' } : row));
  assert.equal(branchBypass.response.status, 403);
  assert.match(branchBypass.data.error, /支部归属创建后不可修改/);
  const mappingBypass = await write(baseline.map((row) => row.id === created.data.id ? { ...row, workgroupId: 'wg-taskforce-forged' } : row));
  assert.equal(mappingBypass.response.status, 403);
  assert.match(mappingBypass.data.error, /工作组关联创建后不可修改/);
  const createBypass = await write([...baseline, {
    id: 'tf-snapshot-forged', name: '伪造工作组', task: '不应走快照创建', branchId: 'br-b1', members: [], status: 'recruiting',
  }]);
  assert.equal(createBypass.response.status, 403);
  assert.match(createBypass.data.error, /语义创建接口/);
});

test('应到名单快照只接受同支部成员，且活动关联需属于该活动支部', async () => {
  const created = await createGroupActivity('p1');
  assert.equal(created.response.status, 201);
  const frozen = await request(`activities/${created.data.id}/expected-roster`, 'p13', 'PUT', {
    personIds: ['p5', 'p1', 'p1'], frozen: true,
  });
  assert.equal(frozen.response.status, 200);
  assert.deepEqual(frozen.data.personIds.sort(), ['p1', 'p5']);
  assert.equal(frozen.data.frozen, true);

  const wrongBranch = await request(`activities/${created.data.id}/expected-roster`, 'p13', 'PUT', {
    personIds: ['p_b2'], frozen: true,
  });
  assert.equal(wrongBranch.response.status, 403);
});

test('任务与产出可关联能力包和同支部活动；跨支部引用、未知包及重复 ID 均拒绝', async () => {
  const activity = await createGroupActivity('p1');
  assert.equal(activity.response.status, 201);
  const task = await request(`workgroups/${activity.data.workgroupId}/tasks`, 'p1', 'POST', {
    id: 'task-safe-id', title: '同支部活动筹备任务', activityId: activity.data.id,
    capabilityPackageId: 'activity-organization',
  });
  assert.equal(task.response.status, 201);
  assert.equal(task.data.activityId, activity.data.id);
  assert.equal(task.data.capabilityPackageId, 'activity-organization');
  const duplicate = await request(`workgroups/${activity.data.workgroupId}/tasks`, 'p1', 'POST', {
    id: 'task-safe-id', title: '不得覆盖既有任务',
  });
  assert.equal(duplicate.response.status, 409);
  const unknownPackage = await request(`workgroups/${activity.data.workgroupId}/tasks`, 'p1', 'POST', {
    title: '未知能力包不得落库', capabilityPackageId: 'invented-package',
  });
  assert.equal(unknownPackage.response.status, 400);

  const output = await request(`workgroups/${activity.data.workgroupId}/outputs`, 'p1', 'POST', {
    title: '活动总结', taskId: task.data.id, activityId: activity.data.id,
    capabilityPackageId: 'activity-organization',
  });
  assert.equal(output.response.status, 201);
  assert.equal(output.data.taskId, task.data.id);

  db.prepare('INSERT INTO activities (id, data) VALUES (?, ?)').run('act-other-branch', JSON.stringify({
    id: 'act-other-branch', title: '异支部活动', branchId: 'br-b2', organizingScope: 'cross-group',
  }));
  const wrongBranch = await request(`workgroups/${activity.data.workgroupId}/outputs`, 'p1', 'POST', {
    title: '不得跨支部关联', activityId: 'act-other-branch',
  });
  assert.equal(wrongBranch.response.status, 403);
});

test('独立工作组按任务治理：无制度/议程表决依据时可以直接进入招募', async () => {
  const missingTask = await request('taskforces', 'p11', 'POST', {
    name: '无任务不应建组', status: 'active', branchId: 'br-b1', members: [],
  });
  assert.equal(missingTask.response.status, 400);

  const created = await request('taskforces', 'p11', 'POST', {
    name: '材料归档工作组', task: '按本月计划收集并归档材料', status: 'recruiting',
    branchId: 'br-b1', members: [], governanceRequired: false,
  });
  assert.equal(created.response.status, 201);
  assert.equal(created.data.status, 'recruiting');
  assert.equal(created.data.governanceRequired, false);
  const group = JSON.parse(db.prepare('SELECT data FROM workgroups WHERE id = ?').get(created.data.workgroupId).data);
  assert.equal(group.status, 'recruiting');
  assert.equal(group.kind, 'taskforce');
});

test('工作组解散仅在有制度或议程依据时提交表决，否则直接结束并留痕', async () => {
  const direct = await request('taskforces', 'p11', 'POST', {
    name: '直接结束工作组', task: '归档材料', status: 'active', branchId: 'br-b1', members: [],
  });
  assert.equal(direct.response.status, 201);

  const versions = await request('snapshot/versions', 'p11');
  assert.equal(versions.response.status, 200);
  const taskforces = db.prepare('SELECT id, data FROM taskforces').all().map((row) => ({ id: row.id, ...JSON.parse(row.data) }))
    .map((row) => row.id === direct.data.id ? { ...row, status: 'archived' } : row);
  const snapshotArchiveBypass = await request('snapshot', 'p11', 'POST', {
    taskforces, _versions: { taskforces: versions.data.versions.taskforces },
  });
  assert.equal(snapshotArchiveBypass.response.status, 403, '快照也不得绕过工作组语义收尾入口');
  assert.match(snapshotArchiveBypass.data.error, /收尾接口/);

  const legacyArchiveBypass = await request(`taskforces/${direct.data.id}`, 'p11', 'PATCH', { status: 'archived' });
  assert.equal(legacyArchiveBypass.response.status, 409, '通用状态更新不得绕过任务/产出闭合与事项治理收尾');
  assert.match(legacyArchiveBypass.data.error, /收尾接口/);

  const tasks = await request(`workgroups/${direct.data.workgroupId}/tasks`, 'p11');
  assert.equal(tasks.response.status, 200);
  assert.equal(tasks.data.length, 1, '工作组的登记事项应成为可跟踪的主任务');
  assert.equal(tasks.data[0].title, '归档材料');
  assert.equal(tasks.data[0].status, 'open');

  const blocked = await request(`taskforces/${direct.data.id}/dissolution`, 'p11', 'POST', {
    requiresCommitteeVote: false, note: '主任务尚未完成',
  });
  assert.equal(blocked.response.status, 409);
  assert.match(blocked.data.error, /任务尚未闭合/);

  const unauthorized = await request(`workgroups/${direct.data.workgroupId}/tasks/${tasks.data[0].id}`, 'p1', 'PATCH', {
    status: 'completed',
  });
  assert.equal(unauthorized.response.status, 403);
  const output = await request(`workgroups/${direct.data.workgroupId}/outputs`, 'p11', 'POST', {
    title: '归档清单', taskId: tasks.data[0].id,
  });
  assert.equal(output.response.status, 201);
  const completed = await request(`workgroups/${direct.data.workgroupId}/tasks/${tasks.data[0].id}`, 'p11', 'PATCH', {
    status: 'completed',
  });
  assert.equal(completed.response.status, 200);
  assert.equal(completed.data.status, 'completed');
  assert.equal(completed.data.completedBy, 'p11');
  const reopen = await request(`workgroups/${direct.data.workgroupId}/tasks/${tasks.data[0].id}`, 'p11', 'PATCH', { status: 'open' });
  assert.equal(reopen.response.status, 400, '任务闭合后不得经状态接口重新打开');

  const draftOutput = {
    id: 'wgo-close-blocker', branchId: 'br-b1', workgroupId: direct.data.workgroupId,
    taskId: tasks.data[0].id, title: '尚未登记完成的产出', status: 'draft',
  };
  db.prepare('INSERT INTO workgroup_outputs (id, data) VALUES (?, ?)').run(draftOutput.id, JSON.stringify(draftOutput));
  const blockedByOutput = await request(`taskforces/${direct.data.id}/dissolution`, 'p11', 'POST', {
    requiresCommitteeVote: false,
  });
  assert.equal(blockedByOutput.response.status, 409);
  assert.match(blockedByOutput.data.error, /产出尚未完成登记/);
  db.prepare('UPDATE workgroup_outputs SET data = ? WHERE id = ?').run(
    JSON.stringify({ ...draftOutput, status: 'submitted' }), draftOutput.id,
  );

  const closed = await request(`taskforces/${direct.data.id}/dissolution`, 'p11', 'POST', {
    requiresCommitteeVote: false, note: '登记任务已完成',
  });
  assert.equal(closed.response.status, 200);
  assert.equal(closed.data.taskforce.status, 'dissolved');
  assert.equal(closed.data.taskforce.dissolvedBy, 'p11');
  assert.equal(closed.data.taskforce.lifecycleEvents.at(-1).kind, 'dissolution-direct');
  const closedWorkgroup = JSON.parse(db.prepare('SELECT data FROM workgroups WHERE id = ?').get(direct.data.workgroupId).data);
  assert.equal(closedWorkgroup.status, 'dissolved');
  assert.ok(db.prepare('SELECT id FROM workgroup_outputs WHERE id = ?').get(output.data.id), '收尾后产出历史保留');
  const addClosedTask = await request(`workgroups/${direct.data.workgroupId}/tasks`, 'p11', 'POST', { title: '结束后不得加任务' });
  assert.equal(addClosedTask.response.status, 409, '工作组结束后任务历史只读');
  const addClosedOutput = await request(`workgroups/${direct.data.workgroupId}/outputs`, 'p11', 'POST', { title: '结束后不得加产出' });
  assert.equal(addClosedOutput.response.status, 409, '工作组结束后产出历史只读');
  const addClosedMember = await request(`workgroups/${direct.data.workgroupId}/members`, 'p11', 'POST', { personId: 'p8', role: 'deep' });
  assert.equal(addClosedMember.response.status, 409, '工作组结束后成员历史只读');

  const voted = await request('taskforces', 'p11', 'POST', {
    name: '需表决工作组', task: '制度要求集体决定', status: 'active', branchId: 'br-b1', members: [],
  });
  assert.equal(voted.response.status, 201);
  const voteTask = (await request(`workgroups/${voted.data.workgroupId}/tasks`, 'p11')).data[0];
  const missingBasis = await request(`taskforces/${voted.data.id}/dissolution`, 'p11', 'POST', {
    requiresCommitteeVote: true,
  });
  assert.equal(missingBasis.response.status, 400);
  const voteBlocked = await request(`taskforces/${voted.data.id}/dissolution`, 'p11', 'POST', {
    requiresCommitteeVote: true, governanceReason: '本事项适用支委会议事规则第 X 条',
  });
  assert.equal(voteBlocked.response.status, 409, '有表决依据也不能跳过尚未闭合的登记任务');
  await request(`workgroups/${voted.data.workgroupId}/tasks/${voteTask.id}`, 'p11', 'PATCH', { status: 'completed' });
  const submitted = await request(`taskforces/${voted.data.id}/dissolution`, 'p11', 'POST', {
    requiresCommitteeVote: true, governanceReason: '本事项适用支委会议事规则第 X 条',
  });
  assert.equal(submitted.response.status, 200);
  assert.equal(submitted.data.taskforce.status, 'active');
  assert.equal(submitted.data.taskforce.committeeRequest.kind, 'dissolve');
  assert.equal(submitted.data.taskforce.committeeRequest.note, '本事项适用支委会议事规则第 X 条');

  const member = await request(`taskforces/${voted.data.id}/dissolution`, 'p1', 'POST', {
    requiresCommitteeVote: false,
  });
  assert.equal(member.response.status, 403);

  const voteVersions = await request('snapshot/versions', 'p11');
  const votedRows = db.prepare('SELECT id, data FROM taskforces').all().map((row) => ({ id: row.id, ...JSON.parse(row.data) }))
    .map((row) => row.id === voted.data.id ? {
      ...row, status: 'dissolved', committeeRequest: null,
      committeeDecision: [...(row.committeeDecision || []), {
        kind: 'dissolve', decision: 'approved', decisionRef: 'mtg-vote-agenda-item',
      }],
    } : row);
  const approvedSnapshot = await request('snapshot', 'p11', 'POST', {
    taskforces: votedRows, _versions: { taskforces: voteVersions.data.versions.taskforces },
  });
  assert.equal(approvedSnapshot.response.status, 200, '已排入且通过的解散议案可经受控快照落果');
  const votedWorkgroup = JSON.parse(db.prepare('SELECT data FROM workgroups WHERE id = ?').get(voted.data.workgroupId).data);
  assert.equal(votedWorkgroup.status, 'dissolved', '表决通过后工作组主记录必须与专班状态同步收尾');
});

test('旧专班首次查看任务时幂等迁移主任务，待闭合工作组不得跳过登记事项', async () => {
  const old = {
    id: 'tf-legacy-close', name: '旧材料组', task: '整理历史材料', status: 'active', branchId: 'br-b1',
    workgroupId: 'wg-taskforce-tf-legacy-close', createdBy: 'p11', createdAt: '2026-01-01T00:00:00.000Z',
  };
  db.prepare('INSERT INTO taskforces (id, data) VALUES (?, ?)').run(old.id, JSON.stringify(old));
  db.prepare('INSERT INTO workgroups (id, data) VALUES (?, ?)').run(old.workgroupId, JSON.stringify({
    id: old.workgroupId, branchId: 'br-b1', kind: 'taskforce', sourceType: 'taskforce', sourceId: old.id, status: 'active',
  }));
  const firstRead = await request(`workgroups/${old.workgroupId}/tasks`, 'p11');
  const secondRead = await request(`workgroups/${old.workgroupId}/tasks`, 'p11');
  assert.equal(firstRead.response.status, 200);
  assert.equal(firstRead.data.length, 1);
  assert.equal(secondRead.data.length, 1, '重复读取不得重复生成迁移任务');
  assert.equal(firstRead.data[0].title, old.task);
  assert.equal(firstRead.data[0].migratedFrom, 'taskforce.task');
  const close = await request(`taskforces/${old.id}/dissolution`, 'p11', 'POST', { requiresCommitteeVote: false });
  assert.equal(close.response.status, 409);
});

test('停用专班能力后停止新开，既有任务仍可完成，结束后记录只读保留', async () => {
  const created = await request('taskforces', 'p11', 'POST', {
    name: '既有工作组收尾', task: '完成已登记工作', status: 'active', branchId: 'br-b1', members: [],
  });
  assert.equal(created.response.status, 201);
  const tasks = await request(`workgroups/${created.data.workgroupId}/tasks`, 'p11');
  assert.equal(tasks.response.status, 200);
  const purpose = tasks.data.find((task) => task.isPurpose);
  assert.ok(purpose);

  const selected = await request('branches/br-b1/config', 'p13', 'PATCH', {
    config: { capabilityPackages: { schemaVersion: 1, packages: {
      'taskforce-workgroup': { version: '1.0.0', enabled: false },
    } } },
  });
  assert.equal(selected.response.status, 200);

  const newTask = await request(`workgroups/${created.data.workgroupId}/tasks`, 'p11', 'POST', { title: '关闭能力后新开的任务' });
  assert.equal(newTask.response.status, 409);
  const unlinkedOutput = await request(`workgroups/${created.data.workgroupId}/outputs`, 'p11', 'POST', { title: '无任务关联的产出' });
  assert.equal(unlinkedOutput.response.status, 409);
  const output = await request(`workgroups/${created.data.workgroupId}/outputs`, 'p11', 'POST', {
    title: '在办任务收尾产出', taskId: purpose.id,
  });
  assert.equal(output.response.status, 201);

  const completed = await request(`workgroups/${created.data.workgroupId}/tasks/${purpose.id}`, 'p11', 'PATCH', { status: 'completed' });
  assert.equal(completed.response.status, 200, '停用后允许完成已登记任务');
  const closed = await request(`taskforces/${created.data.id}/dissolution`, 'p11', 'POST', { requiresCommitteeVote: false });
  assert.equal(closed.response.status, 200);
  const stillReadable = await request(`workgroups/${created.data.workgroupId}/tasks`, 'p11');
  assert.equal(stillReadable.response.status, 200, '已结束工作组历史仍可查');
  const mutateHistory = await request(`workgroups/${created.data.workgroupId}/members`, 'p11', 'POST', { personId: 'p8', role: 'deep' });
  assert.equal(mutateHistory.response.status, 409, '停用能力包后不能改写已结束工作组历史');
});

test('支部自主停用本地能力包后禁止新建工作组，党委不能代替支部改选', async () => {
  const selected = await request('branches/br-b1/config', 'p13', 'PATCH', {
    config: { capabilityPackages: { schemaVersion: 1, packages: {
      'taskforce-workgroup': { version: '1.0.0', enabled: false },
    } } },
  });
  assert.equal(selected.response.status, 200);
  assert.equal(selected.data.config.capabilityPackages.packages['taskforce-workgroup'].enabled, false);

  const denied = await request('taskforces', 'p11', 'POST', {
    name: '停用后不得新建', task: '不应创建', status: 'active', branchId: 'br-b1', members: [],
  });
  assert.equal(denied.response.status, 403);

  const crossOwner = await request('branches/br-b1/config', 'p_pc', 'PATCH', {
    config: { capabilityPackages: { schemaVersion: 1, packages: {
      'taskforce-workgroup': { version: '1.0.0', enabled: true },
    } } },
  });
  assert.equal(crossOwner.response.status, 403, '党委维护目录与模板，不替支部选择运行能力');
});

test('缺少原任务的旧工作组不自动猜测；人工核对补登记后可收尾', async () => {
  const legacy = {
    id: 'tf-legacy-no-purpose', name: '缺任务旧专班', status: 'active', branchId: 'br-b1',
    workgroupId: 'wg-taskforce-tf-legacy-no-purpose', createdBy: 'p11', createdAt: '2026-01-02T00:00:00.000Z',
  };
  db.prepare('INSERT INTO taskforces (id, data) VALUES (?, ?)').run(legacy.id, JSON.stringify(legacy));
  db.prepare('INSERT INTO workgroups (id, data) VALUES (?, ?)').run(legacy.workgroupId, JSON.stringify({
    id: legacy.workgroupId, branchId: 'br-b1', kind: 'taskforce', sourceType: 'taskforce', sourceId: legacy.id, status: 'active',
  }));
  const closeBeforeReview = await request(`taskforces/${legacy.id}/dissolution`, 'p11', 'POST', { requiresCommitteeVote: false });
  assert.equal(closeBeforeReview.response.status, 409);
  assert.match(closeBeforeReview.data.error, /核对并登记主任务/);

  const repaired = await request(`workgroups/${legacy.workgroupId}/tasks`, 'p11', 'POST', {
    title: '经人工核对的历史主任务', isPurpose: true,
  });
  assert.equal(repaired.response.status, 201);
  assert.equal(repaired.data.migrationState, 'manually-verified');
  const completed = await request(`workgroups/${legacy.workgroupId}/tasks/${repaired.data.id}`, 'p11', 'PATCH', { status: 'completed' });
  assert.equal(completed.response.status, 200);
  const closed = await request(`taskforces/${legacy.id}/dissolution`, 'p11', 'POST', { requiresCommitteeVote: false });
  assert.equal(closed.response.status, 200);
});

test('停用活动组织能力后阻止新建，并保护已结束活动及其考勤历史', async () => {
  const created = await request('activities', 'p13', 'POST', {
    title: '活动能力停用历史测试', type: '主题党日', date: '2026-10-23', status: 'completed',
    branchId: 'br-b1', organizingScope: 'cross-group', hostGroupId: null, assignments: [],
  });
  assert.equal(created.response.status, 201);
  const branch = JSON.parse(db.prepare('SELECT data FROM branches WHERE id = ?').get('br-b1').data);
  branch.config = {
    ...(branch.config || {}),
    capabilityPackages: { schemaVersion: 1, packages: {
      ...(branch.config?.capabilityPackages?.packages || {}),
      'activity-organization': { version: '1.0.0', enabled: false },
    } },
  };
  db.prepare('UPDATE branches SET data = ? WHERE id = ?').run(JSON.stringify(branch), 'br-b1');

  const newActivity = await request('activities', 'p13', 'POST', {
    title: '停用后新建', type: '主题党日', date: '2026-10-24', status: 'planned',
    branchId: 'br-b1', organizingScope: 'cross-group', hostGroupId: null, assignments: [],
  });
  assert.equal(newActivity.response.status, 403);
  const editHistory = await request(`activities/${created.data.id}`, 'p13', 'PATCH', { title: '改写历史' });
  assert.equal(editHistory.response.status, 409);
  const attendance = await request('attendances', 'p13', 'POST', {
    activityId: created.data.id, personId: 'p1', status: 'present',
  });
  assert.equal(attendance.response.status, 409);

  const listed = await request('activities', 'p13');
  const versions = await request('snapshot/versions', 'p13');
  const changedActivities = listed.data.map((activity) => activity.id === created.data.id ? { ...activity, title: '快照改写历史' } : activity);
  const snapshot = await request('snapshot', 'p13', 'POST', {
    activities: changedActivities,
    _versions: { activities: versions.data.versions.activities || 0 },
  });
  assert.equal(snapshot.response.status, 403, '快照写入口不能绕过历史只读规则');
});
