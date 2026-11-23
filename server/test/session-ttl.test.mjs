// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  server/test/session-ttl.test.mjs —— 会话 TTL（2026-11-03 Task 4 / 支书裁定 3 小时）
//
//  为什么：`sessions` 只存 token/person_id/created_at，getSessionUser 原先只查 token 存在
//  ⇒ token 永久有效（README「token 无过期」风险项）。本测试用临时 :memory: 库真跑 HTTP：
//   ① 登录拿 token → /auth/me 200；
//   ② 手改 created_at 超过 SESSION_TTL_HOURS（默认 3）→ /auth/me 与受保护写口均 401；
//   ③ 删掉会话行（过期即删）→ 同一 token 继续 401；
//   ④ 未过期（1 小时前）仍 200；
//   ⑤ SESSION_TTL_HOURS 非法值回落 3 小时（4 小时前仍 401）。
//  纯 node + :memory:，不连 3000、不写运行库；运行前须 DISABLE_PASSWORD_CHECK=1。
// ════════════════════════════════════════════════════════════════

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../app.js';
import { seedDatabase } from '../seed.js';

process.env.DISABLE_PASSWORD_CHECK = '1';

let server, base, db;

const HOUR = 60 * 60 * 1000;
const H = (token) => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${token}` });

before(async () => {
  const app = createApp({ dbPath: ':memory:' });
  db = app.locals.db;
  await seedDatabase(db);
  server = app.listen(0);
  base = `http://127.0.0.1:${server.address().port}`;
});

after(() => {
  server.closeAllConnections?.();
  return new Promise((resolve) => server.close(resolve));
});

async function login(personId = '2300010001') {
  const res = await fetch(`${base}/api/v1/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ personId }),
  });
  assert.equal(res.status, 200, `登录失败 ${personId}`);
  return (await res.json()).token;
}

/** 把某 token 的 created_at 改成 hoursAgo 小时前 */
function ageSession(token, hoursAgo) {
  db.prepare('UPDATE sessions SET created_at = ? WHERE token = ?')
    .run(new Date(Date.now() - hoursAgo * HOUR).toISOString(), token);
}

/** 受保护写口（requireAuth 在 handler 之前 → 过期必须 401 而不是 400/403） */
async function protectedWrite(token) {
  return fetch(`${base}/api/v1/thoughtReports`, {
    method: 'POST', headers: H(token),
    body: JSON.stringify({ personId: '2300010001', title: 'TTL 探测', content: 'x' }),
  });
}

test('过期会话：/auth/me 与受保护写口均 401，且会话行被删除；未过期 200', async () => {
  const token = await login();
  assert.equal((await fetch(`${base}/api/v1/auth/me`, { headers: H(token) })).status, 200, '新登录会话应可用');

  ageSession(token, 4); // 默认 TTL 3 小时 → 已过期
  const meExpired = await fetch(`${base}/api/v1/auth/me`, { headers: H(token) });
  assert.equal(meExpired.status, 401, '过期会话访问 /auth/me 必须 401');
  const writeExpired = await protectedWrite(token);
  assert.equal(writeExpired.status, 401, '过期会话调用受保护写口必须 401');
  const left = db.prepare('SELECT token FROM sessions WHERE token = ?').get(token);
  assert.equal(left, undefined, '过期即删：sessions 行应被清理');

  const fresh = await login();
  ageSession(fresh, 1); // 1 小时前 < 3 小时 → 仍有效
  assert.equal((await fetch(`${base}/api/v1/auth/me`, { headers: H(fresh) })).status, 200, '未过期会话应 200');
});

test('SESSION_TTL_HOURS 非法值回落 3 小时（不会变成永不过期）', async () => {
  const prev = process.env.SESSION_TTL_HOURS;
  try {
    process.env.SESSION_TTL_HOURS = 'not-a-number';
    const token = await login();
    ageSession(token, 4);
    assert.equal((await fetch(`${base}/api/v1/auth/me`, { headers: H(token) })).status, 401, '非法 TTL 应回落 3 小时');

    const token2 = await login();
    ageSession(token2, 1);
    assert.equal((await fetch(`${base}/api/v1/auth/me`, { headers: H(token2) })).status, 200, '3 小时内仍有效');
  } finally {
    if (prev === undefined) delete process.env.SESSION_TTL_HOURS;
    else process.env.SESSION_TTL_HOURS = prev;
  }
});
