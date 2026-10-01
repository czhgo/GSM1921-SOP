// server/test/write-grant-prompt-e2e.test.mjs — 「写入未赋权」软提示定向真机件
// （2026-10-01 批次 326 立 · 支书裁定 `SOP-G-2-①` ＝ **乙：软提示**）
//
// **立据**：母本《常见工作场景快速指南》「**写入活动时同时指定该次活动的组织者**——指定即完成该次
//   活动的赋权」。系统此前**无任何前置提示**（`REVIEW_QUEUE` 的 `SOP-G-2-①`：只派生赋权待办、
//   不拦也不提醒）⇒ 支书 2026-10-01 裁**乙**：提交写入时若该活动 / 专班**尚无赋权**，**弹一次确认、
//   但可继续提交**（**不是硬门** —— 母本未禁止「先写后补指定」）。
//
// **本件给的是双向证据**（不是「跑绿了」就算）：
//   ① **正例**：写入人**未指定组织者**（内嵌赋权名单为空）⇒ 提交前那一窗**含「尚未指定组织者」一段**，
//      且点主按钮后**写入真的落库**（软提示＝不阻断写入）；
//   ② **反例**：**已指定组织者**（经「+ 加入名单」）⇒ 同一窗**不含**该段——证明它是**条件渲染**、
//      不是恒显（否则用户会当噪音，且这条判据本身无区分度）；
//   ③ **不连弹两窗**：写入人不是本位（支书）时本段**折进「本位」nudge 那一窗** ⇒ 全程
//      **确认类浮窗只出现一个**（`#modal-overlay-nudge-activity-write` 或 `#modal-overlay-write-without-grant`
//      恰有其一，且绝不同时出现两个）。
//
// 自包含：createApp(:memory:) + seedDatabase + 真登录（支书 2300010001 / 123456）。
// 运行：node --test --test-concurrency=1 test/write-grant-prompt-e2e.test.mjs（需 DISABLE_PASSWORD_CHECK=1）

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

/** 确认类浮窗的两个可能 id（折进 nudge / 独立软提示）——本件只认这两个 */
const CONFIRM_IDS = ['modal-overlay-nudge-activity-write', 'modal-overlay-write-without-grant'];

async function login(page) {
  await page.route('**://fonts.googleapis.com/**', (r) => r.abort());
  await page.route('**://fonts.gstatic.com/**', (r) => r.abort());
  await page.route('**://cdn.tailwindcss.com/**', (r) => r.abort());
  await page.goto(`${base}/login.html`, { waitUntil: 'domcontentloaded' });
  await page.fill('#student-id', '2300010001');
  await page.fill('#password', '123456');
  await Promise.all([
    page.waitForURL('**/workspace/secretary.html', { timeout: 12000 }),
    page.click('button[type="submit"]'),
  ]);
}

/** 打开「写入活动」悬浮表单并停在第 2 步（表单就位） */
async function openWriteForm(page) {
  await page.click('.secretary-tab-btn[data-secretary-tab="calendar"]');
  await page.waitForSelector('#ws-sec-write-btn', { timeout: 10000 });
  await page.click('#ws-sec-write-btn');
  await page.waitForSelector('[data-action="select-template"]', { timeout: 10000 });
  await page.click('[data-action="select-template"][data-category="three-meetings"][data-subtype="party-group-meeting"]');
  await page.waitForSelector('#wp-title', { timeout: 10000 });
  await page.waitForSelector('#wp-auth-slot', { timeout: 10000 });
}

/** 填入必填并提交（返回「确认类浮窗」实测快照） */
async function submitAndProbeConfirm(page, title) {
  await page.fill('#wp-title', title);
  await page.fill('#wp-location', '光华1号楼203会议室');
  await page.click('[data-action="wp-submit"]');
  // 等确认类浮窗出现（两个可能 id 之一）
  await page.waitForFunction((ids) => ids.some((id) => !!document.getElementById(id)), CONFIRM_IDS, { timeout: 15000 });
  return page.evaluate((ids) => {
    const present = ids.filter((id) => !!document.getElementById(id));
    return {
      present,
      text: present.map((id) => (document.getElementById(id).textContent || '')).join(' '),
      // 写入表单自身的浮窗也在，故只对「确认类」计数
      confirmCount: present.length,
    };
  }, CONFIRM_IDS);
}

