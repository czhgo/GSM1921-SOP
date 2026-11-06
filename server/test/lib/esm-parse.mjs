// role: [工程师]+[AI]
// esm-parse.mjs — 「真正的 ESM 解析」共享能力（2026-10-29）
//
// 为什么不用 `node --check`：
//   `node --check docs/src/xxx.js` 退出码 0 —— 它按 **CommonJS** 解析，函数体里的
//   `import { x } from '...'` 会被当成合法语法放过。浏览器是 ESM 解析器，同一份文件会抛
//   `SyntaxError: Unexpected token '{'`，整模块不执行（页签恒显错误卡）。
//
// 为什么要 spawn：
//   `vm.SourceTextModule` 需要 `--experimental-vm-modules`，而 `node --test` 默认不带该开关。
//   逐个文件起进程太慢（300+ 文件）⇒ 这里只起 **一个** 子进程，一次性遍历全部文件，
//   把结果以 JSON 打回 stdout，调用方只解析 JSON。
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const WORKER = fileURLToPath(new URL('./esm-parse-worker.mjs', import.meta.url));

/**
 * 用真正的 ESM 解析器检查一批文件。
 * @param {string[]} files 绝对路径列表
 * @returns {{ total: number, failures: Array<{ file: string, name: string, message: string }> }}
 */
export function parseFiles(files) {
  const dir = mkdtempSync(join(tmpdir(), 'esm-parse-'));
  const payload = join(dir, 'files.json');
  try {
    writeFileSync(payload, JSON.stringify({ files }), 'utf8');
    const out = execFileSync(process.execPath, ['--experimental-vm-modules', WORKER, payload], {
      encoding: 'utf8',
      maxBuffer: 32 * 1024 * 1024,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return JSON.parse(out);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
