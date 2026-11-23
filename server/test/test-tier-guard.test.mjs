// role: [工程师]+[AI]
// server/test/test-tier-guard.test.mjs — 测试分层登记 / 预算守卫（B-499-5 · Task 9）
// ════════════════════════════════════════════════════════════════
// 为什么要这层守卫：
//   · daily 是「每次改完必跑」的那一层。没有登记守卫时，新增测试只写文件不登记 ⇒ **从不自动运行**；
//     登记了但不分层 ⇒ daily 被静态守卫与真机 e2e 拖长，最后被整层跳过（＝判据实际失效）。
//   · 2026-11-08 批次 537 起分四层（daily 结果门禁 / guards 静态守卫 / precommit 全量纯 node + e2e /
//     weekly 慢速普查）。本守卫把「磁盘实况 ↔ 四层登记 ↔ npm scripts ↔ 预算」钉在一起：
//       T1 磁盘全部 `*.test.{js,mjs}` ↔ registry 四层并集**双向相等**；四层互不重叠
//       T2 daily 不含 page-sweep / form-loop-sweep / 任何 `*-e2e` 重活
//       T3 不 import playwright 的纯 node 测试必须在 daily / guards / precommit，**不得在 weekly**
//       T4 daily / guards 的文件数与静态 `test(` 调用点数不得高于各自预算；daily 另有 27 文件 / 220 断言上限
//       T5 四个 runner（daily / guards / precommit / changed）与 registry 对齐，且无 cmd 专有语法
//       T6 非空转：registry 规模下限、每条 reason 非空、比较器能判出人为差异
//   · 分层只决定「哪一层跑」，不决定「跑不跑」：precommit / full 仍覆盖全部文件。
// 运行：`node --test test/test-tier-guard.test.mjs`（server 目录）
// ════════════════════════════════════════════════════════════════
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import {
  TIERS, TEST_TIERS, DAILY_FILE_BUDGET, DAILY_TEST_BUDGET,
  GUARDS_FILE_BUDGET, GUARDS_TEST_BUDGET,
  filesByTier, dailyFiles, guardsFiles, precommitFiles, weeklyFiles,
  allRegisteredFiles, diffTiers, isPlaywrightSource, countTestCases,
} from '../test-tier-registry.mjs';

const ROOT = join(import.meta.dirname, '..', '..');
const TDIR = join(ROOT, 'server', 'test');
const PKG = JSON.parse(readFileSync(join(ROOT, 'server', 'package.json'), 'utf8'));
const read = (f) => readFileSync(join(TDIR, f), 'utf8');

const diskFiles = () => readdirSync(TDIR).filter((f) => /\.test\.(js|mjs)$/.test(f)).sort();

test('T1 磁盘测试文件 ↔ 四层登记双向相等，且四层互不重叠', () => {
  const disk = diskFiles();
  const diff = diffTiers(disk);
  assert.deepEqual(diff.missing, [],
    `以下磁盘测试文件**未登记层级**（新增测试必须同批登记 registry）：\n  ${diff.missing.join('\n  ')}`);
  assert.deepEqual(diff.extra, [],
    `以下 registry 条目在磁盘上不存在（删除测试须同批删登记并写明覆盖来源）：\n  ${diff.extra.join('\n  ')}`);
  assert.deepEqual(diff.duplicates, [],
    `以下文件在 registry 中被登记了不止一层（四层必须互斥）：${diff.duplicates.join(' / ')}`);
  assert.deepEqual(new Set(disk), new Set(allRegisteredFiles()), '磁盘与登记表并集不一致');
});

test('T2 daily 不含 page-sweep / form-loop-sweep / 任何 *-e2e 重活', () => {
  const heavy = dailyFiles.filter((f) => /^(page-sweep|form-loop-sweep)\.test\.mjs$|^.*-e2e\.test\.m?js$/.test(f));
  assert.deepEqual(heavy, [],
    `daily 出现真机重活（应移入 precommit）：${heavy.join(' / ')}`);
  // 两条全站普查必须在 precommit（防止有人在分层时顺手降级到 weekly 而脱离提交前门）
  assert.equal(precommitFiles.includes('page-sweep.test.mjs'), true, 'page-sweep 必须在 precommit 层');
  assert.equal(precommitFiles.includes('form-loop-sweep.test.mjs'), true, 'form-loop-sweep 必须在 precommit 层');
});

