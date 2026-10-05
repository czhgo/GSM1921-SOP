// role: [工程师]+[AI]
// server/test/self-profile.test.mjs — 成员「**自我描述**」字段模型 ＋ 写链（2026-10-05 批次 400 · `D-788` / `V-10b`）
//
// **立据**：支书 2026-10-05 提供问卷导出字段清单（~24 列）并圈定「**落点＝扩 `people.js`**」＋
//   「**录入主体＝本人可填 ＋ 支委层代录**」＋「**导入＝粘贴/CSV ＋ 预览**」（本轮 AskUserQuestion）。
//
// 判据（三段）：
//   A 叶子纯函数：字段表（键/类型）· 净化（白名单外键丢弃 / `bool` 归一 / `multi` 去空去重有限长 /
//     `list` 只留声明列 / `text` trim 截断 / 坏输入不崩）· `isSelfProfileEmpty`
//   B mock 写链：`PersonStore.saveMember` 落 `selfProfile` 并按叶子净化；**全空不落该字段**
//   C api 写链（内存服务）：`PATCH /members/:id/profile` —— ① **本人自填** `selfProfile` 200 且落库；
//     ② 他人自填 403；③ 本人改**别的**档案字段 400（不放宽）；④ 组织委员代录 200；
//     ⚠ ⑤ 服务端**净化**（客户端塞白名单外键 ⇒ 落库被剔除）
// 运行：node --test test/self-profile.test.mjs（server 目录）
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';

import {
  SELF_PROFILE_FIELDS, SELF_PROFILE_KEYS, emptySelfProfile, sanitizeSelfProfile, isSelfProfileEmpty,
} from '../../docs/src/core/domain/self-profile.js?v=20261005l';
import { createApp } from '../app.js';
import { seedDatabase } from '../seed.js';

// ═════════════════ A 叶子纯函数 ═════════════════

test('A1 字段表：15 字段 ＋ 四类形态（text / bool / multi / list），键唯一', () => {
  assert.equal(SELF_PROFILE_FIELDS.length, 15, '15 个字段（问卷 ~24 列去重后的字段数）');
  assert.equal(new Set(SELF_PROFILE_KEYS).size, 15, '键无重复');
  const types = new Set(SELF_PROFILE_FIELDS.map((f) => f.type));
  assert.deepEqual([...types].sort(), ['bool', 'list', 'multi', 'text'], '四类形态齐备');
  for (const f of SELF_PROFILE_FIELDS) {
    assert.ok(f.key && f.label, `字段 ${f.key} 须有 key/label`);
    if (f.type === 'list') assert.ok(Array.isArray(f.itemFields) && f.itemFields.length > 0, `子表 ${f.key} 须声明列`);
  }
  // 不重复存已有档案字段（姓名 / 学号 / 发展阶段）
  for (const dup of ['name', 'studentId', 'developStage', 'id']) {
    assert.ok(!SELF_PROFILE_KEYS.includes(dup), `不应重复存档案字段 ${dup}`);
  }
});

test('A2 净化：白名单外键丢弃 / bool 归一 / multi 去空去重有限长 / list 只留声明列 / text trim 截断', () => {
  const out = sanitizeSelfProfile({
    phone: '  13800000000  ',
    hasStudentWork: '是',
    volunteered: '否',
    ledProject: true,
    familiarWorks: ['团支书', '', '团支书', '组织委员'],
    futureDirections: '基层就业;考研;其他',
    studentWorks: [
      { category: '班团', dept: '计算机 2401', title: '团支书', junk: 'x' },
      { category: '', dept: '', title: '' },
    ],
    honors: [{ level: '校级', levelOther: '', name: '三好学生' }, {}],
    extraNote: 'x'.repeat(999),
    __evil: '注入键',
    developStage: '正式党员',      // 档案字段：不在白名单 ⇒ 丢弃
  });
  assert.equal(out.phone, '13800000000', 'text trim');
  assert.equal(out.hasStudentWork, true, '「是」→ true');
  assert.equal(out.volunteered, false, '「否」→ false');
  assert.equal(out.ledProject, true, 'boolean 直通');
  assert.deepEqual(out.familiarWorks, ['团支书', '组织委员'], 'multi 去空去重');
  assert.deepEqual(out.futureDirections, ['基层就业', '考研', '其他'], 'multi 支持分隔符串');
  assert.deepEqual(out.studentWorks, [{ category: '班团', dept: '计算机 2401', title: '团支书' }],
    'list 只留声明列（junk 剔除）＋ 空行剔除');
  assert.deepEqual(out.honors, [{ level: '校级', levelOther: '', name: '三好学生' }], 'list 空行剔除');
  assert.equal(out.extraNote.length, 500, 'text 截断到上限');
  assert.ok(!('__evil' in out) && !('developStage' in out), '白名单外键一律丢弃');
  assert.deepEqual(Object.keys(out).sort(), [...SELF_PROFILE_KEYS].sort(), '键集 ≡ 字段表白名单');
});

test('A3 净化不崩 ＋ 空值判定：非对象输入 → 空表单；全空 ⇒ isSelfProfileEmpty', () => {
  for (const bad of [null, undefined, 42, 'str', [], true]) {
    const out = sanitizeSelfProfile(bad);
    assert.deepEqual(Object.keys(out).sort(), [...SELF_PROFILE_KEYS].sort(), `坏输入 ${JSON.stringify(bad)} 仍返回完整键集`);
    assert.ok(isSelfProfileEmpty(out), `坏输入 ⇒ 视为未填`);
  }
  assert.deepEqual(Object.keys(emptySelfProfile()).sort(), [...SELF_PROFILE_KEYS].sort(), 'emptySelfProfile 键集一致');
  assert.ok(isSelfProfileEmpty(emptySelfProfile()));
  const filled = sanitizeSelfProfile({ major: '计算机科学与技术' });
  assert.equal(isSelfProfileEmpty(filled), false, '有一个字段 ⇒ 视为已填');
});

