// role: [工程师]+[AI]
// server/test/branch-config-audit.test.mjs — 支部 config 审计内核（2026-09-09 书记批 B1/B2）
// 纯 Node：mock 形态 + localStorage 内存桩（范式同 policy-config.test.mjs）+ 自包含 server HTTP：
//   ① why 透传：各写口（updateBranchModules/updateBranchBlocks/updateBranchWorkforce/
//      savePolicyOverrides/updateBranchOrg）opts.why → 留痕行 why；默认 undefined 不写（向后兼容）
//   ② rollbackBranchConfig：定位（targetEntryAt/index）、单键 to→from 写回、追加 rollback 留痕
//      （from=回滚前现值 / to=回滚值 / by / why）、角色门、跨键/聚合留痕拒绝
//   ③ 历史上限 CONFIG_HISTORY_MAX=100：追加/回滚后裁剪最早
//   ④ HTTP：PATCH /branches/:id/config body.why 落到留痕行；PATCH /branches/:id/config/rollback
//      （角色门 200/403、未找到 400、聚合留痕 400、副书同权、why 透传）
// 运行：node --test test/branch-config-audit.test.mjs
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';

import { mockDB } from '../../docs/src/core/domain.js?v=20260909e';
import { MockAdapter } from '../../docs/src/core/mock-adapter.js?v=20260909e';
import { setDataSource, registerMockAdapter } from '../../docs/src/core/data-adapter.js?v=20260909e';
import { CONFIG_HISTORY_MAX, CONFIG_ROLLBACK_WHAT } from '../../docs/src/core/config-clean.js?v=20260909e';
import {
  getBranchById, updateBranchModules, updateBranchBlocks, updateBranchWorkforce,
  savePolicyOverrides, updateBranchOrg, createBranch,
  canRollbackBranchConfig, rollbackBranchConfig,
} from '../../docs/src/services/branch.js?v=20260909e';
// HTTP 域
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
  mockDB.branches = [];
  mockDB._loaded = false;
  MockAdapter.loadDB();
}

/** 模拟登录快照（branch.js _actorId 读键；留痕 by 来源） */
function loginAs(personId) {
  _store.set('gsm1921-login-user', JSON.stringify({ personId }));
}

const BR = () => getBranchById('br-b1');
const hist = () => (BR().config && Array.isArray(BR().config.configChangeHistory) ? BR().config.configChangeHistory : []);
const lastRow = () => hist()[hist().length - 1];
const M1 = { hiddenTabIds: ['calendar'], tabOrder: [] };
const M2 = { hiddenTabIds: ['calendar', 'feedback'], tabOrder: [] };

// ── ① why 透传（各写口）───────────────────────────────────────────────────
test('① why 透传：modules/blocks/workforce/policyOverrides/org 写口留痕行带 why；缺省不写键', async () => {
  beginMockCase();
  loginAs('p13');
  await updateBranchModules('br-b1', M1, [], undefined, { why: '附录①-3' });
  assert.equal(lastRow().what, 'modules');
  assert.equal(lastRow().why, '附录①-3', 'updateBranchModules why 透传');
  assert.equal(lastRow().by, 'p13');

  await updateBranchWorkforce('br-b1', { calendar: { ownerType: 'role', ownerId: 'secretary' } }, { why: '依据 W' });
  assert.equal(lastRow().what, 'workforce');
  assert.equal(lastRow().why, '依据 W', 'updateBranchWorkforce why 透传');

  await updateBranchBlocks('br-b1', { outputBlocks: { hiddenBlockIds: ['publicity'], blockOrder: [] } }, { why: '依据 B' });
  assert.equal(lastRow().what, 'blocks');
  assert.equal(lastRow().why, '依据 B', 'updateBranchBlocks why 透传');

  await savePolicyOverrides('br-b1', { inspection: { overdueDays: 8 } }, { actor: { personId: 'p13', role: 'secretary' }, why: '依据 P' });
  assert.equal(lastRow().what, 'policyOverrides');
  assert.equal(lastRow().why, '依据 P', 'savePolicyOverrides why 透传');

  await updateBranchOrg('br-b1', { themePreset: 'sky' }, { by: 'p13', why: '依据 O' });
  assert.equal(lastRow().what, 'themePreset');
  assert.equal(lastRow().why, '依据 O', 'updateBranchOrg why 透传');

  // 缺省（向后兼容）：不写 why 键、行结构不变
  const beforeLen = hist().length;
  await updateBranchOrg('br-b1', { desc: '无依据自述' }, { by: 'p13' });
  const row = lastRow();
  assert.equal(hist().length, beforeLen + 1);
  assert.equal(row.what, 'desc');
  assert.ok(!('why' in row), '无 why 不写键（默认 undefined）');
  assert.ok(row.by && row.at && 'from' in row && 'to' in row, '既有 {by,at,what,from,to} 行结构保留');
});

