---
title: "页面与模块设计目录索引（04/module/）"
type: index
role: "[工程师]+[AI]"
last_updated: 2026-10-24
status: active
---

# 页面与模块设计目录索引（04/module/）

> 目录定位见 [DOC_MAP.md §五 目录作用表](../../03_doc_system/DOC_MAP.md#五目录作用表2026-10-24-立)。

## 作用

本目录回答**「某个页面或模块为什么这样设计、SOP 文本如何落到系统」**，存放模块设计文档与 SOP-系统联动方法。

## 不负责什么

- 不写整体视觉规范（色彩、组件、动效、点击落点）——归 [DESIGN_SYSTEM.md](../design-system/DESIGN_SYSTEM.md)。
- 不写数据模型与字段——归 [DATA_MODEL.md](../data/DATA_MODEL.md)。
- 不写 SOP 正文与权限矩阵——归 `../../02_institution/`。
- 不写代码实现清单——`docs/src/` 是子本。

## 文件清单

| 文件 | 一句话作用 | 权威源？（是/指针） |
|------|-----------|-------------------|
| [SOP_WEBSITE_GUIDE.md](SOP_WEBSITE_GUIDE.md) | SOP 文本与系统的联动方法论：问题诊断、写法规范、映射规则与优化提案机制 | **是**——SOP 与系统双向修改的唯一权威 |
| [ABOUT_PAGE_DESIGN.md](ABOUT_PAGE_DESIGN.md) | About 页设计系统：叙事册风、超参数设定原则、防风格疲劳与无竖线红线 | **是**——About 页超参数设定的权威；整体视觉仍服从 `DESIGN_SYSTEM` |
| [MODULE_UI_DESIGN.md](MODULE_UI_DESIGN.md) | 「党建」Tab 分组与日历功能模块的界面设计（已落地） | 否——设计论证档案；现行规范为 `DESIGN_SYSTEM` §四 与 `SOP_WEBSITE_GUIDE` |
| [AGENDA_AND_REFERENCE_DESIGN.md](AGENDA_AND_REFERENCE_DESIGN.md) | 会议议程与资料查询的联动设计：会前草案关联、会后少重复录入 | 否——设计论证档案（状态以文件头 `status` 为准）；现行模型与行为以 [DATA_MODEL.md](../data/DATA_MODEL.md) 和服务层实现为准 |
| `README.md` | 本目录索引（边界、与 DESIGN_SYSTEM 的关系、维护规则） | 指针 → 上述文件 |

## 权威源与派生

- **权威源**：`SOP_WEBSITE_GUIDE.md`（SOP ↔ 系统的方法）与 `ABOUT_PAGE_DESIGN.md`（About 页超参数）在各自主题上生效；整体视觉、组件与点击落点仍以 [DESIGN_SYSTEM.md](../design-system/DESIGN_SYSTEM.md) 为唯一权威。
- **档案**：`MODULE_UI_DESIGN.md` 与 `AGENDA_AND_REFERENCE_DESIGN.md` 已落地或已给出结论，保留「为什么」；其规范部分回 `DESIGN_SYSTEM` / `DATA_MODEL`，实现以代码为准。
- **与 DESIGN_SYSTEM 的边界**：本目录可以提出某个模块的**局部**设计口径（如 About 页超参数）；一旦与 DESIGN_SYSTEM 的全局条目冲突，以 DESIGN_SYSTEM 为准并回写本目录。

## 知识流向

`02_institution/sop/` 的流程文本 + 页面设计问题 → 在本目录形成模块设计或 SOP 联动方法 → 落为实现（`docs/src/entries/`、`components/`）→ 落地后文档转档案，规范条目回 `DESIGN_SYSTEM` / `DATA_MODEL`；SOP 侧变更按 `SOP_WEBSITE_GUIDE` 双向同步。

## 是否保留原始材料

不保留。设计截图与对比读数在 `.ctx/evidence/`，评审过程在 `.ctx/logs/`；本目录只存设计结论与论证。

## 维护触发器

- 新增、删除或重命名本目录文件；
- 某模块文档状态变化（draft → landed → 论证档案）；
- `SOP_WEBSITE_GUIDE` 的联动规则变化，或 `02_institution/sop/` 的流程变更；
- `DESIGN_SYSTEM` / `DATA_MODEL` 的权威条目变化导致本目录引用失效。
