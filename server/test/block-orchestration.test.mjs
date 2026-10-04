// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  server/test/block-orchestration.test.mjs — **工作流块编排内核**守卫（`O1`–`O5`）
//  G3-3 / §四 P10，2026-09-28 批次 239
// ════════════════════════════════════════════════════════════════
// **承重臂＝O1**：用**反例**锁住「组合体检不是恒真」。这正对应批次 239 修掉的真缺陷——
//   `docs/src/core/base/module-compose.js` 原来只认 `it.id`，而**块清单的键名是 `blockId`** ⇒
//   传入块清单时 `list` 被过滤成空集 ⇒ `missingRefs`/`mutual`/`cycles` 恒为空 ⇒
//   `assertComposeValid(BLOCK_MANIFESTS)` **恒真**；而 `block-manifest.test.mjs::S3` 断言的正是
//   「它不抛」⇒ **假绿**（「守卫只守表层」的又一实例）。修法＝`itemId()` 两种键名等价取用，
//   并在本文件用反例把「必须真抛」钉住。
//
// 其余各条：O2 正样例（端到端能编排出 plan）· O3 反样例（错误累积、不抛）· O4 拓扑序「只前移被依赖者」·
//   O5 编译产物是**既有 definition 形状的纯数据**（含函数即红；无模板的块只记 warning）。
//
// 纯 node（不做浏览器）：内核（`workflow/blocks/orchestration.js`）与块清单、既有模板都是零依赖纯 ESM，
//   可直接 import（先例 `server/test/policy-config.test.mjs`）。
// 运行：`node --test server/test/block-orchestration.test.mjs`
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { assertComposeValid, resolveConflicts } from '../../docs/src/core/base/module-compose.js?v=20261004i';
import { BLOCK_MANIFESTS } from '../../docs/src/workflow/blocks/manifests.js?v=20261004i';
import { blocksForScope, composePlan, compilePlan, blockCount } from '../../docs/src/workflow/blocks/orchestration.js?v=20261004i';
import { THEME_PARTY_DAY_DEFINITION } from '../../docs/src/workflow/definitions.js?v=20261004i';

test('O1 组合体检**不是恒真**（批次 239 修的真缺陷）：块清单键名 `blockId` 必须被认到', () => {
  // ① 反例：引用缺失必须真抛（修复前这里**不抛**——体检把整张清单过滤成了空集）
  assert.throws(() => assertComposeValid([{ blockId: 'a', depends: ['nope'] }]),
    /引用缺失/, 'blockId 键名的清单里「引用缺失」必须被判出——否则体检恒真（S3 假绿的真因）');
  // ② 反例：互斥同含 / 成环同样必须判出（同一套判据走 blockId 键名）
  assert.throws(() => assertComposeValid([
    { blockId: 'a', conflictsWith: ['b'] }, { blockId: 'b' },
  ]), /互斥同含/);
  assert.throws(() => assertComposeValid([
    { blockId: 'a', depends: ['b'] }, { blockId: 'b', depends: ['a'] },
  ]), /depends 成环/);
  // ③ 正例：合法组合不抛；且**id 键名仍兼容**（模块注册项用的是 `id`）
  assert.doesNotThrow(() => assertComposeValid([{ blockId: 'a', depends: ['b'] }, { blockId: 'b' }]));
  assert.doesNotThrow(() => assertComposeValid([{ id: 'a' }, { id: 'b' }]));
  assert.throws(() => assertComposeValid([{ id: 'a', depends: ['x'] }]), /引用缺失/, 'id 键名同样要判');
  // ④ 非空转：真实块清单确实被体检**看到**（清单规模 ≥2；对真实清单跑一遍不抛）
  assert.ok(blockCount() >= 2, `块清单只 ${blockCount()} 条：本守卫的端到端样例失去意义`);
  assert.doesNotThrow(() => assertComposeValid(BLOCK_MANIFESTS), '现行块清单的组合声明必须合法');
  const real = resolveConflicts(BLOCK_MANIFESTS);
  assert.deepEqual([real.missingRefs.length, real.mutual.length, real.cycles.length], [0, 0, 0]);
});

test('O2 正样例：能端到端编排出 plan（含产出/事件的归并）', () => {
  const r = composePlan(['theme-party-day']);
  assert.equal(r.ok, true, `单块编排应成功，实测错误：${r.errors.join('；')}`);
  assert.deepEqual(r.plan.blockIds, ['theme-party-day']);
  assert.ok(r.plan.entities.includes('activity') && r.plan.entities.includes('attendance'),
    `产出实体应归并自块声明，实测 ${JSON.stringify(r.plan.entities)}`);
  assert.ok(r.plan.stages.length >= 1 && r.plan.stages.every((s) => s.blockId), '阶段须带上来源块 id');
  assert.ok(r.plan.initiatorRoles.includes('secretary'), '发起角色应归并自块声明');
});

