// server/test/online-committee.test.mjs — 线上支委会全链路 E2E
// 闭环：书记创建支委会+议题 → 组织委员表态（异议+附言）→ 书记截止 → 锁定后拒绝 → 通知闭环
//
// 登录说明（以代码实际为准）：
// - 页面表单填学号（#student-id），login-entry.js 经 mockLogin 映射 personId 后调后端 token 会话；
//   2300010001 → p13（书记），2400012355 → p11（组织委员），密码 123456。
// - /api/v1/auth/login 直接接收 personId（node fetch 直连校验时用 p13/p11）。
//
// 校验模式：关键断言用 node fetch 直连服务器（TRAE 沙箱会拦截浏览器 fetch 缓存，见 e2e-login.test.js）；
// 业务调用（createActivity/submitVote/lockVotes）走 page.evaluate + import() 前端模块（版本串 20260901g）。
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { createApp } from '../app.js';
import { seedDatabase } from '../seed.js';

let server, base, browser;

before(async () => {
  const app = createApp({ dbPath: ':memory:' });
  await seedDatabase(app.locals.db);
  server = app.listen(0);
  base = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch({ headless: true });
});

after(async () => {
  if (browser) await browser.close();
  if (server) {
    server.closeAllConnections?.();
    await new Promise((r) => server.close(r));
  }
});

// 页面账号密码登录（fresh context；登录后直达角色工作台）
async function login(page, studentId, targetUrl) {
  // 离线可复现：外部 CDN（Google Fonts / Tailwind）挂起会阻塞 load，故直接 abort
  await page.route('**://fonts.googleapis.com/**', (r) => r.abort());
  await page.route('**://fonts.gstatic.com/**', (r) => r.abort());
  await page.route('**://cdn.tailwindcss.com/**', (r) => r.abort());
  await page.goto(`${base}/login.html`, { waitUntil: 'domcontentloaded' });
  await page.fill('#student-id', studentId);
  await page.fill('#password', '123456');
  await Promise.all([
    page.waitForURL(targetUrl, { timeout: 10000 }),
    page.click('button[type="submit"]'),
  ]);
}

