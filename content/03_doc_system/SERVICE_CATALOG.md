﻿﻿﻿---
title: "统一服务目录"
type: governance
role: "[工程师]+[AI]"
last_updated: "2026-07-20"
status: active
related_files: [docs/src/services/auth.js, docs/src/services/permission-manager.js, docs/src/core/bootstrap.js, docs/src/components/sidebar.js, content/04_web_design/DATA_ARCHITECTURE.md, content/02_institution/COMMISSIONER_FRAMEWORK.md, content/02_institution/ROLE_CLASSIFICATION.md]
---

# 统一服务目录（Service Catalog）

> 本文件汇总系统所有服务功能及其角色权限映射，作为功能盘点和权限设计的统一参考。
>
> 定位：[工程师]+[AI] — 工程师决策参考 + AI 自主读取作为实施上下文。
>
> 引用流程：[SECRETARY_PRONOUNCEMENTS.md P-006+P-007](../../SECRETARY_PRONOUNCEMENTS.md)（党建与党务工作理论）→ P-012+P-013（专班与赋权考察）→ [DATA_ARCHITECTURE.md](../04_web_design/DATA_ARCHITECTURE.md)（§登录态打桩设计）→ [COMMISSIONER_FRAMEWORK.md](../02_institution/COMMISSIONER_FRAMEWORK.md) → [DATA_ARCHITECTURE.md](../04_web_design/DATA_ARCHITECTURE.md)（登录系统设计前置）

---

## 〇、阅读说明

| 术语 | 含义 |
|------|------|
| **服务（Service）** | 系统中一组对外的功能集合，对应一个或多个 JS 服务文件 + 入口页面 |
| **分类** | 服务归属的业务大类：党建工作 / 党务工作 / 系统服务 |
| **管理模式（M）** | 可读可写，对该服务有完整管理权限 |
| **只读（R）** | 可查看，不可写入 |
| **无权限（—）** | 既不可读也不可写（或仅可见自身相关数据） |
| **自身（Self）** | 仅可操作/查看与本人相关的数据 |

> 角色权限依据 `docs/src/services/auth.js` 中 `ViewModeStore` 的 `canManage / canWriteActivity / canRecruitTaskForce / canAuthorize / canInitiateTaskForce` 等判定函数，以及 [ROLE_CLASSIFICATION.md §9b](ROLE_CLASSIFICATION.md)、[COMMISSIONER_FRAMEWORK.md §C](../02_institution/COMMISSIONER_FRAMEWORK.md) 的权限矩阵综合得出。

---

## 一、服务分类框架

系统服务按党建与党务工作理论（[P-006+P-007](../../SECRETARY_PRONOUNCEMENTS.md)）分为三大类：

### 党建工作

| 服务 | 服务文件 | 入口页面 |
|------|---------|---------|
| 活动管理服务 | `services/runtime.js + services/decision-tree.js` | `workspace/secretary.html、workspace/leader.html` |
| 专班管理服务 | `services/taskforce.js` | `workspace/org.html` |
| 分工记录服务 | `services/assignment.js` | `workspace/leader.html、workspace/organizer.html` |
| 考察记录服务 | `services/inspection.js` | `workspace/disc.html、workspace/organizer.html` |
| 交接管理服务 | `services/handover.js` | `workspace/leader.html、workspace/organizer.html` |

### 党务工作

| 服务 | 服务文件 | 入口页面 |
|------|---------|---------|
| 考勤管理服务 | `services/attendance.js` | `workspace/disc.html、party/disc.html` |
| 补课管理服务 | `services/makeup.js` | `party/disc.html` |
| 发展党员服务 | `modules/party.js` | `party/org.html` |
| 档案宣传服务 | `modules/party.js` | `party/prop.html` |
| 监督复盘服务 | `services/inspection.js` | `party/disc.html` |

### 系统服务

| 服务 | 服务文件 | 入口页面 |
|------|---------|---------|
| 认证服务 | `services/auth.js` | `login.html`（全站共用） |
| 权限服务 | `services/permission-manager.js` + `services/roles.js` | 全站共用（侧边栏身份视图） |
| 通知服务 | `services/notice.js` | `index.html`、各工作台 |
| 反馈服务 | `services/feedback.js` | `feedback.html` |
| 归档检索服务 | `services/mock.js`（只读聚合） | `archive.html`、`search.html` |

---

## 二、服务清单

### 2.1 活动管理服务

