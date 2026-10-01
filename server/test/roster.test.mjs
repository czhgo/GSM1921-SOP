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
// 形态（提速批：**A 类（纯 node + mock 静态种子）→ B 类（起内存服务打 API）**，
//   支书裁定「`roster.test.mjs` → 改成打 API」）：
//   改造前断言对象是 `docs/src/data/mock/people.js` / `docs/src/data/mock/activities.js` 的**静态种子**；
//   现改为：起 `:memory:` 服务 → `seedDatabase` → **真登录**取 token → `setDataSource('api')` → `init()`
//   ⇒ 应到名单 / 候选+禁用集合 / 表决名单 / 滞留名单全部读**服务端 users**（init 灌入 mockDB 缓存）。
//   体例照同批姊妹件 `group-view.test.mjs`，及既有 B 类先例 `permission-gate.test.mjs` / `server-base.test.mjs`。
//   **判据一字未改**（应到口径 / 基数 / 字段 / 筛选 / 在册状态 / 导出等断言原样保留），**只换数据来源**；
//   另加 S1「两形态同源」断言——同一批读数在 api 形态与 mock 形态（静态种子）**逐值一致**，
//   正是 `mock-integrity` 所守「前端种子＝服务端种子」的等价性（在此可断言，不靠旁证）。
//
// 覆盖：
//   ── 一、应到口径（原 roster.test.mjs，2026-09-06 支书已批）──
//   覆盖 支部大会/党课应到 = 党员（正式+预备）非滞留；滞留剔除（示范 p5/p9）；党课列席不计应到；
//   党小组会按组口径（本组党员非滞留）；无小组语境不猜测；全选/候选集一致性；p_pc 非党员不入选；
//   policy 常量单一源；组织委员维护（saveResidenceChange）写覆盖+留痕、应到即时剔除。
//   ── 二、应到口径「三小遗留」①②③（原 roster-vote-link.test.mjs，2026-09-06 支书已批）──
//   ① 会议考勤候选「可见候选 + 禁用集合」：滞留者不再 filter 剔除，改为可见但不可选；
//   ② 表决 voterIds 与 roster 联动：resolveVoterIds 现时剔滞留（支部大会应到=formal-plus-prep
//      与 roster 同集；线上支委会=支委名单，若支委滞留则剔）；历史快照 act-31 保持原值；
//   ③ 党小组会组内候选 = 组内党员（非滞留入应到、滞留禁选），与纪检同口径。
// 口径单一源 = core/domain/policy-defaults.js attendance.roster（partyStages / excludeDetained）。
// ⚠️ 对 docs/src 的相对 import 必须带与源码一致的 ?v= query（模块缓存键一致性，同 attendance-batch）——
//   **api 形态下尤其致命**：少了 `?v=` 就是**两份 data-adapter 实例**，适配器注册不到、`init()` 直接抛
//   「API 适配器尚未实现」（`group-view.test.mjs` 自述实测踩过一次）。
import { test, after } from 'node:test';
import assert from 'node:assert/strict';

// ── localStorage / sessionStorage 内存桩（成员档案读链惰性访问需要；照 group-view.test 同款）──
// roster.js 在函数体内以 typeof 守卫惰性访问 → 桩在 import 之后、用例之前建立即可。
function makeStorage(init = {}) {
  const m = new Map(Object.entries(init).map(([k, v]) => [String(k), String(v)]));
  return {
    getItem: (k) => (m.has(String(k)) ? m.get(String(k)) : null),
    setItem: (k, v) => m.set(String(k), String(v)),
    removeItem: (k) => { m.delete(String(k)); },
    clear: () => { m.clear(); },
    key: (i) => [...m.keys()][i] ?? null,
    get length() { return m.size; },
  };
}
globalThis.localStorage = makeStorage();