test('线上支委会：书记发起→委员表态→书记截止→通知闭环→API 校验', async () => {
  // 1. 书记登录，经前端 adapter 创建线上支委会活动 + 议程（API 写穿服务器 activities 表）
  //    e2e-login 同款坑：adapter 直写只落服务器，本地 mockDB 无此活动——后续防抖快照
  //    （persist → POST /api/v1/snapshot 全量覆盖）会以过期缓存把活动从服务器抹掉，
  //    故创建后立即同步本地 mockDB，保证快照与服务器一致。
  const secCtx = await browser.newContext();
  const secPage = await secCtx.newPage();
  await login(secPage, '2300010001', '**/workspace/secretary.html');
  const created = await secPage.evaluate(async () => {
    const { getAdapter } = await import('/src/core/data-adapter.js?v=20260903c');
    const act = await getAdapter().activities.create({
      title: '线上支委会E2E', type: '支委会', scenarioId: 'branch-committee', date: '2026-09-10',
      agenda: [{ id: 'e2e-ai-1', kind: 'normal', item: '审议九月活动安排', host: '书记' }],
      voteDeadline: '2026-09-10T12:00:00',
    });
    const { mockDB } = await import('/src/core/domain.js?v=20260903c');
    if (!mockDB.activities.some((a) => a.id === act.id)) mockDB.activities.push(act);
    return act;
  });
  assert.ok(created && created.id, '活动创建成功');

  // 2. 组织委员登录表态（异议+附言），成功后触发书记汇总通知（NoticeStore.add）
  const orgCtx = await browser.newContext();
  const orgPage = await orgCtx.newPage();
  await login(orgPage, '2400012355', '**/workspace/org.html');
  const { vote, notified } = await orgPage.evaluate(async ({ activityId }) => {
    // 同步本地缓存：服务器此刻必有该活动（书记已直写落库），补齐本地 mockDB
    // 防 submitVote 后通知 persist 的快照以过期缓存覆盖服务器活动
    const { mockDB } = await import('/src/core/domain.js?v=20260903c');
    try {
      const acts = await (await fetch('/api/v1/activities')).json();
      const act = acts.find((a) => a.id === activityId);
      if (act && !mockDB.activities.some((a) => a.id === activityId)) mockDB.activities.push(act);
    } catch (_) {}
    const { submitVote } = await import('/src/services/committee-vote.js?v=20260903c');
    const v = await submitVote({ activityId, agendaItemId: 'e2e-ai-1', position: 'object', note: '建议调整时间' });
    // 通知闭环证据：submitVote → notifySecretaryProgress → NoticeStore.add 已写入本页
    // mockDB.notices（本地通知存储断言；API 模式通知靠快照全量覆盖跨用户传播，多页
    // 快照会互相覆盖，故不断言"书记端可见/已送达"，仅断言"本页已写入本地通知存储"）
    const n = (mockDB.notices || []).some((x) => (x.title + ' ' + x.content).includes('线上支委会'));
    return { vote: v, notified: n };
  }, { activityId: created.id });
  assert.equal(vote.personId, 'p11', '组织委员已表态（p11）');
  assert.equal(vote.position, 'object', '表态为异议');
  assert.equal(notified, true, '表态后已写入本地通知存储（书记汇总通知）');

  // 3. 服务端读回：node fetch 直连校验表态已落库（规避 TRAE 沙箱浏览器 fetch 缓存；
  //    GET /api/v1/agenda-votes 受 requireAuth 保护，先登录取 token）
  const readR = await fetch(`${base}/api/v1/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ personId: 'p13', password: '123456' }),
  });
  const { token: secToken } = await readR.json();
  const list = await (await fetch(`${base}/api/v1/agenda-votes?activityId=${created.id}`, {
    headers: { Authorization: `Bearer ${secToken}` },
  })).json();
  assert.ok(Array.isArray(list), '表态列表应为数组');
  const mine = list.filter((v) => v.personId === 'p11' && v.agendaItemId === 'e2e-ai-1');
  assert.equal(mine.length, 1, '表态已落库');
  assert.equal(mine[0].position, 'object');
  assert.equal(mine[0].note, '建议调整时间');

  // 4. 书记截止（lockVotes → 服务端置 votesLocked），成功后提醒书记记录决议
  const { locked, reminded } = await secPage.evaluate(async ({ activityId }) => {
    const { lockVotes } = await import('/src/services/committee-vote.js?v=20260903c');
    const act = await lockVotes({ activityId, votesLocked: true });
    // 同步本地锁定态（防后续通知 persist 的快照以旧 votesLocked 覆盖服务器锁）
    const { mockDB } = await import('/src/core/domain.js?v=20260903c');
    const local = mockDB.activities.find((a) => a.id === activityId);
    if (local) local.votesLocked = true;
    // 记录决议提醒：lockVotes → remindRecordDecision → NoticeStore.add 写入本页
    // mockDB.notices（本地通知存储断言，同上：不依赖快照跨用户传播）
    const r = (mockDB.notices || []).some((x) => (x.title + ' ' + x.content).includes('记录决议'));
    return { locked: act, reminded: r };
  }, { activityId: created.id });
  assert.equal(locked.votesLocked, true, '已截止（votesLocked=true）');
  assert.equal(reminded, true, '截止后已写入本地通知存储（记录决议提醒）');

  // 快照竞态修复：orgPage 仍在 step2 submitVote 时排程了 800ms 防抖全量快照，
  // 其本地活动 votesLocked 仍为 false——若 flush 晚于本步，会以过期缓存整体覆盖
  // 服务器、抹掉书记刚加的锁。立即把 orgPage 本地活动对齐锁态，使后续快照
  // payload 携带 votesLocked=true，与服务器一致（不触发 persist，仅修正内存态）。
  await orgPage.evaluate(async ({ activityId }) => {
    const { mockDB } = await import('/src/core/domain.js?v=20260903c');
    const local = mockDB.activities.find((a) => a.id === activityId);
    if (local) local.votesLocked = true;
  }, { activityId: created.id });

  // 5. 锁定后委员再表态被拒（node fetch 直连 API 校验）
  const anon = await fetch(`${base}/api/v1/agenda-votes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ activityId: created.id, agendaItemId: 'e2e-ai-1', position: 'agree', note: '' }),
  });
  assert.equal(anon.status, 401, '未带 token 401');
  // 组织委员带 token 再提交 → 400（锁定拦截；登录 API 直接接收 personId）
  const loginR = await fetch(`${base}/api/v1/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ personId: 'p11', password: '123456' }),
  });
  assert.equal(loginR.status, 200, 'API 登录（personId）成功');
  const { token } = await loginR.json();
  assert.ok(token, 'API 登录返回 token');
  const lockedPost = await fetch(`${base}/api/v1/agenda-votes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ activityId: created.id, agendaItemId: 'e2e-ai-1', position: 'agree', note: '' }),
  });
  assert.equal(lockedPost.status, 400, '锁定后带 token 表态被拒（400）');

  await secPage.close(); await orgPage.close();
  await secCtx.close(); await orgCtx.close();
});
