// role: [工程师]+[AI]
// server/test/preferences.test.mjs — 个人工作台偏好（设置中心批2）纯逻辑单测
// 覆盖：resolveTabOrder（无偏好默认序 / 有偏好覆盖 / 核心组保护 / 新页签追加 / 过期快照自愈）、
//       存储往返（键空间 gsm1921-pref-<personId>-tab-order-<workspaceKey>、恢复默认=删键）、
//       缓存一致性（write/clear/save/reset 后 applyPersonalTabOrder 同步）。
// 运行：node --test server/test/preferences.test.mjs（纯 node，无浏览器依赖；
//       存储函数经注入 localStorage stub 验证，模块本体零 import）。

import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  coreTabIdsOf, resolveTabOrder, applyPersonalTabOrder, readPersonalTabOrder,
  writePersonalTabOrder, clearPersonalTabOrder, savePersonalTabOrder, resetPersonalTabOrder,
  tabOrderStorageKey, sameIdOrder,
} from '../../docs/src/services/preferences.js?v=20260909e';

// ── 测试辅助 ──
// 书记台 tab 样例（注册序：核心三组置首 = groupLabel '工作台'，其后业务组）
function secretaryTabs() {
  return [
    { id: 'today', label: '今天', groupLabel: '工作台', render: () => {} },
    { id: 'todo', label: '待办', groupLabel: '工作台', render: () => {} },
    { id: 'overview', label: '全局概况', groupLabel: '工作台', render: () => {} },
    { id: 'calendar', label: '活动管理', groupLabel: '党建', render: () => {} },
    { id: 'work-map', label: '支部分工', groupLabel: '党建', render: () => {} },
    { id: 'assign', label: '赋权管理', groupLabel: '党建', render: () => {} },
    { id: 'branch-config', label: '支部配置', groupLabel: '党建', render: () => {} },
    { id: 'notification', label: '通知发布', groupLabel: '党建', render: () => {} },
    { id: 'tf-view', label: '专班查看', groupLabel: '党建', render: () => {} },
    { id: 'group-progress', label: '党小组进展', groupLabel: '党建', render: () => {} },
    { id: 'feedback', label: '反馈管理', groupLabel: '反馈', render: () => {} },
    { id: 'report-up', label: '上报党委', groupLabel: '对接党委', render: () => {} },
  ];
}
const CORE = ['today', 'todo', 'overview'];
const BUSINESS = ['calendar', 'work-map', 'assign', 'branch-config', 'notification', 'tf-view', 'group-progress', 'feedback', 'report-up'];
const ids = (list) => (Array.isArray(list) ? list.map(t => t.id) : list);

function businessIdsOf(tabs) {
  const core = new Set(coreTabIdsOf(tabs));
  return tabs.filter(t => !core.has(t.id)).map(t => t.id);
}

// localStorage stub（纯 Map 实现；node 环境注入）
function installLocalStorage() {
  const store = new Map();
  globalThis.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
    clear: () => store.clear(),
    _store: store,
  };
  return store;
}
beforeEach(() => { installLocalStorage(); });

// ── 核心组判定 ──
test('核心组 = groupLabel 工作台（与 branch.js getCoreTabIds 同义）', () => {
  assert.deepEqual(coreTabIdsOf(secretaryTabs()), CORE);
});

// ── resolveTabOrder 纯函数 ──
test('无个人偏好（null / 空数组 / 脏空）→ 原序（默认零 diff，返回同一数组）', () => {
  const tabs = secretaryTabs();
  assert.equal(resolveTabOrder(tabs, null), tabs);
  assert.equal(resolveTabOrder(tabs, []), tabs);
  assert.equal(resolveTabOrder(tabs, ['  ', 3]), tabs); // 无有效业务 id → 原样
});

test('有个人偏好 → 核心组保持注册序置前，业务组按个人序', () => {
  const tabs = secretaryTabs();
  const mine = [...BUSINESS].reverse();
  const out = resolveTabOrder(tabs, mine);
  assert.deepEqual(out.slice(0, 3).map(t => t.id), CORE);
  assert.deepEqual(businessIdsOf(out), mine);
  // 原数组未被修改
  assert.deepEqual(businessIdsOf(tabs), BUSINESS);
});

test('核心组不参与排序：偏好含核心 id 亦被忽略（置前锁定）', () => {
  const tabs = secretaryTabs();
  const mine = [...BUSINESS].reverse().concat(CORE); // 试图把核心移到尾部
  const out = resolveTabOrder(tabs, mine);
  assert.deepEqual(out.slice(0, 3).map(t => t.id), CORE, '核心仍置首且保持注册相对序');
  assert.deepEqual(businessIdsOf(out), [...BUSINESS].reverse());
});

test('过期 id 忽略、新注册页签按默认相对位置追加业务尾部', () => {
  const tabs = secretaryTabs();
  tabs.push({ id: 'new-module', label: '新模块', groupLabel: '党建', render: () => {} }); // 新页签（未入偏好）
  const mine = ['feedback', 'branch-config', 'ghost-tab', 'report-up']; // ghost 过期；新模块缺失
  const out = resolveTabOrder(tabs, mine);
  assert.deepEqual(businessIdsOf(out), ['feedback', 'branch-config', 'report-up', 'calendar', 'work-map', 'assign', 'notification', 'tf-view', 'group-progress', 'new-module']);
});

test('过期快照自愈：偏好仅缺默认尾部若干项 → 效果等同默认，返回原数组', () => {
  const tabs = secretaryTabs();
  const mine = BUSINESS.slice(0, BUSINESS.length - 1); // 缺最后一个 report-up（默认尾部）
  const out = resolveTabOrder(tabs, mine);
  assert.equal(out, tabs, '等同默认 → 原样返回（同一引用）');
  assert.deepEqual(businessIdsOf(out), BUSINESS);
});

