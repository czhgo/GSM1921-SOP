// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  server/test/branch-visit-readonly.test.mjs —— T14 党委进入支部（只读 / 留痕 / 退出）
//
//  由来：`.trae/specs/close-six-dim-gaps/spec.md`「党委台进入支部（只读、留痕、可退出）」
//   与「已裁定」Q10/Q13/Q14；设计判据见 `ARCHITECTURE_EVOLUTION §10.6–10.10`。
//
//  判据（结果门禁，非静态守卫）：
//    ① 未进入：`/bootstrap.viewContext` 为 null，写入按矩阵可用（N=1 行为不变）；
//    ② 进入后：任一写请求 403 且 body 含 `readOnly: true`（服务端强制，不靠前端禁用）；
//    ③ 留痕可查：谁 / 何时 / 哪个支部，且 `/bootstrap.viewContext` 同形；
//    ④ 同一 token 不能开第二条未退出记录（409，留痕只有一条）；
//    ⑤ 退出后写能力恢复、上下文清空；重复退出幂等拒绝；
//    ⑥ 入口单一路径（静态）：支部只读视图的 URL 只由共享入口构造，
//       支部配置页的旧锚点也必须带 `.branch-readonly-enter` 并绑定同一进入流程
//       （否则会出现「跳页了但没留痕、服务端只读门不生效」的旁路）。
//
//  库为 `:memory:`，不落运行库；不依赖外部 :3000。
// ════════════════════════════════════════════════════════════════
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { createApp } from '../app.js';

const STAFF_ID = '9000000001';
const SECRETARY_ID = '8100000001';

let app;
let server;
let base;
let db;
let staffToken = '';

const write = (table, row) => db.prepare(`INSERT OR REPLACE INTO ${table} (id, data) VALUES (?, ?)`)
  .run(row.id, JSON.stringify(row));

async function request(token, path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(`${base}${path}`, { ...options, headers });
  const text = await response.text();
  let body = text;
  try { body = JSON.parse(text); } catch { /* 非 JSON 原样返回 */ }
  return { response, body };
}
const get = (token, path) => request(token, path);
const post = (token, path, payload) => request(token, path, { method: 'POST', body: JSON.stringify(payload) });
const patch = (token, path, payload) => request(token, path, { method: 'PATCH', body: JSON.stringify(payload) });
const del = (token, path) => request(token, path, { method: 'DELETE' });

before(async () => {
  app = createApp({ dbPath: ':memory:' });
  db = app.locals.db;
  write('branches', { id: 'br-b1', name: '甲支部', status: 'active', secretaryId: SECRETARY_ID, config: {} });
  write('branches', { id: 'br-b2', name: '乙支部', status: 'active', config: {} });
  write('users', { id: STAFF_ID, studentId: STAFF_ID, name: '党委组织员', role: 'party-staff', branchId: 'pc-gsm' });
  write('users', { id: SECRETARY_ID, studentId: SECRETARY_ID, name: '甲支书', role: 'secretary', branchId: 'br-b1', developStage: '正式党员' });
  write('activities', { id: 'act-1', branchId: 'br-b1', title: '甲支部活动', status: 'active', date: '2026-11-01', organizer: SECRETARY_ID, assignments: [] });
  write('todos', { id: 'todo-1', branchId: 'br-b1', personId: SECRETARY_ID, role: 'secretary', title: '甲支部待办', status: 'pending' });

  server = app.listen(0);
  base = `http://127.0.0.1:${server.address().port}/api/v1`;
  const login = await post(null, '/auth/login', { personId: STAFF_ID, password: '123456' });
  assert.equal(login.response.status, 200, '党委账号应可登录');
  staffToken = login.body.token;
});

after(() => {
  server?.closeAllConnections?.();
  server?.close();
  db?.close();
});

/** 进入某支部：成功时返回留痕 id；失败直接让用例红 */
async function enterBranch(branchId) {
  const entered = await post(staffToken, '/committee/branch-visits', { branchId });
  assert.equal(entered.response.status, 201, `进入支部应成功：${JSON.stringify(entered.body)}`);
  assert.equal(entered.body.branchId, branchId);
  assert.ok(entered.body.visitId, '进入响应须给出留痕 id');
  return String(entered.body.visitId);
}

