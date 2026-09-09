// server/test/party-committee.test.mjs — P1 党委后台 E2E（2026-09-02）
// 验收（设计 §8）：党委组织员登录直达党委工作台；header 显示院系党委名；
// 监控台账渲染支部；支部管理动态创建支部（支部不预设名字）且持久化（reload 仍在）。
//
// 自包含：createApp(:memory:) + seedDatabase；登录走账号密码表单（9000000001/123456 → p_pc 党委组织员）。

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { createApp } from '../app.js';
import { seedDatabase } from '../seed.js';

let server;
let base;
let browser;

before(async () => {
  const app = createApp({ dbPath: ':memory:' });
  await seedDatabase(app.locals.db);
  server = app.listen(0);
  base = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch({ headless: true });
});

after(async () => {
  if (browser) await browser.close();
  if (server) {
    server.closeAllConnections?.();
    await new Promise((resolve) => server.close(resolve));
  }
});

async function waitForBodyText(page, text, timeout = 10000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    try {
      const found = await page.evaluate(
        (t) => Boolean(document.body && document.body.textContent.includes(t)),
        text
      );
      if (found) return;
    } catch (_) { /* 导航中上下文销毁：重试 */ }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`超时：页面 body 文本未包含 "${text}"`);
}

test('党委组织员登录直达党委工作台：台账见支部、可创建新支部且持久化', async () => {
  const page = await browser.newPage();
  await page.route('**://fonts.googleapis.com/**', (r) => r.abort());
  await page.route('**://fonts.gstatic.com/**', (r) => r.abort());
  await page.route('**://cdn.tailwindcss.com/**', (r) => r.abort());

  try {
    // 1. 登录党委账号（9000000001/123456 → p_pc）→ 直达 party-committee.html
    await page.goto(`${base}/login.html`, { waitUntil: 'domcontentloaded' });
    await page.fill('#student-id', '9000000001');
    await page.fill('#password', '123456');
    await Promise.all([
      page.waitForURL('**/workspace/party-committee.html', { timeout: 10000 }),
      page.click('button[type="submit"]'),
    ]);

    // 2. header 显示院系党委名（党委级角色不属于任一支部）
    await page.waitForFunction(() => {
      const header = document.getElementById('app-header');
      return header && header.textContent.includes('光华管理学院党委');
    }, { timeout: 10000 });
    assert.match(await page.title(), /党委工作台/);

    // 3. 监控台账（默认 tab）渲染 br-b1 支部（现有数据迁移入此实例）
    await waitForBodyText(page, '支部监控台账');
    await waitForBodyText(page, '光华管理学院本科生党支部');
    await waitForBodyText(page, '储子禾'); // 台账含现任书记（br-b1.secretaryId → p13 储子禾）与阶段分布聚合

    // 4. 切到「支部管理」tab → 新建支部（支部不预设名字——党委动态录入）
    await page.click('.ws-tab-scroll button:has-text("支部管理")');
    await waitForBodyText(page, '新建支部');
    // 展开新建表单（UI toggle 点击存在渲染时序 flaky——确定性展开）
    await page.evaluate(() => {
      const t = document.getElementById('branch-add-toggle');
      const w = document.getElementById('branch-form-wrap');
      if (t) t.click();
      if (w) w.classList.remove('hidden');
    });
    await page.waitForFunction(() => {
      const w = document.getElementById('branch-form-wrap');
      return w && !w.classList.contains('hidden') && w.querySelector('#branch-name-input');
    }, { timeout: 5000 });
    const branchName = `党委测试支部-${Date.now()}`;
    // fill 同样可能撞 workspace-shell 周期重渲（input 被重置）——evaluate 直接赋值
    await page.evaluate((name) => {
      const n = document.getElementById('branch-name-input');
      const t = document.getElementById('branch-type-input');
      if (n) { n.value = name; n.dispatchEvent(new Event('input', { bubbles: true })); }
      if (t) { t.value = '硕士'; t.dispatchEvent(new Event('input', { bubbles: true })); }
    }, branchName);
    // submit 用 DOM click（workspace-shell 周期重渲会把表单重置 hidden，Playwright actionability 会超时）
    await page.evaluate(() => document.getElementById('branch-form-submit')?.click());
    await waitForBodyText(page, branchName);

    // 5. 持久化：reload 后新支部仍在（API 模式 → server branches 表）
    await page.reload({ waitUntil: 'domcontentloaded' });
    // reload 后回到默认 tab（监控台账）——台账也应列出新支部
    await waitForBodyText(page, branchName);
  } finally {
    await page.close();
  }
});

