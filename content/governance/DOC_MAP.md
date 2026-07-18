---
title: "全局文档导航映射"
type: governance
role: "[工程师]+[AI]"
last_updated: "2026-07-18"
version: "1.5"
status: active
related_files: [content/governance/OPERATIONS_GUIDE.md, SSOT_INDEX.md, CLAUDE.md, ARCHITECTURE.md]
---

# 文档导航映射

> **本文档为导航图**：按目录结构组织，标注每个文件的权威层级。
> **权威层级定义**（层级模型、裁决规则、正交维度）见 [OPERATIONS_GUIDE.md §7.1](OPERATIONS_GUIDE.md#7-文档权威层级与索引规范)。
> **母本子本关系注册表**见 [SSOT_INDEX.md](../../SSOT_INDEX.md)。
> 三者关系：§7.1 定义层级 → DOC_MAP 标注层级 → SSOT_INDEX 注册关系。
> 受众: [工程师]+[AI]

---

## §〇 文件角色分类

本仓库文件按三类角色标记：`[用户]` / `[工程师]` / `[AI]`，支持复合标记（如 `[用户]+[AI]`）。

定义见 [ROLE_CLASSIFICATION.md §一](ROLE_CLASSIFICATION.md)。

| 标记 | 典型读者 | 示例目录 |
|------|---------|---------|
| `[用户]` | 党支书/党员 | content/strategy/、content/sop/ |
| `[工程师]` | 系统维护者/开发者 | content/design/、content/governance/ |
| `[AI]` | AI Agent | .github/、.ctx/SNAPSHOT.md |

**废弃概念**：`[人]`/`[人机]` 已于 2026-07-11 废弃，详见 ROLE_CLASSIFICATION.md §一。

---

## 一、快速导航（按受众）

| 受众 | 入口文件 | 说明 |
|------|---------|------|
| [用户] | `README.md` | 项目门面，一句话说清是什么 |
| [工程师]+[AI] | `ARCHITECTURE.md` | 核心架构说明，技术全景 |
| [工程师]+[AI] | `CLAUDE.md` | 宪章层权威源（HARNESS 甲乙丙三部）、AI 执行依据 |

---

## 二、文件总览（按权威层级 L0-L6）

> **层级定义见 [OPERATIONS_GUIDE.md §7.1](OPERATIONS_GUIDE.md#71-文档权威层级7层模型)**：L0 宪章层 / L1 上下文层 / L2 理念维度 / L3 执行维度 / L4 实现层 / L5 审计层 / L6 官方层。
> L2 与 L3 为正交维度，互不覆盖。

### L0 宪章层（最高权威）

| 文件 | 受众 | 内容 | 被引用方 |
|------|------|------|---------|
| `CLAUDE.md` | [工程师]+[AI] | 宪章层权威源（HARNESS 甲乙丙三部）、执行路线图、Agent 协作规则、授权机制 | 所有 Agent 文件、SSOT_INDEX、README（路线图摘要） |

### L1 上下文层（项目上下文入口）

| 文件 | 受众 | 内容 | 被引用方 |
|------|------|------|---------|
| `ARCHITECTURE.md` | [工程师]+[AI] | 核心架构说明、分层架构、数据模型、变更流水线 | README（架构图引用）、AGENT_USAGE |
| `SSOT_INDEX.md` | [工程师]+[AI] | 母本注册表、溯源参考、Agent 注册表 | ARCHITECTURE、所有 Agent 文件 |
| `SECRETARY_PRONOUNCEMENTS.md` | [用户]+[AI] | 书记重要论断汇编（项目顶级战略文档） | CLAUDE.md H6 |

### L2 理念维度（为什么这样做）— strategy/ + design/ + governance/ + insights/

| 文件 | 受众 | 内容 | 被引用方 |
|------|------|------|---------|
| `content/strategy/DEVELOPMENT_PATH.md` | [用户]+[AI] | 发展路径（从入党申请人到正式党员的完整叙事） | SECRETARY_PRONOUNCEMENTS.md |
| `content/design/DATA_ARCHITECTURE.md` | [工程师]+[AI] | 数据架构设计（合并原 DATA/PARTICIPANT_DATAFLOW/LOGIN_SYSTEM_DESIGN/BRAND_ACTIVITY：系统数据流+界面布局+登录态打桩设计+用户身份模型/认证机制+品牌属性标签+§写入数据验证设计） | SECRETARY_PRONOUNCEMENTS.md、ARCHITECTURE、CLAUDE.md |
| `content/strategy/FLAT_DESIGN.md` | [工程师]+[AI] | 组织者与深度参与者的扁平化设计 | SECRETARY_PRONOUNCEMENTS.md |
| `content/strategy/COMMISSIONER_FRAMEWORK.md` | [用户]+[AI] | 支委系统设计（含专班、赋权关系链、§审批流程规范） | SECRETARY_PRONOUNCEMENTS.md |
| `content/governance/SOP_WEB.md` | [工程师]+[AI] | SOP 系统优化与同步指南 | CLAUDE.md H2.2 |
| `content/governance/SERVICE_CATALOG.md` | [工程师]+[AI] | 统一服务目录（服务清单+角色权限矩阵） | DATA_ARCHITECTURE / ROLE_CLASSIFICATION / COMMISSIONER_FRAMEWORK |
| `content/design/MODULE_UI_DESIGN.md` | [工程师]+[AI] | 模块界面设计（合并原 PAFFAIRS_UI/CALENDAR：党务管理模块+日历功能） | E1、docs/src/components/calendar.js |
| `content/design/DESIGN_SYSTEM.md` | [工程师]+[AI] | 设计系统规范 | docs/src/styles.css |
| `content/governance/OPERATIONS_GUIDE.md` | [工程师]+[AI] | 运行标准（含权威层级 §7、三类文件角色 §8、一致性检查规范 §7.4、§14 吸收外部输入操作流程、§15 周期性任务与自动唤醒机制） | CLAUDE.md H6 |
| `content/governance/USAGE_POLICY.md` | [工程师]+[AI] | 使用规范（术语标准 §一 + Emoji 边界 §二，合并自 TERMINOLOGY.md + EMOJI_POLICY.md） | 全仓库 |
| `content/governance/KNOWN_PITFALLS.md` | [工程师]+[AI] | 已知陷阱判例（AI工具使用陷阱） | CLAUDE.md H6 |
| `content/governance/ROLE_CLASSIFICATION.md` | [工程师]+[AI] | 文件角色分类体系设计 | CLAUDE.md |
| `.github/AGENT_HANDBOOK.md` | [工程师]+[AI] | 技术操作手册（Trae 忽略，仅 VSCode 可用） | INDEX |
| `.github/AGENT_USAGE.md` | [工程师]+[AI] | Agent 使用指南（Trae 忽略，仅 VSCode 可用） | ARCHITECTURE |
| `content/governance/DOC_MAP.md` | [工程师]+[AI] | 本文档：全局导航中心 | 所有文件 |
| `content/strategy/README.md` | [工程师]+[AI] | 战略路线目录索引 | ARCHITECTURE |
| `content/governance/README.md` | [工程师]+[AI] | 系统治理目录索引 | ARCHITECTURE |
| `content/design/README.md` | [工程师]+[AI] | 设计理念目录索引 | ARCHITECTURE |
| `content/insights/党支部管理与实务经验沉淀.md` | [用户]+[AI] | 经验沉淀（三卷：道/术/器） | 社科院 |

### L3 执行维度（怎么做）— content/sop/

| 文件 | 受众 | 内容 | 被引用方 |
|------|------|------|---------|
| `content/sop/INDEX.md` | [用户]+[AI] | SOP 导航目录 | ARCHITECTURE、AGENT_USAGE |
| `content/sop/常见工作场景快速指南.md` | [用户]+[AI] | 快速使用指南 | INDEX |
| `content/sop/支委与党小组定人定责定岗说明.md` | [用户]+[AI] | 职责分工文档 | INDEX |
| `content/sop/宣传委员工作流程指南.md` | [用户]+[AI] | 宣传委员 SOP | INDEX |
| `content/sop/组织委员工作流程指南.md` | [用户]+[AI] | 组织委员 SOP | INDEX |
| `content/sop/纪检委员工作流程指南.md` | [用户]+[AI] | 纪检委员 SOP | INDEX |
| `content/sop/党小组组长工作手册.md` | [用户]+[AI] | 党小组组长专用操作指南 | INDEX |

### L4 实现层（代码与配置）

> **收录策略**：L4 采用"代表性收录"——仅列出架构关键文件。全量文件清单见 `docs/src/` 目录及 SNAPSHOT.md III 核心文件清单。

| 文件 | 受众 | 内容 | 被引用方 |
|------|------|------|---------|
| `.github/agents/*.agent.md` (10个) | [AI] | Agent 定义、职责、工具、handoffs（Trae 忽略，仅 VSCode 可用） | SSOT_INDEX |
| `.github/skills/*/SKILL.md` (11个) | [AI] | Skill 接口定义、执行流程、gotchas（Trae 忽略，仅 VSCode 可用） | SSOT_INDEX、Agent 文件 |
| `docs/src/workflow/index.js` | [工程师] | 桶文件，统一导出 | ARCHITECTURE |
| `docs/src/workflow/sop.js` | [工程师] | SOP 实例化逻辑 | ARCHITECTURE |
| `docs/src/workflow/sopData.js` | [工程师] | SOP 场景任务模板 | ARCHITECTURE |
| `docs/src/services/mock.js` | [工程师] | Mock 服务层 + LocalStorage | ARCHITECTURE |
| `docs/src/services/runtime.js` | [工程师] | 运行时插槽 | ARCHITECTURE |
| `docs/src/entries/main-entry.js` | [工程师] | 状态机 + DOM 入口 | ARCHITECTURE |
| `docs/src/core/state.js` | [工程师] | 全局状态中心 | ARCHITECTURE |
| `docs/src/components/calendar.js` | [工程师] | 日历渲染引擎 | ARCHITECTURE |
| `docs/src/components/inspector.js` | [工程师] | 检查器面板 | ARCHITECTURE |
| `docs/src/core/utils.js` | [工程师] | 通用工具函数 | ARCHITECTURE |
| `docs/src/core/constants.js` | [工程师] | 静态常量 | ARCHITECTURE |
| `docs/src/core/id.js` | [工程师] | UUID 发生器 | ARCHITECTURE |
| `docs/src/styles.css` | [工程师] | 全局样式 | ARCHITECTURE |
| `docs/index.html` | [工程师] | UI 入口 | ARCHITECTURE |

### L5 审计层（运行记录，只增不改）

| 文件 | 受众 | 内容 | 被引用方 |
|------|------|------|---------|
| `.ctx/TIMESTAMPS.md` | [工程师] | 文件时间戳注册表（含周期性任务追踪表） | CLAUDE.md |
| `.ctx/SNAPSHOT.md` | [AI] | 系统快照、AI 快速同步入口（审计追溯层） | ARCHITECTURE、CLAUDE.md |
| `.ctx/logs/YYYY-MM-EXECUTION_LOG.md` | [工程师] | 月度执行日志 | ARCHITECTURE、CLAUDE.md |
| `.ctx/logs/EXECUTION_LOG_INDEX.md` | [工程师] | 日志导航索引 | ARCHITECTURE |
| `.ctx/logs/DECISION_LOG.md` | [工程师] | 决策日志 | ARCHITECTURE、CLAUDE.md |

### L6 官方层（外部权威，只读）

| 文件 | 受众 | 内容 | 被引用方 |
|------|------|------|---------|
| `content/references/合规文件/*.pdf, *.docx` | [用户] | 党章、条例、规范 | content/sop（母本溯源） |
| `content/references/工作模板/*.md` | [用户] | 工作模板、经验沉淀辅助提示词 | content/governance/SOP_WEB.md |
| `content/references/历史会议材料/*.pdf` `*.docx` | [用户] | 历史会议记录 | 无（历史档案） |

---

## 三、引用关系图

```
L0 宪章层
  ├─ CLAUDE.md → 所有 Agent 文件
  └─ SSOT_INDEX.md → ARCHITECTURE.md + 所有 Agent 文件

L1 上下文层
  ├─ CLAUDE.md → README.md（路线图摘要）
  ├─ ARCHITECTURE.md → README.md（架构图）+ AGENT_USAGE.md
  └─ SECRETARY_PRONOUNCEMENTS.md → CLAUDE.md H6

L2 理念维度（为什么）
  ├─ DEVELOPMENT_PATH.md → SECRETARY_PRONOUNCEMENTS.md
  ├─ DATA_ARCHITECTURE.md → SECRETARY_PRONOUNCEMENTS.md / ARCHITECTURE / CLAUDE.md
  ├─ FLAT_DESIGN.md → SECRETARY_PRONOUNCEMENTS.md
  ├─ COMMISSIONER_FRAMEWORK.md → SECRETARY_PRONOUNCEMENTS.md
  ├─ SERVICE_CATALOG.md → DATA_ARCHITECTURE.md / ROLE_CLASSIFICATION.md / COMMISSIONER_FRAMEWORK.md
  ├─ SOP_WEB.md → content/sop/*
  ├─ ROLE_CLASSIFICATION.md → CLAUDE.md
  ├─ DESIGN_SYSTEM.md → docs/src/styles.css
  ├─ MODULE_UI_DESIGN.md → E1 / docs/src/components/calendar.js
  ├─ USAGE_POLICY.md → 全仓库
  ├─ AGENT_USAGE.md → ARCHITECTURE.md
  ├─ OPERATIONS_GUIDE.md → CLAUDE.md H6（含 §7 权威层级、§8 三类文件角色、§15 周期性任务）
  ├─ KNOWN_PITFALLS.md → CLAUDE.md H6
  └─ DOC_MAP.md → 所有文件

L3 执行维度（怎么做）
  └─ content/sop/INDEX.md → 所有 SOP 子文件

L4 实现层
  ├─ agents/*.md → SSOT_INDEX.md（注册）
  ├─ skills/*/SKILL.md → SSOT_INDEX.md（注册）+ agents/*.md（挂载）
  ├─ MODULE_UI_DESIGN.md → docs/index.html (Module 4)
  ├─ DATA_ARCHITECTURE.md → docs/src/*（数据流引擎）
  └─ docs/src/* → ARCHITECTURE.md（文档化）

L5 审计层
  ├─ .ctx/SNAPSHOT.md → ARCHITECTURE.md, CLAUDE.md
  ├─ .ctx/TIMESTAMPS.md → CLAUDE.md
  └─ logs/*.md → CLAUDE.md
```

---

## 四、按任务分类的快速入口

| 我想做什么 | 先读哪里 | 再读哪里 |
|-----------|---------|---------|
| 了解项目全貌 | README.md | ARCHITECTURE.md |
| 查看待办任务 | CLAUDE.md §C | .ctx/logs/DECISION_LOG.md |
| 查 SOP 流程 | content/sop/INDEX.md | 对应功能委员 SOP |
| 使用 Agent | .github/agents/对应 Agent（已移至 .github/，Trae 忽略） | — |
| 提交改进反馈 | content/governance/SOP_WEB.md §E | content/sop/对应文件 |
| 了解角色分类体系 | content/governance/ROLE_CLASSIFICATION.md | （含可扩展性评估 §六） |
| 查看设计系统规范 | content/design/DESIGN_SYSTEM.md | docs/src/styles.css |
| 了解 Emoji 使用规范 | content/governance/USAGE_POLICY.md §二 | CLAUDE.md 钩稽矩阵 |
| 查看日历功能规划 | content/design/MODULE_UI_DESIGN.md | docs/src/components/calendar.js |
| 查看品牌标签设计 | content/design/DATA_ARCHITECTURE.md | CLAUDE.md |
| 查官方合规 | content/references/合规文件/ | content/sop/溯源 |
| 查看执行日志 | .ctx/logs/EXECUTION_LOG_INDEX.md | 对应月份日志 |
| 查看 SOP 系统优化 | content/governance/SOP_WEB.md | content/sop/对应 SOP |
| 了解支委系统设计 | content/strategy/COMMISSIONER_FRAMEWORK.md | MODULE_UI_DESIGN.md |
| 了解登录系统设计前置 | content/design/DATA_ARCHITECTURE.md | DATA_ARCHITECTURE.md §登录态打桩设计 |
| 查看服务清单与权限矩阵 | content/governance/SERVICE_CATALOG.md | ROLE_CLASSIFICATION.md §九 |
| 理解架构变更 | ARCHITECTURE.md §八 | SSOT_INDEX.md |
| 了解三类文件角色规范 | content/governance/OPERATIONS_GUIDE.md §8 | 本文档 §〇 |
| 查看文档权威层级 | content/governance/OPERATIONS_GUIDE.md §7.1 | 本文档 §二 |
| 查看母本子本关系 | SSOT_INDEX.md | OPERATIONS_GUIDE.md §7.1 |
| 查看书记重要论断 | SECRETARY_PRONOUNCEMENTS.md（项目顶级战略文档） | CLAUDE.md H6 |

---

## 五、文件状态标记

| 标记 | 含义 |
|------|------|
| ✅ 活跃 | 当前有效，持续维护 |
| 🔄 待更新 | 内容有效，但需同步最新结构 |
| ⏳ 待创建 | 规划中，尚未创建 |
| 🗑️ 待删除 | 已过时，待 Phase 2 清理 |

### 当前状态一览

| 文件 | 状态 | 备注 |
|------|------|------|
| `ARCHITECTURE.md` | ✅ 活跃 | 核心架构说明，根目录 |
| `governance/` | ✅ 已迁移 | 先迁移至 .ctx/，后整合至 CLAUDE.md |
| `backlog/` | ✅ 已迁移 | 先迁移至 .ctx/，后整合至 CLAUDE.md 或删除 |
| `.ctx/scenarios/` | ✅ 已删除 | 全部场景文件已评估删除，目录已清空 |
| `.ctx/COMPLETED_TASKS.md` | ✅ 已删除 | 日志已覆盖，汇总表删除 |
| `.ctx/PENDING_MODIFICATIONS.md` | ✅ 已整合 | 内容迁移至 CLAUDE.md 乙部 |
| `.ctx/SUSPENDED_ISSUES.md` | ✅ 已整合 | 内容迁移至 CLAUDE.md 丙部 |
| `.ctx/WATCH_LOG.md` | ✅ 已删除 | 全部已解决，验证后删除 |
| `README.md` | ✅ 已定稿 | Phase 1-4 完成后最终编辑 |
| `content/governance/AGENT_USAGE.md` | ✅ 已移走 | 已移至 .github/（Trae 忽略） |
| `content/governance/DOC_MAP.md` | ✅ 活跃 | 本文档 |
| `.ctx/SNAPSHOT.md` | ✅ 活跃 | 系统快照、AI 快速同步入口（审计追溯层，融合原 AI_CONTEXT + REVIEW_STATE） |
| `.ctx/AI_CONTEXT.md` | ✅ 已融合 | 内容迁移至 SNAPSHOT.md |
| `.ctx/REVIEW_STATE.md` | ✅ 已融合 | 内容迁移至 SNAPSHOT.md |
| `.ctx/SNAPSHOT_v1.3/v2.0/v2.1` | ✅ 已归档 | 旧快照删除，新 v3.0 生成 |
