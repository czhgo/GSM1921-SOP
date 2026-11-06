// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  server/data/domain-contract.mjs —— 领域契约**单一源**（2026-11-02 批次 527 · Wave 2）
// ════════════════════════════════════════════════════════════════
// 由来（审计简并计划 `2026-11-02-audit-consolidation-and-cutover.md` §三 Wave 2）：
//   现状有 34 张资源表 / 7 张语义表 / 6 张工作组表，字段「必填 / 枚举 / 种子计数 / 别名」
//   分散在 DATA_MODEL.md、seed-manifest.js、各处服务层与测试里，同一口径多处维护 ⇒ 必然漂移。
// 本文件是**人读契约与机检契约的同一份数据**：
//   · `content/04_web_design/data/DATA_CONTRACT.md` 由本文件逐条誊写（人读版）；
//   · `server/test/data-contract.test.mjs` 直接 import 本文件做机检（资源表覆盖 / 必填 / 枚举 / 反例）；
//   · `mock-api-parity-structure.test.mjs` 追加「契约必填 / 枚举」断言。
// 表清单**不另抄**：`entity` 集合来自 `server/db.js` 的
//   `RESOURCE_TABLES / SEMANTIC_TABLES / WORKGROUP_TABLES`（导出同源）。
// 每条字段（最少）：
//   { entity, table, mockCollection, required: [], enums: {}, seedCount, aliases: [] }
// 可选补充：`optional` / `derived` / `deprecated` / `notes` / `fields`（严格字段集，供反例判红）。
// ⚠ 本文件只描述**形状与口径**，不建表、不读写库、不产生副作用。

import {
  RESOURCE_TABLES as DB_RESOURCE_TABLES,
  SEMANTIC_TABLES as DB_SEMANTIC_TABLES,
  WORKGROUP_TABLES as DB_WORKGROUP_TABLES,
} from '../db.js';
import {
  ROLE_KEYS, DEVELOP_STAGES, RESIDENCE,
  ACTIVITY_SCOPES,
} from '../../docs/src/core/domain/constants.js';
import {
  TaskStatus, TaskforceStatus, AttendanceStatus, ReviewStatus, OutputStatus,
  WORKGROUP_STATUSES,
} from '../../docs/src/core/domain/domain.js';

export const RESOURCE_TABLES = Object.freeze([...DB_RESOURCE_TABLES]);
export const SEMANTIC_TABLES = Object.freeze([...DB_SEMANTIC_TABLES]);
export const WORKGROUP_TABLES = Object.freeze([...DB_WORKGROUP_TABLES]);

const TASK_STATUSES = Object.values(TaskStatus);
const TASKFORCE_STATUSES = Object.values(TaskforceStatus);
const ATTENDANCE_STATUSES = Object.values(AttendanceStatus);
const REVIEW_STATUSES = Object.values(ReviewStatus);
const OUTPUT_STATUSES = Object.values(OutputStatus);
const RESIDENCE_STATUSES = Object.values(RESIDENCE);

/** 活动类型 / 方向 / 可见性（现行写口枚举；活动类别色单一源另见 constants）。 */
const ACTIVITY_TYPES = ['主题党日', '支委会', '支部党员大会', '党课', '党小组会', '组织生活会'];
const ACTIVITY_DIRECTIONS = ['top-down', 'bottom-up'];
const ACTIVITY_VISIBILITIES = ['branch', 'group'];
const ACTIVITY_STATUSES = ['draft', 'pending-approval', 'published', 'ongoing', 'completed', 'cancelled'];
const ACTIVITY_ORGANIZING_SCOPES = Object.values(ACTIVITY_SCOPES);

