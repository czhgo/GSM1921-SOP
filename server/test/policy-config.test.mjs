// role: [工程师]+[AI]
// server/test/policy-config.test.mjs — 批4 域参数 policyOverrides（书记 2026-09-09 批）防漂移单测
// 纯 Node 测试（无浏览器、不起 server；mock 形态 + localStorage 内存桩，范式同 member-confirmation.test）：
//   ① policy-defaults 批4 新节结构与默认值（memberConfirmation 窗 / leader 学期提醒 / attendance·review 阈值）
//   ② sanitizeConfigPolicyOverrides 白名单/类型校验/数值范围钳制（天数 1..90、布尔严格、窗口合法月日/去重/限 2 窗）
//   ③ 读侧注入 applyBranchPolicyOverrides：覆盖生效 / 无覆盖=保持默认 / 跨支部切换先复位不残留
//   ④ savePolicyOverrides 角色守卫（书记/副/party-staff 全量；域负责人仅本域）+ 域保存/恢复默认落库
//   ⑤ 组长学期提醒纯判定（leaderSemesterReportTermKey / isLeaderSemesterRemindWindow）
//   ⑥ 窗口文案单一源 semesterDetainedWindowsLabel（与政策窗一致）
//   ⑦ HTTP 域：PATCH /branches/:id/config 支持 policyOverrides（书记全量 / 域负责人本域 / 普通成员 403）
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';

import { mockDB } from '../../docs/src/core/domain.js?v=20260909e';
import { MockAdapter } from '../../docs/src/core/mock-adapter.js?v=20260909e';
import { setDataSource, registerMockAdapter } from '../../docs/src/core/data-adapter.js?v=20260909e';
import {
  POLICY_DEFAULTS, POLICY_OVERRIDABLE, POLICY_OVERRIDE_SECTIONS,
} from '../../docs/src/core/policy-defaults.js?v=20260909e';
import {
  sanitizeConfigPolicyOverrides, applyBranchPolicyOverrides,
} from '../../docs/src/core/config-clean.js?v=20260909e';
import {
  savePolicyOverrides, canManagePolicyOverrides, getBranchById,
} from '../../docs/src/services/branch.js?v=20260909e';
import {
  semesterDetainedWindowsLabel,
} from '../../docs/src/services/member-confirmation.js?v=20260909e';
import {
  leaderSemesterReportTermKey, isLeaderSemesterRemindWindow,
} from '../../docs/src/entries/tabs/today/today-tab.js?v=20260909e';
// HTTP 域（PATCH /branches/:id/config policyOverrides 写口与 server 同源校验）
import { createApp } from '../app.js';
import { seedDatabase } from '../seed.js';

// ── localStorage 内存桩 + mock 适配器注册 ──
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
registerMockAdapter(MockAdapter);
setDataSource('mock');

/** 每例独立现场：清业务域 + 清存储 → 恢复 seed（branches br-b1 等） */
function beginMockCase() {
  _store.clear();
  for (const k of [
    'activities', 'tasks', 'attendances', 'inspections', 'taskforces', 'notices', 'todos',
    'assignments', 'signups', 'activityReviews', 'taskforceReviews', 'agendaVotes',
    'memberChangeRequests', 'committeeBroadcasts', 'thoughtReports', 'branchDocs',
    'appointmentRecords', 'reviewRequests', 'archiveRecords', 'pendingMemberConfirmations',
  ]) {
    mockDB[k] = [];
  }
  mockDB.branches = [];
  mockDB._loaded = false;
  MockAdapter.loadDB();
  // 复位有效默认（防跨用例注入残留）
  applyBranchPolicyOverrides({ config: {} });
}

const BR = () => getBranchById('br-b1');
const po = (b = BR()) => (b && b.config && b.config.policyOverrides) || null;

