---
title: "数据模型与数据流"
type: design
role: "[工程师]+[AI]"
version: "1.0"
last_updated: "2026-09-26"
status: active
related_files: [content/02_institution/SYSTEM_ROLE_PERMISSION.md, content/02_institution/COMMISSIONER_DUTY_FRAMEWORK.md, content/02_institution/sop/纪检委员工作流程指南.md, content/03_doc_system/ARCHITECTURE.md]
---

# 数据模型与数据流

> **总述：** 本文是系统**数据**的唯一权威源，回答两件事——**「有哪些数据、每类数据的字段是什么」**（第一部分 · 数据模型，静态结构）与**「数据如何产生、流动、聚合」**（第二部分 · 数据流，动态过程）。两半是同一套数据的两个切面：模型侧定义结构，流侧定义过程；结构变更或流向变更都须两侧同步。第三部分列出本文不重复展开的权威源。
> **受众：** [工程师]+[AI] —— 供开发决策参考，确保数据结构变更时全栈一致。
> **权限矩阵**：本文档含权限简表，完整定义见 [SYSTEM_ROLE_PERMISSION.md](../../02_institution/SYSTEM_ROLE_PERMISSION.md)（系统角色权限矩阵，代码键级权威）。
> **本文不回答**：① **沿革与「哪一批做了什么」** → `.ctx/logs/YYYY-MM-EXECUTION_LOG.md`；② **权限矩阵的完整定义** → [SYSTEM_ROLE_PERMISSION.md](../../02_institution/SYSTEM_ROLE_PERMISSION.md)（冲突时以权威源为准）；③ **架构分层与目录结构** → [ARCHITECTURE.md](../../03_doc_system/ARCHITECTURE.md)；④ **登录门控与部署** → [DEPLOYMENT_GUIDE.md §四 / §二](../deploy/DEPLOYMENT_GUIDE.md)。

---

## 第一部分　数据模型（静态结构）

> 本部分＝静态数据结构：实体字段表、枚举、表结构与单一源清单（§编号沿用 §2.x / §三）。

## 二、数据模型设计

### 2.1 活动数据 (ActivityRecord)

