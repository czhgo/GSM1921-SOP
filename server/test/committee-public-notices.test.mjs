// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  server/test/committee-public-notices.test.mjs —— 党委公开通知写口（批次 537 波次 1 · G2）
//
//  覆盖：
//   · 党委创建 201：id / 归属 / 来源 / 受众 / 类型 / 日期 / 创建人由服务端强制；
//   · 支部账号（支书 / 普通成员）对列表 / 创建 / 编辑 / 撤下一律 403；
//   · `publishScope` 只收 login / public；public 缺有效期或已过期 ⇒ 422；
//   · 公开门厅可见：`GET /api/public/portal` 含该条；有效期过后 `GET /api/public/notices/:id` ⇒ 404；
//   · 发布留痕：创建写 publish、撤下写 unpublish、改期写 update-scope；
//   · 白名单外字段 400；撤下幂等。
//
//  自包含：`createApp({ dbPath: ':memory:' })` + 直写 users / branches；HTTP 直连（无浏览器）。
// ════════════════════════════════════════════════════════════════

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../app.js';

const BRANCHES = [
  { id: 'br-b1', name: '本科第一党支部', type: '本科生', status: 'active', createdAt: '2026-01-01T00:00:00.000Z' },
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

async function publicGet(path) {
  const response = await fetch(`${base}/api/public/${path}`);
  const data = await response.json().catch(() => null);
  return { status: response.status, data };
}

const futureIso = (days = 30) => new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
const noticeRow = (id) => {
  const found = db.prepare('SELECT data FROM notices WHERE id = ?').get(String(id));
  return found ? JSON.parse(found.data) : null;
};

async function createNotice(overrides = {}) {
  return request('pc-1', 'POST', 'committee/notices', {
    title: '院级公开通知',
    content: '请各支部按要求落实。',
    ...overrides,
  });
}

test('党委创建 201：归属 / 来源 / 受众 / 类型 / 日期 / 创建人由服务端强制', async () => {
  const res = await createNotice({
    id: 'ntc-forged',
    priority: 'urgent',
    publishScope: 'public',
    publishExpiresAt: futureIso(),
    // 以下全为伪造值：服务端必须覆盖
    branchId: 'br-b1',
    source: 'branch',
    audience: ['secretary'],
    kind: 'system',
    publishDate: '1999-01-01',
    createdBy: 'sec-1',
    createdAt: '1999-01-01T00:00:00.000Z',
  });
  assert.equal(res.status, 201);
  assert.match(res.data.id, /^ntc-[0-9a-f]{8}$/, 'id 必须由服务端生成 ntc-<uuid8>');
  assert.notEqual(res.data.id, 'ntc-forged');
  assert.equal(res.data.branchId, 'pc-gsm');
  assert.equal(res.data.source, 'committee');
  assert.deepEqual(res.data.audience, ['all']);
  assert.equal(res.data.kind, 'announcement');
  assert.match(res.data.publishDate, /^\d{4}-\d{2}-\d{2}$/);
  assert.notEqual(res.data.publishDate, '1999-01-01');
  assert.equal(res.data.createdBy, 'pc-1');
  assert.notEqual(res.data.createdAt, '1999-01-01T00:00:00.000Z');
  assert.equal(res.data.priority, 'urgent');

  // 落库校验
  const stored = noticeRow(res.data.id);
  assert.equal(stored.branchId, 'pc-gsm');
  assert.equal(stored.source, 'committee');
  assert.equal(stored.kind, 'announcement');
});

test('支部账号（支书 / 普通成员）对党委通知写口一律 403', async () => {
  const created = await createNotice({ title: '权限用例' });
  assert.equal(created.status, 201);
  const id = created.data.id;

  for (const personId of ['sec-1', 'mem-1']) {
    assert.equal((await request(personId, 'GET', 'committee/notices')).status, 403, `${personId} 不得读列表`);
    assert.equal((await request(personId, 'POST', 'committee/notices', { title: 'x', content: 'y' })).status, 403, `${personId} 不得创建`);
    assert.equal((await request(personId, 'PATCH', `committee/notices/${id}`, { title: 'x' })).status, 403, `${personId} 不得编辑`);
    assert.equal((await request(personId, 'POST', `committee/notices/${id}/withdraw`)).status, 403, `${personId} 不得撤下`);
  }
});

test('publishScope：枚举 + public 缺有效期 / 已过期 ⇒ 422', async () => {
  assert.equal((await createNotice({ publishScope: 'world' })).status, 422);
  assert.equal((await createNotice({ publishScope: 'branch' })).status, 422, '党委通知不收 branch 范围');

  const noExpiry = await createNotice({ publishScope: 'public' });
  assert.equal(noExpiry.status, 422, 'public 缺有效期须 422');

  const expired = await createNotice({ publishScope: 'public', publishExpiresAt: new Date(Date.now() - 60000).toISOString() });
  assert.equal(expired.status, 422, 'public 过期时间须 422');

  const login = await createNotice({ publishScope: 'login' });
  assert.equal(login.status, 201);
  assert.equal(login.data.publishScope, 'login');
});

test('公开门厅：公开通知可见；有效期过后 404 且不再出现在 portal', async () => {
  const created = await createNotice({
    title: '门厅可见通知',
    content: '公开正文',
    publishScope: 'public',
    publishExpiresAt: futureIso(2),
  });
  assert.equal(created.status, 201);
  const id = created.data.id;

  const detail = await publicGet(`notices/${encodeURIComponent(id)}`);
  assert.equal(detail.status, 200);
  assert.equal(detail.data.title, '门厅可见通知');
  assert.equal(detail.data.content, '公开正文');

  const portal = await publicGet('portal');
  assert.equal(portal.status, 200);
  assert.ok(portal.data.notices.some((row) => row.id === id), '公开通知须进公共门厅');

  // 模拟有效期已过（不走 API：public 未来的有效期是写口硬校验）
  const stored = noticeRow(id);
  stored.publishExpiresAt = new Date(Date.now() - 60000).toISOString();
  db.prepare('INSERT OR REPLACE INTO notices (id, data) VALUES (?, ?)').run(id, JSON.stringify(stored));

  assert.equal((await publicGet(`notices/${encodeURIComponent(id)}`)).status, 404);
  const portalAfter = await publicGet('portal');
  assert.ok(!portalAfter.data.notices.some((row) => row.id === id), '过期后须退出公共门厅');

  // 登录可见的通知不进公开门厅
  const loginOnly = await createNotice({ title: '仅登录可见', publishScope: 'login' });
  assert.equal(loginOnly.status, 201);
  assert.equal((await publicGet(`notices/${encodeURIComponent(loginOnly.data.id)}`)).status, 404);
});

test('发布留痕：创建 publish / 改期 update-scope / 撤下 unpublish；撤下幂等', async () => {
  const created = await createNotice({ title: '留痕通知', publishScope: 'login' });
  assert.equal(created.status, 201);
  const id = created.data.id;

  const initial = await request('pc-1', 'GET', `committee/publication-audits?resourceType=notice&resourceId=${id}`);
  assert.equal(initial.status, 200);
  assert.equal(initial.data.length, 1, '创建写一条 publish 留痕');
  assert.equal(initial.data[0].action, 'publish');
  assert.equal(initial.data[0].actorId, 'pc-1');
  assert.equal(initial.data[0].oldValue, null);
  assert.equal(initial.data[0].newValue.publishScope, 'login');

  const expires1 = futureIso(10);
  const published = await request('pc-1', 'PATCH', `committee/notices/${id}`, {
    publishScope: 'public', publishExpiresAt: expires1,
  });
  assert.equal(published.status, 200);
  assert.equal(published.data.publishScope, 'public');
  const publishes = await request('pc-1', 'GET', `committee/publication-audits?resourceId=${id}&action=publish`);
  assert.equal(publishes.data.length, 2, '发布到 public 再写一条 publish');

  const expires2 = futureIso(20);
  const rescheduled = await request('pc-1', 'PATCH', `committee/notices/${id}`, {
    publishScope: 'public', publishExpiresAt: expires2,
  });
  assert.equal(rescheduled.status, 200);
  const scopes = await request('pc-1', 'GET', `committee/publication-audits?resourceId=${id}&action=update-scope`);
  assert.equal(scopes.data.length, 1, '改期写 update-scope');
  assert.equal(scopes.data[0].oldValue.publishExpiresAt, expires1);
  assert.equal(scopes.data[0].newValue.publishExpiresAt, expires2);

  const withdrawn = await request('pc-1', 'POST', `committee/notices/${id}/withdraw`);
  assert.equal(withdrawn.status, 200);
  assert.equal(withdrawn.data.publishScope, 'login');
  const unpublish = await request('pc-1', 'GET', `committee/publication-audits?resourceId=${id}&action=unpublish`);
  assert.equal(unpublish.data.length, 1);

  const again = await request('pc-1', 'POST', `committee/notices/${id}/withdraw`);
  assert.equal(again.status, 200, '撤下幂等');
  assert.equal((await request('pc-1', 'GET', `committee/publication-audits?resourceId=${id}&action=unpublish`)).data.length, 1,
    '幂等撤下不重复写留痕');
});

test('白名单外字段 400；标题 / 正文不得置空；不存在 404', async () => {
  const created = await createNotice({ title: '白名单用例' });
  assert.equal(created.status, 201);
  const id = created.data.id;

  assert.equal((await request('pc-1', 'PATCH', `committee/notices/${id}`, { branchId: 'br-b1' })).status, 400);
  assert.equal((await request('pc-1', 'PATCH', `committee/notices/${id}`, { kind: 'system' })).status, 400);
  assert.equal((await request('pc-1', 'PATCH', `committee/notices/${id}`, { title: '   ' })).status, 422);
  assert.equal((await request('pc-1', 'PATCH', `committee/notices/${id}`, { content: '' })).status, 422);
  assert.equal((await request('pc-1', 'PATCH', 'committee/notices/ntc-none', { title: 'x' })).status, 404);

  // 列表按 publishScope 过滤 + publishDate 倒序
  const list = await request('pc-1', 'GET', 'committee/notices');
  assert.equal(list.status, 200);
  assert.ok(list.data.every((row) => row.branchId === 'pc-gsm' && row.source === 'committee'));
  const dates = list.data.map((row) => String(row.publishDate || ''));
  assert.deepEqual(dates, [...dates].sort((a, b) => b.localeCompare(a)), '按 publishDate 倒序');
  const publics = await request('pc-1', 'GET', 'committee/notices?publishScope=public');
  assert.equal(publics.status, 200);
  assert.ok(publics.data.every((row) => row.publishScope === 'public'));
});
