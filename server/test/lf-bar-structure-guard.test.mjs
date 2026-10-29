// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  server/test/lf-bar-structure-guard.test.mjs — 筛选四段结构守卫（P3 · 2026-10-29）
// ════════════════════════════════════════════════════════════════
// 判据（静态扫描，纯 node）：
//   L1 `.lf-bar` 的直接子元素**只能是** `.lf-bar__row`（不得把控件直接塞进 bar）；
//   L2 每个 `.lf-bar` 至少含 `data-seg="search"` 段，段序固定 scope → search → facet → reset，
//      同段不重复；纯范围面（`data-lf-scope-only`）是唯一登记的例外（恰 1 处，防僵尸）；
//   L3 反例自检：控件直塞 bar、删掉 search 段，分析器必须判红（证明不是恒真）；
//   L4 非空转下限：`.lf-bar` 产出点 ≥ 12；
//   L5 本守卫须登记在 `test:daily`（否则改名/移动后无人再跑）。
//
// 引擎特例：`components/ui/list-filter.js` 的根模板是运行时填充（`<div class="lf-bar"></div>`），
//   静态为空 ⇒ 只对该文件允许空 bar，并另行核对它的运行时模板确实产出四段行。
// ════════════════════════════════════════════════════════════════
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(import.meta.dirname, '..', '..');
const DOCS = join(ROOT, 'docs');
const SRC = join(DOCS, 'src');
const ENGINE = 'docs/src/components/ui/list-filter.js';
const PKG = JSON.parse(readFileSync(join(ROOT, 'server', 'package.json'), 'utf8'));
const read = (abs) => readFileSync(abs, 'utf8');
const rel = (abs) => abs.slice(ROOT.length + 1).replace(/\\/g, '/');

const SEG_ORDER = ['scope', 'search', 'facet', 'reset'];

/** 递归收集 docs/src 下全部 .js（不含 docs/scripts / assets）。 */
function walkJs(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walkJs(full, out);
    else if (name.endsWith('.js')) out.push(full);
  }
  return out;
}

/** 扫描面：docs/src 下全部 .js ＋ docs 根目录 .html（工作台页由 JS 产出，不重复扫）。 */
function scanFiles() {
  return [
    ...walkJs(SRC),
    ...readdirSync(DOCS)
      .filter((n) => n.endsWith('.html'))
      .map((n) => join(DOCS, n)),
  ];
}

/**
 * 提取全部 `.lf-bar` 产出点：{ file, open, inner }。
 * 依据 div 配平定位 bar 的闭合位置（模板串里的嵌套 div 一并计入）。
 */
function barsOf(src, file) {
  const out = [];
  const openRe = /<div\b[^>]*?\bclass="([^"]*)"[^>]*>/g;
  let m;
  while ((m = openRe.exec(src))) {
    const classes = m[1].split(/\s+/).filter(Boolean);
    if (!classes.includes('lf-bar')) continue;
    const start = openRe.lastIndex;
    let depth = 1;
    let end = src.length;
    const tagRe = /<div\b[^>]*>|<\/div>/g;
    tagRe.lastIndex = start;
    let t;
    while ((t = tagRe.exec(src))) {
      if (t[0].startsWith('</div>')) {
        depth -= 1;
        if (depth === 0) { end = t.index; break; }
      } else {
        depth += 1;
      }
    }
    out.push({ file, open: m[0], inner: src.slice(start, end) });
    openRe.lastIndex = end;
  }
  return out;
}

/** 直接子元素（去 HTML 注释；div 配平只用于判断层级，不解析属性语法）。 */
function directChildren(inner) {
  const src = inner.replace(/<!--[\s\S]*?-->/g, '');
  const re = /<([a-zA-Z][\w-]*)\b([^>]*?)(\/?)>|<\/div>/g;
  const kids = [];
  let depth = 0;
  let m;
  while ((m = re.exec(src))) {
    if (m[0].startsWith('</div>')) {
      if (depth > 0) depth -= 1;
      continue;
    }
    const tag = m[1].toLowerCase();
    if (depth === 0) kids.push({ tag, attrs: m[2] || '' });
    if (tag === 'div') depth += 1;
  }
  return kids;
}

const classOf = (attrs) => (/class="([^"]*)"/.exec(attrs)?.[1] || '').split(/\s+/).filter(Boolean);
const isRow = (kid) => kid.tag === 'div' && classOf(kid.attrs).includes('lf-bar__row');

