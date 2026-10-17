// 工作组语义 API：工作组、成员、授权、任务、产出与活动应到名单。
// 这些实体不进入 /snapshot；每次写入均在服务端核实支部归属与操作者范围。
import { randomUUID } from 'node:crypto';
import { requireAuth } from '../auth.js';
import { BRANCH_COMMISSION_ROLES, SECRETARY_AND_DEPUTY_ROLES, isActivityEnded, usesFormalMeetingRoster } from '../../../docs/src/core/domain/constants.js';
import { POLICY_DEFAULTS } from '../../../docs/src/core/domain/policy-defaults.js';
import { bumpCollectionVersion } from '../../db.js';
import { CAPABILITY_PACKAGE_BY_ID } from '../../../docs/src/core/domain/capability-packages.js';
import { _assertCapabilityPackageEnabled } from './gates.js';
import { actorBranchId, branchSelectionError } from './branch-scope.js';
import { deriveExpectedRosterIds } from '../../../docs/src/services/activity/attendance-roster.js';
import { isWorkgroupMemberRole, WORKGROUP_MEMBER_ROLES, workgroupMembers } from '../../../docs/src/services/activity/workgroup-members.js';

const COMMITTEE = new Set(BRANCH_COMMISSION_ROLES);
const SECRETARY = new Set(SECRETARY_AND_DEPUTY_ROLES);
const MEMBER_ROLES = new Set(WORKGROUP_MEMBER_ROLES);
export const WORKGROUP_PERMISSION_TEMPLATES = {
  organizer: ['activity.edit', 'activity.signup.manage', 'activity.attendance.record', 'workgroup.members.manage', 'task.manage', 'output.submit'],
  deep: ['activity.view', 'task.complete', 'output.submit'],
};
const WORKGROUP_PERMISSION_KEYS = new Set(Object.values(WORKGROUP_PERMISSION_TEMPLATES).flat());

const jsonRows = (db, table) => db.prepare(`SELECT id, data FROM ${table}`).all().map((r) => ({ id: r.id, ...JSON.parse(r.data) }));
const rowOf = (db, table, id) => {
  const found = db.prepare(`SELECT data FROM ${table} WHERE id = ?`).get(String(id));
  return found ? JSON.parse(found.data) : null;
};
const memberIdentity = (rows) => JSON.stringify((Array.isArray(rows) ? rows : [])
  .map((row) => [String(row?.personId || ''), String(row?.role || '')])
  .sort((left, right) => left[0].localeCompare(right[0]) || left[1].localeCompare(right[1])));
const put = (db, table, row) => db.prepare(`INSERT OR REPLACE INTO ${table} (id, data) VALUES (?, ?)`)
  .run(row.id, JSON.stringify(row));
const ownBranch = (actor) => actor?.branchId || 'br-b1';
const memberBranch = (user) => user?.branchId || 'br-b1';
const isClosedWorkgroup = (workgroup) => ['completed', 'archived', 'dissolved'].includes(workgroup?.status || '');
const closedWorkgroupError = '工作组已结束，成员、授权、任务与产出历史只读保留';
const workgroupIdFor = (kind, sourceId) => `wg-${kind}-${sourceId}`;
const memberIdFor = (workgroupId, personId) => `wgm-${encodeURIComponent(workgroupId)}-${encodeURIComponent(personId)}`;
const isTaskforcePackageEnabled = (db, workgroup) => workgroup?.kind !== 'taskforce'
  || _assertCapabilityPackageEnabled(db, { branchId: workgroup.branchId }, 'taskforce-workgroup');
const isDisabledTaskforceHistory = (db, workgroup) => {
  if (workgroup?.kind !== 'taskforce' || isTaskforcePackageEnabled(db, workgroup)) return false;
  const taskforce = rowOf(db, 'taskforces', workgroup.sourceId);
  return ['completed', 'archived', 'dissolved'].includes(taskforce?.status || '');
};
const isDisabledActivityHistory = (db, activity) => !!activity
  && !_assertCapabilityPackageEnabled(db, { branchId: activity.branchId || 'br-b1' }, 'activity-organization')
  && (isActivityEnded(activity) || activity.status === 'cancelled');

export function grantsRevokedByMembershipRemoval(grants, { workgroupId, personId, removedBy, removedAt }) {
  return (Array.isArray(grants) ? grants : [])
    .filter((grant) => grant.workgroupId === workgroupId && grant.personId === personId && grant.status === 'active')
    .map((grant) => ({
      ...grant, status: 'revoked', revokedBy: removedBy, revokedAt: removedAt,
      revocationReason: 'membership-removed',
    }));
}

function userOf(db, id) { return rowOf(db, 'users', id); }
function groupOf(db, id) { return rowOf(db, 'party_groups', id); }
function activityOf(db, id) { return rowOf(db, 'activities', id); }
function workgroupOf(db, id) { return rowOf(db, 'workgroups', id); }
function membersOf(db, workgroupId) {
  return jsonRows(db, 'workgroup_members').filter((r) => r.workgroupId === workgroupId && r.status !== 'removed');
}
function ensureTaskforcePurposeTask(db, workgroup) {
  if (workgroup?.kind !== 'taskforce') return null;
  const taskforce = rowOf(db, 'taskforces', workgroup.sourceId);
  const title = String(taskforce?.task || '').trim();
  if (!taskforce || !title) return null;
  const id = `wgt-purpose-${taskforce.id}`;
  const existing = rowOf(db, 'workgroup_tasks', id);
  if (existing) return existing;
  const row = {
    id, branchId: workgroup.branchId, workgroupId: workgroup.id, title,
    status: 'open', isPurpose: true, migratedFrom: 'taskforce.task',
    createdBy: taskforce.createdBy || workgroup.createdBy || null,
    createdAt: taskforce.createdAt || workgroup.createdAt || new Date().toISOString(),
  };
  const save = db.transaction(() => {
    put(db, 'workgroup_tasks', row);
    bumpCollectionVersion(db, 'workgroup_tasks');
  });
  save();
  return row;
}

