// server/seed.js — 从前端 mock 纯数据模块导入种子
import { readFileSync } from 'node:fs';
import { replaceCollection } from './db.js';

/**
 * 反馈域基线种子（R-24，2026-09-13 支书裁定「分形态各接各的源」）：
 * 服务端 issues 表原先**无种子** → API 形态下支书台「反馈管理」恒 0 条，
 * 而公开反馈页走本地 docs/data/issues.json 有 4 条 → 同域两口径。
 * 现以 issues.json 为**内容单一源**播种，并按**对外匿名**口径脱敏（2026-09-17 支书改裁后的表述）：
 *   ⚠ **本函数的「行为」未变、也不该变**——demo 种子**本就没有真实提交人**，故不写 `_realPersonId`
 *   **不算旧口径的遗留**：正式使用时后台**会**记真身（`POST /issues` 落 `_realPersonId`）；
 *   因而**党委核查页对种子项会显示「（未记录真实提交人）」**（读的正是本函数播下的这几条）。
 *   · submittedBy 一律 '匿名'、anonymous=true、participants=[]（**公开面不出现提交人**：participants 不含提交人；真身另有 `_realPersonId` 一栏、仅党委核查出口可见）；
 *   · 不写 tokenHash（仅判重/限频用，种子无此需求）；
 *   · 保留处置类字段（assignee/assigneeRole/dispatchHistory/comments/reactions）用于演示指派与处置链路；
 *   · 支部归属 branchId（每个组织独立 issue 空间，2026-09-15 支书裁定）：取 issues.json 所载；
 *     存量缺省按部署默认支部 'br-b1'（与前端 services/governance/issues.js 写入口径 getBranchIdOfPerson 同源）。
 */
function seedIssues() {
  let raw;
  try {
    raw = JSON.parse(readFileSync(new URL('../docs/data/issues.json', import.meta.url), 'utf8'));
  } catch {
    return [];
  }
  return (raw.issues || []).map((r) => {
    // 批次 47-Q（2026-09-16，支书裁定「加过滤 + 种进同源」）：**内部汇报不脱敏**。
    // 本文件同时承载两类：公开匿名反馈（无 kind）与内部汇报（kind:'report'）。
    //   「对外匿名」（2026-09-12 旧称「真匿名」，2026-09-17 支书改裁后改称）是**公开反馈**的面口径
    //   （**出口脱敏**；后台另记真身 `_realPersonId`、仅党委核查可见）——它对**内部汇报不成立**：
    //   内部汇报按设计就是**带名**的（submittedBy/assignee/participants 指向真人），
    //   支书台「汇报收件箱」与成员台「我发起的汇报」全靠这些字段成立。
    //   若照旧一律脱敏，api 形态会把这些字段抹掉 ⇒ 两形态不一致（mock 直读原文件带名、api 全匿名）
    //   ⇒ 守卫绿而支书在真实演示里看不到汇报（典型的假绿）。故按 kind 分流。
    if (r.kind === 'report') return { ...r, branchId: r.branchId || 'br-b1' };
    const { tokenHash: _t, participants: _p, submittedBy: _s, ...rest } = r;
    return { ...rest, branchId: r.branchId || 'br-b1', submittedBy: '匿名', anonymous: true, participants: [] };
  });
}

/**
 * 批次里程碑基线种子（2026-09-23 批次 163）：**内容单一源 = `docs/data/milestones.json`**
 * （照 `seedIssues()` 的写法：读同一份静态文件，不在服务端另造一份清单）。
 * 由来：`MilestoneStore.loadAll()` 原先只 `fetch('./data/milestones.json')`（纯浏览器侧），
 *   服务端无表 ⇒ api 形态下里程碑与静态文件**各说各话**（前端缓存一份、无服务端对源）。
 *   现服务端建表（`db.js::SEMANTIC_TABLES`）并以本文件为唯一内容源播种，前端 api 形态改拉
 *   `GET /api/v1/milestones` ⇒ 两形态同内容。
 * ⚠ 只读域：本表只由播种写入，前端无写口（里程碑的维护仍走静态文件 + 重新部署）。
 */
function seedMilestones() {
  let raw;
  try {
    raw = JSON.parse(readFileSync(new URL('../docs/data/milestones.json', import.meta.url), 'utf8'));
  } catch {
    return [];
  }
  return (raw.milestones || []).filter((m) => m && m.id);
}