// ── ② 回滚：单键写回 + 留痕 ───────────────────────────────────────────────
test('② rollback：回滚最近一条单键变更 → to→from 写回，追加 rollback 留痕（from=回滚前现值/to=回滚值/by）', async () => {
  beginMockCase();
  loginAs('p13');
  await updateBranchModules('br-b1', M1, [], undefined, { why: '第一次改' });
  const firstAt = lastRow().at;
  await updateBranchModules('br-b1', M2, [], undefined, { why: '第二次改' });
  const secondAt = lastRow().at;
  assert.deepEqual(BR().config.modules, M2);

  // 回滚第二条（modules M1 → M2 的变更）：恢复为 M1；留痕 from=M2（回滚前现值）to=M1
  const r1 = await rollbackBranchConfig('br-b1', { by: 'p13', targetEntryAt: secondAt });
  assert.equal(r1.ok, true);
  assert.deepEqual(BR().config.modules, M1, '单键写回：modules 恢复为该条变更前值 M1');
  const rb1 = lastRow();
  assert.equal(rb1.what, CONFIG_ROLLBACK_WHAT);
  assert.equal(rb1.by, 'p13');
  assert.deepEqual(rb1.from, M2, 'rollback 留痕 from = 回滚前该键现值');
  assert.deepEqual(rb1.to, M1, 'rollback 留痕 to = 回滚值');
  assert.equal(rb1.why, undefined, '未给 why 不写键');

  // 再回滚第一条（null → M1）：恢复为 null（默认全开），留痕 from=M1（回滚前现值）
  const r2 = await rollbackBranchConfig('br-b1', { by: 'p13', targetEntryAt: firstAt });
  assert.equal(r2.ok, true);
  assert.equal(BR().config.modules, null, '继续回滚更早条目：恢复到该条变更前（null=默认全开）');
  assert.deepEqual(hist()[hist().length - 1].from, M1);
  assert.equal(hist()[hist().length - 1].to, null);

  // index 定位方式等价
  await updateBranchWorkforce('br-b1', { calendar: { ownerType: 'role', ownerId: 'secretary' } });
  const idx = hist().length - 1;
  const r3 = await rollbackBranchConfig('br-b1', { by: 'p13', index: idx });
  assert.equal(r3.ok, true);
  assert.equal(BR().config.workforce, null, '按 index 定位回滚 workforce → 恢复缺省分工');

  // why 透传（回滚依据）
  await updateBranchOrg('br-b1', { headerTitle: '回滚测试页眉' }, { by: 'p13' });
  const atH = lastRow().at;
  const r4 = await rollbackBranchConfig('br-b1', { by: 'p13', targetEntryAt: atH }, '附录⑨ 复核纠正');
  assert.equal(r4.ok, true);
  assert.equal(BR().config.headerTitle, '光华管理学院本科生党支部', 'headerTitle 恢复种子值');
  const rb4 = lastRow();
  assert.equal(rb4.what, CONFIG_ROLLBACK_WHAT);
  assert.equal(rb4.why, '附录⑨ 复核纠正', 'rollback why 透传');
});

test('② rollback：角色门（书记现任/副书/party-staff 可；普通成员不可；非现任书记不可）', async () => {
  beginMockCase();
  const perm = (personId) => canRollbackBranchConfig({ personId }, 'br-b1');
  assert.equal(perm('p13').ok, true, '现任书记（secretaryId 匹配）');
  assert.equal(perm('p14').ok, true, '本支部副书记（副书同权）');
  assert.equal(perm('p_pc').ok, true, 'party-staff');
  assert.equal(perm('p3').ok, false, '普通成员无回滚权');
  assert.equal(perm('p_ghost').ok, false, '未登录/查无档案不可');

  // 写口兜底：普通成员调 rollback → 拒绝且不落库
  await updateBranchOrg('br-b1', { desc: '待回滚自述' }, { by: 'p13' });
  const at = lastRow().at;
  const bad = await rollbackBranchConfig('br-b1', { by: 'p3', targetEntryAt: at });
  assert.equal(bad.ok, false);
  assert.equal(BR().config.desc, '待回滚自述', '未落地');
  const bad2 = await rollbackBranchConfig('br-b1', { by: 'p_ghost', targetEntryAt: at });
  assert.equal(bad2.ok, false);

  // 非现任书记：新支部席位空缺（secretaryId null），书记角色也不能回滚
  const created = await createBranch({ name: '测试新支部', by: 'p_pc', actorRole: 'party-staff' });
  assert.equal(created.ok, true);
  const bx = getBranchById(created.branch.id);
  assert.equal(bx.secretaryId, null);
  assert.equal(canRollbackBranchConfig({ personId: 'p13' }, bx.id).ok, false, '席位空缺支部：书记角色非现任书记不可回滚');
});

