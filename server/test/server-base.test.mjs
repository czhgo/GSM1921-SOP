// server/test/server-base.test.mjs — 服务端基座（库结构 / 种子 / 资源读口 / 上传 / 快照）
//
// 批次 48（2026-09-17，47-F 第四组）：由 `db.test.js` + `seed.test.js` + `resources.test.js` +
//   `uploads.test.js` + `snapshot.test.js` **五件并一**（文件数 5 → 1）。
//   **判据＝同域 + 同形态**：五件都在守「**服务端基座**」这一域（SQLite 建表与 JSON 资源读写 / 种子灌库 /
//   资源读口与 bootstrap / 附件上传 / 快照全量回写），且**全是纯 node、零 chromium**
//   （不触「真机用例不与纯 node 混一文件」这条区纪律）。
//   **编号**：五件均用描述性用例名（**无 S 编号**）⇒ 无重编号风险。
//   **等量转移**：用例 4 + 1 + 2 + 2 + 2 = **11 条**，**逐条保留语义、无削弱**。
//   **去重**：其中三件各自**逐字重复**的「`createApp({dbPath:':memory:'})` + `seedDatabase` + `listen(0)`
//   + `close()`」样板收敛为**一份** `before/after`（API 用例共用同一台内存服务与同一份种子）。
//   ⚠ **顺序有意义**（`node:test` 同文件按声明序执行）：`snapshot` 那条会往 activities 追加 `act-new`，
//   故把它放在**最后**——不让它污染前面几条对列表的断言；`db` 用自己的内存库，与共享服务无耦合。
//   ⚠ 顺手消除一处**变量遮蔽**：原 `snapshot.test.js` 在该用例内写 `const after = ...`，**遮蔽了 node:test
//   的 `after`**——单文件时无害，合并后是陷阱，故改名 `afterList`（**判据不变**）。
//   **引用链同步**：`server/package.json::test:fast`（五处 → 本文件一处）· `server/routes/resources.js:414`
//   注释里的「snapshot.test.js 等直连用例」（五件未被 README / §0.2 / 其他守卫逐条列举，故只此两处）。
//   **守的是什么**：api 形态（真服务端 + SQLite）的**底座**——写侧权威、读侧直取，全部不依赖浏览器。

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp } from '../app.js';
import { initDb, replaceCollection } from '../db.js';
import { seedDatabase } from '../seed.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOAD_DIR = path.resolve(__dirname, '../uploads');

let server, base;

