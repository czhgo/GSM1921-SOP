﻿﻿﻿﻿﻿﻿---
title: "系统架构说明"
type: architecture
role: "[工程师]+[AI]"
last_updated: "2026-08-03"
version: "7.3"
status: active
related_files: [CLAUDE.md, content/04_web_design/]
---

# Architecture

> 光华管理学院本科生党支部组织操作系统 — 核心架构说明
> last_updated: "2026-07-21" | 目标读者: [工程师]+[AI]

---

## 一、项目概述

Org OS 是光华管理学院本科生党支部的组织运行操作系统。它将党支部制度文本（SOP）转化为可执行的代码工作流，并由 10 个 AI Agent 协作维护与迭代。

**核心命题**: 如何让一套制度文本持续驱动一个可运行的软件系统？

**答案**: SSOT（单一信息源）溯源治理 + Agent 协作链路 + 版本日志追踪。

---

## 二、领域模型

### 党建工作与党务工作分类

| 域 | 涵盖内容 |
|----|---------|
| **党建工作** | 主题党日、三会一课（支部党员大会/支委会/党小组会/党课）、专班管理 |
| **党务工作** | 发展党员、民主评议党员、换届选举、考勤考察、制度修订、职责分工、意见反馈、合规审查、文档规范 |

### 条块概念 [工作表达]

- **条条**: 功能委员线（组织委员 / 宣传委员 / 纪检委员）
- **块块**: 党小组组长线（group1 / group2 / group3）

---

## 三、Agent 协作体系

系统由 10 个 VS Code 自定义 Agent 组成，通过 handoffs 按钮形成协作链路。

### Agent 注册表（摘要）

| Agent | 类型 | 职责 | 工具权限 | Handoffs | 关联 Skill |
|-------|------|------|---------|----------|-----------|
| 协调调度Agent | 协调型 | 计划拆解、排序、依赖梳理 | read, search | ✅ | — |
| 规范执行Agent | 执行型 | 文档规范化、术语治理 | read, agent, edit, search | ✅ (→日志记录Agent) | term-cleaner, anchor-fixer |
| 文本执行Agent | 执行型 | 文本母本与内容层治理 | read, agent, edit, search | ✅ (→日志记录Agent) | sop-sync, yaml-slim |
| 代码执行Agent | 执行型 | 代码内容层与 SOP 映射 | read, agent, edit, search | ✅ (→日志记录Agent) | sop2code, data-inspector |
| UI执行Agent | 执行型 | UI 交互与可用性 | read, agent, edit, search | ✅ (→日志记录Agent) | ui-verifier |
| 合规执行Agent | 执行型 | 规则审查与合规纠偏 | read, agent, edit, search | ✅ (→日志记录Agent) | audit-report |
| 独立审查Agent | 审查型 | 三层合规审查与独立巡视 | read, search | ❌ | audit-report, data-inspector, ui-verifier |
| 架构监督Agent | 监督型 | 全局核心规则与架构监督 | read, agent, edit, search | ❌ | — |
| 经验分析Agent | 分析型 | 经验提炼与沉淀 | read, edit, search | ❌ | experience-distiller |
| 日志记录Agent | 记录型 | 系统变更日志记录 | read, edit, search | ❌ | log-recorder |

### 任务类别 → Agent 委派链路

| 任务类别 | 触发关键词 | Agent 委派链路 |
|--------|-----------|---------------|
| 党建工作 | 主题党日、三会一课、专班管理 | 协调调度Agent → 文本执行Agent → 代码执行Agent → UI执行Agent → 日志记录Agent |
| 党务工作 | 发展党员、民主评议党员、换届选举、考勤考察、制度修订、职责分工、意见反馈、合规审查、文档规范 | 协调调度Agent → 规范执行Agent → 合规执行Agent → 独立审查Agent → 日志记录Agent |
| 架构治理 | 核心规则修改、Agent配置、Skill注册、权限变更、架构重构 | 架构监督Agent → 协调调度Agent → 日志记录Agent |
| 经验提炼 | 经验沉淀、日志分析、复盘总结、最佳实践 | 经验分析Agent → 日志记录Agent |

**优先级**: 架构治理 > 党务管理 > 党建工作 > 经验提炼

---

## 四、分层架构

