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
  // ⚠ 2026-09-29 批次 295（支书裁「**需要自动交接的 都要实现自动交接才对！不需要额外费口舌**」）：
  //   **数据交接类**（`attendance-archival` / `inspection-report`，见 `handoff.js::AUTO_CONFIRM_TYPES`）
  //   服务端**发起即 `done`** ⇒ 本条改用**仍是 `pending`** 的 `material-shortage`
  //   （「补课需求回执」＝**待办**类：要纪检去补课，不是收下存档）来验「服务端为权威 ＋ 接收方可确认」这条机制本身。
  const org = await freshClient('p11');  // 组织委员＝发起方（material-shortage 的 from）
  const disc = await freshClient('p10'); // 纪检委员＝接收方（to）

  const create = await org.post('/api/v1/handoffs', {
    type: 'material-shortage', refType: 'activity', refLabel: '补课需求回执', refId: 'act-t1', note: 'T1 验收',
  });
  assert.equal(create.status, 201, JSON.stringify(await create.clone().json()));
  const created = await create.json();
  assert.equal(created.status, 'pending');
  assert.equal(created.from, 'org-commissioner', 'from 由 type 派生（不采信客户端自述）');
  assert.equal(created.to, 'disc-commissioner', 'to 由 type 派生');

  const beforeClear = await disc.get('/api/v1/handoffs?status=pending');
  // 该侧**无种子待接收行**（`ho-seed-1` 是纪检→组织、`to='org-commissioner'`）⇒ 判据＝本次 1 条。
  assert.equal(beforeClear.filter((h) => h.to === 'disc-commissioner').length, 1,
    '纪检侧待接收＝本次发起 1 条（该侧无种子待接收行）');

  // 「清 localStorage 后重进」＝**再开一个全新客户端**重读（本机无任何本地队列/缓存）
  const reopened = await freshClient('p10');
  const afterClear = (await reopened.get('/api/v1/handoffs?status=pending')).filter((h) => h.to === 'disc-commissioner');
  assert.deepEqual(afterClear, beforeClear.filter((h) => h.to === 'disc-commissioner'),
    '清缓存前后「待接收」交接必须一致（服务端为权威）');
  // 判据「本次发起的那条仍在」按 id 命中（原写 `afterClear[0].id` 只在「该表当时仅此一行」时成立）
  assert.ok(afterClear.some((h) => h.id === created.id), '本次发起的交接在清缓存后仍可读（服务端为权威）');

  // 接收方确认 → 状态落库（再开新客户端复核，而非信本机内存）
  const confirm = await disc.post(`/api/v1/handoffs/${created.id}/confirm`);
  assert.equal(confirm.status, 200);
  assert.equal((await confirm.json()).status, 'done');
  const reopened2 = await freshClient('p10');
  assert.equal((await reopened2.get('/api/v1/handoffs?status=pending')).filter((h) => h.id === created.id).length, 0,
    '确认后本条不再计入待接收');
  const all = await reopened2.get('/api/v1/handoffs');
  assert.equal(all.find((h) => h.id === created.id).status, 'done');
  assert.equal(all.find((h) => h.id === created.id).confirmedBy, 'disc-commissioner');
});

