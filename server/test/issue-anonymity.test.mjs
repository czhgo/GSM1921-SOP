// role: [工程师]+[AI]
// issue-anonymity.test.mjs — 意见反馈「匿名」口径验收（**2026-09-17 支书改裁**）
//
// ═══════════════════════════════════════════════════════════════════════════
// 本次改裁来源（支书 2026-09-17 原话，不得自行延伸）：
//   「**后台记录真实情况，匿名是前端的。但是我们也强调清楚，查看匿名的权限只有党委有。**」
//
// 口径（本文件即该口径的常驻断言）：
//   · 匿名 = **前端展示层匿名**：后台（服务端 `issues` 表 / mock 本地库）**记真实提交人 `_realPersonId`**；
//   · **一切常规读出口一律脱敏**（公开读 / 支书读 / 提交回执 / 处置回执 / 前端 getAll·getById·getDrafts…）；
//   · **唯一例外 = 党委核查出口**（`GET /api/v1/issues/reveal` / `IssueStore.getIssuesForPartyReview`），
//     且**每次查看都留痕**（服务端表 `issue_reveals` / mock 本地同名表）。
//
// ── 适用范围（重要，不许越界）─────────────────────────────────────────────────
//   本改裁**只落在「意见反馈」一处**。「正式表决无记名」**维持 2026-09-12 原裁定不变**
//   （两段式：参与记录 + tally，**逐人选项不落库**）——支书同日就「无记名表决是否一并改」单独裁定为
//   「**表决保持真无记名**」。**故本文件不涉及、也不得外推到 `ballotMode` / `agenda-votes` /
//   `async-vote` / `agenda-quorum` 任何表决相关代码与断言。**
//
// ── 三条对照（谁看得到 / 谁看不到）─────────────────────────────────────────
//   ① 党委（party-staff）：**看得到** —— 唯一出口；每次查看在 `issue_reveals` 留一条痕（谁 / 何时 / 看了哪些）。
//   ② 党支部内部（支书 secretary / 副支书 / 三委员 / 组长）：**看不到** —— 常规读脱敏 + 核查出口 403。
//      「处置」（PATCH /issues，仅支书）与「查看真身」是**两项分开的权限**（这正是本次改裁的要点）。
//   ③ 提交人本人与其他成员 / 未登录：**看不到** —— 匿名项 `submittedBy='匿名'`、`participants=[]`；
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
import { hashSubmitterToken } from '../../docs/src/core/constants.js?v=20260921m';
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
    body: JSON.stringify({ personId }),
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

/** 党委核查出口（唯一带真身的读口） */
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
//  ① 匿名提交：落库**记真身**（改裁要求），常规读出口（公开 / 支书）**取不到真身**
// ═══════════════════════════════════════════════════════════════════════════
test('API ①匿名提交：服务端存储层记真身 `_realPersonId`；公开读与支书读均脱敏', async () => {
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

  // ── 公开读（未登录）：可见该条（处置结果公开口径），但不含真身 ──
  const pub = await getIssues(null);
  const pubRow = pub.find((i) => i.id === created.id);
  assert.ok(pubRow, '意见列表公开可读');
  assert.equal(pubRow.submittedBy, '匿名');
  for (const k of IDENTITY_KEYS) assert.ok(!(k in pubRow), `公开读不得含身份字段 ${k}`);
  assert.ok(!JSON.stringify(pubRow).includes('"p5"'), '公开读不得含提交人 personId');

  // ── 支书视角（p13 secretary）：同样脱敏（「处置」≠「查看真身」）──
  const secList = await getIssues(sec);
  const secRow = secList.find((i) => i.id === created.id);
  assert.ok(secRow, '支书可见该反馈（处置用）');
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

  // 且党委核查出口仍然取得到（真身没被处置动作擦掉）
  const revealed = await (await getReveal(await login('p_pc'))).json();
  assert.equal(revealed.find((x) => x.id === created.id)?.realPersonId, 'p5', '处置 N 次后党委仍应查到真身');
});

