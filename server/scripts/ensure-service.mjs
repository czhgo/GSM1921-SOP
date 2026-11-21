// role: [工程师]+[AI]
// server/scripts/ensure-service.mjs — review 服务守护（2026-11-21 批次 591 · CLAUDE H20.1 第 0 步）
//
// 判据：需要真机的步骤开始前，`http://127.0.0.1:3000/login.html` 必须是 200。
//   不在线时以 detached 方式拉起 `node scripts/start-review.mjs`，最多等 30s；
//   仍不在线 ⇒ 输出诊断命令与退出码 1，不静默重试、不假绿。
// 边界：只探测与拉起，不写库、不改数据形态；端口被别的进程占用时如实报告。
// 实现注：不用 `AbortSignal.timeout`（Windows 上进程退出时曾触发 libuv async 断言），
//   改用 AbortController ＋ clearTimeout，并以 `process.exitCode` 自然退出。
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const BASE = process.env.REVIEW_BASE_URL || 'http://127.0.0.1:3000';
const PROBE = `${BASE}/login.html`;
const WAIT_MS = 30_000;
const STEP_MS = 2_000;
const SERVER_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function probe() {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 5_000);
  try {
    const r = await fetch(PROBE, { signal: ctrl.signal });
    return r.status;
  } catch {
    return 0;
  } finally {
    clearTimeout(timer);
  }
}

async function waitOnline(deadline) {
  while (Date.now() < deadline) {
    const status = await probe();
    if (status === 200) return true;
    await sleep(STEP_MS);
  }
  return false;
}

const first = await probe();
if (first === 200) {
  console.log(`[service:ensure] 在线 · ${PROBE} → 200`);
} else {
  console.log(`[service:ensure] 未在线（探测 ${first || '连接失败'}）· 拉起 start:review …`);
  const child = spawn(process.execPath, ['scripts/start-review.mjs'], {
    cwd: SERVER_DIR,
    detached: true,
    windowsHide: true,
    stdio: 'ignore',
    env: process.env,
  });
  child.unref();

  if (await waitOnline(Date.now() + WAIT_MS)) {
    console.log(`[service:ensure] 已恢复 · ${PROBE} → 200（新进程 pid ${child.pid}）`);
  } else {
    console.error(`[service:ensure] ${WAIT_MS / 1000}s 内未恢复 200。诊断：`);
    console.error('  1. 手动起服务：cd server; npm run start:review');
    console.error('  2. 查端口占用：netstat -ano | findstr :3000');
    console.error('  3. 前台看日志：cd server; node scripts/start-review.mjs');
    process.exitCode = 1;
  }
}
