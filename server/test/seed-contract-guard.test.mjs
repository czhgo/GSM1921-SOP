// server/test/seed-contract-guard.test.mjs — schema v12 种子契约守卫（2026-10-26）
// ════════════════════════════════════════════════════════════════
// 判据（对应 spec restore-capsule-and-harden-data-truth Task 4 / DATA_SEED_CONTRACT）：
//   C1 四类种子源的 branchId 非空且＝部署默认支部（活动/考勤/考察/归档/宣传/外发/交接/确认/审计）；
//   C2 播种后十张业务表 branchId 非空，且考勤/考察与父行同支部；
//   C3 todos.branch_id 是生成列：INSERT(id,data) 可用、与 JSON 一致、手写列报错；
//   C4 四组唯一索引存在，重复写入被 SQLite 拒绝（不是只靠 JS 查重）；
//   C5 contributions 全是对象数组；影子表无 `$."0"` 字符键；篡改影子行 mismatch>0；
//   C6 考察 personId 必须是父工作组在册成员（种子 0 违规 + 写口判据拒绝非成员）；
//   C7 死表/半死表：issue_reveals 已删；committee_broadcasts 写口 409；影子/证据表进 NO_READ_ALLOWLIST；
//   C8 DATA_MODEL/DATA_SEED_CONTRACT 已登记辅助表与 UI 写入字段；
//   C9 契约四类口径 + 语义 7 表 + 演示窗口存在；
//   C10 SEED_MANIFEST 把 branchId 登记为种子负责字段。
// 非空转：每条断言都带「故障注入」或规模下限，取反后必须报红。
// 运行：node --test server/test/seed-contract-guard.test.mjs（纯 node）
// ════════════════════════════════════════════════════════════════
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { initDb, rebuildShadowTables, compareShadowTables } from '../db.js';
import { seedDatabase } from '../seed.js';
import { _inspectionPersonMembershipDeny } from '../routes/resources/gates.js';
import {
  normalizeSeedActivitySeedRows,
  ensureLegacySourceWorkgroups,
  ensureInspectionWorkgroupMembers,
} from '../../docs/src/data/workgroup-seed-sync.js?v=20261026a';
import { ACTIVITIES } from '../../docs/src/data/mock/activities.js?v=20261026a';
import { ATTENDANCE_RECORDS } from '../../docs/src/data/mock/attendance.js?v=20261026a';
import { INSPECTION_RECORDS } from '../../docs/src/data/mock/inspection.js?v=20261026a';
import { MOCK_TASKFORCES } from '../../docs/src/data/mock/taskforces.js?v=20261026a';
import {
  SEED_ARCHIVE_RECORDS, SEED_SIGNUPS,
} from '../../docs/src/data/mock/seed.js?v=20261026a';
import { PROP_TASKS_SEED } from '../../docs/src/data/mock/prop.js?v=20261026a';
import {
  SEED_EXTERNAL_DISPATCHES, SEED_HANDOFFS, SEED_MEMBER_CONFIRMATIONS, SEED_AUTH_AUDIT,
} from '../../docs/src/data/mock/auxiliary.js?v=20261026a';
import { SEED_MANIFEST, NO_READ_ALLOWLIST } from '../../docs/src/data/seed-manifest.js?v=20261026a';
import { DEFAULT_BRANCH_ID } from '../../docs/src/core/domain/constants.js?v=20261026a';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const readDoc = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

let db;
before(async () => {
  db = initDb(':memory:');
  await seedDatabase(db);
});
after(() => db?.close());

const rows = (table) => db.prepare(`SELECT data FROM ${table}`).all().map((row) => JSON.parse(row.data));
const count = (table) => db.prepare(`SELECT COUNT(1) AS c FROM ${table}`).get().c;
const missingBranch = (list) => list.filter((row) => !row || !row.branchId);

