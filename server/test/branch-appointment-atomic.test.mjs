// role: [工程师]+[AI]
// server/test/branch-appointment-atomic.test.mjs — B-499-9 任命事务化
// 覆盖：
//   ① 任命正常路径（branch.secretaryId / 双方 users.role / 一条未封口 + 一条已封口 / appointedBy）
//   ② 并发 expectedSecretaryId → 200 / 409；重复 appointmentId 幂等
//   ③ SQLite trigger 让 appointment_records INSERT 失败 → 500 且 branch/users 一行未变
//   ④ 支委身份配置：users.role 与 auth_audit 同事务；审计写入失败整体回滚
//   ⑤ mock 适配器 appointments.apply 失败注入 → branches/users/appointmentRecords 深度等于调用前
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../app.js';
import { seedDatabase } from '../seed.js';

let app, server, base, db;
const tokens = {};

before(async () => {
  app = createApp({ dbPath: ':memory:' });
  await seedDatabase(app.locals.db);
  db = app.locals.db;
  server = app.listen(0);
  base = `http://127.0.0.1:${server.address().port}`;
  for (const personId of ['9000000001', '2300010001', '2400012347']) {
    await login(personId);
  }
});

after(() => {
  server?.closeAllConnections?.();
  return new Promise((resolve) => server?.close(resolve));
});

