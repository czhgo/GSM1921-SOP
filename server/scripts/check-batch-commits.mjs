// role: [工程师]+[AI]
// server/scripts/check-batch-commits.mjs — 批次提交 message 自检
//
// 判据（CLAUDE.md H20.3 / H20.5）：
//   - 每批产出 1–3 个按逻辑拆分的 commit；禁止为「把 hash 回填到执行日志」而追加第二个 commit。
//   - message 五段式：批次号｜为什么｜改动面｜验证读数｜D/任务号（历史里也有半角 |）。
//
// 只检查「批次号开头」的提交；非批次号风格的历史提交一律跳过，避免误伤。
// 默认只查 1 条供收尾自检；`--limit 80` 用于历史体检。
//
// 用法：cd server && node scripts/check-batch-commits.mjs [--limit <N>] [--help]
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '../..');
const USAGE = `用法：node scripts/check-batch-commits.mjs [--limit <N>] [--help]

  --limit <N>  检查最近 N 条 commit，默认 1（只查刚提交的一条，供收尾自检）
  --help       打印本用法

判据：批次号开头的提交，message 必须五段（批次号｜为什么｜改动面｜验证读数｜D/任务号）；
带 a 后缀且含「回填 / 补记」的提交视为 hash 回填 commit，应并入主记录。`;

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

const raw = execFileSync('git', ['log', `-n${limit}`, '--pretty=format:%H%x1f%s%x1e'], {
  cwd: ROOT,
  encoding: 'utf8',
});

const commits = raw
  .split('\x1e')
  .map((record) => record.trim())
  .filter(Boolean)
  .map((record) => {
    const [hash, subject] = record.split('\x1f');
    return { hash, subject: subject ?? '' };
  });

// 批次号风格：三位批次号（可带 a 后缀、可带「（续）」括注）＋ 分隔符开头
const BATCH_PREFIX = /^\d{3}a?(?:（[^）]*）)?\s*[｜|]/;
// A 类：带 a 后缀的回填 commit
const BACKFILL = /^\d{3}a[｜|]/;

const violations = [];
for (const { hash, subject } of commits) {
  if (!BATCH_PREFIX.test(subject)) continue;

  if (BACKFILL.test(subject) && /回填|补记/.test(subject)) {
    violations.push({ hash, subject, reason: 'hash 回填 commit 应并入主记录' });
    continue;
  }

  const segments = subject.split(/[｜|]/);
  if (segments.length !== 5) {
    violations.push({ hash, subject, reason: `message 不足五段（实际 ${segments.length} 段）` });
  }
}

for (const { hash, subject, reason } of violations) {
  console.log(`✖ ${hash.slice(0, 9)} ${subject} — ${reason}`);
}
console.log(`检查 ${commits.length} 条 · 违规 ${violations.length} 条`);
process.exit(violations.length ? 1 : 0);
