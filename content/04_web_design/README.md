---
title: "网站设计层索引——网站系统的设计想法"
type: index
role: "[工程师]+[AI]"
last_updated: 2026-10-29
status: active
---

# 网站设计层索引——网站系统的设计想法

> **定位：** 本目录存放**知识类型 4：网站系统的设计想法**——回答"网站功能、数据架构、UI 设计"。
> **受众：** [工程师]（系统维护者、开发者）
> **结构：** 2026-08-27（T-286）按主题分子目录分组，各子目录文件间可互相引用；跨组引用使用相对路径（`../组名/`）。
> **归类原则（支书 2026-09-03）：** content 与 spec/台账的边界**不是机械等式**，而是逐份**实时判断**——判断标准：是否承载"为什么这样做、选了哪个方向、模型长什么样"的设计价值。有设计价值（含必要字段模型与行为口径）→ 留 content；纯执行步骤/测试清单/过程台账 → `.trae/specs/`（用后即删）或 `.ctx/logs/`。

---

## 作用

本目录存放**知识类型 4：网站系统的设计想法**，回答「网站功能怎么设、数据长什么样、界面怎么定、怎么部署与对接」。

## 不负责什么

- 不写支部战略、制度与 SOP 正文——归 `01_strategy/`、`02_institution/`。
- 不写 AI 协作方法与测试纪律——归 `05_ai_coding/`。
- 不写代码实现与运行数据——实现是子本，在 `docs/`、`server/`；过程证据在 `.ctx/`。
- 不重复全仓导航——导航见 [DOC_MAP.md](../03_doc_system/DOC_MAP.md)。

## 文件清单

| 文件 | 一句话作用 | 权威源？（是/指针） |
|------|-----------|-------------------|
| [design-system/README.md](design-system/README.md) | 设计系统正文与设计域判例入口 | 指针 → `design-system/DESIGN_SYSTEM.md`（唯一权威） |
| [data/README.md](data/README.md) | 数据模型与数据流入口 | 指针 → `data/DATA_MODEL.md`（唯一权威） |
| [deploy/README.md](deploy/README.md) | 部署路径、认证门控与对外对接入口 | 指针 → `deploy/DEPLOYMENT_GUIDE.md`（唯一权威） |
| [module/README.md](module/README.md) | 页面/模块设计与 SOP-系统联动入口 | 指针 → `module/SOP_WEBSITE_GUIDE.md` / `module/ABOUT_PAGE_DESIGN.md` |
| [evolution/README.md](evolution/README.md) | 设计论证档案、契约与架构演进入口 | 指针 → `evolution/WORKFLOW_BLOCK_CONTRACT.md` / `BRANCH_WORK_MAP.md`；其余为档案 |
| [PRODUCT_IA.md](PRODUCT_IA.md) | 产品 IA 派生索引：逐台逐页签的组 / 渲染入口 / 主对象 / 主操作 / 新落点（当前 62） | **派生索引**——由 `docs/src/capabilities/*` 与 `function-catalog.js` 派生，**不承担规范、禁止手改** |
| [AGENTS.md](AGENTS.md) | 本目录协作说明：进入前读什么、改什么、禁什么、怎么验 | 指针 → 本 README 与 `design-system/DESIGN_SYSTEM.md` |
| `README.md` | 本层索引（回答什么问题、边界、权威源速查） | 指针 → 各子目录 README 与下节速查表 |

## 权威源与派生

- **权威源**：视觉与组件 = [DESIGN_SYSTEM.md](design-system/DESIGN_SYSTEM.md)；数据与字段 = [DATA_MODEL.md](data/DATA_MODEL.md)；部署与对接 = [DEPLOYMENT_GUIDE.md](deploy/DEPLOYMENT_GUIDE.md)；SOP 与系统联动 = [SOP_WEBSITE_GUIDE.md](module/SOP_WEBSITE_GUIDE.md)。
- **派生/档案**：本 README 与各子目录 README 是索引；[PRODUCT_IA.md](PRODUCT_IA.md) 是**派生索引**（页签功能地图，由代码注册表派生，不承担规范、禁止手改）；已落地（landed）的模块与演进文档转为**设计论证档案**，只保留「为什么」，规范正文回各唯一权威源；判例见各域 `CASES.md`。
- **逐文件口径**：见下节「权威源速查」，本节不重复其内容。

---

## 目录结构

