// server/test/page-sweep.test.mjs — 「分页 / 宽表 / 检索」全站真机普查（2026-09-15 批次 43）
//
// 支书第 1 项：「涉及到人、活动以及其他可能会无限增长的表格，我注意到**还是有部分表格没有能够做到分页**」
// ——这是**逐面点出的病灶**，而此前所有守卫都是「结构层按文件断言」（引擎在位、矩阵在位、台账登记）。
// 结构层证明不了「**跑起来的每一个页签都真的分了页**」：漏网点可能出现在「某个 tab 的某段数据」上。
//
// 本守卫做的是**真机普查**（dogfood）：七个工作台 × 全部 tab 逐一进页面，在**真实渲染的 DOM** 上断言：
//   P1 引擎列表（`.lf-root`）：渲染行数 > 10 时**必须**有翻页控件（`[data-lf-page]`）
//   P2 宽表矩阵（`.rm-root`）：行数 ≤ 10（人维分页生效）；有翻页区时计数口径须为「共 N 人 · 第 x / y 页」
//   P3 手写表格（`.data-table` 且不在引擎/矩阵内）：行数 > 10 时该 tab 内**必须**有翻页控件
//   P4 「第一列是人」的引擎表（首列表头＝姓名/成员/姓名…）必须配有搜索框（关键词）
//   P5 每个 tab 打开过程**零 pageerror**（普查同时充当全站冒烟）
// 批次 47-B（支书 2026-09-15 裁定「全站单档」）在本普查内增补**真机尺规复核**
//   （算式判据改归 `density-spacing-guard.test.mjs` D1/D2/D7，本处只核「真渲染出来的值」）：
//   P6 控件档（2026-10-23 Task 6）：`input.input-flat` / `select.input-flat` / `.cs-trigger` 渲染高须 40px、
//      字 13px；`.lf-btn` 按位置取页面档 36px（与 40px 控件基线对齐）
//      （`textarea` 例外：多行，只核字号）
//   P7 数据格档：`.data-table th/td` 渲染字号须 13px（含**首列**——支书实报「人作首列的表格字体小」即此处）
//   P8 裸控件：可见的原生表单件若未挂 `.input-flat`，其字号/高度走 UA 默认档 → 不受单档约束即为离群
//   P9 分页钮档：`.page-btn` / `.page-num` 是**明载例外**（按实际 CSS 30px；旧注释误写 32，见 DECK 注释），
//      断言不被顺手改回 40/36
// 批次 47-C（支书 2026-09-15 裁定「先补普查盲区」）扩围**两个盲区**：
//   盲区①**只看默认视图**——故对每个 tab 追加「二级视图」审次：点开 `[data-rm-toggle]`（矩阵显示全部 N 项）、
//     按 `[data-view]` 的不同取值逐一切换（转置视图），每个态都跑同一套 P1–P11；
//     P2 随之改为**按「行维是不是人」分流**：人维在行断言行数 ≤ 10、人维在列断言列上人数 ≤ 10。
//   盲区②**只认三类载体**——「不走引擎、又不是 `<table>` 的自建列表」（卡片 / 行块）原不在覆盖内；
//     先以探针取证（AUDIT 的 `probe`），实测 65 tab 命中 2 处（档案归档 22 块 / 组员进展 13 块）后立 **P11**。
//   S2 环境自检：静音的外部资源须逐条登记理由——**真机 ≠ 真环境**（批 43 静音了 Tailwind，
//      而本站依赖它 → `.text-xs` 越界到数据格这类病**在普查环境里不存在**，真机报 0 违规而生产实际 12px）
// 判据说明：只对「真渲染出的行」断言——分页生效时行数天然 ≤ 10，故 P1/P3 命中的正是「渲染全量且无翻页」
//   这一类**病态列表**（即支书体验到的那类），不会因分页正常工作而误报。
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from 'playwright';
import { createApp } from '../app.js';
import { seedDatabase } from '../seed.js';

/** 七个工作台 × 登录账号（与 docs/src/data/mock/accounts.js 的演示账号一致） */
const WORKS = [
  { page: 'secretary', studentId: '2300010001', name: '支书 / 副支书台' },
  { page: 'org', studentId: '2400012355', name: '组织委员台' },
  { page: 'prop', studentId: '2400012356', name: '宣传委员台' },
  { page: 'disc', studentId: '2400012354', name: '纪检委员台' },
  { page: 'leader', studentId: '2400012345', name: '党小组组长台' },
  { page: 'visitor', studentId: '2400012349', name: '成员台' },
  { page: 'party-committee', studentId: '9000000001', name: '党委台' },
];

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
    await new Promise((r) => server.close(r));
  }
});

/** 引擎「检索条出现门槛」的单一源（docs/src/core/domain/constants.js::SEARCH_FILTER_MIN_ROWS）——见下方 S0 断言 */
const MIN_ROWS = 8;

/** 单档取值（来源＝docs/src/styles.css，见 density-spacing-guard D1/D2/D7 的算式断言；此处只做真机复核）
 *  P9 分页钮：2026-10-24 批次 508 由 30 抬到 32（卡片/页签档同高 4+4+22+2）。
 *  改高必须同批改 CSS 与本常量（并注明）。 */
const DECK = { inputH: 40, lfBtnH: 36, cellPx: 13, pagerH: 32 };

/** 被静音的外部资源台账（批次 47-B 纪律）：真机量测值必须与生产一致——凡静音项都要写明
 *  「为何不影响被测属性」；若某资源确实会影响被测属性，则必须先在被测属性上做出与它无关的保障
 *  （如单档直接声明到 th/td，见 filter-row D3），否则普查就是自欺。 */
const MUTED_EXTERNALS = [
  { pattern: '**://fonts.googleapis.com/**', why: '仅提供字体文件；字体族不影响字号档与控件高度判据' },
  { pattern: '**://fonts.gstatic.com/**', why: '同上：仅提供字体二进制文件，字体族不影响字号档与控件高度判据' },
  { pattern: '**://cdn.tailwindcss.com/**', why: '其 .text-xs（12px）等工具类**会影响**字体判据——故单档已改为直接声明到 th/td（特异性高于单类工具类，见 filter-row D3），与本项静音与否无关，量测值与生产一致；⚠ 其 .flex / .w-full / .overflow-x-auto 等工具类会影响**窄屏布局**判据，故 390×844 审次前先 unroute 并在未静音的同环境量测（见 W-NARROW）' },
];

