// server/test/ui-focus-ring.test.mjs — 焦点可见性守卫（2026-10-21 · R5A-04/05）
//
// 来源：`.ctx/logs/archive/2026-10/AUDIT_R5_A_WEB_GUIDELINES.md` R5A-04/05。
// 2026-10-29 P1（焦点只有一个信号）后本文件的判据：
//   F1 唯一来源：--focus-ring / --focus-halo 两个旧变量已删除，焦点颜色只用 --app-accent；
//   F2 全局按钮 / 链接 / summary / role 控件 / 行 / .focus-ring 只声明一条 outline
//      （2px 主题色 / offset 1px / 无 box-shadow）；
//   F3 输入族（有边框控件）：`:focus` 与 `:focus-visible` 同表现——只变 border-color，
//      不出 outline、不出 box-shadow（鼠标与键盘一致）；
//   F4 对比度：七主题 × 亮/暗的主题色（边框色 / 环色同源）vs 页面底 / 白卡 ≥ 3:1；
//   F5 非空转：对比度函数有正/负例，规则抽取不把不存在规则当命中；
//   F6 顶栏三按钮并入同一口径（不再用党徽金 + 金晕），且不得出现两条环。
//
// 运行：node --test server/test/ui-focus-ring.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const STYLES = readFileSync(join(ROOT, 'docs', 'src', 'styles.css'), 'utf8').replace(/\r\n/g, '\n');

const GOLD = '#FFD700';
const DARK_SURFACE = '#0B1220';
const DARK_CARD = '#141D2F';
const LIGHT_SURFACE = '#FAFAF5';
const LIGHT_CARD = '#FFFFFF';
const HEADER_RED = '#7A0010';

/** 七主题的主题色 base（与 constants.js ACCENT_COLORS 同值；亮/暗各一） */
const THEME_ACCENTS = {
  gold:   { light: '#A97A12', dark: '#E0B24C' },
  red:    { light: '#A32B24', dark: '#E0796F' },
  orange: { light: '#B45B33', dark: '#E39B6F' },
  green:  { light: '#2F6B4F', dark: '#7CC4A0' },
  cyan:   { light: '#0F6D7B', dark: '#63B8C7' },
  blue:   { light: '#3D4E9C', dark: '#8F9EDB' },
  purple: { light: '#6D5382', dark: '#B79FCB' },
};

function _ruleBody(css, selector) {
  const idx = css.indexOf(selector);
  if (idx < 0) return '';
  const open = css.indexOf('{', idx);
  const close = css.indexOf('}', open);
  return open < 0 || close < 0 ? '' : css.slice(open + 1, close);
}