> 类型定义位于 [domain.js](../../../docs/src/core/domain.js#L11-L33)（Activity typedef）

| 字段名 | 类型 | 必填 | 默认值 | 说明 |
|---|---|---|---|---|
| id | string | 是 | `generateId('act')` | 唯一标识符，前缀 `act_` |
| title | string | 是 | -- | 活动标题 |
| type | string | 是 | -- | 活动类型。类型体系（两大顶层非并列）：三会一课系含支部党员大会/支委会/党小组会/党课（组织生活会是**内容**而非子类，由三会之一召开，见 §2.1.2）；主题党日系含 `type='主题党日'` + 载体见 `carriers`。查询筛选按 `classifyActivityType` 级联展示 |
| status | `'draft'\|'published'\|'ongoing'\|'completed'\|'cancelled'` | 是 | `'draft'` | 活动存储状态；页面展示态由生命周期派生（见下方"活动生命周期展示态"） |
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
| deliverableIds | string[] | 否 | -- | ~~关联交付物 ID 列表~~（已废弃，交付物由 FileSpaceRecord 覆盖） |
| isBrand | boolean | 否 | `false` | 品牌属性标签（**认定＝支委/党小组组长提案 → 支委会通过后确定**——有党小组组长参会即支委扩大会、支书主持支委会；不影响工作流选择，仅作筛选展示）。认定流程：支委/党小组组长识别潜力并提案 → 支委会（或支委扩大会）讨论通过 → 系统上由支委会议程项「记录结果 · 通过」置 `isBrand = true`（**无「点一下即认定」入口**）。认定依据与案例见 [insights §5.2](../../insights/党支部管理与实务经验沉淀.md)。 |
| carriers | string[] | 否 | -- | 主题党日活动载体（理论学习/实践参访/交流座谈/其他），与写入表单正交维度对齐 |
| isJoint | boolean | 否 | `false` | 共建性质（共建开展为 true） |
| brandName | string | 否 | -- | 品牌族名称（如"五四精神传承"/"人生回望录"），支委会认定 isBrand 后由写入表单"延续已有品牌/创建新品牌"补录 |
| agenda | `Array<{item: string, host?: string}>` | 否 | `[]` | 会议议程（三会一课专用：逐条议题 + 可选主持人）。创建时经写入表单"会议议程"区块填写；会后可在活动详情修改 |
| organizer | string | 否 | -- | 组织者 personId。写入时缺省＝创建人本人；若 `assignments` 中已指定组织者，创建链按主源同步为被指定人（`writeActivityWithSOP` 原则7「同一套数据」）。读端（归档 / 首页 / 复盘卡 / inspector）消费本字段 |
| direction | `'top-down'\|'bottom-up'` | 否 | `'bottom-up'` | 发起方向：自上而下（支部部署）/ 自下而上（党小组发起）；由组长写入表单 L4 级选定 |
| hostGroup | string\|null | 否 | null | 承办党小组（组长写入时固化）。考勤「应到」与考察上传位判据优先取它、缺省回退组织者所属小组 |
| assignments | `Array<{personId: string, role: 'organizer'\|'deep'\|'participant'}>` | 否 | `[]` | 活动参与人 / 项目内角色的内联登记主源（边界见 §2.1.3）。创建时随指定写入，`AuthStore.authorize` 按它判项目身份；**非空时不再派生组长赋权待办** |
| signupEnabled | boolean | 否 | `false` | 开放报名开关（SOP-B-2）：勾选后该活动可被报名；草稿态默认不可报名，须本字段为 `true` 才放开。**与下行的分工**：本字段＝写入活动时的「是否开放报名」，关闭动作见 `signupClosed` |
| signupClosed | boolean | 否 | `false` | 本场报名是否已**手动关闭**（SOP-B-2 · 支书 2026-09-20 定案「不设截止，但组织者可手动关」）：置 `true` 后成员不能**新报**（判据单一出口 `services/signup.js::_sourceOpen`），**已报名者仍可自行取消**；可关者＝**本场组织者（判据 `isActivityOrganizer`）＋ 支书/副支书**，入口在活动详情页报名区块旁。**不设「报名截止时点」字段** |
| requireMakeup | boolean | 否 | `false` | 活动级「本次要求补课」（SOP-B-6）：党小组会等**不默认补课**的类型，勾选后才进补课名单（补课范围单一出口 `isMakeupRequired`） |
| voteConfig | object\|null | 否 | null | 线上异步表决配置 `{mode, optionSet, ballotMode, voterScope, voterIds[], quorumCheck}`：决策类场景选「线上异步表决」时固化应到名单快照；**线下开会不写本字段**（读侧无此字段＝旧活动 / 线下） |
| isOutdoor | boolean | 否 | `false` | 是否外出（校外）活动——主题党日正交维度之二（见 §2.1.2）。写入后弹「外出提醒清单」（**是提醒、非必填、不作校验**） |
| deepWorkMode | object | 否 | -- | 深参分工的完成方式（2026-09-23 批次 156）：形状 `{ [taskId]: 'in-system' \| 'offline' }`——写入活动时由组织者**逐项**勾选「系统内做 / 去线下做」，项＝该场景 SOP 任务链里 `executor==='deep'` 的节点（无深参项的场景不写本字段）；**缺省 / 非法值读侧一律按 `in-system`**（＝既有行为零变化）。单一源 `docs/src/services/activity.js`（`DEEP_WORK_MODE` / `DEEP_WORK_MODE_LABEL` / `deepWorkModeOf`），写入位 `docs/src/entries/tabs/leader/write-tab.js`。 |

> **设计注记（活动写入表单必有地点字段，出处见 insights §6.6）**：活动写入表单不得只含日期而没有地点——"什么时候"和"在哪里"是参与者最基本的信息需求，缺少任何一个，表单就是不完整的。适用：任何活动写入/编辑表单设计，与字段表 `location` 行（含线上会议链接场景）配套阅读。

**活动存储状态：**

| 状态值 | 含义 | 说明 |
|---|---|---|
| `draft` | 草稿 | 可编辑，尚未发布 |
| `published` | 已发布 | 已通知相关人员 |
| `ongoing` | 进行中 | 活动正在执行 |
| `completed` | 已结束 | 执行完毕（字面值仅用于存储，展示一律用下方生命周期派生态） |
| `cancelled` | 已取消 | 仅存于存储层字面值；展示态由下方生命周期表 `cancelled` 行派生（`status='cancelled'` → 徽章「已取消」） |

**活动生命周期展示态：**

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

> "已完成"不再作为活动状态字面值出现。

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
| **写入留痕** | 子记录项须含 `recordedAt`(ISO) + `recordedBy`(短 ID) | push 时写入当前时间与操作人；详情面板字段表追加「时间」列展示（时间戳全由表单写入，非系统派生） |

#### 2.1.2 活动分类体系

> **设计理念**：活动顶层分类为两大类，三会一课固定分类，主题党日使用正交维度。
> **指示**（2026-07-31）：活动分类应清晰表达层次关系，避免视觉混乱。

**活动顶层分类**：

**1. 三会一课**（固定分类，无正交维度）

- 支部党员大会
- 支委会
- 党小组会
- 党课

> **组织生活会**是**会议内容**（如开展批评与自我批评），不是三会一课的子类：组织生活会由三会之一召开（支部党员大会开组织生活会 / 党小组会开组织生活会均可），**形式归入三会一课系、内容不单独成类**。故：不进查询子类 chips、不进写入表单（活动名称写"XX组织生活会"即可表达）；**独立场景与形式映射均已取消**——组织生活会**不再单列场景**、随所承接的三会形式走；颜色/简称/图例仍按三会一课系（党建红）呈现（按**活动类型键**「组织生活会」取值）。

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
  carrierOther: null,       // 其他载体（需支书权限）
}
```

#### 2.1.3 参与人双入口边界

> **背景**：`activity.assignments`（活动参与人）与 `AuthStore.authorize`（项目级授权）是两个**相互独立**的入口，数据同源原则要求文档明确二者边界，避免"参与人=被赋权人"的误读。

| 入口 | 数据载体 | 写入时机 | 语义 | 派生影响 |
|---|---|---|---|---|
| **活动参与人** | `activity.assignments: Array<{personId, role:'participant'}>`（活动创建时内联） | 支书/组长创建活动表单勾选参与人 | 记录"谁参加本次活动"（参与层） | **非空时不再派生组长赋权待办**（calendar-tab.js 内联赋权）；不影响 organizer/deep 项目角色 |
| **项目级授权** | `AuthStore.authorize` 写主源（活动 `assignments` / 专班 `members`）+ 审计快照键 `sop_org_os_auth_audit`（旧键 `gsm1921-auth-grants` 已废弃） | 支书工作台「项目赋权」Tab 单独操作 | 授予"组织者/深度参与者"项目角色权限（活动/专班共用全局授权体系） | 派生对应对应项目的管理权限，与参与人名单无关 |

**边界规则**：
1. 活动参与人是**活动级事实**，只回答"谁参加"；项目角色授权是**权限级事实**，只回答"谁能管这个项目"。
2. 两个入口数据互不读写：勾选参与人不会自动产生 organizer/deep 授权；项目赋权也不会把被赋权人塞进参与人名单。
3. 派生存档的待办链依据同上：组长赋权待办仅在 `assignments` 为空时派生（活动创建无参与人 → 提示组长补录参与人）；项目角色授权待办独立派生。

### 2.2 角色与权限数据

> 角色类型定义位于 [core/state.js](../../../docs/src/core/state.js#L18-L28)，标签/颜色位于 [core/constants.js](../../../docs/src/core/constants.js)
> 权限的详细解释见 [SYSTEM_ROLE_PERMISSION.md](../../02_institution/SYSTEM_ROLE_PERMISSION.md)（§9a0 角色键全表 / §9a~§9g 权限矩阵与赋权链）。本节为该权威源在数据层 ACL 中的切面视图，冲突时以权威源为准。

#### 2.2.1 角色常量定义

> **角色键权威见 [SYSTEM_ROLE_PERMISSION.md §9a0](../../02_institution/SYSTEM_ROLE_PERMISSION.md) / `core/constants.js ROLE_KEYS`（代码层单一事实源：13 键 = 11 业务键 + 2 遗留键），本表仅记录字段枚举与展示分组，冲突时以权威源为准。**

| 角色键 | 中文标签 | 首页日历角色分组 | 所属分类 |
|---|---|---|---|
| `participant` | 默认参与者 | participant | 参与层 |
| `leader` | 党小组组长 | manager | 支委（组长） |
| `org-commissioner` | 组织委员 | manager | 支委 |
| `prop-commissioner` | 宣传委员 | manager | 支委 |
| `disc-commissioner` | 纪检委员 | manager | 支委 |
| `organizer` | 组织者 | manager | 项目角色 |
| `deep` | 深度参与者 | manager | 项目角色 |
| `secretary` | 党支书 | manager | 支委（支书） |
| `deputy-secretary` | 副支书 | manager | 支委（副支书） |
| `party-staff` | 党委组织员 | -- | 组织级角色（院系党委，不属于任一支部） |
| `commissioner` | 条条委员 | -- | 遗留键（ROLE_LEGACY_KEYS；业务语义见下方 COMMISSIONER_ROLES 集合） |
| `initiator` | 发起人 | -- | 遗留键（ROLE_LEGACY_KEYS，无独立角色语义，兼容兜底） |
| `global` | 全局视图 | global | 参考指南专用（state.js ROLE_TYPES 键，非业务角色键） |
| `all` | 全体相关 | participant | **非角色键**：已自 `ROLE_LEGACY_KEYS` 撤除（不是角色、解析不到具体人）；仅作参考指南参与者视角的展示键（参考指南显示兜底） |

> 注：`deputy-secretary` / `party-staff` 已入 `constants.js ROLE_KEYS`，但不在 state.js 首页日历 ROLE_TYPES 中——日历分组列对其按 `ROLE_PAGE_MAP` 归属展示（deputy-secretary → secretary.html 支书工作台；party-staff → party-committee.html 党委工作台，登录直达）。`organizer`/`deep` 无独立工作台页面（归入首页「我的角色」区块）。

**管理角色集合** (`MANAGEMENT_ROLES`): `leader`, `org-commissioner`, `prop-commissioner`, `disc-commissioner`, `organizer`, `deep`, `secretary`

**支委角色集合** (`COMMISSIONER_ROLES`): `commissioner`, `org-commissioner`, `prop-commissioner`, `disc-commissioner`

#### 2.2.2 ACL 基础规则与模块权限

> 权限矩阵、模块可见性、数据共享规则的完整定义见 [SYSTEM_ROLE_PERMISSION.md](../../02_institution/SYSTEM_ROLE_PERMISSION.md) + [MODULE_UI_DESIGN.md](../module/MODULE_UI_DESIGN.md)（历史模块可见性设计论证仍可读）。本节不重复展开，仅指向权威源。

**关键规则要点**（详细规则见权威源）：
- 基础 ACL 实现：[services/auth.js `AuthStore.canDo(personId, action, context)`](../../../docs/src/services/auth.js#L477-L496)（ROLE_PERMISSIONS + PROJECT_PERMISSIONS 并集判定；旧 domain.js `can()` 已移除）
- 特殊资源 `evaluation`（考察档案）: 仅 `secretary` 和 `org-commissioner` 可读写，其他角色绝对隔离
- 宣传委员不可创建活动（仅党支书和党小组组长可创建），但任何活动创建后应自动出现在宣传委员的视图中
- 支委身份选择：sidebar "支委" 卡片 → 模态框选择 → `setState({ selectedRole })` → 工作台「我的职责」Tab 分组面板按角色显示对应支委面板
- 支书独占能力：党课布置、主持大会、全局视角切换、赋权管理（详见 SYSTEM_ROLE_PERMISSION.md §9b）

### 2.3 专班数据 (TaskForceRecord)

> 专班为人员维度组织结构，由 `TaskForceRecordStore`（services/taskforce.js）实体化管理，存储于 `mockDB.taskforces`（随全量键 `workflowos_branch_db_v1` 持久化），组织委员面板看板展示。

| 字段名 | 类型 | 必填 | 默认值 | 说明 |
|---|---|---|---|---|
| id | string | 是 | `generateId('tf')` | 唯一标识符，前缀 `tf_` |
| name | string | 是 | -- | 专班名称 |
| type | string | 是 | -- | 专班类型 |
| status | `'recruiting'\|'active'\|'archived'\|'dissolved'` | 是 | `'recruiting'` | 专班状态（状态机见 TaskForceRecordStore：recruiting → active → archived/dissolved） |
| activityId | string\|null | 否 | `null` | 关联活动 ID（专班与活动互斥，为 null） |
| createdBy | string | 是 | -- | 创建者 ID |
| createdAt | string (ISO) | 是 | -- | 创建时间 |
| members | `Array<{personId: string, role: 'organizer'\|'deep'\|'participant', contributions: string[]}>` | 否 | `[]` | 专班成员对象数组（项目角色主源之一：organizer/deep 在此登记，含工作量 contributions；非字符串 ID 列表） |
| description | string | 否 | -- | 专班描述 |

> **字段核对**：mock/seed 另含展示字段 `task`/`manager`/`initiator`/`capacity`/`deadline`（见 [mock/taskforces.js](../../../docs/src/mock/taskforces.js) 样本），未列为必填模型字段。

**项目角色赋权与审计**：遗留键 `sop_org_os_assigned_roles` 已删除（services/roles.js 启动时清理一次存储残留，无调用方）。项目角色（organizer/deep）以**主源**为准——活动挂 `activity.assignments`、专班挂 `members`；`AuthStore.authorize` / `revokeAuthorization` / `syncProjectRoles` 写主源 + 追加审计快照：

```js
// 主源（运行时实体，随活动/专班持久化）
activity.assignments: Array<{ personId, role: 'organizer' | 'deep' | 'participant' }>
taskforce.members:    Array<{ personId, role: 'organizer' | 'deep' | 'participant', contributions: string[] }>
// 审计快照（独立 localStorage 键，只增不改；撤销为追加 action:'revoke' 记录，判定取最新一条）
// 键: 'sop_org_os_auth_audit'（AUDIT_KEY，services/auth.js）
// 记录: { id, targetPersonId, role, scopeRef(活动/专班 ID), authorizedBy, authorizedAt, action: 'grant'|'revoke' }
```

**专班成员展示**：由专班 `members` 主源渲染（组织委员/宣传委员看板按需取用），不再经赋权记录。

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
- **系列活动** (SeriesRecord)：时间重复模式，党小组组长创建、支书审核
- **专班** (TaskForceRecord)：人员组织结构，组织委员招募统筹

### 2.5 考勤数据 (AttendanceRecord)

> 类型定义位于 [domain.js](../../../docs/src/core/domain.js#L35-L46)（AttendanceRecord typedef）
> **字段命名说明**：`personId` 统一为人员标识字段。代码中仍使用 `userId`，待后续同步。

| 字段名 | 类型 | 必填 | 默认值 | 说明 |
|---|---|---|---|---|
| id | string | 是 | `generateId()` | 唯一标识符 |
| activityId | string | 是 | -- | 所属活动 ID |
| personId | string | 是 | -- | 参会成员人员 ID（统一命名，代码中为 userId） |
| status | `'present'\|'absent'\|'leave'` | 是 | -- | 出勤状态（出席/缺席/请假） |
| recordedBy | string | 是 | -- | 记录人用户 ID（纪检委员） |
| recordedAt | string (ISO) | 是 | -- | 记录时间 |
| studentId | string | 否 | -- | 学号 |
| developStage | `'积极分子'\|'发展对象'\|'预备党员'\|'正式党员'` | 否 | -- | 发展阶段（统一中文枚举） |
| partyGroup | string | 否 | -- | 所属党小组 |

**出勤状态枚举：**

| 值 | 中文 | 说明 |
|---|---|---|
| `present` | 出席 | 按时到场 |
| `absent` | 缺席 | 未到场（触发补课机制，T+7 内完成） |
| `leave` | 请假 | 事假须提前1天申请；病假可事后补假 |
| `made_up` | 已补 | 补课完成后考勤状态变更为"已补"（补课任务结构见 §2.8 MakeupTask） |

**发展阶段枚举（统一中文）：**

> 系统身份不考虑【入党申请人】这一档，仅保留 积极分子/发展对象/预备党员/正式党员；【入党申请人】人员并入积极分子。关于页仍保留"从入党申请人到正式党员"的完整党章流程叙事（宣传教育用途，非系统身份档位），其中须点明"递交入党申请书须年满十八周岁"这一时间前提。

| 值 | 说明 |
|---|---|
| `积极分子` | 入党积极分子 |
| `发展对象` | 发展对象 |
| `预备党员` | 预备党员 |
| `正式党员` | 正式党员 |

#### 2.5.1 考察数据 (InspectionRecord)

> 类型定义位于 [domain.js](../../../docs/src/core/domain.js#L165-L177)（InspectionRecord typedef），持久化域 `mockDB.inspections`（`domain.js:245`，随全量键 `workflowos_branch_db_v1` 持久化）。考察记录为**工作量记录**（对象：组织者/深度参与者；适用：所有支部工作），与考勤（0-1 出席变量，对象：党员+预备党员）相区分（见本文 §3.3）。

| 字段名 | 类型 | 必填 | 默认值 | 说明 |
|---|---|---|---|---|
| id | string | 是 | `generateId('insp')` | 唯一标识符，前缀 `insp_` |
| sourceType | `'activity'\|'taskforce'` | 是 | -- | 考察来源类型：活动 or 专班 |
| activityId | string | 是 | -- | 关联活动 ID（sourceType='activity' 时必填） |
| sourceName | string | 否 | -- | 来源名称（sourceType='taskforce' 时为专班名称） |
| personId | string | 是 | -- | 人员 ID（引用 people.js） |
| level | `'organize'\|'deep'` | 是 | -- | 考察层级（仅组织者与深度参与者有考察记录） |
| role | string | 是 | -- | 分工角色+描述（如：策划+全流程统筹、视频制作、PPT 设计） |
| recordedBy | string | 是 | -- | 记录人 personId |
| recordedAt | string (ISO) | 是 | -- | 记录时间 |
| status | `'pending'\|'confirmed'` | 否 | `'pending'` | 考察确认状态（纪检委员确认后录入考察总表） |

> **写入/确认链路**：党小组组长（活动）或专班负责人/组织委员上传 → 纪检委员确认后录入考察总表（与 server 端同构，见 mock-adapter.js inspections）。

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
> 产出物定向路由（spec §5.5/§8）：投递去向由产出类型派生，系统自动执行，组织者只见「提交」不见「发送对象」。

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
| 考勤数据 | 组长·组织者上传 / 纪检一体 | 纪检确认 → 考勤明细 | 组织/宣传只读同源 |
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

> 类型定义位于 [domain.js](../../../docs/src/core/domain.js#L65-L72)（Task typedef）

| 字段名 | 类型 | 必填 | 默认值 | 说明 |
|---|---|---|---|---|
| id | string | 是 | `generateId('tsk')` | 唯一标识符，前缀 `tsk_` |
| activityId | string | 是 | -- | 所属活动 ID |
| title | string | 是 | -- | 任务标题 |
| status | `'pending'\|'in_progress'\|'completed'` | 是 | `'pending'` | 任务状态 |
| createdAt | string (ISO) | 是 | `new Date().toISOString()` | 创建时间（审计字段） |

### 2.13 应用状态数据 (appState)

> 定义位于 [core/state.js](../../../docs/src/core/state.js#L71-L93)（appState 对象）

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

> 本节为内容层文件治理规则（SNAPSHOT.md / TIMESTAMPS.md 的 [AI]/[工程师] 读写角色），非前端代码状态——不指向 state.js（state.js 的 ROLE_TYPES / MANAGEMENT_ROLES 见 §2.2.1，与本节无映射关系）。

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
| timeOffset | number\|null\|'flexible' | 是 | 距 T-0 的天数偏移（null = 无时间锚点，**不实例化**；'flexible' = **不设固定提前量、由组织者自定**，仍进任务链但不带日期锚点） |
| desc | string | 否 | 任务详细描述 |

**内置场景清单（共 7 个）：**

| scenarioId | 标题 | domain | 考勤类型 |
|---|---|---|---|
| `theme-party` | 党小组主题党日活动 | activity | 弹性考勤 |
| `branch-party-meeting` | 支部党员大会 | activity | 刚性考勤 |
| `party-group-meeting` | 党小组会 | activity | 刚性考勤 |
| `party-lecture` | 党课 | activity | 刚性考勤 |
| `branch-committee` | 支委会 | activity | 支委会不考勤 |
| `attendance-check` | 查考勤记录 | organization | -- |
| `feedback-handling` | 处理意见建议反馈 | organization | -- |

> **组织生活会不单列场景**（见 §2.1.2）：它**不是独立活动类型**，由承接它的三会形式承载（`content/02_institution/sop/常见工作场景快速指南.md:75`·`:162`），活动直接记承接它的那个三会形式的 `scenarioId`。

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
| direction | `top-down` | 自上而下：支委/支书布置的任务 |
| direction | `either` | 两种发起方式均可 |

**活动属性标签：**

| 属性 | 值 | 说明 |
|---|---|---|
| isBrand | `true` | 品牌活动（**认定＝支委/党小组组长提案 → 支委会通过后确定**，不影响工作流选择） |
| isBrand | `false` | 普通日常活动 |

**3 套工作流定义模板：**

| 定义 ID | 标题 | duration | 状态数 | 状态 |
|---|---|---|---|---|
| `theme-party-day` | 主题党日活动 | short-term | 7 | active |
| `short-term` | 短期活动 | short-term | 7 | active |
| `long-term` | 长期活动 | long-term | 9 | active |

### 2.16 意见反馈数据 (IssueRecord)

> 意见反馈为 GitHub Issue 风格意见反馈系统，数据双轨（`issues.json` 权威源 + localStorage 草稿/缓存）。旧 FeedbackRecord 类型已弃用，保留向后兼容 shim（feedback.js）。

> 类型定义与权威实现位于 [issues.js](../../../docs/src/services/issues.js)（IssueStore），权威源 `docs/data/issues.json`

| 字段名 | 类型 | 说明 |
|---|---|---|
| id / number | string / number | 唯一标识符（前缀 `issue-`）/ 自增序号（GitHub Issue 风格 `#N` 展示） |
| title / body | string | 标题 / 正文（痛点与建议详细描述） |
| scope | `'permanent'\|'global'\|'role'\|'scenario'` | 影响范围：底层架构/全局规则/支委分工/特定场景 |
| types | string[] | 类型标签（如 `bug`） |
| status | `'open'\|'closed'` | 开放 / 关闭 |
| closedReason / closedAt | `'completed'\|'duplicate'\|'wontfix'\|'not_planned'` / string\|null | 关闭原因 / 关闭时间 |
| submittedBy / submittedAt | string | 提交人（**对外展示值**：匿名提交时恒为 `'匿名'`；实名时为短 ID）/ 提交日期 |
| _realPersonId | string \| 无 | **真实提交人 personId**（**仅匿名提交时落库**；2026-09-17 支书改裁「后台记录真实情况，匿名是前端的」）——**任何常规读出口一律不外泄**（公开读 / 支书读 / 提交回执 / 处置回执均脱敏），唯一可见出口＝党委核查端点 `GET /api/v1/issues/reveal`（仅 `party-staff`，**每次查看留痕**见 §2.29）。**党支部内部（含支书）不可见**：支书只有处置权，与「查看真身」是两项分开的权限 |
| assignee / assigneeRole | string \| null | 支书指派对象（personId / 角色键，如 `u_org` / `'org-commissioner'`） |
| dispatchHistory | {from, to, by, at, note}[] | 指派历史时间线（from→to 变更记录） |
| milestone | string \| null | 里程碑 |
| reactions | {thumbsUp[], thumbsDown[], eyes[], hooray[]} | 表态反应（按人列表） |
| mentions / references | string[] | 提及 / 引用 |
| participants / commentCount | string[] / number | 参与人 / 评论数 |
| hidden / mergedInto | boolean / string\|null | 支书隐藏（不在公开列表显示）/ 合并去向（被合并的 source 置位） |
| comments | {id, author, authorRole, body, createdAt, kind, hidden, hiddenBy, hiddenReason, hiddenAt}[] | 评论时间线；kind：`comment`（普通评论）/ `reply`（支书正式答复，通知汇报人）/ `dispatch`（指派事件）/ `result`（处置结果）/ `verdict`（支书终审/合并事件）。注：工作汇报型 issue 自身 `kind='report'`（issue 级，非评论时间线 kind，见 issues.js addReport） |
| resultPending / resultSubmittedAt | boolean / string\|null | 待终审标记（处置结果提交后置位） |

