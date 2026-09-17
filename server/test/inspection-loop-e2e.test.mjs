// server/test/inspection-loop-e2e.test.mjs — 考察上传「闭环」守卫（2026-09-14 批次 32）
// 病根（支书实报「考察上传没有填写考察的框，点提交却说必须填写考察内容」）：
//   PersonPicker 多选模式点选即刻改选中集并刷新触发器徽标（用户据此认为已选好），
//   但 onSelect 原先只在点「确认选择」时触发 → 依赖回调渲染的「逐人考察内容」输入行从不出现，
//   提交校验又按 getSelected() 取人 → 「请填写 X 的考察内容」而框根本不存在（状态与载体失配）。
// 本测试用真 Chromium 走两条路径并断言闭环：
//   ① 点选 2 人 → 直接关面板（不点确认）→ 逐人填写框必须已在位（病灶断言：修复前为 0）；
//   ② 填了内容后回去改选（加选 1 人）→ 已填内容不得被清空（保态断言）；
//   ③ 填完提交 → 成功提示 + 明细表新增对应条数。
// 运行：node --test server/test/inspection-loop-e2e.test.mjs（需 DISABLE_PASSWORD_CHECK=1，同其它 e2e）
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

async function loginAs(sid, ws) {
  const page = await browser.newPage();
  await page.route('**://fonts.googleapis.com/**', (r) => r.abort());
  await page.route('**://fonts.gstatic.com/**', (r) => r.abort());
  await page.route('**://cdn.tailwindcss.com/**', (r) => r.abort());
  await page.goto(`${base}/login.html`, { waitUntil: 'domcontentloaded' });
  await page.fill('#student-id', sid);
  await page.fill('#password', '123456');
  await Promise.all([
    page.waitForURL(`**/workspace/${ws}.html`, { timeout: 15000 }),
    page.click('button[type="submit"]'),
  ]);
  await page.waitForFunction(() => document.querySelectorAll('button[role="tab"]').length > 0, { timeout: 20000 });
  await page.evaluate((label) => {
    const b = [...document.querySelectorAll('button[role="tab"]')].find((x) => x.textContent.includes(label));
    b?.click();
  }, '考察上传');
  await page.waitForFunction(() => document.querySelector('button[role="tab"].tab-btn-active'), { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(800);
  return page;
}

const countTextareas = (page, prefix) => page.evaluate(
  (p) => document.querySelectorAll(`textarea[id^="${p}-content-"]`).length, prefix);
const textareaValues = (page, prefix) => page.evaluate(
  (p) => [...document.querySelectorAll(`textarea[id^="${p}-content-"]`)].map((t) => t.value), prefix);

// 明细总数读取：引擎内置分页（批次 34）后，tbody 只渲染当页；故优先读翻页行/计数行的「共 N 条」，
// 无分页控件（≤1 页）时才退回数行。
const READ_TOTAL = () => {
  const m = document.querySelector('#insp-list-host .lf-pager .lf-count');
  if (m) return parseFloat((m.textContent.match(/共 (\d+)/) || [])[1]);
  const c = document.querySelector('#insp-list-host .lf-count');
  if (c && /共 \d+/.test(c.textContent)) return parseFloat((c.textContent.match(/共 (\d+)/) || [])[1]);
  return document.querySelectorAll('#insp-list-host tbody tr').length;
};

test('组长台·考察上传：点选后「关面板即已选」也必须出现逐人填写框；改选不丢已填内容；提交落库', async () => {
  const page = await loginAs('2400012345', 'leader');
  try {
    await page.evaluate(() => document.getElementById('btn-leader-upload-insp')?.click());
    await page.waitForFunction(() => !!document.getElementById('insp-form-panel'), { timeout: 8000 });

    // 来源：活动 + 第一个可用活动
    await page.selectOption('#insp-source-type', 'activity');
    await page.waitForTimeout(300);
    const srcId = await page.evaluate(() => [...document.querySelectorAll('#insp-source-select option')].map((o) => o.value).filter(Boolean)[0]);
    assert.ok(srcId, '演示数据里应至少有一个可上传活动（否则本测试的前提不成立）');
    await page.selectOption('#insp-source-select', srcId);

    const rowsBefore = await page.evaluate(READ_TOTAL);

    // ① 点选 2 人 → 直接关闭面板（不点「确认选择」）
    await page.evaluate(() => document.querySelector('#insp-person-picker-container .person-picker-trigger').click());
    await page.waitForFunction(() => document.querySelectorAll('.person-picker-item').length > 0, { timeout: 8000 });
    await page.evaluate(() => {
      const it = document.querySelectorAll('.person-picker-item');
      it[0].click();
      it[1].click();
    });
    await page.waitForTimeout(200);
    await page.evaluate(() => document.querySelector('.person-picker-close-btn').click());
    await page.waitForTimeout(300);

    const badge = await page.evaluate(() => document.querySelector('#insp-person-picker-container .person-picker-trigger-badge')?.textContent ?? '');
    assert.equal(badge, '2', '触发器徽标应显示已选 2 人（这是用户判断「已选好」的依据）');
    assert.equal(await countTextareas(page, 'insp'), 2,
      '【病灶断言】关面板（未点确认）后逐人填写框必须已在位——修复前为 0，提交时才报「请填写 X 的考察内容」');

    // ② 填内容 → 回去加选 1 人 → 已填内容不得被清空
    await page.evaluate(() => {
      const ts = [...document.querySelectorAll('textarea[id^="insp-content-"]')];
      ts[0].value = '复核：理论学习带头示范';
      ts[1].value = '复核：组织生活参与到位';
    });
    await page.evaluate(() => document.querySelector('#insp-person-picker-container .person-picker-trigger').click());
    await page.waitForTimeout(300);
    await page.evaluate(() => document.querySelectorAll('.person-picker-item')[2].click());
    await page.waitForTimeout(200);
    await page.evaluate(() => document.querySelector('.person-picker-close-btn').click());
    await page.waitForTimeout(300);

    assert.equal(await countTextareas(page, 'insp'), 3, '加选 1 人后应有 3 个逐人填写框');
    const values = await textareaValues(page, 'insp');
    assert.ok(values.includes('复核：理论学习带头示范') && values.includes('复核：组织生活参与到位'),
      `【保态断言】改选人员不得清空已填内容，实测：${JSON.stringify(values)}`);

    // ③ 填完（第 3 条补内容）→ 提交
    await page.evaluate(() => {
      const ts = [...document.querySelectorAll('textarea[id^="insp-content-"]')];
      ts[2].value = '复核：材料报送及时';
    });
    await page.evaluate(() => document.getElementById('insp-form-submit')?.click());
    await page.waitForFunction(() => (document.getElementById('toast-container')?.textContent || '').includes('考察上传成功'), { timeout: 8000 });
    await page.waitForTimeout(400);

    const rowsAfter = await page.evaluate(READ_TOTAL);
    assert.equal(rowsAfter, rowsBefore + 3, `提交后明细总数应新增 3（前 ${rowsBefore} → 后 ${rowsAfter}）`);
  } finally {
    await page.close();
  }
});

test('组织台·专班考察上传：同一条闭环（选专班 + 点选人员 → 关面板即有填写框 → 提交成功）', async () => {
  const page = await loginAs('2400012355', 'org');
  try {
    await page.evaluate(() => document.getElementById('btn-org-upload-insp')?.click());
    // 批次 48（2026-09-17，支书裁定 Q-23-47「只按需放宽这两处」）：**满载下等待窗口不足**——
    //   47-Z 的收尾全量里本条超时（实测耗时 33.5s），而**单文件独立跑绿（2/2，4.2s / 6.2s）**。
    //   「等面板挂载」与 AV5 的「等区块渲染」是同一族：**满载时浏览器上下文累积**最先撑不住它们。
    //   按裁定**只放宽这一处**（同文件其余 `timeout: 8000` 不动），并写明**满载实测耗时**。
    await page.waitForFunction(() => !!document.getElementById('org-insp-form-panel'), { timeout: 40000 }); // 满载实测 33.5s

    const tfId = await page.evaluate(() => [...document.querySelectorAll('#org-insp-tf-select option')].map((o) => o.value).filter(Boolean)[0]);
    assert.ok(tfId, '演示数据里应至少有一个在办专班（否则本测试的前提不成立）');
    await page.selectOption('#org-insp-tf-select', tfId);

    await page.evaluate(() => document.querySelector('#org-insp-person-picker-container .person-picker-trigger').click());
    await page.waitForFunction(() => document.querySelectorAll('.person-picker-item').length > 0, { timeout: 8000 });
    await page.evaluate(() => {
      const it = document.querySelectorAll('.person-picker-item');
      it[0].click();
      it[1].click();
    });
    await page.waitForTimeout(200);
    await page.evaluate(() => document.querySelector('.person-picker-close-btn').click());
    await page.waitForTimeout(300);

    assert.equal(await countTextareas(page, 'org-insp'), 2,
      '【病灶断言】专班考察上传同样必须做到「关面板即有填写框」');

    await page.evaluate(() => {
      const ts = [...document.querySelectorAll('textarea[id^="org-insp-content-"]')];
      ts[0].value = '复核：专班任务承担到位';
      ts[1].value = '复核：协作配合良好';
    });
    await page.evaluate(() => document.getElementById('org-insp-form-submit')?.click());
    await page.waitForFunction(() => (document.getElementById('toast-container')?.textContent || '').includes('专班考察上传成功'), { timeout: 8000 });
  } finally {
    await page.close();
  }
});
