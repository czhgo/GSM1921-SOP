// server/test/ui-picker-focus.test.mjs — 选人面板可达性守卫（2026-10-19 立 · Task 5）
//
// 来源：Spec「移动端与主动作硬化」/ Requirement「选人面板可达」。
// 判据（静态源码）：
//   F1 Tab / Shift+Tab 焦点陷阱：焦点在面板内循环，不落到遮罩后的页面；
//   F2 打开时锁 body 滚动，关闭恢复原值；
//   F3 Esc 关闭并回焦打开前的焦点（触发按钮）；
//   F4 resize / orientationchange 重定位；390px 宽度与 left 均收敛在视口内；
//   F5 CSS 不得再用 transition: all（属性变化不可控）。
//
// 单一源：docs/src/components/governance/person-picker.js、docs/src/components/person-picker.css。
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

test('F1 焦点陷阱：Tab / Shift+Tab 在面板内循环', () => {
  assert.match(jsSrc, /e\.key\s*!==\s*'Tab'/, '缺少 Tab 键分支 ⇒ 焦点会落回遮罩后的页面');
  assert.match(jsSrc, /e\.shiftKey/, '缺少 Shift+Tab（反向循环）分支');
  assert.match(jsSrc, /preventDefault\s*\(\s*\)/, '循环到端点时须 preventDefault，阻止浏览器把焦点移出面板');
  assert.match(jsSrc, /_getFocusableElements\s*\(/, '缺少面板内可聚焦元素收集');
  assert.match(jsSrc, /\.contains\s*\(\s*active\s*\)/, '缺少「焦点是否仍在面板内」判断');
  assert.match(jsSrc, /\.focus\s*\(\s*\)/, '循环端点须把焦点移回面板内的首/末元素');
});

test('F2 打开锁 body 滚动，关闭恢复原值', () => {
  assert.match(jsSrc, /document\.body\.style\.overflow\s*=\s*'hidden'/, '打开面板时须锁 body 滚动');
  assert.match(jsSrc, /_prevBodyOverflow/, '须记录打开前的 overflow 原值');
  assert.match(jsSrc, /document\.body\.style\.overflow\s*=\s*this\._prevBodyOverflow/,
    '关闭面板时须恢复打开前的 overflow，而不是硬写某个值');
});

test('F3 Esc 关闭并回焦打开前的焦点', () => {
  assert.match(jsSrc, /e\.key\s*===\s*'Escape'/, '缺少 Esc 关闭分支');
  assert.match(jsSrc, /_lastFocused\s*=\s*document\.activeElement/, '打开面板时须记录当前焦点');
  assert.match(jsSrc, /focusTarget\?\.focus\s*\(/, '关闭后须回焦（优先打开前的焦点，兜底触发按钮）');
});

test('F4 resize / orientationchange 重定位，390px 不出屏', () => {
  assert.match(jsSrc, /addEventListener\('resize'/, '缺少 resize 重定位监听');
  assert.match(jsSrc, /addEventListener\('orientationchange'/, '缺少 orientationchange 重定位监听');
  assert.match(jsSrc, /_positionPanel\s*\(\s*this\._panelEl\s*\)/, '视口变化后须以面板实例重新定位');
  assert.match(jsSrc, /Math\.min\(380,\s*viewportW\s*-\s*16\)/, '面板宽度须收敛在视口内（390px 下不溢出）');
  assert.match(jsSrc, /Math\.max\(8,\s*Math\.min\(rect\.left,/, 'left 须夹在 [8, 视口宽 - 面板宽 - 8] 内');
});

test('F5 CSS 不使用 transition: all', () => {
  assert.ok(!/transition\s*:\s*all\b/.test(cssSrc),
    'person-picker.css 仍含 transition: all ⇒ 收成具体属性（background-color / border-color / color / box-shadow 等）');
});
