// role: [工程师]+[AI]
// server/test/member-confirmation.test.mjs — 附录⑩ S4 名册生命周期·确权复核（C 批，2026-09-06）
// 纯 Node 测试（无浏览器、不起 server；mock 形态，localStorage 内存桩 + beginMockCase 恢复 seed，
// 范式同 member-persist.test.mjs）：
//   ① submitMemberChange 校验（person 存在 / kind 合法 / 枚举 / to=现值拒绝 / 同 person+kind pending 拒绝）
//   ② developStage pending → decide approved 落档案；rejected 带 rejectNote 不生效
//   ③ residence pending → decide approved：roster 覆盖 + 留痕（updatedBy=书记）+ 档案镜像
//   ④ submitTransferOut：现任书记拒绝 / 有 pending 其它请求拦截 / 无引用 direct / 仅安全引用 direct+clearedSafe
//   ⑤ 有保留历史 → transferOut pending（refsSummary 分类）→ decide approved：
//       安全解除、保留记录 transferredOutAt、专班普通成员移除 / 专班负责人保留+提示、
//       memberChangeRequests 非终态作废、成员移除 + removedIds 对象含 name（getName 不匿名）、
//       isTransferredOut true
//   ⑥ 刷新持久（localStorage 镜像 → 清 mockDB 后 list 仍可恢复）；旧 string removedIds 兼容
//   ⑦ listPendingConfirmations 仅 pending；学期末提醒窗口函数
// ⚠️ 对 docs/src 的相对 import 必须带与源码一致的 ?v= query（模块缓存键一致性）。
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { mockDB } from '../../docs/src/core/domain.js?v=20260903c';
import {
  MockAdapter,
} from '../../docs/src/core/mock-adapter.js?v=20260903c';
import {
  PersonStore, getPersonName, MEMBER_OVERLAY_KEY,
} from '../../docs/src/services/person.js?v=20260907b';
import {
  RESIDENCE, getResidenceOf, saveResidenceChange, getDetainedMembers, RESIDENCE_KEY,
} from '../../docs/src/services/roster.js?v=20260903c';
import {
  submitMemberChange, submitTransferOut, listPendingConfirmations,
  decideConfirmation, isTransferredOut, shouldShowSemesterDetainedRemind,
  MEMBER_CONFIRM_KEY,
} from '../../docs/src/services/member-confirmation.js?v=20260907b';
import { setDataSource } from '../../docs/src/core/data-adapter.js?v=20260903c';

// ── localStorage 内存桩 ──
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

/** 每例独立现场：清业务域 + 清存储（含确权队列）→ 恢复 seed */
function beginMockCase() {
  _store.clear();
  delete globalThis.window;
  for (const k of [
    'activities', 'tasks', 'attendances', 'inspections', 'taskforces', 'notices', 'todos',
    'assignments', 'signups', 'activityReviews', 'taskforceReviews', 'agendaVotes',
    'memberChangeRequests', 'committeeBroadcasts', 'thoughtReports', 'branchDocs',
    'appointmentRecords', 'reviewRequests', 'archiveRecords', 'pendingMemberConfirmations',
  ]) {
    mockDB[k] = [];
  }
  mockDB.branches = [];
  mockDB._loaded = false;
  setDataSource('mock');
  MockAdapter.loadDB();
}

/** 相对今天的日期串（YYYY-MM-DD） */
function _dateOffset(days) {
  return new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);
}

/** 往 mockDB 追加一条「未开始」活动（status/date 可调；未来日期默认） */
function _addActivity(id, { status = 'published', date = _dateOffset(10) } = {}) {
  mockDB.activities = [...mockDB.activities, { id, title: `测试活动-${id}`, status, date, assignments: [], visibility: 'branch' }];
  return mockDB.activities.find(a => a.id === id);
}

function _overlayRemovedIds() {
  const raw = localStorage.getItem(MEMBER_OVERLAY_KEY);
  return raw ? (JSON.parse(raw).removedIds || []) : [];
}

