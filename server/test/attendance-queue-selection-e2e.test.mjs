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

test('党小组会考勤并入总表筛选视图并保持只读', async () => {
  const page = await browser.newPage();
  await page.route('**://fonts.googleapis.com/**', (route) => route.abort());
  await page.route('**://fonts.gstatic.com/**', (route) => route.abort());
  await page.route('**://cdn.tailwindcss.com/**', (route) => route.abort());
  try {
    await page.goto(`${base}/login.html`, { waitUntil: 'domcontentloaded' });
    await page.fill('#student-id', '2400012354');
    await page.fill('#password', '123456');
    await Promise.all([
      page.waitForURL('**/workspace/disc.html', { timeout: 15000 }),
      page.click('button[type="submit"]'),
    ]);
    await page.locator('.disc-tab-btn[data-disc-tab="attendance"]').click();
    await page.locator('#att-table-container table tbody tr').first().waitFor({ state: 'visible', timeout: 15000 });

    assert.equal(await page.getByRole('heading', { name: '党小组会考勤（纪检只读掌握）' }).count(), 0,
      '独立的党小组会只读表应合并进考勤总表');
    const typeFilter = page.locator('#att-table-type');
    assert.equal(await typeFilter.count(), 1, '总表应提供活动类别筛选');
    const totalBefore = await page.locator('#att-table-pager').innerText();
    await typeFilter.selectOption('党小组会');

    const pagerText = await page.locator('#att-table-pager').innerText();
    assert.match(pagerText, /\d/, '筛选结果应继续使用总表分页');
    assert.notEqual(pagerText, totalBefore, '党小组会筛选应排除其他活动的考勤');
    const headers = page.locator('#att-table-container thead th');
    assert.equal(await headers.count(), 10, '合并视图应保留旧只读表独有的考勤备注列');
    assert.equal((await headers.nth(7).innerText()).trim(), '备注（标因/补录）');
    const rows = page.locator('#att-table-container tbody tr');
    assert.ok(await rows.count() > 0, '种子应有党小组会考勤记录');
    for (const row of await rows.all()) {
      assert.equal((await row.locator('td').nth(5).innerText()).trim(), '党小组会',
        '筛选结果只能包含党小组会活动');
      assert.equal(await row.locator('.att-return-btn, .att-jump-queue').count(), 0,
        '党小组会筛选视图保持只读，不显示打回或操作入口');
      assert.match(await row.locator('td').last().innerText(), /只读/);
      assert.match(await row.locator('td').nth(4).innerText(), /（\d{4}-\d{2}-\d{2}）/,
        '活动日期应继续随党小组会名称展示');
      assert.match(await row.locator('td').nth(4).getAttribute('title') || '', /组长.*上传/,
        '活动上下文应保留组长与上传人信息');
    }
    await typeFilter.selectOption('');
    assert.equal(await page.locator('#att-table-pager').innerText(), totalBefore,
      '清除活动类型筛选后应恢复完整考勤总表');
  } finally {
    await page.close();
  }
});
