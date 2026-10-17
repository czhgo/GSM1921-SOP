// Mock 数据兼容迁移：为已有活动/专班建立稳定工作组主记录。
// 不搬移普通参与者，不猜测旧专班任务/产出；原始业务记录仍是来源。
const MEMBER_ROLES = new Set(['organizer', 'deep']);

const groupIdFor = (kind, sourceId) => `wg-${kind}-${sourceId}`;
const memberIdFor = (workgroupId, personId) => `wgm-${encodeURIComponent(workgroupId)}-${encodeURIComponent(personId)}`;

/**
 * Ensure legacy mock Activity/Taskforce records have the stable workgroup IDs
 * used by the API migration. Existing workgroups and member sets are left intact.
 * Returns true only when a source link, group, or unambiguous member row was added.
 */
export function ensureLegacySourceWorkgroups(db) {
  let changed = false;
  const ensure = (sourceRows, kind) => {
    const sourceKey = kind === 'activity' ? 'activities' : 'taskforces';
    const workgroups = Array.isArray(db.workgroups) ? [...db.workgroups] : [];
    const memberships = Array.isArray(db.workgroupMembers) ? [...db.workgroupMembers] : [];
    const rows = Array.isArray(sourceRows) ? sourceRows : [];
    const nextRows = rows.map((source) => {
      const matchesSource = (row) => row.kind === kind
        && row.sourceId === source.id
        && (!row.sourceType || row.sourceType === kind)
        && (!source.branchId || !row.branchId || source.branchId === row.branchId);
      const explicitGroup = source.workgroupId
        ? workgroups.find((row) => row.id === source.workgroupId)
        : null;
      const sourceCandidate = workgroups.find((row) => row.kind === kind && row.sourceId === source.id);

      // An existing association is evidence, not permission to reclassify a
      // group. Clear an invalid link and leave the source pending review.
      if ((explicitGroup && !matchesSource(explicitGroup)) || (sourceCandidate && !matchesSource(sourceCandidate))) {
        if (source.workgroupId) changed = true;
        return source.workgroupId ? { ...source, workgroupId: null } : source;
      }

      const existingWorkgroup = explicitGroup || sourceCandidate || null;
      const workgroupId = existingWorkgroup?.id || source.workgroupId || groupIdFor(kind, source.id);
      let workgroup = existingWorkgroup;
      const branchId = source.branchId || workgroup?.branchId || 'br-b1';
      const createdAt = source.createdAt || source.date || null;
      let createdGroup = false;

      if (!workgroup) {
        workgroup = {
          id: workgroupId, branchId, kind, sourceType: kind, sourceId: source.id,
          name: (kind === 'activity' ? source.title : source.name) || source.id,
          status: kind === 'activity'
            ? (source.archived ? 'archived' : 'active')
            : (source.deletedAt ? 'archived' : (source.status || 'active')),
          ...(kind === 'activity' ? {
            organizingScope: ['party-group', 'cross-group'].includes(source.organizingScope) ? source.organizingScope : null,
            hostGroupId: source.hostGroupId || null,
          } : {}),
          migrationState: kind === 'taskforce' || !source.organizingScope ? 'pending-review' : 'ready',
          createdAt,
        };
        workgroups.push(workgroup);
        changed = true;
        createdGroup = true;
      }

      if (source.workgroupId !== workgroup.id) {
        changed = true;
      }

      // Only seed unambiguous workgroup roles when this migration creates the
      // group. A later empty membership set may be an intentional edit.
      if (createdGroup && !memberships.some((row) => row.workgroupId === workgroup.id && row.status !== 'removed')) {
        const memberRows = kind === 'activity' ? source.assignments : source.members;
        for (const member of Array.isArray(memberRows) ? memberRows : []) {
          if (!member?.personId || !MEMBER_ROLES.has(member.role)) continue;
          const personId = String(member.personId);
          const id = memberIdFor(workgroup.id, personId);
          if (memberships.some((row) => row.id === id)) continue;
          memberships.push({
            id, branchId: workgroup.branchId, workgroupId: workgroup.id, personId,
            role: member.role, status: 'active', migratedFromLegacy: true,
            createdBy: 'mock-workgroup-migration', createdAt: workgroup.createdAt || new Date(0).toISOString(),
          });
          changed = true;
        }
      }

      return source.workgroupId === workgroup.id ? source : { ...source, workgroupId: workgroup.id };
    });

    db.workgroups = workgroups;
    db.workgroupMembers = memberships;
    db[sourceKey] = nextRows;
  };

  ensure(db.activities, 'activity');
  ensure(db.taskforces, 'taskforce');
  return changed;
}
