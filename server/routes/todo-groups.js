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
//    · 读权限门 = **与 `routes/resources/index.js::_canReadTodoRow` 同口径**（见下方 `canReadTodoRow`
//      注释：该口径单一源在 index.js，本文件复刻同判据；口径变更必须两处同改）。
//    · 本期只算三类「确定性复算」实时组：发展节点提醒 / 半年考察提醒 / 模块周期提醒；
//      其余实时组（考勤·考察队列、决议逾期、成员变更确认、学期末滞留、支委专班）不在服务端算，
//      在 `unsupported` 里逐键标注（客户端派生照旧补位）。
//
//  ⚠ 派生口径的**单一源**：`docs/src/services/governance/todo.js`
//    `buildDevelopNodeRemindGroup`(:303) / `buildHalfYearInspectionRemindGroup`(:366) /
//    `buildModuleCycleRemindGroup`(:430)。该模块顶层依赖 `mockDB` / `data-adapter` / `AuthStore`，
//    **不得整模块 import 到服务端** ⇒ 本文件按同口径复刻（组键 / 标题 / flow / 条目 id 逐字一致）。
//    改任一条派生规则时，客户端单一源与本文件必须同批同改（判定：本批 `todo-groups-api` 测试）。
// ════════════════════════════════════════════════════════════════

import { requireAuth } from './auth.js';
import { listTable } from './resources/store.js';
import { actorBranchId, branchSelectionError } from './resources/branch-scope.js';
// 周期口径（月 / 季 / 半年 / 年）与模块目录：均为零依赖叶子件，服务端直导可载（与客户端同一份口径）
import { WORK_MAP_MODULES, expandWorkforce, moduleIdOfActivity, ownerOfModule } from '../../docs/src/core/domain/work-map.js';
import { cyclePeriodLabel, cyclePeriodOf } from '../../docs/src/core/base/period.js';
import { DEFAULT_BRANCH_ID } from '../../docs/src/core/domain/constants.js';
import { today } from '../services/reporting.js';

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
/** 实时组 actionKey → 业务域（单一源 = todo.js::REALTIME_GROUP_DOMAIN，只保留本端点涉及的键） */
const REALTIME_GROUP_DOMAIN = {
  'develop-node-remind': WORK_DOMAIN.MEMBER_DEV,
  'half-year-inspection-remind': WORK_DOMAIN.MEMBER_DEV,
  'module-cycle-remind': WORK_DOMAIN.PROJECT,
};

/**
 * 待办行读权限（**单一源** = `server/routes/resources/index.js::_canReadTodoRow`，逐字同口径）。
 * 该函数在 index.js 内是模块私有，本文件复刻同一判据，供本端点做「本人 / 本角色」范围校验；
 * **口径变更必须两处同改**（判定：`permission-gate` + `todo-groups-api` 绿）。
 * @param {{personId?:string, role?:string}} row 待办行或范围请求体
 * @param {{id:string, role:string}} actor 会话用户
 */
export function canReadTodoRow(row, actor) {
  if (!row || !actor) return false;
  // 到人主责只给本人；角色待办按当前角色可见（与前端 TodoStore.getByRole 同口径）。
  if (row.personId) return row.personId === actor.id;
  return row.role === actor.role;
}

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

// ── 日期工具（**单一源** = `docs/src/core/base/utils.js` → `date.js`；本地日历日口径 `R-26③`）────
function _pad(n) { return n < 10 ? `0${n}` : `${n}`; }
/** Date → 本地日历日 YYYY-MM-DD（与 `date.js::_fmtDate` 同口径） */
function _fmtDate(d) { return `${d.getFullYear()}-${_pad(d.getMonth() + 1)}-${_pad(d.getDate())}`; }
/** 日期 + N 天（单一源 = `todo.js::_addDays`：UTC 运算避免时区未同步；非法输入 → null） */
function _addDays(dateStr, days) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(dateStr || ''));
  if (!m) return null;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]) + Number(days)));
  return Number.isNaN(d.getTime()) ? null : _fmtDate(d);
}
/** 自然半年期键 'YYYY-H1' / 'YYYY-H2'（单一源 = `todo.js::halfYearPeriodOf`；制度固定，非可调参数） */
function _halfYearPeriodOf(dateStr) {
  const m = /^(\d{4})-(\d{2})/.exec(String(dateStr || ''));
  if (!m) return null;
  const month = Number(m[2]);
  if (month < 1 || month > 12) return null;
  return `${m[1]}-H${month <= 6 ? 1 : 2}`;
}
/** 发展节点期满阈值（单一源 = `todo.js::DEVELOP_NODE_THRESHOLDS`；《发展党员工作细则》一年，常量化） */
const DEVELOP_NODE_THRESHOLDS = { '积极分子': 365, '预备党员': 365 };

