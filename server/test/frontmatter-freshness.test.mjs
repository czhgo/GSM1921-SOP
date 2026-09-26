// server/test/frontmatter-freshness.test.mjs — 「改了但没刷卡」机检件（2026-09-26 批次 204，`R-83` 的守卫）
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
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { execFileSync } from 'node:child_process';

const ROOT = join(import.meta.dirname, '..', '..');
const TIMESTAMPS = join(ROOT, '.ctx', 'TIMESTAMPS.md');
const read = (f) => readFileSync(f, 'utf8');
const DATE_RE = /20\d{2}-\d{2}-\d{2}/g;

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
