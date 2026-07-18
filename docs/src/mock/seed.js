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

// ── 交接种子 ──────────────────────────────────────────────
export const SEED_HANDOVERS = [
  {
    id: 'ho_seed_001',
    title: '3月主题党日交接',
    fromPerson: 'p3',
    toPerson: 'p5',
    activityId: 'act-3',
    items: [
      { content: '学习材料电子版', status: 'completed' },
      { content: '签到表原件', status: 'completed' },
      { content: '活动照片归档', status: 'completed' },
    ],
    createdAt: '2026-03-16T10:00:00Z',
  },
  {
    id: 'ho_seed_002',
    title: '参访活动交接',
    fromPerson: 'p3',
    toPerson: 'p1',
    activityId: 'act-5',
    items: [
      { content: '共建协议草案', status: 'completed' },
      { content: '参访总结报告', status: 'completed' },
      { content: '费用报销单据', status: 'completed' },
    ],
    createdAt: '2026-04-12T10:00:00Z',
  },
];
