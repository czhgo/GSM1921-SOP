// review.js — 复盘记录 Mock 数据
// 数据模型对齐 domain.js ReviewRecord + ReviewStatus 枚举（D-242）
// 复盘状态流转：未提交→已上传→批注中→确认/打回
// 组织者提交复盘报告，纪检委员批注/打回/确认

// 数据域接线批次二（2026-09-03）：展示格式化 reviewToDisplay 已提升至 services/review.js；
// 本文件退化为纯复盘种子数据仓。
// 2026-09-06 基线刷新：时间字段随关联活动重排（活动新日期见 activities.js 头注）同步平移，
//   正文中旧人名/月份词同步更新（人名与 people.js 一致）。
import { ReviewStatus } from '../core/domain.js?v=20260908c';

/**
 * 活动复盘记录
 * 覆盖 ReviewStatus 全部 5 种状态流转
 * - 已确认：复盘经纪检委员确认，归档完成
 * - 批注中：已上传，纪检委员正在批注
 * - 已上传：组织者已提交，等待批注
 * - 已打回：纪检委员打回，待组织者修改重新提交
 * - 未提交：活动完成但组织者尚未提交复盘
 */
export const REVIEW_RECORDS = [
  // ── 7 月上旬活动复盘（已确认） ─────────────────────────────
  {
    id: 'rev1',
    activityId: 'act-1',
    organizerId: 'p3',
    progress: '已完成',
    overdue: false,
    reviewStatus: ReviewStatus.CONFIRMED,
    reviewContent: '7月党小组会围绕新学期支部工作计划展开，第一党小组全员到齐，讨论充分。会议形成三条具体行动项，已分别落实至各支委。',
    submittedAt: '2026-07-02T10:00:00',
    confirmedAt: '2026-07-03T09:30:00',
  },
  {
    id: 'rev2',
    activityId: 'act-2',
    organizerId: 'p11',
    progress: '已完成',
    overdue: false,
    reviewStatus: ReviewStatus.CONFIRMED,
    reviewContent: '7月支委会完成本月各项决议审议，重点讨论下半年党员发展工作节奏。会议议定8月启动新一轮积极分子考察程序。',
    submittedAt: '2026-07-03T14:00:00',
    confirmedAt: '2026-07-04T11:00:00',
  },
  {
    id: 'rev3',
    activityId: 'act-3',
    organizerId: 'p3',
    progress: '已完成',
    overdue: false,
    reviewStatus: ReviewStatus.UPLOADED,
    reviewContent: '7月主题党日"学习两会精神"为品牌活动首场，参与度高，深度参与者彭博文、吕思涵的视频和新闻稿反响良好。建议下月品牌活动延续此类深度参与机制。',
    issues: ['品牌活动深度参与机制需固化延续'],
    submittedAt: '2026-07-04T10:00:00',
  },

  // ── 7 月上旬活动复盘（覆盖已上传/批注中/已打回 三态） ──────
  {
    id: 'rev4',
    activityId: 'act-4',
    organizerId: 'p1',
    progress: '已完成',
    overdue: false,
    reviewStatus: ReviewStatus.UPLOADED,
    reviewContent: '7月党小组会完成本月学习任务，第一党小组讨论积极分子培养路径。会议记录已上传。',
    submittedAt: '2026-07-07T16:00:00',
  },
  {
    id: 'rev5',
    activityId: 'act-5',
    organizerId: 'p11',
    progress: '已完成',
    overdue: false,
    reviewStatus: ReviewStatus.ANNOTATING,
    reviewContent: '7月支委会审议本月积极分子考察结果，议定7月支部党员大会议程。各项决议已落实至承办委员。',
    annotation: '请补充积极分子 p7 曾雨桐的考察材料清单，明确材料缺失项。',
    annotatedBy: 'p10',
    annotatedAt: '2026-07-09T10:00:00',
    issues: ['积极分子 p7 考察材料清单缺失'],
    submittedAt: '2026-07-08T14:00:00',
  },
  {
    id: 'rev6',
    activityId: 'act-6',
    organizerId: 'p13',
    progress: '已完成',
    overdue: false,
    reviewStatus: ReviewStatus.UPLOADED,
    reviewContent: '7月党课"新时代青年担当"由书记主讲，参与度高，深度参与者方文静完成宣传稿。课后讨论环节延长至 40 分钟，建议后续党课预留更多讨论时间。',
    issues: ['党课课后讨论时间不足，需预留更多'],
    submittedAt: '2026-07-10T10:00:00',
  },
  {
    id: 'rev7',
    activityId: 'act-7',
    organizerId: 'p3',
    progress: '超时',
    overdue: true,
    reviewStatus: ReviewStatus.REJECTED,
    reviewContent: '7月主题党日红色基地参访复盘（初稿）。',
    annotation: '复盘材料缺失：① 参访人员名单与签到表 ② 现场影像记录 ③ 深度参与者 p9 吕思涵的工作量记录。请补充完整后重新提交。',
    annotatedBy: 'p10',
    annotatedAt: '2026-07-11T11:00:00',
    issues: ['参访材料缺失：人员名单与签到表、现场影像、深度参与者工作量记录'],
    submittedAt: '2026-07-10T10:00:00',
  },

  // ── 7 月中旬活动复盘（覆盖已确认/批注中/未提交） ───────────
  {
    id: 'rev8',
    activityId: 'act-8',
    organizerId: 'p11',
    progress: '已完成',
    overdue: false,
    reviewStatus: ReviewStatus.UPLOADED,
    reviewContent: '7月支部党员大会完成本月各项决议审议，重点讨论预备党员接收工作。会议议定9月启动支部大会讨论接收预备党员程序。',
    submittedAt: '2026-07-12T15:00:00',
  },
  {
    id: 'rev9',
    activityId: 'act-10',
    organizerId: 'p3',
    progress: '已完成',
    overdue: false,
    reviewStatus: ReviewStatus.ANNOTATING,
    reviewContent: '7月主题党日"五四精神传承"为品牌活动第二场，深度参与者彭博文、吕思涵完成视频制作与新闻稿撰写。本次活动引入校企共建元素，效果良好。',
    annotation: '建议补充品牌活动培育路径说明，体现"培育→成熟→标杆"四阶段中的当前阶段。',
    annotatedBy: 'p10',
    annotatedAt: '2026-07-15T09:00:00',
    issues: ['品牌活动培育路径说明缺失'],
    submittedAt: '2026-07-14T16:00:00',
  },
  {
    id: 'rev10',
    activityId: 'act-12',
    organizerId: 'p11',
    progress: '已完成',
    overdue: false,
    reviewStatus: ReviewStatus.UPLOADED,
    reviewContent: '校企共建座谈"光华 x 中信证券"为品牌活动第三场，深度参与者董建军完成现场记录与考勤统计。座谈形成 3 项后续合作意向，已转共建对接专班跟进。',
    submittedAt: '2026-07-17T10:00:00',
  },
  {
    id: 'rev11',
    activityId: 'act-19',
    organizerId: 'p4',
    progress: '进行中',
    overdue: false,
    reviewStatus: ReviewStatus.NOT_SUBMITTED,
    reviewContent: '',
  },
];

