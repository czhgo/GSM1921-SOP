---
role: "[人机]"
---

# Architecture

> 光华管理学院本科生党支部组织操作系统 — 核心架构说明
> last_updated: 2026-05-02 | 目标读者: [人机]

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
| **活动建设** | 主题党日、三会一课、民主评议、换届选举、发展党员、组织生活会 |
| **组织建设** | 制度修订、职责分工、意见反馈、合规审查、文档规范、定岗定责 |

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
| 活动建设 | 主题党日、三会一课、民主评议、换届、发展党员 | 秘书处 → 发改委 → 工信部 → 外交部 → 档案馆 |
| 组织建设 | 制度修订、职责分工、意见反馈、合规审查、文档规范 | 秘书处 → 组织部 → 司法部 → 检察院 → 档案馆 |
| 架构治理 | 宪章修改、Agent配置、Skill注册、权限变更、架构重构 | 机关党委 → 秘书处 → 档案馆 |
| 经验提炼 | 经验沉淀、日志分析、复盘总结、最佳实践 | 社科院 → 档案馆 |

**优先级**: 架构治理 > 组织建设 > 活动建设 > 经验提炼

---

## 四、分层架构

```
Layer 0: 宪章层（最高权威）
  └─ .github/copilot-instructions.md       [AI] 全局系统指令（宪章）

Layer 1: 注册表层（SSOT 溯源中枢）
  └─ .github/SSOT_INDEX.md                  [AI] 母本注册表与溯源参考

Layer 2: 制度母本层（文本权威）
  └─ content/SOP/*.md                       [人机] 制度原文，所有代码逻辑的来源

Layer 3: Agent 实施层（治理运行时）
  └─ .github/agents/*.md                    [AI] Agent 配置
  └─ .github/skills/*/SKILL.md              [AI] Skill 接口定义

Layer 4: 代码实现层
  └─ src/workflow/                          [人机] SOP 数据库与工作流引擎
  └─ src/domain.js, id.js, state.js, events.js, calendar.js, utils.js, inspector.js, constants.js, styles.css
  └─ src/service.mock.js, service.runtime.js, main.js

Layer 5: 运行时层
  └─ index.html                             [人机] Apple Liquid Glass UI 骨架

Layer 6: 审计追溯层
  └─ .ctx/CONTEXT.md                        [AI] AI 快速同步入口
  └─ .ctx/TIMESTAMPS.md                     [人机] 文件时间戳注册表
  └─ .ctx/SNAPSHOT.md                       [AI] 系统快照（ACTIVE）
  └─ .ctx/logs/YYYY-MM-EXECUTION_LOG.md     [人机] 月度执行日志

Layer 7: 官方底线层（只读引用）
  └─ content/references/官方文件/            [人] 党章、条例、规范（PDF/DOCX）
  └─ content/references/模板库/              [人] 工作模板、活动复盘模板
  └─ content/references/党小组会/、支部委员会/ [人] 历史会议记录
```

---

## 五、仓库结构

