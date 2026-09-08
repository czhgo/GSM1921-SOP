// role: [工程师]+[AI]
// server/test/branch-roster-import.test.mjs — 立项⑥ B波：空支部「整表导入/替换名册」（2026-09-06）
// 覆盖（复用服务层，不测 DOM）：
//   mock 形态（纯 node + localStorage 内存桩，前端模块经 ?v= query 导入，与 member-persist 同法）：
//   ① sanitizeBranchRoster 净化有效包 → valid + 净化行（档案字段继承）+ 统计卡读数正确（应到口径）
//   ② 非法行策略：白名单外 id / 空姓名 → 丢弃；非法枚举 → 回退档案原值（不丢人）；数组输入兼容
//   ③ 坏文件 / 全非法 → 可读原因；预览模板包（kind=gsm1921-base-data）可复用导入
//   ④ 空支部整表导入落库：净化 → PersonStore.replaceBranchMembers → getRosterStats 即时变化 +
//      重 loadDB（模拟刷新）仍持久；原支部相应减员
//   ⑤ 非空/有历史支部（br-b1）整表替换被服务拒绝（防孤儿）
//   api 形态（org-config 同款 HTTP，:memory: + seedDatabase；users 通用 CRUD 门 = party-staff）：
//   ⑥ PersonStore.replaceBranchMembers（api 形态）整支部替换落 server users：目标空支部成员
//      branchId 落库、源支部减员、mockDB.users 缓存同步
// 运行：node --test test/branch-roster-import.test.mjs（server 目录）
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';

import { mockDB } from '../../docs/src/core/domain.js?v=20260908c';
import { MockAdapter } from '../../docs/src/core/mock-adapter.js?v=20260908c';
import {
  PersonStore, getBaseMemberRecords,
} from '../../docs/src/services/person.js?v=20260908c';
import { getRosterStats } from '../../docs/src/services/roster.js?v=20260908c';
import {
  BRANCH_ROSTER_KIND, BRANCH_ROSTER_VERSION,
  buildBranchRosterTemplate, sanitizeBranchRoster,
} from '../../docs/src/services/branch-roster-import.js?v=20260908c';
import { buildPreviewTemplate } from '../../docs/src/services/org-base-data-preview.js?v=20260908c';
import { setDataSource } from '../../docs/src/core/data-adapter.js?v=20260908c';
import { createApp } from '../app.js';
import { seedDatabase } from '../seed.js';

// ── localStorage 内存桩（含 key/length）──
const _store = new Map();
globalThis.localStorage = {
  getItem: (k) => (_store.has(String(k)) ? _store.get(String(k)) : null),
  setItem: (k, v) => _store.set(String(k), String(v)),
  removeItem: (k) => { _store.delete(String(k)); },
  clear: () => { _store.clear(); },
  key: (i) => [..._store.keys()][i] ?? null,
  get length() { return _store.size; },
};
globalThis.sessionStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };

/** 每例独立现场：重置 mockDB 业务域 + 清存储 + 恢复 seed（与 member-persist 同法） */
function beginMockCase() {
  _store.clear();
  delete globalThis.window;
  for (const k of [
    'activities', 'tasks', 'attendances', 'inspections', 'taskforces', 'notices', 'todos',
    'assignments', 'signups', 'activityReviews', 'taskforceReviews', 'agendaVotes',
    'memberChangeRequests', 'committeeBroadcasts', 'thoughtReports', 'branchDocs',
    'appointmentRecords', 'reviewRequests', 'archiveRecords',
  ]) {
    mockDB[k] = [];
  }
  mockDB.branches = [];
  mockDB._loaded = false;
  setDataSource('mock'); // 数据源复位（api 用例可能已切换）
  MockAdapter.loadDB(); // seed：activities/tasks/assignments/archiveRecords/signups/branches
}

/** 档案中给定 id 的记录（净化回退断言用） */
function archiveOf(id) {
  return getBaseMemberRecords().find(p => p.id === id);
}

// ═══════════════ 净化（sanitizeBranchRoster） ═══════════════

