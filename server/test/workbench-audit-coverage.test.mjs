// role: [工程师]+[AI]
// workbench-audit-coverage.test.mjs — 工作台页签覆盖（批次 526 改用新口径）
//
// 历史沿革：2026-10-18 脏专项用 67 页签台账做覆盖率断言；2026-11-02 支书裁定
//   「直接改用新口径」——旧 67 台账归档为历史文件，不再断言其内容；
//   现行覆盖以 `server/scripts/audit/catalog.mjs`（45 页签）＋ `endpoint-map.mjs` 为唯一口径。
//
// 判据：
//   W1 catalog 45 项，键集合 ≡ `TAB_BLOCK_BASELINE`（catalog 自带完整性断言）
//   W2 每个页签有真实源码入口（文件存在）
//   W3 每个页签至少 1 个读口；写口必须有 gate；destructive 必须写 reason
//   W4 反例：缺页签 / 空 source / 无 gate 的写口必须被同一口径判红
//   W5 旧 67 台账仅作档案存在（不再校验内容）
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { TAB_CATALOG, CATALOG_SIZE, assertCatalogIntegrity } from '../scripts/audit/catalog.mjs';
import { ENDPOINT_MAP } from '../scripts/audit/endpoint-map.mjs';
import { TAB_BLOCK_BASELINE } from './style-baseline.mjs';

const ROOT = join(import.meta.dirname, '..', '..');

// 页签审计工具的 URL 规则：必须跟随站内页面单一源 `docs/src/core/base/page-url.js`（D-866 URL B）。
const HARNESS_SRC = readFileSync(join(ROOT, 'server', 'scripts', 'audit', 'harness.mjs'), 'utf8');
const AUDIT_TABS_SRC = readFileSync(join(ROOT, 'server', 'scripts', 'audit-tabs.mjs'), 'utf8');

/** 缺陷扫描（纯函数，供正例与反例共用） */
function findDefects(catalog, endpoints) {
  const issues = [];
  for (const item of catalog) {
    if (!item.source || !existsSync(join(ROOT, item.source))) issues.push(`${item.key} 源码入口不存在`);
    const ep = endpoints[item.key];
    if (!ep) { issues.push(`${item.key} 缺 ENDPOINT_MAP`); continue; }
    if (!Array.isArray(ep.read) || ep.read.length === 0) issues.push(`${item.key} 无读口`);
    for (const w of ep.write || []) {
      if (!w.gate) issues.push(`${item.key} 写口 ${w.method} ${w.path} 缺 gate`);
      if (w.destructive && !w.reason) issues.push(`${item.key} destructive ${w.path} 缺 reason`);
    }
  }
  return issues;
}

test('W1 catalog 45 项，键集合与 TAB_BLOCK_BASELINE 一致', () => {
  assertCatalogIntegrity();
  assert.equal(TAB_CATALOG.length, CATALOG_SIZE);
  const keys = TAB_CATALOG.map((item) => item.key).sort();
  const baseline = Object.keys(TAB_BLOCK_BASELINE).sort();
  assert.deepEqual(keys, baseline);
});

test('W2/W3 每页签有源码入口、至少 1 读口，写口有 gate、破坏性有 reason', () => {
  assert.deepEqual(findDefects(TAB_CATALOG, ENDPOINT_MAP), []);
});

test('W4 反例：缺页签 / 空 source / 写口无 gate 会被同一口径判红', () => {
  const badCatalog = [{ key: 'x.y', source: 'docs/src/does-not-exist.js' }];
  const badEndpoints = { 'x.y': { read: [], write: [{ method: 'POST', path: '/api/v1/x' }] } };
  const defects = findDefects(badCatalog, badEndpoints);
  assert.ok(defects.some((msg) => msg.includes('源码入口不存在')));
  assert.ok(defects.some((msg) => msg.includes('无读口')));
  assert.ok(defects.some((msg) => msg.includes('缺 gate')));
});

test('W5 旧 67 台账仅作档案存在，不再作为现行口径', () => {
  const archived = join(ROOT, '.ctx', 'logs', 'archive', '2026-10', 'WORKBENCH_67_TAB_AUDIT_DRAFT.md');
  assert.ok(existsSync(archived), '历史台账应保留在归档目录');
  const text = readFileSync(archived, 'utf8');
  assert.match(text, /角色与页签/, '历史台账内容保持原样（只读档案）');
});

