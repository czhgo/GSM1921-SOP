---
title: "全局文档导航映射"
type: governance
role: "[工程师]+[AI]"
last_updated: "2026-08-19"
version: "2.3"
status: active
related_files: [OPERATIONS_GUIDE.md, SSOT_INDEX.md, CLAUDE.md, ARCHITECTURE.md]
---

# 文档导航映射

> **本文档为导航图**：按 5 类知识类型组织，标注每个文件的受众。
> **权威层级定义**（5 类知识类型、裁决规则）见 [OPERATIONS_GUIDE.md §1.1](OPERATIONS_GUIDE.md#11-文档权威层级5-类知识类型)。
> **母本子本关系注册表**见 [SSOT_INDEX.md](SSOT_INDEX.md)。
> 三者关系：§1.1 定义层级 → DOC_MAP 标注层级 → SSOT_INDEX 注册关系。
> **受众：** [工程师]+[AI]

---

## §〇 文件角色分类

本仓库文件按三类角色标记：`[用户]` / `[工程师]` / `[AI]`，支持复合标记（如 `[用户]+[AI]`）。

定义见 [ROLE_CLASSIFICATION.md §一](../02_institution/ROLE_CLASSIFICATION.md)。

**废弃概念**：`[人]`/`[人机]` 已于 2026-07-11 废弃，详见 ROLE_CLASSIFICATION.md §一。

---

## 一、快速导航（按受众）

| 受众 | 入口文件 | 说明 |
|------|---------|------|
| [用户] | `README.md`（根目录） | 项目门面，一句话说清是什么 |
| [工程师]+[AI] | `content/03_doc_system/ARCHITECTURE.md` | 核心架构说明，技术全景 |
| [工程师]+[AI] | `CLAUDE.md`（根目录） | Harness（甲乙丙三部）、AI 执行依据 |
| [用户]+[AI] | `content/01_strategy/SECRETARY_PRONOUNCEMENTS.md` | 党支书工作交接文档（项目顶级战略文档） |

---

## 二、文件总览（按 5 类知识类型）

> **层级定义见 [OPERATIONS_GUIDE.md §1.1](OPERATIONS_GUIDE.md#11-文档权威层级5-类知识类型)**：5 类知识类型（战略/制度/文档系统/网站设计/AI coding）。
> 知识类型之间互补，互不覆盖；冲突裁决以母本优先于衍生为原则。

### 知识类型 1：支部发展和管理的战略（content/01_strategy/）

> 回答"支部为什么存在、根本目标、战略路线"。

| 文件 | 受众 | 内容 | 被引用方 |
|------|------|------|---------|
| `content/01_strategy/SECRETARY_PRONOUNCEMENTS.md` | [用户]+[AI] | 党支书工作交接文档（项目顶级战略文档，元命题 + 战略路线级 + 制度设计级论断） | CLAUDE.md H90/H100 |
| `content/01_strategy/DEVELOPMENT_PATH.md` | [用户]+[AI] | 发展路径（从入党申请人到正式党员的完整叙事） | SECRETARY_PRONOUNCEMENTS.md |
| `content/01_strategy/README.md` | [工程师]+[AI] | 战略层目录索引 | — |
| `content/01_strategy/references/合规文件/` | [用户] | 党章、党支部工作规范、党员教育管理条例等（T1 制度原文） | content/02_institution/sop/（母本溯源） |
| `content/01_strategy/references/历史会议材料/` | [用户] | 历次党小组会议记录、支委工作手册等存档 | 无（历史档案） |
| `content/01_strategy/references/建设探索/` | [用户]+[AI] | 党建工作知识特点与优化路径等建设探索 | — |

### 知识类型 2：支部发展和管理的制度（content/02_institution/）

> 回答"组织架构、分工、SOP"；内部区分制度设计文件与方法指引 SOP 文件（合并参考）。

| 文件 | 受众 | 内容 | 被引用方 |
|------|------|------|---------|
| `content/02_institution/FLAT_DESIGN.md` | [工程师]+[AI] | 组织者与深度参与者的扁平化设计 | SECRETARY_PRONOUNCEMENTS.md |
| `content/02_institution/COMMISSIONER_FRAMEWORK.md` | [用户]+[AI] | 支委系统设计（含专班、赋权关系链、§审批流程规范） | SECRETARY_PRONOUNCEMENTS.md |
| `content/02_institution/ROLE_CLASSIFICATION.md` | [工程师]+[AI] | 文件角色分类体系设计 + 权限矩阵 §九 | CLAUDE.md、SERVICE_CATALOG.md |
| `content/02_institution/sop/INDEX.md` | [用户]+[AI] | SOP 导航目录 | ARCHITECTURE.md |
| `content/02_institution/sop/常见工作场景快速指南.md` | [用户]+[AI] | 快速使用指南 | INDEX |
| `content/02_institution/sop/支委与党小组定人定责定岗说明.md` | [用户]+[AI] | 职责分工文档 | INDEX |
| `content/02_institution/sop/宣传委员工作流程指南.md` | [用户]+[AI] | 宣传委员 SOP | INDEX |
| `content/02_institution/sop/组织委员工作流程指南.md` | [用户]+[AI] | 组织委员 SOP | INDEX |
| `content/02_institution/sop/纪检委员工作流程指南.md` | [用户]+[AI] | 纪检委员 SOP | INDEX |
| `content/02_institution/sop/党小组组长工作手册.md` | [用户]+[AI] | 党小组组长专用操作指南 | INDEX |
| `content/02_institution/README.md` | [工程师]+[AI] | 制度层目录索引 | — |

### 知识类型 3：全仓库文档系统管理的技术方法（content/03_doc_system/）

> 回答"文档怎么治理、术语怎么用、运行标准"。

| 文件 | 受众 | 内容 | 被引用方 |
|------|------|------|---------|
| `content/03_doc_system/OPERATIONS_GUIDE.md` | [工程师]+[AI] | 运行标准·文档规范类（权威层级 §1、术语 §2、文档关系 §3、文件角色 §4、YAML §5、编码 §6、排版 §7、有机性 §8、编号 §9、日志 §10、反论 §11、命名 §12、面向用户表述 §13、角色操作 §14） | CLAUDE.md（H90 指针）、全仓库 |
| `content/03_doc_system/PROCESS_GUIDE.md` | [工程师]+[AI] | 运行标准·流程机制类（§15 甲部修改流程、§16 吸收外部输入、§17 周期性任务、§18 书记评议工作流细节；2026-08-24 自 OPERATIONS_GUIDE 拆分） | CLAUDE.md H60/H30.1 |
| `content/03_doc_system/USAGE_POLICY.md` | [工程师]+[AI] | 使用规范（术语标准 §一 + AI 展开原则 §二 + Emoji 边界 §三，合并自 TERMINOLOGY.md + EMOJI_POLICY.md） | 全仓库 |
| `content/03_doc_system/DOC_MAP.md` | [工程师]+[AI] | 本文档：全局导航中心 | 所有文件 |
| `content/03_doc_system/SSOT_INDEX.md` | [工程师]+[AI] | 母本注册表、溯源参考（Agent/Skill 配置已迁出，见 ARCHITECTURE.md） | ARCHITECTURE.md |
| `content/03_doc_system/ARCHITECTURE.md` | [工程师]+[AI] | 核心架构说明、分层架构、数据模型、变更流水线 | README.md（架构图引用） |
| `content/03_doc_system/SERVICE_CATALOG.md` | [工程师]+[AI] | 统一服务目录（服务清单+角色权限矩阵） | DATA_MODEL.md / ROLE_CLASSIFICATION.md / COMMISSIONER_FRAMEWORK.md |
| `content/03_doc_system/工作模板/经验沉淀辅助提示词.md` | [用户] | 经验沉淀辅助提示词模板 | content/04_web_design/module/SOP_WEB.md |
| `content/03_doc_system/README.md` | [工程师]+[AI] | 文档系统管理层目录索引 | — |

### 知识类型 4：网站系统的设计想法（content/04_web_design/）

> 回答"网站功能与视觉设计"。

| 文件 | 受众 | 内容 | 被引用方 |
|------|------|------|---------|
| `content/04_web_design/data/DATA_MODEL.md` | [工程师]+[AI] | 数据模型设计（原 DATA_ARCHITECTURE §二：20 类数据模型字段定义 + §写入数据验证 + 待办/通知派生 + 归档扩展字段） | SECRETARY_PRONOUNCEMENTS.md、ARCHITECTURE.md、CLAUDE.md |
| `content/04_web_design/data/DATA_FLOW.md` | [工程师]+[AI] | 数据流设计（原 DATA_ARCHITECTURE §一总览 + §三参与者数据流 + §四前端数据流：状态管理/持久化/数据源边界/DataAdapter/写穿透） | DATA_MODEL.md、ROLE_CLASSIFICATION.md |
| `content/04_web_design/design-system/DESIGN_SYSTEM.md` | [工程师]+[AI] | 设计系统规范（设计哲学/排版/交互反馈/响应式/深色模式/设计资产/快速参考；2026-08-24 §二→COLOR_SYSTEM、§四→COMPONENT_SPEC） | docs/src/styles.css |
| `content/04_web_design/design-system/COLOR_SYSTEM.md` | [工程师]+[AI] | 色彩系统规范（色盘/主色/辅助色/中性色/功能色/表面色/配色规则；2026-08-24 自 DESIGN_SYSTEM 拆分） | docs/src/styles.css |
| `content/04_web_design/design-system/COMPONENT_SPEC.md` | [工程师]+[AI] | 组件规范（按钮/卡片/输入/侧边栏/导航/日历图例/数据展示/图标/选人/状态徽章；2026-08-24 自 DESIGN_SYSTEM 拆分） | docs/src/components/* |
| `content/04_web_design/module/ABOUT_DESIGN_SYSTEM.md` | [工程师]+[AI] | About 页面设计系统（超参数设定原则/防风格疲劳/无竖线红线） | docs/src/about.css、docs/src/entries/about-entry.js |
| `content/04_web_design/evolution/CHECKLIST.md` | [用户]+[AI] | 数据同源一致性校验手册（工程质检流程，按数据类别逐步检查；机器检查+人工检查分工） | DATA_MODEL.md、ARCHITECTURE.md |
| `content/04_web_design/module/MODULE_UI_DESIGN.md` | [工程师]+[AI] | 模块界面设计（合并原 PAFFAIRS_UI/CALENDAR：「党建」Tab 分组+日历功能） | docs/src/components/calendar.js |
| `content/04_web_design/module/SOP_WEB.md` | [工程师]+[AI] | SOP 系统优化与同步指南 | CLAUDE.md H30.2 |
| `content/04_web_design/deploy/DEPLOYMENT_ROADMAP.md` | [工程师]+[AI] | 部署落地总览（四条落地路径 + 计算中心对接全案 + 决策矩阵） | DEPLOYMENT_AUTH_MODEL.md、WECHAT_INTEGRATION.md |
| `content/04_web_design/deploy/PKU_PARTY_INTEGRATION.md` | [工程师]+[AI] | 北大党校与智慧党建系统对接设计（党校单向爬取 + 智慧党建双向同步 + 数据映射 + 小程序归位说明 + 待确认清单） | DEPLOYMENT_ROADMAP.md、WECHAT_INTEGRATION.md、DATA_MODEL.md |
| `content/04_web_design/evolution/ARCHITECTURE_EVOLUTION.md` | [工程师]+[AI] | 架构演进（组件化落地评估 + 轻量插件化「能力注册表」设计 + 迭代机制 + 实施路径） | DATA_MODEL.md、DATA_FLOW.md、SOP_WEB.md、DEPLOYMENT_ROADMAP.md、ARCHITECTURE.md、KNOWN_PITFALLS.md |
| `content/04_web_design/deploy/DEPLOYMENT_AUTH_MODEL.md` | [工程师]+[AI] | 部署与认证场景模型（5 场景两轴正交 + 侧边栏统一 + 登录门控四层 + 构建注入配置） | docs/src/config/deploy.js、docs/src/components/sidebar.js、docs/src/core/bootstrap.js |
| `content/04_web_design/deploy/WECHAT_INTEGRATION.md` | [工程师]+[AI] | 微信协同与小程序设计方案（文件流分类+宣传墙/档案分层浏览+过程性汇报集成+小程序路径评估） | DESIGN_SYSTEM.md（原则 10/13）、T-230 |
| `content/04_web_design/README.md` | [工程师]+[AI] | 网站设计层目录索引 | — |

### 知识类型 5：网站系统的 AI coding 技术方法（content/05_ai_coding/）

> 回答"AI 编码的经验教训与陷阱"。

| 文件 | 受众 | 内容 | 被引用方 |
|------|------|------|---------|
| `content/05_ai_coding/KNOWN_PITFALLS.md` | [工程师]+[AI] | 已知陷阱判例（AI工具使用陷阱） | CLAUDE.md H90 |
| `content/05_ai_coding/README.md` | [工程师]+[AI] | AI coding 技术层目录索引 | — |

### 跨多类：经验沉淀（content/insights/）

> insights 跨多类，双文件组织（党建实务=类型 1+2，工程演进=类型 3+4+5）。

| 文件 | 受众 | 内容 | 被引用方 |
|------|------|------|---------|
| `content/insights/README.md` | [用户]+[工程师] | 经验沉淀层目录索引（2026-08-24 新增，与其他目录索引对齐） | — |
| `content/insights/党支部管理与实务经验沉淀.md` | [用户]+[AI] | 经验沉淀（组织性/管理事服务人、条块二元结构、三支委角色设计、活动分类体系、专班） | AI（经验提炼） |
| `content/insights/工程演进与设计方法论.md` | [工程师]+[AI] | 经验沉淀（信息组织、减负与取舍、上下文治理、系统与工作台设计、架构迁移、实操判例、表达与沉淀纪律） | AI（经验提炼） |

### 跨多类：根目录 + 审计底座 + 实现层

| 文件 | 受众 | 内容 | 被引用方 |
|------|------|------|---------|
| `CLAUDE.md`（根目录） | [工程师]+[AI] | Harness（甲乙丙三部）、执行路线图、AI 协作规则、授权机制 | SSOT_INDEX、README |
| `README.md`（根目录） | [用户] | 项目门面，一句话说清是什么 | — |
| `.ctx/TIMESTAMPS.md` | [工程师] | 文件时间戳注册表（含周期性任务追踪表） | CLAUDE.md |
| `.ctx/SNAPSHOT.md` | [AI] | 系统快照、AI 快速同步入口（审计追溯层） | ARCHITECTURE.md、CLAUDE.md |
| `.ctx/logs/YYYY-MM-EXECUTION_LOG.md` | [工程师] | 月度执行日志 | ARCHITECTURE.md、CLAUDE.md |
| `.ctx/logs/DECISION_LOG.md` | [工程师] | 决策日志 | ARCHITECTURE.md、CLAUDE.md |
| `docs/src/*` | [工程师] | 代码实现（workflow/services/entries/core/components/styles） | ARCHITECTURE.md |

---

## 四、按任务分类的快速入口

| 我想做什么 | 先读哪里 | 再读哪里 |
|-----------|---------|---------|
| 了解项目全貌 | README.md | content/03_doc_system/ARCHITECTURE.md |
| 查看待办任务 | CLAUDE.md §C | .ctx/logs/DECISION_LOG.md |
| 查 SOP 流程 | content/02_institution/sop/INDEX.md | 对应功能委员 SOP |
| 使用 Skill 工作流 | content/05_ai_coding/KNOWN_PITFALLS.md | 对应 Skill 定义 |
| 提交改进反馈 | content/04_web_design/module/SOP_WEB.md §E | content/02_institution/sop/对应文件 |
| 了解角色分类体系 | content/02_institution/ROLE_CLASSIFICATION.md | （含可扩展性评估 §六） |
| 查看设计系统规范 | content/04_web_design/design-system/DESIGN_SYSTEM.md | docs/src/styles.css |
| 了解 Emoji 使用规范 | content/03_doc_system/USAGE_POLICY.md §三 | CLAUDE.md 钩稽矩阵 |
| 查看日历功能规划 | content/04_web_design/module/MODULE_UI_DESIGN.md | docs/src/components/calendar.js |
| 查看品牌标签设计 | content/04_web_design/data/DATA_MODEL.md | CLAUDE.md |
| 查官方合规 | content/01_strategy/references/合规文件/ | content/02_institution/sop/溯源 |
| 查看执行日志 | .ctx/logs/EXECUTION_LOG_INDEX.md | 对应月份日志 |
| 查看 SOP 系统优化 | content/04_web_design/module/SOP_WEB.md | content/02_institution/sop/对应 SOP |
| 了解支委系统设计 | content/02_institution/COMMISSIONER_FRAMEWORK.md | content/04_web_design/module/MODULE_UI_DESIGN.md |
| 了解登录系统设计前置 | content/04_web_design/data/DATA_FLOW.md | DATA_MODEL.md §登录态打桩设计 |
| 查看服务清单与权限矩阵 | content/03_doc_system/SERVICE_CATALOG.md | content/02_institution/ROLE_CLASSIFICATION.md §九 |
| 运行/编写测试 | [server/README.md](../../server/README.md) 测试说明 | CLAUDE.md H25（AI 必知测试命令） |
| 理解架构变更 | content/03_doc_system/ARCHITECTURE.md §八 | content/03_doc_system/SSOT_INDEX.md |
| 了解三类文件角色规范 | content/03_doc_system/OPERATIONS_GUIDE.md §14 | content/02_institution/ROLE_CLASSIFICATION.md |
| 查看文档权威层级 | content/03_doc_system/OPERATIONS_GUIDE.md §1.1 | 本文档 §二 |
| 查看母本子本关系 | content/03_doc_system/SSOT_INDEX.md | content/03_doc_system/OPERATIONS_GUIDE.md §1.1 |
| 查看书记重要论断 | content/01_strategy/SECRETARY_PRONOUNCEMENTS.md | CLAUDE.md H90 |