- **所属类别**：党建工作
- **功能描述**：活动的创建、编辑、发布、归档全生命周期管理，支持四维度决策树（组织场景 / 活动形式 / 时长 / 发起方向）。
- **入口页面**：`workspace/secretary.html`（党支书）、`workspace/leader.html`（党小组组长）
- **核心操作**：创建 / 读取 / 更新 / 删除 / 发布 / 归档
- **关键实现**：`BranchService.createActivity`（`runtime.js` 统一接口，当前指向 mock 层）；`DECISION_TREE_CONFIGS`（`decision-tree.js`，区分 leader / secretary 两套预设）
- **角色权限**：
  - 党支书：管理模式（创建 + 全量管理）
  - 党小组组长：管理模式（创建 + 本组活动管理）— 依据 `canWriteActivity()`
  - 组织者：管理模式（仅限被赋权的活动范围内，分工记录闭环）
  - 组织委员 / 宣传委员 / 纪检委员：只读（建档 / 备案 / 审计视角）
  - 深度参与者：自身（仅可见自己参与的活动）
  - 普通成员：只读（公开信息）
- **关联制度**：[COMMISSIONER_FRAMEWORK.md §审批流程规范 §一](../02_institution/COMMISSIONER_FRAMEWORK.md)（活动创建审批，自上而下无需审批 / 自下而上需审批）

### 2.2 专班管理服务

- **所属类别**：党建工作
- **功能描述**：专班的创建、招募、运行、解散全生命周期，含赋权记账与工作量汇总。
- **入口页面**：`workspace/org.html`（组织委员 — 唯一专班管理节点）
- **核心操作**：创建 / 招募（赋权）/ 运行跟踪 / 解散 / 工作量汇总
- **关键实现**：`TaskForceRecordStore`（`taskforce.js`，CRUD + mockDB 持久化）；`AuthStore.authorize()`（赋权，scope='taskforce'）
- **角色权限**：
  - 党支书：管理模式（可发起专班需求 + 全局管理）— `canRecruitTaskForce()`
  - 组织委员：管理模式（唯一专班管理节点，招募 / 赋权 / 解散）— `canRecruitTaskForce()`
  - 宣传委员 / 纪检委员：只读（可提出需求，但执行归组织委员）
  - 党小组组长 / 组织者 / 深度参与者：只读
  - 普通成员：无
- **关联制度**：[COMMISSIONER_FRAMEWORK.md §A.4~A.8](../02_institution/COMMISSIONER_FRAMEWORK.md)（专班核心定义与生命周期）、[COMMISSIONER_FRAMEWORK.md §审批流程规范 §二](../02_institution/COMMISSIONER_FRAMEWORK.md)（专班创建审批）

### 2.3 分工记录服务

- **所属类别**：党建工作
- **功能描述**：组织者对深度参与者的分工指派、跟踪、完成确认，构成考察记录的数据来源。
- **入口页面**：`workspace/leader.html`、`workspace/organizer.html`
- **核心操作**：指派分工 / 跟踪完成度 / 标记完成 / 逾期检测 / 提交参与角色确认
- **关键实现**：`addAssignmentRecord` / `completeAssignmentRecord` / `checkOverdue`（`assignment.js`）
- **角色权限**：
  - 党支书：管理模式
  - 党小组组长：管理模式（与组织者在分工记录权限上等同）
  - 组织者：管理模式（核心职能 — 平等协商分工 + 分工记录汇总）
  - 纪检委员：只读（审计视角）
  - 组织委员 / 宣传委员：只读
  - 深度参与者：自身（仅可见自己的分工 + 标记自己完成）
  - 普通成员：无
- **关联制度**：[DATA_ARCHITECTURE.md §1.2](../04_web_design/DATA_ARCHITECTURE.md)（数据流步骤 ①~⑨）、[FLAT_DESIGN.md](../02_institution/FLAT_DESIGN.md)（组织者与深度参与者扁平化）

### 2.4 考察记录服务

