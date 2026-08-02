// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  secretary-overview.js — 书记全局概况服务层
//  四维度信息面板：考勤与纪律 / 发展与考察 / 活动与专班进度 / 宣传与档案
//  SecretaryTodoDeriver：异常数据自动派生书记待办
//  Source: content/04_web_design/DATA_ARCHITECTURE.md §2.18-§2.20
//         content/04_web_design/DESIGN_SYSTEM.md §一 第2条 最小三成本
// ════════════════════════════════════════════════════════════════

import { loadAttendanceRecords } from './attendance.js';
import { loadActivities } from './activity.js';
import { loadInspectionRecords, getOverdueRecords } from './inspection.js';
import { TaskForceRecordStore } from './taskforce.js';
import { loadActivityReviews } from './review.js';
import { NoticeStore } from './notice.js';
import { TodoStore, TodoCategory, TodoStatus, TodoSourceType, TodoActionType } from './todo.js';
import { getPersonById, PEOPLE } from '../mock/index.js';
import { AttendanceStatus } from '../core/domain.js';

// ════════════════════════════════════════════════════════════════
//  工具函数
// ════════════════════════════════════════════════════════════════

/** 当前日期字符串 YYYY-MM-DD */
function _today() {
  return new Date().toISOString().slice(0, 10);
}

/** 当前年月字符串 YYYY-MM */
function _thisMonth() {
  return new Date().toISOString().slice(0, 7);
}

/** 日期偏移（返回 YYYY-MM-DD） */
function _addDays(dateStr, days) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

/** 两日期之间相差天数 */
function _daysBetween(dateStr1, dateStr2) {
  const d1 = new Date(dateStr1);
  const d2 = new Date(dateStr2);
  return Math.floor((d2 - d1) / (24 * 60 * 60 * 1000));
}

// ════════════════════════════════════════════════════════════════
//  SecretaryOverviewStore — 四维度概况聚合
// ════════════════════════════════════════════════════════════════

