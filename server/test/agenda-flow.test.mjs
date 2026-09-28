// role: [工程师]+[AI]
// agenda-flow.test.mjs — 三会一课议程功能回归（T-283 方向4；原 agenda-flow-audit.mjs）
// 覆盖：①详情显示议程 ②创建活动写入议程 ③详情行内编辑议程→保存→持久化
// 自包含 server（createApp + listen(0)，与 e2e-login 同模式，避免外部 3000 连续测试卡顿）
// 运行：node --test server/test/agenda-flow.test.mjs
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { createApp } from '../app.js';
import { seedDatabase } from '../seed.js';

let server;
let BASE;
let browser; // 2026-09-23 提速批：**整个文件只 launch 一次**（原每条用例各 launch 一次，5 条 ⇒ 白付 5 次浏览器冷启）

before(async () => {
  const app = createApp({ dbPath: ':memory:' });
  await seedDatabase(app.locals.db);
  server = app.listen(0);
  BASE = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch({ headless: true });
});

after(async () => {
  if (browser) await browser.close();
  if (server) {
    server.closeAllConnections?.();
    await new Promise((r) => server.close(r));
  }
});

/** 每例一个**独立 context**（＝独立 localStorage/sessionStorage）。
 *  原写法 `browser.newPage()` 本身就是「新 context + 新 page」⇒ 这里只是把浏览器冷启提到 before，
 *  用例之间的隔离性**一字未变**（仍是每例全新存储）。 */
async function newIsolatedPage() {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.route('**://cdn.tailwindcss.com/**', (r) => r.abort());
  return { context, page };
}

async function loginAs(page, role) {
  await page.goto(`${BASE}/login.html`, { waitUntil: 'domcontentloaded' });
  await page.locator('#dev-toggle').first().check();
  await page.locator(`.login-card[data-role="${role}"]`).first().click();
  await page.waitForFunction(() => window.location.href.includes('workspace'), null, { timeout: 10000 });
  await page.waitForTimeout(800);
  return page;
}

async function gotoCalendar(page) {
  const errs = [];
  page.on('pageerror', e => errs.push(String(e).slice(0, 200)));
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0, 200)); });
  await page.click('.secretary-tab-btn[data-secretary-tab="calendar"]');
  await page.waitForSelector('#month-selector', { timeout: 10000 }).catch(async () => {
    const d = await page.evaluate(() => ({
      calBtn: !!document.querySelector('.secretary-tab-btn[data-secretary-tab="calendar"]'),
      tabContent: document.querySelector('#secretary-tab-content')?.innerHTML.slice(0, 300) || 'NO-CONTENT',
      stats: document.querySelector('#secretary-stats')?.innerText || '',
      activeTab: document.querySelector('.tab-btn-active')?.textContent || '',
    }));
    console.log('[GC-DIAG]', JSON.stringify(d), 'ERR:', errs.join(' | '));
    throw new Error('活动管理 tab 未渲染 #month-selector');
  });
}

async function setMonth(page, month) {
  await page.evaluate((m) => {
    const sel = document.getElementById('month-selector');
    sel.value = m;
    sel.dispatchEvent(new Event('change', { bubbles: true }));
  }, month);
}

// A1：三会一课活动详情显示议程（act-8 7月支部党员大会；2026-09-06 基线刷新：原 5 月批次重排至 7 月）
test('A1 活动详情显示会议议程（含主持人）', async () => {
  const { context, page } = await newIsolatedPage();
  try {
    await loginAs(page, 'secretary');
    await gotoCalendar(page);
    await setMonth(page, '2026-07');
    await page.waitForSelector('.cal-activity-item[data-act-id="act-8"]', { timeout: 10000 });
    await page.click('.cal-activity-item[data-act-id="act-8"]');
    await page.waitForSelector('#agenda-block', { timeout: 10000 });
    const text = await page.locator('#agenda-block').innerText();
    console.log(`[A1] 议程内容: ${text.replace(/\n/g, ' / ')}`);
    assert.ok(text.includes('通报 6 月支部工作情况'), '议程第1条应显示');
    assert.ok(text.includes('审议 7 月发展对象名单'), '议程第2条应显示');
    assert.ok(text.includes('民主评议党员'), '议程第3条应显示');
    assert.ok(text.includes('组织委员'), '主持人应显示');
    console.log('[A1] ✅ 详情议程显示通过');
  } finally { await context.close(); }
});

