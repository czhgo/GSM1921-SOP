// role: [工程师]+[AI]
// density-spacing-guard.test.mjs — 组件密度与间距节奏守卫（spec redesign-theme-palette-and-density · Task 9）
//
// 为什么要有本守卫：
//   · Task 6 把「高度是内容副产物」改成「高度是设计值」：输入 40/34、按钮 36/32/28 由
//     padding + 显式 line-height 推导（不再用 min-height 撑高）、行 48/56/44/40、summary 40。
//     此前只有 button-system-guard 数按钮，没有任何判据能防止「页面又用 min-height/h-* 把高度拉回去」。
//   · 判据：
//       D1 输入/下拉：.input-flat 8+8+22+2=40；.input-flat-sm 8+8+16+2=34
//       D2 按钮三档：36（页面/弹窗）/32（卡片/页签）/28（行内），均由 padding + line-height + 边框推导，
//          且这三档规则体内不得出现 min-height（高度不得脱离文字行高）
//       D3 行型：--row-standard 48 / --row-comfortable 56 / --row-compact 44 / --row-table 40 /
//          --row-summary 40，并被 .list-row / .notice-row / .todo-row / summary 实际消费
//       D4 命中区：行内 28px 按钮用伪元素扩到 ≥44px（视觉高度不变）
//       D5 间距：--space-* 恰五档 4/8/12/16/24；组件内离档值（2/6/10/14/20）只降不升
//       D6 Tailwind 1.5/2.5/3.5 数值档只降不升（口径见下方常量注释）
//       D7 页头说明→summary 8–12；标题→次级 8
// 运行：node --test server/test/density-spacing-guard.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');
const STYLES = read('docs/src/styles.css');

