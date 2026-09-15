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
// 判据说明：只对「真渲染出的行」断言——分页生效时行数天然 ≤ 10，故 P1/P3 命中的正是「渲染全量且无翻页」
//   这一类**病态列表**（即支书体验到的那类），不会因分页正常工作而误报。
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from 'playwright';
import { createApp } from '../app.js';
import { seedDatabase } from '../seed.js';

/** 七个工作台 × 登录账号（与 docs/src/mock/accounts.js 的演示账号一致） */
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

/** 引擎「检索条出现门槛」的单一源（docs/src/core/constants.js::SEARCH_FILTER_MIN_ROWS）——见下方 S0 断言 */
const MIN_ROWS = 8;

/** 当前 tab 内容的 DOM 普查（纯只读断言，返回 {violations, stats}） */
const AUDIT = (minRows) => {
  const v = [];
  const stats = { lists: 0, listsOverPage: 0, matrices: 0, tables: 0 };
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
  // P2 宽表矩阵：人维分页生效（≤10 行）+ 计数口径
  document.querySelectorAll('.rm-root').forEach((root) => {
    stats.matrices += 1;
    const rows = root.querySelectorAll('tbody tr').length;
    if (rows > 10) v.push({ rule: 'P2 矩阵人维超一页', rows });
    const cnt = txt(root.querySelector('.rm-pager .lf-count'));
    if (cnt && !/^共 \d+ 人 · 第 \d+ \/ \d+ 页$/.test(cnt)) v.push({ rule: 'P2 矩阵计数口径', cnt });
    const heads = [...root.querySelectorAll('thead th')].map((th) => txt(th));
    if (heads.length && heads[0] !== '姓名' && heads[0] !== '成员' && heads[0] !== '负责人') {
      v.push({ rule: 'P2 矩阵首列非人/项目维', head: heads[0] });
    }
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
  return { violations: v, stats };
};

/** 普查覆盖统计（跨工作台累加；用于最后断言「普查没有空转」） */
const SWEEP = { tabs: 0, lists: 0, listsOverPage: 0, matrices: 0, tables: 0 };

// S0：普查口径的单一源守卫——普查用的门槛值必须是引擎单一源的值（改门槛须同步本普查，防口径漂移）
test('S0 普查门槛取值来自单一源（core/constants.js::SEARCH_FILTER_MIN_ROWS）', () => {
  const src = readFileSync(join(import.meta.dirname, '..', '..', 'docs', 'src', 'core', 'constants.js'), 'utf8');
  const m = /SEARCH_FILTER_MIN_ROWS\s*=\s*(\d+)/.exec(src);
  assert.ok(m, 'core/constants.js 须定义 SEARCH_FILTER_MIN_ROWS');
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

      const labels = await page.$$eval('button[role="tab"]', (els) => els.map((e) => e.textContent.trim()));
      assert.ok(labels.length > 0, `${w.name} 未渲染任何 tab`);

      const report = [];
      for (const label of labels) {
        // 用 evaluate 点击（避免浮层遮挡），再等内容渲染
        await page.evaluate((l) => {
          [...document.querySelectorAll('button[role="tab"]')].find((x) => x.textContent.includes(l))?.click();
        }, label);
        await page.waitForTimeout(1100);
        const { violations, stats } = await page.evaluate(AUDIT, MIN_ROWS);
        SWEEP.tabs += 1;
        for (const k of ['lists', 'listsOverPage', 'matrices', 'tables']) SWEEP[k] += stats[k] || 0;
        for (const v of violations) report.push({ tab: label, ...v });
      }
      assert.ok(SWEEP.lists > 0, `${w.name} 未普查到任何引擎列表（普查空转）`);
      assert.deepEqual(errs, [], `${w.name} 出现脚本错误：\n${errs.join('\n')}`);
      assert.deepEqual(report, [], `${w.name} 分页 / 宽表 / 检索普查不通过：\n${report.map((r) => `[${r.tab}] ${r.rule} ${JSON.stringify(r)}`).join('\n')}`);
    } finally {
      await page.close();
    }
  });
}

// S1：普查「非空转」证明——若全部列表都短于门槛（无一条 > 10 行）、矩阵与手写表格一条也没碰到，
//    那 P1/P2/P3 就是**恒真**（查了个寂寞）。故断言普查确实覆盖到「本该分页」的样本。
//    ⚠ 依赖顶层 test 串行执行（本仓 `npm test` 固定 `--test-concurrency=1`）。
test('S1 普查非空转：确实覆盖到「本该分页的列表 / 矩阵人维 / 手写表格」样本', () => {
  console.log(`[普查覆盖] tab=${SWEEP.tabs} 引擎列表=${SWEEP.lists}（其中总数>10 的 ${SWEEP.listsOverPage}）矩阵=${SWEEP.matrices} 手写表格=${SWEEP.tables}`);
  // 实测基线（2026-09-15 首次普查）：65 tab / 53 个引擎列表（其中 12 个总数 > 10）/ 4 个矩阵 / 2 张手写表格
  assert.ok(SWEEP.tabs >= 65, `普查 tab 数少于基线 65（实测 ${SWEEP.tabs}）：普查范围缩水或某台 tab 未渲染`);
  assert.ok(SWEEP.listsOverPage >= 12, `「总数 > 10 的引擎列表」样本少于基线 12（实测 ${SWEEP.listsOverPage}）：分页断言可能恒真`);
  assert.ok(SWEEP.matrices >= 4, `矩阵样本少于基线 4（实测 ${SWEEP.matrices}）：人维分页断言可能恒真`);
  assert.ok(SWEEP.tables >= 2, `手写表格样本少于基线 2（实测 ${SWEEP.tables}）：P3 断言恒真`);
});
