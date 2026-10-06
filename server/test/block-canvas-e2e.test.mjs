// server/test/block-canvas-e2e.test.mjs — 块画布 v0 E2E（2026-09-03）
// 支书在「工作台配置」停用「宣传」产出块 → 保存 → 组长(罗文杰 p1)活动详情
// 「添加记录」按钮组不再含 publicity；恢复默认后回归。
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

function blockRoutes(page) {
  return [
    page.route('**://fonts.googleapis.com/**', (r) => r.abort()),
    page.route('**://fonts.gstatic.com/**', (r) => r.abort()),
    page.route('**://cdn.tailwindcss.com/**', (r) => r.abort()),
  ];
}
async function login(page, sid) {
  await page.goto(`${base}/login.html`, { waitUntil: 'domcontentloaded' });
  await page.fill('#student-id', sid);
  await page.fill('#password', '123456');
  await page.click('button[type="submit"]');
}

async function addBtnTypes(page) {
  return page.evaluate(() =>
    [...document.querySelectorAll('.act-sub-add-btn')].map(b => b.dataset.type)
  );
}

async function openActivityDetail(page) {
  // 切到「本组活动」tab（leader 台默认待办；活动列表与子记录写口在 `write-tab.js` 渲染）。
  // ⚠ 2026-10-05 批次 386 改准（陈旧断言）：原按「**首个**含『活动』的 tab」点击 ⇒ `#10` 改版后该位被
  //   「活动日历」占据（`.leader-act-item` 实际只由「本组活动」渲染）⇒ 旧写法恒超时。
  //   取证：把我的改动 stash 掉（退回旧代码）仍复现同一 30s 超时 ⇒ 与本批无关、系 `#10` 改版遗留。
  await page.waitForFunction(() => document.querySelector('.leader-tab-btn'), { timeout: 10000 });
  await page.evaluate(() => {
    const btn = [...document.querySelectorAll('.leader-tab-btn')].find(b => b.textContent.includes('本组活动'));
    if (btn) btn.click();
  });
  await page.waitForFunction(() => document.querySelector('.leader-act-item'), { timeout: 10000 });
  await page.evaluate(() => document.querySelector('.leader-act-item')?.click());
  await page.waitForFunction(() => document.querySelectorAll('.act-sub-add-btn').length > 0, { timeout: 8000 });
}

test('产出块：支书停用宣传 → 组长活动详情无 publicity 按钮 → 恢复默认回归（D7：考勤/考察子记录只读）', async () => {
  // ① 支书登录 → 经服务层写 config.blocks（停用 publicity；写路径已由 module-config HTTP 单测覆盖）
  const sec = await browser.newPage();
  blockRoutes(sec);
  await login(sec, '2300010001');
  await sec.waitForURL('**/workspace/secretary.html', { timeout: 10000 });
  // P0-2 形态断言（2026-09-23 支书裁定「形态必须可断言」）：本文件真机用例必须在 API 形态下跑
  await sec.waitForFunction(async () => (await import('/src/data/data-adapter.js?v=20261006b')).getRuntimeMode().source === 'api', null, { timeout: 20000 });
  await sec.evaluate(async () => {
    const { updateBranchBlocks } = await import('/src/services/branch/branch.js?v=20261006b');
    await updateBranchBlocks('br-b1', { outputBlocks: { hiddenBlockIds: ['publicity'], blockOrder: [] } });
  });
  await new Promise((r) => setTimeout(r, 1200));

  // ② 组长 p1 登录 leader.html → 活动 tab → 打开活动详情 → 断言无 publicity 添加按钮
  const lead = await browser.newPage();
  blockRoutes(lead);
  await login(lead, '2400012345');
  await lead.waitForURL('**/workspace/leader.html', { timeout: 10000 });
  await openActivityDetail(lead);
  const types = await addBtnTypes(lead);
  // D7 裁决批二（2026-09-08）：考勤/考察子记录只读化（无 + 添加/删除，双写口消除——
  // 统一走「考勤管理」「考察管理」页；专班详情只读化先例同款），仅宣传/材料保留写口。
  assert.ok(!types.includes('publicity'), '宣传块已隐藏');
  assert.ok(types.includes('materials'), '材料块保留添加');
  assert.ok(!types.includes('attendance') && !types.includes('inspection'), '考勤/考察已只读（无添加按钮）');
  const roHint = await lead.evaluate(() => document.body.textContent.includes('考勤请到「考勤管理」录入'));
  assert.ok(roHint, '考勤只读引导文案可见（去「考勤管理」录入）');

  // ③ 支书恢复默认（产出块=null）→ 组长刷新详情 → publicity 回归（考勤/考察仍只读）
  await sec.evaluate(async () => {
    const { updateBranchBlocks } = await import('/src/services/branch/branch.js?v=20261006b');
    await updateBranchBlocks('br-b1', null);
  });
  await new Promise((r) => setTimeout(r, 1000));
  await lead.reload({ waitUntil: 'domcontentloaded' });
  await lead.waitForURL('**/workspace/leader.html', { timeout: 10000 });
  await openActivityDetail(lead);
  const back = await addBtnTypes(lead);
  assert.ok(back.includes('publicity'), '恢复默认后宣传块回归');
  assert.ok(back.includes('materials'), '材料块保留添加');
  assert.ok(!back.includes('attendance') && !back.includes('inspection'), '考勤/考察仍只读（无添加按钮）');

  await lead.close();
  await sec.close();
});
