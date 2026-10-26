---
title: "数据种子契约（DATA_SEED_CONTRACT）"
type: design
role: "[工程师]+[AI]"
last_updated: 2026-10-26
status: active
related_files: [DATA_MODEL.md, docs/src/data/seed-manifest.js, server/test/seed-contract-guard.test.mjs]
---

# 数据种子契约（DATA_SEED_CONTRACT）

> 生效：schema **v12**（2026-10-26 · spec `restore-capsule-and-harden-data-truth` Task 4）。
> 字段权威定义见 [DATA_MODEL.md](./DATA_MODEL.md)；可机检断言见 `server/test/seed-contract-guard.test.mjs`。
> 本文件只回答一件事：**哪些行必须由种子给出、哪些字段必须由写入方给出、哪些只能派生/展示**。
> 任何新增种子集合或字段，必须先在本文登记，再改代码；守卫会逐条核对。

---

## 一、四类口径（互斥）

| 类别 | 定义 | 判据 |
|---|---|---|
| **必须种子**（required-seed） | 首启即须存在的业务基线行。缺失会让页面/入口结构性不可达。 | 集合非空、id 命中种子形态、必填字段齐全。 |
| **可派生**（derivable） | 不由种子文件写死，由事实按唯一派生器现算；派生器是纯函数、幂等。 | 派生字段不出现在种子文件；由 `docs/src/data/mock/derive.js::applyDerivedFacts` 或服务端同一函数补回。 |
| **可交叉验证**（cross-checkable） | 可由父行/人员档案/工作组关系复算，写入后必须与源一致。 | 引用能落到真实行；父子支部一致；成员关系成立。 |
| **展示专用**（display-only） | 名称、标题快照、文案等只用于显示，**不得作为关联/权限/唯一键**。 | 改名或同名不得断链、不得串数据。 |

**禁止项（全表通用）**

1. 不得省略 `branchId`（组织骨架表 `users/branches` 按各自语义；`issue_unread` 由 `issueId` 派生）；
2. 不得写入孤立引用（父行不存在、人员不存在、支部不存在）；
3. 不得把展示字段当键（`sourceName`、`activityName`、`senderName`、`hostGroup` 名称等）；
4. 不得在种子中写派生字段（`status`、`progress`、`overdue`、`expireDate`、`studentId/developStage/partyGroup` 快照）；
5. 不得把字符串写进 `taskforces.members[].contributions`（只允许 `{ id?, desc, by?, at? }` 对象）；
6. 不得再写 `issue_reveals`（v12 已删表）；`committee_broadcasts` 只读保留、不得新增写入；
7. 业务日期目标窗口 **2026-08-01 – 2026-11-30**；组织骨架、任期、审计不受窗口限制。Task 5 刷新前，7 月历史种子作为迁移期留档，不据此判红。

---

## 二、逐表契约

### 2.1 组织骨架

| 表 | 类别 | 必填字段 | 引用完整性 | 唯一性 | 日期窗口 | 禁止项 |
|---|---|---|---|---|---|---|
| `users` | 必须种子 | `id, name, role, branchId`（党委账号 `branchId=null`） | `branchId → branches.id`；`studentId` 与 `id` 同值 | `id` 主键；`studentId` 唯一 | 不限 | 不得写演示密码/明文凭证；不得把 `party-staff` 塞进支部 |
| `branches` | 必须种子 | `id, name, type, status, createdAt` | `secretaryId → users.id`（可空） | `id` 主键 | 不限 | 不得删 `br-b1` 缺省支部 |
| `party_groups` | 必须种子 | `id, branchId, name, seq, status, createdAt` | `branchId → branches.id` | **活组** `(branchId, name)` 唯一（v12 部分唯一索引；解散组可保留同名历史） | 不限 | 不得绕过活组重名校验 |
| `appointment_records` | 必须种子 | `id, branchId, secretaryId, from` | `branchId → branches.id`；`secretaryId → users.id` | `id` 主键 | 不限 | `to` 为运行时；不得同支部两条未封口现任 |

