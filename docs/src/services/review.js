﻿// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  review.js — 复盘记录 CRUD 同步服务
//  与 attendance.js / inspection.js 同构：mock 常量为初始数据源，写入 mockDB + persist()
//  P1-4 修复（2026-08-02）：复盘记录接入 mockDB 持久化层，刷新不再丢失
// ════════════════════════════════════════════════════════════════

import { mockDB } from '../core/domain.js?v=20260808m';
import { persist } from '../core/data-adapter.js?v=20260808m';
import { REVIEW_RECORDS, TASKFORCE_REVIEW_RECORDS } from '../mock/index.js?v=20260808m';
import { loadActivities } from './activity.js?v=20260808m';

/** 读取活动复盘记录（mock 常量兜底，写入后以 mockDB 为准） */
export function loadActivityReviews() {
  return mockDB.activityReviews.length > 0 ? [...mockDB.activityReviews] : [...REVIEW_RECORDS];
}

/**
 * 读取活跃活动的复盘记录（2026-08-08 归档闭环）
 * 已归档活动的复盘随活动退出工作区展示（归档库仍可查阅）。
 * ⚠️ 写流程（批注/打回/确认）必须使用 loadActivityReviews 原始版，避免整表写回丢失归档记录。
 */
export function loadActiveActivityReviews() {
  const activeIds = new Set(loadActivities().filter(a => !a.archived).map(a => a.id));
  return loadActivityReviews().filter(r => activeIds.has(r.activityId));
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

/** 按记录 id 更新复盘记录（活动/专班通用，2026-08-05 纪检复盘真操作修复） */
export function updateReviewById(id, patch) {
  let records = loadActivityReviews();
  let idx = records.findIndex(r => r.id === id);
  if (idx !== -1) {
    records[idx] = { ...records[idx], ...patch };
    mockDB.activityReviews = records;
    persist();
    return records[idx];
  }
  records = loadTaskforceReviews();
  idx = records.findIndex(r => r.id === id);
  if (idx === -1) return null;
  records[idx] = { ...records[idx], ...patch };
  mockDB.taskforceReviews = records;
  persist();
  return records[idx];
}

/** 新增活动复盘记录 */
export function addActivityReview(record) {
  mockDB.activityReviews = [...loadActivityReviews(), record];
  persist();
  return record;
}
