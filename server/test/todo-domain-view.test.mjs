// role: [工程师]+[AI]
// server/test/todo-domain-view.test.mjs — IA 收敛 C1 Task3：TodoStore 按业务域聚合视图（2026-09-07）
// 依据：.trae/specs/2026-09-06-ia-todo-cards/plan-c1.md Task3 + spec.md 二节（聚合/分组输出域序固定）
// 覆盖（member-persist 桩做法；seed 用 mockDB.todos 直插构造记录）：
//   ① DOMAIN_ORDER 导出：9 域固定顺序（会务→活动项目→考勤纪律→考察→成员发展→专班→
//      决议上报→归档宣传→汇报反馈），NONE 不入列；顺序与 WORK_DOMAIN_LABELS 齐全
//   ② TodoStore.getDomainsWithGroups(role)：返回 [{domain,label,count,expiredCount,groups}]
//     ——域按 DOMAIN_ORDER、无活域不出、跨角色不混入；域内 groups=复用现有 actionKey 组聚合
//     （含标题/deadline/items/count）；域计数与逾期数正确；NONE（通知类）不在列表
//   ③ 域内组排序=先逾期、再按 deadline、最后稳定（actionKey）；组内条目仍过期置顶
//   ④ getUnreadNotices(role)：domain=none 通知类（未完成）可取，按 deadline/created 倒序
//     （通知轻量区数据源；完成态/非通知类/他人角色不入）
//   ⑤ mergeRealtimeDomains(role, realtimeGroups)：实时组并入对应域（含无活新增域/域内追加/
//     同 groupKey 去重/缺 domain 推断回退/domain=NONE 不入域），输出仍按 DOMAIN_ORDER 排序
//   ⑥ 向后兼容：getGroupedByAction 平铺语义不变（完成态排除、组字段同构）
// 运行：node --test test/todo-domain-view.test.mjs（server 目录）
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { mockDB } from '../../docs/src/core/domain.js?v=20260921j';
import {
  MockAdapter,
} from '../../docs/src/core/mock-adapter.js?v=20260921j';
import { setDataSource } from '../../docs/src/core/data-adapter.js?v=20260921j';
import {
  WORK_DOMAIN, WORK_DOMAIN_LABELS, DOMAIN_ORDER,
  TodoStore, TodoCategory, TodoStatus,
  realtimeGroupDomainOf,
  urgeRolesOf,
} from '../../docs/src/services/todo.js?v=20260921j';
// A① 通知对象级深链守卫（2026-09-10）：静态扫描 docs/src 全部通知生产点（纯 fs，无需浏览器）
import { readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

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

/** 测试现场造待办（TodoStore.create 走 _buildTodo 兜底 domain；显式 domain 保留） */
function mk(partial) {
  return TodoStore.create({
    role: 'secretary',
    category: TodoCategory.TRACK,
    priority: 'normal',
    status: TodoStatus.PENDING,
    ...partial,
  });
}

// ═══════════════ ① DOMAIN_ORDER ═══════════════

test('① DOMAIN_ORDER：9 域固定顺序（会务→…→汇报反馈），NONE 不入列', () => {
  assert.equal(DOMAIN_ORDER.length, 9, '9 业务域');
  assert.equal(new Set(DOMAIN_ORDER).size, 9, '域值无重复');
  assert.deepEqual(DOMAIN_ORDER, [
    WORK_DOMAIN.MEETING,     // 会务
    WORK_DOMAIN.ACTIVITY,    // 活动/项目
    WORK_DOMAIN.ATTENDANCE,  // 考勤纪律
    WORK_DOMAIN.INSPECTION,  // 考察
    WORK_DOMAIN.MEMBER_DEV,  // 成员发展
    WORK_DOMAIN.TASKFORCE,   // 专班
    WORK_DOMAIN.RESOLUTION,  // 决议上报
    WORK_DOMAIN.ARCHIVE,     // 归档宣传
    WORK_DOMAIN.REPORT,      // 汇报反馈
  ], '域序固定（spec 一 ①→⑨）');
  assert.ok(!DOMAIN_ORDER.includes(WORK_DOMAIN.NONE), 'NONE（通知/未分类）不入普通域列');
  // 每个域都有中文标签（域头展示用）
  for (const d of DOMAIN_ORDER) {
    assert.ok(WORK_DOMAIN_LABELS[d], `WORK_DOMAIN_LABELS 含域 ${d}`);
  }
});

// ═══════════════ ② getDomainsWithGroups 结构/计数/域序 ═══════════════

test('② getDomainsWithGroups：多域聚合（域序固定/无活不出/跨角色不混入/计数与逾期正确/NONE 不入列）', () => {
  beginMockCase();
  // meeting 域 2 条（同 actionKey participate → 一组）
  mk({ id: 'dv-m1', domain: WORK_DOMAIN.MEETING, actionKey: 'participate', actionType: 'participate', title: '参加支部党员大会', deadline: '2099-06-01' });
  mk({ id: 'dv-m2', domain: WORK_DOMAIN.MEETING, actionKey: 'participate', actionType: 'participate', title: '参加党小组会', deadline: '2099-06-10' });
  // attendance 域 3 条：remind×2（pending 未来）+ confirm×1（无显式 domain → 兼容推断考勤纪律；expired）
  mk({ id: 'dv-at1', domain: WORK_DOMAIN.ATTENDANCE, actionKey: 'attendance-remind', title: '考勤待录入', deadline: '2099-08-01' });
  mk({ id: 'dv-at2', domain: WORK_DOMAIN.ATTENDANCE, actionKey: 'attendance-remind', title: '考勤待录入', deadline: '2099-08-02' });
  mk({ id: 'dv-at3', actionKey: 'attendance-confirm', actionType: 'review', title: '考勤待复核', status: TodoStatus.EXPIRED, deadline: '2026-01-01' });
  // member-dev / report 域各 1 条
  mk({ id: 'dv-md1', domain: WORK_DOMAIN.MEMBER_DEV, actionKey: 'member-confirm', title: '成员变更待确认', deadline: '2099-09-01' });
  mk({ id: 'dv-rp1', domain: WORK_DOMAIN.REPORT, actionKey: 'weekly-report', title: '提交周报', deadline: '2099-10-01' });
  // NONE 通知类（不入普通域列表）
  mk({ id: 'dv-n1', domain: WORK_DOMAIN.NONE, category: TodoCategory.NOTICE, actionKey: 'notice-read', title: '阅读通知', deadline: '2099-11-01' });
  // 他人角色待办（不混入 secretary 域视图）
  TodoStore.create({ id: 'dv-o1', role: 'org-commissioner', domain: WORK_DOMAIN.ATTENDANCE, actionKey: 'attendance-upload', title: '上传考勤', deadline: '2099-01-01' });

  const view = TodoStore.getDomainsWithGroups('secretary');
  // ① 域序固定 + 无活域不出 + NONE/他人角色不出现
  assert.deepEqual(view.map(d => d.domain), ['meeting', 'attendance', 'member-dev', 'report'],
    '域按 DOMAIN_ORDER 出现（只含有活域；none 与 org 角色不入列）');
  // 记录结构：domain/label/count/expiredCount/groups
  for (const d of view) {
    assert.equal(typeof d.domain, 'string');
    assert.equal(d.label, WORK_DOMAIN_LABELS[d.domain], `label=${d.label}`);
    assert.equal(typeof d.count, 'number');
    assert.equal(typeof d.expiredCount, 'number');
    assert.ok(Array.isArray(d.groups));
  }

  // meeting 域：计数/过期/组聚合
  const meet = view.find(d => d.domain === 'meeting');
  assert.equal(meet.count, 2, 'meeting 域计数 2');
  assert.equal(meet.expiredCount, 0);
  assert.equal(meet.groups.length, 1, '同 actionKey 聚合为 1 组');
  const meetG = meet.groups[0];
  assert.equal(meetG.groupKey, 'secretary:participate');
  assert.equal(meetG.actionKey, 'participate');
  assert.equal(meetG.count, 2);
  assert.equal(meetG.title, '参加支部党员大会', '组标题=组内首条标题');
  assert.equal(meetG.deadline, '2099-06-01', '组 deadline=组内最早截止');
  assert.equal(meetG.items.length, 2);

  // attendance 域：计数 3 / 逾期 1（expired 显式）；confirm 组为无 domain 推断兜底入域
  const att = view.find(d => d.domain === 'attendance');
  assert.equal(att.count, 3, 'attendance 域计数 3');
  assert.equal(att.expiredCount, 1, '逾期数=1（dv-at3 已过期）');
  assert.deepEqual(att.groups.map(g => g.actionKey).sort(), ['attendance-confirm', 'attendance-remind']);
  const atConf = att.groups.find(g => g.actionKey === 'attendance-confirm');
  assert.equal(atConf.groupKey, 'secretary:attendance-confirm');
  assert.equal(atConf.items[0].id, 'dv-at3', '无显式 domain 的 confirm 经推断归考勤纪律域');
  const atRemind = att.groups.find(g => g.actionKey === 'attendance-remind');
  assert.equal(atRemind.count, 2);
  assert.equal(atRemind.deadline, '2099-08-01');

  // member-dev / report：单组计数
  assert.equal(view.find(d => d.domain === 'member-dev').count, 1);
  assert.equal(view.find(d => d.domain === 'report').groups[0].actionKey, 'weekly-report');

  // 无活角色 → 空数组
  assert.deepEqual(TodoStore.getDomainsWithGroups('prop-commissioner'), []);
});

// ═══════════════ ③ 域内组排序 ═══════════════

test('③ 域内组排序：先逾期 → 按 deadline → 最后稳定 actionKey；组内条目过期置顶', () => {
  beginMockCase();
  // 全部落 archive 域；刻意乱序创建（archive-b 先于 archive-a）验证 actionKey 稳定兜底
  // remind 组：含 1 条 expired（逾期组 → 置顶）
  const it1 = mk({ id: 'dv-ar1', domain: WORK_DOMAIN.ARCHIVE, actionKey: 'archive-remind', title: '归档提醒-过期', status: TodoStatus.EXPIRED, deadline: '2026-01-01' });
  mk({ id: 'dv-ar2', domain: WORK_DOMAIN.ARCHIVE, actionKey: 'archive-remind', title: '归档提醒-未来', deadline: '2099-06-01' });
  // confirm：未来截止 2099-03-01
  mk({ id: 'dv-ar3', domain: WORK_DOMAIN.ARCHIVE, actionKey: 'archive-confirm', title: '归档确认', deadline: '2099-03-01' });
  // 同 deadline 2099-02-01 两组：创建序 b→a，期望按 actionKey 稳定 a→b
  mk({ id: 'dv-ar4', domain: WORK_DOMAIN.ARCHIVE, actionKey: 'archive-b', title: '组 B', deadline: '2099-02-01' });
  mk({ id: 'dv-ar5', domain: WORK_DOMAIN.ARCHIVE, actionKey: 'archive-a', title: '组 A', deadline: '2099-02-01' });
  // 无 deadline 组 → 末位
  mk({ id: 'dv-ar6', domain: WORK_DOMAIN.ARCHIVE, actionKey: 'archive-c', title: '组 C（无截止）' });

  const view = TodoStore.getDomainsWithGroups('secretary');
  assert.equal(view.length, 1);
  const arch = view[0];
  assert.deepEqual(arch.groups.map(g => g.actionKey),
    ['archive-remind', 'archive-a', 'archive-b', 'archive-confirm', 'archive-c'],
    '逾期组置顶 → 同 deadline 按 actionKey 稳定 → 无 deadline 末位');

  // 组内条目仍过期置顶（remind 组 items[0]=expired 项）
  const remind = arch.groups[0];
  assert.equal(remind.actionKey, 'archive-remind');
  assert.equal(remind.items[0].id, it1.id, '组内条目过期置顶');
  assert.equal(remind.count, 2);
});

// ═══════════════ ④ getUnreadNotices ═══════════════

test('④ getUnreadNotices：NONE 通知类未完成按 deadline/created 倒序（轻量未读区数据源）', () => {
  beginMockCase();
  const n1 = mk({ id: 'dv-u1', domain: WORK_DOMAIN.NONE, category: TodoCategory.NOTICE, actionKey: 'notice-read', title: '阅读通知一', deadline: '2099-06-05', createdAt: '2099-06-01T08:00:00.000Z' });
  const n2 = mk({ id: 'dv-u2', domain: WORK_DOMAIN.NONE, category: TodoCategory.NOTICE, actionKey: 'notice-read', title: '阅读通知二', deadline: '2099-06-10', createdAt: '2099-06-02T08:00:00.000Z' });
  // 无 deadline → createdAt 兜底（2099-06-08 介于两 deadline 之间）
  const n3 = mk({ id: 'dv-u3', domain: WORK_DOMAIN.NONE, category: TodoCategory.NOTICE, actionKey: 'notice-read', title: '阅读通知三', deadline: null, createdAt: '2099-06-08T00:00:00.000Z' });
  // 完成态（已读即销）→ 不入未读
  mk({ id: 'dv-u4', domain: WORK_DOMAIN.NONE, category: TodoCategory.NOTICE, actionKey: 'notice-read', title: '阅读通知四（已读）', status: TodoStatus.COMPLETED, deadline: '2099-06-20', createdAt: '2099-06-03T08:00:00.000Z' });
  // 非通知类（domain=none 但 category 非 notice）→ 不入未读
  mk({ id: 'dv-u5', domain: WORK_DOMAIN.NONE, category: TodoCategory.TRACK, actionKey: 'notice-read', title: '非通知未分类' });
  // 他人角色通知 → 不入本角色
  TodoStore.create({ id: 'dv-u6', role: 'org-commissioner', domain: WORK_DOMAIN.NONE, category: TodoCategory.NOTICE, actionKey: 'notice-read', title: '组织委员通知', deadline: '2099-12-01' });

  const unread = TodoStore.getUnreadNotices('secretary');
  assert.deepEqual(unread.map(t => t.id), ['dv-u2', 'dv-u3', 'dv-u1'],
    'deadline 倒序（2099-06-10 → 2099-06-08[createdAt 兜底] → 2099-06-05）；完成/非通知/他人角色排除');
  assert.equal(unread.length, 3);
  assert.equal(unread[0].title, n2.title);
  assert.equal(unread[1].title, n3.title);
  assert.equal(unread[2].title, n1.title);

  // 通知业务域 todo（非 NONE）不入未读
  mk({ id: 'dv-u7', domain: WORK_DOMAIN.MEMBER_DEV, category: TodoCategory.NOTICE, actionKey: 'member-confirm', title: '成员确认' });
  assert.equal(TodoStore.getUnreadNotices('secretary').length, 3, '有业务域的通知类待办不算未读通知');
});

// ═══════════════ ⑤ mergeRealtimeDomains（实时组融合点） ═══════════════

test('⑤ mergeRealtimeDomains：实时组并入对应域（新增域/域内追加/同 groupKey 去重/缺 domain 推断/domain=NONE 不入）', () => {
  beginMockCase();
  // 持久化 1 条考勤纪律域待办（secretary）
  mk({ id: 'dv-p1', domain: WORK_DOMAIN.ATTENDANCE, actionKey: 'attendance-confirm', title: '考勤待复核', deadline: '2099-09-01' });

  const realtime = [
    // member-dev 实时组（域内无持久化 → 应新增该域）
    { groupKey: 'secretary:member-confirm', actionKey: 'member-confirm', domain: WORK_DOMAIN.MEMBER_DEV, title: '成员变更待确认', kind: 'confirm', count: 2, items: [{ id: 'mc1', name: '张三' }, { id: 'mc2', name: '李四' }] },
    // 同 groupKey 重复（前序已并入）→ 去重跳过
    { groupKey: 'secretary:member-confirm', actionKey: 'member-confirm', domain: WORK_DOMAIN.MEMBER_DEV, title: '成员变更待确认(重复)', kind: 'confirm', count: 99, items: [{ id: 'mcX' }] },
    // resolution 实时组：3 条逾期（items 无 status → deadline 过期视为逾期）
    { groupKey: 'secretary:resolution-followup-remind', actionKey: 'resolution-followup-remind', domain: WORK_DOMAIN.RESOLUTION, title: '决议落实逾期', kind: 'remind', count: 3, items: [{ id: 'r1', name: '甲', deadline: '2026-01-05' }, { id: 'r2', name: '乙', deadline: '2026-02-05' }, { id: 'r3', name: '丙', deadline: '2026-03-05' }] },
    // attendance 域内追加实时组（remind，deadline 早于持久化 confirm → 域内组序前置）
    { groupKey: 'secretary:attendance-remind', actionKey: 'attendance-remind', domain: WORK_DOMAIN.ATTENDANCE, title: '考勤待录入', kind: 'remind', count: 1, items: [{ id: 'ar1', name: '活动一', deadline: '2099-05-01' }] },
    // 缺 domain 标注 → realtimeGroupDomainOf 回退推断（inspection）
    { groupKey: 'secretary:inspection-remind', actionKey: 'inspection-remind', title: '考察超期未确认', kind: 'remind', count: 2, items: [{ id: 'ir1', name: '成员1', deadline: '2099-03-01' }, { id: 'ir2', name: '成员2', deadline: '2099-04-01' }] },
    // domain=NONE（通知类）→ 不入任何域
    { groupKey: 'secretary:notice-read', actionKey: 'notice-read', domain: WORK_DOMAIN.NONE, title: '阅读通知', count: 1, items: [{ id: 'nr1' }] },
  ];
  assert.equal(realtimeGroupDomainOf(realtime[4]), WORK_DOMAIN.INSPECTION, '无 domain 实时组按 actionKey 推断考察域');

  const merged = TodoStore.mergeRealtimeDomains('secretary', realtime);

  // 域序仍按 DOMAIN_ORDER（attendance → inspection → member-dev → resolution），none 不入
  assert.deepEqual(merged.map(d => d.domain), ['attendance', 'inspection', 'member-dev', 'resolution'],
    '合并后域序=DOMAIN_ORDER（实时组新增域也按固定序插入）');

  // attendance：持久化 1 + 实时 remind 1 = 2；组序 deadline asc（remind 2099-05-01 → confirm 2099-09-01）
  const att = merged.find(d => d.domain === 'attendance');
  assert.equal(att.count, 2);
  assert.equal(att.expiredCount, 0);
  assert.deepEqual(att.groups.map(g => g.actionKey), ['attendance-remind', 'attendance-confirm']);
  assert.equal(att.groups[1].count, 1, '持久化 confirm 组保持原有聚合');

  // inspection：纯实时新增域（推断回退）
  const ins = merged.find(d => d.domain === 'inspection');
  assert.equal(ins.label, '考察');
  assert.equal(ins.count, 2);
  assert.deepEqual(ins.groups.map(g => g.actionKey), ['inspection-remind']);

  // member-dev：重复 groupKey 未并入（count 仍 2、组仍 1）
  const md = merged.find(d => d.domain === 'member-dev');
  assert.equal(md.count, 2, '重复 groupKey 实时组被去重');
  assert.equal(md.groups.length, 1);
  assert.deepEqual(md.groups.map(g => g.actionKey), ['member-confirm']);

  // resolution：实时组逾期计数入域级 expiredCount
  const rs = merged.find(d => d.domain === 'resolution');
  assert.equal(rs.count, 3);
  assert.equal(rs.expiredCount, 3, '实时组 3 条逾期计入域级逾期数');

  // 入参实时组数组未被改写
  assert.equal(realtime.length, 6);

  // 空实时组 → 返回纯持久化域视图（不新增不删除）
  const onlyPersisted = TodoStore.mergeRealtimeDomains('secretary', []);
  assert.deepEqual(onlyPersisted.map(d => d.domain), ['attendance'], '空实时组只含持久化域');
  assert.equal(onlyPersisted[0].count, 1);
});

// ═══════════════ ⑥ 向后兼容（getGroupedByAction 平铺语义） ═══════════════

test('⑥ 向后兼容：getGroupedByAction 平铺语义不变（完成态排除；组含 title/deadline/items/count/flow）', () => {
  beginMockCase();
  const c1 = TodoStore.create({ role: 'leader', domain: WORK_DOMAIN.ACTIVITY, category: TodoCategory.AUTH, actionKey: 'activity-authorize', actionType: 'authorize', title: '为活动赋权', deadline: '2099-07-01', priority: 'urgent', flow: '活动创建 → 组长赋权 → 执行' });
  TodoStore.create({ id: 'dv-c2', role: 'leader', domain: WORK_DOMAIN.ACTIVITY, category: TodoCategory.AUTH, actionKey: 'activity-authorize', actionType: 'authorize', title: '为活动赋权(已完成)', status: TodoStatus.COMPLETED, deadline: '2099-07-05' });
  TodoStore.create({ id: 'dv-c3', role: 'leader', domain: WORK_DOMAIN.MEETING, category: TodoCategory.TRACK, actionKey: 'participate', actionType: 'participate', title: '参加支委会', deadline: '2099-08-01' });

  const groups = TodoStore.getGroupedByAction('leader');
  assert.deepEqual(groups.map(g => g.actionKey), ['activity-authorize', 'participate'], '按首现序平铺');
  const ag = groups[0];
  assert.equal(ag.groupKey, 'leader:activity-authorize');
  assert.equal(ag.count, 1, 'completed 由 getByRole 排除，不计组数');
  assert.equal(ag.title, c1.title);
  assert.equal(ag.deadline, '2099-07-01');
  assert.equal(ag.flow, '活动创建 → 组长赋权 → 执行');
  assert.equal(ag.category, TodoCategory.AUTH);
  assert.equal(ag.items.length, 1);
  assert.equal(ag.items[0].id, c1.id);
  assert.ok(groups.every(g => g.items.every(t => t.status !== TodoStatus.COMPLETED)), '各组不含完成态');
});

// ═══════════════ ⑦ urgeRolesOf（催办责任人解析 · 2026-09-10） ═══════════════

test('⑦ urgeRolesOf：持久化待办按 role；实时组静态映射/决议 owner/复盘组织者解析；无责任→空', () => {
  // ① 持久化待办：条目自带 role（去重；支书本人返回 secretary，隐藏与否由调用方判定）
  assert.deepEqual(
    urgeRolesOf({ groupKey: 'prop-commissioner:activity-archive', actionKey: 'activity-archive', items: [{ id: 'a1', role: 'prop-commissioner' }, { id: 'a2', role: 'prop-commissioner' }] }),
    ['prop-commissioner'], '持久化待办按条目 role 去重');
  assert.deepEqual(
    urgeRolesOf({ groupKey: 'secretary:authorize', actionKey: 'authorize', items: [{ id: 't1', role: 'secretary' }] }),
    ['secretary'], '支书本人待办 → 返回 secretary（调用方按「本人」隐藏）');

  // ② 实时派生组静态映射
  assert.deepEqual(urgeRolesOf({ actionKey: 'attendance-remind', items: [] }), ['disc-commissioner']);
  assert.deepEqual(urgeRolesOf({ actionKey: 'inspection-remind', items: [] }), ['disc-commissioner']);
  assert.deepEqual(urgeRolesOf({ actionKey: 'archive-remind', items: [] }), ['prop-commissioner']);
  assert.deepEqual(urgeRolesOf({ actionKey: 'semester-detained-remind', items: [] }), ['org-commissioner']);

  // 复核类/成员变更确认（责任人=支书本人，不在表内）→ 空
  assert.deepEqual(urgeRolesOf({ actionKey: 'attendance-confirm', items: [] }), []);
  assert.deepEqual(urgeRolesOf({ actionKey: 'inspection-confirm', items: [] }), []);
  assert.deepEqual(urgeRolesOf({ actionKey: 'review-confirm', items: [] }), []);
  assert.deepEqual(urgeRolesOf({ actionKey: 'archive-confirm', items: [] }), []);
  assert.deepEqual(urgeRolesOf({ actionKey: 'member-confirm', items: [] }), []);
  assert.deepEqual(urgeRolesOf({ actionKey: 'resolution-followup-remind', items: [] }), [], '无 owner 明细 → 空');

  // ③ 决议跟进：逐条 owner（role → 角色键；person → 成员角色；participant 跳过；去重）
  const people = [
    { id: 'p10', role: 'org-commissioner' },
    { id: 'p3', role: 'participant' },
    { id: 'p11', role: 'prop-commissioner' },
  ];
  const resRoles = urgeRolesOf({
    actionKey: 'resolution-followup-remind',
    items: [
      { ownerType: 'role', ownerId: 'disc-commissioner' },
      { ownerType: 'person', ownerId: 'p10' },
      { ownerType: 'person', ownerId: 'p3' }, // 普通参与者无角色通知位 → 跳过
      { ownerType: 'role', ownerId: 'disc-commissioner' }, // 去重
    ],
  }, { people });
  assert.deepEqual(resRoles.sort(), ['disc-commissioner', 'org-commissioner']);

  // ④ 复盘待提交：责任人为活动组织者（角色由成员数据解析；无对应成员跳过）
  const activities = [{ id: 'act-1', organizer: 'p11' }, { id: 'act-2', organizer: 'pX' }];
  assert.deepEqual(
    urgeRolesOf({ actionKey: 'review-remind', items: [{ activityId: 'act-1' }, { activityId: 'act-2' }] }, { activities, people }),
    ['prop-commissioner'], '组织者 pX 无对应成员 → 跳过');

  // ⑤ 鲁棒：空/非法输入 → 空数组
  assert.deepEqual(urgeRolesOf(null), []);
  assert.deepEqual(urgeRolesOf(undefined), []);
  assert.deepEqual(urgeRolesOf({ actionKey: 'unknown-x', items: [] }), []);
});

// ═══════════════ ⑧ A① 通知对象级深链守卫（2026-09-10 支书裁定） ═══════════════
// 口径：凡 actionable:true 的通知生产点，其 NoticeStore.add 调用内必须携带对象级锚点——
//   · targetUrl 对象级深链（如 workspace/x.html?tab=<tab>&highlight=<对象id>、activity.html?id=），或
//   · targetType + targetId（resolveNoticeUrl 优先级 0 → 直达 activity.html?id=/taskforce.html?id=）。
// 防回归：若某生产点漏锚点，本测试即红。白名单仅接受「按角色自适应落点 / 无单一对象 id」的显式豁免。
const NOTICE_ANCHOR_EXEMPT = [
  // 目前所有 actionable 生产点均已对象级锚定（review-tab 活动复盘→targetType/targetId；
  // todo-tab 催办→按责任人角色页 ?tab=todo&highlight=<groupKey>；overview-tab 催办→?tab=；
  // taskforce 专班议案→targetType/targetId）。后续如需豁免，在此登记 file + 理由。
];

/** 递归收集 docs/src 下全部 .js 绝对路径 */
function _walkJsFiles(dir, out = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) _walkJsFiles(p, out);
    else if (e.name.endsWith('.js')) out.push(p);
  }
  return out;
}

