---
title: "全局文档导航映射"
type: governance
role: "[人机]"
last_updated: "2026-06-14"
status: active
---

# 文档导航映射

> 全局文档导航中心 — 按角色分层、权威性排序、引用关系清晰
> last_updated: 2026-05-03 | 类型: [人机]

---

## 一、快速导航（按角色）

| 角色 | 入口文件 | 说明 |
|------|---------|------|
| 【人】独立阅读 | `README.md` | 项目门面，一句话说清是什么 |
| 【人+AI】共读 | `ARCHITECTURE.md` | 核心架构说明，技术全景 |
| 【AI】专用 | `.github/copilot-instructions.md` | 全局系统指令（宪章） |

---

## 二、文件总览（按权威性层级排序）

> **D-218 决策**：SOP（执行细节）和 guides（理念概括）是正交维度，不排先后。
> CLAUDE.md 是最高层上下文入口，承接理念和具体细节。

### Layer 0: 宪章层（最高权威）

| 文件 | 角色 | 权威性 | 内容 | 被引用方 |
|------|------|--------|------|---------|
| `.github/copilot-instructions.md` | [AI] | 🔴 最高 | 全局系统指令、Agent 协作规则、授权机制 | 所有 Agent 文件、SSOT_INDEX |
| `SSOT_INDEX.md` | [AI] | 🔴 最高 | 母本注册表、溯源参考、Agent 注册表 | ARCHITECTURE、所有 Agent 文件 |

### Layer 1: 上下文层（HARNESS 入口）

| 文件 | 角色 | 权威性 | 内容 | 被引用方 |
|------|------|--------|------|---------|
| `CLAUDE.md` | [人机] | 🔴 高 | 上下文入口、执行路线图、HARNESS 甲乙丙三部 | README（路线图摘要） |
| `ARCHITECTURE.md` | [人机] | 🔴 高 | 核心架构说明、分层架构、数据模型、变更流水线 | README（架构图引用）、AGENT_USAGE |

### Layer 2: 理念维度（为什么这样做）— guides/

| 文件 | 角色 | 权威性 | 内容 | 被引用方 |
|------|------|--------|------|---------|
| `content/guides/architecture/MANAGEMENT_MODE.md` | [人机] | 🟡 理念 | 管理模式架构设计 | CLAUDE.md H8.1/H8.2 |
| `content/guides/architecture/FLAT_DESIGN.md` | [人机] | 🟡 理念 | 组织者与深度参与者的扁平化设计 | CLAUDE.md H8.6 |
| `content/guides/architecture/DATA.md` | [人机] | 🟡 理念 | 数据架构与权限模型 | ARCHITECTURE |
| `content/guides/architecture/LOGIN_STUB.md` | [人机] | 🟡 理念 | 登录态打桩文档 | ARCHITECTURE |
| `content/guides/architecture/ORG_BUILDING.md` | [人机] | 🟡 理念 | 党务管理独立模块架构 | E1 |
| `content/guides/design/SOP_WEB.md` | [人机] | 🟡 理念 | SOP 网页优化与同步指南 | CLAUDE.md H8.4 |
| `content/guides/design/COMMISSIONER_SYSTEM.md` | [人机] | 🟡 理念 | 条条支委系统设计 | CLAUDE.md H8.3/H8.5 |
| `content/guides/design/WRITE_VERIFY.md` | [人机] | 🟡 理念 | 写入数据验证设计 | ARCHITECTURE |
| `content/guides/design/DESIGN_SYSTEM.md` | [人机] | 🟡 理念 | 设计系统规范 | docs/src/styles.css |
| `content/guides/design/CALENDAR.md` | [人机] | 🟡 理念 | 日历功能规划 | docs/src/components/calendar.js |
| `content/guides/design/BRAND_ACTIVITY.md` | [人机] | 🟡 理念 | 品牌属性标签设计理念 | CLAUDE.md |
| `content/guides/governance/SYNC_EXTERNAL.md` | [人机] | 🟡 理念 | 外部输入同步流程 | CLAUDE.md H2.1 |
| `content/guides/governance/OPERATIONS_GUIDE.md` | [人机] | 🟡 理念 | 运行标准 | CLAUDE.md H9 |
| `content/guides/governance/KNOWN_PITFALLS.md` | [人机] | 🟡 理念 | 已知陷阱判例 | CLAUDE.md H7 |
| `content/guides/governance/TERMINOLOGY.md` | [人机] | 🟡 理念 | 术语规范使用说明 | 全仓库 |
| `content/guides/governance/RECURRING_TASKS.md` | [人机] | 🟡 理念 | 经常性工作管理机制 | TIMESTAMPS |
| `content/guides/governance/ROLE_CLASSIFICATION.md` | [人机] | 🟡 理念 | 角色三分类体系设计 | CLAUDE.md |
| `content/guides/governance/EMOJI_POLICY.md` | [人机] | 🟡 理念 | Emoji 使用规范 | CLAUDE.md 钩稽 |
| `content/guides/governance/AGENT_HANDBOOK.md` | [人机] | 🟡 理念 | 技术操作手册 | INDEX |
| `content/guides/governance/AGENT_USAGE.md` | [人机] | 🟡 理念 | Agent 使用指南 | ARCHITECTURE |
| `content/guides/governance/DOC_MAP.md` | [人机] | 🟡 理念 | 本文档：全局导航中心 | 所有文件 |
| `content/guides/README.md` | [人机] | 🟡 理念 | guides目录索引 | ARCHITECTURE |
| `content/insights/党支部管理与实务经验沉淀.md` | [人机] | 🟡 理念 | 经验沉淀 | 社科院 |

