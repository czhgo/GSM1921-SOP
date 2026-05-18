import { _personName, _activityTitle } from './index.js';

export const REVIEW_RECORDS = [
  { id: 'rev1', activityId: 'act-3', organizerId: 'p3', progress: '已完成', overdue: false, reviewStatus: '已上传', reviewContent: '活动顺利开展，参与度高' },
  { id: 'rev2', activityId: 'act-5', organizerId: 'p5', progress: '进行中', overdue: false, reviewStatus: '—', reviewContent: '' },
];

export const TASKFORCE_REVIEW_RECORDS = [
  { id: 'tfrev1', sourceType: 'taskforce', sourceName: '宣讲团M2阶段', organizerId: 'p4', progress: '超时', overdue: true, reviewStatus: '未提交', reviewContent: '' },
];

export function reviewToDisplay(records, tfRecords) {
  const all = [...records, ...tfRecords];
  return all.map(r => ({
    id: r.id,
    activity: r.activityId ? _activityTitle(r.activityId) : r.sourceName,
    organizer: _personName(r.organizerId),
    progress: r.progress,
    overdue: r.overdue,
    reviewStatus: r.reviewStatus,
    reviewContent: r.reviewContent,
  }));
}
