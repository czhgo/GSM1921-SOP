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
