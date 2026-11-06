// server/scripts/test-full-safe.mjs — 全量测试「先备份 → 再全量 → 再清测试残留」的安全包装
// ════════════════════════════════════════════════════════════════
// 为什么需要：`test:full` 里仍有真机件会连 `server/data.db`（如 click-cost 创建活动）
// 且测试失败 / 中断可能留下残留。本包装把「可恢复」前置：
//   ① `scripts/backup.mjs` 备份库 + 附件到 `backups/pre-test-<时间戳>/`；
//   ② 跑全量（等价 `test:full`：SWEEP_SHARD=all）；
//   ③ 无论测试成败都执行 `cleanup.mjs --test-residue --apply` 清已知测试残留；
//   ④ 测试失败时打印用 ① 的备份恢复库与附件的命令。
// 用法（server 目录）：`npm run test:full:safe`
// 退出码：0 = 备份 + 全量 + 清理均成功；非 0 = 任一步失败（失败会打印恢复指引）。
// ════════════════════════════════════════════════════════════════
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SERVER_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const stamp = new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').slice(0, 19);
const backupDir = path.join(SERVER_DIR, 'backups', `pre-test-${stamp}`);

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

console.log('[test:full:safe] ② 全量测试（SWEEP_SHARD=all）');
const tests = run(['run-suite.mjs'], {
  DISABLE_PASSWORD_CHECK: '1',
  DEMO_READONLY: '0',
  SWEEP_SHARD: 'all',
});
if (tests.status !== 0) {
  console.error(`[test:full:safe] ✖ 全量测试失败（退出码 ${tests.status}）。库已在本轮测试前备份：`);
  console.error(`[test:full:safe]   恢复：停服 → 用 "${path.join(backupDir, 'data.db')}" 覆盖 "${path.join(SERVER_DIR, 'data.db')}"`);
  console.error('[test:full:safe]         （并删除同目录 data.db-wal / data.db-shm）');
  console.error(`[test:full:safe]         → 用 "${path.join(backupDir, 'uploads')}" 覆盖 "${path.join(SERVER_DIR, 'uploads')}" → 重启。`);
}

console.log('[test:full:safe] ③ 清理已知测试残留');
const cleanup = run(['scripts/cleanup.mjs', '--test-residue', '--apply']);
if (cleanup.status !== 0) {
  console.error('[test:full:safe] ✖ 测试残留清理失败（见上）。库备份仍在：', backupDir);
  process.exit(cleanup.status || 1);
}

if (tests.status !== 0) process.exit(tests.status || 1);

console.log(`[test:full:safe] ✔ 备份 / 全量 / 清理均成功。备份：${backupDir}`);
