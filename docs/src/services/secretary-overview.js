// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  secretary-overview.js — 书记全局概况服务层
//  四维度信息面板：考勤与纪律 / 发展与考察 / 活动与专班进度 / 宣传与档案
//  SecretaryTodoDeriver：异常数据自动派生书记待办
//  Source: content/04_web_design/data/DATA_ARCHITECTURE.md §2.18-§2.20
//         content/04_web_design/design-system/DESIGN_SYSTEM.md §一 第2条 最小三成本
// ════════════════════════════════════════════════════════════════

import { loadAttendanceRecords, loadActiveAttendanceRecords } from './attendance.js?v=20260909e';
import { loadActivities } from './activity.js?v=20260909e';
import { loadInspectionRecords, getOverdueRecords } from './inspection.js?v=20260909e';
import { TaskForceRecordStore } from './taskforce.js?v=20260909e';
import { loadActivityReviews, loadActiveActivityReviews } from './review.js?v=20260909e';
import { NoticeStore } from './notice.js?v=20260909e';
import { TodoStore, seedTodos, TodoCategory, TodoActionType, REALTIME_GROUP_DOMAIN, WORK_DOMAIN } from './todo.js?v=20260909e';
import { tokenOf } from '../core/version-token.js?v=20260909e'; // P0 域缓存失效（spec §二.3/§二.4）
import { PEOPLE } from '../mock/index.js?v=20260909e';
import { getPersonById } from './person.js?v=20260909e';
import { ROLE_LABELS } from '../core/constants.js?v=20260909e';
import { mockDB, AttendanceStatus, ReviewStatus } from '../core/domain.js?v=20260909e';
// 批4（2026-09-09 书记批「域参数」副本收编）：本文件 4 组提醒阈值/deadline 一律引 policy 单一源派生，
// 勿再写字面量（attendance.entryRemindDays/summaryDeadlineDays · inspection.overdueDays ·
// review.overdueDays/deadlineDays——读侧注入后自动跟随域覆盖值）
import { POLICY_DEFAULTS } from '../core/policy-defaults.js?v=20260909e';

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
//  P0 聚合入口复合键缓存（2026-09-07 · spec §二.4）
//  复合键 = 相关源 tokenOf(各源) + 各源数组 length（+ 参数/日期）：
//  未写 → 命中返回上次结果引用；写口 bump / 源长度变化 → 键变重算。
//  ⚠️ 返回对象只读契约：调用方仅读（渲染层只读不写）；需改者先浅拷贝。
//  _memoCap 防止长会话键无限累积（超限整体清空——键内已含写版本，清空仅损失命中）。
const _aggMemo = new Map();
const _MEMO_CAP = 48;
function _memoGet(key) {
  return _aggMemo.has(key) ? _aggMemo.get(key) : undefined;
}
function _memoSet(key, value) {
  if (_aggMemo.size > _MEMO_CAP) _aggMemo.clear();
  _aggMemo.set(key, value);
  return value;
}
/** 源数组长度指纹（读 mockDB 长度 O(1)，不复制；防禁改路径（mock-adapter 直写等）length 变化兜底） */
function _len(arr) {
  return Array.isArray(arr) ? arr.length : 0;
}
/** 复合键工具：token + length 成对参与 */
function _pair(token, arr) {
  return `${token}:${tokenOf(token)}+${_len(arr)}`;
}
/** SecretaryOverviewStore 四维度读源指纹（考勤/活动/考察/专班/复盘/通知） */
function _overviewFp() {
  return [
    'attendance', 'activity', 'inspection', 'taskforce', 'activityReview', 'notice',
  ].map(t => _pair(t, mockDB[{
    attendance: 'attendances', activity: 'activities', inspection: 'inspections',
    taskforce: 'taskforces', activityReview: 'activityReviews', notice: 'notices',
  }[t]])).join(',');
}
/** SecretaryTodoDeriver 8 组读源指纹（活动/考勤/考察/活动复盘/档案记录） */
function _deriverFp() {
  return [
    'activity', 'attendance', 'inspection', 'activityReview', 'archiveRecord',
  ].map(t => _pair(t, mockDB[{
    activity: 'activities', attendance: 'attendances', inspection: 'inspections',
    activityReview: 'activityReviews', archiveRecord: 'archiveRecords',
  }[t]])).join(',');
}
/** 按人视图读源指纹（活动/专班 + 待办 todo token + 日期） */
function _personFp() {
  return `${_pair('activity', mockDB.activities)},${_pair('taskforce', mockDB.taskforces)},todo:${tokenOf('todo')},day:${_today()}`;
}

