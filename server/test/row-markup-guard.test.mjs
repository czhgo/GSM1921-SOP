// server/test/row-markup-guard.test.mjs — 手写行容器存量守卫（2026-10-18 立 · Task 2 / Task 9）
//
// 来源：Spec「工作台密度与组件重组」Task 2 / Task 9；判例＝「`div` 行堆叠读不下去」。
//   病灶：页面各自手写 `div` + `border-b` + `py-2.5` 的行容器，厚度、分隔线与行尾动作各写一套。
//   裁定：新增重复行必须用 components/ui/list-row.js；手写行容器存量 **只降不升**。
//
// 判据：
//   R1 docs/src 下三种典型手写行容器特征的出现次数 <= 基线（2026-10-18 实测 12）；
//   R2 list-row.js 存在且导出 listRowHtml / listGroupHtml；
//   R3 七个复用模块文件均存在（pager / relation-matrix 为本批前既有，不得重写但须在位）；
//   R4 DESIGN_SYSTEM §4.20.7/§4.20.8 的三类行型与七个模块名齐备（Task 9.3 文档面）。
//
// 基线纪律：**只降不升**；新增行用 list-row。迁移后请同批下调 HANDWRITTEN_ROW_BASELINE。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SRC = join(ROOT, 'docs', 'src');
const UI = join(SRC, 'components', 'ui');
const DESIGN = join(ROOT, 'content', '04_web_design', 'design-system', 'DESIGN_SYSTEM.md');

/** 典型手写行容器特征（逐字子串；本批实测合计 12） */
const HANDWRITTEN_ROW_PATTERNS = [
  'border-b border-gray-100 last:border-b-0',
  'py-2.5 border-b border-gray-100',
  'flex items-center gap-3 py-2.5 px-3',
];

/** 基线（2026-10-18 本批实测 12；只降不升） */
const HANDWRITTEN_ROW_BASELINE = 12;

/** 七个复用模块（Task 2；person-picker 属 governance 目录，不重写但须在位） */
const MODULES = ['list-row.js', 'filter-bar.js', 'data-table.js', 'pager.js', 'empty-state.js', 'relation-matrix.js']
  .map((n) => join(UI, n))
  .concat(join(SRC, 'components', 'governance', 'person-picker.js'));

function walk(dir, out = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.(js|html)$/.test(e.name)) out.push(p);
  }
  return out;
}

test('R1 手写行容器存量只降不升（基线 12）', () => {
  const files = walk(SRC);
  let total = 0;
  const perFile = new Map();
  for (const f of files) {
    const src = readFileSync(f, 'utf8');
    let n = 0;
    for (const pat of HANDWRITTEN_ROW_PATTERNS) n += src.split(pat).length - 1;
    if (!n) continue;
    total += n;
    perFile.set(relative(ROOT, f).replace(/\\/g, '/'), n);
  }
  const ledger = [...perFile.entries()].sort((a, b) => b[1] - a[1])
    .map(([f, n]) => `  ${String(n).padStart(3)}  ${f}`).join('\n');
  console.log(`[row-markup-guard] 手写行容器 ${total} 处（棘轮上限 ${HANDWRITTEN_ROW_BASELINE}）：\n${ledger}`);
  assert.ok(total <= HANDWRITTEN_ROW_BASELINE,
    `手写行容器由 ${HANDWRITTEN_ROW_BASELINE} 升到 ${total} 处 ⇒ 新增行请用 components/ui/list-row.js；迁移一屏请同批下调基线。`);
});

test('R2 list-row.js 存在并导出 listRowHtml / listGroupHtml', () => {
  const file = join(UI, 'list-row.js');
  assert.ok(existsSync(file), 'components/ui/list-row.js 不存在——新增重复行没有单一源');
  const src = readFileSync(file, 'utf8');
  assert.match(src, /export function listRowHtml\s*\(/, 'list-row.js 未导出 listRowHtml');
  assert.match(src, /export function listGroupHtml\s*\(/, 'list-row.js 未导出 listGroupHtml');
});

test('R3 七个复用模块文件均存在', () => {
  for (const f of MODULES) {
    assert.ok(existsSync(f), `复用模块缺失：${relative(ROOT, f).replace(/\\/g, '/')}`);
  }
});

test('R4 DESIGN_SYSTEM §4.20.7/§4.20.8：三类行型与七个模块名齐备', () => {
  const doc = readFileSync(DESIGN, 'utf8');
  assert.match(doc, /#### 4\.20\.7 表格内部三类行型/, 'DESIGN_SYSTEM 缺 §4.20.7「表格内部三类行型」');
  assert.match(doc, /#### 4\.20\.8 复用模块采用矩阵/, 'DESIGN_SYSTEM 缺 §4.20.8「复用模块采用矩阵」');
  for (const term of ['对象行', '关系行', '留痕行']) {
    assert.ok(doc.includes(term), `§4.20.7 缺行型「${term}」`);
  }
  for (const mod of ['list-row', 'filter-bar', 'data-table', 'pager', 'empty-state', 'person-picker', 'relation-matrix']) {
    assert.ok(doc.includes(mod), `§4.20.8 采用矩阵缺模块「${mod}」`);
  }
  assert.ok(doc.includes('选人面板'), '§4.20.8 须把 person-picker 的代表页面写为「选人面板」');
});
