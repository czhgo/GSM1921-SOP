// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  server/test/committee-multidomain.test.mjs —— 党委多域写入（批次 534 · Task 10）
//
//  覆盖：
//   · 院级资料：创建（归属 / 用途 / 状态 / 版本 / 上传人强制）、login / public 两档、
//     public 缺有效期 / 缺摘要 / 超 500 字 / 按支部发布 ⇒ 422；支部账号一律 403；
//     撤下＝改范围（幂等，不删行）＋ publication_audits 留痕；匿名 `/api/public/portal` 只见 public；
//   · 支部档案：指定 branchId 写入成功；缺 branchId / 未知支部 / 缺 title·category ⇒ 422；
//     只新增档案记录，不改该支部活动本身；
//   · 名册提案：创建起点 `pending-org-approval`；重复在途 409；fromStage 不一致 / 跨支部 ⇒ 422；
//     跨支部不可见；组织委员 approve → 支书 confirm 后 `users.developStage` 才变；
//     党委直接 PATCH `users.developStage` ⇒ 403，其他字段不受本规则误伤。
//
//  自包含：`createApp({ dbPath: ':memory:' })` + 直写 users / branches / activities；HTTP 直连。
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
  { id: 'org-1', name: '组织委员', studentId: '2300010002', role: 'org-commissioner', branchId: 'br-b1', developStage: '正式党员', partyGroup: '第一党小组' },
  { id: 'mem-1', name: '成员甲', studentId: '2400012349', role: 'participant', branchId: 'br-b1', developStage: '积极分子', partyGroup: '第一党小组' },
  { id: 'mem-2', name: '成员乙', studentId: '2400012350', role: 'participant', branchId: 'br-b2', developStage: '预备党员', partyGroup: '第二党小组' },
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

async function anonymous(path) {
  const response = await fetch(`${base}${path}`);
  return { status: response.status, data: await response.json() };
}

const futureIso = (days = 30) => new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
const userRow = (id) => JSON.parse(db.prepare('SELECT data FROM users WHERE id = ?').get(id).data);

// ════════════════════════════════════════════════════════════════
//  一、院级资料
// ════════════════════════════════════════════════════════════════

test('院级资料：创建时归属 / 用途 / 状态 / 版本 / 上传人由服务端强制，publishScope 缺省 login', async () => {
  const res = await request('pc-1', 'POST', 'committee/documents', {
    id: 'bd-test-login',
    title: '院级学习资料',
    summary: '内部摘要',
    bodyText: '正文',
    format: 'pdf',
    fileName: 'study.pdf',
    fileSize: 1024,
    // 以下为伪造值，服务端必须覆盖
    ownerScope: 'branch',
    branchId: 'br-b1',
    purpose: 'institution',
    status: 'draft',
    version: 9,
    cat: 'party-doc',
    uploadedBy: 'sec-1',
    uploadedAt: '1999-01-01T00:00:00.000Z',
  });
  assert.equal(res.status, 201);
  assert.equal(res.data.ownerScope, 'committee');
  assert.equal(res.data.branchId, 'pc-gsm');
  assert.equal(res.data.purpose, 'doc');
  assert.equal(res.data.status, 'current');
  assert.equal(res.data.version, 1);
  assert.equal(res.data.cat, 'committee-doc');
  assert.equal(res.data.uploadedBy, 'pc-1');
  assert.notEqual(res.data.uploadedAt, '1999-01-01T00:00:00.000Z');
  assert.equal(res.data.publishScope, 'login', 'publishScope 缺省 login');

  const stored = JSON.parse(db.prepare('SELECT data FROM branch_docs WHERE id = ?').get('bd-test-login').data);
  assert.equal(stored.branchId, 'pc-gsm');
  assert.equal(stored.ownerScope, 'committee');

  const list = await request('pc-1', 'GET', 'committee/documents');
  assert.equal(list.status, 200);
  assert.ok(list.data.some((row) => row.id === 'bd-test-login'));
  assert.ok(list.data.every((row) => row.ownerScope === 'committee'), '只返回院级资料');
});

