// role: [工程师]+[AI]
// small-text-guard.test.mjs — 「非控件 9px / 10px 小字」禁止档守卫（2026-09-26 美学存量清理末批）
//
// 病灶（美学审查实测）：全站 `text-[10px]` 存量 28 处 / 12 文件（`text-[9px]` 0 处）。这些**非控件**
//   落点（span/p/div/code 等）此前无判据——`control-font-guard` 只管 `<button>/<a>/<input>/<select>`
//   上的小字；上一批结论是「文档无『非控件小字下限』条款 ⇒ 缺口径，只报不判」。本批把口径定下来。
//
// 口径（据既有事实推导，写进 `content/04_web_design/design-system/DESIGN_SYSTEM.md §3.2`）：
//   · `DESIGN_SYSTEM §3.2 字号层级`表的**最低档**＝ `Overline` = `0.6875rem`（**11px**）——表内**没有**
//     10px / 9px 档；`§4.3 ④` 亦明文「禁用 `text-[11px]`/`text-[10px]` 控件字号（与规范 Caption 档冲突）」，
//     并守「控件字号单档 13px」。⇒ 档位表外的 9px / 10px **无任何档位依据**。
//   · 故本守卫判：**`text-[9px]` 与 `text-[10px]` 一律禁止**（全站上限 0）；`text-[11px]` ＝ 档位表内
//     `Overline` 档，**非控件处合规、不判红**（控件处仍由 `control-font-guard` 判红）。
//
// 与既有守卫的分工（不重叠、不重复判）：
//   · `control-font-guard`：**控件面**的 9/10/11px（`<button>/<a>/<input>/<select>`）⇒ 红线。
//   · 本守卫：**全站任意落点**的 9/10px（含控件面，是更严的下界）⇒ 红线；11px 只计进度不判。
//
// 运行：node --test server/test/small-text-guard.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SMALL_TEXT_TOTAL_BASELINE, SMALL_TEXT_FILE_BASELINE, SMALL_TEXT_BY_VALUE_BASELINE } from './style-baseline.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const DOCS = join(ROOT, 'docs');

const EXTS = ['.js', '.mjs', '.css', '.html'];
const SKIP_DIRS = ['vendor'];
/** 禁止档（档位表外）：9px / 10px。全站上限 = 0 */
const FORBIDDEN = [9, 10];
/** 档位表内最低档：Overline 11px（只计进度、不判红） */
const ALLOWED_FLOOR = 11;
/** 抽取口径（单一源）：`text-[<n>px]` 任意整数 n */
const CLASS_RE = /text-\[(\d+)px\]/g;

/** 递归收集扫描目标（相对仓库根的 posix 路径；与同族守卫同口径） */
function scanFiles() {
  const out = [];
  const walk = (dir) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      if (e.name === '.git' || SKIP_DIRS.includes(e.name)) continue;
      const p = join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (EXTS.some((x) => e.name.endsWith(x))) out.push(relative(ROOT, p).replace(/\\/g, '/'));
    }
  };
  walk(DOCS);
  return out.sort();
}

/** 抽取某段源码里的 `text-[<n>px]` 计数：n（数字）→ 处数 */
export function sizesOf(src) {
  const out = {};
  for (const m of src.matchAll(new RegExp(CLASS_RE.source, 'g'))) {
    const n = Number(m[1]);
    out[n] = (out[n] || 0) + 1;
  }
  return out;
}

function scan() {
  return scanFiles().map((file) => {
    const sizes = sizesOf(readFileSync(join(ROOT, file), 'utf8'));
    return { file, sizes };
  });
}

// ── P1 禁止档：全站 text-[9px] / text-[10px] 必须为 0 ─────────────────
test('P1 禁止档回归：全站不得出现 text-[9px] / text-[10px]（档位表最低档＝Overline 11px）', () => {
  const offenders = [];
  for (const { file, sizes } of scan()) {
    for (const n of FORBIDDEN) {
      if (sizes[n]) offenders.push(`${file} → text-[${n}px] ×${sizes[n]}`);
    }
  }
  assert.deepEqual(offenders, [],
    `出现 DesignSystem 档位表之外的禁止档小字（§3.2 最低档 = Overline 11px；§4.3 ④ 禁用 10px/11px 控件字号）：\n  ${offenders.join('\n  ')}\n  处置：改到档位表内的档位（正文 13px / Caption 12px / Overline 11px）。`);
});

