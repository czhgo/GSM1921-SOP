// party-groups.js — 党小组（一等实体）Mock 种子（2026-09-14 批次 25，支书特批）
// 数据模型对齐 domain.js mockDB.partyGroups。
// 口径（本文与 services/member/party-group.js 一起构成「活组清单」来源）：
//   · 本支部（br-b1）现有三组，seq 为组序（决定显示顺序，续建自动取 max+1）。
//   · status：active 活组 / dissolved 已解散（解散组保留历史留痕，不改删除）。
//   · 不写 leaderId——组长由成员档案（role='leader' + partyGroup）派生，避免两处维护。
//   · history：组级操作留痕（create/rename/dissolve），由服务层写口追加。
//   · 本文件只引零依赖叶子 `core/domain/constants.js`（取缺省支部 id），**不引 person.js**：
//     org-base-data-preview.js 派生组枚举时直接 import 本文件（不依赖 person.js，防 person→preview→party-group 成环）。

import { DEFAULT_BRANCH_ID } from '../../core/domain/constants.js?v=20261102b';
// 2026-11-02 批次 527（数据契约 Wave 2）：createdAt 统一 ISO；补 1 条 dissolved 样本——
// 原种子三组全 active、createdAt 为裸日期（'2026-09-01'），与契约「ISO 时间」及
// 「解散组保留历史」两条口径都无样本。dissolved 组不入活组清单（listActiveGroups 过滤 status）。
export const PARTY_GROUPS = [
  { id: 'pg-1', branchId: DEFAULT_BRANCH_ID, name: '第一党小组', seq: 1, status: 'active', createdAt: '2026-09-01T00:00:00.000Z', createdBy: '2400012345', note: '', history: [] },
  { id: 'pg-2', branchId: DEFAULT_BRANCH_ID, name: '第二党小组', seq: 2, status: 'active', createdAt: '2026-09-01T00:00:00.000Z', createdBy: '2400012345', note: '', history: [] },
  { id: 'pg-3', branchId: DEFAULT_BRANCH_ID, name: '第三党小组', seq: 3, status: 'active', createdAt: '2026-09-01T00:00:00.000Z', createdBy: '2400012345', note: '', history: [] },
  {
    // 组序与 pg-3 并列（3）：解散组不参与活组取号，避免把「新建默认名」推到第 5 组。
    id: 'pg-4', branchId: DEFAULT_BRANCH_ID, name: '第四党小组（已解散）', seq: 3, status: 'dissolved',
    createdAt: '2026-09-01T00:00:00.000Z', createdBy: '2400012345',
    dissolvedAt: '2026-09-30T00:00:00.000Z', dissolvedBy: '2300010001',
    note: '演示：解散组保留历史留痕，不入活组清单', history: [{ action: 'dissolve', by: '2300010001', at: '2026-09-30T00:00:00.000Z' }],
  },
];
