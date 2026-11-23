// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  server/scripts/audit/perf-baseline.mjs —— 读口性能预算（p50/p95/bytes）
//
//  纪律（2026-11-02 批次 526 · Wave 1-B）：
//   · 首轮：没有预算的端点按「实测 p95 × 1.2，且不低于 50ms」生成**内存预算**（报告标 generated）；
//   · 后续：预算只收紧不放松——`budgetFor()` 只读本表，检查器不会把生成值写回源码；
//     需要上调必须人工改本文件并在 PR 说明里写理由；
//   · 超预算判据：当前 p95 > 预算 p95 × 1.2 或 bytes > 预算 bytes × 1.2 ⇒ P2（checks-economy E1）。
//   · 绝对上限（D4）：p95 > 100ms 或响应 > 500KB ⇒ 直接 P2，不依赖预算表。
// ════════════════════════════════════════════════════════════════

import { ENDPOINT_MAP } from './endpoint-map.mjs';

export const PERF_BASELINE_VERSION = '2026-11-02.2';

export const MIN_P95_BUDGET_MS = 50;
export const ABSOLUTE_P95_LIMIT_MS = 100;
export const MAX_RESPONSE_BYTES = 500 * 1024;
export const OVER_BUDGET_RATIO = 1.2;

/**
 * 首轮预算表：键 = `METHOD /api/v1/...`。
 * 初始由 2026-11-02 内存库实测生成（p95 = 实测 × 1.2，下限 50ms；bytes = 实测 × 1.2）。
 * ⚠ 只允许收紧；上调需书面理由。
 */
export const PERF_BASELINE = {
  // 2026-11-02 首次生成：:memory: 演示种子，每口 5 次；p95 = max(50ms, 实测 × 1.2)，bytes = 实测 × 1.2。
  // 只允许收紧；上调必须写理由。
  'GET /api/v1/users': { p95: 50, bytes: 11871 },
  'GET /api/v1/todos': { p95: 50, bytes: 665 },
  'GET /api/v1/notices': { p95: 50, bytes: 7410 },
  'GET /api/v1/activities': { p95: 50, bytes: 28814 },
  'GET /api/v1/attendances': { p95: 50, bytes: 43404 },
  'GET /api/v1/inspections': { p95: 50, bytes: 14549 },
  'GET /api/v1/activityReviews': { p95: 50, bytes: 5948 },
  'GET /api/v1/taskforceReviews': { p95: 50, bytes: 1272 },
  'GET /api/v1/handoffs': { p95: 50, bytes: 866 },
  'GET /api/v1/issues': { p95: 50, bytes: 9168 },
  'GET /api/v1/partyGroups': { p95: 50, bytes: 567 },
  'GET /api/v1/milestones': { p95: 50, bytes: 197 },
  'GET /api/v1/member-confirmations': { p95: 50, bytes: 442 },
  'GET /api/v1/tasks': { p95: 50, bytes: 1282 },
  'GET /api/v1/reviewRequests': { p95: 50, bytes: 495 },
  'GET /api/v1/periodicArchives': { p95: 50, bytes: 1376 },
  'GET /api/v1/archiveRecords': { p95: 50, bytes: 1485 },
  'GET /api/v1/branchDocs': { p95: 50, bytes: 3 },
  'GET /api/v1/branches': { p95: 50, bytes: 340 },
  'GET /api/v1/agenda-votes': { p95: 50, bytes: 3 },
  'GET /api/v1/issue-unread': { p95: 50, bytes: 299 },
  'GET /api/v1/assignments': { p95: 50, bytes: 1887 },
  'GET /api/v1/memberFlows': { p95: 50, bytes: 3 },
  'GET /api/v1/thoughtReports': { p95: 50, bytes: 4184 },
  'GET /api/v1/taskforces': { p95: 50, bytes: 5997 },
  'GET /api/v1/workgroups': { p95: 50, bytes: 18519 },
  'GET /api/v1/workgroup-members': { p95: 50, bytes: 31130 },
  'GET /api/v1/workgroup-grants': { p95: 50, bytes: 3 },
  'GET /api/v1/signups': { p95: 50, bytes: 2222 },
  'GET /api/v1/propTasks': { p95: 50, bytes: 1912 },
  'GET /api/v1/externalDispatches': { p95: 50, bytes: 736 },
  'GET /api/v1/fileSpaceRecords': { p95: 50, bytes: 3 },
  'GET /api/v1/imageRecords': { p95: 50, bytes: 3 },
  'GET /api/v1/makeupTasks': { p95: 50, bytes: 422 },
  'GET /api/v1/attendance-appeals': { p95: 50, bytes: 305 },
  'GET /api/v1/inspection-appeals': { p95: 50, bytes: 316 },
  'GET /api/v1/appointmentRecords': { p95: 50, bytes: 3 },
  'GET /api/v1/member-change-requests': { p95: 50, bytes: 3 },
  'GET /api/v1/auth-audit': { p95: 50, bytes: 3 },
  'GET /api/v1/snapshot/versions': { p95: 50, bytes: 618 },
};

