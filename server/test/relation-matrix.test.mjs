// server/test/relation-matrix.test.mjs — 「人 × 项目」矩阵单一源守卫（2026-09-14 批次 35）
//
// 支书指令：「活动的考勤考察还是以 long form 为主……wide form 是不是更简明？人和活动/专班分离开后存在一种
//   转置方式！第一列是人的话就能展示他参加的项目；第一列是项目就能看有哪些人。这是一个很全局性的工程！」
// 支书裁定：① **宽表默认**（long form 降为「明细/导出」下钻）；② 矩阵**推广到其它二元关系域**。
//
// 本守卫锁三件事：
//   结构层 S1 组件单一源在位（转置双视图 + 项目维列上限 6 + 横向滚动 + 首列吸附 + 一键展开）
//   结构层 S2 参与方不得自造矩阵（矩阵表头/横向滚动容器只允许出现在组件内）
//   结构层 S3 宽表默认（考勤默认「按人」、考察默认宽表）
//   结构层 S4 矩阵类实现收敛台账（未迁移的另一类矩阵须登记白名单，防「悄悄长第四套」）
//   结构层 S6 思想汇报台账＝人 × 期次（批次 41，Q-23-18 余项收口；不得回潮按人分组的自建列表）
//   真机层 ① 两个域都跑一遍：默认宽表 → 列上限 6 → 一键展开 → 切到转置视图（行列互换）
//   真机层 ② 思想汇报台账：行＝人（每页 10）、列＝期次（新→旧、封顶 6）、cell 徽标可下钻
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { chromium } from 'playwright';
import { createApp } from '../app.js';
import { seedDatabase } from '../seed.js';

const ROOT = join(import.meta.dirname, '..', '..');
const SRC_DIR = join(ROOT, 'docs', 'src');
const MATRIX = join(SRC_DIR, 'components', 'ui', 'relation-matrix.js');

const read = (f) => readFileSync(f, 'utf8');
const rel = (f) => relative(SRC_DIR, f).split('\\').join('/');
function walkJs(dir, out = []) {
  for (const n of readdirSync(dir)) {
    const f = join(dir, n);
    if (statSync(f).isDirectory()) walkJs(f, out);
    else if (n.endsWith('.js')) out.push(f);
  }
  return out;
}

