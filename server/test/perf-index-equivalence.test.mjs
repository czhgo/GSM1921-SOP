// role: [工程师]+[AI]
// server/test/perf-index-equivalence.test.mjs — P1 索引降复杂度·等价断言（2026-09-07）
// 依据：.trae/specs/2026-09-07-perf/spec.md §三（P1 索引降复杂度）与 §五（等价测试）
// 目的：P1 各「预建 Map/分组查表」改造与改造前逐格扫描 / 逐条 .some 输出严格等价——
//   ① calendar 日索引（buildCalendarDayIndex）：分组输出 == 逐格扫描（同 data 同结果集合+保序）
//   ② 考勤缺口 Map（SecretaryTodoDeriver._aggAttendanceRemind）：缺口活动序 == 旧嵌套
//      activities.filter(结束>3 天).filter(!attendances.some(...)) 对偶实现
//   ③ signup 索引（buildApprovedSignupIndex + approvedSignupHit）与旧 .some 判定等价
//      （边界：pending / taskforce 源 / 重复行 / 源 id 缺失 / null 行）
//   ④ isTodoExpired（todo.js 收敛单一实现）与旧四处判定等价（构造 expired/到期当天/未来/
//      完成/进行中/无 deadline/无 status 实时条目样例）
// 运行：node --test test/perf-index-equivalence.test.mjs（server 目录）
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { mockDB } from '../../docs/src/core/domain.js?v=20260908c';
import { MockAdapter } from '../../docs/src/core/mock-adapter.js?v=20260908c';
import { setDataSource } from '../../docs/src/core/data-adapter.js?v=20260908c';
// 日历日索引纯分组 helper（calendar.js 现为 node 可导：resize 监听已 typeof 守卫）
import { buildCalendarDayIndex } from '../../docs/src/components/calendar.js?v=20260908c';
import { SecretaryTodoDeriver } from '../../docs/src/services/secretary-overview.js?v=20260908c';
import {
  buildApprovedSignupIndex, approvedSignupHit,
} from '../../docs/src/services/today-summary.js?v=20260908c';
import { TodoStatus, isTodoExpired } from '../../docs/src/services/todo.js?v=20260908c';

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
  MockAdapter.loadDB(); // seed：activities/tasks/assignments/archiveRecords/signups/branches
}

// ═══════════════ ① calendar 日索引 ≡ 逐格扫描 ═══════════════

