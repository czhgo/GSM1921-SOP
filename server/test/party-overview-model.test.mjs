import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPartyOverviewModel } from '../../docs/src/core/domain/party-overview.js?v=20261018a';

test('Party overview queue count matches actionable pending review rows', () => {
  const model = buildPartyOverviewModel({
    reviewRequests: [
      { id: 'pending-1', status: 'pending', createdAt: '2026-10-01' },
      { id: 'done', status: 'approved', createdAt: '2026-10-02' },
      { id: 'pending-2', status: 'pending', createdAt: '2026-10-03' },
    ],
  });
  assert.equal(model.pendingCount, model.pending.length);
  assert.deepEqual(model.pending.map((row) => row.id), ['pending-2', 'pending-1']);
});

test('only active branches without an appointed secretary are organizational exceptions', () => {
  const model = buildPartyOverviewModel({
    branches: [
      { id: 'needs-secretary', status: 'active' },
      { id: 'inactive', status: 'inactive' },
      { id: 'appointed', status: 'active', secretaryId: 'p1' },
      null,
    ],
  });
  assert.equal(model.exceptionCount, model.exceptions.length);
  assert.deepEqual(model.exceptions.map((branch) => branch.id), ['needs-secretary']);
});
