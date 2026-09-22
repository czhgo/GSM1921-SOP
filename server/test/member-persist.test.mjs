// role: [工程师]+[AI]
// server/test/member-persist.test.mjs — 立项⑥ A波：成员数据「网页化 + 双形态持久」底座（2026-09-06）
// 覆盖：
//   mock 形态（纯 node + localStorage 内存桩，前端模块经 ?v= query 导入，与 empty-template 同法）：
//   ① saveMember 新增（自动 p_ id / 显式 id）→ PersonStore 读链即时生效
//   ② saveMember 更新既有成员（字段级合并）→ 读链即时生效；模拟刷新（重 loadDB，覆盖层独立键）仍在
//   ③ removeMember 引用守卫命中拒绝（活动分工 p3 / 现任支书 p13）→ {ok:false, reason:'引用未清'}；
//      guardRefs:false 逃生口可强删
//   ④ removeMember 空引用可删（p50）→ 读链剔除 + 刷新仍剔除；?reset=demo（demo 档清 gsm1921-* 前缀）
//      清除覆盖层 = 回种子（p50 再现）
//   ⑤ replaceBranchMembers：到空支部（br-x 无历史）生效 + getRosterStats 应到即时变化；
//      到有历史支部（br-b1 有活动）默认拒绝（防孤儿）
//   ⑥ collectResetKeys demo 档含 members 覆盖层键（回种子语义纳入 demo 重置集）
//   api 形态（org-config 同款 HTTP，:memory: + seedDatabase；users 通用 CRUD 门 = party-staff）：
//   ⑦ server users create/update(PATCH)/delete 落库断言；非 party-staff（支书）写 users 403
//   ⑧ PersonStore api 形态 saveMember/removeMember 经 ApiAdapter 写 server users 落库断言
//      （setDataSource('api', {apiBaseUrl, authToken})；DISABLE_PASSWORD_CHECK 缺省时 password 走默认 '123456'）
// 运行：node --test test/member-persist.test.mjs（server 目录）
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';

import { PEOPLE } from '../../docs/src/mock/people.js?v=20260922k';
import { mockDB } from '../../docs/src/core/domain.js?v=20260922k';
import {
  MockAdapter, collectResetKeys, handleResetIfRequested,
} from '../../docs/src/core/mock-adapter.js?v=20260922k';
import {
  PersonStore, MEMBER_OVERLAY_KEY, getBaseMemberRecords, findMemberRefs,
} from '../../docs/src/services/person.js?v=20260922k';
import { getRosterStats } from '../../docs/src/services/roster.js?v=20260922k';
import { setDataSource } from '../../docs/src/core/data-adapter.js?v=20260922k';
// Q-23-10（批次 30）实证：成员流动流入登记在 api 形态走 /members/intake（支书/副支书亦可）
import { registerIntake } from '../../docs/src/services/member-flow.js?v=20260922k';
import { createApp } from '../app.js';
import { seedDatabase } from '../seed.js';

// ── localStorage 内存桩（含 key/length —— handleResetIfRequested 枚举用）──
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

/** 每例独立现场：重置 mockDB 业务域 + 清存储 + 恢复 seed（与 loadDB 首启语义一致） */
function beginMockCase() {
  _store.clear();
  delete globalThis.window;
  for (const k of [
    'activities', 'tasks', 'attendances', 'inspections', 'taskforces', 'notices', 'todos',
    'assignments', 'signups', 'activityReviews', 'taskforceReviews', 'agendaVotes',
    'memberChangeRequests', 'committeeBroadcasts', 'thoughtReports', 'branchDocs',
    'appointmentRecords', 'reviewRequests', 'archiveRecords',
    // 2026-09-14 批次 25：党小组一等实体域（每例独立现场需重置回种子）
    'partyGroups',
    // 2026-09-14 批次 25：成员流动台账（每例独立现场需重置）
    'memberFlows',
  ]) {
    mockDB[k] = [];
  }
  mockDB.branches = [];
  mockDB._loaded = false;
  setDataSource('mock'); // 数据源复位（api 用例可能已切换）
  MockAdapter.loadDB(); // seed：activities/tasks/assignments/archiveRecords/signups/branches
}

