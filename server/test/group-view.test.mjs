// role: [工程师]+[AI]
// server/test/group-view.test.mjs — 党小组分组只读聚合口径单测（支书台「党小组进展」D8，2026-09-08）
// 形态（2026-09-23 提速批 · 任务二第 1 批：**A 类（纯 node+mock）→ B 类（起内存服务打 API）**）：
//   改造前是纯 mock 形态，`PersonStore.getMembers()` 读的是 `docs/src/data/mock/people.js` **静态种子**。
//   而本仓已坐实的架构缺口恰恰是「**api 形态下前端部分读链仍返回静态种子**」——
//   `server/test/form-loop-registry.mjs` 47-S 自纠处点名：`org-roster-member-add-save` 那条缺口的成因。
//   故本文件改为：起 `:memory:` 服务 → `seedDatabase` → **真登录**取 token → `setDataSource('api')` → `init()`。
//   ⇒ 组清单 / 党员数 / 组员口径三类**读到的东西必须来自服务端 users**，不再是从本地静态种子读。
//   体例照既有 B 类先例：`permission-gate.test.mjs` / `server-base.test.mjs` / `member-persist.test.mjs` 的 api 段。
// 覆盖（**判据一字未改**，只换数据来源）：组清单（partyGroup 聚合顺序/组长/党员数/成员数）、branch 过滤、
//   组员口径（不含组长）、待答复汇报开放数（open/closed/hidden/merged/组长自身排除）、本组活动判定
//   （organizer 属组/取消/归档）、复盘分桶（无记录/未提交/已打回 → pending；已上传/批注中/已确认 → completed）。
// 口径单一源注释见 docs/src/services/member/group-view.js 头部。
// ⚠️ 对 docs/src 的相对 import 必须带与源码一致的 ?v= query（模块缓存键一致性）——**api 形态下尤其致命**：
//   少了 `?v=` 就是**两份 data-adapter 实例**，适配器注册不到、`init()` 直接抛「API 适配器尚未实现」（实测踩过一次）。
import { test, after } from 'node:test';
import assert from 'node:assert/strict';

// ── localStorage / sessionStorage 内存桩（成员档案读链惰性访问需要；照 roster.test 同款）──
function makeStorage(init = {}) {
  const m = new Map(Object.entries(init).map(([k, v]) => [String(k), String(v)]));
  return {
    getItem: (k) => (m.has(String(k)) ? m.get(String(k)) : null),
    setItem: (k, v) => m.set(String(k), String(v)),
    removeItem: (k) => { m.delete(String(k)); },
    clear: () => { m.clear(); },
    key: (i) => [...m.keys()][i] ?? null,
    get length() { return m.size; },
  };
}
globalThis.localStorage = makeStorage();

import { createApp } from '../app.js';
import { seedDatabase } from '../seed.js';
import { PersonStore } from '../../docs/src/services/member/person.js?v=20260930d';
import { isPartyMember } from '../../docs/src/services/member/roster.js?v=20260930d';
import { ReviewStatus } from '../../docs/src/core/domain/domain.js?v=20260930d';
import {
  listPartyGroups, memberScopeOfGroup, countOpenReportsByGroup,
  isGroupActivity, groupActivitiesOf, reviewBucketOf,
} from '../../docs/src/services/member/group-view.js?v=20260930d';
import { getRuntimeMode, init, setDataSource } from '../../docs/src/data/data-adapter.js?v=20260930d';

// ── B 类现场（api 形态）：内存服务 + 真登录取 token + init() 把服务端全量灌进 mockDB 缓存 ──
const _app = createApp({ dbPath: ':memory:' });
await seedDatabase(_app.locals.db);
const _server = _app.listen(0);
const _base = `http://127.0.0.1:${_server.address().port}`;
const _loginRes = await fetch(`${_base}/api/v1/auth/login`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ personId: 'p13' }),
});
assert.equal(_loginRes.status, 200, 'B 类现场：真登录须 200（DISABLE_PASSWORD_CHECK=1 时 personId 直登）');
const { token: _token } = await _loginRes.json();
globalThis.sessionStorage = makeStorage({ 'gsm1921-api-token': _token });
setDataSource('api', { apiBaseUrl: _base, authToken: _token });
await init();