// ── P2 非空转自检（抽取口径可用 ＋ 扫描面非空）─────────────────────────
test('P2 非空转：抽取口径正/负例 ＋ 扫描面规模下限 ＋ 反例实测', () => {
  // ① 正例：三种档位各命中（防「抽取器恒空 ⇒ 守卫恒绿」）
  assert.deepEqual(sizesOf('class="text-[9px] text-[10px] text-[11px]"'), { 9: 1, 10: 1, 11: 1 },
    '抽取口径失效：9/10/11px 未被全部抽出（守卫会恒真）');
  // ② 负例：档位表内的档位 / 非任意值类 / 非法长度 不得命中
  assert.deepEqual(sizesOf('text-[12px] text-[13px] text-xs text-[100px] text-[10]'), { 12: 1, 13: 1, 100: 1 },
    '抽取口径过宽：把档位表内的档或非 px 任意值当成目标（text-[100px] 会被抽出但不会误判为禁止档）');
  assert.deepEqual(sizesOf('text-[10px]'), { 10: 1 }, '抽取口径失效：单处 10px 未命中');
  // ③ 反例实测（真机负例）：把真实禁止档样本喂进同一抽取器 ⇒ 必须被 P1 判红（此处验抽取，P1 用同一器扫描真源码）
  const fake = 'const x = `<span class="text-[10px] text-gray-500">反例样本</span>`;';
  const n = Object.entries(sizesOf(fake)).filter(([k]) => FORBIDDEN.includes(Number(k)));
  assert.equal(n.reduce((a, [, c]) => a + c, 0), 1, '反例实测失败：合成源码里的 text-[10px] 未被禁止档口径命中');
  // ④ 扫描面非空（防「扫描范围被削成空目录 ⇒ P1 恒绿」）
  const rows = scan();
  const files = rows.length;
  const total11 = rows.reduce((a, r) => a + (r.sizes[ALLOWED_FLOOR] || 0), 0);
  assert.ok(files >= 80, `扫描面过窄（实测 ${files} 文件，下限 80）——P1 可能因范围被削而恒绿`);
  assert.ok(total11 >= 200, `档位表内 Overline 档（11px）实测过少（${total11} 处，下限 200）——抽取口径可能失效`);
});

// ── P3 缩减进度（只报不判）─────────────────────────────────────────
test('P3 缩减进度：全站 9/10/11px 按档计数（9/10 禁止档须为 0；11px 只报）', () => {
  const rows = scan();
  const bySize = {};
  for (const r of rows) {
    for (const [n, c] of Object.entries(r.sizes)) {
      // 只统计 9/10/11 三个小字档（12px+ 属 Caption/正文档，不在本口径内）
      if (FORBIDDEN.includes(Number(n)) || Number(n) === ALLOWED_FLOOR) bySize[n] = (bySize[n] || 0) + c;
    }
  }
  const total = Object.values(bySize).reduce((a, b) => a + b, 0);
  const files = rows.filter((r) => Object.keys(r.sizes).some((n) => FORBIDDEN.includes(Number(n)) || Number(n) === ALLOWED_FLOOR)).length;
  const d = (cur, base) => (cur === base ? '持平' : cur < base ? `↓${base - cur}` : `↑${cur - base}`);
  console.log(`[非控件小字口径] 9px=${bySize[9] || 0} · 10px=${bySize[10] || 0}（禁止档，上限 0）`
    + ` · 11px=${bySize[11] || 0}（档位表内 Overline 档，合规）`);
  console.log(`[全站 text-[9/10/11px]（含非控件落点，仅进度口径）] 处数 ${total}（基线 ${SMALL_TEXT_TOTAL_BASELINE}，${d(total, SMALL_TEXT_TOTAL_BASELINE)}）`
    + ` · 文件 ${files}（基线 ${SMALL_TEXT_FILE_BASELINE}，${d(files, SMALL_TEXT_FILE_BASELINE)}）`
    + ` · 基线按值 ${JSON.stringify(SMALL_TEXT_BY_VALUE_BASELINE)}`);
  console.log('[口径单一源] DESIGN_SYSTEM §3.2 字号层级（最低档 Overline 11px）＋ §4.3 ④（禁用 10px/11px 控件字号）；'
    + '禁止档清存量后**不得**把新档补进基线。');
});
