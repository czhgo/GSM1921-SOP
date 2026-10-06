// server/test/block-field-policy.test.mjs — ② 表单条目轴（契约 §8.2，2026-09-29 批次 275）
// 口径（WORKFLOW_BLOCK_CONTRACT §8.2）：
//   · 对齐全口径＝manifest `inputs.fields[].fieldId` 必须能指到写面板真实渲染位；
//     由 Step1「模板卡」承担的条目（如主题党日 `type`）标 `carrier:'template-card'`、**不进 Step2 表单字段**
//     ⇒ 「声明 ↔ 实现」不再有第三态。
//   · 支部可配面**只开两类**：`hiddenFieldIds`（字段启停）＋ `requiredOverrides`（必填覆盖）；
//     净化唯一实现 = `services/branch/config-clean.js::cleanFieldPolicies`；
//     读侧与 `getWorkflowBlockPolicy` 同族（同取 config.blocks.workflowBlocks 段）。
// 覆盖：① 纯函数净化（正/反样例 + 空壳不保留） ② 读侧默认全开 ③ 对齐清单（carrier 过滤 + 必填覆盖 + 不原地改 manifest）
//       ④ HTTP 往返回荡（写回净化形状 / 非法值被丢弃 / blocks=null 恢复默认 / 反例锁死）
// 运行：node --test server/test/block-field-policy.test.mjs（自包含 server）

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

const V = '?v=20261006g';
const BLOCK = 'theme-party-day';

test('② 净化 + 读侧：cleanFieldPolicies 正/反样例（去重/丢非串/只收布尔/空壳不保留）', async () => {
  const { cleanFieldPolicies } = await import(`../../docs/src/services/branch/config-clean.js${V}`);
  const { getWorkflowBlockFieldPolicy } = await import(`../../docs/src/services/branch/branch.js${V}`);

  const cleaned = cleanFieldPolicies({
    [BLOCK]: { hiddenFieldIds: ['date', 'date', 123, ''], requiredOverrides: { title: false, bad: 'yes', keep: true } },
    '': { hiddenFieldIds: ['a'] },                                  // 空 blockId ⇒ 丢
    empty: { hiddenFieldIds: [], requiredOverrides: {} },           // 空壳 ⇒ 不保留
  });
  assert.deepEqual(cleaned[BLOCK].hiddenFieldIds, ['date'], 'hiddenFieldIds：去重 + 非串/空串丢弃');
  assert.deepEqual(cleaned[BLOCK].requiredOverrides, { title: false, keep: true }, 'requiredOverrides：只收布尔值');
  assert.equal(cleaned[''], undefined, '空 blockId 丢弃');
  assert.equal(cleaned.empty, undefined, '两类皆空 ⇒ 不保留（空壳无意义）');
  assert.notDeepEqual(cleaned, { [BLOCK]: { hiddenFieldIds: ['date'] } }, '反例锁死：requiredOverrides 必须一并保留');

  // 非对象/数组入参 ⇒ 空对象（不崩、不写坏）
  assert.deepEqual(cleanFieldPolicies(null), {});
  assert.deepEqual(cleanFieldPolicies([]), {});

  // 读侧：无配置 = 全开 + 无覆盖（默认零影响的口径面）
  const def = getWorkflowBlockFieldPolicy(BLOCK, null);
  assert.equal(def.hidden.size, 0, '无配置 ⇒ 无隐藏');
  assert.deepEqual(def.requiredOverrides, {}, '无配置 ⇒ 无必填覆盖');
  assert.equal(getWorkflowBlockFieldPolicy(BLOCK, { workflowBlocks: { hiddenBlockIds: ['x'] } }).hidden.size, 0, '相邻段（hiddenBlockIds）不串味');
  const pol = getWorkflowBlockFieldPolicy(BLOCK, { workflowBlocks: { fieldPolicies: { [BLOCK]: { hiddenFieldIds: ['date'], requiredOverrides: { title: false } } } } });
  assert.ok(pol.hidden.has('date'), '读到隐藏');
  assert.equal(pol.requiredOverrides.title, false, '读到必填覆盖');
});

