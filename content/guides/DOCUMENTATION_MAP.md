---
role: "[人机]"
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

### Layer 0: 宪章层（最高权威）

| 文件 | 角色 | 权威性 | 内容 | 被引用方 |
|------|------|--------|------|---------|
| `.github/copilot-instructions.md` | [AI] | 🔴 最高 | 全局系统指令、Agent 协作规则、授权机制 | 所有 Agent 文件、SSOT_INDEX |
| `.github/SSOT_INDEX.md` | [AI] | 🔴 最高 | 母本注册表、溯源参考、Agent 注册表 | ARCHITECTURE、所有 Agent 文件 |

### Layer 1: 项目中枢层

| 文件 | 角色 | 权威性 | 内容 | 被引用方 |
|------|------|--------|------|---------|
| `ROADMAP.md` | [人机] | 🔴 高 | 未来执行路线图、Phase 1-4 清单、技术产品 Phase 1-3 | README（路线图摘要） |
| `ARCHITECTURE.md` | [人机] | 🔴 高 | 核心架构说明、分层架构、数据模型、变更流水线 | README（架构图引用）、AGENT_USAGE |

### Layer 2: 制度母本层

| 文件 | 角色 | 权威性 | 内容 | 被引用方 |
|------|------|--------|------|---------|
| `content/SOP/INDEX.md` | [人机] | 🟡 制度权威 | SOP 导航目录 | ARCHITECTURE、AGENT_USAGE |
| `content/SOP/常见工作场景快速指南.md` | [人机] | 🟡 制度权威 | 快速使用指南 | INDEX |
| `content/SOP/支委与党小组定人定责定岗说明.md` | [人机] | 🟡 制度权威 | 职责分工文档 | INDEX |
| `content/SOP/Org_OS_极客操作手册.md` | [人机] | 🟡 制度权威 | 技术操作手册 | INDEX |
| `content/SOP/宣传委员工作流程指南.md` | [人机] | 🟡 制度权威 | 宣传委员 SOP | INDEX |
| `content/SOP/组织委员工作流程指南.md` | [人机] | 🟡 制度权威 | 组织委员 SOP | INDEX |
| `content/SOP/纪检委员工作流程指南.md` | [人机] | 🟡 制度权威 | 纪检委员 SOP | INDEX |

### Layer 3: Agent 治理层

| 文件 | 角色 | 权威性 | 内容 | 被引用方 |
|------|------|--------|------|---------|
| `.github/agents/*.agent.md` (10个) | [AI] | 🟠 配置层 | Agent 定义、职责、工具、handoffs | SSOT_INDEX |
| `.github/skills/*/SKILL.md` (10个) | [AI] | 🟠 配置层 | Skill 接口定义、执行流程、gotchas | SSOT_INDEX、Agent 文件 |

### Layer 4: 代码实现层

| 文件 | 角色 | 权威性 | 内容 | 被引用方 |
|------|------|--------|------|---------|
| `src/workflow/index.js` | [人机] | 🟢 代码 | 桶文件，统一导出 | ARCHITECTURE |
| `src/workflow/sop.js` | [人机] | 🟢 代码 | SOP 实例化逻辑 | ARCHITECTURE |
| `src/workflow/sopData.js` | [人机] | 🟢 代码 | SOP 场景任务模板 | ARCHITECTURE |
| `src/service.mock.js` | [人机] | 🟢 代码 | Mock 服务层 + LocalStorage | ARCHITECTURE |
| `src/service.runtime.js` | [人机] | 🟢 代码 | 运行时插槽 | ARCHITECTURE |
| `src/main.js` | [人机] | 🟢 代码 | 状态机 + DOM 入口 | ARCHITECTURE |
| `src/state.js` | [人机] | 🟢 代码 | 全局状态中心 | ARCHITECTURE |
| `src/events.js` | [人机] | 🟢 代码 | DOM 事件绑定 | ARCHITECTURE |
| `src/calendar.js` | [人机] | 🟢 代码 | 日历渲染引擎 | ARCHITECTURE |
| `src/inspector.js` | [人机] | 🟢 代码 | 检查器面板 | ARCHITECTURE |
| `src/utils.js` | [人机] | 🟢 代码 | 通用工具函数 | ARCHITECTURE |
| `src/constants.js` | [人机] | 🟢 代码 | 静态常量 | ARCHITECTURE |
| `src/id.js` | [人机] | 🟢 代码 | UUID 发生器 | ARCHITECTURE |
| `src/styles.css` | [人机] | 🟢 代码 | 全局样式 | ARCHITECTURE |
| `index.html` | [人机] | 🟢 代码 | UI 入口（Liquid Glass） | ARCHITECTURE |

### Layer 5: 技术文档层