// ── ① policy-defaults 批4 结构 ────────────────────────────────────────────
test('① policy-defaults 批4：新节结构与默认值（memberConfirmation/leader/attendance/review）', () => {
  assert.deepEqual(
    POLICY_DEFAULTS.memberConfirmation.semesterDetainedWindows,
    [[6, 15, 7, 15], [12, 15, 1, 15]],
    '滞留复核半年窗默认 [[06-15,07-15],[12-15,次年01-15]]'
  );
  assert.deepEqual(
    POLICY_DEFAULTS.leader.semesterReportReminder,
    { enabled: true, frequency: 'semester' },
    '组长学期组员进展提醒：默认开 + 学期制'
  );
  assert.equal(POLICY_DEFAULTS.attendance.entryRemindDays, 3, '考勤录入提醒阈值 3 天');
  assert.equal(POLICY_DEFAULTS.attendance.summaryDeadlineDays, 5, '考勤 deadline +5 天');
  assert.equal(POLICY_DEFAULTS.inspection.overdueDays, 7, '考察超期默认 7 天（保留）');
  assert.equal(POLICY_DEFAULTS.review.overdueDays, 7, '复盘提醒阈值 7 天');
  assert.equal(POLICY_DEFAULTS.review.deadlineDays, 10, '复盘 deadline +10 天');
  // 白名单表与顶层节一致（覆盖写口/净化共用同一表）
  assert.deepEqual(
    [...new Set(POLICY_OVERRIDABLE.map(o => o.path[0]))],
    POLICY_OVERRIDE_SECTIONS,
  );
  assert.deepEqual(POLICY_OVERRIDE_SECTIONS, ['inspection', 'memberConfirmation', 'leader']);
});

// ── ② sanitizeConfigPolicyOverrides：白名单/钳制 ───────────────────────────
test('② 净化：天数 int 钳 1..90、非整数/越界丢弃、未知键丢弃', () => {
  assert.equal(sanitizeConfigPolicyOverrides(null), null, 'null=无 overrides（删除语义）');
  assert.equal(sanitizeConfigPolicyOverrides(undefined), null);
  assert.deepEqual(sanitizeConfigPolicyOverrides({ inspection: { overdueDays: 10 } }), { inspection: { overdueDays: 10 } });
  assert.deepEqual(sanitizeConfigPolicyOverrides({ inspection: { overdueDays: 150 } }), { inspection: { overdueDays: 90 } }, '上界钳制');
  assert.deepEqual(sanitizeConfigPolicyOverrides({ inspection: { overdueDays: 0 } }), { inspection: { overdueDays: 1 } }, '下界钳制');
  assert.deepEqual(sanitizeConfigPolicyOverrides({ inspection: { overdueDays: 3.5 } }), {}, '非整数丢弃');
  assert.deepEqual(sanitizeConfigPolicyOverrides({ inspection: { overdueDays: '7' } }), {}, '字符串丢弃（类型校验）');
  assert.deepEqual(sanitizeConfigPolicyOverrides({ inspection: { overdueDays: 7, unknownLeaf: 1 } }), { inspection: { overdueDays: 7 } }, '未知叶丢弃');
  assert.deepEqual(sanitizeConfigPolicyOverrides({ unknownSection: { overdueDays: 7 } }), {}, '未知节丢弃');
});

test('② 净化：组长开关 boolean 严格、嵌套结构保留', () => {
  assert.deepEqual(
    sanitizeConfigPolicyOverrides({ leader: { semesterReportReminder: { enabled: false } } }),
    { leader: { semesterReportReminder: { enabled: false } } },
  );
  assert.deepEqual(
    sanitizeConfigPolicyOverrides({ leader: { semesterReportReminder: { enabled: 'false' } } }),
    {},
    '字符串/1 非严格布尔 → 丢弃',
  );
  assert.deepEqual(
    sanitizeConfigPolicyOverrides({ leader: { semesterReportReminder: { frequency: 'weekly' } } }),
    {},
    'frequency 不在白名单 → 丢弃（固定学期制）',
  );
});

test('② 净化：窗口数组合法月日、去重、限 2 窗、非法整体丢弃', () => {
  const ok = { memberConfirmation: { semesterDetainedWindows: [[6, 15, 7, 15], [12, 15, 1, 15]] } };
  assert.deepEqual(sanitizeConfigPolicyOverrides(ok), ok);
  assert.deepEqual(
    sanitizeConfigPolicyOverrides({ memberConfirmation: { semesterDetainedWindows: [[13, 1, 7, 15]] } }),
    {},
    '月 13 非法 → 该窗丢弃 → 空节',
  );
  assert.deepEqual(
    sanitizeConfigPolicyOverrides({ memberConfirmation: { semesterDetainedWindows: [[6, 32, 7, 15]] } }),
    {},
    '日 32 非法 → 丢弃',
  );
  assert.deepEqual(
    sanitizeConfigPolicyOverrides({ memberConfirmation: { semesterDetainedWindows: [[6, 15, 7, 15], [6, 15, 7, 15], [12, 15, 1, 15]] } }),
    { memberConfirmation: { semesterDetainedWindows: [[6, 15, 7, 15], [12, 15, 1, 15]] } },
    '去重 + 至多保留 2 窗',
  );
  assert.deepEqual(
    sanitizeConfigPolicyOverrides({ memberConfirmation: { semesterDetainedWindows: '[[6,15,7,15]]' } }),
    {},
    '非数组丢弃',
  );
});

