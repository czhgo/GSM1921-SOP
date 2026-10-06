// role: [工程师]+[AI]
// server/test/module-owner-authz.test.mjs — `R-29⑤` 落地（2026-10-06 批次 423 · `D-804`）：
//   **活动 / 专班创建时联动赋权** 的常驻判据——赋权待办的**收件人取模块主责**
//   （判据单一源＝`docs/src/core/domain/work-map.js`：分工快照 `config.workforce` 覆盖 ＋ `defaultOwner` 兜底）。
// 三档口径（见 `todo.js::_authzRecipient`）：
//   · 主责＝角色键 ⇒ 收件人＝该角色；
//   · 主责＝具体人 ⇒ 补 `personId`（定向）+ `role` 回退固定角色（待办只有 `role` 索引 ⇒ 不回退即不可见）；
//   · 主责＝组织型主体 / 无模块（活动无 `type`）/ 已停用 ⇒ 回退固定角色（既有行为）。
// 运行：node --test test/module-owner-authz.test.mjs（server 目录）
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { mockDB } from '../../docs/src/core/domain/domain.js?v=20261006e';
import { setDataSource } from '../../docs/src/data/data-adapter.js?v=20261006e';
import { MockAdapter } from '../../docs/src/data/mock-adapter.js?v=20261006e';
import {
  TodoStore, TodoSourceType, LifecycleTodoDeriver,
} from '../../docs/src/services/governance/todo.js?v=20261006e';
import { createActivity } from '../../docs/src/services/core/mock.js?v=20261006e';
import { TaskForceRecordStore } from '../../docs/src/services/activity/taskforce.js?v=20261006e';

// ── localStorage 内存桩 ─────────────────────────────────────────
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

function beginMockCase() {
  _store.clear();
  delete globalThis.window;
  for (const k of ['activities', 'tasks', 'attendances', 'inspections', 'taskforces', 'notices', 'todos']) {
    mockDB[k] = [];
  }
  mockDB.branches = [];
  mockDB._loaded = false;
  setDataSource('mock');
  MockAdapter.loadDB();
}

/** 取该源活动 / 专班的赋权待办 */
const todoOf = (sourceType, sourceId) =>
  TodoStore.getAll().find((t) => t.sourceType === sourceType && t.sourceId === sourceId);

// ═══════════════ A1–A3 活动：缺省分工（模块主责）═══════════════

test('A1 活动 type=支委会 ⇒ 收件人＝该模块主责「支书」（不再一律组长）', () => {
  beginMockCase();
  LifecycleTodoDeriver.deriveFromActivityCreate({ id: 'act-c', title: '10月支委会', type: '支委会', date: '2026-10-20' });
  const t = todoOf(TodoSourceType.ACTIVITY, 'act-c');
  assert.equal(t.role, 'secretary', '支委会模块缺省主责＝支书 ⇒ 待办落支书台');
  assert.equal(t.personId, null, '角色档不落 personId');
  assert.equal(t.actionData.moduleId, 'branch-committee-meeting', '联动赋权：落模块 id');
  assert.equal(t.actionData.ownerType, 'role');
  assert.equal(t.actionData.ownerId, 'secretary');
});

test('A2 活动 type=党小组会 ⇒ 收件人＝该模块主责「党小组组长」', () => {
  beginMockCase();
  LifecycleTodoDeriver.deriveFromActivityCreate({ id: 'act-g', title: '本组党小组会', type: '三会一课·党小组会', date: '2026-10-21' });
  const t = todoOf(TodoSourceType.ACTIVITY, 'act-g');
  assert.equal(t.role, 'leader');
  assert.equal(t.actionData.moduleId, 'party-group-meeting', '历史写法（大类·子类）也要归一命中');
});

test('A3 活动无 type（归不到模块）⇒ 回退固定角色 leader（既有行为）', () => {
  beginMockCase();
  LifecycleTodoDeriver.deriveFromActivityCreate({ id: 'act-x', title: '无类型活动', date: '2026-10-22' });
  const t = todoOf(TodoSourceType.ACTIVITY, 'act-x');
  assert.equal(t.role, 'leader');
  assert.equal(t.actionData.moduleId, null);
  assert.equal(t.actionData.ownerType, null);
});

// ═══════════════ A4–A6 活动：支部改派（分工快照）═══════════════

test('A4 改派到「人」⇒ 补 personId，role 回退固定角色（待办只有 role 索引 ⇒ 必须回退）', () => {
  beginMockCase();
  LifecycleTodoDeriver.deriveFromActivityCreate(
    { id: 'act-t', title: '10月主题党日', type: '主题党日', date: '2026-10-23' },
    { snapshot: { 'theme-party': { ownerType: 'person', ownerId: 'p3' } } },
  );
  const t = todoOf(TodoSourceType.ACTIVITY, 'act-t');
  assert.equal(t.role, 'leader', '到人档 role 回退本台固定角色（否则 getByRole 取不到）');
  assert.equal(t.personId, 'p3', '定向：主责人落 personId');
  assert.equal(t.actionData.ownerType, 'person');
  assert.equal(t.actionData.ownerId, 'p3');
});

test('A5 改派到「角色」⇒ 收件人随分工走', () => {
  beginMockCase();
  LifecycleTodoDeriver.deriveFromActivityCreate(
    { id: 'act-c2', title: '10月支委会（改派）', type: '支委会', date: '2026-10-24' },
    { snapshot: { 'branch-committee-meeting': { ownerType: 'role', ownerId: 'deputy-secretary' } } },
  );
  const t = todoOf(TodoSourceType.ACTIVITY, 'act-c2');
  assert.equal(t.role, 'deputy-secretary');
  assert.equal(t.actionData.ownerId, 'deputy-secretary');
});