test('① 未进入支部：上下文为 null，写入按矩阵可用', async () => {
  const bootstrap = await get(staffToken, '/bootstrap?branchId=br-b1');
  assert.equal(bootstrap.response.status, 200);
  assert.equal(bootstrap.body.viewContext, null, '未进入时 viewContext 必须为 null');

  const activities = await get(staffToken, '/activities?branchId=br-b1');
  assert.deepEqual(activities.body.map((row) => row.id), ['act-1'], '未进入时读集合与改造前一致');

  const selfWrite = await patch(staffToken, `/members/${STAFF_ID}/profile`, { selfProfile: { extraNote: '未进入可写' } });
  assert.equal(selfWrite.response.status, 200, `未进入时本人自填应可写：${JSON.stringify(selfWrite.body)}`);
});

test('② 进入后任一写请求 403 且 body 含 readOnly:true（服务端强制）', async () => {
  const visitId = await enterBranch('br-b1');

  const created = await post(staffToken, '/activities', {
    id: 'act-blocked', branchId: 'br-b1', title: '被只读门拦住', status: 'active', date: '2026-11-02', organizer: SECRETARY_ID, assignments: [],
  });
  const updated = await patch(staffToken, '/activities/act-1', { title: '被只读门拦住' });
  const removed = await del(staffToken, '/todos/todo-1');
  const selfWrite = await patch(staffToken, `/members/${STAFF_ID}/profile`, { selfProfile: { extraNote: '进入后应被拒' } });
  for (const [label, result] of [['POST /activities', created], ['PATCH /activities/:id', updated], ['DELETE /todos/:id', removed], ['PATCH /members/:id/profile', selfWrite]]) {
    assert.equal(result.response.status, 403, `${label} 在查看态必须 403（实测 ${result.response.status}）`);
    assert.equal(result.body.readOnly, true, `${label} 的 403 body 必须含 readOnly:true`);
  }

  // 读口不受影响；被拒的写没有落库
  const activities = await get(staffToken, '/activities?branchId=br-b1');
  assert.equal(activities.response.status, 200, '查看态仍可读');
  assert.deepEqual(activities.body.map((row) => row.id), ['act-1'], '被拒的创建不得落库');
  const selfProfile = () => JSON.parse(db.prepare('SELECT data FROM users WHERE id = ?').get(STAFF_ID).data).selfProfile?.extraNote;
  assert.equal(selfProfile(), '未进入可写', '被拒的本人自填不得落库');

  // 留痕可查：谁 / 何时 / 哪个支部（同一 token、未退出）
  const row = db.prepare('SELECT * FROM branch_visits WHERE id = ?').get(visitId);
  assert.ok(row, '留痕行必须存在');
  assert.equal(row.branch_id, 'br-b1');
  assert.equal(row.entered_by, STAFF_ID);
  assert.ok(row.entered_at, '留痕须记录进入时间');
  assert.equal(row.exited_at, null, '未退出时 exited_at 必须为空');
  assert.equal(row.token, staffToken, '留痕须绑定当前会话 token');

  const bootstrap = await get(staffToken, '/bootstrap?branchId=br-b1');
  assert.deepEqual(bootstrap.body.viewContext, {
    branchId: 'br-b1',
    branchName: '甲支部',
    enteredBy: STAFF_ID,
    visitId,
  }, 'bootstrap.viewContext 须与留痕同形');
});

test('③ 同一 token 不能开第二条未退出记录（409）', async () => {
  const second = await post(staffToken, '/committee/branch-visits', { branchId: 'br-b2' });
  assert.equal(second.response.status, 409, '同一 token 第二条未退出记录必须 409');
  const active = db.prepare('SELECT COUNT(1) AS c FROM branch_visits WHERE exited_at IS NULL AND token = ?').get(staffToken);
  assert.equal(active.c, 1, '同一 token 只允许一条未退出记录');
});

