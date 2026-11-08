// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  server/test/activity-adoption.test.mjs —— 党委下发 / 支部幂等采用 / 副本锁定 / 手动同步
//  （2026-11-08 批次 536 · Task 3）
//
//  覆盖：
//   · 下发：目标支部各一条通知、受众 ['secretary','deputy-secretary']、同版本幂等、版本升级后新增；
//   · 采用：首次 201、重复 200 同一副本、并发只产生一条；非目标支部 / 普通党员 / 党委 403；
//            draft / cancelled / archived 409；非党委活动 400；
//   · 副本锁定：执行字段可改；标题 / 描述 / 议程 422；ownerScope / branchId / sourceVersion 403；
//   · 手动同步：只覆盖内容字段，日期 / 地点保留；版本无变化返回 synced:false；
//   · 党委取消 / 归档后副本状态不变。
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
  { id: 'sec-1', name: '第一支部书记', studentId: '2300010001', role: 'secretary', branchId: 'br-b1', developStage: '正式党员', partyGroup: '第一党小组' },
  { id: 'dep-1', name: '第一支部副书记', studentId: '2300010002', role: 'deputy-secretary', branchId: 'br-b1', developStage: '正式党员', partyGroup: '第一党小组' },
  { id: 'sec-2', name: '第二支部书记', studentId: '2300020001', role: 'secretary', branchId: 'br-b2', developStage: '正式党员', partyGroup: '第二党小组' },
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

const rowsOf = (table) => db.prepare(`SELECT data FROM ${table}`).all().map((row) => JSON.parse(row.data));
const activityRow = (id) => {
  const found = db.prepare('SELECT data FROM activities WHERE id = ?').get(String(id));
  return found ? JSON.parse(found.data) : null;
};
const insertActivity = (row) => db.prepare('INSERT INTO activities (id, data) VALUES (?, ?)')
  .run(row.id, JSON.stringify(row));
const dispatchNotices = (sourceId) => rowsOf('notices').filter((row) => row.sourceType === 'activity'
  && String(row.sourceId) === String(sourceId)
  && row.systemKind === 'committee-activity-dispatch');

/** 建一条合规党委活动（默认 targetBranchIds=['all']、publishScope='branch'） */
async function createCommitteeActivity(overrides = {}) {
  return request('pc-1', 'POST', 'committee/activities', {
    title: '党委主题活动',
    type: '主题党日',
    date: '2026-12-01',
    location: '大学生活动中心',
    targetBranchIds: ['all'],
    ...overrides,
  });
}

let seq = 0;
const uniqueTitle = (prefix) => `${prefix}-${++seq}`;

// ════════════════════════════════════════════════════════════════
//  一、下发
// ════════════════════════════════════════════════════════════════