test('② rollback：跨键/聚合留痕（branch-created/config-copied 等）拒绝；未找到定位拒绝', async () => {
  beginMockCase();
  loginAs('p13');
  // 注入聚合留痕场景：复制配置到 br-b1 前先建一个源支部（applyConfigCopy 会写 config-copied 聚合行）
  const src = await createBranch({ name: '源支部（复制）', by: 'p_pc', actorRole: 'party-staff' });
  assert.equal(src.ok, true);
  const { applyConfigCopy } = await import('../../docs/src/services/branch.js?v=20260909e');
  const rCopy = await applyConfigCopy(src.branch.id, ['br-b1'], { by: 'p13' });
  assert.equal(rCopy[0].ok, true);
  const copiedRow = lastRow();
  assert.equal(copiedRow.what, 'config-copied', '聚合留痕已写入');

  const r1 = await rollbackBranchConfig('br-b1', { by: 'p13', targetEntryAt: copiedRow.at });
  assert.equal(r1.ok, false, '聚合留痕不支持单键回滚');
  assert.equal(r1.reason.includes('config-copied') || r1.reason.includes('单键'), true);

  const r2 = await rollbackBranchConfig('br-b1', { by: 'p13', targetEntryAt: '2026-01-01T00:00:00.000Z' });
  assert.equal(r2.ok, false, '未找到该条变更记录');
  const r3 = await rollbackBranchConfig('br-b1', { by: 'p13' });
  assert.equal(r3.ok, false, '无定位参数 → 拒绝');
});

// ── ③ 历史上限裁剪 ────────────────────────────────────────────────────────
test('③ 裁剪：追加/回滚后保留最近 CONFIG_HISTORY_MAX 条（最早丢弃）', async () => {
  beginMockCase();
  loginAs('p13');
  // 构造 105 条存量留痕 + 一条可回滚 modules 变更（共 106 条）
  const rows = [];
  for (let i = 0; i < 105; i++) {
    rows.push({ by: 'p13', at: `2026-01-01T00:00:${String(i).padStart(2, '0')}.000Z`, what: 'desc', from: `旧${i}`, to: `新${i}` });
  }
  const mAt = '2026-09-09T00:00:00.000Z';
  rows.push({ by: 'p13', at: mAt, what: 'modules', from: null, to: M1 });
  const b0 = BR();
  mockDB.branches = mockDB.branches.map(b => (b.id === 'br-b1'
    ? { ...b, config: { ...b.config, modules: M1, configChangeHistory: rows } }
    : b));
  assert.equal(hist().length, 106);

  const r = await rollbackBranchConfig('br-b1', { by: 'p13', targetEntryAt: mAt });
  assert.equal(r.ok, true);
  assert.equal(BR().config.modules, null, '回滚生效');
  assert.equal(hist().length, CONFIG_HISTORY_MAX, '回滚后裁剪至上限 100');
  assert.equal(hist()[hist().length - 1].what, CONFIG_ROLLBACK_WHAT, '回滚留痕保留在裁剪后最新位');
  assert.equal(hist()[hist().length - 1].to, null);

  // 追加路径同样裁剪（写口 push 后不超上限）
  beginMockCase();
  loginAs('p13');
  const b1 = BR();
  const rows2 = [];
  for (let i = 0; i < 100; i++) {
    rows2.push({ by: 'p13', at: `2026-02-01T00:00:${String(i).padStart(2, '0')}.000Z`, what: 'desc', from: `a${i}`, to: `b${i}` });
  }
  mockDB.branches = mockDB.branches.map(b => (b.id === 'br-b1'
    ? { ...b, config: { ...b.config, configChangeHistory: rows2 } }
    : b));
  await updateBranchOrg('br-b1', { themePreset: 'green' }, { by: 'p13' });
  assert.equal(hist().length, CONFIG_HISTORY_MAX, '写口追加后裁剪至上限 100');
  assert.equal(lastRow().what, 'themePreset', '最新追加保留');
});

// ── ④ HTTP 域：why + rollback 端点 ────────────────────────────────────────
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
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ personId, password: '123456' }),
  });
  assert.equal(r.status, 200, `登录失败 ${personId}`);
  return (await r.json()).token;
}
function _auth(token) {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}
async function _patchConfig(token, body) {
  return fetch(`${_httpBase}/api/v1/branches/br-b1/config`, {
    method: 'PATCH', headers: _auth(token), body: JSON.stringify(body),
  });
}
async function _rollback(token, body) {
  return fetch(`${_httpBase}/api/v1/branches/br-b1/config/rollback`, {
    method: 'PATCH', headers: _auth(token), body: JSON.stringify(body),
  });
}

