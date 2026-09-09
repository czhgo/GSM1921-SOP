// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  services/resolution-followup.js — 决议「待落实」跟进子域（附录⑩ S2 R2-2，2026-09-06 书记批）
//  落点：决议 = 议程项 result:'passed'（活动.agenda[]，recordAgendaResult 写入）；本子域把
//  每条决议的「待落实」项存为该议程项的 followups[] 子数组（轻量并入决议结果对象，不新增顶层域）。
//  闭环：记录决议后在同一决议视图勾选待落实（事项/责任人/时限）→ saveFollowups 落库并派生
//  责任人跟进待办（其工作台待办=到期当天即见、逾期自动 expired，即「到期催办」）→ 逾期经
//  书记台待办页「决议落实逾期」提醒组督办（collectOverdueResolutionFollowups 纯函数扫描，即
//  「逾期进书记待办」）→ 书记在决议视图销项/恢复，闭环销账。
//  责任人口径：ownerType 'role' = 支委角色（deputy-secretary 归书记台 secretary 键）；
//  'person' = 到人（participant 归 visitor 键——与 VisitorTodoDeriver 聚合键一致，见 todo.js 注释）。
//  跟进待办采用 sourceType ACTIVITY + sourceId 活动号：复用 LifecycleTodoDeriver.deleteByActivity
//  的活动删除联动（活动删除不残留孤儿待办）；以 actionKey 'resolution-followup' 与活动赋权等
//  其它同源待办区分（待办聚合键 = role + actionKey，见 TodoStore.getGroupedByAction）。
//  BOM/纯 ESM 零依赖 DOM；扫描/派生为纯函数（activities 数组入参），供 node 单测与书记台聚合共用。
// ════════════════════════════════════════════════════════════════

import { generateId } from '../core/id.js?v=20260909e';
import { mockDB } from '../core/domain.js?v=20260909e';
import { bumpToken, tokenOf } from '../core/version-token.js?v=20260909e'; // P0 域缓存失效（spec §二.3/§二.4）
import {
  TodoStore, TodoStatus, TodoCategory, TodoActionType, TodoSourceType, REALTIME_GROUP_DOMAIN,
} from './todo.js?v=20260909e';
import { BranchService } from './runtime.js?v=20260909e';
import { loadActivities } from './activity.js?v=20260909e';
import { PersonStore } from './person.js?v=20260909e';
import { ROLE_LABELS } from '../core/constants.js?v=20260909e';

/** 待落实跟进状态 */
export const FOLLOWUP_STATUS = {
  PENDING: 'pending',       // 待落实
  COMPLETED: 'completed',   // 已落实（书记销项）
};

/** 跟进待办聚合 actionKey（与活动赋权/归档等其它 ACTIVITY 源待办区分） */
export const RESOLUTION_FOLLOWUP_ACTION_KEY = 'resolution-followup';

// ════════════════════════════════════════════════════════════════
//  展示与角色映射（纯）
// ════════════════════════════════════════════════════════════════

/** 责任人显示名（role → 角色标签；person → 成员姓名） */
export function ownerLabelOf(followup) {
  if (!followup) return '未知';
  if (followup.ownerType === 'person') {
    const p = PersonStore.getAll().find((x) => x.id === followup.ownerId);
    return p ? (p.name || followup.ownerId) : followup.ownerId;
  }
  return ROLE_LABELS[followup.ownerId] || followup.ownerId;
}

/** 跟进待办归属的角色键：到人取其角色（participant → visitor 键）；到角色直接映射（deputy 归 secretary） */
export function todoRoleOf(followup) {
  if (!followup || !followup.ownerId) return 'visitor';
  if (followup.ownerType === 'person') {
    const p = PersonStore.getAll().find((x) => x.id === followup.ownerId);
    const role = p ? p.role : null;
    if (!role || role === 'participant') return 'visitor';
    return role === 'deputy-secretary' ? 'secretary' : role;
  }
  return followup.ownerId === 'deputy-secretary' ? 'secretary' : followup.ownerId;
}

// ════════════════════════════════════════════════════════════════
//  跟进待办派生（纯：入参不含存储）
// ════════════════════════════════════════════════════════════════

/** 单条待落实 → 责任人跟进待办负载（已销项/缺项返回 null） */
export function buildFollowupTodoPayload({ activity, agendaItem, followup }) {
  if (!followup || !activity || !agendaItem) return null;
  if (followup.status === FOLLOWUP_STATUS.COMPLETED) return null;
  if (!followup.item || !followup.deadline) return null;
  return {
    title: `落实决议：${followup.item}`,
    description: `决议「${agendaItem.item}」${activity.date ? `（${activity.date} 会议）` : ''}待落实。`
      + `责任人：${ownerLabelOf(followup)}；请按时完成，完成后由书记在决议记录视图销项。`,
    role: todoRoleOf(followup),
    personId: followup.ownerType === 'person' ? followup.ownerId : null,
    category: TodoCategory.TRACK,
    priority: 'normal',
    status: TodoStatus.PENDING,
    deadline: followup.deadline,
    sourceType: TodoSourceType.ACTIVITY, // 复用活动生命周期联动（活动删除即清），见文件头注释
    sourceId: activity.id,
    actionType: TodoActionType.TRACK,
    actionKey: RESOLUTION_FOLLOWUP_ACTION_KEY,
    actionData: { activityId: activity.id, agendaItemId: agendaItem.id, followupId: followup.id },
    flow: '决议待落实 → 责任人执行 → 书记销项',
  };
}

