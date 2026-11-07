// server/test/todo-derive-parity.test.mjs — Plan B 测试门（批次 534 · B-500-7b-1 Task 7）
//
// 目的：把「客户端算出来的 7 类实时待办组」当**标准答案**，与服务端 `GET /api/v1/todo-groups`
//   逐键对账。服务端本期仍只算 3 类（develop-node / half-year / module-cycle），7 类中的红项
//   由本文件**精确列出**，作为 Task 8 的施工单；Task 8 逐键实现后本文件自动转绿，不需要改断言。
//
// 四组判据：
//   ① 标准答案 fixtures（`test/fixtures/todo-derive/golden.json`）与纯函数重算一致（日期稳定键）；
//   ② 同一份数据、同一角色：客户端标准答案 vs 服务端输出 —— groupKey / 条目 id 集合 / count 逐字段相等；
//      服务端未实现的键（`unsupported` 内）记为**红**，并打印「已绿 / 仍红」清单；
//   ③ 双支部夹具：A 支部账号看不到任何 B 支部条目，B 账号也看不到 A 条目；
//   ④ 门非空转：人为篡改一个 id 或 count，比较器必须判红。
//
// 数据面：A ＝ `docs/src/data/mock/*` 种子（Node 直读，与浏览器同一份）；
//   B ＝ 本文件内 `BRANCH_B` 夹具（同时写进 `:memory:` 库，供服务端按双支部计算）。
// 纯 node + `:memory:`（不连 :3000、不留运行库）⇒ daily 层。
//
// 重新生成 fixtures：`set WRITE_TODO_FIXTURE=1&& node --test test/todo-derive-parity.test.mjs`
//   （仅在纯函数口径有意变更时执行；生成后仍需人读 diff）。

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { createApp } from '../app.js';
import { seedDatabase } from '../seed.js';
import { today } from '../services/reporting.js';

import { DEFAULT_BRANCH_ID } from '../../docs/src/core/domain/constants.js?v=20261107a';
import {
  deriveAttendanceRemindGroup,
  deriveInspectionRemindGroup,
  deriveResolutionFollowupRemindGroup,
  deriveMemberConfirmGroup,
  deriveMemberApproveGroup,
  deriveSemesterDetainedRemindGroup,
  deriveTaskforceAuthorizeGroup,
} from '../../docs/src/core/domain/todo-derive.js?v=20261107a';

import { PEOPLE } from '../../docs/src/data/mock/people.js?v=20261107a';
import { ACTIVITIES } from '../../docs/src/data/mock/activities.js?v=20261107a';
import { ATTENDANCE_RECORDS } from '../../docs/src/data/mock/attendance.js?v=20261107a';
import { INSPECTION_RECORDS } from '../../docs/src/data/mock/inspection.js?v=20261107a';
import { SEED_MEMBER_CHANGE_REQUESTS, SEED_MEMBER_CONFIRMATIONS } from '../../docs/src/data/mock/auxiliary.js?v=20261107a';
import { applyDerivedFacts } from '../../docs/src/data/mock/derive.js?v=20261107a';

// ════════════════════════════════════════════════════════════════
//  7 键与角色分工（客户端消费点单一源）
// ════════════════════════════════════════════════════════════════

/** 服务端 `UNSUPPORTED_GROUP_KEYS` 的 7 键（Task 8 的施工单全集） */
const DERIVE_KEYS = [
  'attendance-remind',
  'inspection-remind',
  'resolution-followup-remind',
  'member-confirm',
  'member-approve',
  'semester-detained-remind',
  'taskforce-authorize',
];

/** 各角色实际消费的键（客户端：支书台 5 键 / 组织委员台 3 键；inspection-remind 两台上都出现） */
const ROLE_KEYS = {
  secretary: ['attendance-remind', 'inspection-remind', 'resolution-followup-remind', 'member-confirm', 'semester-detained-remind'],
  'org-commissioner': ['inspection-remind', 'member-approve', 'taskforce-authorize'],
};

/** 与「今天」无关的键：fixtures 可逐值与纯函数重算比对（其余键随日期漂移，只做运行时对账） */
const DATE_STABLE_KEYS = new Set(['member-confirm', 'member-approve', 'taskforce-authorize']);

