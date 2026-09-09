// role: [工程师]+[AI]
// server/test/branch-appoint-inline.test.mjs — 附录⑩ S5 R5-1：建空支部「就地任命首任骨干」（2026-09-06）
// 覆盖（纯 node；localStorage 内存桩复用 member-persist 头 60 行模式，种子经 MockAdapter.loadDB；
// 任命写口走假 mock 适配器（wizard-copy 同法，同步零延迟）——语义对齐 mock-adapter branches/appointmentRecords）：
//   ① 空支部创建成功 → 就地任命首任书记：branches[new].secretaryId===书记 id、
//      appointmentRecords 新增现任记录（branchId=new、无 to、note 就任命）、
//      person.role==='secretary'（PersonStore 读链）、users 对应行 role==='secretary'（注入行存在 → 正路径）
//   ② 组织委员任命：person.role/users.role==='org-commissioner'；不写 appointmentRecords（书记任期专表）
//   ③ 书记=组织委员同人 → 服务层拦截 throw（UI 勾选/下拉/拦截属 DOM 交互，纯 node 不覆盖 → 代码自查）
//   ④ 取消防任命（仅建支部、不调任命）→ 不产生 appointmentRecords、secretaryId 保持 null
//   ⑤ 原支部 br-b1 不受影响（跨支部兼任边界：任命 p13 到新支部不清 br-b1 席位；记录逐支部独立）
// 运行：node --test test/branch-appoint-inline.test.mjs（server 目录）
import { test, before } from 'node:test';
import assert from 'node:assert/strict';

import { mockDB } from '../../docs/src/core/domain.js?v=20260909e';
import { MockAdapter } from '../../docs/src/core/mock-adapter.js?v=20260909e';
import { registerMockAdapter, setDataSource } from '../../docs/src/core/data-adapter.js?v=20260909e';
import { createBranch, getBranchById } from '../../docs/src/services/branch.js?v=20260909e';
import { PersonStore } from '../../docs/src/services/person.js?v=20260909e';
import { appointInauguralOfficers } from '../../docs/src/services/appointment.js?v=20260909e';

// ── localStorage 内存桩（member-persist 同款；key/length 供 handleResetIfRequested 枚举）──
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

// users 基线（domain.js 初始 u_* 演示账号行；loadDB 不重置 users → 每例显式回基线）
const BASE_USERS = (mockDB.users || []).map(u => ({ ...u }));

// ── 假 mock 适配器（语义对齐 mock-adapter：branches.update 合并 config 并落 mockDB、
//    appointmentRecords.create/update 直写 mockDB；users.update 返回 {id,role} 由 appointment.js
//    _syncUserRole 落 mockDB.users 对应行——真实 mock 适配器同构但带 600ms 延迟，测试用同步版）──
const adapter = {
  saveDB() {},
  branches: {
    update(id, patch) {
      const idx = (mockDB.branches || []).findIndex(b => b.id === id);
      if (idx === -1) throw Object.assign(new Error(`支部 ${id} 不存在`), { type: 'NotFoundError' });
      const cur = mockDB.branches[idx];
      const nextConfig = { ...(cur.config || {}), ...(patch.config || {}) };
      if (patch.name !== undefined && patch.name) nextConfig.headerTitle = patch.name;
      const next = { ...cur, ...patch, config: nextConfig };
      mockDB.branches = [...mockDB.branches.slice(0, idx), next, ...mockDB.branches.slice(idx + 1)];
      return next;
    },
    updateConfig(id, configPatch) { return this.update(id, { config: configPatch }); },
  },
  users: {
    update(id, patch) { return Promise.resolve({ id: String(id), ...patch }); },
  },
  appointmentRecords: {
    create(data) {
      const row = {
        id: `appt-inline-${(mockDB.appointmentRecords || []).length + 1}`,
        branchId: data.branchId,
        secretaryId: data.secretaryId,
        appointedBy: data.appointedBy || 'party-staff',
        note: data.note || '',
        from: new Date().toISOString(),
        to: null, // null=现任
      };
      mockDB.appointmentRecords = [...(mockDB.appointmentRecords || []), row];
      return Promise.resolve(row);
    },
    update(id, patch) {
      const idx = (mockDB.appointmentRecords || []).findIndex(r => r.id === id);
      if (idx === -1) throw Object.assign(new Error(`任期记录 ${id} 不存在`), { type: 'NotFoundError' });
      const next = { ...mockDB.appointmentRecords[idx], ...patch };
      mockDB.appointmentRecords = [...mockDB.appointmentRecords.slice(0, idx), next, ...mockDB.appointmentRecords.slice(idx + 1)];
      return Promise.resolve(next);
    },
  },
};

