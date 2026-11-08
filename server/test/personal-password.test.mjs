// server/test/personal-password.test.mjs — 波次 G · 2026-11-08：个人密码优先、共享口令回退
// 口径（server/routes/auth.js::loginPasswordForUser）：
//   ① 用户行带合法 `passwordHash` ⇒ 只校验个人密码，失败 401，**不回退**共享口令；
//   ② 无 `passwordHash`（旧库 / 未设置）⇒ 回退 `LOGIN_PASSWORD` / 非生产 '123456'；
//   ③ `DISABLE_PASSWORD_CHECK=1` 且非生产 ⇒ 仍整体跳过（测试 / 演示）；
//   ④ 散列只存服务端，登录响应 / `/auth/me` / `GET /users` 一律不得返回。
// 说明：node --test 每个文件独立子进程，本文件内 set/delete env 不影响其它测试文件。
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';
import { createApp } from '../app.js';
import { seedDatabase } from '../seed.js';
import { initDb } from '../db.js';
import { hashPassword, verifyPassword, isPasswordHash } from '../security/password.mjs';

const SERVER_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PERSONAL = 'personal-pass-2026';
const SHARED = '123456';

let app, server, base, db;
let hashedUser;      // 已设置个人密码的用户
let legacyUser;      // 无个人密码的旧库用户
let malformedUser;   // 散列格式被写坏的倒霉蛋

const readUser = (id) => {
  const row = db.prepare('SELECT data FROM users WHERE id = ?').get(id);
  return row ? JSON.parse(row.data) : null;
};
const writeUser = (id, patch) => {
  db.prepare('UPDATE users SET data = ? WHERE id = ?').run(JSON.stringify({ ...readUser(id), ...patch }), id);
};
async function login(body) {
  const r = await fetch(`${base}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return { status: r.status, data: await r.json() };
}

before(async () => {
  delete process.env.DISABLE_PASSWORD_CHECK;
  delete process.env.LOGIN_PASSWORD;
  app = createApp({ dbPath: ':memory:' });
  await seedDatabase(app.locals.db);
  db = app.locals.db;
  server = app.listen(0);
  base = `http://127.0.0.1:${server.address().port}`;

  hashedUser = '2300010001';
  legacyUser = '2400012355';
  assert.ok(readUser(hashedUser), '种子中应存在 2300010001');
  assert.ok(readUser(legacyUser), '种子中应存在 2400012355');
  const extra = db.prepare('SELECT id, data FROM users').all()
    .map((row) => ({ id: String(row.id), data: JSON.parse(row.data) }))
    .find((row) => row.id !== hashedUser && row.id !== legacyUser && row.data.transferOut !== true);
  assert.ok(extra, '种子中应存在第三个可用用户');
  malformedUser = extra.id;

  // hashedUser 设个人密码；malformedUser 写坏散列（测 fail-closed）
  writeUser(hashedUser, { passwordHash: hashPassword(PERSONAL) });
  writeUser(malformedUser, { passwordHash: 'scrypt$nothex$nothex' });
});

after(() => {
  server.close();
  delete process.env.DISABLE_PASSWORD_CHECK;
  delete process.env.LOGIN_PASSWORD;
});

test('旧库兼容：无 passwordHash 的用户仍可用共享口令登录', async () => {
  assert.equal(readUser(legacyUser).passwordHash, undefined, '前置：legacyUser 不应有个人密码');
  const r = await login({ personId: legacyUser, password: SHARED });
  assert.equal(r.status, 200);
  assert.ok(r.data.token);
});

test('个人密码优先：hash 用户用个人密码登录 200，响应不含 passwordHash', async () => {
  const r = await login({ personId: hashedUser, password: PERSONAL });
  assert.equal(r.status, 200);
  assert.ok(r.data.token);
  assert.equal(r.data.user.id, hashedUser);
  assert.equal(Object.prototype.hasOwnProperty.call(r.data.user, 'passwordHash'), false, '登录响应不得返回散列');
  assert.ok(!JSON.stringify(r.data).includes('scrypt$'), '登录响应正文不得出现散列串');
});

test('个人密码错误 401', async () => {
  const r = await login({ personId: hashedUser, password: 'wrong-personal' });
  assert.equal(r.status, 401);
  assert.equal(r.data.error, '口令错误');
});