test('下发：目标支部各一条通知，受众为支书 / 副支书；同版本幂等、版本升级后新增', async () => {
  const created = await createCommitteeActivity({ title: uniqueTitle('下发活动'), description: '集中学习' });
  assert.equal(created.status, 201);
  const id = created.data.id;
  assert.equal(created.data.contentVersion, 1);

  const first = await request('pc-1', 'POST', `committee/activities/${id}/dispatch`);
  assert.equal(first.status, 200);
  assert.equal(first.data.created, 2, "'all' 展开为全部支部");
  assert.equal(first.data.skipped, 0);
  assert.equal(first.data.notices.length, 2);

  const notices = dispatchNotices(id);
  assert.equal(notices.length, 2);
  assert.deepEqual(notices.map((n) => n.branchId).sort(), ['br-b1', 'br-b2']);
  for (const notice of notices) {
    assert.equal(notice.kind, 'system');
    assert.equal(notice.source, 'committee');
    assert.equal(notice.sourceType, 'activity');
    assert.equal(notice.sourceVersion, 1);
    // 批次 537 波次 1：通知落点带对象坐标（notice.js 归一化要求 system 有 targetType + targetId，
    //   否则会降级成 announcement —— 铃铛/消息中心的「系统通知」分类与对象卡跳转随之失效）。
    assert.equal(notice.targetType, 'activity', '通知落点类型须为 activity');
    assert.equal(notice.targetId, id, '通知落点＝党委活动 id');
    assert.deepEqual(notice.audience, ['secretary', 'deputy-secretary']);
    assert.equal(notice.priority, 'normal');
    assert.match(notice.publishDate, /^\d{4}-\d{2}-\d{2}$/);
    assert.equal(notice.createdBy, 'pc-1');
    assert.equal(notice.content, '集中学习');
    assert.ok(String(notice.title).includes('党委活动'));
    assert.ok(notice.createdAt);
  }

  // 同版本重复调用：一条都不新增
  const repeat = await request('pc-1', 'POST', `committee/activities/${id}/dispatch`);
  assert.equal(repeat.status, 200);
  assert.equal(repeat.data.created, 0);
  assert.equal(repeat.data.skipped, 2);
  assert.equal(dispatchNotices(id).length, 2, '同版本幂等');

  // 内容变化 ⇒ contentVersion+1 ⇒ 再次下发新增一批，旧通知保留
  const patched = await request('pc-1', 'PATCH', `committee/activities/${id}`, { title: uniqueTitle('下发活动新版') });
  assert.equal(patched.status, 200);
  assert.equal(patched.data.contentVersion, 2);
  const bumped = await request('pc-1', 'POST', `committee/activities/${id}/dispatch`);
  assert.equal(bumped.status, 200);
  assert.equal(bumped.data.created, 2);
  const all = dispatchNotices(id);
  assert.equal(all.length, 4, '旧版本通知保留');
  assert.deepEqual(all.filter((n) => n.sourceVersion === 2).map((n) => n.branchId).sort(), ['br-b1', 'br-b2']);
});

test('下发：branchIds 可收窄到子集；空 / 不存在 / 不在范围分别 422 / 422 / 403', async () => {
  const subsetSource = await createCommitteeActivity({ title: uniqueTitle('子集下发'), targetBranchIds: ['br-b1', 'br-b2'] });
  assert.equal(subsetSource.status, 201);
  const subset = await request('pc-1', 'POST', `committee/activities/${subsetSource.data.id}/dispatch`, { branchIds: ['br-b2'] });
  assert.equal(subset.status, 200);
  assert.equal(subset.data.created, 1);
  assert.equal(subset.data.notices[0].branchId, 'br-b2');
  assert.equal(dispatchNotices(subsetSource.data.id).length, 1);

  const allSource = await createCommitteeActivity({ title: uniqueTitle('全支部下发'), targetBranchIds: ['all'] });
  assert.equal(allSource.status, 201);
  const empty = await request('pc-1', 'POST', `committee/activities/${allSource.data.id}/dispatch`, { branchIds: [] });
  assert.equal(empty.status, 422, '空数组须 422');
  const unknown = await request('pc-1', 'POST', `committee/activities/${allSource.data.id}/dispatch`, { branchIds: ['br-none'] });
  assert.equal(unknown.status, 422, '不存在的支部须 422');

  const narrow = await createCommitteeActivity({ title: uniqueTitle('范围下发'), targetBranchIds: ['br-b1'] });
  assert.equal(narrow.status, 201);
  const outside = await request('pc-1', 'POST', `committee/activities/${narrow.data.id}/dispatch`, { branchIds: ['br-b2'] });
  assert.equal(outside.status, 403, '不在 targetBranchIds 内须 403');
  const inScope = await request('pc-1', 'POST', `committee/activities/${narrow.data.id}/dispatch`, { branchIds: ['br-b1'] });
  assert.equal(inScope.status, 200);
  assert.equal(inScope.data.created, 1);
});

