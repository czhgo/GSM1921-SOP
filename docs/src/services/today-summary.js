// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  today-summary.js — 「今天」页今日聚合服务（R6-3，纯逻辑可测）
// ════════════════════════════════════════════════════════════════
// 数据同源派生（无第二份存储，办完即消失）：
//   - hasMeeting：activities.date===今天 且我"应到/参与"——
//       支部党员大会/党课/组织生活会/党小组会 复用 services/roster.js 应到口径
//       （党小组会按本人 partyGroup 组内党员）；列席积极分子/发展对象不计应到，
//       但该活动 assignments/signups(approved) 有他则计参与；
//       主题党日等非会类型活动仅按 assignments/signups 判参与。
//   - overdue/dueToday：TodoStore.getGroupedByAction(role) 平铺当前角色待办
//       （完成态由 getByRole 排除，口径同 todo-tab），按 deadline 划分：
//       < 今天 → overdue（逾期红标置顶露头）；=== 今天 → dueToday。
//   - myDuties：今天活动的 assignments[].personId===我（跨活动汇总）。
// 纯 ESM：仅依赖 mockDB / roster / todo（全部 node 可载，无 DOM）→ 单测直导。
// 时间口径：dateKey 由 now 按【本地时区】取 YYYY-MM-DD（勿用 toISOString——UTC 偏移跨日错位）。
// ════════════════════════════════════════════════════════════════

import { mockDB } from '../core/domain.js?v=20260903c';
import { getMeetingRosterIds, getEffectiveMembers } from './roster.js?v=20260903c';
import { TodoStore } from './todo.js?v=20260903c';

/** 按 roster 应到口径判定的会议类型（R6-3 书记裁定：今天有会 = 我应出席/参与） */
const ROSTER_MEETING_TYPES = new Set(['支部党员大会', '党课', '组织生活会', '党小组会']);

/** 本地时区 YYYY-MM-DD（pad 于 _fmtDate 同式；勿用 UTC 偏移错误） */
function _localDateKey(now) {
  const d = now instanceof Date ? now : new Date(now);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** 报名是否已生效（approved；与 visitor 参与待办口径一致，pending 未获批不计参与） */
function _approvedSignup(signups, activityId, personId) {
  return (signups || []).some(s =>
    s && s.sourceType === 'activity' && s.sourceId === activityId &&
    s.personId === personId && s.status === 'approved'
  );
}

/**
 * 今日聚合（六角色工作台「今天」tab 数据源；只读、返回项不含敏感字段）
 * @param {Object} params
 * @param {string} params.personId 当前登录人成员档案 id（如 p1/p13）
 * @param {string} params.role     待办角色键（TodoStore.getGroupedByAction 用；如 secretary/leader）
 * @param {Date}   [params.now]    可注入的"现在"（缺省=系统当前时间；测试注入固定日期）
 * @returns {{date:string, hasMeeting:Array, overdue:Array, dueToday:Array, myDuties:Array}}
 *   hasMeeting 项：{activityId, title, type, start}（start=活动 extras.time，无则 ''）
 *   overdue/dueToday 项：{id, title, deadline, action}（action=actionKey||actionType||''）
 *   myDuties 项：{activityId, activityTitle, role}
 */
export function buildTodaySummary({ personId, role, now = new Date() } = {}) {
  const dateKey = _localDateKey(now);
  const person = (getEffectiveMembers() || []).find(p => p.id === personId) || null;
  const branchId = person && person.branchId ? person.branchId : 'br-b1';

  const todayActs = (mockDB.activities || []).filter(a => a && a.date === dateKey);
  const signups = mockDB.signups || [];

  // ── 会（应到 roster 口径按 type+groupId 缓存；参与 = assignments/signups 命中）──
  const rosterCache = new Map();
  const rosterHit = (act) => {
    if (!person) return false;
    const isGroupMeeting = act.type === '党小组会';
    const groupId = isGroupMeeting ? (person.partyGroup || '') : undefined;
    const key = `${act.type}|${groupId || ''}`;
    if (!rosterCache.has(key)) {
      const ids = getMeetingRosterIds(isGroupMeeting
        ? { type: act.type, groupId, branchId }
        : { type: act.type, branchId });
      rosterCache.set(key, new Set(ids));
    }
    return rosterCache.get(key).has(personId);
  };
  const inAssignments = (act) =>
    Array.isArray(act.assignments) && act.assignments.some(x => x && x.personId === personId);

  const hasMeeting = [];
  const myDuties = [];
  for (const act of todayActs) {
    const attends = inAssignments(act)
      || _approvedSignup(signups, act.id, personId)
      || (ROSTER_MEETING_TYPES.has(act.type) && rosterHit(act));
    if (attends) {
      hasMeeting.push({
        activityId: act.id,
        title: act.title || '',
        type: act.type || '',
        start: (act.extras && act.extras.time) || '',
      });
    }
    if (Array.isArray(act.assignments)) {
      for (const x of act.assignments) {
        if (x && x.personId === personId) {
          myDuties.push({
            activityId: act.id,
            activityTitle: act.title || '',
            role: x.role || '',
          });
        }
      }
    }
  }

  // ── 到期/逾期：当前角色未完成待办按 deadline 划分（getGroupedByAction 平铺已完成已排除）──
  const overdue = [];
  const dueToday = [];
  const groups = TodoStore.getGroupedByAction(role) || [];
  for (const g of groups) {
    for (const t of g.items || []) {
      if (!t || !t.deadline) continue;
      const item = {
        id: t.id,
        title: t.title || '',
        deadline: t.deadline,
        action: t.actionKey || t.actionType || '',
      };
      if (t.deadline < dateKey) overdue.push(item);
      else if (t.deadline === dateKey) dueToday.push(item);
    }
  }
  const byDeadline = (a, b) => (a.deadline < b.deadline ? -1 : a.deadline > b.deadline ? 1
    : a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
  overdue.sort(byDeadline);
  dueToday.sort(byDeadline);

  return { date: dateKey, hasMeeting, overdue, dueToday, myDuties };
}
