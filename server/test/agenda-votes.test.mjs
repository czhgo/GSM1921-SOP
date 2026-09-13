// server/test/agenda-votes.test.mjs — 线上表态 API 单元测试（AV3：voteConfig 泛化）
// 登录以代码实际为准：/api/v1/auth/login 的 personId 为 people id（docs/src/mock/people.js），
// 账号密码（studentId）由前端 mockLogin 映射后再调后端，测试直接传 people id：
//   p13=支书（secretary，studentId 2300010001）
//   p11=组织委员（org-commissioner，studentId 2400012355）
//   p3=正式党员（participant，studentId 2400012347）
//   p14=副支书（deputy-secretary，studentId 2300010002）
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
  // （含正式党员 p3，不含副支书 p14 —— 验证名单驱动而非角色白名单）
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
    agenda: [{ item: '审议发展党员事项', host: '支书' }],
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

test('非支书调 lock 返回 403', async () => {
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
// 2026-09-12 支书裁定「正式表决无记名 + 匿名模式可选」：formal（正式表决）强制 anonymous——
//   落库两段式（参与记录 {personId, votedAt} + 计数行 tally），逐人选项/附言不落库、响应亦不可见。
const FORMAL_VOTE = { activityId: 'act-formal-test', agendaItemId: 'ai-formal-1', note: '' };

/** 拉取某活动表态行（含参与记录 + tally 行） */
async function fetchVoteRows(activityId, token = tokenMember) {
  const r = await fetch(`${base}/api/v1/agenda-votes?activityId=${activityId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  assert.equal(r.status, 200);
  return r.json();
}
/** 取某议程项 tally 计数 */
function tallyOf(rows, itemId) {
  const row = rows.find((v) => v && v.tally && v.agendaItemId === itemId);
  return (row && row.tally) || {};
}
/** 无记名匿名性断言：任何行都不含 personId→选项 映射（无 position/note 落库与回传） */
function assertNoPerPersonOption(rows) {
  assert.ok(!rows.some((v) => v && v.personId && (v.position !== undefined || v.note !== undefined)),
    `无记名响应不得含 personId→选项 映射：${JSON.stringify(rows.filter((v) => v.personId))}`);
}

test('无记名 formal：名单内正式党员 p3 表态 approve → 201 仅落参与记录 + tally（无逐人选项）', async () => {
  const r = await fetch(`${base}/api/v1/agenda-votes`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenMember}` },
    body: JSON.stringify({ ...FORMAL_VOTE, position: 'approve', note: '（无记名不得附言）' }),
  });
  assert.equal(r.status, 201);
  const row = await r.json();
  assert.equal(row.personId, 'p3');
  assert.equal(row.ballotMode, 'anonymous');
  assert.ok(row.votedAt, '应落参与时间 votedAt（供催办/人数核验）');
  assert.equal(row.position, undefined, '无记名不得落逐人选项');
  assert.equal(row.note, undefined, '无记名不得落逐人附言');
  const rows = await fetchVoteRows('act-formal-test');
  assertNoPerPersonOption(rows);
  assert.deepEqual(tallyOf(rows, 'ai-formal-1'), { approve: 1 }, 'tally 应记 approve 1');
});

test('无记名 formal：多人表态只累计 tally（p5 approve / p8 abstain），参与名单可判谁已投', async () => {
  for (const [pid, position] of [['p5', 'approve'], ['p8', 'abstain']]) {
    const tk = await login(pid);
    const r = await fetch(`${base}/api/v1/agenda-votes`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tk}` },
      body: JSON.stringify({ ...FORMAL_VOTE, position }),
    });
    assert.equal(r.status, 201, `${pid} 表态应 201`);
  }
  const rows = await fetchVoteRows('act-formal-test');
  assertNoPerPersonOption(rows);
  assert.deepEqual(tallyOf(rows, 'ai-formal-1'), { approve: 2, abstain: 1 });
  const present = rows.filter((v) => v.personId && v.agendaItemId === 'ai-formal-1').map((v) => v.personId).sort();
  assert.deepEqual(present, ['p3', 'p5', 'p8'], '参与记录保留 personId（可催未投者）');
});

test('无记名 formal：同人重复提交幂等（不可改票、不重复计数）', async () => {
  const post = (position) => fetch(`${base}/api/v1/agenda-votes`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenMember}` },
    body: JSON.stringify({ ...FORMAL_VOTE, position }),
  });
  assert.equal((await post('oppose')).status, 200, '重复提交返回 200（幂等）');
  const rows = await fetchVoteRows('act-formal-test');
  assert.equal(rows.filter((v) => v.personId === 'p3' && v.agendaItemId === 'ai-formal-1').length, 1, '参与记录仅 1 条');
  assert.deepEqual(tallyOf(rows, 'ai-formal-1'), { approve: 2, abstain: 1 }, 'tally 不因重复提交变化（不可改票）');
});