/**
 * 按 `role.tab` 索引的基线（本批首次生成口径）：
 * `tabKey → { 'GET /api/v1/...': { p95, bytes } }`。
 * 值来自上面的端点级基线（同一端点在不同角色下各自留档，后续可逐页签收紧）；
 * 缺项时回落到端点级基线，再缺则调用方生成内存预算（不写回源码）。
 */
export const PERF_BASELINE_BY_TAB = Object.freeze(Object.fromEntries(
  Object.entries(ENDPOINT_MAP).map(([key, entry]) => [
    key,
    Object.freeze(Object.fromEntries(
      (entry.read || [])
        .filter((item) => PERF_BASELINE[item])
        .map((item) => [item, PERF_BASELINE[item]]),
    )),
  ]),
));

/** 取预算；先按 `role.tab`，再回落端点级；缺失 ⇒ null（调用方生成内存预算，不写回源码） */
export function budgetFor(endpoint, tabKey) {
  const tabBudget = tabKey ? PERF_BASELINE_BY_TAB[tabKey] : null;
  if (tabBudget && tabBudget[endpoint]) return tabBudget[endpoint];
  return PERF_BASELINE[endpoint] || null;
}

/** 基线来源（报告用：tab / endpoint / null） */
export function budgetSource(endpoint, tabKey) {
  const tabBudget = tabKey ? PERF_BASELINE_BY_TAB[tabKey] : null;
  if (tabBudget && tabBudget[endpoint]) return 'perf-baseline-tab';
  if (PERF_BASELINE[endpoint]) return 'perf-baseline-endpoint';
  return null;
}

/**
 * 首轮生成预算：p95 × 1.2（最低 50ms），bytes × 1.2。
 * @param {{p95:number, bytes:number}} measured
 */
export function generatedBudget({ p95, bytes }) {
  const p95Budget = Math.max(MIN_P95_BUDGET_MS, Math.ceil((Number(p95) || 0) * OVER_BUDGET_RATIO));
  const bytesBudget = Math.max(1, Math.ceil((Number(bytes) || 0) * OVER_BUDGET_RATIO));
  return { p95: p95Budget, bytes: bytesBudget, generated: true };
}

/** 绝对上限判定（D4） */
export function isOverAbsoluteLimit({ p95, bytes }) {
  return (Number(p95) || 0) > ABSOLUTE_P95_LIMIT_MS || (Number(bytes) || 0) > MAX_RESPONSE_BYTES;
}

/** 相对预算判定（E1）：当前值 > 预算 × 1.2 */
export function isOverBudget(measured, budget) {
  if (!budget) return false;
  const p95Over = (Number(measured.p95) || 0) > (Number(budget.p95) || 0) * OVER_BUDGET_RATIO;
  const bytesOver = (Number(measured.bytes) || 0) > (Number(budget.bytes) || 0) * OVER_BUDGET_RATIO;
  return p95Over || bytesOver;
}

/** 报告摘要：最慢 5 / 最大 5（E2） */
export function perfSummary(rows, limit = 5) {
  const list = Array.isArray(rows) ? rows.slice() : [];
  const slowest = list
    .slice()
    .sort((a, b) => (Number(b.p95) || 0) - (Number(a.p95) || 0))
    .slice(0, limit)
    .map((row) => ({ endpoint: row.endpoint, p50: row.p50, p95: row.p95, bytes: row.bytes }));
  const largest = list
    .slice()
    .sort((a, b) => (Number(b.bytes) || 0) - (Number(a.bytes) || 0))
    .slice(0, limit)
    .map((row) => ({ endpoint: row.endpoint, p95: row.p95, bytes: row.bytes }));
  return { slowest, largest };
}
