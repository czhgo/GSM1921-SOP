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
// `D-787`（2026-10-05 · 9 → 6 合并）：业务域识别色的单一源 —— 非空转断言用它（现行**恰一键 `project`**）
import { WORK_DOMAIN_COLORS } from '../../docs/src/core/domain/constants.js?v=20261120a';
// `D-787`：6 类域值（色键须落其中）
import { DOMAIN_ORDER } from '../../docs/src/services/governance/todo.js?v=20261120a';
// 批次 541 P0-1 / P0-2：行点击落点解析（与页面同一契约，不在测试里另写一张表）
import { resolveTodoAction } from '../../docs/src/core/domain/todo-actions.js?v=20261120a';

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
/** 业务域标签（`services/governance/todo.js::WORK_DOMAIN_LABELS` 的取值；`D-787` 合并后 **6 类**） */
const DOMAIN_LABELS = ['项目', '考勤纪律', '考察', '成员发展', '上报与汇报', '归档宣传', '通知/未分类'];

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
      page.waitForURL('**/workspace/secretary', { timeout: 12000 }),
      page.click('button[type="submit"]'),
    ]);
    // 登录默认落点即「今天」页；等本卡渲染完成
    await page.waitForFunction(() => {
      const w = document.querySelector('[data-ws-memo="today"]');
      return !!w && w.textContent.includes('要办');
    }, null, { timeout: 15000 });

    const probe = await page.evaluate(([labels, domainLabels]) => {
      // 2026-10-25 批次 512：后台 render 可能在 waitForFunction 与 evaluate 之间替换节点；
      //   wrap 缺失时退回 document 作用域，避免 `undefined.querySelectorAll` 的假红。
      const wrap = document.querySelector('[data-ws-memo="today"]') || document;
      const card = [...wrap.querySelectorAll('section')].find((s) => s.textContent.includes('要办')) || wrap;
      const headRow = card?.querySelector(':scope > div');
      const headBtn = headRow?.querySelector('button[data-today-all="todo"]');
      // 2026-11-10 批次 540：待办行改为动作级落点（`data-go="action"` ＋ actionKey/sourceId），
      //   不再一律 `data-go="todo"`（汇报行仍是 `data-go="todo"` 带 reportId）。
      const rows = [...wrap.querySelectorAll('.today-go[data-go="action"]')];
      // 组标题＝h4（_segHead）；取其文本与七类比对
      const h4s = [...card.querySelectorAll('h4')].map((h) => (h.textContent || '').replace(/\d+$/, '').trim());
      const groupLabels = h4s.filter((t) => labels.includes(t));
      // 2026-11-04 批次 534：行首状态改用 6px 圆点（同样是 span.rounded-full），
      //   故此处只认**带文字**的胶囊，避免圆点把判据刷成恒真。
      const withDomainChip = rows.filter((r) => [...r.querySelectorAll('span.rounded-full')]
        .some((el) => (el.textContent || '').trim().length > 0)).length;
      // `D-787`（9 → 6 合并）后 `WORK_DOMAIN_COLORS` 暂空 ⇒ 现行**各域胶囊一律中性**（无 `data-domain`、
      //   无内联底色）；本探针仍按「有 `data-domain` 才要求底色」取数，供支书定色后同批复用。
      const domainChips = [...wrap.querySelectorAll('span[data-domain]')];
      const chips = [...wrap.querySelectorAll('.today-go[data-go="action"] span.rounded-full')]
        .filter((el) => domainLabels.includes((el.textContent || '').trim()));
      const hasInlineBg = (el) => (el.getAttribute('style') || '').includes('background:');
      return {
        text: wrap.textContent,
        hasHeadBtn: !!headBtn,
        rowCount: rows.length,
        rowDates: rows.map((r) => (r.querySelector('span.tabular-nums')?.textContent || '').trim()),
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
    // ③ 2026-10-18 繁专项 Task 7：今天页只列「今日到期 / 逾期」待办（不再列全量未完成）。
    //    每行截止必须 ≤ 今天；若本次种子没有今日/逾期待办，则不列待办行，且**无截止待办不得露头**。
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    assert.ok(probe.rowDates.every((d) => d && d <= todayStr),
      `今天页待办行的截止必须 ≤ ${todayStr}；实得 ${JSON.stringify(probe.rowDates)}`);
    if (probe.rowCount > 0) {
      assert.ok(probe.groupLabels.length >= 1,
        `有待办行（${probe.rowCount}）⇒ 须见动作性质组标题之一；实得 h4＝${JSON.stringify(probe.h4s)}`);
      assert.ok(probe.groupLabels.every((t) => ACTION_LABELS.includes(t)), '组标题只许七类动作性质之一');
      assert.ok(probe.withDomainChip >= 1, '分组行须带业务域小胶囊（九域降为行内胶囊）');
    } else {
      assert.ok(!probe.text.includes('设置第三党小组组长'), '无截止待办（如「设置第三党小组组长」）不得列在今天页');
    }

    // ④ `D-787` 续（2026-10-05 · 支书圈乙「**只给『项目』配红金**」）：**只有「项目」域上色**，其余五类中性。
    //    条件式取数：凡带 `data-domain` 的域胶囊须带内联底色、且域键**只许 `project`**；不带者不得有底色。
    if (probe.rowCount > 0) {
      assert.ok(probe.chipsTotal >= 1, '分组行须带业务域小胶囊（合并后 6 类，降为行内胶囊）');
      assert.ok(probe.domainAllInlineBg, '若存在带 `data-domain` 的域胶囊则必须带内联底色');
      assert.ok(probe.domainKeys.every((k) => k === 'project'),
        `只许「项目」域上色；实得 ${JSON.stringify(probe.domainKeys)}`);
      assert.ok(probe.neutralNoInlineBg, '未上色的域胶囊不得带内联底色（其余五类保持中性）');
    }

    // ⑤ 非空转（**不依赖演示数据**）：`WORK_DOMAIN_COLORS` **恰一键 ＝ `project`**（支书 2026-10-05 圈乙
    //    「只给『项目』配红金」）⇒ 证明「只有项目域配色」不是「碰巧演示库里没有项目域待办」。
    assert.deepEqual(Object.keys(WORK_DOMAIN_COLORS).sort(), ['project'],
      '业务域识别色单一源须恰一键（只给「项目」配色；`D-787` 续 · 支书圈乙）');
    for (const k of Object.keys(WORK_DOMAIN_COLORS)) {
      assert.ok(DOMAIN_ORDER.includes(k), `色键 ${k} 须是 6 类域值之一`);
      const c = WORK_DOMAIN_COLORS[k];
      assert.ok(c && c.bg && c.text && c.border, `域 ${k} 的色须齐备 bg / text / border（含深色三件套）`);
    }
  } finally { await page.close(); }
});

