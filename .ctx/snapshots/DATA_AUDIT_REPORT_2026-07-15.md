---
title: "数据架构全面审计报告"
type: audit-report
role: "[工程师]+[AI]"
last_updated: "2026-07-15"
status: active
summary: "对系统数据架构进行全面审计，包含数据类别清单、需求匹配度分析、字段共用性分析（重点）、问题与改进方向。"
---

# 数据架构全面审计报告

> **审计范围**：`content/design/DATA_ARCHITECTURE.md` + `docs/src/core/domain.js` + `docs/src/services/mock.js`
> **审计日期**：2026-07-15
> **审计重点**：字段共用性分析（书记特别强调）

---

## 一、数据类别清单

### 1.1 数据类别总览

系统共定义 **20 个数据类别**，分为三大类：

| 分类 | 数据类别 | 存储位置 | 生命周期 | 说明 |
|------|---------|---------|---------|------|
| **核心业务数据** | ActivityRecord | mockDB.activities + localStorage | 创建→活跃→归档(软删除) | 核心业务实体，所有流程围绕活动展开 |
| | AttendanceRecord | mockDB.attendances + localStorage | 随活动创建→随活动归档 | 纪检委员写入，全员可读 |
| | Task | mockDB.tasks + localStorage | 随活动创建→待办→进行中→已完成 | 活动子任务，由 SOP 模板生成 |
| | InspectionRecord | mockDB.inspections + localStorage | 随活动/专班创建→待确认→已确认 | 考察记录（仅组织者和深度参与者） |
| | AssignmentRecord | mockDB.assignments + localStorage | 随活动创建→待分配→已分配 | 分工记录 |
| | HandoverRecord | mockDB.handovers + localStorage | 随活动创建→待交接→已交接 | 交接记录 |
| | MakeupTask | mockDB.makeupTasks + localStorage | 缺勤触发→待补课→已补课 | 补课任务 |
| | TaskForceRecord | mockDB.taskforces + localStorage | 创建→运行→解散 | 专班数据 |
| | Notice | mockDB.notices + localStorage | 创建→已读→归档 | 通知数据 |
| | FileSpaceRecord | mockDB.fileSpaceRecords + localStorage | 上传→归档 | 文件空间记录 |
| | ExperienceDeposit | mockDB.experienceDeposits + localStorage | 提交→归档 | 经验沉淀记录 |
| | ComplianceReference | mockDB.complianceReferences + localStorage | 引用→归档 | 制度文件引用 |
| | ImageRecord | mockDB.imageRecords + localStorage | 上传→归档 | 图片记录 |
| | User | mockDB.users (内存) | 静态预设 | 3 个内置用户（书记/组织委员/党小组组长） |
| **静态代码数据** | Scenario | sopData.js (静态代码) | 静态，代码级维护 | 12 个内置场景，驱动任务生成和工作流 |
| | Definition | definitions.js (静态代码) | 静态，代码级维护 | 5 套状态机模板，驱动活动流转 |
| | Role Constants | core/constants.js (静态代码) | 静态，代码级维护 | 9 种角色的中文标签与视觉配色 |
| **内存状态数据** | AppState | core/state.js (内存) | 页面生命周期内 | UI 视图状态，不持久化 |
| | AssignedRoles | localStorage `sop_org_os_assigned_roles` | 跨会话持久化 | 书记赋权给组织者/深度参与者的记录 |
| **设计文档定义但未实现** | ~~Deliverable~~ | ~~DATA_ARCHITECTURE.md §2.6~~ | ~~设计文档定义，代码未实现~~ | 已删除（T101），由 FileSpaceRecord 覆盖 |

### 1.2 数据类别详细定义

#### 1.2.1 ActivityRecord（活动记录）

**定义**：核心业务实体，所有流程围绕活动展开。

**字段清单**：

| 字段名 | 类型 | 必填 | 默认值 | 说明 |
|--------|------|------|--------|------|
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
| deliverableIds | string[] | 否 | -- | ~~关联交付物 ID 列表~~（已废弃，T101） |
| isBrand | boolean | 否 | `false` | 品牌属性标签 |

**使用场景**：
- 党建工作台：活动创建、编辑、归档
- 日历视图：按日期展示活动
- 主页：近期活动列表
- 工作流可视化：流程节点图

#### 1.2.2 AttendanceRecord（考勤记录）

**定义**：纪检委员写入，全员可读的出勤记录。

**字段清单**：

