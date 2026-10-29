// server/test/help-e2e.test.mjs — help 页 E2E：目录树/搜索/卡片/导图降级
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { createApp } from '../app.js';
import { seedDatabase } from '../seed.js';
import { FUNCTION_CATALOG } from '../../docs/src/core/domain/function-catalog.js?v=20261029b';

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

  // 6. sec-what/sec-tech 对齐现状：含「一体化后端」与动态页面口径（根页面 + 工作台，页面清单以 docs/ 实测为准），不含固定页数（19 页/12 根/7 台）与旧「纯前端静态架构/14 个页面」
  const techText = await page.textContent('#sec-tech');
  assert.ok(techText.includes('一体化后端'), '技术架构章应含「一体化后端」表述');
  assert.ok(!techText.includes('纯前端静态架构'), '技术架构章不得保留旧「纯前端静态架构」叙事');
  assert.ok(techText.includes('页面清单以 docs/ 实测为准'), '技术架构章应为动态页面口径（以 docs/ 实测为准）');
  assert.ok(!/19 页|12 个根页面|7 个工作台|19 个独立 HTML 页面/.test(techText), '技术架构章不得保留固定页数口径');
  const whatText = await page.textContent('#sec-what');
  assert.ok(whatText.includes('一体化后端'), '系统是什么章应含「一体化后端」表述');
  assert.ok(whatText.includes('赋权链'), '系统是什么章应含「赋权链」术语');
  assert.ok(!whatText.includes('14 个页面'), '系统是什么章不得保留旧 14 页面数字');

  await page.close();
});

