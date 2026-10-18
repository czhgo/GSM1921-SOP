// role: [工程师]+[AI]
// agenda-closure-core.test.mjs — 核心闭环服务层红测试（TDD）：
//   ① collectAgendaRows：创建表单议程行 → 带类型(kinds)/草案(branchDocId)/待讨论名单(personIds) 的规范化议程
//   ② recordAgendaResultForActivity：详情页「记录通过」接线 → 更新活动结果 + 自动归档支部文件 + 名单每人建申请
// 运行：node --test server/test/agenda-closure-core.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { collectAgendaRows } from '../../docs/src/entries/tabs/secretary/agenda-form.js?v=20261018d';
import { recordAgendaResultForActivity } from '../../docs/src/services/activity/agenda-follow-up.js?v=20261018d';

test('collectAgendaRows：议程行多类型不互斥，产出 kinds 数组与结构化字段', () => {
  const rows = [
    // 普通议程（无类型）
    { item: '学习《中国共产党章程》', host: '支书', kinds: [] },
    // 讨论文件 + 待讨论名单（多类型并存，同一行两种属性）
    {
      item: '讨论关于 2 名发展对象转为预备党员', host: '组织委员',
      kinds: ['discussion-file', 'attendee-list'],
      branchDocId: 'bd-draft-1',
      personIds: ['p6', 'p22'],
      fromStage: '发展对象', toStage: '预备党员',
    },
    // 空行忽略
    { item: '', host: '', kinds: [] },
  ];

  const agenda = collectAgendaRows(rows);

  assert.equal(agenda.length, 2, '空行应被忽略');
  assert.deepEqual(agenda[0].kinds, [], '普通议程 kinds 为空数组');
  assert.equal(agenda[0].item, '学习《中国共产党章程》');
  assert.ok(agenda[0].id, '议程应生成 id');
  assert.deepEqual(agenda[1].kinds, ['discussion-file', 'attendee-list'], '一条议程可同时标记两种类型');
  assert.equal(agenda[1].branchDocId, 'bd-draft-1');
  assert.deepEqual(agenda[1].personIds, ['p6', 'p22'], '待讨论名单应多选');
  assert.equal(agenda[1].fromStage, '发展对象');
  assert.equal(agenda[1].toStage, '预备党员');
});

test('collectAgendaRows：议程步骤与讨论关联独立于业务类型，并保留行 id', () => {
  const agenda = collectAgendaRows([
    { id: 'ag-discussion', item: '讨论：预算安排', agendaStep: 'discussion', kinds: ['discussion-file'] },
    { id: 'ag-vote', item: '表决：预算安排', agendaStep: 'vote', discussionAgendaItemId: 'ag-discussion', kinds: [] },
  ]);

  assert.deepEqual(agenda.map(({ id, agendaStep, discussionAgendaItemId }) => ({ id, agendaStep, discussionAgendaItemId })), [
    { id: 'ag-discussion', agendaStep: 'discussion', discussionAgendaItemId: undefined },
    { id: 'ag-vote', agendaStep: 'vote', discussionAgendaItemId: 'ag-discussion' },
  ]);
  assert.deepEqual(agenda[0].kinds, ['discussion-file'], '步骤分类不得覆盖原有多选业务标签');
});

test('recordAgendaResultForActivity：记录通过后归档草案，并为名单每人创建待审批申请', async () => {
  const calls = { branchUpdates: [], memberCreates: [] };
  const db = { branchDocs: [{ id: 'bd-draft-1', status: 'draft' }], memberChangeRequests: [] };
  const adapter = {
    branchDocs: {
      async update(id, patch) {
        calls.branchUpdates.push({ id, patch });
        const updated = { ...db.branchDocs.find((d) => d.id === id), ...patch };
        db.branchDocs = db.branchDocs.map((d) => d.id === id ? updated : d);
        return updated;
      },
    },
    memberChangeRequests: {
      async create(data) {
        calls.memberCreates.push(data);
        const request = { ...data, id: `mcr-${calls.memberCreates.length}`, status: 'pending-org-approval' };
        db.memberChangeRequests = [...db.memberChangeRequests, request];
        return request;
      },
    },
  };

  const activity = {
    id: 'act-99',
    agenda: [
      {
        id: 'a1',
        item: '讨论关于 2 名发展对象转为预备党员',
        kinds: ['discussion-file', 'attendee-list'],
        branchDocId: 'bd-draft-1',
        personIds: ['p6', 'p22'],
        fromStage: '发展对象', toStage: '预备党员',
        result: null,
      },
    ],
  };

  const updated = await recordAgendaResultForActivity({
    activity,
    agendaItemId: 'a1',
    result: 'passed',
    adapter,
    db,
    actorId: 'p13',
    now: '2026-09-01T00:00:00.000Z',
  });

  assert.equal(updated.agenda[0].result, 'passed', '议程应记录通过');
  assert.equal(updated.agenda[0].recordedBy, 'p13');
  assert.deepEqual(calls.branchUpdates, [{
    id: 'bd-draft-1',
    patch: {
      status: 'archived',
      archivedAt: '2026-09-01T00:00:00.000Z',
      discussionActivityId: 'act-99',
      discussionAgendaItemId: 'a1',
    },
  }], '通过后草案应归档并回填讨论来源');
  assert.equal(calls.memberCreates.length, 2, '名单 2 人应各建一条申请');
  assert.deepEqual(calls.memberCreates.map((c) => c.personId).sort(), ['p22', 'p6']);
  assert.equal(calls.memberCreates[0].fromStage, '发展对象');
  assert.equal(calls.memberCreates[0].toStage, '预备党员');
});

