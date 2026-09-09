// role: [工程师]+[AI]
// server/test/roster-vote-link.test.mjs — 「应到口径三小遗留」①②③ 服务层单测（2026-09-06 书记已批）
// 纯 Node 测试（无浏览器、不起 server）：
//   ① 会议考勤候选「可见候选 + 禁用集合」：滞留者不再 filter 剔除，改为可见但不可选
//      （getMeetingRosterCandidates → candidates=党员含滞留 / disabledIds=滞留党员）；
//   ② 表决 voterIds 与 roster 联动：resolveVoterIds 现时剔滞留（支部大会应到=formally-prep
//      与 roster 同集；线上支委会=支委名单，若支委滞留则剔）；历史快照 act-31 保持原值；
//   ③ 党小组会组内候选 = 组内党员（非滞留入应到、滞留禁选），与纪检同口径。
// ⚠️ 对 docs/src 的相对 import 必须带与源码一致的 ?v=20260903c query（模块缓存键一致性，同 roster.test.mjs）。
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { PEOPLE } from '../../docs/src/mock/people.js?v=20260909e';
import { ACTIVITIES } from '../../docs/src/mock/activities.js?v=20260909e';
import { POLICY_DEFAULTS } from '../../docs/src/core/policy-defaults.js?v=20260909e';
import {
  getMeetingRosterCandidates, getMeetingRosterIds, getRosterStats,
  saveResidenceChange, getDetainedMembers, getResidenceOf,
  RESIDENCE, RESIDENCE_KEY,
} from '../../docs/src/services/roster.js?v=20260909e';
import { defaultVoteConfig, resolveVoterIds } from '../../docs/src/services/vote-config.js?v=20260909e';

// ── localStorage 内存桩（saveResidenceChange 运行期覆盖用例需要；node 默认无 localStorage）──
// roster.js 在函数体内以 typeof 守卫惰性访问 → 桩在 import 之后、用例之前建立即可。
const _store = new Map();
globalThis.localStorage = {
  getItem: (k) => (_store.has(String(k)) ? _store.get(String(k)) : null),
  setItem: (k, v) => _store.set(String(k), String(v)),
  removeItem: (k) => { _store.delete(String(k)); },
  clear: () => { _store.clear(); },
};

// ── 常量（口径单一源）────────────────────────────────────────
const cfg = POLICY_DEFAULTS.attendance.roster;
const PARTY_STAGES = cfg.partyStages; // ['正式党员','预备党员']
// 支部党员大会会议应到（党员非滞留 19）与线上表决名单的关系：
//   resolveVoterIds('formal-plus-prep') === getMeetingRosterIds({type:'支部党员大会'})（同集断言见下）
const BRANCH_ROSTER = getMeetingRosterIds({ type: '支部党员大会' });
// 历史快照 act-31（mock/activities.js，数据保持原值不动）：voterIds = 12 名正式党员（含滞留 p5/p9）
const ACT31 = ACTIVITIES.find(a => a.id === 'act-31');
const FORMAL_IDS = ['p1', 'p2', 'p3', 'p4', 'p5', 'p8', 'p9', 'p10', 'p11', 'p12', 'p13', 'p14'];

// ════════════════════════════════════════════════════════════════
// ① 可见候选 + 禁用集合（纪检会议考勤「滞留者可见但不可选」）
// ════════════════════════════════════════════════════════════════
test('①支部会议候选 = 党员（含滞留 21 人）全可见；禁用集合 = 滞留党员 p5/p9；应到 = 候选 − 禁用', () => {
  const { candidates, disabledIds } = getMeetingRosterCandidates({ type: '支部党员大会' });
  assert.equal(candidates.length, 21, '候选 = 在册党员（正式 12 + 预备 9），含滞留者');
  assert.ok(candidates.every(p => PARTY_STAGES.includes(p.developStage)), '候选全部为党员');
  assert.deepEqual([...disabledIds].sort(), ['p5', 'p9'], '禁用集合 = 滞留党员（可见但不可选）');
  // 滞留者仍在候选（可见），而非被剔除
  assert.ok(candidates.some(p => p.id === 'p5') && candidates.some(p => p.id === 'p9'), '滞留者保留在候选（可见）');
  // 党课列席/非党员/p_pc 不可见
  for (const id of ['p6', 'p7', 'p15', 'p21', 'p_pc']) {
    assert.ok(!candidates.some(p => p.id === id), `${id} 不在候选`);
  }
  // 应到名单 = 候选 − 禁用（getMeetingRosterIds 同源一致）
  const candidateIds = new Set(candidates.map(p => p.id));
  const rosterIds = getMeetingRosterIds({ type: '支部党员大会' });
  assert.equal(rosterIds.length, candidates.length - disabledIds.length);
  assert.ok(rosterIds.every(id => candidateIds.has(id) && !disabledIds.includes(id)), '应到 ⊆ 候选且不含禁用');
});

