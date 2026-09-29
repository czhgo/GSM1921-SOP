// ════════════════════════════════════════════════════════════════
//  server/test/setup-status.test.mjs —— 「部署与对接」自检端点守卫（2026-09-29 批次 273 新增）
//
//  验的是支书 2026-09-29 第 1 条所指的那件「配置界面」的**数据源**（档位 = A 只读状态 ＋ 可复制配置）：
//   S1 门：**仅 `party-staff`** —— 成员 / 组织委员一律 403（这是运维信息）
//   S2 形状：`deploy / env / db / checklist / envTemplate` 齐备，且 checklist 每条有 `id/label/ok/howto`
//   S3 **安全底线（本件的核心断言）**：响应里**不得出现任何密钥实值**——
//      测试故意把 `LOGIN_PASSWORD` / `IAAA_APP_ID` 设成特征串，然后断言**整个响应体不含该串**
//   S4 **非空转 ＋ 双向**：故意不设 `SEED_FALLBACK` ⇒ 对应项 `ok:false`；设成 `0` ⇒ `ok:true`
//   S5 「演示名册残留」判据**反例锁死**：插入一名演示人（id `p7`）⇒ 计数 1 且该项判红；移除 ⇒ 归零
//   S6 `envTemplate` **只含键名与占位**：不得含任何实值（含测试设的密钥串）
// ════════════════════════════════════════════════════════════════
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';

const SECRET_PW = 'test-secret-pw-9f3a';
const SECRET_APPID = 'test-appid-7c1b';
process.env.LOGIN_PASSWORD = SECRET_PW;
process.env.IAAA_APP_ID = SECRET_APPID;
process.env.IAAA_MOCK = '1';                       // ⚠ 必须在 import app.js 之前（`routes/iaaa.js` 在**模块加载时**读它）
const { createApp } = await import('../app.js');
const { seedBaseline } = await import('../seed-baseline.js');

let server, BASE, db;