test('下发：只允许党委；非党委行 403、不存在 404', async () => {
  const source = await createCommitteeActivity({ title: uniqueTitle('权限下发') });
  assert.equal(source.status, 201);

  for (const personId of ['sec-1', 'dep-1', 'mem-1', 'sec-2']) {
    const denied = await request(personId, 'POST', `committee/activities/${source.data.id}/dispatch`);
    assert.equal(denied.status, 403, `${personId} 不得下发`);
  }

  insertActivity({ id: 'act-plain-dispatch', title: '支部自办', type: '主题党日', date: '2026-12-02', branchId: 'br-b1', visibility: 'branch', status: 'published' });
  const branchRow = await request('pc-1', 'POST', 'committee/activities/act-plain-dispatch/dispatch');
  assert.equal(branchRow.status, 403, '非党委行不得经本端点下发');
  const missing = await request('pc-1', 'POST', 'committee/activities/act-none/dispatch');
  assert.equal(missing.status, 404);
});

// ════════════════════════════════════════════════════════════════
//  二、采用
// ════════════════════════════════════════════════════════════════

test('采用：首次 201 复制内容与排期、执行面归本支部；重复 200 同一副本', async () => {
  const source = await createCommitteeActivity({
    title: uniqueTitle('采用活动'),
    description: '采用说明',
    agenda: [{ id: 'ag-1', title: '议程一' }],
    summary: '内容摘要',
    content: '正文内容',
    publicSummary: '公开摘要',
    date: '2026-12-01',
    location: '活动中心',
    targetBranchIds: ['br-b1'],
    organizer: 'pc-1',
    assignments: [{ personId: 'pc-1', role: 'organizer' }],
    participants: ['mem-1'],
    voteConfig: { optionSet: ['同意', '反对'], ballotMode: 'anonymous' },
  });
  assert.equal(source.status, 201);
  const sourceId = source.data.id;

  const adopted = await request('sec-1', 'POST', `activities/${sourceId}/adopt`);
  assert.equal(adopted.status, 201);
  assert.equal(adopted.data.idempotent, false);
  const copy = adopted.data.activity;
  assert.match(copy.id, /^act-/);
  assert.equal(copy.ownerScope, 'branch');
  assert.equal(copy.branchId, 'br-b1');
  assert.equal(copy.title, source.data.title);
  assert.equal(copy.type, source.data.type);
  assert.equal(copy.description, '采用说明');
  assert.deepEqual(copy.agenda, [{ id: 'ag-1', title: '议程一' }]);
  assert.equal(copy.summary, '内容摘要');
  assert.equal(copy.content, '正文内容');
  assert.equal(copy.publicSummary, '公开摘要');
  assert.equal(copy.date, '2026-12-01', '排期默认值随原件复制');
  assert.equal(copy.location, '活动中心');
  assert.equal(copy.visibility, 'branch');
  assert.equal(copy.status, 'published');
  assert.equal(copy.publishScope, 'branch');
  assert.equal(copy.sourceActivityId, sourceId);
  assert.equal(copy.sourceVersion, 1);
  assert.equal(copy.sourceSyncedAt, null);
  assert.equal(copy.adoptedBy, 'sec-1');
  assert.ok(copy.adoptedAt);
  assert.equal(copy.organizer, 'sec-1');
  assert.deepEqual(copy.assignments, [{ personId: 'sec-1', role: 'organizer' }], '分工覆盖为采用人');
  assert.equal(copy.createdBy, 'sec-1');
  assert.equal(copy.targetBranchIds, undefined, '不复制下发范围');
  assert.equal(copy.participants, undefined, '不复制参与名单');
  assert.equal(copy.voteConfig, undefined, '不复制表决配置');
  assert.equal(copy.contentVersion, undefined, '不复制内容版本');

  // 落库校验（不只看响应）
  const stored = activityRow(copy.id);
  assert.equal(stored.sourceActivityId, sourceId);
  assert.equal(stored.branchId, 'br-b1');
  assert.equal(stored.ownerScope, 'branch');

  // 工作组随副本建立，成员＝采用人（组织者）
  const workgroup = db.prepare('SELECT data FROM workgroups WHERE id = ?').get(`wg-activity-${copy.id}`);
  assert.ok(workgroup, '副本须建工作组');
  const members = rowsOf('workgroup_members').filter((row) => row.workgroupId === `wg-activity-${copy.id}`);
  assert.deepEqual(members.map((row) => [row.personId, row.role]), [['sec-1', 'organizer']]);

  const repeat = await request('sec-1', 'POST', `activities/${sourceId}/adopt`);
  assert.equal(repeat.status, 200);
  assert.equal(repeat.data.idempotent, true);
  assert.equal(repeat.data.activity.id, copy.id, '重复采用返回同一副本');
  assert.equal(rowsOf('activities').filter((row) => row.sourceActivityId === sourceId && row.branchId === 'br-b1').length, 1);
});

