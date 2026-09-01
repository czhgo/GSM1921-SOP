import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../app.js';
import { seedDatabase } from '../seed.js';

let server;
let base;

before(async () => {
  const app = createApp({ dbPath: ':memory:' });
  await seedDatabase(app.locals.db);
  server = app.listen(0);
  base = `http://127.0.0.1:${server.address().port}`;
});

after(() => server.close());

async function login(personId) {
  const response = await fetch(`${base}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ personId }),
  });
  assert.equal(response.status, 200);
  return (await response.json()).token;
}

async function api(token, path, method = 'GET', body) {
  return fetch(`${base}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

test('独立支委会话读取书记确认后的同一服务器数据', async () => {
  const secretary = await login('p13');
  const organizer = await login('p11');
  const independentCommissioner = await login('p10');

  const create = await api(secretary, '/api/v1/member-change-requests', 'POST', {
    activityId: 'act-27',
    agendaItemId: 'agenda-cross-session-p6',
    personId: 'p6',
    fromStage: '发展对象',
    toStage: '预备党员',
    meetingResult: 'passed',
  });
  assert.equal(create.status, 201);
  const request = await create.json();

  assert.equal((await api(organizer, `/api/v1/member-change-requests/${request.id}/approve`, 'POST')).status, 200);
  assert.equal((await api(secretary, `/api/v1/member-change-requests/${request.id}/confirm`, 'POST')).status, 200);

  const usersResponse = await api(independentCommissioner, '/api/v1/users');
  assert.equal(usersResponse.status, 200);
  const users = await usersResponse.json();
  assert.equal(users.find((person) => person.id === 'p6').developStage, '预备党员');

  const broadcastsResponse = await api(independentCommissioner, `/api/v1/committeeBroadcasts?requestId=${request.id}`);
  assert.equal(broadcastsResponse.status, 200);
  const broadcasts = await broadcastsResponse.json();
  assert.equal(broadcasts.some((record) => record.recipientId === 'p10'), true);
});
