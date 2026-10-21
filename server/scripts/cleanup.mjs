// server/scripts/cleanup.mjs — 数据生命周期清理（B-499-8 Task 4）
// ════════════════════════════════════════════════════════════════
// 默认 **dry-run**（只报告、不删）；`--apply` 才执行下面三类**确认项**：
//   ① 孤儿附件：uploads/ 中存在、但没有任何 filePath / attachments.path 引用；
//   ② 悬空附件行：attachments 表中的 path 对应的物理文件已不存在；
//   ③ 旧备份：backups/ 下保留最近 N 份（`--keep`，默认 14），其余列为可删。
// ⚠ 绝不删除任何业务记录（activities / users / archive_records 等一律不动）。
// 用法：
//   node scripts/cleanup.mjs [--db <data.db>] [--uploads <dir>] [--backups <dir>] [--keep 14] [--apply]
// 退出码：0 成功（含无事可做）；1 参数/环境错误。
// ════════════════════════════════════════════════════════════════
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SERVER_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function parseArgs(argv) {
  const out = { apply: false, keep: 14 };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--apply') { out.apply = true; continue; }
    if (!arg.startsWith('--')) throw new Error(`未知参数：${arg}`);
    const key = arg.slice(2);
    if (!['db', 'uploads', 'backups', 'keep'].includes(key)) {
      throw new Error(`未知参数：${arg}（可用：--db --uploads --backups --keep --apply）`);
    }
    const value = argv[i + 1];
    if (value === undefined || value.startsWith('--')) throw new Error(`参数 --${key} 缺值`);
    out[key] = key === 'keep' ? Number(value) : value;
    i++;
  }
  if (!Number.isInteger(out.keep) || out.keep < 0) throw new Error('--keep 必须是非负整数');
  return out;
}

function listFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  const walk = (current) => {
    for (const name of fs.readdirSync(current)) {
      const full = path.join(current, name);
      const stat = fs.statSync(full);
      if (stat.isDirectory()) walk(full);
      else out.push(full);
    }
  };
  walk(dir);
  return out;
}

/** 递归收集对象里所有 filePath / attachments[].path 值 */
function collectFileReferences(value, out) {
  if (!value || typeof value !== 'object') return;
  if (Array.isArray(value)) {
    for (const item of value) collectFileReferences(item, out);
    return;
  }
  for (const [key, item] of Object.entries(value)) {
    if (key === 'filePath' && typeof item === 'string' && item) out.add(item);
    else if (key === 'attachments' && Array.isArray(item)) {
      for (const attachment of item) {
        if (attachment && typeof attachment.path === 'string') out.add(attachment.path);
      }
    } else collectFileReferences(item, out);
  }
}

const basenameOf = (value) => path.basename(String(value).split('?')[0].split('#')[0]);

export function planCleanup({ db, uploadsDir, backupsDir, keep = 14 }) {
  const fileRefs = new Set();
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'").all()
    .map((row) => row.name)
    .filter((name) => !['attachments', 'sessions', 'collection_versions', 'seed_meta'].includes(name));
  for (const table of tables) {
    for (const row of db.prepare(`SELECT data FROM ${table}`).all()) {
      try { collectFileReferences(JSON.parse(row.data), fileRefs); } catch { /* 非 JSON 行跳过 */ }
    }
  }

  const attachmentRows = db.prepare('SELECT id, path FROM attachments').all();
  const attachmentRefs = new Set(attachmentRows.map((row) => row.path).filter(Boolean));
  for (const ref of attachmentRefs) fileRefs.add(ref);
  const referencedNames = new Set([...fileRefs].map(basenameOf).filter(Boolean));

  const uploadFiles = listFiles(uploadsDir);
  const uploadNames = new Set(uploadFiles.map((file) => path.basename(file)));
  const orphanFiles = uploadFiles.filter((file) => !referencedNames.has(path.basename(file)));
  const danglingAttachmentRows = attachmentRows.filter((row) => row.path && !uploadNames.has(basenameOf(row.path)));

  const backupEntries = fs.existsSync(backupsDir)
    ? fs.readdirSync(backupsDir)
      .map((name) => {
        const full = path.join(backupsDir, name);
        const stat = fs.statSync(full);
        if (!stat.isDirectory() && ['backup.log', 'backup.json'].includes(name)) return null;
        return { name, full, mtimeMs: stat.mtimeMs };
      })
      .filter(Boolean)
      .sort((a, b) => b.mtimeMs - a.mtimeMs)
    : [];
  const oldBackups = backupEntries.slice(keep);

  return { referencedNames, orphanFiles, danglingAttachmentRows, backupEntries, oldBackups, keep };
}

