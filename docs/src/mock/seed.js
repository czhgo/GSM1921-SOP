// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  seed.js — mockDB 核心种子数据
// ════════════════════════════════════════════════════════════════
//  为 mockDB 中初始为空的字段提供示例数据，确保首次体验完整。
//  种子数据在 loadDB() 时注入 mockDB（仅当对应字段为空时）。
//  2026-09-06 基线刷新：createdAt/ddl 等时间随关联活动（见 activities.js 头注）同步平移，
//  并钳制于 [07-01, 活动日前 1 天]；signups（su-001~007，8 月）保留。

// ── 任务种子（关联活动，时间随活动重排） ────────────────────
export const SEED_TASKS = [
  { id: 'tsk-001', activityId: 'act-1', title: '预定会议室并通知参会人员', status: 'completed', createdAt: '2026-07-01T08:00:00Z' },
  { id: 'tsk-002', activityId: 'act-1', title: '整理会议记录并归档', status: 'completed', createdAt: '2026-07-01T08:00:00Z' },
  { id: 'tsk-003', activityId: 'act-3', title: '准备学习材料（两会精神解读）', status: 'completed', createdAt: '2026-07-02T08:00:00Z' },
  { id: 'tsk-004', activityId: 'act-3', title: '撰写活动总结', status: 'completed', createdAt: '2026-07-02T08:00:00Z' },
  { id: 'tsk-005', activityId: 'act-5', title: '联系共建单位确认参访安排', status: 'completed', createdAt: '2026-07-06T08:00:00Z' },
  { id: 'tsk-006', activityId: 'act-5', title: '安排车辆和午餐', status: 'completed', createdAt: '2026-07-06T08:00:00Z' },
  { id: 'tsk-007', activityId: 'act-10', title: '准备主题党日方案', status: 'in_progress', createdAt: '2026-07-12T08:00:00Z' },
  { id: 'tsk-008', activityId: 'act-10', title: '收集参与者反馈', status: 'pending', createdAt: '2026-07-12T08:00:00Z' },
];

// ── 分工种子（组织者分配，时间随活动重排） ──────────────────
export const SEED_ASSIGNMENTS = [
  { id: 'assign_seed_001', activityId: 'act-3', workName: '撰写学习材料', workDescription: '整理两会精神要点，制作学习PPT', ddl: '2026-07-02T00:00:00Z', assigneeId: 'p3', status: 'completed', createdBy: 'p1', createdAt: '2026-07-02T08:00:00Z', completedAt: '2026-07-02T16:00:00Z' },
  { id: 'assign_seed_002', activityId: 'act-3', workName: '场地布置', workDescription: '准备投影设备、签到表、座位安排', ddl: '2026-07-02T00:00:00Z', assigneeId: 'p5', status: 'completed', createdBy: 'p1', createdAt: '2026-07-02T08:00:00Z', completedAt: '2026-07-02T08:00:00Z' },
  { id: 'assign_seed_003', activityId: 'act-5', workName: '联系共建单位', workDescription: '确认参访时间、路线、交流内容', ddl: '2026-07-06T00:00:00Z', assigneeId: 'p3', status: 'completed', createdBy: 'p11', createdAt: '2026-07-06T08:00:00Z', completedAt: '2026-07-06T10:00:00Z' },
  { id: 'assign_seed_004', activityId: 'act-5', workName: '拍摄活动照片', workDescription: '全程拍摄参访活动照片，活动结束后提交', ddl: '2026-07-06T00:00:00Z', assigneeId: 'p5', status: 'completed', createdBy: 'p3', createdAt: '2026-07-06T08:00:00Z', completedAt: null },
  { id: 'assign_seed_005', activityId: 'act-10', workName: '准备活动方案', workDescription: '撰写主题党日活动方案，含议程和分工', ddl: '2026-07-12T00:00:00Z', assigneeId: 'p3', status: 'in_progress', createdBy: 'p1', createdAt: '2026-07-12T08:00:00Z', completedAt: null },
];

