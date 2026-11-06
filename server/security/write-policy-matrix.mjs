// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  server/security/write-policy-matrix.mjs —— **写入口权限矩阵（唯一机读源）**
//
//  为什么要有这一份：
//   · 审计 C1 过去只按中间件字符串判断（`write.gate === 'requireAuth'`），会把 `signups` 这类
//     「中间件是 requireAuth、真正的判据在 handler / 专用 guard 里」的写口误记为「仅登录」。
//     判据必须落在**真实行为**上（`D-677` API 优先），所以矩阵一行描述一个写口，
//     把「中间件 → 资源门 → 归属/字段锁 → 证据」一次写清。
//   · 矩阵是**单一源**：测试用 Express 运行期路由表与它做完全相等断言；审计 C1 查它，
//     不再自己维护第二份路由/门清单。新增写口必须同批补这里（否则守卫判红）。
//
//  口径：
//   · 通用资源（RESOURCE_TABLES）行**循环生成**，门名从 `RESOURCE_WRITE_GATE` 读取，
//     不手抄一份易漂移的表；只有 `activities/attendances/taskforces/signups/actSubRecords/
//     tfSubRecords` 这些「无资源门、判据在 handler」的资源在本文件的 RESOURCE_META 里补描述。
//   · status：
//       enforced    —— 有真实角色/归属/动作判据（含「永久拒绝」的硬闸）；
//       self-service—— 按设计只允许本人写自己的记录（申诉/报名/本人档案等）；
//       public      —— 显式公开写口（登录/登出）；
//       known-risk  —— 只有登录（或仅支部范围）约束、没有角色/归属判据的真实缺口，
//                      必须同时给 reason / impact / riskRef（回链阻断风险编号）。
//   · 本文件**不改**任何路由、不挂中间件；它只是判据的机读投影。
// ════════════════════════════════════════════════════════════════

import { RESOURCE_TABLES } from '../routes/resources/store.js';
import { RESOURCE_WRITE_GATE, COMMISSIONER_WRITE_RESOURCES } from '../routes/resources/gates.js';

/** 允许的 status（测试与审计共用；新增状态须同批改测试） */
export const WRITE_POLICY_STATUSES = Object.freeze(['enforced', 'self-service', 'public', 'known-risk']);

/** 阻断风险编号：`.ctx/ENGINEERING_ASSESSMENT.md` §阻断级风险 第 2 条（多数通用写口只验证登录） */
export const KNOWN_RISK_REF = 'ENGINEERING_ASSESSMENT 阻断风险 2';

const WRITE_METHODS = Object.freeze(['POST', 'PATCH', 'DELETE']);
const METHOD_KEY = Object.freeze({ POST: 'post', PATCH: 'patch', DELETE: 'delete' });

/** 资源门 → 归属口径（用于把门名翻成可读的 ownership；个别资源在 RESOURCE_META 覆盖） */
const GATE_OWNERSHIP = Object.freeze({
  'party-staff': 'party-staff',
  'branch-committee': 'branch',
  'notice-publish': 'branch',
  'notice-manage': 'branch',
  secretary: 'branch',
  'member-flow': 'branch',
  inspection: 'organizer',
  'todo-row': 'self',
  'thought-report': 'self',
  'task-row': 'self',
  'assignment-row': 'self',
  'committee-only': 'branch',
  'committee-or-organizer': 'organizer',
  'party-staff-only': 'party-staff',
  'vote-row': 'self',
  'branch-commissioner': 'branch',
});

/**
 * 资源级覆盖：仅登记「资源门之外还有 handler 判据」或「没有资源门」的表。
 * 这样通用循环仍以 RESOURCE_WRITE_GATE 为单一源；本表只补描述，不复制门名。
 */
