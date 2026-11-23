// ════════════════════════════════════════════════════════════════
//  server/scripts/import-all.mjs —— 全量业务表导入（2026-11-02 批次 527 · Wave 3）
// ════════════════════════════════════════════════════════════════
//  用途：把 `export-all.mjs` 的产物导入**空库 / 基线库**（单事务、失败整体回滚）。
//
//  用法（在 server/ 目录下；**缺省 dry-run**）：
//    node scripts/import-all.mjs --from <导出目录> --db <目标库> --branch-map old=new --dry-run
//    node scripts/import-all.mjs --from <导出目录> --db <目标库> --branch-map old=new --apply
//    node scripts/import-all.mjs ... --branch-map br-b1=br-b1 --branch-map br-b2=br-b9
//
//  硬性校验（任一不过即拒绝，绝不静默）：
//    ① manifest.schemaVersion == 代码 SCHEMA_VERSION == 目标库 user_version；
//    ② `--branch-map` **必填**：凡行内有非空 `branchId`，旧值必须在映射内——
//       禁止无映射时静默落到 `br-b1`（换轨错挂支部是不可逆的业务事故）；
//    ③ id 冲突：目标库已存在同主键 ⇒ 拒绝并列出（不做 upsert）；
//    ④ 契约 required / enums：`server/data/domain-contract.mjs` 逐行校验；
//    ⑤ 导入后逐表行数与 sha256 与「映射后的导出数据」比对，不一致 ⇒ 抛错 ⇒ 事务回滚。
//
//  退出码：0 = dry-run 通过 / apply 成功；1 = 任一校验失败（已回滚）。
//  失败处置见 deploy/CUTOVER_RUNBOOK.md。
// ════════════════════════════════════════════════════════════════
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { initDb } from '../db.js';
import { DOMAIN_CONTRACT, ENTITY_BY_TABLE, validateEntityRows } from '../data/domain-contract.mjs';

const SERVER_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const EXPECTED_FORMAT = 'gsm1921-cutover-export-v1';
const sha256 = (text) => createHash('sha256').update(text).digest('hex');
const RUNBOOK = 'deploy/CUTOVER_RUNBOOK.md';

function parseArgs(argv) {
  const out = { from: null, db: null, apply: false, branchMap: [] };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--apply') { out.apply = true; continue; }
    if (arg === '--dry-run') { out.apply = false; continue; }
    if (!arg.startsWith('--')) throw new Error(`未知参数：${arg}`);
    const key = arg.slice(2);
    if (!['from', 'db', 'branch-map'].includes(key)) {
      throw new Error(`未知参数：${arg}（可用：--from --db --branch-map --apply --dry-run）`);
    }
    const value = argv[i + 1];
    if (value === undefined || value.startsWith('--')) throw new Error(`参数 --${key} 缺值`);
    if (key === 'branch-map') out.branchMap.push(...String(value).split(',').filter(Boolean));
    else out[key] = value;
    i++;
  }
  if (!out.from) throw new Error('必须指定 --from <导出目录>');
  if (!out.db) throw new Error('必须指定 --db <目标库>');
  return out;
}

function parseBranchMap(list) {
  if (!list.length) {
    throw new Error('必须显式提供 --branch-map old=new（可重复）。'
      + '导入器**不会**在没有映射时把异 id 支部静默落到 br-b1。');
  }
  const map = new Map();
  for (const item of list) {
    const idx = item.indexOf('=');
    if (idx <= 0 || idx === item.length - 1) throw new Error(`--branch-map 格式应为 old=new：${item}`);
    const oldId = item.slice(0, idx).trim();
    const newId = item.slice(idx + 1).trim();
    if (!oldId || !newId) throw new Error(`--branch-map 两端不得为空：${item}`);
    if (map.has(oldId) && map.get(oldId) !== newId) throw new Error(`--branch-map 对 ${oldId} 给了两个不同目标：${map.get(oldId)} / ${newId}`);
    map.set(oldId, newId);
  }
  return map;
}

const rowKey = (table, row) => (table === 'collection_versions' ? row.name : table === 'seed_meta' ? row.key : row.id);

