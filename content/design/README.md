---
title: "设计理念索引"
type: index
role: "[工程师]+[AI]"
last_updated: "2026-07-14"
status: active
---

# 设计理念索引

> 本目录存放项目的**设计理念文档**——回答"为什么这样设计"和"应该是什么样子"。
> 受众：[工程师]（系统维护者、开发者）
> 定位：工程师视角的设计层，包含架构设计与功能设计

---

## 一、架构设计

> 定义系统模块的功能边界、数据模型和交互机制。

| 文件 | 一句话说明 | 权威源 |
|------|-----------|--------|
| [DATA_ARCHITECTURE.md](DATA_ARCHITECTURE.md) | 数据架构设计：数据模型+数据流+登录系统+品牌属性 | **唯一权威**——数据模型、数据流、登录系统与品牌属性定义 |

---

## 二、功能设计

> 定义具体功能的设计方案，包含"为什么这样设计"和"应该是什么样子"。

| 文件 | 一句话说明 | 权威源 |
|------|-----------|--------|
| [COMMISSIONER_FRAMEWORK.md](../strategy/COMMISSIONER_FRAMEWORK.md) | 三委员党务管理职能 + 党小组交互 + 专班设计 + §审批流程规范 | **唯一权威**——委员系统、专班与审批流程 |
| [MODULE_UI_DESIGN.md](MODULE_UI_DESIGN.md) | 模块界面设计：党务管理模块界面+日历功能模块 | **唯一权威**——党务管理模块与日历功能界面设计 |
| [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md) | 哑光扁平化前端设计语言，五大核心原则 | **唯一权威**——前端视觉规范 |

---

## 与 CLAUDE.md 的关系

CLAUDE.md 甲部 H8（核心理论基石）仅保留**核心原则与判例**，详细设计文档全部归档于本目录。具体对应关系：

| CLAUDE.md 章节 | 对应设计文件 |
|----------------|----------------|
| H8.1 党建与党务工作理论 | DATA_ARCHITECTURE.md + COMMISSIONER_FRAMEWORK.md |
| H8.2 差异化视图规范 | DATA_ARCHITECTURE.md + MODULE_UI_DESIGN.md |
| H8.3 专班 | COMMISSIONER_FRAMEWORK.md |
| H8.4 SOP<->系统双向修改 | governance/SOP_WEB.md |
| H8.5 赋权关系链 | COMMISSIONER_FRAMEWORK.md |
| H8.6 扁平化设计 | strategy/FLAT_DESIGN.md |

## 与其他目录的关系

- **战略路线**：设计理念的上级指导，见 `content/strategy/`
- **执行流程**：设计理念的落地操作，见 `content/sop/`
- **系统治理**：文档/术语/角色等治理规范，见 `content/governance/`