after(async () => {
  _server.closeAllConnections?.();
  await new Promise((r) => _server.close(r));
});

// 形态断言（**可断言**，不靠旁证）：本文件用例必须跑在 api 形态上
test('S0 形态：api 形态 + 有会话 token（数据来自服务端，不是本地静态种子）', () => {
  const mode = getRuntimeMode();
  assert.equal(mode.source, 'api', `本文件必须在 api 形态下跑（实测 ${JSON.stringify(mode)}）`);
  assert.equal(mode.hasToken, true, 'api 形态应存在会话 token');
});

const MEMBERS = PersonStore.getMembers();

// ── a) 组清单聚合 ────────────────────────────────────────────
test('组清单：支部 partyGroup 聚合 3 组（档案顺序），组长=组内 role leader，不含空组/p_pc', () => {
  const groups = listPartyGroups({ members: MEMBERS });
  assert.deepEqual(groups.map(g => g.groupName), ['第一党小组', '第二党小组', '第三党小组']);
  assert.deepEqual(groups.map(g => g.leaderId), ['p1', 'p2', 'p4']);
  assert.deepEqual(groups.map(g => g.memberCount), [17, 17, 16], '成员总数与种子头注 17/17/16 一致');
  const flat = groups.flatMap(g => g.memberIds);
  assert.equal(flat.length, 50, '三组合计 50（p_pc 党委组织员 partyGroup 空 → 剔除）');
  assert.ok(!flat.includes('p_pc'));
});

test('组内党员数 = developStage ∈ partyStages（roster isPartyMember 同源，含滞留党员 p5/p9）', () => {
  const groups = listPartyGroups({ members: MEMBERS });
  for (const g of groups) {
    const expected = g.memberIds.filter(id => isPartyMember(MEMBERS.find(p => p.id === id))).length;
    assert.equal(g.partyCount, expected, `${g.groupName} partyCount 与 isPartyMember 同源`);
  }
  assert.deepEqual(groups.map(g => g.partyCount), [9, 8, 4]);
  const byName = Object.fromEntries(groups.map(g => [g.groupName, g]));
  assert.ok(byName['第一党小组'].partyMemberIds.includes('p9'), '滞留党员 p9（一组）仍计入党员数（身份口径）');
  assert.ok(byName['第二党小组'].partyMemberIds.includes('p5'), '滞留党员 p5（二组）仍计入党员数（身份口径）');
});

test('branchId 过滤：br-b1 全部命中；不存在支部（br-b2）→ 空清单', () => {
  const g1 = listPartyGroups({ members: MEMBERS, branchId: 'br-b1' });
  assert.equal(g1.length, 3);
  const g2 = listPartyGroups({ members: MEMBERS, branchId: 'br-b2' });
  assert.deepEqual(g2, []);
});

// ── b) 组员口径（组长视角 own-group 同集）──────────────────────
test('组员口径：组内非组长成员；无组长组 = 全组成员', () => {
  const first = listPartyGroups({ members: MEMBERS })[0];
  const scope = memberScopeOfGroup(first);
  assert.equal(scope.length, 16);
  assert.ok(!scope.includes('p1'), '组长 p1 不在组员集');
  assert.ok(scope.includes('p3'));
  const noLeader = { memberIds: ['x1', 'x2', 'x3'], leaderId: null };
  assert.deepEqual(memberScopeOfGroup(noLeader), ['x1', 'x2', 'x3']);
});

