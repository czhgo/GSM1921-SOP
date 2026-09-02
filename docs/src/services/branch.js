// role: [工程师]+[AI]
// services/branch.js — 支部服务（P1 党委后台，2026-09-02）
// 支部边界收敛点（防漂移）：人→支部归属、支部配置档案读取（header 软编码/主题/启停模块）
// 单一数据源：mockDB.branches（首启 seed 自 mock/branches.js BRANCHES）

import { mockDB } from '../core/domain.js?v=20260901s';
import { getPersonById } from './person.js?v=20260901s';

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
  const branch = getBranchById(getBranchIdOfPerson(personId));
  return branch?.config?.headerTitle || branch?.name || '光华管理学院本科生党支部';
}
