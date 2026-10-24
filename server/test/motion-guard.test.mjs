// role: [工程师]+[AI]
// motion-guard.test.mjs — 动效令牌 / 属性 / 可复用类守卫（2026-10-24 · 批次 508）
//
// 为什么要有本守卫：
//   · 批次 508 把全站过渡时长 / 曲线收敛为 `--motion-*` / `--ease-*` 唯一源，
//     并补了 `.motion-enter / .motion-collapse / .motion-press / .motion-scale-in` 四件套。
//     此前各处散写 0.15s / 150ms / 0.3s / transition: all，改一处档位要全站搜。
//   · 判据：
//       M1 非空转：styles.css 解析到 ≥20 条 transition 声明
//       M2 时长白名单：transition/animation 时长只能是 var(--motion-*) / 0s（token 定义处除外）
//       M3 属性白名单：transition-property 只能是 8 个安全属性（+ 已登记例外）；
//          all / height / width / max-height / padding / top / left / margin 一律红
//       M4 令牌齐备：--motion-fast/base/slow/enter 与 --ease-standard/enter 均存在
//       M5 reduced-motion：兜底块必须把 transition-delay / animation-delay 归零
//       M6 可复用类：4 个 .motion-* 都存在，且 .motion-collapse 用 grid-template-rows
//   · 口径调整（据实况，不删断言）：
//       M2 的存量裸值（登录/浮层/toast/help 目录 5 条 + reduced-motion 的 0.01ms 2 条）
//       不在本批可改面（docs/** 禁改），逐条登记为「待迁移」；白名单与实际命中双向核对，
//       新增任何裸值都会红。M3 的 outline-color / grid-* / visibility / text-decoration-color
//       是「不触发布局的既有过渡」，同样逐条登记理由后放行。
// 运行：node --test server/test/motion-guard.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');
const RAW = read('docs/src/styles.css');
const CSS = RAW.replace(/\/\*[\s\S]*?\*\//g, '');
const LINES = CSS.split('\n');
const norm = (s) => String(s).replace(/\s+/g, ' ').trim();

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

const DECL_RE = /^\s*(?:-webkit-)?(?:transition|animation)(?:-duration)?\s*:\s*([^;]+);?\s*$/;
const TRANSITION_PROP_RE = /^\s*(?:-webkit-)?transition(?:-property)?\s*:\s*([^;]+);?\s*$/;

/** 收集 transition / animation 声明（行级；styles.css 内均为单行声明） */
function motionDecls() {
  const out = [];
  LINES.forEach((line, idx) => {
    const m = DECL_RE.exec(line);
    if (!m) return;
    out.push({ line: idx + 1, text: norm(line), body: m[1].trim() });
  });
  return out;
}

const MOTION_DECLS = motionDecls();

/**
 * M2 存量白名单：本批可改面不含 docs/**，以下裸值只能「只降不增」。
 * 每条的 key 是规范化后的整行声明；zombie 检查保证条目仍然真实存在。
 */
const BARE_DURATION_EXCEPTIONS = [
  { decl: 'transition: opacity 0.25s ease-out, transform 0.25s ease-out;', reason: '视图切换（.view-section，存量）' },
  { decl: 'transition: opacity 0.14s ease-out, transform 0.14s ease-out;', reason: '状态徽章浮层（.status-badge-popover，存量）' },
  { decl: 'transition: background-color 0.12s ease-out;', reason: '状态徽章选项（.status-badge-option，存量）' },
  { decl: 'transition: opacity 240ms var(--help-ease);', reason: 'help 页目录（独立 --help-ease 体系，存量）' },
  { decl: 'transition: background-color 240ms var(--help-ease), transform 240ms var(--help-ease);', reason: 'help 页目录圆点（独立 --help-ease 体系，存量）' },
  { decl: 'animation-duration: 0.01ms !important;', reason: 'prefers-reduced-motion 兜底（必须保留极短时长以维持事件语义）' },
  { decl: 'transition-duration: 0.01ms !important;', reason: 'prefers-reduced-motion 兜底（必须保留极短时长以维持事件语义）' },
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

test('M2 时长白名单：只允许 var(--motion-*) / 0s，裸值逐条登记（防新增）', () => {
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

  const unmatched = hits.filter((h) => !BARE_DURATION_EXCEPTIONS.some((e) => h.text === norm(e.decl)));
  assert.deepEqual(unmatched.map((h) => `styles.css:${h.line} ${h.text}`), [],
    `transition/animation 时长必须走 var(--motion-*)（只允许 0s）；以下裸值未登记：\n  ${unmatched.map((h) => `styles.css:${h.line} ${h.text}`).join('\n  ')}`);

  // 防僵尸：白名单条目必须仍真实命中
  const zombies = BARE_DURATION_EXCEPTIONS.filter((e) => !hits.some((h) => h.text === norm(e.decl)));
  assert.deepEqual(zombies.map((e) => `${e.decl}（${e.reason}）`), [],
    `M2 白名单存在僵尸条目（裸值已迁移，请删除）：\n  ${zombies.map((e) => `${e.decl}（${e.reason}）`).join('\n  ')}`);
});

test('M3 属性白名单：不得过渡 all / 布局属性；例外逐条登记', () => {
  const violations = [];
  const seen = new Set();
  for (const [idx, line] of LINES.entries()) {
    const m = TRANSITION_PROP_RE.exec(line);
    if (!m) continue;
    const parts = m[1].split(',').map((p) => p.trim()).filter(Boolean);
    for (const part of parts) {
      if (part === 'none') continue;
      const prop = part.split(/\s+/)[0];
      seen.add(prop);
      if (FORBIDDEN_PROPERTIES.has(prop)) {
        violations.push(`styles.css:${idx + 1} 禁止过渡布局属性 ${prop}（${norm(line)}）`);
        continue;
      }
      if (!SAFE_PROPERTIES.has(prop) && !PROPERTY_EXCEPTIONS.has(prop)) {
        violations.push(`styles.css:${idx + 1} 未登记过渡属性 ${prop}（${norm(line)}）`);
      }
    }
  }
  assert.ok(seen.size >= 5, `只解析到 ${seen.size} 种过渡属性（下限 5）：解析面写坏`);
  assert.deepEqual(violations, [], `transition 属性不合规：\n  ${violations.join('\n  ')}`);
  console.log(`[motion-guard] 过渡属性：${[...seen].sort().join(' / ')}`);
});

test('M4 令牌齐备：--motion-fast/base/slow/enter 与 --ease-standard/enter 均存在', () => {
  for (const name of ['--motion-fast', '--motion-base', '--motion-slow', '--motion-enter']) {
    assert.match(CSS, new RegExp(`${name}\\s*:\\s*[^;]+;`), `styles.css 缺动效时长令牌 ${name}`);
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

test('M6 可复用类：4 个 .motion-* 都存在，.motion-collapse 用 grid-template-rows', () => {
  for (const cls of ['.motion-enter', '.motion-collapse', '.motion-press', '.motion-scale-in']) {
    const body = ruleBody(CSS, cls) || ruleBody(CSS, `${cls}:active`);
    assert.ok(body, `styles.css 缺少可复用动效类 ${cls}`);
  }
  const collapse = ruleBody(CSS, '.motion-collapse');
  assert.match(collapse, /grid-template-rows\s*:/, '.motion-collapse 必须用 grid-template-rows 做高度折叠（不得过渡 height）');
  assert.match(CSS, /\.motion-collapse\.is-open\s*\{[^}]*grid-template-rows:\s*1fr/,
    '.motion-collapse 缺 is-open 态（grid-template-rows: 1fr）');
  assert.match(ruleBody(CSS, '.motion-enter'), /transition:\s*opacity var\(--motion-enter\)[^;]*transform/,
    '.motion-enter 必须同时过渡 opacity 与 transform，并使用 --motion-enter');
  assert.match(ruleBody(CSS, '.motion-scale-in'), /animation:[^;]*var\(--motion-enter\)/,
    '.motion-scale-in 必须使用 --motion-enter 时长');
});
