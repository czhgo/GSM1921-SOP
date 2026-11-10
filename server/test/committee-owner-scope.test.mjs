// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  committee-owner-scope.test.mjs — 批次 534 Task 5（党委内容并入登录态支部读口）
//  覆盖：
//   · activities：支部账号并集（本支部 + 面向本支部 / 全部的党委行）；已有副本时隐藏党委原件；
//     党委未选支部只出党委行；党委选中支部出并集并标 `sourceScope` / `committeeAdopted`。
//   · notices / branchDocs：登录态并集只收 login / **未过期** public 的党委行；目标支部口径生效。
//   · 其他资源（users / tasks）维持支部隔离，不因本改动放宽。
//   · 写门：支部账号写党委行被拒、党委组织员放行；党委新建党委行归 `pc-gsm`。
//   · 快照：支部快照不得改写 / 删除党委行，merge 后党委行仍在。
//  运行：cd server; $env:DISABLE_PASSWORD_CHECK=1; node --test test/committee-owner-scope.test.mjs
// ════════════════════════════════════════════════════════════════
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { initDb } from '../db.js';
import { createApp } from '../app.js';
import { seedDatabase } from '../seed.js';
import {
  branchForNewResource, mergeScopedSnapshotWrites, recordBranchWriteDeny,
  resourceRowsForActor, scopedSnapshotWriteDeny,
} from '../routes/resources/branch-scope.js';

let db;

const BRANCH_ACTOR = { id: 'u-b1', role: 'participant', branchId: 'br-b1' };
const OTHER_ACTOR = { id: 'u-b2', role: 'participant', branchId: 'br-b2' };
const PARTY_STAFF = { id: 'u-pc', role: 'party-staff', branchId: null };

const rowsOf = (table) => db.prepare(`SELECT data FROM ${table}`).all().map((row) => JSON.parse(row.data));
const write = (table, row) => db.prepare(`INSERT OR REPLACE INTO ${table} (id, data) VALUES (?, ?)`)
  .run(row.id, JSON.stringify(row));

function ids(name, actor, requestedBranchId) {
  return resourceRowsForActor(db, name, rowsOf(tableOf(name)), actor, requestedBranchId)
    .map((row) => row.id).sort();
}

function tableOf(name) {
  return name === 'branchDocs' ? 'branch_docs' : name;
}

