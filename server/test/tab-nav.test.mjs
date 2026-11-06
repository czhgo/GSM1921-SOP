// server/test/tab-nav.test.mjs — R6 导航守卫纯函数测试（2026-09-03 P2a）
// 覆盖：初始 tab 决策优先级 / 非法（被隐藏）default|saved|priority 回退 / 目标 tab 回退 /
// 空清单兜底。消费方 = docs/src/components/shell/tab-bar.js（浏览器侧），本文件直测纯决策。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolveInitialTab, resolveTargetTab } from '../../docs/src/core/boot/tab-nav.js?v=20261102b';
import { TODO_ACTIONS, resolveTodoAction } from '../../docs/src/core/domain/todo-actions.js?v=20261102b';

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

// ════════════════════════════════════════════════════════════════
//  批次 524 · #7：待办动作表 + 深链定位（静态守卫，2026-11-01）
//  规则：7 个角色待办台不得再直点各台页签按钮 / 写死工作台 URL；
//        TODO_ACTIONS 必须覆盖各 todo-tab.js 出现的全部 actionKey / actionType 字面量。
// ════════════════════════════════════════════════════════════════

const TODO_TAB_FILES = [
  '../../docs/src/entries/tabs/secretary/todo-tab.js',
  '../../docs/src/entries/tabs/leader/todo-tab.js',
  '../../docs/src/entries/tabs/visitor/todo-tab.js',
  '../../docs/src/entries/tabs/prop/todo-tab.js',
  '../../docs/src/entries/tabs/org/todo-tab.js',
  '../../docs/src/entries/tabs/disc/todo-tab.js',
];

/** 去掉块注释与整行 `//` 注释（避免把注释里的旧键/旧写法误判为代码） */
const stripComments = (src) => String(src)
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/.*$/gm, '');

/** 旧写法判据：直点角色页签按钮 / 写死 `workspace/*.html?tab=` */
function hasLegacyTabNav(src) {
  const clean = stripComments(src);
  return /[a-zA-Z-]+-tab-btn\[data-[a-zA-Z-]+-tab=/.test(clean)
    || /workspace\/[\w-]+\.html\?tab=/.test(clean);
}

/** 从源码抽取 actionKey/actionType 字面量（赋值 + 严格比较 + startsWith/endsWith 前缀后缀） */
function collectActionLiterals(src) {
  const clean = stripComments(src);
  const exact = new Set();
  for (const re of [
    /action(?:Key|Type)\s*:\s*'([^']+)'/g,
    /action(?:Key|Type)\s*===\s*'([^']+)'/g,
  ]) {
    for (const m of clean.matchAll(re)) exact.add(m[1]);
  }
  const prefixes = [];
  const prefixRe = /(?:actionKey|actionType)[^\n]{0,40}?\.(startsWith|endsWith)\(\s*'([^']+)'\s*\)/g;
  for (const m of clean.matchAll(prefixRe)) prefixes.push({ mode: m[1], text: m[2] });
  return { exact: [...exact], prefixes };
}

/** 返回源码中未被动作表覆盖的字面量（exact 缺键 / 前缀后缀无命中） */
function missingActionCoverage(src, table = TODO_ACTIONS) {
  const { exact, prefixes } = collectActionLiterals(src);
  const keys = Object.keys(table);
  const missingExact = exact.filter((k) => !(k in table));
  const missingPrefix = prefixes.filter(({ mode, text }) => !keys.some((k) => (
    mode === 'startsWith' ? k.startsWith(text) : k.endsWith(text)
  )));
  return { missingExact, missingPrefix };
}

