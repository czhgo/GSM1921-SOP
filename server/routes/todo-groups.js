// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  server/routes/todo-groups.js — 待办「实时派生组」服务端只读端点（批次 532 · B-500-7 最小 Plan B）
//
//  为什么有本文件：待办实时派生此前只在浏览器里算（`services/governance/todo.js` 的三个纯派生函数
//    ＋ 各台 `buildRealtimeGroups`）。本批把**能确定性复算**的那部分读取面切到服务端，客户端派生
//    原样保留，作为**兼容 / 降级**路径（不改写口、不动事件驱动派生、不删客户端实现）。
//
//  端点：GET /api/v1/todo-groups?role=<role>&personId=<id>
//    · 只读 GET；鉴权沿用 `routes/resources/index.js` 的 router 级 `requireAuth` + 支部作用域
//      （`branch-scope.js` 的 `actorBranchId` / `branchSelectionError`），本文件不新增任何写口。
//    · 读权限门 = **与 `routes/resources/index.js` 同一实现**（批次 541：判据本体抽到叶子件
//      `routes/resources/todo-read-policy.mjs`，两端 import 同一函数；口径变更只改该叶子件）。
//    · 本端点算 11 类实时组：三类「确定性复算」组（发展节点 / 半年考察 / 模块周期）、
//      7 类实时组（考勤·考察队列、决议逾期、成员变更确认 / 审批、学期末滞留、支委专班赋权）
//      ＋ 批次 539 增的纪检「考勤 / 考察待确认」两键 ⇒ `unsupported` 清空（客户端只展示）。
//
//  ⚠ 派生口径的**单一源**：全部 11 类均 import `docs/src/core/domain/todo-derive.js` 的纯函数
//    （零依赖叶子件，双端同源）。`services/governance/todo.js` 只做再导出，不再保留复刻实现。
//    改任一条派生规则时只改该叶子件（判定：`todo-derive-parity` + `todo-groups-api`）。
// ════════════════════════════════════════════════════════════════

import { requireAuth } from './auth.js';
import { listTable } from './resources/store.js';
import { branchSelectionError, createTableReader, resolveBranchIdForActor, resolveRowBranchId, resourceRowsForActor } from './resources/branch-scope.js';
// 待办行读权限单一源（读口 `GET /todos` 与派生口 `GET /todo-groups` 共用；批次 541）
import { canReadTodoRow } from './resources/todo-read-policy.mjs';
// 周期口径（月 / 季 / 半年 / 年）与模块目录：均为零依赖叶子件，服务端直导可载（与客户端同一份口径）
import { expandWorkforce } from '../../docs/src/core/domain/work-map.js';
// 实时组纯派生**单一源**（零业务依赖叶子件；浏览器与 node 同源 import）
import {
  DERIVE_GROUP_DOMAIN,
  deriveAttendanceRemindGroup,
  deriveInspectionRemindGroup,
  deriveResolutionFollowupRemindGroup,
  deriveMemberConfirmGroup,
  deriveMemberApproveGroup,
  deriveSemesterDetainedRemindGroup,
  deriveTaskforceAuthorizeGroup,
  deriveAttendanceConfirmGroup,
  deriveInspectionConfirmGroup,
  buildDevelopNodeRemindGroup,
  buildHalfYearInspectionRemindGroup,
  buildModuleCycleRemindGroup,
} from '../../docs/src/core/domain/todo-derive.js';
import { today } from '../services/reporting.js';
// 支部域参数（批次 541 · D-2）：净化唯一实现 = `services/branch/config-clean.js`（与前端同源）；
//   合并唯一实现 = `policy-defaults.js::effectivePolicyWith`（不改全局 POLICY_DEFAULTS）。
import { sanitizeConfigPolicyOverrides } from '../../docs/src/services/branch/config-clean.js';
import { effectivePolicyWith } from '../../docs/src/core/domain/policy-defaults.js';