// ═══════════════ ① submitMemberChange 校验 ═══════════════

test('submitMemberChange：成员不存在 / kind 非法 / 枚举外 / to=现值一致 均拒绝', () => {
  beginMockCase();
  assert.equal(submitMemberChange({ personId: 'p_ghost', kind: 'developStage', to: '预备党员', by: 'p11' }).ok, false);
  assert.equal(submitMemberChange({ personId: 'p1', kind: 'partyGroup', to: '第一党小组', by: 'p11' }).ok, false);
  const badStage = submitMemberChange({ personId: 'p1', kind: 'developStage', to: '神秘阶段', by: 'p11' });
  assert.equal(badStage.ok, false);
  assert.match(badStage.reason, /发展阶段须为/);
  const badRes = submitMemberChange({ personId: 'p1', kind: 'residence', to: '离校', by: 'p11' });
  assert.equal(badRes.ok, false);
  // to = 现值（p1 正式党员 / 在校）
  assert.match(submitMemberChange({ personId: 'p1', kind: 'developStage', to: '正式党员', by: 'p11' }).reason, /与现值一致/);
  assert.match(submitMemberChange({ personId: 'p1', kind: 'residence', to: RESIDENCE.CAMPUS, by: 'p11' }).reason, /与现值一致/);
  assert.equal(listPendingConfirmations().length, 0);
});

test('submitMemberChange：同 person+kind 已有 pending 拒绝；不同 kind 可并行（各自独立）', () => {
  beginMockCase();
  const r1 = submitMemberChange({ personId: 'p1', kind: 'developStage', to: '预备党员', note: '', by: 'p11' });
  assert.equal(r1.ok, true, JSON.stringify(r1));
  assert.equal(r1.request.kind, 'change');
  assert.equal(r1.request.action, 'developStage');
  assert.equal(r1.request.personId, 'p1');
  assert.equal(r1.request.name, '罗文杰');
  assert.equal(r1.request.from, '正式党员');
  assert.equal(r1.request.to, '预备党员');
  assert.equal(r1.request.by, 'p11');
  assert.equal(r1.request.status, 'pending');
  assert.match(r1.request.id, /^mc-/);
  // 同 kind 重复 → 拒绝
  const dup = submitMemberChange({ personId: 'p1', kind: 'developStage', to: '发展对象', by: 'p11' });
  assert.equal(dup.ok, false);
  assert.match(dup.reason, /待书记确认/);
  // 不同 kind（residence）不受影响（p1 在校 → 滞留）
  const res = submitMemberChange({ personId: 'p1', kind: 'residence', to: RESIDENCE.DETAINED, note: '交换一学期', by: 'p11' });
  assert.equal(res.ok, true);
  assert.equal(listPendingConfirmations().length, 2);
  assert.equal(mockDB.pendingMemberConfirmations.length, 2);
});

// ═══════════════ ② decide：阶段 approved / rejected ═══════════════

test('decideConfirmation approved（发展阶段）：落档案 + decidedBy/decidedAt；listPending 剔除', async () => {
  beginMockCase();
  const r = submitMemberChange({ personId: 'p1', kind: 'developStage', to: '预备党员', by: 'p11' });
  const decided = await decideConfirmation(r.request.id, { decision: 'approved', by: 'p13', note: '' });
  assert.equal(decided.ok, true, JSON.stringify(decided));
  assert.equal(decided.request.status, 'approved');
  assert.equal(decided.request.decidedBy, 'p13');
  assert.ok(decided.request.decidedAt, 'decidedAt 已写');
  assert.equal(PersonStore.getById('p1').developStage, '预备党员', '阶段确认后落档案');
  assert.equal(listPendingConfirmations().length, 0, '已确认请求不再出现在待办');
  // 终态保留（审计追溯）
  assert.equal(mockDB.pendingMemberConfirmations.length, 1);
  assert.equal(mockDB.pendingMemberConfirmations[0].status, 'approved');
});

