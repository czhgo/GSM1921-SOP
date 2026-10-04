// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  server/run-suite.mjs — 全量测试的**分片启动器**（2026-10-03 批次 360 · `D-753`「择其精要」）
//
//  口径与代价见 `server/test/sweep-shard.mjs` 头注（分片单源）与 `CLAUDE.md R-85`（改准）。
//  本文件只做四件事：
//    ① 按 `--test` 的默认发现规则列出 `test/` 下全部测试文件；
//    ② 把它们分成「非 e2e（**每片都全跑**）」与「e2e（**按片切**）」两类；
//    ③ 按 `SWEEP_SHARD`（缺省 `1`；`all`＝全量）拼出本片的文件表 ＋ 给子进程注入 `FORM_LOOP_PAGES`；
//    ④ `spawn node --test --test-concurrency=1 <files>`，透传退出码。
//  ⚠ 「四片并集 ≡ 全部 e2e 文件」由守卫 `test/suite-shard.test.mjs` 机械核对（新增 e2e 未归片即红灯）。
// ════════════════════════════════════════════════════════════════
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import {
  SHARD_COUNT, SHARD_PAGES, SHARD_E2E_FILES, ALWAYS_E2E, parseShard, discoverTestFiles,
} from './test/sweep-shard.mjs';

const TEST_DIR = join(import.meta.dirname, 'test');
const { all: files, e2e: e2eFiles, nonE2e: nonE2eFiles } = discoverTestFiles(TEST_DIR);

const { mode, shard } = parseShard();

let pickedE2e;
let formLoopPages = '';
if (mode === 'all') {
  pickedE2e = e2eFiles;
} else {
  const others = SHARD_E2E_FILES[shard] || [];
  const missing = others.filter((f) => !e2eFiles.includes(f));
  if (missing.length) {
    console.error(`[suite] ✗ 分片 ${shard} 登记了不存在的 e2e 文件：${missing.join(' / ')}`);
    process.exit(2);
  }
  pickedE2e = [...ALWAYS_E2E, ...others].filter((f) => e2eFiles.includes(f));
  formLoopPages = (SHARD_PAGES[shard] || []).join(',');
}

const list = [...nonE2eFiles, ...pickedE2e].map((f) => join(TEST_DIR, f));

console.log('─'.repeat(72));
if (mode === 'all') {
  console.log(`[suite] 全量档（SWEEP_SHARD=all）：${files.length} 个测试文件（非 e2e ${nonE2eFiles.length} ＋ e2e ${e2eFiles.length}）`);
} else {
  console.log(`[suite] 分片档 ${shard}/${SHARD_COUNT}：工作台＝${(SHARD_PAGES[shard] || []).join(' / ')}`);
  console.log(`[suite]   非 e2e ${nonE2eFiles.length} 个文件（**每片都全跑**）＋ 本片 e2e ${pickedE2e.length} / ${e2eFiles.length} 个`);
  console.log(`[suite]   FORM_LOOP_PAGES=${formLoopPages}（只跑这些工作台的真机流程；其余片轮转覆盖）`);
  console.log(`[suite]   ⚠ 本片未跑 e2e ${e2eFiles.length - pickedE2e.length} 个文件；发布前/大批改动请跑 \`npm run test:full\``);
}
console.log('─'.repeat(72));

const child = spawn(
  process.execPath,
  ['--test', '--test-concurrency=1', ...list],
  { stdio: 'inherit', env: { ...process.env, ...(formLoopPages ? { FORM_LOOP_PAGES: formLoopPages } : {}) } },
);
child.on('exit', (code, signal) => {
  if (signal) { console.error(`[suite] 子进程被信号 ${signal} 终止`); process.exit(1); }
  process.exit(code ?? 1);
});
