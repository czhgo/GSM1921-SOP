// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  review.js — 复盘记录 CRUD 同步服务
//  与 attendance.js / inspection.js 同构：mock 常量为初始数据源
//  说明：复盘记录当前未进入 mockDB 持久化层，仍以模块内变量管理
// ════════════════════════════════════════════════════════════════

import { REVIEW_RECORDS, TASKFORCE_REVIEW_RECORDS } from '../mock/index.js';

// 模块内可变引用（保持与原 REVIEW_RECORDS.push 等操作的兼容性）
let _activityReviews = [...REVIEW_RECORDS];
let _taskforceReviews = [...TASKFORCE_REVIEW_RECORDS];

/** 读取活动复盘记录 */
export function loadActivityReviews() {
  return [..._activityReviews];
}

/** 读取专班复盘记录 */
export function loadTaskforceReviews() {
  return [..._taskforceReviews];
}

/** 按 ID 查找活动复盘记录 */
export function findActivityReviewById(activityId) {
  return _activityReviews.find(r => r.activityId === activityId) || null;
}

/** 查找活动复盘记录索引 */
export function findActivityReviewIndex(activityId) {
  return _activityReviews.findIndex(r => r.activityId === activityId);
}

/** 更新活动复盘记录（按 activityId 定位） */
export function updateActivityReview(activityId, patch) {
  const idx = findActivityReviewIndex(activityId);
  if (idx === -1) return null;
  _activityReviews[idx] = { ..._activityReviews[idx], ...patch };
  return _activityReviews[idx];
}

/** 新增活动复盘记录 */
export function addActivityReview(record) {
  _activityReviews.push(record);
  return record;
}
