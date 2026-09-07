// server/test/help-e2e.test.mjs — help 页 E2E：目录树/搜索/卡片/导图降级
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { createApp } from '../app.js';
import { seedDatabase } from '../seed.js';
import { FUNCTION_CATALOG } from '../../docs/src/core/function-catalog.js?v=20260908a';

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

test('help 页：目录树（致谢第一）+ 搜索 + 章节卡片 + 导图降级', async () => {
  const page = await browser.newPage();
  await page.route('**://cdn.jsdelivr.net/**', (r) => r.abort()); // 模拟离线：mermaid CDN 不可用
  await page.route('**://fonts.googleapis.com/**', (r) => r.abort());
  await page.route('**://fonts.gstatic.com/**', (r) => r.abort());
  await page.route('**://cdn.tailwindcss.com/**', (r) => r.abort());
  await page.goto(`${base}/help.html`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.help-toc-item', { timeout: 8000 });

  // 1. 目录树：第一项为致谢
  const firstToc = await page.textContent('.help-toc-item:first-child');
  assert.ok(firstToc.includes('致谢'), `目录树第一项应为致谢，实际：${firstToc}`);

  // 2. 功能章节卡片渲染：目录驱动的 feature + flow 卡片应全部在场
  // （C2/C3 起静态正文卡片与目录卡片并存，故目录计数只圈 catalog 驱动的两处宿主，
  //   全页 .help-card 总数另含第 3/4/5 章静态正文卡片）
  const expected = FUNCTION_CATALOG.filter((i) => i.kind === 'feature').length
    + FUNCTION_CATALOG.filter((i) => i.kind === 'flow').length;
  const dynamicCount = await page.locator('#help-catalog-slot .help-card, #mermaid-flows .help-card').count();
  assert.equal(dynamicCount, expected, `目录驱动卡片应为 ${expected} 张（feature+flow），实际 ${dynamicCount}`);
  // 静态正文卡片在场抽查：第 3 章域手册 / 第 4 章链路 / 第 5 章党委与配置
  assert.ok(await page.locator('#sec-domains .help-card').count() >= 20, '第 3 章域手册正文卡片在场');
  assert.ok(await page.locator('#sec-flows .help-card[id^="card-chain-"]').count() >= 10, '第 4 章业务链路文字卡片在场');
  assert.ok(await page.locator('#sec-admin .help-card[id^="card-admin-"]').count() >= 3, '第 5 章党委与配置卡片在场');

  // 3. 搜索：输入「补课」→ 匹配条目出现
  await page.fill('#help-search-input', '补课');
  await page.waitForSelector('.help-search-result', { timeout: 3000 });
  const results = await page.locator('.help-search-result').allTextContents();
  assert.ok(results.some((t) => t.includes('补课')), '搜索结果包含补课条目');

  // 4. 点击结果 → 目标卡片高亮
  await page.locator('.help-search-result', { hasText: '补课制度' }).first().click();
  await page.waitForSelector('.help-card.is-highlighted', { timeout: 3000 });
  const highlighted = await page.textContent('.help-card.is-highlighted');
  assert.ok(highlighted.includes('补课制度'), '高亮卡片为补课制度');

  // 5. mermaid CDN 被 abort → 功能地图区优雅降级
  const fallback = await page.locator('#sec-funcmap .mermaid-fallback').count();
  assert.ok(fallback >= 1, '功能地图区显示降级占位');

  // 6. sec-what/sec-tech 对齐现状（2026-09-07 C1）：含「一体化后端」与「18 个页面」，不含旧「纯前端静态架构/14 个页面」
  const techText = await page.textContent('#sec-tech');
  assert.ok(techText.includes('一体化后端'), '技术架构章应含「一体化后端」表述');
  assert.ok(!techText.includes('纯前端静态架构'), '技术架构章不得保留旧「纯前端静态架构」叙事');
  assert.ok(techText.includes('18 个页面'), '技术架构章应为 18 个页面（11 根 + 7 工作台）');
  const whatText = await page.textContent('#sec-what');
  assert.ok(whatText.includes('一体化后端'), '系统是什么章应含「一体化后端」表述');
  assert.ok(whatText.includes('赋权链'), '系统是什么章应含「赋权链」术语');
  assert.ok(!whatText.includes('14 个页面'), '系统是什么章不得保留旧 14 页面数字');

  await page.close();
});