export async function seedDatabase(db) {
  const [peopleMod, activitiesMod, noticesMod, taskforcesMod, seedMod, branchesMod, partyGroupsMod] = await Promise.all([
    import('../docs/src/mock/people.js'),
    import('../docs/src/mock/activities.js'),
    import('../docs/src/mock/notices.js'),
    import('../docs/src/mock/taskforces.js'),
    import('../docs/src/mock/seed.js'),
    import('../docs/src/mock/branches.js'),
    import('../docs/src/mock/party-groups.js'),
  ]);

  replaceCollection(db, 'users', peopleMod.PEOPLE);
  replaceCollection(db, 'branches', branchesMod.BRANCHES);
  replaceCollection(db, 'activities', activitiesMod.ACTIVITIES);
  replaceCollection(db, 'notices', noticesMod.MOCK_NOTICES);
  replaceCollection(db, 'taskforces', taskforcesMod.MOCK_TASKFORCES);
  replaceCollection(db, 'tasks', seedMod.SEED_TASKS);
  replaceCollection(db, 'assignments', seedMod.SEED_ASSIGNMENTS);
  // T-209 全栈同步：档案归档/报名记录补种（与 mock-adapter.js _seedInitialData 对齐），
  // 保证 API 模式首启时宣传档案区与报名渠道有基线数据
  replaceCollection(db, 'archive_records', seedMod.SEED_ARCHIVE_RECORDS);
  replaceCollection(db, 'signups', seedMod.SEED_SIGNUPS);
  // R-24：反馈域基线（与公开反馈页同内容、按**对外匿名**口径脱敏——2026-09-17 改裁后的表述）。
  // 注：issues 是**语义端点域**（仅语义端点读写、不进快照写穿；匿名真身 `_realPersonId` 由写口落、
  //   由党委核查出口 `GET /api/v1/issues/reveal` 单点可见），但表本身在 db.js RESOURCE_TABLES 内，
  //   故与其它集合同走 replaceCollection 落库。
  replaceCollection(db, 'issues', seedIssues());
  // 批次 47-P（2026-09-16，支书「允许改种子」裁定）：支部上报审批基线。
  // 与 mock 态**同源**（`docs/src/mock/seed.js::SEED_REVIEW_REQUESTS`，经 mock-adapter._seedInitialData 注入）
  // ⇒ 两形态一致；补它的直接动因：党委台「驳回」只在 pending 行渲染，而本表原无种子
  // ⇒ api 形态下支书在党委台点不到该动作（批 47-M 实测入口计数 0）。
  replaceCollection(db, 'review_requests', seedMod.SEED_REVIEW_REQUESTS);
  // 批次 47-Y（2026-09-16，承 R-78 口径）：补课任务基线。
  // 与 mock 态**同源**（`docs/src/mock/seed.js::SEED_MAKEUP_TASKS`，经 mock-adapter._seedInitialData 注入）
  // ⇒ 两形态一致；补它的直接动因：成员台「考勤概况 · 去补课」入口只在「本人 pending 补课任务」存在时渲染，
  //   而该表原无种子（`data-adapter.js` 原注「由纪检操作生成，空属合理」）⇒ api 形态下该入口恒不存在。
  //   本条任务＝`att900`（p5 · act-31 · 缺勤 · 已确认）的派生结果（详见该常量注释；
  //   `attendanceRecordId` 原误写 `att-sep-1`，2026-09-26 已按真实 id 改准为 `att900`）。
  replaceCollection(db, 'makeup_tasks', seedMod.SEED_MAKEUP_TASKS);
  // 2026-09-14 批次 25：党小组一等实体种子（br-b1 现有三组；组长由成员档案派生不落本表）
  replaceCollection(db, 'party_groups', partyGroupsMod.PARTY_GROUPS);
  // 2026-09-14 批次 25：成员流动台账（member_flows）种子为空数组（运行时业务过程数据，
  // 无演示历史）→ 不灌库；服务端表由 db.js RESOURCE_TABLES 建表，写入走快照/CRUD 通道。
  //
  // 2026-09-23 批次 163：批次里程碑（milestones）**语义端点域**首启播种——
  //   内容单一源 = docs/data/milestones.json（与前端 mock 形态读的静态文件同一份）。
  //   语义端点域的表由 db.js 的 SEMANTIC_TABLES 建（独立于 RESOURCE_TABLES），
  //   replaceCollection 的白名单已同源放开（见 db.js），故与 issues 同法落库。
  replaceCollection(db, 'milestones', seedMilestones());

  // ════════════════════════════════════════════════════════════════
  //  批次 189（2026-09-25）：补「只有结构、没有数据」的表（支书逐字裁定）
  // ════════════════════════════════════════════════════════════════
  // 由来（支书逐字）：「我认为 db 中应当把**数据不全**，光有结构说明 mock 的数据是不足的！
  //   必须要补上，我们才能够更好地测试！」
  // 口径（三条，逐表见下方注释与 `SEED_*` 常量头注）：
  //   ① 有**权威内容源**的（`docs/src/mock/**` 的具名导出）⇒ **一律从该源播种**，不在服务端另造第二份清单
  //      ⇒ mock / api 两形态同内容（与 `seedIssues()`／`seedMilestones()` 同一纪律）。
  //   ② 服务端**写入形状**已由语义端点 / 服务层固化的（交接 / 变更确认 / 申诉 / 未读 / 审计 / 任期 / 外发）
  //      ⇒ 按该形状造**最小演示行**（每表 1–2 行，不为凑数造量）。
  //   ③ 引用一律取自既有实体（`users` 的 personId / `branches` 的 branchId / `activities` 的 id）
  //      ⇒ **零孤立引用**（与 `mock-integrity` M1 同判据：跨表引用必须落在真实行上）。
  // ⚠ 幂等：`replaceCollection` = `DELETE FROM t` + 整表 `INSERT`（与上文既有 14 个集合同法）⇒
  //   同一库重复播种**只覆盖、不叠加**；本表新增行同此，无重复 key。
  // ⚠ 语义端点域（handoffs / member_confirmations / *_appeals / issue_unread / auth_audit）在
  //   `db.js::SEMANTIC_TABLES`：`replaceCollection` 的白名单已同源放开（见 db.js），它们**不进快照写穿**，
  //   故首启播种后由 `init()` 逐域拉取填充缓存（与 agendaVotes 同一取法）。
  const [attendanceMod, inspectionMod, reviewMod, thoughtReportMod] = await Promise.all([
    import('../docs/src/mock/attendance.js'),
    import('../docs/src/mock/inspection.js'),
    import('../docs/src/mock/review.js'),
    import('../docs/src/mock/thought-reports.js'),
  ]);
  // 考勤（内容单一源 = `mock/attendance.js::ATTENDANCE_RECORDS`：att1…att43 显式段 + att44… 8 月生成段 + att900）
  replaceCollection(db, 'attendances', attendanceMod.ATTENDANCE_RECORDS);
  // 考察（内容单一源 = `mock/inspection.js::INSPECTION_RECORDS`）
  replaceCollection(db, 'inspections', inspectionMod.INSPECTION_RECORDS);
  // 活动复盘 / 专班复盘（内容单一源 = `mock/review.js` 的两个具名导出）
  replaceCollection(db, 'activity_reviews', reviewMod.REVIEW_RECORDS);
  replaceCollection(db, 'taskforce_reviews', reviewMod.TASKFORCE_REVIEW_RECORDS);
  // 思想汇报（内容单一源 = `mock/thought-reports.js::THOUGHT_REPORTS`；含 tr-5「已打回」过渡态样本）
  replaceCollection(db, 'thought_reports', thoughtReportMod.THOUGHT_REPORTS);
  // 宣传周报 / 宣传任务（**2026-09-28 批次 234 去冗余**）：**内容单一源 = `docs/src/mock/prop.js`**——
  //   原先这两个常量在宣传台 tab 内为**私有**（未导出、不可 import），本文件按之**逐字复刻**了一份
  //   ⇒ 两份字面量、须人工同步（该复刻块的原注释即写明「如后续把该常量导出，请改为 import 同源（勿留两份）」）。
  //   现该常量已收进单一源模块：UI 侧（`prop/weekly-tab.js` / `prop/tasks-tab.js`）与本节**同源 import 同一份**——
  //   UI 侧作 mockDB 空表兜底注入，本节作 api 形态首启播种 ⇒ 两形态同内容、且再无第二份可漂移。
  const { WEEKLY_REPORTS_SEED, PROP_TASKS_SEED } = await import('../docs/src/mock/prop.js');
  replaceCollection(db, 'weekly_reports', WEEKLY_REPORTS_SEED);
  replaceCollection(db, 'prop_tasks', PROP_TASKS_SEED);
  // 文件流外发确认（形状 = `services/activity/external-dispatch.js::addExternalDispatch`；1 条待确认 + 1 条已确认）
  replaceCollection(db, 'external_dispatches', SEED_EXTERNAL_DISPATCHES);
  // 三委数据交接（形状 = `routes/resources.js` 的 `POST /handoffs`；from/to 由 type 经 HANDOFF_TYPES 派生）
  replaceCollection(db, 'handoffs', SEED_HANDOFFS);
  // 名册成员变更确认队列（形状 = `POST /member-confirmations`；待支书确认 1 条）
  replaceCollection(db, 'member_confirmations', SEED_MEMBER_CONFIRMATIONS);
  // 出勤 / 考察申诉队列（形状 = `POST /attendance-appeals` / `POST /inspection-appeals`；各 1 条 pending）
  replaceCollection(db, 'attendance_appeals', SEED_ATTENDANCE_APPEALS);
  replaceCollection(db, 'inspection_appeals', SEED_INSPECTION_APPEALS);
  // 意见反馈「逐人未读标记」（形状 = `POST /issue-unread`：id = `${assigneeId}:${issueId}`）
  replaceCollection(db, 'issue_unread', SEED_ISSUE_UNREAD);
  // 授权审计留痕（形状 = `POST /auth-audit`；记 br-b1 首任支书的任命，与 branches.secretaryId 自洽）
  replaceCollection(db, 'auth_audit', SEED_AUTH_AUDIT);
  // 支书任期记录（形状 = `appointmentRecords` 通用 CRUD；现任一条、`to: null`，与 branches.secretaryId 自洽）
  replaceCollection(db, 'appointment_records', SEED_APPOINTMENT_RECORDS);

  // ════════════════════════════════════════════════════════════════
  //  批次 195+（2026-09-26）：待办（todos）基线种子（**补已知缺口**）
  // ════════════════════════════════════════════════════════════════
  // 口径判定（先实读三处再动手：`services/governance/todo.js` 的 `SEED_TODOS` · `routes/resources.js` 的 todos 写口 ·
  //   `routes/leader-progress.js` 的 todos 读口径）：`todos` 在本系统里**两种性质并存**，故按纪律①播种——
  //   · **运行时派生**是常态：通知（`NoticeTodoDeriver`）/ 活动·专班生命周期（`LifecycleTodoDeriver`）/
  //     成员台参与（`VisitorTodoDeriver`）都在业务动作**发生时**派生待办——这些**不落种子**，由演示过程自然产生；
  //   · 但另有一小批**独立台账型种子**：`docs/src/services/governance/todo.js::SEED_TODOS`（2 条：宣传委员「提交七一活动
  //     新闻稿」·支书「设置第三党小组组长」；`sourceType:'manual'`、`sourceId:null`，**不引用任何活动/任务/
  //     人员实体** ⇒ 零孤立引用）——由前端 `seedTodos()`（各工作台入口调用）与 `data-adapter.js::init()` 的
  //     `SEED_FALLBACK` 空表回退**两处**注入，属既有演示基线。
  // 处方：**从 `SEED_TODOS` 同源播种**（与 mock 形态逐值一致；前端 seedTodos() 读的正是同一常量），
  //   **不在服务端另造第二份清单**（与 `seedIssues()`／`seedMilestones()` 同一纪律）。
  // 直接动因：本文件原先**未播种 `todos`** ⇒ api 形态首启「待办」恒空，全靠前端空表回退兜底；
  //   而那回退分支（`data-adapter.js::init()`）曾引爆**静默丢写竞态**（批次 197 已修：基线捕获提前到任何
  //   `await` 之前）。补种后该分支**不再被走到**（附带收益；`SEED_FALLBACK`/`DISABLE_SEED`/生产默认不播种
  //   三条开关语义**一字未改**）。
  // 幂等：`replaceCollection` = `DELETE FROM todos` + 整表 `INSERT` ⇒ 重复播种只覆盖、不叠加。
  const { SEED_TODOS } = await import('../docs/src/services/governance/todo.js?v=20260924a');
  replaceCollection(db, 'todos', SEED_TODOS);
}

