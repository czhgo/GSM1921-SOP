// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  docs/src/data/seed-manifest.js — 种子集合清单（B-499-4 / B-499-8）
// ════════════════════════════════════════════════════════════════
// 本文件是**无副作用纯数据模块**：不 import 任何模块、不读写存储、不依赖浏览器 / Node 特有 API，
//   mock 形态（浏览器）与 server（Node）都可直接 import，作为「哪些集合有种子源、种子归谁管」
//   的单一清单。Task 4 的 `detectSeedDrift` / `planSeedRepair` 以本清单的 `seedOwnedFields` 为比较面。
//
// 字段口径（每条必填）：
//   · collection         mockDB / 资源端点键（camelCase）
//   · table              物理表名（snake_case；workgroups 子域为独立表）
//   · seedModule         种子模块（仓根相对路径；JSON 文件用 `seedExport` 取顶层数组属性）
//   · seedExport         具名导出（JSON 文件为其顶层数组键；派生表为生成函数名）
//   · idPattern          种子行 id 的形态（正则源码字符串；运行时新建 id 不受此约束）
//   · lifecycleClass     skeleton（组织骨架）/ business（业务过程）/ archive（归档留痕）/ derived（由其它种子派生）
//   · initTier           `?reset=init` 档：keep（保留）/ clear（清空）；对齐
//                        `services/core/init-reset.js::INIT_BLOB_KEEP_KEYS` 与 `INIT_BLOB_CLEAR_DEFAULTS`
//   · seedOwnedFields    种子负责的字段（Task 4 漂移比较面；运行时改这些字段会被判为漂移）
//   · runtimeFields      运行时字段（用户操作 / 装载投影写入；漂移修复必须保留）
//
// ⚠ Task 4（B-499-8）已按各写口逐表补全 `runtimeFields`：凡由用户操作 / 装载投影写入、
//    且不由种子负责的字段都在此登记；漂移修复只改 `seedOwnedFields`，其余字段一律保留。
//    `NON_SEED_COLLECTIONS` / `NON_SEED_TABLES` 负责把**无种子源**的 mock 持久化键与物理表
//    一并分类（守卫据此抓「未分类」）。
// ⚠ activities 的 `visibility / createdBy / createdAt` 是**种子装载默认字段**（数据模型必填），
//    由 `server/seed.js` 与 `mock-adapter.js::_seedInitialData` 同一口径补齐，故计入 seedOwnedFields。
// ⚠ 本清单只列**有种子源**的集合；`member_flows` / `branch_docs` / `act_sub_records` 等空种子集合不入表。
// ════════════════════════════════════════════════════════════════

