// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  server/test/branch-resolve-single-source-guard.test.mjs —— 支部解析单源守卫（T15 · 2026-11-15）
// ════════════════════════════════════════════════════════════════
// 由来：`.trae/specs/close-six-dim-gaps/spec.md`「事实源守卫」＋ tasks.md T15；设计见
//   `content/04_web_design/evolution/ARCHITECTURE_EVOLUTION.md §10.6–10.9`（步 5：派生单源守卫常驻）。
//
// 病灶：支部解析曾有两套判据＋散落的 `|| DEFAULT_BRANCH` / `|| DEFAULT_BRANCH_ID` 回落，
//   新增一处回落就多一条「缺字段即归 br-b1」的失败开放点（§10.7-2）。
// 判据：
//   R1 `server/routes/**/*.js` 里每文件的 `|| DEFAULT_BRANCH(_ID)` 处数必须等于基线；
//      **新增一处即红**（解析只经 `branch-scope.js::resolveRowBranchId` / `resolveBranchIdForActor`）；
//      删掉存量须同批下调基线（只减不增；基线文件不得留白条目）。
//   R2 单源可审计：`branch-scope.js` 仍导出两条解析函数，历史兼容白名单每条都有 reason 常量；
//      白名单只对「解析不出且已登记」的域放行（未登记域返回 null 的判据以源码文本核对）。
//   R3 非空转：扫描面有规模；内存样本中的新增回落必须判红、注释行不判。
//
// 覆盖边界（如实标注）：只扫 `server/routes/**`（页面侧 `docs/**` 不在本守卫；docs 侧按 §10.9 逐文件另批）；
//   只认字面回落，不判定业务语义是否正确。
// 运行：`node --test server/test/branch-resolve-single-source-guard.test.mjs`（纯 node）
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import {
  LEGACY_DEFAULT_BRANCH_FALLBACK, resolveBranchIdForActor, resolveRowBranchId,
} from '../routes/resources/branch-scope.js';

const ROOT = join(import.meta.dirname, '..', '..');
const ROUTES = join(ROOT, 'server', 'routes');
const FALLBACK = /\|\|\s*DEFAULT_BRANCH(_ID)?\b/;

/**
 * 存量基线（T13 · 2026-11-15 实测值；只减不增）。
 * 语义：该文件「缺字段回落缺省支部」的处数。修一处就同批减一；新增处数必须先改成
 *   `branch-scope.js` 的解析入口，不得直接写 `|| DEFAULT_BRANCH`。
 */
export const BRANCH_FALLBACK_BASELINE = Object.freeze({
  'server/routes/branch-roster.js': 2,
  'server/routes/committee.js': 12,
  'server/routes/iaaa.js': 2,
  'server/routes/leader-progress.js': 1,
  'server/routes/member.js': 2,
  'server/routes/resources/approval-gates.js': 1,
  'server/routes/resources/branch-scope.js': 7,
  'server/routes/resources/gates.js': 6,
  'server/routes/resources/index.js': 18,
  'server/routes/resources/semantic-routes.js': 9,
  'server/routes/resources/signup-write-guard.js': 1,
  'server/routes/resources/workgroup-routes.js': 24,
});

/** 扫描面：`server/routes/**` 全部 `.js`（递归；跳过 node_modules 与测试目录） */
function collectRouteFiles(dir = ROUTES, out = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      if (name === 'node_modules' || name === 'test') continue;
      collectRouteFiles(full, out);
    } else if (name.endsWith('.js')) {
      out.push(full);
    }
  }
  return out;
}

/**
 * 单文件判据（纯函数，守卫与自检共用）：逐行计回落处数；整行注释与块注释不判
 *   （说明性文字可保留）。返回 `{ count, lines }`，行号用于报红定位。
 */
export function fallbackHits(text) {
  const lines = [];
  let inBlock = false;
  text.split(/\r?\n/).forEach((raw, i) => {
    const t = raw.trim();
    if (inBlock) { if (t.includes('*/')) inBlock = false; return; }
    if (t.startsWith('//')) return;
    if (t.startsWith('/*')) { if (!t.includes('*/')) inBlock = true; return; }
    if (!FALLBACK.test(raw)) return;
    lines.push({ line: i + 1, text: t });
  });
  return { count: lines.length, lines };
}

