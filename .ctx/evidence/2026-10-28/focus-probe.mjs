// 焦点读数探针（2026-10-28 · 焦点单环修复的真机证据）
// 用法：cd server; node ../.ctx/evidence/2026-10-28/focus-probe.mjs before|after
// 口径：只做「测量 + 截图」，不改任何产品代码；数据写同目录 focus-readings-<tag>.json。
// 依赖按 server/node_modules 解析（探针放在 .ctx 下，不另建包）。
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '../../../server/node_modules/playwright/index.mjs';
import { createApp } from '../../../server/app.js';
import { seedDatabase } from '../../../server/seed.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const tag = process.argv[2] === 'after' ? 'after' : 'before';

const app = createApp({ dbPath: ':memory:' });
await seedDatabase(app.locals.db);
const server = app.listen(0);
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true });

/** 计算样式三项读数（outline / box-shadow / border），外加「几环」判定 */
function readStyle(el) {
  const cs = getComputedStyle(el);
  const outlinePainted = cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0;
  const shadowPainted = cs.boxShadow && cs.boxShadow !== 'none';
  return {
    target: el.id ? `#${el.id}` : `${el.tagName.toLowerCase()}.${String(el.className).trim().split(/\s+/).join('.')}`,
    outline: `${cs.outlineStyle} ${cs.outlineWidth} ${cs.outlineColor} (offset ${cs.outlineOffset})`,
    boxShadow: cs.boxShadow,
    border: `${cs.borderTopWidth} ${cs.borderTopStyle} ${cs.borderTopColor}`,
    rings: [outlinePainted && 'outline', shadowPainted && 'box-shadow'].filter(Boolean),
    ringCount: Number(outlinePainted) + Number(shadowPainted),
  };
}

/** 用真实 Tab 键把焦点送进目标控件（保证 :focus-visible 命中） */
async function tabTo(page, selector, limit = 160) {
  await page.evaluate(() => { document.body.setAttribute('tabindex', '-1'); document.body.focus(); });
  for (let i = 0; i < limit; i += 1) {
    await page.keyboard.press('Tab');
    const hit = await page.evaluate((sel) => {
      const el = document.activeElement;
      if (!el) return false;
      return el.matches(sel) || (el.closest && !!el.closest(sel));
    }, selector);
    if (hit) return true;
  }
  return false;
}

async function measure(page, selector) {
  // 等过渡（120ms）走完再读，否则读到的是 0/透明 的中间值
  await page.waitForTimeout(300);
  return page.evaluate(([sel, fnSrc]) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    // eslint-disable-next-line no-eval
    return eval(`(${fnSrc})`)(el);
  }, [selector, readStyle.toString()]);
}

const out = { tag, at: new Date().toISOString(), areas: {} };

async function openPage() {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.route('**://fonts.googleapis.com/**', (r) => r.abort());
  await page.route('**://fonts.gstatic.com/**', (r) => r.abort());
  await page.route('**://cdn.tailwindcss.com/**', (r) => r.abort());
  return page;
}

async function login(page) {
  await page.goto(`${base}/login.html`, { waitUntil: 'domcontentloaded' });
  await page.fill('#student-id', '2400012355');
  await page.fill('#password', '123456');
  await Promise.all([
    page.waitForURL('**/workspace/org.html', { timeout: 15000 }),
    page.click('button[type="submit"]'),
  ]);
}

async function shot(page, locator, file) {
  try { await page.locator(locator).first().screenshot({ path: join(HERE, file) }); } catch { /* 截图失败不影响读数 */ }
}

// ① 页内检索（list-filter）＋ ② 下拉触发器（select 基准）
{
  const page = await openPage();
  try {
    await login(page);
    await page.goto(`${base}/workspace/org.html?tab=roster`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => !!document.querySelector('.lf-bar .lf-kw'), null, { timeout: 20000 });
    const searchSel = '.lf-bar .lf-kw';
    out.areas.listFilter = { reached: await tabTo(page, searchSel), reading: await measure(page, searchSel) };
    await shot(page, '.lf-bar', `focus-list-filter-${tag}.png`);

    const triggerSel = '.lf-bar .cs-trigger';
    out.areas.selectTrigger = { reached: await tabTo(page, triggerSel), reading: await measure(page, triggerSel) };
    await shot(page, '.lf-bar', `focus-select-${tag}.png`);
  } catch (e) {
    out.areas.listFilter = { error: String(e) };
  } finally { await page.close(); }
}

// ③ 下拉内嵌搜索（custom-select）：真组件 + 真 CSS，喂 12 项强制出搜索框
{
  const page = await openPage();
  try {
    await page.goto(`${base}/workspace/org.html`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.lf-bar', { timeout: 20000 }).catch(() => {});
    await page.evaluate(async () => {
      const host = document.createElement('div');
      host.id = 'probe-cs-host';
      host.style.cssText = 'padding:24px;background:var(--surface-page)';
      host.innerHTML = `<label id="probe-cs-label">探针下拉</label>
        <select id="probe-cs" class="input-flat text-xs">${Array.from({ length: 12 }, (_, i) => `<option value="v${i}">选项 ${i + 1}</option>`).join('')}</select>`;
      document.body.prepend(host);
      const mod = await import('/src/components/ui/custom-select.js');
      mod.enhanceSelects(host);
    });
    await page.click('#probe-cs-trigger');
    await page.waitForSelector('#probe-cs-trigger-menu .cs-search-input', { timeout: 5000 });
    const sel = '#probe-cs-trigger-menu .cs-search-input';
    out.areas.customSelectSearch = { reached: await tabTo(page, sel), reading: await measure(page, sel) };
    await shot(page, '#probe-cs-trigger-menu', `focus-custom-select-${tag}.png`);
  } catch (e) {
    out.areas.customSelectSearch = { error: String(e) };
  } finally { await page.close(); }
}

// ④ 归档搜索 / ⑤ 全站搜索 / ⑥ 帮助页搜索（第五处）
for (const [area, url, sel, shotSel] of [
  ['archiveSearch', '/archive.html', '#archive-search', '#archive-search'],
  ['siteSearch', '/search.html', '#ref-search-input', '#ref-search-input'],
  ['helpSearch', '/help.html', '.help-search-input', '.help-search-input'],
]) {
  const page = await openPage();
  try {
    await page.goto(`${base}${url}`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector(sel, { timeout: 15000 });
    out.areas[area] = { reached: await tabTo(page, sel), reading: await measure(page, sel) };
    await shot(page, shotSel, `focus-${area.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase())}-${tag}.png`);
  } catch (e) {
    out.areas[area] = { error: String(e) };
  } finally { await page.close(); }
}

writeFileSync(join(HERE, `focus-readings-${tag}.json`), JSON.stringify(out, null, 2));
console.log(JSON.stringify(out, null, 2));

await browser.close();
server.closeAllConnections?.();
await new Promise((r) => server.close(r));
