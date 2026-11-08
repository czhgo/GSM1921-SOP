// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  server/test/notice-emphasis-limit.test.mjs —— 支部副本的强调通知与 24 小时限频
//  （2026-11-08 批次 536 · Task 4）
//
//  覆盖：
//   · 首次发送 201：受众 ['all']、sourceId=副本 id、sourceActivityId=党委原件 id、systemKind / emphasis 标记；
//   · 立即重复 429：retryAfterMs 落在 0–24h、retryAt 为未来时间、不新落库；
//   · 窗口边界：把首条通知 at / publishDate 挪到 25 小时前 ⇒ 可再发（非幂等，产生第二条）；
//                挪到 23 小时前 ⇒ 仍在窗口内 ⇒ 429；
//   · 权限：副支书可发；普通党员 / 党委 / 跨支部支书一律 403；
//   · 非副本（无 sourceActivityId）400、不存在 404；
//   · 不同活动的限频互不影响。
//
//  自包含：`createApp({ dbPath: ':memory:' })` + 直写 users / branches / activities；HTTP 直连（无浏览器）。
// ════════════════════════════════════════════════════════════════

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../app.js';

const WINDOW_MS = 24 * 60 * 60 * 1000;

const BRANCHES = [
  { id: 'br-b1', name: '本科第一党支部', type: '本科生', status: 'active', createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'br-b2', name: '本科第二党支部', type: '本科生', status: 'active', createdAt: '2026-01-01T00:00:00.000Z' },
];
const USERS = [
  { id: 'pc-1', name: '党委组织员', studentId: '9000000001', role: 'party-staff', branchId: null, developStage: '', partyGroup: '' },
  { id: 'sec-1', name: '第一支部书记', studentId: '2300010001', role: 'secretary', branchId: 'br-b1', developStage: '正式党员', partyGroup: '第一党小组' },
  { id: 'dep-1', name: '第一支部副书记', studentId: '2300010002', role: 'deputy-secretary', branchId: 'br-b1', developStage: '正式党员', partyGroup: '第一党小组' },
  { id: 'sec-2', name: '第二支部书记', studentId: '2300020001', role: 'secretary', branchId: 'br-b2', developStage: '正式党员', partyGroup: '第二党小组' },
  { id: 'mem-1', name: '普通成员', studentId: '2400012349', role: 'participant', branchId: 'br-b1', developStage: '正式党员', partyGroup: '第一党小组' },
];

// 党委原件（ownerScope='committee'、branchId='pc-gsm'、无 sourceActivityId）
const committeeSource = (id, title) => ({
  id, title, type: '主题党日', date: '2026-12-01', location: '大学生活动中心',
  ownerScope: 'committee', branchId: 'pc-gsm', status: 'published',
  targetBranchIds: ['all'], publishScope: 'branch', contentVersion: 1,
  createdBy: 'pc-1', createdAt: '2026-11-01T00:00:00.000Z',
});
// 支部副本（sourceActivityId 指向党委原件）
const branchCopy = (id, sourceId, branchId, title) => ({
  id, title, type: '主题党日', date: '2026-12-01', location: '本支部会议室',
  ownerScope: 'branch', branchId, status: 'published', visibility: 'branch',
  sourceActivityId: String(sourceId), sourceVersion: 1,
  createdBy: 'sec-1', createdAt: '2026-11-02T00:00:00.000Z',
});

const ACTIVITIES = [
  committeeSource('act-src-1', '院级主题活动一'),
  committeeSource('act-src-2', '院级主题活动二'),
  committeeSource('act-src-3', '院级主题活动三'),
  committeeSource('act-src-4', '院级主题活动四'),
  branchCopy('act-copy-1', 'act-src-1', 'br-b1', '院级主题活动一'),
  branchCopy('act-copy-2', 'act-src-2', 'br-b1', '院级主题活动二'),
  branchCopy('act-copy-3', 'act-src-3', 'br-b2', '院级主题活动三'),
  // 支部自办活动：不是党委副本
  {
    id: 'act-plain', title: '支部自办活动', type: '主题党日', date: '2026-12-03',
    branchId: 'br-b1', ownerScope: 'branch', visibility: 'branch', status: 'published',
  },
];

let app, server, base, db;
const tokens = {};