before(() => {
  db = initDb(':memory:');
  write('branches', { id: 'br-b1', name: '第一支部', status: 'active', config: {} });
  write('branches', { id: 'br-b2', name: '第二支部', status: 'active', config: {} });
  write('users', { id: 'u-b1', name: '第一支部成员', role: 'participant', branchId: 'br-b1' });
  write('users', { id: 'u-b2', name: '第二支部成员', role: 'participant', branchId: 'br-b2' });
  write('users', { id: 'u-pc', name: '党委组织员', role: 'party-staff', branchId: null });

  // 支部活动 + 党委活动（全部 / 指定支部）
  write('activities', { id: 'act-b1', branchId: 'br-b1', title: '第一支部活动', status: 'active', assignments: [] });
  write('activities', { id: 'act-b2', branchId: 'br-b2', title: '第二支部活动', status: 'active', assignments: [] });
  write('activities', {
    id: 'act-pc-all', ownerScope: 'committee', branchId: 'pc-gsm', targetBranchIds: ['all'],
    publishScope: 'login', title: '院级面向全部支部', status: 'published', assignments: [],
  });
  write('activities', {
    id: 'act-pc-b1', ownerScope: 'committee', branchId: 'pc-gsm', targetBranchIds: ['br-b1'],
    publishScope: 'branch', title: '院级面向第一支部', status: 'published', assignments: [],
  });
  write('activities', {
    id: 'act-pc-b2', ownerScope: 'committee', branchId: 'pc-gsm', targetBranchIds: ['br-b2'],
    publishScope: 'branch', title: '院级面向第二支部', status: 'published', assignments: [],
  });
  // 第一支部已采用 act-pc-b1（副本）
  write('activities', {
    id: 'act-copy-b1', ownerScope: 'branch', branchId: 'br-b1', sourceActivityId: 'act-pc-b1',
    sourceVersion: 1, title: '院级面向第一支部', status: 'published', assignments: [],
  });

  // 通知：支部行 + 党委行（登录可见 / 仅支部范围 / 指定目标支部）+ 党委下发通道留档
  write('notices', { id: 'ntc-b1', branchId: 'br-b1', title: '第一支部通知', content: 'x', audience: ['all'], publishDate: '2026-11-01' });
  write('notices', { id: 'ntc-b2', branchId: 'br-b2', title: '第二支部通知', content: 'x', audience: ['all'], publishDate: '2026-11-01' });
  write('notices', {
    id: 'ntc-pc-login', ownerScope: 'committee', branchId: 'pc-gsm', publishScope: 'login',
    title: '院级登录通知', content: 'x', audience: ['all'], publishDate: '2026-11-01',
  });
  write('notices', {
    id: 'ntc-pc-branch', ownerScope: 'committee', branchId: 'pc-gsm', publishScope: 'branch',
    title: '院级内部通知', content: 'x', audience: ['all'], publishDate: '2026-11-01',
  });
  write('notices', {
    id: 'ntc-pc-target-b1', ownerScope: 'committee', branchId: 'pc-gsm', publishScope: 'branch',
    targetBranchIds: ['br-b1'], title: '院级定向通知', content: 'x', audience: ['all'], publishDate: '2026-11-01',
  });
  write('notices', {
    id: 'ntc-pc-dispatch', source: 'committee', branchId: 'br-b1',
    title: '党委下发通道', content: 'x', audience: ['secretary'], publishDate: '2026-11-01',
  });

  // 资料：支部行 + 党委行（public / 仅支部范围）
  // 批次 541 · S-1：public 须带未来有效期才算「未撤下」——缺有效期 / 已过期一律不进登录态并集
  //（与匿名公共门厅 `store.js::isPublicNow` 同一判定），故此处显式给未来到期时间。
  write('branch_docs', { id: 'doc-b1', branchId: 'br-b1', title: '第一支部资料', category: '制度' });
  write('branch_docs', { id: 'doc-b2', branchId: 'br-b2', title: '第二支部资料', category: '制度' });
  write('branch_docs', {
    id: 'doc-pc-public', ownerScope: 'committee', branchId: 'pc-gsm', publishScope: 'public',
    publishExpiresAt: '2099-01-01T00:00:00.000Z',
    title: '院级公开资料', category: '制度',
  });
  write('branch_docs', {
    id: 'doc-pc-expired', ownerScope: 'committee', branchId: 'pc-gsm', publishScope: 'public',
    publishExpiresAt: '2020-01-01T00:00:00.000Z',
    title: '院级已过期公开资料', category: '制度',
  });
  write('branch_docs', {
    id: 'doc-pc-branch', ownerScope: 'committee', branchId: 'pc-gsm', publishScope: 'branch',
    title: '院级内部资料', category: '制度',
  });

  // 其他资源：维持支部隔离
  write('tasks', { id: 'task-b1', branchId: 'br-b1', activityId: 'act-b1', title: '第一支部任务' });
  write('tasks', { id: 'task-b2', branchId: 'br-b2', activityId: 'act-b2', title: '第二支部任务' });
});

after(() => db?.close());

test('C-01 支部党员活动列表 = 本支部行 + 面向本支部 / 全部的党委行，且不越目标支部', () => {
  assert.deepEqual(ids('activities', BRANCH_ACTOR), ['act-b1', 'act-copy-b1', 'act-pc-all']);
  assert.deepEqual(ids('activities', OTHER_ACTOR), ['act-b2', 'act-pc-all', 'act-pc-b2']);
});

test('C-02 本支部已有副本时列表隐藏党委原件，副本保留', () => {
  const list = ids('activities', BRANCH_ACTOR);
  assert.ok(!list.includes('act-pc-b1'), '已采用的原件必须从支部列表隐藏');
  assert.ok(list.includes('act-copy-b1'), '支部副本必须保留');
  assert.ok(list.includes('act-pc-all'), '未采用的党委活动仍可见');
});

test('C-03 党委未选支部时只出党委自有活动，不展开支部明细', () => {
  assert.deepEqual(ids('activities', PARTY_STAFF), ['act-pc-all', 'act-pc-b1', 'act-pc-b2']);
});

