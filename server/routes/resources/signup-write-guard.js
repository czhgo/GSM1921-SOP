import { BRANCH_COMMISSION_ROLES, SECRETARY_AND_DEPUTY_ROLES, usesFormalMeetingRoster } from '../../../docs/src/core/domain/constants.js';
import { today as todayLocal } from '../../services/reporting.js';
import { actorBranchId, resourceBranchId } from './branch-scope.js';
import { hasWorkgroupPermission } from './workgroup-routes.js';

const SIGNUP_ROLES = new Set(['participant', 'organizer', 'deep']);
const COMMITTEE = new Set(BRANCH_COMMISSION_ROLES);
const SECRETARY = new Set(SECRETARY_AND_DEPUTY_ROLES);
const MANAGE_VOID_FIELDS = ['voidPending', 'voided', 'voidRejected'];

function rowOf(db, table, id) {
  if (!id) return null;
  const raw = db.prepare(`SELECT data FROM ${table} WHERE id = ?`).get(String(id));
  return raw ? JSON.parse(raw.data) : null;
}

function sourceOf(db, row) {
  if (!row || !['activity', 'taskforce'].includes(row.sourceType) || !row.sourceId) return null;
  const table = row.sourceType === 'activity' ? 'activities' : 'taskforces';
  const source = rowOf(db, table, row.sourceId);
  if (!source) return null;
  return { table, row: source, branchId: resourceBranchId(db, table, source) };
}

function signupReviewerId(sourceType, source) {
  if (sourceType === 'activity') return source.organizer || source.createdBy || null;
  return source.initiator || null;
}

function canReview(db, actor, signup, source) {
  if (!actor || !source) return false;
  if (signupReviewerId(signup.sourceType, source.row) === actor.id) return true;
  const workgroupId = source.row.workgroupId || `wg-${signup.sourceType}-${source.row.id}`;
  return hasWorkgroupPermission(db, workgroupId, actor.id, 'activity.signup.manage');
}

function canRequestVoid(db, actor, signup, source) {
  return canReview(db, actor, signup, source) || COMMITTEE.has(actor?.role);
}

function sourceOpen(source, signup) {
  const today = todayLocal();
  if (signup.sourceType === 'activity') {
    const activity = source.row;
    if (usesFormalMeetingRoster(activity)) return false;
    if (activity.archived || activity.status === 'cancelled' || activity.signupClosed === true) return false;
    if (activity.status === 'draft' && activity.signupEnabled !== true) return false;
    return !!activity.date && activity.date >= today;
  }
  const taskforce = source.row;
  return ['recruiting', 'active'].includes(taskforce.status)
    && (!taskforce.deadline || taskforce.deadline >= today);
}

function sourceAndPersonDeny(db, actor, signup, { creating = false, requireOwner = true } = {}) {
  if (!actor?.id) return '无权限：报名操作需要登录身份';
  if (!signup || !SIGNUP_ROLES.has(signup.role)) return '报名角色无效';
  if (requireOwner && signup.personId !== actor.id) return creating
    ? '无权限：只能为本人提交报名'
    : '无权限：不能修改其他人的报名记录';
  const source = sourceOf(db, signup);
  if (!source) return '报名必须关联已存在的活动或专班';
  if (creating && signup.sourceType === 'taskforce' && signup.role === 'participant') return '专班只设组织者与深度参与者，不接受普通参与报名';
  if (creating && signup.sourceType === 'activity' && source.row.type === '主题党日'
    && ['organizer', 'deep'].includes(signup.role) && typeof signup.onsite !== 'boolean') {
    return '主题党日组织者与深度参与者报名时须明确选择是否线下参加';
  }
  if (creating && signup.sourceType === 'activity' && source.row.type !== '主题党日' && signup.onsite !== undefined) {
    return '线下参加选择仅适用于主题党日报名';
  }
  const ownBranch = actorBranchId(actor);
  if (ownBranch && source.branchId !== ownBranch) return '无权限：报名来源属于其他支部';
  const person = rowOf(db, 'users', signup.personId);
  if (!person || (person.branchId || 'br-b1') !== source.branchId) return '无权限：报名人必须属于来源所在支部';
  if (signup.branchId && signup.branchId !== source.branchId) return '报名支部归属须与来源对象一致';
  return null;
}

