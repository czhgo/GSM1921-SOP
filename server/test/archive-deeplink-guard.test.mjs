// role: [工程师]+[AI]
// archive-deeplink-guard.test.mjs — 归档深链 / 复盘落点守卫（2026-10-24 · 批次 508）
//
// 为什么要有本守卫：
//   · 归档库此前不读 URL 参数：外部深链 `archive.html?tab=taskforce&id=…` 一律落回
//     「党建活动」且不打开详情；材料页深链 `focusActivityId` 命中折叠区时只滚动不展开，
//     表现为「点了没反应」。活动详情「复盘」也曾指向人才库 / 归档页签（不是复盘承载面）。
//   · 判据：
//       D1 非空转：三个入口文件 + detail-anchor.js 都可读
//       D2 archive-entry.js 读 URLSearchParams 的 tab 与 id，tab 值域含 activity/taskforce/notice
//       D3 prop/archive-tab.js 命中 focusActivityId 时先展开 archive-display-fold，
//          定位失败必须 showToast（不得静默）
//       D4 activity-entry.js 的「复盘」不得再指向 tab=talent / tab=archive
//       D5 detail-anchor.js 必须逐级展开父链 <details>，不可见时返回 false
//   · 口径调整（据实况，不删断言）：
//       D5 的「逐级打开 closest('details')」以**行为**判定——现有实现用 parentElement 链
//       逐级置 `node.open = true`（等价且更早于 closest），因此同时接受
//       `closest('details')` 或 `tagName === 'DETAILS'` 的逐级实现。
// 运行：node --test server/test/archive-deeplink-guard.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');

const ARCHIVE_ENTRY = 'docs/src/entries/pages/archive-entry.js';
const ARCHIVE_TAB = 'docs/src/entries/tabs/prop/archive-tab.js';
const ACTIVITY_ENTRY = 'docs/src/entries/pages/activity-entry.js';
const DETAIL_ANCHOR = 'docs/src/components/ui/detail-anchor.js';

/** 取以 needle 开头的 `{ ... }` 块内部文本（大括号配对） */
function blockStartingAt(src, needle) {
  const i = src.indexOf(needle);
  if (i < 0) return '';
  const start = src.indexOf('{', i);
  if (start < 0) return '';
  let depth = 0;
  for (let p = start; p < src.length; p += 1) {
    if (src[p] === '{') depth += 1;
    else if (src[p] === '}') {
      depth -= 1;
      if (depth === 0) return src.slice(start + 1, p);
    }
  }
  return '';
}

/** 取 `function name(...) { ... }` 的函数体（先越过参数表的右括号，避免默认参数 `{}` 误判） */
function functionBody(src, name) {
  const i = src.indexOf(`function ${name}(`);
  if (i < 0) return '';
  const paren = src.indexOf(')', i);
  if (paren < 0) return '';
  const start = src.indexOf('{', paren);
  if (start < 0) return '';
  let depth = 0;
  for (let p = start; p < src.length; p += 1) {
    if (src[p] === '{') depth += 1;
    else if (src[p] === '}') {
      depth -= 1;
      if (depth === 0) return src.slice(start + 1, p);
    }
  }
  return '';
}

test('D1 非空转：归档入口 / 归档页签 / 活动详情 / 定位工具四个文件都可读', () => {
  for (const rel of [ARCHIVE_ENTRY, ARCHIVE_TAB, ACTIVITY_ENTRY, DETAIL_ANCHOR]) {
    const abs = join(ROOT, rel);
    assert.ok(existsSync(abs), `缺少文件：${rel}`);
    const src = readFileSync(abs, 'utf8');
    assert.ok(src.length > 500, `${rel} 内容过短（${src.length} 字符）：可能读错文件`);
  }
});