test('T1-①b 数据交接**自动落定**：attendance-archival / inspection-report 服务端发起即 done（无人工确认，留痕仍在）', async () => {
  const disc = await freshClient('p10'); // 纪检委员＝两类数据交接的发起方
  const org = await freshClient('p11');  // 组织委员＝接收方
  for (const [type, refId] of [['inspection-report', 'insp-t1b'], ['attendance-archival', 'att-t1b']]) {
    const r = await disc.post('/api/v1/handoffs', { type, refType: type, refLabel: type, refId });
    assert.equal(r.status, 201, `${type}: ${JSON.stringify(await r.clone().json())}`);
    const row = await r.json();
    assert.equal(row.status, 'done', `${type} 须发起即落定（2026-09-29 批次 295 支书裁）`);
    assert.equal(row.confirmedBy, 'system');
    assert.ok(row.confirmedAt, '留痕仍在（confirmedAt 非空）');
    const pending = await org.get('/api/v1/handoffs?status=pending');
    assert.equal(pending.filter((h) => h.id === row.id).length, 0, `${type} 自动落定者不得进「待接收」`);
  }
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
  // ⚠ 2026-09-25 批次 189：本队列**已有服务端种子**（`server/seed.js::SEED_MEMBER_CONFIRMATIONS` 的
  //   `mc-seed-1`，status=pending）⇒ 判据由「＝1（当时该表为空）」改准为「＝**种子 1 条 ＋ 本次入队 1 条**」。
  //   这不是放宽：种子条数被显式写进判据（种子增删即红）。
  const SEEDED_PENDING = 1; // `mc-seed-1`
  assert.equal(beforeClear.length, SEEDED_PENDING + 1,
    `待确认条数＝服务端种子 ${SEEDED_PENDING} 条（mc-seed-1）＋ 本次入队 1 条`);

  // 清缓存等价：全新客户端重读
  const reopened = await freshClient('p13');
  const afterClear = await reopened.get('/api/v1/member-confirmations?status=pending');
  assert.deepEqual(afterClear, beforeClear, '清缓存前后「支书待确认」必须一致（服务端为权威）');
  // 判据「本次入队的那条仍在」按 id 命中（原写 `afterClear[0].id` 只在「该表当时仅此一行」时成立）
  assert.ok(afterClear.some((r) => r.id === req.id), '本次入队的请求在清缓存后仍可读（服务端为权威）');

  // 支书决策（副书同权）→ 终态落库
  const decide = await sec.post(`/api/v1/member-confirmations/${req.id}/decide`, { decision: 'approved' });
  assert.equal(decide.status, 200);
  assert.equal((await decide.json()).status, 'approved');
  const reopened2 = await freshClient('p13');
  assert.equal((await reopened2.get('/api/v1/member-confirmations?status=pending')).filter((r) => r.id === req.id).length, 0,
    '本条决策后不再计入待确认（同队列内的种子待确认行不受影响）');
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
        const { getRuntimeMode } = await import('/src/data/data-adapter.js?v=20261004a');
        const { mockDB } = await import('/src/core/domain/domain.js?v=20261004a');
        if (getRuntimeMode().source === 'api' && mockDB._loaded === true && mockDB.milestones !== undefined) return;
        if (Date.now() - t0 > 20000) throw new Error('[T1-⑤] 页面数据层未在 20s 内就绪');
        await new Promise((r) => setTimeout(r, 50));
      }
    });
    return { ctx, page };
  };

  try {
    // A：组织委员 p11 在真页面里发起交接（api 形态 ⇒ 经语义端点落服务端）
    // ⚠ 2026-09-29 批次 295：本条改用 `material-shortage`（仍 pending 的**待办**类）——
    //   数据交接两类（inspection-report / attendance-archival）已改**发起即落定**（见 `AUTO_CONFIRM_TYPES`），
    //   不再有「待接收」可读；本条要验的「服务端为权威（清缓存仍可读）」用仍 pending 的类来证。
    const a = await openApiPage('p11');
    const created = await a.page.evaluate(async () => {
      const { HandoffStore } = await import('/src/services/governance/handoff.js?v=20261004a');
      return HandoffStore.create({
        type: 'material-shortage', refType: 'activity', refLabel: '补课需求回执（T1 真机）', refId: 'act-t1-real',
      });
    });
    assert.ok(created && created.id, '真页面里应成功发起交接');
    await a.page.waitForTimeout(800); // 服务端同步（乐观写 + fire-and-forget）落库窗口
    const beforeClear = await a.page.evaluate(async () => {
      const { HandoffStore } = await import('/src/services/governance/handoff.js?v=20261004a');
      return HandoffStore.pendingCount('disc-commissioner');
    });
    await a.ctx.close(); // ⇒ 本机存储随 context 一起消失（＝清 localStorage 后重进）

    // B：全新客户端（本机无任何缓存）→ 纪检委员 p10 读待接收（⚠ 只是「读」，本页用完即关——
    //   后半段的「成员变更待确认队列」必须仍以**组织委员 p11** 的会话报送，勿把两者混用一个 page）
    const bRead = await openApiPage('p10');
    const afterClear = await bRead.page.evaluate(async (id) => {
      const { HandoffStore } = await import('/src/services/governance/handoff.js?v=20261004a');
      return { count: HandoffStore.pendingCount('disc-commissioner'), hasId: HandoffStore.listByRole('disc-commissioner').some((h) => h.id === id) };
    }, created.id);
    assert.equal(afterClear.count, beforeClear, `清缓存前后「待接收」条数须一致（清空前 ${beforeClear}，清空后 ${afterClear.count}）`);
    assert.equal(afterClear.hasId, true, '清缓存后重进仍应看到刚发起的交接（服务端为权威）');
    await bRead.ctx.close();

    // 组织委员 p11 的会话（成员变更报送方＝组织委员）
    const b = await openApiPage('p11');

    // milestones：api 形态经服务端取（不再读静态文件），且与清空前一致
    const miles = await b.page.evaluate(async () => {
      const { MilestoneStore } = await import('/src/services/governance/milestones.js?v=20261004a');
      return MilestoneStore.loadAll();
    });
    const fileRows = JSON.parse(readFileSync(new URL('../../docs/data/milestones.json', import.meta.url), 'utf8')).milestones;
    assert.deepEqual(miles, fileRows, 'api 形态里程碑＝服务端表（内容单一源＝docs/data/milestones.json）');

    // 待确认队列：同法（组织委员 p11 入队 → 换全新客户端以支书 p13 读）
    const enq = await b.page.evaluate(async () => {
      const { submitMemberChange } = await import('/src/services/member/member-confirmation.js?v=20261004a');
      return submitMemberChange({ personId: 'p7', kind: 'residence', to: '滞留', note: 'T1 真机', by: 'p11' });
    });
    assert.equal(enq.ok, true, JSON.stringify(enq));
    await b.page.waitForTimeout(800);
    await b.ctx.close();

    const c = await openApiPage('p13');
    const pend = await c.page.evaluate(async (id) => {
      const { listPendingConfirmations } = await import('/src/services/member/member-confirmation.js?v=20261004a');
      return { has: listPendingConfirmations().some((r) => r.id === id), n: listPendingConfirmations().length };
    }, enq.request.id);
    assert.equal(pend.has, true, '清缓存后重进，支书仍应看到刚报送的待确认请求（服务端为权威）');
    assert.ok(pend.n >= 1);
    await c.ctx.close();
  } finally {
    await browser.close();
  }
});