test('② 对齐清单：carrier 过滤 + 隐藏 + 必填覆盖（且不原地改 manifest）', async () => {
  const { applyWorkflowBlockFieldPolicy } = await import(`../../docs/src/services/branch/branch.js${V}`);
  const { THEME_PARTY_DAY_MANIFEST } = await import(`../../docs/src/workflow/blocks/manifests.js${V}`);
  const fields = THEME_PARTY_DAY_MANIFEST.inputs.fields;

  // ① 默认：`type`（carrier:'template-card'）不进 Step2；title/date 保留
  const def = applyWorkflowBlockFieldPolicy(fields, BLOCK, null);
  assert.deepEqual(def.map((f) => f.fieldId), ['title', 'date'], 'carrier=template-card 的条目不进 Step2 字段');
  assert.ok(!def.some((f) => f.fieldId === 'type'), '反例锁死：type 若未标 carrier 会被当表单字段 ⇒ 本断言即红');

  // ② 隐藏 date
  const hid = applyWorkflowBlockFieldPolicy(fields, BLOCK, { workflowBlocks: { fieldPolicies: { [BLOCK]: { hiddenFieldIds: ['date'] } } } });
  assert.deepEqual(hid.map((f) => f.fieldId), ['title'], 'hiddenFieldIds 生效');

  // ③ 必填覆盖 title=false（且不改动原 manifest 对象）
  const ovr = applyWorkflowBlockFieldPolicy(fields, BLOCK, { workflowBlocks: { fieldPolicies: { [BLOCK]: { requiredOverrides: { title: false } } } } });
  assert.equal(ovr.find((f) => f.fieldId === 'title').required, false, 'requiredOverrides 生效');
  assert.equal(fields.find((f) => f.fieldId === 'title').required, true, '不原地改 manifest（返回新对象）');
  assert.notEqual(ovr.find((f) => f.fieldId === 'title'), fields.find((f) => f.fieldId === 'title'), '覆盖项为新对象');
});

test('② HTTP：fieldPolicies 写回（净化形状）/ 非法丢弃 / blocks=null 恢复默认', async () => {
  const { token: sec } = await login('p13');    // 现任支书
  const { token: staff } = await login('p_pc'); // 党委组织员

  // ① 写入（含脏值）→ 200，读回为净化后的形状
  const r1 = await patchConfig(sec, {
    config: {
      blocks: {
        workflowBlocks: {
          hiddenBlockIds: [], blockOrder: [],
          fieldPolicies: {
            [BLOCK]: { hiddenFieldIds: ['date', 'date', 123], requiredOverrides: { title: false, bad: 'yes' } },
            '': { hiddenFieldIds: ['x'] },
          },
        },
      },
    },
  });
  assert.equal(r1.status, 200, '支书可写 workflowBlocks.fieldPolicies');
  const b1 = (await r1.json()).config.blocks.workflowBlocks;
  assert.deepEqual(b1.fieldPolicies[BLOCK].hiddenFieldIds, ['date'], 'hiddenFieldIds 净化后落库');
  assert.deepEqual(b1.fieldPolicies[BLOCK].requiredOverrides, { title: false }, '非布尔被丢弃');
  assert.equal(b1.fieldPolicies[''], undefined, '空 blockId 被丢弃');
  assert.deepEqual(b1.hiddenBlockIds, [], '同段 hiddenBlockIds 同写不丢');
  assert.deepEqual(b1.blockOrder, [], '同段 blockOrder 同写不丢');

  // ② 未带 fieldPolicies 时，既有 workflowBlocks 写回不引入该段（向后兼容、零 diff）
  const r2 = await patchConfig(staff, { config: { blocks: { workflowBlocks: { hiddenBlockIds: ['taskforce'] } } } });
  assert.equal(r2.status, 200, '仅 workflowBlocks 合法');
  assert.equal((await r2.json()).config.blocks.workflowBlocks.fieldPolicies, undefined, '未写则不引入 fieldPolicies 段');

  // ③ 恢复默认：blocks=null → 全清（含 fieldPolicies）
  const r3 = await patchConfig(staff, { config: { blocks: null } });
  assert.equal(r3.status, 200, 'blocks=null 恢复默认');
  assert.equal((await r3.json()).config.blocks, null, 'blocks 全清');
});
