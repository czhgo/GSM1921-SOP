/**
 * 按钮体系 ＋ 死字段 守卫（批次 287 立 / 批次 288 按在force口径重写）
 *
 * 来源（支书裁定）：
 *   「如果是 button 我要求**所有的界面**都统一！」（支书 2026-09-29）
 *   「历史的经验教训要谨防再犯！」（支书 2026-09-29；→ B1）
 *   在force尺寸口径＝`docs/src/styles.css` 的「按钮尺寸规范」（**支书指令 2026-08-06**
 *   ：全站一次规范，**同一界面按钮高度差距不过大**）——**四档**。
 *
 * ⚠ 批次 287 的**错误**（本文件重写的原因）：当时把口径写成「按钮必须走 `.btn` 四变体」，
 *   而 **`.btn` / `.btn--primary` / `.btn--sm` 在 `styles.css` 里根本不存在**
 *   （实际只有 `.btn-action*` / `.btn-md*` / `.btn-tab*` / `.btn-accent*`）。
 *   ⇒ 该口径指向未实现的类名、并把它自造的 316 个"越轨"当成缺陷。**已按在force四档重写**。
 *
 * B1【死字段】`docs/src/**` **不得引用已被移除的字段**。
 *   教训：批次 280 把首页通知归并建在 `systemDerived` 上，而该标记**已随 R-22 移除**
 *   （见 `docs/src/services/governance/notice.js` 批注）⇒ 判定恒假、**归并静默失灵**。
 *
 * B2【按钮尺寸档】每个 `<button>` 必须命中**四档之一**（或命名族），否则＝**第五种高度**（越轨）。
 *   档1 微操作 25px ：`.btn-action*`
 *   档2 默认　30px ：`text-xs` + `py-1.5`
 *   档3 行内对齐 34px：`text-xs` + `py-2`
 *   档4 主 CTA 34px：`text-sm` + （`py-1.5` 带边框 / `py-[7px]` 无边框）
 *   命名族（另有其自身尺寸口径）：`.btn-md*` / `.btn-tab*` / `.btn-accent*`
 *   **例外**（非按钮，不判）：`sr-only` 隐藏语义按钮；**无 `px-`/`py-`/`btn` 的纯文字动作**（如「全部 ›」）。
 *   ⚠ 上限是**棘轮**：归位后**必须一并下调**（批次 288 实测真值 103；三屏已归零，
 *     早前 316＝错口径、147＝正则缺陷 `py-\[7px\]\b` 的 `\b` 永不成立 ⇒ 均已修）。
 *
 * B3【台账】打印**逐文件越轨清单**，供 ③-c「先三屏、再铺开」归位使用。
 *
 * B4【按钮族棘轮】未入**语义族**的 `<button>` 数**只许降不许升**（2026-09-30 批次 297-1 立）。
 *   来源：支书 2026-09-30 裁「⑦ 按钮族＝**全面归一**」＋「**新立 4 族**（中性 / 描边 / 文字 / 危险）」。
 *   目标族谱（**全站按钮只准用这 8 族**，单一源＝`styles.css`「按钮族谱补全」段 ＋ `DESIGN_SYSTEM §4.1`）：
 *     主操作 `.btn-accent` · 次主操作 `.btn-accent-soft` · 微操作 `.btn-action*` · **中性 `.btn-neutral`** ·
 *     **描边 `.btn-outline`** · **文字 `.btn-ghost`** · **危险 `.btn-danger`** · 命名族 `.btn-md*` / `.btn-tab*`。
 *   基线＝**批次 297-1 实测 454**（手写 344 ＋ 含 btn 词干非族 110）；**每迁完一屏一并下调基线**（收基线纪律）。
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC = join(__dirname, '..', '..', 'docs', 'src');

/** B1：已移除 / 从未有写入方的字段（引入即静默失灵）—— 只可增补，不可删除 */
const DEAD_FIELDS = [
  { key: 'systemDerived', reason: 'R-22 已移除该标记（notice.js 批注）；引用即判定恒假' },
];

