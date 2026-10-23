// role: [工程师]+[AI]
// server/scripts/schema-split-readiness.mjs — v11 影子拆表的「何时可切权威源」判据单源（批次 504）
//
// 支书 2026-10-23 令：「一定要写好上下文提示你合适可以切！！防止你忘掉你曾经的条件判断句」。
// 本脚本是那句条件判断的可执行版本；同文登记在 CLAUDE.md 乙部 B-504-1 与
// `.trae/specs/implement-r9-schema-plan/spec.md §切表判据`。
//
// 判据（必须同时满足）：
//   C1 规模触发（任一）：单行 JSON max > 256KB；p95 > 32KB；单表 > 5000 行；JSON 总量 > 2MB（bootstrap 代理）
//   C2 冲突触发：同一行 7 天内乐观锁 409 ≥ 3 次（本仓尚未埋点 ⇒ 恒 false，需先加计数）
//   C3 查询触发：agenda 子项或 contributions 子项在 ≥ 2 个读口被按子项过滤/统计（静态计数）
//   C4 影子稳定：agenda_items / taskforce_contributions 与 JSON 主表 mismatch=0
//   C5 制度前置：CLAUDE.md B-500-4（保留期）已裁
// READY = (C1 || C2 || C3) && C4 && C5
//
// 用法：node server/scripts/schema-split-readiness.mjs [dbPath]
import Database from 'better-sqlite3';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { compareShadowTables } from '../db.js';

const ROOT = resolve(import.meta.dirname, '..', '..');
const dbPath = process.argv[2] || join(ROOT, 'server', 'data.db');

function p95(values) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))];
}

function tableStats(db, table) {
  if (!db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?").get(table)) {
    return { rows: 0, max: 0, p95: 0, total: 0 };
  }
  const lengths = db.prepare(`SELECT LENGTH(data) AS n FROM ${table}`).all().map((row) => Number(row.n) || 0);
  return {
    rows: lengths.length,
    max: Math.max(0, ...lengths),
    p95: p95(lengths),
    total: lengths.reduce((sum, n) => sum + n, 0),
  };
}

function countChildQuerySites() {
  const roots = [join(ROOT, 'docs', 'src'), join(ROOT, 'server', 'routes')];
  const hits = new Set();
  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      const full = join(dir, name);
      const stat = statSync(full);
      if (stat.isDirectory()) { walk(full); continue; }
      if (!/\.(m?js)$/.test(name)) continue;
      const text = readFileSync(full, 'utf8');
      const agendaHits = (text.match(/\.agenda\b|agenda_items/g) || []).length;
      const contributionHits = (text.match(/contributions\b|taskforce_contributions/g) || []).length;
      if (agendaHits >= 2 || contributionHits >= 2) hits.add(full);
    }
  };
  for (const root of roots) { try { walk(root); } catch { /* 目录不存在则跳过 */ } }
  return hits.size;
}

function retentionRuled() {
  try {
    const text = readFileSync(join(ROOT, 'CLAUDE.md'), 'utf8');
    const line = text.split(/\r?\n/).find((row) => /\|\s*B-500-4\s*\|/.test(row)) || '';
    return line.includes('已裁') && !line.includes('待裁');
  } catch { return false; }
}

const db = new Database(dbPath, { readonly: true });
try {
  const tables = ['activities', 'attendances', 'inspections', 'todos', 'notices', 'taskforces'];
  const stats = Object.fromEntries(tables.map((table) => [table, tableStats(db, table)]));
  const maxRow = Math.max(...tables.map((table) => stats[table].max));
  const maxP95 = Math.max(...tables.map((table) => stats[table].p95));
  const maxRows = Math.max(...tables.map((table) => stats[table].rows));
  const totalJson = tables.reduce((sum, table) => sum + stats[table].total, 0);
  const shadow = compareShadowTables(db);

  const C1 = maxRow > 256 * 1024 || maxP95 > 32 * 1024 || maxRows > 5000 || totalJson > 2 * 1024 * 1024;
  const C2 = false; // 409 计数尚未埋点；埋点后改为「同一行 7 天 ≥3」
  const childSites = countChildQuerySites();
  const C3 = childSites >= 2;
  const C4 = shadow.mismatch === 0;
  const C5 = retentionRuled();
  const ready = (C1 || C2 || C3) && C4 && C5;

  console.log(JSON.stringify({
    dbPath,
    verdict: ready ? 'READY' : 'NOT_READY',
    criteria: { C1_scale: C1, C2_conflicts: C2, C3_child_queries: C3, C4_shadow_stable: C4, C5_retention_ruled: C5 },
    readings: {
      maxRowBytes: maxRow, p95RowBytes: maxP95, maxTableRows: maxRows, totalJsonBytes: totalJson,
      childQuerySites: childSites, shadowMismatch: shadow.mismatch,
      shadowRows: { agenda: shadow.agenda, contributions: shadow.contributions },
      stats,
    },
    rule: 'READY = (C1||C2||C3) && C4 && C5；全真才可把权威源从 JSON 主表切到 agenda_items / taskforce_contributions',
  }, null, 2));
} finally {
  db.close();
}
