﻿﻿﻿﻿// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  service.signup.js — 报名记录（活动/专班统一报名渠道）
//  SignupRecord { id, sourceType: 'activity'|'taskforce', sourceId,
//                 personId, role: 'participant'|'organizer'|'deep',
//                 status: 'approved'|'pending'|'rejected'|'cancelled',
//                 createdAt, reviewedBy, reviewedAt, note }
//  分级审批：participant = 报名即加入（auto approved）；
//            organizer/deep = 报名 + 发起人审核（pending → 通过/拒绝）。
// ════════════════════════════════════════════════════════════════

import { mockDB } from '../core/domain.js?v=20260812b';
import { generateId } from '../core/id.js?v=20260812b';
import { persist } from '../core/data-adapter.js?v=20260812b';
import { SEED_SIGNUPS } from '../mock/seed.js?v=20260812b';
import { getPersonById } from '../mock/index.js?v=20260812b';
import { TodoStore, TodoSourceType, TodoActionType, TodoCategory, TodoStatus } from './todo.js?v=20260812b';
import { AuthStore } from './auth.js?v=20260812b';
import { TaskForceRecordStore } from './taskforce.js?v=20260812b';

// ── 枚举 ────────────────────────────────────────────────────────
const SignupRole = {
  PARTICIPANT: 'participant', // 普通参与
  ORGANIZER: 'organizer',     // 组织者
  DEEP: 'deep',               // 深度参与
};
export const SIGNUP_ROLE_LABELS = {
  [SignupRole.PARTICIPANT]: '普通参与',
  [SignupRole.ORGANIZER]: '组织者',
  [SignupRole.DEEP]: '深度参与',
};
export const SignupStatus = {
  APPROVED: 'approved',
  PENDING: 'pending',
  REJECTED: 'rejected',
  CANCELLED: 'cancelled',
};
export const SIGNUP_STATUS_LABELS = {
  [SignupStatus.APPROVED]: '已通过',
  [SignupStatus.PENDING]: '待审核',
  [SignupStatus.REJECTED]: '已拒绝',
  [SignupStatus.CANCELLED]: '已取消',
};

function _loadSignups() {
  try { return [...mockDB.signups]; }
  catch (e) { console.warn('[SignupStore] 加载失败：', e); return []; }
}
function _saveSignups(records) {
  mockDB.signups = [...records];
  persist();
}

/** 今日 YYYY-MM-DD */
function _today() { return new Date().toISOString().slice(0, 10); }

/**
 * 取审核人（发起人）
 * 活动：activity.organizer || activity.createdBy
 * 专班：taskforce.initiator || members 中 role='organizer' 者
 * @returns {string|null} personId
 */
export function resolveSignupReviewer(sourceType, sourceId) {
  if (sourceType === 'activity') {
    const act = mockDB.activities.find(a => a.id === sourceId);
    return act ? (act.organizer || act.createdBy || null) : null;
  }
  if (sourceType === 'taskforce') {
    const tf = TaskForceRecordStore.getAll().find(t => t.id === sourceId);
    if (!tf) return null;
    if (tf.initiator) return tf.initiator;
    const org = (tf.members || []).find(m => m.role === 'organizer');
    return org ? org.personId : null;
  }
  return null;
}

/** 活动/专班是否存在且可报名 */
function _sourceOpen(sourceType, sourceId) {
  if (sourceType === 'activity') {
    const act = mockDB.activities.find(a => a.id === sourceId);
    if (!act) return { ok: false, reason: '活动不存在' };
    if (act.archived || act.status === 'cancelled' || act.status === 'draft') return { ok: false, reason: '该活动当前不可报名' };
    if (!act.date || act.date < _today()) return { ok: false, reason: '活动已结束' };
    return { ok: true };
  }
  const tf = TaskForceRecordStore.getAll().find(t => t.id === sourceId);
  if (!tf) return { ok: false, reason: '专班不存在' };
  if (tf.status !== 'recruiting') return { ok: false, reason: '该专班当前未在招募' };
  if (tf.deadline && tf.deadline < _today()) return { ok: false, reason: '报名已截止' };
  return { ok: true };
}

