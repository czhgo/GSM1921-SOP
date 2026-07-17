---
title: "数据架构设计"
type: design
role: "[工程师]+[AI]"
version: "3.0"
last_updated: "2026-07-17"
status: active
merged_from:
  - content/design/DATA.md
  - content/design/PARTICIPANT_DATAFLOW.md
  - content/design/LOGIN_SYSTEM_DESIGN.md
  - content/design/BRAND_ACTIVITY.md
related_files:
  - content/governance/ROLE_CLASSIFICATION.md
  - content/strategy/COMMISSIONER_FRAMEWORK.md
  - content/design/MODULE_UI_DESIGN.md
  - content/design/DESIGN_SYSTEM.md
summary: "系统数据架构设计的单一权威源——涵盖数据模型设计、参与者数据流、登录系统设计、品牌属性标签、写入数据验证。合并自 DATA.md + PARTICIPANT_DATAFLOW.md + LOGIN_SYSTEM_DESIGN.md + BRAND_ACTIVITY.md。"
---

# 数据架构设计

> **定位**：本文档是系统数据架构设计的单一权威源，涵盖静态数据模型、动态数据流、登录系统设计、品牌属性标签设计。所有数据结构变更以本文档为准。
> **受众**：[工程师]+[AI] —— 供开发决策参考，确保数据结构变更时全栈一致。
> **权限矩阵**：本文档含权限简表，完整定义见 [ROLE_CLASSIFICATION.md](../governance/ROLE_CLASSIFICATION.md) §九 角色权限矩阵。

---

## 一、数据架构总览

### 1.1 数据类型设计原则

> 数据类型设计优先于权限设计：先定义"有什么数据、数据如何分类、字段如何规范"，再定义"谁能读写这些数据"。权限是数据之上的切面，不是数据本身。

- **数据先行**：数据类型与字段规范是系统落地的第一块基石，工作流、视图、权限均依赖数据结构定义
- **单一权威**：每种数据类型在本文档中有唯一定义，代码层以此为准（见 CLAUDE.md H2.2 母本子本关系）
- **分类清晰**：业务数据 / 静态代码 / 内存状态 / UI 会话状态分层管理，生命周期与持久化策略各不相同
- **可验证**：每条写入操作须在查看端可验证（见 §2.17 写入数据验证设计）

### 1.2 数据分类总览

| 数据类别 | 存储位置 | 生命周期 | 说明 |
|---|---|---|---|
| 活动记录 (Activity) | mockDB.activities + localStorage `workflowos_branch_db_v1` | 创建->活跃->归档(软删除) | 核心业务实体，所有流程围绕活动展开 |
| 考勤记录 (AttendanceRecord) | mockDB.attendances + localStorage | 随活动创建->随活动归档 | 纪检委员写入，全员可读 |
| 分工记录 (AssignmentRecord) | mockDB.assignments + localStorage | 随活动创建->待办->进行中->已完成 | 组织者创建分工，深度参与者执行 |
| 交接记录 (HandoverRecord) | mockDB.handovers + localStorage | 随交接创建->持久化 | 组织者发起交接，纪检委员确认 |
| 补课任务 (MakeupTask) | mockDB.makeupTasks + localStorage | 缺勤触发->待补课->已完成 | 纪检委员创建，缺勤者执行补课 |
| 通知 (Notice) | mockDB.notices + localStorage | 创建->持久化 | 系统通知，按类型分级 |
| 经验沉淀 (ExperienceDeposit) | mockDB.experienceDeposits + localStorage | 创建->持久化 | 深度参与者经验总结 |
| 制度文件引用 (ComplianceReference) | mockDB.complianceReferences + localStorage | 引用->持久化 | 组织委员引用的制度文件 |
| 任务 (Task) | mockDB.tasks + localStorage | 随活动创建->待办->进行中->已完成 | 活动子任务，由 SOP 模板生成 |
| SOP 场景模板 (Scenario) | sopData.js (静态代码) | 静态，代码级维护 | 12 个内置场景，驱动任务生成和工作流 |
| 工作流定义 (Definition) | definitions.js (静态代码) | 静态，代码级维护 | 5 套状态机模板，驱动活动流转 |
| 应用状态 (appState) | core/state.js (内存) | 页面生命周期内 | UI 视图状态，不持久化 |
| 用户/角色预设 (users) | mockDB.users (内存) | 静态预设 | 3 个内置用户（书记/组织委员/党小组组长） |
| 赋权记录 (assignedRoles) | localStorage `sop_org_os_assigned_roles` | 跨会话持久化 | 书记赋权给组织者/深度参与者的记录 |
| 角色常量 (ROLE_LABELS/COLORS) | core/constants.js (静态代码) | 静态，代码级维护 | 9 种角色的中文标签与视觉配色 |
| 意见反馈 (IssueRecord) | `docs/data/issues.json` + localStorage `gsm1921-issue-drafts` | open->closed->reopened | GitHub Issue 风格开源讨论，双轨数据层，书记维护 issues.json 权威源 |

---

## 二、数据模型设计

### 2.1 活动数据 (ActivityRecord)