test('S1 矩阵组件单一源在位：转置双视图 + 项目维列上限 6 + 人维分页 + 横向滚动 + 首列吸附 + 一键展开', () => {
  const src = read(MATRIX);
  assert.match(src, /export function renderRelationMatrix/, '须导出 renderRelationMatrix');
  assert.match(src, /export const MATRIX_COL_LIMIT = 6/, '项目维列上限须为 6（最近 6 项）');
  assert.match(src, /byPerson/, '须支持「行=人」视图');
  assert.match(src, /byItem/, '须支持「行=项目」视图（与 byPerson 互为转置）');
  assert.match(src, /overflow-x-auto/, '须提供横向滚动容器');
  assert.match(src, /sticky left-0/, '首列须吸附（横向滚动时维度名不丢）');
  assert.match(src, /rm-toggle/, '须提供「显示全部 N 项 / 只看最近 6 项」一键展开钮');
  // 批次 38（支书裁定「人维一并分页」）：人维分页须在组件内，且翻页控件走统一引擎 pagerHtml 单一源
  assert.match(src, /export const MATRIX_ROW_LIMIT = 10/, '人维每页须为 10 人（与统一检索引擎同档）');
  assert.match(src, /import \{ pagerHtml \} from '\.\/pager\.js/, '人维翻页须复用单一源 pager.js（不得经 list-filter 引入，避免成环）');
  assert.match(src, /rm-pager/, '须渲染人维翻页区（.rm-pager）');
  assert.ok(!/class="page-btn"|class="page-num/.test(src), '矩阵不得自造翻页标记（须由 pagerHtml 单一源产出）');
  // 2026-10-21 Task 7 / B-499-10：≤640px 堆叠＝同一关系行的响应式形态（不是第二套矩阵）
  assert.match(src, /<table class="data-table rm-table" data-responsive="cards">/, '窄屏须与引擎表共用 data-responsive="cards"（同一张表）');
  assert.match(src, /class="rm-scroll[^"]*"/, '矩阵滚动容器须挂 .rm-scroll（窄屏解除限高/横滚）');
  assert.match(src, /data-label="\$\{esc\(label\)\}"/, '每个单元格须带 data-label（当前可见列名）作卡式字段名');
  assert.match(src, /cellOf\(p\.id, it\.id, it\.title\)/, 'byPerson：卡内逐项目名（一人一卡）');
  assert.match(src, /cellOf\(p\.id, it\.id, p\.name\)/, 'byItem：卡内逐人姓名（一项一卡）');
});

test('S2 参与方不得自造矩阵：矩阵表头与横向滚动容器只允许出现在组件内', () => {
  const offenders = [];
  for (const f of walkJs(SRC_DIR)) {
    if (f === MATRIX) continue;
    const src = read(f);
    src.split(/\r?\n/).forEach((line, i) => {
      const t = line.trimStart();
      if (t.startsWith('//') || t.startsWith('*') || t.startsWith('/*')) return;
      if (/<th class="sticky left-0"/.test(line)) offenders.push(`${rel(f)}:${i + 1} 自造矩阵表头`);
    });
  }
  assert.deepEqual(offenders, [], `人×项目矩阵一律走 components/ui/relation-matrix.js：\n${offenders.join('\n')}`);
});

test('S3 宽表默认：考勤矩阵默认「按人」、考察默认宽表（long form 降为明细/导出）', () => {
  const att = read(join(SRC_DIR, 'entries', 'tabs', 'disc', 'attendance-tab.js'));
  assert.match(att, /let matrixView = 'byPerson'/, '考勤矩阵须默认「按人」宽表');
  assert.match(att, /renderRelationMatrix\(/, '考勤矩阵须接入单一源组件');
  const insp = read(join(SRC_DIR, 'entries', 'tabs', 'disc', 'inspection-tab.js'));
  assert.match(insp, /let currentView = 'wide'/, '考察须默认宽表（按人）');
  assert.match(insp, /renderRelationMatrix\(/, '考察须接入单一源组件');
  assert.match(insp, /data-view="wideItem"/, '考察须提供「按项目」＝转置视图');
  assert.match(insp, /data-view="long"[^>]*>明细</, 'long form 须降为「明细」角色');
});

test('S4 矩阵类实现收敛台账：全站只允许单一源矩阵（表态矩阵已于批次 39 并入，白名单为空）', () => {
  // 2026-09-14 批次 39：表态汇总矩阵（议题 × 应到成员）已并入 relation-matrix，`.vs-matrix` 自建表格撤除。
  // 判据用**语义标记**（是否自建矩阵表格 `<table class="vs-matrix"`）而非字面词——注释里的历史说明不算实现。
  // 白名单留空＝不许再长第二套；若将来确有第三类矩阵须暂缓迁移，须先登记到本白名单（防僵尸：登记后仍随本守卫复检）。
  const ALLOW = new Set();
  const hits = [];
  for (const f of walkJs(SRC_DIR)) {
    const r = rel(f);
    if (ALLOW.has(r)) continue;
    if (/<table class="vs-matrix"/.test(read(f))) hits.push(r);
  }
  assert.deepEqual(hits, [], `新的矩阵类实现须先登记待迁白名单（或迁移到 relation-matrix）：\n${hits.join('\n')}`);
});

// S5（2026-09-14 批次 38，支书裁定「人维一并分页」）
// 判据：人维分页是矩阵的**缺省能力**；仅当该域人维本身有界（单场固定名单、非随年份累积）才可豁免，
//   且豁免必须**登记在案**——防「私自关掉分页」与「白名单僵尸」两类回潮。
test('S5 人维分页不得被调用点私自关掉（rowLimit: 0 须登记备案，且白名单防僵尸）', () => {
  const ALLOW = new Set(['components/governance/vote-summary-panel.js']); // 表态矩阵：人维＝本场应到（单场有界），须一屏看全
  const hits = [];
  for (const f of walkJs(SRC_DIR)) {
    const r = rel(f);
    if (r === 'components/ui/relation-matrix.js') continue;
    const src = read(f);
    if (/rowLimit:\s*0\b/.test(src) && !ALLOW.has(r)) hits.push(`${r} 私自关掉人维分页`);
    if (ALLOW.has(r) && !/renderRelationMatrix\(/.test(src)) hits.push(`${r} 白名单僵尸（已不再调用矩阵）`);
  }
  assert.deepEqual(hits, [], hits.join('\n'));
});

// S6（2026-10-21 Task 7 改准）：思想汇报**已撤出矩阵**（2026-10-20 第三轮 IA 判例②）。
// 旧断言要求 `renderRelationMatrix` + `itemLabel: '期次'` + `data-trview="period"` —— 那是「人 × 期次」
// 全量色块矩阵时代的口径，现实现已收窄为「未交 / 待初阅 / 待补充」例外清单：完整记录落个人档案，
// 组织台只回答「现在有谁需要我处理」。本守卫改为锁**现行口径**，并防矩阵 / 按人分组列表回潮。
test('S6 思想汇报已撤出矩阵：组织台只渲染例外清单（未交 / 待初阅 / 待补充）', () => {
  const src = read(join(SRC_DIR, 'entries', 'tabs', 'org', 'thought-review-tab.js'));
  assert.doesNotMatch(src, /renderRelationMatrix\(/, '思想汇报不得回潮「人 × 期次」矩阵');
  assert.doesNotMatch(src, /itemLabel: '期次'/, '不得回潮期次列矩阵');
  assert.doesNotMatch(src, /data-trview=/, '不得回潮按人 / 按期次转置视图');
  assert.ok(!/groupMap|tr-browse-host/.test(src), '不得回潮「按人分组 + 组内每篇一行」的自建列表');
  // 三组例外（顺序＝处理优先级）与分页引擎仍在
  assert.match(src, /const GROUPS = \[/, '须声明例外分组');
  for (const key of ['missing', 'unreviewed', 'revision']) {
    assert.ok(src.includes(`key: '${key}'`), `例外分组缺 ${key}`);
  }
  for (const title of ['未交', '待初阅', '待补充']) {
    assert.ok(src.includes(`title: '${title}'`), `例外分组标题缺「${title}」`);
  }
  assert.match(src, /renderFilteredList\(/, '例外清单仍走统一检索引擎（分页单一源）');
  assert.match(src, /liveMembers\(\)/, '行＝支部在册成员须取实时视图（不得加载期快照）');
  assert.match(src, /comparePeriodDesc/, '期次倒序须走单一源（core/base/period.js → services 再导出）');
  // 状态真值仍须可读（不靠颜色）
  assert.match(src, /STATUS_LABEL/, '「已打回 · 待补充 / 已入库」状态标签须保留');
  assert.match(src, /查看|档案/, '完整记录出口（查看 / 档案）须保留');
});

// ── 真机层 ────────────────────────────────────────────────────────────
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

async function loginDisc() {
  const page = await browser.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message));
  await page.route('**://fonts.googleapis.com/**', (r) => r.abort());
  await page.route('**://fonts.gstatic.com/**', (r) => r.abort());
  await page.route('**://cdn.tailwindcss.com/**', (r) => r.abort());
  await page.goto(`${base}/login.html`, { waitUntil: 'domcontentloaded' });
  await page.fill('#student-id', '2400012354');
  await page.fill('#password', '123456');
  await Promise.all([
    page.waitForURL('**/workspace/disc.html', { timeout: 15000 }),
    page.click('button[type="submit"]'),
  ]);
  await page.waitForFunction(() => document.querySelectorAll('button[role="tab"]').length > 0, { timeout: 20000 });
  // P0-2 形态断言（2026-09-23 支书裁定「形态必须可断言」）：本文件真机用例必须在 API 形态下跑
  await page.waitForFunction(async () => (await import('/src/data/data-adapter.js?v=20261028a')).getRuntimeMode().source === 'api', null, { timeout: 20000 });
  await page.waitForTimeout(600);
  return { page, errs };
}
const openTab = (page, label) => page.evaluate((l) => {
  [...document.querySelectorAll('button[role="tab"]')].find((x) => x.textContent.includes(l))?.click();
}, label);
/** 组织委员（2400012355 2400012355，role org-commissioner）登录 → 组织台 */
async function loginOrg() {
  const page = await browser.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message));
  await page.route('**://fonts.googleapis.com/**', (r) => r.abort());
  await page.route('**://fonts.gstatic.com/**', (r) => r.abort());
  await page.route('**://cdn.tailwindcss.com/**', (r) => r.abort());
  await page.goto(`${base}/login.html`, { waitUntil: 'domcontentloaded' });
  await page.fill('#student-id', '2400012355');
  await page.fill('#password', '123456');
  await Promise.all([
    page.waitForURL('**/workspace/org.html', { timeout: 15000 }),
    page.click('button[type="submit"]'),
  ]);
  await page.waitForFunction(() => document.querySelectorAll('button[role="tab"]').length > 0, { timeout: 20000 });
  // P0-2 形态断言（2026-09-23 支书裁定「形态必须可断言」）：本文件真机用例必须在 API 形态下跑
  await page.waitForFunction(async () => (await import('/src/data/data-adapter.js?v=20261028a')).getRuntimeMode().source === 'api', null, { timeout: 20000 });
  await page.waitForTimeout(600);
  return { page, errs };
}
const shape = (page) => page.evaluate(() => {
  const root = document.querySelector('#disc-tab-content .rm-root');
  const heads = [...(root?.querySelectorAll('thead th') || [])].map((th) => (th.textContent || '').trim());
  return {
    isMatrix: !!root,
    first: heads[0] || '',
    cols: Math.max(0, heads.length - 1),
    rows: root?.querySelectorAll('tbody tr')?.length ?? 0,
    toggle: root?.querySelector('.rm-toggle')?.textContent?.trim() || '',
  };
});

test('① 考勤/考察宽表真机闭环：默认宽表 → 列上限 6 → 一键展开 → 切转置视图（行列互换）', async () => {
  const { page, errs } = await loginDisc();
  try {
    // 考勤：默认按人（行=人，列=活动）
    await openTab(page, '考勤管理');
    await page.waitForTimeout(1400);
    // 2026-10-20 IA 判例：考勤默认落「确认与录入」；矩阵在「数据查看」二级视图（R3-11 同批）
    await page.evaluate(() => document.querySelector('.att-view-btn[data-att-view="data"]')?.click());
    await page.waitForTimeout(700);
    const att1 = await shape(page);
    assert.ok(att1.isMatrix, '考勤矩阵须渲染为单一源矩阵');
    assert.equal(att1.first, '姓名', '考勤默认视图首列须为「姓名」（宽表默认）');
    assert.ok(att1.cols > 0 && att1.cols <= 6, `项目维列须封顶 6：实测 ${att1.cols}`);
    assert.match(att1.toggle, /显示全部 \d+ 项/, '列超上限时须给一键展开');
    await page.evaluate(() => document.querySelector('#disc-tab-content .rm-toggle')?.click());
    await page.waitForTimeout(300);
    const att2 = await shape(page);
    assert.ok(att2.cols > att1.cols, `展开后列数须增加：${att1.cols} → ${att2.cols}`);
    // 切「按活动」＝转置：首列变「活动」，列数＝人数
    await page.evaluate(() => [...document.querySelectorAll('.att-mtx-view-btn')].find((b) => b.dataset.view === 'byActivity')?.click());
    await page.waitForTimeout(600);
    const att3 = await shape(page);
    assert.equal(att3.first, '活动', '切「按活动」后首列须为「活动」（真转置）');
    assert.notEqual(att3.cols, att2.cols, '转置后列数应变为人数');
    assert.equal(att3.rows, att2.cols, '转置：原列数（活动数）应变为行数');

    // 390×844 窄屏（2026-10-21 Task 7 / B-499-10）：同一张表堆叠为卡式行
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(500);
    const narrowOf = () => page.evaluate(() => {
      const root = document.querySelector('#disc-tab-content .rm-root');
      const table = root?.querySelector('table.rm-table');
      const thead = table?.querySelector('thead');
      const tr = table?.querySelector('tbody tr');
      const scroller = root?.querySelector('.rm-scroll');
      const tds = [...(tr?.querySelectorAll('td') || [])];
      return {
        card: !!tr && getComputedStyle(tr).display === 'block',
        theadHidden: !!thead && getComputedStyle(thead).display === 'none',
        title: (tr?.querySelector('th[scope="row"]')?.textContent || '').trim(),
        labels: tds.map((td) => td.getAttribute('data-label')),
        allLabeled: tds.length > 0 && tds.every((td) => !!td.getAttribute('data-label')),
        inlineScroll: !!scroller && scroller.scrollWidth > scroller.clientWidth + 1,
        docOverflow: document.documentElement.scrollWidth - window.innerWidth,
      };
    });
    const nb = await narrowOf();
    assert.ok(nb.card, '≤640px 矩阵行须堆叠为卡（display:block）');
    assert.ok(nb.theadHidden, '卡式形态下 thead 须隐藏');
    assert.ok(nb.allLabeled, '每个单元格须带 data-label（当前可见列名）');
    assert.ok(!nb.inlineScroll, '卡式形态下矩阵容器不得再横向滚动');
    assert.ok(nb.docOverflow <= 1, `矩阵卡式形态不得撑出页面横向滚动：${nb.docOverflow}px`);
    // byItem（按活动）＝一项一卡：卡内逐人姓名·状态
    assert.ok(nb.title && nb.title !== '姓名', '转置视图卡标题须为项目（活动）');
    assert.ok(nb.labels.every((l) => l && l !== '姓名'), 'byItem 卡内 data-label 须为成员姓名');
    // byPerson（按人）＝一人一卡：卡内逐项目名·状态
    await page.evaluate(() => [...document.querySelectorAll('.att-mtx-view-btn')].find((b) => b.dataset.view === 'byPerson')?.click());
    await page.waitForTimeout(500);
    const np = await narrowOf();
    assert.ok(np.card && np.theadHidden, 'byPerson 卡式形态须保持一致');
    assert.ok(np.title && np.title !== '活动', 'byPerson 卡标题须为人（姓名）');
    assert.ok(np.labels.every((l) => l && l !== '姓名'), 'byPerson 卡内 data-label 须为项目名');
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.waitForTimeout(400);

    // 考察：默认宽表（按人）→ 按项目 → 明细
    await openTab(page, '考察管理');
    await page.waitForTimeout(1500);
    const ins1 = await shape(page);
    assert.ok(ins1.isMatrix, '考察默认须为宽表');
    assert.equal(ins1.first, '姓名', '考察宽表默认「按人」');
    assert.ok(ins1.cols > 0 && ins1.cols <= 6, `考察项目维列须封顶 6：实测 ${ins1.cols}`);
    await page.evaluate(() => [...document.querySelectorAll('.insp-view-btn')].find((b) => b.dataset.view === 'wideItem')?.click());
    await page.waitForTimeout(500);
    const ins2 = await shape(page);
    assert.equal(ins2.first, '来源', '「按项目」后首列须为「来源」（真转置）');
    assert.equal(ins2.rows, ins1.cols, '转置：原列数（来源数，受 6 项上限）应变为行数');
    await page.evaluate(() => [...document.querySelectorAll('.insp-view-btn')].find((b) => b.dataset.view === 'long')?.click());
    await page.waitForTimeout(500);
    const ins3 = await page.evaluate(() => ({
      engine: !!document.querySelector('#disc-tab-content .lf-root'),
      matrix: !!document.querySelector('#disc-tab-content .rm-root'),
    }));
    assert.ok(ins3.engine && !ins3.matrix, '「明细」须回落到统一检索引擎（long form 降为明细）');

    assert.deepEqual(errs, [], `页面脚本错误：\n${errs.join('\n')}`);
  } finally {
    await page.close();
  }
});

test('② 思想汇报例外清单真机：无矩阵 / 三组在位 / 完整记录走个人档案', async () => {
  const { page, errs } = await loginOrg();
  try {
    await openTab(page, '思想汇报');
    await page.waitForTimeout(1600);
    const m = await page.evaluate(() => {
      const root = document.querySelector('#org-tab-content');
      const heads = [...(root?.querySelectorAll('h4') || [])].map((h) => (h.textContent || '').replace(/\s+/g, ' ').trim());
      return {
        matrix: !!root?.querySelector('.rm-root'),
        groups: heads.filter((t) => /^(未交|待初阅|待补充)/.test(t)),
        personLinks: root?.querySelectorAll('a[href*="person.html"]')?.length ?? 0,
        reportLinks: root?.querySelectorAll('a[href*="thought-report.html"]')?.length ?? 0,
        queue: !!root?.querySelector('#tr-queue-host'),
      };
    });
    assert.ok(!m.matrix, '思想汇报已收窄为例外清单，不得回潮「人 × 期次」矩阵');
    assert.deepEqual(m.groups.length, 3, `须渲染三组例外（未交 / 待初阅 / 待补充），实测 ${JSON.stringify(m.groups)}`);
    assert.ok(m.personLinks > 0, '每行须保留「档案」出口（完整记录落个人档案）');
    assert.ok(m.reportLinks > 0, '有记录的行须保留「查看」下钻');
    assert.ok(!m.queue, '「待初阅队列」已随初阅门撤除（`SOP-B-28` / `D-482`），不得回潮');
    assert.deepEqual(errs, [], `页面脚本错误：\n${errs.join('\n')}`);
  } finally {
    await page.close();
  }
});