- **所属类别**：党建工作 + 党务工作（跨类别）
- **功能描述**：记录深度参与者和组织者的工作量（组织 / 深度参与-[角色]），由纪检委员确认后录入总表，提交组织委员建档。
- **入口页面**：`workspace/disc.html`（纪检委员确认）、`workspace/organizer.html`（组织者上传）、`party/disc.html`（总表管理）
- **核心操作**：上传表单 / 修改 / 确认录入总表 / 类别标签自动填入 / 超期提醒 / 单一活动/人员查询
- **关键实现**：`addInspectionRecord` / `updateInspectionRecord` / `deleteInspectionRecord`（`inspection.js`）
- **角色权限**：
  - 党支书：管理模式（审阅）
  - 纪检委员：管理模式（确认 + 录入总表 + 修改总表 + 类别标签 + 超期提醒）— 核心写入者
  - 组织委员：只读（接收考察记录建档）
  - 宣传委员：只读
  - 党小组组长 / 组织者：管理模式（上传 / 修改党小组活动考察表单）；组织者额外对自己组织的活动整体考察只读
  - 专班负责人：管理模式（上传 / 修改专班考察表单）
  - 深度参与者 / 普通成员：自身（查询自己历次活动考察）
- **关联制度**：[COMMISSIONER_FRAMEWORK.md §C.1a 考察管理](../02_institution/COMMISSIONER_FRAMEWORK.md)、[DATA_ARCHITECTURE.md §五](../04_web_design/DATA_ARCHITECTURE.md)（考勤 vs 考察维度）

### 2.5 交接管理服务

- **所属类别**：党建工作
- **功能描述**：活动 / 专班负责人的工作交接记录，含交接事项清单与逐项完成确认。
- **入口页面**：`workspace/leader.html`、`workspace/organizer.html`
- **核心操作**：创建交接记录 / 更新 / 逐项完成确认
- **关键实现**：`addHandoverRecord` / `updateHandoverRecord` / `completeHandoverItem`（`handover.js`）
- **角色权限**：
  - 党支书：管理模式
  - 党小组组长 / 组织者：管理模式（发起交接 + 逐项确认）
  - 组织委员 / 宣传委员 / 纪检委员：只读
  - 深度参与者：只读（接收交接）
  - 普通成员：无
- **关联制度**：[FLAT_DESIGN.md](../02_institution/FLAT_DESIGN.md)（组织者与深度参与者分工交接）

### 2.6 考勤管理服务

- **所属类别**：党务工作
- **功能描述**：记录党员 / 预备党员的出勤 / 请假 / 缺勤状态（0-1 变量），由纪检委员确认后录入总表。
- **入口页面**：`workspace/disc.html`、`party/disc.html`
- **核心操作**：上传考勤表单 / 修改 / 确认 + 录入总表 / 总表修改 / 超期提醒 / 单一活动/人员查询
- **关键实现**：`loadAttendanceRecords` / `saveAttendanceRecords`（`attendance.js`）；触发 `makeup.js` 自动生成补课任务
- **角色权限**：
  - 党支书：管理模式（审阅）
  - 纪检委员：管理模式（会议考勤全权 + 总表修改 + 超期提醒 + 确认录入）
  - 党小组组长 / 组织者：管理模式（党小组活动考勤：上传 / 修改）
  - 组织委员 / 宣传委员：只读（宣传委员接收考勤备案）
  - 深度参与者：只读
  - 普通成员：自身（查询自己历次活动考勤）
- **关联制度**：[COMMISSIONER_FRAMEWORK.md §C.1a 考勤管理](../02_institution/COMMISSIONER_FRAMEWORK.md)、[COMMISSIONER_FRAMEWORK.md §审批流程规范 §四](../02_institution/COMMISSIONER_FRAMEWORK.md)（考勤确认审批）

### 2.7 补课管理服务

- **所属类别**：党务工作
- **功能描述**：请假 / 缺勤人员的事后学习补救任务管理，考勤确认时自动生成。
- **入口页面**：`party/disc.html`
- **核心操作**：自动生成补课任务 / 标记补课完成 + 回写考勤 / 导出补课统计
- **关键实现**：`addMakeupTask` / `updateMakeupTask` / 自动生成函数（`makeup.js`，考勤确认时触发）
- **角色权限**：
  - 党支书：管理模式
  - 纪检委员：管理模式（标记补课完成 + 回写考勤 + 导出统计）
  - 组织委员：只读（查看补课任务列表 + 导出统计）
  - 宣传委员：无
  - 党小组组长 / 组织者：只读
  - 深度参与者 / 普通成员：自身（查看自己的补课任务）
- **关联制度**：[纪检委员工作流程指南](../02_institution/sop/纪检委员工作流程指南.md)（补课制度母本）

### 2.8 发展党员服务

