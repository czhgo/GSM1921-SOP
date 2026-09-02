// role: [工程师]+[AI]
// services/branch.js — 支部服务（P1 党委后台，2026-09-02）
// 支部边界收敛点（防漂移）：人→支部归属、支部配置档案读取（header 软编码/主题/启停模块）
// 单一数据源：mockDB.branches（首启 seed 自 mock/branches.js BRANCHES）

import { mockDB } from '../core/domain.js?v=20260901x';
import { getPersonById } from './person.js?v=20260901x';
import { PARTY_COMMITTEE } from '../mock/branches.js?v=20260901x';
import { getAdapter, persist } from '../core/data-adapter.js?v=20260901x';

export function getBranchById(branchId) {
  return (mockDB.branches || []).find(b => b.id === branchId) || null;
}

/**
 * 人 → 所属支部 id（书记 2026-09-02 决策：党员严格单支部）
 * 无档案/党委级（party-staff，branchId null）→ 兜底 br-b1（当前唯一支部，兼容现有演示）
 */
export function getBranchIdOfPerson(personId) {
  if (!personId) return 'br-b1';
  const person = getPersonById(personId);
  return person?.branchId || 'br-b1';
}

/**
 * header 品牌软编码（config.headerTitle → branch.name → 兜底全称）
 * 支部名随支部配置更换显示——不硬编码"光华管理学院本科生党支部"
 */
export function getHeaderTitle(personId) {
  // 党委级角色：header 显示院系党委名（不属于任一支部）
  if (personId) {
    const person = getPersonById(personId);
    if (person?.role === 'party-staff') return PARTY_COMMITTEE.name;
  }
  const branch = getBranchById(getBranchIdOfPerson(personId));
  return branch?.config?.headerTitle || branch?.name || '光华管理学院本科生党支部';
}

/**
 * 支部内资源隔离过滤（收敛点，防各 tab 手写过滤漂移）：
 * 按当前人所属支部过滤行；老数据无 branchId 视为 br-b1（惰性维度迁移兼容）。
 * 单支部时代恒等（全部 br-b1）；党委创建新支部并挂入跨支部数据后自然生效。
 */
export function withinBranch(rows, personId) {
  const bid = getBranchIdOfPerson(personId);
  return rows.filter(r => (r.branchId || 'br-b1') === bid);
}

// ── 党委支部管理写操作（P1；adapter CRUD 实时写 + 本地 mockDB 同步，刷新不丢）────────
/** 党委创建支部（支部不预设名字——名称/类型由党委录入） */
export async function createBranch({ name, type }) {
  const branch = await getAdapter().branches.create({ name: String(name || '').trim(), type: String(type || '').trim() });
  // API 模式 adapter.create 只 POST server——本地 mockDB 同步（mock 模式已改本地，防重复）
  if (!(mockDB.branches || []).some(b => b.id === branch.id)) {
    mockDB.branches = [...mockDB.branches, branch];
  }
  persist();
  return branch;
}

/** 党委改支部名（同步 config.headerTitle——header 软编码随之变化） */
export async function renameBranch(id, name) {
  const next = await getAdapter().branches.update(id, { name: String(name || '').trim() });
  const idx = (mockDB.branches || []).findIndex(b => b.id === id);
  if (idx >= 0) {
    mockDB.branches = [...mockDB.branches.slice(0, idx), next, ...mockDB.branches.slice(idx + 1)];
  }
  persist();
  return next;
}
