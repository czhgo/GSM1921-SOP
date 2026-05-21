---
role: "[人机]"
last_updated: "2026-05-20"
---

# 数据架构与权限模型

> 本文档定义 Org OS 项目中所有数据分类、字段规范、前后端交互机制与权限控制策略。
> 定位：[人机] -- 供开发决策参考，确保数据结构变更时全栈一致。

## 一、数据分类总览

| 数据类别 | 存储位置 | 生命周期 | 说明 |
|---|---|---|---|
| 活动记录 (Activity) | mockDB.activities + localStorage `workflowos_branch_db_v1` | 创建->活跃->归档(软删除) | 核心业务实体，所有流程围绕活动展开 |
| 考勤记录 (AttendanceRecord) | mockDB.attendances + localStorage | 随活动创建->随活动归档 | 纪检委员写入，全员可读 |
| 交付物 (Deliverable) | mockDB.deliverables + localStorage | 随活动创建->待提交->已提交->已归档 | 宣传委员/纪检委员/党小组组长产出 |
| 任务 (Task) | mockDB.tasks + localStorage | 随活动创建->待办->进行中->已完成 | 活动子任务，由 SOP 模板生成 |
| SOP 场景模板 (Scenario) | sopData.js (静态代码) | 静态，代码级维护 | 12 个内置场景，驱动任务生成和工作流 |
| 工作流定义 (Definition) | definitions.js (静态代码) | 静态，代码级维护 | 5 套状态机模板，驱动活动流转 |
| 应用状态 (appState) | core/state.js (内存) | 页面生命周期内 | UI 视图状态，不持久化 |
| 用户/角色预设 (users) | mockDB.users (内存) | 静态预设 | 3 个内置用户（书记/组织委员/党小组长） |
| 赋权记录 (assignedRoles) | localStorage `sop_org_os_assigned_roles` | 跨会话持久化 | 书记赋权给组织者/深度参与者的记录 |
| 角色常量 (ROLE_LABELS/COLORS) | core/constants.js (静态代码) | 静态，代码级维护 | 9 种角色的中文标签与视觉配色 |

## 二、各类数据详细规范

### 2.1 活动数据 (ActivityRecord)

