// server/test/filter-row.test.mjs — 筛选行与表格样式单一源（2026-09-14 批次 27）
// 两层法（DATA_CONSISTENCY_CHECKLIST §0）：
//   结构层 S1–S7：静态扫描防回潮
//     S1 类族在位（styles.css 必须定义 .lf-* 与 .data-table 族）
//     S2 唯一检索引擎不得再出现 chip 分面（改下拉）
//     S3 全站表格只允许 .data-table / .vs-matrix 两种类
//     S4 表头/单元格重复声明不得回潮（各表勿再各写一遍）
//     S5 单档统一（清 10px 下拉死规则 / 触发器不再补 h-8）
//     S6 筛选行禁 chip（声明 .lf-bar 的文件不得用 .chip-option）
//     S7 自写搜索框必须落在 .lf-kw（筛选行载体单一源）
//     S8 分页控件单一源（.page-btn / .page-num；当前页 .is-current，禁借 .chip-accent-on）
//     S9 选人载体：select 列人名只允许「任命 / 指派到人」四处例外（§4.13 语义两分）
//     S10 分页内置统一引擎（凡经引擎渲染的表一律分页；翻页控件走 .page-btn/.page-num 单一源）
//   口径层 D1：单档口径同源（.lf-btn / .data-table / .input-flat 全站只剩 38px 高 × 13px 字一套）
//   口径层 D2：档位算式显式（内边距 + 显式行高 + 边框 = 38），禁靠 UA 或 CDN 工具类给行高
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
    '下拉触发器不得再补 h-8（32px）——须与 input-flat 同为 38px，否则同排底部错位');
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

test('S8 分页控件单一源（禁借 chip 选中态）', () => {
  // 原状 6 处分页控件形态不一（26 / 32px），其中四处借 .chip-accent-on 表当前页——
  // 该类的 !important 反而掩盖了「当前页按钮缺基础边框与底色」，且 chip 语义被挪用。
  const css = read(CSS);
  for (const cls of ['.page-btn,', '.page-num {', '.page-num.is-current {']) {
    assert.ok(css.includes(cls), `styles.css 须定义分页类族（缺 ${cls}）`);
  }
  assert.ok(!/html\.theme-dark \.qv-page-btn/.test(css),
    '分页控件颜色取主题变量即可，不应再有 .qv-page-btn 深色覆盖补丁');
  const offenders = [];
  for (const f of walkJs(SRC_DIR)) {
    lines(f).forEach((line, i) => {
      if (/page-btn|page-num/.test(line) && /chip-accent-on/.test(line)) offenders.push(`${rel(f)}:${i + 1}`);
    });
  }
  assert.deepEqual(offenders, [], '分页控件不得再借 .chip-accent-on 表当前页（应写 .page-num.is-current）');
});

// S9（2026-09-14 批次 31，支书裁定）
// §4.13 原写「禁止用 select 下拉罗列人名」，而全站实测有 4 处仍在用下拉列人名，且其中两处是
//   「支委角色 或 具体成员」的混合指派（分工到人 / 落实责任人），硬换 PersonPicker 会丢掉
//   「按角色指派」这一档。支书裁定把口径写成**语义两分**（选名单成员 → PersonPicker；
//   任命 / 指派到人 → 允许下拉），据实登记 4 处例外并锁白名单，禁新代码再长出第 5 处。
test('S9 选人载体：用 select 列人名的只允许「任命 / 指派到人」四处例外（详见 COMPONENT_SPEC §4.13）', () => {
  const ALLOW = new Set([
    'entries/tabs/party-committee/branches-tab.js',  // 党委台任命支书
    'components/org-setup-wizard.js',                // 换组织向导内任命
    'entries/tabs/secretary/workforce-panel.js',     // 支书台分工到人（角色 或 到人）
    'components/resolution-followup-manager.js',     // 决议落实责任人（同口径）
  ]);
  // 判据：某行 `<option>` 的内容直接插值「人名变量」（p / m / person / member 的 .name）。
  // 注：不可按「文件里既有 <select> 又有人源」判——那样会把「下拉选活动/类型 + 同一文件另有
  //     PersonPicker / 姓名展示」的正常页面全判为违规（实测 8 处假阳性），故必须逐行看选项内容。
  const OPT_NAME = /<option[^>]*>\$\{[^}]*\b(p|m|person|member)\.name\b/;
  const readByRel = (r) => read(join(SRC_DIR, ...r.split('/')));
  const offenders = [];
  for (const f of walkJs(SRC_DIR)) {
    const r = rel(f);
    if (ALLOW.has(r)) continue;
    lines(f).forEach((line, i) => {
      if (OPT_NAME.test(line)) offenders.push(`${r}:${i + 1}`);
    });
  }
  assert.deepEqual(offenders, [],
    `select 列人名只允许 §4.13 登记的四处例外；新代码请改用 PersonPicker（选名单成员）或先登记例外：\n${offenders.join('\n')}`);
  // 白名单防僵尸：四处若已不再用下拉列人名，须从白名单移除（否则白名单会长期掩盖回潮）
  const stale = [...ALLOW].filter((r) => !lines(join(SRC_DIR, ...r.split('/'))).some((l) => OPT_NAME.test(l)));
  assert.deepEqual(stale, [], `以下文件已不再用下拉列人名，应从 S9 白名单移除：\n${stale.join('\n')}`);
});