test('④ HTTP：PATCH /branches/:id/config 带 body.why → 服务端留痕行落 why；书记可写', async () => {
  const sec = await _login('p13');
  const r = await _patchConfig(sec, { config: { themePreset: 'sky' }, why: '附录①-4 HTTP' });
  assert.equal(r.status, 200);
  const b = await r.json();
  const theme = (b.config.configChangeHistory || []).find((h) => h.what === 'themePreset');
  assert.ok(theme, 'themePreset 留痕存在');
  assert.equal(theme.by, 'p13');
  assert.equal(theme.why, '附录①-4 HTTP', '服务端将 body.why 落到留痕行');
  assert.equal(theme.to, 'sky');
});

test('④ HTTP：rollback 端点（现任书记 200 → 单键写回 + rollback 留痕）；副书同权；party-staff 亦可', async () => {
  // 书记路径
  const sec = await _login('p13');
  const r1 = await _patchConfig(sec, { config: { desc: '审计测试自述' } });
  assert.equal(r1.status, 200);
  const b1 = await r1.json();
  const descRow = (b1.config.configChangeHistory || []).find((h) => h.what === 'desc');
  assert.ok(descRow && descRow.to === '审计测试自述');

  const rr = await _rollback(sec, { targetEntryAt: descRow.at });
  assert.equal(rr.status, 200, '现任书记可回滚');
  const b2 = await rr.json();
  assert.equal(b2.config.desc, null, 'desc 恢复为变更前（null=无自述）');
  const rb = b2.config.configChangeHistory[b2.config.configChangeHistory.length - 1];
  assert.equal(rb.what, 'rollback');
  assert.equal(rb.by, 'p13');
  assert.equal(rb.from, '审计测试自述', 'rollback from = 回滚前现值');
  assert.equal(rb.to, null);

  // 副书同权
  const dep = await _login('p14');
  const r2 = await _patchConfig(dep, { config: { headerTitle: '副书页眉' } });
  assert.equal(r2.status, 200);
  const hRow = (await r2.json()).config.configChangeHistory.find((h) => h.what === 'headerTitle');
  const rr2 = await _rollback(dep, { targetEntryAt: hRow.at });
  assert.equal(rr2.status, 200, '本支部副书记可回滚（副书同权）');

  // party-staff 全量
  const staff = await _login('p_pc');
  const r3 = await _patchConfig(staff, { config: { themePreset: 'blue' } });
  const tRow = (await r3.json()).config.configChangeHistory.find((h) => h.what === 'themePreset');
  const rr3 = await _rollback(staff, { targetEntryAt: tRow.at, why: 'HTTP 回滚依据' });
  assert.equal(rr3.status, 200, 'party-staff 可回滚');
  const b3 = await rr3.json();
  assert.equal(b3.config.themePreset, null);
  const rb3 = b3.config.configChangeHistory[b3.config.configChangeHistory.length - 1];
  assert.equal(rb3.why, 'HTTP 回滚依据', 'rollback why 透传');
});

test('④ HTTP：rollback 拒绝路径（普通成员 403 / 未找到 400 / 聚合留痕 400）', async () => {
  // 先造一条可回滚行 + 一个新支部（含 branch-created 聚合留痕）
  const staff = await _login('p_pc');
  const r0 = await _patchConfig(staff, { config: { desc: '拒绝路径自述' } });
  const descRow = (await r0.json()).config.configChangeHistory.find((h) => h.what === 'desc');
  const created = await fetch(`${_httpBase}/api/v1/branches`, {
    method: 'POST', headers: _auth(staff), body: JSON.stringify({ mode: 'empty', name: '回滚测试支部' }),
  });
  assert.equal(created.status, 201);
  const nb = (await created.json()).branch;
  const createdRow = nb.config.configChangeHistory[0];
  assert.equal(createdRow.what, 'branch-created');

  // 普通成员 403
  const mem = await _login('p5');
  const r1 = await _rollback(mem, { targetEntryAt: descRow.at });
  assert.equal(r1.status, 403, '普通成员不可回滚');

  // 未找到 400
  const r2 = await _rollback(staff, { targetEntryAt: '2026-01-01T00:00:00.000Z' });
  assert.equal(r2.status, 400, '未找到该条变更记录');

  // 聚合留痕 400（branch-created 不在单键回滚白名单）
  const agg = await fetch(`${_httpBase}/api/v1/branches/${nb.id}/config/rollback`, {
    method: 'PATCH', headers: _auth(staff), body: JSON.stringify({ targetEntryAt: createdRow.at }),
  });
  assert.equal(agg.status, 400, '聚合留痕不支持单键回滚');
  assert.equal((await agg.json()).error.includes('branch-created'), true);
});