/** ?reset=demo 执行桩（window.localStorage 已为内存桩） */
function stubResetWindow(search, href) {
  const win = { location: { search, href } };
  win.location.replace = (url) => { win._replaced = String(url); };
  globalThis.window = win;
  return win;
}

// ═══════════════ mock 形态 ═══════════════

test('mock ①：saveMember 新增（显式新 id）→ 读链即时生效；getBaseMemberRecords 与 server users 对应物同视图', async () => {
  beginMockCase();
  const before = PersonStore.getMembers().length;
  const r = await PersonStore.saveMember({
    id: 'p51', name: '测试新成员51', studentId: '2600000051',
    partyGroup: '第一党小组', developStage: '积极分子', role: 'participant', branchId: 'br-b1',
  }, { by: 'p_pc' });
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.equal(r.member.id, 'p51');
  assert.equal(PersonStore.getById('p51').name, '测试新成员51', 'getAll/getName 读链即时生效');
  assert.equal(PersonStore.getMembers().length, before + 1);
  assert.equal(getBaseMemberRecords().some(p => p.id === 'p51'), true, '纯档案视图（MockAdapter.users.list 数据源）含新增');
  assert.equal(PersonStore.getMembers().some(p => p.id === 'p_pc'), true, 'p_pc 党委组织员仍在档案（server users 同源）');
});

test('mock ①b：saveMember 缺 id → 自动生成 p_ 前缀 id 新增', async () => {
  beginMockCase();
  const r = await PersonStore.saveMember({
    name: '自动编号成员', partyGroup: '第二党小组', developStage: '发展对象', role: 'participant',
  });
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.match(r.member.id, /^p_/, '自动 id 形如 p_<uuid>（与种子 p1~p50/p_pc 不冲突）');
  assert.equal(PersonStore.getMembers().some(p => p.id === r.member.id), true);
});

test('mock ②：saveMember 更新既有成员（字段级合并）→ 读链即时生效；重 loadDB（模拟刷新）覆盖层仍在', async () => {
  beginMockCase();
  const base = PersonStore.getById('p1');
  const r = await PersonStore.saveMember({ id: 'p1', name: '罗文杰·档案更新', developStage: '预备党员' }, { by: 'p11' });
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.equal(PersonStore.getById('p1').name, '罗文杰·档案更新');
  assert.equal(PersonStore.getById('p1').studentId, base.studentId, '未提供字段保留（基底合并）');
  assert.equal(PersonStore.getById('p1').partyGroup, '第一党小组');
  // 模拟刷新：members 覆盖层为独立 localStorage 键（gsm1921-members-overlay），重 loadDB 不触碰 → 仍持久
  MockAdapter.loadDB();
  assert.equal(PersonStore.getById('p1').name, '罗文杰·档案更新', '刷新后覆盖仍持久');
});

test('mock ③：removeMember 引用守卫命中拒绝——活动分工（p3）与现任支书（p13）', async () => {
  beginMockCase();
  const r1 = await PersonStore.removeMember('p3', { by: 'p_pc' });
  assert.equal(r1.ok, false, 'p3 被活动分工引用 → 拒绝');
  assert.match(r1.reason, /引用未清/);
  assert.ok(Array.isArray(r1.refs) && r1.refs.length > 0, '返回引用清单');
  assert.ok(r1.refs.some(x => x.domain === 'activities'), '命中活动分工域');
  assert.equal(PersonStore.getMembers().some(p => p.id === 'p3'), true, '拒绝后成员仍在');

  const r2 = await PersonStore.removeMember('p13', { by: 'p_pc' });
  assert.equal(r2.ok, false, 'p13 为 br-b1 现任支书（branches.secretaryId）→ 拒绝');
  assert.ok(r2.refs.some(x => x.domain === 'branches'), '命中支部现任支书域');

  const r3 = await PersonStore.removeMember('p7', { by: 'p_pc' });
  assert.equal(r3.ok, false, 'p7 被报名（signups）引用 → 拒绝');
  assert.ok(r3.refs.some(x => x.domain === 'signups'));

  // 逃生口（guardRefs:false）可强删（调用方自担孤儿）
  const force = await PersonStore.removeMember('p3', { guardRefs: false });
  assert.equal(force.ok, true, 'guardRefs:false 强制删除');
});

