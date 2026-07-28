﻿﻿﻿﻿﻿﻿﻿---
title: "五层架构说明"
type: architecture
role: "[工程师]+[AI]"
last_updated: "2026-07-22"
version: "7.2"
status: active
related_files: [CLAUDE.md, content/04_web_design/]
---

# Architecture

> 光华管理学院本科生党支部组织操作系统 — 核心架构说明
> last_updated: "2026-07-21" | 目标读者: [工程师]+[AI]

---

## 一、项目概述

Org OS 是光华管理学院本科生党支部的组织运行操作系统。它将党支部制度文本（SOP）转化为可执行的代码工作流，并由 10 个 AI Agent 组成治理集群进行持续维护与迭代。

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

## 三、Agent 治理集群

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

### 任务域 → Agent 委派链路

| 任务域 | 触发关键词 | Agent 委派链路 |
|--------|-----------|---------------|
| 党建工作 | 主题党日、三会一课、专班管理 | 协调调度Agent → 文本执行Agent → 代码执行Agent → UI执行Agent → 日志记录Agent |
| 党务工作 | 发展党员、民主评议党员、换届选举、考勤考察、制度修订、职责分工、意见反馈、合规审查、文档规范 | 协调调度Agent → 规范执行Agent → 合规执行Agent → 独立审查Agent → 日志记录Agent |
| 架构治理 | 核心规则修改、Agent配置、Skill注册、权限变更、架构重构 | 架构监督Agent → 协调调度Agent → 日志记录Agent |
| 经验提炼 | 经验沉淀、日志分析、复盘总结、最佳实践 | 经验分析Agent → 日志记录Agent |

**优先级**: 架构治理 > 党务管理 > 党建工作 > 经验提炼

---

## 四、分层架构

> 文档权威层级共 5 层（L0~L4），完整定义见 [OPERATIONS_GUIDE.md §7.1](./OPERATIONS_GUIDE.md)。本节给出各层物理分布。

```
Layer 0: 核心层（最高权威）
  └─ CLAUDE.md                            [工程师]+[AI] 全局系统指令（核心规则）
  └─ SSOT_INDEX.md                        [AI] 母本注册表与溯源参考
  └─ ARCHITECTURE.md                      [工程师]+[AI] 核心架构说明（本文件）
  └─ SECRETARY_PRONOUNCEMENTS.md          [用户]+[AI] 书记重要论断汇编（项目顶级战略文档）

Layer 1: 理论层（为什么这样做）
  └─ content/01_strategy/                    [用户]+[AI] 战略路线与设计理念
  └─ content/04_web_design/                      [工程师]+[AI] 设计文档（架构+功能）

Layer 2: 治理层（怎么做）
  └─ content/03_doc_system/                  [工程师]+[AI] 治理规范（USAGE_POLICY/OPERATIONS_GUIDE 等）
  └─ content/02_institution/sop/                         [用户]+[AI] 制度母本，所有代码逻辑的来源

Layer 3: 实现层（代码实现与运行时）
  └─ docs/src/workflow/                   [工程师]+[AI] SOP 数据库与工作流引擎
  └─ docs/src/core/                       [工程师]+[AI] 静态常量/工具/UUID/状态/领域
  └─ docs/src/components/                 [工程师]+[AI] 日历/检查器渲染
  └─ docs/src/entries/                    [工程师]+[AI] 启动入口（唯一 DOM 更新入口）
  └─ docs/src/services/                   [工程师]+[AI] 服务层
  └─ docs/src/styles.css                  [工程师]+[AI] 全局样式
  └─ docs/*.html                          [用户]+[AI] UI 入口与运行时页面（Flat Matte 骨架）

Layer 4: 审计参考层（审计与参考）
  └─ .ctx/TIMESTAMPS.md                   [工程师]+[AI] 文件时间戳注册表
  └─ .ctx/SNAPSHOT.md                     [AI] 当前基线快照
  └─ .ctx/logs/YYYY-MM-EXECUTION_LOG.md   [工程师]+[AI] 月度执行日志
  └─ content/references/合规文件/          [用户] 党章、条例、规范（PDF/DOCX，只读）
  └─ content/references/工作模板/          [用户]+[AI] 工作模板、经验沉淀辅助提示词
  └─ content/references/历史会议材料/      [用户] 历史会议记录
```

---

## 五、仓库结构