const SECRETARY_ID = '2300010001';        // 储子禾（支书，br-b1）
const ORG_COMMISSIONER_ID = '2400012355'; // 高翔宇（组织委员，br-b1）

const FIXTURE_PATH = join(dirname(fileURLToPath(import.meta.url)), 'fixtures', 'todo-derive', 'golden.json');

// ════════════════════════════════════════════════════════════════
//  A 支部（真实种子） / B 支部（双支部夹具）
// ════════════════════════════════════════════════════════════════

const rowsOfBranch = (rows, branchId) => (rows || [])
  .filter((r) => r && (r.branchId || DEFAULT_BRANCH_ID) === branchId);

/**
 * A 支部数据面：全部来自 `docs/src/data/mock/*`（与浏览器 mockDB 首启同一份）。
 * 种子只写事实（日期 / 确认动作），`status` 等派生字段由 `applyDerivedFacts` 按 `today` 补回——
 *   与服务端 `seed.js` 落库时调用的**同一个函数**，保证两边看到同一形状（否则活动全是非 completed，
 *   考勤待录入等组永远是空，标准答案会退化成空集）。
 */
function branchAData(todayStr = today()) {
  const branchId = DEFAULT_BRANCH_ID;
  const members = rowsOfBranch(PEOPLE, branchId).filter((p) => p.transferOut !== true);
  const clone = (rows) => (rows || []).map((r) => ({ ...r }));
  const data = {
    members,
    activities: clone(rowsOfBranch(ACTIVITIES, branchId)),
    attendanceRecords: clone(rowsOfBranch(ATTENDANCE_RECORDS, branchId)),
    inspectionRecords: clone(rowsOfBranch(INSPECTION_RECORDS, branchId)),
    memberConfirmations: rowsOfBranch(SEED_MEMBER_CONFIRMATIONS, branchId),
    memberChangeRequests: rowsOfBranch(SEED_MEMBER_CHANGE_REQUESTS, branchId),
    todos: [],
  };
  applyDerivedFacts({
    activities: data.activities,
    inspections: data.inspectionRecords,
    attendances: data.attendanceRecords,
    activityReviews: [], taskforces: [], archiveRecords: [], notices: [],
  }, { now: todayStr, people: members });
  return data;
}

/**
 * B 支部夹具：造一份与 A **完全不同的 id 命名（b- 前缀）** 的最小数据，覆盖 7 类中的可派生项。
 * 同一份常量同时用于「纯函数标准答案」与「写入 :memory: 库」，保证两边数据完全一致。
 */
const BRANCH_B = {
  branch: {
    id: 'br-b2', name: '测试第二党支部', type: '本科生', status: 'active',
    config: {}, secretaryId: 'b-secretary', createdAt: '2026-09-01T00:00:00.000Z',
  },
  users: [
    { id: 'b-secretary', name: '乙支书', studentId: 'b-secretary', partyGroup: '第一党小组', developStage: '正式党员', role: 'secretary', branchId: 'br-b2' },
    { id: 'b-org', name: '乙组织', studentId: 'b-org', partyGroup: '第一党小组', developStage: '正式党员', role: 'org-commissioner', branchId: 'br-b2' },
    { id: 'b-member-1', name: '乙成员一', studentId: 'b-member-1', partyGroup: '第一党小组', developStage: '预备党员', role: 'participant', branchId: 'br-b2' },
    { id: 'b-detained', name: '乙滞留', studentId: 'b-detained', partyGroup: '第一党小组', developStage: '正式党员', role: 'participant', branchId: 'br-b2', residenceStatus: '滞留', residenceNote: '外派半年' },
  ],
  activities: [
    // 已结束的党课、无考勤记录 ⇒ 考勤待录入
    { id: 'b-act-old', title: '乙支部过期党课', type: '党课', status: 'completed', date: '2025-03-01', organizer: 'b-secretary', branchId: 'br-b2' },
    // 已通过决议 + 逾期未落实 ⇒ 决议落实逾期
    {
      id: 'b-act-resolution', title: '乙支部支委会', type: '支委会', status: 'completed', date: '2025-04-01', organizer: 'b-secretary', branchId: 'br-b2',
      agenda: [{
        id: 'b-agenda-1', item: '乙决议', result: 'passed',
        followups: [{ id: 'b-fu-1', item: '乙待落实', ownerType: 'role', ownerId: 'secretary', deadline: '2025-05-01', status: 'pending' }],
      }],
    },
  ],
  inspections: [
    { id: 'b-insp-1', personId: 'b-member-1', sourceType: 'activity', activityId: 'b-act-old', recordedAt: '2025-03-02T00:00:00.000Z', status: 'pending', branchId: 'br-b2' },
  ],
  memberConfirmations: [
    { id: 'b-mc-1', kind: 'change', personId: 'b-member-1', action: 'developStage', from: '积极分子', to: '预备党员', by: 'b-org', status: 'pending', createdAt: '2026-09-01T00:00:00.000Z', branchId: 'br-b2' },
  ],
  memberChangeRequests: [
    { id: 'b-mcr-secretary', personId: 'b-member-1', fromStage: '积极分子', toStage: '预备党员', action: 'developStage', status: 'pending-secretary', createdAt: '2026-09-01T00:00:00.000Z', branchId: 'br-b2' },
    { id: 'b-mcr-org', personId: 'b-detained', fromStage: '正式党员', toStage: '已转出', action: 'transferOut', status: 'pending-org-approval', createdAt: '2026-09-02T00:00:00.000Z', branchId: 'br-b2' },
  ],
  todos: [
    { id: 'b-todo-tf-auth', title: '为专班「乙专班」赋权', role: 'org-commissioner', status: 'pending', category: 'auth', actionKey: 'taskforce-authorize', sourceType: 'taskforce', sourceId: 'b-tf-1', branchId: 'br-b2' },
  ],
};

