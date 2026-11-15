// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  core/domain/todo-derive.js — 7 类实时待办组的**纯派生**叶子件（批次 534 · B-500-7b-1 Task 7）
//
//  为什么有本文件：这 7 类组此前散在各台 tab / 服务层里算（读 mockDB / localStorage / AuthStore），
//    服务端要复刻只能「照抄一份」，改口径要两处同改。本文件把它们收成**零业务依赖的纯函数**：
//    入参只有普通数据（members / records / activities / requests / grants / todos / today），
//    不读 DOM、不读 localStorage、不读 mockDB、不读会话；浏览器与 node 单测可直接 import。
//
//  零依赖边界（唯一允许的 import）：
//    · `constants.js`（`isActivityEnded` / `RESIDENCE`，自身只依赖 `base/date.js`，双端可载）
//    · `policy-defaults.js`（阈值单一源，双端可载）
//    · `base/date.js`（本地日历日口径 `R-26③`）
//    · `work-map.js` / `base/period.js`（模块周期判据的零依赖叶子件；批次 539 迁入既有三类时引入）
//  业务域键在此声明（7 键子集），`services/governance/todo.js::REALTIME_GROUP_DOMAIN` 由此展开，
//  不再各自维护一份映射。
//
//  施工单（Task 8）：服务端 `server/routes/todo-groups.js` 逐键改为 import 本文件同名函数，
//  入参从 DB 取同形数据；对账测试 `server/test/todo-derive-parity.test.mjs` 逐键判绿。
//  批次 539：既有三类（发展节点 / 半年考察 / 模块周期）与纪检确认队列一并迁入本文件，
//  `services/governance/todo.js` 只做再导出，服务端不再复刻。
// ════════════════════════════════════════════════════════════════

import { isActivityEnded, RESIDENCE } from './constants.js?v=20261110b';
import { POLICY_DEFAULTS } from './policy-defaults.js?v=20261110b';
import { todayLocal, _fmtDate } from '../base/date.js?v=20261110b';
// 模块周期单一源（零依赖叶子件；浏览器与 node 双端可载）
import { WORK_MAP_MODULES, expandWorkforce, ownerOfModule, moduleIdOfActivity } from './work-map.js?v=20261110b';
import { cyclePeriodLabel, cyclePeriodOf } from '../base/period.js?v=20261110b';

/** 7 键实时组 → 业务域（单一源；`services/governance/todo.js` 展开引用） */
export const DERIVE_GROUP_DOMAIN = {
  'attendance-remind': 'attendance',
  'inspection-remind': 'inspection',
  'resolution-followup-remind': 'report-up',
  'member-confirm': 'member-dev',
  'member-approve': 'member-dev',
  'semester-detained-remind': 'member-dev',
  'taskforce-authorize': 'project',
};

// ── 日期工具（与既有派生同口径：本地日历日 + 本地 setDate）──────────────────
/** 日期 + N 天（客户端既有口径：`new Date(str)` 本地解析；非法输入 → null） */
function _addDays(dateStr, days) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return null;
  d.setDate(d.getDate() + days);
  return _fmtDate(d);
}

/** 两日期相差天数（本地解析；非法输入 → NaN，调用方按「不命中」处理） */
function _daysBetween(dateStr1, dateStr2) {
  const d1 = new Date(dateStr1);
  const d2 = new Date(dateStr2);
  return Math.floor((d2 - d1) / (24 * 60 * 60 * 1000));
}

/**
 * 时间戳 / ISO 串 → **本地**日历日 `YYYY-MM-DD`（跨层正确性 1.2）。
 * 直接切 ISO 前 10 位取的是 UTC 日：本地 00:00–08:00 会落到前一天（半年划分随之错档）。
 * 已是 date-only 的串本身即日历日，原样返回；带时间的串经 `new Date` 本地口径格式化。
 * @param {string|null|undefined} value
 * @returns {string|null}
 */
function _localDayOf(value) {
  const raw = String(value || '').trim();
  if (!raw) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : _fmtDate(d);
}