test('院级资料：public 须未来有效期与非空摘要（≤500 字）；不得按支部发布', async () => {
  const noExpiry = await request('pc-1', 'POST', 'committee/documents', {
    title: '缺有效期', publishScope: 'public', summary: '公开摘要',
  });
  assert.equal(noExpiry.status, 422, 'public 缺有效期须 422');

  const expired = await request('pc-1', 'POST', 'committee/documents', {
    title: '已过期', publishScope: 'public', publishExpiresAt: new Date(Date.now() - 60000).toISOString(), summary: '公开摘要',
  });
  assert.equal(expired.status, 422, 'public 过期须 422');

  const noSummary = await request('pc-1', 'POST', 'committee/documents', {
    title: '缺摘要', publishScope: 'public', publishExpiresAt: futureIso(), summary: '   ',
  });
  assert.equal(noSummary.status, 422, 'public 空摘要须 422');

  const tooLong = await request('pc-1', 'POST', 'committee/documents', {
    title: '摘要过长', publishScope: 'public', publishExpiresAt: futureIso(), summary: '字'.repeat(501),
  });
  assert.equal(tooLong.status, 422, '摘要超过 500 字须 422');

  const branchScope = await request('pc-1', 'POST', 'committee/documents', {
    title: '按支部发布', publishScope: 'branch',
  });
  assert.equal(branchScope.status, 422, '院级资料不得 publishScope=branch');

  const noTitle = await request('pc-1', 'POST', 'committee/documents', { summary: '无标题' });
  assert.equal(noTitle.status, 422, '缺 title 须 422');

  const ok = await request('pc-1', 'POST', 'committee/documents', {
    id: 'bd-test-public',
    title: '面向全校的学习资料',
    summary: '公开摘要',
    publishScope: 'public',
    publishExpiresAt: futureIso(),
    format: 'pdf',
    fileName: 'public.pdf',
  });
  assert.equal(ok.status, 201);
  assert.equal(ok.data.publishScope, 'public');
});

test('院级资料：支部账号（支书 / 成员）读写一律 403', async () => {
  for (const personId of ['sec-1', 'mem-1']) {
    const create = await request(personId, 'POST', 'committee/documents', { title: '越权资料' });
    assert.equal(create.status, 403, `${personId} 不得新建院级资料`);
    const list = await request(personId, 'GET', 'committee/documents');
    assert.equal(list.status, 403, `${personId} 不得读取院级资料列表`);
    const patch = await request(personId, 'PATCH', 'committee/documents/bd-test-login', { title: '越权改标题' });
    assert.equal(patch.status, 403, `${personId} 不得编辑院级资料`);
    const withdraw = await request(personId, 'POST', 'committee/documents/bd-test-login/withdraw');
    assert.equal(withdraw.status, 403, `${personId} 不得撤下院级资料`);
  }
});

test('院级资料：匿名公共门厅只见 public；撤下＝改范围并写留痕；非党委行不可经本端点改写', async () => {
  const portal = await anonymous('/api/public/portal');
  assert.equal(portal.status, 200);
  const ids = portal.data.documents.map((row) => row.id);
  assert.ok(ids.includes('bd-test-public'), 'public 资料应出现在公共门厅');
  assert.ok(!ids.includes('bd-test-login'), 'login 资料不得出现在公共门厅');

  // 创建即写 publish 留痕
  const created = await request('pc-1', 'GET', 'committee/publication-audits?resourceType=document&resourceId=bd-test-public');
  assert.equal(created.status, 200);
  assert.equal(created.data.rows.length, 1);
  assert.equal(created.data.rows[0].action, 'publish');
  assert.equal(created.data.rows[0].actorId, 'pc-1');
  assert.equal(created.data.rows[0].oldValue, null);

  // 改期 ⇒ update-scope
  const rescheduled = await request('pc-1', 'PATCH', 'committee/documents/bd-test-public', {
    publishExpiresAt: futureIso(10),
  });
  assert.equal(rescheduled.status, 200);
  const scopeAudits = await request('pc-1', 'GET', 'committee/publication-audits?resourceType=document&resourceId=bd-test-public&action=update-scope');
  assert.equal(scopeAudits.status, 200);
  assert.equal(scopeAudits.data.rows.length, 1, '改期写 update-scope 留痕');

  // 改为 login ⇒ unpublish
  const toLogin = await request('pc-1', 'PATCH', 'committee/documents/bd-test-public', { publishScope: 'login' });
  assert.equal(toLogin.status, 200);
  assert.equal(toLogin.data.publishScope, 'login');

  // 撤下端点：非 public 幂等返回；public → login 并写 unpublish
  const republish = await request('pc-1', 'PATCH', 'committee/documents/bd-test-public', {
    publishScope: 'public', publishExpiresAt: futureIso(), summary: '公开摘要',
  });
  assert.equal(republish.status, 200);
  const withdraw = await request('pc-1', 'POST', 'committee/documents/bd-test-public/withdraw');
  assert.equal(withdraw.status, 200);
  assert.equal(withdraw.data.publishScope, 'login');
  const withdrawAgain = await request('pc-1', 'POST', 'committee/documents/bd-test-public/withdraw');
  assert.equal(withdrawAgain.status, 200, '重复撤下幂等');
  assert.equal(withdrawAgain.data.publishScope, 'login');
  const unpublishAudits = await request('pc-1', 'GET', 'committee/publication-audits?resourceType=document&resourceId=bd-test-public&action=unpublish');
  assert.equal(unpublishAudits.status, 200);
  assert.ok(unpublishAudits.data.rows.length >= 1, '撤下写 unpublish 留痕');
  assert.equal(unpublishAudits.data.rows[0].newValue.publishScope, 'login');

  // 撤下后公共门厅不可见；表行仍在（撤下＝改范围，不删行）
  const portalAfter = await anonymous('/api/public/portal');
  assert.ok(!portalAfter.data.documents.some((row) => row.id === 'bd-test-public'));
  assert.ok(db.prepare('SELECT id FROM branch_docs WHERE id = ?').get('bd-test-public'), '撤下不删表行');

  // 非党委归属行不可经本端点改写
  db.prepare('INSERT INTO branch_docs (id, data) VALUES (?, ?)').run('bd-branch-1', JSON.stringify({
    id: 'bd-branch-1', title: '支部文件', ownerScope: 'branch', branchId: 'br-b1', cat: 'party-doc', status: 'current',
  }));
  const branchRow = await request('pc-1', 'PATCH', 'committee/documents/bd-branch-1', { title: 'x' });
  assert.equal(branchRow.status, 403, '非党委归属行不得经本端点改写');
  const missing = await request('pc-1', 'PATCH', 'committee/documents/bd-none', { title: 'x' });
  assert.equal(missing.status, 404);

  // 白名单外字段 400
  const unknownField = await request('pc-1', 'PATCH', 'committee/documents/bd-test-login', { ownerScope: 'branch' });
  assert.equal(unknownField.status, 400);
});

