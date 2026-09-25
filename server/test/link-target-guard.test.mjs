// role: [工程师]+[AI]
// link-target-guard.test.mjs — 「JS 渲染型 href/src 的裸文件名」回归防线（2026-09-25 美学与链接存量批）
//
// 病灶（支书实机踩到过 404）：`docs/workspace/*.html` 七个工作台页**都有 `<base href="../">`**，
//   把基准 URL 从 `docs/workspace/` 抬到 `docs/`。于是 JS 模板串里写的**裸文件名**（形如
//   `href="secretary.html?activityId=…"`）会被浏览器解析到 **`docs/secretary.html`**（站点根下的同名文件）
//   ——而工作台页实际上在 `docs/workspace/` 下 ⇒ **404**。
//
// 为什么前几批的守卫没抓到（**盲区**）：
//   · 静态链接层 `link-integrity.test.mjs::L1` 只扫 `docs/**/*.html` 的 href/src（HTML 里写的是 `./workspace/…`，
//     正确），对 `docs/src/**` 的**渲染型** href 只查了 `../` 前缀那一类（写 `../` 在本地「恰好能跑」、
//     子路径发布时才 404），**没查裸文件名**。
//   · JS 导航层 `L2` 只扫 `location.href = …` 赋值，模板串里渲染的 `href="…"` 属空白区。
//   ⇒ 本守卫补这一层：**渲染型 href/src 里的裸文件名，按 `<base>` 规则解析后必须指向真实存在的文件**。
//
// 判据与「页面有没有 `<base href="../">`」的联动（**这是本 bug 的机理**）：
//   · 工作台页 `docs/workspace/x.html`：`<base href="../">` ⇒ 基准 = `docs/` ⇒ 裸 `y.html` 解析到 `docs/y.html`。
//   · 根级页 `docs/y.html`（无 `<base>`）⇒ 基准 = 页面所在目录 = `docs/` ⇒ 裸 `y.html` **同样**解析到 `docs/y.html`。
//   ⇒ 全站页面只落在 `docs/` 与 `docs/workspace/` 两处，**两种页面的基准都汇到 `docs/`**
//     ⇒ 裸文件名 `y.html` 的目标**与「渲染进哪个页面」无关**，恒等于 `docs/y.html`。
//     同理 `./workspace/y.html` 在两种页面下都解析到 `docs/workspace/y.html`。
//
// 共享件的处置与失真风险（**如实登记**）：
//   · 一段 JS 可能被多个页面复用（共享组件 / 共享 tab），静态上无法确定它渲染进哪张页面。
//     因上一条「两种页面基准同为 `docs/`」，本守卫**不需要**判定宿主页面 ⇒ 取「两种页面的交集」即可，
//     即：**裸文件名必须指向 `docs/` 根级真实存在的文件**（既不宽松也不加严）。
//   · 失真风险（唯一一种）：若将来出现**位于新子目录、且不带 `<base>`** 的页面复用同一段 JS，则裸文件名在
//     那张页面上会解析到**该子目录**（而非 `docs/`），本守卫会把它的「合法裸名」误判为红。届时须：
//     ① 给该页面补 `<base href="../">`（与工作台页同规），或 ② 把该处渲染路径改写成 `./…`/`getBasePath()+…`
//     （**推荐**，与既有 `getBasePath()` 口径一致，且与页面位置解耦）。**本守卫不为未出现的页面形态提前放宽。**
//
// 非空转判据（**缺一不可**）：
//   ① 抽取口径在合成正/负样本上必须命中/不命中（防正则失效恒真）：见 SAMPLE_* 自检；
//   ② 抽取面规模下限（扫描到的 js 文件数 / 渲染型属性引用数）——低于下限说明口径失效或扫描范围被削；
//   ③ 正样本可判：两个**已修样本**（`workforce-panel.js` / `activities-tab.js`）的渲染路径必须是
//      `./workspace/…`（裸名会 404）——它们此前就是这个 bug 的现场；
//   ④ 反例实测（人工，不入仓）：把任一处改回裸名 ⇒ 本守卫须判红（见批报告）。
//
// 运行：node --test server/test/link-target-guard.test.mjs（纯 node，无需起服务）
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const DOCS = join(ROOT, 'docs');

/**
 * 渲染型属性抽取口径（单一源）：
 * `href` / `src` 紧跟 `=`（HTML）或 `:`（对象属性）后接 **引号包裹的字符串**（"…" / '…' / `…`）。
 * 只取「属性值本身就是字符串字面量」的形态——`href = getBasePath() + 'x.html'` 这类**拼接**不命中
 * （拼接是页面位置解耦的写法，不属本病灶）；`new URL(…)` / `from '…'` 等 Node 读取语境另行剔除。
 */
const RENDER_REF_RE = /\b(?:href|src)\s*[=:]\s*(?:"([^"\n]*)"|'([^'\n]*)'|`([^`\n]*)`)/g;
/** 裸文件名形态：小写字母开头、只含小写字母/数字/连字符 + `.html`（**不含任何路径分隔符 / 前缀**） */
const BARE_RE = /^[a-z][a-z0-9-]*\.html$/;