const get = async (path, token) => {
  const r = await fetch(BASE + path, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  const text = await r.text();
  let json = null; try { json = JSON.parse(text); } catch { /* 非 JSON */ }
  return { status: r.status, json, text };
};
const iaaaLogin = async (studentId) =>
  (await get(`/api/v1/auth/iaaa/callback?mode=json&token=${encodeURIComponent(studentId)}`)).json;

before(async () => {
  const app = createApp(':memory:');
  db = app.locals.db;
  seedBaseline(db);
  db.prepare('INSERT OR REPLACE INTO users (id, data) VALUES (?, ?)').run('u-org', JSON.stringify(
    { id: 'u-org', name: '组织委员', studentId: 'org-001', role: 'org-commissioner', branchId: 'br-b1' }));
  server = app.listen(0);
  await new Promise((r) => server.once('listening', r));
  BASE = `http://127.0.0.1:${server.address().port}`;
});
after(() => server && server.close());

test('S1 门：成员 / 组织委员 403；党委 200', async () => {
  const member = await iaaaLogin('2026member01');
  assert.equal((await get('/api/v1/setup/setup-status', member.token)).status, 403, '普通成员不得看运维信息');
  const org = await iaaaLogin('org-001');
  assert.equal((await get('/api/v1/setup/setup-status', org.token)).status, 403, '组织委员也不是党委 ⇒ 403');
  const pc = await iaaaLogin('9000000001');            // 基线党委账号（party-staff）
  assert.equal(pc.user.role, 'party-staff');
  assert.equal((await get('/api/v1/setup/setup-status', pc.token)).status, 200, '党委应可读');
});

test('S2 形状：五个块齐备，checklist 每条含 id/label/ok/howto', async () => {
  const pc = await iaaaLogin('9000000001');
  const { json } = await get('/api/v1/setup/setup-status', pc.token);
  for (const k of ['deploy', 'env', 'db', 'checklist', 'envTemplate']) assert.ok(k in json, `缺 ${k}`);
  assert.ok(Array.isArray(json.checklist) && json.checklist.length >= 9, `checklist 应有 ≥9 条，实测 ${json.checklist.length}`);
  for (const c of json.checklist) {
    assert.ok(c.id && c.label && c.howto, `checklist 条目字段不全：${JSON.stringify(c)}`);
    assert.equal(typeof c.ok, 'boolean', `ok 应为布尔：${c.id}`);
  }
  assert.ok(json.db.schemaVersion >= 1, '库结构版本应已应用');
  assert.equal(json.db.branches, 1, '基线应恰 1 个支部');
  assert.equal(json.db.partyStaff, 1, '基线应恰 1 名党委');
});

test('S3 安全底线：响应**不含任何密钥实值**（口令 / appID 不得回显）', async () => {
  const pc = await iaaaLogin('9000000001');
  const { text } = await get('/api/v1/setup/setup-status', pc.token);
  assert.ok(!text.includes(SECRET_PW), '⛔ 响应里出现了 LOGIN_PASSWORD 的实值');
  assert.ok(!text.includes(SECRET_APPID), '⛔ 响应里出现了 IAAA_APP_ID 的实值');
  // 「KEY=实值」形态一律不许出现；但 `KEY=<占位>`（envTemplate 里的模板行）是**故意**的，不算泄露
  assert.ok(!/LOGIN_PASSWORD=(?!<)/.test(text), '⛔ 响应里出现了「LOGIN_PASSWORD=实值」形态（应只回布尔 / `<占位>`）');
  // 但「有没有」必须如实回答
  const { json } = await get('/api/v1/setup/setup-status', pc.token);
  assert.equal(json.env.LOGIN_PASSWORD, true, '已设口令 ⇒ 应为 true（只回有没有）');
  assert.equal(json.env.IAAA_APP_ID, true, '已设 appID ⇒ 应为 true');
});

test('S4 非空转且双向：SEED_FALLBACK 未设 ⇒ 判红；设 0 ⇒ 转绿', async () => {
  const pc = await iaaaLogin('9000000001');
  const find = (j, id) => j.checklist.find((c) => c.id === id);
  const saved = process.env.SEED_FALLBACK;
  try {
    delete process.env.SEED_FALLBACK;
    let j = (await get('/api/v1/setup/setup-status', pc.token)).json;
    assert.equal(find(j, 'seed-fallback').ok, false, '未设 SEED_FALLBACK ⇒ 该项应判红');
    process.env.SEED_FALLBACK = '0';
    j = (await get('/api/v1/setup/setup-status', pc.token)).json;
    assert.equal(find(j, 'seed-fallback').ok, true, '设成 0 ⇒ 该项应转绿');
  } finally {
    if (saved === undefined) delete process.env.SEED_FALLBACK; else process.env.SEED_FALLBACK = saved;
  }
});

test('S5 演示名册判据反例锁死：塞入 p7 ⇒ 计数 1 且判红；移除 ⇒ 归零', async () => {
  const pc = await iaaaLogin('9000000001');
  const find = (j) => j.checklist.find((c) => c.id === 'no-demo');
  let j = (await get('/api/v1/setup/setup-status', pc.token)).json;
  assert.equal(j.db.demoAccounts, 0, '干净库应为 0');
  assert.equal(find(j).ok, true);

  // 反例：塞一名 id 形如 p<数字> 的演示成员（真实演示种子的 id 形态）
  db.prepare('INSERT OR REPLACE INTO users (id, data) VALUES (?, ?)').run('p7', JSON.stringify(
    { id: 'p7', name: '演示成员', studentId: '2026000007', role: 'participant', branchId: 'br-b1' }));
  j = (await get('/api/v1/setup/setup-status', pc.token)).json;
  assert.equal(j.db.demoAccounts, 1, '塞入演示人后计数应为 1（否则判据恒真、等于没检）');
  assert.equal(find(j).ok, false, '有演示残留 ⇒ 该项必须判红');

  db.prepare('DELETE FROM users WHERE id = ?').run('p7');
  j = (await get('/api/v1/setup/setup-status', pc.token)).json;
  assert.equal(j.db.demoAccounts, 0, '移除后应归零');
});

test('S6 envTemplate 只含键名与占位（不含任何实值）', async () => {
  const pc = await iaaaLogin('9000000001');
  const { json } = await get('/api/v1/setup/setup-status', pc.token);
  const t = json.envTemplate;
  for (const k of ['APP_ENV=', 'LOGIN_PASSWORD=', 'DB_PATH=', 'UPLOAD_DIR=', 'SEED_FALLBACK=', 'IAAA_APP_ID=', 'IAAA_REDIRECT_URI=']) {
    assert.ok(t.includes(k), `模板应含 ${k}`);
  }
  assert.ok(!t.includes(SECRET_PW) && !t.includes(SECRET_APPID), '⛔ 模板里不得含密钥实值');
  assert.ok(/LOGIN_PASSWORD=<[^>]+>/.test(t), '口令应是 `<占位>` 形态');
});