// ── 业务域键（**单一源** = `docs/src/services/governance/todo.js::WORK_DOMAIN`）──────────────
// 本文件只用域键做组归位标注，不参与任何写口；取值必须与前端一致（`D-787` 合并后 6 类 + NONE）。
const WORK_DOMAIN = {
  PROJECT: 'project',
  ATTENDANCE: 'attendance',
  INSPECTION: 'inspection',
  MEMBER_DEV: 'member-dev',
  REPORT_UP: 'report-up',
  ARCHIVE: 'archive',
  NONE: 'none',
};
/** 合并前域键 → 合并后域键（单一源 = todo.js::_LEGACY_DOMAIN） */
const _LEGACY_DOMAIN = {
  meeting: 'project', activity: 'project', taskforce: 'project',
  resolution: 'report-up', report: 'report-up',
};
/** 实时组 actionKey → 业务域（单一源 = todo.js::REALTIME_GROUP_DOMAIN；7 类键直接展开叶子件映射） */
const REALTIME_GROUP_DOMAIN = {
  ...DERIVE_GROUP_DOMAIN,
  'attendance-confirm': WORK_DOMAIN.ATTENDANCE,
  'inspection-confirm': WORK_DOMAIN.INSPECTION,
  'develop-node-remind': WORK_DOMAIN.MEMBER_DEV,
  'half-year-inspection-remind': WORK_DOMAIN.MEMBER_DEV,
  'module-cycle-remind': WORK_DOMAIN.PROJECT,
};

/**
 * 待办行读权限（**单一源** = `routes/resources/todo-read-policy.mjs`，本文件只再导出）。
 * `routes/resources/index.js::_canReadTodoRow` 与本文件同 import 该叶子件 ⇒ 读口 / 派生口一个判据。
 * @param {{personId?:string, role?:string}} row 待办行或范围请求体
 * @param {{id:string, role:string}} actor 会话用户
 */
export { canReadTodoRow };

/**
 * 业务域兼容推断（**单一源** = `todo.js::inferDomain`，同判据精简复刻）。
 * 边界：显式 `domain` 一律原样归一，不做推断覆盖；未知输入 → NONE，不抛错。
 * @param {Object} [todo]
 * @returns {string} WORK_DOMAIN 值
 */
export function inferDomain(todo) {
  if (!todo || typeof todo !== 'object') return WORK_DOMAIN.NONE;
  if (todo.domain) return _LEGACY_DOMAIN[todo.domain] || todo.domain;
  const key = String(todo.actionKey || '');
  const type = String(todo.actionType || '');
  if (key) {
    if (key.startsWith('attendance-')) return WORK_DOMAIN.ATTENDANCE;
    if (key.startsWith('inspection-')) return WORK_DOMAIN.INSPECTION;
    if (key.startsWith('member-') || key.startsWith('semester-')) return WORK_DOMAIN.MEMBER_DEV;
    if (key.startsWith('taskforce-')) return WORK_DOMAIN.PROJECT;
    if (key.startsWith('resolution-')) return WORK_DOMAIN.REPORT_UP;
    if (key.startsWith('archive-') || key.endsWith('-archive')) return WORK_DOMAIN.ARCHIVE;
    if (key.startsWith('handoff-')) {
      return key === 'handoff-inspection-report' ? WORK_DOMAIN.INSPECTION : WORK_DOMAIN.ATTENDANCE;
    }
    // 报名审核（`D-787` 合并后一律「项目」域；sourceType=taskforce 与活动源同域）
    if (key === 'signup-review') return WORK_DOMAIN.PROJECT;
    if (key.startsWith('notice-') || key === 'read') return WORK_DOMAIN.NONE;
  }
  const t = type || key;
  if (t === 'read') return WORK_DOMAIN.NONE;
  // authorize / participate：三会一课场景与活动型在 `D-787` 合并后同属「项目」域（同域键）。
  if (t === 'authorize' || t === 'participate') return WORK_DOMAIN.PROJECT;
  if (t === 'archive') return WORK_DOMAIN.ARCHIVE;
  if (todo.category === 'notice') return WORK_DOMAIN.NONE;
  if (todo.category === 'archive') return WORK_DOMAIN.ARCHIVE;
  return WORK_DOMAIN.NONE;
}