test('采用：并发 Promise.all 只产生一条副本', async () => {
  const source = await createCommitteeActivity({ title: uniqueTitle('并发采用'), targetBranchIds: ['br-b1'] });
  assert.equal(source.status, 201);
  const sourceId = source.data.id;

  const [a, b] = await Promise.all([
    request('sec-1', 'POST', `activities/${sourceId}/adopt`),
    request('sec-1', 'POST', `activities/${sourceId}/adopt`),
  ]);
  assert.deepEqual([a.status, b.status].sort(), [200, 201]);
  assert.equal(a.data.activity.id, b.data.activity.id, '两条请求指向同一副本');
  assert.equal(rowsOf('activities').filter((row) => row.sourceActivityId === sourceId && row.branchId === 'br-b1').length, 1);
});

test('采用：非目标支部 / 普通党员 / 党委 403；非党委活动 400；不存在 404', async () => {
  const onlyB1 = await createCommitteeActivity({ title: uniqueTitle('仅第一支部'), targetBranchIds: ['br-b1'] });
  assert.equal(onlyB1.status, 201);
  const otherBranch = await request('sec-2', 'POST', `activities/${onlyB1.data.id}/adopt`);
  assert.equal(otherBranch.status, 403, '未下发的支部不得采用');

  for (const personId of ['mem-1', 'pc-1']) {
    const denied = await request(personId, 'POST', `activities/${onlyB1.data.id}/adopt`);
    assert.equal(denied.status, 403, `${personId} 不得采用`);
  }

  insertActivity({ id: 'act-plain-adopt', title: '支部自办采用', type: '主题党日', date: '2026-12-03', branchId: 'br-b1', visibility: 'branch', status: 'published' });
  const notCommittee = await request('sec-1', 'POST', 'activities/act-plain-adopt/adopt');
  assert.equal(notCommittee.status, 400);
  const missing = await request('sec-1', 'POST', 'activities/act-none/adopt');
  assert.equal(missing.status, 404);
});

test('采用：draft / cancelled / archived / completed 409', async () => {
  const draft = await createCommitteeActivity({ title: uniqueTitle('草稿'), status: 'draft', targetBranchIds: ['all'] });
  assert.equal(draft.status, 201);
  assert.equal((await request('sec-1', 'POST', `activities/${draft.data.id}/adopt`)).status, 409);

  const cancelled = await createCommitteeActivity({ title: uniqueTitle('取消'), targetBranchIds: ['all'] });
  assert.equal(cancelled.status, 201);
  assert.equal((await request('pc-1', 'POST', `committee/activities/${cancelled.data.id}/cancel`)).status, 200);
  assert.equal((await request('sec-1', 'POST', `activities/${cancelled.data.id}/adopt`)).status, 409);

  const archived = await createCommitteeActivity({ title: uniqueTitle('归档'), targetBranchIds: ['all'] });
  assert.equal(archived.status, 201);
  assert.equal((await request('pc-1', 'POST', `committee/activities/${archived.data.id}/archive`)).status, 200);
  assert.equal((await request('sec-1', 'POST', `activities/${archived.data.id}/adopt`)).status, 409);

  const completed = await createCommitteeActivity({ title: uniqueTitle('已结束'), status: 'completed', targetBranchIds: ['all'] });
  assert.equal(completed.status, 201);
  assert.equal((await request('sec-1', 'POST', `activities/${completed.data.id}/adopt`)).status, 409);
});

