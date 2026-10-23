// role: [工程师]+[AI]
// gold-accent-guard.test.mjs — 主题色实底 / 浅底 token 收口守卫（spec redesign-theme-palette-and-density · Task 9）
//
// 历史：本守卫原为「默认现代金 #F5C518 + 深色字」而设（2026-10-19）。
// 批次 505 起主题色改为 **7 主题 × 亮/暗 × 8 个手选 hex**：金主题是更沉稳的琥珀金 #A97A12，
// 实底/实底字/浅底/浅底字各自独立成 token，`filter: brightness`、`--app-accent-strong: var(--app-accent)`
// `--app-accent-text: #1F2937` 等旧派生机制全部退场。本守卫改为锁「新 token 语义」，
// 同时保留党徽金 / 党建红固定色的断言（它们不随主题变化）。
//
// 断言：
//   G1 styles.css：无 #F5C518 / 无 brightness；默认金 8 token 齐备；旧派生写法绝迹；党徽金/党建红固定；
//   G2 constants.js：gold 主题 8 token 为手选 hex；accentButtonColors 查表返回 strongBg/strongInk；
//   G3 四个注入点都走 applyAccentThemeTokens / getAccentColors（16 个原始变量），不再写旧三件套；
//   G4 内存样本：gold 实底 #9A6B0F + 白字、red 实底 #9B2C22 + 白字；非法入参回落 gold（不是 var()）；
//   G5 文字色/焦点环：浅底深字只走 --app-accent-soft-text；不得直接用裸 var(--app-accent)。
// 运行：node --test server/test/gold-accent-guard.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ACCENT_COLORS, accentButtonColors } from '../../docs/src/core/domain/constants.js?v=20261023c';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');

const STYLES = read('docs/src/styles.css');
const CONSTANTS = read('docs/src/core/domain/constants.js');

