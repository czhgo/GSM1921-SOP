// role: [工程师]+[AI]
// server/test/roster.test.mjs — 会议「应到名单」口径 + 表决/候选联动 单测
//
// 2026-09-16 批次 47-F 第三组：**吸纳**原 `roster-vote-link.test.mjs`（2 文件 → 1）。
//   合并判据＝**同域**：两份都在守同一件事——「应到口径」这一个单一源
//   （`attendance.roster` 的 partyStages / excludeDetained）及其三个消费面
//   （应到名单本身 / 会议考勤候选+禁用集合 / 线上表决 voterIds）；且**形态与编号均无冲突**
//   （两份都纯 node、无 chromium；宿主用 a–h 分组、被并件用 ①②③，**不撞号**故无需重编号）。
//   合并的**真实收益**＝删掉**逐字重复**的 localStorage 内存桩与 `PARTY_STAGES` 常量段
//   （两文件各写一遍），并让「应到 = 候选 − 禁用 = 表决名单」三个面在同一文件内可对读。
//   **未并**：`roster-ui-logic.test.mjs`（**不同域**：成员名册表单纯逻辑，与应到口径无关）。
//
// 纯 Node 测试（无浏览器、不起 server）：
//   ── 一、应到口径（原 roster.test.mjs，2026-09-06 支书已批）──
//   覆盖 支部大会/党课应到 = 党员（正式+预备）非滞留；滞留剔除（示范 p5/p9）；党课列席不计应到；
//   党小组会按组口径（本组党员非滞留）；无小组语境不猜测；全选/候选集一致性；p_pc 非党员不入选；
//   policy 常量单一源；组织委员维护（saveResidenceChange）写覆盖+留痕、应到即时剔除。
//   ── 二、应到口径「三小遗留」①②③（原 roster-vote-link.test.mjs，2026-09-06 支书已批）──
//   ① 会议考勤候选「可见候选 + 禁用集合」：滞留者不再 filter 剔除，改为可见但不可选；
//   ② 表决 voterIds 与 roster 联动：resolveVoterIds 现时剔滞留（支部大会应到=formal-plus-prep
//      与 roster 同集；线上支委会=支委名单，若支委滞留则剔）；历史快照 act-31 保持原值；
//   ③ 党小组会组内候选 = 组内党员（非滞留入应到、滞留禁选），与纪检同口径。
// 口径单一源 = core/policy-defaults.js attendance.roster（partyStages / excludeDetained）。
// ⚠️ 对 docs/src 的相对 import 必须带与源码一致的 ?v= query（模块缓存键一致性，同 attendance-batch）。
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { PEOPLE } from '../../docs/src/mock/people.js?v=20260922g';
import { ACTIVITIES } from '../../docs/src/mock/activities.js?v=20260922g';
import { POLICY_DEFAULTS } from '../../docs/src/core/policy-defaults.js?v=20260922g';
import {
  getMeetingRoster, getMeetingRosterIds, getMeetingRosterCandidates, getDetainedMembers,
  getRosterStats, getResidenceOf, saveResidenceChange, getRosterConfig, RESIDENCE_KEY,
} from '../../docs/src/services/roster.js?v=20260922g';
// Q-21-3（2026-09-13）：在册状态枚举单一源 = core/constants.js（原经 roster.js 转出）
import { RESIDENCE } from '../../docs/src/core/constants.js?v=20260922g';
import { defaultVoteConfig, resolveVoterIds } from '../../docs/src/services/vote-config.js?v=20260922g';

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
const cfg = getRosterConfig();
const PARTY_STAGES = cfg.partyStages; // ['正式党员','预备党员']（policy 单一源）
const PARTY_MEMBERS = PEOPLE.filter(p => PARTY_STAGES.includes(p.developStage));
const BRANCH_PARTY = PARTY_MEMBERS.filter(p => p.branchId === 'br-b1' || p.branchId === undefined);
// 支部党员大会会议应到（党员非滞留 19）与线上表决名单的关系：
//   resolveVoterIds('formal-plus-prep') === getMeetingRosterIds({type:'支部党员大会'})（同集断言见 ②）
const BRANCH_ROSTER = getMeetingRosterIds({ type: '支部党员大会' });
// 历史快照 act-31（mock/activities.js，数据保持原值不动）：voterIds = 12 名正式党员（含滞留 p5/p9）
const ACT31 = ACTIVITIES.find(a => a.id === 'act-31');
const FORMAL_IDS = ['p1', 'p2', 'p3', 'p4', 'p5', 'p8', 'p9', 'p10', 'p11', 'p12', 'p13', 'p14'];

// ════════════════════════════════════════════════════════════════
// 一、应到口径（原 roster.test.mjs）
// ════════════════════════════════════════════════════════════════

