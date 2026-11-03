---
title: "领域数据契约（单一源）"
type: design
role: "[工程师]+[AI]"
version: "1.0"
last_updated: 2026-11-02
status: active
related_files: [content/04_web_design/data/DATA_MODEL.md, content/04_web_design/data/DATA_SEED_CONTRACT.md, server/data/domain-contract.mjs]
---

# 领域数据契约（单一源）

> **机读单一源**：[`server/data/domain-contract.mjs`](../../../server/data/domain-contract.mjs)；表清单再取自 [`server/db.js`](../../../server/db.js) 的 `RESOURCE_TABLES / SEMANTIC_TABLES / WORKGROUP_TABLES`。本文件是它的人读版，**不另立第二份口径**：字段 / 必填 / 枚举 / 种子计数有冲突时，以 `domain-contract.mjs` 为准（守卫 `server/test/data-contract.test.mjs`）。
> **范围**：34 张资源表 + 7 张语义表 + 6 张工作组表 = **47 表**。`seedCount`＝`server/seed.js` 首启播种后的行数（0＝无演示种子 / 运行时域）。
> **口径**：`required`＝首启落库行必须出现的字段；`optional`＝功能可产生、也可不产生；`derived`＝运行时现算（种子只写事实）；`aliases`＝读时别名（**不双写**）。

## 一、资源表（34）

| 实体 | 表 | mock 集合 | 必填（required） | 枚举（enums） | 种子数 | 别名 |
|---|---|---|---|---|---:|---|
| users | users | users | id/name/studentId/role/branchId/developStage/partyGroup/residenceStatus | role·developStage·residenceStatus | 51 | members |
| activities | activities | activities | id/title/type/date/branchId/visibility | type·direction·visibility·status·organizingScope | 38 | — |
| tasks | tasks | tasks | id/activityId/title/status/createdAt | status | 8 | — |
| attendances | attendances | attendances | id/personId/activityId/status/branchId | status·developStage | 144 | — |
| inspections | inspections | inspections | id/sourceType/activityId/sourceName/personId/level/recordedAt/branchId | level·status | 42 | — |
| taskforces | taskforces | taskforces | id/name/task/manager/initiator/deadline/createdAt | status | 8 | — |
| notices | notices | notices | id/title/content/priority/publishDate/branchId/kind/reads | priority·kind | 14 | — |
| todos | todos | todos | id/title/role/category/priority/status/branchId/createdAt | status·category·priority·actionType·sourceType | 3 | — |
| assignments | assignments | assignments | id/activityId/workName/assigneeId/status/createdAt | status | 5 | — |
| makeupTasks | makeup_tasks | makeupTasks | id/personId/activityId/attendanceRecordId/deadline/status/createdAt | status | 1 | — |
| experienceDeposits | experience_deposits | experienceDeposits | —（运行时域） | — | 0 | — |
| fileSpaceRecords | file_space_records | fileSpaceRecords | —（运行时域） | — | 0 | — |
| imageRecords | image_records | imageRecords | id/date/title/activityId/fileName/uploadedBy/uploadedAt | — | 2 | — |
| signups | signups | signups | id/sourceType/sourceId/personId/role/status/createdAt | status·sourceType | 7 | — |
| activityReviews | activity_reviews | activityReviews | id/activityId/reviewStatus | reviewStatus | 11 | — |
| taskforceReviews | taskforce_reviews | taskforceReviews | id/taskforceId/reviewStatus | reviewStatus | 2 | — |
| propTasks | prop_tasks | propTasks | id/source/type/summary/status/createdAt/branchId | status | 8 | — |
| periodicArchives | periodic_archive_submissions | periodicArchives | id/branchId/periodUnit/periodKey/periodLabel/periodRange/status | status | 4 | — |
| archiveRecords | archive_records | archiveRecords | id/category/branchId/status | status | 6 | — |
| externalDispatches | external_dispatches | externalDispatches | id/refType/refLabel/senderId/receiverRole/sentAt/branchId | refType | 2 | — |
| actSubRecords | act_sub_records | actSubRecords | —（`__root__` 对象聚合域） | — | 0 | — |
| tfSubRecords | tf_sub_records | tfSubRecords | —（`__root__` 对象聚合域） | — | 0 | — |
| branchDocs | branch_docs | branchDocs | —（运行时域） | — | 0 | — |
| memberChangeRequests | member_change_requests | memberChangeRequests | id/personId/fromStage/toStage/action/status/createdAt | action·status | 2 | member_confirmations / memberConfirmations / pendingMemberConfirmations |
| committeeBroadcasts | committee_broadcasts | committeeBroadcasts | —（2026-10-20 起停写） | — | 0 | — |
| agendaVotes | agenda_votes | agendaVotes | —（运行时域） | — | 0 | — |
| branches | branches | branches | id/name/type/status/createdAt | type·status | 1 | — |
| appointmentRecords | appointment_records | appointmentRecords | id/branchId/secretaryId/from | — | 1 | — |
| reviewRequests | review_requests | reviewRequests | id/branchId/type/title/content/status/submittedBy/createdAt | type·status | 1 | — |
| issues | issues | issues | id/number/branchId/title/body/scope/types/submittedBy/submittedAt/status | status·scope·kind | 6 | — |
| thoughtReports | thought_reports | thoughtReports | id/personId/personName/title/period/content/submittedAt/reviewStatus | reviewStatus | 5 | — |
| partyGroups | party_groups | partyGroups | id/branchId/name/seq/status/createdAt | status | 4 | — |
| memberFlows | member_flows | memberFlows | —（运行时域） | — | 0 | — |
| issueReveals | issue_reveals | — | —（**deprecated**） | — | 0 | — |