before(async () => {
  const app = createApp({ dbPath: ':memory:' });
  await seedDatabase(app.locals.db);
  server = app.listen(0);
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => server.close());

// ── ① 库结构（原 db.test.js，4 条；自持内存库，不经 HTTP）──────────────

test('initDb 建表成功，核心表存在', () => {
  const db = initDb(':memory:');
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all()
    .map(r => r.name);
  for (const t of ['users', 'activities', 'notices', 'todos', 'sessions']) {
    assert.ok(tables.includes(t), `缺少表 ${t}`);
  }
});

test('JSON 资源表支持嵌套字段读写', () => {
  const db = initDb(':memory:');
  db.prepare('INSERT INTO activities (id, data) VALUES (?, ?)')
    .run('act-test', JSON.stringify({ id: 'act-test', assignments: [{ personId: 'p1', role: 'organizer' }] }));
  const row = db.prepare('SELECT data FROM activities WHERE id = ?').get('act-test');
  const parsed = JSON.parse(row.data);
  assert.equal(parsed.assignments[0].personId, 'p1');
});

test('replaceCollection 整表替换写入', () => {
  const db = initDb(':memory:');
  replaceCollection(db, 'activities', [
    { id: 'a1', title: '活动一' },
    { id: 'a2', title: '活动二' },
  ]);
  replaceCollection(db, 'activities', [
    { id: 'a2', title: '活动二改' },
    { id: 'a3', title: '活动三' },
  ]);
  const rows = db.prepare('SELECT data FROM activities ORDER BY id').all().map(r => JSON.parse(r.data));
  assert.deepEqual(rows.map(r => r.id), ['a2', 'a3'], '整表替换后应仅剩新集合');
  assert.equal(rows[0].title, '活动二改', '重复 id 应被覆盖');
});

test('replaceCollection 拒绝未知表名', () => {
  const db = initDb(':memory:');
  assert.throws(() => replaceCollection(db, 'users; DROP TABLE activities', []), /未知资源表/);
});

// ── ② 种子灌库（原 seed.test.js，1 条；自持内存库）────────────────────

test('seedDatabase 写入 users 与 activities', async () => {
  const db = initDb(':memory:');
  await seedDatabase(db);
  const users = db.prepare('SELECT data FROM users').all().map(r => JSON.parse(r.data));
  const acts = db.prepare('SELECT data FROM activities').all().map(r => JSON.parse(r.data));
  assert.ok(users.length >= 50, `人员应 >= 50，实际 ${users.length}`);
  assert.ok(acts.length >= 25, `活动应 >= 25，实际 ${acts.length}`);
  assert.ok(users.some(u => u.role === 'secretary'), '应包含支书角色');
});

// ── ③ 资源读口（原 resources.test.js，2 条）──────────────────────────

test('activities list 返回活动数组', async () => {
  const res = await fetch(`${base}/api/v1/activities`);
  assert.equal(res.status, 200);
  const list = await res.json();
  assert.ok(Array.isArray(list));
  assert.ok(list.length >= 25);
  assert.ok(list[0].assignments, '保留嵌套 assignments 字段');
});

test('bootstrap 返回全部资源分组', async () => {
  const res = await fetch(`${base}/api/v1/bootstrap`);
  const body = await res.json();
  for (const k of ['activities', 'todos', 'notices', 'users']) {
    assert.ok(Array.isArray(body[k]), `bootstrap 缺少 ${k}`);
  }
});

// ── ④ 附件上传（原 uploads.test.js，2 条）────────────────────────────

test('登录后上传附件返回元数据', async () => {
  const login = await (await fetch(`${base}/api/v1/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ personId: 'p13' }),
  })).json();

  const form = new FormData();
  form.append('file', new File([Buffer.from('fake-png')], 'test.png', { type: 'image/png' }));
  const res = await fetch(`${base}/api/v1/uploads`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${login.token}` },
    body: form,
  });
  assert.equal(res.status, 201);
  const meta = await res.json();
  assert.ok(meta.id);
  assert.equal(meta.filename, 'test.png');
  // 清理测试上传文件，避免污染 server/uploads/
  fs.unlinkSync(path.join(UPLOAD_DIR, path.basename(meta.path)));
});

test('未登录上传返回 401', async () => {
  const form = new FormData();
  form.append('file', new File([Buffer.from('x')], 'a.png', { type: 'image/png' }));
  const res = await fetch(`${base}/api/v1/uploads`, { method: 'POST', body: form });
  assert.equal(res.status, 401);
});

// ── ⑤ 快照全量回写（原 snapshot.test.js，2 条；**置末**——它会改 activities）──

test('snapshot 全量覆盖保存后能读回新增活动', async () => {
  const tokenRes = await fetch(`${base}/api/v1/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ personId: 'p13' }),
  });
  const { token } = await tokenRes.json();

  const activities = await (await fetch(`${base}/api/v1/activities`)).json();
  activities.push({ id: 'act-new', title: '新增测试活动', date: '2026-08-30' });

  const res = await fetch(`${base}/api/v1/snapshot`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ activities }),
  });
  assert.equal(res.status, 204);

  // 原变量名 `after` 遮蔽了 node:test 的 `after`（合并后成陷阱）⇒ 改名，判据不变。
  const afterList = await (await fetch(`${base}/api/v1/activities`)).json();
  assert.ok(afterList.some(a => a.id === 'act-new'), '快照保存后应能读回新增活动');
});

test('snapshot 未登录返回 401', async () => {
  const res = await fetch(`${base}/api/v1/snapshot`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ activities: [] }),
  });
  assert.equal(res.status, 401);
});
