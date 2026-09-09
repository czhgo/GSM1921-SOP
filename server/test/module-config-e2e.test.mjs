// server/test/module-config-e2e.test.mjs — 支部模块停用 E2E（回炉 v3，对齐换组织向导，2026-09-09）
// 党委组织员(p_pc)登录党委工作台 →「支部配置」tab（换组织向导 embed，步骤②「模块/块组合」）
// → 目标支部 br-b1 → 停用「活动管理」(calendar) 业务模块 → 保存本步（即时生效 + 留痕）
// → 书记(p13)工作台「活动管理」tab 消失、核心组「待办」仍固定
// → 党委台「恢复默认（全开）」→ 书记台刷新「活动管理」回归。
// 现行 UI 事实：原 #pc-branch-select/[data-pc-module]/#pc-save/#pc-reset 已并入向导；
//   业务模块 chips = data-wz-chip="module" data-id=<secretary 工作台 tab id>；
//   保存/恢复默认 = data-wz-act="save-step" data-step="2" / data-wz-act="reset-modules"。
// 自包含：createApp(:memory:) + seedDatabase + 账号密码登录。

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { createApp } from '../app.js';
import { seedDatabase } from '../seed.js';

let server, base, browser;

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
async function login(page, sid, urlPart) {
  await page.goto(`${base}/login.html`, { waitUntil: 'domcontentloaded' });
  await page.fill('#student-id', sid);
  await page.fill('#password', '123456');
  await Promise.all([
    page.waitForURL(`**/workspace/${urlPart}.html`, { timeout: 10000 }),
    page.click('button[type="submit"]'),
  ]);
}
async function clickTab(page, sel, text) {
  await page.waitForFunction(({ s, t }) => {
    const b = [...document.querySelectorAll(s)].find(x => x.textContent.includes(t));
    return b && b.isConnected;
  }, { s: sel, t: text }, { timeout: 12000 });
  await page.evaluate(({ s, t }) => {
    [...document.querySelectorAll(s)].find(b => b.textContent.includes(t))?.click();
  }, { s: sel, t: text });
}

/** 进党委台「支部配置」tab → 换组织向导步骤②「模块/块组合」（目标支部 br-b1） */
async function gotoWizardStep2(page) {
  await clickTab(page, '.ws-tab-scroll button', '支部配置');
  // 向导挂载点（#pc-wizard-host）；党委组织员可切目标支部（#wz-branch-select）
  await page.waitForSelector('#pc-wizard-host', { timeout: 15000 });
  await page.waitForSelector('#wz-branch-select', { timeout: 15000 });
  await page.selectOption('#wz-branch-select', 'br-b1');
  await page.waitForFunction(() => document.querySelector('#wz-branch-select')?.value === 'br-b1', null, { timeout: 8000 });
  // 不在步骤②则「下一步」前进（草稿恢复可能在②，直接跳过）
  await page.waitForSelector('[data-wz-step]', { timeout: 10000 });
  for (let i = 0; i < 4; i++) {
    if (await page.$('[data-wz-chip="module"][data-id="calendar"]')) break;
    const next = await page.$('[data-wz-act="next"]');
    if (!next) break;
    await next.click();
    await page.waitForTimeout(250);
  }
  await page.waitForSelector('[data-wz-chip="module"][data-id="calendar"]', { timeout: 10000 });
}

/** chip 是否置灰（停用态 = class opacity-45） */
function chipState(page, kind, id) {
  return page.evaluate(({ kind, id }) => {
    const b = document.querySelector(`[data-wz-chip="${kind}"][data-id="${id}"]`);
    if (!b) return null;
    return { label: b.textContent.trim(), dimmed: b.classList.contains('opacity-45') };
  }, { kind, id });
}

/** 等向导「保存本步/恢复默认」的 config PATCH 落库（确定性闭环） */
function configPatchPromise(page) {
  return page.waitForResponse(
    (r) => r.url().includes('/api/v1/branches/br-b1/config') && r.request().method() === 'PATCH',
    { timeout: 15000 },
  );
}

