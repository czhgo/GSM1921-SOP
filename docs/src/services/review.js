// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  review.js — 复盘记录 CRUD 同步服务
//  与 attendance.js / inspection.js 同构：mock 常量为初始数据源，写入 mockDB + persist()
//  P1-4 修复（2026-08-02）：复盘记录接入 mockDB 持久化层，刷新不再丢失
// ════════════════════════════════════════════════════════════════

import { mockDB } from '../core/domain.js?v=20260909e';
import { persist } from '../core/data-adapter.js?v=20260909e';
import { bumpToken } from '../core/version-token.js?v=20260909e'; // P0 域缓存失效（spec §二.3）
import { REVIEW_RECORDS, TASKFORCE_REVIEW_RECORDS } from '../mock/index.js?v=20260909e';
import { ACTIVITIES } from '../mock/activities.js?v=20260909e';
import { getPersonName } from './person.js?v=20260909e';
import { loadActivities } from './activity.js?v=20260909e';

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
  bumpToken('activityReview'); // P0：活动复盘写口 bump（批注/确认/书记复核等）
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
    bumpToken('activityReview');
    persist();
    return records[idx];
  }
  records = loadTaskforceReviews();
  idx = records.findIndex(r => r.id === id);
  if (idx === -1) return null;
  records[idx] = { ...records[idx], ...patch };
  mockDB.taskforceReviews = records;
  bumpToken('taskforceReview');
  persist();
  return records[idx];
}

/** 新增活动复盘记录 */
export function addActivityReview(record) {
  mockDB.activityReviews = [...loadActivityReviews(), record];
  bumpToken('activityReview');
  persist();
  return record;
}

/** 新增专班复盘记录（T-209 改进项①：组织委员提交专班复盘） */
export function addTaskforceReview(record) {
  mockDB.taskforceReviews = [...loadTaskforceReviews(), record];
  bumpToken('taskforceReview');
  persist();
  return record;
}

// ── 展示格式化（2026-09-03 数据域接线批次二：自 mock/review.js 原样提升）──
const _personName = (id) => getPersonName(id);
const _activityTitle = (id) => ACTIVITIES.find(a => a.id === id)?.title || id;

/**
 * 将复盘记录转为展示用对象
 * @param {ReviewRecord[]} records - 活动复盘记录
 * @param {ReviewRecord[]} tfRecords - 专班复盘记录
 * @returns {Array<Object>}
 */
export function reviewToDisplay(records, tfRecords) {
  const all = [...records, ...tfRecords].map(r => ({
    id: r.id,
    activity: r.activityId ? _activityTitle(r.activityId) : r.sourceName,
    activityId: r.activityId || null,
    sourceType: r.sourceType || null,
    sourceName: r.sourceName || null,
    organizerId: r.organizerId,
    organizer: _personName(r.organizerId),
    progress: r.progress,
    overdue: r.overdue,
    reviewStatus: r.reviewStatus,
    reviewContent: r.reviewContent,
    issues: Array.isArray(r.issues) ? r.issues : [],
    annotation: r.annotation || '',
    annotatedBy: r.annotatedBy ? _personName(r.annotatedBy) : null,
    annotatedById: r.annotatedBy || null,
    annotatedAt: r.annotatedAt || null,
    submittedAt: r.submittedAt || null,
    confirmedAt: r.confirmedAt || null,
  }));
  // 2026-08-08 修复（纪检反馈）：复盘列表按时间倒序（最新在前）。
  // 排序键 = 确认时间 ?? 提交时间 ?? 活动日期；无任何时间戳的「未提交」记录排最末。
  const keyOf = (r) => r.confirmedAt || r.submittedAt
    || (r.activityId ? (ACTIVITIES.find(a => a.id === r.activityId)?.date || '') : '') || '';
  all.sort((a, b) => keyOf(b).localeCompare(keyOf(a)));
  return all;
}
