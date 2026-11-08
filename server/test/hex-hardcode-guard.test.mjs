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
import { ACCENT_COLORS } from '../../docs/src/core/domain/constants.js?v=20261108b';

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
    allowNew: false,
    reason: '帮助页＝文档页（DESIGN_SYSTEM §4.18.1 明确 help.html/about.html 是文档页），页内自带 `<style>` 文档样式体系与内联 style。2026-11-03 批次 533（B-522-2）已把可令牌化的 365 处改为 `var(--*)`（532 → 167 处）；剩余 167 处为徽标三联/二联、文档页暖纸色、角色色与 3 处渐变，**无全局同名令牌**，不得新造色。故本文件从「只计进度」改为**只减不增**：新增值由 H1 判红、处数上涨由 H2 判红，收基线时同批下调 `style-baseline.mjs::HEX_BASELINE` 的 `c` 与 `v`。',
  },
  {
    file: 'docs/src/about.css',
    allowNew: false,
    reason: '关于页＝文档页（DESIGN_SYSTEM §4.18.1 同条豁免）。该文件自带**作用域隔离**的 `--ab-*` 暖纸印刷色板（`.ab-about{--ab-paper-0:#FAF8F4;…--ab-red:#CE1126;--ab-gold:#C9A227}`，明注「不影响全局/help 页」）——其中与全局 `:root` 等值的少数几处（如 `#CE1126`）**正是它自己的令牌定义**，其余为暖纸 / 墨色专有色与深色态字面量，**无全局同名令牌**（§2.8 口径「不许新造色」⇒ 不可清）。2026-11-04 批次 534（spec unify-ui-signals Task 5.3）：About 是冻结件（`about-freeze-guard` 整文件哈希锁定），内容一字不改；本文件从「只计进度」改为**只减不增**——新增值由 H1 判红、处数上涨由 H2 判红，收基线时同批下调 `style-baseline.mjs::HEX_BASELINE` 的 `c` 与 `v`。',
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

/** `<meta name="theme-color">` 的值必须是字面量（浏览器不解析 `var()`），单列由 H6 校验；
 *   它不是「界面配色硬编码」，故在 H1/H2 口径里先剥离，避免把同一语义色按页面数重复计数。 */
const THEME_COLOR_META_RE = /<meta\s+name=["']theme-color["'][^>]*>/gi;
const stripThemeColorMeta = (text) => text.replace(THEME_COLOR_META_RE, '');

/** 逐文件抽取 hex（小写；theme-color 元信息先剥离） */
function scan() {
  return scanFiles().map((file) => ({
    file,
    hits: stripThemeColorMeta(readFileSync(join(ROOT, file), 'utf8')).match(HEX_RE) || [],
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
  // ⚠ 2026-09-28 色彩二分批再随存量对齐：删 `--app-accent*` 等硬编码兜底后 `docs/src/services/governance/issues.js`
  //   hex 清零 ⇒ 声明文件数 81→80，防呆下限**保持 80**（＝当前存量；**未放宽**——真正判红的是 H1（新增值）/
  //   H2（处数上涨）/ 下方僵尸登记，本下限只是「防台账被删空」的二级防呆）。
  // ⚠ 2026-09-28 组织台「成员流动」拆 tab 批（R10）：`org/roster-tab.js` 的两处 `#cbd5e1` 随代码**整体搬入**
  //   新文件 `org/member-flow-tab.js`（`HEX_MOVE_LEDGER` 逐值对照，H5）⇒ 按收基线纪律删该文件条目、文件数
  //   声明 80→79 ⇒ 本「防呆下限」随实况由 80 降到 **79**（与声明同值）。**不是放宽**：真正的判红项是 H1（新增值）/
  //   H2（处数上涨）/ 下方僵尸登记——本下限只防「台账被悄悄删空」，它随存量同步下沉。
  const files = Object.keys(HEX_BASELINE);
  // ⚠ 2026-10-01 批次 321：下限随 `HEX_FILE_BASELINE` 同步下沉 77 → 76（`org/development-tab.js` 随
  //   「整页并入人才库」删除 ⇒ 文件数合法减少；**收基线不是放宽**——核的是「抽取口径仍可用」而非「数量不减」）。
  // ⚠ 2026-10-02 批次 337（支书评 `#9`·徽章红/金字色）：`components/ui/badge.js` 的 5 处 hex
  //   （全在该文件注释里）随「brand/gold 不再挂内联字色 ＋ brand 改回党建红用 `var(--party-red)`」**清零**
  //   ⇒ 按收基线纪律删该文件条目、声明 76 → **75**，本「防呆下限」随实况同步下沉。
  //   **不是放宽**：真正的判红项是 H1（新增值）/ H2（处数上涨）/ 僵尸登记——本下限只防「台账被悄悄删空」。
  // ⚠ 2026-10-23 批次 505：7 主题 × 亮/暗 × 8 token 的手选色板落地（112 个 token）⇒ 按实况重设：
  //   文件数 74 → 51（23 个文件的内联派生清零）、distinct 168 → 287、处数 → 1419。
  //   下限随实况同步下沉，**不是放宽**——真正判红的是 H1（新增值）/ H2（处数上涨）/ 僵尸登记；
  //   色板本身的合法性由 H6 单独核（除 #FFFFFF 外只允许出现在两个色板定义文件）。
  // ⚠ 2026-10-29 P1（焦点单信号）：`feedback/issue-list.js` / `prop/kanban-tab.js` 的内联焦点色
  //   `#ce1126` 改为 `.focus-ring` 语义类后清零 ⇒ 按收基线纪律删两条目、声明 51 → 49，
  //   本「防呆下限」随实况同步下沉到 49（**不是放宽**：H1 新增值 / H2 处数上涨 / 僵尸登记仍是判红项）。
  // ⚠ 2026-10-29 P2（数字组单一语法）：`secretary/report-up-tab.js` 三处内联 hex 改语义 token 后清零
  //   ⇒ 再删一条目、声明 49 → 48，本下限随实况同步下沉到 48（同上，不是放宽）。
  // ⚠ 2026-11-01 批次 524：`overview-dispatch-bar.js` 待答复条改功能色后 hex 清零 ⇒ 删条目、
  //   声明 48 → 47，本下限随实况同步下沉到 47（同上，不是放宽）。
  // ⚠ 2026-11-04 批次 534：`tailwind-config.js`（改全 var() 映射）与 `activity-view.js`（三态色收敛）
  //   hex 清零 ⇒ 文件数 47 → **45**、处数 1433 → **818**（HEX_TOTAL_BASELINE 改为随实况同步）；
  //   防呆下限随实况下沉（47→45 / 1400→800）。**不是放宽**：判红项仍是 H1（新增值）/ H2（处数上涨）/
  //   下方僵尸登记——下限只防「台账被悄悄删空」。
  assert.ok(HEX_FILE_BASELINE >= 45 && files.length >= 45, `hex 基线文件数过少（实测 ${files.length} / 声明 ${HEX_FILE_BASELINE}，下限 45）`);
  assert.ok(HEX_TOTAL_BASELINE >= 800, `hex 基线处数过少（声明 ${HEX_TOTAL_BASELINE}，下限 800）`);
  assert.ok(HEX_VALUE_BASELINE >= 280, `hex 基线值数过少（声明 ${HEX_VALUE_BASELINE}，下限 280）`);
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

// ── H6 主题色板例外（2026-10-23 批次 505） ───────────────────────────
// 病灶：色板从「10 个 hex + 公式」升级为「7 主题 × 亮/暗 × 8 手选 hex」后，constants.js / styles.css
//   必然新增 100+ 个色值。若放任它们散落到组件里，就成了新的「游离 hardcode」。
// 判据（**只放宽声明点**，不放宽其它）：
//   ① 色板值必须全部能在 `constants.js` 的 `ACCENT_COLORS` 表里找到（可追溯）；
//   ② 除 `#FFFFFF`（与中性白同值，全站共用）外，任何色板值只允许出现在
//      `docs/src/core/domain/constants.js` 与 `docs/src/styles.css` 两个「色板定义文件」。
test('H6 主题色板例外：除 #FFFFFF 外，色板值只允许出现在 constants.js / styles.css', () => {
  const PALETTE_FILES = new Set([
    'docs/src/core/domain/constants.js',
    'docs/src/styles.css',
  ]);
  const values = new Set();
  for (const entry of Object.values(ACCENT_COLORS)) {
    for (const mode of ['light', 'dark']) {
      for (const v of Object.values(entry[mode])) values.add(String(v).toLowerCase());
    }
  }
  assert.ok(values.size >= 100, `色板值只收集到 ${values.size} 个（7×2×8 应 ≥100）：非空转`);

  const constantsSrc = readFileSync(join(ROOT, 'docs/src/core/domain/constants.js'), 'utf8').toLowerCase();
  const missingInTable = [...values].filter((v) => !constantsSrc.includes(v));
  assert.deepEqual(missingInTable, [], `以下色板值未出现在 constants.js（主题色必须在表内定义）：${missingInTable.join(' ')}`);

  const leaks = [];
  for (const { file, hits } of scan()) {
    if (PALETTE_FILES.has(file)) continue;
    const hitSet = new Set(hits.map((h) => h.toLowerCase()));
    for (const v of values) {
      if (v === '#ffffff') continue; // 中性白：全站共用，不算主题色泄漏
      if (hitSet.has(v)) leaks.push(`${file} → ${v}`);
    }
  }
  assert.deepEqual(leaks, [], `主题色板值出现在色板定义文件之外（组件不得直写主题色 hex）：\n  ${leaks.join('\n  ')}`);
});

// ── H7 主题栏元信息（2026-11-03 批次 533 · R5A-34）──────────────────────
// 病灶：全站页面缺 `<meta name="theme-color">`，移动端浏览器地址栏不随主题；补时又不能各写各的色值。
// 判据：除冻结件 `docs/about.html` 外，每个 `docs/**/*.html` 必须恰好一条 theme-color，且值为
//   `styles.css :root` 的 `--party-red`（品牌统一层，不随支部主题变）。theme-color 必须写字面量，
//   H1/H2 已把该元信息剥离，不重复计为界面硬编码。
test('H7 theme-color：每页恰一条，且等于 --party-red（about.html 冻结件除外）', () => {
  const css = readFileSync(join(ROOT, 'docs/src/styles.css'), 'utf8');
  const partyRed = /--party-red:\s*(#[0-9a-fA-F]{3,8})/.exec(css)?.[1]?.toLowerCase();
  assert.ok(partyRed, 'styles.css 缺 --party-red（无法校验 theme-color 单一源）');

  const problems = [];
  for (const file of scanFiles().filter((f) => f.endsWith('.html'))) {
    if (file === 'docs/about.html') continue; // About 冻结件：原样保留
    const tags = readFileSync(join(ROOT, file), 'utf8').match(THEME_COLOR_META_RE) || [];
    if (tags.length !== 1) { problems.push(`${file} → theme-color ${tags.length} 条（须恰 1 条）`); continue; }
    const value = /content=["']([^"']+)["']/i.exec(tags[0])?.[1]?.toLowerCase();
    if (value !== partyRed) problems.push(`${file} → ${value} ≠ ${partyRed}`);
  }
  assert.deepEqual(problems, [],
    `theme-color 缺失 / 重复 / 与 --party-red 不一致：\n  ${problems.join('\n  ')}`);
});
