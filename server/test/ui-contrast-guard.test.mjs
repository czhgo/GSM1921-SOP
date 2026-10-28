// role: [工程师]+[AI]
// ui-contrast-guard.test.mjs — 对比度与色彩语义守卫（2026-10-21 R5-B/C P1）
//
// 来源：R5-C C-05/C-06 与 R5-A 对比度项。判据一律按 WCAG 2.x 相对亮度公式静态计算：
//   K1 金色徽章 `.badge--gold`：#92400E on #FDE68A ≥ 4.5:1（小字）；
//   K2 选中页签金色派生文字：color-mix(accent 45%, #000) on 10% accent 底（合成页面底色）≥ 4.5:1；
//     党建红 accent 同式亦须 ≥ 4.5:1；
//   K3 分组名恢复为 8–9 月原样：`.tab-group-label` 12px / 主题色 10% 淡底（--app-accent-tint）/
//      无边框 / 主题 soft-text（7 主题亮暗 ≥4.5:1）/ 3px 直角 / ≥24px；
//      组间 `.tab-group-sep` 1px 线；≤1280px 只缩内边距、不隐藏也不下探 11px；
//      选中页签 `.tab-btn-active` 用 solid soft 底 + 更强主题 accent 描边 + 700 字重、无文本下划线。
//      （2026-10-27 Task 9：去 neutral-400 边框、底色由 soft-bg 降为 10% tint——用户裁定回到 8–9 月原样）
//   K4 逾期统一 warning：今天页「逾期」附近不得出现 --functional-error；
//   K5 二级分段 `.btn-tab.active` 跟随主题色（soft 三件套：soft-bg / soft-text / soft-border），不再固定红；
//   K6 逾期文字档：--status-warning-text（亮/暗）≥4.5:1，--status-warning 只作圆点 / 左条 / 填充
//      （2026-10-27 Task 11.1：原填充色直接当文字，白底仅 2.15:1）。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ACCENT_COLORS } from '../../docs/src/core/domain/constants.js?v=20261028b';

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
  // （固定语义色，不随主题变化）。2026-10-27 Task 11.4：字色改引功能金 token（同值）。
  const m = /\.badge--gold\s*\{[^}]*background:\s*#FEF9C3;[^}]*color:\s*var\(--color-functional-gold\)/.exec(CSS);
  assert.ok(m, '.badge--gold 应为 #FEF9C3 底 + var(--color-functional-gold) 功能金字');
  const gold = /--color-functional-gold:\s*(#[0-9A-Fa-f]{6})/.exec(CSS)?.[1];
  assert.equal(gold.toUpperCase(), '#A16207', '功能金亮色应为 #A16207');
  const ratio = contrast(rgb(gold), rgb('#FEF9C3'));
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

test('K3 分组名全宽可见（12px / 10% 淡底无边框 / 主题 soft-text 亮暗 ≥4.5:1 / 3px / ≥24px），≤1280 只缩不隐藏', () => {
  // 组名必须是可见文本，不是空 span（R5-C01 曾把组名整段移成 1px 竖线）。
  const nameLine = TAB_BAR.split('\n').find((l) => /tab-group-label/.test(l) && /\$\{groupName\}/.test(l)) || '';
  assert.ok(nameLine, 'tab-bar 未把 groupLabel 渲染为可见文本（.tab-group-label 内应为 ${groupName}）');
  assert.match(CSS, /\.tab-group-label\s*\{[^}]*font-size:\s*12px/, '组名应为 12px');
  // 2026-10-27 Task 9：恢复 8–9 月原样——主题色 10% 淡底、无边框、主题 soft 深字。
  //   淡底由 `--app-accent-tint` 从当前主题 base 换算 10% alpha（不用 color-mix / 主题色 rgba）。
  assert.match(CSS, /--app-accent-tint:\s*rgb\(from var\(--app-accent\) r g b \/ 10%\)/,
    'styles.css 应定义 --app-accent-tint = 当前主题色 10% 淡底（rgb(from … / 10%)）');
  assert.match(CSS, /\.tab-group-label\s*\{[^}]*background:\s*var\(--app-accent-tint\)/,
    '组名底色应为 10% 主题淡底 --app-accent-tint');
  assert.match(CSS, /\.tab-group-label\s*\{[^}]*border:\s*none/,
    '组名胶囊不得再有边框（8–9 月原样：无边框）');
  assert.doesNotMatch(CSS, /\.tab-group-label\s*\{[^}]*border:\s*1px/,
    '组名胶囊不得再写 1px 描边');
  assert.match(CSS, /\.tab-group-label\s*\{[^}]*color:\s*var\(--app-accent-soft-text\)/,
    '组名文字应为主题 soft-text');
  assert.doesNotMatch(CSS, /\.tab-group-label\s*\{[^}]*color:\s*var\(--neutral-500\)/,
    '组名不得退回 neutral-500（8–9 月为准绳的主题 soft 深字）');
  // 对比度：softText vs 10% 主题淡底（base 10% 叠在页面底上），7 主题 × 亮/暗全量核。
  const mix = (a, b, p) => a.map((v, i) => Math.round(v * p + b[i] * (1 - p)));
  const hex = (arr) => `#${arr.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
  const rows = [];
  for (const key of Object.keys(ACCENT_COLORS)) {
    for (const mode of ['light', 'dark']) {
      const t = ACCENT_COLORS[key][mode];
      const page = mode === 'light' ? '#FAFAF5' : '#0B1220';
      const tint = hex(mix(rgb(t.base), rgb(page), 0.1));
      const ratio = contrast(rgb(t.softText), rgb(tint));
      rows.push(`${key}.${mode} ${ratio.toFixed(2)}:1`);
      assert.ok(ratio >= 4.5, `${key}.${mode} 组名 softText/10% 淡底=${ratio.toFixed(2)}:1 < 4.5`);
    }
  }
  assert.equal(rows.length, 14, `应核对 14 个主题档，实际 ${rows.length}`);
  console.log(`[ui-contrast] K3 组名 softText/10% 淡底：${rows.join(' · ')}`);
  assert.match(CSS, /\.tab-group-label\s*\{[^}]*border-radius:\s*3px/, '组名胶囊应为 3px 直角（8–9 月准绳）');
  assert.doesNotMatch(CSS, /\.tab-group-label\s*\{[^}]*width:\s*1px/, '组名不得再退化为 1px 竖线');
  assert.match(CSS, /\.tab-group-label\s*\{[^}]*min-height:\s*24px/, '组名胶囊高度须 ≥24px');
  assert.match(CSS, /\.tab-group-label\s*\{[^}]*flex-shrink:\s*0/, '组名不得被压缩（flex-shrink: 0）');
  assert.doesNotMatch(CSS, /\.tab-group-label[^{}]*\{[^}]*display:\s*none/,
    '分组胶囊不得用 display:none 隐藏（≤1280/≤1024 也不得隐藏）');
  // 组间分隔线单独成类。
  assert.ok(TAB_BAR.includes('tab-group-sep'), 'tab-bar 未渲染组间分隔线 .tab-group-sep');
  assert.match(CSS, /\.tab-group-sep\s*\{[^}]*width:\s*1px/, '.tab-group-sep 应为 1px 线');
  // ≤1280px 只缩小内边距（不隐藏、不降字号）；分隔线保留（≤1024 仅缩外边距）。
  //   2026-10-26 Task 1：字号由原来的 11px 改回 12px（11px 属 Overline 标签档，组名不再下探）。
  //   2026-10-27 Task 9：去边框后高度由 min-height 24px 承担，内边距口径不变。
  const narrow = /@media \(max-width: 1280px\) \{[\s\S]*?\.tab-group-label \{([\s\S]*?)\}[\s\S]*?\n\}/.exec(CSS);
  assert.ok(narrow, '缺少 ≤1280px 的分组名规则');
  assert.match(narrow[1], /padding:\s*1px 5px/, '≤1280px 组名应缩小内边距（1px 5px）');
  assert.doesNotMatch(narrow[1], /font-size:\s*(?:9|10|11)px/, '≤1280px 组名不得下探 11px 及以下（保持 12px 正文档）');
  assert.doesNotMatch(narrow[1], /display:\s*none/, '≤1280px 不得隐藏组名');
  assert.doesNotMatch(CSS, /@media \(max-width: 1280px\) \{[\s\S]*?\.tab-group-sep \{[^}]*display:\s*none/,
    '≤1280px 不得隐藏分隔线');

  // 选中页签：与组名淡底拉开层级——solid soft 底 + 更强主题 accent 描边 + 700 字重，且无文本下划线。
  const active = (/\.tab-btn-active\s*\{([^}]*)\}/.exec(CSS)?.[1] || '').replace(/\/\*[\s\S]*?\*\//g, '');
  assert.ok(active, 'styles.css 缺 .tab-btn-active');
  assert.match(active, /border:\s*1px solid var\(--app-accent\)/, '选中页签须有更强的主题 accent 描边');
  assert.match(active, /font-weight:\s*700/, '选中页签字重须为 700');
  assert.doesNotMatch(active, /text-decoration:\s*underline/, '选中页签不得用文本下划线');
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

test('K6 逾期文字档：--status-warning-text 亮/暗 ≥4.5:1，warning 只作填充', () => {
  // 2026-10-27 Task 11.1：--status-warning（#F59E0B）直接当文字在白底仅 2.15:1；
  // 新增文字档 token 供逾期数值 / 超期标签 / 状态徽章文字使用，填充仍走 --status-warning。
  const light = /--status-warning-text:\s*(#[0-9A-Fa-f]{6})/.exec(CSS)?.[1];
  assert.ok(light, 'styles.css 缺 --status-warning-text 亮色值');
  const dark = /html\.theme-dark\s*\{[\s\S]*?--status-warning-text:\s*(#[0-9A-Fa-f]{6})/.exec(CSS)?.[1];
  assert.ok(dark, 'styles.css 暗色段缺 --status-warning-text');

  const lightWhite = contrast(rgb(light), WHITE);
  const lightPage = contrast(rgb(light), PAGE);
  const darkCard = contrast(rgb(dark), rgb('#141D2F'));
  const darkPage = contrast(rgb(dark), rgb('#0B1220'));
  assert.ok(lightWhite >= 4.5, `warning 文字档白底 ${lightWhite.toFixed(2)}:1 < 4.5`);
  assert.ok(lightPage >= 4.5, `warning 文字档页面底 ${lightPage.toFixed(2)}:1 < 4.5`);
  assert.ok(darkCard >= 4.5, `warning 文字档暗卡 ${darkCard.toFixed(2)}:1 < 4.5`);
  assert.ok(darkPage >= 4.5, `warning 文字档暗页 ${darkPage.toFixed(2)}:1 < 4.5`);
  console.log(`[ui-contrast] K6 warning 文字档：亮/白 ${lightWhite.toFixed(2)} · 亮/页 ${lightPage.toFixed(2)}`
    + ` · 暗/卡 ${darkCard.toFixed(2)} · 暗/页 ${darkPage.toFixed(2)}`);

  for (const [selector, why] of [
    ['.metric-band__value--warning', '逾期数值'],
    ['.state-badge--warning', '逾期状态徽章文字'],
    ['.workflow-substates-hint', '超期提示文字'],
  ]) {
    const body = (new RegExp(`${selector.replace(/\./g, '\\.')}\\s*\\{([^}]*)\\}`).exec(
      CSS.replace(/\/\*[\s\S]*?\*\//g, ''))?.[1] || '');
    assert.match(body, /color:\s*var\(--status-warning-text\)/,
      `${why}（${selector}）应使用 --status-warning-text，不得用填充色 --status-warning 当文字`);
  }
  // 填充语义保留：圆点与左条仍取 --status-warning。
  assert.match(CSS, /\.todo-urgency-header__dot--warning\s*\{[^}]*background:\s*var\(--status-warning\)/,
    'warning 圆点应继续使用 --status-warning');
  assert.match(CSS, /\.section-accent-left\s*\{[^}]*border-left:\s*2px solid var\(--status-warning\)/,
    'warning 左条应继续使用 --status-warning');
});