/** 某条决议的全部「待落实」待办负载（仅待落实态；纯函数） */
export function buildFollowupTodoPayloads({ activity, agendaItem }) {
  if (!activity || !agendaItem || !Array.isArray(agendaItem.followups)) return [];
  return agendaItem.followups
    .map((f) => buildFollowupTodoPayload({ activity, agendaItem, followup: f }))
    .filter(Boolean);
}

// ════════════════════════════════════════════════════════════════
//  落库与派生存储函数（浏览器/Node 双端可跑：BranchService 本地 mockDB）
// ════════════════════════════════════════════════════════════════

/** 规范化待落实行（补 id/时间戳；过滤无效行） */
function _cleanRows(followups, actorId, now) {
  const valid = (Array.isArray(followups) ? followups : []).filter((f) =>
    f && String(f.item || '').trim() && f.ownerType && f.ownerId && String(f.deadline || '').slice(0, 10));
  return valid.map((f) => {
    const completed = f.status === FOLLOWUP_STATUS.COMPLETED || f._completed === true;
    return {
      id: f.id || generateId('fu_'),
      item: String(f.item).trim(),
      ownerType: f.ownerType,
      ownerId: f.ownerId,
      deadline: String(f.deadline).slice(0, 10),
      status: completed ? FOLLOWUP_STATUS.COMPLETED : FOLLOWUP_STATUS.PENDING,
      createdAt: f.createdAt || now,
      completedAt: completed ? (f.completedAt || now) : null,
      completedBy: completed ? (f.completedBy || actorId) : null,
    };
  });
}

/** 读活动 + 定位议程项（找不到抛错） */
async function _loadActivityItem(activityId, agendaItemId) {
  const acts = await BranchService.listActivities();
  const act = acts.find((a) => a.id === activityId);
  if (!act) throw new Error('活动不存在或已删除');
  const item = (act.agenda || []).find((i) => i.id === agendaItemId);
  if (!item) throw new Error('议程项不存在');
  return { act, item };
}

/** 写回议程项（immutable patch 落库，返回更新后的活动） */
async function _persistItem(activityId, agendaItemId, patchFn) {
  const { act, item } = await _loadActivityItem(activityId, agendaItemId);
  const nextItem = patchFn(item);
  const agenda = (act.agenda || []).map((i) => (i.id === agendaItemId ? nextItem : i));
  return BranchService.updateActivity(activityId, { agenda });
}

/** 删除某条决议的既有（未销项）跟进待办，随后按当前清单重建（保证增删改时限后一致） */
function _resyncTodos(activity, agendaItemId) {
  const item = (activity.agenda || []).find((i) => i.id === agendaItemId) || {};
  const stale = TodoStore.getAll().filter((t) =>
    t.sourceType === TodoSourceType.ACTIVITY
    && t.sourceId === activity.id
    && t.actionKey === RESOLUTION_FOLLOWUP_ACTION_KEY
    && t.actionData && t.actionData.agendaItemId === agendaItemId
    && t.status !== TodoStatus.COMPLETED
  );
  stale.forEach((t) => TodoStore.delete(t.id));
  return TodoStore.createBatch(buildFollowupTodoPayloads({ activity, agendaItem: item }));
}

/** 查某条待落实对应的未销项跟进待办 */
function _openTodoOf(activityId, followupId) {
  return TodoStore.getAll().find((t) =>
    t.sourceType === TodoSourceType.ACTIVITY
    && t.sourceId === activityId
    && t.actionKey === RESOLUTION_FOLLOWUP_ACTION_KEY
    && t.actionData && t.actionData.followupId === followupId
    && t.status !== TodoStatus.COMPLETED
  ) || null;
}

/**
 * 保存某条决议的「待落实」清单（整组替换：记录决议后勾选保存 / 增删改行共用）
 * @param {{ activityId:string, agendaItemId:string, followups:Array, actorId?:string|null }} params
 * @returns {Promise<Object>} 更新后的活动
 */
export async function saveFollowups({ activityId, agendaItemId, followups, actorId = null, now = new Date().toISOString() }) {
  const { act } = await _loadActivityItem(activityId, agendaItemId);
  const clean = _cleanRows(followups, actorId, now);
  const updated = await _persistItem(activityId, agendaItemId, (item) => ({ ...item, followups: clean }));
  _resyncTodos(updated, agendaItemId);
  bumpToken('resolution'); // P0：决议跟进写口 bump（决议=活动 agenda 内嵌；saveFollowups 整组替换）
  return updated;
}

