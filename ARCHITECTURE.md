---
title: "双域五层架构说明"
type: architecture
role: "[人机]"
last_updated: "2026-05-21"
version: "6.0"
status: active
related_files: [CLAUDE.md, content/guides/architecture/]
---

# Architecture

> 光华管理学院本科生党支部组织操作系统 — 核心架构说明
> last_updated: 2026-05-03 | 目标读者: [人机]

---

## 一、项目概述

Org OS 是光华管理学院本科生党支部的组织运行操作系统。它将党支部制度文本（SOP）转化为可执行的代码工作流，并由 10 个 AI Agent 组成治理集群进行持续维护与迭代。

**核心命题**: 如何让一套制度文本持续驱动一个可运行的软件系统？

**答案**: SSOT（单一信息源）溯源治理 + Agent 协作链路 + 版本日志追踪。

---

## 二、领域模型

### 双域分类

| 域 | 涵盖内容 |
|----|---------|
| **党建工作** | 主题党日、三会一课（支部党员大会/支委会/党小组会/党课）、民主评议、换届选举、发展党员 |
| **党务管理** | 制度修订、职责分工、意见反馈、合规审查、文档规范、定岗定责 |

### 条块概念

- **条条**: 功能委员线（组织委员 / 宣传委员 / 纪检委员）
- **块块**: 党小组长线（group1 / group2 / group3）

---

## 三、Agent 治理集群

系统由 10 个 VS Code 自定义 Agent 组成，通过 handoffs 按钮形成协作链路。

### Agent 注册表（摘要）

| Agent | 类型 | 职责 | 工具权限 | Handoffs | 关联 Skill |
|-------|------|------|---------|----------|-----------|
| 秘书处 | 协调型 | 计划拆解、排序、依赖梳理 | read, search | ✅ | — |
| 组织部 | 执行型 | 文档规范化、术语治理 | read, agent, edit, search | ✅ (→档案馆) | term-cleaner, anchor-fixer |
| 发改委 | 执行型 | 文本母本与内容层治理 | read, agent, edit, search | ✅ (→档案馆) | sop-sync, yaml-slim |
| 工信部 | 执行型 | 代码内容层与 SOP 映射 | read, agent, edit, search | ✅ (→档案馆) | sop2code, data-inspector |
| 外交部 | 执行型 | UI 交互与可用性 | read, agent, edit, search | ✅ (→档案馆) | ui-verifier |
| 司法部 | 执行型 | 违宪审查与合规纠偏 | read, agent, edit, search | ✅ (→档案馆) | audit-report |
| 检察院 | 审查型 | 三层合规审查与独立巡视 | read, search | ❌ | audit-report, data-inspector, ui-verifier |
| 机关党委 | 监督型 | 全局宪章与架构监督 | read, agent, edit, search | ❌ | — |
| 社科院 | 分析型 | 经验提炼与沉淀 | read, edit, search | ❌ | experience-distiller |
| 档案馆 | 记录型 | 系统变更日志记录 | read, edit, search | ❌ | log-recorder |

### 任务域 → Agent 委派链路

| 任务域 | 触发关键词 | Agent 委派链路 |
|--------|-----------|---------------|
| 党建工作 | 主题党日、三会一课、民主评议、换届、发展党员 | 秘书处 → 发改委 → 工信部 → 外交部 → 档案馆 |
| 党务管理 | 制度修订、职责分工、意见反馈、合规审查、文档规范 | 秘书处 → 组织部 → 司法部 → 检察院 → 档案馆 |
| 架构治理 | 宪章修改、Agent配置、Skill注册、权限变更、架构重构 | 机关党委 → 秘书处 → 档案馆 |
| 经验提炼 | 经验沉淀、日志分析、复盘总结、最佳实践 | 社科院 → 档案馆 |

**优先级**: 架构治理 > 党务管理 > 党建工作 > 经验提炼

---

## 四、分层架构

```
Layer 0: 宪章层（最高权威）
  └─ .github/copilot-instructions.md       [AI] 全局系统指令（宪章）

Layer 1: 注册表层（SSOT 溯源中枢）
  └─ SSOT_INDEX.md                           [AI] 母本注册表与溯源参考

Layer 2: 制度母本层（文本权威）
  └─ content/SOP/*.md                       [人机] 制度原文，所有代码逻辑的来源

Layer 3: Agent 实施层（治理运行时）
  └─ .github/agents/*.md                    [AI] Agent 配置
  └─ .github/skills/*/SKILL.md              [AI] Skill 接口定义

Layer 4: 代码实现层
  └─ docs/src/workflow/                  [人机] SOP 数据库与工作流引擎
  └─ docs/src/core/ (constants.js, utils.js, id.js, state.js, domain.js)  [人机] 静态常量/工具/UUID/状态/领域
  └─ docs/src/components/ (calendar.js, inspector.js)  [人机] 日历/检查器渲染
  └─ docs/src/entries/main-entry.js      [人机] 启动入口（唯一 DOM 更新入口）
  └─ docs/src/services/ (mock.js, runtime.js)  [人机] 服务层
  └─ docs/src/styles.css                 [人机] 全局样式

Layer 5: 运行时层
  └─ docs/index.html                     [人机] Flat Matte UI 骨架

Layer 6: 审计追溯层
  └─ .ctx/CONTEXT.md                        [AI] AI 快速同步入口
  └─ .ctx/TIMESTAMPS.md                     [人机] 文件时间戳注册表
  └─ .ctx/SNAPSHOT.md                       [AI] 系统快照（ACTIVE）
  └─ .ctx/logs/YYYY-MM-EXECUTION_LOG.md     [人机] 月度执行日志

Layer 7: 官方底线层（只读引用）
  └─ content/references/合规文件/            [人] 党章、条例、规范（PDF/DOCX）
  └─ content/references/工作模板/            [人] 工作模板、经验沉淀辅助提示词
  └─ content/references/历史会议材料/         [人] 历史会议记录
```

