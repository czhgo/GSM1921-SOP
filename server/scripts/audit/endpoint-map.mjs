// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  server/scripts/audit/endpoint-map.mjs —— 页签 → 读口 / 写口 / 权限门 映射（单一源）
//
//  口径（2026-11-02 批次 526 · Wave 1-B）：
//   · 键集合必须与 `server/test/style-baseline.mjs::TAB_BLOCK_BASELINE` 的 45 个键逐字一致；
//   · `read`：该页签首屏实际依赖的 GET 口（以 docs/src/services/** 与页面 import 为准）；
//   · `write`：该页签可见写动作可落到的服务端写口（以 server/routes/** + gates.js 为准），每条必须有 `gate`；
//   · `destructive`：不可在演示/共享库真实执行的流程，必须有 reason（审计只做写门证明或自带探针的软回滚）；
//   · `count`：UI 计数与接口数组长度的对账规则（`collection` 定集合，`filter` 为可选 JS 表达式，变量名 `row`；
//     `mode: 'rows' | 'total'` 缺省 `rows`，`total` 从 `.lf-count` 的「共 N」读取，分页页签必须用 `total`）；
//   · `write` 可选 `resource` / `idFrom: 'created' | 'read:<collection>' | 'fixed:<id>'`：C2 用真实 id 替换
//     `:id`（缺省按路径自动推断：`/<res>` POST 取创建 id，`/<res>/:id` 复用创建 id，`/<res>/:id/<sub>` 取列表首行）；
//   · `deadEntry: true`：页面可见写动作落到必然 403/404 的端点（真死入口），C2 直接判 P0，留待修页面/门。
//
//  ⚠ 本文件是「人工核对后落表」的资产：新增页签 / 端点必须同批补表；C4 会静态核对 gate 是否存在。
// ════════════════════════════════════════════════════════════════

const R = {
  users: 'GET /api/v1/users',
  activities: 'GET /api/v1/activities',
  attendances: 'GET /api/v1/attendances',
  inspections: 'GET /api/v1/inspections',
  taskforces: 'GET /api/v1/taskforces',
  notices: 'GET /api/v1/notices',
  todos: 'GET /api/v1/todos',
  tasks: 'GET /api/v1/tasks',
  assignments: 'GET /api/v1/assignments',
  fileSpaceRecords: 'GET /api/v1/fileSpaceRecords',
  imageRecords: 'GET /api/v1/imageRecords',
  makeupTasks: 'GET /api/v1/makeupTasks',
  signups: 'GET /api/v1/signups',
  activityReviews: 'GET /api/v1/activityReviews',
  taskforceReviews: 'GET /api/v1/taskforceReviews',
  propTasks: 'GET /api/v1/propTasks',
  periodicArchives: 'GET /api/v1/periodicArchives',
  archiveRecords: 'GET /api/v1/archiveRecords',
  externalDispatches: 'GET /api/v1/externalDispatches',
  branchDocs: 'GET /api/v1/branchDocs',
  branches: 'GET /api/v1/branches',
  partyGroups: 'GET /api/v1/partyGroups',
  memberFlows: 'GET /api/v1/memberFlows',
  thoughtReports: 'GET /api/v1/thoughtReports',
  reviewRequests: 'GET /api/v1/reviewRequests',
  appointmentRecords: 'GET /api/v1/appointmentRecords',
  issues: 'GET /api/v1/issues',
  handoffs: 'GET /api/v1/handoffs',
  memberConfirmations: 'GET /api/v1/member-confirmations',
  attendanceAppeals: 'GET /api/v1/attendance-appeals',
  inspectionAppeals: 'GET /api/v1/inspection-appeals',
  issueUnread: 'GET /api/v1/issue-unread',
  authAudit: 'GET /api/v1/auth-audit',
  milestones: 'GET /api/v1/milestones',
  workgroups: 'GET /api/v1/workgroups',
  workgroupMembers: 'GET /api/v1/workgroup-members',
  workgroupGrants: 'GET /api/v1/workgroup-grants',
  agendaVotes: 'GET /api/v1/agenda-votes',
  memberChangeRequests: 'GET /api/v1/member-change-requests',
  committeeBroadcasts: 'GET /api/v1/committeeBroadcasts',
  snapshotVersions: 'GET /api/v1/snapshot/versions',
  setupStatus: 'GET /api/v1/setup-status',
};

/** 读口小工具：按 key 取路径 */
const read = (...keys) => keys.map((key) => {
  if (!R[key]) throw new Error(`[endpoint-map] 未登记的读口 key：${key}`);
  return R[key];
});

/** 写口小工具：method + path + gate + flow（flow 同时用于 C3 死入口核对） */
const write = (method, path, gate, flow, extra = {}) => ({ method, path, gate, flow, ...extra });

