// server/test/demo-window-guard.test.mjs — 四个月演示窗口守卫（2026-10-26 · Task 5）
// ════════════════════════════════════════════════════════════════
// 判据（spec restore-capsule-and-harden-data-truth · Task 5 / SubTask 5.1–5.4、5.7）：
//   W1 单一窗口：`DEMO_WINDOW = { from:'2026-08-01', to:'2026-11-30' }`，日期解析拒绝伪日期；
//   W2 所有 mock 种子日期字段落在窗口内（白名单例外逐条写明理由）；
//   W3 8/9/10/11 每月至少一场活动；11 月活动只 draft/published，且无考勤/复盘/归档；
//   W4 关键状态样本：复盘五态、考勤四态、专班 active/completed/dissolved、宣传/周期归档/外发/交接各 ≥1；
//   W5 级联顺序：考勤/活动考察/复盘不得早于所属活动日。
// 非空转：W2 带规模下限（扫描日期数）＋故障注入；W1 断言 7 月末/12 月初为窗口外。
// 运行：node --test server/test/demo-window-guard.test.mjs（纯 node，无 playwright）
// ════════════════════════════════════════════════════════════════
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { DEMO_WINDOW, dateKeyOf, inDemoWindow, monthKeyOf } from '../../docs/src/data/mock/demo-window.js?v=20261102b';
import { ACTIVITIES } from '../../docs/src/data/mock/activities.js?v=20261102b';
import { PEOPLE } from '../../docs/src/data/mock/people.js?v=20261102b';
import { BRANCHES } from '../../docs/src/data/mock/branches.js?v=20261102b';
import { PARTY_GROUPS } from '../../docs/src/data/mock/party-groups.js?v=20261102b';
import { ATTENDANCE_RECORDS } from '../../docs/src/data/mock/attendance.js?v=20261102b';
import { INSPECTION_RECORDS } from '../../docs/src/data/mock/inspection.js?v=20261102b';
import { REVIEW_RECORDS, TASKFORCE_REVIEW_RECORDS } from '../../docs/src/data/mock/review.js?v=20261102b';
import { MOCK_NOTICES } from '../../docs/src/data/mock/notices.js?v=20261102b';
import { MOCK_TASKFORCES } from '../../docs/src/data/mock/taskforces.js?v=20261102b';
import { THOUGHT_REPORTS } from '../../docs/src/data/mock/thought-reports.js?v=20261102b';
import { PERIODIC_ARCHIVES_SEED, PROP_TASKS_SEED } from '../../docs/src/data/mock/prop.js?v=20261102b';
import {
  SEED_TASKS, SEED_ASSIGNMENTS, SEED_ARCHIVE_RECORDS, SEED_SIGNUPS,
  SEED_REVIEW_REQUESTS, SEED_MAKEUP_TASKS,
} from '../../docs/src/data/mock/seed.js?v=20261102b';
import {
  SEED_EXTERNAL_DISPATCHES, SEED_HANDOFFS, SEED_MEMBER_CONFIRMATIONS,
  SEED_ATTENDANCE_APPEALS, SEED_INSPECTION_APPEALS, SEED_ISSUE_UNREAD,
  SEED_AUTH_AUDIT, SEED_APPOINTMENT_RECORDS,
} from '../../docs/src/data/mock/auxiliary.js?v=20261102b';
import { SEED_TODOS } from '../../docs/src/services/governance/todo.js?v=20261102b';
import { applyDerivedFacts } from '../../docs/src/data/mock/derive.js?v=20261102b';
import { AttendanceStatus, ReviewStatus, TaskforceStatus } from '../../docs/src/core/domain/domain.js?v=20261102b';

/** 「今天」锚点（与种子一致；写死保证守卫确定性，不随运行日变化）。 */
const DEMO_TODAY = '2026-10-26';

/**
 * 白名单：允许落在业务窗口之外的日期事实。
 * 每条必须写明**为什么不能重排**（组织骨架 / 跨期实体 / 现算时限），不接受空理由。
 */
