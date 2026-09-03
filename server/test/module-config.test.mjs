// server/test/module-config.test.mjs — L2 支部工作流模块配置（2026-09-03）
// 书记裁定：支部自治/书记操作/核心固定——PATCH /branches/:id/config 仅本支部现任书记或
// party-staff；副书记/普通成员/外支部 403；白名单仅收 config.modules（治理字段 name 不受 body 影响）；
// modules=null 恢复默认。HTTP 直连（无浏览器）。

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

test('L2 config：现任书记可写，副书记/普通成员 403，党委可写；治理字段不受 body 影响', async () => {
  const { token: sec } = await login('p13');   // 现任书记
  const { token: dep } = await login('p11');   // 副书记（secretaryId=p13，非本人）
  const { token: mem } = await login('p5');    // 普通成员
  const { token: staff } = await login('p_pc');// 党委组织员

  // ① 现任书记写 → 200，modules 落库
  const r1 = await patchConfig(sec, { config: { modules: { hiddenTabIds: ['calendar', 'feedback'], tabOrder: ['report-up'] }, name: '越权改名' } });
  assert.equal(r1.status, 200, '现任书记可配置');
  const b1 = await r1.json();
  assert.deepEqual(b1.config.modules.hiddenTabIds, ['calendar', 'feedback'], 'hidden 写回');
  assert.deepEqual(b1.config.modules.tabOrder, ['report-up'], 'tabOrder 写回');
  assert.equal(b1.name, '光华管理学院本科生党支部', '治理字段 name 不被 body 影响（白名单）');
  assert.equal(b1.secretaryId, 'p13', 'secretaryId 不变');

  // ② 副书记 → 403（只读，不因同工作台而误授写权）
  assert.equal((await patchConfig(dep, { config: { modules: { hiddenTabIds: [] } } })).status, 403, '副书记不可写');

  // ③ 普通成员 → 403
  assert.equal((await patchConfig(mem, { config: { modules: { hiddenTabIds: [] } } })).status, 403, '普通成员不可写');

  // ④ 党委组织员 → 200（超管保留）
  const r4 = await patchConfig(staff, { config: { modules: null } });
  assert.equal(r4.status, 200, '党委组织员可配置');
  assert.equal((await r4.json()).config.modules, null, 'null=恢复默认');

  // ⑤ 非法 payload → 400
  assert.equal((await patchConfig(sec, { config: { modules: 'nope' } })).status, 400, 'modules 非对象 → 400');
});