/** 二级视图触发器（批次 47-C）：默认视图审完后逐一「点开」再审计——
 *  病灶：批 43 只审「点开 tab 后的静态 DOM」，故**点开才出现的态**不在覆盖内。
 *  （视图切换按钮 `[data-view]` 由下方按取值逐一点过去，不在此列——它不具「点一次再点一次即复位」的语义。） */
const SUBVIEW_TRIGGERS = [{ name: '矩阵·显示全部', sel: '[data-rm-toggle]' }];

/** 自建列表（不走引擎、非 `<table>`）的**待修台账**（批次 47-C 首次扩围实测 2 处 → **批次 47-H 全部闭环、清空**）。
 *  ⚠ 这**不是**「正当例外」，而是「已确认不合规、已登记待修」——接分页后必须逐条删除本台账；
 *  台账若僵尸化（条目再也命中不到）同样红灯。台账本身不豁免新出现的同类（新出现的同级即刻 P11 红灯）。
 *  47-H 闭环记录（支书裁定「现在就接分页」）：两处均改接统一检索引擎（`renderFilteredList`），
 *  · 宣传台「档案归档」归档活动卡片 22 块 → `prop/archive-tab.js` 改 `_endedUnarchivedCardHtml` 行渲染器；
 *  · 组长台「组员进展」卡点行块 13 块 → `leader/members-tab.js` 改 `blockerRowHtml` 行渲染器
 *    （并**取消**上一批「派生清单不接引擎」的例外：那条理由说的是**分面预设**不适用，不是引擎不适用），
 *    同时把「了解进展」按钮由 querySelectorAll 绑定改**容器委托**（引擎重绘后按钮不再失效）。
 *  → 故本次 2 条**全部删除**；本台账保持为空 = 「当前无已确认待修项」。 */
const CARD_LIST_PENDING = [];

