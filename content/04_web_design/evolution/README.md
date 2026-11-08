---
title: "设计演进入口（04/evolution/）"
type: index
role: "[工程师]+[AI]"
last_updated: 2026-11-08
status: active
---

# 设计演进入口（04/evolution/）

> 目录定位见 [DOC_MAP.md §五 目录作用表](../../03_doc_system/DOC_MAP.md#五目录作用表2026-10-24-立)；载体分职见 [OPERATIONS_GUIDE.md §32](../../03_doc_system/OPERATIONS_GUIDE.md)。

## 作用

本目录回答**「系统往哪里演进、哪些设计已落地成档案」**：活跃愿景留在本层，已落地的论证与设计稿归档到 `archive/`。

## 不负责什么

- 不写现行视觉与组件条文——归 [DESIGN_SYSTEM.md](../design-system/DESIGN_SYSTEM.md)。
- 不写数据模型与字段定义——归 [DATA_MODEL.md](../data/DATA_MODEL.md)。
- 不写实现必须遵守的结构 / 版本 / 验收——归 [contracts/README.md](../contracts/README.md)。
- 不写工程评分与改造行动线——归 [`.ctx/ENGINEERING_ASSESSMENT.md`](../../../.ctx/ENGINEERING_ASSESSMENT.md)。
- 不写逐批过程——归 `.ctx/logs/`。

## 文件清单

### 活跃愿景（本层）

| 文件 | 一句话作用 | 权威源？（是/指针） |
|---|---|---|
| [ARCHITECTURE_EVOLUTION.md](ARCHITECTURE_EVOLUTION.md) | 架构演进：组件化评估的历史结论、工作流块拖拽编排远期愿景、性能与交付形态、§十 多支部同实例与党委内容域（Phase 1–4，开关保持关闭） | **是**——演进方向与阶段设计的权威；现行工程方向判断仍以 `.ctx/ENGINEERING_ASSESSMENT.md` 为准 |
| `README.md` | 本目录索引（活跃愿景、archive 索引、旧路径重定向） | 指针 → 上述文件与各权威源 |

### 归档（`archive/`）

| 文件 | 一句话作用 | 状态与权威 |
|---|---|---|
| [archive/BRANCH_WORK_MAP.md](archive/BRANCH_WORK_MAP.md) | L4 支部工作地图设计稿：平铺模块清单与按人双视图 | **landed 2026-09-04**——已落地档案；权威 = 代码 `work-map-tab.js` / `workforce-panel.js` ＋ [DS_03_COMPONENTS.md](../design-system/DS_03_COMPONENTS.md) |
| [archive/ROLE_PERMISSION_DESIGN.md](archive/ROLE_PERMISSION_DESIGN.md) | 权限功能合一收敛设计：角色权限从四处声明收敛到单一事实源 | **landed 2026-09-03**——已落地档案；权威 = [SYSTEM_ROLE_PERMISSION.md](../../02_institution/SYSTEM_ROLE_PERMISSION.md) §9a0/§9b/§9c ＋ 代码 `ROLE_KEYS` |
| [archive/DESIGN_METHODOLOGY.md](archive/DESIGN_METHODOLOGY.md) | 设计理念与方法论承接：系统 / 工作台 / 前端实现方法论与判例、打卡化底线 | **论证档案**——只承载「为什么 / 反例 / 生效条件」；规范权威 = [DESIGN_SYSTEM.md](../design-system/DESIGN_SYSTEM.md) / [DATA_MODEL.md](../data/DATA_MODEL.md) / [SOP_WEBSITE_GUIDE.md](../module/SOP_WEBSITE_GUIDE.md) |

## 权威源与派生

- **活跃愿景只有一份**：`ARCHITECTURE_EVOLUTION.md`；其 §八 与 §十 是仍在生效的设计，实施前不打开 `ALLOW_MULTI_BRANCH` 等开关。
- **archive 只留论证**：三份归档件不再承担现行权威，结论已落到代码与对应规范；引用它们时须同时给出权威源。
- **契约不在本目录**：需「实现必须遵守」的结构与验收，一律进 [contracts/](../contracts/)。
- **与 DESIGN_SYSTEM 的关系**：视觉、组件、动效与点击落点以 [DESIGN_SYSTEM.md](../design-system/DESIGN_SYSTEM.md) 为准；本目录与 archive 中「看起来像规范」的表述，未进 DESIGN_SYSTEM 或 DATA_MODEL 的只作论证参考。

## 知识流向

设计讨论、实现尝试与评审意见 → 在本目录留下「为什么选 A / 为什么不选 B / 何时失效」→ 定稿后规范进 DESIGN_SYSTEM / DATA_MODEL / SOP_WEBSITE_GUIDE，需强制执行的进 `contracts/` → 已落地文档移入 `archive/` 并标 landed；工程方向判断移到 `.ctx/ENGINEERING_ASSESSMENT.md`。

## 是否保留原始材料

不保留。设计论证本身即档案；对比截图、实测读数在 `.ctx/evidence/`，逐批决策在 `.ctx/logs/`。

## 旧路径重定向

| 旧路径 | 现路径 |
|---|---|
| `content/04_web_design/evolution/WORKFLOW_BLOCK_CONTRACT.md` | `content/04_web_design/contracts/WORKFLOW_BLOCK_CONTRACT.md` |
| `content/04_web_design/evolution/PARTY_COMMITTEE_DESIGN.md` | `content/04_web_design/contracts/PARTY_COMMITTEE_DESIGN.md` |
| `content/04_web_design/evolution/PUBLIC_ENTRANCE.md` | `content/04_web_design/module/PUBLIC_ENTRANCE.md` |
| `content/04_web_design/evolution/BRANCH_WORK_MAP.md` | `content/04_web_design/evolution/archive/BRANCH_WORK_MAP.md` |
| `content/04_web_design/evolution/ROLE_PERMISSION_DESIGN.md` | `content/04_web_design/evolution/archive/ROLE_PERMISSION_DESIGN.md` |
| `content/04_web_design/evolution/DESIGN_METHODOLOGY.md` | `content/04_web_design/evolution/archive/DESIGN_METHODOLOGY.md` |

> 历史日志与证据（`.ctx/logs/**`、`.ctx/evidence/**`）里的旧路径按「历史不可变」保留，不改写。

## 维护触发器

- 新增、删除或重命名本目录或 `archive/` 文件；
- 某文档状态变化（active → landed → 论证档案，或契约升级）；
- 其权威源迁移（如规范并入 DESIGN_SYSTEM、评估迁入 `.ctx/`）；
- 工作流块契约或工作地图的设计口径变化。