function readManifest(fromDir) {
  const file = path.join(fromDir, 'manifest.json');
  if (!fs.existsSync(file)) throw new Error(`导出目录缺少 manifest.json：${fromDir}`);
  const manifest = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (manifest.format !== EXPECTED_FORMAT) throw new Error(`manifest.format 不认识：${manifest.format}`);
  if (!manifest.tables || typeof manifest.tables !== 'object') throw new Error('manifest.tables 缺失');
  return manifest;
}

function readTableFile(fromDir, entry, table) {
  const file = path.join(fromDir, entry.file || `${table}.json`);
  if (!fs.existsSync(file)) throw new Error(`导出文件缺失：${file}`);
  const rows = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (!Array.isArray(rows)) throw new Error(`导出文件不是数组：${file}`);
  return rows;
}

function hasTable(db, name) {
  return Boolean(db.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?").get(name));
}

function readTable(db, name) {
  if (name === 'collection_versions') return db.prepare('SELECT name, version FROM collection_versions ORDER BY name').all();
  if (name === 'seed_meta') return db.prepare('SELECT key, value FROM seed_meta ORDER BY key').all();
  return db.prepare(`SELECT data FROM ${name} ORDER BY id`).all().map((row) => JSON.parse(row.data));
}

function openTarget(dbPath, schemaVersion) {
  const existed = fs.existsSync(dbPath);
  if (!existed) {
    // 空库首建：initDb 走建表 + 迁移；空库无业务数据 ⇒ 不会触发迁移前备份。
    const db = initDb(dbPath);
    if (Number(db.pragma('user_version', { simple: true })) !== schemaVersion) {
      db.close();
      throw new Error(`目标库 schema 非 v${schemaVersion}（initDb 后仍不一致）`);
    }
    return db;
  }
  const Database = requireBetterSqlite3();
  const ro = new Database(dbPath, { readonly: true });
  let version;
  try { version = Number(ro.pragma('user_version', { simple: true })) || 0; } finally { ro.close(); }
  if (version !== schemaVersion) {
    throw new Error(`目标库 user_version=${version} ≠ manifest.schemaVersion=${schemaVersion}。`
      + '导入器不迁移、不降级：请先用匹配版本建库，或换匹配的导出。');
  }
  return new Database(dbPath);
}

let _Database = null;
function requireBetterSqlite3() {
  if (!_Database) throw new Error('better-sqlite3 尚未加载');
  return _Database;
}

/** dry-run 不许落盘：目标不存在 ⇒ 用 `:memory:` 建同构 schema 做「表齐全 / 冲突」预检 */
function openTargetForDryRun(dbPath, schemaVersion) {
  if (!fs.existsSync(dbPath)) {
    const mem = initDb(':memory:');
    if (Number(mem.pragma('user_version', { simple: true })) !== schemaVersion) {
      mem.close();
      throw new Error(`内存预检库 schema 非 v${schemaVersion}`);
    }
    return mem;
  }
  const Database = requireBetterSqlite3();
  const ro = new Database(dbPath, { readonly: true });
  const version = Number(ro.pragma('user_version', { simple: true })) || 0;
  if (version !== schemaVersion) {
    ro.close();
    throw new Error(`目标库 user_version=${version} ≠ manifest.schemaVersion=${schemaVersion}。`
      + '导入器不迁移、不降级：请先用匹配版本建库，或换匹配的导出。');
  }
  return ro;
}

async function main() {
  let args;
  try { args = parseArgs(process.argv.slice(2)); } catch (e) {
    console.error(`[import-all] ✖ ${e.message}`);
    process.exit(1);
  }
  const fromDir = path.resolve(args.from);
  const dbPath = path.resolve(args.db);
  let branchMap;
  try { branchMap = parseBranchMap(args.branchMap); } catch (e) {
    console.error(`[import-all] ✖ ${e.message}`);
    process.exit(1);
  }
  if (!fs.existsSync(fromDir)) {
    console.error(`[import-all] ✖ 导出目录不存在：${fromDir}`);
    process.exit(1);
  }

  const { default: Database } = await import('better-sqlite3');
  const dbModule = await import('../db.js');
  _Database = Database;
  const schemaVersion = dbModule.SCHEMA_VERSION;

  const manifest = readManifest(fromDir);
  if (Number(manifest.schemaVersion) !== schemaVersion) {
    console.error(`[import-all] ⛔ manifest.schemaVersion=${manifest.schemaVersion} ≠ 代码 SCHEMA_VERSION=${schemaVersion}。拒绝导入。`);
    console.error(`[import-all]   处置见 ${RUNBOOK}（用匹配版本重新导出/导入）。`);
    process.exit(1);
  }

  // ── 读入 + 支部映射 + 契约校验（全部在写库前完成） ──────────────────
  const planned = [];
  const mappingErrors = [];
  const contractErrors = [];
  for (const [table, entry] of Object.entries(manifest.tables)) {
    const sourceRows = readTableFile(fromDir, entry, table);
    if (sourceRows.length !== Number(entry.rows)) {
      console.error(`[import-all] ⛔ ${table}: manifest 记 ${entry.rows} 行，实际文件 ${sourceRows.length} 行（导出不完整）。`);
      process.exit(1);
    }
    const mappedRows = sourceRows.map((row) => {
      if (!row || typeof row !== 'object' || Array.isArray(row)) return row;
      if (!Object.hasOwn(row, 'branchId') || row.branchId === null || row.branchId === undefined || row.branchId === '') return row;
      const oldId = String(row.branchId);
      if (!branchMap.has(oldId)) {
        mappingErrors.push(`${table}:${rowKey(table, row) || '(no-id)'} branchId=${oldId}`);
        return row;
      }
      return { ...row, branchId: branchMap.get(oldId) };
    });
    if (ENTITY_BY_TABLE[table] && !ENTITY_BY_TABLE[table].deprecated) {
      const problems = validateEntityRows(table, mappedRows);
      for (const p of problems.slice(0, 50)) {
        contractErrors.push(`${p.entity} ${p.id} 字段 ${p.field}${p.kind === 'enum' ? ` 枚举值 ${p.value}` : ''}（${p.kind}）`);
      }
    }
    planned.push({ table, entry, rows: mappedRows });
  }
  if (mappingErrors.length) {
    console.error(`[import-all] ⛔ 支部映射不完整（${mappingErrors.length} 处；禁止静默落 br-b1）：`);
    for (const line of mappingErrors.slice(0, 30)) console.error(`  - ${line}`);
    if (mappingErrors.length > 30) console.error(`  … 其余 ${mappingErrors.length - 30} 处省略`);
    console.error(`[import-all]   补 --branch-map old=new 后重跑；处置见 ${RUNBOOK}。`);
    process.exit(1);
  }
  if (contractErrors.length) {
    console.error(`[import-all] ⛔ 契约校验未通过（required / enums，共 ${contractErrors.length} 处）：`);
    for (const line of contractErrors.slice(0, 40)) console.error(`  - ${line}`);
    if (contractErrors.length > 40) console.error(`  … 其余 ${contractErrors.length - 40} 处省略`);
    console.error(`[import-all]   契约单一源：server/data/domain-contract.mjs；处置见 ${RUNBOOK}。`);
    process.exit(1);
  }

  const db = args.apply ? openTarget(dbPath, schemaVersion) : openTargetForDryRun(dbPath, schemaVersion);
  try {
    // 目标表必须齐全（导入器不建表：建表只归 initDb / 迁移）
    const missing = planned.map((p) => p.table).filter((t) => !hasTable(db, t));
    if (missing.length) throw new Error(`目标库缺表：${missing.join(', ')}（请先用匹配版本 initDb 建库）`);

    // ② id 冲突（存在即拒，列出）
    const conflicts = [];
    for (const p of planned) {
      const key = p.table === 'collection_versions' ? 'name' : p.table === 'seed_meta' ? 'key' : 'id';
      const existing = new Set(db.prepare(`SELECT ${key} AS k FROM ${p.table}`).all().map((r) => String(r.k)));
      for (const row of p.rows) {
        const k = rowKey(p.table, row);
        if (k !== undefined && k !== null && existing.has(String(k))) conflicts.push(`${p.table}:${k}`);
      }
    }
    if (conflicts.length) {
      console.error(`[import-all] ⛔ 目标库已有同主键记录（${conflicts.length} 处；导入只允许空库/基线库）：`);
      for (const line of conflicts.slice(0, 40)) console.error(`  - ${line}`);
      if (conflicts.length > 40) console.error(`  … 其余 ${conflicts.length - 40} 处省略`);
      console.error(`[import-all]   请改用空库（或先按 ${RUNBOOK} 备份并清空目标库）。`);
      process.exit(1);
    }

    // 逐表期望值（映射后）——导入后按同一口径比对
    const expected = planned.map((p) => ({
      table: p.table, rows: p.rows, count: p.rows.length, sha256: sha256(JSON.stringify(p.rows)),
    }));

    if (!args.apply) {
      console.log(`[import-all] ✔ dry-run 通过：${planned.length} 张表 / ${planned.reduce((n, p) => n + p.rows.length, 0)} 行`);
      console.log(`[import-all]   manifest schema v${schemaVersion} · 源 ${manifest.source?.seedVersion ?? '未登记'} · 演示库=${manifest.source?.demo ? '是' : '否'}`);
      console.log(`[import-all]   branch-map：${[...branchMap.entries()].map(([a, b]) => `${a}→${b}`).join('、')}`);
      console.log(`[import-all]   localOnly（不随库迁移）：${(manifest.localOnly || []).join('、') || '无'}`);
      console.log('[import-all]   未写库；确认后加 --apply（单事务）。');
      return;
    }

    // ③ 单事务写入 + 导入后校验（不一致即抛 ⇒ 整体回滚）
    const run = db.transaction(() => {
      for (const p of planned) {
        if (p.table === 'collection_versions') {
          const stmt = db.prepare('INSERT INTO collection_versions (name, version) VALUES (?, ?)');
          for (const row of p.rows) stmt.run(row.name, Number(row.version) || 0);
        } else if (p.table === 'seed_meta') {
          const stmt = db.prepare('INSERT INTO seed_meta (key, value) VALUES (?, ?)');
          for (const row of p.rows) stmt.run(row.key, String(row.value));
        } else {
          const stmt = db.prepare(`INSERT INTO ${p.table} (id, data) VALUES (?, ?)`);
          for (const row of p.rows) stmt.run(row.id, JSON.stringify(row));
        }
      }
      // ④ 逐表行数与 sha256 比对（与映射后的导出数据同口径）
      const problems = [];
      for (const exp of expected) {
        const actual = readTable(db, exp.table);
        if (actual.length !== exp.count) {
          problems.push(`${exp.table}: 行数 ${actual.length} ≠ 期望 ${exp.count}`);
          continue;
        }
        const digest = sha256(JSON.stringify(actual));
        if (digest !== exp.sha256) problems.push(`${exp.table}: sha256 ${digest.slice(0, 12)}… ≠ 期望 ${exp.sha256.slice(0, 12)}…`);
      }
      if (problems.length) throw new Error(`导入后校验失败（将整体回滚）：\n  ${problems.join('\n  ')}`);

      for (const exp of expected) {
        const flag = exp.sha256 === (manifest.tables[exp.table]?.sha256 || exp.sha256) ? '同' : '因 branch-map 改写';
        console.log(`[import-all]   ✔ ${exp.table}: ${exp.count} 行 · sha256 ${exp.sha256.slice(0, 12)}…（与导出${flag === '同' ? '一致' : '不同，属映射预期'}）`);
      }
    });
    run();
    const total = expected.reduce((n, e) => n + e.count, 0);
    console.log(`[import-all] ✔ 已导入 ${expected.length} 张表 / ${total} 行 → ${dbPath}`);
    console.log(`[import-all]   下一步：node scripts/preflight-cutover.mjs --db ${path.relative(SERVER_DIR, dbPath) || dbPath}`);
  } catch (e) {
    console.error(`[import-all] ✖ 导入失败（单事务已回滚）：${e && e.message ? e.message : e}`);
    console.error(`[import-all]   处置见 ${RUNBOOK}（备份 → 修复 → 重跑 dry-run）。`);
    process.exitCode = 1;
  } finally {
    try { db.close(); } catch (_) { /* 已关 */ }
  }
}

main().catch((e) => {
  console.error('[import-all] ✖ 导入失败（未落库）：', e && e.message ? e.message : e);
  console.error(`[import-all]   处置见 ${RUNBOOK}。`);
  process.exit(1);
});