/** 当前 tab 内容的 DOM 普查（纯只读断言，返回 {violations, stats, probe}） */
const AUDIT = (cfg) => {
  const minRows = cfg.minRows;
  const deck = cfg.deck;
  const v = [];
  const stats = { lists: 0, listsOverPage: 0, matrices: 0, matrixTransposed: 0, tables: 0, ctrls: 0, cells: 0, bareCtrl: 0, pagers: 0 };
  const txt = (el) => (el?.textContent || '').replace(/\s+/g, ' ').trim();
  // P1 引擎列表：渲染行数 > 10 必须有翻页
  document.querySelectorAll('.lf-root').forEach((root) => {
    const list = root.querySelector('.lf-list');
    if (!list) return;
    stats.lists += 1;
    const tot = /共 (\d+) /.exec(txt(root.querySelector('.lf-count')));
    if (tot && Number(tot[1]) > 10) stats.listsOverPage += 1;
    const tbody = list.querySelector('tbody');
    const rows = tbody ? tbody.querySelectorAll('tr').length : list.children.length;
    if (rows > 10 && !root.querySelector('.lf-pager [data-lf-page]')) {
      v.push({ rule: 'P1 引擎列表未分页', rows, sample: txt(list).slice(0, 40) });
    }
  });
  // P2 宽表矩阵：**人维**分页生效（≤10）+ 计数口径。矩阵可转置（批次 35：byPerson / byItem 互为转置）：
  //   人维落在**行**上时（首列＝姓名 / 成员 / 负责人）断言行数 ≤ 10；
  //   落在**列**上时（首列＝项目 / 活动 / 来源 / 期次…）断言列上人数 ≤ 10——同一页切片口径，只是方位不同。
  //   注：原「首列必须是 姓名/成员/负责人」的白名单是 byPerson 时代的遗留——靠词表判定**行维**必然脆
  //   （行维名随域变化），批次 47-C 由真机扩围实测暴露（转置视图 3 处误报），故改为**按行维是不是人**分流。
  document.querySelectorAll('.rm-root').forEach((root) => {
    stats.matrices += 1;
    const heads = [...root.querySelectorAll('thead th')].map((th) => txt(th));
    const byPerson = ['姓名', '成员', '负责人'].includes(heads[0]);
    const rows = root.querySelectorAll('tbody tr').length;
    if (byPerson) {
      if (rows > 10) v.push({ rule: 'P2 矩阵人维超一页（人维在行）', rows, head: heads[0] });
    } else {
      stats.matrixTransposed += 1;
      const personCols = Math.max(0, heads.length - 1);
      if (personCols > 10) v.push({ rule: 'P2 矩阵人维超一页（人维在列）', personCols, head: heads[0] });
    }
    const cnt = txt(root.querySelector('.rm-pager .lf-count'));
    if (cnt && !/^共 \d+ 人 · 第 \d+ \/ \d+ 页$/.test(cnt)) v.push({ rule: 'P2 矩阵计数口径', cnt });
  });
  // P3 手写表格：行数 > 10 时该 tab 内必须有翻页
  document.querySelectorAll('table.data-table').forEach((t) => {
    if (t.closest('.lf-root') || t.closest('.rm-root')) return;
    stats.tables += 1;
    const n = t.querySelectorAll('tbody tr').length;
    if (n > 10 && !t.closest('[id$="-tab-content"]')?.querySelector('[data-lf-page]')) {
      v.push({ rule: 'P3 手写表格未分页', rows: n, sample: txt(t).slice(0, 40) });
    }
  });
  // P4 第一列是人的引擎表必须配搜索（引擎门槛：视图行数 ≤ SEARCH_FILTER_MIN_ROWS 时不渲染检索条，
  //    故只在「总数 > 门槛」时要求输入框存在——否则会把「结果不多故不显示检索条」误判为违规）
  document.querySelectorAll('.lf-root').forEach((root) => {
    const first = txt(root.querySelector('thead th'));
    if (!/^(姓名|成员|负责人|人)$/.test(first)) return;
    const m = /共 (\d+) /.exec(txt(root.querySelector('.lf-count')));
    const total = m ? Number(m[1]) : 0;
    if (total > minRows && !root.querySelector('.lf-bar input')) {
      v.push({ rule: 'P4 首列是人但无搜索框', first, total });
    }
  });
  // ── 尺规（2026-10-23 Task 6：控件 40 / 筛选行按钮 36 / 数据格 13px；算式判据见 density-spacing-guard D1/D2）──
  const visible = (el) => {
    const r = el.getBoundingClientRect();
    if (r.width < 8 || r.height < 8) return false; // 隐藏件（如 .cs-native 1px 桩）
    const cs = getComputedStyle(el);
    return cs.visibility !== 'hidden' && cs.display !== 'none' && cs.opacity !== '0';
  };
  const fs = (el) => Math.round(parseFloat(getComputedStyle(el).fontSize) * 100) / 100;
  // P6 控件档：输入/下拉 40px；筛选行 `.lf-btn` 按位置取页面档 36px（与 40px 控件基线对齐，不再拉成同高）。
  //   textarea 例外：多行，只查字号。
  const checkCtrl = (el, expectH) => {
    if (!visible(el)) return;
    stats.ctrls += 1;
    if (el.offsetHeight !== expectH) {
      v.push({ rule: 'P6 控件档离群（应 ' + expectH + 'px）', tag: el.tagName, cls: String(el.className).slice(0, 50), h: el.offsetHeight });
    }
    if (fs(el) !== deck.cellPx) {
      v.push({ rule: 'P6 控件字号离群', tag: el.tagName, cls: String(el.className).slice(0, 50), px: fs(el) });
    }
  };
  document.querySelectorAll('.lf-btn').forEach((el) => checkCtrl(el, deck.lfBtnH));
  document.querySelectorAll('input.input-flat, select.input-flat, .cs-trigger').forEach((el) => {
    if (el.tagName === 'TEXTAREA') {
      stats.ctrls += 1;
      if (fs(el) !== deck.cellPx) v.push({ rule: 'P6 控件字号离群', tag: 'TEXTAREA', px: fs(el) });
      return;
    }
    checkCtrl(el, deck.inputH);
  });
  // P7 数据格档：表格 th/td 的渲染字号必须 13px（含首列——支书实报「人作首列字体小」即此处）
  document.querySelectorAll('.data-table th, .data-table td').forEach((el) => {
    if (!visible(el)) return;
    if (el.classList.contains('is-empty')) return; // 空态占位行不是数据格
    stats.cells += 1;
    if (fs(el) !== deck.cellPx) {
      v.push({ rule: 'P7 数据格字号离群（应 ' + deck.cellPx + 'px）', tag: el.tagName, txt: (el.textContent || '').trim().slice(0, 20), px: fs(el) });
    }
  });
  // P8 裸控件：可见的原生表单件若未挂 .input-flat，则字号/高度走 UA 默认档 —— 不受单档约束即为离群
  document.querySelectorAll('input, select, textarea').forEach((el) => {
    if (!visible(el)) return;
    if (['checkbox', 'radio', 'file', 'hidden'].includes(el.type)) return;
    if (el.classList.contains('input-flat') || el.classList.contains('cs-native')) return;
    stats.bareCtrl += 1;
    v.push({ rule: 'P8 裸控件（未挂单档类）', tag: el.tagName, cls: String(el.className).slice(0, 50), h: el.offsetHeight, px: fs(el) });
  });
  // P9 分页钮档：分页控件是明载例外（32px），断言其不被顺手改成 40/36
  document.querySelectorAll('.page-btn, .page-num').forEach((el) => {
    if (!visible(el)) return;
    stats.pagers += 1;
    if (el.offsetHeight !== deck.pagerH) {
      v.push({ rule: 'P9 分页钮档离群（应 ' + deck.pagerH + 'px）', h: el.offsetHeight });
    }
  });
  // ── P11（批次 47-C）自建列表必须分页：不走引擎、又不是 <table> 的「卡片 / 行块列表」原不在覆盖内 ——
  //   判据：容器直接子元素 ≥ 12 且**同构**（同 tag + 同 class）、不在已登记载体里、容器内无翻页控件。
  //   取证（2026-09-15 首次扩围实测，65 tab）：全站命中 **2 处**，均无翻页——
  //     · 宣传台「档案归档」归档活动卡片 **22 块**（prop/archive-tab.js）
  //     · 组长台「组员进展」卡点行块 **13 块**（leader/members-tab.js）
  //   这 2 处进了 `CARD_LIST_PENDING` 待修台账（**不是正当例外**）；**批次 47-H 已全部接统一检索引擎闭环**，
  //   台账随之清空（僵尸化检查会强制这条一致性）。
  //   任何**新出现**的同类即刻红灯 —— 这正是支书实报「还有表格没分页」的那一类。
  const pending = cfg.pending || [];
  const pendingSeen = [];
  const probe = [];
  document.querySelectorAll('div, ul, ol').forEach((el) => {
    if (el.closest('.lf-root') || el.closest('.rm-root') || el.closest('table')) return;
    const kids = [...el.children];
    if (kids.length < 12) return;
    const sig = (n) => n.tagName + '|' + (n.getAttribute('class') || '');
    if (!kids.every((k) => sig(k) === sig(kids[0]))) return;
    if (el.querySelector('[data-lf-page]')) return;
    if (!el.getBoundingClientRect().height) return;
    const hit = pending.find((p) => sig(kids[0]).startsWith(p.sig));
    if (hit) {
      pendingSeen.push(hit.sig);
      probe.push({ kids: kids.length, sig: sig(kids[0]).slice(0, 60), txt: txt(el).slice(0, 40) });
      return;
    }
    v.push({ rule: 'P11 自建列表未分页（≥12 同构块且无翻页）', kids: kids.length, sig: sig(kids[0]).slice(0, 70), txt: txt(el).slice(0, 30) });
  });
  return { violations: v, stats, probe, pendingSeen };
};

/** 普查覆盖统计（跨工作台累加；用于最后断言「普查没有空转」） */
const SWEEP = { tabs: 0, views: 0, lists: 0, listsOverPage: 0, matrices: 0, matrixTransposed: 0, tables: 0, ctrls: 0, cells: 0, bareCtrl: 0, pagers: 0, probe: 0, byPage: {} };
const SWEEP_KEYS = Object.keys(SWEEP).filter((k) => k !== 'tabs' && k !== 'views' && k !== 'probe' && k !== 'byPage');
/** 待修台账命中集合（跨工作台累积；用于断言「台账不僵尸」） */
const PENDING_SEEN = new Set();

// S0：普查口径的单一源守卫——普查用的门槛值必须是引擎单一源的值（改门槛须同步本普查，防止口径未同步的情况）
test('S0 普查门槛取值来自单一源（core/domain/constants.js::SEARCH_FILTER_MIN_ROWS）', () => {
  const src = readFileSync(join(import.meta.dirname, '..', '..', 'docs', 'src', 'core', 'domain', 'constants.js'), 'utf8');
  const m = /SEARCH_FILTER_MIN_ROWS\s*=\s*(\d+)/.exec(src);
  assert.ok(m, 'core/domain/constants.js 须定义 SEARCH_FILTER_MIN_ROWS');
  assert.equal(Number(m[1]), MIN_ROWS, `普查门槛 ${MIN_ROWS} 与单一源 ${m[1]} 不一致（改门槛须同步本普查）`);
});

