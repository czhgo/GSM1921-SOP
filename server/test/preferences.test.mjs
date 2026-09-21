// role: [工程师]+[AI]
// server/test/preferences.test.mjs — 个人工作台偏好（设置中心批2）纯逻辑单测
// 覆盖：resolveTabOrder（无偏好默认序 / 有偏好覆盖 / 核心组保护 / 新页签追加 / 过期快照自愈）、
//       存储往返（键空间 gsm1921-pref-<personId>-tab-order-<workspaceKey>、恢复默认=删键）、
//       缓存一致性（write/clear/save/reset 后 applyPersonalTabOrder 同步）。
// 运行：node --test server/test/preferences.test.mjs（上半为纯 node，无浏览器依赖；
//       存储函数经注入 localStorage stub 验证，模块本体零 import）。
// 另含（2026-09-11 支书裁定「B. 以 Playwright 机测替代真机手测：设置页 tab 调序拖拽」）：
//   文件末一条真实 Chromium HTML5 DnD 用例——登录支书 → 设置页「我的工作台」真实拖拽，
//   断言 DOM 顺序 / localStorage 持久化 / reload 保持 / 核心锁定 / 越界回滚 / console error=0。

import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { createApp } from '../app.js';
import { seedDatabase } from '../seed.js';
import {
  coreTabIdsOf, resolveTabOrder, applyPersonalTabOrder, readPersonalTabOrder,
  writePersonalTabOrder, clearPersonalTabOrder, savePersonalTabOrder, resetPersonalTabOrder,
  tabOrderStorageKey, sameIdOrder,
} from '../../docs/src/services/preferences.js?v=20260921n';