// A2：创建三会一课活动时写入议程 → 详情显示
test('A2 创建三会一课活动写入议程并显示', async () => {
  const { context, page } = await newIsolatedPage();
  try {
    await loginAs(page, 'secretary');
    await gotoCalendar(page);
    await page.click('#ws-sec-write-btn');
    await page.waitForSelector('[data-action="select-template"][data-category="three-meetings"]', { timeout: 10000 });
    await page.click('[data-action="select-template"][data-category="three-meetings"][data-subtype="party-group-meeting"]');

    const uniqueTitle = `T283议程-${Date.now().toString().slice(-5)}`;
    await page.fill('#wp-title', uniqueTitle);
    await page.fill('#wp-location', '光华1号楼203会议室');
    // 议程：填 2 条（首行初始已有 + 添加第2行）；fill 自动等待元素出现
    const a2errs = [];
    page.on('pageerror', e => a2errs.push(String(e).slice(0, 200)));
    await page.locator('.wp-agenda-item').first().fill('学习《中国共产党章程》', { timeout: 8000 }).catch(async () => {
      const d = await page.evaluate(() => {
        const modal = document.querySelector('[id^="modal-overlay-"]');
        const agList = modal?.querySelector('#wp-agenda-list');
        let manualOk = false;
        if (agList) {
          const row = document.createElement('div');
          row.innerHTML = '<input class="wp-agenda-item-test" value="手动">';
          agList.appendChild(row);
          manualOk = agList.querySelector('.wp-agenda-item-test') !== null;
        }
        return {
          modalExists: !!modal,
          agListExists: !!agList,
          agListHtml: agList ? agList.outerHTML.slice(0, 200) : null,
          wpTitleInModal: !!modal?.querySelector('#wp-title'),
          manualOk,
        };
      });
      console.log('[A2-DIAG]', JSON.stringify(d), 'ERR:', a2errs.join(' | '));
      throw new Error('议程输入行未出现');
    });
    await page.locator('.wp-agenda-host').first().fill('组长');
    await page.click('[data-action="agenda-add"]');
    await page.locator('.wp-agenda-item').nth(1).fill('讨论本月积极分子考察');
    await page.locator('.wp-agenda-host').nth(1).fill('组织委员');

    const a2cons = [];
    page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') a2cons.push(m.text().slice(0, 250)); });
    await page.click('[data-action="wp-submit"]');
    // 本位 nudge（2026-09-23 支书裁定）：**活动由党小组组长写入** ⇒ 支书台 / 副支书台以写入者身份提交时，
    //   写链前会弹「本步一般由党小组组长写入」确认；必须点主按钮「仍由我继续」才放行（不许点遮罩 / 按 Esc 关）。
    await page.click('[data-nudge-confirm]').catch(() => {});
    // 等创建完成 + 日历出现
    await page.waitForFunction(
      (u) => {
        const grid = document.querySelector('#cal-main-grid');
        return grid ? grid.innerHTML.includes(u) : false;
      },
      uniqueTitle, { timeout: 20000 },
    ).catch(async () => {
      const d = await page.evaluate((u) => {
        let stored = null;
        try { stored = JSON.parse(localStorage.getItem('workflowos_branch_db_v1') || 'null'); } catch (_) {}
        const acts = stored?.activities || [];
        return {
          storedHas: acts.some(a => a.title === u),
          storedCount: acts.length,
          modalOpen: !!document.querySelector('[id^="modal-overlay-write-activity"]'),
          submitDisabled: !!document.querySelector('[data-action="wp-submit"].opacity-50'),
          toastText: document.body.innerText.includes('写入失败') || document.body.innerText.includes('请填写'),
        };
      }, uniqueTitle);
      console.log('[A2-CREATE-DIAG]', JSON.stringify(d), 'CONSOLE:', a2cons.join(' | '), 'PAGEERR:', a2errs.join(' | '));
    });

    // 点击新活动打开详情 → 议程应显示
    const actTag = page.locator(`#cal-main-grid .cal-activity-item[title*="T283"]`);
    await actTag.first().click();
    await page.waitForSelector('#agenda-block', { timeout: 10000 });
    const text = await page.locator('#agenda-block').innerText();
    console.log(`[A2] 新活动议程: ${text.replace(/\n/g, ' / ')}`);
    assert.ok(text.includes('学习《中国共产党章程》'), '议程第1条应显示');
    assert.ok(text.includes('讨论本月积极分子考察'), '议程第2条应显示');
    console.log('[A2] ✅ 创建写入议程→详情显示通过');
  } finally { await context.close(); }
});