// ── c) 待答复汇报开放数 ──────────────────────────────────────
test('开放数口径：仅组员发起 open 汇报；closed/hidden/merged/组长自身/请求行不计', () => {
  const first = listPartyGroups({ members: MEMBERS })[0]; // 组长 p1；组员 p3…
  const base = { kind: 'report', status: 'open', hidden: false, mergedInto: null };
  const issues = [
    { ...base, id: 'r1', submittedBy: 'p3' },                                    // ✓ 组员 open
    { ...base, id: 'r2', submittedBy: 'p3', status: 'closed' },                  // ✗ 已闭环
    { ...base, id: 'r3', submittedBy: 'p3', hidden: true },                      // ✗ 隐藏
    { ...base, id: 'r4', submittedBy: 'p3', mergedInto: 'r1' },                  // ✗ 已合并
    { ...base, id: 'r5', submittedBy: 'p1' },                                    // ✗ 组长自身（不计组员集）
    { ...base, id: 'r6', submittedBy: 'p1', requestedBy: 'p1', assignee: 'p3' }, // ✗ 组长请求行（submittedBy=组长）
    { ...base, id: 'r7', submittedBy: 'p6', kind: 'feedback' },                  // ✗ 非汇报 kind
    { id: 'x1', kind: 'report', status: 'open', submittedBy: 'p2' },             // ✗ 他组成员（第二组）
  ];
  assert.equal(countOpenReportsByGroup(issues, first), 1);
  assert.equal(countOpenReportsByGroup([], first), 0);
  assert.equal(countOpenReportsByGroup(null, first), 0);
  assert.equal(countOpenReportsByGroup(issues, null), 0);
});

// ── d) 本组活动判定与列表 ────────────────────────────────────
test('本组活动：organizer 属本组且非取消/非归档；按 date 降序', () => {
  const members = MEMBERS;
  const acts = [
    { id: 'a1', title: '一组会', date: '2026-07-01', organizer: 'p3', type: '党小组会' },     // ✓（p3 属一组）
    { id: 'a2', title: '二组会', date: '2026-07-02', organizer: 'p2', type: '党小组会' },     // ✗（二组）
    { id: 'a3', title: '取消会', date: '2026-07-03', organizer: 'p3', status: 'cancelled' },  // ✗ 取消
    { id: 'a4', title: '归档会', date: '2026-07-04', organizer: 'p3', archived: true },       // ✗ 归档
    { id: 'a5', title: '一组主题', date: '2026-08-01', organizer: 'p1', type: '主题党日' },   // ✓（组长 p1 属一组）
  ];
  assert.equal(isGroupActivity(acts[0], members, '第一党小组'), true);
  assert.equal(isGroupActivity(acts[1], members, '第一党小组'), false);
  assert.equal(isGroupActivity(acts[2], members, '第一党小组'), false);
  assert.equal(isGroupActivity(acts[3], members, '第一党小组'), false);
  assert.equal(isGroupActivity(null, members, '第一党小组'), false);
  const list = groupActivitiesOf(acts, members, '第一党小组');
  assert.deepEqual(list.map(a => a.id), ['a5', 'a1'], 'date 降序且仅命中 a1/a5');
});

// ── e) 复盘分桶 ─────────────────────────────────────────────
test('复盘分桶：pending = 无记录/未提交/已打回；completed = 其余', () => {
  const groupActs = [
    { id: 'a1', title: '无复盘' },
    { id: 'a2', title: '未提交' },
    { id: 'a3', title: '已打回' },
    { id: 'a4', title: '已上传' },
    { id: 'a5', title: '批注中' },
    { id: 'a6', title: '已确认' },
  ];
  const reviews = [
    { activityId: 'a2', reviewStatus: ReviewStatus.NOT_SUBMITTED },
    { activityId: 'a3', reviewStatus: ReviewStatus.REJECTED },
    { activityId: 'a4', reviewStatus: ReviewStatus.UPLOADED },
    { activityId: 'a5', reviewStatus: ReviewStatus.ANNOTATING },
    { activityId: 'a6', reviewStatus: ReviewStatus.CONFIRMED },
  ];
  const { pending, completed } = reviewBucketOf(groupActs, reviews);
  assert.deepEqual(pending.map(x => x.act.id), ['a1', 'a2', 'a3']);
  assert.deepEqual(completed.map(x => x.act.id), ['a4', 'a5', 'a6']);
  assert.equal(reviewBucketOf([], []).pending.length, 0);
});