test('① calendar 日索引：acts / viaTasksByDate 分组输出与逐格扫描同集合同序', () => {
  // 构造混合数据：带 date/不带 date 活动；带 date 任务 / 无 date 任务（引用现存活动/引用不存在
  // 活动 / 引用已归档活动 id）/ 双字段任务 / 空字段任务
  const activities = [
    { id: 'a1', title: '大会', date: '2026-09-01' },
    { id: 'a2', title: '党课', date: '2026-09-01' },
    { id: 'a3', title: '党小组会', date: '2026-09-03' },
    { id: 'a4', title: '无日期活动', date: null },      // 无 date 不入桶（与 filter(a.date===k) 一致）
    { id: 'a5', title: '已归档', date: '2026-09-04', archived: true }, // 调用方已滤 archived——测试主动集含它验证 id 匹配
    { id: 'a6', title: '空串日期', date: '' },          // 空串不入桶
  ];
  // 调用方语义 = 非归档（render 各视图传 activeActivities）
  const activeActivities = activities.filter(a => !a.archived);
  const tasks = [
    { id: 't1', title: '直排 09-01', date: '2026-09-01' },
    { id: 't2', title: '经活动归日', activityId: 'a2' },             // → 09-01
    { id: 't3', title: '经活动归日', activityId: 'a3' },             // → 09-03
    { id: 't4', title: '引用无日期活动', activityId: 'a4' },         // 无日期活动 → 不入任何桶
    { id: 't5', title: '引用已归档', activityId: 'a5' },             // 不在 activeActivities → 不入桶
    { id: 't6', title: '引用不存在活动', activityId: 'ghost' },      // 不入桶
    { id: 't7', title: '双字段任务', date: '2026-09-02', activityId: 'a1' }, // 有 date → 只算直排，不算 via
    { id: 't8', title: '直排 09-03', date: '2026-09-03' },
    { id: 't9', title: '无字段', date: '', activityId: null },
  ];

  const { acts, viaTasksByDate } = buildCalendarDayIndex(activeActivities, tasks);

  // ①a 全活动日期键集合一致（含无活动日不存在键）
  const expectedDates = [...new Set(activeActivities.filter(a => typeof a.date === 'string' && a.date).map(a => a.date))];
  assert.deepEqual([...acts.keys()].sort(), [...expectedDates].sort(), 'acts 键 = 有 date 活动的去重日期集');

  // ①b 逐格扫描对照：每日 acts == activeActivities.filter(a.date === k)（保序同集合）
  const queryDates = [...new Set([...expectedDates, '2026-09-02', '2026-09-05'])];
  for (const k of queryDates) {
    const grouped = (acts.get(k) || []).map(a => a.id);
    const scanned = activeActivities.filter(a => a.date === k).map(a => a.id);
    assert.deepEqual(grouped, scanned, `acts[${k}] 与逐格 filter 一致`);
  }

  // ①c via 任务逐格对照：viaTasksByDate[k] == tasks.filter(!t.date && activityId ∈ 当日活动 id 集)
  for (const k of queryDates) {
    const dayActIds = new Set(activeActivities.filter(a => a.date === k).map(a => a.id));
    const scanned = tasks.filter(t => !t.date && t.activityId && dayActIds.has(t.activityId)).map(t => t.id);
    const grouped = (viaTasksByDate.get(k) || []).map(t => t.id);
    assert.deepEqual(grouped, scanned, `viaTasks[${k}] 与逐格 filter 一致`);
  }

  // ①d 具体语义抽查：t2→09-01、t3→09-03；t5/t6/t4/t9 不入桶；t7 不入 via
  assert.deepEqual(viaTasksByDate.get('2026-09-01').map(t => t.id), ['t2']);
  assert.deepEqual(viaTasksByDate.get('2026-09-03').map(t => t.id), ['t3']);
  assert.ok(!viaTasksByDate.has('2026-09-04'), '引用已归档活动的任务不入桶（当日无 active 活动）');
  assert.deepEqual(acts.get('2026-09-01').map(a => a.id), ['a1', 'a2'], '同日多活动保序');
});

// ═══════════════ ② 考勤缺口 Map ≡ 旧嵌套对偶 ═══════════════

test('② 考勤缺口（_aggAttendanceRemind Map 化）：缺口活动序与旧嵌套对偶实现一致', () => {
  beginMockCase();
  // 受控数据：全部替换（活动须为非空数组——loadActivities 空表回退静态种子，故必填自定义）
  const activities = [
    { id: 'g1', title: '结束未录-旧', date: '2000-01-01', status: 'completed' },   // >3 天且无记录 → 缺口
    { id: 'g2', title: '结束已录', date: '2000-01-02', status: 'completed' },      // 有记录 → 排除
    { id: 'g3', title: '归档未录', date: '2000-01-03', archived: true },           // >3 天且无记录 → 缺口
    { id: 'g4', title: '进行中', date: '2000-01-04', status: 'published' },        // 非结束态 → 排除
    { id: 'g5', title: '无日期结束', date: null, status: 'completed' },            // 无 date → 排除
    { id: 'g6', title: '结束未录-新', date: '2000-01-05', archived: true },        // → 缺口（隔在 g5 后验序）
  ];
  mockDB.activities = activities;
  mockDB.attendances = [
    { id: 'r1', activityId: 'g2', personId: 'p1', status: 'present' },
    { id: 'r2', activityId: 'g2', personId: 'p2', status: 'absent' },   // g2 已录（任意状态都算"已录"）→ 排除
  ];

  // 旧嵌套对偶实现（改造前逻辑逐字）
  const today = new Date().toISOString().slice(0, 10);
  const daysBetween = (from, to) => Math.floor((new Date(to) - new Date(from)) / (24 * 60 * 60 * 1000));
  const refGapIds = activities
    .filter(a => (a.status === 'completed' || a.archived) && a.date)
    .filter(a => daysBetween(a.date, today) > 3)
    .filter(a => !mockDB.attendances.some(r => r.activityId === a.id))
    .map(a => a.id);
  assert.deepEqual(refGapIds, ['g1', 'g3', 'g6'], '参照实现自身合理性（g2/g1 有记录排除、g4/g5 非候选）');

  const groups = SecretaryTodoDeriver._aggAttendanceRemind();
  assert.equal(groups.length, 1, '提醒组仅一组');
  const group = groups[0];
  assert.equal(group.actionKey, 'attendance-remind');
  assert.deepEqual(group.items.map(it => it.activityId), refGapIds,
    'Map 查表缺口活动序 == 旧 attendances.some 嵌套');
  assert.equal(group.count, refGapIds.length);
});