> 文档按"5 类知识类型"组织（完整定义见 [OPERATIONS_GUIDE.md §7.1](./OPERATIONS_GUIDE.md#71-文档权威层级5类知识类型)）。本节给出各层物理分布。

```
Layer 0: 核心层（最高权威）
  └─ CLAUDE.md                            [工程师]+[AI] 全局系统指令（Harness，最高层上下文入口）
  └─ content/03_doc_system/SSOT_INDEX.md  [AI] 母本注册表与溯源参考

Layer 1: 知识类型 1 — 战略（支部为什么存在、根本目标、战略路线）
  └─ content/01_strategy/                 [用户]+[AI] 战略路线与设计理念
      ├── DEVELOPMENT_PATH.md             [用户]+[AI] "管理事、服务人"战略
      ├── SECRETARY_PRONOUNCEMENTS.md     [用户]+[AI] 书记重要论断汇编（项目顶级战略文档）
      └── references/                     [用户] 参考材料与模板（合规文件/历史会议材料/建设探索）

Layer 2: 知识类型 2 — 制度（组织架构、分工、SOP）
  └─ content/02_institution/              [用户]+[AI] 组织制度层
      ├── sop/                            [用户]+[AI] 制度母本，所有代码逻辑的来源
      ├── COMMISSIONER_FRAMEWORK.md       [用户]+[AI] 支委系统框架
      ├── FLAT_DESIGN.md                  [用户]+[AI] 扁平化设计
      └── ROLE_CLASSIFICATION.md          [用户]+[AI] 文件角色分类体系

Layer 3: 知识类型 3 — 文档系统治理（文档怎么治理、术语、运行标准）
  └─ content/03_doc_system/               [工程师]+[AI] 系统治理层
      ├── OPERATIONS_GUIDE.md             [工程师]+[AI] 运行标准（含§15 周期性任务）
      ├── USAGE_POLICY.md                 [工程师]+[AI] 使用规范（术语+Emoji）
      ├── DOC_MAP.md                      [工程师]+[AI] 文档导航中心
      ├── CHECKLIST.md                    [工程师]+[AI] 校验清单
      ├── SERVICE_CATALOG.md              [工程师]+[AI] 统一服务目录
      └── ARCHITECTURE.md                 [工程师]+[AI] 核心架构说明（本文件）

Layer 4: 知识类型 4+5 — 网站设计 + AI 编码
  └─ content/04_web_design/               [工程师]+[AI] 设计理念层（DATA_ARCHITECTURE/DESIGN_SYSTEM/MODULE_UI_DESIGN/SOP_WEB）
  └─ content/05_ai_coding/                [工程师]+[AI] AI 编码层（KNOWN_PITFALLS）

Layer 5: 经验沉淀（跨多类知识类型）
  └─ content/insights/                    [用户]+[AI] 经验沉淀（双文件）

Layer 6: 实现层（代码实现与运行时）
  └─ docs/                                [用户]+[AI] 前端代码层（8 根 HTML + workspace/ 6 工作台 + ESM 模块化源码）
  └─ server/                              [工程师]+[AI] Node 一体化后端（Express + better-sqlite3）

Layer 7: 审计参考层（审计与参考）
  └─ .ctx/                                [AI]/[工程师]+[AI] 审计底座（logs/TIMESTAMPS/SNAPSHOT/REVIEW_QUEUE）
```

---

## 五、仓库结构

```
/
├── README.md                          [用户] 对外门面，最后编辑环节
├── CLAUDE.md                         [工程师]+[AI] 上下文入口（甲部 Harness + 乙部执行 + 丙部待决策）
├── server/                            [工程师]+[AI] Node 一体化后端（Express + better-sqlite3）
│   ├── server.js / app.js / db.js / seed.js   [工程师]+[AI] 后端核心
│   ├── routes/                        [工程师]+[AI] auth / resources / uploads
│   └── test/                          [工程师]+[AI] 测试
├── docs/                              [工程师]+[AI] 前端代码层（8 根 HTML + workspace/ 6 工作台 + ESM 模块化源码）
│   ├── index.html                     [用户]+[AI] 主页（通知/招募/活动日历/待办）
│   ├── notice.html                    [用户]+[AI] 通知独立页
│   ├── about.html                     [用户]+[AI] 支部的故事
│   ├── archive.html                   [用户]+[AI] 归档库
│   ├── search.html                    [用户]+[AI] 资料查询
│   ├── feedback.html                  [用户]+[AI] 意见反馈
│   ├── help.html                      [用户]+[AI] 系统说明书
│   ├── login.html                     [用户]+[AI] 登录页
│   ├── workspace/                     [用户]+[AI] 角色工作台页面（6 个 HTML）
│   │   ├── secretary.html             [用户]+[AI] 书记工作台（工作台+赋权管理+issue管理+通知发布+待办）
│   │   ├── leader.html                [用户]+[AI] 党小组组长工作台（活动写入+考勤上传+考察上传+复盘提交+待办）
│   │   ├── org.html                   [用户]+[AI] 组织委员工作台（考察上传+专班管理+人才库+发展党员+待办）
│   │   ├── prop.html                  [用户]+[AI] 宣传委员工作台（宣传任务+项目看板+档案归档+周报报送+待办）
│   │   ├── disc.html                  [用户]+[AI] 纪检委员工作台（考勤管理+监督复盘+考察管理+补课制度+公邮管理+待办）
│   │   └── visitor.html               [用户]+[AI] 成员只读面板（含待办）
│   └── src/                           [工程师]+[AI] ESM 模块化源码
│       ├── entries/                   [工程师]+[AI] 页面入口（15 个 entry JS）
│       ├── components/                [工程师]+[AI] 共享组件（18 个，含 todo-list/custom-select/workspace-popover）
│       ├── core/                      [工程师]+[AI] 核心工具（12 个，含 domain/data-adapter/api-adapter/mock-adapter）
│       ├── config/                    [工程师]+[AI] 配置（branch.json）
│       ├── services/                  [工程师]+[AI] 服务层（20 个，含 todo/auth/notice/decision-tree/image）
│       ├── mock/                      [工程师]+[AI] Mock 数据（10 个，含 accounts）
│       ├── modules/                   [工程师]+[AI] 业务模块（1 个，references.js）
│       ├── workflow/                  [工程师]+[AI] 工作流引擎（6 个）
│       └── styles.css                 [工程师]+[AI] 全局样式
│
├── .markdownlint.json                 [工具] 代码风格规范
├── .markdownlintignore                [工具] 代码风格忽略列表
│
├── content/                           [用户]+[AI] 内容中心（按 5 类知识类型组织，见第四章）
│   ├── 01_strategy/                  [用户]+[AI] 战略层（支部为什么存在、根本目标、战略路线）
│   │   ├── DEVELOPMENT_PATH.md       [用户]+[AI] "管理事、服务人"战略
│   │   ├── SECRETARY_PRONOUNCEMENTS.md [用户]+[AI] 书记重要论断汇编（项目顶级战略文档，27 条论断）
│   │   ├── README.md                 [用户]+[AI] 战略层目录索引
│   │   └── references/               [用户] 参考材料与模板（合规文件/历史会议材料/建设探索/党支部工作记录）
│   ├── 02_institution/               [用户]+[AI] 制度层（组织架构、分工、SOP）
│   │   ├── sop/                      [用户]+[AI] 制度母本层（所有代码逻辑的来源）
│   │   │   ├── INDEX.md              [用户]+[AI] SOP 导航目录
│   │   │   ├── 常见工作场景快速指南.md [用户]+[AI] 快速使用指南
│   │   │   ├── 支委与党小组定人定责定岗说明.md [用户]+[AI] 职责分工文档
│   │   │   ├── 宣传委员工作流程指南.md [用户]+[AI] 宣传委员 SOP
│   │   │   ├── 组织委员工作流程指南.md [用户]+[AI] 组织委员 SOP
│   │   │   ├── 纪检委员工作流程指南.md [用户]+[AI] 纪检委员 SOP
│   │   │   └── 党小组组长工作手册.md   [用户]+[AI] 党小组组长操作指南
│   │   ├── COMMISSIONER_FRAMEWORK.md [用户]+[AI] 支委系统框架
│   │   ├── FLAT_DESIGN.md            [用户]+[AI] 扁平化设计
│   │   ├── ROLE_CLASSIFICATION.md    [用户]+[AI] 文件角色分类体系
│   │   └── README.md                 [用户]+[AI] 制度层目录索引
│   ├── 03_doc_system/                [工程师]+[AI] 文档系统治理层（文档怎么治理、术语、运行标准）
│   │   ├── SSOT_INDEX.md             [AI] 母本注册表与溯源参考
│   │   ├── OPERATIONS_GUIDE.md       [工程师]+[AI] 运行标准（含§15 周期性任务）
│   │   ├── USAGE_POLICY.md           [工程师]+[AI] 使用规范（术语+Emoji）
│   │   ├── DOC_MAP.md                [工程师]+[AI] 文档导航中心
│   │   ├── CHECKLIST.md              [工程师]+[AI] 校验清单
│   │   ├── SERVICE_CATALOG.md        [工程师]+[AI] 统一服务目录
│   │   ├── ARCHITECTURE.md           [工程师]+[AI] 核心架构说明（本文件）
│   │   ├── 工作模板/                  [用户]+[AI] 经验沉淀辅助提示词
│   │   └── README.md                 [工程师]+[AI] 文档系统治理层目录索引
│   ├── 04_web_design/                [工程师]+[AI] 网站设计层（设计理念）
│   │   ├── DATA_ARCHITECTURE.md      [工程师]+[AI] 数据架构设计
│   │   ├── MODULE_UI_DESIGN.md       [工程师]+[AI] 模块界面设计
│   │   ├── DESIGN_SYSTEM.md          [工程师]+[AI] 设计系统规范
│   │   ├── SOP_WEB.md                [工程师]+[AI] SOP 系统指南
│   │   ├── SCHOOL_IT_DEPLOYMENT.md   [工程师]+[AI] 学院 IT 部署说明
│   │   └── README.md                 [工程师]+[AI] 网站设计层目录索引
│   ├── 05_ai_coding/                 [工程师]+[AI] AI 编码层
│   │   ├── KNOWN_PITFALLS.md         [工程师]+[AI] 已知陷阱
│   │   └── README.md                 [工程师]+[AI] AI 编码层目录索引
│   ├── insights/                     [用户]+[AI] 经验沉淀（跨多类知识类型）
│   │   ├── 党支部管理与实务经验沉淀.md [用户]+[AI] 按 5 类知识类型组织的经验沉淀
│   │   └── 工程演进与设计方法论.md     [用户]+[AI] 工程方法论沉淀
│   └── README.md                     [用户]+[AI] 内容中心索引
│
├── .ctx/                              [AI] 运行时上下文（审计底座）
│   ├── TIMESTAMPS.md                  [工程师]+[AI] 文件时间戳注册表
│   ├── SNAPSHOT.md                    [AI] 当前基线快照
│   ├── REVIEW_QUEUE.md                [工程师]+[AI] 书记评议队列
│   ├── snapshots/                     [AI] 历史快照归档
│   └── logs/                          [工程师]+[AI] 月度执行日志与决策日志
│       ├── archive/                   [工程师]+[AI] 历史日志归档
│       ├── EXECUTION_LOG_INDEX.md     [工程师]+[AI] 日志导航索引
│       ├── YYYY-MM-EXECUTION_LOG.md   [工程师]+[AI] 月度执行日志
│       └── YYYY-MM-DECISION_LOG.md    [工程师]+[AI] 月度决策日志
│
├── .vscode/settings.json              [工具] VS Code 工作区配置
└── assets/                            [用户] 静态资源目录
```

---

## 六、数据模型

### Activity（活动记录）

数据结构定义于 `docs/src/core/domain.js`（领域层 typedef）。核心字段模型：

| 字段 | 类型 | 说明 |
|------|------|------|
| id | string | 唯一标识符（id.js 生成） |
| title | string | 活动标题 |
| type | string | 活动类型（党小组会/支委会/主题党日/党课/支部党员大会/组织生活会等） |
| status | string | 活动状态（draft/published/ongoing/completed/cancelled） |
| visibility | string | 可见范围（branch=全支部 / group=党小组） |
| date | string | 活动日期 ISO 格式 |
| domain | string | 领域（activity=党建活动 / organization=组织事务） |
| scenarioId | string | 关联场景 ID（对应 sopDatabase） |
| organizer | string | 组织者 personId（由 assignments 主源同步派生，见 services/auth.js） |
| assignments | object[] | 分工记录（organizer/deep/participant 角色，权限联动主源） |
| createdBy | string | 创建者用户 ID |
| createdAt | string | 创建时间 ISO 格式 |
| isBrand | boolean | 品牌属性标签（书记认定） |

mockDB 为唯一数据源，所有视图经 Service 层读取；按角色过滤经 `services/auth.js`（以 `activity.assignments` 为主源，`syncProjectRoles()` 保证与顶层 organizer 一致）。

### Task（任务）

数据结构定义于 `docs/src/core/domain.js`（typedef + mockDB.tasks）。核心字段：

| 字段 | 类型 | 说明 |
|------|------|------|
| id | string | 唯一标识符 |
| activityId | string | 所属活动 ID |
| title | string | 任务标题 |
| status | string | 任务状态（pending/in_progress/completed） |
| createdAt | string | ISO 格式创建时间（审计字段） |

### Storage Model

- **键名**: `workflowos_branch_db_v1`（`localStorage`，见 `docs/src/services/mock.js`）
- **根结构**: `mockDB = { _schema, users, activities, tasks, attendances, inspections, activityReviews, taskforceReviews, assignments, handovers, makeupTasks, notices, todos, imageRecords, ... }`
- **版本防御**: `loadDB()` 检查 `_schema !== SCHEMA_VERSION` 时拒绝脏数据并 `console.warn`

---

## 七、依赖链与数据变更规则

### 依赖链

```
content/02_institution/sop/ → docs/src/workflow/ → core/constants/utils → services → state → components → entries/main-entry.js → UI
```

所有 mutation 必须经过 Service 层；UI 层禁止直接操作 `mockDB`。

### 数据变更规则

**所有数据变更必须经过 Service 层。**

**禁止操作（Service 层之外）**:
- `mockDB` 直接变更（例如 `.push()`、直接赋值）
- `localStorage` 直接写入（`localStorage.setItem`）

**允许写入操作（通过 API）**:
- `BranchService.createActivity()`
- `BranchService.updateActivity()`
- `BranchService.archiveActivity()`
- `BranchService.createTask()`
- `BranchService.toggleTaskStatus()`

**读取操作例外**: 为避免过度限制并确保渲染性能，读取操作（list、get）可直接从 `mockDB` 读取，但优先使用 Service 层访问以确保严格一致性。

---

## 八、SSOT 双向变更流水线

```
                    ┌─────────────────────────────────┐
                    │  CLAUDE.md                       │ ← 核心层（治理起点）
                    │  SSOT_INDEX.md                   │ ← 母本注册表
                    └──────────────┬──────────────────┘
                                   │ 溯源校验
                                   ▼
                          content/02_institution/sop/*.md
                          文本母本层
                                   │ 下游传播
                                   ▼
                          docs/src/workflow/
                          代码内容层
                                   │
                                   ▼
                    ┌─────────────────────────┐
                    │  docs/src/*  (service + UI)   │ ← 运行时层
                    │  docs/index.html              │
                    └─────────────────────────┘
```

### 溯源铁律

修改子本前必须先查母本。子本变更若无法指向母本 → 禁止写盘。

### 适用规则（Gate Check）

- 修改 `docs/src/workflow/` 或更下层前，必须确认母本 `content/02_institution/sop/` 已更新
- 修改 Agent 配置或 Skill 定义前，必须确认 `SSOT_INDEX.md` 注册表已同步
- 跨层修改须先完成上层确认方可推进下层

### Change Trace 四要素（修改 docs/src/ 或 docs/index.html 前必须输出）

1. `SSOT source`: 母本变更依据（引用 `SSOT_INDEX.md` 注册表链路）
2. `SOP impact`: 本次 SOP 变更情况（引用 `content/02_institution/sop/` 具体文件与条款，无变化写 `none`）
3. `Schema impact`: 数据结构变更情况（无变化写 `none`）
4. `Service impact`: 服务层方法变更情况（无变化写 `none`）

---

## 九、快速导航

| 我需要... | 去哪里 |
|----------|--------|
| 快速了解项目 | README.md |
| 看待办任务 | CLAUDE.md 乙部（具体执行事项） |
| 查全局系统指令 | CLAUDE.md |
| 查母本链路 | SSOT_INDEX.md |
| 查审查状态 | .ctx/SNAPSHOT.md |
| 查 SOP 流程 | content/02_institution/sop/INDEX.md |
| 查执行日志 | .ctx/logs/YYYY-MM-EXECUTION_LOG.md |
| 取用工作模板 | content/03_doc_system/工作模板/ |
| 提交改进反馈 | docs/feedback.html（在线反馈入口） |
| 查官方合规文件 | content/01_strategy/references/合规文件/ |