test('净化①：名册包净化 → valid + 净化行（档案字段继承/可改字段生效）+ 统计卡应到口径正确', () => {
  beginMockCase();
  // 模板：kind/version + people 行结构（行内容复用 buildPreviewTemplate）
  const tpl = buildBranchRosterTemplate();
  assert.equal(tpl.kind, BRANCH_ROSTER_KIND);
  assert.equal(tpl.version, BRANCH_ROSTER_VERSION);
  assert.equal(tpl.people.length, 50, '可迁成员 = 档案成员（PEOPLE 51 − 党委组织员 p_pc）');
  assert.ok(tpl.people.every(r => r.id && r.name && r.partyGroup && r.developStage), '模板行含 id/name/党小组/发展阶段');

  // p31 改党小组 → 第二党小组；p24 只给 id+name（其余继承档案）
  const pkg = {
    kind: BRANCH_ROSTER_KIND,
    version: BRANCH_ROSTER_VERSION,
    people: [
      { id: 'p31', name: '刘子昂', partyGroup: '第二党小组' },
      { id: 'p24', name: '曹雅婷' },
    ],
  };
  const res = sanitizeBranchRoster(pkg);
  assert.equal(res.valid, true, JSON.stringify(res));
  assert.equal(res.dropped, 0);
  assert.equal(res.people.length, 2);
  const r31 = res.people.find(r => r.id === 'p31');
  const r24 = res.people.find(r => r.id === 'p24');
  assert.equal(r31.partyGroup, '第二党小组', '文件党小组编辑生效');
  assert.equal(r31.developStage, '预备党员', '未给字段继承档案（p31 预备党员）');
  assert.equal(r31.studentId, archiveOf('p31').studentId, 'studentId 档案权威带出（api 重建整行完整）');
  assert.equal(r31.role, archiveOf('p31').role, 'role 档案权威带出');
  assert.equal(r24.partyGroup, '第三党小组', 'p24 档案党小组继承');
  // 统计卡（目标空支部导入后 = 净化行整体）：在册党员 2（均预备）、应到 2、无滞留
  assert.equal(res.stats.partyTotal, 2);
  assert.equal(res.stats.official, 0);
  assert.equal(res.stats.probationary, 2);
  assert.equal(res.stats.detained, 0);
  assert.equal(res.stats.expected, 2);
  assert.equal(res.stats.perGroup['第二党小组'].partyTotal, 1, 'p31 编辑后归第二党小组');
  assert.equal(res.stats.perGroup['第二党小组'].expected, 1);
  assert.equal(res.stats.perGroup['第三党小组'].partyTotal, 1);
  assert.equal(res.stats.perGroup['第一党小组'].partyTotal, 0);

  // 数组输入（无 kind 包）兼容
  const arrRes = sanitizeBranchRoster([{ id: 'p5', name: '宋佳宁' }]);
  assert.equal(arrRes.valid, true, JSON.stringify(arrRes));
  assert.equal(arrRes.people[0].residenceStatus, '滞留', '档案滞留状态继承（p5 滞留示范）');
  assert.equal(arrRes.stats.partyTotal, 1);
  assert.equal(arrRes.stats.detained, 1, '滞留党员统计在册基数');
  assert.equal(arrRes.stats.expected, 0, '应到 = 党员 − 滞留（口径 excludeDetained）');
});

test('净化②：白名单外 id / 空姓名 → 丢弃；非法枚举 → 回退档案原值（不丢人）', () => {
  beginMockCase();
  const res = sanitizeBranchRoster([
    { id: 'p999', name: '幽灵成员' },                       // 白名单外 → 丢弃
    { id: 'p24', name: '   ' },                              // 空姓名 → 丢弃
    { id: 'p31', name: '刘子昂', partyGroup: '第四党小组' },  // 非法枚举 → 回退档案
    { id: 'p1', name: '罗文杰', developStage: '群众', residenceStatus: '离职' }, // 非法枚举 → 回退档案
    { id: 'p5', name: '宋佳宁' },                            // 合法（档案滞留继承）
  ]);
  assert.equal(res.valid, true, JSON.stringify(res));
  assert.equal(res.dropped, 2, '白名单外 + 空姓名共丢弃 2 条');
  assert.equal(res.people.length, 3);
  const r31 = res.people.find(r => r.id === 'p31');
  assert.equal(r31.partyGroup, '第一党小组', 'partyGroup 非法 → 回退档案原值（p31 第一党小组）');
  const r1 = res.people.find(r => r.id === 'p1');
  assert.equal(r1.developStage, '正式党员', 'developStage 非法 → 回退档案原值');
  assert.equal(r1.residenceStatus, '在校', 'residenceStatus 非法 → 回退档案/缺省在校');
  assert.equal(res.stats.partyTotal, 3);
  assert.equal(res.stats.official, 2, 'p1/p5 正式 + p31 预备');
  assert.equal(res.stats.detained, 1, 'p5 滞留');
});

