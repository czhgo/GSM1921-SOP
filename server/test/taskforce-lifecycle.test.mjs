// role: [工程师]+[AI]
// server/test/taskforce-lifecycle.test.mjs — 专班生命周期支委会表决域（附录⑩ S3 R3-1/R3-2/R3-3，2026-09-06）
// 纯 Node 测试（无浏览器）：
//   A. submitForCommittee —— 报送支委会（发起 initiate / 解散 dissolve）状态门禁
//   B. evaluateCommitteeVote —— 表决判据=R2-3（应到严格 >2/3 出席且无反对；object/oppose 同反对、弃权允许）
//   C. listCommitteeRequests —— 归集视图（仅 pending、先报先议、字段齐全）
//   D. applyCommitteeDecision —— 发起通过→招募中 / 未通过→草稿可改重报；解散通过→已解散留痕 / 未通过→回运行中
//   E. verifyContributions —— 成员贡献逐条核（同意入档 / 退回补料、幂等、历史字符串不参与）
// 运行：node --test server/test/taskforce-lifecycle.test.mjs
// 注意：mockDB/服务均带 ?v= 导入保证与 services 模块缓存同一实例。
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mockDB } from '../../docs/src/core/domain.js?v=20260908c';
import { TaskForceRecordStore } from '../../docs/src/services/taskforce.js?v=20260908c';

const ORIGINAL_TASKFORCES = mockDB.taskforces;

/** 用 add() 构造测试专班（避开 init/migrateFromLegacy 对 localStorage 的依赖；id 保证唯一防 Date.now 同毫秒碰撞） */
let _tfSeq = 0;
function addTf(overrides = {}) {
  _tfSeq += 1;
  const base = {
    id: 'tf-test-' + _tfSeq + '-' + Date.now(),
    name: '测试专班',
    task: '测试任务',
    status: 'draft',
    manager: 'p11',
    initiator: 'p11',
    members: [],
    capacity: 3,
    deadline: '2026-09-30',
    activityId: null,
    createdAt: '2026-09-06',
  };
  return TaskForceRecordStore.add({ ...base, ...overrides });
}

beforeEach(() => {
  TaskForceRecordStore._records = [];
});

afterEach(() => {
  TaskForceRecordStore._records = [];
  mockDB.taskforces = ORIGINAL_TASKFORCES;
});

// ── A. 报送支委会：状态门禁 ─────────────────────────────────────
test('A1 submitForCommittee initiate：draft/pending_review 可报；recruiting/active 拒绝', () => {
  const tfDraft = addTf({ status: 'draft' });
  const r1 = TaskForceRecordStore.submitForCommittee(tfDraft.id, { kind: 'initiate', by: 'p11', note: '请支委会审议' });
  assert.ok(r1, 'draft 可报送发起');
  assert.equal(r1.committeeRequest.kind, 'initiate');
  assert.equal(r1.committeeRequest.status, 'pending');
  assert.equal(r1.committeeRequest.note, '请支委会审议');

  const tfActive = addTf({ status: 'active' });
  assert.equal(TaskForceRecordStore.submitForCommittee(tfActive.id, { kind: 'initiate' }), null, '运行中不可报送发起');
  assert.equal(TaskForceRecordStore.submitForCommittee('tf-none', { kind: 'initiate' }), null, '不存在返回 null');
});

test('A2 submitForCommittee dissolve：仅 active 可报解散；recruiting 拒绝', () => {
  const tfActive = addTf({ status: 'active' });
  const r = TaskForceRecordStore.submitForCommittee(tfActive.id, { kind: 'dissolve', by: 'p11' });
  assert.ok(r);
  assert.equal(r.committeeRequest.kind, 'dissolve');

  const tfRecruiting = addTf({ status: 'recruiting' });
  assert.equal(TaskForceRecordStore.submitForCommittee(tfRecruiting.id, { kind: 'dissolve' }), null, '招募中不可报解散');
});

