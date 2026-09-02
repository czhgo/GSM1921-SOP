---
title: "数据模型设计"
type: design
role: "[工程师]+[AI]"
version: "1.0"
last_updated: "2026-09-03"
status: active
split_from: "DATA_ARCHITECTURE.md（2026-08-24 T-282 拆分）"
related_files: [content/02_institution/ROLE_CLASSIFICATION.md, content/02_institution/COMMISSIONER_FRAMEWORK.md, content/04_web_design/data/DATA_FLOW.md]
---

# 数据模型设计

> **定位：** 本文件是系统**静态数据模型**的唯一权威源（原 DATA_ARCHITECTURE.md §二）。动态数据流见 [DATA_FLOW.md](DATA_FLOW.md)。
> **受众：** [工程师]+[AI] —— 供开发决策参考，确保数据结构变更时全栈一致。
> **权限矩阵**：本文档含权限简表，完整定义见 [ROLE_CLASSIFICATION.md](../../02_institution/ROLE_CLASSIFICATION.md) §九 角色权限矩阵。
> **拆分说明**：2026-08-24 自 DATA_ARCHITECTURE.md 拆分（T-282 content 体系优化）——数据模型定义在此，数据流定义移至 DATA_FLOW.md。

---

## 二、数据模型设计

### 2.1 活动数据 (ActivityRecord)