// ── ③ 读侧注入 applyBranchPolicyOverrides ────────────────────────────────
test('③ 读侧注入：覆盖生效；无覆盖=保持默认；跨支部切换先复位不残留', () => {
  applyBranchPolicyOverrides({ config: { policyOverrides: { inspection: { overdueDays: 12 } } } });
  assert.equal(POLICY_DEFAULTS.inspection.overdueDays, 12, '注入后纪检超期=12');
  assert.equal(POLICY_DEFAULTS.leader.semesterReportReminder.enabled, true, '其它域保持默认');

  applyBranchPolicyOverrides({ config: {} });
  assert.equal(POLICY_DEFAULTS.inspection.overdueDays, 7, '无 overrides → 复位出厂默认');
  assert.deepEqual(
    POLICY_DEFAULTS.memberConfirmation.semesterDetainedWindows,
    [[6, 15, 7, 15], [12, 15, 1, 15]],
  );

  // 切到「另一支部」：有 leader 覆盖但无 inspection → inspection 不得残留上一支部值
  applyBranchPolicyOverrides({ config: { policyOverrides: { inspection: { overdueDays: 20 } } } });
  applyBranchPolicyOverrides({ config: { policyOverrides: { leader: { semesterReportReminder: { enabled: false } } } } });
  assert.equal(POLICY_DEFAULTS.inspection.overdueDays, 7, '跨支部切换先复位（上一支部 20 不残留）');
  assert.equal(POLICY_DEFAULTS.leader.semesterReportReminder.enabled, false, '新支部 leader 覆盖生效');
  assert.equal(applyBranchPolicyOverrides({ config: { policyOverrides: { inspection: { overdueDays: 30 } } } }), true, '有覆盖返回 true');
  assert.equal(applyBranchPolicyOverrides({ config: {} }), false, '无覆盖返回 false');
});

// ── ④ savePolicyOverrides 角色守卫 + 落库 ─────────────────────────────────
test('④ 角色守卫：书记/副/party-staff 全量；纪检/组织/组长仅本域；普通成员拒绝', () => {
  beginMockCase();
  const perm = (actor) => canManagePolicyOverrides(actor, 'br-b1');
  assert.equal(perm({ personId: 'p13', role: 'secretary' }).ok, true);
  assert.equal(perm({ personId: 'p13', role: 'secretary' }).scope, 'all');
  assert.equal(perm({ personId: 'p14', role: 'deputy-secretary' }).ok, true, '副书同权');
  assert.equal(perm({ personId: 'p_pc', role: 'party-staff' }).ok, true);
  assert.equal(perm({ personId: 'p10', role: 'disc-commissioner' }).scope, 'inspection', '纪检=inspection 域');
  assert.equal(perm({ personId: 'p11', role: 'org-commissioner' }).scope, 'memberConfirmation');
  assert.equal(perm({ personId: 'p1', role: 'leader' }).scope, 'leader');
  assert.equal(perm({ personId: 'p3', role: 'participant' }).ok, false, '普通成员无权');
});

