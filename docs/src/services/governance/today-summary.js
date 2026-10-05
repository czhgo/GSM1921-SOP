// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  today-summary.js — 「今天」页今日聚合服务（R6-3，纯逻辑可测）
// ════════════════════════════════════════════════════════════════
// 数据同源派生（无第二份存储，办完即消失）：
//   - hasMeeting：activities.date===今天 且我"应到/参与"——
//       支部党员大会/党课/组织生活会/党小组会 复用 services/member/roster.js 应到口径
//       （党小组会按本人 partyGroup 组内党员）；列席积极分子/发展对象不计应到，
//       但该活动 assignments/signups(approved) 有他则计参与；
//       主题党日等非会类型活动仅按 assignments/signups 判参与。
//   - overdue/dueToday：TodoStore.getGroupedByAction(role) 平铺当前角色待办
//       （完成态由 getByRole 排除，口径同 todo-tab），按 deadline 划分：
//       < 今天 → overdue（逾期红标置顶露头）；=== 今天 → dueToday。
//   - myDuties：今天活动的 assignments[].personId===我（跨活动汇总）。
// 纯 ESM：仅依赖 mockDB / roster / todo / version-token / org-base-data-preview
// （全部 node 可载，无 DOM）→ 单测直导。
// 时间口径：dateKey 由 now 按【本地时区】取 YYYY-MM-DD（勿用 toISOString——UTC 偏移跨日错位）。
// ════════════════════════════════════════════════════════════════

import { mockDB } from '../../core/domain/domain.js?v=20261005c';
import { getMeetingRosterIds, getEffectiveMembers, RESIDENCE_KEY } from '../member/roster.js?v=20261005c';
import { TodoStore, TodoActionType, inferDomain, WORK_DOMAIN_LABELS } from './todo.js?v=20261005c';
// 待批活动的可见性单一源（2026-09-22 批次 151 · 支书裁定「只支委层可见」）：「今天」的今日会议/我的分工
// 同样按查看者角色收窄——待批活动不进非支委层的今日摘要（与各台列表同一判据）。
import { filterActivitiesForViewer } from '../core/visibility.js?v=20261005c';
import { tokenOf } from '../../core/base/version-token.js?v=20261005c'; // P1 消费方会话缓存失效（spec §三.4）
// 成员基础数据预览键（仅作 raw 源指纹；person.js 读链叠加预览，见 org-base-data-preview）
import { PREVIEW_KEY } from '../branch/org-base-data-preview.js?v=20261005c';

/** 按 roster 应到口径判定的会议类型（R6-3 支书 2026-09-06 裁定：今天有会 = 我应出席/参与） */
const ROSTER_MEETING_TYPES = new Set(['支部党员大会', '党课', '组织生活会', '党小组会']);