// ── 测试辅助 ──
// 支书台 tab 样例（注册序：核心三组置首 = groupLabel '工作台'，其后业务组）
function secretaryTabs() {
  return [
    { id: 'today', label: '今天', groupLabel: '工作台', coreTab: true, render: () => {} },
    { id: 'todo', label: '待办', groupLabel: '工作台', coreTab: true, render: () => {} },
    { id: 'overview', label: '全局概况', groupLabel: '工作台', coreTab: true, render: () => {} },
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

// ══════════════════════════════════════════════════════════════════════════
// 真实拖拽 E2E（支书裁定 B：以 Playwright 机测替代真机手测）
// 真实机制：entries/settings-entry.js bindMyWorkspace 绑定的 HTML5 DnD 事件链
//   （dragstart → dragover 实时 insertBefore → drop/dragend → finishDrag →
//    savePersonalTabOrder 落 localStorage）；本用例用 Playwright locator.dragTo
//   触发 Chromium 真实鼠标序列，由浏览器派发原生 drag 事件（非脚本模拟）。
// 自包含：createApp(:memory:) + seedDatabase + 账号密码登录支书（同 write-hover-e2e 口径）。
// ══════════════════════════════════════════════════════════════════════════
test('真实拖拽：我的工作台页签尾部→靠前（DOM/持久化/reload/核心锁定/越界回滚/0 error）', async () => {
  const app = createApp({ dbPath: ':memory:' });
  await seedDatabase(app.locals.db);
  const server = app.listen(0);
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({ headless: true });
  const errors = []; // console error + pageerror（须为 0）
  try {
    const page = await browser.newPage();
    // 外部 CDN 以空 200 兑现：避免测试环境的 net::ERR 噪声污染「console error=0」断言
    await page.route('**://fonts.googleapis.com/**', (r) => r.fulfill({ status: 200, body: '' }));
    await page.route('**://fonts.gstatic.com/**', (r) => r.fulfill({ status: 200, body: '' }));
    await page.route('**://cdn.tailwindcss.com/**', (r) => r.fulfill({ status: 200, contentType: 'text/javascript', body: '' }));
    page.on('pageerror', (e) => errors.push(`pageerror: ${String(e).slice(0, 200)}`));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(`console: ${m.text().slice(0, 200)}`); });

    // ① 登录支书 → 打开设置页「我的工作台」
    await page.goto(`${base}/login.html`, { waitUntil: 'domcontentloaded' });
    await page.fill('#student-id', '2300010001');
    await page.fill('#password', '123456');
    await Promise.all([
      page.waitForURL('**/workspace/secretary.html', { timeout: 15000 }),
      page.click('button[type="submit"]'),
    ]);
    await page.goto(`${base}/settings.html`, { waitUntil: 'domcontentloaded' });
    await page.click('.settings-group-item[data-section="my-workspace"]');
    await page.waitForFunction(() => document.querySelectorAll('.myws-list .myws-row').length > 3, null, { timeout: 15000 });

    const readRows = () => page.evaluate(() => {
      const rows = [...document.querySelectorAll('.myws-list .myws-row')];
      return {
        all: rows.map((r) => r.dataset.id),
        locked: rows.filter((r) => r.dataset.locked === '1').map((r) => r.dataset.id),
        lockedAllDraggableFalse: rows.filter((r) => r.dataset.locked === '1').every((r) => r.getAttribute('draggable') === 'false'),
        biz: rows.filter((r) => r.dataset.locked !== '1').map((r) => r.dataset.id),
      };
    });

    const s0 = await readRows();
    console.log('[drag] 初始 DOM:', s0.all.join(','));
    assert.ok(s0.biz.length >= 3, `业务页签 ≥3（实际 ${s0.biz.length}）`);
    assert.ok(s0.locked.length >= 1, '存在核心固定页签');
    assert.equal(s0.lockedAllDraggableFalse, true, '核心固定页签 draggable=false（不可拖动）');
    assert.deepEqual(s0.all.slice(0, s0.locked.length), s0.locked, '核心组页签置前');

    const fromId = s0.biz[s0.biz.length - 1]; // 尾部业务页签（默认注册序末尾 = 上报党委）
    const toId = s0.biz[0];                    // 首个业务页签（靠前落点）
    const expectBiz = [fromId, ...s0.biz.slice(0, -1)];

    // ② 真实拖拽：尾部 → 首个业务页签上半区（dragover 判定 before → insertBefore）
    await page.locator(`.myws-row[data-id="${fromId}"]`).dragTo(
      page.locator(`.myws-row[data-id="${toId}"]`),
      { targetPosition: { x: 40, y: 2 } },
    );

    const s1 = await readRows();
    console.log('[drag] 拖后 DOM:', s1.biz.join(','));
    assert.deepEqual(s1.biz, expectBiz, '拖后 DOM 顺序：尾部页签移至业务首位');
    assert.deepEqual(s1.locked, s0.locked, '核心组页签位置不受拖拽影响');

    // ③ 持久化：写入 person 顺序偏好键（gsm1921-pref-<personId>-tab-order-workspace:secretary）
    const stored = await page.evaluate(() => {
      const k = Object.keys(localStorage).find((x) => x.includes('-tab-order-workspace:secretary'));
      return k ? { key: k, val: JSON.parse(localStorage.getItem(k)) } : null;
    });
    console.log('[drag] 持久化键:', stored && `${stored.key} = ${stored.val.join(',')}`);
    assert.ok(stored, '已写入个人顺序偏好键');
    assert.deepEqual(stored.val, expectBiz, '存储值 = 拖后业务顺序');

    // ④ reload 后顺序保持（真实持久化读回，非内存态）
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.click('.settings-group-item[data-section="my-workspace"]');
    await page.waitForFunction((f) => {
      const biz = [...document.querySelectorAll('.myws-list .myws-row')]
        .filter((r) => r.dataset.locked !== '1').map((r) => r.dataset.id);
      return biz[0] === f;
    }, fromId, { timeout: 15000 });
    const s2 = await readRows();
    console.log('[drag] reload 后:', s2.biz.join(','));
    assert.deepEqual(s2.biz, expectBiz, 'reload 后顺序保持（持久化生效）');
    assert.deepEqual(s2.locked, s0.locked, 'reload 后核心组页签仍锁定置前');

    // ⑤ 核心锁定：拖动核心页签 → 不产生任何重排
    await page.locator(`.myws-row[data-id="${s0.locked[0]}"]`).dragTo(
      page.locator(`.myws-row[data-id="${s2.biz[0]}"]`),
      { targetPosition: { x: 40, y: 2 } },
    );
    const s3 = await readRows();
    assert.deepEqual(s3.all, s2.all, '核心页签不可拖动：整体顺序不变');

    // ⑥ 非法落点（核心锁定行不收）→ 回滚为原顺序、不改写存储
    const valBefore = await page.evaluate((k) => localStorage.getItem(k), stored.key);
    await page.locator(`.myws-row[data-id="${s3.biz[0]}"]`).dragTo(
      page.locator(`.myws-row[data-id="${s0.locked[0]}"]`),
      { targetPosition: { x: 40, y: 2 } },
    );
    const s4 = await readRows();
    assert.deepEqual(s4.all, s3.all, '非法拖放（核心行落点）回滚：顺序不变');
    assert.equal(await page.evaluate((k) => localStorage.getItem(k), stored.key), valBefore, '非法拖放未改写存储');

    // ⑦ 越界拖放：按住尾部业务行向上拖出列表后松手 → 回滚为原顺序（原生鼠标序列，非元素落点）
    const box = await page.locator(`.myws-row[data-id="${s4.biz[0]}"]`).boundingBox();
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;
    await page.mouse.move(cx, cy);
    await page.mouse.down();
    await page.mouse.move(cx, cy - 10, { steps: 2 });   // 越过阈值 → 浏览器派发 dragstart
    await page.mouse.move(cx, box.y - 50, { steps: 8 }); // 拖至列表上方（仅跨核心锁定行/列表外）
    const dragStarted = await page.evaluate(() => !!document.querySelector('.myws-row.dragging'));
    await page.mouse.up();
    const s5 = await readRows();
    assert.equal(dragStarted, true, '越界拖放：dragstart 已触发（真实 HTML5 事件链）');
    assert.deepEqual(s5.all, s4.all, '越界拖放回滚：顺序不变');
    assert.equal(await page.evaluate((k) => localStorage.getItem(k), stored.key), valBefore, '越界拖放未改写存储');

    // ⑧ console / page error = 0
    console.log('[drag] console/page errors =', JSON.stringify(errors));
    assert.equal(errors.length, 0, 'console/page error 为 0');
  } finally {
    await browser.close();
    server.closeAllConnections?.();
    await new Promise((r) => server.close(r));
  }
});
