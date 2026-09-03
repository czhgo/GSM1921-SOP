// server/test/module-config-e2e.test.mjs — 支部配置 E2E（回炉 v2，2026-09-03）
// 党委组织员(p_pc)登录党委工作台 →「支部配置」tab → 选 br-b1 → 停用「活动管理」业务模块
// → 保存 → 书记(p13)工作台 tab 不含「活动管理」、核心固定组仍在 → 党委台恢复默认 → 书记台回归。
// 自包含：createApp(:memory:) + seedDatabase + 账号密码登录。

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { createApp } from '../app.js';
import { seedDatabase } from '../seed.js';

let server, base, browser;

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
async function login(page, sid, urlPart) {
  await page.goto(`${base}/login.html`, { waitUntil: 'domcontentloaded' });
  await page.fill('#student-id', sid);
  await page.fill('#password', '123456');
  await Promise.all([
    page.waitForURL(`**/workspace/${urlPart}.html`, { timeout: 10000 }),
    page.click('button[type="submit"]'),
  ]);
}
async function clickTab(page, sel, text) {
  await page.waitForFunction(({ s, t }) => {
    const b = [...document.querySelectorAll(s)].find(x => x.textContent.includes(t));
    return b && b.isConnected;
  }, { s: sel, t: text }, { timeout: 12000 });
  await page.evaluate(({ s, t }) => {
    [...document.querySelectorAll(s)].find(b => b.textContent.includes(t))?.click();
  }, { s: sel, t: text });
}
async function secretaryTabLabels(page) {
  return page.evaluate(() => [...document.querySelectorAll('.secretary-tab-btn')].map(b => b.textContent.trim()));
}
async function waitSecretaryTab(page, label) {
  await page.waitForFunction((l) => [...document.querySelectorAll('.secretary-tab-btn')].some(b => b.textContent.includes(l)), label, { timeout: 10000 });
}

test('党委「支部配置」：停用业务模块 → 书记台消失 → 恢复默认回归', async () => {
  const party = await newPage();
  try {
    // ① 党委登录 → 支部配置 → 选 br-b1
    await login(party, '9000000001', 'party-committee');
    await clickTab(party, '.ws-tab-scroll button', '支部配置');
    await party.waitForFunction(() => document.getElementById('pc-branch-select'), { timeout: 8000 });
    await party.evaluate(() => {
      const s = document.getElementById('pc-branch-select');
      if (!s) return;
      s.value = 'br-b1';
      s.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await party.waitForFunction(() => document.querySelector('[data-pc-module="calendar"]'), { timeout: 8000 });

    // ② 停用「活动管理」→ 保存
    await party.evaluate(() => {
      document.querySelector('[data-pc-module="calendar"]')?.click();
      document.querySelector('#pc-save')?.click();
    });
    await new Promise((r) => setTimeout(r, 1200));

    // ③ 书记登录书记台 → 活动管理 tab 消失、核心待办仍在
    const sec = await newPage();
    await login(sec, '2300010001', 'secretary');
    await waitSecretaryTab(sec, '待办');
    const labels = await secretaryTabLabels(sec);
    assert.ok(!labels.includes('活动管理'), `停用后书记台无活动管理，实际：${labels.join('/')}`);
    assert.ok(labels.includes('待办'), '核心待办仍固定');

    // ④ 党委台恢复默认 → 书记台刷新回归
    await party.evaluate(() => document.querySelector('#pc-reset')?.click());
    await new Promise((r) => setTimeout(r, 1200));
    await sec.reload({ waitUntil: 'domcontentloaded' });
    await waitSecretaryTab(sec, '活动管理');
    assert.ok((await secretaryTabLabels(sec)).includes('活动管理'), '恢复默认后活动管理回归');
    await sec.close();
  } finally {
    await party.close();
  }
});