| 字段名 | 类型 | 必填 | 默认值 | 说明 |
|--------|------|------|--------|------|
| id | string | 是 | `generateId()` | 唯一标识符 |
| activityId | string | 是 | -- | 所属活动 ID |
| userId | string | 是 | -- | 参会成员用户 ID |
| status | `'present'\|'absent'\|'leave'` | 是 | -- | 出勤状态（出席/缺席/请假） |
| recordedBy | string | 是 | -- | 记录人用户 ID（纪检委员） |
| recordedAt | string (ISO) | 是 | -- | 记录时间 |
| studentId | string | 否 | -- | 学号 |
| developStage | `'party_member'\|'probationary'\|'activist'\|'candidate'` | 否 | -- | 发展阶段 |
| partyGroup | string | 否 | -- | 所属党小组 |

**使用场景**：
- 纪检委员工作台：考勤管理（基础）
- 组织委员工作台：人的管理（读取考勤）
- 党小组组长工作台：考勤上传
- 主页：个人考勤查询

#### 1.2.3 Task（任务）

**定义**：活动子任务，由 SOP 模板生成。

**字段清单**：

| 字段名 | 类型 | 必填 | 默认值 | 说明 |
|--------|------|------|--------|------|
| id | string | 是 | `generateId('tsk')` | 唯一标识符，前缀 `tsk_` |
| activityId | string | 是 | -- | 所属活动 ID |
| title | string | 是 | -- | 任务标题 |
| status | `'pending'\|'in_progress'\|'completed'` | 是 | `'pending'` | 任务状态 |
| createdAt | string (ISO) | 是 | `new Date().toISOString()` | 创建时间（审计字段） |

**使用场景**：
- 党建工作台：任务列表、任务状态切换
- 活动详情：任务进度展示

#### 1.2.4 InspectionRecord（考察记录）

**定义**：仅组织者和深度参与者的工作量记录。

**字段清单**：

| 字段名 | 类型 | 必填 | 默认值 | 说明 |
|--------|------|------|--------|------|
| id | string | 是 | `generateId()` | 唯一标识符 |
| sourceType | `'activity'\|'taskforce'` | 是 | -- | 考察来源类型（活动 or 专班） |
| activityId | string | 条件 | -- | 关联活动 ID（sourceType='activity'时必填） |
| sourceName | string | 是 | -- | 来源名称（sourceType='taskforce'时为专班名称） |
| personId | string | 是 | -- | 人员 ID（引用 people.js） |
| level | `'organize'\|'deep'` | 是 | -- | 考察层级（仅组织者和深度参与者有考察记录） |
| role | string | 是 | -- | 分工角色+描述（如：策划+全流程统筹、视频制作、PPT设计） |
| recordedBy | string | 是 | -- | 记录人 personId |
| recordedAt | string (ISO) | 是 | -- | 记录时间 ISO 字符串 |
| status | `'pending'\|'confirmed'` | 否 | -- | 考察确认状态（纪检委员确认后录入考察总表） |

**使用场景**：
- 纪检委员工作台：考察管理（进阶）
- 组织委员工作台：建档
- 党小组组长工作台：考察上传

#### 1.2.5 AssignmentRecord（分工记录）

**定义**：活动分工记录。

**字段清单**：从 mockDB.assignments 推断，具体字段定义未在文档中明确。

**使用场景**：
- 组织者工作台：分工记录
- 纪检委员工作台：分工统计

#### 1.2.6 HandoverRecord（交接记录）

**定义**：活动交接记录。

**字段清单**：从 mockDB.handovers 推断，具体字段定义未在文档中明确。

**使用场景**：
- 组织者工作台：交接记录
- 纪检委员工作台：交接面板

#### 1.2.7 MakeupTask（补课任务）

**定义**：缺勤触发的补课任务。

**字段清单**：从 mockDB.makeupTasks 推断，具体字段定义未在文档中明确。

**使用场景**：
- 纪检委员工作台：补课制度
- 党小组组长工作台：缺勤列表

#### 1.2.8 TaskForceRecord（专班数据）

**定义**：专班是活动之外考察积极分子的载体。

**字段清单**：

| 字段名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| id | string | 是 | 专班唯一 ID |
| name | string | 是 | 专班名称 |
| type | string | 是 | 专班类型（宣传专班/SOP维护专班/活动筹备专班等） |
| status | `'active'\|'dissolved'` | 是 | 专班状态 |
| createdBy | string | 是 | 创建者（组织委员） |
| createdAt | string (ISO) | 是 | 创建时间 |
| members | string[] | 否 | 成员列表 |
| description | string | 否 | 专班描述 |

**使用场景**：
- 组织委员工作台：专班管理
- 宣传委员工作台：专班进展

#### 1.2.9 Notice（通知数据）

**定义**：系统通知。

**字段清单**：从 mockDB.notices 推断，具体字段定义未在文档中明确。

**使用场景**：
- 主页：通知列表
- 各工作台：通知提醒

#### 1.2.10 FileSpaceRecord（文件空间记录）

**定义**：纯前端无法真正上传文件，以"文件记录"模式管理文件元数据。

**字段清单**：

