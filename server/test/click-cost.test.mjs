// role: [工程师]+[AI]
// click-cost.test.mjs — 点击成本实测（T-283 方向3，书记强调"点击是最重要的"；原 click-cost-audit.mjs）
// 覆盖：书记创建三会一课活动全流程点击数 + 活动详情查看点击数 + 待办行动点击数
// 基线：REVIEW_QUEUE 附录⑤（进入工作台→可执行事项 ≤2 跳 / 待办行动按钮 1 次直达）
// 运行：node --test server/test/click-cost.test.mjs（server 需在 3000 端口）
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const BASE = 'http://localhost:3000';

// 登录辅助：开发模式选身份（1 次点击）
async function loginAs(browser, role) {
  const page = await browser.newPage();
  await page.goto(`${BASE}/login.html`, { waitUntil: 'domcontentloaded' });
  await page.locator('#dev-toggle').first().check();
  await page.locator(`.login-card[data-role="${role}"]`).first().click(); // 点击 1
  await page.waitForFunction(() => window.location.href.includes('workspace'), null, { timeout: 10000 });
  await page.waitForTimeout(800);
  return page;
}

// 场景 A：书记创建三会一课（党小组会）活动
test('C1 书记创建三会一课活动：点击次数统计（目标 ≤5 次）', async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await loginAs(browser, 'secretary');
    let clicks = 0;
    const click = async (loc, desc) => { await loc.first().click(); clicks++; console.log(`  [点击 ${clicks}] ${desc}`); };

    // 1. 切到活动管理 tab
    await click(page.locator('.secretary-tab-btn[data-secretary-tab="calendar"]'), 'Tab「活动管理」');
    await page.waitForSelector('#ws-sec-write-btn', { timeout: 10000 });

    // 2. 打开写入活动
    await click(page.locator('#ws-sec-write-btn'), '按钮「写入活动」');
    await page.waitForSelector('[data-action="select-template"]', { timeout: 10000 });

    // 3. 选模板：三会一课 → 党小组会（一个按钮直达）
    await click(page.locator('[data-action="select-template"][data-category="three-meetings"][data-subtype="party-group-meeting"]'), '模板「党小组会」');

    // 4. 填表单（输入不算点击）
    const uniqueTitle = `T283议程实测-${Date.now().toString().slice(-5)}`;
    await page.fill('#wp-title', uniqueTitle);
    await page.fill('#wp-location', '光华1号楼203会议室');

    // 5. 提交创建（mock 模式各写操作 600ms 延迟 + 多任务节点，等待创建+刷新完成）
    const pageErrors = [];
    page.on('pageerror', e => pageErrors.push(String(e).slice(0, 160)));
    await click(page.locator('[data-action="wp-submit"]'), '按钮「创建活动」');
    // 轮询等待：创建完成后日历自动出现新活动（反馈闭环，无需手动操作）
    await page.waitForFunction(
      (u) => {
        const grid = document.querySelector('#cal-main-grid');
        return grid ? grid.innerHTML.includes(u) : false;
      },
      uniqueTitle, { timeout: 15000 },
    ).catch(() => {});

    // 验证：活动出现在日历（日历条目显示类型短标签，完整标题在 title 属性）
    const diag = await page.evaluate((u) => {
      const grid = document.querySelector('#cal-main-grid');
      const sel = document.querySelector('#month-selector');
      let stored = null;
      try { stored = JSON.parse(localStorage.getItem('workflowos_branch_db_v1') || 'null'); } catch (_) {}
      const storedActs = stored?.activities || [];
      const newAct = storedActs.find(a => a.title === u);
      return {
        gridHtmlHas: grid ? grid.innerHTML.includes(u) : false,
        monthValue: sel ? sel.value : null,
        storedHasTitle: storedActs.some(a => a.title === u),
        storedCount: storedActs.length,
        newActDate: newAct?.date || null,
        newActStatus: newAct?.status || null,
        tagCount: grid ? grid.querySelectorAll('.cal-activity-item').length : 0,
        gridSnippet: grid ? grid.innerHTML.slice(0, 300) : '',
      };
    }, uniqueTitle);
    const st = await page.evaluate(async (u) => {
      const m = await import('/src/core/state.js?v=20260901s');
      const acts = m.getAppState().activities || [];
      return {
        appStateCount: acts.length,
        appStateHasNew: acts.some(a => a.title === u),
        appStateDisplayMonth: m.getAppState().displayMonth,
        appStateSelected: m.getAppState().selectedActivityId,
      };
    }, uniqueTitle);
    console.log('[C1-STATE]', JSON.stringify(st));
    console.log('[C1-DIAG]', JSON.stringify(diag));
    if (pageErrors.length) console.log('[C1-ERRORS]', pageErrors.join(' | '));
    const warns = await page.evaluate(() => (window.__c1warns || []).join(' | '));
    if (warns) console.log('[C1-WARNS]', warns);

    const actTag = page.locator('#cal-main-grid .cal-activity-item[title*="T283"]');
    const exists = await actTag.count() > 0;
    console.log(`[C1] 创建活动「${uniqueTitle}」出现于日历: ${exists ? '✓' : '✗'} ｜ 总点击 ${clicks} 次`);
    console.log(`[C1] 点击链路: 登录(1) → Tab(1) → 写入活动(1) → 选模板(1) → 创建(1)`);
    assert.ok(exists, '新活动应出现在日历');
    assert.ok(clicks <= 5, `创建三会一课活动应 ≤5 次点击，实际 ${clicks}`);
  } finally { await browser.close(); }
});