const WINDOW_ALLOWLIST = [
  {
    collection: 'taskforces', id: 'tf-002', key: 'deadline',
    reason: '跨期常设 active：SOP 维护无一次性活动对象，deadline 推到学期末 2026-12-31（SubTask 5.4 明确保留 tf-002 active）',
  },
  {
    collection: 'makeupTasks', id: 'mk-seed-1', key: 'deadline',
    reason: '补课截止 = 缺勤日 + 7 天现算（R10-B21），可能随运行日跨出窗口；缺勤日本身仍在窗口内',
  },
  {
    collection: 'authAudit', id: '*', key: 'authorizedAt',
    reason: '组织骨架安全留痕：不随演示窗口重排/删除（SubTask 5.4）',
  },
  {
    collection: 'appointmentRecords', id: '*', key: 'from',
    reason: '组织骨架支书任期起点：不随演示窗口重排（SubTask 5.4）',
  },
  {
    collection: 'branches', id: '*', key: 'createdAt',
    reason: '组织骨架（支部实体）：不按窗口裁剪（SubTask 5.4）',
  },
  {
    collection: 'partyGroups', id: '*', key: 'createdAt',
    reason: '组织骨架（党小组实体）：不按窗口裁剪（SubTask 5.4）',
  },
  {
    collection: 'users', id: '*', key: 'updatedAt',
    reason: '人员档案居住状态留痕：不随演示窗口重排（SubTask 5.4）',
  },
];

const allowedByRule = (collection, id, key) => WINDOW_ALLOWLIST.some((rule) => (
  rule.collection === collection
  && (rule.id === '*' || rule.id === id)
  && rule.key === key
));

/** 递归收集一行里所有 ISO 日期（含 `periodRange: 'a ~ b'` 这类双日期字段）。 */
function walkDates(value, onDate, key = '') {
  if (Array.isArray(value)) {
    for (const item of value) walkDates(item, onDate, key);
    return;
  }
  if (value && typeof value === 'object') {
    for (const [childKey, child] of Object.entries(value)) walkDates(child, onDate, childKey);
    return;
  }
  if (typeof value !== 'string') return;
  const matches = value.match(/20\d{2}-\d{2}-\d{2}/g);
  if (!matches) return;
  for (const match of matches) onDate({ key: key || 'value', date: match });
}

/** 种子集合清单（每个集合 = 内容单一源里的具名导出）。 */
const DATE_COLLECTIONS = [
  ['activities', ACTIVITIES],
  ['attendances', ATTENDANCE_RECORDS],
  ['inspections', INSPECTION_RECORDS],
  ['activityReviews', REVIEW_RECORDS],
  ['taskforceReviews', TASKFORCE_REVIEW_RECORDS],
  ['taskforces', MOCK_TASKFORCES],
  ['notices', MOCK_NOTICES],
  ['tasks', SEED_TASKS],
  ['assignments', SEED_ASSIGNMENTS],
  ['archiveRecords', SEED_ARCHIVE_RECORDS],
  ['signups', SEED_SIGNUPS],
  ['reviewRequests', SEED_REVIEW_REQUESTS],
  ['makeupTasks', SEED_MAKEUP_TASKS],
  ['thoughtReports', THOUGHT_REPORTS],
  ['periodicArchives', PERIODIC_ARCHIVES_SEED],
  ['propTasks', PROP_TASKS_SEED],
  ['externalDispatches', SEED_EXTERNAL_DISPATCHES],
  ['handoffs', SEED_HANDOFFS],
  ['memberConfirmations', SEED_MEMBER_CONFIRMATIONS],
  ['attendanceAppeals', SEED_ATTENDANCE_APPEALS],
  ['inspectionAppeals', SEED_INSPECTION_APPEALS],
  ['issueUnread', SEED_ISSUE_UNREAD],
  ['authAudit', SEED_AUTH_AUDIT],
  ['appointmentRecords', SEED_APPOINTMENT_RECORDS],
  ['todos', SEED_TODOS],
  ['users', PEOPLE],
  ['branches', BRANCHES],
  ['partyGroups', PARTY_GROUPS],
];

