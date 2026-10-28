// server/test/ui-custom-select.test.mjs — 自定义下拉键盘可达守卫（2026-10-21 · R5A-03）
//
// 来源：`.ctx/logs/archive/2026-10/AUDIT_R5_A_WEB_GUIDELINES.md` R5A-03。
// 判据（静态源码）：
//   K1 触发器：稳定 id + aria-labelledby（字段标签 + 当前值）+ aria-haspopup=listbox
//      + aria-expanded + role=combobox + aria-controls；
//   K2 原生 select 只是值载体：tabIndex=-1 且 aria-hidden=true，读屏不再遇到第二个 combobox；
//   K3 listbox 选项可聚焦（tabindex=-1），ArrowUp/Down/Home/End/Enter/Space/Escape 都有分支；
//   K4 打开时焦点进 listbox（无搜索框时落选中/首项），关闭（Esc）时归还触发器；
//   K5 选项键盘焦点有可见样式（主题色 2px / offset 1px / 无 box-shadow）。
//
// 运行：node --test server/test/ui-custom-select.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SELECT = readFileSync(join(ROOT, 'docs', 'src', 'components', 'ui', 'custom-select.js'), 'utf8');
const STYLES = readFileSync(join(ROOT, 'docs', 'src', 'styles.css'), 'utf8');

test('K1 触发器：id / aria-labelledby / combobox / haspopup / expanded / controls', () => {
  assert.match(SELECT, /trigger\.id\s*=\s*`\$\{sel\.id/, '触发器应有稳定 id（取原生 select id）');
  assert.match(SELECT, /trigger\.setAttribute\('role',\s*'combobox'\)/, '触发器应暴露 role=combobox');
  assert.match(SELECT, /trigger\.setAttribute\('aria-labelledby',\s*labelledBy\.join\(' '\)\)/,
    '触发器应把字段标签 + 当前值串成 aria-labelledby');
  assert.match(SELECT, /sel\.labels/, '应从原生 select 的 label 取字段名');
  assert.match(SELECT, /trigger\.setAttribute\('aria-haspopup',\s*'listbox'\)/, '缺 aria-haspopup=listbox');
  assert.match(SELECT, /trigger\.setAttribute\('aria-expanded',\s*'false'\)/, '缺初始 aria-expanded=false');
  assert.match(SELECT, /trigger\.setAttribute\('aria-controls',\s*menu\.id\)/, '缺 aria-controls（指向 listbox）');
});

test('K2 原生 select：tabIndex=-1 + aria-hidden，避免重复控件', () => {
  assert.match(SELECT, /sel\.tabIndex\s*=\s*-1/, '原生 select 应移出 Tab 序列');
  assert.match(SELECT, /sel\.setAttribute\('aria-hidden',\s*'true'\)/, '原生 select 应 aria-hidden=true');
});

test('K3 listbox 选项可聚焦，方向键 / Home / End / Enter / Space / Esc 齐备', () => {
  assert.match(SELECT, /item\.tabIndex\s*=\s*-1/, '选项应可编程聚焦');
  assert.match(SELECT, /menu\.addEventListener\('keydown'/, 'listbox 缺 keydown 处理');
  for (const key of ['ArrowDown', 'ArrowUp', 'Home', 'End', 'Enter', 'Escape']) {
    assert.match(SELECT, new RegExp(`case '${key}'`), `缺 ${key} 键分支`);
  }
  assert.match(SELECT, /case ' ':/, '缺 Space 选择分支');
  assert.match(SELECT, /function _enabledOptions\(menu\)/, '缺「可聚焦选项」收集（须排除禁用项与搜索过滤项）');
  assert.match(SELECT, /is-disabled/, '_enabledOptions 应排除禁用项');
  assert.match(SELECT, /style\.display !== 'none'/, '_enabledOptions 应排除被搜索过滤隐藏的项');
});

test('K4 打开焦点进 listbox；Esc 关闭后归还触发器', () => {
  assert.match(SELECT, /_enabledOptions\(menu\)\[0\][\s\S]{0,40}\|\|\s*menu/, '无选项时应聚焦 listbox 自身');
  assert.match(SELECT, /target\.focus\(\)/, '打开菜单后应把焦点移入 listbox');
  assert.match(SELECT, /_closeMenu\(wrapper,\s*menu,\s*trigger,\s*\{\s*restoreFocus:\s*true\s*\}\)/,
    'Esc 关闭应回焦触发器');
  assert.match(SELECT, /if \(restoreFocus\) trigger\.focus\(\)/, 'restoreFocus 分支应真正回焦');
  assert.match(SELECT, /function _selectOption/, '选择应走单一入口（写回 + change + 关闭 + 回焦）');
});

test('K5 选项键盘焦点可见（主题色 2px / offset 1px / 无光晕）', () => {
  const rule = STYLES.match(/\.cs-option:focus-visible\s*\{([^}]*)\}/)?.[1] || '';
  assert.ok(rule, 'styles.css 缺 .cs-option:focus-visible');
  assert.match(rule, /outline:\s*2px solid var\(--app-accent\)/, '选项焦点应使用主题色 --app-accent');
  assert.match(rule, /outline-offset:\s*1px\s*;/, '选项焦点偏移应为 1px');
  assert.match(rule, /box-shadow:\s*none\s*;/, '选项焦点不得再叠 box-shadow 光晕');
});
