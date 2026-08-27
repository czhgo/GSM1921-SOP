// role: [工程师]+[AI]
// min3-review-regression.mjs — 最小三成本专项评议第 3 轮 · 静态模式 + server 模式关键路径实测
// 覆盖基线：REVIEW_QUEUE 附录⑤（进入即见/≤2跳/待办必见/登录成本）
// 等待策略：domcontentloaded + 显式轮询（避免 networkidle 在长连接下卡死）
// 运行：node server/test/min3-review-regression.mjs（server 需在 localhost:3000）
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const BASE = 'http://localhost:3000';

async function open(browser, url) {
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
  return page;
}
async function waitText(page, locator, substr, timeout = 8000) {
  await page.waitForFunction(
    (sel, sub) => {
      const el = document.querySelector(sel);
      return el && (!sub || el.innerText.includes(sub));
    },
    locator, substr, { timeout },
  );
}

// ══ 静态模式（不登录，mock + localStorage） ══
test('S1 静态首页进入即见：统计卡/通知/活动非空', async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await open(browser, `${BASE}/index.html`);
    // 统计卡与通知均为异步加载：占位"加载中…" → 真实数据（P1 修复：空态不得误导）
    await page.waitForFunction(() => (document.querySelector('#dashboard-stats')?.innerText || '').includes('活动'), null, { timeout: 15000 });
    const stats = await page.locator('#dashboard-stats').innerText();
    assert.ok(stats.length > 20, `统计卡应有数据: ${stats.slice(0, 60)}`);
    await page.waitForFunction(
      () => {
        const t = document.querySelector('#dashboard-notice-list')?.innerText || '';
        return t.length > 10 && !t.includes('加载中') && !t.includes('暂无通知');
      }, null, { timeout: 10000 },
    );
    const notices = await page.locator('#dashboard-notice-list').innerText();
    assert.ok(notices.length > 10, `通知应有真实内容: ${notices.slice(0, 60)}`);
    const acts = await page.locator('#cal-main-grid').innerText();
    assert.ok(acts.trim().length > 20, '活动日历应有内容');
    console.log('[S1] 首页统计/通知/活动非空 ✓');
  } finally { await browser.close(); }
});

test('S2 首页→工作台/登录链接（T-284：未登录直达登录页，1 跳）', async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await open(browser, `${BASE}/index.html`);
    await page.waitForTimeout(800); // 等 main-entry 登录态链接改写
    // 未登录：首页不应再有工作台直达链接，入口统一直达 login.html
    const badCount = await page.locator('a[href*="workspace/"]').count();
    assert.equal(badCount, 0, '未登录首页不应保留工作台直达链接（T-284 绕路消除）');
    const loginHref = await page.locator('a[href*="login"]').first().getAttribute('href');
    assert.ok(loginHref && loginHref.includes('login.html'), `未登录首页应有登录直达链接: ${loginHref}`);
    console.log(`[S2] 未登录首页工作台入口直达登录页: ${loginHref} ✓`);
  } finally { await browser.close(); }
});

test('S3 server 登录后 visitor 工作台进入即见', async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await loginAs(browser, 'participant');
    assert.ok(page.url().includes('visitor.html'), `participant 应直达 visitor: ${page.url()}`);
    await page.waitForFunction(() => document.body.innerText.length > 200, null, { timeout: 10000 });
    const body = await page.locator('body').innerText();
    assert.ok(body.includes('活动') || body.includes('专班') || body.includes('工作台'), 'visitor 应有内容');
    console.log('[S3] visitor 工作台非空态 ✓');
  } finally { await browser.close(); }
});

// ══ server 模式（登录 + api 数据源） ══
test('L1 server 未登录门控：secretary → login', async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await open(browser, `${BASE}/workspace/secretary.html`);
    await page.waitForFunction(() => window.location.href.includes('login'), null, { timeout: 6000 });
    console.log('[L1] 未登录 secretary 跳 login ✓');
  } finally { await browser.close(); }
});

// 开发模式登录辅助：勾选 dev-toggle → 点身份卡 → 进入工作台
async function loginAs(browser, role) {
  const page = await open(browser, `${BASE}/login.html`);
  await page.locator('#dev-toggle').first().waitFor({ timeout: 6000 });
  await page.locator('#dev-toggle').first().check();
  await page.locator(`.login-card[data-role="${role}"]`).first().waitFor({ timeout: 6000 });
  await page.locator(`.login-card[data-role="${role}"]`).first().click();
  await page.waitForFunction(() => window.location.href.includes('workspace'), null, { timeout: 10000 });
  await page.waitForTimeout(600);
  return page;
}

test('L2 server 登录成本：开发模式选身份 → 工作台', async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await loginAs(browser, 'secretary');
    console.log(`[L2] 登录 → ${page.url().split('/').pop()} ✓`);
  } finally { await browser.close(); }
});

test('L3 server 登录后待办可见（≤2 跳）', async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await loginAs(browser, 'secretary');
    await page.waitForFunction(() => document.body.innerText.length > 500, null, { timeout: 10000 });
    const body = await page.locator('body').innerText();
    assert.ok(body.length > 500, '工作台应有内容');
    const hasTodo = body.includes('待办') || body.includes('审批') || body.includes('通知');
    assert.ok(hasTodo, '登录后待办/通知必见（≤2 跳直达）');
    console.log(`[L3] 登录后工作台 ${body.length} 字符, 待办可见 ✓`);
  } finally { await browser.close(); }
});

test('L4 server 登录后首页身份标签', async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await loginAs(browser, 'secretary');
    await page.goto(`${BASE}/index.html`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1200);
    const body = await page.locator('body').innerText();
    const hasIdentity = body.includes('书记') || body.includes('退出登录');
    assert.ok(hasIdentity, '登录后首页应有身份标识');
    console.log('[L4] 登录后首页身份标签 ✓');
  } finally { await browser.close(); }
});

// ══ server 后端形态：API 认证链路 + 会话持久化 ══
test('S5 server API 链路：health 可达 + 账号登录 me 认证 + 刷新会话保持', async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    // 1. API 服务可达
    const health = await (await fetch(`${BASE}/api/v1/health`)).json();
    assert.ok(health.ok, 'server health 应可达');
    // 2. 账号密码登录（真实 API 认证链路，产生 token）
    const page = await open(browser, `${BASE}/login.html`);
    await page.locator('#student-id').fill('2300010001');
    await page.locator('#password').fill('123456');
    await page.locator('#login-form button[type="submit"]').click();
    await page.waitForFunction(() => window.location.href.includes('workspace'), null, { timeout: 10000 });
    await page.waitForTimeout(600);
    const token = await page.evaluate(() => sessionStorage.getItem('gsm1921-api-token'));
    assert.ok(token, '账号登录后应有 API token');
    const me = await page.evaluate(async (t) => {
      const r = await fetch('/api/v1/auth/me', { headers: { Authorization: `Bearer ${t}` } });
      return r.json();
    }, token);
    assert.ok(me.role === 'secretary', `me 应返回当前角色 secretary: ${me.role}`);
    // 3. 刷新后登录态保持
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(800);
    const still = await page.evaluate(() => !!localStorage.getItem('gsm1921-login-user'));
    assert.ok(still, '刷新后登录态应保持');
    console.log('[S5] server health / 账号登录认证 / 会话保持 ✓');
  } finally { await browser.close(); }
});
