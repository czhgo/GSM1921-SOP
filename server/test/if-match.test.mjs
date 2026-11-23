// role: [工程师]+[AI]
// server/test/if-match.test.mjs — 全资源乐观锁（批次 564 · `repair-field-mismatch-and-refresh-help` Task 18）
// 覆盖（纯 node，自起 `:memory:` 库，不连 3000）：
//   ① 无 `If-Match` PATCH 已有 `updatedAt` 的行 ⇒ 428，且库里值未变；
//   ② 带过期 `updatedAt` ⇒ 409，响应含 `latest`（服务端当前整行），库里值未变；
//   ③ 带当前 `updatedAt` ⇒ 200，且返回行 `updatedAt` 前进；
//   ④ `If-Match: *` ⇒ 200（显式强制写）；
//   ⑤ `db.js::backfillUpdatedAt` 回填缺字段行后无空 `updatedAt`，重复调用幂等（行数不变）。
// 运行：cd server; $env:DISABLE_PASSWORD_CHECK=1; node --test test/if-match.test.mjs
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';

import { createApp } from '../app.js';
import { seedDatabase } from '../seed.js';
import { backfillUpdatedAt } from '../db.js';

let server, base, db, token;

before(async () => {
  const app = createApp({ dbPath: ':memory:' });
  db = app.locals.db;
  await seedDatabase(db);
  server = app.listen(0);
  base = `http://127.0.0.1:${server.address().port}`;
  const res = await fetch(`${base}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ personId: '2300010001', password: '123456' }), // 支书（通知可写）
  });
  assert.equal(res.status, 200, '登录失败');
  token = (await res.json()).token;
});

after(() => {
  server.closeAllConnections?.();
  return new Promise((resolve) => server.close(resolve));
});

const auth = (extra = {}) => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${token}`,
  ...extra,
});

/** 建一条通知（POST 已统一盖 `updatedAt`，见批次 562 Task 8） */
async function createNotice(title) {
  const res = await fetch(`${base}/api/v1/notices`, {
    method: 'POST',
    headers: auth(),
    body: JSON.stringify({ title, content: '乐观锁用例', branchId: 'br-b1' }),
  });
  assert.equal(res.status, 201, '通知创建失败');
  return res.json();
}

const patchNotice = (id, body, extraHeaders = {}) => fetch(`${base}/api/v1/notices/${id}`, {
  method: 'PATCH',
  headers: auth(extraHeaders),
  body: JSON.stringify(body),
});

const dbNotice = (id) => JSON.parse(db.prepare('SELECT data FROM notices WHERE id = ?').get(id).data);

test('① 无 If-Match ⇒ 428 PRECONDITION_REQUIRED，且不写库', async () => {
  const row = await createNotice('乐观锁-428');
  assert.ok(row.updatedAt, 'POST 返回行须带 updatedAt');
  const res = await patchNotice(row.id, { title: '乐观锁-428-改' });
  assert.equal(res.status, 428);
  const body = await res.json();
  assert.equal(body.code, 'PRECONDITION_REQUIRED');
  assert.equal(dbNotice(row.id).title, '乐观锁-428', '428 时库里值不得变');
});

test('② 带过期 updatedAt ⇒ 409 VERSION_CONFLICT ＋ latest，且不写库', async () => {
  const row = await createNotice('乐观锁-409');
  const stale = '2000-01-01T00:00:00.000Z';
  const res = await patchNotice(row.id, { title: '乐观锁-409-改' }, { 'If-Match': stale });
  assert.equal(res.status, 409);
  const body = await res.json();
  assert.equal(body.code, 'VERSION_CONFLICT');
  assert.ok(body.latest && body.latest.id === row.id, '409 须带服务端当前整行 latest');
  assert.equal(body.latest.updatedAt, row.updatedAt);
  assert.equal(dbNotice(row.id).title, '乐观锁-409', '409 时库里值不得变');
});

test('③ 带当前 updatedAt ⇒ 200，且返回行 updatedAt 前进', async () => {
  const row = await createNotice('乐观锁-200');
  await new Promise((r) => setTimeout(r, 5)); // 保证时间戳可分辨（ISO 毫秒）
  const res = await patchNotice(row.id, { title: '乐观锁-200-改' }, { 'If-Match': row.updatedAt });
  assert.equal(res.status, 200);
  const next = await res.json();
  assert.equal(next.title, '乐观锁-200-改');
  assert.ok(next.updatedAt > row.updatedAt, `updatedAt 须前进（旧 ${row.updatedAt} / 新 ${next.updatedAt}）`);
  assert.equal(dbNotice(row.id).title, '乐观锁-200-改');
});

test('④ If-Match: * ⇒ 200（显式强制写）', async () => {
  const row = await createNotice('乐观锁-星号');
  const res = await patchNotice(row.id, { title: '乐观锁-星号-改' }, { 'If-Match': '*' });
  assert.equal(res.status, 200);
  assert.equal((await res.json()).title, '乐观锁-星号-改');
});

test('⑤ backfillUpdatedAt 回填缺字段行后无空 updatedAt，重复调用幂等', async () => {
  // 直接造一行缺 `updatedAt` 的历史行（绕开写口）
  db.prepare('INSERT OR REPLACE INTO tasks (id, data) VALUES (?, ?)')
    .run('tsk-if-match-legacy', JSON.stringify({ id: 'tsk-if-match-legacy', title: '历史任务', createdAt: '2026-01-01T00:00:00.000Z' }));
  const countBefore = db.prepare('SELECT COUNT(*) AS n FROM tasks').get().n;
  backfillUpdatedAt(db);
  const rows = db.prepare('SELECT data FROM tasks').all().map((r) => JSON.parse(r.data));
  assert.equal(rows.length, countBefore, '回填不得增删行');
  assert.ok(rows.every((r) => typeof r.updatedAt === 'string' && r.updatedAt.length > 0), '回填后不得有空 updatedAt');
  const legacy = rows.find((r) => r.id === 'tsk-if-match-legacy');
  assert.equal(legacy.updatedAt, '2026-01-01T00:00:00.000Z', '缺 createdAt 以外的行取 createdAt');
  const patchedAgain = backfillUpdatedAt(db);
  assert.equal(patchedAgain, 0, '重复调用应为幂等（不再回填）');
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM tasks').get().n, countBefore);
});