before(() => { registerMockAdapter(adapter); });

/** 每例独立现场（member-persist 同款）：清业务域 + 清存储 + loadDB 回种子 + users 回基线 */
function beginMockCase() {
  _store.clear();
  delete globalThis.window;
  for (const k of [
    'activities', 'tasks', 'attendances', 'inspections', 'taskforces', 'notices', 'todos',
    'assignments', 'signups', 'activityReviews', 'taskforceReviews', 'agendaVotes',
    'memberChangeRequests', 'committeeBroadcasts', 'thoughtReports', 'branchDocs',
    'appointmentRecords', 'reviewRequests', 'archiveRecords',
  ]) {
    mockDB[k] = [];
  }
  mockDB.branches = [];
  mockDB._loaded = false;
  setDataSource('mock'); // 数据源复位
  MockAdapter.loadDB();  // seed：activities/tasks/assignments/archiveRecords/signups/branches(br-b1, secretaryId p13)
  mockDB.users = BASE_USERS.map(u => ({ ...u })); // loadDB 不重置 users → 显式回基线（防跨用例污染）
}

/** 建空支部（party-staff 动作；返回 createBranch 产物） */
async function createEmptyBranch(name) {
  const res = await createBranch({ name, by: 'p_pc', actorRole: 'party-staff' });
  assert.equal(res.ok, true, JSON.stringify(res));
  return res.branch;
}

// ═══════════════ ① ② 就地任命书记+组织委员 ═══════════════
test('就地任命首任书记+组织委员：secretaryId/任期记录/person.role/users 行/原支部不受影响', async () => {
  beginMockCase();
  // users 对应行「若存在该行」正路径：p3/p6 注入 mockDB.users（模拟 API 模式缓存含 p-账号行）
  mockDB.users = [
    ...mockDB.users,
    { id: 'p3', name: '何晓峰', role: 'participant', developStage: '正式党员', branchId: 'br-b1' },
    { id: 'p6', name: '苏明哲', role: 'participant', developStage: '发展对象', branchId: 'br-b1' },
  ];
  const b1Before = JSON.stringify(getBranchById('br-b1'));
  assert.equal(PersonStore.getById('p3').role, 'participant', '任命前 p3 为普通成员');

  const created = await createEmptyBranch('光华管理学院硕士党支部');
  const ap = await appointInauguralOfficers({ branchId: created.id, secretaryId: 'p3', orgCommissionerId: 'p6' });
  assert.equal(ap.ok, true, JSON.stringify(ap));
  assert.equal(ap.secretary, true, '书记任命完成标记');
  assert.equal(ap.org, true, '组织委员任命完成标记');

  // ① branches[new].secretaryId===书记 id；原支部不被触碰
  const newB = getBranchById(created.id);
  assert.equal(newB.secretaryId, 'p3');
  assert.equal(newB.config.configChangeHistory.length, 1, 'config 留痕仍仅 branch-created（org 任命无纯追加口，不写 config 历史）');
  assert.equal(JSON.stringify(getBranchById('br-b1')), b1Before, '原支部记录原样（secretaryId p13 / config 均未动）');
  // ① appointmentRecords：新支部 1 条现任记录（无 to、secretaryId=p3、note 就地任命）
  const recs = (mockDB.appointmentRecords || []).filter(r => r.branchId === created.id);
  assert.equal(recs.length, 1);
  assert.equal(recs[0].to, null, '现任记录未封口');
  assert.equal(recs[0].secretaryId, 'p3');
  assert.match(recs[0].note || '', /建空支部就地任命首任书记/);
  assert.equal((mockDB.appointmentRecords || []).some(r => r.branchId === 'br-b1'), false, '原支部任期记录零新增');
  // ① person.role（读链 = 档案叠加覆盖层）→ 'secretary'（角色双链补齐）
  assert.equal(PersonStore.getById('p3').role, 'secretary');
  // ① users 对应行 role==='secretary'（注入行存在 → 正路径）
  assert.equal((mockDB.users || []).find(u => u.id === 'p3').role, 'secretary');
  // ② 组织委员：person.role/users.role==='org-commissioner'；不写 appointmentRecords（书记任期专表）
  assert.equal(PersonStore.getById('p6').role, 'org-commissioner');
  assert.equal((mockDB.users || []).find(u => u.id === 'p6').role, 'org-commissioner');
  assert.equal((mockDB.appointmentRecords || []).filter(r => r.branchId === created.id).length, 1, '组织委员不产生任期记录');
  // 数据边界：任命不改 person.branchId（跨支部兼任演示——p3/p6 仍属 br-b1 档案）
  assert.equal(PersonStore.getById('p3').branchId, 'br-b1');
  assert.equal(PersonStore.getById('p6').branchId, 'br-b1');
});

