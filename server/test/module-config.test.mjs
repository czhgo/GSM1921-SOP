// server/test/module-config.test.mjs — L2 支部工作流模块配置（2026-09-03）
// 支书裁定：支部自治/支书操作/核心固定——PATCH /branches/:id/config 仅本支部现任支书、
// 本副支书（副书同权，2026-09-09 支书批）或 party-staff；其它支委/普通成员/外支部 403；
// 白名单仅收 config.modules（治理字段 name 不受 body 影响）；modules=null 恢复默认。HTTP 直连（无浏览器）。

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../app.js';
import { seedDatabase } from '../seed.js';

let server, base, db;

before(async () => {
  const app = createApp({ dbPath: ':memory:' });
  await seedDatabase(app.locals.db);
  db = app.locals.db;
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
    body: JSON.stringify({ personId }),
  });
  assert.equal(res.status, 200, `登录失败 ${personId}`);
  return res.json();
}
function auth(token) {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}
async function patchConfig(token, body) {
  return fetch(`${base}/api/v1/branches/br-b1/config`, {
    method: 'PATCH', headers: auth(token), body: JSON.stringify(body),
  });
}

test('L2 config：现任支书/本副支书可写，其它支委/普通成员 403，党委可写；治理字段不受 body 影响', async () => {
  const { token: sec } = await login('p13');    // 现任支书（br-b1）
  const { token: dep } = await login('p14');    // 本副支书（deputy-secretary，br-b1；副书同权 2026-09-09）
  const { token: orgc } = await login('p11');   // 组织委员（支委但非支书/副）
  const { token: mem } = await login('p5');     // 普通成员
  const { token: staff } = await login('p_pc'); // 党委组织员

  // ① 现任支书写 → 200，modules 落库
  const r1 = await patchConfig(sec, { config: { modules: { hiddenTabIds: ['calendar', 'feedback'], tabOrder: ['report-up'] }, name: '越权改名' } });
  assert.equal(r1.status, 200, '现任支书可配置');
  const b1 = await r1.json();
  assert.deepEqual(b1.config.modules.hiddenTabIds, ['calendar', 'feedback'], 'hidden 写回');
  assert.deepEqual(b1.config.modules.tabOrder, ['report-up'], 'tabOrder 写回');
  assert.equal(b1.name, '光华管理学院本科生党支部', '治理字段 name 不被 body 影响（白名单）');
  assert.equal(b1.secretaryId, 'p13', 'secretaryId 不变');

  // ② 本副支书 → 200（副书同权：config 写权同现任支书）
  const r2 = await patchConfig(dep, { config: { modules: { hiddenTabIds: ['calendar'], tabOrder: ['report-up', 'notification'] } } });
  assert.equal(r2.status, 200, '本副支书可配置（副书同权）');
  const b2 = await r2.json();
  assert.deepEqual(b2.config.modules.hiddenTabIds, ['calendar'], '副支书 hidden 写回');
  assert.deepEqual(b2.config.modules.tabOrder, ['report-up', 'notification'], '副支书 tabOrder 写回');
  assert.equal(b2.name, '光华管理学院本科生党支部', '副支书写亦不影响治理字段');

  // ③ 其它支委（组织委员，非支书/副）→ 403
  assert.equal((await patchConfig(orgc, { config: { modules: { hiddenTabIds: [] } } })).status, 403, '非支书/副的支委不可写');

  // ④ 普通成员 → 403
  assert.equal((await patchConfig(mem, { config: { modules: { hiddenTabIds: [] } } })).status, 403, '普通成员不可写');

  // ⑤ 党委组织员 → 200（超管保留）
  const r5 = await patchConfig(staff, { config: { modules: null } });
  assert.equal(r5.status, 200, '党委组织员可配置');
  assert.equal((await r5.json()).config.modules, null, 'null=恢复默认');

  // ⑥ 非法 payload → 400
  assert.equal((await patchConfig(sec, { config: { modules: 'nope' } })).status, 400, 'modules 非对象 → 400');
});

test('L2 config 门控：外副支书 403（副书同权仅限本支部）', async () => {
  const { token: dep } = await login('p14');
  const row = db.prepare('SELECT data FROM users WHERE id = ?').get('p14');
  const user = JSON.parse(row.data);
  // 把 p14 归属临时改为另一支部 → 对 br-b1 的 config 写应 403
  db.prepare('UPDATE users SET data = ? WHERE id = ?').run(JSON.stringify({ ...user, branchId: 'br-other' }), 'p14');
  try {
    const r = await patchConfig(dep, { config: { modules: { tabOrder: ['report-up'] } } });
    assert.equal(r.status, 403, '外副支书不可写本支部 config');
  } finally {
    db.prepare('UPDATE users SET data = ? WHERE id = ?').run(JSON.stringify({ ...user, branchId: user.branchId || 'br-b1' }), 'p14');
  }
  // 恢复本支部归属后副支书可写（还原无残留）
  assert.equal((await patchConfig(dep, { config: { modules: null } })).status, 200, '恢复本支部归属后副支书可写');
});

test('L2 config.blocks：产出块写回/单独写 blocks/恢复默认/结构校验', async () => {
  const { token: sec } = await login('p13');
  const { token: staff } = await login('p_pc');

  // ① 单独写 blocks（modules 缺省保留现值）
  const r1 = await patchConfig(sec, { config: { blocks: { outputBlocks: { hiddenBlockIds: ['publicity'], blockOrder: ['materials', 'attendance'] } } } });
  assert.equal(r1.status, 200, '支书可写 blocks');
  const b1 = await r1.json();
  assert.deepEqual(b1.config.blocks.outputBlocks.hiddenBlockIds, ['publicity'], 'blocks.hiddenBlockIds 写回');
  assert.deepEqual(b1.config.blocks.outputBlocks.blockOrder, ['materials', 'attendance'], 'blocks.blockOrder 写回');

  // ② 结构非法 → 400
  assert.equal((await patchConfig(sec, { config: { blocks: { hiddenBlockIds: ['publicity'] } } })).status, 400, '缺 outputBlocks 包裹 → 400');

  // ③ 全空 config → 400
  assert.equal((await patchConfig(sec, { config: {} })).status, 400, '无 modules/blocks → 400');

  // ④ 党委可恢复默认（blocks=null）
  const r4 = await patchConfig(staff, { config: { blocks: null } });
  assert.equal(r4.status, 200, '党委可恢复 blocks 默认');
  assert.equal((await r4.json()).config.blocks, null, 'blocks=null 恢复默认');
});
