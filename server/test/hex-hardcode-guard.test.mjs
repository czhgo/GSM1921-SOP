// role: [工程师]+[AI]
// hex-hardcode-guard.test.mjs — 「硬编码 hex」存量回归防线（2026-09-24 美学存量清理批）
//
// 病灶（美学审查实测）：全站硬编码 hex **2025 处 / 168 个不同值 / 93 个文件**——同一批语义色被反复写死，
//   将来改色（或深色模式对齐）时改不干净。§2.8 早已定「四层分类取色、新增代码禁止硬编码色值」，
//   但**没有任何守卫**——只能靠人记得 ⇒ 存量只会继续长。
//
// 本批**不做**「删存量 hex」（那是另一件事，须逐层改成 var(--*) / 语义类），只立**回归防线**：
//   H1 逐文件 × 值：扫描到基线之外的 (文件, 值) ⇒ 红（= 「现状之外出现新的 hex」）
//   H2 逐文件处数 ratchet：某文件处数 > 基线 ⇒ 红（把已允许的值再复制一份也算新增）
//   H3 非空转自检：① 抽取口径在合成正/负样本上必须命中/不命中（防正则失效恒真）；
//                  ② 基线规模下限（防台账被删减）；③ 僵尸登记（基线文件不存在 / 该文件已无 hex）⇒ 红
//   H4 缩减进度：打印当前处数 / 值 / 文件数与基线对照（只报不判）
//
// 例外台账（逐条给理由，见 EXCEPTIONS）：`docs/help.html`（文档页 + 打印样式）；
//   第三方片段 `docs/assets/vendor/**` 在扫描范围外（gsap / ScrollTrigger / lenis 构建产物）。
//
// 收基线纪律：删存量 hex 后**同一批**更新 style-baseline.mjs（删该值 / 减 c）——进度自动前进；
//   **不得**为变绿而把新值补进基线。
// 运行：node --test server/test/hex-hardcode-guard.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  HEX_BASELINE, HEX_TOTAL_BASELINE, HEX_FILE_BASELINE, HEX_VALUE_BASELINE,
} from './style-baseline.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const DOCS = join(ROOT, 'docs');

/** 扫描后缀（前端应用层 + 样式 + 根页 HTML） */
const EXTS = ['.js', '.mjs', '.css', '.html'];
/** 扫描范围外的目录（第三方构建产物） */
const SKIP_DIRS = ['vendor'];
/**
 * 抽取口径（单一源，与 style-baseline.mjs 生成时同一条）：
 * `#` + 3/4/6/8 位十六进制（CSS 颜色合法长度）+ 右侧词边界；
 * 前置否定 `(?<!&)` 排除 HTML 实体（`&#10003;` 是 ✓，不是色值）。
 */
const HEX_RE = /(?<!&)#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{4}|[0-9a-fA-F]{3})\b/g;

/** 例外台账：逐条给理由（allowNew = 该文件不参与「新增即红」，仍计入缩减进度） */
const EXCEPTIONS = [
  {
    file: 'docs/help.html',
    allowNew: true,
    reason: '帮助页＝文档页（DESIGN_SYSTEM §4.18.1 明确帮助页/关于页不受界面规范约束），自带 doc-card/help-card 样式体系，且含 @media print 打印样式——打印必须显式色值（不能取主题变量）。故该文件只计进度、不因新增判红。',
  },
];

/** 递归收集扫描目标（相对仓库根的 posix 路径） */
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

/** 逐文件抽取 hex（小写） */
function scan() {
  return scanFiles().map((file) => ({
    file,
    hits: readFileSync(join(ROOT, file), 'utf8').match(HEX_RE) || [],
  }));
}

const isAllowNew = (file) => EXCEPTIONS.some((e) => e.file === file && e.allowNew);

// ── H1 新增 (文件, 值) ────────────────────────────────────────────────
test(`H1 硬编码 hex 回归：现状之外的 (文件, 值) 判红（基线 ${HEX_VALUE_BASELINE} 值 / ${HEX_FILE_BASELINE} 文件 / ${HEX_TOTAL_BASELINE} 处）`, () => {
  const offenders = [];
  for (const { file, hits } of scan()) {
    if (!hits.length || isAllowNew(file)) continue;
    const base = HEX_BASELINE[file];
    if (!base) {
      offenders.push(`${file} → 新文件不得硬编码色值：${[...new Set(hits.map((h) => h.toLowerCase()))].join(' ')}`);
      continue;
    }
    const allowed = new Set(base.v);
    const news = [...new Set(hits.map((h) => h.toLowerCase()))].filter((v) => !allowed.has(v));
    if (news.length) {
      offenders.push(`${file} → 新增硬编码 hex：${news.join(' ')}（应取 §2.8 四层语义类 / var(--*) 主题变量）`);
    }
  }
  assert.deepEqual(offenders, [],
    `现状之外出现新的硬编码 hex（新增代码禁止硬编码色值，口径见 DESIGN_SYSTEM §2.8 四层分类）：\n  ${offenders.join('\n  ')}`);
});

