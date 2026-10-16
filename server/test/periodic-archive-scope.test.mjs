import { test } from 'node:test';
import assert from 'node:assert/strict';
import Database from 'better-sqlite3';
import { snapshotScopeDeny } from '../routes/resources/workgroup-routes.js';

test('周期归档快照只接受本支部记录，且允许服务端保留其他支部行', () => {
  const db = new Database(':memory:');
  try {
    db.exec('CREATE TABLE periodic_archive_submissions (id TEXT PRIMARY KEY, data TEXT NOT NULL)');
    db.prepare('INSERT INTO periodic_archive_submissions (id, data) VALUES (?, ?)')
      .run('pa-branch-b', JSON.stringify({ id: 'pa-branch-b', branchId: 'br-b2', content: '其他支部' }));
    const actor = { id: 'p1', role: 'prop-commissioner', branchId: 'br-b1' };

    const ownRows = [{ id: 'pa-branch-a', branchId: 'br-b1', content: '本支部' }];
    assert.equal(snapshotScopeDeny(db, { periodicArchives: ownRows }, actor), null,
      '本支部快照可写，替换层应把未提交的其他支部记录保留下来');
    assert.match(snapshotScopeDeny(db, { periodicArchives: [{ id: 'forged', branchId: 'br-b2' }] }, actor), /支部/,
      '不得通过快照写入其他支部记录');
    assert.match(snapshotScopeDeny(db, { periodicArchives: [{ id: 'pa-branch-b', branchId: 'br-b1', content: '越界改写' }] }, actor), /支部/,
      '不得冒用本支部归属修改另一支部的既有记录');
    assert.match(snapshotScopeDeny(db, { periodicArchives: [{ id: 'missing-branch' }] }, actor), /支部归属/,
      '新写入必须明确支部归属');
  } finally {
    db.close();
  }
});
