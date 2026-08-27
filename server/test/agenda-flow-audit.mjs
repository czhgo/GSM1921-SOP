// role: [工程师]+[AI]
// agenda-flow-audit.mjs — 三会一课议程功能回归（T-283 方向4）
// 覆盖：①详情显示议程 ②创建活动写入议程 ③详情行内编辑议程→保存→持久化
// 自包含 server（createApp + listen(0)，与 e2e-login 同模式，避免外部 3000 连续测试卡顿）
// 运行：node --test server/test/agenda-flow-audit.mjs
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { createApp } from '../app.js';
import { seedDatabase } from '../seed.js';

let server;
let BASE;

before(async () => {
  const app = createApp({ dbPath: ':memory:' });
  await seedDatabase(app.locals.db);
  server = app.listen(0);
  BASE = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  if (server) {
    server.closeAllConnections?.();
    await new Promise((r) => server.close(r));
  }
});

async function loginAs(browser, role) {
  const page = await browser.newPage();
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

// A1：三会一课活动详情显示议程（act-8 5月支部党员大会）
test('A1 活动详情显示会议议程（含主持人）', async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await loginAs(browser, 'secretary');
    await gotoCalendar(page);
    await setMonth(page, '2026-05');
    await page.waitForSelector('.cal-activity-item[data-act-id="act-8"]', { timeout: 10000 });
    await page.click('.cal-activity-item[data-act-id="act-8"]');
    await page.waitForSelector('#agenda-block', { timeout: 10000 });
    const text = await page.locator('#agenda-block').innerText();
    console.log(`[A1] 议程内容: ${text.replace(/\n/g, ' / ')}`);
    assert.ok(text.includes('通报 4 月支部工作情况'), '议程第1条应显示');
    assert.ok(text.includes('审议 5 月发展对象名单'), '议程第2条应显示');
    assert.ok(text.includes('民主评议党员'), '议程第3条应显示');
    assert.ok(text.includes('组织委员'), '主持人应显示');
    console.log('[A1] ✅ 详情议程显示通过');
  } finally { await browser.close(); }
});

// A2：创建三会一课活动时写入议程 → 详情显示
test('A2 创建三会一课活动写入议程并显示', async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await loginAs(browser, 'secretary');
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
  } finally { await browser.close(); }
});

// A3：详情行内编辑议程 → 保存 → 更新显示 + localStorage 持久化
test('A3 详情编辑议程保存后更新并持久化', async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await loginAs(browser, 'secretary');
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
  } finally { await browser.close(); }
});
