// server/test/multi-tab-sync.test.mjs — P1-1 判据 A–D：多标签 / 多设备「远端变更探测」（2026-09-24 批次 164）
//
// 病灶（只读审计核实）：`docs/src/data/data-adapter.js::init()` 只在**页面加载那一刻**从服务器拉一次，
//   之后全部读操作走 `mockDB` 内存缓存 ⇒ **B 看到 A 写入的唯一途径是整页重载**（跨标签 / 跨设备同病）。
// 本守卫＝**验收判据**（HTTP + 真机浏览器，不读私有符号，只读可观测面：服务端库 / mockDB / DOM / 返回值）：
//   判据 A（跨标签）：标签 A 写入 flush 后，标签 B **不整页重载**即在探测周期内看到该记录——
//     两条触发面各验一次：① 既有 `visibilitychange` 骨架；② 可见态下的低频定时器（本文件把周期调短以可测）。
//   判据 B（跨设备）：设备 A 写 → 全新 context（＝另一台机器，本机什么都没有）重进即可见，
//     且 `GET /api/v1/snapshot/versions` 上该集合的版本号**严格 +1**。
//   判据 C（不许回滚本机未提交写）：① 防抖窗口内触发探测 ⇒ **整次跳过**（skipped='pending-write'）、
//     本机改动不得被吞、随后仍能正常落库；② 本机**未 persist 的脏集合**逐个排除在重拉清单之外
//     （该集合保持本机内容，其它集合照常刷新）。
//   判据 D（断开时静默）：停掉服务后触发探测 ⇒ **无错误浮层**（`#data-source-error` 不出现）、
//     无 `pageerror`、页面仍可用（数据读得到、DOM 未被替换成错误态）。
//
// ── 2026-09-26 批次 201：判据B「两文件组合红」的**根因已定**，并已在产品侧修准 ──────────────
// 现象（批次 197 记录）：判据B 在「仅两文件组合」（`doc-line-ref` / `link-integrity` + 本文件）下红约
//   33.4s＝轮询耗尽；而本地数据完好（`mockDB.archiveRecords` 含那行）、**零 `POST /api/v1/snapshot`**。
// 根因（本批实测，非推测）：**不是**「等待预算不够」，也**不是**「非前台页 `setTimeout` 节流」——
//   · 后者已实测**否证**：headless 下 `document.visibilityState` 恒为 `visible`（`bringToFront()` 前后
//     一致），页内手动量 50ms / 800ms 定时器实测 57–66ms / 804–813ms（无节流）；
//   · 真因：`init()` 的基线捕获 `_captureBase` 原先落在 **任何 `await` 之后**，而页面就绪信号
//     `mockDB._loaded` 在 init **早期**就为真（`entries/pages/main-entry.js:32` 同步调
//     `services/core/mock.js::loadDB()`，其 API 分支**立刻**置真）⇒ 本文件的就绪门实际只剩
//     `milestones !== undefined`，而它是 `_loadAuxCollections` 第 5/7 个 pull 赋的、**比 `_captureBase` 早**
//     ⇒ 门满足后写入的那一笔被随后捕获的基线一并吞进基线 ⇒ `_collectDirty` 判「无脏集合」
//     ⇒ 防抖 flush **不发 POST**（不是没跑）⇒ 轮询服务端**永远等不到** ⇒ 加预算在构造上无效。
// 处置：① 产品侧（`docs/src/data/data-adapter.js`）把 `_captureBase` 移到任何 `await` 之前
//   （净行数 0、基线内容逐键不变、语义零变化）；② 本文件把「等落库」改为**等产品自己的结算承诺**
//   （`core/session/pending-writes.js::settleWrites()`）——跑一次即定、真丢写立刻报红，不再靠等更久掩盖。
// 实测（本机，诊断脚本）：就绪门一满足即写 ⇒ **修前 6/6 静默丢写**（3s 零 POST、本地数组完好、无整页
//   重载）；**修后 1/1 落库**（POST 出现在推入后 868ms＝800ms 防抖 + 68ms）。
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

