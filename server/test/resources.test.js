import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../app.js';
import { seedDatabase } from '../seed.js';

let server, base;

before(async () => {
  const app = createApp({ dbPath: ':memory:' });
  await seedDatabase(app.locals.db);
  server = app.listen(0);
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => server.close());

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