| 子目录 | 内容 | 文件 |
|--------|------|------|
| [`design-system/`](design-system/) | 设计系统（视觉/色彩/组件/点击落点） | [DESIGN_SYSTEM.md](design-system/DESIGN_SYSTEM.md)（父索引：哲学 ＋ 编目）· DS_01…DS_05 五编（色彩与主题 / 排版与尺寸 / 组件 / 交互与响应式 / 地图与速查）· [CASES.md](design-system/CASES.md)（设计域判例） |
| [`data/`](data/) | 数据架构（模型/流） | [DATA_MODEL.md](data/DATA_MODEL.md)（数据模型与数据流） · [DATA_SEED_CONTRACT.md](data/DATA_SEED_CONTRACT.md)（种子契约） |
| [`deploy/`](deploy/) | 部署与集成（路径/认证/外部对接） | [DEPLOYMENT_GUIDE.md](deploy/DEPLOYMENT_GUIDE.md)（《部署与对外对接》一份承全部：部署路径 + 对接 + 认证门控 + 微信协同 + 北大对接） · [SERVER_DEPLOY_MANUAL.md](deploy/SERVER_DEPLOY_MANUAL.md)（服务端操作手册） |
| [`module/`](module/) | 页面/模块设计（UI 与 SOP 联动） | [SOP_WEBSITE_GUIDE.md](module/SOP_WEBSITE_GUIDE.md) · [MODULE_UI_DESIGN.md](module/MODULE_UI_DESIGN.md) · [ABOUT_PAGE_DESIGN.md](module/ABOUT_PAGE_DESIGN.md) · [AGENDA_AND_REFERENCE_DESIGN.md](module/AGENDA_AND_REFERENCE_DESIGN.md)（草案） |
| [`evolution/`](evolution/) | 演进与校验（架构演进/契约与画布/党委两级治理/设计方法论承接；工程化评估已迁 `.ctx/ENGINEERING_ASSESSMENT.md`（2026-09-08 迁入、2026-09-09 更名「工程化评估与改造行动线」）） | [ARCHITECTURE_EVOLUTION.md](evolution/ARCHITECTURE_EVOLUTION.md) · [WORKFLOW_BLOCK_CONTRACT.md](evolution/WORKFLOW_BLOCK_CONTRACT.md) · [BRANCH_WORK_MAP.md](evolution/BRANCH_WORK_MAP.md) · [PARTY_COMMITTEE_DESIGN.md](evolution/PARTY_COMMITTEE_DESIGN.md) · [ROLE_PERMISSION_DESIGN.md](evolution/ROLE_PERMISSION_DESIGN.md) · [DESIGN_METHODOLOGY.md](evolution/DESIGN_METHODOLOGY.md) |

---

## 权威源速查

### 状态标注规范（active / draft / landed 语义）

本目录设计稿类文件的 frontmatter `status` 与速查表「权威源」列状态词的语义：

- **active**——现行有效：当前承担该主题权威（速查表常标 **唯一权威**），以此为准；
- **draft**——草案未定稿（速查表标「草案·待实施」）：尚未放行实施，如 [AGENDA_AND_REFERENCE_DESIGN.md](module/AGENDA_AND_REFERENCE_DESIGN.md)；
- **landed / 已落地 YYYY-MM-DD**——设计结论已实现：文档转为**设计论证档案**，不再承担现行权威；现行权威见该行标注（如 MODULE_UI_DESIGN → [DS_03_COMPONENTS.md](design-system/DS_03_COMPONENTS.md) §四 组件规范 + SOP_WEBSITE_GUIDE、AGENDA_AND_REFERENCE_DESIGN → references.js + calendar-tab.js + member-change-panel.js、ROLE_PERMISSION_DESIGN → SYSTEM_ROLE_PERMISSION §9a0/§9b/§9c + 代码 `ROLE_KEYS`）或实现代码（如 BRANCH_WORK_MAP → `work-map-tab.js` + `workforce-panel.js`）；
- **论证档案**——只承载论证（为什么）、反论（为什么不是）、判例与生效条件，规范正文以对应权威源文件为准。

### 数据架构（data/）

| 文件 | 一句话说明 | 权威源 |
|------|-----------|--------|
| [DATA_MODEL.md](data/DATA_MODEL.md) | 数据模型设计：20 类数据模型字段定义 + 写入验证 + 待办/通知派生 + 归档扩展字段；§2.x 数据模型（字段表/枚举/表结构）+ §1.x·§3.x·§4.x 数据流（数据架构总览/参与者数据流/前端数据流：状态管理/持久化/数据源边界/DataAdapter） | **唯一权威**——数据模型与数据流（2026-08-24 拆分自原数据架构总文件，路由文件已删） |

> 引用指引（原数据架构路由壳并入说明）：查"字段定义/数据结构" → DATA_MODEL.md §2.x；查"数据如何产生、流动、聚合 / DataAdapter / 持久化键" → DATA_MODEL.md §1.x·§3.x·§4.x。