/** 组内最早 deadline（与 `SecretaryTodoDeriver._mkGroup` 同口径；无 → null） */
function _earliestDeadline(items) {
  let deadline = null;
  for (const it of items) {
    if (it && it.deadline && (!deadline || it.deadline < deadline)) deadline = it.deadline;
  }
  return deadline;
}

/**
 * 「考勤待录入」实时组（域=考勤纪律；支书台/纪检台消费）。
 * 判据（与 `SecretaryTodoDeriver._aggAttendanceRemind` 逐条一致）：活动已结束 + 有日期 +
 *   非 `noAttendanceTypes` + 结束天数 > `entryRemindDays` + 无任何考勤记录。
 * @param {Object} opts
 * @param {Array} [opts.activities]        活动数组（读 id/title/date/type/status/archived）
 * @param {Array} [opts.attendanceRecords] 考勤记录（读 activityId）
 * @param {string} [opts.today]            日期键 YYYY-MM-DD（缺省=今天）
 * @param {Object} [opts.policy]           `POLICY_DEFAULTS.attendance` 覆盖
 * @param {string} [opts.groupKeyPrefix]   组键前缀（缺省 `secretary`）
 * @returns {Object|null} 无缺口 → null（不产生空组卡）
 */
export function deriveAttendanceRemindGroup({
  activities = [], attendanceRecords = [], today, policy = POLICY_DEFAULTS.attendance, groupKeyPrefix = 'secretary',
} = {}) {
  const day = today || todayLocal();
  const hasRecords = new Set();
  for (const r of attendanceRecords || []) {
    if (r && r.activityId) hasRecords.add(r.activityId);
  }
  const noAttendance = new Set(Array.isArray(policy.noAttendanceTypes) ? policy.noAttendanceTypes : []);
  const gaps = (activities || []).filter((a) => a
    && isActivityEnded(a)
    && a.date
    && !noAttendance.has(a.type)
    && _daysBetween(a.date, day) > policy.entryRemindDays
    && !hasRecords.has(a.id));
  const items = gaps.map((a) => ({
    id: a.id,
    activityId: a.id,
    name: a.title,
    date: a.date,
    deadline: _addDays(a.date, policy.summaryDeadlineDays),
  }));
  if (!items.length) return null;
  return {
    groupKey: `${groupKeyPrefix}:attendance-remind`,
    actionKey: 'attendance-remind',
    domain: DERIVE_GROUP_DOMAIN['attendance-remind'],
    title: '考勤待录入',
    category: 'review',
    actionType: 'review',
    flow: `活动结束>${policy.entryRemindDays}天未录入考勤 → 纪检确认 → 考勤明细`,
    kind: 'remind',
    deadline: _earliestDeadline(items),
    count: items.length,
    items,
  };
}

/**
 * 「考察超期未确认」实时组（域=考察）。
 * 判据（与 `inspection.js::getOverdueRecords` 递条一致）：`status === 'pending'`、未打回、
 *   录入距今 > `overdueDays` 天。
 * @param {Object} opts
 * @param {Array}  [opts.inspectionRecords] 考察记录（读 id/personId/recordedAt/status/returnedBy）
 * @param {Array}  [opts.persons]           人员档案（读 id/name；缺省 name 回退 personId）
 * @param {number} [opts.now]               当前毫秒时间戳（缺省 Date.now，可注入）
 * @param {string} [opts.today]             日期键（缺省=今天；仅用于缺 recordedAt 时的 deadline 基准）
 * @param {Object} [opts.policy]            `POLICY_DEFAULTS.inspection` 覆盖
 * @param {string} [opts.groupKeyPrefix]    组键前缀（缺省 `secretary`；组织台传 `org-commissioner`）
 * @returns {Object|null} 无超期 → null
 */