// ── 档案归档种子 ─────────────────────────────────────────────
// 关联键统一用 activityId（2026-08-06 支书裁决），activityName 仅作展示；
// 非活动类材料（发展对象公示等）无 activityId，靠 activityName 兜底展示。
// 种子提升为全局（2026-08-06）：loadDB 时注入，供产出物区/关闭条件同源读取，
// 不再依赖先访问宣传委员工作台才注入（违反「同一套数据」）。
// 2026-09-06：ar5 归档对象 act-19 重排至 7/19，archiveDate 顺延至 7/26。
export const SEED_ARCHIVE_RECORDS = [
  { id: 'ar1', activityId: 'act-25', activityName: '七一建党105周年活动', archiveDate: '2026-07-15', category: '新闻稿', status: 'archived' },
  { id: 'ar2', activityId: 'act-25', activityName: '七一建党105周年活动', archiveDate: '2026-07-15', category: '照片', status: 'archived' },
  { id: 'ar3', activityName: '发展对象公示', archiveDate: '2026-07-22', category: '新闻稿', status: 'pending' },
  { id: 'ar4', activityName: '预备党员转正大会', archiveDate: '2026-07-28', category: '视频', status: 'pending' },
  { id: 'ar5', activityId: 'act-19', activityName: '7月组织生活会', archiveDate: '2026-07-26', category: '其他', status: 'archived' },
  { id: 'ar6', activityName: '入党积极分子培训', archiveDate: '2026-07-18', category: '照片', status: 'in_progress' },
];

// ── 报名种子（T233 报名渠道演示：含 approved 与 pending 两种流程） ──
// 2026-09-06 基线刷新：su-001~007 均为 8 月数据（>07-01），时间与指向（tf-005/006/act-30）不变。
export const SEED_SIGNUPS = [
  // tf-005 建党105周年筹备专班（招募中，截止 8/20，2/8 已满编 2 名组织者）
  { id: 'su-001', sourceType: 'taskforce', sourceId: 'tf-005', personId: 'p7',  role: 'participant', status: 'approved', createdAt: '2026-08-10T09:00:00', reviewedBy: null, reviewedAt: null, note: '想参与活动筹备' },
  { id: 'su-002', sourceType: 'taskforce', sourceId: 'tf-005', personId: 'p22', role: 'deep',        status: 'pending',   createdAt: '2026-08-10T10:30:00', reviewedBy: null, reviewedAt: null, note: '可负责宣传物料' },
  { id: 'su-003', sourceType: 'taskforce', sourceId: 'tf-005', personId: 'p27', role: 'organizer',   status: 'pending',   createdAt: '2026-08-11T08:00:00', reviewedBy: null, reviewedAt: null, note: '有活动统筹经验' },
  // tf-006 参访活动保障专班（招募中，截止 8/15，0/4）
  { id: 'su-004', sourceType: 'taskforce', sourceId: 'tf-006', personId: 'p6',  role: 'participant', status: 'approved', createdAt: '2026-08-09T14:00:00', reviewedBy: null, reviewedAt: null, note: null },
  { id: 'su-005', sourceType: 'taskforce', sourceId: 'tf-006', personId: 'p9',  role: 'deep',        status: 'pending',   createdAt: '2026-08-10T16:00:00', reviewedBy: null, reviewedAt: null, note: '负责后勤协调' },
  // act-30 秋季学期工作部署会（published，8/28）
  { id: 'su-006', sourceType: 'activity', sourceId: 'act-30', personId: 'p8',  role: 'participant', status: 'approved', createdAt: '2026-08-11T11:00:00', reviewedBy: null, reviewedAt: null, note: null },
  { id: 'su-007', sourceType: 'activity', sourceId: 'act-30', personId: 'p15', role: 'participant', status: 'approved', createdAt: '2026-08-11T11:30:00', reviewedBy: null, reviewedAt: null, note: '反馈#4 提出者' },
];

