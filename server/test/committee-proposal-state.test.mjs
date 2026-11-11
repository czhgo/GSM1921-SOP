// role: [工程师]+[AI]
// committee-proposal-state.test.mjs — 支委提案纯状态机（D-869）
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  proposalTransition, normalizeProposal, isProposalOpen, PROPOSAL_STATUSES,
} from '../../docs/src/core/domain/committee-proposal.js?v=20261110b';

test('合法迁移链：pending → queued → on-agenda → decided → closed', () => {
  assert.equal(proposalTransition('pending', 'accept'), 'queued');
  assert.equal(proposalTransition('queued', 'schedule'), 'on-agenda');
  assert.equal(proposalTransition('on-agenda', 'decide'), 'decided');
  assert.equal(proposalTransition('decided', 'close'), 'closed');
  assert.equal(proposalTransition('pending', 'reject'), 'rejected');
  assert.equal(proposalTransition('rejected', 'close'), 'closed');
});

test('非法迁移一律返回 null（不静默兜底）', () => {
  assert.equal(proposalTransition('pending', 'schedule'), null);
  assert.equal(proposalTransition('pending', 'decide'), null);
  assert.equal(proposalTransition('queued', 'accept'), null);
  assert.equal(proposalTransition('decided', 'reject'), null);
  assert.equal(proposalTransition('closed', 'close'), null);
  assert.equal(proposalTransition('pending', 'unknown'), null);
});

test('终态 / 进行态判定', () => {
  assert.equal(isProposalOpen('pending'), true);
  assert.equal(isProposalOpen('on-agenda'), true);
  assert.equal(isProposalOpen('decided'), false);
  assert.equal(isProposalOpen('closed'), false);
});

test('归一去空白、补默认状态，不猜来源', () => {
  const row = normalizeProposal({ title: '  事项  ', reason: ' 理由 ', sourceType: 'unknown', suggestedType: 'x' });
  assert.equal(row.title, '事项');
  assert.equal(row.reason, '理由');
  assert.equal(row.status, 'pending');
  assert.equal(row.sourceType, '');
  assert.equal(row.suggestedType, 'discussion');
  assert.ok(PROPOSAL_STATUSES.includes(row.status));
});
