// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  server/test/public-portal.test.mjs —— 未登录公共门厅只读接口（2026-11-08 批次 536 · Task 6）
//
//  覆盖（全部真跑 HTTP + `:memory:` 库 + 临时上传目录，不连 :3000、不写运行库）：
//   ① 匿名 portal 只返回 public 且未过期行；活动只有摘要、通知全文、资料带 downloadUrl
//   ② 过期 / 非 public / 支部行从门厅消失；详情与下载统一 404（不区分不存在与无权）
//   ③ `?limit=` 限制 1–50，非法值回落缺省
//   ④ 三类详情只返回白名单字段（无 organizer / assignments / voteConfig / createdBy / branchId / audience）
//   ⑤ 下载 fileData（data URL）：返回字节 + 附件头 + 匿名审计（actorId=null / anonymous=true）
//   ⑥ 下载 filePath（上传根内）：返回物理文件字节并写审计
//   ⑦ 越界 filePath（绝对路径越界 / `..` 穿越 / 无附件）一律 404，且不写审计
// ════════════════════════════════════════════════════════════════
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// 上传根目录走临时目录：本文件不得向运行库 `server/uploads` 落任何文件（test-isolation-guard I4）。
const TMP_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'gsm-public-portal-'));
const UPLOAD_DIR = path.join(TMP_DIR, 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });
process.env.UPLOAD_DIR = UPLOAD_DIR;

const { createApp } = await import('../app.js');

const FUTURE = '2099-01-01T00:00:00.000Z';
const PAST = '2020-01-01T00:00:00.000Z';
const FIXTURE_FILE = 'public-portal-fixture.txt';
const SECRET_FILE = path.join(TMP_DIR, 'secret.txt');

let server;
let base;
let db;

const dataUrl = (text, mime = 'text/plain') =>
  `data:${mime};base64,${Buffer.from(text).toString('base64')}`;

function put(table, row) {
  db.prepare(`INSERT OR REPLACE INTO ${table} (id, data) VALUES (?, ?)`).run(row.id, JSON.stringify(row));
}