// ════════════════════════════════════════════════════════════════
//  SecretaryOverviewStore — 四维度概况聚合
// ════════════════════════════════════════════════════════════════

export const SecretaryOverviewStore = {

  /**
   * 获取书记全局概况（四维度）
   * P0：复合键缓存（读源 token + 长度指纹；⚠️ 返回值只读契约，调用方仅读）。
   * @returns {{ attendance: Object, inspection: Object, activity: Object, propaganda: Object }}
   */
  getOverview() {
    const key = 'overview:' + _overviewFp();
    const hit = _memoGet(key);
    if (hit !== undefined) return hit;
    const attendance = this._computeAttendance();
    const inspection = this._computeInspection();
    const activity   = this._computeActivity();
    const propaganda = this._computePropaganda();

    return _memoSet(key, { attendance, inspection, activity, propaganda });
  },

  // ── 按人视图：各角色在办概览（P-011 知情边界 / L1 条线视角） ──────
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
   * P0：seedTodos/refreshExpiredStatus 副作用每次执行（可能写 → 键自变），
   * 其后以复合键缓存（活动/专班 token+长度 + todo token + 日期；⚠️ 返回值只读契约）。
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
    const key = 'personOverview:' + _personFp();
    const hit = _memoGet(key);
    if (hit !== undefined) return hit;
    const today = _today();
    const activities = loadActivities();
    const taskforces = TaskForceRecordStore.list();

    const result = this.PERSON_ROLES.map(cfg => {
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
    return _memoSet(key, result);
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
    // P1（2026-09-07）：records 多遍 filter 合并为单遍（口径不变——出勤/缺勤统计仅本月；
    // absent/made_up 全集仍跨全部活跃记录，供补课未完成数判定）
    let total = 0;
    let present = 0;
    const monthAbsent = []; // 本月缺席 personId（原 monthRecords.filter(ABSENT) 序列，去重后用于列表）
    const absentIds = new Set(); // 全部活跃记录缺席 personId（原 records.filter(ABSENT)）
    const madeUpIds = new Set(); // 全部活跃记录已补 personId（原 records.filter(MADE_UP)）
    for (const r of records) {
      const st = r.status;
      if (st === AttendanceStatus.ABSENT) absentIds.add(r.personId);
      else if (st === AttendanceStatus.MADE_UP) madeUpIds.add(r.personId);
      if (monthActivityIds.has(r.activityId)) {
        total += 1;
        if (st === AttendanceStatus.PRESENT || st === AttendanceStatus.MADE_UP) present += 1;
        else if (st === AttendanceStatus.ABSENT) monthAbsent.push(r.personId);
      }
    }
    const attendanceRate = total > 0 ? Math.round((present / total) * 100) : 0;

    // 缺勤人员列表（本月 absent 状态）
    const absentPersonIds = [...new Set(monthAbsent)];
    const absentPeople = absentPersonIds.slice(0, 5).map(id => {
      const person = getPersonById(id);
      return person ? person.name : id;
    });
    const overflow = absentPersonIds.length - 5;
    if (overflow > 0) {
      absentPeople.push(`+${overflow}人`);
    }

    // 补课未完成数：absent 且无对应 made_up 记录
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

  /** 计算书记全部待办聚合卡（8 组；空组不展示，避免 0 条占位卡）
   *  P0：复合键缓存（读源 token + 长度指纹；⚠️ 返回数组只读契约——调用方仅读，
   *  需改（如加 hideActionBtn 标记）先浅拷贝——todo-tab 已按此消费）。 */
  computeAggregates() {
    const key = 'deriverAggs:' + _deriverFp() + ':day:' + _today();
    const hit = _memoGet(key);
    if (hit !== undefined) return hit;
    const value = [
      ...this._aggAttendanceRemind(),
      ...this._aggInspectionRemind(),
      ...this._aggReviewRemind(),
      ...this._aggArchiveRemind(),
      ...this._aggAttendanceConfirm(),
      ...this._aggInspectionConfirm(),
      ...this._aggReviewConfirm(),
      ...this._aggArchiveConfirm(),
    ].filter(g => g.count > 0);
    return _memoSet(key, value);
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
      // IA-C1 Task2：实时组标注业务域（REALTIME_GROUP_DOMAIN 映射；供 T4 域折组归类展示）
      domain: REALTIME_GROUP_DOMAIN[actionKey] || WORK_DOMAIN.NONE,
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

  // ── 提醒类1：活动结束超录入提醒阈值且无考勤记录（天数=policy attendance.entryRemindDays） ──
  _aggAttendanceRemind() {
    const activities = loadActivities();
    const attendances = loadAttendanceRecords();
    const today = _today();
    // P1（2026-09-07 · spec §三.1）：预建 Map<activityId, records[]> 一次分组（O(A+R)），
    // 缺口查表 O(1)——替代原 attendances.some 逐活动全扫（O(A·R)）。等价：有无记录判定不变。
    const recordsByActivity = new Map();
    for (const r of attendances) {
      if (!r) continue;
      const k = r.activityId;
      if (!recordsByActivity.has(k)) recordsByActivity.set(k, []);
      recordsByActivity.get(k).push(r);
    }
    const hasRecords = (activityId) => {
      const bucket = recordsByActivity.get(activityId);
      return !!bucket && bucket.length > 0;
    };
    const gaps = activities.filter(a =>
      (a.status === 'completed' || a.archived) && a.date &&
      _daysBetween(a.date, today) > POLICY_DEFAULTS.attendance.entryRemindDays &&
      !hasRecords(a.id)
    );
    return this._mkGroup('attendance-remind', '考勤待录入', TodoCategory.REVIEW, TodoActionType.REVIEW,
      `活动结束>${POLICY_DEFAULTS.attendance.entryRemindDays}天未录入考勤 → 纪检确认 → 考勤总表`,
      gaps.map(a => ({
        id: a.id,
        activityId: a.id,
        name: a.title,
        date: a.date,
        deadline: _addDays(a.date, POLICY_DEFAULTS.attendance.summaryDeadlineDays),
      })),
      'remind');
  },

  // ── 提醒类2：考察记录超期未确认（> inspection.overdueDays 天，policy 单一源） ─────
  _aggInspectionRemind() {
    const overdue = getOverdueRecords();
    const items = overdue.map(r => ({
      id: r.id,
      inspectionId: r.id,
      name: (getPersonById(r.personId) || {}).name || r.personId,
      date: r.recordedAt ? r.recordedAt.slice(0, 10) : null,
      // 批4：deadline 引 policy 单一源（与纪检台超期判定同源，随域覆盖变化）
      deadline: _addDays(r.recordedAt ? r.recordedAt.slice(0, 10) : _today(), POLICY_DEFAULTS.inspection.overdueDays),
    }));
    return this._mkGroup('inspection-remind', '考察超期未确认', TodoCategory.REVIEW, TodoActionType.REVIEW,
      '纪检录入考察 → 确认 → 组织建档 → 人才库', items, 'remind');
  },

  // ── 提醒类3：活动结束 > review.overdueDays 天且无复盘（policy 单一源） ───────
  _aggReviewRemind() {
    const activities = loadActivities();
    const reviews = loadActivityReviews();
    const today = _today();
    const reviewedIds = new Set(reviews.map(r => r.activityId));
    const gaps = activities
      .filter(a => (a.status === 'completed' || a.archived) && a.date)
      .filter(a => _daysBetween(a.date, today) > POLICY_DEFAULTS.review.overdueDays)
      .filter(a => !reviewedIds.has(a.id));
    return this._mkGroup('review-remind', '复盘待提交', TodoCategory.SUBMIT, TodoActionType.SUBMIT,
      '活动完成 → 组织者提交复盘 → 纪检批注/确认',
      gaps.map(a => ({
        id: a.id,
        activityId: a.id,
        name: a.title,
        date: a.date,
        deadline: _addDays(a.date, POLICY_DEFAULTS.review.deadlineDays),
      })),
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
