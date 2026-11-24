import { test } from 'node:test';
import assert from 'node:assert/strict';
import Database from 'better-sqlite3';
import { applyMigrations, SCHEMA_VERSION } from '../db.js';

test('schema v4 migrates legacy weekly report rows into the generic periodic archive table without changing history', () => {
  const db = new Database(':memory:');
  try {
    db.exec('CREATE TABLE weekly_reports (id TEXT PRIMARY KEY, data TEXT NOT NULL)');
    db.exec('CREATE TABLE users (id TEXT PRIMARY KEY, data TEXT NOT NULL)');
    // v18（批次 566）在迁移链里读 `signups` 建 JSON 唯一索引；最小夹具必须建这张表，
    // 否则 applyMigrations 走到 v18 会报 `no such table: signups`（批次 612 修正）。
    db.exec('CREATE TABLE signups (id TEXT PRIMARY KEY, data TEXT NOT NULL)');
    // v18 的 bumpCollectionVersion 也会被迁移链调用；最小夹具补版本表（legacy 形态：name/version）。
    db.exec('CREATE TABLE collection_versions (name TEXT PRIMARY KEY, version INTEGER NOT NULL)');
    // v7（人员主键迁移）读取旧形态 sessions(token, person_id) 与 attachments(id, uploaded_by)；
    // v19 再给两表补 branch_id。最小夹具按旧形态建表（批次 612 修正）。
    db.exec('CREATE TABLE sessions (token TEXT PRIMARY KEY, person_id TEXT)');
    db.exec('CREATE TABLE attachments (id TEXT PRIMARY KEY, uploaded_by TEXT)');
    const legacy = {
      id: 'wr-legacy-1', branchId: 'br-b1', status: 'submitted', submittedAt: '2026-10-01',
      week: 'legacy label', weekRange: '2026-09-24 ~ 2026-09-30', content: '历史内容',
      archivePolicySnapshot: { id: 'branch-periodic-archive', version: 3, unit: 'week', periodKey: '2026-W39' },
    };
    db.prepare('INSERT INTO weekly_reports (id, data) VALUES (?, ?)').run(legacy.id, JSON.stringify(legacy));
    db.pragma('user_version = 3');

    let result;
    try {
      result = applyMigrations(db);
    } catch (e) {
      console.error('[periodic-archive-migration] applyMigrations 失败：', e.message, e.stack);
      throw e;
    }

    assert.equal(result.to, SCHEMA_VERSION);
    const migrated = JSON.parse(db.prepare('SELECT data FROM periodic_archive_submissions WHERE id = ?').get(legacy.id).data);
    assert.equal(migrated.id, legacy.id);
    assert.equal(migrated.branchId, 'br-b1');
    assert.equal(migrated.content, legacy.content);
    assert.deepEqual(migrated.archivePolicySnapshot, legacy.archivePolicySnapshot);
    assert.equal(migrated.week, legacy.week);
    assert.equal(migrated.weekRange, legacy.weekRange);
    assert.equal(db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'weekly_reports'").get(), undefined);
    assert.equal(db.pragma('integrity_check', { simple: true }), 'ok');
  } finally {
    db.close();
  }
});
