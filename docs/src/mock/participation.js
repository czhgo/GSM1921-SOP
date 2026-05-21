// role: [人机]
// participation.js — 参与记录 Mock 数据
// 数据模型对齐 domain.js ParticipationRecord
// 参与层级: organize(组织) / deep(深度参与) / attend(出勤)
// 分工角色+描述已兼并为 role 字段 — Source: D-187 决策

import { _personName, _activityTitle } from './index.js';
import { ParticipationLevel, PARTICIPATION_LEVEL_LABELS } from '../core/domain.js';

export const PARTICIPATION_RECORDS = [
  // act-3: 3月主题党日：学习两会精神（组织者: 王五 p3）
  { id: 'part-1', activityId: 'act-3', personId: 'p3',  level: ParticipationLevel.ORGANIZE,         role: '策划+全流程统筹', recordedBy: 'p1',  recordedAt: '2026-03-22T10:00:00' },
  { id: 'part-2', activityId: 'act-3', personId: 'p8',  level: ParticipationLevel.DEEP_PARTICIPATE, role: '视频制作',       recordedBy: 'p3',  recordedAt: '2026-03-22T10:05:00' },
  { id: 'part-3', activityId: 'act-3', personId: 'p9',  level: ParticipationLevel.DEEP_PARTICIPATE, role: '新闻稿撰写',     recordedBy: 'p3',  recordedAt: '2026-03-22T10:10:00' },

  // act-10: 5月主题党日：五四精神传承（组织者: 王五 p3）
  { id: 'part-4', activityId: 'act-10', personId: 'p3',  level: ParticipationLevel.ORGANIZE,         role: '全流程策划+现场主持', recordedBy: 'p1',  recordedAt: '2026-05-18T09:00:00' },
  { id: 'part-5', activityId: 'act-10', personId: 'p8',  level: ParticipationLevel.DEEP_PARTICIPATE, role: '视频拍摄+剪辑',     recordedBy: 'p3',  recordedAt: '2026-05-18T09:05:00' },
  { id: 'part-6', activityId: 'act-10', personId: 'p9',  level: ParticipationLevel.DEEP_PARTICIPATE, role: '新闻稿撰写+排版',   recordedBy: 'p3',  recordedAt: '2026-05-18T09:10:00' },

  // act-12: 校企共建座谈：光华 x 中信证券（组织者: 杨十四 p11）
  { id: 'part-7', activityId: 'act-12', personId: 'p11', level: ParticipationLevel.ORGANIZE,         role: '嘉宾邀请+议程设计', recordedBy: 'p13', recordedAt: '2026-05-20T14:00:00' },
  { id: 'part-8', activityId: 'act-12', personId: 'p10', level: ParticipationLevel.DEEP_PARTICIPATE, role: '现场记录+纪要整理', recordedBy: 'p11', recordedAt: '2026-05-20T14:05:00' },

  // act-7: 4月主题党日：红色基地参访（组织者: 王五 p3）
  { id: 'part-9', activityId: 'act-7', personId: 'p3',  level: ParticipationLevel.ORGANIZE,         role: '路线规划+车辆协调', recordedBy: 'p1',  recordedAt: '2026-04-15T08:00:00' },
  { id: 'part-10', activityId: 'act-7', personId: 'p12', level: ParticipationLevel.DEEP_PARTICIPATE, role: '宣传素材采集',     recordedBy: 'p3',  recordedAt: '2026-04-15T08:05:00' },
];

/**
 * 将参与记录转为展示用对象
 * @param {ParticipationRecord[]} records
 * @returns {Array<{id, personName, activityTitle, level, levelLabel, role, recordedByName, recordedAt}>}
 */
export function participationToDisplay(records) {
  return records.map(r => ({
    id: r.id,
    personId: r.personId,
    personName: _personName(r.personId),
    activityId: r.activityId,
    activityTitle: _activityTitle(r.activityId),
    level: r.level,
    levelLabel: PARTICIPATION_LEVEL_LABELS[r.level] || r.level,
    role: r.role,
    recordedByName: _personName(r.recordedBy),
    recordedAt: r.recordedAt,
  }));
}