| 字段名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| id | string | 是 | 唯一标识符 `fs_{timestamp}` |
| fileName | string | 是 | 文件名 |
| category | `'experience'\|'raw'\|'publicity'` | 是 | 文件分类：经验沉淀/原始文件/宣传素材 |
| description | string | 是 | 文件描述 |
| sourceType | `'activity'\|'taskforce'\|'standalone'` | 是 | 关联来源类型 |
| sourceId | string | 是 | 关联来源 ID（standalone 时为空） |
| sourceName | string | 是 | 关联来源名称（冗余字段，方便展示） |
| uploadedBy | string | 是 | 上传人 personId |
| uploadedAt | string (ISO) | 是 | 上传时间 ISO 字符串 |
| tags | string | 否 | 标签（逗号分隔） |
| fileSize | number | 否 | 文件大小（字节，可选） |

**使用场景**：
- 组织者工作台：文件空间
- 纪检委员工作台：文件空间审计

#### 1.2.11 ExperienceDeposit（经验沉淀记录）

**定义**：深度参与者提交的经验沉淀。

**字段清单**：从 mockDB.experienceDeposits 推断，具体字段定义未在文档中明确。

**使用场景**：
- 深度参与者工作台：我的沉淀
- 纪检委员工作台：经验沉淀 Tab

#### 1.2.12 ComplianceReference（制度文件引用）

**定义**：组织委员管理的制度文件引用。

**字段清单**：从 mockDB.complianceReferences 推断，具体字段定义未在文档中明确。

**使用场景**：
- 组织委员工作台：制度文件 Tab

#### 1.2.13 ImageRecord（图片记录）

**定义**：宣传委员上传的活动图片，含标注信息与 Base64 编码。

**字段清单**：

| 字段名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| id | string | 是 | 唯一标识符 `img_{timestamp}` |
| date | string | 是 | 拍摄日期 YYYY-MM-DD |
| title | string | 是 | 图片标题 |
| subject | string | 是 | 拍摄主体（如人物/场景/物件） |
| activityId | string | 否 | 关联活动 ID（可选） |
| base64 | string | 是 | Base64 编码图片数据 |
| uploadedBy | string | 是 | 上传人 |
| uploadedAt | string (ISO) | 是 | 上传时间 ISO 字符串 |

**使用场景**：
- 宣传委员工作台：图片管理

#### 1.2.14 User（用户/角色预设）

**定义**：静态预设用户。

**字段清单**：

| 字段名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| id | string | 是 | 用户 ID（如 `u_sec`、`u_org`） |
| role | string | 是 | 角色（secretary/org-commissioner/prop-commissioner/disc-commissioner/leader/organizer/deep） |
| name | string | 是 | 用户名称 |

**使用场景**：
- 登录系统：用户身份识别
- 权限系统：角色判定

#### 1.2.15 Scenario（SOP 场景模板）

**定义**：12 个内置场景，驱动任务生成和工作流。

**字段清单**：

| 字段名 | 类型 | 说明 |
|--------|------|------|
| scenarioId | string | 场景唯一 ID |
| title | string | 场景标题（含【领域分类】前缀） |
| domain | `'activity'\|'organization'` | 所属领域 |
| description | string | 场景描述（含考勤类型说明） |
| tasks | ScenarioTask[] | 任务列表 |

**ScenarioTask 字段**：

| 字段名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| taskId | string | 条件 | 任务 ID（部分任务可省略） |
| title | string | 是 | 任务标题 |
| executor | string | 是 | 执行角色键 |
| supervisor | string\|null | 是 | 督办角色键（可为 null） |
| timeOffset | number\|null | 是 | 距 T-0 的天数偏移（null = 无时间锚点） |
| desc | string | 否 | 任务详细描述 |

**使用场景**：
- 活动创建：场景选择
- 任务生成：根据场景模板生成任务列表

#### 1.2.16 Definition（工作流定义）

**定义**：5 套状态机模板，驱动活动流转。

**字段清单**：

| 字段名 | 类型 | 说明 |
|--------|------|------|
| id | string | 定义 ID |
| title | string | 定义标题 |
| duration | `'short-term'\|'long-term'` | 活动时长分类 |
| states | State[] | 状态列表 |

**State 字段**：

| 字段名 | 类型 | 说明 |
|--------|------|------|
| name | string | 状态名（如 DRAFT、PENDING_LEADER） |
| label | string | 中文标签 |
| stage | string | 所属阶段（策划/审批/筹备/实施/收尾/复核/归档） |
| editable | boolean | 可编辑 |
| timeout | number | 超时时间（小时） |

**使用场景**：
- 活动流转：状态机驱动
- 工作流可视化：流程节点图

#### 1.2.17 Role Constants（角色常量）

**定义**：9 种角色的中文标签与视觉配色。

