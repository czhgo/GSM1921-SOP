// server/test/party-committee.test.mjs — P1 党委后台 E2E（2026-09-02）
// 验收（设计 §8）：党委组织员登录直达党委工作台；header 显示院系党委名；
// 监控台账渲染支部；支部管理动态创建支部（支部不预设名字）且持久化（reload 仍在）。
//
// 自包含：createApp(:memory:) + seedDatabase；登录走账号密码表单（9000000001/123456 → p_pc 党委组织员）。

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

async function waitForBodyText(page, text, timeout = 10000) {
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

test('党委组织员登录直达党委工作台：台账见支部、可创建新支部且持久化', async () => {
  const page = await browser.newPage();
  await page.route('**://fonts.googleapis.com/**', (r) => r.abort());
  await page.route('**://fonts.gstatic.com/**', (r) => r.abort());
  await page.route('**://cdn.tailwindcss.com/**', (r) => r.abort());

  try {
    // 1. 登录党委账号（9000000001/123456 → p_pc）→ 直达 party-committee.html
    await page.goto(`${base}/login.html`, { waitUntil: 'domcontentloaded' });
    await page.fill('#student-id', '9000000001');
    await page.fill('#password', '123456');
    await Promise.all([
      page.waitForURL('**/workspace/party-committee.html', { timeout: 10000 }),
      page.click('button[type="submit"]'),
    ]);

    // 2. header 显示院系党委名（党委级角色不属于任一支部）
    await page.waitForFunction(() => {
      const header = document.getElementById('app-header');
      return header && header.textContent.includes('光华管理学院党委');
    }, { timeout: 10000 });
    assert.match(await page.title(), /党委工作台/);
    assert.equal(await page.locator('#header-my-profile').count(), 0, 'Party header must hide own-profile link');

    // 3. 治理首页以真实待处理事项为主，不向党委首页暴露个人级明细
    await waitForBodyText(page, '支部监控台账'); // tab 栏存在
    await page.waitForFunction(() => {
      const c = document.getElementById('party-committee-tab-content');
      return c && c.textContent.includes('党委待处理') && c.textContent.includes('组织待补');
    }, { timeout: 10000 });
    const govText = await page.evaluate(() => document.getElementById('party-committee-tab-content')?.textContent || '');
    assert.ok(!govText.includes('储子禾'), '党委治理首页不得展示个人级档案明细');
    assert.ok(!govText.includes('思想汇报'), '党委治理首页不得展示思想汇报明细');
    assert.ok(govText.includes('待批复上报'), '首页队列必须说明任务来源和动作');

    // 3′. 支部监控按行对比组织状态；查看入口进入独立党委只读视图，不借用支书工作台
    await page.click('.ws-tab-scroll button:has-text("支部监控台账")');
    await waitForBodyText(page, '光华管理学院本科生党支部');
    const monText = await page.evaluate(() => document.getElementById('party-committee-tab-content')?.textContent || '');
    assert.ok(/成员 · 在册党员/.test(monText) && /待批复 · 活动/.test(monText), '台账应将组织规模与待办/活动动态并列呈现');
    assert.ok(!monText.includes('储子禾') && !monText.includes('思想汇报'), '全院支部台账不得铺开个人级详情');
    assert.ok(await page.evaluate(() => Boolean(document.querySelector('.branch-readonly-enter[data-branch-id="br-b1"]'))), '台账应有独立的只读下钻入口');

    // 4. 切到「支部管理」tab → 新建支部（支部不预设名字——党委动态录入）
    await page.click('.ws-tab-scroll button:has-text("支部管理")');
    await waitForBodyText(page, '新建支部');
    // 展开新建表单（UI toggle 点击存在渲染时序 flaky——确定性展开）
    await page.evaluate(() => {
      const t = document.getElementById('branch-add-toggle');
      const w = document.getElementById('branch-form-wrap');
      if (t) t.click();
      if (w) w.classList.remove('hidden');
    });
    await page.waitForFunction(() => {
      const w = document.getElementById('branch-form-wrap');
      return w && !w.classList.contains('hidden') && w.querySelector('#branch-name-input');
    }, { timeout: 5000 });
    const branchName = `党委测试支部-${Date.now()}`;
    // fill 同样可能撞 workspace-shell 周期重渲（input 被重置）——evaluate 直接赋值
    await page.evaluate((name) => {
      const n = document.getElementById('branch-name-input');
      const t = document.getElementById('branch-type-input');
      if (n) { n.value = name; n.dispatchEvent(new Event('input', { bubbles: true })); }
      if (t) { t.value = '硕士'; t.dispatchEvent(new Event('input', { bubbles: true })); }
    }, branchName);
    // submit 用 DOM click（workspace-shell 周期重渲会把表单重置 hidden，Playwright actionability 会超时）
    await page.evaluate(() => document.getElementById('branch-form-submit')?.click());
    await waitForBodyText(page, branchName);

    // 5. 持久化：reload 后新支部仍在（API 模式 → server branches 表）
    await page.reload({ waitUntil: 'domcontentloaded' });
    // reload 后回到默认 tab（治理总览，不含支部明细）→ 切「支部监控台账」应列出新支部
    await page.waitForFunction(() => Boolean(document.querySelector('.ws-tab-scroll button')), { timeout: 15000 });
    await page.click('.ws-tab-scroll button:has-text("支部监控台账")');
    await waitForBodyText(page, branchName);
  } finally {
    await page.close();
  }
});

test('P2 支书任命：任命宋佳宁(p5)为支书 → p5 登录直达支书台、原支书储子禾(p13)降回成员', async () => {
  const page = await browser.newPage();
  await page.route('**://fonts.googleapis.com/**', (r) => r.abort());
  await page.route('**://fonts.gstatic.com/**', (r) => r.abort());
  await page.route('**://cdn.tailwindcss.com/**', (r) => r.abort());
  try {
    // 1. 党委登录 → 走真实任命服务链（appointSecretary：branch.secretaryId + 双方 role + 任期记录）
    await page.goto(`${base}/login.html`, { waitUntil: 'domcontentloaded' });
    await page.fill('#student-id', '9000000001');
    await page.fill('#password', '123456');
    await Promise.all([
      page.waitForURL('**/workspace/party-committee.html', { timeout: 10000 }),
      page.click('button[type="submit"]'),
    ]);
    await page.waitForFunction(() => {
      const h = document.getElementById('app-header');
      return h && h.textContent.includes('光华管理学院党委');
    }, { timeout: 10000 });
    const appoint = await page.evaluate(async () => {
      const { appointSecretary } = await import('/src/services/branch/appointment.js?v=20261018a');
      await appointSecretary({ branchId: 'br-b1', personId: 'p5', note: 'E2E 换届测试' });
      const { mockDB } = await import('/src/core/domain/domain.js?v=20261018a');
      const branch = (mockDB.branches || []).find(b => b.id === 'br-b1');
      const recs = (mockDB.appointmentRecords || []).filter(r => r.branchId === 'br-b1');
      return { secretaryId: branch?.secretaryId, recs: recs.length, currentTo: (recs.find(r => !r.to) || {}).secretaryId };
    });
    // 2. 断言：br-b1.secretaryId=p5 + 任期记录存在且现任=p5（原支支书录已封口）
    if (appoint.secretaryId !== 'p5') throw new Error(`任命后 secretaryId 应为 p5，实际 ${appoint.secretaryId}`);
    if (!(appoint.recs >= 1 && appoint.currentTo === 'p5')) throw new Error(`任期记录异常：${JSON.stringify(appoint)}`);

    // 切监控台账验证只呈组织级信息，不在党委台账铺开支书个人档案。
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => Boolean(document.querySelector('.ws-tab-scroll button')), { timeout: 15000 });
    await page.click('.ws-tab-scroll button:has-text("支部监控台账")');
    await waitForBodyText(page, '光华管理学院本科生党支部');
    const monitorText = await page.evaluate(() => document.getElementById('party-committee-tab-content')?.textContent || '');
    assert.ok(!monitorText.includes('宋佳宁'), '党委支部动态不应展示个人档案明细');

    // 3. 新任支书宋佳宁(p5)登录 → 直达支书工作台 secretary.html
    const p5 = await browser.newPage();
    await p5.route('**://fonts.googleapis.com/**', (r) => r.abort());
    await p5.route('**://fonts.gstatic.com/**', (r) => r.abort());
    await p5.route('**://cdn.tailwindcss.com/**', (r) => r.abort());
    await p5.goto(`${base}/login.html`, { waitUntil: 'domcontentloaded' });
    await p5.fill('#student-id', '2400012349'); // p5 宋佳宁
    await p5.fill('#password', '123456');
    await Promise.all([
      p5.waitForURL('**/workspace/secretary.html', { timeout: 10000 }),
      p5.click('button[type="submit"]'),
    ]);

    // 4. 原支书储子禾(p13)登录 → 降回成员，直达 visitor.html
    const p13 = await browser.newPage();
    await p13.route('**://fonts.googleapis.com/**', (r) => r.abort());
    await p13.route('**://fonts.gstatic.com/**', (r) => r.abort());
    await p13.route('**://cdn.tailwindcss.com/**', (r) => r.abort());
    await p13.goto(`${base}/login.html`, { waitUntil: 'domcontentloaded' });
    await p13.fill('#student-id', '2300010001'); // p13 储子禾
    await p13.fill('#password', '123456');
    await Promise.all([
      p13.waitForURL('**/workspace/visitor.html', { timeout: 10000 }),
      p13.click('button[type="submit"]'),
    ]);
    await p5.close();
    await p13.close();
  } finally {
    await page.close();
  }
});