export const SEED_MANIFEST = [
  // ── 组织骨架 ──────────────────────────────────────────────────
  {
    collection: 'users',
    table: 'users',
    seedModule: 'docs/src/data/mock/people.js',
    seedExport: 'PEOPLE',
    idPattern: '^\\d{10}$',
    lifecycleClass: 'skeleton',
    initTier: 'keep',
    seedOwnedFields: [
      'id', 'name', 'studentId', 'enrollYear', 'partyGroup', 'developStage', 'role', 'branchId',
      'residenceStatus', 'residenceNote', 'residenceHistory',
    ],
    runtimeFields: ['selfProfile', 'transferOut', 'developStageSince'],
  },
  {
    collection: 'branches',
    table: 'branches',
    seedModule: 'docs/src/data/mock/branches.js',
    seedExport: 'BRANCHES',
    idPattern: '^br-[a-z0-9-]+$',
    lifecycleClass: 'skeleton',
    initTier: 'keep',
    seedOwnedFields: ['id', 'name', 'type', 'status', 'createdAt'],
    runtimeFields: ['config', 'secretaryId'],
  },
  {
    collection: 'partyGroups',
    table: 'party_groups',
    seedModule: 'docs/src/data/mock/party-groups.js',
    seedExport: 'PARTY_GROUPS',
    idPattern: '^pg-\\d+$',
    lifecycleClass: 'skeleton',
    initTier: 'clear',
    seedOwnedFields: ['id', 'branchId', 'name', 'seq', 'status', 'createdAt', 'createdBy', 'note'],
    runtimeFields: ['history', 'dissolvedAt', 'dissolvedBy'],
  },
  {
    collection: 'milestones',
    table: 'milestones',
    seedModule: 'docs/data/milestones.json',
    seedExport: 'milestones',
    idPattern: '^ms-\\d+$',
    lifecycleClass: 'skeleton',
    initTier: 'keep',
    seedOwnedFields: ['id', 'title', 'description', 'dueDate', 'issueIds', 'status'],
    runtimeFields: [],
  },

  // ── 活动 / 专班 / 任务 ────────────────────────────────────────
  {
    collection: 'activities',
    table: 'activities',
    seedModule: 'docs/src/data/mock/activities.js',
    seedExport: 'ACTIVITIES',
    idPattern: '^act-\\d+$',
    lifecycleClass: 'business',
    initTier: 'clear',
    seedOwnedFields: [
      'id', 'title', 'date', 'type', 'organizer', 'direction', 'location', 'scenarioId', 'domain',
      'carriers', 'isOutdoor', 'galleryFeatured',
      'isJoint', 'galleryPinned', 'hostGroup', 'voteConfig',
      // 装载默认 / 种子归一的组织落点字段（见文件头注释）
      'visibility', 'createdBy', 'createdAt', 'organizingScope', 'hostGroupId',
      'recruitmentScope', 'crossGroupCoordinatorId', 'legacyHostGroup',
    ],
    runtimeFields: [
      'status', 'archived', 'archivedAt', 'workgroupId', 'participants', 'brandRevokedAt',
      'votesLocked', 'voteTally', 'noticeSentAt', 'executor', 'supervisor',
      // R9 Task 4.1：以下字段虽由种子给出**初始形态**，但一经业务动作即归运行时所有——
      //   assignments＝报名审核 / 成员语义接口写入；agenda 的对象条目会被议程结果回写（result/…）；
      //   isBrand / brandName＝支委会议程项「记录结果·通过」认定或品牌取消；
      //   ⇒ 种子修复不得把它们整值换回种子版本，否则会回滚运行时治理结果。
      'assignments', 'agenda', 'isBrand', 'brandName',
    ],
  },
  {
    collection: 'taskforces',
    table: 'taskforces',
    seedModule: 'docs/src/data/mock/taskforces.js',
    seedExport: 'MOCK_TASKFORCES',
    idPattern: '^tf-\\d+$',
    lifecycleClass: 'business',
    initTier: 'clear',
    seedOwnedFields: [
      'id', 'name', 'task', 'manager', 'initiator', 'capacity', 'deadline',
      'activityId', 'createdAt', 'reviewSummary',
    ],
    // R9 Task 4.1：members 由报名审核 / 成员语义接口与贡献填报写入（含 contributions），
    //   ⇒ 归运行时字段，种子修复不得整值回滚。
    runtimeFields: [
      'status', 'progressList', 'dissolvedAt', 'deletedAt', 'workgroupId', 'branchId', 'members',
    ],
  },
  {
    collection: 'tasks',
    table: 'tasks',
    seedModule: 'docs/src/data/mock/seed.js',
    seedExport: 'SEED_TASKS',
    idPattern: '^tsk-\\d+$',
    lifecycleClass: 'business',
    initTier: 'clear',
    seedOwnedFields: ['id', 'activityId', 'title', 'createdAt'],
    runtimeFields: ['status', 'completedAt', 'voided', 'voidedAt', 'voidedBy'],
  },
  {
    collection: 'assignments',
    table: 'assignments',
    seedModule: 'docs/src/data/mock/seed.js',
    seedExport: 'SEED_ASSIGNMENTS',
    idPattern: '^assign_seed_\\d+$',
    lifecycleClass: 'business',
    initTier: 'clear',
    seedOwnedFields: [
      'id', 'activityId', 'workName', 'workDescription', 'ddl', 'assigneeId', 'createdBy', 'createdAt',
    ],
    runtimeFields: ['status', 'completedAt'],
  },
  {
    collection: 'attendances',
    table: 'attendances',
    seedModule: 'docs/src/data/mock/attendance.js',
    seedExport: 'ATTENDANCE_RECORDS',
    idPattern: '^att\\d+$',
    lifecycleClass: 'business',
    initTier: 'clear',
    seedOwnedFields: ['id', 'personId', 'activityId', 'studentId', 'developStage', 'partyGroup'],
    runtimeFields: ['status', 'recordedBy', 'recordedAt', 'confirmed', 'confirmedBy', 'confirmedAt', 'overdue', 'secretaryConfirmedAt', 'note'],
  },
  {
    collection: 'inspections',
    table: 'inspections',
    seedModule: 'docs/src/data/mock/inspection.js',
    seedExport: 'INSPECTION_RECORDS',
    idPattern: '^insp-\\d+$',
    lifecycleClass: 'business',
    initTier: 'clear',
    seedOwnedFields: [
      'id', 'sourceType', 'activityId', 'sourceName', 'personId', 'level', 'role',
      'recordedBy', 'recordedAt', 'workgroupId', 'taskforceId',
    ],
    runtimeFields: ['status', 'confirmedBy', 'confirmedAt', 'returnedBy', 'returnedAt'],
  },
  {
    collection: 'makeupTasks',
    table: 'makeup_tasks',
    seedModule: 'docs/src/data/mock/seed.js',
    seedExport: 'SEED_MAKEUP_TASKS',
    idPattern: '^mk-seed-\\d+$',
    lifecycleClass: 'derived',
    initTier: 'clear',
    seedOwnedFields: [
      'id', 'personId', 'activityId', 'attendanceRecordId', 'activityName', 'personName',
      'absentDate', 'deadline', 'isMandatory', 'createdAt',
    ],
    runtimeFields: ['status', 'proofContent', 'proofFiles', 'completedAt', 'completedBy'],
  },

  // ── 通知 / 待办 / 报名 ────────────────────────────────────────
  {
    collection: 'notices',
    table: 'notices',
    seedModule: 'docs/src/data/mock/notices.js',
    seedExport: 'MOCK_NOTICES',
    idPattern: '^notice-\\d{3}$',
    lifecycleClass: 'business',
    initTier: 'clear',
    seedOwnedFields: [
      'id', 'title', 'content', 'priority', 'publishDate', 'expireDate', 'targetModule',
      'targetType', 'targetId', 'branchId', 'source', 'createdBy', 'audience', 'audiencePersons',
    ],
    runtimeFields: ['read', 'reads', 'archived', 'archivedAt'],
  },
  {
    collection: 'todos',
    table: 'todos',
    seedModule: 'docs/src/services/governance/todo.js',
    seedExport: 'SEED_TODOS',
    idPattern: '^todo_seed_\\d+$',
    lifecycleClass: 'business',
    initTier: 'clear',
    seedOwnedFields: [
      'id', 'title', 'description', 'role', 'category', 'priority', 'deadline', 'createdAt',
      'sourceType', 'sourceId', 'actionKey', 'actionType', 'actionData', 'flow',
    ],
    runtimeFields: ['status', 'completedAt', 'personId', 'ownerType', 'ownerId', 'voidedAt', 'voidedBy'],
  },
  {
    collection: 'signups',
    table: 'signups',
    seedModule: 'docs/src/data/mock/seed.js',
    seedExport: 'SEED_SIGNUPS',
    idPattern: '^su-\\d+$',
    lifecycleClass: 'business',
    initTier: 'clear',
    seedOwnedFields: ['id', 'sourceType', 'sourceId', 'personId', 'role', 'createdAt', 'note'],
    runtimeFields: ['status', 'reviewedBy', 'reviewedAt', 'cancelledAt', 'cancelledBy'],
  },

  // ── 复盘 / 汇报 / 宣传 ────────────────────────────────────────
  {
    collection: 'activityReviews',
    table: 'activity_reviews',
    seedModule: 'docs/src/data/mock/review.js',
    seedExport: 'REVIEW_RECORDS',
    idPattern: '^rev\\d+$',
    lifecycleClass: 'business',
    initTier: 'clear',
    seedOwnedFields: ['id', 'activityId', 'organizerId', 'workgroupId'],
    runtimeFields: [
      'progress', 'overdue', 'reviewStatus', 'reviewContent', 'submittedAt', 'confirmedAt',
      'issues', 'annotation', 'annotatedBy', 'annotatedAt',
    ],
  },
  {
    collection: 'taskforceReviews',
    table: 'taskforce_reviews',
    seedModule: 'docs/src/data/mock/review.js',
    seedExport: 'TASKFORCE_REVIEW_RECORDS',
    idPattern: '^tfrev\\d+$',
    lifecycleClass: 'business',
    initTier: 'clear',
    seedOwnedFields: ['id', 'sourceType', 'taskforceId', 'workgroupId', 'sourceName', 'organizerId'],
    runtimeFields: [
      'progress', 'overdue', 'reviewStatus', 'reviewContent', 'issues', 'submittedAt', 'confirmedAt',
    ],
  },
  {
    collection: 'thoughtReports',
    table: 'thought_reports',
    seedModule: 'docs/src/data/mock/thought-reports.js',
    seedExport: 'THOUGHT_REPORTS',
    idPattern: '^tr-\\d+$',
    lifecycleClass: 'business',
    initTier: 'clear',
    seedOwnedFields: ['id', 'personId', 'personName', 'title', 'period', 'content', 'submittedAt'],
    runtimeFields: ['reviewStatus', 'reviewHistory'],
  },
  {
    collection: 'propTasks',
    table: 'prop_tasks',
    seedModule: 'docs/src/data/mock/prop.js',
    seedExport: 'PROP_TASKS_SEED',
    idPattern: '^pt\\d+$',
    lifecycleClass: 'business',
    initTier: 'clear',
    seedOwnedFields: ['id', 'source', 'type', 'summary', 'createdAt'],
    runtimeFields: ['status'],
  },
  {
    collection: 'periodicArchives',
    table: 'periodic_archive_submissions',
    seedModule: 'docs/src/data/mock/prop.js',
    seedExport: 'PERIODIC_ARCHIVES_SEED',
    idPattern: '^pa\\d+$',
    lifecycleClass: 'archive',
    initTier: 'clear',
    seedOwnedFields: ['id', 'branchId', 'periodUnit', 'periodKey', 'periodLabel', 'periodRange'],
    runtimeFields: ['content', 'status', 'submittedAt'],
  },
  {
    collection: 'archiveRecords',
    table: 'archive_records',
    seedModule: 'docs/src/data/mock/seed.js',
    seedExport: 'SEED_ARCHIVE_RECORDS',
    idPattern: '^ar\\d+$',
    lifecycleClass: 'archive',
    initTier: 'clear',
    seedOwnedFields: ['id', 'activityId', 'activityName', 'archiveDate', 'category'],
    runtimeFields: [
      'status', 'filePath', 'fileName', 'fileSize', 'note', 'secretaryConfirmedAt', 'submittedAt',
    ],
  },

  // ── 反馈 / 上报 / 交接 / 申诉 ────────────────────────────────
  {
    collection: 'issues',
    table: 'issues',
    seedModule: 'docs/data/issues.json',
    seedExport: 'issues',
    idPattern: '^issue-\\d+$',
    lifecycleClass: 'business',
    initTier: 'clear',
    seedOwnedFields: [
      'id', 'number', 'branchId', 'title', 'body', 'scope', 'types', 'submittedBy', 'submittedAt',
      'kind', 'reportCategory', 'requestedBy', 'requestedAt', 'requestedNote',
    ],
    runtimeFields: [
      'status', 'closedReason', 'closedAt', 'assignee', 'assigneeRole', 'dispatchHistory',
      'milestone', 'hidden', 'mergedInto', 'resultPending', 'reactions', 'mentions', 'references',
      'comments', 'participants', 'commentCount', 'anonymous', '_realPersonId', 'tokenHash',
    ],
  },
  {
    collection: 'reviewRequests',
    table: 'review_requests',
    seedModule: 'docs/src/data/mock/seed.js',
    seedExport: 'SEED_REVIEW_REQUESTS',
    idPattern: '^rq-seed-\\d+$',
    lifecycleClass: 'business',
    initTier: 'clear',
    seedOwnedFields: ['id', 'branchId', 'type', 'title', 'content', 'submittedBy', 'createdAt'],
    runtimeFields: ['status', 'decidedBy', 'decidedAt', 'decisionNote'],
  },
  {
    collection: 'externalDispatches',
    table: 'external_dispatches',
    seedModule: 'server/seed.js',
    seedExport: 'SEED_EXTERNAL_DISPATCHES',
    idPattern: '^ed-seed-\\d+$',
    lifecycleClass: 'business',
    initTier: 'clear',
    seedOwnedFields: [
      'id', 'refType', 'refLabel', 'senderId', 'senderName', 'receiverRole', 'note', 'sentAt',
    ],
    runtimeFields: ['confirmedAt'],
  },
  {
    collection: 'handoffs',
    table: 'handoffs',
    seedModule: 'server/seed.js',
    seedExport: 'SEED_HANDOFFS',
    idPattern: '^ho-seed-\\d+$',
    lifecycleClass: 'business',
    initTier: 'clear',
    seedOwnedFields: ['id', 'type', 'from', 'to', 'refType', 'refLabel', 'refId', 'note', 'createdAt'],
    runtimeFields: ['status', 'confirmedAt', 'confirmedBy'],
  },
  {
    collection: 'memberConfirmations',
    table: 'member_confirmations',
    seedModule: 'server/seed.js',
    seedExport: 'SEED_MEMBER_CONFIRMATIONS',
    idPattern: '^mc-seed-\\d+$',
    lifecycleClass: 'business',
    initTier: 'clear',
    seedOwnedFields: ['id', 'kind', 'personId', 'action', 'from', 'to', 'note', 'by', 'createdAt'],
    runtimeFields: ['status', 'decidedBy', 'decidedAt', 'rejectNote'],
  },
  {
    collection: 'attendanceAppeals',
    table: 'attendance_appeals',
    seedModule: 'server/seed.js',
    seedExport: 'SEED_ATTENDANCE_APPEALS',
    idPattern: '^appeal-seed-\\d+$',
    lifecycleClass: 'business',
    initTier: 'clear',
    seedOwnedFields: ['id', 'branchId', 'personId', 'activityId', 'note', 'createdAt'],
    runtimeFields: ['status', 'decidedBy', 'decidedAt', 'decisionNote'],
  },
  {
    collection: 'inspectionAppeals',
    table: 'inspection_appeals',
    seedModule: 'server/seed.js',
    seedExport: 'SEED_INSPECTION_APPEALS',
    idPattern: '^inspAppeal-seed-\\d+$',
    lifecycleClass: 'business',
    initTier: 'clear',
    seedOwnedFields: ['id', 'branchId', 'personId', 'activityId', 'note', 'createdAt'],
    runtimeFields: ['status', 'decidedBy', 'decidedAt', 'decisionNote'],
  },
  {
    collection: 'issueUnread',
    table: 'issue_unread',
    seedModule: 'server/seed.js',
    seedExport: 'SEED_ISSUE_UNREAD',
    idPattern: '^\\d{10}:issue-\\d+$',
    lifecycleClass: 'derived',
    initTier: 'clear',
    seedOwnedFields: ['id', 'assigneeId', 'issueId'],
    runtimeFields: ['unread', 'at'],
  },

  // ── 档案 / 授权 ──────────────────────────────────────────────
  {
    collection: 'appointmentRecords',
    table: 'appointment_records',
    seedModule: 'server/seed.js',
    seedExport: 'SEED_APPOINTMENT_RECORDS',
    idPattern: '^appt-seed-\\d+$',
    lifecycleClass: 'archive',
    initTier: 'keep',
    seedOwnedFields: ['id', 'branchId', 'secretaryId', 'note', 'from'],
    runtimeFields: ['to'],
  },
  {
    collection: 'authAudit',
    table: 'auth_audit',
    seedModule: 'server/seed.js',
    seedExport: 'SEED_AUTH_AUDIT',
    idPattern: '^auth-seed-\\d+$',
    lifecycleClass: 'archive',
    initTier: 'keep',
    seedOwnedFields: ['id', 'targetPersonId', 'role', 'scopeRef', 'authorizedBy', 'authorizedAt', 'action'],
    runtimeFields: [],
  },

  // ── 工作组（由活动 / 专班种子派生）────────────────────────────
  {
    collection: 'workgroups',
    table: 'workgroups',
    seedModule: 'docs/src/data/workgroup-seed-sync.js',
    seedExport: 'ensureLegacySourceWorkgroups',
    idPattern: '^wg-(?:activity|taskforce)-.+$',
    lifecycleClass: 'derived',
    initTier: 'clear',
    seedOwnedFields: [
      'id', 'branchId', 'kind', 'sourceType', 'sourceId', 'name', 'createdAt',
    ],
    runtimeFields: [
      'status', 'organizingScope', 'hostGroupId', 'recruitmentScope',
      'crossGroupCoordinatorId', 'migrationState',
    ],
  },
  {
    collection: 'workgroupMembers',
    table: 'workgroup_members',
    seedModule: 'docs/src/data/workgroup-seed-sync.js',
    seedExport: 'ensureLegacySourceWorkgroups',
    idPattern: '^wgm-.+$',
    lifecycleClass: 'derived',
    initTier: 'clear',
    seedOwnedFields: [
      'id', 'branchId', 'workgroupId', 'personId', 'role', 'migratedFromLegacy', 'createdBy', 'createdAt',
    ],
    runtimeFields: ['status', 'crossGroup', 'coordinatedBy'],
  },
  {
    collection: 'workgroupGrants',
    table: 'workgroup_grants',
    seedModule: 'docs/src/data/workgroup-seed-sync.js',
    seedExport: 'ensureDemoWorkgroupGrants',
    idPattern: '^wgg-seed-.+$',
    lifecycleClass: 'derived',
    initTier: 'clear',
    seedOwnedFields: [
      'id', 'branchId', 'workgroupId', 'personId', 'templateKey', 'reason', 'grantedBy', 'grantedAt',
    ],
    runtimeFields: ['permissionKeys', 'status'],
  },
];

