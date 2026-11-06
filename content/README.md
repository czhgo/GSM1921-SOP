---
title: "内容中心（content/）"
type: index
role: "[用户]+[工程师]+[AI]"
last_updated: 2026-10-24
status: active
---

# 内容中心（content/）

> **全仓库文档路由**：本目录在全站的定位与目录分工，见 [DOC_MAP.md §五 目录作用表](03_doc_system/DOC_MAP.md#五目录作用表2026-10-24-立)。

## 作用

本目录是五类知识类型的**权威源总目录**（01–05 ＋ insights），回答「一条结论该写进哪一类、以谁为准」。

## 不负责什么

- 不写页面与后端实现——代码是子本，在 `docs/` 与 `server/`。
- 不存逐批过程、截图与临时审稿——过程在 `.ctx/logs/`，证据在 `.ctx/evidence/`。
- 不承担全仓库导航——总导航在 `03_doc_system/DOC_MAP.md`，本 README 只做本层索引。

## 文件清单

| 文件 | 一句话作用 | 权威源？（是/指针） |
|------|-----------|-------------------|
| [01_strategy/README.md](01_strategy/README.md) | 支部战略、支书论断与发展路径 | 指针 → `01_strategy/SECRETARY_DIRECTIVES.md` / `DEVELOPMENT_PATH.md` |
| [02_institution/README.md](02_institution/README.md) | 支部组织、角色权限、SOP 与制度判例 | 指针 → `02_institution/SYSTEM_ROLE_PERMISSION.md` / `COMMISSIONER_DUTY_FRAMEWORK.md` / `sop/INDEX.md` |
| [03_doc_system/README.md](03_doc_system/README.md) | 文档治理、运行规范、导航与判例总索引 | 指针 → `03_doc_system/OPERATIONS_GUIDE.md` / `ARCHITECTURE.md` / `DOC_MAP.md` |
| [04_web_design/README.md](04_web_design/README.md) | 网站设计、数据模型、部署与设计演进 | 指针 → `04_web_design/design-system/DESIGN_SYSTEM.md` / `data/DATA_MODEL.md` |
| [05_ai_coding/README.md](05_ai_coding/README.md) | AI 协作方法论五个分篇与 ai-coding 判例 | 指针 → `05_ai_coding/` 五个分篇 |
| [insights/README.md](insights/README.md) | 面向人的跨层经验串讲与学习入口 | 否（不承担规范，回链 03 / 04 / 05） |
| `README.md` | 本层索引（各知识类型的入口与边界） | 指针 → 各子目录 README 与 DOC_MAP |

## 权威源与派生

- **权威源**：各层正文文件——战略 `01_strategy/`、制度 `02_institution/`、文档治理 `03_doc_system/`、设计与数据 `04_web_design/`、AI 方法 `05_ai_coding/` 的五个分篇。
- **派生/索引**：本 README、各层 `README.md`、[DOC_MAP.md](03_doc_system/DOC_MAP.md)（全仓库导航）、[CASES_INDEX.md](03_doc_system/CASES_INDEX.md)（判例总索引）、[insights/](insights/)（学习入口）。
- **母本子本**：系统逻辑、数据模型与 UI 行为必须从制度与设计母本推导（母本子本关系注册见 [ARCHITECTURE.md §十](03_doc_system/ARCHITECTURE.md#十单一事实源注册表与权威源治理)）；`docs/` 代码与 `server/` 实现是子本，冲突时以 `content/` 为准。

## 知识流向

`.ctx/logs/` 与 `.ctx/evidence/` 的一手材料 → 过 [`.ctx/README.md §三`](../.ctx/README.md) 三问（可复用 / 有结论 / 可布尔化）→ 按知识类型落位：规范进 01–05 对应正文、判例进各域 `CASES.md`、索引进各层 `README.md` 与 `DOC_MAP` / `CASES_INDEX` → 代码与页面再按母本落地。

## 是否保留原始材料

- **保留**：仅 `01_strategy/references/`（合规文件、历史会议材料、建设探索原文）。
- **不保留**：其余目录只存加工后的结论；原始证据放 `.ctx/evidence/YYYY-MM-DD/`，执行与决策过程放 `.ctx/logs/`。

## 维护触发器

- 新增、删除或重命名任一知识类型目录，或某层权威源文件发生迁移；
- [DOC_MAP.md §五 目录作用表](03_doc_system/DOC_MAP.md#五目录作用表2026-10-24-立) 或 [OPERATIONS_GUIDE.md §32](03_doc_system/OPERATIONS_GUIDE.md) 的分职规则变更；
- 某条结论的归属类别改变（规范 ↔ 判例 ↔ 索引）。