// ── a) policy 常量一致性 ─────────────────────────────────────
test('policy 常量：roster 口径派生自 policy-defaults attendance.roster（partyStages/excludeDetained）', () => {
  assert.deepEqual(cfg, POLICY_DEFAULTS.attendance.roster);
  assert.deepEqual(PARTY_STAGES, ['正式党员', '预备党员']);
  assert.equal(cfg.excludeDetained, true);
});

// ── b) 在册党员基数（含示范滞留）──────────────────────────────
test('基数：本支部在册党员 21（正式 12 + 预备 9）；示范滞留 2 名（p5/p9 均为正式党员）', () => {
  const full = BRANCH_PARTY.filter(p => p.developStage === '正式党员').length;
  const probation = BRANCH_PARTY.filter(p => p.developStage === '预备党员').length;
  assert.equal(full, 12);
  assert.equal(probation, 9);
  assert.equal(BRANCH_PARTY.length, 21);
  const detained = getDetainedMembers();
  assert.equal(detained.length, 2);
  assert.deepEqual(detained.map(p => p.id).sort(), ['p5', 'p9']);
  assert.ok(detained.every(p => p.developStage === '正式党员'), '示范滞留均为正式党员');
});

// ── c) 支部党员大会应到 = 党员非滞留（21 − 2 = 19）────────────
test('支部党员大会应到 = 党员非滞留 = 19（在册党员 21 − 滞留 2；示范 p5/p9 剔除）', () => {
  const roster = getMeetingRoster({ type: '支部党员大会' });
  assert.equal(roster.length, 19);
  assert.equal(roster.length, getRosterStats({ type: '支部党员大会' }).expected);
  for (const p of roster) {
    assert.ok(PARTY_STAGES.includes(p.developStage), `${p.id} 须为党员`);
    assert.notEqual(getResidenceOf(p).residenceStatus, RESIDENCE.DETAINED, `${p.id} 不应滞留`);
  }
  const ids = roster.map(p => p.id);
  assert.ok(!ids.includes('p5'), '滞留者 p5 不在应到');
  assert.ok(!ids.includes('p9'), '滞留者 p9 不在应到');
  assert.ok(ids.includes('p1') && ids.includes('p16'), '在校党员（正式 p1/预备 p16）在应到');
});

// ── d) 党课列席不计应到 ─────────────────────────────────────
test('党课列席（积极分子/发展对象）不计应到：仅党员进候选', () => {
  const ids = new Set(getMeetingRosterIds({ type: '党课' }));
  for (const p of PEOPLE) {
    if (PARTY_STAGES.includes(p.developStage)) {
      if (getResidenceOf(p).residenceStatus === RESIDENCE.DETAINED) {
        assert.ok(!ids.has(p.id), `${p.id}（滞留党员）不在应到`);
      } else {
        assert.ok(ids.has(p.id), `${p.id}（党员）应在应到`);
      }
    } else {
      assert.ok(!ids.has(p.id), `${p.id}（${p.developStage || '非党员'}）不应计入应到`);
    }
  }
  // 明确示例：发展对象 p6/p22、积极分子 p7/p15/p21 均不计
  for (const id of ['p6', 'p22', 'p7', 'p15', 'p21']) assert.ok(!ids.has(id), `${id} 党课列席不计应到`);
});

// ── e) 党小组会 = 本组党员非滞留 ─────────────────────────────
test('党小组会按组口径：第二党小组应到 7（组内党员 8 − 滞留 p5）', () => {
  const roster = getMeetingRoster({ type: '党小组会', groupId: '第二党小组' });
  const ids = roster.map(p => p.id);
  assert.equal(roster.length, 7);
  assert.ok(roster.every(p => p.partyGroup === '第二党小组'), '应到均为本组成员');
  assert.ok(roster.every(p => PARTY_STAGES.includes(p.developStage)), '应到均为本组党员');
  assert.ok(!ids.includes('p5'), '组内滞留者 p5 剔除');
  assert.ok(['p2', 'p8', 'p10', 'p14', 'p19', 'p20', 'p29'].every(id => ids.includes(id)), '组内在校党员全在应到');
  assert.ok(!ids.includes('p1') && !ids.includes('p4'), '他组成员不串组');
});

test('党小组会：缺 groupId 或缺小组语境 → 空名单（不猜测全支部）', () => {
  assert.equal(getMeetingRoster({ type: '党小组会' }).length, 0);
  assert.equal(getMeetingRoster({ type: '党小组会', groupId: '不存在的组' }).length, 0);
});

// ── f) 候选集/全选范围一致性 + p_pc 顺带剔除 ─────────────────
test('候选集 = 全选范围（getMeetingRosterIds 同源）；p_pc 党委组织员（非党员/非本支部）不入选', () => {
  const roster = getMeetingRoster({ type: '支部党员大会' });
  assert.deepEqual(getMeetingRosterIds({ type: '支部党员大会' }), roster.map(p => p.id));
  assert.ok(!getMeetingRosterIds({ type: '支部党员大会' }).includes('p_pc'), 'p_pc 不再出现在全选范围');
  assert.ok(!getMeetingRosterIds({ type: '支部党员大会', branchId: 'br-b1' }).includes('p_pc'));
  // 在校缺省：未标注 residenceStatus 的人员默认「在校」
  const p1 = PEOPLE.find(p => p.id === 'p1');
  assert.equal(getResidenceOf(p1).residenceStatus, RESIDENCE.CAMPUS);
});