test('①党课/组织生活会同口径：党课列席不计候选（仅党员 21 可见）', () => {
  for (const type of ['党课', '组织生活会']) {
    const { candidates, disabledIds } = getMeetingRosterCandidates({ type });
    assert.equal(candidates.length, 21, `${type} 候选 = 党员 21（含滞留，可见但不可选）`);
    assert.deepEqual([...disabledIds].sort(), ['p5', 'p9']);
    for (const id of ['p6', 'p22', 'p7', 'p15']) {
      assert.ok(!candidates.some(p => p.id === id), `${type} 下 ${id}（列席/非党员）不可见`);
    }
  }
});

test('①党小组会候选 = 本组党员（含滞留）；第二党小组 8 可见、p5 禁选；应到 7', () => {
  const { candidates, disabledIds } = getMeetingRosterCandidates({ type: '党小组会', groupId: '第二党小组' });
  const ids = candidates.map(p => p.id);
  assert.equal(candidates.length, 8, '第二党小组党员 8（含滞留 p5）');
  assert.ok(candidates.every(p => p.partyGroup === '第二党小组'), '候选均为本组成员');
  assert.ok(ids.includes('p5'), '组内滞留者 p5 可见（灰态禁选）');
  assert.deepEqual(disabledIds, ['p5']);
  assert.deepEqual(getMeetingRosterIds({ type: '党小组会', groupId: '第二党小组' }),
    ids.filter(id => !disabledIds.includes(id)), '组内应到 = 候选 − 禁用');
  assert.ok(!ids.includes('p1') && !ids.includes('p4'), '他组成员不串组');
  // 无滞留的组：第三党小组 4 党员、禁用空
  const g3 = getMeetingRosterCandidates({ type: '党小组会', groupId: '第三党小组' });
  assert.equal(g3.candidates.length, 4);
  assert.deepEqual(g3.disabledIds, []);
});

test('①党小组会缺 groupId → 空候选（不猜测全支部）', () => {
  assert.deepEqual(getMeetingRosterCandidates({ type: '党小组会' }), { candidates: [], disabledIds: [] });
});

// ════════════════════════════════════════════════════════════════
// ② 表决 voterIds 与 roster 联动（默认生成按活动类型取应到；历史快照不动）
// ════════════════════════════════════════════════════════════════
test('②resolveVoterIds 现时剔滞留：formal-only = 10（12 正式 − 滞留 p5/p9），committee = 支委 5', () => {
  const formal = resolveVoterIds('formal-only');
  assert.equal(formal.length, 10, '正式党员 12 − 滞留 2 = 10（剔除 p5/p9）');
  assert.ok(!formal.includes('p5') && !formal.includes('p9'), '滞留党员不出现在线上表决名单');
  assert.ok(formal.includes('p1') && formal.includes('p14'), '在校正式党员在名单');
  assert.ok(formal.every(id => { const p = PEOPLE.find(x => x.id === id); return p && p.developStage === '正式党员'; }));
  // 线上支委会 = 支委名单（权威 5 人 p10~p14，均非滞留）
  assert.deepEqual(resolveVoterIds('committee'), ['p10', 'p11', 'p12', 'p13', 'p14']);
});

test('②支部党员大会线上表决「正式+预备」范围 = 支部大会应到名单（与 roster 同集 19）', () => {
  const prep = resolveVoterIds('formal-plus-prep');
  assert.deepEqual([...prep].sort(), [...BRANCH_ROSTER].sort(), 'formal-plus-prep ≡ getMeetingRosterIds({type:支部党员大会})');
  assert.equal(prep.length, 19);
  assert.ok(!prep.includes('p5') && !prep.includes('p9'));
});

