import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadMemberProfile } from '../../docs/src/services/member/profile.js?v=20261026b';
import { canMaintainMemberProfileFields } from '../../docs/src/core/domain/profile-access.js?v=20261026b';

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

test('党委必须明确选择目标支部才能只读查看该支部档案', async () => {
  const partyViewer = { id: 'p-party', role: 'party-staff' };
  await assert.rejects(
    loadMemberProfile({
      personId: member.id,
      actor: partyViewer,
      dataSource: 'mock', apiGet: async () => null, mockGet: () => member,
    }),
    (error) => error.status === 403,
  );
  const selected = await loadMemberProfile({
    personId: member.id,
    actor: partyViewer,
    selectedBranchId: 'br-b1',
    dataSource: 'mock', apiGet: async () => null, mockGet: () => member,
  });
  assert.equal(selected, member);
  await assert.rejects(
    loadMemberProfile({
      personId: member.id,
      actor: partyViewer,
      selectedBranchId: 'br-b2',
      dataSource: 'mock', apiGet: async () => null, mockGet: () => member,
    }),
    (error) => error.status === 403,
  );
});

test('治理字段编辑按钮只显示给同支部组织委员', () => {
  assert.equal(canMaintainMemberProfileFields({ id: 'p-org', branchId: 'br-b1', role: 'org-commissioner' }, member), true);
  assert.equal(canMaintainMemberProfileFields({ id: 'p-sec', branchId: 'br-b1', role: 'secretary' }, member), false);
  assert.equal(canMaintainMemberProfileFields({ id: 'p-party', branchId: 'br-b1', role: 'party-staff' }, member), false);
  assert.equal(canMaintainMemberProfileFields({ id: 'p-other-org', branchId: 'br-b2', role: 'org-commissioner' }, member), false);
});

test('待归属（branchId:null）不得回落默认支部：组织委员不可读也不可维护', async () => {
  const pending = { id: 'p-pending', branchId: null, name: '待归属成员', selfProfile: { phone: 'protected' } };
  // 读：br-b1 组织委员不得把 null 当成默认支部成员
  await assert.rejects(
    loadMemberProfile({
      personId: pending.id,
      actor: { id: 'p-org', branchId: 'br-b1', role: 'org-commissioner' },
      dataSource: 'mock', apiGet: async () => null, mockGet: () => pending,
    }),
    (error) => error.status === 403,
  );
  // 写：并显示编辑按钮同样拒绝
  assert.equal(canMaintainMemberProfileFields({ id: 'p-org', branchId: 'br-b1', role: 'org-commissioner' }, pending), false);
  // 待归属者本人仍可看自己的档案
  const own = await loadMemberProfile({
    personId: pending.id,
    actor: { id: pending.id, branchId: null, role: 'participant' },
    dataSource: 'mock', apiGet: async () => null, mockGet: () => pending,
  });
  assert.equal(own, pending);
});