/** 发起审核待办（pending 报名生成） */
function _createReviewTodo(sourceType, sourceId, signup) {
  const reviewerId = resolveSignupReviewer(sourceType, sourceId);
  if (!reviewerId) return;
  const person = getPersonById(reviewerId);
  const role = person ? person.role : null;
  if (!role) return;
  const label = sourceType === 'activity' ? '活动' : '专班';
  const title = sourceType === 'activity'
    ? (mockDB.activities.find(a => a.id === sourceId)?.title || '活动')
    : (TaskForceRecordStore.getAll().find(t => t.id === sourceId)?.name || '专班');
  TodoStore.create({
    title: `审核「${title}」报名：${getPersonById(signup.personId)?.name || signup.personId}`,
    description: `${label}报名待审核（${SIGNUP_ROLE_LABELS[signup.role] || signup.role}）`,
    role,
    category: TodoCategory.REVIEW,
    priority: 'normal',
    deadline: null,
    sourceType,
    sourceId,
    actionType: TodoActionType.REVIEW,
    actionKey: 'signup-review',
    actionData: { signupId: signup.id, sourceType, sourceId },
    flow: `报名申请 → ${getPersonById(reviewerId)?.name || ''}审核`,
  });
}

/** 生成报名人「参与」待办（approved 后） */
function _createParticipateTodo(sourceType, sourceId, personId) {
  const person = getPersonById(personId);
  if (!person || person.role !== 'participant') return; // 仅普通成员视角
  if (sourceType === 'activity') {
    const act = mockDB.activities.find(a => a.id === sourceId);
    if (!act || act.date < _today()) return;
    // dup 检查仅限「参与」类待办：同源 signup-review 等其它待办不得阻止参与待办重建
    const dup = TodoStore.getBySource(TodoSourceType.ACTIVITY, sourceId)
      .some(t => t.actionType === TodoActionType.PARTICIPATE && t.status !== TodoStatus.COMPLETED);
    if (dup) return;
    TodoStore.create({
      title: `参与活动「${act.title || '未命名'}」`,
      description: `活动日期：${act.date}。请按时参与并配合考勤。`,
      role: 'visitor',
      category: TodoCategory.TRACK,
      priority: 'normal',
      deadline: act.date,
      sourceType: TodoSourceType.ACTIVITY,
      sourceId,
      actionType: TodoActionType.PARTICIPATE,
      actionData: { activityId: sourceId },
    });
  } else {
    const tf = TaskForceRecordStore.getAll().find(t => t.id === sourceId);
    if (!tf) return;
    const dup = TodoStore.getBySource(TodoSourceType.TASKFORCE, sourceId)
      .some(t => t.actionType === TodoActionType.PARTICIPATE && t.status !== TodoStatus.COMPLETED);
    if (dup) return;
    TodoStore.create({
      title: `参与专班「${tf.name || '未命名'}」`,
      description: `专班：${tf.task || ''}`,
      role: 'visitor',
      category: TodoCategory.TRACK,
      priority: 'normal',
      deadline: tf.deadline || null,
      sourceType: TodoSourceType.TASKFORCE,
      sourceId,
      actionType: TodoActionType.PARTICIPATE,
      actionData: { taskforceId: sourceId },
    });
  }
}

/** 审核通过后写主源（organizer/deep → assignments/members；participant → assignments/members 兜底） */
async function _writeSource(sourceType, sourceId, personId, role) {
  if (sourceType === 'activity') {
    const act = mockDB.activities.find(a => a.id === sourceId);
    if (!act) return;
    const cur = Array.isArray(act.assignments) ? act.assignments : [];
    if (cur.some(x => x.personId === personId)) return;
    if (role === 'organizer' || role === 'deep') {
      // 复用三合一机制：写主源 + 审计快照 + 通知
      const merged = [...cur, { personId, role }];
      await AuthStore.syncProjectRoles({ scopeRef: sourceId, assignments: merged, actorId: personId });
    } else {
      // participant：直接并入 assignments（保留既有条目）
      const { updateActivity } = await import('./mock.js?v=20260812b');
      await updateActivity(sourceId, { assignments: [...cur, { personId, role }] });
    }
  } else {
    const tf = TaskForceRecordStore.getAll().find(t => t.id === sourceId);
    if (!tf) return;
    if (tf.members.some(m => m.personId === personId)) return;
    TaskForceRecordStore.addMember(sourceId, { personId, role });
  }
}

