// role: [工程师]+[AI]
// no-about-route-guard.test.mjs — 「关于」撤路由回归防线（2026-10-27 美学三镜 · Task 12.4）
//
// 口径（支书裁定）：`about.html` **文件保留**（旧外链 / 收藏仍可直达，不制造 404），
// 但全站**不再提供任何「关于」导航入口**：
//   A1 `docs/**/*.html` 不得有 `href` 指向 `about.html`（侧边栏 / 帮助目录 / 任意正文链接）；
//   A2 `docs/src/**/*.js` 不得渲染 `about.html` 目标，也不得有 `module: 'about'` 侧栏项；
//   A3 `docs/**/*.md`（README / AGENTS）不得再登记 `about.html` / `about-entry.js` 指针；
//   A4 `docs/about.html` 仍在（撤路由 ≠ 删文件）。
//
// 非空转判据（缺一不可）：
//   ① 抽取口径在合成正/负样本上命中/不命中（A5，防正则失效恒真）；
//   ② 扫描面规模下限（HTML 页 / JS 文件 / Markdown 文件），低于下限＝口径或范围被削；
//   ③ A4 文件存在且非空（防「删文件冒充撤路由」）。
// 故障注入（人工，不入仓）：在 `docs/help.html` 临时加回 `<a href="./about.html">关于</a>`
//   或 `sidebar.js` 加回 `{ module: 'about', … }` ⇒ A1 / A2 必须判红。
//
// 运行：node --test server/test/no-about-route-guard.test.mjs（纯 node，不起服务）
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const DOCS = join(ROOT, 'docs');
const ABOUT_FILE = join(DOCS, 'about.html');

/** 扫描面规模下限（非空转：实测值见批报告；低于下限＝口径失效或扫描范围被削） */
const HTML_FLOOR = 15;   // docs/**/*.html
const JS_FLOOR = 180;    // docs/src/**/*.js
const MD_FLOOR = 2;      // docs/**/*.md（README + src/AGENTS.md）

/** 归一化一个 href / 字面量：去 query / hash 后取末段，判是否指向 about.html */
function isAboutTarget(value) {
  const raw = String(value || '').trim();
  if (!raw || raw.startsWith('#')) return false;          // 纯锚点不是文件目标
  const pathPart = raw.split('#')[0].split('?')[0].replace(/\$\{[^}]*\}/g, '');
  if (!pathPart) return false;
  const base = pathPart.replace(/\\/g, '/').split('/').pop().toLowerCase();
  return base === 'about.html';
}

/** HTML：抽取全部 href 值 */
function htmlHrefs(src) {
  const out = [];
  const re = /\bhref\s*=\s*(?:"([^"]*)"|'([^']*)')/gi;
  let m;
  while ((m = re.exec(src)) !== null) out.push(m[1] ?? m[2] ?? '');
  return out;
}

/** HTML：指向 about.html 的 href（正样本命中，负样本不命中） */
function htmlAboutLinks(src) {
  return htmlHrefs(src).filter(isAboutTarget);
}

