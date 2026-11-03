// role: [工程师]+[AI]
// server/test/account-rename.test.mjs — R7-01 账号重命名受控端点（2026-10-22）
// ════════════════════════════════════════════════════════════════
// 判据（支书圈定）：
//   S1 改名成功：users.id / users.data.id / users.data.studentId、sessions.person_id、
//      业务表 JSON 引用（含数组元素与对象键）三处都变；auth_audit 留 what=account-renamed；
//      返回 { ok:true, from, to }；仅「精确等于旧 id」才替换（自由文本不改写）。
//   S2 新 id 与既有 users.id 重复 → 409，且目标成员原样未动。
//   S3 非党委（支书）调用 → 403，且未产生任何写入。
//   S4 新 id 为旧 p* 形态 → 400。
// 运行：`node --test test/account-rename.test.mjs`（server 目录）
// ════════════════════════════════════════════════════════════════
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';

import { createApp } from '../app.js';
import { seedDatabase } from '../seed.js';
import { renamePersonRefs } from '../routes/member.js';

let app, server, base, db;
const tokens = {};

before(async () => {
  app = createApp({ dbPath: ':memory:' });
  await seedDatabase(app.locals.db);
  db = app.locals.db;
  server = app.listen(0);
  base = `http://127.0.0.1:${server.address().port}`;
  // 9000000001 = 党委组织员（唯一可调用者）；2300010001 = 支书（反例：非党委）
  for (const personId of ['9000000001', '2300010001', '2400012350']) await login(personId);
});

after(() => {
  server?.closeAllConnections?.();
  return new Promise((resolve) => server?.close(resolve));
});

async function login(personId) {
  const response = await fetch(`${base}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ personId, password: '123456' }),
  });
  assert.equal(response.status, 200, `登录失败 ${personId}`);
  tokens[personId] = (await response.json()).token;
  return tokens[personId];
}

async function request(token, method, path, body) {
  const response = await fetch(`${base}/api/v1/${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const data = response.status === 204 ? null : await response.json();
  return { status: response.status, data };
}

const userRow = (id) => {
  const row = db.prepare('SELECT data FROM users WHERE id = ?').get(id);
  return row ? JSON.parse(row.data) : null;
};

test('S1 改名成功：users / sessions / 业务 JSON 引用三处同事务变更，并写 auth_audit', async () => {
  const from = '2400012350';
  const to = '2999999001';
  // 纯函数自检：数组元素、对象键、嵌套对象都换；自由文本（非整值相等）不动
  assert.deepEqual(
    renamePersonRefs({ a: from, list: [from, 'x', { b: from }], map: { [from]: 'v' }, note: `联系 ${from}` }, from, to),
    { a: to, list: [to, 'x', { b: to }], map: { [to]: 'v' }, note: `联系 ${from}` },
    'renamePersonRefs 只替换精确相等的字符串（含数组/键），不改自由文本',
  );
  // 受控业务行：值引用 + 数组引用 + 以人员 id 为键的映射
  db.prepare('INSERT OR REPLACE INTO todos (id, data) VALUES (?, ?)').run('todo-rename-1', JSON.stringify({
    id: 'todo-rename-1', assigneeId: from,
    nested: { personIds: [from, 'keep'], stages: { [from]: '发展对象' } },
    note: `联系 ${from} 处理`,
  }));

  const tokenBefore = await login(from);
  const result = await request(tokens['9000000001'], 'POST', `members/${from}/account-rename`, { newPersonId: to });
  assert.equal(result.status, 200, JSON.stringify(result.data));
  assert.deepEqual(result.data, { ok: true, from, to, sessionsInvalidated: true });

  assert.equal(userRow(from), null, '旧主键行应已不存在');
  const renamed = userRow(to);
  assert.ok(renamed, '新主键行应存在');
  assert.equal(renamed.id, to, 'users.data.id 同步');
  assert.equal(renamed.studentId, to, 'users.data.studentId 同步');
  assert.equal(renamed.name, '苏明哲', '档案其余字段保留');

  const me = await request(tokenBefore, 'GET', 'auth/me');
  assert.equal(me.status, 401, '改名前发出的 token 应失效（旧会话已删除）');
  const left = db.prepare('SELECT token FROM sessions WHERE person_id = ?').get(from);
  assert.equal(left, undefined, 'sessions 不得保留旧 person_id 行');

  const todo = JSON.parse(db.prepare('SELECT data FROM todos WHERE id = ?').get('todo-rename-1').data);
  assert.equal(todo.assigneeId, to, '业务表字符串引用已换新 id');
  assert.deepEqual(todo.nested.personIds, [to, 'keep'], '数组元素引用已换');
  assert.deepEqual(todo.nested.stages, { [to]: '发展对象' }, '以人员 id 为键的映射已换');
  assert.equal(todo.note, `联系 ${from} 处理`, '自由文本不做子串改写');

  const audits = db.prepare('SELECT data FROM auth_audit').all().map((row) => JSON.parse(row.data))
    .filter((row) => row.what === 'account-renamed' && row.from === from && row.to === to);
  assert.equal(audits.length, 1, 'auth_audit 应恰有一条 account-renamed');
  assert.equal(audits[0].by, '9000000001', '留痕操作人 = 当前党委账号');
  assert.ok(/^\d{4}-\d{2}-\d{2}T/.test(audits[0].at), '留痕时间由服务端生成');
});

test('S2 新 id 与既有 users.id 重复 → 409，且目标成员不被改写', async () => {
  const from = '2400012351';
  const result = await request(tokens['9000000001'], 'POST', `members/${from}/account-rename`, { newPersonId: '2300010001' });
  assert.equal(result.status, 409, JSON.stringify(result.data));
  assert.ok(userRow(from), '原成员行仍在');
  assert.equal(userRow('2300010001').name, '储子禾', '既有行未被覆盖');
});

test('S3 非党委（支书）调用 → 403，且不产生写入', async () => {
  const from = '2400012352';
  const before = db.prepare("SELECT COUNT(*) AS n FROM auth_audit").get().n;
  const result = await request(tokens['2300010001'], 'POST', `members/${from}/account-rename`, { newPersonId: '2999999002' });
  assert.equal(result.status, 403, JSON.stringify(result.data));
  assert.ok(userRow(from), '目标成员未变');
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM auth_audit").get().n, before, '未写审计');
});

test('S4 新 id 为旧 p* 形态 → 400', async () => {
  const from = '2400012353';
  const result = await request(tokens['9000000001'], 'POST', `members/${from}/account-rename`, { newPersonId: 'p13' });
  assert.equal(result.status, 400, JSON.stringify(result.data));
  assert.ok(userRow(from), '目标成员未变');
  assert.equal(userRow('p13'), null, '未写入 p* 主键行');
});
