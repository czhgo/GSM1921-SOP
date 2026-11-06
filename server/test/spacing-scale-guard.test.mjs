// server/test/spacing-scale-guard.test.mjs — 间距五档与自由值存量守卫（2026-10-18 立 · Task 1）
// 2026-10-31 追加 S5–S7：styles.css 非令牌声明 / 行内间距声明 / 含行内间距属性三档棘轮（只减不增）。
//
// 来源：Spec「工作台密度与组件重组」Task 1 / DESIGN_SYSTEM §4.21。
//   病灶：间距此前没有档位表，页面直接写 `p-[14px]` / `gap-[10px]` / `mt-[6px]`，
//   同屏出现多种厚度，且改一处不会带动其它页。
//
// 判据：
//   S1 styles.css 存在 --space-1/2/3/4/6 且值分别为 4/8/12/16/24px；
//   S2 docs/src 下任意间距类（p-/px-/py-/.../gap-/space-y-/space-x- + [Npx]）的存量
//      **只降不升**（基线＝2026-10-18 本批实测 35）；
//   S3 本批新增的四个复用模块不得出现自由间距值；
//   S4 DESIGN_SYSTEM §4.21 的档位 / 组件族 / 禁止条款术语齐备（Task 9.3 的文档面）。
//
// 基线纪律：**只降不升**。迁移存量后请同批下调 SPACING_BASELINE；不得为变绿上调。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  SPACING_NON_TOKEN_BASELINE, SPACING_INLINE_DECL_BASELINE, SPACING_INLINE_ATTR_BASELINE,
} from './style-baseline.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SRC = join(ROOT, 'docs', 'src');
const CSS = join(SRC, 'styles.css');
const DESIGN = join(ROOT, 'content', '04_web_design', 'design-system', 'DS_03_COMPONENTS.md');

/** 五档令牌（单一源＝styles.css :root） */
const SPACE_TOKENS = [
  ['--space-1', '4px'],
  ['--space-2', '8px'],
  ['--space-3', '12px'],
  ['--space-4', '16px'],
  ['--space-6', '24px'],
];

/** 自由间距值：任意值工具类（长前缀在前，避免 p- 抢先命中 px-/py-） */
const ARBITRARY_SPACING_RE = /\b(?:space-y|space-x|px|py|pt|pb|pl|pr|p|mx|my|mt|mb|ml|mr|m|gap)-\[\d+(?:\.\d+)?px\]/g;

/** 基线（2026-10-18 本批实测 35；2026-10-20 浮窗/六条 IA 批次把全部 `py-[7px]` 迁到 `py-1.5` ⇒ 0；只降不升） */
const SPACING_BASELINE = 0;

/** 本批新增的四个模块（Task 2） */
const NEW_MODULES = ['list-row.js', 'filter-bar.js', 'data-table.js', 'empty-state.js']
  .map((n) => join(SRC, 'components', 'ui', n));

function walk(dir, out = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.(js|mjs|css|html)$/.test(e.name)) out.push(p);
  }
  return out;
}

function countArbitrarySpacing(src) {
  return (src.match(ARBITRARY_SPACING_RE) || []).length;
}

test('S1 间距五档令牌：styles.css 存在且值为 4/8/12/16/24px', () => {
  const css = readFileSync(CSS, 'utf8');
  for (const [token, value] of SPACE_TOKENS) {
    assert.match(css, new RegExp(`${token}\\s*:\\s*${value}\\s*;`),
      `styles.css 缺少 ${token}: ${value}; —— 五档间距必须由 :root 单一源提供`);
  }
});

test('S2 自由间距值存量只降不升（基线 0）', () => {
  const files = walk(SRC);
  const perFile = new Map();
  let total = 0;
  for (const f of files) {
    const n = countArbitrarySpacing(readFileSync(f, 'utf8'));
    if (!n) continue;
    total += n;
    perFile.set(relative(ROOT, f).replace(/\\/g, '/'), n);
  }
  const ledger = [...perFile.entries()].sort((a, b) => b[1] - a[1])
    .map(([f, n]) => `  ${String(n).padStart(3)}  ${f}`).join('\n');
  console.log(`[spacing-scale-guard] docs/src 自由间距值 ${total} 个（棘轮上限 ${SPACING_BASELINE}）：\n${ledger}`);
  assert.ok(total <= SPACING_BASELINE,
    `自由间距值由 ${SPACING_BASELINE} 升到 ${total} 个 ⇒ 新代码只能引用 --space-1/2/3/4/6 或 §4.21 的语义类；迁移一屏请同批下调基线。`);
});