```
/
├── README.md                          [人] 对外门面，最后编辑环节
├── ARCHITECTURE.md                    [人机] 本文件，核心架构说明
├── ROADMAP.md                         [人机] 未来执行路线图
├── index.html                         [人机] UI 入口（Liquid Glass 骨架）
├── .markdownlint.json                 [工具] 代码风格规范
├── .markdownlintignore                [工具] 代码风格忽略列表
│
├── src/                               [人机] 代码实现层
│   ├── workflow/                      [人机] SOP 核心规则引擎
│   │   ├── index.js                   [人机] 桶文件，统一对外导出
│   │   ├── sop.js                     [人机] SOP 实例化：日期展开与计算逻辑
│   │   └── sopData.js                 [人机] SOP 场景任务节点模板原始数据
│   ├── constants.js, utils.js, id.js  [人机] 静态常量/工具/UUID
│   ├── state.js                       [人机] 全局状态中心
│   ├── calendar.js, inspector.js      [人机] 日历/检查器渲染
│   ├── events.js                      [人机] 全量 DOM 事件绑定
│   ├── main.js                        [人机] 启动入口（唯一 DOM 更新入口）
│   ├── service.mock.js, service.runtime.js [人机] 服务层
│   └── styles.css                     [人机] 全局样式
│
├── content/                           [人机] 内容中心
│   ├── SOP/                           [人机] 制度母本层
│   │   ├── INDEX.md                   [人机] SOP 导航目录
│   │   ├── 常见工作场景快速指南.md       [人机] 快速使用指南
│   │   ├── 支委与党小组定人定责定岗说明.md [人机] 职责分工文档
│   │   ├── Org_OS_极客操作手册.md       [人机] 技术操作手册
│   │   ├── 宣传/纪检/组织委员工作流程指南.md [人机] 功能委员 SOP
│   │   └── README.md                  [人机]
│   ├── guides/                        [人机] 操作指南
│   │   ├── AGENT_USAGE.md             [人机] Agent 使用指南
│   │   ├── DOCUMENTATION_MAP.md       [人机] 文档导航中心
│   │   ├── SOP数据映射与同步指南.md     [人机] SOP 到代码映射指南
│   │   ├── SOP优化提案反馈卡.md        [人机] 反馈模板
│   │   └── README.md                  [人机]
│   ├── insights/                      [人机] 经验沉淀
│   │   └── 党支部管理与实务经验沉淀.md   [人机] 经验沉淀文档
│   └── references/                    [人]  官方底线与模板
│       ├── 官方文件/                   [人] 党章、条例、规范（只读）
│       ├── 模板库/                     [人] 申报材料模板、活动复盘模板
│       ├── 党小组会/                   [人] 历史党小组会记录
│       ├── 支部委员会/                 [人] 历史支委会记录
│       └── README.md                  [人]
│
├── .github/                           [AI] Agent 治理层
│   ├── copilot-instructions.md        [AI] 全局系统指令（宪章）
│   ├── SSOT_INDEX.md                  [AI] 母本注册表与溯源参考
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

### Activity（活动）

数据结构定义于 `src/service.mock.js`。核心字段：

| 字段 | 类型 | 说明 |
|------|------|------|
| id | string | 唯一标识符（id.js 生成） |
| title | string | 活动标题 |
| type | string | 活动类型 |
| status | string | 活动状态 |
| visibility | string | 活动可见性 |
| date | string | ISO 格式日期 |
| executor | string | 执行者 |
| supervisor | string | 监督者 |
| createdBy | string | 创建者 |
| createdAt | string | ISO 格式创建时间（审计字段） |
| priority | string | 'low' | 'normal' | 'urgent'（工作流优先级） |
| dueDate | string | ISO 格式截止日期（自动化提醒锚点） |
| archived | boolean | 软删除标记（true 表示已归档） |
| hostGroup | string | 承办党小组（'group1' | 'group2' | 'group3' | null） |

### Task（任务）

数据结构定义于 `src/service.mock.js`。核心字段：

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
content/SOP/ → src/workflow/ → constants/utils → service layer → state → render → main.js → UI
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
                    │  .github/SSOT_INDEX.md           │ ← 母本注册表
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
                          src/workflow/
                          代码内容层
                                   │
                                   ▼
                    ┌─────────────────────────┐
                    │  src/*  (service + UI)   │ ← 运行时层
                    │  index.html              │
                    └─────────────────────────┘
```

### 溯源铁律

修改子本前必须先查母本。子本变更若无法指向母本 → 禁止写盘。

### 门控规则（Gate Check）

- 修改 `src/workflow/` 或更下层前，必须确认母本 `content/SOP/` 已更新
- 修改 Agent 配置或 Skill 定义前，必须确认 `.github/SSOT_INDEX.md` 注册表已同步
- 跨层修改须先完成上层确认方可推进下层

### Change Trace 四要素（修改 src/ 或 index.html 前必须输出）

1. `SSOT source`: 母本变更依据（引用 `.github/SSOT_INDEX.md` 注册表链路）
2. `SOP impact`: 本次 SOP 变更情况（引用 `content/SOP/` 具体文件与条款，无变化写 `none`）
3. `Schema impact`: 数据结构变更情况（无变化写 `none`）
4. `Service impact`: 服务层方法变更情况（无变化写 `none`）

---

## 九、快速导航

| 我需要... | 去哪里 |
|----------|--------|
| 快速了解项目 | README.md |
| 看待办任务 | ROADMAP.md §五 |
| 查全局系统指令 | .github/copilot-instructions.md |
| 查母本链路 | .github/SSOT_INDEX.md |
| 查审查状态 | .ctx/CONTEXT.md §4 |
| 查 SOP 流程 | content/SOP/INDEX.md |
| 查执行日志 | .ctx/logs/YYYY-MM-EXECUTION_LOG.md |
| 取用工作模板 | content/references/模板库/ |
| 提交改进反馈 | content/guides/SOP优化提案反馈卡.md |
| 查官方合规文件 | content/references/官方文件/ |
