// party-groups.js — 党小组（一等实体）Mock 种子（2026-09-14 批次 25，支书特批）
// 数据模型对齐 domain.js mockDB.partyGroups。
// 口径（本文与 services/party-group.js 一起构成「活组清单」来源）：
//   · 本支部（br-b1）现有三组，seq 为组序（决定显示顺序，续建自动取 max+1）。
//   · status：active 活组 / dissolved 已解散（解散组保留历史留痕，不改删除）。
//   · 不写 leaderId——组长由成员档案（role='leader' + partyGroup）派生，避免两处维护。
//   · history：组级操作留痕（create/rename/dissolve），由服务层写口追加。
//   · 本文件为**无任何 import 的叶子数据模块**：org-base-data-preview.js 派生组枚举时
//     直接 import 本文件（不依赖 person.js，防 person→preview→party-group 成环）。

export const PARTY_GROUPS = [
  { id: 'pg-1', branchId: 'br-b1', name: '第一党小组', seq: 1, status: 'active', createdAt: '2026-09-01', createdBy: 'p1', note: '', history: [] },
  { id: 'pg-2', branchId: 'br-b1', name: '第二党小组', seq: 2, status: 'active', createdAt: '2026-09-01', createdBy: 'p1', note: '', history: [] },
  { id: 'pg-3', branchId: 'br-b1', name: '第三党小组', seq: 3, status: 'active', createdAt: '2026-09-01', createdBy: 'p1', note: '', history: [] },
];
