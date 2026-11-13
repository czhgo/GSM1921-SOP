// role: [工程师]+[AI]
// page-error-smoke.test.mjs — 独立页 pageerror 冒烟（D-871 / harness 补漏）
//
// 病灶：`messages-entry.js` 使用 `emptyStateHtml` 漏 import，页面抛 `pageerror`、写私信按钮不渲染；
//   既有 page-sweep 只覆盖七个工作台，独立页不在冒烟范围。
// 判据：登录后逐个打开 /messages.html、/feedback.html、/activity.html：body 文本 > 20 且 pageerror = 0。
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { createApp } from '../app.js';
import { seedDatabase } from '../seed.js';

const PAGES = ['/messages.html', '/feedback.html', '/activity.html'];
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

test('独立页冒烟：messages / feedback / activity 无 pageerror', async () => {
  const page = await browser.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message));
  await page.route('**://fonts.googleapis.com/**', (r) => r.abort());
  await page.route('**://fonts.gstatic.com/**', (r) => r.abort());
  await page.route('**://cdn.tailwindcss.com/**', (r) => r.abort());
  try {
    await page.goto(`${base}/login.html`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#student-id', { timeout: 30000 });
    await page.fill('#student-id', '2300010001');
    await page.fill('#password', '123456');
    await Promise.all([
      page.waitForURL('**/workspace/secretary', { timeout: 30000 }),
      page.click('button[type="submit"]'),
    ]);
    for (const path of PAGES) {
      errs.length = 0;
      await page.goto(`${base}${path}`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1500);
      const info = await page.evaluate(() => ({
        textLen: (document.body.innerText || '').trim().length,
        path: location.pathname,
      }));
      assert.ok(info.textLen > 20, `${path} 渲染产物过短（body 文本 ${info.textLen} 字；是否整页未渲染？）`);
      assert.deepEqual(errs, [], `${path} 出现 pageerror：\n${errs.join('\n')}`);
    }
  } finally {
    await page.close();
  }
});