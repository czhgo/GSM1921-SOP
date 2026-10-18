// server/test/person-picker-density.test.mjs — 选择人员去框与行层级守卫（2026-10-18 立 · Task 6）
//
// 来源：Spec「工作台密度与组件重组」Task 6 / 「选择人员无框行」。
//   病灶：每行姓名前有姓氏色块，行本身套完整边框，选中再叠一层边框；姓名与元信息
//   字号漂移，面板控件高度不受控。
//
// 单一源关系：
//   · 行结构 / 字号 / 选中态 ＝ docs/src/components/person-picker.css；
//   · 行标记 ＝ docs/src/components/governance/person-picker.js；
//   · 行高与间距令牌 ＝ docs/src/styles.css 的 --row-standard / --space-*。
//
// 判据：
//   D1 person-picker.js 不得再输出姓氏头像框（person-picker-item-avatar）；
//   D2 行载体不得有 1.5px 边框；选中态不得再写 border-color；
//   D3 姓名 0.875rem（14px）、元信息 0.75rem（12px）；
//   D4 行高取 40px 或 var(--row-standard)，内边距 4/12（两级文字 + 40px 硬档）；
//   D5 搜索框高 34px、党小组筛选按钮高 28px。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const JS = join(ROOT, 'docs', 'src', 'components', 'governance', 'person-picker.js');
const CSS = join(ROOT, 'docs', 'src', 'components', 'person-picker.css');

const jsSrc = readFileSync(JS, 'utf8');
const cssSrc = readFileSync(CSS, 'utf8');

/** 极简规则切分：只取「选择器 { 声明 }」；先剥注释，避免注释中的词语误判 */
function cssRules(css) {
  const out = [];
  const re = /([^{}]+)\{([^{}]*)\}/g;
  let m;
  while ((m = re.exec(css.replace(/\/\*[\s\S]*?\*\//g, ''))) !== null) {
    out.push({ selector: m[1].trim(), body: m[2] });
  }
  return out;
}

const RULES = cssRules(cssSrc);
const ruleOf = (needle, bodyNeedle) => RULES.find((r) => r.selector.includes(needle)
  && (!bodyNeedle || bodyNeedle.test(r.body)));

test('D1 选择人员不再输出姓氏头像框', () => {
  assert.ok(!jsSrc.includes('person-picker-item-avatar'),
    'person-picker.js 仍输出 person-picker-item-avatar ⇒ 姓氏色块须彻底删除，不得用其他色块替代');
});

test('D2 行载体无完整边框，选中态不再写 border-color', () => {
  const bordered = RULES.filter((r) => /\.person-picker-item(?![\w-])/.test(r.selector)
    && /border\s*:\s*1\.5px/.test(r.body));
  assert.deepEqual(bordered.map((r) => r.selector), [],
    '行载体仍出现 border: 1.5px ⇒ 行本身不得有完整边框（分隔线只由相邻选择器出 hairline）');

  const selected = RULES.filter((r) => /\.person-picker-item\.selected/.test(r.selector)
    && /border-color/.test(r.body));
  assert.deepEqual(selected.map((r) => r.selector), [],
    '选中态仍写 border-color ⇒ 选中只用整行底色 + 右侧勾，不加边框');
});

test('D3 姓名 14px / 元信息 12px', () => {
  const name = ruleOf('.person-picker-item-name', /font-size/);
  assert.ok(name, '缺少 .person-picker-item-name 规则');
  assert.match(name.body, /font-size:\s*0\.875rem/, '姓名应为 0.875rem（14px）');

  const meta = ruleOf('.person-picker-item-meta-text');
  assert.ok(meta, '缺少 .person-picker-item-meta-text 规则');
  assert.match(meta.body, /font-size:\s*0\.75rem/, '学号 / 党小组 / 角色应为 0.75rem（12px）');
});

test('D4 行高 40px、内边距 4/12', () => {
  const row = ruleOf('.person-picker-item', /min-height/);
  assert.ok(row, '缺少行载体的 min-height 规则');
  assert.match(row.body, /min-height:\s*(?:40px|var\(--row-standard\))/,
    '行高应为 40px 或 var(--row-standard)');
  assert.match(row.body, /padding:\s*var\(--space-1\)\s+var\(--space-3\)/,
    '行内边距应为 4/12（var(--space-1) var(--space-3)）');
  assert.match(row.body, /border:\s*0/, '行本身不得有完整边框');
});

test('D5 搜索框 34px、党小组筛选 28px', () => {
  const search = ruleOf('.person-picker-search');
  assert.ok(search, '缺少 .person-picker-search 规则');
  assert.match(search.body, /height:\s*34px/, '搜索框高度应为 34px');

  const tab = ruleOf('.person-picker-tab', /min-height/);
  assert.ok(tab, '缺少 .person-picker-tab 的 min-height 规则');
  assert.match(tab.body, /min-height:\s*28px/, '党小组筛选按钮高度应为 28px');
});
