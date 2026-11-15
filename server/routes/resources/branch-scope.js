import { POLICY_DEFAULTS } from '../../../docs/src/core/domain/policy-defaults.js';
import { isBranchPendingUser, isActivityInProgress, DEFAULT_BRANCH_ID, COMMITTEE_OWNER_ID, PUBLISH_SCOPES } from '../../../docs/src/core/domain/constants.js';
import { TASKFORCE_ACTIVE_STATUSES } from '../../../docs/src/core/domain/domain.js';
import { isPublicNow } from './store.js';

const PARTY_STAFF = 'party-staff';
const DEFAULT_BRANCH = DEFAULT_BRANCH_ID;
const AGGREGATE_PARENT = Object.freeze({ actSubRecords: ['activities', 'activities'], tfSubRecords: ['taskforces', 'taskforces'] });
const OPEN_TASKFORCE = new Set(TASKFORCE_ACTIVE_STATUSES);
const COMMITTEE_OWNER = COMMITTEE_OWNER_ID;
// 发布范围只认三档（单一源 PUBLISH_SCOPES）；`branch` 不进入登录态并集，只有 login / public 进入。
const LOGIN_VISIBLE_SCOPES = new Set(PUBLISH_SCOPES.filter((scope) => scope !== 'branch'));

/**
 * 历史兼容域：缺 `branchId` 的存量行仍归缺省支部（T13 · 2026-11-15 · 依据 `ARCHITECTURE_EVOLUTION §10.9` 步 1）。
 *
 * 为什么需要白名单：多支部改造前的存量行没有 `branchId`，N=1 部署下必须仍可见
 *   （`§10.8-③` 五条读集合与 bootstrap 摘要逐字节不变）；枚举白名单而不「一律回落」，
 *   是为了让**未登记的新域**缺字段时 fail-closed，不再被静默并入 `br-b1`。
 * 纪律：每条必须写明存量证据（reason）；守卫 `branch-resolve-single-source-guard` 按本表核对，
 *   新增条目须同批给出证据，删除条目须同批确认该域已无缺字段行。
 */
export const LEGACY_DEFAULT_BRANCH_FALLBACK = Object.freeze({
  activities: '§10.8-③ 基线：历史活动无 branchId，支部视图仍须可见（act-1）',
  notices: '§10.8-③ 基线：历史通知无 branchId，支部视图仍须可见（ntc-1）',
  branchDocs: '院级 / 支部资料与通知同并集读口，存量行无 branchId',
  taskforces: '与活动同历史口径：存量专班行无 branchId',
  tasks: 'seed 实测 8/8 无 branchId（按 activityId 派生归属，解析不到时归缺省支部）',
  assignments: 'seed 实测 5/5 无 branchId（活动分工行，同上）',
  makeupTasks: 'seed 实测 1/1 无 branchId（补课任务行，同上）',
  imageRecords: 'seed 实测 2/2 无 branchId（照片元数据随活动）',
  signups: 'seed 实测 7/7 无 branchId（报名行按 sourceId 解析，缺 source 时归缺省支部）',
  activityReviews: 'seed 实测 11/11 无 branchId（活动复盘随活动）',
  taskforceReviews: 'seed 实测 2/2 无 branchId（专班复盘随专班）',
  thoughtReports: 'seed 实测 5/5 无 branchId（思想汇报按提交人投影，无活动链可解析）',
});

/** 党委自有行：显式 `ownerScope='committee'`，或归属党委伪支部（缺省 ownerScope 的存量行按 branch 处理）。 */
function isCommitteeRow(row) {
  return Boolean(row) && typeof row === 'object'
    && (row.ownerScope === 'committee' || row.branchId === COMMITTEE_OWNER);
}

/**
 * 发布范围缺省 `branch`：只有 login / public 才允许进入登录态支部视野。
 * `public` 必须**未过期**（批次 541 · S-1）：过期即视同撤下——判定函数与匿名公共门厅同一源
 * （`store.js::isPublicNow`），杜绝「门厅已 404、支部登录列表仍可见」。
 */
function isLoginVisible(row, now = Date.now()) {
  const scope = row?.publishScope || 'branch';
  if (!LOGIN_VISIBLE_SCOPES.has(scope)) return false;
  return scope !== 'public' || isPublicNow(row, now);
}

