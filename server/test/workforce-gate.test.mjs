// role: [工程师]+[AI]
// server/test/workforce-gate.test.mjs — L4 M2 分工调整·票决判定/合并快照
// 判据（附录⑩ S2 R2-3，2026-09-06 书记裁）：门槛 = 应到会人数超过 2/3 且无反对
//   （>2/3 出席——2/3 整界不过；反对=0——object 异议/oppose 反对同口径；弃权允许，计出席不计赞成/反对）。
// 纯 Node 测试（无浏览器）：evaluateWorkforceVotes + mergeWorkforceSnapshot。
// 服务链（create→表决→adopt）依赖浏览器/登录态，见沙盒外 E2E 补跑项。
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { evaluateWorkforceVotes } from '../../docs/src/services/workforce.js?v=20260908d';
import { mergeWorkforceSnapshot, expandWorkforce } from '../../docs/src/core/work-map.js?v=20260908d';

const ROSTER = ['p1', 'p2', 'p3', 'p4', 'p5']; // 应到支委 5 人（演示）
const v = (posArr) => posArr.map((position, i) => ({ personId: ROSTER[i], position }));
const vv = (roster) => (posArr) => posArr.map((position, i) => ({ personId: roster[i], position }));

test('evaluateWorkforceVotes：4/5 出席且无反对 → 通过（>2/3 出席=4）', () => {
  const r = evaluateWorkforceVotes({ roster: ROSTER, votes: v(['agree', 'agree', 'comment', 'agree']) });
  assert.equal(r.status, 'passed');
  assert.equal(r.needed, 4);
  assert.deepEqual(r.tally, { total: 5, voted: 4, agree: 3, object: 0, comment: 1 });
});

test('evaluateWorkforceVotes：3/5 出席（不足 >2/3）→ pending', () => {
  const r = evaluateWorkforceVotes({ roster: ROSTER, votes: v(['agree', 'agree', 'agree']) });
  assert.equal(r.status, 'pending');
  assert.equal(r.tally.voted, 3);
  assert.equal(r.needed, 4);
});

test('evaluateWorkforceVotes：2/3 整界不过——应到 3 出席 2（=2/3）→ pending', () => {
  const r3 = ['p1', 'p2', 'p3'];
  const r = evaluateWorkforceVotes({ roster: r3, votes: vv(r3)(['agree', 'agree']) });
  assert.equal(r.status, 'pending', '2/3 整界（2/3）不得视为超过 2/3');
  assert.equal(r.needed, 3);
});

test('evaluateWorkforceVotes：超过 2/3 通过——应到 3 全出席 → passed', () => {
  const r3 = ['p1', 'p2', 'p3'];
  const r = evaluateWorkforceVotes({ roster: r3, votes: vv(r3)(['agree', 'comment', 'agree']) });
  assert.equal(r.status, 'passed');
  assert.equal(r.needed, 3);
});

test('evaluateWorkforceVotes：2/3 整界不过——应到 6 出席 4（=2/3）→ pending', () => {
  const r6 = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6'];
  const r = evaluateWorkforceVotes({ roster: r6, votes: vv(r6)(['agree', 'agree', 'agree', 'comment']) });
  assert.equal(r.status, 'pending', '4/6 恰为 2/3，未严格超过');
  assert.equal(r.needed, 5);
});

test('evaluateWorkforceVotes：超过 2/3 通过——应到 6 出席 5 → passed', () => {
  const r6 = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6'];
  const r = evaluateWorkforceVotes({ roster: r6, votes: vv(r6)(['agree', 'agree', 'agree', 'comment', 'agree']) });
  assert.equal(r.status, 'passed');
  assert.equal(r.needed, 5);
});

test('evaluateWorkforceVotes：足额但有异议（object）→ failed', () => {
  const r = evaluateWorkforceVotes({ roster: ROSTER, votes: v(['agree', 'agree', 'agree', 'object']) });
  assert.equal(r.status, 'failed');
  assert.equal(r.tally.object, 1);
});

test('evaluateWorkforceVotes：反对=1（正式 oppose 口径）→ failed', () => {
  const r = evaluateWorkforceVotes({ roster: ROSTER, votes: v(['approve', 'oppose', 'approve', 'approve']) });
  assert.equal(r.status, 'failed', '反对 1 即不通过（反对=0 门槛）');
  assert.equal(r.tally.object, 1, 'oppose 归入反对口径统计');
});

test('evaluateWorkforceVotes：弃权允许——出席过线且无反对 → passed（弃权不计赞成）', () => {
  // 应到 5：3 agree + 1 abstain = 出席 4（>2/3）、反对 0 → 通过；弃权不得计入赞成（agree 保持 3）
  const r = evaluateWorkforceVotes({ roster: ROSTER, votes: v(['agree', 'agree', 'abstain', 'agree']) });
  assert.equal(r.status, 'passed', '弃权允许：出席足额且无反对即通过');
  assert.deepEqual(r.tally, { total: 5, voted: 4, agree: 3, object: 0, comment: 0 });
});

test('evaluateWorkforceVotes：弃权不否决但反对仍否决 → failed', () => {
  const r = evaluateWorkforceVotes({ roster: ROSTER, votes: v(['agree', 'abstain', 'agree', 'object']) });
  assert.equal(r.status, 'failed');
  assert.equal(r.tally.object, 1);
});

test('evaluateWorkforceVotes：应到外人员/重复人不计票', () => {
  const votes = [
    { personId: 'u_exec', position: 'agree' }, // 系统伪用户不计
    { personId: 'p1', position: 'agree' },
    { personId: 'p1', position: 'object' },    // 重复人取首条，不新增
    { personId: 'p2', position: 'agree' },
  ];
  const r = evaluateWorkforceVotes({ roster: ROSTER, votes });
  assert.equal(r.tally.voted, 2);
  assert.equal(r.tally.object, 0);
  assert.equal(r.status, 'pending');
});

test('mergeWorkforceSnapshot：改派清单只覆盖目标模块，其余保持', () => {
  const base = expandWorkforce(null); // 全缺省（11 模块 role owner）
  const next = mergeWorkforceSnapshot(base, [
    { moduleId: 'develop-party-member', to: { ownerType: 'person', ownerId: 'p3' } },
    { moduleId: 'taskforce', to: { ownerType: 'role', ownerId: 'secretary' } },
  ]);
  assert.deepEqual(next['develop-party-member'], { ownerType: 'person', ownerId: 'p3' });
  assert.deepEqual(next['taskforce'], { ownerType: 'role', ownerId: 'secretary' });
  assert.equal(next['three-meetings'].ownerId, 'secretary'); // 未涉及模块原样
  assert.equal(Object.keys(next).length, 11);
});