// ── 支部上报审批种子（2026-09-16 批次 47-P，支书「允许改种子」裁定） ──
// 为什么需要它：`party-committee/review-tab.js` 的「驳回」按钮**只在待批复上报行上渲染**
//   （`r.status === 'pending'`，见 cardHtml），而本数组原为**空种子** ⇒ 党委台「上报审批」恒空态，
//   该处必填校验点在真机上**永远够不到**（批 47-M 实测入口计数 0）。
// 口径（必须与 api 形态同源，否则「真机可达」是假的）：
//   · 本文件是**内容单一源**——`mock-adapter._seedInitialData()`（mock 态）与
//     `server/seed.js::seedDatabase()`（api 态）**都从这里播种**，两形态一致；
//   · 形态与 `submitReviewRequest` 写入的行同构（id/branchId/type/title/content/submittedBy/status/createdAt），
//     故党委台渲染、批准/驳回、回传通知三条链路都不需要特判；
//   · 只种 **pending 一条**：approved/rejected 的终态行由演示过程自然产生，不预置（避免伪造「已批复」历史）；
//   · id 用 `rq-seed-` 前缀，与运行时 `generateId('rq')` 生成的 id 不冲突（实体 id 唯一单一源不变）。
export const SEED_REVIEW_REQUESTS = [
  {
    id: 'rq-seed-1',
    branchId: 'br-b1',
    type: 'activity-report',
    title: '关于赴香山开展主题党日的报备',
    content: '拟定 8 月中旬组织支部党员赴香山开展主题党日，含往返交通、安全预案与经费说明，报请党委备案。',
    submittedBy: 'p1',
    status: 'pending',
    createdAt: '2026-08-06T09:00:00.000Z',
  },
];

// 批次 47-Y（2026-09-16，承 R-78 口径）：**补课任务种子**——解锁成员台「考勤概况 · 去补课 → 补课说明」的必填判据
//   （`entries/tabs/visitor/attendance-tab.js:112` 的「请填写补课说明」）。
// **为什么必须补**：去补课入口 `.visitor-att-makeup-btn` 只在「**本人** pending 补课任务」存在时渲染，
//   而本表**原无任何种子**（`data-adapter.js:312` 明确写「makeupTasks 无静态种子（由纪检操作生成），空属合理，不回退」）
//   ⇒ api/mock 两形态首启都空 ⇒ 该判据**结构性不可达**（批 47-X 真机实测入口计数 0）。
// **为什么自洽（R-78 ②）**：这条任务**就是** `services/makeup.js::autoGenerateMakeupTask()` 对
//   `att900`（p5 · act-31 · `AttendanceStatus.ABSENT` · 已由 p10 确认）的**派生结果**——
//   字段与 `autoGenerateMakeupTask` 落库形状逐项对齐（含 `attendanceRecordId: 'att900'`、
//   `deadline` = 缺勤日 +7 天、`proofContent: null`、`status: 'pending'`、`isMandatory: true`
//   因 act-31 是「支部党员大会」）⇒ 产品在「纪检确认考勤」时自己就会产出它，不是伪造状态。
//   **为什么挂在 act-31 而不是 att38 的 act-11**：成员台该页只列**当月**活动（9 月），act-11 在 7 月
//   ⇒ 挂过去也看不到（原登记说的「日期耦合」）。
//   另：`proofContent: null` **必须保持为空**——该弹窗用 `initialValues.proofContent` 预填，
//   若预填了内容，「请填写补课说明」这一支会被**默认预填**挡住（「默认预填藏必填分支」同族）。
export const SEED_MAKEUP_TASKS = [
  {
    id: 'mk-seed-1',
    personId: 'p5',
    activityId: 'act-31',
    attendanceRecordId: 'att-sep-1',
    activityName: '9月支部党员大会（线上异步表决）',
    personName: '宋佳宁',
    absentDate: '2026-09-10',
    deadline: '2026-09-17',
    status: 'pending',
    isMandatory: true,
    proofContent: null,
    completedAt: null,
    createdAt: '2026-09-10T18:05:00.000Z',
  },
];
