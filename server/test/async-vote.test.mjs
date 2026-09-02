// role: [工程师]+[AI]
// server/test/async-vote.test.mjs — AV5 线上异步表决 E2E（支部党员大会真实 UI 表决 → 硬校验 → 通过）
// 链路：书记创建线上党员大会（branch-party-meeting, formal + formal-only 12 应到 + quorumCheck）
//   → 预备党员 p24（名单外）activity.html 只读（议程可见、无表决按钮、「仅应到表决人可表态」）+ API 403
//   → 正式党员 p5 activity.html 点「赞成」→「已表态：赞成」→ 服务端登记 → node fetch 校验落库
//   → 书记 inspector 汇总矩阵「应到 12 · 已表态 1」→ 记录「通过」被硬校验拦截（出席 1/12 < 6，toast 报错、不写 result）
//   → node fetch 补足 p1/p2/p3/p4/p8/p9 赞成至出席 7/赞成 7（均 >6）→ 书记再记录「通过」成功
//   → node fetch 校验活动议程 result='passed'
//
// 平台事实（实证）：
// - activity.html（公共详情页）不经 bootstrap → 运行时为 mock 数据源，表态只落本地 mockDB；
//   workspace 页（visitor/secretary）经 bootstrap 为 api 数据源（读/写服务器）。
//   故「公共页 UI 演示」用 mock 本地（活动经 persist 备份进 localStorage 供 activity.html 恢复），
//   「服务器登记/硬校验真值」用同身份页面 evaluate 调 service（committee-vote/agenda-follow-up）+ node fetch。
// - 关键服务调用均在页面 evaluate 内以 ?v=20260901h 导入（与页面共享模块实例，防 mockDB 双实例分裂）。
// 运行：cd server; 设沙箱环境变量; node --test test/async-vote.test.mjs test/online-committee.test.mjs test/agenda-quorum.test.mjs
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { createApp } from '../app.js';
import { seedDatabase } from '../seed.js';

let server, base, browser;

// 支部党员大会应到名单 = 12 名正式党员（与 vote-config resolveVoterIds('formal-only') / mock act-31 同口径）
const FORMAL_IDS = ['p1', 'p2', 'p3', 'p4', 'p5', 'p8', 'p9', 'p10', 'p11', 'p12', 'p13', 'p14'];
const AG1 = 'av5-ag-1'; // 议题 1（表决/记录决议对象）
const AG2 = 'av5-ag-2'; // 议题 2（并列存在，验证多议题）
const TITLE = 'AV5线上支部党员大会E2E';

const ACCOUNTS = {
  p13: { studentId: '2300010001', target: '**/workspace/secretary.html' }, // 书记 沈一
  p5:  { studentId: '2400012349', target: '**/workspace/visitor.html' },    // 钱七（正式党员 participant）
  p24: { studentId: '2500010010', target: '**/workspace/visitor.html' },    // 曹雅婷（预备党员 participant）
};

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
async function login(ctx, personId) {
  const acc = ACCOUNTS[personId];
  const page = await ctx.newPage();
  // 离线可复现：外部 CDN 挂起会阻塞 load，直接 abort
  await page.route('**://fonts.googleapis.com/**', (r) => r.abort());
  await page.route('**://fonts.gstatic.com/**', (r) => r.abort());
  await page.route('**://cdn.tailwindcss.com/**', (r) => r.abort());
  await page.goto(`${base}/login.html`, { waitUntil: 'domcontentloaded' });
  await page.fill('#student-id', acc.studentId);
  await page.fill('#password', '123456');
  await Promise.all([
    page.waitForURL(acc.target, { timeout: 15000 }),
    page.click('button[type="submit"]'),
  ]);
  await page.waitForTimeout(800); // workspace bootstrap api init 完成
  return page;
}

