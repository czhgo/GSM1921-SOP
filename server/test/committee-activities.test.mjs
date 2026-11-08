// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  server/test/committee-activities.test.mjs —— 党委内容写口（批次 534 · Task 2）
//
//  覆盖：
//   · 党委创建活动：归属 / 版本 / 创建人 / 时间由服务端强制；
//   · `targetBranchIds`（['all'] / 支部 id 数组；空 / 未知 / 含 pc-gsm ⇒ 422）；
//   · `publishScope=public` 的有效期与摘要校验；
//   · 支部账号（支书 / 成员）创建 / 编辑 / 取消 / 归档 / 改发布 / 读留痕一律 403；
//   · 编辑内容字段 ⇒ contentVersion+1；只改地点不加版本；
//   · 公开发布面变化（发布 / 改期 / 撤回）写 `publication_audits`，旧值新值可查；
//   · 留痕读取端点只对 party-staff。
//
//  自包含：`createApp({ dbPath: ':memory:' })` + 直写 users / branches；HTTP 直连（无浏览器）。
// ════════════════════════════════════════════════════════════════

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../app.js';

const BRANCHES = [
  { id: 'br-b1', name: '本科第一党支部', type: '本科生', status: 'active', createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'br-b2', name: '本科第二党支部', type: '本科生', status: 'active', createdAt: '2026-01-01T00:00:00.000Z' },
];
const USERS = [
  { id: 'pc-1', name: '党委组织员', studentId: '9000000001', role: 'party-staff', branchId: null, developStage: '', partyGroup: '' },
  { id: 'sec-1', name: '支部书记', studentId: '2300010001', role: 'secretary', branchId: 'br-b1', developStage: '正式党员', partyGroup: '第一党小组' },
  { id: 'mem-1', name: '普通成员', studentId: '2400012349', role: 'participant', branchId: 'br-b1', developStage: '正式党员', partyGroup: '第一党小组' },
];

let app, server, base, db;
const tokens = {};

