// server/test/docs-governance-guard.test.mjs — 文档治理守卫（2026-10-24 批次 509）
//
// 本文件由 `frontmatter-freshness.test.mjs` / `timestamps-note-guard.test.mjs` / `doc-line-ref.test.mjs`
// 合并而来（2026-10-24 批次 509）。原三件的断言**逐条搬入**，未删一条；仅把重复的读文件 / 解析
// 工具收成一份，并新增 ④–⑧ 五条「目录 README / AGENTS / SNAPSHOT 小结 / 判例索引 / 非空转下限」。
//
// 为什么做一个而不是四个：
//   文档类断言的**失败根因相同**——某份文件或某个目录的元数据不一致（frontmatter 日期、TIMESTAMPS
//   表行、README 章节、AGENTS 段落、判例索引列、SNAPSHOT 小结段）。拆成四个文件只会在红的时候多一次
//   「该去哪个文件找」的跳转，并不会让定位更准；合在一个文件里，报错信息仍逐条带**文件路径 + 根因关键词**，
//   定位粒度不变。`doc-consistency.test.mjs` 保持独立：它覆盖 S1–S20 的跨仓口径（页面 / 角色 / 路由 /
//   可数事实对账），体量与检查对象都不同，不在本次合并内。
//
// 覆盖范围（如实标注）：
//   · F1/F2 只核 `content/**`（R-83 债所在面）；`.ctx/**` / `docs/**` / 根 md 不在 F2 内。
//   · R1–R6 只核 `README-server.md` 的 `文件:行号` 取证引用。
//   · ④ 的「7 字段」只对 `content/**` 目录 README 强制（那是 2026-10-24 建立的目录 README 模板）；
//     `docs/` / `deploy/` 同构但不强判，`.ctx/README.md` / `server/README.md` 是操作索引，不套该模板。
//   · ⑤ 的 AGENTS 清单是当前 6 份（`.ctx` / `content/04_web_design` / `content/05_ai_coding` /
//     `docs/src` / `server` / `server/test`）；新增目录 AGENTS 须同批把路径加进 `AGENT_FILES`。
//
// 运行：`node --test server/test/docs-governance-guard.test.mjs`（纯 node；F2 需完整克隆，无 git 只报不判）
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import { execFileSync } from 'node:child_process';

import {
  NOTE_TOTAL_BUDGET, NOTE_TOTAL_HARD_CEIL, NOTE_LONG_MAX, BATCH_MENTION_MAX, ROWS_MIN,
  OVERLONG_BASELINE, WITH_TID_BASELINE, WITH_DATE_ECHO_BASELINE, WITH_BATCH_MENTION_BASELINE,
} from './timestamps-note-baseline.mjs';
import {
  loadTerminology, makeLabelIndex, TERMINOLOGY_REL, stripComments,
  extractCapabilityTabs, extractInsightSegments, extractInsightCallers, extractStructuralLabels,
  definitionSentenceHits,
} from './terminology-map.mjs';
import {
  REASON_CATEGORIES, STRUCTURAL_LABEL_BASELINE, TAB_LABEL_EXEMPTIONS,
  LEGACY_INSIGHT_CALLERS, DEPRECATED_COPY_BASELINE, DEPRECATED_COPY_EXEMPTIONS,
  DEFINITION_DUP_EXEMPTIONS,
} from './terminology-baseline.mjs';

const ROOT = join(import.meta.dirname, '..', '..');
const TIMESTAMPS = join(ROOT, '.ctx', 'TIMESTAMPS.md');
const DOC_MAP = join(ROOT, 'content', '03_doc_system', 'DOC_MAP.md');
const CASES_INDEX = join(ROOT, 'content', '03_doc_system', 'CASES_INDEX.md');
const SNAPSHOT = join(ROOT, '.ctx', 'SNAPSHOT.md');
const read = (f) => readFileSync(f, 'utf8');
const DATE_RE = /20\d{2}-\d{2}-\d{2}/g;

// ═════════════════════════════════════════════════════════════════════════════
// 一、frontmatter / TIMESTAMPS 日期新鲜度（原 `frontmatter-freshness.test.mjs` · F1–F3）
// ═════════════════════════════════════════════════════════════════════════════
//
// 来源（支书指令「先解决 S13 阈值下调和 R-83 债务」；`CLAUDE.md R-83` / H40 检查清单第 6 条）：
//   `R-83` 的口径＝**改过文件必须刷 `frontmatter.last_updated`**。而 `S13` 只核「**`TIMESTAMPS.md` 表行 ＝
//   frontmatter**」（两处同值即绿）——**两边都是旧值 ⇒ `S13` 绿，但元数据是假的**。这正是长期积下的债：
//   近期多个合并批因「`content/**` 当时属禁改面 / 怕破 `S13`」，**只给表行加注、没刷日期** ⇒ 一批 `content/**`
//   文件**实际改过、日期却停在旧值**（实读发现 38 份）。
//
// 本件＝把 `R-83` 从「靠人记」变成「机械可核」，两条判据（一 git-free、一 git）：
//   **F1（git-free，任何环境都能跑）**：`content/**` 的 `TIMESTAMPS.md` 登记行（文件仍存在者）**表行日期
//     不得早于该行备注里出现的任何日期**——「只加注、不刷日期」的痕迹就是「备注里写着一个更晚的日期，
//     而日期列还停在旧值」。抽取面有下限（防判据被写坏 ⇒ 恒真）。
//   **F2（git）**：`content/**` 里带 frontmatter 的 `.md`，其 `last_updated` **不得早于该文件最后一次提交日**
//     （`git log -1 --format=%ad --date=short`）＝`R-83` 判据①；且**工作树干净**者**不得晚于**该提交日
//     （未提交改动会让工作树 dirty —— dirty 时这一半不判，留给「改动人为真」的正常状态）。
//
// ⚠ **依赖 git 的代价（如实标注）**：
//   · 本件 `F2` 需要 **完整克隆**（`git log` 要能遍历到该文件的历史）；**浅克隆（`--depth=1`）**下多数文件的
//     `git log -1 -- <file>` 取不到日期 ⇒ `F2` 会因「抽取面不足」判红（**不是恒绿**）——这是刻意的：取不到
//     证据时**报红并要求用完整克隆**，好过静默通过。
//   · **降级行为**：若 `git` 不可用 / 不在仓库内（`git rev-parse --is-inside-work-tree` 失败）⇒ `F2`
//     **只报不判**（`console.warn` 一行说明，直接返回，不断言）——不制造「无 git 环境恒红」。`F1` 与 git 无关，
//     照常判。
//   · 守卫生效位置：本地/CI **用完整克隆**跑即可；`npm test` 的其余文件不依赖本件取数。
//
// 覆盖边界（如实标注）：本件只核 `content/**`（**债所在面**，也是本批唯一被授权刷卡的 `content/**`
//   frontmatter）；`.ctx/**` / `docs/**` / 根 md 的同纪律**未覆盖**——那一半要么属历史留痕（禁改）、要么需另批授权。
//
// 「以后新批怎么记」（落此头注，`R-83` 的一句规矩）：**合并 / 改引用的批，必须同批刷 `frontmatter.last_updated`
//   并同步 `TIMESTAMPS.md` 对应表行**（两处同值）；**守卫会抓**——没刷的会被 `F1`（备注日期 > 表行日期）或
//   `F2`（`last_updated` < 最后提交日）判红。

/** 纯判据（F2）：给 {fmDate, gitDate, dirty} 返回问题串（null＝取不到 git 信息 ⇒ 只报不判） */
export function freshnessProblems({ rel, fmDate, gitDate, dirty }) {
  if (!gitDate) return null; // 无 git 信息：不判（由调用方决定「抽取面不足即红」）
  const out = [];
  if (fmDate && fmDate < gitDate) {
    out.push(`${rel}：frontmatter last_updated 写 ${fmDate}，但该文件最后一次提交是 ${gitDate}` +
      `——改了没刷卡（「R-83」：提交后必刷 frontmatter，并同步 TIMESTAMPS 表行）`);
  }
  if (!dirty && fmDate && fmDate > gitDate) {
    out.push(`${rel}：frontmatter last_updated 写 ${fmDate}，晚于最后一次提交 ${gitDate}，而工作树无未提交改动` +
      `——日期超前（疑似「全刷今天」式假账），请按真实改动日改准`);
  }
  return out;
}

/** git 是否可用且当前在仓库工作树内 */
function gitUsable() {
  try {
    return execFileSync('git', ['rev-parse', '--is-inside-work-tree'], { cwd: ROOT, encoding: 'utf8' }).trim() === 'true';
  } catch {
    return false;
  }
}

/** 某文件的最后一次提交日（`YYYY-MM-DD`）；取不到给 null */
function gitLastDate(rel) {
  try {
    return execFileSync('git', ['-c', 'core.quotepath=false', 'log', '-1', '--format=%ad', '--date=short', '--', rel], { cwd: ROOT, encoding: 'utf8' }).trim() || null;
  } catch {
    return null;
  }
}

