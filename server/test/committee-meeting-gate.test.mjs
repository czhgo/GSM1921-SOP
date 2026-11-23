// role: [工程师]+[AI]
// committee-meeting-gate.test.mjs — 支委会建会 / 议程结果写门（D-866 · 本批 P0-2）
//
// 判据：
//   G1 普通支委（组织/宣传/纪检）POST 支委会 → 403；
//   G2 支书 / 副支书 POST 支委会 → 201；
//   G3 普通支委 PATCH 支委会（改议程 / 状态）→ 403。
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../app.js';

const BRANCHES = [
  { id: 'br-b1', name: '本科第一党支部', type: '本科生', status: 'active', createdAt: '2026-01-01T00:00:00.000Z' },
];
const USERS = [
  { id: 'sec-1', name: '支书', studentId: '2300010001', role: 'secretary', branchId: 'br-b1', developStage: '正式党员', partyGroup: '第一党小组' },
  { id: 'dep-1', name: '副支书', studentId: '2300010009', role: 'deputy-secretary', branchId: 'br-b1', developStage: '正式党员', partyGroup: '第一党小组' },
  { id: 'org-1', name: '组织委员', studentId: '2300010002', role: 'org-commissioner', branchId: 'br-b1', developStage: '正式党员', partyGroup: '第一党小组' },
  { id: 'prop-1', name: '宣传委员', studentId: '2300010003', role: 'prop-commissioner', branchId: 'br-b1', developStage: '正式党员', partyGroup: '第一党小组' },
  { id: 'disc-1', name: '纪检委员', studentId: '2300010004', role: 'disc-commissioner', branchId: 'br-b1', developStage: '正式党员', partyGroup: '第一党小组' },
];

let app, server, base, db;
const tokens = {};
const call = (token, method, path, body) => fetch(`${base}${path}`, {
  method,
  headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  ...(body ? { body: JSON.stringify(body) } : {}),
});
const meetingPayload = (title) => ({
  branchId: 'br-b1', title, type: '支委会', date: '2026-06-10', status: 'published',
  organizingScope: 'branch', hostGroupId: null, agenda: [], createdAt: '2026-06-01T00:00:00.000Z',
});

before(async () => {
  app = createApp({ dbPath: ':memory:' });
  db = app.locals.db;
  const ib = db.prepare('INSERT INTO branches (id, data) VALUES (?, ?)');
  for (const b of BRANCHES) ib.run(b.id, JSON.stringify(b));
  const iu = db.prepare('INSERT INTO users (id, data) VALUES (?, ?)');
  for (const u of USERS) iu.run(u.id, JSON.stringify(u));
  server = app.listen(0);
  base = `http://127.0.0.1:${server.address().port}`;
  for (const u of USERS) {
    const res = await call(null, 'POST', '/api/v1/auth/login', { personId: u.id, password: '123456' });
    assert.equal(res.status, 200, `登录失败：${u.id}`);
    tokens[u.id] = (await res.json()).token;
  }
});

after(() => server.close());

test('G1 普通支委不能建支委会', async () => {
  for (const id of ['org-1', 'prop-1', 'disc-1']) {
    const res = await call(tokens[id], 'POST', '/api/v1/activities', meetingPayload('越权支委会'));
    assert.equal(res.status, 403, `${id} 建支委会须 403`);
  }
});

test('G2 支书 / 副支书可建支委会', async () => {
  const created = await call(tokens['sec-1'], 'POST', '/api/v1/activities', meetingPayload('六月支委会'));
  assert.equal(created.status, 201);
  const id = (await created.json()).id;
  assert.ok(id, '创建成功须返回 id');
  const dep = await call(tokens['dep-1'], 'POST', '/api/v1/activities', meetingPayload('七月支委会'));
  assert.equal(dep.status, 201, '副支书与支书同权');
});

test('G3 普通支委不能改支委会议程 / 状态', async () => {
  const row = JSON.parse(db.prepare("SELECT data FROM activities WHERE json_extract(data,'$.title') = '六月支委会'").get().data);
  const res = await call(tokens['org-1'], 'PATCH', `/api/v1/activities/${row.id}`, {
    agenda: [{ id: 'ag-1', item: '越权议程', kinds: [], agendaStep: 'discussion' }],
  });
  assert.equal(res.status, 403, '普通支委改支委会议程须 403');
});