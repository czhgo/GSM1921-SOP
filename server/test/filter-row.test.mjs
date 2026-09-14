// server/test/filter-row.test.mjs — 筛选行与表格样式单一源（2026-09-14 批次 27）
// 两层法（DATA_CONSISTENCY_CHECKLIST §0）：
//   结构层 S1–S7：静态扫描防回潮
//     S1 类族在位（styles.css 必须定义 .lf-* 与 .data-table 族）
//     S2 唯一检索引擎不得再出现 chip 分面（改下拉）
//     S3 全站表格只允许 .data-table / .vs-matrix 两种类
//     S4 表头/单元格重复声明不得回潮（各表勿再各写一遍）
//     S5 档位唯一（清 10px 下拉死规则 / 触发器不再补 h-8）
//     S6 筛选行禁 chip（声明 .lf-bar 的文件不得用 .chip-option）
//     S7 自写搜索框必须落在 .lf-kw（筛选行载体单一源）
//   口径层 D1：档位数值三处同源（.lf-btn / .data-table / .input-flat.text-xs 均为 34px×12px 一套）
// node-only（不启浏览器）：纯静态扫描 + 样式文本解析。
//
// 例外说明：docs/help.html 的 <table class="doc-table"> 属帮助页专用文档样式（支书裁定帮助页
//   可独立于工作台设计系统），不在本守卫范围内；本守卫只扫 docs/src（工作台应用层）。

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SRC_DIR = join(ROOT, 'docs', 'src');
const CSS = join(SRC_DIR, 'styles.css');

function walkJs(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walkJs(full, out);
    else if (name.endsWith('.js')) out.push(full);
  }
  return out;
}

const rel = (f) => f.slice(SRC_DIR.length + 1).replace(/\\/g, '/');
const read = (f) => readFileSync(f, 'utf8');
const lines = (f) => read(f).split(/\r?\n/);

// ── 结构层 ──────────────────────────────────────────────────────────

test('S1 筛选行与表格类族在 styles.css 单一源在位', () => {
  const css = read(CSS);
  for (const cls of ['.lf-bar', '.lf-kw', '.lf-select', '.lf-btn']) {
    assert.ok(css.includes(cls), `styles.css 须定义筛选行类族 ${cls}（各表不得再各写一套 flex/padding）`);
  }
  assert.ok(css.includes('.data-table'), 'styles.css 须定义表格类族 .data-table');
  for (const sel of ['.data-table thead tr', '.data-table th', '.data-table tbody tr', '.data-table td']) {
    assert.ok(css.includes(sel), `表格单一源须含 ${sel}（表头/行线/悬停/内边距口径）`);
  }
});

test('S2 统一检索引擎的分面已是下拉（不得再出现 chip 分面）', () => {
  const src = read(join(SRC_DIR, 'components', 'list-filter.js'));
  assert.ok(!/chip-option|chip-accent-on|lf-chip/.test(src),
    'list-filter.js 不得再引用 chip 类（分面一律下拉，2026-09-14 批次 27 裁定）');
  assert.match(src, /class="input-flat text-xs lf-select"/, '分面渲染须为 .lf-select 下拉');
  assert.match(src, /\.lf-bar/, '检索条容器须用 .lf-bar 单一源');
  assert.match(src, /<table class="data-table/, '结果区表格须用 .data-table 单一源');
});

test('S3 全站表格只用单一源类（.data-table / 专用 .vs-matrix）', () => {
  // 原状：8 张真表格各写一遍 w-full text-xs / w-full text-left，表头三套模式并存 → 必收敛。
  const ALLOW = new Set(['data-table', 'vs-matrix']);
  const offenders = [];
  for (const f of walkJs(SRC_DIR)) {
    lines(f).forEach((line, i) => {
      for (const m of line.matchAll(/<table\s+class="([^"]*)"/g)) {
        const cls = m[1].split(/\s+/).filter(Boolean);
        if (!cls.length || !ALLOW.has(cls[0])) offenders.push(`${rel(f)}:${i + 1} class="${m[1]}"`);
      }
    });
  }
  assert.deepEqual(offenders, [], '表格 class 必须以 data-table（或专用 vs-matrix）打头；行内不得再补 w-full/text-xs');
});