function seedFixtures() {
  fs.writeFileSync(path.join(UPLOAD_DIR, FIXTURE_FILE), 'file-path-bytes');
  fs.writeFileSync(SECRET_FILE, 'TOP SECRET');

  // ── 通知 ──
  put('notices', {
    id: 'ntc-pub', title: '公开通知', content: '公开通知全文', priority: 'high',
    publishDate: '2026-11-01T08:00:00.000Z', publishExpiresAt: FUTURE,
    branchId: 'pc-gsm', publishScope: 'public', kind: 'announcement',
    // 敏感字段：响应里不得出现
    audience: ['all'], reads: ['2400012345'], createdBy: '2300010001', targetBranchIds: ['all'],
  });
  put('notices', {
    id: 'ntc-pub-2', title: '第二篇公开通知', content: '第二篇公开通知全文', priority: 'normal',
    publishDate: '2026-11-05T08:00:00.000Z', publishExpiresAt: FUTURE,
    branchId: 'pc-gsm', publishScope: 'public', kind: 'announcement',
  });
  put('notices', {
    id: 'ntc-login', title: '登录可见通知', content: 'x', priority: 'normal',
    publishDate: '2026-11-02T08:00:00.000Z', publishExpiresAt: FUTURE,
    branchId: 'pc-gsm', publishScope: 'login', kind: 'announcement',
  });
  put('notices', {
    id: 'ntc-expired', title: '已过期通知', content: 'x', priority: 'normal',
    publishDate: '2026-10-01T08:00:00.000Z', publishExpiresAt: PAST,
    branchId: 'pc-gsm', publishScope: 'public', kind: 'announcement',
  });
  put('notices', {
    id: 'ntc-branch', title: '支部通知', content: 'x', priority: 'normal',
    publishDate: '2026-11-03T08:00:00.000Z', publishExpiresAt: FUTURE,
    branchId: 'br-b1', publishScope: 'public', kind: 'announcement',
  });
  put('notices', {
    id: 'ntc-bad-expiry', title: '有效期非法', content: 'x', priority: 'normal',
    publishDate: '2026-11-04T08:00:00.000Z', publishExpiresAt: 'not-a-date',
    branchId: 'pc-gsm', publishScope: 'public', kind: 'announcement',
  });

  // ── 活动（党委归属）──
  put('activities', {
    id: 'act-pub', title: '院级公开活动', type: 'meeting', date: '2026-11-02T09:00:00.000Z',
    location: '光华楼 101', publicSummary: '公开活动摘要',
    ownerScope: 'committee', branchId: 'pc-gsm', publishScope: 'public', publishExpiresAt: FUTURE,
    archived: false, status: 'published',
    // 敏感字段：响应里不得出现
    description: '内部描述', agenda: [{ title: '议程' }], assignments: [{ personId: '2400012345' }],
    organizer: { personId: '2400012346' }, voteConfig: { method: 'secret' },
    createdBy: '2300010001', targetBranchIds: ['all'],
  });
  put('activities', {
    id: 'act-pub-2', title: '第二场院级公开活动', type: 'lecture', date: '2026-11-06T09:00:00.000Z',
    location: '线上', publicSummary: '第二场摘要',
    ownerScope: 'committee', branchId: 'pc-gsm', publishScope: 'public', publishExpiresAt: FUTURE,
    archived: false, status: 'published',
  });
  put('activities', {
    id: 'act-login', title: '登录可见活动', type: 'meeting', date: '2026-11-03T09:00:00.000Z',
    ownerScope: 'committee', branchId: 'pc-gsm', publishScope: 'login', publishExpiresAt: FUTURE,
    archived: false, status: 'published',
  });
  put('activities', {
    id: 'act-expired', title: '已过期活动', type: 'meeting', date: '2026-10-01T09:00:00.000Z',
    ownerScope: 'committee', branchId: 'pc-gsm', publishScope: 'public', publishExpiresAt: PAST,
    archived: false, status: 'published',
  });
  put('activities', {
    id: 'act-archived', title: '已归档活动', type: 'meeting', date: '2026-11-04T09:00:00.000Z',
    ownerScope: 'committee', branchId: 'pc-gsm', publishScope: 'public', publishExpiresAt: FUTURE,
    archived: true, status: 'published',
  });
  put('activities', {
    id: 'act-draft', title: '草稿活动', type: 'meeting', date: '2026-11-04T09:00:00.000Z',
    ownerScope: 'committee', branchId: 'pc-gsm', publishScope: 'public', publishExpiresAt: FUTURE,
    archived: false, status: 'draft',
  });
  put('activities', {
    id: 'act-branch', title: '支部活动', type: 'meeting', date: '2026-11-04T09:00:00.000Z',
    ownerScope: 'branch', branchId: 'br-b1', publishScope: 'public', publishExpiresAt: FUTURE,
    archived: false, status: 'published',
  });
  put('activities', {
    id: 'act-no-expiry', title: '缺有效期', type: 'meeting', date: '2026-11-04T09:00:00.000Z',
    ownerScope: 'committee', branchId: 'pc-gsm', publishScope: 'public',
    archived: false, status: 'published',
  });

  // ── 资料（党委归属）──
  put('branch_docs', {
    id: 'bd-pub', title: '公开资料', summary: '资料摘要', format: 'txt',
    fileName: '公开资料.txt', fileSize: 12, updatedAt: '2026-11-01T00:00:00.000Z',
    publishScope: 'public', publishExpiresAt: FUTURE, ownerScope: 'committee', branchId: 'pc-gsm',
    bodyText: '资料正文', fileData: dataUrl('hello-public'), filePath: null,
    // 敏感字段：响应里不得出现
    uploadedBy: '2300010001', desc: '内部说明',
  });
  put('branch_docs', {
    id: 'bd-pub-2', title: '第二份公开资料', summary: '第二份摘要', format: 'pdf',
    fileName: 'second.pdf', fileSize: 6, updatedAt: '2026-11-06T00:00:00.000Z',
    publishScope: 'public', publishExpiresAt: FUTURE, ownerScope: 'committee', branchId: 'pc-gsm',
    fileData: dataUrl('second', 'application/pdf'),
  });
  put('branch_docs', {
    id: 'bd-file', title: '物理文件资料', summary: '走 filePath', format: 'txt',
    fileName: FIXTURE_FILE, fileSize: 15, updatedAt: '2026-10-02T00:00:00.000Z',
    publishScope: 'public', publishExpiresAt: FUTURE, ownerScope: 'committee', branchId: 'pc-gsm',
    filePath: `/api/v1/uploads/${FIXTURE_FILE}`, fileData: null,
  });
  put('branch_docs', {
    id: 'bd-outside', title: '越界绝对路径', format: 'txt', fileName: 'secret.txt',
    updatedAt: '2026-10-03T00:00:00.000Z', publishScope: 'public', publishExpiresAt: FUTURE,
    ownerScope: 'committee', branchId: 'pc-gsm', filePath: SECRET_FILE,
  });
  put('branch_docs', {
    id: 'bd-traversal', title: '穿越相对路径', format: 'txt', fileName: 'secret.txt',
    updatedAt: '2026-10-04T00:00:00.000Z', publishScope: 'public', publishExpiresAt: FUTURE,
    ownerScope: 'committee', branchId: 'pc-gsm', filePath: '../secret.txt',
  });
  put('branch_docs', {
    id: 'bd-nofile', title: '无附件资料', format: 'txt', fileName: 'none.txt',
    updatedAt: '2026-10-05T00:00:00.000Z', publishScope: 'public', publishExpiresAt: FUTURE,
    ownerScope: 'committee', branchId: 'pc-gsm', filePath: null, fileData: null,
  });
  put('branch_docs', {
    id: 'bd-login', title: '登录可见资料', format: 'txt', fileName: 'login.txt',
    updatedAt: '2026-10-06T00:00:00.000Z', publishScope: 'login', publishExpiresAt: FUTURE,
    ownerScope: 'committee', branchId: 'pc-gsm', fileData: dataUrl('login-only'),
  });
  put('branch_docs', {
    id: 'bd-expired', title: '已过期资料', format: 'txt', fileName: 'old.txt',
    updatedAt: '2026-10-07T00:00:00.000Z', publishScope: 'public', publishExpiresAt: PAST,
    ownerScope: 'committee', branchId: 'pc-gsm', fileData: dataUrl('expired'),
  });
  put('branch_docs', {
    id: 'bd-branch', title: '支部资料', format: 'txt', fileName: 'branch.txt',
    updatedAt: '2026-10-08T00:00:00.000Z', publishScope: 'public', publishExpiresAt: FUTURE,
    ownerScope: 'branch', branchId: 'br-b1', fileData: dataUrl('branch-only'),
  });
}