export function deriveInspectionRemindGroup({
  inspectionRecords = [], persons = [], now = Date.now(), today, policy = POLICY_DEFAULTS.inspection, groupKeyPrefix = 'secretary',
} = {}) {
  const day = today || todayLocal();
  const nameOf = new Map();
  for (const p of persons || []) {
    if (p && p.id) nameOf.set(p.id, p.name || p.id);
  }
  const threshold = policy.overdueDays * 24 * 60 * 60 * 1000;
  const overdue = (inspectionRecords || []).filter((r) => {
    if (!r || r.status !== 'pending') return false;
    if (r.returnedBy) return false; // 已打回：球在上传方一侧
    const t = new Date(r.recordedAt).getTime();
    return (now - t) > threshold;
  });
  const items = overdue.map((r) => {
    const date = _localDayOf(r.recordedAt);
    return {
      id: r.id,
      inspectionId: r.id,
      name: nameOf.get(r.personId) || r.personId,
      date,
      deadline: _addDays(date || day, policy.overdueDays),
    };
  });
  if (!items.length) return null;
  return {
    groupKey: `${groupKeyPrefix}:inspection-remind`,
    actionKey: 'inspection-remind',
    domain: DERIVE_GROUP_DOMAIN['inspection-remind'],
    title: '考察超期未确认',
    category: 'review',
    actionType: 'review',
    flow: '纪检录入考察 → 确认 → 组织建档 → 人才库',
    kind: 'remind',
    deadline: _earliestDeadline(items),
    count: items.length,
    items,
  };
}

/**
 * 收集全部逾期未落实的决议跟进项（纯：activities 数组入参）。
 * 逾期口径（单一源，与原 `resolution-followup.js::collectOverdueResolutionFollowups` 逐条一致）：
 *   议程项 `result === 'passed'`、跟进项未销项、`deadline < today`（到期当天不算逾期）。
 * @param {Array} activities 活动数组（读 agenda[].followups[]）
 * @param {string} today 日期键 YYYY-MM-DD
 * @returns {Array}
 */
export function collectOverdueResolutionFollowups(activities, today) {
  const out = [];
  for (const a of activities || []) {
    if (!a || !Array.isArray(a.agenda)) continue;
    for (const item of a.agenda) {
      if (!item || item.result !== 'passed' || !Array.isArray(item.followups)) continue;
      for (const f of item.followups) {
        if (!f || f.status === 'completed') continue;
        if (!f.deadline || f.deadline >= today) continue;
        out.push({
          id: `${a.id}:${item.id}:${f.id}`,
          activityId: a.id,
          activityTitle: a.title || a.id,
          agendaItemId: item.id,
          agendaItem: item.item,
          followupId: f.id,
          item: f.item,
          ownerType: f.ownerType,
          ownerId: f.ownerId,
          deadline: f.deadline,
          name: `落实「${f.item}」·${a.title || a.id}`,
          date: f.deadline,
        });
      }
    }
  }
  return out;
}

/**
 * 「决议落实逾期」实时组（域=上报与汇报；支书台消费）。
 * @param {Object} opts
 * @param {Array}  [opts.activities] 活动数组（含 agenda[].followups[]）
 * @param {string} [opts.today]      日期键（缺省=今天）
 * @param {string} [opts.groupKeyPrefix] 组键前缀（缺省 `secretary`）
 * @returns {Object|null} 无逾期 → null
 */
export function deriveResolutionFollowupRemindGroup({ activities = [], today, groupKeyPrefix = 'secretary' } = {}) {
  const day = today || todayLocal();
  const items = collectOverdueResolutionFollowups(activities, day);
  if (!items.length) return null;
  return {
    groupKey: `${groupKeyPrefix}:resolution-followup-remind`,
    actionKey: 'resolution-followup-remind',
    domain: DERIVE_GROUP_DOMAIN['resolution-followup-remind'],
    title: '决议落实逾期',
    category: 'track',
    actionType: 'track',
    flow: '支委会决议待落实 → 责任人执行 → 逾期支书督办销项',
    kind: 'remind',
    deadline: _earliestDeadline(items),
    count: items.length,
    items,
  };
}

/**
 * 「成员变更待确认」实时组（域=成员发展；支书台消费）。
 * 两条来源：`memberConfirmations`（名册报送，status=pending）+ `memberChangeRequests`（议程派生，
 *   status=pending-secretary）。**count 唯一口径＝`items.length`（名册报送行）**；
 *   议程派生行数只作展示补充 `agendaCount`（批量块由调用方渲染），不并入 count。
 * @param {Object} opts
 * @param {Array}  [opts.memberConfirmations]    名册报送确认队列
 * @param {Array}  [opts.memberChangeRequests]   议程派生成员变更申请
 * @param {string} [opts.groupKeyPrefix]         组键前缀（缺省 `secretary`）
 * @returns {Object|null} 两链皆空 → null
 */
