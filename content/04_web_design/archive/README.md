---
title: "已归档设计档案索引（archive/）"
type: index
role: "[工程师]+[AI]"
last_updated: "2026-09-03"
status: active
related_files: [../evolution/DOC_SLIM_DESIGN.md, ../README.md]
---

# 已归档设计档案索引

> **定位：** 已验收达成、或与现行权威重叠而停更的设计文档统一归入本目录（书记 2026-09-03 批准，见 [evolution/DOC_SLIM_DESIGN.md](../evolution/DOC_SLIM_DESIGN.md) 批次 1）。归档文件在正文标题下标注「已归档 YYYY-MM-DD，历史结论仍可读」——历史结论保留可读，但不承担现行权威；现行问题一律查下表「替代权威指向」。
> **链接说明：** 本目录文件参与 link-integrity 全量校验；仓库内引用已全部改指本目录路径（原路径不再有效）。

## 归档清单

| 文件 | 原路径 | 迁入日期 | 归档原因 | 替代权威指向 |
|------|--------|---------|---------|-------------|
| [ROLE_SSOT_DESIGN.md](ROLE_SSOT_DESIGN.md) | `content/04_web_design/evolution/ROLE_SSOT_DESIGN.md` | 2026-09-03 | S1~S10 已全部验收达成（见正文 §4 迁移路径与 §5 验收标准）；角色权限单一事实源已落入内容层与代码 | [ROLE_CLASSIFICATION.md](../../02_institution/ROLE_CLASSIFICATION.md) §9a0 角色键全表 / §9b·§9c 权限矩阵（内容层业务权威）+ 代码 `docs/src/core/constants.js` `ROLE_KEYS` |
| [MODULE_UI_DESIGN.md](MODULE_UI_DESIGN.md) | `content/04_web_design/module/MODULE_UI_DESIGN.md` | 2026-09-03 | 与 SOP_WEB / COMPONENT_SPEC 重叠且停更 | [COMPONENT_SPEC.md](../design-system/COMPONENT_SPEC.md)（组件规范）+ [SOP_WEB.md](../module/SOP_WEB.md)（SOP-系统联动方法论）+ 代码实现 `docs/src/components/calendar.js` 等 |

> 归档原则（DOC_SLIM_DESIGN 批次 1）：删除/归档同主题的单一权威载体原则——被归档文件的独有结论已在替代权威中留存，或已验收达成不再需要维护；如需查阅历史论证过程，直接读归档文件正文。
