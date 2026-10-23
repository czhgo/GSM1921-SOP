// role: [工程师]+[AI]
// server/test/feedback-integrity.test.mjs — 操作结果反馈可信（R11 P0-03 / P0-04 · Task 7）
//
// 判据分层（与 pending-writes.test.mjs 同规）：
//   F1 结构层：拥有的文件里不得出现「catch 之后仍报 success」的形态（近似正则，允许注释行）；
//   F2 行为层：动作作用域互不污染、settleScope 幂等、全局兜底仍可用；
//   F3 裁决层：showToast 在 scope 失败时 resolve 为失败文案（桩 DOM + 桩计时器，不依赖浏览器）；
//   F4 反例层：三处已知反例的源码不再复现旧形态。
//
// 纯 node：不起 server、不开浏览器；不 import playwright。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  beginWriteScope, endWriteScope, trackWrite, settleWrites, settleScope,
  hasPendingWrites, peekLastError,
} from '../../docs/src/core/session/pending-writes.js?v=20261023b';
import { showToast, resolveToastOutcome } from '../../docs/src/core/base/utils.js?v=20261023b';

const ROOT = join(import.meta.dirname, '..', '..');
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');

/** 本任务拥有（可改）的文件 —— F1 的检查面 */
const OWNED = [
  'docs/src/core/base/utils.js',
  'docs/src/core/session/pending-writes.js',
  'docs/src/data/data-adapter.js',
  'docs/src/entries/pages/activity-entry.js',
  'docs/src/entries/pages/activity-materials-entry.js',
  'docs/src/services/governance/issues.js',
  'docs/src/entries/tabs/org/roster-tab.js',
  'docs/src/workflow/engine.js',
];

/**
 * 找出「catch 块之后同一函数内紧跟 showToast('success'」的位置（近似正则）。
 * 只跨过纯 console.warn/error/log 行与注释行：其它语句一出现即视为另一段逻辑，不再计入。
 * @returns {string[]} `file:line`
 */