before(async () => {
  app = createApp({ dbPath: ':memory:' });
  db = app.locals.db;
  const insertBranch = db.prepare('INSERT INTO branches (id, data) VALUES (?, ?)');
  for (const branch of BRANCHES) insertBranch.run(branch.id, JSON.stringify(branch));
  const insertUser = db.prepare('INSERT INTO users (id, data) VALUES (?, ?)');
  for (const user of USERS) insertUser.run(user.id, JSON.stringify(user));
  const insertActivity = db.prepare('INSERT INTO activities (id, data) VALUES (?, ?)');
  for (const activity of ACTIVITIES) insertActivity.run(activity.id, JSON.stringify(activity));
  server = app.listen(0);
  base = `http://127.0.0.1:${server.address().port}`;
  for (const user of USERS) {
    const response = await fetch(`${base}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ personId: user.id, password: '123456' }),
    });
    assert.equal(response.status, 200, `登录失败：${user.id}`);
    tokens[user.id] = (await response.json()).token;
  }
});

after(() => {
  server?.closeAllConnections?.();
  return new Promise((resolve) => server?.close(resolve));
});

async function request(personId, method, path, body) {
  const response = await fetch(`${base}/api/v1/${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokens[personId]}` },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const data = response.status === 204 ? null : await response.json();
  return { status: response.status, data };
}

const rowsOf = (table) => db.prepare(`SELECT data FROM ${table}`).all().map((row) => JSON.parse(row.data));
const emphasisNotices = (copyId) => rowsOf('notices').filter((row) => row
  && row.systemKind === 'activity-emphasis'
  && String(row.sourceId) === String(copyId));
const noticesVersion = () => {
  const row = db.prepare('SELECT version FROM collection_versions WHERE name = ?').get('notices');
  return row ? row.version : 0;
};

/** 把某条通知的 at / publishDate 挪到 `msAgo` 之前（模拟时间流逝） */
function shiftNoticeTime(noticeId, msAgo) {
  const found = db.prepare('SELECT data FROM notices WHERE id = ?').get(String(noticeId));
  assert.ok(found, `通知 ${noticeId} 须已落库`);
  const parsed = JSON.parse(found.data);
  const iso = new Date(Date.now() - msAgo).toISOString();
  parsed.at = iso;
  parsed.publishDate = iso;
  db.prepare('INSERT OR REPLACE INTO notices (id, data) VALUES (?, ?)').run(parsed.id, JSON.stringify(parsed));
}

// ════════════════════════════════════════════════════════════════
//  一、首次发送 / 立即重复 / 窗口边界
// ════════════════════════════════════════════════════════════════

test('支书首次发送 201：受众 all、关联副本与原件；通知字段齐备且版本号前进', async () => {
  const versionBefore = noticesVersion();
  const first = await request('sec-1', 'POST', 'activities/act-copy-1/emphasis-notice');
  assert.equal(first.status, 201);
  const notice = first.data.notice;
  assert.match(notice.id, /^ntc-/);
  assert.equal(notice.kind, 'system');
  assert.equal(notice.systemKind, 'activity-emphasis');
  assert.equal(notice.emphasis, true);
  assert.deepEqual(notice.audience, ['all'], '支部内全体党员');
  assert.equal(notice.branchId, 'br-b1');
  assert.equal(notice.source, 'branch');
  assert.equal(notice.sourceType, 'activity');
  assert.equal(notice.sourceId, 'act-copy-1', '关联支部副本 id');
  assert.equal(notice.sourceActivityId, 'act-src-1', '关联党委原件 id');
  assert.equal(notice.priority, 'normal');
  assert.equal(notice.createdBy, 'sec-1');
  assert.ok(notice.at && notice.publishDate && notice.createdAt, '时间字段须齐备');
  assert.match(String(notice.title), /^活动强调：/);
  assert.ok(String(notice.content).includes('2026-12-01'), '缺省正文写清活动日期');
  assert.ok(String(notice.content).includes('本支部会议室'), '缺省正文写清活动地点');
  assert.ok(String(notice.content).trim().length > 0, '正文不得为空');
  assert.ok(noticesVersion() > versionBefore, 'notices 集合版本须前进');

  // 落库校验（不只看响应）
  const stored = emphasisNotices('act-copy-1');
  assert.equal(stored.length, 1);
  assert.equal(stored[0].id, notice.id);
});

test('立即重复 429：给出剩余等待时间、不新落库；23 小时前仍在窗口内 429', async () => {
  const repeat = await request('sec-1', 'POST', 'activities/act-copy-1/emphasis-notice');
  assert.equal(repeat.status, 429);
  assert.equal(repeat.data.error, '同一活动 24 小时内只能发送一次强调通知');
  assert.ok(repeat.data.retryAfterMs >= 0 && repeat.data.retryAfterMs <= WINDOW_MS,
    `retryAfterMs 须在 0–24h（实际 ${repeat.data.retryAfterMs}）`);
  assert.ok(Date.parse(repeat.data.retryAt) > Date.now(), 'retryAt 须为未来时间');
  assert.equal(emphasisNotices('act-copy-1').length, 1, '429 不得创建通知');

  // 窗口内（23 小时前）仍拒绝
  shiftNoticeTime(emphasisNotices('act-copy-1')[0].id, 23 * 60 * 60 * 1000);
  const within = await request('sec-1', 'POST', 'activities/act-copy-1/emphasis-notice');
  assert.equal(within.status, 429, '23 小时前仍在 24 小时窗口内');
  assert.ok(within.data.retryAfterMs > 0 && within.data.retryAfterMs <= WINDOW_MS);
  assert.equal(emphasisNotices('act-copy-1').length, 1);
});

test('窗口边界：首条挪到 25 小时前 ⇒ 可再发 201（非幂等，产生第二条）', async () => {
  shiftNoticeTime(emphasisNotices('act-copy-1')[0].id, 25 * 60 * 60 * 1000);
  const again = await request('sec-1', 'POST', 'activities/act-copy-1/emphasis-notice', {
    title: '再次强调：请全体党员准时参加',
    content: '活动改到 2026-12-02 18:30，地点不变，请提前十分钟到场。',
  });
  assert.equal(again.status, 201);
  assert.equal(again.data.notice.title, '再次强调：请全体党员准时参加', 'body.title 生效');
  assert.equal(again.data.notice.content, '活动改到 2026-12-02 18:30，地点不变，请提前十分钟到场。', 'body.content 生效');

  const rows = emphasisNotices('act-copy-1');
  assert.equal(rows.length, 2, '窗口过后可再发，且旧通知保留');
  assert.notEqual(rows[0].id, rows[1].id);
});

// ════════════════════════════════════════════════════════════════
//  二、权限
// ════════════════════════════════════════════════════════════════

test('副支书可发送；普通党员 / 党委 / 跨支部支书一律 403', async () => {
  const byDeputy = await request('dep-1', 'POST', 'activities/act-copy-2/emphasis-notice');
  assert.equal(byDeputy.status, 201, '副支书可发送');
  assert.equal(byDeputy.data.notice.createdBy, 'dep-1');
  assert.equal(byDeputy.data.notice.branchId, 'br-b1');

  for (const personId of ['mem-1', 'pc-1', 'sec-2']) {
    const denied = await request(personId, 'POST', 'activities/act-copy-2/emphasis-notice');
    assert.equal(denied.status, 403, `${personId} 不得发送强调通知`);
  }
  assert.equal(emphasisNotices('act-copy-2').length, 1, '403 不得创建通知');

  // 跨支部：第二支部书记对第二支部的副本可发，对第一支部的副本不可发
  assert.equal((await request('sec-2', 'POST', 'activities/act-copy-1/emphasis-notice')).status, 403);
  assert.equal((await request('sec-2', 'POST', 'activities/act-copy-3/emphasis-notice')).status, 201);
});

// ════════════════════════════════════════════════════════════════
//  三、非法目标
// ════════════════════════════════════════════════════════════════

test('非副本 400、党委原件 400、不存在 404', async () => {
  const plain = await request('sec-1', 'POST', 'activities/act-plain/emphasis-notice');
  assert.equal(plain.status, 400);
  assert.match(String(plain.data.error), /不是党委活动副本/);

  const committeeRow = await request('sec-1', 'POST', 'activities/act-src-1/emphasis-notice');
  assert.equal(committeeRow.status, 400, '党委原件不是副本');

  const missing = await request('sec-1', 'POST', 'activities/act-none/emphasis-notice');
  assert.equal(missing.status, 404);
});

// ════════════════════════════════════════════════════════════════
//  四、不同活动互不影响
// ════════════════════════════════════════════════════════════════

test('不同活动各自限频：A 已发送不阻塞 B', async () => {
  const copyA = branchCopy('act-copy-9', 'act-src-3', 'br-b1', '第三场主题活动');
  const copyB = branchCopy('act-copy-8', 'act-src-4', 'br-b1', '第四场主题活动');
  const insertActivity = db.prepare('INSERT INTO activities (id, data) VALUES (?, ?)');
  insertActivity.run(copyA.id, JSON.stringify(copyA));
  insertActivity.run(copyB.id, JSON.stringify(copyB));

  const a = await request('sec-1', 'POST', 'activities/act-copy-9/emphasis-notice');
  assert.equal(a.status, 201);
  const b = await request('sec-1', 'POST', 'activities/act-copy-8/emphasis-notice');
  assert.equal(b.status, 201, '另一条活动不受影响');
  assert.equal(emphasisNotices('act-copy-9').length, 1);
  assert.equal(emphasisNotices('act-copy-8').length, 1);

  assert.equal((await request('sec-1', 'POST', 'activities/act-copy-9/emphasis-notice')).status, 429);
  assert.equal((await request('sec-1', 'POST', 'activities/act-copy-8/emphasis-notice')).status, 429);
});