/** 一次 `git log` 取 `content/**` 每个文件的最后一次提交日（新→旧遍历，首次见到即最后一次；省去逐文件进程开销） */
function contentLastDates() {
  const out = execFileSync('git',
    ['-c', 'core.quotepath=false', 'log', '--format=%x01%ad', '--date=short', '--name-only', '--', 'content'],
    { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  const map = new Map();
  let date = null;
  for (const line of out.split(/\r?\n/)) {
    if (line.startsWith('\x01')) { date = line.slice(1).trim(); continue; }
    const p = line.trim();
    if (!p || !date) continue;
    if (!map.has(p)) map.set(p, date);
  }
  return map;
}

/** 工作树里被改动（含未跟踪）的仓库相对路径集合 */
function dirtySet() {
  try {
    return new Set(execFileSync('git', ['-c', 'core.quotepath=false', 'status', '--porcelain'], { cwd: ROOT, encoding: 'utf8' })
      .split(/\r?\n/).filter(Boolean)
      .map((l) => l.slice(3).trim().replace(/^"(.*)"$/, '$1').replace(/\\/g, '/'))
      .filter((p) => !p.includes(' -> ')));
  } catch {
    return new Set();
  }
}

// ── F1 git-free：备注里出现的日期，不得晚于表行日期 ────────────────────────────────

test('F1 「只加注、不刷日期」的痕迹：content/** 登记行的表行日期不得早于该行备注里的任何日期', () => {
  const rows = [];
  for (const line of read(TIMESTAMPS).split(/\r?\n/)) {
    if (!line.startsWith('|')) continue;
    const c = line.split('|').map((s) => s.trim());
    if (c.length !== 7 || !/^\d{4}-\d{2}-\d{2}/.test(c[2]) || c[1] === '文件路径') continue;
    rows.push({ path: c[1], date: c[2].slice(0, 10), note: c[5] });
  }
  const targets = rows.filter((r) => r.path.startsWith('content/') && !r.path.includes('*'));
  assert.ok(targets.length >= 30,
    `只解析到 ${targets.length} 条 content/** 登记行（基线 30）：判据或表结构被写坏，F1 会变成恒真`);

  const problems = [];
  let compared = 0;
  for (const r of targets) {
    if (!statSync(join(ROOT, r.path), { throwIfNoEntry: false })?.isFile()) continue; // 已删除行交给 S13 管
    const dates = (r.note.match(DATE_RE) || []);
    if (!dates.length) continue;
    compared++;
    const late = dates.filter((d) => d > r.date);
    if (late.length) {
      problems.push(`${r.path}：表行写 ${r.date}，但备注里出现更晚的日期 ${[...new Set(late)].sort().join(' / ')}` +
        `——「只加注、不刷日期」（「R-83」：表行日期须随文件改动日刷新，不是只写一句备注）`);
    }
  }
  assert.ok(compared >= 20, `只比对到 ${compared} 条带日期的 content 登记行（下限 20）：抽取面被写坏`);
  assert.deepEqual(problems, [], `content/** 登记行「备注日期晚于表行日期」（改了却没刷日期）：\n  ${problems.join('\n  ')}`);
});

// ── F2 git：frontmatter.last_updated 不得早于该文件最后一次提交日 ────────────────────

test('F2 frontmatter.last_updated 不得早于该文件最后一次提交日（git；浅克隆会判红、无 git 只报不判）', () => {
  // 收集 content/** 里带 frontmatter 的 .md
  const files = [];
  (function walk(dir) {
    for (const n of readdirSync(dir)) {
      const f = join(dir, n);
      if (statSync(f).isDirectory()) { walk(f); continue; }
      if (!n.endsWith('.md')) continue;
      const src = read(f);
      const fm = /^---\r?\n([\s\S]*?)\r?\n---/.exec(src)?.[1];
      if (!fm) continue;
      const fmDate = /^last_updated:[ \t]*["']?(\d{4}-\d{2}-\d{2})/m.exec(fm)?.[1];
      if (!fmDate) continue;
      files.push({ rel: relative(ROOT, f).replace(/\\/g, '/'), fmDate });
    }
  })(join(ROOT, 'content'));
  assert.ok(files.length >= 30, `只收集到 ${files.length} 份带 frontmatter 的 content/** .md（基线 30）：扫描范围异常`);

  if (!gitUsable()) {
    console.warn('[F2] git 不可用 / 不在仓库内 ⇒ 只报不判：跳过「frontmatter ↔ 最后提交日」判据（F1 仍照常判）');
    return;
  }

  const dirty = dirtySet();
  const lastDates = contentLastDates();
  const problems = [];
  let checked = 0;
  const noInfo = [];
  for (const e of files) {
    const gitDate = lastDates.get(e.rel) ?? gitLastDate(e.rel);
    const got = freshnessProblems({ ...e, gitDate, dirty: dirty.has(e.rel) });
    if (got === null) { noInfo.push(e.rel); continue; }
    checked++;
    problems.push(...got);
  }

  // 抽取面下限：git 可用却大量取不到日期 ⇒ 多半是浅克隆（`--depth=1`）⇒ **判红并指名**，不静默放过
  assert.ok(checked >= 30,
    `git 可用，但只有 ${checked} 份文件取到最后提交日（基线 30）：疑似浅克隆（--depth=1）或文件未跟踪` +
    `——请用**完整克隆**跑（取不到 git 信息的：${noInfo.slice(0, 10).join(' / ')}${noInfo.length > 10 ? ' …' : ''}）`);
  assert.deepEqual(problems, [], `content/** 存在「改了但没刷卡」（或「日期超前」）：\n  ${problems.join('\n  ')}`);
});

// ── F3 非空转：纯判据的正负例（防判据写反 ⇒ 恒真/恒假）─────────────────────────────

test('F3 非空转：freshnessProblems 正负例（相等→过 · 早于→红 · 干净且晚于→红 · dirty 且晚于→过）', () => {
  // 正例：表行＝最后提交日（正常态）
  assert.deepEqual(freshnessProblems({ rel: 'x', fmDate: '2026-09-26', gitDate: '2026-09-26', dirty: false }), []);
  // 负例①：改了没刷卡（fm 早于最后提交日）
  const a = freshnessProblems({ rel: 'x', fmDate: '2026-09-22', gitDate: '2026-09-26', dirty: false });
  assert.equal(a.length, 1, '改了没刷卡必须判红');
  assert.match(a[0], /改了没刷卡/);
  // 负例②：干净却写了更晚的日期（疑似假账）
  const b = freshnessProblems({ rel: 'x', fmDate: '2026-09-27', gitDate: '2026-09-26', dirty: false });
  assert.equal(b.length, 1, '工作树干净却日期超前必须判红');
  assert.match(b[0], /日期超前/);
  // 例外：有未提交改动时，fm 晚于最后提交日是**正常**（本批刚改、尚未提交）
  assert.deepEqual(freshnessProblems({ rel: 'x', fmDate: '2026-09-27', gitDate: '2026-09-26', dirty: true }), []);
  // 无 git 信息 ⇒ 只报不判（返回 null）
  assert.equal(freshnessProblems({ rel: 'x', fmDate: '2026-09-22', gitDate: null, dirty: false }), null);
});

// ═════════════════════════════════════════════════════════════════════════════
// 二、TIMESTAMPS「备注列预算」（原 `timestamps-note-guard.test.mjs` · N1–N7）
// ═════════════════════════════════════════════════════════════════════════════
//
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

/** 解析（口径与 doc-consistency::S13 一致：5 列表行、第 3 列为日期、表头行排除） */
function parseRows() {
  const rows = [];
  for (const line of read(TIMESTAMPS).split(/\r?\n/)) {
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

// ═════════════════════════════════════════════════════════════════════════════
// 三、README-server「文件:行号」取证断言（原 `doc-line-ref.test.mjs` · R1–R6）
// ═════════════════════════════════════════════════════════════════════════════
//
// 来源（支书第 ⑥ 条）：「我们在根目录的 README 文档的开头新置一个链接，就是针对后台对接的说明文件——README-server，
//   后端那边需要完整过一下这个系统的背景以及后端所有的【角色、功能、板块、字段说明】！每一项都需要！！」
//   README-server.md 是**给外部后端对接团队**的一站式说明书（背景 / 角色 / 功能板块 / 字段 / 部署 / 接口 / 已知限制），
//   它的取证手段是正文里 **380 处 `文件:行号` 引用**——**引用失效＝后端照着找不到东西**。
//
// 病灶（批次 107 实测）：批次 106 只核了 8 处（自己改动的影响面）+ 抽样，其余未逐条核，并登记「不假装覆盖」。
//   本批先造验证器、再逐条核，实测：
//     ① **指针失效 3 处**——2 处指向空行（`DATA_MODEL.md:1038` / `:1098`）、1 处行号越界（`sopData.js:117-133`，该文件实 131 行）；
//     ② **行号漂移 2 处**——`docs/src/core/domain/domain.js:267` 实为 `:266`（`handoffs: []` 在第 266 行）；
//     ③ **区间越到下一节 16 处**——md 区间末行落在**下一节的标题行**上（如 `DATA_MODEL.md:510-548`，548 是 `### 2.15` 的标题）；
//     ④ **内容过期 1 处**——正文写 `sopData.js` 有 **24 条** `timeOffset: null`，实测 **6 条**（115-116、123-126 行）。
//
// 判据（三级，逐条无容差；「印证」判不了的部分**如实标注不计入**，见 R2 的边界）：
//   **R1 一级＝指针指向真实位置**：每条引用能解析成真实文件（含**短式引用** `:192`——承前一个完整引用的文件；
//       含**逗号续列** `:44,161`）、行号落在该文件行数内、区间内**至少一个非空行**。
//   **R2 二级＝符号能印证**：引用后**紧跟的括注**里若写了反引号标识符（如 `constants.js:185-191`（`ROLE_KEYS`）），
//       该标识符必须出现在**声明区间内**。⚠ 边界：括注写「概念名」而非「区间内出现的标识符」时会误报
//       （当前 1 条，逐条给理由进 `ANCHOR_EXCEPTIONS`）；括注本身缺失（纯中文说明 / 无括注）的**不判**——
//       那一半只能靠人读（本批逐条读过，见执行日志）。
//   **R3 三级＝md 区间不越节**：(a) 区间**末个非空行不得是 markdown 标题**（标题是**下一节**的题目，
//       落在区间里＝区间多吞了一行）；(b) 若区间**起点是标题**，则区间内（起点之外）**不得再出现同级/更高级标题**
//       （防「一个区间跨两节」）。仅对 `.md` 引用生效。
//   **R4 关键词型取证仍成立**：正文里「X 零命中 / X 在代码中检索不到消费点」这类**按关键词取证**的断言，
//       机器可复核者逐条核对（当前 2 条：`副组长` 在 `docs/` 的**命中集＝身份载体白名单**〔2026-09-21 批次 139
//       `D-571` 由「零命中」改准——副组长已是系统身份键〕；`AI_API_BASE_URL` 在代码中无消费点）。
//       ⚠ **为什么不把「换一种说法」也做进来**：换说法的旧口径**机检不了**——如 `README-members.md` 写
//       「开本组活动、**上传本组考勤与考察**」（语义＝组长上传），**不含字面串「组长上传」**，grep 永远扫不到；
//       而「角色名 + 动作词」共现是**正常中文**（该句本身是对的），机器无法据此判错 ⇒ 这一半落**纪律**
//       （`CLAUDE.md` `R-87`「关键词反查只覆盖字面层；换说法必须人工通读」），**本守卫不越界假装覆盖**。
//   **R5 非空转**：引用总数 / 被引文件数 / 带锚点引用数三条基线 + 白名单不得僵尸化，
//       防「正则失效 ⇒ 一条都解析不到 ⇒ 断言恒真」把守卫悄悄写空。
//
// 覆盖边界（如实标注）：本守卫只核 `README-server.md`；`README.md` / `README-members.md` / `content/**` 里的
//   同类引用**不在本守卫范围**（那几份的引用另有 `link-integrity` 的链接层校验，行号层未覆盖）。
//
// 批次 111（2026-09-20）后续说明：`DATA_MODEL.md` §2.1 补 8 个字段行 ⇒ 该文件第 53 行起整体下移 8 行；
//   README-server.md 内指向 `DATA_MODEL.md` 的行号引用**共 45 处（分布 41 行）**，其中 **44 处已同批 +8 平移**
//   （`27-53` 一并收敛为 `27-60`），1 处（`deliverableIds` 的 `:47`）落在插入点之上、不动。
//   本守卫**改前/改后实测计数不变**（引用 382 = 全式 337 + 短式 45 · 被引文件 63 · 带锚点 36 · md 多行区间 66）
//   ⇒ R1–R5 的基线常量无需调整，此处仅留记录。上方「批次 107 病灶」里的示例行号是**当时的取值**（历史留痕），未随本次位移改写。
//
// 批次 147（2026-09-22）后续说明：本批**加一道「语义漂移」防线**，并顺手收紧 R2 的两处假绿——
//   ① **R2 收紧**：原判据是「**子串包含** + 至少一个锚命中（`some`）」，两种假绿：
//      〔子串〕括注写 `ROLE_KEYS` 时，区间里只要出现 `ROLE_LEGACY_KEYS`（含该子串）就算命中；
//      〔some〕括注列多个锚点（如 `signupEnabled` / `requireMakeup`）时，**只有一个**在区间内就放行。
//   ② **新增 R6（语义漂移防线）**——补的正是 R1–R5 抓不到的那一类：「**行号区间指到的内容与该引用声称的不符**」。
// 批次 234（2026-09-28）后续说明：`server/routes/resources.js`（1301 行单文件）按内聚切分为
//   `server/routes/resources/` 六件 ⇒ README-server.md 里指向它的引用**必须逐条改签到具体文件**。
//   实测：短式由 45 条降到 **34** 条；R1–R3 改后全绿，R6 亦未新增。⇒ 本条只下调 R5 的**短式**下限（40 → 30）。

const TARGET = join(ROOT, 'README-server.md');

/** 引用里认的文件扩展名（`.env.example` 之类点名到扩展的也算） */
const EXT = 'js|mjs|md|html|json|css|yml|yaml|txt|ps1|example';
/** 完整引用：`文件:12` / `文件:12-34` / `文件:12,34` / `文件:12-34,56` */
const FULL_REF = new RegExp(`([A-Za-z0-9_./-]+\\.(?:${EXT})):((?:\\d+(?:\\s*[-–]\\s*\\d+)?)(?:\\s*,\\s*\\d+(?:\\s*[-–]\\s*\\d+)?)*)`, 'g');
/** 短式引用：`:12`（承前一个完整引用的文件） */
const SHORT_REF = /(?<![A-Za-z0-9_./-]):((?:\d+(?:\s*[-–]\s*\d+)?)(?:\s*,\s*\d+(?:\s*[-–]\s*\d+)?)*)/g;

/** 二级判据的例外（逐条给理由；R5 会核它们不是僵尸、也不会悄悄变多） */
const ANCHOR_EXCEPTIONS = [
  {
    ref: 'docs/src/services/activity/vote-config.js:41,44',
    why: '括注（`voteConfig` 取值）写的是**概念名**：41/44 行是 defaultVoteConfig 的两个 return 字面量（取值即 voteConfig），' +
      '而「voteConfig」这个词只出现在函数名 defaultVoteConfig 与该函数上方注释里，不在 41/44 行内 —— 引用本身是对的，是判据的启发式够不到。',
  },
];

/** 排除的目录：历史留痕与依赖不进「按 basename 解析短名引用」的候选集 */
const SKIP_DIRS = new Set(['node_modules', '.git', '.trae', '.vscode', '.superpowers', '.ctx', 'uploads']);

/** basename → 仓库相对路径（用于解析 `DEPLOYMENT_GUIDE.md:239` 这类省略目录的引用） */
const basenameIndex = new Map();
(function walkForBasenames(dir) {
  for (const n of readdirSync(dir)) {
    if (SKIP_DIRS.has(n)) continue;
    const f = join(dir, n);
    if (statSync(f).isDirectory()) { walkForBasenames(f); continue; }
    if (!basenameIndex.has(n)) basenameIndex.set(n, []);
    basenameIndex.get(n).push(relative(ROOT, f).replace(/\\/g, '/'));
  }
})(ROOT);

/** 解析引用的文件（绝对路径）；解析不到返回 null（解析到多处同名文件也算解析不到——口径从严） */
function resolveRef(p) {
  const direct = join(ROOT, p);
  if (existsSync(direct) && !statSync(direct).isDirectory()) return direct;
  const cands = basenameIndex.get(p.split('/').pop()) || [];
  return cands.length === 1 ? join(ROOT, cands[0]) : null;
}

/** `12-34,56` → [{a:12,b:34},{a:56,b:56}] */
function parseRanges(s) {
  return s.split(/\s*,\s*/).map((part) => {
    const m = /^(\d+)(?:\s*[-–]\s*(\d+))?$/.exec(part.trim());
    return { a: Number(m[1]), b: m[2] ? Number(m[2]) : Number(m[1]) };
  });
}

/** 引用后紧跟的括注里的反引号标识符（用于二级判据）；取不出锚点＝该条不判 */
function anchorsOf(tail) {
  const out = new Set();
  for (const m of tail.matchAll(/`([^`]+)`/g)) {
    let t = m[1].trim();
    if (/[/\\]/.test(t) || /[\u4e00-\u9fa5]/.test(t) || /\s/.test(t)) continue; // 路径 / 中文 / 含空格（如 `timeOffset: null`）不算锚点
    if (t.includes('::')) t = t.split('::').pop();
    t = t.replace(/\(.*\)$/, '');
    if (/^[A-Za-z_$][A-Za-z0-9_$.]*$/.test(t)) out.add(t.split('.').pop());
  }
  return [...out].filter((s) => s.length >= 3);
}

/** 该标识符是否**以「词」为单位**出现在区间里（防子串假绿：`ROLE_KEYS` 不该落在 `ROLE_LEGACY_KEYS` 里就算命中） */
function anchorIn(seg, id) {
  const esc = id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(?<![A-Za-z0-9_$])${esc}(?![A-Za-z0-9_$])`).test(seg);
}

/** 逐行抽出全部引用（含短式），并记下「引用后紧跟的括注」供二级判据用 */
function collectRefs() {
  const lines = read(TARGET).split(/\r?\n/);
  const refs = [];
  lines.forEach((line, i) => {
    const evs = [...line.matchAll(FULL_REF)].map((m) => ({ kind: '全式', file: m[1], ranges: parseRanges(m[2]), at: m.index, len: m[0].length }));
    for (const s of line.matchAll(SHORT_REF)) {
      if (evs.some((e) => s.index >= e.at && s.index < e.at + e.len)) continue; // 完整引用内部的冒号
      const before = evs.filter((e) => e.at < s.index).pop();
      if (!before) continue; // 行内无前序完整引用：无从判文件，跳过（不计入基线）
      evs.push({ kind: '短式', file: before.file, ranges: parseRanges(s[1]), at: s.index, len: s[0].length });
    }
    evs.sort((x, y) => x.at - y.at);
    evs.forEach((e, k) => {
      const next = evs[k + 1];
      // 括注＝本条引用之后、下一条引用之前的文字；去掉引用自身的收尾反引号；在句号/分号处截断
      const tail = line.slice(e.at + e.len, next ? next.at : line.length)
        .replace(/^`/, '').replace(/`$/, '')
        .split(/[。；]/)[0];
      refs.push({
        readmeLine: i + 1, kind: e.kind, file: e.file, ranges: e.ranges, tail,
        key: `${e.file}:${e.ranges.map((r) => (r.a === r.b ? String(r.a) : `${r.a}-${r.b}`)).join(',')}`,
      });
    });
  });
  return refs;
}

const REFS = collectRefs();
const REF_FILES = [...new Set(REFS.map((r) => r.file))].sort();
const ANCHORED = REFS.filter((r) => anchorsOf(r.tail).length > 0);

// ── R1 一级：指针指向真实位置 ──────────────────────────────────────────────

test('R1 每条 `文件:行号` 引用都指到真实位置（文件可解析 / 行号在范围内 / 区间非空）', () => {
  const problems = [];
  for (const r of REFS) {
    const where = `README-server.md:${r.readmeLine} ${r.kind} ${r.key}`;
    const abs = resolveRef(r.file);
    if (!abs) { problems.push(`${where} → 文件解析不到（既不在仓库内按该路径存在，也不是唯一 basename）`); continue; }
    const src = read(abs).split(/\r?\n/);
    for (const g of r.ranges) {
      if (g.a < 1 || g.b < g.a) { problems.push(`${where} → 行号区间非法（${g.a}-${g.b}）`); continue; }
      if (g.b > src.length) { problems.push(`${where} → 行号越界（该文件实 ${src.length} 行，引用到 ${g.b}）`); continue; }
      if (!src.slice(g.a - 1, g.b).some((s) => s.trim())) problems.push(`${where} → 指向空行（区间 ${g.a}-${g.b} 全是空行）`);
    }
  }
  assert.deepEqual(problems, [], `README-server.md 的 \`文件:行号\` 引用失效（后端会照着找不到东西）：\n  ${problems.join('\n  ')}`);
});

// ── R2 二级：符号能印证 ────────────────────────────────────────────────────

test('R2 引用后括注里的符号必须逐个出现在声明区间内（词边界匹配；例外仅 1 条且写明理由）', () => {
  assert.ok(ANCHORED.length >= 30, `只解析出 ${ANCHORED.length} 条带符号锚点的引用（基线 30）：解析口径被改坏了，断言会变成假绿`);
  const exempt = new Set(ANCHOR_EXCEPTIONS.map((e) => e.ref));
  const problems = [];
  for (const r of ANCHORED) {
    if (exempt.has(r.key)) continue;
    const abs = resolveRef(r.file);
    if (!abs) continue; // 文件不存在已由 R1 报红
    const src = read(abs).split(/\r?\n/);
    const anchors = anchorsOf(r.tail);
    const seg = r.ranges.map((g) => src.slice(g.a - 1, g.b).join('\n')).join('\n');
    if (!anchors.every((s) => anchorIn(seg, s))) {
      const miss = anchors.filter((s) => !anchorIn(seg, s));
      problems.push(`README-server.md:${r.readmeLine} ${r.key}（区间内未出现 ${miss.map((s) => `\`${s}\``).join(' / ')}）` +
        ` —— 若行号已漂移请改行号；若括注写的是概念名而非区间内标识符，请改写括注或按理由进 ANCHOR_EXCEPTIONS`);
    }
  }
  assert.deepEqual(problems, [], `符号锚点与区间对不上：\n  ${problems.join('\n  ')}`);
  // 白名单不得僵尸化（改好后必须撤下），也不得悄悄变宽
  const zombie = ANCHOR_EXCEPTIONS.filter((e) => !REFS.some((r) => r.key === e.ref)).map((e) => e.ref);
  assert.deepEqual(zombie, [], `ANCHOR_EXCEPTIONS 里有已不存在的引用（僵尸白名单，请删除）：\n  ${zombie.join('\n  ')}`);
  assert.ok(ANCHOR_EXCEPTIONS.length <= 2, `ANCHOR_EXCEPTIONS 涨到 ${ANCHOR_EXCEPTIONS.length} 条（上限 2）：白名单只许逐条给理由、不许悄悄变宽`);
});

// ── R3 三级：md 区间不越节 ─────────────────────────────────────────────────

test('R3 md 区间不得越到下一节（末个非空行不是标题；起点是标题时区间内无同级/更高级标题）', () => {
  const problems = [];
  let checked = 0;
  for (const r of REFS) {
    if (!r.file.endsWith('.md')) continue;
    const abs = resolveRef(r.file);
    if (!abs) continue;
    const src = read(abs).split(/\r?\n/);
    for (const g of r.ranges) {
      if (g.a < 1 || g.b > src.length || g.a === g.b) continue; // 单行 / 越界：由 R1 管
      checked++;
      const seg = src.slice(g.a - 1, g.b);
      let last = seg.length - 1;
      while (last >= 0 && !seg[last].trim()) last--;
      if (last >= 0 && /^#{1,6}\s/.test(seg[last])) {
        problems.push(`README-server.md:${r.readmeLine} ${r.key} → 第 ${g.a + last} 行（末个非空行）是标题「${seg[last].trim().slice(0, 40)}」（标题属下一节，区间应止于本节最后一个内容行）`);
        continue;
      }
      const head = /^(#{1,6})\s/.exec(seg[0]);
      if (!head) continue;
      const lvl = head[1].length;
      for (let k = 1; k < seg.length; k++) {
        const h = /^(#{1,6})\s+(.*)$/.exec(seg[k]);
        if (h && h[1].length <= lvl) {
          problems.push(`README-server.md:${r.readmeLine} ${r.key} → 起点是标题，区间内又出现同级/更高级标题「${h[2].slice(0, 30)}」（区间跨了两节）`);
          break;
        }
      }
    }
  }
  assert.ok(checked >= 55, `只检查到 ${checked} 个 md 多行区间（基线 55：批次 107 实测 66）：解析口径被改坏了`);
  assert.deepEqual(problems, [], `md 区间越到下一节：\n  ${problems.join('\n  ')}`);
});

// ── R4 关键词型取证仍成立 ──────────────────────────────────────────────────

test('R4 「零命中 / 检索不到消费点」类关键词取证仍成立（防取证过期）', () => {
  const DOC_DEPUTY_LEADER_HITS = [
    'docs/help.html',                                        // 帮助：党小组行 + 常设赋权卡（2026-10-04 批次 373 副组长赋权落地）
    'docs/src/capabilities/secretary-workspace.js',           // 支书台 tab 注册（组长 / 副组长行内管理）
    'docs/src/core/domain/constants.js',        // 身份键 / 标签 / 页面映射 / 颜色三处（文件末集中挂载）
    'docs/src/core/domain/function-catalog.js',               // 工作台目录（组长 / 副组长；2026-10-04 批次 373）
    // 2026-10-23 批次 504（R10-B10）：域参数管理权由 POLICY_OVERRIDABLE 派生，`deputy-leader` 作为身份键在此登记。
    'docs/src/core/domain/policy-defaults.js',
    'docs/src/entries/pages/login-entry.js',   // 开发身份卡「党小组副组长」
    'docs/src/entries/tabs/secretary/assign-tab.js',           // 常设赋权面板「身份」选择（组长 / 副组长）
    'docs/src/entries/tabs/secretary/group-progress-tab.js',   // 清单行内双身份展示 + 行内撤销
    'docs/src/entries/tabs/secretary/todo-tab.js',             // 待办深链（组长 / 副组长赋权面板）
    'docs/src/services/core/auth.js',         // 权限集 / 赋权链挂载 + 角色读回
    'docs/src/services/member/group-view.js',   // 「本组组长」解析：组长优先、无组长时才回落副组长
  ].sort();
  const hitsDoc = [];
  (function walk(dir) {
    for (const n of readdirSync(dir)) {
      const f = join(dir, n);
      if (statSync(f).isDirectory()) { walk(f); continue; }
      if (!/\.(js|mjs|json|html|css|md)$/.test(n)) continue;
      if (read(f).includes('副组长')) hitsDoc.push(relative(ROOT, f).replace(/\\/g, '/'));
    }
  })(join(ROOT, 'docs'));
  assert.deepEqual([...hitsDoc].sort(), DOC_DEPUTY_LEADER_HITS,
    `\`docs/\` 内『副组长』命中集与身份载体名单不符，实测命中：${[...hitsDoc].sort().join(' / ')}` +
    `（若确实新增 / 移除了身份载体，请同批改准本名单——并同步 README-server.md §7.3#17 的现状行）`);

  // ② README-server.md §5.3 / §7.3#22：「`AI_API_BASE_URL` 在代码中检索不到消费点（未取证）」→ 复核代码侧
  const codeRoots = [join(ROOT, 'docs', 'src'), join(ROOT, 'server')];
  const hitsCode = [];
  for (const root of codeRoots) {
    (function walk(dir) {
      for (const n of readdirSync(dir)) {
        if (SKIP_DIRS.has(n) || n === 'test') continue; // 测试文件不算「消费点」
        const f = join(dir, n);
        if (statSync(f).isDirectory()) { walk(f); continue; }
        if (!/\.(js|mjs|json|css|html)$/.test(n)) continue;
        if (read(f).includes('AI_API_BASE_URL')) hitsCode.push(relative(ROOT, f).replace(/\\/g, '/'));
      }
    })(root);
  }
  assert.deepEqual(hitsCode, [], `README-server.md 断言「\`AI_API_BASE_URL\` 在代码中检索不到消费点」，实测命中：${hitsCode.join(' / ')}` +
    `（若已接入，须同批改准 §5.3 与 §7.3#22）`);
});

// ── R5 非空转 ──────────────────────────────────────────────────────────────

test('R5 非空转：引用总数 / 被引文件数 / 带锚点引用数均有基线（防正则失效把守卫写成恒真）', () => {
  assert.ok(REFS.length >= 370, `只解析到 ${REFS.length} 条引用（基线 370：批次 107 实测 383 = 全式 338 + 短式 45）：解析口径被改坏，R1–R3 会变成恒真`);
  assert.ok(REF_FILES.length >= 55, `只解析到 ${REF_FILES.length} 个被引文件（基线 55：批次 107 实测 62）：解析口径被改坏`);
  assert.ok(ANCHORED.length >= 30, `带锚点的引用只剩 ${ANCHORED.length} 条（基线 30：批次 107 实测 36）：二级判据在缩水`);
  const shortN = REFS.filter((r) => r.kind === '短式').length;
  assert.ok(shortN >= 30, `短式引用只剩 ${shortN} 条（基线 30：批次 107 实测 45、批次 234 资源切分后实测 34——同行的短式因落到不同新文件而改写为全式）：短式解析被改坏（短式最容易被漏）`);
});

// ── R6 语义漂移防线（2026-09-22 批次 147 新增）────────────────────────────────

/** 行为词（受控、从窄）：出现即＝该引用对「区间里发生了什么」下了断言，必须带可校验锚点 */
const SEMANTIC_CLAIM_WORDS = ['运行时新建', '运行时创建', '运行时生成', '写入点', '写点', '读点', '落库', '唯一源', '单一源'];

test('R6 语义漂移防线：行为词型引用必须带可校验锚点（无锚即红）；弱引用清单有基线上下限', () => {
  const problems = [];
  for (const r of REFS) {
    const hit = SEMANTIC_CLAIM_WORDS.filter((w) => r.tail.includes(w));
    if (hit.length && anchorsOf(r.tail).length === 0) {
      problems.push(`README-server.md:${r.readmeLine} ${r.key}（括注「${r.tail.trim()}」含行为词 ${hit.join(' / ')}，却无任何锚点）` +
        ` —— 请在括注里补一个区间内出现的标识符（函数名 / 字段名 / 常量名），否则这句话与区间对不上时无人能机检`);
    }
  }
  assert.deepEqual(problems, [], `行为词型引用缺可校验锚点（区间指到的内容可能与这句话不符）：\n  ${problems.join('\n  ')}`);

  // (b) 弱引用清单（无锚 ⇒ 只能靠人读）：基线既防判据被改坏（下限），也防它成批变弱（上限）
  const weak = REFS.filter((r) => anchorsOf(r.tail).length === 0);
  assert.ok(weak.length >= 250, `无锚（弱）引用只剩 ${weak.length} 条（下限 250：批次 147 实测 348）：解析口径被改坏，R2 / R6 会变成恒真`);
  assert.ok(weak.length <= 400, `无锚（弱）引用涨到 ${weak.length} 条（上限 400：批次 147 实测 348）：括注里的可校验锚点在缩水——本批只允许逐个补锚、不许成批变弱`);
});

// ═════════════════════════════════════════════════════════════════════════════
// 四、新增：目录 README / AGENTS / SNAPSHOT / 判例索引（2026-10-24 批次 509 · G4–G8）
// ═════════════════════════════════════════════════════════════════════════════
//
// 这五条补的是「索引层」的空白：前三组只核单份文件的内容（frontmatter / 备注列 / README-server），
// 但**目录有没有 README、README 有没有那 7 个标题、AGENTS 有没有可执行命令、SNAPSHOT 有没有当批小结、
// 判例索引有没有域与规范编号**，此前无人机检。失败根因仍是同一类：**某个索引位与文件实况不一致**。

/** 目录 README 的 7 个固定标题（2026-10-24 立；与 `content/**` 各 README 同构） */
const README_FIELDS = ['作用', '不负责什么', '文件清单', '权威源与派生', '知识流向', '是否保留原始材料', '维护触发器'];

/** 6 份 AGENTS 的固定标题（顺序不判，标题必须齐） */
const AGENT_FIELDS = ['读什么', '改什么', '禁什么', '验证命令', '交接口', '常见坑'];

/** 当前全仓 AGENTS.md（2026-10-24 实况：6 份；新增目录须同批加入本清单） */
const AGENT_FILES = [
  '.ctx/AGENTS.md',
  'content/04_web_design/AGENTS.md',
  'content/05_ai_coding/AGENTS.md',
  'docs/src/AGENTS.md',
  'server/AGENTS.md',
  'server/test/AGENTS.md',
];

/** 解析 `DOC_MAP §五 目录作用表`：返回 [{ path, readme, agents }] */
function parseDocMapRows() {
  const src = read(DOC_MAP);
  const start = src.indexOf('## 五、');
  const end = src.indexOf('\n## 六、', start);
  const section = src.slice(start, end > start ? end : undefined);
  const rows = [];
  for (const line of section.split(/\r?\n/)) {
    if (!line.startsWith('|')) continue;
    const c = line.split('|').map((s) => s.trim());
    if (c.length < 7) continue;
    const p = c[1].replace(/`/g, '').trim();
    if (!p || p === '路径' || /^-+$/.test(p)) continue;
    rows.push({ path: p, readme: c[3], agents: c[4] });
  }
  return rows;
}

const DOC_ROWS = parseDocMapRows();
const README_ROWS = DOC_ROWS.filter((r) => r.readme.startsWith('有'));

test('G4 README 覆盖与 7 字段：§五 标「有」的目录必须真有 README，content/** README 七标题齐备', () => {
  assert.ok(DOC_ROWS.length >= 15,
    `只从 DOC_MAP §五 解析到 ${DOC_ROWS.length} 个目录（下限 15）：表格结构被写坏，本条会变成恒真`);
  assert.ok(README_ROWS.length >= 15,
    `§五 标「有」README 的目录只有 ${README_ROWS.length} 个（下限 15）：要么 README 被删，要么列被写坏`);

  const problems = [];
  for (const r of README_ROWS) {
    const rel = `${r.path.replace(/\/$/, '')}/README.md`;
    const abs = join(ROOT, rel);
    if (!existsSync(abs)) {
      problems.push(`${rel} 不存在，但 ${DOC_MAP.slice(ROOT.length + 1)} 的「${r.path}」一行写「有」`);
      continue;
    }
    // 7 字段只对 content/** 目录 README 强制（见文件头「覆盖范围」）
    if (!rel.startsWith('content/')) continue;
    const src = read(abs);
    for (const h of README_FIELDS) {
      if (!new RegExp(`^#{1,6}\\s*${h}\\s*$`, 'm').test(src)) {
        problems.push(`${rel} 缺「${h}」标题（目录 README 模板 7 字段之一）`);
      }
    }
  }
  console.log(`[docs-governance] §五 目录 ${DOC_ROWS.length} 个 · 标「有」README ${README_ROWS.length} 个`);
  assert.deepEqual(problems, [], `目录 README 覆盖 / 7 字段不符：\n  ${problems.join('\n  ')}`);
});

test('G5 AGENTS.md：6 份均存在，含 6 段固定标题与可执行测试命令块', () => {
  assert.equal(AGENT_FILES.length, 6, `AGENT_FILES 清单应为 6 份（当前 ${AGENT_FILES.length}）：增删 AGENTS 须同批改准`);
  const problems = [];
  for (const rel of AGENT_FILES) {
    const abs = join(ROOT, rel);
    if (!existsSync(abs)) { problems.push(`${rel} 不存在`); continue; }
    const src = read(abs);
    for (const h of AGENT_FIELDS) {
      if (!new RegExp(`^##\\s*${h}`, 'm').test(src)) problems.push(`${rel} 缺「## ${h}」段`);
    }
    if (!/```[\s\S]*?(?:node --test|npm run test:)[\s\S]*?```/.test(src)) {
      problems.push(`${rel} 缺含 \`node --test\` 或 \`npm run test:\` 的验证命令代码块`);
    }
  }
  assert.deepEqual(problems, [], `AGENTS.md 结构不符：\n  ${problems.join('\n  ')}`);
});

test('G6 SNAPSHOT 含「批次 509 小结」段', () => {
  const src = read(SNAPSHOT);
  assert.match(src, /^##\s*批次\s*509\s*小结/m,
    '`.ctx/SNAPSHOT.md` 缺「## 批次 509 小结」段——每批收尾必须在 SNAPSHOT 末尾追加 5 行小结（.ctx/README.md §四）');
});

test('G7 判例索引：每条 CASE 行都有「所属域」与「对应规范编号」', () => {
  const rows = read(CASES_INDEX).split(/\r?\n/).filter((l) => /^\|\s*CASE-/.test(l));
  assert.ok(rows.length >= 15, `判例总表只解析到 ${rows.length} 条 CASE 行（下限 15）：表格结构被写坏`);
  const problems = [];
  for (const line of rows) {
    const c = line.split('|').map((s) => s.trim());
    const id = c[1];
    if (c.length < 7) { problems.push(`${id} 列数不足（应 6 列，实 ${c.length - 2}）`); continue; }
    if (!c[3]) problems.push(`${id} 缺「所属域」`);
    if (!c[5]) problems.push(`${id} 缺「对应规范编号」`);
  }
  assert.deepEqual(problems, [], `判例索引缺列：\n  ${problems.join('\n  ')}`);
});

test('G8 非空转下限：目录 ≥15 · AGENTS=6 · 判例 ≥15 · README 覆盖 ≥15', () => {
  const cases = read(CASES_INDEX).split(/\r?\n/).filter((l) => /^\|\s*CASE-/.test(l));
  assert.ok(DOC_ROWS.length >= 15, `§五 目录数 ${DOC_ROWS.length} < 15：解析面被截断`);
  assert.equal(AGENT_FILES.length, 6, `AGENTS 清单 ${AGENT_FILES.length} ≠ 6`);
  assert.ok(cases.length >= 15, `判例数 ${cases.length} < 15：判例索引被删减`);
  assert.ok(README_ROWS.length >= 15, `README 覆盖数 ${README_ROWS.length} < 15：目录 README 被删减或列被写坏`);
});

// ═════════════════════════════════════════════════════════════════════════════
// 五、一 tab 一 H2 / 卡头单一源（2026-10-25 批次 510 · Task 6.1）
// ═════════════════════════════════════════════════════════════════════════════
//
// 病灶（批次 509 遗留）：一个 tab 的页签名被 `renderTabHeader` 渲染成 H2 后，卡内又用一个
//   `<h3>同名</h3>` 逐字复述一次 ⇒ 同一句话在一屏里出现两遍，读者分不清「页面」与「分区」。
// 判据：tab 文件里 `renderTabHeader({ title: '<X>' })` 的 X，不得再以 `<h3>X</h3>`（逐字）出现；
//   卡头允许带范围 / 口径信息（如「在册 50 人」「任务清单（本月）」）。
// 非空转：扫到的 tab 文件数 ≥ 20、通过「不重复」检查的文件 ≥ 6（防扫描面被写坏 ⇒ 本条恒真）。

const TABS_DIR = join(ROOT, 'docs', 'src', 'entries', 'tabs');
/** `renderTabHeader({ ... title: '<X>' ... })`；允许跨行（title 在 `{` 后 400 字符内） */
const TAB_HEADER_RE = /renderTabHeader\s*\(\s*\{[\s\S]{0,400}?\btitle\s*:\s*'([^']+)'/g;

test('G9 一 tab 一 H2：页签名不得在同一文件的卡头 H3 里逐字复述（卡头须带范围信息）', () => {
  const files = [];
  (function walk(dir) {
    for (const n of readdirSync(dir)) {
      const f = join(dir, n);
      if (statSync(f).isDirectory()) { walk(f); continue; }
      if (n.endsWith('.js')) files.push(f);
    }
  })(TABS_DIR);

  const scanned = [];
  const passed = [];
  const problems = [];
  for (const abs of files) {
    const src = read(abs);
    const rel = relative(ROOT, abs).replace(/\\/g, '/');
    const titles = [...src.matchAll(TAB_HEADER_RE)].map((m) => m[1]);
    if (!titles.length) continue;
    scanned.push(rel);
    let bad = false;
    for (const title of titles) {
      const esc = title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      if (new RegExp(`<h3[^>]*>\\s*${esc}\\s*</h3>`).test(src)) {
        problems.push(`${rel}：页签名「${title}」又在卡头 H3 里逐字出现` +
          `——卡头应写范围 / 口径（如「在册 50 人」「任务清单（本月）」），不要复述页签名`);
        bad = true;
      }
    }
    if (!bad) passed.push(rel);
  }

  assert.ok(scanned.length >= 20,
    `只扫到 ${scanned.length} 个使用 renderTabHeader 的 tab 文件（下限 20）：扫描面被写坏，本条会变恒真`);
  assert.ok(passed.length >= 6,
    `只有 ${passed.length} 个 tab 文件通过「不逐字复述页签名」检查（下限 6）：抽取面异常`);
  assert.deepEqual(problems, [], `一 tab 一 H2 被破坏（同一页签名出现两次）：\n  ${problems.join('\n  ')}`);
});

test('G10 卡头单一源：page-frame.js 导出 renderCardHeader，函数体含 h3 与 card-head__title', () => {
  const rel = 'docs/src/components/shell/page-frame.js';
  const src = read(join(ROOT, rel));
  assert.ok(src.length > 1000, `${rel} 只读到 ${src.length} 字符（下限 1000）：读取面被写坏，本条会变恒真`);
  assert.match(src, /export function renderCardHeader\s*\(/,
    `${rel} 未导出 renderCardHeader（卡头单一源）——各 tab 会退回手写 <div class="card-head"><h3>…`);

  const start = src.indexOf('export function renderCardHeader');
  const end = src.indexOf('\n}', start);
  const body = src.slice(start, end < 0 ? undefined : end + 2);
  assert.match(body, /<h3\b/, 'renderCardHeader 未渲染 H3 卡头（一个 tab 只保留页头 H2，卡内标题必须是 H3）');
  assert.match(body, /card-head__title/,
    'renderCardHeader 未使用 .card-head__title（卡头样式 / 单一源选择器被改坏）');
});

// ═════════════════════════════════════════════════════════════════════════════
// 六、术语对照 Harness（2026-10-25 批次 511 · Task 2 · H-T1…H-T5）
// ═════════════════════════════════════════════════════════════════════════════
//
// 为什么把「术语表 ↔ UI ↔ 旧文件」做成机检：全仓只有一份定义源（TERMINOLOGY.md）容易写成孤岛——
//   术语表说「活动工作组 / 专班工作组」同层，UI 却把「工作组 / 专班 / 其他组」并列；术语表说「项目组」禁用，
//   旧文案还留在 help / tab / 表头里。四条断言分别钉住四个失效面：
//     H-T1 并列组层级 —— 同一按钮组里不许混层（协作结构 / 业务对象 / 组织单元）。
//     H-T2 页签名覆盖 —— 页签名必须覆盖其内部分段的对象；含「活动」段不得只叫「专班动态」。
//     H-T3 标签登记   —— 新增页签 / 表头 / 筛选项 / 选项必须先命中术语表，否则基线外即红。
//     H-T4 废弃写法   —— `项目组` / `协作组` / `活动项目赋权` / `专班负责人` / `会议活动` 用户可见文案零残留。
//     H-T5 关系钉死   —— 术语表 ≥18 条 9 字段齐；§19 与 sop/INDEX 只留指针；不得二次定义。
//
// 如何验证（故障注入，改一处→跑本文件→必红→还原）：
//   · H-T1：把 `insight-view.js` 的 `SEG_LABEL.taskforce` 改成 `'专班'` ⇒ 分段组层级不一致（专班是 business-object）；
//           或在 `secretary/overview-tab.js` 的 views 里加 `'group'` ⇒ 「未登记分段 / 不同层」。
//   · H-T2：把 `capabilities/visitor-workspace.js` 的 `label: '项目分工'` 改成 `'专班动态'` ⇒ 「活动段 + 专班页签名」；
//           或把 `TAB_LABEL_EXEMPTIONS` 里的「项目分工」删掉 ⇒ 上位页面名未登记。
//   · H-T3：在任一 `capabilities/*` 新增一个 `label: '临时页签'` ⇒ 未命中术语表且不在基线 ⇒ 红；
//           把某条基线清掉但标签仍在 ⇒ 红（新增）；修好标签但基线未撤 ⇒ 红（僵尸）。
//   · H-T4：在 `docs/help.html` 写一句「专班负责人」⇒ 用户可见命中即红；
//           在 `docs/src/**` 注释里写「协作组」⇒ 注释基线新增即红。
//   · H-T5：把 `TERMINOLOGY.md` 某行的「合法别名」清空 ⇒ 9 字段缺；把 §19.2.1 的指针改回定义表 ⇒ 词条行/定义列判红。
//
// 非空转下限（防判据写坏 ⇒ 恒真）：分段 ≥2、可达 views 配置 ≥2、解析页签 ≥40、带分段页签 ≥2、
//   结构性标签抽取 ≥60（扫描 ≥20 文件）、命中术语 ≥8、H-T4 扫描 ≥100 文件且注释命中 >0、content 定义句扫描 ≥40 文件。
//
// 误报边界（如实标注，避免把正常写法判红）：
//   · H-T1 只判「一级分段按钮组」（insight-view 的 SEG_LABEL + 各台 views）与独立区结构；
//     **父子嵌套按容器层级判定**——专班详情卡内再写「专班工作组」是小节标题，不进 data-iview 组，不在判据内。
//     其他页面里的普通按钮组（如专班管理的「专班工作组 / 报名总表」）不在本批范围：它们不是术语并列组。
//   · H-T2 只判「注册在 capabilities/* 的页签」；已删页签的遗留文件（如 visitor/tf-view-tab.js 的 renderContent）
//     不注册、不生成页签，不在判据内。页签名仅从源码可识别的分段（views / subTabs）推对象类，不做语义猜测。
//   · H-T3 跳过 mock / 注释 / 模板变量 / 长句 / 编号；表头字段名、占位文案等普通词登记在基线并写理由。
//   · H-T4 只判 `docs/src/**` 与 `docs/help.html`；`content/**` 的否定句 / 禁用写法表 / 判例正文按任务豁免。
//     `赋权` **不在禁用集**：产品文案仍大量使用（赋权链 / 常设赋权），且 TERMINOLOGY 只禁「赋权」替代「授权」这一用法；
//     本批固定 5 词（含最坏的组合「活动项目赋权」）。

const TERMS = loadTerminology(ROOT);
const LABEL_INDEX = makeLabelIndex(TERMS);
const SEGMENTS = extractInsightSegments(ROOT);

/**
 * 同一按钮组 / 表头 / 筛选行的层级与并列集判据（纯函数，H-T1 用它与正负例自检）。
 * @returns {string[]} 问题串；空数组＝同层且在某一词条的允许并列集内
 */
function peerGroupProblems(labels, index) {
  const out = [];
  const entries = labels.map((label) => ({ label, entry: index.get(label) }));
  for (const x of entries) {
    if (!x.entry) out.push(`「${x.label}」未在 ${TERMINOLOGY_REL} 登记（无法判断层级，按不同层处理）`);
  }
  if (out.length) return out;
  const layers = new Set(entries.map((x) => x.entry.layer));
  if (layers.size > 1) {
    out.push(`同一组标签层级不一致：${entries.map((x) => `${x.label}(${x.entry.layer})`).join(' / ')}`);
  }
  const legal = entries.some((x) => x.entry.peers
    .some((g) => g.length === labels.length && labels.every((l) => g.includes(l))));
  if (!legal) {
    out.push(`「${labels.join(' + ')}」不是任何词条的「允许并列集」` +
      `（合法例：{活动工作组, 专班工作组}；判红例：{工作组, 专班}、{工作组, 其他组}）`);
  }
  return out;
}

// ── H-T1 并列组层级一致 ────────────────────────────────────────────────────
test('H-T1 并列组层级一致：分段同层 + 合法并列集 + 「其他党小组」独立区 + 各台 views 同判', () => {
  // ① 分段标签与分段类型必须同源（SEG_LABEL 的键 ≡ SEG_TYPES）
  assert.deepEqual(Object.keys(SEGMENTS.labels), SEGMENTS.types,
    `${SEGMENTS.rel}：SEG_LABEL 的键与 SEG_TYPES 不一致——按钮集合与标签映射被拆成两份`);

  // ② 一级分段：同层 + 合法并列集
  const segLabels = SEGMENTS.types.map((t) => SEGMENTS.labels[t]);
  assert.deepEqual(peerGroupProblems(segLabels, LABEL_INDEX), [],
    `一级分段组「${segLabels.join(' + ')}」层级 / 并列集不合法（SD-37：只放同层对象）`);

  // ③ 纯判据正负例：防「判据写反 ⇒ 恒真」
  assert.deepEqual(peerGroupProblems(['活动工作组', '专班工作组'], LABEL_INDEX), [],
    '合法组 {活动工作组, 专班工作组} 被误判红');
  assert.ok(peerGroupProblems(['工作组', '专班'], LABEL_INDEX).length > 0,
    '「工作组 + 专班」必须判红（协作结构 ≠ 业务对象）');
  assert.ok(peerGroupProblems(['活动工作组', '其他党小组'], LABEL_INDEX).length > 0,
    '「工作组 + 其他组」必须判红（组织单元不得与协作结构同排）');

  // ④ 组织单元不得进入 data-iview 组；「其他党小组」必须是独立 section
  assert.ok(!SEGMENTS.types.some((t) => /^(group|other|party-group)/.test(t)),
    `分段类型里出现组织单元（${SEGMENTS.types.join(' / ')}）——其他党小组必须独立成区`);
  const insightRel = SEGMENTS.rel;
  const insightSrc = stripComments(read(join(ROOT, insightRel)));
  assert.ok(!/data-iview="(?:group|other|party-group)"/.test(insightSrc),
    `${insightRel} 的 data-iview 组里出现组织单元（group/other）——组织单元不得与工作组同排`);
  const segGroup = /role="group" aria-label="工作组对象切换"[\s\S]{0,400}?<\/div>/.exec(insightSrc)?.[0] || '';
  assert.ok(segGroup.length > 0,
    `${insightRel} 找不到 aria-label="工作组对象切换" 的按钮组（分段按钮的容器单一源被改坏）`);
  assert.ok(!/其他党小组/.test(segGroup),
    `${insightRel}：「其他党小组」出现在一级分段按钮组内——必须独立成 section（groupSection）`);
  assert.ok(/id="insight-group-section"/.test(insightSrc),
    `${insightRel} 缺独立区 #insight-group-section（其他党小组的落点）`);
  assert.ok(insightSrc.indexOf('id="insight-group-section"') > insightSrc.indexOf('aria-label="工作组对象切换"'),
    `${insightRel}：独立区渲染在分段组之前——读屏顺序会把组织单元读成一级对象`);

  // ⑤ 各台 `views` 配置：可达文件必须只含同层对象；遗留死文件只许在登记表里
  const callers = extractInsightCallers(ROOT);
  const reachable = callers.filter((c) => c.reachable);
  const legacy = callers.filter((c) => !c.reachable).map((c) => c.rel).sort();
  assert.ok(reachable.length >= 2,
    `可达的 insight-view 调用方只有 ${reachable.length} 个（下限 2）：可达性解析被写坏，各台 views 会漏判`);
  assert.ok(LEGACY_INSIGHT_CALLERS.length > 0, '遗留调用方登记表为空：不可达文件将无人看管');
  assert.deepEqual(legacy, LEGACY_INSIGHT_CALLERS.map((e) => e.rel).sort(),
    `不可达的 insight-view 调用方与登记表不符（新增死文件须登记理由；被重新 import 的文件会回到判红范围）：${legacy.join(' / ')}`);

  const problems = [];
  let viewsChecked = 0;
  for (const c of reachable) {
    if (!c.views.length) continue;
    viewsChecked++;
    const unknown = c.views.filter((id) => !SEGMENTS.labels[id]);
    if (unknown.length) {
      problems.push(`${c.rel}：views 含未在 SEG_LABEL 登记的分段 ${unknown.map((x) => `'${x}'`).join(' / ')}` +
        `——组织单元 / 其他组一律不得进分段集合`);
      continue;
    }
    const labels = c.views.map((id) => SEGMENTS.labels[id]);
    problems.push(...peerGroupProblems(labels, LABEL_INDEX).map((p) => `${c.rel}：${p}`));
  }
  assert.deepEqual(problems, [], `各台知情查看分段配置不合法：\n  ${problems.join('\n  ')}`);

  // 非空转：分段 ≥2、可达 views 配置 ≥2（防抽取面被写坏）
  assert.ok(SEGMENTS.types.length >= 2, `分段只剩 ${SEGMENTS.types.length} 个（下限 2）`);
  assert.ok(viewsChecked >= 2, `只检查到 ${viewsChecked} 个可达的 views 配置（下限 2）`);
});

// ── H-T2 页签名覆盖段集合 ──────────────────────────────────────────────────
test('H-T2 页签名覆盖段集合：含「活动」段的页签不得叫「专班动态」；上位页面名逐条豁免', () => {
  const tabs = extractCapabilityTabs(ROOT);
  assert.ok(tabs.length >= 40,
    `只解析到 ${tabs.length} 个页签声明（下限 40：当前 IA 45）：capabilities 声明格式被改坏，本条会变恒真`);
  const exempt = new Map(TAB_LABEL_EXEMPTIONS.map((e) => [e.label, e]));
  assert.equal(exempt.size, TAB_LABEL_EXEMPTIONS.length, 'TAB_LABEL_EXEMPTIONS 有重复 label');
  const headerTitleRe = /renderTabHeader\s*\(\s*\{[\s\S]{0,400}?\btitle\s*:\s*'([^']+)'/g;
  const problems = [];
  const checked = [];
  const titles = [];

  for (const tab of tabs) {
    // 页签名本身就不许再用废弃页签名（与内部分段无关，直接判）
    if (/专班动态|专班查看/.test(tab.label)) {
      problems.push(`${tab.file}：页签「${tab.id}」的 label 仍是废弃页签名「${tab.label}」` +
        `——含工作组分段的页签不得只叫「专班动态」（对象集合被页签名缩窄）`);
    }
    if (!tab.renderRel || !existsSync(join(ROOT, tab.renderRel))) continue;
    const src = stripComments(read(join(ROOT, tab.renderRel)));

    // 内部分段的「对象类」：insight-view views + subTabs 里命中术语表的标签
    const classes = [];
    const viewsBlock = /views\s*:\s*\[([^\]]*)\]/.exec(src)?.[1] || '';
    for (const m of viewsBlock.matchAll(/'([^']+)'/g)) {
      if (SEGMENTS.labels[m[1]]) classes.push(SEGMENTS.labels[m[1]]);
    }
    const subTabs = /const\s+subTabs\s*=\s*\[([\s\S]*?)\]/.exec(src)?.[1] || '';
    for (const m of subTabs.matchAll(/label\s*:\s*'([^']+)'/g)) {
      if (LABEL_INDEX.has(m[1])) classes.push(m[1]);
    }

    for (const m of src.matchAll(headerTitleRe)) titles.push({ tab, title: m[1] });

    const uniqueClasses = [...new Set(classes)];
    if (!uniqueClasses.length) continue;
    checked.push({ tab, classes: uniqueClasses });

    // 规则①：含「活动」对象类时，页签名不得只落在「专班」——这是 spec 的判红样例
    const narrowed = /专班/.test(tab.label) && uniqueClasses.some((c) => /^活动/.test(c));
    // 规则②：页签名必须覆盖内部对象类（合称「项目」/ 上位「工作组」可覆盖；否则须进豁免表）
    const own = LABEL_INDEX.get(tab.label);
    const covers = Boolean(own) && (own.term === '项目' || uniqueClasses.every((c) => {
      const e = LABEL_INDEX.get(c);
      return e && (e.term === own.term || e.updown.includes(`上位＝${own.term}`));
    }));
    if (narrowed) {
      problems.push(`${tab.file}：页签「${tab.label}」只写了「专班」，内部却有活动对象（${uniqueClasses.join(' / ')}）` +
        `——页签名必须覆盖段集合（改叫上位名，或把活动段移出本页）`);
    } else if (!covers && !exempt.has(tab.label)) {
      problems.push(`${tab.file}：页签「${tab.label}」不是术语表词条，内部对象类为（${uniqueClasses.join(' / ')}）` +
        `——若它是上位页面名，请在 TAB_LABEL_EXEMPTIONS 写理由；否则按对象改名`);
    }
  }

  // renderTabHeader({title}) 同样受约束（页头是用户看到的第一层级名）
  for (const { tab, title } of titles) {
    if (!/专班动态|专班查看/.test(title)) continue;
    problems.push(`${tab.renderRel}：renderTabHeader({title:'${title}'}) 仍是废弃页签名——页头必须覆盖内部分段对象`);
  }

  assert.ok(checked.length >= 2,
    `只有 ${checked.length} 个页签能从内部源码看出对象类（下限 2：全局概况 / 项目分工）：抽取面被写坏，本条会变恒真`);
  assert.ok(titles.length >= 20,
    `只扫到 ${titles.length} 个 renderTabHeader 标题（下限 20）：页头判据的扫描面被写坏`);
  assert.ok(TAB_LABEL_EXEMPTIONS.length > 0 && TAB_LABEL_EXEMPTIONS.length <= 3,
    `上位页面名豁免 ${TAB_LABEL_EXEMPTIONS.length} 条（应为 1–3 条且逐条给理由）：豁免表只许收窄，不许变成垃圾桶`);
  const zombies = TAB_LABEL_EXEMPTIONS
    .filter((e) => !checked.some((c) => c.tab.label === e.label)).map((e) => e.label);
  assert.deepEqual(zombies, [],
    `TAB_LABEL_EXEMPTIONS 里有已不再承载分段 / 已改名的页签（僵尸豁免，请删除）：${zombies.join(' / ')}`);
  assert.deepEqual(problems, [], `页签名与内部分段不匹配：\n  ${problems.join('\n  ')}`);
});

