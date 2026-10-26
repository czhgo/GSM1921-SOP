// server/test/db-migration.test.mjs — 最小可用迁移机制验收（2026-09-25）
//
// 背景：`server/db.js` 此前**没有版本化迁移**——44 张表（原 45，2026-10-02 批次 342 删 `compliance_references`）全由 `CREATE TABLE IF NOT EXISTS` 建，
//   `PRAGMA user_version` 恒为 0、无 `ALTER TABLE`（头号技术债：改了结构线上库不跟）。
// 本件验收 `db.js` 末尾「最小可用迁移机制」段：
//   M1 **全新库**：`initDb` 自动应用 → `user_version` = `SCHEMA_VERSION`，并打印一条启动日志
//        `[db] schema vN（本次应用 M 项）`（**启动日志打印已应用版本**）。
//   M2 **幂等 / 可重入**：同一库再跑一次 ⇒ 应用 0 项、`user_version` 不动、表 / 行数不动。
//   M3 **既有库兼容**：已有数据、`user_version=0` 的库 → 升到最新，**数据逐值一行未变**（v1 纯幂等标记）。
//   M4 **失败回滚**：事务内某项 `up()` 抛 ⇒ 整体回滚（`user_version` 与已建的 DDL 一并撤回）。
//   M5 **失败不吞**：`up()` 抛 / 列表自检不过（重复版本号）⇒ `applyMigrations` **抛出**（不静默吞）。
//   M6 **非空转**：迁移列表规模基线（防守卫恒真）。
// 运行：`node --test server/test/db-migration.test.mjs`（纯 node，无浏览器 / 无服务依赖）
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import Database from 'better-sqlite3';
import { initDb, applyMigrations, SCHEMA_VERSION, MIGRATIONS } from '../db.js';

/** 捕获一次同步调用内的 console.log（用于断言「启动日志打印已应用版本」） */
function captureLogs(fn) {
  const logs = [];
  const orig = console.log;
  console.log = (...a) => { logs.push(a.map(String).join(' ')); };
  try { fn(); } finally { console.log = orig; }
  return logs;
}

function tempDbPath(tag) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `gsm-mig-${tag}-`));
  return path.join(dir, 'data.db');
}

function countRows(db) {
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map((r) => r.name);
  let n = 0;
  for (const t of tables) n += db.prepare(`SELECT COUNT(*) c FROM ${t}`).get().c;
  return { tables: tables.length, rows: n };
}

test('M1 全新库：initDb 自动应用迁移 ⇒ user_version=SCHEMA_VERSION，且打印启动日志', () => {
  const p = tempDbPath('fresh');
  const logs = captureLogs(() => {
    const db = initDb(p);
    try {
      assert.equal(Number(db.pragma('user_version', { simple: true })), SCHEMA_VERSION,
        `user_version 应升到 ${SCHEMA_VERSION}`);
    } finally { db.close(); }
  });
  const line = logs.find((l) => l.startsWith('[db] schema v'));
  assert.ok(line, `未打印启动日志（实得：${JSON.stringify(logs)}）`);
  const m = /^\[db\] schema v(\d+)（本次应用 (\d+) 项）$/.exec(line);
  assert.ok(m, `启动日志格式不符：[db] schema vN（本次应用 M 项）——实得「${line}」`);
  assert.equal(Number(m[1]), SCHEMA_VERSION, '启动日志的版本号须＝SCHEMA_VERSION');
  assert.equal(Number(m[2]), MIGRATIONS.length, '全新库应把全部迁移一次性应用');
});

test('M2 幂等 / 可重入：同一库再跑（initDb + applyMigrations）⇒ 应用 0 项、版本与数据不动', () => {
  const p = tempDbPath('idem');
  const db1 = initDb(p);
  db1.prepare('INSERT INTO users (id, data) VALUES (?, ?)').run('u1', JSON.stringify({ id: 'u1', role: 'member' }));
  const snap1 = countRows(db1);
  const v1 = Number(db1.pragma('user_version', { simple: true }));
  db1.close();

  // 二次 initDb：不得再打印迁移日志
  const logs = captureLogs(() => { const db = initDb(p); db.close(); });
  assert.equal(logs.filter((l) => l.startsWith('[db] schema v')).length, 0, '已迁移的库再次启动不应再打印「本次应用」日志');

  // 直接再调一次：可重入 ⇒ applied 为空
  const db2 = initDb(p);
  try {
    const r = applyMigrations(db2);
    assert.deepEqual(r.applied, [], '已是最新版本 ⇒ 无待应用项');
    assert.equal(r.from, r.to, 'from / to 应相同（无变化）');
    assert.equal(Number(db2.pragma('user_version', { simple: true })), v1, 'user_version 不得漂移');
    assert.deepEqual(countRows(db2), snap1, '重复启动不得增减表 / 行');
  } finally { db2.close(); }
});