/**
 * 已过期的 public 行（批次 541 · S-1）：登录态视同**撤下**——不论它是否另有 `targetBranchIds` 下发口径，
 * 支部登录列表一律不再出现；党委管理口（party-staff）仍见原件与留痕。
 */
function isWithdrawnPublic(row, now = Date.now()) {
  return (row?.publishScope || 'branch') === 'public' && !isPublicNow(row, now);
}

/** 党委行目标支部：`['all']` 或显式包含该支部；缺目标字段视为不面向任何支部。 */
function targetsBranch(row, branchId) {
  const raw = row?.targetBranchIds;
  const targets = Array.isArray(raw) ? raw.map(String) : (raw ? [String(raw)] : []);
  return targets.length > 0 && (targets.includes('all') || targets.includes(String(branchId)));
}

/** 并集去重：同一行可能同时命中「发布范围」与「目标支部」两条口径，按 `String(row.id)` 只留首条。 */
function uniqueById(groups) {
  const seen = new Set();
  const out = [];
  for (const group of groups) {
    for (const row of group) {
      if (!row || typeof row !== 'object') continue;
      const key = String(row.id);
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(row);
    }
  }
  return out;
}

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
    // 与前端支书概况同一判据：草稿/已取消/已结束都不算在办（R2-48 单一源）。
    activeActivityCount: activities.filter((row) => isActivityInProgress(row)).length,
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
  // 显式 null = IAAA 建号后尚未经支部确认（待归属）；**不得**回落默认支部。
  // 只有历史缺字段（undefined）才按存量口径回落 br-b1。
  if (actor.branchId === null) return null;
  return actor.branchId || DEFAULT_BRANCH;
}

/**
 * 资源路由的支部归属门（R4-B02）：非党委账号且 branchId 显式为 null ⇒ 一律 403。
 * IAAA 的选支部/待确认端点挂在独立 router（/auth/iaaa），不经过本中间件。
 */
export function requireAssignedBranch() {
  return (req, res, next) => {
    if (isBranchPendingUser(req.actor)) {
      return res.status(403).json({ error: '无权限：账号尚未归属支部，请先选择支部并等待支部确认' });
    }
    next();
  };
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

/**
 * 请求级表读取器：每张表只执行一次 `SELECT id, data FROM <table>`，建 `id → row` Map 复用。
 * **仅供一次请求内的批量判定**（快照写门 / 列表支部过滤）；严禁跨请求复用（会串支部/串身份）。
 * @param {import('better-sqlite3').Database} db
 */
export function createTableReader(db) {
  const maps = new Map();
  const load = (table) => {
    let map = maps.get(table);
    if (!map) {
      map = new Map();
      for (const row of db.prepare(`SELECT id, data FROM ${table}`).all()) {
        map.set(String(row.id), JSON.parse(row.data));
      }
      maps.set(table, map);
    }
    return map;
  };
  return {
    get(table, id) {
      if (!id) return null;
      return load(table).get(String(id)) || null;
    },
    ids(table) { return load(table); },
    rows(table) { return [...load(table).values()]; },
  };
}

function get(db, table, id, reader) {
  if (!id) return null;
  if (reader) return reader.get(table, id);
  const row = db.prepare(`SELECT data FROM ${table} WHERE id = ?`).get(String(id));
  return row ? JSON.parse(row.data) : null;
}

function linkedBranch(db, name, row, reader) {
  const parent = AGGREGATE_PARENT[name];
  if (parent) return null;
  if (['activity', 'taskforce'].includes(row.sourceType) && row.sourceId) {
    const sourceTable = row.sourceType === 'activity' ? 'activities' : 'taskforces';
    const source = get(db, sourceTable, row.sourceId, reader);
    if (source) return resolveRowBranchId(db, sourceTable, source, reader);
  }
  const activityId = row.activityId || (name === 'activities' ? null : null);
  if (activityId) {
    const activity = get(db, 'activities', activityId, reader);
    // 2026-10-24 批次 508：归档记录只认「记录自身 branchId」或「activityId → 活动归属」；
    //   活动的归属按**活动读口的同一口径**解析（历史活动无 branchId 时仍为 br-b1，与支部视图一致，
    //   否则老活动下的归档材料会忽然对支部不可见、上传写门也会误拒）。
    //   两者都解析不出（无 activityId / 活动不存在）⇒ 返回 null（未归属，只对党委可见），不塞默认支部。
    //   其余资源保持原口径（R10-D14 另批）。
    if (activity) {
      return name === 'archiveRecords'
        ? (activity.branchId || resolveRowBranchId(db, 'activities', activity, reader))
        : (activity.branchId || DEFAULT_BRANCH);
    }
  }
  const workgroup = row.workgroupId ? get(db, 'workgroups', row.workgroupId, reader) : null;
  if (workgroup) return workgroup.branchId || DEFAULT_BRANCH;
  const taskforce = row.taskforceId ? get(db, 'taskforces', row.taskforceId, reader) : null;
  if (taskforce) return taskforce.branchId || DEFAULT_BRANCH;
  const groupId = row.partyGroupId || row.groupId || row.hostGroupId;
  if (groupId) {
    const group = get(db, 'party_groups', groupId, reader);
    if (group) return group.branchId || DEFAULT_BRANCH;
  }
  if (name === 'issue_unread' || name === 'issueUnread') {
    const assignee = get(db, 'users', row.assigneeId, reader);
    if (assignee?.branchId) return assignee.branchId;
  }
  if (name === 'member_confirmations' || name === 'memberConfirmations') {
    const person = get(db, 'users', row.personId, reader);
    if (person?.branchId) return person.branchId;
  }
  if (name === 'committee_broadcasts' || name === 'committeeBroadcasts') {
    const request = get(db, 'member_change_requests', row.requestId, reader);
    if (request) return resolveRowBranchId(db, 'memberChangeRequests', request, reader);
  }
  if (name === 'auth_audit' || name === 'authAudit') {
    if (row.scopeRef && get(db, 'branches', row.scopeRef, reader)) return row.scopeRef;
    const target = get(db, 'users', row.targetPersonId, reader);
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
      const linked = get(db, table, id, reader);
      if (linked) return linked.branchId || DEFAULT_BRANCH;
    }
  }
  return null;
}

