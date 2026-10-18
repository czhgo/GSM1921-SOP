import { POLICY_DEFAULTS } from '../../../docs/src/core/domain/policy-defaults.js';

const PARTY_STAFF = 'party-staff';
const DEFAULT_BRANCH = 'br-b1';
const AGGREGATE_PARENT = Object.freeze({ actSubRecords: ['activities', 'activities'], tfSubRecords: ['taskforces', 'taskforces'] });
const TERMINAL_ACTIVITY = new Set(['completed', 'executed', 'archived', 'cancelled']);
const OPEN_TASKFORCE = new Set(['recruiting', 'active', 'in_progress']);

function tableRows(db, table) {
  try {
    return db.prepare(`SELECT data FROM ${table}`).all().map((row) => JSON.parse(row.data));
  } catch {
    return [];
  }
}

function branchSummary(db, branch) {
  const branchId = String(branch.id);
  const belongs = (row) => (row.branchId || DEFAULT_BRANCH) === branchId;
  const users = tableRows(db, 'users').filter((row) => row.role !== PARTY_STAFF && row.branchId === branchId);
  const rosterPolicy = {
    ...POLICY_DEFAULTS.attendance.roster,
    ...(branch.config?.policyOverrides?.attendance?.roster || {}),
  };
  const partyMembers = users.filter((row) => rosterPolicy.partyStages.includes(row.developStage));
  const activities = tableRows(db, 'activities').filter(belongs);
  const taskforces = tableRows(db, 'taskforces').filter(belongs);
  const notices = tableRows(db, 'notices').filter(belongs);
  return {
    memberCount: users.length,
    partyMemberCount: partyMembers.length,
    detainedPartyCount: rosterPolicy.excludeDetained
      ? partyMembers.filter((row) => row.residenceStatus === '滞留').length
      : 0,
    activityCount: activities.length,
    activeActivityCount: activities.filter((row) => !TERMINAL_ACTIVITY.has(row.status)).length,
    taskforceCount: taskforces.length,
    activeTaskforceCount: taskforces.filter((row) => OPEN_TASKFORCE.has(row.status)).length,
    noticeCount: notices.length,
  };
}

function projectBranchDirectoryRow(db, row, selectedBranchId) {
  const summary = branchSummary(db, row);
  const selected = selectedBranchId && selectedBranchId === row.id;
  return {
    ...(selected ? row : {
      id: row.id,
      name: row.name,
      type: row.type,
      status: row.status,
      // 党委目录需要判断“运行中但未任命支书”；只给 id/name/type/status 会让
      // 客户端把已有支书的支部误判为组织待补，任命链也拿不到原支书做降级。
      secretaryId: row.secretaryId || null,
      ...(row.config?.headerTitle ? { config: { headerTitle: row.config.headerTitle } } : {}),
    }),
    summary,
  };
}

export function actorBranchId(actor) {
  if (!actor || actor.role === PARTY_STAFF) return null;
  return actor.branchId || DEFAULT_BRANCH;
}

export function branchSelectionError(actor, requestedBranchId) {
  const own = actorBranchId(actor);
  return own && requestedBranchId && requestedBranchId !== own
    ? '无权限：支部账号只能读取本支部数据'
    : null;
}

export function selectedBranchRequiredError(actor, requestedBranchId) {
  return actor?.role === PARTY_STAFF && !requestedBranchId
    ? '党委读取支部明细前须先选择支部'
    : null;
}

function get(db, table, id) {
  if (!id) return null;
  const row = db.prepare(`SELECT data FROM ${table} WHERE id = ?`).get(String(id));
  return row ? JSON.parse(row.data) : null;
}

function linkedBranch(db, name, row) {
  const parent = AGGREGATE_PARENT[name];
  if (parent) return null;
  if (['activity', 'taskforce'].includes(row.sourceType) && row.sourceId) {
    const sourceTable = row.sourceType === 'activity' ? 'activities' : 'taskforces';
    const source = get(db, sourceTable, row.sourceId);
    if (source) return resourceBranchId(db, sourceTable, source);
  }
  const activityId = row.activityId || (name === 'activities' ? null : null);
  if (activityId) {
    const activity = get(db, 'activities', activityId);
    if (activity) return activity.branchId || DEFAULT_BRANCH;
  }
  const workgroup = row.workgroupId ? get(db, 'workgroups', row.workgroupId) : null;
  if (workgroup) return workgroup.branchId || DEFAULT_BRANCH;
  const taskforce = row.taskforceId ? get(db, 'taskforces', row.taskforceId) : null;
  if (taskforce) return taskforce.branchId || DEFAULT_BRANCH;
  const groupId = row.partyGroupId || row.groupId || row.hostGroupId;
  if (groupId) {
    const group = get(db, 'party_groups', groupId);
    if (group) return group.branchId || DEFAULT_BRANCH;
  }
  if (name === 'issue_unread' || name === 'issueUnread') {
    const assignee = get(db, 'users', row.assigneeId);
    if (assignee?.branchId) return assignee.branchId;
  }
  if (name === 'member_confirmations' || name === 'memberConfirmations') {
    const person = get(db, 'users', row.personId);
    if (person?.branchId) return person.branchId;
  }
  if (name === 'committee_broadcasts' || name === 'committeeBroadcasts') {
    const request = get(db, 'member_change_requests', row.requestId);
    if (request) return resourceBranchId(db, 'memberChangeRequests', request);
  }
  if (name === 'auth_audit' || name === 'authAudit') {
    if (row.scopeRef && get(db, 'branches', row.scopeRef)) return row.scopeRef;
    const target = get(db, 'users', row.targetPersonId);
    if (target?.branchId) return target.branchId;
  }
  if (row.refId) {
    const refType = String(row.refType || row.type || '').toLowerCase();
    const candidates = refType.includes('activity') || refType.includes('attendance') || refType.includes('inspection')
      ? [['activities', row.refId]]
      : refType.includes('taskforce') || refType.includes('workgroup')
        ? [['taskforces', row.refId], ['workgroups', row.refId]]
        : [['activities', row.refId], ['taskforces', row.refId], ['workgroups', row.refId]];
    for (const [table, id] of candidates) {
      const linked = get(db, table, id);
      if (linked) return linked.branchId || DEFAULT_BRANCH;
    }
  }
  return null;
}