## 二、语义表（7）

| 实体 | 表 | mock 集合 | 必填（required） | 枚举（enums） | 种子数 | 别名 |
|---|---|---|---|---|---:|---|
| handoffs | handoffs | handoffs | id/type/from/to/status/createdAt/branchId | status | 2 | — |
| memberConfirmations | member_confirmations | pendingMemberConfirmations | id/personId/kind/action/from/to/status/createdAt/branchId | kind·action·status | 1 | memberChangeRequests |
| milestones | milestones | milestones | id/title/status | status | 1 | — |
| attendanceAppeals | attendance_appeals | — | id/branchId/personId/activityId/status/createdAt | status | 1 | — |
| inspectionAppeals | inspection_appeals | — | id/branchId/personId/activityId/status/createdAt | status | 1 | — |
| issueUnread | issue_unread | — | id/assigneeId/issueId/unread | — | 2 | — |
| authAudit | auth_audit | — | id/targetPersonId/role/authorizedBy/authorizedAt/action/branchId | action | 1 | — |

## 三、工作组表（6）

| 实体 | 表 | mock 集合 | 必填（required） | 枚举（enums） | 种子数 | 别名 |
|---|---|---|---|---|---:|---|
| workgroups | workgroups | workgroups | id/branchId/kind/sourceType/sourceId/status/createdAt | kind·sourceType·status | 46 | — |
| workgroupMembers | workgroup_members | workgroupMembers | id/branchId/workgroupId/personId/role/status/createdAt | role·status | 103 | — |
| workgroupGrants | workgroup_grants | workgroupGrants | id/branchId/workgroupId/personId/templateKey/status/grantedBy/grantedAt | templateKey·status | 2 | — |
| workgroupTasks | workgroup_tasks | workgroupTasks | id/branchId/workgroupId/title/status/createdAt | status | 2 | — |
| workgroupOutputs | workgroup_outputs | workgroupOutputs | id/branchId/workgroupId/title/submittedBy/submittedAt/status | status | 1 | — |
| attendanceRosters | attendance_rosters | attendanceRosters | —（运行时域） | — | 0 | — |

## 四、本批（批次 527 · Wave 2）修准的 10 处漂移

| # | 表 / 实体 | 处置 | 闭环形态 |
|---|---|---|---|
| 1 | memberChangeRequests / member_change_requests / member_confirmations | 统一 `fromStage / toStage / action`；`member_confirmations` 读时别名（`from/to → fromStage/toStage`） | 有别名（读口投影）+ 有种子 |
| 2 | notices | `audience` 统一数组；种子统一补 `reads: []`；`DATA_MODEL §2.24` 改准 | 有种子 + 有文档 |
| 3 | activities | `executor / supervisor / createdBy` 标 optional（功能不产生） | 仅契约 + 文档 |
| 4 | attendances | `recordedBy` 标 optional；`studentId / developStage / partyGroup` 标 derived | 仅契约 + 文档 |
| 5 | todos | 契约补 `personId / ownerType / ownerId` optional；种子补 `in_progress / expired` 各 1 | 有种子 |
| 6 | partyGroups | `createdAt` 统一 ISO；补 1 条 `dissolved` | 有种子 |
| 7 | imageRecords | 补 2 条绑定既有活动（act-16 / act-21） | 有种子 |
| 8 | memberChangeRequests | 补 roster / transfer 各 1 条 | 有种子 |
| 9 | workgroup_tasks / workgroup_outputs | tf-002 工作组补 2 任务 1 产出 | 有种子 |
| 10 | issue_reveals | 契约标 `deprecated: true`，注释「停写，保留只读兼容」；**不删表 / 不删路由** | 仅契约 + 文档 |

## 五、维护纪律

1. **功能改而契约未改 ⇒ 判红**：`data-contract.test.mjs` 逐表核 `required` / `enums` / `seedCount`，`mock-api-parity-structure.test.mjs::S5` 追加落库行同源核对。
2. **mock 不得手写第二份形状**：`docs/src/data/mock/**` 与 `server/seed.js` 同源；新表先进 `seed-manifest.js`，再进本契约。
3. **必填不是越多越好**：功能实际不产生的字段（如 activities.executor）标 optional；运行时现算字段标 derived，种子只写事实。
4. **空表必须显式登记**：无种子的运行时表在 `seedCount` 写 0 并在本文件「必填」列写 `—（运行时域）`，不得静默省略。
