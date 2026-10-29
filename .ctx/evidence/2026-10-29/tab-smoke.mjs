// 工作台页签真机遍历（2026-10-29）
// 用法：cd server; node ../.ctx/evidence/2026-10-29/tab-smoke.mjs
//
// 目的：
//   ① 支书 / 党委组织员 / 普通成员 三类身份登录，逐个点击其工作台的全部页签，
//      断言全程不出现 [data-ws-tab-error]，控制台无 error；
//   ② 故障注入（仅支书台「待办」一次）：拦断 todo-tab.js 的请求，验证「模块加载失败」
//      走的是「刷新页面」卡（不可重试），而不是永远无效的「重试」。
// 读数：.ctx/evidence/2026-10-29/tab-smoke.json
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeFileSync } from 'node:fs';
import { chromium } from '../../../server/node_modules/playwright/index.mjs';
import { createApp } from '../../../server/app.js';
import { seedDatabase } from '../../../server/seed.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, 'tab-smoke.json');

const RUNS = [
  { role: '支书', page: 'secretary', studentId: '2300010001' },
  { role: '党委组织员', page: 'party-committee', studentId: '9000000001' },
  { role: '普通成员', page: 'visitor', studentId: '2400012349' },
];

const app = createApp({ dbPath: ':memory:' });
await seedDatabase(app.locals.db);
const server = app.listen(0);
const base = `http://127.0.0.1:${server.address().port}`;

/** 静音外部资源（返回空内容，避免网络抖动与资源加载型 console error 干扰「业务 error」判读） */
async function muteExternals(page) {
  await page.route('**://cdn.tailwindcss.com/**', (r) => r.fulfill({ status: 200, contentType: 'application/javascript', body: '/* muted in smoke */' }));
  await page.route('**://fonts.googleapis.com/**', (r) => r.fulfill({ status: 200, contentType: 'text/css', body: '/* muted in smoke */' }));
  await page.route('**://fonts.gstatic.com/**', (r) => r.fulfill({ status: 200, contentType: 'font/woff2', body: '' }));
}

