// role: [工程师]+[AI]
// copy-anchor-guard-e2e.test.mjs — 口径定点 E2E 守卫（2026-09-25 制度口径定点批）
//
// 静态守卫（copy-master-guard.test.mjs）只核「登记属性齐备 / 深链字符串可解析」；**「新锚点真的能被
// 目录-检索机制抽到、点得动」只有真机跑得出来**——help 的搜索索引是运行时建的（help-catalog.js 在
// DOMContentLoaded 后遍历 `.help-card[data-search]`），静态在场 ≠ 被索引。故本守卫自起实例 + 真机：
//   A1 深链可达：`/help.html#card-copy-party-group` / `#card-copy-review-submit` 直达且目标可见
//   A2 可检索：搜索框输入关键词 → 定点点位出现在结果里 → 点结果 → 该卡片高亮（既有检索体例未被绕开）
// 离线口径同 help-e2e：CDN（tailwind / mermaid / 字体）一律 abort，**不依赖外网**。

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
    await new Promise((r) => server.close(r));
  }
});

async function newPage() {
  const page = await browser.newPage();
  for (const pattern of [
    '**://cdn.jsdelivr.net/**', '**://cdn.tailwindcss.com/**',
    '**://fonts.googleapis.com/**', '**://fonts.gstatic.com/**',
  ]) await page.route(pattern, (r) => r.abort());
  return page;
}

test('A1 口径定点深链：两处新锚点直达且目标可见', async () => {
  const page = await newPage();
  for (const id of ['card-copy-party-group', 'card-copy-review-submit']) {
    await page.goto(`${base}/help.html#${id}`, { waitUntil: 'domcontentloaded' });
    const el = page.locator(`#${id}`);
    assert.equal(await el.count(), 1, `help.html#${id} 不存在（界面深链会成死链）`);
    assert.ok(await el.isVisible(), `help.html#${id} 直达后目标不可见`);
    // 目标必须在「口径定点」节内（不是散落别处），且带登记属性
    const section = await el.locator('xpath=ancestor::section[@id="sec-copy-anchors"]').count();
    assert.equal(section, 1, `#${id} 不在 #sec-copy-anchors 定点节内`);
    assert.ok(await el.locator('.help-card-title').count(), `#${id} 缺 .help-card-title（检索结果取它作标题）`);
  }
  await page.close();
});

test('A2 口径定点可检索：关键词搜得到 → 点结果 → 卡片高亮', async () => {
  const page = await newPage();
  await page.goto(`${base}/help.html`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.help-toc-item', { timeout: 8000 });
  await page.waitForSelector('#help-search-input', { timeout: 8000 });

  const cases = [
    { q: '未分组', title: '党小组与组长' },
    { q: '我的复盘', title: '活动复盘提交位' },
  ];
  for (const { q, title } of cases) {
    await page.fill('#help-search-input', q);
    await page.waitForSelector('.help-search-result', { timeout: 3000 });
    const results = await page.locator('.help-search-result').allTextContents();
    assert.ok(results.some((t) => t.includes(title)),
      `搜索「${q}」的结果里没有「${title}」（新锚点没被检索机制抽到）：${results.join(' / ')}`);
    await page.locator('.help-search-result', { hasText: title }).first().click();
    await page.waitForSelector('.help-card.is-highlighted', { timeout: 3000 });
    const highlighted = await page.locator('.help-card.is-highlighted').getAttribute('id');
    assert.ok(String(highlighted).startsWith('card-copy-'),
      `点结果后高亮的不是定点卡片（实际 #${highlighted}）`);
  }
  await page.close();
});

/** 登录某台 → 点某个 tab（页面名/账号与 page-sweep 的演示账号同源） */
async function loginAndOpenTab(page, studentId, workspace, tabLabel) {
  await page.goto(`${base}/login.html`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#student-id', { timeout: 30000 });
  await page.fill('#student-id', studentId);
  await page.fill('#password', '123456');
  await Promise.all([
    page.waitForURL(`**/workspace/${workspace}.html`, { timeout: 30000 }),
    page.click('button[type="submit"]'),
  ]);
  await page.waitForFunction(() => document.querySelectorAll('button[role="tab"]').length > 0, { timeout: 45000 });
  await page.locator('button[role="tab"]', { hasText: tabLabel }).first().click();
}

test('A3 迁移在界面上真生效：说明行已缩成一行 ＋ 深链（导语 ≤60 字）', async () => {
  // 支书台「党小组」tab：清单卡导语 → #card-copy-party-group；本组活动复盘状态卡导语 → #card-copy-review-submit
  const sec = await newPage();
  await loginAndOpenTab(sec, '2300010001', 'secretary', '党小组');
  for (const id of ['card-copy-party-group', 'card-copy-review-submit']) {
    const link = sec.locator(`a[href="./help.html#${id}"]`);
    await link.first().waitFor({ timeout: 20000 });
    assert.equal(await link.count(), 1, `支书台「党小组」tab 里应恰有 1 处深链 #${id}`);
    const len = await link.first().evaluate((a) => {
      const p = a.closest('p');
      return [...p.textContent.replace(/\s+/g, '')].length;
    });
    assert.ok(len <= 60, `说明行去空白后 ${len} 字 > 60（DESIGN_SYSTEM §4.18 C1）`);
  }
  await sec.close();

  // 组长台「组员进展」tab：复盘状态区块导语 → #card-copy-review-submit（同一口径的第二个界面落点）
  const lead = await newPage();
  await loginAndOpenTab(lead, '2400012345', 'leader', '组员进展');
  const link = lead.locator('a[href="./help.html#card-copy-review-submit"]');
  await link.first().waitFor({ timeout: 20000 });
  assert.equal(await link.count(), 1, '组长台「组员进展」tab 里应恰有 1 处深链 #card-copy-review-submit');
  await lead.close();
});
