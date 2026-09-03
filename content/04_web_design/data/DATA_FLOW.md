---
title: "数据流设计"
type: design
role: "[工程师]+[AI]"
version: "1.0"
last_updated: "2026-08-24"
status: active
split_from: "原数据架构总文件（2026-08-24 T-282 拆分；路由文件 2026-09-03 精简删除）"
related_files: [content/04_web_design/data/DATA_MODEL.md, content/02_institution/ROLE_CLASSIFICATION.md, content/02_institution/sop/纪检委员工作流程指南.md]
---

# 数据流设计

> **定位：** 本文件是系统**动态数据流**的唯一权威源（2026-08-24 自原数据架构总文件拆分：数据架构总览 + 参与者数据流 + 前端数据流）。静态数据模型见 [DATA_MODEL.md](DATA_MODEL.md)。
> **受众：** [工程师]+[AI] —— 供开发决策参考，理解数据如何产生、流动、聚合。
> **拆分说明**：2026-08-24 自原数据架构总文件拆分（T-282 content 体系优化；原路由文件 2026-09-03 精简删除）——数据流定义在此，数据模型定义移至 DATA_MODEL.md。

---

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
| SOP 场景模板 (Scenario) | sopData.js (静态代码) | 静态，代码级维护 | 12 个内置场景，驱动任务生成和工作流 |
| 工作流定义 (Definition) | definitions.js (静态代码) | 静态，代码级维护 | 5 套状态机模板，驱动活动流转 |
| 应用状态 (appState) | core/state.js (内存) | 页面生命周期内 | UI 视图状态，不持久化 |
| 用户/角色预设 (users) | mockDB.users (内存) | 静态预设 | 3 个内置用户（书记/组织委员/党小组组长） |
| 赋权记录 (assignedRoles) | localStorage `sop_org_os_assigned_roles` | 跨会话持久化 | 书记赋权给组织者/深度参与者的记录 |
| 角色常量 (ROLE_LABELS/COLORS) | core/constants.js (静态代码) | 静态，代码级维护 | 9 种角色的中文标签与视觉配色 |
| 意见反馈 (IssueRecord) | `docs/data/issues.json` + localStorage `gsm1921-issue-drafts` | open->closed->reopened | GitHub Issue 风格开源讨论，双轨数据层，书记维护 issues.json 权威源 |

### 1.3 端到端数据流交织图

> **设计原则（2026-08-05 确立）**：数据之间相互交织——同一条数据既**挂靠其产生的上下文**（如考勤是活动的副产物），又**聚合进入跨实体的总数据**（如考勤进入考勤考察总数据）。文档与功能层的表达必须体现这种交织关系，而非孤立的积木堆叠。

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

> 完整的分工记录、桥梁作用、考勤/考察规则详见 [FLAT_DESIGN.md](../../02_institution/FLAT_DESIGN.md) + [纪检委员工作流程指南 §1.2](../../02_institution/sop/纪检委员工作流程指南.md)。

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

> 权限矩阵的完整定义见 [ROLE_CLASSIFICATION.md](../../02_institution/ROLE_CLASSIFICATION.md) §九 角色权限矩阵。本节数据层切面视图已合并至权威源，冲突时以权威源为准。

### 3.3 考勤与考察的核心区分

> 完整的考勤/考察规则、判断逻辑、记录字段定义见 [纪检委员工作流程指南 §1.2](../../02_institution/sop/纪检委员工作流程指南.md) + [insights 工程演进与设计方法论.md §6.12](../../insights/工程演进与设计方法论.md)。本节仅保留要点索引。考勤/考察在端到端数据流中的「挂靠活动 + 聚合总数据」交织位置见 [§1.3](#13-端到端数据流交织图)。

**要点**：考勤为 0-1 变量（出勤/请假/缺勤），对象为党员+预备党员，适用三会一课；考察为工作量记录（组织/深度参与），对象为深度参与者和组织者，适用所有支部工作。系统记录字段：考勤见 §2.5 AttendanceRecord；考察补充字段 `participationLevel`/`deepRole`/`specificWork`/`divisionRecordedBy`/`submittedTo`/`submittedAt`。

> **（论断 P-026，2026-08-09 自论断汇编迁出）：人才库（组织委员维护）是画像数据库，基于考察信息更新——装的是"画像"（某同志擅长什么、表现如何、有何特长），不是原始材料本身；原始材料库（纪检委员持有）是考勤总表、考察总表等原始记录。纪检委员把考察信息给组织委员，原始材料留在纪检委员处——不是副本关系。**

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
| `workflowos_branch_db_v1` | 完整 mockDB 状态（全量序列化） | JSON | [services/mock.js](../../../docs/src/services/mock.js#L29) |

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
| `gsm1921-auth-records` | 认证记录 | JSON | [services/auth.js](../../../docs/src/services/auth.js) |
| `gsm1921-primary-role` | 主角色 | string | [services/auth.js](../../../docs/src/services/auth.js) |
| `gsm1921-auth-grants` | 赋权授权记录 | JSON | [services/auth.js](../../../docs/src/services/auth.js) |
| `sop_org_os_assigned_roles` | 赋权角色列表 | JSON: `Array<{name, role, activity}>` | [services/roles.js](../../../docs/src/services/roles.js) |
| `gsm1921-feedback-submissions` | 反馈提交记录 | JSON | [services/issues.js](../../../docs/src/services/issues.js) |
| `sop_org_os_session` | 跨页面会话状态 | JSON | [core/cross-page-state.js](../../../docs/src/core/cross-page-state.js) |
| `sop_org_os_data_version` | 数据版本号（跨页面同步） | number | [core/cross-page-state.js](../../../docs/src/core/cross-page-state.js) |

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
