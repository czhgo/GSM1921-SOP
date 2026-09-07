// role: [工程师]+[AI]
// server/test/perf-todo-agg-cache.test.mjs — P0 提速批护栏：TodoStore 聚合级 memo 失效正确性（2026-09-07）
// 依据：.trae/specs/2026-09-07-perf/spec.md §二.1/§五（一致性护栏：写→读必须变化、未写→复用）
// 覆盖（member-persist 桩范式；seed 用 TodoStore.create 构造记录）：
//   ① 未写时连续两次 getDomainsWithGroups：结果一致（同引用）且内部聚合只执行一次
//     （TodoStore._aggCacheStats.aggregateRuns 计数不变）
//   ② create 后：结果变化（新引用、计数 +1）且聚合重算
//   ③ complete 后：结果变化（计数 +1）
//   ④ refreshExpiredStatus 实际变更后：结果变化（计数 +1，组内条目 status → expired）
//   ⑤ mergeRealtimeDomains 消费同轮 getDomainsWithGroups 缓存（不额外全扫）且不污染共享缓存
// 运行：node --test test/perf-todo-agg-cache.test.mjs（server 目录）
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { mockDB } from '../../docs/src/core/domain.js?v=20260903c';
import {
  MockAdapter,
} from '../../docs/src/core/mock-adapter.js?v=20260903c';
import { setDataSource } from '../../docs/src/core/data-adapter.js?v=20260903c';
import {
  TodoStore, TodoCategory, TodoStatus, WORK_DOMAIN,
} from '../../docs/src/services/todo.js?v=20260907b';

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
  setDataSource('mock'); // 数据源复位
  MockAdapter.loadDB(); // seed：activities/tasks/assignments/archiveRecords/signups/branches（todos 留空直插）
}

/** 造一条 secretary 待办（默认 track/pending；显式 domain 保留） */
function mk(partial) {
  return TodoStore.create({
    role: 'secretary',
    category: TodoCategory.TRACK,
    priority: 'normal',
    status: TodoStatus.PENDING,
    ...partial,
  });
}

/** 读累计聚合执行次数（TodoStore._aggCacheStats：缓存未命中才 +1） */
function runs() {
  return TodoStore._aggCacheStats.aggregateRuns;
}

test('① 未写时连续两次 getDomainsWithGroups：结果一致（同引用）且内部聚合只执行一次', () => {
  beginMockCase();
  mk({ id: 'ag-1', domain: WORK_DOMAIN.MEETING, actionKey: 'participate', title: '参加党员大会', deadline: '2099-06-01' });
  mk({ id: 'ag-2', domain: WORK_DOMAIN.ATTENDANCE, actionKey: 'attendance-remind', title: '考勤待录入', deadline: '2099-08-01' });

  const r0 = runs();
  const v1 = TodoStore.getDomainsWithGroups('secretary');
  const afterFirst = runs();
  assert.equal(afterFirst, r0 + 1, '首次调用聚合执行 1 次');

  const v2 = TodoStore.getDomainsWithGroups('secretary');
  assert.equal(runs(), afterFirst, '未写时第二次调用命中缓存：内部聚合不重复执行');
  assert.strictEqual(v2, v1, '未写时返回同一缓存引用（只读契约，调用方仅读）');
  assert.deepEqual(v2.map(d => d.domain), ['meeting', 'attendance'], '域序/内容一致');

  // 其它角色/其它聚合方法同样缓存（未写 → 计数不涨）
  assert.deepEqual(TodoStore.getDomainsWithGroups('prop-commissioner'), [], '空角色域视图');
  assert.equal(TodoStore.getDomainsWithGroups('prop-commissioner').length, 0, '再次命中不重算');
  assert.equal(runs(), afterFirst + 1, 'prop 角色首次调用 +1 后即缓存');
});

test('② create 后：getDomainsWithGroups 结果变化（新引用、计数 +1）', () => {
  beginMockCase();
  mk({ id: 'ag-10', domain: WORK_DOMAIN.MEETING, actionKey: 'participate', title: '参加党员大会', deadline: '2099-06-01' });
  const v1 = TodoStore.getDomainsWithGroups('secretary');
  const runs1 = runs();
  assert.equal(v1[0].count, 1, '初始 1 条');

  mk({ id: 'ag-11', domain: WORK_DOMAIN.ATTENDANCE, actionKey: 'attendance-remind', title: '考勤待录入', deadline: '2099-08-01' });
  assert.equal(runs(), runs1, '写口本身不触发聚合');

  const v2 = TodoStore.getDomainsWithGroups('secretary');
  assert.equal(runs(), runs1 + 1, 'create 后重算（计数 +1）');
  assert.notStrictEqual(v2, v1, 'create 后结果为新引用');
  assert.equal(v2.length, 2, '新域出现（meeting + attendance）');
  assert.equal(v2.reduce((s, d) => s + d.count, 0), 2, '总条数随 create 增长');
});

