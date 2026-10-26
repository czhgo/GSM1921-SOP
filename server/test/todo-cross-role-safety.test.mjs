// role: [工程师]+[AI]
// server/test/todo-cross-role-safety.test.mjs — B-499-3 跨角色派生待办安全（批次 500）
// 覆盖：
//   · VisitorTodoDeriver 三条派生链（通知 / 活动 / 专班）逐条带当前登录人 personId；
//     去重与 stale 清理按 personId 收敛（不同用户互不删除）。
//   · completeBySource(sourceType, sourceId, scope) 只销本人 / 本角色；markRead 不销他人行。
//   · refreshExpiredStatus 无会话不写他人行；有会话只写本人 / 本角色行。
//   · seedTodos：mock 形态保留全部种子；API 形态只补当前登录角色匹配的种子。
// 运行：node --test test/todo-cross-role-safety.test.mjs（server 目录）
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { mockDB } from '../../docs/src/core/domain/domain.js?v=20261026a';
import { MockAdapter } from '../../docs/src/data/mock-adapter.js?v=20261026a';
import { setDataSource } from '../../docs/src/data/data-adapter.js?v=20261026a';
import {
  TodoStore, TodoStatus, TodoSourceType, VisitorTodoDeriver, seedTodos,
} from '../../docs/src/services/governance/todo.js?v=20261026a';
import { NoticeStore } from '../../docs/src/services/governance/notice.js?v=20261026a';

// ── localStorage 内存桩（member-persist 同款）─────────────────────
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

const A = '2400012347';
const B = '2400012349';

/** 每例独立现场：重置 mockDB 业务域 + 清存储 + 恢复 seed（todos 留空直插） */
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
  setDataSource('mock');
  MockAdapter.loadDB();
  globalThis.sessionStorage.getItem = () => null;
}

/** 写入登录会话（AuthStore.getCurrentUser 读该键） */
function loginAs(personId, role) {
  localStorage.setItem('gsm1921-login-user', JSON.stringify({ personId, role }));
}

const bySource = (sourceType, sourceId, personId) => TodoStore.getAll().find((t) =>
  t.sourceType === sourceType && t.sourceId === sourceId && String(t.personId || '') === String(personId));

// ═══════════════ ① 三条派生链逐条带 personId ═══════════════

test('① VisitorTodoDeriver 三条派生链：通知 / 活动 / 专班待办均带当前登录人 personId', () => {
  beginMockCase();
  VisitorTodoDeriver.deriveFromNotices({
    personId: A,
    notices: [{ id: 'nt-a', title: '活动预告', content: '', targetModule: 'activity', read: false }],
  });
  VisitorTodoDeriver.deriveFromActivities({
    personId: A,
    activities: [{ id: 'act-a', title: '社区志愿', date: '2099-01-05', status: 'published', organizer: A, assignments: [] }],
    signups: [],
  });
  VisitorTodoDeriver.deriveFromTaskforceSignups({
    personId: A,
    taskforces: [{ id: 'tf-a', name: '迎新专班', status: 'recruiting', deadline: '2099-02-01', task: '迎新生', members: [{ personId: A, role: 'participant' }] }],
    signups: [],
  });

  for (const [sourceType, sourceId] of [
    [TodoSourceType.NOTICE, 'nt-a'],
    [TodoSourceType.ACTIVITY, 'act-a'],
    [TodoSourceType.TASKFORCE, 'tf-a'],
  ]) {
    const row = bySource(sourceType, sourceId, A);
    assert.ok(row, `${sourceType}/${sourceId} 待办已派生`);
    assert.equal(row.role, 'visitor', '聚合键仍为 visitor（participant 工作台）');
    assert.equal(row.personId, A, '★ 每条 visitor 待办必须带当前登录人 personId');
  }
});

// ═══════════════ ② stale 清理按人收敛 ═══════════════