const auditRows = () => db.prepare('SELECT data FROM publication_audits').all().map((r) => JSON.parse(r.data));

before(async () => {
  const app = createApp({ dbPath: ':memory:' });
  db = app.locals.db;
  seedFixtures();
  server = app.listen(0);
  base = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  server.closeAllConnections?.();
  await new Promise((resolve) => server.close(resolve));
  try {
    db.close();
  } catch {
    /* 已关闭 */
  }
  fs.rmSync(TMP_DIR, { recursive: true, force: true });
});

// ── ① 匿名门厅 ────────────────────────────────────────────────
test('① 匿名 GET /api/public/portal：只返回 public 未过期行，活动只有摘要、通知全文、资料带 downloadUrl', async () => {
  const res = await fetch(`${base}/api/public/portal`); // 无任何鉴权头
  assert.equal(res.status, 200, '匿名访问必须 200');
  assert.equal(res.headers.get('cache-control'), 'no-store');
  assert.equal(res.headers.get('set-cookie'), null, '公开接口不得写登录态 cookie');

  const body = await res.json();
  assert.deepEqual(body.notices.map((n) => n.id), ['ntc-pub-2', 'ntc-pub'], '通知按 publishDate 倒序且只含 public');
  assert.deepEqual(body.activities.map((a) => a.id), ['act-pub-2', 'act-pub'], '活动按 date 倒序且只含 public');
  assert.deepEqual(body.documents.slice(0, 2).map((d) => d.id), ['bd-pub-2', 'bd-pub'], '资料按更新时间倒序');

  assert.equal(body.notices[0].content, '第二篇公开通知全文', '通知返回全文');
  assert.deepEqual(
    Object.keys(body.notices[0]).sort(),
    ['content', 'id', 'priority', 'publishDate', 'publishExpiresAt', 'title'].sort(),
    '通知只返回白名单字段',
  );
  assert.deepEqual(
    Object.keys(body.activities[0]).sort(),
    ['date', 'id', 'location', 'publicSummary', 'publishExpiresAt', 'title', 'type'].sort(),
    '活动只返回摘要白名单字段',
  );
  assert.deepEqual(
    Object.keys(body.documents[0]).sort(),
    ['downloadUrl', 'fileName', 'fileSize', 'format', 'id', 'publishExpiresAt', 'summary', 'title', 'updatedAt'].sort(),
    '资料只返回白名单字段',
  );
  assert.equal(body.documents[1].downloadUrl, '/api/public/documents/bd-pub/download');
});

