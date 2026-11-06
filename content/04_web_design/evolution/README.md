---
title: "设计演进入口（04/evolution/）"
type: index
role: "[工程师]+[AI]"
last_updated: 2026-10-24
status: active
---

# 设计演进入口（04/evolution/）

> 目录定位见 [DOC_MAP.md §五 目录作用表](../../03_doc_system/DOC_MAP.md#五目录作用表2026-10-24-立)。

## 作用

本目录回答**「当时为什么这样设计、哪些已落地、哪些仍是契约或远期愿景」**，存放架构演进、设计论证与仍在生效的少数设计契约。

## 不负责什么

- 不写现行视觉规范正文——视觉以 [DESIGN_SYSTEM.md](../design-system/DESIGN_SYSTEM.md) 为准。
- 不写数据模型与字段定义——归 [DATA_MODEL.md](../data/DATA_MODEL.md)。
- 不写工程评分与改造行动线——归 [`.ctx/ENGINEERING_ASSESSMENT.md`](../../../.ctx/ENGINEERING_ASSESSMENT.md)。
- 不写逐批过程——归 `.ctx/logs/`。

## 文件清单

| 文件 | 一句话作用 | 权威源？（是/指针） |
|------|-----------|-------------------|
| [WORKFLOW_BLOCK_CONTRACT.md](WORKFLOW_BLOCK_CONTRACT.md) | L3 工作流块封装契约：块差异化三维度、契约总则与 manifest 字段定义 | **是**——工作流块封装契约的唯一权威 |
| [BRANCH_WORK_MAP.md](BRANCH_WORK_MAP.md) | L4 支部工作地图设计：平铺模块清单与按人双视图 | **是**——支部工作地图 / 分工载体的设计权威 |
| [PARTY_COMMITTEE_DESIGN.md](PARTY_COMMITTEE_DESIGN.md) | 院系党委后台设计定案：支部多实例两级治理（支部实例＋台账 / 支书任命 / 上报＋下发） | **是**——党委两级治理架构与方向选择 |
| [ROLE_PERMISSION_DESIGN.md](ROLE_PERMISSION_DESIGN.md) | 权限功能合一收敛设计：角色权限从四处声明收敛到单一事实源 | 否——已落地，转设计论证档案；权威为 [SYSTEM_ROLE_PERMISSION.md](../../02_institution/SYSTEM_ROLE_PERMISSION.md) 与代码 `ROLE_KEYS` |
| [DESIGN_METHODOLOGY.md](DESIGN_METHODOLOGY.md) | 设计理念与方法论承接：系统/工作台/前端实现方法论与判例、打卡化底线 | 否——论证档案；规范权威为 [DESIGN_SYSTEM.md](../design-system/DESIGN_SYSTEM.md) / [DATA_MODEL.md](../data/DATA_MODEL.md) / [SOP_WEBSITE_GUIDE.md](../module/SOP_WEBSITE_GUIDE.md) |
| [ARCHITECTURE_EVOLUTION.md](ARCHITECTURE_EVOLUTION.md) | 架构演进：组件化评估的历史结论与工作流块拖拽编排的远期愿景 | 否——历史探索与愿景；现行方向判断以 `.ctx/ENGINEERING_ASSESSMENT.md` 为准 |
| `README.md` | 本目录索引（边界、各文件状态、维护规则） | 指针 → 上述文件与各权威源 |

## 权威源与派生

- **本目录多数是档案**：`DESIGN_METHODOLOGY`、`ARCHITECTURE_EVOLUTION`、`ROLE_PERMISSION_DESIGN` 只承载论证与历史，规范效力归各自权威源。
- **仍生效的契约**：`WORKFLOW_BLOCK_CONTRACT`（块契约）与 `BRANCH_WORK_MAP`（工作地图设计）、`PARTY_COMMITTEE_DESIGN`（党委治理方向）在各自主题上仍是权威。
- **与 `DESIGN_SYSTEM` 的关系**：视觉、组件、动效与点击落点一律以 [DESIGN_SYSTEM.md](../design-system/DESIGN_SYSTEM.md) 为准；本目录任何「看起来像规范」的表述，若未进 DESIGN_SYSTEM 或 DATA_MODEL，只作论证参考。

## 知识流向

设计讨论、实现尝试与评审意见 → 在本目录留下「为什么选 A / 为什么不选 B / 何时失效」→ 定稿后规范进 DESIGN_SYSTEM / DATA_MODEL / SOP_WEBSITE_GUIDE，契约留在本目录 → 已落地文档标记 landed 并降为档案；工程方向判断移到 `.ctx/ENGINEERING_ASSESSMENT.md`。

## 是否保留原始材料

不保留。设计论证本身即档案；对比截图、实测读数在 `.ctx/evidence/`，逐批决策在 `.ctx/logs/`。

## 维护触发器

- 新增、删除或重命名本目录文件；
- 某文档状态变化（draft → landed → 论证档案，或契约升级）；
- 其权威源迁移（如规范并入 DESIGN_SYSTEM、评估迁入 `.ctx/`）；
- 工作流块契约或工作地图的设计口径变化。