export function signupCreateDeny(db, actor, signup) {
  const identityDeny = sourceAndPersonDeny(db, actor, signup, { creating: true });
  if (identityDeny) return identityDeny;
  const source = sourceOf(db, signup);
  if (!sourceOpen(source, signup)) return '该活动或专班当前未开放报名';
  const expectedStatus = signup.role === 'participant' ? 'approved' : 'pending';
  if (signup.status !== undefined && signup.status !== expectedStatus) return '无权限：报名状态由服务端按报名角色确定';
  if (signup.reviewedBy != null || signup.reviewedAt != null || signup.voidPending || signup.voided || signup.voidRejected) {
    return '无权限：新报名不能携带审核或作废留痕';
  }
  const duplicates = db.prepare('SELECT data FROM signups').all().map((row) => JSON.parse(row.data));
  if (duplicates.some((row) => !row.voided && row.sourceType === signup.sourceType
    && row.sourceId === signup.sourceId && row.personId === signup.personId
    && ['approved', 'pending'].includes(row.status))) return '您已报名，请勿重复提交';
  return null;
}

export function normalizeSignupCreate(db, actor, signup) {
  const source = sourceOf(db, signup);
  const normalized = {
    ...signup,
    status: signup.role === 'participant' ? 'approved' : 'pending',
    branchId: source?.branchId || actorBranchId(actor),
    createdAt: new Date().toISOString(),
    reviewedBy: null,
    reviewedAt: null,
    voidPending: null,
    voided: null,
    voidRejected: null,
  };
  if (signup.sourceType === 'activity' && source?.row?.type === '主题党日') {
    normalized.onsite = signup.role === 'participant' ? true : signup.onsite;
  } else {
    delete normalized.onsite;
  }
  return normalized;
}

function changedKeys(previous, next) {
  const keys = new Set([...Object.keys(previous || {}), ...Object.keys(next || {})]);
  return [...keys].filter((key) => JSON.stringify(previous?.[key]) !== JSON.stringify(next?.[key]));
}

