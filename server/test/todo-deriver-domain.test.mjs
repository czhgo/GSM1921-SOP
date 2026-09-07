// role: [工程师]+[AI]
// server/test/todo-deriver-domain.test.mjs — IA 收敛 C1 Task2：所有 TodoStore 派生点补
// 「稳定 actionKey + 准确 domain（含会务 scenarioId）」归属表（2026-09-07）
// 依据：.trae/specs/2026-09-06-ia-todo-cards/plan-c1.md Task2 + spec.md 三节映射
// 现状（Task1 已落 _buildTodo 兜底 domain 推断）：本批断言各派生动作后 todo.domain 归属
// 正确且稳定 actionKey 存在——
//   ① 活动创建 → leader authorize 待办 domain 按 scenarioId 分（三会→会务、theme-party→活动/项目）
//     且 actionData 带 scenarioId；专班创建 → org taskforce-authorize（→专班）
//   ② 活动归档 → prop archive 待办 domain=归档宣传 + actionKey activity-archive
//   ③ visitor 参与（活动/专班）→ 活动/项目 或 会务(三会) / 专班 + actionKey participate
//   ④ 通知阅读类（NoticeTodoDeriver / Visitor 通知扫描）→ domain=NONE + actionKey notice-read
//   ⑤ handoff 三型 → 考勤纪律(attendance-archival/material-shortage)/考察(inspection-report) + handoff-*
//   ⑥ signup-review 报名审核 → 按源活动(theme-party→活动/项目)/专班 归域；approved 报名 participate 同③
//   ⑦ resolution-followup → 决议上报（稳定键已设，本批锁定）
//   ⑧ 书记/纪检实时组（remind/confirm/成员组/决议逾期）导出 REALTIME_GROUP_DOMAIN 域标签，
//     且组对象标注 domain（供 T4 域折组展示）
// 构造方式：直接调用各服务/派生器（造业务数据），个别派生点对 TodoStore.create 断言兜底。
// 运行：node --test test/todo-deriver-domain.test.mjs（server 目录）
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { mockDB } from '../../docs/src/core/domain.js?v=20260903c';
import {
  MockAdapter,
} from '../../docs/src/core/mock-adapter.js?v=20260903c';
import { setDataSource } from '../../docs/src/core/data-adapter.js?v=20260903c';
import {
  WORK_DOMAIN, TodoStore, TodoSourceType,
  LifecycleTodoDeriver, VisitorTodoDeriver, NoticeTodoDeriver,
  REALTIME_GROUP_DOMAIN, realtimeGroupDomainOf,
} from '../../docs/src/services/todo.js?v=20260903c';
import { HandoffStore } from '../../docs/src/services/handoff.js?v=20260903c';
import { SignupStore } from '../../docs/src/services/signup.js?v=20260903c';
import { TaskForceRecordStore } from '../../docs/src/services/taskforce.js?v=20260903c';
import {
  saveFollowups, buildOverdueRemindGroup,
} from '../../docs/src/services/resolution-followup.js?v=20260903c';
import { SecretaryTodoDeriver } from '../../docs/src/services/secretary-overview.js?v=20260903c';

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
  // 服务层内存态复位（模块级单例，避免用例间串场）
  TaskForceRecordStore._records = [];
  SignupStore._signups = [];
  mockDB.signups = [];
  mockDB.taskforces = [];
}

// ═══════════════ ① 活动/专班创建 → 赋权（Lifecycle） ═══════════════

test('① 活动创建 → leader authorize：scenarioId 分域（三会→会务、theme-party→活动/项目）+ 稳定键 activity-authorize', () => {
  beginMockCase();
  LifecycleTodoDeriver.deriveFromActivityCreate({ id: 'act-m', title: '9月支委会', date: '2026-09-10', scenarioId: 'branch-committee' });
  LifecycleTodoDeriver.deriveFromActivityCreate({ id: 'act-t', title: '主题党日实践', date: '2026-09-12', scenarioId: 'theme-party' });
  LifecycleTodoDeriver.deriveFromActivityCreate({ id: 'act-x', title: '无类型活动', date: '2026-09-15' });

  const byAct = (id) => TodoStore.getAll().find(t => t.sourceType === 'activity' && t.sourceId === id);
  const tm = byAct('act-m');
  assert.equal(tm.role, 'leader');
  assert.equal(tm.actionType, 'authorize');
  assert.equal(tm.actionKey, 'activity-authorize', '活动赋权派生补稳定 actionKey');
  assert.equal(tm.domain, 'meeting', '三会 scenarioId → 会务域');
  assert.equal(tm.actionData.scenarioId, 'branch-committee', 'scenarioId 落到 actionData');

  const tt = byAct('act-t');
  assert.equal(tt.actionKey, 'activity-authorize');
  assert.equal(tt.domain, 'activity', 'theme-party → 活动/项目域');
  assert.equal(tt.actionData.scenarioId, 'theme-party');

  assert.equal(byAct('act-x').domain, 'activity', '无 scenario → 默认活动/项目');
});

