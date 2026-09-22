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

    // 3. C⑤（2026-09-10 支书裁定）：默认落点=治理总览，只留全院级汇总数字，无支部级明细
    await waitForBodyText(page, '支部监控台账'); // tab 栏存在
    await page.waitForFunction(() => {
      const c = document.getElementById('party-committee-tab-content');
      return c && c.textContent.includes('光华管理学院党委') && c.textContent.includes('在册党员');
    }, { timeout: 10000 });
    const govText = await page.evaluate(() => document.getElementById('party-committee-tab-content')?.textContent || '');
    assert.ok(!govText.includes('光华管理学院本科生党支部'), '治理总览不应出现支部名（支部明细收归台账）');
    assert.ok(!govText.includes('进入支部'), '治理总览不应出现「进入支部」入口（收归台账）');
    assert.ok(!govText.includes('近期动态') && !govText.includes('近期活动'), '治理总览不应出现支部级近期活动明细');
    assert.ok(/支部数/.test(govText) && /在册成员合计/.test(govText) && /在册党员/.test(govText) && /滞留党员/.test(govText) && /全院通知/.test(govText),
      `治理总览应保留全院级汇总数字，实际：${govText.slice(0, 200)}`);

    // 3′. 切到「支部监控台账」→ 支部级 8 项字段齐（支部名/支书/成员数/党员数/滞留/近期活动/进入支部）+ 支书任期
    await page.click('.ws-tab-scroll button:has-text("支部监控台账")');
    await waitForBodyText(page, '光华管理学院本科生党支部');
    await waitForBodyText(page, '储子禾'); // 台账含现任支书（br-b1.secretaryId → p13 储子禾）与阶段分布聚合
    await waitForBodyText(page, '支书任期');
    const monText = await page.evaluate(() => document.getElementById('party-committee-tab-content')?.textContent || '');
    assert.ok(/成员规模/.test(monText) && /在册党员/.test(monText) && /滞留党员/.test(monText), '台账应含成员规模 / 在册党员 / 滞留党员支部字段');
    assert.ok(/进入支部/.test(monText), '台账应含「进入支部」入口');
    assert.ok(await page.evaluate(() => Boolean(document.querySelector('.branch-demo-enter[data-branch-id="br-b1"]'))), '台账 br-b1 卡「进入支部」按钮可绑定');

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
      const { appointSecretary } = await import('/src/services/appointment.js?v=20260922f');
      await appointSecretary({ branchId: 'br-b1', personId: 'p5', note: 'E2E 换届测试' });
      const { mockDB } = await import('/src/core/domain.js?v=20260922f');
      const branch = (mockDB.branches || []).find(b => b.id === 'br-b1');
      const recs = (mockDB.appointmentRecords || []).filter(r => r.branchId === 'br-b1');
      return { secretaryId: branch?.secretaryId, recs: recs.length, currentTo: (recs.find(r => !r.to) || {}).secretaryId };
    });
    // 2. 断言：br-b1.secretaryId=p5 + 任期记录存在且现任=p5（原支支书录已封口）
    if (appoint.secretaryId !== 'p5') throw new Error(`任命后 secretaryId 应为 p5，实际 ${appoint.secretaryId}`);
    if (!(appoint.recs >= 1 && appoint.currentTo === 'p5')) throw new Error(`任期记录异常：${JSON.stringify(appoint)}`);

    // ⑧ 监控台账补「支书任期」行：刷新 + 切监控 tab → 卡片显示新支书姓名 + 任期（起止/现任）
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => Boolean(document.querySelector('.ws-tab-scroll button')), { timeout: 15000 });
    await page.click('.ws-tab-scroll button:has-text("支部监控台账")');
    await waitForBodyText(page, '支书任期');
    await waitForBodyText(page, '宋佳宁');
    await waitForBodyText(page, '至今');

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
// A⑤（2026-09-10 支书裁定）：党委「进入支部」放开 API 会话下钻（只读）
// 旧语义：真实后端登录（API 会话）点击「进入支部」被拒（Toast「真实后端登录暂不支持演示视图」）；
// 新语义：本地示例 / API 会话同口径放行 → 进入支部只读视图（演示只读横幅 + 无写控件），
//         写权限不放宽（party-staff 不入 ROLE_PERMISSIONS 键集 → canDo 写操作全 false；requiredRoles 不动）。
// 依据：content/02_institution/SYSTEM_ROLE_PERMISSION.md（角色矩阵）+ PARTY_COMMITTEE_DESIGN.md（党委监控=只读监督）。
// ════════════════════════════════════════════════════════════════
test('A⑤ 党委「进入支部」API 会话下钻：进入支部只读视图（只读提示 + 无写控件 + 写权限未放宽）', async () => {
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
    await page.waitForFunction(() => Boolean(document.getElementById('app-header')), { timeout: 15000 });

    // 2. 「支部监控台账」→ 点 br-b1 卡的「进入支部」
    await page.waitForFunction(() => Boolean(document.querySelector('.ws-tab-scroll button')), { timeout: 15000 });
    await page.evaluate(() => {
      const b = [...document.querySelectorAll('.ws-tab-scroll button')].find((x) => x.textContent.includes('支部监控台账'));
      if (b) b.click();
    });
    await page.waitForFunction(() => Boolean(document.querySelector('.branch-demo-enter[data-branch-id="br-b1"]')), { timeout: 15000 });
    await Promise.all([
      page.waitForURL('**/workspace/secretary.html?branch=br-b1', { timeout: 15000 }),
      page.evaluate(() => document.querySelector('.branch-demo-enter[data-branch-id="br-b1"]').click()),
    ]);

    // 3. 新语义：API 会话放行下钻（不再拒回党委台）+ 只读提示横幅渲染
    assert.match(page.url(), /\/workspace\/secretary\.html\?branch=br-b1$/,
      'API 会话应放行「进入支部」下钻（不再退回党委工作台）');
    await waitForBodyText(page, '党委演示只读视图');
    await waitForBodyText(page, '只读');
    await waitForBodyText(page, '返回党委治理总览');

    // 4. 只读约束：落点视图无任何可写控件（无表单控件；tab 栏之外无写动词按钮）
    await page.waitForFunction(() => Boolean(document.querySelector('.secretary-tab-btn')), { timeout: 15000 });
    await page.waitForTimeout(2500); // 等懒加载 tab（今天·只读速览）渲染完成
    const surface = await page.evaluate(() => {
      const root = document.getElementById('secretary-content');
      const writeRe = /发布|新增|保存|提交|删除|创建|发起|赋权|指派|上传|编辑|驳回|批准|回滚|导入/;
      const forms = root.querySelectorAll('form, input, select, textarea').length;
      const writeButtons = [...root.querySelectorAll('button')]
        .filter((b) => !b.classList.contains('secretary-tab-btn'))
        .filter((b) => writeRe.test((b.textContent || '') + (b.getAttribute('title') || '')))
        .map((b) => (b.textContent || '').trim().slice(0, 20));
      return { forms, writeButtons };
    });
    assert.equal(surface.forms, 0, `只读视图不应呈现任何表单控件（input/select/textarea/form），实际 ${surface.forms}`);
    assert.deepEqual(surface.writeButtons, [], `只读视图不应呈现写操作按钮，实际 ${JSON.stringify(surface.writeButtons)}`);

    // 5. 写权限不放宽：party-staff 写权限键仍全关（看≠做）；requiredRoles / 权限键未动
    const perms = await page.evaluate(async () => {
      const { AuthStore } = await import('/src/services/auth.js?v=20260922f');
      const me = AuthStore.getCurrentUser();
      return {
        role: me && me.role,
        createActivity: AuthStore.canDo('p_pc', 'create_activity'),
        assignTask: AuthStore.canDo('p_pc', 'assign_task'),
        manageMembers: AuthStore.canDo('p_pc', 'manage_members'),
        archive: AuthStore.canDo('p_pc', 'archive'),
      };
    });
    assert.equal(perms.role, 'party-staff', '下钻会话身份应为 party-staff');
    assert.deepEqual(
      {
        createActivity: perms.createActivity, assignTask: perms.assignTask,
        manageMembers: perms.manageMembers, archive: perms.archive,
      },
      { createActivity: false, assignTask: false, manageMembers: false, archive: false },
      'party-staff 写权限键须保持关闭（只读放开不得放宽任何写权限）'
    );

    // 6. 无脚本异常（演示下钻 ReferenceError/白屏回归守护）
    assert.deepEqual(pageErrors, [], `演示下钻不应有页面异常：${JSON.stringify(pageErrors)}`);
  } finally {
    await page.close();
  }
});
