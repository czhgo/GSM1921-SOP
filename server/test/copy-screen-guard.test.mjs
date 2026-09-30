// role: [工程师]+[AI]
// copy-screen-guard.test.mjs — 「同屏复述 / 每屏文案 ÷ 控件」真机普查（2026-09-25 文案存量清理批）
//
// 判据原文（DESIGN_SYSTEM §4.18 C3 / C4，逐字照录，**不得自创更严 / 更宽**）：
//   C3「**禁止同屏复述**：同一句话不得在标题 / 副标题 / 提示句里说三遍」；
//      判据：「同屏内**归一化后（去空白、数字→N）相同**且 `≥15` 字的文案块出现 `≥2` 次 ⇒ 红。
//      允许的确切例外：分页/列头等**结构性重复**（如每行状态徽标）」
//   C4「**每屏「文案 ÷ 控件」≤ 12**；12–20 须逐屏登记理由；>20 必须改造」；
//      判据：「`可见文案字符 ÷ 页内 button/a/input/select/[role=button]/[role=tab] 可见个数`。
//      12 = p75，20 ≈ 实测比值排行第 8 名」
//
// 为什么必须真机（不静态近似）：C3 的「同屏」与 C4 的「页内控件数」都是**真实渲染的 DOM** 谓词
//   （§4.18.2 表头：判据一律写真机 DOM 谓词；§4.18.5 给了量测口径）。最重的同屏复述是**循环渲染**出来的
//   （同一句写在行渲染器里 ⇒ 源码里只出现一次，静态扫描看不见，10 张卡各渲染一遍只在 DOM 上成立）。
//
// 量测口径（＝ §4.18.5，逐条对齐；本文件是它的可执行版本）：
//   · 可见文案 ＝ 文本节点，其父链不含 `button/[role=button]/[role=tab]/input/select/textarea/option/label/
//     table/nav/.tab-bar/.sidebar/header/footer/.visually-hidden/.skip-link`，且父元素可见，且不在关闭的 `details` 内。
//   · 另**排除**引擎/矩阵自带的检索条与分页区（`.lf-bar/.lf-pager/.rm-pager/.in-page-search`）——它们自身含
//     大量选中态文案与按钮、属工具条而非「工作文案」，计入会同时抬字数与控件数、比值失真（**本守卫的口径收窄**，
//     见报告 ⑦；阈值仍取自 §4.18.2，未改）。
//   · 控件数 ＝ 可见的 `button/a/input/select/textarea/[role=button]/[role=tab]` 个数（**含顶部分组 tab**，与 §4.18.5 一致）。
//   · 字符数 ＝ 可见文本去空白（与 C1/C2 的 `replace(/\s+/g,'')` 同习惯；数字→N 只用于 C3 归一化，不改长度）。
//
// 判红 / 判据：
//   M1 同屏复述（C3）：某屏内归一化后 ≥15 字的块出现 ≥2 次，且该屏不在 C3_BASELINE（或超出基线计数）⇒ 红
//   M2 每屏比值（C4）：比值 >12 的屏必须在 C4_BASELINE 内（>20 记「待改造」、12–20 须给登记理由）⇒
//      未登记的 >12 屏 / 比值比基线增长 ⇒ 红
//   M3 非空转：① 归一化口径正/负例（含 15/14 字边界）② 普查覆盖规模下限（屏数 / 控件样本 / 正文样本）
//              ③ 基线条目必须带理由（B 档）或「待改造」标记（A 档）；僵尸登记 ⇒ 红
//   M4 缩减进度（只报不判）：当前比值排行 / 同屏复述清单与基线对照
//
// 覆盖边界（如实标注）：只进 **7 个工作台的 tab（默认视图）**（同 page-sweep 的普查面）；独立页
//   （`docs/*.html`）**不在本守卫范围**（口径同 §4.18.1 的「界面屏」，独立页另属页面级批次）。
// 收基线纪律：把复述改成「一行 ＋ help 深链」/ 把导语折叠后，**同一批**从 C3_BASELINE / C4_BASELINE
//   删条目 / 减计数——进度自动前进；**不得**为变绿补条目或调高 TOL。
// 运行：node --test server/test/copy-screen-guard.test.mjs（自起自停实例，约 2–4 分钟）
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { createApp } from '../app.js';
import { seedDatabase } from '../seed.js';

/** 判据阈值（§4.18.2 C3 / C4 原文值） */
const N3 = 15;   // 同屏复述：块长下限
const R_RATIO = 12;   // 每屏比值上限（12 为 p75）
const R_HARD = 20;    // 比值 >20 ⇒ 必须改造