test('①b 专班创建 → org-commissioner authorize：domain=专班 + 稳定键 taskforce-authorize', () => {
  beginMockCase();
  LifecycleTodoDeriver.deriveFromTaskforceCreate({ id: 'tf-a', name: '迎新专班', startDate: '2026-09-20', endDate: '2026-10-20' });
  const t = TodoStore.getAll().find(x => x.sourceType === 'taskforce' && x.sourceId === 'tf-a');
  assert.equal(t.role, 'org-commissioner');
  assert.equal(t.actionType, 'authorize');
  assert.equal(t.actionKey, 'taskforce-authorize', '专班赋权派生补稳定 actionKey');
  assert.equal(t.domain, 'taskforce');
});

// ═══════════════ ② 活动归档 → 宣传归档（Lifecycle） ═══════════════

test('② 活动归档 → prop archive：domain=归档宣传 + 稳定键 activity-archive', () => {
  beginMockCase();
  LifecycleTodoDeriver.deriveFromActivityArchive({ id: 'act-a', title: '需归档活动', scenarioId: 'theme-party' });
  const t = TodoStore.getAll().find(x => x.sourceType === 'activity' && x.sourceId === 'act-a');
  assert.equal(t.role, 'prop-commissioner');
  assert.equal(t.actionType, 'archive');
  assert.equal(t.actionKey, 'activity-archive', '活动归档派生补稳定 actionKey');
  assert.equal(t.domain, 'archive', '活动材料归档归「归档宣传」域（spec 三节建议落定）');
});

// ═══════════════ ③ visitor 参与（活动/专班） ═══════════════

test('③ visitor 参与：活动/专班 participate + 稳定键 participate（三会活动→会务）', () => {
  beginMockCase();
  // 活动与三会活动在一次全量扫描内派生（deriveFromActivities 会清理本次非 applicable 的同源残留，
  // 两次子集调用会互删；合并为一次调用，语义=工作台实时全量派生）
  VisitorTodoDeriver.deriveFromActivities({
    personId: 'p3',
    activities: [
      { id: 'act-v', title: '社区志愿', date: '2099-01-05', status: 'published', scenarioId: 'theme-party', organizer: 'p3', assignments: [] },
      { id: 'act-vm', title: '党小组会', date: '2099-01-06', status: 'published', scenarioId: 'party-group-meeting', organizer: 'p1', assignments: [{ personId: 'p3', role: 'participant' }] },
    ],
    signups: [],
  });
  VisitorTodoDeriver.deriveFromTaskforceSignups({
    personId: 'p3',
    taskforces: [{ id: 'tf-v', name: '迎新专班', status: 'recruiting', deadline: '2099-02-01', task: '迎新生', members: [{ personId: 'p3', role: 'participant' }] }],
    signups: [],
  });

  const findPart = (sid) => TodoStore.getAll().find(t => t.actionType === 'participate' && t.sourceId === sid);
  const act = findPart('act-v');
  assert.equal(act.role, 'visitor');
  assert.equal(act.actionKey, 'participate', '活动参与派生补稳定 actionKey');
  assert.equal(act.domain, 'activity', 'theme-party → 活动/项目域');
  assert.equal(act.actionData.scenarioId, 'theme-party');

  const vm = findPart('act-vm');
  assert.equal(vm.actionKey, 'participate');
  assert.equal(vm.domain, 'meeting', '三会参与 → 会务域（scenarioId 落到 actionData）');

  const tf = findPart('tf-v');
  assert.equal(tf.actionKey, 'participate');
  assert.equal(tf.domain, 'taskforce', '专班参与 → 专班域');
});

// ═══════════════ ④ 通知阅读类 → NONE ═══════════════

test('④ 通知派生（NoticeTodoDeriver / Visitor 通知扫描）：domain=NONE + 稳定键 notice-read', () => {
  beginMockCase();
  NoticeTodoDeriver.deriveFromNotice({
    id: 'nt-1', title: '支部大会通知', content: '请查收', actionable: true,
    actionRoles: ['secretary'], targetModule: 'workspace', priority: 'normal',
  });
  VisitorTodoDeriver.deriveFromNotices({
    personId: 'p3',
    notices: [{ id: 'nt-2', title: '活动预告', content: '', targetModule: 'activity', read: false }],
  });

  const n1 = TodoStore.getAll().find(t => t.sourceId === 'nt-1');
  assert.equal(n1.category, 'notice');
  assert.equal(n1.actionKey, 'notice-read', '通知阅读派生补稳定 actionKey');
  assert.equal(n1.domain, 'none', '通知类不入业务域（轻量未读，C1 Task4 未读条）');

  const n2 = TodoStore.getAll().find(t => t.sourceId === 'nt-2');
  assert.equal(n2.actionKey, 'notice-read');
  assert.equal(n2.domain, 'none');
});

