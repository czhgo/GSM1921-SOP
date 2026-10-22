// role: [工程师]+[AI]
// ui-motion-guard.test.mjs — 卡片悬停动效 ＋ transition-all 收敛守卫（2026-10-22 · 第九轮 Task 6）
//
// 来源：9B 视觉与可访问 P2 两条——
//   ① 卡片悬停**不得**上浮 / 加阴影（`hover:shadow-*` / `hover:-translate-y-*`）：
//      阴影与位移会让列表行看起来像按钮，且过渡阴影/几何属性会触发布局与重绘；
//      可点卡的反馈只保留 `border-color` / `background` 变化（`DESIGN_SYSTEM §4.2`）。
//   ② `transition-all` 收敛为显式属性（`transition-colors` / `transition-[filter]` /
//      `transition-[border-color,background-color]`）：`all` 会把宽高、阴影一并过渡，
//      列表悬停时出现「整卡抽动」。全仓 27 处已逐一改为显式属性。
//
// 判据（棘轮：只降不升）：
//   M1 `docs/**` 的 .js / .html 中 `hover:shadow-*` / `hover:-translate-*` 计数 ≤ 0；
//   M2 `docs/**` 中 `transition-all` 计数 ≤ 0；
//   M3 非空转：扫描面确实覆盖到页面源码，且显式过渡类仍大量存在（防正则写坏后恒绿）。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = join(import.meta.dirname, '..', '..');
const DOCS = join(ROOT, 'docs');
/** 第三方 vendor 与二进制资源不属页面源码，不参与统计 */
const SKIP_DIRS = new Set(['vendor', 'fonts', 'images']);

/** 递归收集 docs 下的 .js / .html（跳过 assets/vendor、assets/fonts、assets/images） */
function walk(dir, out = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) {
      if (SKIP_DIRS.has(e.name)) continue;
      walk(p, out);
      continue;
    }
    if (e.name.endsWith('.js') || e.name.endsWith('.html')) out.push(p);
  }
  return out;
}

const FILES = walk(DOCS);

/** 收集命中行（相对路径:行号），供台账打印 */
function hits(re) {
  const found = [];
  for (const f of FILES) {
    const src = readFileSync(f, 'utf8');
    src.split('\n').forEach((line, idx) => {
      if (re.test(line)) {
        found.push(`${relative(ROOT, f).replace(/\\/g, '/')}:${idx + 1} ${line.trim().slice(0, 110)}`);
      }
    });
  }
  return found;
}

/** M1 棘轮基线：2026-10-22 Task 6 收敛后实测 0（只许降，不许升） */
const HOVER_ELEVATION_BASELINE = 0;
/** M2 棘轮基线：2026-10-22 Task 6 收敛后实测 0（原 27 处已全部改为显式属性） */
const TRANSITION_ALL_BASELINE = 0;

test('M1 卡片悬停不得上浮 / 加阴影：hover:shadow-* 与 hover:-translate-* 为零', () => {
  const found = hits(/hover:shadow-|hover:-translate-[xy]-/);
  console.log(`[ui-motion-guard] 卡片悬停阴影 / 上浮共 ${found.length} 处（棘轮上限 ${HOVER_ELEVATION_BASELINE}）：\n${found.join('\n')}`);
  assert.ok(
    found.length <= HOVER_ELEVATION_BASELINE,
    `卡片悬停阴影 / 上浮由 ${HOVER_ELEVATION_BASELINE} 升到 ${found.length} 处 ⇒ 可点卡只保留 border-color / background 变化：\n  ${found.join('\n  ')}`,
  );
});

test('M2 transition-all 只降不升（列表悬停不得过渡宽高 / 阴影）', () => {
  const found = hits(/transition-all/);
  console.log(`[ui-motion-guard] transition-all 共 ${found.length} 处（棘轮上限 ${TRANSITION_ALL_BASELINE}）：\n${found.join('\n')}`);
  assert.ok(
    found.length <= TRANSITION_ALL_BASELINE,
    `transition-all 由 ${TRANSITION_ALL_BASELINE} 升到 ${found.length} 处 ⇒ 改用 transition-colors / transition-[filter] / transition-[border-color,background-color]：\n  ${found.join('\n  ')}`,
  );
});

test('M3 非空转：扫描面覆盖页面源码，且显式过渡类仍存在', () => {
  assert.ok(FILES.length >= 150, `只扫描到 ${FILES.length} 个页面源码文件（下限 150）：遍历面被写坏`);
  const explicit = FILES.reduce((n, f) => n + (readFileSync(f, 'utf8').match(/transition-(colors|\[)/g) || []).length, 0);
  assert.ok(explicit >= 20, `显式过渡类只统计到 ${explicit} 处（下限 20）：正则失配会导致守卫恒绿`);
});
