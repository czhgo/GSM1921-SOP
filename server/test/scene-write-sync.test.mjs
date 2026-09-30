// server/test/scene-write-sync.test.mjs — P2b 防止未同步的情况：写活动场景目录单一源自洽（2026-09-03）
// 校验 core/domain/constants.js 的 SCENARIO_WRITE_IDS/SCENARIO_LABELS：
//   ① 与 ACTIVITY_CLASSIFICATION.subtypes 中文名逐序一致（四子会）；
//   ② 平铺 id 全集 == SCENARIO_LABELS 键集（决策树/日历模板只派生这两者，无第二份手写清单）；
//   ③ 全部写入 id ∈ SCENARIO_TO_CATEGORY（主题党日/四子会归类有效）；
//   ④（2026-09-29 批次 249）**块目录 ⊇ 写入选项目录**——可写入的场景都必须有工作流块（禁「铺一半」）。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  SCENARIO_WRITE_IDS, SCENARIO_LABELS, ACTIVITY_CLASSIFICATION,
} from '../../docs/src/core/domain/constants.js?v=20260930p';
import { BLOCK_MANIFESTS } from '../../docs/src/workflow/blocks/manifests.js?v=20260930p';

const root = fileURLToPath(new URL('../..', import.meta.url)); // 仓库根

// SCENARIO_TO_CATEGORY 为模块内私有常量（非导出），文本求值其纯字面量
function grabScenarioToCategory() {
  const src = readFileSync(`${root}docs/src/core/domain/constants.js`, 'utf8');
  const m = /const SCENARIO_TO_CATEGORY = ([\s\S]*?);\s*\/\*\*/.exec(src);
  assert.ok(m, 'constants.js 未找到 SCENARIO_TO_CATEGORY');
  return new Function(`return (${m[1]})`)();
}

test('SCENARIO_LABELS 键集 == SCENARIO_WRITE_IDS 平铺 id 全集', () => {
  const ids = Object.values(SCENARIO_WRITE_IDS).flat();
  assert.deepEqual(Object.keys(SCENARIO_LABELS).sort(), ids.sort(), '两目录增删须同步（写入选项目录单一源）');
});

test('四子会中文名与 ACTIVITY_CLASSIFICATION.subtypes 逐序一致', () => {
  const subtypes = ACTIVITY_CLASSIFICATION['three-meetings'].subtypes;
  const order = SCENARIO_WRITE_IDS['three-meetings'];
  assert.equal(subtypes.length, order.length);
  order.forEach((id, i) => {
    assert.equal(SCENARIO_LABELS[id], subtypes[i], `SCENARIO_LABELS[${id}] 应与 subtypes[${i}] 一致`);
  });
  assert.equal(SCENARIO_LABELS['theme-party'], ACTIVITY_CLASSIFICATION['theme-party'].label);
});

test('全部写入 id ∈ SCENARIO_TO_CATEGORY（归类有效）', () => {
  const scenarioToCategory = grabScenarioToCategory();
  const ids = Object.values(SCENARIO_WRITE_IDS).flat();
  ids.forEach((id) => {
    assert.ok(scenarioToCategory[id], `写入场景「${id}」缺 SCENARIO_TO_CATEGORY 归类`);
  });
});

// ════════════════════════════════════════════════════════════════
//  ④ 块目录 ⊇ 写入选项目录（2026-09-29 批次 249）
// ════════════════════════════════════════════════════════════════
//  病灶：L3「同类场景铺开」若**只铺一半**（有写入入口的场景却没有对应工作流块），
//    该场景**永远无法被支部停用 / 排序**，而**没有任何守卫会发现**——与「守卫只守表层」同族。
//    批次 248 手工铺开三会一课四块时正是靠人记得；本项把它变成**机检**。
//  判据（两侧都从单一源实读）：`SCENARIO_WRITE_IDS` 里**每个可写入的场景**都必须有在册块；
//    blockId 与场景 id 的对应＝**同名**，唯一例外是主题党日块（历史 id `theme-party-day`，
//    系契约 §四 原例、不属可改名项）⇒ 列入 `BLOCK_ID_ALIASES` 并写明理由。
/** 唯一允许的「块 id ≠ 场景 id」别名（每条须写理由）——
 *  ⚠ 2026-09-29 批次 274：本表**已上提为单一源**（`manifests.js`），因为运行时门（`gates.js` 的
 *  「支部停用某块」服务端硬执行）读的是**同一份**；留两份就会出现「守卫认、运行时不认」的第二套。 */
import { BLOCK_ID_ALIASES } from '../../docs/src/workflow/blocks/manifests.js?v=20260930p';

/** 纯函数：返回「可写入但没有在册块」的场景清单（便于反例直接调用） */
function _missingBlocks(writeScenarios, blockIds, aliases) {
  return writeScenarios.filter((sc) => !blockIds.has(sc) && !blockIds.has(aliases[sc]));
}

test('块目录 ⊇ 写入选项目录（可写入的场景都必须有工作流块，禁「铺一半」）', () => {
  const blockIds = new Set(BLOCK_MANIFESTS.map((m) => m.blockId));
  const writeScenarios = Object.values(SCENARIO_WRITE_IDS).flat();
  // 非空转：两侧都必须真读到规模（读坏 ⇒ 集合空 ⇒ 什么都不缺 ⇒ 判据恒真）
  assert.ok(blockIds.size >= 2, `只读到 ${blockIds.size} 个在册块（下限 2）：判据或单一源被写坏`);
  assert.ok(writeScenarios.length >= 5, `只读到 ${writeScenarios.length} 个可写入场景（下限 5）`);
  const missing = _missingBlocks(writeScenarios, blockIds, BLOCK_ID_ALIASES);
  assert.deepEqual(missing, [],
    '以下**可写入场景没有在册工作流块**（该场景无法被支部停用 / 排序，且此前无守卫能发现）：\n  '
    + missing.join('\n  ')
    + '\n修法：在 `docs/src/workflow/blocks/manifests.js` 补该场景的块（blockId ＝ 场景 id）；'
    + '若确属历史命名，则在 `BLOCK_ID_ALIASES` 登记并写明理由。');
  // 反例锁死（证明判据不是恒真）：造一个没有块的场景必须被检出
  assert.deepEqual(_missingBlocks([...writeScenarios, 'ghost-scenario'], blockIds, BLOCK_ID_ALIASES),
    ['ghost-scenario'], '反例：没有在册块的场景必须被报出（否则判据恒真、等于没检）');
});
