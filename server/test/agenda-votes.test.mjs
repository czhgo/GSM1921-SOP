// server/test/agenda-votes.test.mjs — 线上支委会表态 API 单元测试
// 登录以代码实际为准：/api/v1/auth/login 的 personId 为 people id（docs/src/mock/people.js），
// 账号密码（studentId）由前端 mockLogin 映射后再调后端，测试直接传 people id：
//   p13=书记（secretary，studentId 2300010001）
//   p11=组织委员（org-commissioner，studentId 2400012355）
//   p3=普通成员（participant，studentId 2400012347）
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../app.js';
import { seedDatabase } from '../seed.js';

let server, base, agent;
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
  server = app.listen(0);
  base = `http://127.0.0.1:${server.address().port}`;
  tokenSec = await login('p13');
  tokenOrg = await login('p11');
  tokenMember = await login('p3');
});

after(async () => {
  if (server) await new Promise((r) => server.close(r));
});

const VOTE = { activityId: 'act-2', agendaItemId: 'ai-1', position: 'agree', note: '' };

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
  const list = await (await fetch(`${base}/api/v1/agenda-votes?activityId=act-2`, {
    headers: { Authorization: `Bearer ${tokenSec}` },
  })).json();
  const mine = list.filter((v) => v.personId === 'p13' && v.agendaItemId === 'ai-1');
  assert.equal(mine.length, 1);
  assert.equal(mine[0].position, 'comment');
});

test('锁定后禁止表态：400', async () => {
  const lock = await fetch(`${base}/api/v1/agenda-votes/lock`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenSec}` },
    body: JSON.stringify({ activityId: 'act-2', votesLocked: true }),
  });
  assert.equal(lock.status, 200);
  const r = await fetch(`${base}/api/v1/agenda-votes`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenSec}` },
    body: JSON.stringify(VOTE),
  });
  assert.equal(r.status, 400);
});

test('普通成员表态被拒绝：403', async () => {
  const r = await fetch(`${base}/api/v1/agenda-votes`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenMember}` },
    body: JSON.stringify(VOTE),
  });
  assert.equal(r.status, 403);
});

test('未登录访问返回 401', async () => {
  const r = await fetch(`${base}/api/v1/agenda-votes?activityId=act-2`);
  assert.equal(r.status, 401);
});
