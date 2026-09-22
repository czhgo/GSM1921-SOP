// role: [工程师]+[AI]
// click-cost.test.mjs — 点击成本实测（T-283 方向3，支书强调"点击是最重要的"；原 click-cost-audit.mjs）
// 覆盖：支书创建三会一课活动全流程点击数 + 活动详情查看点击数 + 待办行动点击数
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

// 场景 A：支书创建三会一课（党小组会）活动
test('C1 支书创建三会一课活动：点击次数统计（目标 ≤5 次）', async () => {
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
      const m = await import('/src/core/state.js?v=20260922l');
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
test('C2 支书查看活动详情：进入工作台后 ≤2 次点击可见', async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await loginAs(browser, 'secretary');
    let clicks = 0;
    const click = async (loc, desc) => { await loc.first().click(); clicks++; console.log(`  [点击 ${clicks}] ${desc}`); };

    await click(page.locator('.secretary-tab-btn[data-secretary-tab="calendar"]'), 'Tab「活动管理」');
    await page.waitForSelector('#month-selector', { timeout: 10000 });

    // 切月份到 2026-07（act-15 所在月）：原生 select 被 cs-select 自定义下拉替换，
    // 直接设值 + dispatch change（测试环境设置，不计点击）
    await page.evaluate(() => {
      const sel = document.getElementById('month-selector');
      sel.value = '2026-07';
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

// 场景 C：支书待办可见（R6-3「今天」置首新语义：默认落点=「今天」，待办必见=今天页 + ≤1 跳待办 tab）
test('C3 支书待办可见：默认落点「今天」，切待办 tab ≤1 次点击即见待办', async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await loginAs(browser, 'secretary');

    // 新语义（2026-09-08 起）：登录默认落点 =「今天」tab；[data-ws-memo="today"] 渲染即工作台可达
    await page.waitForFunction(() => {
      const memo = document.querySelector('[data-ws-memo="today"]');
      return memo && memo.textContent.includes('今天');
    }, null, { timeout: 15000 });
    const todayHead = await page.evaluate(() => {
      const memo = document.querySelector('[data-ws-memo="today"]');
      return memo ? memo.textContent.replace(/\s+/g, ' ').slice(0, 90) : '';
    });

    // 「待办必见」新形态：1 次点击待办 tab → 待办条目露头（种子下约 9 条）
    let extraClicks = 0;
    await page.locator('.secretary-tab-btn[data-secretary-tab="todo"]').first().click();
    extraClicks++;
    await page.waitForFunction(() => document.querySelectorAll('.secretary-todo-item').length >= 1, null, { timeout: 15000 });
    const itemCount = await page.locator('.secretary-todo-item').count();

    console.log(`[C3] 登录默认落点「今天」: ✓（${todayHead}）`);
    console.log(`[C3] 待办 tab ${extraClicks} 次点击即见待办 ${itemCount} 条: ${itemCount >= 1 ? '✓' : '✗'}`);
    assert.ok(itemCount >= 1, '切到待办 tab 后应可见待办条目（待办必见 ≤1 跳）');
    assert.ok(extraClicks <= 1, `待办必见应 ≤1 次额外点击，实际 ${extraClicks}`);
  } finally { await browser.close(); }
});

// ════════════════════════════════════════════════════════════════
//  组长台：C② 组长建活动「默认预选 + 高级层折叠」（2026-09-10 支书裁定）
//  裁定前：L1→承办党小组→L2→L3→L4 逐层点选（≥5 次）才出表单，内部术语 L1–L4 直接暴露；
//  裁定后：进入面板即按上下文派生默认值 → 0 次决策点选即可填表提交；术语区收进「高级设置（可选）」。
// ════════════════════════════════════════════════════════════════
const DECISION_TERMS = ['L1', 'L2', 'L3', 'L4'];
const WHITE_LABELS = ['活动类型', '活动形式', '时长', '发起方向', '承办党小组'];

/** 组长登录 → 活动管理 tab → 打开建活动面板（返回点击计数与 page） */
async function openLeaderCreatePanel(browser) {
  const page = await loginAs(browser, 'leader');
  let clicks = 0;
  const click = async (loc, desc) => { await loc.first().click(); clicks++; console.log(`  [点击 ${clicks}] ${desc}`); };
  await page.waitForFunction(() => document.querySelector('.leader-tab-btn[data-leader-tab="write"]'), { timeout: 12000 });
  await click(page.locator('.leader-tab-btn[data-leader-tab="write"]'), 'Tab「活动管理」');
  await page.waitForSelector('#btn-leader-create', { timeout: 10000 });
  await click(page.locator('#btn-leader-create'), '按钮「创建活动」');
  return { page, click, getClicks: () => clicks };
}

test('C4 组长建活动（默认预选）：决策点选 0 次、首屏无 L1–L4、直接提交成功（旧流程 ≥5 次）', async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const { page, click, getClicks } = await openLeaderCreatePanel(browser);
    await page.waitForSelector('#dt-title', { timeout: 10000 }); // 进面板即出表单（无「全选齐」阻隔）

    // ① 首屏可见文本不含 L1–L4 缩写；白话摘要呈现派生的默认值
    const panelText = await page.evaluate(() => document.getElementById('dt-panel-wrap').innerText);
    DECISION_TERMS.forEach((t) => assert.ok(!panelText.includes(t), `首屏不应出现 ${t} 缩写`));
    const summary = await page.evaluate(() =>
      (document.getElementById('dt-panel-wrap').innerText.split('\n').find(l => l.includes('当前设置')) || '').trim());
    console.log(`[C4] 首屏默认摘要：${summary}`);
    const myGroup = await page.evaluate(async () => {
      const m = await import('/src/entries/tabs/leader/_shared.js?v=20260922l');
      return m.currentLeaderGroup().group;
    });
    assert.ok(summary.includes('活动类型'), '首屏应显示白话「活动类型」摘要');
    assert.ok(summary.includes(myGroup), `默认承办党小组应为组长本组（${myGroup}）`);

    // ② 高级设置默认收起
    const advHidden = await page.evaluate(() => document.getElementById('dt-adv-body')?.classList.contains('hidden'));
    assert.equal(advHidden, true, '「高级设置（可选）」应默认收起');

    // ③ 填写（输入不计点击）→ 直接提交
    const uniqueTitle = `C2默认预选实测-${Date.now().toString().slice(-5)}`;
    await page.fill('#dt-title', uniqueTitle);
    await page.fill('#dt-location', '光华1号楼203会议室');
    await click(page.locator('#dt-submit'), '按钮「写入活动」');
    await page.waitForFunction((u) => document.body.textContent.includes(u), uniqueTitle, { timeout: 15000 }).catch(() => {});
    const saved = await page.evaluate((u) => {
      try {
        const db = JSON.parse(localStorage.getItem('workflowos_branch_db_v1') || 'null');
        return (db?.activities || []).some(a => a.title === u);
      } catch (_) { return false; }
    }, uniqueTitle);
    const clicks = getClicks();
    console.log(`[C4] 决策点选 0 次 ｜ 进入活动管理后总点击 ${clicks} 次（Tab+创建+提交）｜ 已落库: ${saved ? '✓' : '✗'}`);
    console.log(`[C4] 对比：旧流程需 L1+承办+L2+L3+L4 共 5 次决策点选方出表单`);
    assert.ok(saved, '默认预选后直接提交应创建成功');
    assert.ok(clicks <= 3, `组长常规建活动应 ≤3 次点击（Tab+创建+提交），实际 ${clicks}`);
  } finally { await browser.close(); }
});

test('C5 组长建活动（高级层展开）：仍可改 活动类型/形式/时长/发起方向/承办党小组 并提交', async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const { page } = await openLeaderCreatePanel(browser);
    await page.waitForSelector('#dt-title', { timeout: 10000 });

    // 展开高级设置 → 白话分区齐全、仍无 L1–L4
    await page.locator('#dt-adv-toggle').click();
    await page.waitForFunction(() => {
      const b = document.getElementById('dt-adv-body');
      return b && !b.classList.contains('hidden');
    }, { timeout: 5000 });
    const advText = await page.evaluate(() => document.getElementById('dt-adv-body').innerText);
    DECISION_TERMS.forEach((t) => assert.ok(!advText.includes(t), `高级区不应出现 ${t} 缩写`));
    WHITE_LABELS.forEach((label) => assert.ok(advText.includes(label), `高级区应含白话分区「${label}」`));

    // 改选各层（能力保留，与原行为一致）
    await page.locator('.dt-l1-btn[data-value="theme-party"]').click();
    await page.waitForSelector('.dt-l2-btn[data-value="实践参访"]', { timeout: 5000 });
    await page.locator('.dt-l2-btn[data-value="实践参访"]').click();
    await page.waitForSelector('.dt-l3-btn[data-value="long"]', { timeout: 5000 });
    await page.locator('.dt-l3-btn[data-value="long"]').click();
    await page.waitForSelector('.dt-l4-btn[data-value="top-down"]', { timeout: 5000 });
    await page.locator('.dt-l4-btn[data-value="top-down"]').click();
    // L1 变更会重置承办党小组 → 回选组长本组
    const myGroup = await page.evaluate(async () => {
      const m = await import('/src/entries/tabs/leader/_shared.js?v=20260922l');
      return m.currentLeaderGroup().group;
    });
    await page.waitForSelector(`.dt-host-btn[data-value="${myGroup}"]`, { timeout: 5000 });
    await page.locator(`.dt-host-btn[data-value="${myGroup}"]`).click();
    await page.waitForSelector('#dt-title', { timeout: 5000 });

    const uniqueTitle = `C2高级区实测-${Date.now().toString().slice(-5)}`;
    await page.fill('#dt-title', uniqueTitle);
    await page.fill('#dt-location', '北大校史馆');
    await page.locator('#dt-submit').click();
    await page.waitForFunction((u) => document.body.textContent.includes(u), uniqueTitle, { timeout: 15000 }).catch(() => {});
    const rec = await page.evaluate((u) => {
      try {
        const db = JSON.parse(localStorage.getItem('workflowos_branch_db_v1') || 'null');
        const a = (db?.activities || []).find(x => x.title === u);
        return a ? { type: a.type, duration: a.duration, direction: a.direction, hostGroup: a.hostGroup } : null;
      } catch (_) { return null; }
    }, uniqueTitle);
    console.log('[C5] 落库：', JSON.stringify(rec));
    assert.ok(rec, '高级区改选后应提交成功');
    assert.ok(String(rec.type).includes('主题党日'), '活动类型应=主题党日');
    assert.equal(rec.duration, 'long', '时长应=长期');
    assert.equal(rec.direction, 'top-down', '发起方向应=自上而下');
    assert.equal(rec.hostGroup, myGroup, '承办党小组应=组长本组');
  } finally { await browser.close(); }
});