**匿名口径（2026-09-17 支书改裁，正面改裁）**：意见反馈的「匿名」＝**对外展示匿名**——列表 / 详情一律显示「匿名」，**后台仍记真实提交人**（`_realPersonId`）。**查看真身的权限只有党委**（`GET /api/v1/issues/reveal`，见 §2.29），**党支部内部（含支书）不可见**——支书只有处置权，「处置」与「查看真身」是**两项分开的权限**；**每次查看都留痕**。**适用范围**：本口径**只落在意见反馈**——「正式表决无记名」维持 2026-09-12 原裁定不变（两段式：参与记录 + tally，**逐人选项不落库**），任何文档不得把表决写成「党委可查」。

**处理流程（GitHub Issue 风格）**：提交(open) → 支书审阅并指派（assignee + dispatchHistory，通知被指派人）→ 公开讨论（评论+表态，全员可参与）→ 被指派人提交处置结果（kind=`result`）→ 待终审（resultPending=true，支书工作台高亮）→ 支书终审：关闭(closed) / 重新开放(reopen)。

**派生显示状态**（UI 层派生，数据层不存储，实现 `deriveIssueDisplayState`）：`开放中` → `已指派`（有 assignee）→ `待终审`（resultPending 或已有 result 评论）→ `已关闭`。

> **意见反馈处置权设计**（倒写自 issues.js）——意见反馈处置权归支委会、由支书主持支委会：全员可参与开源讨论（issue.create / comment.add / reaction.toggle / mention / reference），但处置动作由支委会作出，系统上该动作**向支委层角色（支书 / 副支书 / 组织 / 宣传 / 纪检）开放**，类比 GitHub maintainer 拥有 merge/close 权（详见 [insights §2.2](../../insights/党支部管理与实务经验沉淀.md) 与 [COMMISSIONER_DUTY_FRAMEWORK §C.1b](../../02_institution/COMMISSIONER_DUTY_FRAMEWORK.md) 党课/意见反馈规则）。这是 P-012 分工的运行保障（支书仲裁）的落点。

| 处置动作 | 接口 | 说明 |
|---|---|---|
| 改状态/关闭 | `changeStatus` / `closeIssue` | 关闭原因 completed/duplicate/wontfix/not_planned；关闭备注记 verdict 评论；清除待终审未读 |
| 重新开放 | `reopenIssue` | 清除 closedReason/closedAt/resultPending |
| 指派 | `assignIssue` | 写 assignee/assigneeRole + dispatchHistory + kind=`dispatch` 评论 + 被指派人未读角标 +1 |
| 设置里程碑 | `setMilestone` | milestone 归支书管理 |
| 隐藏/取消隐藏 | `hideIssue` / `unhideIssue` | hidden 置位，公开列表不显示 |
| 合并 | `mergeIssue` | source 标记 mergedInto + hidden + closed(duplicate)；target 追加 merge verdict 事件 |
| 软隐藏评论 | `hideComment` | 评论 hidden=true，记录 hiddenBy/hiddenReason/hiddenAt |
| 编辑 | `editIssue` | 支书可编辑任意 issue |
| 草稿终审 | `approveDraft` / `rejectDraft` | new-issue/comment/reaction 三类型草稿：pending → approved（合并入 issues.json）/ rejected（含理由） |

**通知机制**：指派 → 被指派人工作台「我的处置」Tab 角标 +1（personId 维度未读）；处置结果提交 → 支书工作台「待终审」高亮；支书终审关闭/重开 → 清除对应未读。

> **人员 ID 规范**：`submittedBy`/`participants`/`assignee`/评论 `author`/`dispatchHistory` 等一律存**真实成员短 ID**（`p*`，如支书 `p13`／组织委员 `p11`），渲染层统一经 `PersonStore.getName()` 转中文姓名，禁止出现 `u_org_commissioner` 类长 ID 或直接展示原始 ID。**反馈指派/审计身份一律用真实成员 ID**（`u_*` 仅保留为系统账号登录身份）。issues.js 缓存版本为 `CACHE_VERSION 4`（键名仍为 `gsm1921-issue-cache-v3`）——版本不匹配即强制清除用户浏览器残留旧缓存。

### 2.16.1 复盘数据 (ReviewRecord)

> 类型定义位于 [domain.js](../../../docs/src/core/domain.js)（ReviewRecord typedef + ReviewStatus 枚举）
> **设计依据**：活动复盘模板系统内表单 + 复盘状态枚举
> **数据流**：§3.1.2 第⑧步复盘监督（批注/打回/确认）+ 第⑨步补交/修改复盘

