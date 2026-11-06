// role: [工程师]+[AI]
// ui-select-appearance-guard.test.mjs — 下拉外观三档与状态一致性守卫（2026-10-20 界面细化批）
//
// 来源：`.ctx/logs/archive/2026-10/UI_REDUNDANCY_AUDIT.md` A-10 / B-21 / C-05 / C-06 / C-08。
// 判据：
//   S1 大字号：styles.css 在 `html.font-size-large` 下必须覆盖菜单四项字号
//      （.cs-option / .cs-group-label / .cs-search-input / .cs-empty）；
//   S2 深色：选中项必须覆写为「近白字 + 主题色淡底」，不得继续用亮色主题注入的深字；
//   S3 禁用：custom-select.js 必须把 select.disabled 同步到触发器（disabled + aria-disabled），
//      并在属性变化时跟随；
//   S4 空态：0 选项时菜单必须渲染「暂无可选项」；
//   S5 分组禁用：optgroup.disabled 必须传递到分组标题与子项（不可选）；
//   S6 非空转：选择器抽取有正/负例，避免「写进注释也算命中」。
// 运行：node --test server/test/ui-select-appearance-guard.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(import.meta.dirname, '..', '..');
const STYLES = readFileSync(join(ROOT, 'docs/src/styles.css'), 'utf8');
const SELECT = readFileSync(join(ROOT, 'docs/src/components/ui/custom-select.js'), 'utf8');

/** 取某选择器后第一对花括号内的声明体（导出给非空转自检复用） */
export function ruleBody(css, selector) {
  const idx = String(css).indexOf(selector);
  if (idx < 0) return '';
  const open = String(css).indexOf('{', idx);
  const close = String(css).indexOf('}', open);
  if (open < 0 || close < 0) return '';
  return String(css).slice(open + 1, close);
}

const LARGE_FONT_RULES = [
  'html.font-size-large .cs-option',
  'html.font-size-large .cs-group-label',
  'html.font-size-large .cs-search-input',
  'html.font-size-large .cs-empty',
];

test('S1 大字号：菜单四项都有字号覆盖（不再 11–12px 卡在 17px 触发器下）', () => {
  for (const selector of LARGE_FONT_RULES) {
    const body = ruleBody(STYLES, selector);
    assert.ok(body, `styles.css 缺少 ${selector} 规则`);
    assert.match(body, /(?:^|[;\s])font-size:\s*[^;]+;/, `${selector} 缺 font-size（大字号档未覆盖）`);
  }
});

test('S2 深色：选中项走主题 soft 三件套（亮/暗由 token 别名选边），不逐点覆盖', () => {
  // 2026-10-23 批次 506：深色不再逐点写 `html.theme-dark .cs-option.is-selected` 补丁——
  //   浅底/深字改为消费 `--app-accent-soft-bg/-soft-text`，`html.theme-dark` 段把 8 个别名
  //   整体切到 `*-dark`（见 theme-palette-guard T1），故日夜同源、也不会「深字叠深底」。
  const body = ruleBody(STYLES, '.cs-option.is-selected');
  assert.ok(body, 'styles.css 缺少 .cs-option.is-selected');
  assert.match(body, /(?:^|[;\s])background:\s*var\(--app-accent-soft-bg\)/, '选中项底色应为 --app-accent-soft-bg');
  assert.match(body, /(?:^|[;\s])color:\s*var\(--app-accent-soft-text\)/, '选中项文字应为 --app-accent-soft-text');
  assert.equal(
    ruleBody(STYLES, 'html.theme-dark .cs-option.is-selected'), '',
    '不应再保留深色逐点补丁（暗色由 --app-accent-soft-* 的 *-dark 别名承担）'
  );
  const darkBlock = STYLES.slice(STYLES.indexOf('html.theme-dark {'));
  assert.match(darkBlock, /--app-accent-soft-bg:\s*var\(--app-accent-soft-bg-dark\)/, '深色段应把 softBg 别名切到 *-dark');
  assert.match(darkBlock, /--app-accent-soft-text:\s*var\(--app-accent-soft-text-dark\)/, '深色段应把 softText 别名切到 *-dark');
});

test('S3 禁用：select.disabled 同步到触发器（disabled + aria-disabled），并监听属性变化', () => {
  assert.match(SELECT, /trigger\.disabled\s*=\s*disabled/, '触发器未同步 disabled');
  assert.match(SELECT, /setAttribute\(\s*'aria-disabled'\s*,\s*'true'\s*\)/, '触发器缺 aria-disabled="true"');
  assert.match(SELECT, /removeAttribute\(\s*'aria-disabled'\s*\)/, '解除禁用时未移除 aria-disabled');
  assert.match(SELECT, /attributeFilter:\s*\['value',\s*'disabled'\]/, 'MutationObserver 未跟随 disabled 属性');
  assert.match(STYLES, /\.cs-trigger:disabled[\s\S]{0,160}cursor:\s*not-allowed/, 'styles.css 缺禁用触发器灰化样式');
});

test('S4 空态：0 选项时菜单渲染「暂无可选项」', () => {
  assert.match(SELECT, /sel\.options\.length\s*===\s*0/, '未判断 0 选项');
  assert.match(SELECT, /暂无可选项/, '0 选项时未渲染「暂无可选项」');
});

test('S5 分组禁用：optgroup.disabled 传递到标题与子项', () => {
  assert.match(SELECT, /node\.disabled/, '未读取 optgroup.disabled');
  assert.match(SELECT, /appendOption\(o,\s*frag,\s*!!node\.disabled\)/, '分组禁用未传递给子项');
  assert.match(SELECT, /head\.classList\.add\('is-disabled'\)/, '分组标题未加禁用态');
  assert.match(STYLES, /\.cs-group-label\.is-disabled/, 'styles.css 缺分组禁用灰态');
});

test('S6 非空转：选择器抽取正/负例', () => {
  assert.match(ruleBody('a { color: red; } html.font-size-large .cs-option { font-size: 1rem; }', 'html.font-size-large .cs-option'),
    /font-size:\s*1rem/, '抽取口径失效：正样本未取到声明体');
  assert.equal(ruleBody('a { color: red; }', 'html.font-size-large .cs-empty'), '', '抽取口径失效：不存在的选择器应返回空');
});