// ── H-T3 结构性标签登记 ────────────────────────────────────────────────────
test('H-T3 结构性标签登记：未命中术语表 / 合法别名且不在基线 ⇒ 红（基线只降不升）', () => {
  const { items, scannedFiles } = extractStructuralLabels(ROOT, SEGMENTS);
  assert.ok(scannedFiles >= 20,
    `只扫描到 ${scannedFiles} 个源码文件（下限 20）：抽取面被写坏，未命中项会漏报`);
  assert.ok(items.length >= 60,
    `只抽取到 ${items.length} 个结构性标签（下限 60：当前 200+）：页签 / 表头 / 筛选 / 选项的抽取正则被改坏`);

  const matched = items.filter((i) => LABEL_INDEX.has(i.label));
  assert.ok(matched.length >= 8,
    `命中术语表的结构性标签只有 ${matched.length} 处（下限 8）：术语表或抽取口径被改坏，未命中清单会失真`);

  const unknown = [...new Set(items.filter((i) => !LABEL_INDEX.has(i.label)).map((i) => i.label))];
  assert.ok(unknown.length > 0,
    '未命中术语表的标签为 0：要么全部登记完了（那请清空基线并说明），要么抽取面被改坏');

  const base = new Map();
  for (const e of STRUCTURAL_LABEL_BASELINE) {
    assert.ok(!base.has(e.label), `STRUCTURAL_LABEL_BASELINE 重复登记「${e.label}」`);
    const [cat, ...rest] = String(e.reason).split('：');
    assert.ok(REASON_CATEGORIES.includes(cat),
      `「${e.label}」的理由分类「${cat}」不在允许集合（${REASON_CATEGORIES.join(' / ')}）`);
    assert.ok(rest.join('：').trim().length >= 3,
      `「${e.label}」只写了分类，没有理由（基线条目必须说明「它是什么」）`);
    base.set(e.label, e);
  }
  assert.ok(base.size > 0, 'STRUCTURAL_LABEL_BASELINE 为空：首轮存量必须收基线（非空转下限）');

  const added = unknown.filter((l) => !base.has(l)).sort();
  const zombie = [...base.keys()].filter((l) => !unknown.includes(l)).sort();
  assert.deepEqual([...added, ...zombie], [], [
    `结构性标签与基线不相等（未命中术语表且未登记）：`,
    added.length ? `  ◀ 新增未登记 ${added.length} 个（先查术语表；确属普通字段名才允许登记并写理由）：\n    ${added.join('\n    ')}` : '',
    zombie.length ? `  ▶ 已登记但不再出现 ${zombie.length} 个（标签已改 / 已删，请从基线撤下）：\n    ${zombie.join('\n    ')}` : '',
  ].filter(Boolean).join('\n'));
  assert.deepEqual([...unknown].sort(), [...base.keys()].sort(),
    `未命中集合与基线集合不等（${unknown.length} vs ${base.size}）——见上一条诊断`);
  console.log(`[H-T3] 结构性标签 ${items.length} 处 · 命中术语表 ${matched.length} 处 · 未命中 ${unknown.length} 个（已基线）· 扫描 ${scannedFiles} 文件`);
});