**字段清单**：

| 角色键 | 中文标签 | 视图类型 | 所属分类 |
|--------|---------|---------|---------|
| `participant` | 默认参与者 | participant | 参与层 |
| `leader` | 党小组组长 | manager | 管理视图 |
| `org-commissioner` | 组织委员 | manager | 条条支委 |
| `prop-commissioner` | 宣传委员 | manager | 条条支委 |
| `disc-commissioner` | 纪检委员 | manager | 条条支委 |
| `organizer` | 组织者 | manager | 管理视图 |
| `deep` | 深度参与者 | manager | 管理视图 |
| `secretary` | 党支书 | manager | 管理视图 |
| `global` | 全局视图 | global | 参考指南专用 |

**使用场景**：
- UI 渲染：角色标签显示
- 权限判定：角色类型识别

#### 1.2.18 AppState（应用状态）

**定义**：UI 视图状态，不持久化。

**字段清单**：

| 字段名 | 类型 | 初始值 | 说明 |
|--------|------|--------|------|
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
| calendarView | string | `'month'` | 日历视图模式：'month' \| 'week' \| 'day' \| 'list' |

**使用场景**：
- UI 渲染：视图状态管理
- 页面交互：状态切换

#### 1.2.19 AssignedRoles（赋权记录）

**定义**：书记赋权给组织者/深度参与者的记录。

**字段清单**：

| 字段名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| name | string | 是 | 同志姓名 |
| role | `'organizer' \| 'deep'` | 是 | 赋予角色 |
| activity | string | 否 | 关联活动名称（可为空） |

**使用场景**：
- 书记工作台：赋权管理
- 宣传委员工作台：专班成员展示

#### 1.2.20 ~~Deliverable（交付物）~~ - 已删除（T101）

**定义**：~~交付物数据，设计文档定义但代码未实现。~~ 已从设计文档删除，由 FileSpaceRecord 覆盖。

**字段清单**：

| 字段名 | 类型 | 必填 | 默认值 | 说明 |
|--------|------|------|--------|------|
| id | string | 是 | `generateId('dlv')` | 唯一标识符，前缀 `dlv_` |
| activityId | string | 是 | -- | 所属活动 ID |
| type | `'photography_draft'\|'attendance_summary'\|'meeting_record'\|'propaganda'\|'check_material'` | 是 | -- | 交付物类型 |
| owner | string | 是 | -- | 责任角色标识符 |
| ownerName | string | 否 | -- | 责任角色中文描述 |
| status | `'pending'\|'submitted'\|'archived'` | 是 | `'pending'` | 交付物状态 |
| submittedAt | string (ISO) | 否 | -- | 提交时间 |
| note | string | 否 | -- | 备注说明 |

**使用场景**：设计文档定义，但代码未实现。

---

## 二、数据类别需求匹配度分析

### 2.1 系统功能需求对照

根据 `content/strategy/COMMISSIONER_FRAMEWORK.md` 和 `content/sop/` 目录下的文件，系统需支持以下核心业务场景：

| 业务场景 | 涉及数据类别 | 匹配度 | 缺失/冗余情况 |
|---------|-------------|--------|--------------|
| **活动组织与执行** | ActivityRecord, Task, AttendanceRecord, InspectionRecord | ✅ 完整覆盖 | 无 |
| **考勤管理（基础）** | AttendanceRecord, MakeupTask | ✅ 完整覆盖 | 无 |
| **考察管理（进阶）** | InspectionRecord, AssignmentRecord | ⚠️ 部分缺失 | AssignmentRecord 字段定义不明确 |
| **专班管理** | TaskForceRecord, AssignedRoles | ⚠️ 部分缺失 | TaskForceRecord 字段定义不完整 |
| **档案归档** | FileSpaceRecord, ImageRecord | ✅ 完整覆盖 | 无 |
| **制度文件管理** | ComplianceReference | ⚠️ 字段定义不明确 | 缺少字段定义 |
| **经验沉淀** | ExperienceDeposit | ⚠️ 字段定义不明确 | 缺少字段定义 |
| **通知管理** | Notice | ⚠️ 字段定义不明确 | 缺少字段定义 |
| **交接管理** | HandoverRecord | ⚠️ 字段定义不明确 | 缺少字段定义 |
| **交付物管理** | ~~Deliverable~~ | ✅ 已删除 | 已从设计文档删除（T101），由 FileSpaceRecord 覆盖 |

### 2.2 数据类别定义准确性评估

