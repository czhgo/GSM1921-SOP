// server/scripts/migrate-notice-audience.mjs — 存量通知受众补齐（2026-11-07 批次 535 · CASE-AI-004）
// ════════════════════════════════════════════════════════════════
// 背景：2026-11-07 前系统通知可能无受众，读侧把「无受众」当广播（匿名可读）。
//   本批改为 fail-closed 后，存量无受众通知会突然不可读。本脚本按 kind 策略补齐：
//     · broadcast（activity-created-broadcast）→ audience:['all']；
//     · required 且可推定 → 补固定受众（考勤→组织委员 / 分工议题→支委层 / 议程与预拟通知→全体党员）；
//     · project-auth-granted 能取到 targetPersonId → audiencePersons:[该人]；
//     · 其余补不出 → legacyUnscoped:true（读侧仅发布者可见，不删除数据）。
//
// 用法（默认 dry-run，不写库）：
//   node scripts/migrate-notice-audience.mjs --db data.db
//   node scripts/migrate-notice-audience.mjs --db data.db --apply
// ════════════════════════════════════════════════════════════════
import Database from 'better-sqlite3';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { audiencePolicyOf } from '../system-notice-kinds.js';

const SERVER_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function parseArgs(argv) {
  const out = { db: process.env.DB_PATH || path.join(SERVER_DIR, 'data.db'), apply: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--apply') { out.apply = true; continue; }
    if (arg === '--db') {
      const value = argv[i + 1];
      if (!value || value.startsWith('--')) throw new Error('--db 缺值');
      out.db = value;
      i++;
      continue;
    }
    throw new Error(`未知参数：${arg}（可用：--db <path> --apply）`);
  }
  return out;
}

/** 可推定的 required 固定受众（历史行为等价） */
const REQUIRED_FALLBACK = {
  'attendance-confirmed': ['org-commissioner'],
  'activity-agenda-updated': ['all'],
  'workforce-proposal-created': 'committee',
  'activity-notice-draft': ['all'],
  'taskforce-notice-draft': ['all'],
};

function hasAudience(n) {
  const a = n && n.audience;
  const hasA = Array.isArray(a) ? a.length > 0 : (typeof a === 'string' && a.trim() !== '');
  const hasP = Array.isArray(n && n.audiencePersons) && n.audiencePersons.length > 0;
  const hasR = Array.isArray(n && n.actionRoles) && n.actionRoles.length > 0;
  return hasA || hasP || hasR;
}

function main() {
  const { db: dbPath, apply } = parseArgs(process.argv.slice(2));
  const db = new Database(dbPath, { readonly: !apply });
  const rows = db.prepare('SELECT id, data FROM notices').all();
  const counts = { scanned: 0, alreadyScoped: 0, broadcastAdded: 0, requiredFilled: 0, personFilled: 0, legacyUnscoped: 0, skippedAnnouncement: 0 };
  const updates = [];

  for (const row of rows) {
    counts.scanned++;
    let n;
    try { n = JSON.parse(row.data); } catch { continue; }
    const kind = n && n.kind;
    if (kind !== 'system') { counts.skippedAnnouncement++; continue; }
    if (hasAudience(n)) { counts.alreadyScoped++; continue; }

    const policy = audiencePolicyOf(n.systemKind || n.sourceType || '');
    const systemKind = n.systemKind || n.sourceType || '';
    if (policy === 'broadcast') {
      n.audience = ['all'];
      counts.broadcastAdded++;
    } else if (REQUIRED_FALLBACK[systemKind]) {
      n.audience = REQUIRED_FALLBACK[systemKind];
      counts.requiredFilled++;
    } else if (systemKind === 'project-auth-granted') {
      const target = n.targetPersonId || (n.payload && n.payload.targetPersonId);
      if (target) {
        n.audiencePersons = [String(target)];
        counts.personFilled++;
      } else {
        n.legacyUnscoped = true;
        counts.legacyUnscoped++;
      }
    } else {
      n.legacyUnscoped = true;
      counts.legacyUnscoped++;
    }
    updates.push({ id: row.id, data: JSON.stringify(n) });
  }

  console.log(`[migrate-notice-audience] ${apply ? 'APPLY' : 'DRY-RUN'} db=${dbPath}`);
  console.log(JSON.stringify(counts, null, 2));
  if (apply && updates.length) {
    const stmt = db.prepare('UPDATE notices SET data = ? WHERE id = ?');
    const tx = db.transaction((list) => { for (const u of list) stmt.run(u.data, u.id); });
    tx(updates);
    console.log(`[migrate-notice-audience] 已写入 ${updates.length} 条`);
  } else if (!apply && updates.length) {
    console.log(`[migrate-notice-audience] 待写入 ${updates.length} 条（加 --apply 落库）`);
  }
  db.close();
}

main();
