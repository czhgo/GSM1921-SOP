// role: [工程师]+[AI]
// server/test/todo-role-write-gate.test.mjs — B-499-3 服务端 todo-row 写门回归（批次 500）
// 覆盖（HTTP 直连，自托管内存库）：
//   · participant 快照新增 role:'prop-commissioner' 行 → 403，且同批 notices / activities 不落库；
//   · participant 上传带 personId 的 visitor 行 → 200（到人归属放行）；
//   · participant 上传 role:'visitor' 且无 personId 的历史形态 → 403（不稳定跨角色行）；
//   · 本人行 + 他人行同批 → 403 且整批不写（不是部分写入）。
// 运行：node --test test/todo-role-write-gate.test.mjs（server 目录）
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../app.js';
import { seedDatabase } from '../seed.js';

const A = '2400012347'; // 何晓峰（participant）
const B = '2400012349'; // 宋佳宁（participant）

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
const dbRow = (table, id) => {
  const row = db.prepare(`SELECT data FROM ${table} WHERE id = ?`).get(id);
  return row ? JSON.parse(row.data) : null;
};
const insert = (table, row) => db.prepare(`INSERT OR REPLACE INTO ${table} (id, data) VALUES (?, ?)`).run(row.id, JSON.stringify(row));

test('S1 participant 快照新增 prop-commissioner 角色待办 → 403，同批 notices / activities 不落库', async () => {
  const token = await login(A);
  const v = await versions(token);
  const forbiddenTodo = {
    id: 'td-b500-prop', role: 'prop-commissioner', title: '越权角色待办',
    status: 'pending', category: 'submit', branchId: 'br-b1',
  };
  // 私信：全体成员可发（若单独提交应放行）；活动：新行须走语义接口（本批被 scope 门拒绝）。
  // 二者与非法待办同批 ⇒ 只要整批被拒，就不得有任何部分写入。
  const message = {
    id: 'ntc-b500-msg', title: '私信', content: 'x', noticeType: 'message',
    fromPersonId: A, audiencePersons: [B], publishDate: '2026-10-21', branchId: 'br-b1',
  };
  const activity = {
    id: 'act-b500-denied', title: '越权活动', date: '2099-01-01', status: 'draft', branchId: 'br-b1',
  };
  const res = await snapshot(token, {
    todos: [forbiddenTodo],
    notices: [message],
    activities: [activity],
    _versions: {
      todos: v.todos || 0, notices: v.notices || 0, activities: v.activities || 0,
    },
  });
  assert.equal(res.status, 403, `普通成员不得写其他角色待办：${await res.clone().text()}`);
  assert.equal(dbRow('todos', forbiddenTodo.id), null, '★ 被拒的待办不得落库');
  assert.equal(dbRow('notices', message.id), null, '★ 同批通知不得落库');
  assert.equal(dbRow('activities', activity.id), null, '★ 同批活动不得落库');
});

test('S2 participant 上传带 personId 的 visitor 待办 → 200（到人归属放行）', async () => {
  const token = await login(A);
  const v = await versions(token);
  const row = {
    id: 'td-b500-visitor', role: 'visitor', personId: A, title: '阅读通知「活动预告」',
    description: '', category: 'notice', actionKey: 'notice-read', status: 'pending',
    sourceType: 'notice', sourceId: 'ntc-b500-visitor', branchId: 'br-b1',
  };
  const res = await snapshot(token, { todos: [row], _versions: { todos: v.todos || 0 } });
  assert.equal(res.status, 200, `带 personId 的 visitor 行应放行：${await res.clone().text()}`);
  assert.equal(dbRow('todos', row.id)?.personId, A, '本人 visitor 待办已落库');
});

test('S3 participant 上传无 personId 的 visitor 角色待办 → 403（历史跨角色行不放行）', async () => {
  const token = await login(A);
  const v = await versions(token);
  const row = {
    id: 'td-b500-legacy-visitor', role: 'visitor', title: '无主 visitor 行',
    status: 'pending', category: 'notice', branchId: 'br-b1',
  };
  const res = await snapshot(token, { todos: [row], _versions: { todos: v.todos || 0 } });
  assert.equal(res.status, 403, 'role:visitor 不是登录角色，无 personId 必须拒绝');
  assert.equal(dbRow('todos', row.id), null, '★ 无主行不得落库');
});

test('S4 本人行 + 他人行同批 → 403 且整批不写（不是部分写入）', async () => {
  const token = await login(A);
  insert('todos', {
    id: 'td-b500-own', personId: A, title: '本人待办', status: 'pending', branchId: 'br-b1',
  });
  const v = await versions(token);
  const own = { ...dbRow('todos', 'td-b500-own'), status: 'completed' };
  const other = {
    id: 'td-b500-other', personId: B, title: '他人待办', status: 'pending', branchId: 'br-b1',
  };
  const res = await snapshot(token, { todos: [own, other], _versions: { todos: v.todos || 0 } });
  assert.equal(res.status, 403, `同批含他人行必须整批拒绝：${await res.clone().text()}`);
  assert.equal(dbRow('todos', 'td-b500-own').status, 'pending', '★ 同批合法本人行也不得写入（整批不写）');
  assert.equal(dbRow('todos', 'td-b500-other'), null, '★ 他人行不得落库');
});