const RESOURCE_META = {
  activities: {
    roleGate: {
      POST: '_assertActivityWrite + activityCreationDeny + _assertCapabilityPackageEnabled',
      PATCH: '_assertActivityWrite + activityOperationAllowed + _activityApprovalGateDeny',
      DELETE: '_assertActivityWrite + activityOperationAllowed + _assertCapabilityPackageEnabled',
    },
    ownership: 'organizer',
    fieldLocks: {
      POST: ['createdBy（服务端会话）', 'workgroupId（服务端派生）', 'voteConfig（无记名强制）'],
      PATCH: ['assignments（须走 /workgroups/:id/members）', 'organizingScope/hostGroupId（创建后不可修改）', 'voteConfig（无记名强制）'],
      DELETE: [],
    },
    evidence: 'server/routes/resources/gates.js::_assertActivityWrite; server/routes/resources/workgroup-routes.js::activityOperationAllowed; server/test/permission-gate.test.mjs',
  },
  attendances: {
    roleGate: {
      POST: 'attendanceWriteDeny',
      PATCH: 'attendanceConfirmDeny / attendanceWriteDeny',
      DELETE: 'attendance-row：支委层/党委 ∪ 本场活动组织者 ∪ recordedBy/submittedBy 本人',
    },
    ownership: { POST: 'organizer', PATCH: 'self/organizer', DELETE: 'organizer' },
    fieldLocks: {
      POST: ['recordedBy（服务端会话）'],
      PATCH: ['recordedBy', 'confirmedBy/confirmedAt（服务端会话）'],
      DELETE: [],
    },
    status: { POST: 'enforced', PATCH: 'enforced', DELETE: 'enforced' },
    evidence: 'server/routes/resources/gates.js::attendance-row/_attendanceDeleteAllowed（读旧行判定）; server/routes/resources/workgroup-routes.js::attendanceWriteDeny/attendanceConfirmDeny; server/test/write-policy-gaps.test.mjs; server/test/r3-data-permission-regression.test.mjs',
  },
  taskforces: {
    roleGate: {
      POST: 'org-commissioner / secretary / deputy-secretary',
      PATCH: 'org-commissioner / secretary / deputy-secretary',
      DELETE: '永久 409（工作组及关联历史不得物理删除）',
    },
    ownership: 'branch',
    fieldLocks: {
      POST: ['createdBy（服务端会话）', 'workgroupId（服务端派生）', 'status（终态不可直建）'],
      PATCH: ['members/activityId/branchId（须走工作组语义接口）', '终态（须走收尾接口）'],
      DELETE: [],
    },
    evidence: 'server/routes/resources/index.js#L457-L466,#L724-L745,#L885-L889; server/test/taskforce-lifecycle.test.mjs',
  },
  signups: {
    roleGate: {
      POST: 'signupCreateDeny（本人 + 来源开放 + 角色/状态/留痕白名单）',
      PATCH: 'normalizeSignupPatch / transitionSignup（本人撤回、审核人、支委作废）',
      DELETE: '永久 409（报名记录须保留，走撤回/取消/作废留痕）',
    },
    ownership: 'self',
    fieldLocks: {
      POST: ['status（按角色服务端确定）', 'reviewedBy/reviewedAt/void*（新报名不得携带）'],
      PATCH: ['sourceType/sourceId/personId/role/branchId/createdAt/note/onsite（创建后不可修改）'],
      DELETE: [],
    },
    evidence: 'server/routes/resources/signup-write-guard.js; server/test/signup-onsite-roster.test.mjs; server/test/soft-void.test.mjs',
  },
  actSubRecords: {
    roleGate: {
      POST: 'aggregateWriteDeny（父记录同支部）+ aggregateSubRecordWriteDeny（支委层/党委 ∪ 父活动组织者/深度参与者）',
      PATCH: 'aggregateWriteDeny（父记录同支部）+ aggregateSubRecordWriteDeny（按变更父键复算；防挪到他人父记录）',
      DELETE: '永久 403（聚合根不可物理删除）',
    },
    ownership: 'organizer',
    fieldLocks: { POST: [], PATCH: [], DELETE: [] },
    status: { POST: 'enforced', PATCH: 'enforced', DELETE: 'enforced' },
    evidence: 'server/routes/resources/branch-scope.js::aggregateWriteDeny; server/routes/resources/gates.js::aggregateSubRecordWriteDeny/_snapshotAggregateSubRecordDeny（快照写穿同判据）; server/routes/resources/index.js#L418-L421,#L602-L609; server/test/write-policy-gaps.test.mjs; server/test/security-redteam.test.mjs',
  },
  tfSubRecords: {
    roleGate: {
      POST: 'aggregateWriteDeny（父记录同支部）+ aggregateSubRecordWriteDeny（支委层/党委 ∪ 父专班组织者/深度参与者）',
      PATCH: 'aggregateWriteDeny（父记录同支部）+ aggregateSubRecordWriteDeny（按变更父键复算；防挪到他人父记录）',
      DELETE: '永久 403（聚合根不可物理删除）',
    },
    ownership: 'organizer',
    fieldLocks: { POST: [], PATCH: [], DELETE: [] },
    status: { POST: 'enforced', PATCH: 'enforced', DELETE: 'enforced' },
    evidence: 'server/routes/resources/branch-scope.js::aggregateWriteDeny; server/routes/resources/gates.js::aggregateSubRecordWriteDeny/_snapshotAggregateSubRecordDeny（快照写穿同判据）; server/routes/resources/index.js#L418-L421,#L602-L609; server/test/write-policy-gaps.test.mjs; server/test/security-redteam.test.mjs',
  },
};

