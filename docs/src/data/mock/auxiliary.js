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

import { DEFAULT_BRANCH_ID } from '../../core/domain/constants.js?v=20261029b';

/** v12：种子行统一补支部归属（单支部演示库缺省 br-b1；不逐行复制字段）。 */
const withBranch = (rows) => rows.map((row) => ({ ...row, branchId: row.branchId || DEFAULT_BRANCH_ID }));

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