> 类型定义位于 [domain.js](file:///d:/GitHub/GSM1921-SOP/docs/src/core/domain.js#L12-L32)

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
| deliverableIds | string[] | 否 | -- | 关联交付物 ID 列表 |
| isBrand | boolean | 否 | `false` | 品牌活动标记（由书记操作认定） |

**活动状态枚举：**

| 状态值 | 含义 | 说明 |
|---|---|---|
| `draft` | 草稿 | 可编辑，尚未发布 |
| `published` | 已发布 | 已通知相关人员 |
| `ongoing` | 进行中 | 活动正在执行 |
| `completed` | 已完成 | 活动结束，待复核/归档 |

### 2.1B 子记录关联结构 (SubRecord)

> 来源：CLAUDE.md H8.2 — 差异化视图设计规范之子记录关联结构。
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
| `attendance` | 考勤子记录 | 出勤记录列表 | AttendanceRecord（见 2.4 节） | 纪检委员 |
| `materials` | 材料子记录 | 交付物列表 | Deliverable（见 2.5 节） | 深度参与者（组织者打包提交）；实现层暂为党小组组长/宣传委员 |
| `publicity` | 宣传子记录 | 宣传素材列表 | Deliverable（type=propaganda） | 宣传委员 |

**子记录关键规则：**

| 规则 | 说明 | 实现要求 |
|---|---|---|
| **自增表格** | 每种子记录类型支持动态添加行（"+ 添加考勤"/"+ 添加材料"/"+ 添加宣传"） | UI 层提供行级增删操作，数据层支持 items 数组动态 push/splice |
| **统一绑定** | 所有子记录通过 `parentId` 绑定到主记录 `id` | 子记录必须包含 `parentId` 字段（对应实现层 `activityId`），查询时按此字段过滤 |
| **权限继承** | 子记录的操作权限继承自主记录的当前管理者角色 | 子记录不单独设权限，由主记录的 `can()` 结果决定读写权限（见 4.1 节角色权限矩阵） |

**子记录与现有数据的关系：**

- `attendance` 子记录 → 对应 `mockDB.attendances` 中 `activityId` 匹配的 AttendanceRecord 集合
- `materials` 子记录 → 对应 `mockDB.deliverables` 中 `activityId` 匹配且 type 非 `propaganda` 的 Deliverable 集合
- `publicity` 子记录 → 对应 `mockDB.deliverables` 中 `activityId` 匹配且 type=`propaganda` 的 Deliverable 集合
- 主记录的 `deliverableIds` 字段为材料+宣传子记录的 ID 索引快捷方式

### 2.2 角色与权限数据

> 角色类型定义位于 [core/state.js](file:///d:/GitHub/GSM1921-SOP/docs/src/core/state.js#L18-L28)，标签/颜色位于 [core/constants.js](file:///d:/GitHub/GSM1921-SOP/docs/src/core/constants.js)

| 角色键 | 中文标签 | 视图类型 | 所属分类 |
|---|---|---|---|
| `participant` | 默认参与者 | participant | 参与层 |
| `leader` | 党小组组长 | manager | 管理视图 |
| `org-commissioner` | 组织委员 | manager | 条条支委 |
| `prop-commissioner` | 宣传委员 | manager | 条条支委 |
| `disc-commissioner` | 纪检委员 | manager | 条条支委 |
| `organizer` | 组织者 | manager | 管理视图 |
| `deep` | 深度参与者 | manager | 管理视图 |
| `secretary` | 党支书 | manager | 管理视图 |
| `global` | 全局视图 | global | 参考指南专用 |
| `all` | 全体相关 | participant | 参考指南显示用 |

**管理角色集合** (`MANAGEMENT_ROLES`): `leader`, `org-commissioner`, `prop-commissioner`, `disc-commissioner`, `organizer`, `deep`, `secretary`

**支委角色集合** (`COMMISSIONER_ROLES`): `commissioner`, `org-commissioner`, `prop-commissioner`, `disc-commissioner`

### 2.3 专班数据 (TaskForceRecord)

> 专班管理位于组织委员面板，通过赋权记录间接体现。赋权记录持久化于 localStorage。

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

### 2.3B 系列活动数据 (SeriesRecord)

> 2026-05-06 新增模型。长期活动/系列活动 = 时间维度的重复模式，≠ 专班（人员维度的组织结构）。

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

### 2.4 考勤数据 (AttendanceRecord)

> 类型定义位于 [domain.js](file:///d:/GitHub/GSM1921-SOP/docs/src/core/domain.js#L34-L45)

| 字段名 | 类型 | 必填 | 默认值 | 说明 |
|---|---|---|---|---|
| id | string | 是 | `generateId()` | 唯一标识符 |
| activityId | string | 是 | -- | 所属活动 ID |
| userId | string | 是 | -- | 参会成员用户 ID |
| status | `'present'\|'absent'\|'leave'` | 是 | -- | 出勤状态（出席/缺席/请假） |
| recordedBy | string | 是 | -- | 记录人用户 ID（纪检委员） |
| recordedAt | string (ISO) | 是 | -- | 记录时间 |
| studentId | string | 否 | -- | 学号 |
| developStage | `'party_member'\|'probationary'\|'activist'\|'candidate'` | 否 | -- | 发展阶段 |
| partyGroup | string | 否 | -- | 所属党小组 |

**出勤状态枚举：**

| 值 | 中文 | 说明 |
|---|---|---|
| `present` | 出席 | 按时到场 |
| `absent` | 缺席 | 未到场（触发补课机制，T+7 内完成） |
| `leave` | 请假 | 事假须提前1天申请；病假可事后补假 |

**发展阶段枚举：**

| 值 | 中文 |
|---|---|
| `party_member` | 正式党员 |
| `probationary` | 预备党员 |
| `activist` | 积极分子 |
| `candidate` | 发展对象 |

### 2.5 交付物数据 (Deliverable)

> 类型定义位于 [domain.js](file:///d:/GitHub/GSM1921-SOP/docs/src/core/domain.js#L48-L57)

| 字段名 | 类型 | 必填 | 默认值 | 说明 |
|---|---|---|---|---|
| id | string | 是 | `generateId('dlv')` | 唯一标识符，前缀 `dlv_` |
| activityId | string | 是 | -- | 所属活动 ID |
| type | `'photography_draft'\|'attendance_summary'\|'meeting_record'\|'propaganda'\|'check_material'` | 是 | -- | 交付物类型 |
| owner | string | 是 | -- | 责任角色标识符 |
| ownerName | string | 否 | -- | 责任角色中文描述 |
| status | `'pending'\|'submitted'\|'archived'` | 是 | `'pending'` | 交付物状态 |
| submittedAt | string (ISO) | 否 | -- | 提交时间 |
| note | string | 否 | -- | 备注说明 |

**交付物类型枚举：**

| 值 | 中文 | 产出人 |
|---|---|---|
| `photography_draft` | 宣传底稿 | 党小组组长 (leader) |
| `attendance_summary` | 考勤汇总表 | 纪检委员 (disc-commissioner) |
| `meeting_record` | 组织生活会记录 | 党小组组长 (leader) |
| `propaganda` | 宣传推文 | 宣传委员 (prop-commissioner) |
| `check_material` | 对照检查材料 | 骨干同志 |

### 2.6 任务数据 (Task)

> 类型定义位于 [domain.js](file:///d:/GitHub/GSM1921-SOP/docs/src/core/domain.js#L59-L66)

| 字段名 | 类型 | 必填 | 默认值 | 说明 |
|---|---|---|---|---|
| id | string | 是 | `generateId('tsk')` | 唯一标识符，前缀 `tsk_` |
| activityId | string | 是 | -- | 所属活动 ID |
| title | string | 是 | -- | 任务标题 |
| status | `'pending'\|'in_progress'\|'completed'` | 是 | `'pending'` | 任务状态 |
| createdAt | string (ISO) | 是 | `new Date().toISOString()` | 创建时间（审计字段） |

### 2.7 应用状态数据 (appState)

> 定义位于 [core/state.js](file:///d:/GitHub/GSM1921-SOP/docs/src/core/state.js#L126-L146)

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

### 2.8 SOP 场景模板 (Scenario)

> 定义位于 [sopData.js](file:///d:/GitHub/GSM1921-SOP/docs/src/workflow/sopData.js)

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
| `brand-activity` | 党小组品牌党建工作 | activity | 主题党日子类 |
| `new-system` | 制度制定与迭代 | organization | -- |
| `develop-activist` | 考察积极分子 | organization | -- |
| `info-platform` | 信息平台支持 | organization | -- |
| `attendance-check` | 查考勤记录 | organization | -- |
| `feedback-handling` | 处理意见建议反馈 | organization | -- |

### 2.9 工作流定义 (Definition)

> 定义位于 [definitions.js](file:///d:/GitHub/GSM1921-SOP/docs/src/workflow/definitions.js)

**通用状态节点：**

| 状态名 | 中文标签 | 所属阶段 | 可编辑 | 超时(h) |
|---|---|---|---|---|
| DRAFT | 草稿 | 策划 | 是 | 168 (短期) / 336 (长期) |
| PENDING_LEADER | 待组长审批 | 审批 | 否 | 48 (短期) / 96 (长期) |
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

**品牌活动专用状态（本轮搁置）：**

| 状态名 | 中文标签 | 说明 |
|---|---|---|
| POSITIONING | 定位设计 | 品牌定位与方案设计 |
| PROTOTYPE | 试点实施 | 小范围试点 |
| ITERATING | 迭代优化 | 持续改进 |
| ESTABLISHED | 成熟运营 | 稳定运行 |
| CERTIFICATION_PENDING | 待认证 | 申请品牌认证 |
| CERTIFIED | 已认证 | 通过认证 |

**活动三维度分类：**

| 维度 | 值 | 说明 |
|---|---|---|
| duration | `short-term` | 一次性完成（参访、线下学习等） |
| duration | `long-term` | 长期打磨/多小组同步推进 |
| brand | `true` | 品牌活动（本轮搁置） |
| brand | `false` | 普通日常活动 |
| direction | `bottom-up` | 自下而上：党小组/成员自发创造性活动 |
| direction | `top-down` | 自上而下：支委/书记布置的任务 |
| direction | `either` | 两种发起方式均可 |

**5 套工作流定义模板：**

| 定义 ID | 标题 | duration | brand | 状态数 | 状态 |
|---|---|---|---|---|---|
| `theme-party-day` | 主题党日活动 | short-term | false | 7 | active |
| `short-term` | 短期活动 | short-term | false | 7 | active |
| `long-term` | 长期活动 | long-term | false | 9 | active |
| `short-term-brand` | 短期品牌活动 | short-term | true | 9 | suspended |
| `long-term-brand` | 长期品牌活动 | long-term | true | 9 | suspended |

---

## 三、前端数据流

### 3.1 状态管理 (core/state.js)

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

### 3.2 localStorage 持久化

| 键名 | 存储内容 | 格式 | 读写位置 |
|---|---|---|---|
| `workflowos_branch_db_v1` | 完整 mockDB 状态 | JSON: `{ _schema, users, activities, tasks, attendances, deliverables }` | [services/mock.js](file:///d:/GitHub/GSM1921-SOP/docs/src/services/mock.js#L14) |
| `sop_org_os_assigned_roles` | 赋权记录列表 | JSON: `Array<{name, role, activity}>` | 已整合至各 entry 文件 |

**持久化机制细节：**

- `workflowos_branch_db_v1`：当前 `SANDBOX_MODE = true`，每次刷新清空持久化存储，使用初始 mock 数据。设为 `false` 可恢复跨刷新持久化
- Schema 版本校验：loadDB 会检查 `_schema` 与当前 `SCHEMA_VERSION`（值为 1）是否匹配，不匹配则拒绝加载脏数据
- 写入策略：所有 CRUD 操作（createActivity/updateActivity/deleteActivity/archiveActivity/createTask/createDeliverable 等）在操作成功后调用 `saveDB()` 同步写入 localStorage
- 容错：JSON 解析失败 / quota exceeded 均静默处理，不中断用户操作

### 3.3 数据写入模式（党建工作台 -> ActivityRecord）

**创建活动全链路：**

```
[党建工作台 UI]
  │  用户填写：T-0日期、组织场景、活动名称、活动形式、时长、发起方向
  │  选填：组织者、深度参与者
  │
  ▼
[gen-schedule-cal-btn 点击]
  │  events.js: _handleGenSchedule()
  │
  ├─► 构造 Activity payload
  │     title, type, status='draft', visibility='group',
  │     date, executor, supervisor, createdBy, domain,
  │     scenarioId, targetDate, description
  │
  ├─► service.mock.createActivity(data)
  │     → 生成 id (generateId('act'))
  │     → Immutable push 到 mockDB.activities
  │     → saveDB() 持久化
  │
  ├─► 根据 scenarioId 匹配 sopDatabase 模板
  │     → 按模板 tasks 数组逐个 createTask()
  │     → 每个 Task: id (generateId('tsk')), activityId, title, status='pending'
  │
  ├─► 组织生活会特殊处理：
  │     → seedOrgLifeDeliverables(activityId)
  │     → 创建两件必交交付物（考勤汇总表 + 组织生活会记录）
  │
  ├─► setState({ status: STATE.SUCCESS })
  │     → _onStateChange → renderUI 全量刷新
  │
  └─► UI 层：日历重新渲染，活动出现在列表中
```

**任务状态更新链路：**

```
[inspector 面板任务卡片点击]
  │
  ▼
updateTask(taskId, patch)   (同步函数，无延迟)
  │
  ├─► Immutable patch mockDB.tasks
  │
  └─► 返回新 tasks 数组，UI 即时响应（无需异步等待）
```

**归档链路：**

```
[归档操作触发]
  │
  ▼
archiveActivity(id)
  │
  ├─► 活动 archived = true (软删除)
  │
  ├─► 级联：所有关联 Task status → 'completed'
  │
  └─► saveDB() 持久化
```

---

## 四、后端权限模型

### 4.1 角色权限矩阵

> 基础 ACL 实现位于 [domain.js `can()`](file:///d:/GitHub/GSM1921-SOP/docs/src/core/domain.js#L78-L91)

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

**宣传委员活动视图同步规则**：宣传委员不可创建活动（仅党支书和党小组组长可创建），但任何活动创建后应自动出现在宣传委员的视图中，确保宣传委员版面及时同步，不因无创建权限而遗漏活动信息。

**ACL 基础规则** (`can()` 函数):

| 角色 | 允许的操作 |
|---|---|
| `secretary` | read, write, delete, admin |
| `commissioner` (泛支委) | read, write（职能域写入，不含创建活动） |
| `leader` | read, write（含创建活动） |
| `member` | read |

**特殊资源 `evaluation`（考察档案）**: 仅 `secretary` 和 `org-commissioner` 可读写，其他角色绝对隔离。

### 4.2 模块权限

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
| party 子: 组织委员面板 | org-commissioner | `data-commissioner="organizer"` | 专班管理、追踪看板、材料催缴、思想汇报、合规文件 |
| party 子: 宣传委员面板 | prop-commissioner | `data-commissioner="publicity"` | 活动日历、档案归档、材料标准、周报报送 |
| **search** (资料查询) | 所有角色 | `"search"` (始终可见) | 参考资料、网站群、工作流参考指南 |

**支委身份选择流程：**

1. 用户点击 sidebar 中的 "条条支委" 角色卡片
2. 弹出支委身份选择模态框 (`#commissioner-modal`)
3. 用户选择具体支委身份：组织委员 / 宣传委员 / 纪检委员
4. `setState({ selectedRole: 'org-commissioner'|'prop-commissioner'|'disc-commissioner' })`
5. 党务管理面板根据 `selectedRole` 显示对应支委面板

### 4.3 数据共享规则

**纪检 <-> 组织委员 共享考勤数据：**

- **同源存储**: 考勤数据统一存储在 `mockDB.attendances`，纪检委员是唯一写入方
- **读取权限**: 组织委员可读取全部考勤记录用于 "人的管理"
- **考察档案隔离**: 组织委员的 "考察档案" (`resource='evaluation'`) 对纪检委员不可见（`can('disc-commissioner', 'read', 'evaluation') === false`）

**组织委员 <-> 宣传委员 专班协调流：**

- **工作域分离**: 组织委员管 "党建工作域（专班统筹）"，宣传委员管 "事件管理（党建）+ 制度建设（党务）"
- **专班招募协调**: 宣传委员招募专班成员须通过组织委员协调（界面提示："宣传专班招募须通过组织委员协调"）
- **档案流通**: 宣传委员归档后，组织委员可从考勤/活动参与角度查阅

**书记独占能力：**

- **党课布置** (`#btn-party-lecture`): 仅 secretary 可见，对应 scenarioId=`party-lecture`
- **主持大会** (`#btn-host-congress`): 仅 secretary 可见
- **全局视角切换** (`#secretary-view-proxy`): 书记可以组织委员/宣传委员/纪检委员/党小组1组长/党小组2组长/党小组3组长/深度参与者/普通参与者视角查看系统
- **赋权管理** (`#assign-modal`): 书记可赋予同志组织者或深度参与者权限

---

## 五、动态角色上下文

> 定义位于 [core/state.js](file:///d:/GitHub/GSM1921-SOP/docs/src/core/state.js#L32-L37)

本系统区分两种角色模型：**用户角色**（控制 Web UI 视图）和**动态文件角色**（控制 AI/人机 协作边界）。

| 上下文 | 角色 | 触发条件 |
|---|---|---|
| SNAPSHOT.md 活跃状态 | `[AI]` | SNAPSHOT.md 中 status="ACTIVE" 时 AI 可读写 |
| SNAPSHOT.md 归档状态 | `[人机]` | SNAPSHOT.md 归档后人类可查 |
| TIMESTAMPS.md 自动更新 | `[AI]` | 周期性任务自动更新时 |
| TIMESTAMPS.md 人工维护 | `[人机]` | 人工维护时 |

**AI 可修改文件白名单：**

| 路径模式 | 说明 |
|---|---|
| `.ctx/TIMESTAMPS.md` | 时间戳记录 |
| `.ctx/CONTEXT.md` | 上下文文件 |
| `.ctx/SNAPSHOT.md` | 快照文件 |
| `.ctx/logs/` | 日志目录 |

---

## 六、附录：HTML data-* 属性速查表

| 属性 | 取值示例 | 用途 |
|---|---|---|
| `data-module` | `dashboard` / `calendar` / `party` / `search` | 模块切换导航 |
| `data-role` | `leader` / `commissioner-group` / `organizer` / `deep` / `secretary` / `archived` / `org-commissioner` / `prop-commissioner` / `disc-commissioner` | 角色选择卡片 |
| `data-modules` | `"calendar,party"` / `"calendar"` | 控制角色卡片在哪些模块下可见 |
| `data-subtab` | `makeup` / `mailbox` / `participation` / `review-supervision` / ... | 支委面板子标签切换 |
| `data-subtab-content` | 同上 | 对应子标签内容区 |
| `data-commissioner` | `inspector` / `organizer` / `publicity` / `default` | 标识支委面板类型 |
| `data-nav` | `party` / `calendar` | 页面内导航跳转 |
| `data-cat` | `all` / `system` / `party-doc` / `tools` / `external` | 资料查询分类筛选 |