| 文件 | 角色 | 权威性 | 内容 | 被引用方 |
|------|------|--------|------|---------|
| `content/guides/ORGANIZATION_BUILDING_MODULE.md` | [人机] | 🟡 技术 | 党务管理独立模块架构 | E1 |
| `content/guides/MANAGEMENT_MODE_ARCHITECTURE.md` | [人机] | 🟡 技术 | 管理模式架构设计 | E2 |
| `content/guides/RECURRING_TASKS_MECHANISM.md` | [人机] | 🟡 技术 | 经常性工作管理机制 | T1 |
| `content/guides/TERMINOLOGY_STANDARDS.md` | [人机] | 🟡 技术 | 术语规范使用说明 | T2 |
| `content/guides/SOP_WEB_GUIDE.md` | [人机] | 🟡 技术 | SOP 网页优化与同步指南（合并自4文件） | T3+T3a |
| `content/guides/COMMISSIONER_SYSTEM_DESIGN.md` | [人机] | 🟡 技术 | 条条支委系统设计（党务管理+条块交互合并） | E3 |
| `content/guides/ROLE_CLASSIFICATION.md` | [人机] | 🟡 技术 | 角色三分类体系设计（含可扩展性评估 v3.0） | 社科院 |
| `content/guides/DESIGN_SYSTEM.md` | [人机] | 🟡 技术 | 设计系统规范 | src/styles.css |
| `content/guides/EMOJI_POLICY.md` | [人机] | 🟡 技术 | Emoji 使用规范 | ROADMAP.md 钩稽 |
| `content/guides/CALENDAR_DESIGN.md` | [人机] | 🟡 技术 | 日历功能规划 | src/calendar.js |
| `content/guides/BRAND_ACTIVITY.md` | [人机] | 🟡 技术 | 品牌活动规划与执行方案（合并自2文件） | ROADMAP.md |
| `content/guides/AGENT_USAGE.md` | [人机] | 🟡 技术 | Agent 使用指南 | ARCHITECTURE（快速导航） |
| `content/insights/党支部管理与实务经验沉淀.md` | [人机] | 🟡 技术 | 经验沉淀 | 社科院 |
| `content/guides/DOCUMENTATION_MAP.md` | [人机] | 🟡 技术 | 本文档：全局导航中心 | 所有文件 |

### Layer 6: 审计追溯层

| 文件 | 角色 | 权威性 | 内容 | 被引用方 |
|------|------|--------|------|---------|
| `.ctx/CONTEXT.md` | [AI] | 🟠 审计 | AI 快速同步入口（融合原 AI_CONTEXT + REVIEW_STATE） | ARCHITECTURE、copilot-instructions |
| `.ctx/TIMESTAMPS.md` | [人机] | 🟠 审计 | 文件时间戳注册表（含周期性任务追踪表） | ROADMAP |
| `.ctx/SNAPSHOT.md` | [AI] | 🟠 审计 | 系统快照（ACTIVE） | ROADMAP |
| `.ctx/logs/YYYY-MM-EXECUTION_LOG.md` | [人机] | 🟠 审计 | 月度执行日志 | ARCHITECTURE、ROADMAP |
| `.ctx/logs/EXECUTION_LOG_INDEX.md` | [人机] | 🟠 审计 | 日志导航索引 | ARCHITECTURE |

### Layer 7: 官方底线层（只读）

| 文件 | 角色 | 权威性 | 内容 | 被引用方 |
|------|------|--------|------|---------|
| `content/references/官方文件/*.pdf` | [人] | 🔵 官方 | 党章、条例、规范 | content/SOP（母本溯源） |
| `content/references/模板库/*.md` | [人] | 🔵 官方 | 工作模板、活动复盘模板 | content/guides/SOP_WEB_GUIDE.md |
| `content/references/党小组会/*.pdf` `*.docx` | [人] | 🔵 官方 | 历史党小组会记录 | 无（历史档案） |
| `content/references/支部委员会/*.docx` | [人] | 🔵 官方 | 历史支委会记录 | 无（历史档案） |

---

## 三、引用关系图