test('② stale 清理按 personId 收敛：乙的刷新不删除甲的待办', () => {
  beginMockCase();
  VisitorTodoDeriver.deriveFromActivities({
    personId: A,
    activities: [{ id: 'act-a', title: '甲的活动', date: '2099-01-05', status: 'published', organizer: A, assignments: [] }],
    signups: [],
  });
  VisitorTodoDeriver.deriveFromTaskforceSignups({
    personId: A,
    taskforces: [{ id: 'tf-a', name: '甲的专班', status: 'recruiting', deadline: '2099-02-01', members: [{ personId: A }] }],
    signups: [],
  });
  VisitorTodoDeriver.deriveFromActivities({
    personId: B,
    activities: [{ id: 'act-b', title: '乙的活动', date: '2099-01-06', status: 'published', organizer: B, assignments: [] }],
    signups: [],
  });
  VisitorTodoDeriver.deriveFromTaskforceSignups({
    personId: B,
    taskforces: [{ id: 'tf-b', name: '乙的专班', status: 'recruiting', deadline: '2099-02-01', members: [{ personId: B }] }],
    signups: [],
  });

  // 乙刷新：乙已无适用活动 / 专班 ⇒ 只清乙自己的行
  VisitorTodoDeriver.deriveFromActivities({ personId: B, activities: [], signups: [] });
  VisitorTodoDeriver.deriveFromTaskforceSignups({ personId: B, taskforces: [], signups: [] });

  assert.ok(bySource(TodoSourceType.ACTIVITY, 'act-a', A), '★ 甲的活动待办不得被乙的 stale 清理删除');
  assert.ok(bySource(TodoSourceType.TASKFORCE, 'tf-a', A), '★ 甲的专班待办不得被乙的 stale 清理删除');
  assert.equal(bySource(TodoSourceType.ACTIVITY, 'act-b', B), undefined, '乙自己的活动残留已清理');
  assert.equal(bySource(TodoSourceType.TASKFORCE, 'tf-b', B), undefined, '乙自己的专班残留已清理');
});

// ═══════════════ ③ completeBySource 作用域 ═══════════════

test('③ completeBySource：只销本人 / 本角色行，不跨人跨角色', () => {
  beginMockCase();
  const mk = (id, extra) => TodoStore.create({
    id, sourceType: TodoSourceType.NOTICE, sourceId: 'nt-x',
    title: id, status: TodoStatus.PENDING, ...extra,
  });
  mk('td-a', { role: 'visitor', personId: A });
  mk('td-b', { role: 'visitor', personId: B });
  mk('td-role', { role: 'secretary' });

  TodoStore.completeBySource(TodoSourceType.NOTICE, 'nt-x', { personId: A, role: 'participant' });
  const st = (id) => TodoStore.getById(id).status;
  assert.equal(st('td-a'), TodoStatus.COMPLETED, '本人行已销');
  assert.equal(st('td-b'), TodoStatus.PENDING, '★ 他人行不得被销');
  assert.equal(st('td-role'), TodoStatus.PENDING, '★ 其他角色行不得被销');

  TodoStore.completeBySource(TodoSourceType.NOTICE, 'nt-x', { role: 'secretary' });
  assert.equal(st('td-role'), TodoStatus.COMPLETED, '本角色行已销');
});

test('③b completeBySource 未传 scope：有会话时按会话收窄（兼容调用也不跨角色）', () => {
  beginMockCase();
  loginAs(A, 'participant');
  TodoStore.create({ id: 'td-a', role: 'visitor', personId: A, sourceType: TodoSourceType.NOTICE, sourceId: 'nt-y', status: TodoStatus.PENDING, title: 'A' });
  TodoStore.create({ id: 'td-b', role: 'visitor', personId: B, sourceType: TodoSourceType.NOTICE, sourceId: 'nt-y', status: TodoStatus.PENDING, title: 'B' });

  TodoStore.completeBySource(TodoSourceType.NOTICE, 'nt-y');
  assert.equal(TodoStore.getById('td-a').status, TodoStatus.COMPLETED, '本人行已销');
  assert.equal(TodoStore.getById('td-b').status, TodoStatus.PENDING, '★ 他人行不得被销');
});