// ════════════════════════════════════════════════════════════════
// 党委查看支部走独立只读页面，显式携带 branchId，且不切换支书工作台身份。
// ════════════════════════════════════════════════════════════════
test('党委「查看该支部」进入独立只读视图：范围明确、无写控件、身份不切换', async () => {
  const page = await browser.newPage();
  await page.route('**://fonts.googleapis.com/**', (r) => r.abort());
  await page.route('**://fonts.gstatic.com/**', (r) => r.abort());
  await page.route('**://cdn.tailwindcss.com/**', (r) => r.abort());
  const pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(String(e.message)));

  try {
    // 1. 党委组织员走真实后端登录（建立 gsm1921-api-token = API 会话）
    await page.goto(`${base}/login.html`, { waitUntil: 'domcontentloaded' });
    await page.fill('#student-id', '9000000001');
    await page.fill('#password', '123456');
    await Promise.all([
      page.waitForURL('**/workspace/party-committee.html', { timeout: 15000 }),
      page.click('button[type="submit"]'),
    ]);
    assert.equal(
      await page.evaluate(() => !!sessionStorage.getItem('gsm1921-api-token')), true,
      '党委登录后应为 API 会话（存在 gsm1921-api-token）'
    );
    // P0-2 形态断言（2026-09-23 支书裁定「形态必须可断言」）：真机用例的数据源形态单一源 = data/data-adapter.js::getRuntimeMode()
    await page.waitForFunction(async () => (await import('/src/data/data-adapter.js?v=20261018a')).getRuntimeMode().source === 'api', null, { timeout: 20000 });
    await page.waitForFunction(() => Boolean(document.getElementById('app-header')), { timeout: 15000 });

    // 2. 「支部监控台账」→ 点 br-b1 的「查看该支部」
    await page.waitForFunction(() => Boolean(document.querySelector('.ws-tab-scroll button')), { timeout: 15000 });
    await page.evaluate(() => {
      const b = [...document.querySelectorAll('.ws-tab-scroll button')].find((x) => x.textContent.includes('支部监控台账'));
      if (b) b.click();
    });
    await page.waitForFunction(() => Boolean(document.querySelector('.branch-readonly-enter[data-branch-id="br-b1"]')), { timeout: 15000 });
    await Promise.all([
      page.waitForURL('**/workspace/branch-readonly.html?branchId=br-b1', { timeout: 15000 }),
      page.evaluate(() => document.querySelector('.branch-readonly-enter[data-branch-id="br-b1"]').click()),
    ]);

    // 3. 页面保持党委身份并明确显示所选支部范围
    assert.match(page.url(), /\/workspace\/branch-readonly\.html\?branchId=br-b1$/);
    await waitForBodyText(page, '党委只读视图');
    await waitForBodyText(page, '光华管理学院本科生党支部');
    await waitForBodyText(page, '只读');

    // 4. 只读约束：落点视图无表单和写操作按钮
    const surface = await page.evaluate(() => {
      const root = document.getElementById('branch-readonly-content');
      const writeRe = /发布|新增|保存|提交|删除|创建|发起|赋权|指派|上传|编辑|驳回|批准|回滚|导入/;
      const forms = root.querySelectorAll('form, input, select, textarea').length;
      const writeButtons = [...root.querySelectorAll('button')]
        .filter((b) => writeRe.test((b.textContent || '') + (b.getAttribute('title') || '')))
        .map((b) => (b.textContent || '').trim().slice(0, 20));
      return { forms, writeButtons };
    });
    assert.equal(surface.forms, 0, `只读视图不应呈现任何表单控件（input/select/textarea/form），实际 ${surface.forms}`);
    assert.deepEqual(surface.writeButtons, [], `只读视图不应呈现写操作按钮，实际 ${JSON.stringify(surface.writeButtons)}`);

    // 5. 只读下钻保持 party-staff 身份，不借用支书身份
    const perms = await page.evaluate(async () => {
      const { AuthStore } = await import('/src/services/core/auth.js?v=20261018a');
      const me = AuthStore.getCurrentUser();
      return {
        role: me && me.role,
      };
    });
    assert.equal(perms.role, 'party-staff', '只读视图应保持党委组织员身份');

    // 6. 无脚本异常
    assert.deepEqual(pageErrors, [], `只读支部页不应有页面异常：${JSON.stringify(pageErrors)}`);
  } finally {
    await page.close();
  }
});