function transitionSignup(db, actor, previous, submitted) {
  const identityDeny = sourceAndPersonDeny(db, actor, submitted, { requireOwner: false });
  if (identityDeny) return { error: identityDeny };
  const source = sourceOf(db, submitted);
  if (submitted.id !== previous.id) return { error: '报名记录 ID 不可修改' };
  for (const key of ['sourceType', 'sourceId', 'personId', 'role', 'branchId', 'createdAt', 'note', 'onsite']) {
    if (JSON.stringify(submitted[key]) !== JSON.stringify(previous[key])) return { error: `报名字段 ${key} 创建后不可修改` };
  }
  const changed = changedKeys(previous, submitted);
  if (changed.length === 0) return { row: submitted };

  const baseFields = new Set(['id', 'sourceType', 'sourceId', 'personId', 'role', 'branchId', 'createdAt', 'note']);
  const statusFields = new Set(['status', 'reviewedBy', 'reviewedAt']);
  if (changed.every((key) => baseFields.has(key) || statusFields.has(key))) {
    if (!changed.includes('status')) return { error: '审核留痕只能随有效的状态变更写入' };
    if (submitted.status === 'cancelled' && ['pending', 'approved'].includes(previous.status)) {
      if (actor.id !== previous.personId) return { error: '无权限：只能由报名人本人撤回或取消' };
      return { row: { ...previous, status: 'cancelled', reviewedBy: actor.id, reviewedAt: new Date().toISOString() } };
    }
    if (['approved', 'rejected'].includes(submitted.status) && previous.status === 'pending') {
      if (submitted.status === 'approved' && previous.sourceType === 'taskforce' && previous.role === 'participant') {
        return { error: '专班不设普通参与身份；历史申请不能转为成员' };
      }
      if (!canReview(db, actor, previous, source)) return { error: '无权限：当前账号不是该报名的审核人或获授权组织者' };
      return { row: { ...previous, status: submitted.status, reviewedBy: actor.id, reviewedAt: new Date().toISOString() } };
    }
    return { error: '报名状态迁移不合法或当前状态已处理' };
  }

  if (changed.every((key) => baseFields.has(key) || MANAGE_VOID_FIELDS.includes(key))) {
    const pending = submitted.voidPending;
    const voided = submitted.voided;
    const rejected = submitted.voidRejected;
    if (pending && !previous.voidPending && !previous.voided) {
      const reason = String(pending.reason || '').trim();
      if (!reason || pending.byPersonId !== actor.id || !canRequestVoid(db, actor, previous, source)) {
        return { error: '无权限：作废申请须由本事项组织者或支委发起并填写原因' };
      }
      return { row: { ...previous, voidPending: { reason, byPersonId: actor.id, at: new Date().toISOString() } } };
    }
    if (voided && COMMITTEE.has(actor.role) && voided.confirmedBy === actor.id && String(voided.reason || '').trim()) {
      return { row: { ...previous, voidPending: null, voided: { ...voided, confirmedBy: actor.id, confirmedAt: new Date().toISOString() } } };
    }
    if (rejected && COMMITTEE.has(actor.role) && rejected.rejectedBy === actor.id) {
      return { row: { ...previous, voidPending: null, voidRejected: { ...rejected, rejectedBy: actor.id, rejectedAt: new Date().toISOString() } } };
    }
    return { error: '无权限：作废裁决须由本支部支委完成并保留审计信息' };
  }
  return { error: '无权限：报名记录只能经报名、审核、本人撤回或作废留痕流程修改' };
}

export function signupPatchDeny(db, actor, previous, patch) {
  const result = transitionSignup(db, actor, previous, { ...previous, ...(patch || {}), id: previous.id });
  return result.error || null;
}

export function normalizeSignupPatch(db, actor, previous, patch) {
  return transitionSignup(db, actor, previous, { ...previous, ...(patch || {}), id: previous.id });
}

export function signupSnapshotDeny(db, rows, actor) {
  if (!Array.isArray(rows)) return null;
  const ownBranch = actorBranchId(actor);
  const current = new Map(db.prepare('SELECT id, data FROM signups').all()
    .map((raw) => [String(raw.id), JSON.parse(raw.data)])
    .filter(([, row]) => !ownBranch || resourceBranchId(db, 'signups', row) === ownBranch));
  const incoming = new Map();
  const normalized = [];
  for (const row of rows) {
    if (!row?.id || incoming.has(String(row.id))) return { error: '报名快照中的记录须有唯一 ID' };
    incoming.set(String(row.id), row);
    const previous = current.get(String(row.id));
    if (!previous) {
      const deny = signupCreateDeny(db, actor, row);
      if (deny) return { error: deny };
      normalized.push(normalizeSignupCreate(db, actor, row));
      continue;
    }
    const transition = transitionSignup(db, actor, previous, row);
    if (transition.error) return { error: transition.error };
    normalized.push(transition.row);
  }
  for (const id of current.keys()) {
    if (!incoming.has(id)) return { error: '无权限：报名记录须保留；请通过撤回、取消或作废流程留痕，不得物理删除' };
  }
  const active = new Set();
  for (const row of normalized) {
    if (row.voided || !['approved', 'pending'].includes(row.status)) continue;
    const key = `${row.sourceType}\u0000${row.sourceId}\u0000${row.personId}`;
    if (active.has(key)) return { error: '同一人员对同一活动或专班只能保留一条有效报名' };
    active.add(key);
  }
  return { rows: normalized };
}