// ═══════════════════════════════════════════════════════════════════════════
//  ② 党委核查出口：看得到真身（且人对了）
// ═══════════════════════════════════════════════════════════════════════════
test('API ②党委核查出口：party-staff 取得到真身，realPersonId ＝ 真实提交人', async () => {
  const pc = await login('p_pc');
  const res = await getReveal(pc);
  assert.equal(res.status, 200);
  const rows = await res.json();
  const got = rows.find((i) => i.id === anonIssue.id);
  assert.ok(got, '党委核查列表须含该匿名反馈');
  assert.equal(got.realPersonId, 'p5', '匿名项 realPersonId ＝ 真实提交人');
  assert.equal(got.submittedBy, '匿名', '对外展示口径不变');
  // 形状：每条都带 realPersonId 字段（匿名=真身 id；实名=null，真身即 submittedBy）
  for (const r of rows) assert.ok('realPersonId' in r, `核查出口每条都须含 realPersonId 字段（${r.id}）`);
  // 真身同族键仍不得出现（避免同一出口既给 realPersonId 又漏 `_realPersonId`）
  for (const r of rows) {
    assert.ok(!('_realPersonId' in r), '核查出口只暴露 realPersonId，不得漏 `_realPersonId`');
    assert.ok(!('submitterId' in r));
  }
  // 核查**不改库**（只读 + 留痕；真身不得因查看而被改写/清除）
  assert.equal(storedIssue(anonIssue.id).rec._realPersonId, 'p5', '查看真身不得改动库里的真身');
});

// ═══════════════════════════════════════════════════════════════════════════
//  ③ 非党委角色一律 403（逐一覆盖）＋ 未登录 401
// ═══════════════════════════════════════════════════════════════════════════
test('API ③核查出口授权：非党委角色逐一 403（含支书/副支书/三委员/组长/成员），未登录 401', async () => {
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
  // 未登录（无 token）→ 401
  const anon = await getReveal(null);
  assert.equal(anon.status, 401, '未登录不得查看匿名真身');
  assert.ok(!(await anon.text()).includes('p5'));
});

// ═══════════════════════════════════════════════════════════════════════════
//  ④ 留痕：每次党委查看**新增且仅新增一条**（by / byRole / at(ISO) / revealedIds）
//     并证明「被拒的查看不留痕」
// ═══════════════════════════════════════════════════════════════════════════
test('API ④留痕：党委查看一次即新增一条（含匿名 id、不含实名 id）；非党委 403 不留痕', async () => {
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

  // 党委查看一次 → 新增且仅新增一条
  const pc = await login('p_pc');
  const res = await getReveal(pc);
  assert.equal(res.status, 200);

  const after = revealTraces();
  assert.equal(after.length, before.length + 1, '党委查看一次 → 留痕**新增且仅新增一条**');
  const trace = after[after.length - 1];
  assert.ok(trace.id, '留痕须带 id');
  assert.equal(trace.by, 'p_pc', '留痕须记「谁」');
  assert.equal(trace.byRole, 'party-staff', '留痕须记「以什么角色」');
  assert.match(String(trace.at), /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/, '留痕时间须为 ISO 串');
  assert.ok(Array.isArray(trace.revealedIds), '留痕须记「看了哪些」');
  assert.ok(trace.revealedIds.includes(anonIssue.id), '留痕须含被查看的匿名条目 id');
  assert.ok(!trace.revealedIds.includes(realIssue.id), '实名真身本就公开 → 不计入留痕');
  // 留痕只对匿名条目负责：种子里 4 条公开反馈 + 本文件① 的匿名项
  assert.ok(trace.revealedIds.length >= 5, `留痕应覆盖全部匿名条目（实测 ${trace.revealedIds.length} 条）`);
});

