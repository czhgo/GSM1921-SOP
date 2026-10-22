// server/test/seed-drift.test.mjs — 种子行漂移与安全修复（B-499-8 Task 4）
// ════════════════════════════════════════════════════════════════
// 验收：
//   D1 纯函数：旧行 → 检出 stale / orphan / missing；plan 只改 seedOwnedFields；
//   D2 二次 plan 零改写；用户行 / 运行时字段 / orphan 原样；
//   D3 不插入缺失种子、不删除 orphan（行数不变）；
//   D4 服务端 v9 seed_meta + 启动修复：只更新既有 seed id，版本写回；二次启动零写。
// 运行：node --test test/seed-drift.test.mjs（server 目录）
// ════════════════════════════════════════════════════════════════
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { initDb, SCHEMA_VERSION } from '../db.js';
import { detectSeedDrift, planSeedRepair } from '../../docs/src/data/seed-drift.js?v=20261022c';
import { loadSeedRowsForTable } from '../seed-rows.js';
import { repairSeedRowsIfNeeded, readSeedMeta } from '../seed-repair.js';

const ENTRY = {
  collection: 'widgets',
  table: 'widgets',
  idPattern: '^w-\\d+$',
  seedOwnedFields: ['id', 'title', 'date'],
  runtimeFields: ['status'],
};

test('D1 漂移三分类：stale 只比 seedOwnedFields；orphan / missing 只报告', () => {
  const rows = [
    { id: 'w-1', title: '旧标题', date: '2026-01-01', status: 'done', extra: '保留' },
    { id: 'w-2', title: '标题二', date: '2026-01-02', status: 'pending' },
    { id: 'w-99', title: '已下线种子', date: '2025-01-01', status: 'done' },
    { id: 'user_1', title: '用户自建', date: '2026-01-03' },
  ];
  const seedRows = [
    { id: 'w-1', title: '新标题', date: '2026-01-01' },
    { id: 'w-2', title: '标题二', date: '2026-01-02' },
    { id: 'w-3', title: '缺失种子', date: '2026-01-03' },
  ];
  const drift = detectSeedDrift({ rows, seedRows, entry: ENTRY });
  assert.deepEqual(drift.stale.map((item) => item.id), ['w-1'], '只应检出 seedOwnedFields 不一致的既有种子行');
  assert.deepEqual(drift.stale[0].fields.map((item) => item.field), ['title'], 'status/extra 属运行时/未登记字段，不计漂移');
  assert.deepEqual(drift.orphan, ['w-99'], '种子 id 形态但当前种子集无此 id ⇒ orphan');
  assert.deepEqual(drift.missing, ['w-3'], '种子集有、行没有 ⇒ missing');
});

test('D2/D3 修复：只更新既有 seed id 的种子字段，保留运行时字段/用户行/orphan；不插不删；二次零改写', () => {
  const rows = [
    { id: 'w-1', title: '旧标题', date: '2026-01-01', status: 'done', extra: '保留' },
    { id: 'w-2', title: '标题二', date: '2026-01-02', status: 'pending' },
    { id: 'w-99', title: '已下线种子', date: '2025-01-01', status: 'done' },
    { id: 'user_1', title: '用户自建', date: '2026-01-03' },
  ];
  const seedRows = [
    { id: 'w-1', title: '新标题', date: '2026-01-01' },
    { id: 'w-2', title: '标题二', date: '2026-01-02' },
    { id: 'w-3', title: '缺失种子', date: '2026-01-03' },
  ];
  const before = JSON.stringify(rows);
  const plan = planSeedRepair({ rows, seedRows, entry: ENTRY });
  assert.equal(plan.updated, 1, '只有 w-1 需要更新');
  assert.equal(plan.rows.length, rows.length, '不插入缺失种子、不删除 orphan');
  const byId = new Map(plan.rows.map((row) => [row.id, row]));
  assert.equal(byId.get('w-1').title, '新标题', '种子字段更新');
  assert.equal(byId.get('w-1').status, 'done', '运行时字段保留');
  assert.equal(byId.get('w-1').extra, '保留', '未登记字段保留');
  assert.deepEqual(byId.get('w-99'), rows[2], 'orphan 原样保留');
  assert.deepEqual(byId.get('user_1'), rows[3], '用户自建行原样保留');
  assert.equal(JSON.stringify(rows), before, 'planSeedRepair 不修改入参');

  const again = planSeedRepair({ rows: plan.rows, seedRows, entry: ENTRY });
  assert.equal(again.updated, 0, '二次修复零改写');
  assert.deepEqual(again.rows, plan.rows, '二次修复行内容不变');
  assert.deepEqual(again.missing, ['w-3'], 'missing 始终只报告不补齐');
});

test('D4 服务端 v9 seed_meta + 启动修复：只修既有 seed id、保留运行时字段、不增删；二次启动零写', async () => {
  const db = initDb(':memory:');
  try {
    assert.ok(SCHEMA_VERSION >= 9, '迁移版本应已含 v9');
    assert.equal(Number(db.pragma('user_version', { simple: true })), SCHEMA_VERSION, 'v9 seed_meta 迁移应已应用');
    assert.ok(db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='seed_meta'").get(), 'seed_meta 表必须存在');

    const seedRows = await loadSeedRowsForTable('activities');
    assert.ok(seedRows.length > 0, '活动种子不应为空');
    const seed = seedRows[0];
    const stale = { ...seed, title: '旧标题（漂移）', archived: true, participants: ['2400012345'], extraRuntime: 'keep' };
    db.prepare('INSERT INTO activities (id, data) VALUES (?, ?)').run(seed.id, JSON.stringify(stale));
    // orphan：id 形态像活动种子，但当前种子集已无该 id
    db.prepare('INSERT INTO activities (id, data) VALUES (?, ?)').run('act-999999', JSON.stringify({ id: 'act-999999', title: '已下线种子', archived: true }));
    const beforeCount = db.prepare('SELECT COUNT(*) c FROM activities').get().c;

    const first = await repairSeedRowsIfNeeded(db, 'test-seed-version');
    assert.equal(first.skipped, false, '版本不一致时必须执行修复');
    assert.equal(readSeedMeta(db, 'seed_version'), 'test-seed-version', '修复后写回版本');
    const repaired = JSON.parse(db.prepare('SELECT data FROM activities WHERE id = ?').get(seed.id).data);
    assert.equal(repaired.title, seed.title, 'seedOwned 字段按当前种子修复');
    assert.equal(repaired.archived, true, '运行时字段 archived 保留');
    assert.deepEqual(repaired.participants, ['2400012345'], '运行时字段 participants 保留');
    assert.equal(repaired.extraRuntime, 'keep', '未登记字段保留');
    assert.ok(db.prepare('SELECT 1 FROM activities WHERE id = ?').get('act-999999'), 'orphan 不得删除');
    assert.equal(db.prepare('SELECT COUNT(*) c FROM activities').get().c, beforeCount, '不插入缺失种子、不删除 orphan（行数不变）');
    assert.equal(first.orphan >= 1, true, '报告应计入 orphan');

    // 二次启动：版本一致 ⇒ 完全跳过（零写）
    const snapshot = db.prepare('SELECT id, data FROM activities ORDER BY id').all();
    const second = await repairSeedRowsIfNeeded(db, 'test-seed-version');
    assert.equal(second.skipped, true, '版本一致时应跳过');
    assert.equal(second.reason, 'version-match');
    assert.deepEqual(db.prepare('SELECT id, data FROM activities ORDER BY id').all(), snapshot, '二次启动零改写');
  } finally {
    db.close();
  }
});
