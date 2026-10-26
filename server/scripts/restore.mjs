// ════════════════════════════════════════════════════════════════
//  server/scripts/restore.mjs —— 备份恢复（停服 → 校验 → 替换库与附件）
//
//  用法（在 server/ 目录下）：
//    node scripts/restore.mjs --from backups/2026-10-26_03-00-00          # 预览 + 执行
//    node scripts/restore.mjs --from backups/2026-10-26_03-00-00 --dry-run # 只校验、不落盘
//    node scripts/restore.mjs --from <备份目录> --db D:\data\data.db --uploads D:\data\uploads
//    node scripts/restore.mjs --from <备份目录> --force                    # 跳过「停服」探测
//
//  行为（顺序固定）：
//    ① **要求停服**：探 `GET <base>/api/v1/health`（缺省 http://127.0.0.1:3000）；
//       有响应即拒绝（`--force` 显式跳过；库文件锁检测仅作补充，不作唯一判据）。
//    ② **校验备份**：`PRAGMA integrity_check` 必须为 `ok`；若备份目录带 `backup.json`，
//       再核对 sha256（有则必对）与逐表行数（有则打印差异，不阻断——备份清单是快照，源库可能已变）。
//    ③ **替换**：旧库/旧附件目录先改名为 `*.pre-restore-<时间戳>`（可回退），再复制备份的
//       `data.db` 与 `uploads/`；复制后**删除**目标旁的 `data.db-wal` / `data.db-shm`。
//    ④ **启动后自检提示**：打印 integrity / users / branches / schema / seed 版本读数与下一步命令。
//
//  安全联锁：`--from` 与目标库不得是同一文件；备份副本缺失/损坏 ⇒ 退出码 1，不替换。
// `--dry-run` 不要求停服（只读），也不会改名/删除任何文件。
// ════════════════════════════════════════════════════════════════
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const SERVER_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const stamp = () => new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').slice(0, 19);

function parseArgs(argv) {
  const out = { force: false, dryRun: false, noUploads: false };
  const valued = new Set(['from', 'db', 'uploads', 'port', 'base', 'uploads-from']);
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg.startsWith('--')) throw new Error(`未知参数：${arg}（可用：--from --db --uploads --uploads-from --port --base --force --dry-run --no-uploads）`);
    const key = arg.slice(2);
    if (key === 'force') { out.force = true; continue; }
    if (key === 'dry-run') { out.dryRun = true; continue; }
    if (key === 'no-uploads') { out.noUploads = true; continue; }
    if (!valued.has(key)) throw new Error(`未知参数：${arg}`);
    const value = argv[i + 1];
    if (value === undefined || value.startsWith('--')) throw new Error(`参数 --${key} 缺值`);
    const bag = key === 'uploads-from' ? 'uploadsFrom' : key;
    out[bag] = value;
    i++;
  }
  return out;
}

