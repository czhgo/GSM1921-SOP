// server/test/block-config-ui-e2e.test.mjs — L3 S3 支部「工作流块」配置区 E2E（回炉 v3，对齐换组织向导，2026-09-09）
// 党委组织员登录 →「支部配置」tab（换组织向导 embed）→ 步骤②「模块/块组合」→ 目标支部 br-b1
// → 断言工作流块 manifest 目录 chips（含制度来源标签）
// → 停用 theme-party-day（data-wz-chip="wblock"）→ 保存本步 → reload 重进持久化（置灰）→ 恢复默认回归。
// 现行 UI 事实：原 [data-pc-wblock]/#pc-save/#pc-reset 已并入向导步骤②；
//   wblock chips = data-wz-chip="wblock" data-id=<manifest blockId>，标签=块名 · 制度来源
//   （主题党日组织块·通用制度 / 专班运行块·支部自创）；停用态=class opacity-45；
//   写口=PATCH /branches/:id/config（config.blocks.workflowBlocks.hiddenBlockIds）。
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
async function loginParty(page) {
  await page.goto(`${base}/login.html`, { waitUntil: 'domcontentloaded' });
  await page.fill('#student-id', '9000000001');
  await page.fill('#password', '123456');
  await Promise.all([
    page.waitForURL('**/workspace/party-committee.html', { timeout: 10000 }),
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
  await page.waitForSelector('#pc-wizard-host', { timeout: 15000 });
  await page.waitForSelector('#wz-branch-select', { timeout: 15000 });
  await page.selectOption('#wz-branch-select', 'br-b1');
  await page.waitForFunction(() => document.querySelector('#wz-branch-select')?.value === 'br-b1', null, { timeout: 8000 });
  await page.waitForSelector('[data-wz-step]', { timeout: 10000 });
  for (let i = 0; i < 4; i++) {
    if (await page.$('[data-wz-chip="wblock"]')) break;
    const next = await page.$('[data-wz-act="next"]');
    if (!next) break;
    await next.click();
    await page.waitForTimeout(250);
  }
  await page.waitForSelector('[data-wz-chip="wblock"]', { timeout: 10000 });
}

/** 读取工作流块 chips 目录态（id/label/dimmed） */
async function wblockChips(page) {
  return page.evaluate(() => [...document.querySelectorAll('[data-wz-chip="wblock"]')].map(b => ({
    id: b.dataset.id,
    label: b.textContent.trim(),
    dimmed: b.classList.contains('opacity-45'),
  })));
}
/** 等向导保存的 config PATCH 落库（确定性闭环） */
function configPatchPromise(page) {
  return page.waitForResponse(
    (r) => r.url().includes('/api/v1/branches/br-b1/config') && r.request().method() === 'PATCH',
    { timeout: 15000 },
  );
}

test('S3 工作流块配置区：manifest 目录呈现 → 停用保存 → 重进持久化 → 恢复默认', async () => {
  const party = await newPage();
  try {
    await loginParty(party);
    await gotoWizardStep2(party);

    // ① 工作流块 chips 呈现（manifest 目录 + 制度来源标签；默认全开无置灰）
    let chips = await wblockChips(party);
    assert.ok(chips.some(c => c.id === 'theme-party-day'), '主题党日块 chip 呈现');
    assert.ok(chips.some(c => c.id === 'taskforce-run'), '专班块 chip 呈现');
    const themeChip = chips.find(c => c.id === 'theme-party-day');
    const tfChip = chips.find(c => c.id === 'taskforce-run');
    assert.ok(themeChip.label.includes('主题党日组织块') && themeChip.label.includes('通用制度'),
      `主题党日标注「通用制度」，实际：${themeChip.label}`);
    assert.ok(tfChip.label.includes('支部自创'), `专班块标注「支部自创」，实际：${tfChip.label}`);
    assert.equal(chips.every(c => !c.dimmed), true, '默认全开（无置灰）');

    // ② 停用 theme-party-day → 保存本步
    await party.click('[data-wz-chip="wblock"][data-id="theme-party-day"]');
    const save1 = configPatchPromise(party);
    await party.click('[data-wz-act="save-step"][data-step="2"]');
    await save1;
    await party.waitForFunction(() => {
      const b = document.querySelector('[data-wz-chip="wblock"][data-id="theme-party-day"]');
      return b && b.classList.contains('opacity-45');
    }, null, { timeout: 8000 });

    // ③ 重进配置页（reload，自服务端重读）→ theme-party-day 置灰（持久化）
    await party.reload({ waitUntil: 'domcontentloaded' });
    await gotoWizardStep2(party);
    chips = await wblockChips(party);
    assert.equal(chips.find(c => c.id === 'theme-party-day')?.dimmed, true, '停用持久化：重进后置灰');
    assert.equal(chips.find(c => c.id === 'taskforce-run')?.dimmed, false, '专班块保持启用');

    // ④ 恢复默认（全开）→ reload 重进回归
    party.once('dialog', (d) => d.accept());
    const resetResp = configPatchPromise(party);
    await party.click('[data-wz-act="reset-modules"]');
    await resetResp;
    await party.reload({ waitUntil: 'domcontentloaded' });
    await gotoWizardStep2(party);
    const afterReset = await wblockChips(party);
    assert.equal(afterReset.length > 0 && afterReset.every(c => !c.dimmed), true, '恢复默认后工作流块全开');

    console.log('[S3] 工作流块配置区: chips 呈现 + 停用持久化 + 恢复默认 闭环通过');
  } finally {
    await party.close();
  }
});