for (const w of WORKS) {
  test(`真机普查 · ${w.name}（${w.page}）：全部 tab 的分页 / 宽表 / 检索 / 无脚本错误`, async () => {
    const page = await browser.newPage();
    const errs = [];
    page.on('pageerror', (e) => errs.push(e.message));
    try {
      // 登录：加固抗负载抖动（全量套件在重负载下曾出现 30s 内未渲染 tab 的偶发超时 → 重试一次，
      // 并把「等表单就位」「等 tab 就位」两段等待分开，避免把慢启动误判为产品缺陷）
      await page.route('**://fonts.googleapis.com/**', (r) => r.abort());
      await page.route('**://fonts.gstatic.com/**', (r) => r.abort());
      await page.route('**://cdn.tailwindcss.com/**', (r) => r.abort());
      let loggedIn = false;
      for (let attempt = 0; attempt < 2 && !loggedIn; attempt += 1) {
        await page.goto(`${base}/login.html`, { waitUntil: 'domcontentloaded' });
        await page.waitForSelector('#student-id', { timeout: 30000 });
        await page.fill('#student-id', w.studentId);
        await page.fill('#password', '123456');
        await Promise.all([
          page.waitForURL(`**/workspace/${w.page}.html`, { timeout: 30000 }),
          page.click('button[type="submit"]'),
        ]);
        try {
          await page.waitForFunction(() => document.querySelectorAll('button[role="tab"]').length > 0, { timeout: 45000 });
          loggedIn = true;
        } catch (e) {
          if (attempt === 1) throw e;
        }
      }
      await page.waitForTimeout(800);
      // P0-2 形态断言（2026-09-23 支书裁定「形态必须可断言、不许静默降级」）：本文件真机用例必须在 API 形态下跑
      await page.waitForFunction(async () => (await import('/src/data/data-adapter.js?v=20261031a')).getRuntimeMode().source === 'api', null, { timeout: 20000 });

      // ── 1440 页签条不溢出（2026-10-21 R5-C01）──
      //   判据：`.ws-tab-scroll` 的 scrollWidth ≤ clientWidth（分组胶囊改竖线 + 滚动区右留 40px 后，
      //   secretary / visitor 的末页签在 1440 下不得再被藏）。
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.waitForTimeout(400);
      const tabGeom = await page.evaluate(() => {
        const s = document.querySelector('.ws-tab-shell .ws-tab-scroll');
        return s ? { scrollWidth: s.scrollWidth, clientWidth: s.clientWidth } : null;
      });
      assert.ok(tabGeom, `${w.name} 未找到页签滚动容器 .ws-tab-scroll`);
      assert.ok(tabGeom.scrollWidth <= tabGeom.clientWidth + 1,
        `${w.name} · 1440 下页签条溢出：scrollWidth ${tabGeom.scrollWidth} > clientWidth ${tabGeom.clientWidth}`);

      // 只数**工作台页签条**（`aria-label="工作台页签"`）里的 role=tab；页面内二级分段
      //   （党委台「撰写 / 已发送」「待批复 / 已处理」、成员台「列表 / 日历 / 查询」）同样是 role=tab，
      //   若一并计数，默认落点带二级分段的台会被虚增（2026-10-20：党委台默认改「支部上报」后即虚增 2）。
      const labels = await page.$$eval('[aria-label="工作台页签"] button[role="tab"]', (els) => els.map((e) => e.textContent.trim()));
      assert.ok(labels.length > 0, `${w.name} 未渲染任何 tab`);
      // 逐台实测页签数（供 `S19` 与 `README-server §3.2.x` 台账对账；单一源＝各台能力注册）
      SWEEP.byPage[w.page] = labels.length;

      const report = [];
      const probeLog = [];
      /** 审一次当前 DOM（phase 区分默认视图 / 二级视图）；只有默认视图计入「载体覆盖样本」，防重复计数 */
      const audit = async (label, phase, countCarriers) => {
        const { violations, stats, probe, pendingSeen } = await page.evaluate(AUDIT, { minRows: MIN_ROWS, deck: DECK, pending: CARD_LIST_PENDING });
        SWEEP.views += 1;
        SWEEP.matrixTransposed += stats.matrixTransposed || 0;
        if (countCarriers) for (const k of SWEEP_KEYS) SWEEP[k] += stats[k] || 0;
        for (const v of violations) report.push({ tab: label, phase, ...v });
        for (const s of pendingSeen) PENDING_SEEN.add(s);
        for (const p of probe) probeLog.push(`${label} · ${phase} · ${p.kids} 块同构 ${p.sig} ｜ ${p.txt}`);
        SWEEP.probe += probe.length;
      };
      for (const label of labels) {
        // 用 evaluate 点击（避免浮层遮挡），再等内容渲染
        await page.evaluate((l) => {
          [...document.querySelectorAll('[aria-label="工作台页签"] button[role="tab"]')].find((x) => x.textContent.includes(l))?.click();
        }, label);
        await page.waitForTimeout(1100);
        SWEEP.tabs += 1;
        // 「加载不出来」体检（2026-10-02 批次 334 · 支书 #7「tab 在切换和加载中存在加载不出来的问题」）：
        //   每台每个 tab **必须渲染出非空产物**——「静默空白」此前无任何守卫覆盖
        //   （本文件原只查分页/宽表/检索/脚本错误；`render` 里 `if (!el) return` 一类的静默失败不会被发现）。
        //   容器 id 的单一源＝`components/shell/tab-bar.js::renderTabBar`（`#<prefix>-tab-content`）。
        const rendered = await page.evaluate((pid) => {
          const el = document.getElementById(pid);
          return { has: !!el, len: el ? el.innerHTML.trim().length : -1 };
        }, `${w.page}-tab-content`);
        assert.ok(rendered.has,
          `${w.name} · tab「${label}」：容器 #${w.page}-tab-content 不存在 ⇒ 结构漂移（renderTabBar 口径变了？）`);
        assert.ok(rendered.len > 10,
          `${w.name} · tab「${label}」：渲染产物为空（#${w.page}-tab-content innerHTML 长度 ${rendered.len}）⇒ 「加载不出来」`);
        // ── 页题守卫（2026-10-21 R5-B F-01 / R5-C C-02）──
        //   每个 tab 内容区至少一个可见 H2，且 H2 字号统一 20px（含今天页的日期副串）。
        const h2 = await page.evaluate((pid) => {
          const root = document.getElementById(pid);
          const hs = root ? [...root.querySelectorAll('h2')].filter((el) => el.offsetParent !== null) : [];
          return { count: hs.length, sizes: [...new Set(hs.map((el) => Math.round(parseFloat(getComputedStyle(el).fontSize) * 100) / 100))] };
        }, `${w.page}-tab-content`);
        assert.ok(h2.count >= 1, `${w.name} · tab「${label}」缺页级 H2（页题）`);
        assert.deepEqual(h2.sizes.filter((px) => px !== 20), [],
          `${w.name} · tab「${label}」H2 字号不统一（应为 20px，实测 ${h2.sizes.join(' / ')}）`);
        await audit(label, '默认', true);
        // 二级视图（批次 47-C）：点开「矩阵显示全部 N 项」后再审一遍
        for (const t of SUBVIEW_TRIGGERS) {
          const n = await page.evaluate((sel) => {
            const els = [...document.querySelectorAll(sel)].filter((e) => e.offsetParent !== null);
            els.forEach((e) => e.click());
            return els.length;
          }, t.sel);
          if (!n) continue;
          await page.waitForTimeout(700);
          await audit(label, t.name, false);
        }
        // 视图切换：按 `[data-view]` 的不同取值逐一点过去（第一个通常即默认态，跳过）
        const views = await page.$$eval('[data-view]', (els) => [...new Set(els.map((e) => e.getAttribute('data-view')))]);
        for (const val of views.slice(1)) {
          await page.evaluate((x) => document.querySelector('[data-view="' + x + '"]')?.click(), val);
          await page.waitForTimeout(700);
          await audit(label, '视图切换:' + val, false);
        }
      }
      if (probeLog.length) console.log(`[探针·自建列表候选] ${probeLog.length} 处\n  ${probeLog.join('\n  ')}`);
      // ── 390×844 窄屏审次（2026-10-21 Task 7 / B-499-10）──
      //  判据：逐 tab `documentElement.scrollWidth ≤ innerWidth + 1`（页面主体不横向溢出）；
      //  矩阵容器允许表内滚动，但必须有**卡式或滚动兜底**（不能把宽表原样塞进 390px）。
      //  ⚠ 同环境纪律（S2）：CDN 工具类（.flex / .w-full / .overflow-x-auto…）承载布局，
      //    静音后量到的是「测试环境专属溢出」⇒ 本审次先 unroute Tailwind 并重载，再量。
      await page.unroute('**://cdn.tailwindcss.com/**');
      await page.reload({ waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});
      await page.waitForFunction(() => document.querySelectorAll('[aria-label="工作台页签"] button[role="tab"]').length > 0, { timeout: 45000 });
      const twReady = await page.evaluate(() => {
        const el = document.querySelector('.ws-tab-scroll');
        return !!el && getComputedStyle(el).display === 'flex';
      });
      assert.ok(twReady, `${w.name} · 390 审次需要 Tailwind 布局工具类（CDN 未加载 ⇒ 宽表量测不成立）`);
      await page.setViewportSize({ width: 390, height: 844 });
      await page.waitForTimeout(500);
      const narrowIssues = [];
      for (const label of labels) {
        await page.evaluate((l) => {
          [...document.querySelectorAll('[aria-label="工作台页签"] button[role="tab"]')].find((x) => x.textContent.includes(l))?.click();
        }, label);
        await page.waitForTimeout(600);
        const audit390 = await page.evaluate((pid) => {
          const de = document.documentElement;
          const root = document.querySelector(`#${pid} .rm-root`);
          let matrix = null;
          if (root) {
            const table = root.querySelector('table.rm-table');
            const row = table?.querySelector('tbody tr');
            const thead = table?.querySelector('thead');
            const scroller = root.querySelector('.rm-scroll');
            matrix = {
              cardMode: !!row && getComputedStyle(row).display === 'block',
              theadHidden: !!thead && getComputedStyle(thead).display === 'none',
              scrollFallback: !!scroller && /auto|scroll/.test(getComputedStyle(scroller).overflowX),
            };
          }
          return {
            overflow: de.scrollWidth - window.innerWidth,
            matrix,
            // 2026-10-26 Task 3.5：分组胶囊在所有宽度可见（含 390）⇒ 窄屏只缩不隐藏。
            groupLabelsVisible: [...document.querySelectorAll('.tab-group-label')].filter((el) => el.offsetParent !== null).length,
          };
        }, `${w.page}-tab-content`);
        if (audit390.overflow > 1) narrowIssues.push(`[${label}] scrollWidth 超出视口 ${audit390.overflow}px`);
        if (audit390.groupLabelsVisible === 0) narrowIssues.push(`[${label}] 390px 未渲染分组标签（胶囊应全宽可见）`);
        if (audit390.matrix && !audit390.matrix.cardMode && !audit390.matrix.scrollFallback) {
          narrowIssues.push(`[${label}] 矩阵既未卡式化也无滚动兜底`);
        }
      }
      assert.deepEqual(narrowIssues, [], `${w.name} · 390×844 窄屏横向溢出 / 矩阵兜底缺失：\n${narrowIssues.join('\n')}`);
      await page.setViewportSize({ width: 1280, height: 720 });
      assert.ok(SWEEP.lists + SWEEP.cells + SWEEP.ctrls > 0, `${w.name} 未普查到任何列表 / 数据格 / 控件（普查空转）`);
      assert.deepEqual(errs, [], `${w.name} 出现脚本错误：\n${errs.join('\n')}`);
      assert.deepEqual(report, [], `${w.name} 分页 / 宽表 / 检索 / 尺规普查不通过：\n${report.map((r) => `[${r.tab}] ${r.rule} ${JSON.stringify(r)}`).join('\n')}`);
    } finally {
      await page.close();
    }
  });
}

