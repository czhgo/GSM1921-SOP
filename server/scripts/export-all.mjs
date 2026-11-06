// ════════════════════════════════════════════════════════════════
//  server/scripts/export-all.mjs —— 全量业务表导出（2026-11-02 批次 527 · Wave 3）
// ════════════════════════════════════════════════════════════════
//  用途：把一份 SQLite 库的**全部业务表**导出为 JSON + manifest.json，供
//    `import-all.mjs` 在空库/基线库上重建，或作为换轨前的可核对快照。
//
//  用法（在 server/ 目录下）：
//    node scripts/export-all.mjs --db <源库> --out <导出目录> [--allow-demo] [--force]
//
//  覆盖的表（与 `db.js` 同源，不另抄清单）：
//    RESOURCE_TABLES（34，已退役的 issue_reveals 自动跳过）
//    ＋ SEMANTIC_TABLES（7）＋ WORKGROUP_TABLES（6）
//    ＋ collection_versions（集合版本）＋ seed_meta（部署形态/种子版本）
//
//  产物：
//    <out>/<table>.json   每表一个 JSON 数组（资源表为 `data` 字段解析后的行；版本/元数据表为原列）
//    <out>/manifest.json  { schemaVersion, exportedAt, tables:{行数, sha256}, totalRows, sha256,
//                           localOnly:['committeeBroadcasts'], source:{seedMode, seedVersion} }
//
//  安全语义：
//    · **只读**打开源库（readonly + fileMustExist），不写、不迁移、不加锁写；
//    · `--out` 与 `--db` 必填；导出目录非空时默认拒绝（`--force` 才覆盖同名 JSON 文件）；
//    · 默认拒绝导出「含演示种子」的库（`demo-data-guard` 同一判据）；演练库需显式 `--allow-demo`；
//    · `committeeBroadcasts` 在本机 localStorage，**不随库迁移** ⇒ manifest 显式标注 `localOnly`。
// ════════════════════════════════════════════════════════════════
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const SERVER_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export const EXPORT_FORMAT = 'gsm1921-cutover-export-v1';
/** 本机-only 集合（不随库迁移；换轨前由用户手工导出 localStorage） */
export const LOCAL_ONLY_COLLECTIONS = Object.freeze(['committeeBroadcasts']);

function parseArgs(argv) {
  const out = { db: null, out: null, allowDemo: false, force: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--allow-demo') { out.allowDemo = true; continue; }
    if (arg === '--force') { out.force = true; continue; }
    if (!arg.startsWith('--')) throw new Error(`未知参数：${arg}`);
    const key = arg.slice(2);
    if (!['db', 'out'].includes(key)) throw new Error(`未知参数：${arg}（可用：--db --out --allow-demo --force）`);
    const value = argv[i + 1];
    if (value === undefined || value.startsWith('--')) throw new Error(`参数 --${key} 缺值`);
    out[key] = value;
    i++;
  }
  if (!out.db) throw new Error('必须指定 --db <源库路径>（只读）');
  if (!out.out) throw new Error('必须指定 --out <导出目录>');
  return out;
}

const sha256 = (text) => createHash('sha256').update(text).digest('hex');

function tableNames(dbModule) {
  const { RESOURCE_TABLES, SEMANTIC_TABLES, WORKGROUP_TABLES, RETIRED_RESOURCE_TABLES } = dbModule;
  return [
    ...RESOURCE_TABLES.filter((t) => !RETIRED_RESOURCE_TABLES.has(t)),
    ...SEMANTIC_TABLES,
    ...WORKGROUP_TABLES,
    'collection_versions',
    'seed_meta',
  ];
}