/** sRGB 相对亮度（WCAG 定义） */
function _luminance(hex) {
  const raw = String(hex).replace('#', '');
  const full = raw.length === 3 ? raw.split('').map((c) => c + c).join('') : raw;
  const channels = [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16) / 255);
  const [r, g, b] = channels.map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function _contrast(a, b) {
  const [hi, lo] = [_luminance(a), _luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

test('F1 唯一来源：--focus-ring / --focus-halo 已删除，焦点颜色只用 --app-accent', () => {
  // 2026-10-28：支书裁定全站只用主题色；两个旧变量（亮色深灰 / 暗色覆盖）一律退场。
  assert.doesNotMatch(STYLES, /--focus-ring\s*:/, 'styles.css 不应再定义 --focus-ring');
  assert.doesNotMatch(STYLES, /--focus-halo\s*:/, 'styles.css 不应再定义 --focus-halo');
  assert.doesNotMatch(STYLES, /var\(--focus-ring\)/, 'styles.css 不应再引用 var(--focus-ring)');
  assert.doesNotMatch(STYLES, /var\(--focus-halo\)/, 'styles.css 不应再引用 var(--focus-halo)');
  assert.match(STYLES, /--app-accent:\s+var\(--app-accent-base-light\)/, '主题色 token 应存在');
  const darkBlock = STYLES.match(/html\.theme-dark\s*\{([\s\S]*?)\n\s*\}/)?.[1] || '';
  assert.ok(darkBlock, '缺少 html.theme-dark 变量块');
  assert.doesNotMatch(darkBlock, /--focus-(?:ring|halo)\s*:/, '暗色段不应再覆盖旧焦点环变量');
});

test('F2 全局控制器只声明一条 outline（2px 主题色 / offset 1px / 无 box-shadow）', () => {
  const body = _ruleBody(STYLES, 'button:focus-visible,\na:focus-visible');
  assert.ok(body, '缺少全局 button/a:focus-visible 规则');
  const outlines = body.match(/outline:\s*[^;]+;/g) || [];
  assert.equal(outlines.length, 1, `全局焦点环应只声明一条 outline，实测 ${outlines.length}`);
  assert.match(body, /outline:\s*2px solid var\(--app-accent\)/, '全局焦点环应使用主题色 --app-accent');
  assert.match(body, /outline-offset:\s*1px\s*;/, '全局焦点环偏移应为 1px');
  assert.match(body, /box-shadow:\s*none\s*;/, '全局焦点环不得再叠 box-shadow 光晕');
  for (const sel of ['summary:focus-visible', '[role="button"]:focus-visible', '[role="option"]:focus-visible', '[role="tab"]:focus-visible', '[data-interactive="true"]:focus-visible', '.focus-ring:focus-visible']) {
    assert.ok(body.includes(sel) || STYLES.includes(sel), `全局焦点规则应覆盖 ${sel}`);
  }

  // 实底控件（.btn-accent / .btn-danger-solid / 实底 status-badge）：2026-10-28 改用负偏移，
  // 环落在主题色实底内侧；否则白环 / 深墨环落在卡片上（≈1.05–1.14:1）等于看不见。
  const solid = _ruleBody(STYLES, '.btn-accent:focus-visible,\n.btn-danger-solid:focus-visible');
  assert.ok(solid, '缺少实底控件焦点环规则（.btn-accent / .btn-danger-solid）');
  assert.match(solid, /outline:\s*2px solid var\(--app-accent-strong-ink\)\s*;/, '实底控件环色应为 --app-accent-strong-ink');
  assert.match(solid, /outline-offset:\s*-2px\s*;/, '实底控件环必须内压（offset -2px），不得落在外侧卡片上');
  assert.match(solid, /box-shadow:\s*none\s*;/, '实底控件环不得叠 box-shadow');
  assert.match(STYLES, /\.status-badge\[aria-pressed="true"\]:focus-visible/, '实底 status-badge 须纳入同一条内压环');

  const tok = (name) => new RegExp(`--${name}:\\s*(#[0-9A-Fa-f]{6})\\s*;`).exec(STYLES)?.[1];
  const solidPairs = [
    ['亮色白环 vs 实底 strongBg', tok('app-accent-strong-ink-light'), tok('app-accent-strong-bg-light')],
    ['暗色深墨环 vs 实底 strongBg', tok('app-accent-strong-ink-dark'), tok('app-accent-strong-bg-dark')],
  ];
  for (const [label, ink, bg] of solidPairs) {
    assert.ok(ink && bg, `styles.css 缺少实底环 / 底色令牌（无法核算「${label}」）`);
    const ratio = _contrast(ink, bg);
    console.log(`[ui-focus-ring] F2 ${label} ${ink} / ${bg} ${ratio.toFixed(2)}:1`);
    assert.ok(ratio >= 3, `${label} 仅 ${ratio.toFixed(2)}:1（要求 ≥3）`);
  }
});

test('F3 输入族：:focus 与 :focus-visible 同表现——只变边框色，不出环、不出阴影', () => {
  // 2026-10-29 P1：输入框是「有边框控件」⇒ 焦点只有一个信号（border-color）。
  const focus = _ruleBody(STYLES, '.input-flat:focus, .cs-trigger:focus-within')
    || _ruleBody(STYLES, '.input-flat:focus');
  assert.ok(focus, '缺少 .input-flat:focus 字段外壳规则');
  assert.match(focus, /border-color:\s*var\(--app-accent\)/, '活动态边框应为主题色');
  assert.match(focus, /outline:\s*none\s*;/, '活动态不得出 outline（输入族只允许 border-color）');
  assert.match(focus, /box-shadow:\s*none\s*;/, '活动态不得出 box-shadow');
  // 键盘态与鼠标态共用同一个规则块（不是各写一套）。
  const kb = _ruleBody(STYLES, '.input-flat:focus-visible');
  assert.equal(kb, focus, '`:focus` 与 `:focus-visible` 必须是同一个规则块（鼠标 / 键盘同表现）');
  for (const [label, sel] of [
    ['紧凑档', '.input-flat-sm:focus'],
    ['下拉内嵌搜索', '.cs-search-input:focus'],
    ['投票备注', '.vote-note:focus'],
  ]) {
    const body = _ruleBody(STYLES, sel);
    assert.ok(body, `缺少 ${label}（${sel}）焦点规则`);
    assert.match(body, /border-color:\s*var\(--app-accent\)/, `${label} 聚焦应把边框切到主题色`);
    const outline = /(?:^|;)\s*outline\s*:\s*([^;]+)/.exec(body)?.[1]?.trim();
    assert.ok(!outline || /^none$/i.test(outline), `${label} 不得出 outline（输入族只允许 border-color）`);
    const shadow = /(?:^|;)\s*box-shadow\s*:\s*([^;]+)/.exec(body)?.[1]?.trim();
    assert.ok(!shadow || /^none$/i.test(shadow), `${label} 不得出 box-shadow`);
  }
});

test('F4 对比度：七主题 × 亮/暗的主题色 vs 页面底 / 白卡 ≥ 3:1', () => {
  // 2026-10-28：焦点环改用主题色，故逐主题核算；数值只报不藏（低于 3 须在交付说明中报告）。
  for (const [key, pair] of Object.entries(THEME_ACCENTS)) {
    assert.ok(_contrast(pair.light, LIGHT_SURFACE) >= 3,
      `${key} 亮色焦点环 vs 页面底仅 ${_contrast(pair.light, LIGHT_SURFACE).toFixed(2)}:1`);
    assert.ok(_contrast(pair.light, LIGHT_CARD) >= 3,
      `${key} 亮色焦点环 vs 白卡仅 ${_contrast(pair.light, LIGHT_CARD).toFixed(2)}:1`);
    assert.ok(_contrast(pair.dark, DARK_SURFACE) >= 3,
      `${key} 暗色焦点环 vs 暗页面底仅 ${_contrast(pair.dark, DARK_SURFACE).toFixed(2)}:1`);
    assert.ok(_contrast(pair.dark, DARK_CARD) >= 3,
      `${key} 暗色焦点环 vs 暗卡仅 ${_contrast(pair.dark, DARK_CARD).toFixed(2)}:1`);
    console.log(`[ui-focus-ring] F4 ${key}: light ${pair.light} 页 ${_contrast(pair.light, LIGHT_SURFACE).toFixed(2)} / 卡 ${_contrast(pair.light, LIGHT_CARD).toFixed(2)} · dark ${pair.dark} 页 ${_contrast(pair.dark, DARK_SURFACE).toFixed(2)} / 卡 ${_contrast(pair.dark, DARK_CARD).toFixed(2)}`);
  }
  // 反证：党徽金对白卡不足 3:1，故不得再当焦点色。
  assert.ok(_contrast(GOLD, LIGHT_CARD) < 3, '反证失败：党徽金对白卡本就不足 3:1');
});

test('F5 非空转：对比度函数与规则抽取有正/负例', () => {
  assert.ok(_contrast('#000000', '#FFFFFF') > 20, '对比度函数失效（黑白应约 21:1）');
  assert.ok(_contrast('#FFFFFF', '#FFFFFF') === 1, '同色对比度应为 1');
  assert.equal(_ruleBody('a { color: red; }', '.not-exist:focus'), '', '不存在的选择器应返回空');
});

test('F6 顶栏三按钮：深红底改用既有白色令牌（2px / offset 1px / 无 box-shadow），白环对 #7A0010 ≥3:1', () => {
  // 2026-10-28：顶栏底恒为深红 #7A0010，七种主题色在其上只有 1.51–2.99:1 ⇒ 改白色令牌。
  const body = _ruleBody(STYLES, '#app-header .hamburger-btn:focus-visible');
  assert.ok(body, '缺少顶栏作用域焦点环规则（#app-header .hamburger-btn:focus-visible）');
  assert.match(body, /outline:\s*2px solid var\(--app-accent-strong-ink-light\)\s*;/,
    '顶栏焦点环应使用仓库既有白色令牌 --app-accent-strong-ink-light（不得写死 hex）');
  assert.match(body, /outline-offset:\s*1px\s*;/, '顶栏焦点环偏移应为 1px（几何与全站一致，只换颜色）');
  assert.match(body, /box-shadow:\s*none\s*;/, '顶栏焦点环不得再带金光晕');
  assert.doesNotMatch(body, /--party-gold/, '顶栏焦点环不得再用党徽金');
  assert.doesNotMatch(body, /outline:\s*2px solid var\(--app-accent\)\s*;/,
    '顶栏焦点环不得再用主题色（对深红底 1.51–2.99:1，低于 3:1）');
  assert.match(STYLES, /#app-header \.header-action-btn:focus-visible/, '顶栏动作按钮须纳入同一焦点环');
  assert.match(STYLES, /#app-header #notif-btn:focus-visible/, '顶栏通知按钮须纳入同一焦点环');

  // 白色令牌必须两态都接近纯白：:root 定义 #FFFFFF，且暗色段不得重定义该 -light 原始变量。
  const inkLight = /--app-accent-strong-ink-light:\s*(#[0-9A-Fa-f]{6})\s*;/.exec(STYLES)?.[1];
  assert.ok(inkLight, 'styles.css 缺少 --app-accent-strong-ink-light（无法核算顶栏环颜色）');
  assert.ok(_contrast(inkLight, '#FFFFFF') <= 1.05,
    `--app-accent-strong-ink-light 计算值 ${inkLight} 不是近纯白（对白 ${_contrast(inkLight, '#FFFFFF').toFixed(2)}:1）`);
  const darkBlock = STYLES.match(/html\.theme-dark\s*\{([\s\S]*?)\n\s*\}/)?.[1] || '';
  assert.doesNotMatch(darkBlock, /--app-accent-strong-ink-light\s*:/,
    '暗色段不得重定义 --app-accent-strong-ink-light（否则暗色顶栏环不再白）');

  const vsHeader = _contrast(inkLight, HEADER_RED);
  console.log(`[ui-focus-ring] F6 顶栏白环 ${inkLight} vs 深红 ${HEADER_RED} ${vsHeader.toFixed(2)}:1`);
  assert.ok(vsHeader >= 3, `顶栏白环对 #7A0010 仅 ${vsHeader.toFixed(2)}:1（要求 ≥3）`);
  // 记录读数：旧口径（主题色）确实低于 3:1，是本次换色的依据。
  for (const [key, pair] of Object.entries(THEME_ACCENTS)) {
    console.log(`[ui-focus-ring] F6 ${key} 主题色焦点环 vs 顶栏深红 ${_contrast(pair.light, HEADER_RED).toFixed(2)}:1（已弃用）`);
  }
});
