import { test } from 'node:test';
import assert from 'node:assert/strict';
import { initDb } from '../db.js';

test('initDb 建表成功，核心表存在', () => {
  const db = initDb(':memory:');
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all()
    .map(r => r.name);
  for (const t of ['users', 'activities', 'notices', 'todos', 'sessions']) {
    assert.ok(tables.includes(t), `缺少表 ${t}`);
  }
});

test('upsertJson 支持嵌套 JSON 字段读写', () => {
  const db = initDb(':memory:');
  db.prepare('INSERT INTO activities (id, data) VALUES (?, ?)')
    .run('act-test', JSON.stringify({ id: 'act-test', assignments: [{ personId: 'p1', role: 'organizer' }] }));
  const row = db.prepare('SELECT data FROM activities WHERE id = ?').get('act-test');
  const parsed = JSON.parse(row.data);
  assert.equal(parsed.assignments[0].personId, 'p1');
});
