// server/scripts/probe-scale.mjs —— 规模触发探针（`L-17` / `B-541-6`）
// 答一个问题：现在哪张表、哪条查询先撞到「SQLite JSON 宽表」边界（≥1 万行或 p95 > 200ms）。
// 只读；默认读 `server/data.db`（不存在时退回 `data.review.db`），可用 DB_PATH 覆盖。
// 阈值：≥1000 行提示（warn），≥10000 行或 p95 > 200ms 判红（exit 1）；其余 exit 0。
import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SERVER = path.resolve(HERE, '..');
const candidates = [process.env.DB_PATH, path.join(SERVER, 'data.db'), path.join(SERVER, 'data.review.db')].filter(Boolean);
const dbPath = candidates.find((file) => fs.existsSync(file));
if (!dbPath) {
  console.error('[probe:scale] 找不到库（可用 DB_PATH 指定）');
  process.exit(2);
}
const ROW_WARN = 1000;
const ROW_RED = 10000;
const P95_RED_MS = 200;

const db = new Database(dbPath, { readonly: true });
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all().map((row) => row.name);
const rows = tables.map((name) => {
  try {
    return { name, count: db.prepare(`SELECT COUNT(*) c FROM ${name}`).get().c };
  } catch {
    return { name, count: -1 };
  }
}).filter((row) => row.count >= 0).sort((a, b) => b.count - a.count);

// 关键查询样本：按业务热面挑 5 条（都走 JSON 宽表）
const queries = [
  ['activities 列表', "SELECT data FROM activities ORDER BY json_extract(data,'$.date') DESC LIMIT 50"],
  ['notices 按支部', "SELECT data FROM notices WHERE json_extract(data,'$.branchId') = ? LIMIT 50"],
  ['todos 按人', "SELECT data FROM todos WHERE json_extract(data,'$.personId') = ? LIMIT 200"],
  ['attendances 按活动', "SELECT data FROM attendances WHERE json_extract(data,'$.activityId') = ? LIMIT 500"],
  ['users 全表投影', "SELECT data FROM users LIMIT 200"],
];
const bindArg = (sql) => (sql.includes('?') ? [rows.find((row) => row.name === 'users')?.count ? 'p1' : 'br-b1'] : []);
const p95 = (values) => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))] || 0;
};
const timings = [];
for (const [label, sql] of queries) {
  const stmt = db.prepare(sql);
  const samples = [];
  for (let i = 0; i < 8; i += 1) {
    const started = process.hrtime.bigint();
    try { stmt.all(...bindArg(sql)); } catch { /* 表不存在时跳过样本 */ }
    samples.push(Number(process.hrtime.bigint() - started) / 1e6);
  }
  timings.push({ label, p95: p95(samples) });
}
db.close();

let red = false;
console.log(`[probe:scale] 库 ${path.relative(SERVER, dbPath)} · ${rows.length} 表`);
for (const row of rows.slice(0, 10)) {
  const flag = row.count >= ROW_RED ? 'RED' : row.count >= ROW_WARN ? 'WARN' : 'ok';
  if (flag === 'RED') red = true;
  console.log(`  ${flag.padEnd(4)} ${String(row.count).padStart(7)}  ${row.name}`);
}
for (const row of timings) {
  const flag = row.p95 > P95_RED_MS ? 'RED' : 'ok';
  if (flag === 'RED') red = true;
  console.log(`  ${flag.padEnd(4)} p95=${row.p95.toFixed(1)}ms  ${row.label}`);
}
console.log(`[probe:scale] ${red ? '触发红线（≥1 万行或 p95>200ms）' : '未触发'} · 阈值 warn≥${ROW_WARN} / red≥${ROW_RED} 行或 p95>${P95_RED_MS}ms`);
process.exit(red ? 1 : 0);