test('③ complete 后：getDomainsWithGroups 结果变化（计数 +1，完成态排除）', () => {
  beginMockCase();
  mk({ id: 'ag-20', domain: WORK_DOMAIN.MEETING, actionKey: 'participate', title: '参加党员大会', deadline: '2099-06-01' });
  const v1 = TodoStore.getDomainsWithGroups('secretary');
  const runs1 = runs();
  assert.equal(v1[0].count, 1);

  TodoStore.complete('ag-20'); // 写口 → 版本 +1（缓存应失效）
  assert.equal(runs(), runs1, '写口本身不触发聚合');

  const v2 = TodoStore.getDomainsWithGroups('secretary');
  assert.equal(runs(), runs1 + 1, 'complete 后重算（计数 +1）');
  assert.notStrictEqual(v2, v1, 'complete 后结果为新引用');
  assert.deepEqual(v2, [], '完成态待办被排除 → 域视图为空');
});

test('④ refreshExpiredStatus 实际变更后：结果变化（计数 +1，条目转 expired）', () => {
  beginMockCase();
  // 远期正常待办 + 过期待办（pending、deadline 早于今日 → refresh 会置为 expired）
  mk({ id: 'ag-30', domain: WORK_DOMAIN.MEETING, actionKey: 'participate', title: '参加党员大会', deadline: '2099-06-01' });
  const expiredId = mk({ id: 'ag-31', domain: WORK_DOMAIN.ATTENDANCE, actionKey: 'attendance-remind', title: '过期考勤待录入', deadline: '2000-01-01' }).id;

  const v1 = TodoStore.getDomainsWithGroups('secretary');
  const runs1 = runs();
  const att1 = v1.find(d => d.domain === 'attendance');
  const item1 = att1.groups[0].items.find(t => t.id === expiredId);
  assert.equal(item1.status, 'pending', 'refresh 前过期待办仍 pending');

  const refreshed = TodoStore.refreshExpiredStatus();
  assert.equal(refreshed.find(t => t.id === expiredId).status, 'expired', 'refresh 实际写入 expired');
  assert.equal(runs(), runs1, 'refresh 写口本身不触发聚合');

  const v2 = TodoStore.getDomainsWithGroups('secretary');
  assert.equal(runs(), runs1 + 1, 'refresh 实际变更后重算（计数 +1）');
  assert.notStrictEqual(v2, v1, 'refresh 后结果为新引用');
  const att2 = v2.find(d => d.domain === 'attendance');
  assert.equal(att2.expiredCount, 1, 'refresh 后域级逾期数正确');
  const item2 = att2.groups[0].items.find(t => t.id === expiredId);
  assert.equal(item2.status, 'expired', 'refresh 后组内条目 status=expired（缓存已正确失效重算）');
});

test('⑤ mergeRealtimeDomains 消费同轮缓存基准且不污染共享缓存；未写再次调用同引用', () => {
  beginMockCase();
  mk({ id: 'ag-40', domain: WORK_DOMAIN.ATTENDANCE, actionKey: 'attendance-confirm', title: '考勤待复核', deadline: '2099-09-01' });

  const base = TodoStore.getDomainsWithGroups('secretary'); // 基准全扫 1 次
  const runs1 = runs();
  const merged = TodoStore.mergeRealtimeDomains('secretary', []);
  assert.equal(runs(), runs1 + 1, 'merge 空实时组：仅 merge 自身 1 次（基准走缓存，不重复全扫）');

  // 并入实时组（member-dev 新增域 + attendance 域内追加）
  const realtime = [
    { groupKey: 'secretary:member-confirm', actionKey: 'member-confirm', domain: WORK_DOMAIN.MEMBER_DEV, title: '成员变更待确认', count: 2, items: [{ id: 'mc1' }, { id: 'mc2' }] },
    { groupKey: 'secretary:attendance-remind', actionKey: 'attendance-remind', domain: WORK_DOMAIN.ATTENDANCE, title: '考勤待录入', count: 1, items: [{ id: 'ar1', deadline: '2099-05-01' }] },
  ];
  const runs2 = runs();
  const mergedRt = TodoStore.mergeRealtimeDomains('secretary', realtime);
  assert.equal(runs(), runs2 + 1, '并入实时组：merge 重算（基准仍命中缓存）');
  assert.deepEqual(mergedRt.map(d => d.domain), ['attendance', 'member-dev'], '实时组新增域并入');

  // 共享缓存基准未被 merge 污染：getDomainsWithGroups 仍返回原纯持久化视图（同引用）
  const baseAfter = TodoStore.getDomainsWithGroups('secretary');
  assert.strictEqual(baseAfter, base, 'merge 在克隆基准上并入，不污染 getDomainsWithGroups 共享缓存');
  assert.deepEqual(baseAfter.map(d => d.domain), ['attendance'], '共享基准仍只有持久化域');

  // 未写再次调用 merge（同实时组）→ 同引用缓存命中
  const mergedAgain = TodoStore.mergeRealtimeDomains('secretary', realtime);
  assert.strictEqual(mergedAgain, mergedRt, '未写时 merge 命中缓存（同引用）');
});