test('T3 不 import playwright 的纯 node 测试必须在 daily / guards / precommit，不得在 weekly', () => {
  const disk = diskFiles();
  const nonPw = disk.filter((f) => !isPlaywrightSource(read(f)));
  // 非空转：两侧都要有规模（解析写坏 ⇒ 差集恒空 ⇒ 漏登记也绿）
  assert.ok(nonPw.length >= 250, `非 playwright 测试只解析到 ${nonPw.length} 个（下限 250）：解析面被写坏`);
  const known = new Set([...dailyFiles, ...guardsFiles, ...precommitFiles]);
  assert.ok(dailyFiles.length + guardsFiles.length + precommitFiles.length >= 250,
    `daily + guards + precommit 只登记了 ${dailyFiles.length + guardsFiles.length + precommitFiles.length} 个（下限 250）：registry 被写坏`);
  const missing = nonPw.filter((f) => !known.has(f)).sort();
  assert.deepEqual(missing, [],
    `以下纯 node 测试**不在 daily / guards / precommit**（守卫孤儿化 / 被错误降层）：\n  ${missing.join('\n  ')}`);
  // 反向：daily / guards 不得混入 Playwright（真机件只在 precommit / weekly）
  for (const [name, list] of [['daily', dailyFiles], ['guards', guardsFiles]]) {
    const pw = list.filter((f) => isPlaywrightSource(read(f)));
    assert.deepEqual(pw, [], `${name} 混入 Playwright 测试：${pw.join(' / ')}`);
  }
  // weekly 只放真机慢速普查：纯 node 落入 weekly 即判红
  const weeklyNode = weeklyFiles.filter((f) => !isPlaywrightSource(read(f)));
  assert.deepEqual(weeklyNode, [], `weekly 混入纯 node 测试（应回 daily / guards / precommit）：${weeklyNode.join(' / ')}`);
});

test('T4 daily / guards 文件数与断言预算不得高于登记值；daily 另有结果门禁上限', () => {
  const dailyCases = dailyFiles.reduce((n, f) => n + countTestCases(read(f)), 0);
  const guardCases = guardsFiles.reduce((n, f) => n + countTestCases(read(f)), 0);
  // 非空转：预算本身要有规模，且不能宽到「加十个文件也不红」
  assert.ok(DAILY_FILE_BUDGET >= 20, `DAILY_FILE_BUDGET=${DAILY_FILE_BUDGET}（下限 20）：预算常量被写坏`);
  assert.ok(DAILY_TEST_BUDGET >= 150, `DAILY_TEST_BUDGET=${DAILY_TEST_BUDGET}（下限 150）：预算常量被写坏`);
  assert.ok(GUARDS_FILE_BUDGET >= 60, `GUARDS_FILE_BUDGET=${GUARDS_FILE_BUDGET}（下限 60）：预算常量被写坏`);
  assert.ok(GUARDS_TEST_BUDGET >= 400, `GUARDS_TEST_BUDGET=${GUARDS_TEST_BUDGET}（下限 400）：预算常量被写坏`);
  assert.ok(dailyFiles.length <= DAILY_FILE_BUDGET,
    `daily 文件数 ${dailyFiles.length} 超过登记预算 ${DAILY_FILE_BUDGET}：新增测试须显式上调预算并写明理由`);
  assert.ok(dailyCases <= DAILY_TEST_BUDGET,
    `daily 静态 test() 调用点 ${dailyCases} 超过登记预算 ${DAILY_TEST_BUDGET}：新增断言须显式上调预算并写明理由`);
  // 2026-11-22 批次 600：预算只作**软告警**——超出登记值打印 WARN，超过 25% 才判红（防「加一条即红」的过拟合）
  const warnOver = (label, actual, budget) => {
    if (actual > budget) {
      console.warn(`[budget] ${label} ${actual} > 登记 ${budget}（软告警；硬顶 ${Math.ceil(budget * 1.25)}）`);
    }
  };
  warnOver('guards 文件', guardsFiles.length, GUARDS_FILE_BUDGET);
  warnOver('guards 断言', guardCases, GUARDS_TEST_BUDGET);
  assert.ok(guardsFiles.length <= Math.ceil(GUARDS_FILE_BUDGET * 1.25),
    `guards 文件数 ${guardsFiles.length} 超过硬顶 ${Math.ceil(GUARDS_FILE_BUDGET * 1.25)}（登记 ${GUARDS_FILE_BUDGET} × 1.25）`);
  assert.ok(guardCases <= Math.ceil(GUARDS_TEST_BUDGET * 1.25),
    `guards 静态 test() 调用点 ${guardCases} 超过硬顶 ${Math.ceil(GUARDS_TEST_BUDGET * 1.25)}（登记 ${GUARDS_TEST_BUDGET} × 1.25）`);
  // 预算不得高于实然值太多（防「预算写成 9999」失去意义）
  assert.ok(DAILY_FILE_BUDGET - dailyFiles.length <= 4,
    `DAILY_FILE_BUDGET=${DAILY_FILE_BUDGET} 比实然 ${dailyFiles.length} 宽松 >4：预算失去约束力`);
  assert.ok(DAILY_TEST_BUDGET - dailyCases <= 40,
    `DAILY_TEST_BUDGET=${DAILY_TEST_BUDGET} 比实然 ${dailyCases} 宽松 >40：预算失去约束力`);
  assert.ok(GUARDS_FILE_BUDGET - guardsFiles.length <= 4,
    `GUARDS_FILE_BUDGET=${GUARDS_FILE_BUDGET} 比实然 ${guardsFiles.length} 宽松 >4：预算失去约束力`);
  assert.ok(GUARDS_TEST_BUDGET - guardCases <= 40,
    `GUARDS_TEST_BUDGET=${GUARDS_TEST_BUDGET} 比实然 ${guardCases} 宽松 >40：预算失去约束力`);
  // 结果门禁口径（2026-11-10 波次 540）；2026-11-17 批次 564 上调到 32 文件 / 260 断言
  //   （新增 `if-match`：全资源乐观锁的 428 / 409 / 200 / 强制写 / 回填幂等属「结果对不对」，理由见 registry 常量注释）
  // 2026-11-19 批次 575 / 577：发展对象硬门（permission-gate）＋ 门厅支部维度（public-portal）各 +1，
  //   实然 262；与 registry `DAILY_TEST_BUDGET=262` 取齐（上限只随结果门禁用例同步，不因静态守卫上调）。
  assert.ok(dailyFiles.length >= 20 && dailyFiles.length <= 32,
    `daily 只应保留 20–32 个结果门禁文件（实 ${dailyFiles.length}）：超出说明又混入了守卫或非核心回归`);
  assert.ok(dailyCases <= DAILY_TEST_BUDGET,
    `daily 断言 ${dailyCases} 超过结果门禁上限 ${DAILY_TEST_BUDGET}：优先把静态 / 域回归移出 daily，不改断言`);
});

