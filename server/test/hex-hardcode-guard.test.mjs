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
// 例外台账（逐条给理由，见 EXCEPTIONS）：`docs/help.html`（文档页自带 `doc-*` 调色板）·
//   `docs/src/about.css`（关于页文档页自带 `--ab-*` 暖纸色板）；第三方片段 `docs/assets/vendor/**`
//   在扫描范围外（gsap / ScrollTrigger / lenis 构建产物）。
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
  HEX_BASELINE, HEX_TOTAL_BASELINE, HEX_FILE_BASELINE, HEX_VALUE_BASELINE, HEX_MOVE_LEDGER,
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
    reason: '帮助页＝文档页（DESIGN_SYSTEM §4.18.1 明确 help.html/about.html 是文档页、不受界面规范约束），页内自带 `<style>` 文档样式体系（doc-card / help-card / help-toc）+ 大量内联 style 文档标注；其硬编码 hex 属该文件自带的文档调色板（深色态由 `styles.css` 的 `html.theme-dark .doc-*` 段显式覆盖），非工作台界面配色。故该文件只计进度、不因新增判红。⚠ 订正（2026-09-26 末批实读）：本文件**不含** `@media print`（全站打印样式在 `docs/src/styles.css:4313`，且该段用的是 `white` 关键字与 `var(--neutral-200)`，**无需**显式 hex）——旧理由里的「含 @media print 打印样式」与实况不符，此处据实改写。',
  },
  {
    file: 'docs/src/about.css',
    allowNew: true,
    reason: '关于页＝文档页（DESIGN_SYSTEM §4.18.1 同条豁免）。该文件自带**作用域隔离**的 `--ab-*` 暖纸印刷色板（`.ab-about{--ab-paper-0:#FAF8F4;…--ab-red:#CE1126;--ab-gold:#C9A227}`，明注「不影响全局/help 页」）——其中与全局 `:root` 等值的少数几处（如 `#CE1126`）**正是它自己的令牌定义**，其余 46 处为暖纸 / 墨色专有色与深色态字面量，**无全局同名令牌**（§2.8 口径「不许新造色」⇒ 不可清）。故整文件进例外，只计进度、不因新增判红。',
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

/** hex 值形态（与抽取口径同源；小写） */
const HEX_VAL_RE = /^#(?:[0-9a-f]{8}|[0-9a-f]{6}|[0-9a-f]{4}|[0-9a-f]{3})$/;

/**
 * 搬移例外台账的**校验器**（纯函数，便于用合成 ctx 做非空转自检）。
 * ctx = { exists(file), valuesOf(file)→去重小写值数组, distinctValues()→全站 distinct 值数, valueCeiling→存量起点 }
 * 返回 problems 数组（空＝合法）。
 */
export function validateMoveLedger(entries, ctx) {
  const problems = [];
  const seen = new Set();
  for (const e of entries) {
    const id = e.id || `${e.from || '?'} → ${(e.to || []).join(' + ') || '?'}`;
    if (seen.has(id)) problems.push(`台账条目重复：${id}`);
    seen.add(id);
    if (!e.from || !Array.isArray(e.to) || !e.to.length) { problems.push(`${id}：缺 from / to`); continue; }
    if (!ctx.exists(e.from)) problems.push(`${id}：from 文件不存在（${e.from}）`);
    for (const t of e.to) if (!ctx.exists(t)) problems.push(`${id}：to 文件不存在（${t}）`);
    if (!e.reason || String(e.reason).length < 20) problems.push(`${id}：缺理由（≥20 字，说明为什么这算搬移）`);
    const values = (e.values || []).map((v) => String(v).toLowerCase());
    const fromValues = (e.fromValues || []).map((v) => String(v).toLowerCase());
    if (!values.length) problems.push(`${id}：values 为空（没有申报搬走的任何值）`);
    if (new Set(values).size !== values.length) problems.push(`${id}：values 有重复`);
    if (new Set(fromValues).size !== fromValues.length) problems.push(`${id}：fromValues 有重复`);
    for (const v of [...values, ...fromValues]) if (!HEX_VAL_RE.test(v)) problems.push(`${id}：非法色值 ${v}（须 3/4/6/8 位小写 hex）`);
    // ② 值集合不得新增：搬走的值必须来自旧文件的值集（不许借搬移加深色）
    const brand = values.filter((v) => !fromValues.includes(v));
    if (brand.length) problems.push(`${id}：搬移值不在 fromValues 里（借搬移加深色）：${brand.join(' ')}`);
    // ① 逐值对照可核（当前源码）：搬入成立、搬出成立
    const toVals = new Set(e.to.flatMap((t) => ctx.valuesOf(t)));
    const fromNow = new Set(ctx.valuesOf(e.from));
    const notIn = values.filter((v) => !toVals.has(v));
    if (notIn.length) problems.push(`${id}：申报的值未出现在 to 文件里（搬入未发生 / 值写错）：${notIn.join(' ')}`);
    const stillIn = values.filter((v) => fromNow.has(v));
    if (stillIn.length) problems.push(`${id}：申报的值仍留在 from 文件里（是复制而非搬移）：${stillIn.join(' ')}`);
    // ③ to 文件里不得出现「既非其原有允许值、也非从 from 搬来」的值（不只是搬家）
    for (const t of e.to) {
      const own = new Set(ctx.baselineValuesOf(t));
      const extra = [...new Set(ctx.valuesOf(t))].filter((v) => !own.has(v) && !fromValues.includes(v));
      if (extra.length) problems.push(`${id}：to 文件 ${t} 含「原有之外且非搬移」的值（不只是搬家）：${extra.join(' ')}`);
    }
  }
  // ③ 总量不得上升（全站 distinct 值数 ≤ 存量起点）
  if (typeof ctx.distinctValues === 'function' && typeof ctx.valueCeiling === 'number'
    && ctx.distinctValues() > ctx.valueCeiling) {
    problems.push(`搬移后全站 distinct 色值数 ${ctx.distinctValues()} > 存量起点 ${ctx.valueCeiling}（总量只能降，不得升）`);
  }
  return problems;
}

/**
 * 搬移例外（2026-09-25 支书裁定「开搬移例外」）：某文件**被声明为搬入方**时，其 `values` 里点名的值视为
 * 「从别处搬来」而非「新增」⇒ H1 不判红。**只放宽声明点名的 (文件, 值)**，其余一律照旧（见 H5 的逐条机检）。
 */
const movedInto = (file) => {
  const s = new Set();
  for (const e of HEX_MOVE_LEDGER) if ((e.to || []).includes(file)) (e.values || []).forEach((v) => s.add(String(v).toLowerCase()));
  return s;
};

// ── H1 新增 (文件, 值) ────────────────────────────────────────────────
test(`H1 硬编码 hex 回归：现状之外的 (文件, 值) 判红（基线 ${HEX_VALUE_BASELINE} 值 / ${HEX_FILE_BASELINE} 文件 / ${HEX_TOTAL_BASELINE} 处）`, () => {
  const offenders = [];
  for (const { file, hits } of scan()) {
    if (!hits.length || isAllowNew(file)) continue;
    const moved = movedInto(file);
    const base = HEX_BASELINE[file];
    if (!base) {
      const news = [...new Set(hits.map((h) => h.toLowerCase()))].filter((v) => !moved.has(v));
      if (news.length) offenders.push(`${file} → 新文件不得硬编码色值（未声明搬移的值）：${news.join(' ')}`);
      continue;
    }
    const allowed = new Set([...base.v, ...moved]);
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
  // ⚠ 2026-09-28 颜色存量批随收基线**下调** 85→80：`#C8102E`→`var(--party-red)` 后 9 个文件 hex 清零、
  //   条目按纪律删除（同日 H3 僵尸检查也强制删）⇒ 声明文件数 90→81，防呆下限同批下沉。
  //   这是「下限随存量对齐」、非削弱判据：真正判红的是 H1（新增值）/ H2（处数上涨）/ 下方僵尸登记。
  const files = Object.keys(HEX_BASELINE);
  assert.ok(HEX_FILE_BASELINE >= 80 && files.length >= 80, `hex 基线文件数过少（实测 ${files.length} / 声明 ${HEX_FILE_BASELINE}，下限 80）`);
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

// ── H5 搬移例外台账（2026-09-25 支书裁定「开搬移例外」） ──────────────────
// 机制（为什么要有）：文件搬移 / 拆分会让颜色从 A 移到 B；逐文件 ratchet 会把「搬到新文件」判成「新文件新增
//   hardcode」。故开此例外——但**必须人工声明 ＋ 逐值对照**，守卫**绝不自动放宽**（自动放宽＝取消 ratchet）。
// 判据：见 style-baseline.mjs::HEX_MOVE_LEDGER 头注的 ①②③④；本用例落成机检，另以合成 ctx 做非空转自检。
test(`H5 搬移例外台账：逐值对照 ＋ 不许借搬移加深色 ＋ 总量不得升（台账 ${HEX_MOVE_LEDGER.length} 条）`, () => {
  // 真实 ctx：值集/存在性/全站 distinct 都从当前源码取
  const SCAN0 = scan();
  const valuesOf = (file) => {
    const r = SCAN0.find((x) => x.file === file);
    return r ? [...new Set(r.hits.map((h) => h.toLowerCase()))] : [];
  };
  const allValues = new Set();
  SCAN0.forEach((r) => r.hits.forEach((h) => allValues.add(h.toLowerCase())));
  const ctx = {
    exists: (f) => existsSync(join(ROOT, f)),
    valuesOf,
    baselineValuesOf: (f) => (HEX_BASELINE[f]?.v || []).map((v) => v.toLowerCase()),
    distinctValues: () => allValues.size,
    valueCeiling: HEX_VALUE_BASELINE,
  };
  const problems = validateMoveLedger(HEX_MOVE_LEDGER, ctx);
  assert.deepEqual(problems, [], `搬移例外台账不成立（逐值对照 / 不得加深色 / 总量不得升）：\n  ${problems.join('\n  ')}`);

  // ── 非空转自检（合成 ctx：合法搬移判绿、四种违规判红；防「校验器写空」恒真）──
  const mkCtx = (map, distinct = 2, ceiling = 168, baseMap = {}) => ({
    exists: () => true,
    valuesOf: (f) => (map[f] || []).map((v) => v.toLowerCase()),
    baselineValuesOf: (f) => ((baseMap[f] ?? map[f] ?? [])).map((v) => v.toLowerCase()),
    distinctValues: () => distinct,
    valueCeiling: ceiling,
  });
  const reason = '文件拆分：旧文件的值整体搬到新文件，值集不变';
  // 正例：合法搬移（值已不在 from、已出现在 to、to 值集 ⊆ fromValues）⇒ 绿
  assert.deepEqual(validateMoveLedger(
    [{ from: 'a.js', to: ['b.js'], values: ['#ce1126'], fromValues: ['#ce1126', '#fff'], reason }],
    mkCtx({ 'a.js': ['#fff'], 'b.js': ['#ce1126'] })), [], '非空转失效：合法搬移没判绿');
  // 负例①：复制而非搬移（值仍留在 from）⇒ 红
  assert.ok(validateMoveLedger(
    [{ from: 'a.js', to: ['b.js'], values: ['#ce1126'], fromValues: ['#ce1126', '#fff'], reason }],
    mkCtx({ 'a.js': ['#ce1126', '#fff'], 'b.js': ['#ce1126'] })).some((p) => p.includes('仍留在 from')),
    '非空转失效：复制（未搬出）没被校验器判出');
  // 负例②：借搬移加深色（to 里出现「原有之外且非搬移」的新值）⇒ 红
  assert.ok(validateMoveLedger(
    [{ from: 'a.js', to: ['b.js'], values: ['#ce1126'], fromValues: ['#ce1126', '#fff'], reason }],
    mkCtx({ 'a.js': ['#fff'], 'b.js': ['#ce1126', '#123456'] }, 2, 168, { 'a.js': ['#fff'], 'b.js': ['#ce1126'] }))
    .some((p) => p.includes('不只是搬家')),
    '非空转失效：借搬移加深色没被校验器判出');
  // 负例③：申报值不在 fromValues 里（值集合新增）⇒ 红
  assert.ok(validateMoveLedger(
    [{ from: 'a.js', to: ['b.js'], values: ['#123456'], fromValues: ['#fff'], reason }],
    mkCtx({ 'a.js': [], 'b.js': ['#123456'] })).some((p) => p.includes('借搬移加深色')),
    '非空转失效：搬移值不在 fromValues 里没被校验器判出');
  // 负例④：缺理由 / 总量上升 ⇒ 红
  assert.ok(validateMoveLedger(
    [{ from: 'a.js', to: ['b.js'], values: ['#fff'], fromValues: ['#fff'], reason: '短' }],
    mkCtx({ 'a.js': [], 'b.js': ['#fff'] })).some((p) => p.includes('缺理由')),
    '非空转失效：缺理由没被校验器判出');
  assert.ok(validateMoveLedger(
    [{ from: 'a.js', to: ['b.js'], values: ['#fff'], fromValues: ['#fff'], reason }],
    mkCtx({ 'a.js': [], 'b.js': ['#fff'] }, 200, 168)).some((p) => p.includes('不得升')),
    '非空转失效：总量上升没被校验器判出');
});