// ── g) 应到清点统计 ─────────────────────────────────────────
test('getRosterStats：支部大会 expected 19 = partyTotal 21 − detainedParty 2', () => {
  assert.deepEqual(getRosterStats({ type: '支部党员大会' }), { expected: 19, partyTotal: 21, detainedParty: 2 });
  // 党课/组织生活会同口径
  assert.equal(getRosterStats({ type: '党课' }).expected, 19);
  assert.equal(getRosterStats({ type: '组织生活会' }).expected, 19);
  // 小组口径统计
  assert.deepEqual(getRosterStats({ type: '党小组会', groupId: '第二党小组' }), { expected: 7, partyTotal: 8, detainedParty: 1 });
  assert.deepEqual(getRosterStats({ type: '党小组会' }), { expected: 0, partyTotal: 0, detainedParty: 0 });
});

// ── h) 组织委员维护（写覆盖 + 留痕；应到即时剔除；改回恢复）──
// 写覆盖用例集中在第一部分末位：内存桩内写入不影响静态种子；用例结束清桩保持文件内纯净
//（第二部分 ② 另有「支委滞留」写覆盖用例，自行 try/finally 收尾；两者互不残留）。
test('saveResidenceChange：写覆盖 + 留痕 {from,to,updatedBy,updatedAt}；应到即时剔除；无变化不产生冗余留痕', () => {
  const rosterOf = () => getMeetingRosterIds({ type: '支部党员大会' });
  assert.ok(rosterOf().includes('p1'), '前置：p1 在校在应到');

  // 标记 p1 滞留（组织委员 p11 操作）
  const r1 = saveResidenceChange({ personId: 'p1', actorId: 'p11', status: RESIDENCE.DETAINED, note: '单测：临时离校' });
  assert.ok(r1);
  assert.equal(r1.residenceStatus, RESIDENCE.DETAINED);
  assert.equal(r1.residenceNote, '单测：临时离校');
  assert.equal(r1.residenceHistory.length, 1);
  const e1 = r1.residenceHistory[0];
  assert.deepEqual({ from: e1.from, to: e1.to, updatedBy: e1.updatedBy, note: e1.note },
    { from: RESIDENCE.CAMPUS, to: RESIDENCE.DETAINED, updatedBy: 'p11', note: '单测：临时离校' });
  assert.ok(e1.updatedAt, '留痕含 updatedAt');
  assert.ok(!rosterOf().includes('p1'), '标记后应到即时剔除 p1');
  assert.ok(getDetainedMembers().map(p => p.id).includes('p1'));

  // 无实质变化（状态+备注同现值）→ 不写覆盖、不追加留痕
  assert.equal(saveResidenceChange({ personId: 'p1', actorId: 'p11', status: RESIDENCE.DETAINED, note: '单测：临时离校' }), null);

  // 改回在校 → 追加第二条留痕（from 滞留 → to 在校）
  const r2 = saveResidenceChange({ personId: 'p1', actorId: 'p11', status: RESIDENCE.CAMPUS, note: '' });
  assert.ok(r2);
  assert.equal(r2.residenceStatus, RESIDENCE.CAMPUS);
  assert.equal(r2.residenceHistory.length, 2);
  const e2 = r2.residenceHistory[1];
  assert.deepEqual({ from: e2.from, to: e2.to }, { from: RESIDENCE.DETAINED, to: RESIDENCE.CAMPUS });
  assert.ok(rosterOf().includes('p1'), '改回在校后恢复应到');

  // 非法状态 / 未知人员 → null
  assert.equal(saveResidenceChange({ personId: 'p1', actorId: 'p11', status: '离校' }), null);
  assert.equal(saveResidenceChange({ personId: 'p_unknown', actorId: 'p11', status: RESIDENCE.DETAINED }), null);

  // 用例收尾：清空桩，避免对同文件后续用例造成残留（静态种子不受影响）
  localStorage.removeItem(RESIDENCE_KEY);
  assert.equal(getDetainedMembers().length, 2, '清理后仅剩静态示范滞留 2 名');
});

// ════════════════════════════════════════════════════════════════
// 二、应到口径「三小遗留」①②③（原 roster-vote-link.test.mjs）
// ════════════════════════════════════════════════════════════════

// ── ① 可见候选 + 禁用集合（纪检会议考勤「滞留者可见但不可选」）──
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

// ── ② 表决 voterIds 与 roster 联动（默认生成按活动类型取应到；历史快照不动）──
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

// ── ③ 组长侧党小组会考勤候选（接 roster；与纪检同口径）──
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
