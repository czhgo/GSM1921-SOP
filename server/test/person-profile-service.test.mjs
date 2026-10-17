import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadMemberProfile } from '../../docs/src/services/member/profile.js?v=20261017h';
import { canMaintainMemberProfileFields } from '../../docs/src/core/domain/profile-access.js?v=20261017h';

const member = { id: 'p-target', branchId: 'br-b1', name: '目标成员', selfProfile: { phone: 'protected' } };

test('mock profile read rejects unauthorized cached rows before rendering', async () => {
  await assert.rejects(
    loadMemberProfile({
      personId: member.id,
      actor: { id: 'p-viewer', branchId: 'br-b1', role: 'participant' },
      dataSource: 'mock',
      apiGet: async () => { throw new Error('must not call API'); },
      mockGet: () => member,
    }),
    (error) => error.status === 403,
  );
});

test('API profile read uses the authorized semantic endpoint and never falls back to cached user data', async () => {
  const denied = Object.assign(new Error('forbidden'), { status: 403 });
  let mockRead = false;
  await assert.rejects(
    loadMemberProfile({
      personId: member.id,
      actor: { id: 'p-viewer', branchId: 'br-b1', role: 'participant' },
      dataSource: 'api',
      apiGet: async () => { throw denied; },
      mockGet: () => { mockRead = true; return member; },
    }),
    (error) => error === denied,
  );
  assert.equal(mockRead, false);
});

test('本人和同支部支委通过统一策略读取 mock 档案', async () => {
  const own = await loadMemberProfile({
    personId: member.id,
    actor: { id: member.id, branchId: 'br-b1', role: 'participant' },
    dataSource: 'mock', apiGet: async () => null, mockGet: () => member,
  });
  assert.equal(own, member);
  const committee = await loadMemberProfile({
    personId: member.id,
    actor: { id: 'p-committee', branchId: 'br-b1', role: 'secretary' },
    dataSource: 'mock', apiGet: async () => null, mockGet: () => member,
  });
  assert.equal(committee, member);
});

test('治理字段编辑按钮只显示给同支部组织委员', () => {
  assert.equal(canMaintainMemberProfileFields({ id: 'p-org', branchId: 'br-b1', role: 'org-commissioner' }, member), true);
  assert.equal(canMaintainMemberProfileFields({ id: 'p-sec', branchId: 'br-b1', role: 'secretary' }, member), false);
  assert.equal(canMaintainMemberProfileFields({ id: 'p-party', branchId: 'br-b1', role: 'party-staff' }, member), false);
  assert.equal(canMaintainMemberProfileFields({ id: 'p-other-org', branchId: 'br-b2', role: 'org-commissioner' }, member), false);
});