test('M3 既有库兼容：user_version=0 + 有数据 ⇒ 升到最新且数据逐值一行未变', () => {
  const p = tempDbPath('legacy');
  // 造一个「迁移前」的库：建表并灌数据，user_version 保持 0（模拟既有真库）
  const raw = new Database(p);
  raw.pragma('journal_mode = WAL');
  raw.exec('CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, data TEXT NOT NULL)');
  const rows = [
    { id: 'p-a', role: 'secretary', name: '甲' },
    { id: 'p-b', role: 'member', name: '乙', nested: { deep: [1, 2, 3] } },
    { id: 'p-c', role: 'organizer', name: '丙' },
  ];
  for (const r of rows) raw.prepare('INSERT INTO users (id, data) VALUES (?, ?)').run(r.id, JSON.stringify(r));
  assert.equal(Number(raw.pragma('user_version', { simple: true })), 0, '前置：既有库 user_version=0');
  raw.close();

  const db = initDb(p);
  try {
    assert.equal(Number(db.pragma('user_version', { simple: true })), SCHEMA_VERSION, '既有库应被登记为最新版本');
    const got = db.prepare('SELECT id, data FROM users ORDER BY id').all().map((r) => JSON.parse(r.data));
    assert.deepEqual(got, rows, 'v1 基线迁移不得改动任何既有数据（逐值一致）');
  } finally { db.close(); }
});

test('M4 失败回滚：事务内 up() 抛 ⇒ user_version 与已建 DDL 一并回滚', () => {
  const db = new Database(':memory:');
  try {
    const list = [
      { version: 1, name: 'create-t', tables: ['t_roll'], up(d) { d.exec('CREATE TABLE t_roll (x TEXT)'); } },
      { version: 2, name: 'boom', up() { throw new Error('boom-回滚用例'); } },
    ];
    assert.throws(() => applyMigrations(db, list), /boom-回滚用例/, 'up() 抛出的异常须向调用方冒泡（不吞）');
    assert.equal(Number(db.pragma('user_version', { simple: true })), 0, '失败后 user_version 必须仍为 0（未提交）');
    const has = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='t_roll'").get();
    assert.equal(has, undefined, '同一事务内 v1 建的表须随失败一并回滚');
  } finally { db.close(); }
});

test('M5 失败不吞：列表自检不过（重复版本号）⇒ applyMigrations 抛出', () => {
  const db = new Database(':memory:');
  try {
    const dup = [
      { version: 1, name: 'a', up() {} },
      { version: 1, name: 'b', up() {} },
    ];
    assert.throws(() => applyMigrations(db, dup), /重复/, '重复版本号须被拒（而不是静默按其一执行）');
    assert.equal(Number(db.pragma('user_version', { simple: true })), 0, '被拒后 user_version 不得变化');
  } finally { db.close(); }
});