- **所属类别**：党务工作
- **功能描述**：发展党员全流程追踪（积极分子 → 发展对象 → 预备党员 → 正式党员），含材料催缴。思想汇报为线下手写提交流程，不进系统（D-241）。
- **入口页面**：`party/org.html`（组织委员）
- **核心操作**：查看全量候选人列表 / 修改候选人阶段状态 / 上传更新材料 / 标记材料缺失并提醒
- **关键实现**：`modules/party.js`（组织委员面板渲染）
- **角色权限**：
  - 党支书：管理模式（全局）
  - 组织委员：管理模式（建档 + 修改阶段状态 + 上传材料 + 催缴）
  - 纪检委员：只读（审计 + 督办材料缺失）
  - 宣传委员：只读（备案）
  - 党小组组长 / 组织者 / 深度参与者 / 普通成员：无
- **关联制度**：[组织委员工作流程指南](../02_institution/sop/组织委员工作流程指南.md)、[COMMISSIONER_FRAMEWORK.md §C.1b](../02_institution/COMMISSIONER_FRAMEWORK.md)

### 2.9 档案宣传服务

- **所属类别**：党务工作
- **功能描述**：宣传档案归档、材料标准、模板管理、周报报送、制度文件引用区管理。
- **入口页面**：`party/prop.html`（宣传委员）
- **核心操作**：档案归档 / 材料标准维护 / 模板管理 / 周报报送 / 制度文件引用增删 / 接收考勤备案
- **关键实现**：`modules/party.js`（宣传委员面板渲染）+ `modules/references.js`（制度文件引用渲染）
- **角色权限**：
  - 党支书：管理模式（全局）
  - 宣传委员：管理模式（档案归档 + 材料标准 + 模板管理 + 周报报送）
  - 组织委员：管理模式（制度文件引用增删）
  - 纪检委员：只读（制度文件引用区只读）
  - 党小组组长 / 组织者 / 深度参与者 / 普通成员：无
- **关联制度**：[宣传委员工作流程指南](../02_institution/sop/宣传委员工作流程指南.md)、[COMMISSIONER_FRAMEWORK.md §C.1b](../02_institution/COMMISSIONER_FRAMEWORK.md)

### 2.10 监督复盘服务

- **所属类别**：党务工作
- **功能描述**：纪检委员对活动 / 专班工作时间流的阅览、超时提醒、复盘总结的批注 / 打回 / 确认。
- **入口页面**：`party/disc.html`
- **核心操作**：阅览时间流 / 超时邮件提醒 / 复盘超期提醒 / 复盘批注 / 打回 / 确认录入后台
- **关键实现**：`inspection.js`（复盘状态流转）+ `party/disc` 面板
- **角色权限**：
  - 党支书：管理模式
  - 纪检委员：管理模式（全权 — 阅览 / 提醒 / 批注 / 打回 / 确认）
  - 组织委员 / 宣传委员：无
  - 党小组组长 / 组织者：只读（提交复盘的主体，但确认权在纪检）
  - 深度参与者 / 普通成员：无
- **关联制度**：[COMMISSIONER_FRAMEWORK.md §审批流程规范 §五](../02_institution/COMMISSIONER_FRAMEWORK.md)（复盘审批）、[COMMISSIONER_FRAMEWORK.md §C.1a 活动监督复盘](../02_institution/COMMISSIONER_FRAMEWORK.md)

### 2.11 认证服务

- **用途**：登录态管理（sessionStorage 打桩）、站位 / 视图 / 模式三概念管理、赋权记录 CRUD。
- **入口页面**：`login.html`（登录页，全站共用）

### 2.12 权限服务

- **用途**：统一角色选择、模式推导流程，消除 header / sidebar 重复逻辑；维护角色赋权共享状态。
- **入口页面**：全站共用（侧边栏身份视图卡片）

### 2.13 通知服务

- **用途**：站内通知的发布、阅读、删除，审批流程关键节点触发通知。
- **入口页面**：`index.html`（主页通知列表）、各工作台

### 2.14 反馈服务

- **用途**：成员提交痛点 / 改进建议，党支书全权处理反馈流转。
- **入口页面**：`feedback.html`

### 2.15 归档检索服务

- **用途**：历史活动 / 专班的归档库（列表 + 画册视图）与全量资料查询。
- **入口页面**：`archive.html`（归档库）、`search.html`（资料查询）

---

## 三、角色-服务权限矩阵

> **权威源**：本文档 §三 自身（原 PERMISSION_MATRIX.md §五 链接至本节）。本表为该权威源在服务目录中的切面视图，冲突时以权威源为准。
> 行：服务；列：8 个角色。单元格：M=管理模式 / R=只读 / Self=仅自身 / —=无权限。