/** 四档 ＋ 命名族（在force口径，单一源＝`styles.css` COMPONENT: Button 段） */
const TIERS = [
  // 档1 微操作：命名族 `.btn-action` **或** 与其等高的 13px 正文档微操作
  //   （`text-[13px] px-2 py-0.5`——13px 系 **2026-09-14 支书裁定的全站正文单档**
  //    〔见 `styles.css:337`「全站正文 13px、控件 38px」〕，`py-0.5` 后高 ≈25px 与档1 等值）。
  //   ⚠ 判据按**高度等值**，不按写法排斥——写法不同但同高即合规（避免"只认一种写法"的假阳性）。
  //   ⚠⚠ **易错点（本文件已犯两次）**：`]` 是非单词字符，`\]\b` 在其后接空格/引号时**永不成立** ⇒
  //       任意值类名（`text-[13px]` / `py-[7px]`）的匹配**一律不要写尾随 `\b`**。
  { id: '档1/25px', hit: (c) => /\bbtn-action\b/.test(c)
    // 档1 等值写法（**系统性**，非偶发）：`(text-xs|text-[13px]) + px-2.5 py-1` ≈ 26px，
    //   与 `.btn-action`(25px) **仅差 1px**；该写法在 ≥15 个屏一致复用（名册/支部/纪检/宣传/待办…），
    //   属既有微操作约定 ⇒ 判合规（判据是**高度**，不是写法）。
    || (/text-xs|text-\[13px\]/.test(c) && /\bpy-1\b/.test(c))
    || (/\bpy-0\.5\b/.test(c) && !/text-sm/.test(c)) },
  { id: '档2/30px', hit: (c) => /\btext-xs\b/.test(c) && /\bpy-1\.5\b/.test(c) && !/\btext-sm\b/.test(c) },
  { id: '档3/34px', hit: (c) => /\btext-xs\b/.test(c) && /\bpy-2\b/.test(c) },
  { id: '档4/34px', hit: (c) => /\btext-sm\b/.test(c) && (/\bpy-1\.5\b/.test(c) || /py-\[7px\]/.test(c)) },
  { id: '命名族', hit: (c) => /\b(btn-md|btn-tab|btn-accent)\b/.test(c) },
  // 档5＝**U5b（2026-09-07 支书批准）**：**低频操作钮**（导出 / 打印 / 分页）统一 **32px**，
  //   与分页钮 / 下拉**同高同 border 家族**（见 `disc/attendance-tab.js` 同处注释）。**在force，勿归位**。
  { id: '档5/32px 低频', hit: (c) => /\bh-8\b/.test(c) },
];

/**
 * 例外（不判）：
 *   ① `sr-only` 隐藏语义按钮；
 *   ② **纯文字动作**（无 `px-`/`py-`/`btn`，如「全部 ›」）——导航，不是按钮；
 *   ③ **行式载体**（`w-full` ＋ `text-left`，如首页「今天有会/本岗待办」整行可点条）——
 *      高度由行内容决定，属 `§4.19` 内嵌行块，**不是按钮档**；强塞 25/30/34px 会破坏行布局。
 *   ⚠ 批次 288 修正：早前 `py-\[7px\]\b` 中的 `\]` 后接空格 ⇒ `\b` 永不成立，
 *      导致**「主 CTA 档」被整体误判为越轨**（错数由此虚高）。**已修**。
 */
const isExempt = (c) => /\bsr-only\b/.test(c)
  // 无纵向内边距 ⇒ 高度由**行高 / CSS** 决定，属**文字动作或 CSS 族**，不在「按钮高度档」范畴。
  //   ⚠ 批次 289 修正：早前额外要求「类名不含 `btn`」，导致 `.act-sub-del-btn`（**无内边距的纯文字动作**，
  //     只因类名以 `-btn` 结尾）被误判 —— **假阳性**。判据只看是否有 `py-`。
  || !/\bpy-/.test(c)
  // 行式载体（整行可点条目）：`w-full` **或** `flex-1` ＋ `text-left` ⇒ 高度由行内容决定（归 `§4.19`）。
  || (/\b(w-full|flex-1)\b/.test(c) && /\btext-left\b/.test(c));

/** 棘轮上限（越轨数）：**已归零（批次 290）** ⇒ 此后**任何**新按钮都必须落档，零容忍 */
const BUTTON_OFF_BUDGET_CEILING = 0;

function walkJs(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walkJs(p, out);
    else if (name.endsWith('.js')) out.push(p);
  }
  return out;
}

const FILES = walkJs(SRC);

/**
 * **CSS 命名族校验**（而非按名字猜）：把 `styles.css` 里**确实定义过的**类名收进集合；
 * 某 `<button>` 的类名里若含「已定义 ＋ 名字带 `btn`/`button`」的令牌 ⇒ 判为**命名族**
 * （其尺寸由该 CSS 块自理，已由 `styles.css` 的按钮尺寸规范覆盖）。
 * 典型：`.ref-doc-action-btn`（`styles.css:2173`）/ `.page-btn`（`:898`）/ `.vote-btn`（`:1774`）。
 */
const CSS_SRC = readFileSync(join(__dirname, '..', '..', 'docs', 'src', 'styles.css'), 'utf8');
const CSS_CLASSES = new Set([...CSS_SRC.matchAll(/\.([a-zA-Z][\w-]*)/g)].map((m) => m[1]));
const isCssNamedFamily = (c) => c.split(/\s+/)
  // `chip` 亦属**表单命名族**（`styles.css:776`：「表单内的 chip（.chip-option）」）——
  // 其高度由该 CSS 块定，不属按钮高度档。
  .some((t) => /(btn|button|chip)/.test(t) && CSS_CLASSES.has(t));

