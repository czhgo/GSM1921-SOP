// role: [工程师]+[AI]
// server/scripts/check-batch-commits.mjs — 批次提交 message 自检
//
// 判据（CLAUDE.md H20.3 / H20.5 / H80-6）：
//   - **一批一条** commit；确需拆分时最多两条，第二条必须以「批次 N 续：/ 更正：」开头。
//   - message 五段式：批次 N｜为什么｜改动面｜验证读数｜D/任务号（历史里也有 `551｜` 与半角 |）。
//   - 禁止为「把 hash 回填到执行日志」而追加第二个 commit。
//   - **资产命中**（H80-6）：body 必须有一行 `资产命中：…`，且至少列一个 `EA §` 或 `D-xxx`，
//     防止下一轮重复探查同一结论。
//
// 只检查「批次号开头」的提交；非批次号风格的历史提交一律跳过，避免误伤。
// 默认（--limit 1）检查 HEAD 与 HEAD~1：五段、回填、同批重复三项都判红。
// `--limit 80` 用于历史体检：五段 / 回填写入违规；同批重复只告警不改变退出码（历史存量不追罚）。
//
// 用法：cd server && node scripts/check-batch-commits.mjs [--limit <N>] [--help]
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '../..');
const USAGE = `用法：node scripts/check-batch-commits.mjs [--limit <N>] [--help]

  --limit <N>  检查最近 N 条 commit，默认 1（查 HEAD 与 HEAD~1，供收尾自检）
  --help       打印本用法

判据：批次号开头的提交，message 必须五段（批次 N｜为什么｜改动面｜验证读数｜D/任务号）；
body 必须写「资产命中：<EA §x / D-xxx>」（H80-6，避免重复探查）；
带 a 后缀且含「回填 / 补记」的提交视为 hash 回填 commit，应并入主记录；
同一批不得出现两条都以「批次 N｜」开头的提交（第二条须用「批次 N 续：/ 更正：」）。`;

const args = process.argv.slice(2);
let limit = 1;

for (let i = 0; i < args.length; i += 1) {
  const arg = args[i];
  if (arg === '--help' || arg === '-h') {
    console.log(USAGE);
    process.exit(0);
  }
  if (arg === '--limit') {
    limit = Number(args[i + 1]);
    i += 1;
    continue;
  }
  console.error(`未知参数：${arg}\n\n${USAGE}`);
  process.exit(2);
}

if (!Number.isInteger(limit) || limit < 1) {
  console.error(`--limit 必须是正整数\n\n${USAGE}`);
  process.exit(2);
}

// 多取一条，供「HEAD 与父提交同批」判定
const fetchCount = limit + 1;
const raw = execFileSync('git', ['log', `-n${fetchCount}`, '--pretty=format:%H%x1f%s%x1f%b%x1e'], {
  cwd: ROOT,
  encoding: 'utf8',
});

const commits = raw
  .split('\x1e')
  .map((record) => record.trim())
  .filter(Boolean)
  .map((record) => {
    const [hash, subject, body] = record.split('\x1f');
    return { hash, subject: subject ?? '', body: body ?? '' };
  });

// 兼容两种前缀：新规范「批次 551｜」与历史「551｜」
const BATCH_NEW = /^批次\s*(\d{3})(a?)(?:（[^）]*）)?\s*[｜|]/;
const BATCH_OLD = /^(\d{3})(a?)(?:（[^）]*）)?\s*[｜|]/;
const CONTINUATION = /^批次\s*\d{3}\s*(续|更正)[：:]/;

function batchOf(subject) {
  const m = BATCH_NEW.exec(subject) || BATCH_OLD.exec(subject);
  if (!m) return null;
  return { id: m[1], backfillSuffix: m[2] === 'a' };
}

const violations = [];
const warnings = [];
const checked = commits.slice(0, limit);