test('C-04 党委选中支部时出并集，并标注来源与是否已采用', () => {
  const list = resourceRowsForActor(db, 'activities', rowsOf('activities'), PARTY_STAFF, 'br-b1');
  assert.deepEqual(list.map((row) => row.id).sort(), ['act-b1', 'act-copy-b1', 'act-pc-all', 'act-pc-b1']);
  const committeeRows = list.filter((row) => row.sourceScope === 'committee');
  assert.deepEqual(committeeRows.map((row) => row.id).sort(), ['act-pc-all', 'act-pc-b1']);
  assert.equal(committeeRows.find((row) => row.id === 'act-pc-b1').committeeAdopted, true);
  assert.equal(committeeRows.find((row) => row.id === 'act-pc-all').committeeAdopted, false);
  assert.equal(list.find((row) => row.id === 'act-b1').sourceScope, undefined, '支部行不得被标成党委内容');
});

test('C-05 通知并集：支部行 + 登录可见党委行 + 目标支部党委行', () => {
  assert.deepEqual(ids('notices', BRANCH_ACTOR), ['ntc-b1', 'ntc-pc-dispatch', 'ntc-pc-login', 'ntc-pc-target-b1']);
  assert.ok(!ids('notices', BRANCH_ACTOR).includes('ntc-pc-branch'), 'branch 范围的党委通知不进支部视野');
  assert.ok(!ids('notices', BRANCH_ACTOR).includes('ntc-b2'));
  // 党委未选支部：既有下发通道留档 + 党委自有登录 / 公开通知
  assert.deepEqual(ids('notices', PARTY_STAFF), ['ntc-pc-dispatch', 'ntc-pc-login']);
  // 党委选中支部：该支部行 + 面向该支部的党委行（去重）
  assert.deepEqual(ids('notices', PARTY_STAFF, 'br-b1'), ['ntc-b1', 'ntc-pc-dispatch', 'ntc-pc-target-b1']);
});

test('C-06 资料并集：支部账号只收 login / 未过期 public 的党委行（过期 public 视同撤下）', () => {
  assert.deepEqual(ids('branchDocs', BRANCH_ACTOR), ['doc-b1', 'doc-pc-public']);
  assert.ok(!ids('branchDocs', BRANCH_ACTOR).includes('doc-pc-branch'));
  assert.ok(!ids('branchDocs', BRANCH_ACTOR).includes('doc-pc-expired'), '★ 过期 public 党委资料不进支部登录列表');
  // 党委管理口不受撤下影响：过期原件仍在（否则无法改期 / 重新公开）
  assert.deepEqual(ids('branchDocs', PARTY_STAFF), ['doc-pc-branch', 'doc-pc-expired', 'doc-pc-public']);
  assert.deepEqual(ids('branchDocs', PARTY_STAFF, 'br-b1'), ['doc-b1', 'doc-pc-branch', 'doc-pc-expired', 'doc-pc-public']);
});

test('C-07 其他资源维持支部隔离，不因本次并集放宽', () => {
  assert.deepEqual(ids('users', BRANCH_ACTOR), ['u-b1']);
  assert.deepEqual(ids('users', OTHER_ACTOR), ['u-b2']);
  assert.deepEqual(ids('users', PARTY_STAFF), [], '党委未选支部仍不得列举成员');
  assert.deepEqual(ids('tasks', BRANCH_ACTOR), ['task-b1']);
  assert.deepEqual(ids('tasks', OTHER_ACTOR), ['task-b2']);
});

test('C-08 写门：支部写党委行被拒，党委组织员写党委行放行', () => {
  const committeeRow = rowsOf('activities').find((row) => row.id === 'act-pc-all');
  assert.equal(recordBranchWriteDeny(db, 'activities', committeeRow, BRANCH_ACTOR), '无权限：党委内容只能由党委组织员写入');
  assert.equal(recordBranchWriteDeny(db, 'activities', committeeRow, OTHER_ACTOR), '无权限：党委内容只能由党委组织员写入');
  assert.equal(recordBranchWriteDeny(db, 'activities', committeeRow, PARTY_STAFF), null);
  // 支部自有行仍按既有支部归属判定
  const ownRow = rowsOf('activities').find((row) => row.id === 'act-b1');
  assert.equal(recordBranchWriteDeny(db, 'activities', ownRow, BRANCH_ACTOR), null);
  assert.equal(recordBranchWriteDeny(db, 'activities', ownRow, OTHER_ACTOR), '无权限：不能读取或写入其他支部记录');
  // 党委写支部业务记录仍须明确 branchId
  assert.equal(recordBranchWriteDeny(db, 'tasks', { id: 'task-new', title: '无归属' }, PARTY_STAFF), '党委写入支部业务记录时须明确支部归属');
  assert.equal(recordBranchWriteDeny(db, 'tasks', { id: 'task-new', branchId: 'br-b1', title: '有归属' }, PARTY_STAFF), null);
});