test('W6 audit-tabs 的页面 URL 跟随 canonical 单一源（page-url.js），不再硬编码 .html', () => {
  // ① harness 必须从单一源取后缀规则，并经 `pageHref()` 派生页面路径
  assert.match(HARNESS_SRC, /import\s*\{[^}]*pageHref[^}]*\}\s*from\s*['"][^'"]*core\/base\/page-url\.js['"]/,
    'harness 必须 import page-url.js 的 pageHref（不得另写后缀规则）');
  assert.match(HARNESS_SRC, /pageHref\(/, 'harness 的页面路径须经 pageHref() 派生');
  assert.match(HARNESS_SRC, /waitForURL\(workspaceGlob/, '登录期望 URL 须由 workspacePagePath() 派生的 glob 决定');
  assert.match(HARNESS_SRC, /const url = workspaceTabUrl\(base, role, tab\)/, 'openTab 须经 workspaceTabUrl() 拼深链');
  // ② 反例防线：不得再出现把 `.html` 直接拼进 URL 的写法
  assert.doesNotMatch(HARNESS_SRC, /\$\{base\}\/workspace\/\$\{role\}\.html/,
    'harness 仍硬编码 workspace/<role>.html（批次 543 去后缀后会再次全部超时）');
  assert.doesNotMatch(AUDIT_TABS_SRC, /\$\{base\}\/workspace\/\$\{role\}\.html/,
    'audit-tabs 仍硬编码 workspace/<role>.html');
  // ③ 登录失败必须 fail-loud：中止审计且退出码 2，不得折算成每页签 F0
  assert.match(AUDIT_TABS_SRC, /class LoginAbort extends Error/, '缺少登录失败中止类型');
  assert.match(AUDIT_TABS_SRC, /return aborted \? 2 : 0/, '登录失败必须以退出码 2 结束');
  assert.doesNotMatch(AUDIT_TABS_SRC, /登录失败，页签无法审计/, '登录失败不得写成每页签 F0/P0 结论');
});

/**
 * W7 D2 处置完整性（2026-11-23 批次 605 · `B-605-1`）：
 *   每个页签必须二选一——① 至少 1 条行计数对账规则（`count`，`ui` ＋ `collection` ＋ 端点/集合）；
 *   ② 写明不登记的行计数理由（`countSkip`，非空）。空 `count` 且无理由＝该页签从未被 D2 检查过，
 *   而报告里不会出现任何行——这是「看起来全绿、其实没查」的假绿。
 *   结构判据：`mode: 'total'` 必须给 `countSelector`（分页「共 N」不能靠数当页行）；
 *   规则数只增不减（当前基线 5，新增规则须同批上调基线）。
 *   反例自证：删掉一条 `countSkip`、删掉规则里的 `collection` 都必须判红。
 */
const D2_RULE_BASELINE = 5;
function d2DispositionIssues(endpoints) {
  const issues = [];
  for (const [key, ep] of Object.entries(endpoints)) {
    const rules = Array.isArray(ep.count) ? ep.count : [];
    const skip = String(ep.countSkip || '').trim();
    if (!rules.length && !skip) issues.push(`${key} 既无 D2 规则也无 countSkip 理由`);
    for (const rule of rules) {
      if (!rule.ui) issues.push(`${key} 的 D2 规则缺 ui`);
      if (!rule.collection) issues.push(`${key} 的 D2 规则缺 collection`);
      if (rule.mode === 'total' && !rule.countSelector) issues.push(`${key} 的 total 规则缺 countSelector`);
    }
  }
  return issues;
}

test('W7 D2 处置完整：每页签有对账规则或写明不登记理由；total 规则带 countSelector；规则数不减', () => {
  assert.deepEqual(d2DispositionIssues(ENDPOINT_MAP), [], `D2 处置不完整：\n  ${d2DispositionIssues(ENDPOINT_MAP).join('\n  ')}`);
  const withRules = Object.values(ENDPOINT_MAP).filter((ep) => (ep.count || []).length > 0).length;
  assert.ok(withRules >= D2_RULE_BASELINE,
    `有 D2 规则的页签由 ${D2_RULE_BASELINE} 降到 ${withRules}：删规则须同批下调基线并写明理由`);
  // 反例自证：删理由 / 删 collection 都必须判红
  const brokenSkip = structuredClone(ENDPOINT_MAP);
  const skipKey = Object.keys(brokenSkip).find((k) => (brokenSkip[k].count || []).length === 0 && brokenSkip[k].countSkip);
  delete brokenSkip[skipKey].countSkip;
  assert.ok(d2DispositionIssues(brokenSkip).some((s) => s.startsWith(skipKey)), 'W7 反例失效：删掉 countSkip 未判红');
  const brokenRule = structuredClone(ENDPOINT_MAP);
  const ruleKey = Object.keys(brokenRule).find((k) => (brokenRule[k].count || []).length > 0);
  delete brokenRule[ruleKey].count[0].collection;
  assert.ok(d2DispositionIssues(brokenRule).some((s) => s.startsWith(ruleKey)), 'W7 反例失效：删掉 collection 未判红');
});
