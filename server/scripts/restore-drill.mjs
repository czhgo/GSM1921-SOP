// server/scripts/restore-drill.mjs — 恢复演练（T4，2026-11-15）
// ════════════════════════════════════════════════════════════════
// 回答的问题：**「这份备份真能恢复出一个能启动、数据齐的库吗」**——不靠文件名猜，靠实跑。
//
// 顺序固定（任一步失败即退出码 1，并打印失败原因；不把失败记成成功）：
//   ① **生成备份**：调 `scripts/backup.mjs --out <临时目录>/backup`（SQLite 在线备份 API）。
//      备份源由 backup.mjs 现做，**不直接拷运行库文件**，运行库全程只读作备份源，服务不需停。
//   ② **恢复到临时目录**：把备份的 `data.db` 与 `uploads/` 复制到 `<临时目录>/restored/`。
//   ③ **只读校验**：`PRAGMA integrity_check` 必须为 `ok`；逐表行数与 `backup.json` 清单**逐项相等**；
//      附件文件数与清单相等。
//   ④ **真启动**：用恢复副本起 `listen(0)` 实例 → `GET /api/v1/health` 返回 `ok:true` → 关服。
//   ⑤ **启动后再校验**：重启后副本 `integrity_check` 仍为 `ok`（证明启动写入没有破坏库）。
//   ⑥ 输出结构化结果（JSON ＋ 可读行），**默认删除临时目录**（`--keep` 保留取证）。
//
// 用法（在 server/ 目录下）：
//   node scripts/restore-drill.mjs                        # 演练一次，临时目录自动清理
//   node scripts/restore-drill.mjs --keep                 # 保留临时目录（排障用）
//   node scripts/restore-drill.mjs --out D:\tmp\drill     # 指定演练工作目录
//   node scripts/restore-drill.mjs --db D:\x\data.db --uploads D:\x\uploads
// 退出码：0 = 五项全通过；1 = 任一步失败（原因见输出）。
// ════════════════════════════════════════════════════════════════
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SERVER_DIR = path.resolve(__dirname, '..');