/** 抽取面规模下限（非空转：实测值见批报告；低于下限＝口径失效或扫描范围被削） */
const JS_FILE_FLOOR = 180;   // docs/src 下 .js 文件数
const RENDER_REF_FLOOR = 100; // 渲染型 href/src 引用数（含各类前缀 / 外部 / 动态）

/** 已修样本（此前就是「裸名 → <base> 解析到站点根 ⇒ 404」的现场）：这些文件里的渲染路径不得是裸名 */
const FIXED_SAMPLE_FILES = [
  'docs/src/entries/tabs/secretary/workforce-panel.js',
  'docs/src/entries/tabs/visitor/activities-tab.js',
];

/** 递归收集 docs/src 下全部 .js（相对仓库根的 posix 路径） */
function jsFiles() {
  const out = [];
  const walk = (dir) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name.endsWith('.js')) out.push(relative(ROOT, p).replace(/\\/g, '/'));
    }
  };
  walk(join(DOCS, 'src'));
  return out.sort();
}

/** 全站页面清单（决定 `<base>` 解析基准）：`{ path, baseDir, hasBase }` */
function htmlPages() {
  const out = [];
  const walk = (dir) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, e.name);
      if (e.isDirectory()) { if (e.name !== 'assets') walk(p); continue; }
      if (!e.name.endsWith('.html')) continue;
      const rel = relative(DOCS, p).replace(/\\/g, '/');
      const src = readFileSync(p, 'utf8');
      const base = (src.match(/<base href="([^"]+)"/) || [])[1] || null;
      // 基准目录 = 页面所在目录 ⊕ <base href>（与浏览器同规；本仓 base 只有 "../"）
      const baseDir = base ? join(dirname(p), base).replace(/\\/g, '/') : dirname(p).replace(/\\/g, '/');
      out.push({ path: rel, baseDir: relative(DOCS, baseDir).replace(/\\/g, '/') || '.', hasBase: !!base });
    }
  };
  walk(DOCS);
  return out.sort((a, b) => a.path.localeCompare(b.path));
}