// ════════════════════════════════════════════════════════════════
//  批次 189 的服务端种子常量（**置文件末**：上文 `seedDatabase` 内语句与上方的行号零漂移）
// ════════════════════════════════════════════════════════════════
// ⚠ 置尾理由与 `db.js` / `server/routes/resources/` 同款：上文有大量 `文件:行号` 取证引用
//   （`doc-line-ref.test.mjs` 逐条核 `README-server.md` 的引用）⇒ 新增一律追加在文件尾部。
// 2026-09-28 批次 234：原在此的两个「逐字复刻」常量（宣传周报 `SEED_WEEKLY_REPORTS` / 宣传任务 `SEED_PROP_TASKS`）
//   **已删** —— 二者与 `docs/src/mock/prop.js` 字面量完全重复，现改由该单一源同源 import（见 `seedDatabase()` 内）。

/**
 * 文件流外发确认（形状 = `services/activity/external-dispatch.js::addExternalDispatch` 的落库对象）。
 * `senderId`/`senderName` 取自 `people.js` 档案（p3 何晓峰 / p10 董建军）；`receiverRole` = 接收方角色键。
 * 一条待确认（`confirmedAt: null` ⇒ 接收方工作台「待确认外发」有行）、一条已确认（闭环留痕）。
 */
const SEED_EXTERNAL_DISPATCHES = [
  {
    id: 'ed-seed-1', refType: 'publicity', refLabel: '7月主题党日「学习两会精神」新闻稿',
    senderId: 'p3', senderName: '何晓峰', receiverRole: 'secretary',
    note: '新闻稿已微信发给支书审核', sentAt: '2026-07-04T10:00:00.000Z', confirmedAt: null,
  },
  {
    id: 'ed-seed-2', refType: 'inspection', refLabel: '7月党小组会考勤统计',
    senderId: 'p10', senderName: '董建军', receiverRole: 'org-commissioner',
    note: '考勤统计已外发组织委员归档', sentAt: '2026-07-13T18:00:00.000Z', confirmedAt: '2026-07-14T09:00:00.000Z',
  },
];