/** 实时组 → 业务域（单一源 = `todo.js::realtimeGroupDomainOf`：先查 actionKey 表，未收录回退 inferDomain） */
export function realtimeGroupDomainOf(group) {
  if (!group || typeof group !== 'object') return WORK_DOMAIN.NONE;
  const key = group.actionKey || group.groupKey;
  if (key && REALTIME_GROUP_DOMAIN[key]) return REALTIME_GROUP_DOMAIN[key];
  return inferDomain(group);
}

// ── 三类确定性复算组（发展节点 / 半年考察 / 模块周期）─────────────────────────────
//  2026-11-09 批次 539：实现已迁入 `docs/src/core/domain/todo-derive.js`（纯函数单一源），
//  本文件只 import 同名函数并按 DB 取同形入参——原此处的「照抄复刻」已删除。

// ── 读面（支部作用域）─────────────────────────────────────────────────────────────

/**
 * 本次请求的支部口径（**单一源** = `branch-scope.js::resolveBranchIdForActor`，T13 · 2026-11-15）：
 *   本人支部；党委选了支部用所选支部；无支部上下文 ⇒ `null`（fail-closed，不再回落缺省支部）。
 */
const _scopeBranchId = (actor, requestedBranchId) => resolveBranchIdForActor(actor, requestedBranchId);

/** 表名 → 资源名（`branch-scope.js::resolveRowBranchId` 的判定键；未列出的表按同名处理） */
const RESOURCE_NAME_OF_TABLE = Object.freeze({
  member_confirmations: 'memberConfirmations',
  member_change_requests: 'memberChangeRequests',
});

/**
 * 支部归属判据（**单一源** = `branch-scope.js::resolveRowBranchId`，T13 · 2026-11-15）：
 *   与 `GET /todos` / 通用资源读口同一解析；解析不出（null）即不属任何支部，不再按缺省支部计入。
 */
function _belongsTo(db, table, row, branchId, reader) {
  if (!row || branchId == null) return false;
  return resolveRowBranchId(db, RESOURCE_NAME_OF_TABLE[table] || table, row, reader) === branchId;
}

/**
 * 「本人 / 本角色」待办读面（**与 `GET /todos` 同口径**：支部作用域 → `canReadTodoRow`）。
 * Task 13 起直接复用读口同一函数 `resourceRowsForActor`（含 `branchLegacy` 兼容期规则），
 *   不再用 `_belongsTo` 复刻一套支部判定（10.7-3/4 两套判据即由此消除）。
 * 用途：成员发展类派生含他人姓名与阶段，只对**本角色确有待办读面**的调用者计算；
 *   读面为空 ⇒ 本节派生返回空，客户端回落自身派生（兼容期可见结果不变）。
 * Task 8 起，本读面同时供 `taskforce-authorize` 实时组装配（只筛选已持久化行，不新造待办）。
 */
function _visibleTodos(db, actor, branchId) {
  return resourceRowsForActor(db, 'todos', listTable(db, 'todos'), actor, branchId, createTableReader(db))
    .filter((row) => canReadTodoRow(row, actor));
}

/** 分支机构成员档案（与 `PersonStore.getMembers()` 的 api 形态同口径：排除已转出） */
function _membersOfBranch(db, branchId) {
  const reader = createTableReader(db);
  return listTable(db, 'users').filter((row) => row && row.transferOut !== true && _belongsTo(db, 'users', row, branchId, reader));
}

/** 「进入当前阶段日期」派生态（单一源 = 成员档案字段 `developStageSince`，同 `member-confirmation.js::loadStageEntryDates`） */
function _stageEntryDates(members) {
  const out = {};
  for (const m of members || []) {
    if (m && m.id && m.developStageSince) out[m.id] = { stage: m.developStage, entryDate: m.developStageSince };
  }
  return out;
}

/** 支部分工快照（同 `branch.js::getBranchWorkforce`：config.workforce 覆盖 + 缺省主责兜底） */
function _workforceOfBranch(db, branchId) {
  const row = db.prepare('SELECT data FROM branches WHERE id = ?').get(String(branchId));
  const config = row ? (JSON.parse(row.data).config || {}) : {};
  return expandWorkforce(config.workforce);
}

