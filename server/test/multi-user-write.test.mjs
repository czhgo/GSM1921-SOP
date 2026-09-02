// server/test/multi-user-write.test.mjs — 多用户并发写回归（2026-09-02）
// 背景：原「26 域全量快照整表替换」有致命缺陷——内存滞后的在线用户一次写会把他人数据
// 整体覆盖（真机双账号演练实证：A 写活动被 B 写待办跨集合洗掉）。修复为脏集合增量快照后，
// 本测试锁定「跨集合并发写互不覆盖」这一核心契约。
// 场景：
//   ① 顺序写：A 写完 flush → B 登录（init 含 A 数据）写另一集合 → 两者都保留
//   ② 跨集合并发：A、B 同时在线（B 内存落后）→ A 写 notices flush → B 写 todos flush
//     → A 的 notices 必须仍在（修复前会被 B 的全量快照洗掉）
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { createApp } from '../app.js';
import { seedDatabase } from '../seed.js';

let app, server, base, browser;

before(async () => {
  app = createApp({ dbPath: ':memory:' });
  await seedDatabase(app.locals.db);
  server = app.listen(0);
  base = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch({ headless: true });
});

after(async () => {
  if (browser) await browser.close();
  if (server) {
    server.closeAllConnections?.();
    await new Promise((r) => server.close(r));
  }
});

/** 登录并等待 api init 全量拉取完成 */
async function login(page, sid) {
  await page.goto(`${base}/login.html`, { waitUntil: 'domcontentloaded' });
  await page.fill('#student-id', sid);
  await page.fill('#password', '123456');
  await Promise.all([
    page.waitForURL('**/workspace/**', { timeout: 10000 }),
    page.click('button[type="submit"]'),
  ]);
  await page.waitForTimeout(1500);
}

/** 以正式写路径（mockDB 变更 → persist → 防抖快照写穿）写入一条记录 */
async function pushAndPersist(page, collection, row) {
  await page.evaluate(async ({ collection, row }) => {
    const { mockDB } = await import('/src/core/domain.js?v=20260901l');
    const { persist } = await import('/src/core/data-adapter.js?v=20260901l');
    mockDB[collection].push(row);
    persist();
  }, { collection, row });
}

const flush = (ms = 1600) => new Promise((r) => setTimeout(r, ms));

const idsIn = (table, prefix) => {
  const rows = app.locals.db.prepare(`SELECT id FROM ${table} WHERE id LIKE ? ORDER BY id`).all(`${prefix}%`);
  return rows.map((r) => r.id);
};

test('多用户并发写：跨集合互不覆盖（脏集合增量快照）', async () => {
  const ctxA = await browser.newContext();
  const ctxB = await browser.newContext();
  const pageA = await ctxA.newPage();
  const pageB = await ctxB.newPage();

  // A(书记) 与 B(组织委员) 同时在线，内存均停在各自 init 时刻
  await login(pageA, '2300010001');
  await login(pageB, '2400012355');

  // ① 顺序写：A 写通知并 flush
  await pushAndPersist(pageA, 'notices', { id: 'mw-notice-A1', title: 'A1', content: 'x', priority: 'normal', publishDate: '2026-09-02', expireDate: '2026-09-09', read: false });
  await flush();
  assert.ok(idsIn('notices', 'mw-notice-A1').includes('mw-notice-A1'), 'A1 通知应已写穿服务器');

  // ② 跨集合并发：B（内存无 A1）写待办（不同集合）→ 修复前 B 的全量快照会洗掉 A1
  await pushAndPersist(pageB, 'todos', { id: 'mw-todo-B1', title: 'B1', done: false });
  await flush();

  const noticesAfter = idsIn('notices', 'mw-notice-%');
  const todosAfter = idsIn('todos', 'mw-todo-%');
  assert.ok(noticesAfter.includes('mw-notice-A1'), `跨集合写后 A 的通知必须保留（实测 notices=${JSON.stringify(noticesAfter)}）`);
  assert.ok(todosAfter.includes('mw-todo-B1'), `B 的待办应写穿（实测 todos=${JSON.stringify(todosAfter)}）`);

  await pageA.close(); await pageB.close();
  await ctxA.close(); await ctxB.close();
});

test('多用户顺序写：后登录者 init 含先行数据，写后不互损', async () => {
  const ctxA = await browser.newContext();
  const pageA = await ctxA.newPage();
  await login(pageA, '2300010001');
  await pushAndPersist(pageA, 'notices', { id: 'mw-notice-A2', title: 'A2', content: 'x', priority: 'normal', publishDate: '2026-09-02', expireDate: '2026-09-09', read: false });
  await flush();
  await pageA.close(); await ctxA.close();

  // B 此时登录：init 应含 A2（服务端状态）→ B 写另一集合不损 A2
  const ctxB = await browser.newContext();
  const pageB = await ctxB.newPage();
  await login(pageB, '2400012355');
  await pushAndPersist(pageB, 'activities', { id: 'mw-act-B1', title: 'B 活动', type: '支委会', date: '2026-09-10', status: 'draft' });
  await flush();

  const noticesAfter = idsIn('notices', 'mw-notice-%');
  const actsAfter = idsIn('activities', 'mw-act-%');
  assert.ok(noticesAfter.includes('mw-notice-A2'), `B 写活动后 A2 通知必须保留（实测=${JSON.stringify(noticesAfter)}）`);
  assert.ok(actsAfter.includes('mw-act-B1'), `B 的活动应写穿（实测=${JSON.stringify(actsAfter)}）`);
  await pageB.close(); await ctxB.close();
});
