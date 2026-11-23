// role: [工程师]+[AI]
// scripts/with-env.mjs — 跨平台环境变量包装（2026-11-20 批次 580）
// 用法：node scripts/with-env.mjs KEY=VAL [KEY=VAL ...] <command> [...args]
// 之前 package.json 用 `set X=1&& ...`，只能在 cmd 下跑；本脚本替换为 node 实现，Windows / Linux 同一条命令。
import { spawn } from 'node:child_process';

const argv = process.argv.slice(2);
const env = { ...process.env };
let i = 0;
while (i < argv.length && /^[A-Za-z_][A-Za-z0-9_]*=/.test(argv[i])) {
  const eq = argv[i].indexOf('=');
  env[argv[i].slice(0, eq)] = argv[i].slice(eq + 1);
  i += 1;
}
if (i >= argv.length) {
  console.error('[with-env] 用法：node scripts/with-env.mjs KEY=VAL ... <command> [...args]');
  process.exit(2);
}
const [cmd, ...args] = argv.slice(i);
const child = spawn(cmd, args, { stdio: 'inherit', env, shell: false });
child.on('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  else process.exit(code === null ? 1 : code);
});
child.on('error', (err) => {
  console.error('[with-env] 启动失败：', err.message);
  process.exit(1);
});