// ════════════════════════════════════════════════════════════════
//  二、支部档案
// ════════════════════════════════════════════════════════════════

test('支部档案：activityId 必须是本支部活动（他支部 / 不存在 422，本支部 201）', async () => {
  db.prepare('INSERT INTO activities (id, data) VALUES (?, ?)').run('act-b2-archive', JSON.stringify({
    id: 'act-b2-archive', title: '第二支部活动', type: '主题党日', date: '2026-11-02',
    branchId: 'br-b2', visibility: 'branch', status: 'published',
  }));
  db.prepare('INSERT INTO activities (id, data) VALUES (?, ?)').run('act-b1-archive', JSON.stringify({
    id: 'act-b1-archive', title: '本支部活动', type: '主题党日', date: '2026-11-02',
    branchId: 'br-b1', visibility: 'branch', status: 'published',
  }));

  const crossBranch = await request('pc-1', 'POST', 'committee/archive-records', {
    branchId: 'br-b1', title: '引用他支部活动', category: '其他', activityId: 'act-b2-archive',
  });
  assert.equal(crossBranch.status, 422, '不得引用其他支部的活动');
  assert.match(String(crossBranch.data.error), /不属于支部/);

  const missing = await request('pc-1', 'POST', 'committee/archive-records', {
    branchId: 'br-b1', title: '引用不存在活动', category: '其他', activityId: 'act-none',
  });
  assert.equal(missing.status, 422, '活动不存在须 422');

  const ok = await request('pc-1', 'POST', 'committee/archive-records', {
    branchId: 'br-b1', title: '引用本支部活动', category: '其他', activityId: 'act-b1-archive', activityName: '本支部活动',
  });
  assert.equal(ok.status, 201);
  assert.equal(ok.data.activityId, 'act-b1-archive');
  assert.equal(ok.data.activityName, '本支部活动');
});

