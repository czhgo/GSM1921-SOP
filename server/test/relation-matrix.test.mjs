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
//   真机层 ① 两个域都跑一遍：默认宽表 → 列上限 6 → 一键展开 → 切到转置视图（行列互换）
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { chromium } from 'playwright';
import { createApp } from '../app.js';
import { seedDatabase } from '../seed.js';

const ROOT = join(import.meta.dirname, '..', '..');
const SRC_DIR = join(ROOT, 'docs', 'src');
const MATRIX = join(SRC_DIR, 'components', 'relation-matrix.js');

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

test('S1 矩阵组件单一源在位：转置双视图 + 项目维列上限 6 + 横向滚动 + 首列吸附 + 一键展开', () => {
  const src = read(MATRIX);
  assert.match(src, /export function renderRelationMatrix/, '须导出 renderRelationMatrix');
  assert.match(src, /export const MATRIX_COL_LIMIT = 6/, '项目维列上限须为 6（最近 6 项）');
  assert.match(src, /byPerson/, '须支持「行=人」视图');
  assert.match(src, /byItem/, '须支持「行=项目」视图（与 byPerson 互为转置）');
  assert.match(src, /overflow-x-auto/, '须提供横向滚动容器');
  assert.match(src, /sticky left-0/, '首列须吸附（横向滚动时维度名不丢）');
  assert.match(src, /rm-toggle/, '须提供「显示全部 N 项 / 只看最近 6 项」一键展开钮');
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
  assert.deepEqual(offenders, [], `人×项目矩阵一律走 components/relation-matrix.js：\n${offenders.join('\n')}`);
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

test('S4 矩阵类实现收敛台账：未迁移的另一类矩阵须登记白名单（防悄悄长第四套）', () => {
  // 表态汇总矩阵（议题 × 应到成员）属另一二元关系域，尚未迁移 → 登记待迁；新出现的矩阵类实现必须先进本表
  const ALLOW_VS_MATRIX = new Set(['components/vote-summary-panel.js']);
  const hits = [];
  for (const f of walkJs(SRC_DIR)) {
    const r = rel(f);
    if (ALLOW_VS_MATRIX.has(r)) continue;
    if (/vs-matrix/.test(read(f))) hits.push(r);
  }
  assert.deepEqual(hits, [], `新的矩阵类实现须先登记待迁白名单（或在本次迁移到 relation-matrix）：\n${hits.join('\n')}`);
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
  await page.waitForTimeout(600);
  return { page, errs };
}
const openTab = (page, label) => page.evaluate((l) => {
  [...document.querySelectorAll('button[role="tab"]')].find((x) => x.textContent.includes(l))?.click();
}, label);
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
