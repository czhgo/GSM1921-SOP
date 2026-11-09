// role: [工程师]+[AI]
// server/test/table-contract-guard.test.mjs — 表格组件契约守卫（2026-11-10 批次 540）
// ════════════════════════════════════════════════════════════════
// 契约源：`content/04_web_design/contracts/TABLE_COMPONENT_CONTRACT.md`
//
// 为什么需要：
//   批次 540 前，同一张「日期 / 活动 / 复盘状态 / 应到·实到」表在党小组页手写 `<table>`，
//   列宽按内容伸缩（余量被末列吃掉）、复盘详情塞进数据格、单元格灰字三档混用；
//   而 `data-table.js` 只有 headHtml 一个入口，没有列宽 / 横滚 / 首列吸附 / 列宽拖动的表达力。
//   没有守卫时，新页面仍会手写表、`<td class="text-xs">` 会回潮、宽表会没有 colgroup。
//
// 判据（纯 node 静态扫描，不起服务、不引 playwright）：
//   T1 契约文档：五键齐全（type / status / version / owner / acceptance）+ 判据句在场
//   T2 组件参数：columns / density / stickyFirstCol / scroll / resizable 与产出物（colgroup、
//      .is-numeric、table:cols:、min-width: 1024px）逐条在场
//   T3 宽表（≥5 列）组件调用点必须给列宽模板（columns / colgroupHtml）；存量例外逐条登记
//   T4 手写 `<table class="data-table">` 逐文件计数只减不增（棘轮）
//   T5 `<td>` 自身 class 含 text-xs 的数量 = 0（灰字分层：字号只由表格档决定）
//   T6 390 无溢出：`.dt-scroll` 横滚 + ≤640px 复位 min-width / sticky；`scroll` 调用点必须 responsive
//   T7 反例自证：上述判据函数对合成反例逐个判红（守卫不得恒真）
// ════════════════════════════════════════════════════════════════
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = join(import.meta.dirname, '..', '..');
const SRC = join(ROOT, 'docs', 'src');
const CONTRACT = join(ROOT, 'content', '04_web_design', 'contracts', 'TABLE_COMPONENT_CONTRACT.md');
const COMPONENT = join(SRC, 'components', 'ui', 'data-table.js');
const STYLES = join(SRC, 'styles.css');

const read = (f) => readFileSync(f, 'utf8');
const rel = (f) => relative(ROOT, f).replace(/\\/g, '/');

/** 递归列出 docs/src 下全部 .js */
export function walkJs(dir, out = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walkJs(p, out);
    else if (e.name.endsWith('.js')) out.push(p);
  }
  return out;
}

// ── 契约字段（与 contract-doc-guard::CD1 同口径，本文件自带实现以免跨测试耦合） ──
export const CONTRACT_FIELDS = ['type', 'status', 'version', 'owner', 'acceptance'];

export function parseFrontmatter(src) {
  const m = /^---\r?\n([\s\S]*?)\r?\n---/.exec(src);
  if (!m) return null;
  const fm = {};
  for (const line of m[1].split(/\r?\n/)) {
    const kv = /^([A-Za-z][\w-]*):\s*(.*)$/.exec(line);
    if (kv) fm[kv[1]] = kv[2].trim();
  }
  return fm;
}

/** 返回契约问题清单；空数组＝合格 */
export function contractProblems(src) {
  const fm = parseFrontmatter(src);
  if (!fm) return ['缺 frontmatter'];
  const problems = [];
  if (fm.type !== 'contract') problems.push(`type 须为 contract（实为 ${fm.type || '缺失'}）`);
  for (const key of CONTRACT_FIELDS) if (!fm[key]) problems.push(`缺 ${key}`);
  return problems;
}

// ── 调用点扫描 ──────────────────────────────────────────────────
/** 取括号配平片段（`open` 指向 `[` / `{`） */
function bracketText(src, open) {
  const pair = { '[': ']', '{': '}' }[src[open]];
  if (!pair) return '';
  let depth = 0;
  for (let i = open; i < src.length; i += 1) {
    if (src[i] === src[open]) depth += 1;
    else if (src[i] === pair) {
      depth -= 1;
      if (depth === 0) return src.slice(open, i + 1);
    }
  }
  return src.slice(open);
}

