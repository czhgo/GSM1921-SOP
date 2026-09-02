// role: [工程师]+[AI]
// vote-config.js — 线上异步表决配置（voteConfig）解析与场景默认
// 泛化：支委会 deliberative / 支部党员大会 formal+硬校验；optionSet/voterScope/quorumCheck 参数化
import { PersonStore } from './person.js?v=20260901q';
import { AuthStore } from './auth.js?v=20260901q';

export const OPTION_SETS = {
  deliberative: {
    label: '交流式表态', options: ['agree', 'object', 'comment'],
    labels: { agree: '同意', object: '异议', comment: '附言' },
    objectRequiresNote: true,
  },
  formal: {
    label: '正式表决', options: ['approve', 'oppose', 'abstain'],
    labels: { approve: '赞成', oppose: '反对', abstain: '弃权' },
    objectRequiresNote: false, // 附言选填
  },
};

const DECISION_SCENARIOS = new Set(['branch-committee', 'branch-party-meeting']);

export function isDecisionScenario(scenarioId) { return DECISION_SCENARIOS.has(scenarioId); }

// 场景默认 voteConfig（创建活动预填）
export function defaultVoteConfig(scenarioId) {
  if (scenarioId === 'branch-party-meeting') {
    return { mode: 'async', optionSet: 'formal', voterScope: 'formal-only', voterIds: [], quorumCheck: true };
  }
  if (scenarioId === 'branch-committee') {
    return { mode: 'async', optionSet: 'deliberative', voterScope: 'committee', voterIds: [], quorumCheck: false };
  }
  return null; // 非决策类不支持线上表决
}

// 按 voterScope 解析应到名单（基于 people.js developStage / 支委角色）
export function resolveVoterIds(voterScope) {
  const people = PersonStore.getAll();
  if (voterScope === 'committee') {
    return people.filter((p) => !p.id.startsWith('u_') && AuthStore.isCommissioner(p.role)).map((p) => p.id);
  }
  if (voterScope === 'formal-only') {
    return people.filter((p) => !p.id.startsWith('u_') && p.developStage === '正式党员').map((p) => p.id);
  }
  if (voterScope === 'formal-plus-prep') {
    return people.filter((p) => !p.id.startsWith('u_') && (p.developStage === '正式党员' || p.developStage === '预备党员')).map((p) => p.id);
  }
  return [];
}

export function optionSetOf(activity) {
  const os = activity?.voteConfig?.optionSet;
  return (os && OPTION_SETS[os]) ? OPTION_SETS[os] : OPTION_SETS.deliberative;
}