| 字段名 | 类型 | 必填 | 默认值 | 说明 |
|---|---|---|---|---|
| id | string | 是 | -- | 唯一标识符 |
| activityId | string | 否 | -- | 关联活动 ID（活动复盘时必填） |
| sourceType | `'activity'\|'taskforce'` | 否 | `'activity'` | 来源类型（专班复盘时为 'taskforce'） |
| sourceName | string | 否 | -- | 来源名称（专班复盘时为专班名称） |
| taskforceId | string | 否 | -- | 关联专班 ID（专班复盘时填写，与 sourceName 双保险定位） |
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

> **专班复盘写入入口**：组织委员工作台·专班详情面板内联表单（专班状态 active 且未提交时显示）→ `addTaskforceReview()` 写入 `mockDB.taskforceReviews` + `persist()`，纪检委员工作台活动监督复盘 tab 经 `reviewToDisplay()` 合并展示与批注。写入型标签：organizerId/submittedAt/reviewContent/issues 均为用户表单写入，非系统派生。

**复盘状态枚举：**

| 值 | 说明 | 流转 |
|---|---|---|
| `未提交` | 组织者未提交复盘 | 初始状态 |
| `已上传` | 组织者已提交复盘 | 未提交 → 已上传 |
| `批注中` | 纪检委员正在批注 | 已上传 → 批注中 |
| `已确认` | 纪检委员确认完成 | 批注中 → 已确认 |
| `已打回` | 纪检委员打回要求修改 | 批注中 → 已打回 → 已上传（重新提交） |

### 2.16.2 周报数据 (WeeklyReport)

> 宣传委员按周报送工作内容，报送历史供支书/宣传条线查阅。
> **写入入口**：宣传委员工作台·周报报送 tab（支持「+ 新增周次」内联表单新建草稿周次）。

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
| 支书工作台（决策树引导式写入） | mockDB.activities + localStorage | 日历视图（月/周/日/列表） | 新活动标记出现 |
| 支书工作台 | 同上 | 主页统计卡片 | "活动总数"+1 |
| 支书工作台 | 同上 | 主页近期活动列表 | 新活动条目出现 |
| 支书工作台 | 同上 | 工作流可视化面板 | 流程节点图出现 |
| 党小组组长工作台 | 同上 | 日历视图 | 新活动标记出现（仅党小组会/主题党日） |
| 党小组组长工作台 | 同上 | 党小组组长工作台活动列表 | 新活动条目出现 |

**其他写入操作验证点：**

| 写入类型 | 写入端 | 验证点 |
|--------|--------|--------|
| 考察记录写入 | 组织者工作台 | 组织者已有记录表新记录行出现；纪检委员考察档案对应记录出现 |
| 分工记录写入 | 组织者工作台 | 分工记录列表新记录行出现；分工统计数字更新 |
| 专班招募写入 | 组织委员工作台 | 组织委员看板新专班卡片出现；主页专班进展新条目出现 |
| 赋权写入 | 支书工作台 | 支书赋权记录列表新记录出现；被赋权者工作台出现对应角色页面 |
| 考勤上传 | 党小组组长工作台 | 纪检委员考勤明细新考勤记录出现 |
| 考察上传 | 党小组组长工作台 | 纪检委员考察确认面板新考察记录出现（待确认状态） |
| 确认考勤 | 纪检委员 | 党小组组长工作台缺勤列表状态更新；补课任务自动生成 |
| 补课制度 | 纪检委员 | 考勤管理（补课分段）Tab 新补课任务出现；考勤记录缺勤状态→已补 |
| 意见反馈 | 全员提交 issue + 评论 + 表态 | 支书处置（status/close/milestone/assignee/drafts）+ 新 issue 或新评论通知 |
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
| role | string | 是 | -- | 目标角色（secretary/deputy-secretary/org-commissioner/prop-commissioner/disc-commissioner/leader/participant/party-staff/organizer/deep；角色键权威见 constants.js ROLE_KEYS） |
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
| 支书 | 待设党小组组长 | -- | 待审批事项 | 通知未读超期 | -- | -- |
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
| reminderDays | number | 是 | `3` | 自动提醒触发天数（支书发布时配置） |
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
| 手动催读 | 支书在通知管理中点击"催读" | 支书 | 可多次，记录写入 `reminders` 数组 |

**权限归属**：通知发布权=支书；自动提醒=系统；手动催读=支书。

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

### 2.20.1 文件空间记录 / 图片记录（权威字段表）

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

- **server 模式**：`DELETE /api/v1/fileSpaceRecords/:id` 与 `DELETE /api/v1/imageRecords/:id` 在删记录前联动 `deleteUploadedFile(filePath)` 删除物理文件（[resources.js](../../../server/routes/resources.js) L96-105）。
- **mock 模式**：删除 `mockDB.archiveRecords` 对应记录 + `persist()`，无物理文件。

---

> **党委两级治理数据域**：支部多实例两级治理数据域为 §2.21~§2.24。设计定案见 [PARTY_COMMITTEE_DESIGN.md](../evolution/PARTY_COMMITTEE_DESIGN.md)；服务端表/路由接线见 [db.js](../../../server/db.js) 与 [resources.js](../../../server/routes/resources.js)；类型定义位于 `docs/src/core/domain.js`（mockDB 成员）+ `docs/src/services/{branch,appointment,review-request}.js`。

### 2.21 支部实例数据 (BranchRecord)

> 支部**不预设名字**，由党委动态创建/改名（硕博等支部随时可加）；`config` 为支部配置档案（header 软编码/主题/启停模块/文件空间隔离）。

| 字段名 | 类型 | 必填 | 默认值 | 说明 |
|---|---|---|---|---|
| id | string | 是 | `'br-' + randomHex(4)` → `br-<8hex>` | 支部实例 ID（seed 为 `br-b1`；**形态 `/^br-[0-9a-f]{8}$/` 是测试断言契约**，随机段经唯一源 `core/id.js::randomHex`，勿改长度） |
| name | string | 是 | -- | 支部名称（党委命名） |
| type | string | 否 | `''` | 类型类别标签（自由文本，不预设枚举：如 硕士/博士/本科生） |
| config | object | 是 | 见下 | 支部配置档案 |
| secretaryId | string \| null | 否 | `null` | 现任支书 personId（P2 起由任命链维护，访问支书工作台以本值为准） |
| status | `'active'` | 是 | `'active'` | 支部状态 |
| createdAt | string (ISO) | 是 | -- | 创建时间 |

**config 配置档案（sub）**：

| 字段名 | 类型 | 必填 | 默认值 | 说明 |
|---|---|---|---|---|
| headerTitle | string | 是 | = name | header 品牌**软编码**（改支部名自动同步；header 标题随支部更换） |
| accent | string \| null | 否 | `null` | 支部主题色（可选，默认党建红不变） |
| desc | string | 否 | `''` | 支部自述（可选，≤500 截断；换组织向导步骤①可改，净化见 config-clean `sanitizeConfigOrg`） |
| themePreset | string \| null | 否 | `null` | 支部主题预设 id（白名单 `THEME_PRESET_IDS` = red/green/sky/blue；`null` = 默认党建红调；向导①可改，净化同 `sanitizeConfigOrg`） |
| modules | object \| null | 否 | `null` | 工作流模块配置（L2）：`{ hiddenTabIds: string[], tabOrder: string[] }`——null=全开（默认 profile 兼容现有演示）；最小单位=工作台 tab，核心组（groupLabel='工作台'）固定不可关、不参与排序；维护权=现任支书/副支书（副书同权，2026-09-09 支书批）——操作位=设置（侧边栏右下）→ 支部治理「工作台默认顺序」卡直存 / 换组织向导②内嵌 chips 启停；治理字段（name/type/secretaryId/status）不经此写 |
| blocks | object \| null | 否 | `null` | 产出块/工作流块显隐：`{ outputBlocks?: { hiddenBlockIds: string[], blockOrder: string[] }, workflowBlocks?: { hiddenBlockIds: string[] } }`——null=全开；与 modules 同维护权/操作位（换组织向导②内改），目录源 = constants `OUTPUT_BLOCK_DEFS` / `BLOCK_MANIFESTS`。⚠ 口径（由块画布 v0 spec 归档时补录）：`outputBlocks.blockOrder` **目前没有 UI 写入口**——原设计里的拖拽排序画布已裁定撤销，向导保存时恒写 `[]`；纯函数侧仍支持排序（`getOutputBlockPolicy` / `applyOutputBlockPolicy`），即**能力在、入口无**——若将来要开放排序，属新增产品能力、须走丙部 |
| workforce | object \| null | 否 | `null` | 模块分工归属（L4 支部分工）：`{ [moduleId]: { ownerType: 'role'\|'person'\|'none', ownerId } }`——null=缺省分工（SOP 责任人列）；`ownerType:'none'`＝**方法类停用**（本支部不开展该工作，仅 `tier:'method'` 模块允许，规范类被 `mergeWorkforceSnapshot`/`sanitizeConfigWorkforce` 拦掉）；日常调整走支委会议题（M2）表决后落库、换壳/部署期向导③直写（见 [BRANCH_WORK_MAP.md](../evolution/BRANCH_WORK_MAP.md)）；**采纳后自动派生责任人「履职」待办**（到人→personId／角色→role）并按 `extras.proposal` 复算通知受众（`committee` + `audiencePersons` 到人 + `actionRoles` 角色） |
| policyOverrides | object \| null | 否 | `null` | 域参数覆盖（L2，2026-09-09 支书批）：`{ 节: { 叶: 值 } \| null }`——节=inspection/memberConfirmation/leader（白名单 `POLICY_OVERRIDABLE` 只定义于 policy-defaults）；值=覆盖、null=恢复该域默认、整体 null=全量恢复默认；读侧注入 `POLICY_DEFAULTS`，全站判定随参数生效（净化见 config-clean `sanitizeConfigPolicyOverrides`） |
| configChangeHistory | array | 否 | `[]` | config 写留痕：`{ by, at, what, from?, to?, why? }`——逐键 diff 追加、空变化不冗余；保留最近 100 条（`CONFIG_HISTORY_MAX`）；单键可回滚、回滚再留一痕、历史不改写（见 [PARTY_COMMITTEE_DESIGN.md §2.6 变更流](../evolution/PARTY_COMMITTEE_DESIGN.md)） |
| fileSpaceIsolated | boolean | 是 | `true` | 支部文件（branchDocs）/附件一支部一独立存储空间——按 branchId 分区、跨支部不可见 |

### 2.22 支书任期记录 (AppointmentRecord)

> 党委任命/撤换支书的任期档案；`to=null` 表示现任。任命即三写：`branches.secretaryId` + 双方 `users.role` 同步 + 本记录封口/新建。

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

> P3 双向治理通道·上报半侧：支书/副支书发起（发展节点/活动报备）→ 党委逐项批/驳（驳回须意见）→ 结论回传支部侧同页可见。

