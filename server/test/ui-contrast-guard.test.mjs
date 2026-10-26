// role: [工程师]+[AI]
// ui-contrast-guard.test.mjs — 对比度与色彩语义守卫（2026-10-21 R5-B/C P1）
//
// 来源：R5-C C-05/C-06 与 R5-A 对比度项。判据一律按 WCAG 2.x 相对亮度公式静态计算：
//   K1 金色徽章 `.badge--gold`：#92400E on #FDE68A ≥ 4.5:1（小字）；
//   K2 选中页签金色派生文字：color-mix(accent 45%, #000) on 10% accent 底（合成页面底色）≥ 4.5:1；
//     党建红 accent 同式亦须 ≥ 4.5:1；
//   K3 分组名恢复为可见文本：`.tab-group-label` 12px / 主题 soft-text（亮/暗 ≥4.5:1）/ 3px 直角；
//      组间 `.tab-group-sep` 1px 线；≤1280px 只缩内边距、不隐藏也不下探 11px
//      （2026-10-23 R11 P0-06 取代 R5-C01 的「1px 竖线」口径；2026-10-26 Task 1 恢复 8–9 月主题 soft 语义）；
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

test('K2 选中页签文字走主题 softText（不再 color-mix 派生）且 ≥ 4.5:1', () => {
  // 2026-10-23 批次 507：选中页签文字由 `color-mix(--tab-accent 45%, #000)` 改为主题 softText
  // （每主题手选 hex，7 主题对比度全量核在 theme-palette-guard::T2；此处只作页签侧的定点复核）。
  const block = (/\.tab-btn-active\s*\{([^}]*)\}/.exec(CSS)?.[1] || '').replace(/\/\*[\s\S]*?\*\//g, '');
  assert.match(block, /color:\s*var\(--app-accent-soft-text\)/, '选中页签文字应为 --app-accent-soft-text');
  assert.doesNotMatch(block, /color-mix\(/, '选中页签文字不得再用 color-mix 派生');
  const tok = (name) => {
    const m = new RegExp(`${name}:\\s*(#[0-9A-Fa-f]{6})`).exec(CSS);
    assert.ok(m, `styles.css 缺少 ${name}`);
    return m[1];
  };
  const ratio = contrast(rgb(tok('--app-accent-soft-text-light')), rgb(tok('--app-accent-soft-bg-light')));
  assert.ok(ratio >= 4.5, `金色选中页签对比度 ${ratio.toFixed(2)}:1 低于 4.5`);
});

test('K3 分组名全宽可见（12px / 主题 soft-text 亮暗 ≥4.5:1 / 3px / ≥24px），≤1280 只缩不隐藏', () => {
  // 组名必须是可见文本，不是空 span（R5-C01 曾把组名整段移成 1px 竖线）。
  const nameLine = TAB_BAR.split('\n').find((l) => /tab-group-label/.test(l) && /\$\{groupName\}/.test(l)) || '';
  assert.ok(nameLine, 'tab-bar 未把 groupLabel 渲染为可见文本（.tab-group-label 内应为 ${groupName}）');
  assert.match(CSS, /\.tab-group-label\s*\{[^}]*font-size:\s*12px/, '组名应为 12px');
  // 2026-10-26 Task 1：恢复 8–9 月的「主题色 soft 底 + 主题 soft 深字」——颜色由 token 选边，
  //   不再退到 neutral-500 中性灰；亮/暗两套 softText/softBg 均须 ≥4.5:1。
  assert.match(CSS, /\.tab-group-label\s*\{[^}]*background:\s*var\(--app-accent-soft-bg\)/,
    '组名底色应为主题 soft-bg');
  assert.match(CSS, /\.tab-group-label\s*\{[^}]*color:\s*var\(--app-accent-soft-text\)/,
    '组名文字应为主题 soft-text');
  assert.doesNotMatch(CSS, /\.tab-group-label\s*\{[^}]*color:\s*var\(--neutral-500\)/,
    '组名不得退回 neutral-500（8–9 月为准绳的主题 soft 深字）');
  const tok = (name) => {
    const m = new RegExp(`${name}:\\s*(#[0-9A-Fa-f]{6})`).exec(CSS);
    assert.ok(m, `styles.css 缺少 ${name}`);
    return m[1];
  };
  for (const [mode, textName, bgName] of [
    ['亮色', '--app-accent-soft-text-light', '--app-accent-soft-bg-light'],
    ['暗色', '--app-accent-soft-text-dark', '--app-accent-soft-bg-dark'],
  ]) {
    const ratio = contrast(rgb(tok(textName)), rgb(tok(bgName)));
    assert.ok(ratio >= 4.5, `${mode}组名 softText/softBg 对比度 ${ratio.toFixed(2)}:1 低于 4.5`);
  }
  assert.match(CSS, /\.tab-group-label\s*\{[^}]*border-radius:\s*3px/, '组名胶囊应为 3px 直角（8–9 月准绳）');
  assert.doesNotMatch(CSS, /\.tab-group-label\s*\{[^}]*width:\s*1px/, '组名不得再退化为 1px 竖线');
  // 2026-10-26 Task 3.5：形状与页面底对比 ≥1.5:1（描边）＋ 高度 ≥24px；所有宽度可见。
  assert.match(CSS, /\.tab-group-label\s*\{[^}]*min-height:\s*24px/, '组名胶囊高度须 ≥24px');
  assert.match(CSS, /\.tab-group-label\s*\{[^}]*border:\s*1px solid var\(--neutral-400\)/,
    '组名胶囊须有深一档描边（neutral-400 → 与白底约 2.4:1，形状可辨）');
  assert.match(CSS, /\.tab-group-label\s*\{[^}]*flex-shrink:\s*0/, '组名不得被压缩（flex-shrink: 0）');
  assert.doesNotMatch(CSS, /\.tab-group-label[^{}]*\{[^}]*display:\s*none/,
    '分组胶囊不得用 display:none 隐藏（≤1280/≤1024 也不得隐藏）');
  // 组间分隔线单独成类。
  assert.ok(TAB_BAR.includes('tab-group-sep'), 'tab-bar 未渲染组间分隔线 .tab-group-sep');
  assert.match(CSS, /\.tab-group-sep\s*\{[^}]*width:\s*1px/, '.tab-group-sep 应为 1px 线');
  // ≤1280px 只缩小内边距（不隐藏、不降字号）；分隔线保留（≤1024 仅缩外边距）。
  //   2026-10-26 Task 1：字号由原来的 11px 改回 12px（11px 属 Overline 标签档，组名不再下探）。
  const narrow = /@media \(max-width: 1280px\) \{[\s\S]*?\.tab-group-label \{([\s\S]*?)\}[\s\S]*?\n\}/.exec(CSS);
  assert.ok(narrow, '缺少 ≤1280px 的分组名规则');
  assert.match(narrow[1], /padding:\s*1px 5px/, '≤1280px 组名应缩小内边距（1px 5px）');
  assert.doesNotMatch(narrow[1], /font-size:\s*(?:9|10|11)px/, '≤1280px 组名不得下探 11px 及以下（保持 12px 正文档）');
  assert.doesNotMatch(narrow[1], /display:\s*none/, '≤1280px 不得隐藏组名');
  assert.doesNotMatch(CSS, /@media \(max-width: 1280px\) \{[\s\S]*?\.tab-group-sep \{[^}]*display:\s*none/,
    '≤1280px 不得隐藏分隔线');
});

test('K4 今天页「逾期」使用 warning，不再用 error', () => {
  const hits = [...TODAY.matchAll(/逾期/g)].map((m) => m.index);
  assert.ok(hits.length > 0, '今天页未出现「逾期」');
  let hasWarning = false;
  for (const idx of hits) {
    const nearby = TODAY.slice(Math.max(0, idx - 400), idx + 400);
    assert.doesNotMatch(nearby, /--functional-error|--status-error/, '逾期附近不得再使用 error 状态色');
    if (/--functional-warning|--status-warning/.test(nearby)) hasWarning = true;
  }
  assert.ok(hasWarning, '逾期行应使用 --status-warning');
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
