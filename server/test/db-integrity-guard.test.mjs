// server/test/db-integrity-guard.test.mjs — 数据库完整性 / 版本自检 + 「新增结构须写 migration」纪律守卫（2026-09-25）
//
// 与「最小可用迁移机制」（`server/db.js` 末尾）配套：
//   G1 完整性：临时库 `PRAGMA integrity_check` = `ok`。
//   G2 版本对齐：`PRAGMA user_version` **等于**迁移列表最大版本 `SCHEMA_VERSION`——
//        防「有迁移没跑」（user_version 落后）/「版本号被手改」（user_version 超前）两种静默腐坏。
//   G3 列表自检：`validateMigrations(MIGRATIONS)` 无问题（version 严格递增且唯一、每项有 name 与 up）。
//   G4 非空转：① **抽取有基线**——db.js 自建表抽取数 / 集合须＝冻结基线（防抽取口径被改坏 ⇒ G5 恒真）；
//              ② **合成反例**——校验器在「重复版本号 / 非严格递增 / 缺 name / 缺 up / 空列表」上必须命中。
//   G5 纪律（判红）：**db.js 自建表清单里出现的表，必须要么在 v1 冻结基线内、要么被某个 migration 的
//        `tables` 声明**；否则＝「新增/变更结构却没写 migration」⇒ 红。并核 v1 基线**冻结**（不得被悄悄加表）。
//   G6 纪律（判红）：全 `server/` 源码里的 `ALTER TABLE` 只许出现在 migration 段内（结构变更必须走迁移）。
//
// 运行：`node --test server/test/db-integrity-guard.test.mjs`（纯 node，无浏览器 / 无服务依赖）
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { initDb, MIGRATIONS, SCHEMA_VERSION, validateMigrations } from '../db.js';

const ROOT = path.resolve(import.meta.dirname, '..', '..');
const DB_JS = path.join(ROOT, 'server', 'db.js');
const SRC = fs.readFileSync(DB_JS, 'utf8');

/**
 * v1 冻结基线：迁移机制落地（2026-09-25）时 db.js 自建的**全部**表。
 * ⚠ 只增不改版本——**新增表一律走 `v2+` 迁移**（并在其 `tables` 里登记），**不得**改写这份基线。
 * ⚠ **删表是唯一例外**（2026-10-02 批次 342 · `CRUD-1`）：**删表**必须同批① 从 `db.js` 的 `RESOURCE_TABLES`
 *   移除、② 追加 `v2+` 的 `DROP TABLE` 迁移并在 `drops` 声明、③ 保留冻结的 v1 基线行（它记录历史结构，
 *   不代表当前表仍存在）；G1 用全部 migration 的 `drops` 计算当前表集，G4 仍核对历史基线与创建声明。
 */
const LEGACY_TABLES = [
  // 34 张资源表（RESOURCE_TABLES）
  'users', 'activities', 'tasks', 'attendances', 'inspections',
  'taskforces', 'notices', 'todos', 'assignments', 'makeup_tasks',
  'experience_deposits', 'file_space_records', 'image_records',
  'signups', 'activity_reviews', 'taskforce_reviews', 'prop_tasks', 'weekly_reports',
  'archive_records', 'external_dispatches',
  'act_sub_records', 'tf_sub_records',
  'branch_docs', 'member_change_requests', 'committee_broadcasts',
  'agenda_votes', 'branches', 'appointment_records', 'review_requests',
  'issues', 'thought_reports', 'party_groups', 'member_flows', 'issue_reveals',
  // 8 张语义表（SEMANTIC_TABLES）
  'handoffs', 'member_confirmations', 'milestones',
  'attendance_appeals', 'inspection_appeals', 'issue_unread', 'auth_audit',
  // SCHEMA 里的 2 张关系表 + 乐观锁表
  'sessions', 'attachments', 'collection_versions',
];

/** 从 db.js 源码抽出一个数组常量的字符串元素 */
function listNames(varName) {
  const m = new RegExp(`const ${varName} = \\[([\\s\\S]*?)\\n\\];`).exec(SRC);
  assert.ok(m, `db.js 未解析到 ${varName} 数组（抽取口径失效 ⇒ 本守卫会恒真）`);
  return [...m[1].matchAll(/'([a-z_][a-z0-9_]*)'/g)].map((x) => x[1]);
}

