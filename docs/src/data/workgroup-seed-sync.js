// Mock 数据兼容迁移：为已有活动/专班建立稳定工作组主记录。
// 不搬移普通参与者，不猜测旧专班任务/产出；原始业务记录仍是来源。
import { WorkgroupStatus, workgroupStatusForTaskforce } from '../core/domain/domain.js?v=20261026b';
import { DEFAULT_BRANCH_ID, ACTIVITY_SCOPES, isBranchLevelActivity, normalizeOrganizingScope } from '../core/domain/constants.js?v=20261026b';
// R10（2026-10-23）：活动工作组状态规则单一源——归档或取消 ⇒ archived（不再只看 source.archived）。
import { syncActivityWorkgroup, workgroupIdFor } from './activity-workgroup-sync.js?v=20261026b';
import { PARTY_GROUPS } from './mock/party-groups.js?v=20261026b';
import { PEOPLE } from './mock/people.js?v=20261026b';

const MEMBER_ROLES = new Set(['organizer', 'deep']);

/**
 * 种子活动的组织落点归一（2026-10-21 批次 499/502）。
 * 演示种子是**本仓作者维护的夹具**，不是线上存量：这里按既有事实补齐
 * `organizingScope / hostGroupId / recruitmentScope / crossGroupCoordinatorId`，
 * 使 mock 与真实 API 结构一致；不新增人员、不编造活动。
 * 规则（均可由既有字段直接判定，不做归属猜测）：
 *   · 支部级场景 ⇒ `branch`，无承办组；
 *   · 其余一律 `party-group`（跨组不是第三种落点）；承办组优先取既有 hostGroup，
 *     否则取组织者所属党小组（母本「组织者一般本组」）；
 *   · 深度参与者来自其他党小组 ⇒ 标记 `recruitmentScope='cross-group'`，协调人取本支部组织委员，
 *     并在成员行写 `crossGroup/coordinatedBy`（与 API 写入结果同构）；
 *   · 仍无法判定承办组 ⇒ `legacyHostGroup=true`，留给组织台补选，不猜。
 */
export function normalizeSeedActivityOrganizing(activities) {
  const groups = Array.isArray(PARTY_GROUPS) ? PARTY_GROUPS : [];
  const commissioner = PEOPLE.find((p) => p.role === 'org-commissioner') || null;
  return (Array.isArray(activities) ? activities : []).map((activity) => {
    const { legacyHostGroup, ...rest } = activity;
    if (isBranchLevelActivity(activity)) {
      return { ...rest, organizingScope: ACTIVITY_SCOPES.BRANCH, hostGroupId: null, hostGroup: '' };
    }
    const organizer = PEOPLE.find((p) => p.id === activity.organizer);
    const group = (activity.hostGroupId && groups.find((g) => g.id === activity.hostGroupId))
      || (activity.hostGroup && groups.find((g) => g.name === activity.hostGroup))
      || (organizer?.partyGroup && groups.find((g) => g.name === organizer.partyGroup))
      || null;
    if (!group) {
      return {
        ...rest,
        organizingScope: normalizeOrganizingScope(activity.organizingScope, activity),
        hostGroupId: activity.hostGroupId || null,
        legacyHostGroup: legacyHostGroup || !activity.hostGroupId || undefined,
      };
    }
    const assignments = (Array.isArray(activity.assignments) ? activity.assignments : []).map((member) => {
      const person = PEOPLE.find((p) => p.id === member.personId);
      const cross = member.role === 'deep' && person?.partyGroup && person.partyGroup !== group.name;
      return cross ? { ...member, crossGroup: true, coordinatedBy: commissioner?.id || null } : member;
    });
    const crossRecruit = assignments.some((member) => member.crossGroup);
    return {
      ...rest,
      organizingScope: ACTIVITY_SCOPES.PARTY_GROUP,
      hostGroupId: group.id,
      hostGroup: group.name,
      assignments,
      ...(crossRecruit ? { recruitmentScope: 'cross-group', crossGroupCoordinatorId: commissioner?.id || null } : {}),
    };
  });
}

/**
 * 种子活动行的**完整装载归一**（2026-10-21 批次 499 B-499-4）：
 * 在组织落点归一之后，补齐数据模型必填的装载默认字段（`visibility / createdBy / createdAt`）。
 * 原先只有 `mock-adapter.js::_seedInitialData` 在浏览器装载时补这三项 ⇒ API 首启行缺字段，
 * 两形态结构漂移。本函数为 server 播种与 mock 装载共用的单一源；不新增人员、不编造活动。
 */