test('C-09 党委新建党委行归 pc-gsm；支部账号拿不到 pc-gsm', () => {
  assert.equal(branchForNewResource(db, 'activities', { title: '院级新活动', ownerScope: 'committee' }, PARTY_STAFF), 'pc-gsm');
  assert.equal(branchForNewResource(db, 'activities', { title: '院级新活动', ownerScope: 'committee' }, BRANCH_ACTOR), 'br-b1');
  assert.equal(branchForNewResource(db, 'activities', { title: '无归属新活动' }, PARTY_STAFF), null);
});

test('C-10 支部快照不得触碰党委行，合并后党委行仍在', () => {
  const payload = { activities: [{ id: 'act-pc-all', title: '越权改写', ownerScope: 'committee' }] };
  assert.equal(scopedSnapshotWriteDeny(db, payload, BRANCH_ACTOR), '无权限：不能通过快照触碰党委内容');
  const disguised = { activities: [{ id: 'act-pc-all', branchId: 'br-b1', ownerScope: 'branch', title: '伪装成支实行' }] };
  assert.equal(scopedSnapshotWriteDeny(db, disguised, BRANCH_ACTOR), '无权限：不能通过快照触碰党委内容');
  const fresh = { activities: [{ id: 'act-pc-new', ownerScope: 'committee', title: '支部新建党委行' }] };
  assert.equal(scopedSnapshotWriteDeny(db, fresh, BRANCH_ACTOR), '无权限：不能通过快照触碰党委内容');
  assert.equal(scopedSnapshotWriteDeny(db, { activities: [{ id: 'act-b1', branchId: 'br-b1', title: '正常改写' }] }, BRANCH_ACTOR), null);

  const merged = mergeScopedSnapshotWrites(db, [
    { name: 'activities', table: 'activities', rows: [{ id: 'act-b1', branchId: 'br-b1', title: '正常改写' }] },
    { name: 'notices', table: 'notices', rows: [{ id: 'ntc-b1', branchId: 'br-b1', title: '第一支部通知', audience: ['all'] }] },
  ], BRANCH_ACTOR);
  const activityIds = merged[0].rows.map((row) => row.id);
  assert.deepEqual(activityIds.filter((id) => id.startsWith('act-pc-')).sort(), ['act-pc-all', 'act-pc-b1', 'act-pc-b2']);
  assert.ok(activityIds.includes('act-b2'), '其他支部活动仍须保留');
  assert.equal(merged[0].rows.find((row) => row.id === 'act-b1').title, '正常改写');
  const noticeIds = merged[1].rows.map((row) => row.id);
  assert.ok(noticeIds.includes('ntc-pc-login'), '支部快照不得删除党委通知');
  assert.ok(noticeIds.includes('ntc-pc-branch'), '党委通知整行保留，不因支部不可见而被整表快照删除');
});

test('C-11 HTTP 读口：支部账号从 /api/v1/activities 得到党委与支部并集', async () => {
  const app = createApp({ dbPath: ':memory:' });
  const httpDb = app.locals.db;
  await seedDatabase(httpDb);
  const server = app.listen(0);
  try {
    const base = `http://127.0.0.1:${server.address().port}/api/v1`;
    httpDb.prepare('INSERT OR REPLACE INTO activities (id, data) VALUES (?, ?)').run('act-http-pc', JSON.stringify({
      id: 'act-http-pc', ownerScope: 'committee', branchId: 'pc-gsm', targetBranchIds: ['all'],
      publishScope: 'login', title: '院级活动', status: 'published', assignments: [],
    }));
    const login = await fetch(`${base}/auth/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ personId: '2300010001', password: '123456' }),
    });
    assert.equal(login.status, 200, '登录失败：确认已设 DISABLE_PASSWORD_CHECK=1');
    const token = (await login.json()).token;
    const response = await fetch(`${base}/activities`, { headers: { Authorization: `Bearer ${token}` } });
    assert.equal(response.status, 200);
    const list = await response.json();
    assert.ok(list.some((row) => row.id === 'act-http-pc'), '支部账号须看到面向全部的党委活动');
    assert.ok(list.some((row) => row.id === 'act-11'), '本支部活动仍须保留');
  } finally {
    server.closeAllConnections?.();
    await new Promise((resolve) => server.close(resolve));
    httpDb.close();
  }
});
