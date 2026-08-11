﻿﻿﻿﻿// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  secretary-overview.js — 书记全局概况服务层
//  四维度信息面板：考勤与纪律 / 发展与考察 / 活动与专班进度 / 宣传与档案
//  SecretaryTodoDeriver：异常数据自动派生书记待办
//  Source: content/04_web_design/DATA_ARCHITECTURE.md §2.18-§2.20
//         content/04_web_design/DESIGN_SYSTEM.md §一 第2条 最小三成本
// ════════════════════════════════════════════════════════════════

import { loadAttendanceRecords, loadActiveAttendanceRecords } from './attendance.js?v=20260811d';
import { loadActivities } from './activity.js?v=20260811d';
import { loadInspectionRecords, getOverdueRecords } from './inspection.js?v=20260811d';
import { TaskForceRecordStore } from './taskforce.js?v=20260811d';
import { loadActivityReviews, loadActiveActivityReviews } from './review.js?v=20260811d';
import { NoticeStore } from './notice.js?v=20260811d';
import { TodoStore, seedTodos, TodoCategory, TodoActionType } from './todo.js?v=20260811d';
import { getPersonById, PEOPLE } from '../mock/index.js?v=20260811d';
import { ROLE_LABELS } from '../core/constants.js?v=20260811d';
import { mockDB, AttendanceStatus, ReviewStatus } from '../core/domain.js?v=20260811d';

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

    return { attendance, inspection, activity, propaganda };
  },

  // ── 按人视图：各角色在办概览（P-015 知情边界 / L1 条线视角） ──────
  //  书记看各角色"在办什么、有无异常"，不暴露操作细节（看 ≠ 做）。
  //  聚合口径：未完成待办（TodoStore）+ 未归档在办活动 + 进行中/招募中专班。
  //  Source: DESIGN_SYSTEM.md §一 原则9（信息密度精确原则）
  //  2026-08-10 书记裁定：
  //  ① 副书记不入按人视图——非所有支部都有副书记，且实现上与书记无职责差异；
  //  ② 卡片按职责差异化（每角色只投影职责空间在办类型，不平行）；
  //  ③ 专班归组织委员统筹（P-012 招募统筹分离），其他角色仅以发起/成员参与时标注。

  /** 按人视图的角色（4 个，数据驱动：副书记除外），含工作台直达入口 */
  PERSON_ROLES: [
    { role: 'org-commissioner',  url: 'org.html' },
    { role: 'prop-commissioner', url: 'prop.html' },
    { role: 'disc-commissioner', url: 'disc.html' },
    { role: 'leader',            url: 'leader.html' },
  ],

  /**
   * 按人视图数据聚合（L1 条线视角：上级看下级的条线在办）
   * @returns {Array<{
   *   role:string, label:string, personIds:string[], names:string,
   *   todoCount:number, overdueCount:number, todoGroups:Array,
   *   activities:Array<{id,title,date,status}>,
   *   taskforces:Array<{id,name,status,deadline,relation}>,
   *   url:string
   * }>}
   */
  getPersonOverview() {
    seedTodos(); // 补齐种子待办（幂等），保证各角色在办口径与工作台一致
    TodoStore.refreshExpiredStatus();
    const today = _today();
    const activities = loadActivities();
    const taskforces = TaskForceRecordStore.list();

    return this.PERSON_ROLES.map(cfg => {
      const role = cfg.role;
      const people = PEOPLE.filter(p => p.role === role);
      const personIds = people.map(p => p.id);
      const personIdSet = new Set(personIds);

      // ① 未完成待办（按业务动作聚合，同跳转目标合并为一条）
      const todoGroups = TodoStore.getGroupedByAction(role);
      const todoCount = todoGroups.reduce((s, g) => s + g.count, 0);
      const overdueCount = todoGroups.reduce((s, g) => s + g.items.filter(it =>
        it.deadline && it.deadline < today
      ).length, 0);

      // ② 在办活动：未归档、非完结态，且本人为组织者或项目成员
      const relatedActivities = activities.filter(a =>
        !a.archived &&
        a.status !== 'completed' && a.status !== 'cancelled' && a.status !== 'draft' &&
        (personIdSet.has(a.organizer) ||
          (Array.isArray(a.assignments) && a.assignments.some(x => personIdSet.has(x.personId))))
      );

      // ③ 在办专班：进行中/招募中，且本人为 manager/initiator/成员
      //     关系标注：manager=统筹（组织委员职责）/ initiator=发起 / member=成员
      const relatedTaskforces = taskforces.filter(tf =>
        (tf.status === 'active' || tf.status === 'recruiting') &&
        (personIdSet.has(tf.manager) || personIdSet.has(tf.initiator) ||
          (Array.isArray(tf.members) && tf.members.some(m => personIdSet.has(m.personId))))
      ).map(tf => {
        const relation = personIdSet.has(tf.manager) ? 'manager'
          : personIdSet.has(tf.initiator) ? 'initiator' : 'member';
        return { id: tf.id, name: tf.name, status: tf.status, deadline: tf.deadline, relation };
      });

      return {
        role,
        label: ROLE_LABELS[role] || role,
        personIds,
        names: people.map(p => p.name).join('、'),
        todoCount,
        overdueCount,
        todoGroups,
        activities: relatedActivities.map(a => ({ id: a.id, title: a.title, date: a.date, status: a.status })),
        taskforces: relatedTaskforces,
        url: cfg.url,
      };
    });
  },

  // ── 维度1：考勤与纪律 ──────────────────────────────────────

  _computeAttendance() {
    const records  = loadActiveAttendanceRecords();
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

    // 复盘问题数（书记 2026-08-10 裁定：复盘率 100% 目标会诱导"随意提交凑数"→ 目标异化；
    // 从最初设定就只希望大家提交真问题——改问题导向，计量活跃活动复盘中提出的真问题数量）
    const activeReviewIds = new Set(activities.filter(a => !a.archived).map(a => a.id));
    const reviewIssues = reviews
      .filter(r => activeReviewIds.has(r.activityId))
      .reduce((sum, r) => sum + (Array.isArray(r.issues) ? r.issues.length : 0), 0);

    return {
      activeActivities,
      activeTaskforces,
      pendingAuth,
      reviewIssues,
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
//  SecretaryTodoDeriver — 书记待办动态聚合（computeAggregates）
//  实时计算（不创建实体）：4 条提醒类缺口 + 4 条复核类缺口
//  复核类：纪检/宣传已完成动作但书记未复核 → 批次汇总 + 一键确认
// ════════════════════════════════════════════════════════════════

export const SecretaryTodoDeriver = {

  /** 计算书记全部待办聚合卡（8 组；空组不展示，避免 0 条占位卡） */
  computeAggregates() {
    return [
      ...this._aggAttendanceRemind(),
      ...this._aggInspectionRemind(),
      ...this._aggReviewRemind(),
      ...this._aggArchiveRemind(),
      ...this._aggAttendanceConfirm(),
      ...this._aggInspectionConfirm(),
      ...this._aggReviewConfirm(),
      ...this._aggArchiveConfirm(),
    ].filter(g => g.count > 0);
  },

  /** 组装聚合组（groupKey = secretary:{actionKey}） */
  _mkGroup(actionKey, title, category, actionType, flow, items, kind) {
    let deadline = null;
    for (const it of items) {
      if (it.deadline && (!deadline || it.deadline < deadline)) deadline = it.deadline;
    }
    return [{
      groupKey: `secretary:${actionKey}`,
      actionKey,
      title,
      category,
      actionType,
      flow,
      kind,
      deadline,
      count: items.length,
      items,
    }];
  },

  // ── 提醒类1：活动结束>3天且无考勤记录 ────────────────────
  _aggAttendanceRemind() {
    const activities = loadActivities();
    const attendances = loadAttendanceRecords();
    const today = _today();
    const gaps = activities
      .filter(a => (a.status === 'completed' || a.archived) && a.date)
      .filter(a => _daysBetween(a.date, today) > 3)
      .filter(a => !attendances.some(r => r.activityId === a.id));
    return this._mkGroup('attendance-remind', '考勤待录入', TodoCategory.REVIEW, TodoActionType.REVIEW,
      '活动结束>3天未录入考勤 → 纪检确认 → 考勤总表',
      gaps.map(a => ({ id: a.id, activityId: a.id, name: a.title, date: a.date, deadline: _addDays(a.date, 5) })),
      'remind');
  },

  // ── 提醒类2：考察记录超期未确认（>7天） ─────────────────
  _aggInspectionRemind() {
    const overdue = getOverdueRecords();
    const items = overdue.map(r => ({
      id: r.id,
      inspectionId: r.id,
      name: (getPersonById(r.personId) || {}).name || r.personId,
      date: r.recordedAt ? r.recordedAt.slice(0, 10) : null,
      deadline: _addDays(r.recordedAt ? r.recordedAt.slice(0, 10) : _today(), 7),
    }));
    return this._mkGroup('inspection-remind', '考察超期未确认', TodoCategory.REVIEW, TodoActionType.REVIEW,
      '纪检录入考察 → 确认 → 组织建档 → 人才库', items, 'remind');
  },

  // ── 提醒类3：活动结束>7天且无复盘 ──────────────────────
  _aggReviewRemind() {
    const activities = loadActivities();
    const reviews = loadActivityReviews();
    const today = _today();
    const reviewedIds = new Set(reviews.map(r => r.activityId));
    const gaps = activities
      .filter(a => (a.status === 'completed' || a.archived) && a.date)
      .filter(a => _daysBetween(a.date, today) > 7)
      .filter(a => !reviewedIds.has(a.id));
    return this._mkGroup('review-remind', '复盘待提交', TodoCategory.SUBMIT, TodoActionType.SUBMIT,
      '活动完成 → 组织者提交复盘 → 纪检批注/确认',
      gaps.map(a => ({ id: a.id, activityId: a.id, name: a.title, date: a.date, deadline: _addDays(a.date, 10) })),
      'remind');
  },

  // ── 提醒类4：活动已归档但宣传材料未提交 ────────────────
  _aggArchiveRemind() {
    const activities = loadActivities();
    const archivedIds = new Set((mockDB.archiveRecords || []).map(r => r.activityId));
    const gaps = activities.filter(a => a.archived && !archivedIds.has(a.id));
    return this._mkGroup('archive-remind', '宣传材料待归档', TodoCategory.SUBMIT, TodoActionType.SUBMIT,
      '宣传材料 → 宣传委员归档 → 产出物区',
      gaps.map(a => ({ id: a.id, activityId: a.id, name: a.title, date: a.archivedAt || a.date || null })),
      'remind');
  },

  // ── 复核类1：纪检已确认考勤但书记未复核 ────────────────
  _aggAttendanceConfirm() {
    const records = loadActiveAttendanceRecords().filter(r => r.recordedBy && !r.secretaryConfirmedAt);
    return this._mkGroup('attendance-confirm', '考勤待复核', TodoCategory.REVIEW, TodoActionType.REVIEW,
      '纪检已确认考勤 → 书记复核 → 考勤总表', records, 'confirm');
  },

  // ── 复核类2：纪检已确认考察但书记未复核 ────────────────
  _aggInspectionConfirm() {
    const records = loadInspectionRecords().filter(r => r.status === 'confirmed' && !r.secretaryConfirmedAt);
    return this._mkGroup('inspection-confirm', '考察待复核', TodoCategory.REVIEW, TodoActionType.REVIEW,
      '纪检已确认考察 → 书记复核 → 组织建档', records, 'confirm');
  },

  // ── 复核类3：纪检已确认复盘但书记未复核 ────────────────
  _aggReviewConfirm() {
    const reviews = loadActiveActivityReviews().filter(r => r.reviewStatus === ReviewStatus.CONFIRMED && !r.secretaryConfirmedAt);
    return this._mkGroup('review-confirm', '复盘待复核', TodoCategory.REVIEW, TodoActionType.REVIEW,
      '纪检已确认复盘 → 书记复核 → 经验沉淀', reviews, 'confirm');
  },

  // ── 复核类4：宣传已归档材料但书记未复核 ────────────────
  _aggArchiveConfirm() {
    const records = (mockDB.archiveRecords || []).filter(r => r.status === 'archived' && !r.secretaryConfirmedAt);
    return this._mkGroup('archive-confirm', '归档待复核', TodoCategory.ARCHIVE, TodoActionType.ARCHIVE,
      '宣传已归档材料 → 书记复核 → 产出物区', records, 'confirm');
  },
};
