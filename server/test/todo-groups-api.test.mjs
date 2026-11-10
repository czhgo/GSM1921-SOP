// server/test/todo-groups-api.test.mjs — 待办「实时派生组」服务端只读端点（批次 532 · B-500-7 最小 Plan B）
//
// 覆盖（端点 = `GET /api/v1/todo-groups`，实现 `server/routes/todo-groups.js`）：
//   ① 未登录 401（读口一律要登录，与 `GET /todos` 同门）；
//   ② 跨人 / 跨角色读取被过滤（到人视图只给本人、角色视图只给本角色，403）；
//   ③ 返回形状稳定（顶层 5 键、组内 11 键、类型固定）；`count` 按组口径（member-confirm 另含议程批次行）；
//   ④ 同 groupKey 不重复（防同组双卡 / 重复计数）；
//   ⑤ 7 类实时组已服务端化 ⇒ `unsupported` 清空，已算组不再标不支持。
//
// 自包含：createApp(:memory:) + seedDatabase（不连 3000）；需 `DISABLE_PASSWORD_CHECK=1`。
// ⚠ 本文件由主代理统一登记 `test-tier-registry.mjs`（本批未登记，`test-tier-guard` 待主代理同批改准）。

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../app.js';
import { seedDatabase } from '../seed.js';
import { today } from '../services/reporting.js';
// 客户端有效策略的同源两步（批次 541 · D-2）：净化 = config-clean（与 server 同 import）；合并 = effectivePolicyWith
import { sanitizeConfigPolicyOverrides } from '../../docs/src/services/branch/config-clean.js?v=20261110b';
import { effectivePolicyWith } from '../../docs/src/core/domain/policy-defaults.js?v=20261110b';
// 标准答案（客户端纯派生）与服务端同一份函数：改阈值后条数必须同步变化（D-2 / D-3）
import {
  deriveAttendanceRemindGroup,
  deriveInspectionRemindGroup,
  deriveSemesterDetainedRemindGroup,
  deriveInspectionConfirmGroup,
} from '../../docs/src/core/domain/todo-derive.js?v=20261110b';

const ORG_COMMISSIONER_ID = '2400012355'; // 高翔宇（组织委员，br-b1）
const SECRETARY_ID = '2300010001';        // 储子禾（支书，br-b1）
const PARTICIPANT_ID = '2400012349';      // 宋佳宁（正式党员 / participant，br-b1；成员台登录人）
const DISC_COMMISSIONER_ID = '2400012354'; // 董建军（纪检委员，br-b1）
const FIXTURE_MEMBER_ID = 'test-dev-1';   // 期满的预备党员（造发展节点提醒用）

const GROUP_KEYS = ['groupKey', 'domain', 'actionKey', 'title', 'category', 'actionType', 'actionData', 'deadline', 'flow', 'count', 'items'];
// 7 类实时组落地后无「不支持」清单（字段与形状保留）
const UNSUPPORTED_EXPECTED = [];
// count 唯一口径（批次 539）：`count === items.length`；议程派生行数只作展示补充 `agendaCount`，不并入 count

let app, server, base;

before(async () => {
  app = createApp({ dbPath: ':memory:' });
  const db = app.locals.db;
  await seedDatabase(db);
  // 造一名「预备期满」成员：developStageSince 远早于今天 ⇒ 发展节点提醒必有 1 条；
  //   该 id 无考察记录 ⇒ 半年考察提醒同时命中（本文件只用它们验证形状与去重，不核制度判据）。
  const fixture = {
    id: FIXTURE_MEMBER_ID,
    name: '测试预备党员',
    studentId: FIXTURE_MEMBER_ID,
    partyGroup: '第一党小组',
    developStage: '预备党员',
    developStageSince: '2024-01-01',
    role: 'participant',
    branchId: 'br-b1',
  };
  db.prepare('INSERT OR REPLACE INTO users (id, data) VALUES (?, ?)')
    .run(fixture.id, JSON.stringify(fixture));
  server = app.listen(0);
  base = `http://127.0.0.1:${server.address().port}`;
});