function valueFor(spec, method, fallback = undefined) {
  if (spec === undefined || spec === null) return fallback;
  if (typeof spec === 'object' && !Array.isArray(spec)) {
    return Object.prototype.hasOwnProperty.call(spec, method) ? spec[method] : fallback;
  }
  return spec;
}

function gateFor(name, method) {
  const gate = RESOURCE_WRITE_GATE[name];
  if (!gate) return null;
  return typeof gate === 'string' ? gate : gate[METHOD_KEY[method]] || null;
}

function resourceRow(name, method) {
  const meta = RESOURCE_META[name] || {};
  const params = method === 'POST' ? `/${name}` : `/${name}/:id`;
  const gate = gateFor(name, method);
  const commissionerOnly = COMMISSIONER_WRITE_RESOURCES.has(name);
  const status = valueFor(meta.status, method, 'enforced');
  const row = {
    method,
    path: `/api/v1${params}`,
    resource: name,
    middleware: commissionerOnly ? 'requireCommissioner' : 'requireAuth',
    roleGate: valueFor(meta.roleGate, method)
      || (gate
        ? `RESOURCE_WRITE_GATE.${name}${typeof RESOURCE_WRITE_GATE[name] === 'string' ? '' : `.${METHOD_KEY[method]}`} → ${gate}`
        : commissionerOnly
          ? 'COMMISSIONER_WRITE_RESOURCES → requireCommissioner（支委层）'
          : 'requireAuth（无资源写门）'),
    ownership: valueFor(meta.ownership, method, (gate && GATE_OWNERSHIP[gate]) || (commissionerOnly ? 'branch' : 'none')),
    fieldLocks: valueFor(meta.fieldLocks, method, []),
    evidence: meta.evidence || 'server/routes/resources/gates.js::RESOURCE_WRITE_GATE + _assertResourceWrite',
    status,
  };
  if (status === 'known-risk') {
    row.reason = valueFor(meta.reason, method, '该写口未登记 known-risk 理由');
    row.impact = valueFor(meta.impact, method, '该写口未登记 known-risk 影响');
    row.riskRef = KNOWN_RISK_REF;
  }
  return row;
}

/**
 * 非资源表的语义 / 专用写口（人工核对后落表）。
 * ⚠ 这是矩阵的**唯一**一份语义写口清单；测试只与运行期路由表比较，不再手写第二份。
 */