test('A6 主责＝组织型主体 ⇒ 回退固定角色（组织型主体不是登录身份、无台可落）', () => {
  beginMockCase();
  LifecycleTodoDeriver.deriveFromActivityCreate(
    { id: 'act-c3', title: '10月支委会（归支委会）', type: '支委会', date: '2026-10-25' },
    { snapshot: { 'branch-committee-meeting': { ownerType: 'org', ownerId: 'branch-committee' } } },
  );
  const t = todoOf(TodoSourceType.ACTIVITY, 'act-c3');
  assert.equal(t.role, 'leader', '组织型主体 ⇒ 回退固定角色');
  assert.equal(t.actionData.ownerType, 'org', '但主责信息如实落 actionData（供界面显示）');
  assert.equal(t.actionData.ownerId, 'branch-committee');
});

// ═══════════════ A7–A8 专班：模块固定 taskforce ═══════════════

test('A7 专班缺省 ⇒ 收件人＝taskforce 模块主责「组织委员」（与既有行为一致）', () => {
  beginMockCase();
  LifecycleTodoDeriver.deriveFromTaskforceCreate({ id: 'tf-a', name: '迎新专班', startDate: '2026-10-01', endDate: '2026-11-30' });
  const t = todoOf(TodoSourceType.TASKFORCE, 'tf-a');
  assert.equal(t.role, 'org-commissioner');
  assert.equal(t.actionData.moduleId, 'taskforce');
  assert.equal(t.actionData.ownerId, 'org-commissioner');
});

test('A8 专班改派到「人」⇒ 补 personId、role 回退组织委员', () => {
  beginMockCase();
  LifecycleTodoDeriver.deriveFromTaskforceCreate(
    { id: 'tf-b', name: '改派专班', startDate: '2026-10-01', endDate: '2026-11-30' },
    { snapshot: { taskforce: { ownerType: 'person', ownerId: 'p9' } } },
  );
  const t = todoOf(TodoSourceType.TASKFORCE, 'tf-b');
  assert.equal(t.role, 'org-commissioner');
  assert.equal(t.personId, 'p9');
  assert.equal(t.actionData.ownerType, 'person');
});

// ═══════════════ A9 非空转：派生的待办在这两档里都取得到 ═══════════════

test('A9 非空转：角色档能被 getByRole 取到（防「回退写错 ⇒ 待办不可见」）', () => {
  beginMockCase();
  LifecycleTodoDeriver.deriveFromActivityCreate({ id: 'act-v', title: '10月支部党员大会', type: '支部党员大会', date: '2026-10-26' });
  const list = TodoStore.getByRole('secretary');
  assert.ok(list.some((t) => t.sourceId === 'act-v'), '支部党员大会主责＝支书 ⇒ 必须出现在支书台 getByRole("secretary")');

  LifecycleTodoDeriver.deriveFromActivityCreate(
    { id: 'act-v2', title: '改派给 p3 的主题党日', type: '主题党日', date: '2026-10-27' },
    { snapshot: { 'theme-party': { ownerType: 'person', ownerId: 'p3' } } },
  );
  const leaderList = TodoStore.getByRole('leader');
  const hit = leaderList.find((t) => t.sourceId === 'act-v2');
  assert.ok(hit, '到人档仍须落在回退角色的可见面内');
  assert.equal(hit.personId, 'p3');
});

// ═══════════════ A10–A11 接线：写口须把「分工快照」传进派生器（批次 425）═══════════════

/** 给演示支部 br-b1 注入一条分工改派（`config.workforce`），返回清理函数 */
function _overrideWorkforce(moduleId, ownerRef) {
  const br = (mockDB.branches || []).find((b) => b.id === 'br-b1');
  assert.ok(br, '演示支部 br-b1 必须在场');
  const before = br.config && br.config.workforce;
  br.config = { ...(br.config || {}), workforce: { ...(before || {}), [moduleId]: ownerRef } };
  return () => { br.config = { ...(br.config || {}), workforce: before }; };
}
const tick = (ms = 60) => new Promise((r) => setTimeout(r, ms));

test('A10 活动写口（mock.js::createActivity）已把分工快照传进派生器 ⇒ 收件人随「支部改派」走', async () => {
  beginMockCase();
  const restore = _overrideWorkforce('branch-committee-meeting', { ownerType: 'role', ownerId: 'deputy-secretary' });
  try {
    const act = await createActivity({ title: '改派核 · 支委会', type: '支委会', date: '2026-10-30', createdBy: 'p1' });
    await tick();
    const t = todoOf(TodoSourceType.ACTIVITY, act.id);
    assert.ok(t, '活动创建须派生赋权待办（assignments 为空）');
    assert.equal(t.role, 'deputy-secretary', '缺省主责是支书；支部改派为副支书 ⇒ 收件人须随之改（证明快照已接线）');
  } finally { restore(); }
});

test('A11 专班写口（TaskForceRecordStore.add）已把分工快照传进派生器 ⇒ 收件人随「支部改派」走', async () => {
  beginMockCase();
  const restore = _overrideWorkforce('taskforce', { ownerType: 'role', ownerId: 'deputy-secretary' });
  try {
    const rec = TaskForceRecordStore.add({ name: '改派核 · 专班', manager: 'p1', members: [] });
    await tick();
    const t = todoOf(TodoSourceType.TASKFORCE, rec.id);
    assert.ok(t, '专班创建须派生赋权待办（members 为空）');
    assert.equal(t.role, 'deputy-secretary', '缺省主责是组织委员；支部改派为副支书 ⇒ 收件人须随之改');
  } finally { restore(); }
});