export function deriveMemberConfirmGroup({
  memberConfirmations = [], memberChangeRequests = [], groupKeyPrefix = 'secretary',
} = {}) {
  const rosterItems = (memberConfirmations || []).filter((r) => r && r.status === 'pending');
  const agendaPending = (memberChangeRequests || []).filter((r) => r && r.status === 'pending-secretary');
  if (!rosterItems.length && !agendaPending.length) return null;
  return {
    groupKey: `${groupKeyPrefix}:member-confirm`,
    actionKey: 'member-confirm',
    domain: DERIVE_GROUP_DOMAIN['member-confirm'],
    title: '成员变更待确认',
    category: 'review',
    flow: '确认位唯一化（域内批量）：名册报送=支书确认生效/退回；议程派生（议程）审批通过项=支书确认更新阶段',
    kind: 'confirm',
    count: rosterItems.length,
    items: rosterItems,
    agendaCount: agendaPending.length,
    hideActionBtn: true,
  };
}

/**
 * 「成员变更待审批」实时组（域=成员发展；组织委员台消费）。
 * @param {Object} opts
 * @param {Array}  [opts.memberChangeRequests] 议程派生成员变更申请（取 status=pending-org-approval）
 * @param {string} [opts.groupKeyPrefix]       组键前缀（缺省 `org-commissioner`）
 * @returns {Object|null} 无待审批 → null
 */
export function deriveMemberApproveGroup({
  memberChangeRequests = [], groupKeyPrefix = 'org-commissioner',
} = {}) {
  const pending = (memberChangeRequests || []).filter((r) => r && r.status === 'pending-org-approval');
  if (!pending.length) return null;
  return {
    groupKey: `${groupKeyPrefix}:member-approve`,
    actionKey: 'member-approve',
    domain: DERIVE_GROUP_DOMAIN['member-approve'],
    title: '成员变更待审批',
    category: null,
    flow: '议程记录通过 → 组织委员审批（批量/逐项）→ 广播全体支委 → 支书确认更新阶段',
    count: pending.length,
    items: pending,
    hideActionBtn: true,
  };
}

/**
 * 学期末滞留复核窗口文案（如 `6/15–7/15、12/15–次年1/15`；单一源，原在 member-confirmation.js）。
 * @param {Array<[number,number,number,number]>} [windows]
 * @returns {string}
 */
export function semesterDetainedWindowsLabel(windows = POLICY_DEFAULTS.memberConfirmation.semesterDetainedWindows) {
  if (!Array.isArray(windows) || !windows.length) return '';
  return windows.map((w) => {
    if (!Array.isArray(w) || w.length !== 4) return '';
    const [sm, sd, em, ed] = w;
    const cross = (sm * 100 + sd) > (em * 100 + ed);
    return `${sm}/${sd}–${cross ? '次年' : ''}${em}/${ed}`;
  }).filter(Boolean).join('、');
}

/** 日期键是否落在任一复核窗内（跨年窗：止月<起月） */
export function inSemesterDetainedWindow(day, windows = POLICY_DEFAULTS.memberConfirmation.semesterDetainedWindows) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(day || ''));
  if (!m) return false;
  const md = Number(m[2]) * 100 + Number(m[3]);
  return Array.isArray(windows) && windows.some((w) => {
    if (!Array.isArray(w) || w.length !== 4) return false;
    const [sm, sd, em, ed] = w;
    const s = (sm * 100) + sd;
    const e = (em * 100) + ed;
    return s <= e ? (md >= s && md <= e) : (md >= s || md <= e);
  });
}

/**
 * 「学期末滞留集中复核」实时组（域=成员发展；支书台消费）。
 * 判据：今天落在复核窗内 且 存在居住状态=滞留的在册成员。
 * @param {Object} opts
 * @param {Array}  [opts.members] 成员档案（读 id/name/residenceStatus/residenceNote；缺省视为在校）
 * @param {string} [opts.today]   日期键（缺守=今天）
 * @param {Array}  [opts.windows] 复核窗（缺省=policy 单一源）
 * @param {string} [opts.groupKeyPrefix] 组键前缀（缺省 `secretary`）
 * @returns {Object|null} 窗口外或无滞留 → null
 */