/** 分析单条 bar，返回违规列表（空 = 合法）。 */
function analyzeBar(bar) {
  const bad = [];
  const { file, open, inner } = bar;
  if (!inner.trim()) {
    if (file !== ENGINE) bad.push('bar 内容为空（只有统一引擎允许运行时填充）');
    return bad;
  }
  const kids = directChildren(inner);
  if (kids.length === 0) bad.push('bar 内没有任何直接子元素');
  for (const kid of kids) {
    if (!isRow(kid)) bad.push(`直接子元素 <${kid.tag}> 不是 .lf-bar__row`);
  }
  const rows = kids.filter(isRow);
  const segs = rows.map((r) => /data-seg="([^"]+)"/.exec(r.attrs)?.[1] || '');
  for (const seg of segs) {
    if (!SEG_ORDER.includes(seg)) bad.push(`未知段位 data-seg="${seg}"`);
  }
  if (new Set(segs).size !== segs.length) bad.push(`段位重复：${segs.join(' / ')}`);
  const idx = segs.filter((s) => SEG_ORDER.includes(s)).map((s) => SEG_ORDER.indexOf(s));
  if (idx.some((v, i) => i > 0 && v <= idx[i - 1])) bad.push(`段序不是 scope→search→facet→reset：${segs.join(' → ')}`);
  const scopeOnly = /data-lf-scope-only="1"/.test(open);
  if (!scopeOnly && !segs.includes('search')) bad.push('缺少 search 段（纯范围面须显式标 data-lf-scope-only）');
  if (scopeOnly && segs.some((s) => s !== 'scope')) bad.push('data-lf-scope-only 的 bar 只允许 scope 段');
  return bad;
}

function collectBars() {
  const bars = [];
  for (const file of scanFiles()) {
    const src = read(file);
    if (!src.includes('lf-bar')) continue;
    bars.push(...barsOf(src, rel(file)));
  }
  return bars;
}

test('L1 `.lf-bar` 的直接子元素只能是 `.lf-bar__row`', () => {
  const bars = collectBars();
  assert.ok(bars.length > 0, '未扫描到任何 .lf-bar（扫描面被写坏）');
  const offenders = [];
  for (const bar of bars) {
    const kids = bar.inner.trim() ? directChildren(bar.inner) : [];
    for (const kid of kids) {
      if (!isRow(kid)) offenders.push(`${bar.file}：bar 的直接子元素 <${kid.tag}> 不是 .lf-bar__row`);
    }
  }
  assert.deepEqual(offenders, [], `筛选行结构不合规（控件须先落 .lf-bar__row）：\n  ${offenders.join('\n  ')}`);
});

test('L2 段位：至少 search；顺序 scope→search→facet→reset；纯范围例外恰 1 处', () => {
  const bars = collectBars();
  const bad = [];
  let scopeOnly = 0;
  for (const bar of bars) {
    const issues = analyzeBar(bar);
    for (const issue of issues) bad.push(`${bar.file}：${issue}`);
    if (/data-lf-scope-only="1"/.test(bar.open)) scopeOnly += 1;
  }
  assert.deepEqual(bad, [], `筛选段位不合规：\n  ${bad.join('\n  ')}`);
  assert.equal(scopeOnly, 1, `纯范围例外须恰 1 处（当前 ${scopeOnly}）；新增例外先在 P3 台账登记`);
  const engine = read(join(ROOT, ENGINE));
  for (const seg of SEG_ORDER) {
    assert.match(engine, new RegExp(`data-seg="${seg}"`), `引擎运行时模板缺少 ${seg} 段`);
  }
});

test('L3 反例：控件直塞 bar / 删掉 search 段，必须判红', () => {
  const direct = analyzeBar({
    file: 'fixture.js',
    open: '<div class="lf-bar">',
    inner: '<button type="button">清除</button>',
  });
  assert.ok(direct.some((s) => s.includes('不是 .lf-bar__row')), '控件直塞 .lf-bar 未被判红');

  const src = read(join(SRC, 'entries/tabs/secretary/feedback-tab.js'));
  const bars = barsOf(src, 'fixture.js');
  assert.ok(bars.length === 1, '反馈 tab 应恰有 1 条 .lf-bar');
  const noSearch = bars[0].inner.replace(/\s*<div class="lf-bar__row" data-seg="search">[\s\S]*?<\/div>/, '');
  const stripped = analyzeBar({ file: 'fixture.js', open: bars[0].open, inner: noSearch });
  assert.ok(stripped.some((s) => s.includes('缺少 search 段')), '删掉 search 段未被判红');
});

test('L4 非空转下限：`.lf-bar` 产出点 ≥ 12', () => {
  const bars = collectBars();
  const files = new Set(bars.map((b) => b.file));
  assert.ok(bars.length >= 12, `只扫描到 ${bars.length} 个 .lf-bar（下限 12）：扫描面被写坏`);
  assert.ok(files.size >= 12, `只涉及 ${files.size} 个文件（下限 12）`);
});

test('L5 守卫登记在 test:daily', () => {
  assert.match(PKG.scripts['test:daily'], /lf-bar-structure-guard\.test\.mjs/, 'test:daily 须登记本守卫');
});