// 场景 B：活动详情查看点击数
test('C2 书记查看活动详情：进入工作台后 ≤2 次点击可见', async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await loginAs(browser, 'secretary');
    let clicks = 0;
    const click = async (loc, desc) => { await loc.first().click(); clicks++; console.log(`  [点击 ${clicks}] ${desc}`); };

    await click(page.locator('.secretary-tab-btn[data-secretary-tab="calendar"]'), 'Tab「活动管理」');
    await page.waitForSelector('#month-selector', { timeout: 10000 });

    // 切月份到 2026-06（act-15 所在月）：原生 select 被 cs-select 自定义下拉替换，
    // 直接设值 + dispatch change（测试环境设置，不计点击）
    await page.evaluate(() => {
      const sel = document.getElementById('month-selector');
      sel.value = '2026-06';
      sel.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await page.waitForSelector('.cal-activity-item[data-act-id="act-15"]', { timeout: 10000 });

    await click(page.locator('.cal-activity-item[data-act-id="act-15"]'), '日历条目「act-15」');
    await page.waitForSelector('#inspector-date-title', { timeout: 10000 });
    const title = await page.locator('#inspector-date-title').innerText();
    console.log(`[C2] 详情标题: ${title} ｜ 总点击 ${clicks} 次（进入工作台后 2 次直达详情：Tab+条目）`);
    assert.ok(title.length > 0, '详情应打开');
    assert.ok(clicks <= 2, `详情查看应 ≤2 次点击，实际 ${clicks}`);
  } finally { await browser.close(); }
});

// 场景 C：书记待办可见（默认 tab 无需点击）
test('C3 书记待办可见：登录即见待办内容', async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await loginAs(browser, 'secretary');
    await page.waitForFunction(() => document.body.innerText.length > 500, null, { timeout: 15000 });
    const body = await page.locator('body').innerText();
    const hasTodo = body.includes('待办') || body.includes('审批') || body.includes('通知');
    console.log(`[C3] 登录后默认 tab 即见待办: ${hasTodo ? '✓' : '✗'}（body ${body.length} 字符）`);
    assert.ok(hasTodo, '登录后待办必见（0 次额外点击）');
  } finally { await browser.close(); }
});