function hasTable(db, name) {
  return Boolean(db.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?").get(name));
}

/** 读一张表为「可直接 JSON 化的行数组」；未知/不存在 ⇒ null */
function readTable(db, name) {
  if (!hasTable(db, name)) return null;
  if (name === 'collection_versions') {
    return db.prepare('SELECT name, version FROM collection_versions ORDER BY name').all();
  }
  if (name === 'seed_meta') {
    return db.prepare('SELECT key, value FROM seed_meta ORDER BY key').all();
  }
  return db.prepare(`SELECT data FROM ${name} ORDER BY id`).all().map((row) => JSON.parse(row.data));
}

/** 稳定表示（用于逐表 sha256）：行已按主键排序，字段顺序由 JSON 原样保留 */
const canonical = (rows) => JSON.stringify(rows);

async function main() {
  let args;
  try { args = parseArgs(process.argv.slice(2)); } catch (e) {
    console.error(`[export-all] ✖ ${e.message}`);
    process.exit(1);
  }
  const dbPath = path.resolve(args.db);
  const outDir = path.resolve(args.out);
  if (!fs.existsSync(dbPath)) {
    console.error(`[export-all] ✖ 源库不存在：${dbPath}`);
    process.exit(1);
  }
  if (fs.existsSync(outDir)) {
    const names = fs.readdirSync(outDir);
    if (names.length && !args.force) {
      console.error(`[export-all] ⛔ 导出目录非空：${outDir}（确认覆盖请加 --force）`);
      process.exit(1);
    }
  }

  const [{ default: Database }, dbModule, { detectDemoSeedRows, loadDemoUserIds }] = await Promise.all([
    import('better-sqlite3'),
    import('../db.js'),
    import('../demo-data-guard.js'),
  ]);
  const { SCHEMA_VERSION } = dbModule;

  const db = new Database(dbPath, { readonly: true, fileMustExist: true });
  try {
    const schemaVersion = Number(db.pragma('user_version', { simple: true })) || 0;
    if (schemaVersion !== SCHEMA_VERSION) {
      console.error(`[export-all] ⛔ 源库 schema v${schemaVersion} ≠ 代码 SCHEMA_VERSION v${SCHEMA_VERSION}。`
        + '请先用匹配版本的代码迁移/或换匹配库；不要导出跨版本混合数据。');
      process.exit(1);
    }

    // 演示库判定（与生产启动闸门同一判据）；默认拒导，演练显式 --allow-demo
    const demoIds = await loadDemoUserIds();
    const demo = detectDemoSeedRows(db, { demoUserIds: demoIds });
    if (demo.demo && !args.allowDemo) {
      console.error('[export-all] ⛔ 源库含演示种子（users 演示账号 / act-<短数字> / seed_meta.mode=demo）。'
        + '换轨导出默认拒绝；演练请显式加 --allow-demo。');
      console.error(`[export-all]   明细：users=${demo.demoUsers.length} · activities=${demo.seedActivities.length} · mode=${demo.seedMode ?? '未登记'}`);
      process.exit(1);
    }

    fs.mkdirSync(outDir, { recursive: true });
    const tables = {};
    let totalRows = 0;
    const digestParts = [];
    for (const name of tableNames(dbModule)) {
      const rows = readTable(db, name);
      if (rows === null) {
        console.warn(`[export-all] ⚠ 表不存在，已跳过：${name}`);
        continue;
      }
      const text = canonical(rows);
      const file = `${name}.json`;
      fs.writeFileSync(path.join(outDir, file), text);
      const digest = sha256(text);
      tables[name] = { file, rows: rows.length, sha256: digest };
      totalRows += rows.length;
      digestParts.push(`${name}:${rows.length}:${digest}`);
    }

    const readMeta = (key) => {
      const row = hasTable(db, 'seed_meta')
        ? db.prepare('SELECT value FROM seed_meta WHERE key = ?').get(key) : null;
      return row ? row.value : null;
    };
    const manifest = {
      format: EXPORT_FORMAT,
      schemaVersion,
      exportedAt: new Date().toISOString(),
      source: {
        db: path.basename(dbPath),
        seedMode: readMeta('mode'),
        seedVersion: readMeta('seed_version'),
        demo: demo.demo,
      },
      localOnly: [...LOCAL_ONLY_COLLECTIONS],
      tables,
      totalRows,
      sha256: sha256(digestParts.join('\n')),
    };
    fs.writeFileSync(path.join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2));

    console.log(`[export-all] ✔ 已导出 ${Object.keys(tables).length} 张表 / ${totalRows} 行 → ${outDir}`);
    console.log(`[export-all]   schema v${schemaVersion} · seed=${manifest.source.seedVersion ?? '未登记'} · mode=${manifest.source.seedMode ?? '未登记'}${demo.demo ? ' · 演示库（--allow-demo）' : ''}`);
    console.log(`[export-all]   manifest.sha256=${manifest.sha256.slice(0, 16)}… · localOnly=${manifest.localOnly.join(',')}`);
  } finally {
    db.close();
  }
}

main().catch((e) => {
  console.error('[export-all] ✖ 导出失败：', e && e.message ? e.message : e);
  process.exit(1);
});