/** 通用枚举（与写口 / 读侧单一源对齐；契约是「允许值」的唯一登记处）。 */
const PRIORITIES = ['low', 'normal', 'urgent'];
const TODO_STATUSES = ['pending', 'in_progress', 'completed', 'expired'];
const TODO_CATEGORIES = ['auth', 'archive', 'review', 'notice', 'submit', 'track'];
const TODO_ACTION_TYPES = ['authorize', 'archive', 'review', 'read', 'submit', 'track', 'participate'];
const TODO_SOURCE_TYPES = ['notice', 'activity', 'taskforce', 'manual'];
const SIGNUP_STATUSES = ['pending', 'approved', 'rejected', 'cancelled'];
const MAKEUP_STATUSES = ['pending', 'completed', 'cancelled'];
const PROP_TASK_STATUSES = ['pending', 'in_progress', 'submitted'];
const PERIODIC_ARCHIVE_STATUSES = ['draft', 'submitted'];
const ARCHIVE_STATUSES = ['pending', 'archived'];
const INSPECTION_STATUSES = ['pending', 'confirmed'];
const THOUGHT_REVIEW_STATUSES = ['needs_revision', 'archived'];
const PARTY_GROUP_STATUSES = Object.values({ ACTIVE: 'active', DISSOLVED: 'dissolved' });
const MEMBER_CHANGE_STATUSES = ['pending', 'pending-org-approval', 'pending-secretary', 'approved', 'completed', 'cancelled', 'rejected'];
const MEMBER_CHANGE_ACTIONS = ['developStage', 'residence', 'transferOut'];
const MEMBER_CONFIRM_STATUSES = ['pending', 'approved', 'rejected'];
const APPEAL_STATUSES = ['pending', 'approved', 'rejected'];
const BRANCH_TYPES = ['本科生', '研究生', '教职工', '党委'];
const BRANCH_STATUSES = Object.values({ ACTIVE: 'active', ARCHIVED: 'archived' });
const REVIEW_REQUEST_TYPES = ['develop-node', 'activity-report'];
const REVIEW_REQUEST_STATUSES = ['pending', 'approved', 'rejected'];

const base = (id = true) => (id ? ['id'] : []);

/**
 * 34 张资源表（`db.js::RESOURCE_TABLES`）的完整契约。
 * `seedCount` = `server/seed.js` 首启播种后的行数（0＝无演示种子 / 运行时域）。
 */