export function deriveSemesterDetainedRemindGroup({
  members = [], today, windows = POLICY_DEFAULTS.memberConfirmation.semesterDetainedWindows, groupKeyPrefix = 'secretary',
} = {}) {
  const day = today || todayLocal();
  if (!inSemesterDetainedWindow(day, windows)) return null;
  const detained = (members || []).filter((p) => p && p.residenceStatus === RESIDENCE.DETAINED);
  if (!detained.length) return null;
  const items = detained.map((p) => ({
    id: p.id,
    name: p.name,
    note: p.residenceNote || '',
    date: '',
  }));
  return {
    groupKey: `${groupKeyPrefix}:semester-detained-remind`,
    actionKey: 'semester-detained-remind',
    domain: DERIVE_GROUP_DOMAIN['semester-detained-remind'],
    title: '学期末滞留集中复核',
    category: 'review',
    flow: `学期末窗口提醒（${semesterDetainedWindowsLabel(windows)}）：请集中复核在册滞留名单`,
    kind: 'remind',
    count: items.length,
    items,
  };
}

/**
 * 「专班赋权待办」实时组（域=项目；组织委员台）。
 * 口径：专班创建即派生一条**持久化**赋权待办（`todo.js::LifecycleTodoDeriver.deriveFromTaskforceCreate`，
 *   收件人=模块 `taskforce` 主责，缺省回退 `org-commissioner`）。本函数只做「按角色/到人取未完成行」的
 *   纯筛选与组装配，不改写口、不新建待办。
 * @param {Object} opts
 * @param {Array}  [opts.todos]   待办行（读 actionKey/status/role/personId/sourceId/…）
 * @param {string} [opts.role]   本台角色键
 * @param {string} [opts.personId] 本人 personId（到人行归属判定）
 * @param {string} [opts.groupKeyPrefix] 组键前缀（缺省 `org-commissioner`）
 * @returns {Object|null} 无未完成行 → null
 */
export function deriveTaskforceAuthorizeGroup({
  todos = [], role, personId, groupKeyPrefix = 'org-commissioner',
} = {}) {
  const items = (todos || []).filter((t) => {
    if (!t || t.actionKey !== 'taskforce-authorize') return false;
    if (t.status === 'completed') return false;
    if (t.personId) return String(t.personId) === String(personId || '');
    return !!role && t.role === role;
  });
  if (!items.length) return null;
  return {
    groupKey: `${groupKeyPrefix}:taskforce-authorize`,
    actionKey: 'taskforce-authorize',
    domain: DERIVE_GROUP_DOMAIN['taskforce-authorize'],
    title: '专班赋权待办',
    category: 'auth',
    actionType: 'authorize',
    flow: '专班创建 → 模块主责赋权 → 成员执行',
    kind: 'remind',
    deadline: _earliestDeadline(items),
    count: items.length,
    items,
  };
}

// ════════════════════════════════════════════════════════════════
//  既有三类（发展节点 / 半年考察 / 模块周期）——2026-11-09 批次 539 从
//  `services/governance/todo.js` 迁入；服务端与客户端同源 import，删除复刻。
// ════════════════════════════════════════════════════════════════

/** 日期 + N 天（'YYYY-MM-DD'，UTC 运算避免时区未同步；非法输入 → null）——与原 todo.js 口径逐字一致 */
function _addDaysByCalendarUtc(dateStr, days) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(dateStr || ''));
  if (!m) return null;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]) + Number(days)));
  return Number.isNaN(d.getTime()) ? null : _fmtDate(d);
}

/** 发展节点期满阈值（《发展党员工作细则》一年，制度裁决固定项；非可调参数） */
export const DEVELOP_NODE_THRESHOLDS = { '积极分子': 365, '预备党员': 365 };