test('mock ④：removeMember 空引用可删（p50）→ 读链剔除 + 刷新仍剔除；?reset=demo 回种子（p50 再现）', async () => {
  beginMockCase();
  const refs = findMemberRefs('p50');
  assert.deepEqual(refs, [], 'p50 无业务引用');
  const r = await PersonStore.removeMember('p50', { by: 'p_pc' });
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.equal(PersonStore.getMembers().some(p => p.id === 'p50'), false, '读链即时剔除');
  assert.equal(PersonStore.getMembers().length, PEOPLE.length - 1);
  // 模拟刷新：删除标记（覆盖层 removedIds）独立键持久
  MockAdapter.loadDB();
  assert.equal(PersonStore.getMembers().some(p => p.id === 'p50'), false, '刷新后删除仍持久');
  // ?reset=demo 档：清 gsm1921-* 前缀键（含 members 覆盖层）= 回种子 → p50 再现
  stubResetWindow('?reset=demo', 'http://127.0.0.1:3000/index.html?reset=demo');
  assert.equal(handleResetIfRequested(), true);
  assert.equal(_store.has(MEMBER_OVERLAY_KEY), false, 'demo 档清除 members 覆盖层键');
  assert.equal(PersonStore.getMembers().some(p => p.id === 'p50'), true, '回种子：p50 再现');
});

test('mock ⑤：replaceBranchMembers 到空支部生效且 roster 应到即时变化；到有历史支部（br-b1）默认拒绝', async () => {
  beginMockCase();
  // 新空支部（业务域空：无活动/专班/思想汇报等）
  mockDB.branches = [...mockDB.branches, {
    id: 'br-x', name: '第二党支部（测试）', type: '硕士',
    config: { headerTitle: '第二党支部（测试）' }, secretaryId: null, status: 'active',
    createdAt: '2026-09-06T00:00:00.000Z',
  }];
  const statsBefore = getRosterStats({ branchId: 'br-x' });
  assert.equal(statsBefore.partyTotal, 0, '替换前空支部应到 0');
  const brB1Before = getRosterStats({ branchId: 'br-b1' }).partyTotal;
  assert.equal(brB1Before, 21, 'br-b1 在册党员 21（roster 口径基线，p5/p9 滞留仍在册）');
  // p31（预备党员）+ p24（预备党员）迁入 br-x（records 含 id + name；未给字段继承原档案）
  const r = await PersonStore.replaceBranchMembers([
    { id: 'p31', name: '刘子昂' },
    { id: 'p24', name: '曹雅婷' },
  ], { branchId: 'br-x', by: 'p_pc' });
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.equal(r.count, 2);
  const stats = getRosterStats({ branchId: 'br-x' });
  assert.equal(stats.partyTotal, 2, '替换后 br-x 应到 2（p31/p24 均为党员）');
  assert.equal(stats.expected, 2, '无滞留 → expected = partyTotal');
  assert.equal(PersonStore.getById('p31').branchId, 'br-x', 'p31 归属目标支部');
  assert.equal(PersonStore.getById('p24').branchId, 'br-x', 'p24 归属目标支部');
  // 原支部（br-b1）应到口径同步减少（读链整体一致：roster 走 PersonStore.getMembers 自动吃覆盖层）
  assert.equal(getRosterStats({ branchId: 'br-b1' }).partyTotal, brB1Before - 2, 'br-b1 党员随迁出减 2');
  // br-b1 有活动历史 → 默认拒绝（防孤儿）
  const deny = await PersonStore.replaceBranchMembers(
    [{ id: 'p31', name: '刘子昂' }], { branchId: 'br-b1', by: 'p_pc' });
  assert.equal(deny.ok, false);
  assert.match(deny.reason, /业务历史/);
});