/**
 * 行级支部归属（**解析唯一入口**，T13 · 2026-11-15）：显式 `branchId` → 关联业务记录 → 历史兼容回落。
 * 缺字段回落只对本文件 `LEGACY_DEFAULT_BRANCH_FALLBACK` 登记的域放行；未登记域解析不出即 `null`
 *   （fail-closed：不再静默并入 `br-b1`，该行只对党委可见）。
 */
export function resolveRowBranchId(db, name, row, reader) {
  if (!row || typeof row !== 'object') return null;
  if (name === 'branches') return row.id || null;
  if (name === 'users') return row.branchId || null;
  if (name === 'signups' && ['activity', 'taskforce'].includes(row.sourceType) && row.sourceId) {
    const table = row.sourceType === 'activity' ? 'activities' : 'taskforces';
    const source = get(db, table, row.sourceId, reader);
    if (!source) return null;
    const sourceBranch = resolveRowBranchId(db, table, source, reader);
    return row.branchId && row.branchId !== sourceBranch ? null : sourceBranch;
  }

  const direct = row.branchId || null;
  const linked = linkedBranch(db, name, row, reader);
  if (direct && linked && direct !== linked) return null;
  if (direct) return direct;
  // v11（批次 504）：待办不得回落缺省支部——解析不出就是 NULL（待归属），
  //   读口按兼容期规则决定可见性。
  if (name === 'todos') return linked || null;
  // 2026-10-24 批次 508：归档记录同样不回落缺省支部——自身无 branchId、activityId 也解析不出归属时
  //   返回 null（未归属），该行只对党委可见（见 resourceRowsForActor），支部账号一概不可见。
  if (name === 'archiveRecords') return linked || null;
  const legacyFallback = LEGACY_DEFAULT_BRANCH_FALLBACK[name] ? DEFAULT_BRANCH : null;
  return linked || legacyFallback;
}

/** 兼容旧名（T13 起解析入口统一为 `resolveRowBranchId`；新代码一律用新名）。 */
export const resourceBranchId = resolveRowBranchId;

export function branchForNewResource(db, name, row, actor) {
  const resolved = row?.branchId || linkedBranch(db, name, row || {});
  if (resolved) return resolved;
  // 批次 536 Task 5：党委新建党委行归党委伪支部，不回落默认支部；支部账号拿不到 pc-gsm。
  if (actor?.role === PARTY_STAFF && row?.ownerScope === 'committee') return COMMITTEE_OWNER;
  return actorBranchId(actor);
}

