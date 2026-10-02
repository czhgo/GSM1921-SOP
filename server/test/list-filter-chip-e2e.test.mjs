// server/test/list-filter-chip-e2e.test.mjs — 筛选行「chip 形态」定向真机件（2026-10-01 批次 319 立）
//
// **立据**：支书 2026-10-01 裁定（乙部 `V-12`）「这个筛选器请全面移除。我 prefer div 这种格式。
//   但是可以用 span 这样的小胶囊。搜索 姓名/学号/角色 即可」，同时裁「**具体问题一定要具体分析**」
//   ⇒ 统一引擎 `ui/list-filter.js` 新增 `facetStyle` 两形态（`dropdown` 默认 / `chip` 逐页 opt-in），
//   **首批迁移页＝人才库 · 成员名册**。**推翻**原「筛选行禁用 chip」（2026-09-14 批次 27）。
//
// **判据已收敛（2026-10-02 批次 332 · 余下各页逐页迁移）**：**人维表（`personFacets`，值集小且稳定）
//   → chip**；**活动类表（`activityFacets`，含月份 / 类别 / 类型 / 状态等长值集）→ 保持 dropdown**
//   （flat 成墙反而不如一次展开）。本件 ① 取人维表页、② 取活动类表页，正是这条线两侧的样本。
//
// **本件给的是正面证据**（不是「跑绿了」就算）：
//   ① 人维表页在真机上**确实渲染** `.lf-facet-chips .chip-option`，且同页**不再有**分面下拉 `.lf-select`；
//   ② **活动类表页**（成员台「我的考察」）**不得**出现分面胶囊——证明这条线**没有被越界套用**；
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

/** 成员登录（`p5` 宋佳宁，正式党员）→ 直达成员台指定 tab（后批新增：用于「保持 dropdown」的反向样本） */
async function openVisitorTab(page, tab) {
  await page.goto(`${base}/login.html`, { waitUntil: 'domcontentloaded' });
  await page.fill('#student-id', '2400012349');
  await page.fill('#password', '123456');
  await Promise.all([
    page.waitForURL('**/workspace/visitor.html', { timeout: 12000 }),
    page.click('button[type="submit"]'),
  ]);
  await page.goto(`${base}/workspace/visitor.html?tab=${tab}`, { waitUntil: 'domcontentloaded' });
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
    // 2026-10-01 批次 321（支书 V-10 取「乙：整页并入人才库」）：「活动参与汇总」卡须已并入本页
    //   （原「发展数据」页签已摘除）——这是「整页并入」落地的**正面证据**。
    assert.ok(await p2.evaluate(() => !!document.getElementById('org-part-list')),
      '人才库页须含「活动参与汇总」（原「发展数据」的该卡已并入本页）');
  } finally { await p2.close(); }

  // ② **保持 dropdown 的对照页**（批次 332 改样本）：**活动类表**按判据**不迁** chip——
  //   反样本改用**成员台「我的考察」**（`visitor/inspection-tab` 用 `activityFacets()`：月份 / 类别 / 类型 / 状态，
  //   值集长 ⇒ 平铺成墙）⇒ 该页**不得**出现分面胶囊。**这才是「逐页 opt-in」的干净证据**：
  //   原样本「考察上传」是人维表、按新判据**已迁** chip（旧样本失效）。
  //   ⚠ 与原样本同款边界：检索条是否渲染取决于行数、且维度取值 ≤1 种时自动隐藏 ⇒ 不断言 `.lf-select` 个数。
  const p3 = await newPage();
  try {
    await openVisitorTab(p3, 'inspection');
    const act = await p3.evaluate(() => ({
      chips: document.querySelectorAll('.lf-facet-chips .chip-option').length,
      groups: document.querySelectorAll('.lf-facet-chips').length,
      bar: !!document.querySelector('.lf-bar'),
    }));
    assert.equal(act.chips, 0, '活动类表**不迁** ⇒ 不得出现分面胶囊（否则＝判据被越界套用）');
    assert.equal(act.groups, 0, '活动类表**不迁** ⇒ 不得出现 `.lf-facet-chips` 组');
    assert.ok(act.bar === true || act.bar === false, 'bar 取值须为布尔（防止选择器失效被静默吞掉）');
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