test('mock ⑥：demo 重置集含 members 覆盖层键（gsm1921- 前缀自动纳入）；preview 档不清', () => {
  beginMockCase();
  const keys = collectResetKeys('demo', [MEMBER_OVERLAY_KEY, 'workflowos_branch_db_v1']);
  assert.ok(keys.includes(MEMBER_OVERLAY_KEY), 'demo 档清除 members 覆盖层键 = 回种子即清覆盖');
  const previewKeys = collectResetKeys('preview', [MEMBER_OVERLAY_KEY]);
  assert.equal(previewKeys.includes(MEMBER_OVERLAY_KEY), false, 'preview 档（运行时预览）不清 members 覆盖层');
});

test('mock ⑥b：MockAdapter.users 资源组（members 持久覆盖层子域读写）与 api-adapter.users 接口对称', async () => {
  beginMockCase();
  const list1 = await MockAdapter.users.list();
  assert.equal(list1.length, PEOPLE.length, 'list = PEOPLE 种子 + 覆盖层（含 p_pc，server users 表对应物）');
  assert.ok(list1.some(u => u.id === 'p_pc') && list1.some(u => u.id === 'p1'));
  const created = await MockAdapter.users.create({
    id: 'p52', name: '适配器写入52', studentId: '2600000052',
    partyGroup: '第一党小组', developStage: '积极分子', role: 'participant', branchId: 'br-b1',
  });
  assert.equal(created.id, 'p52');
  assert.equal(PersonStore.getById('p52').name, '适配器写入52', '读链（PersonStore）与 adapter 写同键同视图');
  const updated = await MockAdapter.users.update('p52', { name: '适配器写入52·改' });
  assert.equal(updated.name, '适配器写入52·改');
  assert.ok((await MockAdapter.users.list()).some(u => u.id === 'p52' && u.name === '适配器写入52·改'));
  const del = await MockAdapter.users.delete('p52');
  assert.equal(del.id, 'p52');
  assert.ok(!(await MockAdapter.users.list()).some(u => u.id === 'p52'), 'delete 后 list 不含');
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

test('api ⑦：server users 通用 CRUD 落库断言（POST 新增 / PATCH 更新 / DELETE 删除）；非 party-staff 403', async () => {
  staffToken = await login('p_pc'); // party-staff（党委组织员）
  // 支书（p13，非 party-staff）写 users → 403（RESOURCE_WRITE_GATE.users）
  const sec = await login('p13');
  const deny = await fetch(`${base}/api/v1/users`, {
    method: 'POST', headers: auth(sec),
    body: JSON.stringify({ id: 'p90', name: '越权成员', developStage: '积极分子', role: 'participant' }),
  });
  assert.equal(deny.status, 403, '非 party-staff 不得写 users');

  // create
  const post = await fetch(`${base}/api/v1/users`, {
    method: 'POST', headers: auth(staffToken),
    body: JSON.stringify({
      id: 'p60', name: '测试成员六十', studentId: '2600000060', partyGroup: '第一党小组',
      developStage: '积极分子', role: 'participant', branchId: 'br-b1',
    }),
  });
  assert.equal(post.status, 201);
  assert.equal((await post.json()).id, 'p60');
  assert.ok((await getUsers(staffToken)).some(u => u.id === 'p60'), '落库：GET 列表含新增');

  // update（PATCH 局部合并）
  const patch = await fetch(`${base}/api/v1/users/p60`, {
    method: 'PATCH', headers: auth(staffToken), body: JSON.stringify({ name: '测试成员六十·改', developStage: '发展对象' }),
  });
  assert.equal(patch.status, 200);
  const patched = await patch.json();
  assert.equal(patched.name, '测试成员六十·改');
  assert.equal(patched.studentId, '2600000060', 'PATCH 局部合并保留未提供字段');

  // delete → 204，列表不再含
  const del = await fetch(`${base}/api/v1/users/p60`, { method: 'DELETE', headers: auth(staffToken) });
  assert.equal(del.status, 204);
  assert.ok(!(await getUsers(staffToken)).some(u => u.id === 'p60'), '删除落库：GET 列表不含');
});

test('api ⑧：PersonStore api 形态 saveMember/removeMember 经名册语义端点写 server（R-10 写链）', async () => {
  const orgToken = await login('p11'); // br-b1 组织委员（名册维护角色）
  setDataSource('api', { apiBaseUrl: base, authToken: orgToken });
  try {
    const saved = await PersonStore.saveMember({
      id: 'p61', name: '接口写入成员61', studentId: '2600000061', partyGroup: '第二党小组',
      developStage: '积极分子',
    }, { by: 'p11' });
    assert.equal(saved.ok, true, JSON.stringify(saved));
    const created = (await getUsers(orgToken)).find(u => u.id === 'p61');
    assert.ok(created, 'saveMember(create) 落 server users（POST /members）');
    assert.equal(created.branchId, 'br-b1', '新增强制归操作人支部（防跨支部注入）');
    assert.equal(created.role, 'participant', '新增默认普通成员角色（治理字段不可注入）');
    assert.ok(mockDB.users.some(u => u.id === 'p61'), 'mockDB.users 缓存已同步');

    // api 形态 saveMember 更新（exists → PATCH /members/:id/profile，组织委员）
    const upd = await PersonStore.saveMember({ id: 'p61', name: '接口写入成员61·改' }, { by: 'p11' });
    assert.equal(upd.ok, true, JSON.stringify(upd));
    const row = (await getUsers(orgToken)).find(u => u.id === 'p61');
    assert.equal(row.name, '接口写入成员61·改', 'update 经 profile 端点落 server users');
    assert.equal(row.developStage, '积极分子', '局部更新保留其它字段');

    // R-10：移出 = 软标记「已转出」（原行保留、不删不匿名；与 mock removedIds 记录同语义）
    const removed = await PersonStore.removeMember('p61', { by: 'p11', transferOut: true });
    assert.equal(removed.ok, true, JSON.stringify(removed));
    const outRow = (await getUsers(orgToken)).find(u => u.id === 'p61');
    assert.ok(outRow, '软标记：users 行保留（不删不匿名，历史可解析姓名）');
    assert.equal(outRow.transferOut, true, 'users 行打 transferOut 标记');
    assert.ok(outRow.transferredOutAt, '转出时间落库');
    assert.ok(!mockDB.users.some(u => u.id === 'p61'), 'mockDB.users 缓存同步剔除');
  } finally {
    setDataSource('mock');
  }
});

// C-2 方案 B（2026-09-11 支书批）：名册成员变更确认链 API 形态修复回归
// ① 局部更新未提供 name → 不得误报「成员姓名不能为空」（原 person.js:526 误伤）
// ② 阶段写入经成员变更确认链走支书专属端点 POST /members/:id/develop-stage → 落 server users
test('api ⑨：局部更新缺 name 不再失败；支书阶段写入经新端点落库（成员变更确认链 API 形态）', async () => {
  const orgToken = await login('p11'); // br-b1 组织委员（名册档案维护）
  const secToken = await login('p13'); // br-b1 支书
  setDataSource('api', { apiBaseUrl: base, authToken: orgToken });
  try {
    // ① 局部更新（无 name）：原实现会因缺 name 先失败；现保留原姓名且落库
    const created = await PersonStore.saveMember({
      id: 'p62', name: '局部更新成员62', partyGroup: '第一党小组', developStage: '积极分子',
    }, { by: 'p11' });
    assert.equal(created.ok, true, JSON.stringify(created));
    const partial = await PersonStore.saveMember({ id: 'p62', partyGroup: '第三党小组' }, { by: 'p11' });
    assert.equal(partial.ok, true, `局部更新缺 name 不应失败：${JSON.stringify(partial)}`);
    const row = (await getUsers(orgToken)).find(u => u.id === 'p62');
    assert.equal(row.name, '局部更新成员62', '未提供 name → 保留原值（不覆盖）');
    assert.equal(row.partyGroup, '第三党小组', '提供的字段落库');
    assert.equal(row.developStage, '积极分子', '未提供字段保留');

    // ② 支书阶段写入（成员变更确认链 _applyApproved 形态：仅 { id, developStage }，无 name）
    setDataSource('api', { apiBaseUrl: base, authToken: secToken });
    const stage = await PersonStore.saveMember({ id: 'p1', developStage: '预备党员' }, { by: 'p13' });
    assert.equal(stage.ok, true, `支书阶段写入不应 403：${JSON.stringify(stage)}`);
    assert.equal(stage.member.developStage, '预备党员');
    assert.equal(stage.member.name, '罗文杰', '未提供 name → 服务端返回保留原值');
    assert.equal((await getUsers(secToken)).find(u => u.id === 'p1').developStage, '预备党员', '阶段落 server users');
    assert.equal(mockDB.users.find(u => u.id === 'p1').developStage, '预备党员', 'mockDB.users 缓存已同步');
  } finally {
    setDataSource('mock');
  }
});

// R-10（2026-09-11 支书裁定）：名册三条写链 API 形态双形态实证（PersonStore 分流语义端点）
// ① 在册状态镜像 = 成员变更确认链支书确认（residenceMirror）→ 支书专属 /members/:id/residence-status
// ② 名册行内在册属性 = 组织委员 /members/:id/profile（含在册字段）
// ③ 移出确认链（支书）→ /members/:id/transfer-out
test('api ⑩：R-10 三条链——支书在册镜像 / 组织委员在册行内 / 支书移出软标记均落库', async () => {
  const orgToken = await login('p11'); // br-b1 组织委员
  const secToken = await login('p13'); // br-b1 支书
  // ① 支书在册镜像（成员变更确认链 _applyApproved residence 形态）
  setDataSource('api', { apiBaseUrl: base, authToken: secToken });
  try {
    const mirror = await PersonStore.saveMember({
      id: 'p1', residenceStatus: '滞留', residenceNote: '交换一学期',
      residenceHistory: [{ from: '在校', to: '滞留', updatedBy: 'p13', updatedAt: new Date().toISOString() }],
    }, { by: 'p13', residenceMirror: true });
    assert.equal(mirror.ok, true, `支书在册镜像不应 403：${JSON.stringify(mirror)}`);
    const row = (await getUsers(secToken)).find(u => u.id === 'p1');
    assert.equal(row.residenceStatus, '滞留', '在册状态镜像经 residence-status 端点落库');
    assert.equal(row.residenceNote, '交换一学期');
    assert.ok(Array.isArray(row.residenceHistory) && row.residenceHistory.length === 1, '留痕镜像落库');
  } finally {
    setDataSource('mock');
  }

  // ② 组织委员名册行内在册属性维护（roster-tab 即时字段形态：在册字段走 profile 端点）
  setDataSource('api', { apiBaseUrl: base, authToken: orgToken });
  try {
    const inline = await PersonStore.saveMember({ id: 'p1', partyGroup: '第二党小组', residenceNote: '备注维护' }, { by: 'p11' });
    assert.equal(inline.ok, true, `组织委员行内维护不应 403：${JSON.stringify(inline)}`);
    const row = (await getUsers(orgToken)).find(u => u.id === 'p1');
    assert.equal(row.partyGroup, '第二党小组', '行内党小组经 profile 端点落库');
    assert.equal(row.residenceNote, '备注维护', '行内在册备注经 profile 端点落库');
    assert.equal(row.residenceStatus, '滞留', '未提供的在册状态保留');
  } finally {
    setDataSource('mock');
  }

  // ③ 移出确认链（支书确认 approved → removeMember transferOut:true）→ 软标记
  setDataSource('api', { apiBaseUrl: base, authToken: orgToken });
  try {
    const created = await PersonStore.saveMember({ id: 'p63', name: '待移出成员63', partyGroup: '第二党小组' }, { by: 'p11' });
    assert.equal(created.ok, true, JSON.stringify(created));
  } finally {
    setDataSource('mock');
  }
  setDataSource('api', { apiBaseUrl: base, authToken: secToken });
  try {
    const out = await PersonStore.removeMember('p63', { by: 'p13', guardRefs: false, transferOut: true });
    assert.equal(out.ok, true, `支书移出确认不应 403：${JSON.stringify(out)}`);
    const outRow = (await getUsers(secToken)).find(u => u.id === 'p63');
    assert.equal(outRow.transferOut, true, '支书确认移出软标记落库');
    assert.equal(outRow.name, '待移出成员63', '原行保留姓名（不匿名）');
  } finally {
    setDataSource('mock');
  }
});

// R-11（2026-09-14 批次 29，Q-23-5 闭环）：API 形态「撤销流出」清 server 软标记实证——
// 病灶复现：server 侧「转出」是软标记（原行保留），仅走 profile 补丁**不会**清除它，
//   /login 仍按「账号已停用」401、listUsers 读链仍排除该行 = 撤销后成员实际回不来。
// 修复：PersonStore.saveMember({ restoreFromTransferOut:true }) 先经
//   POST /members/:id/undo-transfer-out 清标记（revokeFlow 已接线；mock 形态忽略该选项）。
test('api ⑪：Q-23-5 撤销流出清 server 软标记（流出后 401 → 撤销后恢复可登录）', async () => {
  const orgToken = await login('p11'); // br-b1 组织委员
  setDataSource('api', { apiBaseUrl: base, authToken: orgToken });
  try {
    // ① 建档 + 流出（登记即生效的写原语：软标记 + 账号停用）
    const created = await PersonStore.saveMember({
      id: 'p64', name: '撤销流出测试', studentId: '2026999901', enrollYear: '2026',
    }, { by: 'p11' });
    assert.equal(created.ok, true, `建档应成功：${JSON.stringify(created)}`);
    const out = await PersonStore.removeMember('p64', { by: 'p11', guardRefs: false, transferOut: true });
    assert.equal(out.ok, true, `流出应成功：${JSON.stringify(out)}`);
    const outRow = (await getUsers(orgToken)).find(u => u.id === 'p64');
    assert.equal(outRow.transferOut, true, '流出后 users 行打 transferOut 软标记（原行保留）');
    const denied = await fetch(`${base}/api/v1/auth/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ personId: 'p64', password: '123456' }),
    });
    assert.equal(denied.status, 401, '流出后账号停用：服务端登录拒绝（server 权威）');

    // ② 病灶复现：不带 restoreFromTransferOut 的常规档案补丁**清不掉**软标记
    const plain = await PersonStore.saveMember({ id: 'p64', name: '撤销流出测试' }, { by: 'p11' });
    assert.equal(plain.ok, true, `常规补丁应成功：${JSON.stringify(plain)}`);
    assert.equal((await getUsers(orgToken)).find(u => u.id === 'p64').transferOut, true,
      '仅走 profile 补丁不会清软标记（Q-23-5 病灶：撤销后成员仍回不来）');

    // ③ 撤销流出（revokeFlow 的实际调用形态）→ 清 server 软标记
    const restored = await PersonStore.saveMember({
      id: 'p64', name: '撤销流出测试', studentId: '2026999901', enrollYear: '2026',
    }, { by: 'p11', restoreFromTransferOut: true });
    assert.equal(restored.ok, true, `撤销应成功：${JSON.stringify(restored)}`);
    const backRow = (await getUsers(orgToken)).find(u => u.id === 'p64');
    assert.ok(backRow, '撤销后原行仍在库（软标记语义不删行）');
    assert.equal(backRow.transferOut, undefined, '★ Q-23-5 修复点：transferOut 软标记已清除');
    assert.equal(backRow.removedAt, undefined, 'removedAt 一并清除');
    assert.equal(backRow.transferredOutAt, undefined, 'transferredOutAt 一并清除');
    assert.equal(backRow.name, '撤销流出测试', '档案字段保留');

    // ④ 账号恢复（服务端权威：软标记已清 → 登录恢复）
    const resumed = await fetch(`${base}/api/v1/auth/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ personId: 'p64', password: '123456' }),
    });
    assert.equal(resumed.status, 200, '★ 撤销后账号恢复可登录（成员真的回来了）');
  } finally {
    setDataSource('mock');
  }
});