/**
 * 三委数据交接（形状 = `routes/resources.js` 的 `POST /handoffs`；`from`/`to` **由 type 经
 * `services/governance/handoff.js::HANDOFF_TYPES` 派生**，此处逐字对齐该常量，不另写类型表）。
 * 引用：`refType:'activity'` + `refId` 取真实活动 id（act-8 支部党员大会 / act-10 主题党日，
 * 两场均有考勤与考察记录 ⇒ 与「考勤统计 / 考察记录提交」的语义自洽）。
 * 一条 pending（纪检→组织，待接收方确认；接收方台账有行）+ 一条 done（已确认闭环留痕）。
 */
const SEED_HANDOFFS = [
  {
    id: 'ho-seed-1', type: 'attendance-archival', from: 'disc-commissioner', to: 'org-commissioner',
    refType: 'activity', refLabel: '7月支部党员大会考勤统计', refId: 'act-8',
    note: '7月考勤已核对完毕，转组织委员归档', status: 'pending',
    createdAt: '2026-07-13T09:00:00.000Z', confirmedAt: null, confirmedBy: null,
  },
  {
    id: 'ho-seed-2', type: 'inspection-report', from: 'disc-commissioner', to: 'org-commissioner',
    refType: 'activity', refLabel: '7月主题党日考察记录提交', refId: 'act-10',
    note: '考察记录已提交', status: 'done',
    createdAt: '2026-07-14T09:00:00.000Z', confirmedAt: '2026-07-14T15:00:00.000Z', confirmedBy: 'org-commissioner',
  },
];

