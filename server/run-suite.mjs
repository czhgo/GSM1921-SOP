// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  server/run-suite.mjs — 全量测试的**分片启动器**（2026-10-03 批次 360 · `D-753`「择其精要」；
//  2026-10-06 批次 434 · `D-807`⑤ 改**双通道并行**：非 e2e 高并发 ∥ e2e 串行）
//
//  口径与代价见 `server/test/sweep-shard.mjs` 头注（分片单源）与 `CLAUDE.md H25 时长纪律`。
//  本文件只做五件事：
//    ① 按 `--test` 的默认发现规则列出 `test/` 下全部测试文件（单源＝`sweep-shard.discoverTestFiles`）；
//    ② 分「非 e2e（纯 node，**每片都全跑**，且以 `--test-concurrency=NON_E2E_CONCURRENCY` 并行）」
//       与「e2e（浏览器类，**串行** `--test-concurrency=1`；分片档按片切）」两类；
//    ③ 按 `SWEEP_SHARD`（缺省 `1`；`all`＝全量）拼出 e2e 通道的文件表 ＋ 注入 `FORM_LOOP_PAGES`；
//    ④ **通道并行**：分片档＝非 e2e（高并发）∥ e2e（串行）两道；全量档＝非 e2e ∥ **e2e 双道**
//       （A 道含 :3000 三件同道串行；B 道与其余自托管件各自隔离；输出按行前缀分流）；
//    ⑤ 任一通道非零退出 ⇒ 总退出码非零。
//  ⚠ 「四片并集 ≡ 全部 e2e 文件」由守卫 `test/suite-shard.test.mjs` 机械核对（新增 e2e 未归片即红灯）。
//  ⚠ 为什么 e2e 不并行：e2e 件共享 `:3000` 外部服务与演示库数据（click-cost 会真实写活动、
//    form-loop 逐台翻页）⇒ 文件级并行会互相踩数据；非 e2e 件全是内存态（`createApp({db:':memory:'})`）
//    ⇒ 并行安全（判据面零变化，只是调度）。
// ════════════════════════════════════════════════════════════════
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { cpus } from 'node:os';
import {
  SHARD_COUNT, SHARD_PAGES, SHARD_E2E_FILES, ALWAYS_E2E, parseShard, discoverTestFiles,
} from './test/sweep-shard.mjs';

const TEST_DIR = join(import.meta.dirname, 'test');
const { all: files, e2e: e2eFiles, nonE2e: nonE2eFiles } = discoverTestFiles(TEST_DIR);

/** 非 e2e 通道并发度（纯内存用例；上限 8 防句柄放大，下限 4 保小机也有收益） */
const NON_E2E_CONCURRENCY = Math.max(4, Math.min(8, cpus().length));

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

console.log('─'.repeat(72));
console.log(`[suite] 非 e2e 通道：${nonE2eFiles.length} 个文件 · 并发 ${NON_E2E_CONCURRENCY}（每片全跑）`);
if (mode === 'all') {
  console.log(`[suite] e2e 通道（全量档 SWEEP_SHARD=all）：${e2eFiles.length} 个文件 · 串行`);
} else {
  console.log(`[suite] e2e 通道 · 分片 ${shard}/${SHARD_COUNT}：工作台＝${(SHARD_PAGES[shard] || []).join(' / ')}`);
  console.log(`[suite]   本片 e2e ${pickedE2e.length} / ${e2eFiles.length} 个 · FORM_LOOP_PAGES=${formLoopPages}（只跑这些工作台的真机流程）`);
  console.log(`[suite]   ⚠ 本片未跑 e2e ${e2eFiles.length - pickedE2e.length} 个文件；发布前/大批改动请跑 \`npm run test:full\``);
}
console.log('─'.repeat(72));

// ── 行缓冲输出（两通道并行写屏不串行 garble：逐行加前缀，事件循环单线程下逐行原子）──
function makePump(tag) {
  return (chunk) => {
    let buf = String(chunk);
    let idx;
    while ((idx = buf.indexOf('\n')) >= 0) {
      process.stdout.write(`${tag}${buf.slice(0, idx + 1)}`);
      buf = buf.slice(idx + 1);
    }
    if (buf) process.stdout.write(`${tag}${buf}\n`);
  };
}

/** 起一个测试子通道；resolve 退出码（信号终止按 1 记） */
function runChannel(tag, list, extraEnv, concurrency) {
  return new Promise((resolve) => {
    const child = spawn(
      process.execPath,
      ['--test', `--test-concurrency=${concurrency}`, ...list.map((f) => join(TEST_DIR, f))],
      { stdio: ['inherit', 'pipe', 'pipe'], env: { ...process.env, ...extraEnv } },
    );
    child.stdout.on('data', makePump(tag));
    child.stderr.on('data', makePump(tag));
    child.on('exit', (code, signal) => {
      if (signal) console.error(`[suite] ${tag} 通道被信号 ${signal} 终止`);
      resolve(code ?? 1);
    });
  });
}

const t0 = Date.now();
// ── 通道划分（D-807⑤ · 2026-10-06 批次 435）：全量档 e2e 再分双道 ──
//   依据（实测 grep）：仅 click-cost / b3-1-makeup-writeback / mock-integrity 三件依赖外部 `:3000`
//   （共享演示库数据，须同道串行防互踩）；其余 e2e 件全部 `app.listen(0)` 自托管 ⇒ 文件级并行安全。
//   form-loop-sweep 是最重件（全页真机流程），分给文件数较少的那道做粗平衡。
const SHARED_PORT_FILES = ['click-cost.test.mjs', 'b3-1-makeup-writeback.test.mjs', 'mock-integrity.test.mjs'];
const channels = [];
if (mode === 'all') {
  const laneA = [...SHARED_PORT_FILES];
  const laneB = [];
  const selfHosted = e2eFiles.filter((f) => !SHARED_PORT_FILES.includes(f) && !ALWAYS_E2E.includes(f));
  selfHosted.forEach((f, i) => (i % 2 === 0 ? laneB : laneA).push(f));
  (laneA.length <= laneB.length ? laneA : laneB).push(...ALWAYS_E2E);
  console.log(`[suite] e2e 双道：A=${laneA.length} 件（含 :3000 三件）· B=${laneB.length} 件（各自 listen(0) 隔离）`);
  channels.push(['[node]', nonE2eFiles, {}, NON_E2E_CONCURRENCY]);
  channels.push(['[e2e-A]', laneA, {}, 1]);
  channels.push(['[e2e-B]', laneB, {}, 1]);
} else {
  channels.push(['[node]', nonE2eFiles, {}, NON_E2E_CONCURRENCY]);
  channels.push(['[e2e] ', pickedE2e, formLoopPages ? { FORM_LOOP_PAGES: formLoopPages } : {}, 1]);
}
const codes = await Promise.all(channels.map(([tag, list, env, conc]) => runChannel(tag, list, env, conc)));
const secs = ((Date.now() - t0) / 1000).toFixed(1);
const ok = codes.every((c) => c === 0);
console.log('─'.repeat(72));
console.log(`[suite] 全通道完成（${channels.map(([t], i) => `${t}=${codes[i] === 0 ? '绿' : `红(${codes[i]})`}`).join(' · ')}）· 墙钟 ${secs}s（H25 时长纪律：分片 ≤900s / 全量 ≤1200s）`);
process.exit(ok ? 0 : 1);