function taskforceClosureDeny(db, taskforce) {
  const workgroup = rowOf(db, 'workgroups', taskforce?.workgroupId || `wg-taskforce-${taskforce?.id}`);
  if (!workgroup || workgroup.branchId !== (taskforce?.branchId || 'br-b1')) {
    return { error: '工作组主记录缺失或支部归属不一致，已阻止收尾' };
  }
  ensureTaskforcePurposeTask(db, workgroup);
  const tasks = jsonRows(db, 'workgroup_tasks').filter((row) => row.workgroupId === workgroup.id);
  if (tasks.length === 0) return { error: '工作组尚无已登记任务；请先核对并登记主任务，再办理收尾' };
  const unfinished = tasks.filter((row) => !['completed', 'cancelled'].includes(row.status));
  if (unfinished.length > 0) return { error: `任务尚未闭合（${unfinished.length} 项）`, openTaskIds: unfinished.map((row) => row.id) };
  const outputs = jsonRows(db, 'workgroup_outputs').filter((row) => row.workgroupId === workgroup.id);
  const unfinishedOutputs = outputs.filter((row) => !['submitted', 'accepted', 'archived'].includes(row.status));
  if (unfinishedOutputs.length > 0) return { error: `产出尚未完成登记（${unfinishedOutputs.length} 项）`, openOutputIds: unfinishedOutputs.map((row) => row.id) };
  return null;
}

function isApprovedDissolution(previous, next) {
  const previousDecisions = Array.isArray(previous?.committeeDecision) ? previous.committeeDecision : [];
  const nextDecisions = Array.isArray(next?.committeeDecision) ? next.committeeDecision : [];
  const decision = nextDecisions.at(-1);
  return previous?.status === 'active'
    && previous.committeeRequest?.kind === 'dissolve'
    && previous.committeeRequest?.status === 'pending'
    && next?.status === 'dissolved'
    && next.committeeRequest == null
    && nextDecisions.length === previousDecisions.length + 1
    && decision?.kind === 'dissolve'
    && decision?.decision === 'approved'
    && !!decision?.decisionRef;
}

export function approvedTaskforceDissolutionWorkgroups(db, payload, actor) {
  if (!Array.isArray(payload?.taskforces)) return [];
  const current = new Map(jsonRows(db, 'taskforces').map((row) => [String(row.id), row]));
  const updates = [];
  for (const next of payload.taskforces) {
    const previous = next?.id ? current.get(String(next.id)) : null;
    if (!isApprovedDissolution(previous, next)) continue;
    const workgroup = rowOf(db, 'workgroups', previous.workgroupId || `wg-taskforce-${previous.id}`);
    if (!workgroup) continue; // snapshotScopeDeny rejects the missing-parent case before this helper is called.
    const decision = next.committeeDecision.at(-1);
    updates.push({
      ...workgroup, status: 'dissolved', updatedBy: actor?.id || null,
      updatedAt: decision.at || new Date().toISOString(),
    });
  }
  return updates;
}

export function hasWorkgroupPermission(db, workgroupId, personId, permissionKey) {
  const member = workgroupMembers(membersOf(db, workgroupId)).some((row) => row.personId === personId);
  const workgroup = workgroupOf(db, workgroupId);
  return !!workgroup && ['active', 'recruiting'].includes(workgroup.status) && member && jsonRows(db, 'workgroup_grants').some((grant) => grant.workgroupId === workgroupId
    && grant.personId === personId && grant.status === 'active'
    && Array.isArray(grant.permissionKeys) && grant.permissionKeys.includes(permissionKey));
}

export function canManageWorkgroup(db, actor, workgroup) {
  if (!actor || !workgroup || !workgroup.branchId || ownBranch(actor) !== workgroup.branchId) return false;
  if (SECRETARY.has(actor.role)) return true;
  if (workgroup.kind === 'taskforce') return actor.role === 'org-commissioner';
  if (workgroup.kind !== 'activity') return false;
  if (actor.role === 'leader' && workgroup.organizingScope === 'party-group') {
    const group = groupOf(db, workgroup.hostGroupId);
    return !!group && group.branchId === workgroup.branchId && group.status === 'active' && actor.partyGroup === group.name;
  }
  return false;
}

export function activityCreationDeny(db, actor, body) {
  if (!actor) return '活动创建者不存在';
  const branchId = ownBranch(actor);
  // 书记/副书记创建活动时，缺省承办范围确定为跨组；支部组内活动仍须由组长明确提交所属党小组。
  const organizingScope = body.organizingScope || (SECRETARY.has(actor.role) ? 'cross-group' : '');
  if (body.branchId && body.branchId !== branchId) return '无权限：不能为其他支部创建活动';
  if (body.type === '党小组会' && organizingScope !== 'party-group') return '党小组会必须由所属党小组承办';
  if (organizingScope === 'party-group') {
    const group = body.hostGroupId && groupOf(db, body.hostGroupId);
    if (actor.role !== 'leader' || !group || group.status !== 'active' || group.branchId !== branchId || group.name !== actor.partyGroup) {
      return '无权限：组内承办活动须由本党小组组长从组长工作台创建';
    }
    return null;
  }
  if (organizingScope === 'cross-group') {
    if (!SECRETARY.has(actor.role)) return '无权限：跨组承办活动须由支书或副书记创建';
    if (body.hostGroupId) return '跨组承办活动不能指定单一承办党小组';
    return null;
  }
  return '活动必须明确承办范围：组内承办或跨组承办';
}

export function activityOperationAllowed(db, actor, activity, permissionKey = 'activity.edit') {
  if (!actor || !activity || ownBranch(actor) !== (activity.branchId || 'br-b1')) return false;
  if (SECRETARY.has(actor.role)) return true;
  const workgroupId = activity.workgroupId || workgroupIdFor('activity', activity.id);
  if (hasWorkgroupPermission(db, workgroupId, actor.id, permissionKey)) return true;
  const group = activity.hostGroupId && groupOf(db, activity.hostGroupId);
  return actor.role === 'leader' && activity.organizingScope === 'party-group'
    && !!group && group.branchId === ownBranch(actor) && actor.partyGroup === group.name;
}

