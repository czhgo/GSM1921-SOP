// server/test/party-committee-dispatch.test.mjs — P3 党委后台「下发通知」E2E（2026-09-02）
// 验收（设计 §5 P3 双向通道下发半侧 + 支书裁定「复用通知」）：
//   ① 党委组织员在党委工作台「下发通知」选支部下发 → 下发历史即时可见
//   ② 目标支部的支委层成员（支书储子禾 2300010001）在通知铃铛看到该条（标「党委下发」）
//   ③ 党委台铃铛只取党委级：党委组织员自身可见该条（Task 28 · 2026-10-18）；
//      普通成员（宋佳宁 2400012349）铃铛不可见
//
// 自包含：createApp(:memory:) + seedDatabase；三账号（9000000001 / 2300010001 / 2400012349）。

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

async function loginAs(page, { studentId, expectUrlPart }) {
  await page.goto(`${base}/login.html`, { waitUntil: 'domcontentloaded' });
  await page.fill('#student-id', studentId);
  await page.fill('#password', '123456');
  await Promise.all([
    page.waitForURL(`**/workspace/${expectUrlPart}`, { timeout: 15000 }),
    page.click('button[type="submit"]'),
  ]);
  await page.waitForFunction(() => Boolean(document.getElementById('app-header')), { timeout: 15000 });
  // P0-2 形态断言（2026-09-23 支书裁定「形态必须可断言」）：本文件真机用例必须在 API 形态下跑
  await page.waitForFunction(async () => (await import('/src/data/data-adapter.js?v=20261120a')).getRuntimeMode().source === 'api', null, { timeout: 20000 });
}

async function activateTab(page, tabLabel) {
  await page.waitForFunction(() => Boolean(document.querySelector('.ws-tab-scroll button')), { timeout: 15000 });
  await page.evaluate((label) => {
    const btn = [...document.querySelectorAll('.ws-tab-scroll button')]
      .find((b) => b.textContent.includes(label));
    if (btn) btn.click();
  }, tabLabel);
}

/** 打开通知铃铛下拉并返回其文本（未打开前为 null） */
async function openBell(page) {
  await page.waitForFunction(() => Boolean(document.getElementById('notif-btn')), { timeout: 15000 });
  await page.evaluate(() => document.getElementById('notif-btn')?.click());
  await page.waitForFunction(() => {
    const d = document.getElementById('notif-dropdown');
    return d && !d.classList.contains('hidden');
  }, { timeout: 8000 });
  return page.evaluate(() => document.getElementById('notif-dropdown')?.textContent || '');
}

test('P3 党委下发：支委层与党委台可见，普通成员不可见', async () => {
  const titleD = `P3党委下发-${Date.now()}`;
  const partyPage = await newPage();
  const secPage = await newPage();
  const memberPage = await newPage();

  try {
    // ── ① 党委组织员（9000000001）→ 下发通知 tab → 下发到 br-b1 ──
    await loginAs(partyPage, { studentId: '9000000001', expectUrlPart: 'party-committee' });
    await activateTab(partyPage, '下发通知');
    await page_waitText(partyPage, '撰写一条党委通知');
    // 批次 612/617：full 并发下曾出现「支部复选框未渲染就取值为空 / 异步回执慢仍未见标题」；
    //   改为按用户路径真实交互（waitFor visible → check → fill → click），提交前确认表单值未被重绘清空。
    const branchBox = partyPage.locator('#dispatch-branches input[name="dispatch-branch"]').first();
    await branchBox.waitFor({ state: 'visible', timeout: 20000 });
    await branchBox.check();
    await partyPage.locator('#dispatch-title').fill(titleD);
    await partyPage.locator('#dispatch-content').fill('请支委会对照落实，重要事项及时向支部大会传达。');
    await partyPage.waitForFunction(
      (t) => document.getElementById('dispatch-title')?.value === t,
      titleD, { timeout: 10000 },
    );
    await partyPage.locator('#dispatch-submit').click();
    // 等回执后再切页：成功路径会自动切到「已发送」，以标题出现为准（不依赖 toast 停留时长）。
    //   并发负载下回执可能超过 15s ⇒ 放宽到 30s（只加等待，判据不变）；失败时带出页面尾部便于分诊。
    try {
      await page_waitText(partyPage, titleD, 30000);
    } catch (err) {
      const tail = await partyPage
        .evaluate(() => document.body.innerText.replace(/\s+/g, ' ').slice(-300))
        .catch(() => '');
      throw new Error(`${err.message}；提交后页面尾部：${tail}`);
    }
    await partyPage.getByRole('tab', { name: /已发送/ }).click();
    await page_waitText(partyPage, titleD); // 切到已发送后查看记录

    // 党委台铃铛只取党委级通知（Task 28 · 2026-10-18）：党委下发属党委级，组织员自身可见；
    // 支部内部广播仍不出现（不传/不命中 scope:'committee'）。
    const partyBell = await openBell(partyPage);
    assert.ok(partyBell.includes(titleD), '党委组织员应在党委台铃铛看到党委下发（党委级通知）');

    // ── ② 支书储子禾（2300010001，br-b1 支委层）铃铛可见该下发 ──
    await loginAs(secPage, { studentId: '2300010001', expectUrlPart: 'secretary' });
    const secBell = await openBell(secPage);
    assert.ok(secBell.includes(titleD), `支书（支委层）应看到党委下发（铃铛含 "${titleD}"）`);
    assert.ok(secBell.includes('党委下发'), '铃铛条目应带「党委下发」来源标识');

    // ── ③ 普通成员宋佳宁（2400012349，非支委）铃铛不可见 ──
    await loginAs(memberPage, { studentId: '2400012349', expectUrlPart: 'visitor' });
    const memBell = await openBell(memberPage);
    assert.ok(!memBell.includes(titleD), '普通成员（非支委）不应看到支委层下发');
  } finally {
    await partyPage.close();
    await secPage.close();
    await memberPage.close();
  }
});

async function page_waitText(page, text, timeout = 12000) {
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
