// agenda-relations.test.mjs — 活动议程步骤、讨论/表决关联及表态目标的共同校验
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { agendaDecisionSource, validateAgendaStructure, validateAgendaVoteTarget } from '../../docs/src/services/activity/agenda-relations.js?v=20261017g';

test('兼容未标步骤的历史议程与普通议题表态', () => {
  const agenda = [{ item: '历史议题' }, { id: 'ag-current', item: '普通议题' }];
  assert.deepEqual(validateAgendaStructure(agenda), { ok: true });
  assert.deepEqual(validateAgendaVoteTarget(agenda, 'ag-current'), { ok: true, item: agenda[1] });
  assert.equal(validateAgendaVoteTarget(agenda, 'missing').ok, false);
});

test('同一活动内按顺序关联讨论项和表决项', () => {
  const agenda = [
    { id: 'ag-discuss', item: '讨论事项', agendaStep: 'discussion' },
    { id: 'ag-vote', item: '表决事项', agendaStep: 'vote', discussionAgendaItemId: 'ag-discuss' },
  ];
  assert.deepEqual(validateAgendaStructure(agenda), { ok: true });
  assert.equal(validateAgendaVoteTarget(agenda, 'ag-discuss').ok, false, '讨论项本身不可投票');
  assert.deepEqual(validateAgendaVoteTarget(agenda, 'ag-vote'), { ok: true, item: agenda[1] });
});

test('拒绝孤立、倒序、错误类型和重复 id 的议程关系', () => {
  const cases = [
    [{ id: 'ag-vote', agendaStep: 'vote' }],
    [
      { id: 'ag-vote', agendaStep: 'vote', discussionAgendaItemId: 'ag-discuss' },
      { id: 'ag-discuss', agendaStep: 'discussion' },
    ],
    [
      { id: 'ag-discuss', agendaStep: 'discussion' },
      { id: 'ag-vote', agendaStep: 'vote', discussionAgendaItemId: 'outside-activity' },
    ],
    [{ id: 'ag-unknown', agendaStep: 'sync' }],
    [{ id: 'ag-duplicate' }, { id: 'ag-duplicate' }],
  ];
  for (const agenda of cases) assert.equal(validateAgendaStructure(agenda).ok, false);
});

test('显式议程关系必须使用规范字符串步骤、ID 和关联引用', () => {
  const malformed = [
    [{ id: 'discussion', agendaStep: ' discussion ' }],
    [{ id: 'discussion', agendaStep: 1 }],
    [{ id: ' discussion ', agendaStep: 'discussion' }],
    [{ id: 1, agendaStep: 'discussion' }],
    [
      { id: 'discussion', agendaStep: 'discussion' },
      { id: 'vote', agendaStep: 'vote', discussionAgendaItemId: ' discussion' },
    ],
    [
      { id: 'discussion', agendaStep: 'discussion' },
      { id: 'vote', agendaStep: 'vote', discussionAgendaItemId: 1 },
    ],
  ];
  for (const agenda of malformed) assert.equal(validateAgendaStructure(agenda).ok, false, JSON.stringify(agenda));
});

test('显式讨论项不允许携带会议决议结果或结果留痕', () => {
  for (const outcome of [
    { result: 'passed' },
    { personResults: [{ personId: 'p1', passed: true }] },
    { recordedBy: 'p13' },
    { recordedAt: '2026-10-15T00:00:00.000Z' },
    { reportToPartyMeeting: true },
  ]) {
    assert.equal(validateAgendaStructure([{ id: 'discussion', agendaStep: 'discussion', ...outcome }]).ok, false,
      JSON.stringify(outcome));
  }
  assert.deepEqual(validateAgendaStructure([
    { id: 'discussion', agendaStep: 'discussion', result: null },
    { id: 'vote', agendaStep: 'vote', discussionAgendaItemId: 'discussion', result: 'passed' },
  ]), { ok: true }, '空结果兼容且最终结果可保留在表决项');
});

test('表态目标必须是规范字符串 ID，不能靠去空格或类型转换命中', () => {
  const agenda = [{ id: 'ag-vote', item: '普通表决议题' }];
  assert.equal(validateAgendaVoteTarget(agenda, ' ag-vote ').ok, false);
  assert.equal(validateAgendaVoteTarget([{ id: 1 }], 1).ok, false);
  assert.equal(validateAgendaVoteTarget([{ id: 1 }], '1').ok, false);
  assert.equal(validateAgendaVoteTarget(agenda, 'ag-vote').ok, true);
});

test('表态目标必须在本活动议程中且不能指向显式讨论项', () => {
  const agenda = [{ id: 'ag-discuss', agendaStep: 'discussion' }];
  assert.equal(validateAgendaVoteTarget(agenda, 'from-other-activity').ok, false);
  assert.equal(validateAgendaVoteTarget(agenda, 'ag-discuss').ok, false);
});

test('表决结果沿用关联讨论项的既有业务回指，表决项自身字段优先', () => {
  const discussion = {
    id: 'ag-discuss', agendaStep: 'discussion', item: '讨论发展对象',
    kinds: ['attendee-list'], personIds: ['p6', 'p22'], personStages: { p6: '发展对象', p22: '积极分子' }, toStage: '预备党员',
  };
  const vote = {
    id: 'ag-vote', agendaStep: 'vote', item: '表决发展对象',
    discussionAgendaItemId: 'ag-discuss', kinds: [], personIds: [], personStages: { p6: '发展对象' },
  };
  const source = agendaDecisionSource([discussion, vote], vote);
  assert.equal(source.id, 'ag-vote', '结果仍落在表决项');
  assert.deepEqual(source.kinds, ['attendee-list']);
  assert.deepEqual(source.personIds, ['p6', 'p22']);
  assert.deepEqual(source.personStages, { p6: '发展对象', p22: '积极分子' }, '表决项只覆盖自己有值的阶段，其他沿用讨论项快照');
  assert.equal(source.toStage, '预备党员');
});
