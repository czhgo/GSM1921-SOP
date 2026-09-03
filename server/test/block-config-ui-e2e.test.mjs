// server/test/block-config-ui-e2e.test.mjs — L3 S3 支部配置「工作流块」区 E2E（2026-09-03）
// 党委组织员登录 → 支部配置 → 选 br-b1 → 断言 manifest 目录 chips（含制度来源标签）
// → 停用 theme-party-day → 保存 → 重进配置页持久化（置灰）→ 恢复默认回归。
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
async function loginParty(page) {
  await page.goto(`${base}/login.html`, { waitUntil: 'domcontentloaded' });
  await page.fill('#student-id', '9000000001');
  await page.fill('#password', '123456');
  await Promise.all([
    page.waitForURL('**/workspace/party-committee.html', { timeout: 10000 }),
    page.click('button[type="submit"]'),
  ]);
}
async function gotoBranchConfig(page) {
  await page.waitForFunction(() => [...document.querySelectorAll('.ws-tab-scroll button')].some(b => b.textContent.includes('支部配置')), null, { timeout: 12000 });
  await page.evaluate(() => [...document.querySelectorAll('.ws-tab-scroll button')].find(b => b.textContent.includes('支部配置'))?.click());
  await page.waitForFunction(() => document.getElementById('pc-branch-select'), null, { timeout: 8000 });
  await page.evaluate(() => {
    const s = document.getElementById('pc-branch-select');
    if (!s) return;
    s.value = 'br-b1';
    s.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await page.waitForFunction(() => document.querySelector('[data-pc-wblock="theme-party-day"]'), null, { timeout: 8000 });
}

test('S3 工作流块配置区：manifest 目录呈现 → 停用保存 → 重进持久化 → 恢复默认', async () => {
  const party = await newPage();
  try {
    await loginParty(party);
    await gotoBranchConfig(party);

    // ① 工作流块 chips 呈现（manifest 目录 + 制度来源标签）
    const chips = await party.evaluate(() => [...document.querySelectorAll('[data-pc-wblock]')].map(b => ({
      id: b.dataset.pcWblock,
      label: b.textContent.trim(),
      dimmed: b.classList.contains('opacity-45'),
    })));
    assert.ok(chips.some(c => c.id === 'theme-party-day'), '主题党日块 chip 呈现');
    assert.ok(chips.some(c => c.id === 'taskforce-run'), '专班块 chip 呈现');
    const themeChip = chips.find(c => c.id === 'theme-party-day');
    assert.ok(themeChip.label.includes('通用制度'), '主题党日标注 通用制度');
    assert.equal(chips.every(c => !c.dimmed), true, '默认全开（无置灰）');

    // ② 停用 theme-party-day → 保存
    await party.evaluate(() => {
      document.querySelector('[data-pc-wblock="theme-party-day"]')?.click();
      document.querySelector('#pc-save')?.click();
    });
    await new Promise((r) => setTimeout(r, 1200));

    // ③ 重进配置页（reload）→ theme-party-day 置灰（持久化）
    await party.reload({ waitUntil: 'domcontentloaded' });
    await gotoBranchConfig(party);
    const afterReload = await party.evaluate(() => [...document.querySelectorAll('[data-pc-wblock]')].map(b => ({
      id: b.dataset.pcWblock,
      dimmed: b.classList.contains('opacity-45'),
    })));
    assert.equal(afterReload.find(c => c.id === 'theme-party-day')?.dimmed, true, '停用持久化：重进后置灰');
    assert.equal(afterReload.find(c => c.id === 'taskforce-run')?.dimmed, false, '专班块保持启用');

    // ④ 恢复默认 → 全开回归
    await party.evaluate(() => document.querySelector('#pc-reset')?.click());
    await new Promise((r) => setTimeout(r, 1200));
    await party.reload({ waitUntil: 'domcontentloaded' });
    await gotoBranchConfig(party);
    const afterReset = await party.evaluate(() => [...document.querySelectorAll('[data-pc-wblock]')].every(b => !b.classList.contains('opacity-45')));
    assert.equal(afterReset, true, '恢复默认后工作流块全开');

    console.log('[S3] 工作流块配置区: chips 呈现 + 停用持久化 + 恢复默认 闭环通过');
  } finally {
    await party.close();
  }
});
