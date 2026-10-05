// server/test/multi-user-write.test.mjs — 多用户并发写回归（2026-09-02；2026-09-23 P0-1 加「同集合双写」）
// 背景：原「26 域全量快照整表替换」有致命缺陷——内存滞后的在线用户一次写会把他人数据
// 整体覆盖（真机双账号演练实证：A 写活动被 B 写待办跨集合洗掉）。修复为脏集合增量快照后，
// 本测试锁定「跨集合并发写互不覆盖」这一核心契约。
// 🆕 2026-09-23（P0-1 乐观锁）：增量快照剩下的残余口是**同集合双写**（后写者以落后内存整表覆盖
// 前写者刚落库的数据）⇒ 本轮补齐：前端随 payload 带 `_versions`（集合基线版本），服务端逐集合比对，
// 不一致 ⇒ **409 且整批不写**。本文件据此新增「同集合双写 → 后写者 409、先写者不丢、集合不清空」。
// 场景：
//   ① 顺序写：A 写完 flush → B 登录（init 含 A 数据）写另一集合 → 两者都保留
//   ② 跨集合并发：A、B 同时在线（B 内存落后）→ A 写 notices flush → B 写 todos flush
//     → A 的 notices 必须仍在（修复前会被 B 的全量快照洗掉）
//   ③ 同集合双写（P0-1）：A、B 同时在线 → A 写 notices flush（200 + 新版本）→ B 写同集合 notices
//     → **409**（整批不写）→ A 的行必须仍在、B 的行不得落库、集合条数不变；B 前端重拉并提示用户
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
  await page.route('**://cdn.tailwindcss.com/**', (r) => r.abort());
  await page.goto(`${base}/login.html`, { waitUntil: 'domcontentloaded' });
  await page.fill('#student-id', sid);
  await page.fill('#password', '123456');
  await Promise.all([
    page.waitForURL('**/workspace/**', { timeout: 10000 }),
    page.click('button[type="submit"]'),
  ]);
  await page.waitForTimeout(1500);
  // P0-2（2026-09-23 支书裁定「形态必须可断言」）：本文件全部真机用例都走真后端 API 会话——
  // 断言单一源 = data/data-adapter.js::getRuntimeMode（此前只能靠「有没有 token」旁证，形态不可断言）。
  const mode = await page.evaluate(async () => (await import('/src/data/data-adapter.js?v=20261005j')).getRuntimeMode());
  assert.equal(mode.source, 'api', `真机用例须确为 api 形态（实测 ${JSON.stringify(mode)}）`);
  assert.equal(mode.hasToken, true, 'api 形态应存在会话 token');
}

/** 以正式写路径（mockDB 变更 → persist → 防抖快照写穿）写入一条记录 */
async function pushAndPersist(page, collection, row) {
  await page.evaluate(async ({ collection, row }) => {
    const { mockDB } = await import('/src/core/domain/domain.js?v=20261005j');
    const { persist } = await import('/src/data/data-adapter.js?v=20261005j');
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

  // A(支书) 与 B(组织委员) 同时在线，内存均停在各自 init 时刻
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

// 🆕 2026-09-23（P0-1）：**同集合双写** —— 先写者数据不丢。这是增量快照修好「跨集合互洗」之后
// 剩下的最后一口丢数据窗口（原代码自认「本次接受」，见 data-adapter.js 旧注释；
// 支书 2026-09-23 裁定「只允许把「形态断言」加进真机文件」的同批任务 A 要求补这条断言）。
// 判据三层：① 服务端**拒**（409 + conflicts）；② 先写者数据在、后写者数据不在、集合条数不变（整批不写）；
// ③ 前端**不静默**：重拉冲突集合并给出业务语言提示。
test('同集合双写（P0-1 乐观锁）：后写者 409，先写者数据不丢、集合不被清空', async () => {
  const ctxA = await browser.newContext();
  const ctxB = await browser.newContext();
  const pageA = await ctxA.newPage();
  const pageB = await ctxB.newPage();
  const snapshotPost = (page) => page.waitForResponse(
    (r) => r.request().method() === 'POST' && new URL(r.url()).pathname === '/api/v1/snapshot',
    { timeout: 20000 }
  );

  // A、B 同时在线（两者 init 时 notices 的集合版本相同 ⇒ A 一写，B 的基线即过期）
  await login(pageA, '2300010001');
  await login(pageB, '2400012355');

  // ① A 写 notices 并 flush：P0-1 协议下应 200 且回传该集合的新版本
  const respAP = snapshotPost(pageA);
  await pushAndPersist(pageA, 'notices', { id: 'mw-notice-A3', title: 'A3', content: 'x', priority: 'normal', publishDate: '2026-09-02', expireDate: '2026-09-09', read: false });
  const respA = await respAP;
  assert.equal(respA.status(), 200, '带 _versions 的快照应 200（P0-1；旧语义为 204）');
  const bodyA = await respA.json();
  assert.equal(typeof (bodyA.versions || {}).notices, 'number', `响应应回传集合新版本（实测 ${JSON.stringify(bodyA)}）`);
  assert.ok(idsIn('notices', 'mw-notice-A3').includes('mw-notice-A3'), 'A 的通知应先落库');
  const countBefore = app.locals.db.prepare('SELECT COUNT(*) AS c FROM notices').get().c;

  // ② B（基线已过期）写**同一集合** → 必须 409，且整批不写
  const respBP = snapshotPost(pageB);
  await pushAndPersist(pageB, 'notices', { id: 'mw-notice-B3', title: 'B3', content: 'x', priority: 'normal', publishDate: '2026-09-02', expireDate: '2026-09-09', read: false });
  const respB = await respBP;
  assert.equal(respB.status(), 409, '同集合后写者应被拒（P0-1 乐观锁）');
  const bodyB = await respB.json();
  assert.ok(
    Array.isArray(bodyB.conflicts) && bodyB.conflicts.some((c) => c.collection === 'notices'),
    `409 应给出冲突集合清单（实测 ${JSON.stringify(bodyB)}）`
  );

  // ③ 先写者数据不丢 + 集合仍完整（被拒的整表替换不得动到集合 ⇒ 不再出现「半空集合」）
  const afterIds = idsIn('notices', 'mw-notice-%');
  assert.ok(afterIds.includes('mw-notice-A3'), `先写者数据必须保留（实测 ${JSON.stringify(afterIds)}）`);
  assert.ok(!afterIds.includes('mw-notice-B3'), '后写者的数据不得落库（否则即「覆盖先写者」）');
  const countAfter = app.locals.db.prepare('SELECT COUNT(*) AS c FROM notices').get().c;
  assert.equal(countAfter, countBefore, '被拒的整表替换不得改动集合（须整批不写）');

  // ④ 前端行为（不静默）：冲突集合被重拉采用服务端数据 + 业务语言提示
  await pageB.waitForFunction(
    () => ((document.getElementById('toast-container') || {}).textContent || '').includes('数据已被他人更新'),
    null,
    { timeout: 10000 }
  );
  const bAdoptedServerRow = await pageB.evaluate(async (id) => {
    const { mockDB } = await import('/src/core/domain/domain.js?v=20261005j');
    return (mockDB.notices || []).some((n) => n.id === id);
  }, 'mw-notice-A3');
  assert.equal(bAdoptedServerRow, true, 'B 遇 409 后应重拉冲突集合并采用服务端数据（不得继续拿本地旧集合）');

  await pageA.close(); await pageB.close();
  await ctxA.close(); await ctxB.close();
});