import { createApp } from '../app.js';
import { seedDatabase } from '../seed.js';
import { mockDB } from '../../docs/src/core/domain/domain.js?v=20261001k';
import { PersonStore } from '../../docs/src/services/member/person.js?v=20261001k';
import { POLICY_DEFAULTS } from '../../docs/src/core/domain/policy-defaults.js?v=20261001k';
import {
  getMeetingRoster, getMeetingRosterIds, getMeetingRosterCandidates, getDetainedMembers,
  getRosterStats, getResidenceOf, saveResidenceChange, getRosterConfig, RESIDENCE_KEY,
} from '../../docs/src/services/member/roster.js?v=20261001k';
// Q-21-3（2026-09-13）：在册状态枚举单一源 = core/domain/constants.js（原经 roster.js 转出）
import { RESIDENCE } from '../../docs/src/core/domain/constants.js?v=20261001k';
import { defaultVoteConfig, resolveVoterIds } from '../../docs/src/services/activity/vote-config.js?v=20261001k';
import { getRuntimeMode, init, setDataSource } from '../../docs/src/data/data-adapter.js?v=20261001k';
// mock 形态对照源（**仅 S1「两形态同源」断言用**；其余用例的断言对象一律是服务端数据）：
//   前端静态种子 PEOPLE / ACTIVITIES 与服务端种子是同源两份，S1 即断言二者读数逐值一致。
import { PEOPLE } from '../../docs/src/data/mock/people.js?v=20261001k';
import { ACTIVITIES } from '../../docs/src/data/mock/activities.js?v=20261001k';

// ════════════════════════════════════════════════════════════════
//  B 类现场（api 形态）：内存服务 + 真登录取 token + init() 把服务端全量灌进 mockDB 缓存
// ════════════════════════════════════════════════════════════════
const _app = createApp({ dbPath: ':memory:' });
await seedDatabase(_app.locals.db);
const _server = _app.listen(0);
const _base = `http://127.0.0.1:${_server.address().port}`;
const _loginRes = await fetch(`${_base}/api/v1/auth/login`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ personId: 'p13' }),
});
assert.equal(_loginRes.status, 200, 'B 类现场：真登录须 200（DISABLE_PASSWORD_CHECK=1 时 personId 直登）');
const { token: _token } = await _loginRes.json();
globalThis.sessionStorage = makeStorage({ 'gsm1921-api-token': _token });
setDataSource('api', { apiBaseUrl: _base, authToken: _token });
await init();

after(async () => {
  _server.closeAllConnections?.();
  await new Promise((r) => _server.close(r));
});

// 形态断言（**可断言**，不靠旁证）：本文件用例必须跑在 api 形态上
test('S0 形态：api 形态 + 有会话 token（数据来自服务端，不是本地静态种子）', () => {
  const mode = getRuntimeMode();
  assert.equal(mode.source, 'api', `本文件必须在 api 形态下跑（实测 ${JSON.stringify(mode)}）`);
  assert.equal(mode.hasToken, true, 'api 形态应存在会话 token');
});

// ── S1 两形态同源（防线）：同一批读数在 api 形态与 mock 形态（静态种子）逐值一致 ──
// 守的是 `mock-integrity` 那条「前端种子＝服务端种子」的等价性：同一批读数在两种形态下**逐值相同**，
// 同时证明「api 读链读的确实是服务端数据」（否则空集/错集会立刻与 mock 形态读数不等）。
test('S1 两形态同源：api 形态读数与原 mock 形态（静态种子）逐值一致（= mock-integrity 所守等价性）', () => {
  const read = () => ({
    members: PersonStore.getMembers().map(p => [p.id, p.name, p.developStage, p.partyGroup, p.role, p.branchId]),
    detained: getDetainedMembers().map(p => [p.id, getResidenceOf(p).residenceStatus, p.residenceNote]),
    branchRoster: getMeetingRosterIds({ type: '支部党员大会' }),
    lessonRoster: getMeetingRosterIds({ type: '党课' }),
    group2Roster: getMeetingRosterIds({ type: '党小组会', groupId: '第二党小组' }),
    branchCandidates: (() => {
      const { candidates, disabledIds } = getMeetingRosterCandidates({ type: '支部党员大会' });
      return { ids: candidates.map(p => p.id), disabledIds };
    })(),
    stats: getRosterStats({ type: '支部党员大会' }),
    group2Stats: getRosterStats({ type: '党小组会', groupId: '第二党小组' }),
    formalOnly: resolveVoterIds('formal-only'),
    committee: resolveVoterIds('committee'),
    formalPlusPrep: resolveVoterIds('formal-plus-prep'),
  });
  const apiRead = read();
  let mockRead;
  try {
    setDataSource('mock'); // 切回 mock 形态：PersonStore 读链取静态种子 PEOPLE
    mockRead = read();
  } finally {
    setDataSource('api'); // 复位（后续用例仍须在 api 形态）
  }
  assert.deepEqual(apiRead, mockRead, 'api 形态读数须与 mock 形态逐值一致（前端种子 = 服务端种子）');
  assert.equal(apiRead.branchRoster.length, 19, '且 api 形态确读到服务端数据（非空集冒充）');
  // 人员域同源（直比 id 集）：服务端 users ≡ 前端静态 PEOPLE
  assert.deepEqual(PersonStore.getMembers().map(p => p.id), PEOPLE.map(p => p.id), '服务端 users id 集 ≡ 前端 PEOPLE');
  // 活动域同源：服务端 activities（mockDB 缓存）与原静态种子逐值一致（历史快照 act-31 取值）
  const apiAct31 = (mockDB.activities || []).find(a => a.id === 'act-31');
  const mockAct31 = ACTIVITIES.find(a => a.id === 'act-31');
  assert.deepEqual(apiAct31?.voteConfig?.voterIds, mockAct31?.voteConfig?.voterIds, 'act-31 voterIds 两形态一致');
});

