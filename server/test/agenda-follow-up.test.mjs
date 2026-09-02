import test from 'node:test';
import assert from 'node:assert/strict';
import { recordAgendaResult } from '../../docs/src/services/agenda-follow-up.js?v=20260901r';

function createHarness() {
  const db = {
    branchDocs: [{ id: 'bd-draft-1', status: 'draft' }],
    memberChangeRequests: [],
  };
  const calls = { branchUpdates: [], memberRequests: [] };
  return {
    db,
    calls,
    adapter: {
      branchDocs: {
        async update(id, patch) {
          calls.branchUpdates.push({ id, patch });
          const updated = { ...db.branchDocs.find((item) => item.id === id), ...patch };
          db.branchDocs = db.branchDocs.map((item) => item.id === id ? updated : item);
          return updated;
        },
      },
      memberChangeRequests: {
        async create(data) {
          calls.memberRequests.push(data);
          const request = { ...data, id: 'mcr-1', status: 'pending-org-approval' };
          db.memberChangeRequests.push(request);
          return request;
        },
      },
    },
  };
}

test('通过的文件讨论归档草案，并为成员变更创建待审批申请', async () => {
  const harness = createHarness();
  const activity = {
    id: 'act-1',
    agenda: [
      { id: 'file-1', kind: 'discussion-file', branchDocId: 'bd-draft-1', result: null },
      { id: 'member-1', kind: 'member-change', personId: 'p6', fromStage: '发展对象', toStage: '预备党员', result: null },
    ],
  };

  const afterFile = await recordAgendaResult({
    activity,
    agendaItemId: 'file-1',
    result: 'passed',
    adapter: harness.adapter,
    db: harness.db,
    actorId: 'p13',
    now: '2026-09-01T00:00:00.000Z',
  });
  const afterMember = await recordAgendaResult({
    activity: afterFile,
    agendaItemId: 'member-1',
    result: 'passed',
    adapter: harness.adapter,
    db: harness.db,
    actorId: 'p13',
    now: '2026-09-01T00:01:00.000Z',
  });

  assert.equal(afterMember.agenda[0].result, 'passed');
  assert.equal(afterMember.agenda[1].result, 'passed');
  assert.equal(afterMember.agenda[0].recordedBy, 'p13');
  assert.equal(afterMember.agenda[1].recordedBy, 'p13');
  assert.equal(afterMember.agenda[0].recordedAt, '2026-09-01T00:00:00.000Z');
  assert.equal(afterMember.agenda[1].recordedAt, '2026-09-01T00:01:00.000Z');
  assert.deepEqual(harness.calls.branchUpdates, [{
    id: 'bd-draft-1',
    patch: {
      status: 'archived',
      archivedAt: '2026-09-01T00:00:00.000Z',
      discussionActivityId: 'act-1',
      discussionAgendaItemId: 'file-1',
    },
  }]);
  assert.deepEqual(harness.calls.memberRequests, [{
    activityId: 'act-1',
    agendaItemId: 'member-1',
    personId: 'p6',
    fromStage: '发展对象',
    toStage: '预备党员',
    meetingResult: 'passed',
  }]);
});

test('未通过的成员变更不创建申请', async () => {
  const harness = createHarness();
  const result = await recordAgendaResult({
    activity: {
      id: 'act-2',
      agenda: [{ id: 'member-2', kind: 'member-change', personId: 'p6', result: null }],
    },
    agendaItemId: 'member-2',
    result: 'rejected',
    adapter: harness.adapter,
    db: harness.db,
    actorId: 'p13',
    now: '2026-09-01T00:00:00.000Z',
  });

  assert.equal(result.agenda[0].result, 'rejected');
  assert.equal(result.agenda[0].recordedBy, 'p13');
  assert.equal(result.agenda[0].recordedAt, '2026-09-01T00:00:00.000Z');
  assert.equal(harness.calls.memberRequests.length, 0);
});
