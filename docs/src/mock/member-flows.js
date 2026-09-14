// member-flows.js — 成员流动台账（流入/流出）Mock 种子（2026-09-14 批次 25，支书裁定）
// 数据模型对齐 domain.js mockDB.memberFlows。
// 口径（本文与 services/member-flow.js 一起构成「成员流动台账」来源）：
//   · 复式记账：每次成员流入 / 流出各记一笔台账；表头对账行「期初在册 + 流入合计 − 流出合计 = 当前在册」
//     （自然语言表述，回答「谁在我们名册、谁不在」）。
//   · 记录结构：{ id, branchId, direction:'in'|'out', personId, name, studentId, enrollYear,
//     partyGroup, date, note, by, at, revokedAt, revokedBy }。
//     —— direction='in' = 流入（成员建档 + 自动建号）；direction='out' = 流出（成员软标记 + 账号停用）。
//   · 登记即生效；登错由撤销（revokedAt/revokedBy 留痕 + 回滚成员在册状态）纠正，不做物理删除。
//   · 种子为**空数组**：台账是运行时业务过程数据（无演示历史），首启为空即正确初始态；
//     server/seed.js 对空种子不灌库（见该文件注释）。
//   · 本文件为**无任何 import 的叶子数据模块**（与 mock/party-groups.js 同构）。

export const MEMBER_FLOWS = [];
