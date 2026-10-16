import { test } from 'node:test';
import assert from 'node:assert/strict';
import Database from 'better-sqlite3';
import { applyMigrations, SCHEMA_VERSION } from '../db.js';

test('schema v4 migrates legacy weekly report rows into the generic periodic archive table without changing history', () => {
  const db = new Database(':memory:');
  try {
    db.exec('CREATE TABLE weekly_reports (id TEXT PRIMARY KEY, data TEXT NOT NULL)');
    db.exec('CREATE TABLE users (id TEXT PRIMARY KEY, data TEXT NOT NULL)');
    const legacy = {
      id: 'wr-legacy-1', branchId: 'br-b1', status: 'submitted', submittedAt: '2026-10-01',
      week: 'legacy label', weekRange: '2026-09-24 ~ 2026-09-30', content: '历史内容',
      archivePolicySnapshot: { id: 'branch-periodic-archive', version: 3, unit: 'week', periodKey: '2026-W39' },
    };
    db.prepare('INSERT INTO weekly_reports (id, data) VALUES (?, ?)').run(legacy.id, JSON.stringify(legacy));
    db.pragma('user_version = 3');

    const result = applyMigrations(db);

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
