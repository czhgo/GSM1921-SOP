// role: [工程师]+[AI]
// motion-guard.test.mjs — 动效三档令牌 / 属性 / 反例守卫（2026-10-24 批次 508，2026-10-31 P10 扩面）
//
// 为什么要有本守卫：
//   · 2026-10-24 批次 508 把全站过渡时长 / 曲线收敛为 `--motion-*` / `--ease-*` 唯一源；
//   · 2026-10-31 P10 立三档：反馈 80–120ms / 进入退出 160–240ms / 强调 240–320ms，
//     并把扫描面从 `styles.css` 扩到**全部产品 CSS + JS 内联样式字符串**。
//   · 支书口径：「不能太 fancy（微软扁平风）；不能太简单（像掉帧）」——重活靠令牌与守卫兜住。
//
// 判据：
//   M1 非空转：styles.css 解析到 ≥20 条 transition 声明
//   M2 时长白名单：全部产品 CSS 的 transition/animation 时长只能 var(--motion-*) / 0s；
//      裸值逐条登记（styles.css 存量 7 条），about.css 为冻结叙事页整文件登记（只登记不改）
//   M3 属性白名单：transition-property 只能安全属性 + 已登记例外；all / 布局属性判红
//   M4 三档令牌齐备且落在档内（feedback 80–120 / enter,exit 160–240 / emphasis 240–320）
//   M5 reduced-motion：兜底块把 delay 归零、duration 压缩
//   M6 可复用类：.motion-enter / .motion-collapse / .motion-press；scale 类已删除
//   M7 反例：产品 CSS 的 keyframes 不得出现 rotateX / clip-path / 等比 scale()
//   M8 JS 内联：不得写裸毫秒 transition/animation（about-entry.js 冻结登记）
//   M9 滚动：不得写裸 `behavior:'smooth'`，必须走 `smoothScroll()`（about-entry.js 冻结登记）
//   M10 滚动出口唯一：docs/src 除 utils.js helper 与 about-entry.js 外不得再直调 scrollIntoView/scrollTo/scrollBy
// 运行：node --test server/test/motion-guard.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');
const strip = (s) => String(s).replace(/\/\*[\s\S]*?\*\//g, '');
const norm = (s) => String(s).replace(/\s+/g, ' ').trim();

const STYLES_REL = 'docs/src/styles.css';
const RAW = read(STYLES_REL);
const CSS = strip(RAW);

/** 产品 CSS（不含 About 冻结件） */
const PRODUCT_CSS = [
  STYLES_REL,
  'docs/src/components/person-picker.css',
  'docs/src/components/shell/tab-loading.css',
];
/** About 冻结件：只登记、不改（2026-10-31 P10） */
const ABOUT_CSS = 'docs/src/about.css';
const ABOUT_EXCEPTION = '关于页叙事动效冻结件（0.9–1s 级长时长 / rotateX / clip-path / scale 均登记，不得扩散到产品页）';

const DECL_RE = /^\s*(?:-webkit-)?(?:transition|animation)(?:-duration)?\s*:\s*([^;]+);?\s*$/;
const TRANSITION_PROP_RE = /^\s*(?:-webkit-)?transition(?:-property)?\s*:\s*([^;]+);?\s*$/;

/** 取选择器列表精确包含 selector 的规则体 */
function ruleBody(css, selector) {
  const re = /([^{}]+)\{([^{}]*)\}/g;
  let m;
  while ((m = re.exec(css))) {
    const sels = m[1].split(',').map((s) => s.trim());
    if (sels.includes(selector)) return m[2];
  }
  return '';
}

/** 取以 needle 开头的块的内部文本（大括号配对） */
function blockAfter(css, needle) {
  const i = css.indexOf(needle);
  if (i < 0) return '';
  const start = css.indexOf('{', i);
  if (start < 0) return '';
  let depth = 0;
  for (let p = start; p < css.length; p += 1) {
    if (css[p] === '{') depth += 1;
    else if (css[p] === '}') {
      depth -= 1;
      if (depth === 0) return css.slice(start + 1, p);
    }
  }
  return '';
}

/** 收集某 CSS 文件的 transition / animation 声明（行级） */
function motionDecls(rel) {
  const lines = strip(read(rel)).split('\n');
  const out = [];
  lines.forEach((line, idx) => {
    const m = DECL_RE.exec(line);
    if (!m) return;
    out.push({ file: rel, line: idx + 1, text: norm(line), body: m[1].trim() });
  });
  return out;
}

/** 提取所有 @keyframes 的内部文本 */
function keyframeBodies(css) {
  const out = [];
  const re = /@keyframes\s+[\w-]+\s*\{/g;
  let m;
  while ((m = re.exec(css))) {
    const start = css.indexOf('{', m.index);
    let depth = 0;
    for (let p = start; p < css.length; p += 1) {
      if (css[p] === '{') depth += 1;
      else if (css[p] === '}') {
        depth -= 1;
        if (depth === 0) { out.push(css.slice(start + 1, p)); break; }
      }
    }
  }
  return out;
}

/** 递归列 docs/src 下的 JS / HTML */
function walk(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    const abs = join(dir, name);
    const st = statSync(abs);
    if (st.isDirectory()) walk(abs, acc);
    else if (/\.(?:js|html)$/.test(name)) acc.push(relative(ROOT, abs).replace(/\\/g, '/'));
  }
  return acc;
}

const MOTION_DECLS = PRODUCT_CSS.flatMap((rel) => motionDecls(rel));
const JS_FILES = walk(join(ROOT, 'docs/src'));

/**
 * M2 存量白名单：styles.css 的 7 条裸值（本批可改面之外的存量，只降不增）。
 * 每条 key 是规范化后的整行声明；zombie 检查保证条目仍然真实存在。
 */
const BARE_DURATION_EXCEPTIONS = [
  { file: STYLES_REL, decl: 'transition: opacity 0.25s ease-out, transform 0.25s ease-out;', reason: '视图切换（.view-section，存量）' },
  { file: STYLES_REL, decl: 'transition: opacity 0.14s ease-out, transform 0.14s ease-out;', reason: '状态徽章浮层（.status-badge-popover，存量）' },
  { file: STYLES_REL, decl: 'transition: background-color 0.12s ease-out;', reason: '状态徽章选项（.status-badge-option，存量）' },
  { file: STYLES_REL, decl: 'transition: opacity 240ms var(--help-ease);', reason: 'help 页目录（独立 --help-ease 体系，存量）' },
  { file: STYLES_REL, decl: 'transition: background-color 240ms var(--help-ease), transform 240ms var(--help-ease);', reason: 'help 页目录圆点（独立 --help-ease 体系，存量）' },
  { file: STYLES_REL, decl: 'animation-duration: 0.01ms !important;', reason: 'prefers-reduced-motion 兜底（必须保留极短时长以维持事件语义）' },
  { file: STYLES_REL, decl: 'transition-duration: 0.01ms !important;', reason: 'prefers-reduced-motion 兜底（必须保留极短时长以维持事件语义）' },
];

/** 安全属性（不触发布局） */
const SAFE_PROPERTIES = new Set([
  'opacity', 'transform', 'color', 'background-color', 'border-color', 'box-shadow', 'fill', 'stroke',
]);

/** 已登记的既有过渡属性（不触发布局，但不在 8 个首选内） */
const PROPERTY_EXCEPTIONS = new Map([
  ['outline-color', '焦点环颜色过渡（只重绘，不布局）'],
  ['grid-template-rows', '折叠面板高度过渡（.motion-collapse 的实现方式）'],
  ['grid-auto-rows', '列表展开行高过渡（既有 expand 动画）'],
  ['visibility', '浮层显隐（与 opacity 同组，避免 display 硬切）'],
  ['text-decoration-color', '链接下划线颜色过渡（只重绘）'],
]);

/** 明令禁止的布局属性 */
const FORBIDDEN_PROPERTIES = new Set([
  'all', 'height', 'width', 'max-height', 'max-width', 'min-height', 'min-width',
  'padding', 'padding-top', 'padding-bottom', 'padding-left', 'padding-right',
  'top', 'left', 'right', 'bottom',
  'margin', 'margin-top', 'margin-bottom', 'margin-left', 'margin-right',
]);

test('M1 非空转：styles.css 解析到 ≥20 条 transition 声明', () => {
  const transitions = MOTION_DECLS.filter((d) => /^\s*(?:-webkit-)?transition/.test(d.text));
  assert.ok(transitions.length >= 20,
    `只解析到 ${transitions.length} 条 transition（下限 20）：声明解析或文件读取可能写坏`);
});

test('M2 时长白名单：产品 CSS 只允许 var(--motion-*) / 0s，裸值逐条登记（About 全文件登记）', () => {
  const hits = [];
  for (const d of MOTION_DECLS) {
    const noVar = d.body.replace(/var\([^)]*\)/g, '');
    const times = [...noVar.matchAll(/(?:^|[\s,])(\d*\.?\d+)(ms|s)\b/g)].map((m) => m[0].trim());
    if (times.length === 0) continue;
    const bare = times.filter((t) => t !== '0s' && t !== '0ms');
    if (bare.length === 0) continue;
    hits.push({ ...d, times: bare });
  }
  assert.ok(hits.length > 0, 'M2 非空转失败：没有解析到任何裸时长（正则可能写坏，守卫会恒绿）');

  const unmatched = hits.filter((h) => !BARE_DURATION_EXCEPTIONS.some(
    (e) => e.file === h.file && h.text === norm(e.decl)));
  assert.deepEqual(unmatched.map((h) => `${h.file}:${h.line} ${h.text}`), [],
    `transition/animation 时长必须走 var(--motion-*)（只允许 0s）；以下裸值未登记：\n  ${unmatched.map((h) => `${h.file}:${h.line} ${h.text}`).join('\n  ')}`);

  // 防僵尸：白名单条目必须仍真实命中
  const zombies = BARE_DURATION_EXCEPTIONS.filter(
    (e) => !hits.some((h) => h.file === e.file && h.text === norm(e.decl)));
  assert.deepEqual(zombies.map((e) => `${e.file} ${e.decl}（${e.reason}）`), [],
    `M2 白名单存在僵尸条目（裸值已迁移，请删除）：\n  ${zombies.map((e) => `${e.file} ${e.decl}（${e.reason}）`).join('\n  ')}`);

  // About 冻结件整文件登记：仍存在裸值（含 0.9–1s 叙事长时长），但不得出现在产品 CSS。
  const aboutHits = motionDecls(ABOUT_CSS);
  const aboutBare = aboutHits.filter((d) => /(?:\d*\.?\d+)(?:ms|s)\b/.test(d.body.replace(/var\([^)]*\)/g, '')));
  assert.ok(aboutBare.length > 0,
    `${ABOUT_CSS} 登记项已失效（未解析到裸时长）：${ABOUT_EXCEPTION}`);
  console.log(`[motion-guard] About 冻结件登记：${aboutBare.length} 条裸时长（只登记不改）`);
});

