// server/test/workflow-block-config.test.mjs — L3 S3 工作流块配置（2026-09-03）
// 书记裁定：config.blocks 增 workflowBlocks（与 outputBlocks 平级）；PATCH /branches/:id/config 仅书记/party-staff
// 覆盖：① 纯函数 policy（默认全开/隐藏过滤/兼容缺段） ② HTTP 写回/结构校验/恢复默认
// 运行：node --test server/test/workflow-block-config.test.mjs（自包含 server）

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

const V = '?v=20260908d';
const BLOCK_IDS = ['theme-party-day', 'taskforce-run'];

test('S3 工作流块策略（纯函数）：默认全开 / 隐藏过滤 / 缺段兼容', async () => {
  const { applyWorkflowBlockPolicy, getWorkflowBlockPolicy } = await import(`../../docs/src/services/branch.js${V}`);

  // ① null=全开，保持清单顺序
  assert.deepEqual(applyWorkflowBlockPolicy(BLOCK_IDS, null), BLOCK_IDS, 'null=全开');
  assert.equal(getWorkflowBlockPolicy(null).hidden.size, 0, 'null 无隐藏');

  // ② 隐藏 theme-party-day → 仅剩 taskforce-run
  const out = applyWorkflowBlockPolicy(BLOCK_IDS, { workflowBlocks: { hiddenBlockIds: ['theme-party-day'] } });
  assert.deepEqual(out, ['taskforce-run'], '隐藏生效');

  // ③ 旧 config 只有 outputBlocks（无 workflowBlocks）→ 全开兼容
  const old = applyWorkflowBlockPolicy(BLOCK_IDS, { outputBlocks: { hiddenBlockIds: ['publicity'] } });
  assert.deepEqual(old, BLOCK_IDS, '缺 workflowBlocks=兼容全开');

  // ④ 脏数据含未知 id 不崩
  const dirty = applyWorkflowBlockPolicy(BLOCK_IDS, { workflowBlocks: { hiddenBlockIds: ['nope', 'taskforce-run'] } });
  assert.deepEqual(dirty, ['theme-party-day'], '未知 id 不崩');
});

test('S3 HTTP：workflowBlocks 写回/结构校验/恢复默认', async () => {
  const { token: sec } = await login('p13');    // 现任书记
  const { token: staff } = await login('p_pc'); // 党委组织员

  // ① 书记写 workflowBlocks（与 outputBlocks 同包）→ 200 落库
  const r1 = await patchConfig(sec, {
    config: {
      blocks: {
        outputBlocks: { hiddenBlockIds: [], blockOrder: [] },
        workflowBlocks: { hiddenBlockIds: ['theme-party-day'] },
      },
    },
  });
  assert.equal(r1.status, 200, '书记可写 workflowBlocks');
  const b1 = await r1.json();
  assert.deepEqual(b1.config.blocks.workflowBlocks.hiddenBlockIds, ['theme-party-day'], 'workflowBlocks 写回');
  assert.ok(b1.config.blocks.outputBlocks, 'outputBlocks 保留');

  // ② 单写 workflowBlocks（无 outputBlocks）→ 200（结构允许至少其一）
  const r2 = await patchConfig(staff, { config: { blocks: { workflowBlocks: { hiddenBlockIds: ['taskforce-run'] } } } });
  assert.equal(r2.status, 200, '仅 workflowBlocks 合法');
  const b2 = await r2.json();
  assert.deepEqual(b2.config.blocks.workflowBlocks.hiddenBlockIds, ['taskforce-run'], '仅 workflowBlocks 落库');

  // ③ 非法结构：非对象/缺两段 → 400
  assert.equal((await patchConfig(sec, { config: { blocks: { hiddenBlockIds: [] } } })).status, 400, '缺 outputBlocks+workflowBlocks → 400');
  assert.equal((await patchConfig(sec, { config: { blocks: 'nope' } })).status, 400, 'blocks 非对象 → 400');

  // ④ 恢复默认：blocks=null → 全清
  const r4 = await patchConfig(staff, { config: { blocks: null } });
  assert.equal(r4.status, 200, 'blocks=null 恢复默认');
  assert.equal((await r4.json()).config.blocks, null, 'workflowBlocks/outputBlocks 全清');
});
