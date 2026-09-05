// role: [工程师]+[AI]
// module-compose.test.mjs — P3d v0 模块组合声明契约校验单测（2026-09-05）
// 契约源：content/04_web_design/evolution/WORKFLOW_BLOCK_CONTRACT.md「组合声明（P3d v0）」
// 纯 node（无 Playwright、不起 server）：
//   ① assertComposeValid 通过例；② 引用缺失 / 互斥同含 / depends 成环 三失败例；
//   ③ resolveConflicts 收集正确性（多类问题一次集齐、去重）；
//   ④ manifests.js 全量块清单接线断言（P3d 元数据已落地 + assertComposeValid 干净）。
// 运行：cd server; node --test --test-concurrency=1 test/module-compose.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveConflicts, assertComposeValid } from '../../docs/src/core/module-compose.js';
import { BLOCK_MANIFESTS } from '../../docs/src/workflow/blocks/manifests.js';

// ── ① 通过例：依赖链合法、无互斥同含、无环 ──
test('assertComposeValid：组合干净返回 true', () => {
  const clean = [
    { id: 'base' },
    { id: 'a', depends: ['base'] },
    { id: 'b', depends: ['a'], conflictsWith: [] },
  ];
  assert.equal(assertComposeValid(clean), true);
  assert.deepEqual(resolveConflicts(clean), { missingRefs: [], mutual: [], cycles: [] });
});

// ── ② 失败例 ×3 ──
test('assertComposeValid：引用缺失抛错（含 引用方 -> 缺失 id）', () => {
  const items = [
    { id: 'a', depends: ['ghost-dep'] },
    { id: 'b', conflictsWith: ['ghost-x'] },
  ];
  assert.throws(() => assertComposeValid(items), /引用缺失：a -> ghost-dep；b -> ghost-x/);
});

test('assertComposeValid：互斥同含抛错（含双方 id）', () => {
  const items = [
    { id: 'attendance', conflictsWith: ['publicity'] },
    { id: 'publicity', conflictsWith: [] },
  ];
  assert.throws(() => assertComposeValid(items), /互斥同含：attendance × publicity/);
});

test('assertComposeValid：depends 成环抛错（含环路径，含自依赖环）', () => {
  const items = [
    { id: 'a', depends: ['b'] },
    { id: 'b', depends: ['a'] },
    { id: 'self', depends: ['self'] },
  ];
  assert.throws(() => assertComposeValid(items), /depends 成环：a → b → a/);
  assert.throws(() => assertComposeValid(items), /self → self/);
});

// ── ③ resolveConflicts 收集式：缺失/互斥/环 一次集齐；重复互斥对去重；形状正确 ──
test('resolveConflicts：收集式一次返回三类问题全集', () => {
  const items = [
    { id: 'x', depends: ['missing-1'], conflictsWith: ['y'] },
    { id: 'y', conflictsWith: ['x'] }, // 与上一条同一互斥对（x,y）→ 去重只记一对
    { id: 'z', depends: ['z'] },       // 自环
  ];
  const res = resolveConflicts(items);
  assert.deepEqual(res.missingRefs, ['x -> missing-1']);
  assert.deepEqual(res.mutual, [['x', 'y']]);
  assert.deepEqual(res.cycles, [['z', 'z']]);

  // assertComposeValid 同一条错误信息聚合三类问题
  assert.throws(
    () => assertComposeValid(items),
    /模块组合声明不合规（引用缺失：x -> missing-1；互斥同含：x × y；depends 成环：z → z）/,
  );
});

// ── ④ manifests 接线：试点块清单组合声明干净（P3d 元数据已落地）──
test('接线：manifests.js 全量块清单 assertComposeValid 干净 + depends/conflictsWith 已声明', () => {
  assert.equal(assertComposeValid(BLOCK_MANIFESTS), true);
  assert.deepEqual(
    BLOCK_MANIFESTS.map((m) => m.blockId),
    ['theme-party-day', 'taskforce-run'],
  );
  for (const m of BLOCK_MANIFESTS) {
    assert.ok(Array.isArray(m.depends) && m.depends.length === 0, `${m.blockId}.depends 应为空数组（P3d v0 元数据）`);
    assert.ok(Array.isArray(m.conflictsWith) && m.conflictsWith.length === 0, `${m.blockId}.conflictsWith 应为空数组（P3d v0 元数据）`);
  }
});