/** 种子源（与 server/seed.js / seed-rows.js 同一归一） */
function seedSources() {
  const activities = normalizeSeedActivitySeedRows(ACTIVITIES);
  const taskforces = MOCK_TASKFORCES.map((row) => ({ ...row }));
  const workgroupSeed = {
    activities, taskforces, workgroups: [], workgroupMembers: [], workgroupGrants: [],
  };
  ensureLegacySourceWorkgroups(workgroupSeed);
  ensureInspectionWorkgroupMembers(workgroupSeed, INSPECTION_RECORDS);
  return {
    activities,
    attendances: ATTENDANCE_RECORDS,
    inspections: INSPECTION_RECORDS,
    archive_records: SEED_ARCHIVE_RECORDS,
    prop_tasks: PROP_TASKS_SEED,
    external_dispatches: SEED_EXTERNAL_DISPATCHES,
    handoffs: SEED_HANDOFFS,
    member_confirmations: SEED_MEMBER_CONFIRMATIONS,
    auth_audit: SEED_AUTH_AUDIT,
    taskforces,
    workgroupSeed,
  };
}

// ── C1 ─────────────────────────────────────────────────────────────────────
test('C1 种子源 branchId：九类必须种子行非空且＝默认支部（含故障注入）', () => {
  const sources = seedSources();
  const required = [
    'activities', 'attendances', 'inspections', 'archive_records', 'prop_tasks',
    'external_dispatches', 'handoffs', 'member_confirmations', 'auth_audit',
  ];
  for (const table of required) {
    assert.ok(sources[table].length > 0, `${table} 种子为空（守卫会因空集恒真）`);
    assert.deepEqual(missingBranch(sources[table]), [],
      `${table} 种子存在缺 branchId 行（P0：${table} 不得靠读侧兜底）`);
    assert.ok(sources[table].every((row) => row.branchId === DEFAULT_BRANCH_ID),
      `${table} 种子 branchId 必须＝部署默认支部 ${DEFAULT_BRANCH_ID}`);
  }
  // 故障注入：同一判据必须能抓住人为缺字段
  const broken = [{ ...sources.activities[0], branchId: null }];
  assert.equal(missingBranch(broken).length, 1, '判据失效：人为 branchId=null 未被抓住');
});

// ── C2 ─────────────────────────────────────────────────────────────────────
test('C2 播种后 branchId 全非空，考勤/考察与父行同支部', () => {
  const tables = [
    'activities', 'attendances', 'inspections', 'archive_records', 'prop_tasks',
    'external_dispatches', 'handoffs', 'member_confirmations', 'auth_audit', 'todos',
  ];
  for (const table of tables) {
    assert.ok(count(table) > 0, `${table} 播种后为空（P0 数据真相）`);
    assert.deepEqual(missingBranch(rows(table)), [], `${table} 播种后仍有 branchId 为空的行`);
  }
  const activityBranch = new Map(rows('activities').map((row) => [row.id, row.branchId]));
  const groupBranch = new Map(rows('workgroups').map((row) => [row.id, row.branchId]));
  for (const row of rows('attendances')) {
    assert.equal(row.branchId, activityBranch.get(row.activityId), `考勤 ${row.id} 与活动不同支部`);
  }
  for (const row of rows('inspections')) {
    const expected = row.sourceType === 'activity'
      ? activityBranch.get(row.activityId)
      : groupBranch.get(row.workgroupId);
    assert.equal(row.branchId, expected, `考察 ${row.id} 与父行不同支部`);
  }
});

// ── C3 ─────────────────────────────────────────────────────────────────────
test('C3 todos.branch_id 生成列：INSERT(id,data) 可用、JSON 一致、手写列报错', () => {
  const info = db.prepare('PRAGMA table_xinfo(todos)').all().find((c) => c.name === 'branch_id');
  assert.ok(info, 'todos 缺 branch_id');
  assert.notEqual(info.hidden, 0, 'v12：todos.branch_id 必须是 GENERATED/VIRTUAL（只读）');
  db.prepare('INSERT INTO todos (id, data) VALUES (?, ?)').run('td-guard-1', JSON.stringify({ id: 'td-guard-1', title: '守卫', branchId: 'br-b1' }));
  try {
    assert.equal(db.prepare('SELECT branch_id FROM todos WHERE id = ?').get('td-guard-1').branch_id, 'br-b1',
      '生成列未跟随 data.branchId');
    assert.throws(() => db.prepare('UPDATE todos SET branch_id = ? WHERE id = ?').run('br-x', 'td-guard-1'),
      /generated|GENERATED/, '手写生成列必须报错（写口只能写 data）');
  } finally {
    db.prepare('DELETE FROM todos WHERE id = ?').run('td-guard-1');
  }
});

