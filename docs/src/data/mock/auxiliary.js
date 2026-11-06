// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  docs/src/data/mock/auxiliary.js —— 仅服务端历史种子的**内容单一源**
// ════════════════════════════════════════════════════════════════
// R10（2026-10-23，C14）：下列 8 个集合原先只在 `server/seed.js` 里定义，
//   mock 形态首启为空、api 形态有数据 ⇒ 两形态能力不对等。现按「内容单一源」纪律
//   收进本纯数据模块：server 播种与 `seed-manifest` 登记都指向这里，mock 能承载的集合
//   （externalDispatches / handoffs / appointmentRecords）首启按同一份补齐；
//   无 mockDB 持久化键的集合在 manifest 标 `form:'api-only'`，只在 API 形态播种。
//
// ⚠ 纯数据：本模块不得 import `core/**` / `services/**` 之外的有副作用模块；
//   `DEFAULT_BRANCH_ID` 是常量叶子，可安全共用。
// ⚠ 引用一律取自既有实体（users / branches / activities），保持零孤立引用。

import { DEFAULT_BRANCH_ID } from '../../core/domain/constants.js?v=20261102b';

/** v12：种子行统一补支部归属（单支部演示库缺省 br-b1；不逐行复制字段）。 */
const withBranch = (rows) => rows.map((row) => ({ ...row, branchId: row.branchId || DEFAULT_BRANCH_ID }));

/**
 * 活动照片基线（2026-11-02 批次 527 · 数据契约 Wave 2）。
 * 病灶：`image_records` 无种子 ⇒ 首页「活动风采」恒空（即使活动已 `galleryFeatured`）。
 * 口径：绑定既有已收录活动（act-16 建党105周年 / act-21 深化改革），
 *   用**内联 SVG 的 base64 数据 URI**（非外链、非假色块）——mock / api 两形态都不依赖
 *   `server/uploads` 物理文件或 attachments 行，避免「种了但取不到图」的假绿。
 * 字段形状 = `archive-tab.js::_handlePhotoUpload` 落库对象（date/title/subject/activityId/fileName/filePath/uploadedBy/uploadedAt）。
 */
const SEED_PHOTO_SVG = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMjAiIGhlaWdodD0iMTgwIj48cmVjdCB3aWR0aD0iMzIwIiBoZWlnaHQ9IjE4MCIgZmlsbD0icmdiKDE4NSwyOCwyOCkiLz48cmVjdCB4PSIxNiIgeT0iMTYiIHdpZHRoPSIyODgiIGhlaWdodD0iMTQ4IiBmaWxsPSJub25lIiBzdHJva2U9InJnYigyNTMsMjMwLDEzOCkiIHN0cm9rZS13aWR0aD0iNCIvPjx0ZXh0IHg9IjE2MCIgeT0iMTAwIiBmb250LXNpemU9IjI2IiBmaWxsPSJyZ2IoMjU1LDI1NSwyNTUpIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiI+5Li76aKY5YWa5pel5rS75YqoPC90ZXh0Pjwvc3ZnPg==';

export const SEED_IMAGE_RECORDS = [
  {
    id: 'img-seed-1', date: '2026-10-03', title: '10月主题党日：建党105周年现场',
    subject: '全体党员', activityId: 'act-16', fileName: 'act-16-memorial.svg',
    base64: SEED_PHOTO_SVG, uploadedBy: '2400012347', uploadedAt: '2026-10-03T12:00:00.000Z',
  },
  {
    id: 'img-seed-2', date: '2026-10-06', title: '10月主题党日：深化改革学习现场',
    subject: '全体党员', activityId: 'act-21', fileName: 'act-21-reform.svg',
    base64: SEED_PHOTO_SVG, uploadedBy: '2400012347', uploadedAt: '2026-10-06T12:00:00.000Z',
  },
];

/**
 * 成员变更申请基线（2026-11-02 批次 527 · 数据契约 Wave 2）。
 * 统一形状 = `memberChangeRequests`：`fromStage / toStage / action`（读时别名兼容
 * `member_confirmations` 的 `from / to`，见 `server/data/domain-contract.mjs`；**不双写**）。
 * 两条来源各一：roster（议程派生阶段变更，支书确认位）/ transfer（移出申请，组织委员审批位）。
 */
export const SEED_MEMBER_CHANGE_REQUESTS = withBranch([
  {
    id: 'mcr-seed-roster', personId: '2400012350', activityId: 'act-8', agendaItemId: 'act-8-agenda-2',
    fromStage: '发展对象', toStage: '预备党员', action: 'developStage',
    status: 'pending-secretary', meetingResult: 'passed',
    createdBy: '2400012355', createdAt: '2026-09-12T10:10:00.000Z',
  },
  {
    id: 'mcr-seed-transfer', personId: '2500010036', activityId: 'act-8', agendaItemId: 'act-8-agenda-3',
    fromStage: '正式党员', toStage: '已转出', action: 'transferOut',
    status: 'pending-org-approval', meetingResult: 'passed',
    createdBy: '2400012355', createdAt: '2026-09-13T09:00:00.000Z',
  },
]);