/** 登录取 token（演示账号统一口令 123456；测试脚本注入 DISABLE_PASSWORD_CHECK=1 亦可） */
async function loginAt(origin, personId) {
  const r = await fetch(`${origin}/api/v1/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ personId, password: '123456' }),
  });
  assert.equal(r.status, 200, `登录 ${personId} 应 200`);
  return (await r.json()).token;
}

/** 集合版本基线（判据 B 用；与前端 init() 同一条读口） */
async function versions(origin, token) {
  const r = await fetch(`${origin}/api/v1/snapshot/versions`, { headers: { Authorization: `Bearer ${token}` } });
  assert.equal(r.status, 200, 'versions 应 200');
  return (await r.json()).versions;
}

/**
 * 页面就绪（api 形态 + `init()` 完成）：`openApiPage` 与「同 context 多标签」用例共用。
 * ⚠ 就绪判据必须在**主世界**里读模块状态：`page.waitForFunction` 的模块导入可能取到另一份实例，
 *   且 `mockDB._loaded` 会被 mock 形态的 loadDB 先行置位 ⇒ 单独看它会误判。
 */
async function preparePage(page, origin, path = '/index.html') {
  // 离线可复现：外部 CDN 挂起会拖慢首屏，直接 abort（与本仓其它真机用例同法）
  await page.route('**://fonts.googleapis.com/**', (r) => r.abort());
  await page.route('**://fonts.gstatic.com/**', (r) => r.abort());
  await page.route('**://cdn.tailwindcss.com/**', (r) => r.abort());
  await page.goto(`${origin}${path}`, { waitUntil: 'domcontentloaded' });
  // ⚠ 置前（2026-09-25 批次 197 加）：**保留**，但它的作用已被本批（2026-09-26 批次 201）**实测纠正**——
  //   批次 197 当时判「非前台页 `setTimeout` 被节流 ⇒ 防抖写穿永不跑」，**该判据已实测否证**：
  //   headless 下 `document.visibilityState` **恒为 `visible`**（`bringToFront()` 前后读数一致），
  //   页内手动量 50ms / 800ms 定时器实测 **57–66ms / 804–813ms**（无节流）；且加上 `bringToFront()`
  //   之后判据B 的红**并未消失**（批次 197 已如实登记）⇒ 判据B 另有根因，见文件头「批次 201」段。
  //   此处继续置前，仅因本判据的前提本就是「一个**可见**的标签页 / 设备」（判据A 亦断言
  //   `visibilityState==='visible'`）——**不是**「加预算、放宽断言」的手段。
  await page.bringToFront();
  await page.evaluate(async () => {
    const t0 = Date.now();
    for (;;) {
      const { getRuntimeMode } = await import('/src/data/data-adapter.js?v=20260930g');
      const { mockDB } = await import('/src/core/domain/domain.js?v=20260930g');
      if (getRuntimeMode().source === 'api' && mockDB._loaded === true && mockDB.milestones !== undefined) return;
      if (Date.now() - t0 > 20000) throw new Error('[P1-1] 页面数据层未在 20s 内就绪');
      await new Promise((r) => setTimeout(r, 50));
    }
  });
}

/** 预置会话 token（＝已登录标签页；sessionStorage 是**每标签**独立的，故同 context 的两个标签可各持一个身份） */
const injectToken = (target, token) => target.addInitScript(
  (t) => { try { sessionStorage.setItem('gsm1921-api-token', t); } catch (_) {} }, token);

/**
 * 打开一个 api 形态的真页面（等价于「一台已登录的设备/标签」）。
 * token 由 `addInitScript` 预置（＝已登录会话），页面走 `index.html`（`main-entry.js` 的 visibilitychange 骨架在此）。
 * ⚠ 每个用例各起**独立 context**：Playwright 的 context 是隔离存储（相当于「另一台设备」），
 *   `BroadcastChannel` **不跨 context** ⇒ 跨设备场景走的就是低频轮询这一条路。
 */
async function openApiPage(origin, personId, path = '/index.html') {
  const token = await loginAt(origin, personId);
  const ctx = await browser.newContext();
  await injectToken(ctx /* context 级：该 context 内所有页 */, token);
  const page = await ctx.newPage();
  await preparePage(page, origin, path);
  return { ctx, page, token };
}

/** 等在飞写落定（防抖 800ms + 落库）：期间探测会被「pending-write」规避，等齐后再断言 */
const settle = (page, ms = 1800) => page.waitForTimeout(ms);

/** 本机读写同一实例的探测入口（返回探测结果，供断言 skipped / changed） */
const probe = (page) => page.evaluate(async () => {
  const { probeRemoteChanges } = await import('/src/data/data-adapter.js?v=20260930g');
  return probeRemoteChanges();
});

/** 轮询等到本机已无在途写（探测不再返回 pending-write），保证后续断言只看「探测本身」 */
async function waitIdle(page, tries = 20) {
  for (let i = 0; i < tries; i++) {
    const r = await probe(page);
    if (r.skipped !== 'pending-write' && r.skipped !== 'in-flight' && r.skipped !== 'not-ready') return r;
    await page.waitForTimeout(300);
  }
  throw new Error('[P1-1] 页面始终有在途写，无法进入可探测状态');
}

/** 以正式写路径（mockDB 变更 → persist → 防抖快照写穿）写入若干集合 */
const pushAndPersist = (page, rowsByCollection) => page.evaluate(async (map) => {
  const { mockDB } = await import('/src/core/domain/domain.js?v=20260930g');
  const { persist } = await import('/src/data/data-adapter.js?v=20260930g');
  for (const [collection, row] of Object.entries(map)) mockDB[collection].push(row);
  persist();
}, rowsByCollection);

const noticeRow = (id) => ({ id, title: id, content: 'P1-1', priority: 'normal', publishDate: '2026-09-24', expireDate: '2026-10-01', read: false });
const idsIn = (table, prefix) => app.locals.db.prepare(`SELECT id FROM ${table} WHERE id LIKE ? ORDER BY id`).all(`${prefix}%`).map((r) => r.id);

// ════════════════════════════════════════════════════════════════
//  判据 A（跨标签）
// ════════════════════════════════════════════════════════════════
test('判据A 跨标签：A 写 flush 后，B 不整页重载即可见（① visibilitychange 骨架 ② 低频定时器）', async () => {
  const a = await openApiPage(base, 'p10');
  const b = await openApiPage(base, 'p11');
  try {
    assert.equal(await b.page.evaluate(() => document.visibilityState), 'visible',
      '前置：真机页须为可见态（隐藏态按设计不探测）');
    await waitIdle(b.page); // B 静置到无在途写（消除页面初始化期间的本地写干扰）

    // ① 既有 visibilitychange 骨架触发
    await pushAndPersist(a.page, { notices: noticeRow('p11-tab-A1') });
    await settle(a.page);
    assert.ok(idsIn('notices', 'p11-tab-A1').includes('p11-tab-A1'), '前置：A 的写入应已落服务端');
    assert.equal(await b.page.evaluate(async () => {
      const { mockDB } = await import('/src/core/domain/domain.js?v=20260930g');
      return (mockDB.notices || []).some((n) => n.id === 'p11-tab-A1');
    }), false, 'B 未探测前不应看到 A 的记录（证明「不重载就看不见」的病灶真实存在）');
    await b.page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
    await b.page.waitForFunction(async () => {
      const { mockDB } = await import('/src/core/domain/domain.js?v=20260930g');
      return (mockDB.notices || []).some((n) => n.id === 'p11-tab-A1');
    }, null, { timeout: 15000 });
    console.log('[判据A-①] B 经 visibilitychange 探测看到 A 的记录（未重载）');

    // ② 低频定时器触发（本文件把周期调短以可测；生产缺省 60s）
    await pushAndPersist(a.page, { notices: noticeRow('p11-tab-A2') });
    await settle(a.page);
    const armed = await b.page.evaluate(async () => {
      const m = await import('/src/data/data-adapter.js?v=20260930g');
      m.stopRemoteChangeProbe();
      return m.startRemoteChangeProbe(400);
    });
    assert.equal(armed, true, '判据A-②：应能挂上探测定时器');
    await b.page.waitForFunction(async () => {
      const { mockDB } = await import('/src/core/domain/domain.js?v=20260930g');
      return (mockDB.notices || []).some((n) => n.id === 'p11-tab-A2');
    }, null, { timeout: 15000 });
    console.log('[判据A-②] B 经低频定时器探测看到 A 的第二条记录（未重载）');
  } finally {
    await a.ctx.close();
    await b.ctx.close();
  }
});

// ── 判据 A-③：**同源多标签**的 `BroadcastChannel` 唤醒（零网络即时通知）──────────
// ⚠ 为什么必须用**同一个 context 的两个标签**：Playwright 的 context 之间是隔离存储 ⇒ `BroadcastChannel`
//   不跨 context（上面两个用例用的就是隔离 context＝「另一台设备」）⇒ 广播那条路只能在这里测。
// 关键：本用例**不派发** visibilitychange、也**不调短**定时器周期（缺省 60s）⇒ 20s 内拿到新记录只可能来自广播。
test('判据A-③ 同源多标签：A 标签写成功后，B 标签由 BroadcastChannel 唤醒（不依赖轮询周期）', async () => {
  const tokenA = await loginAt(base, 'p10');
  const tokenB = await loginAt(base, 'p11');
  const ctx = await browser.newContext();
  try {
    const pageA = await ctx.newPage();
    await injectToken(pageA, tokenA);
    await preparePage(pageA, base);
    const pageB = await ctx.newPage();
    await injectToken(pageB, tokenB);
    await preparePage(pageB, base);
    await pageB.bringToFront(); // B 前置：只有「可见」标签才响应广播（隐藏标签按设计不探测）
    await waitIdle(pageB);
    const vis = await pageB.evaluate(() => document.visibilityState);
    await pushAndPersist(pageA, { notices: noticeRow('p11-tab-BC1') });
    const t0 = Date.now();
    await pageB.waitForFunction(async () => {
      const { mockDB } = await import('/src/core/domain/domain.js?v=20260930g');
      return (mockDB.notices || []).some((n) => n.id === 'p11-tab-BC1');
    }, null, { timeout: 20000 });
    const ms = Date.now() - t0;
    assert.ok(ms < 20000, `应在一个轮询周期（60s）之内看到（实测 ${ms}ms）`);
    console.log(`[判据A-③] B 标签由 BroadcastChannel 唤醒看到 A 的记录：${ms}ms（B 可见态=${vis}；未派发 visibilitychange、周期仍为缺省 60s）`);
  } finally {
    await ctx.close();
  }
});

// ════════════════════════════════════════════════════════════════
//  判据 B（跨设备）
// ════════════════════════════════════════════════════════════════
test('判据B 跨设备：设备A写 → 设备B重进可见，且该集合版本严格 +1', async () => {
  const tokenA = await loginAt(base, 'p10');
  const v0 = await versions(base, tokenA);
  const a = await openApiPage(base, 'p10');
  let bToken, v1, seen;
  try {
    // ⓪ 写入 + **等产品自己的「落库已结算」承诺**（`core/session/pending-writes.js::settleWrites`）。
    //   为什么是它、而不是「轮询服务端直到该行出现」：本前置要证的正是「这次写真的存下去了」，
    //   `persist()` 在排程那一刻就把这笔写登记进 `pending-writes`、`_flushSnapshot` 落地/失败时结算
    //   ⇒ 结算 = POST 已返回 200（`_flushSnapshot` 在 `snapshot()` 返回之后才 resolve 那个 deferred）。
    //   ⚠ 2026-09-26 批次 201 **实测纠正**：批次 182 / 197 把这里的等待从「20 × 300ms」加到
    //   「`waitIdle` + 60 × 500ms（30s）」是**治错对象**——那两次红都不是「写得慢」：诊断脚本实测
    //   **推入后 3 秒零 `POST /api/v1/snapshot`、本地数组完好、无整页重载**，即 **flush 跑了但
    //   `_collectDirty` 判「无脏集合」⇒ 产品自己决定不发这个 POST**（根因＝init 的基线捕获晚于就绪信号，
    //   已在 `docs/src/data/data-adapter.js` 修准，见文件头「批次 201」段）⇒ **轮询服务端永远等不到**，
    //   加预算在构造上无效。现改为**有界结算等待**：结算完成仍查不到 = **真丢写**，立刻报红；
    //   15s 上界只用于把「迟迟不结算」变成明确失败，**不给慢留余地**。**判据语义一字未变**。
    const settleRes = await a.page.evaluate(async (row) => {
      const { mockDB } = await import('/src/core/domain/domain.js?v=20260930g');
      const { persist } = await import('/src/data/data-adapter.js?v=20260930g');
      const { settleWrites } = await import('/src/core/session/pending-writes.js?v=20260930g');
      mockDB.archiveRecords.push(row);
      persist();
      const t0 = Date.now();
      const settled = settleWrites().then(() => 'ok', (e) => `error:${(e && e.message) || e}`);
      const expired = new Promise((r) => setTimeout(() => r('timeout'), 15000));
      return { status: await Promise.race([settled, expired]), ms: Date.now() - t0 };
    }, { id: 'p11-dev-A1', title: 'P1-1 跨设备', archivedAt: '2026-09-24' });
    assert.equal(settleRes.status, 'ok',
      `设备 A 的写入未在 15s 内结算（settleWrites=${settleRes.status}，耗时 ${settleRes.ms}ms）——「防抖快照没跑」与「跑了却判无脏集合」是两件事，须先查清再放行`);
    // 服务端库为权威（表名＝资源名的 snake_case：archiveRecords → archive_records）。
    // 结算即 POST 已返回（且服务端 handler 全同步）⇒ 此刻的读就是权威值，**无需再轮询**。
    const landed = idsIn('archive_records', 'p11-dev-A1').includes('p11-dev-A1');
    assert.ok(landed, '前置：设备 A 的写入应已落服务端（结算已完成却查不到 ⇒ 快照并未真正落库）');
    v1 = await versions(base, tokenA);
  } finally {
    await a.ctx.close();
  }
  // 设备 B：**全新 context**（sessionStorage/localStorage 全空）⇒ 等价于「换一台机器重进页面」
  const b = await openApiPage(base, 'p11');
  try {
    bToken = b.token;
    seen = await b.page.evaluate(async () => {
      const { mockDB } = await import('/src/core/domain/domain.js?v=20260930g');
      return (mockDB.archiveRecords || []).some((r) => r.id === 'p11-dev-A1');
    });
  } finally {
    await b.ctx.close();
  }
  assert.equal(seen, true, '设备 B 重进页面即应看到设备 A 的记录（服务端为权威，不靠本机缓存）');
  const before = Number(v0.archiveRecords || 0);
  const after = Number(v1.archiveRecords || 0);
  assert.equal(after, before + 1, `archiveRecords 集合版本应严格 +1（写前 ${before} → 写后 ${after}；token=${Boolean(bToken)}）`);
  console.log(`[判据B] 设备B 重进可见=true；archiveRecords 版本 ${before} → ${after}（严格 +1）`);
});

// ════════════════════════════════════════════════════════════════
//  判据 C（不许回滚本机未提交写）
// ════════════════════════════════════════════════════════════════
test('判据C-① 防抖窗口内探测整次跳过，本机改动不被吞、随后仍正常落库', async () => {
  const b = await openApiPage(base, 'p11');
  try {
    await waitIdle(b.page);
    const r = await b.page.evaluate(async () => {
      const { mockDB } = await import('/src/core/domain/domain.js?v=20260930g');
      const { persist, probeRemoteChanges } = await import('/src/data/data-adapter.js?v=20260930g');
      mockDB.notices.push({
        id: 'p11-c1-local', title: 'p11-c1-local', content: 'x', priority: 'normal',
        publishDate: '2026-09-24', expireDate: '2026-10-01', read: false,
      });
      persist();                                  // ⇒ 防抖 800ms 窗口内
      const p = await probeRemoteChanges();       // 立刻探测（最容易做错的一条）
      return { p, stillLocal: (mockDB.notices || []).some((n) => n.id === 'p11-c1-local') };
    });
    assert.equal(r.p.skipped, 'pending-write', `防抖窗口内探测必须整次跳过（实测 ${JSON.stringify(r.p)}）`);
    assert.equal(r.stillLocal, true, '本机刚写、尚未上传的改动不得被探测回滚');
    await settle(b.page);
    assert.ok(idsIn('notices', 'p11-c1-local').includes('p11-c1-local'), '跳过探测后，本机改动应照常落库（未被吞）');
    const stillLocal = await b.page.evaluate(async () => {
      const { mockDB } = await import('/src/core/domain/domain.js?v=20260930g');
      return (mockDB.notices || []).some((n) => n.id === 'p11-c1-local');
    });
    assert.equal(stillLocal, true, '落库后本机记录仍在');
    console.log(`[判据C-①] skipped=${r.p.skipped}；本机改动保留=${r.stillLocal}；落库=${idsIn('notices', 'p11-c1-local').join(',')}`);
  } finally {
    await b.ctx.close();
  }
});

test('判据C-② 本机未 persist 的脏集合不重拉（其它集合照常刷新）', async () => {
  const a = await openApiPage(base, 'p10');
  const b = await openApiPage(base, 'p11');
  try {
    await waitIdle(b.page);
    // B 本机：weeklyReports 上有**未 persist** 的本地改动（`_collectDirty` 认为脏、但无在途写）
    await b.page.evaluate(async () => {
      const { mockDB } = await import('/src/core/domain/domain.js?v=20260930g');
      mockDB.weeklyReports.push({ id: 'p11-c2-local', week: 'W-local', content: 'x' });
    });
    // A 写两个集合：一个与 B 的脏集合同名（weeklyReports），一个是干净集合（archiveRecords）
    await pushAndPersist(a.page, {
      weeklyReports: { id: 'p11-c2-server', week: 'W-server', content: 'y' },
      archiveRecords: { id: 'p11-c2-arch', title: 'P1-1 C2', archivedAt: '2026-09-24' },
    });
    await settle(a.page);
    const r = await probe(b.page);
    const local = await b.page.evaluate(async () => {
      const { mockDB } = await import('/src/core/domain/domain.js?v=20260930g');
      return {
        keepLocal: (mockDB.weeklyReports || []).some((w) => w.id === 'p11-c2-local'),
        gotOther: (mockDB.archiveRecords || []).some((x) => x.id === 'p11-c2-arch'),
        tookServerForDirty: (mockDB.weeklyReports || []).some((w) => w.id === 'p11-c2-server'),
      };
    });
    assert.equal(local.keepLocal, true, '本机未提交的脏集合不得被远端数据覆盖（否则即「回滚本机未提交的写」）');
    assert.equal(local.tookServerForDirty, false, '判据同源：该集合本次根本不应进入重拉清单');
    assert.equal(local.gotOther, true, '干净集合应照常刷新（探测未被整体关掉）');
    assert.ok(!(r.changed || []).includes('weeklyReports'), `脏集合不得出现在 changed 里（实测 ${JSON.stringify(r)}）`);
    assert.ok((r.changed || []).includes('archiveRecords'), `干净集合应出现在 changed 里（实测 ${JSON.stringify(r)}）`);
    console.log(`[判据C-②] changed=${JSON.stringify(r.changed)} keepLocal=${local.keepLocal} gotOther=${local.gotOther}`);
  } finally {
    await a.ctx.close();
    await b.ctx.close();
  }
});

// ════════════════════════════════════════════════════════════════
//  判据 D（断开时静默）
// ════════════════════════════════════════════════════════════════
test('判据D 断服后探测静默：无错误浮层 / 无 pageerror / 页面仍可用', async () => {
  // 独立一例服务：本用例要**停掉**它（不动上面的共享实例）
  const app2 = createApp({ dbPath: ':memory:' });
  await seedDatabase(app2.locals.db);
  const srv2 = app2.listen(0);
  const base2 = `http://127.0.0.1:${srv2.address().port}`;
  const page = await (async () => {
    const p = await openApiPage(base2, 'p11');
    return p;
  })();
  const errors = [];
  page.page.on('pageerror', (e) => errors.push(String(e)));
  try {
    await new Promise((r) => { srv2.closeAllConnections?.(); srv2.close(r); }); // ⇒ 服务断开
    const r = await probe(page.page);
    assert.equal(r.skipped, 'unreachable', `断服时探测须静默降级为 unreachable（实测 ${JSON.stringify(r)}）`);
    const ui = await page.page.evaluate(async () => {
      const { mockDB } = await import('/src/core/domain/domain.js?v=20260930g');
      const { getRuntimeMode } = await import('/src/data/data-adapter.js?v=20260930g');
      return {
        hasErrorOverlay: Boolean(document.getElementById('data-source-error')),
        stillUsable: Array.isArray(mockDB.notices) && mockDB.notices.length > 0,
        headerPresent: Boolean(document.getElementById('app-header')),
        source: getRuntimeMode().source,
      };
    });
    assert.equal(ui.hasErrorOverlay, false, '断服探测**不得**弹错误浮层（写链 fail-fast 与探测静默是两件事）');
    assert.equal(ui.stillUsable, true, '页面数据仍可读（探测不破坏本机可用性）');
    assert.equal(ui.headerPresent, true, '页面结构未被替换成错误态');
    assert.deepEqual(errors, [], `不得有 pageerror（实测 ${errors.join(' | ')}）`);
    console.log(`[判据D] skipped=${r.skipped} 错误浮层=${ui.hasErrorOverlay} 页面可用=${ui.stillUsable} pageerror=${errors.length} 形态=${ui.source}`);
  } finally {
    await page.ctx.close();
  }
});
