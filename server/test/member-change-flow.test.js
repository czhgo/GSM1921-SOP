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

async function tokenFor(personId) {
  const response = await fetch(`${base}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ personId }),
  });
  assert.equal(response.status, 200);
  return (await response.json()).token;
}

async function requestAs(token, path, method, body) {
  return fetch(`${base}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

test('组织委员审批后广播，书记确认后更新成员资料', async () => {
  const secretaryToken = await tokenFor('p13');
  const orgToken = await tokenFor('p11');
  const participantToken = await tokenFor('p6');

  const deniedCreate = await requestAs(participantToken, '/api/v1/member-change-requests', 'POST', {
    activityId: 'act-27',
    agendaItemId: 'agenda-member-p6',
    personId: 'p6',
    fromStage: '发展对象',
    toStage: '预备党员',
    meetingResult: 'passed',
  });
  assert.equal(deniedCreate.status, 403);

  const createResponse = await requestAs(secretaryToken, '/api/v1/member-change-requests', 'POST', {
    activityId: 'act-27',
    agendaItemId: 'agenda-member-p6',
    personId: 'p6',
    fromStage: '发展对象',
    toStage: '预备党员',
    meetingResult: 'passed',
  });
  assert.equal(createResponse.status, 201);
  const created = await createResponse.json();
  assert.equal(created.status, 'pending-org-approval');

  const deniedApproval = await requestAs(secretaryToken, `/api/v1/member-change-requests/${created.id}/approve`, 'POST');
  assert.equal(deniedApproval.status, 403);

  const approvalResponse = await requestAs(orgToken, `/api/v1/member-change-requests/${created.id}/approve`, 'POST');
  assert.equal(approvalResponse.status, 200);
  const approved = await approvalResponse.json();
  assert.equal(approved.status, 'pending-secretary');

  const userBeforeConfirmation = await requestAs(secretaryToken, '/api/v1/users', 'GET');
  const peopleBeforeConfirmation = await userBeforeConfirmation.json();
  assert.equal(peopleBeforeConfirmation.find((person) => person.id === 'p6').developStage, '发展对象');

  const broadcastsResponse = await requestAs(secretaryToken, `/api/v1/committeeBroadcasts?requestId=${created.id}`, 'GET');
  assert.equal(broadcastsResponse.status, 200);
  const broadcasts = await broadcastsResponse.json();
  assert.deepEqual(
    broadcasts.map((record) => record.recipientId).sort(),
    ['p10', 'p11', 'p12', 'p13', 'p14'],
  );

  const confirmResponse = await requestAs(secretaryToken, `/api/v1/member-change-requests/${created.id}/confirm`, 'POST');
  assert.equal(confirmResponse.status, 200);
  assert.equal((await confirmResponse.json()).status, 'completed');

  const userAfterConfirmation = await requestAs(secretaryToken, '/api/v1/users', 'GET');
  const peopleAfterConfirmation = await userAfterConfirmation.json();
  assert.equal(peopleAfterConfirmation.find((person) => person.id === 'p6').developStage, '预备党员');
});