### Layer 3: 执行维度（怎么做）— content/SOP/

| 文件 | 角色 | 权威性 | 内容 | 被引用方 |
|------|------|--------|------|---------|
| `content/SOP/INDEX.md` | [人机] | 🟡 执行权威 | SOP 导航目录 | ARCHITECTURE、AGENT_USAGE |
| `content/SOP/常见工作场景快速指南.md` | [人机] | 🟡 执行权威 | 快速使用指南 | INDEX |
| `content/SOP/支委与党小组定人定责定岗说明.md` | [人机] | 🟡 执行权威 | 职责分工文档 | INDEX |
| `content/SOP/宣传委员工作流程指南.md` | [人机] | 🟡 执行权威 | 宣传委员 SOP | INDEX |
| `content/SOP/组织委员工作流程指南.md` | [人机] | 🟡 执行权威 | 组织委员 SOP | INDEX |
| `content/SOP/纪检委员工作流程指南.md` | [人机] | 🟡 执行权威 | 纪检委员 SOP | INDEX |
| `content/SOP/党小组组长工作手册.md` | [人机] | 🟡 执行权威 | 块块组长专用操作指南 | INDEX |

### Layer 4: Agent 治理层

| 文件 | 角色 | 权威性 | 内容 | 被引用方 |
|------|------|--------|------|---------|
| `.github/agents/*.agent.md` (10个) | [AI] | 🟠 配置层 | Agent 定义、职责、工具、handoffs | SSOT_INDEX |
| `.github/skills/*/SKILL.md` (11个) | [AI] | 🟠 配置层 | Skill 接口定义、执行流程、gotchas | SSOT_INDEX、Agent 文件 |

### Layer 5: 代码实现层

| 文件 | 角色 | 权威性 | 内容 | 被引用方 |
|------|------|--------|------|---------|
| `docs/src/workflow/index.js` | [人机] | 🟢 代码 | 桶文件，统一导出 | ARCHITECTURE |
| `docs/src/workflow/sop.js` | [人机] | 🟢 代码 | SOP 实例化逻辑 | ARCHITECTURE |
| `docs/src/workflow/sopData.js` | [人机] | 🟢 代码 | SOP 场景任务模板 | ARCHITECTURE |
| `docs/src/services/mock.js` | [人机] | 🟢 代码 | Mock 服务层 + LocalStorage | ARCHITECTURE |
| `docs/src/services/runtime.js` | [人机] | 🟢 代码 | 运行时插槽 | ARCHITECTURE |
| `docs/src/entries/main-entry.js` | [人机] | 🟢 代码 | 状态机 + DOM 入口 | ARCHITECTURE |
| `docs/src/core/state.js` | [人机] | 🟢 代码 | 全局状态中心 | ARCHITECTURE |
| `docs/src/components/calendar.js` | [人机] | 🟢 代码 | 日历渲染引擎 | ARCHITECTURE |
| `docs/src/components/inspector.js` | [人机] | 🟢 代码 | 检查器面板 | ARCHITECTURE |
| `docs/src/core/utils.js` | [人机] | 🟢 代码 | 通用工具函数 | ARCHITECTURE |
| `docs/src/core/constants.js` | [人机] | 🟢 代码 | 静态常量 | ARCHITECTURE |
| `docs/src/core/id.js` | [人机] | 🟢 代码 | UUID 发生器 | ARCHITECTURE |
| `docs/src/styles.css` | [人机] | 🟢 代码 | 全局样式 | ARCHITECTURE |
| `docs/index.html` | [人机] | 🟢 代码 | UI 入口（Liquid Glass） | ARCHITECTURE |

### Layer 5: 技术文档层

