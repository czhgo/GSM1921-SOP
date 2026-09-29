// ════════════════════════════════════════════════════════════════
//  server/test/iaaa-onboarding.test.mjs —— **IAAA 入站链路**守卫（2026-09-29 批次 271 新增）
//
//  验支书 2026-09-29 第 2 条逐字链：**IAAA 认人 → 有号则登录 / 无号则自动建号 → 选支部 → 支部确认**。
//  口径（同批 AskUserQuestion 四题，支书全取推荐档）：OAuth 形态 · 无额外门槛（确认即门槛）·
//   确认人＝支书/副支书/组织委员 · **不新增表**（`users.branchId` 空＝待归属；留痕走 `auth_audit`）。
//
//  T1 `IAAA_MOCK=1` 下 `/login` ⇒ 302 到回调（本地假想 IAAA，全链可端到端联调）
//  T2 无号 ⇒ **自动建号**（`role:participant`、`branchId:null`、`needBranch:true`）且**能登录**（`/auth/me`）
//     同学号再次回调 ⇒ **不重复建号**（`created:false`）
//  T3 选支部：不存在的支部 ⇒ 400；存在 ⇒ 200 且写 `joinIntent`（**此刻仍 `branchId:null`**）
//  T4 待确认清单：成员 ⇒ 403；组织委员 ⇒ 只看到**本支部**的申请；党委 ⇒ 全量
//  T5 确认入站：落 `branchId` ＋ `auth_audit` 留一条 `join-approve` ＋ 清单清空
//  T6 **越权**：本支部组织委员**不能**批别支部的申请 ⇒ 403（党委可跨支部 ⇒ 200）
//  T7 驳回：清意向、**保持未归属**（可重新选支部）＋ 留痕 `join-reject`
//  T8 浏览器流的 302 落点必须是**绝对路径**（批次 277 补；防「相对路径被相对请求 URL 解析 ⇒ 404」）
// ════════════════════════════════════════════════════════════════
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

process.env.IAAA_MOCK = '1';                       // ⚠ 必须在 import 路由之前（模块级读 env）
const { createApp } = await import('../app.js');    // 动态 import：晚于上面的 env 赋值
const { seedBaseline } = await import('../seed-baseline.js');

let server, BASE, db;