| 服务 | 党支书 | 组织委员 | 宣传委员 | 纪检委员 | 党小组组长 | 组织者 | 深度参与者 | 普通成员 |
|------|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| 活动管理 | M | R | R | R | M | M* | Self | R |
| 专班管理 | M | M | R | R | R | R | R | — |
| 分工记录 | M | R | R | R | M | M | Self | — |
| 考察记录 | M | R | R | M | M† | M† | Self | Self |
| 交接管理 | M | R | R | R | M | M | R | — |
| 考勤管理 | M | R | R | M | M† | M† | R | Self |
| 补课管理 | M | R | — | M | R | R | Self | Self |
| 发展党员 | M | M | R | R | — | — | — | — |
| 档案宣传 | M | M‡ | M | R | — | — | — | — |
| 监督复盘 | M | — | — | M | R | R | — | — |
| 认证服务 | M | M | R | R | M | Self | Self | Self |
| 权限服务 | M | M | M | M | M | M | R | R |
| 通知服务 | M | M | M | M | R | R | R | R |
| 反馈服务 | M | R | — | — | 提交 | 提交 | 提交 | 提交 |
| 归档检索 | R | R | R | R | R | R | R | R |

**注释**：

- **\*** 组织者对活动管理的 M 权限仅限被赋权的活动范围内（不能独立创建活动，只能在承包活动内做分工记录闭环）。
- **†** 党小组组长 / 组织者对考勤、考察的 M 权限仅限"上传 / 修改党小组活动表单"；总表的确认 + 录入 + 修改权归纪检委员。
- **‡** 组织委员对档案宣传的 M 权限仅限"制度文件引用增删"，档案归档 / 材料标准 / 模板管理归宣传委员。

---

## 四、服务间依赖关系

### 4.1 核心数据流依赖

活动管理 ──创建活动──► 分工记录 ──指派分工──► 考察记录
   │                       │                      │
   │                       │                      │ 纪检确认
   │                       ▼                      ▼
   │                   交接管理              维护人才库（组织委员建档）
   │
   ├──考勤确认──► 考勤管理 ──自动触发──► 补课管理
   │                 │
   │                 └──汇总提交──► 档案宣传（宣传委员备案）
   │
   └──专班赋权──► 专班管理 ──招募──► 权限服务（写入赋权记录）
                      │
                      └──解散──► 考察记录（工作量汇总）

### 4.2 服务触发关系

| 触发服务 | 被触发服务 | 触发条件 |
|---------|-----------|---------|
| 活动管理（创建活动） | 权限服务（生成活动赋权入口） | 党小组组长创建活动后 |
| 考勤管理（确认缺勤/请假） | 补课管理（自动生成补课任务） | 纪检委员确认考勤时 |
| 考察记录（组织者上传） | 监督复盘（待确认） | 组织者提交考察表单 |
| 专班管理（招募赋权） | 认证服务（写入赋权记录）+ 通知服务（通知被赋权者） | 组织委员勾选同志赋权 |
| 专班管理（解散） | 考察记录（工作量汇总报告）+ 认证服务（赋权回收） | 组织委员点击解散 |
| 任何审批节点 | 通知服务（站内信 + 邮件） | 提交 / 通过 / 驳回 / 生效 |
| 分工记录（完成确认） | 考察记录（生成深度参与记录） | 组织者一键提交参与角色确认 |

### 4.3 跨类别数据共享

依据 [DATA_ARCHITECTURE.md §8.2 党建与党务同源说明](../04_web_design/DATA_ARCHITECTURE.md)，党建板块与党务板块在后台指向同一份数据（`mockDB` / `ActivityRecordStore`），差异仅在于展示切面：

| 数据源 | 党建工作台展示切面 | 党务管理展示切面 |
|--------|------------------|----------------|
| `mockDB.attendances` | "你的出勤记录"（个人视角） | "全支部的考勤分析"（管理视角） |
| `mockDB.inspections` | "你的考察记录"（个人参与视角） | "全支部的考察汇总"（纪检确认 + 组织建档） |
| `mockDB.taskforces` | "活跃专班进展"（组织者执行视角） | "专班名单同步 + 工作量"（纪检监督视角） |

### 4.4 赋权关系链

赋权关系链（`AUTHORIZE_CHAIN`，源自 `auth.js`）决定视图可见范围与模式推导：

