// role: [工程师]+[AI]
// issue-anonymity.test.mjs — 意见反馈「真匿名」验收（2026-09-12 支书裁定）
// 覆盖：①匿名提交后任何接口/存储（含支书视角）都取不到提交人 ②实名按现口径记 personId
//      ③tokenHash 不可反查（不含 personId / 原始 token） ④处置结果公开可见（处置权仅支书）
//      ⑤防刷判重/频率限制（仅按 tokenHash）
// 双形态：API（in-process createApp） + mock（Playwright 浏览器内 IssueStore 真跑）
// 运行：node --test server/test/issue-anonymity.test.mjs
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../app.js';
import { seedDatabase } from '../seed.js';
// 前后端同源哈希（服务端与前端共用；测试据此证明 tokenHash 由随机 token 派生、不含 personId）
import { hashSubmitterToken } from '../../docs/src/core/constants.js?v=20260914b';
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

// 可反查提交人的候选字段（响应/存储均不得出现）
const IDENTITY_KEYS = ['_realPersonId', 'realPersonId', 'submitterId', 'submitterToken', 'personId', 'authorId', 'author'];

test('API ①匿名提交：落库/接口（含支书视角）均取不到提交人', async () => {
  const member = await login('p5');
  const sec = await login('p13');
  const token = 'anon-token-' + Date.now();
  const title = '匿名意见-' + Date.now();
  const res = await postIssue(member, {
    title, body: '匿名字内容', scope: 'scenario', types: ['bug'],
    anonymous: true, submitterToken: token,
    // 恶意注入身份字段：服务端一律不采信
    submittedBy: 'p5', _realPersonId: 'p5', participants: ['p5'], author: 'p5',
  });
  assert.equal(res.status, 201);
  const created = await res.json();
  assert.equal(created.submittedBy, '匿名');
  assert.equal(created.anonymous, true);
  assert.deepEqual(created.participants, [], '匿名反馈不得有参与者（防经 participants 反查）');
  for (const k of IDENTITY_KEYS) assert.ok(!(k in created), `响应不得含身份字段 ${k}`);

  // 服务端存储层亦无身份字段（落库白名单）
  const storedRow = app.locals.db.prepare('SELECT data FROM issues WHERE id = ?').get(created.id);
  assert.ok(storedRow, '反馈已落库');
  const stored = JSON.parse(storedRow.data);
  for (const k of IDENTITY_KEYS) assert.ok(!(k in stored), `存储不得含身份字段 ${k}`);
  assert.ok(!storedRow.data.includes('"p5"'), '存储不得含提交人 personId');
  assert.equal(stored.submittedBy, '匿名');

  // 支书会话 GET：同样无身份字段
  const list = await getIssues(sec);
  const got = list.find((i) => i.id === created.id);
  assert.ok(got, '支书可见该反馈');
  for (const k of IDENTITY_KEYS) assert.ok(!(k in got), `支书视角不得含身份字段 ${k}`);
  assert.equal(got.submittedBy, '匿名');

  // 公开读（未登录）可见（处置结果公开发布口径）
  const pub = await getIssues(null);
  assert.ok(pub.some((i) => i.id === created.id), '意见列表公开可读');
});

test('API ②实名提交：按现口径记真实 personId', async () => {
  const member = await login('p5');
  const res = await postIssue(member, {
    title: '实名意见-' + Date.now(), body: '实名内容', scope: 'scenario', types: ['enhancement'],
    anonymous: false, submitterToken: 'real-token-' + Date.now(),
  });
  assert.equal(res.status, 201);
  const created = await res.json();
  assert.equal(created.submittedBy, 'p5');
  assert.equal(created.anonymous, false);
  assert.deepEqual(created.participants, ['p5']);
  assert.ok(!('_realPersonId' in created), '真匿名后不存在 _realPersonId 机制');
});