/** 全部种子日期（带归属，供断言与报告）。 */
function collectSeedDates() {
  const found = [];
  for (const [collection, rows] of DATE_COLLECTIONS) {
    for (const row of rows || []) {
      const id = String(row?.id ?? row?.studentId ?? '');
      walkDates(row, ({ key, date }) => found.push({ collection, id, key, date }));
    }
  }
  return found;
}

const activityById = new Map(ACTIVITIES.map((activity) => [activity.id, activity]));

// ── W1 ─────────────────────────────────────────────────────────────────────
test('W1 单一窗口：DEMO_WINDOW 精确等于 2026-08-01~2026-11-30，伪日期被拒绝（含故障注入）', () => {
  assert.deepEqual({ ...DEMO_WINDOW }, { from: '2026-08-01', to: '2026-11-30' });
  assert.equal(inDemoWindow('2026-08-01'), true, '窗口首日应入选');
  assert.equal(inDemoWindow('2026-11-30T23:59:59+08:00'), true, '窗口末日（含时间）应入选');
  assert.equal(inDemoWindow('2026-07-31'), false, '7 月末必须判窗口外');
  assert.equal(inDemoWindow('2026-12-01'), false, '12 月初必须判窗口外');
  assert.equal(dateKeyOf('2026-02-31'), null, '伪日期不得被日期进位「洗白」');
  assert.equal(inDemoWindow('2026-02-31'), false, '伪日期必须判窗口外');
  assert.equal(monthKeyOf('2026-11-12'), '2026-11');
});

// ── W2 ─────────────────────────────────────────────────────────────────────
test('W2 所有 mock 日期字段落在窗口内；白名单例外逐条有理由', () => {
  for (const rule of WINDOW_ALLOWLIST) {
    assert.ok(String(rule.reason || '').trim().length >= 12, `白名单 ${rule.collection}.${rule.key} 缺可读理由`);
  }
  const dates = collectSeedDates();
  assert.ok(dates.length >= 300, `扫描到的种子日期过少（${dates.length}）——守卫会因空集恒真`);
  const violations = dates.filter((item) => !inDemoWindow(item.date) && !allowedByRule(item.collection, item.id, item.key));
  const detail = violations.slice(0, 20).map((item) => `${item.collection}/${item.id}.${item.key}=${item.date}`);
  assert.deepEqual(violations.map((item) => `${item.collection}/${item.id}.${item.key}`), [],
    `窗口外日期 ${violations.length} 项：\n${detail.join('\n')}`);
  // 故障注入：窗口外日期必须被同一判据抓住（防止断言恒真）
  const injected = { collection: 'activities', id: 'act-x', key: 'date', date: '2026-07-31' };
  assert.equal(!inDemoWindow(injected.date) && !allowedByRule(injected.collection, injected.id, injected.key), true);
});

// ── W3 ─────────────────────────────────────────────────────────────────────
test('W3 8/9/10/11 每月至少一场活动；11 月只 draft/published 且无考勤/复盘/归档', () => {
  const months = new Map();
  for (const activity of ACTIVITIES) {
    const month = monthKeyOf(activity.date);
    months.set(month, (months.get(month) || 0) + 1);
  }
  for (const month of ['2026-08', '2026-09', '2026-10', '2026-11']) {
    assert.ok((months.get(month) || 0) >= 1, `${month} 没有任何活动`);
  }

  const db = {
    users: PEOPLE,
    activities: ACTIVITIES,
    activityReviews: REVIEW_RECORDS,
    inspections: INSPECTION_RECORDS,
    taskforces: MOCK_TASKFORCES,
    archiveRecords: SEED_ARCHIVE_RECORDS,
    notices: MOCK_NOTICES,
    attendances: ATTENDANCE_RECORDS,
  };
  applyDerivedFacts(db, { now: DEMO_TODAY });

  const november = ACTIVITIES.filter((activity) => monthKeyOf(activity.date) === '2026-11');
  assert.ok(november.length >= 2 && november.length <= 3, `11 月计划态活动应为 2–3 场（实得 ${november.length}）`);
  for (const activity of november) {
    assert.ok(['draft', 'published'].includes(activity.status), `11 月活动 ${activity.id} 状态必须是 draft/published（实得 ${activity.status}）`);
  }
  const novemberIds = new Set(november.map((activity) => activity.id));
  const forbidden = [
    ...ATTENDANCE_RECORDS.filter((row) => novemberIds.has(row.activityId)).map((row) => `考勤 ${row.id}`),
    ...REVIEW_RECORDS.filter((row) => novemberIds.has(row.activityId)).map((row) => `复盘 ${row.id}`),
    ...SEED_ARCHIVE_RECORDS.filter((row) => row.activityId && novemberIds.has(row.activityId)).map((row) => `归档 ${row.id}`),
  ];
  assert.deepEqual(forbidden, [], `11 月活动不得有已完成记录：${forbidden.join('、')}`);
});

