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
// `V-6` 丙（2026-10-01 批次 327）：业务域**重点三域**识别色的单一源 —— 非空转断言用它（不依赖演示数据）
import { WORK_DOMAIN_COLORS } from '../../docs/src/core/domain/constants.js?v=20261005c';

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
/** 九业务域标签（`services/governance/todo.js::WORK_DOMAIN_LABELS` 的取值；V-6 丙断言用它筛「域胶囊」本身） */
const DOMAIN_LABELS = ['会务', '活动', '考勤纪律', '考察', '成员发展', '专班', '决议上报', '归档宣传', '汇报反馈', '通知/未分类'];

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
      return !!w && w.textContent.includes('今天要办');
    }, null, { timeout: 15000 });

    const probe = await page.evaluate(([labels, domainLabels]) => {
      const wrap = document.querySelector('[data-ws-memo="today"]');
      const card = [...wrap.querySelectorAll('section')].find((s) => s.textContent.includes('今天要办'));
      const headRow = card?.querySelector(':scope > div');
      const headBtn = headRow?.querySelector('button[data-today-all="todo"]');
      const rows = [...wrap.querySelectorAll('.today-go[data-go="todo"]')];
      // 组标题＝h4（_segHead）；取其文本与七类比对
      const h4s = [...card.querySelectorAll('h4')].map((h) => (h.textContent || '').replace(/\d+$/, '').trim());
      const groupLabels = h4s.filter((t) => labels.includes(t));
      const withDomainChip = rows.filter((r) => !!r.querySelector('span.rounded-full')).length;
      // V-6 丙（批次 327）：重点三域的域胶囊**带 `data-domain` ＋ 内联底色**；其余六域**保持中性**（无内联底色）
      //   ⚠ 只认**域胶囊本身**——行内还可能有别的圆角元素（组内角色 chip 等），按文案筛出九域标签那一种。
      const domainChips = [...wrap.querySelectorAll('span[data-domain]')];
      const chips = [...wrap.querySelectorAll('.today-go[data-go="todo"] span.rounded-full')]
        .filter((el) => domainLabels.includes((el.textContent || '').trim()));
      const hasInlineBg = (el) => (el.getAttribute('style') || '').includes('background:');
      return {
        text: wrap.textContent,
        hasHeadBtn: !!headBtn,
        rowCount: rows.length,
        h4s,
        groupLabels,
        withDomainChip,
        domainKeys: domainChips.map((c) => c.dataset.domain),
        domainAllInlineBg: domainChips.every(hasInlineBg),
        chipsTotal: chips.length,
        neutralNoInlineBg: chips.filter((c) => !c.dataset.domain).every((c) => !hasInlineBg(c)),
      };
    }, [ACTION_LABELS, DOMAIN_LABELS]);

    // ① 新结构：卡标题行收编「全部 ›」
    assert.ok(probe.hasHeadBtn, '左卡标题行须有「全部 ›」（data-today-all="todo"）——分组后链接上提到卡标题行');
    // ② 反向证据：被斥为「花瓶」/「四轴混排」的旧段头/概括行已移除
    assert.ok(!probe.text.includes('本岗待办'), '旧「本岗待办」概括行须已移除（其职责由动作性质分组取代）');
    assert.ok(!probe.text.includes('今天到期'), '旧「今天到期」段头须已移除（同批并入动作性质分组）');
    // ②′（2026-10-01 批次 329 · 支书裁「甲 单一轴＝动作性质」）：原「四轴混排」的另四个段头也须已并入七类组——
    //    判据只认 **h4 组标题**（不受行内文案干扰）：不得再出现「今日分工 / 待我表态 / 未读通知 / 待我处理的汇报」。
    const OLD_SEG_HEADS = ['今日分工', '待我表态', '未读通知', '待我处理的汇报'];
    assert.deepEqual(probe.h4s.filter((t) => OLD_SEG_HEADS.includes(t)), [],
      `旧段头（${OLD_SEG_HEADS.join(' / ')}）须已收进动作性质七类组；实得 h4＝${JSON.stringify(probe.h4s)}`);
    // ③ 种子里本岗确有在办待办 ⇒ **必须**见到动作性质组（不用 if 兜底：兜底会让「一条待办都没有」
    //    这种退化也判绿，等于没证）
    assert.ok(probe.rowCount > 0, `支书台今天页须有本岗在办待办行；实得 ${probe.rowCount} 行`);
    {
      assert.ok(probe.groupLabels.length >= 1,
        `有待办行（${probe.rowCount}）⇒ 须见动作性质组标题之一；实得 h4＝${JSON.stringify(probe.h4s)}`);
      assert.ok(probe.groupLabels.every((t) => ACTION_LABELS.includes(t)), '组标题只许七类动作性质之一');
      assert.ok(probe.withDomainChip >= 1, '分组行须带业务域小胶囊（九域降为行内胶囊）');
    }

    // ④ `V-6` 丙（2026-10-01 批次 327 · 支书裁「只给重点域配色」· 重点＝项目线三域）：
    //    **条件断言**——凡**带 `data-domain`** 的域胶囊必有内联底色，且域键只许三域之一；
    //    **不带 `data-domain`** 的域胶囊**不得**有内联底色（＝其余六域保持中性，不配色即不强调）。
    assert.ok(probe.chipsTotal >= 1, '分组行须带业务域小胶囊（九域降为行内胶囊）');
    assert.ok(probe.domainAllInlineBg, '带 `data-domain` 的业务域胶囊必须带内联底色（只有重点域配色）');
    assert.ok(probe.domainKeys.every((k) => ['meeting', 'activity', 'taskforce'].includes(k)),
      `只许「重点三域」上色；实得 ${JSON.stringify(probe.domainKeys)}`);
    assert.ok(probe.neutralNoInlineBg, '未上色的域胶囊不得带内联底色（其余六域保持中性）');

    // ⑤ 非空转（**不依赖演示数据**）：单一源 `WORK_DOMAIN_COLORS` **恰三键** ⇒ 证明「只给三域配色」
    //    不是「碰巧演示库里一条重点域都没有」。
    assert.deepEqual(Object.keys(WORK_DOMAIN_COLORS).sort(), ['activity', 'meeting', 'taskforce'],
      '业务域识别色单一源须恰三键（重点＝项目线三域：会务 / 活动 / 专班）');
    for (const k of Object.keys(WORK_DOMAIN_COLORS)) {
      const c = WORK_DOMAIN_COLORS[k];
      assert.ok(c && c.bg && c.text && c.border, `域 ${k} 的色须齐备 bg / text / border（含深色三件套）`);
    }
  } finally { await page.close(); }
});