async function login(page, studentId) {
  await page.goto(`${base}/login.html`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#student-id', { timeout: 30000 });
  await page.fill('#student-id', studentId);
  await page.fill('#password', '123456');
  await Promise.all([
    page.waitForURL('**/workspace/*.html', { timeout: 30000 }),
    page.click('button[type="submit"]'),
  ]);
  await page.waitForFunction(() => document.querySelectorAll('[aria-label="工作台页签"] button[role="tab"]').length > 0, null, { timeout: 45000 });
}

/** 点一个页签并等它结束加载（loading 标记消失）；返回该页签的错误卡读数 */
async function clickTab(page, label, contentId) {
  await page.evaluate((l) => {
    const btn = [...document.querySelectorAll('[aria-label="工作台页签"] button[role="tab"]')]
      .find((x) => x.textContent.trim() === l);
    btn?.click();
  }, label);
  try {
    await page.waitForFunction((pid) => {
      const el = document.getElementById(pid);
      return el && el.dataset.wsTabLoading !== '1';
    }, contentId, { timeout: 15000 });
  } catch { /* 超时仍读一次现场，读数里会体现 */ }
  await page.waitForTimeout(1100);
  return page.evaluate((pid) => {
    const root = document.getElementById(pid);
    const card = root ? root.querySelector('[data-ws-tab-error]') : null;
    return {
      hasRoot: !!root,
      renderedLen: root ? root.innerHTML.trim().length : -1,
      errorCard: !!card,
      errorText: card ? (card.textContent || '').replace(/\s+/g, ' ').trim() : null,
      retryButton: !!(card && card.querySelector('[data-ws-tab-retry]')),
      reloadButton: !!(card && card.querySelector('[data-ws-tab-reload]')),
    };
  }, contentId);
}

const browser = await chromium.launch({ headless: true });
const result = { at: new Date().toISOString(), base, runs: [], faultInjection: null, summary: {} };
let hardFailures = 0;

try {
  for (const run of RUNS) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    const consoleErrors = [];
    const pageErrors = [];
    page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
    page.on('pageerror', (e) => pageErrors.push(e.message));
    await muteExternals(page);

    try {
      await login(page, run.studentId);
      const contentId = `${run.page}-tab-content`;

      // ── 故障注入（仅支书台「待办」）：拦断模块请求 → 必须给「刷新页面」卡 ──
      if (run.page === 'secretary') {
        const pattern = '**/src/entries/tabs/secretary/todo-tab.js*';
        await page.route(pattern, (r) => r.abort('failed'));
        const injected = await clickTab(page, '待办', contentId);
        result.faultInjection = {
          tab: '待办',
          module: 'todo-tab.js',
          errorCard: injected.errorCard,
          retryButton: injected.retryButton,
          reloadButton: injected.reloadButton,
          message: injected.errorText,
        };
        await page.unroute(pattern);
        // 注入期的 console.error 是「预期内」的失败日志，清空后再做正常遍历
        consoleErrors.length = 0;
        pageErrors.length = 0;
        await page.reload({ waitUntil: 'domcontentloaded' });
        await page.waitForFunction(() => document.querySelectorAll('[aria-label="工作台页签"] button[role="tab"]').length > 0, null, { timeout: 45000 });
      }

      // ── 正常遍历：该台全部页签 ──
      const labels = await page.$$eval('[aria-label="工作台页签"] button[role="tab"]', (els) => els.map((e) => e.textContent.trim()));
      const tabs = [];
      for (const label of labels) {
        const reading = await clickTab(page, label, contentId);
        tabs.push({ label, ...reading });
        if (reading.errorCard) {
          hardFailures += 1;
          console.log(`[tab-smoke] ✖ ${run.role} · ${label}：出现错误卡「${reading.errorText}」`);
        }
      }

      if (consoleErrors.length || pageErrors.length) hardFailures += 1;
      result.runs.push({ role: run.role, personId: run.studentId, page: `/workspace/${run.page}.html`, tabs, consoleErrors, pageErrors });
      console.log(`[tab-smoke] ${run.role}：${tabs.length} 个页签，错误卡 ${tabs.filter((t) => t.errorCard).length}，console.error ${consoleErrors.length}，pageerror ${pageErrors.length}`);
    } finally {
      await page.close();
    }
  }

  // 故障注入同样必须成立（否则「不可重试」分支没被验证）
  const fi = result.faultInjection;
  if (!fi || !fi.errorCard || !fi.reloadButton || fi.retryButton) hardFailures += 1;
  console.log(`[tab-smoke] 故障注入：${fi ? `错误卡=${fi.errorCard} 刷新=${fi.reloadButton} 重试=${fi.retryButton} 文案=${fi.message}` : '(未执行)'}`);
} finally {
  await browser.close();
  server.closeAllConnections?.();
  await new Promise((r) => server.close(r));
}

const totalTabs = result.runs.reduce((n, r) => n + r.tabs.length, 0);
const errorCards = result.runs.reduce((n, r) => n + r.tabs.filter((t) => t.errorCard).length, 0);
const consoleErrorCount = result.runs.reduce((n, r) => n + r.consoleErrors.length, 0);
const pageErrorCount = result.runs.reduce((n, r) => n + r.pageErrors.length, 0);
result.summary = { runs: result.runs.length, tabs: totalTabs, errorCards, consoleErrors: consoleErrorCount, pageErrors: pageErrorCount, hardFailures };
writeFileSync(OUT, JSON.stringify(result, null, 2), 'utf8');
console.log(`[tab-smoke] 合计：角色 ${result.runs.length} · 页签 ${totalTabs} · 错误卡 ${errorCards} · console.error ${consoleErrorCount} · pageerror ${pageErrorCount} → ${OUT}`);
if (hardFailures > 0) {
  console.error(`[tab-smoke] 失败项 ${hardFailures} 个`);
  process.exitCode = 1;
}
