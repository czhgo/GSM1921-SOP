// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  seed.js — mockDB 核心种子数据
// ════════════════════════════════════════════════════════════════
//  为 mockDB 中初始为空的字段提供示例数据，确保首次体验完整。
//  种子数据在 loadDB() 时注入 mockDB（仅当对应字段为空时）。

// ── 任务种子（关联前6个活动） ────────────────────────────────
export const SEED_TASKS = [
  { id: 'tsk-001', activityId: 'act-1', title: '预定会议室并通知参会人员', status: 'completed', createdAt: '2026-03-01T08:00:00Z' },
  { id: 'tsk-002', activityId: 'act-1', title: '整理会议记录并归档', status: 'completed', createdAt: '2026-03-01T08:00:00Z' },
  { id: 'tsk-003', activityId: 'act-3', title: '准备学习材料（两会精神解读）', status: 'completed', createdAt: '2026-03-10T08:00:00Z' },
  { id: 'tsk-004', activityId: 'act-3', title: '撰写活动总结', status: 'completed', createdAt: '2026-03-15T08:00:00Z' },
  { id: 'tsk-005', activityId: 'act-5', title: '联系共建单位确认参访安排', status: 'completed', createdAt: '2026-04-01T08:00:00Z' },
  { id: 'tsk-006', activityId: 'act-5', title: '安排车辆和午餐', status: 'completed', createdAt: '2026-04-05T08:00:00Z' },
  { id: 'tsk-007', activityId: 'act-10', title: '准备主题党日方案', status: 'in_progress', createdAt: '2026-05-01T08:00:00Z' },
  { id: 'tsk-008', activityId: 'act-10', title: '收集参与者反馈', status: 'pending', createdAt: '2026-05-10T08:00:00Z' },
];

// ── 分工种子（组织者分配） ──────────────────────────────────
export const SEED_ASSIGNMENTS = [
  { id: 'assign_seed_001', activityId: 'act-3', workName: '撰写学习材料', workDescription: '整理两会精神要点，制作学习PPT', ddl: '2026-03-12T00:00:00Z', assigneeId: 'p3', status: 'completed', createdBy: 'p1', createdAt: '2026-03-10T08:00:00Z', completedAt: '2026-03-11T16:00:00Z' },
  { id: 'assign_seed_002', activityId: 'act-3', workName: '场地布置', workDescription: '准备投影设备、签到表、座位安排', ddl: '2026-03-14T00:00:00Z', assigneeId: 'p5', status: 'completed', createdBy: 'p1', createdAt: '2026-03-10T08:00:00Z', completedAt: '2026-03-14T08:00:00Z' },
  { id: 'assign_seed_003', activityId: 'act-5', workName: '联系共建单位', workDescription: '确认参访时间、路线、交流内容', ddl: '2026-04-03T00:00:00Z', assigneeId: 'p3', status: 'completed', createdBy: 'p11', createdAt: '2026-04-01T08:00:00Z', completedAt: '2026-04-02T10:00:00Z' },
  { id: 'assign_seed_004', activityId: 'act-5', workName: '拍摄活动照片', workDescription: '全程拍摄参访活动照片，活动结束后提交', ddl: '2026-04-08T00:00:00Z', assigneeId: 'p5', status: 'completed', createdBy: 'p3', createdAt: '2026-04-01T08:00:00Z', completedAt: null },
  { id: 'assign_seed_005', activityId: 'act-10', workName: '准备活动方案', workDescription: '撰写主题党日活动方案，含议程和分工', ddl: '2026-05-08T00:00:00Z', assigneeId: 'p3', status: 'in_progress', createdBy: 'p1', createdAt: '2026-05-01T08:00:00Z', completedAt: null },
];

// ── 档案归档种子 ─────────────────────────────────────────────
// 关联键统一用 activityId（2026-08-06 书记裁决），activityName 仅作展示；
// 非活动类材料（发展对象公示等）无 activityId，靠 activityName 兜底展示。
// 种子提升为全局（2026-08-06）：loadDB 时注入，供产出物区/关闭条件同源读取，
// 不再依赖先访问宣传委员工作台才注入（违反「同一套数据」）。
export const SEED_ARCHIVE_RECORDS = [
  { id: 'ar1', activityId: 'act-25', activityName: '七一建党105周年活动', archiveDate: '2026-07-15', category: '新闻稿', status: 'archived' },
  { id: 'ar2', activityId: 'act-25', activityName: '七一建党105周年活动', archiveDate: '2026-07-15', category: '照片', status: 'archived' },
  { id: 'ar3', activityName: '发展对象公示', archiveDate: '2026-07-22', category: '新闻稿', status: 'pending' },
  { id: 'ar4', activityName: '预备党员转正大会', archiveDate: '2026-07-28', category: '视频', status: 'pending' },
  { id: 'ar5', activityId: 'act-19', activityName: '5月组织生活会', archiveDate: '2026-07-10', category: '其他', status: 'archived' },
  { id: 'ar6', activityName: '入党积极分子培训', archiveDate: '2026-07-18', category: '照片', status: 'in_progress' },
];

// ── 报名种子（T233 报名渠道演示：含 approved 与 pending 两种流程） ──
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

// ── 专班种子 ──────────────────────────────────────────────