test('②若支委滞留则剔（线上支委会=支委名单按现时状态）：标记 p10 滞留 → committee 剔除 p10', () => {
  const before = resolveVoterIds('committee');
  assert.ok(before.includes('p10'), '前置：p10 在支委名单');
  saveResidenceChange({ personId: 'p10', actorId: 'p11', status: RESIDENCE.DETAINED, note: '单测：临时离校' });
  try {
    const after = resolveVoterIds('committee');
    assert.equal(after.length, 4, '滞留支委 p10 被剔');
    assert.ok(!after.includes('p10'));
    assert.ok(after.includes('p11') && after.includes('p14'), '其余支委保留');
    // 会议应到同步剔除 p10
    assert.ok(!getMeetingRosterIds({ type: '支部党员大会' }).includes('p10'));
  } finally {
    saveResidenceChange({ personId: 'p10', actorId: 'p11', status: RESIDENCE.CAMPUS, note: '' });
  }
  assert.equal(resolveVoterIds('committee').length, 5, '清理后恢复 5 支委');
});

test('②历史快照不动：act-31 voterIds 保持原值（12 正式党员，含滞留 p5/p9）；仅新创建默认走现时 roster', () => {
  // 数据原样（未随滞留口径改动）
  assert.ok(ACT31, 'act-31 存在');
  assert.deepEqual(ACT31.voteConfig.voterIds, FORMAL_IDS, '历史快照 12 人原值（含 p5/p9，不回改）');
  assert.equal(ACT31.voteConfig.voterScope, 'formal-only');
  // 对照：同场景「新创建」默认（defaultVoteConfig + resolveVoterIds 现时生成）= 剔除滞留后的 10 人
  const fresh = defaultVoteConfig('branch-party-meeting');
  assert.equal(fresh.voterScope, 'formal-only');
  const freshIds = resolveVoterIds(fresh.voterScope);
  assert.equal(freshIds.length, 10);
  assert.ok(!freshIds.includes('p5') && !freshIds.includes('p9'), '新默认剔除滞留（与 act-31 历史快照的差异即滞留口径）');
});

test('②新支委会活动默认生成（workforce.js 创建点同型公式）：voterIds = 现时支委应到', () => {
  // workforce.js createWorkforceProposalActivity 现为：
  //   voteConfig: { ...defaultVoteConfig('branch-committee'), voterIds: resolveVoterIds('committee') }
  const vc = { ...defaultVoteConfig('branch-committee'), voterIds: resolveVoterIds('committee') };
  assert.equal(vc.optionSet, 'deliberative');
  assert.equal(vc.voterScope, 'committee');
  assert.deepEqual(vc.voterIds, ['p10', 'p11', 'p12', 'p13', 'p14'], '新支委会活动 voterIds = 支委应到名单');
});

// ════════════════════════════════════════════════════════════════
// ③ 组长侧党小组会考勤候选（接 roster；与纪检同口径）
// ════════════════════════════════════════════════════════════════
test('③组内候选 = roster：第二党小组候选 8（党员）→ 禁用 p5 → 上传可选 = 应到 7；统计一致', () => {
  const { candidates, disabledIds } = getMeetingRosterCandidates({ type: '党小组会', groupId: '第二党小组' });
  const stats = getRosterStats({ type: '党小组会', groupId: '第二党小组' });
  assert.deepEqual(stats, { expected: 7, partyTotal: 8, detainedParty: 1 });
  assert.equal(candidates.length, stats.partyTotal, '候选 = 组内党员数（可见全部）');
  assert.equal(disabledIds.length, stats.detainedParty, '禁用 = 组内滞留党员数');
  assert.equal(candidates.length - disabledIds.length, stats.expected, '可选（应到）= expected');
  // 组长上传的可用集合（排除禁用后）= getMeetingRosterIds
  assert.deepEqual(
    candidates.map(p => p.id).filter(id => !disabledIds.includes(id)).sort(),
    getMeetingRosterIds({ type: '党小组会', groupId: '第二党小组' }).sort()
  );
  // 滞留者可见：badge/备注可展示
  const p5 = candidates.find(p => p.id === 'p5');
  assert.equal(getResidenceOf(p5).residenceStatus, RESIDENCE.DETAINED);
  assert.ok(p5.residenceNote, '滞留备注随候选可见（title 备注源）');
});

// ── 收尾清理：确保本文件不留运行期覆盖（静态种子不受影响）──
test('清理：移除内存桩覆盖，恢复静态基线（滞留仅示范 p5/p9）', () => {
  localStorage.removeItem(RESIDENCE_KEY);
  assert.equal(getDetainedMembers().length, 2);
  assert.equal(getMeetingRosterIds({ type: '支部党员大会' }).length, 19);
});