// S20（2026-10-05 批次 386 · objective #7）：**tab 快速切换竞态**——各 tab 的 `render` 是动态 import，
//   **import 解析后才写共享容器** `#<prefix>-tab-content` ⇒ 「先点（更早发起 import）的 tab 其模块后到」
//   会覆盖当前 tab 的内容（症状＝高亮停在后点的 tab、内容却是先点的那个；快速连切时必现，读起来像
//   「点了 tab 加载不出来」）。判据＝**冷上下文**（模块未缓存）0ms 连点全部 tab，落定后容器内容
//   必须仍等于「再点一次末个 tab」（此时其模块已缓存、必渲染正确）的内容；两者不等即「陈旧渲染覆盖」。
//   ⚠ 本用例只在**登录后的冷页面**做（顺序逐 tab 普查那批的模块已缓存 ⇒ 复现不出竞态）。
test('S20 tab 快速切换竞态：冷上下文连点全部 tab，内容不得落到陈旧 tab', async () => {
  const w = WORKS[0];
  const page = await browser.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message));
  const innerText = (pid) => page.evaluate((id) => (document.getElementById(id)?.innerText || '').replace(/\s+/g, ' ').trim(), pid);
  const clickLabel = (l) => page.evaluate((x) => {
    [...document.querySelectorAll('button[role="tab"]')].find((t) => t.textContent.includes(x))?.click();
  }, l);
  try {
    // 静音项取 `MUTED_EXTERNALS` **单一源**（`S2` 按字面 `page.route` 调用计数 ⇒ 此处不再写第二份字面，免重复计数）
    for (const m of MUTED_EXTERNALS) await page.route(m.pattern, (r) => r.abort());
    // 让**首个 tab**（「今天」）的模块慢到 600ms 才返回 ⇒ 它在冷上下文里**必然后于**其余 tab 的模块落定，
    //   从而把「先点的 tab 后到」这一竞态**确定性**复现（本地 localhost 各模块同速 ⇒ 不注入延迟则复现不稳）。
    //   ⚠ 用变量（非字面）挂路由：`S2` 只认字面 `page.route` 调用计数，多一份字面即让它误判。
    const SLOW_TAB = '**/tabs/today/today-tab.js*';
    await page.route(SLOW_TAB, async (r) => { await new Promise((s) => setTimeout(s, 600)); await r.continue(); });
    let loggedIn = false;
    for (let attempt = 0; attempt < 2 && !loggedIn; attempt += 1) {
      await page.goto(`${base}/login.html`, { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('#student-id', { timeout: 30000 });
      await page.fill('#student-id', w.studentId);
      await page.fill('#password', '123456');
      await Promise.all([
        page.waitForURL(`**/workspace/${w.page}.html`, { timeout: 30000 }),
        page.click('button[type="submit"]'),
      ]);
      try {
        await page.waitForFunction(() => document.querySelectorAll('button[role="tab"]').length > 0, { timeout: 45000 });
        loggedIn = true;
      } catch (e) {
        if (attempt === 1) throw e;
      }
    }
    await page.waitForTimeout(800);
    const labels = await page.$$eval('button[role="tab"]', (els) => els.map((e) => e.textContent.trim()));
    assert.ok(labels.length >= 6, `${w.name} tab 数过少（${labels.length}）：竞态用例样本不足`);
    // 冷上下文 0ms 连点全部 tab（各 tab 动态 import 近同时发起 ⇒ 落定顺序不定）
    for (const l of labels) await clickLabel(l);
    await page.waitForTimeout(3000);
    const last = labels[labels.length - 1];
    const rendered = await innerText(`${w.page}-tab-content`);
    // 参照：再点一次末个 tab（其模块此时已缓存 ⇒ 必渲染正确）
    await clickLabel(last);
    await page.waitForTimeout(1500);
    const settled = await innerText(`${w.page}-tab-content`);
    assert.ok(settled.length > 10, `${w.name} · tab「${last}」单独重渲染产物为空（长度 ${settled.length}）`);
    assert.equal(rendered, settled,
      `${w.name}：连点全部 tab 后，内容落到了**陈旧 tab**（当前应为「${last}」）——`
      + '陈旧渲染覆盖了当前 tab（objective #7「tab 在切换和加载中存在加载不出来」）。\n'
      + `  连点后前 60 字：${rendered.slice(0, 60)}\n  应为前 60 字：${settled.slice(0, 60)}`);
    assert.deepEqual(errs, [], `${w.name} 快速切换出现脚本错误：\n${errs.join('\n')}`);
  } finally {
    await page.close();
  }
});

