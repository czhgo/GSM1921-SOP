// inspection.js — 考察记录 Mock 数据（统一数据源）
// 数据模型对齐 domain.js InspectionRecord
// 考察来源: activity(活动) / taskforce(专班) — Source: D-198
// 考察层级: organize(组织) / deep(深度参与)
// 考察查询以人为中心，写入以活动/专班的具体工作计入
// 考勤=0-1变量对所有人成立；考察=对深度参与者和组织者的工作量记录

// 修复（T175）：不再从 ./index.js 导入 _personName 等辅助函数，
// 消除 mock/index.js ↔ mock/inspection.js 循环依赖。
// 直接依赖 services/person.js + mock/activities.js。
import { getPersonName } from '../services/person.js?v=20260829m';
import { ACTIVITIES } from './activities.js?v=20260829m';
import { ParticipationLevel, PARTICIPATION_LEVEL_LABELS, SourceType, SOURCE_TYPE_LABELS } from '../core/domain.js?v=20260829m';

const _personName = (id) => getPersonName(id);
const _activityTitle = (id) => ACTIVITIES.find(a => a.id === id)?.title || id;
const _activityType = (id) => ACTIVITIES.find(a => a.id === id)?.type || '未知';

export const INSPECTION_RECORDS = [
  // ── 活动考察记录 ──────────────────────────────────────────
  // act-3: 3月主题党日：学习两会精神（组织者: 王五 p3）
  { id: 'insp-1', sourceType: SourceType.ACTIVITY, activityId: 'act-3',  sourceName: null, personId: 'p3',  level: ParticipationLevel.ORGANIZE,         role: '策划+全流程统筹',     recordedBy: 'p1',  recordedAt: '2026-03-22T10:00:00', status: 'pending' },
  { id: 'insp-2', sourceType: SourceType.ACTIVITY, activityId: 'act-3',  sourceName: null, personId: 'p8',  level: ParticipationLevel.DEEP_PARTICIPATE, role: '视频制作',           recordedBy: 'p3',  recordedAt: '2026-03-22T10:05:00', status: 'pending' },
  { id: 'insp-3', sourceType: SourceType.ACTIVITY, activityId: 'act-3',  sourceName: null, personId: 'p9',  level: ParticipationLevel.DEEP_PARTICIPATE, role: '新闻稿撰写',         recordedBy: 'p3',  recordedAt: '2026-03-22T10:10:00', status: 'pending' },

  // act-7: 4月主题党日：红色基地参访（组织者: 王五 p3）
  { id: 'insp-4', sourceType: SourceType.ACTIVITY, activityId: 'act-7',  sourceName: null, personId: 'p3',  level: ParticipationLevel.ORGANIZE,         role: '路线规划+车辆协调',   recordedBy: 'p1',  recordedAt: '2026-04-15T08:00:00', status: 'pending' },
  { id: 'insp-5', sourceType: SourceType.ACTIVITY, activityId: 'act-7',  sourceName: null, personId: 'p12', level: ParticipationLevel.DEEP_PARTICIPATE, role: '宣传素材采集',       recordedBy: 'p3',  recordedAt: '2026-04-15T08:05:00', status: 'pending' },

  // act-10: 5月主题党日：五四精神传承（组织者: 王五 p3）
  { id: 'insp-6', sourceType: SourceType.ACTIVITY, activityId: 'act-10', sourceName: null, personId: 'p3',  level: ParticipationLevel.ORGANIZE,         role: '全流程策划+现场主持', recordedBy: 'p1',  recordedAt: '2026-05-18T09:00:00', status: 'pending' },
  { id: 'insp-7', sourceType: SourceType.ACTIVITY, activityId: 'act-10', sourceName: null, personId: 'p8',  level: ParticipationLevel.DEEP_PARTICIPATE, role: '视频拍摄+剪辑',       recordedBy: 'p3',  recordedAt: '2026-05-18T09:05:00', status: 'pending' },
  { id: 'insp-8', sourceType: SourceType.ACTIVITY, activityId: 'act-10', sourceName: null, personId: 'p9',  level: ParticipationLevel.DEEP_PARTICIPATE, role: '新闻稿撰写+排版',     recordedBy: 'p3',  recordedAt: '2026-05-18T09:10:00', status: 'pending' },

  // act-12: 校企共建座谈：光华 x 中信证券（组织者: 杨十四 p11）
  { id: 'insp-9',  sourceType: SourceType.ACTIVITY, activityId: 'act-12', sourceName: null, personId: 'p11', level: ParticipationLevel.ORGANIZE,         role: '嘉宾邀请+议程设计',   recordedBy: 'p13', recordedAt: '2026-05-20T14:00:00', status: 'pending' },
  { id: 'insp-10', sourceType: SourceType.ACTIVITY, activityId: 'act-12', sourceName: null, personId: 'p10', level: ParticipationLevel.DEEP_PARTICIPATE, role: '现场记录+纪要整理',   recordedBy: 'p11', recordedAt: '2026-05-20T14:05:00', status: 'pending' },

  // ── 专班考察记录 ──────────────────────────────────────────
  // 宣传专班（第二期）（p9 冯十二 — tf-001 实际成员）
  { id: 'insp-11', sourceType: SourceType.TASKFORCE, activityId: null, sourceName: '宣传专班（第二期）', personId: 'p9',  level: ParticipationLevel.DEEP_PARTICIPATE, role: '文案撰写',           recordedBy: 'p1',  recordedAt: '2026-04-01T09:00:00', status: 'pending' },
  // 共建座谈对接专班（p10 陈十三 — tf-004 实际成员）
  { id: 'insp-12', sourceType: SourceType.TASKFORCE, activityId: null, sourceName: '共建座谈对接专班', personId: 'p10', level: ParticipationLevel.DEEP_PARTICIPATE, role: 'PPT设计',            recordedBy: 'p11', recordedAt: '2026-04-10T10:00:00', status: 'pending' },

  // ── 各发展阶段人员考察记录（补齐书记全局概况"发展与考察"阶段人数）──
  // 积极分子（p7 周九 / p15 吴十 / p18 谢晓东 / p26 朱欣怡）— 参与积极分子座谈会
  { id: 'insp-13', sourceType: SourceType.ACTIVITY, activityId: 'act-18', sourceName: null, personId: 'p7',  level: ParticipationLevel.DEEP_PARTICIPATE, role: '发言准备',           recordedBy: 'p11', recordedAt: '2026-05-25T10:00:00', status: 'pending' },
  { id: 'insp-14', sourceType: SourceType.ACTIVITY, activityId: 'act-18', sourceName: null, personId: 'p15', level: ParticipationLevel.DEEP_PARTICIPATE, role: '会议记录',           recordedBy: 'p11', recordedAt: '2026-05-25T10:05:00', status: 'pending' },
  { id: 'insp-15', sourceType: SourceType.ACTIVITY, activityId: 'act-18', sourceName: null, personId: 'p18', level: ParticipationLevel.DEEP_PARTICIPATE, role: '学习心得分享',       recordedBy: 'p11', recordedAt: '2026-05-25T10:10:00', status: 'pending' },
  // 积极分子 7月座谈会（act-22）：p26 朱欣怡
  { id: 'insp-16', sourceType: SourceType.ACTIVITY, activityId: 'act-22', sourceName: null, personId: 'p26', level: ParticipationLevel.DEEP_PARTICIPATE, role: '发言准备+反馈收集',  recordedBy: 'p11', recordedAt: '2026-07-28T10:00:00', status: 'pending' },
  // 预备党员（p17 顾文博 / p20 韩雨欣 / p24 曹雅婷）— 参与7月主题党日：深化改革（act-21）
  { id: 'insp-18', sourceType: SourceType.ACTIVITY, activityId: 'act-21', sourceName: null, personId: 'p17', level: ParticipationLevel.DEEP_PARTICIPATE, role: '现场组织协助',       recordedBy: 'p1',  recordedAt: '2026-07-25T15:00:00', status: 'pending' },
  { id: 'insp-19', sourceType: SourceType.ACTIVITY, activityId: 'act-21', sourceName: null, personId: 'p20', level: ParticipationLevel.DEEP_PARTICIPATE, role: '宣传素材整理',       recordedBy: 'p1',  recordedAt: '2026-07-25T15:05:00', status: 'pending' },
  { id: 'insp-20', sourceType: SourceType.ACTIVITY, activityId: 'act-21', sourceName: null, personId: 'p24', level: ParticipationLevel.DEEP_PARTICIPATE, role: '新闻稿撰写',         recordedBy: 'p1',  recordedAt: '2026-07-25T15:10:00', status: 'pending' },
  // ── 50 人规模扩充（p28~p50，2026-08-01）──
  // 考察记录保持真实待确认状态（pending），纪检确认后自动销「考察待确认」待办；末尾 3 条已确认演示确认态
  // 预备党员（p28~p30）参与 7月主题党日：深化改革（act-21）
  { id: 'insp-21', sourceType: SourceType.ACTIVITY, activityId: 'act-21', sourceName: null, personId: 'p28', level: ParticipationLevel.DEEP_PARTICIPATE, role: '现场签到协助',       recordedBy: 'p1',  recordedAt: '2026-07-25T15:00:00', status: 'pending' },
  { id: 'insp-22', sourceType: SourceType.ACTIVITY, activityId: 'act-21', sourceName: null, personId: 'p29', level: ParticipationLevel.DEEP_PARTICIPATE, role: '宣传素材采集',       recordedBy: 'p1',  recordedAt: '2026-07-25T15:05:00', status: 'pending' },
  { id: 'insp-23', sourceType: SourceType.ACTIVITY, activityId: 'act-21', sourceName: null, personId: 'p30', level: ParticipationLevel.DEEP_PARTICIPATE, role: '材料分发与回收',     recordedBy: 'p1',  recordedAt: '2026-07-25T15:10:00', status: 'pending' },
  // 预备党员（p31）参与 8月党小组会（act-26）
  { id: 'insp-24', sourceType: SourceType.ACTIVITY, activityId: 'act-26', sourceName: null, personId: 'p31', level: ParticipationLevel.DEEP_PARTICIPATE, role: '线上会议纪要',       recordedBy: 'p1',  recordedAt: '2026-08-07T20:05:00', status: 'pending' },
  // 发展对象（p32~p38）参与 8月党小组会（act-26）
  { id: 'insp-25', sourceType: SourceType.ACTIVITY, activityId: 'act-26', sourceName: null, personId: 'p32', level: ParticipationLevel.DEEP_PARTICIPATE, role: '讨论记录',           recordedBy: 'p1',  recordedAt: '2026-08-07T20:10:00', status: 'pending' },
  { id: 'insp-26', sourceType: SourceType.ACTIVITY, activityId: 'act-26', sourceName: null, personId: 'p33', level: ParticipationLevel.DEEP_PARTICIPATE, role: '思想汇报交流',       recordedBy: 'p1',  recordedAt: '2026-08-07T20:15:00', status: 'pending' },
  { id: 'insp-27', sourceType: SourceType.ACTIVITY, activityId: 'act-26', sourceName: null, personId: 'p34', level: ParticipationLevel.DEEP_PARTICIPATE, role: '材料准备',           recordedBy: 'p1',  recordedAt: '2026-08-07T20:20:00', status: 'pending' },
  { id: 'insp-28', sourceType: SourceType.ACTIVITY, activityId: 'act-26', sourceName: null, personId: 'p35', level: ParticipationLevel.DEEP_PARTICIPATE, role: '考勤统计协助',       recordedBy: 'p1',  recordedAt: '2026-08-07T20:25:00', status: 'pending' },
  { id: 'insp-29', sourceType: SourceType.ACTIVITY, activityId: 'act-26', sourceName: null, personId: 'p36', level: ParticipationLevel.DEEP_PARTICIPATE, role: '发言准备',           recordedBy: 'p1',  recordedAt: '2026-08-07T20:30:00', status: 'pending' },
  { id: 'insp-30', sourceType: SourceType.ACTIVITY, activityId: 'act-26', sourceName: null, personId: 'p37', level: ParticipationLevel.DEEP_PARTICIPATE, role: '会议记录整理',       recordedBy: 'p1',  recordedAt: '2026-08-07T20:35:00', status: 'pending' },
  { id: 'insp-31', sourceType: SourceType.ACTIVITY, activityId: 'act-26', sourceName: null, personId: 'p38', level: ParticipationLevel.DEEP_PARTICIPATE, role: '后续事项跟进',       recordedBy: 'p1',  recordedAt: '2026-08-07T20:40:00', status: 'pending' },
  // 积极分子（p39/p40）参与 7月积极分子座谈会（act-22）
  { id: 'insp-32', sourceType: SourceType.ACTIVITY, activityId: 'act-22', sourceName: null, personId: 'p39', level: ParticipationLevel.DEEP_PARTICIPATE, role: '会议记录',           recordedBy: 'p11', recordedAt: '2026-07-28T10:05:00', status: 'pending' },
  { id: 'insp-33', sourceType: SourceType.ACTIVITY, activityId: 'act-22', sourceName: null, personId: 'p40', level: ParticipationLevel.DEEP_PARTICIPATE, role: '发言准备',           recordedBy: 'p11', recordedAt: '2026-07-28T10:10:00', status: 'pending' },
  // 积极分子（p41~p43）参与 8月党小组会（act-26）
  { id: 'insp-34', sourceType: SourceType.ACTIVITY, activityId: 'act-26', sourceName: null, personId: 'p41', level: ParticipationLevel.DEEP_PARTICIPATE, role: '学习心得分享',       recordedBy: 'p1',  recordedAt: '2026-08-07T20:45:00', status: 'pending' },
  { id: 'insp-35', sourceType: SourceType.ACTIVITY, activityId: 'act-26', sourceName: null, personId: 'p42', level: ParticipationLevel.DEEP_PARTICIPATE, role: '资料整理',           recordedBy: 'p1',  recordedAt: '2026-08-07T20:50:00', status: 'pending' },
  { id: 'insp-36', sourceType: SourceType.ACTIVITY, activityId: 'act-26', sourceName: null, personId: 'p43', level: ParticipationLevel.DEEP_PARTICIPATE, role: '宣传照片采集',       recordedBy: 'p1',  recordedAt: '2026-08-07T20:55:00', status: 'pending' },
  // 积极分子（p44~p50，2026-08-01 申请人并入积极分子）参与 8月党小组会（act-26，旁听学习+记录）
  { id: 'insp-37', sourceType: SourceType.ACTIVITY, activityId: 'act-26', sourceName: null, personId: 'p44', level: ParticipationLevel.DEEP_PARTICIPATE, role: '旁听学习记录',       recordedBy: 'p1',  recordedAt: '2026-08-07T21:00:00', status: 'pending' },
  { id: 'insp-38', sourceType: SourceType.ACTIVITY, activityId: 'act-26', sourceName: null, personId: 'p45', level: ParticipationLevel.DEEP_PARTICIPATE, role: '思想汇报准备',       recordedBy: 'p1',  recordedAt: '2026-08-07T21:05:00', status: 'pending' },
  { id: 'insp-39', sourceType: SourceType.ACTIVITY, activityId: 'act-26', sourceName: null, personId: 'p46', level: ParticipationLevel.DEEP_PARTICIPATE, role: '会议纪要协助',       recordedBy: 'p1',  recordedAt: '2026-08-07T21:10:00', status: 'pending' },
  { id: 'insp-40', sourceType: SourceType.ACTIVITY, activityId: 'act-26', sourceName: null, personId: 'p47', level: ParticipationLevel.DEEP_PARTICIPATE, role: '学习材料整理',       recordedBy: 'p1',  recordedAt: '2026-08-07T21:15:00', status: 'pending' },
  { id: 'insp-41', sourceType: SourceType.ACTIVITY, activityId: 'act-26', sourceName: null, personId: 'p48', level: ParticipationLevel.DEEP_PARTICIPATE, role: '发言交流',           recordedBy: 'p1',  recordedAt: '2026-08-07T21:20:00', status: 'confirmed' },
  { id: 'insp-42', sourceType: SourceType.ACTIVITY, activityId: 'act-26', sourceName: null, personId: 'p49', level: ParticipationLevel.DEEP_PARTICIPATE, role: '记录整理',           recordedBy: 'p1',  recordedAt: '2026-08-07T21:25:00', status: 'confirmed' },
  { id: 'insp-43', sourceType: SourceType.ACTIVITY, activityId: 'act-26', sourceName: null, personId: 'p50', level: ParticipationLevel.DEEP_PARTICIPATE, role: '会后资料分发',       recordedBy: 'p1',  recordedAt: '2026-08-07T21:30:00', status: 'confirmed' },
];

