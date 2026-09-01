// role: [工程师]+[AI]
// agenda-closure.test.mjs — 核心闭环端到端（TDD 红）：议程类型 → 记录通过 → 支部文件自动归档 → 资料查询展示
// 链路：书记创建三会一课活动（议程行选「讨论文件」类型 + 选择会前草案）
//       → 详情页议程「记录通过」→ 草案自动归档 → 资料查询（search.html）展示「已归档」
// 运行：node --test server/test/agenda-closure.test.mjs
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

const ACCOUNTS = { secretary: { id: '2300010001', pwd: '123456' }, 'org-commissioner': { id: '2400012355', pwd: '123456' } };

// 账号密码登录（API 模式：草案/活动从后端读取；dev 卡片登录走 mock 数据源，看不到后端草案）
async function loginAs(browser, role) {
  const acc = ACCOUNTS[role];
  const page = await browser.newPage();
  await page.goto(`${BASE}/login.html`, { waitUntil: 'domcontentloaded' });
  await page.fill('#student-id', acc.id);
  await page.fill('#password', acc.pwd);
  await Promise.all([
    page.waitForFunction(() => window.location.href.includes('workspace'), null, { timeout: 15000 }),
    page.click('#login-form button[type="submit"]'),
  ]);
  await page.waitForTimeout(1200);
  return page;
}

async function apiLogin(personId) {
  const r = await fetch(`${BASE}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ personId }),
  });
  assert.equal(r.status, 200);
  return (await r.json()).token;
}

async function api(token, path, method = 'GET', body) {
  return fetch(`${BASE}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
}

test('核心闭环：议程讨论文件类型 → 记录通过 → 自动归档 → 资料查询展示', async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    // ── 前置：以支委身份写入一份「会前草案」支部文件（draft）──
    const secToken = await apiLogin('p13');
    const docResp = await api(secToken, '/api/v1/branchDocs', 'POST', {
      title: `闭环点验草案-${Date.now().toString().slice(-5)}`,
      desc: '核心闭环端到端点验用会前草案',
      cat: 'party-doc',
      status: 'draft',
      uploadedBy: 'p13',
      uploadedAt: new Date().toISOString(),
    });
    assert.equal(docResp.status, 201);
    const draftDoc = await docResp.json();
    assert.equal(draftDoc.status, 'draft');

    // ── 书记登录 → 活动管理 → 创建三会一课活动 ──
    const page = await loginAs(browser, 'secretary');
    await page.click('.secretary-tab-btn[data-secretary-tab="calendar"]');
    await page.waitForSelector('#month-selector', { timeout: 10000 });
    await page.click('#ws-sec-write-btn');
    await page.waitForSelector('[data-action="select-template"][data-category="three-meetings"]', { timeout: 10000 });
    await page.click('[data-action="select-template"][data-category="three-meetings"][data-subtype="party-group-meeting"]');

    const uniqueTitle = `闭环议程-${Date.now().toString().slice(-5)}`;
    await page.fill('#wp-title', uniqueTitle);
    await page.fill('#wp-location', '光华1号楼203会议室');

    // ── 议程行：填议题 → 点「讨论文件」类型 → 选择会前草案 ──
    await page.locator('.wp-agenda-item').first().fill('审议支部工作计划文件');
    await page.click('[data-kind="discussion-file"]');
    await page.waitForSelector('.wp-agenda-doc', { timeout: 8000 });
    await page.selectOption('.wp-agenda-doc', draftDoc.id);

    await page.click('[data-action="wp-submit"]');
    // 等创建完成（日历出现新活动标题）
    await page.waitForFunction(
      (u) => {
        const grid = document.querySelector('#cal-main-grid');
        return grid ? grid.innerHTML.includes(u) : false;
      },
      uniqueTitle, { timeout: 20000 },
    );

    // ── 打开详情 → 议程应带类型徽章与「记录通过」按钮 ──
    await page.locator(`#cal-main-grid .cal-activity-item[title*="${uniqueTitle}"]`).first().click();
    await page.waitForSelector('#agenda-block', { timeout: 10000 });
    const blockText = await page.locator('#agenda-block').innerText();
    assert.ok(blockText.includes('审议支部工作计划文件'), '议程议题应显示');
    assert.ok(blockText.includes('讨论文件'), '议程应显示讨论文件类型徽章');
    assert.ok(blockText.includes('闭环点验草案'), '议程应显示所选草案标题');

    // 记录通过
    await page.click('[data-agenda-result="passed"]');
    await page.waitForTimeout(1500);
    const afterText = await page.locator('#agenda-block').innerText();
    assert.ok(afterText.includes('已通过'), '记录通过后应显示结果');

    // ── API 断言：草案已自动归档（archived + 讨论来源回填）──
    const docsResp = await api(secToken, '/api/v1/branchDocs');
    assert.equal(docsResp.status, 200);
    const docs = await docsResp.json();
    const archivedDoc = docs.find((d) => d.id === draftDoc.id);
    assert.equal(archivedDoc.status, 'archived', '通过后草案应归档');
    assert.ok(archivedDoc.discussionActivityId, '应回填讨论活动');
    assert.ok(archivedDoc.discussionAgendaItemId, '应回填讨论议程');

    console.log('[CLOSURE] ✅ 议程类型 → 记录通过 → 自动归档 通过');
  } finally { await browser.close(); }
});
