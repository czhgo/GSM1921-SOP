// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  server/test/security-redteam.test.mjs —— Task 7 红队 P0 回归（2026-11-03）
//
//  为什么：`POST /api/v1/snapshot` 是整表写穿。原实现对 `actSubRecords` / `tfSubRecords`
//  直接 `continue`，普通成员构造 `{ actSubRecords: [{ id:'__root__', body:{} }] }`
//  即可清空全支部子记录（红队探针实测 200 + 数据被改，判 P0）。
//  修复落点＝`server/routes/resources/gates.js::_snapshotAggregateSubRecordDeny`：
//  按父键复算「值变化」与「删除面」，复用既有 `aggregateSubRecordWriteDeny` 的组织者/支委判据。
//
//  本文件只跑临时 `:memory:` + 真 HTTP，不连 3000、不写运行库。
// ════════════════════════════════════════════════════════════════

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../app.js';
import { seedDatabase } from '../seed.js';

process.env.DISABLE_PASSWORD_CHECK = '1';

const MEMBER = '2500010001';       // 普通成员：未组织/深度参与任何活动或专班
const ORGANIZER = '2400012347';    // act-3 / tf-003 组织者（普通成员身份）

let server, base, db;

const H = (token) => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${token}` });

before(async () => {
  const app = createApp({ dbPath: ':memory:' });
  db = app.locals.db;
  await seedDatabase(db);
  server = app.listen(0);
  base = `http://127.0.0.1:${server.address().port}`;
});

after(() => {
  server.closeAllConnections?.();
  return new Promise((resolve) => server.close(resolve));
});

async function login(personId) {
  const res = await fetch(`${base}/api/v1/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ personId }),
  });
  assert.equal(res.status, 200, `登录失败 ${personId}`);
  return (await res.json()).token;
}

const put = (table, value) => db.prepare(`INSERT OR REPLACE INTO ${table} (id, data) VALUES (?, ?)`)
  .run(value.id, JSON.stringify(value));
const readBody = (table) => {
  const found = db.prepare(`SELECT data FROM ${table} WHERE id = '__root__'`).get();
  return found ? (JSON.parse(found.data).body || {}) : {};
};

/** 快照写穿必须带齐 _versions（否则 428）；每次取最新基线，避免前一条用例推进版本后 409。 */
async function snapshot(token, payload) {
  const versionsRes = await fetch(`${base}/api/v1/snapshot/versions`, { headers: H(token) });
  const versions = (await versionsRes.json()).versions;
  return fetch(`${base}/api/v1/snapshot`, {
    method: 'POST', headers: H(token), body: JSON.stringify({ ...payload, _versions: versions }),
  });
}

test('快照清空 actSubRecords：普通成员 403，子记录原样保留（P0 回归）', async () => {
  put('act_sub_records', { id: '__root__', body: { 'act-3': { publicity: [{ title: '原稿' }] } } });
  const token = await login(MEMBER);
  const res = await snapshot(token, { actSubRecords: [{ id: '__root__', body: {} }] });
  assert.equal(res.status, 403, '普通成员不得用空 body 清空活动子记录');
  assert.deepEqual(readBody('act_sub_records'), { 'act-3': { publicity: [{ title: '原稿' }] } });
});

test('快照清空 tfSubRecords：普通成员 403，子记录原样保留（P0 回归）', async () => {
  put('tf_sub_records', { id: '__root__', body: { 'tf-003': { outputs: [{ title: '原稿' }] } } });
  const token = await login(MEMBER);
  const res = await snapshot(token, { tfSubRecords: [{ id: '__root__', body: {} }] });
  assert.equal(res.status, 403, '普通成员不得用空 body 清空专班子记录');
  assert.deepEqual(readBody('tf_sub_records'), { 'tf-003': { outputs: [{ title: '原稿' }] } });
});

test('快照改写他人活动子记录：普通成员 403（值变化面同样复算）', async () => {
  put('act_sub_records', { id: '__root__', body: { 'act-3': { publicity: [{ title: '原稿' }] } } });
  const token = await login(MEMBER);
  const res = await snapshot(token, { actSubRecords: [{ id: '__root__', body: { 'act-3': { publicity: [{ title: '越权改写' }] } } }] });
  assert.equal(res.status, 403);
  assert.deepEqual(readBody('act_sub_records'), { 'act-3': { publicity: [{ title: '原稿' }] } });
});

test('快照写自己的活动子记录：本场组织者不被误伤', async () => {
  put('act_sub_records', { id: '__root__', body: { 'act-3': { publicity: [{ title: '原稿' }] } } });
  const token = await login(ORGANIZER);
  const res = await snapshot(token, { actSubRecords: [{ id: '__root__', body: { 'act-3': { publicity: [{ title: '组织者改写' }] } } }] });
  assert.equal(res.status, 200, '本场组织者应可经快照写自己的子记录');
  assert.deepEqual(readBody('act_sub_records'), { 'act-3': { publicity: [{ title: '组织者改写' }] } });
});

test('快照清空考勤 / 伪造通知：普通成员均 403（既有门防回归）', async () => {
  const token = await login(MEMBER);
  const before = db.prepare('SELECT COUNT(*) AS c FROM attendances').get().c;
  const clearAttendance = await snapshot(token, { attendances: [] });
  assert.equal(clearAttendance.status, 403, '普通成员不得经快照清空考勤');
  assert.equal(db.prepare('SELECT COUNT(*) AS c FROM attendances').get().c, before, '考勤行数不得变化');

  const forged = { id: 'notice-redteam-test', title: '伪造通知', content: 'x', branchId: 'br-b1', publisherId: MEMBER };
  const publish = await snapshot(token, { notices: [forged] });
  assert.equal(publish.status, 403, '普通成员不得伪造通知发布');
  assert.equal(db.prepare('SELECT id FROM notices WHERE id = ?').get(forged.id), undefined);
});
