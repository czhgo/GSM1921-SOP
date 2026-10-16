// role: [工程师]+[AI]
// issue-anonymity.test.mjs — 意见反馈「支部内匿名」口径验收（D-824，2026-10-16）
//
// ═══════════════════════════════════════════════════════════════════════════
// 本次现行裁定：支书 2026-10-16 决定「匿名反馈永远在各支部内」；不设系统揭名入口。
//
// 口径（本文件即该口径的常驻断言）：
//   · 匿名 = 支部工作人员看不到提交人；服务端受保护记录保存 `_realPersonId`，mock 浏览器存储不保存真身；
//   · 必须登录；支部账号只能读本支部，党委列表为空；提交与处置同样按支部收口；
//   · **一切常规读出口一律脱敏**（支部读 / 提交回执 / 处置回执 / 前端 getAll·getById·getDrafts…）；
//   · 后台受保护字段保留真实提交人；本机 mock 不具备受保护存储，须清除旧身份字段；当前无系统揭名入口。
//
// ── 适用范围（重要，不许越界）─────────────────────────────────────────────────
//   本改裁**只落在「意见反馈」一处**。「正式表决无记名」**维持 2026-09-12 原裁定不变**
//   （两段式：参与记录 + tally，**逐人选项不落库**）——支书同日就「无记名表决是否一并改」单独裁定为
//   「**表决保持真无记名**」。**故本文件不涉及、也不得外推到 `ballotMode` / `agenda-votes` /
//   `async-vote` / `agenda-quorum` 任何表决相关代码与断言。**
//
// ── 三条对照（谁看得到 / 谁看不到）─────────────────────────────────────────
//   ① 党委（party-staff）：**看不到反馈或真身**；不是向党委上报的入口。
//   ② 党支部内部（登录支部账号）：**只看本支部且看不到匿名真身**；处置仍按支委权限。
//   ③ 未登录：**不得访问反馈域**。匿名项 `submittedBy='匿名'`、`participants=[]`；
//      提交人只能经**本机随机令牌的哈希**自认「我提交过哪几条」（`getMyIssues` 第 ③ 条，与 personId 无关，
//      不可反查人）——该自认契约本次**保持不变**。
//
// ── 与旧版（2026-09-12「真匿名」）的差别 ───────────────────────────────────
//   旧：匿名记录**根本不落真身**（存储层也不许出现身份字段），前端还有「读取时删除 `_realPersonId`」的迁移。
//   新：**库里留真身、出口脱敏**。故本文件旧版「存储层不得含身份字段」的断言**已删除**（不是改松而是**反转口径**：
//   现在**必须**含 `_realPersonId` 且等于真实提交人），前端旧迁移逻辑的断言一并撤除。
//
// 双形态：API（in-process createApp + 真服务端鉴权） + mock（Playwright 浏览器内 IssueStore 真跑）
// 运行：node --test server/test/issue-anonymity.test.mjs
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createApp } from '../app.js';
import { seedDatabase } from '../seed.js';
// 前后端同源哈希（服务端与前端共用；测试据此证明 tokenHash 由随机 token 派生、不含 personId）
import { hashSubmitterToken } from '../../docs/src/core/domain/constants.js?v=20261016b';
import { chromium } from 'playwright';

let app, server, base;