---

## 五、仓库结构

```
/
├── README.md                          [人] 对外门面，最后编辑环节
├── ARCHITECTURE.md                    [人机] 本文件，核心架构说明
├── CLAUDE.md                         [人机] 未来执行路线图
├── SSOT_INDEX.md                     [AI] 母本注册表与溯源参考
├── docs/                              [人机] 代码实现层与运行时
│   ├── index.html                     [人机] UI 入口（Flat Matte 骨架）
│   ├── about.html                     [人机] 系统说明书
│   ├── archive.html                   [人机] 归档库
│   ├── search.html                    [人机] 资料查询
│   ├── feedback.html                  [人机] 意见反馈
│   ├── workspace/                     [人机] 党建工作台页面
│   │   ├── index.html                 [人机] 党建工作台入口
│   │   ├── secretary.html             [人机] 党建·党支书工作台
│   │   ├── leader.html                [人机] 党建·党小组组长工作台
│   │   ├── organizer.html             [人机] 党建·组织者工作台
│   │   ├── deep.html                  [人机] 党建·深度参与者工作台
│   │   ├── org.html                   [人机] 党建·组织委员工作台
│   │   ├── prop.html                  [人机] 党建·宣传委员工作台
│   │   ├── disc.html                  [人机] 党建·纪检委员工作台
│   │   └── visitor.html               [人机] 党建·成员只读面板
│   ├── party/                         [人机] 党务管理页面
│   │   ├── index.html                 [人机] 党务管理入口
│   │   ├── secretary.html             [人机] 党务·党支书面板
│   │   ├── org.html                   [人机] 党务·组织委员面板
│   │   ├── prop.html                  [人机] 党务·宣传委员面板
│   │   └── disc.html                  [人机] 党务·纪检委员面板
│   └── src/                           [人机] 代码实现层
│       ├── workflow/                  [人机] SOP 核心规则引擎
│       │   ├── index.js               [人机] 桶文件，统一对外导出
│       │   ├── sop.js                 [人机] SOP 实例化：日期展开与计算逻辑
│       │   ├── sopData.js             [人机] SOP 场景任务节点模板原始数据
│       │   └── activityRecord.js      [人机] 活动记录数据模型
│       ├── core/                      [人机] 核心模块
│       │   ├── constants.js           [人机] 静态常量
│       │   ├── utils.js               [人机] 工具函数
│       │   ├── id.js                  [人机] UUID 生成
│       │   ├── state.js               [人机] 全局状态中心
│       │   └── domain.js              [人机] 领域逻辑
│       ├── components/                [人机] 渲染组件
│       │   ├── calendar.js            [人机] 日历渲染
│       │   └── inspector.js           [人机] 检查器渲染
│       ├── entries/                   [人机] 入口文件
│       │   └── main-entry.js          [人机] 启动入口（唯一 DOM 更新入口）
│       ├── services/                  [人机] 服务层
│       │   ├── mock.js                [人机] Mock 服务
│       │   └── runtime.js             [人机] 运行时服务
│       └── styles.css                 [人机] 全局样式
│
├── .markdownlint.json                 [工具] 代码风格规范
├── .markdownlintignore                [工具] 代码风格忽略列表
│
├── content/                           [人机] 内容中心
│   ├── SOP/                           [人机] 制度母本层
│   │   ├── INDEX.md                   [人机] SOP 导航目录
│   │   ├── 常见工作场景快速指南.md       [人机] 快速使用指南
│   │   ├── 支委与党小组定人定责定岗说明.md [人机] 职责分工文档
│   │   └── 宣传/纪检/组织委员工作流程指南.md [人机] 功能委员 SOP
│   ├── guides/                        [人机] 操作指南与设计文档
│   │   ├── governance/                [人机] 治理规范
│   │   │   ├── DOC_MAP.md             [人机] 文档导航中心
│   │   │   ├── AGENT_USAGE.md         [人机] Agent 使用指南
│   │   │   ├── ROLE_CLASSIFICATION.md [人机] 角色三分类体系
│   │   │   ├── TERMINOLOGY.md         [人机] 术语规范
│   │   │   ├── EMOJI_POLICY.md        [人机] Emoji 使用规范
│   │   │   ├── RECURRING_TASKS.md     [人机] 周期性任务机制
│   │   │   └── AGENT_HANDBOOK.md      [人机] 技术操作手册
│   │   ├── design/                    [人机] 功能设计方案
│   │   │   ├── DESIGN_SYSTEM.md       [人机] 设计系统规范
│   │   │   ├── CALENDAR.md            [人机] 日历功能规划
│   │   │   ├── COMMISSIONER_SYSTEM.md [人机] 支委系统设计（合并）
│   │   │   ├── BRAND_ACTIVITY.md      [人机] 品牌属性标签设计
│   │   │   └── SOP_WEB.md             [人机] SOP 网页指南
│   │   ├── architecture/              [人机] 架构设计
│   │   │   ├── MANAGEMENT_MODE.md     [人机] 管理模式架构
│   │   │   ├── ORG_BUILDING.md        [人机] 党务管理模块
│   │   │   └── DATA.md                [人机] 数据模型设计
│   │   └── README.md                  [人机] guides 目录索引
│   ├── insights/                      [人机] 经验沉淀
│   │   └── 党支部管理与实务经验沉淀.md   [人机] 经验沉淀文档
│   └── references/                    [人]  官方底线与模板
│       ├── 合规文件/                   [人] 党章、条例、规范（只读）
│       ├── 工作模板/                   [人] 经验沉淀辅助提示词、反馈模板
│       │   └── FEEDBACK_FORM.md        [人机] 反馈模板
│       ├── 历史会议材料/               [人] 历史会议记录
│       └── README.md                  [人]
│
├── .github/                           [AI] Agent 治理层
│   ├── copilot-instructions.md        [AI] 全局系统指令（宪章）
│   ├── agents/ (10)                   [AI] 自定义 Agent 配置
│   └── skills/ (10)                   [AI] 可装配 Skill 定义
│
├── .ctx/                              [AI] 运行时上下文
│   ├── CONTEXT.md                     [AI] AI 快速同步入口
│   ├── TIMESTAMPS.md                  [人机] 文件时间戳注册表
│   ├── SNAPSHOT.md                    [AI] 系统快照（ACTIVE）
│   └── logs/                          [人机] 月度执行日志
│       ├── EXECUTION_LOG_INDEX.md     [人机] 日志导航索引
│       └── YYYY-MM-EXECUTION_LOG.md   [人机] 月度日志
│
├── .vscode/settings.json              [工具] VS Code 工作区配置
└── assets/                            [人] 静态资源目录
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
content/SOP/ → docs/src/workflow/ → core/constants/utils → services → state → components → entries/main-entry.js → UI
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
                    │  .github/copilot-instructions.md │ ← 宪章层（治理起点）
                    │  SSOT_INDEX.md                   │ ← 母本注册表
                    └──────────────┬──────────────────┘
                                   │ 溯源校验
         ┌─────────────────────────┼─────────────────────────┐
         ▼                         ▼                         ▼
content/SOP/*.md             .github/skills/            .github/agents/
  文本母本层                Skill接口定义层            Agent配置层
         │                         │                         │
         └─────────────────────────┼─────────────────────────┘
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

### 门控规则（Gate Check）

- 修改 `docs/src/workflow/` 或更下层前，必须确认母本 `content/SOP/` 已更新
- 修改 Agent 配置或 Skill 定义前，必须确认 `SSOT_INDEX.md` 注册表已同步
- 跨层修改须先完成上层确认方可推进下层

### Change Trace 四要素（修改 docs/src/ 或 docs/index.html 前必须输出）

1. `SSOT source`: 母本变更依据（引用 `SSOT_INDEX.md` 注册表链路）
2. `SOP impact`: 本次 SOP 变更情况（引用 `content/SOP/` 具体文件与条款，无变化写 `none`）
3. `Schema impact`: 数据结构变更情况（无变化写 `none`）
4. `Service impact`: 服务层方法变更情况（无变化写 `none`）

---

## 九、快速导航

| 我需要... | 去哪里 |
|----------|--------|
| 快速了解项目 | README.md |
| 看待办任务 | CLAUDE.md §五 |
| 查全局系统指令 | .github/copilot-instructions.md |
| 查母本链路 | SSOT_INDEX.md |
| 查审查状态 | .ctx/CONTEXT.md §4 |
| 查 SOP 流程 | content/SOP/INDEX.md |
| 查执行日志 | .ctx/logs/YYYY-MM-EXECUTION_LOG.md |
| 取用工作模板 | content/references/工作模板/ |
| 提交改进反馈 | content/references/工作模板/FEEDBACK_FORM.md |
| 查官方合规文件 | content/references/合规文件/ |
