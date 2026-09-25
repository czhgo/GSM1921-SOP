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
 * v1 冻结基线：迁移机制落地（2026-09-25）时 db.js 自建的**全部**表（45 张）。
 * ⚠ 只增不改版本——**新增表一律走 `v2+` 迁移**（并在其 `tables` 里登记），**不得**改写这份基线。
 */
const LEGACY_TABLES = [
  // 35 张资源表（RESOURCE_TABLES）
  'users', 'activities', 'tasks', 'attendances', 'inspections',
  'taskforces', 'notices', 'todos', 'assignments', 'makeup_tasks',
  'experience_deposits', 'compliance_references', 'file_space_records', 'image_records',
  'signups', 'activity_reviews', 'taskforce_reviews', 'prop_tasks', 'weekly_reports',
  'archive_records', 'external_dispatches',
  'act_sub_records', 'tf_sub_records',
  'branch_docs', 'member_change_requests', 'committee_broadcasts',
  'agenda_votes', 'branches', 'appointment_records', 'review_requests',
  'issues', 'thought_reports', 'party_groups', 'member_flows', 'issue_reveals',
  // 7 张语义表（SEMANTIC_TABLES）
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
]);

/** 各迁移声明的表名（`tables` 字段） */
const DECLARED = new Set();
for (const m of MIGRATIONS) for (const t of (m.tables || [])) DECLARED.add(t);
/** 被迁移机制覆盖的表＝冻结基线 ∪ 迁移声明 */
const COVERED = new Set([...LEGACY_TABLES, ...DECLARED]);

// ── G1 / G2 ────────────────────────────────────────────────────────────────
test('G1/G2 完整性 + 版本对齐：临时库 integrity_check=ok，且 user_version=SCHEMA_VERSION', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gsm-guard-'));
  const p = path.join(dir, 'data.db');
  const db = initDb(p);
  try {
    assert.equal(db.pragma('integrity_check', { simple: true }), 'ok', 'integrity_check 必须 ok');
    assert.equal(Number(db.pragma('user_version', { simple: true })), SCHEMA_VERSION,
      `user_version 须＝迁移列表最大版本 ${SCHEMA_VERSION}（落后＝有迁移没跑；超前＝版本号被手改）`);
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
  // ① 抽取有基线：db.js 自建表抽取结果须＝冻结基线（口径被改坏时立刻暴露，G5 才不会恒真）
  assert.equal(AD_HOC.size, LEGACY_TABLES.length,
    `db.js 自建表抽取数 ${AD_HOC.size} ≠ 冻结基线 ${LEGACY_TABLES.length}`);
  assert.deepEqual([...AD_HOC].sort(), [...LEGACY_TABLES].sort(),
    'db.js 自建表集合与冻结基线不符（新增/删除表须同步此清单 **并** 写 migration）');

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
