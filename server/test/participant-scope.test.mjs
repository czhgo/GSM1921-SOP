// server/test/participant-scope.test.mjs — ③ 参与人范围轴（契约 §8.3，2026-09-29 批次 275）
// 口径（WORKFLOW_BLOCK_CONTRACT §8.3，2026-09-29 更正稿）：
//   · 支部可配面**只开两字段**（均为 manifest 已有取值，不新造枚举）：
//     `mode ∈ {fixed, configurable}` ＋ `orgMode ∈ {none, organizer-deep}`，
//     落 `config.blocks.workflowBlocks.participantPolicies[blockId]`；缺省 = manifest 声明 ⇒ **默认零影响**。
//   · 消费面＝「从哪取名单」：`resolveParticipantIds(voterScope, policy, assignedIds)`
//     —— `orgMode:'none'`（含缺省）与 `resolveVoterIds` **逐字一致**；`organizer-deep` 并入**该场活动的指派层**。
//   · 领域原则（支书 2026-09-29）＝「**人是人，岗位是岗位**」：组织者/深度参与者是**项目绑定岗位**，
//     不是档案角色、不新增 tab；具体人名**不落 config**。
// 覆盖：① 净化（白名单/丢弃/空壳） ② 读侧（无覆盖 ⇒ {}） ③ 消费面（none 逐字一致 / organizer-deep 并入且确定）
//       ④ HTTP 往返回荡（净化形状 / 未写不引入该段 / blocks=null 恢复默认）
// 运行：node --test server/test/participant-scope.test.mjs（自包含 server）

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../app.js';
import { seedDatabase } from '../seed.js';
import { resolveVoterIds, resolveParticipantIds } from '../../docs/src/services/activity/vote-config.js?v=20260930j';
import { cleanParticipantPolicies } from '../../docs/src/services/branch/config-clean.js?v=20260930j';
import { getWorkflowBlockParticipantPolicy } from '../../docs/src/services/branch/branch.js?v=20260930j';

let server, base;