after(() => {
  server.closeAllConnections?.();
  return new Promise((resolve) => server.close(resolve));
});

async function loginAt(baseUrl, personId) {
  const res = await fetch(`${baseUrl}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ personId }),
  });
  assert.equal(res.status, 200, `登录失败 ${personId}`);
  return res.json();
}

async function login(personId) {
  return loginAt(base, personId);
}

function authHeaders(token) {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

async function fetchGroups(token, query = '') {
  const res = await fetch(`${base}/api/v1/todo-groups${query}`, { headers: token ? authHeaders(token) : {} });
  const body = await res.json().catch(() => null);
  return { status: res.status, body };
}

test('① 未登录 → 401（读口与 GET /todos 同门）', async () => {
  const { status, body } = await fetchGroups(null, '?role=org-commissioner');
  assert.equal(status, 401, '未登录不得读取待办派生视图');
  assert.ok(body && typeof body.error === 'string', '401 带 error 文案');
});

test('② 跨人 / 跨角色读取被过滤（到人只给本人、角色只给本角色）', async () => {
  const { token } = await login(ORG_COMMISSIONER_ID);

  // 跨角色：组织委员请求「支书」视图 → 403（与 _canReadTodoRow：角色行按当前角色可见 同口径）
  const crossRole = await fetchGroups(token, '?role=secretary');
  assert.equal(crossRole.status, 403, '不得用 role 参数读其他角色的待办视图');

  // 跨人：请求他人 personId → 403（到人待办只给本人）
  const crossPerson = await fetchGroups(token, `?personId=${SECRETARY_ID}`);
  assert.equal(crossPerson.status, 403, '不得读取他人的个人待办视图');

  // 缺省 → 落到本人：personId 回显本人、role 回显本角色
  const own = await fetchGroups(token);
  assert.equal(own.status, 200, '本人视图可读');
  assert.equal(own.body.personId, ORG_COMMISSIONER_ID, 'personId 缺省＝本人');
  assert.equal(own.body.role, 'org-commissioner', 'role 缺省＝本角色');
});

test('③ 返回形状稳定（顶层 5 键 / 组内 11 键 / 类型固定）', async () => {
  const { token } = await login(ORG_COMMISSIONER_ID);
  const { status, body } = await fetchGroups(token, `?role=org-commissioner&personId=${ORG_COMMISSIONER_ID}`);
  assert.equal(status, 200);
  assert.deepEqual(Object.keys(body).sort(), ['generatedAt', 'groups', 'personId', 'role', 'unsupported'].sort());
  assert.ok(Array.isArray(body.groups), 'groups 为数组');
  assert.ok(Array.isArray(body.unsupported), 'unsupported 为数组');
  assert.ok(!Number.isNaN(Date.parse(body.generatedAt)), 'generatedAt 可解析为时间');
  assert.ok(body.groups.length > 0, '构造数据下至少应有一组（发展节点提醒）');

  for (const g of body.groups) {
    assert.deepEqual(Object.keys(g).sort(), GROUP_KEYS.slice().sort(), `组字段集合固定：${g.groupKey}`);
    assert.equal(typeof g.groupKey, 'string');
    assert.equal(typeof g.title, 'string');
    assert.equal(typeof g.domain, 'string');
    assert.ok(Array.isArray(g.items), `${g.groupKey}.items 为数组`);
    assert.equal(typeof g.count, 'number');
    // count 唯一口径：`count === items.length`（批次 539；议程派生行数不并入）
    assert.equal(g.count, g.items.length, `${g.groupKey}.count 必须等于 items 长度`);
  }

  // 支书视图覆盖 member-confirm：count 只数名册行；议程派生行数由展示补充 `agendaCount` 承载
  const { token: secretaryToken } = await login(SECRETARY_ID);
  const secretary = await fetchGroups(secretaryToken, `?role=secretary`);
  assert.equal(secretary.status, 200);
  const memberConfirm = secretary.body.groups.find((g) => g.actionKey === 'member-confirm');
  assert.ok(memberConfirm, '支书视图应产出成员变更待确认组');
  assert.equal(memberConfirm.count, memberConfirm.items.length,
    'member-confirm.count = 名册待确认行数（议程派生批次行另计 agendaCount，不并入 count）');

  // 形态抽查：发展节点提醒（域＝成员发展；条目 id 形态 dev-<personId>）
  const dev = body.groups.find((g) => g.groupKey === 'org-commissioner:develop-node-remind');
  assert.ok(dev, '应产出发展节点提醒组');
  assert.equal(dev.domain, 'member-dev');
  assert.equal(dev.actionKey, 'develop-node-remind');
  assert.ok(dev.items.some((it) => it.id === `dev-${FIXTURE_MEMBER_ID}`), '含期满预备党员条目');
});

test('④ 同 groupKey 不重复（合并不重复计数）', async () => {
  const { token } = await login(ORG_COMMISSIONER_ID);
  const { body } = await fetchGroups(token);
  const keys = body.groups.map((g) => g.groupKey);
  assert.equal(new Set(keys).size, keys.length, `groups 出现重复 groupKey：${keys.join(',')}`);
  const total = body.groups.reduce((sum, g) => sum + g.count, 0);
  // 汇总计数＝各组合计（count 唯一口径＝items.length，无额外批次行重复累加）
  const expected = body.groups.reduce((sum, g) => sum + g.items.length, 0);
  assert.equal(total, expected, '汇总计数＝各组合计（count === items.length），无重复累加');
});

test('⑤ 7 类实时组已服务端化：unsupported 清空，已算组不再标不支持', async () => {
  const { token } = await login(ORG_COMMISSIONER_ID);
  const { body } = await fetchGroups(token);
  assert.deepEqual(body.unsupported, UNSUPPORTED_EXPECTED, '7 类实时组落地后 unsupported 为空清单');
  const computed = new Set(body.groups.map((g) => g.actionKey).filter(Boolean));
  for (const key of body.unsupported) {
    assert.ok(!computed.has(key), `${key} 已在服务端算，不得再标不支持`);
  }
  // 反空转：组织委员台的两类实时组必须真的产出（否则「清空 unsupported」可被空集蒙混）
  assert.ok(computed.has('inspection-remind'), '组织委员台应产出考察超期未确认组');
  assert.ok(computed.has('member-approve'), '组织委员台应产出成员变更待审批组');
});

test('⑥ 页面 key 归一：participant 传 role=visitor 可读本人视图，跨角色仍 403', async () => {
  const { token } = await login(PARTICIPANT_ID);

  // 成员台（页面 key = 'visitor'）只服务 participant ⇒ 归一到真实角色，读本人视图 200
  const visitorView = await fetchGroups(token, `?role=visitor&personId=${PARTICIPANT_ID}`);
  assert.equal(visitorView.status, 200, 'participant 账号传页面 key visitor 应可读本人视图');
  assert.equal(visitorView.body.role, 'participant', 'role 回显真实角色，不回显页面 key');
  assert.equal(visitorView.body.personId, PARTICIPANT_ID, 'personId 回显本人');

  // 归一只发生在 visitor → participant，不放宽读权限：跨角色仍 403
  const crossRole = await fetchGroups(token, '?role=secretary');
  assert.equal(crossRole.status, 403, 'participant 不得借页面 key 读取其他角色的待办视图');
});

// ════════════════════════════════════════════════════════════════
//  ⑦ P0：待办为空不得吞掉「发展节点 / 半年考察」提醒
// ════════════════════════════════════════════════════════════════

test('⑦ P0：空 todos 库 + 有成员发展数据 ⇒ 仍返回发展节点 / 半年考察组；无数据 ⇒ 不产空组', async () => {
  // ① 空 todos、有发展数据：仍须产出两张组卡（前置门＝数据存在性，不是待办行）
  const app1 = createApp({ dbPath: ':memory:' });
  const db1 = app1.locals.db;
  await seedDatabase(db1);
  db1.prepare('DELETE FROM todos').run();
  assert.equal(db1.prepare('SELECT COUNT(*) c FROM todos').get().c, 0, '前置：todos 必须为空');
  db1.prepare('INSERT OR REPLACE INTO users (id, data) VALUES (?, ?)').run('p0-dev', JSON.stringify({
    id: 'p0-dev', name: 'P0 预备党员', studentId: 'p0-dev', partyGroup: '第一党小组',
    developStage: '预备党员', developStageSince: '2024-01-01', role: 'participant', branchId: 'br-b1',
  }));
  const server1 = app1.listen(0);
  const base1 = `http://127.0.0.1:${server1.address().port}`;
  try {
    const { token } = await loginAt(base1, ORG_COMMISSIONER_ID);
    const res = await fetch(`${base1}/api/v1/todo-groups?role=org-commissioner`, { headers: authHeaders(token) });
    assert.equal(res.status, 200);
    const body = await res.json();
    const dev = body.groups.find((g) => g.actionKey === 'develop-node-remind');
    const halfYear = body.groups.find((g) => g.actionKey === 'half-year-inspection-remind');
    assert.ok(dev, '空 todos 库不得吞掉发展节点提醒');
    assert.ok(dev.items.some((it) => it.id === 'dev-p0-dev'), '发展节点条目应含期满成员');
    assert.equal(dev.count, dev.items.length, 'count 与 items 一致');
    assert.ok(halfYear, '空 todos 库不得吞掉半年考察提醒');
    assert.ok(halfYear.items.some((it) => it.id === 'halfyear-p0-dev'), '半年考察条目应含培养期成员');
    assert.equal(halfYear.count, halfYear.items.length, 'count 与 items 一致');
  } finally {
    server1.closeAllConnections?.();
    await new Promise((r) => server1.close(r));
    db1.close();
  }

  // ② 无发展数据：不得产出空组（前置门不得退化成「恒产出」）
  const app2 = createApp({ dbPath: ':memory:' });
  const db2 = app2.locals.db;
  await seedDatabase(db2);
  db2.prepare('DELETE FROM todos').run();
  db2.prepare('DELETE FROM users').run();
  db2.prepare('INSERT INTO users (id, data) VALUES (?, ?)').run('p0-org', JSON.stringify({
    id: 'p0-org', name: '无发展阶段组织委员', studentId: 'p0-org', role: 'org-commissioner', branchId: 'br-b1',
  }));
  const server2 = app2.listen(0);
  const base2 = `http://127.0.0.1:${server2.address().port}`;
  try {
    const { token } = await loginAt(base2, 'p0-org');
    const res = await fetch(`${base2}/api/v1/todo-groups?role=org-commissioner`, { headers: authHeaders(token) });
    assert.equal(res.status, 200);
    const body = await res.json();
    const keys = body.groups.map((g) => g.actionKey);
    assert.ok(!keys.includes('develop-node-remind'), '无 developStage 数据不得产出发展节点组');
    assert.ok(!keys.includes('half-year-inspection-remind'), '无 developStage 数据不得产出半年考察组');
  } finally {
    server2.closeAllConnections?.();
    await new Promise((r) => server2.close(r));
    db2.close();
  }
});