// ── 批次 541 P0-1 / P0-2：今天行 → 待办页「定位到对应聚合组」真机件 ────────────────
// 病灶（改前）：今天行把**待办本体 id** 当 PendingTarget.id，而待办页行键是 `role:actionKey`
//   ⇒ 选择器永不命中，落页顶并显示「该条明细已处理或已移出列表」（事实错误）。
// 判据：点行后必须落到待办页、对应聚合组拿到高亮类 `nav-flash-highlight`，且**不得**出现
//   「未定位到具体条目」/「已移出列表」字样。
test('S13 今天页点待办行 → 待办页定位到对应聚合组（高亮、无「未定位 / 已移出」误报）', async () => {
  const page = await browser.newPage();
  await page.route('**://fonts.googleapis.com/**', (r) => r.abort());
  await page.route('**://fonts.gstatic.com/**', (r) => r.abort());
  await page.route('**://cdn.tailwindcss.com/**', (r) => r.abort());
  try {
    await page.goto(`${base}/login.html`, { waitUntil: 'domcontentloaded' });
    await page.fill('#student-id', '2300010001');
    await page.fill('#password', '123456');
    await Promise.all([
      page.waitForURL('**/workspace/secretary', { timeout: 12000 }),
      page.click('button[type="submit"]'),
    ]);
    await page.waitForFunction(() => {
      const w = document.querySelector('[data-ws-memo="today"]');
      return !!w && w.textContent.includes('要办');
    }, null, { timeout: 15000 });

    // 取今天页的动作行（带聚合组键）；按同一契约在 Node 侧解析，挑「应落待办页」的那一行
    const rows = await page.evaluate(() => [...document.querySelectorAll('.today-go[data-go="action"]')]
      .map((b) => ({
        actionKey: b.dataset.actionKey || '',
        groupKey: b.dataset.groupKey || '',
        todoId: b.dataset.todoId || '',
        text: (b.textContent || '').replace(/\s+/g, ' ').trim(),
      })));
    const pick = rows.find((r) => {
      if (!r.groupKey) return false;
      const action = resolveTodoAction({ actionKey: r.actionKey }, 'secretary');
      return !!action && action.mode === 'switch' && action.tab === 'todo';
    });
    assert.ok(pick, `今天页须有「落待办复核组」的动作行（定位键＝聚合组键）；实得 ${JSON.stringify(rows)}`);

    await page.click(`.today-go[data-go="action"][data-group-key="${pick.groupKey}"]`);
    // 待办页渲染 + 该组高亮（flashHighlight 类 2.8s 后自动移除，先等它出现）
    await page.waitForSelector(`[data-group-key="${pick.groupKey}"].nav-flash-highlight`, { timeout: 15000 });

    const probe = await page.evaluate((groupKey) => {
      const shell = document.querySelector('[data-ws-memo="todo-shell"]');
      const text = shell ? shell.textContent : document.body.textContent;
      return {
        hasShell: !!shell,
        highlighted: !!document.querySelector(`[data-group-key="${groupKey}"].nav-flash-highlight`),
        missingHint: text.includes('未定位到具体条目'),
        removed: text.includes('已移出列表'),
      };
    }, pick.groupKey);

    assert.ok(probe.hasShell, '点击今天行后须落到待办页（todo-shell）');
    assert.ok(probe.highlighted, `★ 对应聚合组须高亮：${pick.groupKey}（${pick.text}）`);
    assert.ok(!probe.missingHint, '命中后不得出现「未定位到具体条目」');
    assert.ok(!probe.removed, '★ 命中后不得出现「已移出列表」字样（改前恒出现）');
  } finally { await page.close(); }
});