test('decideConfirmation rejected：rejectNote 透传 + 默认提示；不生效', async () => {
  beginMockCase();
  const r = submitMemberChange({ personId: 'p1', kind: 'developStage', to: '发展对象', by: 'p11' });
  const decided = await decideConfirmation(r.request.id, { decision: 'rejected', by: 'p13', note: '暂缓，材料不齐' });
  assert.equal(decided.ok, true);
  assert.equal(decided.request.status, 'rejected');
  assert.equal(decided.request.rejectNote, '暂缓，材料不齐');
  assert.equal(decided.request.decidedBy, 'p13');
  assert.equal(PersonStore.getById('p1').developStage, '正式党员', '退回不生效');
  assert.equal(listPendingConfirmations().length, 0);
  // 空 note → 默认提示
  const r2 = submitMemberChange({ personId: 'p6', kind: 'developStage', to: '预备党员', by: 'p11' });
  const d2 = await decideConfirmation(r2.request.id, { decision: 'rejected', by: 'p13' });
  assert.equal(d2.request.rejectNote, '书记未确认生效，请求已退回');
  // 非 pending / 已决策请求 → 不可重复决策
  const again = await decideConfirmation(r.request.id, { decision: 'approved', by: 'p13' });
  assert.equal(again.ok, false);
});

test('decideConfirmation：decision 非法 / 找不到 pending 请求 → 拒绝', async () => {
  beginMockCase();
  const r = submitMemberChange({ personId: 'p1', kind: 'developStage', to: '预备党员', by: 'p11' });
  const bad = await decideConfirmation(r.request.id, { decision: 'maybe', by: 'p13' });
  assert.equal(bad.ok, false);
  const ghost = await decideConfirmation('mc-不存在', { decision: 'approved', by: 'p13' });
  assert.equal(ghost.ok, false);
});

// ═══════════════ ③ decide：在册滞留 approved（覆盖层+留痕+档案镜像） ═══════════════

test('decideConfirmation approved（在册滞留）：roster 覆盖 + 留痕 updatedBy=书记 + 档案镜像', async () => {
  beginMockCase();
  const r = submitMemberChange({ personId: 'p1', kind: 'residence', to: RESIDENCE.DETAINED, note: '2026-09 起交换一学期', by: 'p11' });
  const decided = await decideConfirmation(r.request.id, { decision: 'approved', by: 'p13' });
  assert.equal(decided.ok, true, JSON.stringify(decided));
  const p1 = PersonStore.getMembers().find(p => p.id === 'p1');
  assert.equal(getResidenceOf(p1).residenceStatus, RESIDENCE.DETAINED, 'roster 覆盖层即时生效（纪检/书记复核同源）');
  const history = getResidenceOf(p1).residenceHistory || [];
  const last = history[history.length - 1];
  assert.equal(last.from, RESIDENCE.CAMPUS);
  assert.equal(last.to, RESIDENCE.DETAINED);
  assert.equal(last.updatedBy, 'p13', '双层留痕：生效留痕人 = 书记');
  assert.equal(PersonStore.getById('p1').residenceStatus, RESIDENCE.DETAINED, '档案镜像已写');
  assert.ok(getDetainedMembers().some(p => p.id === 'p1'), '滞留名单即时包含 p1');
});

// ═══════════════ ④ submitTransferOut：拦截 / direct ═══════════════

test('submitTransferOut：现任书记（p13）拒绝需先交接；已有 pending 其它请求拦截', async () => {
  beginMockCase();
  const sec = await submitTransferOut({ personId: 'p13', by: 'p11' });
  assert.equal(sec.ok, false);
  assert.match(sec.reason, /现任书记/);
  // 先有阶段 pending → 移出被拦截
  submitMemberChange({ personId: 'p1', kind: 'developStage', to: '预备党员', by: 'p11' });
  const blocked = await submitTransferOut({ personId: 'p1', by: 'p11' });
  assert.equal(blocked.ok, false);
  assert.match(blocked.reason, /已有待书记确认的请求/);
});

