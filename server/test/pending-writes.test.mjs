// server/test/pending-writes.test.mjs — 「成功提示 = 落库已确认」的常驻判据（2026-09-17 批次 49）
//
// 由来（支书 2026-09-17 裁定「全站统一」）：
//   病灶＝**先弹「成功」、落库在后台跑**。全站 `showToast('success', …)` 175 处里约 113 处属此类，
//   根因只有一条：持久化汇聚点 `persist()` 是**同步 void 函数**（api 形态只 `setTimeout` 排一次
//   800ms 防抖快照），调用方无法 await，失败只 `console.warn` ⇒ 用户端零反馈，
//   「提交后立刻关页/刷新」可能提示成功却其实没存上。
//
// 判据分层（两层法，与本仓既有守卫同规）：
//   W1–W4 **行为层**：直接跑 `core/pending-writes.js` 的等待语义（纯 node，无浏览器依赖）。
//   W5–W9 **结构层**：断言「单一等待点」在位、且各写链都登记 —— 防的是「机制还在、接线被悄悄摘掉」
//        （对照 R-67「同一病灶只修一处＝没修完」与 R-73「台账三缺一：漏登记时守卫全绿」）。
//
// 判据一律落在**代码事实**上，不引用文档自述。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { trackWrite, settleWrites, hasPendingWrites } from '../../docs/src/core/pending-writes.js?v=20260922a';

const ROOT = join(import.meta.dirname, '..', '..');
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');

/** 取某个具名函数的源码片段（从声明处到下一个顶格 `}`）——结构层断言用 */
function fnBody(src, decl) {
  const i = src.indexOf(decl);
  assert.notEqual(i, -1, `未找到 ${decl}`);
  const rest = src.slice(i);
  const end = rest.indexOf('\n}');
  return end === -1 ? rest : rest.slice(0, end);
}

// ── 行为层 ────────────────────────────────────────────────────────────

test('W1 在途写全部落地：settleWrites 正常返回，且返回时确已落地', async () => {
  let landed = false;
  trackWrite(new Promise((r) => setTimeout(() => { landed = true; r(); }, 20)));
  assert.equal(hasPendingWrites(), true, '登记后应处于「有在途写」状态');
  await settleWrites();
  assert.equal(landed, true, 'settleWrites 返回时该写必须已经落地');
  assert.equal(hasPendingWrites(), false, '结算干净后不得再有在途写');
});

test('W2 在途写失败：settleWrites 必须抛出（成功提示据此改报失败），且失败只报一次', async () => {
  trackWrite(Promise.reject(new Error('snapshot failed')));
  await assert.rejects(() => settleWrites(), /snapshot failed/);
  await assert.doesNotReject(() => settleWrites(), '失败只报一次，不得反复报（否则后续无关动作也被牵连）');
});

test('W3 长链：等待期间新登记的在途写也要等到（不能只等第一轮）', async () => {
  const seen = [];
  trackWrite(new Promise((r) => setTimeout(() => { seen.push('a'); r(); }, 30)));
  setTimeout(() => {
    trackWrite(new Promise((r) => setTimeout(() => { seen.push('b'); r(); }, 30)));
  }, 10);
  await settleWrites();
  assert.deepEqual(seen, ['a', 'b'], '后登记的那一条也必须等到');
});

test('W4 登记失败但调用方不 await：不得产生 unhandledrejection', async () => {
  // 若 trackWrite 内部没有挂处理器，这条 rejected promise 会以 unhandledrejection 让本文件判红；
  // 故本用例只需「跑过去」即为证据（不额外断言 listener 计数——那是环境态、不是代码事实）。
  trackWrite(Promise.reject(new Error('silent')));
  await new Promise((r) => setTimeout(r, 20));
  await settleWrites().catch(() => {}); // 取走记录，免污染后续用例
});

// ── 结构层 ────────────────────────────────────────────────────────────

