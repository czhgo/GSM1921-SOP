// server/test/round3-4-security.test.mjs — 第三/四轮后端安全整改回归（2026-10-19）
// 覆盖：
//   A（R4-B01/F02）快照写穿口越权：notices / attendances 正负例
//   B（R4-B02）IAAA 未归属账号（branchId 显式 null）不得读/写支部资源
//   C（R4-B03）users.patch 字段夹带（role + branchId / transferOut / developStage）
//   D（R4-B04）思想汇报读口：普通党员只见本人，支委层全量
//   E（R4-F03）通知组织者写口：本场活动组织者可发本场通知，非组织者 403
//   F（R4-F04）考勤/考察/待办按本人或职责投影（非支委层）
// 自包含：createApp(:memory:) + seedDatabase；HTTP 直连（无浏览器）。
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../app.js';
import { seedDatabase } from '../seed.js';
import { actorBranchId } from '../routes/resources/branch-scope.js';

let app, server, base, db;

before(async () => {
  app = createApp({ dbPath: ':memory:' });
  db = app.locals.db;
  await seedDatabase(db);
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
    body: JSON.stringify({ personId, password: '123456' }),
  });
  assert.equal(res.status, 200, `登录失败 ${personId}`);
  return res.json();
}

const headers = (token) => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${token}` });

async function versions(token) {
  const res = await fetch(`${base}/api/v1/snapshot/versions`, { headers: headers(token) });
  assert.equal(res.status, 200, '取集合版本基线应 200');
  return (await res.json()).versions;
}

function dbRow(table, id) {
  const row = db.prepare(`SELECT data FROM ${table} WHERE id = ?`).get(id);
  return row ? JSON.parse(row.data) : null;
}

// ── A. 快照写穿口越权 ──────────────────────────────────────────────
test('A1 普通成员构造快照写 notices → 403，且不落库', async () => {
  const { token } = await login('p7'); // 普通成员
  const v = await versions(token);
  const forged = {
    id: 'ntc-r34-a1', title: '越权广播', content: 'x', priority: 'normal',
    publishDate: '2026-10-19', expireDate: null, read: false,
  };
  const res = await fetch(`${base}/api/v1/snapshot`, {
    method: 'POST', headers: headers(token),
    body: JSON.stringify({ notices: [forged], _versions: { notices: v.notices || 0 } }),
  });
  assert.equal(res.status, 403, '普通成员不得经快照发布通知');
  assert.match((await res.json()).error, /无权限/);
  assert.equal(dbRow('notices', forged.id), null, '被拒的通知不得落库');
});

test('A2 普通成员构造快照替他人写 attendances → 403，且不落库', async () => {
  const { token } = await login('p7');
  const v = await versions(token);
  const forged = {
    id: 'att-r34-a2', activityId: 'act-31', personId: 'p3',
    status: 'present', recordedBy: null, overdue: false,
  };
  const res = await fetch(`${base}/api/v1/snapshot`, {
    method: 'POST', headers: headers(token),
    body: JSON.stringify({ attendances: [forged], _versions: { attendances: v.attendances || 0 } }),
  });
  assert.equal(res.status, 403, '普通成员不得经快照替他人登记考勤');
  assert.match((await res.json()).error, /无权限/);
  assert.equal(dbRow('attendances', forged.id), null, '被拒的考勤不得落库');
});

test('A3 支书正常保存 notices + attendances → 200（前端 persist 路径不被误伤）', async () => {
  const { token } = await login('p13'); // 支书
  const v = await versions(token);
  const notice = {
    id: 'ntc-r34-ok', title: '支书正常保存', content: 'x', priority: 'normal',
    publishDate: '2026-10-19', expireDate: null, read: false,
  };
  const attendance = {
    id: 'att-r34-ok', activityId: 'act-31', personId: 'p3',
    status: 'present', recordedBy: null, overdue: false,
  };
  // 前端 persist() 上传的是**整集合**（脏集合增量，而非单行）——按真实形态取现有全量再追加。
  const currentNotices = await (await fetch(`${base}/api/v1/notices`, { headers: headers(token) })).json();
  const currentAttendances = await (await fetch(`${base}/api/v1/attendances`, { headers: headers(token) })).json();
  const res = await fetch(`${base}/api/v1/snapshot`, {
    method: 'POST', headers: headers(token),
    body: JSON.stringify({
      notices: [...currentNotices, notice],
      attendances: [...currentAttendances, attendance],
      _versions: { notices: v.notices || 0, attendances: v.attendances || 0 },
    }),
  });
  assert.equal(res.status, 200, `支书正常保存应 200（实测 ${res.status}：${await res.clone().text()}）`);
  assert.ok(dbRow('notices', notice.id), '通知已落库');
  assert.ok(dbRow('attendances', attendance.id), '考勤已落库');
});

// ── B. branchId null 越权 ─────────────────────────────────────────
test('B1 actorBranchId：显式 null 不得回落 br-b1；历史缺字段才回落', () => {
  assert.equal(actorBranchId({ role: 'participant', branchId: null }), null, '显式 null ⇒ null');
  assert.equal(actorBranchId({ role: 'participant' }), 'br-b1', 'undefined（存量缺字段）⇒ br-b1');
  assert.equal(actorBranchId({ role: 'party-staff', branchId: null }), null, '党委恒无支部');
});

test('B2 IAAA 未归属账号：读/写 br-b1 资源一律 403；绑定端点仍可用', async () => {
  const personId = 'p_r34_unassigned';
  const token = 'tok-r34-unassigned';
  db.prepare('INSERT OR REPLACE INTO users (id, data) VALUES (?, ?)').run(personId, JSON.stringify({
    id: personId, name: '待归属测试员', studentId: '2699009900', role: 'participant', branchId: null,
  }));
  db.prepare('INSERT OR REPLACE INTO sessions (token, person_id, created_at) VALUES (?, ?, ?)')
    .run(token, personId, new Date().toISOString());

  // 认证端点本身可用（前端要能识别「待归属」）
  const me = await fetch(`${base}/api/v1/auth/me`, { headers: headers(token) });
  assert.equal(me.status, 200, '/auth/me 不受资源门影响');

  for (const path of ['/api/v1/activities', '/api/v1/users', '/api/v1/todos', '/api/v1/bootstrap', '/api/v1/snapshot/versions']) {
    const res = await fetch(`${base}${path}`, { headers: headers(token) });
    assert.equal(res.status, 403, `${path} 对未归属账号应 403`);
    assert.match((await res.json()).error, /归属支部/, `${path} 应给中文可懂原因`);
  }

  const readOne = await fetch(`${base}/api/v1/activities/act-31`, { headers: headers(token) });
  assert.equal(readOne.status, 403, '单行读同样 403');

  const write = await fetch(`${base}/api/v1/activities/act-31`, {
    method: 'PATCH', headers: headers(token), body: JSON.stringify({ title: '越权改' }),
  });
  assert.equal(write.status, 403, '未归属账号写 br-b1 资源应 403');

  const member = await fetch(`${base}/api/v1/members/p3/profile`, {
    method: 'PATCH', headers: headers(token), body: JSON.stringify({ name: '越权改名' }),
  });
  assert.equal(member.status, 403, '成员链路同样被支部归属门拦截');

  // IAAA 绑定/待确认端点不经过资源门：选支部仍应成功（此刻仍 branchId null）
  const bind = await fetch(`${base}/api/v1/auth/iaaa/bind-branch`, {
    method: 'POST', headers: headers(token), body: JSON.stringify({ branchId: 'br-b1' }),
  });
  assert.equal(bind.status, 200, `IAAA 选支部端点仍可用（实测 ${bind.status}：${await bind.text()}）`);
});

// ── C. users.patch 字段夹带 ───────────────────────────────────────
test('C1 支书 patch users：role+branchId 等夹带字段 → 400/403；仅 role → 200', async () => {
  const { token } = await login('p13'); // 支书
  const beforeRow = dbRow('users', 'p6');
  const beforeBranch = beforeRow.branchId;

  const smuggleCases = [
    ['branchId', { role: 'participant', branchId: 'br-b2' }],
    ['transferOut', { role: 'participant', transferOut: true }],
    ['studentId', { role: 'participant', studentId: '2699000000' }],
    ['developStage', { role: 'participant', developStage: '正式党员' }],
  ];
  for (const [field, body] of smuggleCases) {
    const res = await fetch(`${base}/api/v1/users/p6`, {
      method: 'PATCH', headers: headers(token), body: JSON.stringify(body),
    });
    assert.ok([400, 403].includes(res.status), `${field} 夹带应 400/403（实测 ${res.status}）`);
    const payload = await res.json();
    assert.match(payload.error, new RegExp(field), `${field} 的拒绝原因应点名该字段`);
  }
  const afterRow = dbRow('users', 'p6');
  assert.equal(afterRow.branchId, beforeBranch, '被拒请求不得改动支部归属');
  assert.notEqual(afterRow.transferOut, true, '被拒请求不得打转出标记');
  assert.equal(afterRow.developStage, beforeRow.developStage, '被拒请求不得改动发展阶段');

  const ok = await fetch(`${base}/api/v1/users/p6`, {
    method: 'PATCH', headers: headers(token), body: JSON.stringify({ role: 'participant' }),
  });
  assert.equal(ok.status, 200, '支书仅改 role 应 200');
  assert.equal(dbRow('users', 'p6').role, 'participant');
});

// ── D. 思想汇报读口 ───────────────────────────────────────────────
test('D1 普通党员 GET /thoughtReports 只返回本人；支委层返回全量', async () => {
  const { token: partToken } = await login('p3'); // 普通党员
  const partRows = await (await fetch(`${base}/api/v1/thoughtReports`, { headers: headers(partToken) })).json();
  assert.ok(partRows.length > 0, '普通党员应能看到自己的思想汇报');
  assert.ok(partRows.every((row) => row.personId === 'p3'), `普通党员不得看到他人汇报：${JSON.stringify(partRows.map((r) => r.personId))}`);
  assert.ok(partRows.some((row) => row.id === 'tr-4'), '本人记录应可见');
  assert.ok(!partRows.some((row) => row.id === 'tr-1'), '他人记录不得出现');

  const { token: orgToken } = await login('p11'); // 组织委员（支委层）
  const orgRows = await (await fetch(`${base}/api/v1/thoughtReports`, { headers: headers(orgToken) })).json();
  assert.ok(orgRows.some((row) => row.id === 'tr-1') && orgRows.some((row) => row.id === 'tr-4'),
    '支委层应看到全部思想汇报');
});

// ── E. 通知组织者写口 ─────────────────────────────────────────────
test('E1 普通成员组织者可发本场通知；非组织者普通成员 403', async () => {
  const { token: organizerToken } = await login('p3'); // act-7 组织者（普通成员）
  const payload = {
    title: '本场活动通知（组织者）', content: 'x', priority: 'normal',
    targetModule: 'activity', targetType: 'activity', targetId: 'act-7',
    targetUrl: 'activity.html?id=act-7', read: false,
  };
  const ok = await fetch(`${base}/api/v1/notices`, {
    method: 'POST', headers: headers(organizerToken), body: JSON.stringify(payload),
  });
  assert.equal(ok.status, 201, `本场组织者应可发本场通知（实测 ${ok.status}：${await ok.clone().text()}）`);

  const { token: memberToken } = await login('p7'); // 非本场组织者
  const deny = await fetch(`${base}/api/v1/notices`, {
    method: 'POST', headers: headers(memberToken), body: JSON.stringify({ ...payload, title: '越权本场通知' }),
  });
  assert.equal(deny.status, 403, '非组织者普通成员不得发本场通知');

  // 快照写穿（前端 persist 实际路径）同样放行本场组织者
  const v = await versions(organizerToken);
  const snapRow = {
    id: 'ntc-r34-e-snap', title: '本场通知·快照路径', content: 'x', priority: 'normal',
    publishDate: '2026-10-19', expireDate: null, read: false,
    targetModule: 'activity', targetType: 'activity', targetId: 'act-7',
  };
  const snap = await fetch(`${base}/api/v1/snapshot`, {
    method: 'POST', headers: headers(organizerToken),
    body: JSON.stringify({ notices: [snapRow], _versions: { notices: v.notices || 0 } }),
  });
  assert.equal(snap.status, 200, '组织者经快照发本场通知应 200');
  assert.ok(dbRow('notices', snapRow.id), '组织者本场通知已落库');
});

// ── F. 读口可见性（F04，部分完成：按本人/职责投影）──────────────────
test('F1 非支委层 attendances / inspections / todos 按本人或职责投影；支委层全量', async () => {
  const { token: partToken } = await login('p3');
  const organizedByP3 = new Set(db.prepare('SELECT data FROM activities').all()
    .map((row) => JSON.parse(row.data))
    .filter((row) => row.organizer === 'p3'
      || (Array.isArray(row.assignments) && row.assignments.some((item) => item.personId === 'p3' && item.role === 'organizer')))
    .map((row) => row.id));
  const att = await (await fetch(`${base}/api/v1/attendances`, { headers: headers(partToken) })).json();
  assert.ok(!att.some((row) => row.id === 'att900'), '普通成员不得看到他人考勤（att900 为 p5 在 act-31）');
  assert.ok(att.every((row) => row.personId === 'p3' || organizedByP3.has(row.activityId)),
    `考勤投影越界：${JSON.stringify(att.map((r) => [r.id, r.personId, r.activityId]).slice(0, 10))}`);

  const insp = await (await fetch(`${base}/api/v1/inspections`, { headers: headers(partToken) })).json();
  assert.ok(insp.some((row) => row.id === 'insp-4'), '本人考察记录应可见');
  assert.ok(!insp.some((row) => row.id === 'insp-9'), '他人考察记录（非本人职责）不得可见');

  const todos = await (await fetch(`${base}/api/v1/todos`, { headers: headers(partToken) })).json();
  assert.ok(!todos.some((row) => row.id === 'todo_seed_7'), '普通成员不得看到支书角色待办');

  const { token: secToken } = await login('p13'); // 支委层
  const secAtt = await (await fetch(`${base}/api/v1/attendances`, { headers: headers(secToken) })).json();
  assert.ok(secAtt.some((row) => row.id === 'att900'), '支委层保留考勤全量');
  const secTodos = await (await fetch(`${base}/api/v1/todos`, { headers: headers(secToken) })).json();
  assert.ok(secTodos.some((row) => row.id === 'todo_seed_7'), '支委层保留待办全量');

  const { token: orgToken } = await login('p11'); // 支委层
  const orgInsp = await (await fetch(`${base}/api/v1/inspections`, { headers: headers(orgToken) })).json();
  assert.ok(orgInsp.some((row) => row.id === 'insp-9'), '支委层保留考察全量');
});
