// role: [工程师]+[AI]
// control-font-guard.test.mjs — 「控件上的 9/10/11px 小字」存量回归防线（2026-09-24 美学存量清理批）
//
// 病灶（美学审查实测）：全站 `text-[9px]/[10px]/[11px]` **370 处 / 56 个文件**，其中**直接落在控件上**的
//   **23 处 / 12 个文件**——违反 DESIGN_SYSTEM §4.3「输入组件统一原则」④
//   （原文：「**禁止** `text-[11px]`/`text-[10px]` 控件字号（与规范 Caption 档冲突）」）
//   与「字号 **单档 `0.8125rem`（13px）**」。控件小字是"看起来就用不上"的档位：控件文字是操作入口，
//   11px 在移动端与深色主题下都难读，且同一筛选行/工具条里会与 13px 档并列（并档后只剩一档）。
//
// 本批**不做**「顺手删存量小字」（属另一件事：控件小字往往连带按钮尺寸/布局，须逐处复刻真机核对），
//   只立**回归防线**：
//   T1 新增站点：扫描到基线之外的 (文件, 标签|小字类) ⇒ 红
//   T2 逐文件站点数 ratchet：> 基线 ⇒ 红（存量不得增长）
//   T3 非空转自检：① 抽取口径合成样本（控件命中 / 非控件不命中 / class 跨行命中）；
//                  ② 台账规模自洽 ＋ 空台账零存量（2026-09-26 末批：全站控件小字已清零 ⇒ 台账清空，
//                     「非空转」由数字下限改为更强的「空台账 ⇒ 全站实测须为 0」）；③ 僵尸登记
//                     （基线文件不存在 / 该文件已无小字控件）⇒ 红
//   T4 缩减进度：控件口径与全站口径计数打印
//
// 口径边界（**不得**自行放宽或加严）：
//   · 判红标签＝`<button>` / `<a>` / `<input>` / `<select>`（任务与 §4.3 的控件面）；
//     `<span>`/`<label>`/`<div>` 上的小字（标签、时间戳等附注）**不在判红面**，只计入 T4 的进度口径。
//   · `text-[9px]`：§4.3 ④ 原文只点名 10px / 11px；9px 由「控件字号单档 13px」（§4.3 ② 「禁止自制
//     Tailwind 控件」+ 单档口诀）推得，属同一口径的**下界**。**全站实测 9px 现存 0 处** ⇒ 纳入判红
//     不会产生任何「更严」的存量压制（真机口径见报告）。
//
// 运行：node --test server/test/control-font-guard.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  CTRL_SMALL_BASELINE, CTRL_SMALL_TOTAL_BASELINE, CTRL_SMALL_FILE_BASELINE,
  SMALL_TEXT_TOTAL_BASELINE, SMALL_TEXT_FILE_BASELINE, SMALL_TEXT_BY_VALUE_BASELINE,
} from './style-baseline.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const DOCS = join(ROOT, 'docs');

const EXTS = ['.js', '.mjs', '.css', '.html'];
const SKIP_DIRS = ['vendor'];
/** 判红控件标签（单一源：任务口径 ＝ §4.3 的控件面） */
const CTRL_TAGS = ['button', 'a', 'input', 'select'];
/** 小字类抽取（9/10/11px 三种；§4.3 原文点名 10/11，9px 见文件头口径边界说明） */
const SMALL_RE = /text-\[(9|10|11)px\]/g;
const TAG_RE = new RegExp(`<(${CTRL_TAGS.join('|')})\\b[^>]*>`, 'g');

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

/** 提取某段源码里的控件小字签名：`标签|小字类` → 处数 */
function ctrlSignatures(src) {
  const sig = {};
  let m;
  const re = new RegExp(TAG_RE.source, 'g');
  while ((m = re.exec(src))) {
    const c = /class="([^"]*)"/.exec(m[0]);
    if (!c) continue;
    for (const hit of c[1].match(SMALL_RE) || []) {
      const k = `${m[1]}|${hit}`;
      sig[k] = (sig[k] || 0) + 1;
    }
  }
  return sig;
}

