// role: [工程师]+[AI]
// vote-config.js — 线上异步表决配置（voteConfig）解析与场景默认
// 泛化：支委会 deliberative / 支部党员大会 formal+硬校验；optionSet/voterScope/quorumCheck 参数化
// ── voterIds 与「应到名单」联动（书记 2026-09-06 ②批，出处见 mock/activities.js act-31 注释）──
//   新活动创建线上表决时固化的 voterIds = 按 voterScope 取现时「应到表决人」：
//     仅党员/支委范围 + 剔除滞留成员（运行期「在校/滞留」覆盖优先，缺省静态在校），
//   实现同型最小改：范围规则沿用本文件（formal-only/formal-plus-prep/committee），
//   滞留剔除复用 services/roster.js isDetained（口径单一源 = core/policy-defaults attendance.roster）。
//   历史快照语义：已创建活动（如 mock act-31）的 voteConfig.voterIds 为创建时固化的名单快照，
//   不随成员后续滞留状态变更回改——存量数据不动，仅新创建默认值走现时 roster。
import { PersonStore } from './person.js?v=20260908d';
import { AuthStore } from './auth.js?v=20260908d';
import { isDetained } from './roster.js?v=20260908d';

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
// 2026-09-06 ②批：范围选定后再剔除滞留成员（isDetained，roster 口径单一源）——
//   支部党员大会 formal-only（正式党员，有表决权）/ formal-plus-prep（= 支部大会应到名单，
//   与 roster getMeetingRosterIds({type:'支部党员大会'}) 同集）；线上支委会 committee = 支委名单
//   （若支委滞留则剔）。返回现时名单，供新活动创建时固化；历史活动快照不回改。
export function resolveVoterIds(voterScope) {
  const people = PersonStore.getAll();
  let list;
  if (voterScope === 'committee') {
    list = people.filter((p) => !p.id.startsWith('u_') && AuthStore.isCommissioner(p.role));
  } else if (voterScope === 'formal-only') {
    list = people.filter((p) => !p.id.startsWith('u_') && p.developStage === '正式党员');
  } else if (voterScope === 'formal-plus-prep') {
    list = people.filter((p) => !p.id.startsWith('u_') && (p.developStage === '正式党员' || p.developStage === '预备党员'));
  } else {
    return [];
  }
  return list.filter((p) => !isDetained(p)).map((p) => p.id);
}

export function optionSetOf(activity) {
  const os = activity?.voteConfig?.optionSet;
  return (os && OPTION_SETS[os]) ? OPTION_SETS[os] : OPTION_SETS.deliberative;
}