test('T5 四个 runner 与 registry 对齐，且不含 cmd 专有语法', () => {
  const scripts = PKG.scripts || {};
  assert.equal(scripts['test:daily'], 'node scripts/run-daily.mjs', 'test:daily 必须走 registry 驱动的 run-daily.mjs');
  assert.equal(scripts['test:guards'], 'node scripts/run-guards.mjs', 'test:guards 必须走 registry 驱动的 run-guards.mjs');
  assert.equal(scripts['test:precommit'], 'node scripts/run-precommit.mjs', 'test:precommit 必须走 run-precommit.mjs');
  assert.equal(scripts['test:changed'], 'node scripts/run-changed.mjs', 'test:changed 必须走按改动面的 run-changed.mjs');
  assert.ok(dailyFiles.length > 0 && guardsFiles.length > 0 && precommitFiles.length > 0 && weeklyFiles.length > 0,
    '四层都不得为空（分层登记被写坏）');

  // runner 源码必须真的引用 registry（防「脚本存在但不读单一源」）
  const sh = (f) => readFileSync(join(ROOT, 'server', 'scripts', f), 'utf8');
  assert.match(sh('run-daily.mjs'), /dailyFiles/, 'run-daily.mjs 未引用 registry 的 dailyFiles');
  assert.match(sh('run-guards.mjs'), /guardsFiles/, 'run-guards.mjs 未引用 registry 的 guardsFiles');
  const pre = sh('run-precommit.mjs');
  for (const key of ['dailyFiles', 'guardsFiles', 'precommitFiles']) {
    assert.match(pre, new RegExp(key), `run-precommit.mjs 未引用 registry 的 ${key}`);
  }
  assert.match(pre, /ensurePlaywright/, 'run-precommit.mjs 缺少 Playwright 缺失时的明确报错（跳层＝假绿）');
  assert.match(sh('run-changed.mjs'), /guardsFiles/, 'run-changed.mjs 未引用 registry 的 guardsFiles');

  // 四个 runner 入口不得再用 `set X=1&&`（cmd 专有；Linux 上不能跑）
  for (const key of ['test:daily', 'test:guards', 'test:precommit', 'test:changed']) {
    assert.doesNotMatch(scripts[key], /(^|&&\s*)set\s+[A-Z_]+=/, `${key} 仍含 cmd 专有的 set 语法`);
  }

  const full = scripts['test:full'] || '';
  assert.ok(/run-suite\.mjs/.test(full) && /SWEEP_SHARD=all/.test(full),
    'test:full 必须是 run-suite 全量（SWEEP_SHARD=all），否则会静默漏掉分层外的文件');
});

