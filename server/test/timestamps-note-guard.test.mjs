// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  server/test/timestamps-note-guard.test.mjs —— **TIMESTAMPS「备注列预算」守卫**（N1–N7）
// ════════════════════════════════════════════════════════════════
// 由来（2026-09-28 批次 235，承支书 2026-09-28 口径：「TIMESTAMP 的表格最后一列我觉得也是历史负担很重的！
//   一定要从 harness 的维度遏制这种现象」）：
//   实测（本批，`.ctx/TIMESTAMPS.md`）——登记 **273 行**，**备注列合计 157,952 字符（≈158 KB）**，
//   **最长单格 34,434 字**（就是本文件自己那一行）、p90 927 字；**147 行**含「批次 N」罗列（最多一格 **114 次**）、
//   **75 行**含 T-编号、**24 行**含「日期由 X 刷 Y」复述。
//   病根（该文件自承，`.ctx/REVIEW_QUEUE.md:812`）：备注列被当成**逐批沿革**的落点（写「本批改了哪些文件」），
//   而沿革的**权威落点**是 `.ctx/logs/**`。⇒ 备注列成了第二本执行日志，且**只增不减**。
//
// 本守卫**只做一件事**：给「备注列」上一道**只降不升**的硬预算。不评价备注内容对不对（那是人的事）。
//
// 判据（七条，逐条给理由；与 `doc-consistency::S13` 的**解析口径保持一致**——5 列表行且第 3 列为日期）：
//   **N1 解析非空转**：登记行数 ≥ `ROWS_MIN`（解析口径被改坏 ⇒ 下面 N3–N6 会变成恒真）。
//   **N2 总量预算**：备注列字符合计 ≤ `NOTE_TOTAL_BUDGET`；且 `NOTE_TOTAL_BUDGET ≤ NOTE_TOTAL_HARD_CEIL`
//       ——**这一条是「只降不升」的机检**：想把预算调大，必须先动冻结高水位（＝放宽守卫，属越权项）。
//   **N3 单格硬顶**：单格 > `NOTE_LONG_MAX` 字 ⇒ 入 `OVERLONG_BASELINE`。
//   **N4 禁 T-编号**：备注含 `T-\d` ⇒ 入 `WITH_TID_BASELINE`（T-编号是**执行日志的键**，台账不应承载）。
//   **N5 禁日期复述**：备注写「日期由 X 刷 Y / 刷为 YYYY-MM-DD / 日期不变」⇒ 入 `WITH_DATE_ECHO_BASELINE`
//       （**改准日期是台账动作，不是备注内容**）。
//   **N6 禁批次号罗列**：单格「批次 N」出现 > `BATCH_MENTION_MAX` 次 ⇒ 入 `WITH_BATCH_MENTION_BASELINE`
//       （**沿革应进 `.ctx/logs/**`**，备注只留一句指针）。
//   **N7 清单≡命中集（双向）**：N3–N6 每份清单与**实测命中集必须逐字相等**——
//       新增一处违规 ⇒ 判红（「新格子又在堆沿革」）；清单里的条目不再命中 ⇒ 也判红（僵尸条目须撤下）
//       ⇒ 二者合起来**强制「只降不升」**，且**禁止为变绿而增条目**。
//       （2026-10-05 批次 396 · **支书核可收窄**：另一条自检原要求「四份清单**均为非空**且互不相同」，
//        现收窄为「**非空**清单之间互不相同」——空表不参与比对 ⇒ `N4`/`N5`/`N6` 可合法清零＝达标态。）
//
// 收敛路径（怎么把这 174 条存量清掉）：把该格的历史沿革**整段迁入 `.ctx/logs/**`**（原地留一句指针
//   「沿革见 ×××」），再从 `timestamps-note-baseline.mjs` 删掉该 path。**清单变短＝收敛；变长＝越权**。
//
// 运行：`node --test server/test/timestamps-note-guard.test.mjs`（纯 node，无浏览器 / 无服务依赖）
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  NOTE_TOTAL_BUDGET, NOTE_TOTAL_HARD_CEIL, NOTE_LONG_MAX, BATCH_MENTION_MAX, ROWS_MIN,
  OVERLONG_BASELINE, WITH_TID_BASELINE, WITH_DATE_ECHO_BASELINE, WITH_BATCH_MENTION_BASELINE,
} from './timestamps-note-baseline.mjs';

