// server/test/list-filter-chip-e2e.test.mjs — 筛选形态定向真机件（2026-10-01 立，2026-10-20 改准）
//
// **沿革**：2026-10-01 支书裁定「筛选器请全面移除，可以用 span 这样的小胶囊」，引擎因此支持
//   `facetStyle: 'chip'`（逐页 opt-in），首批迁移＝人才库 · 成员名册。
// **2026-10-20 第三轮 IA 判例⑤ 改准**：名册 4 组 ≈20 枚胶囊把表格推下首屏 ⇒ **人维表一律回到
//   dropdown**（搜索 + 三个下拉）；chip 只留给「取值 ≤3 且需快速切换」的极小维度（成员流动的方向）。
//   原断言「名册 / 人才库必须是 chip」与现行裁定相抵，故本件改为守新边界：
//     ① 人维表（成员名册 / 人才库）→ 分面下拉 `.lf-select`、**零**分面胶囊；
//     ② 引擎仍保留 chip 分支（供极小维度 opt-in，不得因改准而删能力）；
//     ③ 下拉真的在筛：改一个 select → 计数位由「共 N 人」变「筛选出 M / N 人」。
//
// 自包含：createApp(:memory:) + seedDatabase + 真登录（组织委员 2400012355 / 123456）。

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
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

/** 组织委员登录（页头 tab 形态的既有账号）→ 直达组织台指定 tab（深链） */
async function openOrgTab(page, tab) {
  await page.goto(`${base}/login.html`, { waitUntil: 'domcontentloaded' });
  await page.fill('#student-id', '2400012355');
  await page.fill('#password', '123456');
  await Promise.all([
    page.waitForURL('**/workspace/org.html', { timeout: 12000 }),
    page.click('button[type="submit"]'),
  ]);
  await page.goto(`${base}/workspace/org.html?tab=${tab}`, { waitUntil: 'domcontentloaded' });
  // 等统一引擎把检索条渲染出来（宽表才渲染；本支部在册 20+ 人 ⇒ 必渲染）
  await page.waitForFunction(() => !!document.querySelector('.lf-bar'), null, { timeout: 15000 });
}

test('S11 人维表筛选形态：名册＝1 搜索 + 3 下拉、零胶囊；下拉真在筛', async () => {
  // ① 成员名册：搜索 + 党小组 / 发展阶段 / 在册状态 三个下拉，不得再有 4 组 chip
  const p1 = await newPage();
  try {
    await openOrgTab(p1, 'roster');
    const roster = await p1.evaluate(() => ({
      chips: document.querySelectorAll('.lf-facet-chips .chip-option').length,
      chipGroups: document.querySelectorAll('.lf-facet-chips').length,
      selects: document.querySelectorAll('.lf-select').length,
      triggers: document.querySelectorAll('.cs-trigger').length,
      search: document.querySelectorAll('.lf-kw').length,
    }));
    assert.equal(roster.chips, 0, `成员名册已改下拉 ⇒ 不得再有分面胶囊（实得 ${roster.chips} 枚）`);
    assert.equal(roster.chipGroups, 0, '成员名册不得再有 .lf-facet-chips 组');
    assert.equal(roster.selects, 3, `成员名册应恰有 3 个分面下拉（党小组 / 发展阶段 / 在册状态），实得 ${roster.selects}`);
    assert.equal(roster.triggers, 3, '三个原生下拉都应被增强为 .cs-trigger');
    assert.equal(roster.search, 1, '成员名册应恰有 1 个搜索框（姓名 / 学号）');
  } finally { await p1.close(); }

  // ② 人才库（同属人维表）：同样回到下拉
  const p2 = await newPage();
  try {
    await openOrgTab(p2, 'talent');
    const talent = await p2.evaluate(() => ({
      chips: document.querySelectorAll('.lf-facet-chips .chip-option').length,
      selects: document.querySelectorAll('.lf-select').length,
    }));
    assert.equal(talent.chips, 0, '人才库已改下拉 ⇒ 不得再有分面胶囊');
    assert.ok(talent.selects > 0, '人才库应渲染分面下拉');
    // 2026-10-01 批次 321（支书 V-10 取「乙：整页并入人才库」）：「活动参与汇总」卡须已并入本页
    assert.ok(await p2.evaluate(() => !!document.getElementById('org-part-list')),
      '人才库页须含「活动参与汇总」（原「发展数据」的该卡已并入本页）');
  } finally { await p2.close(); }

  // ③ 下拉真的在筛：改一个 select → 计数位由「共 N 人」变「筛选出 M / N 人」
  const p3 = await newPage();
  try {
    await openOrgTab(p3, 'roster');
    const before = await p3.evaluate(() => document.querySelector('.lf-count')?.textContent || '');
    assert.match(before, /^共\s*\d+/, `未筛时计数位应为「共 N 人」，实得「${before}」`);
    const changed = await p3.evaluate(() => {
      const sel = [...document.querySelectorAll('.lf-select')]
        .find((s) => [...s.options].some((o) => o.value));
      if (!sel) return null;
      const value = [...sel.options].find((o) => o.value)?.value || '';
      sel.value = value;
      sel.dispatchEvent(new Event('change', { bubbles: true }));
      return { key: sel.dataset.facet, value };
    });
    assert.ok(changed, '成员名册须至少有一个带取值的分面下拉');
    await p3.waitForFunction(() => /^筛选出/.test(document.querySelector('.lf-count')?.textContent || ''), null, { timeout: 8000 });
    const after = await p3.evaluate(() => document.querySelector('.lf-count')?.textContent || '');
    assert.match(after, /^筛选出\s*\d+\s*\/\s*\d+/, `选下拉后计数位应为「筛选出 M / N」，实得「${after}」`);
  } finally { await p3.close(); }
});

test('S12 引擎仍保留 chip 分支（极小维度可 opt-in，不因改准删能力）', () => {
  const ROOT = join(import.meta.dirname, '..', '..');
  const engine = readFileSync(join(ROOT, 'docs', 'src', 'components', 'ui', 'list-filter.js'), 'utf8');
  assert.match(engine, /if \(facetStyle === 'chip'\)/, '引擎 chip 分支须保留');
  assert.match(engine, /\.filter\(f => f\.options\.length > 1\)/, '空维度自动隐藏的契约须保留');
  assert.match(engine, /facetStyle \|\| 'dropdown'/, '默认形态仍须是 dropdown');
  // 现存唯一合法 chip 用法：成员流动「方向」（2 值 + 全部 = 3 枚）
  const flow = readFileSync(join(ROOT, 'docs', 'src', 'entries', 'tabs', 'org', 'member-flow-tab.js'), 'utf8');
  assert.match(flow, /facetStyle: 'chip'/, '成员流动方向筛选仍是 chip 的正面样本');
});
