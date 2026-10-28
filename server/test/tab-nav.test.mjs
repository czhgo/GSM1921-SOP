// server/test/tab-nav.test.mjs — R6 导航守卫纯函数测试（2026-09-03 P2a）
// 覆盖：初始 tab 决策优先级 / 非法（被隐藏）default|saved|priority 回退 / 目标 tab 回退 /
// 空清单兜底。消费方 = docs/src/components/shell/tab-bar.js（浏览器侧），本文件直测纯决策。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolveInitialTab, resolveTargetTab } from '../../docs/src/core/boot/tab-nav.js?v=20261028a';

const shellSrc = readFileSync(new URL('../../docs/src/components/shell/workspace-shell.js', import.meta.url), 'utf8');
const branchFilterSrc = readFileSync(new URL('../../docs/src/components/governance/branch-filter.js', import.meta.url), 'utf8');
const materialsEntrySrc = readFileSync(new URL('../../docs/src/entries/pages/activity-materials-entry.js', import.meta.url), 'utf8');

const TABS = [{ id: 'todo' }, { id: 'calendar' }, { id: 'feedback' }];

test('初始决策优先级：priorityTab > savedTab > defaultTab > tabs[0]', () => {
  assert.equal(resolveInitialTab(TABS, { priorityTab: 'todo' }), 'todo');
  assert.equal(resolveInitialTab(TABS, { defaultTab: 'calendar' }), 'calendar');
  assert.equal(resolveInitialTab(TABS, { savedTab: 'feedback' }), 'feedback');
  assert.equal(resolveInitialTab(TABS, {}), 'todo');
  assert.equal(
    resolveInitialTab(TABS, { priorityTab: 'todo', savedTab: 'feedback', defaultTab: 'calendar' }),
    'todo',
  );
  assert.equal(resolveInitialTab(TABS, { savedTab: 'feedback', defaultTab: 'calendar' }), 'feedback');
});

test('被隐藏（不在清单）的 defaultTab/savedTab/priorityTab 一律回退首个可见 tab', () => {
  // 支部 config.modules 隐藏了 calendar/feedback —— 只剩 todo
  const vis = TABS.filter((t) => t.id === 'todo');
  assert.equal(resolveInitialTab(vis, { defaultTab: 'calendar' }), 'todo');
  assert.equal(resolveInitialTab(vis, { savedTab: 'feedback' }), 'todo');
  assert.equal(resolveInitialTab(vis, { priorityTab: 'calendar' }), 'todo');
  // defaultTab 命中即用（不隐藏时行为与旧版一致）
  assert.equal(resolveInitialTab(TABS, { defaultTab: 'calendar' }), 'calendar');
});

test('空清单兜底 null（理论不发生：核心组固定）', () => {
  assert.equal(resolveInitialTab([], { defaultTab: 'todo' }), null);
  assert.equal(resolveInitialTab(null, {}), null);
});

test('目标 tab 回退：可见命中原样返回；被隐藏回退首位并标记 fellBack', () => {
  assert.deepEqual(resolveTargetTab(TABS, 'calendar'), { id: 'calendar', fellBack: false });
  assert.deepEqual(resolveTargetTab(TABS, 'hidden-tab'), { id: 'todo', fellBack: true });
  assert.deepEqual(resolveTargetTab(TABS, null), { id: 'todo', fellBack: false });
  assert.deepEqual(resolveTargetTab([], 'anything'), { id: null, fellBack: true });
});

// ════════════════════════════════════════════════════════════════
//  IA 深链契约（2026-10-20 IA 修复 Task 2/3 · 静态守卫）
// ════════════════════════════════════════════════════════════════

test('壳：focusActivityId / focusRecordId 只做定位，不进 legacy onNavTarget 分支', () => {
  assert.match(shellSrc, /const focusActivityId = urlParams\.focusActivityId \|\| null;/, '须读取 ?focusActivityId=');
  assert.match(shellSrc, /const focusRecordId = urlParams\.focusRecordId \|\| null;/, '须读取 ?focusRecordId=');
  assert.match(shellSrc, /_navTarget = \{[^}]*focusActivityId/, '须写入 _navTarget.focusActivityId');
  assert.match(shellSrc, /focusActivityId: _navTarget \? \(_navTarget\.focusActivityId \|\| null\) : null,/, '_renderCtx 须暴露 focusActivityId');
  assert.match(shellSrc, /focusRecordId: _navTarget \? \(_navTarget\.focusRecordId \|\| null\) : null,/, '_renderCtx 须暴露 focusRecordId');
  assert.match(shellSrc, /CrossPageState\.clearParam\('focusActivityId'\)/, '须清理 focusActivityId URL 参数');
  assert.match(shellSrc, /CrossPageState\.clearParam\('focusRecordId'\)/, '须清理 focusRecordId URL 参数');
  const legacyLine = shellSrc.match(/const hasLegacyNav = .*;/);
  assert.ok(legacyLine, '须保留 hasLegacyNav 判据');
  assert.doesNotMatch(legacyLine[0], /focusActivityId|focusRecordId/, '定位参数不得进入 legacy 分支');
});