const SRC = {
  secretaryToday: 'docs/src/entries/tabs/today/today-tab.js',
  secretaryTodo: 'docs/src/entries/tabs/secretary/todo-tab.js',
  secretaryOverview: 'docs/src/entries/tabs/secretary/overview-tab.js',
  secretaryCalendar: 'docs/src/entries/tabs/secretary/calendar-tab.js',
  secretaryCommittee: 'docs/src/entries/tabs/secretary/committee-meeting-tab.js',
  secretaryGroup: 'docs/src/entries/tabs/secretary/group-progress-tab.js',
  secretaryNotification: 'docs/src/entries/tabs/secretary/notification-tab.js',
  secretaryReportUp: 'docs/src/entries/tabs/secretary/report-up-tab.js',
  secretaryWorkMap: 'docs/src/entries/tabs/secretary/work-map-tab.js',
  secretaryFeedback: 'docs/src/entries/tabs/secretary/feedback-tab.js',
  orgToday: 'docs/src/entries/tabs/today/today-tab.js',
  orgTodo: 'docs/src/entries/tabs/org/todo-tab.js',
  orgOverview: 'docs/src/entries/tabs/org/overview-tab.js',
  orgRoster: 'docs/src/entries/tabs/org/roster-tab.js',
  orgTalent: 'docs/src/entries/tabs/org/talent-tab.js',
  orgThought: 'docs/src/entries/tabs/org/thought-review-tab.js',
  orgTaskforce: 'docs/src/entries/tabs/org/taskforce-tab.js',
  orgMemberFlow: 'docs/src/entries/tabs/org/member-flow-tab.js',
  propToday: 'docs/src/entries/tabs/today/today-tab.js',
  propTodo: 'docs/src/entries/tabs/prop/todo-tab.js',
  propOverview: 'docs/src/entries/tabs/prop/overview-tab.js',
  propKanban: 'docs/src/entries/tabs/prop/kanban-tab.js',
  propArchive: 'docs/src/entries/tabs/prop/archive-tab.js',
  discToday: 'docs/src/entries/tabs/today/today-tab.js',
  discTodo: 'docs/src/entries/tabs/disc/todo-tab.js',
  discOverview: 'docs/src/entries/tabs/disc/overview-tab.js',
  discAttendance: 'docs/src/entries/tabs/disc/attendance-tab.js',
  discReview: 'docs/src/entries/tabs/disc/review-tab.js',
  discInspection: 'docs/src/entries/tabs/disc/inspection-tab.js',
  leaderToday: 'docs/src/entries/tabs/today/today-tab.js',
  leaderTodo: 'docs/src/entries/tabs/leader/todo-tab.js',
  leaderOverview: 'docs/src/entries/tabs/leader/overview-tab.js',
  leaderWrite: 'docs/src/entries/tabs/leader/write-tab.js',
  leaderAttendance: 'docs/src/entries/tabs/leader/attendance-tab.js',
  leaderMembers: 'docs/src/entries/tabs/leader/members-tab.js',
  visitorToday: 'docs/src/entries/tabs/today/today-tab.js',
  visitorTodo: 'docs/src/entries/tabs/visitor/todo-tab.js',
  visitorOverview: 'docs/src/entries/tabs/visitor/overview-tab.js',
  visitorActivities: 'docs/src/entries/tabs/visitor/activities-tab.js',
  visitorProjects: 'docs/src/entries/tabs/visitor/projects-tab.js',
  visitorAttendance: 'docs/src/entries/tabs/visitor/attendance-tab.js',
  visitorGrowth: 'docs/src/entries/tabs/visitor/growth-tab.js',
  partyDispatch: 'docs/src/entries/tabs/party-committee/dispatch-tab.js',
  partyReview: 'docs/src/entries/tabs/party-committee/review-tab.js',
  partyBranches: 'docs/src/entries/tabs/party-committee/branches-tab.js',
};

