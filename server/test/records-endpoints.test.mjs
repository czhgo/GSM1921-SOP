// server/test/records-endpoints.test.mjs — T1 验收：三域「服务端对源」清缓存不丢（2026-09-23 批次 163）
//
// 病灶（只读审计核实）：`handoffs` / 成员变更确认队列 / `milestones` 三域**只有浏览器本地一份**——
//   handoffs 有本地落盘却不在快照 payload / init 拉取 / 资源名映射里（api 形态下刷新即丢）；
//   成员变更确认队列只存 localStorage 键 `gsm1921-member-confirmations`；milestones 只读静态文件。
// 本守卫＝**验收判据**（HTTP 级，纯 node 零 chromium）：三域写入后，**换一个「本机什么都没有」的客户端**
//   再读，结果必须与清缓存前**一致**——即「数据在服务端，不靠浏览器缓存」。
//
// 覆盖：
//   ① handoffs：发起（纪检 p10 → 组织 p11）→ 新客户端读「待接收」条数一致；接收方确认 → 状态落库；
//      角色门（非发起方 403 / 非接收方 403）。
//   ② member_confirmations：组织委员 p11 入队 → 新客户端读「支书待确认」条数一致；支书 p13 决策 → 终态落库；
//      角色门（非组织委员入队 403 / 非支书决策 403）。
//   ③ milestones：首启从 `docs/data/milestones.json` 播种（内容单一源）→ 新客户端列表与文件内容一致。
//   ④ 三域**不进快照 payload**：`GET /api/v1/snapshot/versions` 的集合名里不含它们（与 agendaVotes 同纪律）。
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { chromium } from 'playwright';
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
  server.close();
});

/** 登录取 token（演示账号统一口令 123456；测试脚本注入 DISABLE_PASSWORD_CHECK=1 亦可） */
async function login(personId) {
  const r = await fetch(`${base}/api/v1/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ personId, password: '123456' }),
  });
  assert.equal(r.status, 200, `登录 ${personId} 应 200`);
  return (await r.json()).token;
}

/** 新客户端：**全新会话**（等价于「清掉本机缓存 / 换一台机器」——没有本地队列、没有本地缓存） */
async function freshClient(personId) {
  const token = await login(personId);
  const get = async (path) => {
    const r = await fetch(`${base}${path}`, { headers: { Authorization: `Bearer ${token}` } });
    assert.equal(r.status, 200, `GET ${path} 应 200（实测 ${r.status}）`);
    return r.json();
  };
  const post = (path, body) => fetch(`${base}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body ?? {}),
  });
  return { token, get, post };
}

// ── ① 三委数据交接 ────────────────────────────────────────────────
test('T1-① handoffs：发起 → 新客户端（清缓存等价）待接收条数一致；接收方确认后状态落库', async () => {
  const disc = await freshClient('p10'); // 纪检委员＝发起方（attendance-archival 的 from）
  const org = await freshClient('p11');  // 组织委员＝接收方（to）

  const create = await disc.post('/api/v1/handoffs', {
    type: 'attendance-archival', refType: 'attendance', refLabel: '考勤统计', refId: 'attendance', note: 'T1 验收',
  });
  assert.equal(create.status, 201, JSON.stringify(await create.clone().json()));
  const created = await create.json();
  assert.equal(created.status, 'pending');
  assert.equal(created.from, 'disc-commissioner', 'from 由 type 派生（不采信客户端自述）');
  assert.equal(created.to, 'org-commissioner', 'to 由 type 派生');

  const beforeClear = await org.get('/api/v1/handoffs?status=pending');
  assert.equal(beforeClear.filter((h) => h.to === 'org-commissioner').length, 1);

  // 「清 localStorage 后重进」＝**再开一个全新客户端**重读（本机无任何本地队列/缓存）
  const reopened = await freshClient('p11');
  const afterClear = (await reopened.get('/api/v1/handoffs?status=pending')).filter((h) => h.to === 'org-commissioner');
  assert.deepEqual(afterClear, beforeClear.filter((h) => h.to === 'org-commissioner'),
    '清缓存前后「待接收」交接必须一致（服务端为权威）');
  assert.equal(afterClear[0].id, created.id);

  // 接收方确认 → 状态落库（再开新客户端复核，而非信本机内存）
  const confirm = await org.post(`/api/v1/handoffs/${created.id}/confirm`);
  assert.equal(confirm.status, 200);
  assert.equal((await confirm.json()).status, 'done');
  const reopened2 = await freshClient('p11');
  assert.equal((await reopened2.get('/api/v1/handoffs?status=pending')).length, 0, '确认后不再计入待接收');
  const all = await reopened2.get('/api/v1/handoffs');
  assert.equal(all.find((h) => h.id === created.id).status, 'done');
  assert.equal(all.find((h) => h.id === created.id).confirmedBy, 'org-commissioner');
});

