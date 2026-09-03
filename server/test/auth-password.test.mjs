// server/test/auth-password.test.mjs — P1b 运行安全：登录口令校验（2026-09-03）
// 生产默认开：POST /login 须带口令（LOGIN_PASSWORD 缺省 '123456'，与前端演示账号一致）；
// env DISABLE_PASSWORD_CHECK=1 恢复旧行为（内网单机演示/测试套件由 npm script 统一设置）。
// 说明：node --test 每个文件跑在独立子进程，本文件内 delete/set env 不影响其它测试文件。
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../app.js';
import { seedDatabase } from '../seed.js';

let server, base;

async function tryLogin(body) {
  const r = await fetch(`${base}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return { status: r.status, data: await r.json() };
}

before(async () => {
  // 本文件进程内强制「默认开」分支（不受 npm script 逃逸门影响）
  delete process.env.DISABLE_PASSWORD_CHECK;
  const app = createApp({ dbPath: ':memory:' });
  await seedDatabase(app.locals.db);
  server = app.listen(0);
  base = `http://127.0.0.1:${server.address().port}`;
});

after(() => { server.close(); delete process.env.DISABLE_PASSWORD_CHECK; });

test('默认开：仅凭 personId（无口令）登录被拒', async () => {
  const r = await tryLogin({ personId: 'p13' });
  assert.equal(r.status, 401);
  assert.equal(r.data.error, '口令错误');
});

test('默认开：错误口令被拒', async () => {
  const r = await tryLogin({ personId: 'p13', password: 'wrong-pwd' });
  assert.equal(r.status, 401);
});

test('默认开：正确口令（123456）放行并返回 token', async () => {
  const r = await tryLogin({ personId: 'p13', password: '123456' });
  assert.equal(r.status, 200);
  assert.ok(r.data.token, '应返回会话 token');
  assert.equal(r.data.user.id || r.data.user.personId, 'p13');
});

test('逃逸门：DISABLE_PASSWORD_CHECK=1 恢复仅凭 personId 登录', async () => {
  process.env.DISABLE_PASSWORD_CHECK = '1';
  const r = await tryLogin({ personId: 'p13' });
  assert.equal(r.status, 200);
  assert.ok(r.data.token);
  delete process.env.DISABLE_PASSWORD_CHECK;
});

test('env LOGIN_PASSWORD 可更换口令：更换后旧口令拒绝、新口令放行', async () => {
  process.env.LOGIN_PASSWORD = 'gsm1921-secret';
  try {
    const bad = await tryLogin({ personId: 'p13', password: '123456' });
    assert.equal(bad.status, 401);
    const ok = await tryLogin({ personId: 'p13', password: 'gsm1921-secret' });
    assert.equal(ok.status, 200);
  } finally {
    delete process.env.LOGIN_PASSWORD;
  }
});
