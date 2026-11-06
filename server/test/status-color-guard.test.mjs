// role: [工程师]+[AI]
// status-color-guard.test.mjs — 状态色「填充档 / 文字档」两层守卫（2026-10-31 P8）
//
// 病灶（本守卫立项时的实测）：
//   · `--status-success` #10B981 作正文 / 数值（对白卡）仅 2.54:1；
//   · `--status-error` #EF4444 作必填星号等正文（19 处）仅 3.76:1；
//   · `--status-info` #3B82F6 作正文 3.68:1。
//   三者都低于 WCAG AA 正文 4.5:1。修法不是改填充色（它会破坏徽章底 / 圆点观感），
//   而是拆两层：填充档只进徽章底 / 圆点 / 左条 / 图例；任何 `color:` 一律走 `--status-*-text`。
//
// 判据：
//   S1 填充档出现在 `color:` 即红（CSS 声明与 JS 内联 style 同判；白名单只允许文字档与中性色）。
//      含反例：合成串写回 `color: var(--status-success)` 必须被判出（防正则写坏恒真）。
//   S2 三个文字档（success / error / info）亮暗逐色断言：对白卡 / 暖纸页底 / 深卡 / 暗页 ≥4.5:1，
//      并打印逐色读数；warning 文字档一并复核。
//   S3 关键 token 的文档值与实现值一致：status 四族 ＋ 三个文字档（§2.5）、surface 全部行（§2.6）、
//      identity 全部行（§2.3.2）。含反例：把文档值改成旧值必须判红。
//
// 运行：node --test server/test/status-color-guard.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');

const CSS = read('docs/src/styles.css');
const DS01 = read('content/04_web_design/design-system/DS_01_COLOR_AND_THEME.md');

const FILL_TOKENS = ['success', 'warning', 'error', 'info'];
const TEXT_TOKENS = ['success', 'warning', 'error', 'info'];
const WHITE = '#FFFFFF';
const PAGE_LIGHT = '#FAFAF5';
const CARD_DARK = '#141D2F';
const PAGE_DARK = '#0B1220';
const HEX_RE = /^#[0-9A-Fa-f]{6}$/;

// ── 颜色工具（WCAG 2.x；与 ui-contrast-guard / theme-palette-guard 同式） ──
const lin = (c) => {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};
const rgb = (hex) => {
  const h = String(hex).replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
};
const luminance = (hex) => {
  const [r, g, b] = rgb(hex);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
};
const contrast = (a, b) => {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
};