// S10（2026-09-14 批次 34，支书实报「涉及人/活动等可能无限增长的表格仍有部分没分页」）
// 判据：分页必须是**引擎级能力**（一处实现、N 处受益），而不是各页各写一版；
//   凡经 renderFilteredList 渲染的表一律分页（禁调用点私自关掉），翻页控件走 .page-btn/.page-num 单一源。
test('S10 分页内置统一引擎（翻页控件单一源；调用点不得私自关掉分页）', () => {
  const src = read(join(SRC_DIR, 'components', 'list-filter.js'));
  assert.match(src, /pageSize:\s*10/, '统一引擎须内置分页缺省 10 条/页');
  assert.match(src, /data-lf-page/, '统一引擎须渲染翻页控件（data-lf-page）');
  assert.match(src, /class="page-btn"|class="page-num/, '翻页控件须走 .page-btn / .page-num 单一源（批次 28）');
  assert.ok(src.includes('if (pages <= 1)'), '页数 ≤1 须不渲染翻页控件（小表零负担）');
  assert.ok(!/chip-accent-on/.test(src), '引擎不得借 .chip-accent-on 表当前页');
  // 调用点不得私自关掉分页：全站 renderFilteredList 调用点零 `pageSize: 0`
  const optOut = [];
  for (const f of walkJs(SRC_DIR)) {
    const text = read(f);
    if (!/renderFilteredList\(/.test(text)) continue;
    text.split(/\r?\n/).forEach((line, i) => {
      if (/pageSize:\s*0\b/.test(line)) optOut.push(`${rel(f)}:${i + 1}`);
    });
  }
  assert.deepEqual(optOut, [], `经统一引擎渲染的表一律分页；如需例外须先在规范里登记：\n${optOut.join('\n')}`);
});

// ── 口径层 ──────────────────────────────────────────────────────────

test('D1 单档口径同源：全站只剩「38px 高 / 13px 字」一套（2026-09-14 批次 33 支书裁定折中值）', () => {
  const css = read(CSS);
  assert.match(css, /\.lf-btn\s*\{[^}]*height:\s*38px/, '.lf-btn 高度须为 38px（单档）');
  assert.match(css, /\.data-table\s*\{[^}]*font-size:\s*0\.8125rem/, '.data-table 字号须与全站正文同（0.8125rem）');
  assert.match(css, /\.data-table\s*\{[^}]*line-height:\s*1\.25rem/, '.data-table 行高须为 1.25rem（13px 正文配 20px 行高）');
  assert.match(css, /\.lf-btn\s*\{[^}]*font-size:\s*0\.8125rem/, '.lf-btn 字号须为 0.8125rem');
  // 输入框档：input.input-flat.text-xs 上下 10px + 行高 16px + 边框 2px = 38px
  assert.match(css, /input\.input-flat\.text-xs\s*\{[^}]*padding-top:\s*10px/, '输入框须为 10px 上内边距（38px 档）');
  assert.match(css, /input\.input-flat\.text-xs\s*\{[^}]*padding-bottom:\s*10px/, '输入框须为 10px 下内边距（38px 档）');
  // 并档断言：旧的「第二档」数值不得回潮（34px 控件 / 12px 表格正文 / 14px 表单控件）
  assert.ok(!/\.lf-btn\s*\{[^}]*height:\s*34px/.test(css), '不得残留 34px 旧档（批次 33 已并档为 38px）');
  assert.ok(!/\.data-table\s*\{[^}]*font-size:\s*0\.75rem/.test(css), '不得残留 12px 表格正文（批次 33 已并为 13px）');
  assert.ok(!/\.input-flat\s*\{[^}]*font-size:\s*0\.875rem/.test(css), '不得残留 14px 表单控件（批次 33 已并为 13px）');
});

// D2（2026-09-14 批次 31；批次 33 并为单档 38px）
// 病灶：S1–S8 与 D1 只比对「CSS 里写的数字」，而实际渲染高度由
//   「内边距 + 行高 + 边框」算出——行高一项原先没显式声明，靠 UA 默认或 Tailwind CDN 的
//   text-* 工具类提供：环境一变（离线、CDN 被挡、裸 input 取继承行高）就退化，
//   同一表单内曾实测出 42 / 43 / 47 三值并存（触发器 43、无 text 类的裸输入框 47）。
//   故把算式本身锁死：五处载体的高度必须由显式行高算出，且等于规范档位。
test('D2 档位算式显式（内边距 + 显式行高 + 边框 = 38），禁靠 UA 或 CDN 工具类给行高', () => {
  // 去注释：说明文字里含「行高」「38px」等字样，不剥掉会被当成声明误读
  const css = read(CSS).replace(/\/\*[\s\S]*?\*\//g, ' ');
  const escRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const bodyOf = (sel) => {
    const m = css.match(new RegExp(`(?:^|[}\\n;])\\s*${escRe(sel)}\\s*\\{([^}]*)\\}`));
    return m ? m[1] : null;
  };
  const decl = (body, prop) => {
    const m = body.match(new RegExp(`(?:^|;)\\s*${prop}\\s*:\\s*([^;]+)`));
    return m ? m[1].trim() : null;
  };
  const num = (v) => {
    const s = String(v).trim();
    const n = parseFloat(s);
    return /rem\b/.test(s) ? Math.round(n * 16) : Math.round(n); // rem 按根字号 16px 折算
  };
  const vpad = (body) => {
    const top = decl(body, 'padding-top');
    const bottom = decl(body, 'padding-bottom');
    if (top && bottom) return [num(top), num(bottom)];
    const sh = decl(body, 'padding');
    if (!sh) return null;
    const parts = sh.split(/\s+/).map(num);
    return [parts[0], parts.length >= 3 ? parts[2] : parts[0]];
  };

  const CASES = [
    ['.input-flat', 38, '表单输入框'],
    ['input.input-flat.text-xs', 38, '筛选行关键词框'],
    ['select.input-flat.text-xs', 38, '原生下拉'],
    ['.cs-trigger.input-flat', 38, '下拉触发器'],
    ['.cs-trigger.input-flat.text-xs', 38, '下拉触发器（带 text-xs 类名）'],
  ];
  const bad = [];
  for (const [sel, want, label] of CASES) {
    const b = bodyOf(sel);
    if (!b) { bad.push(`${sel}（${label}）未在 styles.css 定义`); continue; }
    const lh = decl(b, 'line-height');
    const vp = vpad(b);
    if (!vp) { bad.push(`${sel}（${label}）未声明内边距`); continue; }
    if (!lh) {
      bad.push(`${sel}（${label}）未显式声明 line-height —— 高度将随 UA / CDN 工具类漂移`);
      continue;
    }
    const h = num(lh) + vp[0] + vp[1] + 2; // 边框上下各 1px
    if (h !== want) bad.push(`${sel}（${label}）算式得 ${h}px，应为 ${want}px（内边距 ${vp[0]}/${vp[1]} + 行高 ${num(lh)} + 边框 2）`);
  }
  assert.deepEqual(bad, [], `档位算式须与规范一致，两载体同式：\n${bad.join('\n')}`);
});
