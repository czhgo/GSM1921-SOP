// server/test/today-action-groups-e2e.test.mjs — 「今天」页按**动作性质**分组的定向真机件
// （2026-10-01 批次 320 立 · 支书裁定「甲：直接用 TodoActionType 七类」）
//
// **立据**：支书评今天页「**信息量居然这么少…这个第一次进入的界面居然只是一个花瓶**」，
//   并要求「按照**工作类型**划分，而不是按照 活动/专班分」；追问后明示工作类型＝**动作性质**
//   （原话「我提的工作类型更多想说的是 **审核类、提交类、表决类** 等等！！」）⇒ 取甲：用
//   `TodoActionType` 七类做左卡顶层分组，九业务域降为行内小胶囊。
//
// **本件给的是正面证据**（不是「跑绿了」就算）：
//   ① 左卡标题行**收编了「全部 ›」**（新结构标记：`button[data-today-all="todo"]` 在卡标题行内）；
//   ② 旧的「本岗待办」概括行**已消失**（反向证据：那正是被斥为「花瓶」的「只有概率没有事项」）；
//   ③ 若有本岗在办待办，则**每组标题必为七类动作性质之一**，且组内每行带业务域胶囊。
//
// 自包含：createApp(:memory:) + seedDatabase + 真登录（支书 2300010001 / 123456）。

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

const ACTION_LABELS = ['审核', '提交', '赋权', '参与', '归档', '阅读', '追踪'];

test('S12 今天页左卡＝动作性质分组（七类）；旧「本岗待办」概括行已移除；分组行带业务域胶囊', async () => {
  const page = await browser.newPage();
  await page.route('**://fonts.googleapis.com/**', (r) => r.abort());
  await page.route('**://fonts.gstatic.com/**', (r) => r.abort());
  await page.route('**://cdn.tailwindcss.com/**', (r) => r.abort());
  try {
    await page.goto(`${base}/login.html`, { waitUntil: 'domcontentloaded' });
    await page.fill('#student-id', '2300010001');
    await page.fill('#password', '123456');
    await Promise.all([
      page.waitForURL('**/workspace/secretary.html', { timeout: 12000 }),
      page.click('button[type="submit"]'),
    ]);
    // 登录默认落点即「今天」页；等本卡渲染完成
    await page.waitForFunction(() => {
      const w = document.querySelector('[data-ws-memo="today"]');
      return !!w && w.textContent.includes('需要我今天动手');
    }, null, { timeout: 15000 });

    const probe = await page.evaluate((labels) => {
      const wrap = document.querySelector('[data-ws-memo="today"]');
      const card = [...wrap.querySelectorAll('section')].find((s) => s.textContent.includes('需要我今天动手'));
      const headRow = card?.querySelector(':scope > div');
      const headBtn = headRow?.querySelector('button[data-today-all="todo"]');
      const rows = [...wrap.querySelectorAll('.today-go[data-go="todo"]')];
      // 组标题＝h4（_segHead）；取其文本与七类比对
      const h4s = [...card.querySelectorAll('h4')].map((h) => (h.textContent || '').replace(/\d+$/, '').trim());
      const groupLabels = h4s.filter((t) => labels.includes(t));
      const withDomainChip = rows.filter((r) => !!r.querySelector('span.rounded-full')).length;
      return {
        text: wrap.textContent,
        hasHeadBtn: !!headBtn,
        rowCount: rows.length,
        h4s,
        groupLabels,
        withDomainChip,
      };
    }, ACTION_LABELS);

    // ① 新结构：卡标题行收编「全部 ›」
    assert.ok(probe.hasHeadBtn, '左卡标题行须有「全部 ›」（data-today-all="todo"）——分组后链接上提到卡标题行');
    // ② 反向证据：被斥为「花瓶」的旧概括行已移除
    assert.ok(!probe.text.includes('本岗待办'), '旧「本岗待办」概括行须已移除（其职责由动作性质分组取代）');
    assert.ok(!probe.text.includes('今天到期'), '旧「今天到期」段头须已移除（同批并入动作性质分组）');
    // ③ 种子里本岗确有在办待办 ⇒ **必须**见到动作性质组（不用 if 兜底：兜底会让「一条待办都没有」
    //    这种退化也判绿，等于没证）
    assert.ok(probe.rowCount > 0, `支书台今天页须有本岗在办待办行；实得 ${probe.rowCount} 行`);
    {
      assert.ok(probe.groupLabels.length >= 1,
        `有待办行（${probe.rowCount}）⇒ 须见动作性质组标题之一；实得 h4＝${JSON.stringify(probe.h4s)}`);
      assert.ok(probe.groupLabels.every((t) => ACTION_LABELS.includes(t)), '组标题只许七类动作性质之一');
      assert.ok(probe.withDomainChip >= 1, '分组行须带业务域小胶囊（九域降为行内胶囊）');
    }
  } finally { await page.close(); }
});