// ═══════════════════════════════════════════════════════════════════════════
//  ⑤ 实名提交：行为不变（真身即 submittedBy；无 `_realPersonId` 冗余；核查出口为 null）
// ═══════════════════════════════════════════════════════════════════════════
test('API ⑤实名提交：submittedBy ＝ 提交人（真身本就公开）；核查出口 realPersonId 为 null', async () => {
  assert.ok(realIssue, '④ 已备实名条目');
  assert.equal(realIssue.submittedBy, 'p5');
  assert.equal(realIssue.anonymous, false);
  assert.deepEqual(realIssue.participants, ['p5']);
  assert.ok(!('_realPersonId' in realIssue), '实名不重复存真身（真身即 submittedBy）');

  const { rec } = storedIssue(realIssue.id);
  assert.ok(!('_realPersonId' in rec), '实名条目存储层亦无 `_realPersonId` 冗余');
  assert.equal(rec.submittedBy, 'p5');

  // 常规读（公开）能看出实名提交人（本就公开）
  const pub = await getIssues(null);
  assert.equal(pub.find((i) => i.id === realIssue.id)?.submittedBy, 'p5', '实名提交人公开可见（口径不变）');

  // 核查出口：实名项 realPersonId = null（真身在 submittedBy），形状与匿名项一致
  const rows = await (await getReveal(await login('p_pc'))).json();
  const got = rows.find((i) => i.id === realIssue.id);
  assert.equal(got.realPersonId, null, '实名项 realPersonId 为 null（真身即 submittedBy）');
  assert.equal(got.submittedBy, 'p5');
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
  // 与真身字段的分离：tokenHash 是防刷线，`_realPersonId` 是留痕线——两条线互不影响
  assert.ok(!('_realPersonId' in created), '常规读回执不得带真身（真身只在存储层与党委出口）');

  // 不同 token → 不同 hash（不是全局常量，可区分客户端而不可反查人）
  const created2 = await (await postIssue(member, {
    title: '哈希意见二-' + T0, body: '哈希内容二', scope: 'scenario', types: ['question'],
    anonymous: true, submitterToken: 'hash-token-other-' + T0,
  })).json();
  assert.notEqual(created.tokenHash, created2.tokenHash);

  // 不可反推：穷举本支部演示成员 id 均不命中（tokenHash 与 personId 无派生关系）
  const rows = await getIssues(null);
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
  const src = readFileSync(join(import.meta.dirname, '..', '..', 'docs', 'src', 'services', 'issues.js'), 'utf8');
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
//  ⑨ mock 形态（Playwright）：常规出口脱敏 / 本地库留真身 / 党委核查可见 + 本地留痕
// ═══════════════════════════════════════════════════════════════════════════
test('mock 形态：常规出口（成员/支书）看不到真身；党委核查出口看得到；本地库留真身且留痕', async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.goto(`${base}/index.html`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    const out = await page.evaluate(async () => {
      const { IssueStore } = await import('/src/services/issues.js?v=20260921m');
      const { PersonStore } = await import('/src/services/person.js?v=20260921m');
      localStorage.clear();
      const loginAs = (personId, role) => localStorage.setItem('gsm1921-login-user', JSON.stringify({ personId, role }));

      loginAs('p5', 'participant');
      await IssueStore.loadAll();
      // 匿名提交 → 支书审核通过 → 公开
      const dAnon = await IssueStore.submitIssue({ title: '匿名-A', body: '内容A', scope: 'scenario', types: ['bug'], anonymous: true });
      const anon = IssueStore.approveDraft(dAnon.draftId);
      // 实名提交 → 公开
      const dReal = await IssueStore.submitIssue({ title: '实名-B', body: '内容B', scope: 'scenario', types: ['bug'], anonymous: false });
      const real = IssueStore.approveDraft(dReal.draftId);

      // 常规出口脱敏（成员视角）
      const viaGetAll = IssueStore.getAll().find((i) => i.id === anon.id);
      const viaGetById = IssueStore.getById(anon.id);
      const viaDrafts = IssueStore.getDrafts();

      // 非党委调核查出口（成员视角）
      const asMember = await IssueStore.getIssuesForPartyReview();

      // 党委视角：核查出口（真身 + 留痕）
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
      const fb = await import('/src/entries/tabs/secretary/feedback-tab.js?v=20260921m');
      fb.renderContent();
      const listRow = document.querySelector(`[data-issue-id="${anon.id}"]`);
      const listRowHtml = listRow ? listRow.innerHTML : '';
      if (listRow) listRow.click();
      const detailHtml = document.getElementById('issue-detail-panel')?.innerHTML || '';
      tc.remove();

      // 党委台「匿名反馈核查」页签：先以支书身份渲染（须为无权限卡）…
      const pc = document.createElement('div');
      pc.id = 'party-committee-tab-content';
      document.body.appendChild(pc);
      const pcTab = await import('/src/entries/tabs/party-committee/issue-review-tab.js?v=20260921m');
      await pcTab.renderContent();
      const asSecretaryHtml = pc.innerHTML;
      // …再以党委身份渲染（须列出真身）
      loginAs('p_pc', 'party-staff');
      await pcTab.renderContent();
      const asPartyHtml = pc.innerHTML;
      pc.remove();

      return {
        anon, real, viaGetAll, viaGetById, viaDrafts, asMember, asParty, asSecretary,
        asSecretaryHtml, asPartyHtml, listRowHtml, detailHtml, p5Name,
        rawCache: localStorage.getItem('gsm1921-issue-cache-v3'),
        rawDrafts: localStorage.getItem('gsm1921-issue-drafts'),
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

    // ── mock 本地库（缓存）：**必须**留真身（与「后台记录真实情况」同口径） ──
    const cachedAnon = JSON.parse(out.rawCache).find((i) => i.id === out.anon.id);
    assert.ok(cachedAnon, '匿名反馈已入本地库（缓存）');
    assert.equal(cachedAnon._realPersonId, 'p5', 'mock 本地库须记真实提交人（改裁要求）');
    assert.equal(cachedAnon.submittedBy, '匿名', '对外字段仍匿名');
    for (const k of STORAGE_FORBIDDEN_KEYS) assert.ok(!(k in cachedAnon), `本地库不得含 ${k}`);
    // 匿名草稿 payload 同样留真身（写链载体），但**出口已脱敏**
    const rawDraftAnon = JSON.parse(out.rawDrafts).find((d) => d && d.payload && d.payload.title === '匿名-A');
    assert.equal(rawDraftAnon.payload._realPersonId, 'p5', '匿名草稿在库里留真身（供审核后并入 issue）');
    assert.equal(rawDraftAnon.author, '匿名', '草稿作者字段不得为真实 personId');
    const draftViaExit = out.viaDrafts.find((d) => d && d.payload && d.payload.title === '匿名-A');
    assert.ok(draftViaExit && !('_realPersonId' in draftViaExit.payload), 'getDrafts 出口须脱敏（不含真身）');

    // ── 前端闸门：非党委拿不到真身（两处：service 出口 + 页签渲染） ──
    assert.equal(out.asMember.forbidden, true, '成员调核查出口须被拒（前端闸门）');
    assert.deepEqual(out.asMember.rows, [], '被拒时不得返回任何（含真身的）记录');
    assert.equal(out.asSecretary.forbidden, true, '支书调核查出口须被拒（「处置」≠「查看真身」）');
    assert.deepEqual(out.asSecretary.rows, []);
    assert.ok(out.p5Name && out.p5Name !== 'p5', '演示成员 p5 可解析为姓名');
    assert.ok(!out.asSecretaryHtml.includes(out.p5Name), '支书渲染「匿名反馈核查」页签不得出现真身');
    assert.ok(out.asSecretaryHtml.includes('本页仅党委可见'), '非党委渲染该页签应显示「仅党委可见」说明');

    // ── 党委核查出口：看得到真身 + 形状与 api 形态一致（每条含 realPersonId） ──
    assert.equal(out.asParty.forbidden, false);
    assert.equal(out.asParty.traced, true, '党委查看须留痕（mock 写本地同名表）');
    assert.ok(out.asParty.trace && Array.isArray(out.asParty.trace.revealedIds), 'mock 留痕须含 revealedIds');
    const revealedAnon = out.asParty.rows.find((i) => i.id === out.anon.id);
    assert.ok(revealedAnon, '党委核查列表须含该匿名反馈');
    assert.equal(revealedAnon.realPersonId, 'p5', 'mock 核查出口 realPersonId ＝ 真实提交人');
    for (const r of out.asParty.rows) assert.ok('realPersonId' in r, `mock 核查出口每条都须含 realPersonId（${r.id}）`);
    assert.equal(out.asParty.rows.find((i) => i.id === out.real.id)?.realPersonId, null, '实名项 realPersonId 为 null（真身即 submittedBy）');
    // 党委台页签渲染：真身姓名出现在页面上（匿名项标「匿名提交」）
    assert.ok(out.asPartyHtml.includes(out.p5Name), '党委渲染该页签须显示匿名反馈的真实提交人姓名');
    assert.ok(out.asPartyHtml.includes('匿名提交'), '匿名项须带「匿名提交」标记');

    // ── mock 留痕：**每查看一次留一条**，含 by / byRole / at(ISO) / revealedIds（含匿名 id、不含实名 id） ──
    assert.equal(out.tracesAfterReveal.length, 1, '党委经 service 出口查看一次 → 本地留痕表新增且仅新增一条');
    const tr = out.tracesAfterReveal[0];
    assert.equal(tr.by, 'p_pc');
    assert.equal(tr.byRole, 'party-staff');
    assert.match(String(tr.at), /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    assert.ok(tr.revealedIds.includes(out.anon.id), 'mock 留痕须含被查看的匿名条目 id');
    assert.ok(!tr.revealedIds.includes(out.real.id), 'mock 留痕不得含实名条目 id');
    // 党委台页签渲染 = 又一次查看 → 再留一条（「每次查看都会留痕」）；期间两次非党委调用（403/闸门）不留痕
    assert.equal(out.traces.length, 2,
      'mock 留痕须与党委查看次数一致（service 一次 + 页签渲染一次）；非党委的两次调用不得留痕');

    // ── 支书端界面（常规视图）：列表与详情都看不到匿名真身 ──
    assert.ok(!out.listRowHtml.includes(out.p5Name), '支书端列表行不得出现匿名提交人姓名');
    assert.ok(out.listRowHtml.includes('匿名'), '支书端列表行应显示「匿名」');
    assert.ok(!out.detailHtml.includes(out.p5Name), '支书端详情不得出现匿名提交人姓名');
    assert.ok(!out.detailHtml.includes('真实提交人'), '旧「真实提交人（仅支书可见）」机制已移除（仅党委出口可见）');
    assert.ok(out.detailHtml.includes('提交人：匿名'), '支书端详情提交人显示匿名');
  } finally {
    await browser.close();
  }
});
