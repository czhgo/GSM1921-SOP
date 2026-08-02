import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../app.js';

test('健康检查返回 ok', async (t) => {
  const app = createApp({ dbPath: ':memory:' });
  const server = app.listen(0);
  t.after(() => server.close());
  const { port } = server.address();
  const res = await fetch(`http://127.0.0.1:${port}/api/v1/health`);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.ok, true);
});
