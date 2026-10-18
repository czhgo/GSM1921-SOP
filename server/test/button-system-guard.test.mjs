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
 *
 * B5【族·语义一致】`.btn-ghost` **不得带内联实底**（2026-09-30 批次 300 立）。
 *   来源：支书 2026-09-30 原话「**button 还有漏网之鱼？请全面检查，所有的角色！**」——实测全站
 *   55+ 处 `class="btn-ghost…"` ＋ 内联 `background:var(--party-red)` 等**实底**＝「**借文字族的
 *   形状伪装主操作实底**」。`B4` 只查「类名是否入族」（`btn-ghost` 在族内 ⇒ 不报），故这整类
 *   **用错族**长期隐形。判据见 `DESIGN_SYSTEM §4.1 何时用哪族`：主操作→`.btn-accent` ·
 *   危险→`.btn-danger(-solid)` · 中性→`.btn-neutral` · 次主操作→`.btn-accent-soft`。
 *   基线＝**批次 300 归一后实测 0**（棘轮：只许降不许升）。
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

/**
 * B4 **豁免清单**（判据改准 · 2026-09-30 批次 297-2 收窄；支书裁「组件自带强调色的控件豁免并回退」）
 * ——**组件自带选中态强调色**（用自己的 `--xxx-accent` 变量）的控件不并入 8 族：它们各自即「命名族」。
 * 每条须写明「哪个组件 / 选中态从哪来」，**不得按名字猜**（受 `D-668` 结构性判据须自实况归纳约束）。
 */
const COMPONENT_STATE_EXEMPT = [
  '-tab-btn', // 页头 tab（`components/shell/tab-bar.js` 单一源）：选中态＝`.tab-btn-active` ＋ 内联 `--tab-accent`
  'subtab', // 页内二级切换（党委上报/下发通知共用）：选中态＝`.subtab[aria-selected="true"]`，2026-10-18 工作台提质
];

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
  let exempt = 0;
  const perFile = new Map();
  const re = /<button[^>]*\bclass="([^"]*)"/g;
  for (const f of walk(SRC)) {
    const src = readFileSync(f, 'utf8');
    let m;
    while ((m = re.exec(src)) !== null) {
      const cls = m[1];
      // ⚑ 2026-09-30 批次 297-2 **收窄判据**（支书裁「**组件自带强调色的控件豁免并回退**」＋
      //   「把这些页头 tab 恢复到之前的模式」）：**组件自带选中态强调色**（用自己的 `--xxx-accent`
      //   变量，不随通用主题族走）的控件**不并入 8 族**——它们各自就是「命名族」。
      //   判据＝class 串命中组件自有类（字面可见，不按名字猜：`tab-bar.js` 已把 `${prefix}-tab-btn` 内联）。
      if (COMPONENT_STATE_EXEMPT.some((t) => cls.includes(t))) { exempt += 1; continue; }
      if (FAMILY_TOKENS.some((t) => new RegExp(`(^|\\s)${t}`).test(cls))) continue;
      handwritten += 1;
      if (!perFile.has(f)) perFile.set(f, 0);
      perFile.set(f, perFile.get(f) + 1);
    }
  }
  const ledger = [...perFile.entries()].sort((a, b) => b[1] - a[1])
    .map(([f, n]) => `  ${String(n).padStart(3)}  ${relative(join(__dirname, '..', '..'), f)}`);
  console.log(`[button-system-guard] 未入语义族的 <button> 共 ${handwritten} 个（棘轮上限 ${HANDWRITTEN_BUTTON_BASELINE}）；组件自有类豁免 ${exempt} 个（${COMPONENT_STATE_EXEMPT.join(' / ')}）：\n${ledger.join('\n')}`);
  assert.ok(
    handwritten <= HANDWRITTEN_BUTTON_BASELINE,
    `未入语义族的 <button> 由 ${HANDWRITTEN_BUTTON_BASELINE} 升到 ${handwritten} 个 ⇒ 新按钮须走 8 族之一（${FAMILY_TOKENS.join(' / ')}）；每迁完一屏请一并下调基线。`,
  );
});

/** B5 棘轮基线（批次 300 归一后实测 **0**；只许下调） */
const GHOST_SOLID_BASELINE = 0;