/**
 * 专班复盘记录
 * organizerId 必须为专班 manager/initiator/members 中的实际 organizer
 */
export const TASKFORCE_REVIEW_RECORDS = [
  {
    id: 'tfrev1',
    sourceType: 'taskforce',
    sourceName: '宣传专班（第二期）',
    organizerId: 'p11',
    progress: '进行中',
    overdue: false,
    reviewStatus: ReviewStatus.UPLOADED,
    reviewContent: '宣传专班（第二期）7月宣传任务完成情况：深度报道 2 篇、专题视频 1 部。视频制作周期略长于预期，建议下期专班预留更多后期时间。',
    issues: ['视频制作周期长于预期，需预留更多后期时间'],
    submittedAt: '2026-07-18T14:00:00',
  },
  {
    id: 'tfrev2',
    sourceType: 'taskforce',
    sourceName: '共建座谈对接专班',
    organizerId: 'p11',
    progress: '已完成',
    overdue: false,
    reviewStatus: ReviewStatus.CONFIRMED,
    reviewContent: '共建座谈对接专班完成"光华 x 中信证券"座谈全流程筹备与执行，深度参与者董建军完成现场记录与考勤统计。座谈形成 3 项后续合作意向。',
    submittedAt: '2026-07-17T10:00:00',
    confirmedAt: '2026-07-18T15:00:00',
  },
];