test('④ 域保存：纪检保存 overdueDays → 落库 policyOverrides.inspection；恢复默认=删该域键', async () => {
  beginMockCase();
  const r1 = await savePolicyOverrides('br-b1', { inspection: { overdueDays: 10 } }, { actor: { personId: 'p10', role: 'disc-commissioner' } });
  assert.equal(r1.ok, true);
  assert.equal(r1.changed, true);
  assert.deepEqual(po().inspection, { overdueDays: 10 }, '纪检覆盖写入 config.policyOverrides');
  // 保存无实质变化 → changed=false（不产生冗余留痕）
  const r1b = await savePolicyOverrides('br-b1', { inspection: { overdueDays: 10 } }, { actor: { personId: 'p10', role: 'disc-commissioner' } });
  assert.equal(r1b.changed, false);
  // 纪检不能把自己的包捎带组织域（域负责人仅本域键；其它节被忽略）
  await savePolicyOverrides('br-b1', { memberConfirmation: { semesterDetainedWindows: [[3, 1, 3, 7]] } }, { actor: { personId: 'p10', role: 'disc-commissioner' } });
  assert.equal(po().memberConfirmation, undefined, '纪检不可写组织域');
  // 恢复默认：inspection 节置 null → 删除；全空 → policyOverrides null
  const r2 = await savePolicyOverrides('br-b1', { inspection: null }, { actor: { personId: 'p10', role: 'disc-commissioner' } });
  assert.equal(r2.ok, true);
  assert.equal(r2.changed, true);
  assert.equal(po(), null, '唯一覆盖删除后 policyOverrides 归一 null');
  // 钳制路径（写口走同一净化）：0 → 1
  await savePolicyOverrides('br-b1', { inspection: { overdueDays: 0 } }, { actor: { personId: 'p10', role: 'disc-commissioner' } });
  assert.deepEqual(po().inspection, { overdueDays: 1 });
});

test('④ 域保存：组织窗口 / 组长开关 / party-staff 全量（含 leader 节）', async () => {
  beginMockCase();
  const rOrg = await savePolicyOverrides('br-b1', { memberConfirmation: { semesterDetainedWindows: [[6, 20, 7, 10], [12, 20, 1, 10]] } }, { actor: { personId: 'p11', role: 'org-commissioner' } });
  assert.equal(rOrg.ok, true);
  assert.deepEqual(po().memberConfirmation.semesterDetainedWindows, [[6, 20, 7, 10], [12, 20, 1, 10]]);

  const rLeader = await savePolicyOverrides('br-b1', { leader: { semesterReportReminder: { enabled: false } } }, { actor: { personId: 'p1', role: 'leader' } });
  assert.equal(rLeader.ok, true);
  assert.equal(po().leader.semesterReportReminder.enabled, false);

  // party-staff 全量写（保留既有节 + 新增 inspection）
  const rStaff = await savePolicyOverrides('br-b1', { inspection: { overdueDays: 9 } }, { actor: { personId: 'p_pc', role: 'party-staff' } });
  assert.equal(rStaff.ok, true);
  assert.equal(po().inspection.overdueDays, 9);
  assert.equal(po().leader.semesterReportReminder.enabled, false, 'party-staff 全量不丢其它节');
  // 书记（副书同权同测一例）
  const rSec = await savePolicyOverrides('br-b1', { inspection: null }, { actor: { personId: 'p13', role: 'secretary' } });
  assert.equal(rSec.ok, true);
  assert.equal(po().inspection, undefined);
});

test('④ 守卫拒绝：普通成员与支部外域负责人不可写（写口不落地）', async () => {
  beginMockCase();
  const r = await savePolicyOverrides('br-b1', { inspection: { overdueDays: 6 } }, { actor: { personId: 'p3', role: 'participant' } });
  assert.equal(r.ok, false, '普通成员拒绝');
  assert.equal(r.reason.includes('无权限') || r.reason.includes('管理权'), true);
  assert.equal(po(), null, '未落地');
});

// ── ⑤ 组长学期提醒纯判定 ──────────────────────────────────────────────────
test('⑤ 组长学期提醒：开学月学期键 + 首周窗口判定', () => {
  assert.equal(leaderSemesterReportTermKey('2026-03-05T00:00:00'), '2026-H1');
  assert.equal(leaderSemesterReportTermKey('2026-09-01T00:00:00'), '2026-H2');
  assert.equal(leaderSemesterReportTermKey('2026-06-15T00:00:00'), null, '非开学月无学期键');
  assert.equal(isLeaderSemesterRemindWindow('2026-03-01T00:00:00'), true);
  assert.equal(isLeaderSemesterRemindWindow('2026-03-07T00:00:00'), true, '首周含 7 日');
  assert.equal(isLeaderSemesterRemindWindow('2026-03-08T00:00:00'), false, '次周起不提醒');
  assert.equal(isLeaderSemesterRemindWindow('2026-09-05T00:00:00'), true);
  assert.equal(isLeaderSemesterRemindWindow('2026-02-28T00:00:00'), false);
  assert.equal(isLeaderSemesterRemindWindow('2026-10-01T00:00:00'), false);
});