function branchBData() {
  return {
    members: BRANCH_B.users.filter((p) => p.transferOut !== true),
    activities: BRANCH_B.activities,
    attendanceRecords: [],
    inspectionRecords: BRANCH_B.inspections,
    memberConfirmations: BRANCH_B.memberConfirmations,
    memberChangeRequests: BRANCH_B.memberChangeRequests,
    todos: BRANCH_B.todos,
  };
}

// ════════════════════════════════════════════════════════════════
//  标准答案构建（客户端纯函数；与 `docs/src` 消费点同一份函数）
// ════════════════════════════════════════════════════════════════

/**
 * 用纯派生函数为一个角色算出 7 键标准答案。
 * @returns {Object<string, {groupKey:string, count:number, itemIds:string[]}|null>}
 */
function buildGolden(data, role, todayStr) {
  const nowMs = new Date(`${todayStr}T12:00:00Z`).getTime();
  const out = {};
  const put = (key, group) => {
    out[key] = group
      ? { groupKey: group.groupKey, count: group.count, itemIds: (group.items || []).map((it) => String(it.id)) }
      : null;
  };
  put('attendance-remind', deriveAttendanceRemindGroup({
    activities: data.activities, attendanceRecords: data.attendanceRecords, today: todayStr,
  }));
  put('inspection-remind', deriveInspectionRemindGroup({
    inspectionRecords: data.inspectionRecords,
    persons: data.members,
    today: todayStr,
    now: nowMs,
    groupKeyPrefix: role === 'org-commissioner' ? 'org-commissioner' : 'secretary',
  }));
  if (role === 'secretary') {
    put('resolution-followup-remind', deriveResolutionFollowupRemindGroup({ activities: data.activities, today: todayStr }));
    put('member-confirm', deriveMemberConfirmGroup({
      memberConfirmations: data.memberConfirmations, memberChangeRequests: data.memberChangeRequests,
    }));
    put('semester-detained-remind', deriveSemesterDetainedRemindGroup({ members: data.members, today: todayStr }));
  }
  if (role === 'org-commissioner') {
    put('member-approve', deriveMemberApproveGroup({ memberChangeRequests: data.memberChangeRequests }));
    put('taskforce-authorize', deriveTaskforceAuthorizeGroup({ todos: data.todos, role }));
  }
  return out;
}

