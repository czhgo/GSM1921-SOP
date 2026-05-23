// inspection.js — 考察记录 Mock 数据（统一数据源）
// 数据模型对齐 domain.js InspectionRecord
// 考察来源: activity(活动) / taskforce(专班) — Source: D-198
// 考察层级: organize(组织) / deep(深度参与)
// 考察查询以人为中心，写入以活动/专班的具体工作计入
// 考勤=0-1变量对所有人成立；考察=对深度参与者和组织者的工作量记录

import { _personName, _activityTitle, _activityType } from './index.js';
import { ParticipationLevel, PARTICIPATION_LEVEL_LABELS, SourceType, SOURCE_TYPE_LABELS } from '../core/domain.js';

export const INSPECTION_RECORDS = [
  // ── 活动考察记录 ──────────────────────────────────────────
  // act-3: 3月主题党日：学习两会精神（组织者: 王五 p3）
  { id: 'insp-1', sourceType: SourceType.ACTIVITY, activityId: 'act-3',  sourceName: null, personId: 'p3',  level: ParticipationLevel.ORGANIZE,         role: '策划+全流程统筹',     recordedBy: 'p1',  recordedAt: '2026-03-22T10:00:00', status: 'confirmed' },
  { id: 'insp-2', sourceType: SourceType.ACTIVITY, activityId: 'act-3',  sourceName: null, personId: 'p8',  level: ParticipationLevel.DEEP_PARTICIPATE, role: '视频制作',           recordedBy: 'p3',  recordedAt: '2026-03-22T10:05:00', status: 'confirmed' },
  { id: 'insp-3', sourceType: SourceType.ACTIVITY, activityId: 'act-3',  sourceName: null, personId: 'p9',  level: ParticipationLevel.DEEP_PARTICIPATE, role: '新闻稿撰写',         recordedBy: 'p3',  recordedAt: '2026-03-22T10:10:00', status: 'pending' },

  // act-7: 4月主题党日：红色基地参访（组织者: 王五 p3）
  { id: 'insp-4', sourceType: SourceType.ACTIVITY, activityId: 'act-7',  sourceName: null, personId: 'p3',  level: ParticipationLevel.ORGANIZE,         role: '路线规划+车辆协调',   recordedBy: 'p1',  recordedAt: '2026-04-15T08:00:00', status: 'confirmed' },
  { id: 'insp-5', sourceType: SourceType.ACTIVITY, activityId: 'act-7',  sourceName: null, personId: 'p12', level: ParticipationLevel.DEEP_PARTICIPATE, role: '宣传素材采集',       recordedBy: 'p3',  recordedAt: '2026-04-15T08:05:00', status: 'confirmed' },

  // act-10: 5月主题党日：五四精神传承（组织者: 王五 p3）
  { id: 'insp-6', sourceType: SourceType.ACTIVITY, activityId: 'act-10', sourceName: null, personId: 'p3',  level: ParticipationLevel.ORGANIZE,         role: '全流程策划+现场主持', recordedBy: 'p1',  recordedAt: '2026-05-18T09:00:00', status: 'confirmed' },
  { id: 'insp-7', sourceType: SourceType.ACTIVITY, activityId: 'act-10', sourceName: null, personId: 'p8',  level: ParticipationLevel.DEEP_PARTICIPATE, role: '视频拍摄+剪辑',       recordedBy: 'p3',  recordedAt: '2026-05-18T09:05:00', status: 'pending' },
  { id: 'insp-8', sourceType: SourceType.ACTIVITY, activityId: 'act-10', sourceName: null, personId: 'p9',  level: ParticipationLevel.DEEP_PARTICIPATE, role: '新闻稿撰写+排版',     recordedBy: 'p3',  recordedAt: '2026-05-18T09:10:00', status: 'pending' },

  // act-12: 校企共建座谈：光华 x 中信证券（组织者: 杨十四 p11）
  { id: 'insp-9',  sourceType: SourceType.ACTIVITY, activityId: 'act-12', sourceName: null, personId: 'p11', level: ParticipationLevel.ORGANIZE,         role: '嘉宾邀请+议程设计',   recordedBy: 'p13', recordedAt: '2026-05-20T14:00:00', status: 'confirmed' },
  { id: 'insp-10', sourceType: SourceType.ACTIVITY, activityId: 'act-12', sourceName: null, personId: 'p10', level: ParticipationLevel.DEEP_PARTICIPATE, role: '现场记录+纪要整理',   recordedBy: 'p11', recordedAt: '2026-05-20T14:05:00', status: 'pending' },

  // ── 专班考察记录 ──────────────────────────────────────────
  // 宣传联络专班（p2 李四）
  { id: 'insp-11', sourceType: SourceType.TASKFORCE, activityId: null, sourceName: '宣传联络专班', personId: 'p2',  level: ParticipationLevel.DEEP_PARTICIPATE, role: '文案撰写',           recordedBy: 'p1',  recordedAt: '2026-04-01T09:00:00', status: 'pending' },
  // 宣讲团M2（p4 赵六）
  { id: 'insp-12', sourceType: SourceType.TASKFORCE, activityId: null, sourceName: '宣讲团M2',     personId: 'p4',  level: ParticipationLevel.DEEP_PARTICIPATE, role: 'PPT设计',            recordedBy: 'p11', recordedAt: '2026-04-10T10:00:00', status: 'pending' },
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
    personMap[r.personId].cells[sourceKey] = r.role;
  });
  return {
    columns: sourceIds,
    rows: Object.values(personMap),
  };
}