// ── B. 表决判据（R2-3 透传 workforce 单一判据） ─────────────────
test('B1 evaluateCommitteeVote：>2/3 出席且无反对 → passed', () => {
  const roster = ['c1', 'c2', 'c3', 'c4', 'c5']; // 应到 5，需 >3.33 → 4 人出席
  const votes = [
    { personId: 'c1', position: 'agree' },
    { personId: 'c2', position: 'agree' },
    { personId: 'c3', position: 'agree' },
    { personId: 'c4', position: 'agree' },
  ];
  const out = TaskForceRecordStore.evaluateCommitteeVote({ roster, votes });
  assert.equal(out.status, 'passed', '4/5 出席无反对应通过');
  assert.equal(out.needed, 4);
});

test('B2 evaluateCommitteeVote：恰 2/3 整界不过（应到 3 出席 2）→ pending', () => {
  const out = TaskForceRecordStore.evaluateCommitteeVote({
    roster: ['c1', 'c2', 'c3'],
    votes: [
      { personId: 'c1', position: 'agree' },
      { personId: 'c2', position: 'agree' },
    ],
  });
  assert.equal(out.status, 'pending', '2/3 整界不算严格超过');
});

test('B3 evaluateCommitteeVote：有 object/oppose → failed；abstain 弃权允许', () => {
  const roster = ['c1', 'c2', 'c3', 'c4', 'c5'];
  const votes = [
    { personId: 'c1', position: 'agree' },
    { personId: 'c2', position: 'object' },
    { personId: 'c3', position: 'agree' },
    { personId: 'c4', position: 'agree' },
  ];
  assert.equal(TaskForceRecordStore.evaluateCommitteeVote({ roster, votes }).status, 'failed', '异议视同反对');

  const out2 = TaskForceRecordStore.evaluateCommitteeVote({
    roster,
    votes: [
      { personId: 'c1', position: 'agree' },
      { personId: 'c2', position: 'abstain' },
      { personId: 'c3', position: 'agree' },
      { personId: 'c4', position: 'agree' },
    ],
  });
  assert.equal(out2.status, 'passed', '弃权只计出席不否决');
});

// ── C. 归集视图 ────────────────────────────────────────────────
test('C1 listCommitteeRequests：仅 pending、先报先议、字段齐全', () => {
  const tf1 = addTf({ status: 'draft', name: 'A 专班', task: '任务A' });
  const tf2 = addTf({ status: 'active', name: 'B 专班', task: '任务B' });
  const tf3 = addTf({ status: 'draft', name: 'C 专班', task: '任务C' });
  // 按序报送：B(解散)→A(发起)→C(发起)；tf2 之外补一个已决专班不含 pending
  TaskForceRecordStore.submitForCommittee(tf2.id, { kind: 'dissolve', by: 'p11', note: '任务完成' });
  TaskForceRecordStore.submitForCommittee(tf1.id, { kind: 'initiate', by: 'p11', note: '请审议' });
  TaskForceRecordStore.submitForCommittee(tf3.id, { kind: 'initiate', by: 'p13' });
  // C 已表决通过 → 不再出现在归集
  TaskForceRecordStore.applyCommitteeDecision(tf3.id, { decision: 'approved' });

  const list = TaskForceRecordStore.listCommitteeRequests();
  assert.equal(list.length, 2, '仅剩 2 个 pending 请求');
  const ids = list.map(x => x.id).sort();
  assert.deepEqual(ids, [tf1.id, tf2.id].sort(), 'tf3 已表决通过，退出归集');

  // 校验内容字段（kind/note/name/task）
  const diss = list.find(x => x.id === tf2.id);
  assert.equal(diss.kind, 'dissolve');
  assert.equal(diss.note, '任务完成');
  assert.equal(diss.status, 'active');
  const init = list.find(x => x.id === tf1.id);
  assert.equal(init.kind, 'initiate');
});

