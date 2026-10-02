// role: [工程师]+[AI]
// server/test/today-summary.test.mjs — R6-3「今天」页服务层 today-summary（2026-09-07）
// 覆盖（mock 形态，纯 node + localStorage 内存桩，member-persist 同做法：
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

import { mockDB } from '../../docs/src/core/domain/domain.js?v=20261002i';
import { MockAdapter } from '../../docs/src/data/mock-adapter.js?v=20261002i';
import { setDataSource, registerMockAdapter } from '../../docs/src/data/data-adapter.js?v=20261002i';
// namespace 导入：红阶段（新 API 未实现）以 per-test 失败呈现而非整文件链接失败
import * as TS from '../../docs/src/services/governance/today-summary.js?v=20261002i';

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

// ── ⑦ 按动作性质分组（2026-10-01 批次 320 立 · 支书裁定「甲：直接用 TodoActionType 七类」）──────
//   判据出处：支书原话「按照**工作类型**划分，而不是按照 活动/专班分」＋「我提的工作类型更多想说的是
//   **审核类、提交类、表决类** 等等！！」⇒ 顶层分组＝**动作性质**（`TodoActionType`），九业务域降为行内胶囊。
test('⑦ byAction：按动作性质七类分组（空组不出现 / 组序固定 / 每行带业务域 / 无截止殿后）', () => {
  beginMockCase();
  // ⚠ 本用例**刻意换角色键**（`org` 而非前面各例的 `secretary`）：`TodoStore` 的聚合缓存以
  //   `byAction:<role>:<今日>` 为键、以内部写版本校验，而本文件的 fixture 是**直改 mockDB**、
  //   不经写口 ⇒ 同角色同日的缓存会命中旧值（这是既有的测试手法约束，不是产品缺陷）。
  //   换角色 = 换缓存键，既不动产品代码也不改其他用例。
  pushTodo({ id: 't-a1', title: '审核发展对象材料', role: 'org', actionType: 'review', category: 'review', deadline: '2026-09-10' });
  pushTodo({ id: 't-a2', title: '审核思想汇报', role: 'org', actionType: 'review', category: 'review' });
  pushTodo({ id: 't-s1', title: '提交支委会纪要', role: 'org', actionType: 'submit', category: 'submit' });
  const s = TS.buildTodaySummary({ personId: 'p6', role: 'org', now: D0910 });
  assert.ok(Array.isArray(s.byAction), 'byAction 须存在（批次 320 新增字段）');
  // ⚠ 种子本岗另有待办 ⇒ 不断言「全集恰为两类」，而断言**呈现契约**：组键只许七类之一、
  //   且组序＝ACTION_ORDER 的过滤子序列（顺序固定、不随数据抖动）。
  const ORDER = ['review', 'submit', 'authorize', 'participate', 'archive', 'read', 'track'];
  const seq = s.byAction.map(g => g.actionType);
  assert.ok(seq.every(k => ORDER.includes(k)), '组键只许是 TodoActionType 七类之一（不得自造分类）');
  assert.deepEqual(seq, ORDER.filter(k => seq.includes(k)), '组序＝ACTION_ORDER（固定呈现顺序）');
  const review = s.byAction.find(g => g.actionType === 'review');
  assert.ok(review, `本批推入的「审核」须成组；实得组=${JSON.stringify(seq)}`);
  assert.ok(seq.indexOf('review') < seq.indexOf('submit') || !seq.includes('submit'),
    '审核 组须排在 提交 组之前（ACTION_ORDER 口径）');
  assert.equal(review.label, '审核', '组标题＝动作性质中文标签');
  const mine = review.items.filter(i => /^t-a/.test(i.id)).map(i => i.id);
  assert.deepEqual(mine, ['t-a1', 't-a2'], '组内截止升序、**无截止者殿后**');
  assert.ok(review.items.every(i => typeof i.domainLabel === 'string' && i.domainLabel.length > 0),
    '每行须带业务域标签（九域降为行内胶囊）——由 inferDomain + WORK_DOMAIN_LABELS 单一源给');
  const submit = s.byAction.find(g => g.actionType === 'submit');
  assert.ok(submit && submit.items.some(i => i.id === 't-s1'), '无截止的「提交」项也须入组（旧版只统计不列示）');
});