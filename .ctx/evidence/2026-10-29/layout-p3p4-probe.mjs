// 用法：cd server; node ../.ctx/evidence/2026-10-29/layout-p3p4-probe.mjs
// 口径：只做真机读数（内存库实例），不改产品代码；结果写同目录 layout-p3p4.json。
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '../../../server/node_modules/playwright/index.mjs';
import { createApp } from '../../../server/app.js';
import { seedDatabase } from '../../../server/seed.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const WIDTHS = [1440, 1024, 768, 390];

// Chromium 在沙箱里走不通外网（PowerShell/Node 可以）⇒ 先把 Tailwind JIT 脚本取回本地，
// 由 route 直接回填，保证 max-w-* 等工具类真实生效（不是另写一套宽度）。
const tailwindSrc = await (await fetch('https://cdn.tailwindcss.com')).text();

const app = createApp({ dbPath: ':memory:' });
await seedDatabase(app.locals.db);
const server = app.listen(0);
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true });

/** 页面清单：四个工作台页（72rem 档）＋ 归档库（64rem 档） */
const PAGES = [
  { key: 'org-roster', path: '/workspace/org.html?tab=roster', tier: '72rem', account: '2400012355' },
  { key: 'org-taskforce', path: '/workspace/org.html?tab=taskforce', tier: '72rem', account: '2400012355' },
  { key: 'secretary-feedback', path: '/workspace/secretary.html?tab=feedback', tier: '72rem', account: '2300010001' },
  { key: 'disc-attendance', path: '/workspace/disc.html?tab=attendance', tier: '72rem', account: '2400012354' },
  { key: 'archive', path: '/archive.html', tier: '64rem', account: '2400012355' },
];

async function session(account) {
  const context = await browser.newContext();
  const page = await context.newPage();
  // 字体可省（不影响布局宽度）；Tailwind JIT 用预取脚本回填——P4 容器档由 max-w-* 工具类承载。
  await page.route('**://fonts.googleapis.com/**', (r) => r.abort());
  await page.route('**://fonts.gstatic.com/**', (r) => r.abort());
  await page.route('**://cdn.tailwindcss.com/**', (r) => r.fulfill({
    status: 200, contentType: 'application/javascript', body: tailwindSrc,
  }));
  await page.goto(`${base}/login.html`, { waitUntil: 'domcontentloaded' });
  await page.fill('#student-id', account);
  await page.fill('#password', '123456');
  await Promise.all([
    page.waitForURL(/workspace\//, { timeout: 20000 }),
    page.click('button[type="submit"]'),
  ]);
  return { context, page };
}

/** 读一条 bar：段位、每段首控件左边缘、行高（判断行内是否折行）、溢出 */
async function readBar(handle) {
  return handle.evaluate((bar) => {
    const rows = [...bar.querySelectorAll(':scope > .lf-bar__row')];
    const viewport = window.innerWidth;
    const first = (row) => row.firstElementChild;
    return {
      segs: rows.map((r) => r.dataset.seg || ''),
      rowCount: rows.length,
      rows: rows.map((r) => {
        const rb = r.getBoundingClientRect();
        const f = first(r);
        const fb = f ? f.getBoundingClientRect() : null;
        return {
          seg: r.dataset.seg || '',
          left: Math.round(rb.left * 10) / 10,
          right: Math.round(rb.right * 10) / 10,
          firstLeft: fb ? Math.round(fb.left * 10) / 10 : null,
          firstRight: fb ? Math.round(fb.right * 10) / 10 : null,
          height: Math.round(rb.height),
          firstWidth: fb ? Math.round(fb.width) : null,
          rowWrapped: rb.height > 56,
          overflowRight: fb ? fb.right > viewport + 1 : false,
        };
      }),
      // 同段左边缘对齐：各行首控件 left 的最大差值（0–1px 视为对齐）
      alignDelta: (() => {
        const xs = rows.map((r) => first(r)).filter(Boolean).map((el) => el.getBoundingClientRect().left);
        if (xs.length < 2) return 0;
        return Math.round((Math.max(...xs) - Math.min(...xs)) * 10) / 10;
      })(),
      barOverflowX: bar.scrollWidth > bar.clientWidth + 1,
      barClientWidth: bar.clientWidth,
      barScrollWidth: bar.scrollWidth,
    };
  });
}

async function measure(page, item) {
  await page.goto(`${base}${item.path}`, { waitUntil: 'domcontentloaded' });
  // 考勤页默认「确认与录入」；矩阵 / 总表两条筛选面只在「数据查看」视图渲染。
  if (await page.waitForSelector('[data-att-view="data"]', { timeout: 8000 }).catch(() => null)) {
    const active = await page.locator('[data-att-view="data"]').first().getAttribute('aria-pressed');
    if (active !== 'true') await page.locator('[data-att-view="data"]').first().click().catch(() => {});
  }
  await page.waitForSelector('.lf-bar', { timeout: 8000 }).catch(() => {});
  // 引擎条要等数据渲染出 rows
  await page.waitForTimeout(1200);
  const bars = await page.$$('.lf-bar:not([hidden])');
  const readings = [];
  for (const bar of bars) {
    const hasRow = await bar.evaluate((el) => !!el.querySelector(':scope > .lf-bar__row'));
    if (!hasRow) continue;
    readings.push(await readBar(bar));
  }
  const container = await page.evaluate(() => {
    const el = document.querySelector('#main-content > div') || document.querySelector('main > div') || document.querySelector('#main-content');
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return {
      selector: el.id ? `#${el.id}` : `${el.tagName.toLowerCase()}.${String(el.className).trim().split(/\s+/).slice(0, 2).join('.')}`,
      left: Math.round(r.left * 10) / 10,
      right: Math.round(r.right * 10) / 10,
      width: Math.round(r.width * 10) / 10,
      maxWidth: getComputedStyle(el).maxWidth,
    };
  });
  const overflow = await page.evaluate(() => ({
    docScrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
    horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth + 1,
  }));
  return { readings, container, overflow };
}

const out = { generatedAt: new Date().toISOString(), base: 'memory-db', widths: WIDTHS, pages: [] };

for (const item of PAGES) {
  const { context, page } = await session(item.account);
  const entry = { key: item.key, path: item.path, tier: item.tier, byWidth: {} };
  for (const width of WIDTHS) {
    await page.setViewportSize({ width, height: 900 });
    console.log(`[probe] ${item.key} @${width}`);
    entry.byWidth[width] = await measure(page, item);
  }
  out.pages.push(entry);
  await context.close();
}

await browser.close();
server.close();
writeFileSync(join(HERE, 'layout-p3p4.json'), JSON.stringify(out, null, 2), 'utf8');
console.log(`wrote ${join(HERE, 'layout-p3p4.json')}`);
for (const p of out.pages) {
  for (const w of WIDTHS) {
    const m = p.byWidth[w];
    console.log(`${p.key} @${w}: bars=${m.readings.length} rows=${m.readings.map((r) => r.rowCount).join('/')} align=${m.readings.map((r) => r.alignDelta).join('/')} overflow=${m.overflow.horizontalOverflow} container=${m.container ? m.container.left + '..' + m.container.right : 'n/a'}`);
  }
}