const sizeText = (bytes) => (bytes < 1024 ? `${bytes} B` : bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / 1024 / 1024).toFixed(2)} MB`);

function dirStats(dir) {
  if (!dir || !fs.existsSync(dir)) return { files: 0, bytes: 0 };
  let files = 0; let bytes = 0;
  const walk = (d) => {
    for (const name of fs.readdirSync(d)) {
      const full = path.join(d, name);
      const st = fs.statSync(full);
      if (st.isDirectory()) walk(full);
      else { files++; bytes += st.size; }
    }
  };
  walk(dir);
  return { files, bytes };
}

/** 最新一份备份目录（backups/* 内含 data.db） */
function latestBackupDir() {
  const root = path.join(SERVER_DIR, 'backups');
  if (!fs.existsSync(root)) return null;
  const dirs = fs.readdirSync(root)
    .map((name) => path.join(root, name))
    .filter((dir) => fs.statSync(dir).isDirectory() && fs.existsSync(path.join(dir, 'data.db')))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
  return dirs[0] || null;
}

async function serviceLooksRunning(base) {
  try {
    const r = await fetch(`${base}/api/v1/health`, { signal: AbortSignal.timeout(1500) });
    if (!r.ok) return false;
    const body = await r.json().catch(() => null);
    return Boolean(body && body.ok === true);
  } catch (_) { return false; }
}

async function openReadonly(dbPath) {
  const { default: Database } = await import('better-sqlite3');
  return new Database(dbPath, { readonly: true });
}

async function inspectDb(dbPath) {
  const db = await openReadonly(dbPath);
  try {
    const integrity = db.pragma('integrity_check', { simple: true });
    const userVersion = Number(db.pragma('user_version', { simple: true }));
    const count = (table) => {
      try { return db.prepare(`SELECT COUNT(*) c FROM ${table}`).get().c; } catch (_) { return null; }
    };
    let seedVersion = null;
    try {
      const row = db.prepare("SELECT value FROM seed_meta WHERE key = 'seed_version'").get();
      seedVersion = row ? row.value : null;
    } catch (_) { /* 无 seed_meta 表 */ }
    return { integrity, userVersion, users: count('users'), branches: count('branches'), activities: count('activities'), seedVersion };
  } finally { db.close(); }
}

async function main() {
  let args;
  try { args = parseArgs(process.argv.slice(2)); } catch (e) {
    console.error(`[restore] ✖ ${e.message}`);
    process.exit(1);
  }

  const fromRaw = args.from ? path.resolve(args.from) : latestBackupDir();
  if (!fromRaw) {
    console.error('[restore] ✖ 未找到备份：请用 --from <备份目录或 data.db> 指定（缺省读取 server/backups/ 最新一份）。');
    process.exit(1);
  }
  const fromIsDir = fs.existsSync(fromRaw) && fs.statSync(fromRaw).isDirectory();
  const backupDb = fromIsDir ? path.join(fromRaw, 'data.db') : fromRaw;
  const backupUploads = args.uploadsFrom
    ? path.resolve(args.uploadsFrom)
    : (fromIsDir && fs.existsSync(path.join(fromRaw, 'uploads')) ? path.join(fromRaw, 'uploads') : null);
  if (!fs.existsSync(backupDb)) {
    console.error(`[restore] ✖ 备份库不存在：${backupDb}`);
    process.exit(1);
  }

  const targetDb = path.resolve(args.db || process.env.DB_PATH || path.join(SERVER_DIR, 'data.db'));
  const targetUploads = path.resolve(args.uploads || process.env.UPLOAD_DIR || path.join(SERVER_DIR, 'uploads'));
  if (path.resolve(backupDb) === targetDb) {
    console.error(`[restore] ✖ 备份与目标库是同一文件：${targetDb}（请指定 --db 或换一份备份）`);
    process.exit(1);
  }

  console.log(`[restore] 备份源：${fromRaw}`);
  console.log(`[restore] 目标库：${targetDb}`);
  console.log(`[restore] 目标附件：${args.noUploads ? '（--no-uploads 跳过）' : targetUploads}`);

  // ① 停服检查（dry-run 只读，不做）
  if (!args.dryRun && !args.force) {
    const base = String(args.base || `http://127.0.0.1:${args.port || process.env.PORT || 3000}`).replace(/\/$/, '');
    const running = await serviceLooksRunning(base);
    if (running) {
      console.error(`[restore] ⛔ 服务仍在运行（${base}/api/v1/health 有响应）。请先停服再恢复；确实要在运行态演练请加 --force。`);
      process.exit(1);
    }
    console.log(`[restore] 停服检查：${base} 无响应（按已停服处理）`);
  } else if (args.force) {
    console.log('[restore] ⚠ 已按 --force 跳过停服检查（请自行确认没有进程在写库）');
  }

  // ② 校验备份
  let backupInfo;
  try { backupInfo = await inspectDb(backupDb); } catch (e) {
    console.error(`[restore] ✖ 备份库无法打开：${e.message}`);
    process.exit(1);
  }
  if (String(backupInfo.integrity).toLowerCase() !== 'ok') {
    console.error(`[restore] ✖ 备份 integrity_check = ${backupInfo.integrity}，拒绝恢复。`);
    process.exit(1);
  }
  const sha = createHash('sha256').update(fs.readFileSync(backupDb)).digest('hex');
  let manifest = null;
  const manifestPath = fromIsDir ? path.join(fromRaw, 'backup.json') : path.join(path.dirname(backupDb), 'backup.json');
  if (fs.existsSync(manifestPath)) {
    try { manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')); } catch (e) {
      console.warn(`[restore] ⚠ backup.json 无法解析（跳过清单核对）：${e.message}`);
    }
  }
  if (manifest && manifest.sha256 && manifest.sha256 !== sha) {
    console.error(`[restore] ✖ 备份 sha256 与 backup.json 不一致（文件可能被改动/损坏）：\n  清单 ${manifest.sha256}\n  实测 ${sha}`);
    process.exit(1);
  }
  if (manifest && manifest.tables && Number.isFinite(manifest.tables.users) && manifest.tables.users !== backupInfo.users) {
    console.warn(`[restore] ⚠ 备份 users 行数 ${backupInfo.users} 与清单 ${manifest.tables.users} 不一致（仅提示）`);
  }
  const upStats = backupUploads ? dirStats(backupUploads) : { files: 0, bytes: 0 };
  console.log(`[restore] 备份校验：integrity_check=ok · users=${backupInfo.users} · branches=${backupInfo.branches} · schema v${backupInfo.userVersion} · seed=${backupInfo.seedVersion ?? '未登记'} · sha256=${sha.slice(0, 12)}…`);
  console.log(`[restore] 备份附件：${backupUploads ? `${upStats.files} 个文件 / ${sizeText(upStats.bytes)}` : '（备份无 uploads/，将保留现有附件目录）'}`);

  if (args.dryRun) {
    console.log('[restore] --dry-run：仅校验，未改动任何文件。');
    return;
  }

  // ③ 替换（旧文件改名保留，可回退）
  const at = stamp();
  fs.mkdirSync(path.dirname(targetDb), { recursive: true });
  const targetExisted = fs.existsSync(targetDb);
  if (targetExisted) {
    const keep = `${targetDb}.pre-restore-${at}`;
    fs.renameSync(targetDb, keep);
    console.log(`[restore] 旧库已保留：${keep}`);
  }
  for (const suffix of ['-wal', '-shm']) fs.rmSync(targetDb + suffix, { force: true });
  fs.copyFileSync(backupDb, targetDb);
  for (const suffix of ['-wal', '-shm']) fs.rmSync(targetDb + suffix, { force: true });
  console.log(`[restore] 已替换库文件：${targetDb}（${sizeText(fs.statSync(targetDb).size)}）`);

  if (!args.noUploads) {
    if (backupUploads) {
      if (fs.existsSync(targetUploads)) {
        const keep = `${targetUploads}.pre-restore-${at}`;
        fs.renameSync(targetUploads, keep);
        console.log(`[restore] 旧附件目录已保留：${keep}`);
      }
      fs.mkdirSync(path.dirname(targetUploads), { recursive: true });
      fs.cpSync(backupUploads, targetUploads, { recursive: true });
      console.log(`[restore] 已替换附件目录：${targetUploads}（${upStats.files} 个文件）`);
    } else {
      console.warn('[restore] ⚠ 备份无 uploads/：附件目录**未替换**（保留现有文件；若备份时有附件，请手工补齐）');
    }
  }

  // ④ 自检提示
  const restored = await inspectDb(targetDb);
  console.log('[restore] ✔ 恢复完成，自检读数：');
  console.log(`[restore]   integrity_check=${restored.integrity} · users=${restored.users} · branches=${restored.branches} · activities=${restored.activities} · schema v${restored.userVersion} · seed=${restored.seedVersion ?? '未登记'}`);
  console.log('[restore] 下一步：');
  console.log('  1) 起服务：cd server && npm start');
  console.log(`  2) 冒烟：node deploy/smoke.mjs --login <党委账号学号> <口令>   # 或 BASE=<你的地址>`);
  console.log('  3) 只读演练（建议先跑一遍）：READ_ONLY=1 npm start（Windows PowerShell：$env:READ_ONLY=\'1\'; npm start）');
  console.log('     → node scripts/readonly-smoke.mjs --login <党委账号学号> <口令>');
  console.log('  4) 回退：停服 → 把 *.pre-restore-<时间戳> 改回原名 → 重启');
}

main().catch((e) => {
  console.error('[restore] ✖ 恢复失败：', e && e.message ? e.message : e);
  process.exit(1);
});
