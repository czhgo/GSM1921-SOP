// role: [工程师]+[AI]
// gold-accent-guard.test.mjs — 默认「现代金 #F5C518」与金色按钮深色字守卫（S 类，2026-10-19 支书圈定）
//
// 背景：默认金曾是深棕 #A16207（白字对比度够），2026-10-19 支书圈定改回真金 #F5C518。
//   真金是亮色 ⇒ 实底主 CTA 必须用**深色字**（#1F2937），不能沿用白字；
//   淡底次操作同理改走 --app-accent-text。四处注入点（theme / bootstrap / settings / wizard）
//   须统一用 accentButtonColors 按亮度分流，避免「金底白字」与「暗色底深字」两类回归。
//
// 断言：
//   G1 styles.css 默认金 / 深色字令牌 / 两个按钮族的取色变量正确；
//   G2 constants.js 的 participant.hex 为 #F5C518 且导出 accentButtonColors；
//   G3 四个注入点都调用 accentButtonColors 并写入三件套；
//   G4 内存样本自检（亮金 → 本色底 + 深字；党建红 → 压深底 + 白字）。
// 运行：node --test server/test/gold-accent-guard.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ACCENT_COLORS, accentButtonColors } from '../../docs/src/core/domain/constants.js?v=20261022c';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');

const STYLES = read('docs/src/styles.css');
const CONSTANTS = read('docs/src/core/domain/constants.js');

/** 取某选择器的规则体（极简：选择器 { … }，不含嵌套 at-rule） */
function ruleBody(css, selector) {
  const re = new RegExp(`(^|[\\s}])${selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\{([^}]*)\\}`);
  const m = re.exec(css);
  return m ? m[2] : '';
}

