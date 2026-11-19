// role: [工程师]+[AI]
// single-fact-consistency.test.mjs — 同一事实跨文件单一值（2026-11-19 批次 572 · G1）
//
// 病灶：矩阵 162 在台账里一致、`server/README.md` 却写 141；四层名称一处写 weekly、一处写 full；
//   党委台页签一处 4、一处 5 ⇒ 新会话任取一处都会得出不同结论（支书：不要挤牙膏、要能收敛）。
// 判据：这些「单值事实」必须同时等于代码实测值；改任一处不跑代码即红。
// 反例自证：同一比较函数喂入被篡改的计数，必须报出 mismatch（防写成恒真）。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { WRITE_POLICY_MATRIX } from '../security/write-policy-matrix.mjs';
import { RESOURCE_TABLES, SEMANTIC_TABLES, WORKGROUP_TABLES } from '../data/domain-contract.mjs';
import { TIERS } from '../test-tier-registry.mjs';
import { CATALOG_SIZE, TAB_CATALOG } from '../scripts/audit/catalog.mjs';

const ROOT = join(import.meta.dirname, '..', '..');
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');

const FACTS = Object.freeze({
  matrix: WRITE_POLICY_MATRIX.length,
  tables: RESOURCE_TABLES.length + SEMANTIC_TABLES.length + WORKGROUP_TABLES.length,
  tabs: CATALOG_SIZE,
  pcTabs: TAB_CATALOG.filter((item) => String(item.key).startsWith('party-committee.')).length,
  whitelist: readdirSync(join(ROOT, '.ctx')).length,
});

/** 纯比较：返回不一致清单（空数组＝一致）。便于反例自证。 */
export function factMismatches(facts = FACTS) {
  const active = read('.ctx/ACTIVE_CONTEXT.md');
  const rulings = read('.ctx/ACTIVE_RULINGS.md');
  const assessment = read('.ctx/ENGINEERING_ASSESSMENT.md');
  const serverReadme = read('README-server.md');
  const claude = read('CLAUDE.md');

  const out = [];
  const need = (file, text, token, label) => {
    if (!text.includes(String(token))) out.push(`${file} 缺 ${label}=${token}`);
  };
  need('.ctx/ACTIVE_CONTEXT.md', active, facts.matrix, '矩阵条数');
  need('.ctx/ACTIVE_RULINGS.md', rulings, facts.matrix, '矩阵条数');
  need('.ctx/ENGINEERING_ASSESSMENT.md', assessment, facts.matrix, '矩阵条数');
  need('server/README.md', serverReadme, facts.matrix, '矩阵条数');

  need('.ctx/ACTIVE_CONTEXT.md', active, `${facts.tables} 张`, '表数');
  need('.ctx/ACTIVE_RULINGS.md', rulings, `${facts.tables} 表`, '表数');

  need('README-server.md', serverReadme, `共 ${facts.tabs} 个`, '页签数');
  need('.ctx/ACTIVE_CONTEXT.md', active, `${facts.tabs} 页签`, '页签数');

  need('.ctx/ACTIVE_CONTEXT.md', active, `党委台 ${facts.pcTabs} 页签`, '党委台页签数');

  need('CLAUDE.md', claude, `白名单 **${facts.whitelist} 项**`, '白名单项数');
  need('.ctx/AGENTS.md', read('.ctx/AGENTS.md'), `白名单 ${facts.whitelist} 项`, '白名单项数');

  for (const tier of TIERS) need('CLAUDE.md', claude, `test:${tier}`, '测试层名');
  if (TIERS.includes('full')) out.push('TIERS 不应包含 full（full 是跨层 runner）');

  return out;
}

test('G1 单值事实：矩阵 / 表数 / 页签 / 党委台页签 / 白名单 / 四层名 处处等于代码', () => {
  assert.deepEqual(factMismatches(), [], '单值事实与代码实测不一致（先改台账，别改代码去凑）');
});

test('G1 反例自证：篡改任一计数必须报 mismatch', () => {
  const forged = { ...FACTS, matrix: FACTS.matrix - 1, tabs: FACTS.tabs - 1, pcTabs: FACTS.pcTabs + 1 };
  const found = factMismatches(forged);
  assert.ok(found.length >= 3, `反例未被拦住，只报 ${found.length} 处：${found.join(' / ')}`);
});