> 类型定义位于 [domain.js](../../../docs/src/core/domain.js#L12-L32)

| 字段名 | 类型 | 必填 | 默认值 | 说明 |
|---|---|---|---|---|
| id | string | 是 | `generateId('act')` | 唯一标识符，前缀 `act_` |
| title | string | 是 | -- | 活动标题 |
| type | string | 是 | -- | 活动类型。类型体系（2026-08-07 归一，两大顶层非并列）：三会一课系含支部党员大会/支委会/党小组会/党课（组织生活会是**内容**而非子类，由三会之一召开，见 §2.1.2）；主题党日系含 `type='主题党日'` + 载体见 `carriers`。查询筛选按 `classifyActivityType` 级联展示 |
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
| isBrand | boolean | 否 | `false` | 品牌属性标签（由书记认定，不影响工作流选择，仅作筛选展示）。认定流程：支委/党小组组长识别潜力 → 支委会讨论 → 书记标记 `isBrand = true`。认定依据与案例见 [insights §5.2](../../insights/党支部管理与实务经验沉淀.md)。 |
| carriers | string[] | 否 | -- | 主题党日活动载体（理论学习/实践参访/交流座谈/其他），与写入表单正交维度对齐（2026-08-07） |
| isJoint | boolean | 否 | `false` | 共建性质（共建开展为 true，2026-08-07） |
| brandName | string | 否 | -- | 品牌族名称（如"五四精神传承"/"人生回望录"），书记认定 isBrand 后由写入表单"延续已有品牌/创建新品牌"补录（2026-08-07） |
| agenda | `Array<{item: string, host?: string}>` | 否 | `[]` | 会议议程（三会一课专用：逐条议题 + 可选主持人）。创建时经写入表单"会议议程"区块填写；会后可在活动详情修改（T-283 新增，2026-08-27） |

**活动存储状态：**

| 状态值 | 含义 | 说明 |
|---|---|---|
| `draft` | 草稿 | 可编辑，尚未发布 |
| `published` | 已发布 | 已通知相关人员 |
| `ongoing` | 进行中 | 活动正在执行 |
| `completed` | 已结束 | 执行完毕（字面值仅用于存储，展示一律用下方生命周期派生态） |

**活动生命周期展示态（2026-08-07 决策：消除"已完成 vs 未归档"矛盾）：**

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
| `materials` | 材料子记录 | 交付物列表 | FileSpaceRecord（category 非 publicity 类） | 深度参与者（组织者打包提交）；实现层暂为党小组组长/宣传委员 |
| `publicity` | 宣传子记录 | 宣传素材列表 | FileSpaceRecord（category 为 publicity 类） | 宣传委员 |

**子记录关键规则：**

| 规则 | 说明 | 实现要求 |
|---|---|---|
| **自增表格** | 每种子记录类型支持动态添加行 | UI 层提供行级增删操作，数据层支持 items 数组动态 push/splice |
| **统一绑定** | 所有子记录通过 `parentId` 绑定到主记录 `id` | 子记录必须包含 `parentId` 字段（对应实现层 `activityId`），查询时按此字段过滤 |
| **权限继承** | 子记录的操作权限继承自主记录的当前管理者角色 | 子记录不单独设权限，由主记录的 `can()` 结果决定读写权限（见 §2.2 角色权限数据） |
| **写入留痕** | 子记录项须含 `recordedAt`(ISO) + `recordedBy`(短 ID) | T-209 改进项③：push 时写入当前时间与操作人；详情面板字段表追加「时间」列展示（时间戳全由表单写入，非系统派生） |

#### 2.1.2 活动分类体系（2026-07-31 重构）

> **设计理念**：活动顶层分类为两大类，三会一课固定分类，主题党日使用正交维度。
> **指示**（2026-07-31）：活动分类应清晰表达层次关系，避免视觉混乱。

**活动顶层分类**：

**1. 三会一课**（固定分类，无正交维度）

- 支部党员大会
- 支委会
- 党小组会
- 党课

> **组织生活会**（`scenarioId: 'org-life'`）是**会议内容**（如开展批评与自我批评），不是三会一课的子类（2026-08-01/2026-08-07 决策）：组织生活会由三会之一召开（支部党员大会开组织生活会 / 党小组会开组织生活会均可），**形式归入三会一课系、内容不单独成类**。故：不进查询子类 chips、不进写入表单（活动名称写"XX组织生活会"即可表达）；系统既定形式映射 `org-life → party-group-meeting`（党小组会）；颜色/简称/图例均按三会一课系（党建红）呈现，SOP 场景独立保留（见 `sopData.js`）。

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

> 角色类型定义位于 [core/state.js](../../../docs/src/core/state.js#L18-L28)，标签/颜色位于 [core/constants.js](../../../docs/src/core/constants.js)
> 权限的详细解释见 [ROLE_CLASSIFICATION.md §九 角色权限矩阵](../../02_institution/ROLE_CLASSIFICATION.md)。本节为该权威源在数据层 ACL 中的切面视图，冲突时以权威源为准。

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

> 权限矩阵、模块可见性、数据共享规则的完整定义见 [ROLE_CLASSIFICATION.md §九](../../02_institution/ROLE_CLASSIFICATION.md) + [MODULE_UI_DESIGN.md](../module/MODULE_UI_DESIGN.md)。本节不重复展开，仅指向权威源。

**关键规则要点**（详细规则见权威源）：
- 基础 ACL 实现：[domain.js `can()`](../../../docs/src/core/domain.js#L78-L91)
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

> 长期活动/系列活动属于时间维度的重复模式，与专班（人员维度的组织结构）相区分。

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

> 类型定义位于 [domain.js](../../../docs/src/core/domain.js#L34-L45)
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
| developStage | `'积极分子'\|'发展对象'\|'预备党员'\|'正式党员'` | 否 | -- | 发展阶段（D-239 统一中文枚举；2026-08-01 决策收敛为四阶段，移除【入党申请人】） |
| partyGroup | string | 否 | -- | 所属党小组 |

**出勤状态枚举：**

| 值 | 中文 | 说明 |
|---|---|---|
| `present` | 出席 | 按时到场 |
| `absent` | 缺席 | 未到场（触发补课机制，T+7 内完成） |
| `leave` | 请假 | 事假须提前1天申请；病假可事后补假 |
| `made_up` | 已补 | 补课完成后考勤状态变更为"已补"（§2.17.2 补课制度） |

**发展阶段枚举（D-239 统一中文，2026-08-01 收敛为四阶段）：**

> 决策（2026-08-01）：从系统简洁性出发，系统身份不考虑【入党申请人】这一档，仅保留 积极分子/发展对象/预备党员/正式党员。原【入党申请人】人员并入积极分子。关于页仍保留"从入党申请人到正式党员"的完整党章流程叙事（宣传教育用途，非系统身份档位），其中须点明"递交入党申请书须年满十八周岁"这一时间前提。

| 值 | 说明 |
|---|---|
| `积极分子` | 入党积极分子 |
| `发展对象` | 发展对象 |
| `预备党员` | 预备党员 |
| `正式党员` | 正式党员 |

### 2.6 分工数据 (AssignmentRecord)

> 类型定义位于 [domain.js](../../../docs/src/core/domain.js)

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

> 类型定义位于 [domain.js](../../../docs/src/core/domain.js)（`OutputType` / `OUTPUT_ROUTES` / `deriveOutputRoute`）
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
| 宣传材料 | 宣传委员拍摄 / 组织者打包提交（深度参与者素材） | 宣传委员归档 | 产出物查看区 |
| 复盘总结 | 组织者 | 纪检批注/确认 | 活动关闭前置 |
| 专班工作量 | 专班成员 | 系统自动记录 | 解散报告 → 个人档案 |
| 思想汇报 | 党员本人 | 组织委员归档 | 个人档案（不经纪检/宣传） |

> **同一套数据**：产出物区与各录入入口读取同一份数据（`parent_record[byproduct] == 各入口读取值`），不重复录入。

### 2.8 补课任务 (MakeupTask)

> 类型定义位于 [makeup.js](../../../docs/src/services/makeup.js)（`autoGenerateMakeupTask` 动态生成）

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

> 类型定义位于 [notice.js](../../../docs/src/services/notice.js)

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

> 类型定义位于 [domain.js](../../../docs/src/core/domain.js)

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

> 类型定义位于 [domain.js](../../../docs/src/core/domain.js)

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

> 类型定义位于 [domain.js](../../../docs/src/core/domain.js#L59-L66)

| 字段名 | 类型 | 必填 | 默认值 | 说明 |
|---|---|---|---|---|
| id | string | 是 | `generateId('tsk')` | 唯一标识符，前缀 `tsk_` |
| activityId | string | 是 | -- | 所属活动 ID |
| title | string | 是 | -- | 任务标题 |
| status | `'pending'\|'in_progress'\|'completed'` | 是 | `'pending'` | 任务状态 |
| createdAt | string (ISO) | 是 | `new Date().toISOString()` | 创建时间（审计字段） |

### 2.13 应用状态数据 (appState)

> 定义位于 [core/state.js](../../../docs/src/core/state.js#L126-L146)

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

> 定义位于 [core/state.js](../../../docs/src/core/state.js#L32-L37)

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

> 定义位于 [sopData.js](../../../docs/src/workflow/sopData.js)

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

> 定义位于 [definitions.js](../../../docs/src/workflow/definitions.js)

**通用状态节点：**

| 状态名 | 中文标签 | 所属阶段 | 可编辑 | 超时(h) |
|---|---|---|---|---|
| DRAFT | 草稿 | 策划 | 是 | 168 (短期) / 336 (长期) |
| PENDING_EXPANDED | 待支委扩大会讨论 | 审批 | 否 | 48 (短期) / 96 (长期) |
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

> 类型定义与权威实现位于 [issues.js](../../../docs/src/services/issues.js)（IssueStore），权威源 `docs/data/issues.json`

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

> **书记处置权设计**（2026-08-09 P-011 重写联动，倒写自 issues.js）——意见反馈处置权归书记独有：全员可参与开源讨论（issue.create / comment.add / reaction.toggle / mention / reference），但处置动作仅书记可执行，类比 GitHub maintainer 唯一拥有 merge/close 权（详见 [insights §2.2](../../insights/党支部管理与实务经验沉淀.md) D-244/T105 与 [COMMISSIONER_FRAMEWORK §C.1b](../../02_institution/COMMISSIONER_FRAMEWORK.md) 党课/意见反馈规则）。这是 P-012 分工的运行保障（书记仲裁）的落点。

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

> 类型定义位于 [domain.js](../../../docs/src/core/domain.js)（ReviewRecord typedef + ReviewStatus 枚举）
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

> **设计依据**：最小三成本原则（见 [DESIGN_SYSTEM.md §一 第2条](../design-system/DESIGN_SYSTEM.md)）——任务流默认直接展示在工作台，不要求用户额外操作才能看到"我需要做什么"。
> **派生来源**：通知派生（§2.19）+ 活动生命周期事件派生 + 专班生命周期事件派生 + 手动创建。
> **类型定义将位于** [domain.js](../../../docs/src/core/domain.js)（待新增）。

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

### 2.20.1 文件空间记录 / 图片记录（T-304 D 档·权威字段表）

> **编者注（2026-09-03）**：本节为追加补建，原以 `## 2.26` 游离于 §2.20 之后（2.21~2.25 缺号系历史编号笔误），现归位为 §2.20.1 子节；新补域自 §2.21 起续编。
> **定位**：宣传委员上传宣传材料（照片/新闻稿/视频等）落「文件空间」；文件元数据与文件实体分离存储。
> **双模式**：mock 模式 `fileData`（base64 dataURL，本地存储）；server 模式 `filePath`（服务端磁盘路径，受保护静态下载 `/api/v1/uploads/:name`）。
> **读写闭环**：创建（`archive-tab` 上传）→ 读取（档案列表/产出物区渲染）→ 下载（mock 直下 / server 鉴权拉取）→ 删除（`DELETE /api/v1/fileSpaceRecords/:id` 联动删物理文件）。类型定义见 [domain.js](../../../docs/src/core/domain.js) `FileSpaceRecord` / `ImageRecord` typedef。

#### FileSpaceRecord

| 字段名 | 类型 | 必填 | 说明 |
|---|---|---|---|
| id | string | 是 | 记录 ID（mock `ar-u-*` / server UUID） |
| activityId | string \| null | 否 | 关联活动 ID |
| activityName | string | 否 | 关联活动名（快照冗余） |
| category | `'新闻稿'\|'照片'\|'视频'\|'其他'` | 否 | 材料类别 |
| fileName | string | 是 | 原始文件名（下载命名） |
| fileSize | number | 是 | 文件字节数 |
| filePath | string | 否 | server 模式下载路径（`/api/v1/uploads/xxx`） |
| fileData | string | 否 | mock 模式 base64 dataURL（≤2MB 本地容量约束） |
| status | `'archived'\|'in_progress'\|'pending'` | 否 | 归档状态 |
| archiveDate | string (YYYY-MM-DD) | 否 | 归档日期 |
| uploadedBy | string | 否 | 上传人 personId |
| createdAt | string (ISO) | 否 | 创建时间 |

#### ImageRecord

| 字段名 | 类型 | 必填 | 说明 |
|---|---|---|---|
| id | string | 是 | 记录 ID |
| filePath / fileData | string | 二选一 | 同 FileSpaceRecord 双模式 |
| fileName | string | 是 | 文件名 |
| fileSize | number | 是 | 字节数 |
| uploadedBy / uploadedAt | string | 是 | 上传人 / 时间 |

#### 删除语义（防孤儿文件）

- **server 模式**：`DELETE /api/v1/fileSpaceRecords/:id` 与 `DELETE /api/v1/imageRecords/:id` 在删记录前联动 `deleteUploadedFile(filePath)` 删除物理文件（[resources.js](../../../server/routes/resources.js) L96-105，T-304 D 档扩展）。
- **mock 模式**：删除 `mockDB.archiveRecords` 对应记录 + `persist()`，无物理文件。

---

> **党委两级治理数据域补录（P1~P3 · 2026-09-03）**：支部多实例两级治理新增数据域统一在此续编 §2.21~§2.24（沿用 §2.20.1 归位后自 2.21 起的编号）。设计定案见 [PARTY_COMMITTEE_DESIGN.md](../evolution/PARTY_COMMITTEE_DESIGN.md)；服务端表/路由接线见 [db.js](../../../server/db.js) 与 [resources.js](../../../server/routes/resources.js)；类型定义位于 `docs/src/core/domain.js`（mockDB 成员）+ `docs/src/services/{branch,appointment,review-request}.js`。

### 2.21 支部实例数据 (BranchRecord)

> 支部**不预设名字**，由党委动态创建/改名（硕博等支部随时可加）；`config` 为支部配置档案（header 软编码/主题/启停模块/文件空间隔离）。

| 字段名 | 类型 | 必填 | 默认值 | 说明 |
|---|---|---|---|---|
| id | string | 是 | `generateId('br')` | 支部实例 ID（seed 为 `br-b1`） |
| name | string | 是 | -- | 支部名称（党委命名） |
| type | string | 否 | `''` | 类型类别标签（自由文本，不预设枚举：如 硕士/博士/本科生） |
| config | object | 是 | 见下 | 支部配置档案 |
| secretaryId | string \| null | 否 | `null` | 现任书记 personId（P2 起由任命链维护，访问书记工作台以本值为准） |
| status | `'active'` | 是 | `'active'` | 支部状态 |
| createdAt | string (ISO) | 是 | -- | 创建时间 |

**config 配置档案（sub）**：

| 字段名 | 类型 | 必填 | 默认值 | 说明 |
|---|---|---|---|---|
| headerTitle | string | 是 | = name | header 品牌**软编码**（改支部名自动同步；header 标题随支部更换） |
| accent | string \| null | 否 | `null` | 支部主题色（可选，默认党建红不变） |
| enabledModules | string[] \| null | 否 | `null` | 该支部启用的能力/场景清单（null=全开兼容现有演示；远期「工作流块拖拽编排」自动写回此处，见 [ARCHITECTURE_EVOLUTION §八](../evolution/ARCHITECTURE_EVOLUTION.md)） |
| fileSpaceIsolated | boolean | 是 | `true` | 支部文件（branchDocs）/附件一支部一独立存储空间——按 branchId 分区、跨支部不可见 |

### 2.22 书记任期记录 (AppointmentRecord)

> 党委任命/撤换书记的任期档案；`to=null` 表示现任。任命即三写：`branches.secretaryId` + 双方 `users.role` 同步 + 本记录封口/新建。

| 字段名 | 类型 | 必填 | 默认值 | 说明 |
|---|---|---|---|---|
| id | string | 是 | `generateId('appt')` | 任期记录 ID |
| branchId | string | 是 | -- | 所属支部 |
| secretaryId | string | 是 | -- | 被任命人 personId |
| appointedBy | string | 是 | `'party-staff'` | 任命方 personId（党委组织员） |
| note | string | 否 | `''` | 任命说明（如 换届选举 2026-09） |
| from | string (ISO) | 是 | -- | 任期开始时间 |
| to | string (ISO) \| null | 是 | `null` | 任期结束时间（null=现任；撤换时旧记录封口） |

### 2.23 支部上报审批记录 (ReviewRequest)

> P3 双向治理通道·上报半侧：支部书记/副书记发起（发展节点/活动报备）→ 党委逐项批/驳（驳回须意见）→ 结论回传支部侧同页可见。

| 字段名 | 类型 | 必填 | 默认值 | 说明 |
|---|---|---|---|---|
| id | string | 是 | `generateId('rq')` | 上报记录 ID |
| branchId | string | 是 | -- | 上报支部 |
| type | `'develop-node'\|'activity-report'` | 是 | -- | 上报类型：发展节点（泛化：确定积极分子/发展对象、接收预备、转正等）/ 活动报备（重要活动） |
| title | string | 是 | -- | 事项标题 |
| content | string | 是 | -- | 事项说明（时间/对象/依据等） |
| status | `'pending'\|'approved'\|'rejected'` | 是 | `'pending'` | 审批状态 |
| submittedBy | string | 是 | -- | 提交人 personId（书记/副书记） |
| decidedBy | string \| null | 否 | `null` | 审批人 personId（党委组织员） |
| decidedAt | string (ISO) \| null | 否 | `null` | 审批时间 |
| decisionNote | string | 否 | `''` | 审批意见（驳回必填；批准可附指导意见） |
| createdAt | string (ISO) | 是 | -- | 提交时间 |

### 2.24 党委下发通知扩展（复用 Notice，不新建领域）

> P3 双向治理通道·下发半侧：党委选目标支部下发 → **复用通知实体**，仅目标支部支委层成员在通知入口可见（书记 2026-09-03 裁定：能复用就复用，不新建「下发箱」领域）。

§2.9 通知基础字段不变，下发时额外写入：

| 字段名 | 类型 | 必填 | 说明 |
|---|---|---|---|
| source | `'committee'` | 是 | 来源标记：`'committee'` = 党委下发；缺省 = 支部自发通知（信息性/行动性） |
| audience | `'committee'` | 是 | 取值说明：既有字段（§2.19.1 起通知发布用）为受众群体**数组**；党委下发取常量 `'committee'`（字符串）表示「本支部支委层」 |
| branchId | string | 是 | 目标支部（支部动态创建后自动可选） |
| branchName | string | 否 | 目标支部名快照（支部后续改名不使历史下发漂移） |
| publisher | string | 否 | 展示覆盖 `'院党委（组织员）'`（通知详情「通知者」不按 targetModule 推断） |
| recipients | string | 否 | 展示覆盖 `'支部委员会（支委层）'` |

**受众过滤规则**（`NoticeStore.list()`）：`audience === 'committee'` 的通知仅对「目标 branchId 支部且角色为支委层（书记/副书记/组织/宣传/纪检）」的当前登录用户可见；普通党员、党委组织员（非支委）一律不可见。支部端「已发布通知」管理区不展示上级下发（只读治理信息，不可删改）。

---