before(async () => {
  const app = createApp({ dbPath: ':memory:' });
  await seedDatabase(app.locals.db);
  server = app.listen(0);
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => {
  server.closeAllConnections?.();
  return new Promise((resolve) => server.close(resolve));
});

async function login(personId) {
  const res = await fetch(`${base}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ personId }),
  });
  assert.equal(res.status, 200, `登录失败 ${personId}`);
  return res.json();
}
function auth(token) {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}
async function patchConfig(token, body) {
  return fetch(`${base}/api/v1/branches/br-b1/config`, {
    method: 'PATCH', headers: auth(token), body: JSON.stringify(body),
  });
}

const BLOCK = 'branch-committee';

test('③ 净化 + 读侧：白名单收值 / 非法丢弃 / 空壳不保留 / 无覆盖 ⇒ {}', () => {
  const cleaned = cleanParticipantPolicies({
    [BLOCK]: { mode: 'configurable', orgMode: 'organizer-deep' },
    bad1: { mode: 'three-tier', orgMode: 'nope' },   // 两个值都非法 ⇒ 空壳丢弃
    bad2: { mode: 'fixed', orgMode: 'nope' },         // 只留合法字段
    '': { mode: 'fixed' },
  });
  assert.deepEqual(cleaned[BLOCK], { mode: 'configurable', orgMode: 'organizer-deep' }, '白名单取值原样落库');
  assert.equal(cleaned.bad1, undefined, '全非法 ⇒ 空壳不保留');
  assert.deepEqual(cleaned.bad2, { mode: 'fixed' }, '部分非法 ⇒ 只留合法字段');
  assert.equal(cleaned[''], undefined, '空 blockId 丢弃');
  assert.notDeepEqual(cleaned, { [BLOCK]: { mode: 'configurable' } }, '反例锁死：orgMode 必须一并保留');
  assert.deepEqual(cleanParticipantPolicies(null), {});
  assert.deepEqual(cleanParticipantPolicies([]), {});

  // 读侧：无覆盖 ⇒ {}（消费方回落 manifest；不出第二套默认）
  assert.deepEqual(getWorkflowBlockParticipantPolicy(BLOCK, null), {}, '无配置 ⇒ 无覆盖');
  assert.deepEqual(
    getWorkflowBlockParticipantPolicy(BLOCK, { workflowBlocks: { fieldPolicies: { [BLOCK]: { hiddenFieldIds: ['x'] } } } }),
    {}, '相邻段（fieldPolicies）不串味');
  assert.deepEqual(
    getWorkflowBlockParticipantPolicy(BLOCK, { workflowBlocks: { participantPolicies: { [BLOCK]: { mode: 'fixed', orgMode: 'organizer-deep' } } } }),
    { mode: 'fixed', orgMode: 'organizer-deep' }, '读到覆盖');
});

test('③ 消费面：none 与 resolveVoterIds 逐字一致；organizer-deep 确定地并入指派层', () => {
  const baseIds = resolveVoterIds('committee');
  assert.ok(baseIds.length > 0, '非空转下限：committee 名单非空（数据已加载）');

  // ① 缺省 / none ⇒ 逐字一致（默认零影响）
  assert.deepEqual(resolveParticipantIds('committee'), baseIds, '无 policy ⇒ 逐字一致');
  assert.deepEqual(resolveParticipantIds('committee', { orgMode: 'none' }, ['p13', 'x']), baseIds, 'none ⇒ 不并入指派层');
  assert.deepEqual(resolveParticipantIds('committee', { orgMode: 'organizer-deep' }, []), baseIds, 'organizer-deep 但无指派 ⇒ 一致');

  // ② organizer-deep ⇒ 并入指派层（base 在前、按入参顺序、去重、非串丢弃）
  const assigned = ['person-not-in-base', baseIds[0], '', 123, 'person-not-in-base'];
  const out = resolveParticipantIds('committee', { orgMode: 'organizer-deep' }, assigned);
  assert.deepEqual(out.slice(0, baseIds.length), baseIds, '角色全集在前、顺序不变');
  assert.ok(out.includes('person-not-in-base'), '指派层被并入');
  assert.equal(out.filter((id) => id === 'person-not-in-base').length, 1, '并入去重');
  assert.equal(out.length, baseIds.length + 1, '差集恰为指派层（baseIds[0] 已在全集、空串/非串丢弃）');
  assert.ok(!out.includes(''), '空串丢弃');
  assert.notDeepEqual(out, baseIds, '反例锁死：若并入未接线，结果会等于全集 ⇒ 本断言即红');
});

test('③ HTTP：participantPolicies 净化往返 / 未写不引入该段 / blocks=null 恢复默认', async () => {
  const { token: sec } = await login('p13');    // 现任支书
  const { token: staff } = await login('p_pc'); // 党委组织员

  const r1 = await patchConfig(sec, {
    config: {
      blocks: {
        workflowBlocks: {
          participantPolicies: {
            [BLOCK]: { mode: 'configurable', orgMode: 'organizer-deep' },
            bad: { mode: 'three-tier', orgMode: 'nope' },
          },
        },
      },
    },
  });
  assert.equal(r1.status, 200, '支书可写 workflowBlocks.participantPolicies');
  const wp1 = (await r1.json()).config.blocks.workflowBlocks;
  assert.deepEqual(wp1.participantPolicies[BLOCK], { mode: 'configurable', orgMode: 'organizer-deep' }, '净化后落库');
  assert.equal(wp1.participantPolicies.bad, undefined, '非法空壳被丢弃');
  assert.ok(!Object.prototype.hasOwnProperty.call(wp1.participantPolicies[BLOCK], 'personIds'), '不含任何具体人名字段');

  const r2 = await patchConfig(staff, { config: { blocks: { workflowBlocks: { hiddenBlockIds: [] } } } });
  assert.equal(r2.status, 200, '仅 workflowBlocks 合法');
  assert.equal((await r2.json()).config.blocks.workflowBlocks.participantPolicies, undefined, '未写则不引入该段');

  const r3 = await patchConfig(staff, { config: { blocks: null } });
  assert.equal(r3.status, 200, 'blocks=null 恢复默认');
  assert.equal((await r3.json()).config.blocks, null, 'blocks 全清');
});
