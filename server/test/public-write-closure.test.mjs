// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  server/test/public-write-closure.test.mjs —— 通用资源口的「公开面」写口收口（批次 537 波次 1 · G1）
//
//  覆盖：
//   · 支书 / 普通成员向 `POST/PATCH /notices`、`/branchDocs` 夹带 `publishScope` / `publishExpiresAt` /
//     `publicSummary` 一律 403「无权限：公开范围仅党委可设」；
//   · 党委（party-staff）走通用口 ⇒ 400，提示改走 `/committee/notices` / `/committee/documents`；
//   · 不含公开面字段的普通通知 / 支部文件写入不受影响（既有写门与字段照旧）。
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

const PUBLIC_FACE = {
  publishScope: 'public',
  publishExpiresAt: '2027-12-31T00:00:00.000Z',
  publicSummary: '公开摘要',
};

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
    // 批次 564：整行写口要求 If-Match；本例只验公开面字段收口，用 `*` 显式强制写（版本冲突另见 if-match.test.mjs）
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokens[personId]}`, ...(method === 'PATCH' ? { 'If-Match': '*' } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const data = response.status === 204 ? null : await response.json();
  return { status: response.status, data };
}

const noticeRow = (id) => {
  const found = db.prepare('SELECT data FROM notices WHERE id = ?').get(String(id));
  return found ? JSON.parse(found.data) : null;
};

test('支书 / 普通成员夹带公开面字段写通知或支部文件 ⇒ 403', async () => {
  for (const personId of ['sec-1', 'mem-1']) {
    for (const [resource, body] of [
      ['notices', { title: '越权公开通知', content: '正文', ...PUBLIC_FACE }],
      ['branchDocs', { title: '越权公开文件', fileName: 'a.pdf', ...PUBLIC_FACE }],
    ]) {
      const res = await request(personId, 'POST', resource, body);
      assert.equal(res.status, 403, `${personId} 不得经通用 ${resource} 写公开面`);
      assert.match(String(res.data.error), /公开范围仅党委可设/);
    }
  }

  // 单字段也拦（不要求三个字段同时出现）
  for (const key of Object.keys(PUBLIC_FACE)) {
    const res = await request('sec-1', 'POST', 'notices', { title: `只带 ${key}`, content: '正文', [key]: PUBLIC_FACE[key] });
    assert.equal(res.status, 403, `仅含 ${key} 也须 403`);
  }
});

test('党委走通用口 ⇒ 400，指向党委发布口', async () => {
  for (const [resource, body] of [
    ['notices', { title: '党委通用口通知', content: '正文', ...PUBLIC_FACE }],
    ['branchDocs', { title: '党委通用口文件', fileName: 'a.pdf', ...PUBLIC_FACE }],
  ]) {
    const res = await request('pc-1', 'POST', resource, body);
    assert.equal(res.status, 400, `党委也不得经通用 ${resource} 写公开面`);
    assert.match(String(res.data.error), /\/committee\/notices/);
    assert.match(String(res.data.error), /\/committee\/documents/);
  }
});

test('PATCH 同理：非党委 403、党委 400；未命中行不先报 404', async () => {
  const created = await request('sec-1', 'POST', 'notices', {
    title: '普通通知', content: '普通正文', audience: ['all'], priority: 'normal', publishDate: '2026-11-08',
  });
  assert.equal(created.status, 201, '普通通知写入不受影响');
  const noticeId = created.data.id;

  for (const [personId, status] of [['sec-1', 403], ['mem-1', 403], ['pc-1', 400]]) {
    const res = await request(personId, 'PATCH', `notices/${noticeId}`, { publicSummary: '想改成公开摘要' });
    assert.equal(res.status, status, `${personId} PATCH 夹带公开面字段须 ${status}`);
  }
  // 普通字段仍可改
  const normal = await request('sec-1', 'PATCH', `notices/${noticeId}`, { title: '普通通知（改名）' });
  assert.equal(normal.status, 200);
  assert.equal(noticeRow(noticeId).title, '普通通知（改名）');
  assert.equal(noticeRow(noticeId).publishScope, undefined, '未写入任何公开面字段');
});

test('普通通知 / 支部文件写入不受影响', async () => {
  const notice = await request('sec-1', 'POST', 'notices', {
    title: '支委通知', content: '本周安排', priority: 'urgent', audience: ['all'], publishDate: '2026-11-08',
  });
  assert.equal(notice.status, 201);
  assert.equal(notice.data.branchId, 'br-b1');
  assert.equal(notice.data.publishScope, undefined);

  const doc = await request('sec-1', 'POST', 'branchDocs', {
    title: '支部文件', fileName: 'notice.pdf', fileSize: 1024, format: 'pdf', cat: 'branch-doc',
  });
  assert.equal(doc.status, 201, '支委可写支部文件（不含公开面字段）');
  assert.equal(doc.data.branchId, 'br-b1');
});