/** 按 table 索引（只读；server / mock 共用同一份清单） */
export const SEED_MANIFEST_BY_TABLE = Object.freeze(
  Object.fromEntries(SEED_MANIFEST.map((entry) => [entry.table, entry])),
);

/** 按 mockDB / 资源端点键索引（漂移检测与守卫共用） */
export const SEED_MANIFEST_BY_COLLECTION = Object.freeze(
  Object.fromEntries(SEED_MANIFEST.map((entry) => [entry.collection, entry])),
);

export const SEED_LIFECYCLE_CLASSES = Object.freeze(['skeleton', 'business', 'archive', 'derived']);
export const SEED_INIT_TIERS = Object.freeze(['keep', 'clear']);

/**
 * 无种子源、但属于**受管数据面**的 mock 持久化键 / 物理表分类。
 * 目的：让「仓库里每个持久化键、每张表归谁管」有单一登记处；守卫会逐键核对，
 * 未登记项直接报红（防止新增集合悄悄绕过生命周期规则）。
 * `dataClass`：runtime=用户/业务过程写入；internal=认证、附件、迁移元数据等内部表。
 */
export const NON_SEED_COLLECTIONS = Object.freeze([
  { collection: 'actSubRecords', table: 'act_sub_records', dataClass: 'runtime' },
  { collection: 'tfSubRecords', table: 'tf_sub_records', dataClass: 'runtime' },
  { collection: 'fileSpaceRecords', table: 'file_space_records', dataClass: 'runtime' },
  { collection: 'experienceDeposits', table: 'experience_deposits', dataClass: 'runtime' },
  { collection: 'workgroupTasks', table: 'workgroup_tasks', dataClass: 'runtime' },
  { collection: 'workgroupOutputs', table: 'workgroup_outputs', dataClass: 'runtime' },
  { collection: 'attendanceRosters', table: 'attendance_rosters', dataClass: 'runtime' },
  { collection: 'imageRecords', table: 'image_records', dataClass: 'runtime' },
  { collection: 'branchDocs', table: 'branch_docs', dataClass: 'runtime' },
  { collection: 'memberChangeRequests', table: 'member_change_requests', dataClass: 'runtime' },
  { collection: 'committeeBroadcasts', table: 'committee_broadcasts', dataClass: 'runtime' },
  { collection: 'agendaVotes', table: 'agenda_votes', dataClass: 'runtime' },
  { collection: 'memberFlows', table: 'member_flows', dataClass: 'runtime' },
  // 成员变更确认队列：内存键 pendingMemberConfirmations 与物理表 member_confirmations 同域；
  // 浏览器持久化由 member-confirmation 服务自管 localStorage 键（不在主库），故列为无种子别名。
  { collection: 'pendingMemberConfirmations', table: 'member_confirmations', dataClass: 'runtime' },
]);

