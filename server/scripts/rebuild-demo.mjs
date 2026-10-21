// server/scripts/rebuild-demo.mjs — 重建演示库 / 组织基线库（B-499-8 Task 4）
// ════════════════════════════════════════════════════════════════
// 用途：在**指定输出路径**生成一个新的 SQLite 库，不触碰生产库与附件。
//   node scripts/rebuild-demo.mjs --mode demo --out <path> [--force]
//   node scripts/rebuild-demo.mjs --mode baseline --out <path> [--force]
//
// 安全联锁（任一不满足即退出，非零）：
//   · 生产形态（APP_ENV/NODE_ENV=production）拒绝 `--mode demo`；
//   · `--out` 不得等于 `server/data.db`，也不得落在 `server/uploads` / `server/backups` 内；
//   · 目标已存在默认拒绝，必须显式 `--force` 才覆盖（只覆盖该库文件及其 -wal/-shm）。
// 产物：
//   · demo     = `seedDatabase()`（演示种子全量）；
//   · baseline = `seedBaseline()`（最小组织基线：1 个支部 + 1 名党委，零名单）；
//   · 两者都写 `seed_meta(mode, seed_version, updated_at)`。
// ════════════════════════════════════════════════════════════════
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { initDb } from '../db.js';
import { seedDatabase } from '../seed.js';
import { seedBaseline } from '../seed-baseline.js';
import { isProductionEnv } from '../env.js';
import { SEED_DATA_VERSION } from '../../docs/src/core/domain/domain.js';
import { writeSeedMeta } from '../seed-repair.js';

const SERVER_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function parseArgs(argv) {
  const out = { mode: 'baseline', force: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--force') { out.force = true; continue; }
    if (!arg.startsWith('--')) throw new Error(`未知参数：${arg}`);
    const key = arg.slice(2);
    if (!['mode', 'out'].includes(key)) throw new Error(`未知参数：${arg}（可用：--mode --out --force）`);
    const value = argv[i + 1];
    if (value === undefined || value.startsWith('--')) throw new Error(`参数 --${key} 缺值`);
    out[key] = value;
    i++;
  }
  if (!['demo', 'baseline'].includes(out.mode)) throw new Error('--mode 只接受 demo | baseline');
  if (!out.out) throw new Error('必须指定 --out <path>');
  return out;
}

function isInside(child, parent) {
  const rel = path.relative(parent, child);
  return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel));
}

async function main() {
  let args;
  try { args = parseArgs(process.argv.slice(2)); } catch (e) {
    console.error(`[rebuild] ✖ ${e.message}`);
    process.exit(1);
  }
  if (args.mode === 'demo' && isProductionEnv()) {
    console.error('[rebuild] ⛔ 生产形态拒绝 --mode demo（演示名单不得进入生产环境）。');
    process.exit(1);
  }

  const outPath = path.resolve(args.out);
  const protectedDb = path.join(SERVER_DIR, 'data.db');
  if (path.resolve(outPath) === protectedDb) {
    console.error(`[rebuild] ⛔ 拒绝写入生产库路径：${protectedDb}`);
    process.exit(1);
  }
  for (const dir of ['uploads', 'backups'].map((name) => path.join(SERVER_DIR, name))) {
    if (isInside(outPath, dir)) {
      console.error(`[rebuild] ⛔ 输出路径不得位于 ${dir} 内：${outPath}`);
      process.exit(1);
    }
  }
  if (fs.existsSync(outPath) && !args.force) {
    console.error(`[rebuild] ⛔ 目标已存在：${outPath}（确认覆盖请加 --force）`);
    process.exit(1);
  }
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  if (fs.existsSync(outPath)) {
    for (const suffix of ['', '-wal', '-shm']) fs.rmSync(outPath + suffix, { force: true });
  }

  const db = initDb(outPath);
  try {
    if (args.mode === 'demo') {
      await seedDatabase(db);
    } else {
      seedBaseline(db);
    }
    writeSeedMeta(db, 'mode', args.mode);
    writeSeedMeta(db, 'seed_version', SEED_DATA_VERSION);
    writeSeedMeta(db, 'updated_at', new Date().toISOString());
    const count = (table) => db.prepare(`SELECT COUNT(*) c FROM ${table}`).get().c;
    console.log(`[rebuild] ✔ 已生成 ${args.mode} 库：${outPath}`);
    console.log(`[rebuild]   users=${count('users')} · branches=${count('branches')} · activities=${count('activities')} · seed_version=${SEED_DATA_VERSION}`);
  } finally {
    db.close();
  }
}

main().catch((e) => {
  console.error('[rebuild] ✖ 失败：', e && e.message ? e.message : e);
  process.exit(1);
});