| 文件 | 角色 | 权威性 | 内容 | 被引用方 |
|------|------|--------|------|---------|
| `content/guides/architecture/ORG_BUILDING.md` | [人机] | 🟡 技术 | 党务管理独立模块架构 | E1 |
| `content/guides/architecture/MANAGEMENT_MODE.md` | [人机] | 🟡 技术 | 管理模式架构设计 | E2 |
| `content/guides/governance/RECURRING_TASKS.md` | [人机] | 🟡 技术 | 经常性工作管理机制 | T1 |
| `content/guides/governance/TERMINOLOGY.md` | [人机] | 🟡 技术 | 术语规范使用说明 | T2 |
| `content/guides/design/SOP_WEB.md` | [人机] | 🟡 技术 | SOP 网页优化与同步指南（合并自4文件） | T3+T3a |
| `content/guides/design/COMMISSIONER_SYSTEM.md` | [人机] | 🟡 技术 | 条条支委系统设计（党务管理+条块交互合并） | E3 |
| `content/guides/governance/ROLE_CLASSIFICATION.md` | [人机] | 🟡 技术 | 角色三分类体系设计（含可扩展性评估 v3.0） | 社科院 |
| `content/guides/design/DESIGN_SYSTEM.md` | [人机] | 🟡 技术 | 设计系统规范 | docs/src/styles.css |
| `content/guides/governance/EMOJI_POLICY.md` | [人机] | 🟡 技术 | Emoji 使用规范 | CLAUDE.md 钩稽 |
| `content/guides/design/CALENDAR.md` | [人机] | 🟡 技术 | 日历功能规划 | docs/src/components/calendar.js |
| `content/guides/design/BRAND_ACTIVITY.md` | [人机] | 🟡 技术 | 品牌属性标签设计理念 | CLAUDE.md |
| `content/guides/governance/AGENT_USAGE.md` | [人机] | 🟡 技术 | Agent 使用指南 | ARCHITECTURE（快速导航） |
| `content/insights/党支部管理与实务经验沉淀.md` | [人机] | 🟡 技术 | 经验沉淀 | 社科院 |
| `content/guides/governance/DOC_MAP.md` | [人机] | 🟡 技术 | 本文档：全局导航中心 | 所有文件 |

### Layer 6: 审计追溯层

| 文件 | 角色 | 权威性 | 内容 | 被引用方 |
|------|------|--------|------|---------|
| `.ctx/CONTEXT.md` | [AI] | 🟠 审计 | AI 快速同步入口（融合原 AI_CONTEXT + REVIEW_STATE） | ARCHITECTURE、copilot-instructions |
| `.ctx/TIMESTAMPS.md` | [人机] | 🟠 审计 | 文件时间戳注册表（含周期性任务追踪表） | CLAUDE.md |
| `.ctx/SNAPSHOT.md` | [AI] | 🟠 审计 | 系统快照（ACTIVE） | CLAUDE.md |
| `.ctx/logs/YYYY-MM-EXECUTION_LOG.md` | [人机] | 🟠 审计 | 月度执行日志 | ARCHITECTURE、CLAUDE.md |
| `.ctx/logs/EXECUTION_LOG_INDEX.md` | [人机] | 🟠 审计 | 日志导航索引 | ARCHITECTURE |
| `.ctx/logs/DECISION_LOG.md` | [人机] | 🟠 审计 | 决策日志 | ARCHITECTURE、CLAUDE.md |

### Layer 7: 官方底线层（只读）

| 文件 | 角色 | 权威性 | 内容 | 被引用方 |
|------|------|--------|------|---------|
| `content/references/合规文件/*.pdf, *.docx` | [人] | 🔵 官方 | 党章、条例、规范 | content/SOP（母本溯源） |
| `content/references/工作模板/*.md` | [人] | 🔵 官方 | 工作模板、经验沉淀辅助提示词 | content/guides/design/SOP_WEB.md |
| `content/references/历史会议材料/*.pdf` `*.docx` | [人] | 🔵 官方 | 历史会议记录 | 无（历史档案） |

---

## 三、引用关系图