test('S3 新增四个复用模块不得出现自由间距值', () => {
  const offenders = [];
  for (const f of NEW_MODULES) {
    const src = readFileSync(f, 'utf8');
    const hits = src.match(ARBITRARY_SPACING_RE) || [];
    if (hits.length) offenders.push(`${relative(ROOT, f).replace(/\\/g, '/')} → ${[...new Set(hits)].join(' / ')}`);
  }
  assert.deepEqual(offenders, [],
    `新增模块出现自由间距值（应引用 styles.css 令牌或语义类）：\n  ${offenders.join('\n  ')}`);
});

test('S4 DESIGN_SYSTEM §4.21：五档定义、组件族采用矩阵与禁止条款齐备', () => {
  const doc = readFileSync(DESIGN, 'utf8');
  assert.match(doc, /### 4\.21 间距五档与组件采用矩阵/, 'DESIGN_SYSTEM 缺 §4.21 标题');
  for (const [token, value] of SPACE_TOKENS) {
    assert.ok(doc.includes(token) && doc.includes(value),
      `§4.21 缺间距令牌 ${token}（${value}）`);
  }
  for (const term of ['页面区块', '标准卡', '紧凑卡', '列表行', '表格单元', '表单字段', '徽章', '按钮']) {
    assert.ok(doc.includes(term), `§4.21 组件采用矩阵缺组件族「${term}」`);
  }
  for (const banned of ['p-[14px]', 'gap-[10px]', 'mt-[6px]']) {
    assert.ok(doc.includes(banned), `§4.21 禁止条款缺自由值示例「${banned}」`);
  }
});

// ════════════════════════════════════════════════════════════════
// S5–S7 · 间距令牌覆盖率棘轮（2026-10-31 低风险收口批）
//   病灶：styles.css 大量间距仍写裸值；行内 style 的 margin/padding 分散在页面里。
//   本批**不做批量替换**（会改变渲染），只立棘轮：
//   S5 styles.css 中「非 var(--space-*) 且非 0/auto」的 margin/padding/gap 声明 ≤ 基线；
//   S6/S7 docs/**/*.{js,mjs,html} 的 style="…" 内间距声明数 / 含间距属性数 ≤ 基线。
//   收基线：迁走一段就同批下调 style-baseline.mjs 的对应常量；不得为变绿上调。
// ════════════════════════════════════════════════════════════════

/** 间距属性（长名在前，避免 `p-` 抢先命中 `px-`；扫描面只认这些语义属性） */
const SPACING_PROP_RE = /^(?:margin|padding)(?:-(?:top|right|bottom|left))?$|^(?:gap|row-gap|column-gap)$/;
/** 零值 / 关键字：不算「间距取值」，不参与棘轮 */
const SPACING_RESET_RE = /^(?:0|auto|inherit|initial|unset)$/i;
/** styles.css 声明抽取（注释先剥掉，避免把文档表格里的示例算进去） */
const SPACING_DECL_RE = /(?:^|[;{\s])((?:margin|padding)(?:-(?:top|right|bottom|left))?|gap|row-gap|column-gap)\s*:\s*([^;}]+)/g;
/** 行内 style 属性（单/双引号 + JS 模板串三态） */
const STYLE_ATTR_RE = /style=(?:"([^"]*)"|'([^']*)'|`([^`]*)`)/g;

const stripCssComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '');

/** 纯函数：styles.css 非令牌间距声明（反例自检用；不读磁盘） */
function countNonTokenSpacing(css) {
  let nonToken = 0;
  let token = 0;
  for (const m of stripCssComments(css).matchAll(SPACING_DECL_RE)) {
    const v = m[2].trim().replace(/\s*!important$/i, '');
    if (SPACING_RESET_RE.test(v)) continue;
    if (/var\(--space-\d+\)/.test(v)) token += 1;
    else nonToken += 1;
  }
  return { nonToken, token };
}

