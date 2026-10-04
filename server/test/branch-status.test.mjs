// role: [工程师]+[AI]
// server/test/branch-status.test.mjs — 支部「停用（软）」写口（2026-10-02 批次 344 · 支书裁 `D-744`③
//   「补『停用（软）』入口」；探查来源＝批次 341 全域 CRUD 矩阵「`branches` 能建不能删」`CRUD-5`）。
//
// 语义钉死（本件即判据）：
//   **软停用＝只改顶层 `status`（`active` ↔ `inactive`）**——支部实例仍可被读（监控台账 / 进去只读），
//   **任期档案（`appointment_records`）与成员档案全部保留**，**不做物理删除**。
//   写口＝`services/branch/branch.js::setBranchActive` → `getAdapter().branches.update` → 本地 `mockDB` 同步 → `persist()`。
//
// 覆盖（纯 node；localStorage 内存桩同 member-persist / branch-appoint-inline 头注模式；真 `MockAdapter` 直连）：
//   B1 停用：status→`inactive`、支部数量不变、任期档案一字不改、name/secretaryId/createdAt 不动、读链同步
//   B2 恢复：status→`active`
//   B3 非恒真（反例）：停用后 `getBranchById` 仍能取到该支部（证「不是删除」）
// 运行：node --test test/branch-status.test.mjs（server 目录）
import { test, before } from 'node:test';
import assert from 'node:assert/strict';

import { mockDB } from '../../docs/src/core/domain/domain.js?v=20261004h';
import { MockAdapter } from '../../docs/src/data/mock-adapter.js?v=20261004h';
import { registerMockAdapter, setDataSource } from '../../docs/src/data/data-adapter.js?v=20261004h';
import { setBranchActive, getBranchById } from '../../docs/src/services/branch/branch.js?v=20261004h';

// ── localStorage 内存桩（member-persist 同款；key/length 供枚举）──
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

const TARGET = 'br-b1'; // loadDB 种子里的示例支部（secretaryId p13）

before(() => {
  registerMockAdapter(MockAdapter);
  setDataSource('mock');
  mockDB._loaded = false;
  MockAdapter.loadDB(); // 种子：branches（br-b1）＋ appointment_records
});

/** 快照：支部数量 + 任期档案（序列化比对，证「一字不改」） */
function snap() {
  return {
    n: (mockDB.branches || []).length,
    appts: JSON.stringify(mockDB.appointmentRecords || []),
  };
}

test('B1 停用（软）：只置 status=inactive，不物理删、其余字段与任期档案一字不改', async () => {
  const before0 = { ...getBranchById(TARGET) };
  const s0 = snap();
  const next = await setBranchActive(TARGET, false);

  assert.equal(next.status, 'inactive', '写口返回的记录 status 已置 inactive');
  const s1 = snap();
  assert.equal(s1.n, s0.n, '支部数量不变（软停用 ≠ 删除）');
  assert.equal(s1.appts, s0.appts, '任期档案（appointment_records）一字不改');

  const cur = getBranchById(TARGET); // 读链同步（mockDB 已同步）
  assert.equal(cur.status, 'inactive', '读链看到 inactive');
  assert.equal(cur.name, before0.name, 'name 未动');
  assert.equal(cur.secretaryId, before0.secretaryId, 'secretaryId 未动');
  assert.equal(cur.createdAt, before0.createdAt, 'createdAt 未动');
  assert.deepEqual(cur.config, before0.config, 'config 整块未动');
});

test('B2 恢复：status 回 active（同一写口、可逆）', async () => {
  const next = await setBranchActive(TARGET, true);
  assert.equal(next.status, 'active');
  assert.equal(getBranchById(TARGET).status, 'active', '读链看到 active');
});

test('B3 非恒真（反例）：停用后该支部仍在（证「软停用不是删除」）', async () => {
  await setBranchActive(TARGET, false);
  const cur = getBranchById(TARGET);
  assert.ok(cur, '停用后 getBranchById 仍能取到该支部 ⇒ 未物理删');
  assert.equal(cur.id, TARGET);
  assert.equal(cur.status, 'inactive');
  await setBranchActive(TARGET, true); // 复原现场
});