const NON_RESOURCE_ROWS = [
  // ── resources/semantic-routes.js ────────────────────────────────
  {
    method: 'POST', path: '/api/v1/attendance-appeals', resource: 'attendanceAppeals',
    middleware: 'requireAuth', roleGate: 'submitAppeal：personId === actor.id', ownership: 'self',
    fieldLocks: ['personId（须为本人）', 'status（服务端置 pending）'],
    evidence: 'server/routes/resources/semantic-routes.js#L51-L72', status: 'self-service',
  },
  {
    method: 'PATCH', path: '/api/v1/attendance-appeals/:id', resource: 'attendanceAppeals',
    middleware: 'requireRole(APPEAL_DISPOSITION_ROLE_SET)', roleGate: '支委层 + 党小组组长', ownership: 'branch',
    fieldLocks: ['status', 'note'],
    evidence: 'server/routes/resources/semantic-routes.js#L74-L91', status: 'enforced',
  },
  {
    method: 'POST', path: '/api/v1/inspection-appeals', resource: 'inspectionAppeals',
    middleware: 'requireAuth', roleGate: 'submitAppeal：personId === actor.id', ownership: 'self',
    fieldLocks: ['personId（须为本人）', 'status（服务端置 pending）'],
    evidence: 'server/routes/resources/semantic-routes.js#L51-L72', status: 'self-service',
  },
  {
    method: 'PATCH', path: '/api/v1/inspection-appeals/:id', resource: 'inspectionAppeals',
    middleware: 'requireRole(APPEAL_DISPOSITION_ROLE_SET)', roleGate: '支委层 + 党小组组长', ownership: 'branch',
    fieldLocks: ['status', 'note'],
    evidence: 'server/routes/resources/semantic-routes.js#L74-L91', status: 'enforced',
  },
  {
    method: 'POST', path: '/api/v1/issue-unread', resource: 'issueUnread',
    middleware: 'requireAuth', roleGate: 'issueUnreadWriteDeny：本人 ∪ 派发位（支委层/党小组组长/党委）∪ 事项当事人（secretary-review）', ownership: 'self/organizer',
    fieldLocks: ['assigneeId', 'issueId', 'unread'],
    evidence: 'server/routes/resources/semantic-routes.js::issueUnreadWriteDeny; server/test/write-policy-gaps.test.mjs',
    status: 'enforced',
  },
  {
    method: 'POST', path: '/api/v1/auth-audit', resource: 'authAudit',
    middleware: 'requireAuth', roleGate: 'mutationProven：须能证明对应授权变更已发生', ownership: 'branch',
    fieldLocks: ['authorizedBy/authorizedAt（服务端会话）', 'branchId（须与授权对象一致）'],
    evidence: 'server/routes/resources/semantic-routes.js#L155-L249', status: 'enforced',
  },
  {
    method: 'POST', path: '/api/v1/branches/:id/appointments', resource: 'appointmentRecords',
    middleware: 'requireRole(PARTY_STAFF_ROLE)', roleGate: 'party-staff', ownership: 'party-staff',
    fieldLocks: ['appointedBy/from/id（服务端生成）'],
    evidence: 'server/routes/resources/semantic-routes.js#L254', status: 'enforced',
  },
  {
    method: 'POST', path: '/api/v1/branches/:id/branch-commissioners', resource: 'users',
    middleware: 'requireRole(SECRETARY_AND_DEPUTY_ROLE_SET)', roleGate: 'branchCommissionerWriteDeny（本支部支书/副支书）', ownership: 'branch',
    fieldLocks: ['role（仅支委白名单；secretary/deputy 归党委）'],
    evidence: 'server/routes/resources/semantic-routes.js#L343; docs/src/core/domain/constants.js::branchCommissionerWriteDeny', status: 'enforced',
  },
  {
    method: 'POST', path: '/api/v1/handoffs', resource: 'handoffs',
    middleware: 'requireAuth', roleGate: 'HANDOFF_TYPES[type].from === actor.role', ownership: 'branch',
    fieldLocks: ['from/to（由类型派生）', 'status（按自动交接类型服务端确定）'],
    evidence: 'server/routes/resources/semantic-routes.js#L443-L476', status: 'enforced',
  },
  {
    method: 'POST', path: '/api/v1/handoffs/:id/confirm', resource: 'handoffs',
    middleware: 'requireAuth', roleGate: 'row.to === actor.role（仅接收方）', ownership: 'branch',
    fieldLocks: ['confirmedBy/confirmedAt（服务端会话）'],
    evidence: 'server/routes/resources/semantic-routes.js#L478-L487', status: 'enforced',
  },
  {
    method: 'POST', path: '/api/v1/member-confirmations', resource: 'memberConfirmations',
    middleware: 'requireRole(ORG_COMMISSIONER_ROLE_SET)', roleGate: '组织委员', ownership: 'branch',
    fieldLocks: ['status（服务端置 pending）', 'decidedBy/decidedAt'],
    evidence: 'server/routes/resources/semantic-routes.js#L498-L523', status: 'enforced',
  },
  {
    method: 'POST', path: '/api/v1/member-confirmations/:id/decide', resource: 'memberConfirmations',
    middleware: 'requireRole(SECRETARY_AND_DEPUTY_ROLE_SET)', roleGate: '支书/副支书', ownership: 'branch',
    fieldLocks: ['decidedBy/decidedAt（服务端会话）'],
    evidence: 'server/routes/resources/semantic-routes.js#L524-L537', status: 'enforced',
  },

  // ── resources/index.js 语义写口 ─────────────────────────────────
  {
    method: 'POST', path: '/api/v1/branches', resource: 'branches',
    middleware: 'requireAuth', roleGate: 'PARTY_STAFF_ROLE（handler 内判定）', ownership: 'party-staff',
    fieldLocks: ['secretaryId（新建空缺，待任命）'],
    evidence: 'server/routes/resources/index.js#L927-L986', status: 'enforced',
  },
  {
    method: 'POST', path: '/api/v1/activities/:id/archive', resource: 'activities',
    middleware: 'requireAuth', roleGate: 'activityOperationAllowed(activity.edit)', ownership: 'organizer',
    fieldLocks: ['archived/archivedAt（服务端会话）'],
    evidence: 'server/routes/resources/index.js#L992-L997; server/routes/resources/workgroup-routes.js::activityOperationAllowed', status: 'enforced',
  },
  {
    method: 'POST', path: '/api/v1/activities/:id/brand', resource: 'activities',
    middleware: 'requireRole(BRANCH_COMMITTEE_ROLES)', roleGate: '支委层；仅允许取消品牌（认定须走支委会议程）', ownership: 'branch',
    fieldLocks: ['isBrand（只能 true → false）', 'brandRevokedBy/At（服务端会话）'],
    evidence: 'server/routes/resources/index.js#L1060-L1070', status: 'enforced',
  },
  {
    method: 'POST', path: '/api/v1/snapshot', resource: 'snapshot',
    middleware: 'requireAuth', roleGate: '_snapshotResourceWriteGateDeny + _snapshotAggregateSubRecordDeny + scope/approval gates（逐集合复算）', ownership: 'branch',
    fieldLocks: ['_versions（逐集合乐观锁）', 'users/branches（由 snapshotScopeDeny 整体拒绝）'],
    evidence: 'server/routes/resources/index.js#L1088; server/routes/resources/gates.js::_snapshotResourceWriteGateDeny/_snapshotAggregateSubRecordDeny; server/test/permission-gate.test.mjs; server/test/security-redteam.test.mjs', status: 'enforced',
  },
  {
    method: 'PATCH', path: '/api/v1/branches/:id/config', resource: 'branches',
    middleware: 'requireAuth', roleGate: 'party-staff / 本支部支书·副支书；域负责人仅本域 policyOverrides', ownership: 'branch',
    fieldLocks: ['config.modules/blocks/capabilityPackages（域负责人不可写）', 'configChangeHistory（服务端追加）'],
    evidence: 'server/routes/resources/index.js#L1156-L1176; server/test/branch-config-audit.test.mjs', status: 'enforced',
  },
  {
    method: 'PATCH', path: '/api/v1/branches/:id/config/rollback', resource: 'branches',
    middleware: 'requireAuth', roleGate: 'party-staff / 本支部支书·副支书', ownership: 'branch',
    fieldLocks: ['CONFIG_ROLLBACK_KEYS（单键白名单）', 'configChangeHistory（服务端追加回滚行）'],
    evidence: 'server/routes/resources/index.js#L1341-L1352', status: 'enforced',
  },
  {
    method: 'POST', path: '/api/v1/issues', resource: 'issues',
    middleware: 'requireAuth', roleGate: '须有支部归属（党委账号拒绝）；本人提交', ownership: 'self',
    fieldLocks: ['submittedBy/_realPersonId（服务端会话）', 'status（服务端置 open）', 'tokenHash（服务端生成）'],
    evidence: 'server/routes/resources/index.js#L1483-L1579', status: 'self-service',
  },
  {
    method: 'PATCH', path: '/api/v1/issues/:id', resource: 'issues',
    middleware: 'requireRole(ISSUE_DISPOSITION_SET)', roleGate: '支委层处置位 + 同支部', ownership: 'branch',
    fieldLocks: ['白名单字段局部合并（不擦匿名真身）'],
    evidence: 'server/routes/resources/index.js#L1588', status: 'enforced',
  },

  // ── resources/workgroup-routes.js ───────────────────────────────
  {
    method: 'PUT', path: '/api/v1/workgroups/:id/members', resource: 'workgroupMembers',
    middleware: 'requireAuth', roleGate: 'canManageWorkgroup', ownership: 'organizer',
    fieldLocks: ['成员操作者/审计字段（服务端生成）'],
    evidence: 'server/routes/resources/workgroup-routes.js#L656-L660; server/test/workgroup-member-semantics.test.mjs', status: 'enforced',
  },
  {
    method: 'POST', path: '/api/v1/workgroups/:id/members', resource: 'workgroupMembers',
    middleware: 'requireAuth', roleGate: 'canManageWorkgroup ∪ workgroup.members.manage', ownership: 'organizer',
    fieldLocks: ['createdBy/updatedBy（服务端会话）'],
    evidence: 'server/routes/resources/workgroup-routes.js#L807-L811', status: 'enforced',
  },
  {
    method: 'DELETE', path: '/api/v1/workgroups/:id/members/:personId', resource: 'workgroupMembers',
    middleware: 'requireAuth', roleGate: 'canManageWorkgroup ∪ workgroup.members.manage', ownership: 'organizer',
    fieldLocks: ['removedBy/removedAt（服务端会话）'],
    evidence: 'server/routes/resources/workgroup-routes.js#L871-L876', status: 'enforced',
  },
  {
    method: 'POST', path: '/api/v1/workgroups/:id/coordinate', resource: 'workgroups',
    middleware: 'requireAuth', roleGate: 'org-commissioner / secretary / deputy-secretary + 同支部', ownership: 'branch',
    fieldLocks: ['crossGroupCoordinatedBy/At（服务端会话）'],
    evidence: 'server/routes/resources/workgroup-routes.js#L922-L929', status: 'enforced',
  },
  {
    method: 'POST', path: '/api/v1/workgroups/:id/grants', resource: 'workgroupGrants',
    middleware: 'requireAuth', roleGate: 'canManageWorkgroup', ownership: 'organizer',
    fieldLocks: ['grantedBy/grantedAt（服务端会话）'],
    evidence: 'server/routes/resources/workgroup-routes.js#L980-L984', status: 'enforced',
  },
  {
    method: 'POST', path: '/api/v1/workgroups/:id/grants/:grantId/revoke', resource: 'workgroupGrants',
    middleware: 'requireAuth', roleGate: 'canManageWorkgroup', ownership: 'organizer',
    fieldLocks: ['revokedBy/revokedAt（服务端会话）'],
    evidence: 'server/routes/resources/workgroup-routes.js#L1009-L1014', status: 'enforced',
  },
  {
    method: 'POST', path: '/api/v1/workgroups/:id/tasks', resource: 'workgroupTasks',
    middleware: 'requireAuth', roleGate: 'canManageWorkgroup ∪ task.manage', ownership: 'organizer',
    fieldLocks: ['createdBy/updatedBy（服务端会话）'],
    evidence: 'server/routes/resources/workgroup-routes.js#L1031-L1035', status: 'enforced',
  },
  {
    method: 'PATCH', path: '/api/v1/workgroups/:id/tasks/:taskId', resource: 'workgroupTasks',
    middleware: 'requireAuth', roleGate: 'canManageWorkgroup ∪ task.complete', ownership: 'organizer',
    fieldLocks: ['completedBy/completedAt（服务端会话）'],
    evidence: 'server/routes/resources/workgroup-routes.js#L1064-L1073', status: 'enforced',
  },
  {
    method: 'POST', path: '/api/v1/workgroups/:id/outputs', resource: 'workgroupOutputs',
    middleware: 'requireAuth', roleGate: 'canManageWorkgroup ∪ output.submit', ownership: 'organizer',
    fieldLocks: ['submittedBy/submittedAt（服务端会话）'],
    evidence: 'server/routes/resources/workgroup-routes.js#L1099-L1103', status: 'enforced',
  },
  {
    method: 'POST', path: '/api/v1/taskforces/:id/dissolution', resource: 'taskforces',
    middleware: 'requireAuth', roleGate: 'org-commissioner / secretary / deputy-secretary + 同支部', ownership: 'branch',
    fieldLocks: ['dissolvedBy/dissolvedAt（服务端会话）'],
    evidence: 'server/routes/resources/workgroup-routes.js#L1138-L1146; server/test/taskforce-lifecycle.test.mjs', status: 'enforced',
  },
  {
    method: 'PUT', path: '/api/v1/activities/:id/expected-roster', resource: 'attendanceRosters',
    middleware: 'requireAuth', roleGate: '支委层 ∪ attendanceOperationAllowed（可录入该场考勤者）', ownership: 'organizer',
    fieldLocks: ['personIds（服务端按报名派生）', 'frozenBy/frozenAt（服务端会话）'],
    evidence: 'server/routes/resources/workgroup-routes.js#L1215-L1225; server/test/attendance-roster-union.test.mjs', status: 'enforced',
  },

  // ── auth / uploads / roster / iaaa / committee / member / report / system-notices ──
  {
    method: 'POST', path: '/api/v1/auth/login', resource: 'auth',
    middleware: 'none', roleGate: 'public（口令校验）', ownership: 'none', fieldLocks: [],
    evidence: 'server/routes/auth.js#L23; server/test/auth-password.test.mjs', status: 'public',
  },
  {
    method: 'POST', path: '/api/v1/auth/logout', resource: 'auth',
    middleware: 'none', roleGate: 'public（仅清会话）', ownership: 'none', fieldLocks: [],
    evidence: 'server/routes/auth.js#L50', status: 'public',
  },
  {
    method: 'POST', path: '/api/v1/uploads', resource: 'uploads',
    middleware: 'requireCommissioner', roleGate: '支委层', ownership: 'branch', fieldLocks: ['文件名/路径（服务端生成）'],
    evidence: 'server/routes/uploads.js#L70; server/test/branch-doc.test.mjs', status: 'enforced',
  },
  {
    method: 'PUT', path: '/api/v1/branches/:id/roster', resource: 'users',
    middleware: 'requireAuth', roleGate: 'actor.role === party-staff（handler 内判定）', ownership: 'party-staff',
    fieldLocks: ['members 白名单', 'branchId（目标支部固定）'],
    evidence: 'server/routes/branch-roster.js#L81-L86; server/test/branch-roster-import.test.mjs', status: 'enforced',
  },
  {
    method: 'POST', path: '/api/v1/auth/iaaa/bind-branch', resource: 'auth',
    middleware: 'requireAuth', roleGate: '本人且尚未归属支部', ownership: 'self', fieldLocks: ['branchId → joinIntent（须待支部确认）'],
    evidence: 'server/routes/iaaa.js#L202-L211; server/test/iaaa-onboarding.test.mjs', status: 'self-service',
  },
  {
    method: 'POST', path: '/api/v1/auth/iaaa/pending/:personId/approve', resource: 'auth',
    middleware: 'requireAuth', roleGate: 'canConfirm（支书/副支书/组织委员）+ 同支部', ownership: 'branch', fieldLocks: ['branchId（归属落定）', 'joinApprovedBy/At（服务端会话）'],
    evidence: 'server/routes/iaaa.js#L231-L247; server/test/iaaa-onboarding.test.mjs', status: 'enforced',
  },
  {
    method: 'POST', path: '/api/v1/auth/iaaa/pending/:personId/reject', resource: 'auth',
    middleware: 'requireAuth', roleGate: 'canConfirm（支书/副支书/组织委员）+ 同支部', ownership: 'branch', fieldLocks: ['joinRejectedBy/At（服务端会话）'],
    evidence: 'server/routes/iaaa.js#L231-L250; server/test/iaaa-onboarding.test.mjs', status: 'enforced',
  },
  {
    method: 'POST', path: '/api/v1/agenda-votes', resource: 'agendaVotes',
    middleware: 'requireAuth', roleGate: 'voterIds 名单 + 同支部 + 未锁定', ownership: 'self', fieldLocks: ['ballotMode（制度强制）', 'position（选项枚举）'],
    evidence: 'server/routes/committee.js#L58-L109; server/test/agenda-votes.test.mjs', status: 'enforced',
  },
  {
    method: 'POST', path: '/api/v1/agenda-votes/:id/annotate', resource: 'agendaVotes',
    middleware: 'requireCommissioner', roleGate: '支委层', ownership: 'branch', fieldLocks: ['批注字段（服务端追加）'],
    evidence: 'server/routes/committee.js#L186', status: 'enforced',
  },
  {
    method: 'POST', path: '/api/v1/agenda-votes/lock', resource: 'agendaVotes',
    middleware: 'requireRole(SECRETARY_AND_DEPUTY_ROLES)', roleGate: '支书/副支书', ownership: 'branch', fieldLocks: ['votesLocked/lockedBy/lockedAt（服务端会话）'],
    evidence: 'server/routes/committee.js#L207', status: 'enforced',
  },
  {
    method: 'POST', path: '/api/v1/member-change-requests', resource: 'memberChangeRequests',
    middleware: 'requireCommissioner', roleGate: '支委层', ownership: 'branch', fieldLocks: ['status（服务端置 pending）'],
    evidence: 'server/routes/member.js#L108; server/test/member-confirmation.test.mjs', status: 'enforced',
  },
  {
    method: 'POST', path: '/api/v1/member-change-requests/:id/approve', resource: 'memberChangeRequests',
    middleware: 'requireRole(ORG_COMMISSIONER_ROLES)', roleGate: '组织委员', ownership: 'branch', fieldLocks: ['approvedBy/At（服务端会话）'],
    evidence: 'server/routes/member.js#L143', status: 'enforced',
  },
  {
    method: 'POST', path: '/api/v1/member-change-requests/:id/confirm', resource: 'memberChangeRequests',
    middleware: 'requireRole(SECRETARY_AND_DEPUTY_ROLES)', roleGate: '支书/副支书', ownership: 'branch', fieldLocks: ['confirmedBy/At（服务端会话）'],
    evidence: 'server/routes/member.js#L166', status: 'enforced',
  },
  {
    method: 'POST', path: '/api/v1/member-change-requests/:id/annotate', resource: 'memberChangeRequests',
    middleware: 'requireCommissioner', roleGate: '支委层', ownership: 'branch', fieldLocks: ['批注字段（服务端追加）'],
    evidence: 'server/routes/member.js#L205', status: 'enforced',
  },
  {
    method: 'PATCH', path: '/api/v1/members/:id/profile', resource: 'users',
    middleware: 'requireAuth', roleGate: '组织委员 ∪ 本人（字段白名单不同）+ 同支部', ownership: 'self', fieldLocks: ['PROFILE_FIELDS（组织委员）', 'SELF_WRITE_FIELDS（本人）', 'selfProfile（服务端净化）'],
    evidence: 'server/routes/member.js#L396-L431; server/test/self-profile.test.mjs', status: 'enforced',
  },
  {
    method: 'POST', path: '/api/v1/members', resource: 'users',
    middleware: 'requireRole(ORG_COMMISSIONER_ROLES)', roleGate: '组织委员', ownership: 'branch', fieldLocks: ['role（固定 participant）', 'branchId（服务端会话）'],
    evidence: 'server/routes/member.js#L464', status: 'enforced',
  },
  {
    method: 'POST', path: '/api/v1/members/intake', resource: 'users',
    middleware: 'requireRole(MEMBER_FLOW_ROLES)', roleGate: '组织委员 + 支书/副支书', ownership: 'branch', fieldLocks: ['role（固定 participant）', 'branchId（服务端会话）'],
    evidence: 'server/routes/member.js#L465; server/test/member-flow.test.mjs', status: 'enforced',
  },
  {
    method: 'POST', path: '/api/v1/members/:id/transfer-out', resource: 'users',
    middleware: 'requireRole(TRANSFER_OUT_ROLES)', roleGate: '组织委员 / 支书 / 副支书 + 同支部', ownership: 'branch', fieldLocks: ['transferOut/removedBy/At（服务端会话）'],
    evidence: 'server/routes/member.js#L468-L483', status: 'enforced',
  },
  {
    method: 'POST', path: '/api/v1/members/:id/undo-transfer-out', resource: 'users',
    middleware: 'requireRole(TRANSFER_OUT_ROLES)', roleGate: '组织委员 / 支书 / 副支书 + 同支部', ownership: 'branch', fieldLocks: ['transferOut（清除软标记）'],
    evidence: 'server/routes/member.js#L489', status: 'enforced',
  },
  {
    method: 'POST', path: '/api/v1/members/:id/develop-stage', resource: 'users',
    middleware: 'requireRole(SECRETARY_AND_DEPUTY_ROLES)', roleGate: '支书/副支书', ownership: 'branch', fieldLocks: ['developStage（枚举）'],
    evidence: 'server/routes/member.js#L241', status: 'enforced',
  },
  {
    method: 'POST', path: '/api/v1/members/:id/account-rename', resource: 'users',
    middleware: 'requireRole(PARTY_STAFF_ROLES)', roleGate: 'party-staff', ownership: 'party-staff', fieldLocks: ['studentId（唯一业务键）'],
    evidence: 'server/routes/member.js#L333; server/test/account-rename.test.mjs', status: 'enforced',
  },
  {
    method: 'POST', path: '/api/v1/members/:id/residence-status', resource: 'users',
    middleware: 'requireRole(SECRETARY_AND_DEPUTY_ROLES)', roleGate: '支书/副支书', ownership: 'branch', fieldLocks: ['residenceStatus（枚举）'],
    evidence: 'server/routes/member.js#L375', status: 'enforced',
  },
  {
    method: 'POST', path: '/api/v1/report/trigger', resource: 'report',
    middleware: 'requireRole(party-staff)', roleGate: 'party-staff', ownership: 'party-staff', fieldLocks: [],
    evidence: 'server/routes/report.js#L18', status: 'enforced',
  },
  {
    method: 'POST', path: '/api/v1/system-notices', resource: 'systemNotices',
    middleware: 'requireAuth', roleGate: 'system-notice-kinds 注册表按 kind 复算授权', ownership: 'branch', fieldLocks: ['kind（注册表白名单）', '文案（服务端生成）'],
    evidence: 'server/routes/system-notices.js#L133; server/system-notice-kinds.js; server/test/system-notice-branch-source.test.mjs', status: 'enforced',
  },
];

