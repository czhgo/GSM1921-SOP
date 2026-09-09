// role: [工程师]+[AI]
// server/test/resolution-followup.test.mjs — 决议「待落实」跟进子域（附录⑩ S2 R2-2，2026-09-06）
// 纯 Node 测试（无浏览器）：
//   A. buildFollowupTodoPayloads —— 待落实 → 责任人跟进待办负载派生（角色/到人映射、销项跳过、deadline 透传）
//   B. collectOverdueResolutionFollowups / buildOverdueRemindGroup —— 逾期口径（deadline < today 才算逾期；
//      到期当天=催办窗口不算逾期；已销项不计；非 passed 决议不计）
//   C. 存储闭环（mockDB 直写）：saveFollowups 落库+派生待办 → completeFollowup 销项 → reopenFollowup 恢复
// 运行：node --test server/test/resolution-followup.test.mjs
// 注意：mockDB/服务均带 ?v=20260903c 导入，保证与 services 模块缓存同一实例（见 agenda-quorum.test 头注）。
import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mockDB } from '../../docs/src/core/domain.js?v=20260909e';
import { TodoStore } from '../../docs/src/services/todo.js?v=20260909e';
import {
  buildFollowupTodoPayloads,
  saveFollowups, completeFollowup, reopenFollowup,
  collectOverdueResolutionFollowups, buildOverdueRemindGroup,
  FOLLOWUP_STATUS,
} from '../../docs/src/services/resolution-followup.js?v=20260909e';

const ORIGINAL_ACTIVITIES = mockDB.activities;
const ORIGINAL_TODOS = mockDB.todos;

afterEach(() => {
  mockDB.activities = ORIGINAL_ACTIVITIES;
  mockDB.todos = ORIGINAL_TODOS;
});

/** 通过决议 fixture（ag-1 已通过含 followups；ag-2 未通过） */
function makePassedActivity() {
  return {
    id: 'act-fu',
    title: '9月支委会',
    date: '2026-09-06',
    agenda: [{
      id: 'ag-1',
      item: '审议九月工作计划',
      result: 'passed',
      followups: [
        { id: 'fu-1', item: '制定发展计划', ownerType: 'role', ownerId: 'org-commissioner', deadline: '2026-09-10', status: FOLLOWUP_STATUS.PENDING, createdAt: '2026-09-06T08:00:00' },
        { id: 'fu-2', item: '整理待讨论名单', ownerType: 'person', ownerId: 'p3', deadline: '2026-09-20', status: FOLLOWUP_STATUS.PENDING, createdAt: '2026-09-06T08:00:00' },
        { id: 'fu-3', item: '已完成的宣传安排', ownerType: 'role', ownerId: 'prop-commissioner', deadline: '2026-09-01', status: FOLLOWUP_STATUS.COMPLETED, createdAt: '2026-09-06T08:00:00', completedAt: '2026-09-02T08:00:00' },
      ],
    }, {
      id: 'ag-2',
      item: '被否决议题',
      result: 'rejected',
      followups: [{ id: 'fu-9', item: '不应派生', ownerType: 'role', ownerId: 'disc-commissioner', deadline: '2026-09-01', status: FOLLOWUP_STATUS.PENDING, createdAt: '2026-09-06T08:00:00' }],
    }],
  };
}

// ── A. 待办负载派生（纯） ───────────────────────────────────────
test('A buildFollowupTodoPayloads：角色/到人映射正确，已销项跳过，deadline 透传', () => {
  const act = makePassedActivity();
  const payloads = buildFollowupTodoPayloads({ activity: act, agendaItem: act.agenda[0] });
  assert.equal(payloads.length, 2, 'completed 行不派生待办');

  const roleP = payloads.find((p) => p.actionData.followupId === 'fu-1');
  assert.equal(roleP.role, 'org-commissioner', '角色责任人 → 角色待办键');
  assert.equal(roleP.personId, null);
  assert.equal(roleP.deadline, '2026-09-10');

  const personP = payloads.find((p) => p.actionData.followupId === 'fu-2');
  assert.equal(personP.role, 'visitor', '到人责任人（participant）→ visitor 聚合键（与 VisitorTodoDeriver 一致）');
  assert.equal(personP.personId, 'p3');
  assert.equal(personP.actionKey, 'resolution-followup');
  assert.equal(personP.sourceType, 'activity', '复用活动生命周期（删除活动联动清待办）');
  assert.equal(personP.category, 'track');
  assert.ok(personP.title.includes('整理待讨论名单'));
});