/** 极简规则切分（只取「选择器 { 声明 }」；本段无嵌套 at-rule） */
function cssRules(section) {
  const out = [];
  const re = /([^{}]+)\{([^{}]*)\}/g;
  let m;
  while ((m = re.exec(section.replace(/\/\*[\s\S]*?\*\//g, ''))) !== null) {
    out.push({ selector: m[1].trim(), body: m[2] });
  }
  return out;
}

/**
 * 取某选择器的规则体：**按逗号分隔后的完整选择器精确匹配**。
 * 不能用「子串 + 前置空白」匹配——`html.font-size-large .input-flat { … }`
 * 会先命中，导致读到的是字号覆盖块而不是 `.input-flat` 本体。
 */
function ruleBody(css, selector) {
  for (const r of cssRules(css)) {
    if (r.selector.split(',').map((s) => s.trim()).includes(selector)) return r.body;
  }
  return '';
}

/** 纵向 padding（支持 padding / padding-top+bottom 两种写法；忽略 !important） */
function paddingY(body) {
  const m = /(?:^|;)\s*padding\s*:\s*([^;]+)/.exec(body);
  if (m) {
    const parts = m[1].replace(/!important/gi, '').trim().split(/\s+/).filter((x) => /^\d+(?:\.\d+)?px$/.test(x));
    const top = parseFloat(parts[0]);
    const bottom = parts.length > 2 ? parseFloat(parts[2]) : top;
    return top + bottom;
  }
  const t = /padding-top\s*:\s*(\d+(?:\.\d+)?)px/.exec(body);
  const b = /padding-bottom\s*:\s*(\d+(?:\.\d+)?)px/.exec(body);
  return t && b ? parseFloat(t[1]) + parseFloat(b[1]) : NaN;
}

/** 显式 line-height（px） */
function lineHeightPx(body) {
  const m = /(?:^|;)\s*line-height\s*:\s*(\d+(?:\.\d+)?)px/.exec(body);
  return m ? parseFloat(m[1]) : NaN;
}

/** 边框（默认按钮/控件均为 1px 上下边） */
const BORDER_Y = 2;

function heightOf(body) {
  const py = paddingY(body);
  const lh = lineHeightPx(body);
  return Number.isFinite(py) && Number.isFinite(lh) ? py + lh + BORDER_Y : NaN;
}

test('D1 输入/下拉：40px 单档 + 34px 紧凑档（padding + 显式 line-height 推导）', () => {
  const base = ruleBody(STYLES, '.input-flat');
  assert.ok(base, 'styles.css 缺少 .input-flat 规则');
  assert.equal(paddingY(base), 16, '.input-flat 纵向内边距应为 8 + 8');
  assert.equal(lineHeightPx(base), 22, '.input-flat 行高应为 22px（高度必须显式声明）');
  assert.equal(heightOf(base), 40, '.input-flat 应由 8+8+22+2 推导为 40px');
  assert.match(base, /font-size:\s*0\.8125rem/, '.input-flat 正文应为 13px');

  const sm = ruleBody(STYLES, '.input-flat-sm');
  assert.ok(sm, 'styles.css 缺少 .input-flat-sm 规则');
  assert.equal(heightOf(sm), 34, '.input-flat-sm 应由 8+8+16+2 推导为 34px');

  assert.match(STYLES, /--control-h:\s*40px\s*;/, '--control-h 应为 40px');
  assert.match(STYLES, /--control-h-sm:\s*34px\s*;/, '--control-h-sm 应为 34px');

  const csTrigger = ruleBody(STYLES, '.cs-trigger.input-flat');
  assert.ok(csTrigger, 'styles.css 缺少 .cs-trigger.input-flat 规则');
  assert.equal(heightOf(csTrigger), 40, '.cs-trigger.input-flat 应与输入框同高 40px');
});

test('D2 按钮三档：36 / 32 / 28 由 padding + line-height 推导，主档不得用 min-height', () => {
  const marker = STYLES.indexOf('按钮尺寸归一（2026-10-18）');
  assert.ok(marker >= 0, 'styles.css 缺少「按钮尺寸归一（2026-10-18）」段');
  const rowMarker = STYLES.indexOf('列表行边框收敛（2026-10-18）', marker);
  const section = STYLES.slice(marker, rowMarker > marker ? rowMarker : undefined)
    .replace(/\/\*[\s\S]*?\*\//g, '');
  const rules = cssRules(section);
  assert.ok(rules.length >= 8, `按钮尺寸段规则数过少（${rules.length}），解析可能写坏`);

  // 只取「归一档」规则：同时含 padding 与**显式 px 行高**（避免命中组件基础样式块里 line-height:1 的写法）
  const find = (token) => rules.find((r) => new RegExp(`\\.${token}(?![\\w-])`).test(r.selector)
    && /padding/.test(r.body) && /line-height\s*:\s*\d+(?:\.\d+)?px/.test(r.body));
  const tierRules = [];
  const expectTier = (token, height) => {
    const r = find(token);
    assert.ok(r, `「按钮尺寸归一」段缺少 .${token} 的尺寸档`);
    assert.equal(heightOf(r.body), height, `.${token} 应由 padding + line-height 推导为 ${height}px（实际 ${heightOf(r.body)}）`);
    assert.doesNotMatch(r.body, /min-height/, `.${token} 不得用 min-height 撑高（高度须由文字行高参与计算）`);
    tierRules.push({ token, body: r.body });
  };
  // 36px 页面 / 弹窗档
  for (const token of ['btn-accent', 'btn-accent-soft', 'btn-outline', 'btn-danger', 'btn-danger-solid', 'btn-md', 'btn-neutral']) {
    expectTier(token, 36);
  }
  // 32px 卡片 / 页签档
  for (const token of ['btn-ghost', 'btn-tab']) expectTier(token, 32);
  // 28px 行内档
  for (const token of ['btn-sm', 'btn-action']) expectTier(token, 28);

  // 宽度由内容决定：三档只写水平内边距（页面 10 / 卡片 8 / 行内 8），不写固定 width
  assert.match(find('btn-accent').body, /padding:\s*8px\s+10px/, '36px 档水平内边距应为 10px');
  assert.match(find('btn-ghost').body, /padding:\s*4px\s+8px/, '32px 档水平内边距应为 8px');
  assert.match(find('btn-action').body, /padding:\s*4px\s+8px/, '28px 档水平内边距应为 8px');
  for (const t of tierRules) assert.doesNotMatch(t.body, /(?:^|[;\s])width\s*:/, `按钮档不得写固定宽度（宽度由内容决定）：.${t.token}`);
});

test('D3 行型：单行 48 / 双行 56 / 紧凑 44 / 表格 40 / summary 40，且被实际消费', () => {
  const vars = {};
  for (const [name, px] of [['--row-standard', 48], ['--row-comfortable', 56], ['--row-compact', 44], ['--row-table', 40], ['--row-summary', 40]]) {
    const m = new RegExp(`${name}:\\s*(\\d+)px`).exec(STYLES);
    assert.ok(m, `缺少 ${name}`);
    assert.equal(Number(m[1]), px, `${name} 应为 ${px}px`);
    vars[name] = px;
  }
  assert.ok(vars['--row-standard'] === 48 && vars['--row-comfortable'] === 56 && vars['--row-compact'] === 44,
    '行型必须为 48 / 56 / 44 三档');

  const listRow = ruleBody(STYLES, '.list-row');
  assert.match(listRow, /min-height:\s*var\(--row-standard\)/, '.list-row 应消费 --row-standard（48）');
  assert.match(listRow, /padding:\s*var\(--space-2\) var\(--space-3\)/, '.list-row 纵向留白应为 8px');
  assert.doesNotMatch(listRow, /min-height:\s*(?:55|61|62|79|82)px/, '.list-row 不得出现 55/61/62/79/82 等旧高度');

  const noticeRow = ruleBody(STYLES, '.notice-row');
  assert.match(noticeRow, /min-height:\s*var\(--row-comfortable\)/, '.notice-row 应走双行 56');
  const todoRow = ruleBody(STYLES, '.todo-row.list-row');
  assert.match(todoRow, /--row-standard:\s*var\(--row-comfortable\)/, '.todo-row 应把单行档改写为双行 56');

  const summary = ruleBody(STYLES, 'summary');
  assert.match(summary, /min-height:\s*var\(--row-summary\)/, 'summary 最小命中高应为 var(--row-summary)（40）');
  assert.match(STYLES, /--row-summary:\s*40px/, '--row-summary 应为 40px');
});

test('D4 行内 28px 按钮命中区 ≥44px（伪元素扩展，不改视觉高度）', () => {
  const body = ruleBody(STYLES, '.list-row__trailing .btn-sm::after');
  assert.ok(body, '缺少 .list-row__trailing .btn-sm::after 命中区规则');
  assert.match(body, /width:\s*max\(100%,\s*44px\)/, '命中区宽度应 ≥44px');
  assert.match(body, /height:\s*max\(100%,\s*44px\)/, '命中区高度应 ≥44px');
  assert.match(body, /transform:\s*translate\(-50%,\s*-50%\)/, '命中区应居中扩展');
  // 视觉高度仍为 28（由 D2 保证），此处不得再写 height: 44px 改变视觉
  assert.doesNotMatch(body, /(?:^|[;\s])height:\s*44px/, '命中区不得把视觉高度改成 44px');
});

test('D5 间距：--space-* 恰五档；组件内离档值（2/6/10/14/20）只降不升', () => {
  const space = {};
  for (const m of STYLES.matchAll(/--space-([\w-]+):\s*(\d+)px/g)) space[`--space-${m[1]}`] = Number(m[2]);
  assert.deepEqual(space, {
    '--space-1': 4, '--space-2': 8, '--space-3': 12, '--space-4': 16, '--space-6': 24,
  }, '间距令牌应恰为 4/8/12/16/24 五档');

  // 组件内离档值：padding / margin / gap 系列里出现 2/6/10/14/20px 的次数。
  // 基线 = 2026-10-23 批次 505 实测 113（Task 6 只在触碰范围收敛，未做全量替换）。
  // 棘轮：只降不升；每清理一批同批下调。
  const OFF_TIER_BASELINE = 113;
  const offRe = /(?:^|[;{])\s*(padding|margin|gap|row-gap|column-gap|padding-top|padding-right|padding-bottom|padding-left|margin-top|margin-right|margin-bottom|margin-left)\s*:\s*([^;{}]+)/g;
  const offValues = new Set(['2', '6', '10', '14', '20']);
  let off = 0;
  let m;
  while ((m = offRe.exec(STYLES)) !== null) {
    const px = (m[2].match(/(\d+)px/g) || []).map((v) => v.replace('px', ''));
    for (const v of px) if (offValues.has(v)) off += 1;
  }
  console.log(`[density] 组件内离档间距值 ${off} 处（棘轮上限 ${OFF_TIER_BASELINE}）`);
  assert.ok(off > 0, '离档值统计为 0：抽取口径可能失效（非空转）');
  assert.ok(off <= OFF_TIER_BASELINE, `组件内离档间距值由 ${OFF_TIER_BASELINE} 升到 ${off} 处 ⇒ 组件内边距只取 4/8/12/16/24；新增即红`);
});

test('D6 Tailwind 1.5/2.5/3.5 数值档只降不升', () => {
  // 口径：docs 下全部 .js/.html 的 Tailwind 类串里 `*-1.5 / *-2.5 / *-3.5`（排除 vendor）。
  // spec 原文的「160 处 / 20 文件」是早期抽样口径；本守卫按全量实测登记：
  //   2026-10-23 批次 505 实测 1056 处 / 99 文件（Task 6 只收敛触碰范围，未做全量替换）。
  // 棘轮：只降不升。
  const TOTAL_BASELINE = 1056;
  const FILE_BASELINE = 99;
  const walk = (dir, out = []) => {
    for (const n of readdirSync(dir)) {
      if (n === 'vendor') continue;
      const p = join(dir, n);
      if (statSync(p).isDirectory()) walk(p, out);
      else if (/\.(js|html)$/.test(n)) out.push(p);
    }
    return out;
  };
  const re = /\b[A-Za-z-]+-(?:1\.5|2\.5|3\.5)\b/g;
  let total = 0;
  const perFile = new Map();
  for (const f of walk(join(ROOT, 'docs'))) {
    const hits = readFileSync(f, 'utf8').match(re) || [];
    if (!hits.length) continue;
    total += hits.length;
    perFile.set(relative(ROOT, f).replace(/\\/g, '/'), hits.length);
  }
  console.log(`[density] Tailwind 1.5/2.5/3.5：${total} 处 / ${perFile.size} 文件（棘轮 ${TOTAL_BASELINE} / ${FILE_BASELINE}）`);
  assert.ok(total > 0 && perFile.size > 0, 'Tailwind 数值档统计为 0：抽取口径可能失效（非空转）');
  assert.ok(total <= TOTAL_BASELINE, `Tailwind 1.5/2.5/3.5 由 ${TOTAL_BASELINE} 升到 ${total} 处 ⇒ 不再新增离档间距`);
  assert.ok(perFile.size <= FILE_BASELINE, `含离档 Tailwind 值的文件由 ${FILE_BASELINE} 升到 ${perFile.size} 个`);
});

test('D7 页头说明→summary 8–12；标题→次级→描述 8', () => {
  const pageFrame = ruleBody(STYLES, '.page-frame');
  const gap = /gap:\s*var\(--space-(\d+)\)/.exec(pageFrame);
  assert.ok(gap, '.page-frame 应使用 --space-* 作为页头与内容间距');
  const gapPx = { 1: 4, 2: 8, 3: 12, 4: 16, 6: 24 }[Number(gap[1])];
  assert.ok(gapPx >= 8 && gapPx <= 12, `.page-frame 页头说明→内容应为 8–12px（实际 ${gapPx}px）`);

  const tabHeader = ruleBody(STYLES, '[role="tabpanel"] > .page-frame__header');
  assert.ok(tabHeader, '缺少 [role="tabpanel"] > .page-frame__header 规则（tab 面板页头间距）');
  assert.match(tabHeader, /margin-bottom:\s*var\(--space-3\)/, 'tab 面板页头→内容应为 12px');

  const desc = ruleBody(STYLES, '.page-frame__description');
  assert.match(desc, /margin-top:\s*var\(--space-2\)/, '标题→说明应为 8px');

  const listMain = ruleBody(STYLES, '.list-row__main');
  assert.match(listMain, /gap:\s*var\(--space-2\)/, '行内标题→次级→描述应为 8px');
  assert.match(STYLES, /\.notice-row__meta\s*\{[^}]*margin-top:\s*8px/, '通知行标题→meta 应为 8px');
});
