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

// ════════════════════════════════════════════════════════════════
//  工作流状态标签单一源（2026-11-19 批次 573 · `D-885` / SOP-B-18）
//  病灶：状态机标签一处写「待支委扩大会讨论 / 已审批」、数据模型另写一套 ⇒ 读者无法判断哪个是现行口径。
//  判据：`definitions.js` 与 `DATA_MODEL.md` 的两枚标签必须同值；旧标签在 docs / content 零命中。
//  反例自证：喂入被篡改的标签必须报 mismatch（防写成恒真）。
// ════════════════════════════════════════════════════════════════
const WORKFLOW_LABEL_PAIRS = Object.freeze([
  ['PENDING_EXPANDED', '待支委会审议'],
  ['APPROVED', '已审议'],
]);
const LEGACY_WORKFLOW_LABELS = Object.freeze(['待支委扩大会讨论', '已审批']);

function _walkFiles(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) _walkFiles(full, out);
    else if (/\.(md|js|mjs|html)$/.test(entry.name)) out.push(full);
  }
  return out;
}

/** 纯比较：返回标签不一致 / 旧标签残留清单（空数组＝通过）。 */
export function workflowLabelMismatches(pairs = WORKFLOW_LABEL_PAIRS, legacy = LEGACY_WORKFLOW_LABELS) {
  const defs = read('docs/src/workflow/definitions.js');
  const model = read('content/04_web_design/data/DATA_MODEL.md');
  const out = [];
  for (const [state, label] of pairs) {
    const defHit = new RegExp(`name: '${state}',\\s*\\n\\s*label: '([^']+)'`).exec(defs);
    if (!defHit) out.push(`definitions.js 缺状态 ${state}`);
    else if (defHit[1] !== label) out.push(`definitions.js ${state} 标签=${defHit[1]}，应为 ${label}`);
    if (!model.includes(`| ${state} | ${label} |`)) out.push(`DATA_MODEL.md 缺 ${state} → ${label}`);
  }
  // 旧标签扫描面＝状态机定义域（workflow）与规范正文（content）；
  // 不扫无关通知文案（如「成员变更已审批通过」是另一件事，不在本判据内）。
  const roots = ['docs/src/workflow', 'content'].map((rel) => join(ROOT, rel));
  for (const root of roots) {
    for (const file of _walkFiles(root)) {
      const text = readFileSync(file, 'utf8');
      for (const old of legacy) {
        if (text.includes(old)) out.push(`${file.slice(ROOT.length + 1)} 仍含旧标签「${old}」`);
      }
    }
  }
  return out;
}

test('G1 工作流状态标签：definitions.js ≡ DATA_MODEL，旧标签在 docs/src 与 content 零命中', () => {
  assert.deepEqual(workflowLabelMismatches(), [], '工作流状态标签多处并存（先改 definitions.js 与 DATA_MODEL）');
});

test('G1 反例自证：篡改工作流标签必须报 mismatch', () => {
  const forged = [['PENDING_EXPANDED', '待支委扩大会讨论']];
  const found = workflowLabelMismatches(forged, ['待支委会审议']);
  assert.ok(found.length >= 2, `反例未被拦住，只报 ${found.length} 处：${found.join(' / ')}`);
});

/**
 * ⑥ 三层对象挂靠只在 OBJECT_MODEL §2.1 定义一次；PARTY_COMMITTEE_DESIGN 只留指针。
 * 病灶（批次 603 台账）：同一句「成员归属 / 业务承办 / 工作组挂靠」在台账、读面、设计稿各写一份，
 *   改一处忘另一处 ⇒ 两套口径。本断言把「定义」与「指针」分开，防回潮。
 */
export function objectModelProblems(model, design) {
  const out = [];
  if (!/### 2\.1 三层判据表/.test(model)) out.push('OBJECT_MODEL 缺 §2.1 三层判据表');
  for (const row of ['组织归属层', '业务层', '执行层']) {
    if (!model.includes(row)) out.push(`三层判据表缺「${row}」行`);
  }
  for (const rule of ['成员归属唯一', '业务承办唯一', '工作组挂靠唯一', '工作组不设指导支委']) {
    if (!model.includes(rule)) out.push(`OBJECT_MODEL 缺规则「${rule}」`);
  }
  if (!/### 2\.7 对象挂靠单一源/.test(design)) out.push('PARTY_COMMITTEE_DESIGN 缺 §2.7 对象挂靠单一源');
  if (!/OBJECT_MODEL_AND_COMMITTEE_FLOW\.md/.test(design)) out.push('PARTY_COMMITTEE_DESIGN §2.7 未指向 OBJECT_MODEL');
  if (design.includes('people.partyGroup 指向一个党小组')) {
    out.push('PARTY_COMMITTEE_DESIGN 复制了「成员归属唯一」全文：应只留指针');
  }
  return out;
}

test('⑥ 三层对象挂靠：定义只在 OBJECT_MODEL §2.1，另一处只留指针', () => {
  const model = read('content/04_web_design/evolution/OBJECT_MODEL_AND_COMMITTEE_FLOW.md');
  const design = read('content/04_web_design/contracts/PARTY_COMMITTEE_DESIGN.md');
  assert.deepEqual(objectModelProblems(model, design), [], `对象挂靠口径有漂移：\n  ${objectModelProblems(model, design).join('\n  ')}`);
  // 反例自证：删掉指针标题 / 复制全文，都必须判红
  assert.ok(objectModelProblems(model, design.replace(/### 2\.7 对象挂靠单一源/, '')).length > 0,
    '反例未判红：删掉 §2.7 指针标题仍通过');
  assert.ok(objectModelProblems(model, design + '\npeople.partyGroup 指向一个党小组').length > 0,
    '反例未判红：复制规则全文仍通过');
});