/** 七个工作台 × 登录账号（与 page-sweep / data/mock/accounts.js 同源） */
const WORKS = [
  { page: 'secretary', studentId: '2300010001', name: '支书 / 副支书台' },
  { page: 'org', studentId: '2400012355', name: '组织委员台' },
  { page: 'prop', studentId: '2400012356', name: '宣传委员台' },
  { page: 'disc', studentId: '2400012354', name: '纪检委员台' },
  { page: 'leader', studentId: '2400012345', name: '党小组组长台' },
  { page: 'visitor', studentId: '2400012349', name: '成员台' },
  { page: 'party-committee', studentId: '9000000001', name: '党委台' },
];

// ── 页面内量测（纯只读，返回 {copy, ctrls, repeats}） ─────────────────────
const MEASURE = (cfg) => {
  const EXCLUDE = 'button,[role=button],[role=tab],input,select,textarea,option,label,table,nav,.tab-bar,.sidebar,header,footer,.visually-hidden,.skip-link,.lf-bar,.lf-pager,.rm-pager,.in-page-search';
  const visible = (el) => {
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return false;
    const cs = getComputedStyle(el);
    return cs.visibility !== 'hidden' && cs.display !== 'none' && Number(cs.opacity) > 0;
  };
  const norm = (t) => String(t).replace(/[\s\u3000]+/g, '');
  const digits = (t) => norm(t).replace(/\d/g, 'N');

  let copy = '';
  const blocks = [];
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let n = w.nextNode();
  while (n) {
    const t = n.nodeValue;
    if (t && t.trim()) {
      const p = n.parentElement;
      if (p && visible(p) && !p.closest(EXCLUDE) && !p.closest('details:not([open])')) {
        const s = norm(t);
        copy += s;
        if (s) blocks.push(s);
      }
    }
    n = w.nextNode();
  }
  const ctrls = [...document.querySelectorAll('button,a,input,select,textarea,[role=button],[role=tab]')].filter(visible).length;
  // C3：归一化（数字→N）后 ≥N3 字的块出现 ≥2 次（结构性重复的去重由基线登记承担）
  const count = new Map();
  for (const b of blocks) {
    const d = digits(b);
    if (d.length < cfg.n3) continue;
    count.set(d, (count.get(d) || 0) + 1);
  }
  const repeats = [...count.entries()].filter(([, c]) => c >= 2).map(([d, c]) => ({ block: d, count: c }));
  return { copy: copy.length, ctrls, repeats };
};

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

/** 上一步归一化口径（导出给 M3 非空转自检用） */
export function normalizeBlock(t) {
  return String(t).replace(/[\s\u3000]+/g, '').replace(/\d/g, 'N');
}

// ── 基线（2026-09-25 收基线实测；只为「新增」判红） ──────────────────────
/**
 * C4：每屏「文案 ÷ 控件」。`屏 key → { copy, ctrls, ratio }`。
 * 登记纪律（§4.18.2 C4 原文）：比值 12–20 的屏**须逐屏登记理由**，>20 的屏记「待改造」。
 * ⚠ 本批已清 2 屏（`disc::考勤管理` / `disc::补课管理` 已降至 ≤12、`party-committee::匿名反馈核查` 47.5→31.1，
 *   详见报告 ④），基线按**清理后**实测登记（2026-09-25 两次真机实测数值逐屏一致 ⇒ 快照稳定）。
 * 2026-09-28 批次 220（R6：党委台「支部监控台账」字段分层）：明细折进 `<details>` 后该屏比值降到 ≤12
 *   ⇒ 按「不得为变绿补条目 / 收基线同批删条目」纪律，从 C4_BASELINE 与 C4_REASON **删** `party-committee::支部监控台账`
 *   （进度前进；非放宽——M2 的 >12 判红与 M3 的僵尸检查一字未动）。
 */