const RESOURCE_CONTRACT = [
  {
    entity: 'users', table: 'users', mockCollection: 'users',
    required: ['id', 'name', 'studentId', 'role', 'branchId', 'developStage', 'partyGroup'],
    optional: ['residenceStatus', 'residenceNote', 'residenceHistory', 'selfProfile', 'transferOut', 'developStageSince'],
    // 党委组织员（party-staff）不属发展阶段序列，种子值为空字符串 ⇒ 枚举显式登记 ''。
    enums: { role: ROLE_KEYS, developStage: [...DEVELOP_STAGES, ''], residenceStatus: RESIDENCE_STATUSES },
    seedCount: 51,
    aliases: ['members'],
    fields: ['id', 'name', 'studentId', 'enrollYear', 'partyGroup', 'developStage', 'role', 'branchId',
      'residenceStatus', 'residenceNote', 'residenceHistory', 'selfProfile', 'transferOut', 'developStageSince'],
  },
  {
    entity: 'activities', table: 'activities', mockCollection: 'activities',
    required: ['id', 'title', 'type', 'date', 'branchId', 'visibility'],
    // 2026-11-02 批次 527 · 漂移 3：executor / supervisor / createdBy 功能实际不产生（活动装载只补
    // visibility / createdBy / createdAt），契约改为 optional；createdBy 仍可被装载默认写入。
    optional: ['executor', 'supervisor', 'createdBy', 'createdAt', 'location', 'organizingScope',
      'hostGroupId', 'hostGroup', 'recruitmentScope', 'crossGroupCoordinatorId', 'organizer', 'isOutdoor', 'isJoint', 'voteConfig'],
    derived: ['status', 'archived', 'archivedAt'],
    enums: {
      type: ACTIVITY_TYPES, direction: ACTIVITY_DIRECTIONS, visibility: ACTIVITY_VISIBILITIES,
      status: ACTIVITY_STATUSES, organizingScope: ACTIVITY_ORGANIZING_SCOPES,
    },
    seedCount: 38,
    aliases: [],
    fields: ['id', 'title', 'type', 'date', 'location', 'direction', 'visibility', 'createdBy', 'createdAt',
      'executor', 'supervisor', 'priority', 'dueDate', 'organizingScope', 'hostGroupId', 'hostGroup',
      'recruitmentScope', 'crossGroupCoordinatorId', 'organizer', 'isOutdoor', 'isJoint', 'voteConfig', 'cancelled', 'draft',
      'archived', 'archivedAt', 'status', 'branchId', 'assignments', 'agenda', 'isBrand', 'brandName',
      'galleryFeatured', 'galleryPinned', 'participants', 'workgroupId', 'scenarioId', 'domain', 'carriers'],
  },
  {
    entity: 'tasks', table: 'tasks', mockCollection: 'tasks',
    required: ['id', 'activityId', 'title', 'status', 'createdAt'],
    optional: ['completedAt', 'voided', 'voidedAt', 'voidedBy'],
    enums: { status: TASK_STATUSES },
    seedCount: 8, aliases: [],
  },
  {
    entity: 'attendances', table: 'attendances', mockCollection: 'attendances',
    required: ['id', 'personId', 'activityId', 'status', 'branchId'],
    // 漂移 4：recordedBy 大量种子为 null（上传/确认是运行时动作）⇒ optional；
    // studentId / developStage / partyGroup 只由 deriveAttendanceSnapshot 现取 ⇒ derived。
    optional: ['recordedBy', 'recordedAt', 'confirmed', 'confirmedBy', 'confirmedAt', 'note',
      'submittedBy', 'returnedBy', 'returnedAt', 'returnReason', 'absenceReason', 'onlineAttend'],
    derived: ['studentId', 'developStage', 'partyGroup'],
    enums: { status: ATTENDANCE_STATUSES, developStage: DEVELOP_STAGES },
    seedCount: 144, aliases: [],
  },
  {
    entity: 'inspections', table: 'inspections', mockCollection: 'inspections',
    required: ['id', 'sourceType', 'activityId', 'sourceName', 'personId', 'level', 'recordedAt', 'branchId'],
    optional: ['recordedBy', 'workgroupId', 'taskforceId', 'confirmedBy', 'confirmedAt',
      'returnedBy', 'returnedAt', 'returnReason', 'submittedBy'],
    derived: ['status'],
    enums: { level: ['organize', 'deep'], status: INSPECTION_STATUSES },
    seedCount: 42, aliases: [],
  },
  {
    entity: 'taskforces', table: 'taskforces', mockCollection: 'taskforces',
    required: ['id', 'name', 'task', 'manager', 'initiator', 'deadline', 'createdAt'],
    optional: ['capacity', 'activityId', 'workgroupId', 'branchId', 'members', 'approvalStatus'],
    derived: ['status'],
    enums: { status: TASKFORCE_STATUSES },
    seedCount: 8, aliases: [],
  },
  {
    entity: 'notices', table: 'notices', mockCollection: 'notices',
    required: ['id', 'title', 'content', 'priority', 'publishDate', 'branchId', 'kind'],
    optional: ['reads', 'audience', 'audiencePersons', 'actionRoles', 'targetType', 'targetId', 'expireDate',
      'archived', 'archivedAt', 'archivedBy', 'source', 'createdBy', 'replyTo', 'fromPersonId'],
    derived: ['expireDate'],
    enums: { priority: PRIORITIES, kind: ['announcement', 'system', 'action', 'message'] },
    seedCount: 14, aliases: [],
  },
  {
    entity: 'todos', table: 'todos', mockCollection: 'todos',
    required: ['id', 'title', 'role', 'category', 'priority', 'status', 'branchId', 'createdAt'],
    // 漂移 5：到人 / 到角色待办的运行时归属字段（VisitorTodoDeriver / 决议跟进写入）。
    optional: ['personId', 'ownerType', 'ownerId', 'description', 'deadline', 'completedAt',
      'sourceType', 'sourceId', 'actionKey', 'actionType', 'actionData', 'flow', 'voidedAt', 'voidedBy'],
    enums: { status: TODO_STATUSES, category: TODO_CATEGORIES, priority: PRIORITIES,
      actionType: TODO_ACTION_TYPES, sourceType: TODO_SOURCE_TYPES },
    seedCount: 3, aliases: [],
  },
  {
    entity: 'assignments', table: 'assignments', mockCollection: 'assignments',
    required: ['id', 'activityId', 'workName', 'assigneeId', 'status', 'createdAt'],
    optional: ['workDescription', 'ddl', 'createdBy', 'completedAt'],
    enums: { status: ['pending', 'in_progress', 'completed'] },
    seedCount: 5, aliases: [],
  },
  {
    entity: 'makeupTasks', table: 'makeup_tasks', mockCollection: 'makeupTasks',
    required: ['id', 'personId', 'activityId', 'attendanceRecordId', 'deadline', 'status', 'createdAt'],
    optional: ['activityName', 'personName', 'absentDate', 'isMandatory', 'proofContent', 'proofFiles', 'completedAt', 'completedBy'],
    enums: { status: MAKEUP_STATUSES },
    seedCount: 1, aliases: [],
  },
  {
    entity: 'experienceDeposits', table: 'experience_deposits', mockCollection: 'experienceDeposits',
    required: [], enums: {}, seedCount: 0, aliases: [],
    notes: '运行时域（深度参与者经验沉淀）；演示种子为空，页面显示空态。',
  },
  {
    entity: 'fileSpaceRecords', table: 'file_space_records', mockCollection: 'fileSpaceRecords',
    required: [], enums: {}, seedCount: 0, aliases: [],
    notes: '运行时域（文件空间记录）；演示种子为空。',
  },
  {
    entity: 'imageRecords', table: 'image_records', mockCollection: 'imageRecords',
    required: ['id', 'date', 'title', 'activityId', 'fileName', 'uploadedBy', 'uploadedAt'],
    optional: ['subject', 'filePath', 'base64', 'voided', 'voidPending'],
    seedCount: 2, aliases: [],
    notes: '漂移 7：补 2 条绑定既有活动（act-16 / act-21）的种子；base64 内联 SVG，不依赖 uploads 物理文件。',
  },
  {
    entity: 'signups', table: 'signups', mockCollection: 'signups',
    required: ['id', 'sourceType', 'sourceId', 'personId', 'role', 'status', 'createdAt'],
    optional: ['note', 'reviewedBy', 'reviewedAt', 'cancelledAt', 'cancelledBy'],
    enums: { status: SIGNUP_STATUSES, sourceType: ['activity', 'taskforce'] },
    seedCount: 7, aliases: [],
  },
  {
    entity: 'activityReviews', table: 'activity_reviews', mockCollection: 'activityReviews',
    required: ['id', 'activityId', 'reviewStatus'],
    optional: ['organizerId', 'workgroupId', 'reviewContent', 'submittedAt', 'confirmedAt', 'issues', 'annotation', 'annotatedBy', 'annotatedAt'],
    derived: ['progress', 'overdue'],
    enums: { reviewStatus: REVIEW_STATUSES },
    seedCount: 11, aliases: [],
  },
  {
    entity: 'taskforceReviews', table: 'taskforce_reviews', mockCollection: 'taskforceReviews',
    required: ['id', 'taskforceId', 'reviewStatus'],
    optional: ['sourceType', 'workgroupId', 'sourceName', 'organizerId', 'reviewContent', 'submittedAt', 'confirmedAt', 'issues'],
    derived: ['progress', 'overdue'],
    enums: { reviewStatus: REVIEW_STATUSES },
    seedCount: 2, aliases: [],
  },
  {
    entity: 'propTasks', table: 'prop_tasks', mockCollection: 'propTasks',
    required: ['id', 'source', 'type', 'summary', 'status', 'createdAt', 'branchId'],
    enums: { status: PROP_TASK_STATUSES },
    seedCount: 8, aliases: [],
  },
  {
    entity: 'periodicArchives', table: 'periodic_archive_submissions', mockCollection: 'periodicArchives',
    required: ['id', 'branchId', 'periodUnit', 'periodKey', 'periodLabel', 'periodRange', 'status'],
    optional: ['content', 'submittedAt'],
    enums: { status: PERIODIC_ARCHIVE_STATUSES },
    seedCount: 4, aliases: [],
  },
  {
    entity: 'archiveRecords', table: 'archive_records', mockCollection: 'archiveRecords',
    required: ['id', 'category', 'branchId', 'status'],
    optional: ['activityId', 'materialOnly', 'title', 'filePath', 'fileName', 'fileSize', 'note',
      'secretaryConfirmedAt', 'submittedAt', 'uploadedBy'],
    derived: ['activityName', 'archiveDate'],
    enums: { status: ARCHIVE_STATUSES },
    seedCount: 6, aliases: [],
  },
  {
    entity: 'externalDispatches', table: 'external_dispatches', mockCollection: 'externalDispatches',
    required: ['id', 'refType', 'refLabel', 'senderId', 'receiverRole', 'sentAt', 'branchId'],
    optional: ['senderName', 'note', 'confirmedAt'],
    enums: { refType: ['publicity', 'inspection', 'archive'] },
    seedCount: 2, aliases: [],
  },
  {
    entity: 'actSubRecords', table: 'act_sub_records', mockCollection: 'actSubRecords',
    required: [], enums: {}, seedCount: 0, aliases: [],
    notes: '对象聚合域（`__root__` 单行）；无演示种子。',
  },
  {
    entity: 'tfSubRecords', table: 'tf_sub_records', mockCollection: 'tfSubRecords',
    required: [], enums: {}, seedCount: 0, aliases: [],
    notes: '对象聚合域（`__root__` 单行）；无演示种子。',
  },
  {
    entity: 'branchDocs', table: 'branch_docs', mockCollection: 'branchDocs',
    required: [], enums: {}, seedCount: 0, aliases: [],
    notes: '运行时域（支部文件上传）；演示种子为空。',
  },
  {
    entity: 'memberChangeRequests', table: 'member_change_requests', mockCollection: 'memberChangeRequests',
    // 漂移 1：成员变更**统一形状** = fromStage / toStage / action。
    required: ['id', 'personId', 'fromStage', 'toStage', 'action', 'status', 'createdAt'],
    optional: ['branchId', 'activityId', 'agendaItemId', 'entryDate', 'meetingResult',
      'createdBy', 'approvedBy', 'approvedAt', 'confirmedBy', 'confirmedAt', 'decidedBy', 'decidedAt',
      'cancelledAt', 'transferredOutAt', 'rejectNote'],
    enums: { action: MEMBER_CHANGE_ACTIONS, status: MEMBER_CHANGE_STATUSES },
    seedCount: 2, aliases: ['member_confirmations', 'memberConfirmations', 'pendingMemberConfirmations'],
    notes: '漂移 1/8：roster / transfer 各 1 条种子。`member_confirmations` 是**读时别名**（from/to → fromStage/toStage），不双写。',
  },
  {
    entity: 'committeeBroadcasts', table: 'committee_broadcasts', mockCollection: 'committeeBroadcasts',
    required: [], enums: {}, seedCount: 0, aliases: [],
    notes: '2026-10-20 P1-26 起停写（只写不读）；存量行仍可读，演示种子为空。',
  },
  {
    entity: 'agendaVotes', table: 'agenda_votes', mockCollection: 'agendaVotes',
    required: [], enums: {}, seedCount: 0, aliases: [],
    notes: '运行时域（线上支委会表态）；演示种子为空。',
  },
  {
    entity: 'branches', table: 'branches', mockCollection: 'branches',
    required: ['id', 'name', 'type', 'status', 'createdAt'],
    optional: ['secretaryId', 'config', 'configChangeHistory'],
    enums: { type: BRANCH_TYPES, status: BRANCH_STATUSES },
    seedCount: 1, aliases: [],
  },
  {
    entity: 'appointmentRecords', table: 'appointment_records', mockCollection: 'appointmentRecords',
    required: ['id', 'branchId', 'secretaryId', 'from'],
    optional: ['to', 'note'],
    seedCount: 1, aliases: [],
  },
  {
    entity: 'reviewRequests', table: 'review_requests', mockCollection: 'reviewRequests',
    required: ['id', 'branchId', 'type', 'title', 'content', 'status', 'submittedBy', 'createdAt'],
    optional: ['decidedBy', 'decidedAt', 'decisionNote'],
    enums: { type: REVIEW_REQUEST_TYPES, status: REVIEW_REQUEST_STATUSES },
    seedCount: 1, aliases: [],
  },
  {
    entity: 'issues', table: 'issues', mockCollection: 'issues',
    required: ['id', 'number', 'branchId', 'title', 'body', 'scope', 'types', 'submittedBy', 'submittedAt', 'status'],
    optional: ['kind', 'reportCategory', 'assignee', 'assigneeRole', 'dispatchHistory', 'milestone',
      'hidden', 'mergedInto', 'resultPending', 'reactions', 'mentions', 'references', 'comments',
      'participants', 'commentCount', 'anonymous', '_realPersonId', 'tokenHash'],
    enums: { status: ['open', 'processing', 'resolved', 'closed'], scope: ['scenario', 'report'],
      kind: ['report'] },
    seedCount: 6, aliases: [],
  },
  {
    entity: 'thoughtReports', table: 'thought_reports', mockCollection: 'thoughtReports',
    required: ['id', 'personId', 'personName', 'title', 'period', 'content', 'submittedAt'],
    // 旧种子无 reviewStatus：读侧归一为 archived，故不列入 required（S5 逐行校验会判红）。
    optional: ['reviewStatus', 'reviewHistory'],
    enums: { reviewStatus: THOUGHT_REVIEW_STATUSES },
    seedCount: 5, aliases: [],
  },
  {
    entity: 'partyGroups', table: 'party_groups', mockCollection: 'partyGroups',
    required: ['id', 'branchId', 'name', 'seq', 'status', 'createdAt'],
    optional: ['createdBy', 'note', 'history', 'dissolvedAt', 'dissolvedBy'],
    enums: { status: PARTY_GROUP_STATUSES },
    seedCount: 4, aliases: [],
    notes: '漂移 6：createdAt 统一 ISO；补 1 条 dissolved 样本（pg-4）。',
  },
  {
    entity: 'memberFlows', table: 'member_flows', mockCollection: 'memberFlows',
    required: [], enums: {}, seedCount: 0, aliases: [],
    notes: '运行时域（流入/流出复式记账）；演示种子为空。',
  },
  {
    entity: 'issueReveals', table: 'issue_reveals', mockCollection: null,
    required: [], enums: {}, seedCount: 0, aliases: [],
    deprecated: true,
    notes: '2026-09-17 D-824 起停写，保留只读兼容；v12 迁移已 DROP，表不存在。**不要删表/删路由**（server AGENTS 禁删）。',
  },
];