| 字段名 | 类型 | 必填 | 默认值 | 说明 |
|---|---|---|---|---|
| id | string | 是 | `generateId('rq')` | 上报记录 ID |
| branchId | string | 是 | -- | 上报支部 |
| type | `'develop-node'\|'activity-report'` | 是 | -- | 上报类型：发展节点（泛化：确定积极分子/发展对象、接收预备、转正等）/ 活动报备（重要活动） |
| title | string | 是 | -- | 事项标题 |
| content | string | 是 | -- | 事项说明（时间/对象/依据等） |
| status | `'pending'\|'approved'\|'rejected'` | 是 | `'pending'` | 审批状态 |
| submittedBy | string | 是 | -- | 提交人 personId（支书/副支书） |
| decidedBy | string \| null | 否 | `null` | 审批人 personId（党委组织员） |
| decidedAt | string (ISO) \| null | 否 | `null` | 审批时间 |
| decisionNote | string | 否 | `''` | 审批意见（驳回必填；批准可附指导意见） |
| createdAt | string (ISO) | 是 | -- | 提交时间 |

### 2.24 党委下发通知扩展（复用 Notice，不新建领域）

> P3 双向治理通道·下发半侧：党委选目标支部下发 → **复用通知实体**，仅目标支部支委层成员在通知入口可见（支书 2026-09-03 裁定：能复用就复用，不新建「下发箱」领域）。

§2.9 通知基础字段不变，下发时额外写入：

| 字段名 | 类型 | 必填 | 说明 |
|---|---|---|---|
| source | `'committee'` | 是 | 来源标记：`'committee'` = 党委下发；缺省 = 支部自发通知（信息性/行动性） |
| audience | `'committee'` | 是 | 党委下发通知专用取值：常量 `'committee'`（字符串）表示「本支部支委层」；支部自发通知缺省不设本字段。注意区分 §2.19.1 的 `actionRoles`（行动性通知待办执行角色**数组**）——`audience` 是下发专用可见性过滤常量，二者语义不同 |
| branchId | string | 是 | 目标支部（支部动态创建后自动可选） |
| branchName | string | 否 | 目标支部名快照（支部后续改名不使历史下发未同步） |
| publisher | string | 否 | 展示覆盖 `'院党委（组织员）'`（通知详情「通知者」不按 targetModule 推断） |
| recipients | string | 否 | 展示覆盖 `'支部委员会（支委层）'` |

**受众过滤规则**（`NoticeStore.list()`）：`audience === 'committee'` 的通知仅对「目标 branchId 支部且角色为支委层（支书/副支书/组织/宣传/纪检）」的当前登录用户可见；普通党员、党委组织员（非支委）一律不可见。支部端「已发布通知」管理区不展示上级下发（只读治理信息，不可删改）。

### 2.25 思想汇报数据 (ThoughtReport)

> 类型定义位于 `docs/src/services/thought-report.js`；**期次纯函数单一源** `docs/src/core/period.js`。思想汇报为**面板数据**（同一 `personId` 名下可多期多篇），由独立阅读页 `docs/thought-report.html` 承载。

| 字段名 | 类型 | 必填 | 默认值 | 说明 |
|---|---|---|---|---|
| id | string | 是 | `generateId('tr')` | 唯一标识符（底层 `crypto.randomUUID()`） |
| personId | string | 是 | -- | 提交人 ID（党员/发展对象） |
| personName | string | 是 | 权威源姓名 | 人员姓名**冗余快照**（见下方注） |
| title | string | 否 | `'思想汇报'` | 标题 |
| period | string | 是 | 按 `submittedAt` 推导 | **期次（季度）**：格式 `YYYY-Qn`；提交时**手填**、缺省或非法按 `submittedAt` 推导；同一 `personId` 同一期次**允许多篇**（面板数据，数据层无唯一性约束） |
| content | string | 是 | -- | 思想汇报正文（trim 后存储） |
| submittedAt | string (ISO) | 是 | `new Date().toISOString()` | 提交时间 |
| reviewStatus | `'needs_revision'\|'archived'` | 是 | `'archived'` | 思想汇报状态。**「组织委员初阅通过才归档」这道门已取消**——提交即入库即归档，**不再有「待初阅」态、也不再有待阅队列**；读取侧归一：旧数据无该字段 / 旧值 `'pending'` → 一律归 `archived`（`services/thought-report.js::_effective`，读取侧归一） |
| reviewHistory | array | 否 | `[]` | 审阅留痕（读取侧归一为数组；组织委员「打回」时追加 `{decision, note, by, at}`） |

> **注（冗余快照字段）**：`personName` 为历史留痕用的冗余快照；**展示一律以 `getPersonName(personId)` 现取**，快照仅作历史留痕，不参与身份判定（数据一致性守卫 D2 断言各域 `personName` 与权威源一致）。

### 2.26 成员档案（PersonRecord）

> 支部成员的**主数据实体**，是名册、应到、考勤、表决、通知受众、党小组归组共同的上游。

| 字段 | 类型 | 说明 |
|---|---|---|
| id | string | 主键，由 `generateId('p')` 派生（形如 `p_<hex>`） |
| name | string | 姓名（必填） |
| studentId | string | 学号；**新增成员时采集**；支部内唯一；**同时作为登录账号** |
| enrollYear | string | **届别/入学年份**；用于识别毕业批次，登记流入时采集 |
| partyGroup | string | 党小组归属；**空字符串即「未分组」**（不属任何党小组） |
| developStage | string | 发展阶段；枚举单一源见 `core/constants.js::DEVELOP_STAGES` |
| role | string | 角色键；枚举单一源见 `core/constants.js::ROLE_KEYS` |
| branchId | string | 所属支部 |
| residenceStatus | string | 在册状态；枚举单一源见 `core/constants.js::RESIDENCE`（在校/滞留） |
| residenceNote | string | 滞留备注（仅滞留态保留） |
| residenceHistory | array | 在册状态变更留痕（from/to/updatedBy/updatedAt/note） |

**行为口径：**

1. 写口白名单见 `server/routes/member.js` 的 `PROFILE_FIELDS` / `CREATE_FIELDS`（新增 `enrollYear` 须同步两处 + 前端 `docs/src/services/person.js` 的字段白名单与档案编辑模态）。
2. **账号联动**：新增成员即**自动建号**——**账号取学号**，口令取支部统一默认口令（沿用既有登录口令机制），不需人工另行注册；账号层为**可持久化账号层（种子账号 + 成员账号）**，成员加入支部即可登录该支部；账号随学号变更而变更，随成员流出一并停用。
3. 变更分流：姓名/学号/党小组**立即生效**；发展阶段/在册状态须走成员变更确认链（组织委员发起 → 支书确认）。**流出登记（§2.28）登记即生效，不再走确认链。**
4. `partyGroup` 为空即「未分组」：不属任何党小组——党小组会应到名单**不含**（按组名精确匹配），支部大会应到**照计**（党员且非滞留口径不变），表决名单**照计**（按发展阶段口径不变）。

### 2.27 党小组（PartyGroup）

> 党小组为**一等实体**——清单独立持久化，支持新增/改名/解散与留痕，不硬编码三组。

| 字段 | 类型 | 说明 |
|---|---|---|
| id | string | 主键 |
| branchId | string | 所属支部（**支部级**清单：党委台多支部场景下每支部各一份） |
| name | string | 组名；新增默认「第N党小组」（N 由 seq 派生），可改名；同一支部内唯一 |
| seq | number | 序号；用于排序与默认命名 |
| status | string | `active` / `dissolved` |
| createdAt / createdBy | string | 成立时间与经手人 |
| dissolvedAt / dissolvedBy | string | 解散时间与经手人 |
| note | string | 备注（解散原因等） |
| history | array | 变更留痕（新增/改名/解散/组长变更） |

**行为口径：**

1. 写口：支书工作台「党小组」tab（由原「党小组进展」升级，含清单 + 新增/改名/解散）；写权归支书与副支书（与既往「副书同权」一致）。
2. **解散**：允许解散**非空**党小组 → 组内成员 `partyGroup` 批量置空（转为「未分组」）+ `status='dissolved'` + 留痕；已解散组不可再被选用、不出现在任何下拉与统计。
3. **改名**：同步批量改写组内成员档案的 `partyGroup`（避免档案与清单脱节）。
4. **未分组口径**：见 §2.26 行为口径 4；支书台「党小组」tab 顶部显示「未分组 N 人」并提供**行内下拉逐个归组**（名册中未分组成员显示「未分组」标注）。
5. **组长绑定不落在本实体**：组长由成员档案 `role='leader'` + 党小组归属派生（`services/group-view.js::listPartyGroups`）；指派入口维持既有「赋权管理」，本实体只展示组长。
6. **硬编码收敛**：支书台赋权管理的组清单、组长建活动的承办党小组选项、演示用户域一律读取**活组清单**单一源（口径：`status='active'` 按 seq 排序）。
7. **与工作地图的关系**：党小组管理**不新增**工作地图模块，按「职责有入口」原则（DESIGN_SYSTEM.md §4.6）落地为支书台一个 tab。

### 2.28 成员流动台账（MemberFlow）

> 成员**流入/流出的复式记账**——每发生一次进出各记一笔，使名册随时可对账「谁在我们名册、谁不在」。

| 字段 | 类型 | 说明 |
|---|---|---|
| id | string | 主键 |
| branchId | string | 所属支部 |
| direction | string | `in`（流入）/ `out`（流出） |
| personId | string | 关联成员档案 id |
| name / studentId / enrollYear | string | 登记时快照（人档案变更后仍可回看当时口径） |
| date | string | 流动发生日期 |
| operatorId | string | 登记人 |
| note | string | 备注（毕业去向、转入来源等自由文本） |
| revokedAt / revokedBy | string | 撤销留痕（撤销后不计入对账） |

**行为口径：**

1. **对账恒等式**：期初在册，加上流入合计、减去流出合计，即得当前在册；台账页表头固定展示该对账行。
2. **流入登记**：逐人表单或**粘贴多行批量**（一行一人，Tab/逗号分隔：姓名/学号/届别/党小组）；登记成功后自动建号（§2.26 口径 2）。
3. **流出登记**：台账内**勾选多人批量**（毕业季一次到位）；**登记即生效**（不再需要支书二次确认）；原成员记录**软标记保留**（`transferOut=true` + 转出时间/经手人），历史考勤与考察读数不变。
4. **撤销**：台账行可撤销（写 `revoked*` 留痕并回滚成员在册状态），使「登记错误」可纠正而不留脏数据。
5. **承载位置**：组织委员工作台「成员名册」页内的「成员流动」面板（登记 + 台账 + 对账行），不新增独立页面。

---

### 2.29 匿名反馈核查留痕（IssueReveal）

> **仅服务端表**：无前端持久化域、不进快照写穿、**无通用 CRUD**（`server/db.js::RESOURCE_TABLES`）。

> **用途**＝**党委查看匿名反馈真实提交人的留痕**（2026-09-17 支书改裁「查看匿名的权限只有党委有」）。表只增不改：**每次查看写一条**，使「只有党委能看」这句承诺**可被事后核对**。

| 字段 | 类型 | 说明 |
|---|---|---|
| id | string | 主键（`reveal-<8 位随机>`） |
| by | string | 查看人 personId |
| byRole | string | 查看人角色键（恒为 `party-staff`；非党委请求在路由层已 403，**不会留下记录**） |
| at | string | 查看时间（ISO） |
| revealedIds | string[] | 本次查看命中的**匿名**反馈 id 列表（实名条目真身本就公开，不计入） |