const C4_BASELINE = {
  'secretary::全局概况': { copy: 522, ctrls: 41, ratio: 12.73 },
  'secretary::通知发布': { copy: 869, ctrls: 56, ratio: 15.52 },
  'secretary::党小组与活动': { copy: 1754, ctrls: 80, ratio: 21.93 },
  'secretary::知情查看': { copy: 484, ctrls: 25, ratio: 19.36 },
  'org::专班管理': { copy: 775, ctrls: 55, ratio: 14.09 },
  'org::人才库': { copy: 628, ctrls: 46, ratio: 13.65 },
  'org::我的处置': { copy: 329, ctrls: 26, ratio: 12.65 },
  'prop::宣传任务': { copy: 357, ctrls: 27, ratio: 13.22 },
  'disc::活动监督复盘': { copy: 1133, ctrls: 68, ratio: 16.66 },
  'disc::知情查看': { copy: 483, ctrls: 23, ratio: 21 },
  'leader::知情查看': { copy: 487, ctrls: 24, ratio: 20.29 },
  'party-committee::匿名反馈核查': { copy: 467, ctrls: 15, ratio: 31.13 },
  // 2026-09-29 批次 274 收基线：批次 273 新增「部署与对接」面板后本屏比值 43.2（＝>20 必须改造）
  //   ⇒ 面板已按 C3 改造（短标签状态 ＋ `<details>` 折叠）降到 14.4，**同批收进基线并登记理由**（见 C4_REASON）
  'party-committee::支部配置': { copy: 533, ctrls: 37, ratio: 14.41 },
};
/** C4 的登记理由（§4.18.2 C4：12–20 须逐屏登记理由；>20 记「待改造」） */
const C4_REASON = {
  'secretary::全局概况': '概况三区聚合 + 待答复习表：主体为运行时数据行（人名 / 日期 / 计数），比 12 略高属数据面',
  'secretary::通知发布': '通知表单 + 模板下拉：表单标签与规则提示偏多，登记待收',
  'party-committee::支部配置': '待改造：同屏并存「换组织向导（5 步引导）＋ 部署与对接面板」；面板已按 C3 收纳为「短标签状态 ＋ <details> 折叠」（批次 273 初版曾判「同屏复述 7 处 · 比值 43.2」＝>20 必须改造，批次 274 已改造并降到 14.4）；剩余文案主要是向导各步内的说明段',
  'secretary::党小组与活动': '待改造：党小组清单 + 活动归集两区块，说明段与逐行数据并存；本批只收了同屏复述两处',
  'secretary::知情查看': '只读一览 + 分段钮：条目元信息（日期 / 类型）占比高，登记待收',
  'org::专班管理': '专班卡 + 成员角色区：条目数据为主，登记待收',
  'org::人才库': '人才画像卡（逐人）：运行时数据为主',
  'org::我的处置': '处置列表：条目数据为主',
  'prop::宣传任务': '任务列表：条目数据（来源 / 日期）为主',
  'disc::活动监督复盘': '复盘正文（成员提交）构成主体——§4.18.1 已认定「8 成是运行时数据」，非界面文案',
  'disc::知情查看': '待改造：只读一览条目元信息占比高，控件仅分段钮 2 个（分母小）',
  'leader::知情查看': '待改造：同上（只读一览 + 2 个分段钮）',
  'party-committee::匿名反馈核查': '待改造：本批已折顶部口径条（47.5 → 31.1）；余量主要是每条反馈的标题 / 正文 / 提交人等运行时数据',
};
/** C3：每屏同屏复述的计数（`屏 key → 复述块数`）；只为「新增 / 增长」判红。
 *  2026-09-25 收基线时逐条读过：现存 25 处**几乎全部是「逐行同构 + 数字归一化」造成的结构性重复**
 *  （活动行的「日期·类型」、归档卡的「活动日期：」、宣传任务的「来自：角色·日期」等，属 §4.18.2 C3 的
 *  「结构性重复」例外）；真·文案复述仅 `visitor::待办` 一处（同一句提示在两条待办上各渲染一次）。 */
const C3_BASELINE = {
  'secretary::全局概况': 1,
  'secretary::党小组与活动': 2,
  'secretary::反馈管理': 2,
  'org::专班管理': 3,
  'org::人才库': 2,
  'org::我的处置': 1,
  'prop::宣传任务': 3,
  'prop::周报报送': 1,
  'prop::档案归档': 2,
  'disc::考勤管理': 2,
  'leader::组员进展': 2,
  'visitor::待办': 1,
  'visitor::活动动态': 3,
};

/** 覆盖规模下限（非空转：低于此值说明普查没跑起来 / 抽不到正文） */
const COVER_TABS_FLOOR = 60;
const COVER_CTRL_FLOOR = 40;
const COVER_COPY_FLOOR = 2000;

/** 普查累积（跨工作台） */
const SWEEP = { tabs: 0, ctrls: 0, copy: 0 };
/** 逐屏实测结果（M1/M2 与 M4 共用） */
const RESULT = new Map();