/** 7 张语义表（`db.js::SEMANTIC_TABLES`）——最小契约；无 mock 持久化键者标 null。 */
const SEMANTIC_CONTRACT = [
  {
    entity: 'handoffs', table: 'handoffs', mockCollection: 'handoffs',
    required: ['id', 'type', 'from', 'to', 'status', 'createdAt', 'branchId'],
    optional: ['refType', 'refLabel', 'refId', 'note', 'confirmedAt', 'confirmedBy'],
    enums: { status: ['pending', 'done'] },
    seedCount: 2, aliases: [],
  },
  {
    entity: 'memberConfirmations', table: 'member_confirmations', mockCollection: 'pendingMemberConfirmations',
    required: ['id', 'personId', 'kind', 'action', 'from', 'to', 'status', 'createdAt', 'branchId'],
    optional: ['name', 'note', 'by', 'entryDate', 'decidedBy', 'decidedAt', 'rejectNote'],
    enums: { kind: ['change', 'transferOut'], action: MEMBER_CHANGE_ACTIONS, status: MEMBER_CONFIRM_STATUSES },
    seedCount: 1, aliases: ['memberChangeRequests'],
    notes: '读时别名：读口经 `aliasMemberChangeRow` 暴露 fromStage/toStage/action；写口仍只写本表，不双写。',
  },
  {
    entity: 'milestones', table: 'milestones', mockCollection: 'milestones',
    required: ['id', 'title', 'status'],
    optional: ['description', 'dueDate', 'issueIds'],
    enums: { status: ['active', 'pending', 'completed'] },
    seedCount: 1, aliases: [],
  },
  {
    entity: 'attendanceAppeals', table: 'attendance_appeals', mockCollection: null,
    required: ['id', 'branchId', 'personId', 'activityId', 'status', 'createdAt'],
    optional: ['note', 'decidedBy', 'decidedAt', 'decisionNote'],
    enums: { status: APPEAL_STATUSES },
    seedCount: 1, aliases: [],
  },
  {
    entity: 'inspectionAppeals', table: 'inspection_appeals', mockCollection: null,
    required: ['id', 'branchId', 'personId', 'activityId', 'status', 'createdAt'],
    optional: ['note', 'decidedBy', 'decidedAt', 'decisionNote'],
    enums: { status: APPEAL_STATUSES },
    seedCount: 1, aliases: [],
  },
  {
    entity: 'issueUnread', table: 'issue_unread', mockCollection: null,
    required: ['id', 'assigneeId', 'issueId', 'unread'],
    optional: ['at'],
    seedCount: 2, aliases: [],
  },
  {
    entity: 'authAudit', table: 'auth_audit', mockCollection: null,
    required: ['id', 'targetPersonId', 'role', 'authorizedBy', 'authorizedAt', 'action', 'branchId'],
    optional: ['scopeRef'],
    enums: { action: ['grant', 'revoke'] },
    seedCount: 1, aliases: [],
  },
];