// ═══════════════ ⑤ handoff 三型 ═══════════════

test('⑤ handoff 三型：考勤备案/补课回执→考勤纪律，考察提交→考察（稳定 handoff-* 键已设）', () => {
  beginMockCase();
  HandoffStore.create({ type: 'attendance-archival', refType: 'activity', refLabel: '考勤备案', refId: 'act-1' });
  HandoffStore.create({ type: 'inspection-report', refType: 'activity', refLabel: '考察记录', refId: 'act-2' });
  HandoffStore.create({ type: 'material-shortage', refType: 'activity', refLabel: '补课需求', refId: 'act-3' });

  const byKey = (k) => TodoStore.getAll().find(t => t.actionKey === k);
  const h1 = byKey('handoff-attendance-archival');
  assert.equal(h1.role, 'prop-commissioner');
  assert.equal(h1.domain, 'attendance', '考勤备案（纪检→宣传）归考勤纪律域（spec 三节）');

  const h2 = byKey('handoff-inspection-report');
  assert.equal(h2.role, 'org-commissioner');
  assert.equal(h2.domain, 'inspection', '考察记录提交（纪检→组织）归考察域');

  const h3 = byKey('handoff-material-shortage');
  assert.equal(h3.role, 'disc-commissioner');
  assert.equal(h3.domain, 'attendance', '补课需求回执（组织→纪检）归考勤纪律域（补课相关）');
});

// ═══════════════ ⑥ signup-review 报名审核 ═══════════════

test('⑥ signup-review：活动(theme-party)→活动/项目、专班→专班；approved 报名 participate 同步打标', () => {
  beginMockCase();
  // 活动源：organizer=组长 p1（审核人角色 leader）
  mockDB.activities = [
    ...mockDB.activities,
    { id: 'act-su', title: '实践参访报名', date: '2099-03-01', status: 'published', scenarioId: 'theme-party', organizer: 'p1', createdBy: 'p1', assignments: [] },
    // p3 已是该活动参与者（assignments 预置 → apply participant 时 _writeSource 同步 return，避免异步泄漏跨用例）
    { id: 'act-su2', title: '志愿活动报名', date: '2099-03-05', status: 'published', scenarioId: 'theme-party', organizer: 'p1', createdBy: 'p1', assignments: [{ personId: 'p3', role: 'participant' }] },
  ];
  // 专班源：initiator=组长 p1
  mockDB.taskforces = [
    { id: 'tf-su', name: '迎新专班', status: 'recruiting', deadline: '2099-04-01', task: '迎新生', initiator: 'p1', members: [] },
  ];
  TaskForceRecordStore._records = [...mockDB.taskforces];

  // organizer 报名（pending）→ 审核待办
  const ra = SignupStore.apply({ sourceType: 'activity', sourceId: 'act-su', personId: 'p3', role: 'organizer' });
  assert.equal(ra.ok, true);
  const rt = SignupStore.apply({ sourceType: 'taskforce', sourceId: 'tf-su', personId: 'p3', role: 'deep' });
  assert.equal(rt.ok, true);

  const ta = TodoStore.getAll().find(t => t.actionKey === 'signup-review' && t.actionData && t.actionData.signupId === ra.signup.id);
  assert.ok(ta, '活动报名审核待办已派生');
  assert.equal(ta.role, 'leader', '审核人=活动 organizer（p1 leader）');
  assert.equal(ta.sourceType, 'activity');
  assert.equal(ta.actionKey, 'signup-review', 'signup-review 稳定键已设');
  assert.equal(ta.domain, 'activity', '活动侧报名审核按源活动归活动/项目域');
  assert.equal(ta.actionData.scenarioId, 'theme-party', '源活动 scenarioId 落到 actionData');

  const tt = TodoStore.getAll().find(t => t.actionKey === 'signup-review' && t.actionData && t.actionData.signupId === rt.signup.id);
  assert.ok(tt, '专班报名审核待办已派生');
  assert.equal(tt.role, 'leader', '审核人=专班 initiator（p1 leader）');
  assert.equal(tt.sourceType, 'taskforce');
  assert.equal(tt.actionKey, 'signup-review');
  assert.equal(tt.domain, 'taskforce', '专班侧报名审核归专班域');

  // participant 报名（auto approved）→ 参与待办同步打标
  const rp = SignupStore.apply({ sourceType: 'activity', sourceId: 'act-su2', personId: 'p3', role: 'participant' });
  assert.equal(rp.ok, true);
  const tp = TodoStore.getAll().find(t => t.actionType === 'participate' && t.sourceId === 'act-su2');
  assert.ok(tp, 'approved 报名生成参与待办');
  assert.equal(tp.role, 'visitor');
  assert.equal(tp.actionKey, 'participate', '报名渠道参与待办与 VisitorDeriver 同键');
  assert.equal(tp.domain, 'activity');
});