test('B1 死字段：docs/src 不得引用已被移除的字段', () => {
  const hits = [];
  for (const f of FILES) {
    const src = readFileSync(f, 'utf8');
    for (const { key, reason } of DEAD_FIELDS) {
      if (new RegExp(`\\.${key}\\b`).test(src)) {
        hits.push(`${relative(join(__dirname, '..', '..'), f)} → .${key}（${reason}）`);
      }
    }
  }
  assert.deepEqual(hits, [], `发现对已移除字段的引用（判定会恒假、行为静默失灵）：\n${hits.join('\n')}`);
});

test('B2 按钮尺寸档：<button> 必须命中四档之一（或命名族）', () => {
  const perFile = new Map();
  let total = 0;
  for (const f of FILES) {
    const src = readFileSync(f, 'utf8');
    const re = /<button[^>]*\bclass="([^"]*)"/g;
    let m;
    while ((m = re.exec(src)) !== null) {
      const cls = m[1];
      if (isExempt(cls)) continue;
      if (isCssNamedFamily(cls)) continue;
      if (TIERS.some((t) => t.hit(cls))) continue;
      total += 1;
      const line = src.slice(0, m.index).split('\n').length;
      if (!perFile.has(f)) perFile.set(f, []);
      perFile.get(f).push(`${line}: ${cls.trim()}`);
    }
  }
  // B3 台账：逐文件越轨清单（**文件:行号 + 类名**，供 ③-c 精确归位）
  const ledger = [...perFile.entries()]
    .sort((a, b) => b[1].length - a[1].length)
    .map(([f, list]) => `  ${String(list.length).padStart(3)}  ${relative(join(__dirname, '..', '..'), f)}\n`
      + list.map((s) => `         - ${s}`).join('\n'));
  console.log(`[button-system-guard] 未命中档的 <button> 共 ${total} 个（棘轮上限 ${BUTTON_OFF_BUDGET_CEILING}）：\n${ledger.join('\n')}`);
  assert.ok(
    total <= BUTTON_OFF_BUDGET_CEILING,
    `未命中四档的 <button> 由 ${BUTTON_OFF_BUDGET_CEILING} 升到 ${total} 个 ⇒ 新按钮须落在 styles.css「按钮尺寸规范」四档之一。`,
  );
});

/** 语义族令牌（B4 判据单一源；与 `styles.css`「按钮族谱补全」段、`DESIGN_SYSTEM §4.1` 三处同源） */
const FAMILY_TOKENS = [
  'btn-accent-soft', 'btn-accent', 'btn-action', 'btn-md', 'btn-tab',
  'btn-neutral', 'btn-outline', 'btn-ghost', 'btn-danger',
];
/** B4 棘轮基线（批次 297-2 全站归一后实测 **0**；**只许下调**） */
const HANDWRITTEN_BUTTON_BASELINE = 0;

test('B4 按钮族棘轮：未入语义族的 <button> 只许降不许升（「全面归一」的进度表）', () => {
  const walk = (dir, out = []) => {
    for (const n of readdirSync(dir)) {
      const p = join(dir, n);
      if (statSync(p).isDirectory()) walk(p, out);
      else if (n.endsWith('.js')) out.push(p);
    }
    return out;
  };
  let handwritten = 0;
  const perFile = new Map();
  const re = /<button[^>]*\bclass="([^"]*)"/g;
  for (const f of walk(SRC)) {
    const src = readFileSync(f, 'utf8');
    let m;
    while ((m = re.exec(src)) !== null) {
      const cls = m[1];
      if (FAMILY_TOKENS.some((t) => new RegExp(`(^|\\s)${t}`).test(cls))) continue;
      handwritten += 1;
      if (!perFile.has(f)) perFile.set(f, 0);
      perFile.set(f, perFile.get(f) + 1);
    }
  }
  const ledger = [...perFile.entries()].sort((a, b) => b[1] - a[1])
    .map(([f, n]) => `  ${String(n).padStart(3)}  ${relative(join(__dirname, '..', '..'), f)}`);
  console.log(`[button-system-guard] 未入语义族的 <button> 共 ${handwritten} 个（棘轮上限 ${HANDWRITTEN_BUTTON_BASELINE}）：\n${ledger.join('\n')}`);
  assert.ok(
    handwritten <= HANDWRITTEN_BUTTON_BASELINE,
    `未入语义族的 <button> 由 ${HANDWRITTEN_BUTTON_BASELINE} 升到 ${handwritten} 个 ⇒ 新按钮须走 8 族之一（${FAMILY_TOKENS.join(' / ')}）；每迁完一屏请一并下调基线。`,
  );
});