test('T1-① 写门：非发起方角色发起 403；非接收方确认 403', async () => {
  const org = await freshClient('p11');
  const sec = await freshClient('p13');
  // 组织委员去发「考勤统计报支委会」（from=纪检）⇒ 403
  assert.equal((await org.post('/api/v1/handoffs', { type: 'attendance-archival', refId: 'attendance' })).status, 403);
  // 未知类型 ⇒ 400
  assert.equal((await org.post('/api/v1/handoffs', { type: 'no-such-type' })).status, 400);
  // 书记去确认「补课需求回执」（to=纪检）⇒ 403
  const created = await (await org.post('/api/v1/handoffs', {
    type: 'material-shortage', refType: 'activity', refLabel: '补课需求', refId: 'act-x',
  })).json();
  assert.equal((await sec.post(`/api/v1/handoffs/${created.id}/confirm`)).status, 403);
  // 未登录一律 401
  assert.equal((await fetch(`${base}/api/v1/handoffs`)).status, 401);
  assert.equal((await fetch(`${base}/api/v1/handoffs`, { method: 'POST' })).status, 401);
});

// ── ② 名册成员变更确认队列 ─────────────────────────────────────────
test('T1-② member_confirmations：入队 → 新客户端支书待确认条数一致；支书决策后终态落库', async () => {
  const org = await freshClient('p11');
  const sec = await freshClient('p13');

  const enqueue = await org.post('/api/v1/member-confirmations', {
    personId: 'p5', kind: 'change', action: 'residence', from: '在校', to: '滞留', note: 'T1 验收', by: 'p11',
  });
  assert.equal(enqueue.status, 201, JSON.stringify(await enqueue.clone().json()));
  const req = await enqueue.json();

  const beforeClear = await sec.get('/api/v1/member-confirmations?status=pending');
  assert.equal(beforeClear.length, 1);

  // 清缓存等价：全新客户端重读
  const reopened = await freshClient('p13');
  const afterClear = await reopened.get('/api/v1/member-confirmations?status=pending');
  assert.deepEqual(afterClear, beforeClear, '清缓存前后「支书待确认」必须一致（服务端为权威）');
  assert.equal(afterClear[0].id, req.id);

  // 支书决策（副书同权）→ 终态落库
  const decide = await sec.post(`/api/v1/member-confirmations/${req.id}/decide`, { decision: 'approved' });
  assert.equal(decide.status, 200);
  assert.equal((await decide.json()).status, 'approved');
  const reopened2 = await freshClient('p13');
  assert.equal((await reopened2.get('/api/v1/member-confirmations?status=pending')).length, 0);
  const decided = (await reopened2.get('/api/v1/member-confirmations')).find((r) => r.id === req.id);
  assert.equal(decided.status, 'approved');
  assert.equal(decided.decidedBy, 'p13', '决策人留痕');
  assert.ok(decided.decidedAt, '决策时间留痕');
  // 已终态再决策 ⇒ 400
  assert.equal((await sec.post(`/api/v1/member-confirmations/${req.id}/decide`, { decision: 'rejected' })).status, 400);
});

test('T1-② 写门：入队＝组织委员（书记 403）；决策＝支书/副支书（组织委员 403）', async () => {
  const org = await freshClient('p11');
  const sec = await freshClient('p13');
  const dep = await freshClient('p14'); // 副支书（副书同权）
  const body = { personId: 'p6', kind: 'change', action: 'residence', from: '在校', to: '滞留' };
  assert.equal((await sec.post('/api/v1/member-confirmations', body)).status, 403, '书记不是组织委员 ⇒ 入队 403');
  const created = await (await org.post('/api/v1/member-confirmations', body)).json();
  assert.equal((await org.post(`/api/v1/member-confirmations/${created.id}/decide`, { decision: 'approved' })).status, 403,
    '组织委员不可自决');
  assert.equal((await dep.post(`/api/v1/member-confirmations/${created.id}/decide`, { decision: 'approved' })).status, 200,
    '副书同权：副支书可决策');
  assert.equal((await sec.post('/api/v1/member-confirmations/nope/decide', { decision: 'approved' })).status, 404);
  assert.equal((await sec.post(`/api/v1/member-confirmations/${created.id}/decide`, { decision: 'nope' })).status, 400);
  assert.equal((await fetch(`${base}/api/v1/member-confirmations`)).status, 401);
});