/** db.js 自建的全部表名（＝既有 `CREATE TABLE IF NOT EXISTS` 路径实际会建的表） */
const AD_HOC = new Set([
  ...listNames('RESOURCE_TABLES'),
  ...listNames('SEMANTIC_TABLES'),
  ...[.../const SCHEMA = `([\s\S]*?)`;/.exec(SRC)[1].matchAll(/CREATE TABLE IF NOT EXISTS (\w+)/g)].map((m) => m[1]),
  /COLLECTION_VERSIONS_TABLE = '(\w+)'/.exec(SRC)[1],
  ...MIGRATIONS.flatMap((migration) => migration.tables || []),
]);
const AD_HOC_BASELINE = 57; // v1 冻结 44 张 + schema v3 新增 6 张 + schema v4 周期归档表 + schema v9 seed_meta + v11 影子子表 2 张；v12 不新增表（只删 issue_reveals）；v13 新增 publication_audits（语义表）⇒ 54 → 55；v16 新增 committee_proposals / committee_proposal_events ⇒ 55 → 57；新增迁移表须同步审阅本基线。

/** 各迁移声明的表名（`tables` 字段） */
const DECLARED = new Set();
for (const m of MIGRATIONS) for (const t of (m.tables || [])) DECLARED.add(t);
/** 被迁移机制覆盖的表＝冻结基线 ∪ 迁移声明 */
const COVERED = new Set([...LEGACY_TABLES, ...DECLARED]);
/** 从已创建结构扣除迁移明确声明删除的历史表，得到目标版本应存在的表集。 */
const RETIRED_TABLES = new Set(MIGRATIONS.flatMap((migration) => migration.drops || []));
const CURRENT_TABLES = new Set([...AD_HOC].filter((table) => !RETIRED_TABLES.has(table)));
const CURRENT_TABLE_BASELINE = 55; // v12 DROP issue_reveals ⇒ 53 − 1；v13 新增 publication_audits ⇒ 52 + 1；v16 新增 committee_proposals / committee_proposal_events ⇒ 53 + 2

// ── G1 / G2 ────────────────────────────────────────────────────────────────
test('G1/G2 完整性 + 版本对齐：临时库 integrity_check=ok，且 user_version=SCHEMA_VERSION', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gsm-guard-'));
  const p = path.join(dir, 'data.db');
  const db = initDb(p);
  try {
    assert.equal(db.pragma('integrity_check', { simple: true }), 'ok', 'integrity_check 必须 ok');
    assert.equal(Number(db.pragma('user_version', { simple: true })), SCHEMA_VERSION,
      `user_version 须＝迁移列表最大版本 ${SCHEMA_VERSION}（落后＝有迁移没跑；超前＝版本号被手改）`);
    const actualTables = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all().map((row) => row.name);
    assert.deepEqual(actualTables, [...CURRENT_TABLES].sort(), '临时库实际表集合与源码抽取、迁移创建/删除声明不符');
  } finally { db.close(); fs.rmSync(dir, { recursive: true, force: true }); }
});

// ── G3 ─────────────────────────────────────────────────────────────────────
test('G3 迁移列表自检：version 严格递增且唯一、每项有 name 与 up 函数', () => {
  assert.deepEqual(validateMigrations(MIGRATIONS), [], 'MIGRATIONS 本身未通过自检');
  const versions = MIGRATIONS.map((m) => m.version);
  assert.deepEqual(versions, [...versions].sort((a, b) => a - b), 'version 未严格递增');
  assert.equal(new Set(versions).size, versions.length, 'version 有重复');
  for (const m of MIGRATIONS) {
    assert.ok(typeof m.name === 'string' && m.name.trim(), `迁移 v${m.version} 缺 name`);
    assert.equal(typeof m.up, 'function', `迁移 v${m.version} 缺 up 函数（空迁移＝写了等于没写）`);
  }
});