test('M3 属性白名单：不得过渡 all / 布局属性；例外逐条登记', () => {
  const violations = [];
  const seen = new Set();
  for (const rel of PRODUCT_CSS) {
    const lines = strip(read(rel)).split('\n');
    lines.forEach((line, idx) => {
      const m = TRANSITION_PROP_RE.exec(line);
      if (!m) return;
      const parts = m[1].split(',').map((p) => p.trim()).filter(Boolean);
      for (const part of parts) {
        if (part === 'none') continue;
        const prop = part.split(/\s+/)[0];
        seen.add(prop);
        if (FORBIDDEN_PROPERTIES.has(prop)) {
          violations.push(`${rel}:${idx + 1} 禁止过渡布局属性 ${prop}（${norm(line)}）`);
          continue;
        }
        if (!SAFE_PROPERTIES.has(prop) && !PROPERTY_EXCEPTIONS.has(prop)) {
          violations.push(`${rel}:${idx + 1} 未登记过渡属性 ${prop}（${norm(line)}）`);
        }
      }
    });
  }
  assert.ok(seen.size >= 5, `只解析到 ${seen.size} 种过渡属性（下限 5）：解析面写坏`);
  assert.deepEqual(violations, [], `transition 属性不合规：\n  ${violations.join('\n  ')}`);
  console.log(`[motion-guard] 过渡属性：${[...seen].sort().join(' / ')}`);
});

