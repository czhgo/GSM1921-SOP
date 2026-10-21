// server/test/ui-focus-ring.test.mjs — 焦点可见性守卫（2026-10-21 · R5A-04/05）
//
// 来源：`.ctx/logs/archive/2026-10/AUDIT_R5_A_WEB_GUIDELINES.md` R5A-04/05。
// 判据：
//   F1 亮色 / 暗色各有一套 --focus-ring（亮色深灰 / 暗色党徽金），暗色不得沿用深灰；
//   F2 全局 button/a:focus-visible 只声明一次 outline，且用 --focus-ring（深灰不得覆盖金环）；
//   F3 输入族（.input-flat / 登录框 / .cs-trigger）聚焦不只改 border：必须有实线 outline；
//   F4 对比度：焦点环 vs 所在底色 ≥ 3:1（WCAG 1.4.11 非文本对比）；
//   F5 非空转：对比度函数有正/负例，规则抽取不把不存在规则当命中。
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
const LIGHT_SURFACE = '#FAFAF5';

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

test('F1 亮色 / 暗色各有一套 --focus-ring，暗色取党徽金', () => {
  const light = STYLES.match(/--focus-ring:\s*([^;]+);/)?.[1]?.trim() || '';
  assert.equal(light, '#1F2937', `亮色 --focus-ring 应为深灰 #1F2937，实测 ${light}`);
  const darkBlock = STYLES.match(/html\.theme-dark\s*\{([\s\S]*?)\n\s*\}/)?.[1] || '';
  assert.ok(darkBlock, '缺少 html.theme-dark 变量块');
  assert.match(darkBlock, /--focus-ring:\s*var\(--party-gold\)/, '暗色 --focus-ring 应为党徽金');
  assert.doesNotMatch(darkBlock, /--focus-ring:\s*#1F2937/, '暗色不得沿用深灰焦点环');
});

test('F2 全局 button/a 焦点环只有一条 outline，且不被 --app-accent-text 覆盖', () => {
  const body = _ruleBody(STYLES, 'button:focus-visible,\na:focus-visible');
  assert.ok(body, '缺少全局 button/a:focus-visible 规则');
  const outlines = body.match(/outline:\s*[^;]+;/g) || [];
  assert.equal(outlines.length, 1, `全局焦点环应只声明一条 outline（避免后一条深灰覆盖金环），实测 ${outlines.length}`);
  assert.match(body, /outline:\s*2px solid var\(--focus-ring\)/, '全局焦点环应使用 --focus-ring');
  assert.doesNotMatch(body, /var\(--app-accent-text\)/, '焦点环不得再用 --app-accent-text');
});

test('F3 输入族聚焦除边框外必须有 outline（不得只改 border-color）', () => {
  const body = _ruleBody(STYLES, '.cs-trigger:focus,\n.cs-trigger:focus-visible');
  assert.ok(body, '缺少输入族统一 focus 规则（应覆盖 .input-flat / 登录框 / .cs-trigger）');
  assert.match(body, /outline:\s*2px solid var\(--focus-ring\)/, '输入族聚焦需 ≥3:1 的实线 outline');
  assert.doesNotMatch(body, /outline:\s*none/, '输入族聚焦不得把 outline 收回 none');
  const consolidated = _ruleBody(STYLES, '.input-flat:focus,\n.input-flat:focus-visible');
  assert.match(consolidated, /outline:\s*2px solid var\(--focus-ring\)/, '.input-flat 聚焦需叠加 outline');
  assert.match(STYLES, /\.input-flat:focus,[\s\S]{0,320}input\.login-input:focus/, '登录框应并入同一焦点规则');
  assert.match(STYLES, /\.input-flat:focus,[\s\S]{0,320}\.cs-trigger:focus,/, '.cs-trigger 应并入同一焦点规则');
});

test('F4 对比度：焦点环 vs 底色 ≥ 3:1', () => {
  assert.ok(_contrast('#1F2937', LIGHT_SURFACE) >= 3, '亮色焦点环 vs 页面底不足 3:1');
  assert.ok(_contrast(GOLD, DARK_SURFACE) >= 3, '暗色党徽金焦点环 vs 深底不足 3:1');
  assert.ok(_contrast(GOLD, LIGHT_SURFACE) < 3,
    '反证失败：党徽金在亮色底本就不足 3:1，故亮色必须用深灰 --focus-ring');
});

test('F5 非空转：对比度函数与规则抽取有正/负例', () => {
  assert.ok(_contrast('#000000', '#FFFFFF') > 20, '对比度函数失效（黑白应约 21:1）');
  assert.ok(_contrast('#FFFFFF', '#FFFFFF') === 1, '同色对比度应为 1');
  assert.equal(_ruleBody('a { color: red; }', '.not-exist:focus'), '', '不存在的选择器应返回空');
});