// ── G4 非空转 ──────────────────────────────────────────────────────────────
test('G4 非空转：抽取有基线 + 校验器在合成反例上必命中（防守卫恒真）', () => {
  // ① 抽取有基线：分别锁住 v1 冻结集与含后续迁移表的当前全量实况。
  assert.equal(LEGACY_TABLES.length, 44, `v1 冻结表清单规模变化：${LEGACY_TABLES.length} ≠ 44`);
  assert.equal(AD_HOC.size, AD_HOC_BASELINE,
    `db.js 自建表抽取数 ${AD_HOC.size} ≠ 当前冻结基线 ${AD_HOC_BASELINE}`);
  assert.equal(CURRENT_TABLES.size, CURRENT_TABLE_BASELINE,
    `迁移后的当前表数 ${CURRENT_TABLES.size} ≠ 当前基线 ${CURRENT_TABLE_BASELINE}`);
  assert.equal(RETIRED_TABLES.size, 2, `已声明删除表数 ${RETIRED_TABLES.size} ≠ 当前基线 2（weekly_reports / issue_reveals）`);
  assert.deepEqual([...AD_HOC].sort(), [...new Set([...LEGACY_TABLES, ...DECLARED])].sort(),
    'db.js 自建表抽取与 v1 冻结基线 ∪ 迁移声明不符（新结构须登记迁移）');

  // ② 合成反例：校验器必须逐类命中
  const dup = validateMigrations([{ version: 1, name: 'a', up() {} }, { version: 1, name: 'b', up() {} }]);
  assert.ok(dup.some((e) => /重复/.test(e)), `校验器漏掉「重复版本号」（实得 ${JSON.stringify(dup)}）`);
  const back = validateMigrations([{ version: 2, name: 'a', up() {} }, { version: 1, name: 'b', up() {} }]);
  assert.ok(back.some((e) => /递增/.test(e)), `校验器漏掉「非严格递增」（实得 ${JSON.stringify(back)}）`);
  assert.ok(validateMigrations([{ version: 1, name: '', up() {} }]).some((e) => /缺 name/.test(e)), '校验器漏掉「缺 name」');
  assert.ok(validateMigrations([{ version: 1, name: 'a' }]).some((e) => /缺 up/.test(e)), '校验器漏掉「缺 up 函数」');
  assert.ok(validateMigrations([]).length > 0, '校验器漏掉「空列表」');
  assert.ok(validateMigrations([{ version: 0, name: 'a', up() {} }]).some((e) => /非法/.test(e)), '校验器漏掉「version 非法」');

  // ③ 规模基线
  assert.ok(MIGRATIONS.length >= 1, '迁移列表为空（基线 ≥1）');
  assert.ok(SCHEMA_VERSION >= 1, `SCHEMA_VERSION=${SCHEMA_VERSION}（基线 ≥1）`);
});

// ── G5 纪律：新增结构须写 migration ─────────────────────────────────────────
test('G5 纪律：db.js 自建表必须被「v1 冻结基线 ∪ 迁移声明」覆盖（新增结构没写 migration ⇒ 红）', () => {
  const offenders = [...AD_HOC].filter((t) => !COVERED.has(t)).sort();
  assert.deepEqual(offenders, [],
    `以下表由 db.js 自建却未被任何 migration 覆盖——**新增/变更结构必须写 migration**（并在其 tables 字段里登记表名）：\n  ${offenders.join('\n  ')}`);
  // v1 基线冻结：不得被悄悄加表（新增一律走 v2+，勿改基线）
  assert.deepEqual([...MIGRATIONS[0].tables].sort(), [...LEGACY_TABLES].sort(),
    'v1 基线表清单被改动——新增结构请追加 v2+ 迁移，勿改冻结基线（否则 G5 可被「往基线里塞表」绕过）');
});

