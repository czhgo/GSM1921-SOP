// server/test/scene-write-sync.test.mjs — P2b 防漂移：写活动场景目录单一源自洽（2026-09-03）
// 校验 core/constants.js 的 SCENARIO_WRITE_IDS/SCENARIO_LABELS：
//   ① 与 ACTIVITY_CLASSIFICATION.subtypes 中文名逐序一致（四子会）；
//   ② 平铺 id 全集 == SCENARIO_LABELS 键集（决策树/日历模板只派生这两者，无第二份手写清单）；
//   ③ 全部写入 id ∈ SCENARIO_TO_CATEGORY（主题党日/四子会归类有效）。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  SCENARIO_WRITE_IDS, SCENARIO_LABELS, ACTIVITY_CLASSIFICATION,
} from '../../docs/src/core/constants.js?v=20260909e';

const root = fileURLToPath(new URL('../..', import.meta.url)); // 仓库根

// SCENARIO_TO_CATEGORY 为模块内私有常量（非导出），文本求值其纯字面量
function grabScenarioToCategory() {
  const src = readFileSync(`${root}docs/src/core/constants.js`, 'utf8');
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