export function resourceBranchId(db, name, row) {
  if (!row || typeof row !== 'object') return null;
  if (name === 'branches') return row.id || null;
  if (name === 'users') return row.branchId || null;
  if (name === 'signups' && ['activity', 'taskforce'].includes(row.sourceType) && row.sourceId) {
    const table = row.sourceType === 'activity' ? 'activities' : 'taskforces';
    const source = get(db, table, row.sourceId);
    if (!source) return null;
    const sourceBranch = resourceBranchId(db, table, source);
    return row.branchId && row.branchId !== sourceBranch ? null : sourceBranch;
  }

  const direct = row.branchId || null;
  const linked = linkedBranch(db, name, row);
  if (direct && linked && direct !== linked) return null;
  if (direct) return direct;
  return linked || DEFAULT_BRANCH;
}

export function branchForNewResource(db, name, row, actor) {
  return row?.branchId || linkedBranch(db, name, row || {}) || actorBranchId(actor);
}

function selectedBranch(actor, requestedBranchId) {
  const own = actorBranchId(actor);
  return own || requestedBranchId || null;
}

function aggregateRows(db, name, rows, targetBranchId) {
  const [parentTable] = AGGREGATE_PARENT[name];
  const parentName = name === 'actSubRecords' ? 'activities' : 'taskforces';
  const root = rows.find((row) => row.id === '__root__');
  if (!root || !root.body || typeof root.body !== 'object' || Array.isArray(root.body)) return rows;
  if (!targetBranchId) return [{ ...root, body: {} }];
  const body = Object.fromEntries(Object.entries(root.body).filter(([id]) => {
    const parentRow = get(db, parentTable, id);
    return parentRow && resourceBranchId(db, parentName, parentRow) === targetBranchId;
  }));
  return [{ ...root, body }];
}

export function resourceRowsForActor(db, name, rows, actor, requestedBranchId) {
  const targetBranchId = selectedBranch(actor, requestedBranchId);
  if (actor?.role === PARTY_STAFF && !targetBranchId) {
    if (name === 'branches') {
      return rows.map((row) => projectBranchDirectoryRow(db, row, null));
    }
    // 2026-10-18：党委未选支部时只放开「党委下发通知」的读取（发送记录跨支部留档），
    // 支部内其他通知仍不进入党委视野。
    if (name === 'notices') {
      return rows.filter((row) => row?.source === 'committee');
    }
    if (AGGREGATE_PARENT[name]) return aggregateRows(db, name, rows, null);
    return [];
  }
  if (actor?.role === PARTY_STAFF && name === 'branches') {
    return rows.map((row) => projectBranchDirectoryRow(db, row, targetBranchId));
  }
  if (AGGREGATE_PARENT[name]) return aggregateRows(db, name, rows, targetBranchId);
  if (!targetBranchId) return rows;
  return rows.filter((row) => resourceBranchId(db, name, row) === targetBranchId);
}

export function recordBranchWriteDeny(db, name, row, actor, { requireBranch = true } = {}) {
  const own = actorBranchId(actor);
  const linked = linkedBranch(db, name, row || {});
  const requested = row?.branchId || linked || own;
  const resolved = resourceBranchId(db, name, row);
  if (own && resolved !== own) return '无权限：不能读取或写入其他支部记录';
  if (own && requested && requested !== own) return '无权限：不能读取或写入其他支部记录';
  if (row?.branchId && linked && row.branchId !== linked) return '记录的支部归属与其关联业务记录不一致';
  if (!own && requireBranch && !requested) return '党委写入支部业务记录时须明确支部归属';
  return null;
}