/** 表格渲染调用点（`renderDataTable(` / `renderFilteredList(`）：参数文本 + 起始偏移 */
export function tableCallBlocks(src) {
  const out = [];
  const re = /\brender(?:DataTable|FilteredList)\s*\(/g;
  let m;
  while ((m = re.exec(src))) {
    const open = src.indexOf('(', m.index);
    let depth = 0;
    let i = open;
    for (; i < src.length; i += 1) {
      if (src[i] === '(') depth += 1;
      else if (src[i] === ')') {
        depth -= 1;
        if (depth === 0) { i += 1; break; }
      }
    }
    out.push({ start: m.index, text: src.slice(m.index, i) });
    re.lastIndex = i;
  }
  return out;
}

/** 调用点的列数：columns 数组 / tableHeadHtml 数组 / 静态 <th> / colSpan 常量 */
export function columnCountOf(block) {
  const cols = /columns:\s*\[/.exec(block);
  if (cols) {
    const arr = bracketText(block, cols.index + cols[0].length - 1);
    return (arr.match(/\blabel:/g) || []).length || (arr.match(/\{/g) || []).length;
  }
  const thCall = /tableHeadHtml\(\s*\[/.exec(block);
  if (thCall) {
    const arr = bracketText(block, thCall.index + thCall[0].length - 1);
    return (arr.match(/\blabel:/g) || []).length || (arr.match(/\{/g) || []).length;
  }
  const th = (block.match(/<th\b/g) || []).length;
  if (th) return th;
  const span = Number(/colSpan:\s*(\d+)/.exec(block)?.[1] || 0);
  return span;
}

/** 是否给了列宽模板（固定 colgroup% 档） */
export function hasColumnTemplate(block) {
  return /colgroupHtml|columns:\s*\[/.test(block);
}

/** 手写 `<table class="data-table">` 计数 */
export function handwrittenTableCount(src) {
  return (src.match(/<table class="data-table\b/g) || []).length;
}

/** `<td>` 自身 class 含 text-xs 的计数（灰字分层：字号由表格档决定，不由单元格类改） */
export function tdTextXsCount(src) {
  return (src.match(/<td[^>]*\bclass="[^"]*\btext-xs\b[^"]*"/g) || []).length;
}

// ── 存量台账（只减不增；新增须在这里写理由） ─────────────────────
/** 引擎 / 组件本体自身产出的 `<table class="data-table">` 不计入「手写表」 */
export const TABLE_ENGINE_FILES = [
  'docs/src/components/ui/list-filter.js',
  'docs/src/components/ui/data-table.js',
];

/** 宽表（≥5 列）调用点尚未给列宽模板的存量例外（2026-11-10 批次 540 实测 9 处） */
export const WIDE_TABLE_EXCEPTIONS = [
  { file: 'docs/src/entries/tabs/secretary/committee-meeting-tab.js', count: 2, reason: '支委构成 / 支委会会议两表为 5 列定长内容，按内容定宽已够用' },
  { file: 'docs/src/entries/tabs/disc/inspection-tab.js', count: 2, reason: '纪检检查与考察两表存量 6–7 列，列宽模板迁移排后续批次' },
  { file: 'docs/src/entries/tabs/disc/makeup-tab.js', count: 1, reason: '补课任务台账存量 6 列，列宽模板迁移排后续批次' },
  { file: 'docs/src/entries/tabs/leader/attendance-tab.js', count: 1, reason: '组长考勤存量 6 列，列宽模板迁移排后续批次' },
  { file: 'docs/src/entries/tabs/leader/members-tab.js', count: 1, reason: '组长成员表存量 6 列，列宽模板迁移排后续批次' },
  { file: 'docs/src/entries/tabs/org/inspection-tab.js', count: 1, reason: '组织考察存量 5 列，列宽模板迁移排后续批次' },
  { file: 'docs/src/entries/tabs/org/member-flow-tab.js', count: 1, reason: '成员流动台账存量 5 列，列宽模板迁移排后续批次' },
];

/** 手写 data-table 存量（2026-11-10 批次 540 实测；党小组活动台账已迁组件后归零） */
export const HANDWRITTEN_TABLE_BASELINE = {
  'docs/src/components/governance/person-profile-sections.js': 1,
  'docs/src/components/governance/work-overview.js': 1,
  'docs/src/components/ui/relation-matrix.js': 1,
  'docs/src/entries/pages/branch-readonly-entry.js': 1,
  'docs/src/entries/tabs/party-committee/branches-tab.js': 2,
  'docs/src/entries/tabs/disc/attendance-tab.js': 1,
};

// ════════════════════════════════════════════════════════════════
//  T1 契约文档
// ════════════════════════════════════════════════════════════════
test('T1 表格契约：五键齐全 + 判据句在场', () => {
  const src = read(CONTRACT);
  assert.deepEqual(contractProblems(src), [], '契约必备字段不全');
  for (const phrase of ['同列同语义 ≥ 3 行', '≤ 12 项', 'colgroup', '1fr', 'height: auto', 'stickyFirstCol',
    'table:cols:', 'min-width: 1024px', 'neutral-800', 'neutral-400']) {
    assert.ok(src.includes(phrase), `契约正文缺判据句：${phrase}`);
  }
});

test('T1b 契约登记进 contracts/README 文件清单', () => {
  const idx = read(join(ROOT, 'content', '04_web_design', 'contracts', 'README.md'));
  assert.match(idx, /TABLE_COMPONENT_CONTRACT\.md/, 'contracts/README.md 未登记表格契约（读者找不到）');
  assert.match(idx, /table-contract-guard\.test\.mjs/, 'contracts/README.md 未登记验收守卫');
});

// ════════════════════════════════════════════════════════════════
//  T2 组件参数与产出物
// ════════════════════════════════════════════════════════════════
test('T2 组件暴露 columns / density / stickyFirstCol / scroll / resizable 与产出物', () => {
  const src = read(COMPONENT);
  for (const param of ['columns', 'density', 'stickyFirstCol', 'scroll', 'resizable']) {
    assert.match(src, new RegExp(`\\b${param}\\b`), `data-table.js 缺参数 ${param}`);
  }
  // 产出物：colgroup（含单一 1fr 余量列）/ 首列吸附类 / 横滚容器 / 拖动柄 / 数字列
  assert.match(src, /<colgroup>/, '缺 <colgroup> 产出（固定列宽档）');
  assert.match(src, /width:\$\{esc\(w\)\}/, 'colgroup 列宽须以 style width 写出');
  assert.match(src, /'1fr'/, '缺 1fr 余量列支持（定宽列 + 单余量列 = 不裁剪）');
  assert.match(src, /只允许一列 1fr/, '缺「余量列只许一列」的抛错');
  assert.match(src, /is-numeric/, '缺数字列标记');
  assert.match(src, /dt--sticky-first/, '缺首列吸附类');
  assert.match(src, /dt-scroll/, '缺横滚容器类');
  assert.match(src, /dt--resizable/, '缺列宽拖动类');
  // 拖动：仅 ≥1024px + 持久化键 + 只认首/末列分界
  assert.match(src, /\(min-width: 1024px\)/, '列宽拖动须限定 ≥1024px');
  assert.match(src, /table:cols:/, '列宽持久化键须为 table:cols:<key>');
  assert.match(src, /_edgeColumn/, '缺拖动命中的列分界判定');
  // 只许一列截断：第二列声明即抛错
  assert.match(src, /只允许一列截断/, '缺「全表只许一列截断」的抛错');
});

test('T2b styles.css 结构档：行高 40 / 详情行 auto / 截断 / 拖动柄仅 ≥1024px', () => {
  const css = read(STYLES);
  assert.match(css, /--row-table:\s*40px/, '表格行高须为 40px（--row-table）');
  assert.match(css, /\.data-table tbody tr\.dt-detail\s*\{[^}]*height:\s*auto/, '展开详情行须 height:auto');
  assert.match(css, /\.data-table \.is-truncate\s*\{[^}]*text-overflow:\s*ellipsis/, '缺单列截断样式');
  assert.match(css, /@media \(min-width: 1024px\) \{[\s\S]*?cursor:\s*col-resize/, '拖动柄须只在 ≥1024px 出现');
  assert.match(css, /\.dt--compact > \.data-table tbody tr\s*\{[^}]*height:\s*32px/, '缺紧凑档行高');
});

// ════════════════════════════════════════════════════════════════
//  T3 宽表必带列宽模板
// ════════════════════════════════════════════════════════════════
test('T3 宽表（≥5 列）组件调用点必须给 columns / colgroupHtml（存量例外逐条登记）', () => {
  const offenders = [];
  let wide = 0;
  for (const file of walkJs(SRC)) {
    const src = read(file);
    for (const b of tableCallBlocks(src)) {
      const cols = columnCountOf(b.text);
      if (cols < 5) continue;
      wide += 1;
      if (hasColumnTemplate(b.text)) continue;
      offenders.push({ file: rel(file), line: src.slice(0, b.start).split('\n').length, cols });
    }
  }
  assert.ok(wide >= 3, `扫描到的宽表调用点只有 ${wide} 个（下限 3）：扫描面被写坏`);
  // 例外按文件计数，超出登记数即红（不许新增例外不动台账）
  const budget = new Map(WIDE_TABLE_EXCEPTIONS.map((e) => [e.file, e.count]));
  for (const e of WIDE_TABLE_EXCEPTIONS) {
    assert.ok(e.reason && e.reason.length >= 8, `例外 ${e.file} 缺理由`);
    assert.ok(offenders.some((o) => o.file === e.file), `例外 ${e.file} 已无未给模板的宽表：请从台账删除`);
  }
  const over = offenders.filter((o) => {
    const allowed = budget.get(o.file) || 0;
    if (!allowed) return true;
    budget.set(o.file, allowed - 1);
    return false;
  });
  assert.deepEqual(over.map((o) => `${o.file}:${o.line}（${o.cols} 列）`), [],
    '以下宽表调用点缺列宽模板（columns / colgroupHtml）：');
});

// ════════════════════════════════════════════════════════════════
//  T4 手写表格棘轮
// ════════════════════════════════════════════════════════════════
test('T4 手写 <table class="data-table"> 逐文件只减不增', () => {
  const over = [];
  let total = 0;
  for (const file of walkJs(SRC)) {
    if (TABLE_ENGINE_FILES.includes(rel(file))) continue; // 引擎自身产出的 <table> 不是「手写表」
    const n = handwrittenTableCount(read(file));
    if (!n) continue;
    total += n;
    const allowed = HANDWRITTEN_TABLE_BASELINE[rel(file)] || 0;
    if (n > allowed) over.push(`${rel(file)}：${n} > ${allowed}`);
  }
  assert.deepEqual(over, [], '手写表格超基线（新表必须走 components/ui/data-table.js）');
  // 台账自身不陈旧：登记的文件仍存在且有手写表
  for (const [file, n] of Object.entries(HANDWRITTEN_TABLE_BASELINE)) {
    const got = handwrittenTableCount(read(join(ROOT, file)));
    assert.equal(got, n, `${file} 手写表计数 ${got} 与台账 ${n} 不一致：请下调基线（只减不增）`);
  }
  assert.ok(total <= 7, `手写 data-table 合计 ${total} 张（上限 7）`);
  // 已迁移页不得回潮
  assert.equal(handwrittenTableCount(read(join(SRC, 'entries', 'tabs', 'secretary', 'group-progress-tab.js'))), 0,
    '党小组活动台账已迁 renderDataTable，不得再手写 <table>');
});

// ════════════════════════════════════════════════════════════════
//  T4b 首个采用页：展开详情走 colspan 插行（契约 §三）
// ════════════════════════════════════════════════════════════════
test('T4b 党小组活动台账：详情为 colspan 插行 + 开关是原生 details/summary', () => {
  const src = read(join(SRC, 'entries', 'tabs', 'secretary', 'group-progress-tab.js'));
  assert.match(src, /<tr class="dt-detail"><td colspan="\d+"/, '展开详情须以 colspan 插行渲染');
  assert.match(src, /_reviewDetailRowHtml/, '缺插行渲染函数');
  assert.match(src, /<details class="gp-review-toggle/, '展开开关须为原生 details（可聚焦）');
  assert.doesNotMatch(src, /<details[^>]*gp-review-toggle[\s\S]{0,200}_reviewDetailHtml\(rev\)[\s\S]{0,20}<\/details>/,
    '详情不得再塞回数据格内的 details');
});

// ════════════════════════════════════════════════════════════════
//  T5 td 内 text-xs = 0
// ════════════════════════════════════════════════════════════════
test('T5 <td> 自身 class 不得含 text-xs（字号由表格档决定）', () => {
  const offenders = [];
  for (const file of walkJs(SRC)) {
    const n = tdTextXsCount(read(file));
    if (n) offenders.push(`${rel(file)}：${n} 处`);
  }
  assert.deepEqual(offenders, [], '数据格不得自行改字号：主值 13/500、次值 12/400、空值 neutral-400');
});

// ════════════════════════════════════════════════════════════════
//  T6 390 无溢出
// ════════════════════════════════════════════════════════════════
test('T6 390 无溢出：.dt-scroll 横滚 + ≤640px 复位 + scroll 调用点必须 responsive', () => {
  const css = read(STYLES);
  assert.match(css, /\.dt-scroll\s*\{[^}]*overflow-x:\s*auto/, '.dt-scroll 须 overflow-x: auto');
  assert.match(css, /@media \(max-width: 640px\) \{[\s\S]*?\.dt-scroll > \.data-table\[data-responsive="cards"\]\s*\{[^}]*min-width:\s*0/,
    '≤640px 卡式行须清零表格最小宽（否则 390px 横向溢出）');
  assert.match(css, /@media \(max-width: 640px\) \{[\s\S]*?\.dt--sticky-first[^}]*\{[^}]*position:\s*static/,
    '≤640px 卡式行须清零首列吸附');
  assert.match(css, /@container \(max-width: 640px\)/, '断点须按容器（container-type + @container）');
  assert.match(css, /\.dt-scroll\s*\{[^}]*container-type:\s*inline-size/, '.dt-scroll 须声明 container-type');

  // 调用点：开了横滚就必须开卡式行，否则窄屏只能内部横滚、页面看似溢出
  const bad = [];
  for (const file of walkJs(SRC)) {
    const src = read(file);
    for (const b of tableCallBlocks(src)) {
      if (!/\bscroll:/.test(b.text)) continue;
      if (!/responsive:\s*true/.test(b.text)) {
        bad.push(`${rel(file)}:${src.slice(0, b.start).split('\n').length}`);
      }
    }
  }
  assert.deepEqual(bad, [], '声明 scroll 的表格必须同时 responsive: true');
});

// ════════════════════════════════════════════════════════════════
//  T7 反例自证
// ════════════════════════════════════════════════════════════════
test('T7 反例自证：判据函数不得恒真 / 恒假', () => {
  // 契约字段
  const good = '---\ntype: contract\nstatus: active\nversion: 1.0.0\nowner: 支书\nacceptance: 见 T1\n---\n';
  assert.deepEqual(contractProblems(good), []);
  assert.ok(contractProblems(good.replace(/^acceptance:.*$/m, '')).length > 0, '缺 acceptance 未判红');
  assert.ok(contractProblems('no frontmatter').length > 0, '缺 frontmatter 未判红');

  // 宽表列数 / 列宽模板
  const wideNoTemplate = `renderDataTable(host, {\n  headHtml: tableHeadHtml([{ label: 'A' }, { label: 'B' }, { label: 'C' }, { label: 'D' }, { label: 'E' }, { label: 'F' }]),\n});`;
  const block = tableCallBlocks(wideNoTemplate)[0];
  assert.equal(columnCountOf(block.text), 6, 'tableHeadHtml 数组列数解析失效');
  assert.equal(hasColumnTemplate(block.text), false, '无模板的宽表被判为有模板');
  const wideWithColgroup = wideNoTemplate.replace('headHtml:', 'colgroupHtml: \'<col>\',\n  headHtml:');
  assert.equal(hasColumnTemplate(wideWithColgroup), true, '带 colgroupHtml 的宽表未被识别');
  const colsArr = `renderDataTable(host, { columns: [{ label: 'A', width: 10 }, { label: 'B', width: 20 }, { label: 'C', width: 30 }, { label: 'D', width: 20 }, { label: 'E', width: 20 }] });`;
  assert.equal(columnCountOf(tableCallBlocks(colsArr)[0].text), 5, 'columns 数组列数解析失效');
  assert.equal(columnCountOf(`renderDataTable(host, { headHtml: heads, colSpan: 4 });`), 4,
    'colSpan 兜底解析失效');

  // 手写表 / td 字号
  assert.equal(handwrittenTableCount('<table class="data-table">'), 1);
  assert.equal(handwrittenTableCount('<table class="data-table rm-table">'), 1);
  assert.equal(handwrittenTableCount('<table class="other">'), 0);
  assert.equal(tdTextXsCount('<td class="text-xs text-gray-500">x</td>'), 1);
  assert.equal(tdTextXsCount('<td data-label="日期" class="font-medium text-gray-800">x</td>'), 0);
});