const ROOT = join(import.meta.dirname, '..', '..');
const TIMESTAMPS = join(ROOT, '.ctx', 'TIMESTAMPS.md');

/** 解析（口径与 doc-consistency::S13 一致：5 列表行、第 3 列为日期、表头行排除） */
function parseRows() {
  const rows = [];
  for (const line of readFileSync(TIMESTAMPS, 'utf8').split(/\r?\n/)) {
    if (!line.startsWith('|')) continue;
    const c = line.split('|').map((s) => s.trim());
    if (c.length !== 7 || !/^\d{4}-\d{2}-\d{2}/.test(c[2]) || c[1] === '文件路径') continue;
    rows.push({ path: c[1], note: c[5] });
  }
  return rows;
}

/** 备注里「批次 N」出现次数 */
const batchMentions = (note) => (note.match(/批次\s*\d+/g) || []).length;
/** 备注里 T-编号（`T-2026-09-001` / `T-123` 两式） */
const hasTId = (note) => /T-\d/.test(note);
/** 备注里的「日期刷」类复述 */
const hasDateEcho = (note) => /日期(由|改)?[^，。；]*刷(为|成)|刷为\s*\d{4}-\d{2}-\d{2}|日期不变/.test(note);

/** 双向比对：新增（命中但不在清单）与僵尸（在清单但不命中）分别报出来，便于一眼定位 */
function diffAgainstBaseline(hits, baseline, label) {
  const hit = new Set(hits);
  const base = new Set(baseline);
  return {
    added: [...hit].filter((p) => !base.has(p)).sort(),
    zombie: [...base].filter((p) => !hit.has(p)).sort(),
    label,
  };
}

const ROWS = parseRows();

// ── N1 非空转 ──────────────────────────────────────────────────────────────
test('N1 非空转：TIMESTAMPS 登记行可解析且规模不低于下限', () => {
  assert.ok(ROWS.length >= ROWS_MIN,
    `只解析到 ${ROWS.length} 行登记（下限 ${ROWS_MIN}）——解析口径被改坏，N3–N6 会变成恒真`);
});

// ── N2 总量预算（只降不升的机检） ───────────────────────────────────────────
test('N2 备注列总量预算：合计字数 ≤ 预算，且预算 ≤ 冻结高水位（只降不升）', () => {
  const total = ROWS.reduce((a, r) => a + r.note.length, 0);
  assert.ok(total <= NOTE_TOTAL_BUDGET,
    `备注列合计 ${total} 字 > 预算 ${NOTE_TOTAL_BUDGET} 字——**备注列又在膨胀**。` +
    `\n  处置二选一：① 把本批沿革写进 \`.ctx/logs/**\` 而不是备注格（推荐）；` +
    `\n            ② 若确有内容必须留在备注，先**迁走等价字数**的存量沿革（本守卫只允许「等量置换」）。`);
  assert.ok(NOTE_TOTAL_BUDGET <= NOTE_TOTAL_HARD_CEIL,
    `预算 ${NOTE_TOTAL_BUDGET} 被调高到冻结高水位 ${NOTE_TOTAL_HARD_CEIL} 之上——**放宽守卫＝越权项**，` +
    `须支书核可并在批次记录里如实登记（本仓通例：存量基线只许下调）。`);
});