**读取口径（与 §2.16 同源）：**

1. **写入唯一入口**＝`GET /api/v1/issues/reveal`（仅 `party-staff`；未登录 **401**、非党委 **403**）——命中即写一条留痕，**与返回值同一次发生**（不会出现「看了没记」）。
2. **前端不能造改**：本表**不在** `server/routes/resources.js` 的资源名映射内 ⇒ 无通用 CRUD 入口。
3. **留痕记「看了哪些匿名条目」**（不记「看到了谁的真身」——真身由 `issues._realPersonId` 现取）；其职能是**证明这次查看发生过**，守的是「只有党委能看」这条边界。

---

## 三、单一源清单

> 现行单一源集中登记于此；同源判据与「结构 + 数据双层断言」方法见 `content/05_ai_coding/DATA_CONSISTENCY_CHECKLIST.md` §0。

| 单一源 | 位置 | 口径 |
|---|---|---|
| 期次 | `docs/src/core/period.js` | 期次纯函数（`PERIOD_RE` / `periodOf` / `periodLabel` / `comparePeriodDesc` / `periodOptions` / `isValidPeriod`） |
| 检索条门槛 | `docs/src/core/constants.js::SEARCH_FILTER_MIN_ROWS` | = 8，人/活动表共用；动态行数 `> 8` 才出现检索条 |
| 活动存储态判据 | `docs/src/core/constants.js::isActivityEnded / isActivityArchived / isActivityNotStarted / isActivityLive` | 活动「已结束/已归档/未开始/仍在办」判据；全站禁止手写 `status==='completed' \|\| archived` |
| 活动生命周期展示态 | `docs/src/components/inspector.js::ACTIVITY_LIFECYCLE` + `deriveActivityLifecycleStatus` | 草稿/已发布/进行中/待归档/已执行/已归档/已取消（**本次确认唯一**） |
| 统一名单检索引擎 | `docs/src/components/list-filter.js` | 关键词 + 分面 chips + 门槛显隐 + 同 `stateKey` 跨重渲染保筛选（人/活动共用） |
| 成员档案编辑模态 | `docs/src/components/person-edit-modal.js` | 契约 `openPersonEditModal({personId, focusFields, sourceLabel, onSaved})`，每次打开按 `personId` 现取档案 |
| 人员清单实时视图 | `docs/src/services/person.js::liveMembers` | 只读 Proxy；写入走 PersonStore 写口（根治模块加载期人员快照） |
| 思想汇报篇幅软提示 | `docs/src/core/policy-defaults.js::thoughtReport` | `{ wordHint: 1500, wordSoftMin: 1200 }`（界面显示字数，不作硬性拦截；**「少于 1200 字触发警告审阅」的提醒只给提交人本人看**——支书定案「只给提交人本人」） |
| 实体 id 生成 | `docs/src/core/id.js` | **全站唯一实体 id 源**：`generateId(prefix, sep='_')` + `randomHex()`；降级链 `crypto.randomUUID` → `crypto.getRandomValues` → `Math.random`；**连字符前缀 `tf-`/`notice-`/`cmt-`/`mc-` 必须显式传 `sep='-'`**，否则打断 `startsWith` 契约 |
| 党小组清单 | `docs/src/services/party-group.js` | `partyGroups` 域（党小组清单）唯一源；支书台赋权管理组清单、组长建活动承办党小组选项、演示用户域均由此派生 |
| 成员流动台账 | `docs/src/services/member-flow.js` | `memberFlows` 域（流动台账）唯一源 |
| 成员档案字段扩展 `enrollYear` | `server/routes/member.js::PROFILE_FIELDS` / `CREATE_FIELDS` | 成员档案写口白名单单一源（前端 `docs/src/services/person.js` 字段白名单与档案编辑模态须同步） |
| 「未分组」口径 | `partyGroup === ''` | 未分组 = 党小组归属为空串；**禁在各页自行判断别名** |
| 账号与学号同值 | 账号层服务（成员新增/流出时同步） | 账号派生单一源：账号 = 学号 |

---

## 第二部分　数据流（动态）

> 本部分＝动态数据流：数据架构总览（§1.x）、参与者数据流（§3.x）、前端数据流（§4.x）。§编号沿用原编号；与第一部分的字段定义交叉引用时直接指 §2.x。

## 一、数据架构总览

### 1.1 数据类型设计原则

> 数据类型设计优先于权限设计：先定义"有什么数据、数据如何分类、字段如何规范"，再定义"谁能读写这些数据"。权限是数据之上的切面，不是数据本身。

四条设计原则：数据类型与字段规范优先（工作流、视图、权限均依赖数据结构定义）；每种数据类型在本文档有唯一定义（见 CLAUDE.md H30.2 母本子本关系）；业务数据/静态代码/内存状态/UI 会话状态分层管理；每条写入操作须在查看端可验证（见 §2.17）。

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
| SOP 场景模板 (Scenario) | sopData.js (静态代码) | 静态，代码级维护 | 7 个内置场景，驱动任务生成和工作流（内置清单见本文 §2.14） |
| 工作流定义 (Definition) | definitions.js (静态代码) | 静态，代码级维护 | 3 套流程定义模板（theme-party-day / short-term / long-term），驱动活动流转（与本文 §2.15 一致） |
| 应用状态 (appState) | core/state.js (内存) | 页面生命周期内 | UI 视图状态，不持久化 |
| 用户/角色预设 (users) | mockDB.users (内存) | 静态预设 | 11 个 `u_*` 系统账号（支书/副支书/支委/3 组长/执行组长/组织者/深度参与者）；登录账号另见 mock/accounts.js `MOCK_ACCOUNTS`（`p*`，含党委组织员 p_pc） |
| 赋权审计 (AuthRecord) | localStorage `sop_org_os_auth_audit`（审计快照）+ 主源内嵌（活动 `assignments` / 专班 `members`） | 跨会话持久化 | AuthStore.authorize 写主源 + 追加快照（旧键 `sop_org_os_assigned_roles` 已删除） |
| 角色常量 (ROLE_LABELS/COLORS) | core/constants.js (静态代码) | 静态，代码级维护 | 13 键角色（11 业务 + 2 遗留）的中文标签与视觉配色 |
| 意见反馈 (IssueRecord) | `docs/data/issues.json` + localStorage `gsm1921-issue-drafts` | open->closed->reopened | GitHub Issue 风格开源讨论，双轨数据层，处置归支委会、由支书主持支委会（`issues.json` 权威源） |

### 1.3 端到端数据流交织图

> **设计原则**：数据之间相互交织——同一条数据既**挂靠其产生的上下文**（如考勤是活动的副产物），又**聚合进入跨实体的总数据**（如考勤进入考勤考察总数据）。文档与功能层的表达必须体现这种交织关系，而非孤立的积木堆叠。

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
 └─ 跨活动聚合 ──→ 考勤明细（纪检维护）──→ 个人/支部考勤统计

考察（挂靠 activityId / taskforceId）
 ├─ 纪检确认录入总表 ──→ 组织委员每月建档（考察档案）──→ 人才库/发展党员依据（§3.3）
 └─ 专班工作量汇总 ──→ 专班解散报告 ──→ 写入个人档案
```

**主线三：赋权 → 工作台 → 入档**

```
赋权记录 AuthRecord（支书赋权，见 §2.2「角色与权限数据」/ §2.3「专班数据」）
 └─→ 项目角色（organizer/deep）工作台出现对应模块
      └─→ 工作量记录（专班/活动运行期）
           └─→ 专班解散 → 工作量汇总报告 → 写入个人档案