export const SecretaryOverviewStore = {

  /**
   * 获取书记全局概况（四维度）
   * @returns {{ attendance: Object, inspection: Object, activity: Object, propaganda: Object }}
   */
  getOverview() {
    const attendance = this._computeAttendance();
    const inspection = this._computeInspection();
    const activity   = this._computeActivity();
    const propaganda = this._computePropaganda();

    // 派生书记待办（getOverview 末尾调用）
    SecretaryTodoDeriver.deriveAll();

    return { attendance, inspection, activity, propaganda };
  },

  // ── 维度1：考勤与纪律 ──────────────────────────────────────

  _computeAttendance() {
    const records  = loadAttendanceRecords();
    const activities = loadActivities();
    const thisMonth = _thisMonth();

    // 筛选本月活动的考勤记录
    const monthActivityIds = new Set(
      activities.filter(a => (a.date || '').startsWith(thisMonth)).map(a => a.id)
    );
    const monthRecords = records.filter(r => monthActivityIds.has(r.activityId));

    // 出勤率
    const total   = monthRecords.length;
    const present = monthRecords.filter(r =>
      r.status === AttendanceStatus.PRESENT || r.status === AttendanceStatus.MADE_UP
    ).length;
    const attendanceRate = total > 0 ? Math.round((present / total) * 100) : 0;

    // 缺勤人员列表（本月 absent 状态）
    const absentPersonIds = [
      ...new Set(
        monthRecords
          .filter(r => r.status === AttendanceStatus.ABSENT)
          .map(r => r.personId)
      ),
    ];
    const absentPeople = absentPersonIds.slice(0, 5).map(id => {
      const person = getPersonById(id);
      return person ? person.name : id;
    });
    const overflow = absentPersonIds.length - 5;
    if (overflow > 0) {
      absentPeople.push(`+${overflow}人`);
    }

    // 补课未完成数：absent 且无对应 made_up 记录
    const absentIds = new Set(
      records.filter(r => r.status === AttendanceStatus.ABSENT).map(r => r.personId)
    );
    const madeUpIds = new Set(
      records.filter(r => r.status === AttendanceStatus.MADE_UP).map(r => r.personId)
    );
    const makeupPending = [...absentIds].filter(id => !madeUpIds.has(id)).length;

    return {
      attendanceRate,
      alert: attendanceRate < 80,
      absentPeople,
      makeupPending,
    };
  },

  // ── 维度2：发展与考察 ──────────────────────────────────────

  _computeInspection() {
    const inspections = loadInspectionRecords();

    // 各阶段全量人数（50 人规模，2026-08-01 口径修正：按人员库全量统计，非"有考察记录者"）
    // 2026-08-01 身份四阶段：申请人并入积极分子，无独立 applicant 档
    const stageCounts = { activist: 0, target: 0, probationary: 0, full: 0 };
    for (const p of PEOPLE) {
      const stage = p.developStage;
      if (stage === '积极分子') stageCounts.activist++;
      else if (stage === '发展对象') stageCounts.target++;
      else if (stage === '预备党员') stageCounts.probationary++;
      else if (stage === '正式党员') stageCounts.full++;
    }

    // 待确认考察记录数
    const pendingInspections = inspections.filter(r => r.status === 'pending').length;

    // 超期考察记录数
    const overdueInspections = getOverdueRecords().length;

    return {
      stageCounts,
      pendingInspections,
      overdueInspections,
    };
  },

  // ── 维度3：活动与专班进度 ──────────────────────────────────

  _computeActivity() {
    const activities = loadActivities();
    const reviews    = loadActivityReviews();

    // 进行中活动数（未归档的）
    const activeActivities = activities.filter(a => !a.archived).length;

    // 进行中专班数（status=active + recruiting）
    const taskforces = TaskForceRecordStore.list();
    const activeTaskforces = taskforces.filter(tf =>
      tf.status === 'active' || tf.status === 'recruiting'
    ).length;

    // 待赋权活动数（bottom-up 且主源 assignments 中无组织者）
    const pendingAuth = activities.filter(a =>
      !a.archived &&
      a.direction === 'bottom-up' &&
      !(a.assignments || []).some(x => x.role === 'organizer')
    ).length;

    // 复盘完成率
    const completedActivities = activities.filter(a =>
      a.status === 'completed' || a.archived
    );
    const reviewedActivityIds = new Set(reviews.map(r => r.activityId));
    const reviewedCount = completedActivities.filter(a =>
      reviewedActivityIds.has(a.id)
    ).length;
    const reviewRate = completedActivities.length > 0
      ? Math.round((reviewedCount / completedActivities.length) * 100)
      : 0;

    return {
      activeActivities,
      activeTaskforces,
      pendingAuth,
      reviewRate,
    };
  },

  // ── 维度4：宣传与档案 ──────────────────────────────────────

  _computePropaganda() {
    const notices   = NoticeStore.getAll();
    const activities = loadActivities();
    const thisMonth  = _thisMonth();

    // 本月通知发布数
    const noticeCount = notices.filter(n =>
      (n.publishDate || '').startsWith(thisMonth)
    ).length;

    // 已结束活动（completed 或 archived）
    const endedActivities = activities.filter(a =>
      a.status === 'completed' || a.archived
    );

    // 待归档活动数（已结束但未归档）
    const pendingArchive = endedActivities.filter(a => !a.archived).length;

    // 归档完成率
    const archivedCount = activities.filter(a => a.archived).length;
    const archiveRate = endedActivities.length > 0
      ? Math.round((archivedCount / endedActivities.length) * 100)
      : 0;

    return {
      noticeCount,
      pendingArchive,
      archiveRate,
    };
  },
};

// ════════════════════════════════════════════════════════════════
//  SecretaryTodoDeriver — 书记待办自动派生
//  扫描各维度异常数据，自动创建 role='secretary' 的待办条目
// ════════════════════════════════════════════════════════════════