test('G1 styles.css：默认金 #F5C518 + 深色字令牌 + 两个按钮族取色变量', () => {
  assert.match(STYLES, /--accent-default:\s*#F5C518\s*;/,
    '默认金令牌 --accent-default 应为 #F5C518');
  assert.match(STYLES, /--accent-default-bg:\s*rgba\(245,\s*197,\s*24,\s*0\.14\)\s*;/,
    '默认金淡底 --accent-default-bg 应为 rgba(245, 197, 24, 0.14)');
  assert.match(STYLES, /--accent-default-border:\s*rgba\(245,\s*197,\s*24,\s*0\.45\)\s*;/,
    '默认金边框 --accent-default-border 应为 rgba(245, 197, 24, 0.45)');
  assert.match(STYLES, /--app-accent-strong:\s*var\(--app-accent\)\s*;/,
    '--app-accent-strong 默认应为本色（var(--app-accent)）');
  assert.match(STYLES, /--app-accent-ink:\s*#1F2937\s*;/,
    '--app-accent-ink 默认应为深色字 #1F2937');
  assert.match(STYLES, /--app-accent-text:\s*#1F2937\s*;/,
    '--app-accent-text 默认应为深色字 #1F2937');

  const accent = ruleBody(STYLES, '.btn-accent');
  assert.ok(accent, 'styles.css 缺少 .btn-accent 规则');
  assert.match(accent, /background:\s*var\(--app-accent-strong\)/,
    '.btn-accent 应使用 var(--app-accent-strong) 作底色');
  assert.match(accent, /color:\s*var\(--app-accent-ink/,
    '.btn-accent 的字体色应使用 var(--app-accent-ink, …)（金色实底配深字）');

  const soft = ruleBody(STYLES, '.btn-accent-soft');
  assert.ok(soft, 'styles.css 缺少 .btn-accent-soft 规则');
  assert.match(soft, /color:\s*var\(--app-accent-text/,
    '.btn-accent-soft 的字体色应使用 var(--app-accent-text, …)（金色淡底配深字）');

  assert.match(STYLES, /\.btn-accent:hover\s*\{[^}]*filter:/, '保留 .btn-accent:hover');
  assert.match(STYLES, /\.btn-accent:disabled\s*\{[^}]*opacity:/, '保留 .btn-accent:disabled');
});

test('G2 constants.js：participant.hex = #F5C518 且导出 accentButtonColors', () => {
  assert.equal(ACCENT_COLORS.participant.hex, '#F5C518',
    'ACCENT_COLORS.participant.hex 应为现代金 #F5C518');
  assert.equal(ACCENT_COLORS.participant.bg, 'rgba(245,197,24,0.14)',
    'participant.bg 应为 rgba(245,197,24,0.14)');
  assert.equal(ACCENT_COLORS.participant.border, 'rgba(245,197,24,0.45)',
    'participant.border 应为 rgba(245,197,24,0.45)');
  assert.match(CONSTANTS, /export function accentButtonColors\(hex\)/,
    'constants.js 应导出 accentButtonColors(hex)');
  assert.equal(typeof accentButtonColors, 'function', 'accentButtonColors 应可直接 import');
});

test('G3 四个注入点都调用 accentButtonColors 并写入三件套', () => {
  const sites = [
    'docs/src/core/boot/theme.js',
    'docs/src/core/boot/bootstrap.js',
    'docs/src/entries/pages/settings-entry.js',
    'docs/src/components/governance/org-setup-wizard.js',
  ];
  for (const rel of sites) {
    const src = read(rel);
    assert.match(src, /import[^;]*accentButtonColors[^;]*domain\/constants\.js\?v=\d{8}[a-z]/,
      `${rel} 应从 core/domain/constants.js 导入 accentButtonColors（带版本戳）`);
    assert.match(src, /accentButtonColors\(accent\)/,
      `${rel} 应在注入 --app-accent 三件套处调用 accentButtonColors(accent)`);
    assert.match(src, /--app-accent-strong',\s*btn\.strong\)/,
      `${rel} 应写入 --app-accent-strong`);
    assert.match(src, /--app-accent-ink',\s*btn\.ink\)/,
      `${rel} 应写入 --app-accent-ink`);
    assert.match(src, /--app-accent-text',\s*btn\.text\)/,
      `${rel} 应写入 --app-accent-text`);
  }
});

test('G5 金色文字 / 焦点环压深：不得直接用裸 var(--app-accent)', () => {
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
    assert.match(body, /(?:^|[;\s])color:\s*(?:var\(--app-accent-text\)|color-mix\(in srgb, var\(--app-accent\) 55%, #000\))/,
      `${selector} 的文字色应使用 --app-accent-text（或加深金），不得直接用本色`);
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
    // R5A-04/05（2026-10-21）：焦点环统一走 --focus-ring（亮色深灰 / 暗色党徽金），
    // 不得再用 --app-accent-text——它在暗色下仍是深灰，深底上 ≈1.15:1。
    assert.match(m[1], /outline:\s*2px solid var\(--focus-ring\)/,
      `${selector} 的焦点环应使用 --focus-ring（按主题取色）`);
    assert.doesNotMatch(m[1], /outline:\s*2px solid var\(--app-accent-text\)/,
      `${selector} 仍在使用暗色下不可见的 --app-accent-text 作焦点环`);
    assert.doesNotMatch(m[1], /outline:\s*2px solid var\(--app-accent\)\s*;/,
      `${selector} 仍在使用裸 var(--app-accent) 作焦点环`);
  }
});

test('G4 内存样本自检：亮金本色底深字 / 党建红压深底白字', () => {
  const gold = accentButtonColors('#F5C518');
  assert.equal(gold.strong, '#F5C518', '亮金实底应为本色（不压深）');
  assert.equal(gold.ink, '#1F2937', '亮金实底字应为深色 #1F2937');
  assert.equal(gold.text, '#1F2937', '亮金淡底字应为深色 #1F2937');

  const red = accentButtonColors('#CE1126');
  assert.match(red.strong, /^color-mix\(in srgb, #CE1126 58%, black\)$/,
    '党建红实底应压深至 58% + 黑');
  assert.equal(red.ink, '#fff', '暗色实底字应为白字');
  assert.match(red.text, /^color-mix\(in srgb, #CE1126 60%, black\)$/,
    '暗色淡底字应压深至 60% + 黑');

  // 非法输入兜底：不崩溃、回落到运行时变量
  assert.deepEqual(accentButtonColors(''), { strong: 'var(--app-accent)', ink: '#fff', text: 'var(--app-accent)' });
});