// S21（2026-10-05 批次 387；2026-10-25 IA 62→45 改准）：**组织台活动深链落点**——`?activityId=` / `?view=activities`
//   必须落「工作概况」并**展开页内活动日历折叠卡**后定位（原「活动日历」页签已降为折叠卡）。
//   判据＝① 活动 tab 名 == 「工作概况」；② 日历骨架在位且折叠卡已展开；③ 目标活动条目在月历里
//   （**且月份切到该活动所在月**，否则旧月活动不在当前视图、高亮落空）。
test('S21 组织台活动深链：?activityId / ?view=activities 落「工作概况」并展开日历卡定位', async () => {
  const w = WORKS[1]; // 组织委员台
  const page = await browser.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message));
  const activeLabel = () => page.evaluate(() => {
    const b = [...document.querySelectorAll('button[role="tab"]')].find((e) => e.getAttribute('aria-selected') === 'true');
    return b ? b.textContent.trim() : null;
  });
  const tabReady = () => page.waitForFunction(() => document.querySelectorAll('button[role="tab"]').length > 0, { timeout: 45000 });
  try {
    for (const m of MUTED_EXTERNALS) await page.route(m.pattern, (r) => r.abort());
    let loggedIn = false;
    for (let attempt = 0; attempt < 2 && !loggedIn; attempt += 1) {
      await page.goto(`${base}/login.html`, { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('#student-id', { timeout: 30000 });
      await page.fill('#student-id', w.studentId);
      await page.fill('#password', '123456');
      await Promise.all([
        page.waitForURL(`**/workspace/${w.page}.html`, { timeout: 30000 }),
        page.click('button[type="submit"]'),
      ]);
      try { await tabReady(); loggedIn = true; } catch (e) { if (attempt === 1) throw e; }
    }
    await page.waitForTimeout(800);
    // 取一个真实活动（优先「非当前月」者，顺带验证切月）
    const acts = await page.evaluate(async () => {
      const m = await import('/src/core/base/state.js?v=20261031a');
      return ((m.getAppState() || {}).activities || []).map((x) => ({ id: x.id, date: x.date }));
    });
    assert.ok(acts.length > 0, '组织台活动深链用例：未取到任何活动（样本不足）');
    const cur = new Date().toISOString().slice(0, 7);
    const act = acts.find((x) => String(x.date || '').slice(0, 7) !== cur) || acts[0];
    // ① ?activityId=
    await page.goto(`${base}/workspace/${w.page}.html?activityId=${encodeURIComponent(act.id)}`, { waitUntil: 'domcontentloaded' });
    await tabReady();
    await page.waitForTimeout(2000);
    assert.equal(await activeLabel(), '工作概况', '?activityId= 应落「工作概况」（活动日历页签已降为页内卡）');
    assert.ok(await page.evaluate(() => !!document.querySelector('#cal-main-grid')), '活动日历骨架未渲染');
    assert.ok(await page.evaluate(() => !!document.querySelector('#ov-calendar-card[open]')), '活动日历折叠卡未展开（深链丢落点）');
    const cnt = await page.evaluate((id) => document.querySelectorAll(`.cal-activity-item[data-act-id="${id}"]`).length, act.id);
    assert.ok(cnt >= 1, `定位失败：月历里找不到目标活动条目（${act.id}）——月份未切到该活动所在月？`);
    if (String(act.date || '').slice(0, 7) !== cur) {
      assert.equal(await page.evaluate(() => document.getElementById('month-selector')?.value || null), String(act.date).slice(0, 7),
        '旧月活动的深链应把月份切到该活动所在月（否则高亮落空）');
    }
    // ② ?view=activities（首页「查看全部活动」同款）
    await page.goto(`${base}/workspace/${w.page}.html?view=activities`, { waitUntil: 'domcontentloaded' });
    await tabReady();
    await page.waitForTimeout(1500);
    assert.equal(await activeLabel(), '工作概况', '?view=activities 应落「工作概况」（活动日历页签已降为页内卡）');
    assert.ok(await page.evaluate(() => !!document.querySelector('#cal-main-grid')), '?view=activities：活动日历骨架未渲染');
    assert.deepEqual(errs, [], `组织台活动深链出现脚本错误：\n${errs.join('\n')}`);
  } finally {
    await page.close();
  }
});

