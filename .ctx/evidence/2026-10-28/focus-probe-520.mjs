// 焦点与交互读数探针（2026-10-28 · 批次 520：焦点单一体例与交互补齐的真机证据）
// 用法：cd server; node ../.ctx/evidence/2026-10-28/focus-probe-520.mjs
// 口径：只做「测量 + 截图」，不改产品代码；读数写同目录 focus-520.json。
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '../../../server/node_modules/playwright/index.mjs';
import { createApp } from '../../../server/app.js';
import { seedDatabase } from '../../../server/seed.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const app = createApp({ dbPath: ':memory:' });
await seedDatabase(app.locals.db);
const server = app.listen(0);
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true });

function readStyle(el) {
  const cs = getComputedStyle(el);
  const outlinePainted = cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0;
  const shadowPainted = cs.boxShadow && cs.boxShadow !== 'none';
  return {
    target: el.id ? `#${el.id}` : `${el.tagName.toLowerCase()}.${String(el.className).trim().split(/\s+/)[0]}`,
    outline: `${cs.outlineStyle} ${cs.outlineWidth} ${cs.outlineColor} (offset ${cs.outlineOffset})`,
    boxShadow: cs.boxShadow,
    borderColor: cs.borderTopColor,
    background: cs.backgroundColor,
    ringCount: Number(outlinePainted) + Number(shadowPainted),
  };
}

async function tabTo(page, selector, limit = 200) {
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
  await page.waitForTimeout(220);
  return page.evaluate(([sel, fnSrc]) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    // eslint-disable-next-line no-eval
    return eval(`(${fnSrc})`)(el);
  }, [selector, readStyle.toString()]);
}

const out = { at: new Date().toISOString(), areas: {} };

async function openPage(width = 1440, height = 900) {
  const page = await browser.newPage({ viewport: { width, height } });
  await page.route('**://fonts.googleapis.com/**', (r) => r.abort());
  await page.route('**://fonts.gstatic.com/**', (r) => r.abort());
  await page.route('**://cdn.tailwindcss.com/**', (r) => r.abort());
  return page;
}

async function login(page) {
  await page.goto(`${base}/login.html`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(900); // 等支部名异步写入
  out.loginTitle = await page.evaluate(() => (document.querySelector('h1') || {}).textContent?.trim() || '');
  await page.fill('#student-id', '2400012355');
  await page.fill('#password', '123456');
  await Promise.all([
    page.waitForURL('**/workspace/org.html', { timeout: 20000 }),
    page.click('button[type="submit"]'),
  ]);
}

// ① 六处搜索控件：每处必须只有一个环
for (const [area, url, sel] of [
  ['listFilter', '/workspace/org.html?tab=roster', '.lf-bar .lf-kw'],
  ['selectTrigger', '/workspace/org.html?tab=roster', '.lf-bar .cs-trigger'],
  ['archiveSearch', '/archive.html', '#archive-search'],
  ['siteSearch', '/search.html', '#ref-search-input'],
  ['helpSearch', '/help.html', '.help-search-input'],
]) {
  const page = await openPage();
  try {
    if (url.includes('/workspace/')) await login(page);
    await page.goto(`${base}${url}`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector(sel, { timeout: 25000 });
    out.areas[area] = { reached: await tabTo(page, sel), reading: await measure(page, sel) };
  } catch (e) {
    out.areas[area] = { error: String(e) };
  } finally { await page.close(); }
}

// ② 顶栏图标按钮 / 主按钮 / 可点白卡（悬停 + 按下）
{
  const page = await openPage();
  try {
    await login(page);
    await page.goto(`${base}/workspace/secretary.html`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);
    await page.waitForSelector('#notif-btn, .header-icon-btn, .header-action-btn', { timeout: 25000 }).catch(() => {});
    const headerSel = '#notif-btn, .header-icon-btn';
    out.areas.headerButton = { reached: await tabTo(page, headerSel), reading: await measure(page, headerSel) };
    await page.screenshot({ path: join(HERE, 'focus-520-header-1440.png') });

    // 可点白卡：悬停前 / 悬停 / 按下（公共首页的四个数卡带 .card--interactive）
    const cardSel = '.card--interactive';
    await page.goto(`${base}/index.html`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector(cardSel, { timeout: 25000 }).catch(() => {});
    if (await page.locator(cardSel).count()) {
      const before = await measure(page, cardSel);
      await page.locator(cardSel).first().hover();
      await page.waitForTimeout(260);
      const hover = await measure(page, cardSel);
      await page.locator(cardSel).first().screenshot({ path: join(HERE, 'card-hover-520-1440.png') });
      out.areas.interactiveCard = { before, hover };
    } else {
      out.areas.interactiveCard = { skipped: '本页无 .card--interactive' };
    }
  } catch (e) {
    out.areas.headerButton = { error: String(e) };
  } finally { await page.close(); }
}

// ③ 主按钮（主题色实底）焦点环压在内侧
{
  const page = await openPage();
  try {
    await login(page);
    await page.goto(`${base}/workspace/org.html?tab=taskforce`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1200);
    const btnSel = '.btn-accent';
    if (await page.locator(btnSel).count()) {
      out.areas.accentButton = { reached: await tabTo(page, btnSel), reading: await measure(page, btnSel) };
      await page.locator(btnSel).first().screenshot({ path: join(HERE, 'focus-520-accent-btn-1440.png') });
    } else {
      out.areas.accentButton = { skipped: '本页无 .btn-accent' };
    }
  } catch (e) {
    out.areas.accentButton = { error: String(e) };
  } finally { await page.close(); }
}

// ④ 暗色主题：焦点环颜色随主题切换、且仍只有一个环
{
  const page = await openPage();
  try {
    await page.addInitScript(() => {
      try { localStorage.setItem('workflowos_theme', 'dark'); } catch { /* ignore */ }
    });
    await page.goto(`${base}/search.html`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#ref-search-input', { timeout: 20000 });
    out.areas.darkSiteSearch = { reached: await tabTo(page, '#ref-search-input'), reading: await measure(page, '#ref-search-input') };
    await page.screenshot({ path: join(HERE, 'focus-520-dark-1440.png') });
  } catch (e) {
    out.areas.darkSiteSearch = { error: String(e) };
  } finally { await page.close(); }
}

// ⑤ 390 窄屏：横向溢出抽查（首页 / 帮助页 / 工作台）
{
  const page = await openPage(390, 844);
  try {
    out.areas.mobileOverflow = {};
    for (const [name, url] of [
      ['home', '/index.html'],
      ['help', '/help.html'],
      ['login', '/login.html'],
    ]) {
      await page.goto(`${base}${url}`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(800);
      out.areas.mobileOverflow[name] = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
    }
    await login(page);
    await page.waitForTimeout(1200);
    out.areas.mobileOverflow.workspace = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    await page.screenshot({ path: join(HERE, 'focus-520-mobile-390.png') });
  } catch (e) {
    out.areas.mobileOverflow = { error: String(e) };
  } finally { await page.close(); }
}

writeFileSync(join(HERE, 'focus-520.json'), JSON.stringify(out, null, 2));
console.log(JSON.stringify(out, null, 2));

await browser.close();
server.closeAllConnections?.();
await new Promise((r) => server.close(r));
