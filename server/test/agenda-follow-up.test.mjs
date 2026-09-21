import test from 'node:test';
import assert from 'node:assert/strict';
import { recordAgendaResult } from '../../docs/src/services/agenda-follow-up.js?v=20260921o';
// 品牌认定（2026-09-21 批次 132 · 支书口径二「提案 → 支委会通过后确定」）——判据与状态迁移的单一源
import { applyBrandDesignationResult } from '../../docs/src/services/activity.js?v=20260921o';
import { mockDB } from '../../docs/src/core/domain.js?v=20260921o';

function createHarness() {
  const db = {
    branchDocs: [{ id: 'bd-draft-1', status: 'draft' }],
    memberChangeRequests: [],
  };
  const calls = { branchUpdates: [], memberRequests: [] };
  return {
    db,
    calls,
    adapter: {
      branchDocs: {
        async update(id, patch) {
          calls.branchUpdates.push({ id, patch });
          const updated = { ...db.branchDocs.find((item) => item.id === id), ...patch };
          db.branchDocs = db.branchDocs.map((item) => item.id === id ? updated : item);
          return updated;
        },
      },
      memberChangeRequests: {
        async create(data) {
          calls.memberRequests.push(data);
          const request = { ...data, id: 'mcr-1', status: 'pending-org-approval' };
          db.memberChangeRequests.push(request);
          return request;
        },
      },
    },
  };
}

test('通过的文件讨论归档草案，并为成员变更创建待审批申请', async () => {
  const harness = createHarness();
  const activity = {
    id: 'act-1',
    agenda: [
      { id: 'file-1', kind: 'discussion-file', branchDocId: 'bd-draft-1', result: null },
      { id: 'member-1', kind: 'member-change', personId: 'p6', fromStage: '发展对象', toStage: '预备党员', result: null },
    ],
  };

  const afterFile = await recordAgendaResult({
    activity,
    agendaItemId: 'file-1',
    result: 'passed',
    adapter: harness.adapter,
    db: harness.db,
    actorId: 'p13',
    now: '2026-09-01T00:00:00.000Z',
  });
  const afterMember = await recordAgendaResult({
    activity: afterFile,
    agendaItemId: 'member-1',
    result: 'passed',
    adapter: harness.adapter,
    db: harness.db,
    actorId: 'p13',
    now: '2026-09-01T00:01:00.000Z',
  });

  assert.equal(afterMember.agenda[0].result, 'passed');
  assert.equal(afterMember.agenda[1].result, 'passed');
  assert.equal(afterMember.agenda[0].recordedBy, 'p13');
  assert.equal(afterMember.agenda[1].recordedBy, 'p13');
  assert.equal(afterMember.agenda[0].recordedAt, '2026-09-01T00:00:00.000Z');
  assert.equal(afterMember.agenda[1].recordedAt, '2026-09-01T00:01:00.000Z');
  assert.deepEqual(harness.calls.branchUpdates, [{
    id: 'bd-draft-1',
    patch: {
      status: 'archived',
      archivedAt: '2026-09-01T00:00:00.000Z',
      discussionActivityId: 'act-1',
      discussionAgendaItemId: 'file-1',
    },
  }]);
  assert.deepEqual(harness.calls.memberRequests, [{
    activityId: 'act-1',
    agendaItemId: 'member-1',
    personId: 'p6',
    fromStage: '发展对象',
    toStage: '预备党员',
    meetingResult: 'passed',
  }]);
});

test('未通过的成员变更不创建申请', async () => {
  const harness = createHarness();
  const result = await recordAgendaResult({
    activity: {
      id: 'act-2',
      agenda: [{ id: 'member-2', kind: 'member-change', personId: 'p6', result: null }],
    },
    agendaItemId: 'member-2',
    result: 'rejected',
    adapter: harness.adapter,
    db: harness.db,
    actorId: 'p13',
    now: '2026-09-01T00:00:00.000Z',
  });

  assert.equal(result.agenda[0].result, 'rejected');
  assert.equal(result.agenda[0].recordedBy, 'p13');
  assert.equal(result.agenda[0].recordedAt, '2026-09-01T00:00:00.000Z');
  assert.equal(harness.calls.memberRequests.length, 0);
});

// ── 品牌认定：提案 → 支委会审议通过后确定（2026-09-21 批次 132 · 支书口径二）──────────
// 口径：支委/党小组组长均可提案；支委会（有党小组组长参会即支委扩大会）通过后确定。
// 落成：`isBrand` 只能由支委会议程项记录「通过」置位——本组用例证明「通过才算认定 / 不通过不算」。
// ⚠ 写口＝`services/activity.js::commitBrandDesignationResult`（活动主源单点改写 ⇒ mock/api 同码），
//   故断言落在 mockDB.activities 上（不走 adapter：那条路会被紧随其后的页面快照回滚，真机实测）。

