// role: [工程师]+[AI]
// server/test/workforce-gate.test.mjs — L4 M2 分工调整·票决判定/合并快照（2026-09-05）
// 纯 Node 测试（无浏览器）：evaluateWorkforceVotes（2/3 出席且无异议）+ mergeWorkforceSnapshot。
// 服务链（create→表决→adopt）依赖浏览器/登录态，见沙盒外 E2E 补跑项。
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { evaluateWorkforceVotes } from '../../docs/src/services/workforce.js';
import { mergeWorkforceSnapshot, expandWorkforce } from '../../docs/src/core/work-map.js';

const ROSTER = ['p1', 'p2', 'p3', 'p4', 'p5']; // 应到支委 5 人（演示）
const v = (posArr) => posArr.map((position, i) => ({ personId: ROSTER[i], position }));

test('evaluateWorkforceVotes：4/5 表态且无异议 → 通过（2/3 门槛=4）', () => {
  const r = evaluateWorkforceVotes({ roster: ROSTER, votes: v(['agree', 'agree', 'comment', 'agree']) });
  assert.equal(r.status, 'passed');
  assert.equal(r.needed, 4);
  assert.deepEqual(r.tally, { total: 5, voted: 4, agree: 3, object: 0, comment: 1 });
});

test('evaluateWorkforceVotes：3/5 表态（不足 2/3）→ pending', () => {
  const r = evaluateWorkforceVotes({ roster: ROSTER, votes: v(['agree', 'agree', 'agree']) });
  assert.equal(r.status, 'pending');
  assert.equal(r.tally.voted, 3);
});

test('evaluateWorkforceVotes：足额但有异议 → failed', () => {
  const r = evaluateWorkforceVotes({ roster: ROSTER, votes: v(['agree', 'agree', 'agree', 'object']) });
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