// ════════════════════════════════════════════════════════════════
//  三、副本内容锁定（通用 PATCH）/ 通用 POST 不收党委活动
// ════════════════════════════════════════════════════════════════

test('副本锁定：执行字段可改；标题 / 描述 / 议程 422；归属 / 来源 / 版本 403', async () => {
  const source = await createCommitteeActivity({ title: uniqueTitle('锁定源'), targetBranchIds: ['br-b1'] });
  assert.equal(source.status, 201);
  const adopted = await request('sec-1', 'POST', `activities/${source.data.id}/adopt`);
  assert.equal(adopted.status, 201);
  const copyId = adopted.data.activity.id;

  for (const [field, value] of [['date', '2026-12-08'], ['location', '本支部会议室'], ['recruitmentScope', 'cross-group']]) {
    const ok = await request('sec-1', 'PATCH', `activities/${copyId}`, { [field]: value });
    assert.equal(ok.status, 200, `执行字段 ${field} 可改`);
    assert.equal(ok.data[field], value);
  }

  for (const field of ['title', 'description', 'agenda']) {
    const denied = await request('sec-1', 'PATCH', `activities/${copyId}`, { [field]: field === 'agenda' ? [] : '越权改写' });
    assert.equal(denied.status, 422, `内容字段 ${field} 须 422`);
    assert.match(String(denied.data.error), /党委活动维护/, '须给出可懂原因');
  }

  for (const field of ['ownerScope', 'branchId', 'sourceVersion', 'sourceActivityId']) {
    const denied = await request('sec-1', 'PATCH', `activities/${copyId}`, { [field]: 'x' });
    assert.equal(denied.status, 403, `${field} 不可直改`);
  }

  // 其他支部账号不得改本支部副本
  const otherBranch = await request('sec-2', 'PATCH', `activities/${copyId}`, { location: '第二支部改' });
  assert.equal(otherBranch.status, 403);
});

test('通用 POST /activities：ownerScope=committee 或 branchId=pc-gsm 一律 400', async () => {
  const committeeScope = await request('sec-1', 'POST', 'activities', {
    title: '越权党委活动', type: '主题党日', date: '2026-12-09', ownerScope: 'committee',
  });
  assert.equal(committeeScope.status, 400);
  assert.match(String(committeeScope.data.error), /\/committee\/activities/);

  const committeeOwner = await request('sec-1', 'POST', 'activities', {
    title: '越权党委归属', type: '主题党日', date: '2026-12-09', branchId: 'pc-gsm',
  });
  assert.equal(committeeOwner.status, 400);
});

// ════════════════════════════════════════════════════════════════
//  四、手动同步
// ════════════════════════════════════════════════════════════════