/** 扫描全部路由文件 → { rel → count }（只保留有命中的文件） */
export function scanRoutes(files = collectRouteFiles()) {
  const out = {};
  for (const file of files) {
    const rel = relative(ROOT, file).replace(/\\/g, '/');
    const { count } = fallbackHits(readFileSync(file, 'utf8'));
    if (count) out[rel] = count;
  }
  return out;
}

test('R1 server/routes 的 `|| DEFAULT_BRANCH(_ID)` 处数等于基线（新增即红，删存量须同批下调基线）', () => {
  const actual = scanRoutes();
  const grew = Object.entries(actual)
    .filter(([rel, n]) => n > (BRANCH_FALLBACK_BASELINE[rel] ?? 0))
    .map(([rel, n]) => `${rel}: 实测 ${n} 处，基线 ${BRANCH_FALLBACK_BASELINE[rel] ?? 0} 处`);
  assert.deepEqual(grew, [],
    '以下路由新增了「缺字段回落缺省支部」的解析（应改走 branch-scope.js 的解析入口）：\n  ' + grew.join('\n  '));

  const shrank = Object.entries(BRANCH_FALLBACK_BASELINE)
    .filter(([rel, n]) => (actual[rel] ?? 0) < n)
    .map(([rel, n]) => `${rel}: 实测 ${actual[rel] ?? 0} 处，基线 ${n} 处`);
  assert.deepEqual(shrank, [],
    '以下路由的回落已减少：请同批下调 BRANCH_FALLBACK_BASELINE（基线只减不增）：\n  ' + shrank.join('\n  '));
});

test('R2 单源入口与历史兼容白名单可审计（两条解析函数仍导出、每条白名单有 reason）', () => {
  assert.equal(typeof resolveRowBranchId, 'function', 'branch-scope.js 必须导出 resolveRowBranchId（行级唯一入口）');
  assert.equal(typeof resolveBranchIdForActor, 'function', 'branch-scope.js 必须导出 resolveBranchIdForActor（请求级唯一入口）');

  const domains = Object.keys(LEGACY_DEFAULT_BRANCH_FALLBACK);
  assert.ok(domains.length >= 10, `历史兼容白名单只登记 ${domains.length} 域（下限 10）：白名单被清空，N=1 存量行会突然不可见`);
  const badReason = domains.filter((key) => !LEGACY_DEFAULT_BRANCH_FALLBACK[key] || String(LEGACY_DEFAULT_BRANCH_FALLBACK[key]).trim().length < 8);
  assert.deepEqual(badReason, [], `白名单条目缺 reason（守卫审计不可用）：${badReason.join(' / ')}`);

  // 未登记域 fail-closed 的判据落点：回落必须经白名单，不得出现无条件 `|| DEFAULT_BRANCH` 返回值
  const src = readFileSync(join(ROUTES, 'resources', 'branch-scope.js'), 'utf8');
  assert.match(src, /LEGACY_DEFAULT_BRANCH_FALLBACK\[name\]/,
    'branch-scope.js 的缺字段回落必须经 LEGACY_DEFAULT_BRANCH_FALLBACK 判定（不得无条件回落缺省支部）');
  assert.match(src, /export function resolveBranchIdForActor/, '请求级解析入口被改名 / 移走');
});

test('R3 非空转：扫描面有规模，内存样本的新增回落必须判红、注释行不判', () => {
  const files = collectRouteFiles();
  assert.ok(files.length >= 15, `只扫到 ${files.length} 个路由文件（基线 15）：扫描面被改坏`);
  const actual = scanRoutes(files);
  assert.ok(Object.keys(actual).length >= 10, `只有 ${Object.keys(actual).length} 个文件命中基线（基线 10）：判据或扫描面被写坏`);

  const bad = "const branchId = row.branchId || DEFAULT_BRANCH_ID;";
  assert.equal(fallbackHits(bad).count, 1, '注入的回落未被判出 ⇒ 判据恒真');
  const okComments = [
    "// 说明：历史写法 `|| DEFAULT_BRANCH` 已废弃",
    '/* 块注释里的 || DEFAULT_BRANCH_ID 不判 */',
    'const branchId = resolveRowBranchId(db, name, row);',
  ].join('\n');
  assert.equal(fallbackHits(okComments).count, 0, '注释行被误判 ⇒ 判据过严');
  const two = `${bad}\n${bad}`;
  assert.equal(fallbackHits(two).count, 2, '多处回落未逐处计数');
});