test('无记名 formal：存储层亦无逐人选项（原表逐行断言）', () => {
  const rows = db.prepare('SELECT data FROM agenda_votes').all().map((r) => JSON.parse(r.data))
    .filter((v) => v.activityId === 'act-formal-test');
  assert.ok(rows.length >= 4, '应有参与记录 + tally 行');
  assert.ok(!rows.some((v) => v.personId && (v.position !== undefined || v.note !== undefined)),
    '存储层不得出现 personId→选项 映射');
});

test('无记名 formal：显式以 ballotMode=named 提交 → 400（制度强制防绕过）', async () => {
  const r = await fetch(`${base}/api/v1/agenda-votes`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenMember}` },
    body: JSON.stringify({ ...FORMAL_VOTE, position: 'approve', note: '', ballotMode: 'named' }),
  });
  assert.equal(r.status, 400);
  assert.match((await r.json()).error, /无记名/);
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

// ===== 写侧强制校验：正式表决不得写 ballotMode='named'（400）=====
test('活动创建：formal + ballotMode=named → 400；formal + anonymous → 201', async () => {
  const base_ = {
    title: '支部党员大会：计票方式校验（测试）', date: '2026-09-07', type: '支部党员大会',
    scenarioId: 'branch-party-meeting', status: 'published',
    voteConfig: { mode: 'async', optionSet: 'formal', voterScope: 'formal-only', voterIds: ['p3'], quorumCheck: true },
  };
  const bad = await fetch(`${base}/api/v1/activities`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenSec}` },
    body: JSON.stringify({ ...base_, id: 'act-ballot-named', voteConfig: { ...base_.voteConfig, ballotMode: 'named' } }),
  });
  assert.equal(bad.status, 400, '正式表决写 named 应 400');
  assert.match((await bad.json()).error, /无记名/);
  const ok = await fetch(`${base}/api/v1/activities`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenSec}` },
    body: JSON.stringify({ ...base_, id: 'act-ballot-anon', voteConfig: { ...base_.voteConfig, ballotMode: 'anonymous' } }),
  });
  assert.equal(ok.status, 201, '正式表决写 anonymous 应 201');
  // PATCH 同样拦截
  const patch = await fetch(`${base}/api/v1/activities/act-ballot-anon`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenSec}` },
    body: JSON.stringify({ voteConfig: { ...base_.voteConfig, ballotMode: 'named' } }),
  });
  assert.equal(patch.status, 400, 'PATCH 改为 named 应 400');
});

// ===== AV3 fail-closed：voteConfig 非法配置一律 400（不回退默认值，消除 voterIds:[] 死锁）=====
function addActivityFixture(act) {
  db.prepare('INSERT INTO activities (id, data) VALUES (?, ?)').run(act.id, JSON.stringify(act));
}