/**
 * 请求级支部上下文（**解析唯一入口**，T13 · 2026-11-15）。
 * 规则：本人支部优先（支部账号只读本支部，跨支部参数已由 `branchSelectionError` 前置拒）；党委 / 匿名取显式
 *   `?branchId=`；两者都没有 ⇒ `null`（fail-closed，**不再**回落缺省支部；读口按无上下文口径决定可见集）。
 * @param {Object|null} actor 会话用户（匿名）为 null
 * @param {string} [requestedBranchId] 请求显式支部（`?branchId=`）
 * @returns {string|null}
 */
export function resolveBranchIdForActor(actor, requestedBranchId) {
  const own = actorBranchId(actor);
  if (own) return own;
  // 匿名请求不认查询参数：`?branchId=` 是已登录调用方的选择，不构成匿名调用方的支部上下文。
  if (!actor) return null;
  return requestedBranchId ? String(requestedBranchId) : null;
}

function aggregateRows(db, name, rows, targetBranchId, reader) {
  const [parentTable] = AGGREGATE_PARENT[name];
  const parentName = name === 'actSubRecords' ? 'activities' : 'taskforces';
  const root = rows.find((row) => row.id === '__root__');
  if (!root || !root.body || typeof root.body !== 'object' || Array.isArray(root.body)) return rows;
  if (!targetBranchId) return [{ ...root, body: {} }];
  const body = Object.fromEntries(Object.entries(root.body).filter(([id]) => {
    const parentRow = get(db, parentTable, id, reader);
    return parentRow && resolveRowBranchId(db, parentName, parentRow, reader) === targetBranchId;
  }));
  return [{ ...root, body }];
}

/**
 * @param {Object} [reader] 请求级表读取器（`createTableReader`）：列表请求内复用 `id → row` Map；
 *   缺省时按行点查（旧口径）。**不得**跨请求共享。
 */
