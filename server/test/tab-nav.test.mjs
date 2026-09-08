// server/test/tab-nav.test.mjs — R6 导航守卫纯函数测试（2026-09-03 P2a）
// 覆盖：初始 tab 决策优先级 / 非法（被隐藏）default|saved|priority 回退 / 目标 tab 回退 /
// 空清单兜底。消费方 = docs/src/components/tab-bar.js（浏览器侧），本文件直测纯决策。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveInitialTab, resolveTargetTab } from '../../docs/src/core/tab-nav.js?v=20260908d';

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
