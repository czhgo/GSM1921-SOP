// server/test/permission-gate.test.mjs — 资源级写角色门（P3 上线前收紧，2026-09-03）
// design §7 登记项落地验证：
//   branches/appointmentRecords/users 写 → 仅 party-staff（403 for 支部成员）
//   reviewRequests POST → 本支部支委层（同支部）；PATCH/DELETE → party-staff（防自批）
//   activities 写门（2026-09-13 dogfood 权限专项）：支委层可写、组长限党小组会/主题党日、其余 403
//
// 自包含：createApp(:memory:) + seedDatabase；HTTP 直连（无浏览器）。

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../app.js';
import { seedDatabase } from '../seed.js';

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

/** 登录拿 token + user（user 含 role/branchId） */
async function login(personId) {
  const res = await fetch(`${base}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ personId }),
  });
  assert.equal(res.status, 200, `登录失败 ${personId}`);
  return res.json();
}

function authHeaders(token) {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

test('资源写角色门：治理档案写仅限 party-staff，支部成员一律 403', async () => {
  const { token: secToken } = await login('p13');   // 储子禾 书记（支部 br-b1）
  const { token: pcToken } = await login('p_pc');   // 党委组织员

  // 支部成员建支部 → 403
  const r1 = await fetch(`${base}/api/v1/branches`, {
    method: 'POST', headers: authHeaders(secToken),
    body: JSON.stringify({ name: '越权支部' }),
  });
  assert.equal(r1.status, 403, '支部成员不得创建支部');
  // 支部成员改任命记录 → 403
  const r2 = await fetch(`${base}/api/v1/appointmentRecords/x-1`, {
    method: 'PATCH', headers: authHeaders(secToken), body: JSON.stringify({ to: 'x' }),
  });
  assert.equal(r2.status, 403, '支部成员不得写任期记录');
  // 支部成员改 users（自封角色）→ 403
  const r3 = await fetch(`${base}/api/v1/users/p13`, {
    method: 'PATCH', headers: authHeaders(secToken), body: JSON.stringify({ role: 'secretary' }),
  });
  assert.equal(r3.status, 403, '支部成员不得直接改写用户角色');
  // 党委组织员建支部 → 201
  const r4 = await fetch(`${base}/api/v1/branches`, {
    method: 'POST', headers: authHeaders(pcToken),
    body: JSON.stringify({ name: '党委权限测试支部', type: '测试' }),
  });
  assert.equal(r4.status, 201, '党委组织员可创建支部');
});

test('reviewRequests：本支部支委可提交，党委可审批，异支部/非支委/普通成员被拒', async () => {
  const { token: secToken } = await login('p13');    // br-b1 书记
  const { token: pcToken } = await login('p_pc');    // 党委组织员
  const { token: p5Token } = await login('p5');      // 普通成员（非支委）

  // ① 本支部书记提交 → 201（payload 镜像 services/review-request.js：status/createdAt 由服务层补）
  const create = await fetch(`${base}/api/v1/reviewRequests`, {
    method: 'POST', headers: authHeaders(secToken),
    body: JSON.stringify({ branchId: 'br-b1', type: 'develop-node', title: '权限门测试上报', content: '内容', status: 'pending', submittedBy: 'p13', createdAt: new Date().toISOString() }),
  });
  assert.equal(create.status, 201, '本支部支委层可提交上报');
  const row = await create.json();
  assert.ok(row.id, '返回记录含 id');
  assert.equal(row.status, 'pending');

  // ② 支部书记不得自己审批（PATCH）→ 403（防自批）
  const selfApprove = await fetch(`${base}/api/v1/reviewRequests/${row.id}`, {
    method: 'PATCH', headers: authHeaders(secToken),
    body: JSON.stringify({ status: 'approved', decidedBy: 'p13' }),
  });
  assert.equal(selfApprove.status, 403, '支部书记不得自批上报');

  // ③ 普通成员提交 → 403（非支委）
  const memberSubmit = await fetch(`${base}/api/v1/reviewRequests`, {
    method: 'POST', headers: authHeaders(p5Token),
    body: JSON.stringify({ branchId: 'br-b1', type: 'activity-report', title: '普通成员越权上报', content: 'x' }),
  });
  assert.equal(memberSubmit.status, 403, '普通成员不得提交上报');

  // ④ 党委组织员审批 → 200（状态闭环）
  const approve = await fetch(`${base}/api/v1/reviewRequests/${row.id}`, {
    method: 'PATCH', headers: authHeaders(pcToken),
    body: JSON.stringify({ status: 'approved', decidedBy: 'p_pc', decidedAt: new Date().toISOString(), decisionNote: '同意' }),
  });
  assert.equal(approve.status, 200, '党委组织员可审批上报');
  const approved = await approve.json();
  assert.equal(approved.status, 'approved');
});

// dogfood 权限专项（2026-09-13）：activities 已设写门——非支委层一律 403（此前「未设门＝登录即可创建」，
// 真机探针实测普通成员可 POST 建「支委会」活动、可 PATCH 篡改 voteConfig.voterIds）；组长限党小组会/主题党日。
test('活动写门：支委层可建；普通成员 403；组长限党小组会/主题党日；未登录 401', async () => {
  const { token } = await login('p13'); // 书记（支委层）
  const ok = await fetch(`${base}/api/v1/activities`, {
    method: 'POST', headers: authHeaders(token),
    body: JSON.stringify({ title: '权限门回归活动', date: '2026-09-10', type: '主题党日' }),
  });
  assert.equal(ok.status, 201, '书记（支委层）可创建活动');

  const { token: partToken } = await login('p3'); // 普通成员
  const memberTry = await fetch(`${base}/api/v1/activities`, {
    method: 'POST', headers: authHeaders(partToken),
    body: JSON.stringify({ title: '普通成员越权建支部党员大会', date: '2026-09-20', type: '支部党员大会' }),
  });
  assert.equal(memberTry.status, 403, '普通成员不得创建活动');

  const memberPatch = await fetch(`${base}/api/v1/activities/act-31`, {
    method: 'PATCH', headers: authHeaders(partToken),
    body: JSON.stringify({ voteConfig: { optionSet: 'formal', ballotMode: 'anonymous', voterIds: ['p3'] } }),
  });
  assert.equal(memberPatch.status, 403, '普通成员不得篡改活动（含表决名单）');

  const { token: leaderToken } = await login('p1'); // 党小组组长
  const leaderBad = await fetch(`${base}/api/v1/activities`, {
    method: 'POST', headers: authHeaders(leaderToken),
    body: JSON.stringify({ title: '组长越权建支委会', date: '2026-09-20', type: '支委会' }),
  });
  assert.equal(leaderBad.status, 403, '组长不得创建支委会（限党小组会/主题党日）');
  const leaderOk = await fetch(`${base}/api/v1/activities`, {
    method: 'POST', headers: authHeaders(leaderToken),
    body: JSON.stringify({ title: '组长建党小组会', date: '2026-09-20', type: '党小组会' }),
  });
  assert.equal(leaderOk.status, 201, '组长可创建党小组会');

  const anon = await fetch(`${base}/api/v1/activities`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: 'x' }),
  });
  assert.equal(anon.status, 401, '未登录仍被拒');
});

// C-2 方案 B（2026-09-11 书记批）：名册成员变更确认链「书记阶段写入」语义端点权限边界
// POST /api/v1/members/:id/develop-stage —— 仅书记（SECRETARY_ROLES）+ 同支部；字段仅 developStage。
test('成员变更确认链阶段端点：书记/副书记本支部 200 且落库；非书记侧 403；跨支部 403；白名单/枚举 400', async () => {
  const { token: secToken } = await login('p13');      // br-b1 书记
  const { token: depToken } = await login('p14');      // br-b1 副书记（副书同权 2026-09-11）
  const { token: orgToken } = await login('p11');      // br-b1 组织委员（非书记侧）
  const { token: partToken } = await login('p3');      // br-b1 普通成员
  const { token: pcToken } = await login('p_pc');      // 党委组织员（组织级，非书记侧）
  const getStage = async (uid) => {
    const res = await fetch(`${base}/api/v1/users`, { headers: authHeaders(secToken) });
    return (await res.json()).find((u) => u.id === uid)?.developStage;
  };

  // ① 书记本支部推进 p1 阶段 → 200 + 实际落库
  const ok = await fetch(`${base}/api/v1/members/p1/develop-stage`, {
    method: 'POST', headers: authHeaders(secToken),
    body: JSON.stringify({ developStage: '预备党员' }),
  });
  assert.equal(ok.status, 200, '书记本支部可推进阶段');
  const okRow = await ok.json();
  assert.equal(okRow.id, 'p1');
  assert.equal(okRow.developStage, '预备党员');
  assert.equal(okRow.name, '罗文杰', '返回完整成员对象（未提供字段保留）');
  assert.equal(await getStage('p1'), '预备党员', 'users.developStage 实际变更落库');

  // ①b 副书记本支部推进 p2 阶段 → 200 + 实际落库（副书同权）
  const depOk = await fetch(`${base}/api/v1/members/p2/develop-stage`, {
    method: 'POST', headers: authHeaders(depToken),
    body: JSON.stringify({ developStage: '预备党员' }),
  });
  assert.equal(depOk.status, 200, '副书记本支部可推进阶段（副书同权）');
  assert.equal((await depOk.json()).developStage, '预备党员');
  assert.equal(await getStage('p2'), '预备党员', '副书记推进实际落库');

  // ② 非书记侧（组织委员 / 普通成员 / 党委组织员）→ 403（requireRole(SECRETARY_AND_DEPUTY_ROLES)）
  const org = await fetch(`${base}/api/v1/members/p1/develop-stage`, {
    method: 'POST', headers: authHeaders(orgToken), body: JSON.stringify({ developStage: '正式党员' }),
  });
  assert.equal(org.status, 403, '组织委员不得走书记侧阶段端点');
  const part = await fetch(`${base}/api/v1/members/p1/develop-stage`, {
    method: 'POST', headers: authHeaders(partToken), body: JSON.stringify({ developStage: '正式党员' }),
  });
  assert.equal(part.status, 403, '普通成员不得走书记侧阶段端点');
  const pc = await fetch(`${base}/api/v1/members/p1/develop-stage`, {
    method: 'POST', headers: authHeaders(pcToken), body: JSON.stringify({ developStage: '正式党员' }),
  });
  assert.equal(pc.status, 403, '党委组织员非书记侧亦 403（不扩大越权面）');
  assert.equal(await getStage('p1'), '预备党员', '越权请求未改动落库值');

  // ③ 跨支部：党委组织员建 br-x + 成员 p70 归属 br-x；br-b1 书记写 p70 → 403
  await fetch(`${base}/api/v1/branches`, {
    method: 'POST', headers: authHeaders(pcToken),
    body: JSON.stringify({ name: '跨支部校验测试支部', type: '测试' }),
  });
  await fetch(`${base}/api/v1/users`, {
    method: 'POST', headers: authHeaders(pcToken),
    body: JSON.stringify({ id: 'p70', name: '跨支部成员', developStage: '积极分子', role: 'participant', branchId: 'br-x' }),
  });
  const cross = await fetch(`${base}/api/v1/members/p70/develop-stage`, {
    method: 'POST', headers: authHeaders(secToken), body: JSON.stringify({ developStage: '预备党员' }),
  });
  assert.equal(cross.status, 403, '书记不得推进异支部成员阶段');
  assert.match((await cross.json()).error, /本支部/);
  const crossDep = await fetch(`${base}/api/v1/members/p70/develop-stage`, {
    method: 'POST', headers: authHeaders(depToken), body: JSON.stringify({ developStage: '预备党员' }),
  });
  assert.equal(crossDep.status, 403, '副书记不得推进异支部成员阶段');

  // ④ 字段白名单硬挡：含 role/branchId → 400（书记/副书记同挡）
  const roleInj = await fetch(`${base}/api/v1/members/p1/develop-stage`, {
    method: 'POST', headers: authHeaders(secToken),
    body: JSON.stringify({ developStage: '正式党员', role: 'secretary' }),
  });
  assert.equal(roleInj.status, 400, '含治理字段 role 一律 400');
  const brInj = await fetch(`${base}/api/v1/members/p1/develop-stage`, {
    method: 'POST', headers: authHeaders(secToken),
    body: JSON.stringify({ developStage: '正式党员', branchId: 'br-x' }),
  });
  assert.equal(brInj.status, 400, '含治理字段 branchId 一律 400');
  const depInj = await fetch(`${base}/api/v1/members/p1/develop-stage`, {
    method: 'POST', headers: authHeaders(depToken),
    body: JSON.stringify({ developStage: '正式党员', role: 'secretary' }),
  });
  assert.equal(depInj.status, 400, '副书记注入 role 亦 400');

  // ⑤ 枚举外阶段 → 400；成员不存在 → 404（书记 token 已过门）
  const badStage = await fetch(`${base}/api/v1/members/p1/develop-stage`, {
    method: 'POST', headers: authHeaders(secToken), body: JSON.stringify({ developStage: '神秘阶段' }),
  });
  assert.equal(badStage.status, 400);
  const ghost = await fetch(`${base}/api/v1/members/p_ghost/develop-stage`, {
    method: 'POST', headers: authHeaders(secToken), body: JSON.stringify({ developStage: '预备党员' }),
  });
  assert.equal(ghost.status, 404);
});

// R-10（2026-09-11 书记裁定）：名册三条写链语义端点权限边界
// POST /members/:id/residence-status（书记/副书记副书同权）· PATCH /members/:id/profile + POST /members（组织委员）
// · POST /members/:id/transfer-out（组织委员发起 / 书记·副书记确认）——均 + 同支部 + 字段白名单。
test('R-10 名册写链端点：授权 200 落库；越权 403；注入 400；枚举/空字段 400；成员不存在 404；跨支部 403', async () => {
  const { token: secToken } = await login('p13');   // br-b1 书记
  const { token: depToken } = await login('p14');   // br-b1 副书记（副书同权）
  const { token: orgToken } = await login('p11');   // br-b1 组织委员
  const { token: pcToken } = await login('p_pc');   // 党委组织员（组织级）
  const { token: partToken } = await login('p1');   // br-b1 普通成员（党小组组长）
  const usersOf = async (t) => (await fetch(`${base}/api/v1/users`, { headers: authHeaders(t) })).json();

  // ① 组织委员新增（POST /members）→ 201 落库 + 强制归本支部 + 默认普通成员角色
  const created = await fetch(`${base}/api/v1/members`, {
    method: 'POST', headers: authHeaders(orgToken),
    body: JSON.stringify({ id: 'p80', name: 'R10新增成员', partyGroup: '第一党小组', developStage: '积极分子' }),
  });
  assert.equal(created.status, 201, '组织委员可新增成员');
  const cRow = await created.json();
  assert.equal(cRow.branchId, 'br-b1', '强制归操作人支部');
  assert.equal(cRow.role, 'participant', '默认普通成员角色');
  assert.equal((await usersOf(orgToken)).find(u => u.id === 'p80')?.name, 'R10新增成员', '新增落库');

  // ② 组织委员名册行内改字段（PATCH /members/:id/profile）→ 200 落库
  const prof = await fetch(`${base}/api/v1/members/p80/profile`, {
    method: 'PATCH', headers: authHeaders(orgToken), body: JSON.stringify({ name: 'R10成员改', partyGroup: '第三党小组' }),
  });
  assert.equal(prof.status, 200, '组织委员可改名册档案');
  const pRow = (await usersOf(orgToken)).find(u => u.id === 'p80');
  assert.equal(pRow.name, 'R10成员改');
  assert.equal(pRow.partyGroup, '第三党小组');

  // ③ 组织委员行内维护在册属性（roster 即时字段）→ 200 落库
  const resInline = await fetch(`${base}/api/v1/members/p80/profile`, {
    method: 'PATCH', headers: authHeaders(orgToken), body: JSON.stringify({ residenceStatus: '滞留', residenceNote: '备注' }),
  });
  assert.equal(resInline.status, 200);
  assert.equal((await usersOf(orgToken)).find(u => u.id === 'p80').residenceStatus, '滞留');

  // ④ 书记在册状态镜像（POST /members/:id/residence-status）→ 200 落库
  const mirror = await fetch(`${base}/api/v1/members/p1/residence-status`, {
    method: 'POST', headers: authHeaders(secToken),
    body: JSON.stringify({ residenceStatus: '滞留', residenceNote: '交换', residenceHistory: [{ from: '在校', to: '滞留', updatedBy: 'p13', updatedAt: new Date().toISOString() }] }),
  });
  assert.equal(mirror.status, 200, '书记可写在册状态镜像');
  assert.equal((await usersOf(secToken)).find(u => u.id === 'p1').residenceStatus, '滞留', '在册镜像落库');

  // ④b 副书记在册状态镜像（POST /members/:id/residence-status）→ 200 落库（副书同权）
  const mirrorDep = await fetch(`${base}/api/v1/members/p2/residence-status`, {
    method: 'POST', headers: authHeaders(depToken),
    body: JSON.stringify({ residenceStatus: '滞留', residenceNote: '副书记核录' }),
  });
  assert.equal(mirrorDep.status, 200, '副书记可写在册状态镜像（副书同权）');
  assert.equal((await usersOf(depToken)).find(u => u.id === 'p2').residenceStatus, '滞留', '副书记在册镜像落库');

  // ⑤ 移出软标记：组织委员发起 200（行保留不匿名）
  const outOrg = await fetch(`${base}/api/v1/members/p80/transfer-out`, { method: 'POST', headers: authHeaders(orgToken), body: '{}' });
  assert.equal(outOrg.status, 200, '组织委员可发起移出');
  const oRow = (await usersOf(orgToken)).find(u => u.id === 'p80');
  assert.equal(oRow.transferOut, true, 'users 行打转出标记');
  assert.equal(oRow.name, 'R10成员改', '软标记保留姓名（不匿名）');

  // ⑤b 移出软标记：副书记确认 200（副书同权；行保留不匿名）
  const depCreated = await fetch(`${base}/api/v1/members`, {
    method: 'POST', headers: authHeaders(orgToken),
    body: JSON.stringify({ id: 'p82', name: 'R10副书记移出', partyGroup: '第一党小组' }),
  });
  assert.equal(depCreated.status, 201, '组织委员新增待移出成员');
  const outDep = await fetch(`${base}/api/v1/members/p82/transfer-out`, { method: 'POST', headers: authHeaders(depToken), body: '{}' });
  assert.equal(outDep.status, 200, '副书记可确认移出（副书同权）');
  const oDepRow = (await usersOf(depToken)).find(u => u.id === 'p82');
  assert.equal(oDepRow.transferOut, true, 'users 行打转出标记');
  assert.equal(oDepRow.name, 'R10副书记移出', '软标记保留姓名（不匿名）');

  // ⑥ 越权 403
  const denyPart = await fetch(`${base}/api/v1/members/p1/profile`, {
    method: 'PATCH', headers: authHeaders(partToken), body: JSON.stringify({ partyGroup: '第一党小组' }),
  });
  assert.equal(denyPart.status, 403, '普通成员不得维护名册');
  const denyPc = await fetch(`${base}/api/v1/members/p1/profile`, {
    method: 'PATCH', headers: authHeaders(pcToken), body: JSON.stringify({ partyGroup: '第一党小组' }),
  });
  assert.equal(denyPc.status, 403, '党委组织员非组织委员 403（不扩大越权面）');
  const denyRes = await fetch(`${base}/api/v1/members/p1/residence-status`, {
    method: 'POST', headers: authHeaders(orgToken), body: JSON.stringify({ residenceStatus: '在校' }),
  });
  assert.equal(denyRes.status, 403, '组织委员不得走书记在册镜像端点');
  const denyCreate = await fetch(`${base}/api/v1/members`, {
    method: 'POST', headers: authHeaders(secToken), body: JSON.stringify({ name: '书记越权新增' }),
  });
  assert.equal(denyCreate.status, 403, '书记非组织委员不得走名册新增端点');
  const denyOut = await fetch(`${base}/api/v1/members/p1/transfer-out`, { method: 'POST', headers: authHeaders(partToken), body: '{}' });
  assert.equal(denyOut.status, 403, '普通成员不得移出');
  const denyDepProf = await fetch(`${base}/api/v1/members/p1/profile`, {
    method: 'PATCH', headers: authHeaders(depToken), body: JSON.stringify({ partyGroup: '第一党小组' }),
  });
  assert.equal(denyDepProf.status, 403, '副书记非组织委员不得走名册档案端点（组织委员口径不变）');
  const denyDepCreate = await fetch(`${base}/api/v1/members`, {
    method: 'POST', headers: authHeaders(depToken), body: JSON.stringify({ name: '副书记越权新增' }),
  });
  assert.equal(denyDepCreate.status, 403, '副书记非组织委员不得走名册新增端点（组织委员口径不变）');

  // ⑦ 注入字段 400（role/branchId；profile 另拒 developStage——阶段唯一写位 = develop-stage）
  const injectCases = [
    ['profile role', await fetch(`${base}/api/v1/members/p1/profile`, { method: 'PATCH', headers: authHeaders(orgToken), body: JSON.stringify({ role: 'secretary' }) })],
    ['profile branchId', await fetch(`${base}/api/v1/members/p1/profile`, { method: 'PATCH', headers: authHeaders(orgToken), body: JSON.stringify({ branchId: 'br-x' }) })],
    ['profile developStage', await fetch(`${base}/api/v1/members/p1/profile`, { method: 'PATCH', headers: authHeaders(orgToken), body: JSON.stringify({ developStage: '预备党员' }) })],
    ['create role', await fetch(`${base}/api/v1/members`, { method: 'POST', headers: authHeaders(orgToken), body: JSON.stringify({ name: 'x', role: 'secretary' }) })],
    ['residence role', await fetch(`${base}/api/v1/members/p1/residence-status`, { method: 'POST', headers: authHeaders(secToken), body: JSON.stringify({ residenceStatus: '在校', role: 'secretary' }) })],
    ['residence role (deputy)', await fetch(`${base}/api/v1/members/p1/residence-status`, { method: 'POST', headers: authHeaders(depToken), body: JSON.stringify({ residenceStatus: '在校', role: 'secretary' }) })],
  ];
  for (const [label, res] of injectCases) assert.equal(res.status, 400, `${label} 注入应 400`);

  // ⑧ 枚举非法 / 空字段 / 成员不存在
  const badRes = await fetch(`${base}/api/v1/members/p1/residence-status`, { method: 'POST', headers: authHeaders(secToken), body: JSON.stringify({ residenceStatus: '神秘状态' }) });
  assert.equal(badRes.status, 400, '在册枚举非法 400');
  const emptyProf = await fetch(`${base}/api/v1/members/p1/profile`, { method: 'PATCH', headers: authHeaders(orgToken), body: '{}' });
  assert.equal(emptyProf.status, 400, '无可更新字段 400');
  const ghost = await fetch(`${base}/api/v1/members/p_ghost2/profile`, { method: 'PATCH', headers: authHeaders(orgToken), body: JSON.stringify({ name: 'x' }) });
  assert.equal(ghost.status, 404, '成员不存在 404');

  // ⑨ 跨支部 403：党委组织员建 br-x 成员 p81 → br-b1 组织委员/书记写均 403
  await fetch(`${base}/api/v1/users`, {
    method: 'POST', headers: authHeaders(pcToken),
    body: JSON.stringify({ id: 'p81', name: '跨支部成员81', role: 'participant', branchId: 'br-x' }),
  });
  const crossProf = await fetch(`${base}/api/v1/members/p81/profile`, { method: 'PATCH', headers: authHeaders(orgToken), body: JSON.stringify({ name: 'x' }) });
  assert.equal(crossProf.status, 403, '组织委员不得改异支部成员档案');
  const crossRes = await fetch(`${base}/api/v1/members/p81/residence-status`, { method: 'POST', headers: authHeaders(secToken), body: JSON.stringify({ residenceStatus: '在校' }) });
  assert.equal(crossRes.status, 403, '书记不得改异支部成员在册');
  const crossOut = await fetch(`${base}/api/v1/members/p81/transfer-out`, { method: 'POST', headers: authHeaders(orgToken), body: '{}' });
  assert.equal(crossOut.status, 403, '组织委员不得移出异支部成员');
  const crossResDep = await fetch(`${base}/api/v1/members/p81/residence-status`, { method: 'POST', headers: authHeaders(depToken), body: JSON.stringify({ residenceStatus: '在校' }) });
  assert.equal(crossResDep.status, 403, '副书记不得改异支部成员在册');
  const crossOutDep = await fetch(`${base}/api/v1/members/p81/transfer-out`, { method: 'POST', headers: authHeaders(depToken), body: '{}' });
  assert.equal(crossOutDep.status, 403, '副书记不得移出异支部成员');
});

// 副书同权（2026-09-11 书记裁定）：成员变更确认端点一并纳入
// POST /member-change-requests/:id/confirm —— requireRole(SECRETARY_AND_DEPUTY_ROLES) + 同支部校验；
// 组织委员/普通成员/党委组织员一律 403（不扩大越权面），跨支部 403。
test('成员变更确认端点：副书记本支部 200 且落库；组织委员/普通成员 403；跨支部 403', async () => {
  const { token: secToken } = await login('p13');   // br-b1 书记
  const { token: depToken } = await login('p14');   // br-b1 副书记（副书同权）
  const { token: orgToken } = await login('p11');   // br-b1 组织委员（审批角色，非确认角色）
  const { token: partToken } = await login('p6');   // br-b1 普通成员
  const { token: pcToken } = await login('p_pc');   // 党委组织员

  const post = (path, token) => fetch(`${base}${path}`, { method: 'POST', headers: authHeaders(token) });
  const usersOf = async (t) => (await fetch(`${base}/api/v1/users`, { headers: authHeaders(t) })).json();
  // 造一条 pending-secretary：书记创建 → 组织委员审批
  const makePending = async (personId, agendaItemId, fromStage, toStage) => {
    const create = await fetch(`${base}/api/v1/member-change-requests`, {
      method: 'POST', headers: authHeaders(secToken),
      body: JSON.stringify({ activityId: 'act-27', agendaItemId, personId, fromStage, toStage, meetingResult: 'passed' }),
    });
    assert.equal(create.status, 201, `创建申请（${personId}）`);
    const row = await create.json();
    assert.equal((await post(`/api/v1/member-change-requests/${row.id}/approve`, orgToken)).status, 200, `组织委员审批（${personId}）`);
    return row.id;
  };

  // ① 副书记本支部确认 → 200 + 实际落库（副书同权）
  const depId = await makePending('p6', 'agenda-confirm-deputy', '发展对象', '预备党员');
  const depConfirm = await post(`/api/v1/member-change-requests/${depId}/confirm`, depToken);
  assert.equal(depConfirm.status, 200, '副书记可确认成员变更（副书同权）');
  assert.equal((await depConfirm.json()).status, 'completed');
  assert.equal((await usersOf(secToken)).find((u) => u.id === 'p6').developStage, '预备党员', '副书记确认后阶段落库');

  // ② 书记本支部确认 → 200（口径不回归）
  const secId = await makePending('p2', 'agenda-confirm-secretary', '预备党员', '正式党员');
  assert.equal((await post(`/api/v1/member-change-requests/${secId}/confirm`, secToken)).status, 200, '书记本支部可确认');

  // ③ 组织委员 / 普通成员 → 403（不扩大越权面）
  const denyId = await makePending('p3', 'agenda-confirm-deny', '积极分子', '发展对象');
  assert.equal((await post(`/api/v1/member-change-requests/${denyId}/confirm`, orgToken)).status, 403, '组织委员不得确认成员变更');
  assert.equal((await post(`/api/v1/member-change-requests/${denyId}/confirm`, partToken)).status, 403, '普通成员不得确认成员变更');

  // ④ 跨支部 403：党委组织员建 br-xc 成员 p90；br-b1 书记/副书记确认 → 403（同支部校验）
  const mkUser = await fetch(`${base}/api/v1/users`, {
    method: 'POST', headers: authHeaders(pcToken),
    body: JSON.stringify({ id: 'p90', name: '跨支部确认成员', developStage: '积极分子', role: 'participant', branchId: 'br-xc' }),
  });
  assert.equal(mkUser.status, 201, '党委组织员建跨支部成员');
  const crossId = await makePending('p90', 'agenda-confirm-cross', '积极分子', '发展对象');
  const crossSec = await post(`/api/v1/member-change-requests/${crossId}/confirm`, secToken);
  assert.equal(crossSec.status, 403, '书记不得确认异支部成员变更');
  assert.match((await crossSec.json()).error, /本支部/);
  const crossDep = await post(`/api/v1/member-change-requests/${crossId}/confirm`, depToken);
  assert.equal(crossDep.status, 403, '副书记不得确认异支部成员变更');
  assert.equal((await usersOf(secToken)).find((u) => u.id === 'p90').developStage, '积极分子', '越权确认未改动阶段');
});
