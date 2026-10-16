import { test } from 'node:test';
import assert from 'node:assert/strict';
import { grantsRevokedByMembershipRemoval } from '../routes/resources/workgroup-routes.js';

test('移出工作组成员时只撤回该成员在该工作组中的全部有效授权并保留审计字段', () => {
  const grants = [
    { id: 'g1', workgroupId: 'wg-a1', personId: 'p8', status: 'active', permissionKeys: ['activity.edit'] },
    { id: 'g2', workgroupId: 'wg-a1', personId: 'p8', status: 'active', permissionKeys: ['task.manage'] },
    { id: 'g3', workgroupId: 'wg-a1', personId: 'p8', status: 'revoked', permissionKeys: ['output.submit'] },
    { id: 'g4', workgroupId: 'wg-a1', personId: 'p9', status: 'active', permissionKeys: ['activity.edit'] },
    { id: 'g5', workgroupId: 'wg-a2', personId: 'p8', status: 'active', permissionKeys: ['activity.edit'] },
  ];
  const changed = grantsRevokedByMembershipRemoval(grants, {
    workgroupId: 'wg-a1', personId: 'p8', removedBy: 'p1', removedAt: '2026-10-16T08:00:00.000Z',
  });
  assert.deepEqual(changed.map((row) => row.id), ['g1', 'g2']);
  for (const row of changed) {
    assert.equal(row.status, 'revoked');
    assert.equal(row.revokedBy, 'p1');
    assert.equal(row.revokedAt, '2026-10-16T08:00:00.000Z');
    assert.equal(row.revocationReason, 'membership-removed');
  }
  assert.deepEqual(grants, [
    { id: 'g1', workgroupId: 'wg-a1', personId: 'p8', status: 'active', permissionKeys: ['activity.edit'] },
    { id: 'g2', workgroupId: 'wg-a1', personId: 'p8', status: 'active', permissionKeys: ['task.manage'] },
    { id: 'g3', workgroupId: 'wg-a1', personId: 'p8', status: 'revoked', permissionKeys: ['output.submit'] },
    { id: 'g4', workgroupId: 'wg-a1', personId: 'p9', status: 'active', permissionKeys: ['activity.edit'] },
    { id: 'g5', workgroupId: 'wg-a2', personId: 'p8', status: 'active', permissionKeys: ['activity.edit'] },
  ], '纯转换不改输入；复加入后旧撤权留痕仍不恢复');
});