before(async () => {
  app = createApp({ dbPath: ':memory:' });
  await seedDatabase(app.locals.db);
  server = app.listen(0);
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => server.close());

async function login(personId) {
  const res = await fetch(`${base}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ personId, password: '123456' }),
  });
  const j = await res.json();
  return j.token;
}

function postIssue(token, body) {
  return fetch(`${base}/api/v1/issues`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
}

async function getIssues(token) {
  const res = await fetch(`${base}/api/v1/issues`, token ? { headers: { Authorization: `Bearer ${token}` } } : {});
  assert.equal(res.status, 200);
  return res.json();
}

/** 历史兼容路径；现行政策下所有角色均应被拒绝。 */
function getReveal(token) {
  return fetch(`${base}/api/v1/issues/reveal`, token ? { headers: { Authorization: `Bearer ${token}` } } : {});
}

/** 直查服务端存储层（`issues` 表原始落库记录） */
function storedIssue(id) {
  const row = app.locals.db.prepare('SELECT data FROM issues WHERE id = ?').get(id);
  assert.ok(row, `反馈 ${id} 已落库`);
  return { raw: row.data, rec: JSON.parse(row.data) };
}

/** 留痕表快照（`issue_reveals`；表不在资源 CRUD 映射内，前端不能自行造/改） */
function revealTraces() {
  return app.locals.db.prepare('SELECT data FROM issue_reveals').all().map((r) => JSON.parse(r.data));
}

// 常规读出口**一律不得出现**的可反查提交人的候选字段（响应侧全量集合）
const IDENTITY_KEYS = ['_realPersonId', 'realPersonId', 'submitterId', 'submitterToken', 'personId', 'authorId', 'author'];
// 存储层口径（改裁后）：`_realPersonId` **必须**在场（匿名项），其余身份字段仍不得出现
const STORAGE_FORBIDDEN_KEYS = IDENTITY_KEYS.filter((k) => k !== '_realPersonId');

const T0 = Date.now();
let anonIssue = null;    // 本文件 ① 的匿名条目（供 ②③④ 复用）
let realIssue = null;    // 实名条目（供 ⑤ 与留痕「不含实名 id」复用）

// ═══════════════════════════════════════════════════════════════════════════
//  ① 匿名提交：落库记真身；只有支部内可读，且任何常规出口都取不到真身
// ═══════════════════════════════════════════════════════════════════════════
test('API ①匿名提交：服务端存储层记真身；未登录拒绝、支部内脱敏、党委空列表', async () => {
  const member = await login('p5');
  const sec = await login('p13');
  const token = 'anon-token-' + T0;
  const title = '匿名意见-' + T0;
  const res = await postIssue(member, {
    title, body: '匿名字内容', scope: 'scenario', types: ['bug'],
    anonymous: true, submitterToken: token,
    // 恶意注入身份字段：服务端一律不采信（真身取自会话 actor，不取自请求体）
    submittedBy: 'p99', _realPersonId: 'p99', realPersonId: 'p99', submitterId: 'p99',
    participants: ['p99'], author: 'p99',
  });
  assert.equal(res.status, 201);
  const created = await res.json();
  anonIssue = created;

  // ── 提交回执：脱敏（不含真身，也不含被注入的伪身份） ──
  assert.equal(created.submittedBy, '匿名');
  assert.equal(created.anonymous, true);
  assert.deepEqual(created.participants, [], '匿名反馈不得有参与者（防经 participants 反查）');
  for (const k of IDENTITY_KEYS) assert.ok(!(k in created), `提交回执不得含身份字段 ${k}`);

  // ── 存储层（本次改裁的核心变化：**必须**含真身，且不采信客户端自述） ──
  const { raw, rec } = storedIssue(created.id);
  assert.equal(rec.submittedBy, '匿名', '对外字段仍是匿名');
  assert.equal(rec.anonymous, true);
  assert.deepEqual(rec.participants, []);
  assert.equal(rec._realPersonId, 'p5', '改裁后存储层**必须**记真实提交人（取值＝会话 actor，非请求体自述）');
  assert.ok(!raw.includes('p99'), '存储层不得采信客户端自述身份（p99 是请求体注入的伪身份）');
  assert.ok(!raw.includes('"author"'), '存储层不得含 author 字段');
  for (const k of STORAGE_FORBIDDEN_KEYS) assert.ok(!(k in rec), `存储层不得含 ${k}（真身只走 _realPersonId）`);

  // ── 未登录不能读取；党委维持 bootstrap 形状但不返回任何反馈 ──
  const unauth = await fetch(`${base}/api/v1/issues`);
  assert.equal(unauth.status, 401, '未登录不得读取支部反馈');
  const partyRows = await getIssues(await login('p_pc'));
  assert.deepEqual(partyRows, [], '党委账号不能读取支部反馈');

  // ── 支书视角（p13 secretary）：同样脱敏（「处置」≠「查看真身」）──
  const secList = await getIssues(sec);
  const secRow = secList.find((i) => i.id === created.id);
  assert.ok(secRow, '本支部支书可见该反馈（处置用）');
  assert.equal(secRow.submittedBy, '匿名');
  for (const k of IDENTITY_KEYS) assert.ok(!(k in secRow), `支书视角不得含身份字段 ${k}`);
  assert.ok(!JSON.stringify(secRow).includes('"p5"'), '支书视角不得含提交人 personId');
});

// ═══════════════════════════════════════════════════════════════════════════
//  ①′ 处置不得把真身擦掉 —— 写口 / 出口分离（2026-09-17 批次 51 修的真实缺陷）
//  来历：本批把 `sanitizeIssue` 从「读取时删库里的 `_realPersonId`」改成「**只剥不外泄、不回写**」后，
//  `PATCH /issues/:id` 仍先 `sanitizeIssue` 读、再整条 `INSERT OR REPLACE` 写回 ⇒
//  **支书每处置一次（指派 / 关闭 / 评论），库里那条匿名反馈的真实提交人就永久没了**。
//  前端 `_syncIssueToApi` 在每次处置都会 PATCH ⇒ api 形态下极易触发，且**全程没有任何提示**。
//  这正是 R-80 的同族：「**有一个出口脱敏，就要有一个写口保证不顺手把库里的东西擦掉**」——
//  **脱敏是出口的事，不是写口的事**。此断言即该条纪律的常驻守卫（修了不加守卫＝还会回来，R-67）。
test('API ①′处置不清真身：支书反复 PATCH 后库里仍保留匿名真实提交人，且出口始终脱敏', async () => {
  const member = await login('p5');
  const sec = await login('p13');
  const created = await (await postIssue(member, {
    title: '处置不清真身-' + Date.now(), body: '正文', scope: 'scenario', types: ['bug'],
    anonymous: true, submitterToken: 'anon-keep-' + Date.now(),
  })).json();
  const readRaw = () => JSON.parse(app.locals.db.prepare('SELECT data FROM issues WHERE id = ?').get(created.id).data);
  assert.equal(readRaw()._realPersonId, 'p5', '落库即含真身');

  // 模拟支书侧的三种典型处置（指派 → 关闭 → 追加评论）：每一次都会把整条记录回写
  const patches = [
    { status: 'processing', assignee: 'p13', assigneeRole: 'secretary' },
    { status: 'closed', closedReason: '已办理', closedAt: new Date().toISOString() },
    { comments: [{ id: 'c-keep-1', author: 'p13', body: '已核实' }], commentCount: 1 },
  ];
  for (const [i, patch] of patches.entries()) {
    const res = await fetch(`${base}/api/v1/issues/${created.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sec}` },
      body: JSON.stringify(patch),
    });
    assert.equal(res.status, 200, `第 ${i + 1} 次处置应成功`);
    const got = await res.json();
    for (const k of IDENTITY_KEYS) assert.ok(!(k in got), `处置回执不得含身份字段 ${k}`);
    assert.equal(got.submittedBy, '匿名', '处置后对外仍是匿名');
    assert.equal(readRaw()._realPersonId, 'p5', `第 ${i + 1} 次处置后库里必须仍含真身（写口不得把脱敏后的对象整条写回）`);
  }

  // 真实身份字段仍在受保护存储中，但当前没有系统揭名出口。
  const reveal = await getReveal(await login('p_pc'));
  assert.equal(reveal.status, 403, '党委不能通过系统查看真身');
  assert.equal(readRaw()._realPersonId, 'p5', '拒绝揭名不改变后台身份记录');
});

// ═══════════════════════════════════════════════════════════════════════════
//  ② 党委既不能读取支部反馈，也不能经旧兼容路径揭名
// ═══════════════════════════════════════════════════════════════════════════
test('API ②党委不能读取反馈或通过兼容端点揭名', async () => {
  const pc = await login('p_pc');
  const res = await getReveal(pc);
  assert.equal(res.status, 403);
  assert.ok(!(await res.text()).includes('p5'));
  const rows = await getIssues(pc);
  assert.deepEqual(rows, [], '党委没有匿名反馈列表');
  assert.equal(storedIssue(anonIssue.id).rec._realPersonId, 'p5', '受保护存储仍保留真实提交人');
});

// ═══════════════════════════════════════════════════════════════════════════
//  ③ 所有角色均不可经 reveal 揭名 ＋ 未登录 401
// ═══════════════════════════════════════════════════════════════════════════
test('API ③揭名端点保持关闭：支部各角色与党委均 403，未登录 401', async () => {
  // 逐一覆盖七个支部侧角色（单一源 roles：p13 支书 / p14 副支书 / p11 组织 / p12 宣传 / p10 纪检 / p1 组长 / p5 成员）
  const FORBIDDEN = [
    ['p13', 'secretary', '支书'],
    ['p14', 'deputy-secretary', '副支书'],
    ['p11', 'org-commissioner', '组织委员'],
    ['p12', 'prop-commissioner', '宣传委员'],
    ['p10', 'disc-commissioner', '纪检委员'],
    ['p1', 'leader', '党小组组长'],
    ['p5', 'participant', '普通成员'],
  ];
  for (const [pid, role, label] of FORBIDDEN) {
    const token = await login(pid);
    const res = await getReveal(token);
    assert.equal(res.status, 403, `${label}（${pid}/${role}）不得查看匿名真身`);
    const body = await res.text();
    assert.ok(!body.includes('p5'), `${label} 的 403 响应体不得夹带真身`);
    assert.ok(!body.includes('realPersonId'), `${label} 的 403 响应体不得夹带真身字段`);
  }
  const party = await getReveal(await login('p_pc'));
  assert.equal(party.status, 403, '党委同样不能揭名');
  // 未登录（无 token）→ 401
  const anon = await getReveal(null);
  assert.equal(anon.status, 401, '未登录不得查看匿名真身');
  assert.ok(!(await anon.text()).includes('p5'));
});

// ═══════════════════════════════════════════════════════════════════════════
//  ④ 揭名入口关闭：任何角色被拒后都不能新增揭名留痕
// ═══════════════════════════════════════════════════════════════════════════
test('API ④关闭揭名后任何角色均不能新增揭名留痕', async () => {
  // 先备一条实名反馈，作为「revealedIds 不含实名 id」的对照
  const member = await login('p5');
  realIssue = await (await postIssue(member, {
    title: '实名意见-' + T0, body: '实名内容', scope: 'scenario', types: ['enhancement'],
    anonymous: false, submitterToken: 'real-token-' + T0,
  })).json();

  const before = revealTraces();
  // 非党委查看被拒 → **不留痕**（否则留痕表会被无关角色刷脏，失去「谁看了」的意义）
  await getReveal(await login('p13'));
  assert.equal(revealTraces().length, before.length, '被拒（403）的查看不得留痕');

  // 党委查看被拒 → 不新增留痕
  const pc = await login('p_pc');
  const res = await getReveal(pc);
  assert.equal(res.status, 403);

  const after = revealTraces();
  assert.equal(after.length, before.length, '拒绝访问不写揭名留痕');
});

// ═══════════════════════════════════════════════════════════════════════════
//  ⑤ 实名提交：行为不变（真身即 submittedBy；无 `_realPersonId` 冗余）
// ═══════════════════════════════════════════════════════════════════════════
test('API ⑤实名提交：submittedBy ＝ 提交人且仍只在本支部可读', async () => {
  assert.ok(realIssue, '④ 已备实名条目');
  assert.equal(realIssue.submittedBy, 'p5');
  assert.equal(realIssue.anonymous, false);
  assert.deepEqual(realIssue.participants, ['p5']);
  assert.ok(!('_realPersonId' in realIssue), '实名不重复存真身（真身即 submittedBy）');

  const { rec } = storedIssue(realIssue.id);
  assert.ok(!('_realPersonId' in rec), '实名条目存储层亦无 `_realPersonId` 冗余');
  assert.equal(rec.submittedBy, 'p5');

  const rows = await getIssues(await login('p5'));
  assert.equal(rows.find((i) => i.id === realIssue.id)?.submittedBy, 'p5', '实名信息只对本支部常规读者可见');
  assert.equal((await getReveal(await login('p_pc'))).status, 403);
});

// ═══════════════════════════════════════════════════════════════════════════
//  ⑥ 防刷行为不变：只按 tokenHash 判重/限频（与 personId 无关）
// ═══════════════════════════════════════════════════════════════════════════
test('API ⑥防刷不变：同一 token 判重 + 频率上限；换登录人同 token 仍判重（只认 tokenHash）', async () => {
  const member = await login('p5');
  const token = 'abuse-token-' + Math.random().toString(36).slice(2);
  const body = { title: '限频测试', body: '同一内容', scope: 'scenario', types: ['bug'], anonymous: true, submitterToken: token };
  const first = await postIssue(member, body);
  assert.equal(first.status, 201);
  const dup = await postIssue(member, body);
  assert.equal(dup.status, 409, '同 token 相同内容 → 判重');

  // 换一个登录人（支书）用**同一 token** 再交同样内容 → 仍判重 ⇒ 判重口径只认 tokenHash，与 personId 无关
  const sec = await login('p13');
  const dupOther = await postIssue(sec, body);
  assert.equal(dupOther.status, 409, '判重只认 tokenHash（换登录人同样命中），与 personId 无关');

  let last;
  for (let i = 0; i < 25; i++) {
    last = await postIssue(member, { ...body, title: '限频-' + i, body: '内容-' + i });
  }
  assert.equal(last.status, 429, '超频率上限 → 429（限频亦只按 tokenHash）');
});

// ═══════════════════════════════════════════════════════════════════════════
//  ⑦ tokenHash 不可反查：确定性派生、不含 personId / 原始 token
// ═══════════════════════════════════════════════════════════════════════════
test('API ⑦tokenHash 不可反查：确定性派生、不含 personId / 原始 token（改裁不改变此承诺）', async () => {
  const member = await login('p5');
  const token = 'hash-token-' + Math.random().toString(36).slice(2);
  const created = await (await postIssue(member, {
    title: '哈希意见-' + T0, body: '哈希内容', scope: 'scenario', types: ['question'],
    anonymous: true, submitterToken: token,
  })).json();
  assert.equal(created.tokenHash, hashSubmitterToken(token), 'tokenHash 由随机 token 确定性派生');
  assert.ok(!created.tokenHash.includes('p5'), 'tokenHash 不得含 personId');
  assert.ok(!created.tokenHash.includes(token), 'tokenHash 不得含原始 token');
  assert.ok(!JSON.stringify(created).includes(token), '常规读回执不得留原始 token');
  // 与真身字段的分离：tokenHash 是防刷线，`_realPersonId` 只在服务端受保护存储层保留
  assert.ok(!('_realPersonId' in created), '常规读回执不得带服务端受保护真身字段');

  // 不同 token → 不同 hash（不是全局常量，可区分客户端而不可反查人）
  const created2 = await (await postIssue(member, {
    title: '哈希意见二-' + T0, body: '哈希内容二', scope: 'scenario', types: ['question'],
    anonymous: true, submitterToken: 'hash-token-other-' + T0,
  })).json();
  assert.notEqual(created.tokenHash, created2.tokenHash);

  // 不可反推：穷举本支部演示成员 id 均不命中（tokenHash 与 personId 无派生关系）
  const rows = await getIssues(member);
  const mine = rows.find((r) => r.id === created.id);
  assert.equal(mine.tokenHash, hashSubmitterToken(token), '公开读带 tokenHash（本机据此自认，服务端不参与认人）');
  for (const pid of ['p1', 'p5', 'p11', 'p12', 'p13', 'p14', 'p_pc']) {
    assert.notEqual(hashSubmitterToken(pid), mine.tokenHash, `tokenHash 不得可由 personId（${pid}）推出`);
  }
  assert.notEqual(hashSubmitterToken('another-browser-token-' + T0), mine.tokenHash, '别台浏览器令牌比不中');
});

// ═══════════════════════════════════════════════════════════════════════════
//  ⑧ 自认契约不变（结构层）：`getMyIssues` 第 ③ 条仍按本机随机令牌哈希自认
// ═══════════════════════════════════════════════════════════════════════════
test('API ⑧自认契约不变：getMyIssues 第 ③ 条（本机令牌哈希自认）+ 读路径只读取令牌', async () => {
  const src = readFileSync(join(import.meta.dirname, '..', '..', 'docs', 'src', 'services', 'governance', 'issues.js'), 'utf8');
  const fn = src.slice(src.indexOf('getMyIssues(userId)'));
  const body = fn.slice(0, fn.indexOf('\n  },'));
  assert.match(body, /hashSubmitterToken\(/, 'getMyIssues 须按本机令牌哈希自认（改裁后仍保留）');
  assert.match(body, /i\.tokenHash === myHash/, '判据须落在 tokenHash 比对上（与 personId 无关）');
  assert.match(body, /_peekSubmitterToken\(\)/, '读路径须用只读取令牌（不得因「看一眼」就生成令牌）');
  // 出口仍脱敏：自认不得引入真身（否则「不可反查」承诺被破坏）
  assert.match(body, /_sanitizeIssues\(/, 'getMyIssues 出口须脱敏（不含真身）');
  // 旧「删除 _realPersonId」的历史迁移彻底撤除（改裁后库里要留真身）
  assert.ok(!/_stripLegacyIdentity/.test(src), '旧「读取/回写时删除 `_realPersonId`」迁移须整段撤除');
});

// ═══════════════════════════════════════════════════════════════════════════
//  ⑨ mock 形态（Playwright）：浏览器不留真身 / 旧缓存迁移清除身份 / 任意角色均无揭名出口
// ═══════════════════════════════════════════════════════════════════════════
test('mock 形态：浏览器存储不保留真身（含旧缓存迁移）；党委没有反馈入口且不新增揭名留痕', async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.route('**://cdn.tailwindcss.com/**', (r) => r.abort());
    await page.goto(`${base}/index.html`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    const out = await page.evaluate(async () => {
      const { IssueStore } = await import('/src/services/governance/issues.js?v=20261016b');
      const { PersonStore } = await import('/src/services/member/person.js?v=20261016b');
      localStorage.clear();
      // 模拟升级前浏览器残留：读取时应去除真身并回写，不把身份继续留在客户端持久存储。
      localStorage.setItem('gsm1921-issue-cache-version', '4');
      localStorage.setItem('gsm1921-issue-cache-v3', JSON.stringify([{
        id: 'legacy-anonymous', number: 9001, branchId: 'br-b1', title: '旧匿名反馈', body: '旧正文',
        submittedBy: '匿名', anonymous: true, _realPersonId: 'p5', status: 'open',
      }]));
      localStorage.setItem('gsm1921-issue-drafts', JSON.stringify([{
        draftId: 'legacy-draft', type: 'new-issue', author: '匿名',
        payload: { title: '旧匿名草稿', submittedBy: '匿名', anonymous: true, _realPersonId: 'p5' },
      }]));
      const loginAs = (personId, role) => localStorage.setItem('gsm1921-login-user', JSON.stringify({ personId, role }));

      loginAs('p5', 'participant');
      await IssueStore.loadAll();
      // 匿名提交 → 支书审核通过 → 仅本支部内可见
      const dAnon = await IssueStore.submitIssue({ title: '匿名-A', body: '内容A', scope: 'scenario', types: ['bug'], anonymous: true });
      const anon = IssueStore.approveDraft(dAnon.draftId);
      // 实名提交 → 同样仅本支部内可见
      const dReal = await IssueStore.submitIssue({ title: '实名-B', body: '内容B', scope: 'scenario', types: ['bug'], anonymous: false });
      const real = IssueStore.approveDraft(dReal.draftId);

      // 常规出口脱敏（成员视角）
      const viaGetAll = IssueStore.getAll().find((i) => i.id === anon.id);
      const viaGetById = IssueStore.getById(anon.id);
      const viaDrafts = IssueStore.getDrafts();

      // 非党委调核查出口（成员视角）
      const asMember = await IssueStore.getIssuesForPartyReview();

      // 党委视角：服务层不提供列表或揭名出口
      loginAs('p_pc', 'party-staff');
      const asParty = await IssueStore.getIssuesForPartyReview();
      const tracesAfterReveal = JSON.parse(localStorage.getItem('issue_reveals') || '[]');
      const p5Name = PersonStore.getName('p5');

      // 支书视角调核查出口（前端闸门：不得越权）
      loginAs('p13', 'secretary');
      const asSecretary = await IssueStore.getIssuesForPartyReview();

      // 支书端界面：反馈管理 tab 列表 + 详情面板
      const tc = document.createElement('div');
      tc.id = 'secretary-tab-content';
      document.body.appendChild(tc);
      const fb = await import('/src/entries/tabs/secretary/feedback-tab.js?v=20261016b');
      fb.renderContent();
      const listRow = document.querySelector(`[data-issue-id="${anon.id}"]`);
      const listRowHtml = listRow ? listRow.innerHTML : '';
      if (listRow) listRow.click();
      const detailHtml = document.getElementById('issue-detail-panel')?.innerHTML || '';
      tc.remove();

      // 旧党委核查深链：不加载数据，只显示支部内处理边界
      const pc = document.createElement('div');
      pc.id = 'party-committee-tab-content';
      document.body.appendChild(pc);
      const pcTab = await import('/src/entries/tabs/party-committee/issue-review-tab.js?v=20261016b');
      await pcTab.renderContent();
      const asSecretaryHtml = pc.innerHTML;
      // …党委同样只看到边界说明
      loginAs('p_pc', 'party-staff');
      await pcTab.renderContent();
      const asPartyHtml = pc.innerHTML;
      pc.remove();

      return {
        anon, real, viaGetAll, viaGetById, viaDrafts, asMember, asParty, asSecretary,
        asSecretaryHtml, asPartyHtml, listRowHtml, detailHtml, p5Name,
        rawCache: localStorage.getItem('gsm1921-issue-cache-v3'),
        rawDrafts: localStorage.getItem('gsm1921-issue-drafts'),
        legacyCacheVersion: localStorage.getItem('gsm1921-issue-cache-version'),
        tracesAfterReveal,
        traces: (() => { try { return JSON.parse(localStorage.getItem('issue_reveals') || '[]'); } catch { return []; } })(),
      };
    });

    // ── mock 常规出口：匿名项脱敏（不含真身；作者字段亦不为真实 personId） ──
    assert.equal(out.anon.submittedBy, '匿名');
    assert.equal(out.anon.anonymous, true);
    assert.deepEqual(out.anon.participants, []);
    for (const k of IDENTITY_KEYS) assert.ok(!(k in out.anon), `approveDraft 回执不得含身份字段 ${k}`);
    for (const [label, rec] of [['getAll', out.viaGetAll], ['getById', out.viaGetById]]) {
      assert.ok(rec, `${label} 取得到该条`);
      for (const k of IDENTITY_KEYS) assert.ok(!(k in rec), `${label} 出口不得含身份字段 ${k}`);
      assert.ok(!JSON.stringify(rec).includes('"p5"'), `${label} 出口不得含提交人 personId`);
    }

    // ── mock 本地库（缓存）：不能把“本机可读”冒充为“后台受保护” ──
    const cachedAnon = JSON.parse(out.rawCache).find((i) => i.id === out.anon.id);
    assert.ok(cachedAnon, '匿名反馈已入本地库（缓存）');
    assert.ok(!('_realPersonId' in cachedAnon), 'mock 本地缓存不得保存真实提交人');
    assert.equal(cachedAnon.submittedBy, '匿名', '对外字段仍匿名');
    for (const k of IDENTITY_KEYS) assert.ok(!(k in cachedAnon), `mock 本地缓存不得含身份字段 ${k}`);
    const legacyCache = JSON.parse(out.rawCache).find((i) => i.id === 'legacy-anonymous');
    assert.ok(legacyCache, '旧匿名记录的业务内容应保留');
    assert.ok(!('_realPersonId' in legacyCache), '旧缓存迁移必须移除浏览器侧真身');
    assert.equal(out.legacyCacheVersion, '4', '身份清理不应借版本升级丢弃用户本地记录');
    // 匿名草稿不落身份；升级前遗留草稿在读取时也迁除真身。
    const rawDraftAnon = JSON.parse(out.rawDrafts).find((d) => d && d.payload && d.payload.title === '匿名-A');
    assert.ok(rawDraftAnon && !('_realPersonId' in rawDraftAnon.payload), '匿名草稿不得在浏览器存储真身');
    assert.equal(rawDraftAnon.author, '匿名', '草稿作者字段不得为真实 personId');
    const legacyDraft = JSON.parse(out.rawDrafts).find((d) => d.draftId === 'legacy-draft');
    assert.ok(legacyDraft, '旧匿名草稿的业务内容应保留');
    assert.ok(!('_realPersonId' in legacyDraft.payload), '旧草稿迁移必须移除浏览器侧真身');
    const draftViaExit = out.viaDrafts.find((d) => d && d.payload && d.payload.title === '匿名-A');
    assert.ok(draftViaExit && !('_realPersonId' in draftViaExit.payload), 'getDrafts 出口须脱敏（不含真身）');

    // ── 前端闸门：任何角色都不能经系统揭名；党委工作台无反馈查询出口 ──
    assert.equal(out.asMember.forbidden, true, '成员调核查出口须被拒（前端闸门）');
    assert.deepEqual(out.asMember.rows, [], '被拒时不得返回任何（含真身的）记录');
    assert.equal(out.asSecretary.forbidden, true, '支书也没有系统揭名入口');
    assert.deepEqual(out.asSecretary.rows, []);
    assert.ok(out.p5Name && out.p5Name !== 'p5', '演示成员 p5 可解析为姓名');
    assert.ok(!out.asSecretaryHtml.includes(out.p5Name), '旧核查深链不得出现真身');
    assert.ok(out.asSecretaryHtml.includes('匿名反馈不是向党委上报的入口'));

    // ── 党委视角：无列表、无真身、无前端留痕 ──
    assert.equal(out.asParty.forbidden, true);
    assert.equal(out.asParty.traced, false);
    assert.deepEqual(out.asParty.rows, []);
    assert.ok(!out.asPartyHtml.includes(out.p5Name), '党委旧深链不得出现真身');
    assert.ok(out.asPartyHtml.includes('党委工作台不读取反馈内容或提交人身份'));

    assert.deepEqual(out.tracesAfterReveal, [], '关闭揭名后不新增前端揭名留痕');
    assert.deepEqual(out.traces, []);

    // ── 支书端界面（常规视图）：列表与详情都看不到匿名真身 ──
    assert.ok(!out.listRowHtml.includes(out.p5Name), '支书端列表行不得出现匿名提交人姓名');
    assert.ok(out.listRowHtml.includes('匿名'), '支书端列表行应显示「匿名」');
    assert.ok(!out.detailHtml.includes(out.p5Name), '支书端详情不得出现匿名提交人姓名');
    assert.ok(!out.detailHtml.includes('真实提交人'), '详情不得提供查看匿名真实提交人的机制');
    assert.ok(out.detailHtml.includes('提交人：匿名'), '支书端详情提交人显示匿名');
  } finally {
    await browser.close();
  }
});