/**
 * 支部**有效策略**（批次 541 · D-2）：出厂基准 + 该支部 `config.policyOverrides`（白名单净化后）。
 * 同客户端 `branch.js::getEffectivePolicy` 两步同源（净化 = config-clean，合并 = effectivePolicyWith）
 *   ⇒ 派生组的阈值 / 复核窗与客户端逐值一致，不得在此另写缺省字面量或第二套合并逻辑。
 * @param {import('better-sqlite3').Database} db
 * @param {string} branchId
 * @returns {Object} 有效策略（独立副本，不改全局 POLICY_DEFAULTS）
 */
function _effectivePolicyOfBranch(db, branchId) {
  const row = db.prepare('SELECT data FROM branches WHERE id = ?').get(String(branchId));
  const config = row ? (JSON.parse(row.data).config || {}) : {};
  return effectivePolicyWith(sanitizeConfigPolicyOverrides(config.policyOverrides));
}

// ── 组装配 ────────────────────────────────────────────────────────────────────

/**
 * 实时组角色消费面（与客户端各台消费口径同源）：支书台 5 键 / 组织委员台 3 键 / 纪检台 2 键，
 *   inspection-remind 支书与组织两台上都出现。
 * 读权限前置已由路由按 `canReadTodoRow` 锁死「只能读本角色视图」⇒ 本表只做组归位，不放宽任何读面。
 */
const REALTIME_GROUP_ROLES = {
  'attendance-remind': ['secretary'],
  'inspection-remind': ['secretary', 'org-commissioner'],
  'resolution-followup-remind': ['secretary'],
  'member-confirm': ['secretary'],
  'member-approve': ['org-commissioner'],
  'semester-detained-remind': ['secretary'],
  'taskforce-authorize': ['org-commissioner'],
  'attendance-confirm': ['disc-commissioner'],
  'inspection-confirm': ['disc-commissioner'],
};

/** 本期不在服务端算的实时组：7 类已全部落地 ⇒ 空清单（保留字段与形状，客户端无需区分阶段） */
const UNSUPPORTED_GROUP_KEYS = [];

/** 组 → 响应载荷（字段名与 `components/record/todo-tab-shell.js` / `todo-list.js` 的消费字段一致） */
function _groupPayload(group) {
  const items = Array.isArray(group.items) ? group.items : [];
  return {
    groupKey: group.groupKey,
    domain: realtimeGroupDomainOf(group),
    actionKey: group.actionKey || null,
    title: group.title || '',
    category: group.category || null,
    actionType: group.actionType || null,
    actionData: group.actionData || null,
    deadline: group.deadline || null,
    flow: group.flow || null,
    count: typeof group.count === 'number' ? group.count : items.length,
    items,
  };
}

/** 同 groupKey 只留首条（防同一组双卡 / 重复计数） */
function _dedupeByGroupKey(groups) {
  const seen = new Set();
  const out = [];
  for (const g of groups || []) {
    if (!g || !g.groupKey) continue;
    if (seen.has(g.groupKey)) continue;
    seen.add(g.groupKey);
    out.push(g);
  }
  return out;
}

/**
 * 7 类实时组（Task 8）：服务端只做「读 SQLite → 组装入参 → 按角色/人过滤」，
 * 派生判据全部走 `core/domain/todo-derive.js` 的同名纯函数（与客户端 / 对账测试同一份口径）。
 * @param {import('better-sqlite3').Database} db
 * @param {{actor:Object, role:string, personId:string, branchId:string, policy:Object}} scope
 *   `policy`＝支部有效策略（缺省回退出厂基准，见 `_effectivePolicyOfBranch`）
 * @returns {Array} 原始组对象（未转响应载荷）
 */
