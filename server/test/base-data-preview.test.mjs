// role: [工程师]+[AI]
// server/test/base-data-preview.test.mjs — 成员基础数据「预览 override」（立项④阶段三·目标1，2026-09-06 书记已认可）
// 纯 Node 测试（无浏览器、不起 server）：
//   buildPreviewTemplate 导出本支部成员名册模板（50 名，id 白名单；p_pc 党委组织员不属于支部）
//   sanitizePreview 净化：合法通过 / 非法党小组 / 非法发展阶段 / 非法滞留状态 / 空姓名与白名单外 id 丢弃；
//     stats 与 roster 口径一致（支部党员大会应到 = 党员 − 滞留、小组按组）
//   applyPreview / clearPreview 读写 localStorage 预览键；PersonStore / roster 应到链读取叠加即时变化
// 口径单一源 = core/policy-defaults.js attendance.roster（与 services/roster.js 同源）。
// ⚠️ 对 docs/src 的相对 import 必须带与源码一致的 ?v=20260903c query（模块缓存键一致性）。
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { PEOPLE } from '../../docs/src/mock/people.js?v=20260908d';
import { POLICY_DEFAULTS } from '../../docs/src/core/policy-defaults.js?v=20260908d';
import { PersonStore } from '../../docs/src/services/person.js?v=20260908d';
import {
  getMeetingRosterIds, getRosterStats, RESIDENCE as ROSTER_RESIDENCE,
} from '../../docs/src/services/roster.js?v=20260908d';
import {
  buildPreviewTemplate, sanitizePreview, applyPreview, clearPreview, getPreviewState,
  PREVIEW_KIND, PREVIEW_VERSION, PREVIEW_KEY, BASE_FIELDS, RESIDENCE, MEMBER_IDS,
} from '../../docs/src/services/org-base-data-preview.js?v=20260908d';

// ── localStorage 内存桩（import 之后、用例之前建立即可：两服务均在函数体内 typeof 守卫惰性访问）──
const _store = new Map();
globalThis.localStorage = {
  getItem: (k) => (_store.has(String(k)) ? _store.get(String(k)) : null),
  setItem: (k, v) => _store.set(String(k), String(v)),
  removeItem: (k) => { _store.delete(String(k)); },
  clear: () => { _store.clear(); },
};

// ── 常量（口径单一源）────────────────────────────────────────
const PARTY_STAGES = POLICY_DEFAULTS.attendance.roster.partyStages;
// 本支部成员（p_pc 党委组织员 branchId=null 不属于支部）
const BRANCH_MEMBERS = PEOPLE.filter(p => p.branchId !== null && p.branchId !== undefined);
const PARTY_MEMBERS = BRANCH_MEMBERS.filter(p => PARTY_STAGES.includes(p.developStage));

// ── a) 常量与模板结构 ─────────────────────────────────────
test('常量：kind/version/键名与成员基底；RESIDENCE 与 roster.js 同值（防漂移）', () => {
  assert.equal(PREVIEW_KIND, 'gsm1921-base-data');
  assert.equal(PREVIEW_VERSION, 1);
  assert.equal(PREVIEW_KEY, 'gsm1921-base-data-preview');
  assert.deepEqual(BASE_FIELDS, ['name', 'partyGroup', 'developStage', 'residenceStatus', 'residenceNote']);
  assert.deepEqual(RESIDENCE, ROSTER_RESIDENCE, '居住状态字面量与 roster 同值');
  assert.equal(BRANCH_MEMBERS.length, 50, '本支部成员 50 名（不含 p_pc 党委组织员）');
  assert.equal(MEMBER_IDS.length, 50);
});

