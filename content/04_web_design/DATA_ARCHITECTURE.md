---
title: "数据架构设计"
type: design
role: "[工程师]+[AI]"
version: "4.0"
last_updated: "2026-08-10"
status: active
merged_from: [content/design/DATA.md, content/design/PARTICIPANT_DATAFLOW.md, content/design/LOGIN_SYSTEM_DESIGN.md, content/design/BRAND_ACTIVITY.md]
related_files: [content/02_institution/ROLE_CLASSIFICATION.md, content/02_institution/COMMISSIONER_FRAMEWORK.md, content/04_web_design/MODULE_UI_DESIGN.md, content/04_web_design/DESIGN_SYSTEM.md]
---

# 数据架构设计

> **定位：** 本文档是系统数据架构设计的单一权威源，涵盖静态数据模型、动态数据流、品牌属性标签设计。所有数据结构变更以本文档为准。
> **受众：** [工程师]+[AI] —— 供开发决策参考，确保数据结构变更时全栈一致。
> **权限矩阵**：本文档含权限简表，完整定义见 [ROLE_CLASSIFICATION.md](../02_institution/ROLE_CLASSIFICATION.md) §九 角色权限矩阵。

---

## 一、数据架构总览

### 1.1 数据类型设计原则

> 数据类型设计优先于权限设计：先定义"有什么数据、数据如何分类、字段如何规范"，再定义"谁能读写这些数据"。权限是数据之上的切面，不是数据本身。

四条设计原则：数据类型与字段规范优先（工作流、视图、权限均依赖数据结构定义）；每种数据类型在本文档有唯一定义（见 CLAUDE.md H2.2 母本子本关系）；业务数据/静态代码/内存状态/UI 会话状态分层管理；每条写入操作须在查看端可验证（见 §2.17）。

### 1.2 数据分类总览

| 数据类别 | 存储位置 | 生命周期 | 说明 |
|---|---|---|---|
| 活动记录 (Activity) | mockDB.activities + localStorage `workflowos_branch_db_v1` | 创建->活跃->归档(软删除) | 核心业务实体，所有流程围绕活动展开 |
| 考勤记录 (AttendanceRecord) | mockDB.attendances + localStorage | 随活动创建->随活动归档 | 纪检委员写入，全员可读 |
| 分工记录 (AssignmentRecord) | mockDB.assignments + localStorage | 随活动创建->待办->进行中->已完成 | 组织者创建分工，深度参与者执行 |
| 补课任务 (MakeupTask) | mockDB.makeupTasks + localStorage | 缺勤触发->待补课->已完成 | 纪检委员创建，缺勤者执行补课 |
| 通知 (Notice) | mockDB.notices + localStorage | 创建->持久化 | 系统通知，按类型分级（含行动性通知派生待办机制，见 §2.19） |
| 待办任务 (Todo) | mockDB.todos + localStorage | 创建->pending->in_progress->completed/expired | 最小三成本原则落地——任务流默认直接展示在工作台（见 §2.18） |
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

### 1.3 端到端数据流交织图

> **设计原则（2026-08-05 书记强调）**：数据之间相互交织——同一条数据既**挂靠其产生的上下文**（如考勤是活动的副产物），又**聚合进入跨实体的总数据**（如考勤进入考勤考察总数据）。文档与功能层的表达必须体现这种交织关系，而非孤立的积木堆叠。

**主线一：活动上下文链**（活动是核心实体，一切流程围绕活动展开）

```
活动 Activity（创建 → 发布 → 进行 → 归档）
 ├─→ 任务 Task           ：SOP 场景模板生成活动子任务（§2.12）
 ├─→ 分工 Assignment     ：组织者创建、深度参与者执行（§2.6）
 ├─→ 考勤 Attendance    ：活动副产物，纪检委员写入（§2.5）
 ├─→ 考察 Inspection    ：活动执行记录，纪检确认（§3.3）
 └─→ 产出物 Output       ：按产出类型定向投递，去向由路由表派生（§2.7）
```

**主线二：副产物 → 总数据聚合**（副产物既挂靠来源，又汇入总表）

```
考勤（挂靠 activityId）
 ├─ 缺勤/请假 ──→ 补课任务 MakeupTask ──→ 补课完成 ──→ 考勤回写「已补」（§2.8）
 └─ 跨活动聚合 ──→ 考勤总表（纪检维护）──→ 个人/支部考勤统计

考察（挂靠 activityId / taskforceId）
 ├─ 纪检确认录入总表 ──→ 组织委员每月建档（考察档案）──→ 人才库/发展党员依据（§3.3）
 └─ 专班工作量汇总 ──→ 专班解散报告 ──→ 写入个人档案
```

**主线三：赋权 → 工作台 → 入档**

```
赋权记录 AuthRecord（书记赋权，§2.18）
 └─→ 项目角色（organizer/deep）工作台出现对应模块
      └─→ 工作量记录（专班/活动运行期）
           └─→ 专班解散 → 工作量汇总报告 → 写入个人档案
```

**交织关系要点**（挂靠 + 聚合双语义）：

| 数据 | 上下文挂靠（副产物） | 聚合去向（总数据） | 关键字段 |
|---|---|---|---|
| 考勤 | 活动 `activityId` | 考勤总表 → 个人考勤统计 | `activityId` |
| 考察 | 活动/专班 | 考察总表 → 组织委员建档 → 人才库 | `activityId`/`taskforceId` |
| 分工 | 活动/专班 | 分工汇总 → 工作量统计 | `assignmentId` |
| 补课 | 考勤（缺勤/请假触发） | 回写考勤「已补」 | `makeupTask`→考勤回写 |
| 任务 | 活动 | 完成状态汇总 → 活动进度 | `activityId` |

---

## 二、数据模型设计

### 2.1 活动数据 (ActivityRecord)

