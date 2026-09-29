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
  { id: '档1/25px', hit: (c) => /\bbtn-action\b/.test(c) },
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
  || (!/\bpx-/.test(c) && !/\bpy-/.test(c) && !/\bbtn/.test(c))
  || (/\bw-full\b/.test(c) && /\btext-left\b/.test(c));

/** 棘轮上限（越轨数，只许降） */
const BUTTON_OFF_BUDGET_CEILING = 86;

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
      if (TIERS.some((t) => t.hit(cls))) continue;
      total += 1;
      if (!perFile.has(f)) perFile.set(f, []);
      perFile.get(f).push(cls);
    }
  }
  // B3 台账：逐文件越轨清单（含类名，供 ③-c 归位）
  const ledger = [...perFile.entries()]
    .sort((a, b) => b[1].length - a[1].length)
    .map(([f, list]) => `  ${String(list.length).padStart(3)}  ${relative(join(__dirname, '..', '..'), f)}`);
  console.log(`[button-system-guard] 未命中四档的 <button> 共 ${total} 个（棘轮上限 ${BUTTON_OFF_BUDGET_CEILING}）：\n${ledger.join('\n')}`);
  assert.ok(
    total <= BUTTON_OFF_BUDGET_CEILING,
    `未命中四档的 <button> 由 ${BUTTON_OFF_BUDGET_CEILING} 升到 ${total} 个 ⇒ 新按钮须落在 styles.css「按钮尺寸规范」四档之一。`,
  );
});
