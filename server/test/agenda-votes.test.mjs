// server/test/agenda-votes.test.mjs — 线上表态 API 单元测试（AV3：voteConfig 泛化）
// 登录以代码实际为准：/api/v1/auth/login 的 personId 为 people id（docs/src/mock/people.js），
// 账号密码（studentId）由前端 mockLogin 映射后再调后端，测试直接传 people id：
//   p13=书记（secretary，studentId 2300010001）
//   p11=组织委员（org-commissioner，studentId 2400012355）
//   p3=正式党员（participant，studentId 2400012347）
//   p14=副书记（deputy-secretary，studentId 2300010002）
// 旧活动回退用例用 act-27（8月支委会：新学期筹备，真实存在且含 agenda，见 docs/src/mock/activities.js）；
// agendaItemId 'ai-1' 为测试虚构值——agenda 项无 id 字段，后端不校验议程存在性为有意设计。
// AV3 formal 用例用 act-formal-test（before 中直接 db 写入含 voteConfig 的党员大会 fixture）。
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../app.js';
import { seedDatabase } from '../seed.js';

let server, base, db;
let tokenSec, tokenOrg, tokenMember;

async function login(personId, pwd = '123456') {
  const r = await fetch(`${base}/api/v1/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ personId, password: pwd }),
  });
  const j = await r.json();
  return j.token;
}

before(async () => {
  const app = createApp({ dbPath: ':memory:' });
  await seedDatabase(app.locals.db);
  db = app.locals.db;
  // AV3 fixture：支部党员大会（formal 正式表决），voteConfig 固化应到名单
  // （含正式党员 p3，不含副书记 p14 —— 验证名单驱动而非角色白名单）
  db.prepare('INSERT INTO activities (id, data) VALUES (?, ?)').run('act-formal-test', JSON.stringify({
    id: 'act-formal-test',
    title: '支部党员大会：发展党员审议（测试）',
    date: '2026-09-05',
    type: '支部党员大会',
    scenarioId: 'branch-party-meeting',
    status: 'published',
    voteConfig: {
      mode: 'async',
      optionSet: 'formal',
      voterScope: 'formal-only',
      voterIds: ['p3', 'p5', 'p8'],
      quorumCheck: true,
    },
    agenda: [{ item: '审议发展党员事项', host: '书记' }],
  }));
  server = app.listen(0);
  base = `http://127.0.0.1:${server.address().port}`;
  tokenSec = await login('p13');
  tokenOrg = await login('p11');
  tokenMember = await login('p3');
});

after(async () => {
  if (server) await new Promise((r) => server.close(r));
});

const VOTE = { activityId: 'act-27', agendaItemId: 'ai-1', position: 'agree', note: '' };

test('支委提交表态：201 且落库', async () => {
  const r = await fetch(`${base}/api/v1/agenda-votes`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenSec}` },
    body: JSON.stringify(VOTE),
  });
  assert.equal(r.status, 201);
  const row = await r.json();
  assert.equal(row.personId, 'p13');
  assert.equal(row.position, 'agree');
});

test('重复表态幂等：同人同议题覆盖更新（200）', async () => {
  const r1 = await fetch(`${base}/api/v1/agenda-votes`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenSec}` },
    body: JSON.stringify({ ...VOTE, position: 'comment', note: '补充意见' }),
  });
  assert.equal(r1.status, 200);
  const list = await (await fetch(`${base}/api/v1/agenda-votes?activityId=act-27`, {
    headers: { Authorization: `Bearer ${tokenSec}` },
  })).json();
  const mine = list.filter((v) => v.personId === 'p13' && v.agendaItemId === 'ai-1');
  assert.equal(mine.length, 1);
  assert.equal(mine[0].position, 'comment');
});

test('异议无附言返回 400', async () => {
  const r = await fetch(`${base}/api/v1/agenda-votes`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenSec}` },
    body: JSON.stringify({ ...VOTE, position: 'object', note: '  ' }),
  });
  assert.equal(r.status, 400);
});

test('表态不存在的活动返回 404', async () => {
  const r = await fetch(`${base}/api/v1/agenda-votes`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenSec}` },
    body: JSON.stringify({ ...VOTE, activityId: 'act-999' }),
  });
  assert.equal(r.status, 404);
});

test('非书记调 lock 返回 403', async () => {
  const r = await fetch(`${base}/api/v1/agenda-votes/lock`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenOrg}` },
    body: JSON.stringify({ activityId: 'act-27', votesLocked: true }),
  });
  assert.equal(r.status, 403);
});

test('锁定后禁止表态：400', async () => {
  const lock = await fetch(`${base}/api/v1/agenda-votes/lock`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenSec}` },
    body: JSON.stringify({ activityId: 'act-27', votesLocked: true }),
  });
  assert.equal(lock.status, 200);
  const r = await fetch(`${base}/api/v1/agenda-votes`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenSec}` },
    body: JSON.stringify(VOTE),
  });
  assert.equal(r.status, 400);
});

test('lock 不存在的活动返回 404', async () => {
  const r = await fetch(`${base}/api/v1/agenda-votes/lock`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenSec}` },
    body: JSON.stringify({ activityId: 'act-999', votesLocked: true }),
  });
  assert.equal(r.status, 404);
});

