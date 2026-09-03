// server/test/module-config-e2e.test.mjs — L2 支部工作流模块配置 E2E（2026-09-03）
// 端到端：p13(书记) 登录书记工作台 → 出现「工作台配置」核心 tab →
//   配置页隐藏「活动管理」→ 保存 → reload → 该业务 tab 消失、核心 tab 仍在 →
//   恢复默认 → reload → 活动管理回来。
// 自包含：createApp(:memory:) + seedDatabase + 账号密码登录（2300010001/123456）。

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

async function tabLabels(page) {
  return page.evaluate(() =>
    [...document.querySelectorAll('.secretary-tab-btn')].map(b => b.textContent.trim())
  );
}
async function waitForTab(page, label, timeout = 12000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    const labels = await tabLabels(page).catch(() => []);
    if (labels.includes(label)) return labels;
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`超时：工作台未出现 tab「${label}」`);
}
async function gotoSecretary(page) {
  await page.route('**://fonts.googleapis.com/**', (r) => r.abort());
  await page.route('**://fonts.gstatic.com/**', (r) => r.abort());
  await page.route('**://cdn.tailwindcss.com/**', (r) => r.abort());
  await page.goto(`${base}/login.html`, { waitUntil: 'domcontentloaded' });
  await page.fill('#student-id', '2300010001');
  await page.fill('#password', '123456');
  await Promise.all([
    page.waitForURL('**/workspace/secretary.html', { timeout: 10000 }),
    page.click('button[type="submit"]'),
  ]);
}

test('书记配置支部模块：隐藏业务 tab → reload 生效 → 恢复默认回滚', async () => {
  const page = await browser.newPage();
  try {
    await gotoSecretary(page);
    // ① 核心组含「工作台配置」入口（固定常驻）
    await waitForTab(page, '工作台配置');
    assert.ok((await tabLabels(page)).includes('活动管理'), '初始全开：活动管理在列');

    // ② 进入工作台配置 → 关闭「活动管理」chip → 保存
    await page.evaluate(() => {
      [...document.querySelectorAll('.secretary-tab-btn')].find(b => b.textContent.includes('工作台配置'))?.click();
    });
    await page.waitForFunction(() => document.querySelector('[data-mc-chip="calendar"]'), { timeout: 8000 });
    await page.evaluate(() => {
      document.querySelector('[data-mc-chip="calendar"]')?.click();   // toggle off
      document.querySelector('#mc-save')?.click();
    });
    // 等保存 PATCH 完成（toast 出现或稍候）
    await new Promise((r) => setTimeout(r, 1200));

    // ③ reload → 活动管理 tab 消失；核心 tab（待办/工作台配置）仍在
    await page.reload({ waitUntil: 'domcontentloaded' });
    await waitForTab(page, '工作台配置');
    const afterHide = await tabLabels(page);
    assert.ok(!afterHide.includes('活动管理'), `隐藏后活动管理应消失，实际：${afterHide.join('/')}`);
    assert.ok(afterHide.includes('待办'), '核心 tab 待办仍固定');

    // ④ 恢复默认 → reload → 活动管理回归
    await page.evaluate(() => {
      [...document.querySelectorAll('.secretary-tab-btn')].find(b => b.textContent.includes('工作台配置'))?.click();
    });
    await page.waitForFunction(() => document.querySelector('#mc-reset'), { timeout: 8000 });
    await page.evaluate(() => document.querySelector('#mc-reset')?.click());
    await new Promise((r) => setTimeout(r, 1200));
    await page.reload({ waitUntil: 'domcontentloaded' });
    await waitForTab(page, '活动管理');
    assert.ok((await tabLabels(page)).includes('活动管理'), '恢复默认后活动管理回归');
  } finally {
    await page.close();
  }
});
