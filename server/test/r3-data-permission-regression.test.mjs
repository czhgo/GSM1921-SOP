// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  r3-data-permission-regression.test.mjs — FULLSTACK_AUDIT_R3 的 P0/P1 回归
//  覆盖：
//   · P0-2（F-02）：普通成员快照写 todos / thoughtReports 不得删掉同支部他人记录（api 形态）
//                   + mock 形态待办写口不误删他人行
//   · P1-3（F-03）：通知逐人 reads 增量放行；改写他人已读拒绝
//   · P1-4（F-04）：组长保存本组考勤 200（他组行保留、不误判为删除）
//   · P1-5（F-05）：未设门资源补门后，普通成员 PATCH / DELETE 他人记录 403
//   · P1-6（F-06）：GET /notices 按受众投影（私信 / audiencePersons 定向）
//   · P1-7（F-08）：移出成员不出现在在册名册读口（历史行可由治理侧显式读取）
//   · P0-2（F-15/F-18）：迁移覆盖 personStages 对象键 / 数字 id / p_<uuid> + 目标主键冲突清单
//  运行：node --test server/test/r3-data-permission-regression.test.mjs
// ════════════════════════════════════════════════════════════════
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import Database from 'better-sqlite3';
import { createApp } from '../app.js';
import { seedDatabase } from '../seed.js';
import { migratePersonIdsToStudentNumbers } from '../db.js';
import { mockDB } from '../../docs/src/core/domain/domain.js?v=20261028a';
import { setDataSource } from '../../docs/src/data/data-adapter.js?v=20261028a';
import { TodoStore } from '../../docs/src/services/governance/todo.js?v=20261028a';

let server;
let base;
let db;

before(async () => {
  const app = createApp({ dbPath: ':memory:' });
  db = app.locals.db;
  await seedDatabase(db);
  server = app.listen(0);
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => {
  server.closeAllConnections?.();
  return new Promise((resolve) => server.close(resolve));
});

const H = (token) => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${token}` });

async function login(personId) {
  const res = await fetch(`${base}/api/v1/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ personId }),
  });
  assert.equal(res.status, 200, `登录失败 ${personId}：${await res.clone().text()}`);
  return (await res.json()).token;
}
const versions = async (token) => (await (await fetch(`${base}/api/v1/snapshot/versions`, { headers: H(token) })).json()).versions;
const snapshot = (token, body) => fetch(`${base}/api/v1/snapshot`, { method: 'POST', headers: H(token), body: JSON.stringify(body) });
const rows = (table) => db.prepare(`SELECT data FROM ${table}`).all().map((r) => JSON.parse(r.data));
const insert = (table, row) => db.prepare(`INSERT OR REPLACE INTO ${table} (id, data) VALUES (?, ?)`).run(row.id, JSON.stringify(row));

// ── P0-2（F-02）：快照不删他人记录 ───────────────────────────────
test('R3-01 普通成员保存 todos / thoughtReports：同支部他人记录仍在（api 快照写穿）', async () => {
  const a = '2400012347'; // 何晓峰（participant，第一党小组）
  const b = '2400012349'; // 宋佳宁（participant，第二党小组）
  const token = await login(a);
  insert('todos', { id: 'td-r3-a', personId: a, title: 'A 的待办', status: 'pending', branchId: 'br-b1' });
  insert('todos', { id: 'td-r3-b', personId: b, title: 'B 的待办', status: 'pending', branchId: 'br-b1' });
  insert('thought_reports', { id: 'tr-r3-a', personId: a, title: 'A 的思想汇报', branchId: 'br-b1' });
  insert('thought_reports', { id: 'tr-r3-b', personId: b, title: 'B 的思想汇报', branchId: 'br-b1' });

  // 普通成员读口只见本人行（前置：读投影存在，正是本 P0 的成因）
  const visibleTodos = await (await fetch(`${base}/api/v1/todos`, { headers: H(token) })).json();
  assert.deepEqual(visibleTodos.map((r) => r.id), ['td-r3-a'], '普通成员只读到本人待办');
  const visibleReports = await (await fetch(`${base}/api/v1/thoughtReports`, { headers: H(token) })).json();
  assert.ok(visibleReports.some((r) => r.id === 'tr-r3-a'), '普通成员读到本人思想汇报');
  assert.ok(!visibleReports.some((r) => r.id === 'tr-r3-b'), '普通成员读不到他人思想汇报（读投影）');

  // 前端 persist() 上传的是「本地可见集合」——模拟：只带 A 的两行
  const v = await versions(token);
  const res = await snapshot(token, {
    todos: visibleTodos,
    thoughtReports: visibleReports,
    _versions: { todos: v.todos, thoughtReports: v.thoughtReports },
  });
  assert.equal(res.status, 200, `普通成员保存本人记录应 200：${await res.clone().text()}`);

  const todoIds = rows('todos').map((r) => r.id);
  assert.ok(todoIds.includes('td-r3-a'), 'A 的待办已落库');
  assert.ok(todoIds.includes('td-r3-b'), '★ B 的待办不得因 A 保存而消失');
  const reportIds = rows('thought_reports').map((r) => r.id);
  assert.ok(reportIds.includes('tr-r3-a'), 'A 的思想汇报已落库');
  assert.ok(reportIds.includes('tr-r3-b'), '★ B 的思想汇报不得因 A 保存而消失');
});

