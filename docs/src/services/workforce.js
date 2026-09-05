// role: [工程师]+[AI]
// services/workforce.js — 支部分工提议与采纳（L4 M2 闭环，2026-09-03）
// 链路：书记台「支部分工」改派提议（会前拟稿/直接发起）→ 生成「支委会」议题活动
//   （voteConfig = deliberative 交流式表决，应到支委）→ 支委经既有表决 UI 表态 →
//   书记确认采纳 → 合并 config.workforce 落库 → 视图即时生效。
// 表决本身复用既有 agenda-votes 资产，本服务不重复实现投票 UI；采纳为人工确认动作
// （表决结果在支委会活动详情查看），前置校验：票决通过判定（见 evaluateWorkforceVotes）方可采纳。
// A1/M2 补齐（2026-09-05）：票决通过判定（2/3 出席且无异议）为采纳硬门槛；
//   议题 extras 记 voteOutcome {status,tally,needed,evaluatedAt}；会前草稿=书记台暂存。
import { BranchService } from './runtime.js?v=20260903c';
import { NoticeStore } from './notice.js?v=20260903c';
import { defaultVoteConfig, resolveVoterIds } from './vote-config.js?v=20260903c';
import { ROLE_LABELS } from '../core/constants.js?v=20260903c';
import { WORK_MAP_MODULES, mergeWorkforceSnapshot } from '../core/work-map.js?v=20260903c';
import { getPersonName } from './person.js?v=20260903c';
import { AuthStore } from './auth.js?v=20260903c';
import { getBranchWorkforce, updateBranchWorkforce } from './branch.js?v=20260903c';
import { fetchVotesStrict } from './committee-vote.js?v=20260903c';

export const WORKFORCE_PROPOSAL_KIND = 'workforce-proposal';

/**
 * 支部默认票决门槛（开源超参数：开源部署方可按支部制度调整；
 * 默认值 = 本科生党支部 2026-09-05 书记裁决「支委会从严」。见 MODULARIZATION_ASSESSMENT §八 P3a）
 */
export const WORKFORCE_VOTE_DEFAULT = { quorum: 2 / 3, vetoOnObject: true };

/**
 * 票决通过判定（支委会议题，默认门槛=2/3 出席且无异议；可经 opts 覆盖）
 * @param {{ roster?: string[], votes?: Array<{personId?:string, position?:string}> }} input
 *   roster = 应到支委（resolveVoterIds('committee')）；votes = 该活动表态列表
 * @param {{ quorum?: number, vetoOnObject?: boolean }} [opts] 门槛覆盖（默认 WORKFORCE_VOTE_DEFAULT）
 * @returns {{ status:'pending'|'passed'|'failed', tally:{total,voted,agree,object,comment}, needed:number }}
 *   pending=表态不足；failed=有异议（vetoOnObject）；passed=通过
 */
export function evaluateWorkforceVotes({ roster = [], votes = [] }, opts = {}) {
  const { quorum = WORKFORCE_VOTE_DEFAULT.quorum, vetoOnObject = WORKFORCE_VOTE_DEFAULT.vetoOnObject } = opts;
  const rosterSet = new Set(roster || []);
  const tally = { total: rosterSet.size, voted: 0, agree: 0, object: 0, comment: 0 };
  const seen = new Set();
  (votes || []).forEach(v => {
    if (!v || !v.personId || !rosterSet.has(v.personId) || seen.has(v.personId)) return;
    seen.add(v.personId);
    tally.voted += 1;
    if (v.position === 'object') tally.object += 1;
    else if (v.position === 'comment') tally.comment += 1;
    else tally.agree += 1; // agree / 其他均按同意计
  });
  const needed = Math.ceil(tally.total * quorum);
  const status = tally.total === 0 || tally.voted < needed
    ? 'pending'
    : (vetoOnObject && tally.object > 0 ? 'failed' : 'passed');
  return { status, tally, needed };
}

function currentPersonId() {
  return AuthStore.getCurrentUser()?.personId || AuthStore.getCurrentUser()?.id || null;
}

/** 目标 owner 显示名（role → 角色名；person → 姓名） */
export function ownerDisplay(assign) {
  if (!assign) return '未分工';
  if (assign.ownerType === 'person') return getPersonName(assign.ownerId) || assign.ownerId;
  return ROLE_LABELS[assign.ownerId] || assign.ownerId;
}

function moduleName(moduleId) {
  return WORK_MAP_MODULES.find((m) => m.id === moduleId)?.name || moduleId;
}

/** 生成议题标题（单模块带 from→to，多模块带项数） */
function _titleFor(changes) {
  if (changes.length === 1) {
    const c = changes[0];
    return `支部分工调整：${moduleName(c.moduleId)} → ${ownerDisplay(c.to)}`;
  }
  return `支部分工调整（${changes.length} 项）`;
}