test('共享口令不能登 hash 用户（个人密码失败不回退共享口令）', async () => {
  const plain = await login({ personId: hashedUser, password: SHARED });
  assert.equal(plain.status, 401);
  process.env.LOGIN_PASSWORD = 'branch-shared-secret';
  try {
    const custom = await login({ personId: hashedUser, password: 'branch-shared-secret' });
    assert.equal(custom.status, 401, 'LOGIN_PASSWORD 也不得登入已设个人密码的账号');
    // 同一份共享口令对其他无个人密码的用户仍然有效
    const legacy = await login({ personId: legacyUser, password: 'branch-shared-secret' });
    assert.equal(legacy.status, 200);
  } finally {
    delete process.env.LOGIN_PASSWORD;
  }
});

test('散列格式非法 ⇒ fail-closed（共享口令同样拒绝）', async () => {
  const r = await login({ personId: malformedUser, password: SHARED });
  assert.equal(r.status, 401, '格式非法的 passwordHash 不得静默降级到共享口令');
});

test('DISABLE_PASSWORD_CHECK=1（非生产）仍整体跳过口令校验', async () => {
  process.env.DISABLE_PASSWORD_CHECK = '1';
  try {
    const hashed = await login({ personId: hashedUser });
    assert.equal(hashed.status, 200, '逃逸门下 hash 用户无口令也应放行');
    const malformed = await login({ personId: malformedUser });
    assert.equal(malformed.status, 200, '逃逸门下不校验散列格式');
  } finally {
    delete process.env.DISABLE_PASSWORD_CHECK;
  }
});

test('读口不返回散列：/auth/me 与 GET /users', async () => {
  const { data } = await login({ personId: hashedUser, password: PERSONAL });
  const me = await fetch(`${base}/api/v1/auth/me`, { headers: { Authorization: `Bearer ${data.token}` } });
  assert.equal(me.status, 200);
  const meBody = await me.json();
  assert.equal(Object.prototype.hasOwnProperty.call(meBody, 'passwordHash'), false, '/auth/me 不得返回散列');

  const list = await fetch(`${base}/api/v1/users`, { headers: { Authorization: `Bearer ${data.token}` } });
  assert.equal(list.status, 200);
  const rows = await list.json();
  assert.ok(Array.isArray(rows) && rows.length > 0, 'GET /users 应返回名册行');
  assert.equal(rows.some((row) => Object.prototype.hasOwnProperty.call(row, 'passwordHash')), false, 'GET /users 不得返回散列');
  assert.ok(!JSON.stringify(rows).includes('scrypt$'), 'GET /users 正文不得出现散列串');
});

test('设置脚本：node scripts/set-password.mjs <id> --password … 写入可校验的散列并留痕', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'gsm-set-password-'));
  const dbPath = path.join(dir, 'test.db');
  const personId = 'T9000000001';
  try {
    const seedDb = initDb(dbPath);
    seedDb.prepare('INSERT INTO users (id, data) VALUES (?, ?)')
      .run(personId, JSON.stringify({ id: personId, studentId: personId, name: '测试用户', role: 'participant', branchId: 'br-b1' }));
    seedDb.close();

    execFileSync(process.execPath, ['scripts/set-password.mjs', personId, '--password', PERSONAL, '--db', dbPath], {
      cwd: SERVER_DIR, stdio: 'pipe',
    });

    const checkDb = new Database(dbPath);
    try {
      const user = JSON.parse(checkDb.prepare('SELECT data FROM users WHERE id = ?').get(personId).data);
      assert.ok(isPasswordHash(user.passwordHash), '脚本应写入合法散列');
      assert.equal(verifyPassword(PERSONAL, user.passwordHash), true, '写入的散列应能校验个人密码');
      assert.equal(verifyPassword(SHARED, user.passwordHash), false);
      const audits = checkDb.prepare('SELECT data FROM auth_audit').all().map((row) => JSON.parse(row.data))
        .filter((row) => row.what === 'password-set' && row.targetPersonId === personId);
      assert.equal(audits.length, 1, '应留一条 password-set 审计');
      assert.ok(!JSON.stringify(audits).includes('scrypt$'), '审计不得记录散列');
    } finally {
      checkDb.close();
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