async function login(personId) {
  const response = await fetch(`${base}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ personId, password: '123456' }),
  });
  assert.equal(response.status, 200, `登录失败 ${personId}`);
  tokens[personId] = (await response.json()).token;
  return tokens[personId];
}

async function request(token, method, path, body) {
  const response = await fetch(`${base}/api/v1/${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const data = response.status === 204 ? null : await response.json();
  return { status: response.status, data };
}

const branchRow = (id) => JSON.parse(db.prepare('SELECT data FROM branches WHERE id = ?').get(id).data);
const userRow = (id) => JSON.parse(db.prepare('SELECT data FROM users WHERE id = ?').get(id).data);
const recordsOf = (branchId) => db.prepare('SELECT data FROM appointment_records').all()
  .map((row) => JSON.parse(row.data)).filter((row) => row.branchId === branchId);
const auditsOf = (personId) => db.prepare('SELECT data FROM auth_audit').all()
  .map((row) => JSON.parse(row.data)).filter((row) => row.targetPersonId === personId);

async function createBranch(name) {
  const created = await request(tokens['9000000001'], 'POST', 'branches', { name });
  assert.equal(created.status, 201, JSON.stringify(created.data));
  return created.data.branch;
}

async function createMember(id, name, branchId) {
  const created = await request(tokens['9000000001'], 'POST', 'users', {
    id, name, role: 'participant', branchId, developStage: '正式党员',
  });
  assert.equal(created.status, 201, JSON.stringify(created.data));
}

test('任命正常路径：branch/双方 users/任期封口与新建在同一事务落库', async () => {
  const branch = await createBranch('原子任命一支部');
  await createMember('atomic-a1', '原子甲', branch.id);
  await createMember('atomic-b1', '原子乙', branch.id);

  const first = await request(tokens['9000000001'], 'POST', `branches/${branch.id}/appointments`, {
    secretaryId: 'atomic-a1', expectedSecretaryId: null, note: '首任任命',
  });
  assert.equal(first.status, 200, JSON.stringify(first.data));
  assert.match(first.data.appointment.id, /^appt-/);
  assert.equal(first.data.appointment.appointedBy, '9000000001', 'appointedBy 由服务端会话生成');
  assert.equal(first.data.appointment.to, null);
  assert.ok(first.data.appointment.from, 'from 由服务端生成');
  assert.equal(branchRow(branch.id).secretaryId, 'atomic-a1');
  assert.equal(userRow('atomic-a1').role, 'secretary');
  const firstOpen = recordsOf(branch.id).filter((row) => !row.to);
  assert.equal(firstOpen.length, 1, '每支部至多一条未封口记录');
  assert.equal(firstOpen[0].secretaryId, 'atomic-a1');
  assert.equal(firstOpen[0].note, '首任任命');

  const second = await request(tokens['9000000001'], 'POST', `branches/${branch.id}/appointments`, {
    secretaryId: 'atomic-b1', expectedSecretaryId: 'atomic-a1', note: '换届',
  });
  assert.equal(second.status, 200, JSON.stringify(second.data));
  assert.equal(branchRow(branch.id).secretaryId, 'atomic-b1');
  assert.equal(userRow('atomic-a1').role, 'participant', '原支书降回普通参与者');
  assert.equal(userRow('atomic-b1').role, 'secretary');
  const records = recordsOf(branch.id);
  assert.equal(records.length, 2, '首任记录封口 + 新记录');
  assert.equal(records.filter((row) => !row.to).length, 1);
  assert.equal(records.filter((row) => row.to).length, 1, '首任记录已封口');

  // 幂等：同一 appointmentId 重复提交不新增记录、不改角色
  const repeated = await request(tokens['9000000001'], 'POST', `branches/${branch.id}/appointments`, {
    secretaryId: 'atomic-b1', expectedSecretaryId: 'atomic-a1',
    appointmentId: second.data.appointment.id, note: '换届',
  });
  assert.equal(repeated.status, 200, '重复提交同一 appointmentId 幂等');
  assert.equal(repeated.data.appointment.id, second.data.appointment.id);
  assert.equal(recordsOf(branch.id).length, 2, '幂等提交不新增记录');
  assert.equal(userRow('atomic-a1').role, 'participant');
  assert.equal(userRow('atomic-b1').role, 'secretary');
  assert.equal(recordsOf(branch.id).filter((row) => !row.to).length, 1);
});

test('并发 expectedSecretaryId：同一基线只允许一个 200，其余 409', async () => {
  const branch = await createBranch('原子任命并发支部');
  await createMember('atomic-c1', '并发甲', branch.id);
  await createMember('atomic-d1', '并发乙', branch.id);

  const [left, right] = await Promise.all([
    request(tokens['9000000001'], 'POST', `branches/${branch.id}/appointments`, {
      secretaryId: 'atomic-c1', expectedSecretaryId: null,
    }),
    request(tokens['9000000001'], 'POST', `branches/${branch.id}/appointments`, {
      secretaryId: 'atomic-d1', expectedSecretaryId: null,
    }),
  ]);
  assert.deepEqual([left.status, right.status].sort(), [200, 409], '并发只能有一个成功');
  const winner = left.status === 200 ? left : right;
  const winnerId = winner.data.branch.secretaryId;
  assert.equal(branchRow(branch.id).secretaryId, winnerId);
  assert.equal(userRow(winnerId).role, 'secretary');
  const loserId = winnerId === 'atomic-c1' ? 'atomic-d1' : 'atomic-c1';
  assert.equal(userRow(loserId).role, 'participant');
  assert.equal(recordsOf(branch.id).filter((row) => !row.to).length, 1, '并发后仍只有一条未封口');
});

test('appointment_records 写入失败（SQLite trigger）→ 500 且 branch/users 整体回滚', async () => {
  const branch = await createBranch('原子任事务回滚支部');
  await createMember('atomic-e1', '回滚甲', branch.id);
  const branchBefore = JSON.stringify(branchRow(branch.id));
  const userBefore = JSON.stringify(userRow('atomic-e1'));
  const recordsBefore = JSON.stringify(recordsOf(branch.id));

  db.exec(`CREATE TRIGGER fail_appointment_insert BEFORE INSERT ON appointment_records
           BEGIN SELECT RAISE(ABORT, 'inject appointment failure'); END;`);
  let failed;
  try {
    failed = await request(tokens['9000000001'], 'POST', `branches/${branch.id}/appointments`, {
      secretaryId: 'atomic-e1', expectedSecretaryId: null,
    });
  } finally {
    db.exec('DROP TRIGGER IF EXISTS fail_appointment_insert');
  }

  assert.equal(failed.status, 500, '任一步失败 → 500');
  assert.equal(JSON.stringify(branchRow(branch.id)), branchBefore, 'branch 一行未变');
  assert.equal(JSON.stringify(userRow('atomic-e1')), userBefore, 'users 一行未变');
  assert.equal(JSON.stringify(recordsOf(branch.id)), recordsBefore, '任期记录未新增');
});

test('支委身份配置：users.role 与 auth_audit 同事务；审计失败整体回滚', async () => {
  const branch = await createBranch('原子支委配置支部');
  await createMember('atomic-sec1', '支委支书', branch.id);
  await createMember('atomic-cm1', '支委委员', branch.id);
  const appointed = await request(tokens['9000000001'], 'POST', `branches/${branch.id}/appointments`, {
    secretaryId: 'atomic-sec1', expectedSecretaryId: null,
  });
  assert.equal(appointed.status, 200);
  const secretaryToken = await login('atomic-sec1');

  const granted = await request(secretaryToken, 'POST', `branches/${branch.id}/branch-commissioners`, {
    personId: 'atomic-cm1', role: 'org-commissioner', authorizedBy: '伪造授权人', authorizedAt: '1999-01-01',
  });
  assert.equal(granted.status, 200, JSON.stringify(granted.data));
  assert.equal(granted.data.user.role, 'org-commissioner');
  assert.equal(userRow('atomic-cm1').role, 'org-commissioner');
  const grantAudit = auditsOf('atomic-cm1').at(-1);
  assert.equal(grantAudit.action, 'grant');
  assert.equal(grantAudit.role, 'org-commissioner');
  assert.equal(grantAudit.authorizedBy, 'atomic-sec1', 'authorizedBy 由服务端会话生成');
  assert.notEqual(grantAudit.authorizedAt, '1999-01-01', 'authorizedAt 由服务端生成');

  const reassigned = await request(secretaryToken, 'POST', `branches/${branch.id}/branch-commissioners`, {
    personId: 'atomic-cm1', role: 'prop-commissioner',
  });
  assert.equal(reassigned.status, 200);
  assert.equal(userRow('atomic-cm1').role, 'prop-commissioner');
  const reassignAudits = auditsOf('atomic-cm1');
  assert.deepEqual(reassignAudits.slice(-2).map((row) => `${row.action}:${row.role}`), ['revoke:org-commissioner', 'grant:prop-commissioner']);

  const revoked = await request(secretaryToken, 'POST', `branches/${branch.id}/branch-commissioners`, {
    personId: 'atomic-cm1', role: 'prop-commissioner', action: 'revoke',
  });
  assert.equal(revoked.status, 200);
  assert.equal(userRow('atomic-cm1').role, 'participant');

  // 跨支部靶标 / 非支书角色 → 403
  const other = await createBranch('原子支委跨支部');
  await createMember('atomic-cm2', '跨支部成员', other.id);
  const cross = await request(secretaryToken, 'POST', `branches/${branch.id}/branch-commissioners`, {
    personId: 'atomic-cm2', role: 'org-commissioner',
  });
  assert.equal(cross.status, 403, '跨支部成员不可配置');
  const memberTry = await request(tokens['2400012347'], 'POST', `branches/${branch.id}/branch-commissioners`, {
    personId: 'atomic-cm1', role: 'org-commissioner',
  });
  assert.equal(memberTry.status, 403, '非支书/副支书不得配置支委身份');
  // 通用 PATCH appointmentRecords 仍仅党委
  const recordId = recordsOf(branch.id).at(-1).id;
  const directPatch = await request(secretaryToken, 'PATCH', `appointmentRecords/${recordId}`, { to: '2000-01-01' });
  assert.equal(directPatch.status, 403, '直接 PATCH appointmentRecords 仍 403');

  // 审计写入失败 → 500 且 users.role 未变
  const beforeRole = userRow('atomic-cm1').role;
  const auditCount = auditsOf('atomic-cm1').length;
  db.exec(`CREATE TRIGGER fail_auth_audit_insert BEFORE INSERT ON auth_audit
           BEGIN SELECT RAISE(ABORT, 'inject audit failure'); END;`);
  let failed;
  try {
    failed = await request(secretaryToken, 'POST', `branches/${branch.id}/branch-commissioners`, {
      personId: 'atomic-cm1', role: 'org-commissioner',
    });
  } finally {
    db.exec('DROP TRIGGER IF EXISTS fail_auth_audit_insert');
  }
  assert.equal(failed.status, 500, '审计失败 → 500');
  assert.equal(userRow('atomic-cm1').role, beforeRole, 'users.role 随事务回滚');
  assert.equal(auditsOf('atomic-cm1').length, auditCount, 'auth_audit 未新增');
});

test('mock appointments.apply 失败注入：三数组深度等于调用前', async () => {
  const store = new Map();
  globalThis.localStorage = {
    getItem: (key) => (store.has(String(key)) ? store.get(String(key)) : null),
    setItem: (key, value) => store.set(String(key), String(value)),
    removeItem: (key) => { store.delete(String(key)); },
    clear: () => store.clear(),
    key: (index) => [...store.keys()][index] ?? null,
    get length() { return store.size; },
  };
  globalThis.sessionStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };

  const { mockDB } = await import('../../docs/src/core/domain/domain.js?v=20261022c');
  const { MockAdapter } = await import('../../docs/src/data/mock-adapter.js?v=20261022c');
  const { registerMockAdapter, setDataSource } = await import('../../docs/src/data/data-adapter.js?v=20261022c');
  const { PersonStore } = await import('../../docs/src/services/member/person.js?v=20261022c');
  registerMockAdapter(MockAdapter);
  setDataSource('mock');
  mockDB._loaded = true;
  mockDB.branches = [{
    id: 'br-mock-atomic', name: 'Mock 原子支部', secretaryId: '2300010001',
    status: 'active', config: { headerTitle: 'Mock 原子支部' },
  }];
  mockDB.users = [
    { id: '2300010001', name: '储子禾', role: 'secretary', branchId: 'br-mock-atomic' },
    { id: '2400012347', name: '何晓峰', role: 'participant', branchId: 'br-mock-atomic' },
  ];
  mockDB.appointmentRecords = [];

  const okResult = await MockAdapter.appointments.apply({
    branchId: 'br-mock-atomic', secretaryId: '2400012347', expectedSecretaryId: '2300010001',
  });
  assert.equal(okResult.branch.secretaryId, '2400012347');
  assert.equal(mockDB.branches[0].secretaryId, '2400012347');
  assert.equal(mockDB.users.find((row) => row.id === '2400012347').role, 'secretary');
  assert.equal(mockDB.users.find((row) => row.id === '2300010001').role, 'participant');
  assert.equal(mockDB.appointmentRecords.filter((row) => !row.to).length, 1);

  const before = {
    branches: JSON.parse(JSON.stringify(mockDB.branches)),
    users: JSON.parse(JSON.stringify(mockDB.users)),
    appointmentRecords: JSON.parse(JSON.stringify(mockDB.appointmentRecords)),
  };
  const originalSaveMember = PersonStore.saveMember;
  PersonStore.saveMember = async () => { throw new Error('inject mock appointment failure'); };
  try {
    await assert.rejects(
      () => MockAdapter.appointments.apply({
        branchId: 'br-mock-atomic', secretaryId: '2400012349', expectedSecretaryId: '2400012347',
      }),
      /inject mock appointment failure/,
    );
  } finally {
    PersonStore.saveMember = originalSaveMember;
  }
  assert.deepEqual(mockDB.branches, before.branches, '失败后 branches 深度等于调用前');
  assert.deepEqual(mockDB.users, before.users, '失败后 users 深度等于调用前');
  assert.deepEqual(mockDB.appointmentRecords, before.appointmentRecords, '失败后 appointmentRecords 深度等于调用前');
});
