// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  server/scripts/audit/harness.mjs —— 页签审计共用底座（单一源）
//
//  口径（2026-11-02 批次 527 · Wave 1）：
//   · `ACCOUNTS` 是七台演示账号的**唯一一份**（含 studentId / label）；
//   · `startAuditServer({ dbPath })` 自起 `:memory:` 实例（seedDatabase + 随机端口），不污染演示库；
//   · `apiLogin(base, role)` 给 D/C/E 维度取 token；`login(page, base, role)` 给 Playwright 登录；
//   · `openTab(page, base, role, tab)` 走深链并等内容非空；`shot(page, path)` 统一截图入口。
//  ⚠ 本文件不进 daily；账号变更须同批改 `server/test/page-sweep.test.mjs` 与
//     `docs/src/data/mock/accounts.js` 的演示口令来源。
// ════════════════════════════════════════════════════════════════

import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { createApp } from '../../app.js';
import { seedDatabase } from '../../seed.js';

/** 七个演示账号（页签审计 / 真机普查的单一源） */
export const ACCOUNTS = Object.freeze({
  secretary: Object.freeze({ studentId: '2300010001', label: '支书 / 副支书台' }),
  org: Object.freeze({ studentId: '2400012355', label: '组织委员台' }),
  prop: Object.freeze({ studentId: '2400012356', label: '宣传委员台' }),
  disc: Object.freeze({ studentId: '2400012354', label: '纪检委员台' }),
  leader: Object.freeze({ studentId: '2400012345', label: '党小组组长台' }),
  visitor: Object.freeze({ studentId: '2400012349', label: '成员台' }),
  'party-committee': Object.freeze({ studentId: '9000000001', label: '党委台' }),
});

/** 演示账号统一口令 */
export const LOGIN_PASSWORD = '123456';

/** role → studentId（兼容只取 id 的消费方；与 ACCOUNTS 同源） */
export const ACCOUNT_IDS = Object.freeze(Object.fromEntries(
  Object.entries(ACCOUNTS).map(([role, account]) => [role, account.studentId]),
));

/**
 * 起一个审计用本地服务。
 * @param {{dbPath?:string}} [opts] 默认 `:memory:`（自起自停，不碰演示库）
 * @returns {Promise<{base:string, app:any, db:any, server:any, close:()=>Promise<void>}>}
 */
export async function startAuditServer({ dbPath = ':memory:' } = {}) {
  const app = createApp({ dbPath });
  await seedDatabase(app.locals.db);
  const server = app.listen(0);
  await new Promise((resolve, reject) => {
    server.once('listening', resolve);
    server.once('error', reject);
  });
  const base = `http://127.0.0.1:${server.address().port}`;
  return {
    app,
    db: app.locals.db,
    server,
    base,
    close: () => new Promise((resolve) => {
      try { server.closeAllConnections?.(); } catch (_) { /* 老版本无此 API */ }
      server.close(() => resolve());
    }),
  };
}

/**
 * API 登录（D/C/E 维度取 token）。
 * @param {string} base
 * @param {string} role
 * @param {number} [timeout]
 * @returns {Promise<{token:string,user:object|null}>}
 */
export async function apiLogin(base, role, timeout = 8000) {
  const account = ACCOUNTS[role];
  if (!account) throw new Error(`未知工作台：${role}`);
  const res = await fetch(`${base.replace(/\/+$/, '')}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ personId: account.studentId, password: LOGIN_PASSWORD }),
    signal: AbortSignal.timeout(timeout),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok || !data?.token) {
    throw new Error(`API 登录失败（${role} / ${account.studentId}）：${res.status} ${data?.error || ''}`.trim());
  }
  return { token: data.token, user: data.user || null };
}

/**
 * Playwright 登录（失败重试 1 次）。
 * @param {import('playwright').Page} page
 * @param {string} base
 * @param {string} role
 * @param {number} [timeout]
 */
export async function login(page, base, role, timeout = 30000) {
  const account = ACCOUNTS[role];
  if (!account) throw new Error(`未知工作台：${role}`);
  let lastError;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      await page.goto(`${base}/login.html`, { waitUntil: 'domcontentloaded', timeout });
      await page.waitForSelector('#student-id', { timeout });
      await page.fill('#student-id', account.studentId);
      await page.fill('#password', LOGIN_PASSWORD);
      await Promise.all([
        page.waitForURL(`**/workspace/${role}.html**`, { timeout }),
        page.click('button[type="submit"]'),
      ]);
      await page.waitForFunction(() => document.querySelectorAll('[data-ws-tab-btn]').length > 0, null, { timeout });
      await page.waitForTimeout(800);
      return;
    } catch (e) {
      lastError = e;
    }
  }
  throw lastError;
}

/**
 * 打开页签（深链 + 内容非空 + 骨架退出；失败重试 1 次）。
 * @param {import('playwright').Page} page
 * @param {string} base
 * @param {string} role
 * @param {string} tab
 * @param {number} [timeout]
 * @returns {Promise<string>} 实际打开的 URL
 */
export async function openTab(page, base, role, tab, timeout = 30000) {
  const contentId = `${role}-tab-content`;
  const url = `${base}/workspace/${role}.html?tab=${encodeURIComponent(tab)}`;
  let lastError;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout });
      await page.waitForFunction(({ cid, tabId }) => {
        const el = document.getElementById(cid);
        const btn = document.querySelector(`[data-ws-tab-btn="${tabId}"]`);
        if (!el || !btn) return false;
        if (btn.getAttribute('aria-selected') !== 'true') return false;
        if (el.getAttribute('aria-busy') === 'true') return false;
        if (el.querySelector('[data-ws-tab-loading-bar]')) return false;
        if (el.innerHTML.trim().length <= 10) return false;
        return !!el.querySelector('h2, header');
      }, { cid: contentId, tabId: tab }, { timeout, polling: 200 });
      await page.waitForTimeout(800);
      return url;
    } catch (e) {
      lastError = e;
      if (attempt === 0) await page.waitForTimeout(400);
    }
  }
  throw lastError;
}

/**
 * 截图（目录不存在时自动创建）。
 * @param {import('playwright').Page} page
 * @param {string} path
 */
export async function shot(page, path) {
  mkdirSync(dirname(path), { recursive: true });
  await page.screenshot({ path });
}
