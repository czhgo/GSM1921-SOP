// role: [工程师]+[AI]
// 纪检考勤待确认队列的显式选择与折叠状态真机回归（2026-10-15）。
// 只操作内存数据库中的复选框；不点击「一次确认」，不写入任何业务记录。
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

test('纪检批量确认默认不选，展开只保留显式选择，清空覆盖隐藏项', async () => {
  const page = await browser.newPage();
  await page.route('**://fonts.googleapis.com/**', (route) => route.abort());
  await page.route('**://fonts.gstatic.com/**', (route) => route.abort());
  await page.route('**://cdn.tailwindcss.com/**', (route) => route.abort());
  try {
    await page.goto(`${base}/login.html`, { waitUntil: 'domcontentloaded' });
    await page.fill('#student-id', '2400012354'); // 纪检委员 p10
    await page.fill('#password', '123456');
    await Promise.all([
      page.waitForURL('**/workspace/disc.html', { timeout: 15000 }),
      page.click('button[type="submit"]'),
    ]);

    const attendanceTab = page.locator('.disc-tab-btn[data-disc-tab="attendance"]');
    await attendanceTab.waitFor({ state: 'visible', timeout: 15000 });
    await attendanceTab.click();
    await page.locator('#att-queue .att-queue-check').first().waitFor({ state: 'visible', timeout: 15000 });

    const boxes = page.locator('#att-queue .att-queue-check');
    assert.equal(await page.locator('#att-queue-more').isVisible(), true,
      '种子待确认队列应超过默认首屏 8 条并提供展开入口');
    assert.equal(await page.locator('#att-queue .att-queue-check:checked').count(), 0,
      '刚进入队列不应预选任何待确认记录');
    assert.equal(await page.locator('#att-queue .att-batch-count').innerText(), '0');
    assert.equal(await page.locator('#att-queue .att-batch-confirm').isDisabled(), true,
      '没有主动选择时批量确认必须禁用');

    await boxes.first().check();
    assert.equal(await page.locator('#att-queue .att-queue-check:checked').count(), 1);
    assert.equal(await page.locator('#att-queue .att-batch-confirm').isEnabled(), true);

    await page.locator('#att-queue-more').click();
    await page.waitForFunction(() => document.querySelectorAll('#att-queue .att-queue-check').length > 8);
    assert.equal(await page.locator('#att-queue .att-queue-check:checked').count(), 1,
      '展开后新增可见项仍不应被自动选择');
    await page.locator('#att-queue-select-all').click();
    assert.equal(await page.locator('#att-queue .att-queue-check:checked').count(), await boxes.count(),
      '展开状态的全选应选择全部当前可见项');

    await page.locator('#att-queue-more').click(); // 收起：7 条已选记录此时不可见
    await page.locator('#att-queue-clear').click();
    assert.equal(await page.locator('#att-queue .att-queue-check:checked').count(), 0,
      '清空应取消当前可见项');
    await page.locator('#att-queue-more').click();
    assert.equal(await page.locator('#att-queue .att-queue-check:checked').count(), 0,
      '重新展开后，清空也必须移除原先隐藏项的已选状态');
    assert.equal(await page.locator('#att-queue .att-batch-confirm').isDisabled(), true);
  } finally {
    await page.close();
  }
});