/**
 * 派生组织委员「发展节点提醒」实时组（域=成员发展）。
 * @param {Object} opts
 * @param {Array} [opts.members]    成员档案（含 developStage）
 * @param {Object} [opts.overrides] 发展推进覆盖 { personId: { stage, entryDate } }（组织台同源）
 * @param {string} [opts.today]     日期键 YYYY-MM-DD（缺省=今天）
 * @returns {Object|null} 实时组；无期满成员 → null（不产生空组卡）
 */
export function buildDevelopNodeRemindGroup({ members = [], overrides = {}, today } = {}) {
  const day = today || todayLocal();
  const items = [];
  for (const p of members || []) {
    if (!p || !p.id) continue;
    const ov = overrides[p.id] || {};
    const stage = ov.stage || p.developStage;
    const days = DEVELOP_NODE_THRESHOLDS[stage];
    if (!days) continue;                       // 仅两类期满节点（发展对象/正式党员无期满动作）
    const entryDate = ov.entryDate || p.entryDate || null;
    if (!entryDate) continue;                  // 无阶段起始日期 → 不派生（避免误报）
    const dueDate = _addDaysByCalendarUtc(entryDate, days);
    if (!dueDate || dueDate > day) continue;   // 未满期
    items.push({
      id: `dev-${p.id}`,
      personId: p.id,
      name: p.name,
      stage,
      entryDate,
      dueDate,
      title: stage === '预备党员' ? `${p.name} 预备期满（应办转正）` : `${p.name} 培养考察期满（应转发展对象）`,
    });
  }
  if (!items.length) return null;
  return {
    groupKey: 'org-commissioner:develop-node-remind',
    actionKey: 'develop-node-remind',
    domain: 'member-dev',
    title: '发展节点提醒',
    flow: '发展阶段进入期满 → 组织委员办理下一节点（积极分子→发展对象 / 预备党员→转正）',
    count: items.length,
    items,
  };
}

/** 自然半年期键：'YYYY-H1'（01-01…06-30）/ 'YYYY-H2'（07-01…12-31）——制度固定，非可调参数 */
export function halfYearPeriodOf(dateStr) {
  const m = /^(\d{4})-(\d{2})/.exec(String(dateStr || ''));
  if (!m) return null;
  const month = Number(m[2]);
  if (month < 1 || month > 12) return null;
  return `${m[1]}-H${month <= 6 ? 1 : 2}`;
}

/**
 * 派生「半年考察提醒」实时组（域=成员发展；组织委员台消费）。
 * @param {Object} opts
 * @param {Array} [opts.members]    成员档案（含 developStage）
 * @param {Array} [opts.records]    考察记录（含 personId / recordedAt）
 * @param {Object} [opts.overrides] 发展推进覆盖 { personId: { stage, entryDate } }（组织台同源，取 stage）
 * @param {string} [opts.today]     日期键 YYYY-MM-DD（缺省=今天）
 * @returns {Object|null} 实时组；无应提醒成员 → null（不产生空组卡）
 */
export function buildHalfYearInspectionRemindGroup({ members = [], records = [], overrides = {}, today } = {}) {
  const day = today || todayLocal();
  const period = halfYearPeriodOf(day);
  if (!period) return null;
  const covered = new Set();
  for (const r of records || []) {
    if (!r || !r.personId) continue;
    if (halfYearPeriodOf(_localDayOf(r.recordedAt)) === period) covered.add(r.personId);
  }
  const items = [];
  for (const p of members || []) {
    if (!p || !p.id) continue;
    const stage = (overrides[p.id] || {}).stage || p.developStage;
    if (!DEVELOP_NODE_THRESHOLDS[stage]) continue;   // 只在培养考察期（积极分子 / 预备党员）内提醒
    if (covered.has(p.id)) continue;                 // 本半年已有考察记录 → 不提醒
    items.push({
      id: `halfyear-${p.id}`,
      personId: p.id,
      name: p.name,
      stage,
      period,
      title: `${p.name} · 本半年考察意见待更新`,
    });
  }
  if (!items.length) return null;
  return {
    groupKey: 'org-commissioner:half-year-inspection-remind',
    actionKey: 'half-year-inspection-remind',
    domain: 'member-dev',
    title: `半年考察提醒（${period}）`,
    flow: '考察意见半年一次（制度固定）→ 本半年内无考察记录 → 组织委员核对建档；考察记录的督办位仍在纪检台',
    count: items.length,
    items,
  };
}