export function normalizeSeedActivitySeedRows(activities) {
  return normalizeSeedActivityOrganizing(activities).map((activity) => ({
    ...activity,
    // v12：种子活动一律有支部归属（单支部演示库缺省 br-b1）；不逐行复制字段。
    branchId: activity.branchId || DEFAULT_BRANCH_ID,
    visibility: activity.visibility || 'branch',
    createdBy: activity.createdBy || activity.organizer || null,
    createdAt: activity.createdAt || activity.date,
  }));
}

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
      const workgroupId = existingWorkgroup?.id || source.workgroupId || workgroupIdFor(kind, source.id);
      let workgroup = existingWorkgroup;
      const branchId = source.branchId || workgroup?.branchId || DEFAULT_BRANCH_ID;
      const createdAt = source.createdAt || source.date || null;
      // 组织落点只有两档：读取旧 cross-group / 空值时归一为 party-group（跨组只由 recruitmentScope 表达）。
      const sourceScope = kind === 'activity' && source.organizingScope
        ? normalizeOrganizingScope(source.organizingScope, source)
        : source.organizingScope;
      // R10（2026-10-23）：活动工作组状态复用活动 ↔ 工作组投影的同一规则（archived / cancelled ⇒ archived），
      //   不再只读 source.archived；专班仍按 canonical 状态映射。
      const activityPatch = kind === 'activity' ? syncActivityWorkgroup(source) : null;
      const derivedStatus = kind === 'activity'
        ? (activityPatch?.status || WorkgroupStatus.ACTIVE)
        : (source.deletedAt ? WorkgroupStatus.ARCHIVED : workgroupStatusForTaskforce(source.status));
      let createdGroup = false;

      if (!workgroup) {
        workgroup = {
          id: workgroupId, branchId, kind, sourceType: kind, sourceId: source.id,
          name: (kind === 'activity' ? source.title : source.name) || source.id,
          // 状态不得原样复制旧值：专班状态经 canonical 映射（历史别名 in_progress→active；
          // 未知值→draft 只读待核），活动工作组按 syncActivityWorkgroup 派生 active/archived。
          status: derivedStatus,
          ...(kind === 'activity' ? {
            organizingScope: sourceScope || null,
            hostGroupId: source.hostGroupId || null,
            recruitmentScope: source.recruitmentScope || 'group',
            crossGroupCoordinatorId: source.crossGroupCoordinatorId || null,
          } : {}),
          migrationState: kind === 'taskforce' || !source.organizingScope ? 'pending-review' : 'ready',
          // R10（2026-10-23）：派生组补审计创建人（活动取创建人，缺省回组织者）。
          createdBy: source.createdBy || source.organizer || null,
          createdAt,
        };
        workgroups.push(workgroup);
        changed = true;
        createdGroup = true;
      } else if (kind === 'activity' && derivedStatus === WorkgroupStatus.ARCHIVED
        && workgroup.status !== WorkgroupStatus.ARCHIVED) {
        // 仅收敛到终态（归档/取消），不反向重新激活——与 activity-workgroup-sync 同口径。
        workgroup = { ...workgroup, status: WorkgroupStatus.ARCHIVED };
        workgroups[workgroups.findIndex((row) => row.id === workgroup.id)] = workgroup;
        changed = true;
      }

      if (source.workgroupId !== workgroup.id) {
        changed = true;
      }

      // 既有工作组的组织落点镜像同样收敛为两档（旧 mock / 旧 localStorage 里的 cross-group）。
      if (kind === 'activity' && workgroup.organizingScope
        && workgroup.organizingScope !== normalizeOrganizingScope(workgroup.organizingScope, source)) {
        workgroup = { ...workgroup, organizingScope: normalizeOrganizingScope(workgroup.organizingScope, source) };
        workgroups[workgroups.findIndex((row) => row.id === workgroup.id)] = workgroup;
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
            ...(member.crossGroup ? { crossGroup: true, coordinatedBy: member.coordinatedBy || null } : {}),
            createdBy: 'mock-workgroup-migration', createdAt: workgroup.createdAt || new Date(0).toISOString(),
          });
          changed = true;
        }
      }

      const nextSource = source.organizingScope && kind === 'activity' && source.organizingScope !== sourceScope
        ? { ...source, organizingScope: sourceScope }
        : source;
      if (nextSource !== source) changed = true;
      return nextSource.workgroupId === workgroup.id ? nextSource : { ...nextSource, workgroupId: workgroup.id };
    });

    db.workgroups = workgroups;
    db.workgroupMembers = memberships;
    db[sourceKey] = nextRows;
  };

  ensure(db.activities, 'activity');
  ensure(db.taskforces, 'taskforce');
  return changed;
}

