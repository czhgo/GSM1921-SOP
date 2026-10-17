// role: [工程师]+[AI]
// 工作组成员与报名/历史兼容行的边界；前后端共享角色判据。

export const WORKGROUP_MEMBER_ROLES = Object.freeze(['organizer', 'deep']);

export function isWorkgroupMemberRole(role) {
  return WORKGROUP_MEMBER_ROLES.includes(role);
}

export function workgroupMembers(rows) {
  return (Array.isArray(rows) ? rows : []).filter((row) => row?.personId && isWorkgroupMemberRole(row.role));
}

export function legacyParticipantAssignmentRows(rows) {
  return (Array.isArray(rows) ? rows : []).filter((row) => row?.personId && row.role === 'participant');
}

/** 取消报名时仅移除同人、同角色的真实工作组成员关系。 */
export function removeSignupWorkgroupRole(rows, signup) {
  const current = Array.isArray(rows) ? rows : [];
  if (!signup?.personId || !isWorkgroupMemberRole(signup.role)) return current;
  return current.filter((row) => !(row?.personId === signup.personId && row?.role === signup.role));
}
