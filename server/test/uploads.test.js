import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp } from '../app.js';
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
