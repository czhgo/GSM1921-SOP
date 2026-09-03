// server/test/vote-option-sync.test.mjs — P1a 防漂移：server OPTION_ENUMS 键集 == 前端 vote-config OPTION_SETS options
// 2026-09-03 建立：跨层表决枚举若两侧漂移（增删选项/改 optionSet 名），测试即红，须同步两端。
// 前端为业务单一源（含 label/labels/objectRequiresNote），server 仅镜像 options 键集。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { OPTION_ENUMS } from '../routes/committee.js';

const root = fileURLToPath(new URL('../..', import.meta.url)); // 仓库根

// 文本求值前端 OPTION_SETS（纯数据字面量；vote-config.js 顶部 import 不影响本常量求值）
function grabOptionSets() {
  const src = readFileSync(`${root}docs/src/services/vote-config.js`, 'utf8');
  const m = /export const OPTION_SETS = ([\s\S]*?);\s*(?:export|$)/m.exec(src);
  assert.ok(m, 'vote-config.js 未找到 export const OPTION_SETS');
  return new Function(`return (${m[1]})`)();
}

test('server OPTION_ENUMS 与前端 vote-config OPTION_SETS 键集双向一致', () => {
  const optionSets = grabOptionSets();

  const serverKeys = Object.keys(OPTION_ENUMS).sort();
  const frontKeys = Object.keys(optionSets).sort();
  assert.deepEqual(serverKeys, frontKeys, 'optionSet 名集合两端不一致（新增/删除表决模式需同步）');

  for (const key of frontKeys) {
    assert.deepEqual(
      [...OPTION_ENUMS[key]].sort(),
      [...optionSets[key].options].sort(),
      `optionSet「${key}」的选项键集两端不一致`,
    );
  }

  // 「异议须附言」仅 deliberative 适用（server committee.js 硬规则；前端 objectRequiresNote 镜像）
  assert.equal(optionSets.deliberative.objectRequiresNote, true, 'deliberative 应要求 object 附言');
  assert.equal(optionSets.formal.objectRequiresNote, false, 'formal 附言应选填');
  assert.ok(optionSets.deliberative.options.includes('object'), 'deliberative 应含 object');
  assert.ok(!optionSets.formal.options.includes('object'), 'formal 不应含 object（无必附言）');
});
