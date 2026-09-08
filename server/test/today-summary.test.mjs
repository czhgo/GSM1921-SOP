// role: [工程师]+[AI]
// server/test/today-summary.test.mjs — R6-3「今天」页服务层 today-summary（2026-09-07）
// 覆盖（mock 形态，纯 node + localStorage 内存桩，member-persist 同范式：
//   beginMockCase 清 mockDB 业务域 + MockAdapter.loadDB() 回种子）：
//   ① 在册非滞留党员 → hasMeeting 含当日应到支部党员大会（roster 口径，项含
//      {activityId,title,type,start}）；党小组会按本人所在小组应到命中
//   ② 报名参与型：非会类型活动经 signups(approved) 计入 hasMeeting；pending 报名与
//      未报名积极分子不自动列入
//   ③ 到期/逾期：deadline=昨日 未完成 → overdue（含 {id,title,deadline,action}）且
//      dueToday 不含；deadline=今日 → dueToday；完成态/未来/无 deadline 均不入列
//   ④ 分工：当日活动 assignments 含我 → myDuties 含 {activityId,activityTitle,role}
//   ⑤ 全空态：无会/无到期/无分工 → 返回空数组们（date 仍正确）
//   ⑥ 跨日边界：now 注入固定日期 → 明天活动不出现；切到明天则出现（dateKey 本地口径）
// 基准「今天」= 2026-09-10（seed act-31「9月支部党员大会（线上异步表决）」当日，
//   支部党员大会、published、assignments 含 p11 organizer/p5·p8 participant）
// 运行：node --test test/today-summary.test.mjs（server 目录）
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { mockDB } from '../../docs/src/core/domain.js?v=20260908d';
import { MockAdapter } from '../../docs/src/core/mock-adapter.js?v=20260908d';
import { setDataSource, registerMockAdapter } from '../../docs/src/core/data-adapter.js?v=20260908d';
// namespace 导入：红阶段（新 API 未实现）以 per-test 失败呈现而非整文件链接失败
import * as TS from '../../docs/src/services/today-summary.js?v=20260908d';

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

registerMockAdapter(MockAdapter);

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
  MockAdapter.loadDB(); // seed：activities/tasks/assignments/archiveRecords/signups/branches
}

// ── 固定"现在"（本地构造 → 无论运行环境时区，本地 dateKey 均稳定）──
const D0910 = new Date(2026, 8, 10, 9, 30, 0);  // 2026-09-10（基准：act-31 支部党员大会当日）
const D0911 = new Date(2026, 8, 11, 8, 0, 0);   // 2026-09-11（明天）
const D0701 = new Date(2026, 6, 1, 9, 0, 0);    // 2026-07-01（act-1 党小组会当日）
const D0906 = new Date(2026, 8, 6, 9, 0, 0);    // 2026-09-06（种子无活动日 → 空态）

/** 追加一条测试用活动（字段仅取 today-summary 消费面：id/date/type/title/assignments） */
function pushActivity(partial) {
  mockDB.activities = [
    ...mockDB.activities,
    { status: 'published', assignments: [], ...partial },
  ];
}

/** 追加一条测试用活动报名（signups 判定面：sourceType/sourceId/personId/status） */
function pushSignup(partial) {
  mockDB.signups = [...mockDB.signups, { role: 'participant', ...partial }];
}

/** 追加一条测试用待办（role/deadline/status/actionKey 判定面；其余字段由 getGroupedByAction 平铺原样保留） */
function pushTodo(partial) {
  mockDB.todos = [...mockDB.todos, {
    id: partial.id,
    title: partial.title,
    role: partial.role,
    category: partial.category || 'track',
    priority: 'normal',
    status: partial.status || 'pending',
    deadline: partial.deadline || null,
    actionKey: partial.actionKey || null,
    actionType: partial.actionType || null,
  }];
}

test('① 会-应到：在册非滞留党员 hasMeeting 含当日支部党员大会（项含 activityId/title/type/start）；党小组会按本人小组应到', () => {
  beginMockCase();
  const s = TS.buildTodaySummary({ personId: 'p1', role: 'leader', now: D0910 });
  assert.equal(s.date, '2026-09-10', 'date = 本地 dateKey');
  assert.deepEqual(s.hasMeeting, [{
    activityId: 'act-31',
    title: '9月支部党员大会（线上异步表决）',
    type: '支部党员大会',
    start: '', // 种子无时间字段 → 空串占位
  }], 'p1（第一党小组·正式党员·非滞留）应到当日支部党员大会且仅此一场');

  // 党小组会口径：本人所在小组的在册党员应到（groupId = 本人 partyGroup，plan R6-3 Step3）
  const g = TS.buildTodaySummary({ personId: 'p1', role: 'leader', now: D0701 });
  assert.ok(g.hasMeeting.some(x => x.activityId === 'act-1'), 'p1（第一党小组在册党员）应到 07-01 党小组会 act-1');
});