test('R3-02 mock 形态：TodoStore 更新/完成不误删他人待办', () => {
  setDataSource('mock');
  mockDB.todos = [
    { id: 'td-mock-a', personId: '2400012347', title: 'A', status: 'pending' },
    { id: 'td-mock-b', personId: '2400012349', title: 'B', status: 'pending' },
  ];
  TodoStore.update('td-mock-a', { status: 'completed' });
  assert.deepEqual(mockDB.todos.map((t) => t.id).sort(), ['td-mock-a', 'td-mock-b'], 'mock 写口保留他人待办');
  assert.equal(mockDB.todos.find((t) => t.id === 'td-mock-b').status, 'pending', '他人状态未被改动');
});

// ── P1-3（F-03）：逐人已读 ────────────────────────────────────────
test('R3-03 通知 reads 增量放行；改写他人已读 403（api 快照写门）', async () => {
  const a = '2400012347';
  const b = '2400012349';
  insert('notices', { id: 'ntc-r3-read', title: '广播', content: 'x', audience: ['all'], reads: [b], publishDate: '2026-10-20' });
  const token = await login(a);
  const v1 = await versions(token);
  // 只追加本人
  const ok = await snapshot(token, {
    notices: [{ id: 'ntc-r3-read', title: '广播', content: 'x', audience: ['all'], reads: [b, a], publishDate: '2026-10-20' }],
    _versions: { notices: v1.notices },
  });
  assert.equal(ok.status, 200, `逐人已读增量应放行：${await ok.clone().text()}`);
  assert.deepEqual(rows('notices').find((n) => n.id === 'ntc-r3-read').reads, [b, a]);

  // 删除他人已读 → 拒
  const v2 = await versions(token);
  const deny = await snapshot(token, {
    notices: [{ id: 'ntc-r3-read', title: '广播', content: 'x', audience: ['all'], reads: [a], publishDate: '2026-10-20' }],
    _versions: { notices: v2.notices },
  });
  assert.equal(deny.status, 403, '不得删除他人已读');
  assert.deepEqual(rows('notices').find((n) => n.id === 'ntc-r3-read').reads, [b, a], '被拒后已读未变');
});

