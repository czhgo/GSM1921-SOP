// role: [工程师]+[AI]
// table-type-scale-guard.test.mjs — 数据表字号「单档 13px」静态守卫（2026-10-19 支书裁定回退）
//
// 背景：P7（`page-sweep.test.mjs`）在真机量测 `.data-table th/td` 的渲染字号须为 13px。
//   此前表头走 `var(--text-sm)`（12px）、首列走 `0.875rem`（14px），靠「字重 / 颜色承担强调」的
//   说法掩盖了字号离档；支书 2026-10-19 裁定回退：**表头与首列同为 13px 单档，不再改字号**。
//   本守卫锁住静态声明，防止后续批次又把字号改回两档（真机 P7 一旦放宽就看不出来）。
//   同时锁住 `page-sweep.test.mjs` 的 `cellPx: 13`——防止有人改判据（放宽真机尺规）让普查转绿。
//
// 运行：node --test server/test/table-type-scale-guard.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const HERE = import.meta.dirname;
const ROOT = join(HERE, '..', '..');
const STYLES = join(ROOT, 'docs', 'src', 'styles.css');
const PAGE_SWEEP = join(HERE, 'page-sweep.test.mjs');

/** 抽取 CSS 中某选择器的声明体（只认行首起笔的选择器，避免命中注释里的同名文字） */
function ruleBodies(css, selector) {
  const esc = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`(?:^|\\n)\\s*${esc}\\s*\\{([\\s\\S]*?)\\}`, 'g');
  return [...css.matchAll(re)].map((m) => m[1]);
}

test('自称非空转：规则抽取正则能命中目标规则、且不误命中邻近规则', () => {
  const sample = `
/* .data-table thead th 注释里的同名文字不应命中 */
.data-table thead th {
  font-size: 0.8125rem;
  font-weight: 600;
}
.data-table tbody td {
  font-size: 0.8125rem;
}
.data-table tbody td:first-child {
  font-size: 0.8125rem;
  font-weight: 500;
}`;
  const heads = ruleBodies(sample, '.data-table thead th');
  assert.equal(heads.length, 1, '内存样本：表头规则应恰好命中 1 次');
  assert.match(heads[0], /font-size:\s*0\.8125rem/, '内存样本：表头规则应命中 13px 声明');
  const tds = ruleBodies(sample, '.data-table tbody td');
  assert.equal(tds.length, 1, '内存样本：`.data-table tbody td` 不应把 `td:first-child` 一并吞入');
  const firsts = ruleBodies(sample, '.data-table tbody td:first-child');
  assert.equal(firsts.length, 1, '内存样本：首列规则应恰好命中 1 次');
  assert.match(firsts[0], /font-size:\s*0\.8125rem/, '内存样本：首列规则应命中 13px 声明');
});

test('P7 表头：`.data-table thead th` 为 0.8125rem 单档，不含 var(--text-sm) / 0.75rem', () => {
  const css = readFileSync(STYLES, 'utf8');
  const bodies = ruleBodies(css, '.data-table thead th');
  assert.equal(bodies.length, 1, `styles.css 中 \`.data-table thead th\` 规则应恰好 1 条（实得 ${bodies.length}）`);
  const body = bodies[0];
  assert.match(body, /font-size:\s*0\.8125rem/, '表头字号须为 0.8125rem（13px 单档）');
  assert.doesNotMatch(body, /var\(--text-sm\)/, '表头不得再走 var(--text-sm)（12px，离档）');
  assert.doesNotMatch(body, /0\.75rem/, '表头不得出现 0.75rem（12px，离档）');
  assert.match(body, /font-weight:\s*600/, '表头强调应继续由字重 600 承担');
});

test('P7 首列：`.data-table tbody td:first-child` 为 0.8125rem 单档，不含 0.875rem', () => {
  const css = readFileSync(STYLES, 'utf8');
  const bodies = ruleBodies(css, '.data-table tbody td:first-child');
  assert.equal(bodies.length, 1, `styles.css 中 \`.data-table tbody td:first-child\` 规则应恰好 1 条（实得 ${bodies.length}）`);
  const body = bodies[0];
  assert.match(body, /font-size:\s*0\.8125rem/, '首列字号须为 0.8125rem（13px 单档）');
  assert.doesNotMatch(body, /0\.875rem/, '首列不得出现 0.875rem（14px，离档）');
  assert.match(body, /font-weight:\s*500/, '首列强调应继续由字重 500 承担');
});

test('P7 真机判据不放宽：page-sweep.test.mjs 仍为 cellPx: 13', () => {
  const src = readFileSync(PAGE_SWEEP, 'utf8');
  assert.match(src, /cellPx:\s*13\b/, 'page-sweep 的 DECK.cellPx 须保持 13——不得靠放宽判据转绿');
});