async function main() {
  let args;
  try { args = parseArgs(process.argv.slice(2)); } catch (e) {
    console.error(`[cleanup] ✖ ${e.message}`);
    process.exit(1);
  }
  const dbPath = path.resolve(args.db || process.env.DB_PATH || path.join(SERVER_DIR, 'data.db'));
  const uploadsDir = path.resolve(args.uploads || process.env.UPLOAD_DIR || path.join(SERVER_DIR, 'uploads'));
  const backupsDir = path.resolve(args.backups || path.join(SERVER_DIR, 'backups'));
  if (!fs.existsSync(dbPath)) {
    console.error(`[cleanup] ✖ 数据库不存在：${dbPath}（用 --db 指定）`);
    process.exit(1);
  }

  let Database;
  try {
    ({ default: Database } = await import('better-sqlite3'));
  } catch (e) {
    console.error(`[cleanup] ✖ 未安装 better-sqlite3（请在 server/ 目录 npm install）：${e.message}`);
    process.exit(1);
  }

  const db = new Database(dbPath, { readonly: !args.apply });
  let plan;
  try {
    plan = planCleanup({ db, uploadsDir, backupsDir, keep: args.keep });
  } finally {
    db.close();
  }

  const mode = args.apply ? 'APPLY' : 'DRY-RUN';
  console.log(`[cleanup] ${mode} · db=${dbPath}`);
  console.log(`[cleanup]   上传目录：${uploadsDir}（文件 ${listFiles(uploadsDir).length}）`);
  console.log(`[cleanup]   备份目录：${backupsDir}（现有 ${plan.backupEntries.length} 份，保留 ${plan.keep}）`);
  console.log(`[cleanup]   ① 孤儿附件：${plan.orphanFiles.length}${plan.orphanFiles.length ? '\n      ' + plan.orphanFiles.slice(0, 20).map((file) => path.relative(uploadsDir, file)).join('\n      ') : ''}`);
  console.log(`[cleanup]   ② 悬空附件行：${plan.danglingAttachmentRows.length}${plan.danglingAttachmentRows.length ? '\n      ' + plan.danglingAttachmentRows.slice(0, 20).map((row) => `${row.id} → ${row.path}`).join('\n      ') : ''}`);
  console.log(`[cleanup]   ③ 旧备份（超出 ${plan.keep} 份）：${plan.oldBackups.length}${plan.oldBackups.length ? '\n      ' + plan.oldBackups.map((entry) => entry.name).join('\n      ') : ''}`);

  if (!args.apply) {
    console.log('[cleanup] 未删除任何内容（dry-run）。确认后加 --apply。');
    return;
  }

  let removedFiles = 0;
  for (const file of plan.orphanFiles) {
    fs.rmSync(file, { force: true });
    removedFiles++;
  }
  let removedRows = 0;
  if (plan.danglingAttachmentRows.length) {
    const dbWrite = new Database(dbPath);
    try {
      const remove = dbWrite.prepare('DELETE FROM attachments WHERE id = ?');
      dbWrite.transaction((ids) => { for (const id of ids) remove.run(id); })(plan.danglingAttachmentRows.map((row) => row.id));
      removedRows = plan.danglingAttachmentRows.length;
    } finally { dbWrite.close(); }
  }
  let removedBackups = 0;
  for (const entry of plan.oldBackups) {
    fs.rmSync(entry.full, { recursive: true, force: true });
    removedBackups++;
  }
  console.log(`[cleanup] ✔ 已删除：孤儿附件 ${removedFiles} · 悬空附件行 ${removedRows} · 旧备份 ${removedBackups}`);
  console.log('[cleanup] 未触碰任何业务表记录。');
}

main().catch((e) => {
  console.error('[cleanup] ✖ 失败：', e && e.message ? e.message : e);
  process.exit(1);
});
