// role: [工程师]+[AI]
// ui-contrast-guard.test.mjs — 对比度与色彩语义守卫（2026-10-21 R5-B/C P1）
//
// 来源：R5-C C-05/C-06 与 R5-A 对比度项。判据一律按 WCAG 2.x 相对亮度公式静态计算：
//   K1 金色徽章 `.badge--gold`：#92400E on #FDE68A ≥ 4.5:1（小字）；
//   K2 选中页签金色派生文字：color-mix(accent 45%, #000) on 10% accent 底（合成页面底色）≥ 4.5:1；
//     党建红 accent 同式亦须 ≥ 4.5:1；
//   K3 分组名恢复为可见文本：`.tab-group-label` 12px / neutral-500；组间 `.tab-group-sep` 1px 线；
//      ≤1280px 只隐藏组名、分隔线保留（2026-10-23 R11 P0-06 取代 R5-C01 的「1px 竖线」口径）；
//   K4 逾期统一 warning：今天页「逾期」附近不得出现 --functional-error；
//   K5 二级分段 `.btn-tab.active` 跟随主题色（soft 三件套：soft-bg / soft-text / soft-border），不再固定红。
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

test('K1 .badge--gold 深琥珀字 on #FEF9C3 ≥ 4.5:1', () => {
  // 批次 505：金色徽章底色由 #FDE68A 调为更浅的 #FEF9C3，字色固定深琥珀 #A16207
  // （固定语义色，不随主题变化）。
  assert.match(CSS, /\.badge--gold\s*\{[^}]*background:\s*#FEF9C3;[^}]*color:\s*#A16207;/,
    '.badge--gold 应为 #FEF9C3 底 + 深琥珀字 #A16207');
  const ratio = contrast(rgb('#A16207'), rgb('#FEF9C3'));
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

test('K3 分组名是可见组名（12px / neutral-500），组间 1px 分隔线，≤1280 只隐藏组名', () => {
  // 组名必须是可见文本，不是空 span（R5-C01 曾把组名整段移成 1px 竖线）。
  const nameLine = TAB_BAR.split('\n').find((l) => /tab-group-label/.test(l) && /\$\{groupName\}/.test(l)) || '';
  assert.ok(nameLine, 'tab-bar 未把 groupLabel 渲染为可见文本（.tab-group-label 内应为 ${groupName}）');
  assert.match(CSS, /\.tab-group-label\s*\{[^}]*font-size:\s*12px/, '组名应为 12px');
  assert.match(CSS, /\.tab-group-label\s*\{[^}]*color:\s*var\(--neutral-500\)/, '组名应为 neutral-500');
  assert.doesNotMatch(CSS, /\.tab-group-label\s*\{[^}]*width:\s*1px/, '组名不得再退化为 1px 竖线');
  // 组间分隔线单独成类。
  assert.ok(TAB_BAR.includes('tab-group-sep'), 'tab-bar 未渲染组间分隔线 .tab-group-sep');
  assert.match(CSS, /\.tab-group-sep\s*\{[^}]*width:\s*1px/, '.tab-group-sep 应为 1px 线');
  // ≤1280px 只隐藏组名；分隔线保留（≤1024 仅缩外边距）。
  assert.match(CSS, /@media \(max-width: 1280px\) \{[\s\S]*?\.tab-group-label \{ display: none; \}/,
    '≤1280px 应只隐藏组名');
  assert.doesNotMatch(CSS, /@media \(max-width: 1280px\) \{[\s\S]*?\.tab-group-sep \{[^}]*display:\s*none/,
    '≤1280px 不得隐藏分隔线');
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

test('K5 .btn-tab.active 跟随主题色（soft 三件套，不再固定党建红）', () => {
  const m = /\.btn-tab\.active\s*\{([^}]*)\}/.exec(CSS);
  assert.ok(m, '缺少 .btn-tab.active 规则');
  // 批次 505：选中态 = 主题表 soft 三件套（浅底 / 深字 / 描边），深色由别名切 *-dark。
  assert.match(m[1], /background:\s*var\(--app-accent-soft-bg\)/, '选中态底色应跟随 --app-accent-soft-bg');
  assert.match(m[1], /color:\s*var\(--app-accent-soft-text\)/, '选中态文字应跟随 --app-accent-soft-text');
  assert.match(m[1], /border-color:\s*var\(--app-accent-soft-border\)/, '选中态描边应跟随 --app-accent-soft-border');
  assert.doesNotMatch(m[1], /--primary-50|--primary-700|--primary-200/, '不得再固定使用 primary 红系');
});