/**
 * 将考察记录转为展示用对象（以人为中心）
 * @param {InspectionRecord[]} records
 * @returns {Array<{id, personId, personName, sourceType, sourceLabel, activityId, activityTitle, sourceName, level, levelLabel, role, recordedByName, recordedAt, status}>}
 */
export function inspectionToDisplay(records) {
  return records.map(r => ({
    id: r.id,
    personId: r.personId,
    personName: _personName(r.personId),
    sourceType: r.sourceType,
    sourceLabel: SOURCE_TYPE_LABELS[r.sourceType] || r.sourceType,
    activityId: r.activityId,
    activityTitle: r.activityId ? _activityTitle(r.activityId) : null,
    sourceName: r.sourceName,
    level: r.level,
    levelLabel: PARTICIPATION_LEVEL_LABELS[r.level] || r.level,
    content: r.content || r.role, // P1-5：content 优先，旧数据以 role 兜底
    role: r.role,
    recordedByName: _personName(r.recordedBy),
    recordedAt: r.recordedAt,
    status: r.status || 'pending',
  }));
}

/**
 * 考察记录长格式（按来源分组展示）
 */
export function inspectionToLong(records) {
  return records.map(r => ({
    id: r.id,
    name: _personName(r.personId),
    source: r.activityId ? _activityTitle(r.activityId) : r.sourceName,
    sourceType: SOURCE_TYPE_LABELS[r.sourceType] || r.sourceType,
    level: PARTICIPATION_LEVEL_LABELS[r.level] || r.level,
    role: r.role,
    status: r.status,
  }));
}

/**
 * 考察记录宽格式（以人为行、来源为列）
 */
export function inspectionToWide(records) {
  const personMap = {};
  const sourceIds = [];
  records.forEach(r => {
    const sourceKey = r.activityId || r.sourceName;
    if (!sourceIds.find(s => s.key === sourceKey)) {
      sourceIds.push({
        key: sourceKey,
        title: r.activityId ? _activityTitle(r.activityId) : r.sourceName,
        type: SOURCE_TYPE_LABELS[r.sourceType] || r.sourceType,
      });
    }
    if (!personMap[r.personId]) {
      personMap[r.personId] = { name: _personName(r.personId), personId: r.personId, cells: {} };
    }
    personMap[r.personId].cells[sourceKey] = r.content || r.role; // P1-5：content 优先
  });
  return {
    columns: sourceIds,
    rows: Object.values(personMap),
  };
}