// ════════════════════════════════════════════════════════════════
//  T2（2026-09-24 批次 169）：申诉队列 / 反馈未读标记 / 授权审计留痕四域的「服务端对源」验收
//  判据同 T1：写入后换一个**本机什么都没有**的新客户端再读，结果必须一致（＝「清 localStorage 仍在」）。
// ════════════════════════════════════════════════════════════════

/** 带 token 的裸请求（T2 用；GET / 任意方法 send） */
function apiClient(token) {
  return {
    get: (p) => fetch(`${base}${p}`, { headers: { Authorization: `Bearer ${token}` } }),
    send: (method, p, body) => fetch(`${base}${p}`, {
      method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body ?? {}),
    }),
  };
}

test('T2-① attendance_appeals：本人提交 → 新客户端读得到；纪检处置后终态落库；冒名 / 越权被拒', async () => {
  const org = await freshClient('p11');
  const created = await (await apiClient(org.token).send('POST', '/api/v1/attendance-appeals', { personId: 'p11', activityId: 'act-1', note: 'T2 验收' })).json();
  assert.ok(created.id && created.status === 'pending');
  // 清缓存等价：再开全新客户端（本机无任何本地队列）读
  const rows = await (await freshClient('p11')).get('/api/v1/attendance-appeals?status=pending');
  assert.ok(rows.some((a) => a.id === created.id), '清缓存后新客户端仍读得到刚提交的出勤申诉');
  // 冒名：替他人提交 403
  assert.equal((await apiClient(org.token).send('POST', '/api/v1/attendance-appeals', { personId: 'p3', activityId: 'act-1' })).status, 403, '替他人提交应 403');
  // 越权处置：普通成员（participant）403
  const p3 = await freshClient('p3');
  assert.equal((await apiClient(p3.token).send('PATCH', `/api/v1/attendance-appeals/${created.id}`, { status: 'closed' })).status, 403, '非处置位应 403');
  // 纪检 p10 处置 → 终态
  const disc = await freshClient('p10');
  const disp = await apiClient(disc.token).send('PATCH', `/api/v1/attendance-appeals/${created.id}`, { status: 'closed', note: '已核实' });
  assert.equal(disp.status, 200);
  const done = await disp.json();
  assert.equal(done.status, 'closed');
  assert.equal(done.decidedBy, 'p10');
  // 新客户端复核终态（不信本机内存）
  const all = await (await freshClient('p10')).get('/api/v1/attendance-appeals');
  assert.equal(all.find((a) => a.id === created.id).status, 'closed');
  // 终态不可再处置；未登录 401
  assert.equal((await apiClient(disc.token).send('PATCH', `/api/v1/attendance-appeals/${created.id}`, { status: 'returned' })).status, 400);
  assert.equal((await fetch(`${base}/api/v1/attendance-appeals`)).status, 401);
});

