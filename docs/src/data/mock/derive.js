// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  docs/src/data/mock/derive.js — 种子事实 → 运行时派生（Task 1 · 2026-10-25）
// ════════════════════════════════════════════════════════════════
// 口径：`docs/src/data/mock/**` 只写**事实**（日期、确认动作、表决、参会、报名…）；
//   状态 / 进度 / 过期 / 快照等**可现算**字段由本文件唯一派生器补回内存对象。
//   · 纯函数、无 DOM、无 localStorage / store 依赖；浏览器与 Node（server/seed.js）共用。
//   · **幂等**：同一事实连续派生两次结果一致（第二次返回 changed=false）。
//   · 只写派生字段；不触碰 title / date / assignments 等用户运行时字段。
//   · 天数一律取 `core/domain/policy-defaults.js`，不在此写死业务数字。
// ════════════════════════════════════════════════════════════════
import { todayLocal } from '../../core/base/date.js?v=20261029b';
import { isActivityEnded } from '../../core/domain/constants.js?v=20261029b';
import { POLICY_DEFAULTS, isReviewOverdue } from '../../core/domain/policy-defaults.js?v=20261029b';
import { ReviewStatus, TaskforceStatus } from '../../core/domain/domain.js?v=20261029b';

function _addDays(dateKey, days) {
  if (!dateKey) return null;
  const date = new Date(`${String(dateKey).slice(0, 10)}T00:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  date.setDate(date.getDate() + Number(days));
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** 活动状态：取消事实 > 未立项事实 > 日期（未来=已发布，过去/当天=已完成）。 */
export function deriveActivityStatus(activity, now = todayLocal()) {
  const a = activity || {};
  if (a.cancelled === true) return 'cancelled';
  if (a.draft === true) return 'draft';
  // 草稿 / 待审批是写口事实，不由日期推导，刷新后必须保留。
  if (a.status === 'draft' || a.status === 'pending-approval') return a.status;
  if (a.status === 'cancelled') return 'cancelled';
  if (!a.date) return a.status || 'draft';
  // 显式「已发布」的未来活动是发布人事实，保留。
  if (a.status === 'published' && String(a.date) > String(now)) return 'published';
  return String(a.date) > String(now) ? 'published' : 'completed';
}

/** 会议议程是否全部已记录结果（result 为议程项的表决/结论事实）。 */
function _agendaAllResult(activity) {
  const items = (activity?.agenda || []).filter((item) => item && item.id);
  return items.length > 0 && items.every((item) => !!item.result);
}

/**
 * 会议（支委会 / 党员大会等）统一状态派生——替代页签本地四态 `meetingStatus()`。
 * 判据只用事实：取消 / 归档 / 日期 / 表决锁定 / 考勤、复盘、议程结果。
 *   已取消：`cancelled` 事实（含历史 `status='cancelled'`）；
 *   已归档：`archived` 事实（归档单一事实优先于任意进行态）；
 *   已召开：有考勤 / 复盘 / 议程结果等「会后事实」，或日期早于今天；
 *   进行中：日期为今天且无会后事实，或日期未到但表决已锁定；
 *   待召开：**仅当**日期晚于今天且未锁定（其余一律不判待召开）。
 * @param {Object} activity 活动（含 date / archived / cancelled / votesLocked / agenda）
 * @param {{attendances?:Array, reviews?:Array, review?:Object, attendanceDone?:boolean, reviewDone?:boolean}} [facts]
 * @param {string} [now] 日期键 YYYY-MM-DD
 * @returns {'待召开'|'进行中'|'已召开'|'已归档'|'已取消'}
 */
export function deriveMeetingStatus(activity, facts = {}, now = todayLocal()) {
  const a = activity || {};
  const f = facts || {};
  if (a.cancelled === true || a.status === 'cancelled') return '已取消';
  if (a.archived === true) return '已归档';
  const activityId = String(a.id || '');
  const attendanceDone = f.attendanceDone === true
    || (Array.isArray(f.attendances) && f.attendances.some((row) => row && String(row.activityId) === activityId));
  const reviewDone = f.reviewDone === true
    || !!f.review
    || (Array.isArray(f.reviews) && f.reviews.some((row) => row && String(row.activityId) === activityId));
  if (attendanceDone || reviewDone || _agendaAllResult(a)) return '已召开';

  const date = String(a.date || '').slice(0, 10);
  const today = String(now || '').slice(0, 10);
  if (!date) return '进行中'; // 无日期不满足「待召开」的日期判据；只能按未完成态呈现
  if (date > today) return a.votesLocked === true ? '进行中' : '待召开';
  if (date === today) return '进行中';
  return '已召开';
}

/** 复盘进度：活动已结束 → 已完成；否则进行中。 */
export function deriveReviewProgress(review, activity) {
  return activity && isActivityEnded(activity) ? '已完成' : '进行中';
}

/** 复盘超期：活动已结束 + 未确认，且超过复盘提交期限（活动日 + review.deadlineDays）。 */
export function deriveReviewOverdue(review, activity, now = todayLocal()) {
  if (!review || !activity || !isActivityEnded(activity)) return false;
  if (review.reviewStatus === ReviewStatus.CONFIRMED || review.confirmedAt) return false;
  return isReviewOverdue({ ...review, date: activity.date }, { today: now });
}

/** 考察确认状态：有确认动作事实 → confirmed；否则 pending（打回后未再确认同样为 pending）。 */
export function deriveInspectionStatus(record) {
  if (record && (record.confirmedBy || record.confirmedAt)) return 'confirmed';
  return 'pending';
}

/**
 * 专班状态：解散事实 → dissolved；截止日已过 → completed；其余按 canonical 枚举
 * （draft / pending_review / recruiting / active）。不得输出七态之外的值。
 */
export function deriveTaskforceStatus(taskforce, now = todayLocal()) {
  const tf = taskforce || {};
  if (tf.dissolvedAt) return TaskforceStatus.DISSOLVED;
  if (tf.deletedAt) return TaskforceStatus.ARCHIVED;
  if (tf.draft === true || tf.status === TaskforceStatus.DRAFT) return TaskforceStatus.DRAFT;
  if (tf.pendingReview === true || tf.status === TaskforceStatus.PENDING_REVIEW) return TaskforceStatus.PENDING_REVIEW;
  if (tf.archived === true || tf.status === TaskforceStatus.ARCHIVED) return TaskforceStatus.ARCHIVED;
  if (tf.deadline && String(tf.deadline) < String(now)) return TaskforceStatus.COMPLETED;
  if (tf.recruiting === true || tf.status === TaskforceStatus.RECRUITING) return TaskforceStatus.RECRUITING;
  return TaskforceStatus.ACTIVE;
}

/** 归档记录：有 activityId 即「活动已归档」事实 → activityName 取活动标题、status 固定 archived。
 *  无 activityId 的**非活动材料**（`materialOnly:true`）是自带事实：名称取自带 title，状态恒 archived；
 *  派生器不得用任何活动标题覆盖它。 */
export function deriveArchiveState(record, activity) {
  const row = record || {};
  if (row.materialOnly === true) {
    return { activityName: row.activityName || row.title, status: 'archived' };
  }
  if (!row.activityId) return { activityName: row.activityName, status: row.status };
  return {
    activityName: activity?.title || row.activityName,
    status: 'archived',
  };
}

/**
 * 归档动作的归档记录同步（幂等）：同一活动已有归档记录 → 现取活动标题并置 archived；
 * 没有任何记录 → 补一条最小归档记录（`ar-<activityId>`）。重复调用不新增、不改 id。
 * @param {Array} records 现有 archiveRecords
 * @param {Object} activity 已归档活动（含 id / title）
 * @param {{now?:string}} [opts]
 * @returns {Array} 新数组（未变化时逐行引用不变）
 */
export function upsertActivityArchiveRecord(records, activity, opts = {}) {
  const rows = Array.isArray(records) ? records : [];
  const id = String(activity?.id || '');
  if (!id) return rows;
  const now = opts.now || todayLocal();
  let matched = false;
  let changed = false;
  const next = rows.map((row) => {
    if (!row || String(row.activityId) !== id) return row;
    matched = true;
    const activityName = activity?.title || row.activityName || '';
    if (row.activityName === activityName && row.status === 'archived') return row;
    changed = true;
    return { ...row, activityName, status: 'archived' };
  });
  if (matched) return changed ? next : rows;
  return [...next, {
    id: `ar-${id}`,
    activityId: id,
    activityName: activity?.title || '未命名活动',
    category: '其他',
    archiveDate: now,
    status: 'archived',
  }];
}

/** 通知有效期：目标为活动时 = 活动日 + 活动收尾窗口（review.deadlineDays）；其余保留显式事实。 */
export function deriveNoticeExpiry(notice, activity) {
  const n = notice || {};
  if (n.targetType === 'activity' && activity?.date) {
    return _addDays(activity.date, POLICY_DEFAULTS.review.deadlineDays);
  }
  return n.expireDate;
}

/** 考勤行人员快照：按 personId 从人员事实现取，不存行内副本。 */
export function deriveAttendanceSnapshot(record, person) {
  if (!record || !person) return null;
  return {
    studentId: person.studentId || person.id,
    developStage: person.developStage || '',
    partyGroup: person.partyGroup || '',
  };
}

const hasOwn = (object, key) => Object.prototype.hasOwnProperty.call(object, key);

function setIfChanged(row, key, value) {
  if (value === undefined) return false;
  if (hasOwn(row, key) && row[key] === value) return false;
  row[key] = value;
  return true;
}

/**
 * 把派生事实补回集合对象（就地修改）。
 * @param {Object} db 形如 mockDB：{ activities, activityReviews, inspections, taskforces, archiveRecords, notices, attendances }
 * @param {{now?:string, people?:Array}} [opts]
 * @returns {boolean} 是否有字段被改写（第二次调用应为 false，用于证幂等）
 */
export function applyDerivedFacts(db, opts = {}) {
  if (!db || typeof db !== 'object') return false;
  const now = opts.now || todayLocal();
  const people = Array.isArray(opts.people)
    ? opts.people
    : (Array.isArray(db.users) ? db.users : []);
  const peopleById = new Map(people.filter(Boolean).map((person) => [String(person.id), person]));
  const activityById = new Map(
    (Array.isArray(db.activities) ? db.activities : []).filter(Boolean).map((activity) => [String(activity.id), activity]),
  );
  let changed = false;

  // ① 活动状态（后续派生依赖它判断「已结束」）
  for (const activity of Array.isArray(db.activities) ? db.activities : []) {
    if (!activity) continue;
    if (setIfChanged(activity, 'status', deriveActivityStatus(activity, now))) changed = true;
  }

  // ② 活动复盘
  for (const review of Array.isArray(db.activityReviews) ? db.activityReviews : []) {
    if (!review) continue;
    const activity = review.activityId ? activityById.get(String(review.activityId)) : null;
    if (setIfChanged(review, 'progress', deriveReviewProgress(review, activity))) changed = true;
    if (setIfChanged(review, 'overdue', deriveReviewOverdue(review, activity, now))) changed = true;
  }

  // ③ 考察
  for (const record of Array.isArray(db.inspections) ? db.inspections : []) {
    if (!record) continue;
    if (setIfChanged(record, 'status', deriveInspectionStatus(record))) changed = true;
  }

  // ④ 专班
  for (const taskforce of Array.isArray(db.taskforces) ? db.taskforces : []) {
    if (!taskforce) continue;
    if (setIfChanged(taskforce, 'status', deriveTaskforceStatus(taskforce, now))) changed = true;
  }

  // ⑤ 归档记录
  for (const record of Array.isArray(db.archiveRecords) ? db.archiveRecords : []) {
    if (!record) continue;
    const activity = record.activityId ? activityById.get(String(record.activityId)) : null;
    const derived = deriveArchiveState(record, activity);
    if (setIfChanged(record, 'activityName', derived.activityName)) changed = true;
    if (setIfChanged(record, 'status', derived.status)) changed = true;
  }

  // ⑥ 通知有效期
  for (const notice of Array.isArray(db.notices) ? db.notices : []) {
    if (!notice) continue;
    const activity = notice.targetType === 'activity' && notice.targetId
      ? activityById.get(String(notice.targetId))
      : null;
    if (setIfChanged(notice, 'expireDate', deriveNoticeExpiry(notice, activity))) changed = true;
  }

  // ⑦ 考勤人员快照
  for (const record of Array.isArray(db.attendances) ? db.attendances : []) {
    if (!record) continue;
    const person = peopleById.get(String(record.personId));
    const snapshot = deriveAttendanceSnapshot(record, person);
    if (!snapshot) continue;
    for (const [key, value] of Object.entries(snapshot)) {
      if (setIfChanged(record, key, value)) changed = true;
    }
  }

  return changed;
}