// ── ③ 批次里程碑（只读，内容单一源＝docs/data/milestones.json）──────
test('T1-③ milestones：服务端种子＝docs/data/milestones.json（内容单一源）；新客户端列表一致', async () => {
  const sec = await freshClient('p13');
  const rows = await sec.get('/api/v1/milestones');
  const file = JSON.parse(readFileSync(new URL('../../docs/data/milestones.json', import.meta.url), 'utf8'));
  assert.deepEqual(rows, file.milestones, '服务端里程碑须与静态文件（内容单一源）逐字一致');
  assert.ok(rows.length >= 1 && rows[0].id);
  const reopened = await freshClient('p5');
  assert.deepEqual(await reopened.get('/api/v1/milestones'), rows, '清缓存前后里程碑列表一致');
  assert.equal((await fetch(`${base}/api/v1/milestones`)).status, 401, '未登录 401');
  // 只读域：无写口（POST/PATCH 不注册 ⇒ 落到静态 404 兜底）
  const post = await fetch(`${base}/api/v1/milestones`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sec.token}` }, body: '{}',
  });
  assert.ok(post.status === 404, `里程碑为只读域，POST 不应被受理（实测 ${post.status}）`);
});

// ── ④ 三域不进快照 payload（与 agendaVotes 同纪律）───────────────────
test('T1-④ 三域不参与快照写穿：集合版本基线里不含 handoffs / memberConfirmations / milestones', async () => {
  const sec = await freshClient('p13');
  const { versions } = await sec.get('/api/v1/snapshot/versions');
  for (const k of ['handoffs', 'memberConfirmations', 'milestones']) {
    assert.ok(!(k in versions), `${k} 是语义端点域，不应出现在快照集合版本基线里`);
  }
  // 模板一致性对照：`agendaVotes`（同属语义端点域）同样不在集合版本基线里
  assert.ok(!('agendaVotes' in versions), '对照：agendaVotes 是同一模板（语义端点域），同样不进快照集合');
});

// ════════════════════════════════════════════════════════════════
//  ⑤ 真机验收（浏览器）：**清 localStorage 后重进，三域与清空前一致**
// ════════════════════════════════════════════════════════════════
// 手法：A 客户端在真页面（api 形态，独立页 `notice.html` 走 `hydrateDataSource`）里经服务层发起一次交接
//   ⇒ 关掉整个 context（**本机 localStorage/sessionStorage 随之消失＝清缓存**）⇒
//   B 客户端（全新 context，本机什么都没有）重进，经服务层读「待接收」——仍能读到 ⇒ 证明数据在服务端。
test('T1-⑤ 真机：api 形态写入后，清空本机存储的新客户端仍读得到（handoffs / milestones / 待确认队列）', async () => {
  const browser = await chromium.launch({ headless: true });
  /** 打开一个独立页并等到 api 形态就绪（token 由 addInitScript 预置，等价于「已登录会话」） */
  const openApiPage = async (personId) => {
    const token = await login(personId);
    const ctx = await browser.newContext();
    await ctx.addInitScript((t) => { try { sessionStorage.setItem('gsm1921-api-token', t); } catch (_) {} }, token);
    const page = await ctx.newPage();
    // 离线可复现：外部 CDN 挂起会拖慢首屏，直接 abort（与本仓其它真机用例同法）
    await page.route('**://fonts.googleapis.com/**', (r) => r.abort());
    await page.route('**://fonts.gstatic.com/**', (r) => r.abort());
    await page.route('**://cdn.tailwindcss.com/**', (r) => r.abort());
    await page.goto(`${base}/notice.html`, { waitUntil: 'domcontentloaded' });
    // ⚠ 就绪判据必须在**主世界**里读模块状态：`page.waitForFunction` 的模块导入可能取到另一份实例，
    //   且 `mockDB._loaded` 会被**mock 形态的 loadDB** 先行置位（早于 api init 完成）⇒ 单独看它会误判。
    //   这里用主世界轮询：① 形态＝api；② `_loaded` 已置位（该行在「三域语义端点拉取」之后）；
    //   ③ `mockDB.milestones` 已定义（＝三域拉取确已完成）。
    await page.evaluate(async () => {
      const t0 = Date.now();
      for (;;) {
        const { getRuntimeMode } = await import('/src/core/data-adapter.js?v=20260924a');
        const { mockDB } = await import('/src/core/domain.js?v=20260924a');
        if (getRuntimeMode().source === 'api' && mockDB._loaded === true && mockDB.milestones !== undefined) return;
        if (Date.now() - t0 > 20000) throw new Error('[T1-⑤] 页面数据层未在 20s 内就绪');
        await new Promise((r) => setTimeout(r, 50));
      }
    });
    return { ctx, page };
  };

  try {
    // A：纪检委员 p10 在真页面里发起交接（api 形态 ⇒ 经语义端点落服务端）
    const a = await openApiPage('p10');
    const created = await a.page.evaluate(async () => {
      const { HandoffStore } = await import('/src/services/handoff.js?v=20260924a');
      return HandoffStore.create({
        type: 'inspection-report', refType: 'inspection', refLabel: '考察记录提交（T1 真机）', refId: 'inspection',
      });
    });
    assert.ok(created && created.id, '真页面里应成功发起交接');
    await a.page.waitForTimeout(800); // 服务端同步（乐观写 + fire-and-forget）落库窗口
    const beforeClear = await a.page.evaluate(async () => {
      const { HandoffStore } = await import('/src/services/handoff.js?v=20260924a');
      return HandoffStore.pendingCount('org-commissioner');
    });
    await a.ctx.close(); // ⇒ 本机存储随 context 一起消失（＝清 localStorage 后重进）

    // B：全新客户端（本机无任何缓存）→ 组织委员 p11 读待接收
    const b = await openApiPage('p11');
    const afterClear = await b.page.evaluate(async (id) => {
      const { HandoffStore } = await import('/src/services/handoff.js?v=20260924a');
      return { count: HandoffStore.pendingCount('org-commissioner'), hasId: HandoffStore.listByRole('org-commissioner').some((h) => h.id === id) };
    }, created.id);
    assert.equal(afterClear.count, beforeClear, `清缓存前后「待接收」条数须一致（清空前 ${beforeClear}，清空后 ${afterClear.count}）`);
    assert.equal(afterClear.hasId, true, '清缓存后重进仍应看到刚发起的交接（服务端为权威）');

    // milestones：api 形态经服务端取（不再读静态文件），且与清空前一致
    const miles = await b.page.evaluate(async () => {
      const { MilestoneStore } = await import('/src/services/milestones.js?v=20260924a');
      return MilestoneStore.loadAll();
    });
    const fileRows = JSON.parse(readFileSync(new URL('../../docs/data/milestones.json', import.meta.url), 'utf8')).milestones;
    assert.deepEqual(miles, fileRows, 'api 形态里程碑＝服务端表（内容单一源＝docs/data/milestones.json）');

    // 待确认队列：同法（组织委员 p11 入队 → 换全新客户端以支书 p13 读）
    const enq = await b.page.evaluate(async () => {
      const { submitMemberChange } = await import('/src/services/member-confirmation.js?v=20260924a');
      return submitMemberChange({ personId: 'p7', kind: 'residence', to: '滞留', note: 'T1 真机', by: 'p11' });
    });
    assert.equal(enq.ok, true, JSON.stringify(enq));
    await b.page.waitForTimeout(800);
    await b.ctx.close();

    const c = await openApiPage('p13');
    const pend = await c.page.evaluate(async (id) => {
      const { listPendingConfirmations } = await import('/src/services/member-confirmation.js?v=20260924a');
      return { has: listPendingConfirmations().some((r) => r.id === id), n: listPendingConfirmations().length };
    }, enq.request.id);
    assert.equal(pend.has, true, '清缓存后重进，支书仍应看到刚报送的待确认请求（服务端为权威）');
    assert.ok(pend.n >= 1);
    await c.ctx.close();
  } finally {
    await browser.close();
  }
});