test('submitTransferOut：无任何引用 → direct 直接移出（removedIds 对象含 name；不匿名）', async () => {
  beginMockCase();
  const r = await submitTransferOut({ personId: 'p50', by: 'p11', note: '毕业转出' });
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.equal(r.direct, true);
  assert.equal(r.clearedSafe, 0);
  assert.equal(PersonStore.getMembers().some(p => p.id === 'p50'), false, '读链即时剔除');
  assert.equal(listPendingConfirmations().length, 0, 'direct 不建 pending');
  const recs = _overlayRemovedIds();
  assert.equal(recs.length, 1);
  assert.equal(recs[0].id, 'p50');
  assert.equal(recs[0].name, '汪洋', 'removedIds 记录姓名（历史读链不匿名）');
  assert.equal(recs[0].decidedBy, 'p11');
  assert.ok(recs[0].removedAt);
  assert.equal(recs[0].transferOut, true, '转出标记');
  assert.equal(isTransferredOut('p50'), true);
  assert.equal(getPersonName('p50'), '汪洋', '移出后姓名仍可解析');
  assert.equal(PersonStore.getName('p50'), '汪洋');
});

test('submitTransferOut：仅安全引用（未开始分工/未生效报名/未读广播）→ direct + clearedSafe', async () => {
  beginMockCase();
  const act = _addActivity('act-c-future'); // published + 未来日期 → 未开始
  act.assignments = [{ personId: 'p50', role: 'deep' }];
  mockDB.signups = [...mockDB.signups, { id: 'su-c-x', sourceType: 'activity', sourceId: 'act-c-future', personId: 'p50', status: 'pending', createdAt: new Date().toISOString() }];
  mockDB.committeeBroadcasts = [...mockDB.committeeBroadcasts, { id: 'cb-c-x', requestId: 'rq-x', recipientId: 'p50', status: 'pending', broadcastAt: new Date().toISOString() }];
  const r = await submitTransferOut({ personId: 'p50', by: 'p11' });
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.equal(r.direct, true);
  assert.equal(r.clearedSafe, 3);
  // 安全引用已清
  assert.equal(mockDB.activities.find(a => a.id === 'act-c-future').assignments.length, 0, '未开始活动分工行已解除');
  assert.equal(mockDB.signups.some(s => s.id === 'su-c-x'), false, '未生效报名已解除');
  assert.equal(mockDB.committeeBroadcasts.some(b => b.id === 'cb-c-x'), false, '未读广播已解除');
  assert.equal(PersonStore.getMembers().some(p => p.id === 'p50'), false);
});

// ═══════════════ ⑤ transferOut pending：分类 + approve 执行 ═══════════════