// ── 派生态的新建例外（B-499-3 收尾）：A 的业务动作给 B 生成待办 ─────────────────
// 病灶（真机 form-loop 实测）：支书发布行动通知 / 建活动 / 有人报名时，客户端派生的是**其他角色**的
// 待办（role='leader' 或 personId=模块主责）；行级门只认本人 ⇒ 整批 snapshot 403，
// 同一次 flush 里的成功提示被反转成「未保存成功」。判据：**新建**放行、**推进 / 删除**仍归本人。

const SECRETARY = '2300010001'; // 支书

test('S5 支书新建 leader 角色待办 → 200（派生态新建放行）', async () => {
  const token = await login(SECRETARY);
  const v = await versions(token);
  const row = {
    id: 'td-b500-derive-leader', role: 'leader', title: '审核「参访活动保障专班」报名：宋佳宁',
    status: 'pending', category: 'review', actionKey: 'signup-review', branchId: 'br-b1',
  };
  const res = await snapshot(token, { todos: [row], _versions: { todos: v.todos || 0 } });
  assert.equal(res.status, 200, `支书派生其他角色待办应放行：${await res.clone().text()}`);
  assert.equal(dbRow('todos', row.id)?.role, 'leader', '派生行已落库');
});

test('S6 支书推进 / 删除他人角色待办 → 403（只有本人可推进）', async () => {
  insert('todos', {
    id: 'td-b500-leader-own', role: 'leader', title: '组长自己的待办', status: 'pending', branchId: 'br-b1',
  });
  const token = await login(SECRETARY);
  const v = await versions(token);
  const patched = { ...dbRow('todos', 'td-b500-leader-own'), status: 'completed' };
  const res = await snapshot(token, { todos: [patched], _versions: { todos: v.todos || 0 } });
  assert.equal(res.status, 403, `支书不得替组长销项：${await res.clone().text()}`);
  assert.equal(dbRow('todos', 'td-b500-leader-own').status, 'pending', '★ 他人角色行未被推进');
});

test('S7 支书新建无 personId 的 visitor 行 → 403（visitor 不是登录角色，无从归属）', async () => {
  const token = await login(SECRETARY);
  const v = await versions(token);
  const row = { id: 'td-b500-derive-visitor', role: 'visitor', title: '无主访客待办', status: 'pending', branchId: 'br-b1' };
  const res = await snapshot(token, { todos: [row], _versions: { todos: v.todos || 0 } });
  assert.equal(res.status, 403, `无主 visitor 行不得落库：${await res.clone().text()}`);
  assert.equal(dbRow('todos', row.id), null, '★ 无主 visitor 行未落库');
});

// ── 来源可证的派生行（报名人 → 审核人 / 组织者 → 参与者）────────────────────
const firstActivityId = () => JSON.parse(db.prepare('SELECT data FROM activities LIMIT 1').get().data).id;

test('S8 participant 新建「来源可证」的派生行（真实活动 + actionKey）→ 200', async () => {
  const token = await login(A);
  const v = await versions(token);
  const row = {
    id: 'td-b500-src-leader', role: 'leader', title: `审核「${firstActivityId()}」报名：何晓峰`,
    status: 'pending', category: 'review', actionKey: 'signup-review',
    sourceType: 'activity', sourceId: firstActivityId(), branchId: 'br-b1',
  };
  const res = await snapshot(token, { todos: [row], _versions: { todos: v.todos || 0 } });
  assert.equal(res.status, 200, `来源可证的派生行应放行：${await res.clone().text()}`);
  assert.equal(dbRow('todos', row.id)?.role, 'leader', '派生行已落库');
});

test('S9 participant 新建「来源不存在」的派生行 → 403（不能凭空指向）', async () => {
  const token = await login(A);
  const v = await versions(token);
  const row = {
    id: 'td-b500-src-missing', role: 'leader', title: '伪造来源', status: 'pending',
    actionKey: 'signup-review', sourceType: 'activity', sourceId: 'act-does-not-exist', branchId: 'br-b1',
  };
  const res = await snapshot(token, { todos: [row], _versions: { todos: v.todos || 0 } });
  assert.equal(res.status, 403, `来源不存在的派生行必须拒绝：${await res.clone().text()}`);
  assert.equal(dbRow('todos', row.id), null, '★ 伪造来源行未落库');
});

test('S10 participant 新建缺 actionKey 的跨角色行 → 403（不构成派生行）', async () => {
  const token = await login(A);
  const v = await versions(token);
  const row = {
    id: 'td-b500-src-nokey', role: 'leader', title: '无动作键', status: 'pending',
    sourceType: 'activity', sourceId: firstActivityId(), branchId: 'br-b1',
  };
  const res = await snapshot(token, { todos: [row], _versions: { todos: v.todos || 0 } });
  assert.equal(res.status, 403, `缺 actionKey 不得按派生行放行：${await res.clone().text()}`);
  assert.equal(dbRow('todos', row.id), null, '★ 非派生行未落库');
});