const api = async (method, path, { token, body, redirect } = {}) => {
  const r = await fetch(BASE + path, {
    method,
    redirect,                                        // `manual` 用于验 302 落点（默认 follow 会跟着跳走）
    headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await r.text();
  let json = null; try { json = JSON.parse(text); } catch { /* 非 JSON（HTML 错误页） */ }
  return { status: r.status, json, text, location: r.headers.get('location') };
};
/** 走 IAAA 回调拿会话（MOCK 模式下 `token` 即学号） */
const iaaaLogin = async (studentId) => (await api('GET', `/api/v1/auth/iaaa/callback?mode=json&token=${encodeURIComponent(studentId)}`)).json;

before(async () => {
  const app = createApp(':memory:');
  db = app.locals.db;
  seedBaseline(db);                       // 组织基线：党委账号 p_pc ＋ 支部 br-b1
  // 造数据：第二个支部 ＋ 一名组织委员（br-b1）＋ 一名「申请进 br-x」的待确认者
  db.prepare('INSERT OR REPLACE INTO branches (id, data) VALUES (?, ?)')
    .run('br-x', JSON.stringify({ id: 'br-x', name: '测试他支部', config: { modules: null, blocks: null, workforce: null }, secretaryId: null, status: 'active' }));
  db.prepare('INSERT OR REPLACE INTO users (id, data) VALUES (?, ?)').run('u-org', JSON.stringify(
    { id: 'u-org', name: '组织委员', studentId: 'org-001', role: 'org-commissioner', branchId: 'br-b1' }));
  db.prepare('INSERT OR REPLACE INTO users (id, data) VALUES (?, ?)').run('u-app', JSON.stringify(
    { id: 'u-app', name: '待入站者', studentId: 'app-001', role: 'participant', branchId: null, joinIntent: { branchId: 'br-x', at: new Date().toISOString() } }));
  server = app.listen(0);
  await new Promise((r) => server.once('listening', r));
  BASE = `http://127.0.0.1:${server.address().port}`;
});
after(() => server && server.close());

test('T1 /login ⇒ 302 到 IAAA 回调（MOCK 假想 IAAA）', async () => {
  const r = await api('GET', '/api/v1/auth/iaaa/login', { redirect: 'manual' });   // ⚠ 必须 manual：默认会跟着 302 跳到回调
  assert.equal(r.status, 302, '应重定向到回调');
  assert.match(r.location, /\/api\/v1\/auth\/iaaa\/callback\?token=/, '落点应是回调端点并带 token');
});

test('T2 无号 ⇒ 自动建号（participant / branchId null / needBranch）且能登录；同学号不重复建号', async () => {
  const sid = `2026${randomUUID().slice(0, 6)}`;
  const r1 = await iaaaLogin(sid);
  assert.equal(r1.ok, true);
  assert.equal(r1.created, true, '首次应建号');
  assert.equal(r1.needBranch, true, '未归属 ⇒ 需选支部');
  assert.equal(r1.user.branchId, null, '建号后**不得**自带支部');
  assert.equal(r1.user.role, 'participant', '入站即普通成员（身份由支部后续按制度配置）');
  assert.match(r1.user.id, /^p_/, 'id 形态与既有 `p_<uuid>` 一致');

  const me = await api('GET', '/api/v1/auth/me', { token: r1.token });
  assert.equal(me.status, 200, '新号必须能登录（否则自助入站无意义）');
  assert.equal(me.json.id, r1.user.id);

  const r2 = await iaaaLogin(sid);
  assert.equal(r2.created, false, '同学号再次回调**不得**重复建号');
  assert.equal(r2.user.id, r1.user.id, '应是同一个号');
});

test('T3 选支部：不存在的支部 ⇒ 400；存在 ⇒ 记 joinIntent 且**仍 branchId null**', async () => {
  const sid = `2026${randomUUID().slice(0, 6)}`;
  const { token } = await iaaaLogin(sid);

  const bad = await api('POST', '/api/v1/auth/iaaa/bind-branch', { token, body: { branchId: 'br-nope' } });
  assert.equal(bad.status, 400, '不存在的支部应 400');

  const ok = await api('POST', '/api/v1/auth/iaaa/bind-branch', { token, body: { branchId: 'br-b1' } });
  assert.equal(ok.status, 200);
  assert.equal(ok.json.joinIntent.branchId, 'br-b1', '意向记在 joinIntent');
  const me = await api('GET', '/api/v1/auth/me', { token });
  assert.equal(me.json.branchId, null, '**选支部 ≠ 已归属**：确认前仍 branchId null');
});

test('T4 待确认清单：成员 403；本支部组织委员只看本支部申请', async () => {
  const member = await iaaaLogin(`2026${randomUUID().slice(0, 6)}`);
  const deny = await api('GET', '/api/v1/auth/iaaa/pending', { token: member.token });
  assert.equal(deny.status, 403, '普通成员不得看待确认清单');

  const org = await iaaaLogin('org-001');           // 组织委员，branchId br-b1
  const list = await api('GET', '/api/v1/auth/iaaa/pending', { token: org.token });
  assert.equal(list.status, 200);
  assert.ok(Array.isArray(list.json));
  assert.ok(list.json.every((r) => r.joinIntent.branchId === 'br-b1'),
    `本支部组织委员只应看到本支部申请，实测：${JSON.stringify(list.json.map((r) => r.joinIntent.branchId))}`);
});

test('T5 确认入站：落 branchId ＋ auth_audit 留痕 ＋ 清单移除', async () => {
  const sid = `2026${randomUUID().slice(0, 6)}`;
  const applicant = await iaaaLogin(sid);
  await api('POST', '/api/v1/auth/iaaa/bind-branch', { token: applicant.token, body: { branchId: 'br-b1' } });
  const org = await iaaaLogin('org-001');

  const ok = await api('POST', `/api/v1/auth/iaaa/pending/${applicant.user.id}/approve`, { token: org.token });
  assert.equal(ok.status, 200, `确认应成功，实测 ${ok.status} ${ok.text.slice(0, 160)}`);
  assert.equal(ok.json.user.branchId, 'br-b1', '确认后落 branchId');
  assert.equal(ok.json.user.joinIntent, undefined, '意向应被清掉');
  assert.equal(ok.json.audit.action, 'join-approve', '留痕 action');
  assert.equal(ok.json.audit.scopeRef, 'br-b1', '留痕 scopeRef＝支部');
  assert.equal(ok.json.audit.authorizedBy, 'u-org', '留痕「谁批的」');

  const rows = db.prepare('SELECT data FROM auth_audit').all().map((r) => JSON.parse(r.data))
    .filter((r) => r.targetPersonId === applicant.user.id);
  assert.equal(rows.length, 1, 'auth_audit 应恰有一条（复用既有留痕表，不新增表）');

  const list = await api('GET', '/api/v1/auth/iaaa/pending', { token: org.token });
  assert.ok(!list.json.some((r) => r.personId === applicant.user.id), '确认后应从清单移除');
});

test('T6 越权：本支部组织委员不得批别支部申请（403）；党委可跨支部', async () => {
  const org = await iaaaLogin('org-001');
  const deny = await api('POST', '/api/v1/auth/iaaa/pending/u-app/approve', { token: org.token });   // u-app 意向是 br-x
  assert.equal(deny.status, 403, '跨支部确认必须 403');

  const pc = await iaaaLogin('9000000001');          // 党委组织员（组织级）
  assert.equal(pc.user.role, 'party-staff');
  const allow = await api('POST', '/api/v1/auth/iaaa/pending/u-app/approve', { token: pc.token });
  assert.equal(allow.status, 200, `党委应可跨支部确认，实测 ${allow.status} ${allow.text.slice(0, 160)}`);
  assert.equal(allow.json.user.branchId, 'br-x');
});

test('T7 驳回：清意向、保持未归属（可重选）＋ 留痕 join-reject', async () => {
  const sid = `2026${randomUUID().slice(0, 6)}`;
  const applicant = await iaaaLogin(sid);
  await api('POST', '/api/v1/auth/iaaa/bind-branch', { token: applicant.token, body: { branchId: 'br-b1' } });
  const org = await iaaaLogin('org-001');

  const rej = await api('POST', `/api/v1/auth/iaaa/pending/${applicant.user.id}/reject`, { token: org.token });
  assert.equal(rej.status, 200);
  assert.equal(rej.json.user.branchId, null, '驳回后**保持未归属**');
  assert.equal(rej.json.user.joinIntent, undefined, '意向清掉');
  assert.equal(rej.json.audit.action, 'join-reject');

  const again = await api('POST', '/api/v1/auth/iaaa/bind-branch', { token: applicant.token, body: { branchId: 'br-b1' } });
  assert.equal(again.status, 200, '驳回后可重新选支部（不锁死）');
});

// ⚠ 批次 277 新增：**浏览器流的 302 落点必须是绝对路径**。
//   原实现写 `./api/v1/auth/iaaa/callback` 与 `./login.html#iaaa=…`；相对路径会被浏览器
//   相对「请求 URL」解析（`/api/v1/auth/iaaa/` 之下）⇒ 实际落到
//   `/api/v1/auth/iaaa/api/v1/auth/iaaa/callback` ⇒ **404**。批次 271 只测 `?mode=json`，
//   浏览器流无人走 ⇒ 该缺陷当时未被发现（本用例即防这一类回归）。
test('T8 浏览器流的 302 落点必须是绝对路径（否则被相对请求 URL 解析 ⇒ 404）', async () => {
  const l = await api('GET', '/api/v1/auth/iaaa/login', { redirect: 'manual' });
  assert.equal(l.status, 302, 'MOCK 下 /login 应 302');
  assert.ok(String(l.location).startsWith('/'), `登录跳转须为绝对路径，实测 ${l.location}`);

  const sid = `2026${randomUUID().slice(0, 6)}`;
  const c = await api('GET', `/api/v1/auth/iaaa/callback?token=${encodeURIComponent(sid)}`, { redirect: 'manual' });
  assert.equal(c.status, 302, '浏览器流回调应 302 回登录页');
  assert.ok(String(c.location).startsWith('/login.html#iaaa='),
    `回跳须为「绝对路径 ＋ hash」，实测 ${c.location}`);
});