for (let i = 0; i < checked.length; i += 1) {
  const { hash, subject, body } = checked[i];
  const batch = batchOf(subject);
  if (!batch) continue;
  // 默认（--limit 1）为收尾门禁，判红；历史体检（--limit >1）只告警，不追罚存量
  const bucket = limit === 1 ? violations : warnings;

  if (batch.backfillSuffix && /回填|补记/.test(subject)) {
    bucket.push({ hash, subject, reason: 'hash 回填 commit 应并入主记录' });
    continue;
  }

  const segments = subject.split(/[｜|]/);
  if (segments.length !== 5) {
    bucket.push({ hash, subject, reason: `message 不足五段（实际 ${segments.length} 段）` });
  }

  // 资产命中（H80-6）：body 必须有一行 `资产命中：`，且至少列一个 EA § / D-xxx
  const assetLine = String(body).split(/\r?\n/).find((line) => line.trim().startsWith('资产命中：'));
  if (!assetLine) {
    bucket.push({ hash, subject, reason: 'body 缺「资产命中：」行（H80-6）' });
  } else if (!/(?:EA\s*§|D-\d{3})/.test(assetLine)) {
    bucket.push({ hash, subject, reason: '「资产命中：」须至少列一个 EA §x 或 D-xxx' });
  }

  // 同批重复：与父提交批次号相同，且父 / 本提交都不是「续 / 更正」
  const parent = commits[i + 1];
  if (parent) {
    const parentBatch = batchOf(parent.subject);
    if (parentBatch && parentBatch.id === batch.id) {
      const isContinuation = CONTINUATION.test(subject) || CONTINUATION.test(parent.subject);
      if (!isContinuation) {
        bucket.push({
          hash,
          subject,
          reason: `同批重复提交（批次 ${batch.id}）；第二条须用「批次 ${batch.id} 续：/ 更正：」`,
        });
      }
    }
  }
}

// ── 批次号单调 + 「续 / 更正」紧邻同批次（2026-11-24 `D-923`）──────────────
//   历史乱序（612 → 616 更正 → 612 续）已 push、不改写；本检查只约束**新增**提交。
{
  const bucket = limit === 1 ? violations : warnings;
  const seq = commits.map((c) => ({
    hash: c.hash,
    subject: c.subject,
    batch: batchOf(c.subject),
    isContinuation: CONTINUATION.test(c.subject),
    isMerge: /^Merge\b/.test(c.subject),
  }));
  for (let i = 0; i < Math.min(checked.length, seq.length); i += 1) {
    const cur = seq[i];
    if (cur.isMerge) continue;
    // ① 「续 / 更正」必须紧邻同批次上一条：commits 为**新→旧**序，故「上一条」＝更旧一条 commits[i+1]
    //   （2026-11-25 批次 633 更正：原写 i-1 指向更**新**的提交，导致 HEAD 永远取不到上一条）
    if (cur.isContinuation) {
      const prev = seq[i + 1];
      const prevId = prev?.batch?.id || null;
      const curId = (CONTINUATION.exec(cur.subject) && cur.subject.match(/批次\s*(\d{3})/)?.[1]) || null;
      if (!prev || !prev.batch || prev.batch.id !== curId) {
        bucket.push({
          hash: cur.hash,
          subject: cur.subject,
          reason: `「续/更正」未紧邻同批次上一条（上一条批次：${prevId || '无'}，本条批次：${curId || '未解析'}）`,
        });
      }
    }
    // ② 批次号单调不减：新提交的批次号不得小于相邻更旧提交的批次号
    const older = seq[i + 1];
    if (cur.batch && older?.batch && Number(cur.batch.id) < Number(older.batch.id)) {
      bucket.push({
        hash: cur.hash,
        subject: cur.subject,
        reason: `批次号倒退（${cur.batch.id} < 更旧的 ${older.batch.id}）；批次号在时间线上必须单调不减`,
      });
    }
  }
}

for (const { hash, subject, reason } of violations) {
  console.log(`✖ ${hash.slice(0, 9)} ${subject} — ${reason}`);
}
for (const { hash, subject, reason } of warnings) {
  console.log(`⚠ ${hash.slice(0, 9)} ${subject} — ${reason}`);
}
console.log(`检查 ${checked.length} 条 · 违规 ${violations.length} 条 · 告警 ${warnings.length} 条`);
process.exit(violations.length ? 1 : 0);
