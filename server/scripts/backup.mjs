// server/scripts/backup.mjs — 数据库 + 附件「安全备份」（P0-5，2026-09-23 支书裁定「一周内上服务器」）
// ════════════════════════════════════════════════════════════════
// 为什么不能只 `copy data.db`：
//   · 库是 **WAL 模式**（`server/db.js`：`db.pragma('journal_mode = WAL')`）⇒ 最近的写入可能还在
//     `data.db-wal` 里没并回主库；**只拷 data.db 会丢最近写入**（甚至得到一个半旧快照）。
//   · 附件物理文件在 `server/uploads/`（或 env `UPLOAD_DIR`），**与库分属两处**——
//     库里只有元数据（`attachments` 表），只备库等于「附件全丢」。
// 本脚本的做法：
//   · 数据库用 **SQLite 在线备份 API**（better-sqlite3 `db.backup()`，等价 `.backup`）——
//     由 SQLite 自己保证「含 WAL 内容的一致性快照」，**不需要停服**；
//   · 附件目录整目录复制到备份目录下的 `uploads/`；
//   · 备份完**当场校验**（对副本做 `PRAGMA integrity_check` + 数一下 users 行数），并打印可读结果。
// 用法（在 server/ 目录下）：
//   node scripts/backup.mjs                        # 用 DB_PATH / UPLOAD_DIR 缺省值
//   node scripts/backup.mjs --out D:\bak\20260923  # 指定备份目录
//   node scripts/backup.mjs --db D:\x\data.db --uploads D:\x\uploads --out D:\bak
// 退出码：0 = 备份成功（含「附件目录为空已跳过」）；1 = 失败（信息可读，不静默）。
// 恢复步骤见 server/README.md「备份与恢复」一节（停服 → 替换 → 启动）。
// ════════════════════════════════════════════════════════════════
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SERVER_DIR = path.resolve(__dirname, '..');

/** 极简参数解析（--k v / --k=v；未知参数直接报错，防「以为改了参数其实没改」） */
function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) throw new Error(`未知参数：${a}（可用：--db --uploads --out --no-uploads）`);
    const key = a.slice(2);
    if (key === 'no-uploads') { out.noUploads = true; continue; }
    const val = argv[i + 1];
    if (val === undefined || val.startsWith('--')) throw new Error(`参数 --${key} 缺值`);
    out[key] = val;
    i++;
  }
  return out;
}

function sizeText(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

/** 递归统计目录下文件数与总字节（目录不存在 ⇒ {files:0,bytes:0,exists:false}） */
function dirStats(dir) {
  if (!fs.existsSync(dir)) return { files: 0, bytes: 0, exists: false };
  let files = 0, bytes = 0;
  const walk = (d) => {
    for (const name of fs.readdirSync(d)) {
      const full = path.join(d, name);
      const st = fs.statSync(full);
      if (st.isDirectory()) walk(full);
      else { files++; bytes += st.size; }
    }
  };
  walk(dir);
  return { files, bytes, exists: true };
}

const stamp = () => new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').slice(0, 19);

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const dbPath = path.resolve(args.db || process.env.DB_PATH || path.join(SERVER_DIR, 'data.db'));
  const uploadsDir = args.noUploads ? null
    : path.resolve(args.uploads || process.env.UPLOAD_DIR || path.join(SERVER_DIR, 'uploads'));
  const outDir = path.resolve(args.out || path.join(SERVER_DIR, 'backups', stamp()));

  console.log('[backup] 数据库：', dbPath);
  if (!fs.existsSync(dbPath)) {
    console.error(`[backup] ✖ 数据库文件不存在：${dbPath}\n        请用 --db <路径> 指定，或先设 DB_PATH（与 server.js 同口径）。`);
    process.exit(1);
  }
  fs.mkdirSync(outDir, { recursive: true });

  let Database;
  try {
    ({ default: Database } = await import('better-sqlite3'));
  } catch (e) {
    console.error(`[backup] ✖ 未安装 better-sqlite3（请在 server/ 目录下先 npm install）：${e.message}`);
    process.exit(1);
  }

  // ① 库：SQLite 在线备份（含 WAL 内容的一致性快照；不需停服）
  const dbTarget = path.join(outDir, 'data.db');
  const db = new Database(dbPath);
  try {
    if (typeof db.backup === 'function') {
      await db.backup(dbTarget); // 等价 sqlite3 `.backup`（WAL 安全的正确手段）
    } else {
      // 兜底（极老版本）：VACUUM INTO 同样产出「vacuum 后的完整库」
      db.exec(`VACUUM INTO '${dbTarget.replace(/'/g, "''")}'`);
    }
  } finally {
    db.close();
  }

  // ② 备份当场自检：能打开 + integrity_check 通过 + users 行数（可读的「这份备份是什么」）
  const dbBytes = fs.statSync(dbTarget).size;
  let integrity = '未知', usersCount = '未知';
  try {
    const check = new Database(dbTarget, { readonly: true });
    try {
      integrity = check.pragma('integrity_check', { simple: true });
      usersCount = check.prepare('SELECT COUNT(*) AS c FROM users').get().c;
    } finally {
      check.close();
    }
  } catch (e) {
    console.error(`[backup] ✖ 备份副本无法打开/校验失败：${e.message}`);
    process.exit(1);
  }
  // 校验连接会在副本旁留下 -wal/-shm（副本是 WAL 模式的库）⇒ 清掉，让备份目录只有干净的单文件
  for (const suffix of ['-wal', '-shm']) {
    try { fs.rmSync(dbTarget + suffix, { force: true }); } catch (_) { /* 忽略 */ }
  }
  if (String(integrity).toLowerCase() !== 'ok') {
    console.error(`[backup] ✖ 备份副本完整性检查未通过（integrity_check = ${integrity}），请勿把它当作有效备份。`);
    process.exit(1);
  }

  // ③ 附件目录：整目录复制（不存在/为空 ⇒ 优雅跳过，不报错）
  const src = uploadsDir ? dirStats(uploadsDir) : { files: 0, bytes: 0, exists: false };
  let uploadsLine;
  if (!uploadsDir) {
    uploadsLine = '已按 --no-uploads 跳过';
  } else if (!src.exists) {
    uploadsLine = `跳过（目录不存在：${uploadsDir}）`;
  } else if (src.files === 0) {
    uploadsLine = `跳过（目录为空：${uploadsDir}）`;
  } else {
    fs.cpSync(uploadsDir, path.join(outDir, 'uploads'), { recursive: true });
    uploadsLine = `${src.files} 个文件 / ${sizeText(src.bytes)} → ${path.join(outDir, 'uploads')}`;
  }

  console.log('[backup] ✔ 备份完成');
  console.log(`[backup]   备份目录：${outDir}`);
  console.log(`[backup]   数据库  ：data.db（${sizeText(dbBytes)}）· integrity_check=${integrity} · users=${usersCount} 行`);
  console.log(`[backup]   附件     ：${uploadsLine}`);
  console.log('[backup]   恢复：停服 → 用备份的 data.db 覆盖库文件（并删除同目录 data.db-wal / data.db-shm）');
  console.log('[backup]         → 用备份的 uploads/ 覆盖附件目录 → 启动。详见 server/README.md「备份与恢复」。');
}

main().catch((e) => {
  console.error('[backup] ✖ 备份失败：', e && e.message ? e.message : e);
  process.exit(1);
});