### 2.2 活动 / 考勤 / 考察

| 表 | 类别 | 必填字段 | 引用完整性 | 唯一性 | 日期窗口 | 禁止项 |
|---|---|---|---|---|---|---|
| `activities` | 必须种子 + 可交叉验证 | `id, branchId, title, date, type, organizer` | `branchId → branches.id`；`organizer → users.id`；`hostGroupId → party_groups.id`（有承办组时） | `id` 主键；`workgroupId` 与稳定派生规则一致 | 业务日期在窗口内（组织骨架除外） | 不得写 `status`（派生）；不得支部级会议挂承办组；不得跨支部引用 |
| `attendances` | 必须种子 + 可交叉验证 | `id, branchId, activityId, personId, status, recordedAt` | `activityId → activities.id`；`personId → users.id`；`branchId` 与活动一致 | **`(activityId, personId)` 唯一**（v12 唯一索引） | 活动日当天/之后 | 不得重复 (活动,人)；不得写人员快照三字段；不得缺 `branchId` |
| `inspections` | 必须种子 + 可交叉验证 | `id, branchId, sourceType, personId, level, role, recordedBy, recordedAt`；`activityId` 或 `workgroupId` 二选一 | `personId` **必须是父工作组在册成员**；`activityId/workgroupId →` 真实父行；`branchId` 与父行一致 | `id` 主键 | 活动/专班存续期内 | 不得缺父键；不得 `legacy:true` 新写；不得自确认；不得让非成员成为考察对象 |
| `activity_reviews` | 必须种子（覆盖态） | `id, activityId, organizerId` | `activityId → activities.id`；`organizerId → users.id` | `id` 主键；同一活动同一组织者唯一 | 活动结束后 | 不得写 `progress/overdue`（派生） |
| `taskforce_reviews` | 必须种子（覆盖态） | `id, sourceType, taskforceId/workgroupId, organizerId` | 父行存在 | `id` 主键 | 专班存续期内 | 同上 |
| `signups` | 必须种子（覆盖态） | `id, sourceType, sourceId, personId, role, status, createdAt` | `sourceId → activities.id/taskforces.id`；`personId → users.id` | `(sourceType, sourceId, personId)` 业务唯一（JS 复核） | 报名窗口内 | 不得物理删除；不得造「已完成专班仍可报名」的待审项 |
| `attendance_rosters` | 可派生 / 运行时 | `id, branchId, activityId, personIds[], frozen, version` | `activityId → activities.id` | **`activityId` 唯一**（v12 唯一索引） | 冻结时点 | 冻结后不得原位覆盖；不得把当前名册倒推成历史应到 |

### 2.3 专班 / 工作组

| 表 | 类别 | 必填字段 | 引用完整性 | 唯一性 | 日期窗口 | 禁止项 |
|---|---|---|---|---|---|---|
| `taskforces` | 必须种子 | `id, branchId, name, task, manager, initiator, createdAt` | `branchId → branches.id`；`manager/initiator → users.id` | `id` 主键 | 专班存续期内（`tf-002` 跨期） | `members[].contributions` 只能是对象数组；状态必须落在 canonical 集合 |
| `workgroups` | 可派生 | `id, branchId, kind, sourceType, sourceId, name, status` | `sourceId → activities.id/taskforces.id`；`branchId` 与源一致 | `id` 主键；`(kind, sourceId)` 业务唯一 | 随源 | 不得独立于活动/专班造组；名称仅展示 |
| `workgroup_members` | 可派生 | `id, branchId, workgroupId, personId, role, status, createdAt` | `workgroupId → workgroups.id`；`personId → users.id`；同支部 | **`(workgroupId, personId)` 唯一**（v12 唯一索引） | 随组 | 不得靠成员身份自动扩权；不得重复入组 |
| `workgroup_grants` | 可派生 | `id, branchId, workgroupId, personId, templateKey, reason, grantedBy, grantedAt` | 同上 | `id` 主键 | 随组 | 成员身份≠系统权限；不得无留痕授予 |

### 2.4 通知 / 待办 / 归档 / 宣传