/** 取 :root / 指定块内某变量值（先剥注释） */
function varIn(block, name) {
  const clean = String(block).replace(/\/\*[\s\S]*?\*\//g, '');
  const m = new RegExp(`${name}\\s*:\\s*([^;]+);`).exec(clean);
  return m ? m[1].trim() : '';
}

/** 取 html.theme-dark 块（大括号配对；与 theme-palette-guard 同口径） */
function darkBlock(css) {
  const src = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const i = src.indexOf('html.theme-dark {');
  if (i < 0) return '';
  const start = src.indexOf('{', i);
  let depth = 0;
  for (let p = start; p < src.length; p += 1) {
    if (src[p] === '{') depth += 1;
    else if (src[p] === '}') {
      depth -= 1;
      if (depth === 0) return src.slice(start + 1, p);
    }
  }
  return '';
}

/**
 * 纯判据：从源码中找出「填充档出现在 color:」的位置。
 * 只认真正的 `color:`（`border-color:` / `background-color:` 因前置 `-` 不命中），
 * `var(--status-success-text)` 因右括号不紧跟 token 名不命中。
 * @param {string} src — CSS 或 JS 源码
 * @returns {string[]} 违规片段（空数组＝合法）
 */
export function findStatusFillTextViolations(src) {
  const clean = String(src)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1');
  const hits = [];
  const re = /(?:^|[;{"'\s])color\s*:\s*([^;"'}]+)/g;
  for (const m of clean.matchAll(re)) {
    const value = m[1].trim();
    if (/var\(--status-(?:success|warning|error|info)\)/.test(value)) hits.push(value);
  }
  return hits;
}

/** 递归收集 docs/src 下 .css / .js */
function walk(dir, out = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (['vendor', 'fonts', 'images'].includes(e.name)) continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.(css|js)$/.test(e.name)) out.push(p);
  }
  return out;
}

test('S1 填充档只进徽章 / 圆点 / 左条 / 图例：出现在 color: 即红（含反例）', () => {
  // 反例：合成串必须被判出（否则正则写坏 ⇒ 恒绿）
  assert.deepEqual(findStatusFillTextViolations('a{color: var(--status-success);}').length, 1,
    '反例未命中：写回 color: var(--status-success) 应判红（守卫正则失效）');
  assert.deepEqual(findStatusFillTextViolations('a{color:var(--status-info)}').length, 1,
    '反例未命中：无空格写法 color:var(--status-info) 应判红');
  // 负例：文字档 / 中性色 / 边框属性不误伤
  assert.deepEqual(findStatusFillTextViolations('a{color: var(--status-success-text);}'), [],
    '误伤：--status-success-text 是文字档，应放行');
  assert.deepEqual(findStatusFillTextViolations('a{color: var(--neutral-600);}'), [],
    '误伤：中性色应放行');
  assert.deepEqual(findStatusFillTextViolations('a{border-color: var(--status-error); background-color: var(--status-error);}'), [],
    '误伤：border-color / background-color 是填充用法，应放行');

  const files = walk(join(ROOT, 'docs', 'src'));
  assert.ok(files.length >= 100, `扫描面过小（${files.length} 个文件）：判据可能失效`);
  const offenders = [];
  for (const f of files) {
    const hits = findStatusFillTextViolations(readFileSync(f, 'utf8'));
    if (hits.length) offenders.push(`${relative(ROOT, f).replace(/\\/g, '/')} → ${hits.join(' / ')}`);
  }
  assert.deepEqual(offenders, [],
    `以下位置仍把状态填充色当文字色（改 --status-*-text）：\n  ${offenders.join('\n  ')}`);

  // 非空转：三个文字档 token 必须真实存在（防止「全改成不存在的名字」也绿）
  for (const key of ['success', 'error', 'info']) {
    const v = varIn(CSS, `--status-${key}-text`);
    assert.match(v, HEX_RE, `styles.css 缺 --status-${key}-text 亮色值`);
    assert.match(varIn(darkBlock(CSS), `--status-${key}-text`), HEX_RE, `暗色段缺 --status-${key}-text`);
  }
});

test('S2 文字档逐色对比度：亮（白卡 / 页底）与暗（深卡 / 暗页）均 ≥4.5:1', () => {
  const dark = darkBlock(CSS);
  const rows = [];
  const problems = [];
  for (const key of TEXT_TOKENS) {
    const light = varIn(CSS, `--status-${key}-text`);
    const dk = varIn(dark, `--status-${key}-text`);
    assert.match(light, HEX_RE, `缺 --status-${key}-text 亮色值`);
    assert.match(dk, HEX_RE, `缺 --status-${key}-text 暗色值`);
    const pairs = [
      ['白卡', light, WHITE],
      ['页底', light, PAGE_LIGHT],
      ['深卡', dk, CARD_DARK],
      ['暗页', dk, PAGE_DARK],
    ];
    const cells = pairs.map(([label, fg, bg]) => {
      const ratio = contrast(fg, bg);
      if (ratio < 4.5) problems.push(`${key}-text ${label} ${ratio.toFixed(2)}:1 < 4.5`);
      return `${label} ${ratio.toFixed(2)}`;
    });
    rows.push(`${key}-text（亮 ${light} / 暗 ${dk}）：${cells.join(' · ')}`);
  }
  console.log(`[status-color] 文字档对比度实测：\n  ${rows.join('\n  ')}`);
  assert.equal(rows.length, 4, `应核对 4 个文字档，实际 ${rows.length}`);
  assert.deepEqual(problems, [], `状态文字档对比度不达标：\n  ${problems.join('\n  ')}`);
});

// ── S3 文档值 ↔ 实现值 ────────────────────────────────────────────────
/** 截取两个标题之间的正文 */
function section(doc, startMarker, endMarker) {
  const i = doc.indexOf(startMarker);
  if (i < 0) return '';
  const j = doc.indexOf(endMarker, i + startMarker.length);
  return j < 0 ? doc.slice(i) : doc.slice(i, j);
}

/**
 * 纯判据：比对 §2.5 功能色 / §2.6 表面色 / §2.3.2 身份色三张表的文档值与 styles.css。
 * @returns {string[]} 不一致项（空＝一致）
 */
export function docImplMismatches(docText, cssText) {
  const dark = darkBlock(cssText);
  const out = [];
  const norm = (v) => String(v).replace(/[`\s]/g, '').toLowerCase();

  // §2.5 功能色：| token | 别名 | 亮 | 暗 | 用途 |
  const statusSec = section(docText, '### 2.5 功能色', '### 2.6 表面色');
  const statusRows = [...statusSec.matchAll(/^\|\s*`(--status-[a-z-]+)`\s*\|[^|]*\|\s*`?(#[0-9A-Fa-f]{6})`?\s*\|\s*`?(#[0-9A-Fa-f]{6})`?\s*\|/gm)];
  for (const m of statusRows) {
    const [, name, lightDoc, darkDoc] = m;
    const lightImpl = varIn(cssText, name);
    const darkImpl = varIn(dark, name);
    if (norm(lightDoc) !== norm(lightImpl)) out.push(`§2.5 ${name} 亮色 文档 ${lightDoc} ≠ 实现 ${lightImpl || '（缺）'}`);
    if (norm(darkDoc) !== norm(darkImpl)) out.push(`§2.5 ${name} 暗色 文档 ${darkDoc} ≠ 实现 ${darkImpl || '（缺）'}`);
  }

  // §2.6 表面色：| token | 值 | 色块 | 用途 |
  const surfaceSec = section(docText, '### 2.6 表面色', '### 2.7 ');
  const surfaceRows = [...surfaceSec.matchAll(/^\|\s*`(--surface-[a-z-]+)`\s*\|\s*([^|]+?)\s*\|/gm)];
  for (const m of surfaceRows) {
    const [, name, cell] = m;
    const docValue = (cell.match(/var\(--[a-z0-9-]+\)|#[0-9A-Fa-f]{6}/) || [])[0];
    const impl = varIn(cssText, name);
    if (!docValue) out.push(`§2.6 ${name} 文档值无法解析：${cell}`);
    else if (norm(docValue) !== norm(impl)) out.push(`§2.6 ${name} 文档 ${docValue} ≠ 实现 ${impl || '（缺）'}`);
  }

  // §2.3.2 身份色：| token | 亮色 | 暗色 | … |
  const identitySec = section(docText, '#### 2.3.2', '### 2.4 ');
  const identityRows = [...identitySec.matchAll(/^\|\s*`--color-identity-([a-z-]+)`\s*\|\s*`?(#[0-9A-Fa-f]{6})`?\s*\|\s*`?(#[0-9A-Fa-f]{6})`?/gm)];
  for (const m of identityRows) {
    const [, role, lightDoc, darkDoc] = m;
    const lightImpl = varIn(cssText, `--color-identity-${role}`);
    const darkImpl = varIn(cssText, `--color-identity-${role}-dark`);
    if (norm(lightDoc) !== norm(lightImpl)) out.push(`§2.3.2 --color-identity-${role} 亮色 文档 ${lightDoc} ≠ 实现 ${lightImpl || '（缺）'}`);
    if (norm(darkDoc) !== norm(darkImpl)) out.push(`§2.3.2 --color-identity-${role} 暗色 文档 ${darkDoc} ≠ 实现 ${darkImpl || '（缺）'}`);
  }

  // 非空转：三张表各自必须解析到规模（防止表格被删 / 解析写坏 ⇒ 恒空）
  if (statusRows.length < 7) out.push(`§2.5 功能色表只解析到 ${statusRows.length} 行（应 ≥7：四填充档 ＋ 三文字档）`);
  if (surfaceRows.length < 3) out.push(`§2.6 表面色表只解析到 ${surfaceRows.length} 行（应 ≥3）`);
  if (identityRows.length < 5) out.push(`§2.3.2 身份色表只解析到 ${identityRows.length} 行（应 ≥5）`);
  return out;
}

test('S3 文档值 = 实现值：status 四族 / surface / identity（含旧值反例）', () => {
  assert.deepEqual(docImplMismatches(DS01, CSS), [],
    '规范文档色值与 styles.css 不一致（改了实现或文档只改了一边）');

  // 反例①：surface-hover 写回旧值 #F3F4F6 必须判红
  const badSurface = DS01.replace('`var(--neutral-200)`（`#E5E7EB`）', '`#F3F4F6`');
  assert.ok(docImplMismatches(badSurface, CSS).some((x) => x.includes('--surface-hover')),
    '反例未命中：§2.6 写回旧值 #F3F4F6 应判红');

  // 反例②：status-success-text 写回填充色必须判红
  const badStatus = DS01.replace('`--status-success-text` | — | `#047857`', '`--status-success-text` | — | `#10B981`');
  assert.ok(docImplMismatches(badStatus, CSS).some((x) => x.includes('--status-success-text')),
    '反例未命中：§2.5 文字档写回填充色应判红');

  // 反例③：identity 写回已删除的旧值必须判红
  const badIdentity = DS01.replace('| `--color-identity-organizer` | `#0369A1`', '| `--color-identity-organizer` | `#7DD3FC`');
  assert.ok(docImplMismatches(badIdentity, CSS).some((x) => x.includes('--color-identity-organizer')),
    '反例未命中：§2.3.2 写回旧值 #7DD3FC 应判红');
});