/** 逐行抽取渲染型属性引用 `[{ file, line, value }]`（剔除整行注释 / ESM 规格符 / Node 读取语境） */
function extractRenderedRefs(relFile) {
  const out = [];
  const src = readFileSync(join(ROOT, relFile), 'utf8');
  src.split(/\r?\n/).forEach((line, i) => {
    const t = line.trim();
    if (!t || t.startsWith('//') || t.startsWith('*') || t.startsWith('/*')) return; // 整行注释
    if (/\bfrom\s*['"`]|\bimport\s*\(|\bnew\s+URL\s*\(/.test(line)) return; // ESM 规格符 / Node 读取
    const re = new RegExp(RENDER_REF_RE.source, 'g');
    let m;
    while ((m = re.exec(line)) !== null) out.push({ file: relFile, line: i + 1, value: m[1] ?? m[2] ?? m[3] });
  });
  return out;
}

/**
 * 分类一个渲染型属性值（**判据单一源**，供机检与非空转自检共用）：
 *   skip     空值 / 纯锚点（`#x`）——无文件目标
 *   dynamic  路径段含 `${…}`（运行时拼接）——静态不可判
 *   external 带 scheme（http/mailto/tel/data）或 `//host` ——外部
 *   prefixed 以 `/` `./` `../` 开头——显式路径（`../` 由 link-integrity L1 另守）
 *   bare     裸文件名（`x.html`）——**本守卫的判红面**
 *   other    其余（形如 `workspace/x.html` 的相对路径片段等）
 */
function classify(value) {
  const v = String(value || '');
  const pathPart = v.split('#')[0].split('?')[0];
  if (!pathPart) return { kind: v.startsWith('#') ? 'skip' : 'skip' };
  if (pathPart.includes('${')) return { kind: 'dynamic' };
  if (/^[a-z][a-z0-9+.-]*:/i.test(pathPart) || pathPart.startsWith('//')) return { kind: 'external' };
  if (pathPart.startsWith('/') || pathPart.startsWith('./') || pathPart.startsWith('../')) return { kind: 'prefixed' };
  if (BARE_RE.test(pathPart)) return { kind: 'bare', name: pathPart };
  return { kind: 'other' };
}

/** 解析裸文件名目标：两种页面（根级 / 工作台）基准都汇到 `docs/` ⇒ 恒为 `docs/<name>` */
const resolveBare = (name) => join(DOCS, name);

/** 全量扫描（一次） */
function scan() {
  const files = jsFiles();
  const refs = [];
  for (const f of files) refs.push(...extractRenderedRefs(f));
  return { files, refs };
}

// ── L6 裸文件名渲染目标存在性 ─────────────────────────────────────────
test('L6 裸文件名渲染 href/src：按 <base> 规则解析后目标必须真实存在（裸 x.html → docs/x.html）', () => {
  const { files, refs } = scan();
  const offenders = [];
  let bareCount = 0;
  for (const r of refs) {
    const c = classify(r.value);
    if (c.kind !== 'bare') continue;
    bareCount++;
    const target = resolveBare(c.name);
    if (!existsSync(target)) {
      offenders.push(`${r.file}:${r.line} → href/src="${r.value}" ⇒ 解析为 docs/${c.name}，但该文件不存在`
        + `（裸文件名在工作台页 <base href="../"> 下会落到站点根 ⇒ 404；应写 ./workspace/${c.name} 或 getBasePath()+…）`);
    }
  }
  console.log(`[L6] 渲染型 href/src 裸文件名：扫描 ${files.length} 个 js / ${refs.length} 处引用，其中裸名 ${bareCount} 处，`
    + `不存在 ${offenders.length} 处`);
  assert.deepEqual(offenders, [],
    `渲染型裸文件名解析到不存在的文件（<base> 联动口径见文件头）：\n  ${offenders.join('\n  ')}`);
});

// ── L7 非空转自检 ────────────────────────────────────────────────────
test('L7 非空转：抽取口径可用 + 抽取面规模达标 + 已修样本可判', () => {
  // ① 抽取口径正/负样本（合成片段：能命中裸名、不误判其它形态）
  const synth = [
    'const a = `<a href="secretary.html?activityId=1">x</a>`;', // 裸名 → 命中
    'const b = `<a href=\'thought-report.html?id=${r.id}\'>y</a>`;', // 裸名（query 含插值）→ 命中
    'const c = { href: `search.html` };', // 对象属性 + 模板串 → 命中
    'const d = `<a href="./workspace/secretary.html?x=1">z</a>`;', // 前缀 ./ → 不命中
    'const e = `<img src="https://cdn.example/a.html">`;', // 外部 → 不命中
    'const f = `<a href="#anchor">a</a>`;', // 纯锚点 → 不命中
    'const g = `<a href="${getBasePath()}person.html?id=1">b</a>`;', // 动态路径 → 不命中
    'const h = `<a href="workspace/org.html">c</a>`;', // 相对片段（含 /）→ 不命中
    '// href="secretary.html" 注释内的不得命中', // 整行注释 → 跳过
  ];
  const hits = [];
  synth.forEach((line, i) => {
    const re = new RegExp(RENDER_REF_RE.source, 'g');
    let m;
    while ((m = re.exec(line)) !== null) hits.push({ i, value: m[1] ?? m[2] ?? m[3] });
  });
  // 注释行按 extractRenderedRefs 的规则剔除后再分类
  const classified = hits.filter((h) => !synth[h.i].trim().startsWith('//')).map((h) => classify(h.value).kind);
  assert.deepEqual(
    classified, ['bare', 'bare', 'bare', 'prefixed', 'external', 'skip', 'dynamic', 'other'],
    `抽取口径失效：合成样本分类结果与预期不符（实测 ${JSON.stringify(classified)}）——守卫会恒真/过宽`);
  assert.equal(classify('secretary.html').name, 'secretary.html', '抽取口径失效：裸名未被识别');

  // ② 抽取面规模下限（低于下限说明口径失效或扫描范围被削）
  const { files, refs } = scan();
  assert.ok(files.length >= JS_FILE_FLOOR,
    `只扫到 ${files.length} 个 docs/src/*.js（下限 ${JS_FILE_FLOOR}）：扫描范围异常，断言可能恒真`);
  assert.ok(refs.length >= RENDER_REF_FLOOR,
    `只抽到 ${refs.length} 处渲染型 href/src 引用（下限 ${RENDER_REF_FLOOR}）：抽取口径失效，断言可能恒真`);

  // ②′ <base> 联动前提仍成立（判据的机理，被改动即红灯）：全站页面只落在 docs/ 与 docs/workspace/，
  //    且带 <base> 的页面基准都汇到 docs/（否则「裸名恒解析到 docs/<name>」这条口径就不成立）
  const pages = htmlPages();
  const badBase = pages.filter((p) => p.hasBase && p.baseDir !== '.');
  assert.deepEqual(badBase.map((p) => `${p.path}（<base> ⇒ 基准 ${p.baseDir}）`), [],
    '<base> 基准不再是 docs/ ——本守卫「裸名恒解析到 docs/<name>」的口径前提已变，须重审判据');

  // ③ 已修样本可判：这两个文件此前写的正是裸名（→ 404），现须为 `./workspace/…`
  for (const f of FIXED_SAMPLE_FILES) {
    const bare = extractRenderedRefs(f).filter((r) => classify(r.value).kind === 'bare');
    assert.deepEqual(bare.map((r) => `${r.file}:${r.line} → ${r.value}`), [],
      `已修样本回退为裸文件名（工作台页 <base href="../"> 下会 404）：\n  ${bare.map((r) => `${r.line}:${r.value}`).join('\n  ')}`);
  }

  console.log(`[L7] 非空转：js ${files.length}（下限 ${JS_FILE_FLOOR}）· 渲染引用 ${refs.length}（下限 ${RENDER_REF_FLOOR}）`
    + ` · 已修样本 ${FIXED_SAMPLE_FILES.length} 个（无裸名回退）`);
});