// ── ② 过期 / 非公开 / 探测统一 404 ───────────────────────────
test('② 过期与非 public 行从门厅消失；详情与下载统一 404，不区分不存在与无权', async () => {
  const portal = await (await fetch(`${base}/api/public/portal`)).json();
  const ids = new Set([
    ...portal.notices.map((n) => n.id),
    ...portal.activities.map((a) => a.id),
    ...portal.documents.map((d) => d.id),
  ]);
  for (const hidden of [
    'ntc-login', 'ntc-expired', 'ntc-branch', 'ntc-bad-expiry',
    'act-login', 'act-expired', 'act-archived', 'act-draft', 'act-branch', 'act-no-expiry',
    'bd-login', 'bd-expired', 'bd-branch',
  ]) {
    assert.ok(!ids.has(hidden), `${hidden} 不得出现在匿名门厅`);
  }

  const missing = await fetch(`${base}/api/public/notices/no-such-id`);
  const forbidden = await fetch(`${base}/api/public/notices/ntc-login`);
  assert.equal(missing.status, 404);
  assert.equal(forbidden.status, 404);
  assert.equal(await missing.text(), await forbidden.text(), '不存在与无权必须同一响应体');

  for (const [kind, id] of [
    ['notices', 'ntc-expired'], ['activities', 'act-expired'],
    ['documents', 'bd-expired'], ['documents', 'bd-login'],
  ]) {
    const res = await fetch(`${base}/api/public/${kind}/${id}`);
    assert.equal(res.status, 404, `${kind}/${id} 详情必须 404`);
  }
  const expiredDownload = await fetch(`${base}/api/public/documents/bd-expired/download`);
  assert.equal(expiredDownload.status, 404, '过期资料下载必须 404');
});

// ── ③ limit ──────────────────────────────────────────────────
test('③ ?limit= 限制 1–50；非法值回落缺省，越界值收敛到边界', async () => {
  const one = await (await fetch(`${base}/api/public/portal?limit=1`)).json();
  assert.equal(one.notices.length, 1);
  assert.equal(one.activities.length, 1);
  assert.equal(one.documents.length, 1);

  const zero = await (await fetch(`${base}/api/public/portal?limit=0`)).json();
  assert.equal(zero.notices.length, 1, 'limit=0 收敛为 1');

  const huge = await (await fetch(`${base}/api/public/portal?limit=999`)).json();
  assert.equal(huge.notices.length, 2, '上限 50 不影响本夹具（公开通知只有 2 条）');

  const invalid = await (await fetch(`${base}/api/public/portal?limit=abc`)).json();
  assert.equal(invalid.notices.length, 2, '非法 limit 回落缺省 20');
});

// ── ④ 详情白名单 ─────────────────────────────────────────────
test('④ 通知 / 活动 / 资料详情只返回白名单字段（资料额外给正文）', async () => {
  const notice = await (await fetch(`${base}/api/public/notices/ntc-pub`)).json();
  assert.equal(notice.content, '公开通知全文');
  for (const key of ['branchId', 'audience', 'reads', 'createdBy', 'targetBranchIds', 'personId']) {
    assert.ok(!(key in notice), `通知详情不得含 ${key}`);
  }

  const activity = await (await fetch(`${base}/api/public/activities/act-pub`)).json();
  assert.equal(activity.publicSummary, '公开活动摘要');
  for (const key of ['description', 'agenda', 'assignments', 'organizer', 'voteConfig', 'createdBy', 'targetBranchIds', 'branchId', 'personId']) {
    assert.ok(!(key in activity), `活动详情不得含 ${key}`);
  }

  const doc = await (await fetch(`${base}/api/public/documents/bd-pub`)).json();
  assert.equal(doc.bodyText, '资料正文', '资料详情返回正文');
  assert.equal(doc.downloadUrl, '/api/public/documents/bd-pub/download');
  for (const key of ['fileData', 'filePath', 'uploadedBy', 'branchId', 'ownerScope', 'desc', 'personId']) {
    assert.ok(!(key in doc), `资料详情不得含 ${key}`);
  }
});