test('API ③tokenHash 不可反查：确定性派生、不含 personId / 原始 token', async () => {
  const member = await login('p5');
  const token = 'hash-token-' + Math.random().toString(36).slice(2);
  const created = await (await postIssue(member, {
    title: '哈希意见-' + Date.now(), body: '哈希内容', scope: 'scenario', types: ['question'],
    anonymous: true, submitterToken: token,
  })).json();
  assert.equal(created.tokenHash, hashSubmitterToken(token), 'tokenHash 由随机 token 确定性派生');
  assert.ok(!created.tokenHash.includes('p5'), 'tokenHash 不得含 personId');
  assert.ok(!created.tokenHash.includes(token), 'tokenHash 不得含原始 token');
  assert.ok(!JSON.stringify(created).includes(token), '响应不得留原始 token');

  // 不同 token → 不同 hash（不是全局常量，可区分客户端而不可反查人）
  const created2 = await (await postIssue(member, {
    title: '哈希意见二-' + Date.now(), body: '哈希内容二', scope: 'scenario', types: ['question'],
    anonymous: true, submitterToken: 'hash-token-other-' + Date.now(),
  })).json();
  assert.notEqual(created.tokenHash, created2.tokenHash);
});

test('API ④处置结果公开可见；处置/回复权仅支书', async () => {
  const member = await login('p5');
  const sec = await login('p13');
  const created = await (await postIssue(member, {
    title: '待处置-' + Date.now(), body: '待处置内容', scope: 'scenario', types: ['bug'],
    anonymous: true, submitterToken: 'dispose-token-' + Date.now(),
  })).json();

  const patch = (token, body) => fetch(`${base}/api/v1/issues/${created.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });

  // 非支书处置 → 403（沿用既有口径）
  const forbidden = await patch(member, { status: 'closed' });
  assert.equal(forbidden.status, 403);

  // 支书处置：处置结果作为公开评论落库 + 关闭
  const comment = {
    id: 'cmt-dispose-1', author: 'u_sec', authorRole: 'secretary',
    body: '处置结果：已核实并采纳', createdAt: '2026-09-12', kind: 'verdict',
    hidden: false, hiddenBy: null, hiddenReason: null, hiddenAt: null,
  };
  const ok = await patch(sec, { comments: [comment], commentCount: 1, status: 'closed', closedReason: 'completed', closedAt: '2026-09-12' });
  assert.equal(ok.status, 200);

  // 公开（未登录）读取可看到处置结果（无对提交人的定向通知/回推）
  const pub = await getIssues(null);
  const got = pub.find((i) => i.id === created.id);
  assert.equal(got.status, 'closed');
  assert.ok((got.comments || []).some((c) => c.body === '处置结果：已核实并采纳'), '处置结果公开可见');
});

test('API ⑤防刷：同一 token 判重 + 频率上限', async () => {
  const member = await login('p5');
  const token = 'abuse-token-' + Math.random().toString(36).slice(2);
  const first = await postIssue(member, { title: '限频测试', body: '同一内容', scope: 'scenario', types: ['bug'], anonymous: true, submitterToken: token });
  assert.equal(first.status, 201);
  const dup = await postIssue(member, { title: '限频测试', body: '同一内容', scope: 'scenario', types: ['bug'], anonymous: true, submitterToken: token });
  assert.equal(dup.status, 409, '同 token 相同内容 → 判重');

  let last;
  for (let i = 0; i < 25; i++) {
    last = await postIssue(member, { title: '限频-' + i, body: '内容-' + i, scope: 'scenario', types: ['bug'], anonymous: true, submitterToken: token });
  }
  assert.equal(last.status, 429, '超频率上限 → 429');
});

test('mock 形态：匿名提交后存储/支书端界面均无提交人；实名可见；tokenHash 前后端同源', async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.goto(`${base}/index.html`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    const out = await page.evaluate(async () => {
      const { IssueStore } = await import('/src/services/issues.js?v=20260914b');
      const { PersonStore } = await import('/src/services/person.js?v=20260914b');
      localStorage.clear();
      const loginAs = (personId, role) => localStorage.setItem('gsm1921-login-user', JSON.stringify({ personId, role }));
      loginAs('p5', 'participant');
      await IssueStore.loadAll();
      // 匿名提交 → 支书审核通过 → 公开
      const dAnon = await IssueStore.submitIssue({ title: '匿名-A', body: '内容A', scope: 'scenario', types: ['bug'], anonymous: true });
      const anon = IssueStore.approveDraft(dAnon.draftId);
      // 实名提交 → 公开（现口径）
      const dReal = await IssueStore.submitIssue({ title: '实名-B', body: '内容B', scope: 'scenario', types: ['bug'], anonymous: false });
      const real = IssueStore.approveDraft(dReal.draftId);

      // 支书视角：渲染反馈管理 tab，打开匿名条目的详情面板
      loginAs('p13', 'secretary');
      const tc = document.createElement('div');
      tc.id = 'secretary-tab-content';
      document.body.appendChild(tc);
      const fb = await import('/src/entries/tabs/secretary/feedback-tab.js?v=20260914b');
      fb.renderContent();
      const listRow = document.querySelector(`[data-issue-id="${anon.id}"]`);
      const listRowHtml = listRow ? listRow.innerHTML : '';
      if (listRow) listRow.click();
      const detailHtml = document.getElementById('issue-detail-panel')?.innerHTML || '';

      return {
        anon, real, listRowHtml, detailHtml,
        rawCache: localStorage.getItem('gsm1921-issue-cache-v3'),
        rawDrafts: localStorage.getItem('gsm1921-issue-drafts'),
        token: localStorage.getItem('gsm1921-issue-submitter-token'),
        p5Name: PersonStore.getName('p5'),
      };
    });

    // 匿名数据模型：无任何身份字段
    assert.equal(out.anon.submittedBy, '匿名');
    assert.equal(out.anon.anonymous, true);
    assert.ok(!('_realPersonId' in out.anon), 'mock 形态不得保留 _realPersonId');
    assert.deepEqual(out.anon.participants, []);
    assert.ok(out.anon.tokenHash && !out.anon.tokenHash.includes('p5'), 'mock tokenHash 不得含 personId');
    assert.equal(out.anon.tokenHash, hashSubmitterToken(out.token), 'mock 与 server 哈希算法同源（双形态一致）');

    // 存储（issue 缓存 + 草稿）亦无提交人身份
    const cachedAnon = JSON.parse(out.rawCache).find((i) => i.id === out.anon.id);
    assert.ok(cachedAnon, '匿名反馈已入缓存');
    for (const k of IDENTITY_KEYS) assert.ok(!(k in cachedAnon), `缓存不得含 ${k}`);
    assert.ok(!JSON.stringify(cachedAnon).includes('"p5"'), '缓存不得含提交人 personId');
    const draftAnon = JSON.parse(out.rawDrafts).find((d) => d && d.payload && d.payload.title === '匿名-A');
    assert.equal(draftAnon.author, '匿名', '匿名草稿作者不得为真实 personId（支书草稿区亦不可追溯）');

    // 实名：按现口径
    assert.equal(out.real.submittedBy, 'p5');
    assert.equal(out.real.anonymous, false);

    // 支书端界面：匿名条目与详情均不显示真实提交人姓名/身份
    assert.ok(out.p5Name && out.p5Name !== 'p5', '演示成员 p5 可解析为姓名');
    assert.ok(!out.listRowHtml.includes(out.p5Name), '支书端列表行不得出现匿名提交人姓名');
    assert.ok(out.listRowHtml.includes('匿名'), '支书端列表行应显示「匿名」');
    assert.ok(!out.detailHtml.includes(out.p5Name), '支书端详情不得出现匿名提交人姓名');
    assert.ok(!out.detailHtml.includes('真实提交人'), '「真实提交人（仅支书可见）」机制已移除');
    assert.ok(out.detailHtml.includes('提交人：匿名'), '支书端详情提交人显示匿名');
  } finally {
    await browser.close();
  }
});
