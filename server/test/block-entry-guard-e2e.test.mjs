// server/test/block-entry-guard-e2e.test.mjs — L3 S4 主题党日块入口守卫 E2E（2026-09-03）
// 支部停用 theme-party-day（config.blocks.workflowBlocks）→ 书记台写入面板 Step1 主题党日模板卡消失 + 停用提示
// → 恢复默认 → 模板卡回归（默认态与既有行为完全一致）。
// 自包含：createApp(:memory:) + seedDatabase + 账号密码登录 + API 配置写口。

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

async function apiLogin(personId) {
  const res = await fetch(`${base}/api/v1/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ personId }),
  });
  assert.equal(res.status, 200);
  return (await res.json()).token;
}
async function patchBlocks(token, blocks) {
  const res = await fetch(`${base}/api/v1/branches/br-b1/config`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ config: { blocks } }),
  });
  assert.equal(res.status, 200);
  return res.json();
}
async function newPage() {
  const page = await browser.newPage();
  await page.route('**://fonts.googleapis.com/**', (r) => r.abort());
  await page.route('**://fonts.gstatic.com/**', (r) => r.abort());
  await page.route('**://cdn.tailwindcss.com/**', (r) => r.abort());
  return page;
}
async function openWriteStep1(page) {
  await page.goto(`${base}/login.html`, { waitUntil: 'domcontentloaded' });
  await page.fill('#student-id', '2300010001');
  await page.fill('#password', '123456');
  await Promise.all([
    page.waitForURL('**/workspace/secretary.html', { timeout: 10000 }),
    page.click('button[type="submit"]'),
  ]);
  await page.waitForFunction(() => [...document.querySelectorAll('.secretary-tab-btn')].some(b => b.textContent.includes('活动')), null, { timeout: 12000 });
  await page.evaluate(() => [...document.querySelectorAll('.secretary-tab-btn')].find(b => b.textContent.includes('活动'))?.click());
  await page.waitForFunction(() => document.getElementById('ws-sec-write-btn'), null, { timeout: 10000 });
  await page.evaluate(() => document.getElementById('ws-sec-write-btn')?.click());
  await page.waitForFunction(() => document.body.textContent.includes('选择活动模板'), null, { timeout: 8000 });
}

test('S4 主题党日块入口守卫：停用 → Step1 模板卡消失 → 恢复默认回归', async () => {
  const staffToken = await apiLogin('p_pc');

  // ① 基线：默认主题党日模板卡（data-tpl-click="1"）存在
  const page1 = await newPage();
  try {
    await openWriteStep1(page1);
    assert.ok(await page1.evaluate(() => !!document.querySelector('[data-tpl-click="1"]')), '默认主题党日模板卡存在');
  } finally { await page1.close(); }

  // ② 支部停用 theme-party-day → 书记台模板卡消失 + 停用提示
  await patchBlocks(staffToken, {
    outputBlocks: { hiddenBlockIds: [], blockOrder: [] },
    workflowBlocks: { hiddenBlockIds: ['theme-party-day'] },
  });
  const page2 = await newPage();
  try {
    await openWriteStep1(page2);
    const hasThemeCard = await page2.evaluate(() => !!document.querySelector('[data-tpl-click="1"]'));
    assert.equal(hasThemeCard, false, '停用后主题党日模板卡消失');
    const hasNotice = await page2.evaluate(() => document.body.textContent.includes('工作流块「主题党日组织块」已由支部配置停用'));
    assert.equal(hasNotice, true, '显示停用提示');
    const hasThreeMeetings = await page2.evaluate(() => document.body.textContent.includes('三会一课'));
    assert.equal(hasThreeMeetings, true, '三会一课模板不受影响（无对应块守卫）');
  } finally { await page2.close(); }

  // ③ 恢复默认 → 主题党日模板卡回归
  await patchBlocks(staffToken, null);
  const page3 = await newPage();
  try {
    await openWriteStep1(page3);
    assert.ok(await page3.evaluate(() => !!document.querySelector('[data-tpl-click="1"]')), '恢复默认后主题党日模板卡回归');
  } finally { await page3.close(); }

  console.log('[S4] 主题党日块入口守卫: 停用→模板消失+提示 → 恢复→回归 闭环通过');
});