// ═══════════════ ⑦ resolution-followup ═══════════════

test('⑦ resolution-followup：责任人跟进待办 domain=决议上报 + 稳定键（已设，锁定回归）', async () => {
  beginMockCase();
  mockDB.activities = [{
    id: 'act-fu', title: '9月支委会', date: '2026-09-06', scenarioId: 'branch-committee',
    agenda: [{
      id: 'ag-1', item: '审议九月工作计划', result: 'passed',
      followups: [{ item: '制定发展计划', ownerType: 'role', ownerId: 'org-commissioner', deadline: '2026-09-10', status: 'pending' }],
    }],
  }];
  await saveFollowups({ activityId: 'act-fu', agendaItemId: 'ag-1', followups: [
    { item: '制定发展计划', ownerType: 'role', ownerId: 'org-commissioner', deadline: '2026-09-10', status: 'pending' },
  ] });
  const t = TodoStore.getAll().find(x => x.actionKey === 'resolution-followup');
  assert.ok(t, '决议待落实派生责任人跟进待办');
  assert.equal(t.role, 'org-commissioner');
  assert.equal(t.actionKey, 'resolution-followup');
  assert.equal(t.domain, 'resolution', '决议跟进归决议上报域');
});

// ═══════════════ ⑧ 书记/纪检实时组域标签 ═══════════════

test('⑧ 实时组域标签：导出映射覆盖书记 8 组/决议逾期/成员组/纪检队列，组对象带 domain（供 T4）', () => {
  beginMockCase();
  const expectMap = {
    'attendance-remind': WORK_DOMAIN.ATTENDANCE,
    'attendance-confirm': WORK_DOMAIN.ATTENDANCE,
    'inspection-remind': WORK_DOMAIN.INSPECTION,
    'inspection-confirm': WORK_DOMAIN.INSPECTION,
    'review-remind': WORK_DOMAIN.ACTIVITY,   // 活动复盘待提交（spec 三节：复盘归活动/项目）
    'review-confirm': WORK_DOMAIN.ACTIVITY,  // 活动复盘复核
    'archive-remind': WORK_DOMAIN.ARCHIVE,
    'archive-confirm': WORK_DOMAIN.ARCHIVE,
    'resolution-followup-remind': WORK_DOMAIN.RESOLUTION,
    'member-confirm': WORK_DOMAIN.MEMBER_DEV,
    'semester-detained-remind': WORK_DOMAIN.MEMBER_DEV,
  };
  for (const [k, d] of Object.entries(expectMap)) {
    assert.equal(REALTIME_GROUP_DOMAIN[k], d, `REALTIME_GROUP_DOMAIN[${k}] = ${d}`);
    assert.equal(realtimeGroupDomainOf({ actionKey: k }), d, `realtimeGroupDomainOf({actionKey:'${k}'})`);
  }
  // 组对象标注：书记实时聚合（造一条已结束且无考勤/复盘的活动，确保 remind 组出现）
  mockDB.activities = [{ id: 'act-old', title: '已结束活动', date: '2026-08-01', status: 'completed' }];
  mockDB.attendances = [];
  mockDB.inspections = [];
  mockDB.activityReviews = [];
  mockDB.archiveRecords = [];
  const aggs = SecretaryTodoDeriver.computeAggregates();
  assert.ok(aggs.length > 0, '种子场景下书记提醒组非空（attendance/review-remind 至少出现）');
  for (const g of aggs) {
    assert.equal(g.domain, REALTIME_GROUP_DOMAIN[g.actionKey],
      `SecretaryTodoDeriver 组 ${g.actionKey} 已标注 domain`);
  }
  // 决议逾期提醒组对象标注
  const overdueAct = { id: 'act-fu2', title: '支委会', date: '2026-08-01',
    agenda: [{ id: 'ag-1', item: '通过议题', result: 'passed',
      followups: [{ id: 'f1', item: '逾期未办', ownerType: 'role', ownerId: 'org-commissioner', deadline: '2026-09-01', status: 'pending' }] }] };
  const g = buildOverdueRemindGroup([overdueAct], '2026-09-06');
  assert.ok(g, '决议逾期应生成提醒组');
  assert.equal(g.actionKey, 'resolution-followup-remind');
  assert.equal(g.domain, 'resolution', '决议逾期提醒组 domain=决议上报');
  assert.equal(realtimeGroupDomainOf(g), 'resolution');
});
