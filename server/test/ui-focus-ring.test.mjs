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

test('F1 亮色 / 暗色各有一套 --focus-ring（暗色改主题色，不再用党徽金）', () => {
  // 2026-10-24 批次 508：暗色环由党徽金改为主题色——金环与金边框会叠成「双金边」。
  const light = STYLES.match(/--focus-ring:\s*([^;]+);/)?.[1]?.trim() || '';
  assert.equal(light, '#1F2937', `亮色 --focus-ring 应为深灰 #1F2937，实测 ${light}`);
  const darkBlock = STYLES.match(/html\.theme-dark\s*\{([\s\S]*?)\n\s*\}/)?.[1] || '';
  assert.ok(darkBlock, '缺少 html.theme-dark 变量块');
  assert.match(darkBlock, /--focus-ring:\s*var\(--app-accent\)/, '暗色 --focus-ring 应为主题色');
  assert.doesNotMatch(darkBlock, /--focus-ring:\s*var\(--party-gold\)/, '暗色不得再用党徽金当通用焦点环');
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

test('F3 输入族：活动态＝主题色边＋浅晕；键盘 :focus-visible 才出 outline', () => {
  // 2026-10-24 批次 508（字段外壳）：鼠标点击/聚焦只改边框＋3px 浅晕，不再叠近黑外环；
  //   键盘保险由 :focus-visible 的 2px 主题色环承担（a11y 底线不降）。
  const focus = _ruleBody(STYLES, '.input-flat:focus,\n.cs-trigger:focus-within')
    || _ruleBody(STYLES, '.input-flat:focus');
  assert.ok(focus, '缺少 .input-flat:focus 字段外壳规则');
  assert.match(focus, /border-color:\s*var\(--app-accent\)/, '活动态边框应为主题色');
  assert.match(focus, /box-shadow:\s*0 0 0 3px var\(--app-accent-soft-bg\)/, '活动态应有 3px 主题浅晕');
  assert.doesNotMatch(focus.replace(/outline:\s*none;?/g, ''), /outline:\s*(?!none)/,
    '鼠标活动态不得再出 outline（近黑外环的来源）');
  const kb = _ruleBody(STYLES, '.input-flat:focus-visible');
  assert.ok(kb, '缺少 .input-flat:focus-visible 键盘保险');
  assert.match(kb, /outline:\s*2px solid var\(--app-accent\)/, '键盘焦点需 2px 主题色实线环');
});

test('F4 对比度：焦点环 vs 底色 ≥ 3:1', () => {
  // 2026-10-24 批次 508：暗色环改主题色，按默认金主题的 base（#A97A12）核算。
  assert.ok(_contrast('#1F2937', LIGHT_SURFACE) >= 3, '亮色焦点环 vs 页面底不足 3:1');
  assert.ok(_contrast('#A97A12', DARK_SURFACE) >= 3, '暗色主题色焦点环 vs 深底不足 3:1');
  assert.ok(_contrast('#1F2937', DARK_SURFACE) < 3,
    '反证失败：深灰在暗底本就不足 3:1，故暗色必须换主题色环');
});

test('F5 非空转：对比度函数与规则抽取有正/负例', () => {
  assert.ok(_contrast('#000000', '#FFFFFF') > 20, '对比度函数失效（黑白应约 21:1）');
  assert.ok(_contrast('#FFFFFF', '#FFFFFF') === 1, '同色对比度应为 1');
  assert.equal(_ruleBody('a { color: red; }', '.not-exist:focus'), '', '不存在的选择器应返回空');
});

test('F6 顶栏深红底：焦点环作用域改党徽金且 ≥3:1，不改全站 token', () => {
  // 2026-10-27 Task 2（阶段一 · 操作成本）：全局深灰 #1F2937 落在 #7A0010 上仅 1.28:1。
  const HEADER_RED = '#7A0010';
  const body = _ruleBody(STYLES, '#app-header .hamburger-btn:focus-visible');
  assert.ok(body, '缺少顶栏作用域焦点环规则（#app-header .hamburger-btn:focus-visible）');
  assert.match(body, /outline:\s*2px solid var\(--party-gold\)/, '顶栏焦点环应在 #app-header 作用域内改为党徽金');
  assert.match(STYLES, /#app-header \.header-action-btn:focus-visible/, '顶栏动作按钮须纳入党徽金焦点环');
  assert.match(STYLES, /#app-header #notif-btn:focus-visible/, '顶栏通知按钮须纳入党徽金焦点环');
  assert.ok(_contrast(GOLD, HEADER_RED) >= 3,
    `党徽金环 vs 顶栏红底不足 3:1（实测 ${_contrast(GOLD, HEADER_RED).toFixed(2)}）`);
  // 反证：全局深灰在顶栏红底上本就不足 3:1，故必须作用域覆盖。
  assert.ok(_contrast('#1F2937', HEADER_RED) < 3, '反证失败：深灰在顶栏红底上应不足 3:1');
  // 全站 token 不得被这次顶栏修复改动。
  assert.equal(STYLES.match(/--focus-ring:\s*([^;]+);/)?.[1]?.trim(), '#1F2937',
    '全站亮色 --focus-ring 不得随顶栏作用域修复一起改');
});