/** 周期提醒实时组的 actionKey（组卡 / 域标注 / 判据共用一处） */
export const MODULE_CYCLE_ACTION_KEY = 'module-cycle-remind';

/**
 * 派生「本周期尚未开展」实时组（按模块周期；只列本主体主责的模块）。
 * @param {Object} opts
 * @param {Array}  [opts.activities] 全部活动（读 `type` / `date`；缺省＝[]）
 * @param {Array}  [opts.subjectIds]  本台主体集（角色键 / 组织型主体 id；如 `['leader']`）
 * @param {Record<string,{ownerType,ownerId}>|null} [opts.snapshot] 分工快照（缺省＝缺省分工兜底）
 * @param {Array}  [opts.modules]     模块表（缺省＝`WORK_MAP_MODULES`；仅供判据注入）
 * @param {string} [opts.today]       日期键 YYYY-MM-DD（缺省＝今天）
 * @returns {Object|null} 实时组；无「本期未开展」的模块 → null（不产生空组卡）
 */
export function buildModuleCycleRemindGroup({ activities = [], subjectIds = [], snapshot = null, today, modules = WORK_MAP_MODULES } = {}) {
  const ids = (Array.isArray(subjectIds) ? subjectIds : [subjectIds]).filter(Boolean);
  if (!ids.length) return null;
  // 快照接受「`config.workforce` 原样」或「`expandWorkforce` 展开后」——展开幂等，故一律再展开一次
  const snap = expandWorkforce(snapshot);
  const day = today || todayLocal();
  if (!/^\d{4}-\d{2}/.test(String(day))) return null;
  const items = [];
  for (const m of (modules || [])) {
    const cyc = m.cycle;
    if (!cyc || !cyc.unit) continue;                       // 无制度固定周期 ⇒ 不派生（如实登记）
    const owner = ownerOfModule(m.id, snap);
    if (!owner || !ids.includes(owner.ownerId)) continue;  // 非本主体主责 / 已停用 ⇒ 不派生
    const period = cyclePeriodOf(day, cyc.unit);
    if (!period) continue;
    const done = (activities || []).some((a) => {
      if (!a || moduleIdOfActivity(a) !== m.id) return false;
      const d = String(a.date || '').slice(0, 10);
      return !!d && cyclePeriodOf(d, cyc.unit) === period;
    });
    if (done) continue;
    items.push({
      id: `cycle-${m.id}-${period}`,
      moduleId: m.id,
      moduleName: m.name,
      period,
      ownerType: owner.ownerType,
      ownerId: owner.ownerId,
      title: `${cyclePeriodLabel(period, cyc.unit)}的「${m.name}」尚未开展`,
    });
  }
  if (!items.length) return null;
  return {
    groupKey: MODULE_CYCLE_ACTION_KEY,
    actionKey: MODULE_CYCLE_ACTION_KEY,
    domain: 'project',
    title: '本周期尚未开展（支部分工模块）',
    flow: '模块周期（母本可核者）→ 本期未见对应活动 → 主责人据此组织；不派任务、不改数据',
    count: items.length,
    items,
  };
}

// ════════════════════════════════════════════════════════════════
//  纪检确认队列（2026-11-09 批次 539）：原在 `entries/tabs/disc/todo-tab.js` 客户端算，
//  现收为纯函数（服务端派生 + mock 兜底共用），客户端只展示。
// ════════════════════════════════════════════════════════════════

/** 人员 id → 姓名（缺省回退 id） */
function _nameMapOf(persons) {
  const map = new Map();
  for (const p of persons || []) {
    if (p && p.id) map.set(p.id, p.name || p.id);
  }
  return map;
}

/**
 * 「考勤待确认」实时组（域=考勤纪律；纪检台消费）。
 * 判据（单一源 = `services/activity/attendance.js::isAttendancePendingConfirm`）：活跃活动 +
 *   未落确认人 + 非出勤/已补 + 非打回回退态。
 * @param {Object} opts
 * @param {Array}  [opts.activities]        活动数组（读 id/archived）
 * @param {Array}  [opts.attendanceRecords] 考勤记录（读 id/activityId/personId/status/confirmedBy/returnedBy）
 * @param {Array}  [opts.persons]           人员档案（读 id/name）
 * @param {string} [opts.groupKeyPrefix]    组键前缀（缺省 `disc-commissioner`）
 * @returns {Object|null} 无待确认 → null
 */