test('Help 搜索覆盖卡片正文并提供摘要与可分享的定位链接', async () => {
  const page = await browser.newPage();
  await page.route('**://cdn.jsdelivr.net/**', (r) => r.abort());
  await page.route('**://fonts.googleapis.com/**', (r) => r.abort());
  await page.route('**://fonts.gstatic.com/**', (r) => r.abort());
  await page.route('**://cdn.tailwindcss.com/**', (r) => r.abort());
  await page.goto(`${base}/help.html`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.help-toc-item', { timeout: 8000 });

  await page.fill('#help-search-input', '副支书共台');
  await page.waitForFunction(() => document.querySelectorAll('.help-search-result').length > 0, null, { timeout: 3000 });
  const result = page.locator('.help-search-result').filter({ hasText: '会议议程与记录' }).first();
  assert.equal(await result.getAttribute('href'), '#card-dom31-agenda');
  assert.ok((await result.textContent()).includes('副支书共台'), '搜索结果展示命中正文的摘要');
  await result.click();
  assert.equal(new URL(page.url()).hash, '#card-dom31-agenda', '点击结果更新可分享的章节锚点');
  await page.waitForSelector('#card-dom31-agenda.is-highlighted', { timeout: 3000 });
  await page.close();
});

test('Help 搜索覆盖章节表格，并提供按角色与常见任务浏览', async () => {
  const page = await browser.newPage();
  await page.route('**://cdn.jsdelivr.net/**', (r) => r.abort());
  await page.route('**://fonts.googleapis.com/**', (r) => r.abort());
  await page.route('**://fonts.gstatic.com/**', (r) => r.abort());
  await page.route('**://cdn.tailwindcss.com/**', (r) => r.abort());
  await page.goto(`${base}/help.html`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.help-toc-item', { timeout: 8000 });

  // 2026-10-20 判例②：思想汇报表行改为「本页只处理例外」；用它验证搜索覆盖章节表格
  //   （原样本「最近 6 期可展开」随全量矩阵撤除而消失）。
  await page.fill('#help-search-input', '本页只处理例外');
  await page.waitForFunction(() => document.querySelectorAll('.help-search-result').length > 0, null, { timeout: 3000 });
  const chapterResult = page.locator('.help-search-result').filter({ hasText: '角色工作台导览' }).first();
  assert.ok(await chapterResult.count(), '结果能定位到章节中的表格说明');
  assert.equal(await chapterResult.getAttribute('href'), '#sec-roles');

  await page.locator('.help-browse summary').click();
  await page.fill('#help-search-input', '');
  await page.locator('#help-role-filter').selectOption('organization');
  await page.waitForFunction(() => document.querySelectorAll('.help-search-result').length > 0, null, { timeout: 3000 });
  const roleResults = await page.locator('.help-search-result').allTextContents();
  assert.ok(roleResults.some((text) => text.includes('组织委员')), '选择角色后显示相关入口');

  const taskLink = page.getByRole('link', { name: '创建会议' });
  assert.equal(await taskLink.getAttribute('href'), '#card-dom31-meeting-create');
  await taskLink.click();
  assert.equal(new URL(page.url()).hash, '#card-dom31-meeting-create');
  await page.close();
});

test('390 帮助页：无整页横溢 + 章节折叠 + 页首目录与搜索保留', async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.route('**://cdn.jsdelivr.net/**', (r) => r.abort());
  await page.route('**://fonts.googleapis.com/**', (r) => r.abort());
  await page.route('**://fonts.gstatic.com/**', (r) => r.abort());
  await page.route('**://cdn.tailwindcss.com/**', (r) => r.abort());
  await page.goto(`${base}/help.html`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.help-toc-item', { timeout: 8000 });

  // 1. 整页不横溢：documentElement 的 scrollWidth 不得超过 390，正文宽度在视口内
  const metrics = await page.evaluate(() => {
    const de = document.documentElement;
    const p = document.querySelector('#sec-ack .doc-p');
    return {
      client: de.clientWidth,
      scroll: de.scrollWidth,
      pRight: Math.round(p.getBoundingClientRect().right),
    };
  });
  assert.ok(metrics.scroll <= 390, `390 整页横溢：scrollWidth=${metrics.scroll}`);
  assert.ok(metrics.pRight <= 390, `390 正文被裁：右边界 ${metrics.pRight}`);

  // 2. 目录在页首且不消失（11 章目录项全部由 help-catalog 渲染）
  assert.equal(await page.locator('.help-toc-item').count(), 11, '390 目录项应保留 11 条');
  assert.ok(await page.locator('#help-toc-slot .help-toc').isVisible(), '390 页首目录不可见');

  // 3. 章节折叠：0–8 编号章均为 <details>；默认收起，点击标题展开
  const chapters = page.locator('details.help-chapter');
  assert.ok(await chapters.count() >= 8, `章节折叠数不足：${await chapters.count()}`);
  assert.equal(await page.locator('details.help-chapter[open]').count(), 0, '章节默认应收起');
  await page.locator('#sec-domains > summary').click();
  await page.waitForSelector('#card-dom31-meeting-create', { state: 'visible', timeout: 3000 });
  assert.equal(await page.evaluate(() => document.getElementById('sec-domains').open), true, '点击章节标题后应展开');

  // 4. 宽表由容器自身横滚（overflow-x:auto），不把页面撑宽
  await page.locator('#sec-quickstart > summary').click();
  await page.waitForSelector('#sec-quickstart .doc-table-wrap', { state: 'visible', timeout: 3000 });
  const table = await page.evaluate(() => {
    const wrap = document.querySelector('#sec-quickstart .doc-table-wrap');
    return wrap ? {
      overflow: getComputedStyle(wrap).overflowX,
      client: wrap.clientWidth,
      scroll: wrap.scrollWidth,
    } : null;
  });
  assert.ok(table && table.overflow === 'auto', '表格容器应自身横滚（overflow-x:auto）');
  assert.ok(table && table.scroll >= table.client, '表格内容应限制在自身滚动容器内');
  // 全部章节展开后仍不得横溢（覆盖章内表格、列表与提示块）
  await page.evaluate(() => {
    document.querySelectorAll('details.help-chapter').forEach((d) => { d.open = true; });
  });
  await page.waitForTimeout(120);
  const allOpenScroll = await page.evaluate(() => document.documentElement.scrollWidth);
  assert.ok(allOpenScroll <= 390, `全部章节展开后整页横溢：scrollWidth=${allOpenScroll}`);

  // 5. 搜索保留：命中后自动展开目标章节并高亮
  await page.fill('#help-search-input', '补课');
  await page.waitForSelector('.help-search-result', { timeout: 3000 });
  await page.locator('.help-search-result', { hasText: '补课制度' }).first().click();
  await page.waitForSelector('.help-card.is-highlighted', { timeout: 3000 });
  assert.ok(await page.locator('.help-card.is-highlighted').isVisible(), '搜索命中的卡片应可见');
  await page.close();
});

test('章节折叠不挡深链：带锚点直达时自动展开目标章节', async () => {
  const page = await browser.newPage();
  await page.route('**://cdn.jsdelivr.net/**', (r) => r.abort());
  await page.route('**://fonts.googleapis.com/**', (r) => r.abort());
  await page.route('**://fonts.gstatic.com/**', (r) => r.abort());
  await page.route('**://cdn.tailwindcss.com/**', (r) => r.abort());
  await page.goto(`${base}/help.html#card-dom31-agenda`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#card-dom31-agenda', { state: 'visible', timeout: 5000 });
  assert.equal(await page.evaluate(() => document.getElementById('sec-domains').open), true,
    '深链进入时应自动展开目标章节');
  await page.close();
});