// A3：详情行内编辑议程 → 保存 → 更新显示 + localStorage 持久化
test('A3 详情编辑议程保存后更新并持久化', async () => {
  const { context, page } = await newIsolatedPage();
  try {
    await loginAs(page, 'secretary');
    await gotoCalendar(page);
    await setMonth(page, '2026-08');
    await page.waitForSelector('.cal-activity-item[data-act-id="act-27"]', { timeout: 10000 });
    await page.click('.cal-activity-item[data-act-id="act-27"]');
    await page.waitForSelector('#agenda-block', { timeout: 10000 });

    // 编辑：点击编辑议程 → 修改第1条 → 添加一条 → 保存
    const errs = [];
    page.on('pageerror', e => errs.push(String(e).slice(0, 160)));
    await page.evaluate(() => {
      const btn = document.getElementById('inspector-agenda-edit-btn');
      if (btn) btn.click();
    });
    await page.waitForFunction(() => !!document.querySelector('.agenda-edit-row'), null, { timeout: 8000 }).catch(async () => {
      const d = await page.evaluate(() => ({
        blockHtml: document.querySelector('#agenda-block')?.innerHTML.slice(0, 400) || 'NO-BLOCK',
        editRows: document.querySelectorAll('.agenda-edit-row').length,
      }));
      console.log('[A3-DIAG]', JSON.stringify(d), 'ERR:', errs.join('|'));
      throw new Error('议程编辑行未出现');
    });
    await page.locator('.agenda-edit-item').first().fill('修改后的议程第一条');
    await page.click('#agenda-edit-add');
    await page.locator('.agenda-edit-item').nth(3).fill('新增议程条目');
    await page.click('#agenda-edit-save');
    await page.waitForTimeout(1500);

    const text = await page.locator('#agenda-block').innerText();
    console.log(`[A3] 保存后议程: ${text.replace(/\n/g, ' / ')}`);
    assert.ok(text.includes('修改后的议程第一条'), '修改应生效');
    assert.ok(text.includes('新增议程条目'), '新增应生效');

    // 持久化验证：localStorage 中 act-27 的 agenda 已更新
    const stored = await page.evaluate(() => {
      const d = JSON.parse(localStorage.getItem('workflowos_branch_db_v1') || 'null');
      const act = d?.activities?.find(a => a.id === 'act-27');
      return act?.agenda || null;
    });
    assert.ok(stored && stored.some(a => a.item === '修改后的议程第一条'), 'localStorage 应持久化修改');
    assert.ok(stored && stored.some(a => a.item === '新增议程条目'), 'localStorage 应持久化新增');
    console.log('[A3] ✅ 详情编辑议程→保存→持久化通过');
  } finally { await context.close(); }
});

// A4（副书同权 2026-09-10 修复）：副支书可见并可用「编辑议程」入口 + 议程结果记录
// 依据 content/02_institution/SYSTEM_ROLE_PERMISSION.md:141「副书同权」；仅议程结果区/编辑界面放开。
test('A4 副支书议程编辑 / 结果记录可用（副书同权）', async () => {
  const { context, page } = await newIsolatedPage();
  try {
    await loginAs(page, 'deputy-secretary');
    await gotoCalendar(page);
    // 新建三会一课活动（议程条目经 collectAgendaRows 带 id → 结果记录按钮渲染）
    await page.click('#ws-sec-write-btn');
    await page.waitForSelector('[data-action="select-template"][data-category="three-meetings"]', { timeout: 10000 });
    await page.click('[data-action="select-template"][data-category="three-meetings"][data-subtype="party-group-meeting"]');
    const title = `副书议程-${Date.now().toString().slice(-5)}`;
    await page.fill('#wp-title', title);
    await page.fill('#wp-location', '光华1号楼203会议室');
    await page.locator('.wp-agenda-item').first().fill('副书同权议程验证');
    await page.click('[data-action="wp-submit"]');
    // 本位 nudge（2026-09-23 支书裁定）：同上（副支书写入活动亦属「一般由党小组组长写入」的例外代办）
    await page.click('[data-nudge-confirm]').catch(() => {});
    await page.waitForFunction((u) => {
      const grid = document.querySelector('#cal-main-grid');
      return grid ? grid.innerHTML.includes(u) : false;
    }, title, { timeout: 20000 });

    await page.locator(`#cal-main-grid .cal-activity-item[title*="副书议程"]`).first().click();
    await page.waitForSelector('#agenda-block', { timeout: 10000 });

    // ① 编辑议程入口可见
    assert.equal(await page.locator('#inspector-agenda-edit-btn').count(), 1, '副支书应见「编辑议程」入口');
    // ② 议程结果记录按钮可见
    const resultBtns = await page.locator('.inspector-agenda-result').count();
    assert.ok(resultBtns >= 1, `副支书应见议程结果记录按钮（实际 ${resultBtns}）`);
    // ③ 点「通过」应可记录（结果徽章出现）
    await page.locator('.inspector-agenda-result[data-agenda-result="passed"]').first().click();
    await page.waitForTimeout(1200);
    const txt = await page.locator('#agenda-block').innerText();
    assert.ok(txt.includes('通过'), '副支书应能记录议程结果');
    console.log(`[A4] editBtn=1 resultBtns=${resultBtns} ✅ 副书同权通过`);
  } finally { await context.close(); }
});