党支书 ──┬─► 组织委员 / 宣传委员 / 纪检委员（管理者只读）
         ├─► 党小组组长（管理者只读）
         └─► 组织者 / 深度参与者（管理者只读）

组织委员 ──► 组织者 / 深度参与者（专班赋权，管理者只读）
党小组组长 ──► 组织者 / 深度参与者（活动赋权，管理者只读）
宣传委员 ⇄ 纪检委员 ⇄ 组织委员（三支委同级互看，管理者只读）

> **核心原则**：赋权本身不需要审批（[COMMISSIONER_FRAMEWORK.md §审批流程规范 §三](../02_institution/COMMISSIONER_FRAMEWORK.md)），但赋权范围受限于赋权者的权限边界。组织委员只能在已获批专班中赋权；党小组组长只能在自己创建的活动内赋权。

---

## 五、模块路由与入口映射

> 完整的页面 → 入口 JS 映射，作为服务定位的导航参考。

### 5.1 顶层模块（侧边栏导航）

| 模块 | label | 入口页面 | 默认入口 JS |
|------|-------|---------|-----------|
| dashboard | 主页 | `docs/index.html` | `entries/main-entry.js` |
| workspace | 党建工作台 | `docs/workspace/index.html` | `entries/workspace-entry.js` |
| party | 党务管理 | `docs/party/index.html` | `entries/party-entry.js` |
| archive | 归档库 | `docs/archive.html` | `entries/archive-entry.js` |
| search | 资料查询 | `docs/search.html` | `entries/search-entry.js` |
| feedback | 意见反馈 | `docs/feedback.html` | `entries/feedback-entry.js` |
| issues | 意见反馈（核心） | `docs/data/issues.json` + localStorage | `services/issues.js` |
| milestones | 批次定义 | `docs/data/milestones.json` | `services/milestones.js` |

### 5.2 党建工作台角色子页面

| 角色 | 子页面 | 入口 JS | 视图模式 |
|------|--------|--------|---------|
| 党支书 | `workspace/secretary.html` | `ws-secretary-entry.js` | manage |
| 组织委员 | `workspace/org.html` | `ws-org-commissioner-entry.js` | manage |
| 宣传委员 | `workspace/prop.html` | `ws-prop-commissioner-entry.js` | manage |
| 纪检委员 | `workspace/disc.html` | `ws-disc-commissioner-entry.js` | manage / participant-observe（auto） |
| 党小组组长 | `workspace/leader.html` | `ws-leader-entry.js` | manage |
| 组织者 | `workspace/organizer.html` | `ws-organizer-entry.js` | manage |
| 深度参与者 | `workspace/deep.html` | `ws-deep-entry.js` | manage |
| 普通成员 | `workspace/visitor.html` | `ws-visitor-entry.js` | participant-observe |

### 5.3 党务管理角色子页面

| 角色 | 子页面 | 入口 JS |
|------|--------|--------|
| 党支书 | `party/secretary.html` | `party-secretary-entry.js` |
| 组织委员 | `party/org.html` | `party-org-entry.js` |
| 宣传委员 | `party/prop.html` | `party-prop-entry.js` |
| 纪检委员 | `party/disc.html` | `party-disc-entry.js` |

### 5.4 系统页面

| 页面 | 入口 JS | 用途 |
|------|--------|------|
| `docs/login.html` | `entries/login-entry.js` | 登录站位选择（D-219） |
| `docs/about.html` | `entries/about-entry.js` | 关于页 |

---

## 六、参考文档

- [DATA_ARCHITECTURE.md](../04_web_design/DATA_ARCHITECTURE.md) — 参与者数据流设计（数据流 + §登录态打桩设计）
- [ROLE_CLASSIFICATION.md](ROLE_CLASSIFICATION.md) §九 — 角色权限矩阵（权限矩阵权威源）
- [DATA_ARCHITECTURE.md](../04_web_design/DATA_ARCHITECTURE.md) — 登录系统设计前置规范（原 LOGIN_STUB §六~§十一）
- [COMMISSIONER_FRAMEWORK.md](../02_institution/COMMISSIONER_FRAMEWORK.md) — 支委系统设计（专班 + 权限矩阵 + §审批流程规范）
- [ROLE_CLASSIFICATION.md](./ROLE_CLASSIFICATION.md) — 文件角色分类体系定义
- [FLAT_DESIGN.md](../02_institution/FLAT_DESIGN.md) — 组织者与深度参与者的扁平化设计
- [ARCHITECTURE.md](../../ARCHITECTURE.md) — 项目整体架构