test('D2 archive-entry.js：读 URLSearchParams 的 tab 与 id，tab 值域含三页签', () => {
  const src = read(ARCHIVE_ENTRY);
  assert.match(src, /new URLSearchParams\(/, 'archive-entry.js 未读取 URL 参数（深链全部落回默认页签）');
  assert.match(src, /\.get\(\s*['"]tab['"]\s*\)/, 'archive-entry.js 未读取 ?tab=');
  assert.match(src, /\.get\(\s*['"]id['"]\s*\)/, 'archive-entry.js 未读取 ?id=');

  const tabs = /const ARCHIVE_TABS\s*=\s*\[([\s\S]*?)\];/.exec(src)?.[1] || '';
  assert.ok(tabs, 'archive-entry.js 缺少 ARCHIVE_TABS 声明');
  const ids = [...tabs.matchAll(/id:\s*['"]([^'"]+)['"]/g)].map((m) => m[1]);
  assert.deepEqual([...ids].sort(), ['activity', 'notice', 'taskforce'],
    `归档页签值域应恰为 activity/notice/taskforce，实际：${ids.join('/')}`);

  // 合法 tab 才切换（非法值回落 activity）
  assert.match(src, /ARCHIVE_TABS\.some\([^)]*_tabParam[^)]*\)/, 'archive-entry.js 未校验 tab 值域（非法值应回落 activity）');
  // 首帧渲染后按 id 打开详情
  assert.match(src, /_openArchivedDetail\(\s*_focusArchiveId\s*\)/, 'archive-entry.js 未在首帧渲染后按 ?id= 打开详情');
});

test('D3 prop/archive-tab.js：命中 focusActivityId 先展开折叠区，定位失败必须 showToast', () => {
  const src = read(ARCHIVE_TAB);
  const block = blockStartingAt(src, 'if (ctx?.focusActivityId)');
  assert.ok(block, 'archive-tab.js 缺少 `if (ctx?.focusActivityId)` 深链分支');

  const foldAt = block.indexOf('archive-display-fold');
  const openAt = block.search(/\.open\s*=\s*true/);
  const focusAt = block.indexOf('focusActivityAnchor');
  assert.ok(foldAt >= 0, '深链分支未定位 archive-display-fold（折叠区不展开则必然滚不动）');
  assert.ok(openAt >= 0, '深链分支未设置 fold.open = true');
  assert.ok(focusAt >= 0, '深链分支未调用 focusActivityAnchor');
  assert.ok(foldAt < focusAt, '必须先展开 archive-display-fold，再执行 focusActivityAnchor');
  assert.ok(openAt < focusAt, '必须先设置 fold.open = true，再执行 focusActivityAnchor');

  const failAt = block.indexOf('!focusActivityAnchor');
  assert.ok(failAt >= 0, '未判 focusActivityAnchor 的 false 返回（定位失败会被静默吞掉）');
  const after = block.slice(failAt);
  assert.match(after, /showToast\s*\(/, '定位失败必须 showToast 明确提示（不得静默）');
});

test('D4 activity-entry.js：复盘不得再指向 tab=talent / tab=archive', () => {
  const src = read(ACTIVITY_ENTRY);
  assert.doesNotMatch(src, /tab=talent/, '活动详情「复盘」仍指向 tab=talent（人才库不是复盘承载面）');
  assert.doesNotMatch(src, /tab=archive/, '活动详情「复盘」仍指向 tab=archive（归档不是复盘承载面）');

  const map = /const reviewHrefOf\s*=\s*\{([\s\S]*?)\}\s*\[role\]/.exec(src)?.[1] || '';
  assert.ok(map, 'activity-entry.js 缺少 reviewHrefOf 角色落点表');
  assert.match(map, /'disc-commissioner':\s*'workspace\/disc\.html\?tab=review'/,
    '纪检委员的复盘落点应为 disc 工作台复盘页签');
  assert.match(map, /'participant':\s*'workspace\/visitor\.html\?tab=review'/,
    '普通参与者的复盘落点应为成员台「我的复盘」');
  assert.match(src, /label:\s*'复盘'[\s\S]{0,160}focusActivityId=/, '复盘入口应携带 focusActivityId 深链参数');
});

test('D5 detail-anchor.js：逐级展开父链 <details>，不可见时返回 false', () => {
  const src = read(DETAIL_ANCHOR);

  const closestImpl = /closest\(\s*['"]details['"]\s*\)/.test(src);
  const walkImpl = /tagName\s*===\s*['"]DETAILS['"]/.test(src) && /\.open\s*=\s*true/.test(src);
  assert.ok(closestImpl || walkImpl,
    'detail-anchor.js 未逐级展开父链 <details>（折叠区内定位必然失败）');
  if (closestImpl) {
    assert.match(src, /\.open\s*=\s*true/, 'closest(details) 后必须置 open = true');
  }

  assert.match(src, /offsetParent\s*===\s*null/, '缺少可见性判定（offsetParent === null 应视为不可见）');
  assert.match(src, /rect\.width\s*>\s*0\s*&&\s*rect\.height\s*>\s*0/,
    '可见性判定应同时核对宽高 > 0（仅 offsetParent 不够）');

  // 滚动函数：布局不可见 → false
  const scrollBlock = functionBody(src, 'scrollDetailIntoView');
  assert.ok(scrollBlock, '缺少 scrollDetailIntoView');
  assert.match(scrollBlock, /if\s*\(!el\)\s*return\s+false;/, 'scrollDetailIntoView 缺空目标 false');
  assert.match(scrollBlock, /if\s*\(!_hasLayout\(el\)\)\s*return\s+false;/, 'scrollDetailIntoView 不可见时必须返回 false');

  // 深链定位：滚动失败 → false（交给调用方 showToast）
  const focusBlock = functionBody(src, 'focusActivityAnchor');
  assert.ok(focusBlock, '缺少 focusActivityAnchor');
  assert.match(focusBlock, /if\s*\(!scrollDetailIntoView\([^)]*\)\)\s*return\s+false;/,
    'focusActivityAnchor 定位失败时必须返回 false（不得静默成功）');
});
