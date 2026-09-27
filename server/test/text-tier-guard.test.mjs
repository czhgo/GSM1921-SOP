// role: [工程师]+[AI]
// text-tier-guard.test.mjs — 「段落/导语不得用标签档（11px）」档位-角色一致性守卫（2026-09-27 文本档位统一批）
//
// 来源（支书实报，逐字）：「目前 UI 设计上，我认为**完全存在着风格不统一的问题**……有的字大，有的字小，
//   有的行距宽，有的窄。有的看起来更『方』『硬』，有的看起来『圆』『软』。我认为一定要按照标准去统一！！」
//   真机量测（7 台 × 全部 tab，v=20260924a）证实：**同一语义层在同一 tab 内取了不同档**——「党小组与活动」
//   tab 的卡片导语既出现 `text-[11px]`（6 处 `<p>`）又出现 `text-xs`（其余说明段），且因 `text-[11px]` 是
//   任意值类**不携行高**，其实测行高 16.5px、而 `text-xs` 携固定行高 16px ⇒ 同一页同层文字**字号与行距双双不一致**。
//
// 口径（据既有事实推导，写进 `content/04_web_design/design-system/DESIGN_SYSTEM.md §3.2.2`）：
//   · §3.2 档位表把 `Overline`（11px）定为「**分类标签**」档——同一行明写 `font-weight: 600` +
//     `letter-spacing: 0.12em` + 大写；§3.2.1 又把「`text-[11px]` 非控件落点」直接定义为「＝本表 Overline 档」。
//   · ⇒ **11px 只在「标签形态」合法**（标签、分类小标、侧栏组名…）；**`<p>` 是说明/导语段落**，属正文档，
//     应取 Caption 12px 起（`text-xs`）——把标签档当段落用，就是本批要堵的「同层不同档」。
//   · 9px / 10px：§3.2 档位表内**根本没有**这两档（最低档＝Overline 11px），一律禁止（与 `small-text-guard` 同口径）。
//
// 判据（**单一源＝`<p>` + `text-[9|10|11]px` 同标签共现**）：
//   T1 新增站点：扫描到 `<p … text-[11px]>` 而基线里没有该 (文件, 值) ⇒ 红；9/10px 全站上限 0 ⇒ 红
//   T2 逐文件处数 ratchet：> 基线 ⇒ 红（存量不得增长）
//   T3 非空转自检：① 抽取口径正/负例（`<p>` 命中 / 非 `<p>` 不命中 / `<pre>` 不得误命中）；
//                  ② 台账规模自洽（条目数 = 声明数，处数 = 声明数）；③ 僵尸登记（基线文件不存在 / 已清零）⇒ 红
//   T4 缩减进度（只报不判）：`<p>` 口径与全站口径计数打印
//
// 覆盖边界（如实标注）：本守卫判的是**可机检的那一半**——`<p>`（段落即说明/导语，形态无歧义）。
//   `<span>`/`<div>` 上的 11px 既可能是标签（合法 Overline 形态）也可能是附注（应 12px），**机器判不了**，
//   故不计入判红面，只进 T4 进度口径。文字**颜色/字号以外的档位（行高/字重/圆角/阴影）**由
//   `DESIGN_SYSTEM.md §3.2.2 / §4.19` 的档位表做人工口径，本守卫不越界假装覆盖。
//
// 收基线纪律：改准某文件后**同一批**更新 `style-baseline.mjs`（删该值 / 减 c），进度自动前进；
//   **不得**为变绿而把新值补进基线。
// 运行：node --test server/test/text-tier-guard.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  P_TEXT_TIER_BASELINE, P_TEXT_TIER_TOTAL_BASELINE, P_TEXT_TIER_FILE_BASELINE, P_TEXT_TIER_BY_VALUE_BASELINE,
} from './style-baseline.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const DOCS = join(ROOT, 'docs');