// ── B. 逾期口径（纯） ────────────────────────────────────────────
test('B collectOverdue：deadline<today 未销项才计逾期；到期当天不算；已销项/非通过不计', () => {
  const act = {
    id: 'act-x',
    title: '逾期样例会',
    date: '2026-08-20',
    agenda: [{
      id: 'ag-1',
      item: '通过议题',
      result: 'passed',
      followups: [
        { id: 'f1', item: '逾期未办', ownerType: 'role', ownerId: 'org-commissioner', deadline: '2026-09-01', status: FOLLOWUP_STATUS.PENDING },
        { id: 'f2', item: '到期当天', ownerType: 'role', ownerId: 'prop-commissioner', deadline: '2026-09-06', status: FOLLOWUP_STATUS.PENDING },
        { id: 'f3', item: '明日到期', ownerType: 'role', ownerId: 'disc-commissioner', deadline: '2026-09-07', status: FOLLOWUP_STATUS.PENDING },
        { id: 'f4', item: '已销项逾期', ownerType: 'role', ownerId: 'org-commissioner', deadline: '2026-08-01', status: FOLLOWUP_STATUS.COMPLETED },
        { id: 'f5', item: '无时限', ownerType: 'role', ownerId: 'org-commissioner', deadline: null, status: FOLLOWUP_STATUS.PENDING },
      ],
    }],
  };
  const items = collectOverdueResolutionFollowups([act], '2026-09-06');
  assert.deepEqual(items.map((i) => i.followupId), ['f1'], '仅 f1 逾期（deadline<today 且未销项）');
  assert.equal(items[0].name.includes('逾期样例会'), true);
  assert.equal(items[0].deadline, '2026-09-01');
});

test('B buildOverdueRemindGroup：无逾期返回 null；有逾期组装书记台提醒组', () => {
  const act = makePassedActivity(); // fu-1/fu-2 均未逾期（未来时限）
  assert.equal(buildOverdueRemindGroup([act], '2026-09-06'), null, '无逾期不展示空卡');

  const act2 = { ...act, agenda: [{ ...act.agenda[0], followups: [{ id: 'fu-1', item: '制定发展计划', ownerType: 'role', ownerId: 'org-commissioner', deadline: '2026-09-01', status: FOLLOWUP_STATUS.PENDING }] }] };
  const g = buildOverdueRemindGroup([act2], '2026-09-06');
  assert.ok(g, '有逾期应生成提醒组');
  assert.equal(g.groupKey, 'secretary:resolution-followup-remind');
  assert.equal(g.actionKey, 'resolution-followup-remind');
  assert.equal(g.kind, 'remind');
  assert.equal(g.count, 1);
  assert.equal(g.items[0].name.includes('制定发展计划'), true);
});

// ── C. 存储闭环（mockDB） ───────────────────────────────────────
test('C saveFollowups→completeFollowup→reopenFollowup：落库/待办派生/销项/恢复闭环', async () => {
  mockDB.activities = [makePassedActivity()];

  // 1) 保存新待落实（整组替换：保留既有 fu-2，追加新行）
  const updated = await saveFollowups({
    activityId: 'act-fu',
    agendaItemId: 'ag-1',
    followups: [
      { item: '整理待讨论名单', ownerType: 'person', ownerId: 'p3', deadline: '2026-09-20' },
      { item: '拟定十月党课主题', ownerType: 'role', ownerId: 'prop-commissioner', deadline: '2026-09-15' },
    ],
    actorId: 'p13',
  });
  const savedItem = updated.agenda.find((i) => i.id === 'ag-1');
  assert.equal(savedItem.followups.length, 2);
  const fuA = savedItem.followups[0];
  assert.ok(fuA.id && fuA.id.startsWith('fu_'), '新行补 id');
  assert.equal(fuA.status, FOLLOWUP_STATUS.PENDING);
  assert.equal(mockDB.activities.find((a) => a.id === 'act-fu').agenda[0].followups.length, 2, '落库生效');

  // 2) 派生责任人待办（到人 p3=participant → visitor 键；角色 prop-commissioner → 角色键）
  const todos = TodoStore.getAll();
  const visitorTodo = todos.find((t) => t.actionData && t.actionData.followupId === fuA.id);
  assert.ok(visitorTodo, '到人待落实生成责任人待办');
  assert.equal(visitorTodo.role, 'visitor');
  assert.equal(visitorTodo.personId, 'p3');
  assert.equal(visitorTodo.deadline, '2026-09-20');
  const fuB = savedItem.followups[1];
  const roleTodo = todos.find((t) => t.actionData && t.actionData.followupId === fuB.id);
  assert.equal(roleTodo.role, 'prop-commissioner');
  assert.equal(roleTodo.deadline, '2026-09-15');

  // 3) 销项：议程行 completed + 责任人待办销账
  await completeFollowup({ activityId: 'act-fu', agendaItemId: 'ag-1', followupId: fuA.id, actorId: 'p13' });
  const afterDone = mockDB.activities.find((a) => a.id === 'act-fu').agenda[0];
  assert.equal(afterDone.followups.find((f) => f.id === fuA.id).status, FOLLOWUP_STATUS.COMPLETED);
  assert.equal(TodoStore.getById(visitorTodo.id).status, 'completed', '销项联动责任人待办完成');

  // 4) 恢复：回 pending 且补建责任人待办
  await reopenFollowup({ activityId: 'act-fu', agendaItemId: 'ag-1', followupId: fuA.id, actorId: 'p13' });
  const afterReopen = mockDB.activities.find((a) => a.id === 'act-fu').agenda[0];
  assert.equal(afterReopen.followups.find((f) => f.id === fuA.id).status, FOLLOWUP_STATUS.PENDING);
  const reopenedTodo = TodoStore.getAll().find((t) => t.actionData && t.actionData.followupId === fuA.id && t.status !== 'completed');
  assert.ok(reopenedTodo, '恢复后补建未销项跟进待办');
});