test('手动同步：只覆盖内容字段，日期 / 地点保留；同步后版本前进，无新版本返回 synced:false', async () => {
  const source = await createCommitteeActivity({
    title: uniqueTitle('同步源'),
    description: '原说明',
    date: '2026-12-01',
    location: '原地点',
    targetBranchIds: ['br-b1'],
  });
  assert.equal(source.status, 201);
  const sourceId = source.data.id;
  const adopted = await request('sec-1', 'POST', `activities/${sourceId}/adopt`);
  assert.equal(adopted.status, 201);
  const copyId = adopted.data.activity.id;

  // 支部本地调整执行字段
  const local = await request('sec-1', 'PATCH', `activities/${copyId}`, { date: '2026-12-05', location: '本支部地点' });
  assert.equal(local.status, 200);

  // 原件改内容 + 改期（日期/地点也在原件上变，但同步不得覆盖副本的执行字段）
  const edited = await request('pc-1', 'PATCH', `committee/activities/${sourceId}`, {
    title: uniqueTitle('同步源新版'), description: '新说明', date: '2026-12-20', location: '新地点',
  });
  assert.equal(edited.status, 200);
  assert.equal(edited.data.contentVersion, 2);

  const before = activityRow(copyId);
  assert.equal(before.sourceVersion, 1);

  const synced = await request('sec-1', 'POST', `activities/${copyId}/sync-source`);
  assert.equal(synced.status, 200);
  assert.equal(synced.data.synced, true);
  const next = synced.data.activity;
  assert.equal(next.title, edited.data.title);
  assert.equal(next.description, '新说明');
  assert.equal(next.date, '2026-12-05', '日期保留支部本地值');
  assert.equal(next.location, '本支部地点', '地点保留支部本地值');
  assert.equal(next.sourceVersion, 2);
  assert.ok(next.sourceSyncedAt, '须写同步时刻');

  const stored = activityRow(copyId);
  assert.equal(stored.title, edited.data.title, '落库生效');
  assert.equal(stored.sourceVersion, 2);

  // 无新版本：幂等无变化
  const repeat = await request('sec-1', 'POST', `activities/${copyId}/sync-source`);
  assert.equal(repeat.status, 200);
  assert.equal(repeat.data.synced, false);
  assert.equal(repeat.data.activity.sourceVersion, 2);
});

test('手动同步：非本支部 / 普通党员 403；非副本 400；不存在 404', async () => {
  const source = await createCommitteeActivity({ title: uniqueTitle('同步权限'), targetBranchIds: ['all'] });
  assert.equal(source.status, 201);
  const adopted = await request('sec-1', 'POST', `activities/${source.data.id}/adopt`);
  assert.equal(adopted.status, 201);
  const copyId = adopted.data.activity.id;

  assert.equal((await request('sec-2', 'POST', `activities/${copyId}/sync-source`)).status, 403);
  assert.equal((await request('mem-1', 'POST', `activities/${copyId}/sync-source`)).status, 403);

  insertActivity({ id: 'act-plain-sync', title: '支部自办同步', type: '主题党日', date: '2026-12-11', branchId: 'br-b1', visibility: 'branch', status: 'published' });
  const notCopy = await request('sec-1', 'POST', 'activities/act-plain-sync/sync-source');
  assert.equal(notCopy.status, 400);
  assert.match(String(notCopy.data.error), /不是党委活动副本/);
  const missing = await request('sec-1', 'POST', 'activities/act-none/sync-source');
  assert.equal(missing.status, 404);
});

// ════════════════════════════════════════════════════════════════
//  五、党委取消 / 归档不级联副本
// ════════════════════════════════════════════════════════════════

test('党委取消 / 归档后副本状态不变', async () => {
  const source = await createCommitteeActivity({ title: uniqueTitle('不级联'), targetBranchIds: ['br-b1'] });
  assert.equal(source.status, 201);
  const adopted = await request('sec-1', 'POST', `activities/${source.data.id}/adopt`);
  assert.equal(adopted.status, 201);
  const copyId = adopted.data.activity.id;

  assert.equal((await request('pc-1', 'POST', `committee/activities/${source.data.id}/cancel`)).status, 200);
  assert.equal((await request('pc-1', 'POST', `committee/activities/${source.data.id}/archive`)).status, 200);

  const copy = activityRow(copyId);
  assert.equal(copy.status, 'published', '副本状态不随原件取消 / 归档变化');
  assert.equal(copy.archived, undefined);

  // 同步只覆盖内容，不改副本状态
  const synced = await request('sec-1', 'POST', `activities/${copyId}/sync-source`);
  assert.equal(synced.status, 200);
  assert.equal(activityRow(copyId).status, 'published');
});