test('T6 非空转：规模下限、reason 完备、比较器能判出人为差异', () => {
  assert.ok(TEST_TIERS.length >= 240, `registry 只有 ${TEST_TIERS.length} 条（下限 240）：登记表被截断`);
  for (const tier of TIERS) assert.ok(filesByTier(tier).length > 0, `层 ${tier} 为空`);
  const badReason = TEST_TIERS.filter((e) => !e.reason || String(e.reason).trim().length < 4);
  assert.deepEqual(badReason.map((e) => e.file), [], 'registry 条目缺 reason / 覆盖来源');
  const badTier = TEST_TIERS.filter((e) => !TIERS.includes(e.tier));
  assert.deepEqual(badTier.map((e) => e.file), [], 'registry 出现未知层级');

  // 比较器自检：人为制造「少登记 / 多登记 / 重复登记」，三种都必须被判出
  const disk = diskFiles();
  const ghost = 'ghost-tier-fixture.test.mjs';
  const victim = disk[0];
  const missingDiff = diffTiers([...disk, ghost]);
  assert.ok(missingDiff.missing.includes(ghost), '比较器未判出「磁盘有、登记无」');
  const extraDiff = diffTiers(disk.filter((f) => f !== victim));
  assert.ok(extraDiff.extra.includes(victim), '比较器未判出「登记有、磁盘无」');
  const dupDiff = diffTiers(disk, [...TEST_TIERS, { file: victim, tier: 'weekly', reason: '自检重复' }]);
  assert.ok(dupDiff.duplicates.includes(victim), '比较器未判出「同一文件登记两层」');
});

// ── T7 守卫台账：标题数字与正文「现行 N 件」必须一致（2026-10-29 · P6 例外补守卫）──
// 原例外：`content/05_ai_coding/GUARD_INVENTORY.md` 的标题写一个数、正文写另一个数，
//   没有任何机检；读者无法判断哪个是现行值。本项只钉「三处现行数一致」：
//   ① frontmatter title 的最后一个「N 件」；② §一 标题的「现行 N 件」；③ 正文「现行 **N 件 / T 条**」。
// 反例：把标题数字改大 1，解析器必须报不一致（证明不是恒真）。
function parseGuardLedger(src) {
  const title = /^title:\s*"[^"]*?(\d+)\s*件[^"]*"/m.exec(src)?.[1];
  const heading = /^##\s*一、[^\n]*?现行\s*(\d+)\s*件/m.exec(src)?.[1];
  const body = /现行\s*\*\*(\d+)\s*件\s*\/\s*(\d+)\s*条\*\*/.exec(src);
  const problems = [];
  if (!title) problems.push('标题缺「N 件」');
  if (!heading) problems.push('§一 标题缺「现行 N 件」');
  if (!body) problems.push('正文缺「现行 N 件 / T 条」');
  if (title && heading && title !== heading) {
    problems.push(`标题写 ${title} 件，§一 标题写 ${heading} 件`);
  }
  if (title && body && title !== body[1]) {
    problems.push(`标题写 ${title} 件，正文写 ${body[1]} 件`);
  }
  return { title, heading, bodyCount: body?.[1], problems };
}

test('T7 守卫台账标题数字与正文「现行 N 件」一致（含反例）', () => {
  const file = join(ROOT, 'content', '05_ai_coding', 'GUARD_INVENTORY.md');
  const src = readFileSync(file, 'utf8');
  const parsed = parseGuardLedger(src);
  assert.deepEqual(parsed.problems, [], `守卫台账标题与正文不一致：\n  ${parsed.problems.join('\n  ')}`);
  assert.ok(Number(parsed.title) >= 50, `台账现行件数只解析到 ${parsed.title}（下限 50）：解析口径被写坏`);

  // 非空转：§一 表内登记行不得少于标题声明的件数（防标题虚高）
  const section = src.split(/^##\s*二、/m)[0];
  const rows = section.split(/\r?\n/).filter((l) => /^\|\s*`[a-z0-9-]+\.test\.mjs`/.test(l));
  assert.ok(rows.length >= Number(parsed.title),
    `§一 表内只有 ${rows.length} 行，少于标题声明的 ${parsed.title} 件`);

  // 反例：标题数字 +1 必须判红
  const tampered = src.replace(/^title:.*$/m, (line) => line.replace(/\d+(?=\s*件)/, String(Number(parsed.title) + 1)));
  const bad = parseGuardLedger(tampered);
  assert.ok(bad.problems.some((p) => p.startsWith('标题写')),
    `反例：标题数字改动后未判红（解析器恒真）——${JSON.stringify(bad)}`);
});