function scan() {
  return scanFiles().map((file) => {
    const src = readFileSync(join(ROOT, file), 'utf8');
    const sig = ctrlSignatures(src);
    const total = Object.values(sig).reduce((a, b) => a + b, 0);
    const all = (src.match(SMALL_RE) || []).length;
    return { file, sig, total, all };
  });
}

// ── T1 新增控件小字站点 ──────────────────────────────────────────────
test(`T1 控件小字回归：基线之外的 (文件, 标签|小字类) 判红（基线 ${CTRL_SMALL_TOTAL_BASELINE} 处 / ${CTRL_SMALL_FILE_BASELINE} 文件）`, () => {
  const offenders = [];
  for (const { file, sig } of scan()) {
    const base = CTRL_SMALL_BASELINE[file];
    if (!base) {
      const k = Object.keys(sig);
      if (k.length) offenders.push(`${file} → 新文件控件不得挂小字类：${k.join(' ')}`);
      continue;
    }
    for (const [key, n] of Object.entries(sig)) {
      const bn = base.sig[key] || 0;
      if (bn === 0) offenders.push(`${file} → 新增控件小字：${key}（§4.3 ④ 禁止 text-[11px]/text-[10px] 控件字号）`);
      else if (n > bn) offenders.push(`${file} → ${key} 由基线 ${bn} 处增至 ${n} 处`);
    }
  }
  assert.deepEqual(offenders, [],
    `控件上出现 DesignSystem 禁止的小字档（控件字号单档 13px，见 DESIGN_SYSTEM §4.3）：\n  ${offenders.join('\n  ')}`);
});

// ── T2 逐文件处数 ratchet ────────────────────────────────────────────
test('T2 处数 ratchet：逐文件控件小字站点数不得高于基线', () => {
  const grow = [];
  for (const { file, total } of scan()) {
    const base = CTRL_SMALL_BASELINE[file];
    if (!base || !total) continue; // 新文件已在 T1 报出
    if (total > base.c) grow.push(`${file} → ${total} 处 > 基线 ${base.c} 处`);
  }
  assert.deepEqual(grow, [], `以下文件控件小字站点数高于基线：\n  ${grow.join('\n  ')}`);
});