test('B5 族·语义一致：.btn-ghost 不得带内联实底（借文字族形状伪装实底）', () => {
  const offenders = [];
  const tagRe = /<button\b[^>]*>/g;
  for (const f of FILES) {
    const src = readFileSync(f, 'utf8');
    let m;
    while ((m = tagRe.exec(src)) !== null) {
      const tag = m[0];
      const cls = (/class="([^"]*)"/.exec(tag) || [null, ''])[1];
      if (!/(^|\s)btn-ghost(?![\w-])/.test(cls)) continue;
      const style = (/style="([^"]*)"/.exec(tag) || [null, ''])[1];
      // 运行期动态样式（含模板表达式）⇒ 豁免：此类＝**组件自带状态**（选中态/色板等），
      //   正是 `D-712` 收窄口径「组件自带强调色的控件豁免」所指（如 `${brandBtnStyle}` / `${accent.hex}`）。
      if (style.includes('${')) continue;
      const bg = (/background\s*:\s*([^;"]+)/.exec(style) || [null, ''])[1].trim();
      if (!bg) continue;
      if (/^(none|transparent)$/i.test(bg)) continue;   // 本就不是实底
      const line = src.slice(0, m.index).split('\n').length;
      offenders.push(`  ${relative(join(__dirname, '..', '..'), f)}:${line} → ${bg}`);
    }
  }
  console.log(`[button-system-guard] .btn-ghost 带内联实底的 <button> 共 ${offenders.length} 个（棘轮上限 ${GHOST_SOLID_BASELINE}）：\n${offenders.join('\n')}`);
  assert.ok(
    offenders.length <= GHOST_SOLID_BASELINE,
    `'.btn-ghost' 带内联实底的 <button> 有 ${offenders.length} 个（上限 ${GHOST_SOLID_BASELINE}）⇒ 实底须归主操作 / 危险 / 中性族，勿借文字族形状。`,
  );
});

/**
 * B6【尺寸归一单一源】（2026-10-18 立）
 *   来源：支书反馈「有的厚、有的薄；有的字大、有的字小」⇒ 裁定**全局 CSS 归一**：
 *   8 个语义族的高度 / 字号 / 内边距只由 `styles.css` 的「按钮尺寸归一（2026-10-18）」段决定，
 *   页面不再用 `text-* / py-* / px-* / h-*` 零散决定厚薄。
 *   判据：
 *     ① 该段存在；
 *     ② 34/32/30/26px 四档与正文档 13px（微操作 12px）**带 `!important`** 落在各族上
 *        ——Tailwind 工具类可能后加载，不带 `!important` 压不住；
 *     ③ 通用排布（inline-flex / 居中 / 不换行 / 1px 边框）存在；
 *     ④ `.btn-icon` 例外存在（32×32、padding 0）。
 */
const SIZE_NORMALIZE_MARKER = '按钮尺寸归一（2026-10-18）';
const ROW_QUIET_MARKER = '列表行边框收敛（2026-10-18）';

/** 极简规则切分：只取「选择器 { 声明 }」（本段无嵌套 at-rule；先剥注释，避免注释里的示例类串段） */
function cssRules(css) {
  const out = [];
  const re = /([^{}]+)\{([^{}]*)\}/g;
  let m;
  while ((m = re.exec(css)) !== null) out.push({ selector: m[1].trim(), body: m[2] });
  return out;
}

test('B6 按钮尺寸归一：styles.css 单源锁定 8 族尺寸（34/32/30/26px）', () => {
  const start = CSS_SRC.indexOf(SIZE_NORMALIZE_MARKER);
  assert.ok(start >= 0,
    `styles.css 缺少「${SIZE_NORMALIZE_MARKER}」段 ⇒ 按钮尺寸仍会被页面工具类零散决定（厚薄不一的老病）。`);
  const rowStart = CSS_SRC.indexOf(ROW_QUIET_MARKER, start);
  const section = CSS_SRC.slice(start, rowStart > start ? rowStart : undefined)
    .replace(/\/\*[\s\S]*?\*\//g, '');
  const rules = cssRules(section);
  const tierRuleOf = (token) => rules.find((r) => new RegExp(`\\.${token}(?![\\w-])`).test(r.selector)
    && /min-height/.test(r.body));

  // ② 四档 ＋ 字号（26px 档是微操作，12px；其余 13px 正文档）
  const expectTier = (token, minHeight, fontSize) => {
    const r = tierRuleOf(token);
    assert.ok(r, `「${SIZE_NORMALIZE_MARKER}」段缺少 .${token} 的尺寸档（页面会退回零散工具类）`);
    assert.match(r.body, new RegExp(`min-height:\\s*${minHeight}px\\s*!important`),
      `.${token} 应为 min-height: ${minHeight}px !important`);
    assert.match(r.body, /padding:\s*0\s+\d+px\s*!important/,
      `.${token} 的 padding 应为「0 Npx !important」`);
    assert.match(r.body, new RegExp(`font-size:\\s*${fontSize}px\\s*!important`),
      `.${token} 的字号应为 ${fontSize}px !important`);
  };
  expectTier('btn-accent', 34, 13);
  expectTier('btn-accent-soft', 34, 13);
  expectTier('btn-md', 34, 13);
  expectTier('btn-neutral', 32, 13);
  expectTier('btn-outline', 32, 13);
  expectTier('btn-danger', 32, 13);
  expectTier('btn-danger-solid', 32, 13);
  expectTier('btn-ghost', 30, 13);
  expectTier('btn-tab', 30, 13);
  expectTier('btn-action', 26, 12);

  // ③ 通用排布单一源（排布属性**不加** `!important`：行式载体的 `justify-between` /
  //    `items-start` / `border-0` 等工具类须能后加载覆盖；只锁尺寸属性）
  const common = rules.find((r) => /display:\s*inline-flex/.test(r.body)
    && /align-items:\s*center/.test(r.body)
    && /justify-content:\s*center/.test(r.body)
    && /gap:\s*0\.375rem\s*!important/.test(r.body)
    && /line-height:\s*1\s*!important/.test(r.body)
    && /white-space:\s*nowrap/.test(r.body)
    && /border-width:\s*1px/.test(r.body));
  assert.ok(common, `「${SIZE_NORMALIZE_MARKER}」段缺少通用排布规则（inline-flex / 居中 / gap:0.375rem!important / line-height:1!important / nowrap / border-width:1px）`);

  // ④ 图标型例外
  const icon = rules.find((r) => /\.btn-icon(?![\w-])/.test(r.selector) && /width:\s*32px/.test(r.body));
  assert.ok(icon, `「${SIZE_NORMALIZE_MARKER}」段缺少 .btn-icon 例外（图标按钮 32×32）`);
  assert.match(icon.body, /padding:\s*0\s*!important/, '.btn-icon 的 padding 应为 0 !important');
});

/**
 * B7【族内不得再写尺寸】（2026-10-18 立，棘轮）
 *   问题：归一后尺寸已由 `styles.css` 用 `!important` 锁死，但页面里仍有
 *   `<button class="btn-outline … text-sm py-1.5">` 这类「族类 ＋ 尺寸工具类」——
 *   既不生效、又让读码者误以为尺寸还归页面管。
 *   存量约 491 处，**本批不清**（支书要求「不要一次清 400 处」），只锁「不得新增」。
 *   判据＝`<button class>` 同时命中 8 族令牌 与 尺寸工具类令牌（字号 / 内边距 / 高度）。
 *   基线＝2026-10-18 实测 **491**（只许降不许升；每迁完一屏一并下调）。
 */
const FAMILY_SIZE_OVERRIDE_BASELINE = 491;
const SIZE_TOKEN_RE = /^(?:text-(?:xs|sm|base|lg|xl)|text-\[\d+px\]|p-\d+(?:\.\d+)?|px-\d+(?:\.\d+)?|py-\d+(?:\.\d+)?|h-\d+(?:\.\d+)?|min-h-\S+)$/;
const FAMILY_TOKEN_RE = /(^|\s)(btn-accent-soft|btn-accent|btn-action|btn-md|btn-tab|btn-neutral|btn-outline|btn-ghost|btn-danger)/;

test('B7 族内不得再写尺寸：语义族按钮上的 text-*/py-*/px-*/h-* 只许降不许升', () => {
  let total = 0;
  const perFile = new Map();
  const re = /<button[^>]*\bclass="([^"]*)"/g;
  for (const f of FILES) {
    const src = readFileSync(f, 'utf8');
    let m;
    while ((m = re.exec(src)) !== null) {
      const cls = m[1];
      if (!FAMILY_TOKEN_RE.test(cls)) continue;
      if (!cls.split(/\s+/).some((t) => SIZE_TOKEN_RE.test(t))) continue;
      total += 1;
      perFile.set(f, (perFile.get(f) || 0) + 1);
    }
  }
  const ledger = [...perFile.entries()].sort((a, b) => b[1] - a[1])
    .map(([f, n]) => `  ${String(n).padStart(3)}  ${relative(join(__dirname, '..', '..'), f)}`);
  console.log(`[button-system-guard] 语义族按钮仍写尺寸工具类 ${total} 个（棘轮上限 ${FAMILY_SIZE_OVERRIDE_BASELINE}）：\n${ledger.join('\n')}`);
  assert.ok(
    total <= FAMILY_SIZE_OVERRIDE_BASELINE,
    `语义族按钮上的尺寸工具类由 ${FAMILY_SIZE_OVERRIDE_BASELINE} 升到 ${total} 个 ⇒ 尺寸已由 styles.css「${SIZE_NORMALIZE_MARKER}」统一，新按钮不要再写 text-*/py-*/px-*/h-*；迁移一屏请一并下调基线。`,
  );
});
