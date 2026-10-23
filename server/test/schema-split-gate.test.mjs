// role: [工程师]+[AI]
// server/test/schema-split-gate.test.mjs — 拆表切换闸门（2026-10-23 · spec refine-ui-system-and-close-r10 Task 10）
//
// 判据：
//   G1 C2「同一行 7 天 409 ≥3」读的是真实埋点：1 条可见、2 条 false、3 条 true；窗口外不计；
//      且 409 响应体/语义不变（真路由打一次 409，同时落一条埋点）。
//   G2 C4 改为「近 7 天每天一条 mismatch=0 的历史」：历史不足 7 天 ⇒ false（输出 n/7）；
//      7 天全 0 ⇒ true；某天 mismatch>0 ⇒ false；重建影子后恢复 0 ⇒ true（判据非恒真）。
//   G3 未 READY 时读路径仍走 JSON：静态断言 `server/routes/**` 不出现「从影子子表读」的查询，
//      且 `evaluateReadiness` 的 verdict 为 NOT_READY。
// 运行：node --test test/schema-split-gate.test.mjs（server 目录）
// 全部用例用 `:memory:` + `initDb`，不碰 `server/data.db`。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { initDb, recordSnapshotConflict, getConflictCounts, recordShadowSnapshot, getShadowHistory, rebuildShadowTables } from '../db.js';
import { evaluateReadiness } from '../scripts/schema-split-readiness.mjs';
import { createApp } from '../app.js';

const ROOT = path.resolve(import.meta.dirname, '..');
const dayAgo = (n) => new Date(Date.now() - n * 86400000);

const put = (db, table, row) => db.prepare(`INSERT OR REPLACE INTO ${table} (id, data) VALUES (?, ?)`)
  .run(row.id, JSON.stringify(row));

test('G1 C2：一条 409 记录可见；2 条 false、3 条 true；7 天窗口外的记录不计', () => {
  const db = initDb(':memory:');
  try {
    // 无埋点表 ⇒ 只读查询不建表、读数为 0
    assert.equal(getConflictCounts(db, 7).maxByRow, 0);
    assert.equal(evaluateReadiness(db).criteria.C2_conflicts, false);

    recordSnapshotConflict(db, { collection: 'notices', rowId: 'n-1' });
    const one = getConflictCounts(db, 7);
    assert.equal(one.byRow.length, 1, '一条记录应可见');
    assert.deepEqual(
      { collection: one.byRow[0].collection, rowId: one.byRow[0].rowId, count: one.byRow[0].count },
      { collection: 'notices', rowId: 'n-1', count: 1 },
    );

    recordSnapshotConflict(db, { collection: 'notices', rowId: 'n-1' });
    assert.equal(getConflictCounts(db, 7).maxByRow, 2);
    assert.equal(evaluateReadiness(db).criteria.C2_conflicts, false, '2 次/7 天不得触发');

    recordSnapshotConflict(db, { collection: 'notices', rowId: 'n-1' });
    assert.equal(getConflictCounts(db, 7).maxByRow, 3);
    assert.equal(evaluateReadiness(db).criteria.C2_conflicts, true, '3 次/7 天必须触发');

    // 窗口外（8 天前）不计；另一个 row 单独聚合
    recordSnapshotConflict(db, { collection: 'notices', rowId: 'n-2', at: dayAgo(8) });
    recordSnapshotConflict(db, { collection: 'todos', rowId: 't-1' });
    const counts = getConflictCounts(db, 7);
    assert.equal(counts.maxByRow, 3, '窗口外记录不得抬高计数');
    assert.ok(!counts.byRow.some((row) => row.rowId === 'n-2'), '8 天前的记录应落在窗口外');
  } finally { db.close(); }
});