export const ENDPOINT_MAP = {
  // ── 支书台（10）────────────────────────────────────────────────
  'secretary.today': {
    source: SRC.secretaryToday,
    read: read('users', 'todos', 'notices', 'activities', 'attendances', 'inspections',
      'activityReviews', 'taskforceReviews', 'handoffs', 'issues', 'partyGroups', 'milestones'),
    write: [
      write('PATCH', '/api/v1/todos/:id', 'todo-row', 'todo-complete', { selfService: true }),
      write('POST', '/api/v1/issue-unread', 'requireAuth', 'issue-unread', { selfService: true }),
      write('POST', '/api/v1/attendance-appeals', 'requireAuth', 'attendance-appeal', { selfService: true }),
      write('POST', '/api/v1/inspection-appeals', 'requireAuth', 'inspection-appeal', { selfService: true }),
    ],
    destructive: [],
    count: [],
  },
  'secretary.todo': {
    source: SRC.secretaryTodo,
    read: read('todos', 'handoffs', 'activities', 'inspections', 'attendances', 'users', 'issues',
      'memberConfirmations', 'partyGroups'),
    write: [
      write('POST', '/api/v1/todos', 'todo-row', 'todo-create'),
      write('PATCH', '/api/v1/todos/:id', 'todo-row', 'todo-complete', { selfService: true }),
      write('POST', '/api/v1/handoffs', 'requireAuth', 'handoff-create'),
      write('POST', '/api/v1/handoffs/:id/confirm', 'requireAuth', 'handoff-confirm'),
      write('POST', '/api/v1/member-confirmations/:id/decide', 'SECRETARY_AND_DEPUTY_ROLE_SET', 'member-confirm-decide'),
    ],
    destructive: [],
    count: [],
  },
  'secretary.overview': {
    source: SRC.secretaryOverview,
    read: read('activities', 'attendances', 'tasks', 'todos', 'notices', 'reviewRequests',
      'periodicArchives', 'archiveRecords', 'users', 'issues', 'partyGroups'),
    write: [
      write('POST', '/api/v1/todos', 'todo-row', 'todo-create'),
      write('PATCH', '/api/v1/todos/:id', 'todo-row', 'todo-complete', { selfService: true }),
      write('PATCH', '/api/v1/periodicArchives/:id', 'committee-only', 'periodic-archive-review'),
      write('POST', '/api/v1/issues', 'requireAuth', 'issue-submit', { selfService: true }),
    ],
    destructive: [],
    count: [],
  },
  'secretary.calendar': {
    source: SRC.secretaryCalendar,
    read: read('activities', 'partyGroups', 'users', 'attendances', 'notices', 'branchDocs', 'branches'),
    write: [
      write('POST', '/api/v1/activities', 'ACTIVITY_WRITE_ROLES', 'activity-create'),
      write('PATCH', '/api/v1/activities/:id', 'ACTIVITY_WRITE_ROLES', 'activity-update'),
      write('DELETE', '/api/v1/activities/:id', 'ACTIVITY_WRITE_ROLES', 'activity-delete'),
      write('POST', '/api/v1/activities/:id/archive', 'requireAuth', 'activity-archive'),
      write('POST', '/api/v1/activities/:id/brand', 'requireAuth', 'activity-brand'),
      write('POST', '/api/v1/todos', 'todo-row', 'todo-create'),
      write('POST', '/api/v1/notices', 'notice-publish', 'notice-publish'),
      write('POST', '/api/v1/branchDocs', 'requireCommissioner', 'branch-doc-upload'),
      write('POST', '/api/v1/uploads', 'requireCommissioner', 'file-upload'),
    ],
    destructive: [
      { flow: 'activity-delete', reason: '活动删除会级联清理考勤/分工/文件；审计只做创建→更新→软回滚，不真删存量' },
    ],
    count: [],
    // C3：本页是唯一使用 data-action 写动作的页签；非写动作登记为只读 UI。
    actionMap: {
      'wp-submit': 'activity-create',
      'agenda-add': 'activity-update',
      'agenda-add-vote-pair': 'activity-update',
      'agenda-remove': 'activity-update',
      'agenda-candidates-add': 'activity-update',
      'wp-auth-add': 'activity-update',
    },
    knownReadOnlyActions: ['wp-cancel', 'wp-back', 'select-template', 'agenda-candidates-toggle'],
  },
  'secretary.committee-meeting': {
    source: SRC.secretaryCommittee,
    read: read('activities', 'agendaVotes', 'users', 'partyGroups', 'branches', 'activityReviews'),
    write: [
      write('POST', '/api/v1/activities', 'ACTIVITY_WRITE_ROLES', 'activity-create'),
      write('PATCH', '/api/v1/activities/:id', 'ACTIVITY_WRITE_ROLES', 'activity-update'),
      write('POST', '/api/v1/agenda-votes', 'requireAuth', 'agenda-vote-create'),
      write('POST', '/api/v1/agenda-votes/:id/annotate', 'requireCommissioner', 'agenda-vote-annotate'),
      write('POST', '/api/v1/agenda-votes/lock', 'SECRETARY_AND_DEPUTY_ROLES', 'agenda-vote-lock'),
      write('POST', '/api/v1/branches/:id/branch-commissioners', 'SECRETARY_AND_DEPUTY_ROLE_SET', 'branch-commissioner-assign'),
      write('POST', '/api/v1/notices', 'notice-publish', 'notice-publish'),
    ],
    destructive: [],
    count: [],
  },
  'secretary.group-progress': {
    source: SRC.secretaryGroup,
    read: read('partyGroups', 'users', 'activities', 'activityReviews', 'attendances', 'issues', 'todos'),
    write: [
      write('POST', '/api/v1/partyGroups', 'secretary', 'group-create'),
      write('PATCH', '/api/v1/partyGroups/:id', 'secretary', 'group-rename'),
      write('DELETE', '/api/v1/partyGroups/:id', 'secretary', 'group-dissolve', { destructive: true, reason: '解散为软删除（status=dissolved）且会批量清空成员 partyGroup；审计仅创建/删除自带试点组，不碰既有组' }),
      write('POST', '/api/v1/issues', 'requireAuth', 'group-ask-leader', { selfService: true }),
      write('POST', '/api/v1/todos', 'todo-row', 'todo-create'),
      write('POST', '/api/v1/issue-unread', 'requireAuth', 'issue-unread', { selfService: true }),
    ],
    destructive: [
      { flow: 'group-dissolve', reason: '解散为软删除（status=dissolved）且会批量清空成员 partyGroup；审计仅创建/删除自带试点组，不碰既有组' },
    ],
    count: [
      { ui: '.gp-group-row', collection: 'partyGroups', endpoint: 'GET /api/v1/partyGroups', filter: "row.status === 'active'" },
    ],
  },
  'secretary.notification': {
    source: SRC.secretaryNotification,
    read: read('notices', 'users', 'todos', 'issueUnread', 'partyGroups'),
    write: [
      write('POST', '/api/v1/notices', 'notice-publish', 'notice-publish'),
      write('PATCH', '/api/v1/notices/:id', 'notice-manage', 'notice-edit'),
      write('DELETE', '/api/v1/notices/:id', 'notice-manage', 'notice-delete'),
      write('POST', '/api/v1/system-notices', 'requireAuth', 'system-notice-create'),
      write('POST', '/api/v1/issue-unread', 'requireAuth', 'issue-unread', { selfService: true }),
    ],
    destructive: [
      { flow: 'notice-delete', reason: '删除通知会从受众视野移除；审计只删除自带试点草稿（创建→更新→删除）' },
    ],
    count: [],
  },
  'secretary.report-up': {
    source: SRC.secretaryReportUp,
    read: read('activities', 'tasks', 'assignments', 'users', 'attendances', 'notices', 'todos', 'partyGroups'),
    write: [
      write('POST', '/api/v1/tasks', 'task-row', 'task-create'),
      write('PATCH', '/api/v1/tasks/:id', 'task-row', 'task-update'),
      write('POST', '/api/v1/assignments', 'assignment-row', 'assignment-create'),
      write('PATCH', '/api/v1/assignments/:id', 'assignment-row', 'assignment-update'),
      write('POST', '/api/v1/notices', 'notice-publish', 'notice-publish'),
      write('POST', '/api/v1/todos', 'todo-row', 'todo-create'),
    ],
    destructive: [],
    count: [],
  },
  'secretary.work-map': {
    source: SRC.secretaryWorkMap,
    read: read('tasks', 'assignments', 'activities', 'users', 'todos', 'partyGroups'),
    write: [
      write('POST', '/api/v1/tasks', 'task-row', 'task-create'),
      write('PATCH', '/api/v1/tasks/:id', 'task-row', 'task-update'),
      write('DELETE', '/api/v1/tasks/:id', 'task-row', 'task-delete'),
      write('POST', '/api/v1/assignments', 'assignment-row', 'assignment-create'),
      write('PATCH', '/api/v1/assignments/:id', 'assignment-row', 'assignment-update'),
      write('DELETE', '/api/v1/assignments/:id', 'assignment-row', 'assignment-delete'),
    ],
    destructive: [
      { flow: 'assignment-delete', reason: '删除分工属治理动作；审计不真删存量，只验证越权 403 与静态写门' },
    ],
    count: [],
  },
  'secretary.feedback': {
    source: SRC.secretaryFeedback,
    read: read('issues', 'issueUnread', 'users', 'todos', 'partyGroups'),
    write: [
      write('POST', '/api/v1/issues', 'requireAuth', 'issue-submit', { selfService: true }),
      write('PATCH', '/api/v1/issues/:id', 'requireRole', 'issue-dispose'),
      write('POST', '/api/v1/issue-unread', 'requireAuth', 'issue-unread', { selfService: true }),
      write('POST', '/api/v1/todos', 'todo-row', 'todo-create'),
      write('PATCH', '/api/v1/todos/:id', 'todo-row', 'todo-complete', { selfService: true }),
    ],
    destructive: [],
    count: [],
  },

  // ── 组织台（8）─────────────────────────────────────────────────
  'org.today': {
    source: SRC.orgToday,
    read: read('users', 'todos', 'notices', 'activities', 'attendances', 'inspections', 'issues',
      'memberConfirmations', 'handoffs', 'partyGroups', 'milestones'),
    write: [
      write('PATCH', '/api/v1/todos/:id', 'todo-row', 'todo-complete', { selfService: true }),
      write('POST', '/api/v1/issue-unread', 'requireAuth', 'issue-unread', { selfService: true }),
      write('POST', '/api/v1/attendance-appeals', 'requireAuth', 'attendance-appeal', { selfService: true }),
      write('POST', '/api/v1/inspection-appeals', 'requireAuth', 'inspection-appeal', { selfService: true }),
    ],
    destructive: [],
    count: [],
  },
  'org.todo': {
    source: SRC.orgTodo,
    read: read('todos', 'handoffs', 'activities', 'inspections', 'users', 'issues', 'memberConfirmations', 'partyGroups'),
    write: [
      write('POST', '/api/v1/todos', 'todo-row', 'todo-create'),
      write('PATCH', '/api/v1/todos/:id', 'todo-row', 'todo-complete', { selfService: true }),
      write('POST', '/api/v1/handoffs', 'requireAuth', 'handoff-create'),
      write('POST', '/api/v1/handoffs/:id/confirm', 'requireAuth', 'handoff-confirm'),
      write('POST', '/api/v1/member-confirmations/:id/decide', 'SECRETARY_AND_DEPUTY_ROLE_SET', 'member-confirm-decide'),
    ],
    destructive: [],
    count: [],
  },
  'org.overview': {
    source: SRC.orgOverview,
    read: read('activities', 'attendances', 'tasks', 'todos', 'notices', 'reviewRequests',
      'periodicArchives', 'archiveRecords', 'users', 'issues', 'partyGroups'),
    write: [
      write('POST', '/api/v1/todos', 'todo-row', 'todo-create'),
      write('PATCH', '/api/v1/todos/:id', 'todo-row', 'todo-complete', { selfService: true }),
      write('POST', '/api/v1/reviewRequests', 'branch-committee', 'review-request-create'),
      write('PATCH', '/api/v1/periodicArchives/:id', 'committee-only', 'periodic-archive-review'),
      write('POST', '/api/v1/issues', 'requireAuth', 'issue-submit', { selfService: true }),
    ],
    destructive: [],
    count: [],
  },
  'org.roster': {
    source: SRC.orgRoster,
    read: read('users', 'memberFlows', 'memberConfirmations', 'partyGroups', 'attendances', 'branches'),
    write: [
      write('POST', '/api/v1/members', 'ORG_COMMISSIONER_ROLES', 'member-create'),
      write('POST', '/api/v1/members/intake', 'member-flow', 'member-intake'),
      write('PATCH', '/api/v1/members/:id/profile', 'requireAuth', 'member-profile-edit', { selfService: true }),
      write('POST', '/api/v1/members/:id/transfer-out', 'MEMBER_FLOW_ROLES', 'member-transfer-out'),
      write('POST', '/api/v1/members/:id/undo-transfer-out', 'MEMBER_FLOW_ROLES', 'member-transfer-undo'),
      write('POST', '/api/v1/member-confirmations', 'ORG_COMMISSIONER_ROLE_SET', 'member-confirm-submit'),
      write('POST', '/api/v1/memberFlows', 'member-flow', 'member-flow-create'),
      write('PATCH', '/api/v1/memberFlows/:id', 'member-flow', 'member-flow-update'),
      write('PATCH', '/api/v1/users/:id', 'branch-commissioner', 'user-role-assign'),
    ],
    destructive: [
      { flow: 'member-transfer-out', reason: '转出会停用账号并移出名册；审计只验证写门与越权 403，不做真实转出' },
    ],
    count: [
      // 名单页是分页表（list-filter 每页 10 行）⇒ 与接口数组对账必须用「共 N」总数，不能数当页行。
      { ui: '.roster-row', collection: 'users', mode: 'total', filter: "row.branchId != null && row.transferOut !== true" },
    ],
  },
  'org.talent': {
    source: SRC.orgTalent,
    read: read('inspections', 'attendances', 'thoughtReports', 'users', 'memberConfirmations',
      'activityReviews', 'partyGroups'),
    write: [
      write('POST', '/api/v1/inspections', 'inspection', 'inspection-create'),
      write('PATCH', '/api/v1/inspections/:id', 'inspection', 'inspection-update'),
      write('POST', '/api/v1/inspection-appeals', 'requireAuth', 'inspection-appeal', { selfService: true }),
    ],
    destructive: [],
    count: [],
  },
  'org.thought-review': {
    source: SRC.orgThought,
    read: read('thoughtReports', 'users', 'partyGroups'),
    write: [],
    readOnlyReason: '思想汇报总表为只读汇总；本人提交入口在成员台「成长」页，本页不承载写动作',
    destructive: [],
    count: [],
  },
  'org.taskforce': {
    source: SRC.orgTaskforce,
    read: read('taskforces', 'workgroups', 'workgroupMembers', 'workgroupGrants', 'signups',
      'taskforceReviews', 'activityReviews', 'activities', 'todos', 'notices', 'users'),
    write: [
      write('POST', '/api/v1/taskforces', 'requireAuth', 'taskforce-create'),
      write('PATCH', '/api/v1/taskforces/:id', 'requireAuth', 'taskforce-update'),
      write('POST', '/api/v1/taskforces/:id/dissolution', 'requireAuth', 'taskforce-dissolution'),
      write('POST', '/api/v1/signups', 'requireAuth', 'signup-create', { selfService: true }),
      write('PATCH', '/api/v1/signups/:id', 'requireAuth', 'signup-review'),
      write('POST', '/api/v1/activityReviews', 'committee-or-organizer', 'activity-review-create'),
      write('PATCH', '/api/v1/activityReviews/:id', 'committee-or-organizer', 'activity-review-update'),
      write('POST', '/api/v1/taskforceReviews', 'committee-or-organizer', 'taskforce-review-create'),
      write('PATCH', '/api/v1/taskforceReviews/:id', 'committee-or-organizer', 'taskforce-review-update'),
      write('POST', '/api/v1/workgroups/:id/members', 'requireAuth', 'workgroup-member-add'),
      write('PUT', '/api/v1/workgroups/:id/members', 'requireAuth', 'workgroup-member-save'),
      write('DELETE', '/api/v1/workgroups/:id/members/:personId', 'requireAuth', 'workgroup-member-remove'),
      write('POST', '/api/v1/workgroups/:id/tasks', 'requireAuth', 'workgroup-task-create'),
      write('PATCH', '/api/v1/workgroups/:id/tasks/:taskId', 'requireAuth', 'workgroup-task-update'),
      write('POST', '/api/v1/workgroups/:id/outputs', 'requireAuth', 'workgroup-output-create'),
      write('POST', '/api/v1/workgroups/:id/coordinate', 'requireAuth', 'workgroup-coordinate'),
      write('POST', '/api/v1/todos', 'todo-row', 'todo-create'),
      write('POST', '/api/v1/notices', 'notice-publish', 'notice-publish'),
    ],
    destructive: [
      { flow: 'taskforce-dissolution', reason: '解散专班走语义端点并联动工作组状态；审计只验证写门，不真解散' },
    ],
    count: [],
  },
  'org.member-flow': {
    source: SRC.orgMemberFlow,
    read: read('memberFlows', 'users', 'partyGroups', 'memberConfirmations', 'branches'),
    write: [
      write('POST', '/api/v1/members/intake', 'member-flow', 'member-intake'),
      write('POST', '/api/v1/members/:id/transfer-out', 'MEMBER_FLOW_ROLES', 'member-transfer-out'),
      write('POST', '/api/v1/members/:id/undo-transfer-out', 'MEMBER_FLOW_ROLES', 'member-transfer-undo'),
      write('POST', '/api/v1/memberFlows', 'member-flow', 'member-flow-create'),
      write('PATCH', '/api/v1/memberFlows/:id', 'member-flow', 'member-flow-update'),
      write('POST', '/api/v1/member-confirmations', 'ORG_COMMISSIONER_ROLE_SET', 'member-confirm-submit'),
      write('PATCH', '/api/v1/users/:id', 'branch-commissioner', 'user-role-assign'),
    ],
    destructive: [
      { flow: 'member-transfer-out', reason: '转出停用账号，不在审计库执行真实转出' },
    ],
    count: [],
  },

  // ── 宣传台（5）─────────────────────────────────────────────────
  'prop.today': {
    source: SRC.propToday,
    read: read('users', 'todos', 'notices', 'activities', 'attendances', 'issues',
      'archiveRecords', 'propTasks', 'milestones'),
    write: [
      write('PATCH', '/api/v1/todos/:id', 'todo-row', 'todo-complete', { selfService: true }),
      write('POST', '/api/v1/issue-unread', 'requireAuth', 'issue-unread', { selfService: true }),
      write('POST', '/api/v1/attendance-appeals', 'requireAuth', 'attendance-appeal', { selfService: true }),
    ],
    destructive: [],
    count: [],
  },
  'prop.todo': {
    source: SRC.propTodo,
    read: read('todos', 'handoffs', 'activities', 'notices', 'archiveRecords', 'users', 'issues'),
    write: [
      write('PATCH', '/api/v1/todos/:id', 'todo-row', 'todo-complete', { selfService: true }),
      write('POST', '/api/v1/handoffs', 'requireAuth', 'handoff-create'),
      write('POST', '/api/v1/handoffs/:id/confirm', 'requireAuth', 'handoff-confirm'),
    ],
    destructive: [],
    count: [],
  },
  'prop.overview': {
    source: SRC.propOverview,
    read: read('activities', 'archiveRecords', 'periodicArchives', 'tasks', 'todos', 'notices', 'users', 'issues'),
    write: [
      write('POST', '/api/v1/tasks', 'task-row', 'task-create'),
      write('PATCH', '/api/v1/tasks/:id', 'task-row', 'task-update'),
      write('PATCH', '/api/v1/todos/:id', 'todo-row', 'todo-complete', { selfService: true }),
      write('POST', '/api/v1/periodicArchives', 'committee-only', 'periodic-archive-submit'),
    ],
    destructive: [],
    count: [],
  },
  'prop.kanban': {
    source: SRC.propKanban,
    read: read('activities', 'propTasks', 'archiveRecords', 'todos', 'users', 'notices', 'partyGroups'),
    write: [
      write('POST', '/api/v1/propTasks', 'committee-only', 'prop-task-create'),
      write('PATCH', '/api/v1/propTasks/:id', 'committee-only', 'prop-task-update'),
      write('DELETE', '/api/v1/propTasks/:id', 'committee-only', 'prop-task-delete'),
      write('PATCH', '/api/v1/activities/:id', 'ACTIVITY_WRITE_ROLES', 'activity-update'),
      write('POST', '/api/v1/todos', 'todo-row', 'todo-create'),
    ],
    destructive: [
      { flow: 'prop-task-delete', reason: '宣传任务删除属治理动作；审计只验证越权 403 与静态写门' },
    ],
    count: [],
  },
  'prop.archive': {
    source: SRC.propArchive,
    read: read('activities', 'archiveRecords', 'externalDispatches', 'fileSpaceRecords',
      'imageRecords', 'branchDocs', 'periodicArchives', 'users'),
    write: [
      write('POST', '/api/v1/activities/:id/archive', 'requireAuth', 'activity-archive'),
      write('PATCH', '/api/v1/activities/:id', 'ACTIVITY_WRITE_ROLES', 'activity-update'),
      write('POST', '/api/v1/activities/:id/brand', 'requireAuth', 'activity-brand'),
      write('POST', '/api/v1/archiveRecords', 'committee-only', 'archive-record-create'),
      write('PATCH', '/api/v1/archiveRecords/:id', 'committee-only', 'archive-record-update'),
      write('DELETE', '/api/v1/archiveRecords/:id', 'committee-only', 'archive-record-delete'),
      write('POST', '/api/v1/externalDispatches', 'committee-only', 'external-dispatch-create'),
      write('PATCH', '/api/v1/externalDispatches/:id', 'committee-only', 'external-dispatch-update'),
      write('POST', '/api/v1/fileSpaceRecords', 'requireCommissioner', 'file-space-create'),
      write('POST', '/api/v1/imageRecords', 'requireCommissioner', 'image-record-create'),
      write('POST', '/api/v1/branchDocs', 'requireCommissioner', 'branch-doc-upload'),
      write('PATCH', '/api/v1/periodicArchives/:id', 'committee-only', 'periodic-archive-review'),
      write('POST', '/api/v1/uploads', 'requireCommissioner', 'file-upload'),
    ],
    destructive: [
      { flow: 'archive-record-delete', reason: '归档记录删除会联动物理文件；审计只删除自带试点元数据并清理' },
    ],
    count: [],
  },

  // ── 纪检台（6）─────────────────────────────────────────────────
  'disc.today': {
    source: SRC.discToday,
    read: read('users', 'todos', 'notices', 'activities', 'attendances', 'inspections',
      'activityReviews', 'issues', 'handoffs', 'milestones'),
    write: [
      write('PATCH', '/api/v1/todos/:id', 'todo-row', 'todo-complete', { selfService: true }),
      write('PATCH', '/api/v1/attendances/:id', 'requireAuth', 'attendance-confirm'),
      write('PATCH', '/api/v1/inspections/:id', 'inspection', 'inspection-confirm'),
      write('POST', '/api/v1/issue-unread', 'requireAuth', 'issue-unread', { selfService: true }),
      write('POST', '/api/v1/attendance-appeals', 'requireAuth', 'attendance-appeal', { selfService: true }),
      write('POST', '/api/v1/inspection-appeals', 'requireAuth', 'inspection-appeal', { selfService: true }),
    ],
    destructive: [],
    count: [],
  },
  'disc.todo': {
    source: SRC.discTodo,
    read: read('todos', 'handoffs', 'activities', 'inspections', 'attendances', 'users', 'issues', 'memberConfirmations'),
    write: [
      write('PATCH', '/api/v1/todos/:id', 'todo-row', 'todo-complete', { selfService: true }),
      write('POST', '/api/v1/handoffs', 'requireAuth', 'handoff-create'),
      write('POST', '/api/v1/handoffs/:id/confirm', 'requireAuth', 'handoff-confirm'),
      write('PATCH', '/api/v1/attendances/:id', 'requireAuth', 'attendance-confirm'),
      write('PATCH', '/api/v1/inspections/:id', 'inspection', 'inspection-confirm'),
      write('POST', '/api/v1/member-confirmations/:id/decide', 'SECRETARY_AND_DEPUTY_ROLE_SET', 'member-confirm-decide'),
    ],
    destructive: [],
    count: [],
  },
  'disc.overview': {
    source: SRC.discOverview,
    read: read('activities', 'attendances', 'tasks', 'todos', 'notices', 'reviewRequests',
      'periodicArchives', 'archiveRecords', 'users', 'issues', 'inspections'),
    write: [
      write('PATCH', '/api/v1/todos/:id', 'todo-row', 'todo-complete', { selfService: true }),
      write('PATCH', '/api/v1/attendances/:id', 'requireAuth', 'attendance-confirm'),
      write('PATCH', '/api/v1/inspections/:id', 'inspection', 'inspection-confirm'),
      write('POST', '/api/v1/issues', 'requireAuth', 'issue-submit', { selfService: true }),
    ],
    destructive: [],
    count: [],
  },
  'disc.attendance': {
    source: SRC.discAttendance,
    read: read('activities', 'attendances', 'signups', 'makeupTasks', 'taskforces', 'users',
      'partyGroups', 'handoffs', 'notices', 'attendanceAppeals', 'issueUnread'),
    write: [
      write('POST', '/api/v1/attendances', 'requireAuth', 'attendance-create'),
      write('PATCH', '/api/v1/attendances/:id', 'requireAuth', 'attendance-update'),
      write('POST', '/api/v1/makeupTasks', 'committee-only', 'makeup-task-create'),
      write('PATCH', '/api/v1/signups/:id', 'requireAuth', 'signup-review'),
      write('PATCH', '/api/v1/activities/:id', 'ACTIVITY_WRITE_ROLES', 'activity-update'),
      // 2026-11-02 修正：本页确认考勤后的通知走 `addSystem('attendance-confirmed', …)`
      // （docs/src/entries/tabs/disc/attendance-tab.js:711）⇒ 写口是 system-notices，不是 `/notices`。
      write('POST', '/api/v1/system-notices', 'attendance-confirmed', 'attendance-confirmed-notice'),
      write('PATCH', '/api/v1/attendance-appeals/:id', 'requireRole', 'attendance-appeal-dispose'),
      write('POST', '/api/v1/issue-unread', 'requireAuth', 'issue-unread', { selfService: true }),
      write('POST', '/api/v1/handoffs', 'requireAuth', 'handoff-create'),
      write('POST', '/api/v1/todos', 'todo-row', 'todo-create'),
    ],
    destructive: [],
    count: [],
  },
  'disc.review': {
    source: SRC.discReview,
    read: read('activityReviews', 'taskforceReviews', 'activities', 'notices', 'users', 'todos', 'partyGroups'),
    write: [
      write('POST', '/api/v1/activityReviews', 'committee-or-organizer', 'activity-review-create'),
      write('PATCH', '/api/v1/activityReviews/:id', 'committee-or-organizer', 'activity-review-update'),
      write('POST', '/api/v1/taskforceReviews', 'committee-or-organizer', 'taskforce-review-create'),
      write('PATCH', '/api/v1/taskforceReviews/:id', 'committee-or-organizer', 'taskforce-review-update'),
      write('PATCH', '/api/v1/activities/:id', 'ACTIVITY_WRITE_ROLES', 'activity-update'),
      // 2026-11-02 修正：本页「超期/重提提醒」走 `_notifyReviewOrganizer` → `addSystem(kind, …)`
      // （docs/src/entries/tabs/disc/review-tab.js:45/426/530，kind=review-overdue-reminder /
      // review-resubmit-reminder）⇒ 写口是 system-notices，不是 `/notices`。
      write('POST', '/api/v1/system-notices', 'review-overdue-reminder', 'review-overdue-reminder'),
      write('POST', '/api/v1/todos', 'todo-row', 'todo-create'),
    ],
    destructive: [],
    count: [],
  },
  'disc.inspection': {
    source: SRC.discInspection,
    read: read('inspections', 'inspectionAppeals', 'activities', 'users', 'handoffs',
      'workgroupMembers', 'workgroups', 'partyGroups'),
    write: [
      write('POST', '/api/v1/inspections', 'inspection', 'inspection-create'),
      write('PATCH', '/api/v1/inspections/:id', 'inspection', 'inspection-confirm'),
      write('DELETE', '/api/v1/inspections/:id', 'inspection', 'inspection-delete'),
      write('PATCH', '/api/v1/inspection-appeals/:id', 'requireRole', 'inspection-appeal-dispose'),
      write('POST', '/api/v1/handoffs', 'requireAuth', 'handoff-create'),
      write('POST', '/api/v1/todos', 'todo-row', 'todo-create'),
      write('POST', '/api/v1/issue-unread', 'requireAuth', 'issue-unread', { selfService: true }),
    ],
    destructive: [
      { flow: 'inspection-delete', reason: '删除考察记录不可逆；审计只验证写门与确认/打回，不删存量' },
    ],
    count: [],
  },

  // ── 组长台（6）─────────────────────────────────────────────────
  'leader.today': {
    source: SRC.leaderToday,
    read: read('users', 'todos', 'notices', 'activities', 'attendances', 'inspections',
      'issues', 'partyGroups', 'milestones'),
    write: [
      write('PATCH', '/api/v1/todos/:id', 'todo-row', 'todo-complete', { selfService: true }),
      write('POST', '/api/v1/issue-unread', 'requireAuth', 'issue-unread', { selfService: true }),
      write('POST', '/api/v1/attendance-appeals', 'requireAuth', 'attendance-appeal', { selfService: true }),
      write('POST', '/api/v1/inspection-appeals', 'requireAuth', 'inspection-appeal', { selfService: true }),
    ],
    destructive: [],
    count: [],
  },
  'leader.todo': {
    source: SRC.leaderTodo,
    read: read('todos', 'handoffs', 'activities', 'inspections', 'attendances', 'users', 'issues'),
    write: [
      write('PATCH', '/api/v1/todos/:id', 'todo-row', 'todo-complete', { selfService: true }),
      write('POST', '/api/v1/handoffs/:id/confirm', 'requireAuth', 'handoff-confirm'),
      write('PATCH', '/api/v1/attendances/:id', 'requireAuth', 'attendance-confirm'),
    ],
    destructive: [],
    count: [],
  },
  'leader.overview': {
    source: SRC.leaderOverview,
    read: read('activities', 'attendances', 'tasks', 'todos', 'notices', 'users', 'issues', 'partyGroups'),
    write: [
      write('PATCH', '/api/v1/todos/:id', 'todo-row', 'todo-complete', { selfService: true }),
      write('PATCH', '/api/v1/attendances/:id', 'requireAuth', 'attendance-confirm'),
    ],
    destructive: [],
    count: [],
  },
  'leader.write': {
    source: SRC.leaderWrite,
    read: read('activities', 'partyGroups', 'users', 'todos', 'branches', 'branchDocs', 'notices'),
    write: [
      write('POST', '/api/v1/activities', 'ACTIVITY_WRITE_ROLES', 'activity-create'),
      write('PATCH', '/api/v1/activities/:id', 'ACTIVITY_WRITE_ROLES', 'activity-update'),
      write('DELETE', '/api/v1/activities/:id', 'ACTIVITY_WRITE_ROLES', 'activity-delete', { destructive: true, reason: '活动删除会级联；审计只做创建→更新→回滚，不真删' }),
      write('POST', '/api/v1/activities/:id/brand', 'requireAuth', 'activity-brand'),
      write('POST', '/api/v1/notices', 'notice-publish', 'notice-publish'),
      write('POST', '/api/v1/todos', 'todo-row', 'todo-create'),
    ],
    destructive: [
      { flow: 'activity-delete', reason: '活动删除会级联；审计只做创建→更新→回滚，不真删' },
    ],
    count: [],
  },
  'leader.attendance': {
    source: SRC.leaderAttendance,
    read: read('activities', 'attendances', 'signups', 'users', 'partyGroups', 'taskforces',
      'makeupTasks', 'attendanceAppeals', 'issueUnread'),
    write: [
      write('POST', '/api/v1/attendances', 'requireAuth', 'attendance-create'),
      write('PATCH', '/api/v1/attendances/:id', 'requireAuth', 'attendance-update'),
      write('PATCH', '/api/v1/signups/:id', 'requireAuth', 'signup-review'),
      write('PATCH', '/api/v1/attendance-appeals/:id', 'requireRole', 'attendance-appeal-dispose'),
      write('POST', '/api/v1/makeupTasks', 'committee-only', 'makeup-task-create'),
      write('POST', '/api/v1/tasks', 'task-row', 'task-create'),
      write('POST', '/api/v1/issue-unread', 'requireAuth', 'issue-unread', { selfService: true }),
    ],
    destructive: [],
    count: [],
  },
  'leader.members': {
    source: SRC.leaderMembers,
    read: read('users', 'todos', 'issues', 'activities', 'attendances', 'inspections',
      'partyGroups', 'activityReviews', 'issueUnread'),
    write: [
      write('POST', '/api/v1/issues', 'requireAuth', 'issue-request-report', { selfService: true }),
      write('PATCH', '/api/v1/issues/:id', 'requireRole', 'issue-dispose'),
      write('POST', '/api/v1/todos', 'todo-row', 'todo-create'),
      write('PATCH', '/api/v1/todos/:id', 'todo-row', 'todo-complete', { selfService: true }),
      write('POST', '/api/v1/issue-unread', 'requireAuth', 'issue-unread', { selfService: true }),
      write('POST', '/api/v1/inspections', 'inspection', 'inspection-create'),
    ],
    destructive: [],
    count: [],
  },

  // ── 成员台（7）─────────────────────────────────────────────────
  'visitor.today': {
    source: SRC.visitorToday,
    read: read('users', 'todos', 'notices', 'activities', 'attendances', 'inspections',
      'issues', 'milestones', 'partyGroups'),
    write: [
      write('PATCH', '/api/v1/todos/:id', 'todo-row', 'todo-complete', { selfService: true }),
      write('POST', '/api/v1/issue-unread', 'requireAuth', 'issue-unread', { selfService: true }),
      write('POST', '/api/v1/attendance-appeals', 'requireAuth', 'attendance-appeal', { selfService: true }),
      write('POST', '/api/v1/inspection-appeals', 'requireAuth', 'inspection-appeal', { selfService: true }),
    ],
    destructive: [],
    count: [],
  },
  'visitor.todo': {
    source: SRC.visitorTodo,
    read: read('todos', 'handoffs', 'activities', 'attendances', 'inspections', 'users', 'issues'),
    write: [
      write('PATCH', '/api/v1/todos/:id', 'todo-row', 'todo-complete', { selfService: true }),
      write('POST', '/api/v1/handoffs/:id/confirm', 'requireAuth', 'handoff-confirm'),
      write('POST', '/api/v1/attendance-appeals', 'requireAuth', 'attendance-appeal', { selfService: true }),
    ],
    destructive: [],
    count: [],
  },
  'visitor.overview': {
    source: SRC.visitorOverview,
    read: read('activities', 'attendances', 'todos', 'notices', 'users', 'issues', 'tasks'),
    write: [
      write('PATCH', '/api/v1/todos/:id', 'todo-row', 'todo-complete', { selfService: true }),
      write('POST', '/api/v1/issue-unread', 'requireAuth', 'issue-unread', { selfService: true }),
    ],
    destructive: [],
    count: [],
  },
  'visitor.activities': {
    source: SRC.visitorActivities,
    read: read('activities', 'signups', 'users', 'todos', 'notices', 'partyGroups'),
    write: [
      write('POST', '/api/v1/signups', 'requireAuth', 'signup-create', { selfService: true }),
      write('PATCH', '/api/v1/signups/:id', 'requireAuth', 'signup-withdraw', { selfService: true }),
      write('POST', '/api/v1/issue-unread', 'requireAuth', 'issue-unread', { selfService: true }),
      write('POST', '/api/v1/todos', 'todo-row', 'todo-create'),
    ],
    destructive: [],
    count: [],
  },
  'visitor.projects': {
    source: SRC.visitorProjects,
    read: read('activities', 'taskforces', 'workgroups', 'workgroupMembers', 'tasks', 'todos', 'users', 'partyGroups'),
    write: [
      write('PATCH', '/api/v1/tasks/:id', 'task-row', 'project-task-complete', { selfService: true }),
      write('PATCH', '/api/v1/todos/:id', 'todo-row', 'todo-complete', { selfService: true }),
      write('POST', '/api/v1/signups', 'requireAuth', 'signup-create', { selfService: true }),
      write('PATCH', '/api/v1/signups/:id', 'requireAuth', 'signup-withdraw', { selfService: true }),
    ],
    destructive: [],
    count: [],
  },
  'visitor.attendance': {
    source: SRC.visitorAttendance,
    read: read('activities', 'attendances', 'signups', 'makeupTasks', 'attendanceAppeals', 'users', 'tasks'),
    write: [
      write('POST', '/api/v1/attendance-appeals', 'requireAuth', 'attendance-appeal', { selfService: true }),
      write('POST', '/api/v1/handoffs', 'requireAuth', 'handoff-create'),
      write('POST', '/api/v1/issue-unread', 'requireAuth', 'issue-unread', { selfService: true }),
    ],
    destructive: [],
    count: [],
  },
  'visitor.growth': {
    source: SRC.visitorGrowth,
    read: read('inspections', 'attendances', 'thoughtReports', 'activityReviews', 'users',
      'tasks', 'inspectionAppeals'),
    write: [
      write('POST', '/api/v1/thoughtReports', 'thought-report', 'thought-report-submit', { selfService: true }),
      write('PATCH', '/api/v1/thoughtReports/:id', 'thought-report', 'thought-report-update', { selfService: true }),
      write('POST', '/api/v1/inspection-appeals', 'requireAuth', 'inspection-appeal', { selfService: true }),
    ],
    destructive: [],
    count: [],
  },

  // ── 党委台（3）────────────────────────────────────────────────
  'party-committee.dispatch': {
    source: SRC.partyDispatch,
    read: read('reviewRequests', 'branches', 'users', 'appointmentRecords', 'notices', 'issues',
      'memberChangeRequests', 'authAudit', 'snapshotVersions'),
    write: [
      write('PATCH', '/api/v1/reviewRequests/:id', 'party-staff', 'review-request-decide'),
      write('POST', '/api/v1/branches', 'party-staff', 'branch-create'),
      write('PATCH', '/api/v1/branches/:id/config', 'party-staff', 'branch-config-update'),
      write('PATCH', '/api/v1/branches/:id/config/rollback', 'party-staff', 'branch-config-rollback'),
      write('POST', '/api/v1/branches/:id/appointments', 'PARTY_STAFF_ROLE', 'branch-secretary-appoint'),
      // 2026-11-02 修正：本页「下发通知」实际走 `NoticeStore.addSystem('committee-dispatch', …)`
      // （docs/src/entries/tabs/party-committee/dispatch-tab.js:154）⇒ 写口是 system-notices 的
      // `committee-dispatch` kind（server/system-notice-kinds.js:454），不是通用 `/notices`
      // （后者只含支书/副支书/组织/宣传，党委角色必然 403）。此处按真实端点归位。
      write('POST', '/api/v1/system-notices', 'committee-dispatch', 'committee-dispatch'),
      write('POST', '/api/v1/report/trigger', 'party-staff', 'report-trigger'),
      write('POST', '/api/v1/auth-audit', 'requireAuth', 'auth-audit-create'),
    ],
    destructive: [],
    count: [],
  },
  'party-committee.review': {
    source: SRC.partyReview,
    read: read('reviewRequests', 'branches', 'users', 'appointmentRecords', 'issues', 'memberChangeRequests'),
    write: [
      write('PATCH', '/api/v1/reviewRequests/:id', 'party-staff', 'review-request-decide'),
      write('POST', '/api/v1/reviewRequests', 'branch-committee', 'review-request-create'),
      write('POST', '/api/v1/auth-audit', 'requireAuth', 'auth-audit-create'),
    ],
    destructive: [],
    count: [],
  },
  'party-committee.branches': {
    source: SRC.partyBranches,
    read: read('branches', 'users', 'appointmentRecords', 'reviewRequests', 'branchDocs', 'activities', 'notices'),
    write: [
      write('POST', '/api/v1/branches', 'party-staff', 'branch-create'),
      write('PATCH', '/api/v1/branches/:id/config', 'party-staff', 'branch-config-update'),
      write('PATCH', '/api/v1/branches/:id/config/rollback', 'party-staff', 'branch-config-rollback'),
      write('POST', '/api/v1/branches/:id/appointments', 'PARTY_STAFF_ROLE', 'branch-secretary-appoint'),
      write('PUT', '/api/v1/branches/:id/roster', 'requireAuth', 'branch-roster-save'),
      write('DELETE', '/api/v1/branches/:id', 'party-staff', 'branch-delete'),
      write('POST', '/api/v1/auth-audit', 'requireAuth', 'auth-audit-create'),
    ],
    destructive: [
      { flow: 'branch-delete', reason: '删除支部会移除其组织档案与配置；审计只验证写门，不真删' },
    ],
    count: [
      { ui: 'tr[data-branch-card]', collection: 'branches', endpoint: 'GET /api/v1/branches' },
    ],
  },
};