const EXTS = ['.js', '.mjs', '.css', '.html'];
const SKIP_DIRS = ['vendor'];
/** 禁止档（档位表外，与 small-text-guard 同口径） */
const FORBIDDEN = [9, 10];
/** 标签档（Overline 11px）——段落不得使用，只作存量台账 */
const LABEL_TIER = 11;
/** 抽取口径（单一源）：`<p>` 标签内 class 属性体里出现 `text-[9|10|11]px`；`<p\b` 不误命中 `<pre>` / `<path>` */
const PARA_TIER_RE = /<p\b[^>]*class=["'][^"']*text-\[(9|10|11)px\]/g;

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

/** 抽取某段源码里「`<p>` 上 9/10/11px」的计数：px → 处数（导出便于非空转自检） */
export function paraTiersOf(src) {
  const out = {};
  for (const m of src.matchAll(new RegExp(PARA_TIER_RE.source, 'g'))) {
    const n = Number(m[1]);
    out[n] = (out[n] || 0) + 1;
  }
  return out;
}

function scan() {
  return scanFiles().map((file) => {
    const src = readFileSync(join(ROOT, file), 'utf8');
    const tiers = paraTiersOf(src);
    const total = Object.values(tiers).reduce((a, b) => a + b, 0);
    return { file, tiers, total };
  });
}

// ── T1 新增站点 / 禁止档 ─────────────────────────────────────────────
test(`T1 段落档位回归：` + '`<p>` 上档位表外的 9/10px 判红；11px 基线之外新增判红'
  + `（基线 ${P_TEXT_TIER_TOTAL_BASELINE} 处 / ${P_TEXT_TIER_FILE_BASELINE} 文件）`, () => {
  const offenders = [];
  for (const { file, tiers } of scan()) {
    for (const n of FORBIDDEN) {
      if (tiers[n]) offenders.push(`${file} → <p> 出现 text-[${n}px] ×${tiers[n]}（档位表外，最低档＝Overline 11px）`);
    }
    const base = P_TEXT_TIER_BASELINE[file];
    if (!base) {
      if (tiers[LABEL_TIER]) offenders.push(`${file} → 新文件不得在 <p> 上用 text-[${LABEL_TIER}px]（段落应取 Caption 12px＝text-xs；11px 是标签档）`);
      continue;
    }
    if ((tiers[LABEL_TIER] || 0) > base.c) {
      offenders.push(`${file} → <p> 的 text-[${LABEL_TIER}px] 由基线 ${base.c} 处增至 ${tiers[LABEL_TIER]} 处`);
    }
  }
  assert.deepEqual(offenders, [],
    `段落（<p>）用了「标签档」字号（11px 属 Overline 标签档，段落应 Caption 12px；口径见 DESIGN_SYSTEM §3.2.2）：\n  ${offenders.join('\n  ')}`);
});

// ── T2 逐文件处数 ratchet ────────────────────────────────────────────
test('T2 处数 ratchet：逐文件 <p> 的 11px 站点数不得高于基线', () => {
  const grow = [];
  for (const { file, total } of scan()) {
    const base = P_TEXT_TIER_BASELINE[file];
    if (!base) continue; // 新文件已在 T1 报出
    if (total > base.c) grow.push(`${file} → ${total} 处 > 基线 ${base.c} 处`);
  }
  assert.deepEqual(grow, [], `以下文件段落档位站点数高于基线：\n  ${grow.join('\n  ')}`);
});

// ── T3 非空转自检 ────────────────────────────────────────────────────
test('T3 非空转：抽取口径正/负例 ＋ 台账规模自洽 ＋ 无僵尸登记', () => {
  // ① 抽取口径正例：`<p>` 命中（含 class 在属性序中间、单双引号）
  assert.deepEqual(paraTiersOf('<p class="text-[11px] text-gray-500">说明</p>'), { 11: 1 },
    '抽取口径失效：<p> 上的 text-[11px] 未被抽出（守卫会恒真）');
  assert.deepEqual(paraTiersOf("<p class='text-[10px]'>a</p>"), { 10: 1 },
    '抽取口径失效：单引号 class 未命中');
  assert.deepEqual(paraTiersOf('<p id="x" class="mb-1 text-[9px]">a</p>'), { 9: 1 },
    '抽取口径失效：class 前有其它属性时未命中');
  // ① 负例：非 `<p>` 标签不命中（标签档留待 T4 只报）；`<pre>` / `<path>` 不得误命中
  assert.deepEqual(paraTiersOf('<span class="text-[11px] font-semibold">工作台</span>'), {},
    '抽取口径过宽：<span> 上的 11px（合法 Overline 形态）被当成段落档');
  assert.deepEqual(paraTiersOf('<pre class="text-[11px]">x</pre>'), {},
    '抽取口径过宽：<pre> 被 <p\\b 误命中');
  assert.deepEqual(paraTiersOf('<path class="text-[11px]" d="M0 0"/>'), {},
    '抽取口径过宽：<path> 被误命中');
  assert.deepEqual(paraTiersOf('<p class="text-xs text-gray-500">正常档</p>'), {},
    '抽取口径过宽：段落上的正常档（text-xs）被误判为标签档');
  // ② 台账规模自洽（非空转；防「台账被删空/改坏」）
  const files = Object.keys(P_TEXT_TIER_BASELINE);
  assert.equal(files.length, P_TEXT_TIER_FILE_BASELINE, '基线条目数与声明的文件数不一致（台账被改动须同步声明值）');
  const declared = Object.values(P_TEXT_TIER_BASELINE).reduce((a, b) => a + b.c, 0);
  assert.equal(declared, P_TEXT_TIER_TOTAL_BASELINE, '基线条目处数之和与声明的总处数不一致（台账被改动须同步声明值）');
  assert.ok(P_TEXT_TIER_FILE_BASELINE >= 1 && P_TEXT_TIER_TOTAL_BASELINE >= 1,
    `台账规模下限被调成 0（实测 ${files.length} 文件 / 声明 ${P_TEXT_TIER_FILE_BASELINE}·${P_TEXT_TIER_TOTAL_BASELINE}）`);
  // ③ 僵尸登记：基线文件必须存在，且该文件仍应有段落档站点
  const gone = files.filter((f) => !existsSync(join(ROOT, f)));
  assert.deepEqual(gone, [], `基线条目指向不存在的文件（应从 style-baseline.mjs 移除）：\n  ${gone.join('\n  ')}`);
  const emptied = scan().filter((r) => P_TEXT_TIER_BASELINE[r.file] && !r.total).map((r) => r.file);
  assert.deepEqual(emptied, [],
    `以下文件段落档已清零，应从 style-baseline.mjs 删除该条（收基线）：\n  ${emptied.join('\n  ')}`);
  // ③ 值集不得越出 {11}
  for (const [f, b] of Object.entries(P_TEXT_TIER_BASELINE)) {
    for (const v of b.v) assert.ok(v === LABEL_TIER, `${f}：基线值 ${v} 不是标签档 11（存量只应剩 11px）`);
  }
});

// ── T4 缩减进度（只报不判） ──────────────────────────────────────────
test('T4 缩减进度：段落口径与全站 9/10/11px 口径当前计数', () => {
  const rows = scan();
  const paraTotal = rows.reduce((a, r) => a + r.total, 0);
  const paraFiles = rows.filter((r) => r.total).length;
  const byValue = {};
  for (const r of rows) for (const [n, c] of Object.entries(r.tiers)) byValue[n] = (byValue[n] || 0) + c;
  const all = (src) => (src.match(/text-\[(9|10|11)px\]/g) || []).length;
  let siteTotal = 0;
  let siteFiles = 0;
  for (const f of scanFiles()) {
    const n = all(readFileSync(join(ROOT, f), 'utf8'));
    if (n) { siteTotal += n; siteFiles += 1; }
  }
  const d = (cur, base) => (cur === base ? '持平' : cur < base ? `↓${base - cur}` : `↑${cur - base}`);
  console.log(`[段落档位（<p>）] 站点 ${paraTotal}（基线 ${P_TEXT_TIER_TOTAL_BASELINE}，${d(paraTotal, P_TEXT_TIER_TOTAL_BASELINE)}）`
    + ` · 文件 ${paraFiles}（基线 ${P_TEXT_TIER_FILE_BASELINE}，${d(paraFiles, P_TEXT_TIER_FILE_BASELINE)}）`
    + ` · 按值 ${JSON.stringify(byValue)}（基线 ${JSON.stringify(P_TEXT_TIER_BY_VALUE_BASELINE)}）`);
  console.log(`[全站 text-[9/10/11px]（含 <span>/<div> 标签落点，仅进度口径）] 处数 ${siteTotal} · 文件 ${siteFiles}`);
  console.log('[口径单一源] DESIGN_SYSTEM §3.2 档位表（Overline 11px＝标签档）＋ §3.2.2（段落/导语＝Caption 12px 起）；'
    + '9/10px 为档位表外禁止档。收基线后不得把新值补进基线。');
});