// ── 常量（口径单一源；数据来自服务端 users —— api 形态 init() 已灌入 mockDB 缓存）──
const cfg = getRosterConfig();
const PARTY_STAGES = cfg.partyStages; // ['正式党员','预备党员']（policy 单一源）
const MEMBERS = PersonStore.getMembers();
const PARTY_MEMBERS = MEMBERS.filter(p => PARTY_STAGES.includes(p.developStage));
const BRANCH_PARTY = PARTY_MEMBERS.filter(p => p.branchId === 'br-b1' || p.branchId === undefined);
// 支部党员大会会议应到（党员非滞留 19）与线上表决名单的关系：
//   resolveVoterIds('formal-plus-prep') === getMeetingRosterIds({type:'支部党员大会'})（同集断言见 ②）
const BRANCH_ROSTER = getMeetingRosterIds({ type: '支部党员大会' });
// 历史快照 act-31（服务端 activities，与 data/mock/activities.js 同源）：voterIds = 12 名正式党员（含滞留 p5/p9）
const ACT31 = (mockDB.activities || []).find(a => a.id === 'act-31');
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
  for (const p of MEMBERS) {
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
  const p1 = MEMBERS.find(p => p.id === 'p1');
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
// 写覆盖用例集中在第一部分末位：内存桩内写入不影响服务端种子；用例结束清桩保持文件内纯净
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

  // 用例收尾：清空桩，避免对同文件后续用例造成残留（服务端种子不受影响）
  localStorage.removeItem(RESIDENCE_KEY);
  assert.equal(getDetainedMembers().length, 2, '清理后仅剩服务端示范滞留 2 名');
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
  assert.ok(formal.every(id => { const p = MEMBERS.find(x => x.id === id); return p && p.developStage === '正式党员'; }));
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

// ── 收尾清理：确保本文件不留运行期覆盖（服务端种子不受影响）──
test('清理：移除内存桩覆盖，恢复服务端基线（滞留仅示范 p5/p9）', () => {
  localStorage.removeItem(RESIDENCE_KEY);
  assert.equal(getDetainedMembers().length, 2);
  assert.equal(getMeetingRosterIds({ type: '支部党员大会' }).length, 19);
});

// ── i) 在册状态单轨化（2026-09-24 批次 169）：api 形态服务端为唯一权威 ──
// 支书逐字「浏览器缓存固然有用但不能什么都依靠浏览器缓存」——本断言即「清缓存不丢在册状态」的机器判据：
//   在 api 形态下，**往本机覆盖键直接塞一份伪造覆盖**（等价于旧版残留 / 另一台设备的本机态），
//   在册/滞留读数与应到名单**一律不受其影响**（本模块在 api 形态不读 localStorage 覆盖）。
test('api 形态单轨：本机 RESIDENCE_KEY 覆盖对在册/滞留读数无效（服务端单一权威，清缓存不丢状态）', () => {
  localStorage.setItem(RESIDENCE_KEY, JSON.stringify({
    p1: { residenceStatus: RESIDENCE.DETAINED, residenceNote: '本机伪造覆盖', residenceHistory: [] },
  }));
  try {
    assert.equal(getResidenceOf(PersonStore.getById('p1')).residenceStatus, RESIDENCE.CAMPUS,
      'api 形态不读本机覆盖：p1 仍为服务端值「在校」');
    assert.ok(getMeetingRosterIds({ type: '支部党员大会' }).includes('p1'), 'p1 仍在应到（本机覆盖未生效）');
    assert.deepEqual(getDetainedMembers().map(p => p.id).sort(), ['p5', 'p9'], '滞留名单仅服务端示范 p5/p9');
  } finally {
    localStorage.removeItem(RESIDENCE_KEY);
  }
});
