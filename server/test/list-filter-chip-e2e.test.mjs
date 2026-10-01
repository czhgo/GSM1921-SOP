// server/test/list-filter-chip-e2e.test.mjs — 筛选行「chip 形态」定向真机件（2026-10-01 批次 319 立）
//
// **立据**：支书 2026-10-01 裁定（乙部 `V-12`）「这个筛选器请全面移除。我 prefer div 这种格式。
//   但是可以用 span 这样的小胶囊。搜索 姓名/学号/角色 即可」，同时裁「**具体问题一定要具体分析**」
//   ⇒ 统一引擎 `ui/list-filter.js` 新增 `facetStyle` 两形态（`dropdown` 默认 / `chip` 逐页 opt-in），
//   **首批迁移页＝人才库 · 成员名册**。**推翻**原「筛选行禁用 chip」（2026-09-14 批次 27）。
//
// **本件给的是正面证据**（不是「跑绿了」就算）：
//   ① 两首批页在真机上**确实渲染** `.lf-facet-chips .chip-option`，且同页**不再有**分面下拉 `.lf-select`；
//   ② **未迁移页**（发展数据）**不得**出现分面胶囊——证明这是**逐页 opt-in**，不是被悄悄全站改掉；
//   ③ 点一枚胶囊 → **选中态落上 `.chip-accent-on`** 且结果计数随之变化（胶囊真的在筛，不只是画出来的）。
//
// 自包含：createApp(:memory:) + seedDatabase + 真登录（组织委员 2400012355 / 123456）。

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

/** 组织委员登录（页头 tab 形态的既有账号）→ 直达组织台指定 tab（深链，见 form-loop-registry 同款用法） */
async function openOrgTab(page, tab) {
  await page.goto(`${base}/login.html`, { waitUntil: 'domcontentloaded' });
  await page.fill('#student-id', '2400012355');
  await page.fill('#password', '123456');
  await Promise.all([
    page.waitForURL('**/workspace/org.html', { timeout: 12000 }),
    page.click('button[type="submit"]'),
  ]);
  await page.goto(`${base}/workspace/org.html?tab=${tab}`, { waitUntil: 'domcontentloaded' });
  // 等统一引擎把检索条渲染出来（宽表才渲染；本支部在册 20+ 人 ⇒ 两页必渲染）
  await page.waitForFunction(() => !!document.querySelector('.lf-bar'), null, { timeout: 15000 });
}

test('S11 筛选行 chip 形态：首批两页渲染胶囊且无下拉；未迁移页无胶囊；点胶囊即筛', async () => {
  // ① 成员名册（首批迁移）
  const p1 = await newPage();
  try {
    await openOrgTab(p1, 'roster');
    const roster = await p1.evaluate(() => ({
      chips: document.querySelectorAll('.lf-facet-chips .chip-option').length,
      selects: document.querySelectorAll('.lf-select').length,
      groups: document.querySelectorAll('.lf-facet-chips').length,
    }));
    assert.ok(roster.chips > 1, `成员名册须渲染分面胶囊（实得 ${roster.chips} 枚）——chip 形态未生效？`);
    assert.ok(roster.groups >= 1, '成员名册须有 .lf-facet-chips 组');
    assert.equal(roster.selects, 0, '成员名册已迁 chip ⇒ 不得再有分面下拉 .lf-select');
  } finally { await p1.close(); }

  // ① 人才库（首批迁移）
  const p2 = await newPage();
  try {
    await openOrgTab(p2, 'talent');
    const talent = await p2.evaluate(() => ({
      chips: document.querySelectorAll('.lf-facet-chips .chip-option').length,
      selects: document.querySelectorAll('.lf-select').length,
    }));
    assert.ok(talent.chips > 1, `人才库须渲染分面胶囊（实得 ${talent.chips} 枚）`);
    assert.equal(talent.selects, 0, '人才库已迁 chip ⇒ 不得再有分面下拉');
  } finally { await p2.close(); }

  // ② 未迁移页（发展数据）：**不得**出现胶囊——证明是逐页 opt-in，不是全站被改
  const p3 = await newPage();
  try {
    await openOrgTab(p3, 'development');
    const dev = await p3.evaluate(() => ({
      chips: document.querySelectorAll('.lf-facet-chips .chip-option').length,
      selects: document.querySelectorAll('.lf-select').length,
    }));
    assert.equal(dev.chips, 0, '发展数据**未迁** ⇒ 不得出现分面胶囊（否则＝被悄悄全站改掉）');
    assert.ok(dev.selects > 0, `发展数据未迁 ⇒ 应仍是分面下拉（实得 ${dev.selects} 个）`);
  } finally { await p3.close(); }

  // ③ 点胶囊真的在筛：选中态落到 .chip-accent-on，且**结果计数位**由「共 N 人」变「筛选出 M / N 人」
  const p4 = await newPage();
  try {
    await openOrgTab(p4, 'roster');
    const before = await p4.evaluate(() => document.querySelector('.lf-count')?.textContent || '');
    assert.match(before, /^共\s*\d+/, `未筛时计数位应为「共 N 人」，实得「${before}」`);
    const clicked = await p4.evaluate(() => {
      const chip = [...document.querySelectorAll('.lf-facet-chips .chip-option')]
        .find((c) => c.dataset.value);           // 跳过「全部」，取第一个有取值的胶囊
      if (!chip) return null;
      chip.click();
      return { key: chip.dataset.facet, value: chip.dataset.value };
    });
    assert.ok(clicked, '成员名册须至少有一枚带取值的分面胶囊可点');
    await p4.waitForFunction(({ key, value }) => {
      const on = [...document.querySelectorAll(`.lf-facet-chips .chip-option[data-facet="${key}"]`)]
        .filter((c) => c.classList.contains('chip-accent-on'));
      return on.length === 1 && on[0].dataset.value === value;
    }, clicked, { timeout: 8000 });
    // 计数位是**引擎自己的**状态显示位（`role="status"`）⇒ 它变了，即「胶囊真的把筛选落了」
    await p4.waitForFunction(() => /^筛选出/.test(document.querySelector('.lf-count')?.textContent || ''), null, { timeout: 8000 });
    const after = await p4.evaluate(() => document.querySelector('.lf-count')?.textContent || '');
    assert.match(after, /^筛选出\s*\d+\s*\/\s*\d+/, `点胶囊后计数位应为「筛选出 M / N」，实得「${after}」`);
  } finally { await p4.close(); }
});
