import { test } from 'node:test';
import assert from 'node:assert/strict';
import { initDb, replaceCollection } from '../db.js';

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