/** 6 张工作组表（`db.js::WORKGROUP_TABLES`）——最小契约。 */
const WORKGROUP_CONTRACT = [
  {
    entity: 'workgroups', table: 'workgroups', mockCollection: 'workgroups',
    required: ['id', 'branchId', 'kind', 'sourceType', 'sourceId', 'status', 'createdAt'],
    optional: ['name', 'organizingScope', 'hostGroupId', 'recruitmentScope', 'crossGroupCoordinatorId', 'migrationState'],
    enums: { kind: ['activity', 'taskforce'], sourceType: ['activity', 'taskforce'], status: WORKGROUP_STATUSES },
    seedCount: 46, aliases: [],
  },
  {
    entity: 'workgroupMembers', table: 'workgroup_members', mockCollection: 'workgroupMembers',
    required: ['id', 'branchId', 'workgroupId', 'personId', 'role', 'status', 'createdAt'],
    optional: ['migratedFromLegacy', 'createdBy', 'crossGroup', 'coordinatedBy'],
    enums: { role: ['organizer', 'deep', 'participant'], status: ['active', 'inactive'] },
    seedCount: 103, aliases: [],
  },
  {
    entity: 'workgroupGrants', table: 'workgroup_grants', mockCollection: 'workgroupGrants',
    required: ['id', 'branchId', 'workgroupId', 'personId', 'templateKey', 'status', 'grantedBy', 'grantedAt'],
    optional: ['permissionKeys', 'reason', 'revokedBy', 'revokedAt'],
    enums: { templateKey: ['organizer', 'deep', 'participant', 'custom'], status: ['active', 'revoked'] },
    seedCount: 2, aliases: [],
  },
  {
    entity: 'workgroupTasks', table: 'workgroup_tasks', mockCollection: 'workgroupTasks',
    required: ['id', 'branchId', 'workgroupId', 'title', 'status', 'createdAt'],
    optional: ['activityId', 'capabilityPackageId', 'isPurpose', 'createdBy', 'assigneeId', 'dueDate', 'migratedFrom'],
    enums: { status: TASK_STATUSES },
    seedCount: 2, aliases: [],
    notes: '漂移 9：补 tf-002 工作组 2 条任务种子。',
  },
  {
    entity: 'workgroupOutputs', table: 'workgroup_outputs', mockCollection: 'workgroupOutputs',
    required: ['id', 'branchId', 'workgroupId', 'title', 'submittedBy', 'submittedAt', 'status'],
    optional: ['taskId', 'activityId', 'capabilityPackageId', 'description', 'personId', 'kind', 'contributionId'],
    enums: { status: OUTPUT_STATUSES },
    seedCount: 1, aliases: [],
    notes: '漂移 9：补 tf-002 工作组 1 条产出种子。',
  },
  {
    entity: 'attendanceRosters', table: 'attendance_rosters', mockCollection: 'attendanceRosters',
    required: [], enums: {}, seedCount: 0, aliases: [],
    notes: '运行时域（按活动冻结的应到名单快照）；演示种子为空。',
  },
];

