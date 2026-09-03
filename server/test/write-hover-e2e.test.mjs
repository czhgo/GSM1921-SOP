// server/test/write-hover-e2e.test.mjs — 主题党日模板卡「整卡可点」E2E（2026-09-03）
// 书记澄清：仍须【点击】进入，点击热区扩至整卡（不必精准命中文字按钮）；hover 不自动进入。
// 断言：hover 卡片上部色块不进入 Step2；click 色块 → 进入 Step2（#wp-date）。
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

test('写入向导 Step1：hover 色块不进入，click 色块（非文字按钮）才进入 Step2', async () => {
  const page = await browser.newPage();
  await page.route('**://fonts.googleapis.com/**', (r) => r.abort());
  await page.route('**://fonts.gstatic.com/**', (r) => r.abort());
  await page.route('**://cdn.tailwindcss.com/**', (r) => r.abort());
  try {
    // 登录书记
    await page.goto(`${base}/login.html`, { waitUntil: 'domcontentloaded' });
    await page.fill('#student-id', '2300010001');
    await page.fill('#password', '123456');
    await Promise.all([
      page.waitForURL('**/workspace/secretary.html', { timeout: 10000 }),
      page.click('button[type="submit"]'),
    ]);

    // 切活动管理 tab → 打开写入面板（Step1 模板选择）
    await page.waitForFunction(() => {
      const b = [...document.querySelectorAll('.secretary-tab-btn')].find(x => x.textContent.includes('活动'));
      return b && b.isConnected;
    }, { timeout: 12000 });
    await page.evaluate(() => {
      [...document.querySelectorAll('.secretary-tab-btn')].find(b => b.textContent.includes('活动'))?.click();
    });
    await page.waitForFunction(() => document.getElementById('ws-sec-write-btn'), { timeout: 10000 });
    await page.evaluate(() => document.getElementById('ws-sec-write-btn')?.click());
    await page.waitForFunction(() => document.body.textContent.includes('选择活动模板'), { timeout: 8000 });
    await page.waitForFunction(() => document.querySelector('[data-tpl-click="1"]'), { timeout: 8000 });

    // ① hover 卡片上部色块（非文字按钮）→ 不应自动进入（保持 Step1）
    const box = await page.evaluate(() => {
      const el = document.querySelector('[data-tpl-click="1"]');
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + 10 }; // 顶部色块区（标题行），非按钮
    });
    assert.ok(box, '主题党日模板卡存在');
    await page.mouse.move(box.x, box.y);
    await new Promise((r) => setTimeout(r, 600));
    const enteredByHover = await page.evaluate(() => !!document.getElementById('wp-date'));
    assert.equal(enteredByHover, false, 'hover 不自动进入——书记要求仍须点击');

    // ② click 卡片色块（非文字按钮）→ 整卡点击热区生效 → 进入 Step2
    await page.mouse.click(box.x, box.y);
    await page.waitForFunction(() => document.getElementById('wp-date'), { timeout: 8000 });
    assert.ok(await page.evaluate(() => !!document.getElementById('wp-date')), 'click 整卡任意处即进入 Step2 表单');
  } finally {
    await page.close();
  }
});