before(async () => {
  app = createApp({ dbPath: ':memory:' });
  db = app.locals.db;
  const insertBranch = db.prepare('INSERT INTO branches (id, data) VALUES (?, ?)');
  for (const branch of BRANCHES) insertBranch.run(branch.id, JSON.stringify(branch));
  const insertUser = db.prepare('INSERT INTO users (id, data) VALUES (?, ?)');
  for (const user of USERS) insertUser.run(user.id, JSON.stringify(user));
  server = app.listen(0);
  base = `http://127.0.0.1:${server.address().port}`;
  for (const user of USERS) {
    const response = await fetch(`${base}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ personId: user.id, password: '123456' }),
    });
    assert.equal(response.status, 200, `登录失败：${user.id}`);
    tokens[user.id] = (await response.json()).token;
  }
});

after(() => {
  server?.closeAllConnections?.();
  return new Promise((resolve) => server?.close(resolve));
});

async function request(personId, method, path, body) {
  const response = await fetch(`${base}/api/v1/${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokens[personId]}` },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const data = response.status === 204 ? null : await response.json();
  return { status: response.status, data };
}

const futureIso = (days = 30) => new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

/** 建一条合规党委活动（默认 targetBranchIds=['all']、publishScope='branch'） */
async function createActivity(overrides = {}) {
  const res = await request('pc-1', 'POST', 'committee/activities', {
    title: '党委主题活动',
    type: '主题党日',
    date: '2026-12-01',
    location: '大学生活动中心',
    targetBranchIds: ['all'],
    ...overrides,
  });
  return res;
}

test('党委创建活动：归属 / 版本 / 创建人由服务端强制，客户端不可改写', async () => {
  const res = await createActivity({
    id: 'act-committee-1',
    targetBranchIds: ['all'],
    // 以下全为伪造值：服务端必须覆盖
    ownerScope: 'branch',
    branchId: 'br-b1',
    contentVersion: 99,
    createdBy: 'sec-1',
    createdAt: '1999-01-01T00:00:00.000Z',
    voteConfig: { optionSet: ['同意'], ballotMode: 'named' },
    participants: ['mem-1'],
  });
  assert.equal(res.status, 201);
  assert.equal(res.data.ownerScope, 'committee');
  assert.equal(res.data.branchId, 'pc-gsm');
  assert.equal(res.data.contentVersion, 1);
  assert.equal(res.data.createdBy, 'pc-1');
  assert.notEqual(res.data.createdAt, '1999-01-01T00:00:00.000Z');
  assert.equal(res.data.status, 'published', 'status 缺省 published');
  assert.equal(res.data.visibility, 'branch', 'visibility 缺省 branch');
  assert.equal(res.data.organizingScope, 'branch', 'organizingScope 缺省 branch');
  assert.equal(res.data.publishScope, 'branch', 'publishScope 缺省 branch');
  assert.equal(res.data.voteConfig, undefined, '不得由本端点写 voteConfig');
  assert.equal(res.data.participants, undefined, '不得由本端点写参与名单');

  // 落库校验（不只看响应）
  const stored = JSON.parse(db.prepare('SELECT data FROM activities WHERE id = ?').get('act-committee-1').data);
  assert.equal(stored.ownerScope, 'committee');
  assert.equal(stored.branchId, 'pc-gsm');
  assert.equal(stored.contentVersion, 1);

  const list = await request('pc-1', 'GET', 'committee/activities');
  assert.equal(list.status, 200);
  assert.ok(list.data.some((row) => row.id === 'act-committee-1'));
});

test('targetBranchIds：all 与指定支部均可；空 / 未知 / 含 pc-gsm / 非 draft 缺省均 422', async () => {
  const all = await createActivity({ targetBranchIds: ['all'] });
  assert.equal(all.status, 201);
  assert.deepEqual(all.data.targetBranchIds, ['all']);

  const branches = await createActivity({ targetBranchIds: ['br-b1', 'br-b2', 'br-b1'] });
  assert.equal(branches.status, 201);
  assert.deepEqual(branches.data.targetBranchIds, ['br-b1', 'br-b2'], '去重后落库');

  const empty = await createActivity({ targetBranchIds: [] });
  assert.equal(empty.status, 422, '空数组须 422');

  const unknown = await createActivity({ targetBranchIds: ['br-none'] });
  assert.equal(unknown.status, 422, '未知支部须 422');

  const withCommitteeId = await createActivity({ targetBranchIds: ['pc-gsm'] });
  assert.equal(withCommitteeId.status, 422, '不得把党委归属 id 当目标支部');

  const mixedAll = await createActivity({ targetBranchIds: ['all', 'br-b1'] });
  assert.equal(mixedAll.status, 422, "['all'] 只能单独使用");

  const missing = await createActivity({ targetBranchIds: undefined });
  assert.equal(missing.status, 422, 'status 非 draft 时必须给 targetBranchIds');

  const draft = await createActivity({ status: 'draft', targetBranchIds: undefined });
  assert.equal(draft.status, 201, 'draft 可不带 targetBranchIds');
});

test('publishScope：枚举校验 + public 须未来有效期与非空摘要（≤500 字）', async () => {
  const badScope = await createActivity({ publishScope: 'world' });
  assert.equal(badScope.status, 422);

  const noExpiry = await createActivity({ publishScope: 'public', publicSummary: '公开摘要' });
  assert.equal(noExpiry.status, 422, 'public 缺有效期须 422');

  const expired = await createActivity({
    publishScope: 'public',
    publishExpiresAt: new Date(Date.now() - 60 * 1000).toISOString(),
    publicSummary: '公开摘要',
  });
  assert.equal(expired.status, 422, 'public 过期时间须 422');

  const noSummary = await createActivity({
    publishScope: 'public',
    publishExpiresAt: futureIso(),
    publicSummary: '   ',
  });
  assert.equal(noSummary.status, 422, 'public 空摘要须 422');

  const tooLong = await createActivity({
    publishScope: 'public',
    publishExpiresAt: futureIso(),
    publicSummary: '字'.repeat(501),
  });
  assert.equal(tooLong.status, 422, 'publicSummary 超过 500 字须 422');

  const ok = await createActivity({
    publishScope: 'public',
    publishExpiresAt: futureIso(),
    publicSummary: '面向全校党员的公开摘要',
  });
  assert.equal(ok.status, 201);
  assert.equal(ok.data.publishScope, 'public');
});

test('支部账号（支书 / 成员）对党委内容写口一律 403', async () => {
  const created = await createActivity();
  assert.equal(created.status, 201);
  const id = created.data.id;

  for (const personId of ['sec-1', 'mem-1']) {
    const create = await request(personId, 'POST', 'committee/activities', {
      title: '支部越权创建', date: '2026-12-02', targetBranchIds: ['all'],
    });
    assert.equal(create.status, 403, `${personId} 不得创建党委活动`);

    const patch = await request(personId, 'PATCH', `committee/activities/${id}`, { location: '越权地点' });
    assert.equal(patch.status, 403, `${personId} 不得编辑党委活动`);

    const cancel = await request(personId, 'POST', `committee/activities/${id}/cancel`);
    assert.equal(cancel.status, 403, `${personId} 不得取消党委活动`);

    const archive = await request(personId, 'POST', `committee/activities/${id}/archive`);
    assert.equal(archive.status, 403, `${personId} 不得归档党委活动`);

    const publication = await request(personId, 'PATCH', `committee/activities/${id}/publication`, { publishScope: 'login' });
    assert.equal(publication.status, 403, `${personId} 不得调整发布范围`);

    const list = await request(personId, 'GET', 'committee/activities');
    assert.equal(list.status, 403, `${personId} 不得读取党委活动列表`);

    const audits = await request(personId, 'GET', 'committee/publication-audits');
    assert.equal(audits.status, 403, `${personId} 不得读取发布留痕`);
  }

  // 支部自发活动不归党委写口管辖 ⇒ 403（只能改 ownerScope='committee' 行）
  db.prepare('INSERT INTO activities (id, data) VALUES (?, ?)').run('act-branch-1', JSON.stringify({
    id: 'act-branch-1', title: '支部活动', type: '主题党日', date: '2026-12-03',
    branchId: 'br-b1', visibility: 'branch', status: 'published',
  }));
  const branchRow = await request('pc-1', 'PATCH', 'committee/activities/act-branch-1', { location: 'x' });
  assert.equal(branchRow.status, 403, '非党委归属行不得经本端点改写');
  const missingRow = await request('pc-1', 'PATCH', 'committee/activities/act-none', { location: 'x' });
  assert.equal(missingRow.status, 404);
});

test('编辑：内容字段变化 contentVersion+1；只改地点不加版本；归属 / 版本不可直改', async () => {
  const created = await createActivity({ title: '原始标题', description: '原始说明' });
  assert.equal(created.status, 201);
  const id = created.data.id;
  assert.equal(created.data.contentVersion, 1);

  const locationOnly = await request('pc-1', 'PATCH', `committee/activities/${id}`, { location: '新地点' });
  assert.equal(locationOnly.status, 200);
  assert.equal(locationOnly.data.location, '新地点');
  assert.equal(locationOnly.data.contentVersion, 1, '只改地点不加版本');

  const titleChange = await request('pc-1', 'PATCH', `committee/activities/${id}`, { title: '改后标题' });
  assert.equal(titleChange.status, 200);
  assert.equal(titleChange.data.contentVersion, 2, '内容字段变化 +1');

  const descChange = await request('pc-1', 'PATCH', `committee/activities/${id}`, { description: '改后说明' });
  assert.equal(descChange.status, 200);
  assert.equal(descChange.data.contentVersion, 3);

  // 同值回写不算变化
  const sameValue = await request('pc-1', 'PATCH', `committee/activities/${id}`, { title: '改后标题' });
  assert.equal(sameValue.status, 200);
  assert.equal(sameValue.data.contentVersion, 3, '同值回写不加版本');

  for (const key of ['ownerScope', 'branchId', 'sourceActivityId', 'contentVersion']) {
    const denied = await request('pc-1', 'PATCH', `committee/activities/${id}`, { [key]: 'x' });
    assert.equal(denied.status, 403, `${key} 不得直改`);
  }
  const unknownField = await request('pc-1', 'PATCH', `committee/activities/${id}`, { nope: 1 });
  assert.equal(unknownField.status, 400, '白名单外字段须 400');
});

test('发布面变化（发布 / 改期 / 撤回）写留痕，旧值新值可查', async () => {
  const created = await createActivity({ title: '留痕测试活动' });
  assert.equal(created.status, 201);
  const id = created.data.id;

  // 创建即写一条 publish 留痕（oldValue=null）
  const initial = await request('pc-1', 'GET', `committee/publication-audits?resourceType=activity&resourceId=${id}`);
  assert.equal(initial.status, 200);
  assert.equal(initial.data.length, 1, '创建写一条 publish 留痕');
  assert.equal(initial.data[0].action, 'publish');
  assert.equal(initial.data[0].actorId, 'pc-1');
  assert.equal(initial.data[0].actorRole, 'party-staff');
  assert.equal(initial.data[0].oldValue, null);
  assert.equal(initial.data[0].newValue.publishScope, 'branch');

  const expires = futureIso(10);
  const published = await request('pc-1', 'PATCH', `committee/activities/${id}/publication`, {
    publishScope: 'public', publishExpiresAt: expires, publicSummary: '对外公开摘要',
  });
  assert.equal(published.status, 200);
  assert.equal(published.data.publishScope, 'public');

  const afterPublish = await request('pc-1', 'GET', `committee/publication-audits?resourceId=${id}&action=publish`);
  assert.equal(afterPublish.status, 200);
  const publishAudit = afterPublish.data[0];
  assert.equal(publishAudit.action, 'publish');
  assert.equal(publishAudit.oldValue.publishScope, 'branch');
  assert.equal(publishAudit.newValue.publishScope, 'public');
  assert.equal(publishAudit.newValue.publishExpiresAt, expires);

  const rescheduledExpires = futureIso(20);
  const rescheduled = await request('pc-1', 'PATCH', `committee/activities/${id}/publication`, {
    publishScope: 'public', publishExpiresAt: rescheduledExpires, publicSummary: '对外公开摘要',
  });
  assert.equal(rescheduled.status, 200);
  const scopeAudits = await request('pc-1', 'GET', `committee/publication-audits?resourceId=${id}&action=update-scope`);
  assert.equal(scopeAudits.status, 200);
  assert.equal(scopeAudits.data.length, 1, '改期写 update-scope 留痕');
  assert.equal(scopeAudits.data[0].oldValue.publishExpiresAt, expires);
  assert.equal(scopeAudits.data[0].newValue.publishExpiresAt, rescheduledExpires);

  const unpublished = await request('pc-1', 'PATCH', `committee/activities/${id}/publication`, { publishScope: 'login' });
  assert.equal(unpublished.status, 200);
  const unpublishAudits = await request('pc-1', 'GET', `committee/publication-audits?resourceId=${id}&action=unpublish`);
  assert.equal(unpublishAudits.status, 200);
  assert.equal(unpublishAudits.data.length, 1);
  assert.equal(unpublishAudits.data[0].oldValue.publishScope, 'public');
  assert.equal(unpublishAudits.data[0].newValue.publishScope, 'login');

  // 公开可见的硬校验在改发布端点同样生效（用一条从未设过有效期的新活动验证）
  const fresh = await createActivity({ title: '发布端点校验活动' });
  assert.equal(fresh.status, 201);
  const badPublic = await request('pc-1', 'PATCH', `committee/activities/${fresh.data.id}/publication`, { publishScope: 'public' });
  assert.equal(badPublic.status, 422, '缺有效期须 422');
  const badField = await request('pc-1', 'PATCH', `committee/activities/${fresh.data.id}/publication`, { publishScope: 'login', title: 'x' });
  assert.equal(badField.status, 400, '发布端点只收发布面字段');
});

test('取消 / 归档只置本行，不改支部副本', async () => {
  const created = await createActivity({ title: '取消归档测试' });
  assert.equal(created.status, 201);
  const id = created.data.id;

  const cancelled = await request('pc-1', 'POST', `committee/activities/${id}/cancel`);
  assert.equal(cancelled.status, 200);
  assert.equal(cancelled.data.status, 'cancelled');
  assert.ok(cancelled.data.cancelledAt, '须写 cancelledAt');
  const repeat = await request('pc-1', 'POST', `committee/activities/${id}/cancel`);
  assert.equal(repeat.status, 200, '重复取消幂等');
  assert.equal(repeat.data.cancelledAt, cancelled.data.cancelledAt);

  const archived = await request('pc-1', 'POST', `committee/activities/${id}/archive`);
  assert.equal(archived.status, 200);
  assert.equal(archived.data.archived, true);
  assert.ok(archived.data.archivedAt, '须写 archivedAt');

  // 支部行不受影响
  const branchRow = JSON.parse(db.prepare('SELECT data FROM activities WHERE id = ?').get('act-branch-1').data);
  assert.equal(branchRow.status, 'published');
  assert.equal(branchRow.archived, undefined);
});

test('党委活动列表：日期倒序 + 状态 / 发布范围过滤', async () => {
  const older = await createActivity({ title: '较早活动', date: '2026-10-01', status: 'draft' });
  assert.equal(older.status, 201);
  const newer = await createActivity({
    title: '较晚活动', date: '2026-12-31', publishScope: 'public', publishExpiresAt: futureIso(), publicSummary: '公开摘要',
  });
  assert.equal(newer.status, 201);

  const all = await request('pc-1', 'GET', 'committee/activities');
  assert.equal(all.status, 200);
  const dates = all.data.map((row) => row.date);
  const sorted = [...dates].sort((a, b) => String(b).localeCompare(String(a)));
  assert.deepEqual(dates, sorted, '按日期倒序');
  assert.ok(all.data.every((row) => row.ownerScope === 'committee'), '只返回党委活动');

  const drafts = await request('pc-1', 'GET', 'committee/activities?status=draft');
  assert.equal(drafts.status, 200);
  assert.ok(drafts.data.length >= 1 && drafts.data.every((row) => row.status === 'draft'));

  const publics = await request('pc-1', 'GET', 'committee/activities?publishScope=public');
  assert.equal(publics.status, 200);
  assert.ok(publics.data.length >= 1 && publics.data.every((row) => row.publishScope === 'public'));
});