export function attendanceOperationAllowed(db, actor, activity, personId) {
  if (!actor || !activity || ownBranch(actor) !== (activity.branchId || 'br-b1')) return false;
  const person = userOf(db, personId);
  if (!person || memberBranch(person) !== (activity.branchId || 'br-b1')) return false;
  if (POLICY_DEFAULTS.attendance.noAttendanceTypes.includes(activity.type)) return false;
  if (POLICY_DEFAULTS.attendance.uploaderExceptions.secretaryDeputy.includes(actor.role)) return true;
  const workgroupId = activity.workgroupId || workgroupIdFor('activity', activity.id);
  if (hasWorkgroupPermission(db, workgroupId, actor.id, 'activity.attendance.record')) return true;
  const group = activity.hostGroupId && groupOf(db, activity.hostGroupId);
  const policyRoles = POLICY_DEFAULTS.attendance.recorderByType[activity.type] || [];
  const isHostGroupLeader = actor.role === 'leader'
    && !!group && group.branchId === ownBranch(actor) && actor.partyGroup === group.name;
  const isActivityOrganizer = activity.organizer === actor.id
    || (Array.isArray(activity.assignments)
      && activity.assignments.some((item) => item?.personId === actor.id && item.role === 'organizer'));

  if (activity.type === '党小组会') return isHostGroupLeader || isActivityOrganizer;
  if (policyRoles.length > 0) return policyRoles.includes(actor.role);
  return isActivityOrganizer;
}

export function attendanceWriteDeny(db, actor, attendance) {
  const activity = attendance?.activityId && activityOf(db, attendance.activityId);
  if (!activity) return { status: 400, error: '活动考勤必须关联已存在的活动' };
  if (!attendanceOperationAllowed(db, actor, activity, attendance.personId)) return { status: 403, error: '无权限：当前账号不能为该支部或活动登记此人员考勤' };
  if (!['present', 'absent', 'leave', 'made_up'].includes(attendance.status)) return { status: 400, error: '考勤状态无效' };
  return null;
}

export function snapshotScopeDeny(db, payload, actor) {
  if (['users', 'branches'].some((key) => Object.prototype.hasOwnProperty.call(payload, key))) {
    return '无权限：成员与支部治理记录须走专用语义接口，不能通过整库快照写入';
  }
  const protectedKeys = ['workgroups', 'workgroupMembers', 'workgroupGrants', 'workgroupTasks', 'workgroupOutputs', 'attendanceRosters'];
  if (protectedKeys.some((key) => Object.prototype.hasOwnProperty.call(payload, key))) {
    return '无权限：工作组关系、授权与应到名单须走各自的语义 API，不能通过整库快照写入';
  }
  if (Array.isArray(payload.periodicArchives)) {
    const branchId = ownBranch(actor);
    const current = new Map(jsonRows(db, 'periodic_archive_submissions').map((row) => [String(row.id), row]));
    const incomingIds = new Set();
    for (const row of payload.periodicArchives) {
      if (!row?.id || !row.branchId) return '周期归档写入必须包含记录 ID 与支部归属';
      if (incomingIds.has(String(row.id))) return '周期归档快照中记录 ID 不得重复';
      const previous = current.get(String(row.id));
      if (row.branchId !== branchId) {
        if (previous && previous.branchId === row.branchId && JSON.stringify(previous) === JSON.stringify(row)) {
          incomingIds.add(String(row.id));
          continue;
        }
        return '无权限：周期归档只能写入当前支部记录';
      }
      if (previous && (previous.branchId || 'br-b1') !== branchId) return '无权限：不能跨支部修改周期归档';
      incomingIds.add(String(row.id));
    }
  }
  if (Array.isArray(payload.taskforces)) {
    const current = new Map(jsonRows(db, 'taskforces').map((row) => [String(row.id), row]));
    const incomingIds = new Set(payload.taskforces.filter((row) => row?.id).map((row) => String(row.id)));
    const terminalStatuses = new Set(['completed', 'archived', 'dissolved']);
    for (const next of payload.taskforces) {
      if (!next?.id) continue;
      const previous = current.get(String(next.id));
      if (!previous) return '无权限：新增工作组须走语义创建接口，以同时建立工作组、成员与主任务';
      if ((next.branchId || 'br-b1') !== (previous.branchId || 'br-b1')) return '无权限：工作组支部归属创建后不可修改';
      if (JSON.stringify(previous) !== JSON.stringify(next) && (previous.branchId || 'br-b1') !== ownBranch(actor)) return '无权限：不能通过快照修改其他支部工作组';
      if ((next.workgroupId || `wg-taskforce-${next.id}`) !== (previous.workgroupId || `wg-taskforce-${previous.id}`)) return '无权限：工作组关联创建后不可修改';
      if (memberIdentity(previous.members) !== memberIdentity(next.members)) return '无权限：工作组成员须走成员语义接口调整';
      const transitionedToTerminal = terminalStatuses.has(next.status) && (!previous || previous.status !== next.status);
      if (!transitionedToTerminal) continue;
      const approvedDissolution = isApprovedDissolution(previous, next);
      if (!approvedDissolution) return '无权限：工作组结束状态不能通过快照变更，须走工作组收尾接口或已排入的表决结论';
      if (!actor || !['org-commissioner', 'secretary', 'deputy-secretary'].includes(actor.role)) {
        return '无权限：当前角色不能确认工作组收尾';
      }
      if ((previous.branchId || 'br-b1') !== ownBranch(actor)) return '无权限：不能跨支部结束工作组';
      const closureDeny = taskforceClosureDeny(db, previous);
      if (closureDeny) return `工作组尚未闭合，不能生效表决结论：${closureDeny.error}`;
    }
    for (const id of current.keys()) {
      if (!incomingIds.has(id)) return '无权限：工作组记录须保留；请使用撤销并留痕，不得经快照物理删除';
    }
  }
  if (Array.isArray(payload.activities)) {
    const incoming = new Map(payload.activities.filter((row) => row?.id).map((row) => [String(row.id), row]));
    const current = new Map(jsonRows(db, 'activities').map((row) => [String(row.id), row]));
    for (const [id, row] of incoming) {
      const old = current.get(id);
      if (!old) return '无权限：新增活动须走活动语义写入口，以同时建立活动工作组';
      if (memberIdentity(old.assignments) !== memberIdentity(row.assignments)) {
        return '无权限：工作组成员关系须走 /workgroups/:id/members 语义接口调整';
      }
      if ((row.workgroupId || `wg-activity-${id}`) !== (old.workgroupId || `wg-activity-${id}`)) return '无权限：活动工作组关联创建后不可修改';
      if ((row.organizingScope || '') !== (old.organizingScope || '') || (row.hostGroupId || null) !== (old.hostGroupId || null)) {
        return '无权限：活动承办范围与党小组归属创建后不可修改';
      }
      const changed = JSON.stringify(old) !== JSON.stringify(row);
      if (changed && isDisabledActivityHistory(db, old)) return '无权限：本支部已停用活动组织能力，已结束活动只读保留';
      if (changed && !activityOperationAllowed(db, actor, old)) return '无权限：不能通过快照修改其他范围的活动';
      if (row.branchId && row.branchId !== (old.branchId || 'br-b1')) return '无权限：活动支部归属创建后不可修改';
    }
    for (const id of current.keys()) {
      if (!incoming.has(id)) return '无权限：活动物理删除须走级联删除接口';
    }
  }
  if (Array.isArray(payload.attendances)) {
    const incoming = payload.attendances;
    const pairKeys = new Set();
    for (const row of incoming) {
      const key = `${row?.activityId || ''}\u0000${row?.personId || ''}`;
      if (!row?.activityId || !row?.personId || pairKeys.has(key)) return '考勤快照中活动与人员必须唯一对应';
      pairKeys.add(key);
    }
    const current = new Map(db.prepare('SELECT id, data FROM attendances').all().map((r) => [r.id, JSON.parse(r.data)]));
    const next = new Map(incoming.filter((row) => row?.id).map((row) => [String(row.id), row]));
    for (const [id, row] of next) {
      const old = current.get(id);
      const changed = !old || JSON.stringify(old) !== JSON.stringify(row);
      if (!changed) continue;
      if (isDisabledActivityHistory(db, activityOf(db, row.activityId))) return '无权限：本支部已停用活动组织能力，已结束活动的考勤只读保留';
      if (old && old.recordedBy !== row.recordedBy) return '无权限：考勤记录人留痕不可通过快照修改';
      if (!old && row.recordedBy && row.recordedBy !== actor.id) return '无权限：不能伪造考勤记录人';
      const deny = attendanceWriteDeny(db, actor, row);
      if (deny) return deny.error;
    }
    for (const [id, row] of current) {
      if (next.has(id)) continue;
      if (isDisabledActivityHistory(db, activityOf(db, row.activityId))) return '无权限：本支部已停用活动组织能力，已结束活动的考勤只读保留';
      const deny = attendanceWriteDeny(db, actor, row);
      if (deny) return `无权限：不能删除该考勤记录（${deny.error}）`;
    }
  }
  return null;
}