/** node fetch API 登录（/api/v1/auth/login 直接接收 personId） */
async function apiLogin(personId) {
  const r = await fetch(`${base}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ personId, password: '123456' }),
  });
  assert.equal(r.status, 200, `API 登录 ${personId} 应 200`);
  return (await r.json()).token;
}

test('AV5 线上党员大会：书记发起 → 预备党员只读/403 → 正式党员 UI 表决 → 硬校验拦截 → 补足后通过', async () => {
  // ════════════════════════════════════════════════════════════════
  // 1. 书记登录 → adapter 创建支部党员大会（formal + formal-only 12 应到 + quorumCheck）
  //    adapter 直写只落服务器，本地 mockDB 无此活动 → 同步 push，防后续防抖快照以过期缓存抹掉
  // ════════════════════════════════════════════════════════════════
  const secCtx = await browser.newContext();
  const secPage = await login(secCtx, 'p13');
  const created = await secPage.evaluate(async ({ title, voterIds, ag1, ag2 }) => {
    const { getAdapter } = await import('/src/core/data-adapter.js?v=20260901j');
    const act = await getAdapter().activities.create({
      title,
      type: '支部党员大会',
      scenarioId: 'branch-party-meeting',
      date: '2026-09-10',
      status: 'published',
      location: '线上（异步表决）',
      organizer: 'p13',
      direction: 'top-down',
      domain: 'party-building',
      voteConfig: { mode: 'async', optionSet: 'formal', voterScope: 'formal-only', voterIds, quorumCheck: true },
      agenda: [
        { id: ag1, item: '审议 2026 年秋季学期支部工作计划（E2E）', host: '书记' },
        { id: ag2, item: '审议发展对象接收为预备党员（E2E）', host: '组织委员' },
      ],
    });
    // 同步本地 mockDB（防 800ms 防抖快照以过期缓存覆盖服务器活动，参照 online-committee.test.mjs）
    const { mockDB } = await import('/src/core/domain.js?v=20260901j');
    if (!mockDB.activities.some((a) => a.id === act.id)) mockDB.activities.push(act);
    return act;
  }, { title: TITLE, voterIds: FORMAL_IDS, ag1: AG1, ag2: AG2 });
  assert.ok(created && created.id, '活动创建成功（服务器落库）');
  assert.equal(created.voteConfig.voterIds.length, 12, '应到名单应为 12 名正式党员');
  assert.equal(created.voteConfig.quorumCheck, true, 'quorumCheck 应为 true');
  const actId = created.id;
  const item1 = created.agenda.find((x) => x.id === AG1);
  assert.ok(item1 && item1.item.includes('支部工作计划'), '议程含议题 1（带 id）');

  // ════════════════════════════════════════════════════════════════
  // 2. 预备党员 p24：activity.html 只读（议程可见、无表决按钮、「仅应到表决人可表态」）+ API 403
  //    activity.html 为 mock 数据源 → 先把服务器活动经 persist 备份进本 context localStorage，
  //    供 activity.html 的 mock loadDB 恢复可见（平台事实见文件头注释）
  // ════════════════════════════════════════════════════════════════
  const prepCtx = await browser.newContext();
  const prepPage = await login(prepCtx, 'p24');
  await prepPage.evaluate(async () => {
    const { persist } = await import('/src/core/data-adapter.js?v=20260901j');
    persist(); // api 模式：saveDB 本地备份（快照与服务器一致）
  });
  await prepPage.goto(`${base}/activity.html?id=${actId}`, { waitUntil: 'domcontentloaded' });
  await prepPage.waitForSelector('#async-vote-section', { timeout: 10000 });
  const prepUi = await prepPage.evaluate(async ({ ag1 }) => {
    const section = document.querySelector('#async-vote-section');
    const slot = section ? section.querySelector(`[data-vote-item-id="${ag1}"]`) : null;
    return {
      sectionText: section ? section.innerText : '',
      hasVoteBtn: !!slot && slot.querySelector('.vote-btn') !== null,
      readonlyText: !!slot && slot.querySelector('.vote-current')?.textContent?.includes('仅应到表决人可表态'),
      agendaVisible: section ? section.innerText.includes('审议 2026 年秋季学期支部工作计划') : false,
    };
  }, { ag1: AG1 });
  assert.equal(prepUi.agendaVisible, true, '预备党员应可见议程议题');
  assert.equal(prepUi.hasVoteBtn, false, '名单外预备党员不应有表决按钮');
  assert.equal(prepUi.readonlyText, true, '名单外应显示「仅应到表决人可表态」');
  // API 403 校验（不在应到名单 → 服务端拒绝）
  const p24Token = await apiLogin('p24');
  const p24Post = await fetch(`${base}/api/v1/agenda-votes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${p24Token}` },
    body: JSON.stringify({ activityId: actId, agendaItemId: AG1, position: 'approve', note: '' }),
  });
  assert.equal(p24Post.status, 403, '预备党员（名单外）API 表态应 403');
  const p24Body = await p24Post.json();
  assert.equal(p24Body.error, '不在本次表决名单', '403 文案应为「不在本次表决名单」');
  await prepCtx.close();

  // ════════════════════════════════════════════════════════════════
  // 3. 正式党员 p5：activity.html 对议题 1 点「赞成」→ 显示「已表态：赞成」（公共页 UI）
  //    随后以同一身份在页面内 evaluate 调 submitVote 服务（切 api 数据源）登记服务器，
  //    node fetch 校验 p5 approve 已落库
  // ════════════════════════════════════════════════════════════════
  const memberCtx = await browser.newContext();
  const memberPage = await login(memberCtx, 'p5');
  await memberPage.evaluate(async () => {
    const { persist } = await import('/src/core/data-adapter.js?v=20260901j');
    persist(); // 本地备份（含服务器 act-xxx）供 activity.html mock 恢复
  });
  await memberPage.goto(`${base}/activity.html?id=${actId}`, { waitUntil: 'domcontentloaded' });
  await memberPage.waitForSelector(`[data-vote-item-id="${AG1}"] .vote-btn`, { timeout: 10000 });
  // UI 点赞成 → 提交
  await memberPage.click(`[data-vote-item-id="${AG1}"] .vote-btn[data-pos="approve"]`);
  await memberPage.click(`[data-vote-item-id="${AG1}"] .vote-submit`);
  await memberPage.waitForFunction(
    (ag1) => {
      const el = document.querySelector(`[data-vote-item-id="${ag1}"] .vote-current`);
      return !!el && el.textContent.includes('已表态：赞成');
    },
    AG1, { timeout: 10000 },
  );
  const p5UiText = await memberPage.locator(`[data-vote-item-id="${AG1}"] .vote-current`).innerText();
  assert.ok(p5UiText.includes('已表态：赞成'), `UI 应显示已表态：赞成，实际：${p5UiText}`);

  // 同页切 api 数据源后以 p5 身份经 submitVote 服务登记服务器（公共页 mock 不落服务器，见文件头注释）
  const p5Row = await memberPage.evaluate(async ({ activityId, ag1 }) => {
    const token = sessionStorage.getItem('gsm1921-api-token');
    const { enableApiMode } = await import('/src/services/runtime.js?v=20260901j');
    enableApiMode(token);
    const { submitVote } = await import('/src/services/committee-vote.js?v=20260901j');
    return submitVote({ activityId, agendaItemId: ag1, position: 'approve', note: '' });
  }, { activityId: actId, ag1: AG1 });
  assert.equal(p5Row.personId, 'p5', '服务端登记 personId 应为 p5');
  assert.equal(p5Row.position, 'approve', '服务端登记 position 应为 approve');

  // node fetch 直连校验：GET /api/v1/agenda-votes 含 p5 approve（规避沙箱浏览器 fetch 缓存）
  const p5Token = await apiLogin('p5');
  const votesR = await fetch(`${base}/api/v1/agenda-votes?activityId=${actId}`, {
    headers: { Authorization: `Bearer ${p5Token}` },
  });
  assert.equal(votesR.status, 200);
  const votes = await votesR.json();
  const mine = votes.filter((v) => v.personId === 'p5' && v.agendaItemId === AG1);
  assert.equal(mine.length, 1, 'p5 approve 应已落库');
  assert.equal(mine[0].position, 'approve');
  await memberCtx.close();

  // ════════════════════════════════════════════════════════════════
  // 4. 书记 secretary.html 打开该活动详情（inspector）：汇总矩阵「应到 12 · 已表态 1」；
  //    记录「通过」被硬校验拦截（出席 1/12 < ceil(12/2)=6）→ error toast、不写 result
  // ════════════════════════════════════════════════════════════════
  await secPage.goto(`${base}/workspace/secretary.html?activityId=${actId}`, { waitUntil: 'domcontentloaded' });
  // 兜底：URL 直达落点未在窗口内完成时，手动切活动管理 tab 并强制 detail 视图
  try {
    await secPage.waitForSelector('#vote-summary-slot .vs-stat', { timeout: 12000 });
  } catch (_) {
    await secPage.click('.secretary-tab-btn[data-secretary-tab="calendar"]').catch(() => {});
    await secPage.waitForTimeout(800);
    await secPage.evaluate(async ({ id }) => {
      const { setState } = await import('/src/core/state.js?v=20260901j');
      const { mockDB } = await import('/src/core/domain.js?v=20260901j');
      setState({ activities: [...mockDB.activities], viewMode: 'detail', selectedActivityId: id });
    }, { id: actId });
    await secPage.waitForSelector('#vote-summary-slot .vs-stat', { timeout: 12000 });
  }
  const statText = await secPage.locator('#vote-summary-slot .vs-stat').innerText();
  assert.ok(statText.includes('应到 12 · 已表态 1'), `汇总矩阵应为「应到 12 · 已表态 1」，实际：${statText}`);
  const summaryText = await secPage.locator('#vote-summary-slot').innerText();
  assert.ok(summaryText.includes('通过条件：出席'), 'formal + quorumCheck 应显示通过条件提示');
  assert.ok(summaryText.includes('赞成 1'), 'formal 票数统计应含赞成 1');

  // 记录「通过」→ 硬校验拦截（出席不足）→ error toast
  await secPage.click(`[data-agenda-item-id="${AG1}"][data-agenda-result="passed"]`);
  await secPage.waitForFunction(
    () => {
      const t = document.querySelector('#toast-container');
      return !!t && t.textContent.includes('过半数出席方可表决') && t.textContent.includes('当前 1/12');
    },
    null, { timeout: 10000 },
  );
  const toastText = await secPage.evaluate(() => document.querySelector('#toast-container')?.textContent || '');
  assert.ok(toastText.includes('可督促未表态党员表态'), '拦截提示应含可采取动作建议');

  // node fetch 校验：活动议程 result 未被写入（拦截不落库）
  const actsAfterBlock = await (await fetch(`${base}/api/v1/activities`)).json();
  const actAfterBlock = actsAfterBlock.find((a) => a.id === actId);
  const ag1AfterBlock = actAfterBlock.agenda.find((x) => x.id === AG1);
  assert.ok(ag1AfterBlock.result == null, '硬校验拦截时不得写入 result（实际 ' + String(ag1AfterBlock.result) + '）');

  // ════════════════════════════════════════════════════════════════
  // 5. node fetch 以多个正式党员身份补表态（p1/p2/p3/p4/p8/p9 各 approve）
  //    服务器：出席 7（≥6）、赞成 7（>6）→ 满足出席/赞成过半数硬校验
  // ════════════════════════════════════════════════════════════════
  for (const pid of ['p1', 'p2', 'p3', 'p4', 'p8', 'p9']) {
    const token = await apiLogin(pid);
    const r = await fetch(`${base}/api/v1/agenda-votes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ activityId: actId, agendaItemId: AG1, position: 'approve', note: '' }),
    });
    assert.equal(r.status, 201, `${pid} 补票应 201`);
  }
  const fullList = await (await fetch(`${base}/api/v1/agenda-votes?activityId=${actId}`, {
    headers: { Authorization: `Bearer ${p5Token}` },
  })).json();
  const ag1Votes = fullList.filter((v) => v.agendaItemId === AG1);
  const approveCount = ag1Votes.filter((v) => v.position === 'approve').length;
  assert.equal(approveCount, 7, '赞成应为 7（p5 + 补 6）');
  assert.ok(ag1Votes.length >= 6, '出席（已表态）应 ≥ 6');

  // ════════════════════════════════════════════════════════════════
  // 6. 书记再次记录「通过」→ 硬校验通过 → 活动议程 result='passed'（UI + 服务器双校验）
  // ════════════════════════════════════════════════════════════════
  await secPage.click(`[data-agenda-item-id="${AG1}"][data-agenda-result="passed"]`);
  await secPage.waitForFunction(
    () => {
      const blk = document.querySelector('#agenda-block');
      return !!blk && blk.textContent.includes('已通过');
    },
    null, { timeout: 10000 },
  );
  const agendaText = await secPage.locator('#agenda-block').innerText();
  assert.ok(agendaText.includes('已通过'), '记录通过成功后议程应显示「已通过」徽章');
  const statAfter = await secPage.locator('#vote-summary-slot .vs-stat').innerText();
  assert.ok(statAfter.includes('应到 12 · 已表态 7'), `通过后汇总应为已表态 7，实际：${statAfter}`);

  // 等 updateActivity(600ms) + 防抖快照(800ms) 写穿服务器后，node fetch 校验活动快照
  await secPage.waitForTimeout(1800);
  const actsFinal = await (await fetch(`${base}/api/v1/activities`)).json();
  const actFinal = actsFinal.find((a) => a.id === actId);
  const ag1Final = actFinal.agenda.find((x) => x.id === AG1);
  assert.equal(ag1Final.result, 'passed', '活动快照/结果应含该议程 result=passed');
  assert.equal(ag1Final.recordedBy, 'p13', '记录人应为书记 p13');

  await secCtx.close();
});