/**
 * 把页签级 `destructive: [{ flow, reason }]` 回填到对应 `write` 项
 * （接口契约要求写项自带 `destructive: true` 与 `reason`；页签级数组供编排层汇总，二者同源）。
 */
for (const entry of Object.values(ENDPOINT_MAP)) {
  const reasons = new Map((entry.destructive || []).map((item) => [item.flow, item.reason]));
  for (const item of entry.write || []) {
    if (!reasons.has(item.flow)) continue;
    item.destructive = true;
    item.reason = item.reason || reasons.get(item.flow);
  }
}

/** 允许 C3 直接放行的只读动作（仅 UI 开合 / 选择模板，不落库） */
export const KNOWN_READ_ONLY_ACTIONS = new Set([
  'wp-cancel', 'wp-back', 'select-template', 'agenda-candidates-toggle',
]);

/** 只读页签（无写口时必须在条目内写 readOnlyReason；此处供报告汇总） */
export const READ_ONLY_TABS = Object.freeze({
  'org.thought-review': '思想汇报总表只读汇总；本人提交入口在成员台「成长」页',
});

/** 45 键自检：与 TAB_BLOCK_BASELINE 对齐由外部 runner / 守卫负责；此处仅导出计数。 */
export const ENDPOINT_MAP_KEYS = Object.freeze(Object.keys(ENDPOINT_MAP));