/** 全量契约（47 表：34 资源 + 7 语义 + 6 工作组） */
export const DOMAIN_CONTRACT = Object.freeze(
  [...RESOURCE_CONTRACT, ...SEMANTIC_CONTRACT, ...WORKGROUP_CONTRACT].map((entry) => Object.freeze({
    optional: [], derived: [], aliases: [], enums: {}, ...entry,
  })),
);

export const ENTITY_BY_TABLE = Object.freeze(
  Object.fromEntries(DOMAIN_CONTRACT.map((entry) => [entry.table, entry])),
);
export const ENTITY_BY_NAME = Object.freeze(
  Object.fromEntries(DOMAIN_CONTRACT.map((entry) => [entry.entity, entry])),
);
export const ENTITIES_BY_COLLECTION = Object.freeze(
  Object.fromEntries(DOMAIN_CONTRACT.filter((entry) => entry.mockCollection)
    .map((entry) => [entry.mockCollection, entry])),
);

export const RESOURCE_ENTITIES = Object.freeze(
  RESOURCE_CONTRACT.map((entry) => entry.entity),
);

/**
 * 读时别名（漂移 1）：把 `member_confirmations` 的 `from / to`
 * 读成 `fromStage / toStage`，并补 `action`（缺省按 kind 推导）。
 * **纯函数、不写库**；调用方只用于读口投影，不产生第二份持久化形状。
 * @template {object} T
 * @param {T} row
 * @returns {T}
 */