export function resourceRowsForActor(db, name, rows, actor, requestedBranchId, reader) {
  const targetBranchId = resolveBranchIdForActor(actor, requestedBranchId);
  const isPartyStaff = actor?.role === PARTY_STAFF;
  if (!targetBranchId && !isPartyStaff) {
    // T13 · 2026-11-15（§10.9 步 3 / 10.7-1）：**无支部上下文失败关闭**——匿名公共归档读口
    //   此前 `if (!targetBranchId) return rows;` 把 A / B 两支支部行一并返回（实测 `ar-a,ar-b`）。
    //   现只放行「显式 `publishScope='public'` 且未过期的党委行」；支部业务行一律不出。
    if (AGGREGATE_PARENT[name]) return aggregateRows(db, name, rows, null, reader);
    if (name === 'branches') return [];
    const now = Date.now();
    return rows.filter((row) => isCommitteeRow(row) && isPublicNow(row, now));
  }
  if (isPartyStaff && !targetBranchId) {
    if (name === 'branches') {
      return rows.map((row) => projectBranchDirectoryRow(db, row, null));
    }
    // 2026-10-18：党委未选支部时只放开「党委下发通知」的读取（发送记录跨支部留档），
    // 支部内其他通知仍不进入党委视野。批次 536 Task 5：再并上党委自有的登录 / 公开通知。
    if (name === 'notices') {
      return uniqueById([
        rows.filter((row) => row?.source === 'committee'),
        rows.filter((row) => row.branchId === COMMITTEE_OWNER && isLoginVisible(row)),
      ]);
    }
    // 批次 536 Task 5：党委未选支部时只给党委自有活动 / 院级资料，不展开任何支部明细。
    if (name === 'activities' || name === 'branchDocs') return rows.filter(isCommitteeRow);
    // 支部上报审批是**党委本职台账**（跨支部待批复队列）——党委未选支部时也必须能看到
    // 全部待批复上报，否则「支部上报」页恒空（P3 党委后台闭环，party-committee-review P3）。
    if (name === 'reviewRequests') return rows;
    // 2026-10-24 批次 508：未归属支部的归档记录「只对党委可见」——党委未选支部时给出这批待归属行。
    if (name === 'archiveRecords') return rows.filter((row) => resolveRowBranchId(db, name, row, reader) === null);
    if (AGGREGATE_PARENT[name]) return aggregateRows(db, name, rows, null, reader);
    return [];
  }
  if (isPartyStaff && name === 'branches') {
    return rows.map((row) => projectBranchDirectoryRow(db, row, targetBranchId));
  }
  if (AGGREGATE_PARENT[name]) return aggregateRows(db, name, rows, targetBranchId, reader);
  // 此处 targetBranchId 必非空：党委未选支部走上方分支，匿名 / 无支部上下文在上方失败关闭。
  // 批次 536 Task 5：活动 / 通知 / 资料的读口由「仅本支部」改为「本支部 + 党委可见行」并集。
  // 批次 541 · S-1：过期的 public 党委行对支部账号视同撤下（党委视角不受影响）。
  if (name === 'activities') {
    const branchRows = rows.filter((row) => !isCommitteeRow(row) && resolveRowBranchId(db, name, row, reader) === targetBranchId);
    // 本支部已有副本 ⇒ 列表隐藏党委原件（I2 / D-858 第 11 条）；党委视角仍出原件并标注是否已采用。
    const adopted = new Set(branchRows.filter((row) => row.sourceActivityId).map((row) => String(row.sourceActivityId)));
    const committeeRows = rows.filter((row) => isCommitteeRow(row) && targetsBranch(row, targetBranchId));
    if (isPartyStaff) {
      return uniqueById([branchRows, committeeRows.map((row) => ({
        ...row, sourceScope: 'committee', committeeAdopted: adopted.has(String(row.id)),
      }))]);
    }
    return uniqueById([branchRows, committeeRows.filter((row) => !adopted.has(String(row.id)) && !isWithdrawnPublic(row))]);
  }
  if (name === 'notices') {
    const now = Date.now();
    const branchRows = rows.filter((row) => !isCommitteeRow(row) && resolveRowBranchId(db, name, row, reader) === targetBranchId);
    const committeePublished = rows.filter((row) => row.branchId === COMMITTEE_OWNER && isLoginVisible(row, now));
    const committeeTargeted = rows.filter((row) => row.ownerScope === 'committee' && targetsBranch(row, targetBranchId));
    // 空受众 / 私信等受众判定仍归上层 `canReadNotice`，本层只决定「哪些行进入支部视野」。
    return uniqueById([
      branchRows,
      ...(isPartyStaff
        ? [committeeTargeted]
        : [committeePublished, committeeTargeted.filter((row) => !isWithdrawnPublic(row, now))]),
    ]);
  }
  if (name === 'branchDocs') {
    const now = Date.now();
    const branchRows = rows.filter((row) => !isCommitteeRow(row) && resolveRowBranchId(db, name, row, reader) === targetBranchId);
    const committeeRows = isPartyStaff
      ? rows.filter(isCommitteeRow)
      : rows.filter((row) => row.branchId === COMMITTEE_OWNER && isLoginVisible(row, now));
    return uniqueById([branchRows, committeeRows]);
  }
  if (name === 'todos') {
    // v11 兼容期：branchId=NULL 的旧待办只给本人或同角色看一个周期，并标 branchLegacy。
    return rows
      .filter((row) => {
        const branchId = resolveRowBranchId(db, name, row, reader);
        if (branchId === targetBranchId) return true;
        if (branchId !== null) return false;
        if (row.personId) return String(row.personId) === String(actor?.id);
        return !!row.role && row.role === actor?.role;
      })
      .map((row) => (resolveRowBranchId(db, name, row, reader) === null ? { ...row, branchLegacy: true } : row));
  }
  // 2026-10-24 批次 508：归档记录读口——选中支部时给出「本支部 + 未归属（仅党委）」；
  //   支部账号的 targetBranchId 恒非空且不会命中 null，故未归属行对支部账号不可见。
  if (name === 'archiveRecords') {
    return rows.filter((row) => {
      const branchId = resolveRowBranchId(db, name, row, reader);
      return branchId === targetBranchId || (actor?.role === PARTY_STAFF && branchId === null);
    });
  }
  return rows.filter((row) => resolveRowBranchId(db, name, row, reader) === targetBranchId);
}

export function recordBranchWriteDeny(db, name, row, actor, { requireBranch = true } = {}) {
  // 批次 536 Task 5 / I4：党委内容（ownerScope='committee' 或归属 pc-gsm）只归党委组织员；
  //   支部账号一律拒，党委组织员放行且不要求支部归属。
  if (isCommitteeRow(row)) {
    return actor?.role === PARTY_STAFF ? null : '无权限：党委内容只能由党委组织员写入';
  }
  const own = actorBranchId(actor);
  const linked = linkedBranch(db, name, row || {});
  const requested = row?.branchId || linked || own;
  const resolved = resolveRowBranchId(db, name, row);
  if (own && resolved !== own) return '无权限：不能读取或写入其他支部记录';
  if (own && requested && requested !== own) return '无权限：不能读取或写入其他支部记录';
  if (row?.branchId && linked && row.branchId !== linked) return '记录的支部归属与其关联业务记录不一致';
  if (!own && requireBranch && !requested) return '党委写入支部业务记录时须明确支部归属';
  return null;
}

