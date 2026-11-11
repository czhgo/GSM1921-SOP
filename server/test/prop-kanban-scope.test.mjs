// role: [工程师]+[AI]
// prop-kanban-scope.test.mjs — 宣传台看板闭环权守卫（本批 P0-4）
//
// 职责母本：宣传委员只归档材料，不闭环活动。活动结束权归组织者 / 支书；
// 专班收尾归组织委员。本守卫锁住「看板不得出现确认完成按钮 / 不得直写 completed」。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const FILE = join(ROOT, 'docs', 'src', 'entries', 'tabs', 'prop', 'kanban-tab.js');

test('P0-4 宣传台看板只读：不得闭环活动', () => {
  const src = readFileSync(FILE, 'utf8');
  assert.doesNotMatch(src, /activity-complete-btn/, '宣传台不得再有「确认完成」按钮');
  assert.doesNotMatch(src, /status\s*=\s*['"]completed['"]/, '宣传台不得直接写活动状态 completed');
  assert.match(src, /收尾由组织委员办理/, '专班收尾提示仍须在位（只读指引）');
});