function _deriveRealtimeGroups(db, { actor, role, personId, branchId, policy = effectivePolicyWith(null) }) {
  const day = today();
  const groups = [];
  const keys = Object.keys(REALTIME_GROUP_ROLES).filter((key) => REALTIME_GROUP_ROLES[key].includes(role));
  if (!keys.length) return groups;
  const has = (key) => keys.includes(key);
  const reader = createTableReader(db); // 请求内复用（同一次派生只读一遍表）
  const rowsOf = (table) => listTable(db, table).filter((row) => _belongsTo(db, table, row, branchId, reader));

  if (has('attendance-remind')) {
    const group = deriveAttendanceRemindGroup({
      activities: rowsOf('activities'),
      attendanceRecords: rowsOf('attendances'),
      today: day,
      policy: policy.attendance,
    });
    if (group) groups.push(group);
  }

  if (has('inspection-remind')) {
    const group = deriveInspectionRemindGroup({
      inspectionRecords: rowsOf('inspections'),
      persons: _membersOfBranch(db, branchId),
      today: day,
      policy: policy.inspection,
      groupKeyPrefix: role === 'org-commissioner' ? 'org-commissioner' : 'secretary',
    });
    if (group) groups.push(group);
  }

  if (has('resolution-followup-remind')) {
    const group = deriveResolutionFollowupRemindGroup({ activities: rowsOf('activities'), today: day });
    if (group) groups.push(group);
  }

  if (has('member-confirm')) {
    const group = deriveMemberConfirmGroup({
      memberConfirmations: rowsOf('member_confirmations'),
      memberChangeRequests: rowsOf('member_change_requests'),
    });
    if (group) groups.push(group);
  }

  if (has('member-approve')) {
    const group = deriveMemberApproveGroup({ memberChangeRequests: rowsOf('member_change_requests') });
    if (group) groups.push(group);
  }

  if (has('semester-detained-remind')) {
    const group = deriveSemesterDetainedRemindGroup({
      members: _membersOfBranch(db, branchId),
      today: day,
      windows: policy.memberConfirmation.semesterDetainedWindows,
    });
    if (group) groups.push(group);
  }

  if (has('taskforce-authorize')) {
    // 持久化待办行装配（不新造事件派生）：读面与 `GET /todos` 同口径（支部作用域 + canReadTodoRow）
    const group = deriveTaskforceAuthorizeGroup({
      todos: _visibleTodos(db, actor, branchId),
      role,
      personId,
      groupKeyPrefix: role === 'org-commissioner' ? 'org-commissioner' : role,
    });
    if (group) groups.push(group);
  }

  // 纪检台「考勤 / 考察待确认」（批次 539）：判据单一源在 `todo-derive.js`，客户端只展示
  if (has('attendance-confirm')) {
    const group = deriveAttendanceConfirmGroup({
      activities: rowsOf('activities'),
      attendanceRecords: rowsOf('attendances'),
      persons: _membersOfBranch(db, branchId),
      groupKeyPrefix: 'disc-commissioner',
    });
    if (group) groups.push(group);
  }

  if (has('inspection-confirm')) {
    const group = deriveInspectionConfirmGroup({
      activities: rowsOf('activities'),
      inspectionRecords: rowsOf('inspections'),
      persons: _membersOfBranch(db, branchId),
      groupKeyPrefix: 'disc-commissioner',
    });
    if (group) groups.push(group);
  }

  return groups;
}

/**
 * 三类确定性复算实时组（顺序＝客户端同台顺序：发展节点 → 半年考察 → 模块周期）。
 * @param {import('better-sqlite3').Database} db
 * @param {{actor:Object, role:string, personId:string, branchId:string}} scope
 */