test('S12 写入活动未赋权：软提示出现且可继续（正例）· 已赋权则不提示（反例）· 与「本位」nudge 不连弹两窗', async () => {
  const page = await browser.newPage();
  try {
    await login(page);

    // ── 正例：未指定组织者 ──────────────────────────────────────────
    await openWriteForm(page);
    const titleA = `未赋权软提示-${Date.now().toString().slice(-5)}`;
    const probeA = await submitAndProbeConfirm(page, titleA);
    assert.equal(probeA.confirmCount, 1,
      `确认类浮窗应恰有 1 个（不连弹两窗），实测 ${JSON.stringify(probeA.present)}`);
    assert.ok(probeA.present.includes('modal-overlay-nudge-activity-write'),
      `写入人是支书（非本位）⇒ 应折进「本位」nudge 那一窗，实测 ${JSON.stringify(probeA.present)}`);
    assert.ok(probeA.text.includes('尚未指定组织者'),
      `未指定组织者时该窗应含「尚未指定组织者」一段，实测正文：${probeA.text.slice(0, 200)}`);

    // 点主按钮 ⇒ 软提示**不阻断**：写入必须真的落库（日历出现该标题）
    await page.click('[data-nudge-confirm]');
    await page.waitForFunction((u) => {
      const grid = document.querySelector('#cal-main-grid');
      return !!grid && grid.innerHTML.includes(u);
    }, titleA, { timeout: 20000 }).catch(async () => {
      const stored = await page.evaluate((u) => {
        let db = null;
        try { db = JSON.parse(localStorage.getItem('workflowos_branch_db_v1') || 'null'); } catch (_) { /* 忽略 */ }
        return (db?.activities || []).some((a) => a.title === u);
      }, titleA);
      assert.fail(`软提示点确认后写入应落库，实测未落库（${titleA}）`);
    });

    // ── 反例：已指定组织者 ⇒ 同一窗不含该段 ─────────────────────────
    await openWriteForm(page);
    // 经「+ 加入名单」指定一名组织者（角色取第一个 radio ＝ 组织者）
    await page.check('input[name="wp-auth-role"]');
    await page.click('#wp-auth-slot .person-picker-trigger');
    await page.waitForSelector('.person-picker-item', { timeout: 8000 });
    await page.click('.person-picker-item');
    // 单选取人后面板可能**自动收起**（也可能仍开着）⇒ 关闭动作取「有则点、无则跳过」，
    //   不用 `page.click`（后者在元素不在时会 timeout 判红，属测试写法问题而非产品问题）
    await page.evaluate(() => document.querySelector('.person-picker-close-btn')?.click());
    await page.waitForTimeout(300);
    await page.click('[data-action="wp-auth-add"]');
    await page.waitForSelector('#wp-auth-list [data-wp-auth-del]', { timeout: 8000 });

    const titleB = `已赋权不提示-${Date.now().toString().slice(-5)}`;
    const probeB = await submitAndProbeConfirm(page, titleB);
    assert.equal(probeB.confirmCount, 1,
      `确认类浮窗应恰有 1 个（不连弹两窗），实测 ${JSON.stringify(probeB.present)}`);
    assert.ok(!probeB.text.includes('尚未指定组织者'),
      `已指定组织者时该窗**不得**含「尚未指定组织者」一段（条件渲染判据），实测正文：${probeB.text.slice(0, 200)}`);

    await page.click('[data-nudge-confirm]');
    await page.waitForFunction((u) => {
      const grid = document.querySelector('#cal-main-grid');
      return !!grid && grid.innerHTML.includes(u);
    }, titleB, { timeout: 20000 });
  } finally {
    await page.close();
  }
});