/**
 * 名册成员变更确认队列（形状 = `POST /member-confirmations`；`action` 取值见
 * `services/member/member-confirmation.js::MC_ACTION_LABEL`（developStage / residence / transferOut），
 * 状态机 = `POST /member-confirmations/:id/decide`）。
 * 造 1 条**待确认**（`status:'pending'`）：p6 苏明哲（档案 `developStage:'发展对象'`）→ 预备党员，
 * 由组织委员发起、待支书确认 ⇒ 支书台「待确认」队列首启即有真行（终态行由演示过程自然产生，**不预置**，
 * 与 `SEED_REVIEW_REQUESTS` 同一口径）。
 */
const SEED_MEMBER_CONFIRMATIONS = [
  {
    id: 'mc-seed-1', kind: 'change', personId: 'p6', action: 'developStage',
    from: '发展对象', to: '预备党员', note: '支部党员大会通过接收苏明哲同志为预备党员，报请支书确认生效',
    by: 'p11', status: 'pending', decidedBy: null, decidedAt: null, rejectNote: '',
    createdAt: '2026-09-12T10:00:00.000Z',
  },
];

/**
 * 出勤申诉队列（形状 = `POST /attendance-appeals`）。
 * 引用自洽：p5 宋佳宁在 `act-11`（7月支委会）有一条**缺勤**考勤（`att38`，已由 p10 确认）
 * ⇒ 「本人已请假、考勤记为缺勤，申请更正」这条申诉针对的正是那条真实考勤行。
 * （**故意不挂 act-31 的那条缺勤**：`att900` 已派生补课任务 `mk-seed-1`，两事并存会语义打架。）
 */
