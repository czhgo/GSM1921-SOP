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
// ════════════════════════════════════════════════════════════════
import { spawn } from 'node:child_process';
import { join } from 'node:path';

/** 测试目录（registry 里只存文件名） */
export const TEST_DIR = join(import.meta.dirname, '..', 'test');

/** 单片文件数上限（Windows 命令行长度安全值） */
export const CHUNK_SIZE = 60;

/** 片内并发（纯 node 用例；e2e 由 `run-suite.mjs` 另行串行） */
export const DEFAULT_CONCURRENCY = 4;

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

/** 跑一组文件，resolve 退出码（0 = 全绿） */
export function runFiles(files, { concurrency = DEFAULT_CONCURRENCY, env = {} } = {}) {
  return new Promise((resolve) => {
    const child = spawn(
      process.execPath,
      ['--test', `--test-concurrency=${concurrency}`, ...files.map((f) => join(TEST_DIR, f))],
      { stdio: ['ignore', 'pipe', 'pipe'], env: testEnv(env) },
    );
    child.stdout.on('data', (d) => process.stdout.write(d));
    child.stderr.on('data', (d) => process.stderr.write(d));
    child.on('error', (err) => {
      console.error(`[runner] 启动失败：${err.message}`);
      resolve(1);
    });
    child.on('exit', (code, signal) => {
      if (signal) {
        console.error(`[runner] 子进程被信号 ${signal} 终止`);
        return resolve(1);
      }
      resolve(code ?? 1);
    });
  });
}

/** 按层跑：分片 + 顺序执行；返回汇总退出码 */
export async function runTier(name, files, { concurrency = DEFAULT_CONCURRENCY, env = {} } = {}) {
  const chunks = chunk(files);
  const t0 = Date.now();
  console.log('─'.repeat(72));
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