test('支部档案：指定 branchId 写入成功；缺 branchId / 未知支部 / 缺字段 422；不改支部活动', async () => {
  const activity = {
    id: 'act-b1', title: '支部主题党日', type: '主题党日', date: '2026-11-01',
    branchId: 'br-b1', visibility: 'branch', status: 'published',
  };
  db.prepare('INSERT INTO activities (id, data) VALUES (?, ?)').run(activity.id, JSON.stringify(activity));
  const beforeActivity = db.prepare('SELECT data FROM activities WHERE id = ?').get('act-b1').data;

  const created = await request('pc-1', 'POST', 'committee/archive-records', {
    id: 'ar-test-1',
    branchId: 'br-b1',
    title: '支部党员大会会议记录',
    category: '其他',
    period: '2026-11-01',
    note: '党委补录',
  });
  assert.equal(created.status, 201);
  assert.equal(created.data.branchId, 'br-b1');
  assert.equal(created.data.category, '其他');
  assert.equal(created.data.archiveDate, '2026-11-01', 'period 为日期时回落 archiveDate');
  assert.equal(created.data.status, 'archived');
  assert.equal(created.data.createdBy, 'pc-1');
  assert.equal(created.data.uploadedBy, 'pc-1');
  assert.ok(created.data.createdAt);

  const stored = JSON.parse(db.prepare('SELECT data FROM archive_records WHERE id = ?').get('ar-test-1').data);
  assert.equal(stored.branchId, 'br-b1');

  // 党委只新增档案记录，不改该支部活动本身
  const afterActivity = db.prepare('SELECT data FROM activities WHERE id = ?').get('act-b1').data;
  assert.equal(afterActivity, beforeActivity, '写入档案记录不得改动支部活动行');

  const missingBranch = await request('pc-1', 'POST', 'committee/archive-records', {
    title: '缺支部', category: '其他',
  });
  assert.equal(missingBranch.status, 422);
  const unknownBranch = await request('pc-1', 'POST', 'committee/archive-records', {
    branchId: 'br-none', title: '未知支部', category: '其他',
  });
  assert.equal(unknownBranch.status, 422);
  const missingCategory = await request('pc-1', 'POST', 'committee/archive-records', {
    branchId: 'br-b1', title: '缺类别',
  });
  assert.equal(missingCategory.status, 422);
  const missingTitle = await request('pc-1', 'POST', 'committee/archive-records', {
    branchId: 'br-b1', category: '其他',
  });
  assert.equal(missingTitle.status, 422);

  const scoped = await request('pc-1', 'GET', 'committee/archive-records?branchId=br-b1');
  assert.equal(scoped.status, 200);
  assert.ok(scoped.data.some((row) => row.id === 'ar-test-1'));
  const other = await request('pc-1', 'GET', 'committee/archive-records?branchId=br-b2');
  assert.ok(!other.data.some((row) => row.id === 'ar-test-1'), '按支部过滤不串支部');

  const denied = await request('sec-1', 'POST', 'committee/archive-records', {
    branchId: 'br-b1', title: '越权补录', category: '其他',
  });
  assert.equal(denied.status, 403, '支部账号不得经党委写口补录档案');
});

test('支部档案：写口推进 `archiveRecords` 集合版本（键名与客户端 baseline 同名）', async () => {
  const versionOf = (name) => (db.prepare('SELECT version FROM collection_versions WHERE name = ?').get(name) || {}).version || 0;
  const before = versionOf('archiveRecords');
  const created = await request('pc-1', 'POST', 'committee/archive-records', {
    branchId: 'br-b1', title: '版本推进验证', category: '其他',
  });
  assert.equal(created.status, 201);
  assert.ok(versionOf('archiveRecords') > before, '写档案必须推进 archiveRecords 版本');
  assert.equal(versionOf('archive_records'), 0, '不得再 bump 错位键 archive_records（整表快照会删掉该行）');
});

// ════════════════════════════════════════════════════════════════
//  三、名册提案
// ════════════════════════════════════════════════════════════════