test('M7 v8/v10 活动组织落点：两档归一 / legacy 标记 / 补跨组招募；重复执行幂等', () => {
  const db = initDb(tempDbPath('v8'));
  try {
    // 回到 v7 再灌「升级前」数据（initDb 已建全表；v8–v10 是纯数据迁移）
    db.pragma('user_version = 7');
    const put = (id, row) => db.prepare('INSERT INTO activities (id, data) VALUES (?, ?)').run(id, JSON.stringify(row));
    put('act-v8-legacy', { id: 'act-v8-legacy', type: '主题党日', organizingScope: 'cross-group', hostGroupId: null });
    put('act-v8-branch', { id: 'act-v8-branch', type: '支委会' });
    put('act-v8-branch-wrong', { id: 'act-v8-branch-wrong', type: '党课', organizingScope: 'cross-group', hostGroupId: 'pg-1', hostGroup: '第一党小组' });
    put('act-v8-scope', { id: 'act-v8-scope', type: '主题党日', hostGroupId: 'pg-1' });
    put('act-v8-plain', { id: 'act-v8-plain', type: '主题党日' });
    put('act-v10-cross', {
      id: 'act-v10-cross', type: '主题党日', organizingScope: 'cross-group',
      hostGroupId: 'pg-1', hostGroup: '第一党小组', workgroupId: 'wg-activity-act-v10-cross',
      assignments: [{ personId: '2400012355', role: 'organizer' }],
    });
    db.prepare('INSERT INTO party_groups (id, data) VALUES (?, ?)').run('pg-1', JSON.stringify({ id: 'pg-1', branchId: 'br-b1', name: '第一党小组', status: 'active' }));
    db.prepare('INSERT INTO users (id, data) VALUES (?, ?)').run('2400012355', JSON.stringify({ id: '2400012355', name: '组织委员', role: 'org-commissioner', branchId: 'br-b1', partyGroup: '第三党小组' }));
    db.prepare('INSERT INTO users (id, data) VALUES (?, ?)').run('2400012349', JSON.stringify({ id: '2400012349', name: '第二组深参', role: 'participant', branchId: 'br-b1', partyGroup: '第二党小组' }));
    db.prepare('INSERT INTO workgroups (id, data) VALUES (?, ?)').run('wg-activity-act-v10-cross', JSON.stringify({
      id: 'wg-activity-act-v10-cross', branchId: 'br-b1', kind: 'activity', sourceType: 'activity', sourceId: 'act-v10-cross',
      name: 'v10 跨组活动', status: 'active', organizingScope: 'cross-group', hostGroupId: 'pg-1', recruitmentScope: 'group',
    }));
    db.prepare('INSERT INTO workgroup_members (id, data) VALUES (?, ?)').run('wgm-v10-deep', JSON.stringify({
      id: 'wgm-v10-deep', branchId: 'br-b1', workgroupId: 'wg-activity-act-v10-cross', personId: '2400012349', role: 'deep', status: 'active',
    }));

    const applied = applyMigrations(db);
    assert.deepEqual(applied.applied, [8, 9, 10, 11, 12], '应从 v7 补跑 v8 + v9 + v10 + v11 + v12');
    const row = (id) => JSON.parse(db.prepare('SELECT data FROM activities WHERE id = ?').get(id).data);
    assert.equal(row('act-v8-legacy').organizingScope, 'party-group', '旧 cross-group 归一为 party-group');
    assert.equal(row('act-v8-legacy').legacyHostGroup, true, '无承办组 ⇒ legacy 标记，不猜测');
    assert.equal(row('act-v8-branch').organizingScope, 'branch', '支部级会议重分类');
    assert.equal(row('act-v8-branch-wrong').organizingScope, 'branch');
    assert.equal(row('act-v8-branch-wrong').hostGroupId, null, '支部级会议不保留承办组');
    assert.equal(row('act-v8-scope').organizingScope, 'party-group', '有 hostGroupId 的旧行补承办范围');
    assert.equal(row('act-v8-plain').legacyHostGroup, true, '无承办范围的旧行标待补承办组');
    assert.equal(row('act-v8-plain').organizingScope, 'party-group');
    assert.equal(row('act-v10-cross').organizingScope, 'party-group');
    assert.equal(row('act-v10-cross').hostGroupId, 'pg-1', '归一保留承办组');
    assert.equal(row('act-v10-cross').recruitmentScope, 'cross-group', '成员含跨党小组深参 ⇒ 补招募标记');
    assert.equal(row('act-v10-cross').crossGroupCoordinatorId, '2400012355', '协调人取本支部组织委员');
    const workgroup = JSON.parse(db.prepare('SELECT data FROM workgroups WHERE id = ?').get('wg-activity-act-v10-cross').data);
    assert.equal(workgroup.organizingScope, 'party-group', '工作组镜像同步两档落点');
    assert.equal(workgroup.recruitmentScope, 'cross-group');
    assert.equal(workgroup.crossGroupCoordinatorId, '2400012355');

    const ids = ['act-v8-legacy', 'act-v8-branch', 'act-v8-branch-wrong', 'act-v8-scope', 'act-v8-plain', 'act-v10-cross'];
    const before = ids.map((id) => JSON.stringify(row(id)));
    const workgroupBefore = db.prepare('SELECT data FROM workgroups WHERE id = ?').get('wg-activity-act-v10-cross').data;
    const again = applyMigrations(db);
    assert.deepEqual(again.applied, [], '重复执行不得再改写');
    const after = ids.map((id) => JSON.stringify(row(id)));
    assert.deepEqual(after, before, '重复迁移零改写');
    assert.equal(db.prepare('SELECT data FROM workgroups WHERE id = ?').get('wg-activity-act-v10-cross').data, workgroupBefore,
      '工作组镜像重复迁移零改写（v10 幂等）');
  } finally { db.close(); }
});

test('M6 非空转：迁移列表规模基线（防列表被清空导致守卫恒真）', () => {
  assert.ok(MIGRATIONS.length >= 1, `迁移列表为空（基线 ≥1）`);
  assert.ok(SCHEMA_VERSION >= 1, `SCHEMA_VERSION=${SCHEMA_VERSION}（基线 ≥1）`);
  assert.equal(SCHEMA_VERSION, Math.max(...MIGRATIONS.map((m) => m.version)), 'SCHEMA_VERSION 须＝列表最大版本');
  assert.ok(MIGRATIONS[0].tables && MIGRATIONS[0].tables.length >= 44,
    `v1 基线应登记 ≥44 张现状表（实得 ${MIGRATIONS[0].tables ? MIGRATIONS[0].tables.length : 0}）`);
});