test('C2 listCommitteeRequests：先报先议（按报送时间升序）', () => {
  TaskForceRecordStore._records = [
    { id: 'tf-x1', name: 'A', task: 't', status: 'draft', initiator: 'p11', createdAt: '2026-09-01', committeeRequest: { kind: 'initiate', status: 'pending', at: '2026-09-06T03:00:00.000Z' } },
    { id: 'tf-x2', name: 'B', task: 't', status: 'active', initiator: 'p13', createdAt: '2026-09-02', committeeRequest: { kind: 'dissolve', status: 'pending', at: '2026-09-06T01:00:00.000Z' } },
    { id: 'tf-x3', name: 'C', task: 't', status: 'draft', initiator: 'p13', createdAt: '2026-09-03', committeeRequest: { kind: 'initiate', status: 'approved', at: '2026-09-06T02:00:00.000Z' } },
  ];
  const list = TaskForceRecordStore.listCommitteeRequests();
  assert.deepEqual(list.map(x => x.id), ['tf-x2', 'tf-x1'], '最早报送排最前；已决(approved)不出现在归集');
});

// ── D. 表决结果落地 ────────────────────────────────────────────
test('D1 applyCommitteeDecision initiate approved：→ recruiting + approvalStatus + 留痕清请求', () => {
  const tf = addTf({ status: 'draft', name: '筹备专班', task: '任务' });
  TaskForceRecordStore.submitForCommittee(tf.id, { kind: 'initiate', by: 'p11' });
  const outcome = TaskForceRecordStore.evaluateCommitteeVote({
    roster: ['c1', 'c2', 'c3', 'c4'],
    votes: [
      { personId: 'c1', position: 'agree' },
      { personId: 'c2', position: 'agree' },
      { personId: 'c3', position: 'agree' },
    ],
  });
  const updated = TaskForceRecordStore.applyCommitteeDecision(tf.id, {
    decision: 'approved', outcome, by: 'p1', decisionRef: 'act-xx:ag-1',
  });
  assert.equal(updated.status, 'recruiting');
  assert.equal(updated.approvalStatus, 'approved');
  assert.equal(updated.committeeRequest, null, '请求清空');
  assert.equal(updated.committeeDecision.length, 1);
  assert.equal(updated.committeeDecision[0].kind, 'initiate');
  assert.equal(updated.committeeDecision[0].decision, 'approved');
  assert.equal(updated.committeeDecision[0].decisionRef, 'act-xx:ag-1');
});

test('D2 applyCommitteeDecision initiate rejected：→ draft 可改重报，二次报送成功', () => {
  const tf = addTf({ status: 'pending_review' });
  TaskForceRecordStore.submitForCommittee(tf.id, { kind: 'initiate', by: 'p11' });
  const updated = TaskForceRecordStore.applyCommitteeDecision(tf.id, {
    decision: 'rejected', outcome: { status: 'failed', tally: { object: 1 } }, by: 'p1', note: '任务范围不清',
  });
  assert.equal(updated.status, 'draft', '未通过退回草稿');
  assert.equal(updated.approvalStatus, 'rejected');
  assert.equal(updated.committeeDecision[0].note, '任务范围不清');
  // 修改后可再次报送
  const resubmit = TaskForceRecordStore.submitForCommittee(tf.id, { kind: 'initiate', by: 'p11', note: '已补充范围' });
  assert.ok(resubmit.committeeRequest, '未通过后可修改重报');
});

test('D3 applyCommitteeDecision dissolve approved：→ dissolved + dissolvedAt；rejected：→ 回 active', () => {
  const tf1 = addTf({ status: 'active' });
  TaskForceRecordStore.submitForCommittee(tf1.id, { kind: 'dissolve', by: 'p11' });
  const approved = TaskForceRecordStore.applyCommitteeDecision(tf1.id, { decision: 'approved', by: 'p1' });
  assert.equal(approved.status, 'dissolved', '表决通过解散留痕');
  assert.ok(approved.dissolvedAt, '记录解散日期');
  assert.equal(approved.committeeDecision[0].kind, 'dissolve');

  const tf2 = addTf({ status: 'active' });
  TaskForceRecordStore.submitForCommittee(tf2.id, { kind: 'dissolve', by: 'p11' });
  const rejected = TaskForceRecordStore.applyCommitteeDecision(tf2.id, { decision: 'rejected', note: '产出未达要求' });
  assert.equal(rejected.status, 'active', '解散未通过专班保持运行');
  assert.equal(rejected.committeeDecision[0].note, '产出未达要求');
});