```

**交织关系要点**（挂靠 + 聚合双语义）：

| 数据 | 上下文挂靠（副产物） | 聚合去向（总数据） | 关键字段 |
|---|---|---|---|
| 考勤 | 活动 `activityId` | 考勤明细 → 个人考勤统计 | `activityId` |
| 考察 | 活动/专班 | 考察总表 → 组织委员建档 → 人才库 | `activityId`/`taskforceId` |
| 分工 | 活动/专班 | 分工汇总 → 工作量统计 | `assignmentId` |
| 补课 | 考勤（缺勤/请假触发） | 回写考勤「已补」 | `makeupTask`→考勤回写 |
| 任务 | 活动 | 完成状态汇总 → 活动进度 | `activityId` |

### 1.4 归档由系统自动同步（2026-09-17 支书裁定）

> **需求**：**归档在系统中自动同步完成，不依赖任何人的重复劳动。**
> **支书原话（2026-09-17）**：「**归档这件事情应该在 系统中自动实现同步，而不需要依靠个人重复劳动！【我认为删去更好】**」
> **状态**：**待落地**（产品裁定已定；本节只登记**需求与口径**，具体做法待设计）。

- **与既有设计的关系**：§1.3 主线三「赋权 → 工作台 → 入档」与 §3.1.1「归档层」把归档写成**由人执行的数据交接环节**（如「纪检委员（执行人）汇总考勤 / 考察记录」）。本裁定要求该环节**不再由人手工传递**——数据在其产生处即归位，归档成为系统的自动结果。
- **为什么**：手工归档会产生「谁归档」的口径冲突（考勤归档归组织委员还是纪检委员），并把同一份数据反复传递，增加重复劳动与出错面。
- **用户得到什么**：各身份都**不再需要做「归档」这个动作**；归档状态由系统自动呈现，人只做自己职责之内的事。

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
| **归档层** | 纪检委员（执行人） | 汇总考勤/考察记录 | 考勤（对象：党员+预备党员；适用：三会一课；状态：出勤/请假/缺勤；提交：支委会，组织委员接收建档）+ 考察（对象：深度参与者和组织者；适用：所有支部工作；层级：组织/深度参与；提交：组织委员建档每月） |

> 完整的分工记录、桥梁作用、考勤/考察规则详见 [COMMISSIONER_DUTY_FRAMEWORK.md §G（原 FLAT_ORGANIZATION_DESIGN.md）](../../02_institution/COMMISSIONER_DUTY_FRAMEWORK.md) + [纪检委员工作流程指南 §1.2](../../02_institution/sop/纪检委员工作流程指南.md)。

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

> 权限矩阵的完整定义见 [SYSTEM_ROLE_PERMISSION.md](../../02_institution/SYSTEM_ROLE_PERMISSION.md)（系统角色权限矩阵，代码键级权威）；其数据层 ACL 切面视图见本文 [§2.2 角色与权限数据](#22-角色与权限数据)。本节不重复展开，冲突时以权威源为准。

### 3.3 考勤与考察的核心区分

> 完整的考勤/考察规则、判断逻辑、记录字段定义见 [纪检委员工作流程指南 §1.2](../../02_institution/sop/纪检委员工作流程指南.md) + [COMMISSIONER_DUTY_FRAMEWORK.md 补课闭环](../../02_institution/COMMISSIONER_DUTY_FRAMEWORK.md)。本节仅保留要点索引。考勤/考察在端到端数据流中的「挂靠活动 + 聚合总数据」交织位置见 [§1.3](#13-端到端数据流交织图)。

**要点**：考勤为 0-1 变量（出勤/请假/缺勤），对象为党员+预备党员，适用三会一课；考察为工作量记录（组织/深度参与），对象为深度参与者和组织者，适用所有支部工作。系统记录字段：考勤见 §2.5 AttendanceRecord；考察见 §2.5.1 InspectionRecord（`level`/`role`/`recordedBy`/`recordedAt`/`status`，持久化域 `mockDB.inspections`）。

> **（论断 P-026）：人才库（组织委员维护）是画像数据库，基于考察信息更新——装的是"画像"（某同志擅长什么、表现如何、有何特长），不是原始材料本身；原始材料库（纪检委员持有）是考勤明细、考察总表等原始记录。纪检委员把考察信息给组织委员，原始材料留在纪检委员处——不是副本关系。**

### 3.4 登录态说明

> **现状（已实现登录态）**：账号体系见 [accounts.js](../../../docs/src/mock/accounts.js)（`MOCK_ACCOUNTS`：`studentId`+口令映射 `p*` personId，演示口令 123456）；认证与登录实现见 [auth.js](../../../docs/src/services/auth.js) `AuthStore`——`verifyCredentials`（账号密码校验）/ `login`（本地角色判定 + 后端 `/api/v1/auth/login` 换 token，失败静默降级本地）/ `devLogin`（开发模式选身份直达对应工作台）/ `logout` / `getCurrentUser`（返回 `{ personId, role }`，A-11 多标签防串扰）。登录存储键见 §4.2.2。真实后端接入与登录门控设计见 [DEPLOYMENT_GUIDE.md §四](../deploy/DEPLOYMENT_GUIDE.md)。

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

> 注：上表为 state.js `getViewTypeByRole` 对首页日历/参考指南角色（ROLE_TYPES + MANAGEMENT_ROLES）的实际推导行为。**角色键权威清单**（含 `deputy-secretary`/`party-staff` 等）见 [SYSTEM_ROLE_PERMISSION.md §9a0](../../02_institution/SYSTEM_ROLE_PERMISSION.md) / `core/constants.js ROLE_KEYS`（13 键单一事实源）；state.js 为遗留展示枚举，新增角色以 ROLE_KEYS 为准，必要时回填 ROLE_TYPES。

### 4.2 localStorage 持久化

> **统一全量键架构**：所有业务数据通过单一全量键 `workflowos_branch_db_v1` 持久化，消除双重存储与同步断裂风险。

#### 4.2.1 业务数据全量键

| 键名 | 存储内容 | 格式 | 读写位置 |
|---|---|---|---|
| `workflowos_branch_db_v1` | 完整 mockDB 状态（全量序列化） | JSON | [core/mock-adapter.js `_saveToStorage()`](../../../docs/src/core/mock-adapter.js#L48-L109)（saveDB/loadDB 已收敛至 MockAdapter，services/mock.js 仅保留 API 模式扎口代理） |

**全量键字段清单**（`mock-adapter.js _saveToStorage()` 实际序列化的 35 个字段，按代码顺序）：

| 字段 | 类型 | 说明 |
|---|---|---|
| `_schema` | number | Schema 版本号，当前值为 1（loadDB 校验，不匹配拒绝加载） |
| `users` | User[] | `u_*` 系统账号预设（持久化但恢复时不做运行时污染覆盖） |
| `activities` | ActivityRecord[] | 活动记录 |
| `tasks` | Task[] | 任务记录 |
| `attendances` | AttendanceRecord[] | 考勤记录 |
| `inspections` | InspectionRecord[] | 考察记录 |
| `assignments` | AssignmentRecord[] | 分工记录 |
| `makeupTasks` | MakeupTask[] | 补课任务 |
| `actSubRecords` | Object | 活动子记录（按活动 ID 索引） |
| `tfSubRecords` | Object | 专班子记录（按专班 ID 索引） |
| `complianceReferences` | ComplianceReference[] | 制度文件引用 |
| `fileSpaceRecords` | FileSpaceRecord[] | 文件空间记录 |
| `experienceDeposits` | ExperienceDeposit[] | 经验沉淀记录 |
| `imageRecords` | ImageRecord[] | 图片记录 |
| `taskforces` | TaskForceRecord[] | 专班记录 |
| `notices` | Notice[] | 通知记录 |
| `todos` | Todo[] | 待办任务记录（最小三成本原则落地，见 §2.18） |
| `signups` | SignupRecord[] | 报名记录（活动/专班统一报名渠道） |
| `activityReviews` | ReviewRecord[] | 活动复盘记录 |
| `taskforceReviews` | ReviewRecord[] | 专班复盘记录 |
| `propTasks` | Object[] | 宣传任务（prop-commissioner 工作台） |
| `weeklyReports` | WeeklyReport[] | 宣传周报记录 |
| `archiveRecords` | ArchiveRecord[] | 档案归档记录（prop-commissioner 工作台） |
| `externalDispatches` | Object[] | 文件流外发确认记录 |
| `branchDocs` | Object[] | 支部文件（一支部一存储空间，挂 branchId） |
| `memberChangeRequests` | Object[] | 成员变更审批申请 |
| `committeeBroadcasts` | Object[] | 支委广播记录 |
| `agendaVotes` | Object[] | 线上支委会表态记录 |
| `handoffs` | Object[] | 三委数据交接记录 |
| `thoughtReports` | Object[] | 思想汇报记录 |
| `partyGroups` | Object[] | 党小组清单（一等实体） |
| `memberFlows` | Object[] | 成员流动台账（流入/流出复式记账） |
| `branches` | BranchRecord[] | 支部实例（含 config 配置档案） |
| `appointmentRecords` | AppointmentRecord[] | 支书任期记录 |
| `reviewRequests` | ReviewRequest[] | 支部上报审批记录 |

#### 4.2.2 UI 状态独立键

> 以下键存储 UI/会话状态，不属于业务数据，保持独立键存储。

| 键名 | 存储位置 | 存储内容 | 格式 | 读写位置 |
|---|---|---|---|---|
| `gsm1921-login-user` | localStorage | 当前登录用户（含 tabId，A-11 防串扰） | JSON `{personId, role, tabId}` | [services/auth.js](../../../docs/src/services/auth.js)（LOGIN_KEY） |
| `gsm1921-tab-id` | sessionStorage | 当前标签页唯一 ID | string `tab-*` | [services/auth.js](../../../docs/src/services/auth.js)（TAB_KEY） |
| `gsm1921-session-snap` | sessionStorage | 本标签页登录会话快照（登录被其它页覆盖时回退） | JSON `{personId, role}` | [services/auth.js](../../../docs/src/services/auth.js)（SESSION_KEY） |
| `gsm1921-api-token` | sessionStorage | API 认证 token（enableApiMode 写入；登出/开发模式清除） | string | [services/auth.js](../../../docs/src/services/auth.js)（SESSION_TOKEN_KEY） |
| `sop_org_os_auth_audit` | localStorage | 赋权审计快照（只增不改；revoke 追加记录，判定取最新一条） | JSON `Array<{id, targetPersonId, role, scopeRef, authorizedBy, authorizedAt, action:'grant'\|'revoke'}>` | [services/auth.js](../../../docs/src/services/auth.js)（AUDIT_KEY）；主源=活动 assignments / 专班 members |
| `gsm1921-issue-cache-v3` / `gsm1921-issue-cache-version` | localStorage | 意见反馈缓存 + 缓存版本号（v3 不匹配强制重拉） | JSON / string | [services/issues.js](../../../docs/src/services/issues.js) |
| `gsm1921-issue-drafts` | localStorage | 意见反馈草稿（新建/评论/反应） | JSON | [services/issues.js](../../../docs/src/services/issues.js)（DRAFT_KEY） |
| `sop_org_os_session` | sessionStorage | 跨页面会话状态 | JSON | [core/cross-page-state.js](../../../docs/src/core/cross-page-state.js) |
| `sop_org_os_data_version` | localStorage | 数据版本号（跨页面同步，写入自增） | number | [core/cross-page-state.js](../../../docs/src/core/cross-page-state.js) |

> 旧键清理说明：`gsm1921-auth-records` / `gsm1921-primary-role` / `gsm1921-auth-grants`（auth 域）、`sop_org_os_assigned_roles`（roles.js 赋权，启动时清除残留）、`gsm1921-feedback-submissions`（FeedbackStore 旧数据，迁移后删除）均无写入方，不再列为存储键。

**持久化机制细节：**

- `workflowos_branch_db_v1`：当前 `SANDBOX_MODE = false`（[core/mock-adapter.js](../../../docs/src/core/mock-adapter.js)，与 services/mock.js 对齐）——默认**跨刷新持久化**：localStorage 存在且 `_schema` 匹配的合法数据时全量恢复；无数据或数据被污染（核心数组为空）时回退加载初始 seed（`_seedInitialData`），并按种子基线增量同步（删除已移除种子/覆盖已变更种子/补齐缺失种子，保留用户运行时字段）
- Schema 版本校验：loadDB 检查 `_schema` 与当前 `SCHEMA_VERSION`（值为 1）是否匹配，不匹配则拒绝加载脏数据
- 写入策略：CRUD 写操作后经 `persist()` / `MockAdapter.saveDB()` 将 mockDB 全量序列化到单一键；saveDB 含持久化守卫（`mockDB._loaded` 为 false 即 loadDB 完成前拒绝写入，防止加载早期空数据覆盖用户已存数据）
- SANDBOX 清理（仅 `SANDBOX_MODE = true` 时启用，当前为 false 不触发）：`loadDB()` 不仅清理全量键，还清理旧版独立键（`assignment_records`/`attendance_records` 等 legacyKeys 兼容清理），随后重灌 seed
- 容错：写入失败（含 quota exceeded）console.warn 降级不中断用户操作；loadDB JSON 解析/seed 错误 console.error 透出真实原因（不静默吞错）

### 4.3 数据源使用边界

**三条使用规则：**

| 场景 | 应使用 | 禁止使用 | 原因 |
|------|--------|----------|------|
| 组件渲染（下拉框、查找、筛选） | `mockDB.activities` 或 `getAppState().activities` | `ACTIVITIES` | mockDB 是运行时数据源，ACTIVITIES 是静态初始数据 |
| 数据加载 fallback | `fallbackData: () => ACTIVITIES` | — | 仅在 BranchService 失败时作为安全网（`_maybeError` 已禁用），极少触发 |
| Mock 数据生成（seed 阶段） | `ACTIVITIES` | — | mock/index.js 中 `_activityTitle`/`_activityType` 辅助函数在 seed 阶段使用静态数据，正确 |
| 服务层查找 | `mockDB.activities` | `ACTIVITIES` | auth.js/makeup.js/party.js 等服务层应读取运行时数据 |

**`_maybeError` 随机错误模拟已禁用**：后端接入后真实错误由后端返回。

**唯一数据源原则：**

| 数据域 | 唯一权威源 | 派生/引用方 | 说明 |
|---|---|---|---|
| 人员（学生+系统账号） | `PEOPLE`（people.js）+ `mockDB.users`（domain.js，u_* 系统账号） | 全部渲染层经 `PersonStore.getAll()/getName()` 解析 | 任何模块不得自行硬编码人员名单 |
| 发展党员追踪 | `PEOPLE.developStage` + localStorage 推进覆盖档案 `gsm1921-dev-stage-overrides` | 组织委员工作台发展党员/人才库 | 候选人由 `_buildCandidates()` 从 PEOPLE 派生（非正式党员），推进落覆盖档案 |
| 反馈系统人员 ID | 真实成员短 ID（`p*`，如 `p13`/`p11`/`p1`；不得用 `u_*` 占位） | issue-list/issue-detail/issues.js 渲染层统一 `getPersonName()`/`PersonStore.getName()` 转姓名 | 存储与渲染均不得出现 `u_org_commissioner` 等长 ID；`PersonStore.getName` 解析不到时回退返回 ID 本身 |
| `partyGroups` | `docs/src/services/party-group.js`（写口）+ `mockDB.partyGroups` / server 表 `party_groups` | 支书台「党小组」tab、赋权管理组清单、组长建活动承办组选项、成员名册下拉、group-view 聚合 | 支部级清单，活组（`status='active'`，按 seq 排序）为唯一枚举来源；实体与解散口径见 §2.27 + 单一源登记见 §三 |
| `memberFlows` | `docs/src/services/member-flow.js` + `mockDB.memberFlows` / server 表 `member_flows` | 名册「成员流动」面板（台账 + 对账行）、流入自动建号 | 复式记账台账，对账恒等式「期初 + 流入 − 流出 = 在册」；实体见 §2.28 + 单一源登记见 §三 |

> 关联缓存版本链：`cross-page-state.js CODE_VERSION` + HTML `?v=` 参数 + `issues.js CACHE_VERSION` 三者任一升级都会强制用户浏览器丢弃旧 localStorage 缓存重新拉取，保证"数据干净、唯一数据源"落地。

### 4.4 数据访问抽象层（DataAdapter）

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
| activities | list/create/update/delete/archive/revokeBrand | 活动管理 |
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
| 活动品牌（**取消认定**；认定＝提案 → 支委会通过后确定，无「点一下即认定」口） | `/api/v1/activities/:id/brand` | POST |
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

#### 4.5.1 成员流入/流出写路径

> **成员流入 → 台账 + 档案 + 账号（三写同源）**：一次登记三处一致——`memberFlows` 记一笔（`direction='in'`）+ `PersonRecord` 建档（采集姓名/学号/届别/党小组）+ 账号层建号（账号 = 学号，口令 = 支部统一默认口令）。**API 形态走专用端点** `POST /members/intake`（写门 = 组织委员 + 支书/副支书，与 §9i 同源；接线选项 `saveMember(record, { memberFlowIntake: true })`）——名册 tab 的「新增成员」仍走 `POST /members`（R-10 组织委员专属），两者是**同一实现体、两个写门**（支书裁定 Q-23-10：维持 §9i，不放宽名册越权面）。
> **成员流出 → 台账 + 档案软标记 + 账号停用**：`memberFlows` 记一笔（`direction='out'`）+ `PersonRecord` 软标记保留（`transferOut=true` + 转出时间/经手人）+ 账号随流出一并停用。
> **撤销流出 → 台账留痕 + 档案复活 + 账号恢复**：撤销不改写台账行、只补 `revokedAt/revokedBy` 留痕（台账只增不删）；档案复活按台账 `personSnapshot` 回滚。**双形态分叉点**：mock 形态档案存于覆盖层，`PersonStore.saveMember` 语义即「save 即复活」（自动清除 `removedIds` 删除标记）；**API 形态档案存于 server `users` 行且「转出」是软标记（原行保留不删不匿名）——仅走档案补丁不会清标记，该行仍被 `/login`（账号已停用）与用户读链排除，成员实际回不来**。故 API 形态须先经语义端点 `POST /members/:id/undo-transfer-out`（清 `transferOut`/`transferredOutAt`/`removedAt`/`removedBy`/`transferOutNote`；与 `/transfer-out` 同角色集 + 同支部校验 + 幂等）——接线方式：`PersonStore.saveMember(record, { restoreFromTransferOut: true })`（与 R-10 的 `residenceMirror` 同为「api 形态分流语义端点」选项；mock 形态忽略）。证据：`server/test/member-persist.test.mjs` api ⑪（含病灶复现：不带该选项的常规补丁清不掉标记）、`server/test/permission-gate.test.mjs` ⑤c（端点授权/越权/注入/404/跨支部/幂等）。

### 4.6 写穿透缓存模式

> **设计理念**：前端数据层采用"写穿透缓存"模式，实现零成本迁移到后端数据库。
> **实现文件**：`docs/src/core/data-adapter.js`（`init()` + `persist()` 方法）

**核心机制**：

| 操作类型 | 实现方式 | 说明 |
|---------|---------|------|
| 读操作 | 同步读 mockDB 缓存 | 前端零改动，保持同步访问 |
| 写操作 | 通过 `persist()` 路由到当前数据源 | 自动路由到 mock/api 适配器 |
| 初始化 | `init()` 从当前数据源预加载数据 | 页面加载时调用，填充 mockDB 缓存 |

**适用场景**：需要接入后端数据库、支持 mock/api 双模式切换的前端数据层。切换示例见 §4.4.3，接口规范见 §4.4。

### 4.7 视图按需取用原则与判例

#### 4.7.1 原则陈述

> **来源：**本节内容接收自 `content/01_strategy/SECRETARY_DIRECTIVES.md` 原 P-008（视图按需取用原则）。

视图作为解决具体问题的工具，承担查询入口的角色。三条原则（查询视图、应用场景优先、视图-写入源）的完整论证与判例见 4.7.2。

#### 4.7.2 判例：视图按需取用三条原则

> **与 4.7.1 的关系**：4.7.1 是原则陈述版本，本节是判例版本。两者互为补充——4.7.1 给出原则，本节给出落地判例。

并非所有功能都需要所有视图。视图作为解决具体问题的工具，承担查询入口的角色。

**三条原则**：

1. **查询视图原则**：长期写入越写越多的数据，都要配备查询视图。视图放在哪里取决于"什么站位/身份能看什么"（角色-视图绑定）。
2. **应用场景优先原则**：没有应用场景就不做视图决策。视图不是装饰，是解决"数据多了怎么找"的问题。
3. **视图-写入源原则**：视图必须有对应的写入源。数据没有开始/结束字段→不需要甘特视图；没有状态流转字段→不需要看板视图。

**查询形式按数据主体定**：查询视图的形式（搜索框/筛选器/Tab 分类/日期选择器）由数据主体的特性决定，而非一刀切套用同一种查询形式——人员数据按姓名/身份查询（搜索框合适），活动数据按日期/状态查询（日期选择器+状态筛选更高效），专班数据按状态/成员查询（看板分类更直观）。强行统一为搜索框，用户在"看整体分布"的场景中被迫逐个搜索；堆砌多种查询形式，用户迷失在工具栏中。一种数据主体对应一种最匹配的查询形式，不重复、不堆砌。

**为什么不是"所有页面都配所有视图"？** 因为视图的维护成本和数据要求不同。甘特视图需要开始/结束字段，看板视图需要状态流转字段——没有这些字段，视图就是空壳。按需取用是务实主义，不是偷懒。

**生效条件**：适用于所有需要查询视图的功能页面——长期写入越写越多的数据都要配备查询视图；判定标准是"数据主体的查询需求是什么"（按字段精确查询用搜索框，按范围浏览用筛选器，按状态分流用 Tab 分类）。

### 4.8 看板数据必须从正式数据源动态派生（H-1 判例）

KANBAN\_MOCKS（mock/kanban.js）作为独立硬编码的看板数据，与正式数据源 TaskForceRecordStore 完全断裂——两套 ID 体系、两套名称、两套状态模型。KANBAN\_MOCKS 被两个 entry 文件 import 但从未在渲染中使用，成为死代码。

**根因**：看板视图的 mock 数据（KANBAN\_MOCKS）和正式数据层（TaskForceRecordStore）在不同时期独立创建，从未对接。KANBAN\_MOCKS 是早期设计原型，TaskForceRecordStore 是后来实现的正式数据服务——两者并行存在但互不关联。

**为什么看板必须从正式数据源动态派生？** 因为看板是视图层，不是数据层——同一数据源原则（同一概念只在一个地方表达）要求同一份数据，不同切面展示。看板展示的专班状态必须与专班管理页面的数据一致：如果看板显示"招募中"而管理页面显示"已启动"，用户会失去对系统的信任。两套数据意味着两套真相——当专班名称、状态、成员在 KANBAN\_MOCKS 和 TaskForceRecordStore 中不一致时，用户看到哪个？看板视图应从 TaskForceRecordStore 动态派生，正如考勤明细从 AttendanceRecordStore 派生、考察总表从 InspectionRecordStore 派生。数据一致性是视图的底线要求。

**生效条件**：适用于所有从正式数据源派生的视图（看板、甘特、表格等）。独立 mock 数据仅在开发初期作为原型使用，正式数据层就绪后必须清除。

---

## 第三部分　边界与引用（本文不重复展开的权威源）

> 本文只回答「有哪些数据、每类数据的字段是什么」（第一部分）与「数据如何产生、流动、聚合」（第二部分）。下列内容各有权威源，本文不重复展开——遇冲突时，以对应权威源为准。

| 不在此展开的内容 | 权威源 |
|---|---|
| 角色键与权限矩阵（含赋权链、模块可见性） | [SYSTEM_ROLE_PERMISSION.md](../../02_institution/SYSTEM_ROLE_PERMISSION.md)（代码键级权威）+ [MODULE_UI_DESIGN.md](../module/MODULE_UI_DESIGN.md) |
| 角色键的代码单一源 | `docs/src/core/constants.js`（`ROLE_KEYS` / `ROLE_LEGACY_KEYS`）、`docs/src/core/state.js`（首页日历角色枚举） |
| 考勤 / 考察 / 补课的制度规则 | [纪检委员工作流程指南.md](../../02_institution/sop/纪检委员工作流程指南.md) + [COMMISSIONER_DUTY_FRAMEWORK.md](../../02_institution/COMMISSIONER_DUTY_FRAMEWORK.md) |
| 三级管理架构与分工 | [COMMISSIONER_DUTY_FRAMEWORK.md §G（原 FLAT_ORGANIZATION_DESIGN.md）](../../02_institution/COMMISSIONER_DUTY_FRAMEWORK.md) |
| 架构分层与目录结构 | [ARCHITECTURE.md](../../03_doc_system/ARCHITECTURE.md) |
| 服务清单与代码落点 | [ARCHITECTURE.md §十一](../../03_doc_system/ARCHITECTURE.md#十一统一服务目录与角色-服务权限矩阵) |
| 登录 / 认证门控 | [DEPLOYMENT_GUIDE.md §四](../deploy/DEPLOYMENT_GUIDE.md) |
| 部署与 mock / api 切换 | [DEPLOYMENT_GUIDE.md](../deploy/DEPLOYMENT_GUIDE.md) |
| SOP 场景与任务模板 | `docs/src/workflow/sopData.js`（场景与任务定义）+ `docs/src/workflow/definitions.js`（工作流定义） |
| 数据一致性判据与断言方法 | [DATA_CONSISTENCY_CHECKLIST.md](../../05_ai_coding/DATA_CONSISTENCY_CHECKLIST.md) |
| 沿革与「哪一批做了什么」 | `.ctx/logs/YYYY-MM-EXECUTION_LOG.md` |
