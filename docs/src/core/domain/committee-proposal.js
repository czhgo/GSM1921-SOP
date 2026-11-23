// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  core/domain/committee-proposal.js — 支委提案纯领域（D-869）
//
//  单一源：状态集合、迁移表、类型 / 来源枚举、展示文案。
//  服务端 `server/routes/committee-proposals.js` 与前端 store 同引本文件；
//  非法迁移一律返回 null（调用方 400），不做静默兜底。
// ════════════════════════════════════════════════════════════════

export const PROPOSAL_STATUSES = Object.freeze([
  'pending', 'queued', 'on-agenda', 'decided', 'closed', 'rejected',
]);

export const PROPOSAL_TYPES = Object.freeze(['decision', 'discussion', 'sync']);

export const PROPOSAL_SOURCE_TYPES = Object.freeze(['activity', 'taskforce', 'member', 'institution']);

export const PROPOSAL_STATUS_LABELS = Object.freeze({
  pending: '待受理',
  queued: '已受理',
  'on-agenda': '已排期',
  decided: '已决议',
  closed: '已归档',
  rejected: '已驳回',
});

export const PROPOSAL_TYPE_LABELS = Object.freeze({
  decision: '决策',
  discussion: '讨论',
  sync: '同步',
});

export const PROPOSAL_SOURCE_LABELS = Object.freeze({
  activity: '活动',
  taskforce: '专班',
  member: '成员',
  institution: '制度',
});

/** 动作 → { from, to }；未登记即非法 */
const TRANSITIONS = Object.freeze({
  accept: { from: ['pending'], to: 'queued' },
  reject: { from: ['pending', 'queued'], to: 'rejected' },
  schedule: { from: ['queued'], to: 'on-agenda' },
  decide: { from: ['on-agenda'], to: 'decided' },
  close: { from: ['decided', 'rejected'], to: 'closed' },
});

/**
 * 解析动作后的目标状态；非法返回 null。
 * @param {string} from
 * @param {string} action
 * @returns {string|null}
 */
export function proposalTransition(from, action) {
  const rule = TRANSITIONS[action];
  if (!rule || !rule.from.includes(from)) return null;
  return rule.to;
}

/** 是否仍可流转（非终态） */
export function isProposalOpen(status) {
  return status === 'pending' || status === 'queued' || status === 'on-agenda';
}

/** 是否终态 */
export function isProposalTerminal(status) {
  return status === 'closed' || status === 'rejected';
}

function _trim(value) {
  return typeof value === 'string' ? value.trim() : '';
}

/**
 * 归一提案记录：只保留白名单字段、去空白、补默认状态；不猜来源。
 * @param {Object} input
 * @returns {Object}
 */
export function normalizeProposal(input = {}) {
  const suggested = PROPOSAL_TYPES.includes(input.suggestedType) ? input.suggestedType : 'discussion';
  return {
    id: _trim(input.id),
    branchId: _trim(input.branchId),
    title: _trim(input.title),
    reason: _trim(input.reason),
    sourceType: PROPOSAL_SOURCE_TYPES.includes(input.sourceType) ? input.sourceType : '',
    sourceId: input.sourceId ? String(input.sourceId) : null,
    draft: input.draft && typeof input.draft === 'object' ? { ...input.draft } : null,
    suggestedType: suggested,
    expectedAt: _trim(input.expectedAt) || null,
    proposedBy: _trim(input.proposedBy),
    proposedAt: _trim(input.proposedAt) || null,
    status: PROPOSAL_STATUSES.includes(input.status) ? input.status : 'pending',
    decision: input.decision && typeof input.decision === 'object' ? { ...input.decision } : null,
    decidedBy: _trim(input.decidedBy) || null,
    decidedAt: _trim(input.decidedAt) || null,
    meetingActivityId: _trim(input.meetingActivityId) || null,
    agendaItemId: _trim(input.agendaItemId) || null,
    affectedPersonIds: Array.isArray(input.affectedPersonIds)
      ? [...new Set(input.affectedPersonIds.map(String).filter(Boolean))]
      : [],
    createdAt: _trim(input.createdAt) || null,
    updatedAt: _trim(input.updatedAt) || null,
  };
}
