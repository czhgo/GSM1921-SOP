// role: [工程师]+[AI]
// icon-color-guard.test.mjs — SVG 色彩契约守卫（2026-11-10 批次 540 波次 6 · SD-61）
//
// 病灶（本守卫立项时的实测）：
//   · `icons.js` 的单行示例写着 `stroke: '#FFF'`——硬编码色值从「唯一图标源」向调用点传播，
//     复制到 `header.js`（`#FFFFFF`）、`person-picker.js`（`#6B7280`）就成真；
//   · `custom-select.js` / `archive-entry.js` 各自内联 `<svg>`，绕开唯一图标源；
//   · `person-picker.css` 用 data-URI 把色值写进 URL（`%239CA3AF`），既绕开令牌也绕开 hex 扫描；
//   · `status-color-guard` 只认 `color:` 声明，`--tint: var(--status-error)` → `.stat-icon-tint{color:var(--tint)}`
//     这条链路把状态**填充档**当文字 / 笔触色用，守卫看不见。
//
// 判据（DS_03 §4.11.2）：
//   G1 SVG 生成点只在 `icons.js`：其余位置出现 `<svg` / `data:image/svg` / `createElementNS(…svg…)` 即红，
//      白名单 2 处逐条给理由，且每条必须在当前源码里真实命中（防僵尸白名单）。
//      白名单只免「生成点」（G1），不免「色值」（G4）——名单里的文件仍按 G4 扫 SVG 片段色值。
//   G2 `icon()` 的 `stroke` / `fill` 字面量只许 `currentColor` / `none` / `var(--token)`。
//   G3 `--tint` 只收令牌：① 字面值必须是 `var(--token)`（禁 hex / rgba / 裸色 / color-mix）；
//      ② 状态**填充档**（`--status-success|warning|error|info`）不得进 `--tint`，也不得作 `tint:` / `color:`
//      配置值或喂给 `tint` 形参的位置实参——一律改 `-text` 档（补 status-color-guard 只认 `color:` 的盲区）。
//   G4 SVG 片段（字面 `<svg …>` 与 data-URI 载荷）的色值只许 `currentColor` / `none` / `var(--token)` /
//      `url(#id)`；hex 扫描含 URL 编码 `%23`（data-URI 盲区）。
//   G5 图标尺寸：`icon()` 不得传数字 `size` / `width` / `height`（尺寸由 CSS 类驱动），白名单逐条给理由。
//
// 每条判据都带**反例自证**（合成样本必须判红、正样本必须放行），防「正则写坏 ⇒ 恒绿」。
// 运行：node --test server/test/icon-color-guard.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const SRC = join(ROOT, 'docs', 'src');
const ICONS = 'docs/src/core/base/icons.js';
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');

/** 状态填充档（`-text` 是文字档，不在其中） */
const STATUS_FILL_RE = /var\(--status-(?:success|warning|error|info)\)/;
const TOKEN_VAR_RE = /^var\(--[a-z0-9-]+\)$/i;
const COLOR_WORD_RE = /^(?:currentColor|none|transparent)$/i;
const SVG_PAINT_URL_RE = /^url\(#[^)]+\)$/i;

/**
 * G1 白名单（2 处）：`icons.js` 之外仍会产生 SVG 的位置，逐条给理由。
 * 纪律：① 条目必须在当前源码里真实命中，否则本守卫判红（防「白名单只增不减、迟早变空头」）；
 *       ② 白名单只免「SVG 生成点」（G1），**不免色值**——名单内文件的 SVG 片段仍按 G4 判（批次 541）。
 */
export const SVG_SOURCE_WHITELIST = [
  {
    file: 'docs/src/about.css',
    reason: '关于页暖纸 / 墨色噪点纹理由 `feTurbulence` data-URI 生成（非图标、无色值、无同名令牌），'
      + '且 about 是冻结件（`about-freeze-guard` 整文件哈希锁定），本波次不动。',
  },
  {
    file: 'docs/src/entries/pages/about-entry.js',
    reason: '关于页关系图 / 环形公转是页面自绘的**数据图形**（`document.createElementNS(SVG_NS, …)`），'
      + '不是图标；节点色取 `ROLE_COLORS`（身份色单一源），由 about 冻结件口径保护。',
  },
];

/** G5 尺寸白名单：`icon()` 允许传数字尺寸的位置（按文件登记，逐条给理由） */
export const DIMENSION_WHITELIST = [
  {
    file: 'docs/src/components/ui/custom-select.js',
    sizes: [12],
    reason: '原生 `select` 的增强触发器和内嵌搜索框里，箭头 / 放大镜固定 12px（`.cs-chevron` / `.cs-search-icon`'
      + ' 只给颜色与动效、不给尺寸）；尺寸由属性写死在此一处，避免 CSS 类跨文件漂移。',
  },
  {
    file: 'docs/src/entries/pages/about-entry.js',
    sizes: [20, 28],
    reason: '关于页顶部「向下滚动」提示箭头用**非 24×24 的自定义 viewBox**（`0 0 20 28`），尺寸由 SVG 属性'
      + '而非 Tailwind 类表达；about 是冻结件（`about-freeze-guard` 哈希锁定），本波次不动其内容。',
  },
];

// ── 通用工具 ────────────────────────────────────────────────────────────
/** 剥注释（`/* *\/` 与 `//`；只为判定，不改源文件） */
export function stripComments(src) {
  return String(src)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:'"\\])\/\/[^\n]*/g, '$1');
}

/** 递归收集 docs/src 的 .js / .css（相对仓库根的 posix 路径） */
export function scanFiles(dir = SRC, out = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (['vendor', 'fonts', 'images'].includes(e.name)) continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) scanFiles(p, out);
    else if (/\.(js|css)$/.test(e.name)) out.push(relative(ROOT, p).replace(/\\/g, '/'));
  }
  return out.sort();
}