/** JS：抽取引号包裹的字面量（含模板串）＋ `module: 'about'` 侧栏项 */
const JS_QUOTED_RE = /(['"`])([^'"`\n]*?)\1/g;
const JS_ABOUT_MODULE_RE = /\bmodule\s*:\s*(['"])about\1/;

function jsRouteHits(src) {
  const hits = [];
  src.split(/\r?\n/).forEach((line, i) => {
    const t = line.trim();
    if (!t || t.startsWith('//') || t.startsWith('*') || t.startsWith('/*')) return;
    let m;
    const re = new RegExp(JS_QUOTED_RE.source, 'g');
    while ((m = re.exec(line)) !== null) {
      if (isAboutTarget(m[2])) hits.push({ line: i + 1, kind: 'literal', value: m[2] });
    }
    if (JS_ABOUT_MODULE_RE.test(line)) hits.push({ line: i + 1, kind: 'module', value: t });
  });
  return hits;
}

/** Markdown：about 页面 / 入口指针（大小写不敏感） */
const MD_POINTER_RE = /about\.html|about-entry\.js/i;
function mdAboutPointers(src) {
  return src.split(/\r?\n/)
    .map((line, i) => ({ line: i + 1, text: line }))
    .filter((row) => MD_POINTER_RE.test(row.text));
}

/** 递归收集指定后缀（相对仓库根的 posix 路径） */
function filesWithExt(dir, ext) {
  const out = [];
  const walk = (d) => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      if (e.name === '.git' || e.name === 'vendor' || e.name === 'assets') continue;
      const p = join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name.endsWith(ext)) out.push(relative(ROOT, p).replace(/\\/g, '/'));
    }
  };
  walk(dir);
  return out.sort();
}

// ── A1 HTML 无 about 导航链接 ────────────────────────────────────────
test('A1 docs/**/*.html 不得再有 href 指向 about.html（侧边栏 / 帮助目录 / 正文）', () => {
  const files = filesWithExt(DOCS, '.html');
  const offenders = [];
  for (const f of files) {
    for (const href of htmlAboutLinks(readFileSync(join(ROOT, f), 'utf8'))) {
      offenders.push(`${f} → href="${href}"`);
    }
  }
  assert.deepEqual(offenders, [], `About 导航链接残留：\n  ${offenders.join('\n  ')}`);
  console.log(`[A1] About 导航链接：扫描 ${files.length} 个 HTML，残留 ${offenders.length} 处`);
});

// ── A2 JS 无 about 路由 / 侧栏项 ─────────────────────────────────────
test('A2 docs/src/**/*.js 不得渲染 about.html，也不得有 module: "about" 侧栏项', () => {
  const files = filesWithExt(join(DOCS, 'src'), '.js');
  const offenders = [];
  for (const f of files) {
    for (const h of jsRouteHits(readFileSync(join(ROOT, f), 'utf8'))) {
      offenders.push(`${f}:${h.line} → ${h.kind === 'module' ? h.value : `about.html 字面量「${h.value}」`}`);
    }
  }
  assert.deepEqual(offenders, [], `About 路由残留：\n  ${offenders.join('\n  ')}`);
  console.log(`[A2] About 路由：扫描 ${files.length} 个 JS，残留 ${offenders.length} 处`);
});

// ── A3 Markdown 无 about 指针 ────────────────────────────────────────
test('A3 docs/**/*.md 不得再登记 about.html / about-entry.js 指针', () => {
  const files = filesWithExt(DOCS, '.md');
  const offenders = [];
  for (const f of files) {
    for (const row of mdAboutPointers(readFileSync(join(ROOT, f), 'utf8'))) {
      offenders.push(`${f}:${row.line} → ${row.text.trim()}`);
    }
  }
  assert.deepEqual(offenders, [], `About 文档指针残留：\n  ${offenders.join('\n  ')}`);
  console.log(`[A3] About 文档指针：扫描 ${files.length} 个 Markdown，残留 ${offenders.length} 处`);
});

// ── A4 文件保留 ──────────────────────────────────────────────────────
test('A4 docs/about.html 文件仍存在且非空（撤路由 ≠ 删文件）', () => {
  assert.ok(existsSync(ABOUT_FILE), 'docs/about.html 被删除：撤路由只撤入口，文件须保留（旧外链不 404）');
  assert.ok(statSync(ABOUT_FILE).size > 0, 'docs/about.html 为空文件');
});

// ── A5 非空转自检 ────────────────────────────────────────────────────
test('A5 非空转：抽取口径正/负样本可判 + 扫描面规模达标', () => {
  // ① 目标判定：各种 about.html 形态命中，相似名 / 锚点不命中
  const positives = ['./about.html', 'about.html', '/docs/about.html?x=1', 'about.html#top', '${base}about.html'];
  const negatives = ['#about.html', './about.css', './about.html.bak', './myabout.html', './about-entry.js', ''];
  for (const v of positives) assert.equal(isAboutTarget(v), true, `应命中 about 目标：${v}`);
  for (const v of negatives) assert.equal(isAboutTarget(v), false, `不应命中 about 目标：${v}`);

  // ② HTML 口径
  assert.deepEqual(
    htmlAboutLinks('<a href="./about.html">关于</a><a href="./help.html">帮助</a>'),
    ['./about.html'],
    'HTML 抽取口径失效：about 链接未命中或误伤',
  );

  // ③ JS 口径：渲染字面量 / 侧栏 module 命中；帮助入口与 about-entry 入口不命中
  const jsHits = jsRouteHits([
    "const a = `<a href=\"${base}about.html\">关于</a>`;",
    "items.push({ module: 'about', label: '关于', href: base + 'about.html' });",
    "renderSidebar('about', { staticShell: true });",
    "const b = base + 'help.html';",
  ].join('\n'));
  assert.deepEqual(jsHits.map((h) => h.line), [1, 2, 2],
    'JS 抽取口径失效：about 字面量 / module 未命中，或误伤帮助入口');
  assert.ok(jsHits.some((h) => h.kind === 'module'), 'JS 抽取口径失效：module: "about" 未命中');

  // ④ 扫描面规模下限（低于下限说明口径失效或扫描范围被削）
  const html = filesWithExt(DOCS, '.html');
  const js = filesWithExt(join(DOCS, 'src'), '.js');
  const md = filesWithExt(DOCS, '.md');
  assert.ok(html.length >= HTML_FLOOR, `只扫到 ${html.length} 个 HTML（下限 ${HTML_FLOOR}）：扫描范围异常`);
  assert.ok(js.length >= JS_FLOOR, `只扫到 ${js.length} 个 JS（下限 ${JS_FLOOR}）：扫描范围异常`);
  assert.ok(md.length >= MD_FLOOR, `只扫到 ${md.length} 个 Markdown（下限 ${MD_FLOOR}）：扫描范围异常`);
  console.log(`[A5] 非空转：HTML ${html.length}（下限 ${HTML_FLOOR}）· JS ${js.length}（下限 ${JS_FLOOR}）`
    + ` · MD ${md.length}（下限 ${MD_FLOOR}）`);
});
