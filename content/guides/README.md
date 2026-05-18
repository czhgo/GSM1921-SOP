---
title: "设计理念与操作规范索引"
type: index
role: "[人机]"
owner: "支委会"
last_updated: "2026-05-16"
status: active
---

# Guides 索引

> 本目录存放项目的**设计理念文档与操作规范**。
> 不管对应功能有没有完成，设计理念始终存在，作为知识留存（CLAUDE.md H3.3）。

---

## 一、治理规范（Governance）

> 定义项目必须遵守的规则、术语和角色边界。

| 文件 | 一句话说明 | 权威源 |
|------|-----------|--------|
| [TERMINOLOGY.md](governance/TERMINOLOGY.md) | P0 强制执行的术语标准，含废弃术语对照表 | **唯一权威**——术语变更触发一改具改 |
| [ROLE_CLASSIFICATION.md](governance/ROLE_CLASSIFICATION.md) | [人]/[人机]/[AI] 三类文件角色标记体系 | **唯一权威**——角色分类的唯一来源 |
| [EMOJI_POLICY.md](governance/EMOJI_POLICY.md) | Emoji 使用边界：网页零 Emoji，文档有限度使用 | **唯一权威** |
| [DOC_MAP.md](governance/DOC_MAP.md) | 按角色分层、权威性排序的全局文档导航 | **唯一权威**——文档权威层级的详细版 |
| [AGENT_USAGE.md](governance/AGENT_USAGE.md) | 10 Agent 治理集群注册表与任务域委派链路 | **唯一权威**——Agent 使用的唯一来源 |
| [AGENT_HANDBOOK.md](governance/AGENT_HANDBOOK.md) | Agent 操作手册：按钮驱动、可审计、低阻尼的工业化流水线 | **唯一权威**——Agent 操作流程 |
| [RECURRING_TASKS.md](governance/RECURRING_TASKS.md) | 周/月/季/学期级周期性任务自动唤醒机制 | **唯一权威** |

---

## 二、架构设计（Architecture）

> 定义系统模块的功能边界、数据模型和交互机制。

| 文件 | 一句话说明 | 权威源 |
|------|-----------|--------|
| [ORG_BUILDING.md](architecture/ORG_BUILDING.md) | 党务管理独立模块的功能边界与界面布局 | **唯一权威**——党务管理模块架构 |
| [DATA.md](architecture/DATA.md) | 全栈数据分类（10类）、字段规范与权限控制策略 | **唯一权威**——数据模型定义 |
| [MANAGEMENT_MODE.md](architecture/MANAGEMENT_MODE.md) | 三级管理模式权限矩阵与双场景适配 | **唯一权威**——权限矩阵定义 |

---

## 三、功能设计（Design）

> 定义具体功能的设计方案，包含"为什么这样设计"和"应该是什么样子"。

| 文件 | 一句话说明 | 权威源 |
|------|-----------|--------|
| [COMMISSIONER_SYSTEM.md](design/COMMISSIONER_SYSTEM.md) | 三委员党务管理职能 + 党小组交互 + 专班制设计 | **唯一权威**——委员系统与专班制 |
| [SOP_WEB.md](design/SOP_WEB.md) | SOP-网页联动方法论，含最先进设计思路 | **唯一权威**——SOP 与网页的双向修改指南 |
| [DESIGN_SYSTEM.md](design/DESIGN_SYSTEM.md) | 哑光扁平化前端设计语言，五大核心原则 | **唯一权威**——前端视觉规范 |
| [CALENDAR.md](design/CALENDAR.md) | 日历多视图切换架构与视图范围限定规则 | **唯一权威**——日历功能设计 |
| [BRAND_ACTIVITY.md](design/BRAND_ACTIVITY.md) | 品牌活动四属性与四阶段生命周期（当前搁置） | **唯一权威**——品牌活动理念 |

---

## 与 CLAUDE.md 的关系

CLAUDE.md 甲部 H2（核心理论基石）仅保留**核心原则与判例**，详细设计文档全部归档于本目录。具体对应关系：

| CLAUDE.md 章节 | 对应 Guide 文件 |
|----------------|----------------|
| H2.1 双域管理理论 | TERMINOLOGY.md + COMMISSIONER_SYSTEM.md |
| H2.2 差异化视图规范 | MANAGEMENT_MODE.md + CALENDAR.md |
| H2.3 专班制 | COMMISSIONER_SYSTEM.md |
| H2.4 SOP<->网页双向修改 | SOP_WEB.md |
| H4.3 术语规范 | TERMINOLOGY.md |
| H4.4 角色三分类 | ROLE_CLASSIFICATION.md |