/** 括号配对：取 `src[open]`（左括号）到对应右括号之间的实参文本 */
function balancedArgs(src, openIdx) {
  let depth = 0;
  for (let i = openIdx; i < src.length; i += 1) {
    if (src[i] === '(') depth += 1;
    else if (src[i] === ')') {
      depth -= 1;
      if (depth === 0) return src.slice(openIdx + 1, i);
    }
  }
  return '';
}

/** 取出源文件里所有 `icon(…)` 调用的实参文本 */
export function iconCalls(src) {
  const clean = stripComments(src);
  const out = [];
  const re = /(?:^|[^\w$.])icon\s*\(/g;
  for (const m of clean.matchAll(re)) {
    const open = m.index + m[0].length - 1;
    out.push(balancedArgs(clean, open));
  }
  return out;
}

// ── G1 SVG 生成点 ───────────────────────────────────────────────────────
/** 纯判据：返回该源码里的 SVG 生成点（字面 `<svg` / data-URI / createElementNS） */
export function svgSourceHits(src) {
  const clean = stripComments(src);
  const hits = [];
  if (/<svg[\s>]/.test(clean)) hits.push('<svg');
  if (/data:image\/svg/i.test(clean)) hits.push('data:image/svg');
  if (/createElementNS\([^)]*svg/i.test(clean)) hits.push('createElementNS(…svg…)');
  return hits;
}

test('G1 SVG 生成点只在 icons.js（白名单 2 处，逐条理由且必须真实命中）', () => {
  // 反例自证：三种写法都必须被判出
  assert.deepEqual(svgSourceHits("const x = '<svg viewBox=\"0 0 24 24\"></svg>';"), ['<svg'],
    '反例未命中：字面 <svg> 未被判出（G1 正则失效）');
  assert.deepEqual(svgSourceHits("background: url('data:image/svg+xml,<svg/>')"), ['data:image/svg'],
    '反例未命中：data-URI SVG 未被判出');
  assert.deepEqual(svgSourceHits("document.createElementNS(SVG_NS, 'path')"), ['createElementNS(…svg…)'],
    '反例未命中：createElementNS 自绘 SVG 未被判出');
  // 正例：普通字符串不误伤
  assert.deepEqual(svgSourceHits("const s = 'svg 不是图标';"), [],
    '误伤：普通字符串被判成 SVG 生成点');

  const allow = new Map(SVG_SOURCE_WHITELIST.map((w) => [w.file, w]));
  const files = scanFiles();
  assert.ok(files.length >= 100, `扫描面过小（${files.length} 个文件）：判据可能失效`);

  const offenders = [];
  const hitFiles = new Set();
  for (const f of files) {
    if (f === ICONS) continue; // 唯一图标源本身
    // 演示种子是**数据面**：`data/mock/auxiliary.js` 的 base64 内联 SVG 是活动照片占位（内容，不是图标），
    // 与图标契约无关；图标契约只判 UI 层（components / entries / core / 样式）。
    if (f.startsWith('docs/src/data/')) continue;
    const hits = svgSourceHits(read(f));
    if (!hits.length) continue;
    hitFiles.add(f);
    if (!allow.has(f)) offenders.push(`${f} → ${hits.join(' / ')}（改走 icons.js 的 icon()）`);
  }
  assert.deepEqual(offenders, [],
    `icons.js 之外出现 SVG 生成点（DS_03 §4.11.2：图标只经 icons.js）：\n  ${offenders.join('\n  ')}`);

  // 白名单非空转：每条必须有理由、文件存在、且当前源码仍命中
  const zombie = [];
  for (const w of SVG_SOURCE_WHITELIST) {
    if (!w.reason || w.reason.length < 20) zombie.push(`${w.file}：缺理由（≥20 字）`);
    else if (!existsSync(join(ROOT, w.file))) zombie.push(`${w.file}：文件不存在`);
    else if (!hitFiles.has(w.file)) zombie.push(`${w.file}：登记后已无 SVG 生成点（应从白名单删除）`);
  }
  assert.deepEqual(zombie, [], `G1 白名单失效：\n  ${zombie.join('\n  ')}`);
});

// ── G2 icon() 的 stroke / fill ─────────────────────────────────────────
/** 纯判据：`icon()` 实参里的 stroke / fill 字面量是否只取 currentColor / none / var(--token) */
export function iconColorViolations(args) {
  const out = [];
  for (const m of String(args).matchAll(/\b(stroke|fill)\s*:\s*(['"])([^'"]*)\2/g)) {
    const value = m[3].trim();
    if (COLOR_WORD_RE.test(value) || TOKEN_VAR_RE.test(value)) continue;
    out.push(`${m[1]}: '${value}'`);
  }
  return out;
}

test('G2 icon() 的 stroke / fill 只许 currentColor / none / var(--token)', () => {
  // 反例自证
  assert.deepEqual(iconColorViolations("{ stroke: '#FFF' }"), ["stroke: '#FFF'"],
    '反例未命中：hex 笔触未被判出（G2 正则失效）');
  assert.deepEqual(iconColorViolations("{ fill: 'rgb(0,0,0)' }"), ["fill: 'rgb(0,0,0)'"],
    '反例未命中：rgb() 填充未被判出');
  // 正例：三种合法取值 + 动态变量不误伤
  assert.deepEqual(iconColorViolations("{ stroke: 'currentColor', fill: 'none' }"), [], '误伤：currentColor / none 被判红');
  assert.deepEqual(iconColorViolations("{ stroke: 'var(--neutral-500)' }"), [], '误伤：令牌被判红');
  assert.deepEqual(iconColorViolations('{ stroke: this._accent }'), [], '误伤：动态变量被判红（由 G3 管令牌来源）');

  const offenders = [];
  let calls = 0;
  for (const f of scanFiles()) {
    if (f === ICONS) continue; // 定义处（默认值 stroke='currentColor' / fill='none'）
    const src = read(f);
    for (const args of iconCalls(src)) {
      calls += 1;
      for (const v of iconColorViolations(args)) offenders.push(`${f} → icon(…, { ${v} }…)`);
    }
  }
  assert.ok(calls >= 30, `icon() 调用点只扫到 ${calls} 处（应 ≥30）：判据可能失效`);
  assert.deepEqual(offenders, [],
    `icon() 传了字面色值（改 currentColor 继承或 var(--token)）：\n  ${offenders.join('\n  ')}`);
});

// ── G3 --tint 只收令牌 + 禁状态填充档 ────────────────────────────────────
/** 纯判据①：字面 `--tint: <值>` 必须是 var(--token)，且不得取状态填充档 */
export function tintLiteralViolations(src) {
  const clean = stripComments(src);
  const out = [];
  for (const m of clean.matchAll(/--tint\s*:\s*([^;"'`}]+)/g)) {
    const value = m[1].trim();
    if (value.startsWith('${')) continue; // 模板占位（由 ② 按来源判）
    if (!TOKEN_VAR_RE.test(value)) out.push(`--tint: ${value}（只许 var(--token)）`);
    else if (STATUS_FILL_RE.test(value)) out.push(`--tint: ${value}（状态填充档不得当图标 / 数值色，改 -text 档）`);
  }
  return out;
}

/** 收集「形参里带 tint」的函数名（含 `function f(…tint…)` 与 `const f = (…tint…) =>`） */
export function tintFnNames(src) {
  const names = new Set();
  for (const m of String(src).matchAll(/function\s+([A-Za-z_$][\w$]*)\s*\(([^)]*)\)/g)) {
    if (/\btint\b/.test(m[2])) names.add(m[1]);
  }
  for (const m of String(src).matchAll(/(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*\(([^)]*)\)\s*=>/g)) {
    if (/\btint\b/.test(m[2])) names.add(m[1]);
  }
  return [...names];
}

/** 纯判据②：喂给 tint 的值（`tint:` / `color:` 配置项、`tint` 形参的位置实参）不得取状态填充档 */
export function tintSourceViolations(src) {
  const clean = stripComments(src);
  const out = [];
  // ②-1 配置项：tint: 'var(--status-x)' / color: 'var(--status-x)'（accentColor 不算——不是图标笔触色）
  for (const m of clean.matchAll(/\b(tint|color)\s*:\s*(['"])([^'"]*)\2/g)) {
    if (STATUS_FILL_RE.test(m[3].trim())) out.push(`${m[1]}: '${m[3].trim()}'`);
  }
  // ②-2 位置实参：函数定义里形参名含 tint 的，调用实参不得传状态填充档字面量
  for (const name of tintFnNames(clean)) {
    const re = new RegExp(`(?:^|[^\\w$.])${name}\\s*\\(`, 'g');
    for (const m of clean.matchAll(re)) {
      const args = balancedArgs(clean, m.index + m[0].length - 1);
      if (STATUS_FILL_RE.test(args)) out.push(`${name}(… var(--status-{fill}) …)`);
    }
  }
  return out;
}

test('G3 --tint 只收令牌、禁状态填充档（含 tint: / color: 配置项与 tint 形参位置实参）', () => {
  // 反例自证①
  assert.deepEqual(tintLiteralViolations('style="--tint:var(--status-error);"'), ['--tint: var(--status-error)（状态填充档不得当图标 / 数值色，改 -text 档）'],
    '反例未命中：--tint 取状态填充档未被判出（G3 正则失效）');
  assert.equal(tintLiteralViolations('style="--tint:#EF4444;"').length, 1, '反例未命中：--tint 写 hex 未被判出');
  assert.equal(tintLiteralViolations('style="--tint:rgba(0,0,0,.2);"').length, 1, '反例未命中：--tint 写 rgba 未被判出');
  // 正例：文字档 / 中性档 / 占位不误伤
  assert.deepEqual(tintLiteralViolations('style="--tint:var(--status-error-text);"'), [], '误伤：-text 档被判红');
  assert.deepEqual(tintLiteralViolations('style="--tint:var(--neutral-500);"'), [], '误伤：中性令牌被判红');
  assert.deepEqual(tintLiteralViolations('style="--tint:${s.color};"'), [], '误伤：模板占位被判红');

  // 反例自证②：配置项 + 位置实参
  assert.equal(tintSourceViolations("{ a: 1, tint: 'var(--status-info)' }").length, 1,
    '反例未命中：tint: 取状态填充档未被判出');
  assert.equal(tintSourceViolations("{ label: 'x', color: 'var(--status-error)' }").length, 1,
    '反例未命中：color: 取状态填充档未被判出（status-color-guard 的盲区）');
  assert.equal(tintSourceViolations('function item(n, tint){}\nitem("clock", "var(--status-info)")').length, 1,
    '反例未命中：喂给 tint 形参的位置实参未被判出');
  // 正例
  assert.deepEqual(tintSourceViolations("{ tint: 'var(--status-info-text)' }"), [], '误伤：-text 档被判红');
  assert.deepEqual(tintSourceViolations("{ accentColor: 'var(--status-error)' }"), [],
    '误伤：accentColor 不是图标笔触色（人物选择器等强调色另判）');

  // 真实源码
  const offenders = [];
  for (const f of scanFiles()) {
    const src = read(f);
    for (const v of tintLiteralViolations(src)) offenders.push(`${f} → ${v}`);
    if (f.endsWith('.js')) for (const v of tintSourceViolations(src)) offenders.push(`${f} → ${v}`);
  }
  assert.deepEqual(offenders, [],
    `--tint / 图标笔触取到了非法色值（只许 var(--token)，状态色一律 -text 档）：\n  ${offenders.join('\n  ')}`);
});

// ── G4 SVG 片段色值（含 data-URI 的 %23 盲区）────────────────────────────
/** 纯判据：SVG 片段里的 stroke / fill / stop-color 只许 currentColor / none / transparent / var(--token) / url(#id) */
export function svgPaintViolations(svgText) {
  const decoded = String(svgText).replace(/%23/gi, '#');
  const out = [];
  for (const m of decoded.matchAll(/\b(stroke|fill|stop-color)\s*=\s*(["'])([^"']*)\2/g)) {
    const value = m[3].trim();
    if (COLOR_WORD_RE.test(value) || TOKEN_VAR_RE.test(value) || SVG_PAINT_URL_RE.test(value)) continue;
    out.push(`${m[1]}="${value}"`);
  }
  // 无属性形态（CSS-in-SVG / 片段内联 style）里的 hex 同样判红
  for (const m of decoded.matchAll(/#[0-9a-fA-F]{3,8}\b/g)) {
    if (decoded.includes(`="${m[0]}"`) || decoded.includes(`='${m[0]}'`)) continue; // 已由属性判定报出
    out.push(`色值 ${m[0]}`);
  }
  return [...new Set(out)];
}

/** 抽出源码里的 data-URI SVG 载荷（含 URL 编码形态） */
export function dataUriSvgPayloads(src) {
  return [...String(src).matchAll(/data:image\/svg\+xml[;,]([^"')]*)/gi)].map((m) => m[1]);
}

test('G4 SVG 片段色值只许 currentColor / none / var(--token) / url(#id)，hex 扫描含 %23', () => {
  // 反例自证：data-URI 的 URL 编码 hex 必须被判出
  assert.deepEqual(svgPaintViolations("<svg stroke='%239CA3AF'></svg>"), ['stroke="#9CA3AF"'],
    '反例未命中：data-URI 里 %23 编码的 hex 未被判出（G4 盲区未闭合）');
  assert.equal(svgPaintViolations('<svg fill="#EF4444"></svg>').length, 1, '反例未命中：字面 hex 未被判出');
  // 正例
  assert.deepEqual(svgPaintViolations('<svg stroke="currentColor" fill="none"></svg>'), [], '误伤：currentColor / none 被判红');
  assert.deepEqual(svgPaintViolations('<svg stroke="var(--neutral-400)"></svg>'), [], '误伤：令牌被判红');
  assert.deepEqual(svgPaintViolations('<path stroke="url(#ab-grad-0)"/>'), [], '误伤：渐变引用被判红');

  // 真实源码：`icons.js` 之外（**含 G1 白名单文件**）的 SVG 片段必须无色值。
  //   白名单只豁免「生成点」这一条（G1），不豁免色值——否则把 hex 写进白名单文件即可绕过 G4。
  const offenders = [];
  for (const f of scanFiles()) {
    if (f === ICONS) continue;
    const clean = stripComments(read(f));
    const svgs = [...clean.matchAll(/<svg\b[\s\S]*?<\/svg>/g)].map((m) => m[0]);
    for (const payload of dataUriSvgPayloads(clean)) svgs.push(payload);
    for (const s of svgs) for (const v of svgPaintViolations(s)) offenders.push(`${f} → ${v}`);
  }
  assert.deepEqual(offenders, [],
    `SVG 片段里写了字面量色值（改 currentColor 或 var(--token)）：\n  ${offenders.join('\n  ')}`);
});

// ── G5 图标尺寸 ─────────────────────────────────────────────────────────
/** 纯判据：`icon()` 实参里的数字 size / width / height */
export function iconDimensionViolations(args) {
  return [...String(args).matchAll(/\b(size|width|height)\s*:\s*(\d+)/g)].map((m) => `${m[1]}: ${m[2]}`);
}

test('G5 图标尺寸由 CSS 类驱动：数字 size / width / height 只在白名单（12px 下拉图标）', () => {
  // 反例自证
  assert.deepEqual(iconDimensionViolations("{ size: 18 }"), ['size: 18'], '反例未命中：数字 size 未被判出');
  assert.deepEqual(iconDimensionViolations("{ width: 20, height: 20 }"), ['width: 20', 'height: 20'],
    '反例未命中：数字 width / height 未被判出');
  // 正例：类名驱动不误伤
  assert.deepEqual(iconDimensionViolations("{ className: 'w-4 h-4' }"), [], '误伤：CSS 类被判红');

  const allow = new Map(DIMENSION_WHITELIST.map((w) => [w.file, w]));
  const offenders = [];
  for (const f of scanFiles()) {
    if (f === ICONS) continue;
    for (const args of iconCalls(read(f))) {
      for (const v of iconDimensionViolations(args)) {
        const w = allow.get(f);
        const px = Number(v.split(':')[1].trim());
        if (!w || !w.sizes.includes(px)) offenders.push(`${f} → icon(…, { ${v} }…)（尺寸交给 className）`);
      }
    }
  }
  assert.deepEqual(offenders, [],
    `图标尺寸被写死（DS_03 §4.11.2 尺寸由 CSS 类驱动）：\n  ${offenders.join('\n  ')}`);

  // 白名单非空转
  for (const w of DIMENSION_WHITELIST) {
    assert.ok(w.reason && w.reason.length > 20, `尺寸白名单缺理由：${w.file}`);
    assert.ok(existsSync(join(ROOT, w.file)), `尺寸白名单指向不存在的文件：${w.file}`);
  }
});