// ── 演示成员产出授权种子（2026-10-18；R2-32 2026-10-20 迁移）────────────────────
// 工作组成员身份不自动带来写权限（AuthStore.canDo 走 workgroupGrants）。
// 2400012349 是成员台「专班动态 · 我的产出填报」演示账号；原授权挂在 tf-001，但 tf-001 已按日期
// 收口为 completed（不再可写）⇒ 同批给 active 的 tf-002 补同型授权；tf-001 的旧授权保留为历史。
// 这条种子只补该演示账号在演示专班的 output.submit（deep 模板），不改角色权限矩阵。
export const DEMO_WORKGROUP_GRANTS = Object.freeze([
  {
    id: 'wgg-seed-tf-001-2400012349', branchId: DEFAULT_BRANCH_ID, workgroupId: 'wg-taskforce-tf-001', personId: '2400012349',
    templateKey: 'deep', permissionKeys: ['output.submit', 'task.complete'], status: 'active',
    reason: '演示成员产出登记基线（历史：tf-001 已完成）', grantedBy: '9000000001', grantedAt: '2026-09-01T00:00:00.000Z',
  },
  {
    id: 'wgg-seed-tf-002-2400012349', branchId: DEFAULT_BRANCH_ID, workgroupId: 'wg-taskforce-tf-002', personId: '2400012349',
    templateKey: 'deep', permissionKeys: ['output.submit', 'task.complete'], status: 'active',
    reason: '演示成员产出登记基线（R2-32 后 active 载体＝tf-002）', grantedBy: '9000000001', grantedAt: '2026-10-18T00:00:00.000Z',
  },
]);

/** 幂等补演示工作组成员授权（mock 种子与 server 种子共用同一清单，勿各自手写） */
export function ensureDemoWorkgroupGrants(db) {
  const grants = Array.isArray(db.workgroupGrants) ? [...db.workgroupGrants] : [];
  let changed = false;
  for (const grant of DEMO_WORKGROUP_GRANTS) {
    if (!grants.some((row) => row.id === grant.id)) {
      grants.push({ ...grant, permissionKeys: [...grant.permissionKeys] });
      changed = true;
    }
  }
  db.workgroupGrants = grants;
  return changed;
}

// ── v12：考察对象 ∈ 父工作组成员（单一源）────────────────────────────────
// 模型口径（DATA_MODEL §2.5.1）：`personId` 必须是该考察所挂工作组的成员。
// 旧种子只把活动 `assignments` 里的 organizer/deep 写进工作组，而考察记录常覆盖更多深参同志
// （实测 32/42 不在组）⇒ 不是放宽校验，而是**用考察事实补工作组成员**：某人被记录为
// 该场活动的组织者/深度参与者，本身就是「入组」的业务事实，不新增人员、不编造活动。
const INSPECTION_MEMBER_ROLE = Object.freeze({ organize: 'organizer', deep: 'deep' });

/**
 * 幂等：为每条考察记录补父工作组成员（已存在则跳过；`legacy:true` 无父键不补）。
 * @returns {boolean} 是否有新增成员行
 */
export function ensureInspectionWorkgroupMembers(db, inspections) {
  const rows = Array.isArray(inspections) ? inspections : [];
  const memberships = Array.isArray(db.workgroupMembers) ? [...db.workgroupMembers] : [];
  const workgroups = Array.isArray(db.workgroups) ? db.workgroups : [];
  const byId = new Map(workgroups.map((row) => [String(row.id), row]));
  const byActivity = new Map(workgroups.filter((row) => row.kind === 'activity').map((row) => [String(row.sourceId), row]));
  let changed = false;
  for (const record of rows) {
    if (!record || record.legacy === true) continue;
    const personId = record.personId != null ? String(record.personId) : '';
    if (!personId) continue;
    const workgroup = record.sourceType === 'taskforce'
      ? byId.get(String(record.workgroupId || ''))
      : byActivity.get(String(record.activityId || ''));
    if (!workgroup) continue;
    if (memberships.some((row) => String(row.workgroupId) === String(workgroup.id)
      && String(row.personId) === personId)) continue;
    const role = INSPECTION_MEMBER_ROLE[record.level] || 'deep';
    const id = memberIdFor(workgroup.id, personId);
    if (memberships.some((row) => row.id === id)) continue;
    memberships.push({
      id, branchId: workgroup.branchId || DEFAULT_BRANCH_ID, workgroupId: workgroup.id, personId, role,
      status: 'active', migratedFromLegacy: true, createdBy: 'inspection-seed-sync',
      createdAt: record.recordedAt || workgroup.createdAt || new Date(0).toISOString(),
    });
    changed = true;
  }
  db.workgroupMembers = memberships;
  return changed;
}
