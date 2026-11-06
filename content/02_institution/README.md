---
title: "制度层索引——支部发展和管理的制度"
type: index
role: "[用户]+[工程师]+[AI]"
last_updated: 2026-10-24
status: active
---

# 制度层索引——支部发展和管理的制度

> 目录定位见 [DOC_MAP.md §五 目录作用表](../03_doc_system/DOC_MAP.md#五目录作用表2026-10-24-立)。

## 作用

本目录存放**知识类型 2：支部发展和管理的制度**，回答「支部如何运作、角色如何分工、各委员按什么 SOP 办事」。

## 不负责什么

- 不写战略与支书论断——归 `01_strategy/`。
- 不写系统设计、数据模型与页面实现——归 `04_web_design/`、`docs/`。
- 不写文件受众分类（`[用户]` / `[工程师]` / `[AI]`）——已归 `03_doc_system/OPERATIONS_GUIDE.md` §24–§31。
- 不存原始会议材料与上级文件——原文在 `01_strategy/references/`。

## 文件清单

| 文件 | 一句话作用 | 权威源？（是/指针） |
|------|-----------|-------------------|
| [COMMISSIONER_DUTY_FRAMEWORK.md](COMMISSIONER_DUTY_FRAMEWORK.md) | 支部组织与委员体系：组织形态、委员职能、党小组交互、工作组与专班、扁平化设计与审批流程 | **是**——支部组织与角色分工的唯一权威 |
| [SYSTEM_ROLE_PERMISSION.md](SYSTEM_ROLE_PERMISSION.md) | 系统角色权限矩阵：角色键全表、权限矩阵与授权链（键级口径） | **是**——系统角色权限的唯一权威（逐操作位视图见 COMMISSIONER §C） |
| [CASES.md](CASES.md) | 制度域判例：每条记场景、结论、边界、对应规范节号与证据指针 | 否——判例不产生规范效力，规范仍以权限矩阵与委员体系为准 |
| [sop/README.md](sop/README.md) | 各委员与党小组组长的操作规程入口（六份 SOP ＋ INDEX） | 指针 → `sop/INDEX.md`（导航与共享术语）＋ 各 SOP 母本 |
| `README.md` | 本层索引（回答什么问题、边界、维护规则） | 指针 → 上述正文与 DOC_MAP |

## 权威源与派生

- **权威源**：`SYSTEM_ROLE_PERMISSION.md` 管「谁能做什么」（代码键级权威）；`COMMISSIONER_DUTY_FRAMEWORK.md` 管「组织怎么设、委员怎么分工」；`sop/` 下六份 SOP 是各角色操作的母本。
- **派生/档案**：本 README 是索引；`CASES.md` 是判例档案（无规范效力）；`docs/` 中的角色键与权限实现是子本，冲突时以本目录为准。
- **跨目录引用**：系统实现回链 [ARCHITECTURE.md §十一](../03_doc_system/ARCHITECTURE.md) 与 [DATA_MODEL.md](../04_web_design/data/DATA_MODEL.md)；战略依据回链 `01_strategy/`。

## 知识流向

`01_strategy/` 的战略路线 → 在本目录沉淀为组织设计、权限矩阵与 SOP → 派生出系统角色、页面权限与工作台流程（`04_web_design/`、`docs/`）→ 实践中出现的争议与边界 → 记入 `CASES.md`（只记判例，不改规范）。

## 是否保留原始材料

不保留。上级文件与历史会议原文在 `01_strategy/references/`；评议与实测证据在 `.ctx/logs/`、`.ctx/evidence/`。本目录只存加工后的制度结论与判例。

## 维护触发器

- 新增、删除或重命名本层文件或 `sop/` 下任一 SOP；
- 角色键、权限矩阵或组织分工发生变更（权威源变更）；
- 新增判例，或判例对应的规范节号调整；
- [DOC_MAP.md §五 目录作用表](../03_doc_system/DOC_MAP.md#五目录作用表2026-10-24-立) 中本目录职责调整。
