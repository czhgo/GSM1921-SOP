// role: [工程师]+[AI]
// server/test/perf-version-token.test.mjs — P0 提速批护栏：域写版本戳 bump 正确性（2026-09-07）
// 依据：.trae/specs/2026-09-07-perf/spec.md §二.3/§五（version-token 域缓存：各域写口至少一条
// 「写 → tokenOf 递增 / 聚合读数变化；未写 → tokenOf 不变」+ resetAllTokens 生效）
// 覆盖（member-persist 桩范式）：
//   attendance / inspection / activityReview / taskforce / resolution / signup
//   每域：① 未写时连续 tokenOf 读数不变；② 走 service 写口后 tokenOf 递增；
//   ③ resetAllTokens 清空后全部归零、可重新 bump。
// 运行：node --test test/perf-version-token.test.mjs（server 目录）
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { mockDB } from '../../docs/src/core/domain.js?v=20260908c';
import { MockAdapter } from '../../docs/src/core/mock-adapter.js?v=20260908c';
import { setDataSource } from '../../docs/src/core/data-adapter.js?v=20260908c';
import { bumpToken, tokenOf, resetAllTokens } from '../../docs/src/core/version-token.js?v=20260908c';
import { saveAttendanceRecords, loadAttendanceRecords } from '../../docs/src/services/attendance.js?v=20260908c';
import { saveInspectionRecords, loadInspectionRecords } from '../../docs/src/services/inspection.js?v=20260908c';
import { addActivityReview } from '../../docs/src/services/review.js?v=20260908c';
import { TaskForceRecordStore } from '../../docs/src/services/taskforce.js?v=20260908c';
import { SignupStore } from '../../docs/src/services/signup.js?v=20260908c';
import { saveFollowups } from '../../docs/src/services/resolution-followup.js?v=20260908c';
import { SecretaryOverviewStore, SecretaryTodoDeriver } from '../../docs/src/services/secretary-overview.js?v=20260908c';

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

test('① attendance：未写 tokenOf 不变；saveAttendanceRecords 写口后递增', () => {
  beginMockCase();
  const b1 = tokenOf('attendance');
  assert.equal(tokenOf('attendance'), b1, '未写时读数不变');
  saveAttendanceRecords([...loadAttendanceRecords().slice(0, 1), {
    id: 'att-p0', activityId: 'act-x', personId: 'p1', status: 'present',
    recordedBy: 'u_disc', recordedAt: '2026-09-06T08:00:00.000Z',
  }]);
  assert.ok(tokenOf('attendance') > b1, '考勤写口 → attendance token 递增');
});

test('② inspection：未写 tokenOf 不变；saveInspectionRecords 写口后递增', () => {
  beginMockCase();
  const b1 = tokenOf('inspection');
  assert.equal(tokenOf('inspection'), b1, '未写时读数不变');
  saveInspectionRecords([...loadInspectionRecords().slice(0, 1), {
    id: 'ins-p0', sourceType: 'activity', activityId: 'act-x', personId: 'p1',
    level: 'organize', role: '策划', recordedBy: 'u_disc', recordedAt: '2026-09-06T08:00:00.000Z', status: 'pending',
  }]);
  assert.ok(tokenOf('inspection') > b1, '考察写口 → inspection token 递增');
});

test('③ activityReview：未写 tokenOf 不变；addActivityReview 写口后递增', () => {
  beginMockCase();
  const b1 = tokenOf('activityReview');
  assert.equal(tokenOf('activityReview'), b1, '未写时读数不变');
  addActivityReview({
    id: 'rev-p0', activityId: 'act-x', organizerId: 'p1', progress: '已完成',
    reviewStatus: '未提交', reviewContent: '', issues: [],
  });
  assert.ok(tokenOf('activityReview') > b1, '活动复盘写口 → activityReview token 递增');
});

test('④ taskforce：未写 tokenOf 不变；TaskForceRecordStore.add 写口后递增', () => {
  beginMockCase();
  TaskForceRecordStore._records = []; // 复位模块级内存态（loadDB 不播专班种子）
  const b1 = tokenOf('taskforce');
  assert.equal(tokenOf('taskforce'), b1, '未写时读数不变');
  TaskForceRecordStore.add({ id: 'tf-p0', name: 'P0 测试专班', task: '测试', status: 'recruiting', manager: 'p11', initiator: 'p11', members: [{ personId: 'p1', role: 'participant' }] });
  assert.ok(tokenOf('taskforce') > b1, '专班写口 → taskforce token 递增');
});