| 表 | 类别 | 必填字段 | 引用完整性 | 唯一性 | 日期窗口 | 禁止项 |
|---|---|---|---|---|---|---|
| `notices` | 必须种子 | `id, branchId, publishDate, targetType, targetId, source, createdBy, kind` | `targetId →` 对应资源；`branchId` 与受众支部一致 | `id` 主键 | 发布日 + 有效期在窗口内 | `expireDate` 派生（活动通知）；`read` 仅兼容读取，逐人状态走 `reads[]/archivedBy[]` |
| `todos` | 必须种子 + 可派生 | `id, title, role/personId, branchId, sourceType, sourceId, actionKey` | 父行/所属人可解析出支部 | `id` 主键；`(sourceType, sourceId, actionKey, personId/role)` 幂等 | 随来源 | `branch_id` 是生成列（只读），写口只写 `data.branchId`；解析不出支部必须 400 |
| `archive_records` | 必须种子（含 `materialOnly`） | `id, branchId, category`；活动材料 `activityId`，非活动材料 `materialOnly:true + title` | 活动材料 `activityId → activities.id`；materialOnly 不挂活动 | `id` 主键；同一活动同一分类一条 | `archiveDate` 为事实/上传动作 | `branchId` 不得缺（materialOnly 缺省 br-b1）；不得用活动标题覆盖 materialOnly.title |
| `prop_tasks` | 必须种子 | `id, branchId, source, type, summary, status, createdAt` | `sourceRole/sourceOrg` 指向角色/组织，不用人名 | `id` 主键 | 在窗口内 | `source` 仅展示，不作键 |
| `periodic_archive_submissions` | 必须种子 | `id, branchId, periodUnit, periodKey, periodRange` | `branchId → branches.id` | `id` 主键；`(branchId, periodUnit, periodKey)` 唯一 | 期次在窗口内 | 不得覆盖已提交的规则快照 |
| `issues` | 必须种子 | `id, number, branchId, title, body, scope, types, submittedBy, submittedAt` | `branchId → branches.id` | `id` 主键；`number` 每支部递增 | 窗口内 | 常规读口不得带 `_realPersonId`；不得写 `tokenHash` 到种子以外的公开面 |
| `thought_reports` | 必须种子（覆盖态） | `id, personId, period, title` | `personId → users.id` | `id` 主键；`(personId, period)` 唯一 | 期次在窗口内 | 正文/审阅状态归运行时 |

### 2.5 语义 7 表 + 辅助表

