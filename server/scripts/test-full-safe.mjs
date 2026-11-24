// server/scripts/test-full-safe.mjs — 全量测试「先备份 → 再全量 → 再清测试残留」的安全包装
// ════════════════════════════════════════════════════════════════
// 为什么需要：`test:full` 里仍有真机件会连 `server/data.db`（如 click-cost 创建活动）
// 且测试失败 / 中断可能留下残留。本包装把「可恢复」前置：
//   ① `scripts/backup.mjs` 备份库 + 附件到 `backups/pre-test-<时间戳>/`；
//      review 实例库 `data.review.db`（:3000 在用）另备到 `<备份>/review/`（批次 620）；
//   ② 跑全量（等价 `test:full`：SWEEP_SHARD=all）；
//   ③ 无论测试成败都执行 `cleanup.mjs --test-residue --apply`，`data.db` 与 `data.review.db` **两库都清**；
//   ④ 测试失败时打印用 ① 的备份恢复库与附件的命令。
// 用法（server 目录）：`npm run test:full:safe`
// 退出码：0 = 备份 + 全量 + 清理均成功；非 0 = 任一步失败（失败会打印恢复指引）。
// ════════════════════════════════════════════════════════════════
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SERVER_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const stamp = new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').slice(0, 19);
const backupDir = path.join(SERVER_DIR, 'backups', `pre-test-${stamp}`);
const DB_MAIN = path.join(SERVER_DIR, 'data.db');
// 2026-11-24 批次 620：`:3000` review 实例用的是独立库 `data.review.db`（start-review.mjs），
//   e2e 真机件经 API 写进的是它——备份与残留清理必须同时覆盖两库。
const DB_REVIEW = path.join(SERVER_DIR, 'data.review.db');
const reviewBackupDir = path.join(backupDir, 'review');
const dbTargets = [DB_MAIN, DB_REVIEW].filter((file) => fs.existsSync(file));

function run(args, extraEnv = {}) {
  return spawnSync(process.execPath, args, {
    cwd: SERVER_DIR,
    stdio: 'inherit',
    env: { ...process.env, ...extraEnv },
  });
}

console.log(`[test:full:safe] ① 备份 → ${backupDir}`);
const backup = run(['scripts/backup.mjs', '--out', backupDir]);
if (backup.status !== 0) {
  console.error('[test:full:safe] ✖ 备份失败，已中止（未运行任何测试）。');
  process.exit(backup.status || 1);
}
if (fs.existsSync(DB_REVIEW)) {
  console.log(`[test:full:safe] ①-b 备份 review 库 → ${reviewBackupDir}`);
  const reviewBackup = run(['scripts/backup.mjs', '--out', reviewBackupDir], { DB_PATH: DB_REVIEW });
  if (reviewBackup.status !== 0) {
    console.error('[test:full:safe] ✖ review 库备份失败，已中止（未运行任何测试）。');
    process.exit(reviewBackup.status || 1);
  }
}

console.log('[test:full:safe] ② 全量测试（SWEEP_SHARD=all）');
const tests = run(['run-suite.mjs'], {
  DISABLE_PASSWORD_CHECK: '1',
  DEMO_READONLY: '0',
  SWEEP_SHARD: 'all',
});
if (tests.status !== 0) {
  console.error(`[test:full:safe] ✖ 全量测试失败（退出码 ${tests.status}）。库已在本轮测试前备份：`);
  console.error(`[test:full:safe]   恢复 data.db：停服 → 用 "${path.join(backupDir, 'data.db')}" 覆盖 "${DB_MAIN}"（并删除同目录 -wal / -shm）`);
  console.error(`[test:full:safe]         → 用 "${path.join(backupDir, 'uploads')}" 覆盖 "${path.join(SERVER_DIR, 'uploads')}"`);
  if (fs.existsSync(DB_REVIEW)) {
    console.error(`[test:full:safe]   恢复 review 库：用 "${path.join(reviewBackupDir, 'data.db')}" 覆盖 "${DB_REVIEW}"（并删除同目录 -wal / -shm）`);
  }
  console.error('[test:full:safe]         → 重启服务。');
}

console.log('[test:full:safe] ③ 清理已知测试残留（两库）');
let cleanupFailed = null;
for (const dbFile of dbTargets) {
  console.log(`[test:full:safe]   · ${path.basename(dbFile)}`);
  const cleanup = run(['scripts/cleanup.mjs', '--db', dbFile, '--test-residue', '--apply']);
  if (cleanup.status !== 0 && cleanupFailed === null) cleanupFailed = cleanup.status;
}
if (cleanupFailed !== null) {
  console.error('[test:full:safe] ✖ 测试残留清理失败（见上）。库备份仍在：', backupDir);
  process.exit(cleanupFailed || 1);
}

if (tests.status !== 0) process.exit(tests.status || 1);

console.log(`[test:full:safe] ✔ 备份 / 全量 / 清理均成功。备份：${backupDir}`);
