// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  server/test/sweep-shard.mjs — 「测试分片」**单源**（2026-10-03 批次 360 · `D-753`「择其精要」）
//
//  口径（见 `CLAUDE.md R-85` 改准 ＋ `.ctx/logs/2026-10-DECISION_LOG.md` `D-753`）：
//    · **目标**：单次 `npm test` 的**墙钟 ≤10 分钟**（改前实测 **1374 s ≈ 22.9 分钟**）。
//    · **手段**：**分片轮跑**——把「真机 / 浏览器」类用例切成 `SHARD_COUNT` 片，**每次只跑一片**；
//      `npm run test:full`（＝`SWEEP_SHARD=all`）跑**全量**（发布前 / 择日 / 大批改动）。
//    · **为什么不删判据面**（`H30`）：`D-753` 明写「**不得以删守卫换时间**」。分片**一条用例都不删**——
//      它只改「这一次跑哪些」；全量档仍在，且**四片并集 ≡ 全量**（由 `suite-shard.test.mjs` 钉死）。
//    · **为什么非 e2e 每片都全跑**：纯 node 用例只占 ≈1.5 分钟（实测 <0.5 s 的 743 件合计仅 29 s）
//      ⇒ 切它们没意义，反倒会让「快判据」漏跑。**分片只切 e2e**。
//
//  ⚠ 已知代价（如实登记，不假装无副作用）：单次默认**不覆盖全部 e2e** ⇒ 某一批的改动若破坏了
//    **另一片**里的 e2e，本批的 `npm test` 可能绿、要到轮转到那一片才红。缓解两条：
//    ① **按改动面选片**：`$env:SWEEP_SHARD=<k>` 可指定；改到某台/某线时**必须**选覆盖它的片（`R-85` 改准已写）；
//    ② `npm run test:full` 在**发布前 / 每若干批**跑一次（全量）。
// ════════════════════════════════════════════════════════════════
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/** 片数（分片单源；改它必须同批改 `run-suite.mjs` 的说明与 `R-85`） */
export const SHARD_COUNT = 4;

/**
 * 每一片跑哪些**工作台**。
 * 用途：① 注入 `form-loop-sweep.test.mjs` 的 `FORM_LOOP_PAGES`（按 `flow.page` 过滤）；
 *       ② `run-suite.mjs` 打印用（让人一眼看出本片覆盖哪台）。
 * ⚠ 取值必须与 `form-loop-registry.mjs` 里 `flow.page` 的取值域**完全一致**（`secretary` / `org` /
 *   `prop` / `disc` / `leader` / `visitor` / `party-committee`）；写错会被 `form-loop-sweep::S7` 判红
 *   （页名一条 flow 都没命中＝真机用例静默归零）。
 */
export const SHARD_PAGES = {
  1: ['secretary'],
  2: ['org', 'prop'],
  3: ['disc', 'leader'],
  4: ['visitor', 'party-committee'],
};

/**
 * 每一片跑哪些**其它 e2e 文件**（不含 `form-loop-sweep.test.mjs` 与 `page-sweep`/`copy-screen-guard`
 * 逐台族——前者按 `FORM_LOOP_PAGES` 切，后两者整件只在本片跑一次）。
 * ⚠ **并集判据**：`{form-loop-sweep} ∪ 四片并集 ∪ {page-sweep, copy-screen-guard}` 必须**恰好等于**
 *   磁盘上全部「含 `from 'playwright'` 的测试文件」⇒ 新增 e2e 文件**未归片即红灯**
 *   （由 `suite-shard.test.mjs` 机械核对；这是本机制**唯一**的防漏网手段）。
 */