// ── 三类派生（逐字对齐 todo.js 的组键 / 标题 / flow / 条目 id）────────────────────────────

/** 发展节点提醒（单一源 = `todo.js::buildDevelopNodeRemindGroup`）：无期满成员 → null（不产生空组卡） */
function _buildDevelopNodeRemindGroup({ members = [], overrides = {}, day }) {
  const items = [];
  for (const p of members || []) {
    if (!p || !p.id) continue;
    const ov = overrides[p.id] || {};
    const stage = ov.stage || p.developStage;
    const days = DEVELOP_NODE_THRESHOLDS[stage];
    if (!days) continue;
    const entryDate = ov.entryDate || p.entryDate || null;
    if (!entryDate) continue;
    const dueDate = _addDays(entryDate, days);
    if (!dueDate || dueDate > day) continue;
    items.push({
      id: `dev-${p.id}`,
      personId: p.id,
      name: p.name,
      stage,
      entryDate,
      dueDate,
      title: stage === '预备党员' ? `${p.name} 预备期满（应办转正）` : `${p.name} 培养考察期满（应转发展对象）`,
    });
  }
  if (!items.length) return null;
  return {
    groupKey: 'org-commissioner:develop-node-remind',
    actionKey: 'develop-node-remind',
    domain: WORK_DOMAIN.MEMBER_DEV,
    title: '发展节点提醒',
    flow: '发展阶段进入期满 → 组织委员办理下一节点（积极分子→发展对象 / 预备党员→转正）',
    count: items.length,
    items,
  };
}

/** 半年考察提醒（单一源 = `todo.js::buildHalfYearInspectionRemindGroup`）：本半年无考察记录才提醒 */
function _buildHalfYearInspectionRemindGroup({ members = [], records = [], overrides = {}, day }) {
  const period = _halfYearPeriodOf(day);
  if (!period) return null;
  const covered = new Set();
  for (const r of records || []) {
    if (!r || !r.personId) continue;
    if (_halfYearPeriodOf(String(r.recordedAt || '').slice(0, 10)) === period) covered.add(r.personId);
  }
  const items = [];
  for (const p of members || []) {
    if (!p || !p.id) continue;
    const stage = (overrides[p.id] || {}).stage || p.developStage;
    if (!DEVELOP_NODE_THRESHOLDS[stage]) continue;
    if (covered.has(p.id)) continue;
    items.push({
      id: `halfyear-${p.id}`,
      personId: p.id,
      name: p.name,
      stage,
      period,
      title: `${p.name} · 本半年考察意见待更新`,
    });
  }
  if (!items.length) return null;
  return {
    groupKey: 'org-commissioner:half-year-inspection-remind',
    actionKey: 'half-year-inspection-remind',
    domain: WORK_DOMAIN.MEMBER_DEV,
    title: `半年考察提醒（${period}）`,
    flow: '考察意见半年一次（制度固定）→ 本半年内无考察记录 → 组织委员核对建档；考察记录的督办位仍在纪检台',
    count: items.length,
    items,
  };
}

/** 模块周期提醒（单一源 = `todo.js::buildModuleCycleRemindGroup`）：只列本主体主责、本期未见开展的模块 */
function _buildModuleCycleRemindGroup({ activities = [], subjectIds = [], snapshot = null, day }) {
  const ids = (Array.isArray(subjectIds) ? subjectIds : [subjectIds]).filter(Boolean);
  if (!ids.length) return null;
  const snap = expandWorkforce(snapshot);
  if (!/^\d{4}-\d{2}/.test(String(day))) return null;
  const items = [];
  for (const m of WORK_MAP_MODULES || []) {
    const cyc = m.cycle;
    if (!cyc || !cyc.unit) continue;
    const owner = ownerOfModule(m.id, snap);
    if (!owner || !ids.includes(owner.ownerId)) continue;
    const period = cyclePeriodOf(day, cyc.unit);
    if (!period) continue;
    const done = (activities || []).some((a) => {
      if (!a || moduleIdOfActivity(a) !== m.id) return false;
      const d = String(a.date || '').slice(0, 10);
      return !!d && cyclePeriodOf(d, cyc.unit) === period;
    });
    if (done) continue;
    items.push({
      id: `cycle-${m.id}-${period}`,
      moduleId: m.id,
      moduleName: m.name,
      period,
      ownerType: owner.ownerType,
      ownerId: owner.ownerId,
      title: `${cyclePeriodLabel(period, cyc.unit)}的「${m.name}」尚未开展`,
    });
  }
  if (!items.length) return null;
  return {
    groupKey: 'module-cycle-remind',
    actionKey: 'module-cycle-remind',
    domain: WORK_DOMAIN.PROJECT,
    title: '本周期尚未开展（支部分工模块）',
    flow: '模块周期（母本可核者）→ 本期未见对应活动 → 主责人据此组织；不派任务、不改数据',
    count: items.length,
    items,
  };
}