> 类型定义位于 [domain.js](../../docs/src/core/domain.js#L12-L32)

| 字段名 | 类型 | 必填 | 默认值 | 说明 |
|---|---|---|---|---|
| id | string | 是 | `generateId('act')` | 唯一标识符，前缀 `act_` |
| title | string | 是 | -- | 活动标题 |
| type | string | 是 | -- | 活动类型，如 "组织生活会"、"主题党日" |
| status | `'draft'\|'published'\|'ongoing'\|'completed'` | 是 | `'draft'` | 活动宏观状态 |
| visibility | `'branch'\|'group'` | 是 | `'group'` | 可见范围：全支部 or 党小组 |
| date | string (YYYY-MM-DD) | 是 | -- | 活动日期 ISO 字符串 |
| location | string | 是 | -- | 活动地点 |
| executor | string | 是 | -- | 执行角色标识 |
| supervisor | string\|null | 是 | `null` | 督办角色（可为 null） |
| createdBy | string | 是 | `'u_exec'` | 创建者用户 ID |
| createdAt | string (ISO) | 是 | `new Date().toISOString()` | 创建时间 |
| priority | `'low'\|'normal'\|'urgent'` | 否 | -- | 工作流引擎优先级 |
| dueDate | string (ISO) | 否 | -- | 截止日期（自动化提醒锚点） |
| archived | boolean | 否 | `false` | 软删除标记（true = 已归档） |
| domain | `'activity'\|'organization'` | 否 | -- | 领域分类 |
| scenarioId | string | 否 | -- | 关联 SOP 场景 ID |
| description | string | 否 | -- | 活动描述 |
| targetDate | string (ISO) | 否 | -- | 目标日期 T-0（兼容旧字段） |
| attendanceQROwner | `'leader'\|'disc-commissioner'` | 否 | -- | 考勤二维码发布方 |
| deliverableIds | string[] | 否 | -- | ~~关联交付物 ID 列表~~（已废弃，交付物由 FileSpaceRecord 覆盖） |
| isBrand | boolean | 否 | `false` | 品牌属性标签（由书记认定，不影响工作流选择） |

**活动状态枚举：**

| 状态值 | 含义 | 说明 |
|---|---|---|
| `draft` | 草稿 | 可编辑，尚未发布 |
| `published` | 已发布 | 已通知相关人员 |
| `ongoing` | 进行中 | 活动正在执行 |
| `completed` | 已完成 | 活动结束，待复核/归档 |

#### 2.1.1 子记录关联结构 (SubRecord)

> 子记录是主记录的纵向扩展，支持考勤、材料、宣传三种类型的结构化附属数据。

**主记录与子记录的树形关联：**

```
ActivityRecord (主记录)
├── id, name, theme, desc, link, date, type
├── leaders[], leaderPhotos[]
├── filledBy, createdAt
└── subRecords[]
    ├── { type: "attendance", items: [...] }    // 考勤子记录
    ├── { type: "materials", items: [...] }      // 材料子记录
    └── { type: "publicity", items: [...] }      // 宣传子记录
```

**字段映射说明**：上表中 `name` 对应实现层 ActivityRecord 的 `title`，`filledBy` 对应 `createdBy`/`executor`。此树形结构为概念模型，实现层字段以 2.1 节字段表为准。

**子记录类型定义：**

| type 值 | 中文 | items 内容 | 对应实现层数据 | 写入角色 |
|---|---|---|---|---|
| `attendance` | 考勤子记录 | 出勤记录列表 | AttendanceRecord（见 §2.5） | 纪检委员 |
| `materials` | 材料子记录 | 交付物列表 | FileSpaceRecord（category≠publicity） | 深度参与者（组织者打包提交）；实现层暂为党小组组长/宣传委员 |
| `publicity` | 宣传子记录 | 宣传素材列表 | FileSpaceRecord（category=publicity） | 宣传委员 |

**子记录关键规则：**

| 规则 | 说明 | 实现要求 |
|---|---|---|
| **自增表格** | 每种子记录类型支持动态添加行 | UI 层提供行级增删操作，数据层支持 items 数组动态 push/splice |
| **统一绑定** | 所有子记录通过 `parentId` 绑定到主记录 `id` | 子记录必须包含 `parentId` 字段（对应实现层 `activityId`），查询时按此字段过滤 |
| **权限继承** | 子记录的操作权限继承自主记录的当前管理者角色 | 子记录不单独设权限，由主记录的 `can()` 结果决定读写权限（见 §2.2 角色权限数据） |

**子记录与现有数据的关系：**

- `attendance` 子记录 → 对应 `mockDB.attendances` 中 `activityId` 匹配的 AttendanceRecord 集合
- `materials` 子记录 → 对应 `mockDB.fileSpaceRecords` 中 `activityId` 匹配且 category 非 `publicity` 的 FileSpaceRecord 集合
- `publicity` 子记录 → 对应 `mockDB.fileSpaceRecords` 中 `activityId` 匹配且 category=`publicity` 的 FileSpaceRecord 集合
- 主记录的 `deliverableIds` 字段已废弃，子记录通过 `activityId` 直接查询

### 2.2 角色与权限数据

> 角色类型定义位于 [core/state.js](../../docs/src/core/state.js#L18-L28)，标签/颜色位于 [core/constants.js](../../docs/src/core/constants.js)
> 权限的详细解释见 [ROLE_CLASSIFICATION.md §九 角色权限矩阵](../governance/ROLE_CLASSIFICATION.md)。本节为该权威源在数据层 ACL 中的切面视图，冲突时以权威源为准。

#### 2.2.1 角色常量定义

| 角色键 | 中文标签 | 视图类型 | 所属分类 |
|---|---|---|---|
| `participant` | 默认参与者 | participant | 参与层 |
| `leader` | 党小组组长 | manager | 管理视图 |
| `org-commissioner` | 组织委员 | manager | 支委 |
| `prop-commissioner` | 宣传委员 | manager | 支委 |
| `disc-commissioner` | 纪检委员 | manager | 支委 |
| `organizer` | 组织者 | manager | 管理视图 |
| `deep` | 深度参与者 | manager | 管理视图 |
| `secretary` | 党支书 | manager | 管理视图 |
| `global` | 全局视图 | global | 参考指南专用 |
| `all` | 全体相关 | participant | 参考指南显示用 |

**管理角色集合** (`MANAGEMENT_ROLES`): `leader`, `org-commissioner`, `prop-commissioner`, `disc-commissioner`, `organizer`, `deep`, `secretary`

**支委角色集合** (`COMMISSIONER_ROLES`): `commissioner`, `org-commissioner`, `prop-commissioner`, `disc-commissioner`

#### 2.2.2 ACL 基础规则

> 基础 ACL 实现位于 [domain.js `can()`](../../docs/src/core/domain.js#L78-L91)

| 角色 | 允许的操作 |
|---|---|
| `secretary` | read, write, delete, admin |
| `commissioner` (泛支委) | read, write（职能写入，不含创建活动） |
| `leader` | read, write（含创建活动） |
| `member` | read |

**特殊资源 `evaluation`（考察档案）**: 仅 `secretary` 和 `org-commissioner` 可读写，其他角色绝对隔离。

**宣传委员活动视图同步规则**：宣传委员不可创建活动（仅党支书和党小组组长可创建），但任何活动创建后应自动出现在宣传委员的视图中，确保宣传委员版面及时同步。

#### 2.2.3 模块权限

> 模块可见性由 HTML 中的 `data-modules` 属性控制，运行时由 JS 根据 `selectedRole` 动态显示/隐藏

| 模块 | 可见角色 | data-modules 映射 | 说明 |
|---|---|---|---|
| **dashboard** (主页) | 所有角色 | `"dashboard"` (始终可见) | 通知 + 人员招募 + 活动日历摘要 |
| **calendar** (党建工作台) | leader, commissioner-group, organizer, deep, secretary | `data-modules="calendar"` | 含创建面板 + 日历 + 任务详情 |
| calendar 子: 书记工作台 | secretary | 仅 `viewType==='manager' && selectedRole==='secretary'` 时可见 | 含党课/大会按钮 + 全局视角切换 |
| calendar 子: 赋权面板 | secretary | `selectedRole==='secretary'` 时显示按钮 | "招募宣传专班" 按钮 |
| calendar 子: 归档库 | leader, commissioner-group, organizer, deep, secretary | `data-modules="calendar"` + 管理视图 | 历史活动归档记录 |
| **party** (党务管理) | leader, commissioner-group, secretary | `data-modules="calendar,party"` | 含三个支委面板 + 默认概览面板 |
| party 子: 纪检委员面板 | disc-commissioner | `data-commissioner="inspector"` | 补课制度、公邮管理 |
| party 子: 组织委员面板 | org-commissioner | `data-commissioner="organizer"` | 专班管理、追踪看板、材料催缴、制度文件（注：思想汇报不在系统数据范围，D-241 — 手写提交，此面板不含思想汇报数据管理） |
| party 子: 宣传委员面板 | prop-commissioner | `data-commissioner="publicity"` | 活动日历、档案归档、材料标准、周报报送 |
| **search** (资料查询) | 所有角色 | `"search"` (始终可见) | 参考资料、网站群、工作流参考指南 |

**支委身份选择流程：**

1. 用户点击 sidebar 中的 "支委" 角色卡片
2. 弹出支委身份选择模态框 (`#commissioner-modal`)
3. 用户选择具体支委身份：组织委员 / 宣传委员 / 纪检委员
4. `setState({ selectedRole: 'org-commissioner'|'prop-commissioner'|'disc-commissioner' })`
5. 党务管理面板根据 `selectedRole` 显示对应支委面板

#### 2.2.4 数据共享规则

**纪检 <-> 组织委员 共享考勤数据：**

- **同源存储**: 考勤数据统一存储在 `mockDB.attendances`，纪检委员是唯一写入方
- **读取权限**: 组织委员可读取全部考勤记录用于 "人的管理"
- **考察档案隔离**: 组织委员的 "考察档案" (`resource='evaluation'`) 对纪检委员不可见（`can('disc-commissioner', 'read', 'evaluation') === false`）

**组织委员 <-> 宣传委员 专班协调流：**

- **工作分离**: 组织委员管 "党建工作（专班统筹）"，宣传委员管 "事件管理（党建）+ 制度建设（党务）"
- **专班招募协调**: 宣传委员招募专班成员须通过组织委员协调
- **档案流通**: 宣传委员归档后，组织委员可从考勤/活动参与角度查阅

**书记独占能力：**

- **党课布置** (`#btn-party-lecture`): 仅 secretary 可见，对应 scenarioId=`party-lecture`
- **主持大会** (`#btn-host-congress`): 仅 secretary 可见
- **全局视角切换** (`#secretary-view-proxy`): 书记可以组织委员/宣传委员/纪检委员/党小组1组长/党小组2组长/党小组3组长/深度参与者/普通参与者视角查看系统
- **赋权管理** (`#assign-modal`): 书记可赋予同志组织者或深度参与者权限

### 2.3 专班数据 (TaskForceRecord)

> 专班管理位于组织委员面板，通过赋权记录间接体现。赋权记录持久化于 localStorage。

| 字段名 | 类型 | 必填 | 默认值 | 说明 |
|---|---|---|---|---|
| id | string | 是 | `generateId('tf')` | 唯一标识符，前缀 `tf_` |
| name | string | 是 | -- | 专班名称 |
| type | string | 是 | -- | 专班类型 |
| status | `'active'\|'dissolved'` | 是 | `'active'` | 专班状态 |
| activityId | string\|null | 否 | `null` | 关联活动 ID（专班与活动互斥，为 null） |
| createdBy | string | 是 | -- | 创建者 ID |
| createdAt | string (ISO) | 是 | -- | 创建时间 |
| members | string[] | 否 | `[]` | 成员 ID 列表 |
| description | string | 否 | -- | 专班描述 |

**赋权记录结构** (`sop_org_os_assigned_roles`):

```js
// 存储在 localStorage，键: 'sop_org_os_assigned_roles'
assignedRoles: Array<{
  name: string,        // 同志姓名
  role: 'organizer' | 'deep',  // 赋予角色
  activity: string     // 关联活动名称（可为空）
}>
```

**专班成员展示** (位于宣传委员面板 `#publicity-taskforce-chips`)：由 `assignedRoles` 中 `role='organizer'` 或 `role='deep'` 的记录渲染。

### 2.4 系列活动数据 (SeriesRecord)

> 长期活动/系列活动 = 时间维度的重复模式，≠ 专班（人员维度的组织结构）。

| 字段名 | 类型 | 必填 | 说明 |
|---|---|---|---|
| id | string | 是 | `series-{timestamp}` |
| title | string | 是 | 系列活动名称 |
| scenario | string | 是 | 组织场景 |
| activityType | string | 是 | 活动形式 |
| direction | `'top-down' \| 'bottom-up'` | 是 | 发起方向 |
| hostGroup | string | 否 | 承办党小组 |
| recurrenceRule | object | 是 | `{frequency, interval, startDate, endDate?}` |
| subActivityIds | string[] | 是 | 展开后的子活动 ID 列表 |
| organizerName | string | 否 | 组织者 |
| deepParticipantName | string | 否 | 深度参与者 |
| archived | boolean | 否 | 全部子活动完成→true→归档 |
| createdAt | string (ISO) | 是 | 创建时间 |

**三者关系**：
- **短期活动** (ActivityRecord)：一次性事件，党小组组长写入
- **系列活动** (SeriesRecord)：时间重复模式，党小组组长创建、书记审核
- **专班** (TaskForceRecord)：人员组织结构，组织委员招募统筹

### 2.5 考勤数据 (AttendanceRecord)

> 类型定义位于 [domain.js](../../docs/src/core/domain.js#L34-L45)
> **字段命名说明**：`personId` 统一为人员标识字段（2026-07-15 审计改进）。代码中仍使用 `userId`，待后续同步。

| 字段名 | 类型 | 必填 | 默认值 | 说明 |
|---|---|---|---|---|
| id | string | 是 | `generateId()` | 唯一标识符 |
| activityId | string | 是 | -- | 所属活动 ID |
| personId | string | 是 | -- | 参会成员人员 ID（统一命名，代码中为 userId） |
| status | `'present'\|'absent'\|'leave'` | 是 | -- | 出勤状态（出席/缺席/请假） |
| recordedBy | string | 是 | -- | 记录人用户 ID（纪检委员） |
| recordedAt | string (ISO) | 是 | -- | 记录时间 |
| studentId | string | 否 | -- | 学号 |
| developStage | `'入党申请人'\|'积极分子'\|'发展对象'\|'预备党员'\|'正式党员'` | 否 | -- | 发展阶段（D-239 统一中文枚举） |
| partyGroup | string | 否 | -- | 所属党小组 |

**出勤状态枚举：**

| 值 | 中文 | 说明 |
|---|---|---|
| `present` | 出席 | 按时到场 |
| `absent` | 缺席 | 未到场（触发补课机制，T+7 内完成） |
| `leave` | 请假 | 事假须提前1天申请；病假可事后补假 |
| `made_up` | 已补 | 补课完成后考勤状态变更为"已补"（§2.17.2 补课制度） |

**发展阶段枚举（D-239 统一中文）：**

| 值 | 说明 |
|---|---|
| `入党申请人` | 入党申请人阶段 |
| `积极分子` | 入党积极分子 |
| `发展对象` | 发展对象 |
| `预备党员` | 预备党员 |
| `正式党员` | 正式党员 |

### 2.6 分工数据 (AssignmentRecord)

> 类型定义位于 [domain.js](../../docs/src/core/domain.js)

| 字段名 | 类型 | 必填 | 默认值 | 说明 |
|---|---|---|---|---|
| id | string | 是 | `generateId()` | 唯一标识符 |
| activityId | string | 是 | -- | 所属活动 ID |
| workName | string | 是 | -- | 工作名称 |
| workDescription | string | 是 | -- | 工作描述 |
| ddl | string (ISO) | 是 | -- | 截止日期 |
| assigneeId | string | 是 | -- | 被分配人 ID |
| status | `'pending'\|'in_progress'\|'completed'` | 是 | `'pending'` | 分工状态 |
| createdBy | string | 是 | -- | 创建者 ID |
| createdAt | string (ISO) | 是 | -- | 创建时间 |
| completedAt | string\|null (ISO) | 否 | `null` | 完成时间 |

### 2.7 交接数据 (HandoverRecord)

> 类型定义位于 [domain.js](../../docs/src/core/domain.js)

| 字段名 | 类型 | 必填 | 默认值 | 说明 |
|---|---|---|---|---|
| id | string | 是 | `generateId()` | 唯一标识符 |
| title | string | 是 | -- | 交接记录标题 |
| fromPerson | string | 是 | -- | 交接发起人 ID |
| toPerson | string | 是 | -- | 接收人 ID |
| activityId | string | 是 | -- | 所属活动 ID |
| items | {content: string, status: string}[] | 是 | `[]` | 交接事项列表 |
| createdAt | string (ISO) | 是 | -- | 创建时间 |

### 2.8 补课任务 (MakeupTask)

> 类型定义位于 [makeup.js](../../docs/src/services/makeup.js)（`autoGenerateMakeupTask` 动态生成）

| 字段名 | 类型 | 必填 | 默认值 | 说明 |
|---|---|---|---|---|
| id | string | 是 | `'mk_' + Date.now() + '_' + personId` | 唯一标识符，前缀 mk_ |
| personId | string | 是 | -- | 需补课人员 ID |
| activityId | string | 是 | -- | 关联活动 ID |
| attendanceRecordId | string | 是 | -- | 关联考勤记录 ID |
| activityName | string | 是 | -- | 活动名称（冗余字段，方便展示） |
| personName | string | 是 | -- | 人员姓名（冗余字段，方便展示） |
| absentDate | string (YYYY-MM-DD) | 是 | -- | 缺勤日期 |
| deadline | string (YYYY-MM-DD) | 是 | -- | 补课截止日期（缺勤后 T+7） |
| status | `'pending'\|'completed'` | 是 | `'pending'` | 补课状态 |
| isMandatory | boolean | 是 | -- | 是否刚性考勤（三会一课/主题党日为刚性） |
| proofContent | string\|null | 否 | `null` | 补课证明内容 |
| createdAt | string (ISO) | 是 | -- | 创建时间 |
| completedAt | string\|null (ISO) | 否 | `null` | 完成时间 |

### 2.9 通知数据 (Notice)

> 类型定义位于 [notice.js](../../docs/src/services/notice.js)

| 字段名 | 类型 | 必填 | 默认值 | 说明 |
|---|---|---|---|---|
| id | string | 是 | `'notice-' + Date.now()` | 唯一标识符 |
| title | string | 是 | -- | 通知标题 |
| content | string | 是 | -- | 通知内容 |
| priority | `'urgent'\|'normal'\|'low'` | 是 | `'normal'` | 优先级（紧急/一般/低优） |
| publishDate | string (YYYY-MM-DD) | 是 | 当前日期 | 发布日期 |
| expireDate | string\|null (YYYY-MM-DD) | 否 | `null` | 过期日期（过期后不展示） |
| targetModule | string | 否 | -- | 目标模块（点击跳转用） |
| read | boolean | 否 | `false` | 是否已读 |

### 2.10 经验沉淀 (ExperienceDeposit)

> 类型定义位于 [domain.js](../../docs/src/core/domain.js)

| 字段名 | 类型 | 必填 | 默认值 | 说明 |
|---|---|---|---|---|
| id | string | 是 | `generateId()` | 唯一标识符 |
| title | string | 是 | -- | 经验总结标题 |
| content | string | 是 | -- | 经验内容 |
| category | string | 是 | -- | 分类 |
| sourceType | `'activity'\|'taskforce'\|'standalone'` | 是 | -- | 来源类型 |
| sourceId | string | 否 | -- | 来源 ID |
| createdBy | string | 是 | -- | 创建者 ID |
| createdAt | string (ISO) | 是 | -- | 创建时间 |

### 2.11 制度文件引用 (ComplianceReference)

> 类型定义位于 [domain.js](../../docs/src/core/domain.js)

| 字段名 | 类型 | 必填 | 默认值 | 说明 |
|---|---|---|---|---|
| id | string | 是 | `generateId()` | 唯一标识符 |
| title | string | 是 | -- | 文件标题 |
| description | string | 否 | -- | 文件描述 |
| category | `'institutional'\|'sop'\|'internal'` | 是 | -- | 分类：制度性文件/SOP/内部规范 |
| sourceType | string | 是 | -- | 来源类型 |
| path | string | 否 | -- | 文件路径 |
| referencedAt | string (ISO) | 是 | -- | 引用时间 |
| referrer | string | 是 | -- | 引用者 ID |

### 2.12 任务数据 (Task)

> 类型定义位于 [domain.js](../../docs/src/core/domain.js#L59-L66)

| 字段名 | 类型 | 必填 | 默认值 | 说明 |
|---|---|---|---|---|
| id | string | 是 | `generateId('tsk')` | 唯一标识符，前缀 `tsk_` |
| activityId | string | 是 | -- | 所属活动 ID |
| title | string | 是 | -- | 任务标题 |
| status | `'pending'\|'in_progress'\|'completed'` | 是 | `'pending'` | 任务状态 |
| createdAt | string (ISO) | 是 | `new Date().toISOString()` | 创建时间（审计字段） |

### 2.13 应用状态数据 (appState)

> 定义位于 [core/state.js](../../docs/src/core/state.js#L126-L146)

| 字段名 | 类型 | 初始值 | 说明 |
|---|---|---|---|
| status | STATE 枚举 | `STATE.IDLE` (0) | 服务层状态：IDLE/LOADING/SUBMITTING/SUCCESS/ERROR |
| activities | Activity[] | `[]` | 内存活动列表快照 |
| tasks | Task[] | `[]` | 内存任务列表快照 |
| error | string\|null | `null` | 错误信息 |
| domain | string | `'activity'` | 当前域：'activity' 或 'organization' |
| role | string | `'all'` | 参考指南当前角色（由 selectedRole 推导） |
| activeModule | string | `'dashboard'` | 当前活动模块 |
| viewMode | string | `'list'` | 列表/详情双视图：'list' 或 'detail' |
| selectedActivityId | string\|null | `null` | 选中活动 ID |
| selectedDate | string\|null | `null` | 选中日期 |
| displayMonth | string | `_currentYearMonth()` | 显示月份 (YYYY-MM) |
| selectedRole | string\|null | `null` | 核心角色状态（null=未选择/默认参与者） |
| viewType | `'participant'\|'manager'\|'global'` | `'participant'` | 视图类型（由 selectedRole 自动推导） |
| viewArchived | boolean | `false` | 归档库独立视图标志 |

**STATE 枚举：**

| 枚举值 | 数值 | 含义 |
|---|---|---|
| `STATE.IDLE` | 0 | 空闲 |
| `STATE.LOADING` | 1 | 加载中 |
| `STATE.SUBMITTING` | 2 | 提交中 |
| `STATE.SUCCESS` | 3 | 成功 |
| `STATE.ERROR` | 4 | 出错 |

#### 2.13.1 动态角色上下文

> 定义位于 [core/state.js](../../docs/src/core/state.js#L32-L37)

本系统区分两种角色模型：**用户角色**（控制 Web UI 视图）和**动态文件角色**（控制 AI/人机 协作边界）。

| 上下文 | 角色 | 触发条件 |
|---|---|---|
| SNAPSHOT.md 活跃状态 | `[AI]` | SNAPSHOT.md 中 status="ACTIVE" 时 AI 可读写 |
| SNAPSHOT.md 归档状态 | `[工程师]+[AI]` | SNAPSHOT.md 归档后工程师可查 |
| TIMESTAMPS.md 自动更新 | `[AI]` | 周期性任务自动更新时 |
| TIMESTAMPS.md 人工维护 | `[工程师]+[AI]` | 人工维护时 |

**AI 可修改文件白名单：**

| 路径模式 | 说明 |
|---|---|
| `.ctx/TIMESTAMPS.md` | 时间戳记录 |
| `.ctx/SNAPSHOT.md` | 快照文件 |
| `.ctx/logs/` | 日志目录 |

### 2.14 SOP 场景模板 (Scenario)

> 定义位于 [sopData.js](../../docs/src/workflow/sopData.js)

| 字段名 | 类型 | 说明 |
|---|---|---|
| scenarioId | string | 场景唯一 ID |
| title | string | 场景标题（含【领域分类】前缀） |
| domain | `'activity'\|'organization'` | 所属领域 |
| description | string | 场景描述（含考勤类型说明） |
| tasks | ScenarioTask[] | 任务列表 |

**ScenarioTask 字段：**

| 字段名 | 类型 | 必填 | 说明 |
|---|---|---|---|
| taskId | string | 条件 | 任务 ID（部分任务可省略） |
| title | string | 是 | 任务标题 |
| executor | string | 是 | 执行角色键 |
| supervisor | string\|null | 是 | 督办角色键（可为 null） |
| timeOffset | number\|null | 是 | 距 T-0 的天数偏移（null = 无时间锚点） |
| desc | string | 否 | 任务详细描述 |

**内置场景清单（共 12 个）：**

| scenarioId | 标题 | domain | 考勤类型 |
|---|---|---|---|
| `org-life` | 组织生活会 | activity | 刚性考勤 |
| `theme-party` | 主题党日活动 | activity | 弹性考勤 |
| `branch-party-meeting` | 支部党员大会 | activity | 刚性考勤 |
| `party-group-meeting` | 党小组会 | activity | 刚性考勤 |
| `party-lecture` | 党课 | activity | 刚性考勤 |
| `joint-event` | 团支部合办活动 | activity | 党小组主导 |
| `new-system` | 制度制定与迭代 | organization | -- |
| `develop-activist` | 考察积极分子 | organization | -- |
| `info-platform` | 信息平台支持 | organization | -- |
| `attendance-check` | 查考勤记录 | organization | -- |
| `feedback-handling` | 处理意见建议反馈 | organization | -- |

### 2.15 工作流定义 (Definition)

> 定义位于 [definitions.js](../../docs/src/workflow/definitions.js)

**通用状态节点：**

| 状态名 | 中文标签 | 所属阶段 | 可编辑 | 超时(h) |
|---|---|---|---|---|
| DRAFT | 草稿 | 策划 | 是 | 168 (短期) / 336 (长期) |
| PENDING_LEADER | 待党小组组长审批 | 审批 | 否 | 48 (短期) / 96 (长期) |
| APPROVED | 已审批 | 审批 | 是 | 72 (短期) / 168 (长期) |
| PREPARING | 筹备中 | 筹备 | 是 | 72 |
| IN_PROGRESS | 进行中 | 实施 | 是 | 36 |
| COMPLETED | 已完成 | 收尾 | 是 | 96 (短期) / 168 (长期) |
| IN_REVIEW | 复核中 | 复核 | 否 | 120 (短期) / 168 (长期) |
| ARCHIVED | 已归档 | 归档 | 否 | 无 |

**长期活动专用状态：**

| 状态名 | 中文标签 | 所属阶段 | 说明 |
|---|---|---|---|
| GROUP_FORMING | 组建活动小组 | 组建 | 拆分活动小组，招募组织者+深度参与者 |
| SYNCING | 组织层同步 | 协调 | 内容同步 + 考勤考察 + 协调层运作 |

**活动分类维度：**

| 维度 | 值 | 说明 |
|---|---|---|
| duration | `short-term` | 一次性完成（参访、线下学习等） |
| duration | `long-term` | 长期打磨/多小组同步推进 |
| direction | `bottom-up` | 自下而上：党小组/成员自发发起的活动 |
| direction | `top-down` | 自上而下：支委/书记布置的任务 |
| direction | `either` | 两种发起方式均可 |

**活动属性标签：**

| 属性 | 值 | 说明 |
|---|---|---|
| isBrand | `true` | 品牌活动（由书记认定标记，不影响工作流选择） |
| isBrand | `false` | 普通日常活动 |

**3 套工作流定义模板：**

| 定义 ID | 标题 | duration | 状态数 | 状态 |
|---|---|---|---|---|
| `theme-party-day` | 主题党日活动 | short-term | 7 | active |
| `short-term` | 短期活动 | short-term | 7 | active |
| `long-term` | 长期活动 | long-term | 9 | active |

### 2.16 意见反馈数据 (IssueRecord)

> **D-244/T105 变更**：意见反馈已升级为 GitHub Issue 风格意见反馈系统。数据从 localStorage 单轨（FeedbackStore）升级为双轨（issues.json 权威源 + localStorage 草稿）。旧 FeedbackRecord 类型已弃用，保留向后兼容 shim（feedback.js）。

> 类型定义位于 [feedback.js](../../docs/src/services/feedback.js)

| 字段名 | 类型 | 必填 | 默认值 | 说明 |
|---|---|---|---|---|
| id | string | 是 | `'fb-' + Date.now()` | 唯一标识符，前缀 `fb-` |
| scope | `'permanent'\|'global'\|'role'\|'scenario'` | 是 | -- | 影响范围：底层架构/全局规则/支委分工/特定场景 |
| scenarioName | string | 否 | `''` | 场景名称/编号（scope=scenario 时有意义） |
| painPointFile | string | 否 | `''` | 痛点所在文件 |
| painPointDetail | string | 否 | `''` | 痛点详细描述 |
| painPoint | string | 否 | `''` | 痛点概述 |
| proposedFix | string | 否 | `''` | 建议修改方向 |
| submittedBy | string | 是 | `'匿名'` | 提交人（可匿名） |
| submittedAt | string (YYYY-MM-DD) | 是 | `new Date().toISOString().slice(0, 10)` | 提交日期 |
| status | `'pending'\|'processing'\|'done'` | 是 | `'pending'` | 处理状态：待处理/处理中/已完成 |
| comments | {text: string, author: string, date: string}[] | 是 | `[]` | 书记/支委回复评论列表 |

**处理流程**：提交(pending) → 书记审阅(processing) → 回复/采纳(done)

### 2.16.1 复盘数据 (ReviewRecord) — D-242 本轮补建

> 类型定义位于 [domain.js](../../docs/src/core/domain.js)（ReviewRecord typedef + ReviewStatus 枚举）
> **设计依据**：D-238 活动复盘模板系统内表单 + D-242 复盘状态枚举本轮补建
> **数据流**：§3.1.2 第⑧步复盘监督（批注/打回/确认）+ 第⑨步补交/修改复盘

| 字段名 | 类型 | 必填 | 默认值 | 说明 |
|---|---|---|---|---|
| id | string | 是 | -- | 唯一标识符 |
| activityId | string | 否 | -- | 关联活动 ID（活动复盘时必填） |
| sourceType | `'activity'\|'taskforce'` | 否 | `'activity'` | 来源类型（专班复盘时为 'taskforce'） |
| sourceName | string | 否 | -- | 来源名称（专班复盘时为专班名称） |
| organizerId | string | 是 | -- | 组织者人员 ID（须为活动/专班的实际 organizer） |
| progress | string | 是 | -- | 进度状态（如 '已完成'/'进行中'/'超时'） |
| overdue | boolean | 是 | `false` | 是否超时 |
| reviewStatus | `ReviewStatus` | 是 | `'未提交'` | 复盘状态（见下方枚举） |
| reviewContent | string | 否 | `''` | 复盘内容 |
| annotation | string | 否 | `''` | 批注内容（reviewStatus='批注中'/'已打回'时填写） |
| annotatedBy | string | 否 | -- | 批注人 personId（纪检委员） |
| annotatedAt | string (ISO) | 否 | -- | 批注时间 |
| submittedAt | string (ISO) | 否 | -- | 提交时间（reviewStatus 非'未提交'时填写） |
| confirmedAt | string (ISO) | 否 | -- | 确认时间（reviewStatus='已确认'时填写） |

**复盘状态枚举（D-242）：**

| 值 | 说明 | 流转 |
|---|---|---|
| `未提交` | 组织者未提交复盘 | 初始状态 |
| `已上传` | 组织者已提交复盘 | 未提交 → 已上传 |
| `批注中` | 纪检委员正在批注 | 已上传 → 批注中 |
| `已确认` | 纪检委员确认完成 | 批注中 → 已确认 |
| `已打回` | 纪检委员打回要求修改 | 批注中 → 已打回 → 已上传（重新提交） |

**流转图**：未提交 → 已上传 → 批注中 → 已确认 / 已打回（→ 已上传）

### 2.17 写入数据验证设计

> 本节是写入数据验证设计的权威源，定义"写入→查看"数据流的完整验证框架。

#### 2.17.1 设计原则

**写入即验证**：每次写入操作后，系统应能在至少一个查看点确认数据已正确持久化。写入和查看构成闭环——如果写入的数据在任何查看点都看不到，则写入失败。

**数据流三段模型**：

```
写入端（谁写入） → 存储层（存哪里） → 查看端（谁看到）
```

每条数据流必须明确这三个端点。缺失任何一端，数据流不完整。

**验证粒度**：

- **字段级**：写入的每个字段在查看端是否有对应展示
- **状态级**：写入后的状态变更是否在查看端正确反映
- **关系级**：写入的关联关系（如活动→考勤）是否在查看端正确解析

#### 2.16.2 写入操作数据流清单

**活动写入：**

| 写入端 | 存储层 | 查看端 | 验证点 |
|--------|--------|--------|--------|
| 书记工作台（决策树引导式写入） | mockDB.activities + localStorage | 日历视图（月/周/日/列表） | 新活动标记出现 |
| 书记工作台 | 同上 | 主页统计卡片 | "活动总数"+1 |
| 书记工作台 | 同上 | 主页近期活动列表 | 新活动条目出现 |
| 书记工作台 | 同上 | 工作流可视化面板 | 流程节点图出现 |
| 党小组组长工作台 | 同上 | 日历视图 | 新活动标记出现（仅党小组会/主题党日） |
| 党小组组长工作台 | 同上 | 党小组组长工作台活动列表 | 新活动条目出现 |

**其他写入操作验证点：**

| 写入类型 | 写入端 | 验证点 |
|--------|--------|--------|
| 考察记录写入 | 组织者工作台 | 组织者已有记录表新记录行出现；纪检委员考察档案对应记录出现 |
| 分工记录写入 | 组织者工作台 | 分工记录列表新记录行出现；分工统计数字更新 |
| 专班招募写入 | 组织委员工作台 | 组织委员看板新专班卡片出现；主页专班进展新条目出现 |
| 赋权写入 | 书记工作台 | 书记赋权记录列表新记录出现；被赋权者切换视图可进入管理模式 |
| 考勤上传 | 党小组组长工作台 | 纪检委员考勤总表新考勤记录出现 |
| 考察上传 | 党小组组长工作台 | 纪检委员考察确认面板新考察记录出现（待确认状态） |
| 确认考勤 | 纪检委员 | 党小组组长工作台缺勤列表状态更新；补课任务自动生成 |
| 数据交接 | 组织者工作台 | 组织者交接记录列表新记录出现；纪检委员交接面板出现已提交状态记录 |
| 补课制度 | 纪检委员 | 补课制度Tab新补课任务出现；考勤记录缺勤状态→已补 |
| 意见反馈 | 全员提交 issue + 评论 + 表态 | 书记处置（status/close/milestone/assignee/drafts）+ 新 issue 或新评论通知 |
| 制度文件引用 | 组织委员 | 制度文件Tab新引用记录出现 |
| 子记录写入 | 党小组组长/组织委员 | 对应详情面板新子记录行出现 |
| 文件空间 | 组织者工作台 | 文件空间Tab新记录出现；统计概览卡片计数更新 |
| 经验沉淀 | 深度参与者 | 深度参与者我的沉淀列表新记录出现；纪检委员经验沉淀Tab新记录出现 |
| 看板确认完成 | 组织委员/宣传委员 | 看板活跃区消失，归档区出现 |

#### 2.17.3 验证策略

- **自动化验证（长期目标）**：每个写入操作应配套一个验证函数，写入后自动检查查看端是否正确反映
- **手动验证清单（当前方案）**：每次实现新写入功能时，在开发清单中补充对应的验证项，开发完成后逐一勾选
- **跨页面验证**：依赖 `CrossPageState` 和 `storage` 事件同步机制——写入后触发 `bumpDataVersion()`，其他页面监听 `storage` 事件刷新，页面切换时通过 `load()` 恢复上下文

---

## 三、参与者数据流设计

### 3.1 三级管理模式架构图

#### 3.1.1 三级管理模式总览

```
                              +-----------------------------+
                              |         党 支 部            |
                              |    （支委会统筹决策层）      |
                              +-------------+---------------+
                                            |
                    +-----------------------+-----------------------+
                    |                       |                       |
                    v                       v                       v
   +----------------+----------+ +---------+--------+ +-----------+---------------+
   |      组 织 者             | |    深 度 参 与 者   | |      普 通 参 与 者        |
   |   (分工记录层)            | |   (具体执行层)      | |     (考勤记录层)           |
   |                           | |                    | |                          |
   | * 党小组组长              | | * 有明确分工并     | | * 参加但无具体分工        |
   | * 支委（组织活动时）  | |   实际完成的成员    | | * 仅记录为"出勤"          |
   | * 组织者                  | | * 承担具体工作：     | | * 不分配任务              |
   |                           | |   宣传 / 现场统筹 / | |                          |
   | 职责：                    | |   技术支持 /         | | 产出：                    |
   | * 分工记录（核心职能）   | |   一对一对接 /       | | * 考勤记录：出勤          |
   | * 平等协商分工（非上下级）| |   材料整理等         | |                          |
   | * 桥梁作用（与支委同步） | |                    | |                          |
   | * 打包产出物（考勤基础层  | | 产出：              | |                          |
   |   +考察进阶层）           | | * 考察记录：        | |                          |
   | * 鼓励复盘和创新提案     | |   深度参与-[角色]   | |                          |
   |                           | |                    | |                          |
   | 产出：                    | |                    | |                          |
   | * 分工记录                | |                    | |                          |
   | * 考察记录+产出物打包    | |                    | |                          |
   | * 考察记录：组织          | |                    | |                          |
   +-------------+-------------+ +--------+-----------+ +----------+---------------+
                 |                        |                        |
                 |    平等协商分工         |                        |
                 +----------------------->|                        |
                 |                        |                        |
                 |      各自执行           |                        |
                 |<-----------------------+                        |
                 |                        |                        |
                 |    分工记录汇总         |                        |
                 +----------------------->|                        |
                 |                        |                        |
                 v                        v                        v
   +-------------+------------------------+------------------------+---------------+
   |                              归 档 层                                        |
   |                                                                            |
   |  考勤记录（0-1变量，基础层）          考察记录（工作量记录，进阶层）                |
   |  对象：党员、预备党员                 对象：深度参与者和组织者                    |
   |  适用：三会一课                       适用：所有支部工作                      |
   |  状态：出勤 / 请假 / 缺勤             层级：组织 / 深度参与                     |
   |  提交：宣传委员备案                   提交：组织委员建档（每月）               |
   |  执行人：纪检委员                     执行人：纪检委员                        |
   +----------------------------------------------------------------------------+
```

#### 3.1.2 数据流

```
[组织者]                    [深度参与者]                 [纪检委员]                  [归档]
   |                             |                          |                          |
   |-- ① 平等协商分工 --------->|                          |                          |
   |-- ② 确认分工内容 ---------->|                          |                          |
   |                             |                          |                          |
   |                             |-- ③ 执行并反馈 -------->|                          |
   |                             |                          |                          |
   |<-- ④ 分工记录汇总 ----------|                          |                          |
   |                             |                          |                          |
   |-- ⑤ 提交分工记录与考察记录 -------------------------->|                          |
   |                             |                          |                          |
   |                             |                          |-- ⑥ 汇总考勤记录/考察记录 -->|
   |                             |                          |                          |
   |-- ⑦ 完成复盘报告 ----------------------------------------------------------------->|
   |                             |                          |                          |
   |                             |                             |<-- ⑧ 复盘监督（批注/打回/确认） --|
   |                             |                          |                          |
   |-- ⑨ 补交/修改复盘 ----------------------------------------------------------------->|
```

### 3.2 角色权限矩阵简表

> 权限矩阵的完整定义见 [ROLE_CLASSIFICATION.md](../governance/ROLE_CLASSIFICATION.md) §九 角色权限矩阵。以下为切面视图，冲突时以权威源为准。

**数据层权限矩阵：**

| 角色 | 读活动 | 创建活动 | 管理专班 | 写入考勤 | 读考勤 | 查看考察档案 | 修改考察档案 | 归档操作 | 赋权他人 |
|---|---|---|---|---|---|---|---|---|---|
| **secretary** (党支书) | 是 | 是 | 是 | 是 | 是 | 是 | 是 | 是 | 是 |
| **org-commissioner** (组织委员) | 是 | 否 | 是 | 否 | 是 | 是 | 是 | 是 | 是 (专班协调) |
| **prop-commissioner** (宣传委员) | 是 | 否 | 是 | 否 | 是 | 否 | 否 | 是 | 否 |
| **disc-commissioner** (纪检委员) | 是 | 否 | 否 (不设专班) | 是（确认后录入考勤总表） | 是 | 是 | 是（确认后录入考察总表） | 是（复盘确认后录入后台） | 否 |
| **leader** (党小组组长) | 是 | 是 | 否 | 否 | 是 | 否 | 否 | 否 | 否 |
| **organizer** (组织者) | 是 | 否 | 否 | 否 | 是 | 否 | 否 | 否 | 否 |
| **deep** (深度参与者) | 是 | 否 | 否 | 否 | 是 | 否 | 否 | 否 | 否 |
| **participant** (默认参与者) | 是 | 否 | 否 | 否 | 是 | 否 | 否 | 否 | 否 |

**业务操作权限简表：**

| 角色 | 查看所有活动 | 创建活动 | 分配任务 | 修改分工 | 标记完成 | 填写复盘 | 考勤记录 | 考察记录 |
|------|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| 党小组组长 | Y | Y | Y | Y | Y | Y | -- | 导入 |
| 组织者 | Y | -- | Y | Y | Y | Y | -- | 导入 |
| 深度参与者 | 自己的 | -- | -- | -- | Y | -- | -- | 自己的 |
| 普通参与者 | 公开信息 | -- | -- | -- | -- | -- | -- | 自己的 |
| 纪检委员 | Y(审计) | -- | -- | -- | -- | 督办 | Y | 考察汇总 |
| 组织委员 | Y(建档) | -- | -- | -- | -- | -- | -- | 建档 |
| 宣传委员 | Y(备案) | -- | -- | -- | -- | -- | 备案 | -- |
| 支部书记 | Y(全局) | Y | Y | Y | Y | Y | 审阅 | 审阅 |

### 3.3 短期活动管理 vs 长期建设管理

系统需同时支持两种管理模式，以下为关键维度对比：

| 维度 | 短期活动管理 | 长期建设管理 |
|------|------------|------------|
| **时间跨度** | 1天 -- 1月 | 1月 -- 1年 |
| **组织者** | 组织者（按活动指派） | 党小组组长 + 组织委员 |
| **深度参与者** | 单次分工完成 | 持续追踪、阶段性分工记录 |
| **普通参与者** | 单次出勤记录 | 累计统计 + 阶段性评估 |
| **考勤记录/考察记录** | 单次记录 | 累计统计 + 阶段性评估 |
| **复盘机制** | 活动后1周内 | 每月进度检查 + 季度复盘 |
| **任务粒度** | 一次性任务分配 | 迭代式任务分派 + 中期调整 |
| **记录方式** | 结果记录（分工完成情况） | 过程记录（进度 + 质量 + 阶段产出） |
| **代表场景** | 主题党日、社会实践、组织生活会（依托三会形式） | 宣讲团建设、人生回望录、发展党员培养 |
| **系统数据模型** | `Activity` + 单次 `Task` | `Project` → `Milestone` → `Task` 层级 |
| **复盘模板** | 单次活动复盘模板 | 阶段复盘 + 终期复盘模板 |

**数据模型扩展**：

目前系统以 `Activity` 为核心数据单元，支撑短期活动管理。为支持长期建设管理，需在后续版本引入 `Project` 实体：

```
短期模型：Activity ──has──> Task ──assigned──> DeepParticipant
                              └──attendee──> Participant

长期模型：Project ──has──> Milestone ──has──> Task ──assigned──> DeepParticipant
              │                                                     │
              └──periodic_review (复盘节点)                         └──progress_log (进度日志)
```

### 3.4 场景应用详解

#### 3.4.1 宣讲团建设场景

**场景特征：** 长期建设项目，涉及研究、撰稿、设计、宣讲等多个子任务，需要多轮反馈与跨组协调。

**角色映射：**

| 实体角色 | 系统角色 | 职责说明 |
|---------|---------|---------|
| 党小组组长 | **组织者** | 跟踪宣讲团整体进展，负责多次反馈循环和跨组协调；设定阶段性目标，记录各轮分工完成情况 |
| 小组内部成员 | **深度参与者** | 承担研究/撰稿/设计/宣讲等具体分工；在系统内标记任务完成，提交阶段性成果 |
| 其他参与成员 | **普通参与者** | 出席但不分工，完成学习材料学习；记录为"出勤" |

**关键流程：** 创建项目 → 设置里程碑（选题研究→稿件撰写→试讲打磨→正式宣讲）→ 分阶段分配任务与迭代反馈 → 终期复盘评估贡献度。

#### 3.4.2 "人生回望录"活动场景

**场景特征：** 需要一对多老师对接的项目制活动，涉及大量协调与材料整理工作。

**角色映射：**

| 实体角色 | 系统角色 | 职责说明 |
|---------|---------|---------|
| 支委 / 指定党员 | **组织者** | 统筹老师对接排期，跟踪全部参与者的进度；一对多老师联络与进度管理 |
| 执行层党员/成员 | **深度参与者** | 一对一与老师对接、整理走访摘要、归档记录材料 |
| 普通参与成员 | **普通参与者** | 参与但未与老师建立一对一联络，仅记录为"出勤" |

**关键流程：** 创建活动 → 统筹排期（确定各位老师访谈时间窗口）→ 一对一分工对接 → 跟踪进度与协调 → 分工记录汇总形成考察记录 → 复盘评估。

### 3.5 考勤 vs 考察维度说明

本系统维护两套层级化的记录体系：考勤为基础层，考察为进阶层。源自 [纪检委员工作流程指南 §1.2](../sop/纪检委员工作流程指南.md#L100-L108) 的明确规定。

#### 3.5.1 核心区别

| 维度 | 考勤（0-1变量，对所有人） | 考察（工作量记录，对深度参与者和组织者） |
|------|--------------------------|----------------------------------------|
| **性质** | 刚性底线（基础层） | 弹性贡献（进阶层） |
| **对象** | 党员、预备党员 | 深度参与者和组织者 |
| **适用范围** | 三会一课；组织生活会（依托三会形式，同等刚性） | 所有支部工作（含三会一课、主题党日、社会实践等） |
| **记录方式** | 二元/三元：出勤 / 请假 / 缺勤 | 工作量记录：组织 / 深度参与 |
| **记录时机** | 实时记录（活动中签到） | 实时记录（活动中观察 + 活动后确认） |
| **提交对象** | 宣传委员（备案） | 组织委员（建档，每月提交） |
| **是否考虑质量** | 否，仅记录客观出勤事实 | 是，深度参与须满足 ☑明确分工 ☑实际完成 ☑可验证 ☑有贡献 |
| **补课/补救** | 请假/缺勤须补课，标注"已补" | 不适用（考察记录不可补救） |

#### 3.5.2 判断逻辑

```
活动开始
  ├─ 三会一课？ → 对象=党员+预备党员 → 签到/记录出勤状态（出勤/请假/缺勤）
  └─ 其他支部工作？ → 对象=所有支部成员
       └─ 是否有明确分工？
           ├─ 否 → 记录为【出勤】
           └─ 是 → 是否实际完成？
               ├─ 否 → 记录为【出勤】（挂名无实）
               └─ 是 → 记录为【深度参与】（标注具体角色）
                   └─ 主导策划与实施？
                       ├─ 是 → 记录为【组织】
                       └─ 否 → 记录为【深度参与-角色】
```

#### 3.5.3 系统记录字段

> 考勤记录字段定义见 §2.5 AttendanceRecord。考察记录补充字段：`participationLevel`（"组织"/"深度参与"）、`deepRole`（仅深度参与时填写）、`specificWork`、`divisionRecordedBy`、`submittedTo`、`submittedAt`。

### 3.6 登录态打桩设计

> 当前无登录态，所有交互按"党支书站位"运行。接入登录系统后按 §四 规范实施。

#### 3.6.1 核心概念

| 概念 | 位置 | 含义 |
|------|------|------|
| **站位（stance）** | 右上角选择器 | "我是谁"——当前登录者的身份定位 |
| **身份视图（view）** | 侧边栏选择器 | "我看谁"——以哪个角色的视角查看工作台 |
| **模式（mode）** | 自动推导 | 站位与视图的关系决定——管理/管理者只读/成员只读 |

**模式推导规则：**

```
stance === view           → 管理模式（manage）
stance 是 view 的赋权上游 → 管理者只读（manager-observe）
其他情况                  → 成员只读（participant-observe）
```

#### 3.6.2 登录角色站位权限矩阵

| 登录角色 | 可选站位 | 可看视图 | 模式规则 | 典型场景 |
|------|------|------|------|------|
| 党支书 | 党支书（固定） | 所有角色 | 站位=视图→管理；站位≠视图→管理者只读 | 查看组织委员/党小组组长视图（管理者只读） |
| 组织委员 | 组织委员（固定） | 自身 + 宣传委员 + 纪检委员 + 组织者 + 深度参与者 | 站位=视图→管理；看下游→管理者只读 | 查看组织者视图（管理者只读，专班赋权） |
| 宣传委员 | 宣传委员（固定） | 自身 + 组织委员 + 纪检委员 | 站位=视图→管理；看同级→管理者只读 | 查看组织委员视图（管理者只读） |
| 纪检委员 | 纪检委员（固定） | 自身 + 组织委员 + 宣传委员 | 站位=视图→管理；看同级→管理者只读 | 查看宣传委员视图（管理者只读） |
| 党小组组长 | 党小组组长（固定） | 自身 + 组织者 + 深度参与者 | 站位=视图→管理；看下游→管理者只读 | 查看组织者视图（管理者只读，活动赋权） |
| 组织者 | 组织者（固定） | 仅自身 | 管理 | 只能看自己的工作台 |
| 深度参与者 | 深度参与者（固定） | 仅自身 | 成员只读 | 只能看自己的任务状态 |
| 普通参与者（未赋权） | 无（成员只读面板） | 成员只读面板（ws-visitor.html） | 成员只读 | 查看活动动态、专班进展、个人考勤 |

#### 3.6.3 当前实现状态（无登录态）

| 维度 | 当前行为 | 目标行为 |
|------|---------|---------|
| 默认站位 | 党支书（LOGIN_STANCE='secretary'） | 由登录接口返回 |
| 站位选择 | 所有角色可选（模拟党支书全权限） | 仅可选登录角色对应的站位 |
| 视图选择 | 所有角色可看 | 受站位约束 |
| 模式切换 | 自动推导（T60重构后） | 同左 |

#### 3.6.4 系统检查思路

**登录态接入检查清单：** 逐一验证 §3.6.2 表格中各角色的"可看视图"范围是否正确实现。

**关键条件判定：**

```javascript
// auth.js 中的打桩代码
const LOGIN_STANCE = 'secretary'; // ← 接入登录后替换为动态值
// 登录后站位由 login-entry.js 写入 sessionStorage，不可在页内切换
```

**边界情况：**

1. **党建与党务赋权冲突**：组织委员和党小组组长都可赋权组织者/深度参与者，但赋权分类不同（专班 vs 活动）。需在登录态接入时解决（见 §4.5）。
2. **跨模块视图**：支委在党建工作台和党务管理中的视图选项不同（MODULE_ROLES 约束）。
3. **模式回退**：切换站位后，如果当前视图不在新站位的可看范围内，需自动回退到站位本身。

---

## 四、登录系统设计

> 登录系统的未来设计规范。接入登录系统后按本节规范实施。当前系统无登录态（见 §3.6）。

### 4.1 与现有架构的对接

| 现有概念 | 新概念 | 映射关系 |
|---------|--------|---------|
| primaryRole | stance（站位） | 语义升级，逻辑不变 |
| activeRole | view（身份视图） | 语义升级，逻辑不变 |
| ViewModeStore.getMode() | deriveMode(stance, view) | 从手动切换改为自动推导 |
| ~~header:role-switch~~ | ~~permission:stance-change~~ | 已移除（站位切换器已由登录页替代） |
| sidebar:role-select | permission:role-select | 事件重命名（经 PermissionManager 统一） |

### 4.2 用户身份模型

#### 4.2.1 用户实体属性

| 属性 | 字段名 | 类型 | 说明 |
|------|--------|------|------|
| 用户ID | userId | string | 唯一标识（学号或系统分配ID） |
| 姓名 | name | string | 真实姓名 |
| 学号 | studentId | string | 学校学号 |
| 政治面貌 | politicalStatus | enum | 共青团员/入党积极分子/发展对象/预备党员/正式党员 |
| 发展阶段 | developmentStage | enum | 对应政治面貌的细化阶段 |
| 所属党小组 | groupId | string | 所属块块的ID |
| 固有角色 | inherentRole | enum | secretary/org-commissioner/prop-commissioner/disc-commissioner/leader/member |
| 动态角色 | dynamicRoles | array | 由赋权记录决定的组织者/深度参与者角色列表 |

#### 4.2.2 用户-角色映射规则

**一人一固有角色**：每个用户有且仅有一个固有角色（由组织结构决定，不随活动/专班变化）。

**动态角色可叠加**：组织者和深度参与者是动态角色，由赋权记录决定。一个用户可以同时拥有多个动态角色（如既是A活动的组织者，又是B专班的深度参与者）。

**角色优先级**：当用户同时拥有固有角色和动态角色时：
1. 固有角色决定站位（stance）
2. 动态角色决定可看视图（view）范围
3. 站位优先选择固有角色对应的站位

#### 4.2.3 角色冲突解决

| 冲突场景 | 解决规则 |
|---------|---------|
| 党小组组长同时是组织者 | 站位=党小组组长（固有优先），可看组织者视图（管理者只读） |
| 组织委员同时被赋权为某活动组织者 | 站位=组织委员（固有优先），专班组织者视图已在可看范围内 |
| 同一人在不同分类有不同动态角色 | 按分类隔离——活动组织者仅影响党建工作台，专班深度参与者仅影响党务管理 |

### 4.3 认证机制规范

#### 4.3.1 认证方式

| 方案 | 适用场景 | 优势 | 劣势 |
|------|---------|------|------|
| 学校统一认证（SSO/CAS） | 生产环境 | 无需自建用户系统，与学校身份体系一致 | 依赖学校认证服务可用性 |
| 本地认证（用户名+密码） | 开发/测试 | 独立运行，不依赖外部服务 | 需自建用户管理 |
| OAuth2 第三方登录 | 扩展场景 | 灵活接入多种身份源 | 实现复杂度高 |

**推荐方案**：学校统一认证（SSO/CAS）为主，本地认证为开发备用。

#### 4.3.2 认证接口规范

```
请求：POST /api/auth/login
  Body: { ticket: string }  // SSO返回的ticket

响应：{
  userId: string,
  name: string,
  inherentRole: string,
  dynamicRoles: [{ role: string, scope: 'activity'|'taskforce', sourceId: string }],
  token: string,
  expiresIn: number
}
```

#### 4.3.3 登录后角色获取

SSO 认证成功后，后端根据学号查询用户表获取固有角色，查询赋权记录表获取动态角色列表（含分类标记），前端接收后存入 AuthStore。

#### 4.3.4 会话管理

| 维度 | 规范 |
|------|------|
| 存储方式 | sessionStorage（页面级，关闭标签页即丢失） |
| Token刷新 | 登录后获取token，每次API请求携带，过期后重新认证 |
| 跨页面同步 | 同一标签页内通过 sessionStorage 自动同步；跨标签页通过 storage 事件监听 |
| 登出流程 | 清除 sessionStorage + 通知 SSO 登出 + 重定向到登录页 |
| 多设备 | 允许多设备同时登录（无互踢需求） |

### 4.4 角色判定逻辑

#### 4.4.1 固有角色判定

固有角色由组织结构决定，存储在用户表中，登录时一次性获取：

| 判定来源 | 角色 | 说明 |
|---------|------|------|
| 用户表.inherentRole | secretary | 党支书 |
| 用户表.inherentRole | org-commissioner | 组织委员 |
| 用户表.inherentRole | prop-commissioner | 宣传委员 |
| 用户表.inherentRole | disc-commissioner | 纪检委员 |
| 用户表.inherentRole | leader | 党小组组长 |
| 用户表.inherentRole | member | 普通成员（默认） |

#### 4.4.2 动态角色判定

动态角色由赋权记录决定，登录时从赋权记录表查询：

```
查询条件：userId = 当前用户 AND (endDate IS NULL OR endDate > NOW())
结果：[{ role: 'organizer', scope: 'activity', sourceId: 'act-10' }, ...]
```

#### 4.4.3 默认站位确定

```
if (inherentRole === 'member' && dynamicRoles.length === 0) {
  stance = null;  // 无站位，进入成员只读面板
} else if (inherentRole !== 'member') {
  stance = inherentRole;  // 固有角色优先
} else {
  stance = dynamicRoles[0].role;  // 仅动态角色时取第一个
}
```

#### 4.4.4 角色变更通知

| 变更场景 | 通知方式 | 前端处理 |
|---------|---------|---------|
| 新赋权 | WebSocket 推送 / 下次页面加载时查询 | 更新 AuthStore，刷新侧边栏 |
| 赋权撤销 | 同上 | 更新 AuthStore，若当前视图不可用则回退 |
| 固有角色变更（换届） | 管理员手动更新用户表 | 下次登录生效 |

### 4.5 党建与党务赋权冲突解决方案

#### 4.5.1 问题重述

组织委员和党小组组长都可赋权组织者/深度参与者，但赋权分类不同：
- 党小组组长赋权 → 活动（organizer/deep 的权限仅限于党小组组长创建的活动）
- 组织委员赋权 → 专班（organizer/deep 的权限仅限于组织委员管理的专班）

当前 auth.js 的 AUTHZ_CHAIN 中，`org-commissioner` 和 `leader` 都包含 `organizer/deep`，但无法区分两者。

#### 4.5.2 解决方案：赋权记录分类标记

auth.js 已有 `scope: 'activity' | 'taskforce'` 字段（代码注释中提及），但文档未同步。正式规范如下：

```javascript
// 赋权记录结构
{
  id: 'authz-001',
  fromPerson: 'p1',        // 赋权者
  toPerson: 'p5',          // 被赋权者
  role: 'organizer',       // 授予的角色
  scope: 'activity',       // 分类标记：'activity' | 'taskforce'
  sourceId: 'act-10',      // 来源ID：活动ID或专班ID
  sourceName: '五四主题党日', // 来源名称
  assignedAt: '2026-05-01',
  endDate: null,           // null表示永久有效
}
```

#### 4.5.3 分类隔离规则

| 规则 | 说明 |
|------|------|
| 活动赋权仅影响党建工作台 | 被赋权为活动组织者 → 仅在党建工作台可见组织者视图 |
| 专班赋权影响党建与党务 | 被赋权为专班组织者 → 党建工作台和党务管理均可见组织者视图 |
| 跨类别视图需显式切换 | 用户同时有活动和专班赋权时，侧边栏显示两个视图选项，需手动切换 |
| 分类标记不可省略 | 所有赋权记录必须有 scope 字段，默认值由赋权者的固有角色决定（党小组组长→activity，组织委员→taskforce） |

#### 4.5.4 权限判定流程

```
1. 用户登录 → 获取固有角色 + 动态角色列表（含分类标记）
2. 进入页面 → 根据 module 筛选有效动态角色
   - workspace 页面：activity + taskforce 均有效
   - party 页面：仅 taskforce 有效
3. 站位确定 → 固有角色优先
4. 视图范围 → 固有角色可看视图 + 筛选后的动态角色可看视图
5. 模式推导 → deriveMode(stance, view) 不变
```

### 4.6 权限执行规范

#### 4.6.1 前端权限检查策略

两层权限检查机制：

- **UI元素显隐**（第一层）：无权限的按钮/菜单不渲染（而非禁用灰色）；判断依据 `AuthStore.canManage()` / `canWriteActivity()` / `canRecruitTaskForce()` / `canAuthorize()`；实现于各 entry JS 渲染函数
- **操作拦截**（第二层）：操作执行前再次校验权限，防止通过控制台绕过 UI 限制；实现于各 service JS 写入函数

#### 4.6.2 权限检查函数清单

| 函数 | 位置 | 判定逻辑 | 使用场景 |
|------|------|---------|---------|
| canManage(module) | auth.js | stance === 'secretary' \|\| stance === module对应的委员 | 判断是否为管理模式 |
| canWriteActivity() | auth.js | inherentRole ∈ {secretary, leader} \|\| dynamicRoles含organizer | 判断能否创建/编辑活动 |
| canRecruitTaskForce() | auth.js | inherentRole === 'org-commissioner' | 判断能否管理专班 |
| canAuthorize() | auth.js | inherentRole ∈ {org-commissioner, leader} | 判断能否赋权 |
| deriveMode(stance, view) | auth.js | 三分类推导规则 | 判断视图模式 |

#### 4.6.3 权限缓存策略

| 维度 | 规范 |
|------|------|
| 缓存位置 | AuthStore（内存） + sessionStorage（持久化） |
| 缓存时机 | 登录成功后一次性加载，角色切换时更新 |
| 刷新时机 | 页面刷新时从 sessionStorage 恢复；赋权/撤销时通过事件通知更新 |
| 缓存失效 | 登出时清除；sessionStorage 关闭标签页时自动清除 |

#### 4.6.4 权限检查失败处理与跨模块一致性

| 场景 | 处理方式 |
|------|---------|
| 无权限访问页面 | 重定向到角色对应的默认页面 |
| 无权限执行操作 | 显示 toast 提示"您没有执行此操作的权限" |
| 角色被撤销后操作 | 提示"您的角色已变更，请刷新页面"，自动刷新 |
| 跨类别操作 | 提示"此操作需要对应分类权限" |
| 跨模块操作 | 同一 AuthStore 管理权限；模块切换时重新推导（stance 不变，view 随模块变化）；需重新校验目标模块权限 |

---

## 五、品牌属性标签设计

> **定位**：品牌是活动的**属性标签**，不是独立活动类型，不改变活动本身的数据结构和工作流。品牌认定在系统上由书记操作。品牌活动如需独立展示系统页面，将来可探索。

### 5.1 核心定义

品牌活动是支部长期培育、持续迭代的**动态工作项目**，非一次性事件。

#### 5.1.1 四属性

| 属性 | 说明 |
|------|------|
| 持续性 [工作表达] | 跨学期/年度运营，非单次收场 |
| 成长性 [工作表达] | 萌芽 → 培育 → 成熟 → 标杆 四阶段 |
| 迭代性 [工作表达] | 执行 → 复盘 → 优化 → 再执行 |
| 体系性 [工作表达] | 方法论 + 资源库 + 人才梯队 |

#### 5.1.2 品牌 = 活动的属性标签

品牌不是独立实体，也不是活动的子类型，而是活动的属性标签。这意味着：

- **数据结构**：品牌标签复用现有 ActivityRecord 数据结构，仅增加一个 `isBrand: boolean` 字段
- **工作流**：品牌标签不影响工作流选择，品牌活动按其原有场景流程执行
- **赋权逻辑**：品牌活动的赋权与普通活动一致，无需额外处理
- **视图逻辑**：品牌活动在现有视图中通过筛选条件展示，无需独立页面
- **品牌认定**：由书记在系统上操作标记，A/B 均可（书记审批或支委会讨论后书记标记）

**为什么不是独立实体？** 优先考虑简单模式——品牌活动本质上是"被认定的活动"，它首先是活动，其次才是品牌。独立实体会引入新的数据模型和 CRUD 流程，增加系统复杂度，而属性标签模式足以满足当前需求。如果品牌活动需要建设额外的展示系统页面（独立系统页面），将来可以探索。

#### 5.1.3 品牌认定流程

品牌认定是**直接认定**，不是评分算法。支部根据活动的持续性、影响力、培育价值直接判断是否列入品牌活动。

| 步骤 | 操作者 | 操作 |
|------|--------|------|
| 1. 培育观察 | 支委/党小组组长 | 识别有品牌潜力的活动 |
| 2. 讨论认定 | 支委会 | 讨论是否列入品牌 |
| 3. 系统标记 | 书记 | 在系统上操作标记 `isBrand = true` |

### 5.2 典型锚点案例

**案例一：宣讲团**

对外输出型，培育路径为自组织萌芽 → 支委识别价值 → 给予资源扶持，核心特征是从零搭建、持续壮大、对外展示、可复制推广。

**案例二：人生回望录**

内容生产型，培育路径为个人发起 → 团队扩展 → 制度化运营，核心特征是老教授深度访谈、跨学期滚动播出、形成内容资产库。

### 5.3 与决策树模型的关系

在活动决策树模型中，品牌不是 L1~L4 的任何一层，也不是独立的分类维度，而是活动的属性标签——品牌认定不再是活动的"属性维度"，而是活动发展到一定阶段后的"认定"。

**结论**：品牌不是活动的起点而是结果，作为属性标签不影响工作流选择，仅在归档与展示层面提供制度支持。

### 5.4 未来探索方向

品牌活动如需独立展示系统页面（如品牌活动专区、品牌故事页面、Canvas 分享卡片），将来可探索。当前阶段，品牌活动通过标签筛选在现有视图中展示即可。

---

## 六、前端数据流

### 6.1 状态管理 (core/state.js)

**架构模式：** 单向数据流 + Immutable State + 渲染回调注册

```
                        用户操作
                           │
                           ▼
                    setState(patch)
                           │
                     ┌─────┴─────┐
                     │ 推导逻辑   │
                     │ selectedRole
                     │   → viewType
                     │   → role    │
                     └─────┬─────┘
                           │
                    appState = { ...old, ...patch }
                           │
                           ▼
                    _onStateChange(appState)
                    (由 entries/main-entry.js 注册的 renderUI)
                           │
                           ▼
                      全量重新渲染
```

**关键机制：**

- `registerRenderCallback(fn)` 打破循环依赖：state.js 不直接 import main.js，而是由 main.js 在初始化时注册渲染回调
- `setState` 采用 Immutable 展开符替换，禁止原地修改
- 当 `selectedRole` 变化时，自动推导 `viewType`（通过 `getViewTypeByRole`）和 `role`（通过 `getReferenceRoleBySelectedRole`）
- 不支持局部状态订阅，全量重新渲染

**视图类型推导规则** (`getViewTypeByRole`):

| 输入 selectedRole | 输出 viewType |
|---|---|
| null / `participant` | `'participant'` |
| leader / org-commissioner / prop-commissioner / disc-commissioner / organizer / deep / secretary | `'manager'` |
| `global` | `'global'` |

### 6.2 localStorage 持久化

> **统一全量键架构**：所有业务数据通过单一全量键 `workflowos_branch_db_v1` 持久化，消除双重存储与同步断裂风险。

#### 6.2.1 业务数据全量键

| 键名 | 存储内容 | 格式 | 读写位置 |
|---|---|---|---|
| `workflowos_branch_db_v1` | 完整 mockDB 状态（全量序列化） | JSON | [services/mock.js](../../docs/src/services/mock.js#L29) |

**全量键字段清单**（`saveDB()` 序列化的完整字段）：

| 字段 | 类型 | 说明 |
|---|---|---|
| `_schema` | number | Schema 版本号，当前值为 1 |
| `users` | User[] | 静态预设用户（持久化但不从存储恢复，避免运行时污染） |
| `activities` | ActivityRecord[] | 活动记录 |
| `tasks` | Task[] | 任务记录 |
| `attendances` | AttendanceRecord[] | 考勤记录 |
| `deliverables` | ~~Deliverable[]~~ | ~~交付物记录（已废弃，由 FileSpaceRecord 覆盖）~~ |
| `inspections` | InspectionRecord[] | 考察记录 |
| `assignments` | AssignmentRecord[] | 分工记录 |
| `handovers` | HandoverRecord[] | 交接记录 |
| `makeupTasks` | MakeupTask[] | 补课任务 |
| `actSubRecords` | Object | 活动子记录（按活动 ID 索引） |
| `tfSubRecords` | Object | 专班子记录（按专班 ID 索引） |
| `complianceReferences` | ComplianceReference[] | 制度文件引用 |
| `fileSpaceRecords` | FileSpaceRecord[] | 文件空间记录 |
| `experienceDeposits` | ExperienceDeposit[] | 经验沉淀记录 |
| `taskforces` | TaskForceRecord[] | 专班记录 |
| `notices` | Notice[] | 通知记录 |

#### 6.2.2 UI 状态独立键

> 以下键存储 UI/会话状态，不属于业务数据，保持独立键存储。

| 键名 | 存储内容 | 格式 | 读写位置 |
|---|---|---|---|
| `gsm1921-auth-records` | 认证记录 | JSON | [services/auth.js](../../docs/src/services/auth.js) |
| `gsm1921-view-mode` | 视图模式 | string | [services/auth.js](../../docs/src/services/auth.js) |
| `gsm1921-primary-role` | 主角色 | string | [services/auth.js](../../docs/src/services/auth.js) |
| `gsm1921-auth-grants` | 赋权授权记录 | JSON | [services/auth.js](../../docs/src/services/auth.js) |
| `sop_org_os_assigned_roles` | 赋权角色列表 | JSON: `Array<{name, role, activity}>` | [services/roles.js](../../docs/src/services/roles.js) |
| `gsm1921-feedback-submissions` | 反馈提交记录 | JSON | [services/feedback.js](../../docs/src/services/feedback.js) |
| `sop_org_os_session` | 跨页面会话状态 | JSON | [core/cross-page-state.js](../../docs/src/core/cross-page-state.js) |
| `sop_org_os_data_version` | 数据版本号（跨页面同步） | number | [core/cross-page-state.js](../../docs/src/core/cross-page-state.js) |

**持久化机制细节：**

- `workflowos_branch_db_v1`：当前 `SANDBOX_MODE = true`，每次刷新清空持久化存储，使用初始 mock 数据。设为 `false` 可恢复跨刷新持久化
- Schema 版本校验：loadDB 会检查 `_schema` 与当前 `SCHEMA_VERSION`（值为 1）是否匹配，不匹配则拒绝加载脏数据
- 写入策略：所有 CRUD 操作在操作成功后调用 `saveDB()`，将 mockDB 全量序列化到单一键，保证数据一致性
- SANDBOX 清理：`loadDB()` 在 SANDBOX 模式下不仅清理全量键，还清理旧版独立键（兼容性清理），确保无残留
- 容错：JSON 解析失败 / quota exceeded 均静默处理，不中断用户操作

### 6.3 数据写入模式

> 实现细节见 `docs/src/` 对应文件（`services/mock.js`、`core/state.js`、`entries/main-entry.js`）。
> 写入数据验证设计见 §2.17。