test('② 报名参与型：非会类型活动经 signups(approved) 计入；pending 与未报名者不自动列入', () => {
  beginMockCase();
  pushActivity({ id: 'act-t1', title: '9月读书分享会', date: '2026-09-10', type: '主题党日' });
  pushSignup({ id: 'su-t1', sourceType: 'activity', sourceId: 'act-t1', personId: 'p15', status: 'approved' });
  // 对照组：p8 对 act-t1 仅有一条 pending 报名（未获批 → 不计参与）
  pushSignup({ id: 'su-t2', sourceType: 'activity', sourceId: 'act-t1', personId: 'p8', status: 'pending' });

  // p15（积极分子·非应到对象）经 approved 报名 → 计入参与
  const s15 = TS.buildTodaySummary({ personId: 'p15', role: 'participant', now: D0910 });
  assert.deepEqual(s15.hasMeeting.find(x => x.activityId === 'act-t1'), {
    activityId: 'act-t1', title: '9月读书分享会', type: '主题党日', start: '',
  }, 'approved 报名命中 → hasMeeting 含该活动');
  assert.ok(!s15.hasMeeting.some(x => x.activityId === 'act-31'), '积极分子未报名/未分工 → 支部党员大会不因应到自动列入');

  // p8（正式党员）：pending 报名不构成参与；支部党员大会 act-31 仍因应到列入
  const s8 = TS.buildTodaySummary({ personId: 'p8', role: 'participant', now: D0910 });
  assert.ok(!s8.hasMeeting.some(x => x.activityId === 'act-t1'), 'pending 报名未获批 → 不计参与');
  assert.ok(s8.hasMeeting.some(x => x.activityId === 'act-31'), 'p8 党员 → act-31 应到仍列示');
});

test('③ 到期/逾期：deadline=昨日未完成 → overdue（含 id/title/deadline/action）且 dueToday 不含；=今日 → dueToday；完成/未来/无 deadline 排除', () => {
  beginMockCase();
  const role = 'prop-commissioner';
  pushTodo({ id: 'todo-od1', title: '提交逾期新闻稿', role, deadline: '2026-09-09', actionKey: 'submit-news', actionType: 'submit' });
  pushTodo({ id: 'todo-due1', title: '今日定稿宣传周报', role, deadline: '2026-09-10', actionKey: 'final-review', actionType: 'review' });
  pushTodo({ id: 'todo-future1', title: '未来事项', role, deadline: '2026-09-11', actionType: 'track' });
  pushTodo({ id: 'todo-done1', title: '已完成（曾逾期）', role, deadline: '2026-09-01', status: 'completed' });
  pushTodo({ id: 'todo-nodead1', title: '无截止日事项', role });

  const s = TS.buildTodaySummary({ personId: 'p12', role, now: D0910 });
  assert.deepEqual(s.overdue, [{
    id: 'todo-od1', title: '提交逾期新闻稿', deadline: '2026-09-09', action: 'submit-news',
  }], 'overdue = 昨日未完成项（action=actionKey）');
  assert.deepEqual(s.dueToday, [{
    id: 'todo-due1', title: '今日定稿宣传周报', deadline: '2026-09-10', action: 'final-review',
  }], 'dueToday = 今日到期项');
  for (const id of ['todo-due1', 'todo-future1', 'todo-done1', 'todo-nodead1']) {
    assert.ok(!s.overdue.some(t => t.id === id), `overdue 不含 ${id}`);
  }
  for (const id of ['todo-od1', 'todo-future1', 'todo-done1', 'todo-nodead1']) {
    assert.ok(!s.dueToday.some(t => t.id === id), `dueToday 不含 ${id}`);
  }
});

test('④ 分工：当日活动 assignments 含我 → myDuties 含 {activityId, activityTitle, role}（跨活动汇总）', () => {
  beginMockCase();
  pushActivity({
    id: 'act-t2', title: '9月主题党日：新老生交流', date: '2026-09-10', type: '主题党日',
    assignments: [{ personId: 'p11', role: 'deep' }],
  });

  const s = TS.buildTodaySummary({ personId: 'p11', role: 'org-commissioner', now: D0910 });
  assert.ok(Array.isArray(s.myDuties));
  assert.deepEqual(s.myDuties.find(d => d.activityId === 'act-t2'), {
    activityId: 'act-t2', activityTitle: '9月主题党日：新老生交流', role: 'deep',
  }, '非会类型活动分工命中');
  assert.deepEqual(s.myDuties.find(d => d.activityId === 'act-31'), {
    activityId: 'act-31', activityTitle: '9月支部党员大会（线上异步表决）', role: 'organizer',
  }, '会类活动分工（organizer）命中');
});

test('⑤ 空态：无会/无到期/无分工 → 四个数组全空，date 正确', () => {
  beginMockCase();
  const s = TS.buildTodaySummary({ personId: 'p13', role: 'secretary', now: D0906 });
  assert.equal(s.date, '2026-09-06');
  assert.deepEqual(s.hasMeeting, []);
  assert.deepEqual(s.overdue, []);
  assert.deepEqual(s.dueToday, []);
  assert.deepEqual(s.myDuties, []);
});

test('⑥ 跨日边界：now 注入 → 明天活动不出现；now 切到明天则出现（dateKey 本地口径）', () => {
  beginMockCase();
  pushActivity({ id: 'act-f', title: '9月11日党员大会', date: '2026-09-11', type: '支部党员大会' });

  const today = TS.buildTodaySummary({ personId: 'p1', role: 'leader', now: D0910 });
  assert.equal(today.date, '2026-09-10');
  assert.ok(today.hasMeeting.some(x => x.activityId === 'act-31'), '今天活动在列');
  assert.ok(!today.hasMeeting.some(x => x.activityId === 'act-f'), '明天（2026-09-11）活动不出现');

  const tomorrow = TS.buildTodaySummary({ personId: 'p1', role: 'leader', now: D0911 });
  assert.equal(tomorrow.date, '2026-09-11');
  assert.ok(tomorrow.hasMeeting.some(x => x.activityId === 'act-f'), 'now=明天 → 该活动进入 hasMeeting');
  assert.ok(!tomorrow.hasMeeting.some(x => x.activityId === 'act-31'), '切日 → 昨日活动退出');
});