// ═══════════════ ④ markRead 不销他人行 ═══════════════

test('④ NoticeStore.markRead：只销本人 / 本角色的通知待办', () => {
  beginMockCase();
  loginAs(A, 'participant');
  mockDB.notices = [{ id: 'nt-read', title: '广播', content: 'x', audience: ['all'], publishDate: '2026-10-20' }];
  const mk = (id, extra) => TodoStore.create({
    id, sourceType: TodoSourceType.NOTICE, sourceId: 'nt-read',
    category: 'notice', actionKey: 'notice-read', status: TodoStatus.PENDING, title: id, ...extra,
  });
  mk('td-a', { role: 'visitor', personId: A });
  mk('td-b', { role: 'visitor', personId: B });
  mk('td-role', { role: 'secretary' });

  assert.equal(NoticeStore.markRead('nt-read'), true);
  assert.deepEqual(mockDB.notices.find((n) => n.id === 'nt-read').reads, [A], '已读只写当前人');
  assert.equal(TodoStore.getById('td-a').status, TodoStatus.COMPLETED, '本人通知待办已销');
  assert.equal(TodoStore.getById('td-b').status, TodoStatus.PENDING, '★ 他人通知待办不得被销');
  assert.equal(TodoStore.getById('td-role').status, TodoStatus.PENDING, '★ 其他角色通知待办不得被销');
});

// ═══════════════ ⑤ 无会话 refreshExpiredStatus 不写他人行 ═══════════════

test('⑤ refreshExpiredStatus：无会话不写任何行；有会话只写本人 / 本角色行', () => {
  beginMockCase();
  const mk = (id, extra) => TodoStore.create({
    id, title: id, category: 'track', deadline: '2000-01-01', status: TodoStatus.PENDING, ...extra,
  });
  mk('td-a', { role: 'visitor', personId: A });
  mk('td-role', { role: 'secretary' });

  TodoStore.refreshExpiredStatus();
  assert.equal(TodoStore.getById('td-a').status, TodoStatus.PENDING, '★ 无会话不得把他人行写成 expired');
  assert.equal(TodoStore.getById('td-role').status, TodoStatus.PENDING, '★ 无会话不得把其他角色行写成 expired');

  loginAs(A, 'participant');
  TodoStore.refreshExpiredStatus();
  assert.equal(TodoStore.getById('td-a').status, TodoStatus.EXPIRED, '有会话时本人行可置 expired');
  assert.equal(TodoStore.getById('td-role').status, TodoStatus.PENDING, '有会话也不得写其他角色行');
});

// ═══════════════ ⑥ seedTodos：API 形态一律不补种子（Task 3 改准） ═══════════════

test('⑥ seedTodos：mock 形态保留演示种子；API 形态不补任何种子（含角色匹配者）', () => {
  beginMockCase();
  assert.equal(mockDB.todos.some((t) => t.id === 'todo_seed_6'), false, '前置：todos 为空');

  // mock 形态：演示能力保留（传播全部种子）
  setDataSource('mock');
  seedTodos();
  assert.ok(mockDB.todos.some((t) => t.id === 'todo_seed_6'), 'mock 形态保留全部演示种子');

  // API 形态：任何角色都不得补种子（空库为空态；不 persist）
  mockDB.todos = [];
  setDataSource('api');
  loginAs(A, 'participant');
  seedTodos();
  assert.equal(mockDB.todos.some((t) => t.id === 'todo_seed_6'), false, '普通成员不得补演示种子');

  mockDB.todos = [];
  loginAs('2400012356', 'prop-commissioner');
  seedTodos();
  assert.equal(mockDB.todos.some((t) => t.id === 'todo_seed_6'), false, '★ API 形态角色匹配也不得补演示种子');

  setDataSource('mock');
});
