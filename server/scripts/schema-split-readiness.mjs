// role: [工程师]+[AI]
// server/scripts/schema-split-readiness.mjs — v11 影子拆表的「何时可切权威源」判据单源（批次 504 / 505）
//
// 支书 2026-10-23 令：「一定要写好上下文提示你合适可以切！！防止你忘掉你曾经的条件判断句」。
// 本脚本是那句条件判断的可执行版本；判据正文（C1–C5 与「全真才可切」）同文登记在
// `content/04_web_design/data/DATA_MODEL.md §2.3.2` 的「切表判据」段（文档侧单一源）。
//
// v11 结构事实：五张热表（attendances / inspections / notices / activities / todos）的下推列是
//   generated **VIRTUAL**（**不是 STORED**）——SQLite 不允许给**已有数据**的表 `ALTER ... ADD ... STORED`，
//   故一律 VIRTUAL；读时计算、可建复合索引，按列下推仍走索引。
//
// 判据（必须同时满足）：
//   C1 规模触发（任一）：单行 JSON max > 256KB；p95 > 32KB；单表 > 5000 行；JSON 总量 > 2MB（bootstrap 代理）
//   C2 冲突触发：同一行 7 天内乐观锁 409 ≥ 3 次（读数＝`snapshot_conflicts` 埋点，见 db.js 末尾「拆表闸门证据」段）
//   C3 查询触发：agenda 子项或 contributions 子项在 ≥ 2 个读口被按子项过滤/统计（静态计数）
//   C4 影子稳定：近 7 天**每天**都有一条 `mismatch=0` 的影子比对记录，且四写路径双写 100%（读数＝`shadow_history`）
//   C5 制度前置：CLAUDE.md B-500-4（保留期）已裁
// READY = (C1 || C2 || C3) && C4 && C5【全真才可切：判据 1–3 任一 ＋ 4、5 全真才可把权威源从 JSON 主表切到子表】
//
// ⚠ C4 口径（2026-10-23 批次 505 收紧）：原来只看**当下**一次 `compareShadowTables`，
//   而影子表是「重建后才比对」⇒ 恒为 0（判据恒真）。现改为读**每日历史**：
//   近 7 天每天都要有记录且 daily mismatch=0，历史不足 7 天 ⇒ C4=false（输出「历史天数 n/7」）。
// ⚠ 409 行粒度：快照版本协议是**整批 409**、冲突清单只到集合级 ⇒ 埋点的 row_id='*' 表示「该集合整体冲突」；
//   C2 据此按 (collection,row_id) 聚合取最大计数。
//
// 用法：node server/scripts/schema-split-readiness.mjs [dbPath]
import Database from 'better-sqlite3';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { compareShadowTables, getConflictCounts, getShadowHistory } from '../db.js';

const ROOT = resolve(import.meta.dirname, '..', '..');
const CONFLICT_WINDOW_DAYS = 7;
const CONFLICT_THRESHOLD = 3;
const SHADOW_WINDOW_DAYS = 7;

/** 近 N 个本地自然日（含今天；与 `getShadowHistory` 的 day 口径一致） */
function recentDays(n) {
  const out = [];
  const pad = (v) => String(v).padStart(2, '0');
  for (let i = n - 1; i >= 0; i -= 1) {
    const d = new Date(Date.now() - i * 86400000);
    out.push(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`);
  }
  return out;
}

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

/**
 * 计算 C1–C5 与证据读数（供 CLI 与 `schema-split-gate.test.mjs` 共用；只读，不建表不写库）。
 * @param {Object} db better-sqlite3 实例（可只读打开）
 * @returns {Object} `{ dbPath?, verdict, criteria, readings, evidence, rule }`
 */
export function evaluateReadiness(db, { retentionRuled: ruled = retentionRuled() } = {}) {
  const tables = ['activities', 'attendances', 'inspections', 'todos', 'notices', 'taskforces'];
  const stats = Object.fromEntries(tables.map((table) => [table, tableStats(db, table)]));
  const maxRow = Math.max(...tables.map((table) => stats[table].max));
  const maxP95 = Math.max(...tables.map((table) => stats[table].p95));
  const maxRows = Math.max(...tables.map((table) => stats[table].rows));
  const totalJson = tables.reduce((sum, table) => sum + stats[table].total, 0);
  const shadow = compareShadowTables(db);

  const C1 = maxRow > 256 * 1024 || maxP95 > 32 * 1024 || maxRows > 5000 || totalJson > 2 * 1024 * 1024;

  const conflict = getConflictCounts(db, CONFLICT_WINDOW_DAYS);
  const C2 = conflict.maxByRow >= CONFLICT_THRESHOLD;

  const childSites = countChildQuerySites();
  const C3 = childSites >= 2;

  // C4：近 7 天**每天**都要有一条 mismatch=0 的历史（缺哪天都算不稳定；历史不足 7 天 ⇒ false）
  const history = getShadowHistory(db, SHADOW_WINDOW_DAYS);
  const historyByDay = new Map(history.days.map((row) => [row.day, row]));
  const requiredDays = recentDays(SHADOW_WINDOW_DAYS);
  const stableDays = requiredDays.filter((day) => historyByDay.has(day) && historyByDay.get(day).mismatch === 0);
  const C4 = stableDays.length === requiredDays.length;

  const C5 = ruled;
  const ready = (C1 || C2 || C3) && C4 && C5;

  return {
    verdict: ready ? 'READY' : 'NOT_READY',
    criteria: { C1_scale: C1, C2_conflicts: C2, C3_child_queries: C3, C4_shadow_stable: C4, C5_retention_ruled: C5 },
    readings: {
      maxRowBytes: maxRow, p95RowBytes: maxP95, maxTableRows: maxRows, totalJsonBytes: totalJson,
      childQuerySites: childSites, shadowMismatch: shadow.mismatch,
      shadowRows: { agenda: shadow.agenda, contributions: shadow.contributions },
      shadowHistoryDays: `${stableDays.length}/${requiredDays.length}`,
      stats,
    },
    evidence: {
      conflictWindowDays: conflict.windowDays,
      conflictsByRow: conflict.byRow,
      shadowHistoryDays: `${stableDays.length}/${requiredDays.length}`,
      lastShadow: history.days[0] || null,
    },
    rule: 'READY = (C1||C2||C3) && C4 && C5；C2＝同一行 7 天 409≥3；C4＝近 7 天每天一条 mismatch=0；全真才可把权威源从 JSON 主表切到 agenda_items / taskforce_contributions',
  };
}

function main() {
  const dbPath = process.argv[2] || join(ROOT, 'server', 'data.db');
  const db = new Database(dbPath, { readonly: true });
  try {
    console.log(JSON.stringify({ dbPath, ...evaluateReadiness(db) }, null, 2));
  } finally {
    db.close();
  }
}

// 被测试 import 时不得执行 CLI（只在 `node <本文件>` 直跑时输出）
if (process.argv[1] && resolve(process.argv[1]) === import.meta.filename) main();