// ── G7：schema v13 党委内容与公开发布 ───────────────────────────────────────
test('G7 schema v13：生成列（VIRTUAL / 缺省 branch）＋ 部分唯一索引 ＋ publication_audits 空表', () => {
  assert.ok(SCHEMA_VERSION >= 13, `SCHEMA_VERSION=${SCHEMA_VERSION}（v13 起）`);
  const v13 = MIGRATIONS.find((m) => m.version === 13);
  assert.ok(v13, '迁移 v13 不存在');
  assert.equal(v13.name, 'committee-content-and-publication');
  for (const table of ['activities', 'notices', 'branch_docs', 'publication_audits']) {
    assert.ok(v13.tables.includes(table), `v13.tables 未登记 ${table}`);
  }

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gsm-guard-v13-'));
  const db = initDb(path.join(dir, 'data.db'));
  try {
    const column = (table, name) => db.prepare(`PRAGMA table_xinfo(${table})`).all().find((c) => c.name === name);
    const generatedColumns = [
      ['activities', 'owner_scope'], ['activities', 'source_activity_id'], ['activities', 'publish_scope'],
      ['notices', 'publish_scope'], ['branch_docs', 'owner_scope'], ['branch_docs', 'publish_scope'],
    ];
    for (const [table, name] of generatedColumns) {
      const info = column(table, name);
      assert.ok(info, `v13 缺生成列 ${table}.${name}`);
      assert.notEqual(info.hidden, 0, `${table}.${name} 必须是 GENERATED/VIRTUAL（只读，不参与写入）`);
    }

    // 读侧缺省 branch；显式值原样透出
    const insertActivity = (row) => db.prepare('INSERT INTO activities (id, data) VALUES (?, ?)').run(row.id, JSON.stringify(row));
    insertActivity({ id: 'act-v13-local', branchId: 'br-b1', title: '支部自办' });
    insertActivity({ id: 'act-v13-committee', branchId: 'pc-gsm', title: '党委活动', ownerScope: 'committee', publishScope: 'login', sourceActivityId: null });
    const local = db.prepare('SELECT owner_scope, publish_scope, source_activity_id FROM activities WHERE id = ?').get('act-v13-local');
    assert.deepEqual({ ...local }, { owner_scope: 'branch', publish_scope: 'branch', source_activity_id: null });
    const committee = db.prepare('SELECT owner_scope, publish_scope FROM activities WHERE id = ?').get('act-v13-committee');
    assert.deepEqual({ ...committee }, { owner_scope: 'committee', publish_scope: 'login' });

    const indexes = new Set(db.prepare("SELECT name FROM sqlite_master WHERE type = 'index'").all().map((row) => row.name));
    for (const name of [
      'idx_activities_source_branch', 'idx_activities_owner_scope_publish',
      'idx_notices_publish_scope', 'idx_branch_docs_publish_scope',
    ]) assert.ok(indexes.has(name), `v13 缺索引 ${name}`);
    const uniquePartial = db.prepare("SELECT sql FROM sqlite_master WHERE type = 'index' AND name = ?").get('idx_activities_source_branch');
    assert.match(String(uniquePartial?.sql || ''), /UNIQUE INDEX/i, 'idx_activities_source_branch 必须是 UNIQUE 索引');
    assert.match(String(uniquePartial?.sql || ''), /WHERE/i, 'idx_activities_source_branch 必须是部分索引（WHERE source_activity_id IS NOT NULL）');

    // 同一支部对同一条党委活动最多一条副本；本支部自办活动（无 sourceActivityId）不受限
    insertActivity({ id: 'act-copy-1', branchId: 'br-b1', title: '副本一', sourceActivityId: 'act-v13-committee' });
    assert.throws(
      () => insertActivity({ id: 'act-copy-2', branchId: 'br-b1', title: '副本二', sourceActivityId: 'act-v13-committee' }),
      /UNIQUE constraint failed/,
      '同一支部第二条副本未被数据库拒绝',
    );
    insertActivity({ id: 'act-own-1', branchId: 'br-b1', title: '自办一' });
    insertActivity({ id: 'act-own-2', branchId: 'br-b1', title: '自办二' });

    // 留痕表存在且为空
    const tables = new Set(db.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all().map((row) => row.name));
    assert.ok(tables.has('publication_audits'), 'v13 缺 publication_audits 表');
    assert.equal(db.prepare('SELECT COUNT(1) AS c FROM publication_audits').get().c, 0, 'publication_audits 不得有演示种子');
  } finally {
    db.close();
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

// ── G6 纪律：ALTER TABLE 必须落在 migration 段内 ────────────────────────────
test('G6 纪律：全 server/ 源码里的 ALTER TABLE 只许出现在 migration 段内', () => {
  const files = [];
  (function walk(dir) {
    for (const n of fs.readdirSync(dir)) {
      if (n === 'node_modules' || n === 'test' || n === '.tmp') continue;
      const f = path.join(dir, n);
      if (fs.statSync(f).isDirectory()) walk(f);
      else if (/\.(js|mjs)$/.test(n)) files.push(f);
    }
  })(path.join(ROOT, 'server'));
  assert.ok(files.length >= 10, `只收集到 ${files.length} 个 server 源文件（基线 10）：扫描范围异常，断言可能恒真`);

  const migOffset = SRC.indexOf('export const MIGRATIONS');
  const offenders = [];
  for (const f of files) {
    const text = fs.readFileSync(f, 'utf8');
    let off = -1;
    while ((off = text.indexOf('ALTER TABLE', off + 1)) >= 0) {
      const line = text.slice(0, off).split(/\r?\n/).length;
      const insideMigration = f === DB_JS && migOffset >= 0 && off > migOffset;
      if (!insideMigration) offenders.push(`${path.relative(ROOT, f).replace(/\\/g, '/')}:${line}`);
    }
  }
  assert.deepEqual(offenders, [],
    `ALTER TABLE 出现在 migration 段之外（结构变更必须走 migration；现行 0 处＝此防线待首个 ALTER 才有实证）：\n  ${offenders.join('\n  ')}`);
});