// ── P1-4（F-04）：组长保存考勤 ──────────────────────────────────
test('R3-04 组长保存本组考勤 200；他组同场考勤行保留（不误判为删除）', async () => {
  const leader = '2400012345'; // 第一党小组组长
  const leaderToken = await login(leader);
  const created = await fetch(`${base}/api/v1/activities`, {
    method: 'POST', headers: H(leaderToken),
    body: JSON.stringify({
      title: 'R3 组长考勤回归', date: '2026-11-01', type: '党小组会',
      organizingScope: 'party-group', hostGroupId: 'pg-1', organizer: '2300010001', status: 'in-progress',
    }),
  });
  assert.equal(created.status, 201, `建党小组会失败：${await created.clone().text()}`);
  const act = await created.json();
  insert('attendances', { id: 'att-r3-leader', activityId: act.id, personId: '2400012345', status: 'present', recordedBy: null, branchId: 'br-b1' });
  insert('attendances', { id: 'att-r3-peer', activityId: act.id, personId: '2400012347', status: 'present', recordedBy: null, branchId: 'br-b1' });
  insert('attendances', { id: 'att-r3-other', activityId: act.id, personId: '2400012349', status: 'absent', recordedBy: null, branchId: 'br-b1' });

  // 他组承办的另一场党小组会：组长 A 完全读不到其考勤行（历史实现会把它当作「要删除」而 403）
  const leaderB = '2400012346'; // 第二党小组组长
  const createdB = await fetch(`${base}/api/v1/activities`, {
    method: 'POST', headers: H(await login(leaderB)),
    body: JSON.stringify({
      title: 'R3 他组考勤回归', date: '2026-11-02', type: '党小组会',
      organizingScope: 'party-group', hostGroupId: 'pg-2', organizer: leaderB, status: 'in-progress',
    }),
  });
  assert.equal(createdB.status, 201, `建他组党小组会失败：${await createdB.clone().text()}`);
  const actB = await createdB.json();
  insert('attendances', { id: 'att-r3-hidden', activityId: actB.id, personId: leaderB, status: 'present', recordedBy: null, branchId: 'br-b1' });

  const token = leaderToken;
  const visible = await (await fetch(`${base}/api/v1/attendances`, { headers: H(token) })).json();
  const mine = visible.filter((r) => r.activityId === act.id).map((r) => r.id).sort();
  assert.deepEqual(mine, ['att-r3-leader', 'att-r3-other', 'att-r3-peer'], '组长读到本组承办场次的考勤行');
  assert.ok(!visible.some((r) => r.id === 'att-r3-hidden'), '他组承办场次的考勤行对本组组长不可见');

  const v = await versions(token);
  const payloadRows = visible.map((r) => (r.activityId === act.id ? { ...r, status: 'present' } : r));
  const res = await snapshot(token, { attendances: payloadRows, _versions: { attendances: v.attendances } });
  assert.equal(res.status, 200, `★ 组长保存本组考勤应 200（不再 403）：${await res.clone().text()}`);
  assert.ok(rows('attendances').some((r) => r.id === 'att-r3-hidden'), '★ 他组考勤行保留（不得因本人不可见被当作删除）');
});

// ── 第八轮 2.8：纪检确认考勤（确认与上传留痕分离） ──────────────
test('R3-04b 纪检确认他人上传的考勤：只落确认字段、recordedBy 不变、刷新保留；普通成员确认 403', async () => {
  const actId = 'act-r3-confirm';
  insert('activities', {
    id: actId, title: 'R3 确认考勤回归', date: '2026-11-05', type: '主题党日',
    status: 'published', archived: false, organizer: '2400012355', branchId: 'br-b1',
  });
  insert('attendances', {
    id: 'att-r3-confirm-a', activityId: actId, personId: '2400012349', status: 'absent',
    submittedBy: '2400012355', recordedBy: null, branchId: 'br-b1',
  });
  insert('attendances', {
    id: 'att-r3-confirm-b', activityId: actId, personId: '2400012347', status: 'leave',
    submittedBy: '2400012355', recordedBy: null, branchId: 'br-b1',
  });

  // 纪检（非上传人、且主题党日不在其上传位）确认 A：只改 confirmed/confirmedBy/confirmedAt
  const discToken = await login('2400012354');
  const v1 = await versions(discToken);
  const visible = await (await fetch(`${base}/api/v1/attendances`, { headers: H(discToken) })).json();
  const patched = visible.map((r) => (r.id === 'att-r3-confirm-a'
    ? { ...r, confirmed: true, confirmedBy: '2400012354', confirmedAt: '2026-11-06T00:00:00.000Z' }
    : r));
  const ok = await snapshot(discToken, { attendances: patched, _versions: { attendances: v1.attendances } });
  assert.equal(ok.status, 200, `纪检确认应放行：${await ok.clone().text()}`);

  const saved = rows('attendances').find((r) => r.id === 'att-r3-confirm-a');
  assert.equal(saved.recordedBy, null, '★ recordedBy（上传人留痕）不得被确认动作改写');
  assert.equal(saved.confirmedBy, '2400012354', '确认人落 confirmedBy');
  assert.equal(saved.confirmed, true);
  const refreshed = await (await fetch(`${base}/api/v1/attendances`, { headers: H(discToken) })).json();
  assert.equal(refreshed.find((r) => r.id === 'att-r3-confirm-a')?.confirmedBy, '2400012354', '刷新后确认状态保留');

  // 普通成员确认自己的待确认记录 → 403（确认权仅纪检 / 支书 / 副支书）
  const memberToken = await login('2400012347');
  const v2 = await versions(memberToken);
  const mine = await (await fetch(`${base}/api/v1/attendances`, { headers: H(memberToken) })).json();
  const bad = mine.map((r) => (r.id === 'att-r3-confirm-b'
    ? { ...r, confirmed: true, confirmedBy: '2400012347', confirmedAt: '2026-11-07T00:00:00.000Z' }
    : r));
  const deny = await snapshot(memberToken, { attendances: bad, _versions: { attendances: v2.attendances } });
  assert.equal(deny.status, 403, `普通成员确认应 403：${await deny.clone().text()}`);
  const untouched = rows('attendances').find((r) => r.id === 'att-r3-confirm-b');
  assert.equal(untouched.confirmedBy, undefined, '被拒后未落确认人');
  assert.equal(untouched.recordedBy, null, '被拒后 recordedBy 仍为空');
});

