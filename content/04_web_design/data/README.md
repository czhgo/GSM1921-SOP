---
title: "数据模型与数据流目录索引（04/data/）"
type: index
role: "[工程师]+[AI]"
last_updated: 2026-10-24
status: active
---

# 数据模型与数据流目录索引（04/data/）

> 目录定位见 [DOC_MAP.md §五 目录作用表](../../03_doc_system/DOC_MAP.md#五目录作用表2026-10-24-立)。

## 作用

本目录回答**「系统有哪些数据、每类数据的字段是什么、数据如何产生与流动」**，是数据侧的设计权威入口。

## 不负责什么

- 不写视觉、组件与点击落点——归 [DESIGN_SYSTEM.md](../design-system/DESIGN_SYSTEM.md)。
- 不写角色权限矩阵——归 [SYSTEM_ROLE_PERMISSION.md](../../02_institution/SYSTEM_ROLE_PERMISSION.md)。
- 不写部署形态与登录门控——归 [DEPLOYMENT_GUIDE.md](../deploy/DEPLOYMENT_GUIDE.md)。
- 不写代码实现——`docs/src/` 与 `server/` 是子本。

## 文件清单

| 文件 | 一句话作用 | 权威源？（是/指针） |
|------|-----------|-------------------|
| [DATA_MODEL.md](DATA_MODEL.md) | 20 类数据模型的字段、枚举与表结构，加数据架构总览、参与者数据流与前端持久化边界 | **是**——数据模型与数据流的唯一权威 |
| `README.md` | 本目录索引（边界、与 DESIGN_SYSTEM 的分工、维护规则） | 指针 → `DATA_MODEL.md` |

## 权威源与派生

- **权威源**：`DATA_MODEL.md` 一份承全部。字段定义查 §2.x，数据如何产生、聚合、持久化查 §1.x / §3.x / §4.x。
- **与 `DESIGN_SYSTEM` 的关系**：两者**分工不重叠**——`DESIGN_SYSTEM.md` 是视觉与组件权威（色彩、排版、组件规范、字段外壳、点击落点），`DATA_MODEL.md` 是数据权威（实体、字段、枚举、数据流）。同一控件「长什么样」看 DESIGN_SYSTEM，「存什么、怎么流」看 DATA_MODEL；冲突时各按本域权威判，不互相改写。
- **派生**：`docs/src/core/domain/domain.js` 的类型注释、`docs/src/data/*` 的适配器与 `server/db.js` 的表结构是实现子本；权限简表是 `SYSTEM_ROLE_PERMISSION.md` 的指针，不另立口径。

## 知识流向

`02_institution/` 的制度与 SOP → 抽象为实体、字段与状态枚举 → 在 `DATA_MODEL.md` 定稿 → 由 `services/`、`routes/`、前端适配器实现 → 测试守卫核对实现与模型一致；字段或流向变更必须回写本文件，**不在代码里先改后补文档**。

## 是否保留原始材料

不保留。字段讨论过程与评审记录在 `.ctx/logs/`，数据库实测证据在 `.ctx/evidence/`；本目录只存定稿的模型与流。

## 维护触发器

- 新增、删除或重命名数据模型、字段、枚举或表结构；
- 数据流、持久化键或适配器边界变化；
- `DESIGN_SYSTEM` 的字段外壳口径变化导致「视觉 ↔ 数据」边界需要重述；
- `SYSTEM_ROLE_PERMISSION.md` 的权限模型变化。
