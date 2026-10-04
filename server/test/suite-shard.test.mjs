// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  server/test/suite-shard.test.mjs — 「分片不得漏掉任何 e2e」守卫（2026-10-03 批次 360 · `D-753`）
//
//  病根（本机制**唯一**的失守面）：`D-753` 的「择其精要」落成**分片轮跑**（单次 ≤10 分钟、判据面一条不删）。
//  分片表是人手维护的（`test/sweep-shard.mjs`）⇒ **新增一个 e2e 测试文件而忘了归片**时，
//  「全量档」与「分片档」都会静默漏掉它 —— 比红更坏（全绿却无证据）。
//  本守卫把这条钉死：**分片池的应有全集 ≡ 磁盘上全部 e2e 文件**，且四片互不重叠、片内不重复。
//
//  判据（`G1`–`G4`）：
//    · `G1` 全集相等：`ALWAYS_E2E ∪ 四片登记值` ≡ `discoverTestFiles().e2e`（逐项相等，双向）。
//    · `G2` 片内文件真实存在且**确实是 e2e**（防「登记了一个非 e2e 文件 ⇒ 它被从非 e2e 池里偷走」）。
//    · `G3` 无重叠：同一文件不得出现在两片（重复＝白跑一遍、也说明归片口径二义）。
//    · `G4` 非空转：片数 ≥2、每片非空、`SHARD_PAGES` 的取值域必须与「真机流程里出现过的 page 集合」一致
//      （页名写错会被 `form-loop-sweep::S7` 判红；这里再从**分片侧**核一遍，两处都拦）。
// ════════════════════════════════════════════════════════════════
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { MACHINE_FLOWS, SUCCESS_FLOWS } from './form-loop-registry.mjs';
import {
  SHARD_COUNT, SHARD_PAGES, SHARD_E2E_FILES, ALWAYS_E2E, discoverTestFiles, shardBaselineFiles,
} from './sweep-shard.mjs';

const TEST_DIR = join(import.meta.dirname);

test('G1 分片池的应有全集 ≡ 磁盘上全部 e2e 文件（新增 e2e 未归片即红灯）', () => {
  const { e2e } = discoverTestFiles(TEST_DIR);
  const declared = shardBaselineFiles();
  assert.ok(e2e.length >= 20, `只扫到 ${e2e.length} 个 e2e 文件（下限 20）：发现口径失效，断言可能恒真`);
  const notDeclared = e2e.filter((f) => !declared.includes(f));
  assert.deepEqual(notDeclared, [], `以下 e2e 测试文件**没有归入任何分片**（全量/分片两档都会静默漏掉它，请加进 test/sweep-shard.mjs 的 SHARD_E2E_FILES）：\n  ${notDeclared.join('\n  ')}`);
  const ghost = declared.filter((f) => !e2e.includes(f));
  assert.deepEqual(ghost, [], `以下分片登记项在磁盘上找不到、或**已不再是 e2e**（僵尸登记，请从 SHARD_E2E_FILES 移除）：\n  ${ghost.join('\n  ')}`);
});

test('G2 片内文件真实存在且确实是 e2e', () => {
  const { e2e } = discoverTestFiles(TEST_DIR);
  const bad = [];
  for (let k = 1; k <= SHARD_COUNT; k++) {
    for (const f of (SHARD_E2E_FILES[k] || [])) if (!e2e.includes(f)) bad.push(`分片 ${k}: ${f}`);
  }
  assert.deepEqual(bad, [], `以下登记项不存在或不是 e2e（会让该片少跑 / 错跑）：\n  ${bad.join('\n  ')}`);
});

test('G3 分片互不重叠（同一文件只许出现在一片）', () => {
  const seen = new Map();
  const dup = [];
  for (let k = 1; k <= SHARD_COUNT; k++) {
    for (const f of (SHARD_E2E_FILES[k] || [])) {
      if (seen.has(f)) dup.push(`${f}：分片 ${seen.get(f)} 与分片 ${k}`);
      else seen.set(f, k);
    }
  }
  assert.deepEqual(dup, [], `以下文件被登记在两片里（会重复跑同一件事，且归片口径二义）：\n  ${dup.join('\n  ')}`);
});

test('G4 非空转：片数 ≥2、每片非空、SHARD_PAGES 取值域 ≡ 真机流程里出现过的 page', () => {
  assert.ok(SHARD_COUNT >= 2, `片数 ${SHARD_COUNT} < 2：分片没有意义`);
  for (let k = 1; k <= SHARD_COUNT; k++) {
    assert.ok((SHARD_E2E_FILES[k] || []).length + ALWAYS_E2E.length > 0, `分片 ${k} 一个文件都没登记`);
    assert.ok((SHARD_PAGES[k] || []).length > 0, `分片 ${k} 一个工作台都没登记`);
  }
  // 两处判据同源：真机流程里出现过的 page 集合（`form-loop-sweep::S7` 从「流程侧」核，这里从「分片侧」核）
  const usedPages = new Set([...MACHINE_FLOWS, ...SUCCESS_FLOWS].map((f) => f.page));
  const declaredPages = new Set(Object.values(SHARD_PAGES).flat());
  const missing = [...usedPages].filter((p) => !declaredPages.has(p));
  assert.deepEqual(missing, [], `以下工作台的真机流程**没有任何分片覆盖**（会永远不被跑到）：${missing.join(' / ')}`);
  const extra = [...declaredPages].filter((p) => !usedPages.has(p));
  assert.deepEqual(extra, [], `SHARD_PAGES 里登记了真机流程里从未出现过的工作台名（多半是拼错）：${extra.join(' / ')}`);
});