/** 纯函数：行内间距统计（反例自检用；不读磁盘） */
function countInlineSpacing(src) {
  let attrs = 0;
  let decls = 0;
  for (const m of src.matchAll(STYLE_ATTR_RE)) {
    const body = m[1] ?? m[2] ?? m[3] ?? '';
    let hit = 0;
    for (const d of body.split(';')) {
      const i = d.indexOf(':');
      if (i < 0) continue;
      if (!SPACING_PROP_RE.test(d.slice(0, i).trim())) continue;
      const v = d.slice(i + 1).trim().replace(/\s*!important$/i, '');
      if (SPACING_RESET_RE.test(v)) continue;
      hit += 1;
    }
    if (hit) attrs += 1;
    decls += hit;
  }
  return { attrs, decls };
}

test('S5 styles.css 非令牌间距声明只减不增（含反例自检）', () => {
  // 反例自检：裸值计入、令牌不计、0 不计（证明计数器不是恒 0 / 恒真）
  assert.deepEqual(countNonTokenSpacing('.a{padding:7px}.b{padding:var(--space-2)}.c{margin:0}'),
    { nonToken: 1, token: 1 }, 'S5 计数器失效：裸值 / 令牌 / 零值未被正确区分');
  const { nonToken, token } = countNonTokenSpacing(readFileSync(CSS, 'utf8'));
  console.log(`[S5] styles.css 间距声明：令牌 ${token} 条 · 非令牌 ${nonToken} 条（棘轮上限 ${SPACING_NON_TOKEN_BASELINE}）`);
  assert.ok(nonToken <= SPACING_NON_TOKEN_BASELINE,
    `styles.css 非令牌间距声明由 ${SPACING_NON_TOKEN_BASELINE} 升到 ${nonToken} ⇒ 新代码先引用 --space-1/2/3/4/6；`
    + '迁走一条请同批下调 style-baseline.mjs::SPACING_NON_TOKEN_BASELINE。');
  assert.ok(token >= 80, `令牌间距只剩 ${token} 条（下限 80）：抽取口径或令牌被削，棘轮失去对照面`);
});

test('S6 行内间距声明只减不增（含反例自检）', () => {
  assert.deepEqual(countInlineSpacing('<div style="margin-top:8px;padding:0">x</div>'), { attrs: 1, decls: 1 },
    'S6 计数器失效：行内 margin-top 未计入 / padding:0 未排除');
  let decls = 0;
  let attrs = 0;
  let files = 0;
  for (const f of walk(ROOT + '/docs')) {
    if (!/\.(js|mjs|html)$/.test(f)) continue;
    const r = countInlineSpacing(readFileSync(f, 'utf8'));
    if (r.attrs) files += 1;
    decls += r.decls;
    attrs += r.attrs;
  }
  console.log(`[S6] 行内间距声明 ${decls} 条 / 属性 ${attrs} 处 / 文件 ${files}（棘轮上限 ${SPACING_INLINE_DECL_BASELINE} 条）`);
  assert.ok(decls <= SPACING_INLINE_DECL_BASELINE,
    `行内间距声明由 ${SPACING_INLINE_DECL_BASELINE} 升到 ${decls} ⇒ 新代码改用 --space-* 或语义类；`
    + '迁走一条请同批下调 style-baseline.mjs::SPACING_INLINE_DECL_BASELINE。');
  assert.ok(attrs >= 100, `行内间距属性只剩 ${attrs} 处（下限 100）：扫描面被削，棘轮失去约束力`);
});

test('S7 含行内间距的 style 属性只减不增', () => {
  let attrs = 0;
  for (const f of walk(ROOT + '/docs')) {
    if (!/\.(js|mjs|html)$/.test(f)) continue;
    attrs += countInlineSpacing(readFileSync(f, 'utf8')).attrs;
  }
  assert.ok(attrs <= SPACING_INLINE_ATTR_BASELINE,
    `含行内间距的 style 属性由 ${SPACING_INLINE_ATTR_BASELINE} 升到 ${attrs} ⇒ 新增行内间距须先登记基线并写理由。`);
});