export function aliasMemberChangeRow(row) {
  if (!row || typeof row !== 'object' || Array.isArray(row)) return row;
  const out = { ...row };
  if (out.fromStage === undefined && out.from !== undefined) out.fromStage = out.from;
  if (out.toStage === undefined && out.to !== undefined) out.toStage = out.to;
  if (out.action === undefined) {
    if (out.kind === 'transferOut') out.action = 'transferOut';
    else if (out.kind === 'change' || out.kind === undefined) out.action = 'developStage';
  }
  return out;
}

/** 行级问题收集（纯函数；供 `data-contract.test.mjs` 与结构守卫共用）。 */
function checkRows(entry, rows) {
  const problems = [];
  const required = entry.required || [];
  const enumFields = Object.keys(entry.enums || {});
  const label = `${entry.entity}(${entry.table})`;
  for (const row of rows) {
    const id = row && row.id !== undefined ? row.id : '(no-id)';
    for (const field of required) {
      if (!row || !Object.hasOwn(row, field)) problems.push({ kind: 'missing', entity: label, id, field });
    }
    for (const field of enumFields) {
      if (!row || !Object.hasOwn(row, field)) continue;
      const value = row[field];
      if (value === undefined || value === null) continue;
      const allowed = entry.enums[field];
      if (!Array.isArray(allowed) || !allowed.includes(value)) {
        problems.push({ kind: 'enum', entity: label, id, field, value });
      }
    }
  }
  return problems;
}

/**
 * 契约校验（纯函数）。
 * @param {string|Object} entityOrName 实体名或 table 名
 * @param {Array<Object>} rows
 * @param {{strictFields?: boolean}} [opts]
 * @returns {Array<{kind:string, entity:string, id:string, field:string, value?:any}>}
 */
export function validateEntityRows(entityOrName, rows, { strictFields = false } = {}) {
  const entry = typeof entityOrName === 'string'
    ? (ENTITY_BY_NAME[entityOrName] || ENTITY_BY_TABLE[entityOrName])
    : entityOrName;
  if (!entry) return [{ kind: 'unknown-entity', entity: String(entityOrName), id: '(contract)', field: '(entity)' }];
  const problems = checkRows(entry, Array.isArray(rows) ? rows : []);
  if (strictFields && Array.isArray(entry.fields) && entry.fields.length > 0) {
    const allowed = new Set(entry.fields);
    for (const row of rows) {
      for (const field of Object.keys(row || {})) {
        if (!allowed.has(field)) {
          problems.push({ kind: 'unknown', entity: `${entry.entity}(${entry.table})`, id: row.id, field });
        }
      }
    }
  }
  return problems;
}