```
宪章层
  ├─ copilot-instructions.md → 所有 Agent 文件
  └─ SSOT_INDEX.md → ARCHITECTURE.md + 所有 Agent 文件

中枢层
  ├─ ROADMAP.md → README.md（路线图摘要）
  └─ ARCHITECTURE.md → README.md（架构图）+ AGENT_USAGE.md

制度层
  └─ content/SOP/INDEX.md → 所有 SOP 子文件

Agent层
  ├─ agents/*.md → SSOT_INDEX.md（注册）
  └─ skills/*/SKILL.md → SSOT_INDEX.md（注册）+ agents/*.md（挂载）

技术文档层
  ├─ ROLE_CLASSIFICATION.md（含可扩展性评估）
  ├─ DESIGN_SYSTEM.md → src/styles.css
  ├─ EMOJI_POLICY.md → ROADMAP.md 钩稽
  ├─ CALENDAR_DESIGN.md → src/calendar.js
  ├─ BRAND_ACTIVITY.md → ROADMAP.md
  ├─ AGENT_USAGE.md → ARCHITECTURE.md
  └─ DOCUMENTATION_MAP.md → 所有文件

代码层
  ├─ ORGANIZATION_BUILDING_MODULE.md → index.html (Module 4)
  ├─ MANAGEMENT_MODE_ARCHITECTURE.md → src/*（角色权限引擎）
  └─ src/* → ARCHITECTURE.md（文档化）

治理机制层
  ├─ RECURRING_TASKS_MECHANISM.md → TIMESTAMPS.md → copilot-instructions.md
  ├─ TERMINOLOGY_STANDARDS.md → 所有正式文档
  ├─ SOP_WEB_GUIDE.md → content/SOP/*
  ├─ COMMISSIONER_SYSTEM_DESIGN.md → ORGANIZATION_BUILDING_MODULE.md + MANAGEMENT_MODE_ARCHITECTURE.md

审计层
  ├─ CONTEXT.md → ARCHITECTURE.md, copilot-instructions.md
  ├─ .ctx/TIMESTAMPS.md → ROADMAP.md
  ├─ .ctx/SNAPSHOT.md → ROADMAP.md
  ├─ logs/*.md → ROADMAP.md
```

---

## 四、按任务域的快速入口

| 我想做什么 | 先读哪里 | 再读哪里 |
|-----------|---------|---------|
| 了解项目全貌 | README.md | ARCHITECTURE.md |
| 查看待办任务 | ROADMAP.md §C | .ctx/logs/DECISION_LOG.md |
| 查 SOP 流程 | content/SOP/INDEX.md | 对应功能委员 SOP |
| 使用 Agent | content/guides/AGENT_USAGE.md | .github/agents/对应 Agent |
| 提交改进反馈 | content/guides/SOP_WEB_GUIDE.md §E | content/SOP/对应文件 |
| 了解角色分类体系 | content/guides/ROLE_CLASSIFICATION.md | （含可扩展性评估 §六） |
| 查看设计系统规范 | content/guides/DESIGN_SYSTEM.md | src/styles.css |
| 了解 Emoji 使用规范 | content/guides/EMOJI_POLICY.md | ROADMAP.md 钩稽矩阵 |
| 查看日历功能规划 | content/guides/CALENDAR_DESIGN.md | src/calendar.js |
| 查看品牌活动方案 | content/guides/BRAND_ACTIVITY.md | ROADMAP.md |
| 查官方合规 | content/references/官方文件/ | content/SOP/溯源 |
| 查看执行日志 | .ctx/logs/EXECUTION_LOG_INDEX.md | 对应月份日志 |
| 查看 SOP 网页优化 | content/guides/SOP_WEB_GUIDE.md | content/SOP/对应 SOP |
| 了解支委系统设计 | content/guides/COMMISSIONER_SYSTEM_DESIGN.md | ORGANIZATION_BUILDING_MODULE.md |
| 理解架构变更 | ARCHITECTURE.md §八 | .github/SSOT_INDEX.md |

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
| `governance/` | ✅ 已迁移 | 先迁移至 .ctx/，后整合至 ROADMAP.md |
| `backlog/` | ✅ 已迁移 | 先迁移至 .ctx/，后整合至 ROADMAP.md 或删除 |
| `.ctx/scenarios/` | ✅ 已删除 | 全部场景文件已评估删除，目录已清空 |
| `.ctx/COMPLETED_TASKS.md` | ✅ 已删除 | 日志已覆盖，汇总表删除 |
| `.ctx/PENDING_MODIFICATIONS.md` | ✅ 已整合 | 内容迁移至 ROADMAP.md §七 |
| `.ctx/SUSPENDED_ISSUES.md` | ✅ 已整合 | 内容迁移至 ROADMAP.md §八 |
| `.ctx/WATCH_LOG.md` | ✅ 已删除 | 全部已解决，验证后删除 |
| `README.md` | ✅ 已定稿 | Phase 1-4 完成后最终编辑 |
| `content/guides/AGENT_USAGE.md` | ✅ 已更新 | 已更新为 10-Agent 模型 |
| `content/guides/DOCUMENTATION_MAP.md` | ✅ 活跃 | 本文档 |
| `.ctx/CONTEXT.md` | ✅ 活跃 | AI 快速同步入口（融合原 AI_CONTEXT + REVIEW_STATE） |
| `.ctx/AI_CONTEXT.md` | ✅ 已融合 | 内容迁移至 CONTEXT.md |
| `.ctx/REVIEW_STATE.md` | ✅ 已融合 | 内容迁移至 CONTEXT.md |
| `.ctx/SNAPSHOT_v1.3/v2.0/v2.1` | ✅ 已归档 | 旧快照删除，新 v3.0 生成 |