test('④ 非党委账号不能进入（写门＝党委层）', async () => {
  const login = await post(null, '/auth/login', { personId: SECRETARY_ID, password: '123456' });
  assert.equal(login.response.status, 200);
  const denied = await post(login.body.token, '/committee/branch-visits', { branchId: 'br-b1' });
  assert.equal(denied.response.status, 403, '支部账号进入党委查看口必须 403');
  assert.equal(db.prepare('SELECT COUNT(1) AS c FROM branch_visits WHERE entered_by = ?').get(SECRETARY_ID).c, 0);
});

test('⑤ 退出后写能力恢复、上下文清空；重复退出 409', async () => {
  const active = db.prepare('SELECT id FROM branch_visits WHERE exited_at IS NULL AND token = ?').get(staffToken);
  assert.ok(active?.id, '前置：应有一条未退出留痕');

  const exited = await patch(staffToken, `/committee/branch-visits/${active.id}`, {});
  assert.equal(exited.response.status, 200, `退出应成功：${JSON.stringify(exited.body)}`);
  assert.ok(exited.body.exitedAt, '退出响应须给出退出时间');
  const row = db.prepare('SELECT * FROM branch_visits WHERE id = ?').get(active.id);
  assert.ok(row.exited_at, '留痕行须置 exited_at');

  const bootstrap = await get(staffToken, '/bootstrap?branchId=br-b1');
  assert.equal(bootstrap.body.viewContext, null, '退出后上下文必须清空');

  const selfWrite = await patch(staffToken, `/members/${STAFF_ID}/profile`, { selfProfile: { extraNote: '退出后可写' } });
  assert.equal(selfWrite.response.status, 200, `退出后本人自填应恢复可写：${JSON.stringify(selfWrite.body)}`);
  const stored = JSON.parse(db.prepare('SELECT data FROM users WHERE id = ?').get(STAFF_ID).data);
  assert.equal(stored.selfProfile?.extraNote, '退出后可写', '退出后写入须真实落库');

  const again = await patch(staffToken, `/committee/branch-visits/${active.id}`, {});
  assert.equal(again.response.status, 409, '重复退出必须 409（不重复改写留痕）');
});

// ── ⑥ 入口单一路径（静态）────────────────────────────────────────────────
const DOCS_SRC = join(import.meta.dirname, '..', '..', 'docs', 'src');
const READONLY_URL_LITERAL = 'branch-readonly.html?branchId=';
const SHARED_ENTRY = 'services/core/branch-readonly-nav.js';
const CONFIG_ENTRY = 'entries/pages/branch-config-entry.js';

function walkJs(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walkJs(full, out);
    else if (name.endsWith('.js')) out.push(full);
  }
  return out;
}

test('⑥ 支部只读入口单一路径：配置页旧锚点走同一进入流程（先留痕再跳页）', () => {
  const hits = walkJs(DOCS_SRC)
    .filter((file) => readFileSync(file, 'utf8').includes(READONLY_URL_LITERAL))
    .map((file) => file.slice(DOCS_SRC.length + 1).replace(/\\/g, '/'))
    .sort();
  assert.ok(hits.includes(SHARED_ENTRY), `共享入口 ${SHARED_ENTRY} 必须构造只读视图 URL（抽取口径失效 ⇒ 本断言恒真）`);
  assert.deepEqual(hits, [CONFIG_ENTRY, SHARED_ENTRY].sort(),
    `以下文件自行拼接只读视图 URL（旁路：跳页但未必写留痕 / 未必触发服务端只读门）：${hits.join(' / ')}`);

  const config = readFileSync(join(DOCS_SRC, CONFIG_ENTRY), 'utf8');
  assert.match(config, /branch-readonly-enter/, '配置页的只读入口必须带 .branch-readonly-enter（走共享流程）');
  assert.match(config, /data-branch-id=/, '配置页的只读入口必须带 data-branch-id');
  assert.match(config, /bindBranchReadOnlyButtons\(/, '配置页必须绑定共享进入流程');

  const nav = readFileSync(join(DOCS_SRC, SHARED_ENTRY), 'utf8');
  assert.match(nav, /preventDefault/, '共享入口必须拦掉 <a href> 默认导航（否则先跳页、留痕未写）');
  assert.match(nav, /enterBranchView/, '共享入口必须先写留痕再跳页');
});
