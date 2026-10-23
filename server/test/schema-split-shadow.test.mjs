// role: [工程师]+[AI]
// server/test/schema-split-shadow.test.mjs — v11 影子子表（批次 504）
// 判据：
//   S1 建表回填后 JSON 主表 ↔ 子表 mismatch=0；
//   S2 子表被篡改 ⇒ mismatch>0 且能定位（判据非恒真）；
//   S3 快照写穿（replaceCollectionsAtomic）后影子表重建；
//   S4 回滚删影子表但保留 todos.branch_id 数据。
// 运行：node --test test/schema-split-shadow.test.mjs（server 目录）
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  initDb, rebuildShadowTables, compareShadowTables, rollbackV11, replaceCollectionsAtomic,
} from '../db.js';

function tmpDb() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gsm-v11-shadow-'));
  return { dir, db: initDb(path.join(dir, 'data.db')) };
}
const put = (db, table, row) => db.prepare(`INSERT OR REPLACE INTO ${table} (id, data) VALUES (?, ?)`)
  .run(row.id, JSON.stringify(row));

test('S1 回填后影子一致；S2 篡改能判出 mismatch', () => {
  const { dir, db } = tmpDb();
  try {
    put(db, 'activities', {
      id: 'act-shadow', title: '影子活动', branchId: 'br-b1',
      agenda: [{ id: 'a1', item: '第一项' }, { id: 'a2', item: '第二项', result: '通过' }],
    });
    put(db, 'taskforces', {
      id: 'tf-shadow', name: '影子专班', branchId: 'br-b1', workgroupId: 'wg-taskforce-tf-shadow',
      members: [
        { personId: 'u1', contributions: [{ id: 'c1', desc: '贡献一' }] },
        { personId: 'u2', contributions: [{ id: 'c2', desc: '贡献二' }, { id: 'c3', desc: '贡献三' }] },
      ],
    });
    const built = rebuildShadowTables(db);
    assert.equal(built.agenda, 2);
    assert.equal(built.contributions, 3);
    assert.equal(compareShadowTables(db).mismatch, 0, '回填后应完全一致');

    // 篡改一条子表行 ⇒ 必须报出（防守卫恒真）
    db.prepare('UPDATE agenda_items SET data = ? WHERE id = ?').run('{"tampered":true}', 'act-shadow:0:a1');
    const bad = compareShadowTables(db);
    assert.ok(bad.mismatch > 0, '篡改后必须判出 mismatch');
    assert.ok(bad.details.some((d) => d.label === 'agenda'), '明细应定位到 agenda');
  } finally { db.close(); fs.rmSync(dir, { recursive: true, force: true }); }
});

test('S3 快照写穿后影子表随主表重建', () => {
  const { dir, db } = tmpDb();
  try {
    put(db, 'activities', { id: 'act-before', title: '旧', branchId: 'br-b1', agenda: [{ id: 'old' }] });
    rebuildShadowTables(db);
    replaceCollectionsAtomic(db, [{
      name: 'activities', table: 'activities',
      rows: [{ id: 'act-after', title: '新', branchId: 'br-b1', agenda: [{ id: 'new1' }, { id: 'new2' }] }],
    }]);
    assert.equal(compareShadowTables(db).mismatch, 0, '快照后影子应与新主表一致');
    const rows = db.prepare('SELECT id FROM agenda_items ORDER BY id').all().map((r) => r.id);
    assert.deepEqual(rows, ['act-after:0:new1', 'act-after:1:new2']);
  } finally { db.close(); fs.rmSync(dir, { recursive: true, force: true }); }
});

test('S4 回滚删影子表、保留 todos.branch_id 数据', () => {
  const { dir, db } = tmpDb();
  try {
    put(db, 'todos', { id: 'td-keep', title: '保留', branchId: 'br-b1' });
    db.prepare('UPDATE todos SET branch_id = ? WHERE id = ?').run('br-b1', 'td-keep');
    rollbackV11(db);
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name IN ('agenda_items','taskforce_contributions')").all();
    assert.equal(tables.length, 0);
    const kept = db.prepare('SELECT branch_id FROM todos WHERE id = ?').get('td-keep');
    assert.equal(kept.branch_id, 'br-b1', '回滚不得丢 todos 归属数据');
  } finally { db.close(); fs.rmSync(dir, { recursive: true, force: true }); }
});