const SEED_ATTENDANCE_APPEALS = [
  {
    id: 'appeal-seed-1', branchId: 'br-b1', personId: 'p5', activityId: 'act-11',
    note: '7月支委会本人课前已向组织委员请假，考勤记录为缺勤，申请更正为请假',
    status: 'pending', createdAt: '2026-09-12T09:00:00.000Z',
  },
];

/**
 * 考察申诉队列（形状 = `POST /inspection-appeals`）。
 * 引用自洽：p26 朱欣怡在 `act-22`（7月积极分子座谈会）有一条真实考察记录（`insp-16`，深度参与）
 * ⇒ 申诉针对的正是该活动下已存在的考察行，诉求为「工作量未完整反映」。
 */
const SEED_INSPECTION_APPEALS = [
  {
    id: 'inspAppeal-seed-1', branchId: 'br-b1', personId: 'p26', activityId: 'act-22',
    note: '本人除发言准备外另承担了签到统计，考察记录未完整反映工作量，申请补充',
    status: 'pending', createdAt: '2026-09-12T09:30:00.000Z',
  },
];

/**
 * 意见反馈「逐人未读标记」（形状 = `POST /issue-unread`；id 恒为 `${assigneeId}:${issueId}`）。
 * 引用自洽：`issue-002` 的 `assignee` = p11、`issue-003` 的 `assignee` = p1（见 `docs/data/issues.json`，
 * 由 `seedIssues()` 播进 issues 表）⇒ 未读标记只挂在**确有指派**的条目上（不凭空造）。
 */
const SEED_ISSUE_UNREAD = [
  { id: 'p11:issue-002', assigneeId: 'p11', issueId: 'issue-002', unread: true, at: '2026-07-23T10:00:00.000Z' },
  { id: 'p1:issue-003', assigneeId: 'p1', issueId: 'issue-003', unread: true, at: '2026-07-26T10:00:00.000Z' },
];

/**
 * 授权审计留痕（形状 = `POST /auth-audit`；字段白名单 id/targetPersonId/role/scopeRef/authorizedBy/
 * authorizedAt/action）。记 `br-b1` 首任支书的任命（被授权人 p13 储子禾、授权人 p_pc 党委组织员、
 * 日期与 `mock/branches.js::BRANCHES[0].createdAt`（2026-09-01）一致）⇒ 与 `branches.secretaryId`
 * 及下方 `SEED_APPOINTMENT_RECORDS` **三处自洽**（同一个人、同一天、同一个支部）。
 */
const SEED_AUTH_AUDIT = [
  {
    id: 'auth-seed-1', targetPersonId: 'p13', role: 'secretary', scopeRef: 'br-b1',
    authorizedBy: 'p_pc', authorizedAt: '2026-09-01', action: 'grant',
  },
];

/**
 * 支书任期记录（形状 = `appointmentRecords` 通用 CRUD / `services/branch/appointment.js::listAppointments`
 * 的排序键 `from`）。一条**现任**记录（`to: null`）：`branchId` = br-b1、`secretaryId` = p13
 * ⇒ 与 `branches.br-b1.secretaryId`（`mock/branches.js`）一致；后续换届由 `appointSecretary()`
 * 自行「封口现任 + 新建」⇒ 本行是**真实链路的起点**，不是终态伪造。
 */
const SEED_APPOINTMENT_RECORDS = [
  {
    id: 'appt-seed-1', branchId: 'br-b1', secretaryId: 'p13', note: '党委任命首任支书',
    from: '2026-09-01T00:00:00.000Z', to: null,
  },
];
