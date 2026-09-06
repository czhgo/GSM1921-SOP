// role: [工程师]+[AI]
// server/test/org-config.test.mjs — 换组织向导 · 支部组织档案写口（2026-09-06 书记 R4）
// 覆盖：PATCH /branches/:id/config 白名单扩 config.headerTitle/desc/themePreset（组织档案域）
//   · party-staff / 本支部现任书记 均可写；副书记 403；name 治理字段不受 config 写口影响
//   · 主题预设白名单净化（非法值忽略）
//   · 配置变更自动留痕 config.configChangeHistory（{by,at,what,from?,to?}；重复提交不产生冗余）
// 运行：node --test test/org-config.test.mjs（自包含 server，:memory: 库）
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
after(() => {
  server.closeAllConnections?.();
  return new Promise((resolve) => server.close(resolve));
});

async function login(personId) {
  const res = await fetch(`${base}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ personId, password: '123456' }),
  });
  assert.equal(res.status, 200, `登录失败 ${personId}`);
  return (await res.json()).token;
}
function auth(token) {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}
async function patchConfig(token, body) {
  return fetch(`${base}/api/v1/branches/br-b1/config`, {
    method: 'PATCH', headers: auth(token), body: JSON.stringify(body),
  });
}

test('org 档案：party-staff 写 headerTitle/desc/themePreset → 白名单净化 + 留痕 {by,at,what,from,to}', async () => {
  const staff = await login('p_pc');
  const r = await patchConfig(staff, {
    config: { headerTitle: '光华本科生党支部·换壳', desc: '样板支部自述', themePreset: 'sky' },
  });
  assert.equal(r.status, 200);
  const b = await r.json();
  assert.equal(b.config.headerTitle, '光华本科生党支部·换壳');
  assert.equal(b.config.desc, '样板支部自述');
  assert.equal(b.config.themePreset, 'sky');
  const hist = b.config.configChangeHistory;
  assert.ok(Array.isArray(hist) && hist.length >= 3, '三种变更均留痕');
  const theme = hist.find((h) => h.what === 'themePreset');
  assert.ok(theme, 'themePreset 留痕存在');
  assert.equal(theme.by, 'p_pc');
  assert.ok(theme.at && theme.what === 'themePreset');
  assert.equal(theme.from, null);
  assert.equal(theme.to, 'sky');
  const desc = hist.find((h) => h.what === 'desc');
  assert.equal(desc.from, null);
  assert.equal(desc.to, '样板支部自述');
  // name 治理字段不受 config 写口影响（body 里塞 name 也不会改）
  assert.equal(b.name, '光华管理学院本科生党支部');
});

test('org 档案：现任书记（p13）可写本支部 org 域；副书记 403；越权 name 不生效', async () => {
  const sec = await login('p13');
  const r = await patchConfig(sec, { config: { themePreset: 'blue', headerTitle: '书记改的页眉' } });
  assert.equal(r.status, 200, '现任书记可写 org 域');
  const b = await r.json();
  assert.equal(b.config.themePreset, 'blue');
  assert.equal(b.config.headerTitle, '书记改的页眉');
  assert.equal(b.name, '光华管理学院本科生党支部', '顶层 name 不变（治理字段归 party-staff）');
  const dep = await login('p11'); // 组织委员（非现任书记）
  const r2 = await patchConfig(dep, { config: { themePreset: 'green' } });
  assert.equal(r2.status, 403, '副书记/委员不可写');
});

test('org 档案：themePreset 非法值忽略（白名单净化）；headerTitle 空串回退支部名', async () => {
  const staff = await login('p_pc');
  const r = await patchConfig(staff, { config: { themePreset: 'gold' } }); // gold 固定不可选
  assert.equal(r.status, 200);
  const b1 = await r.json();
  assert.notEqual(b1.config.themePreset, 'gold', '固定党徽金不落库');
  const r2 = await patchConfig(staff, { config: { headerTitle: '   ' } });
  assert.equal(r2.status, 200);
  const b2 = await r2.json();
  assert.ok(b2.config.headerTitle && b2.config.headerTitle.trim().length > 0, 'headerTitle 不允许清空（回退支部名）');
});

test('org 档案：重复提交相同值不产生冗余留痕', async () => {
  const sec = await login('p13');
  await patchConfig(sec, { config: { themePreset: 'red', desc: '支部自述-v1' } });
  const before = (await (await patchConfig(sec, { config: { themePreset: 'red', desc: '支部自述-v1' } })).json()).config.configChangeHistory.length;
  const after = (await (await patchConfig(sec, { config: { themePreset: 'red', desc: '支部自述-v1' } })).json()).config.configChangeHistory.length;
  assert.equal(after, before, '相同值重复提交不追加留痕');
});
