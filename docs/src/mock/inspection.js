import { _personName, _activityTitle, _activityType } from './index.js';

export const INSPECTION_RECORDS = [
  { id: 'insp1', personId: 'p1', activityId: 'act-3', tag: '党小组', content: '深度参与-研究', status: '已确认' },
  { id: 'insp2', personId: 'p2', sourceType: 'taskforce', sourceName: '宣传联络专班', tag: '专班', content: '文案撰写', status: '待确认' },
  { id: 'insp3', personId: 'p3', activityId: 'act-1', tag: '党小组', content: '组织', status: '已确认' },
  { id: 'insp4', personId: 'p4', sourceType: 'taskforce', sourceName: '宣讲团M2', tag: '专班', content: 'PPT设计', status: '待确认' },
  { id: 'insp5', personId: 'p5', activityId: 'act-3', tag: '党小组', content: '深度参与-宣传', status: '已确认' },
  { id: 'insp6', personId: 'p6', activityId: 'act-5', tag: '会议', content: '旁听', status: '待确认' },
];

export function inspectionToLong(records) {
  return records.map(r => ({
    id: r.id,
    name: _personName(r.personId),
    source: r.activityId ? _activityTitle(r.activityId) : r.sourceName,
    tag: r.tag,
    content: r.content,
    status: r.status,
  }));
}

export function inspectionToWide(records) {
  const personMap = {};
  const sourceIds = [];
  records.forEach(r => {
    const sourceKey = r.activityId || r.sourceName;
    if (!sourceIds.find(s => s.key === sourceKey)) {
      sourceIds.push({
        key: sourceKey,
        title: r.activityId ? _activityTitle(r.activityId) : r.sourceName,
        type: r.tag,
      });
    }
    if (!personMap[r.personId]) {
      personMap[r.personId] = { name: _personName(r.personId), personId: r.personId, cells: {} };
    }
    personMap[r.personId].cells[sourceKey] = r.content;
  });
  return {
    columns: sourceIds,
    rows: Object.values(personMap),
  };
}