// ── ⑥ 窗口文案单一源 ───────────────────────────────────────────────────────
test('⑥ 窗口文案单一源：semesterDetainedWindowsLabel 与 policy 默认一致', () => {
  assert.equal(
    semesterDetainedWindowsLabel(),
    semesterDetainedWindowsLabel(POLICY_DEFAULTS.memberConfirmation.semesterDetainedWindows),
    '缺省参数引用当前有效窗口',
  );
  assert.equal(semesterDetainedWindowsLabel(), '6/15–7/15、12/15–次年1/15', '默认窗口人类可读文案');
  assert.equal(semesterDetainedWindowsLabel([]), '', '空窗口 → 空文案');
});

// ── ⑦ HTTP 域：PATCH /branches/:id/config 支持 policyOverrides（server 同源校验）────────
let _httpServer = null;
let _httpBase = '';
before(async () => {
  const app = createApp({ dbPath: ':memory:' });
  await seedDatabase(app.locals.db);
  _httpServer = app.listen(0);
  _httpBase = `http://127.0.0.1:${_httpServer.address().port}`;
});
after(() => {
  _httpServer?.closeAllConnections?.();
  return new Promise((resolve) => _httpServer?.close(resolve));
});
async function _login(personId) {
  const r = await fetch(`${_httpBase}/api/v1/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ personId }),
  });
  assert.equal(r.status, 200, `登录失败 ${personId}`);
  return (await r.json()).token;
}
async function _patchConfig(token, body) {
  return fetch(`${_httpBase}/api/v1/branches/br-b1/config`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
}

test('⑦ HTTP：书记可写 policyOverrides（合并/整清）；域负责人仅本域节（越域 400、modules 403）', async () => {
  const sec = await _login('p13');
  const r1 = await _patchConfig(sec, { config: { policyOverrides: { inspection: { overdueDays: 12 } } } });
  assert.equal(r1.status, 200, '现任书记可写 policyOverrides');
  assert.equal((await r1.json()).config.policyOverrides.inspection.overdueDays, 12);
  const r2 = await _patchConfig(sec, { config: { policyOverrides: null } });
  assert.equal(r2.status, 200, '书记可整体恢复默认（null）');
  assert.equal((await r2.json()).config.policyOverrides, null);

  const orgc = await _login('p11');
  const r3 = await _patchConfig(orgc, { config: { policyOverrides: { memberConfirmation: { semesterDetainedWindows: [[6, 20, 7, 10], [12, 20, 1, 10]] } } } });
  assert.equal(r3.status, 200, '组织委员可写自己组织域节');
  const b3 = await r3.json();
  assert.deepEqual(b3.config.policyOverrides.memberConfirmation.semesterDetainedWindows, [[6, 20, 7, 10], [12, 20, 1, 10]]);
  assert.equal(b3.config.policyOverrides.inspection, undefined, '组织委员不能捎带纪检域节');
  const r4 = await _patchConfig(orgc, { config: { policyOverrides: { inspection: { overdueDays: 9 } } } });
  assert.equal(r4.status, 400, '域负责人越域写被拒（仅本域）');
  const r5 = await _patchConfig(orgc, { config: { modules: { hiddenTabIds: [] } } });
  assert.equal(r5.status, 403, '域负责人不可写 modules（保持原门控）');
});

test('⑦ HTTP：普通成员 403；本支部组长可写自己 leader 节', async () => {
  const mem = await _login('p5');
  const r1 = await _patchConfig(mem, { config: { policyOverrides: { inspection: { overdueDays: 5 } } } });
  assert.equal(r1.status, 403, '普通成员不可写 policyOverrides');
  const leader = await _login('p1');
  const r2 = await _patchConfig(leader, { config: { policyOverrides: { leader: { semesterReportReminder: { enabled: false } } } } });
  assert.equal(r2.status, 200, '本支部组长可写 leader 节');
  assert.equal((await r2.json()).config.policyOverrides.leader.semesterReportReminder.enabled, false);
});