test('T2-② inspection_appeals：同出勤申诉口径（本人提交 / 纪检打回 / 新客户端读得到）', async () => {
  const leader = await freshClient('p1'); // 组长也是当事人
  const created = await (await apiClient(leader.token).send('POST', '/api/v1/inspection-appeals', { personId: 'p1', activityId: 'act-1', note: 'T2 验收' })).json();
  assert.ok(created.id && created.status === 'pending');
  const rows = await (await freshClient('p1')).get('/api/v1/inspection-appeals?status=pending');
  assert.ok(rows.some((a) => a.id === created.id), '清缓存后新客户端仍读得到刚提交的考察申诉');
  // 纪检打回 → status returned + 留痕
  const disc = await freshClient('p10');
  const ret = await apiClient(disc.token).send('PATCH', `/api/v1/inspection-appeals/${created.id}`, { status: 'returned', note: '请补证' });
  assert.equal(ret.status, 200);
  const done = await ret.json();
  assert.equal(done.status, 'returned');
  assert.equal(done.returnedBy, 'p10');
  assert.equal(done.returnNote, '请补证');
  const all = await (await freshClient('p10')).get('/api/v1/inspection-appeals');
  assert.equal(all.find((a) => a.id === created.id).status, 'returned');
});

test('T2-③ issue_unread：置未读 → 新客户端读得到；销项后不再计入；缺字段 400', async () => {
  const org = await freshClient('p11');
  const c = apiClient(org.token);
  assert.equal((await c.send('POST', '/api/v1/issue-unread', { assigneeId: 'p11', issueId: 'issue-t2', unread: true })).status, 200);
  const openRows = await (await freshClient('p11')).get('/api/v1/issue-unread?assigneeId=p11&open=1');
  assert.ok(openRows.some((r) => r.issueId === 'issue-t2'), '清缓存后新客户端仍读得到未读标记');
  // 销项（已读）
  assert.equal((await c.send('POST', '/api/v1/issue-unread', { assigneeId: 'p11', issueId: 'issue-t2', unread: false })).status, 200);
  const after = await (await freshClient('p11')).get('/api/v1/issue-unread?assigneeId=p11&open=1');
  assert.ok(!after.some((r) => r.issueId === 'issue-t2'), '销项后不再计入未读');
  assert.equal((await c.send('POST', '/api/v1/issue-unread', { assigneeId: 'p11' })).status, 400, '缺 issueId 应 400');
});