const stamp = () => new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').slice(0, 19);
const sizeText = (bytes) => (bytes < 1024 ? `${bytes} B` : bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / 1024 / 1024).toFixed(2)} MB`);

function parseArgs(argv) {
  const out = { keep: false };
  const valued = new Set(['out', 'db', 'uploads']);
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg.startsWith('--')) throw new Error(`未知参数：${arg}（可用：--out --db --uploads --keep）`);
    const key = arg.slice(2);
    if (key === 'keep') { out.keep = true; continue; }
    if (!valued.has(key)) throw new Error(`未知参数：${arg}（可用：--out --db --uploads --keep）`);
    const value = argv[i + 1];
    if (value === undefined || value.startsWith('--')) throw new Error(`参数 --${key} 缺值`);
    out[key] = value;
    i++;
  }
  return out;
}

function countFiles(dir) {
  if (!fs.existsSync(dir)) return 0;
  let files = 0;
  const walk = (d) => {
    for (const name of fs.readdirSync(d)) {
      const full = path.join(d, name);
      if (fs.statSync(full).isDirectory()) walk(full);
      else files++;
    }
  };
  walk(dir);
  return files;
}

/** 只读检查：完整性 / schema 版本 / 逐表行数（口径与 backup.mjs 的清单一致：排除 sqlite_ 内部表） */
async function inspect(dbPath) {
  const { default: Database } = await import('better-sqlite3');
  const db = new Database(dbPath, { readonly: true });
  try {
    const integrity = db.pragma('integrity_check', { simple: true });
    const userVersion = Number(db.pragma('user_version', { simple: true }));
    const tables = {};
    for (const row of db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all()) {
      tables[row.name] = db.prepare(`SELECT COUNT(*) c FROM ${row.name}`).get().c;
    }
    return { integrity, userVersion, tables, tableCount: Object.keys(tables).length };
  } finally {
    db.close();
  }
}

function diffTables(expected, actual) {
  const diffs = [];
  for (const [name, rows] of Object.entries(expected)) {
    if (!(name in actual)) diffs.push(`缺表 ${name}（清单 ${rows} 行）`);
    else if (actual[name] !== rows) diffs.push(`${name} 行数不符：清单 ${rows} / 恢复副本 ${actual[name]}`);
  }
  for (const name of Object.keys(actual)) {
    if (!(name in expected)) diffs.push(`多出表 ${name}（${actual[name]} 行，清单里没有）`);
  }
  return diffs;
}

async function main() {
  let args;
  try { args = parseArgs(process.argv.slice(2)); } catch (e) {
    console.error(`[drill] ✖ ${e.message}`);
    process.exit(1);
  }

  const workRoot = args.out ? path.resolve(args.out) : path.join(SERVER_DIR, '.tmp-restore-drill');
  const workDir = path.join(workRoot, stamp());
  const backupDir = path.join(workDir, 'backup');
  const restoreDir = path.join(workDir, 'restored');
  const backupDb = path.join(backupDir, 'data.db');
  const restoredDb = path.join(restoreDir, 'data.db');

  const result = {
    ok: false,
    startedAt: new Date().toISOString(),
    workDir,
    backupDir,
    restoreDir,
    steps: [],
    readings: {},
  };
  let failure = null;

  try {
    fs.mkdirSync(workDir, { recursive: true });
    result.steps.push({ name: '准备演练目录', ok: true, detail: workDir });

    // ① 在线备份（运行库只读作备份源；不直接拷库文件）
    const backupArgs = [path.join(__dirname, 'backup.mjs'), '--out', backupDir];
    if (args.db) backupArgs.push('--db', path.resolve(args.db));
    if (args.uploads) backupArgs.push('--uploads', path.resolve(args.uploads));
    console.log(`[drill] ① 生成备份：node ${backupArgs.slice(1).map((a) => (a.includes(' ') ? `"${a}"` : a)).join(' ')}`);
    const run = spawnSync(process.execPath, backupArgs, { cwd: SERVER_DIR, stdio: 'inherit' });
    if (run.error) throw new Error(`备份子进程无法启动：${run.error.message}`);
    if (run.status !== 0) throw new Error(`备份失败（backup.mjs 退出码 ${run.status}），演练中止`);
    result.steps.push({ name: '生成备份', ok: true, detail: backupDir });

    // 备份清单：恢复核对以 backup.json 为准，不靠文件名猜内容
    const manifestPath = path.join(backupDir, 'backup.json');
    if (!fs.existsSync(backupDb)) throw new Error(`备份目录缺 data.db：${backupDb}`);
    if (!fs.existsSync(manifestPath)) throw new Error(`备份目录缺 backup.json（无法逐表核对）：${manifestPath}`);
    let manifest;
    try { manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')); } catch (e) {
      throw new Error(`backup.json 无法解析：${e.message}`);
    }
    if (!manifest.tables || typeof manifest.tables !== 'object') throw new Error('backup.json 缺 tables 清单');
    result.readings.backup = {
      dir: backupDir,
      dbBytes: fs.statSync(backupDb).size,
      sha256: manifest.sha256 || null,
      tableCount: Object.keys(manifest.tables).length,
      tables: manifest.tables,
      uploadsFiles: manifest.uploads ? manifest.uploads.files : 0,
    };

    // ② 恢复到临时目录（备份的 data.db + uploads/）
    fs.mkdirSync(restoreDir, { recursive: true });
    fs.copyFileSync(backupDb, restoredDb);
    for (const suffix of ['-wal', '-shm']) fs.rmSync(restoredDb + suffix, { force: true });
    const backupUploads = path.join(backupDir, 'uploads');
    const uploadsCopied = fs.existsSync(backupUploads);
    if (uploadsCopied) fs.cpSync(backupUploads, path.join(restoreDir, 'uploads'), { recursive: true });
    const restoredUploadsFiles = uploadsCopied ? countFiles(path.join(restoreDir, 'uploads')) : 0;
    if (manifest.uploads && manifest.uploads.files !== restoredUploadsFiles) {
      throw new Error(`附件文件数不符：清单 ${manifest.uploads.files} / 恢复副本 ${restoredUploadsFiles}`);
    }
    result.steps.push({ name: '恢复到临时目录', ok: true, detail: `${restoredDb} + uploads/ ${restoredUploadsFiles} 个文件` });

    // ③ 只读校验：integrity + 逐表行数
    const before = await inspect(restoredDb);
    result.readings.restored = { integrityBeforeBoot: before.integrity, schemaVersion: before.userVersion, tableCount: before.tableCount, tables: before.tables, uploadsFiles: restoredUploadsFiles };
    if (String(before.integrity).toLowerCase() !== 'ok') {
      throw new Error(`恢复副本 integrity_check = ${before.integrity}（应为 ok）`);
    }
    const diffs = diffTables(manifest.tables, before.tables);
    if (diffs.length) throw new Error(`恢复副本与备份清单行数不一致：${diffs.join('；')}`);
    result.steps.push({ name: '只读校验（integrity ＋ 逐表行数）', ok: true, detail: `${before.tableCount} 张表 / integrity=ok` });

    // ④ 真启动：用恢复副本起 listen(0) 实例，只探浅检查
    const { createApp } = await import('../app.js');
    const app = createApp({ dbPath: restoredDb });
    const server = await new Promise((resolve, reject) => {
      const s = app.listen(0, '127.0.0.1', () => resolve(s));
      s.once('error', reject);
    });
    const port = server.address().port;
    let health = null;
    try {
      const res = await fetch(`http://127.0.0.1:${port}/api/v1/health`, { signal: AbortSignal.timeout(5000) });
      health = await res.json().catch(() => null);
    } finally {
      await new Promise((resolve) => server.close(resolve));
      try { app.locals.db.close(); } catch (_) { /* 已关 */ }
    }
    if (!health || health.ok !== true) throw new Error(`恢复副本启动后 GET /api/v1/health 未返回 ok:true（实测 ${JSON.stringify(health)}）`);
    result.readings.boot = { port, health };
    result.steps.push({ name: '恢复副本启动（listen 0）', ok: true, detail: `端口 ${port} · /api/v1/health ok:true` });

    // ⑤ 启动后再校验：启动写入不得破坏库
    const after = await inspect(restoredDb);
    if (String(after.integrity).toLowerCase() !== 'ok') {
      throw new Error(`启动后 integrity_check = ${after.integrity}（应为 ok）`);
    }
    result.readings.restored.integrityAfterBoot = after.integrity;
    result.steps.push({ name: '启动后完整性复检', ok: true, detail: `integrity=${after.integrity} · ${after.tableCount} 张表` });

    result.ok = true;
  } catch (e) {
    failure = e;
    result.error = e && e.message ? e.message : String(e);
    result.steps.push({ name: '失败', ok: false, detail: result.error });
  } finally {
    result.finishedAt = new Date().toISOString();
    if (!args.keep) {
      try {
        fs.rmSync(workDir, { recursive: true, force: true });
        try { if (fs.existsSync(workRoot) && fs.readdirSync(workRoot).length === 0) fs.rmdirSync(workRoot); } catch (_) { /* 非空 / 无权，忽略 */ }
      } catch (e) {
        console.error(`[drill] ⚠ 临时目录清理失败（不影响结论）：${e.message}`);
      }
    }
  }

  // 结构化结果：后半段供机器读，前半段供人读
  if (result.ok) {
    const r = result.readings;
    console.log('[drill] ✔ 恢复演练通过');
    console.log(`[drill]   备份目录：${r.backup.dir}（data.db ${sizeText(r.backup.dbBytes)}）`);
    console.log(`[drill]   integrity_check：${r.restored.integrityBeforeBoot}（启动前） / ${r.restored.integrityAfterBoot}（启动后）`);
    console.log(`[drill]   表数量：${r.backup.tableCount} · 关键表：users=${r.restored.tables.users} · branches=${r.restored.tables.branches ?? '—'} · 附件 ${r.restored.uploadsFiles} 个`);
    console.log(`[drill]   启动实例：端口 ${r.boot.port} · health=${JSON.stringify(r.boot.health)}`);
    console.log(`[drill]   临时目录：${args.keep ? workDir : '已删除'}`);
  } else {
    console.error(`[drill] ✖ 恢复演练失败：${result.error}`);
  }
  console.log(`[drill] 结果 JSON：${JSON.stringify(result)}`);
  process.exit(result.ok ? 0 : 1);
}

main().catch((e) => {
  console.error('[drill] ✖ 演练异常：', e && e.message ? e.message : e);
  process.exit(1);
});