function validAssignments(db, actor, assignments, { allowFormalRoster = false } = {}) {
  if (!Array.isArray(assignments)) return { ok: true, value: [] };
  const seen = new Set();
  const rows = [];
  for (const item of assignments) {
    const roleAllowed = isWorkgroupMemberRole(item?.role) || (allowFormalRoster && item?.role === 'participant');
    if (!item || !item.personId || !roleAllowed) return { ok: false, status: 400, error: '工作组成员须包含有效 personId 与 organizer/deep 身份' };
    const personId = String(item.personId);
    if (seen.has(personId)) return { ok: false, status: 400, error: '同一人员只能登记一次工作组身份' };
    seen.add(personId);
    const user = userOf(db, personId);
    if (!user) return { ok: false, status: 400, error: `工作组成员不存在：${personId}` };
    if (memberBranch(user) !== ownBranch(actor)) return { ok: false, status: 403, error: '无权限：工作组成员须属于同一支部' };
    rows.push({ personId, role: item.role });
  }
  return { ok: true, value: rows };
}

export function createActivityWorkgroup(db, actor, activity) {
  const id = workgroupIdFor('activity', activity.id);
  const workgroup = {
    id, branchId: activity.branchId, kind: 'activity', sourceType: 'activity', sourceId: activity.id,
    name: activity.title || activity.id, status: 'active', organizingScope: activity.organizingScope,
    hostGroupId: activity.hostGroupId || null, createdBy: actor.id, createdAt: activity.createdAt || new Date().toISOString(),
    migrationState: 'ready',
  };
  const assignmentRows = Array.isArray(activity.assignments) ? activity.assignments : [];
  const formalRoster = usesFormalMeetingRoster(activity);
  if (!formalRoster && assignmentRows.some((row) => row?.role === 'participant')) {
    return { ok: false, status: 400, error: '活动普通参与者请通过报名登记，不能写入工作组成员' };
  }
  const membership = validAssignments(db, actor, assignmentRows, { allowFormalRoster: formalRoster });
  if (!membership.ok) return membership;
  const members = workgroupMembers(membership.value);
  const run = db.transaction(() => {
    put(db, 'activities', activity);
    put(db, 'workgroups', workgroup);
    for (const member of members) {
      const row = {
        id: memberIdFor(id, member.personId), branchId: activity.branchId, workgroupId: id,
        personId: member.personId, role: member.role, status: 'active',
        createdBy: actor.id, createdAt: workgroup.createdAt,
      };
      put(db, 'workgroup_members', row);
    }
  });
  run();
  return { ok: true, workgroup };
}

export function createTaskforceWorkgroup(db, actor, taskforce) {
  const id = workgroupIdFor('taskforce', taskforce.id);
  const workgroup = {
    id, branchId: ownBranch(actor), kind: 'taskforce', sourceType: 'taskforce', sourceId: taskforce.id,
    name: taskforce.name || taskforce.id, status: taskforce.status || 'active',
    createdBy: actor.id, createdAt: taskforce.createdAt || new Date().toISOString(), migrationState: 'ready',
  };
  const membership = validAssignments(db, actor, taskforce.members || []);
  if (!membership.ok) return membership;
  const run = db.transaction(() => {
    put(db, 'taskforces', taskforce);
    put(db, 'workgroups', workgroup);
    for (const member of membership.value) {
      put(db, 'workgroup_members', {
        id: memberIdFor(id, member.personId), branchId: workgroup.branchId, workgroupId: id,
        personId: member.personId, role: member.role, status: 'active',
        createdBy: actor.id, createdAt: workgroup.createdAt,
      });
    }
    const purpose = String(taskforce.task || '').trim();
    if (purpose) put(db, 'workgroup_tasks', {
      id: `wgt-purpose-${taskforce.id}`, branchId: workgroup.branchId, workgroupId: id,
      title: purpose, status: 'open', isPurpose: true,
      createdBy: actor.id, createdAt: workgroup.createdAt,
    });
    if (purpose) bumpCollectionVersion(db, 'workgroup_tasks');
  });
  run();
  return { ok: true, workgroup };
}

