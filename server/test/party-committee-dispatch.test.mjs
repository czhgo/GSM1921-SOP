// server/test/party-committee-dispatch.test.mjs — P3 党委后台「下发通知」E2E（2026-09-02）
// 验收（设计 §5 P3 双向通道下发半侧 + 书记裁定「复用通知」）：
//   ① 党委组织员在党委工作台「下发通知」选支部下发 → 下发历史即时可见
//   ② 目标支部的支委层成员（书记储子禾 p13）在通知铃铛看到该条（标「党委下发」）
//   ③ 非支委不打扰：党委组织员自身（非支委）铃铛不可见；普通成员（宋佳宁 p5）铃铛不可见
//
// 自包含：createApp(:memory:) + seedDatabase；三账号（p_pc / p13 / p5）。

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

async function newPage() {
  const page = await browser.newPage();
  await page.route('**://fonts.googleapis.com/**', (r) => r.abort());
  await page.route('**://fonts.gstatic.com/**', (r) => r.abort());
  await page.route('**://cdn.tailwindcss.com/**', (r) => r.abort());
  return page;
}

async function loginAs(page, { studentId, expectUrlPart }) {
  await page.goto(`${base}/login.html`, { waitUntil: 'domcontentloaded' });
  await page.fill('#student-id', studentId);
  await page.fill('#password', '123456');
  await Promise.all([
    page.waitForURL(`**/workspace/${expectUrlPart}`, { timeout: 15000 }),
    page.click('button[type="submit"]'),
  ]);
  await page.waitForFunction(() => Boolean(document.getElementById('app-header')), { timeout: 15000 });
}

async function activateTab(page, tabLabel) {
  await page.waitForFunction(() => Boolean(document.querySelector('.ws-tab-scroll button')), { timeout: 15000 });
  await page.evaluate((label) => {
    const btn = [...document.querySelectorAll('.ws-tab-scroll button')]
      .find((b) => b.textContent.includes(label));
    if (btn) btn.click();
  }, tabLabel);
}

/** 打开通知铃铛下拉并返回其文本（未打开前为 null） */
async function openBell(page) {
  await page.waitForFunction(() => Boolean(document.getElementById('notif-btn')), { timeout: 15000 });
  await page.evaluate(() => document.getElementById('notif-btn')?.click());
  await page.waitForFunction(() => {
    const d = document.getElementById('notif-dropdown');
    return d && !d.classList.contains('hidden');
  }, { timeout: 8000 });
  return page.evaluate(() => document.getElementById('notif-dropdown')?.textContent || '');
}

test('P3 党委下发：支委层收件可见（书记），党委自身/普通成员不可见', async () => {
  const titleD = `P3党委下发-${Date.now()}`;
  const partyPage = await newPage();
  const secPage = await newPage();
  const memberPage = await newPage();

  try {
    // ── ① 党委组织员（p_pc）→ 下发通知 tab → 下发到 br-b1 ──
    await loginAs(partyPage, { studentId: '9000000001', expectUrlPart: 'party-committee.html' });
    await activateTab(partyPage, '下发通知');
    await page_waitText(partyPage, '撰写下发通知');
    await partyPage.evaluate((title) => {
      const t = document.getElementById('dispatch-title');
      const c = document.getElementById('dispatch-content');
      if (t) { t.value = title; t.dispatchEvent(new Event('input', { bubbles: true })); }
      if (c) { c.value = '请支委会对照落实，重要事项及时向支部大会传达。'; c.dispatchEvent(new Event('input', { bubbles: true })); }
      document.getElementById('dispatch-submit')?.click();
    }, titleD);
    await page_waitText(partyPage, titleD); // 下发历史出现该条

    // 党委组织员（非支委）自身铃铛看不到下发（audience=committee 过滤）
    const partyBell = await openBell(partyPage);
    assert.ok(!partyBell.includes(titleD), '党委组织员（非支委）不应在自己的通知铃铛看到支委层下发');

    // ── ② 书记储子禾（p13，br-b1 支委层）铃铛可见该下发 ──
    await loginAs(secPage, { studentId: '2300010001', expectUrlPart: 'secretary.html' });
    const secBell = await openBell(secPage);
    assert.ok(secBell.includes(titleD), `书记（支委层）应看到党委下发（铃铛含 "${titleD}"）`);
    assert.ok(secBell.includes('党委下发'), '铃铛条目应带「党委下发」来源标识');

    // ── ③ 普通成员宋佳宁（p5，非支委）铃铛不可见 ──
    await loginAs(memberPage, { studentId: '2400012349', expectUrlPart: 'visitor.html' });
    const memBell = await openBell(memberPage);
    assert.ok(!memBell.includes(titleD), '普通成员（非支委）不应看到支委层下发');
  } finally {
    await partyPage.close();
    await secPage.close();
    await memberPage.close();
  }
});

async function page_waitText(page, text, timeout = 12000) {
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
