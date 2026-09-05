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
