---
title: "全局文档导航映射"
type: governance
role: "[工程师]+[AI]"
last_updated: "2026-07-21"
version: "2.2"
status: active
related_files: [OPERATIONS_GUIDE.md, SSOT_INDEX.md, CLAUDE.md, ARCHITECTURE.md]
---

# 文档导航映射

> **本文档为导航图**：按 5 类知识类型组织，标注每个文件的受众。
> **权威层级定义**（5 类知识类型、裁决规则）见 [OPERATIONS_GUIDE.md §7.1](OPERATIONS_GUIDE.md#71-文档权威层级5类知识类型)。
> **母本子本关系注册表**见 [SSOT_INDEX.md](SSOT_INDEX.md)。
> 三者关系：§7.1 定义层级 → DOC_MAP 标注层级 → SSOT_INDEX 注册关系。
> 受众: [工程师]+[AI]

---

## §〇 文件角色分类

本仓库文件按三类角色标记：`[用户]` / `[工程师]` / `[AI]`，支持复合标记（如 `[用户]+[AI]`）。

定义见 [ROLE_CLASSIFICATION.md §一](../02_institution/ROLE_CLASSIFICATION.md)。

| 标记 | 典型读者 | 示例目录 |
|------|---------|---------|
| `[用户]` | 党支书/党员 | content/01_strategy/、content/02_institution/sop/ |
| `[工程师]` | 系统维护者/开发者 | content/03_doc_system/、content/04_web_design/ |
| `[AI]` | AI Agent | .ctx/SNAPSHOT.md |

**废弃概念**：`[人]`/`[人机]` 已于 2026-07-11 废弃，详见 ROLE_CLASSIFICATION.md §一。

---

## 一、快速导航（按受众）

| 受众 | 入口文件 | 说明 |
|------|---------|------|
| [用户] | `README.md`（根目录） | 项目门面，一句话说清是什么 |
| [工程师]+[AI] | `content/03_doc_system/ARCHITECTURE.md` | 核心架构说明，技术全景 |
| [工程师]+[AI] | `CLAUDE.md`（根目录） | Harness（甲乙丙三部）、AI 执行依据 |
| [用户]+[AI] | `content/01_strategy/SECRETARY_PRONOUNCEMENTS.md` | 书记重要论断汇编（项目顶级战略文档） |

---

## 二、文件总览（按 5 类知识类型）

> **层级定义见 [OPERATIONS_GUIDE.md §7.1](OPERATIONS_GUIDE.md#71-文档权威层级5类知识类型)**：5 类知识类型（战略/制度/文档系统/网站设计/AI coding）。
> 知识类型之间互补，互不覆盖；冲突裁决以母本优先于衍生为原则。

### 知识类型 1：支部发展和管理 的 战略（content/01_strategy/）

> 回答"支部为什么存在、根本目标、战略路线"。

| 文件 | 受众 | 内容 | 被引用方 |
|------|------|------|---------|
| `content/01_strategy/SECRETARY_PRONOUNCEMENTS.md` | [用户]+[AI] | 书记重要论断汇编（项目顶级战略文档，元命题 + 战略路线级 + 制度设计级论断） | CLAUDE.md H6/H7 |
| `content/01_strategy/DEVELOPMENT_PATH.md` | [用户]+[AI] | 发展路径（从入党申请人到正式党员的完整叙事） | SECRETARY_PRONOUNCEMENTS.md |
| `content/01_strategy/README.md` | [工程师]+[AI] | 战略层目录索引 | — |
| `content/01_strategy/references/合规文件/` | [用户] | 党章、党支部工作规范、党员教育管理条例等（T1 制度原文） | content/02_institution/sop/（母本溯源） |
| `content/01_strategy/references/历史会议材料/` | [用户] | 历次党小组会议记录、支委工作手册等存档 | 无（历史档案） |
| `content/01_strategy/references/建设探索/` | [用户]+[AI] | 党建工作知识特点与优化路径等建设探索 | — |

### 知识类型 2：支部发展和管理 的 制度（content/02_institution/）

> 回答"组织架构、分工、SOP"。本目录内部区分制度设计文件（FLAT_DESIGN/COMMISSIONER_FRAMEWORK/ROLE_CLASSIFICATION）与方法指引 SOP 文件，作为文件合并参考。

| 文件 | 受众 | 内容 | 被引用方 |
|------|------|------|---------|
| `content/02_institution/FLAT_DESIGN.md` | [工程师]+[AI] | 组织者与深度参与者的扁平化设计 | SECRETARY_PRONOUNCEMENTS.md |
| `content/02_institution/COMMISSIONER_FRAMEWORK.md` | [用户]+[AI] | 支委系统设计（含专班、赋权关系链、§审批流程规范） | SECRETARY_PRONOUNCEMENTS.md |
| `content/02_institution/ROLE_CLASSIFICATION.md` | [工程师]+[AI] | 文件角色分类体系设计 + 权限矩阵 §九 | CLAUDE.md、SERVICE_CATALOG.md |
| `content/02_institution/sop/INDEX.md` | [用户]+[AI] | SOP 导航目录 | ARCHITECTURE.md、AGENT_USAGE.md |
| `content/02_institution/sop/常见工作场景快速指南.md` | [用户]+[AI] | 快速使用指南 | INDEX |
| `content/02_institution/sop/支委与党小组定人定责定岗说明.md` | [用户]+[AI] | 职责分工文档 | INDEX |
| `content/02_institution/sop/宣传委员工作流程指南.md` | [用户]+[AI] | 宣传委员 SOP | INDEX |
| `content/02_institution/sop/组织委员工作流程指南.md` | [用户]+[AI] | 组织委员 SOP | INDEX |
| `content/02_institution/sop/纪检委员工作流程指南.md` | [用户]+[AI] | 纪检委员 SOP | INDEX |
| `content/02_institution/sop/党小组组长工作手册.md` | [用户]+[AI] | 党小组组长专用操作指南 | INDEX |
| `content/02_institution/README.md` | [工程师]+[AI] | 制度层目录索引 | — |

### 知识类型 3：全仓库文档系统管理 的 技术方法（content/03_doc_system/）

> 回答"文档怎么治理、术语怎么用、运行标准"。

| 文件 | 受众 | 内容 | 被引用方 |
|------|------|------|---------|
| `content/03_doc_system/OPERATIONS_GUIDE.md` | [工程师]+[AI] | 运行标准（含权威层级 §7、三类文件角色 §8、一致性检查规范 §7.4、§14 吸收外部输入、§15 周期性任务） | CLAUDE.md H6 |
| `content/03_doc_system/USAGE_POLICY.md` | [工程师]+[AI] | 使用规范（术语标准 §一 + Emoji 边界 §二，合并自 TERMINOLOGY.md + EMOJI_POLICY.md） | 全仓库 |
| `content/03_doc_system/DOC_MAP.md` | [工程师]+[AI] | 本文档：全局导航中心 | 所有文件 |
| `content/03_doc_system/SSOT_INDEX.md` | [工程师]+[AI] | 母本注册表、溯源参考、Agent 注册表 | ARCHITECTURE.md、所有 Agent 文件 |
| `content/03_doc_system/ARCHITECTURE.md` | [工程师]+[AI] | 核心架构说明、分层架构、数据模型、变更流水线 | README.md（架构图引用）、AGENT_USAGE.md |
| `content/03_doc_system/SERVICE_CATALOG.md` | [工程师]+[AI] | 统一服务目录（服务清单+角色权限矩阵） | DATA_ARCHITECTURE.md / ROLE_CLASSIFICATION.md / COMMISSIONER_FRAMEWORK.md |
| `content/03_doc_system/工作模板/经验沉淀辅助提示词.md` | [用户] | 经验沉淀辅助提示词模板 | content/04_web_design/SOP_WEB.md |
| `content/03_doc_system/README.md` | [工程师]+[AI] | 文档系统管理层目录索引 | — |

### 知识类型 4：网站系统 的 设计想法（content/04_web_design/）

> 回答"网站功能与视觉设计"。

| 文件 | 受众 | 内容 | 被引用方 |
|------|------|------|---------|
| `content/04_web_design/DATA_ARCHITECTURE.md` | [工程师]+[AI] | 数据架构设计（合并原 DATA/PARTICIPANT_DATAFLOW/LOGIN_SYSTEM_DESIGN/BRAND_ACTIVITY：系统数据流+界面布局+登录态打桩设计+用户身份模型/认证机制+品牌属性标签+§写入数据验证设计） | SECRETARY_PRONOUNCEMENTS.md、ARCHITECTURE.md、CLAUDE.md |
| `content/04_web_design/DESIGN_SYSTEM.md` | [工程师]+[AI] | 设计系统规范 | docs/src/styles.css |
| `content/04_web_design/MODULE_UI_DESIGN.md` | [工程师]+[AI] | 模块界面设计（合并原 PAFFAIRS_UI/CALENDAR：党务管理模块+日历功能） | docs/src/components/calendar.js |
| `content/04_web_design/SOP_WEB.md` | [工程师]+[AI] | SOP 系统优化与同步指南 | CLAUDE.md H2.2 |
| `content/04_web_design/README.md` | [工程师]+[AI] | 网站设计层目录索引 | — |

### 知识类型 5：网站系统 的 AI coding 技术方法（content/05_ai_coding/）

> 回答"AI 编码的经验教训与陷阱"。

| 文件 | 受众 | 内容 | 被引用方 |
|------|------|------|---------|
| `content/05_ai_coding/KNOWN_PITFALLS.md` | [工程师]+[AI] | 已知陷阱判例（AI工具使用陷阱） | CLAUDE.md H6 |
| `content/05_ai_coding/README.md` | [工程师]+[AI] | AI coding 技术层目录索引 | — |

### 跨多类：经验沉淀（content/insights/）

> insights 跨多类知识类型，按双文件组织：党支部管理与实务经验沉淀.md（类型 1+2）+ 工程演进与设计方法论.md（类型 3+4+5）。

| 文件 | 受众 | 内容 | 被引用方 |
|------|------|------|---------|
| `content/insights/党支部管理与实务经验沉淀.md` | [用户]+[AI] | 经验沉淀（党建与党务工作理论、条块二元结构、专班、三支委角色设计、活动决策树模型） | 经验分析Agent |
| `content/insights/工程演进与设计方法论.md` | [工程师]+[AI] | 经验沉淀（工程演进技术原则、减负与删除哲学、上下文治理、系统工程方法论、架构迁移、实操教训） | 经验分析Agent |

### 跨多类：根目录 + 审计底座 + 实现层

| 文件 | 受众 | 内容 | 被引用方 |
|------|------|------|---------|
| `CLAUDE.md`（根目录） | [工程师]+[AI] | Harness（甲乙丙三部）、执行路线图、Agent 协作规则、授权机制 | 所有 Agent 文件、SSOT_INDEX、README |
| `README.md`（根目录） | [用户] | 项目门面，一句话说清是什么 | — |
| `.ctx/TIMESTAMPS.md` | [工程师] | 文件时间戳注册表（含周期性任务追踪表） | CLAUDE.md |
| `.ctx/SNAPSHOT.md` | [AI] | 系统快照、AI 快速同步入口（审计追溯层） | ARCHITECTURE.md、CLAUDE.md |
| `.ctx/logs/YYYY-MM-EXECUTION_LOG.md` | [工程师] | 月度执行日志 | ARCHITECTURE.md、CLAUDE.md |
| `.ctx/logs/DECISION_LOG.md` | [工程师] | 决策日志 | ARCHITECTURE.md、CLAUDE.md |
| `docs/src/*` | [工程师] | 代码实现（workflow/services/entries/core/components/styles） | ARCHITECTURE.md |

---

## 三、引用关系图

```
根目录（Harness + 门面）
  ├─ CLAUDE.md → 所有 Agent 文件、README（路线图摘要）、所有 content/ 文件
  └─ README.md → 项目门面

知识类型 1（战略）
  ├─ SECRETARY_PRONOUNCEMENTS.md → CLAUDE.md H6/H7
  ├─ DEVELOPMENT_PATH.md → SECRETARY_PRONOUNCEMENTS.md
  └─ references/合规文件/ → content/02_institution/sop/（母本溯源）

知识类型 2（制度）
  ├─ FLAT_DESIGN.md → SECRETARY_PRONOUNCEMENTS.md
  ├─ COMMISSIONER_FRAMEWORK.md → SECRETARY_PRONOUNCEMENTS.md
  ├─ ROLE_CLASSIFICATION.md → CLAUDE.md、SERVICE_CATALOG.md
  └─ sop/INDEX.md → 所有 SOP 子文件

知识类型 3（文档系统）
  ├─ OPERATIONS_GUIDE.md → CLAUDE.md H6（含 §7 权威层级、§8 三类文件角色、§15 周期性任务）
  ├─ USAGE_POLICY.md → 全仓库
  ├─ DOC_MAP.md → 所有文件
  ├─ SSOT_INDEX.md → ARCHITECTURE.md + 所有 Agent 文件
  ├─ ARCHITECTURE.md → README.md（架构图）+ AGENT_USAGE.md
  └─ SERVICE_CATALOG.md → DATA_ARCHITECTURE.md / ROLE_CLASSIFICATION.md / COMMISSIONER_FRAMEWORK.md

知识类型 4（网站设计）
  ├─ DATA_ARCHITECTURE.md → SECRETARY_PRONOUNCEMENTS.md / ARCHITECTURE.md / CLAUDE.md / docs/src/*
  ├─ DESIGN_SYSTEM.md → docs/src/styles.css
  ├─ MODULE_UI_DESIGN.md → docs/src/components/calendar.js、docs/index.html
  └─ SOP_WEB.md → content/02_institution/sop/*

知识类型 5（AI coding）
  └─ KNOWN_PITFALLS.md → CLAUDE.md H6

跨多类（经验沉淀）
  ├─ insights/党支部管理与实务经验沉淀.md → 经验分析Agent
  └─ insights/工程演进与设计方法论.md → 经验分析Agent

审计参考层（.ctx/）
  ├─ .ctx/SNAPSHOT.md → ARCHITECTURE.md、CLAUDE.md
  ├─ .ctx/TIMESTAMPS.md → CLAUDE.md
  └─ logs/*.md → CLAUDE.md

实现层（docs/src/）
  └─ docs/src/* → ARCHITECTURE.md（文档化）
```

---

## 四、按任务分类的快速入口

| 我想做什么 | 先读哪里 | 再读哪里 |
|-----------|---------|---------|
| 了解项目全貌 | README.md | content/03_doc_system/ARCHITECTURE.md |
| 查看待办任务 | CLAUDE.md §C | .ctx/logs/DECISION_LOG.md |
| 查 SOP 流程 | content/02_institution/sop/INDEX.md | 对应功能委员 SOP |
| 使用 Agent | （已迁出至 `D:\GitHub\System-Residual\.github\`，VSCode 中使用） | — |
| 提交改进反馈 | content/04_web_design/SOP_WEB.md §E | content/02_institution/sop/对应文件 |
| 了解角色分类体系 | content/02_institution/ROLE_CLASSIFICATION.md | （含可扩展性评估 §六） |
| 查看设计系统规范 | content/04_web_design/DESIGN_SYSTEM.md | docs/src/styles.css |
| 了解 Emoji 使用规范 | content/03_doc_system/USAGE_POLICY.md §二 | CLAUDE.md 钩稽矩阵 |
| 查看日历功能规划 | content/04_web_design/MODULE_UI_DESIGN.md | docs/src/components/calendar.js |
| 查看品牌标签设计 | content/04_web_design/DATA_ARCHITECTURE.md | CLAUDE.md |
| 查官方合规 | content/01_strategy/references/合规文件/ | content/02_institution/sop/溯源 |
| 查看执行日志 | .ctx/logs/EXECUTION_LOG_INDEX.md | 对应月份日志 |
| 查看 SOP 系统优化 | content/04_web_design/SOP_WEB.md | content/02_institution/sop/对应 SOP |
| 了解支委系统设计 | content/02_institution/COMMISSIONER_FRAMEWORK.md | content/04_web_design/MODULE_UI_DESIGN.md |
| 了解登录系统设计前置 | content/04_web_design/DATA_ARCHITECTURE.md | DATA_ARCHITECTURE.md §登录态打桩设计 |
| 查看服务清单与权限矩阵 | content/03_doc_system/SERVICE_CATALOG.md | content/02_institution/ROLE_CLASSIFICATION.md §九 |
| 理解架构变更 | content/03_doc_system/ARCHITECTURE.md §八 | content/03_doc_system/SSOT_INDEX.md |
| 了解三类文件角色规范 | content/03_doc_system/OPERATIONS_GUIDE.md §8 | 本文档 §〇 |
| 查看文档权威层级 | content/03_doc_system/OPERATIONS_GUIDE.md §7.1 | 本文档 §二 |
| 查看母本子本关系 | content/03_doc_system/SSOT_INDEX.md | content/03_doc_system/OPERATIONS_GUIDE.md §7.1 |
| 查看书记重要论断 | content/01_strategy/SECRETARY_PRONOUNCEMENTS.md | CLAUDE.md H6 |

---

## 五、文件状态标记

| 标记 | 含义 |
|------|------|
| ✅ 活跃 | 当前有效，持续维护 |
| 🔄 待更新 | 内容有效，但需同步最新结构 |
| ⏳ 待创建 | 规划中，尚未创建 |
| 🗑️ 待删除 | 已过时，待清理 |

### 当前状态一览

| 文件 | 状态 | 备注 |
|------|------|------|
| `content/03_doc_system/ARCHITECTURE.md` | ✅ 活跃 | 核心架构说明 |
| `content/03_doc_system/DOC_MAP.md` | ✅ 活跃 | 本文档（v2.0 按新结构重组） |
| `content/03_doc_system/SSOT_INDEX.md` | ✅ 活跃 | 母本子本关系注册表 |
| `CLAUDE.md` | ✅ 活跃 | Harness（甲乙丙三部） |
| `README.md` | ✅ 活跃 | 项目门面 |
| `.ctx/SNAPSHOT.md` | ✅ 活跃 | 系统快照、AI 快速同步入口 |
| `.ctx/TIMESTAMPS.md` | ✅ 活跃 | 文件时间戳注册表 |
