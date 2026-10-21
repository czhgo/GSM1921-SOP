// role: [工程师]+[AI]
// ui-contrast-guard.test.mjs — 对比度与色彩语义守卫（2026-10-21 R5-B/C P1）
//
// 来源：R5-C C-05/C-06 与 R5-A 对比度项。判据一律按 WCAG 2.x 相对亮度公式静态计算：
//   K1 金色徽章 `.badge--gold`：#92400E on #FDE68A ≥ 4.5:1（小字）；
//   K2 选中页签金色派生文字：color-mix(accent 45%, #000) on 10% accent 底（合成页面底色）≥ 4.5:1；
//     党建红 accent 同式亦须 ≥ 4.5:1；
//   K3 分组标签不再画彩色胶囊（无文字 ⇒ 不再有金色小字对比问题）；
//   K4 逾期统一 warning：今天页「逾期」附近不得出现 --functional-error；
//   K5 二级分段 `.btn-tab.active` 跟随主题色（--app-accent-text / --app-accent-bg），不再固定红。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(import.meta.dirname, '..', '..');
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');
const CSS = read('docs/src/styles.css');
const TAB_BAR = read('docs/src/components/shell/tab-bar.js');
const TODAY = read('docs/src/entries/tabs/today/today-tab.js');

/** sRGB 分量 → 线性光 */
const lin = (c) => {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};
/** 相对亮度 */
const luminance = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
/** WCAG 对比度 */
function contrast(a, b) {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}
/** hex → rgb */
const rgb = (hex) => {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
};
/** color-mix(in srgb, a p%, b)：p 为第一个颜色的占比 */
const mix = (a, b, p) => a.map((v, i) => Math.round(v * p + b[i] * (1 - p)));

const GOLD = rgb('#F5C518');
const RED = rgb('#CE1126');
const PAGE = rgb('#FAFAF5');
const WHITE = rgb('#FFFFFF');
const BLACK = rgb('#000000');

test('K1 .badge--gold 深琥珀字 on #FDE68A ≥ 4.5:1', () => {
  assert.match(CSS, /\.badge--gold\s*\{[^}]*background:\s*#FDE68A;[^}]*color:\s*color-mix\(in srgb, var\(--brand-amber-dark\) 70%, #000\)/,
    '.badge--gold 应为 #FDE68A 底 + 深琥珀字（brand-amber-dark 70% + 黑）');
  const ratio = contrast(mix(rgb('#A16207'), BLACK, 0.7), rgb('#FDE68A'));
  assert.ok(ratio >= 4.5, `badge--gold 对比度 ${ratio.toFixed(2)}:1 低于 4.5`);
});

test('K2 选中页签金色派生文字 ≥ 4.5:1（45% 压深档）', () => {
  assert.match(CSS, /\.tab-btn-active\s*\{[^}]*color:\s*color-mix\(in srgb, var\(--tab-accent, #B91C1C\) 45%, #000\)/,
    '选中页签文字应压深至 accent 45% + 黑');
  const onGold = contrast(mix(GOLD, BLACK, 0.45), mix(GOLD, PAGE, 0.1));
  const onWhite = contrast(mix(GOLD, BLACK, 0.45), mix(GOLD, WHITE, 0.1));
  assert.ok(Math.min(onGold, onWhite) >= 4.5,
    `金色选中页签对比度 ${Math.min(onGold, onWhite).toFixed(2)}:1 低于 4.5`);
  const redRatio = contrast(mix(RED, BLACK, 0.45), mix(RED, PAGE, 0.1));
  assert.ok(redRatio >= 4.5, `党建红选中页签对比度 ${redRatio.toFixed(2)}:1 低于 4.5`);
});

test('K3 分组标签不再画彩色胶囊（无文字 ⇒ 无小字对比问题）', () => {
  const line = TAB_BAR.split('\n').find((l) => l.includes('tab-group-label')) || '';
  assert.ok(line, 'tab-bar 未渲染 .tab-group-label');
  assert.doesNotMatch(line, /color\s*:|background\s*:/, '分组标签不得再带彩色文字 / 胶囊底色');
  assert.match(CSS, /\.tab-group-label\s*\{[^}]*width:\s*1px/, '分组标签应为 1px 竖线');
  assert.match(CSS, /@media \(max-width: 1024px\) \{[\s\S]*?\.tab-group-label \{ display: none; \}/,
    '≤1024px 不得渲染分组标签');
});

test('K4 今天页「逾期」使用 warning，不再用 error', () => {
  const hits = [...TODAY.matchAll(/逾期/g)].map((m) => m.index);
  assert.ok(hits.length > 0, '今天页未出现「逾期」');
  let hasWarning = false;
  for (const idx of hits) {
    const nearby = TODAY.slice(Math.max(0, idx - 400), idx + 400);
    assert.doesNotMatch(nearby, /--functional-error/, '逾期附近不得再使用 --functional-error');
    if (nearby.includes('--functional-warning')) hasWarning = true;
  }
  assert.ok(hasWarning, '逾期行应使用 --functional-warning');
});

test('K5 .btn-tab.active 跟随主题色（不再固定党建红）', () => {
  const m = /\.btn-tab\.active\s*\{([^}]*)\}/.exec(CSS);
  assert.ok(m, '缺少 .btn-tab.active 规则');
  assert.match(m[1], /background:\s*var\(--app-accent-bg\)/, '选中态底色应跟随 --app-accent-bg');
  assert.match(m[1], /color:\s*var\(--app-accent-text\)/, '选中态文字应跟随 --app-accent-text');
  assert.doesNotMatch(m[1], /--primary-50|--primary-700|--primary-200/, '不得再固定使用 primary 红系');
});