export function scopedSnapshotWriteDeny(db, payload, actor, reader) {
  const own = actorBranchId(actor);
  if (!own) return null;
  const read = reader || createTableReader(db);
  const semanticOnly = new Set(['workgroups', 'workgroupMembers', 'workgroupGrants', 'workgroupTasks', 'workgroupOutputs', 'attendanceRosters']);
  for (const [name, rows] of Object.entries(payload || {})) {
    if (!Array.isArray(rows) || ['users', 'branches'].includes(name) || semanticOnly.has(name)) continue;
    if (AGGREGATE_PARENT[name]) {
      const root = rows.find((row) => row?.id === '__root__');
      const [parentTable] = AGGREGATE_PARENT[name];
      for (const id of Object.keys(root?.body || {})) {
        const parent = get(db, parentTable, id, read);
        if (!parent || resolveRowBranchId(db, name === 'actSubRecords' ? 'activities' : 'taskforces', parent, read) !== own) {
          return '无权限：聚合子记录只能写入本支部所属业务记录';
        }
      }
      continue;
    }
    for (const row of rows) {
      if (!row || typeof row !== 'object') continue;
      const previous = row.id ? get(db, nameToTable(name), row.id, read) : null;
      // 批次 536 Task 5：党委行不归支部——支部整表快照既不得改写，也不得删除党委内容。
      if (isCommitteeRow(row) || isCommitteeRow(previous)) return '无权限：不能通过快照触碰党委内容';
      if (previous && resolveRowBranchId(db, name, previous, read) !== own) return '无权限：不能通过快照触碰其他支部记录';
      if (previous && row.branchId && previous.branchId && row.branchId !== previous.branchId) return '支部归属创建后不可修改';
      const linked = linkedBranch(db, name, row, read);
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
    if (!parent || resolveRowBranchId(db, parentName, parent) !== own) {
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
    return !parent || resolveRowBranchId(db, parentName, parent) !== own;
  }));
  return { ...retained, ...(incomingBody || {}) };
}

export function mergeScopedSnapshotWrites(db, writes, actor, reader) {
  const own = actorBranchId(actor);
  if (!own) return writes;
  const read = reader || createTableReader(db);
  return writes.map((write) => {
    const { name, table, rows } = write;
    if (['users', 'branches'].includes(name)) return write;
    const current = read.rows(table);
    if (AGGREGATE_PARENT[name]) {
      const [parentTable] = AGGREGATE_PARENT[name];
      const root = current.find((row) => row.id === '__root__') || { id: '__root__', body: {} };
      const nextRoot = rows.find((row) => row.id === '__root__') || { id: '__root__', body: {} };
      const retained = Object.fromEntries(Object.entries(root.body || {}).filter(([id]) => {
        const parent = get(db, parentTable, id, read);
        return !parent || resolveRowBranchId(db, name === 'actSubRecords' ? 'activities' : 'taskforces', parent, read) !== own;
      }));
      return { ...write, rows: [{ ...root, ...nextRoot, body: { ...retained, ...(nextRoot.body || {}) } }] };
    }
    const retained = current.filter((row) => {
      // 批次 536 Task 5：党委行恒保留——缺 branchId 的党委行经 resolveRowBranchId 会回落默认支部，
      //   只按 `resolveRowBranchId !== own` 判会把党委内容误删，故先显式判 ownerScope / pc-gsm。
      if (isCommitteeRow(row)) return true;
      return resolveRowBranchId(db, name, row, read) !== own;
    });
    // 存量行保持原样（不额外补 branchId）：否则首次正常保存会把整集合标成「已修改」，
    // 令逐行写门把历史行（如「支委会不考勤」的旧考勤）重新校验并误拒。新建行才归当前支部。
    const existingIds = new Set(current.map((row) => String(row.id)));
    const scoped = rows.map((row) => (existingIds.has(String(row.id))
      ? row
      : { ...row, branchId: row.branchId || own }));
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