test('普通成员表态被拒绝：403', async () => {
  const r = await fetch(`${base}/api/v1/agenda-votes`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenMember}` },
    body: JSON.stringify(VOTE),
  });
  assert.equal(r.status, 403);
});

test('未登录访问返回 401', async () => {
  const r = await fetch(`${base}/api/v1/agenda-votes?activityId=act-27`);
  assert.equal(r.status, 401);
});

// ===== AV3：voteConfig 泛化（formal 党员大会：optionSet 枚举 + voterIds 名单驱动）=====
const FORMAL_VOTE = { activityId: 'act-formal-test', agendaItemId: 'ai-formal-1', note: '' };

test('formal 活动：名单内正式党员 p3 表态 approve：201 且落库', async () => {
  const r = await fetch(`${base}/api/v1/agenda-votes`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenMember}` },
    body: JSON.stringify({ ...FORMAL_VOTE, position: 'approve' }),
  });
  assert.equal(r.status, 201);
  const row = await r.json();
  assert.equal(row.personId, 'p3');
  assert.equal(row.position, 'approve');
  assert.equal(row.activityId, 'act-formal-test');
});

test('formal 活动：agree 不在 formal 枚举：400', async () => {
  const r = await fetch(`${base}/api/v1/agenda-votes`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenMember}` },
    body: JSON.stringify({ ...FORMAL_VOTE, position: 'agree' }),
  });
  assert.equal(r.status, 400);
});

test('formal 活动：不在 voterIds 的支委 p14 表态 approve：403', async () => {
  const t14 = await login('p14');
  const r = await fetch(`${base}/api/v1/agenda-votes`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t14}` },
    body: JSON.stringify({ ...FORMAL_VOTE, position: 'approve' }),
  });
  assert.equal(r.status, 403);
  const j = await r.json();
  assert.match(j.error, /不在本次表决名单/);
});

// ===== AV3 fail-closed：voteConfig 非法配置一律 400（不回退默认值，消除 voterIds:[] 死锁）=====
function addActivityFixture(act) {
  db.prepare('INSERT INTO activities (id, data) VALUES (?, ?)').run(act.id, JSON.stringify(act));
}

test('formal 活动：同人幂等覆盖 approve→oppose 返回 200 且列表仅 1 条', async () => {
  const post = (position) => fetch(`${base}/api/v1/agenda-votes`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenMember}` },
    body: JSON.stringify({ ...FORMAL_VOTE, position }),
  });
  // p3 已在前置用例投过 approve，此处再投 approve/oppose 均应幂等覆盖 200
  assert.equal((await post('approve')).status, 200);
  assert.equal((await post('oppose')).status, 200);
  const list = await (await fetch(`${base}/api/v1/agenda-votes?activityId=act-formal-test`, {
    headers: { Authorization: `Bearer ${tokenMember}` },
  })).json();
  const mine = list.filter((v) => v.personId === 'p3' && v.agendaItemId === 'ai-formal-1');
  assert.equal(mine.length, 1);
  assert.equal(mine[0].position, 'oppose');
});

test('formal 活动：voteConfig.optionSet 非法（formal2）：400', async () => {
  addActivityFixture({
    id: 'act-bad-option-set', title: '支部党员大会：配置非法 optionSet（测试）', date: '2026-09-06',
    type: '支部党员大会', scenarioId: 'branch-party-meeting', status: 'published',
    voteConfig: { mode: 'async', optionSet: 'formal2', voterIds: ['p3'], quorumCheck: true },
  });
  const r = await fetch(`${base}/api/v1/agenda-votes`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenMember}` },
    body: JSON.stringify({ activityId: 'act-bad-option-set', agendaItemId: 'ai-x', position: 'approve', note: '' }),
  });
  assert.equal(r.status, 400);
  const j = await r.json();
  assert.match(j.error, /活动表决配置无效/);
});

test('formal 活动：voteConfig.voterIds 空数组：400（fail-closed，不回退支委白名单）', async () => {
  addActivityFixture({
    id: 'act-empty-voter-ids', title: '支部党员大会：名单为空（测试）', date: '2026-09-06',
    type: '支部党员大会', scenarioId: 'branch-party-meeting', status: 'published',
    voteConfig: { mode: 'async', optionSet: 'formal', voterIds: [], quorumCheck: true },
  });
  const r = await fetch(`${base}/api/v1/agenda-votes`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenMember}` },
    body: JSON.stringify({ activityId: 'act-empty-voter-ids', agendaItemId: 'ai-x', position: 'approve', note: '' }),
  });
  assert.equal(r.status, 400);
  const j = await r.json();
  assert.match(j.error, /活动表决名单无效/);
});

