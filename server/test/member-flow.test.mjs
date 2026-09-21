// server/test/member-flow.test.mjs — 成员流入/流出登记（2026-09-14 批次 25 支书裁定）
// 两层法（DATA_CONSISTENCY_CHECKLIST §0）：
//   结构层 S1–S3：静态扫描防回潮（流出待支书确认旧口径已移除 / enrollYear 两侧白名单齐备 / 写门角色集单一源）
//   数据层 D1–D6：服务层口径断言（单人流入建档+建号+台账、批量粘贴行号级错误、多人流出软标记+停用、
//                 撤销回滚、reconcile 恒等、写权）
// node-only（不启浏览器）：纯服务层 + 静态扫描 + localStorage 内存桩。
// ⚠️ 对 docs/src 的相对 import 必须带与源码一致的 ?v= query（模块缓存键一致性）。

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const V = '?v=20260921m';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SRC_DIR = join(ROOT, 'docs', 'src');
const read = (f) => readFileSync(f, 'utf8');

// ── localStorage 内存桩（含 key/length；账号层/成员覆盖层均惰性访问）──
const _store = new Map();
globalThis.localStorage = {
  getItem: (k) => (_store.has(String(k)) ? _store.get(String(k)) : null),
  setItem: (k, v) => _store.set(String(k), String(v)),
  removeItem: (k) => { _store.delete(String(k)); },
  clear: () => { _store.clear(); },
  key: (i) => [..._store.keys()][i] ?? null,
  get length() { return _store.size; },
};
globalThis.sessionStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };

const { mockDB } = await import(`../../docs/src/core/domain.js${V}`);
const { MockAdapter } = await import(`../../docs/src/core/mock-adapter.js${V}`);
const { PersonStore, MEMBER_OVERLAY_KEY } = await import(`../../docs/src/services/person.js${V}`);
const { setDataSource, registerMockAdapter } = await import(`../../docs/src/core/data-adapter.js${V}`);
const { MEMBER_FLOW_ROLES } = await import(`../../docs/src/core/constants.js${V}`);
const {
  loadMemberFlows, reconcile, registerIntake, registerIntakeBatch,
  registerOutflow, revokeFlow, canRegisterFlow,
} = await import(`../../docs/src/services/member-flow.js${V}`);
const { verifyLogin, isAccountActive, findAccountByPersonId } = await import(`../../docs/src/services/accounts.js${V}`);

registerMockAdapter(MockAdapter);

/** 每例独立现场：清存储 + 清业务域（含成员流动台账）→ 恢复 seed */
function beginMockCase() {
  _store.clear();
  delete globalThis.window;
  for (const k of [
    'activities', 'tasks', 'attendances', 'inspections', 'taskforces', 'notices', 'todos',
    'assignments', 'signups', 'activityReviews', 'taskforceReviews', 'agendaVotes',
    'memberChangeRequests', 'committeeBroadcasts', 'thoughtReports', 'branchDocs',
    'appointmentRecords', 'reviewRequests', 'archiveRecords', 'pendingMemberConfirmations',
    // 2026-09-14 批次 25：成员流动台账（每例独立现场需重置）
    'memberFlows',
  ]) {
    mockDB[k] = [];
  }
  mockDB.branches = [];
  mockDB._loaded = false;
  setDataSource('mock');
  MockAdapter.loadDB();
}

const _overlayRemovedIds = () => {
  const raw = localStorage.getItem(MEMBER_OVERLAY_KEY);
  return raw ? (JSON.parse(raw).removedIds || []) : [];
};

// ═══════════════ 结构层 ═══════════════