test('记名回归（deliberative + ballotMode=named）：逐人选项/附言可见、幂等改票覆盖', async () => {
  addActivityFixture({
    id: 'act-named-test', title: '支委会：记名表态（测试）', date: '2026-09-07',
    type: '支委会', scenarioId: 'branch-committee', status: 'published',
    voteConfig: { mode: 'async', optionSet: 'deliberative', ballotMode: 'named', voterScope: 'committee', voterIds: ['p11', 'p13'], quorumCheck: false },
  });
  const post = (position, note = '') => fetch(`${base}/api/v1/agenda-votes`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenOrg}` },
    body: JSON.stringify({ activityId: 'act-named-test', agendaItemId: 'ai-named-1', position, note }),
  });
  assert.equal((await post('agree')).status, 201);
  assert.equal((await post('object', '建议调整')).status, 200, '记名同人改票为幂等覆盖 200');
  const list = await fetchVoteRows('act-named-test', tokenOrg);
  const mine = list.filter((v) => v.personId === 'p11' && v.agendaItemId === 'ai-named-1');
  assert.equal(mine.length, 1);
  assert.equal(mine[0].position, 'object', '记名逐人选项仍可见（回归）');
  assert.equal(mine[0].note, '建议调整', '记名附言仍可见（回归）');
  assert.ok(!list.some((v) => v.tally), '记名不产生 tally 行');
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

// ===== mock 形态同口径（与 server 双形态一致；纯前端模块直调，不起服务）=====
test('mock 形态：无记名只落参与记录 + tally、无逐人选项；记名保持逐人可见', async () => {
  const { mockDB } = await import('../../docs/src/core/domain.js?v=20260913f');
  const { MockAdapter } = await import('../../docs/src/core/mock-adapter.js?v=20260913f');
  const originActs = mockDB.activities;
  const originVotes = mockDB.agendaVotes;
  const originLoaded = mockDB._loaded;
  const hadLS = 'localStorage' in globalThis;
  if (!hadLS) {
    const store = new Map();
    globalThis.localStorage = {
      getItem: (k) => (store.has(String(k)) ? store.get(String(k)) : null),
      setItem: (k, v) => store.set(String(k), String(v)),
      removeItem: (k) => store.delete(String(k)),
      clear: () => store.clear(),
      key: () => null,
      length: 0,
    };
  }
  try {
    mockDB._loaded = true;
    mockDB.activities = [
      { id: 'm-act-anon', voteConfig: { optionSet: 'formal', ballotMode: 'anonymous', voterIds: ['p1', 'p2'] } },
      { id: 'm-act-named', voteConfig: { optionSet: 'deliberative', ballotMode: 'named', voterIds: ['p1', 'p2'] } },
    ];
    mockDB.agendaVotes = [];
    await MockAdapter.agendaVotes.create({ activityId: 'm-act-anon', agendaItemId: 'm-a1', position: 'approve', note: '（不落）', personId: 'p1' });
    await MockAdapter.agendaVotes.create({ activityId: 'm-act-anon', agendaItemId: 'm-a1', position: 'approve', personId: 'p2' });
    const rows = mockDB.agendaVotes;
    assert.ok(!rows.some((v) => v.personId && (v.position !== undefined || v.note !== undefined)),
      `mock 无记名不得含 personId→选项 映射：${JSON.stringify(rows)}`);
    assert.deepEqual((rows.find((v) => v.tally) || {}).tally, { approve: 2 }, 'tally 应累计 approve 2');
    assert.equal(rows.filter((v) => v.personId).length, 2, '参与记录 2 条（可判谁已投）');
    // 幂等：同人重复提交不重复计数、不可改票
    await MockAdapter.agendaVotes.create({ activityId: 'm-act-anon', agendaItemId: 'm-a1', position: 'oppose', personId: 'p1' });
    assert.deepEqual((mockDB.agendaVotes.find((v) => v.tally) || {}).tally, { approve: 2 });
    assert.equal(mockDB.agendaVotes.filter((v) => v.personId === 'p1').length, 1);
    // 记名回归：逐人选项/附言可见
    await MockAdapter.agendaVotes.create({ activityId: 'm-act-named', agendaItemId: 'm-n1', position: 'object', note: '意见', personId: 'p1' });
    const named = mockDB.agendaVotes.filter((v) => v.activityId === 'm-act-named');
    assert.equal(named.length, 1);
    assert.equal(named[0].position, 'object');
    assert.equal(named[0].note, '意见');
  } finally {
    mockDB.activities = originActs;
    mockDB.agendaVotes = originVotes;
    mockDB._loaded = originLoaded;
    if (!hadLS) delete globalThis.localStorage;
  }
});