/** 抽取每处 `NoticeStore.add(` 的首个对象字面量参数文本（字符串感知的括号配对） */
function _extractAddCalls(src, calleeRe = /NoticeStore\.add\s*\(/g) {
  const out = [];
  const re = new RegExp(calleeRe.source, calleeRe.flags.includes('g') ? calleeRe.flags : calleeRe.flags + 'g');
  let m;
  while ((m = re.exec(src))) {
    const after = m.index + m[0].length;
    // 仅取「紧跟对象字面量」的调用（变量引用如 NoticeStore.add(notification, …) 跳过）
    if (!/^\s*\{/.test(src.slice(after))) continue;
    const i = src.indexOf('{', after);
    if (i === -1) continue;
    let depth = 0;
    let j = i;
    let quote = null;
    for (; j < src.length; j++) {
      const c = src[j];
      if (quote) {
        if (c === '\\') { j++; continue; }
        if (c === quote) quote = null;
        continue;
      }
      if (c === '"' || c === "'" || c === '`') { quote = c; continue; }
      if (c === '{') depth++;
      else if (c === '}') { depth--; if (depth === 0) { j++; break; } }
    }
    out.push(src.slice(i, j));
  }
  return out;
}

test('⑧ A① 对象级深链守卫：所有 actionable 通知携带 targetUrl 或 targetType+targetId', () => {
  const root = fileURLToPath(new URL('../../docs/src/', import.meta.url));
  const files = _walkJsFiles(root);
  assert.ok(files.length > 50, `应扫描 50+ 模块，实际 ${files.length}`);

  const violations = [];
  let actionableCount = 0;
  for (const abs of files) {
    const rel = relative(root, abs).replace(/\\/g, '/');
    const src = readFileSync(abs, 'utf8');
    if (!src.includes('NoticeStore.add')) continue;
    if (NOTICE_ANCHOR_EXEMPT.some(e => e.file === rel)) continue;
    for (const call of _extractAddCalls(src)) {
      if (!/actionable\s*:\s*true/.test(call)) continue;
      actionableCount++;
      const hasUrl = /targetUrl\s*:/.test(call);
      const hasPair = /targetType\s*:/.test(call) && /targetId\s*:/.test(call);
      if (!hasUrl && !hasPair) violations.push(rel);
    }
  }
  // R-22（2026-09-13）：系统派生 actionable 通知的文案/锚点已迁至共享模板单一源
  // （core/system-notice-templates.js，无 NoticeStore.add → 按 pick( 对象字面量抽取）。
  // 守卫同步覆盖模板，防止对象级锚点随迁移失效。
  const tplRel = 'core/system-notice-templates.js';
  const tplSrc = readFileSync(join(root, 'core/system-notice-templates.js'), 'utf8');
  for (const call of _extractAddCalls(tplSrc, /pick\s*\(/g)) {
    if (!/actionable\s*:\s*true/.test(call)) continue;
    actionableCount++;
    const hasUrl = /targetUrl\s*:/.test(call);
    const hasPair = /targetType\s*:/.test(call) && /targetId\s*:/.test(call);
    if (!hasUrl && !hasPair) violations.push(tplRel);
  }
  assert.ok(actionableCount >= 3, `应扫描到至少 3 个 actionable 通知生产点，实际 ${actionableCount}`);
  assert.deepEqual(
    [...new Set(violations)], [],
    `以下 actionable 通知生产点缺对象级锚点（targetUrl 或 targetType+targetId）：\n${[...new Set(violations)].join('\n')}`
  );
});

// ═══════════════ ⑨ 演示下钻放行门 + 代提交复盘表单复用（2026-09-10） ═══════════════
// 背景：① 党委「进入支部（演示）」下钻（secretary.html?branch=<id>）时，bootstrap 身份门调用
//   未定义函数 _partyStaffBranchDemoAllowed → ReferenceError/白屏；② 演示横幅用 escHtml 未导入，
//   同路径再次 ReferenceError；③ 支书「代提交复盘」须复用既有复盘表单，不得另写一套字段。
// 口径：演示放行门单一源 = modules/branch-demo-nav.js；复盘表单单一源 = services/review.js。
test('⑨ 演示下钻放行门 + 代提交复盘表单复用（防未定义引用/字段分叉回归）', () => {
  const root = fileURLToPath(new URL('../../docs/src/', import.meta.url));
  const read = (rel) => readFileSync(join(root, rel), 'utf8');

  // ① 放行门单一源导出；bootstrap 引用导入项（不再调用未定义函数）
  const nav = read('modules/branch-demo-nav.js');
  assert.match(nav, /export function isPartyStaffBranchDemoAllowed\(/, 'branch-demo-nav 应导出演示放行门');
  const bootstrap = read('core/bootstrap.js');
  assert.match(bootstrap, /import \{ isPartyStaffBranchDemoAllowed \} from '\.\.\/modules\/branch-demo-nav\.js/,
    'bootstrap 应导入放行门（单一源）');
  assert.doesNotMatch(bootstrap, /[^.\w]_partyStaffBranchDemoAllowed\s*\(/,
    'bootstrap 不得再调用未定义的 _partyStaffBranchDemoAllowed（演示下钻 ReferenceError 回归）');

  // ② 演示横幅用 escHtml：workspace-shell 使用时须自 core/utils.js 导入
  const shell = read('components/workspace-shell.js');
  if (/\bescHtml\(/.test(shell)) {
    assert.match(shell, /import \{[^}]*\bescHtml\b[^}]*\} from '\.\.\/core\/utils\.js/,
      'workspace-shell 使用 escHtml 须导入（党委演示横幅 ReferenceError 回归）');
  }

  // ③ 复盘表单单一源：review.js 导出渲染 + 提交；成员端/支书代填两处复用，不另写字段
  const review = read('services/review.js');
  assert.match(review, /export function renderActivityReviewFormHtml\(/, 'review.js 应导出复盘表单渲染');
  assert.match(review, /export function submitActivityReviewForm\(/, 'review.js 应导出复盘表单提交链路');
  const visitor = read('entries/tabs/visitor/review-tab.js');
  assert.match(visitor, /renderActivityReviewFormHtml/, '成员端「我的复盘」应复用共享表单');
  assert.doesNotMatch(visitor, /id="review-textarea-/, '成员端不得另写复盘字段（字段须单一源）');
  const todo = read('entries/tabs/secretary/todo-tab.js');
  assert.match(todo, /renderActivityReviewFormHtml/, '支书「代提交复盘」应复用共享表单');
  assert.match(todo, /submitActivityReviewForm\(/, '支书「代提交复盘」应走既有提交链路');
  assert.match(todo, /'fill_review'/, '代提交复盘入口应按既有 fill_review 权限门控');
});