// A5（2026-09-28 批：去表决 dogfood 实报修复）：支书台「支部分工」的「去表决」应落到
//   **本次支委会活动的线上表态页**（docs/party-committee-meeting.html?id=<活动id>），
//   而不是支书台的「活动管理」tab（原 href 写成 secretary.html?activityId= ⇒ 命中支书台壳的
//   活动定位深链 workspace-shell.js::onNavTarget 固定 activate('calendar')）。同时断言该落点页
//   真的渲染出「我的表态」表决位（议题议程项带 id）——否则「去表决」到了页也没处投。
test('A5 支部分工「去表决」落到支委会会议页且表态位在位（非活动管理）', async () => {
  const { context, page } = await newIsolatedPage();
  try {
    await loginAs(page, 'secretary');
    // 支部分工 tab → 发起一条分工调整议题（= 一场支委会表决活动）
    await page.click('.secretary-tab-btn[data-secretary-tab="work-map"]');
    // R5（2026-09-28 批次 220）：分工调整工具（写侧）默认折叠 ⇒ 先展开折叠卡再进工具。
    //   ⚠ 本次只多一步「展开」（读侧看分工仍是首屏）——**判据未变、未放宽**：下方仍断言「去表决」href
    //   落到支委会会议页且在位表态，断言一字未动。
    await page.click('.wm-tool-toggle');
    await page.waitForSelector('#wf-open', { timeout: 10000 });
    await page.click('#wf-open');
    await page.waitForSelector('#wf-rows .wf-row', { timeout: 10000 });
    await page.selectOption('.wf-row .wf-module', await page.$eval('.wf-row .wf-module', (s) => s.options[0].value));
    await page.selectOption('.wf-row .wf-owner', await page.$eval('.wf-row .wf-owner', (s) => {
      const o = [...s.options].find((x) => x.value && !x.value.startsWith('none'));
      return o ? o.value : '';
    }));
    await page.click('#wf-submit');
    await page.waitForSelector('a:has-text("去表决")', { timeout: 15000 });

    const href = await page.locator('a:has-text("去表决")').first().getAttribute('href');
    console.log(`[A5] 「去表决」href = ${href}`);
    // ① 目标＝支委会会议页（带本次活动 id）
    assert.match(href, /party-committee-meeting\.html\?id=/, '「去表决」应指向支委会会议页 ?id=<活动id>');
    assert.ok(!href.includes('secretary.html?activityId='), '「去表决」不得再走支书台活动定位深链（会落到「活动管理」）');

    // ② 真机点它：落到支委会会议页
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'domcontentloaded' }).catch(() => {}),
      page.locator('a:has-text("去表决")').first().click(),
    ]);
    assert.ok(page.url().includes('/party-committee-meeting.html'), `应落到支委会会议页，实际 ${page.url()}`);
    await page.waitForSelector('.vote-panel', { timeout: 15000 });
    const tabTitle = await page.locator('h2').first().innerText();
    const voteText = await page.locator('.vote-panel').first().innerText();
    console.log(`[A5] 落地标题=${tabTitle.trim()} 表态位=${voteText.replace(/\n/g, ' ')}`);
    assert.ok(tabTitle.includes('支委会会议'), '落地页应为支委会会议页');
    assert.ok(voteText.includes('我的表态'), '落点页应渲染「我的表态」表决位（议题议程项须带 id）');
    console.log('[A5] ✅ 去表决落点与表态位通过');
  } finally { await context.close(); }
});
