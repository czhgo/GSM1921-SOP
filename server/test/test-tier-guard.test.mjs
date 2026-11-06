// role: [工程师]+[AI]
// server/test/test-tier-guard.test.mjs — 测试分层登记 / 预算守卫（B-499-5 · Task 9，2026-10-21）
// ════════════════════════════════════════════════════════════════
// 为什么要这层守卫：
//   · daily 是「每次改完必跑」的那一层。没有登记守卫时，新增测试只写文件不登记 ⇒ **从不自动运行**；
//     登记了但不分层 ⇒ daily 被 Playwright e2e 拖长到十几分钟，最后被整层跳过（＝判据实际失效）。
//   · 本守卫把「磁盘实况 ↔ 三层登记 ↔ npm scripts ↔ 预算」钉在一起：
//       T1 磁盘全部 `*.test.{js,mjs}` ↔ registry 三层并集**双向相等**；三层互不重叠
//       T2 daily 不含 page-sweep / form-loop-sweep / 任何 `*-e2e` 重活
//       T3 不 import playwright 的纯 node 测试**必须全部在 daily**（`doc-consistency::S16` 同口径）
//       T4 daily 文件数与静态 `test(` 调用点数不得高于 registry 预算常量
//       T5 `test:daily` 显式清单 ≡ registry daily；`test:precommit` / `test:full` 覆盖三层并集
//       T6 非空转：registry 规模下限、每条 reason 非空、比较器能判出人为差异
//   · 移层不删判据：precommit / full 仍跑全部文件（`run-suite.mjs` 单源发现），
//     本守卫只核对「哪一层跑」，不核对「跑不跑」。
// 运行：`node --test test/test-tier-guard.test.mjs`（server 目录）
// ════════════════════════════════════════════════════════════════
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import {
  TIERS, TEST_TIERS, DAILY_FILE_BUDGET, DAILY_TEST_BUDGET,
  filesByTier, dailyFiles, precommitFiles, weeklyFiles,
  allRegisteredFiles, diffTiers, isPlaywrightSource, countTestCases, parseScriptFiles,
} from '../test-tier-registry.mjs';

const ROOT = join(import.meta.dirname, '..', '..');
const TDIR = join(ROOT, 'server', 'test');
const PKG = JSON.parse(readFileSync(join(ROOT, 'server', 'package.json'), 'utf8'));
const read = (f) => readFileSync(join(TDIR, f), 'utf8');

const diskFiles = () => readdirSync(TDIR).filter((f) => /\.test\.(js|mjs)$/.test(f)).sort();

test('T1 磁盘测试文件 ↔ 三层登记双向相等，且三层互不重叠', () => {
  const disk = diskFiles();
  const diff = diffTiers(disk);
  assert.deepEqual(diff.missing, [],
    `以下磁盘测试文件**未登记层级**（新增测试必须同批登记 registry）：\n  ${diff.missing.join('\n  ')}`);
  assert.deepEqual(diff.extra, [],
    `以下 registry 条目在磁盘上不存在（删除测试须同批删登记并写明覆盖来源）：\n  ${diff.extra.join('\n  ')}`);
  assert.deepEqual(diff.duplicates, [],
    `以下文件在 registry 中被登记了不止一层（三层必须互斥）：${diff.duplicates.join(' / ')}`);
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

test('T3 不 import playwright 的纯 node 测试必须全部在 daily（S16 同口径）', () => {
  const disk = diskFiles();
  const nonPw = disk.filter((f) => !isPlaywrightSource(read(f)));
  // 非空转：两侧都要有规模（解析写坏 ⇒ 差集恒空 ⇒ 漏登记也绿）
  assert.ok(nonPw.length >= 190, `非 playwright 测试只解析到 ${nonPw.length} 个（下限 190）：解析面被写坏`);
  assert.ok(dailyFiles.length >= 190, `daily 只登记了 ${dailyFiles.length} 个（下限 190）：registry 被写坏`);
  const daily = new Set(dailyFiles);
  const missing = nonPw.filter((f) => !daily.has(f)).sort();
  assert.deepEqual(missing, [],
    `以下纯 node 测试**不在 daily**（守卫孤儿化 / 被错误降层）：\n  ${missing.join('\n  ')}`);
  // 反向：daily 不得混入 Playwright（本仓 daily 定义为纯 node 快判据）
  const dailyPw = dailyFiles.filter((f) => isPlaywrightSource(read(f)));
  assert.deepEqual(dailyPw, [], `daily 混入 Playwright 测试：${dailyPw.join(' / ')}`);
});

test('T4 daily 文件数与断言预算不得高于登记值', () => {
  const cases = dailyFiles.reduce((n, f) => n + countTestCases(read(f)), 0);
  // 非空转：预算本身要有规模，且不能宽到「加十个文件也不红」
  assert.ok(DAILY_FILE_BUDGET >= 190, `DAILY_FILE_BUDGET=${DAILY_FILE_BUDGET}（下限 190）：预算常量被写坏`);
  assert.ok(DAILY_TEST_BUDGET >= 1200, `DAILY_TEST_BUDGET=${DAILY_TEST_BUDGET}（下限 1200）：预算常量被写坏`);
  assert.ok(dailyFiles.length <= DAILY_FILE_BUDGET,
    `daily 文件数 ${dailyFiles.length} 超过登记预算 ${DAILY_FILE_BUDGET}：新增测试须显式上调预算并写明理由`);
  assert.ok(cases <= DAILY_TEST_BUDGET,
    `daily 静态 test() 调用点 ${cases} 超过登记预算 ${DAILY_TEST_BUDGET}：新增断言须显式上调预算并写明理由`);
  // 预算不得高于实然值太多（防「预算写成 9999」失去意义）
  assert.ok(DAILY_FILE_BUDGET - dailyFiles.length <= 4,
    `DAILY_FILE_BUDGET=${DAILY_FILE_BUDGET} 比实然 ${dailyFiles.length} 宽松 >4：预算失去约束力`);
  assert.ok(DAILY_TEST_BUDGET - cases <= 40,
    `DAILY_TEST_BUDGET=${DAILY_TEST_BUDGET} 比实然 ${cases} 宽松 >40：预算失去约束力`);
});

test('T5 package.json 三个脚本与 registry 一致', () => {
  const daily = new Set(parseScriptFiles(PKG.scripts['test:daily']));
  assert.deepEqual([...daily].sort(), [...dailyFiles].sort(),
    'test:daily 显式清单与 registry daily 层不一致（改层必须同批改 package.json）');
  assert.ok(dailyFiles.length > 0 && precommitFiles.length > 0 && weeklyFiles.length > 0,
    '三层都不得为空（分层登记被写坏）');

  const union = new Set([...dailyFiles, ...precommitFiles, ...weeklyFiles]);
  const pre = PKG.scripts['test:precommit'] || '';
  // precommit 允许两种等价形态：① 显式三层并集；② `SWEEP_SHARD=all node run-suite.mjs`（全量单源）
  if (/run-suite\.mjs/.test(pre) && /SWEEP_SHARD=all/.test(pre)) {
    assert.ok(true, 'precommit = run-suite 全量（等价于三层并集）');
  } else {
    assert.deepEqual(new Set(parseScriptFiles(pre)), union,
      'test:precommit 既不是 run-suite 全量，也不等于 registry 三层并集');
  }
  const full = PKG.scripts['test:full'] || '';
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
