// server/test/party-committee-review.test.mjs — P3 党委后台「支部上报审批」E2E（2026-09-02）
// 验收（设计 §5 P3 双向通道闭环）：
//   ① 支部书记登录书记工作台「上报党委」发起上报（发展节点）→ 待党委批复
//   ② 党委组织员登录党委工作台「上报审批」逐项批准（带意见）→ 支部侧可见批准结论
//   ③ 活动报备驳回路径：驳回须填意见（空意见不生效）；带意见驳回 → 支部侧可见驳回与意见
//
// 自包含：createApp(:memory:) + seedDatabase；双账号双浏览器上下文（互不干扰登录会话）。

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { createApp } from '../app.js';
import { seedDatabase } from '../seed.js';

let server;
let base;
let browser;

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
    await new Promise((resolve) => server.close(resolve));
  }
});

async function newPage() {
  const page = await browser.newPage();
  await page.route('**://fonts.googleapis.com/**', (r) => r.abort());
  await page.route('**://fonts.gstatic.com/**', (r) => r.abort());
  await page.route('**://cdn.tailwindcss.com/**', (r) => r.abort());
  return page;
}

async function waitForBodyText(page, text, timeout = 12000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    try {
      const found = await page.evaluate(
        (t) => Boolean(document.body && document.body.textContent.includes(t)),
        text
      );
      if (found) return;
    } catch (_) { /* 导航中上下文销毁：重试 */ }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`超时：页面 body 文本未包含 "${text}"`);
}

/** 账号密码表单登录（personId 由 studentId 映射）→ 期望落地 workspace 页 */
async function loginAs(page, { studentId, expectUrlPart }) {
  await page.goto(`${base}/login.html`, { waitUntil: 'domcontentloaded' });
  await page.fill('#student-id', studentId);
  await page.fill('#password', '123456');
  await Promise.all([
    page.waitForURL(`**/workspace/${expectUrlPart}`, { timeout: 15000 }),
    page.click('button[type="submit"]'),
  ]);
  // 等 app header 渲染（工作台引导登录完成信号）
  await page.waitForFunction(() => Boolean(document.getElementById('app-header')), { timeout: 15000 });
}

/** 切到指定 tab（workspace-shell 周期重绘 → evaluate 直接点 DOM，避免 actionability flaky） */
async function activateTab(page, tabLabel) {
  await page.waitForFunction(() => Boolean(document.querySelector('.ws-tab-scroll button')), { timeout: 15000 });
  await page.evaluate((label) => {
    const btn = [...document.querySelectorAll('.ws-tab-scroll button')]
      .find((b) => b.textContent.includes(label));
    if (btn) btn.click();
  }, tabLabel);
}

/** 支部侧发起一条上报（填表用 evaluate 直改 value，防 shell 重绘重置） */
async function submitRequest(page, { type, title, content }) {
  // 展开发起上报表单
  await page.waitForFunction(() => Boolean(document.getElementById('rq-submit-toggle')), { timeout: 10000 });
  await page.evaluate(() => document.getElementById('rq-submit-toggle')?.click());
  await page.waitForFunction(() => {
    const w = document.getElementById('rq-form-wrap');
    return w && !w.classList.contains('hidden') && w.querySelector('#rq-title');
  }, { timeout: 8000 });
  await page.evaluate(({ type, title, content }) => {
    const radio = document.querySelector(`input[name="rq-type"][value="${type}"]`);
    if (radio) { radio.checked = true; radio.dispatchEvent(new Event('change', { bubbles: true })); }
    const t = document.getElementById('rq-title');
    const c = document.getElementById('rq-content');
    if (t) { t.value = title; t.dispatchEvent(new Event('input', { bubbles: true })); }
    if (c) { c.value = content; c.dispatchEvent(new Event('input', { bubbles: true })); }
    document.getElementById('rq-form-submit')?.click();
  }, { type, title, content });
  await waitForBodyText(page, title); // 列表重绘后标题出现
}

/** 党委侧对指定标题的上报执行批/驳（note 为空则走「驳回须意见」守卫分支） */
async function decideOnCard(page, { title, decision, note }) {
  await page.evaluate(({ title, decision, note }) => {
    const card = [...document.querySelectorAll('[data-rq-card]')]
      .find((c) => c.textContent.includes(title));
    if (!card) return;
    const ta = card.querySelector('.rq-decision');
    if (ta) { ta.value = note; ta.dispatchEvent(new Event('input', { bubbles: true })); }
    card.querySelector(`[data-rq-act="${decision}"]`)?.click();
  }, { title, decision, note });
}

