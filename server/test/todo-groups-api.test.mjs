// server/test/todo-groups-api.test.mjs — 待办「实时派生组」服务端只读端点（批次 532 · B-500-7 最小 Plan B）
//
// 覆盖（端点 = `GET /api/v1/todo-groups`，实现 `server/routes/todo-groups.js`）：
//   ① 未登录 401（读口一律要登录，与 `GET /todos` 同门）；
//   ② 跨人 / 跨角色读取被过滤（到人视图只给本人、角色视图只给本角色，403）；
//   ③ 返回形状稳定（顶层 5 键、组内 11 键、类型固定）；
//   ④ 同 groupKey 不重复（防同组双卡 / 重复计数）；
//   ⑤ 本期不支持的实时组逐键标注在 `unsupported`，且与已算组键不重叠。
//
// 自包含：createApp(:memory:) + seedDatabase（不连 3000）；需 `DISABLE_PASSWORD_CHECK=1`。
// ⚠ 本文件由主代理统一登记 `test-tier-registry.mjs`（本批未登记，`test-tier-guard` 待主代理同批改准）。

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../app.js';
import { seedDatabase } from '../seed.js';

const ORG_COMMISSIONER_ID = '2400012355'; // 高翔宇（组织委员，br-b1）
const SECRETARY_ID = '2300010001';        // 储子禾（支书，br-b1）
const FIXTURE_MEMBER_ID = 'test-dev-1';   // 期满的预备党员（造发展节点提醒用）

const GROUP_KEYS = ['groupKey', 'domain', 'actionKey', 'title', 'category', 'actionType', 'actionData', 'deadline', 'flow', 'count', 'items'];
const UNSUPPORTED_EXPECTED = [
  'attendance-remind', 'inspection-remind', 'resolution-followup-remind',
  'member-confirm', 'member-approve', 'semester-detained-remind', 'taskforce-authorize',
];

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
    assert.equal(g.count, g.items.length, `${g.groupKey}.count 与 items 长度一致`);
  }

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
  assert.equal(total, body.groups.reduce((sum, g) => sum + g.items.length, 0), '汇总计数＝各组合计，无重复累加');
});

test('⑤ 不支持的实时组逐键标注在 unsupported，且与已算组不重叠', async () => {
  const { token } = await login(ORG_COMMISSIONER_ID);
  const { body } = await fetchGroups(token);
  assert.deepEqual(body.unsupported, UNSUPPORTED_EXPECTED, 'unsupported 为本期能力边界的静态清单');
  const computed = new Set(body.groups.map((g) => g.actionKey).filter(Boolean));
  for (const key of body.unsupported) {
    assert.ok(!computed.has(key), `${key} 已在服务端算，不得再标不支持`);
  }
});