/** 销项（书记在决议视图确认「已落实」）：议程行标 completed + 责任人跟进待办销账 */
export async function completeFollowup({ activityId, agendaItemId, followupId, actorId = null, now = new Date().toISOString() }) {
  const updated = await _persistItem(activityId, agendaItemId, (item) => ({
    ...item,
    followups: (item.followups || []).map((f) => (f.id === followupId
      ? { ...f, status: FOLLOWUP_STATUS.COMPLETED, completedAt: now, completedBy: actorId }
      : f)),
  }));
  const todo = _openTodoOf(activityId, followupId);
  if (todo) TodoStore.update(todo.id, { status: TodoStatus.COMPLETED, completedAt: now });
  bumpToken('resolution'); // P0：决议跟进写口 bump（销项）
  return updated;
}

/** 恢复为待落实（误销项可回退）：议程行回 pending + 补建责任人跟进待办 */
export async function reopenFollowup({ activityId, agendaItemId, followupId, actorId = null }) {
  const updated = await _persistItem(activityId, agendaItemId, (item) => ({
    ...item,
    followups: (item.followups || []).map((f) => (f.id === followupId
      ? { ...f, status: FOLLOWUP_STATUS.PENDING, completedAt: null, completedBy: null }
      : f)),
  }));
  const item = (updated.agenda || []).find((i) => i.id === agendaItemId) || {};
  const fu = (item.followups || []).find((f) => f.id === followupId);
  const payload = buildFollowupTodoPayload({ activity: updated, agendaItem: item, followup: fu });
  if (payload && !_openTodoOf(activityId, followupId)) TodoStore.create(payload);
  bumpToken('resolution'); // P0：决议跟进写口 bump（恢复待落实）
  return updated;
}

// ════════════════════════════════════════════════════════════════
//  逾期扫描（纯：activities 数组入参；供书记台聚合与 node 单测）
//  逾期口径 = 未销项且 deadline < today（到期当天仍属「到期催办」窗口，不算逾期）
// ════════════════════════════════════════════════════════════════

/** 收集全部逾期未落实的决议跟进项 */
export function collectOverdueResolutionFollowups(activities, today) {
  const out = [];
  for (const a of activities || []) {
    if (!a || !Array.isArray(a.agenda)) continue;
    for (const item of a.agenda) {
      if (!item || item.result !== 'passed' || !Array.isArray(item.followups)) continue;
      for (const f of item.followups) {
        if (!f || f.status === FOLLOWUP_STATUS.COMPLETED) continue;
        if (!f.deadline || f.deadline >= today) continue; // 仅逾期；到期当天由责任人待办呈现
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
          // 书记台提醒卡展示字段（对齐 SecretaryTodoDeriver remind 组：name + date）
          name: `落实「${f.item}」·${a.title || a.id}`,
          date: f.deadline,
        });
      }
    }
  }
  return out;
}

/** 组装书记台「决议落实逾期」提醒组（无逾期返回 null；renderTodoList 直接可渲染） */
export function buildOverdueRemindGroup(activities, today) {
  const items = collectOverdueResolutionFollowups(activities, today);
  if (items.length === 0) return null;
  let earliest = null;
  for (const it of items) {
    if (!earliest || it.deadline < earliest) earliest = it.deadline;
  }
  return {
    groupKey: 'secretary:resolution-followup-remind',
    actionKey: 'resolution-followup-remind',
    // IA-C1 Task2：实时组标注业务域（决议上报；供 T4 域折组归类展示）
    domain: REALTIME_GROUP_DOMAIN['resolution-followup-remind'],
    title: '决议落实逾期',
    category: TodoCategory.TRACK,
    actionType: TodoActionType.TRACK,
    flow: '支委会决议待落实 → 责任人执行 → 逾期书记督办销项',
    kind: 'remind',
    deadline: earliest,
    count: items.length,
    items,
  };
}

/** 供书记台聚合的现读入口（mockDB/种子活动都吃；未逾期返回 null）。
 *  P0（2026-09-07 · spec §二.4）：复合键 = tokenOf('activity') + activities 长度 +
 *  tokenOf('resolution') + 日期 —— 未变返回上次结果（⚠️ 返回对象只读契约，调用方仅读）；
 *  变化经写口 bump（mock.js 活动写口 / 本文件 resolution 写口）或源数组长度指纹触发重算。 */
const _overdueMemo = new Map();
export function buildOverdueRemindGroupNow() {
  const day = new Date().toISOString().slice(0, 10);
  const key = `${tokenOf('activity')}:${mockDB.activities.length}:${tokenOf('resolution')}:${day}`;
  if (_overdueMemo.has(key)) return _overdueMemo.get(key);
  const value = buildOverdueRemindGroup(loadActivities(), day);
  if (_overdueMemo.size > 24) _overdueMemo.clear();
  _overdueMemo.set(key, value);
  return value;
}