/**
 * 工作组任务 / 产出最小种子（2026-11-02 批次 527 · 数据契约 Wave 2）。
 * 病灶：`workgroup_tasks / workgroup_outputs` 无种子，但首页「工作组进展」与专班页要求非空。
 * 落点 = 既有 active 专班 tf-002 的工作组 `wg-taskforce-tf-002`（2 任务、1 产出），
 * 引用全部取自既有实体（users / activities / taskforce）。
 */
export const SEED_WORKGROUP_TASKS = withBranch([
  {
    id: 'wgt-seed-tf-002-1', workgroupId: 'wg-taskforce-tf-002',
    title: '梳理 SOP 系统待办链路', status: 'completed',
    createdBy: '2400012355', createdAt: '2026-10-18T00:00:00.000Z',
  },
  {
    id: 'wgt-seed-tf-002-2', workgroupId: 'wg-taskforce-tf-002',
    title: '补齐工作组产出登记', status: 'in_progress',
    createdBy: '2400012355', createdAt: '2026-10-19T00:00:00.000Z',
  },
]);

export const SEED_WORKGROUP_OUTPUTS = withBranch([
  {
    id: 'wgo-seed-tf-002-1', workgroupId: 'wg-taskforce-tf-002', taskId: 'wgt-seed-tf-002-1',
    activityId: null, capabilityPackageId: null,
    title: 'SOP 系统待办链路梳理记录', description: '完成待办链路盘点与销项口径核对。',
    personId: '2400012349', kind: 'contribution', contributionId: null,
    submittedBy: '2400012349', submittedAt: '2026-10-20T00:00:00.000Z', status: 'submitted',
  },
]);

/**
 * 文件流外发确认（形状 = `services/activity/external-dispatch.js::addExternalDispatch` 的落库对象）。
 * `senderId`/`senderName` 取自 `people.js` 档案（2400012347 何晓峰 / 2400012354 董建军）；`receiverRole` = 接收方角色键。
 * 一条待确认（`confirmedAt: null` ⇒ 接收方工作台「待确认外发」有行）、一条已确认（闭环留痕）。
 */
export const SEED_EXTERNAL_DISPATCHES = withBranch([
  {
    id: 'ed-seed-1', refType: 'publicity', refLabel: '8月主题党日「学习两会精神」新闻稿',
    senderId: '2400012347', senderName: '何晓峰', receiverRole: 'secretary',
    note: '新闻稿已微信发给支书审核', sentAt: '2026-08-10T10:00:00.000Z', confirmedAt: null,
  },
  {
    id: 'ed-seed-2', refType: 'inspection', refLabel: '9月党小组会考勤统计',
    senderId: '2400012354', senderName: '董建军', receiverRole: 'org-commissioner',
    note: '考勤统计已外发组织委员归档', sentAt: '2026-09-03T18:00:00.000Z', confirmedAt: '2026-09-04T09:00:00.000Z',
  },
]);

/**
 * 三委数据交接（形状 = `routes/resources.js` 的 `POST /handoffs`；`from`/`to` **由 type 经
 * `services/governance/handoff.js::HANDOFF_TYPES` 派生**，此处逐字对齐该常量，不另写类型表）。
 * 引用：`refType:'activity'` + `refId` 取真实活动 id（act-8 支部党员大会 / act-10 主题党日，
 * 两场均有考勤与考察记录 ⇒ 与「考勤统计 / 考察记录提交」的语义自洽）。
 * 一条 pending（纪检→组织，待接收方确认；接收方台账有行）+ 一条 done（已确认闭环留痕）。
 */
export const SEED_HANDOFFS = withBranch([
  {
    id: 'ho-seed-1', type: 'attendance-archival', from: 'disc-commissioner', to: 'org-commissioner',
    refType: 'activity', refLabel: '9月支部党员大会考勤统计', refId: 'act-8',
    note: '9月考勤已核对完毕，转组织委员归档', status: 'pending',
    createdAt: '2026-09-02T09:00:00.000Z', confirmedAt: null, confirmedBy: null,
  },
  {
    id: 'ho-seed-2', type: 'inspection-report', from: 'disc-commissioner', to: 'org-commissioner',
    refType: 'activity', refLabel: '9月主题党日考察记录提交', refId: 'act-10',
    note: '考察记录已提交', status: 'done',
    createdAt: '2026-09-04T09:00:00.000Z', confirmedAt: '2026-09-04T15:00:00.000Z', confirmedBy: 'org-commissioner',
  },
]);

/**
 * 名册成员变更确认队列（形状 = `POST /member-confirmations`；`action` 取值见
 * `services/member/member-confirmation.js::MC_ACTION_LABEL`（developStage / residence / transferOut），
 * 状态机 = `POST /member-confirmations/:id/decide`）。
 * 造 1 条**待确认**（`status:'pending'`）：2400012350 苏明哲（档案 `developStage:'发展对象'`）→ 预备党员，
 * 由组织委员发起、待支书确认 ⇒ 支书台「待确认」队列首启即有真行（终态行由演示过程自然产生，**不预置**，
 * 与 `SEED_REVIEW_REQUESTS` 同一口径）。
 */