// ── N3–N6 四类存量清单（清单 ≡ 命中集） ─────────────────────────────────────
const CHECKS = [
  {
    n: 'N3', label: '单格过长', baseline: OVERLONG_BASELINE,
    hits: () => ROWS.filter((r) => r.note.length > NOTE_LONG_MAX).map((r) => r.path).sort(),
    why: `单格 > ${NOTE_LONG_MAX} 字`,
    fix: '把该格的历史沿革整段迁入 `.ctx/logs/**`（原地留一句指针），再从基线删掉该 path',
  },
  {
    n: 'N4', label: 'T-编号', baseline: WITH_TID_BASELINE,
    hits: () => ROWS.filter((r) => hasTId(r.note)).map((r) => r.path).sort(),
    why: '备注含 `T-\\d` 编号（T-编号是执行日志的键）',
    fix: '把 T-编号摘出、改为「沿革见 `.ctx/logs/…`」，再从基线删掉该 path',
  },
  {
    n: 'N5', label: '日期复述', baseline: WITH_DATE_ECHO_BASELINE,
    hits: () => ROWS.filter((r) => hasDateEcho(r.note)).map((r) => r.path).sort(),
    why: '备注复述「日期由 X 刷 Y」（改准日期是台账动作，不是备注内容）',
    fix: '删去日期复述句（日期漂移由 `S13` 守），再从基线删掉该 path',
  },
  {
    n: 'N6', label: '批次号罗列', baseline: WITH_BATCH_MENTION_BASELINE,
    hits: () => ROWS.filter((r) => batchMentions(r.note) > BATCH_MENTION_MAX).map((r) => r.path).sort(),
    why: `单格「批次 N」罗列 > ${BATCH_MENTION_MAX} 次（逐批沿革应进 \`.ctx/logs/**\`）`,
    fix: '把逐批沿革整段迁入 `.ctx/logs/**`（备注只留一句指针），再从基线删掉该 path',
  },
];

for (const c of CHECKS) {
  test(`${c.n} ${c.label}：实测命中集 ≡ 存量基线（${c.baseline.length} 条 · 只降不升）`, () => {
    const hits = c.hits();
    const { added, zombie } = diffAgainstBaseline(hits, c.baseline, c.label);
    const msg = [
      `${c.n} 清单与实测不相等（判据：${c.why}）`,
      added.length ? `  ◀ 新增 ${added.length} 处（**新写进去的**，应改为把沿革写进 \`.ctx/logs/**\`）：\n    ${added.join('\n    ')}` : '',
      zombie.length ? `  ▶ 已收敛 ${zombie.length} 处（**件已改好**，请从 \`timestamps-note-baseline.mjs\` 删掉这些 path）：\n    ${zombie.join('\n    ')}` : '',
      `  处置：${c.fix}`,
    ].filter(Boolean).join('\n');
    assert.deepEqual([...added, ...zombie], [], msg);
    // 双向相等（上面只查了差集，这里锁死「既不多也不少」）
    assert.deepEqual(hits, [...c.baseline].sort(),
      `${c.n} 命中集与基线集合不等（条数 ${hits.length} vs ${c.baseline.length}）——见上一条诊断`);
  });
}

// ── N7 反向自检：**非空**清单不得互相冒充（空表不参与比对）─────────────────────
// 2026-10-05 批次 396（支书核可收窄）：原文要求「四份清单**均为非空**且互不相同」，`OVERLONG` 清零后
//   把 `N4`/`N5`/`N6` 也逼到「各留 1 格」——那 1 格是**为满足判据而故意留的沿革**，与 `R-89` 相抵。
//   故收窄为「**非空清单之间互不相同**」⇒ 三条可合法清零（达标态）。
// ⚠ 非空转不靠本条：`N1`（`ROWS_MIN`）＋ `N2`（预算 ＋ 冻结高水位）＋ `N3`–`N6` 的**清单 ≡ 命中集**双向相等
//   仍各自成闸（清空清单不能掩盖命中：命中非空而清单被清 ⇒ 判红）。
test('N7 台账自检：**非空**清单互不相同（空表不参与比对 · 2026-10-05 支书核可收窄）', () => {
  for (const c of CHECKS) {
    assert.ok(Array.isArray(c.baseline),
      `${c.n} 基线不是数组——清单结构被改坏`);
  }
  const keys = CHECKS.filter((c) => c.baseline.length > 0)
    .map((c) => [...c.baseline].sort().join('|'));
  assert.equal(new Set(keys).size, keys.length,
    '非空清单内容完全相同——判据之间可能互相冒充（`R-77`），请核对各自的筛选正则');
});