export const SecretaryTodoDeriver = {

  /**
   * 派生全部书记待办（内部调用4个派生函数）
   * @returns {Array} 新创建的待办列表
   */
  deriveAll() {
    const created = [];
    created.push(...this._deriveAttendanceTodo());
    created.push(...this._deriveOverdueInspectionTodo());
    created.push(...this._deriveReviewTodo());
    created.push(...this._deriveArchivePropagandaTodo());
    return created;
  },

  /**
   * 去重检查：同 sourceType+sourceId 的待办已存在（含已完成）则跳过
   * 2026-08-01 修复：此前仅排除未完成待办，导致"标记完成"后同源待办立即重生（列表只增不减）
   * @param {string} sourceType
   * @param {string} sourceId
   * @returns {boolean} true=已存在需跳过
   */
  _isDuplicate(sourceType, sourceId) {
    const existing = TodoStore.getByRole('secretary', { includeCompleted: true });
    return existing.some(t =>
      t.sourceType === sourceType && t.sourceId === sourceId
    );
  },

  // ── 派生规则1：活动结束>3天且无考勤记录 ──────────────────

  _deriveAttendanceTodo() {
    const activities = loadActivities();
    const attendances = loadAttendanceRecords();
    const today = _today();
    const created = [];

    // 已结束活动（completed 或 archived）
    const endedActivities = activities.filter(a =>
      (a.status === 'completed' || a.archived) && a.date
    );

    for (const act of endedActivities) {
      const daysSince = _daysBetween(act.date, today);
      if (daysSince <= 3) continue;

      // 检查是否有该活动的考勤记录
      const hasAttendance = attendances.some(r => r.activityId === act.id);
      if (hasAttendance) continue;

      // 去重
      if (this._isDuplicate(TodoSourceType.ACTIVITY, act.id)) continue;

      const todo = TodoStore.create({
        title: `「${act.title}」考勤待确认（纪检）`,
        description: `活动已于 ${act.date} 结束超过3天，尚未录入考勤记录。`,
        role: 'secretary',
        category: TodoCategory.REVIEW,
        priority: 'normal',
        deadline: _addDays(act.date, 5),
        sourceType: TodoSourceType.ACTIVITY,
        sourceId: act.id,
        actionType: TodoActionType.REVIEW,
      });
      created.push(todo);
    }

    return created;
  },

  // ── 派生规则2：考察记录超期未确认 ──────────────────────────

  _deriveOverdueInspectionTodo() {
    const overdueRecords = getOverdueRecords();
    const created = [];

    for (const record of overdueRecords) {
      // 去重：用 record.id 作为 sourceId（考察记录也是 ACTIVITY 来源的一种）
      // 使用组合 key 避免 sourceId 冲突
      const dedupeId = `insp_${record.id}`;
      if (this._isDuplicate(TodoSourceType.ACTIVITY, dedupeId)) continue;

      const person = getPersonById(record.personId);
      const personName = person ? person.name : record.personId;

      const todo = TodoStore.create({
        title: `「${personName}」考察记录超期待确认（纪检）`,
        description: `考察记录录入于 ${record.recordedAt ? record.recordedAt.slice(0, 10) : '未知'}，已超过7天未确认。`,
        role: 'secretary',
        category: TodoCategory.REVIEW,
        priority: 'urgent',
        deadline: _addDays(record.recordedAt ? record.recordedAt.slice(0, 10) : _today(), 7),
        sourceType: TodoSourceType.ACTIVITY,
        sourceId: dedupeId,
        actionType: TodoActionType.REVIEW,
      });
      created.push(todo);
    }

    return created;
  },

  // ── 派生规则3：活动结束>7天且无复盘 ──────────────────────

  _deriveReviewTodo() {
    const activities = loadActivities();
    const reviews = loadActivityReviews();
    const today = _today();
    const created = [];

    const endedActivities = activities.filter(a =>
      (a.status === 'completed' || a.archived) && a.date
    );

    const reviewedActivityIds = new Set(reviews.map(r => r.activityId));

    for (const act of endedActivities) {
      const daysSince = _daysBetween(act.date, today);
      if (daysSince <= 7) continue;

      // 检查是否有复盘记录
      if (reviewedActivityIds.has(act.id)) continue;

      // 去重
      if (this._isDuplicate(TodoSourceType.ACTIVITY, `review_${act.id}`)) continue;

      const todo = TodoStore.create({
        title: `「${act.title}」待复盘（纪检）`,
        description: `活动已于 ${act.date} 结束超过7天，尚未提交复盘记录。`,
        role: 'secretary',
        category: TodoCategory.SUBMIT,
        priority: 'normal',
        deadline: _addDays(act.date, 10),
        sourceType: TodoSourceType.ACTIVITY,
        sourceId: `review_${act.id}`,
        actionType: TodoActionType.SUBMIT,
      });
      created.push(todo);
    }

    return created;
  },

  // ── 派生规则4：活动已归档但宣传材料未提交 ────────────────

  _deriveArchivePropagandaTodo() {
    const activities = loadActivities();
    const created = [];

    // 已归档的活动
    const archivedActivities = activities.filter(a => a.archived);

    for (const act of archivedActivities) {
      // 检查是否已有宣传提交待办（去重）
      if (this._isDuplicate(TodoSourceType.ACTIVITY, `archive_prop_${act.id}`)) continue;

      // 检查是否已存在宣传委员的归档待办（如 LifecycleTodoDeriver 创建的）
      // 此处书记待办与宣传委员待办独立，不跳过

      const archiveDate = act.archivedAt || act.date || _today();

      const todo = TodoStore.create({
        title: `「${act.title}」宣传归档待提交（宣传）`,
        description: `活动已于 ${typeof archiveDate === 'string' ? archiveDate.slice(0, 10) : archiveDate} 归档，宣传材料尚未提交。`,
        role: 'secretary',
        category: TodoCategory.SUBMIT,
        priority: 'normal',
        deadline: _addDays(typeof archiveDate === 'string' ? archiveDate.slice(0, 10) : archiveDate, 7),
        sourceType: TodoSourceType.ACTIVITY,
        sourceId: `archive_prop_${act.id}`,
        actionType: TodoActionType.SUBMIT,
      });
      created.push(todo);
    }

    return created;
  },
};