test('S1 全站不得再出现「流出待支书确认」旧口径（transferOut pending 分支已移除）', () => {
  const src = read(join(SRC_DIR, 'services', 'member-confirmation.js'));
  assert.ok(!/refsSummary:\s*\{/.test(src), '不得再构造 transferOut pending 的 refsSummary');
  assert.ok(!/direct:\s*false/.test(src), '流出不再有「非直接」分支（登记即生效）');
  assert.ok(!/kind:\s*'transferOut'/.test(src), '不得再建 kind=transferOut 的待确认请求');
});

test('S2 enrollYear 字段两侧白名单齐备（前端字段白名单 + server/routes/member.js）', () => {
  const person = read(join(SRC_DIR, 'services', 'person.js'));
  assert.match(person, /'enrollYear'/, '前端成员档案字段白名单须含 enrollYear');
  const member = read(join(ROOT, 'server', 'routes', 'member.js'));
  assert.match(member, /PROFILE_FIELDS\s*=\s*\[[^\]]*'enrollYear'/, 'PROFILE_FIELDS 须含 enrollYear');
  assert.match(member, /CREATE_FIELDS\s*=\s*\[[^\]]*'enrollYear'/, 'CREATE_FIELDS 须含 enrollYear');
  const roster = read(join(SRC_DIR, 'services', 'roster-ui-logic.js'));
  assert.match(roster, /enrollYear/, '新增成员校验须采集/校验 enrollYear');
  const modal = read(join(SRC_DIR, 'components', 'person-edit-modal.js'));
  assert.match(modal, /enrollYear/, '完整档案展示须含 enrollYear（只读）');
});

test('S3 写门角色集来自单一源（不得手写角色字符串）', () => {
  const res = read(join(ROOT, 'server', 'routes', 'resources.js'));
  assert.match(res, /MEMBER_FLOW_ROLES/, 'resources.js 须 import MEMBER_FLOW_ROLES（单一源）');
  assert.match(res, /memberFlows:\s*'member-flow'/, 'memberFlows 写门须设为 member-flow');
  assert.ok(!/\['org-commissioner'/.test(res), 'resources.js 不得手写角色数组');

  const svc = read(join(SRC_DIR, 'services', 'member-flow.js'));
  assert.match(svc, /MEMBER_FLOW_ROLES/, 'member-flow.js 须 import MEMBER_FLOW_ROLES（单一源）');
  assert.ok(!/\['org-commissioner'/.test(svc), 'member-flow.js 不得手写角色数组');

  const consts = read(join(SRC_DIR, 'core', 'constants.js'));
  assert.match(consts, /MEMBER_FLOW_ROLES\s*=/, '单一源常量 MEMBER_FLOW_ROLES 须存在于 constants.js');

  const member = read(join(ROOT, 'server', 'routes', 'member.js'));
  assert.ok(!/new Set\(\['org-commissioner'\]\)/.test(member), 'member.js 组织委员集合须取单一源，不得手写');
});

test('S4 撤销流出须清 server 软标记（Q-23-5；三处接线齐备）', () => {
  // server 侧「转出」是软标记（原行保留），仅走 profile 补丁**清不掉** →
  // 撤销后 /login 仍 401、listUsers 读链仍排除该行（成员回不来）。故须三处齐备：
  const member = read(join(ROOT, 'server', 'routes', 'member.js'));
  assert.match(member, /router\.post\('\/members\/:id\/undo-transfer-out'/, 'server 须有撤销流出语义端点');
  assert.match(member, /undo-transfer-out'[\s\S]{0,200}?TRANSFER_OUT_ROLES/, '撤销端点须用与移出同源的角色集');
  assert.match(member, /delete merged\.transferOut/, '撤销端点须清除 transferOut 软标记');

  const adapter = read(join(SRC_DIR, 'core', 'api-adapter.js'));
  assert.match(adapter, /undoTransferOut\(id\)/, 'api-adapter.members 须暴露 undoTransferOut');

  const svc = read(join(SRC_DIR, 'services', 'member-flow.js'));
  assert.match(svc, /restoreFromTransferOut:\s*true/, 'revokeFlow 复活成员须带 restoreFromTransferOut（接线单一源）');
  // 2026-09-14 批次 30（支书裁定 Q-23-10）：流入建档须走成员流动专用端点
  assert.match(svc, /memberFlowIntake:\s*true/, 'registerIntake 建档须带 memberFlowIntake（走 /members/intake）');
  assert.match(member, /router\.post\('\/members\/intake'/, 'server 须有流入登记语义端点 /members/intake');
  assert.match(member, /intake'[\s\S]{0,120}?MEMBER_FLOW_ROLES/, '流入登记端点须用 MEMBER_FLOW_ROLES 单一源角色集');
  assert.match(member, /router\.post\('\/members',\s*requireRole\(db,\s*ORG_COMMISSIONER_ROLES\)/,
    '名册新增 /members 须保持 R-10 组织委员专属门（不因流入端点而放宽）');
  assert.match(adapter, /intake\(data\)/, 'api-adapter.members 须暴露 intake');
});

// ═══════════════ 数据层 ═══════════════

test('D1 单人流入：档案落档（含学号/届别）+ 台账一笔 + 账号可登录', async () => {
  beginMockCase();
  const before = PersonStore.getMembers().length;
  const r = await registerIntake({
    name: '测试新生', studentId: '2600010001', enrollYear: '2026',
    partyGroup: '第一党小组', note: '开学转入', by: 'p11', role: 'org-commissioner',
  });
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.ok(r.person && r.person.id);
  const p = PersonStore.getById(r.person.id);
  assert.equal(p.name, '测试新生');
  assert.equal(p.studentId, '2600010001');
  assert.equal(p.enrollYear, '2026', '届别落档');
  assert.equal(p.partyGroup, '第一党小组');
  assert.equal(p.branchId, 'br-b1');
  assert.equal(PersonStore.getMembers().length, before + 1, '读链即时新增');

  const flows = loadMemberFlows({ branchId: 'br-b1' });
  assert.equal(flows.length, 1, '记台账一笔');
  assert.equal(flows[0].direction, 'in');
  assert.equal(flows[0].personId, p.id);
  assert.equal(flows[0].studentId, '2600010001');
  assert.equal(flows[0].by, 'p11');

  // 自动建号：账号 = 学号；口令 = 支部统一默认口令
  const login = verifyLogin('2600010001', '123456');
  assert.equal(login.ok, true, '流入即自动建号，账号可登录');
  assert.equal(login.personId, p.id);
  assert.equal(isAccountActive('2600010001'), true);
  // 学号重复 → 拒绝
  const dup = await registerIntake({ name: '重复学号', studentId: '2600010001', by: 'p11', role: 'org-commissioner' });
  assert.equal(dup.ok, false);
  assert.match(dup.reason, /学号/);
});

test('D2 批量粘贴（含一行错误）→ errors 有行号且其它行照常成功', async () => {
  beginMockCase();
  const text = [
    '批量甲\t2600020001\t2026\t第一党小组',
    '批量乙,2600020002,2026,第二党小组',
    '',                                              // 空行跳过
    '批量丙\t2600020001\t2026\t第一党小组',           // 学号与第 1 行重复 → 行号 4 报错
  ].join('\n');
  const r = await registerIntakeBatch({ text, by: 'p11', role: 'org-commissioner' });
  assert.equal(r.created.length, 2, '两行合法照常成功');
  assert.equal(r.errors.length, 1);
  assert.equal(r.errors[0].line, 4, '行号 = 原始文本 1 起行号');
  assert.match(r.errors[0].reason, /学号/);
  assert.equal(loadMemberFlows({ branchId: 'br-b1' }).length, 2, '成功行各记一笔台账');
  assert.equal(verifyLogin('2600020001', '123456').ok, true);
  assert.equal(verifyLogin('2600020002', '123456').ok, true);
});

test('D3 多人流出：软标记 + 台账 + 账号停用 + 名册读链不再含该人', async () => {
  beginMockCase();
  const a = await registerIntake({ name: '流出甲', studentId: '2600030001', by: 'p11', role: 'org-commissioner' });
  const b = await registerIntake({ name: '流出乙', studentId: '2600030002', by: 'p11', role: 'org-commissioner' });
  const r = await registerOutflow({
    personIds: [a.person.id, b.person.id], date: '2026-09-14', note: '毕业转出', by: 'p11', role: 'org-commissioner',
  });
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.equal(r.movedCount, 2);
  assert.deepEqual(r.skipped, []);

  const ids = PersonStore.getMembers().map(p => p.id);
  assert.equal(ids.includes(a.person.id), false, '名册读链不再含流出者');
  assert.equal(ids.includes(b.person.id), false);

  // 软标记保留（不删不匿名：removedIds 记录 name + transferOut）
  const rec = _overlayRemovedIds().find(x => x.id === a.person.id);
  assert.ok(rec && rec.transferOut === true, '软标记移除（transferOut）');
  assert.equal(rec.name, '流出甲', '保留姓名（历史读链不匿名）');

  // 台账：2 流入 + 2 流出
  const flows = loadMemberFlows({ branchId: 'br-b1' });
  assert.equal(flows.filter(f => f.direction === 'out').length, 2);
  assert.equal(flows.find(f => f.direction === 'out').date, '2026-09-14');

  // 账号停用（不物理删除；登录拒绝）
  assert.equal(findAccountByPersonId(a.person.id).active, false);
  assert.equal(verifyLogin('2600030001', '123456').ok, false, '停用账号禁止登录');

  // 已在册者再次流出 → skipped（幂等守卫）
  const again = await registerOutflow({ personIds: [a.person.id], by: 'p11', role: 'org-commissioner' });
  assert.equal(again.movedCount, 0);
  assert.equal(again.skipped.length, 1);
});

test('D4 撤销：台账留痕（revokedAt/revokedBy）+ 回滚在册状态 + 账号恢复/停用', async () => {
  beginMockCase();
  const a = await registerIntake({ name: '撤销流出', studentId: '2600040001', enrollYear: '2026', partyGroup: '第一党小组', by: 'p11', role: 'org-commissioner' });
  const b = await registerIntake({ name: '撤销流入', studentId: '2600040002', by: 'p11', role: 'org-commissioner' });
  await registerOutflow({ personIds: [a.person.id], note: '误登流出', by: 'p11', role: 'org-commissioner' });
  assert.equal(PersonStore.getMembers().some(p => p.id === a.person.id), false);

  // 撤销「流出」→ 成员恢复在册 + 账号恢复
  const outFlow = loadMemberFlows({ branchId: 'br-b1' }).find(f => f.direction === 'out' && f.personId === a.person.id);
  const rvOut = await revokeFlow({ flowId: outFlow.id, by: 'p13', role: 'secretary' });
  assert.equal(rvOut.ok, true, JSON.stringify(rvOut));
  assert.ok(rvOut.flow.revokedAt, '撤销留痕时间');
  assert.equal(rvOut.flow.revokedBy, 'p13', '撤销留痕人');
  const restored = PersonStore.getById(a.person.id);
  assert.ok(restored, '成员恢复在册');
  assert.equal(restored.name, '撤销流出');
  assert.equal(restored.studentId, '2600040001');
  assert.equal(restored.enrollYear, '2026', '档案随台账存档回滚');
  assert.equal(verifyLogin('2600040001', '123456').ok, true, '账号恢复可登录');

  // 撤销「流入」→ 成员回不在册 + 账号停用
  const inFlow = loadMemberFlows({ branchId: 'br-b1' }).find(f => f.direction === 'in' && f.personId === b.person.id);
  const rvIn = await revokeFlow({ flowId: inFlow.id, by: 'p11', role: 'org-commissioner' });
  assert.equal(rvIn.ok, true, JSON.stringify(rvIn));
  assert.equal(PersonStore.getMembers().some(p => p.id === b.person.id), false, '撤销流入 → 成员不再在册');
  assert.equal(verifyLogin('2600040002', '123456').ok, false, '撤销流入 → 账号停用');

  // 重复撤销拒绝
  const again = await revokeFlow({ flowId: outFlow.id, by: 'p13', role: 'secretary' });
  assert.equal(again.ok, false);
});

test('D5 reconcile 恒等：期初在册 + 流入合计 − 流出合计 = 当前在册', async () => {
  beginMockCase();
  const before = reconcile({ branchId: 'br-b1' });
  assert.equal(before.inCount, 0);
  assert.equal(before.outCount, 0);
  assert.equal(before.openingCount, before.currentCount, '无台账时期初 = 当前在册');
  assert.equal(before.balanced, true);

  const a = await registerIntake({ name: '对账甲', studentId: '2600050001', by: 'p11', role: 'org-commissioner' });
  await registerIntake({ name: '对账乙', studentId: '2600050002', by: 'p11', role: 'org-commissioner' });
  await registerOutflow({ personIds: [a.person.id], by: 'p11', role: 'org-commissioner' });

  const r = reconcile({ branchId: 'br-b1' });
  assert.equal(r.inCount, 2);
  assert.equal(r.outCount, 1);
  assert.equal(r.currentCount, before.currentCount + 1);
  assert.equal(r.openingCount, before.currentCount, '期初 = 原在册数（台账外存量）');
  assert.equal(r.openingCount + r.inCount - r.outCount, r.currentCount, '对账恒等');
  assert.equal(r.balanced, true);

  // 撤销后对账仍恒等（out 计回流水）
  const outFlow = loadMemberFlows({ branchId: 'br-b1' }).find(f => f.direction === 'out');
  await revokeFlow({ flowId: outFlow.id, by: 'p11', role: 'org-commissioner' });
  const r2 = reconcile({ branchId: 'br-b1' });
  assert.equal(r2.outCount, 0, '已撤销流出不再计入');
  assert.equal(r2.openingCount + r2.inCount - r2.outCount, r2.currentCount);
  assert.equal(r2.balanced, true);
});

test('D6 权限：组织委员/支书/副支书可登记，其它角色拒绝', async () => {
  beginMockCase();
  for (const role of ['org-commissioner', 'secretary', 'deputy-secretary']) {
    assert.equal(canRegisterFlow(role), true, `${role} 可登记`);
  }
  for (const role of ['prop-commissioner', 'disc-commissioner', 'leader', 'participant', 'party-staff']) {
    assert.equal(canRegisterFlow(role), false, `${role} 不得登记`);
  }
  // 单一源：canRegisterFlow ≡ MEMBER_FLOW_ROLES
  assert.deepEqual([...MEMBER_FLOW_ROLES].sort(), ['deputy-secretary', 'org-commissioner', 'secretary'].sort());

  const denyIn = await registerIntake({ name: '越权', studentId: '2600060001', by: 'p5', role: 'participant' });
  assert.equal(denyIn.ok, false);
  const denyOut = await registerOutflow({ personIds: ['p50'], by: 'p5', role: 'participant' });
  assert.equal(denyOut.ok, false);
  const denyBatch = await registerIntakeBatch({ text: '越权甲\t2600060002', by: 'p5', role: 'participant' });
  assert.equal(denyBatch.ok, false);
  const denyRevoke = await revokeFlow({ flowId: 'mf-x', by: 'p5', role: 'participant' });
  assert.equal(denyRevoke.ok, false);
});
