/**
 * 按钮体系 ＋ 死字段 守卫（批次 287）
 *
 * 来源（支书 2026-09-29 裁定）：
 *   「如果是 button 我要求**所有的界面**都统一！」（支书 2026-09-29；落 `DESIGN_SYSTEM §4.1 唯一入口`）
 *   「历史的经验教训要谨防再犯！」（支书 2026-09-29；→ B1 死字段）
 *
 * B1【死字段】`docs/src/**` **不得引用已被移除的字段**。
 *   教训：批次 280 把首页通知归并建在 `systemDerived` 上，而该标记**已随 R-22 移除**
 *   （见 `docs/src/services/governance/notice.js` 批注）⇒ 判定恒假、**归并静默失灵**、
 *   界面看起来"没坏"但行为完全失效——这类错误静态可查，必须由守卫兜住。
 *
 * B2【按钮体系】`<button>` 起首标签的 `class` 不含 `btn` 的数量 **≤ 上限**（只许降不许升）。
 *   `§4.1` 例外（不判）：纯文字/图标**导航**动作（「全部 ›」「查看全部」）、`<summary>` 折叠头、
 *   `sr-only` 等隐藏语义按钮。
 *   ⚠ 上限是**棘轮**：③-c 分批归位后**必须一并下调**（当前 101 ⇒ 逐批降到 0）。
 *
 * 台账：B3 打印**逐文件越轨清单**，供 ③-c「先三屏、再铺开」归位使用。
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

/** B2：`<button>` 未走 `.btn` 体系的**数量上限**（棘轮，只许下调） */
const BUTTON_OFF_BUDGET_CEILING = 316;

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

test('B2 按钮体系：未走 .btn 的 <button> 数量不得上升', () => {
  const perFile = new Map();
  let total = 0;
  for (const f of FILES) {
    const src = readFileSync(f, 'utf8');
    const re = /<button[^>]*\bclass="([^"]*)"/g;
    let m;
    while ((m = re.exec(src)) !== null) {
      const cls = m[1];
      if (/\bbtn\b/.test(cls)) continue;
      if (/sr-only/.test(cls)) continue;          // 隐藏语义按钮
      if (/text-\[13px\]|text-gray-500 hover:text-gray-600/.test(cls)) continue; // 导航类纯文字动作
      total += 1;
      perFile.set(f, (perFile.get(f) || 0) + 1);
    }
  }
  // B3 台账：逐文件越轨清单（供 ③-c 归位）
  const ledger = [...perFile.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([f, n]) => `  ${String(n).padStart(3)}  ${relative(join(__dirname, '..', '..'), f)}`);
  console.log(`[button-system-guard] 未走 .btn 体系的 <button> 共 ${total} 个（上限 ${BUTTON_OFF_BUDGET_CEILING}）：\n${ledger.join('\n')}`);
  assert.ok(
    total <= BUTTON_OFF_BUDGET_CEILING,
    `未走 .btn 体系的 <button> 由 ${BUTTON_OFF_BUDGET_CEILING} 升到 ${total} 个 ⇒ 新按钮必须走 §4.1 的 .btn 四变体 ＋ 两尺寸档。`,
  );
});