test('D4 applyCommitteeDecision：无 pending 请求 / 非法 decision → null', () => {
  const tf = addTf({ status: 'draft' });
  assert.equal(TaskForceRecordStore.applyCommitteeDecision(tf.id, { decision: 'approved' }), null, '未报送不可落果');
  TaskForceRecordStore.submitForCommittee(tf.id, { kind: 'initiate' });
  assert.equal(TaskForceRecordStore.applyCommitteeDecision(tf.id, { decision: 'hold' }), null, '非法决策拒绝');
});

// ── E. 成员贡献逐条核（R3-3） ──────────────────────────────────
test('E1 verifyContributions approve：同意入档留痕；reject：退回补料带原因', () => {
  const tf = addTf({
    status: 'active',
    members: [
      { personId: 'p1', role: 'deep', contributions: [] },
      { personId: 'p2', role: 'deep', contributions: [] },
    ],
  });
  // 成员 p1/p2 逐条填报
  TaskForceRecordStore.addContributions(tf.id, { personIds: ['p1'], desc: '完成采写初稿', by: 'p1' });
  TaskForceRecordStore.addContributions(tf.id, { personIds: ['p2'], desc: '物料清单草拟', by: 'p2' });

  const stored = TaskForceRecordStore.getAll().find(r => r.id === tf.id);
  const c1 = stored.members.find(m => m.personId === 'p1').contributions[0];
  const c2 = stored.members.find(m => m.personId === 'p2').contributions[0];
  assert.ok(c1.id && c1.by === 'p1');

  // 组织委员逐条核：同意 c1、退回 c2
  const res = TaskForceRecordStore.verifyContributions(tf.id, {
    contributionIds: [c1.id], decision: 'approve', by: 'p11',
  });
  assert.equal(res.updated, 1);
  const after = TaskForceRecordStore.verifyContributions(tf.id, {
    contributionIds: [c2.id], decision: 'reject', by: 'p11', note: '请补充交付物链接',
  });
  assert.equal(after.updated, 1, '退回补料');
  const final = TaskForceRecordStore.getAll().find(r => r.id === tf.id);
  const mc1 = final.members.find(m => m.personId === 'p1').contributions[0];
  const mc2 = final.members.find(m => m.personId === 'p2').contributions[0];
  assert.equal(mc1.verifiedStatus, 'approved');
  assert.equal(mc2.verifiedStatus, 'rejected');
  assert.equal(mc2.rejectNote, '请补充交付物链接');
  assert.ok(mc1.verifiedBy === 'p11' && mc2.verifiedBy === 'p11', '核验人留痕');
});

test('E2 verifyContributions：幂等跳过已核；历史字符串不参与；非法入参 → null/updated 0', () => {
  const tf = addTf({
    status: 'active',
    members: [
      { personId: 'p1', role: 'deep', contributions: [{ id: 'tc-1', desc: '采写', by: 'p1', at: 'x' }] },
      { personId: 'p2', role: 'deep', contributions: ['历史字符串摘要'] },
    ],
  });
  // 二次核同一 id：幂等 updated 0
  const r1 = TaskForceRecordStore.verifyContributions(tf.id, { contributionIds: ['tc-1'], decision: 'approve', by: 'p11' });
  assert.equal(r1.updated, 1);
  const r2 = TaskForceRecordStore.verifyContributions(tf.id, { contributionIds: ['tc-1'], decision: 'reject', by: 'p11' });
  assert.equal(r2.updated, 0, '已核条目幂等跳过');
  assert.equal(TaskForceRecordStore.verifyContributions(tf.id, { contributionIds: [], decision: 'approve' }), null, '空 ids 拒绝');
  assert.equal(TaskForceRecordStore.verifyContributions(tf.id, { contributionIds: ['x'], decision: 'undo' }), null, '非法 decision 拒绝');
});