test('W5 单一等待点在位：success 提示必须先等落库落地再渲染', () => {
  const src = read('docs/src/core/utils.js');
  const fn = fnBody(src, 'export function showToast(');
  assert.match(fn, /settleWrites\(/, 'success 分支必须先等待落库');
  assert.match(fn, /hasPendingWrites\(/, '需据在途状态给过渡提示与超时判据');
  assert.match(fn, /\.then\(/, '渲染必须发生在等待完成之后（不得同步直接报成功）');
  // 成功文案只允许出现在等待链里：本函数内不得有第二处 success 渲染
  const successRenders = fn.match(/_renderToast\('success'/g) || [];
  assert.equal(successRenders.length, 1, '成功的渲染点应唯一（收口在等待之后）');
  assert.match(fn, /_renderToast\('error'/, '等待失败/超时须改报失败，不得静默');
});

test('W6 Toast 渲染单一源：只允许 core/utils.js 建 toast 容器', () => {
  const src = read('docs/src/core/utils.js');
  assert.match(src, /_toastContainer\.id = 'toast-container'/);
  // 其余文件不得各建一套浮层（否则新写口会绕过 W5 的等待）
  const others = ['docs/src/entries', 'docs/src/components', 'docs/src/services'];
  for (const dir of others) {
    const hits = grepDir(join(ROOT, dir), "toast-container");
    assert.equal(hits.length, 0, `除 utils.js 外不得自建浮层：${hits.join(', ')}`);
  }
});

test('W7 持久化层必须登记：persist 分支与快照排程都要 trackWrite', () => {
  const src = read('docs/src/core/data-adapter.js');
  assert.match(src, /import \{ trackWrite \} from '\.\/pending-writes\.js/, '等待点须静态可用（排程那一刻就要登记）');
  const persistFn = fnBody(src, 'export function persist()');
  assert.match(persistFn, /trackWrite\(/, 'mock 落库失败也须登记（不得只抛给调用点）');
  const schedFn = fnBody(src, 'function _scheduleSnapshot()');
  assert.match(schedFn, /trackWrite\(/, '**排程即登记**——否则成功提示会在「已排程、未 flush」的空窗里提前放行');
});

test('W8 快照失败必须能被等待方看见（不得只告警）', () => {
  const fn = fnBody(read('docs/src/core/data-adapter.js'), 'async function _flushSnapshot()');
  assert.match(fn, /deferred\?\.reject\(/, '失败须结算本次排程的 deferred');
  assert.match(fn, /throw e;/, '失败须向上抛（原实现「仅告警不抛出」＝等待方看不见）');
  // pagehide 同步冲刷由浏览器接管、本上下文无法再观测 ⇒ 必须结算排程，
  // 否则 deferred 永远挂着、settleWrites 会在它上面空等（真机表现为成功提示不出）
  const syncFn = fnBody(read('docs/src/core/data-adapter.js'), 'function _flushSnapshotSync()');
  assert.match(syncFn, /_flushDeferred\?\.resolve\(\)/, 'pagehide 路径须结算排程，防悬挂');
});

test('W9 不走 persist() 的外部写链也要登记；saveDB 不得再用动态 import 触发落库', () => {
  // 反馈处置是独立 localStorage 域，写链直连 REST（不经 persist）⇒ 必须自登记
  assert.match(read('docs/src/services/issues.js'), /trackWrite\(getAdapter\(\)\.issues\.update\(/,
    '反馈处置写链须登记进等待点');
  // 评论写链已于批次 88（2026-09-18 · `D-486` / `D-489`）改走服务层单一写口 `IssueStore.addComment`
  // ⇒ 组件内原有的本地写 catch 与 `trackWrite` 随之下线（read('.../issue-detail.js') 已无 `trackWrite`）；
  //   登记点移到 `services/issues.js` 的 `_syncIssueToApi`（与上一条同链）——本处改守现行形态：
  //   「该服务层外部写链失败也须登记，不得只 console.warn 吞掉」。
  assert.match(read('docs/src/services/issues.js'), /trackWrite\(Promise\.reject\(e\)\)/,
    '服务层外部写链失败须登记（不得只 console.warn 吞掉）');
  // saveDB 原用动态 import 触发 persist：至少延后一个任务 ⇒ 成功提示在空窗里提前放行。
  const saveDbFn = fnBody(read('docs/src/services/mock.js'), 'export function saveDB()');
  assert.doesNotMatch(saveDbFn, /import\(/, 'BranchService 写链不得再用动态 import 触发落库（存在异步空窗）');
  assert.match(saveDbFn, /persist\(\)/, '仍须触发快照写穿（Z1 语义不可丢）');
});

/** 极简目录内文本检索（避免为一个断言引入依赖） */
function grepDir(dir, needle, out = []) {
  let names = [];
  try { names = readdirSync(dir); } catch { return out; }
  for (const name of names) {
    const full = join(dir, name);
    let st = null;
    try { st = statSync(full); } catch { continue; }
    if (st.isDirectory()) { grepDir(full, needle, out); continue; }
    if (!/\.(js|mjs)$/.test(name)) continue;
    if (readFileSync(full, 'utf8').includes(needle)) {
      out.push(full.slice(ROOT.length + 1).replace(/\\/g, '/'));
    }
  }
  return out;
}