// ════════════════════════════════════════════════════════════════
//  ⑧ 纪检确认队列服务端派生 + 计算单一源守卫
// ════════════════════════════════════════════════════════════════

test('⑧ 纪检台「考勤 / 考察待确认」由服务端派生，count === items.length', async () => {
  const { token: discToken } = await login(DISC_COMMISSIONER_ID);
  const { status, body } = await fetchGroups(discToken, '?role=disc-commissioner');
  assert.equal(status, 200);
  const keys = body.groups.map((g) => g.actionKey);
  // 种子库有未确认考勤 / 未确认考察 ⇒ 两组应真实产出（非空转）
  assert.ok(keys.includes('attendance-confirm'), '纪检视图应产出考勤待确认组');
  assert.ok(keys.includes('inspection-confirm'), '纪检视图应产出考察待确认组');
  for (const g of body.groups) assert.equal(g.count, g.items.length, `${g.groupKey}.count === items.length`);
  // 客户端不再自行计算：服务端已接管键必须出现在壳的 SERVER_OWNED_ACTION_KEYS
  const { SERVER_OWNED_ACTION_KEYS } = await import('../../docs/src/components/record/todo-tab-shell.js?v=20261110b');
  for (const key of ['attendance-confirm', 'inspection-confirm']) {
    assert.ok(SERVER_OWNED_ACTION_KEYS.has(key), `客户端壳应声明服务端已接管：${key}`);
  }
});