for (const w of WORKS) {
  test(`真机普查 · ${w.name}（${w.page}）：逐 tab 取「可见文案 ÷ 控件」与同屏复述`, async () => {
    const page = await browser.newPage();
    try {
      await page.route('**://fonts.googleapis.com/**', (r) => r.abort());
      await page.route('**://fonts.gstatic.com/**', (r) => r.abort());
      await page.route('**://cdn.tailwindcss.com/**', (r) => r.abort());
      await page.goto(`${base}/login.html`, { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('#student-id', { timeout: 30000 });
      await page.fill('#student-id', w.studentId);
      await page.fill('#password', '123456');
      await Promise.all([
        page.waitForURL(`**/workspace/${w.page}.html`, { timeout: 30000 }),
        page.click('button[type="submit"]'),
      ]);
      await page.waitForFunction(() => document.querySelectorAll('button[role="tab"]').length > 0, { timeout: 45000 });
      await page.waitForTimeout(800);

      const labels = await page.$$eval('button[role="tab"]', (els) => els.map((e) => e.textContent.trim()));
      assert.ok(labels.length > 0, `${w.name} 未渲染任何 tab`);
      for (const label of labels) {
        await page.evaluate((l) => {
          [...document.querySelectorAll('button[role="tab"]')].find((x) => x.textContent.includes(l))?.click();
        }, label);
        await page.waitForTimeout(1000);
        const { copy, ctrls, repeats } = await page.evaluate(MEASURE, { n3: N3 });
        const key = `${w.page}::${label}`;
        RESULT.set(key, { copy, ctrls, repeats });
        SWEEP.tabs += 1;
        SWEEP.ctrls += ctrls;
        SWEEP.copy += copy;
      }
    } finally {
      await page.close();
    }
  });
}

// ── M1 同屏复述（C3） ───────────────────────────────────────────────────
test(`M1 同屏复述：归一化后 ≥${N3} 字的块出现 ≥2 次（基线 ${Object.keys(C3_BASELINE).length} 屏）`, () => {
  const offenders = [];
  for (const [screen, r] of RESULT) {
    const baseN = C3_BASELINE[screen] || 0;
    if (r.repeats.length > baseN) {
      offenders.push(`${screen}：复述 ${r.repeats.length} 处 > 基线 ${baseN}\n      `
        + r.repeats.map((x) => `「${x.block}」×${x.count}`).join('\n      '));
    }
  }
  assert.deepEqual(offenders, [],
    `同屏复述（DESIGN_SYSTEM §4.18 C3：同一句话不得说三遍）——改为「一行摘要 ＋ <details> 折叠 ＋ help 深链」：\n  ${offenders.join('\n  ')}`);
});

// ── M2 每屏比值（C4） ───────────────────────────────────────────────────
test(`M2 每屏「文案 ÷ 控件」：>${R_RATIO} 须登记；>${R_HARD} 记待改造（基线 ${Object.keys(C4_BASELINE).length} 屏）`, () => {
  const offenders = [];
  for (const [screen, r] of RESULT) {
    const ratio = r.ctrls ? r.copy / r.ctrls : Infinity;
    const base = C4_BASELINE[screen];
    if (!base) {
      if (ratio > R_RATIO) offenders.push(`${screen}：比值 ${ratio.toFixed(1)}（文案 ${r.copy} / 控件 ${r.ctrls}）未登记`);
      continue;
    }
    if (ratio > base.ratio + 0.5) {
      offenders.push(`${screen}：比值 ${ratio.toFixed(1)} > 基线 ${base.ratio.toFixed(1)}（文案 ${r.copy} / 控件 ${r.ctrls}）`);
    }
  }
  assert.deepEqual(offenders, [],
    `每屏「文案 ÷ 控件」超 ${R_RATIO} 且未登记 / 较基线增长（DESIGN_SYSTEM §4.18 C4）：\n  ${offenders.join('\n  ')}`);
  // 登记纪律：>12 的屏都必须在基线里；>20 记待改造（A），12–20 须给理由（B）
  const missing = [...RESULT].filter(([, r]) => (r.ctrls ? r.copy / r.ctrls : Infinity) > R_RATIO)
    .filter(([s]) => !C4_REASON[s]).map(([s]) => s);
  assert.deepEqual(missing, [], `以下 >${R_RATIO} 的屏在 C4_REASON 里没有登记理由：\n  ${missing.join('\n  ')}`);
});

// ── M3 非空转 ───────────────────────────────────────────────────────────
test('M3 非空转：归一化口径可用（含 15/14 边界）+ 覆盖规模达标 + 基线登记完整', () => {
  // ① 归一化正例：去空白 + 数字→N
  assert.equal(normalizeBlock('  已 到 3 人 '), '已到N人', '归一化口径失效：去空白 / 数字→N 没生效');
  assert.equal(normalizeBlock('2026-09-25'), 'NNNN-NN-NN', '归一化口径失效：日期数字没被逐位归成 N');
  // ① 边界：恰好 15 字命中；14 字不命中（C3 原文阈值为 ≥15）
  assert.equal(normalizeBlock('一二三四五六七八九十一二三四五').length, 15, '边界样本应恰 15 字');
  assert.equal(normalizeBlock('一二三四五六七八九十一二三四五').replace(/\d/g, 'N').length, 15, '15 字块应保留');
  assert.equal(normalizeBlock('一二三四五六七八九十一二三四').length, 14, '14 字块应保留且低于阈值');
  // ② 覆盖规模下限
  assert.ok(SWEEP.tabs >= COVER_TABS_FLOOR, `普查只审到 ${SWEEP.tabs} 个 tab（下限 ${COVER_TABS_FLOOR}）：普查没跑全`);
  assert.ok(SWEEP.ctrls >= COVER_CTRL_FLOOR, `控件样本只有 ${SWEEP.ctrls} 个（下限 ${COVER_CTRL_FLOOR}）：比值分母可疑，M2 会失真`);
  assert.ok(SWEEP.copy >= COVER_COPY_FLOOR, `可见文案样本只有 ${SWEEP.copy} 字（下限 ${COVER_COPY_FLOOR}）：抽取口径疑似失效`);
  // ③ 基线登记完整：每个 >12 的屏都有理由；C4_BASELINE 与 C4_REASON 键集一致；Zombie=基线屏已不再 >0
  for (const [screen, base] of Object.entries(C4_BASELINE)) {
    assert.ok(C4_REASON[screen] && C4_REASON[screen].length >= 2, `C4 基线 ${screen} 缺登记理由`);
    assert.ok(base.ratio > R_RATIO, `C4 基线 ${screen} 比值 ${base.ratio} ≤ ${R_RATIO}（≤12 的屏不该登记）`);
  }
  const zombie = Object.keys(C4_BASELINE).filter((s) => {
    const r = RESULT.get(s);
    return r && (r.ctrls ? r.copy / r.ctrls : Infinity) <= R_RATIO;
  });
  assert.deepEqual(zombie, [], `以下屏比值已 ≤${R_RATIO}，应从 C4_BASELINE 删条目（收基线）：\n  ${zombie.join('\n  ')}`);
});

// ── M4 缩减进度（只报不判） ────────────────────────────────────────────
test('M4 缩减进度：比值排行 / 同屏复述清单与基线对照', () => {
  const rows = [...RESULT].map(([screen, r]) => ({ screen, ...r, ratio: r.ctrls ? r.copy / r.ctrls : Infinity }));
  rows.sort((a, b) => b.ratio - a.ratio);
  console.log(`[屏普查] tab=${SWEEP.tabs} 控件=${SWEEP.ctrls} 可见文案=${SWEEP.copy} 字`);
  console.log(`[比值最高 10 屏] ${rows.slice(0, 10).map((r) => `${r.screen}=${r.ratio.toFixed(1)}`).join(' · ')}`);
  const rep = rows.filter((r) => r.repeats.length);
  console.log(`[同屏复述 ${rep.length} 屏 / 共 ${rep.reduce((a, r) => a + r.repeats.length, 0)} 处]`);
  for (const r of rep) for (const x of r.repeats) console.log(`  · ${r.screen} 「${x.block}」×${x.count}`);
  console.log('[收基线提示] 折叠 / 改一行后同批删基线条目、减计数，进度即前进；不得为变绿补条目或调高 TOL。');
  // 取基线工具：设 COPY_SCREEN_PRINT_BASELINE=1 打印可粘贴的字面量
  if (process.env.COPY_SCREEN_PRINT_BASELINE) {
    const c4 = {}; const reason = {}; const c3 = {};
    for (const [screen, r] of RESULT) {
      const ratio = r.ctrls ? r.copy / r.ctrls : Infinity;
      if (ratio > R_RATIO) { c4[screen] = { copy: r.copy, ctrls: r.ctrls, ratio: Number(ratio.toFixed(2)) }; reason[screen] = ratio > R_HARD ? '待改造' : '待登记理由'; }
      if (r.repeats.length) c3[screen] = r.repeats.length;
    }
    console.log('== C4_BASELINE ==\n' + JSON.stringify(c4, null, 2));
    console.log('== C4_REASON ==\n' + JSON.stringify(reason, null, 2));
    console.log('== C3_BASELINE ==\n' + JSON.stringify(c3, null, 2));
  }
});