// ═══════════════ ③ signup 索引 ≡ 旧 .some 判定 ═══════════════

test('③ 报名索引（buildApprovedSignupIndex/approvedSignupHit）：与旧 _approvedSignup .some 全表判定等价', () => {
  // 旧判定对偶（today-summary 改造前逐字）
  const oldApproved = (signups, activityId, personId) =>
    (signups || []).some(s =>
      s && s.sourceType === 'activity' && s.sourceId === activityId &&
      s.personId === personId && s.status === 'approved'
    );

  const signups = [
    { id: 's1', sourceType: 'activity', sourceId: 'act-1', personId: 'p1', status: 'approved' },
    { id: 's2', sourceType: 'activity', sourceId: 'act-1', personId: 'p2', status: 'approved' },
    { id: 's3', sourceType: 'activity', sourceId: 'act-1', personId: 'p3', status: 'pending' },   // pending 不计
    { id: 's4', sourceType: 'activity', sourceId: 'act-2', personId: 'p1', status: 'approved' },
    { id: 's5', sourceType: 'taskforce', sourceId: 'act-1', personId: 'p1', status: 'approved' }, // 异源同 id → 不得误命中
    { id: 's6', sourceType: 'activity', sourceId: 'act-3', personId: 'p2', status: 'approved' },
    { id: 's7', sourceType: 'activity', sourceId: 'act-1', personId: 'p1', status: 'approved' },  // 同人重复行
    null,                                                                                          // 脏行（旧 .some 跳过）
    { id: 's8', sourceType: 'activity', sourceId: 'act-x', personId: 'p9', status: 'approved' },
    { id: 's9', sourceType: 'activity', sourceId: null, personId: 'p1', status: 'approved' },     // 源 id 缺失
  ];

  const index = buildApprovedSignupIndex(signups);
  const queryActs = ['act-1', 'act-2', 'act-3', 'act-x', 'act-missing', null, undefined];
  const queryPersons = ['p1', 'p2', 'p3', 'p9', 'nobody', null, undefined];
  for (const actId of queryActs) {
    for (const pid of queryPersons) {
      assert.equal(
        approvedSignupHit(index, actId, pid),
        oldApproved(signups, actId, pid),
        `(sourceId=${String(actId)}, person=${String(pid)}) 索引命中 == 旧 .some`
      );
    }
  }
  // 抽样显式断言：命中与反例
  assert.equal(approvedSignupHit(index, 'act-1', 'p1'), true, 'approved 同人命中');
  assert.equal(approvedSignupHit(index, 'act-1', 'p3'), false, 'pending 不计');
  assert.equal(approvedSignupHit(index, 'act-1', 'nobody'), false);
  assert.equal(approvedSignupHit(index, 'act-missing', 'p1'), false, '无报名活动 miss');
  // 空表/缺省入参
  assert.equal(approvedSignupHit(buildApprovedSignupIndex([]), 'act-1', 'p1'), false);
  assert.equal(approvedSignupHit(buildApprovedSignupIndex(null), 'act-1', 'p1'), false);
});