test('G1 待办台不得直点角色页签按钮 / 不得写死 workspace URL（含反例）', () => {
  for (const rel of TODO_TAB_FILES) {
    const src = readFileSync(new URL(rel, import.meta.url), 'utf8');
    assert.equal(hasLegacyTabNav(src), false, `${rel} 仍存在旧式页签直点 / 写死 URL`);
    assert.match(src, /goToWorkspaceTab\(/, `${rel} 必须走统一导航 helper`);
  }
  // 反例：合成旧写法必须判红
  assert.equal(hasLegacyTabNav('document.querySelector(`.leader-tab-btn[data-leader-tab="${t}"]`).click();'), true);
  assert.equal(hasLegacyTabNav("window.location.href = 'workspace/disc.html?tab=attendance';"), true);
});

test('G2 TODO_ACTIONS 覆盖各台 actionKey / actionType 字面量（缺一即红 + 反例）', () => {
  for (const rel of TODO_TAB_FILES) {
    const src = readFileSync(new URL(rel, import.meta.url), 'utf8');
    const { missingExact, missingPrefix } = missingActionCoverage(src);
    assert.deepEqual(missingExact, [], `${rel} 存在未登记的动作键`);
    assert.deepEqual(missingPrefix, [], `${rel} 存在未登记的动作键前缀/后缀`);
  }
  // 反例：合成未登记键必须被抽出并判缺
  assert.deepEqual(
    missingActionCoverage("if (todo.actionKey === 'not-registered') {} if (todo.actionType === 'write') {}").missingExact,
    ['not-registered'],
  );
  assert.deepEqual(
    missingActionCoverage("if ((todo.actionKey || '').endsWith('-not-registered')) {}").missingPrefix.length,
    1,
  );
});

test('G3 resolveTodoAction：actionKey 优先 / actionType 兜底 / 角色与 scope 覆盖', () => {
  assert.equal(resolveTodoAction(null), null);
  assert.equal(resolveTodoAction({ actionKey: 'no-such', actionType: 'no-such' }), null);
  assert.deepEqual(
    resolveTodoAction({ actionKey: 'archive-remind', actionType: 'submit' }),
    { tab: 'calendar', label: '到活动管理处理', kind: 'activity' },
    'actionKey 优先于 actionType',
  );
  assert.equal(resolveTodoAction({ actionKey: 'unknown', actionType: 'notify' }).tab, 'notification', 'actionType 兜底');
  assert.equal(resolveTodoAction({ actionKey: 'authorize', actionType: 'authorize' }, 'leader').tab, 'write');
  assert.equal(resolveTodoAction({ actionKey: 'authorize', actionType: 'authorize' }, 'secretary').tab, 'group-progress');
  assert.equal(
    resolveTodoAction({ actionKey: 'authorize', actionType: 'authorize', actionData: { scope: 'activity' } }, 'secretary').tab,
    'calendar',
    'scope 覆盖仅在无角色覆盖时生效（支书 authorize 按活动/专班分流）',
  );
  assert.equal(resolveTodoAction({ actionKey: 'review', actionType: 'review' }, 'leader').tab, 'members');
  assert.equal(resolveTodoAction({ actionKey: 'review', actionType: 'review' }, 'disc-commissioner').tab, 'review');
  const flat = resolveTodoAction({ actionKey: 'authorize', actionType: 'authorize' });
  assert.ok(!('roleOverrides' in flat) && !('scopeOverrides' in flat), '返回结果不得泄露覆盖表');
});

test('G4 页签按钮带 data-ws-tab-btn，目标页按页签消费 PendingTarget（含反例）', () => {
  const tabBarSrc = readFileSync(new URL('../../docs/src/components/shell/tab-bar.js', import.meta.url), 'utf8');
  assert.match(tabBarSrc, /data-ws-tab-btn="\$\{id\}"/, 'tab-bar 须统一产出 data-ws-tab-btn');
  const navSrc = readFileSync(new URL('../../docs/src/core/session/workspace-nav.js', import.meta.url), 'utf8');
  assert.match(navSrc, /PendingTarget\.set\(\{ tab: tabId, \.\.\.target \}\)/, '导航前须写 PendingTarget');
  assert.match(navSrc, /querySelector\(`\[data-ws-tab-btn="\$\{tabId\}"\]`\)/, '导航只认 data-ws-tab-btn');
  assert.doesNotMatch(stripComments(navSrc), /-tab-btn\[/, '导航 helper 不得回退到角色页签选择器');
  for (const rel of [
    '../../docs/src/entries/tabs/secretary/calendar-tab.js',
    '../../docs/src/entries/tabs/secretary/feedback-tab.js',
  ]) {
    const src = readFileSync(new URL(rel, import.meta.url), 'utf8');
    assert.match(src, /PendingTarget\.peek\(\)/, `${rel} 须先 peek 判页签`);
    assert.match(src, /PendingTarget\.consume\(\)/, `${rel} 命中本页签后须消费目标`);
  }
  // 反例：直接 consume 不判页签会导致跨页误清（判据口径）
  assert.doesNotMatch(
    'const t = PendingTarget.consume();',
    /PendingTarget\.peek\(\)/,
    '合成反例：未判页签的 consume 不满足本守卫',
  );
});