// ── ⑤ 下载：fileData ─────────────────────────────────────────
test('⑤ 下载 fileData（data URL）：返回字节 + 附件头 + 匿名审计（actorId=null / anonymous=true）', async () => {
  const beforeCount = auditRows().length;
  const res = await fetch(`${base}/api/public/documents/bd-pub/download`);
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('cache-control'), 'no-store');
  assert.match(res.headers.get('content-type') || '', /^text\/plain/);
  const disposition = res.headers.get('content-disposition') || '';
  assert.match(disposition, /^attachment;/);
  assert.match(disposition, /filename\*=UTF-8''/, '中文文件名走 RFC 5987 编码');
  assert.equal(await res.text(), 'hello-public');

  const audits = auditRows();
  assert.equal(audits.length, beforeCount + 1, '成功下载必须写一条审计');
  const row = audits[audits.length - 1];
  assert.equal(row.resourceType, 'document');
  assert.equal(row.resourceId, 'bd-pub');
  assert.equal(row.action, 'download');
  assert.equal(row.actorId, null);
  assert.equal(row.actorRole, null);
  assert.equal(row.anonymous, true);
});

// ── ⑥ 下载：filePath ─────────────────────────────────────────
test('⑥ 下载 filePath（上传根内）：返回物理文件字节并写审计', async () => {
  const beforeCount = auditRows().length;
  const res = await fetch(`${base}/api/public/documents/bd-file/download`);
  assert.equal(res.status, 200);
  assert.equal(await res.text(), 'file-path-bytes');

  const audits = auditRows();
  assert.equal(audits.length, beforeCount + 1);
  assert.equal(audits[audits.length - 1].resourceId, 'bd-file');
  assert.equal(audits[audits.length - 1].anonymous, true);
});

// ── ⑦ 路径越界 ──────────────────────────────────────────────
test('⑦ 越界 filePath（绝对路径越界 / `..` 穿越 / 无附件）一律 404，且不写审计', async () => {
  const beforeCount = auditRows().length;
  for (const id of ['bd-outside', 'bd-traversal', 'bd-nofile']) {
    const res = await fetch(`${base}/api/public/documents/${id}/download`);
    assert.equal(res.status, 404, `${id} 下载必须 404`);
  }
  assert.equal(auditRows().length, beforeCount, '未成功下载不得写审计');
});

// 多支部（2026-11-19 批次 577 · `D-889` / `B-568-1` ③）：
//   未带 `?branchId=` ⇒ 现行为（支部 public 内容不出现）；带支部 ⇒ 党委内容 ∪ 该支部 public 内容。
test('公共门厅按支部：缺省只党委内容；?branchId= 时并入该支部 public 内容（列表与详情同判）', async () => {
  const plain = await (await fetch(`${base}/api/public/portal`)).json();
  assert.ok(!plain.notices.some((n) => n.id === 'ntc-branch'), '缺省不得出现支部内容');

  const scoped = await (await fetch(`${base}/api/public/portal?branchId=br-b1`)).json();
  assert.ok(scoped.notices.some((n) => n.id === 'ntc-branch'), '带支部时应并入该支部 public 通知');
  assert.ok(scoped.notices.some((n) => n.id === 'ntc-pub'), '党委内容仍在（并集，不替换）');

  assert.equal((await fetch(`${base}/api/public/notices/ntc-branch`)).status, 404, '缺省详情 404');
  assert.equal((await fetch(`${base}/api/public/notices/ntc-branch?branchId=br-b1`)).status, 200, '带支部详情 200');
  assert.equal((await fetch(`${base}/api/public/notices/ntc-branch?branchId=br-b2`)).status, 404, '异支部仍 404');
});