export const SEED_MEMBER_CONFIRMATIONS = withBranch([
  {
    id: 'mc-seed-1', kind: 'change', personId: '2400012350', action: 'developStage',
    from: '发展对象', to: '预备党员', note: '支部党员大会通过接收苏明哲同志为预备党员，报请支书确认生效',
    by: '2400012355', status: 'pending', decidedBy: null, decidedAt: null, rejectNote: '',
    createdAt: '2026-09-12T10:00:00.000Z',
  },
]);

/**
 * 出勤申诉队列（形状 = `POST /attendance-appeals`）。
 * 引用自洽：2400012349 宋佳宁在 `act-11`（7月支委会）有一条**缺勤**考勤（`att38`，已由 2400012354 确认）
 * ⇒ 「本人已请假、考勤记为缺勤，申请更正」这条申诉针对的正是那条真实考勤行。
 * （**故意不挂 act-31 的那条缺勤**：`att900` 已派生补课任务 `mk-seed-1`，两事并存会语义打架。）
 */
export const SEED_ATTENDANCE_APPEALS = [
  {
    id: 'appeal-seed-1', branchId: DEFAULT_BRANCH_ID, personId: '2400012349', activityId: 'act-11',
    note: '9月支委会本人课前已向组织委员请假，考勤记录为缺勤，申请更正为请假',
    status: 'pending', createdAt: '2026-09-12T09:00:00.000Z',
  },
];

/**
 * 考察申诉队列（形状 = `POST /inspection-appeals`）。
 * 引用自洽：2500010012 朱欣怡在 `act-22`（7月积极分子座谈会）有一条真实考察记录（`insp-16`，深度参与）
 * ⇒ 申诉针对的正是该活动下已存在的考察行，诉求为「工作量未完整反映」。
 */
export const SEED_INSPECTION_APPEALS = [
  {
    id: 'inspAppeal-seed-1', branchId: DEFAULT_BRANCH_ID, personId: '2500010012', activityId: 'act-22',
    note: '本人除发言准备外另承担了签到统计，考察记录未完整反映工作量，申请补充',
    status: 'pending', createdAt: '2026-10-12T09:30:00.000Z',
  },
];

/**
 * 意见反馈「逐人未读标记」（形状 = `POST /issue-unread`；id 恒为 `${assigneeId}:${issueId}`）。
 * 引用自洽：`issue-002` 的 `assignee` = 2400012355、`issue-003` 的 `assignee` = 2400012345（见 `docs/data/issues.json`，
 * 由 `seedIssues()` 播进 issues 表）⇒ 未读标记只挂在**确有指派**的条目上（不凭空造）。
 */
export const SEED_ISSUE_UNREAD = [
  { id: '2400012355:issue-002', assigneeId: '2400012355', issueId: 'issue-002', unread: true, at: '2026-10-20T10:00:00.000Z' },
  { id: '2400012345:issue-003', assigneeId: '2400012345', issueId: 'issue-003', unread: true, at: '2026-10-22T10:00:00.000Z' },
];

/**
 * 授权审计留痕（形状 = `POST /auth-audit`；字段白名单 id/targetPersonId/role/scopeRef/authorizedBy/
 * authorizedAt/action）。记 `br-b1` 首任支书的任命（被授权人 2300010001 储子禾、授权人 9000000001 党委组织员、
 * 日期与 `data/mock/branches.js::BRANCHES[0].createdAt`（2026-09-01）一致）⇒ 与 `branches.secretaryId`
 * 及下方 `SEED_APPOINTMENT_RECORDS` **三处自洽**（同一个人、同一天、同一个支部）。
 */
export const SEED_AUTH_AUDIT = withBranch([
  {
    id: 'auth-seed-1', targetPersonId: '2300010001', role: 'secretary', scopeRef: DEFAULT_BRANCH_ID,
    authorizedBy: '9000000001', authorizedAt: '2026-09-01', action: 'grant',
  },
]);

/**
 * 支书任期记录（形状 = `appointmentRecords` 通用 CRUD / `services/branch/appointment.js::listAppointments`
 * 的排序键 `from`）。一条**现任**记录（`to: null`）：`branchId` = br-b1、`secretaryId` = 2300010001
 * ⇒ 与 `branches.br-b1.secretaryId`（`data/mock/branches.js`）一致；后续换届由 `appointSecretary()`
 * 自行「封口现任 + 新建」⇒ 本行是**真实链路的起点**，不是终态伪造。
 */
export const SEED_APPOINTMENT_RECORDS = [
  {
    id: 'appt-seed-1', branchId: DEFAULT_BRANCH_ID, secretaryId: '2300010001', note: '党委任命首任支书',
    from: '2026-09-01T00:00:00.000Z', to: null,
  },
];