// ═══════════════ ④ isTodoExpired ≡ 旧四处判定 ═══════════════

test('④ isTodoExpired：与旧四处判定等价（过期/到期当天/未来/完成/进行中/无 deadline/无 status 实时条目）', () => {
  const today = '2026-09-10';
  // 旧实现对偶 A（todo.js _isTodoExpired / todo-list.js 渲染层）：expired 显式真；非 pending 假
  const oldStrict = (todo) => {
    if (todo.status === 'expired') return true;
    if (todo.status !== 'pending') return false;
    if (!todo.deadline) return false;
    return todo.deadline < today;
  };
  // 旧实现对偶 B（todo.js _isGroupItemExpired → 域 expiredCount / mergeRealtimeDomains）：
  // expired 真；completed/in_progress 假；其余（pending 及无 status 实时条目）按 deadline
  const oldGroupItem = (todo) => {
    if (todo.status === TodoStatus.EXPIRED) return true;
    if (todo.status === TodoStatus.COMPLETED || todo.status === TodoStatus.IN_PROGRESS) return false;
    if (!todo.deadline) return false;
    return todo.deadline < today;
  };

  const cases = [];
  const statuses = ['pending', 'in_progress', 'completed', 'expired', undefined, null];
  const deadlines = ['2026-09-09', '2026-09-10', '2099-01-01', null, undefined];
  for (const status of statuses) {
    for (const deadline of deadlines) {
      cases.push({ status, deadline });
    }
  }

  for (const t of cases) {
    const got = isTodoExpired(t, today);
    const isStatusBearing = typeof t.status === 'string';
    // 带 status 的持久化待办：四处旧口径一致（A==B），新实现须同时等于二者
    if (isStatusBearing) {
      assert.equal(oldStrict(t), oldGroupItem(t), `样例自洽 status=${t.status} deadline=${t.deadline}`);
      assert.equal(got, oldStrict(t), `status=${t.status} deadline=${t.deadline}`);
    }
    // 无 status 实时组条目：以域 expiredCount 口径（对偶 B）为准（todo-domain-view ⑤ 依赖此语义）
    assert.equal(got, oldGroupItem(t), `isTodoExpired(status=${String(t.status)}) deadline=${t.deadline}`);
  }

  // 显式语义命名样例（过期 / 到期当天 / 未来 / 完成态曾逾期 / 进行中 / 无 deadline / 实时条目）
  assert.equal(isTodoExpired({ status: 'pending', deadline: '2026-09-09' }, today), true, '过期：pending+昨日 → 逾期');
  assert.equal(isTodoExpired({ status: 'expired', deadline: '2026-09-09' }, today), true, '过期显式态');
  assert.equal(isTodoExpired({ status: 'pending', deadline: '2026-09-10' }, today), false, '到期当天不算逾期');
  assert.equal(isTodoExpired({ status: 'pending', deadline: '2099-01-01' }, today), false, '未来不算');
  assert.equal(isTodoExpired({ status: 'completed', deadline: '2026-09-01' }, today), false, '完成态曾逾期不计');
  assert.equal(isTodoExpired({ status: 'in_progress', deadline: '2026-09-01' }, today), false, '进行中不计逾期');
  assert.equal(isTodoExpired({ status: 'pending', deadline: null }, today), false, '无 deadline');
  assert.equal(isTodoExpired({ deadline: '2026-09-09' }, today), true, '无 status 实时条目（域 expiredCount 口径）→ 逾期');
  assert.equal(isTodoExpired({ deadline: '2099-01-01' }, today), false, '无 status 实时条目未来 → 不逾期');
  assert.equal(isTodoExpired(null, today), false, 'null 入参不崩');
  assert.equal(isTodoExpired({}, today), false, '空对象不崩');
  // Date 注入按本地时区取日（默认缺省按 UTC ISO——与旧实现一致，此处仅验证 Date 分支可跑）
  assert.equal(typeof isTodoExpired({ status: 'pending', deadline: '2020-01-01' }, new Date(2026, 8, 10)), 'boolean');
});
