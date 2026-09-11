// server/test/permission-gate.test.mjs — 资源级写角色门（P3 上线前收紧，2026-09-03）
// design §7 登记项落地验证：
//   branches/appointmentRecords/users 写 → 仅 party-staff（403 for 支部成员）
//   reviewRequests POST → 本支部支委层（同支部）；PATCH/DELETE → party-staff（防自批）
//   activities 等未设门资源行为不变（默认 requireAuth）
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

test('未设门资源（activities）写行为不变：登录即可创建，未登录 401', async () => {
  const { token } = await login('p13');
  const ok = await fetch(`${base}/api/v1/activities`, {
    method: 'POST', headers: authHeaders(token),
    body: JSON.stringify({ title: '权限门回归活动', date: '2026-09-10', type: '主题党日' }),
  });
  assert.equal(ok.status, 201, '支部成员仍可创建活动（未设门资源不受影响）');
  const anon = await fetch(`${base}/api/v1/activities`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: 'x' }),
  });
  assert.equal(anon.status, 401, '未登录仍被拒');
});

// C-2 方案 B（2026-09-11 书记批）：名册确权链「书记阶段写入」语义端点权限边界
// POST /api/v1/members/:id/develop-stage —— 仅书记（SECRETARY_ROLES）+ 同支部；字段仅 developStage。
test('确权链阶段端点：书记本支部 200 且落库；非书记 403；跨支部 403；白名单/枚举 400', async () => {
  const { token: secToken } = await login('p13');      // br-b1 书记
  const { token: orgToken } = await login('p11');      // br-b1 组织委员（非书记）
  const { token: pcToken } = await login('p_pc');      // 党委组织员（组织级，非书记）
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

  // ② 非书记（组织委员 / 党委组织员）→ 403（requireRole(SECRETARY_ROLES)）
  const org = await fetch(`${base}/api/v1/members/p1/develop-stage`, {
    method: 'POST', headers: authHeaders(orgToken), body: JSON.stringify({ developStage: '正式党员' }),
  });
  assert.equal(org.status, 403, '组织委员不得走书记专属阶段端点');
  const pc = await fetch(`${base}/api/v1/members/p1/develop-stage`, {
    method: 'POST', headers: authHeaders(pcToken), body: JSON.stringify({ developStage: '正式党员' }),
  });
  assert.equal(pc.status, 403, '党委组织员非书记亦 403（不扩大越权面）');
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

  // ④ 字段白名单硬挡：含 role/branchId → 400
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
