import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp } from '../app.js';
import { seedDatabase } from '../seed.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const AUTH_V = '?v=20261028a';

let server, base, app;

before(async () => {
  app = createApp({ dbPath: ':memory:' });
  await seedDatabase(app.locals.db);
  server = app.listen(0);
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => server.close());

test('登录成功返回 token 与用户信息', async () => {
  const res = await fetch(`${base}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ personId: '2300010001' }),
  });
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.ok(body.token, '应返回 token');
  assert.equal(body.user.id, '2300010001');
  assert.equal(body.user.role, 'secretary');
});

test('登录失败（未知人员）返回 401', async () => {
  const res = await fetch(`${base}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ personId: 'nobody' }),
  });
  assert.equal(res.status, 401);
});

test('me 接口携带 token 返回当前用户', async () => {
  const loginRes = await fetch(`${base}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ personId: '2400012355' }),
  });
  const { token } = await loginRes.json();
  const res = await fetch(`${base}/api/v1/auth/me`, { headers: { Authorization: `Bearer ${token}` } });
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.id, '2400012355');
});

// ════════════════════════════════════════════════════════════════
//  Task 2.1（2026-10-26）：前端「服务端优先登录」判据（纯 node，不需要浏览器）
// ════════════════════════════════════════════════════════════════
//  为什么在 auth.test.js 里测前端：本文件在 `test:daily` 与定向验证命令中都会被执行，
//  而本批的病灶正是「登录页先用本地账号层 verifyCredentials 拦掉服务端真实账号」。
//  这里用内存 localStorage/sessionStorage + fetch 桩直接驱动 `AuthStore.login()`，验证：
//    ① 服务端存在的真实账号（不在 MOCK_ACCOUNTS / gsm1921-accounts）能登录，
//       且**成功后才**写 `gsm1921-login-user` / `gsm1921-api-token`；
//    ② 后端 401 ⇒ 抛错且**不写任何登录态**（登录页据此显示错误并停留，不跳工作台）。

function installBrowserStorage() {
  const local = new Map();
  const session = new Map();
  globalThis.localStorage = {
    getItem: (k) => (local.has(String(k)) ? local.get(String(k)) : null),
    setItem: (k, v) => local.set(String(k), String(v)),
    removeItem: (k) => { local.delete(String(k)); },
    clear: () => { local.clear(); },
    key: (i) => [...local.keys()][i] ?? null,
    get length() { return local.size; },
  };
  globalThis.sessionStorage = {
    getItem: (k) => (session.has(String(k)) ? session.get(String(k)) : null),
    setItem: (k, v) => session.set(String(k), String(v)),
    removeItem: (k) => { session.delete(String(k)); },
    clear: () => { session.clear(); },
  };
  return { local, session };
}

/** 用一次性 fetch 桩跑前端登录（restore 原 fetch；不触碰本文件上面的真实服务） */
async function withFetchStub(stub, fn) {
  const original = globalThis.fetch;
  globalThis.fetch = stub;
  try { return await fn(); } finally { globalThis.fetch = original; }
}

test('前端服务端优先：服务端真实账号（不在本地账号层）可登录，成功后才写登录态', async () => {
  const { local, session } = installBrowserStorage();
  const calls = [];
  await withFetchStub(async (url, opts) => {
    calls.push({ url: String(url), body: JSON.parse(opts.body) });
    return new Response(JSON.stringify({
      token: 'token-server-only',
      user: { id: 'server-only-acct', role: 'secretary', branchId: 'br-b1' },
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }, async () => {
    const { AuthStore } = await import(`../../docs/src/services/core/auth.js${AUTH_V}`);
    await AuthStore.login('server-only-acct', 'real-password', { serverFirst: true });
  });
  assert.equal(calls.length, 1, '服务端优先应只调用一次 /auth/login');
  assert.equal(calls[0].url, '/api/v1/auth/login');
  assert.deepEqual(calls[0].body, { personId: 'server-only-acct', password: 'real-password' });
  const loginUser = JSON.parse(local.get('gsm1921-login-user'));
  assert.equal(loginUser.personId, 'server-only-acct', '登录成功后应写本地登录快照');
  assert.equal(loginUser.role, 'secretary', '角色以后端返回为准');
  assert.equal(loginUser.branchId, 'br-b1');
  assert.equal(session.get('gsm1921-api-token'), 'token-server-only', 'token 应进 sessionStorage');
  assert.ok(!local.has('gsm1921-api-token'), 'token 不得写 localStorage');
});

test('前端服务端优先：后端 401 ⇒ 抛错且不写登录态（登录页停留，不跳工作台）', async () => {
  const { local, session } = installBrowserStorage();
  await withFetchStub(async () => new Response(JSON.stringify({ error: '口令错误' }), {
    status: 401, headers: { 'Content-Type': 'application/json' },
  }), async () => {
    const { AuthStore } = await import(`../../docs/src/services/core/auth.js${AUTH_V}`);
    await assert.rejects(
      () => AuthStore.login('server-only-acct', 'wrong', { serverFirst: true }),
      (e) => e && e.status === 401,
      '后端 401 必须向上抛错（登录页据此显示错误并停留）',
    );
  });
  assert.equal(local.get('gsm1921-login-user'), undefined, '401 时不得写登录快照');
  assert.equal(session.get('gsm1921-api-token'), undefined, '401 时不得写 API token');
  assert.equal(session.get('gsm1921-session-snap'), undefined, '401 时不得写会话快照');
});

test('登录页：catch 分支只显示错误、不调用跳转（后端失败不跳工作台）', () => {
  const src = readFileSync(join(ROOT, 'docs', 'src', 'entries', 'pages', 'login-entry.js'), 'utf8');
  // `.then(…_goToWorkspace…)` 是唯一的成功跳转；`.catch` 分支内不得出现跳转
  const catchBlock = src.slice(src.indexOf('.catch((err) =>'), src.indexOf('errorEl.classList.remove(\'hidden\');', src.indexOf('.catch((err) =>')));
  assert.ok(catchBlock.length > 0, '登录页应有 .catch 错误分支');
  assert.ok(!catchBlock.includes('_goToWorkspace') && !catchBlock.includes('window.location'),
    '后端失败（401/网络）不得跳转，必须在登录页显示可见错误');
  assert.ok(catchBlock.includes('errorEl.textContent'), '错误分支必须写入可见错误文案');
});