export function scopedSnapshotWriteDeny(db, payload, actor) {
  const own = actorBranchId(actor);
  if (!own) return null;
  const semanticOnly = new Set(['workgroups', 'workgroupMembers', 'workgroupGrants', 'workgroupTasks', 'workgroupOutputs', 'attendanceRosters']);
  for (const [name, rows] of Object.entries(payload || {})) {
    if (!Array.isArray(rows) || ['users', 'branches'].includes(name) || semanticOnly.has(name)) continue;
    if (AGGREGATE_PARENT[name]) {
      const root = rows.find((row) => row?.id === '__root__');
      const [parentTable] = AGGREGATE_PARENT[name];
      for (const id of Object.keys(root?.body || {})) {
        const parent = get(db, parentTable, id);
        if (!parent || resourceBranchId(db, name === 'actSubRecords' ? 'activities' : 'taskforces', parent) !== own) {
          return '无权限：聚合子记录只能写入本支部所属业务记录';
        }
      }
      continue;
    }
    for (const row of rows) {
      if (!row || typeof row !== 'object') continue;
      const previous = row.id ? get(db, nameToTable(name), row.id) : null;
      if (previous && resourceBranchId(db, name, previous) !== own) return '无权限：不能通过快照触碰其他支部记录';
      if (previous && row.branchId && previous.branchId && row.branchId !== previous.branchId) return '支部归属创建后不可修改';
      const linked = linkedBranch(db, name, row);
      if (row.branchId && row.branchId !== own) return '无权限：快照只能写入当前支部记录';
      if (linked && linked !== own) return '无权限：快照关联记录属于其他支部';
    }
  }
  return null;
}

export function aggregateWriteDeny(db, name, body, actor) {
  const own = actorBranchId(actor);
  if (!own) return null;
  if (!body || typeof body !== 'object' || Array.isArray(body)) return '聚合子记录须为对象';
  const [parentTable] = AGGREGATE_PARENT[name] || [];
  if (!parentTable) return '未知聚合资源';
  const parentName = name === 'actSubRecords' ? 'activities' : 'taskforces';
  for (const id of Object.keys(body)) {
    const parent = get(db, parentTable, id);
    if (!parent || resourceBranchId(db, parentName, parent) !== own) {
      return '无权限：聚合子记录只能写入本支部所属业务记录';
    }
  }
  return null;
}

export function mergeAggregateBody(db, name, currentBody, incomingBody, actor) {
  const own = actorBranchId(actor);
  if (!own) return incomingBody;
  const [parentTable] = AGGREGATE_PARENT[name] || [];
  const parentName = name === 'actSubRecords' ? 'activities' : 'taskforces';
  const retained = Object.fromEntries(Object.entries(currentBody || {}).filter(([id]) => {
    const parent = get(db, parentTable, id);
    return !parent || resourceBranchId(db, parentName, parent) !== own;
  }));
  return { ...retained, ...(incomingBody || {}) };
}

export function mergeScopedSnapshotWrites(db, writes, actor) {
  const own = actorBranchId(actor);
  if (!own) return writes;
  return writes.map((write) => {
    const { name, table, rows } = write;
    if (['users', 'branches'].includes(name)) return write;
    const current = db.prepare(`SELECT id, data FROM ${table}`).all().map((raw) => JSON.parse(raw.data));
    if (AGGREGATE_PARENT[name]) {
      const [parentTable] = AGGREGATE_PARENT[name];
      const root = current.find((row) => row.id === '__root__') || { id: '__root__', body: {} };
      const nextRoot = rows.find((row) => row.id === '__root__') || { id: '__root__', body: {} };
      const retained = Object.fromEntries(Object.entries(root.body || {}).filter(([id]) => {
        const parent = get(db, parentTable, id);
        return !parent || resourceBranchId(db, name === 'actSubRecords' ? 'activities' : 'taskforces', parent) !== own;
      }));
      return { ...write, rows: [{ ...root, ...nextRoot, body: { ...retained, ...(nextRoot.body || {}) } }] };
    }
    const retained = current.filter((row) => resourceBranchId(db, name, row) !== own);
    const scoped = rows.map((row) => ({ ...row, branchId: row.branchId || own }));
    return { ...write, rows: [...retained, ...scoped] };
  });
}

function nameToTable(name) {
  return ({
    makeupTasks: 'makeup_tasks', experienceDeposits: 'experience_deposits', fileSpaceRecords: 'file_space_records',
    imageRecords: 'image_records', activityReviews: 'activity_reviews', taskforceReviews: 'taskforce_reviews',
    propTasks: 'prop_tasks', periodicArchives: 'periodic_archive_submissions', archiveRecords: 'archive_records',
    externalDispatches: 'external_dispatches', actSubRecords: 'act_sub_records', tfSubRecords: 'tf_sub_records',
    branchDocs: 'branch_docs', appointmentRecords: 'appointment_records', reviewRequests: 'review_requests',
    thoughtReports: 'thought_reports', partyGroups: 'party_groups', memberFlows: 'member_flows',
  })[name] || name;
}