// ═══════════════ ⑤ 跨支部兼任边界 ═══════════════
test('跨支部兼任：任命 br-b1 现任书记 p13 为新支部首任书记 → 原支部席位不清空、任期记录逐支部独立', async () => {
  beginMockCase();
  const created = await createEmptyBranch('兼任演示支部');
  const ap = await appointInauguralOfficers({ branchId: created.id, secretaryId: 'p13' });
  assert.equal(ap.ok, true, JSON.stringify(ap));
  assert.equal(ap.secretary, true);
  assert.equal(ap.org, false, '未选组织委员 → 跳过标记');
  assert.equal(getBranchById(created.id).secretaryId, 'p13');
  assert.equal(getBranchById('br-b1').secretaryId, 'p13', '原支部 secretaryId 不受影响（兼任不清原席位）');
  const newRecs = (mockDB.appointmentRecords || []).filter(r => r.branchId === created.id);
  assert.equal(newRecs.length, 1);
  assert.equal(newRecs[0].secretaryId, 'p13');
  assert.equal((mockDB.appointmentRecords || []).some(r => r.branchId === 'br-b1'), false, '原支部任期记录未被新任命触碰');
  assert.equal(PersonStore.getById('p13').role, 'secretary', 'p13 本就书记，角色不变');
});

// ═══════════════ ③ 同人拦截 ═══════════════
test('书记=组织委员同人 → appointInauguralOfficers 拦截 throw，不产生任何任命痕迹', async () => {
  beginMockCase();
  const created = await createEmptyBranch('同人拦截支部');
  await assert.rejects(
    () => appointInauguralOfficers({ branchId: created.id, secretaryId: 'p3', orgCommissionerId: 'p3' }),
    /同一人/,
  );
  assert.equal(getBranchById(created.id).secretaryId, null, '拦截在写前 → secretaryId 保持空缺');
  assert.equal((mockDB.appointmentRecords || []).filter(r => r.branchId === created.id).length, 0, '拦截不产生任期记录');
  assert.equal(PersonStore.getById('p3').role, 'participant', '拦截不产生角色变更');
});

// ═══════════════ ④ 取消防任命 ═══════════════
test('取消防任命（仅建空支部）→ 不产生 appointmentRecords、secretaryId null、成员角色不变', async () => {
  beginMockCase();
  const created = await createEmptyBranch('不任命空支部');
  assert.equal(created.secretaryId, null, '仅建支部席位空缺');
  assert.equal(getBranchById(created.id).secretaryId, null);
  assert.equal((mockDB.appointmentRecords || []).length, 0, '取消防任命 = 零任期记录');
  assert.equal(PersonStore.getById('p3').role, 'participant', '成员档案未被触碰');
  assert.equal((mockDB.users || []).length, BASE_USERS.length, 'users 行零新增零改动');
});