> 类型定义位于 [domain.js](../../docs/src/core/domain.js#L12-L32)

| 字段名 | 类型 | 必填 | 默认值 | 说明 |
|---|---|---|---|---|
| id | string | 是 | `generateId('act')` | 唯一标识符，前缀 `act_` |
| title | string | 是 | -- | 活动标题 |
| type | string | 是 | -- | 活动类型。类型体系（2026-08-07 归一，两大顶层非并列）：三会一课系 = 支部党员大会/支委会/党小组会/党课（组织生活会是**内容**而非子类，由三会之一召开，见 §2.1.2）；主题党日系 = `type='主题党日'` + 载体见 `carriers`。查询筛选按 `classifyActivityType` 级联展示 |
| status | `'draft'\|'published'\|'ongoing'\|'completed'` | 是 | `'draft'` | 活动存储状态；页面展示态由生命周期派生（见下方"活动生命周期展示态"） |
| visibility | `'branch'\|'group'` | 是 | `'group'` | 可见范围：全支部 or 党小组 |
| date | string (YYYY-MM-DD) | 是 | -- | 活动日期 ISO 字符串 |
| location | string\|null | 否 | null | 活动地点（线下活动场地/线上会议链接），用于活动详情与日历展示；可选字段，无则不显示地点 |
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
| isBrand | boolean | 否 | `false` | 品牌属性标签（由书记认定，不影响工作流选择，仅作筛选展示）。认定流程：支委/党小组组长识别潜力 → 支委会讨论 → 书记标记 `isBrand = true`。认定依据与案例见 [insights §5.2](../insights/党支部管理与实务经验沉淀.md)。 |
| carriers | string[] | 否 | -- | 主题党日活动载体（理论学习/实践参访/交流座谈/其他），与写入表单正交维度对齐（2026-08-07） |
| isJoint | boolean | 否 | `false` | 共建性质（共建开展为 true，2026-08-07） |
| brandName | string | 否 | -- | 品牌族名称（如"五四精神传承"/"人生回望录"），书记认定 isBrand 后由写入表单"延续已有品牌/创建新品牌"补录（2026-08-07） |

**活动存储状态：**

| 状态值 | 含义 | 说明 |
|---|---|---|
| `draft` | 草稿 | 可编辑，尚未发布 |
| `published` | 已发布 | 已通知相关人员 |
| `ongoing` | 进行中 | 活动正在执行 |
| `completed` | 已结束 | 执行完毕（字面值仅用于存储，展示一律用下方生命周期派生态） |

**活动生命周期展示态（2026-08-07 书记裁决：消除"已完成 vs 未归档"矛盾）：**

> 页面展示态由 `deriveActivityLifecycleStatus(activity, allTasks)` 派生（复用执行态判定 + `checkActivityCloseConditions` 关闭条件），不直接读 status 字面值。全站活动徽章统一按此展示。

| 生命周期态 | 判定条件 | 徽章语义 |
|---|---|---|
| `draft` | `status='draft'` | 草稿 |
| `published` | 已发布未开始 | 已发布 |
| `ongoing` | 执行中（含关联任务执行中） | 进行中 |
| `pending_archive` | 执行完毕但产出（考勤/材料/宣传）缺失 | 待归档（悬停显示缺项清单） |
| `executed` | 执行完毕且产出齐备 | 已执行 |
| `archived` | `archived=true` | 已归档 |
| `cancelled` | `status='cancelled'` | 已取消 |

> "已完成"不再作为活动状态字面值出现（2026-08-07）。

#### 2.1.1 子记录关联结构 (SubRecord)

> 子记录是主记录的纵向扩展，支持考勤、材料、宣传三种类型的结构化附属数据。

**主记录与子记录的树形关联：**

```
ActivityRecord (主记录)
├── id, title, type, date, location
├── executor, createdBy, createdAt
└── subRecords[]
    ├── { type: "attendance", items: [...] }    // 考勤子记录
    ├── { type: "materials", items: [...] }      // 材料子记录
    └── { type: "publicity", items: [...] }      // 宣传子记录
```

> 此树形结构为概念模型，仅示意主记录与子记录的关联结构，实现层完整字段以 2.1 节字段表为准。

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
| **写入留痕** | 子记录项须含 `recordedAt`(ISO) + `recordedBy`(短 ID) | T-209 改进项③：push 时写入当前时间与操作人；详情面板字段表追加「时间」列展示（时间戳全由表单写入，非系统派生） |

#### 2.1.2 活动分类体系（2026-07-31 重构）

> **设计理念**：活动顶层分类为两大类，三会一课固定分类，主题党日使用正交维度。
> **书记指示**（2026-07-31）：活动分类应清晰表达层次关系，避免视觉混乱。

**活动顶层分类**：

**1. 三会一课**（固定分类，无正交维度）

- 支部党员大会
- 支委会
- 党小组会
- 党课

> **组织生活会**（`scenarioId: 'org-life'`）是**会议内容**（如开展批评与自我批评），不是三会一课的子类（书记 2026-08-01/2026-08-07 决策）：组织生活会由三会之一召开（支部党员大会开组织生活会 / 党小组会开组织生活会均可），**形式归入三会一课系、内容不单独成类**。故：不进查询子类 chips、不进写入表单（活动名称写"XX组织生活会"即可表达）；系统既定形式映射 `org-life → party-group-meeting`（党小组会）；颜色/简称/图例均按三会一课系（党建红）呈现，SOP 场景独立保留（见 `sopData.js`）。

**2. 主题党日**（使用正交维度）

- **维度1：共建性质**（独立开展 / 共建开展）— 决定对接工作
- **维度2：是否外出**（校内 / 校外）— 决定后勤工作（约车、订餐等）
- **维度3：活动载体**（理论学习 / 实践参访 / 交流座谈 / 其他，多选）— 影响实施细节

**视觉表达规范**：

| 元素 | 规范 | 说明 |
|------|------|------|
| **日历简称** | 三会一课：党会（支部党员大会/支委会/党小组会）、党课<br>主题党日：党日 | 格子宽度受限，使用2字简称 |
| **颜色方案** | 三会一课：党建红 #CE1126<br>主题党日：党建金 #D4AF37 | 顶层分类颜色，不细分 |
| **图例显示** | 顶层显示：三会一课、主题党日两大类<br>不显示子分类 | 避免层次混乱 |

**数据结构映射**：

```javascript
// 三会一课数据结构
{
  scenarioId: 'branch-party-meeting', // 支部党员大会
  // 或 'branch-committee'（支委会）
  // 或 'party-group-meeting'（党小组会）
  // 或 'party-lecture'（党课）
}

// 主题党日数据结构（正交维度）
{
  scenarioId: 'theme-party',
  isJoint: false,           // 共建性质
  isOutdoor: false,         // 是否外出
  carriers: ['理论学习'],    // 活动载体（多选）
  carrierOther: null,       // 其他载体（需书记权限）
}
```

#### 2.1.3 参与人双入口边界（2026-08-08 T-234 W3 声明）

> **背景**：`activity.assignments`（活动参与人）与 `AuthStore.authorize`（项目级授权）是两个**相互独立**的入口，数据同源原则要求文档明确二者边界，避免"参与人=被赋权人"的误读。

| 入口 | 数据载体 | 写入时机 | 语义 | 派生影响 |
|---|---|---|---|---|
| **活动参与人** | `activity.assignments: Array<{personId, role:'participant'}>`（活动创建时内联） | 书记/组长创建活动表单勾选参与人 | 记录"谁参加本次活动"（参与层） | **非空时不再派生组长赋权待办**（calendar-tab.js 内联赋权）；不影响 organizer/deep 项目角色 |
| **项目级授权** | `AuthStore.authorize` 独立授权记录（`gsm1921-auth-grants`） | 书记工作台「项目赋权」Tab 单独操作 | 授予"组织者/深度参与者"项目角色权限（活动/专班共用全局授权体系） | 派生对应对应项目的管理权限，与参与人名单无关 |

**边界规则**：
1. 活动参与人是**活动级事实**，只回答"谁参加"；项目角色授权是**权限级事实**，只回答"谁能管这个项目"。
2. 两个入口数据互不读写：勾选参与人不会自动产生 organizer/deep 授权；项目赋权也不会把被赋权人塞进参与人名单。
3. 派生存档的待办链依据同上：组长赋权待办仅在 `assignments` 为空时派生（活动创建无参与人 → 提示组长补录参与人）；项目角色授权待办独立派生。

### 2.2 角色与权限数据

> 角色类型定义位于 [core/state.js](../../docs/src/core/state.js#L18-L28)，标签/颜色位于 [core/constants.js](../../docs/src/core/constants.js)
> 权限的详细解释见 [ROLE_CLASSIFICATION.md §九 角色权限矩阵](../02_institution/ROLE_CLASSIFICATION.md)。本节为该权威源在数据层 ACL 中的切面视图，冲突时以权威源为准。

#### 2.2.1 角色常量定义

| 角色键 | 中文标签 | 首页日历角色分组 | 所属分类 |
|---|---|---|---|
| `participant` | 默认参与者 | participant | 参与层 |
| `leader` | 党小组组长 | manager | 支委（组长） |
| `org-commissioner` | 组织委员 | manager | 支委 |
| `prop-commissioner` | 宣传委员 | manager | 支委 |
| `disc-commissioner` | 纪检委员 | manager | 支委 |
| `organizer` | 组织者 | manager | 项目角色 |
| `deep` | 深度参与者 | manager | 项目角色 |
| `secretary` | 党支书 | manager | 支委（书记） |
| `global` | 全局视图 | global | 参考指南专用 |
| `all` | 全体相关 | participant | 参考指南显示用 |

**管理角色集合** (`MANAGEMENT_ROLES`): `leader`, `org-commissioner`, `prop-commissioner`, `disc-commissioner`, `organizer`, `deep`, `secretary`

**支委角色集合** (`COMMISSIONER_ROLES`): `commissioner`, `org-commissioner`, `prop-commissioner`, `disc-commissioner`

#### 2.2.2 ACL 基础规则与模块权限

> 权限矩阵、模块可见性、数据共享规则的完整定义见 [ROLE_CLASSIFICATION.md §九](../02_institution/ROLE_CLASSIFICATION.md) + [MODULE_UI_DESIGN.md](MODULE_UI_DESIGN.md)。本节不重复展开，仅指向权威源。

**关键规则要点**（详细规则见权威源）：
- 基础 ACL 实现：[domain.js `can()`](../../docs/src/core/domain.js#L78-L91)
- 特殊资源 `evaluation`（考察档案）: 仅 `secretary` 和 `org-commissioner` 可读写，其他角色绝对隔离
- 宣传委员不可创建活动（仅党支书和党小组组长可创建），但任何活动创建后应自动出现在宣传委员的视图中
- 支委身份选择：sidebar "支委" 卡片 → 模态框选择 → `setState({ selectedRole })` → 「党建」Tab 分组面板按角色显示对应支委面板
- 书记独占能力：党课布置、主持大会、全局视角切换、赋权管理（详见 ROLE_CLASSIFICATION.md §九）

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
| developStage | `'积极分子'\|'发展对象'\|'预备党员'\|'正式党员'` | 否 | -- | 发展阶段（D-239 统一中文枚举；2026-08-01 书记决策收敛为四阶段，移除【入党申请人】） |
| partyGroup | string | 否 | -- | 所属党小组 |

**出勤状态枚举：**

| 值 | 中文 | 说明 |
|---|---|---|
| `present` | 出席 | 按时到场 |
| `absent` | 缺席 | 未到场（触发补课机制，T+7 内完成） |
| `leave` | 请假 | 事假须提前1天申请；病假可事后补假 |
| `made_up` | 已补 | 补课完成后考勤状态变更为"已补"（§2.17.2 补课制度） |

**发展阶段枚举（D-239 统一中文，2026-08-01 收敛为四阶段）：**

> 书记决策（2026-08-01）：从系统简洁性出发，系统身份不考虑【入党申请人】这一档，仅保留 积极分子/发展对象/预备党员/正式党员。原【入党申请人】人员并入积极分子。关于页仍保留"从入党申请人到正式党员"的完整党章流程叙事（宣传教育用途，非系统身份档位），其中须点明"递交入党申请书须年满十八周岁"这一时间前提。

| 值 | 说明 |
|---|---|
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

### 2.7 产出物 (OutputRecord)

> 类型定义位于 [domain.js](../../docs/src/core/domain.js)（`OutputType` / `OUTPUT_ROUTES` / `deriveOutputRoute`）
> **来源：**T-224 产出物定向路由（spec §5.5/§8）。废除原「数据交接」手动推送模型——投递去向由产出类型派生，系统自动执行，组织者只见「提交」不见「发送对象」。

| 字段名 | 类型 | 必填 | 默认值 | 说明 |
|---|---|---|---|---|
| type | OutputType | 是 | -- | 产出物类型（考勤/考察/宣传材料/复盘/工作量/思想汇报等） |
| title | string | 是 | -- | 产出物名称 |
| submittedBy | string | 是 | -- | 提交人 ID |
| submittedAt | string (ISO) | 是 | -- | 提交时间 |
| status | `'pending'\|'submitted'` | 是 | `'pending'` | 提交状态 |
| routedTo | string | 是 | 类型派生 | 系统定向投递去向——由 `deriveOutputRoute(type)` 派生，非人工录入 |

**路由表（OUTPUT_ROUTES，固化在 domain.js）**：

| 产出物 | 上游产出方 | 系统定向投递 | 最终沉淀 |
|--------|-----------|-------------|---------|
| 考勤数据 | 组长·组织者上传 / 纪检一体 | 纪检确认 → 考勤总表 | 组织/宣传只读同源 |
| 工作考察记录 | 组长·组织者上传 | 纪检确认 → 考察总表 | 组织委员建档 |
| 专班考察 | 专班负责人 / 组织委员 | 纪检确认 → 考察总表 | 组织委员建档 |
| 宣传材料 | 宣传委员拍摄 / 深度参与者素材 | 宣传委员归档 | 产出物查看区 |
| 复盘总结 | 组织者 | 纪检批注/确认 | 活动关闭前置 |
| 专班工作量 | 专班成员 | 系统自动记录 | 解散报告 → 个人档案 |
| 思想汇报 | 党员本人 | 组织委员归档 | 个人档案（不经纪检/宣传） |

> **同一套数据**：产出物区与各录入入口读取同一份数据（`parent_record[byproduct] == 各入口读取值`），不重复录入。

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

> **D-244/T105 变更**：意见反馈已升级为 GitHub Issue 风格意见反馈系统。数据从 localStorage 单轨（FeedbackStore）升级为双轨（issues.json 权威源 + localStorage 草稿/缓存）。旧 FeedbackRecord 类型已弃用，保留向后兼容 shim（feedback.js）。

> 类型定义与权威实现位于 [issues.js](../../docs/src/services/issues.js)（IssueStore），权威源 `docs/data/issues.json`

| 字段名 | 类型 | 说明 |
|---|---|---|
| id / number | string / number | 唯一标识符（前缀 `issue-`）/ 自增序号（GitHub Issue 风格 `#N` 展示） |
| title / body | string | 标题 / 正文（痛点与建议详细描述） |
| scope | `'permanent'\|'global'\|'role'\|'scenario'` | 影响范围：底层架构/全局规则/支委分工/特定场景 |
| types | string[] | 类型标签（如 `bug`） |
| status | `'open'\|'closed'` | 开放 / 关闭 |
| closedReason / closedAt | `'completed'\|'duplicate'\|'wontfix'\|'not_planned'` / string\|null | 关闭原因 / 关闭时间 |
| submittedBy / submittedAt | string | 提交人（短 ID，可匿名）/ 提交日期 |
| assignee / assigneeRole | string \| null | 书记指派对象（personId / 角色键，如 `u_org` / `'org-commissioner'`） |
| dispatchHistory | {from, to, by, at, note}[] | 指派历史时间线（from→to 变更记录） |
| milestone | string \| null | 里程碑 |
| reactions | {thumbsUp[], thumbsDown[], eyes[], hooray[]} | 表态反应（按人列表） |
| mentions / references | string[] | 提及 / 引用 |
| participants / commentCount | string[] / number | 参与人 / 评论数 |
| hidden / mergedInto | boolean / string\|null | 书记隐藏（不在公开列表显示）/ 合并去向（被合并的 source 置位） |
| comments | {id, author, authorRole, body, createdAt, kind, hidden, hiddenBy, hiddenReason, hiddenAt}[] | 评论时间线；kind：`comment` / `dispatch`（指派事件）/ `result`（处置结果）/ `verdict`（书记终审/合并事件） |
| resultPending / resultSubmittedAt | boolean / string\|null | 待终审标记（处置结果提交后置位） |

**处理流程（GitHub Issue 风格）**：提交(open) → 书记审阅并指派（assignee + dispatchHistory，通知被指派人）→ 公开讨论（评论+表态，全员可参与）→ 被指派人提交处置结果（kind=`result`）→ 待终审（resultPending=true，书记工作台高亮）→ 书记终审：关闭(closed) / 重新开放(reopen)。

**派生显示状态**（UI 层派生，数据层不存储，实现 `deriveIssueDisplayState`）：`开放中` → `已指派`（有 assignee）→ `待终审`（resultPending 或已有 result 评论）→ `已关闭`。

> **书记处置权设计**（2026-08-09 P-015 重写联动，倒写自 issues.js）——意见反馈处置权归书记独有：全员可参与开源讨论（issue.create / comment.add / reaction.toggle / mention / reference），但处置动作仅书记可执行，类比 GitHub maintainer 唯一拥有 merge/close 权（详见 [insights §2.2](../../insights/党支部管理与实务经验沉淀.md) D-244/T105 与 [COMMISSIONER_FRAMEWORK §C.1b](../02_institution/COMMISSIONER_FRAMEWORK.md) 党课/意见反馈规则）。这是 P-015 组织内控总论"书记仲裁"防线的落点。

| 处置动作 | 接口 | 说明 |
|---|---|---|
| 改状态/关闭 | `changeStatus` / `closeIssue` | 关闭原因 completed/duplicate/wontfix/not_planned；关闭备注记 verdict 评论；清除待终审未读 |
| 重新开放 | `reopenIssue` | 清除 closedReason/closedAt/resultPending |
| 指派 | `assignIssue` | 写 assignee/assigneeRole + dispatchHistory + kind=`dispatch` 评论 + 被指派人未读角标 +1 |
| 设置里程碑 | `setMilestone` | milestone 归书记管理 |
| 隐藏/取消隐藏 | `hideIssue` / `unhideIssue` | hidden 置位，公开列表不显示 |
| 合并 | `mergeIssue` | source 标记 mergedInto + hidden + closed(duplicate)；target 追加 merge verdict 事件 |
| 软隐藏评论 | `hideComment` | 评论 hidden=true，记录 hiddenBy/hiddenReason/hiddenAt |
| 编辑 | `editIssue` | 书记可编辑任意 issue |
| 草稿终审 | `approveDraft` / `rejectDraft` | new-issue/comment/reaction 三类型草稿：pending → approved（合并入 issues.json）/ rejected（含理由） |

**通知机制**：指派 → 被指派人工作台「我的处置」Tab 角标 +1（personId 维度未读）；处置结果提交 → 书记工作台「待终审」高亮；书记终审关闭/重开 → 清除对应未读。

> **人员 ID 规范（2026-08-01 T187）**：`submittedBy`/`participants`/`assignee`/评论 `author`/`dispatchHistory` 等一律存短 ID（`p*` 或 `u_sec`/`u_org`/`u_prop`/`u_disc`/`u_leader_*`），渲染层统一经 `PersonStore.getName()` 转中文姓名，禁止出现 `u_org_commissioner` 类长 ID 或直接展示原始 ID。issues.js 缓存版本已升 v3（`gsm1921-issue-cache-v3`）强制清除用户浏览器残留旧长 ID 缓存。

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
| taskforceId | string | 否 | -- | 关联专班 ID（专班复盘时填写，T-209 新增，与 sourceName 双保险定位） |
| organizerId | string | 是 | -- | 组织者人员 ID（须为活动/专班的实际 organizer） |
| progress | string | 是 | -- | 进度状态（如 '已完成'/'进行中'/'超时'） |
| overdue | boolean | 是 | `false` | 是否超时 |
| reviewStatus | `ReviewStatus` | 是 | `'未提交'` | 复盘状态（见下方枚举） |
| reviewContent | string | 否 | `''` | 复盘内容 |
| issues | string[] | 否 | `[]` | 待改进问题清单 |
| annotation | string | 否 | `''` | 批注内容（reviewStatus='批注中'/'已打回'时填写） |
| annotatedBy | string | 否 | -- | 批注人 personId（纪检委员） |
| annotatedAt | string (ISO) | 否 | -- | 批注时间 |
| submittedAt | string (ISO) | 否 | -- | 提交时间（reviewStatus 非'未提交'时填写） |
| confirmedAt | string (ISO) | 否 | -- | 确认时间（reviewStatus='已确认'时填写） |

> **专班复盘写入入口（T-209 改进项①）**：组织委员工作台·专班详情面板内联表单（专班状态 active 且未提交时显示）→ `addTaskforceReview()` 写入 `mockDB.taskforceReviews` + `persist()`，纪检委员工作台活动监督复盘 tab 经 `reviewToDisplay()` 合并展示与批注。写入型标签：organizerId/submittedAt/reviewContent/issues 均为用户表单写入，非系统派生。

**复盘状态枚举（D-242）：**

| 值 | 说明 | 流转 |
|---|---|---|
| `未提交` | 组织者未提交复盘 | 初始状态 |
| `已上传` | 组织者已提交复盘 | 未提交 → 已上传 |
| `批注中` | 纪检委员正在批注 | 已上传 → 批注中 |
| `已确认` | 纪检委员确认完成 | 批注中 → 已确认 |
| `已打回` | 纪检委员打回要求修改 | 批注中 → 已打回 → 已上传（重新提交） |

### 2.16.2 周报数据 (WeeklyReport) — T-209 本轮补建

> 宣传委员按周报送工作内容，报送历史供书记/宣传条线查阅。
> **写入入口**：宣传委员工作台·周报报送 tab（T-209 改进项②：支持「+ 新增周次」内联表单新建草稿周次）。

| 字段名 | 类型 | 必填 | 默认值 | 说明 |
|---|---|---|---|---|
| id | string | 是 | -- | 唯一标识符（seed 为 wrN，新建为 wr_时间戳） |
| week | string | 是 | -- | 周次标签（如 '第32周'，同标签唯一性校验） |
| weekRange | string | 是 | -- | 日期范围（如 '2026-08-04 ~ 2026-08-08'） |
| content | string | 否 | `''` | 周报内容（每条一行） |
| status | `'draft'\|'submitted'` | 是 | `'draft'` | 报送状态 |
| submittedAt | string (date) | 否 | `null` | 报送日期（status='submitted' 时填写） |
| createdAt | string (ISO) | 否 | -- | 新建时间（新建周次时写入） |
| createdBy | string | 否 | -- | 创建人短 ID（宣传委员 personId） |

> **标签属性**：seed 预置（wr1-wr4）+ 用户表单写入型——week/weekRange/createdAt/createdBy 由「新增周次」表单写入，content/submittedAt 由「报送」表单写入。

### 2.17 写入数据验证设计

> 每条写入操作须在查看端可验证——写入的数据在任何查看点都看不到，则写入失败。

#### 2.17.1 写入操作数据流清单

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
| 赋权写入 | 书记工作台 | 书记赋权记录列表新记录出现；被赋权者工作台出现对应角色页面 |
| 考勤上传 | 党小组组长工作台 | 纪检委员考勤总表新考勤记录出现 |
| 考察上传 | 党小组组长工作台 | 纪检委员考察确认面板新考察记录出现（待确认状态） |
| 确认考勤 | 纪检委员 | 党小组组长工作台缺勤列表状态更新；补课任务自动生成 |
| 补课制度 | 纪检委员 | 补课制度Tab新补课任务出现；考勤记录缺勤状态→已补 |
| 意见反馈 | 全员提交 issue + 评论 + 表态 | 书记处置（status/close/milestone/assignee/drafts）+ 新 issue 或新评论通知 |
| 制度文件引用 | 组织委员 | 制度文件Tab新引用记录出现 |
| 子记录写入 | 党小组组长/组织委员 | 对应详情面板新子记录行出现 |
| 文件空间 | 组织者工作台 | 文件空间Tab新记录出现；统计概览卡片计数更新 |
| 经验沉淀 | 深度参与者 | 深度参与者我的沉淀列表新记录出现；纪检委员经验沉淀Tab新记录出现 |
| 看板确认完成 | 组织委员/宣传委员 | 看板活跃区消失，归档区出现 |

#### 2.17.2 跨页面验证机制

依赖 `CrossPageState` 和 `storage` 事件同步机制——写入后触发 `bumpDataVersion()`，其他页面监听 `storage` 事件刷新，页面切换时通过 `load()` 恢复上下文。

### 2.18 待办任务数据 (Todo) — 最小三成本原则落地

> **设计依据**：最小三成本原则（见 [DESIGN_SYSTEM.md §一 第2条](DESIGN_SYSTEM.md)）——任务流默认直接展示在工作台，不要求用户额外操作才能看到"我需要做什么"。
> **派生来源**：通知派生（§2.19）+ 活动生命周期事件派生 + 专班生命周期事件派生 + 手动创建。
> **类型定义将位于** [domain.js](../../docs/src/core/domain.js)（待新增）。

#### 2.18.1 字段定义

| 字段名 | 类型 | 必填 | 默认值 | 说明 |
|---|---|---|---|---|
| id | string | 是 | `generateId('todo')` | 唯一标识符，前缀 `todo_` |
| title | string | 是 | -- | 待办标题 |
| description | string | 否 | `''` | 待办描述 |
| role | string | 是 | -- | 目标角色（secretary/leader/org-commissioner/prop-commissioner/disc-commissioner/organizer/deep/participant） |
| personId | string \| null | 否 | `null` | 目标人员 ID（null=该角色所有人） |
| category | `'auth' \| 'archive' \| 'review' \| 'notice' \| 'submit' \| 'track'` | 是 | -- | 分类（赋权/归档/审核/通知/提交/追踪） |
| priority | `'urgent' \| 'normal'` | 是 | `'normal'` | 优先级 |
| status | `'pending' \| 'in_progress' \| 'completed' \| 'expired'` | 是 | `'pending'` | 状态 |
| deadline | string (ISO) \| null | 否 | `null` | 截止日期 |
| createdAt | string (ISO) | 是 | `new Date().toISOString()` | 创建时间 |
| completedAt | string (ISO) \| null | 否 | `null` | 完成时间 |
| sourceType | `'notice' \| 'activity' \| 'taskforce' \| 'manual'` | 是 | -- | 来源类型 |
| sourceId | string \| null | 否 | `null` | 来源 ID（通知ID/活动ID/专班ID） |
| actionType | `'authorize' \| 'archive' \| 'review' \| 'read' \| 'submit' \| 'track' \| null` | 否 | `null` | 行动类型，决定点击后跳转/弹出的操作面板 |
| actionData | object \| null | 否 | `null` | 行动数据（如赋权参数 `{scope, sourceId, sourceName}`、归档参数等） |

#### 2.18.2 分类与展示规则

待办按 `category` 分组展示，支持折叠/展开，避免信息爆炸：

| 分类 | category 值 | 包含事项 | 默认状态 |
|---|---|---|---|
| 赋权类 | `auth` | 待赋权活动、待赋权专班、待设党小组组长 | 默认展开（最需要即时处理） |
| 归档类 | `archive` | 待归档活动、待归档专班 | 默认折叠 |
| 审核类 | `review` | 考勤确认、考察确认、复盘审核、活动审批 | 默认展开 |
| 通知类 | `notice` | 通知阅读、通知催读 | 默认折叠 |
| 提交类 | `submit` | 考勤上传、考察上传、复盘提交、周报报送 | 默认折叠 |
| 追踪类 | `track` | 发展党员追踪、材料催缴、补课跟进 | 默认折叠 |

每类内部按截止时间升序排列，过期待办（status=`pending` 且 deadline < today）红色标记排在各类最前。

#### 2.18.3 各角色待办来源矩阵

| 角色 | auth | archive | review | notice | submit | track |
|---|---|---|---|---|---|---|
| 书记 | 待设党小组组长 | -- | 待审批事项 | 通知未读超期 | -- | -- |
| 党小组组长 | 待赋权活动 | -- | -- | 通知阅读 | 活动写入/考勤上传/考察上传/复盘提交 | -- |
| 组织委员 | 待赋权专班 | -- | 考察审核 | 通知阅读 | 考察上传 | 发展党员追踪/材料催缴 |
| 宣传委员 | -- | 待归档活动 | -- | 通知阅读 | 宣传任务/周报报送 | -- |
| 纪检委员 | -- | -- | 考勤确认/考察确认/复盘审核 | 通知阅读 | -- | 补课跟进 |
| 普通成员 | -- | -- | -- | 通知阅读 | -- | 个人考勤查询 |

#### 2.18.4 状态流转

```
pending ──用户开始处理──→ in_progress ──完成──→ completed
   │                                          ▲
   │                                          │
   └─── 超过 deadline ──→ expired ──重新激活──┘
```

`expired` 不是终态——超期未处理自动转 `expired` 红色标记，用户仍可激活完成。

### 2.19 通知→待办派生机制

> **设计依据**：通知分类（信息性 vs 行动性）+ 最小三成本原则——行动性通知自动派生为对应角色待办，用户无需手动从通知列表中筛选"我需要做什么"。

#### 2.19.1 通知扩展字段

通知数据结构（§2.9）新增字段：

| 字段名 | 类型 | 必填 | 默认值 | 说明 |
|---|---|---|---|---|
| actionable | boolean | 是 | `false` | 是否为行动性通知 |
| actionRoles | string[] | 否 | `[]` | 需要执行的角色列表（actionable=true 时必填） |
| actionTask | string | 否 | -- | 待办任务标题（actionable=true 时必填） |
| actionDeadline | string (YYYY-MM-DD) | 否 | -- | 行动截止日期 |
| readBy | string[] | 是 | `[]` | 已读人员 ID 列表（用于未读名单查看） |
| reminderDays | number | 是 | `3` | 自动提醒触发天数（书记发布时配置） |
| reminders | Array&lt;{type, sentAt, sentBy, targetPersonIds}&gt; | 是 | `[]` | 提醒记录（auto/manual） |

#### 2.19.2 派生规则

- 通知发布时，若 `actionable === true`，系统自动为 `actionRoles` 中的每个角色生成一条待办
- 待办 `category = 'notice'`，`sourceType = 'notice'`，`sourceId = 通知ID`
- 待办 `actionType` 由通知类型决定（如材料审核通知→`actionType='review'`）
- 通知过期或被取消时，关联待办自动标记为 `expired`

#### 2.19.3 通知未读提醒机制

| 提醒类型 | 触发条件 | 执行者 | 频率 |
|---|---|---|---|
| 自动提醒 | 发布后 `reminderDays` 天仍未读 | 系统 | 每条通知每用户仅触发一次 |
| 手动催读 | 书记在通知管理中点击"催读" | 书记 | 可多次，记录写入 `reminders` 数组 |

**权限归属**：通知发布权=书记；自动提醒=系统；手动催读=书记。

#### 2.19.4 通知分类示例

| 类型 | 示例 | 处理方式 |
|---|---|---|
| 信息性通知 | "七一活动总结已发布" | 仅首页通知区展示 |
| 行动性通知 | "本月发展党员材料审核截止7月30日" | 首页展示 + 自动生成组织委员待办 |

### 2.20 归档记录扩展字段

> **设计依据**：归档详情浮窗需求——归档后可点击具体活动/专班条目查看归档完整内容，包括材料清单。

归档记录（ActivityRecord.archived=true 时）新增字段：

| 字段名 | 类型 | 必填 | 默认值 | 说明 |
|---|---|---|---|---|
| archivedBy | string | 是 | -- | 归档人 personId |
| archivedAt | string (ISO) | 是 | -- | 归档时间 |
| materials | Array&lt;Material&gt; | 是 | `[]` | 已归档材料清单 |
| checklistResult | object \| null | 否 | `null` | 归档检查清单结果 |

**Material 子结构**：

| 字段名 | 类型 | 必填 | 说明 |
|---|---|---|---|
| id | string | 是 | 材料 ID |
| name | string | 是 | 文件名 |
| type | `'image' \| 'document' \| 'video' \| 'other'` | 是 | 文件类型 |
| url | string \| null | 是 | 文件 URL（阶段2 后端支持时填充，mock 阶段为 null） |
| uploadedAt | string (ISO) | 是 | 上传时间 |
| uploadedBy | string | 是 | 上传人 personId |
| size | number \| null | 否 | 文件大小（字节） |

**阶段2 后端支持**：归档浮窗中材料清单每项可点击查看——图片预览/文档下载/视频预览，需后端文件存储支持。

---

## 三、参与者数据流设计

### 3.1 三级管理架构

#### 3.1.1 三级管理架构总览

| 层级 | 角色 | 核心职责 | 产出 |
|------|------|---------|------|
| **党支部**（支委会统筹决策层） | 党支书+支委 | 统筹决策 | — |
| **组织者**（分工记录层） | 党小组组长 / 支委（组织活动时）/ 组织者 | 平等协商分工（非上下级）+ 桥梁作用（与支委同步）+ 打包产出物（考勤+考察）+ 鼓励复盘和创新提案 | 分工记录 / 考察记录+产出物打包 / 考察记录：组织 |
| **深度参与者**（具体执行层） | 有明确分工并实际完成的成员（宣传/现场统筹/技术支持/一对一对接/材料整理等） | 承担具体工作 | 考察记录：深度参与-[角色] |
| **普通参与者**（考勤记录层） | 参加但无具体分工 | 出席 | 考勤记录：出勤 |
| **归档层** | 纪检委员（执行人） | 汇总考勤/考察记录 | 考勤（对象：党员+预备党员；适用：三会一课；状态：出勤/请假/缺勤；提交：宣传委员备案）+ 考察（对象：深度参与者和组织者；适用：所有支部工作；层级：组织/深度参与；提交：组织委员建档每月） |

> 完整的分工记录、桥梁作用、考勤/考察规则详见 [FLAT_DESIGN.md](../02_institution/FLAT_DESIGN.md) + [纪检委员工作流程指南 §1.2](../02_institution/sop/纪检委员工作流程指南.md)。

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

### 3.2 角色权限矩阵

> 权限矩阵的完整定义见 [ROLE_CLASSIFICATION.md](../02_institution/ROLE_CLASSIFICATION.md) §九 角色权限矩阵。本节数据层切面视图已合并至权威源，冲突时以权威源为准。

### 3.3 考勤与考察的核心区分

> 完整的考勤/考察规则、判断逻辑、记录字段定义见 [纪检委员工作流程指南 §1.2](../02_institution/sop/纪检委员工作流程指南.md) + [insights 工程演进与设计方法论.md §6.12](../insights/工程演进与设计方法论.md)。本节仅保留要点索引。考勤/考察在端到端数据流中的「挂靠活动 + 聚合总数据」交织位置见 [§1.3](#13-端到端数据流交织图)。

**要点**：考勤 = 0-1变量（出勤/请假/缺勤），对象为党员+预备党员，适用三会一课；考察 = 工作量记录（组织/深度参与），对象为深度参与者和组织者，适用所有支部工作。系统记录字段：考勤见 §2.5 AttendanceRecord；考察补充字段 `participationLevel`/`deepRole`/`specificWork`/`divisionRecordedBy`/`submittedTo`/`submittedAt`。

> **（书记论断 P-026，2026-08-09 自书记论断汇编迁出）：人才库（组织委员维护）是画像数据库，基于考察信息更新——装的是"画像"（某同志擅长什么、表现如何、有何特长），不是原始材料本身；原始材料库（纪检委员持有）是考勤总表、考察总表等原始记录。纪检委员把考察信息给组织委员，原始材料留在纪检委员处——不是副本关系。**

### 3.4 登录态说明

> 当前无登录态，所有交互按"党支书站位"运行。未来接入北大 IAAA 系统时再设计登录态规范。

---

## 四、前端数据流

### 4.1 状态管理 (core/state.js)

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

### 4.2 localStorage 持久化

> **统一全量键架构**：所有业务数据通过单一全量键 `workflowos_branch_db_v1` 持久化，消除双重存储与同步断裂风险。

#### 4.2.1 业务数据全量键

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
| `makeupTasks` | MakeupTask[] | 补课任务 |
| `actSubRecords` | Object | 活动子记录（按活动 ID 索引） |
| `tfSubRecords` | Object | 专班子记录（按专班 ID 索引） |
| `complianceReferences` | ComplianceReference[] | 制度文件引用 |
| `fileSpaceRecords` | FileSpaceRecord[] | 文件空间记录 |
| `experienceDeposits` | ExperienceDeposit[] | 经验沉淀记录 |
| `taskforces` | TaskForceRecord[] | 专班记录 |
| `notices` | Notice[] | 通知记录 |
| `todos` | Todo[] | 待办任务记录（最小三成本原则落地，见 §2.18） |

#### 4.2.2 UI 状态独立键

> 以下键存储 UI/会话状态，不属于业务数据，保持独立键存储。

| 键名 | 存储内容 | 格式 | 读写位置 |
|---|---|---|---|
| `gsm1921-auth-records` | 认证记录 | JSON | [services/auth.js](../../docs/src/services/auth.js) |
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

### 4.3 数据源使用边界（D-248）

> **问题背景**：此前全仓库存在 28 处直接使用静态 `ACTIVITIES`（来自 mock/index.js）而非 `mockDB.activities` 的引用，导致跨页面/跨视图数据不一致。D-248 数据统一修复已将所有非 fallback 引用替换为 `mockDB.activities`。

**三条使用规则：**

| 场景 | 应使用 | 禁止使用 | 原因 |
|------|--------|----------|------|
| 组件渲染（下拉框、查找、筛选） | `mockDB.activities` 或 `getAppState().activities` | `ACTIVITIES` | mockDB 是运行时数据源，ACTIVITIES 是静态初始数据 |
| 数据加载 fallback | `fallbackData: () => ACTIVITIES` | — | 仅在 BranchService 失败时作为安全网，已禁用 _maybeError（D-248），极少触发 |
| Mock 数据生成（seed 阶段） | `ACTIVITIES` | — | mock/index.js 中 `_activityTitle`/`_activityType` 辅助函数在 seed 阶段使用静态数据，正确 |
| 服务层查找 | `mockDB.activities` | `ACTIVITIES` | auth.js/makeup.js/party.js 等服务层应读取运行时数据 |

**已禁用 `_maybeError` 随机错误模拟**（D-248）：原设计 10% 错误率触发 fallback 返回静态 ACTIVITIES，导致跨页面数据漂移。后端接入后真实错误由后端返回。

**唯一数据源原则（2026-08-01 T187）：**

| 数据域 | 唯一权威源 | 派生/引用方 | 说明 |
|---|---|---|---|
| 人员（学生+系统账号） | `PEOPLE`（people.js）+ `mockDB.users`（domain.js，u_* 系统账号） | 全部渲染层经 `PersonStore.getAll()/getName()` 解析 | 任何模块不得自行硬编码人员名单 |
| 发展党员追踪 | `PEOPLE.developStage` + localStorage 推进覆盖档案 `gsm1921-dev-stage-overrides` | 组织委员工作台发展党员/人才库 | 候选人由 `_buildCandidates()` 从 PEOPLE 派生（非正式党员），推进落覆盖档案 |
| 反馈系统人员 ID | 短 ID（`p*` / `u_sec`/`u_org`/`u_prop`/`u_disc`/`u_leader_*`/`u_exec`） | issue-list/issue-detail/issues.js 渲染层统一 `getPersonName()`/`PersonStore.getName()` 转姓名 | 存储与渲染均不得出现 `u_org_commissioner` 等长 ID；`PersonStore.getName` 解析不到时回退返回 ID 本身 |

> 关联缓存版本链：`cross-page-state.js CODE_VERSION` + HTML `?v=` 参数 + `issues.js CACHE_VERSION` 三者任一升级都会强制用户浏览器丢弃旧 localStorage 缓存重新拉取，保证"数据干净、唯一数据源"落地（T187）。

### 4.4 数据访问抽象层（DataAdapter）— T-142 阶段2

> **设计目标**：为接入学校服务器做前端数据层抽象准备，实现 mock/API 无缝切换。

#### 4.4.1 架构

```
UI 层（entries/components/services）
         │
         ▼
   BranchService（兼容层，代理到 mock.js）
         │
   ┌─────┴─────────────────┐
   │                       │
   ▼                       ▼
data-adapter.js         data-adapter.js
（便捷方法）            （getAdapter() 直接访问）
   │                       │
   ▼                       ▼
MockAdapter            ApiAdapter
（mockDB+localStorage） （REST API+JWT）
```

#### 4.4.2 核心文件

| 文件 | 位置 | 职责 |
|------|------|------|
| `data-adapter.js` | `docs/src/core/` | 统一接口定义 + 切换机制 + 便捷方法 |
| `mock-adapter.js` | `docs/src/core/` | DataAdapter 的 mock 实现（操作 mockDB） |
| `api-adapter.js` | `docs/src/core/` | DataAdapter 的 REST API 实现（接入后端时使用） |
| `runtime.js` | `docs/src/services/` | 初始化 DataAdapter + 暴露 BranchService（兼容层） |

#### 4.4.3 切换方式

一处配置，全局切换：

```javascript
// runtime.js 中：
setDataSource('api', {
  apiBaseUrl: 'https://<学校计算中心域名>/api/v1',
  authToken: '<JWT Token>',
});
```

UI 层零改动。

#### 4.4.4 DataAdapter 接口规范

按资源分组，每组包含 CRUD 方法，所有方法返回 Promise：

| 资源分组 | 方法 | 说明 |
|---------|------|------|
| activities | list/create/update/delete/archive/toggleBrand | 活动管理 |
| tasks | list/create/update | 任务管理 |
| attendances | list/listByActivity/create/update | 考勤管理 |
| inspections | list/create | 考察管理 |
| taskforces | list/create/update/delete | 专班管理 |
| notices | list/create/update | 通知管理 |
| todos | list/create/update/delete | 待办管理 |
| assignments | list/create | 分工管理 |
| makeupTasks | list/create/update | 补课任务 |
| fileSpaceRecords | list/create | 文件空间 |
| imageRecords | list/create | 图片记录 |
| experienceDeposits | list/create | 经验沉淀 |
| complianceReferences | list/create | 合规引用 |

#### 4.4.5 API 路由设计

| 资源 | 路径 | 方法 |
|------|------|------|
| 活动 | `/api/v1/activities` | GET/POST |
| 活动(单) | `/api/v1/activities/:id` | GET/PATCH/DELETE |
| 活动归档 | `/api/v1/activities/:id/archive` | POST |
| 活动品牌 | `/api/v1/activities/:id/brand` | POST |
| 任务 | `/api/v1/tasks` | GET/POST |
| 任务(单) | `/api/v1/tasks/:id` | PATCH |
| 考勤 | `/api/v1/attendances` | GET/POST |
| 考勤(单) | `/api/v1/attendances/:id` | PATCH |
| 考察 | `/api/v1/inspections` | GET/POST |
| 专班 | `/api/v1/taskforces` | GET/POST |
| 专班(单) | `/api/v1/taskforces/:id` | PATCH/DELETE |
| 通知 | `/api/v1/notices` | GET/POST |
| 通知(单) | `/api/v1/notices/:id` | PATCH |
| 待办 | `/api/v1/todos` | GET/POST |
| 待办(单) | `/api/v1/todos/:id` | PATCH/DELETE |
| 分工 | `/api/v1/assignments` | GET/POST |
| 补课 | `/api/v1/makeupTasks` | GET/POST |
| 补课(单) | `/api/v1/makeupTasks/:id` | PATCH |
| 文件空间 | `/api/v1/fileSpaceRecords` | GET/POST |
| 图片 | `/api/v1/imageRecords` | GET/POST |
| 经验沉淀 | `/api/v1/experienceDeposits` | GET/POST |
| 合规引用 | `/api/v1/complianceReferences` | GET/POST |
| 认证登录 | `/api/v1/auth/login` | POST |
| 认证注销 | `/api/v1/auth/logout` | POST |

#### 4.4.6 兼容性说明

- **BranchService（兼容层）**：仍代理到 mock.js，现有调用方无需修改
- **DataAdapter（新接口）**：新代码通过 `getAdapter()` 访问数据
- 两者并行运行，渐进式迁移

### 4.5 数据写入模式

> 实现细节见 `docs/src/` 对应文件（`services/mock.js`、`core/state.js`、`entries/main-entry.js`）。
> 写入数据验证设计见 §2.17。

### 4.6 写穿透缓存模式（T-142 Phase 2B）

> **设计理念**：前端数据层采用"写穿透缓存"模式，实现零成本迁移到后端数据库。
> **实现文件**：`docs/src/core/data-adapter.js`（`init()` + `persist()` 方法）

**核心机制**：

| 操作类型 | 实现方式 | 说明 |
|---------|---------|------|
| 读操作 | 同步读 mockDB 缓存 | 前端零改动，保持同步访问 |
| 写操作 | 通过 `persist()` 路由到当前数据源 | 自动路由到 mock/api 适配器 |
| 初始化 | `init()` 从当前数据源预加载数据 | 页面加载时调用，填充 mockDB 缓存 |

**适用场景**：需要接入后端数据库、支持 mock/api 双模式切换的前端数据层。切换示例见 §4.4.3，接口规范见 §4.4。