// ── P1-5（F-05）：未设门资源补门 ────────────────────────────────
test('R3-05 普通成员 PATCH/DELETE 同支部他人 todos / thoughtReports / tasks → 403', async () => {
  const token = await login('2400012347'); // participant
  insert('todos', { id: 'td-r3-other', personId: '2400012349', title: '他人待办', status: 'pending', branchId: 'br-b1' });
  insert('thought_reports', { id: 'tr-r3-other', personId: '2400012349', title: '他人汇报', branchId: 'br-b1' });
  insert('tasks', { id: 'tsk-r3-other', activityId: 'act-31', assigneeId: '2400012349', createdBy: '2300010001', workName: '他人任务', status: 'pending', branchId: 'br-b1' });

  const cases = [
    ['todos', 'td-r3-other'],
    ['thoughtReports', 'tr-r3-other'],
    ['tasks', 'tsk-r3-other'],
  ];
  for (const [name, id] of cases) {
    const patch = await fetch(`${base}/api/v1/${name}/${id}`, {
      method: 'PATCH', headers: H(token), body: JSON.stringify({ title: '越权改写' }),
    });
    assert.equal(patch.status, 403, `${name} PATCH 他人记录应 403`);
    const del = await fetch(`${base}/api/v1/${name}/${id}`, { method: 'DELETE', headers: H(token) });
    assert.equal(del.status, 403, `${name} DELETE 他人记录应 403`);
  }
  assert.ok(rows('todos').some((r) => r.id === 'td-r3-other'), '他人待办未被删除');
  assert.ok(rows('thought_reports').some((r) => r.id === 'tr-r3-other'), '他人思想汇报未被删除');
  assert.ok(rows('tasks').some((r) => r.id === 'tsk-r3-other'), '他人任务未被删除');
});

// ── P1-6（F-06）：通知受众投影 ──────────────────────────────────
test('R3-06 GET /notices：私信仅收发双方可见；audiencePersons 定向只给受众', async () => {
  insert('notices', {
    id: 'ntc-r3-pm', title: '私信', content: 'x', noticeType: 'message',
    fromPersonId: '2400012347', audiencePersons: ['2400012349'], publishDate: '2026-10-20',
  });
  insert('notices', {
    id: 'ntc-r3-dir', title: '定向', content: 'x', audiencePersons: ['2400012349'], publishDate: '2026-10-20',
  });
  const idsOf = async (personId) => {
    const token = await login(personId);
    return (await (await fetch(`${base}/api/v1/notices`, { headers: H(token) })).json()).map((n) => n.id);
  };
  const sender = await idsOf('2400012347');
  assert.ok(sender.includes('ntc-r3-pm'), '发件人可见自己的私信');
  assert.ok(!sender.includes('ntc-r3-dir'), '发件人非定向受众 → 不可见定向通知');
  const receiver = await idsOf('2400012349');
  assert.ok(receiver.includes('ntc-r3-pm') && receiver.includes('ntc-r3-dir'), '收件人可见私信与定向通知');
  const outsider = await idsOf('2500010009');
  assert.ok(!outsider.includes('ntc-r3-pm'), '★ 非收发双方不可见私信');
  assert.ok(!outsider.includes('ntc-r3-dir'), '★ 非受众不可见定向通知');
});