test('T2-④ auth_audit：追加留痕 → 支书新客户端读得到；非支委层读 403；同 id 幂等不重复落', async () => {
  const org = await freshClient('p11');
  const body = { id: 'auth-t2-1', targetPersonId: 'p7', role: 'organizer', scopeRef: 'act-1', authorizedBy: 'p11', authorizedAt: '2026-09-24', action: 'grant' };
  assert.equal((await apiClient(org.token).send('POST', '/api/v1/auth-audit', body)).status, 201);
  assert.equal((await apiClient(org.token).send('POST', '/api/v1/auth-audit', body)).status, 200, '同 id 幂等：不重复落');
  const rows = await (await freshClient('p13')).get('/api/v1/auth-audit');
  assert.equal(rows.filter((r) => r.id === 'auth-t2-1').length, 1, '同 id 只落一条');
  assert.equal(rows.find((r) => r.id === 'auth-t2-1').targetPersonId, 'p7');
  // 非支委层读 → 403
  const p3 = await freshClient('p3');
  assert.equal((await apiClient(p3.token).get('/api/v1/auth-audit')).status, 403);
  assert.equal((await fetch(`${base}/api/v1/auth-audit`)).status, 401);
});

test('T2-⑤ 四域不参与快照写穿：集合版本基线里不含 attendanceAppeals / inspectionAppeals / issueUnread / authAudit', async () => {
  const sec = await freshClient('p13');
  const { versions } = await sec.get('/api/v1/snapshot/versions');
  for (const k of ['attendanceAppeals', 'inspectionAppeals', 'issueUnread', 'authAudit']) {
    assert.ok(!(k in versions), `${k} 是语义端点域，不应出现在快照集合版本基线里`);
  }
});

test('T2-⑥ 前端 init() 拉取：新客户端 init 后四域进 mockDB 缓存（数据层证据，堵适配器组名写错）', async () => {
  /** localStorage / sessionStorage 内存桩（data-adapter 惰性访问） */
  const makeStorage = (init = {}) => {
    const m = new Map(Object.entries(init).map(([k, v]) => [String(k), String(v)]));
    return {
      getItem: (k) => (m.has(String(k)) ? m.get(String(k)) : null),
      setItem: (k, v) => m.set(String(k), String(v)),
      removeItem: (k) => { m.delete(String(k)); },
      clear: () => m.clear(),
      key: (i) => [...m.keys()][i] ?? null,
      get length() { return m.size; },
    };
  };
  globalThis.localStorage = makeStorage();
  const token = await login('p13');
  globalThis.sessionStorage = makeStorage({ 'gsm1921-api-token': token });
  const { setDataSource, init } = await import('../../docs/src/data/data-adapter.js?v=20261004a');
  const { mockDB } = await import('../../docs/src/core/domain/domain.js?v=20261004a');
  setDataSource('api', { apiBaseUrl: base, authToken: token });
  await init();
  for (const k of ['attendanceAppeals', 'inspectionAppeals', 'issueUnread', 'authAudit']) {
    assert.ok(Array.isArray(mockDB[k]), `init() 后 mockDB.${k} 应为数组（＝适配器组名与 _loadAuxCollections 对齐）`);
  }
  assert.ok(mockDB.attendanceAppeals.some((a) => a.status === 'closed'), 'init 拉取到的申诉队列含上例已经服务端处置的记录');
  assert.ok(mockDB.issueUnread.some((r) => r.assigneeId === 'p11'), 'init 拉取到的未读标记含上例已服务端销项的行（unread:false 也回读）');
});
