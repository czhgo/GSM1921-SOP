// 宣传台「归档活动」动作撤除（2026-10-21 批次 498 · 支书裁定）：
//   宣传委员归档**材料**；活动归档是活动生命周期动作，归支书 / 本场组织者。
//   本判据钉两件事：① 宣传台不再出现第二个活动归档写口；② 支书 / 组织者侧能力保留（不是全局删能力）。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const SRC = join(HERE, '..', '..', 'docs', 'src');
const read = (rel) => readFileSync(join(SRC, rel), 'utf8');

test('宣传台档案归档：不再提供「归档活动」按钮与写链', () => {
  const src = read('entries/tabs/prop/archive-tab.js');
  assert.doesNotMatch(src, /archive-activity-btn/, '不得保留归档活动按钮');
  assert.doesNotMatch(src, /archiveActivity\(/, '不得直接调用归档活动写口');
  assert.match(src, /活动归档由支书或本场组织者办理/, '只读区须写明归档归属');
});

test('活动归档能力仍在支书 / 组织者侧（撤的是第二写口，不是能力）', () => {
  assert.match(read('entries/tabs/secretary/todo-tab.js'), /archiveActivity\(/, '支书台代归档保留');
  assert.match(read('components/record/inspector.js'), /archiveActivity\(/, '活动详情侧归档保留');
});