export const SignupStore = {
  _signups: [],

  init() {
    const persisted = _loadSignups();
    if (persisted.length > 0) {
      this._signups = persisted;
    } else {
      this._signups = [...SEED_SIGNUPS];
      _saveSignups(this._signups);
    }
    // 补齐 pending 报名的审核待办（幂等：已存在对应 signup-review 待办则跳过）。
    // 种子/历史 pending 记录无预置待办，首次进入任意页面（含工作台）即可补齐，
    // 否则书记/组长/委员直入工作台看不到「去审核」入口（2026-08-08 验证发现）。
    try {
      const existKeys = new Set(
        TodoStore.getAll()
          .filter(t => t.actionKey === 'signup-review' && t.actionData?.signupId)
          .map(t => t.actionData.signupId)
      );
      for (const s of this._signups) {
        if (s.status !== SignupStatus.PENDING || existKeys.has(s.id)) continue;
        const reviewerId = resolveSignupReviewer(s.sourceType, s.sourceId);
        if (!reviewerId) continue;
        const person = getPersonById(reviewerId);
        if (!person || !person.role) continue;
        const label = s.sourceType === 'activity' ? '活动' : '专班';
        const title = s.sourceType === 'activity'
          ? (mockDB.activities.find(a => a.id === s.sourceId)?.title || '活动')
          : (TaskForceRecordStore.getAll().find(t => t.id === s.sourceId)?.name || '专班');
        TodoStore.create({
          title: `审核「${title}」报名：${getPersonById(s.personId)?.name || s.personId}`,
          description: `${label}报名待审核（${SIGNUP_ROLE_LABELS[s.role] || s.role}）`,
          role: person.role,
          category: TodoCategory.REVIEW,
          priority: 'normal',
          deadline: null,
          sourceType: s.sourceType,
          sourceId: s.sourceId,
          actionType: TodoActionType.REVIEW,
          actionKey: 'signup-review',
          actionData: { signupId: s.id, sourceType: s.sourceType, sourceId: s.sourceId },
          flow: `报名申请 → ${person.name || ''}审核`,
        });
        existKeys.add(s.id);
      }
    } catch (e) {
      console.warn('[SignupStore] 补齐审核待办失败：', e);
    }
  },

  getAll() { return [...this._signups]; },

  getBySource(sourceType, sourceId) {
    return this._signups.filter(s => s.sourceType === sourceType && s.sourceId === sourceId);
  },

  getMySignups(personId) {
    return this._signups.filter(s => s.personId === personId);
  },

  hasApplied(sourceType, sourceId, personId) {
    return this._signups.some(s =>
      s.sourceType === sourceType && s.sourceId === sourceId && s.personId === personId &&
      (s.status === SignupStatus.APPROVED || s.status === SignupStatus.PENDING)
    );
  },

  /**
   * 提交报名。participant → auto approved；organizer/deep → pending 待审核。
   * @returns {{ ok: boolean, reason?: string, signup?: object }}
   */
  apply({ sourceType, sourceId, personId, role = SignupRole.PARTICIPANT, note = '' }) {
    if (!personId) return { ok: false, reason: '未登录' };
    const chk = _sourceOpen(sourceType, sourceId);
    if (!chk.ok) return { ok: false, reason: chk.reason };
    if (this.hasApplied(sourceType, sourceId, personId)) return { ok: false, reason: '您已报名，请勿重复提交' };
    // 专班名额校验
    if (sourceType === 'taskforce') {
      const tf = TaskForceRecordStore.getAll().find(t => t.id === sourceId);
      if (tf && tf.capacity && tf.members.length >= tf.capacity) return { ok: false, reason: '名额已满' };
    }
    const isAuto = role === SignupRole.PARTICIPANT;
    const record = {
      id: generateId('su'),
      sourceType,
      sourceId,
      personId,
      role,
      status: isAuto ? SignupStatus.APPROVED : SignupStatus.PENDING,
      createdAt: new Date().toISOString(),
      reviewedBy: null,
      reviewedAt: null,
      note: note || null,
    };
    this._signups = [...this._signups, record];
    _saveSignups(this._signups);
    // 待办联动
    if (isAuto) {
      _writeSource(sourceType, sourceId, personId, role);
      _createParticipateTodo(sourceType, sourceId, personId);
    } else {
      _createReviewTodo(sourceType, sourceId, record);
    }
    return { ok: true, signup: record };
  },

  /**
   * 审核报名（pending → approved / rejected）
   * @param {string} id 报名记录 ID
   * @param {{ approve: boolean, reviewer: string }} opts
   * @returns {{ ok: boolean, reason?: string, signup?: object }}
   */
  async review(id, { approve, reviewer }) {
    const idx = this._signups.findIndex(s => s.id === id);
    if (idx === -1) return { ok: false, reason: '报名记录不存在' };
    const s = this._signups[idx];
    if (s.status !== SignupStatus.PENDING) return { ok: false, reason: '该报名已处理' };
    const updated = {
      ...s,
      status: approve ? SignupStatus.APPROVED : SignupStatus.REJECTED,
      reviewedBy: reviewer || null,
      reviewedAt: new Date().toISOString(),
    };
    this._signups = [
      ...this._signups.slice(0, idx),
      updated,
      ...this._signups.slice(idx + 1),
    ];
    _saveSignups(this._signups);
    if (approve) {
      await _writeSource(s.sourceType, s.sourceId, s.personId, s.role);
      _createParticipateTodo(s.sourceType, s.sourceId, s.personId);
    }
    // 销审核待办（仅销该报名对应的 signup-review 待办）
    const todo = TodoStore.getAll().find(t =>
      t.actionKey === 'signup-review' && t.actionData?.signupId === id && t.status !== 'completed'
    );
    if (todo) TodoStore.complete(todo.id);
    return { ok: true, signup: updated };
  },

  /** 撤回/取消报名（pending 撤回；approved 普通参与取消） */
  cancel(id, personId) {
    const idx = this._signups.findIndex(s => s.id === id);
    if (idx === -1) return { ok: false, reason: '报名记录不存在' };
    const s = this._signups[idx];
    if (s.personId !== personId) return { ok: false, reason: '无权操作' };
    if (s.status === SignupStatus.REJECTED || s.status === SignupStatus.CANCELLED) return { ok: false, reason: '该报名不可取消' };
    const updated = { ...s, status: SignupStatus.CANCELLED, reviewedBy: personId, reviewedAt: new Date().toISOString() };
    this._signups = [
      ...this._signups.slice(0, idx),
      updated,
      ...this._signups.slice(idx + 1),
    ];
    _saveSignups(this._signups);
    // 取消 approved 报名：从主源移除（避免参与待办被 deriveFromActivities 重新派生）
    if (s.status === SignupStatus.APPROVED) {
      if (s.sourceType === 'activity') {
        const act = mockDB.activities.find(a => a.id === s.sourceId);
        if (act && Array.isArray(act.assignments) && act.assignments.some(x => x.personId === personId)) {
          const remaining = act.assignments.filter(x => x.personId !== personId);
          import('./mock.js?v=20260812b').then(({ updateActivity }) => {
            updateActivity(s.sourceId, { assignments: remaining });
            persist(); // updateActivity 不自动落盘，须显式 persist
          });
        }
      } else {
        const tf = TaskForceRecordStore.getAll().find(t => t.id === s.sourceId);
        if (tf && Array.isArray(tf.members) && tf.members.some(m => m.personId === personId)) {
          TaskForceRecordStore.update(s.sourceId, { members: tf.members.filter(m => m.personId !== personId) });
        }
      }
    }
    // 销对应参与待办
    const todo = TodoStore.getAll().find(t =>
      t.actionType === TodoActionType.PARTICIPATE &&
      t.sourceType === s.sourceType && t.sourceId === s.sourceId && t.status !== 'completed'
    );
    if (todo) TodoStore.complete(todo.id);
    // 撤回 pending 申请时同时销对应审核待办（避免审核人看到已撤回的报名）
    const reviewTodo = TodoStore.getAll().find(t =>
      t.actionKey === 'signup-review' && t.actionData?.signupId === id && t.status !== 'completed'
    );
    if (reviewTodo) TodoStore.complete(reviewTodo.id);
    return { ok: true };
  },
};