test('submitTransferOut：有保留历史 → transferOut pending（refsSummary 分类）→ 成员仍在册', async () => {
  beginMockCase();
  // p5 种子活动分工（act-29 过去 / act-31 未来）会随系统日期归入 keep/safe → 先摘除，改受控数据：
  mockDB.activities = mockDB.activities.map(a => ({
    ...a, assignments: (a.assignments || []).filter(x => !(x && x.personId === 'p5')),
  }));
  const keepAct = _addActivity('act-c-keep1', { status: 'completed', date: _dateOffset(-5) }); // 已开始 → keep
  keepAct.assignments = [{ personId: 'p5', role: 'deep' }];
  // assign_seed_002/004（assignments 域，assigneeId p5）→ keep；专班 tf-c-1（mock loadDB 不 seed taskforces）→ keep
  mockDB.taskforces = [...mockDB.taskforces, {
    id: 'tf-c-1', name: '测试专班', task: '测试', status: 'active', members: [{ personId: 'p5', role: 'participant' }],
  }];
  const r = await submitTransferOut({ personId: 'p5', by: 'p11', note: '毕业转出' });
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.equal(r.direct, false);
  assert.equal(listPendingConfirmations().length, 1);
  assert.equal(PersonStore.getMembers().some(p => p.id === 'p5'), true, '未确认前成员仍在册');
  const req = listPendingConfirmations()[0];
  assert.equal(req.kind, 'transferOut');
  assert.equal(req.action, 'transferOut');
  assert.equal(req.from, '在册');
  assert.equal(req.to, '已转出');
  assert.equal(req.name, '宋佳宁');
  assert.ok(req.refsSummary, '移出请求带 refsSummary');
  const keepDomains = req.refsSummary.keep.map(x => x.domain);
  assert.ok(keepDomains.includes('activities'), '活动分工在 keep');
  assert.ok(keepDomains.includes('assignments'), '分工记录在 keep');
  assert.ok(keepDomains.includes('taskforces'), '专班成员在 keep');
  assert.equal(req.refsSummary.safe.length, 0, '无未开始引用 → safe 为空');
  // 成员还在 → 再发起（重复 pending）被拦截
  const dup = await submitTransferOut({ personId: 'p5', by: 'p11' });
  assert.equal(dup.ok, false);
  assert.match(dup.reason, /待书记确认/);
});

test('decide approved（移出）：安全解除 + keep 标注 transferredOutAt + 专班普通成员移除 + 不匿名', async () => {
  beginMockCase();
  // 构造：p5 一个未来活动内嵌分工行（safe）+ 一个过去/已开始分工行（keep）+ 考勤（keep）+ 专班普通成员（移除）
  const future = _addActivity('act-c-future2');
  future.assignments = [{ personId: 'p5', role: 'deep' }];
  const started = _addActivity('act-c-started', { status: 'completed', date: _dateOffset(-5) });
  started.assignments = [{ personId: 'p5', role: 'deep' }];
  mockDB.attendances = [...mockDB.attendances, { id: 'att-c-x', activityId: 'act-c-started', personId: 'p5', status: 'present', recordedBy: 'p10', recordedAt: new Date().toISOString() }];
  // 专班普通成员（mock loadDB 不 seed taskforces，手工构造）
  mockDB.taskforces = [...mockDB.taskforces, {
    id: 'tf-c-1', name: '测试专班', task: '测试', status: 'active', members: [{ personId: 'p5', role: 'participant' }],
  }];
  const r = await submitTransferOut({ personId: 'p5', by: 'p11' });
  assert.equal(r.ok, true);
  const decided = await decideConfirmation(r.request.id, { decision: 'approved', by: 'p13' });
  assert.equal(decided.ok, true, JSON.stringify(decided));
  // 安全行解除；keep 行标注
  assert.equal(mockDB.activities.find(a => a.id === 'act-c-future2').assignments.length, 0, 'safe 活动分工行解除');
  const startedAct = mockDB.activities.find(a => a.id === 'act-c-started');
  assert.equal(startedAct.assignments.length, 1, 'keep 分工行保留');
  assert.ok(startedAct.assignments[0].transferredOutAt, 'keep 分工行标注 transferredOutAt');
  const att = mockDB.attendances.find(x => x.id === 'att-c-x');
  assert.equal(att.status, 'present');
  assert.ok(att.transferredOutAt, '考勤记录标注 transferredOutAt（不删不匿名）');
  const tfC1 = mockDB.taskforces.find(t => t.id === 'tf-c-1');
  assert.ok(tfC1, '专班保留不删');
  assert.ok(!tfC1.members.some(m => m.personId === 'p5'), '专班普通成员转出即移出（专班保留）');
  // 成员移除 + 姓名保留
  assert.equal(PersonStore.getMembers().some(p => p.id === 'p5'), false);
  assert.equal(isTransferredOut('p5'), true);
  assert.equal(getPersonName('p5'), '宋佳宁');
  // assign_seed_002（assigneeId p5，长期授权分工记录）标注
  const asg = mockDB.assignments.find(x => x.id === 'assign_seed_002');
  assert.ok(asg.transferredOutAt, 'assignments 域记录标注 transferredOutAt');
  assert.equal(listPendingConfirmations().length, 0);
});

