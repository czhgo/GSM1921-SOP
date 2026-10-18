// 工作组角色与报名历史的领域边界；无需启动服务或触碰持久数据库。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { usesFormalMeetingRoster } from '../../docs/src/core/domain/constants.js?v=20261018h';
import {
  WORKGROUP_MEMBER_ROLES,
  isWorkgroupMemberRole,
  workgroupMembers,
  legacyParticipantAssignmentRows,
  removeSignupWorkgroupRole,
} from '../../docs/src/services/activity/workgroup-members.js?v=20261018h';

test('活动与专班工作组都只把组织者和深度参与者计为成员', () => {
  const rows = [
    { personId: 'p1', role: 'organizer' },
    { personId: 'p2', role: 'deep' },
    { personId: 'p3', role: 'participant' },
    { personId: 'p4', role: 'unknown' },
  ];
  assert.deepEqual(WORKGROUP_MEMBER_ROLES, ['organizer', 'deep']);
  assert.equal(isWorkgroupMemberRole('participant'), false);
  assert.deepEqual(workgroupMembers(rows).map((row) => row.personId), ['p1', 'p2']);
  assert.deepEqual(legacyParticipantAssignmentRows(rows).map((row) => row.personId), ['p3']);
});

test('取消普通参与报名不改变工作组角色；取消组织者/深度角色只移除同角色关系', () => {
  const rows = [
    { personId: 'p1', role: 'organizer' },
    { personId: 'p2', role: 'deep' },
    { personId: 'p3', role: 'participant' },
  ];
  assert.equal(removeSignupWorkgroupRole(rows, { personId: 'p2', role: 'participant' }), rows);
  assert.deepEqual(removeSignupWorkgroupRole(rows, { personId: 'p2', role: 'deep' }), [rows[0], rows[2]]);
});

test('三会一课与组织生活会使用正式名单，主题党日不受正式会议规则影响', () => {
  assert.equal(usesFormalMeetingRoster({ type: '三会一课·支部党员大会' }), true);
  assert.equal(usesFormalMeetingRoster({ type: '组织生活会' }), true);
  assert.equal(usesFormalMeetingRoster({ type: '主题党日', scenarioId: 'theme-party' }), false);
  assert.equal(usesFormalMeetingRoster({ type: '', scenarioId: 'branch-committee' }), true);
});
