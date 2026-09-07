// role: [工程师]+[AI]
// server/test/member-persist.test.mjs — 立项⑥ A波：成员数据「网页化 + 双形态持久」底座（2026-09-06）
// 覆盖：
//   mock 形态（纯 node + localStorage 内存桩，前端模块经 ?v= query 导入，与 empty-template 同法）：
//   ① saveMember 新增（自动 p_ id / 显式 id）→ PersonStore 读链即时生效
//   ② saveMember 更新既有成员（字段级合并）→ 读链即时生效；模拟刷新（重 loadDB，覆盖层独立键）仍在
//   ③ removeMember 引用守卫命中拒绝（活动分工 p3 / 现任书记 p13）→ {ok:false, reason:'引用未清'}；
//      guardRefs:false 逃生口可强删
//   ④ removeMember 空引用可删（p50）→ 读链剔除 + 刷新仍剔除；?reset=demo（demo 档清 gsm1921-* 前缀）
//      清除覆盖层 = 回种子（p50 再现）
//   ⑤ replaceBranchMembers：到空支部（br-x 无历史）生效 + getRosterStats 应到即时变化；
//      到有历史支部（br-b1 有活动）默认拒绝（防孤儿）
//   ⑥ collectResetKeys demo 档含 members 覆盖层键（回种子语义纳入 demo 重置集）
//   api 形态（org-config 同款 HTTP，:memory: + seedDatabase；users 通用 CRUD 门 = party-staff）：
//   ⑦ server users create/update(PATCH)/delete 落库断言；非 party-staff（书记）写 users 403
//   ⑧ PersonStore api 形态 saveMember/removeMember 经 ApiAdapter 写 server users 落库断言
//      （setDataSource('api', {apiBaseUrl, authToken})；DISABLE_PASSWORD_CHECK 缺省时 password 走默认 '123456'）
// 运行：node --test test/member-persist.test.mjs（server 目录）
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';

import { PEOPLE } from '../../docs/src/mock/people.js?v=20260903c';
import { mockDB } from '../../docs/src/core/domain.js?v=20260903c';
import {
  MockAdapter, collectResetKeys, handleResetIfRequested,
} from '../../docs/src/core/mock-adapter.js?v=20260903c';
import {
  PersonStore, MEMBER_OVERLAY_KEY, getBaseMemberRecords, findMemberRefs,
} from '../../docs/src/services/person.js?v=20260907b';
import { getRosterStats } from '../../docs/src/services/roster.js?v=20260903c';
import { setDataSource } from '../../docs/src/core/data-adapter.js?v=20260903c';
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

test('mock ③：removeMember 引用守卫命中拒绝——活动分工（p3）与现任书记（p13）', async () => {
  beginMockCase();
  const r1 = await PersonStore.removeMember('p3', { by: 'p_pc' });
  assert.equal(r1.ok, false, 'p3 被活动分工引用 → 拒绝');
  assert.match(r1.reason, /引用未清/);
  assert.ok(Array.isArray(r1.refs) && r1.refs.length > 0, '返回引用清单');
  assert.ok(r1.refs.some(x => x.domain === 'activities'), '命中活动分工域');
  assert.equal(PersonStore.getMembers().some(p => p.id === 'p3'), true, '拒绝后成员仍在');

  const r2 = await PersonStore.removeMember('p13', { by: 'p_pc' });
  assert.equal(r2.ok, false, 'p13 为 br-b1 现任书记（branches.secretaryId）→ 拒绝');
  assert.ok(r2.refs.some(x => x.domain === 'branches'), '命中支部现任书记域');

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
  // 书记（p13，非 party-staff）写 users → 403（RESOURCE_WRITE_GATE.users）
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

test('api ⑧：PersonStore api 形态 saveMember/removeMember 经 ApiAdapter 写 server users 落库', async () => {
  if (!staffToken) staffToken = await login('p_pc');
  setDataSource('api', { apiBaseUrl: base, authToken: staffToken });
  try {
    const saved = await PersonStore.saveMember({
      id: 'p61', name: '接口写入成员61', studentId: '2600000061', partyGroup: '第二党小组',
      developStage: '积极分子', role: 'participant', branchId: 'br-b1',
    }, { by: 'p_pc' });
    assert.equal(saved.ok, true, JSON.stringify(saved));
    assert.ok((await getUsers(staffToken)).some(u => u.id === 'p61'), 'saveMember(create) 落 server users');
    assert.ok(mockDB.users.some(u => u.id === 'p61'), 'mockDB.users 缓存已同步');

    // api 形态 saveMember 更新（exists → PATCH）
    const upd = await PersonStore.saveMember({ id: 'p61', name: '接口写入成员61·改' }, { by: 'p_pc' });
    assert.equal(upd.ok, true, JSON.stringify(upd));
    const row = (await getUsers(staffToken)).find(u => u.id === 'p61');
    assert.equal(row.name, '接口写入成员61·改', 'update 落 server users');
    assert.equal(row.developStage, '积极分子', '局部更新保留其它字段');

    const removed = await PersonStore.removeMember('p61', { by: 'p_pc' });
    assert.equal(removed.ok, true, JSON.stringify(removed));
    assert.ok(!(await getUsers(staffToken)).some(u => u.id === 'p61'), 'removeMember(delete) 落 server users');
    assert.ok(!mockDB.users.some(u => u.id === 'p61'), 'mockDB.users 缓存同步移除');
  } finally {
    setDataSource('mock');
  }
});