test('G2 C4：历史不足 7 天 ⇒ false（n/7）；7 天全 0 ⇒ true；某天 mismatch>0 ⇒ false', () => {
  const db = initDb(':memory:');
  try {
    assert.equal(getShadowHistory(db, 7).dayCount, 0, '新建库无历史');
    const fresh = evaluateReadiness(db);
    assert.equal(fresh.criteria.C4_shadow_stable, false, '历史不足 7 天时 C4 必须为 false');
    assert.equal(fresh.readings.shadowHistoryDays, '0/7');
    assert.equal(fresh.evidence.shadowHistoryDays, '0/7');

    // 补 7 天（每天一条 mismatch=0）
    for (let i = 0; i < 7; i += 1) recordShadowSnapshot(db, dayAgo(i));
    assert.equal(getShadowHistory(db, 7).dayCount, 7);
    const stable = evaluateReadiness(db);
    assert.equal(stable.criteria.C4_shadow_stable, true, '近 7 天每天一条 0 ⇒ C4 应 true');
    assert.equal(stable.readings.shadowHistoryDays, '7/7');
    assert.equal(stable.evidence.lastShadow.mismatch, 0);
    assert.equal(stable.verdict, 'NOT_READY', 'C5 未裁 ⇒ 即便 C4 为真也不得 READY');

    // 主表写了但影子未重建 ⇒ 当日 mismatch>0 ⇒ C4 掉回 false（判据非恒真）
    put(db, 'activities', { id: 'act-gate', title: '闸门活动', branchId: 'br-b1', agenda: [{ id: 'a1', item: '第一项' }] });
    const drift = recordShadowSnapshot(db);
    assert.ok(drift && drift.mismatch > 0, '未重建影子时当日比对必须判出 mismatch');
    assert.equal(drift.agendaMismatch, 1, 'agenda 子表缺失行应单独计数');
    assert.equal(evaluateReadiness(db).criteria.C4_shadow_stable, false, '某天 mismatch>0 ⇒ C4 必须为 false');
    assert.equal(evaluateReadiness(db).readings.shadowHistoryDays, '6/7');

    // 重建影子（重建后自动记当日 0）⇒ 恢复 true
    rebuildShadowTables(db);
    const healed = evaluateReadiness(db);
    assert.equal(healed.criteria.C4_shadow_stable, true);
    assert.equal(healed.evidence.lastShadow.mismatch, 0);
  } finally { db.close(); }
});

test('G3 未 READY 时读路径仍走 JSON：路由层无影子子表读', () => {
  const db = initDb(':memory:');
  try {
    assert.notEqual(evaluateReadiness(db).verdict, 'READY', '本轮不得 READY（C5 未裁）');
    const files = [];
    (function walk(dir) {
      for (const name of fs.readdirSync(dir)) {
        const full = path.join(dir, name);
        if (fs.statSync(full).isDirectory()) walk(full);
        else if (/\.(m?js)$/.test(name)) files.push(full);
      }
    })(path.join(ROOT, 'routes'));
    assert.ok(files.length >= 5, `只收集到 ${files.length} 个路由源文件（基线 5）：扫描范围异常，断言可能恒真`);
    const offenders = [];
    for (const file of files) {
      const text = fs.readFileSync(file, 'utf8');
      if (/FROM\s+(agenda_items|taskforce_contributions)\b/i.test(text)) offenders.push(path.relative(ROOT, file));
    }
    assert.deepEqual(offenders, [], `NOT_READY 期间任何读路径都不得读影子子表（实测：${offenders.join(' / ')}）`);
    // 快照路由仍写 JSON 主表 + 仍只把影子表当「重建目标」
    const snapshot = fs.readFileSync(path.join(ROOT, 'routes', 'resources', 'snapshot-versions.js'), 'utf8');
    assert.ok(snapshot.includes('recordSnapshotConflicts'), '409 埋点应挂在快照版本冲突分支');
  } finally { db.close(); }
});

test('G1b 真路由 409：响应体与状态码不变，同时落一条埋点', async () => {
  const app = createApp({ dbPath: ':memory:' });
  const db = app.locals.db;
  put(db, 'users', { id: 'u-gate-sec', name: '支书', role: 'secretary', branchId: 'br-b1' });
  db.prepare('INSERT INTO sessions (token, person_id, created_at) VALUES (?, ?, ?)')
    .run('t-gate', 'u-gate-sec', new Date().toISOString());
  // 服务端 todos 集合版本＝1；请求基线＝0 ⇒ 必冲突
  db.prepare("INSERT OR REPLACE INTO collection_versions (name, version) VALUES ('todos', 1)").run();
  const server = app.listen(0);
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const resp = await fetch(`${base}/api/v1/snapshot`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer t-gate' },
      body: JSON.stringify({ todos: [], _versions: { todos: 0 } }),
    });
    assert.equal(resp.status, 409, `应仍返回 409（实测 ${resp.status}）`);
    const body = await resp.json();
    assert.equal(body.error, '数据已被他人更新，本次写入未生效（版本冲突，请刷新后重试）', '409 文案不得变化');
    assert.deepEqual(body.conflicts, [{ collection: 'todos', base: 0, current: 1 }], '409 响应体不得变化');
    const counts = getConflictCounts(db, 7);
    assert.equal(counts.total, 1, '返回 409 的冲突必须留下一条埋点');
    assert.equal(counts.byRow[0].collection, 'todos');
    assert.equal(counts.byRow[0].rowId, '*', '集合级冲突以 * 记行');
  } finally {
    server.closeAllConnections?.();
    await new Promise((r) => server.close(r));
    db.close();
  }
});
