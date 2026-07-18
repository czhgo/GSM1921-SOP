---
title: "系统治理索引"
type: index
role: "[工程师]+[AI]"
last_updated: "2026-07-12"
status: active
---

# 系统治理索引

> 本目录存放项目的**系统治理规范**——回答"项目如何被治理"的操作规范。
> 受众：[工程师]（系统维护者、开发者）
> 定位：工程师视角的治理层，包含术语、角色、文档、流程等治理规范
> 注意：本目录是"系统治理"（项目文档/代码治理），不是"组织治理"（党支部组织设计）。组织治理设计见 `content/design/`

---

## 文件清单

### 一、使用规范与角色

| 文件 | 一句话说明 | 权威源 |
|------|-----------|--------|
| [USAGE_POLICY.md](USAGE_POLICY.md) | P0 强制执行的使用规范，含术语标准（§一）+ Emoji 边界（§二） | **唯一权威**——术语/Emoji 变更触发一改具改（2026-07-12 合并自 TERMINOLOGY.md + EMOJI_POLICY.md） |
| [ROLE_CLASSIFICATION.md](ROLE_CLASSIFICATION.md) | [用户]/[工程师]/[AI] 三类文件角色标记体系 | **唯一权威**——角色分类的唯一来源 |

### 二、文档与运行标准

| 文件 | 一句话说明 | 权威源 |
|------|-----------|--------|
| [DOC_MAP.md](DOC_MAP.md) | 按角色分层、权威性排序的全局文档导航 | **唯一权威**——文档权威层级的详细版 |
| [OPERATIONS_GUIDE.md](OPERATIONS_GUIDE.md) | 运行标准详细内容（YAML规范/术语/角色/编码/文档关系/编号/文档层级/三类文件角色/一致性检查规范/§15 周期性任务） | **唯一权威**——CLAUDE.md冷层外移内容（含 §7.4 8 套分层体系一致性检查规范、§15 原 RECURRING_TASKS.md 合并） |
| [SERVICE_CATALOG.md](SERVICE_CATALOG.md) | 统一服务目录：系统所有服务功能及其角色权限映射 | **唯一权威**——功能盘点和权限设计的统一参考（2026-07-11 从 design/ 迁入） |
| [SOP_WEB.md](SOP_WEB.md) | SOP-系统联动方法论（系统架构设计、SOP-系统映射） | **唯一权威**——SOP 与系统的双向修改指南（2026-07-12 从 design/ 迁入） |

### 三、陷阱与同步

| 文件 | 一句话说明 | 权威源 |
|------|-----------|--------|
| [KNOWN_PITFALLS.md](KNOWN_PITFALLS.md) | 已知陷阱与上下文丢失教训（判例级） | **唯一权威**——AI防重犯参考 |

> **注**：吸收外部输入操作流程已并入 [OPERATIONS_GUIDE.md §14](OPERATIONS_GUIDE.md)；周期性任务已并入 [OPERATIONS_GUIDE.md §15](OPERATIONS_GUIDE.md)；原 TERMINOLOGY.md + EMOJI_POLICY.md 已合并为 [USAGE_POLICY.md](USAGE_POLICY.md)。

---

## 与 CLAUDE.md 的关系

CLAUDE.md 甲部 H9（运行标准索引）外移至本目录，具体对应关系：

| CLAUDE.md 章节 | 对应治理文件 |
|----------------|----------------|
| H2.1 一改具改 | OPERATIONS_GUIDE.md §14 |
| H7 已知陷阱 | KNOWN_PITFALLS.md |
| H9 运行标准 | OPERATIONS_GUIDE.md（含 YAML/术语/角色/编码/文档关系/编号/文档层级/三类文件角色） |

## 与其他目录的关系

- **战略路线**：系统治理的上级指导，见 `content/strategy/`
- **设计理念**：被治理的设计文档，见 `content/design/`
- **执行流程**：被治理的执行文档，见 `content/sop/`