### 设计系统（design-system/）

| 文件 | 一句话说明 | 权威源 |
|------|-----------|--------|
| [DESIGN_SYSTEM.md](design-system/DESIGN_SYSTEM.md) | 设计系统父索引（§零 阅读指南 / §一 设计哲学 / 编目索引：我要找什么 → 去哪一编） | **入口**——先在此定位编目，条文在五编 |
| [DS_01_COLOR_AND_THEME.md](design-system/DS_01_COLOR_AND_THEME.md) | 第一编 色彩与主题（§二 色彩系统 / §七 深色模式） | **唯一权威**——颜色怎么选、主题与暗色怎么定 |
| [DS_02_TYPE_AND_SIZE.md](design-system/DS_02_TYPE_AND_SIZE.md) | 第二编 排版与尺寸（§三 排版系统 / §3.4 栅格与容器档） | **唯一权威**——字号、行高、页面多宽、列数多少 |
| [DS_03_COMPONENTS.md](design-system/DS_03_COMPONENTS.md) | 第三编 组件（§四 组件规范 / §4.29–§4.30 / §十二 组件层执行口径 SD-1…SD-54） | **唯一权威**——组件结构与强制形态（守卫指针：`field-shell-guard` / `motion-guard` / `activity-tone-guard` / `lf-bar-structure-guard`） |
| [DS_04_INTERACTION_AND_RESPONSIVE.md](design-system/DS_04_INTERACTION_AND_RESPONSIVE.md) | 第四编 交互与响应式（§五 交互反馈 / §5.8 焦点总则 / §六 响应式） | **唯一权威**——悬停、按下、聚焦怎么表现；窄屏怎么变（守卫指针：`ui-focus-ring` / `ui-control-system-guard`） |
| [DS_05_MAP_AND_REFERENCE.md](design-system/DS_05_MAP_AND_REFERENCE.md) | 第五编 地图与速查（§八 资产 / §九 速查 / §十 点击落点 / §十一 边界） | **唯一权威**——点哪里去哪、速查、边界（守卫指针：`theme-palette-guard`） |

### 部署与集成（deploy/）

| 文件 | 一句话说明 | 权威源 |
|------|-----------|--------|
| [DEPLOYMENT_GUIDE.md](deploy/DEPLOYMENT_GUIDE.md) | 部署与对外对接（系统形态速览 + 四条落地路径与决策矩阵 + 学校/党校对接总叙事与决策矩阵 + 认证与登录门控 + 微信协同与小程序 + 北大党校与智慧党建对接） | **唯一权威**——部署路径决策、对外对接诉求、部署形态/登录态/门控统一模型、小程序侧设计、北大党建系统对接总体设计 |

### 页面/模块设计（module/）

| 文件 | 一句话说明 | 权威源 |
|------|-----------|--------|
| [SOP_WEBSITE_GUIDE.md](module/SOP_WEBSITE_GUIDE.md) | SOP-系统联动方法论（SOP 文档优化方法论 + 架构/数据/鉴权权威引用，2026-09-03 精简） | **唯一权威**——SOP 与系统的双向修改指南 |
| [ABOUT_PAGE_DESIGN.md](module/ABOUT_PAGE_DESIGN.md) | About 页面设计系统（叙事册风：超参数设定原则/防风格疲劳/无竖线红线） | **唯一权威**——about 页设计的超参数设定原则 |
| [MODULE_UI_DESIGN.md](module/MODULE_UI_DESIGN.md) | 模块界面设计：「党建」Tab 分组界面+日历功能模块（已落地 2026-09-03，设计论证档案） | **已落地**——与 SOP_WEBSITE_GUIDE/DESIGN_SYSTEM 重叠停更，权威源 = [DESIGN_SYSTEM.md](design-system/DESIGN_SYSTEM.md) §四 组件规范 + SOP_WEBSITE_GUIDE |
| [AGENDA_AND_REFERENCE_DESIGN.md](module/AGENDA_AND_REFERENCE_DESIGN.md) | 会议议程与资料查询联动设计（会前草案关联/会后少重复录入/单一数据源） | **已落地的设计论证档案**；当前模型与行为以 `content/04_web_design/data/DATA_MODEL.md`、服务层和服务端路由为准；议程实现入口包括 `vote-config.js`、`vote-widget.js`、`inspector.js`、`vote-summary-panel.js`、`committee-vote.js`、`server/routes/committee.js`，资料入口见 `references.js` 与 `server/db.js` |

### 演进与校验（evolution/）