| 数据类别 | 定义准确性 | 问题说明 |
|---------|-----------|---------|
| ActivityRecord | ✅ 准确 | 字段定义完整，文档与代码一致 |
| AttendanceRecord | ✅ 准确 | 字段定义完整，文档与代码一致 |
| Task | ✅ 准确 | 字段定义完整，文档与代码一致 |
| InspectionRecord | ✅ 准确 | 字段定义完整，文档与代码一致 |
| AssignmentRecord | ⚠️ 不完整 | 文档中缺少字段定义，仅代码中存在 |
| HandoverRecord | ⚠️ 不完整 | 文档中缺少字段定义，仅代码中存在 |
| MakeupTask | ⚠️ 不完整 | 文档中缺少字段定义，仅代码中存在 |
| TaskForceRecord | ⚠️ 不完整 | 文档中字段定义不完整，缺少关键字段 |
| Notice | ⚠️ 不完整 | 文档中缺少字段定义，仅代码中存在 |
| FileSpaceRecord | ✅ 准确 | 字段定义完整，文档与代码一致 |
| ExperienceDeposit | ⚠️ 不完整 | 文档中缺少字段定义，仅代码中存在 |
| ComplianceReference | ⚠️ 不完整 | 文档中缺少字段定义，仅代码中存在 |
| ImageRecord | ✅ 准确 | 字段定义完整，文档与代码一致 |
| User | ✅ 准确 | 字段定义完整，文档与代码一致 |
| Scenario | ✅ 准确 | 字段定义完整，文档与代码一致 |
| Definition | ✅ 准确 | 字段定义完整，文档与代码一致 |
| Role Constants | ✅ 准确 | 字段定义完整，文档与代码一致 |
| AppState | ✅ 准确 | 字段定义完整，文档与代码一致 |
| AssignedRoles | ✅ 准确 | 字段定义完整，文档与代码一致 |
| ~~Deliverable~~ | ✅ 已删除 | 已从设计文档删除（T101），由 FileSpaceRecord 覆盖 |

### 2.3 数据类别缺失与冗余识别

**缺失的数据类别**：
- 无明显缺失的数据类别，系统已覆盖所有业务场景

**冗余的数据类别**：
- ~~Deliverable~~：已从设计文档删除（T101），由 FileSpaceRecord 覆盖

**定义不完整的数据类别**：
- AssignmentRecord
- HandoverRecord
- MakeupTask
- TaskForceRecord
- Notice
- ExperienceDeposit
- ComplianceReference

---

## 三、数据类别字段共用性分析（重点任务）

### 3.1 字段级别详细比对

#### 3.1.1 核心业务数据字段比对矩阵

| 字段名 | ActivityRecord | AttendanceRecord | Task | InspectionRecord | FileSpaceRecord | ImageRecord |
|--------|---------------|------------------|------|-----------------|----------------|-------------|
| **id** | ✅ `act_` | ✅ | ✅ `tsk_` | ✅ | ✅ `fs_` | ✅ `img_` |
| **activityId** | -- | ✅ | ✅ | ✅ (条件) | ✅ (sourceId) | ✅ (可选) |
| **userId/personId** | -- | ✅ userId | -- | ✅ personId | ✅ uploadedBy | ✅ uploadedBy |
| **status** | ✅ | ✅ | ✅ | ✅ | -- | -- |
| **createdAt/recordedAt/uploadedAt** | ✅ createdAt | ✅ recordedAt | ✅ createdAt | ✅ recordedAt | ✅ uploadedAt | ✅ uploadedAt |
| **createdBy/recordedBy/uploadedBy** | ✅ createdBy | ✅ recordedBy | -- | ✅ recordedBy | ✅ uploadedBy | ✅ uploadedBy |
| **title/name** | ✅ title | -- | ✅ title | -- | ✅ fileName | ✅ title |
| **type** | ✅ | -- | -- | -- | ✅ category | -- |
| **date** | ✅ | -- | -- | -- | -- | ✅ |
| **description** | ✅ | -- | -- | ✅ role | ✅ | -- |
| **sourceType** | -- | -- | -- | ✅ | ✅ | -- |
| **sourceName** | -- | -- | -- | ✅ | ✅ | -- |

#### 3.1.2 时间戳字段比对

| 数据类别 | 时间戳字段名 | 类型 | 格式 | 语义 |
|---------|-------------|------|------|------|
| ActivityRecord | createdAt | string (ISO) | ISO 8601 | 创建时间 |
| AttendanceRecord | recordedAt | string (ISO) | ISO 8601 | 记录时间 |
| Task | createdAt | string (ISO) | ISO 8601 | 创建时间 |
| InspectionRecord | recordedAt | string (ISO) | ISO 8601 | 记录时间 |
| FileSpaceRecord | uploadedAt | string (ISO) | ISO 8601 | 上传时间 |
| ImageRecord | uploadedAt | string (ISO) | ISO 8601 | 上传时间 |

**共用性分析**：
- **完全相同的字段**：无（字段名不同）
- **语义相似可标准化的字段**：
  - `createdAt` / `recordedAt` / `uploadedAt` → 可统一为 `timestamp` 或保持语义差异
  - 建议：保持语义差异，因为"创建"、"记录"、"上传"有不同业务含义