test('buildPreviewTemplate：50 行五项基础字段 + id 锚点；示范滞留 p5/p9 显式写出', () => {
  const tpl = buildPreviewTemplate();
  assert.equal(tpl.kind, PREVIEW_KIND);
  assert.equal(tpl.version, 1);
  assert.ok(typeof tpl.exportedAt === 'string' && tpl.exportedAt.length > 0, 'exportedAt 为 ISO 时间串');
  assert.ok(typeof tpl.usage === 'string' && tpl.usage.length > 0, '含人工编辑说明');
  assert.equal(tpl.people.length, 50);
  const first = tpl.people[0];
  assert.deepEqual(Object.keys(first).sort(), ['developStage', 'id', 'name', 'partyGroup', 'residenceNote', 'residenceStatus'].sort());
  // 行内容与静态种子一致（p1 在校；p5/p9 滞留）
  const p1 = tpl.people.find(r => r.id === 'p1');
  assert.equal(p1.name, '罗文杰');
  assert.equal(p1.partyGroup, '第一党小组');
  assert.equal(p1.developStage, '正式党员');
  assert.equal(p1.residenceStatus, '在校');
  const p5 = tpl.people.find(r => r.id === 'p5');
  assert.equal(p5.residenceStatus, '滞留');
  assert.ok(p5.residenceNote.includes('2026-09'), '滞留备注保留种子说明');
  assert.ok(!tpl.people.some(r => r.id === 'p_pc'), 'p_pc 党委组织员不出现在成员名册模板');
  // 模板名册枚举与种子一致（三党小组 / 四阶段）
  const groupSet = [...new Set(tpl.people.map(r => r.partyGroup))];
  const stageSet = [...new Set(tpl.people.map(r => r.developStage))];
  assert.deepEqual(groupSet.sort(), ['第一党小组', '第三党小组', '第二党小组'].sort());
  assert.deepEqual(stageSet.sort(), ['积极分子', '预备党员', '发展对象', '正式党员'].sort());
});

// ── b) sanitize 合法全量：stats 与 roster 口径一致 ────────────
test('sanitize：合法全量（数组与 {people} 包皆可）→ 50 条、dropped 0；stats = 种子口径（21 党员 / 19 应到 / 滞留 2）', () => {
  const tpl = buildPreviewTemplate();
  const r1 = sanitizePreview(tpl.people);
  assert.equal(r1.valid, true);
  assert.equal(r1.people.length, 50);
  assert.equal(r1.dropped, 0);
  const s = r1.stats;
  assert.equal(s.partyTotal, 21, '在册党员 = 正式 12 + 预备 9');
  assert.equal(s.official, 12);
  assert.equal(s.probationary, 9);
  assert.equal(s.detained, 2, '滞留党员 2（p5/p9，均为正式党员）');
  assert.equal(s.expected, 19, '支部党员大会应到 = 21 − 2');
  assert.equal(s.official + s.probationary, s.partyTotal);
  // perGroup 与 roster 小组口径一致（第二党小组 = 组内党员 8 − 滞留 p5）
  assert.deepEqual(s.perGroup['第二党小组'], { partyTotal: 8, expected: 7, detainedParty: 1 });
  assert.deepEqual(s.perGroup['第一党小组'], { partyTotal: 9, expected: 8, detainedParty: 1 });
  assert.deepEqual(s.perGroup['第三党小组'], { partyTotal: 4, expected: 4, detainedParty: 0 });
  // 与 roster 服务现读数逐项一致（口径单一源校验）
  assert.equal(s.expected, getRosterStats({ type: '支部党员大会' }).expected);
  assert.equal(s.perGroup['第二党小组'].expected, getRosterStats({ type: '党小组会', groupId: '第二党小组' }).expected);
  // 整包（含 kind/version/usage）同样接受——sanitize 只认 people
  const r2 = sanitizePreview(tpl);
  assert.equal(r2.valid, true);
  assert.equal(r2.people.length, 50);
});