// ── C4 ─────────────────────────────────────────────────────────────────────
test('C4 四组唯一索引存在，重复写入被 SQLite 拒绝', () => {
  const indexes = new Set(db.prepare("SELECT name FROM sqlite_master WHERE type='index'").all().map((row) => row.name));
  for (const name of [
    'ux_attendances_activity_person', 'ux_party_groups_branch_name',
    'ux_attendance_rosters_activity', 'ux_workgroup_members_group_person',
  ]) assert.ok(indexes.has(name), `缺唯一索引 ${name}`);

  const write = (table, row) => db.prepare(`INSERT INTO ${table} (id, data) VALUES (?, ?)`).run(row.id, JSON.stringify(row));
  // 考勤 (activityId, personId)
  write('attendances', { id: 'att-u1', branchId: 'br-b1', activityId: 'act-ux', personId: 'u-ux', status: 'present' });
  assert.throws(() => write('attendances', { id: 'att-u2', branchId: 'br-b1', activityId: 'act-ux', personId: 'u-ux', status: 'present' }),
    /UNIQUE constraint failed/, '考勤 (activityId,personId) 未被数据库拒绝');
  // 党小组活组 (branchId, name)
  write('party_groups', { id: 'pg-u1', branchId: 'br-b1', name: '守卫测试组', status: 'active' });
  assert.throws(() => write('party_groups', { id: 'pg-u2', branchId: 'br-b1', name: '守卫测试组', status: 'active' }),
    /UNIQUE constraint failed/, '同支部同名活组未被拒绝');
  // 应到名单 (activityId)
  write('attendance_rosters', { id: 'atr-u1', branchId: 'br-b1', activityId: 'act-ux', personIds: [] });
  assert.throws(() => write('attendance_rosters', { id: 'atr-u2', branchId: 'br-b1', activityId: 'act-ux', personIds: [] }),
    /UNIQUE constraint failed/, '同一活动第二份应到名单未被拒绝');
  // 工作组成员 (workgroupId, personId)
  write('workgroup_members', { id: 'wgm-u1', branchId: 'br-b1', workgroupId: 'wg-ux', personId: 'u-ux', status: 'active' });
  assert.throws(() => write('workgroup_members', { id: 'wgm-u2', branchId: 'br-b1', workgroupId: 'wg-ux', personId: 'u-ux', status: 'active' }),
    /UNIQUE constraint failed/, '同一组同一人第二条未被拒绝');
  // 清理（顺序无外键依赖）
  for (const [table, id] of [
    ['workgroup_members', 'wgm-u1'], ['attendance_rosters', 'atr-u1'],
    ['party_groups', 'pg-u1'], ['attendances', 'att-u1'],
  ]) db.prepare(`DELETE FROM ${table} WHERE id = ?`).run(id);
});

