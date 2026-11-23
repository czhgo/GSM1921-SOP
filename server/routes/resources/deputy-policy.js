// role: [工程师]+[AI]
// routes/resources/deputy-policy.js — 副支书操作权服务端入口（2026-11-20 批次 579）
//
// 口径：主责在支书；本文件只决定副支书能否代操作四类主责动作。
//   参数源 = 支部 `config.policyOverrides.role.deputySecretary`（读侧净化）。
//   判据单一源 = `docs/src/core/domain/deputy-capability.js`（前端同源 import）。
//
// 使用：
//   · 显式端点：`requireSecretaryAction(db, 'rosterStage')` 等中间件；
//   · 通用写口：`deputyResourceDeny(db, actor, name, method, body)` 在写门前调用。
import { DEFAULT_BRANCH_ID } from '../../../docs/src/core/domain/constants.js';
import {
  normalizeDeputyPolicy, secretaryActionAllowed, deputyActionDenyReason,
} from '../../../docs/src/core/domain/deputy-capability.js';
import { actorBranchId } from './branch-scope.js';

export { deputyActionDenyReason } from '../../../docs/src/core/domain/deputy-capability.js';

/** 读某支部的副支书策略（缺省支部 / 缺字段 ⇒ 出厂 full）。 */
export function deputyPolicyOf(db, branchId) {
  const id = branchId ? String(branchId) : DEFAULT_BRANCH_ID;
  try {
    const row = db.prepare('SELECT data FROM branches WHERE id = ?').get(String(id));
    const cfg = row ? JSON.parse(row.data) : null;
    return normalizeDeputyPolicy(cfg?.config?.policyOverrides?.role?.deputySecretary);
  } catch {
    return normalizeDeputyPolicy(null);
  }
}

/** 副支书是否可代操作某动作（secretary 恒 true；其他角色 false）。 */
export function deputyActionAllowed(db, actor, action) {
  if (!actor) return false;
  if (actor.role === 'secretary') return true;
  if (actor.role !== 'deputy-secretary') return false;
  const branchId = actorBranchId(actor);
  return secretaryActionAllowed({ role: actor.role, action, policy: deputyPolicyOf(db, branchId) });
}

/**
 * 显式端点中间件：支书放行；副支书按支部参数；`extraRoles` 内的角色照旧放行（如 party-staff）。
 * @param {Object} db
 * @param {string} action 四类之一
 * @param {{extraRoles?: string[]}} [opts]
 */
export function requireSecretaryAction(db, action, { extraRoles = [] } = {}) {
  const extra = new Set(extraRoles);
  return (req, res, next) => {
    const role = req.actor && req.actor.role;
    if (role && extra.has(role)) return next();
    if (role === 'secretary') return next();
    if (role === 'deputy-secretary') {
      if (deputyActionAllowed(db, req.actor, action)) return next();
      return res.status(403).json({ error: deputyActionDenyReason(action) });
    }
    return res.status(403).json({ error: '无权限：该项仅支书可操作' });
  };
}

/** 全支部通知：受众含 all，或不是「本场活动通知」。 */
function _isBranchWideNotice(body) {
  const b = body && typeof body === 'object' ? body : {};
  const audience = Array.isArray(b.audience) ? b.audience.map(String) : [];
  if (audience.includes('all')) return true;
  return !(b.targetType === 'activity' && b.targetId);
}

/**
 * 通用写口判据：副支书在四类动作上被支部参数收紧时返回拒绝文案；其余返回 null。
 * 只对 deputy-secretary 生效——不改变支书 / 其他角色的既有门。
 */
export function deputyResourceDeny(db, actor, name, method, body) {
  if (!actor || actor.role !== 'deputy-secretary') return null;
  let action = null;
  if (name === 'activities' && ['post', 'patch', 'delete'].includes(method)) action = 'activityEdit';
  else if (name === 'notices' && ['post', 'patch'].includes(method) && _isBranchWideNotice(body)) action = 'branchNotice';
  if (!action) return null;
  return deputyActionAllowed(db, actor, action) ? null : deputyActionDenyReason(action);
}