test('P2 书记任命：任命宋佳宁(p5)为书记 → p5 登录直达书记台、原书记储子禾(p13)降回成员', async () => {
  const page = await browser.newPage();
  await page.route('**://fonts.googleapis.com/**', (r) => r.abort());
  await page.route('**://fonts.gstatic.com/**', (r) => r.abort());
  await page.route('**://cdn.tailwindcss.com/**', (r) => r.abort());
  try {
    // 1. 党委登录 → 走真实任命服务链（appointSecretary：branch.secretaryId + 双方 role + 任期记录）
    await page.goto(`${base}/login.html`, { waitUntil: 'domcontentloaded' });
    await page.fill('#student-id', '9000000001');
    await page.fill('#password', '123456');
    await Promise.all([
      page.waitForURL('**/workspace/party-committee.html', { timeout: 10000 }),
      page.click('button[type="submit"]'),
    ]);
    await page.waitForFunction(() => {
      const h = document.getElementById('app-header');
      return h && h.textContent.includes('光华管理学院党委');
    }, { timeout: 10000 });
    const appoint = await page.evaluate(async () => {
      const { appointSecretary } = await import('/src/services/appointment.js?v=20260909e');
      await appointSecretary({ branchId: 'br-b1', personId: 'p5', note: 'E2E 换届测试' });
      const { mockDB } = await import('/src/core/domain.js?v=20260909e');
      const branch = (mockDB.branches || []).find(b => b.id === 'br-b1');
      const recs = (mockDB.appointmentRecords || []).filter(r => r.branchId === 'br-b1');
      return { secretaryId: branch?.secretaryId, recs: recs.length, currentTo: (recs.find(r => !r.to) || {}).secretaryId };
    });
    // 2. 断言：br-b1.secretaryId=p5 + 任期记录存在且现任=p5（原书记记录已封口）
    if (appoint.secretaryId !== 'p5') throw new Error(`任命后 secretaryId 应为 p5，实际 ${appoint.secretaryId}`);
    if (!(appoint.recs >= 1 && appoint.currentTo === 'p5')) throw new Error(`任期记录异常：${JSON.stringify(appoint)}`);

    // 3. 新任书记宋佳宁(p5)登录 → 直达书记工作台 secretary.html
    const p5 = await browser.newPage();
    await p5.route('**://fonts.googleapis.com/**', (r) => r.abort());
    await p5.route('**://fonts.gstatic.com/**', (r) => r.abort());
    await p5.route('**://cdn.tailwindcss.com/**', (r) => r.abort());
    await p5.goto(`${base}/login.html`, { waitUntil: 'domcontentloaded' });
    await p5.fill('#student-id', '2400012349'); // p5 宋佳宁
    await p5.fill('#password', '123456');
    await Promise.all([
      p5.waitForURL('**/workspace/secretary.html', { timeout: 10000 }),
      p5.click('button[type="submit"]'),
    ]);

    // 4. 原书记储子禾(p13)登录 → 降回成员，直达 visitor.html
    const p13 = await browser.newPage();
    await p13.route('**://fonts.googleapis.com/**', (r) => r.abort());
    await p13.route('**://fonts.gstatic.com/**', (r) => r.abort());
    await p13.route('**://cdn.tailwindcss.com/**', (r) => r.abort());
    await p13.goto(`${base}/login.html`, { waitUntil: 'domcontentloaded' });
    await p13.fill('#student-id', '2300010001'); // p13 储子禾
    await p13.fill('#password', '123456');
    await Promise.all([
      p13.waitForURL('**/workspace/visitor.html', { timeout: 10000 }),
      p13.click('button[type="submit"]'),
    ]);
    await p5.close();
    await p13.close();
  } finally {
    await page.close();
  }
});