```
/
├── README.md                          [用户] 对外门面，最后编辑环节
├── ARCHITECTURE.md                    [工程师]+[AI] 本文件，核心架构说明
├── CLAUDE.md                         [工程师]+[AI] 未来执行路线图
├── SSOT_INDEX.md                     [AI] 母本注册表与溯源参考
├── docs/                              [工程师]+[AI] 代码实现层与运行时
│   ├── index.html                     [用户]+[AI] UI 入口（Flat Matte 骨架）
│   ├── about.html                     [用户]+[AI] 系统说明书
│   ├── archive.html                   [用户]+[AI] 归档库
│   ├── search.html                    [用户]+[AI] 资料查询
│   ├── feedback.html                  [用户]+[AI] 意见反馈
│   ├── workspace/                     [用户]+[AI] 党建工作台页面
│   │   ├── index.html                 [用户]+[AI] 党建工作台入口
│   │   ├── secretary.html             [用户]+[AI] 党建·党支书工作台
│   │   ├── leader.html                [用户]+[AI] 党建·党小组组长工作台
│   │   ├── organizer.html             [用户]+[AI] 党建·组织者工作台
│   │   ├── deep.html                  [用户]+[AI] 党建·深度参与者工作台
│   │   ├── org.html                   [用户]+[AI] 党建·组织委员工作台
│   │   ├── prop.html                  [用户]+[AI] 党建·宣传委员工作台
│   │   ├── disc.html                  [用户]+[AI] 党建·纪检委员工作台
│   │   └── visitor.html               [用户]+[AI] 党建·成员只读面板
│   ├── party/                         [用户]+[AI] 党务管理页面
│   │   ├── index.html                 [用户]+[AI] 党务管理入口
│   │   ├── secretary.html             [用户]+[AI] 党务·党支书面板
│   │   ├── org.html                   [用户]+[AI] 党务·组织委员面板
│   │   ├── prop.html                  [用户]+[AI] 党务·宣传委员面板
│   │   └── disc.html                  [用户]+[AI] 党务·纪检委员面板
│   └── src/                           [工程师]+[AI] 代码实现层
│       ├── workflow/                  [工程师]+[AI] SOP 核心规则引擎
│       │   ├── index.js               [工程师]+[AI] 桶文件，统一对外导出
│       │   ├── sop.js                 [工程师]+[AI] SOP 实例化：日期展开与计算逻辑
│       │   ├── sopData.js             [工程师]+[AI] SOP 场景任务节点模板原始数据
│       │   └── activityRecord.js      [工程师]+[AI] 活动记录数据模型
│       ├── core/                      [工程师]+[AI] 核心模块
│       │   ├── constants.js           [工程师]+[AI] 静态常量
│       │   ├── utils.js               [工程师]+[AI] 工具函数
│       │   ├── id.js                  [工程师]+[AI] UUID 生成
│       │   ├── state.js               [工程师]+[AI] 全局状态中心
│       │   └── domain.js              [工程师]+[AI] 领域逻辑
│       ├── components/                [工程师]+[AI] 渲染组件
│       │   ├── calendar.js            [工程师]+[AI] 日历渲染
│       │   └── inspector.js           [工程师]+[AI] 检查器渲染
│       ├── entries/                   [工程师]+[AI] 入口文件
│       │   └── main-entry.js          [工程师]+[AI] 启动入口（唯一 DOM 更新入口）
│       ├── services/                  [工程师]+[AI] 服务层
│       │   ├── mock.js                [工程师]+[AI] Mock 服务
│       │   └── runtime.js             [工程师]+[AI] 运行时服务
│       └── styles.css                 [工程师]+[AI] 全局样式
│
├── .markdownlint.json                 [工具] 代码风格规范
├── .markdownlintignore                [工具] 代码风格忽略列表
│
├── content/                           [用户]+[AI] 内容中心
│   ├── sop/                           [用户]+[AI] 制度母本层
│   │   ├── INDEX.md                   [用户]+[AI] SOP 导航目录
│   │   ├── 常见工作场景快速指南.md       [用户]+[AI] 快速使用指南
│   │   ├── 支委与党小组定人定责定岗说明.md [用户]+[AI] 职责分工文档
│   │   ├── 宣传委员工作流程指南.md       [用户]+[AI] 宣传委员 SOP
│   │   ├── 组织委员工作流程指南.md       [用户]+[AI] 组织委员 SOP
│   │   ├── 纪检委员工作流程指南.md       [用户]+[AI] 纪检委员 SOP
│   │   └── 党小组组长工作手册.md         [用户]+[AI] 党小组组长操作指南
│   ├── strategy/                     [用户]+[AI] 战略路线
│   │   ├── DEVELOPMENT_PATH.md           [用户]+[AI] "管理事、服务人"战略
│   │   ├── COMMISSIONER_FRAMEWORK.md [用户]+[AI] 支委系统框架
│   │   ├── FLAT_DESIGN.md            [用户]+[AI] 扁平化设计
│   │   └── README.md                 [工程师]+[AI] strategy 目录索引
│   ├── design/                       [工程师]+[AI] 设计文档（架构+功能）
│   │   ├── DATA_ARCHITECTURE.md      [工程师]+[AI] 数据架构设计（合并原 DATA/PARTICIPANT_DATAFLOW/LOGIN_SYSTEM_DESIGN/BRAND_ACTIVITY）
│   │   ├── MODULE_UI_DESIGN.md       [工程师]+[AI] 模块界面设计（合并原 PAFFAIRS_UI/CALENDAR）
│   │   ├── DESIGN_SYSTEM.md          [工程师]+[AI] 设计系统规范
│   │   └── README.md                 [工程师]+[AI] design 目录索引
│   ├── governance/                   [工程师]+[AI] 治理规范
│   │   ├── DOC_MAP.md                [工程师]+[AI] 文档导航中心
│   │   ├── SERVICE_CATALOG.md        [工程师]+[AI] 统一服务目录
│   │   ├── ROLE_CLASSIFICATION.md    [工程师]+[AI] 文件角色分类体系
│   │   ├── USAGE_POLICY.md           [工程师]+[AI] 使用规范（术语+Emoji）
│   │   ├── OPERATIONS_GUIDE.md       [工程师]+[AI] 运行标准（含§15 周期性任务）
│   │   ├── SOP_WEB.md                [工程师]+[AI] SOP 系统指南
│   │   ├── KNOWN_PITFALLS.md         [工程师]+[AI] 已知陷阱
│   │   └── README.md                 [工程师]+[AI] governance 目录索引
│   ├── insights/                      [用户]+[AI] 经验沉淀
│   │   └── 党支部管理与实务经验沉淀.md   [用户]+[AI] 经验沉淀文档（按 5 类知识类型组织）
│   └── references/                    [用户]  参考材料与模板
│       ├── 合规文件/                   [用户] 党章、条例、规范（只读）
│       ├── 工作模板/                   [用户]+[AI] 经验沉淀辅助提示词
│       ├── 历史会议材料/               [用户] 历史会议记录
│       ├── 建设探索/                   [用户] 建设探索材料
│       ├── 党支部工作记录.docx          [用户] 党支部工作记录
│       └── README.md                  [用户]
│
├── .ctx/                              [AI] 运行时上下文
│   ├── TIMESTAMPS.md                  [工程师]+[AI] 文件时间戳注册表
│   ├── SNAPSHOT.md                    [AI] 当前基线快照
│   └── logs/                          [工程师]+[AI] 月度执行日志
│       ├── EXECUTION_LOG_INDEX.md     [工程师]+[AI] 日志导航索引
│       └── YYYY-MM-EXECUTION_LOG.md   [工程师]+[AI] 月度日志
│
├── .vscode/settings.json              [工具] VS Code 工作区配置
└── assets/                            [用户] 静态资源目录
```