// S1：普查「非空转」证明——若全部列表都短于门槛（无一条 > 10 行）、矩阵与手写表格一条也没碰到，
//    那 P1/P2/P3 就是**恒真**（查了个寂寞）。故断言普查确实覆盖到「本该分页」的样本。
//    ⚠ 依赖顶层 test 串行执行（本仓 `npm test` 固定 `--test-concurrency=1`）。
test('S1 普查非空转：确实覆盖到「本该分页的列表 / 矩阵人维 / 手写表格」样本', () => {
  // 当前基线：45 个角色页签（2026-10-25 IA 62→45 后实测；单一源＝各台能力注册）。
  const TAB_BASELINE = 45;
  console.log(`[普查覆盖] tab=${SWEEP.tabs} 引擎列表=${SWEEP.lists}（其中总数>10 的 ${SWEEP.listsOverPage}）矩阵=${SWEEP.matrices} 手写表格=${SWEEP.tables}`);
  // 总数由注册表现算（逐台实测累积），而不是散落的历史门槛：
  const registeredTabs = Object.values(SWEEP.byPage).reduce((sum, n) => sum + n, 0);
  assert.equal(SWEEP.tabs, registeredTabs,
    `普查审次 ${SWEEP.tabs} 与逐台注册页签合计 ${registeredTabs} 不一致（某台 tab 未渲染或重复计数）`);
  assert.equal(registeredTabs, TAB_BASELINE,
    `逐台注册页签合计 ${registeredTabs} 与当前基线 ${TAB_BASELINE} 不一致：改页签须同批改本条基线`);
  assert.ok(SWEEP.listsOverPage >= 12, `「总数 > 10 的引擎列表」样本少于基线 12（实测 ${SWEEP.listsOverPage}）：分页断言可能恒真`);
  // 2026-10-20 第三轮 IA 判例③：组织台思想汇报的全量「人 × 期次」矩阵撤除（收窄为例外清单）
  //   ⇒ 矩阵样本由 2 降为 1（报名总表仍在）。门槛按实测值改准为 1；P2 的「人维 ≤10」判据不变。
  assert.ok(SWEEP.matrices >= 1, `矩阵样本少于基线 1（实测 ${SWEEP.matrices}）：人维分页断言可能恒真`);
  assert.ok(SWEEP.tables >= 2, `手写表格样本少于基线 2（实测 ${SWEEP.tables}）：P3 断言恒真`);
  // 批次 47-C：二级视图扩围的「非空转」——审次不得少于 tab 数（否则扩围未生效），
  //   且转置视图必须真被审到过（否则 P10 恒真）。
  assert.ok(SWEEP.views >= SWEEP.tabs, `审次（${SWEEP.views}）少于 tab 数（${SWEEP.tabs}）：二级视图扩围未生效`);
  assert.ok(SWEEP.matrixTransposed >= 1, `转置视图一次都没审到（实测 ${SWEEP.matrixTransposed}）：P2 的「人维在列」分支恒真`);
  // P11 待修台账防僵尸：每条都必须在真机里命中过，否则说明它已被修好（应删除）或选择器已失配
  const zombie = CARD_LIST_PENDING.filter((p) => !PENDING_SEEN.has(p.sig));
  assert.deepEqual(zombie.map((p) => p.where), [],
    `P11 待修台账僵尸：以下条目在真机里再也命中不到——已修好则应删条目，否则说明选择器失配：\n  ${zombie.map((p) => `${p.where} [${p.sig}]`).join('\n  ')}`);
});

// S22（R2-30，2026-10-20 改准）：组织台落点必须是**结构化映射**，不得再靠 DOM 文案补丁。
test('S22 组织台概况缺口有真实落点，履职卡不再指向已摘除的 development', () => {
  const orgOverview = readFileSync(join(import.meta.dirname, '..', '..', 'docs', 'src', 'entries', 'tabs', 'org', 'overview-tab.js'), 'utf8');
  assert.doesNotMatch(orgOverview, /data-org-gap-tab|\.wfd-duty\[data-tab="development"\]/, '不得再按 DOM 文案补按钮 / 原地改 data-tab');
  const duty = readFileSync(join(import.meta.dirname, '..', '..', 'docs', 'src', 'components', 'governance', 'workforce-duty-card.js'), 'utf8');
  assert.match(duty, /'develop-party-member': 'talent'/, '发展党员须直接映射人才库');
  const overview = readFileSync(join(import.meta.dirname, '..', '..', 'docs', 'src', 'components', 'governance', 'work-overview.js'), 'utf8');
  for (const tab of ['taskforce', 'calendar', 'member-flow']) {
    assert.ok(overview.includes(`gapTab: '${tab}'`), `条线缺口缺少结构化落点：${tab}`);
  }
});