// ── H2 逐文件处数 ratchet ────────────────────────────────────────────
test('H2 处数 ratchet：逐文件 hex 处数不得高于基线（同一值复制到同文件也算新增）', () => {
  const grow = [];
  for (const { file, hits } of scan()) {
    if (!hits.length || isAllowNew(file)) continue;
    const base = HEX_BASELINE[file];
    if (!base) continue; // 新文件已由 H1 报出
    if (hits.length > base.c) grow.push(`${file} → ${hits.length} 处 > 基线 ${base.c} 处`);
  }
  assert.deepEqual(grow, [],
    `以下文件硬编码 hex 处数高于基线（收基线后不得再长）：\n  ${grow.join('\n  ')}`);
});

// ── H3 非空转自检 ────────────────────────────────────────────────────
test('H3 非空转：抽取口径可用 + 基线规模达标 + 无僵尸登记', () => {
  // ① 抽取口径正例：3 位 / 6 位 / 8 位各命中
  assert.equal(
    ('#fff;#FFFFFF;color:#fafaf5;border-color:#CE1126FF'.match(HEX_RE) || []).length, 4,
    '抽取口径失效：合成样本里的 3/6/8 位色值未被全部抽出（守卫会恒真）');
  // ① 抽取口径负例：HTML 实体 / 锚点 / 非法长度 / 非十六进制字符 不得命中
  assert.equal(
    ('&#10003; href="#sec-ack" url(#g) #12 #xyz abcdef'.match(HEX_RE) || []).length, 0,
    '抽取口径过宽：HTML 实体（&#10003;）/锚点/非法长度被当成色值');
  // ② 基线规模下限（低于此值说明台账被删减或口径失效；正常批次只会缓慢下降）
  const files = Object.keys(HEX_BASELINE);
  assert.ok(HEX_FILE_BASELINE >= 85 && files.length >= 85, `hex 基线文件数过少（实测 ${files.length} / 声明 ${HEX_FILE_BASELINE}，下限 85）`);
  assert.ok(HEX_TOTAL_BASELINE >= 1700, `hex 基线处数过少（声明 ${HEX_TOTAL_BASELINE}，下限 1700）`);
  assert.ok(HEX_VALUE_BASELINE >= 140, `hex 基线值数过少（声明 ${HEX_VALUE_BASELINE}，下限 140）`);
  assert.equal(files.length, HEX_FILE_BASELINE, '基线条目数与声明的文件数不一致（台账被改动须同步声明值）');
  // ③ 僵尸登记：基线文件必须真实存在，且该文件仍应有 hex 命中
  const gone = files.filter((f) => !existsSync(join(ROOT, f)));
  assert.deepEqual(gone, [], `基线条目指向不存在的文件（应从 style-baseline.mjs 移除）：\n  ${gone.join('\n  ')}`);
  const emptied = scan().filter(({ file, hits }) => HEX_BASELINE[file] && !hits.length).map(({ file }) => file);
  assert.deepEqual(emptied, [],
    `以下文件的硬编码 hex 已清零，应从 style-baseline.mjs 删除该条（收基线）：\n  ${emptied.join('\n  ')}`);
  // ④ 例外台账非空转：每条必须带理由，且文件真实存在
  for (const e of EXCEPTIONS) {
    assert.ok(e.reason && e.reason.length > 20, `例外台账缺理由：${e.file}`);
    assert.ok(existsSync(join(ROOT, e.file)), `例外台账指向不存在的文件：${e.file}`);
  }
});

// ── H4 缩减进度（只报不判） ──────────────────────────────────────────
test('H4 缩减进度：当前存量与基线对照', () => {
  const rows = scan().filter((r) => r.hits.length);
  const total = rows.reduce((a, r) => a + r.hits.length, 0);
  const values = new Set();
  rows.forEach((r) => r.hits.forEach((h) => values.add(h.toLowerCase())));
  const d = (cur, base) => (cur === base ? '持平' : cur < base ? `↓${base - cur}` : `↑${cur - base}`);
  console.log(`[硬编码 hex 存量] 处数 ${total}（基线 ${HEX_TOTAL_BASELINE}，${d(total, HEX_TOTAL_BASELINE)}）`
    + ` · 值 ${values.size}（基线 ${HEX_VALUE_BASELINE}，${d(values.size, HEX_VALUE_BASELINE)}）`
    + ` · 文件 ${rows.length}（基线 ${HEX_FILE_BASELINE}，${d(rows.length, HEX_FILE_BASELINE)}）`);
  const top = rows.sort((a, b) => b.hits.length - a.hits.length).slice(0, 5)
    .map((r) => `${r.file}=${r.hits.length}`).join(' · ');
  console.log(`[存量最重五项] ${top}`);
  console.log('[收基线提示] 删存量后同批删 style-baseline.mjs 对应值 / 减小 c，进度即前进；不得为变绿补条目。');
});
