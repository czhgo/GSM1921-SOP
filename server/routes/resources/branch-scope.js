const PARTY_STAFF = 'party-staff';
const DEFAULT_BRANCH = 'br-b1';
const AGGREGATE_PARENT = Object.freeze({ actSubRecords: ['activities', 'activities'], tfSubRecords: ['taskforces', 'taskforces'] });

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
  if (!targetBranchId) return rows;
  const body = Object.fromEntries(Object.entries(root.body).filter(([id]) => {
    const parentRow = get(db, parentTable, id);
    return parentRow && resourceBranchId(db, parentName, parentRow) === targetBranchId;
  }));
  return [{ ...root, body }];
}

export function resourceRowsForActor(db, name, rows, actor, requestedBranchId) {
  const targetBranchId = selectedBranch(actor, requestedBranchId);
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