#### 3.1.3 人员标识字段比对

| 数据类别 | 人员字段名 | 类型 | 语义 |
|---------|-----------|------|------|
| ActivityRecord | createdBy | string | 创建者用户 ID |
| AttendanceRecord | userId | string | 参会成员用户 ID |
| AttendanceRecord | recordedBy | string | 记录人用户 ID |
| Task | -- | -- | 无人员字段 |
| InspectionRecord | personId | string | 人员 ID |
| InspectionRecord | recordedBy | string | 记录人 personId |
| FileSpaceRecord | uploadedBy | string | 上传人 personId |
| ImageRecord | uploadedBy | string | 上传人 |

**共用性分析**：
- **完全相同的字段**：无（字段名不同）
- **语义相似可标准化的字段**：
  - `userId` / `personId` → 可统一为 `personId`（推荐）
  - `createdBy` / `recordedBy` / `uploadedBy` → 可统一为 `operatorId` 或保持语义差异
  - 建议：统一为 `personId` 作为人员标识，`operatorId` 作为操作者标识

#### 3.1.4 状态字段比对

| 数据类别 | 状态字段名 | 类型 | 枚举值 |
|---------|-----------|------|--------|
| ActivityRecord | status | enum | `draft`/`published`/`ongoing`/`completed` |
| AttendanceRecord | status | enum | `present`/`absent`/`leave` |
| Task | status | enum | `pending`/`in_progress`/`completed` |
| InspectionRecord | status | enum | `pending`/`confirmed` |

**共用性分析**：
- **完全相同的字段**：无（枚举值不同）
- **语义相似可标准化的字段**：
  - 所有数据类别都有 `status` 字段，但枚举值不同
  - 建议：保持差异，因为不同数据类别有不同的生命周期

#### 3.1.5 关联字段比对

| 数据类别 | 关联字段名 | 类型 | 语义 |
|---------|-----------|------|------|
| ActivityRecord | scenarioId | string | 关联 SOP 场景 ID |
| ActivityRecord | deliverableIds | string[] | ~~关联交付物 ID 列表~~（已废弃，T101） |
| AttendanceRecord | activityId | string | 所属活动 ID |
| Task | activityId | string | 所属活动 ID |
| InspectionRecord | activityId | string | 关联活动 ID（条件） |
| InspectionRecord | sourceType | enum | 考察来源类型 |
| FileSpaceRecord | sourceType | enum | 关联来源类型 |
| FileSpaceRecord | sourceId | string | 关联来源 ID |
| ImageRecord | activityId | string | 关联活动 ID（可选） |

**共用性分析**：
- **完全相同的字段**：
  - `activityId`：AttendanceRecord、Task、InspectionRecord、ImageRecord 共用
- **语义相似可标准化的字段**：
  - `activityId` / `sourceId` → 可统一为 `sourceId`（但语义不同）
  - 建议：保持差异，因为 `activityId` 明确指向活动，`sourceId` 可指向活动或专班

### 3.2 共用字段详细分析

#### 3.2.1 完全相同的字段

| 字段名 | 出现的数据类别 | 类型 | 一致性评估 |
|--------|---------------|------|-----------|
| **id** | 所有数据类别 | string | ✅ 完全一致（前缀不同） |
| **activityId** | AttendanceRecord, Task, InspectionRecord, ImageRecord | string | ✅ 完全一致 |
| **status** | ActivityRecord, AttendanceRecord, Task, InspectionRecord | enum | ⚠️ 字段名相同但枚举值不同 |

#### 3.2.2 语义相似可标准化的字段

| 字段组 | 原字段名 | 数据类别 | 标准化建议 |
|--------|---------|---------|-----------|
| **时间戳组** | createdAt, recordedAt, uploadedAt | ActivityRecord, AttendanceRecord, Task, InspectionRecord, FileSpaceRecord, ImageRecord | 保持语义差异（创建/记录/上传有不同业务含义） |
| **人员标识组** | userId, personId | AttendanceRecord, InspectionRecord | 统一为 `personId` |
| **操作者组** | createdBy, recordedBy, uploadedBy | ActivityRecord, AttendanceRecord, InspectionRecord, FileSpaceRecord, ImageRecord | 统一为 `operatorId` 或保持语义差异 |
| **来源类型组** | sourceType | InspectionRecord, FileSpaceRecord | ✅ 已统一 |

### 3.3 一致性分析

#### 3.3.1 字段定义一致性

| 维度 | 评估结果 | 问题说明 |
|------|---------|---------|
| **数据类型** | ✅ 一致 | 所有时间戳字段均为 `string (ISO)`，所有 ID 字段均为 `string` |
| **字段长度** | ⚠️ 未定义 | 文档中未定义字符串长度约束 |
| **约束条件** | ⚠️ 部分缺失 | 部分字段缺少必填/可选约束说明 |