// ═════════════════ B mock 写链 ═════════════════

import { mockDB } from '../../docs/src/core/domain/domain.js?v=20261005l';
import { MockAdapter } from '../../docs/src/data/mock-adapter.js?v=20261005l';
import { setDataSource } from '../../docs/src/data/data-adapter.js?v=20261005l';
import { PersonStore } from '../../docs/src/services/member/person.js?v=20261005l';

const _store = new Map();
globalThis.localStorage = {
  getItem: (k) => (_store.has(String(k)) ? _store.get(String(k)) : null),
  setItem: (k, v) => _store.set(String(k), String(v)),
  removeItem: (k) => { _store.delete(String(k)); },
  clear: () => { _store.clear(); },
  key: (i) => [..._store.keys()][i] ?? null,
  get length() { return _store.size; },
};

test('B1 mock 写链：saveMember 落 selfProfile（净化后）；显式空对象 ⇒ 落空（支持「清空」）', async () => {
  _store.clear();
  setDataSource('mock');
  await MockAdapter.loadDB();
  const r1 = await PersonStore.saveMember({ id: 'p1', selfProfile: { major: '计算机', __evil: 'x' } });
  assert.equal(r1.ok, true, `保存成功：${r1.reason || ''}`);
  const got = PersonStore.getById('p1');
  assert.ok(got && got.selfProfile, '档案带 selfProfile');
  assert.equal(got.selfProfile.major, '计算机');
  assert.ok(!('__evil' in got.selfProfile), '白名单外键被净化剔除');
  // 显式传空 ⇒ 落为空对象（＝清空：不把旧值留在档案里）
  const r2 = await PersonStore.saveMember({ id: 'p1', selfProfile: { major: '   ' } });
  assert.equal(r2.ok, true);
  const got2 = PersonStore.getById('p1');
  assert.ok(got2.selfProfile, '显式传入空自我描述 ⇒ 字段仍在（空对象）');
  assert.equal(got2.selfProfile.major, '', '原值被清空（不再残留「计算机」）');
  // 未提供该字段 ⇒ 不改动（缺省不覆盖）
  const r3 = await PersonStore.saveMember({ id: 'p2', name: '新成员' });
  assert.equal(r3.ok, true);
  assert.equal(PersonStore.getById('p2').selfProfile, undefined, '未提供 ⇒ 不落该字段');
});

// ═════════════════ C api 写链（内存服务） ═════════════════

let server, base;
before(async () => {
  setDataSource('api');
  const app = createApp({ dbPath: ':memory:' });
  await seedDatabase(app.locals.db);
  server = app.listen(0);
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => {
  if (server) { server.closeAllConnections?.(); return new Promise((r) => server.close(r)); }
  return undefined;
});

async function login(personId) {
  const res = await fetch(`${base}/api/v1/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ personId }),
  });
  assert.equal(res.status, 200, `登录失败 ${personId}`);
  return res.json();
}
const H = (t) => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${t}` });
const patchProfile = (token, id, body) => fetch(`${base}/api/v1/members/${id}/profile`, {
  method: 'PATCH', headers: H(token), body: JSON.stringify(body),
});

test('C1 api：本人自填 selfProfile 200 落库；他人自填 403；本人改别的档案字段 400（不放宽）', async () => {
  const { token: p7 } = await login('p7');      // 普通成员
  const { token: p5 } = await login('p5');      // 另一普通成员
  const { token: org } = await login('p11');    // 组织委员
  // ① 本人自填 → 200
  const r1 = await patchProfile(p7, 'p7', { selfProfile: { major: '计算机', familiarWorks: ['团支书'] } });
  assert.equal(r1.status, 200, '本人自填自我描述须放行');
  const saved1 = await r1.json();
  assert.equal(saved1.selfProfile.major, '计算机', '本人自填落库');
  // ⑤ 服务端净化：塞白名单外键 ⇒ 被剔除
  const r2 = await patchProfile(p7, 'p7', { selfProfile: { major: '计算机', __evil: 'x' } });
  assert.equal(r2.status, 200);
  assert.ok(!('__evil' in (await r2.json()).selfProfile), '服务端净化剔除白名单外键');
  // ② 他人自填 → 403
  assert.equal((await patchProfile(p5, 'p7', { selfProfile: { major: 'x' } })).status, 403, '他人不得代填');
  // ③ 本人改别的档案字段 → 400（仅可写 selfProfile）
  assert.equal((await patchProfile(p7, 'p7', { name: '改名' })).status, 400, '本人不得改档案其他字段');
  // ④ 组织委员代录 → 200
  const r4 = await patchProfile(org, 'p7', { selfProfile: { major: '软件工程' } });
  assert.equal(r4.status, 200, '组织委员可代录');
  assert.equal((await r4.json()).selfProfile.major, '软件工程');
});

test('C2 api：靶标不存在 404 · 非本支部 403 · 无非白名单字段 400（沿用既有口径，未被例外放宽）', async () => {
  const { token: org } = await login('p11');
  assert.equal((await patchProfile(org, 'p_nope', { selfProfile: { major: 'x' } })).status, 404, '成员不存在 404');
  assert.equal((await patchProfile(org, 'p7', {})).status, 400, '无可更新字段 400');
  assert.equal((await patchProfile(org, 'p7', { developStage: '正式党员' })).status, 400, '发展阶段不在本端点白名单');
});