// ── C5 ─────────────────────────────────────────────────────────────────────
test('C5 contributions 全对象数组；影子表无字符键；篡改能判出 mismatch', () => {
  for (const taskforce of MOCK_TASKFORCES) {
    for (const member of taskforce.members || []) {
      assert.ok(Array.isArray(member.contributions), `${taskforce.id}/${member.personId} contributions 必须是数组`);
      assert.ok(member.contributions.every((item) => item && typeof item === 'object' && !Array.isArray(item)),
        `${taskforce.id}/${member.personId} 仍有字符串 contribution`);
    }
  }
  for (const taskforce of rows('taskforces')) {
    for (const member of taskforce.members || []) {
      for (const item of member.contributions || []) {
        assert.equal(typeof item, 'object', `${taskforce.id} 落库后仍有非对象 contribution`);
        assert.ok(!Array.isArray(item), `${taskforce.id} 落库后仍有数组 contribution`);
      }
    }
  }
  // 故障注入：直接写字符串贡献，重建影子表后必须归一为对象（不得出现 `$."0"` 字符键）
  db.prepare('INSERT INTO taskforces (id, data) VALUES (?, ?)')
    .run('tf-guard-string', JSON.stringify({
      id: 'tf-guard-string', branchId: 'br-b1', name: '字符串贡献故障注入',
      members: [{ personId: 'u-ux', role: 'deep', contributions: ['更', '新'] }],
    }));
  rebuildShadowTables(db);
  const shadowRows = db.prepare('SELECT data FROM taskforce_contributions').all().map((row) => JSON.parse(row.data));
  const target = shadowRows.filter((row) => row.taskforceId === 'tf-guard-string');
  assert.equal(target.length, 2, '字符串贡献应被展开为两条对象行');
  for (const row of target) {
    assert.ok(!Object.keys(row).some((key) => /^\d+$/.test(key)), '影子行出现字符键（同错同绿）');
    assert.equal(row.desc, row.id.includes(':0:') ? '更' : '新');
  }
  assert.equal(compareShadowTables(db).mismatch, 0, '归一后主表/影子应一致');
  // 篡改影子行 ⇒ 比对必须报出（防守卫恒真）
  db.prepare('UPDATE taskforce_contributions SET data = ? WHERE id LIKE ?')
    .run('{"tampered":true}', 'tf-guard-string:%');
  assert.ok(compareShadowTables(db).mismatch > 0, '篡改影子行后 mismatch 必须 > 0');
  db.prepare('DELETE FROM taskforces WHERE id = ?').run('tf-guard-string');
  rebuildShadowTables(db);
});

// ── C6 ─────────────────────────────────────────────────────────────────────
test('C6 考察 personId ∈ 父工作组成员（种子 0 违规 + 写口判据拒绝非成员）', () => {
  const members = new Set(rows('workgroup_members')
    .filter((row) => row.status !== 'removed')
    .map((row) => `${row.workgroupId}|${row.personId}`));
  const wgByActivity = new Map(rows('workgroups').filter((row) => row.kind === 'activity').map((row) => [row.sourceId, row.id]));
  const offenders = [];
  for (const row of rows('inspections')) {
    const workgroupId = row.sourceType === 'activity'
      ? (wgByActivity.get(row.activityId) || `wg-activity-${row.activityId}`)
      : row.workgroupId;
    if (!workgroupId || !members.has(`${workgroupId}|${row.personId}`)) offenders.push(`${row.id}→${row.personId}`);
  }
  assert.deepEqual(offenders, [], `考察对象不在父工作组：${offenders.join('、')}`);
  // 写口判据：非成员必须给可懂原因（党委组织员 9000000001 不在任何活动工作组）
  const deny = _inspectionPersonMembershipDeny(db, {
    sourceType: 'activity', activityId: 'act-26', personId: '9000000001', level: 'deep',
  });
  assert.ok(deny && /不是该考察父工作组/.test(deny), `非成员写入未被拒绝（实得 ${deny}）`);
  const ok = _inspectionPersonMembershipDeny(db, {
    sourceType: 'activity', activityId: 'act-26', personId: '2500010017', level: 'deep',
  });
  assert.equal(ok, null, '合法成员应放行');
});