test('P3 支部上报审批闭环：发展节点批准 + 活动报备驳回（驳回须意见）', async () => {
  const titleA = `P3发展节点上报-${Date.now()}`;
  const noteA = `党委同意意见-${Date.now()}`;
  const titleB = `P3活动报备上报-${Date.now()}`;
  const noteB = `党委驳回意见-${Date.now()}`;

  const branchPage = await newPage();
  const partyPage = await newPage();

  try {
    // ── ① 书记（沈一 p13）登录书记工作台 → 上报党委 tab → 发起发展节点上报 ──
    await loginAs(branchPage, { studentId: '2300010001', expectUrlPart: 'secretary.html' });
    await activateTab(branchPage, '上报党委');
    await waitForBodyText(branchPage, '支部 → 党委 双向治理通道');
    await submitRequest(branchPage, { type: 'develop-node', title: titleA, content: '发展党员关键节点需党委知悉。' });
    await waitForBodyText(branchPage, '待党委批复');

    // ── ② 党委组织员（p_pc）登录党委工作台 → 上报审批 tab → 批准并带意见 ──
    await loginAs(partyPage, { studentId: '9000000001', expectUrlPart: 'party-committee.html' });
    await activateTab(partyPage, '上报审批');
    await waitForBodyText(partyPage, '审批半侧');
    await waitForBodyText(partyPage, titleA); // 待批复队列出现该上报
    await waitForBodyText(partyPage, '批准');
    await decideOnCard(partyPage, { title: titleA, decision: 'approve', note: noteA });
    await waitForBodyText(partyPage, noteA); // 结论即时回显（卡进入已处理区）
    assert.match(await partyPage.evaluate(() => document.body.textContent), /已处理/);

    // 支部侧刷新可见「党委批准 + 意见」（双向通道闭环）
    await branchPage.reload({ waitUntil: 'domcontentloaded' });
    await page_waitHeader(branchPage);
    await activateTab(branchPage, '上报党委');
    await waitForBodyText(branchPage, titleA);
    await waitForBodyText(branchPage, '党委批准');
    await waitForBodyText(branchPage, noteA);

    // ── ③ 活动报备驳回路径：支部再发一条 → 党委空意见驳回不生效 → 带意见驳回 ──
    await submitRequest(branchPage, { type: 'activity-report', title: titleB, content: '拟赴香山开展主题党日，需报备。' });
    await waitForBodyText(branchPage, '待党委批复');

    await partyPage.reload({ waitUntil: 'domcontentloaded' });
    await page_waitHeader(partyPage);
    await activateTab(partyPage, '上报审批');
    await waitForBodyText(partyPage, titleB);

    // 空意见驳回：守卫提示、状态不变（仍在待批复卡内）
    await decideOnCard(partyPage, { title: titleB, decision: 'reject', note: '' });
    await new Promise((r) => setTimeout(r, 800));
    const stillPending = await partyPage.evaluate((t) => {
      const card = [...document.querySelectorAll('[data-rq-card]')].find((c) => c.textContent.includes(t));
      return card ? card.textContent.includes('待批复') && !card.textContent.includes('驳回意见') : false;
    }, titleB);
    assert.ok(stillPending, '空意见驳回应被守卫拦截，卡片仍处待批复');

    // 带意见驳回 → 结论回显
    await decideOnCard(partyPage, { title: titleB, decision: 'reject', note: noteB });
    await waitForBodyText(partyPage, noteB);

    // 支部侧刷新可见「驳回 + 意见」
    await branchPage.reload({ waitUntil: 'domcontentloaded' });
    await page_waitHeader(branchPage);
    await activateTab(branchPage, '上报党委');
    await waitForBodyText(branchPage, titleB);
    await waitForBodyText(branchPage, '党委驳回');
    await waitForBodyText(branchPage, noteB);
  } finally {
    await branchPage.close();
    await partyPage.close();
  }
});

async function page_waitHeader(page) {
  await page.waitForFunction(() => Boolean(document.getElementById('app-header')), { timeout: 15000 });
}