| 文件 | 一句话说明 | 权威源 |
|------|-----------|--------|
| [DESIGN_METHODOLOGY.md](evolution/DESIGN_METHODOLOGY.md) | 设计理念与方法论承接（设计论证与方法档案：系统/工作台/前端实现方法论与判例、打卡化底线、叙述性人读方法论，2026-09-04 承接自 insights [4] 标签小节） | 论证档案——论证/反论/判例/生效条件在此；规范权威源 = [DESIGN_SYSTEM.md](design-system/DESIGN_SYSTEM.md) / DATA_MODEL / SOP_WEBSITE_GUIDE |
| [ARCHITECTURE_EVOLUTION.md](evolution/ARCHITECTURE_EVOLUTION.md) | 架构演进（2026-09-03 精简：评估正文压为 §二 历史结论段，保留 §八 工作流块拖拽编排远期愿景；评估承接见 .ctx/ENGINEERING_ASSESSMENT.md「工程化评估与改造行动线」） | 历史探索与愿景定位（现行方向判断依据 = .ctx/ENGINEERING_ASSESSMENT.md） |
| [WORKFLOW_BLOCK_CONTRACT.md](evolution/WORKFLOW_BLOCK_CONTRACT.md) | L3 工作流块封装契约 v1.1（块差异化三维度 + 契约总则 + manifest 字段定义） | **唯一权威**——工作流块封装契约（2026-09-03 定稿） |
| [BRANCH_WORK_MAP.md](evolution/BRANCH_WORK_MAP.md) | L4 支部工作地图设计稿 v2.1（平铺模块清单 + 按人双视图，支书 2026-09-03 放行编码） | **唯一权威**——支部工作地图/分工载体设计 |
| [PARTY_COMMITTEE_DESIGN.md](evolution/PARTY_COMMITTEE_DESIGN.md) | 院系党委后台设计定案（支部多实例两级治理：P1 支部实例+台账 / P2 支书任命 / P3 支部上报+下发） | **唯一权威**——党委两级治理架构与方向选择说明 |
| [ROLE_PERMISSION_DESIGN.md](evolution/ROLE_PERMISSION_DESIGN.md) | 权限功能合一收敛设计（角色权限四处分散声明 → 单一事实源 ROLE_KEYS + 派生） | **已落地 2026-09-03**（S1~S10 已验收达成，设计论证档案）；权威源 = [SYSTEM_ROLE_PERMISSION.md](../02_institution/SYSTEM_ROLE_PERMISSION.md) §9a0/§9b/§9c + 代码 `ROLE_KEYS` |

> **注（2026-09-08/09）**：工程化评估（原「模块化 / 插件化 / 开源化评估」，2026-09-09 更名「工程化评估与改造行动线」）随评估职能迁入 `.ctx/`（审计底座），见 `.ctx/ENGINEERING_ASSESSMENT.md`——本表不再单列该文件行。

---

## 知识流向

`01_strategy/` 与 `02_institution/` 的战略与制度 → 在本目录形成设计结论（规范落 `DESIGN_SYSTEM` / `DATA_MODEL` / `DEPLOYMENT_GUIDE` / `SOP_WEBSITE_GUIDE`，论证落 `evolution/` 与各模块文档）→ 由 `docs/`、`server/` 实现 → 评审与实测发现的边界沉淀为各域 `CASES.md` 判例，再回写对应规范条目。

## 是否保留原始材料

不保留。本目录只存设计结论与论证；真机截图与读数在 `.ctx/evidence/`，逐批过程在 `.ctx/logs/`，临时 spec 在 `.trae/specs/`（用后即删）。

## 维护触发器

- 新增、删除或重命名本目录任一层文件；
- 页签增删改（`docs/src/capabilities/*`）导致 [PRODUCT_IA.md](PRODUCT_IA.md) 需要重派生；
- 权威源变更（`DESIGN_SYSTEM` / `DATA_MODEL` / `DEPLOYMENT_GUIDE` / `SOP_WEBSITE_GUIDE` / `WORKFLOW_BLOCK_CONTRACT`）；
- 某份设计文档状态变化（draft → landed → 论证档案）；
- 子目录职责调整或新增子目录。

---

## 与其他知识类型的关系

- **知识类型 1（战略）**：设计的战略依据，见 `content/01_strategy/`
- **知识类型 2（制度）**：设计落地的制度，见 `content/02_institution/`
- **知识类型 3（文档系统管理）**：本目录文档的治理规范，见 `content/03_doc_system/`
- **知识类型 5（AI coding）**：本目录设计的 AI coding 实践，见 `content/05_ai_coding/`
