// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  server/scripts/tier-runner.mjs — 分层 runner 的共用调度（2026-11-08 批次 537）
//
//  为什么有这层：`test:daily` 的显式文件清单曾长到 8518 字符，超过 Windows 命令行上限 8191，
//    且用 `set X=1&&` 这种 cmd 专有语法 ⇒ Linux 不能跑。分片 spawn 与跨平台环境变量注入收在此处，
//    四个 runner（daily / guards / precommit / changed）共用同一调度口径。
//
//  口径：
//    · 文件清单单一源＝`server/test-tier-registry.mjs`，本文件不重新分类；
//    · 每片 60 文件 spawn 一次 `node --test --test-concurrency=4`，片内并行、片间顺序；
//    · 任一子进程非零退出 ⇒ 汇总退出码 1（不吞、不改写）。
//    · `--timing`（诊断用）改为**逐文件串行 spawn** 并打印 `file · Xs`；普通模式的分片并发口径不变。
// ════════════════════════════════════════════════════════════════
import { spawn } from 'node:child_process';
import { join } from 'node:path';

/** 测试目录（registry 里只存文件名） */
export const TEST_DIR = join(import.meta.dirname, '..', 'test');

/** 单片文件数上限（Windows 命令行长度安全值） */
export const CHUNK_SIZE = 60;

/** 片内并发（纯 node 用例；e2e 由 `run-suite.mjs` 另行串行） */
export const DEFAULT_CONCURRENCY = 4;

/** 命令行是否带 `--timing`（逐文件计时；只影响调度粒度与输出，不改判据） */
export const TIMING = process.argv.includes('--timing');

/** 跨平台测试环境变量（替代 `set X=1&&`；已显式设置时以调用方为准） */
export const testEnv = (extra = {}) => ({
  ...process.env,
  DISABLE_PASSWORD_CHECK: process.env.DISABLE_PASSWORD_CHECK ?? '1',
  DEMO_READONLY: process.env.DEMO_READONLY ?? '0',
  ...extra,
});

/** 按固定大小切片（保持登记顺序） */
export function chunk(list, size = CHUNK_SIZE) {
  const out = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
}

/** 跑一组文件，resolve 退出码（0 = 全绿）
 *  `quiet` 为计时模式用：先缓冲子进程输出，仅在红时回放（避免 26 段 TAP 冲掉计时行）。 */
export function runFiles(files, { concurrency = DEFAULT_CONCURRENCY, env = {}, quiet = false } = {}) {
  return new Promise((resolve) => {
    let buffered = '';
    const child = spawn(
      process.execPath,
      ['--test', `--test-concurrency=${concurrency}`, ...files.map((f) => join(TEST_DIR, f))],
      { stdio: ['ignore', 'pipe', 'pipe'], env: testEnv(env) },
    );
    const sink = (stream) => (d) => {
      if (quiet) buffered += d;
      else stream.write(d);
    };
    child.stdout.on('data', sink(process.stdout));
    child.stderr.on('data', sink(process.stderr));
    const flush = () => {
      if (quiet && buffered) process.stdout.write(buffered);
    };
    child.on('error', (err) => {
      console.error(`[runner] 启动失败：${err.message}`);
      flush();
      resolve(1);
    });
    child.on('exit', (code, signal) => {
      if (signal) {
        console.error(`[runner] 子进程被信号 ${signal} 终止`);
        flush();
        return resolve(1);
      }
      const c = code ?? 1;
      if (c !== 0) flush();
      resolve(c);
    });
  });
}

/** 逐文件串行计时（`--timing` 专用）：打印 `file · Xs`，末尾给最慢清单 */
async function runTimed(name, files, { concurrency, env }) {
  console.log(`[${name}] 计时模式：逐文件串行 spawn（共 ${files.length} 个文件）`);
  const rows = [];
  let code = 0;
  for (const file of files) {
    const t = Date.now();
    const c = await runFiles([file], { concurrency, env, quiet: true });
    const secs = (Date.now() - t) / 1000;
    rows.push({ file, secs, code: c });
    if (c !== 0) code = 1;
    console.log(`[${name}] ${file} · ${secs.toFixed(1)}s${c === 0 ? '' : ` · 红（退出码 ${c}）`}`);
  }
  const total = rows.reduce((n, r) => n + r.secs, 0);
  console.log('─'.repeat(72));
  console.log(`[${name}] 逐文件串行合计 ${total.toFixed(1)}s · 最慢 5 个：`);
  for (const r of [...rows].sort((a, b) => b.secs - a.secs).slice(0, 5)) {
    console.log(`[${name}]   ${r.file} · ${r.secs.toFixed(1)}s`);
  }
  return code;
}

/** 按层跑：分片 + 顺序执行；返回汇总退出码（`timing` 时改为逐文件计时） */
export async function runTier(name, files, { concurrency = DEFAULT_CONCURRENCY, env = {}, timing = TIMING } = {}) {
  const t0 = Date.now();
  console.log('─'.repeat(72));
  if (timing) {
    console.log(`[${name}] ${files.length} 个文件 · 计时模式`);
    console.log('─'.repeat(72));
    const code = await runTimed(name, files, { concurrency, env });
    const secs = ((Date.now() - t0) / 1000).toFixed(1);
    console.log(`[${name}] ${code === 0 ? '全绿' : `红（退出码 ${code}）`} · 墙钟 ${secs}s`);
    return code;
  }
  const chunks = chunk(files);
  console.log(`[${name}] ${files.length} 个文件 · ${chunks.length} 片 · 片内并发 ${concurrency}`);
  console.log('─'.repeat(72));
  let code = 0;
  for (const [i, slice] of chunks.entries()) {
    if (chunks.length > 1) console.log(`[${name}] 第 ${i + 1}/${chunks.length} 片（${slice.length} 文件）`);
    const c = await runFiles(slice, { concurrency, env });
    if (c !== 0) code = 1;
  }
  const secs = ((Date.now() - t0) / 1000).toFixed(1);
  console.log('─'.repeat(72));
  console.log(`[${name}] ${code === 0 ? '全绿' : `红（退出码 ${code}）`} · 墙钟 ${secs}s`);
  return code;
}

/** Playwright 可解析性检查：缺依赖时明确报错，不返回「假绿」 */
export async function ensurePlaywright() {
  try {
    await import('playwright');
    return true;
  } catch {
    console.error('[runner] ✗ 环境缺 Playwright：本层含真机 e2e，不能跳过。');
    console.error('[runner]   处置：cd server && npm install，然后 npx playwright install chromium');
    return false;
  }
}
