// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  review.js — 复盘记录 CRUD 同步服务
//  与 attendance.js / inspection.js 同构：mock 常量为初始数据源，写入 mockDB + persist()
//  P1-4 修复（2026-08-02）：复盘记录接入 mockDB 持久化层，刷新不再丢失
// ════════════════════════════════════════════════════════════════

import { mockDB, ReviewStatus } from '../core/domain.js?v=20260921i';
import { persist } from '../core/data-adapter.js?v=20260921i';
import { bumpToken } from '../core/version-token.js?v=20260921i'; // P0 域缓存失效（spec §二.3）
import { REVIEW_RECORDS, TASKFORCE_REVIEW_RECORDS } from '../mock/index.js?v=20260921i';
import { ACTIVITIES } from '../mock/activities.js?v=20260921i';
import { getPersonName } from './person.js?v=20260921i';
import { loadActivities } from './activity.js?v=20260921i';
import { solidAccentStyle } from '../core/constants.js?v=20260921i';
import { generateId } from '../core/id.js?v=20260921i';

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
  bumpToken('activityReview'); // P0：活动复盘写口 bump（批注/确认/支书复核等）
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

// ════════════════════════════════════════════════════════════════
//  复盘表单（唯一实现：成员端「我的复盘」与支书「代提交复盘」共用）
//  —— 字段/校验/提交链路单一源，杜绝两处各写一套字段（2026-09-10 A③ 支书裁定）
// ════════════════════════════════════════════════════════════════

/**
 * 复盘表单 HTML（复用现有字段：复盘总结 + 提出的真问题；提交按钮 class=btn-review-submit）
 * @param {Object} act - 活动对象（提供 id/title）
 * @param {Object|null} rev - 现有复盘记录（预填内容/打回批注）
 * @param {{ accent?: string, accentBorder?: string, delegateHint?: string, footHint?: string }} [opts]
 *   delegateHint：代填说明（仅支书代提交时传入）；footHint：提交后提示文案
 * @returns {string}
 */
export function renderActivityReviewFormHtml(act, rev, opts = {}) {
  const existingContent = rev?.reviewContent || '';
  const existingIssues = Array.isArray(rev?.issues) ? rev.issues : [];
  const isRejected = rev?.reviewStatus === ReviewStatus.REJECTED;
  const footHint = opts.footHint || '提交后纪检委员将在监督复盘tab收到通知';
  return `
    <div class="mt-3 pt-3 border-t border-gray-100">
      ${isRejected && rev.annotation ? `
        <div class="mb-2 p-2 rounded-lg bg-red-50 border border-red-100">
          <div class="text-xs text-red-600 font-bold mb-1">纪检委员批注</div>
          <div class="text-xs text-red-700">${rev.annotation}</div>
        </div>
      ` : ''}
      ${opts.delegateHint ? `<div class="mb-2 text-xs text-gray-500">${opts.delegateHint}</div>` : ''}
      <textarea id="review-textarea-${act.id}" class="input-flat w-full text-xs resize-none" rows="4" placeholder="请填写复盘总结（活动成效、经验教训、改进建议等）">${existingContent}</textarea>
      <div class="mt-2">
        <label class="text-xs text-gray-500 block mb-1">提出的真问题（每行一条，便于汇总改进）</label>
        <textarea id="review-issues-${act.id}" class="input-flat w-full text-xs resize-none" rows="2" placeholder="如：讨论时间不足，需预留更多…">${existingIssues.join('\n')}</textarea>
      </div>
      <div class="flex items-center gap-2 mt-2">
        <button class="btn-review-submit text-xs px-3 py-1.5 rounded-lg text-white transition-colors hover:opacity-90" data-act-id="${act.id}" style="${solidAccentStyle(opts.accent, opts.accentBorder)};cursor:pointer;">提交复盘</button>
        <span class="text-xs text-gray-500">${footHint}</span>
      </div>
    </div>
  `;
}

/**
 * 复盘表单提交（既有落库链路的唯一入口：updateActivityReview / addActivityReview）
 * 校验：复盘总结必填；真问题按行拆分。
 * 代填留痕（不新增字段/不改数据模型）：复用 reviewContent，以「【由{角色}代填】」前缀标注；
 *   代填时 organizerId 归实际组织者（不冒认），成员端自填仍为提交人本人。
 * @param {{ activityId: string, content: string, issues?: string[], actorId: string,
 *           delegate?: { roleLabel?: string }|null }} p
 * @returns {{ ok: true } | { ok: false, error: string }}
 */
export function submitActivityReviewForm({ activityId, content, issues = [], actorId, delegate = null }) {
  if (!activityId) return { ok: false, error: '缺少活动标识' };
  const text = (content || '').trim();
  if (!text) return { ok: false, error: '请填写复盘总结' };

  const act = loadActivities().find(a => a.id === activityId) || null;
  const marker = delegate ? `【由${delegate.roleLabel || '支书'}代填】` : '';
  const finalContent = (marker && !text.startsWith(marker)) ? marker + text : text;

  const idx = findActivityReviewIndex(activityId);
  if (idx >= 0) {
    const existing = loadActivityReviews()[idx];
    const isResubmit = existing.reviewStatus === ReviewStatus.REJECTED;
    updateActivityReview(activityId, {
      reviewContent: finalContent,
      issues,
      reviewStatus: ReviewStatus.UPLOADED,
      submittedAt: new Date().toISOString(),
      ...(isResubmit ? { annotation: '' } : {}),
    });
  } else {
    // 复盘提交人统一归组织者；代填（delegate）时取活动实际组织者，不冒认
    const organizerId = (delegate && act?.organizer) ? act.organizer : actorId;
    addActivityReview({
      id: generateId('rev'),
      activityId,
      organizerId,
      progress: '已完成',
      overdue: false,
      reviewStatus: ReviewStatus.UPLOADED,
      reviewContent: finalContent,
      issues,
      submittedAt: new Date().toISOString(),
    });
  }
  return { ok: true };
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