// ── W4 ─────────────────────────────────────────────────────────────────────
test('W4 关键状态样本：复盘五态 / 考勤四态 / 专班三态 / 宣传·周期归档·外发·交接', () => {
  const reviewStates = new Set(REVIEW_RECORDS.map((row) => row.reviewStatus));
  for (const state of Object.values(ReviewStatus)) {
    assert.ok(reviewStates.has(state), `复盘缺少状态样本：${state}`);
  }
  const attendanceStates = new Set(ATTENDANCE_RECORDS.map((row) => row.status));
  for (const state of Object.values(AttendanceStatus)) {
    assert.ok(attendanceStates.has(state), `考勤缺少状态样本：${state}`);
  }

  applyDerivedFacts({ taskforces: MOCK_TASKFORCES, users: PEOPLE }, { now: DEMO_TODAY });
  const taskforceStates = new Set(MOCK_TASKFORCES.map((row) => row.status));
  for (const state of [TaskforceStatus.ACTIVE, TaskforceStatus.COMPLETED, TaskforceStatus.DISSOLVED]) {
    assert.ok(taskforceStates.has(state), `专班缺少状态样本：${state}`);
  }
  assert.equal(MOCK_TASKFORCES.find((row) => row.id === 'tf-002')?.status, TaskforceStatus.ACTIVE,
    'tf-002 必须保留 active（跨期常设实体）');

  assert.ok(PROP_TASKS_SEED.length >= 1, '宣传任务种子不得为空');
  assert.ok(PERIODIC_ARCHIVES_SEED.length >= 1, '周期归档种子不得为空');
  assert.ok(SEED_EXTERNAL_DISPATCHES.length >= 1, '外发确认种子不得为空');
  assert.ok(SEED_HANDOFFS.length >= 1, '交接种子不得为空');
});

// ── W5 ─────────────────────────────────────────────────────────────────────
test('W5 级联顺序：考勤/活动考察/复盘不得早于所属活动日', () => {
  const tooEarly = [];
  for (const row of ATTENDANCE_RECORDS) {
    const activity = activityById.get(row.activityId);
    if (activity && dateKeyOf(row.recordedAt) < activity.date) tooEarly.push(`考勤 ${row.id}@${row.recordedAt} < ${activity.id}@${activity.date}`);
  }
  for (const row of INSPECTION_RECORDS) {
    if (row.sourceType !== 'activity') continue;
    const activity = activityById.get(row.activityId);
    if (activity && dateKeyOf(row.recordedAt) < activity.date) tooEarly.push(`考察 ${row.id}@${row.recordedAt} < ${activity.id}@${activity.date}`);
  }
  for (const row of REVIEW_RECORDS) {
    const activity = activityById.get(row.activityId);
    if (!activity) continue;
    for (const key of ['submittedAt', 'annotatedAt', 'confirmedAt']) {
      const value = dateKeyOf(row[key]);
      if (value && value < activity.date) tooEarly.push(`复盘 ${row.id}.${key}@${value} < ${activity.id}@${activity.date}`);
    }
  }
  assert.deepEqual(tooEarly, [], `级联顺序错误：\n${tooEarly.join('\n')}`);
});