function _deriveGroups(db, { actor, role, personId, branchId }) {
  const day = today();
  const groups = [];
  // 支部有效策略（同一请求只取一次）：派生阈值 / 复核窗口径与客户端 `getEffectivePolicy` 同源（D-2）
  const policy = _effectivePolicyOfBranch(db, branchId);
  // ① ② 只在组织委员台派生（客户端单一源：`entries/tabs/org/todo-tab.js::_buildOrgRealtimeGroups`）
  //  2026-11-09 批次 539（P0 漏提醒）：前置门从「有待办行」改为「有成员发展数据」——
  //  待办行为空不得吞掉发展节点 / 半年考察提醒；无 developStage 数据时纯函数自身返回 null（不产空组）。
  if (role === 'org-commissioner') {
    const members = _membersOfBranch(db, branchId);
    const hasDevelopData = members.some((m) => m && (m.developStage || m.developStageSince));
    if (hasDevelopData) {
      const overrides = _stageEntryDates(members);
      const reader = createTableReader(db);
      const records = listTable(db, 'inspections').filter((row) => _belongsTo(db, 'inspections', row, branchId, reader));
      const dev = buildDevelopNodeRemindGroup({ members, overrides, today: day });
      if (dev) groups.push(dev);
      const halfYear = buildHalfYearInspectionRemindGroup({ members, records, overrides, today: day });
      if (halfYear) groups.push(halfYear);
    }
  }
  // ③ 各台通用（客户端单一源：`components/record/todo-tab-shell.js::_moduleCycleGroupsFor`）
  const cycleReader = createTableReader(db);
  const cycle = buildModuleCycleRemindGroup({
    activities: listTable(db, 'activities').filter((row) => _belongsTo(db, 'activities', row, branchId, cycleReader)),
    subjectIds: [role, personId].filter(Boolean),
    snapshot: _workforceOfBranch(db, branchId),
    today: day,
  });
  if (cycle) groups.push(cycle);
  // ④ 7 类实时组（Task 8）：按角色归位，读面沿用支部作用域（详见 `_deriveRealtimeGroups`）
  groups.push(..._deriveRealtimeGroups(db, { actor, role, personId, branchId, policy }));
  return groups.map(_groupPayload);
}

/**
 * 页面 key → 真实角色（批次 536 收尾 · 页签审计 P0）。
 * 客户端按**页面 key** 传 `role`（`entries/tabs/visitor/todo-tab.js` 传 `'visitor'`），
 *   页面 key 不是角色键：visitor 页只服务登录角色 `participant` ⇒ 归一到 `actor.role`
 *   （**仅当** `actor.role === 'participant'`）；其他页面 key（secretary / org / prop / disc / leader）
 *   的壳角色键与角色键同名，保持原样。
 * 归一只在读面解析处发生，**不放宽任何读权限**：非 participant 传 `'visitor'` 仍按 `'visitor'` 判权（→ 403）。
 * @param {string} pageRole 请求里的 role 参数（可能是页面 key）
 * @param {{id:string, role:string}} actor 会话用户
 * @returns {string} 真实角色键
 */
function _normalizeScopeRole(pageRole, actor) {
  if (pageRole === 'visitor' && actor && actor.role === 'participant') return actor.role;
  return pageRole;
}

/**
 * 挂载 `GET /api/v1/todo-groups`（只读）。
 * 装配点：`server/routes/resources/index.js` 的 `registerExtraSemanticRoutes(router, db)` **同一行**
 *   （不新增行 ⇒ `README-server.md` 的 `文件:行号` 取证引用零位移）。
 * @param {import('express').Router} router
 * @param {import('better-sqlite3').Database} db
 */
export function registerTodoGroupRoutes(router, db) {
  router.get('/todo-groups', requireAuth(db), (req, res) => {
    const deny = branchSelectionError(req.actor, req.query.branchId);
    if (deny) return res.status(403).json({ error: deny });
    const actor = req.actor;
    const scopeRole = _normalizeScopeRole(String(req.query.role || actor.role || ''), actor);
    // 读权限门（同 `_canReadTodoRow`）：角色视图只给本角色；到人视图只给本人。
    if (!canReadTodoRow({ role: scopeRole }, actor)) {
      return res.status(403).json({ error: '无权限：只能读取本角色的待办视图' });
    }
    const scopePersonId = req.query.personId ? String(req.query.personId) : String(actor.id);
    if (!canReadTodoRow({ personId: scopePersonId }, actor)) {
      return res.status(403).json({ error: '无权限：不得读取他人的个人待办视图' });
    }
    const branchId = _scopeBranchId(actor, req.query.branchId);
    const groups = _deriveGroups(db, { actor, role: scopeRole, personId: scopePersonId, branchId });
    return res.json({
      role: scopeRole,
      personId: scopePersonId,
      generatedAt: new Date().toISOString(),
      groups: _dedupeByGroupKey(groups),
      unsupported: UNSUPPORTED_GROUP_KEYS.slice(),
    });
  });
}