// ── H-T4 废弃写法零残留 ────────────────────────────────────────────────────
const DEPRECATED_TERMS = ['项目组', '协作组', '活动项目赋权', '专班负责人', '会议活动'];

test('H-T4 废弃写法零残留：docs/src/** 与 help.html 的用户可见文案命中即红（注释存量见基线）', () => {
  const files = [];
  (function walkAll(dir) {
    for (const n of readdirSync(dir)) {
      const f = join(dir, n);
      if (statSync(f).isDirectory()) { walkAll(f); continue; }
      if (/\.(?:js|mjs|html)$/.test(n)) files.push(f);
    }
  })(join(ROOT, 'docs', 'src'));
  files.push(join(ROOT, 'docs', 'help.html'));
  assert.ok(files.length >= 100,
    `只扫描到 ${files.length} 个产品文件（下限 100）：扫描面被写坏，H-T4 会变成恒真`);

  const visible = [];
  const comments = [];
  for (const abs of files) {
    const raw = read(abs);
    const clean = stripComments(raw);
    const rel = relative(ROOT, abs).replace(/\\/g, '/');
    for (const term of DEPRECATED_TERMS) {
      if (clean.includes(term)) visible.push({ rel, term });
      else if (raw.includes(term)) comments.push({ rel, term });
    }
  }
  // 非空转：注释命中必须存在（证明「去注释后对照原文」这条口径真的在跑）
  assert.ok(comments.length > 0,
    '可见文案与注释都没有命中：要么 5 个禁用词真的清零（请同步删空基线），要么抽取口径被写坏');

  const exempt = new Set(DEPRECATED_COPY_EXEMPTIONS.map((e) => `${e.file}|${e.term}`));
  const badVisible = visible.filter((v) => !exempt.has(`${v.rel}|${v.term}`));
  assert.deepEqual(badVisible.map((v) => `${v.rel} · ${v.term}`), [],
    `用户可见文案仍有废弃写法（改文案，不要加豁免）：\n  ${badVisible.map((v) => `${v.rel} · ${v.term}`).join('\n  ')}`);

  const base = new Map();
  for (const e of DEPRECATED_COPY_BASELINE) {
    const key = `${e.file}|${e.term}`;
    assert.ok(!base.has(key), `DEPRECATED_COPY_BASELINE 重复登记 ${key}`);
    assert.match(e.deadline, /^\d{4}-\d{2}-\d{2}$/, `${key} 的 deadline 不是日期（基线必须注明期限）`);
    assert.ok(e.deadline >= '2026-10-25', `${key} 的期限 ${e.deadline} 早于立基线日（期限不得倒挂）`);
    assert.ok(String(e.reason).trim().length >= 8, `${key} 缺理由（说明为什么本批不能修）`);
    base.set(key, e);
  }
  const hitKeys = comments.map((c) => `${c.rel}|${c.term}`).sort();
  const added = hitKeys.filter((k) => !base.has(k));
  const zombie = [...base.keys()].filter((k) => !comments.some((c) => `${c.rel}|${c.term}` === k));
  assert.deepEqual([...added, ...zombie], [], [
    '内部注释的废弃写法与基线不相等：',
    added.length ? `  ◀ 新增 ${added.length} 处（内部注释也不许再写废弃词）：\n    ${added.join('\n    ')}` : '',
    zombie.length ? `  ▶ 已修好但基线未撤 ${zombie.length} 处（请从 DEPRECATED_COPY_BASELINE 删除）：\n    ${zombie.join('\n    ')}` : '',
  ].filter(Boolean).join('\n'));
  assert.deepEqual(hitKeys, [...base.keys()].sort(),
    `注释命中集与基线集合不等（${hitKeys.length} vs ${base.size}）——见上一条诊断`);

  const zombieEx = DEPRECATED_COPY_EXEMPTIONS.filter(
    (e) => !visible.some((v) => v.rel === e.file && v.term === e.term));
  assert.deepEqual(zombieEx.map((e) => `${e.file} · ${e.term}`), [],
    'DEPRECATED_COPY_EXEMPTIONS 里有已不再命中的条目（僵尸豁免，请删除）');
});