/** 被提案的那场活动（品牌认定的对象）——放进 mockDB（写口改的是活动主源） */
const brandTarget = () => ({
  id: 'act-target-1', title: '主题党日：人生回望录', type: '主题党日', isBrand: false,
  brandProposal: { by: 'p11', at: '2026-09-21T00:00:00.000Z', note: '' },
});
const targetNow = () => (mockDB.activities || []).find((a) => a.id === 'act-target-1');

test('品牌认定：支委会审议「通过」⇒ 置 isBrand 并留痕（提案随之清空）；这是产生 isBrand 的唯一路径', async () => {
  const harness = createHarness();
  mockDB.activities = [brandTarget()];
  const meeting = {
    id: 'act-committee-1',
    type: '支委会',
    agenda: [{ id: 'brand-1', kinds: ['brand-designation'], brandActivityId: 'act-target-1', item: '审议品牌认定「主题党日：人生回望录」' }],
  };
  await recordAgendaResult({
    activity: meeting,
    agendaItemId: 'brand-1',
    result: 'passed',
    adapter: harness.adapter,
    db: harness.db,
    actorId: 'p13',
    now: '2026-09-21T02:00:00.000Z',
  });
  const a = targetNow();
  assert.equal(a.isBrand, true, '通过 ⇒ 确定品牌认定');
  assert.equal(a.brandProposal, null, '议决后清空提案');
  assert.equal(a.brandDesignatedBy, 'p13');
  assert.equal(a.brandDesignatedAt, '2026-09-21T02:00:00.000Z');
  assert.equal(a.brandDesignationActivityId, 'act-committee-1', '认定留痕回指审议会议');
  assert.equal(a.brandDesignationAgendaItemId, 'brand-1', '认定留痕回指议程项');
  mockDB.activities = [];
});

test('品牌认定：支委会审议「未通过」⇒ 不作认定（仍非品牌），提案保留＋退回意见（可再议）', async () => {
  const harness = createHarness();
  mockDB.activities = [brandTarget()];
  const meeting = {
    id: 'act-committee-2',
    type: '支委会',
    agenda: [{ id: 'brand-2', kinds: ['brand-designation'], brandActivityId: 'act-target-1' }],
  };
  await recordAgendaResult({
    activity: meeting,
    agendaItemId: 'brand-2',
    result: 'rejected',
    adapter: harness.adapter,
    db: harness.db,
    actorId: 'p13',
    now: '2026-09-21T02:10:00.000Z',
  });
  const a = targetNow();
  assert.equal(!!a.isBrand, false, '未通过 ⇒ 不置 isBrand（不认定）');
  assert.equal(a.brandProposal.reviewResult, 'rejected');
  assert.ok(a.brandProposal.reviewNote, '未通过留退回意见');
  assert.equal(a.brandProposal.by, 'p11', '提案人留痕不变');
  mockDB.activities = [];
});

test('品牌认定：会议类型不符（挂到主题党日上）⇒ 不动（防从别的会上把品牌推出去）', async () => {
  const harness = createHarness();
  mockDB.activities = [brandTarget()];
  const wrongMeeting = {
    id: 'act-theme-1',
    type: '主题党日',
    agenda: [{ id: 'brand-3', kinds: ['brand-designation'], brandActivityId: 'act-target-1' }],
  };
  await recordAgendaResult({
    activity: wrongMeeting,
    agendaItemId: 'brand-3',
    result: 'passed',
    adapter: harness.adapter,
    db: harness.db,
    actorId: 'p13',
    now: '2026-09-21T02:20:00.000Z',
  });
  assert.equal(!!targetNow().isBrand, false, '会议类型不符 ⇒ 活动不动');
  assert.ok(targetNow().brandProposal, '提案仍在');
  mockDB.activities = [];
});

test('品牌认定纯函数：无提案 / 非支委会 两支的判据', () => {
  assert.deepEqual(applyBrandDesignationResult({ activity: { id: 'a' }, meetingType: '支委会', decision: 'passed' }),
    { ok: false, reason: 'not-a-brand-proposal' }, '无提案 ⇒ 不动作（提案是认定的前提）');
  assert.equal(applyBrandDesignationResult({ activity: brandTarget(), meetingType: '支委扩大会', decision: 'passed' }).ok, true,
    '「支委扩大会」按既有类型字面同源判据（/支委/）——系统未单列该会议类型，用支委会会议承载');
  assert.equal(applyBrandDesignationResult({ activity: brandTarget(), meetingType: '支委会', decision: 'passed' }).patch.isBrand, true);
});
