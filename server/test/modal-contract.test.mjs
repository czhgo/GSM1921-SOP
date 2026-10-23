// role: [工程师]+[AI]
// modal-contract.test.mjs — 弹窗交互闭环契约守卫（2026-10-23 · Task 8 / R11 P0-05 · P1-11 · P1-12）
//
// 为什么是静态断言：`docs/src/components/ui/modal.js` 依赖浏览器 DOM，且所有跨模块 import 都带
//   `?v=` 版本查询串（浏览器缓存用），Node 无法直接解析。故本守卫读取源码做「存在性 / 否定性」断言，
//   不启动浏览器、不引入 Playwright。
// 覆盖：
//   M1 提交中 `_requestCancel` 早退（Esc / 遮罩 / × / [data-modal-cancel] 四路统一挂起）
//   M2 `setModalBusy` 写 `aria-busy`，且 openFormModal 的 setBusy 调用它
//   M3 错误区 / 字段错误行带 `role="alert"`
//   M4 `onSubmit` 只有显式 true / {ok:true} 才关窗（undefined 不关）
//   M5 三处原生 prompt / confirm 已移除
// 运行：node --test server/test/modal-contract.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const MODAL = readFileSync(join(ROOT, 'docs/src/components/ui/modal.js'), 'utf8');

/** 截取 `function name` / `async function name` / `export function name` 到下一个顶层 export */
function fnSource(src, name) {
  const start = src.search(new RegExp(`(?:export\\s+)?(?:async\\s+)?function\\s+${name}\\s*\\(`));
  assert.notEqual(start, -1, `找不到函数 ${name}`);
  const next = src.indexOf('\nexport ', start + 1);
  return src.slice(start, next === -1 ? src.length : next);
}

test('M1 _requestCancel 在提交中早退（四条关闭路径统一挂起）', () => {
  const src = fnSource(MODAL, '_requestCancel');
  assert.match(src, /_busyIds\.has\(id\)\)\s*return;/, '提交中必须直接 return，不得进入 onCancel/closeModal');
  // 早退必须发生在执行 onCancel 与 closeModal 之前
  const busyIdx = src.indexOf('_busyIds.has(id)');
  const cancelIdx = src.indexOf('_cancelHandlers.get(id)');
  const closeIdx = src.indexOf('closeModal(id)');
  assert.ok(busyIdx !== -1 && cancelIdx !== -1 && closeIdx !== -1, '_requestCancel 结构缺失');
  assert.ok(busyIdx < cancelIdx && busyIdx < closeIdx, '忙态早退必须先于 onCancel / closeModal');
});

test('M2 setModalBusy 设置 aria-busy，openFormModal 提交态调用它', () => {
  const src = fnSource(MODAL, 'setModalBusy');
  assert.match(src, /aria-busy/, 'setModalBusy 应设置 aria-busy');
  assert.match(src, /panel\.setAttribute\('aria-busy'/, '面板应标 aria-busy');
  const form = fnSource(MODAL, 'openFormModal');
  assert.match(form, /setModalBusy\(id,\s*busy\)/, 'openFormModal 的提交态应统一走 setModalBusy');
});

test('M3 错误区与字段错误行使用 role="alert"', () => {
  assert.match(MODAL, /class="modal-form-error"\s+data-modal-error\s+role="alert"/,
    '通用错误区应带 role="alert"');
  assert.match(MODAL, /data-field-error="\$\{escHtml\(key\)\}"\s+role="alert"/,
    '字段错误行应带 role="alert"');
});

test('M4 onSubmit 契约：仅显式 true / {ok:true} 关窗，undefined 不关', () => {
  const helper = fnSource(MODAL, 'shouldCloseOnResult');
  assert.match(helper, /return\s+result\s*===\s*true\s*\|\|\s*\(!!result\s*&&\s*result\.ok\s*===\s*true\);/,
    'shouldCloseOnResult 必须只认 true / {ok:true}');
  const form = fnSource(MODAL, 'openFormModal');
  assert.match(form, /shouldCloseOnResult\(result\)/, 'openFormModal 必须以 shouldCloseOnResult 判定关窗');
  assert.match(form, /result\s*===\s*undefined/, 'undefined 必须走「保留浮窗」分支');
  assert.doesNotMatch(form, /if\s*\(result\s*===\s*false\)\s*\{\s*setBusy\(false\);\s*return;\s*\}[\s\S]{0,200}closeModal\(id\)/,
    '不得再把 false / undefined 当成功关窗');
});

test('M5 三处原生 prompt / confirm 已移除并改用统一浮窗', () => {
  const issueDetail = readFileSync(join(ROOT, 'docs/src/components/feedback/issue-detail.js'), 'utf8');
  const feedbackTab = readFileSync(join(ROOT, 'docs/src/entries/tabs/secretary/feedback-tab.js'), 'utf8');
  const reviewTab = readFileSync(join(ROOT, 'docs/src/entries/tabs/disc/review-tab.js'), 'utf8');

  assert.doesNotMatch(issueDetail, /(?<![.\w])prompt\s*\(/, 'issue-detail.js 不得再调用原生 prompt');
  assert.match(issueDetail, /openFormModal\(/, 'issue-detail.js 应改用 openFormModal');
  assert.doesNotMatch(feedbackTab, /(?<![.\w])prompt\s*\(/, 'feedback-tab.js 不得再调用原生 prompt');
  assert.match(feedbackTab, /openFormModal\(/, 'feedback-tab.js 应改用 openFormModal');
  assert.doesNotMatch(reviewTab, /window\.(?:confirm|prompt)\s*\(/, 'review-tab.js 不得再调用原生 confirm/prompt');
  assert.match(reviewTab, /openModal\(/, 'review-tab.js 的二次确认应改用 openModal');
});