test('recordAgendaResultForActivity：重复记录通过不重复建申请（幂等）', async () => {
  const calls = { memberCreates: [] };
  const db = {
    branchDocs: [],
    memberChangeRequests: [{
      id: 'mcr-1', activityId: 'act-99', agendaItemId: 'a1', personId: 'p6',
      fromStage: '发展对象', toStage: '预备党员', status: 'pending-org-approval',
    }],
  };
  const adapter = {
    branchDocs: { async update(id, patch) { return { id, ...patch }; } },
    memberChangeRequests: { async create(data) { calls.memberCreates.push(data); return { ...data, id: 'x' }; } },
  };

  await recordAgendaResultForActivity({
    activity: { id: 'act-99', agenda: [{ id: 'a1', kinds: ['attendee-list'], personIds: ['p6', 'p22'], fromStage: '发展对象', toStage: '预备党员', result: null }] },
    agendaItemId: 'a1', result: 'passed', adapter, db, actorId: 'p13',
  });

  // p6 已有申请（幂等跳过），仅 p22 新建
  assert.equal(calls.memberCreates.length, 1);
  assert.equal(calls.memberCreates[0].personId, 'p22');
});

test('记录关联表决结果：沿用讨论项的成员变更数据并把决议落在表决项', async () => {
  const calls = [];
  const db = { branchDocs: [], memberChangeRequests: [] };
  const adapter = {
    branchDocs: { async update() { throw new Error('本例不应更新文件'); } },
    memberChangeRequests: {
      async create(data) {
        calls.push(data);
        const request = { ...data, id: 'mcr-vote-step', status: 'pending-org-approval' };
        db.memberChangeRequests.push(request);
        return request;
      },
    },
  };
  const activity = {
    id: 'act-vote-step',
    agenda: [
      {
        id: 'ag-discussion', item: '讨论 p6 转为预备党员', agendaStep: 'discussion',
        kinds: ['attendee-list'], personIds: ['p6', 'p22'],
        personStages: { p6: '发展对象', p22: '积极分子' }, toStage: '预备党员',
      },
      {
        id: 'ag-vote', item: '表决 p6 转为预备党员', agendaStep: 'vote', discussionAgendaItemId: 'ag-discussion',
        kinds: [], personIds: [], personStages: { p6: '发展对象' },
      },
    ],
  };

  const updated = await recordAgendaResultForActivity({
    activity, agendaItemId: 'ag-vote', result: 'passed', adapter, db, actorId: 'p13', now: '2026-09-02T00:00:00.000Z',
  });

  assert.equal(updated.agenda[0].result, undefined, '讨论过程项不承载最终决议结果');
  assert.equal(updated.agenda[1].result, 'passed', '最终结果落在表决项');
  assert.equal(calls.length, 2, '部分填入表决项阶段时，讨论项其余成员阶段仍须参与跟办');
  assert.equal(calls[0].agendaItemId, 'ag-vote', '派生申请回指最终表决项');
  assert.deepEqual(calls.map(({ personId, fromStage, toStage }) => ({ personId, fromStage, toStage })), [
    { personId: 'p6', fromStage: '发展对象', toStage: '预备党员' },
    { personId: 'p22', fromStage: '积极分子', toStage: '预备党员' },
  ]);
});

test('recordAgendaResultForActivity：服务层拒绝给讨论项记决议且不执行后续动作', async () => {
  let writes = 0;
  const agenda = [{
    id: 'ag-discussion', item: '讨论事项', agendaStep: 'discussion',
    kinds: ['attendee-list'], personIds: ['p6'], fromStage: '发展对象', toStage: '预备党员',
  }];
  await assert.rejects(recordAgendaResultForActivity({
    activity: { id: 'act-discussion-result', agenda },
    agendaItemId: 'ag-discussion', result: 'passed',
    adapter: {
      branchDocs: { async update() { writes += 1; } },
      memberChangeRequests: { async create() { writes += 1; } },
    },
    db: { branchDocs: [], memberChangeRequests: [] },
  }), /讨论项不能直接记录决议/);
  assert.equal(writes, 0, '拒绝在任何派生写入发生前执行');
});