test('M4 三档令牌齐备且落在档内', () => {
  const val = (name) => {
    const m = new RegExp(`${name}\\s*:\\s*([^;]+);`).exec(CSS);
    return m ? m[1].trim() : '';
  };
  const ms = (s) => {
    const m = /(\d*\.?\d+)\s*ms/.exec(s);
    return m ? Number(m[1]) : NaN;
  };
  // 三档：反馈 80–120 / 进入退出 160–240 / 强调 240–320
  const feedback = ms(val('--motion-feedback'));
  const enter = ms(val('--motion-enter'));
  const exit = ms(val('--motion-exit'));
  const emphasis = ms(val('--motion-emphasis'));
  assert.ok(feedback >= 80 && feedback <= 120, `--motion-feedback 必须在 80–120ms（实际 ${feedback}）`);
  assert.ok(enter >= 160 && enter <= 240, `--motion-enter 必须在 160–240ms（实际 ${enter}）`);
  assert.ok(exit >= 160 && exit <= 240, `--motion-exit 必须在 160–240ms（实际 ${exit}）`);
  assert.ok(emphasis >= 240 && emphasis <= 320, `--motion-emphasis 必须在 240–320ms（实际 ${emphasis}）`);
  // 兼容别名仍必须存在（消费方不断链）
  for (const name of ['--motion-fast', '--motion-base', '--motion-slow']) {
    assert.match(CSS, new RegExp(`${name}\\s*:\\s*[^;]+;`), `styles.css 缺兼容别名 ${name}`);
  }
  for (const name of ['--ease-standard', '--ease-enter']) {
    assert.match(CSS, new RegExp(`${name}\\s*:\\s*[^;]+;`), `styles.css 缺动效曲线令牌 ${name}`);
  }
});

