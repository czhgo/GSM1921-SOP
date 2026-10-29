// 待办页签模块「SyntaxError: Unexpected token '{'」定位：在真实 Chrome 里二分前缀，找最小出错行
// 用法：cd server; node ../.ctx/evidence/2026-10-29/todo-parse-bisect.mjs
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '../../../server/node_modules/playwright/index.mjs';
import { createApp } from '../../../server/app.js';
import { seedDatabase } from '../../../server/seed.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const TARGET = '/src/entries/tabs/secretary/todo-tab.js?v=20261028e';

const app = createApp({ dbPath: ':memory:' });
await seedDatabase(app.locals.db);
const server = app.listen(0);
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.goto(`${base}/login.html`, { waitUntil: 'domcontentloaded' });

const result = await page.evaluate(async (target) => {
  const url = new URL(target, location.href).href;
  const raw = await (await fetch(url)).text();
  // 把相对说明符换成绝对 URL，让 blob 模块能解析依赖
  const text = raw.replace(/(\bfrom\s*['"])(\.{1,2}\/[^'"]+)(['"])/g,
    (_m, p1, spec, p3) => p1 + new URL(spec, url).href + p3);

  async function probe(src) {
    const blob = new Blob([src], { type: 'text/javascript' });
    const u = URL.createObjectURL(blob);
    try {
      await import(u);
      return { ok: true };
    } catch (e) {
      return { ok: false, name: e && e.name, message: e && e.message };
    } finally {
      URL.revokeObjectURL(u);
    }
  }

  const lines = text.split('\n');
  // 「前缀不完整」判定：Unexpected end of input / Unterminated / Invalid or unexpected token 末行
  const incomplete = (m) => /Unexpected end of input|Unterminated|Invalid or unexpected token/i.test(String(m || ''));

  // 先确认整文件复现
  const whole = await probe(text);

  // 二分：找最小 L，使 prefix(L) 报「非不完整」错误
  let lo = 1;
  let hi = lines.length;
  let found = null;
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    // eslint-disable-next-line no-await-in-loop
    const r = await probe(lines.slice(0, mid).join('\n'));
    if (!r.ok && !incomplete(r.message)) {
      hi = mid;
      found = { line: mid, ...r };
    } else {
      lo = mid + 1;
    }
  }

  const ctxStart = Math.max(0, (found ? found.line : 1) - 12);
  const ctxEnd = Math.min(lines.length, (found ? found.line : 1) + 6);
  return {
    whole,
    found,
    totalLines: lines.length,
    slice: lines.slice(ctxStart, ctxEnd).map((l, i) => `${ctxStart + i + 1}: ${l}`),
  };
}, TARGET);

writeFileSync(join(HERE, 'todo-parse-bisect.json'), JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));

await browser.close();
server.closeAllConnections?.();
await new Promise((r) => server.close(r));