test('O3 反样例：错误**累积返回、不抛**（未知块 / 重复 / 闭包不完整 / 互斥 / 成环）', () => {
  // 造样例块：字段须过契约（blockId ≥3 字；capabilityId 用一个**未登记**的探针名，
  //   免得撞上 CAPABILITY_PROVENANCE 的「通用/自创不可谎报」对照——那属 S2–S4 的判据，不在本条焦点）
  const mk = (blockId, extra = {}) => ({
    blockId, name: `样例 ${blockId}`, version: '1.0.0', provenance: 'branch-custom', sopRef: 'x.md',
    capabilityId: 'probe-cap', scope: ['workspace:secretary'], depends: [], conflictsWith: [],
    inputs: { fields: [] }, participants: { mode: 'fixed', orgMode: 'none' },
    stages: [{ id: 's1', kind: 'engine', outputs: [] }],
    outputs: { entities: ['activity'], outputBlocks: [] },
    events: { emits: [], listens: [] },
    validation: { initiatorRoles: ['secretary'], requiredSop: true, enabledByDefault: true },
    ...extra,
  });
  const list = [
    mk('probe-a'),
    mk('probe-b', { conflictsWith: ['probe-c'] }),
    mk('probe-c'),
    mk('probe-d', { depends: ['probe-e'] }),
    mk('probe-e', { depends: ['probe-d'] }),
    mk('probe-f', { depends: ['probe-g'] }),
  ];
  const cases = [
    [['nope'], /未知块 id/],
    [['probe-a', 'probe-a'], /不得重复拖入/],
    [[], /编排为空/],
    [['probe-f'], /依赖闭包不完整/],
    [['probe-b', 'probe-c'], /互斥块同含/],
    [['probe-d', 'probe-e'], /depends 成环/],
  ];
  for (const [ids, re] of cases) {
    const r = composePlan(ids, list);
    assert.equal(r.ok, false, `${JSON.stringify(ids)} 应判为不合规`);
    assert.equal(r.plan, null, '不合规时不应给出 plan');
    assert.match(r.errors.join('｜'), re, `${JSON.stringify(ids)} 的错误信息应命中 ${re}`);
  }
  // 累积：一次给多个问题，应一次列全（不是只报第一个）
  const multi = composePlan(['nope', 'probe-a', 'probe-a'], list);
  assert.ok(multi.errors.length >= 2, `多问题应累积返回，实测 ${JSON.stringify(multi.errors)}`);
});

test('O4 拓扑序「只前移被依赖者」：同层保持调用方顺序', () => {
  const mk = (blockId, depends = []) => ({
    blockId, name: blockId, version: '1.0.0', provenance: 'branch-custom', sopRef: 'x.md',
    capabilityId: 'probe-cap', scope: ['workspace:secretary'], depends, conflictsWith: [],
    inputs: { fields: [] }, participants: { mode: 'fixed', orgMode: 'none' },
    stages: [{ id: 's1', kind: 'engine', outputs: [] }], outputs: { entities: ['activity'], outputBlocks: [] },
    events: { emits: [], listens: [] }, validation: { initiatorRoles: ['secretary'], requiredSop: true, enabledByDefault: true },
  });
  // 输入顺序 [probe-c, probe-a, probe-b]，其中 probe-a depends probe-b
  //   ⇒ probe-b 必须被前移到 probe-a 之前，probe-c 保持最前
  const list = [mk('probe-a', ['probe-b']), mk('probe-b'), mk('probe-c')];
  const r = composePlan(['probe-c', 'probe-a', 'probe-b'], list);
  assert.equal(r.ok, true, r.errors.join('；'));
  assert.deepEqual(r.plan.blockIds, ['probe-c', 'probe-b', 'probe-a'], '被依赖者前移、同层保持原序');
});

test('O5 编译产物 = **既有 definition 形状的纯数据**（含函数即红；无模板的块只记 warning）', () => {
  const r = composePlan(['theme-party-day']);
  assert.equal(r.ok, true);

  // ① 有既有模板 ⇒ 编译出 templateId 与 sopScenarioId（既有引擎据此执行，不新造引擎）
  const c1 = compilePlan(r.plan, { definitionsById: { 'theme-party-day': THEME_PARTY_DAY_DEFINITION } });
  assert.equal(c1.ok, true, c1.errors.join('；'));
  assert.deepEqual(c1.definitionPlan.templateIds, ['theme-party-day']);
  assert.deepEqual(c1.definitionPlan.sopScenarioIds, [THEME_PARTY_DAY_DEFINITION.sopScenarioId]);
  assert.equal(c1.warnings.length, 0);

  // ② 产物必须是纯数据（不含函数）——防「编排产物悄悄变成可执行体」
  const walkFns = (v) => (typeof v === 'function'
    ? 1
    : Array.isArray(v) ? v.reduce((n, x) => n + walkFns(x), 0)
      : v && typeof v === 'object' ? Object.values(v).reduce((n, x) => n + walkFns(x), 0) : 0);
  assert.equal(walkFns(c1.definitionPlan), 0, 'definitionPlan 不得含函数');

  // ③ 无既有模板的块 ⇒ **warning 而非 error**（真实现状：`taskforce` 没有同名 definition）
  const c2 = compilePlan(composePlan(['taskforce']).plan, { definitionsById: {} });
  assert.equal(c2.ok, true, '无模板不是错误');
  assert.deepEqual(c2.definitionPlan.templateIds, [null]);
  assert.match(c2.warnings.join('｜'), /无既有 definition 模板/);

  // ④ 空 plan ⇒ 报错（防「拿空产物冒充编译成功」）
  assert.equal(compilePlan(null).ok, false);

  // ⑤ 作用域过滤真收窄（防「可拖范围」形同虚设）：秘书处作用域含主题党日块，一个不存在的作用域为空
  assert.ok(blocksForScope('workspace:secretary').some((m) => m.blockId === 'theme-party-day'));
  assert.deepEqual(blocksForScope('workspace:__not_exist__'), []);
});