---

## 六、数据模型

### ActivityRecord（活动记录）

数据结构定义于 `docs/src/workflow/activityRecord.js`。核心12字段模型：

| 字段 | 类型 | 说明 |
|------|------|------|
| id | string | 唯一标识符（id.js 生成） |
| name | string | 活动名称 |
| theme | string | 活动主题 |
| desc | string | 活动描述 |
| link | string | 活动链接 |
| date | string | ISO 格式日期 |
| type | string | 活动类型（ACTIVITY_TYPES 枚举） |
| leaders | string[] | 活动负责人列表 |
| leaderPhotos | string[] | 负责人照片列表 |
| filledBy | string | 填写人 |
| createdAt | string | ISO 格式创建时间 |
| subRecords | object[] | 子记录关联（考勤/材料/宣传） |

ActivityRecordStore 为唯一数据源，所有视图从 Store 读取。`filterRecordsByRole(role)` 按角色权限矩阵过滤。

### Task（任务）

数据结构定义于 `docs/src/services/mock.js`。核心字段：

| 字段 | 类型 | 说明 |
|------|------|------|
| id | string | 唯一标识符 |
| activityId | string | 所属活动 ID |
| title | string | 任务标题 |
| status | string | 任务状态 |
| createdAt | string | ISO 格式创建时间（审计字段） |

### Storage Model

- **键名**: `workflowos_branch_db_v1`（`localStorage`）
- **根结构**: `{ _schema: SCHEMA_VERSION, users, activities, tasks, attendances }`
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
| 取用工作模板 | content/references/工作模板/ |
| 提交改进反馈 | docs/feedback.html（在线反馈入口） |
| 查官方合规文件 | content/references/合规文件/ |
