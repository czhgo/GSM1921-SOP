// role: [工程师]+[AI]
// core/domain/deputy-capability.js — 副支书操作权单一判据（2026-11-20 批次 579 · 支书裁定）
//
// 口径：主责仍在支书；本文件只回答「副支书能否代操作某一类主责动作」。
//   · secretary 一律允许；
//   · deputy-secretary 按支部参数 `POLICY_DEFAULTS.role.deputySecretary`：
//       full     = 四类全部允许（默认，行为与改造前一致）
//       standard = 四类全部不允许
//       custom   = 按 allow 逐项
//   · 其他角色一律不允许。
//
// 单一源：服务端 `server/routes/resources/deputy-policy.js` 复用同一 mode / allow 语义，
//   前端不得另写第二套判断（guard: `server/test/deputy-policy.test.mjs`）。
import { POLICY_DEFAULTS } from './policy-defaults.js';

export const DEPUTY_ACTIONS = Object.freeze([
  'activityEdit', 'branchNotice', 'rosterStage', 'branchConfig',
]);

export const DEPUTY_ACTION_LABELS = Object.freeze({
  activityEdit: '活动信息编辑与发布',
  branchNotice: '全支部通知发布',
  rosterStage: '名册阶段推进与确认',
  branchConfig: '制度参数与支部配置',
});

const MODES = new Set(['full', 'standard', 'custom']);

/** 规范化策略：非法 mode 回落 full；allow 只收布尔，缺省 true。 */
export function normalizeDeputyPolicy(policy) {
  const src = policy && typeof policy === 'object' ? policy : {};
  const mode = MODES.has(src.mode) ? src.mode : 'full';
  const rawAllow = src.allow && typeof src.allow === 'object' ? src.allow : {};
  const allow = {};
  for (const action of DEPUTY_ACTIONS) {
    allow[action] = rawAllow[action] === undefined ? true : rawAllow[action] === true;
  }
  return { mode, allow };
}

/** 当前默认策略（读侧注入会就地覆盖 POLICY_DEFAULTS，故调用时取当前值）。 */
export function currentDeputyPolicy() {
  return normalizeDeputyPolicy(POLICY_DEFAULTS.role && POLICY_DEFAULTS.role.deputySecretary);
}

/**
 * 支书 / 副支书操作权判定（唯一入口）。
 * @param {{role?:string, action:string, policy?:Object}} args
 * @returns {boolean}
 */
export function secretaryActionAllowed({ role, action, policy } = {}) {
  if (role === 'secretary') return true;
  if (role !== 'deputy-secretary') return false;
  const p = normalizeDeputyPolicy(policy || currentDeputyPolicy());
  if (p.mode === 'full') return true;
  if (p.mode === 'standard') return false;
  return p.allow[action] === true;
}

/** 无权时的统一提示（前端禁用态 / 服务端 403 文案共用）。 */
export function deputyActionDenyReason(action) {
  const label = DEPUTY_ACTION_LABELS[action] || '该操作';
  return `该项主责在支书，本支部未开启副支书代操作：${label}`;
}