test('净化③：坏文件 / 全非法 / 版本与 kind 门槛 → 可读原因；预览模板包可复用', () => {
  beginMockCase();
  const invalid = (input, re) => {
    const r = sanitizeBranchRoster(input);
    assert.equal(r.valid, false, `应判无效：${JSON.stringify(input).slice(0, 60)}`);
    assert.ok(re.test(r.reason || ''), `原因可读：${r.reason}`);
  };
  invalid(null, /未识别到成员名册/);
  invalid({}, /未识别到成员名册/);
  invalid({ kind: 'other-kind', people: [{ id: 'p1', name: '罗文杰' }] }, /不是成员名册文件/);
  invalid({ kind: BRANCH_ROSTER_KIND, version: 9, people: [{ id: 'p1', name: '罗文杰' }] }, /版本不支持/);
  invalid({ kind: BRANCH_ROSTER_KIND, people: [] }, /名单为空/);
  invalid([{ id: 'p999', name: '幽灵成员' }], /无有效成员/);
  invalid('not-json', /未识别到成员名册/);

  // 预览模板包（换组织向导下载文件 kind=gsm1921-base-data）行结构同源 → 可复用导入
  const previewPkg = buildPreviewTemplate();
  assert.equal(previewPkg.kind, 'gsm1921-base-data');
  const rp = sanitizeBranchRoster(previewPkg);
  assert.equal(rp.valid, true, JSON.stringify(rp).slice(0, 200), '预览模板包 kind 兼容导入');
  assert.equal(rp.people.length, previewPkg.people.length);
  assert.equal(rp.dropped, 0, '预览全量模板行全部在档案白名单内');
});

// ═══════════════ mock 形态：空支部整表导入落库 ═══════════════

test('mock ④：净化 → 空支部 replaceBranchMembers 落库 → getRosterStats 即时变化 + 刷新持久 + 原支部减员', async () => {
  beginMockCase();
  // 新空支部（业务域空：无活动/专班/思想汇报等；与 member-persist mock⑤ 同法）
  mockDB.branches = [...mockDB.branches, {
    id: 'br-x', name: '硕士党支部（导入测试）', type: '硕士',
    config: { headerTitle: '硕士党支部（导入测试）' }, secretaryId: null, status: 'active',
    createdAt: '2026-09-06T00:00:00.000Z',
  }];
  const before = getRosterStats({ branchId: 'br-x' });
  assert.equal(before.partyTotal, 0, '替换前空支部应到 0');
  const brB1Before = getRosterStats({ branchId: 'br-b1' }).partyTotal;
  assert.equal(brB1Before, 21, 'br-b1 在册党员 21（roster 基线）');

  // 净化（模拟网页导入流程：选文件 → sanitizeBranchRoster）→ 落库
  const clean = sanitizeBranchRoster({
    kind: BRANCH_ROSTER_KIND,
    people: [
      { id: 'p31', name: '刘子昂', partyGroup: '第一党小组' },
      { id: 'p24', name: '曹雅婷' },
      { id: 'p5', name: '宋佳宁' }, // 滞留党员也在名册内（组织关系保留）
    ],
  });
  assert.equal(clean.valid, true, JSON.stringify(clean));
  const r = await PersonStore.replaceBranchMembers(clean.people, { branchId: 'br-x', by: 'p_pc' });
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.equal(r.count, 3);
  assert.equal(r.branchId, 'br-x');

  // 应到统计即时变化（读链 = PersonStore.getMembers 自动吃覆盖层）
  const stats = getRosterStats({ branchId: 'br-x' });
  assert.equal(stats.partyTotal, 3, 'p31/p24 预备 + p5 正式 = 党员 3');
  assert.equal(stats.detainedParty, 1, 'p5 滞留被剔除');
  assert.equal(stats.expected, 2, '应到 = 3 − 1 滞留');
  assert.equal(PersonStore.getById('p31').branchId, 'br-x');
  assert.equal(PersonStore.getById('p5').branchId, 'br-x');
  assert.equal(getRosterStats({ branchId: 'br-b1' }).partyTotal, brB1Before - 3, '原支部党员随迁出减 3');

  // 模拟刷新：members 覆盖层独立键持久（重 loadDB 不触碰）→ 归属与统计保持
  MockAdapter.loadDB();
  assert.equal(PersonStore.getById('p31').branchId, 'br-x', '刷新后迁移仍持久');
  assert.equal(getRosterStats({ branchId: 'br-x' }).partyTotal, 3);
  assert.equal(getRosterStats({ branchId: 'br-x' }).expected, 2);
});

