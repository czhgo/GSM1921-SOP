// 待办页签渲染失败：完整堆栈探针（2026-10-29）
// 用法：cd server; node ../.ctx/evidence/2026-10-29/tab-error-probe.mjs
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync, writeFileSync } from 'node:fs';
import { chromium } from '../../../server/node_modules/playwright/index.mjs';
import { createApp } from '../../../server/app.js';
import { seedDatabase } from '../../../server/seed.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const app = createApp({ dbPath: ':memory:' });
await seedDatabase(app.locals.db);
const server = app.listen(0);
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

// 关键：给 JSON.parse 与 RegExp 装探针，抓「SyntaxError 到底由谁抛出、调用栈在哪」
await page.addInitScript(() => {
  window.__parseErrors = [];
  const origJson = JSON.parse;
  JSON.parse = function (s, ...rest) {
    try { return origJson.call(this, s, ...rest); } catch (e) {
      window.__parseErrors.push({
        api: 'JSON.parse',
        input: String(s).slice(0, 400),
        name: e && e.name, message: e && e.message,
        caller: new Error('caller').stack,
      });
      throw e;
    }
  };
  const OrigRegExp = window.RegExp;
  window.RegExp = new Proxy(OrigRegExp, {
    construct(target, args, newTarget) {
      try { return Reflect.construct(target, args, newTarget); } catch (e) {
        window.__parseErrors.push({ api: 'RegExp', input: String(args[0]).slice(0, 400), name: e && e.name, message: e && e.message, caller: new Error('caller').stack });
        throw e;
      }
    },
  });
});

const errors = [];
page.on('pageerror', (e) => errors.push({ kind: 'pageerror', message: e.message, stack: e.stack }));
page.on('console', async (m) => {
  if (m.type() !== 'error') return;
  const entry = { kind: 'console.error', text: m.text(), loc: m.location() };
  try {
    const stacks = [];
    for (const a of m.args()) {
      // eslint-disable-next-line no-await-in-loop
      const s = await a.evaluate((o) => (o && (o.stack || o.message)) ? String(o.stack || o.message) : null).catch(() => null);
      if (s) stacks.push(s);
    }
    if (stacks.length) entry.stacks = stacks;
  } catch { /* ignore */ }
  errors.push(entry);
});

await page.goto(`${base}/login.html`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(700);
await page.fill('#student-id', '2300010001');
await page.fill('#password', '123456');
await page.click('button[type="submit"]');
await page.waitForURL('**/workspace/secretary.html', { timeout: 20000 });
await page.waitForTimeout(1200);

// 直接 import 待办页签模块，拿真实堆栈（判断是「模块解析失败」还是「renderContent 运行时抛错」）
const importProbe = await page.evaluate(async () => {
  try {
    const m = await import('/src/entries/tabs/secretary/todo-tab.js?v=20261028e');
    return { ok: true, exports: Object.keys(m).slice(0, 20) };
  } catch (e) {
    return { ok: false, name: e && e.name, message: e && e.message, stack: e && e.stack };
  }
});

// 若直接 import 失败：把 todo-tab.js 的直接依赖逐个 import，定位真正解析失败的模块
let depProbe = null;
if (!importProbe.ok) {
  const src = readFileSync(join(HERE, '../../../docs/src/entries/tabs/secretary/todo-tab.js'), 'utf8');
  const specs = [...src.matchAll(/from\s+'(\.{1,2}\/[^']+)'/g)].map((m) => m[1]);
  depProbe = await page.evaluate(async (list) => {
    const out = [];
    for (const spec of list) {
      // eslint-disable-next-line no-await-in-loop
      const res = await (async () => {
        try {
          await import(spec);
          return { spec, ok: true };
        } catch (e) {
          return { spec, ok: false, name: e && e.name, message: e && e.message };
        }
      })();
      out.push(res);
    }
    return out;
  }, specs.map((s) => new URL(s, `http://127.0.0.1:${server.address().port}/src/entries/tabs/secretary/todo-tab.js`).href));
}

// 点「待办」页签
const tab = page.getByRole('tab', { name: '待办' });
if (await tab.count()) {
  await tab.first().click();
} else {
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('[role="tab"], .tab-btn')].find((n) => (n.textContent || '').includes('待办'));
    if (b) b.click();
  });
}
await page.waitForTimeout(4000);

const state = await page.evaluate(() => {
  const el = document.querySelector('[role="tabpanel"]');
  const errCard = document.querySelector('[data-ws-tab-error]');
  return {
    currentTab: el ? el.dataset.currentTab || null : null,
    hasErrorCard: !!errCard,
    errorText: errCard ? (errCard.textContent || '').trim() : null,
    lsKeys: Object.keys(localStorage),
    parseErrors: window.__parseErrors || [],
  };
});

const out = { at: new Date().toISOString(), importProbe, depProbe, state, errors };
writeFileSync(join(HERE, 'tab-error-readings.json'), JSON.stringify(out, null, 2));
console.log(JSON.stringify(out, null, 2));

await browser.close();
server.closeAllConnections?.();
await new Promise((r) => server.close(r));