```
宪章层
  ├─ copilot-instructions.md → 所有 Agent 文件
  └─ SSOT_INDEX.md → ARCHITECTURE.md + 所有 Agent 文件

上下文层
  ├─ CLAUDE.md → README.md（路线图摘要）
  └─ ARCHITECTURE.md → README.md（架构图）+ AGENT_USAGE.md

理念维度（为什么）
  ├─ MANAGEMENT_MODE.md → CLAUDE.md H8.1/H8.2
  ├─ FLAT_DESIGN.md → CLAUDE.md H8.6
  ├─ SOP_WEB.md → content/SOP/*
  ├─ COMMISSIONER_SYSTEM.md → CLAUDE.md H8.3/H8.5
  ├─ ROLE_CLASSIFICATION.md → CLAUDE.md
  ├─ DESIGN_SYSTEM.md → docs/src/styles.css
  ├─ EMOJI_POLICY.md → CLAUDE.md 钩稽
  ├─ CALENDAR.md → docs/src/components/calendar.js
  ├─ BRAND_ACTIVITY.md → CLAUDE.md
  ├─ AGENT_USAGE.md → ARCHITECTURE.md
  ├─ OPERATIONS_GUIDE.md → CLAUDE.md H9
  ├─ KNOWN_PITFALLS.md → CLAUDE.md H7
  ├─ TERMINOLOGY.md → 全仓库
  ├─ SYNC_EXTERNAL.md → CLAUDE.md H2.1
  └─ DOC_MAP.md → 所有文件

执行维度（怎么做）
  └─ content/SOP/INDEX.md → 所有 SOP 子文件

Agent层
  ├─ agents/*.md → SSOT_INDEX.md（注册）
  └─ skills/*/SKILL.md → SSOT_INDEX.md（注册）+ agents/*.md（挂载）

代码层
  ├─ ORG_BUILDING.md → docs/index.html (Module 4)
  ├─ MANAGEMENT_MODE.md → docs/src/*（角色权限引擎）
  └─ docs/src/* → ARCHITECTURE.md（文档化）

审计层
  ├─ CONTEXT.md → ARCHITECTURE.md, copilot-instructions.md
  ├─ .ctx/TIMESTAMPS.md → CLAUDE.md
  ├─ .ctx/SNAPSHOT.md → CLAUDE.md
  └─ logs/*.md → CLAUDE.md
```

---

## 四、按任务域的快速入口

| 我想做什么 | 先读哪里 | 再读哪里 |
|-----------|---------|---------|
| 了解项目全貌 | README.md | ARCHITECTURE.md |
| 查看待办任务 | CLAUDE.md §C | .ctx/logs/DECISION_LOG.md |
| 查 SOP 流程 | content/SOP/INDEX.md | 对应功能委员 SOP |
| 使用 Agent | content/guides/governance/AGENT_USAGE.md | .github/agents/对应 Agent |
| 提交改进反馈 | content/guides/design/SOP_WEB.md §E | content/SOP/对应文件 |
| 了解角色分类体系 | content/guides/governance/ROLE_CLASSIFICATION.md | （含可扩展性评估 §六） |
| 查看设计系统规范 | content/guides/design/DESIGN_SYSTEM.md | docs/src/styles.css |
| 了解 Emoji 使用规范 | content/guides/governance/EMOJI_POLICY.md | CLAUDE.md 钩稽矩阵 |
| 查看日历功能规划 | content/guides/design/CALENDAR.md | docs/src/components/calendar.js |
| 查看品牌标签设计 | content/guides/design/BRAND_ACTIVITY.md | CLAUDE.md |
| 查官方合规 | content/references/合规文件/ | content/SOP/溯源 |
| 查看执行日志 | .ctx/logs/EXECUTION_LOG_INDEX.md | 对应月份日志 |
| 查看 SOP 网页优化 | content/guides/design/SOP_WEB.md | content/SOP/对应 SOP |
| 了解支委系统设计 | content/guides/design/COMMISSIONER_SYSTEM.md | ORG_BUILDING.md |
| 理解架构变更 | ARCHITECTURE.md §八 | SSOT_INDEX.md |

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
| `.ctx/PENDING_MODIFICATIONS.md` | ✅ 已整合 | 内容迁移至 CLAUDE.md §七 |
| `.ctx/SUSPENDED_ISSUES.md` | ✅ 已整合 | 内容迁移至 CLAUDE.md §八 |
| `.ctx/WATCH_LOG.md` | ✅ 已删除 | 全部已解决，验证后删除 |
| `README.md` | ✅ 已定稿 | Phase 1-4 完成后最终编辑 |
| `content/guides/governance/AGENT_USAGE.md` | ✅ 已更新 | 已更新为 10-Agent 模型 |
| `content/guides/governance/DOC_MAP.md` | ✅ 活跃 | 本文档 |
| `.ctx/CONTEXT.md` | ✅ 活跃 | AI 快速同步入口（融合原 AI_CONTEXT + REVIEW_STATE） |
| `.ctx/AI_CONTEXT.md` | ✅ 已融合 | 内容迁移至 CONTEXT.md |
| `.ctx/REVIEW_STATE.md` | ✅ 已融合 | 内容迁移至 CONTEXT.md |
| `.ctx/SNAPSHOT_v1.3/v2.0/v2.1` | ✅ 已归档 | 旧快照删除，新 v3.0 生成 |