test('⑨ 计算单一源守卫：路由不得 import mockDB / SEED_TODOS；api 形态不得调用演示种子', async () => {
  const { readFileSync } = await import('node:fs');
  const src = readFileSync(new URL('../routes/todo-groups.js', import.meta.url), 'utf8');
  assert.doesNotMatch(src, /mockDB/, '服务端派生路由不得 import mockDB（会退回客户端数据面）');
  assert.doesNotMatch(src, /SEED_TODOS/, '服务端派生路由不得引用 SEED_TODOS（演示种子不得进入 API 形态）');
  // 运行时：任何组的条目 id 都不得是演示种子 id 形态
  const { token } = await login(ORG_COMMISSIONER_ID);
  const { body } = await fetchGroups(token);
  const demoIdRe = /^(todo_seed_\d+|mc-seed-\d+|mcr-seed-[a-z]+)$/;
  const leaked = body.groups.flatMap((g) => (g.items || []).map((it) => String(it.id))).filter((id) => demoIdRe.test(id));
  // 种子库本就有 mc-seed-1 / mcr-seed-roster（演示数据），本守卫只钉「路由自身不生成 todo_seed_*」
  assert.ok(!leaked.some((id) => id.startsWith('todo_seed_')), `API 派生不得凭空生成演示待办：${leaked.join(',')}`);
});