test('mock ⑤：有历史支部（br-b1）整表替换被服务拒绝（防孤儿）', async () => {
  beginMockCase();
  const clean = sanitizeBranchRoster([{ id: 'p31', name: '刘子昂' }]);
  assert.equal(clean.valid, true);
  const deny = await PersonStore.replaceBranchMembers(clean.people, { branchId: 'br-b1', by: 'p_pc' });
  assert.equal(deny.ok, false);
  assert.match(deny.reason, /业务历史/);
  assert.equal(PersonStore.getById('p31').branchId, 'br-b1', '拒绝后成员归属不变');
});

// ═══════════════ api 形态（server users 落库） ═══════════════

let server, base;
let staffToken;

before(async () => {
  const app = createApp({ dbPath: ':memory:' });
  await seedDatabase(app.locals.db);
  server = app.listen(0);
  base = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  setDataSource('mock');
  delete globalThis.window;
  server.closeAllConnections?.();
  await new Promise((resolve) => server.close(resolve));
});

async function login(personId) {
  const res = await fetch(`${base}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ personId, password: '123456' }),
  });
  assert.equal(res.status, 200, `登录失败 ${personId}`);
  return (await res.json()).token;
}
function auth(token) {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}
async function getUsers(token) {
  const res = await fetch(`${base}/api/v1/users`, { headers: auth(token) });
  assert.equal(res.status, 200);
  return res.json();
}

test('api ⑥：replaceBranchMembers（api 形态）整支部替换落 server users——目标空支部建、源支部减员、缓存同步', async () => {
  beginMockCase(); // 重置 mockDB 业务域（历史守卫的 mockDB 缓存：br-b1 有活动）
  if (!staffToken) staffToken = await login('p_pc');

  // 党委在服务端建空支部（POST /branches mode=empty；与 empty-template ⑤ 同法）
  const created = await fetch(`${base}/api/v1/branches`, {
    method: 'POST', headers: auth(staffToken),
    body: JSON.stringify({ mode: 'empty', name: '硕士党支部（api 导入测试）', type: '硕士' }),
  });
  assert.equal(created.status, 201);
  const { branch } = await created.json();
  assert.match(branch.id, /^br-[0-9a-f]{8}$/);
  // 镜像浏览器 init：GET /branches 列表 → mockDB.branches（person.js 历史守卫读 mockDB 缓存）
  mockDB.branches = [...(mockDB.branches || []), branch];

  setDataSource('api', { apiBaseUrl: base, authToken: staffToken });
  try {
    // 净化（本地档案白名单与 mock 形态同规则）→ api 形态落库
    const clean = sanitizeBranchRoster([
      { id: 'p31', name: '刘子昂' },
      { id: 'p24', name: '曹雅婷' },
    ]);
    assert.equal(clean.valid, true, JSON.stringify(clean));
    const r = await PersonStore.replaceBranchMembers(clean.people, { branchId: branch.id, by: 'p_pc' });
    assert.equal(r.ok, true, JSON.stringify(r));
    assert.equal(r.count, 2);

    // server users 落库断言：p31/p24 branchId = 目标空支部；净化行带全字段（重建整行完整）
    const users = await getUsers(staffToken);
    const u31 = users.find(u => u.id === 'p31');
    assert.equal(u31.branchId, branch.id, 'p31 归属目标支部（server users 落库）');
    assert.equal(u31.name, '刘子昂');
    assert.equal(u31.developStage, '预备党员', '净化行携带档案字段 → api 重建不丢发展阶段');
    assert.equal(u31.partyGroup, '第一党小组');
    assert.equal(users.filter(u => u.branchId === branch.id).length, 2, '目标支部恰 2 名成员');
    assert.equal(users.filter(u => (u.branchId || 'br-b1') === 'br-b1').length, 49,
      '源支部 br-b1 桶减员 2（PEOPLE 51 − p31/p24；p_pc branchId null 兜底归 br-b1 桶）');
    // mockDB.users 缓存同步（_apiReplaceBranchMembers 整支部维度重拉）
    assert.equal((mockDB.users || []).find(u => u.id === 'p31')?.branchId, branch.id, 'mockDB.users 缓存同步 p31 归属');
  } finally {
    setDataSource('mock');
  }
});