export function deriveAttendanceConfirmGroup({
  activities = [], attendanceRecords = [], persons = [], groupKeyPrefix = 'disc-commissioner',
} = {}) {
  const activeIds = new Set((activities || []).filter((a) => a && a.id && !a.archived).map((a) => a.id));
  const nameOf = _nameMapOf(persons);
  const items = (attendanceRecords || []).filter((r) => {
    if (!r || !r.activityId || !activeIds.has(r.activityId)) return false;
    if (r.confirmedBy) return false;                       // 已有确认人（含会议考勤录入即确认）
    if (r.returnedBy) return false;                        // 打回回退态交上传方
    return r.status !== 'present' && r.status !== 'made_up';
  }).map((r) => {
    const name = nameOf.get(r.personId) || r.personId || '';
    return {
      id: r.id,
      activityId: r.activityId,
      personId: r.personId,
      name,
      title: `确认考勤：${name}`,
      sourceType: 'activity',
      sourceId: r.activityId,
    };
  });
  if (!items.length) return null;
  return {
    groupKey: `${groupKeyPrefix}:attendance-confirm`,
    actionKey: 'attendance-confirm',
    domain: 'attendance',
    title: '考勤待确认',
    category: 'review',
    actionType: 'review',
    flow: '考勤上传 → 纪检确认 → 考勤明细',
    deadline: null,
    count: items.length,
    items,
  };
}

/**
 * 「考察待确认」实时组（域=考察；纪检台消费）。
 * 判据（单一源 = `entries/tabs/disc/todo-tab.js` 原实现）：活跃活动（专班类保留）+
 *   `status !== 'confirmed'` + 非打回回退态。
 * @param {Object} opts
 * @param {Array}  [opts.activities]        活动数组（读 id/archived）
 * @param {Array}  [opts.inspectionRecords] 考察记录（读 id/activityId/personId/sourceType/status/returnedBy）
 * @param {Array}  [opts.persons]           人员档案（读 id/name）
 * @param {string} [opts.groupKeyPrefix]    组键前缀（缺省 `disc-commissioner`）
 * @returns {Object|null} 无待确认 → null
 */
export function deriveInspectionConfirmGroup({
  activities = [], inspectionRecords = [], persons = [], groupKeyPrefix = 'disc-commissioner',
} = {}) {
  const activeIds = new Set((activities || []).filter((a) => a && a.id && !a.archived).map((a) => a.id));
  const nameOf = _nameMapOf(persons);
  const items = (inspectionRecords || []).filter((r) => {
    if (!r) return false;
    const active = r.sourceType === 'taskforce' || activeIds.has(r.activityId);
    if (!active) return false;
    return r.status !== 'confirmed' && !r.returnedBy;
  }).map((r) => {
    const name = nameOf.get(r.personId) || r.personId || '';
    return {
      id: r.id,
      activityId: r.activityId || '',
      personId: r.personId,
      name,
      title: `确认考察：${name}`,
      // 来源类型**透传**（批次 541 · D-3）：专班考察 `sourceType='taskforce'` 原被压成 'activity'，
      //   跳转层据此走活动详情 ⇒ 专班考察的去处错位。落点 id 优先活动，其次记录自带 sourceId，
      //   再退专班 id（专班考察记录 `activityId: null`，只有 workgroupId/taskforceId 快照）。
      sourceType: r.sourceType || 'activity',
      sourceId: r.activityId || r.sourceId || r.taskforceId || r.workgroupId || null,
    };
  });
  if (!items.length) return null;
  return {
    groupKey: `${groupKeyPrefix}:inspection-confirm`,
    actionKey: 'inspection-confirm',
    domain: 'inspection',
    title: '考察待确认',
    category: 'review',
    actionType: 'review',
    flow: '纪检录入考察 → 纪检确认 → 组织建档',
    deadline: null,
    count: items.length,
    items,
  };
}
