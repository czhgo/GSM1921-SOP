// role: [工程师]+[AI]
// server/test/roster.test.mjs — 会议「应到名单」口径单测（S1–S4 滞留党员设计，2026-09-06 书记已批）
// 纯 Node 测试（无浏览器、不起 server）：
//   覆盖 支部大会/党课应到 = 党员（正式+预备）非滞留；滞留剔除（示范 p5/p9）；党课列席不计应到；
//   党小组会按组口径（本组党员非滞留）；无小组语境不猜测；全选/候选集一致性；p_pc 非党员不入选；
//   policy 常量单一源；组织委员维护（saveResidenceChange）写覆盖+留痕、应到即时剔除。
// 口径单一源 = core/policy-defaults.js attendance.roster（partyStages / excludeDetained）。
// ⚠️ 对 docs/src 的相对 import 必须带与源码一致的 ?v=20260903c query（模块缓存键一致性，同 attendance-batch）。
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { PEOPLE } from '../../docs/src/mock/people.js?v=20260908c';
import { POLICY_DEFAULTS } from '../../docs/src/core/policy-defaults.js?v=20260908c';
import {
  getMeetingRoster, getMeetingRosterIds, getDetainedMembers, getRosterStats,
  getResidenceOf, saveResidenceChange, getRosterConfig, RESIDENCE, RESIDENCE_KEY,
} from '../../docs/src/services/roster.js?v=20260908c';

// ── localStorage 内存桩（仅 roster 运行期覆盖路径需要；node 默认无 localStorage）──
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
// 置于末位：内存桩内写入不影响静态种子；用例结束清理 _store 保持文件内纯净。
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
