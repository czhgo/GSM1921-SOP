// role: [工程师]+[AI]
// agenda-quorum.test.mjs — AV4 正式表决硬校验（spec §3.4）红测试（fast 层，纯前端逻辑，不开服务器）：
//   支部党员大会（voteConfig.quorumCheck=true）记录「通过」前硬校验
//     (a) 出席过半数：已表态（含弃权）≥ ceil(应到/2)；(b) 赞成过半数：approve > 应到/2。
//   校验不通过抛错中止（不写 result）；弃权计入出席不计赞成；quorumCheck=false 不拦截。
//   经 recordAgendaResultForActivity 走完整校验链（与 agenda-closure-core 同入口），
//   表态数据注入 mockDB.agendaVotes —— 须与 committee-vote.js 内部同一 mockDB 实例
//   （模块缓存键含 ?v= 查询串，故此处同样带 ?v=20260901h 导入）。
// 运行：node --test server/test/agenda-quorum.test.mjs
import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mockDB } from '../../docs/src/core/domain.js?v=20260901u';
import { recordAgendaResultForActivity } from '../../docs/src/services/agenda-follow-up.js?v=20260901u';

const ACT_ID = 'act-quorum';
const AGENDA_ITEM_ID = 'a1';
const ORIGINAL_VOTES = mockDB.agendaVotes;

afterEach(() => {
  mockDB.agendaVotes = ORIGINAL_VOTES;
});

/** 应到 voterIds = p1..pN 的党员大会 fixture（formal/quorumCheck 可配） */
function makeActivity(total, { quorumCheck = true } = {}) {
  const voterIds = Array.from({ length: total }, (_, i) => `p${i + 1}`);
  return {
    id: ACT_ID,
    voteConfig: { mode: 'async', optionSet: 'formal', voterScope: 'formal-only', voterIds, quorumCheck },
    agenda: [{ id: AGENDA_ITEM_ID, item: '审议发展党员事项', host: '书记', result: null }],
  };
}

function vote(personId, position) {
  return { activityId: ACT_ID, agendaItemId: AGENDA_ITEM_ID, personId, position };
}

const BASE_CALL = { agendaItemId: AGENDA_ITEM_ID, result: 'passed', adapter: {}, db: {}, actorId: 'p13' };

test('quorumCheck=true：出席不足拦截（1/4 表态，少于 ceil(应到/2)=2），抛错且不写 result', async () => {
  mockDB.agendaVotes = [vote('p1', 'approve')];
  const activity = makeActivity(4);
  await assert.rejects(
    recordAgendaResultForActivity({ activity, ...BASE_CALL }),
    (e) => e instanceof Error
      && e.message.includes('过半数出席方可表决（当前 1/4 已表态）')
      && e.message.includes('可督促未表态党员表态'),
  );
  assert.equal(activity.agenda[0].result, null, '拦截时不得写入 result');
});

test('quorumCheck=true：出席达标但赞成不足拦截（2 approve/4，approve ≤ 应到/2）', async () => {
  mockDB.agendaVotes = [vote('p1', 'approve'), vote('p2', 'approve')];
  const activity = makeActivity(4);
  await assert.rejects(
    recordAgendaResultForActivity({ activity, ...BASE_CALL }),
    (e) => e instanceof Error
      && e.message.includes('赞成未超过应到会有表决权党员的半数（2/4）')
      && e.message.includes('可继续沟通争取赞成票'),
  );
  assert.equal(activity.agenda[0].result, null, '拦截时不得写入 result');
});

test('quorumCheck=true：弃权计入出席（不计入赞成）——abstain 使出席过线，赞成仍不足按赞成拦截', async () => {
  // 应到 5：出席需 ≥ ceil(5/2)=3。2 approve + 2 abstain → 出席 4 达标（弃权不计入则 2<3 会按出席拦截）、
  // 赞成 2 ≤ 2.5 不足（abstain 误计赞成则 4>2.5 会放行）→ 命中赞成不足分支即双向证明。
  mockDB.agendaVotes = [
    vote('p1', 'approve'), vote('p2', 'approve'),
    vote('p3', 'abstain'), vote('p4', 'abstain'),
  ];
  const activity = makeActivity(5);
  await assert.rejects(
    recordAgendaResultForActivity({ activity, ...BASE_CALL }),
    (e) => e instanceof Error
      && e.message.includes('赞成未超过')
      && !e.message.includes('过半数出席方可表决'),
  );
});

test('quorumCheck=true：出席与赞成均达标放行（2 approve + 1 abstain / 3，弃权不计赞成）', async () => {
  // 应到 3：出席需 ≥ 2、赞成需 > 1.5（≥ 2）。2 approve + 1 abstain → 出席 3 达标、赞成 2 达标。
  mockDB.agendaVotes = [
    vote('p1', 'approve'), vote('p2', 'approve'), vote('p3', 'abstain'),
  ];
  const updated = await recordAgendaResultForActivity({ activity: makeActivity(3), ...BASE_CALL });
  assert.equal(updated.agenda[0].result, 'passed', '达标应放行并记录通过');
  assert.equal(updated.agenda[0].recordedBy, 'p13');
});

test('quorumCheck=false：不拦截（无任何表态也放行）', async () => {
  mockDB.agendaVotes = [];
  const updated = await recordAgendaResultForActivity({
    activity: makeActivity(4, { quorumCheck: false }),
    ...BASE_CALL,
  });
  assert.equal(updated.agenda[0].result, 'passed', 'quorumCheck=false 不做门禁');
});
