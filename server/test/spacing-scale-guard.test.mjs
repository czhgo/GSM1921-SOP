// server/test/spacing-scale-guard.test.mjs — 间距五档与自由值存量守卫（2026-10-18 立 · Task 1）
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

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SRC = join(ROOT, 'docs', 'src');
const CSS = join(SRC, 'styles.css');
const DESIGN = join(ROOT, 'content', '04_web_design', 'design-system', 'DESIGN_SYSTEM.md');

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

/** 基线（2026-10-18 本批实测 35；只降不升） */
const SPACING_BASELINE = 35;

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

test('S2 自由间距值存量只降不升（基线 35）', () => {
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