test('壳：对象级高亮选择器含 [data-act-id]，且 highlightType 按类型收窄', () => {
  assert.match(shellSrc, /\[data-act-id="\$\{id\}"\]/, '选择器须含 [data-act-id]');
  assert.match(shellSrc, /HIGHLIGHT_TYPE_SELECTORS/);
  for (const key of ['p:', 'a:', 't:', 'rq:', 'tr:', 'mcr:', 'group:']) {
    assert.ok(shellSrc.includes(key), `highlightType 缺少 ${key} 映射`);
  }
  assert.match(shellSrc, /_objectHighlightSelector\(hlId, _navTarget\.highlightType\)/);
  assert.match(shellSrc, /setTimeout\(\(\) => \{ if \(_highlightId === hlId\)/, '高亮 3 秒后须清理快照');
});

test('壳：F08 目标页签不可用时给可见提示 + 回今天（不静默）', () => {
  assert.match(shellSrc, /navTabMissing/);
  assert.match(shellSrc, /data-ws-tab-notice/);
  assert.match(shellSrc, /该页签已调整或对本角色不可用/);
  assert.match(shellSrc, /回今天/);
  assert.match(shellSrc, /console\.warn\(`\[ws-shell\] \?tab=/);
});

test('F11：branch-filter 空值不得被 || 回退，清除时删 URL 参数', () => {
  assert.match(branchFilterSrc, /_selected\.has\(stateKey\)/, '须用 Map.has 判空值');
  assert.doesNotMatch(branchFilterSrc, /_selected\.get\(stateKey\) \|\|/, '不得用 || 回退空值');
  assert.match(branchFilterSrc, /url\.searchParams\.delete\('branchId'\)/, '清除筛选时须删 URL 参数');
});

test('材料页：消费契约 + 可见性 + referrer 返回 + 角色化交接', () => {
  assert.match(materialsEntrySrc, /resolveMaterialHref\(/);
  assert.match(materialsEntrySrc, /resolveMaterialHandoff\(/);
  assert.match(materialsEntrySrc, /isActivityVisibleTo\(act, me\.role, me\.personId\)/);
  assert.match(materialsEntrySrc, /document\.referrer/);
  assert.match(materialsEntrySrc, /test\(refUrl\.pathname\)/, 'referrer 须判同源且含 /workspace/ 路径');
});

test('材料页深链：十处承载页签均消费 ctx.focusActivityId', () => {
  const consumers = [
    '../../docs/src/entries/tabs/disc/attendance-tab.js',
    '../../docs/src/entries/tabs/disc/inspection-tab.js',
    '../../docs/src/entries/tabs/disc/review-tab.js',
    '../../docs/src/entries/tabs/leader/attendance-tab.js',
    '../../docs/src/entries/tabs/leader/inspection-tab.js',
    '../../docs/src/entries/tabs/leader/members-tab.js',
    '../../docs/src/entries/tabs/visitor/attendance-tab.js',
    '../../docs/src/entries/tabs/visitor/inspection-tab.js',
    '../../docs/src/entries/tabs/visitor/review-tab.js',
    '../../docs/src/entries/tabs/prop/archive-tab.js',
  ];
  for (const rel of consumers) {
    const src = readFileSync(new URL(rel, import.meta.url), 'utf8');
    // 2026-10-24 批次 508：允许先把 ctx.focusActivityId 取出（含判空/展开折叠区）再传给定位函数；
    //   判据仍是「读 ctx.focusActivityId ＋ 调用 focusActivityAnchor」两件都在。
    assert.match(src, /ctx\?\.focusActivityId/, `${rel} 未消费 focusActivityId`);
    assert.match(src, /focusActivityAnchor\(/, `${rel} 未调用 focusActivityAnchor 定位`);
  }
  // 第八轮 2.2：纪检待办带 recordId 直达的两处承载页签须消费 ctx.focusRecordId
  for (const rel of ['../../docs/src/entries/tabs/disc/attendance-tab.js', '../../docs/src/entries/tabs/disc/inspection-tab.js']) {
    const src = readFileSync(new URL(rel, import.meta.url), 'utf8');
    assert.match(src, /ctx\?\.focusRecordId/, `${rel} 未消费 focusRecordId`);
  }
});
