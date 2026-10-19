// role: [工程师]+[AI]
// modal-escape-guard.test.mjs — 通用浮窗（modal.js）插值转义守卫（R4-F01，2026-10-19）
//
// 背景：openModal 的 title、openFormModal 的 label / placeholder / value / option / 错误文本
//   都可能来自用户输入或服务端数据。任何一处直接拼进 innerHTML 都是存储型 XSS 的入口。
// 判据：上述「用户数据」插值必须逐项经过 escHtml；内部结构变量（bodyHtml / closeBtnHTML / titleId 等）
//   属受控模板，不在此列。
// 非空转：正 / 负样本自检（escHtml(...) 通过；裸 f.label / o.value 必须被识别）。
// 运行：node --test server/test/modal-escape-guard.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const MODAL = readFileSync(join(ROOT, 'docs/src/components/ui/modal.js'), 'utf8');

/** 截取某个导出函数的源码（到下一个顶层 export 为止） */
function exportSource(name) {
  const start = MODAL.indexOf(`export function ${name}`);
  assert.notEqual(start, -1, `modal.js 中找不到 export function ${name}`);
  const next = MODAL.indexOf('\nexport ', start + 1);
  return MODAL.slice(start, next === -1 ? MODAL.length : next);
}

/** 用户数据插值（只认「整段就是一个用户数据引用」的 ${…}，不含表达式 / 函数调用） */
const USER_EXPR = /^(?:title|f\.label|f\.placeholder|f\.key|o\.label|o\.value|val|submitLabel|settingsLink\.(?:href|text))$/;

/**
 * 扫描未转义的用户数据插值。
 * `escHtml(f.label)` 的表达式整体是函数调用，不会命中 USER_EXPR ⇒ 视为已转义。
 */
function unescapedUserInterpolations(src) {
  const out = [];
  for (const m of src.matchAll(/\$\{([^{}]*)\}/g)) {
    const expr = m[1].trim();
    if (USER_EXPR.test(expr)) out.push(expr);
  }
  return out;
}

test('M1 非空转自检：escHtml(...) 通过，裸用户数据必须被识别', () => {
  const positive = '<label>${escHtml(f.label)}</label><option value="${escHtml(o.value)}">${escHtml(o.label)}</option>';
  const negative = '<label>${f.label}</label><input value="${val}" placeholder="${f.placeholder}">';
  assert.deepEqual(unescapedUserInterpolations(positive), [],
    '正值样本（全部 escHtml）不应被判为未转义');
  assert.deepEqual(unescapedUserInterpolations(negative), ['f.label', 'val', 'f.placeholder'],
    '负值样本（裸用户数据）应被逐项识别');
});

test('M2 openModal：title / settingsLink 先转义再插入', () => {
  const src = exportSource('openModal');
  assert.match(src, /const safeTitle = escHtml\(title\)/, 'openModal 应先把 title 转义');
  assert.match(src, /\$\{safeTitle\}/, 'openModal 标题应插入转义后的 safeTitle');
  assert.deepEqual(unescapedUserInterpolations(src), [],
    `openModal 存在未转义的用户数据插值：${unescapedUserInterpolations(src).join(', ')}`);

  // 页脚「相关设置」深链由 settingsLinkHTML 渲染（openModal 只负责挂载），转义判据落在该函数
  const settings = exportSource('settingsLinkHTML');
  assert.match(settings, /escHtml\(settingsLink\.href\)/, 'settingsLink.href 应转义');
  assert.match(settings, /escHtml\(settingsLink\.text\)/, 'settingsLink.text 应转义');
  assert.doesNotMatch(settings, /href="\$\{settingsLink\.href\}"/, 'settingsLink.href 不得裸插值');
});

test('M3 openFormModal：label / placeholder / value / option / 错误文本全部过 escHtml', () => {
  const src = exportSource('openFormModal');
  for (const expr of ['f.label', 'f.placeholder', 'f.key', 'o.label', 'o.value', 'val', 'submitLabel']) {
    assert.match(src, new RegExp(`escHtml\\(${expr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`),
      `${expr} 应经 escHtml 转义`);
  }
  assert.match(src, /escHtml\(msg\)/, '字段错误文本应经 escHtml 转义');
  assert.deepEqual(unescapedUserInterpolations(src), [],
    `openFormModal 存在未转义的用户数据插值：${unescapedUserInterpolations(src).join(', ')}`);
});