| 表 | 类别 | 必填字段 | 引用完整性 | 唯一性 | 日期窗口 | 禁止项 |
|---|---|---|---|---|---|---|
| `handoffs` | 必须种子 | `id, branchId, type, from, to, refType, refId, status, createdAt` | `refId → activities.id`（`refType=activity`） | `id` 主键 | 交接动作窗口内 | `from/to` 由 `type` 派生；不得按 `refLabel` 关联 |
| `member_confirmations` | 必须种子 | `id, branchId, kind, personId, action, from, to, by, status, createdAt` | `personId/by → users.id`；`branchId` 与人员一致 | `id` 主键 | 窗口内 | 终态可由演示过程产生，但不得预置伪造终态 |
| `milestones` | 必须种子（只读） | `id, title, description, dueDate, issueIds[], status` | `issueIds → issues.id` | `id` 主键 | 不限 | 无写口，不得经资源 CRUD 改写 |
| `attendance_appeals` | 必须种子 | `id, branchId, personId, activityId, note, status, createdAt` | `personId → users.id`；`activityId → activities.id`；且该人确有考勤行 | `id` 主键 | 对应活动之后 | 不得对不存在考勤申诉 |
| `inspection_appeals` | 必须种子 | `id, branchId, personId, activityId, note, status, createdAt` | `personId → users.id`；`activityId → activities.id`；且该人确有考察行 | `id` 主键 | 对应活动之后 | 不得对不存在考察申诉 |
| `issue_unread` | 必须种子 / 可派生 | `id, assigneeId, issueId, unread, at`（`id = assigneeId:issueId`） | `assigneeId → issues.assignee`；`issueId → issues.id` | `id` 主键 | 不限 | 不单独存 `branchId`（由 issue 派生）；不得给未指派条目造未读 |
| `auth_audit` | 必须种子 | `id, branchId, targetPersonId, role, scopeRef, authorizedBy, authorizedAt, action` | `targetPersonId/authorizedBy → users.id`；`scopeRef` = `branchId` | `id` 主键 | 不限 | 只增不改；不得删除留痕 |
| `external_dispatches` | 必须种子 | `id, branchId, refType, refLabel, senderId, senderName, receiverRole, sentAt` | `senderId → users.id`；`refLabel` 仅展示 | `id` 主键 | 窗口内 | 不得按 `refLabel` 关联；`confirmedAt` 归运行时 |
| `member_change_requests` | 可派生（运行时） | `id, branchId, personId, fromStage, toStage, meetingResult, activityId, agendaItemId` | 活动/议程/人员真实存在 | `id` 主键；同一议程项同一人唯一 | 会议之后 | 不得无会议结果直接建申请 |
| `committee_broadcasts` | 恒只读（v12） | `id, branchId, requestId, recipientId` | `requestId → member_change_requests.id`；`recipientId → users.id` | `id` 主键 | 不限 | **不得新增/修改/删除写入**；送达由系统通知承担 |
| `agenda_votes` | 必须种子 / 运行时 | `id, branchId, activityId, agendaItemId, position, personId`；无记名只存 `tally` | 活动/议程项真实存在；`personId` 在应到名单内 | 记名：`(activityId, agendaItemId, personId)` 唯一；tally：`avt-...` 单行 | 表决窗口内 | 无记名不得逐人落选项；锁定后不得改票 |

### 2.6 死表 / 证据表

| 表 | 类别 | 处置 | 禁止项 |
|---|---|---|---|
| `issue_reveals` | **已删除（v12）** | `DROP TABLE IF EXISTS`；`initDb` 不再重建 | 不得再写、不得再读 |
| `agenda_items` / `taskforce_contributions` | 影子表（无读口） | 只由 `rebuildShadowTables` 双写 | 不得作为权威读源；不得出现 `$."0"` 字符键 |
| `snapshot_conflicts` / `shadow_history` | 证据表（无读口） | 只供切表闸门只读 | 不得参与业务读路径 |
| `seed_meta` / `collection_versions` | 内部表（无业务读口） | 只由服务端工具/协议读写 | 不得进快照 payload |

---

## 三、v12 强约束（守卫逐条核）

| 约束 | 实现 | 可机检断言 |
|---|---|---|
| 考勤唯一 | `ux_attendances_activity_person` 表达式唯一索引 | 重复 (activityId, personId) 插入被 SQLite 拒绝 |
| 党小组活组唯一 | `ux_party_groups_branch_name` 部分唯一索引（`status='active'`） | 同支部同名活组插入被拒 |
| 应到名单唯一 | `ux_attendance_rosters_activity` | 同一活动第二条名单被拒 |
| 工作组成员唯一 | `ux_workgroup_members_group_person` | 同一组同一人第二条被拒 |
| 待办支部下推 | `todos.branch_id GENERATED ALWAYS AS (json_extract(data,'$.branchId')) VIRTUAL` | `INSERT INTO todos(id,data)` 后 `branch_id` 与 JSON 一致；手写列报错 |
| 考察对象 ∈ 工作组 | POST/PATCH/快照写口统一 `_inspectionPersonMembershipDeny` | 非成员写入返回 400 / 快照 403 |
| 贡献形状 | 种子对象数组 + `normalizeContribution` 双侧同一归一 | 影子表无字符键；篡改影子行 mismatch>0 |

回滚：`server/db.js::rollbackV12` 删四组唯一索引、`user_version=11`；`todos.branch_id` 保持生成列（v11 已加生成列感知，可继续运行）；不恢复 `issue_reveals`；需要完整回到 v11 表结构时以迁移前备份恢复。
