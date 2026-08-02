// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  review.js — 复盘记录 CRUD 同步服务
//  与 attendance.js / inspection.js 同构：mock 常量为初始数据源，写入 mockDB + persist()
//  P1-4 修复（2026-08-02）：复盘记录接入 mockDB 持久化层，刷新不再丢失
// ════════════════════════════════════════════════════════════════

import { mockDB } from '../core/domain.js';
import { persist } from '../core/data-adapter.js';
import { REVIEW_RECORDS, TASKFORCE_REVIEW_RECORDS } from '../mock/index.js';

/** 读取活动复盘记录（mock 常量兜底，写入后以 mockDB 为准） */
export function loadActivityReviews() {
  return mockDB.activityReviews.length > 0 ? [...mockDB.activityReviews] : [...REVIEW_RECORDS];
}

/** 读取专班复盘记录 */
export function loadTaskforceReviews() {
  return mockDB.taskforceReviews.length > 0 ? [...mockDB.taskforceReviews] : [...TASKFORCE_REVIEW_RECORDS];
}

/** 按活动 ID 查找活动复盘记录 */
export function findActivityReviewById(activityId) {
  return loadActivityReviews().find(r => r.activityId === activityId) || null;
}

/** 查找活动复盘记录索引 */
export function findActivityReviewIndex(activityId) {
  return loadActivityReviews().findIndex(r => r.activityId === activityId);
}

/** 更新活动复盘记录（按 activityId 定位） */
export function updateActivityReview(activityId, patch) {
  const records = loadActivityReviews();
  const idx = records.findIndex(r => r.activityId === activityId);
  if (idx === -1) return null;
  records[idx] = { ...records[idx], ...patch };
  mockDB.activityReviews = records;
  persist();
  return records[idx];
}

/** 新增活动复盘记录 */
export function addActivityReview(record) {
  mockDB.activityReviews = [...loadActivityReviews(), record];
  persist();
  return record;
}