export function registerWorkgroupRoutes(router, db) {
  router.get('/workgroups', requireAuth(db), (req, res) => {
    const deny = branchSelectionError(req.actor, req.query.branchId);
    if (deny) return res.status(403).json({ error: deny });
    const branchId = actorBranchId(req.actor) || req.query.branchId || null;
    const rows = jsonRows(db, 'workgroups').filter((row) => !branchId || row.branchId === branchId);
    res.json(rows);
  });
  router.get('/workgroup-members', requireAuth(db), (req, res) => {
    const deny = branchSelectionError(req.actor, req.query.branchId);
    if (deny) return res.status(403).json({ error: deny });
    const branchId = actorBranchId(req.actor) || req.query.branchId || null;
    res.json(jsonRows(db, 'workgroup_members').filter((row) => (!branchId || row.branchId === branchId) && row.status !== 'removed'));
  });
  router.get('/workgroup-grants', requireAuth(db), (req, res) => {
    res.json(jsonRows(db, 'workgroup_grants').filter((row) => row.personId === req.actor.id && row.status === 'active'));
  });
  router.get('/workgroups/:id/members', requireAuth(db), (req, res) => {
    const workgroup = workgroupOf(db, req.params.id);
    if (!workgroup) return res.status(404).json({ error: '工作组不存在' });
    if (ownBranch(req.actor) !== workgroup.branchId && req.actor.role !== 'party-staff') return res.status(403).json({ error: '无权限：工作组不属于当前支部' });
    res.json(membersOf(db, workgroup.id));
  });
  router.post('/workgroups/:id/members', requireAuth(db), (req, res) => {
    const workgroup = workgroupOf(db, req.params.id);
    if (!workgroup) return res.status(404).json({ error: '工作组不存在' });
    if (!canManageWorkgroup(db, req.actor, workgroup) && !hasWorkgroupPermission(db, workgroup.id, req.actor.id, 'workgroup.members.manage')) return res.status(403).json({ error: '无权限：当前角色不能调整该工作组成员' });
    if (isClosedWorkgroup(workgroup)) return res.status(409).json({ error: closedWorkgroupError });
    if (isDisabledTaskforceHistory(db, workgroup)) return res.status(409).json({ error: '本支部已停用专班工作组；历史成员记录只读保留' });
    const body = req.body && typeof req.body === 'object' && !Array.isArray(req.body) ? req.body : {};
    const personId = String(body.personId || '');
    if (!personId || !MEMBER_ROLES.has(body.role)) return res.status(400).json({ error: '工作组只登记组织者或深度参与者；普通参与者请走活动报名' });
    const person = userOf(db, personId);
    if (!person) return res.status(400).json({ error: '工作组成员不存在' });
    if (memberBranch(person) !== workgroup.branchId) return res.status(403).json({ error: '无权限：工作组成员须属于同一支部' });
    const id = memberIdFor(workgroup.id, personId);
    const previous = rowOf(db, 'workgroup_members', id);
    const row = {
      id, branchId: workgroup.branchId, workgroupId: workgroup.id, personId, role: body.role,
      status: 'active', createdBy: previous?.createdBy || req.actor.id,
      createdAt: previous?.createdAt || new Date().toISOString(), updatedBy: req.actor.id, updatedAt: new Date().toISOString(),
    };
    const sourceTable = workgroup.sourceType === 'activity' ? 'activities' : 'taskforces';
    const source = rowOf(db, sourceTable, workgroup.sourceId);
    if (!source) return res.status(409).json({ error: '工作组所属业务记录不存在' });
    if (workgroup.kind === 'activity') {
      const assignments = (Array.isArray(source.assignments) ? source.assignments : [])
        .filter((item) => item.personId !== personId || !isWorkgroupMemberRole(item.role));
      assignments.push({ personId, role: body.role });
      source.assignments = assignments;
    } else {
      const members = (Array.isArray(source.members) ? source.members : []).filter((item) => item.personId !== personId);
      members.push({ personId, role: body.role, contributions: previous?.contributions || [] });
      source.members = members;
    }
    const collection = workgroup.sourceType === 'activity' ? 'activities' : 'taskforces';
    const table = sourceTable;
    const run = db.transaction(() => {
      put(db, 'workgroup_members', row);
      put(db, table, source);
      bumpCollectionVersion(db, collection);
    });
    run();
    res.status(previous ? 200 : 201).json(row);
  });
  router.delete('/workgroups/:id/members/:personId', requireAuth(db), (req, res) => {
    const workgroup = workgroupOf(db, req.params.id);
    if (!workgroup) return res.status(404).json({ error: '工作组不存在' });
    if (!canManageWorkgroup(db, req.actor, workgroup) && !hasWorkgroupPermission(db, workgroup.id, req.actor.id, 'workgroup.members.manage')) return res.status(403).json({ error: '无权限：当前角色不能调整该工作组成员' });
    if (isClosedWorkgroup(workgroup)) return res.status(409).json({ error: closedWorkgroupError });
    if (isDisabledTaskforceHistory(db, workgroup)) return res.status(409).json({ error: '本支部已停用专班工作组；历史成员记录只读保留' });
    const id = memberIdFor(workgroup.id, String(req.params.personId));
    const current = rowOf(db, 'workgroup_members', id);
    if (!current) return res.status(404).json({ error: '工作组成员不存在' });
    const sourceTable = workgroup.sourceType === 'activity' ? 'activities' : 'taskforces';
    const source = rowOf(db, sourceTable, workgroup.sourceId);
    if (!source) return res.status(409).json({ error: '工作组所属业务记录不存在' });
    const collection = workgroup.sourceType === 'activity' ? 'activities' : 'taskforces';
    const sourceMembers = workgroup.kind === 'activity'
      ? (Array.isArray(source.assignments) ? source.assignments : [])
      : (Array.isArray(source.members) ? source.members : []);
    if (workgroup.kind === 'activity') {
      source.assignments = sourceMembers.filter((item) => item.personId !== current.personId || !isWorkgroupMemberRole(item.role));
      source.organizer = source.assignments.find((item) => item.role === 'organizer')?.personId || null;
    } else {
      source.members = sourceMembers.filter((item) => item.personId !== current.personId);
    }
    const removedAt = new Date().toISOString();
    const memberGrants = grantsRevokedByMembershipRemoval(jsonRows(db, 'workgroup_grants'), {
      workgroupId: workgroup.id, personId: current.personId, removedBy: req.actor.id, removedAt,
    });
    const run = db.transaction(() => {
      put(db, 'workgroup_members', { ...current, status: 'removed', removedBy: req.actor.id, removedAt });
      for (const grant of memberGrants) put(db, 'workgroup_grants', grant);
      put(db, sourceTable, source);
      bumpCollectionVersion(db, collection);
      if (memberGrants.length > 0) bumpCollectionVersion(db, 'workgroup_grants');
    });
    run();
    res.status(204).end();
  });
  router.get('/workgroups/:id/grants', requireAuth(db), (req, res) => {
    const workgroup = workgroupOf(db, req.params.id);
    if (!workgroup) return res.status(404).json({ error: '工作组不存在' });
    if (!canManageWorkgroup(db, req.actor, workgroup) && req.actor.role !== 'party-staff') return res.status(403).json({ error: '无权限：不能查看该工作组的授权留痕' });
    res.json(jsonRows(db, 'workgroup_grants').filter((row) => row.workgroupId === workgroup.id));
  });
  router.post('/workgroups/:id/grants', requireAuth(db), (req, res) => {
    const workgroup = workgroupOf(db, req.params.id);
    if (!workgroup) return res.status(404).json({ error: '工作组不存在' });
    if (!canManageWorkgroup(db, req.actor, workgroup)) return res.status(403).json({ error: '无权限：当前角色不能授予该工作组权限' });
    if (isClosedWorkgroup(workgroup)) return res.status(409).json({ error: closedWorkgroupError });
    if (isDisabledTaskforceHistory(db, workgroup)) return res.status(409).json({ error: '本支部已停用专班工作组；历史授权记录只读保留' });
    const body = req.body && typeof req.body === 'object' && !Array.isArray(req.body) ? req.body : {};
    const personId = String(body.personId || '');
    const member = workgroupMembers(membersOf(db, workgroup.id)).find((row) => row.personId === personId);
    if (!member) return res.status(400).json({ error: '权限对象须先登记为该工作组成员' });
    const templateKey = typeof body.templateKey === 'string' ? body.templateKey : '';
    const suggested = WORKGROUP_PERMISSION_TEMPLATES[templateKey] || [];
    const permissionKeys = body.permissionKeys === undefined ? [...suggested] : body.permissionKeys;
    if (!Array.isArray(permissionKeys) || permissionKeys.some((key) => !WORKGROUP_PERMISSION_KEYS.has(key))) {
      return res.status(400).json({ error: '权限项无效' });
    }
    const row = {
      id: `wgg-${randomUUID().slice(0, 12)}`, branchId: workgroup.branchId,
      workgroupId: workgroup.id, personId, templateKey: templateKey || null,
      permissionKeys: [...new Set(permissionKeys)], status: 'active', reason: String(body.reason || '').trim(),
      grantedBy: req.actor.id, grantedAt: new Date().toISOString(),
    };
    put(db, 'workgroup_grants', row);
    res.status(201).json(row);
  });
  router.post('/workgroups/:id/grants/:grantId/revoke', requireAuth(db), (req, res) => {
    const workgroup = workgroupOf(db, req.params.id);
    const current = rowOf(db, 'workgroup_grants', req.params.grantId);
    if (!workgroup || !current || current.workgroupId !== workgroup.id) return res.status(404).json({ error: '授权记录不存在' });
    if (!canManageWorkgroup(db, req.actor, workgroup)) return res.status(403).json({ error: '无权限：当前角色不能撤回该工作组授权' });
    if (isClosedWorkgroup(workgroup)) return res.status(409).json({ error: closedWorkgroupError });
    if (current.status === 'revoked') return res.json(current);
    const next = { ...current, status: 'revoked', revokedBy: req.actor.id, revokedAt: new Date().toISOString() };
    put(db, 'workgroup_grants', next);
    res.json(next);
  });
  router.get('/workgroups/:id/tasks', requireAuth(db), (req, res) => {
    const workgroup = workgroupOf(db, req.params.id);
    if (!workgroup) return res.status(404).json({ error: '工作组不存在' });
    if (workgroup.branchId !== ownBranch(req.actor) && req.actor.role !== 'party-staff') return res.status(403).json({ error: '无权限：工作组不属于当前支部' });
    ensureTaskforcePurposeTask(db, workgroup); // 兼容旧专班：把原任务字段幂等迁移为可闭合的主任务
    res.json(jsonRows(db, 'workgroup_tasks').filter((row) => row.workgroupId === workgroup.id));
  });
  router.post('/workgroups/:id/tasks', requireAuth(db), (req, res) => {
    const workgroup = workgroupOf(db, req.params.id);
    if (!workgroup) return res.status(404).json({ error: '工作组不存在' });
    if (!canManageWorkgroup(db, req.actor, workgroup) && !hasWorkgroupPermission(db, workgroup.id, req.actor.id, 'task.manage')) return res.status(403).json({ error: '无权限：不能在该工作组新增任务' });
    if (isClosedWorkgroup(workgroup)) return res.status(409).json({ error: closedWorkgroupError });
    const body = req.body && typeof req.body === 'object' && !Array.isArray(req.body) ? req.body : {};
    const title = typeof body.title === 'string' ? body.title.trim() : '';
    if (!title) return res.status(400).json({ error: '任务标题不能为空' });
    const workgroupTasks = jsonRows(db, 'workgroup_tasks').filter((row) => row.workgroupId === workgroup.id);
    const taskforce = workgroup.kind === 'taskforce' ? rowOf(db, 'taskforces', workgroup.sourceId) : null;
    const purposeRepair = workgroup.kind === 'taskforce' && body.isPurpose === true
      && workgroupTasks.length === 0 && !String(taskforce?.task || '').trim();
    if (body.isPurpose === true && !purposeRepair) return res.status(400).json({ error: '主任务只能在旧工作组尚无任务记录时，经人工核对后补登记一次' });
    if (!isTaskforcePackageEnabled(db, workgroup) && !purposeRepair) return res.status(409).json({ error: '本支部已停用专班工作组；在办任务可继续完成，不能新增任务' });
    if (body.capabilityPackageId && !CAPABILITY_PACKAGE_BY_ID.has(String(body.capabilityPackageId))) {
      return res.status(400).json({ error: '任务关联的业务能力包不存在' });
    }
    if (body.activityId) {
      const activity = activityOf(db, body.activityId);
      if (!activity || (activity.branchId || 'br-b1') !== workgroup.branchId) return res.status(403).json({ error: '无权限：任务关联活动须属于同一支部' });
    }
    const id = body.id ? String(body.id) : `wgt-${randomUUID().slice(0, 12)}`;
    if (rowOf(db, 'workgroup_tasks', id)) return res.status(409).json({ error: '任务记录 id 已存在' });
    const row = {
      id, branchId: workgroup.branchId,
      workgroupId: workgroup.id, title, status: 'open', activityId: body.activityId || null,
      capabilityPackageId: body.capabilityPackageId || null, ...(purposeRepair ? { isPurpose: true, migrationState: 'manually-verified' } : null),
      createdBy: req.actor.id, createdAt: new Date().toISOString(),
    };
    put(db, 'workgroup_tasks', row);
    bumpCollectionVersion(db, 'workgroup_tasks');
    res.status(201).json(row);
  });
  router.patch('/workgroups/:id/tasks/:taskId', requireAuth(db), (req, res) => {
    const workgroup = workgroupOf(db, req.params.id);
    const task = rowOf(db, 'workgroup_tasks', req.params.taskId);
    if (!workgroup || !task || task.workgroupId !== workgroup.id) return res.status(404).json({ error: '工作组任务不存在' });
    if (task.branchId !== workgroup.branchId || ownBranch(req.actor) !== workgroup.branchId) {
      return res.status(403).json({ error: '无权限：任务与当前支部不一致' });
    }
    if (isClosedWorkgroup(workgroup)) return res.status(409).json({ error: closedWorkgroupError });
    if (!canManageWorkgroup(db, req.actor, workgroup) && !hasWorkgroupPermission(db, workgroup.id, req.actor.id, 'task.complete')) {
      return res.status(403).json({ error: '无权限：不能更新该工作组任务' });
    }
    const body = req.body && typeof req.body === 'object' && !Array.isArray(req.body) ? req.body : {};
    if (!['in_progress', 'completed', 'cancelled'].includes(body.status)) return res.status(400).json({ error: '任务状态只能更新为进行中、已完成或已取消' });
    const allowed = task.status === 'open' ? ['in_progress', 'completed', 'cancelled']
      : task.status === 'in_progress' ? ['completed', 'cancelled'] : [];
    if (!allowed.includes(body.status)) return res.status(409).json({ error: '任务已闭合或状态流转不允许' });
    const at = new Date().toISOString();
    const next = {
      ...task, status: body.status, updatedBy: req.actor.id, updatedAt: at,
      ...(body.status === 'completed' ? { completedBy: req.actor.id, completedAt: at } : null),
      ...(body.status === 'cancelled' ? { cancelledBy: req.actor.id, cancelledAt: at, cancellationNote: String(body.note || '').trim() } : null),
    };
    put(db, 'workgroup_tasks', next);
    bumpCollectionVersion(db, 'workgroup_tasks');
    res.json(next);
  });
  router.get('/workgroups/:id/outputs', requireAuth(db), (req, res) => {
    const workgroup = workgroupOf(db, req.params.id);
    if (!workgroup) return res.status(404).json({ error: '工作组不存在' });
    if (workgroup.branchId !== ownBranch(req.actor) && req.actor.role !== 'party-staff') return res.status(403).json({ error: '无权限：工作组不属于当前支部' });
    res.json(jsonRows(db, 'workgroup_outputs').filter((row) => row.workgroupId === workgroup.id));
  });
  router.post('/workgroups/:id/outputs', requireAuth(db), (req, res) => {
    const workgroup = workgroupOf(db, req.params.id);
    if (!workgroup) return res.status(404).json({ error: '工作组不存在' });
    if (!canManageWorkgroup(db, req.actor, workgroup) && !hasWorkgroupPermission(db, workgroup.id, req.actor.id, 'output.submit')) return res.status(403).json({ error: '无权限：不能向该工作组提交产出' });
    if (isClosedWorkgroup(workgroup)) return res.status(409).json({ error: closedWorkgroupError });
    const body = req.body && typeof req.body === 'object' && !Array.isArray(req.body) ? req.body : {};
    const title = typeof body.title === 'string' ? body.title.trim() : '';
    if (!title) return res.status(400).json({ error: '产出标题不能为空' });
    if (body.capabilityPackageId && !CAPABILITY_PACKAGE_BY_ID.has(String(body.capabilityPackageId))) {
      return res.status(400).json({ error: '产出关联的业务能力包不存在' });
    }
    if (isDisabledTaskforceHistory(db, workgroup)) return res.status(409).json({ error: '本支部已停用专班工作组；历史产出只读保留' });
    if (body.taskId) {
      const task = rowOf(db, 'workgroup_tasks', body.taskId);
      if (!task || task.workgroupId !== workgroup.id || task.branchId !== workgroup.branchId) return res.status(403).json({ error: '无权限：产出所关联任务不属于该工作组' });
      if (!isTaskforcePackageEnabled(db, workgroup) && !['open', 'in_progress'].includes(task.status)) {
        return res.status(409).json({ error: '本支部已停用专班工作组；只能为尚未闭合的在办任务登记收尾产出' });
      }
    }
    if (!isTaskforcePackageEnabled(db, workgroup) && !body.taskId) return res.status(409).json({ error: '本支部已停用专班工作组；收尾产出须关联尚未闭合的在办任务' });
    if (body.activityId) {
      const activity = activityOf(db, body.activityId);
      if (!activity || (activity.branchId || 'br-b1') !== workgroup.branchId) return res.status(403).json({ error: '无权限：产出关联活动须属于同一支部' });
    }
    const id = body.id ? String(body.id) : `wgo-${randomUUID().slice(0, 12)}`;
    if (rowOf(db, 'workgroup_outputs', id)) return res.status(409).json({ error: '产出记录 id 已存在' });
    const row = {
      id, branchId: workgroup.branchId,
      workgroupId: workgroup.id, taskId: body.taskId || null, activityId: body.activityId || null,
      capabilityPackageId: body.capabilityPackageId || null, title, description: String(body.description || ''),
      submittedBy: req.actor.id, submittedAt: new Date().toISOString(), status: 'submitted',
    };
    put(db, 'workgroup_outputs', row);
    res.status(201).json(row);
  });
  router.post('/taskforces/:id/dissolution', requireAuth(db), (req, res) => {
    const taskforce = rowOf(db, 'taskforces', req.params.id);
    if (!taskforce) return res.status(404).json({ error: '工作组不存在' });
    if (!['org-commissioner', ...SECRETARY].includes(req.actor.role)) {
      return res.status(403).json({ error: '无权限：当前角色不能办理专班工作组收尾' });
    }
    if ((taskforce.branchId || 'br-b1') !== ownBranch(req.actor)) {
      return res.status(403).json({ error: '无权限：不能跨支部办理工作组收尾' });
    }
    if (taskforce.status !== 'active') return res.status(409).json({ error: '仅运行中的工作组可以办理收尾' });
    if (taskforce.committeeRequest?.status === 'pending') {
      return res.status(409).json({ error: '该工作组已有待审议事项，不能重复提交收尾' });
    }
    const body = req.body && typeof req.body === 'object' && !Array.isArray(req.body) ? req.body : {};
    if (typeof body.requiresCommitteeVote !== 'boolean') {
      return res.status(400).json({ error: '请明确本事项是否有制度或议程要求支委会表决' });
    }
    const governanceReason = String(body.governanceReason || '').trim();
    if (body.requiresCommitteeVote && !governanceReason) {
      return res.status(400).json({ error: '提交支委会表决须写明制度或议程依据' });
    }
    const workgroup = rowOf(db, 'workgroups', taskforce.workgroupId || `wg-taskforce-${taskforce.id}`);
    const closureDeny = taskforceClosureDeny(db, taskforce);
    if (closureDeny) return res.status(409).json(closureDeny);
    const at = new Date().toISOString();
    const event = {
      id: `tfe-${randomUUID().slice(0, 12)}`,
      kind: body.requiresCommitteeVote ? 'dissolution-vote-requested' : 'dissolution-direct',
      by: req.actor.id, byRole: req.actor.role, at,
      governanceReason: body.requiresCommitteeVote ? governanceReason : '',
      note: String(body.note || '').trim(),
    };
    const events = [...(Array.isArray(taskforce.lifecycleEvents) ? taskforce.lifecycleEvents : []), event];
    const nextTaskforce = body.requiresCommitteeVote
      ? {
        ...taskforce, lifecycleEvents: events,
        dissolutionGovernanceRequired: true,
        committeeRequest: { kind: 'dissolve', by: req.actor.id, note: governanceReason, at, status: 'pending' },
      }
      : {
        ...taskforce, status: 'dissolved', dissolvedAt: at, dissolvedBy: req.actor.id,
        dissolutionGovernanceRequired: false, dissolutionNote: String(body.note || '').trim(),
        committeeRequest: null, lifecycleEvents: events,
      };
    const nextWorkgroup = {
      ...workgroup,
      status: body.requiresCommitteeVote ? workgroup.status : 'dissolved',
      updatedBy: req.actor.id, updatedAt: at,
    };
    const save = db.transaction(() => {
      put(db, 'taskforces', nextTaskforce);
      put(db, 'workgroups', nextWorkgroup);
      bumpCollectionVersion(db, 'taskforces');
      bumpCollectionVersion(db, 'workgroups');
    });
    save();
    res.json({ taskforce: nextTaskforce, workgroup: nextWorkgroup });
  });
  router.get('/activities/:id/expected-roster', requireAuth(db), (req, res) => {
    const activity = activityOf(db, req.params.id);
    if (!activity) return res.status(404).json({ error: '活动不存在' });
    if ((activity.branchId || 'br-b1') !== ownBranch(req.actor) && req.actor.role !== 'party-staff') return res.status(403).json({ error: '无权限：活动不属于当前支部' });
    res.json(rowOf(db, 'attendance_rosters', `atr-${activity.id}`));
  });
  router.get('/attendance-rosters', requireAuth(db), (req, res) => {
    const deny = branchSelectionError(req.actor, req.query.branchId);
    if (deny) return res.status(403).json({ error: deny });
    const branchId = actorBranchId(req.actor) || req.query.branchId || null;
    let rows = jsonRows(db, 'attendance_rosters').filter((row) => !branchId || row.branchId === branchId);
    if (req.query.activityId) rows = rows.filter((row) => row.activityId === req.query.activityId);
    res.json(rows);
  });
  router.put('/activities/:id/expected-roster', requireAuth(db), (req, res) => {
    const activity = activityOf(db, req.params.id);
    if (!activity) return res.status(404).json({ error: '活动不存在' });
    if ((activity.branchId || 'br-b1') !== ownBranch(req.actor)) return res.status(403).json({ error: '无权限：活动不属于当前支部' });
    if (isDisabledActivityHistory(db, activity)) return res.status(409).json({ error: '本支部已停用活动组织能力；已结束活动的应到名单只读保留' });
    const canFreeze = COMMITTEE.has(req.actor.role)
      || (req.actor.role === 'leader' && activityOperationAllowed(db, req.actor, activity, 'activity.attendance.record'));
    if (!canFreeze) return res.status(403).json({ error: '无权限：当前角色不能冻结活动应到名单' });
    const body = req.body && typeof req.body === 'object' && !Array.isArray(req.body) ? req.body : {};
    if (body.frozen !== true || !Array.isArray(body.personIds)) return res.status(400).json({ error: '冻结名单须提供 personIds 并明确 frozen=true' });
    let personIds = [...new Set(body.personIds.map(String))].sort();
    personIds = deriveExpectedRosterIds({ activity, originalPersonIds: personIds, signups: jsonRows(db, 'signups') });
    for (const personId of personIds) {
      const person = userOf(db, personId);
      if (!person) return res.status(400).json({ error: `应到成员不存在：${personId}` });
      if (memberBranch(person) !== (activity.branchId || 'br-b1')) return res.status(403).json({ error: '无权限：应到成员须属于活动所在支部' });
    }
    const id = `atr-${activity.id}`;
    const current = rowOf(db, 'attendance_rosters', id);
    if (current?.frozen) {
      if (JSON.stringify(current.personIds) === JSON.stringify(personIds)) return res.json(current);
      return res.status(409).json({ error: '已冻结的应到名单不能原位覆盖' });
    }
    const row = {
      id, branchId: activity.branchId || 'br-b1', activityId: activity.id, personIds,
      frozen: true, version: (current?.version || 0) + 1,
      frozenBy: req.actor.id, frozenAt: new Date().toISOString(),
    };
    put(db, 'attendance_rosters', row);
    res.json(row);
  });
}