test('decide approved（移出）：专班负责人保留行 + 提示 note + refsSummary 提示条；不阻塞移出', async () => {
  beginMockCase();
  // p7 为自建专班 tf-c-org 负责人（organizer）；su-001（taskforce tf-005 approved 报名）→ keep
  mockDB.taskforces = [...mockDB.taskforces, {
    id: 'tf-c-org', name: '宣传专班', task: '测试', status: 'active',
    members: [{ personId: 'p7', role: 'organizer', contributions: [] }, { personId: 'p26', role: 'organizer', contributions: [] }],
  }];
  const r = await submitTransferOut({ personId: 'p7', by: 'p11' });
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.equal(r.direct, false);
  const req = listPendingConfirmations()[0];
  const orgHint = req.refsSummary.keep.find(x => /专班负责人/.test(x.label));
  assert.ok(orgHint, 'keep 摘要含「专班负责人（转出前须先移交）」提示条');
  const decided = await decideConfirmation(r.request.id, { decision: 'approved', by: 'p13' });
  assert.equal(decided.ok, true, JSON.stringify(decided));
  const tfOrg = mockDB.taskforces.find(t => t.id === 'tf-c-org');
  const orgRow = tfOrg.members.find(m => m.personId === 'p7');
  assert.ok(orgRow, '专班负责人成员行保留（不因转出被移除）');
  assert.ok(orgRow.transferredOutAt);
  assert.equal(orgRow.note, '专班负责人，转出前须先移交');
  assert.equal(tfOrg.members.some(m => m.personId === 'p26'), true, '其余成员不受影响');
  // 报名记录保留 + 标注
  const su = mockDB.signups.find(x => x.id === 'su-001');
  assert.ok(su.transferredOutAt, '已发生报名保留 + 标注');
  // 仍允许移出（负责人未交接不阻塞本批）
  assert.equal(PersonStore.getMembers().some(p => p.id === 'p7'), false);
  assert.equal(getPersonName('p7'), '曾雨桐');
});

test('decide approved（移出）：memberChangeRequests 非终态作废 cancelled + 终态标注', async () => {
  beginMockCase();
  mockDB.memberChangeRequests = [
    { id: 'mcr-c-pending', personId: 'p1', activityId: 'act-x', fromStage: '正式党员', toStage: '预备党员', status: 'pending-secretary', createdAt: new Date().toISOString() },
    { id: 'mcr-c-done', personId: 'p1', activityId: 'act-y', fromStage: '预备党员', toStage: '正式党员', status: 'completed', createdAt: new Date().toISOString() },
  ];
  const r = await submitTransferOut({ personId: 'p1', by: 'p11' });
  assert.equal(r.ok, true, JSON.stringify(r));
  const decided = await decideConfirmation(r.request.id, { decision: 'approved', by: 'p13' });
  assert.equal(decided.ok, true, JSON.stringify(decided));
  const pend = mockDB.memberChangeRequests.find(x => x.id === 'mcr-c-pending');
  assert.equal(pend.status, 'cancelled');
  assert.ok(pend.cancelledAt);
  assert.ok(pend.transferredOutAt);
  const done = mockDB.memberChangeRequests.find(x => x.id === 'mcr-c-done');
  assert.equal(done.status, 'completed', '终态请求状态不变');
  assert.ok(done.transferredOutAt, '终态请求仅标注');
  assert.equal(getPersonName('p1'), '罗文杰', '移出后姓名仍可解析');
});

// ═══════════════ ⑥ 持久（刷新恢复）+ 旧数据兼容 ═══════════════

