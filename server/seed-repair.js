// server/seed-repair.js — 服务端种子行安全修复（B-499-8 Task 4）
// ════════════════════════════════════════════════════════════════
// 病灶：`server.js` 原先只在 `users` 为空时 `seedDatabase()` ⇒ 既有库永不跟随 SEED_* 更新，
//   而浏览器侧早有 `SEED_DATA_VERSION`。本模块补「既有库跟随种子」的安全路径：
//   · 版本单一源 = `docs/src/core/domain/domain.js::SEED_DATA_VERSION`；
//   · 元数据表 = `seed_meta(key, value)`（schema v9）；
//   · 版本不一致 ⇒ **一个事务内**只更新既有 seed id 的 `seedOwnedFields`，写回版本；
//   · **不调用 replaceCollection**：不插入缺失种子、不删除 orphan、不动用户自建行；
//   · 运行时字段（manifest.runtimeFields）与未登记字段原样保留。
// ════════════════════════════════════════════════════════════════
import { SEED_MANIFEST } from '../docs/src/data/seed-manifest.js';
import { detectSeedDrift, planSeedRepair } from '../docs/src/data/seed-drift.js';
import { loadSeedRowsByTable } from './seed-rows.js';
import { isProductionEnv } from './env.js';

export const SEED_META_TABLE = 'seed_meta';
export const SEED_VERSION_KEY = 'seed_version';

const hasTable = (db, table) => Boolean(
  db.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?").get(table),
);

export function readSeedMeta(db, key) {
  if (!hasTable(db, SEED_META_TABLE)) return null;
  const row = db.prepare(`SELECT value FROM ${SEED_META_TABLE} WHERE key = ?`).get(key);
  return row ? row.value : null;
}

export function writeSeedMeta(db, key, value) {
  if (!hasTable(db, SEED_META_TABLE)) return false;
  db.prepare(`INSERT OR REPLACE INTO ${SEED_META_TABLE} (key, value) VALUES (?, ?)`).run(key, String(value));
  return true;
}

function tableIds(db, table) {
  return db.prepare(`SELECT id, data FROM ${table}`).all();
}

/**
 * 只修复既有 seed id（同步；调用方提供种子行）。
 * @param {Object} db better-sqlite3
 * @param {{seedRowsByTable:Object<string,Array>, seedVersion?:string|null, log?:boolean}} options
 * @returns {{updated:number, unchanged:number, orphan:number, missing:number, tables:Object, versionWritten:boolean}}
 */
export function repairExistingSeedRows(db, { seedRowsByTable = {}, seedVersion = null, log = true } = {}) {
  const report = { updated: 0, unchanged: 0, orphan: 0, missing: 0, tables: {}, versionWritten: false };

  const run = db.transaction(() => {
    for (const entry of SEED_MANIFEST) {
      // 组织骨架（users / branches / 任期 / 审计）归用户与组织所有：这些集合 initTier='keep'，
      // 改名、任命、角色调整都不是「种子漂移」。种子版本修复只作用于 initTier='clear' 的业务集合。
      if (entry.initTier !== 'clear') continue;
      if (!hasTable(db, entry.table)) continue;
      const seedRows = seedRowsByTable[entry.table] || [];
      const rows = tableIds(db, entry.table).map((row) => JSON.parse(row.data));
      const drift = detectSeedDrift({ rows, seedRows, entry });
      const plan = planSeedRepair({ rows, seedRows, entry });
      if (plan.updates.length) {
        const update = db.prepare(`UPDATE ${entry.table} SET data = ? WHERE id = ?`);
        for (const item of plan.updates) update.run(JSON.stringify(item.data), item.id);
      }
      report.updated += plan.updated;
      report.unchanged += plan.unchanged;
      report.orphan += drift.counts.orphan;
      report.missing += drift.counts.missing;
      report.tables[entry.table] = {
        updated: plan.updated,
        unchanged: plan.unchanged,
        orphan: drift.counts.orphan,
        missing: drift.counts.missing,
      };
    }
    if (seedVersion != null) {
      report.versionWritten = writeSeedMeta(db, SEED_VERSION_KEY, seedVersion);
      writeSeedMeta(db, 'updated_at', new Date().toISOString());
    }
  });
  run();

  if (log) {
    const changed = Object.entries(report.tables).filter(([, value]) => value.updated > 0 || value.orphan > 0 || value.missing > 0);
    console.log(
      `[seed] 仅修复既有种子行：更新 ${report.updated} 行 · 未变 ${report.unchanged} 行`
      + ` · orphan ${report.orphan}（保留）· missing ${report.missing}（不补）`
      + (seedVersion != null ? ` · seed_version=${seedVersion}` : '')
      + (changed.length ? ` · 明细 ${changed.map(([table, value]) => `${table}:${value.updated}`).join(', ')}` : ''),
    );
  }
  return report;
}

/**
 * 启动期入口：比较 `seed_meta.seed_version` 与当前 `SEED_DATA_VERSION`。
 * 一致 ⇒ 完全不动（二次启动零写）；不一致 ⇒ 事务内修复既有 seed id 并写回版本。
 *
 * Task 7.2（正式数据轨道）：以下两种形态**不修复演示 seed id**，且 `seed_meta` **只读**（不写版本）：
 *   · `seed_meta.mode = 'baseline'` —— 组织基线库本就不含演示种子（`scripts/rebuild-demo.mjs --mode baseline`）；
 *   · **生产形态**（`APP_ENV/NODE_ENV=production`）—— 生产库是真实账本，演示种子的「跟随版本修复」
 *     可能把用户改过的真实行按演示种子回写，故一律跳过。
 * 跳过时日志写明原因，便于值班人核对（不是静默忽略）。
 * @param {Object} db
 * @param {string} seedVersion 当前 `SEED_DATA_VERSION`
 * @param {{mode?:string|null, production?:boolean}} [opts] 仅供测试注入；缺省从 `seed_meta` / 环境读取
 */
export async function repairSeedRowsIfNeeded(db, seedVersion, opts = {}) {
  if (!db || !seedVersion) return { skipped: true, reason: 'missing-args' };
  const mode = opts.mode !== undefined ? opts.mode : readSeedMeta(db, 'mode');
  const production = opts.production !== undefined ? opts.production : isProductionEnv();
  if (mode === 'baseline') {
    console.log('[seed] 跳过演示种子修复：seed_meta.mode=baseline（组织基线库不含演示种子）；仅读取 seed_meta，未写入。');
    return { skipped: true, reason: 'baseline-mode', mode };
  }
  if (production) {
    console.log('[seed] 跳过演示种子修复：生产形态不修复演示 seed id（避免覆盖真实账本）；仅读取 seed_meta，未写入。');
    return { skipped: true, reason: 'production' };
  }
  const current = readSeedMeta(db, SEED_VERSION_KEY);
  if (current === String(seedVersion)) {
    return { skipped: true, reason: 'version-match', seedVersion: current };
  }
  const seedRowsByTable = await loadSeedRowsByTable();
  console.log(`[seed] 种子版本不一致（${current ?? '未登记'} → ${seedVersion}）：开始安全修复既有种子行`);
  const report = repairExistingSeedRows(db, { seedRowsByTable, seedVersion });
  return { skipped: false, from: current, to: String(seedVersion), ...report };
}