test('S23 人才库考察/汇报提示分离，录入考察文案归一', () => {
  const src = readFileSync(join(import.meta.dirname, '..', '..', 'docs', 'src', 'entries', 'tabs', 'org', 'talent-tab.js'), 'utf8');
  assert.match(src, /function _devTips\(/, '提示须返回可并存的数组');
  assert.match(src, /label: '考察'/, '考察缺口须独立标注');
  assert.match(src, /label: '汇报'/, '汇报缺口须独立标注');
  assert.match(src, /收起录入' : '录入考察'/, '外层动作统一为「录入考察」');
  assert.match(src, /_normalizeInspectionCopy/, '内嵌考察子页文案须归一');
});

// S19（2026-10-05 批次 382）：**台账对账**——`README-server.md §3.2` 标题的「共 N 个」与各台
//   `#### 3.2.x …— N 个` 必须等于**真机逐台实测的页签数**（判据单一源＝各台能力注册）。
// 来源：批次 375 登记的「`README-server §3.2.x` 三张表**未立机器判据**」——本批机械化，
//   防「改一个台、忘了改 README 台账」这类漂移（S17/S18 只守 `help.html` 侧，README 侧此前是空白）。
// ⚠ **只对「计数」对账**：表内页签名逐字比照因写法而异（★ 标记 / `1-3` 合并行 / 特例段）⇒ 另计、不在本断言内。
// 2026-10-20 IA 修复批次后实测：支书 12 · 组织 10 · 宣传 8 · 纪检 8 · 组长 10 · 成员 11 · 党委 3 ＝ **62**。
// ⚠ 依赖顶层串行（本仓 `npm test` 固定 `--test-concurrency=1`），故能读到上一跑累积的 `SWEEP.byPage`。
test('S19 台账对账：README-server §3.2 各台页签数与真机实测一致（计数同源）', () => {
  const doc = readFileSync(join(import.meta.dirname, '..', '..', 'README-server.md'), 'utf8');
  const totalM = /^### 3\.2 各工作台页签（共 (\d+) 个）/m.exec(doc);
  assert.ok(totalM, 'README-server §3.2 标题未解析到「共 N 个」（解析失效？台账格式变了）');
  const declared = {};
  for (const m of doc.matchAll(/^#### 3\.2\.\d [^\n]*?`([a-z-]+)\.html`[^\n]*?— (\d+) 个/gm)) declared[m[1]] = Number(m[2]);
  assert.equal(Object.keys(declared).length, 7,
    `§3.2.x 应登记七台，实解析到 ${Object.keys(declared).length} 台（解析失效或台账漏台）`);
  assert.deepEqual(Object.keys(SWEEP.byPage).sort(), Object.keys(declared).sort(),
    `§3.2.x 登记的台与真机普查的台不一致：台账 ${JSON.stringify(declared)} · 实测 ${JSON.stringify(SWEEP.byPage)}`);
  for (const p of Object.keys(SWEEP.byPage)) {
    assert.equal(SWEEP.byPage[p], declared[p],
      `${p} 台：§3.2.x 台账写 ${declared[p]} 个 · 真机实测 ${SWEEP.byPage[p]} 个（改页签须同批改 README-server §3.2.x 计数）`);
  }
  const declSum = Object.values(declared).reduce((a, b) => a + b, 0);
  const realSum = Object.values(SWEEP.byPage).reduce((a, b) => a + b, 0);
  assert.equal(declSum, Number(totalM[1]), `§3.2.x 各台计数之和 ${declSum} ≠ 标题「共 ${totalM[1]} 个」`);
  assert.equal(realSum, Number(totalM[1]), `真机七台合计 ${realSum} ≠ 标题「共 ${totalM[1]} 个」`);
  // 根 `README.md` 同一事实的第二处引用（「各工作台逐枚页签（共 N 个）见其 §3.2」）——同批对账
  const rootDoc = readFileSync(join(import.meta.dirname, '..', '..', 'README.md'), 'utf8');
  const rootM = /逐枚页签\*\*（共 (\d+) 个）/.exec(rootDoc);
  assert.ok(rootM, 'README.md 未解析到「各工作台逐枚页签（共 N 个）」（解析失效或该句已改写法）');
  assert.equal(Number(rootM[1]), Number(totalM[1]),
    `根 README.md 写「共 ${rootM[1]} 个」· README-server §3.2 标题写「共 ${totalM[1]} 个」⇒ 两处同源须同改`);
});

// S2（2026-09-15 批次 47-B 新增）：**普查环境自检**——真机 ≠ 真环境。
// 来源：批 43 的普查把 `cdn.tailwindcss.com` 静音了，而 workspace 页**依赖**它；其 `.text-xs`(12px)
//   会压过 `.data-table` 的 13px（继承输给直接声明）→ **这个越界在普查环境里根本不存在**：
//   真机报 0 违规，生产实际 12px（支书实报「人作首列的表格字体很小」，考勤明细三处即此）。
// 纪律（支书 2026-09-15 裁定）：**真机普查必须在与生产同环境下量测——环境被静音，普查即自欺**。
//   可执行口径：凡静音项都要逐条登记「为何不影响被测属性」；若某资源确实会影响被测属性，
//   则必须先把该属性做成「与它无关」（如单档直接声明到 th/td，见 filter-row D3）。
test('S2 普查环境自检：静音的外部资源必须逐条登记理由（且与台账一致）', () => {
  const src = readFileSync(new URL(import.meta.url), 'utf8');
  const muted = [...src.matchAll(/page\.route\('([^']+)'/g)].map((m) => m[1]).sort();
  assert.ok(muted.length > 0, '未解析到任何 page.route 静音项（解析失效？普查环境不可知）');
  assert.deepEqual(muted, MUTED_EXTERNALS.map((m) => m.pattern).sort(),
    'page.route 静音清单与台账 MUTED_EXTERNALS 不一致——新增/删除静音项须同步台账并写明理由');
  for (const m of MUTED_EXTERNALS) {
    assert.ok(String(m.why || '').trim().length >= 10, `${m.pattern} 的静音理由缺失或过短`);
  }
});

// S3（2026-09-15 批次 47-B 新增）：尺规普查「非空转」证明——样本不足会让 P6/P7 恒真。
test('S3 尺规普查非空转：控件/数据格样本须达基线', () => {
  console.log(`[尺规覆盖] 控件=${SWEEP.ctrls} 数据格=${SWEEP.cells} 裸控件=${SWEEP.bareCtrl} 分页钮=${SWEEP.pagers}`);
  assert.ok(SWEEP.ctrls >= 40, `控件样本少于基线 40（实测 ${SWEEP.ctrls}）：P6 断言可能恒真`);
  assert.ok(SWEEP.cells >= 200, `数据格样本少于基线 200（实测 ${SWEEP.cells}）：P7 断言可能恒真`);
  assert.ok(SWEEP.pagers >= 1, `分页钮样本为 0（实测 ${SWEEP.pagers}）：P9 断言可能恒真`);
});
