// ════════════════════════════════════════════════════════════════
//  server/test/iaaa-ui-onboarding.test.mjs —— **IAAA 前端入口 ＋「选支部」阻断层**真机守卫
//  （2026-09-29 批次 277）
//
//  服务的契约单一源＝`server/routes/iaaa.js`（其守卫＝`iaaa-onboarding.test.mjs` T1–T8，走 API）；
//  本件补的是**浏览器流**（批次 271 / 275 只做了服务端，浏览器那半从未被真机跑过）：
//
//  U1 登录页有「统一身份认证登录」入口（`#iaaa-login`）
//  U2 走 `IAAA_MOCK=1` 全链（按钮 → /login 302 → /callback 302 回 `#iaaa=` → 落地会话）
//     ⇒ 未归属支部者**就地**看到「选择支部」面板（**不新开页面**）且本地会话 `branchId === null`
//  U3 提交支部意向 ⇒ 呈现「等待支部确认」
//  U4 **阻断层**：待归属者进不了工作台（工作台 ⇒ 弹回 `login.html?need-branch=1`）
//  U5 支部确认（党委跨支部批）后 ⇒ 点「刷新确认状态」即进工作台（放行条件＝支部确认）
//
//  ⚠ 真机测试不得依赖外网 CDN（`route.abort`）——见 `D-642`。
// ════════════════════════════════════════════════════════════════
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

process.env.IAAA_MOCK = '1';                        // ⚠ 必须在 import app.js 之前（模块级读 env）
const { createApp } = await import('../app.js');
const { seedDatabase } = await import('../seed.js');
const { chromium } = await import('playwright');

let server, base, browser, db;

before(async () => {
  const app = createApp({ dbPath: ':memory:' });
  db = app.locals.db;
  await seedDatabase(db);                            // 演示种子：含 br-b1 ＋ 党委账号 p_pc(9000000001)
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

const api = async (method, path, { token, body } = {}) => {
  const r = await fetch(base + path, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: r.status, json: await r.json().catch(() => null) };
};

/** 新开一页（拦 CDN；真机纪律 D-642） */
async function newPage() {
  const ctx = await browser.newContext();
  await ctx.route('**://cdn.tailwindcss.com/**', (route) => route.abort());
  return { ctx, page: await ctx.newPage() };
}

test('U1–U3 登录页入口 ⇒ MOCK 全链落地 ⇒ 未归属者就地选支部 ⇒ 呈现「等待支部确认」', async () => {
  const { ctx, page } = await newPage();
  try {
    await page.goto(`${base}/login.html`, { waitUntil: 'domcontentloaded' });
    assert.ok(await page.locator('#iaaa-login').isVisible(), 'U1 登录页应有「统一身份认证登录」入口');

    await page.locator('#iaaa-login').click();
    // MOCK 全链：/login → 302 → /callback?token=… → 302 → /login.html#iaaa=<会话> → 前端落地
    await page.locator('#login-branch.visible').waitFor({ timeout: 20000 });
    assert.ok(await page.locator('#branch-list button[data-branch]').first().isVisible(),
      'U2 未归属者应就地看到「选择支部」清单（不新开页面）');

    const snap = await page.evaluate(() => JSON.parse(localStorage.getItem('gsm1921-login-user') || 'null'));
    assert.ok(snap && snap.personId, 'U2 IAAA 落地应写入本地会话');
    assert.equal(snap.branchId, null, 'U2 新建号尚未归属支部 ⇒ 本地会话 branchId 为 null');
    assert.equal(await page.evaluate(() => sessionStorage.getItem('gsm1921-api-token') !== null), true,
      'U2 会话 token 应落地（API 形态）');

    await page.locator('#branch-list button[data-branch]').first().click();
    await page.locator('#branch-note').filter({ hasText: '等待支部确认' }).waitFor({ timeout: 10000 });
    const me = await api('GET', '/api/v1/auth/me', { token: await page.evaluate(() => sessionStorage.getItem('gsm1921-api-token')) });
    assert.equal(me.json.branchId, null, 'U3 提交意向 ≠ 已归属（仍 branchId null）');
    assert.ok(me.json.joinIntent && me.json.joinIntent.branchId, 'U3 意向应落在 joinIntent');
  } finally { await ctx.close(); }
});

test('U4–U5 待归属者被阻断层挡住；支部确认后「刷新确认状态」即放行', async () => {
  const { ctx, page } = await newPage();
  try {
    // 造一名待归属者：走 IAAA MOCK 建号（HTTP 直连，便于取 token / personId）
    const sid = `U${randomUUID().slice(0, 8)}`;
    const born = (await api('GET', `/api/v1/auth/iaaa/callback?mode=json&token=${encodeURIComponent(sid)}`)).json;
    assert.equal(born.needBranch, true, '新号应需选支部');

    // 把会话直接灌进浏览器（模拟「IAAA 已登录」的既存会话）
    await page.goto(`${base}/login.html`, { waitUntil: 'domcontentloaded' });
    await page.evaluate(([t, u]) => {
      sessionStorage.setItem('gsm1921-api-token', t);
      localStorage.setItem('gsm1921-login-user', JSON.stringify({ personId: u, role: 'participant', branchId: null }));
    }, [born.token, born.user.id]);

    // U4 阻断层：待归属者进工作台 ⇒ 弹回登录页并带 need-branch
    await page.goto(`${base}/workspace/visitor.html`, { waitUntil: 'domcontentloaded' });
    await page.waitForURL(/login\.html\?need-branch=1/, { timeout: 15000 });
    assert.match(page.url(), /login\.html\?need-branch=1$/, 'U4 待归属者不得进入工作台');
    await page.locator('#login-branch.visible').waitFor({ timeout: 10000 });

    // U5 支部确认（党委 p_pc 跨支部批）⇒ 刷新即放行
    const bound = await api('POST', '/api/v1/auth/iaaa/bind-branch', { token: born.token, body: { branchId: 'br-b1' } });
    assert.equal(bound.status, 200, '前置：待归属者须先提交支部意向（否则无待确认申请）');
    const pc = (await api('GET', '/api/v1/auth/iaaa/callback?mode=json&token=9000000001')).json;
    assert.equal(pc.user.role, 'party-staff', '前置：9000000001 应是党委组织员');
    const ok = await api('POST', `/api/v1/auth/iaaa/pending/${born.user.id}/approve`, { token: pc.token, body: { branchId: 'br-b1' } });
    assert.equal(ok.status, 200, `确认入站应 200，实测 ${ok.status}`);

    await page.locator('#branch-refresh').click();
    await page.waitForURL(/workspace\/visitor\.html/, { timeout: 15000 });
    assert.match(page.url(), /workspace\/visitor\.html/, 'U5 支部确认后应放行进入工作台');
  } finally { await ctx.close(); }
});