/** 完整矩阵：通用资源循环生成 + 语义/专用写口清单（单一源） */
export const WRITE_POLICY_MATRIX = Object.freeze([
  ...Object.keys(RESOURCE_TABLES).flatMap((name) => WRITE_METHODS
    .filter((method) => !(name === 'branches' && method === 'POST')) // 支部创建走语义 POST /branches（见 NON_RESOURCE_ROWS）
    .map((method) => resourceRow(name, method))),
  ...NON_RESOURCE_ROWS.map((row) => Object.freeze({ ...row })),
].map((row) => Object.freeze(row)));

/** method+path 索引（method 大写；path 去查询串与尾斜杠） */
function normalizePath(path) {
  return String(path || '').split('?')[0].replace(/\/+$/, '') || '/';
}

const INDEX = new Map(WRITE_POLICY_MATRIX.map((row) => [`${row.method.toUpperCase()} ${normalizePath(row.path)}`, row]));

/**
 * 查一行写口策略。
 * @param {string} method HTTP 方法（大小写不敏感）
 * @param {string} path Express 路径模板（如 `/api/v1/todos/:id`）
 * @returns {Object|undefined}
 */
export function matrixFor(method, path) {
  return INDEX.get(`${String(method || '').toUpperCase()} ${normalizePath(path)}`);
}