test('确权队列跨刷新持久：清 mockDB 后经 localStorage 镜像恢复；已决策记录保留', async () => {
  beginMockCase();
  const r = submitMemberChange({ personId: 'p6', kind: 'developStage', to: '预备党员', by: 'p11' });
  assert.ok(r.ok);
  assert.ok(localStorage.getItem(MEMBER_CONFIRM_KEY), '请求写入 localStorage 镜像');
  // 模拟刷新：内存队列置空（loadDB 不触碰该数组，等价于页面重载后 mockDB 重建为空）
  mockDB.pendingMemberConfirmations = [];
  assert.equal(listPendingConfirmations().length, 1, 'list 读口从 localStorage 恢复');
  const req = listPendingConfirmations()[0];
  await decideConfirmation(req.id, { decision: 'approved', by: 'p13' });
  assert.equal(PersonStore.getById('p6').developStage, '预备党员');
  // 再模拟刷新：终态记录保留（审计追溯）、pending 为空
  mockDB.pendingMemberConfirmations = [];
  assert.equal(listPendingConfirmations().length, 0);
  assert.equal(mockDB.pendingMemberConfirmations.length, 1, '终态记录从镜像恢复');
});

test('旧 string removedIds 兼容：applyMemberOverlay 过滤 + getName 查不到名回退 id', () => {
  beginMockCase();
  localStorage.setItem(MEMBER_OVERLAY_KEY, JSON.stringify({ version: 1, upserts: [], removedIds: ['p99'] }));
  assert.equal(PersonStore.getMembers().some(p => p.id === 'p99'), false, 'string 删除标记照常过滤');
  assert.equal(PersonStore.getName('p99'), 'p99', '无姓名记录回退既有未知文案（id）');
  assert.equal(isTransferredOut('p99'), false, '旧 string 项无转出标记');
});

// ═══════════════ ⑦ 学期末窗口 + 其余读口 ═══════════════

test('shouldShowSemesterDetainedRemind：窗口 [06-15..07-15]∪[12-15..次年01-15] 且有滞留 → true；否则 false', () => {
  beginMockCase();
  assert.equal(getDetainedMembers().length >= 1, true, '种子示范滞留存在（p5/p9）');
  for (const d of ['2026-06-15', '2026-06-30', '2026-07-15', '2026-12-15', '2026-12-31', '2027-01-01', '2027-01-15']) {
    assert.equal(shouldShowSemesterDetainedRemind(new Date(`${d}T00:00:00`)), true, `${d} 应在窗口`);
  }
  for (const d of ['2026-06-14', '2026-07-16', '2026-09-07', '2026-12-14', '2027-01-16', '2027-03-01']) {
    assert.equal(shouldShowSemesterDetainedRemind(new Date(`${d}T00:00:00`)), false, `${d} 应在窗口外`);
  }
  // 窗口内但无滞留成员 → false
  saveResidenceChange({ personId: 'p5', actorId: 'p11', status: RESIDENCE.CAMPUS });
  saveResidenceChange({ personId: 'p9', actorId: 'p11', status: RESIDENCE.CAMPUS });
  assert.equal(getDetainedMembers().length, 0);
  assert.equal(shouldShowSemesterDetainedRemind(new Date('2026-06-30T00:00:00')), false, '无滞留成员不提醒');
});

test('listPendingConfirmations：仅 pending；含 name/action/from→to/by/at/note/kind', () => {
  beginMockCase();
  const r1 = submitMemberChange({ personId: 'p1', kind: 'residence', to: RESIDENCE.DETAINED, note: '交换', by: 'p11' });
  const list = listPendingConfirmations();
  assert.equal(list.length, 1);
  assert.ok(list[0].name && list[0].action && list[0].from && list[0].to && list[0].by && list[0].at && list[0].note !== undefined && list[0].kind, '展示字段齐全');
  assert.equal(list[0].note, '交换');
  assert.equal(list[0].id, r1.request.id);
  assert.equal(mockDB.pendingMemberConfirmations.some(x => x.status === 'pending'), true);
});
