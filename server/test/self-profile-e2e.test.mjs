// server/test/self-profile-e2e.test.mjs — 成员「**自我描述**」**本人自助填写**定向真机件
// （2026-10-05 批次 401 · `D-788` / `V-10b`：支书圈「**落点＝扩 people.js**」＋「**本人可填 ＋ 支委层代录**」）
//
// **本件给的是正面证据**（不是「跑绿了」就算）：
//   ① 本人（无 `?id=` ⇒ `isSelf`）在自己的档案页**有**「填写我的自我描述」入口；
//   ② 打开的是**模态**（`person-edit-modal`），且 `selfOnly` ⇒ **只有**自我描述控件、**没有**「姓名」等档案控件；
//   ③ 填「专业」＋子表（`班团 | 计算机 2401 | 团支书`）提交 ⇒ 模态关闭；**再次打开**（走应用自己的读链）
//      值仍在 ⇒ 证明**落库 → 读回**闭环（非只改内存）。
//
// 自包含：createApp(:memory:) + seedDatabase + 真登录（普通成员 p1 ＝ 学号 2400012345 / 123456）。

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

test('P1 本人自助填「自我描述」：入口在 · 模态只出该组 · 填后落库并可读回', async () => {
  const page = await browser.newPage();
  // 与既有真机件同规：拦掉三个 CDN（离线可跑）
  await page.route('**://fonts.googleapis.com/**', (r) => r.abort());
  await page.route('**://fonts.gstatic.com/**', (r) => r.abort());
  await page.route('**://cdn.tailwindcss.com/**', (r) => r.abort());
  try {
    // ① 真登录（普通成员 p1；账号＝学号）
    await page.goto(`${base}/login.html`, { waitUntil: 'domcontentloaded' });
    await page.fill('#student-id', '2400012345');
    await page.fill('#password', '123456');
    await Promise.all([
      page.waitForURL('**/workspace/**', { timeout: 12000 }),
      page.click('button[type="submit"]'),
    ]);

    // ② 自己的档案页（无 `?id=` ⇒ isSelf）→ 应有「填写我的自我描述」入口
    await page.goto(`${base}/person.html`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#person-self-profile-btn', { timeout: 15000 });

    // ③ 打开模态：只出「自我描述」一组（无「姓名」等档案控件）
    await page.click('#person-self-profile-btn');
    await page.waitForSelector('#person-edit-modal-form', { timeout: 8000 });
    const shape = await page.evaluate(() => {
      const f = document.querySelector('#person-edit-modal-form');
      return {
        hasMajor: !!f.querySelector('[data-field="selfProfile.major"]'),
        hasStudentWorks: !!f.querySelector('[data-field="selfProfile.studentWorks"]'),
        hasName: !!f.querySelector('[data-field="name"]'),
        modalText: (document.querySelector('#person-edit-modal')?.textContent || '').slice(0, 40),
      };
    });
    assert.ok(shape.hasMajor && shape.hasStudentWorks, '模态须含「专业」与「担任的学生工作」两控件');
    assert.ok(!shape.hasName, '本人自填（selfOnly）不得出「姓名」等档案控件（其余档案字段归支委层）');

    // ④ 填写并提交
    await page.fill('[data-field="selfProfile.major"]', '计算机科学与技术');
    await page.fill('[data-field="selfProfile.studentWorks"]', '班团 | 计算机 2401 | 团支书');
    await page.click('#person-edit-modal-form button[type="submit"]');
    await page.waitForSelector('#person-edit-modal-form', { state: 'detached', timeout: 10000 });

    // ⑤ 再次打开（走应用自己的读链）⇒ 值仍在（落库 → 读回闭环）
    await page.click('#person-self-profile-btn');
    await page.waitForSelector('#person-edit-modal-form', { timeout: 8000 });
    const back = await page.evaluate(() => {
      const f = document.querySelector('#person-edit-modal-form');
      return {
        major: f.querySelector('[data-field="selfProfile.major"]')?.value ?? '',
        works: f.querySelector('[data-field="selfProfile.studentWorks"]')?.value ?? '',
      };
    });
    assert.equal(back.major, '计算机科学与技术', '「专业」须落库并可读回');
    assert.ok(back.works.includes('班团') && back.works.includes('团支书'), '子表须以「| 分隔、每行一条」的单一源格式落库并读回');
  } finally {
    await page.close();
  }
});

test('P2 组织委员批量导入「自我描述」：粘贴 → 解析预览 → 确认 → 逐人落库可读回', async () => {
  const page = await browser.newPage();
  await page.route('**://fonts.googleapis.com/**', (r) => r.abort());
  await page.route('**://fonts.gstatic.com/**', (r) => r.abort());
  await page.route('**://cdn.tailwindcss.com/**', (r) => r.abort());
  try {
    // ① 真登录：组织委员 p11（学号 2400012355 / 123456）
    await page.goto(`${base}/login.html`, { waitUntil: 'domcontentloaded' });
    await page.fill('#student-id', '2400012355');
    await page.fill('#password', '123456');
    await Promise.all([
      page.waitForURL('**/workspace/**', { timeout: 12000 }),
      page.click('button[type="submit"]'),
    ]);

    // ② 组织台「成员名册」tab（深链 ?tab=roster）⇒ 导入区在位、名单已渲染
    await page.goto(`${base}/workspace/org.html?tab=roster`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#roster-sp-import-card', { timeout: 15000 });
    await page.waitForSelector('.roster-edit[data-person-id="p3"]', { timeout: 15000 });

    // ③ 变前基线：p3「专业」尚空（证明后面的非空确系导入所致，排除「本来就有」）
    await page.click('.roster-edit[data-person-id="p3"]');
    await page.waitForSelector('#person-edit-modal-form', { timeout: 8000 });
    const before = await page.evaluate(() =>
      document.querySelector('#person-edit-modal-form [data-field="selfProfile.major"]')?.value ?? null);
    assert.equal(before, '', '变前 p3 的「专业」应为空');
    await page.click('button[data-modal-cancel="person-edit-modal"]');
    await page.waitForSelector('#person-edit-modal-form', { state: 'detached', timeout: 8000 });

    // ④ 展开导入区 → 粘贴问卷表格（含表头行；制表符分隔）→ 解析预览
    await page.click('#roster-sp-toggle');
    await page.waitForSelector('#roster-sp-panel:not(.hidden)', { timeout: 5000 });
    const sheet = [
      ['姓名', '学号', '您的专业', '您是否参加过志愿服务', '您的累计志愿服务时长大致为:', '您担任什么学生工作？:职务'].join('\t'),
      ['何晓峰', '2400012347', '软件工程', '是', '88 小时', '学习委员'].join('\t'),
    ].join('\n');
    await page.fill('#roster-sp-text', sheet);
    await page.click('#roster-sp-parse');
    await page.waitForSelector('#roster-sp-confirm', { timeout: 8000 });
    const stat = await page.evaluate(() => document.querySelector('#roster-sp-status')?.textContent || '');
    assert.ok(/可导入\s*1/.test(stat), `预览须报「可导入 1」；实得「${stat}」`);
    const confirmLabel = await page.evaluate(() => document.querySelector('#roster-sp-confirm')?.textContent?.trim() || '');
    assert.ok(confirmLabel.includes('确认导入 1 条'), `确认按钮文案须带条数；实得「${confirmLabel}」`);

    // ⑤ 确认导入 → 整页刷新（预览区随草稿清空、面板回到收起）
    await page.click('#roster-sp-confirm');
    await page.waitForFunction(() => {
      const el = document.querySelector('#roster-sp-preview');
      return !el || el.innerHTML.trim() === '';
    }, { timeout: 10000 });
    await page.waitForSelector('.roster-edit[data-person-id="p3"]', { timeout: 15000 });

    // ⑥ 读回（走应用自己的读链）：p3 档案模态里「专业 / 志愿服务时长 / 学生工作」应更新
    await page.click('.roster-edit[data-person-id="p3"]');
    await page.waitForSelector('#person-edit-modal-form', { timeout: 8000 });
    const after = await page.evaluate(() => {
      const f = document.querySelector('#person-edit-modal-form');
      return {
        major: f.querySelector('[data-field="selfProfile.major"]')?.value ?? '',
        hours: f.querySelector('[data-field="selfProfile.volunteerHours"]')?.value ?? '',
        works: f.querySelector('[data-field="selfProfile.studentWorks"]')?.value ?? '',
      };
    });
    assert.equal(after.major, '软件工程', '导入的「专业」须落库并可读回');
    assert.equal(after.hours, '88 小时', '导入的「志愿服务时长」须落库并可读回');
    assert.ok(after.works.includes('学习委员'), '导入的子表（学生工作·职务）须落库并可读回');
  } finally {
    await page.close();
  }
});
