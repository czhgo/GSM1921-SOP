// server/test/write-hover-e2e.test.mjs — 主题党日模板卡「整卡 hover 即选」E2E（2026-09-03）
// 书记工作台 活动管理 → 写入活动 → Step1 模板卡：把鼠标移到卡片任意处（含上部色块，
// 非文字按钮）即选中「主题党日」进入 Step2 表单——缩短交互（书记 2026-09-01/09-03）。
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

test('写入向导 Step1：hover 主题党日卡上部色块（非文字按钮）即进入 Step2', async () => {
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
    await page.waitForFunction(() => document.querySelector('[data-tpl-hover="1"]'), { timeout: 8000 });

    // hover 卡片上部（色块区，远离文字按钮）→ 应触发整卡 hover 即选 → Step2 表单（#wp-date）
    const box = await page.evaluate(() => {
      const el = document.querySelector('[data-tpl-hover="1"]');
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + 10 }; // 顶部色块区（标题行），非按钮
    });
    assert.ok(box, '主题党日模板卡存在');
    await page.mouse.move(box.x, box.y);
    await page.waitForFunction(() => document.getElementById('wp-date'), { timeout: 8000 });
    // 确认仍是主题党日路径（Step2 表单出现，含正交维度/活动信息）
    assert.ok(await page.evaluate(() => !!document.getElementById('wp-date')), 'hover 整卡即进入 Step2 表单');
  } finally {
    await page.close();
  }
});
