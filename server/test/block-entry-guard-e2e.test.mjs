// server/test/block-entry-guard-e2e.test.mjs — L3 S4 工作流块入口守卫 E2E
// ①（2026-09-03）支部停用 theme-party-day（config.blocks.workflowBlocks）→ 支书台写入面板 Step1 主题党日模板卡
//    消失 + 停用提示 → 恢复默认 → 模板卡回归（默认态与既有行为完全一致）。
// ②（2026-09-28 批次 248，块清单铺开）三会一课四场景各有块（blockId ＝ 场景 id）——停用某块 ⇒ **该场景的模板
//    按钮消失**（同判据）＋ 停用提示点名；恢复默认 ⇒ 回归。
// 自包含：createApp(:memory:) + seedDatabase + 账号密码登录 + API 配置写口。

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
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

async function apiLogin(personId) {
  const res = await fetch(`${base}/api/v1/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ personId }),
  });
  assert.equal(res.status, 200);
  return (await res.json()).token;
}
async function patchBlocks(token, blocks) {
  const res = await fetch(`${base}/api/v1/branches/br-b1/config`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ config: { blocks } }),
  });
  assert.equal(res.status, 200);
  return res.json();
}
async function newPage() {
  const page = await browser.newPage();
  await page.route('**://fonts.googleapis.com/**', (r) => r.abort());
  await page.route('**://fonts.gstatic.com/**', (r) => r.abort());
  await page.route('**://cdn.tailwindcss.com/**', (r) => r.abort());
  return page;
}
async function openWriteStep1(page) {
  await page.goto(`${base}/login.html`, { waitUntil: 'domcontentloaded' });
  await page.fill('#student-id', '2300010001');
  await page.fill('#password', '123456');
  await Promise.all([
    page.waitForURL('**/workspace/secretary.html', { timeout: 10000 }),
    page.click('button[type="submit"]'),
  ]);
  await page.waitForFunction(() => [...document.querySelectorAll('.secretary-tab-btn')].some(b => b.textContent.includes('活动')), null, { timeout: 12000 });
  // P0-2 形态断言（2026-09-23 支书裁定「形态必须可断言」）：本文件真机用例必须在 API 形态下跑
  await page.waitForFunction(async () => (await import('/src/data/data-adapter.js?v=20261004k')).getRuntimeMode().source === 'api', null, { timeout: 20000 });
  await page.evaluate(() => [...document.querySelectorAll('.secretary-tab-btn')].find(b => b.textContent.includes('活动'))?.click());
  await page.waitForFunction(() => document.getElementById('ws-sec-write-btn'), null, { timeout: 10000 });
  await page.evaluate(() => document.getElementById('ws-sec-write-btn')?.click());
  await page.waitForFunction(() => document.body.textContent.includes('选择活动模板'), null, { timeout: 8000 });
}

test('S4 主题党日块入口守卫：停用 → Step1 模板卡消失 → 恢复默认回归', async () => {
  const staffToken = await apiLogin('p_pc');

  // ① 基线：默认主题党日模板卡（data-tpl-click="1"）存在
  const page1 = await newPage();
  try {
    await openWriteStep1(page1);
    assert.ok(await page1.evaluate(() => !!document.querySelector('[data-tpl-click="1"]')), '默认主题党日模板卡存在');
  } finally { await page1.close(); }

  // ② 支部停用 theme-party-day → 支书台模板卡消失 + 停用提示
  await patchBlocks(staffToken, {
    outputBlocks: { hiddenBlockIds: [], blockOrder: [] },
    workflowBlocks: { hiddenBlockIds: ['theme-party-day'] },
  });
  const page2 = await newPage();
  try {
    await openWriteStep1(page2);
    const hasThemeCard = await page2.evaluate(() => !!document.querySelector('[data-tpl-click="1"]'));
    assert.equal(hasThemeCard, false, '停用后主题党日模板卡消失');
    const hasNotice = await page2.evaluate(() => document.body.textContent.includes('工作流块「主题党日组织块」已由支部配置停用'));
    assert.equal(hasNotice, true, '显示停用提示');
    const hasThreeMeetings = await page2.evaluate(() => document.body.textContent.includes('三会一课'));
    assert.equal(hasThreeMeetings, true, '三会一课模板不受影响（无对应块守卫）');
  } finally { await page2.close(); }

  // ③ 恢复默认 → 主题党日模板卡回归
  await patchBlocks(staffToken, null);
  const page3 = await newPage();
  try {
    await openWriteStep1(page3);
    assert.ok(await page3.evaluate(() => !!document.querySelector('[data-tpl-click="1"]')), '恢复默认后主题党日模板卡回归');
  } finally { await page3.close(); }

  console.log('[S4] 主题党日块入口守卫: 停用→模板消失+提示 → 恢复→回归 闭环通过');
});

/** 读 Step1 里三会一课四个子类按钮（空值＝主题党日那张唯一按钮，滤掉） */
async function readThreeMeetingSubtypes(page) {
  return page.evaluate(() => [...document.querySelectorAll('button[data-subtype]')]
    .map((b) => b.dataset.subtype).filter(Boolean));
}

test('S4+ 三会一课块入口守卫（2026-09-28 批次 248）：停用「党课块」→ 该场景模板按钮消失 → 恢复回归', async () => {
  const staffToken = await apiLogin('p_pc');

  // ① 基线：四个三会一课子类按钮都在
  const p1 = await newPage();
  try {
    await openWriteStep1(p1);
    assert.deepEqual((await readThreeMeetingSubtypes(p1)).sort(),
      ['branch-committee', 'branch-party-meeting', 'party-group-meeting', 'party-lecture'],
      '默认四个三会一课子类都在');
  } finally { await p1.close(); }

  // ② 支部停用 party-lecture（党课块）→ 只有该场景的按钮消失 + 提示点名它
  await patchBlocks(staffToken, {
    outputBlocks: { hiddenBlockIds: [], blockOrder: [] },
    workflowBlocks: { hiddenBlockIds: ['party-lecture'] },
  });
  const p2 = await newPage();
  try {
    await openWriteStep1(p2);
    const subs = await readThreeMeetingSubtypes(p2);
    assert.equal(subs.includes('party-lecture'), false, '停用后「党课」模板按钮消失');
    assert.equal(subs.length, 3, '其余三会一课子类不受影响');
    const notice = await p2.evaluate(() => document.body.textContent.includes('工作流块「党课块」已由支部配置停用'));
    assert.equal(notice, true, '停用提示点名「党课块」');
  } finally { await p2.close(); }

  // ③ 恢复默认 → 党课按钮回归
  await patchBlocks(staffToken, null);
  const p3 = await newPage();
  try {
    await openWriteStep1(p3);
    assert.equal((await readThreeMeetingSubtypes(p3)).includes('party-lecture'), true, '恢复默认后「党课」按钮回归');
  } finally { await p3.close(); }

  console.log('[S4+] 三会一课块入口守卫: 停用党课块→按钮消失+点名提示 → 恢复→回归 闭环通过');
});

test('S4++ 三会一课四块全停用（2026-09-29 批次 249）：子类按钮全消失 ＋ 空态文案 ＋ 提示逐块点名 → 恢复回归', async () => {
  const staffToken = await apiLogin('p_pc');
  const ALL4 = ['branch-party-meeting', 'branch-committee', 'party-group-meeting', 'party-lecture'];

  await patchBlocks(staffToken, {
    outputBlocks: { hiddenBlockIds: [], blockOrder: [] },
    workflowBlocks: { hiddenBlockIds: ALL4 },
  });
  const p1 = await newPage();
  try {
    await openWriteStep1(p1);
    assert.deepEqual(await readThreeMeetingSubtypes(p1), [], '四块全停用后三会一课子类按钮**全消失**');
    const txt = await p1.evaluate(() => document.body.textContent);
    assert.ok(txt.includes('本类目下的工作流块均已由支部配置停用。'), '显示「本类目全停用」空态文案');
    // 逐块点名（`<块名>块` 只出现在停用提示句里 ⇒ 可精确断言提示覆盖了全部四块）
    ['支部党员大会块', '支委会块', '党小组会块', '党课块'].forEach((n) => {
      assert.ok(txt.includes(n), `停用提示应点名「${n}」`);
    });
  } finally { await p1.close(); }

  // 恢复默认 → 四块按钮全回归
  await patchBlocks(staffToken, null);
  const p2 = await newPage();
  try {
    await openWriteStep1(p2);
    assert.deepEqual((await readThreeMeetingSubtypes(p2)).sort(), [...ALL4].sort(), '恢复默认后四个子类全部回归');
  } finally { await p2.close(); }

  console.log('[S4++] 三会一课块全停用: 四按钮全消失+空态+逐块点名 → 恢复→四块回归 闭环通过');
});

// ════════════════════════════════════════════════════════════════
//  S4 声明面：表单元数据单一源——**真机断言**（2026-09-29 批次 252）
// ════════════════════════════════════════════════════════════════
//  病灶（本批实测）：契约 §六 S2 行明写「存活验收 ＝ **S4 表单元数据单一源 E2E**」，
//    而全仓 grep 该判据 **0 处实现** ⇒ 属「**声明的验收没落地**」（`D-441`：凡自称已实现须与实测相符）。
//  判据（真机可观测 ＋ 反证，防「其实是硬编码」）：
//    ① 主题党日 Step2 标题字段**渲染出 manifest 声明的 hint**（`如：学习两会精神主题党日`）；
//    ② **反证**：该字符串**不得出现在写面板源码**里（全仓只有 `manifests.js` 与契约示例有）⇒ ① 只能来自 manifest；
//    ③ **对照**：三会一课 Step2 **不出现**该 hint（⇒ 单一源只对主题党日块生效，其余模板维持原样）。
const CALENDAR_TAB_SRC = fileURLToPath(new URL('../../docs/src/entries/tabs/secretary/calendar-tab.js', import.meta.url));
const MANIFEST_HINT = '如：学习两会精神主题党日';

test('S4 表单元数据单一源（真机）：主题党日标题 hint 来自 manifest ＋ 反证不硬编码 ＋ 三会一课对照无', async () => {
  const staffToken = await apiLogin('p_pc');
  await patchBlocks(staffToken, null); // 默认全开（守卫前置：块停用会让模板卡消失、选不到模板）

  // ② 反证（先做，纯文件读，快）：该 hint 不得硬编码在写面板源码里
  const src = readFileSync(CALENDAR_TAB_SRC, 'utf8');
  assert.equal(src.includes(MANIFEST_HINT), false,
    `hint「${MANIFEST_HINT}」不得硬编码在 calendar-tab.js —— 若在此硬编码，① 的「来自 manifest」就不成立（判据失效）`);

  // ① 主题党日 Step2：标题字段的 label/hint 来自 manifest（hint 探针＝该声明值）
  const p1 = await newPage();
  try {
    await openWriteStep1(p1);
    await p1.click('button[data-action="select-template"][data-scenario-id="theme-party"]');
    await p1.waitForFunction(() => !!document.getElementById('wp-title'), null, { timeout: 8000 });
    const themeFormText = await p1.evaluate(() => document.getElementById('wp-title').closest('div').textContent);
    assert.ok(themeFormText.includes(MANIFEST_HINT), '主题党日 Step2 标题字段应渲染 manifest 声明的 hint');
  } finally { await p1.close(); }

  // ③ 对照：三会一课（党课）Step2 的标题字段**不含**该 hint（其余模板维持原样）
  const p2 = await newPage();
  try {
    await openWriteStep1(p2);
    await p2.click('button[data-action="select-template"][data-subtype="party-lecture"]');
    await p2.waitForFunction(() => !!document.getElementById('wp-title'), null, { timeout: 8000 });
    const lectureFormText = await p2.evaluate(() => document.getElementById('wp-title').closest('div').textContent);
    assert.equal(lectureFormText.includes(MANIFEST_HINT), false, '三会一课标题字段不应出现主题党日块的 hint（对照）');
  } finally { await p2.close(); }

  console.log('[S4] 表单元数据单一源（真机）: 主题党日 hint 来自 manifest ＋ 源码反证 ＋ 三会一课对照 通过');
});