// ── 读面（支部作用域）─────────────────────────────────────────────────────────────

/** 本次请求的支部口径：本人支部；党委选了支部用所选支部；解析不出回落缺省支部（同 `actorBranchId` 口径） */
function _scopeBranchId(actor, requestedBranchId) {
  return actorBranchId(actor) || (requestedBranchId ? String(requestedBranchId) : DEFAULT_BRANCH_ID);
}

/** 支部归属判据：与 `branch-scope.js::resourceBranchId` 同口径（历史缺字段按缺省支部） */
function _belongsTo(row, branchId) {
  return !!row && (row.branchId || DEFAULT_BRANCH_ID) === branchId;
}

/**
 * 「本人 / 本角色」待办读面（**与 `GET /todos` 同口径**：支部作用域 → `canReadTodoRow`）。
 * 用途：成员发展类派生含他人姓名与阶段，只对**本角色确有待办读面**的调用者计算；
 *   读面为空 ⇒ 本节派生返回空，客户端回落自身派生（兼容期可见结果不变）。
 * 本端点**不消费**待办行做派生（三类派生只吃 users / inspections / activities / branches）。
 */
function _visibleTodos(db, actor, branchId) {
  return listTable(db, 'todos')
    .filter((row) => _belongsTo(row, branchId))
    .filter((row) => canReadTodoRow(row, actor));
}

/** 分支机构成员档案（与 `PersonStore.getMembers()` 的 api 形态同口径：排除已转出） */
function _membersOfBranch(db, branchId) {
  return listTable(db, 'users').filter((row) => row && row.transferOut !== true && _belongsTo(row, branchId));
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

// ── 组装配 ────────────────────────────────────────────────────────────────────

/** 本期不在服务端算的实时组（客户端单一源见各派生点；逐键在 `unsupported` 标注） */
const UNSUPPORTED_GROUP_KEYS = [
  'attendance-remind',            // 考勤待录入 / 待确认队列（secretary-overview.js::SecretaryTodoDeriver）
  'inspection-remind',            // 考察待确认 / 超期队列（同上）
  'resolution-followup-remind',   // 决议逾期（services/governance/resolution-followup.js）
  'member-confirm',               // 成员变更确认（components/governance/member-change-panel.js）
  'member-approve',               // 成员变更待审批（entries/tabs/org/todo-tab.js）
  'semester-detained-remind',     // 学期末滞留维护（todo.js::LifecycleTodoDeriver）
  'taskforce-authorize',          // 支委专班赋权（todo.js::LifecycleTodoDeriver）
];

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
 * 三类确定性复算实时组（顺序＝客户端同台顺序：发展节点 → 半年考察 → 模块周期）。
 * @param {import('better-sqlite3').Database} db
 * @param {{actor:Object, role:string, personId:string, branchId:string}} scope
 */
function _deriveGroups(db, { actor, role, personId, branchId }) {
  const day = today();
  const groups = [];
  // ① ② 只在组织委员台派生（客户端单一源：`entries/tabs/org/todo-tab.js::_buildOrgRealtimeGroups`）
  if (role === 'org-commissioner' && _visibleTodos(db, actor, branchId).length > 0) {
    const members = _membersOfBranch(db, branchId);
    const overrides = _stageEntryDates(members);
    const records = listTable(db, 'inspections').filter((row) => _belongsTo(row, branchId));
    const dev = _buildDevelopNodeRemindGroup({ members, overrides, day });
    if (dev) groups.push(dev);
    const halfYear = _buildHalfYearInspectionRemindGroup({ members, records, overrides, day });
    if (halfYear) groups.push(halfYear);
  }
  // ③ 各台通用（客户端单一源：`components/record/todo-tab-shell.js::_moduleCycleGroupsFor`）
  const cycle = _buildModuleCycleRemindGroup({
    activities: listTable(db, 'activities').filter((row) => _belongsTo(row, branchId)),
    subjectIds: [role, personId].filter(Boolean),
    snapshot: _workforceOfBranch(db, branchId),
    day,
  });
  if (cycle) groups.push(cycle);
  return groups.map(_groupPayload);
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
    const scopeRole = String(req.query.role || actor.role || '');
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