/** 比较器（门本体）：返回不一致项清单；空数组＝一致 */
function diffGroup(key, golden, actual) {
  const problems = [];
  if (!golden && !actual) return problems;
  if (!golden) { problems.push(`${key}: 标准答案无此组，服务端却返回了`); return problems; }
  if (!actual) { problems.push(`${key}: 标准答案有组（count=${golden.count}），服务端未返回`); return problems; }
  if (actual.groupKey !== golden.groupKey) problems.push(`${key}: groupKey 不等（期望 ${golden.groupKey}，实得 ${actual.groupKey}）`);
  if (actual.count !== golden.count) problems.push(`${key}: count 不等（期望 ${golden.count}，实得 ${actual.count}）`);
  const actualIds = (actual.items || []).map((it) => String(it.id));
  if (JSON.stringify(actualIds) !== JSON.stringify(golden.itemIds)) {
    problems.push(`${key}: 条目 id 集合/顺序不等（期望 [${golden.itemIds.join(',')}]，实得 [${actualIds.join(',')}]）`);
  }
  return problems;
}

// ════════════════════════════════════════════════════════════════
//  服务端装配（:memory: + 种子 + B 支部夹具）
// ════════════════════════════════════════════════════════════════

let app;
let server;
let base;

function insertRow(db, table, row) {
  db.prepare(`INSERT OR REPLACE INTO ${table} (id, data) VALUES (?, ?)`).run(row.id, JSON.stringify(row));
}

before(async () => {
  app = createApp({ dbPath: ':memory:' });
  const db = app.locals.db;
  await seedDatabase(db);
  // 双支部夹具：B 支部全部落库（与 `branchBData()` 同一份常量）
  insertRow(db, 'branches', BRANCH_B.branch);
  for (const u of BRANCH_B.users) insertRow(db, 'users', u);
  for (const a of BRANCH_B.activities) insertRow(db, 'activities', a);
  for (const r of BRANCH_B.inspections) insertRow(db, 'inspections', r);
  for (const r of BRANCH_B.memberConfirmations) insertRow(db, 'member_confirmations', r);
  for (const r of BRANCH_B.memberChangeRequests) insertRow(db, 'member_change_requests', r);
  for (const t of BRANCH_B.todos) insertRow(db, 'todos', t);
  server = app.listen(0);
  base = `http://127.0.0.1:${server.address().port}`;
});

after(() => {
  server.closeAllConnections?.();
  return new Promise((resolve) => server.close(resolve));
});