// ── c) sanitize 非法枚举回退（不清数据、不改统计）────────────
test('sanitize：非法党小组 / 非法发展阶段 / 非法滞留状态 → 回退该成员种子原值，统计不变', () => {
  const tpl = buildPreviewTemplate();
  const seed1 = BRANCH_MEMBERS.find(p => p.id === 'p1');
  const seed5 = BRANCH_MEMBERS.find(p => p.id === 'p5');
  const rows = tpl.people.map(r => ({ ...r }));
  const p1 = rows.find(r => r.id === 'p1');
  const p5 = rows.find(r => r.id === 'p5');
  p1.partyGroup = '第四党小组';      // 组枚举外 → 回退
  p1.developStage = '群众';           // 阶段枚举外 → 回退
  p1.residenceStatus = '离校';        // 状态枚举外 → 回退（在校成员回退在校）
  p5.residenceStatus = '请假';        // 状态枚举外 → 回退（滞留成员回退滞留 + 备注一并回退）
  p5.residenceNote = 123;             // 非字符串备注（状态非法时一并回退）
  const res = sanitizePreview(rows);
  assert.equal(res.valid, true);
  assert.equal(res.dropped, 0, '枚举非法只回退不丢弃');
  const c1 = res.people.find(r => r.id === 'p1');
  assert.equal(c1.partyGroup, seed1.partyGroup);
  assert.equal(c1.developStage, seed1.developStage);
  assert.equal(c1.residenceStatus, '在校');
  const c5 = res.people.find(r => r.id === 'p5');
  assert.equal(c5.residenceStatus, '滞留', '种子滞留成员非法状态回退滞留');
  assert.equal(c5.residenceNote, seed5.residenceNote, '备注随状态回退种子口径（防在校挂滞留备注错位）');
  // 统计不变（仍为种子口径 19/21/2）
  assert.equal(res.stats.expected, 19);
  assert.equal(res.stats.partyTotal, 21);
  assert.equal(res.stats.detained, 2);
});

// ── d) sanitize 丢弃：空姓名 / 白名单外 id / 非对象行 ────────
test('sanitize：空姓名整条丢弃；白名单外 id 整条丢弃；仅剩无效行 → valid false', () => {
  const tpl = buildPreviewTemplate();
  const rows = tpl.people.map(r => ({ ...r }));
  rows.find(r => r.id === 'p1').name = '   ';        // 空姓名 → 丢弃
  rows.find(r => r.id === 'p2').name = '';           // 空姓名 → 丢弃
  rows.push({ id: 'p999', name: '校外人员', partyGroup: '第一党小组', developStage: '正式党员' }); // 白名单外 → 丢弃
  rows.push({ id: 'p3', name: null });               // 同名 id 重复且姓名非法 → 丢弃（p3 原行仍在）
  const res = sanitizePreview(rows);
  assert.equal(res.valid, true);
  assert.equal(res.people.length, 48, 'p1/p2 与两条新推入行被丢弃（重复 id 的 p3 行姓名非法一并丢弃）');
  assert.equal(res.dropped, 4);
  assert.ok(res.people.some(r => r.id === 'p3'), 'p3 合法原行保留');
  // 全部无效 → valid false
  const bad = sanitizePreview([{ id: 'p1', name: ' ' }, { id: 'zzz', name: '张三' }, null, 42, 'x']);
  assert.equal(bad.valid, false);
  assert.ok(bad.reason);
  // 非数组 / 无 people → valid false
  assert.equal(sanitizePreview(null).valid, false);
  assert.equal(sanitizePreview({ foo: 1 }).valid, false);
  assert.equal(sanitizePreview([]).valid, false);
});

// ── e) 部分文件：只改若干行，其余保持种子 ──────────────────
test('sanitize：部分文件（未列成员保持种子）——p5/p9 改在校 → 支部大会应到 21、滞留 0', () => {
  const partial = [
    { id: 'p5', name: '宋佳宁', partyGroup: '第二党小组', developStage: '正式党员', residenceStatus: '在校', residenceNote: '' },
    { id: 'p9', name: '吕思涵', partyGroup: '第一党小组', developStage: '正式党员', residenceStatus: '在校', residenceNote: '' },
  ];
  const res = sanitizePreview(partial);
  assert.equal(res.valid, true);
  assert.equal(res.people.length, 2);
  assert.equal(res.stats.partyTotal, 21, '在册党员不变');
  assert.equal(res.stats.official, 12);
  assert.equal(res.stats.detained, 0, '示范滞留 p5/p9 均改回在校');
  assert.equal(res.stats.expected, 21, '支部党员大会应到 = 21 − 0');
  assert.deepEqual(res.stats.perGroup['第二党小组'], { partyTotal: 8, expected: 8, detainedParty: 0 });
});

