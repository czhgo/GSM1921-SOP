// server/test/output-block-policy.test.mjs — 活动产出块策略（块画布 v0，2026-09-03）
// 纯函数验证：applyOutputBlockPolicy/getOutputBlockPolicy 默认全开、hidden 过滤、order 排序。
// node-only（无浏览器/无全局状态依赖）。

import { test } from 'node:test';
import assert from 'node:assert/strict';

const V = '?v=20260908c';
const DEFS = ['attendance', 'inspection', 'publicity', 'materials'];

test('产出块：默认（null）全开且保持注册顺序', async () => {
  const { applyOutputBlockPolicy, getOutputBlockPolicy } = await import(`../../docs/src/services/branch.js${V}`);
  assert.deepEqual(applyOutputBlockPolicy(DEFS, null), DEFS, 'null=全开');
  const p = getOutputBlockPolicy(null);
  assert.equal(p.hidden.size, 0);
  assert.equal(p.order, null);
});

test('产出块：隐藏+排序生效（脏数据含未知 id 不崩）', async () => {
  const { applyOutputBlockPolicy } = await import(`../../docs/src/services/branch.js${V}`);
  const blocks = { outputBlocks: { hiddenBlockIds: ['publicity', 'nope'], blockOrder: ['materials', 'inspection', 'attendance'] } };
  const out = applyOutputBlockPolicy(DEFS, blocks);
  assert.deepEqual(out, ['materials', 'inspection', 'attendance'], 'publicity 隐藏且按 order 排序');
  // 只隐藏不改序
  const out2 = applyOutputBlockPolicy(DEFS, { outputBlocks: { hiddenBlockIds: ['materials'], blockOrder: [] } });
  assert.deepEqual(out2, ['attendance', 'inspection', 'publicity'], 'blockOrder 空=沿用注册序');
});

test('产出块：全部停用 → 空数组（消费端显示提示）', async () => {
  const { applyOutputBlockPolicy } = await import(`../../docs/src/services/branch.js${V}`);
  const out = applyOutputBlockPolicy(DEFS, { outputBlocks: { hiddenBlockIds: [...DEFS], blockOrder: [] } });
  assert.deepEqual(out, [], '全停用为空');
});