/** 取某选择器的规则体（逗号分隔后精确匹配；先剥注释） */
function ruleBody(css, selector) {
  const clean = css.replace(/\/\*[\s\S]*?\*\//g, '');
  for (const m of clean.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    if (m[1].trim().split(',').map((s) => s.trim()).includes(selector)) return m[2];
  }
  return '';
}

test('G1 styles.css：默认金 8 token 齐备；无 #F5C518 / brightness / 旧派生；固定语义色不动', () => {
  // 注释里会写「2026-10-23 Task 7：hover 不再用 filter: brightness」，负例先剥注释再判。
  const bare = STYLES.replace(/\/\*[\s\S]*?\*\//g, '');
  // 旧实现退场：真金 #F5C518 与亮度派生都不得回来
  assert.doesNotMatch(bare, /#F5C518/i, 'styles.css 不得再出现旧默认金 #F5C518');
  assert.doesNotMatch(bare, /filter\s*:\s*brightness/i, 'hover 不得再用 filter: brightness（改用 hoverBg）');
  assert.doesNotMatch(bare, /--app-accent-strong\s*:\s*var\(--app-accent\)\s*;/,
    '--app-accent-strong 不得退回「本色」别名（实底必须查 strongBg）');
  assert.doesNotMatch(bare, /--app-accent-text\s*:\s*#1F2937/i,
    '--app-accent-text 不得退回中性近黑（浅底字必须查 softText）');

  // 默认金（:root 的亮/暗两套原始变量）
  const light = ACCENT_COLORS.gold.light;
  const dark = ACCENT_COLORS.gold.dark;
  for (const [suffix, value] of [
    ['base', light.base], ['soft-bg', light.softBg], ['soft-border', light.softBorder],
    ['soft-text', light.softText], ['strong-bg', light.strongBg], ['strong-ink', light.strongInk],
    ['hover-bg', light.hoverBg], ['active-bg', light.activeBg],
  ]) {
    assert.match(STYLES, new RegExp(`--app-accent-${suffix}-light:\\s*${value}\\s*;`, 'i'),
      `styles.css 缺少默认金 --app-accent-${suffix}-light: ${value}`);
  }
  for (const [suffix, value] of [
    ['base', dark.base], ['soft-bg', dark.softBg], ['soft-border', dark.softBorder],
    ['soft-text', dark.softText], ['strong-bg', dark.strongBg], ['strong-ink', dark.strongInk],
    ['hover-bg', dark.hoverBg], ['active-bg', dark.activeBg],
  ]) {
    assert.match(STYLES, new RegExp(`--app-accent-${suffix}-dark:\\s*${value}\\s*;`, 'i'),
      `styles.css 缺少默认金 --app-accent-${suffix}-dark: ${value}`);
  }
  // 亮/暗选边别名
  assert.match(STYLES, /--app-accent-strong-bg:\s*var\(--app-accent-strong-bg-light\)/,
    '--app-accent-strong-bg 应指向 *-light（亮色选边）');
  assert.match(STYLES, /--app-accent-soft-text:\s*var\(--app-accent-soft-text-light\)/,
    '--app-accent-soft-text 应指向 *-light（亮色选边）');

  // 固定语义色：党徽金 / 党建红不随主题变化
  assert.match(STYLES, /--party-gold:\s*#FFD700\s*;/, '党徽金应固定为 #FFD700');
  assert.match(STYLES, /--party-red:\s*#CE1126\s*;/, '党建红应固定为 #CE1126');
  assert.doesNotMatch(STYLES, /--party-gold:\s*var\(--app-accent/, '党徽金不得指向主题色');
});

test('G2 constants.js：gold 主题 8 token 为手选 hex；accentButtonColors 查表', () => {
  const g = ACCENT_COLORS.gold;
  assert.equal(g.light.base, '#A97A12', 'gold.light.base 应为沉稳琥珀金 #A97A12');
  assert.equal(g.light.softBg, '#FBF3DC', 'gold.light.softBg 应为 #FBF3DC');
  assert.equal(g.light.softBorder, '#E8D5A3', 'gold.light.softBorder 应为 #E8D5A3');
  assert.equal(g.light.softText, '#6E4E08', 'gold.light.softText 应为 #6E4E08');
  assert.equal(g.light.strongBg, '#9A6B0F', 'gold.light.strongBg 应为 #9A6B0F');
  assert.equal(g.light.strongInk, '#FFFFFF', 'gold.light.strongInk 应为白字');
  assert.equal(g.light.hoverBg, '#F6EAC6', 'gold.light.hoverBg 应为 #F6EAC6');
  assert.equal(g.light.activeBg, '#F0DFAC', 'gold.light.activeBg 应为 #F0DFAC');
  assert.equal(g.dark.strongBg, '#C89A34', 'gold.dark.strongBg 应为 #C89A34');
  assert.equal(g.dark.strongInk, '#1E1503', 'gold.dark.strongInk 应为深字 #1E1503');

  assert.match(CONSTANTS, /export function accentButtonColors/, 'constants.js 应导出 accentButtonColors');
  assert.equal(typeof accentButtonColors, 'function', 'accentButtonColors 应可直接 import');
  assert.match(CONSTANTS, /return \{ bg: t\.strongBg, text: t\.strongInk, strong: t\.strongBg, ink: t\.strongInk \};/,
    'accentButtonColors 应直接查表返回 strongBg / strongInk（无亮度分流）');
});

test('G3 四个注入点都走 16 个原始变量（applyAccentThemeTokens / getAccentColors）', () => {
  const sites = [
    'docs/src/core/boot/theme.js',
    'docs/src/core/boot/bootstrap.js',
    'docs/src/entries/pages/settings-entry.js',
    'docs/src/components/governance/org-setup-wizard.js',
  ];
  for (const rel of sites) {
    const src = read(rel);
    assert.match(src, /(applyAccentThemeTokens|getAccentColors)\(/, `${rel} 应经主题表取色 / 注入（不写死旧三件套）`);
    assert.doesNotMatch(src, /--app-accent-text',\s*btn\.text/, `${rel} 不应再写旧 --app-accent-text 三件套`);
    assert.doesNotMatch(src, /--app-accent-strong',\s*btn\.strong/, `${rel} 不应再写旧 --app-accent-strong 三件套`);
  }
  // 原始变量清单 = 8 个 token × 亮/暗
  const theme = read('docs/src/core/boot/theme.js');
  assert.match(theme, /const ACCENT_TOKEN_SUFFIXES = \['base', 'soft-bg', 'soft-border', 'soft-text', 'strong-bg', 'strong-ink', 'hover-bg', 'active-bg'\]/,
    'theme.js 应一次注入 8 个 token 的亮/暗两套');
  assert.match(theme, /--app-accent-\$\{suffix\}-light/, 'theme.js 应写 *-light 原始变量');
  assert.match(theme, /--app-accent-\$\{suffix\}-dark/, 'theme.js 应写 *-dark 原始变量');
});

test('G4 内存样本：gold 实底白字 / red 实底白字 / 非法入参回落 gold', () => {
  const gold = accentButtonColors('gold');
  assert.equal(gold.strong, '#9A6B0F', 'gold 实底应为 strongBg #9A6B0F');
  assert.equal(gold.ink, '#FFFFFF', 'gold 实底字应为 strongInk #FFFFFF');
  assert.equal(gold.bg, '#9A6B0F', '旧字段 bg 应指向 strongBg');

  const red = accentButtonColors('red');
  assert.equal(red.strong, '#9B2C22', 'red 实底应为 strongBg #9B2C22');
  assert.equal(red.ink, '#FFFFFF', 'red 实底字应为白字');

  // 暗色档按表取 *-dark
  const goldDark = accentButtonColors('gold', 'dark');
  assert.equal(goldDark.strong, '#C89A34', 'gold 暗色实底应为 #C89A34');
  assert.equal(goldDark.ink, '#1E1503', 'gold 暗色实底字应为 #1E1503');

  // 非法输入兜底：不崩溃、回落到 gold 主题（不是运行时 var()）
  assert.deepEqual(accentButtonColors(''), {
    bg: '#9A6B0F', text: '#FFFFFF', strong: '#9A6B0F', ink: '#FFFFFF',
  }, '非法入参应回落 gold 主题的显式 token');
});

test('G5 浅底深字 / 焦点环：不得直接用裸 var(--app-accent)', () => {
  const textRules = [
    '.text-accent',
    '.chip-option:hover',
    '.chip-accent-on',
    '.sel-accent-on',
    'button.metric-band__item.is-active .metric-band__label',
    '.page-num.is-current',
    '.wp-dim-chip.wp-dim-on',
    '.wp-brand-chip.wp-brand-on',
    '.wp-agenda-kind.wp-agenda-kind-on',
    '.cs-option.is-selected',
    '.accent-avatar',
    '.metric-band__value--accent',
    '.state-badge--accent',
  ];
  for (const selector of textRules) {
    const body = ruleBody(STYLES, selector);
    assert.ok(body, `styles.css 缺少 ${selector} 规则`);
    assert.match(body, /(?:^|[;\s])color:\s*var\(--app-accent-soft-text\)/,
      `${selector} 的文字色应走 --app-accent-soft-text（浅底深字显式查表）`);
    assert.doesNotMatch(body, /(?:^|[;\s])color:\s*var\(--app-accent\)\s*(?:!important)?\s*;/,
      `${selector} 仍在使用裸 var(--app-accent) 作文字色`);
  }

  const focusRules = [
    'button:focus-visible,\\s*a:focus-visible',
    '.ws-tab-scroll button:focus-visible',
    '.notif-dropdown-item:focus-visible',
    '.status-badge:focus-visible',
    'button.metric-band__item:focus-visible',
    '.list-row:focus-visible',
    '.todo-more__item:focus-visible',
    '.list-row\\[data-interactive="true"\\]:focus-visible',
    '.gallery-card:focus-visible',
  ];
  for (const selector of focusRules) {
    const re = new RegExp(`${selector}\\s*\\{([^}]*)\\}`);
    const m = re.exec(STYLES);
    assert.ok(m, `styles.css 缺少 ${selector} 规则`);
    // 焦点环统一走 --focus-ring（亮色深灰 / 暗色党徽金），不得再用浅底深字 token。
    assert.match(m[1], /outline:\s*2px solid var\(--focus-ring\)/,
      `${selector} 的焦点环应使用 --focus-ring（按主题取色）`);
    assert.doesNotMatch(m[1], /outline:\s*2px solid var\(--app-accent/,
      `${selector} 不得用主题色 token 作焦点环`);
  }
});