/**
 * 发起分工调整议题：创建「支委会」表决活动（deliberative 交流式，应到支委）
 * @param {string} branchId
 * @param {Array<{moduleId:string,to:{ownerType:'role'|'person',ownerId:string}}>} changes 改派清单
 * @param {string} note 议题说明（如理由）
 * @param {string} [date] 支委会日期（缺省今天）
 * @returns {Promise<Object>} 创建的议题活动
 */
export async function createWorkforceProposalActivity(branchId, changes, note = '', date) {
  const clean = (Array.isArray(changes) ? changes : [])
    .filter((c) => c && c.moduleId && c.to && (c.to.ownerType === 'role' || c.to.ownerType === 'person') && c.to.ownerId);
  if (clean.length === 0) throw new Error('改派清单为空：请选择要调整的模块与目标负责人');

  const lines = clean.map((c) => `- ${moduleName(c.moduleId)}：现任 ${ownerDisplay(getBranchWorkforce(branchId)[c.moduleId])} → 拟改派 ${ownerDisplay(c.to)}`);
  const activity = await BranchService.createActivity({
    type: '支委会',
    scenarioId: 'branch-committee',
    title: _titleFor(clean),
    date: date || new Date().toISOString().slice(0, 10),
    status: 'published',
    visibility: 'group',
    voteConfig: defaultVoteConfig('branch-committee'), // deliberative / committee / quorum=false
    agenda: [{
      item: '审议支部分工调整',
      content: `${note ? `${note}\n` : ''}${lines.join('\n')}`,
    }],
    extras: { kind: WORKFORCE_PROPOSAL_KIND, proposal: clean, adoptedAt: null },
  });

  // 站内通知全体支委（表决入口 = 各自工作台对本次支委会活动参与既有线上表决）
  try {
    NoticeStore.add({
      title: '支部分工调整议题待表决',
      content: `「${activity.title}」已发起，请支委在本次支委会活动中参与线上表决（交流式表态）。`,
      priority: 'normal',
    });
  } catch (e) { console.warn('[workforce] 通知支委失败（不影响议题创建）：', e); }
  return activity;
}

/** 本支部的分工调整议题列表（按 createdAt 倒序） */
export async function listWorkforceProposals(branchId) {
  const acts = await BranchService.listActivities();
  return acts
    .filter((a) => a.extras && a.extras.kind === WORKFORCE_PROPOSAL_KIND)
    .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
}

/** 拉取议题实时票决判定（应到=委员会名单；供采纳硬校验与书记台卡片共用） */
export async function getWorkforceVoteOutcome(activityId) {
  const roster = resolveVoterIds('committee');
  const votes = await fetchVotesStrict(activityId);
  return evaluateWorkforceVotes({ roster, votes });
}

/**
 * 采纳分工议题：合并改派清单写入 config.workforce 并标记活动已采纳
 * 前置（2026-09-05 补）：票决通过（2/3 出席且无异议）方可采纳；未达门槛/有异议均拒绝并给原因。
 */
export async function adoptWorkforceProposal(branchId, activityId) {
  const acts = await BranchService.listActivities();
  const act = acts.find((a) => a.id === activityId);
  if (!act || !(act.extras && act.extras.kind === WORKFORCE_PROPOSAL_KIND)) {
    throw new Error('未找到该分工议题活动');
  }
  if (act.extras.adoptedAt) throw new Error('该议题已采纳，无需重复操作');

  const outcome = await getWorkforceVoteOutcome(activityId);
  if (outcome.status === 'pending') {
    throw new Error(`表决未达通过门槛：表态 ${outcome.tally.voted}/${outcome.needed}（应到 ${outcome.tally.total} 的 2/3），暂不可采纳`);
  }
  if (outcome.status === 'failed') {
    throw new Error('表决未通过：存在异议，需再议后重新表决方可采纳');
  }

  const merged = mergeWorkforceSnapshot(getBranchWorkforce(branchId), act.extras.proposal);
  await updateBranchWorkforce(branchId, merged);

  const updated = await BranchService.updateActivity(activityId, {
    extras: {
      ...act.extras,
      adoptedAt: new Date().toISOString(),
      adoptedBy: currentPersonId(),
      voteOutcome: { status: 'passed', tally: outcome.tally, needed: outcome.needed, evaluatedAt: new Date().toISOString() },
    },
  });
  try {
    NoticeStore.add({
      title: '支部分工调整已生效',
      content: `「${act.title}」已按支委会表决采纳，分工已更新。`,
      priority: 'normal',
    });
  } catch (e) { console.warn('[workforce] 生效通知失败（不影响采纳）：', e); }
  return updated;
}