test('⑤ resolution：未写 tokenOf 不变；saveFollowups 写口后递增（决议=活动 agenda 内嵌）', async () => {
  beginMockCase();
  mockDB.activities = [{
    id: 'act-p0', title: 'P0 测试支委会', date: '2026-09-06', status: 'published',
    agenda: [{ id: 'ag-p0', item: '通过 P0 议题', result: 'passed', followups: [] }],
  }];
  const b1 = tokenOf('resolution');
  assert.equal(tokenOf('resolution'), b1, '未写时读数不变');
  await saveFollowups({
    activityId: 'act-p0', agendaItemId: 'ag-p0', actorId: 'p13',
    followups: [{ item: '落实 P0 议题', ownerType: 'role', ownerId: 'org-commissioner', deadline: '2099-12-31' }],
  });
  assert.ok(tokenOf('resolution') > b1, '决议跟进写口 → resolution token 递增');
});

test('⑥ signup：未写 tokenOf 不变；SignupStore.apply 写口后递增', () => {
  beginMockCase();
  mockDB.activities = [...mockDB.activities, {
    id: 'act-su-p0', title: 'P0 报名活动', date: '2099-03-01', status: 'published',
    scenarioId: 'theme-party', organizer: 'p1', createdBy: 'p1', assignments: [],
  }];
  mockDB.taskforces = [];
  TaskForceRecordStore._records = [];
  SignupStore._signups = [];
  SignupStore.init();
  const b1 = tokenOf('signup');
  assert.equal(tokenOf('signup'), b1, '未写时读数不变');
  const r = SignupStore.apply({ sourceType: 'activity', sourceId: 'act-su-p0', personId: 'p3', role: 'organizer' });
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.ok(tokenOf('signup') > b1, '报名写口 → signup token 递增');
});

test('⑦ bumpToken 单调 + resetAllTokens 生效后全部归零、可重新 bump', () => {
  beginMockCase();
  const keys = ['attendance', 'activity', 'inspection', 'activityReview', 'archiveRecord',
    'taskforce', 'resolution', 'signup', 'handoff', 'memberConfirmation', 'notice', 'member', 'todo'];
  // 单调递增（同文件前例已 bump 过 → 相对基线 +2 断言，勿假定从 0 起）
  const base = tokenOf('attendance');
  bumpToken('attendance');
  bumpToken('attendance');
  assert.equal(tokenOf('attendance'), base + 2, '同域多次 bump 单调递增');
  // resetAllTokens：全部归零
  resetAllTokens();
  for (const k of keys) {
    assert.equal(tokenOf(k), 0, `resetAllTokens 后 ${k} 归零`);
  }
  // 归零后可重新 bump（缓存重算通路可用）
  bumpToken('attendance');
  assert.equal(tokenOf('attendance'), 1, 'reset 后可重新 bump');
});

test('⑧ 聚合入口复合键缓存：未写同引用；attendance 写口后重算（computeAggregates / getOverview）', () => {
  beginMockCase();
  // 预热：getOverview 首次计算会触发 NoticeStore.init 等惰性副作用（可能 bump notice token）——
  // 应用启动期已落定，预热一次后再断言缓存同引用
  SecretaryOverviewStore.getOverview();
  SecretaryTodoDeriver.computeAggregates();
  const a1 = SecretaryTodoDeriver.computeAggregates();
  const o1 = SecretaryOverviewStore.getOverview();
  assert.strictEqual(SecretaryTodoDeriver.computeAggregates(), a1, 'computeAggregates 未写命中同引用（只读契约）');
  assert.strictEqual(SecretaryOverviewStore.getOverview(), o1, 'getOverview 未写命中同引用（只读契约）');
  // 写口（attendance）→ token 递增 → 复合键变 → 重算（新引用）
  saveAttendanceRecords([...loadAttendanceRecords(), {
    id: 'att-p8', activityId: 'act-zz', personId: 'p1', status: 'present',
    recordedBy: 'u_disc', recordedAt: '2026-09-06T08:00:00.000Z',
  }]);
  assert.ok(tokenOf('attendance') > 0, 'attendance 写口已 bump');
  assert.notStrictEqual(SecretaryTodoDeriver.computeAggregates(), a1, 'attendance 写口后 computeAggregates 重算（新引用）');
  assert.notStrictEqual(SecretaryOverviewStore.getOverview(), o1, 'attendance 写口后 getOverview 重算（新引用）');
});