// R-12（2026-09-14 批次 30，Q-23-10 闭环）：API 形态「流入登记」角色门实证——
// 病灶：流入建档原走 POST /members（R-10 组织委员专属）→ 支书/副支书登记流入被 403 阻断
//   （§9i/R-42 却写明「成员流动登记 = 组织委员 + 支书/副支书」，两条裁定在 api 形态冲突）。
// 裁定「维持 §9i」→ 单列语义端点 POST /members/intake（写门 MEMBER_FLOW_ROLES），
//   **不动 POST /members 的 R-10 专属门**（不扩大名册越权面）。
test('api ⑫：Q-23-10 流入登记三角色皆可（/members/intake）；名册新增仍守 R-10 专属', async () => {
  const secToken = await login('p13'); // 支书
  const depToken = await login('p14'); // 副支书（副书同权）
  const orgToken = await login('p11'); // 组织委员（原路径不回归）

  // ① 支书登记流入（修复点：修复前此处 403 Forbidden）
  setDataSource('api', { apiBaseUrl: base, authToken: secToken });
  try {
    const r = await registerIntake({
      name: '支书登记流入', studentId: '2699000002', enrollYear: '2026', by: 'p13', role: 'secretary',
    });
    assert.equal(r.ok, true, `★ 支书登记流入不应 403：${JSON.stringify(r)}`);
    const row = (await getUsers(secToken)).find((u) => u.id === r.person.id);
    assert.ok(row, '流入建档落 server users');
    assert.equal(row.name, '支书登记流入');
    assert.equal(row.branchId, 'br-b1', '强制归操作人支部（防跨支部注入）');
    assert.equal(row.role, 'participant', '默认普通成员角色（防注入治理字段）');
    assert.equal(row.studentId, '2699000002', '学号落档（账号派生依据）');
    // 名册新增仍守 R-10：支书直调 /members 依旧 403（不因流入端点而放宽）
    const deny = await fetch(`${base}/api/v1/members`, {
      method: 'POST', headers: auth(secToken), body: JSON.stringify({ name: '支书越权名册新增' }),
    });
    assert.equal(deny.status, 403, '名册新增仍为组织委员专属（R-10 未被放宽）');
  } finally {
    setDataSource('mock');
  }

  // ② 副支书登记流入（副书同权）
  setDataSource('api', { apiBaseUrl: base, authToken: depToken });
  try {
    const r = await registerIntake({
      name: '副支书登记流入', studentId: '2699000003', enrollYear: '2026', by: 'p14', role: 'deputy-secretary',
    });
    assert.equal(r.ok, true, `副支书登记流入不应 403：${JSON.stringify(r)}`);
  } finally {
    setDataSource('mock');
  }

  // ③ 组织委员登记流入（原路径不回归）
  setDataSource('api', { apiBaseUrl: base, authToken: orgToken });
  try {
    const r = await registerIntake({
      name: '组织委员登记流入', studentId: '2699000004', enrollYear: '2026', by: 'p11', role: 'org-commissioner',
    });
    assert.equal(r.ok, true, `组织委员登记流入不应 403：${JSON.stringify(r)}`);
  } finally {
    setDataSource('mock');
  }
});
