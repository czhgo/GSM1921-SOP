// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  close-conditions.js — 活动「关闭条件」唯一判据（2026-10-25 批次 510 自 inspector.js 迁出）
//  为什么迁：待办派生（services/governance/todo.js）也要用同一判据，但服务层不得反向依赖 UI 组件；
//            原实现留在 components/record/inspector.js 会让 todo → inspector → workforce → todo 成环。
//  消费点：① 活动检查器「关闭」入口（components/record/inspector.js 原样转出）；
//          ② 「待归档」待办 hydrate 派生（services/governance/todo.js::derivePendingArchiveTodos）。
// ════════════════════════════════════════════════════════════════
import { mockDB, AttendanceStatus, ReviewStatus } from '../../core/domain/domain.js?v=20261029b';
import { ACTIVITY_CLASSIFICATION } from '../../core/domain/constants.js?v=20261029b';
import { loadAttendanceRecords, isAttendanceConfirmed } from './attendance.js?v=20261029b';
import { loadInspectionRecords } from './inspection.js?v=20261029b';
import { loadActivityReviews } from '../governance/review.js?v=20261029b';
import { reviewRequestOf, isReviewRequestEligibleActivity, isReviewReturned } from './activity.js?v=20261029b';

// 三会四子类单一源 = ACTIVITY_CLASSIFICATION['three-meetings'].subtypes（2026-09-03 去重收口，勿再手写清单）
const MEETING_TYPES = ACTIVITY_CLASSIFICATION['three-meetings'].subtypes;

export function checkActivityCloseConditions(activity) {
  const actId = activity.id;
  const type = activity.type || '';
  const missing = [];

  const atts = loadAttendanceRecords().filter(r => r.activityId === actId);
  const inss = loadInspectionRecords().filter(r => r.activityId === actId);
  const review = loadActivityReviews().find(r => r.activityId === actId) || null;
  const actSubs = (mockDB.actSubRecords && mockDB.actSubRecords[actId]) || {};
  const pubItems = [
    ...(actSubs.publicity || []),
    ...(mockDB.archiveRecords || []).filter(r =>
      (r.activityId && r.activityId === actId) || (!r.activityId && r.activityName === activity.title)
    ),
  ];

  if (MEETING_TYPES.includes(type)) {
    // 三会一课：请假已确认 + 缺勤补课闭环 + 会议纪要
    const leavePending = atts.filter(r => r.status === AttendanceStatus.LEAVE && !isAttendanceConfirmed(r)).length;
    const absentUnclosed = atts.filter(r => r.status === AttendanceStatus.ABSENT).length;
    if (leavePending > 0) missing.push(`请假确认（${leavePending} 条待确认）`);
    if (absentUnclosed > 0) missing.push(`缺勤补课（${absentUnclosed} 人缺勤未补）`);
    if ((actSubs.materials || []).length === 0) missing.push('会议纪要');
  } else if (type === '主题党日') {
    // 主题党日：考勤确认 + 考察确认 + 复盘确认 + 宣传归档
    if (atts.length === 0) {
      missing.push('考勤');
    } else {
      const attPending = atts.filter(r => !isAttendanceConfirmed(r)).length;
      if (attPending > 0) missing.push(`考勤确认（${attPending} 条待确认）`);
    }
    if (inss.length === 0) {
      missing.push('考察');
    } else {
      const inspPending = inss.filter(r => r.status !== 'confirmed').length;
      if (inspPending > 0) missing.push(`考察确认（${inspPending} 条待确认）`);
    }
    if (!review || review.reviewStatus !== ReviewStatus.CONFIRMED) missing.push('复盘确认');
    if (pubItems.length === 0) missing.push('宣传归档');
  }
  // 其他活动类型无强制关闭前置
  if (reviewRequestOf(activity) && isReviewRequestEligibleActivity(activity) && !isReviewReturned(review)) missing.push('追加复盘（支委会要求）尚未交回'); // 2026-09-21 批次 135 · 裁定二「按推荐档落」：只判到「交回」不到「确认」；三会一课不适用

  return { canClose: missing.length === 0, missing };
}
