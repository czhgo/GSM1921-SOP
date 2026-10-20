// inspection.js — 考察记录 Mock 数据（统一数据源）
// 数据模型对齐 domain.js InspectionRecord
// 考察来源: activity(活动) / taskforce(专班) — Source: D-198
// 考察层级: organize(组织) / deep(深度参与)
// 考察查询以人为中心，写入以活动/专班的具体工作计入
// 考勤=0-1变量对所有人成立；考察=对深度参与者和组织者的工作量记录

// 数据域接线批次二（2026-09-03）：展示格式化 inspectionToDisplay/Long/Wide 已提升至 services/activity/inspection.js；
// 本文件退化为纯考察种子数据仓。
// 2026-09-06 基线刷新：recordedAt 随关联活动/专班时间轴同步平移（活动新日期见 activities.js 头注）；
//   注释中旧人名同步（与 people.js 一致）。
import { ParticipationLevel, SourceType } from '../../core/domain/domain.js?v=20261020g';

export const INSPECTION_RECORDS = [
  // ── 活动考察记录 ──────────────────────────────────────────
  // act-3: 7月主题党日：学习两会精神（组织者: 何晓峰 2400012347）
  { id: 'insp-1', sourceType: SourceType.ACTIVITY, activityId: 'act-3',  sourceName: null, personId: '2400012347',  level: ParticipationLevel.ORGANIZE,         role: '策划+全流程统筹',     recordedBy: '2400012345',  recordedAt: '2026-07-03T10:00:00', status: 'pending' },
  { id: 'insp-2', sourceType: SourceType.ACTIVITY, activityId: 'act-3',  sourceName: null, personId: '2400012352',  level: ParticipationLevel.DEEP_PARTICIPATE, role: '视频制作',           recordedBy: '2400012347',  recordedAt: '2026-07-03T10:05:00', status: 'pending' },
  { id: 'insp-3', sourceType: SourceType.ACTIVITY, activityId: 'act-3',  sourceName: null, personId: '2400012353',  level: ParticipationLevel.DEEP_PARTICIPATE, role: '新闻稿撰写',         recordedBy: '2400012347',  recordedAt: '2026-07-03T10:10:00', status: 'pending' },

  // act-7: 7月主题党日：红色基地参访（组织者: 何晓峰 2400012347）
  { id: 'insp-4', sourceType: SourceType.ACTIVITY, activityId: 'act-7',  sourceName: null, personId: '2400012347',  level: ParticipationLevel.ORGANIZE,         role: '路线规划+车辆协调',   recordedBy: '2400012345',  recordedAt: '2026-07-04T08:00:00', status: 'pending' },
  { id: 'insp-5', sourceType: SourceType.ACTIVITY, activityId: 'act-7',  sourceName: null, personId: '2400012356', level: ParticipationLevel.DEEP_PARTICIPATE, role: '宣传素材采集',       recordedBy: '2400012347',  recordedAt: '2026-07-04T08:05:00', status: 'pending' },

  // act-10: 7月主题党日：五四精神传承（组织者: 何晓峰 2400012347）
  { id: 'insp-6', sourceType: SourceType.ACTIVITY, activityId: 'act-10', sourceName: null, personId: '2400012347',  level: ParticipationLevel.ORGANIZE,         role: '全流程策划+现场主持', recordedBy: '2400012345',  recordedAt: '2026-07-13T09:00:00', status: 'pending' },
  { id: 'insp-7', sourceType: SourceType.ACTIVITY, activityId: 'act-10', sourceName: null, personId: '2400012352',  level: ParticipationLevel.DEEP_PARTICIPATE, role: '视频拍摄+剪辑',       recordedBy: '2400012347',  recordedAt: '2026-07-13T09:05:00', status: 'pending' },
  { id: 'insp-8', sourceType: SourceType.ACTIVITY, activityId: 'act-10', sourceName: null, personId: '2400012353',  level: ParticipationLevel.DEEP_PARTICIPATE, role: '新闻稿撰写+排版',     recordedBy: '2400012347',  recordedAt: '2026-07-13T09:10:00', status: 'pending' },

  // act-12: 校企共建座谈：光华 x 中信证券（组织者: 高翔宇 2400012355）
  { id: 'insp-9',  sourceType: SourceType.ACTIVITY, activityId: 'act-12', sourceName: null, personId: '2400012355', level: ParticipationLevel.ORGANIZE,         role: '嘉宾邀请+议程设计',   recordedBy: '2300010001', recordedAt: '2026-07-14T14:00:00', status: 'pending' },
  { id: 'insp-10', sourceType: SourceType.ACTIVITY, activityId: 'act-12', sourceName: null, personId: '2400012354', level: ParticipationLevel.DEEP_PARTICIPATE, role: '现场记录+纪要整理',   recordedBy: '2400012355', recordedAt: '2026-07-14T14:05:00', status: 'pending' },

  // ── 专班考察记录 ──────────────────────────────────────────
  // R4-D04：专班考察以 workgroupId 为稳定父键；sourceName 仅作展示快照。
  // 宣传专班（第二期）（2400012353 吕思涵 — tf-001 实际成员）
  { id: 'insp-11', sourceType: SourceType.TASKFORCE, activityId: null, workgroupId: 'wg-taskforce-tf-001', taskforceId: 'tf-001', sourceName: '宣传专班（第二期）', personId: '2400012353',  level: ParticipationLevel.DEEP_PARTICIPATE, role: '文案撰写',           recordedBy: '2400012345',  recordedAt: '2026-07-07T09:00:00', status: 'pending' },
  // 共建座谈对接专班（2400012354 董建军 — tf-004 实际成员）
  { id: 'insp-12', sourceType: SourceType.TASKFORCE, activityId: null, workgroupId: 'wg-taskforce-tf-004', taskforceId: 'tf-004', sourceName: '共建座谈对接专班', personId: '2400012354', level: ParticipationLevel.DEEP_PARTICIPATE, role: 'PPT设计',            recordedBy: '2400012355', recordedAt: '2026-07-09T10:00:00', status: 'pending' },

  // ── 各发展阶段人员考察记录（补齐支书全局概况"发展与考察"阶段人数）──
  // 积极分子（2400012351 曾雨桐 / 2500010001 丁嘉懿 / 2500010004 谢晓东 / 2500010012 朱欣怡）— 参与积极分子座谈会
  { id: 'insp-13', sourceType: SourceType.ACTIVITY, activityId: 'act-18', sourceName: null, personId: '2400012351',  level: ParticipationLevel.DEEP_PARTICIPATE, role: '发言准备',           recordedBy: '2400012355', recordedAt: '2026-07-17T10:00:00', status: 'pending' },
  { id: 'insp-14', sourceType: SourceType.ACTIVITY, activityId: 'act-18', sourceName: null, personId: '2500010001', level: ParticipationLevel.DEEP_PARTICIPATE, role: '会议记录',           recordedBy: '2400012355', recordedAt: '2026-07-17T10:05:00', status: 'pending' },
  { id: 'insp-15', sourceType: SourceType.ACTIVITY, activityId: 'act-18', sourceName: null, personId: '2500010004', level: ParticipationLevel.DEEP_PARTICIPATE, role: '学习心得分享',       recordedBy: '2400012355', recordedAt: '2026-07-17T10:10:00', status: 'pending' },
  // 积极分子 7月座谈会（act-22）：2500010012 朱欣怡
  { id: 'insp-16', sourceType: SourceType.ACTIVITY, activityId: 'act-22', sourceName: null, personId: '2500010012', level: ParticipationLevel.DEEP_PARTICIPATE, role: '发言准备+反馈收集',  recordedBy: '2400012355', recordedAt: '2026-07-28T10:00:00', status: 'pending' },
  // 预备党员（2500010003 顾文博 / 2500010006 韩雨欣 / 2500010010 曹雅婷）— 参与7月主题党日：深化改革（act-21）
  { id: 'insp-18', sourceType: SourceType.ACTIVITY, activityId: 'act-21', sourceName: null, personId: '2500010003', level: ParticipationLevel.DEEP_PARTICIPATE, role: '现场组织协助',       recordedBy: '2400012345',  recordedAt: '2026-07-25T15:00:00', status: 'pending' },
  { id: 'insp-19', sourceType: SourceType.ACTIVITY, activityId: 'act-21', sourceName: null, personId: '2500010006', level: ParticipationLevel.DEEP_PARTICIPATE, role: '宣传素材整理',       recordedBy: '2400012345',  recordedAt: '2026-07-25T15:05:00', status: 'pending' },
  { id: 'insp-20', sourceType: SourceType.ACTIVITY, activityId: 'act-21', sourceName: null, personId: '2500010010', level: ParticipationLevel.DEEP_PARTICIPATE, role: '新闻稿撰写',         recordedBy: '2400012345',  recordedAt: '2026-07-25T15:10:00', status: 'pending' },
  // ── 50 人规模扩充（50 人规模批次成员，2026-08-01）──
  // 考察记录保持真实待确认状态（pending），纪检确认后自动销「考察待确认」待办；末尾 3 条已确认演示确认态
  // 预备党员（2500010014~2500010016）参与 7月主题党日：深化改革（act-21）
  { id: 'insp-21', sourceType: SourceType.ACTIVITY, activityId: 'act-21', sourceName: null, personId: '2500010014', level: ParticipationLevel.DEEP_PARTICIPATE, role: '现场签到协助',       recordedBy: '2400012345',  recordedAt: '2026-07-25T15:00:00', status: 'pending' },
  { id: 'insp-22', sourceType: SourceType.ACTIVITY, activityId: 'act-21', sourceName: null, personId: '2500010015', level: ParticipationLevel.DEEP_PARTICIPATE, role: '宣传素材采集',       recordedBy: '2400012345',  recordedAt: '2026-07-25T15:05:00', status: 'pending' },
  { id: 'insp-23', sourceType: SourceType.ACTIVITY, activityId: 'act-21', sourceName: null, personId: '2500010016', level: ParticipationLevel.DEEP_PARTICIPATE, role: '材料分发与回收',     recordedBy: '2400012345',  recordedAt: '2026-07-25T15:10:00', status: 'pending' },
  // 预备党员（2500010017）参与 8月党小组会（act-26）
  { id: 'insp-24', sourceType: SourceType.ACTIVITY, activityId: 'act-26', sourceName: null, personId: '2500010017', level: ParticipationLevel.DEEP_PARTICIPATE, role: '线上会议纪要',       recordedBy: '2400012345',  recordedAt: '2026-08-07T20:05:00', status: 'pending' },
  // 发展对象（2500010018~2500010024）参与 8月党小组会（act-26）
  { id: 'insp-25', sourceType: SourceType.ACTIVITY, activityId: 'act-26', sourceName: null, personId: '2500010018', level: ParticipationLevel.DEEP_PARTICIPATE, role: '讨论记录',           recordedBy: '2400012345',  recordedAt: '2026-08-07T20:10:00', status: 'pending' },
  { id: 'insp-26', sourceType: SourceType.ACTIVITY, activityId: 'act-26', sourceName: null, personId: '2500010019', level: ParticipationLevel.DEEP_PARTICIPATE, role: '思想汇报交流',       recordedBy: '2400012345',  recordedAt: '2026-08-07T20:15:00', status: 'pending' },
  { id: 'insp-27', sourceType: SourceType.ACTIVITY, activityId: 'act-26', sourceName: null, personId: '2500010020', level: ParticipationLevel.DEEP_PARTICIPATE, role: '材料准备',           recordedBy: '2400012345',  recordedAt: '2026-08-07T20:20:00', status: 'pending' },
  { id: 'insp-28', sourceType: SourceType.ACTIVITY, activityId: 'act-26', sourceName: null, personId: '2500010021', level: ParticipationLevel.DEEP_PARTICIPATE, role: '考勤统计协助',       recordedBy: '2400012345',  recordedAt: '2026-08-07T20:25:00', status: 'pending' },
  { id: 'insp-29', sourceType: SourceType.ACTIVITY, activityId: 'act-26', sourceName: null, personId: '2500010022', level: ParticipationLevel.DEEP_PARTICIPATE, role: '发言准备',           recordedBy: '2400012345',  recordedAt: '2026-08-07T20:30:00', status: 'pending' },
  { id: 'insp-30', sourceType: SourceType.ACTIVITY, activityId: 'act-26', sourceName: null, personId: '2500010023', level: ParticipationLevel.DEEP_PARTICIPATE, role: '会议记录整理',       recordedBy: '2400012345',  recordedAt: '2026-08-07T20:35:00', status: 'pending' },
  { id: 'insp-31', sourceType: SourceType.ACTIVITY, activityId: 'act-26', sourceName: null, personId: '2500010024', level: ParticipationLevel.DEEP_PARTICIPATE, role: '后续事项跟进',       recordedBy: '2400012345',  recordedAt: '2026-08-07T20:40:00', status: 'pending' },
  // 积极分子（2500010025/2500010026）参与 7月积极分子座谈会（act-22）
  { id: 'insp-32', sourceType: SourceType.ACTIVITY, activityId: 'act-22', sourceName: null, personId: '2500010025', level: ParticipationLevel.DEEP_PARTICIPATE, role: '会议记录',           recordedBy: '2400012355', recordedAt: '2026-07-28T10:05:00', status: 'pending' },
  { id: 'insp-33', sourceType: SourceType.ACTIVITY, activityId: 'act-22', sourceName: null, personId: '2500010026', level: ParticipationLevel.DEEP_PARTICIPATE, role: '发言准备',           recordedBy: '2400012355', recordedAt: '2026-07-28T10:10:00', status: 'pending' },
  // 积极分子（2500010027~2500010029）参与 8月党小组会（act-26）
  { id: 'insp-34', sourceType: SourceType.ACTIVITY, activityId: 'act-26', sourceName: null, personId: '2500010027', level: ParticipationLevel.DEEP_PARTICIPATE, role: '学习心得分享',       recordedBy: '2400012345',  recordedAt: '2026-08-07T20:45:00', status: 'pending' },
  { id: 'insp-35', sourceType: SourceType.ACTIVITY, activityId: 'act-26', sourceName: null, personId: '2500010028', level: ParticipationLevel.DEEP_PARTICIPATE, role: '资料整理',           recordedBy: '2400012345',  recordedAt: '2026-08-07T20:50:00', status: 'pending' },
  { id: 'insp-36', sourceType: SourceType.ACTIVITY, activityId: 'act-26', sourceName: null, personId: '2500010029', level: ParticipationLevel.DEEP_PARTICIPATE, role: '宣传照片采集',       recordedBy: '2400012345',  recordedAt: '2026-08-07T20:55:00', status: 'pending' },
  // 积极分子（2500010030~2500010036，2026-08-01 申请人并入积极分子）参与 8月党小组会（act-26，旁听学习+记录）
  { id: 'insp-37', sourceType: SourceType.ACTIVITY, activityId: 'act-26', sourceName: null, personId: '2500010030', level: ParticipationLevel.DEEP_PARTICIPATE, role: '旁听学习记录',       recordedBy: '2400012345',  recordedAt: '2026-08-07T21:00:00', status: 'pending' },
  { id: 'insp-38', sourceType: SourceType.ACTIVITY, activityId: 'act-26', sourceName: null, personId: '2500010031', level: ParticipationLevel.DEEP_PARTICIPATE, role: '思想汇报准备',       recordedBy: '2400012345',  recordedAt: '2026-08-07T21:05:00', status: 'pending' },
  { id: 'insp-39', sourceType: SourceType.ACTIVITY, activityId: 'act-26', sourceName: null, personId: '2500010032', level: ParticipationLevel.DEEP_PARTICIPATE, role: '会议纪要协助',       recordedBy: '2400012345',  recordedAt: '2026-08-07T21:10:00', status: 'pending' },
  { id: 'insp-40', sourceType: SourceType.ACTIVITY, activityId: 'act-26', sourceName: null, personId: '2500010033', level: ParticipationLevel.DEEP_PARTICIPATE, role: '学习材料整理',       recordedBy: '2400012345',  recordedAt: '2026-08-07T21:15:00', status: 'pending' },
  { id: 'insp-41', sourceType: SourceType.ACTIVITY, activityId: 'act-26', sourceName: null, personId: '2500010034', level: ParticipationLevel.DEEP_PARTICIPATE, role: '发言交流',           recordedBy: '2400012345',  recordedAt: '2026-08-07T21:20:00', status: 'confirmed' },
  { id: 'insp-42', sourceType: SourceType.ACTIVITY, activityId: 'act-26', sourceName: null, personId: '2500010035', level: ParticipationLevel.DEEP_PARTICIPATE, role: '记录整理',           recordedBy: '2400012345',  recordedAt: '2026-08-07T21:25:00', status: 'confirmed' },
  { id: 'insp-43', sourceType: SourceType.ACTIVITY, activityId: 'act-26', sourceName: null, personId: '2500010036', level: ParticipationLevel.DEEP_PARTICIPATE, role: '会后资料分发',       recordedBy: '2400012345',  recordedAt: '2026-08-07T21:30:00', status: 'confirmed' },
];

// R2-35（2026-10-20）：原 42 条种子里 39 条 `pending`，recordedAt 集中在 7–8 月 ⇒ 纪检台
//   「考察超期未确认」（待确认 + 超过 overdueDays）首屏会被历史种子占满，真实新记录被淹没。
// 处置：只保留**最近一批**（act-26，8/7）的 3 条 pending 作为可达演示态，其余历史记录一律 confirmed。
// 为什么用派生循环而不是逐条改字面量：一处口径、不会漏改；mock 与 server/seed.js 同源 import 本数组，
//   两形态同时生效（不另造服务端副本）。日期保持原 recordedAt——它们是历史事实，不随今天的日期伪造。
const RECENT_PENDING_INSPECTION_IDS = new Set(['insp-24', 'insp-25', 'insp-26']);
for (const record of INSPECTION_RECORDS) {
  if (record.status === 'pending' && !RECENT_PENDING_INSPECTION_IDS.has(record.id)) {
    record.status = 'confirmed';
  }
}