test('偏好与默认完全一致 → 返回原数组', () => {
  const tabs = secretaryTabs();
  assert.equal(resolveTabOrder(tabs, BUSINESS), tabs);
});

// ── 存储（键空间 / 往返 / 恢复默认）──
test('tabOrderStorageKey 键空间：gsm1921-pref-<personId>-tab-order-<workspaceKey>', () => {
  assert.equal(tabOrderStorageKey('u-sec-1', 'workspace:secretary'), 'gsm1921-pref-u-sec-1-tab-order-workspace:secretary');
});

test('写/读往返 + 清理；空写等同清键', () => {
  writePersonalTabOrder('u-sec-1', 'workspace:secretary', ['feedback', 'calendar']);
  assert.deepEqual(readPersonalTabOrder('u-sec-1', 'workspace:secretary'), ['feedback', 'calendar']);
  writePersonalTabOrder('u-sec-1', 'workspace:secretary', []);
  assert.equal(readPersonalTabOrder('u-sec-1', 'workspace:secretary'), null);
  writePersonalTabOrder('u-sec-1', 'workspace:secretary', ['feedback']);
  clearPersonalTabOrder('u-sec-1', 'workspace:secretary');
  assert.equal(readPersonalTabOrder('u-sec-1', 'workspace:secretary'), null);
});

test('同一人在不同工作台的偏好互不影响（键隔离）', () => {
  writePersonalTabOrder('u-sec-1', 'workspace:secretary', ['feedback']);
  writePersonalTabOrder('u-sec-1', 'workspace:disc', ['attendance']);
  assert.deepEqual(readPersonalTabOrder('u-sec-1', 'workspace:secretary'), ['feedback']);
  assert.deepEqual(readPersonalTabOrder('u-sec-1', 'workspace:disc'), ['attendance']);
  clearPersonalTabOrder('u-sec-1', 'workspace:secretary');
  assert.equal(readPersonalTabOrder('u-sec-1', 'workspace:secretary'), null);
  assert.deepEqual(readPersonalTabOrder('u-sec-1', 'workspace:disc'), ['attendance']);
});

// ── save / reset（等默认自动收口 + 恢复默认=删键）──
test('save 与默认一致 → 自动清键（返回 false；回到「默认」态）', () => {
  const saved = savePersonalTabOrder('u-sec-2', 'workspace:secretary', BUSINESS, BUSINESS);
  assert.equal(saved, false);
  assert.equal(readPersonalTabOrder('u-sec-2', 'workspace:secretary'), null);
});

test('save 有调整 → 写键（返回 true）；reset 恢复默认 = 删键', () => {
  const mine = [...BUSINESS].reverse();
  const saved = savePersonalTabOrder('u-sec-2', 'workspace:secretary', mine, BUSINESS);
  assert.equal(saved, true);
  assert.deepEqual(readPersonalTabOrder('u-sec-2', 'workspace:secretary'), mine);
  resetPersonalTabOrder('u-sec-2', 'workspace:secretary');
  assert.equal(readPersonalTabOrder('u-sec-2', 'workspace:secretary'), null);
});

// ── 组合入口 applyPersonalTabOrder（缓存一致性）──
test('applyPersonalTabOrder：无偏好原样；写入后按序；清键/重置后回默认', () => {
  const tabs = secretaryTabs();
  assert.equal(applyPersonalTabOrder(tabs, 'u-sec-3', 'workspace:secretary'), tabs, '无偏好 → 原数组（缓存 null）');
  const mine = ['feedback', 'calendar', 'work-map', 'assign', 'branch-config', 'notification', 'tf-view', 'group-progress', 'report-up'];
  writePersonalTabOrder('u-sec-3', 'workspace:secretary', mine);
  const out = applyPersonalTabOrder(tabs, 'u-sec-3', 'workspace:secretary');
  assert.deepEqual(businessIdsOf(out), mine, '写后读即生效（缓存同步）');
  clearPersonalTabOrder('u-sec-3', 'workspace:secretary');
  assert.equal(applyPersonalTabOrder(tabs, 'u-sec-3', 'workspace:secretary'), tabs, '清键后回默认');
  const mine2 = [...mine].reverse();
  savePersonalTabOrder('u-sec-3', 'workspace:secretary', mine2, BUSINESS);
  assert.deepEqual(businessIdsOf(applyPersonalTabOrder(tabs, 'u-sec-3', 'workspace:secretary')), mine2);
  resetPersonalTabOrder('u-sec-3', 'workspace:secretary');
  assert.equal(applyPersonalTabOrder(tabs, 'u-sec-3', 'workspace:secretary'), tabs);
});

test('脏存储（非数组 / 非字符串）→ 按 null 处理（默认序）', () => {
  globalThis.localStorage.setItem(tabOrderStorageKey('u-sec-4', 'workspace:secretary'), 'not-json');
  assert.equal(readPersonalTabOrder('u-sec-4', 'workspace:secretary'), null);
  globalThis.localStorage.setItem(tabOrderStorageKey('u-sec-4', 'workspace:secretary'), JSON.stringify([1, 2]));
  assert.equal(readPersonalTabOrder('u-sec-4', 'workspace:secretary'), null);
});

test('sameIdOrder 等值判定', () => {
  assert.equal(sameIdOrder(['a', 'b'], ['a', 'b']), true);
  assert.equal(sameIdOrder(['a', 'b'], ['b', 'a']), false);
  assert.equal(sameIdOrder(['a'], ['a', 'b']), false);
});
