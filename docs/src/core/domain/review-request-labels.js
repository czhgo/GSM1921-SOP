// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  review-request-labels.js — 支部上报的**展示值单一源**（**零依赖叶子**）
//
//  R-23②（2026-10-05 批次 391）：`review-request-submitted` / `review-request-decided` 的通知正文里
//    「支部名 / 事项摘要」两段原由**前端**算好塞进 payload，而服务端「统一包装」会**整包采信**客户端
//    ⇒ 任一获授权的 actor 直调 `POST /api/v1/system-notices` 即可让正文显示**任意**支部名 / 事项摘要。
//    本件把这两段**抽成前后端共用**：前端 `services/governance/review-request.js` 与服务端
//    `system-notice-kinds.js::build` **同引一处** ⇒ 服务端可**按表复算**、且**不落第二实现**（`H31`）。
//
//  为什么单独一件、而非并入 `system-notice-templates.js`：本件要能被**服务端**直接 import（前端纯函数），
//    而模板件牵 `core/base/period.js`；本件**零依赖**、最小面、双端可载。
//  边界（如实）：**人名**（`submitterName`）不在本件——服务端**无人员名册**，沿用 payload
//    （口径同 `organizer-transferred` 的既有注记）。
// ════════════════════════════════════════════════════════════════

/** 上报事项类型标签（`review_requests.type` → 中文） */
export const REVIEW_REQUEST_TYPE_LABEL = { 'develop-node': '发展节点', 'activity-report': '活动报备' };

/** 支部显示名（`branch` 传该支部行或 `null`；口径＝`config.headerTitle` 优先，回落到 `name` / id / 「本支部」） */
export function branchDisplayName(branchId, branch) {
  return (branch && ((branch.config && branch.config.headerTitle) || branch.name)) || branchId || '本支部';
}

/** 上报事项摘要（含类型 / 标题 / 编号，供通知回溯定位） */
export function reviewRequestSubject(row = {}) {
  return `${REVIEW_REQUEST_TYPE_LABEL[row.type] || '上报'}「${row.title || '未命名'}」（编号 ${row.id}）`;
}