function catchThenSuccessHits(rel, src) {
  const lines = src.split('\n');
  const hits = [];
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (line.trim().startsWith('//')) continue;
    const ci = line.indexOf('catch');
    if (ci === -1) continue;
    // catch 必须有块；无块（极少见）跳过
    const bi = line.indexOf('{', ci);
    if (bi === -1) continue;
    let depth = 0;
    for (let c = bi; c < line.length; c += 1) {
      if (line[c] === '{') depth += 1;
      else if (line[c] === '}') depth -= 1;
    }
    let j = i;
    while (depth > 0 && j + 1 < lines.length) {
      j += 1;
      for (const ch of lines[j]) {
        if (ch === '{') depth += 1;
        else if (ch === '}') depth -= 1;
      }
    }
    for (let k = j + 1; k <= Math.min(j + 3, lines.length - 1); k += 1) {
      const t = lines[k].trim();
      if (!t || t.startsWith('//')) continue;
      if (/showToast\(\s*'success'/.test(t)) { hits.push(`${rel}:${k + 1}`); break; }
      if (!/^console\.(warn|error|log)\(/.test(t)) break;
    }
  }
  return hits;
}

// ── F1 结构层 ────────────────────────────────────────────────────────
test('F1 拥有的文件中不得存在「catch 之后仍报成功」', () => {
  const hits = [];
  for (const rel of OWNED) hits.push(...catchThenSuccessHits(rel, read(rel)));
  assert.deepEqual(hits, [], `catch 块之后仍报 success（失败的证据被成功吞没）：\n${hits.join('\n')}`);
});

// ── F2 行为层：动作作用域 ──────────────────────────────────────────
test('F2a 两个作用域互不污染：A 失败不影响 B 的成功判定', async () => {
  const a = beginWriteScope();
  trackWrite(Promise.reject(Object.assign(new Error('A 写失败'), { status: 403 })), a);
  const b = beginWriteScope();
  trackWrite(Promise.resolve('ok'), b);

  await assert.doesNotReject(() => settleScope(b), 'B 动作不得因 A 的失败被改判');
  await assert.doesNotReject(() => settleScope(b), 'settleScope 必须幂等（重复等待不得再抛）');
  await assert.rejects(() => settleScope(a), /A 写失败/, 'A 的失败必须报给 A 自己');
  await assert.doesNotReject(() => settleScope(a), '取走一次后不得反复报（否则后续无关动作被牵连）');
  assert.equal(hasPendingWrites(), false, '两个作用域结算后不应再有在途写');
});

test('F2b 作用域内的失败不进入全局兜底；全局兜底仍可用于无作用域写入', async () => {
  const scope = beginWriteScope();
  trackWrite(Promise.reject(new Error('scoped only')), scope);
  await assert.rejects(() => settleScope(scope), /scoped only/);
  assert.equal(peekLastError(), null, '作用域失败不得污染全局兜底');
  await assert.doesNotReject(() => settleWrites(), '作用域失败不得让全局等待方误报');

  trackWrite(Promise.reject(new Error('global failure')));
  await new Promise((r) => setImmediate(r));
  assert.ok(peekLastError() instanceof Error, 'peekLastError 应能在不清空的前提下看到失败');
  await assert.rejects(() => settleWrites(), /global failure/);
  assert.equal(peekLastError(), null, 'settleWrites 取走后应清空');
});

test('F2c 未显式传 scope 的写会归属当前活动作用域（持久化层登记即可受控）', async () => {
  const scope = beginWriteScope();
  trackWrite(Promise.reject(new Error('implicit scope')));
  await assert.rejects(() => settleScope(scope), /implicit scope/);
  assert.equal(peekLastError(), null, '隐式归属的失败不得同时落在全局兜底');
});

test('F2d endWriteScope 幂等：重复关闭不抛、不破坏外层作用域', async () => {
  const outer = beginWriteScope();
  const inner = beginWriteScope();
  endWriteScope(inner);
  endWriteScope(inner);
  trackWrite(Promise.reject(new Error('outer failure')));
  await assert.rejects(() => settleScope(outer), /outer failure/, '内层关闭后写应归属外层');
});

// ── F3 裁决层：showToast 的失败文案 ────────────────────────────────
test('F3a resolveToastOutcome 按 401/403/408/409/500 分级，不透出原始异常', () => {
  const cases = [
    [401, /登录已过期/],
    [403, /无权办理/],
    [409, /已被他人更新/],
    [428, /页面版本过旧/],
    [408, /服务暂时不可用/],
    [500, /服务暂时不可用/],
  ];
  for (const [status, re] of cases) {
    const out = resolveToastOutcome({ message: '已保存', error: { status } });
    assert.equal(out.ok, false, `HTTP ${status} 不得裁决为成功`);
    assert.match(out.message, re, `HTTP ${status} 文案未分级`);
    assert.doesNotMatch(out.message, /HTTP\s*\d{3}|status\s*\d{3}|Error/, '不得把状态码或异常名透给用户');
  }
  assert.deepEqual(
    resolveToastOutcome({ message: '已保存', timedOut: true }),
    { ok: false, type: 'error', message: '保存超时，请检查网络后重试' },
  );
  assert.deepEqual(
    resolveToastOutcome({ message: '已保存' }),
    { ok: true, type: 'success', message: '已保存' },
  );
});

test('F3b showToast(success, …, { scope }) 在 scope 失败时 resolve 为失败文案', async () => {
  const realDocument = globalThis.document;
  const realRaf = globalThis.requestAnimationFrame;
  const realSetTimeout = globalThis.setTimeout;
  const el = () => {
    const node = {
      style: {}, children: [], isConnected: true, textContent: '', type: '',
      setAttribute() {},
      appendChild(child) { this.children.push(child); if (child) child.isConnected = true; return child; },
      addEventListener() {},
      contains() { return false; },
      remove() { this.isConnected = false; },
    };
    return node;
  };
  globalThis.document = { createElement: el, body: el() };
  globalThis.requestAnimationFrame = (cb) => { cb(); return 0; };
  // 桩计时器：不让 2.5s 自动消失计时拖住测试（Promise.race 的 settled 分支先于计时器完成）
  globalThis.setTimeout = () => 0;

  try {
    const scope = beginWriteScope();
    trackWrite(Promise.reject(Object.assign(new Error('conflict'), { status: 409 })), scope);
    const outcome = await showToast('success', '已保存', { scope });
    assert.equal(outcome.ok, false, 'scope 失败时不得 resolve 为成功');
    assert.match(outcome.message, /已被他人更新，请刷新后重试/);
    assert.doesNotMatch(outcome.message, /已保存/);
  } finally {
    globalThis.document = realDocument;
    globalThis.requestAnimationFrame = realRaf;
    globalThis.setTimeout = realSetTimeout;
    if (realDocument === undefined) delete globalThis.document;
  }
});

// ── F4 反例层：已知三处不再复现 ───────────────────────────────────
test('F4a activity-entry：工作组保存失败不再报成功，成功后刷新', () => {
  const src = read('docs/src/entries/pages/activity-entry.js');
  assert.match(src, /const outcome = await showToast\('success', '活动工作组成员与权限已保存'\)/,
    '工作组保存须用 showToast 的裁决决定是否刷新');
  assert.doesNotMatch(src, /catch \(error\) \{ console\.warn\('\[activity-entry\] 工作组保存未结算/,
    '旧形态（吞错后仍报成功）不得复现');
});

test('F4b activity-materials：归档用动作作用域，失败文案走 describeWriteError', () => {
  const src = read('docs/src/entries/pages/activity-materials-entry.js');
  assert.match(src, /showToast\('success', '活动已归档[^']*', \{ scope \}\)/,
    '归档成功提示必须绑定本次动作作用域');
  assert.match(src, /_archiveError = describeWriteError\(err\)/, '失败文案须分级，不得直接展示原始异常');
  assert.doesNotMatch(src, /catch \(e\) \{ console\.warn\('\[activity-materials\]/,
    '旧形态（吞错后仍报成功）不得复现');
});

test('F4c issues.approveDraft：写入必须 trackWrite，不得只 console.warn', () => {
  const src = read('docs/src/services/governance/issues.js');
  assert.match(src, /const write = getAdapter\(\)\.issues\.create\(/, '草稿通过的服务端写入须持有 promise');
  assert.match(src, /trackWrite\(write\)/, '该 promise 必须登记进等待点（调用方的成功提示据此改判）');
  assert.doesNotMatch(src, /\.catch\(\(e\) => console\.warn\('\[IssueStore\] 草稿通过写入服务端失败/,
    '失败不得只告警后静默');
});

test('F4d roster-tab：部分失败只报一条汇总 error，不得同时报成功', () => {
  const src = read('docs/src/entries/tabs/org/roster-tab.js');
  const start = src.indexOf('async function _confirmSpImport');
  assert.notEqual(start, -1, '未找到 _confirmSpImport');
  const end = src.indexOf('新增成员（openFormModal', start);
  // 去掉注释行（注释里会引用旧文案「（N 条失败）」作为说明，不参与断言）
  const body = src.slice(start, end === -1 ? undefined : end)
    .split('\n').filter((l) => !l.trim().startsWith('//') && !l.trim().startsWith('*')).join('\n');
  assert.doesNotMatch(body, /条失败/, '不得再出现「成功（N 条失败）」的混合提示');
  assert.match(body, /if \(fails\.length\) \{[\s\S]*showToast\('error'/, '有失败时须以 error 汇总');
  assert.match(body, /else if \(okN\) \{[\s\S]*showToast\('success'/, '全部成功才允许 success');
});

test('F4e workflow.engine：onEnter 抛错时结果不得是 success:true', () => {
  const src = read('docs/src/workflow/engine.js');
  assert.match(src, /let onEnterError = null;/);
  assert.match(src, /success: !onEnterError, error: onEnterError/, '错误须随结果返回，调用方可见');
  assert.doesNotMatch(src, /return \{ from, to: targetName, success: true \}/, '旧形态不得复现');
});