// ── P1-7（F-08）：移出成员不复活 ────────────────────────────────
test('R3-07 移出成员不在在册名册读口；治理侧显式读取仍见历史行', async () => {
  const org = await login('2400012355'); // 组织委员
  const created = await fetch(`${base}/api/v1/members`, {
    method: 'POST', headers: H(org),
    body: JSON.stringify({ id: '2026999902', name: 'R3 移出成员', partyGroup: '第一党小组', developStage: '正式党员' }),
  });
  assert.equal(created.status, 201);
  const out = await fetch(`${base}/api/v1/members/2026999902/transfer-out`, { method: 'POST', headers: H(org), body: '{}' });
  assert.equal(out.status, 200);

  const roster = await (await fetch(`${base}/api/v1/users?branchId=br-b1`, { headers: H(org) })).json();
  assert.equal(roster.find((u) => u.id === '2026999902'), undefined, '★ 移出成员刷新后不再出现（不复活）');
  const history = await (await fetch(`${base}/api/v1/users?branchId=br-b1&includeTransferredOut=1`, { headers: H(org) })).json();
  const row = history.find((u) => u.id === '2026999902');
  const dbRowRaw = db.prepare('SELECT data FROM users WHERE id = ?').get('2026999902');
  assert.ok(row && row.transferOut === true,
    `历史行保留（治理侧显式读取）：${JSON.stringify(row || null)}；库内=${dbRowRaw ? dbRowRaw.data : 'null'}`);

  const loginRes = await fetch(`${base}/api/v1/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ personId: '2026999902', password: '123456' }),
  });
  assert.equal(loginRes.status, 401, '移出账号不可登录');
});

// ── P0-2 迁移补强（F-15 / F-18）────────────────────────────────
test('R3-08 v7 迁移：personStages 对象键 / 数字人员 id / p_<uuid> 覆盖', () => {
  const mem = new Database(':memory:');
  try {
    mem.exec('CREATE TABLE users (id TEXT PRIMARY KEY, data TEXT NOT NULL)');
    mem.prepare('INSERT INTO users VALUES (?,?)').run('p13', JSON.stringify({ id: 'p13', studentId: '2300010001', name: '甲' }));
    mem.prepare('INSERT INTO users VALUES (?,?)').run('p_9f8e7d6c', JSON.stringify({ id: 'p_9f8e7d6c', studentId: '2699000001', name: '代理键' }));
    mem.exec('CREATE TABLE activities (id TEXT PRIMARY KEY, data TEXT NOT NULL)');
    mem.prepare('INSERT INTO activities VALUES (?,?)').run('act-x', JSON.stringify({
      id: 'act-x',
      agenda: [{ personStages: { p6: '发展对象' } }],
      audiencePersons: [17],
      reads: ['p13'],
    }));
    migratePersonIdsToStudentNumbers(mem);
    const act = JSON.parse(mem.prepare('SELECT data FROM activities WHERE id = ?').get('act-x').data);
    assert.deepEqual(Object.keys(act.agenda[0].personStages), ['2400012350'], 'personStages 的键已迁移');
    assert.deepEqual(act.audiencePersons, ['2500010003'], '数字型人员 id 已归一为学号');
    assert.deepEqual(act.reads, ['2300010001'], 'reads 值已迁移');
    assert.ok(mem.prepare('SELECT 1 FROM users WHERE id = ?').get('2699000001'), 'p_<uuid> 按 studentId 归一');
  } finally { mem.close(); }
});

test('R3-09 v7 迁移：目标主键冲突 → 列清单且不写库', () => {
  const mem = new Database(':memory:');
  try {
    mem.exec('CREATE TABLE users (id TEXT PRIMARY KEY, data TEXT NOT NULL)');
    mem.prepare('INSERT INTO users VALUES (?,?)').run('p13', JSON.stringify({ id: 'p13', studentId: '2300010001', name: '旧' }));
    mem.prepare('INSERT INTO users VALUES (?,?)').run('2300010001', JSON.stringify({ id: '2300010001', studentId: '2300010001', name: '新' }));
    assert.throws(() => migratePersonIdsToStudentNumbers(mem), /预检失败|目标主键已存在/, '冲突须显式报错');
    assert.ok(mem.prepare('SELECT 1 FROM users WHERE id = ?').get('p13'), '失败后旧行原样保留（未半写）');
    assert.ok(mem.prepare('SELECT 1 FROM users WHERE id = ?').get('2300010001'), '失败后新行原样保留');
  } finally { mem.close(); }
});