#### 3.3.2 字段命名一致性

| 问题类型 | 涉及字段 | 影响范围 | 严重程度 |
|---------|---------|---------|---------|
| **同义异名** | userId vs personId | AttendanceRecord, InspectionRecord | 中 |
| **同义异名** | createdAt vs recordedAt vs uploadedAt | 多个数据类别 | 低（语义差异合理） |
| **同义异名** | createdBy vs recordedBy vs uploadedBy | 多个数据类别 | 低（语义差异合理） |

#### 3.3.3 字段格式一致性

| 维度 | 评估结果 | 问题说明 |
|------|---------|---------|
| **时间格式** | ✅ 一致 | 所有时间戳字段均使用 ISO 8601 格式 |
| **ID 格式** | ✅ 一致 | 所有 ID 字段均使用前缀+时间戳格式（如 `act_`、`tsk_`） |
| **枚举格式** | ✅ 一致 | 所有枚举字段均使用小写下划线格式 |

### 3.4 效率影响评估

#### 3.4.1 现有共用字段设计对系统功能实现的效率影响

| 共用字段 | 正面影响 | 负面影响 | 整体评估 |
|---------|---------|---------|---------|
| **id** | 统一的 ID 生成逻辑，便于通用查询函数 | 无 | ✅ 高效 |
| **activityId** | 统一的活动关联逻辑，便于级联查询和删除 | 无 | ✅ 高效 |
| **status** | 统一的状态字段名，便于通用状态过滤函数 | 枚举值不同，需分别处理 | ⚠️ 中等 |
| **时间戳字段** | 统一的 ISO 格式，便于时间排序和比较 | 字段名不同，需分别处理 | ⚠️ 中等 |
| **人员字段** | -- | 字段名不同，无法使用通用人员查询函数 | ❌ 低效 |

#### 3.4.2 查询效率影响

| 查询场景 | 当前设计效率 | 问题说明 |
|---------|-------------|---------|
| **按活动查询关联数据** | ✅ 高效 | 统一的 `activityId` 字段，可使用通用查询函数 |
| **按人员查询关联数据** | ❌ 低效 | 字段名不统一（userId/personId），需分别处理 |
| **按时间排序** | ⚠️ 中等 | 时间戳字段名不同，需分别处理 |
| **按状态过滤** | ⚠️ 中等 | 字段名相同但枚举值不同，需分别处理 |

### 3.5 优化建议

#### 3.5.1 字段标准化建议

| 优化项 | 当前状态 | 建议改进 | 优先级 | 影响范围 |
|--------|---------|---------|--------|---------|
| **人员标识统一** | userId / personId 混用 | 统一为 `personId` | 高 | AttendanceRecord, InspectionRecord |
| **操作者标识统一** | createdBy / recordedBy / uploadedBy 混用 | 统一为 `operatorId` 或保持语义差异 | 中 | 多个数据类别 |
| **时间戳字段** | createdAt / recordedAt / uploadedAt 混用 | 保持语义差异（合理） | 低 | 无需修改 |
| **状态枚举** | 不同数据类别枚举值不同 | 保持差异（合理） | 低 | 无需修改 |

#### 3.5.2 字段复用建议

| 复用场景 | 当前状态 | 建议改进 | 优先级 |
|---------|---------|---------|--------|
| **通用人员查询函数** | 无法实现（字段名不统一） | 统一人员字段名后可实现 | 高 |
| **通用时间排序函数** | 可实现但需分别处理 | 保持现状（语义差异合理） | 低 |
| **通用状态过滤函数** | 可实现但需分别处理 | 保持现状（枚举差异合理） | 低 |

#### 3.5.3 文档完善建议

| 数据类别 | 当前状态 | 建议改进 | 优先级 |
|---------|---------|---------|--------|
| AssignmentRecord | 字段定义缺失 | 补充完整字段定义 | 高 |
| HandoverRecord | 字段定义缺失 | 补充完整字段定义 | 高 |
| MakeupTask | 字段定义缺失 | 补充完整字段定义 | 高 |
| TaskForceRecord | 字段定义不完整 | 补充完整字段定义 | 高 |
| Notice | 字段定义缺失 | 补充完整字段定义 | 中 |
| ExperienceDeposit | 字段定义缺失 | 补充完整字段定义 | 中 |
| ComplianceReference | 字段定义缺失 | 补充完整字段定义 | 中 |
| ~~Deliverable~~ | 已从设计文档删除 | ✅ 已解决（T101），由 FileSpaceRecord 覆盖 | -- |

---

## 四、问题与改进方向

### 4.1 数据类别层面问题