// ── T3 非空转自检 ────────────────────────────────────────────────────
test('T3 非空转：抽取口径可用 + 台账规模自洽（空台账 ⇒ 全站须为 0）+ 无僵尸登记', () => {
  // ① 抽取口径正例：控件命中（含 class 属性体，且能取到 class）
  assert.deepEqual(ctrlSignatures('<button class="text-[11px] px-2">a</button>'), { 'button|text-[11px]': 1 },
    '抽取口径失效：控件上的 text-[11px] 未被抽出（守卫会恒真）');
  assert.deepEqual(ctrlSignatures('<a class="x text-[10px]">a</a>'), { 'a|text-[10px]': 1 },
    '抽取口径失效：<a> 上的 text-[10px] 未被抽出');
  // ① 正例：属性顺序在前 / class 前有其它属性同样命中
  assert.deepEqual(ctrlSignatures('<input type="text" class="text-[9px]" value="1">'), { 'input|text-[9px]': 1 },
    '抽取口径失效：属性序在 class 之前时未命中');
  // ① 负例：非控件标签上的小字不计入控件口径
  assert.deepEqual(ctrlSignatures('<span class="text-[11px]">时间戳</span>'), {},
    '抽取口径过宽：<span> 上的小字被当成控件小字');
  assert.deepEqual(ctrlSignatures('<button class="text-xs">正常档</button>'), {},
    '抽取口径过宽：控件上的正常档（text-xs）被误判为小字');
  // ② 台账规模自洽 ＋ 空台账零存量（非空转；2026-09-26 末批：全站控件小字已清零，台账随之清空）
  const files = Object.keys(CTRL_SMALL_BASELINE);
  assert.equal(files.length, CTRL_SMALL_FILE_BASELINE, '基线条目数与声明的文件数不一致（台账被改动须同步声明值）');
  const ctrlNow = scan().reduce((a, r) => a + r.total, 0);
  if (!files.length) {
    // 台账已清空 ⇒ 全站实测也必须为 0；否则是「台账被删空而存量还在」（比数字下限更强的非空转判据）
    assert.equal(ctrlNow, CTRL_SMALL_TOTAL_BASELINE,
      `控件小字台账已删空（声明 ${CTRL_SMALL_FILE_BASELINE} 文件 / ${CTRL_SMALL_TOTAL_BASELINE} 处），但全站实测仍有 ${ctrlNow} 处控件小字（台账被删空 ⇒ 收基线纪律被绕过）`);
  } else {
    assert.ok(CTRL_SMALL_FILE_BASELINE >= 1 && CTRL_SMALL_TOTAL_BASELINE >= 1,
      `台账非空但规模下限被调成 0（实测 ${files.length} 文件 / 声明 ${CTRL_SMALL_FILE_BASELINE}·${CTRL_SMALL_TOTAL_BASELINE}）`);
  }
  // ③ 僵尸登记：基线文件必须存在，且该文件仍应有控件小字站点
  const gone = files.filter((f) => !existsSync(join(ROOT, f)));
  assert.deepEqual(gone, [], `基线条目指向不存在的文件（应从 style-baseline.mjs 移除）：\n  ${gone.join('\n  ')}`);
  const emptied = scan().filter((r) => CTRL_SMALL_BASELINE[r.file] && !r.total).map((r) => r.file);
  assert.deepEqual(emptied, [],
    `以下文件控件小字已清零，应从 style-baseline.mjs 删除该条（收基线）：\n  ${emptied.join('\n  ')}`);
});

// ── T4 缩减进度（只报不判） ──────────────────────────────────────────
test('T4 缩减进度：控件口径与全站口径当前计数', () => {
  const rows = scan();
  const ctrlTotal = rows.reduce((a, r) => a + r.total, 0);
  const ctrlFiles = rows.filter((r) => r.total).length;
  const allTotal = rows.reduce((a, r) => a + r.all, 0);
  const allFiles = rows.filter((r) => r.all).length;
  const byValue = {};
  for (const r of rows) {
    for (const k of Object.keys(r.sig)) {
      const v = k.split('|')[1];
      byValue[v] = (byValue[v] || 0) + r.sig[k];
    }
  }
  const d = (cur, base) => (cur === base ? '持平' : cur < base ? `↓${base - cur}` : `↑${cur - base}`);
  console.log(`[控件小字] 站点 ${ctrlTotal}（基线 ${CTRL_SMALL_TOTAL_BASELINE}，${d(ctrlTotal, CTRL_SMALL_TOTAL_BASELINE)}）`
    + ` · 文件 ${ctrlFiles}（基线 ${CTRL_SMALL_FILE_BASELINE}，${d(ctrlFiles, CTRL_SMALL_FILE_BASELINE)}）`
    + ` · 按值 ${JSON.stringify(byValue)}`);
  console.log(`[全站 text-[9/10/11px]（含非控件落点，仅进度口径）] 处数 ${allTotal}（基线 ${SMALL_TEXT_TOTAL_BASELINE}，${d(allTotal, SMALL_TEXT_TOTAL_BASELINE)}）`
    + ` · 文件 ${allFiles}（基线 ${SMALL_TEXT_FILE_BASELINE}，${d(allFiles, SMALL_TEXT_FILE_BASELINE)}）`
    + ` · 基线按值 ${JSON.stringify(SMALL_TEXT_BY_VALUE_BASELINE)}`);
  console.log('[收基线提示] 清掉存量控件小字后同批删 style-baseline.mjs 对应条目 / 减小 c，进度即前进；不得为变绿补条目。');
});