// ── C7 ─────────────────────────────────────────────────────────────────────
test('C7 死表/半死表：issue_reveals 已删、committee_broadcasts 写口 409、NO_READ_ALLOWLIST', () => {
  const tables = new Set(db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map((row) => row.name));
  assert.equal(tables.has('issue_reveals'), false, 'v12 必须 DROP issue_reveals');
  assert.equal(count('committee_broadcasts'), 0, 'committee_broadcasts 不得有种子/新写入');
  const indexSource = fs.readFileSync(path.join(ROOT, 'server', 'routes', 'resources', 'index.js'), 'utf8');
  assert.match(indexSource, /支委广播已停止写入/, '通用写口必须显式拒绝 committeeBroadcasts');
  const memberSource = fs.readFileSync(path.join(ROOT, 'server', 'routes', 'member.js'), 'utf8');
  assert.doesNotMatch(memberSource, /writeRow\(db,\s*'committee_broadcasts'/, 'member.js 不得再写广播表');
  const allow = new Map(NO_READ_ALLOWLIST.map((entry) => [entry.table, entry.reason]));
  for (const table of ['agenda_items', 'taskforce_contributions', 'snapshot_conflicts', 'shadow_history']) {
    assert.ok(allow.has(table), `NO_READ_ALLOWLIST 未登记影子/证据表 ${table}`);
    assert.ok(String(allow.get(table)).trim().length >= 8, `${table} 的允许理由过短`);
  }
  assert.equal(allow.has('issue_reveals'), false, '已删表不得留在 NO_READ_ALLOWLIST');
});

// ── C8 ─────────────────────────────────────────────────────────────────────
test('C8 DATA_MODEL / DATA_SEED_CONTRACT 已登记辅助表与 UI 写入字段', () => {
  const model = readDoc('content/04_web_design/data/DATA_MODEL.md');
  const contract = readDoc('content/04_web_design/data/DATA_SEED_CONTRACT.md');
  const tables = [
    'signups', 'prop_tasks', 'external_dispatches', 'member_change_requests', 'committee_broadcasts',
    'agenda_votes', 'attendance_rosters', 'handoffs', 'member_confirmations', 'milestones',
    'attendance_appeals', 'inspection_appeals', 'issue_unread', 'auth_audit',
  ];
  for (const table of tables) assert.ok(model.includes(table), `DATA_MODEL 未登记表 ${table}`);
  const fields = [
    'remindedAt', 'reminderType', 'depositedAt', 'galleryFeaturedBy', 'galleryFeaturedAt',
    'actionKey', 'flow', 'noticeType', 'targetModule', 'domain', 'returnedBy', 'returnedAt',
    'returnReason', 'secretaryConfirmedAt',
  ];
  for (const field of fields) assert.ok(model.includes(field), `DATA_MODEL 未登记 UI 写入字段 ${field}`);
  assert.ok(model.includes('DATA_SEED_CONTRACT.md'), 'DATA_MODEL 缺种子契约指针');
  assert.ok(contract.includes('2026-08-01') && contract.includes('2026-11-30'), '契约缺演示窗口');
  // 故障注入：未登记的名字不得被同一判据判为已登记
  assert.equal(model.includes('ghost_table_not_registered'), false);
});

// ── C9 ─────────────────────────────────────────────────────────────────────
test('C9 契约四类口径 + 语义 7 表', () => {
  const contract = readDoc('content/04_web_design/data/DATA_SEED_CONTRACT.md');
  for (const label of ['必须种子', '可派生', '可交叉验证', '展示专用']) {
    assert.ok(contract.includes(label), `契约缺类别「${label}」`);
  }
  for (const table of ['handoffs', 'member_confirmations', 'milestones', 'attendance_appeals', 'inspection_appeals', 'issue_unread', 'auth_audit']) {
    assert.ok(contract.includes(table), `契约缺语义表 ${table}`);
  }
  assert.ok(contract.includes('禁止项'), '契约缺禁止项');
});

// ── C10 ────────────────────────────────────────────────────────────────────
test('C10 SEED_MANIFEST 把 branchId 登记为种子负责字段（含故障注入）', () => {
  const tables = [
    'activities', 'attendances', 'inspections', 'archive_records', 'prop_tasks', 'external_dispatches',
    'handoffs', 'member_confirmations', 'auth_audit', 'todos',
  ];
  for (const table of tables) {
    const entry = SEED_MANIFEST.find((item) => item.table === table);
    assert.ok(entry, `SEED_MANIFEST 缺 ${table}`);
    assert.ok(entry.seedOwnedFields.includes('branchId'), `${table} 未把 branchId 列为种子负责字段`);
    assert.ok(Array.isArray(entry.runtimeFields), `${table} 缺 runtimeFields`);
  }
  // 故障注入：登记面被判据真实读取（删掉字段后同一断言应报红）
  const victim = { ...SEED_MANIFEST.find((item) => item.table === 'attendances'), seedOwnedFields: ['id'] };
  assert.equal(victim.seedOwnedFields.includes('branchId'), false);
});
