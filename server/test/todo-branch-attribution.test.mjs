// role: [工程师]+[AI]
// server/test/todo-branch-attribution.test.mjs — v11 Todo 归属（批次 504）
// 判据：
//   T1 全新库 v11 后 todos 有 branch_id 列与索引；
//   T2 存量回填：父行/所属人可解析 ⇒ 写回 branchId；解析不出 ⇒ NULL（不猜测）；
//   T3 新写口解析不出支部 ⇒ 400（党委未选支部）；
//   T4 支部账号新建待办 ⇒ 自动落本支部；
//   T5 兼容期：NULL 行只给本人/同角色看，并标 branchLegacy。
// 运行：node --test test/todo-branch-attribution.test.mjs（server 目录）
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { initDb, applyMigrations, SCHEMA_VERSION, rollbackV11 } from '../db.js';
import { createApp } from '../app.js';
import { seedDatabase } from '../seed.js';

const SECRETARY = '2300010001'; // 支书（br-b1）
const ORG = '2400012355'; // 组织委员（br-b1）
const STAFF = '9000000001'; // 党委组织员（无支部）

let tmpDir;
let dbfile;
let server;
let base;
let appDb;

before(async () => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gsm-v11-todo-'));
  dbfile = path.join(tmpDir, 'data.db');
  const app = createApp({ dbPath: dbfile });
  appDb = app.locals.db;
  await seedDatabase(appDb);
  server = app.listen(0);
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => {
  server.closeAllConnections?.();
  return new Promise((resolve) => server.close(() => {
    try { appDb?.close(); } catch { /* 已关闭 */ }
    fs.rmSync(tmpDir, { recursive: true, force: true });
    resolve();
  }));
});

const H = (token) => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${token}` });
async function login(personId) {
  const res = await fetch(`${base}/api/v1/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ personId }),
  });
  assert.equal(res.status, 200, `登录失败 ${personId}`);
  return (await res.json()).token;
}

test('T1 全新库 v11：todos.branch_id 与索引存在', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gsm-v11-fresh-'));
  const db = initDb(path.join(dir, 'fresh.db'));
  try {
    assert.equal(Number(db.pragma('user_version', { simple: true })), SCHEMA_VERSION);
    const columns = db.prepare('PRAGMA table_info(todos)').all().map((c) => c.name);
    assert.ok(columns.includes('branch_id'), 'todos 缺 branch_id');
    const indexes = db.prepare("SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='todos'").all().map((r) => r.name);
    assert.ok(indexes.includes('idx_todos_branch'), '缺 idx_todos_branch');
  } finally { db.close(); fs.rmSync(dir, { recursive: true, force: true }); }
});

test('T2 存量回填：父行/所属人可解析则写回，解析不出保持 NULL', () => {
  {
    // 回到 v10 再灌「升级前」行（列已由 v11 建好，模拟升级前无值）
    appDb.pragma('user_version = 10');
    appDb.prepare('UPDATE todos SET branch_id = NULL').run();
    const insert = (table, row) => appDb.prepare(`INSERT OR REPLACE INTO ${table} (id, data) VALUES (?, ?)`)
      .run(row.id, JSON.stringify(row));
    insert('activities', { id: 'act-v11-bf', title: '回填活动', date: '2026-10-23', branchId: 'br-b1' });
    insert('users', { id: 'u-v11-bf', name: '回填人', role: 'visitor', branchId: 'br-b1' });
    insert('todos', { id: 'td-v11-parent', sourceType: 'activity', sourceId: 'act-v11-bf', title: '父行' });
    insert('todos', { id: 'td-v11-person', personId: 'u-v11-bf', title: '到人' });
    insert('todos', { id: 'td-v11-orphan', title: '无来源' });
    try {
      applyMigrations(appDb);
    } catch (e) {
      console.error('[T2] applyMigrations 失败：', e.message, e.stack);
      throw e;
    }
    const branch = (id) => appDb.prepare('SELECT branch_id FROM todos WHERE id = ?').get(id).branch_id;
    assert.equal(branch('td-v11-parent'), 'br-b1', '父行可解析应回填');
    assert.equal(branch('td-v11-person'), 'br-b1', '所属人可解析应回填');
    assert.equal(branch('td-v11-orphan'), null, '解析不出必须保持 NULL，不猜测');
  }
});

test('T3 党委未选支部新建待办 ⇒ 400', async () => {
  const token = await login(STAFF);
  const res = await fetch(`${base}/api/v1/todos`, {
    method: 'POST', headers: H(token),
    body: JSON.stringify({ id: 'td-v11-staff', role: 'party-staff', title: '无归属待办' }),
  });
  const text = await res.text();
  assert.equal(res.status, 400, `应 400，实测 ${res.status}：${text}`);
  assert.match(JSON.parse(text).error || '', /归属到支部/);
});

test('T4 支部账号新建待办 ⇒ 自动落本支部', async () => {
  const token = await login(SECRETARY);
  const res = await fetch(`${base}/api/v1/todos`, {
    method: 'POST', headers: H(token),
    body: JSON.stringify({ id: 'td-v11-ok', role: 'secretary', title: '本支部待办' }),
  });
  assert.equal(res.status, 201);
  const row = await res.json();
  assert.equal(row.branchId, 'br-b1');
});

test('T5 兼容期：NULL 行只给本人/同角色看，并标 branchLegacy', async () => {
  appDb.prepare('INSERT OR REPLACE INTO todos (id, data) VALUES (?, ?)').run('td-v11-legacy',
    JSON.stringify({ id: 'td-v11-legacy', role: 'secretary', title: '旧待办' }));
  const token = await login(SECRETARY);
  const rows = await (await fetch(`${base}/api/v1/todos`, { headers: H(token) })).json();
  const legacy = rows.find((row) => row.id === 'td-v11-legacy');
  assert.ok(legacy, '同角色应看到 NULL 旧行');
  assert.equal(legacy.branchLegacy, true, '应标记 branchLegacy');

  const orgToken = await login(ORG);
  const orgRows = await (await fetch(`${base}/api/v1/todos`, { headers: H(orgToken) })).json();
  assert.ok(!orgRows.some((row) => row.id === 'td-v11-legacy'), '不同角色不应看到该 NULL 行');
});

test('T6 回滚：删影子表与索引，user_version 回 10', () => {
  rollbackV11(appDb);
  const shadow = appDb.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name IN ('agenda_items','taskforce_contributions')").all();
  assert.equal(shadow.length, 0, '回滚应删影子表');
  assert.equal(Number(appDb.pragma('user_version', { simple: true })), 10);
});