async function secretaryTabLabels(page) {
  return page.evaluate(() => [...document.querySelectorAll('.secretary-tab-btn')].map(b => b.textContent.trim()));
}
async function waitSecretaryTab(page, label) {
  await page.waitForFunction((l) => [...document.querySelectorAll('.secretary-tab-btn')].some(b => b.textContent.includes(l)), label, { timeout: 15000 });
}
async function waitNoSecretaryTab(page, label) {
  await page.waitForFunction((l) => {
    const btns = [...document.querySelectorAll('.secretary-tab-btn')];
    return btns.length > 0 && !btns.some(b => b.textContent.includes(l));
  }, label, { timeout: 15000 });
}

test('党委「支部配置」向导：停用业务模块 → 书记台消失（核心组仍在）→ 恢复默认回归', async () => {
  const party = await newPage();
  try {
    // ① 党委登录 → 支部配置（换组织向导）→ 步骤② 业务模块 chips（br-b1 默认全开）
    await login(party, '9000000001', 'party-committee');
    await gotoWizardStep2(party);
    const calOn = await chipState(party, 'module', 'calendar');
    assert.equal(calOn?.dimmed, false, '默认「活动管理」模块开启（不置灰）');
    assert.ok(calOn?.label.includes('活动管理'), `chips 展示模块名，实际：${calOn?.label}`);
    // 核心组（工作台页签）固定不可关：不应出现 core 可点 chip（today/todo/overview）
    const coreChip = await party.$('[data-wz-chip="module"][data-id="today"]');
    assert.equal(coreChip, null, '核心组「今天」非业务模块 chip（固定不可关）');

    // ② 停用「活动管理」(calendar) → 保存本步（PATCH /branches/br-b1/config）
    await party.click('[data-wz-chip="module"][data-id="calendar"]');
    const save1 = configPatchPromise(party);
    await party.click('[data-wz-act="save-step"][data-step="2"]');
    await save1;
    await party.waitForFunction(() => {
      const b = document.querySelector('[data-wz-chip="module"][data-id="calendar"]');
      return b && b.classList.contains('opacity-45');
    }, null, { timeout: 8000 });

    // ③ 书记(p13)登录书记台 →「活动管理」tab 消失、核心组「待办」仍固定（跨会话 = 服务端已持久化）
    const sec = await newPage();
    await login(sec, '2300010001', 'secretary');
    await waitNoSecretaryTab(sec, '活动管理');
    let labels = await secretaryTabLabels(sec);
    assert.ok(!labels.includes('活动管理'), `停用后书记台无活动管理，实际：${labels.join('/')}`);
    assert.ok(labels.includes('待办'), '核心待办仍固定');
    await sec.close();

    // ④ 党委台重进（reload）→ 停用态持久化（置灰仍读自服务端）
    await party.reload({ waitUntil: 'domcontentloaded' });
    await gotoWizardStep2(party);
    assert.equal((await chipState(party, 'module', 'calendar'))?.dimmed, true, '重进配置页：活动管理仍停用（持久化）');

    // ⑤ 恢复默认（全开）→ 书记台刷新「活动管理」回归
    party.once('dialog', (d) => d.accept());
    const resetResp = configPatchPromise(party);
    await party.click('[data-wz-act="reset-modules"]');
    await resetResp;
    await party.waitForFunction(() => {
      const b = document.querySelector('[data-wz-chip="module"][data-id="calendar"]');
      return b && !b.classList.contains('opacity-45');
    }, null, { timeout: 8000 });

    const sec2 = await newPage();
    await login(sec2, '2300010001', 'secretary');
    await waitSecretaryTab(sec2, '活动管理');
    labels = await secretaryTabLabels(sec2);
    assert.ok(labels.includes('活动管理'), `恢复默认后活动管理回归，实际：${labels.join('/')}`);
    await sec2.close();

    console.log('[module-config] 停用「活动管理」→ 书记台消失/核心组在 → 恢复默认回归 闭环通过');
  } finally {
    await party.close();
  }
});