// ════════════════════════════════════════════════════════════════
//  ⑩ P1（批次 541 · D-2）：支部 policyOverrides 必须注入服务端派生
// ════════════════════════════════════════════════════════════════

/** 本地日历日 ±N 天（'YYYY-MM-DD'；不用 toISOString，避免东八区回退一天） */
function shiftDay(baseDay, n) {
  const d = new Date(`${baseDay}T00:00:00`);
  d.setDate(d.getDate() + n);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

test('⑩ 支部 policyOverrides 生效：改阈值后服务端组条数与客户端有效策略逐值一致（D-2）', async () => {
  const app3 = createApp({ dbPath: ':memory:' });
  const db3 = app3.locals.db;
  await seedDatabase(db3);
  const day = today();

  // 两条「已结束、无考勤记录」的党课：5 天前 / 3 天前 ⇒ 默认阈值（1 天）两条都命中
  const activities = [
    { id: 'p-att-5', title: '五天前党课', type: '党课', status: 'completed', date: shiftDay(day, -5), branchId: 'br-b1' },
    { id: 'p-att-3', title: '三天前党课', type: '党课', status: 'completed', date: shiftDay(day, -3), branchId: 'br-b1' },
  ];
  for (const a of activities) {
    db3.prepare('INSERT OR REPLACE INTO activities (id, data) VALUES (?, ?)').run(a.id, JSON.stringify(a));
  }
  const members = () => db3.prepare('SELECT data FROM users').all().map((r) => JSON.parse(r.data))
    .filter((u) => (u.branchId || 'br-b1') === 'br-b1' && u.transferOut !== true);
  const db3Activities = () => db3.prepare('SELECT data FROM activities').all().map((r) => JSON.parse(r.data))
    .filter((a) => (a.branchId || 'br-b1') === 'br-b1');
  const db3Attendances = () => db3.prepare('SELECT data FROM attendances').all().map((r) => JSON.parse(r.data))
    .filter((r) => (r.branchId || 'br-b1') === 'br-b1');
  const inspectionRecords = () => db3.prepare('SELECT data FROM inspections').all().map((r) => JSON.parse(r.data))
    .filter((r) => (r.branchId || 'br-b1') === 'br-b1');

  /** 直接写支部 config.policyOverrides（本用例只核读侧生效，不跑配置写门） */
  const setOverrides = (policyOverrides) => {
    const row = db3.prepare('SELECT data FROM branches WHERE id = ?').get('br-b1');
    const branch = JSON.parse(row.data);
    branch.config = { ...(branch.config || {}), policyOverrides };
    db3.prepare('INSERT OR REPLACE INTO branches (id, data) VALUES (?, ?)').run('br-b1', JSON.stringify(branch));
  };

  const app3Server = app3.listen(0);
  const base3 = `http://127.0.0.1:${app3Server.address().port}`;
  const pool = async () => {
    const { token } = await loginAt(base3, SECRETARY_ID);
    const res = await fetch(`${base3}/api/v1/todo-groups?role=secretary`, { headers: authHeaders(token) });
    assert.equal(res.status, 200, 'GET /todo-groups 失败');
    return res.json();
  };
  const groupOf = (body, key) => body.groups.find((g) => g.actionKey === key) || null;
  const countOf = (body, key) => {
    const g = groupOf(body, key);
    return g ? g.count : null;
  };

  try {
    // ① 缺省（无 overrides）：服务端条数 ＝ 客户端纯派生条数，且夹具两条都在命中集里
    const defaultPolicy = effectivePolicyWith(sanitizeConfigPolicyOverrides(null));
    const goldenDefault = deriveAttendanceRemindGroup({
      activities: db3Activities(), attendanceRecords: db3Attendances(), today: day, policy: defaultPolicy.attendance,
    });
    const defaultIds = goldenDefault.items.map((it) => it.id);
    assert.ok(defaultIds.includes('p-att-5') && defaultIds.includes('p-att-3'),
      '默认阈值（1 天）下 5 / 3 天前的两条夹具都应命中');
    const bodyDefault = await pool();
    assert.equal(countOf(bodyDefault, 'attendance-remind'), goldenDefault.count,
      '缺省阈值下服务端与客户端条数不一致（policy 未注入或注入错值）');

    // ② 改支部阈值：考勤 → 4 天；考察 → 90 天；滞留复核窗 → 整年
    const overrides = {
      attendance: { entryRemindDays: 4 },
      inspection: { overdueDays: 90 },
      memberConfirmation: { semesterDetainedWindows: [[1, 1, 12, 31]] },
    };
    setOverrides(overrides);
    const effective = effectivePolicyWith(sanitizeConfigPolicyOverrides(overrides));
    assert.equal(effective.attendance.entryRemindDays, 4, '净化 + 合并后阈值应为 4（非出厂默认）');
    const bodyAfter = await pool();

    // ②-a 考勤：3 天前那条随阈值调高退出，条数与客户端同值且低于缺省（非恒等比较）
    const goldenAttendance = deriveAttendanceRemindGroup({
      activities: db3Activities(), attendanceRecords: db3Attendances(), today: day, policy: effective.attendance,
    });
    const afterIds = goldenAttendance.items.map((it) => it.id);
    assert.ok(afterIds.includes('p-att-5'), '阈值 4 天时 5 天前那条仍应命中');
    assert.ok(!afterIds.includes('p-att-3'), '阈值 4 天时 3 天前那条必须退出');
    assert.equal(countOf(bodyAfter, 'attendance-remind'), goldenAttendance.count, '改阈值后服务端与客户端条数不一致');
    assert.ok(countOf(bodyAfter, 'attendance-remind') < goldenDefault.count, '阈值调高后条数必须下降（防恒等假绿）');

    // ②-b 考察：阈值 90 天下的超期集合与客户端同值
    const goldenInspection = deriveInspectionRemindGroup({
      inspectionRecords: inspectionRecords(), persons: members(), today: day, policy: effective.inspection,
    });
    assert.equal(countOf(bodyAfter, 'inspection-remind'), goldenInspection ? goldenInspection.count : null,
      '考察超期阈值未按支部覆盖生效');

    // ②-c 学期末滞留：整年复核窗下必须有组，且条数与客户端同值
    const goldenSemester = deriveSemesterDetainedRemindGroup({
      members: members(), today: day, windows: effective.memberConfirmation.semesterDetainedWindows,
    });
    assert.ok(goldenSemester && goldenSemester.count > 0, '整年窗 + 种子滞留成员应产出提醒组（夹具非空转）');
    assert.equal(countOf(bodyAfter, 'semester-detained-remind'), goldenSemester.count,
      '滞留复核窗未按支部覆盖生效');
  } finally {
    app3Server.closeAllConnections?.();
    await new Promise((r) => app3Server.close(r));
    db3.close();
  }
});

// ════════════════════════════════════════════════════════════════
//  ⑪ P1（批次 541 · D-3）：专班考察来源类型透传 + 落点非空
// ════════════════════════════════════════════════════════════════

test('⑪ 专班考察项：sourceType 透传 taskforce，落点 sourceId 非空（D-3）', async () => {
  // 专班考察记录形态（组织台建档）：无 activityId，只有 workgroupId / taskforceId 快照
  const db = app.locals.db;
  db.prepare('INSERT OR REPLACE INTO inspections (id, data) VALUES (?, ?)').run('p-insp-tf-1', JSON.stringify({
    id: 'p-insp-tf-1', branchId: 'br-b1', sourceType: 'taskforce', activityId: null,
    workgroupId: 'wg-taskforce-p-tf-1', taskforceId: 'p-tf-1', sourceName: '测试专班',
    personId: PARTICIPANT_ID, recordedBy: ORG_COMMISSIONER_ID,
    recordedAt: '2026-10-01T00:00:00.000Z', status: 'pending',
  }));

  const { token } = await login(DISC_COMMISSIONER_ID);
  const { status, body } = await fetchGroups(token, '?role=disc-commissioner');
  assert.equal(status, 200);
  const group = body.groups.find((g) => g.actionKey === 'inspection-confirm');
  assert.ok(group, '纪检台应产出考察待确认组');
  const item = group.items.find((it) => it.id === 'p-insp-tf-1');
  assert.ok(item, '专班考察行应进待确认组');
  assert.equal(item.sourceType, 'taskforce', 'sourceType 不得被压成 activity（否则跳转落到活动详情）');
  assert.equal(item.sourceId, 'p-tf-1', '无 activityId 时落点应取专班 id（非空）');

  // 纯函数同口径（不依赖端点）：活动型记录仍落活动 id（须给活跃活动，否则活动型记录被过滤）
  const pure = deriveInspectionConfirmGroup({
    activities: [{ id: 'act-x', archived: false }],
    inspectionRecords: [
      { id: 'p-tf', sourceType: 'taskforce', activityId: null, taskforceId: 'p-tf-1', personId: 'u1', status: 'pending' },
      { id: 'p-act', sourceType: 'activity', activityId: 'act-x', personId: 'u1', status: 'pending' },
    ],
    persons: [],
  });
  const tf = pure.items.find((it) => it.id === 'p-tf');
  const act = pure.items.find((it) => it.id === 'p-act');
  assert.equal(tf.sourceType, 'taskforce');
  assert.equal(tf.sourceId, 'p-tf-1');
  assert.equal(act.sourceType, 'activity');
  assert.equal(act.sourceId, 'act-x');
});