// ── f) apply / clear 读写键 + PersonStore / roster 叠加即时变化 ──
// 置于末位：写入预览键影响同文件后续读数，用例收尾清键保持文件内纯净。
test('applyPreview → PersonStore 叠加（仅基础字段）；roster 应到即时变化；clearPreview 回种子', () => {
  // 前置：无预览 → 种子读数
  assert.equal(getPreviewState().active, false);
  assert.equal(PersonStore.getById('p1').name, '罗文杰');
  assert.equal(PersonStore.getMembers().length, PEOPLE.length);
  assert.equal(getRosterStats({ type: '支部党员大会' }).expected, 19);
  assert.ok(getMeetingRosterIds({ type: '支部党员大会' }).includes('p1'));

  // 应用部分预览：p1 改名、p9 滞留→在校、p13 迁组（第一 → 第二）
  const rows = [
    { id: 'p1', name: '张新一', partyGroup: '第一党小组', developStage: '正式党员', residenceStatus: '在校', residenceNote: '' },
    { id: 'p9', name: '吕思涵', partyGroup: '第一党小组', developStage: '正式党员', residenceStatus: '在校', residenceNote: '' },
    { id: 'p13', name: '储子禾', partyGroup: '第二党小组', developStage: '正式党员', residenceStatus: '在校', residenceNote: '' },
  ];
  const clean = sanitizePreview(rows);
  assert.equal(clean.valid, true);
  const applied = applyPreview(clean.people);
  assert.deepEqual(applied, { ok: true });

  // 键已写（含 kind/version/people/appliedAt）
  const raw = JSON.parse(localStorage.getItem(PREVIEW_KEY));
  assert.equal(raw.kind, PREVIEW_KIND);
  assert.equal(raw.version, 1);
  assert.equal(raw.people.length, 3);
  assert.ok(raw.appliedAt, 'appliedAt 时间戳存在');
  assert.equal(getPreviewState().active, true);
  assert.equal(getPreviewState().rows.length, 3);

  // PersonStore 读取叠加（仅基础字段；studentId/role 等不碰）
  assert.equal(PersonStore.getById('p1').name, '张新一');
  assert.equal(PersonStore.getName('p1'), '张新一', '姓名解析走叠加后值');
  assert.equal(PersonStore.getById('p1').studentId, '2400012345', '非基础字段保持种子');
  assert.equal(PersonStore.getById('p1').role, 'leader', '非基础字段保持种子');
  const p9 = PersonStore.getById('p9');
  assert.equal(p9.residenceStatus, '在校');
  assert.equal(p9.residenceNote, '', '改回在校时备注清空');
  assert.equal(PersonStore.getById('p13').partyGroup, '第二党小组');
  assert.equal(PersonStore.getMembers().length, PEOPLE.length, '成员数量不变（预览不增删成员；PersonStore 名单含党委组织员位 p_pc，预览行无 p_pc 故原样保留）');
  const u = PersonStore.getAll().find(p => p.id === 'u_sec');
  assert.equal(u.name, '支部书记', '系统账号不受预览影响');

  // roster 应到链即时变化：滞留仅剩 p5 → 支部大会应到 20；p9 回应到；p13 迁组后第一党小组党员少 1
  assert.equal(getRosterStats({ type: '支部党员大会' }).detainedParty, 1);
  assert.equal(getRosterStats({ type: '支部党员大会' }).expected, 20);
  const ids = getMeetingRosterIds({ type: '支部党员大会' });
  assert.ok(ids.includes('p9'), 'p9 改在校后回到应到');
  assert.ok(!ids.includes('p5'), 'p5 仍滞留、不在应到');
  assert.deepEqual(getRosterStats({ type: '党小组会', groupId: '第一党小组' }), { expected: 8, partyTotal: 8, detainedParty: 0 });
  assert.deepEqual(getRosterStats({ type: '党小组会', groupId: '第二党小组' }), { expected: 8, partyTotal: 9, detainedParty: 1 });

  // clearPreview → 回种子
  clearPreview();
  assert.equal(getPreviewState().active, false);
  assert.equal(PersonStore.getById('p1').name, '罗文杰');
  assert.equal(PersonStore.getById('p13').partyGroup, '第一党小组');
  assert.equal(getRosterStats({ type: '支部党员大会' }).expected, 19);
  // 清理键（幂等）
  clearPreview();
  localStorage.removeItem(PREVIEW_KEY);
});