// ── H-T5 关系钉死（术语唯一源 / 旧文件只留指针 / 不得二次定义）────────────────
/** 正则转义（词条名进 new RegExp） */
function escReTerm(s) { return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

test('H-T5 术语单一源：TERMINOLOGY ≥18 条 9 字段齐；§19 与 sop/INDEX 只留指针；不得二次定义', () => {
  const termFile = join(ROOT, TERMINOLOGY_REL);
  assert.ok(existsSync(termFile), `术语表不存在：${TERMINOLOGY_REL}（全仓唯一术语定义源）`);
  assert.ok(TERMS.length >= 18, `术语表只有 ${TERMS.length} 条（下限 18）：首批词条被删减`);

  const problems = [];
  for (const e of TERMS) {
    const fields = {
      词条: e.term,
      定义: e.definition,
      层级: e.layer,
      上位下位: e.updown,
      允许并列集: e.peersRaw,
      禁用写法: e.forbidden,
      权威文档: e.authority,
      代码键: e.codeKey,
      合法别名: e.aliasesRaw,
    };
    for (const [k, v] of Object.entries(fields)) {
      if (!String(v || '').trim()) problems.push(`「${e.term}」缺字段「${k}」`);
    }
    if (!/[:：]\s*\d+|\.(?:md|js)(?::|`|$)|`[^`]+`/.test(e.authority)) {
      problems.push(`「${e.term}」的权威文档「${e.authority}」不是「文件:行号」/「文件」/ 代码标识符格式`);
    }
  }
  assert.deepEqual(problems, [], `术语表字段不齐：\n  ${problems.join('\n  ')}`);

  // ① OPERATIONS_GUIDE §19 只留指针：无「定义」列表头、无词条行
  const guide = read(join(ROOT, 'content', '03_doc_system', 'OPERATIONS_GUIDE.md'));
  const gStart = guide.indexOf('\n## 19.');
  const gEnd = guide.indexOf('\n## 20.', gStart);
  assert.ok(gStart >= 0 && gEnd > gStart, '找不到 OPERATIONS_GUIDE §19 / §20 的边界：章节被改名或合并');
  const sec19 = guide.slice(gStart, gEnd);
  assert.ok(sec19.includes('TERMINOLOGY.md'), 'OPERATIONS_GUIDE §19 未指向 TERMINOLOGY.md（指针丢失）');
  // 边界：§19.4/§19.5/§19.6 的「定义」列分别是文件角色 / T 层级 / 表达分类，不是词条定义；
  //   判据只认「词条 + 定义」同表（词条定义表的表头特征），避免把无关表格误报成第二份术语表。
  assert.ok(!/\|\s*词条\s*\|[^\n]*\|\s*定义\s*\|/.test(sec19),
    'OPERATIONS_GUIDE §19 出现「词条 | 定义」表格——应只留指针，不许二次定义');
  const termRows = TERMS
    .filter((e) => new RegExp(`^\\|\\s*${escReTerm(e.term)}\\s*\\|`, 'm').test(sec19))
    .map((e) => e.term);
  assert.deepEqual(termRows, [],
    `OPERATIONS_GUIDE §19 出现词条定义行（${termRows.join(' / ')}）——定义只许留在 TERMINOLOGY.md`);

  // ② sop/INDEX.md 术语段只留指针
  const index = read(join(ROOT, 'content', '02_institution', 'sop', 'INDEX.md'));
  const iStart = index.indexOf('\n## 术语');
  assert.ok(iStart >= 0, 'sop/INDEX.md 缺「## 术语」段');
  const iEnd = index.indexOf('\n---', iStart);
  const secIndex = index.slice(iStart, iEnd > iStart ? iEnd : undefined);
  assert.ok(secIndex.includes('TERMINOLOGY.md'), 'sop/INDEX.md 术语段未指向 TERMINOLOGY.md（指针丢失）');
  assert.ok(!/^\|/m.test(secIndex), 'sop/INDEX.md 术语段出现表格——应只留指针，不许二次定义');

  // ③ 同一词条不得在其它 content 文件出现「定义句」
  const contentDir = join(ROOT, 'content');
  const mdFiles = [];
  (function walk(dir) {
    for (const n of readdirSync(dir)) {
      const f = join(dir, n);
      if (statSync(f).isDirectory()) { walk(f); continue; }
      if (!n.endsWith('.md')) continue;
      const rel = relative(ROOT, f).replace(/\\/g, '/');
      if (rel === TERMINOLOGY_REL) continue;
      mdFiles.push(rel);
    }
  })(contentDir);
  assert.ok(mdFiles.length >= 40,
    `只扫描到 ${mdFiles.length} 份 content/**/*.md（下限 40）：扫描面被写坏，重复定义判据会变恒真`);

  const termNames = TERMS.map((e) => e.term);
  const dupHits = [];
  for (const rel of mdFiles) {
    for (const h of definitionSentenceHits(read(join(ROOT, rel)), termNames)) {
      if (!DEFINITION_DUP_EXEMPTIONS.some((x) => x.file === rel && x.term === h.term)) {
        dupHits.push(`${rel} · «${h.term}»：${h.text.trim()}`);
      }
    }
  }
  assert.deepEqual(dupHits, [], `出现第二份定义句（定义只许留在 ${TERMINOLOGY_REL}）：\n  ${dupHits.join('\n  ')}`);

  // ④ 判据自检（防启发式写死成恒真 / 恒假）
  assert.equal(definitionSentenceHits('工作组是指活动 / 专班之上的协作结构。', ['工作组']).length, 1,
    '「词条 + 是指」必须被识别为定义句');
  assert.equal(definitionSentenceHits('活动，指有明确时间与地点的一次性业务记录。', ['活动']).length, 1,
    '「词条，指…」必须被识别为定义句');
  assert.equal(definitionSentenceHits('党小组组长负责本组。', ['党小组']).length, 0,
    '「党小组组长」不是定义句（复合词不得误报）');
  assert.equal(definitionSentenceHits('专班的负责人先移交。', ['专班']).length, 0,
    '「专班的负责人」不是定义句（不得因「指」以外字面误报）');
});

// ═════════════════════════════════════════════════════════════════════════════
// 七、根页地标：skip link 落点必须是 <main id="main-content">（2026-10-28 前端设计审查）
// ═════════════════════════════════════════════════════════════════════════════
//
// 病灶：9 个根页（归档 / 活动 / 活动材料 / 消息 / 通知 / 支委会 / 个人档案 / 专班 / 思想汇报）
//   skip 链接落点是 `<div class="sidebar-main-content" id="main-content">`——键盘用户「跳到主要内容」
//   后落在普通 div 上，读屏软件得不到 main 地标，也无法用「main 地标跳转」直达正文；其余页面用的是 `<main>`。
// 判据：凡带 `sidebar-main-content` 外壳的根页，`#main-content` 必须落在**唯一**的 `<main>` 上，
//   class 保持 `sidebar-main-content`（不改变布局），skip 链接仍指向 `#main-content`。
// 非空转：扫描面 ≥9 份 + 点名 9 页必须实际参与扫描 + 纯判据正负例自检（防判据写反 ⇒ 恒真）。

const ROOT_PAGES_DIR = join(ROOT, 'docs');
/** 2026-10-28 审查点名的 9 个根页（必须全部参与扫描；新增同类页须同批加入本清单） */
const SIDEBAR_MAIN_PAGES = [
  'archive.html', 'activity.html', 'activity-materials.html', 'messages.html', 'notice.html',
  'party-committee-meeting.html', 'person.html', 'taskforce.html', 'thought-report.html',
];

/** 纯判据：给页面源码返回问题串（空＝合格）
 *  `requireSidebarClass` 只对原本用 `.sidebar-main-content` 当正文容器的页生效（这 9 页 class 不得被换掉，
 *  否则等于顺手改了布局容器）；其余页面的 `<main>` 自有布局 class，不在本判据内。 */
export function mainLandmarkProblems(src, { requireSidebarClass = false } = {}) {
  const out = [];
  const withId = [...src.matchAll(/<([a-zA-Z]+)\b[^>]*\bid="main-content"[^>]*>/g)];
  if (withId.length !== 1) out.push(`id="main-content" 出现 ${withId.length} 次（应恰为 1 次）`);
  const mainTags = [...src.matchAll(/<main\b[^>]*>/g)];
  if (mainTags.length !== 1) out.push(`<main> 地标 ${mainTags.length} 个（应恰为 1 个）`);
  if (withId.length === 1 && withId[0][1].toLowerCase() !== 'main') {
    out.push(`#main-content 落在 <${withId[0][1]}> 而非 <main>`);
  }
  if (requireSidebarClass && mainTags.length === 1 && !/\bclass="[^"]*sidebar-main-content/.test(mainTags[0][0])) {
    out.push('<main> 未保留 class="sidebar-main-content"（布局容器口径变了）');
  }
  if (!/<a href="#main-content"[^>]*class="[^"]*skip-link/.test(src)) {
    out.push('缺 skip link（href="#main-content" 且 class 含 skip-link）');
  }
  return out;
}

test('G11 根页地标：sidebar-main-content 外壳的 #main-content 必须是唯一 <main>（9 页逐一断言）', () => {
  const pages = readdirSync(ROOT_PAGES_DIR)
    .filter((n) => n.endsWith('.html'))
    .filter((n) => read(join(ROOT_PAGES_DIR, n)).includes('sidebar-main-content'))
    .sort();
  assert.ok(pages.length >= 9,
    `只扫到 ${pages.length} 个带 sidebar-main-content 的根页（基线 9）：扫描面被写坏，本条会变恒真`);
  const missing = SIDEBAR_MAIN_PAGES.filter((n) => !pages.includes(n));
  assert.deepEqual(missing, [], `点名页未参与扫描（文件被改名 / 容器被删）：${missing.join(' / ')}`);

  const problems = [];
  for (const name of pages) {
    const opts = { requireSidebarClass: SIDEBAR_MAIN_PAGES.includes(name) };
    for (const p of mainLandmarkProblems(read(join(ROOT_PAGES_DIR, name)), opts)) problems.push(`docs/${name}：${p}`);
  }
  assert.deepEqual(problems, [], `根页 <main> 地标不合规：\n  ${problems.join('\n  ')}`);

  // 判据自检（正例 / 四种负例）
  const ok = '<a href="#main-content" class="visually-hidden skip-link">跳到主要内容</a>'
    + '<main class="sidebar-main-content pt-16" id="main-content"><p>正文</p></main>';
  assert.deepEqual(mainLandmarkProblems(ok, { requireSidebarClass: true }), [], '正例被误判红');
  assert.ok(mainLandmarkProblems(ok.replace('<main ', '<div ').replace('</main>', '</div>')).length > 0,
    '负例①（div 承载 #main-content）未被判出');
  assert.ok(mainLandmarkProblems(ok.replace('</main>', '</main><main id="main-content"></main>')).length > 0,
    '负例②（第二个 <main> / 重复 id）未被判出');
  assert.ok(mainLandmarkProblems(ok.replace(' class="sidebar-main-content pt-16"', ''), { requireSidebarClass: true }).length > 0,
    '负例③（<main> 丢了布局 class）未被判出');
  assert.ok(mainLandmarkProblems(ok.replace('href="#main-content"', 'href="#content"')).length > 0,
    '负例④（skip link 目标漂移）未被判出');
});