async function login(personId) {
  const res = await fetch(`${base}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ personId }),
  });
  assert.equal(res.status, 200, `登录失败 ${personId}`);
  return (await res.json()).token;
}

async function fetchGroups(token, query = '') {
  const res = await fetch(`${base}/api/v1/todo-groups${query}`, {
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
  });
  assert.equal(res.status, 200, `GET /todo-groups 失败：${res.status}`);
  return res.json();
}

/** 服务端返回里按 actionKey（回退 groupKey 后缀）取组 */
function serverGroupOf(body, key) {
  return (body.groups || []).find((g) => g.actionKey === key || String(g.groupKey || '').endsWith(`:${key}`)) || null;
}

// ════════════════════════════════════════════════════════════════
//  ① 标准答案 fixtures 与纯函数重算一致（日期稳定键）
// ════════════════════════════════════════════════════════════════

test('① 标准答案 fixtures 与纯函数重算一致（member-confirm / member-approve / taskforce-authorize）', async () => {
  const { readFileSync } = await import('node:fs');
  const fixture = JSON.parse(readFileSync(FIXTURE_PATH, 'utf8'));
  assert.equal(fixture.branch, DEFAULT_BRANCH_ID, 'fixtures 记录的是 A 支部（br-b1）');
  const golden = buildGolden(branchAData(fixture.today), 'secretary', fixture.today);
  const orgGolden = buildGolden(branchAData(fixture.today), 'org-commissioner', fixture.today);
  for (const role of Object.keys(ROLE_KEYS)) {
    const expected = role === 'secretary' ? golden : orgGolden;
    for (const key of ROLE_KEYS[role]) {
      if (!DATE_STABLE_KEYS.has(key)) continue;
      assert.deepEqual(fixture.roles[role][key], expected[key], `fixtures 与纯函数不一致（${role}/${key}）——如口径有意变更请重新生成`);
    }
  }
});

// ════════════════════════════════════════════════════════════════
//  ② 客户端标准答案 vs 服务端输出（逐键对账；打印已绿 / 仍红）
// ════════════════════════════════════════════════════════════════

test('② 同一数据同一角色：客户端标准答案 vs 服务端 7 类组逐字段对账（未实现键记红）', async () => {
  const day = today();
  const data = branchAData();
  const tokens = {
    secretary: await login(SECRETARY_ID),
    'org-commissioner': await login(ORG_COMMISSIONER_ID),
  };

  const green = [];
  const red = [];
  for (const role of Object.keys(ROLE_KEYS)) {
    const body = await fetchGroups(tokens[role], `?role=${role}`);
    const golden = buildGolden(data, role, day);
    for (const key of ROLE_KEYS[role]) {
      const supported = !(body.unsupported || []).includes(key);
      if (!supported) { red.push(`${role}/${key}`); continue; }
      const problems = diffGroup(key, golden[key], serverGroupOf(body, key));
      assert.deepEqual(problems, [], `对账不一致：\n  ${problems.join('\n  ')}`);
      green.push(`${role}/${key}`);
    }
  }

  // 仍红的键必须仍在 `unsupported` 里（服务端不得「声称支持却算不对」）
  const redKeySet = new Set(red.map((x) => x.split('/')[1]));
  for (const role of Object.keys(ROLE_KEYS)) {
    const body = await fetchGroups(tokens[role], `?role=${role}`);
    for (const key of ROLE_KEYS[role]) {
      if (!redKeySet.has(key)) continue;
      assert.ok((body.unsupported || []).includes(key), `${key} 记为红，但服务端未在 unsupported 中声明`);
    }
  }

  // 清单完整性：每个消费键恰好落在「已绿」或「仍红」之一
  const total = Object.values(ROLE_KEYS).reduce((n, keys) => n + keys.length, 0);
  assert.equal(green.length + red.length, total, '已绿 / 仍红 清单必须覆盖全部消费键');
  assert.equal(new Set([...green, ...red]).size, total, '同一键不得既绿又红');
  const greenKeys = new Set(green.map((x) => x.split('/')[1]));
  const redKeys = redKeySet;
  const green7 = DERIVE_KEYS.filter((k) => greenKeys.has(k));
  const red7 = DERIVE_KEYS.filter((k) => redKeys.has(k));
  assert.equal(green7.length + red7.length, DERIVE_KEYS.length, '7 类键必须逐键判绿或判红');

  console.log(`\n[todo-derive-parity] 7 类组对账（${day}）`);
  console.log(`  7 类已绿 ${green7.length}/7：${green7.length ? green7.join('、') : '（无）'}`);
  console.log(`  7 类仍红 ${red7.length}/7：${red7.length ? red7.join('、') : '（无）'}`);
  console.log(`  按角色：已绿 ${green.length}／仍红 ${red.length}`);
  console.log(`    已绿：${green.length ? green.join('、') : '（无）'}`);
  console.log(`    仍红：${red.length ? red.join('、') : '（无）'}`);
  console.log('  ↑ 仍红项＝Task 8 施工单（server/routes/todo-groups.js 逐键实现后自动转绿）\n');
});

// ════════════════════════════════════════════════════════════════
//  ③ 双支部夹具：A 看不到 B、B 看不到 A
// ════════════════════════════════════════════════════════════════

test('③ 双支部隔离：A 账号响应不含任何 B 条目，B 账号响应不含任何 A 条目', async () => {
  const allIdsOf = (data) => {
    const ids = new Set();
    for (const p of data.members) ids.add(String(p.id));
    for (const a of data.activities) { ids.add(String(a.id)); for (const g of a.agenda || []) ids.add(String(g.id)); }
    for (const r of data.inspectionRecords) ids.add(String(r.id));
    for (const r of data.memberConfirmations) ids.add(String(r.id));
    for (const r of data.memberChangeRequests) ids.add(String(r.id));
    for (const t of data.todos) ids.add(String(t.id));
    return ids;
  };
  const aIds = allIdsOf(branchAData());
  const bIds = allIdsOf(branchBData());

  const collect = (body) => {
    const ids = new Set();
    for (const g of body.groups || []) {
      for (const it of g.items || []) {
        if (it && it.id !== undefined) ids.add(String(it.id));
        if (it && it.personId) ids.add(String(it.personId));
        if (it && it.activityId) ids.add(String(it.activityId));
      }
    }
    return ids;
  };

  const aBody = await fetchGroups(await login(SECRETARY_ID), '?role=secretary');
  const bBody = await fetchGroups(await login('b-secretary'), '?role=secretary');

  const aLeak = [...collect(aBody)].filter((id) => bIds.has(id));
  assert.deepEqual(aLeak, [], `A 支部响应里出现了 B 支部条目：${aLeak.join(',')}`);
  const bLeak = [...collect(bBody)].filter((id) => aIds.has(id));
  assert.deepEqual(bLeak, [], `B 支部响应里出现了 A 支部条目：${bLeak.join(',')}`);

  // 标准答案本身也必须互斥（证明夹具造得够不同，隔离断言不是恒真）
  const aGolden = buildGolden(branchAData(), 'secretary', today());
  const bGolden = buildGolden(branchBData(), 'secretary', today());
  for (const key of ROLE_KEYS.secretary) {
    const a = aGolden[key] ? aGolden[key].itemIds : [];
    const b = bGolden[key] ? bGolden[key].itemIds : [];
    const overlap = a.filter((id) => b.includes(id));
    assert.deepEqual(overlap, [], `两支部标准答案在 ${key} 上重叠：${overlap.join(',')}`);
  }
  // B 夹具必须真的能派生出内容（否则隔离断言退化为空集比较）
  assert.ok(bGolden['attendance-remind'] || bGolden['inspection-remind'] || bGolden['member-confirm'],
    'B 支部夹具至少要派生出 1 个组，否则隔离判据空转');
});

// ════════════════════════════════════════════════════════════════
//  ④ 门非空转：篡改 id / count 必须判红
// ════════════════════════════════════════════════════════════════

test('④ 门非空转：篡改 count 或条目 id 必须判红，原样必须判绿', () => {
  const golden = { groupKey: 'secretary:member-confirm', count: 2, itemIds: ['mc-seed-1', 'mcr-seed-roster'] };
  const same = { groupKey: 'secretary:member-confirm', count: 2, items: [{ id: 'mc-seed-1' }, { id: 'mcr-seed-roster' }] };
  assert.deepEqual(diffGroup('member-confirm', golden, same), [], '原样应判绿');

  const badCount = { ...same, count: 1 };
  assert.ok(diffGroup('member-confirm', golden, badCount).some((p) => p.includes('count')), 'count 篡改必须判红');

  const badId = { ...same, items: [{ id: 'mc-seed-1' }, { id: 'b-mc-1' }] };
  assert.ok(diffGroup('member-confirm', golden, badId).some((p) => p.includes('条目 id')), 'id 篡改必须判红');

  const missing = null;
  assert.ok(diffGroup('member-confirm', golden, missing).length > 0, '服务端缺组必须判红');

  const extra = { groupKey: 'secretary:member-confirm', count: 0, items: [] };
  assert.ok(diffGroup('member-confirm', null, extra).length > 0, '标准答案无组而服务端有组必须判红');
});

// ════════════════════════════════════════════════════════════════
//  fixtures 生成入口（仅 WRITE_TODO_FIXTURE=1 时执行）
// ════════════════════════════════════════════════════════════════

if (process.env.WRITE_TODO_FIXTURE === '1') {
  const day = today();
  const data = branchAData();
  const roles = {};
  for (const role of Object.keys(ROLE_KEYS)) {
    const golden = buildGolden(data, role, day);
    roles[role] = {};
    for (const key of ROLE_KEYS[role]) roles[role][key] = golden[key];
  }
  const payload = {
    note: 'Plan B 标准答案（客户端纯派生结果）；日期敏感键仅作记录，对账时按运行时 today 重算。',
    branch: DEFAULT_BRANCH_ID,
    today: day,
    dateSensitiveKeys: DERIVE_KEYS.filter((k) => !DATE_STABLE_KEYS.has(k)),
    roles,
  };
  mkdirSync(dirname(FIXTURE_PATH), { recursive: true });
  writeFileSync(FIXTURE_PATH, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  console.log(`[todo-derive-parity] fixtures 已写入 ${FIXTURE_PATH}`);
}