| 问题编号 | 问题描述 | 严重程度 | 影响范围 |
|---------|---------|---------|---------|
| DC-01 | ~~Deliverable 设计文档定义但代码未实现~~ | ~~高~~ | ✅ 已解决（T101），已删除设计文档定义，由 FileSpaceRecord 覆盖 |
| DC-02 | 7 个数据类别字段定义不完整（AssignmentRecord、HandoverRecord、MakeupTask、TaskForceRecord、Notice、ExperienceDeposit、ComplianceReference） | 高 | 文档与代码不一致 |
| DC-03 | 部分数据类别缺少字段约束说明（如字符串长度、必填/可选） | 中 | 数据验证不完整 |

### 4.2 字段定义层面问题

| 问题编号 | 问题描述 | 严重程度 | 影响范围 |
|---------|---------|---------|---------|
| FD-01 | 人员标识字段不统一（userId vs personId） | 高 | 无法使用通用人员查询函数 |
| FD-02 | 操作者标识字段不统一（createdBy vs recordedBy vs uploadedBy） | 中 | 查询逻辑复杂化 |
| FD-03 | 时间戳字段名不统一（createdAt vs recordedAt vs uploadedAt） | 低 | 语义差异合理，无需修改 |
| FD-04 | 部分字段缺少约束条件说明 | 中 | 数据验证不完整 |

### 4.3 改进建议与优先级

#### 4.3.1 高优先级改进（P0）

| 改进项 | 改进内容 | 预期效果 | 工作量 |
|--------|---------|---------|--------|
| **统一人员标识字段** | 将 userId 统一为 personId | 实现通用人员查询函数 | 中 |
| **补充字段定义** | 为 7 个数据类别补充完整字段定义 | 文档与代码一致 | 高 |
| **~~决定 Deliverable 命运~~** | ~~实现或删除 Deliverable 设计~~ | ✅ 已解决（T101），已删除 | -- |

#### 4.3.2 中优先级改进（P1）

| 改进项 | 改进内容 | 预期效果 | 工作量 |
|--------|---------|---------|--------|
| **统一操作者标识字段** | 统一为 operatorId 或保持语义差异 | 简化查询逻辑 | 中 |
| **补充字段约束说明** | 为所有字段补充约束条件 | 完善数据验证 | 中 |

#### 4.3.3 低优先级改进（P2）

| 改进项 | 改进内容 | 预期效果 | 工作量 |
|--------|---------|---------|--------|
| **时间戳字段标准化** | 保持现状（语义差异合理） | 无需修改 | 无 |

---

## 五、审计结论

### 5.1 总体评估

| 维度 | 评估结果 | 说明 |
|------|---------|------|
| **数据类别完整性** | ✅ 良好 | 20 个数据类别覆盖所有业务场景 |
| **字段定义完整性** | ⚠️ 需改进 | 7 个数据类别字段定义不完整 |
| **字段共用性** | ⚠️ 需改进 | 人员标识字段不统一，影响查询效率 |
| **文档与代码一致性** | ⚠️ 需改进 | 部分数据类别文档与代码不一致 |

### 5.2 关键发现

1. **字段共用性问题**：人员标识字段不统一（userId vs personId），导致无法使用通用人员查询函数，影响系统效率。
2. **字段定义缺失**：7 个数据类别（AssignmentRecord、HandoverRecord、MakeupTask、TaskForceRecord、Notice、ExperienceDeposit、ComplianceReference）缺少完整字段定义，文档与代码不一致。
3. **设计冗余**：~~Deliverable 设计文档定义但代码未实现~~ → ✅ 已解决（T101），已从设计文档删除，由 FileSpaceRecord 覆盖。

### 5.3 改进路线图

| 阶段 | 改进内容 | 预计完成时间 |
|------|---------|-------------|
| **Phase 1** | 统一人员标识字段 + 补充字段定义 | 2026-07-20 |
| **Phase 2** | 统一操作者标识字段 + 补充字段约束 | 2026-07-25 |
| **Phase 3** | ~~决定 Deliverable 命运~~ + 文档完善 | ✅ Deliverable 已删除（T101） |

---

## 六、附录

### 6.1 数据类别字段完整清单

见本文档 §1.2 数据类别详细定义。

### 6.2 字段共用性分析详细矩阵

见本文档 §3.1 字段级别详细比对。

### 6.3 审计依据

- `content/design/DATA_ARCHITECTURE.md`
- `docs/src/core/domain.js`
- `docs/src/services/mock.js`
- `docs/src/core/state.js`
- `content/strategy/COMMISSIONER_FRAMEWORK.md`
- `content/strategy/FLAT_DESIGN.md`
- `content/sop/` 目录下的文件

---

**审计人**：Backend Architect
**审计日期**：2026-07-15
**报告版本**：v1.0