export const SHARD_E2E_FILES = {
  1: [
    'agenda-closure.test.mjs',
    'agenda-flow.test.mjs',
    'click-cost.test.mjs',
    'async-vote.test.mjs',
    'online-committee.test.mjs',
  ],
  2: [
    'page-sweep.test.mjs',
    'module-load.test.mjs',
    'block-canvas-e2e.test.mjs',
    'block-config-ui-e2e.test.mjs',
    'block-entry-guard-e2e.test.mjs',
    'block-manifest.test.mjs',
  ],
  3: [
    'copy-screen-guard.test.mjs',
    'multi-user-write.test.mjs',
    'multi-tab-sync.test.mjs',
    'records-endpoints.test.mjs',
    'relation-matrix.test.mjs',
    'inspection-loop-e2e.test.mjs',
    'preferences.test.mjs',
  ],
  4: [
    'party-committee.test.mjs',
    'party-committee-dispatch.test.mjs',
    'party-committee-review.test.mjs',
    'help-e2e.test.mjs',
    'link-integrity.test.mjs',
    'list-filter-chip-e2e.test.mjs',
    'today-action-groups-e2e.test.mjs',
    'self-profile-e2e.test.mjs',
    'write-grant-prompt-e2e.test.mjs',
    'write-hover-e2e.test.mjs',
    'copy-anchor-guard-e2e.test.mjs',
    'module-config-e2e.test.mjs',
    'b3-1-makeup-writeback.test.mjs',
    'mock-integrity.test.mjs',
    'issue-anonymity.test.mjs',
    'e2e-login.test.js',
  ],
};

/** 恒在「本片」里跑的 e2e 文件（按 `SHARD_PAGES` 逐台切片的那一件） */
export const ALWAYS_E2E = ['form-loop-sweep.test.mjs'];

// ── 发现与判定（**单源**：`run-suite.mjs` 与 `suite-shard.test.mjs` 共用，防两套口径）────────
/** e2e 判定标记（含它即视为「浏览器类」⇒ 进分片池） */
export const E2E_MARKER = "from 'playwright'";

/** 与 `node --test` 默认发现规则一致（本仓测试平铺在 `test/` 下，无子目录；仍递归以防将来分层） */
const TEST_PATTERNS = [
  /\.test\.(js|cjs|mjs)$/,
  /-test\.(js|cjs|mjs)$/,
  /_test\.(js|cjs|mjs)$/,
  /^test-.*\.(js|cjs|mjs)$/,
];

/**
 * 列出测试目录下全部测试文件（相对路径、`/` 分隔、已排序），并分「e2e / 非 e2e」两类。
 * @param {string} testDir 绝对路径
 * @returns {{ all: string[], e2e: string[], nonE2e: string[] }}
 */
export function discoverTestFiles(testDir) {
  const all = readdirSync(testDir, { recursive: true })
    .map((p) => String(p).replace(/\\/g, '/'))
    .filter((name) => TEST_PATTERNS.some((re) => re.test(name)))
    .sort();
  const e2e = all.filter((rel) => readFileSync(join(testDir, rel), 'utf8').includes(E2E_MARKER));
  const nonE2e = all.filter((rel) => !e2e.includes(rel));
  return { all, e2e, nonE2e };
}

/** 分片池的**应有全集**＝`ALWAYS_E2E` ∪ 四片登记值（顺序去重） */
export function shardBaselineFiles() {
  const out = [...ALWAYS_E2E];
  for (let k = 1; k <= SHARD_COUNT; k++) for (const f of (SHARD_E2E_FILES[k] || [])) if (!out.includes(f)) out.push(f);
  return out;
}

/** 解析 `SWEEP_SHARD`：`1..SHARD_COUNT` | `all`（缺省 `1`）。非法值**显式报错**（不静默退回默认） */
export function parseShard(raw = process.env.SWEEP_SHARD) {
  const s = String(raw ?? '').trim() || '1';
  if (s === 'all') return { mode: 'all', shard: null };
  const n = Number(s);
  if (!Number.isInteger(n) || n < 1 || n > SHARD_COUNT) {
    throw new Error(`SWEEP_SHARD 非法：「${raw}」——只能是 1..${SHARD_COUNT} 或 all`);
  }
  return { mode: 'shard', shard: n };
}