test('M5 reduced-motion：兜底块把 transition-delay / animation-delay 归零', () => {
  const block = blockAfter(CSS, '@media (prefers-reduced-motion: reduce)');
  assert.ok(block, 'styles.css 缺少 @media (prefers-reduced-motion: reduce) 兜底块');
  assert.match(block, /transition-delay:\s*0s\s*!important\s*;/, 'reduced-motion 兜底缺 transition-delay: 0s !important');
  assert.match(block, /animation-delay:\s*0s\s*!important\s*;/, 'reduced-motion 兜底缺 animation-delay: 0s !important');
  assert.match(block, /transition-duration:\s*0\.01ms\s*!important\s*;/, 'reduced-motion 兜底缺 transition-duration 压缩');
  assert.match(block, /animation-duration:\s*0\.01ms\s*!important\s*;/, 'reduced-motion 兜底缺 animation-duration 压缩');
});

test('M6 可复用类：入场 / 折叠 / 按压三件套存在；scale 类已删除', () => {
  for (const cls of ['.motion-enter', '.motion-collapse', '.motion-press']) {
    const body = ruleBody(CSS, cls) || ruleBody(CSS, `${cls}:active`);
    assert.ok(body, `styles.css 缺少可复用动效类 ${cls}`);
  }
  const collapse = ruleBody(CSS, '.motion-collapse');
  assert.match(collapse, /grid-template-rows\s*:/, '.motion-collapse 必须用 grid-template-rows 做高度折叠（不得过渡 height）');
  assert.match(CSS, /\.motion-collapse\.is-open\s*\{[^}]*grid-template-rows:\s*1fr/,
    '.motion-collapse 缺 is-open 态（grid-template-rows: 1fr）');
  assert.match(ruleBody(CSS, '.motion-enter'), /transition:\s*opacity var\(--motion-enter\)[^;]*transform/,
    '.motion-enter 必须同时过渡 opacity 与 transform，并使用 --motion-enter');
  // P10 反例：`scale()` 类缩放属「太 fancy」，零消费方，已删除。
  assert.doesNotMatch(CSS, /\.motion-scale-in\s*\{/, '不得恢复 .motion-scale-in（scale 类过渡属「太 fancy」）');
  assert.doesNotMatch(CSS, /@keyframes\s+motionScaleIn/, '不得恢复 motionScaleIn 关键帧');
});

test('M7 反例：产品 CSS 的 keyframes 不得出现 rotateX / clip-path / 等比 scale()', () => {
  const violations = [];
  for (const rel of PRODUCT_CSS) {
    for (const body of keyframeBodies(strip(read(rel)))) {
      if (/rotateX\s*\(/.test(body)) violations.push(`${rel} keyframes 含 rotateX()`);
      if (/clip-path\s*:/.test(body)) violations.push(`${rel} keyframes 含 clip-path`);
      // scaleX / scaleY 是进度条 / 方向位移的合法用法；只有等比 scale() 判红。
      if (/(?<!scaleX)(?<!scaleY)(?<!scale3d)\bscale\s*\(/.test(body)) violations.push(`${rel} keyframes 含等比 scale()`);
    }
  }
  assert.deepEqual(violations, [], `「太 fancy」手法回流：\n  ${violations.join('\n  ')}`);
});

test('M8 JS 内联：不得写裸毫秒 transition/animation（about-entry.js 冻结登记）', () => {
  const violations = [];
  const BARE_JS_DECL = /(?:transition|animation)(?:-duration)?\s*(?::|=)\s*(['"`])(?:(?!\1).)*?\d*\.?\d+(?:ms|s)\b/;
  let aboutCount = 0;
  for (const rel of JS_FILES) {
    const src = read(rel);
    if (rel.endsWith('about-entry.js')) {
      aboutCount += (src.match(BARE_JS_DECL) || []).length;
      continue;
    }
    src.split('\n').forEach((line, idx) => {
      const code = line.replace(/^\s*(\/\/|\*|\/\*).*/, '');
      if (BARE_JS_DECL.test(code)) violations.push(`${rel}:${idx + 1} ${norm(line)}`);
    });
  }
  assert.deepEqual(violations, [], `JS 内联动效仍写裸毫秒（应走 var(--motion-*)）：\n  ${violations.join('\n  ')}`);
  console.log(`[motion-guard] About 冻结件 JS 登记：${aboutCount} 处`);
});

test('M9 滚动：禁止裸 behavior:\'smooth\'，必须走 smoothScroll()（about-entry.js 冻结登记）', () => {
  const SMOOTH = /behavior\s*:\s*['"]smooth['"]/;
  const violations = [];
  let aboutCount = 0;
  for (const rel of JS_FILES) {
    const lines = read(rel).split('\n');
    lines.forEach((line, idx) => {
      const code = line.replace(/^\s*(\/\/|\*|\/\*).*/, '');
      if (!SMOOTH.test(code)) return;
      if (rel.endsWith('about-entry.js')) { aboutCount += 1; return; }
      violations.push(`${rel}:${idx + 1} ${norm(line)}`);
    });
  }
  assert.deepEqual(violations, [], `禁止裸 behavior:'smooth'（改调 core/base/utils.js::smoothScroll）：\n  ${violations.join('\n  ')}`);
  assert.ok(aboutCount > 0, 'About 冻结件登记失效：未解析到 behavior:\'smooth\'');
  assert.match(read('docs/src/core/base/utils.js'), /export function smoothScroll\(/,
    'core/base/utils.js 缺 smoothScroll() helper');
});

test('M10 滚动出口唯一：除 helper / about-entry 外不得直调 scrollIntoView/scrollTo/scrollBy', () => {
  const CALL = /\.(scrollIntoView|scrollTo|scrollBy)\s*\(/;
  const violations = [];
  for (const rel of JS_FILES) {
    if (rel.endsWith('about-entry.js') || rel.endsWith('core/base/utils.js')) continue;
    read(rel).split('\n').forEach((line, idx) => {
      const code = line.replace(/^\s*(\/\/|\*|\/\*).*/, '');
      if (!CALL.test(code)) return;
      violations.push(`${rel}:${idx + 1} ${norm(line)}`);
    });
  }
  assert.deepEqual(violations, [], `滚动调用必须收口到 smoothScroll()：\n  ${violations.join('\n  ')}`);
});