/** 本地时区日期键 + n 天（纯字符串/Date 运算；用于「近期安排」窗口上界） */
function _addDays(dateKey, n) {
  const m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(String(dateKey || ''));
  if (!m) return dateKey;
  const d = new Date(+m[1], +m[2] - 1, +m[3] + n);
  const pad = (x) => String(x).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** 本地时区 YYYY-MM-DD（pad 于 _fmtDate 同式；勿用 UTC 偏移错误） */
function _localDateKey(now) {
  const d = now instanceof Date ? now : new Date(now);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// ════════════════════════════════════════════════════════════════
//  P1 消费方会话缓存（spec §三.4）：roster.getEffectiveMembers（roster.js 禁改不内改）
//  在消费方做模块级缓存——getEffectiveMembers 每次 = 2 次 localStorage.parse + 全成员
//  overlay/预览合并（O(n) 对象重建），聚合链内同源多次重扫成本集中在此消除。
//  失效键 = member 写版本 tokenOf('member')（PersonStore.saveMember 等写口已 bump，P0）
//  + 未随 token 失效的两项 localStorage 源 raw 串（滞留覆盖 RESIDENCE_KEY / 基础数据预览
//  PREVIEW_KEY——其写口 roster.saveResidenceChange / org-base-data-preview 不在 bump 链上 →
//  raw 内容比对防陈旧命中，杜绝"预览/备注改了应到名单仍旧"）。raw getItem 无 JSON.parse/无
//  O(n) 重建，命中代价可忽略。⚠️ 缓存返回只读引用：调用方仅读（buildTodaySummary 只 find）。
//  跨页会话：页面重载模块实例重建 → 缓存自然清空，无跨页陈旧。
let _effMembersCacheKey = null;
let _effMembersCache = null;

function _rawStorage(key) {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage.getItem(key);
  } catch (_) { return null; }
}

/** getEffectiveMembers()（无 branchId）会话缓存读：键变才重算 */
function _cachedEffectiveMembers() {
  const key = `${tokenOf('member')}|${_rawStorage(RESIDENCE_KEY) || ''}|${_rawStorage(PREVIEW_KEY) || ''}`;
  if (_effMembersCacheKey !== key) {
    _effMembersCacheKey = key;
    _effMembersCache = getEffectiveMembers() || [];
  }
  return _effMembersCache;
}

/**
 * P1 报名索引（spec §三.3）：一次分组 sourceId → signups[]（仅 activity 源 + approved——
 * 唯一会被查询的命中面），消除 _approvedSignup 逐活动 .some 全表（O(A·S)→O(S+A)）。
 * 索引键 = sourceId 原始值（保持与旧 .some 的严格 === 判定一致），等价见 approvedSignupHit。
 * @param {Array} [signups]
 * @returns {Map<*, Array>} sourceId → 该活动 approved 报名数组
 */
export function buildApprovedSignupIndex(signups) {
  const index = new Map();
  for (const s of signups || []) {
    if (!s || s.sourceType !== 'activity' || s.status !== 'approved') continue;
    const k = s.sourceId;
    if (!index.has(k)) index.set(k, []);
    index.get(k).push(s);
  }
  return index;
}

/** 报名是否已生效（等价旧 .some 判定：activity 源 + sourceId 命中 + approved + 同人；见 buildApprovedSignupIndex） */
export function approvedSignupHit(index, activityId, personId) {
  const bucket = index.get(activityId);
  if (!bucket || bucket.length === 0) return false;
  return bucket.some(s => s && s.personId === personId);
}

/** 动作性质七类的**组序**（唯一源）：审核 → 提交 → 赋权 → 参与 → 归档 → 阅读 → 追踪。
 *  2026-10-01 批次 320 立；批次 329 提升为**导出**（「今天」页左卡分组与本节自用同源，不再各留一份）。 */
export const TODO_ACTION_ORDER = [
  TodoActionType.REVIEW, TodoActionType.SUBMIT, TodoActionType.AUTHORIZE,
  TodoActionType.PARTICIPATE, TodoActionType.ARCHIVE, TodoActionType.READ, TodoActionType.TRACK,
];
/** 七类动作性质的**中文组名**（唯一源，与 `TODO_ACTION_ORDER` 同源） */
export const TODO_ACTION_LABELS = {
  review: '审核', submit: '提交', authorize: '赋权',
  participate: '参与', archive: '归档', read: '阅读', track: '追踪',
};

/**
 * 今日聚合（六角色工作台「今天」tab 数据源；只读、返回项不含敏感字段）
 * @param {Object} params
 * @param {string} params.personId 当前登录人成员档案 id（如 p1/p13）
 * @param {string} params.role     待办角色键（TodoStore.getGroupedByAction 用；如 secretary/leader）
 * @param {Date}   [params.now]    可注入的"现在"（缺省=系统当前时间；测试注入固定日期）
 * @returns {{date:string, hasMeeting:Array, overdue:Array, dueToday:Array, myDuties:Array, todoSummary:{total:number,overdue:number,dueToday:number}, byAction:Array, upcoming:Array}}
 *   **byAction**（2026-10-01 批次 320 立）：按**动作性质**分组的在办待办
 *     `[{actionType, label, count, items:[{id,title,deadline,domain,domainLabel}]}]`——只含非空组，
 *     组序＝ACTION_ORDER（审核 → 提交 → 赋权 → 参与 → 归档 → 阅读 → 追踪），组内截止升序、无截止殿后。
 *     单一源：`TodoActionType` / `inferDomain` / `WORK_DOMAIN_LABELS`（services/governance/todo.js）。
 *   hasMeeting 项：{activityId, title, type, start}（start=活动 extras.time，无则 ''）
 *   overdue/dueToday 项：{id, title, deadline, action}（action=actionKey||actionType||''）
 *   myDuties 项：{activityId, activityTitle, role}
 *   todoSummary：本岗未完成待办摘要（total=总数含无截止项；overdue/dueToday=按 deadline 划分）
 *   upcoming 项：{activityId, title, type, start, date}（未来 7 天，不含今天；按日期+时间升序）
 */
export function buildTodaySummary({ personId, role, now = new Date() } = {}) {
  const dateKey = _localDateKey(now);
  // P1：getEffectiveMembers 会话缓存读（键=member token + 覆盖/预览 raw 源；见 _cachedEffectiveMembers）
  const person = _cachedEffectiveMembers().find(p => p.id === personId) || null;
  const branchId = person && person.branchId ? person.branchId : 'br-b1';

  const todayActs = filterActivitiesForViewer(mockDB.activities, role).filter(a => a && a.date === dateKey);
  // 批次 358（`D-751`）：报名「作废（软）」的条目不参与「是否算参与」的判定（与 `SignupStore.getAll()` 同口径）
  const signups = (mockDB.signups || []).filter((s) => !s.voided);
  // P1：报名 (sourceType|sourceId) 预索引一次（当天多活动/多次判定复用；等价旧 .some，见 buildApprovedSignupIndex）
  const signupsIndex = buildApprovedSignupIndex(signups);

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
      || approvedSignupHit(signupsIndex, act.id, personId)
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

  // S4（2026-09-12）：「今天」落点注入本岗待办摘要（含逾期/到期/待办数，使无截止的挂起待办
  // 也能在今天露头并可直达待办；total 与待办 tab 同源 getByRole——已排除 completed，含无 deadline 项）。
  const todoSummary = {
    total: (TodoStore.getByRole(role) || []).length,
    overdue: overdue.length,
    dueToday: dueToday.length,
  };

  // ── 按**动作性质**分组的在办待办（2026-10-01 批次 320 · 支书裁定「甲：直接用 TodoActionType 七类」）──
  //   **为什么立**：支书评今天页「信息量居然这么少…**这个第一次进入的界面居然只是一个花瓶**」⇒ 首屏
  //   必须把**我要做的事**按**动作性质**摊开，而不是只给一行「本岗待办 合计 N」。
  //   ⚠ **不新造分类**：`TodoActionType`（七类动作性质）· `inferDomain` · `WORK_DOMAIN_LABELS`（九业务域）
  //   全是既有单一源（`services/governance/todo.js`）——支书原话「我提的工作类型更多想说的是
  //   **审核类、提交类、表决类** 等等」正是 `actionType` 这一层；**九业务域降为行内小胶囊**。
  //   **口径**：与 overdue/dueToday 吃**同一份** `groups`（`getGroupedByAction`）⇒ 不新增取数；
  //   **含无截止项**（挂起待办的大多数，旧版只统计不列示 ⇒ 正是「信息量少」的根源之一）。
  const ACTION_ORDER = TODO_ACTION_ORDER;
  const ACTION_LABELS = TODO_ACTION_LABELS;
  const byAction = [];
  {
    const buckets = new Map(ACTION_ORDER.map((k) => [k, []]));
    for (const g of groups) {
      const at = ACTION_ORDER.includes(g.actionType) ? g.actionType : TodoActionType.TRACK;
      for (const t of g.items || []) {
        if (!t) continue;
        const d = inferDomain(t);
        buckets.get(at).push({
          id: t.id,
          title: t.title || '',
          deadline: t.deadline || '',
          domain: d,
          domainLabel: WORK_DOMAIN_LABELS[d] || '',
        });
      }
    }
    // 组内：截止升序，**无截止者殿后**（挂起项不抢占紧迫位）
    const loose = (a, b) => {
      const ad = a.deadline || '9999-12-31', bd = b.deadline || '9999-12-31';
      return ad < bd ? -1 : ad > bd ? 1 : (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
    };
    for (const k of ACTION_ORDER) {
      const items = buckets.get(k);
      if (!items.length) continue;                 // 空组不出现（空维度不占位，同检索条口径）
      items.sort(loose);
      byAction.push({ actionType: k, label: ACTION_LABELS[k], count: items.length, items });
    }
  }

  // ── 近期安排（2026-09-30 批次 299，支书裁「未来 7 天」）──────────────────────────
  //   本支部近 7 日（**不含今天**，今天另由 hasMeeting 承载）可见活动，按日期 + 时间升序。
  //   口径 = 与今日会议同一可见性单一源（filterActivitiesForViewer）；**只读列示**，点击进活动详情。
  const upcoming = [];
  const windowEnd = _addDays(dateKey, 7);
  for (const act of filterActivitiesForViewer(mockDB.activities, role)) {
    if (!act || !act.date) continue;
    if (act.date <= dateKey || act.date > windowEnd) continue;
    upcoming.push({
      activityId: act.id,
      title: act.title || '',
      type: act.type || '',
      start: (act.extras && act.extras.time) || '',
      date: act.date,
    });
  }
  upcoming.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1
    : a.start < b.start ? -1 : a.start > b.start ? 1 : 0));

  return { date: dateKey, hasMeeting, overdue, dueToday, myDuties, todoSummary, byAction, upcoming };
}