test('S4 表头/单元格重复声明不得回潮', () => {
  const BAD = [
    /py-2 px-3 text-left text-gray-500 font-medium/,      // 旧表头模式 A
    /<th class="py-/,                                      // 任何仍带内边距档的表头
    /<td class="(py-2 px-3|py-1\.5 px-3|px-2 py-1\.5)/,    // 旧单元格内边距档
    /border-b border-gray-50 hover:bg-gray-50/,            // 行线/悬停重复声明
  ];
  const offenders = [];
  for (const f of walkJs(SRC_DIR)) {
    lines(f).forEach((line, i) => {
      const t = line.trimStart();
      if (t.startsWith('//') || t.startsWith('*') || t.startsWith('/*')) return; // 注释里的历史说明不算
      for (const re of BAD) if (re.test(line)) offenders.push(`${rel(f)}:${i + 1}`);
    });
  }
  assert.deepEqual([...new Set(offenders)], [], '表格内边距/行线/悬停一律由 .data-table 提供，各表勿再重复声明');
});

test('S5 控件档位唯一：清 10px 下拉死规则 + 触发器不再补 32px', () => {
  const css = read(CSS);
  assert.ok(!/select\.input-flat\.text-\\\[10px\\\]/.test(css) && !/\.cs-trigger\.input-flat\.text-\\\[10px\\\]/.test(css),
    'styles.css 不得残留 text-[10px] 下拉档死规则（已被规范禁止；大字模式字号覆盖规则不属此列）');
  const cs = read(join(SRC_DIR, 'components', 'custom-select.js'));
  assert.ok(!/classList\.add\('h-8'\)/.test(cs),
    '下拉触发器不得再补 h-8（32px）——须与 input-flat.text-xs 同为 34px，否则同排底部错位 2px');
});

test('S6 筛选行禁 chip（声明 .lf-bar 的文件不得用 .chip-option）', () => {
  // chip 只属表单内多选/正交维度（支书裁定 2026-09-14）。
  const FORM_ALLOW = new Set([
    'entries/tabs/secretary/assign-tab.js',       // 赋权管理：工作程序/工作方法多选
    'entries/tabs/secretary/notification-tab.js', // 通知受众多选
  ]);
  const offenders = [];
  for (const f of walkJs(SRC_DIR)) {
    const r = rel(f);
    const src = read(f);
    if (!src.includes('lf-bar')) continue;
    if (FORM_ALLOW.has(r)) continue;
    lines(f).forEach((line, i) => {
      if (/chip-option/.test(line)) offenders.push(`${r}:${i + 1}`);
    });
  }
  assert.deepEqual(offenders, [], '筛选行（.lf-bar）内一律下拉，禁止分面 chip');
});

test('S7 自写搜索框须落在 .lf-kw（筛选行载体单一源）', () => {
  // 防回潮：新增的筛选搜索框若自写 flex-1 min-w-[140px] 就会重新长出第二套载体。
  const offenders = [];
  for (const f of walkJs(SRC_DIR)) {
    if (rel(f) === 'components/person-picker.js') continue; // 选人器内嵌搜索（表单内，非筛选行）
    lines(f).forEach((line, i) => {
      if (!/input-flat/.test(line)) return;
      if (!/placeholder="搜索/.test(line)) return;
      if (/lf-kw/.test(line)) return;
      offenders.push(`${rel(f)}:${i + 1}`);
    });
  }
  assert.deepEqual(offenders, [], '筛选行搜索框须写 class="input-flat text-xs lf-kw"');
});

// ── 口径层 ──────────────────────────────────────────────────────────

test('D1 档位数值三处同源（34px 高 / 12px 字）', () => {
  const css = read(CSS);
  assert.match(css, /\.lf-btn\s*\{[^}]*height:\s*34px/, '.lf-btn 高度须为 34px');
  assert.match(css, /\.data-table\s*\{[^}]*font-size:\s*0\.75rem/, '.data-table 字号须与 text-xs 同（0.75rem）');
  assert.match(css, /\.data-table\s*\{[^}]*line-height:\s*1rem/, '.data-table 行高须与 text-xs 同（1rem）');
  assert.match(css, /\.lf-btn\s*\{[^}]*font-size:\s*0\.75rem/, '.lf-btn 字号须为 0.75rem');
  // 输入框档：input.input-flat.text-xs 上下 8px + 行高 16px + 边框 2px = 34px
  assert.match(css, /input\.input-flat\.text-xs\s*\{[^}]*padding-top:\s*8px/, '搜索框档须为 8px 上内边距（34px 档）');
  assert.match(css, /input\.input-flat\.text-xs\s*\{[^}]*padding-bottom:\s*8px/, '搜索框档须为 8px 下内边距（34px 档）');
});