/** 无种子源的物理表（含内部表）；与 NON_SEED_COLLECTIONS 共同覆盖 db.js 的全部建表。 */
export const NON_SEED_TABLES = Object.freeze([
  'act_sub_records', 'tf_sub_records', 'file_space_records', 'experience_deposits',
  'workgroup_tasks', 'workgroup_outputs', 'attendance_rosters', 'image_records',
  'branch_docs', 'member_change_requests', 'committee_broadcasts', 'agenda_votes',
  'member_flows', 'issue_reveals',
  'sessions', 'attachments', 'collection_versions', 'seed_meta',
]);

/** 持久化信封里的内部键（不承载业务数据，不参与 init 清空/保留分区以外的事）。 */
export const PERSIST_INTERNAL_KEYS = Object.freeze(['_schema', '_seedVersion']);

/** 已知持久化键 / 表分类查询（未命中 ⇒ null，供守卫抓未分类项）。 */
export function classifyPersistKey(key) {
  if (SEED_MANIFEST_BY_COLLECTION[key]) return { kind: 'seed', entry: SEED_MANIFEST_BY_COLLECTION[key] };
  const nonSeed = NON_SEED_COLLECTIONS.find((entry) => entry.collection === key);
  if (nonSeed) return { kind: 'non-seed', entry: nonSeed };
  if (PERSIST_INTERNAL_KEYS.includes(key)) return { kind: 'internal', entry: { collection: key } };
  return null;
}

export function classifyTable(table) {
  if (SEED_MANIFEST_BY_TABLE[table]) return { kind: 'seed', entry: SEED_MANIFEST_BY_TABLE[table] };
  if (NON_SEED_TABLES.includes(table)) return { kind: 'non-seed', entry: { table } };
  return null;
}
