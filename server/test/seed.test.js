import { test } from 'node:test';
import assert from 'node:assert/strict';
import { initDb } from '../db.js';
import { seedDatabase } from '../seed.js';

test('seedDatabase 写入 users 与 activities', async () => {
  const db = initDb(':memory:');
  await seedDatabase(db);
  const users = db.prepare('SELECT data FROM users').all().map(r => JSON.parse(r.data));
  const acts = db.prepare('SELECT data FROM activities').all().map(r => JSON.parse(r.data));
  assert.ok(users.length >= 50, `人员应 >= 50，实际 ${users.length}`);
  assert.ok(acts.length >= 25, `活动应 >= 25，实际 ${acts.length}`);
  assert.ok(users.some(u => u.role === 'secretary'), '应包含书记角色');
});