test('名册提案：创建起点 pending-org-approval；重复在途 409；fromStage 不一致 / 跨支部 422', async () => {
  const created = await request('pc-1', 'POST', 'committee/roster-proposals', {
    branchId: 'br-b1',
    personId: 'mem-1',
    fromStage: '积极分子',
    toStage: '发展对象',
    note: '党委建议推进',
  });
  assert.equal(created.status, 201);
  assert.equal(created.data.status, 'pending-org-approval');
  assert.equal(created.data.meetingResult, 'committee-proposal');
  assert.equal(created.data.source, 'committee-proposal');
  assert.equal(created.data.proposedBy, 'pc-1');
  assert.equal(created.data.createdBy, 'pc-1');
  assert.match(created.data.id, /^mcr-/);
  assert.equal(userRow('mem-1').developStage, '积极分子', '党委提案不得直接改阶段');

  const duplicate = await request('pc-1', 'POST', 'committee/roster-proposals', {
    branchId: 'br-b1', personId: 'mem-1', fromStage: '积极分子', toStage: '正式党员',
  });
  assert.equal(duplicate.status, 409, '同 (branchId, personId) 在途提案须 409');

  const badStage = await request('pc-1', 'POST', 'committee/roster-proposals', {
    branchId: 'br-b1', personId: 'mem-1', fromStage: '积极分子', toStage: '神秘阶段',
  });
  assert.equal(badStage.status, 422, 'toStage 不在服务端白名单须 422');
  assert.match(String(badStage.data.error), /toStage 非法/);

  const stale = await request('pc-1', 'POST', 'committee/roster-proposals', {
    branchId: 'br-b1', personId: 'mem-1', fromStage: '预备党员', toStage: '正式党员',
  });
  assert.equal(stale.status, 422, 'fromStage 与当前阶段不一致须 422');

  const crossBranch = await request('pc-1', 'POST', 'committee/roster-proposals', {
    branchId: 'br-b1', personId: 'mem-2', fromStage: '预备党员', toStage: '正式党员',
  });
  assert.equal(crossBranch.status, 422, '成员不属于该支部须 422');

  const unknownBranch = await request('pc-1', 'POST', 'committee/roster-proposals', {
    branchId: 'br-none', personId: 'mem-1', fromStage: '积极分子', toStage: '发展对象',
  });
  assert.equal(unknownBranch.status, 422);

  const unknownPerson = await request('pc-1', 'POST', 'committee/roster-proposals', {
    branchId: 'br-b1', personId: 'nobody', fromStage: '积极分子', toStage: '发展对象',
  });
  assert.equal(unknownPerson.status, 422);

  const missing = await request('pc-1', 'POST', 'committee/roster-proposals', { branchId: 'br-b1' });
  assert.equal(missing.status, 422);

  // 跨支部不可见
  const br1 = await request('pc-1', 'GET', 'committee/roster-proposals?branchId=br-b1');
  assert.equal(br1.status, 200);
  assert.ok(br1.data.some((row) => row.id === created.data.id));
  const br2 = await request('pc-1', 'GET', 'committee/roster-proposals?branchId=br-b2');
  assert.ok(!br2.data.some((row) => row.id === created.data.id), '跨支部提案不可见');

  const denied = await request('sec-1', 'GET', 'committee/roster-proposals');
  assert.equal(denied.status, 403, '支部账号不得读取党委名册提案');
});

test('名册提案：组织委员 approve → 支书 confirm 后阶段才变；党委直改 developStage 403，其他字段不受误伤', async () => {
  const list = await request('pc-1', 'GET', 'committee/roster-proposals?branchId=br-b1&status=pending-org-approval');
  assert.equal(list.status, 200);
  const proposal = list.data.find((row) => row.personId === 'mem-1');
  assert.ok(proposal, '应存在 mem-1 的在途提案');

  // 组织委员审批
  const approved = await request('org-1', 'POST', `member-change-requests/${proposal.id}/approve`);
  assert.equal(approved.status, 200);
  assert.equal(approved.data.status, 'pending-secretary');
  assert.equal(userRow('mem-1').developStage, '积极分子', '审批后阶段尚未变化');

  // 支书确认 → 阶段落库
  const confirmed = await request('sec-1', 'POST', `member-change-requests/${proposal.id}/confirm`);
  assert.equal(confirmed.status, 200);
  assert.equal(confirmed.data.status, 'completed');
  assert.equal(userRow('mem-1').developStage, '发展对象', '支书确认后阶段才变');

  // 党委直接 PATCH 阶段 ⇒ 403
  const denied = await request('pc-1', 'PATCH', 'users/mem-2', { developStage: '正式党员' });
  assert.equal(denied.status, 403);
  assert.match(String(denied.data.error), /名册提案/);
  assert.equal(userRow('mem-2').developStage, '预备党员', '被拒请求不得改动落库值');

  // 其他字段不被本规则误伤（name 原本允许）
  const renamed = await request('pc-1', 'PATCH', 'users/mem-2', { name: '成员乙（改名）' });
  assert.equal(renamed.status, 200, '党委改其他允许字段不得因 developStage 规则被拒');
  assert.equal(userRow('mem-2').name, '成员乙（改名）');

  // 已完成的提案不再挡新提案（终态不判重）
  const nextProposal = await request('pc-1', 'POST', 'committee/roster-proposals', {
    branchId: 'br-b1', personId: 'mem-1', fromStage: '发展对象', toStage: '预备党员',
  });
  assert.equal(nextProposal.status, 201, '终态提案不阻塞新提案');
});
