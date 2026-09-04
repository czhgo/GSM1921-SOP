---
title: "全局文档导航映射"
type: governance
role: "[工程师]+[AI]"
last_updated: "2026-09-04"
version: "2.4"
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
| [用户]+[AI] | `content/01_strategy/SECRETARY_DIRECTIVES.md` | 党支书工作交接文档（项目顶级战略文档） |

---

## 二、文件总览（按 5 类知识类型）

> **层级定义见 [OPERATIONS_GUIDE.md §1.1](OPERATIONS_GUIDE.md#11-文档权威层级5-类知识类型)**：5 类知识类型（战略/制度/文档系统/网站设计/AI coding）。
> 知识类型之间互补，互不覆盖；冲突裁决以母本优先于衍生为原则。

### 知识类型 1：支部发展和管理的战略（content/01_strategy/）

> 回答"支部为什么存在、根本目标、战略路线"。

| 文件 | 受众 | 内容 | 被引用方 |
|------|------|------|---------|
| `content/01_strategy/SECRETARY_DIRECTIVES.md` | [用户]+[AI] | 党支书工作交接文档（项目顶级战略文档，元命题 + 战略路线级 + 制度设计级论断） | CLAUDE.md H90/H100 |
| `content/01_strategy/DEVELOPMENT_PATH.md` | [用户]+[AI] | 发展路径（从入党申请人到正式党员的完整叙事） | SECRETARY_DIRECTIVES.md |
| `content/01_strategy/README.md` | [工程师]+[AI] | 战略层目录索引 | — |
| `content/01_strategy/references/合规文件/` | [用户] | 党章、党支部工作规范、党员教育管理条例等（T1 制度原文） | content/02_institution/sop/（母本溯源） |
| `content/01_strategy/references/历史会议材料/` | [用户] | 历次党小组会议记录、支委工作手册等存档 | 无（历史档案） |
| `content/01_strategy/references/建设探索/` | [用户]+[AI] | 党建工作知识特点与优化路径等建设探索 | — |

### 知识类型 2：支部发展和管理的制度（content/02_institution/）

> 回答"组织架构、分工、SOP"；内部区分制度设计文件与方法指引 SOP 文件（合并参考）。

| 文件 | 受众 | 内容 | 被引用方 |
|------|------|------|---------|
| `content/02_institution/FLAT_ORGANIZATION_DESIGN.md` | [工程师]+[AI] | 组织者与深度参与者的扁平化设计 | SECRETARY_DIRECTIVES.md |
| `content/02_institution/COMMISSIONER_DUTY_FRAMEWORK.md` | [用户]+[AI] | 支委系统设计（含专班、赋权关系链、§审批流程规范） | SECRETARY_DIRECTIVES.md |
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
| `content/03_doc_system/SERVICE_CATALOG.md` | [工程师]+[AI] | 统一服务目录（服务清单+角色权限矩阵） | DATA_MODEL.md / ROLE_CLASSIFICATION.md / COMMISSIONER_DUTY_FRAMEWORK.md |
| `content/03_doc_system/工作模板/经验沉淀辅助提示词.md` | [用户] | 经验沉淀辅助提示词模板 | content/04_web_design/module/SOP_WEBSITE_GUIDE.md |
| `content/03_doc_system/README.md` | [工程师]+[AI] | 文档系统管理层目录索引 | — |

### 知识类型 4：网站系统的设计想法（content/04_web_design/）

> 回答"网站功能与视觉设计"。

| 文件 | 受众 | 内容 | 被引用方 |
|------|------|------|---------|
| `content/04_web_design/data/DATA_MODEL.md` | [工程师]+[AI] | 数据模型设计（静态模型权威：20 类数据模型字段定义 + §写入数据验证 + 待办/通知派生 + 归档扩展字段） | SECRETARY_DIRECTIVES.md、ARCHITECTURE.md、CLAUDE.md |
| `content/04_web_design/data/DATA_FLOW.md` | [工程师]+[AI] | 数据流设计（动态数据流权威：数据架构总览 + 参与者数据流 + 前端数据流：状态管理/持久化/数据源边界/DataAdapter/写穿透） | DATA_MODEL.md、ROLE_CLASSIFICATION.md |
| `content/04_web_design/design-system/DESIGN_SYSTEM.md` | [工程师]+[AI] | 设计系统规范（设计哲学/排版/交互反馈/响应式/深色模式/设计资产/快速参考；2026-08-24 §二→COLOR_SYSTEM、§四→COMPONENT_SPEC） | docs/src/styles.css |
| `content/04_web_design/design-system/COLOR_SYSTEM.md` | [工程师]+[AI] | 色彩系统规范（色盘/主色/辅助色/中性色/功能色/表面色/配色规则；2026-08-24 自 DESIGN_SYSTEM 拆分） | docs/src/styles.css |
| `content/04_web_design/design-system/COMPONENT_SPEC.md` | [工程师]+[AI] | 组件规范（按钮/卡片/输入/侧边栏/导航/日历图例/数据展示/图标/选人/状态徽章；2026-08-24 自 DESIGN_SYSTEM 拆分） | docs/src/components/* |
| `content/04_web_design/module/ABOUT_PAGE_DESIGN.md` | [工程师]+[AI] | About 页面设计系统（超参数设定原则/防风格疲劳/无竖线红线） | docs/src/about.css、docs/src/entries/about-entry.js |
| `content/04_web_design/module/AGENDA_AND_REFERENCE_DESIGN.md` | [工程师]+[AI] | 会议议程与资料查询联动设计（会前草案关联/会后少重复录入/单一数据源） | —（草案·待实施 2026-08-31） |
| `content/04_web_design/module/MODULE_UI_DESIGN.md`（已落地 2026-09-03） | [工程师]+[AI] | 模块界面设计（合并原 PAFFAIRS_UI/CALENDAR：「党建」Tab 分组+日历功能，已落地、设计论证档案） | docs/src/components/calendar.js |
| `content/04_web_design/evolution/ROLE_PERMISSION_DESIGN.md`（已落地 2026-09-03） | [工程师]+[AI] | 权限功能合一收敛设计（角色权限四处分散声明 → 单一事实源 ROLE_KEYS + 派生；S1~S10 已验收达成、设计论证档案） | 权威源 ROLE_CLASSIFICATION.md §9a0/§9b/§9c + 代码 ROLE_KEYS |
| `content/04_web_design/module/SOP_WEBSITE_GUIDE.md` | [工程师]+[AI] | SOP 系统优化与同步指南 | CLAUDE.md H30.2 |
| `content/04_web_design/deploy/DEPLOYMENT_GUIDE.md` | [工程师]+[AI] | 部署与对外对接总案（系统形态速览 + 四条落地路径与决策矩阵 + 学校/党校对接总叙事与决策矩阵 + 专项细节指针；2026-09-04 按阅读对象重构，原计算中心对接全案并入 §三） | AUTHENTICATION_MODEL.md、WECHAT_INTEGRATION.md、PKU_PARTY_INTEGRATION.md |
| `content/04_web_design/deploy/PKU_PARTY_INTEGRATION.md` | [工程师]+[AI] | 北大党校与智慧党建系统对接设计（党校单向爬取 + 智慧党建双向同步 + 数据映射 + 小程序归位说明 + 待确认清单） | DEPLOYMENT_GUIDE.md、WECHAT_INTEGRATION.md、DATA_MODEL.md |
| `content/04_web_design/evolution/ARCHITECTURE_EVOLUTION.md` | [工程师]+[AI] | 架构演进（2026-09-03 精简：组件化落地评估历史结论 + §八 拖拽编排远期愿景；评估承接见 MODULARIZATION_ASSESSMENT） | MODULARIZATION_ASSESSMENT.md、DATA_MODEL.md、DATA_FLOW.md、SOP_WEBSITE_GUIDE.md |
| `content/04_web_design/evolution/MODULARIZATION_ASSESSMENT.md` | [工程师]+[AI] | 模块化/插件化/开源化 100 分评估（统一扎口范式 + 冗余审计去重队列 P0~P2 + 执行状态；2026-09-03） | ARCHITECTURE_EVOLUTION.md、CLAUDE.md（模块化方向唯一权威） |
| `content/04_web_design/evolution/WORKFLOW_BLOCK_CONTRACT.md` | [工程师]+[AI] | L3 工作流块封装契约 v1.1（块差异化三维度 + 契约总则 + manifest 字段定义；2026-09-03 定稿） | docs/src/workflow/blocks/*、server/test/block-*（契约源） |
| `content/04_web_design/evolution/BRANCH_WORK_MAP.md`（已落地 2026-09-04） | [工程师]+[AI] | L4 支部工作地图设计稿 v2.1（平铺模块清单 + 按人双视图，已落地、设计论证档案；书记 2026-09-03 放行编码） | docs/src/entries/tabs/secretary/work-map-tab.js + workforce-panel.js（server/test/work-map.test.mjs） |
| `content/04_web_design/evolution/DESIGN_METHODOLOGY.md` | [工程师]+[AI] | 设计理念与方法论承接（设计论证与方法档案：系统/工作台/前端实现方法论与判例、打卡化底线、叙述性人读方法论；2026-09-04 承接自 insights [4] 标签小节，出处注记保留） | DESIGN_SYSTEM.md、COMPONENT_SPEC.md（论证档案去向）；规范权威源 = DESIGN_SYSTEM / COMPONENT_SPEC / COLOR_SYSTEM / DATA_MODEL / DATA_FLOW / SOP_WEBSITE_GUIDE |
| `content/04_web_design/evolution/PARTY_COMMITTEE_DESIGN.md` | [工程师]+[AI] | 院系党委后台设计定案（支部多实例两级治理：P1 支部实例+台账 / P2 书记任命 / P3 上报审批+下发；书记逐段批准） | docs/src/modules/capabilities/party-committee-workspace.js |
| `content/04_web_design/deploy/AUTHENTICATION_MODEL.md` | [工程师]+[AI] | 部署与认证场景模型（5 场景两轴正交 + 侧边栏统一 + 登录门控四层 + 构建注入配置） | docs/src/config/deploy.js、docs/src/components/sidebar.js、docs/src/core/bootstrap.js |
| `content/04_web_design/deploy/WECHAT_INTEGRATION.md` | [工程师]+[AI] | 微信协同与小程序设计方案（文件流分类+宣传墙/档案分层浏览+过程性汇报集成+小程序路径评估） | DESIGN_SYSTEM.md（原则 10/13）、T-230 |
| `content/04_web_design/README.md` | [工程师]+[AI] | 网站设计层目录索引 | — |

### 知识类型 5：网站系统的 AI coding 技术方法（content/05_ai_coding/）

> 回答"AI 编码的经验教训与陷阱"。

| 文件 | 受众 | 内容 | 被引用方 |
|------|------|------|---------|
| `content/05_ai_coding/README.md` | [工程师]+[AI] | AI 协作方法论层目录索引（层索引表 + 分流来源声明；2026-09-04 原 19 条总篇拆分为 5 分篇） | CLAUDE.md H90 |
| `content/05_ai_coding/FILE_OPERATION_RULES.md` | [工程师]+[AI] | 文件操作纪律分篇（持久化/临时文件/工具选择/版本参数/连续编辑/沙箱脚本 + 删除三铁律/架构迁移四步/仓库卫生；原 KNOWN §1/§3/§6/§13/§14/§18 + insights §2.3/§5.1/§5.11；read_strategy: on-demand） | CLAUDE.md H90 |
| `content/05_ai_coding/TEST_AND_VERIFICATION.md` | [工程师]+[AI] | 测试验证纪律分篇（Subagent 虚假确认/同一套数据盲区/受限视觉三件套/版本分裂/e2e 写穿 + 模拟数据一致性/人工检查写法/修复前 Grep 定位/排序覆盖下拉/兜底模式/CSS 注释陷阱；原 KNOWN §11/§12/§15/§16/§17/§19 + insights §4.12.2/§5.10/§6.17/§6.25/§6.26/§6.29；read_strategy: on-demand） | DATA_CONSISTENCY_CHECKLIST.md（配套手册） |
| `content/05_ai_coding/DOCUMENT_GOVERNANCE.md` | [工程师]+[AI] | 文档治理与一改具改分篇（一改具改执行/分层体系冲突/遗漏场景 + 命名/SSOT/单一表达/历史不可变/文件归置/工具隔离/文件夹治理/阶段适应性/spec 全流程/治理审计/全仓验证/被否决残留；原 KNOWN §2/§7/§10 + insights §1.1/§1.2/§1.3/§3.6/§4.8/§4.18/§5.2-§5.4/§5.9/§6.4/§6.15/§6.27；read_strategy: on-demand） | OPERATIONS_GUIDE.md §1.4 |
| `content/05_ai_coding/CONTEXT_MANAGEMENT.md` | [工程师]+[AI] | 上下文管理与防失忆分篇（上下文丢失/制度推断/对话总结虚假 + 减负/只留当前/决策三分/看板归档/交接协议/核心原则三分层/上下文工程/轮值推定/丙部触发 + 书记裁决落活层闭环规则；原 KNOWN §4/§8/§9 + insights §2.1/§2.2/§2.5/§2.6/§3.1/§3.2/§3.3/§6.1/§6.5/§6.11；**read_strategy: active**） | CLAUDE.md H90 + H26 |
| `content/05_ai_coding/REVIEW_AND_EXPRESSION.md` | [工程师]+[AI] | 评议与表达纪律分篇（沉淀位置 + 内容归属/沉淀闭环/复盘理念/提级机制/Skill 检验/正反两面论/反论审核/尺度三分类/消歧写法/总分并列/打破重组/孤段落/叙述表达/零补丁/讲解三层/AI 概括层级/T3 行话；原 KNOWN §5 + insights §1.6/§3.4/§3.7/§4.5/§4.6/§4.7/§4.8/§4.12.6/§4.15/§5.10/§6.2/§6.18/§7.1-§7.5；read_strategy: on-demand） | insights/ |
| `content/05_ai_coding/DATA_CONSISTENCY_CHECKLIST.md` | [工程师]+[AI] | 数据同源一致性校验手册（工程质检流程，按数据类别逐步检查；机器检查+人工检查分工；2026-09-04 自 04 evolution 迁入，AI 方法论归 05） | DATA_MODEL.md、ARCHITECTURE.md |

### 跨多类：经验沉淀（content/insights/）

> insights 跨多类经验沉淀（党建实务 = 类型 1+2 保留）；工程方法论（类型 3+4+5）已于 2026-09-04 分流至 04/05/03/02 各权威文件，承接声明见 [content/insights/README.md](../insights/README.md)。

| 文件 | 受众 | 内容 | 被引用方 |
|------|------|------|---------|
| `content/insights/README.md` | [用户]+[工程师] | 经验沉淀层目录索引（含 2026-09-04 工程方法论分流承接声明） | — |
| `content/insights/党支部管理与实务经验沉淀.md` | [用户]+[AI] | 经验沉淀（组织性/管理事服务人、条块二元结构、三支委角色设计、活动分类体系、专班） | AI（经验提炼） |

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

## 三、content 分层治理方法

### 3.1 content/ 梳理方法论（原 insights §5.6 并入）

> **确立日期**：2026-09-04（insights 分流归位）。原 §5.6 写于 content/ 旧目录结构时代（design/、governance/、sop/、insights/ 四目录），现按现行结构转写——design/ ≈ 04_web_design/（网站设计想法）、governance/ ≈ 03_doc_system/（文档系统治理）、sop/ = 02_institution/sop/（制度操作流程）。

大规模文件夹梳理采用「5 维度审查 + 分批执行 + 精简合并」相结合。

**5 维度审查清单**：

1. **层级归位**：文件是否放在与其知识类型匹配的目录（对照 §二 5 类知识类型）
2. **术语合规**：是否符合 [USAGE_POLICY.md §一](USAGE_POLICY.md) 当前定义，是否含废弃术语
3. **写作风格**：是否避免生硬排比、程式化格式，是否有人话表述
4. **版块裁剪**：是否含越界内容——实施路径/时限表/检查清单/表单 → 02_institution/sop/；代码块/伪代码 → 删除（设计文档不是代码仓库）；AI 编码方法论 → 05_ai_coding/；通用方法论沉淀 → insights/
5. **一致性**：文件间交叉引用是否断裂，是否有 `../../../` 等破损路径

**分批流程**（按依赖顺序，先改上层再改下层，避免下游文件引用尚未稳定的上游路径）：04_web_design/ + 03_doc_system/（设计理念与治理规范）→ 01_strategy/ → 02_institution/（含 sop/ 操作流程）→ insights/ + 05_ai_coding/（经验沉淀与方法论）。

**精简合并策略**：合并时仅合并核心独有章节，重叠章节以链接替代——控制合并后文件长度，避免「合并即变大」；合并前判断文件定位：若文件内部存在主题分裂（如"当前打桩实现"与"未来系统设计"），应拆分为两个独立文件而非强行合并。

**为什么不是"逐文件审查"？** 逐文件审查缺乏全局视角，无法发现跨文件的一致性问题（引用断裂、术语漂移）；5 维度审查以"维度"为单位扫描整个目录，能系统性发现同类问题。

**为什么不是"一次性全部改"？** content/ 各知识类型目录存在依赖——上游路径变更后下游引用都要跟着改；同时全改会使一改具改的搜索范围爆炸、遗漏概率上升。分批执行让每批完成后形成稳定基线，下一批基于稳定基线工作。

**为什么合并时只合并核心独有章节？** 全量合并导致文件膨胀（两个 200 行文件合并为一个 400 行文件，违背"精简"初衷）；重叠章节以链接替代，既消除内容重复，又控制文件长度。

**生效条件**：适用于 content/ 目录下文件数量超过 10 个、或文件平均行数超过 300 行的大规模梳理场景；小规模调整（单文件修订、单个新增）不需要启动此流程。

### 3.2 2026-09-04 insights 分流来源声明（原 insights §7.6 并入）

> **确立日期**：2026-09-04 | **拆分维度**：知识类型（T127 insights 拆分操作经验）

insights 单文件膨胀后（10+ 章 / 1000+ 行），按**知识类型**拆分为多个文件（§二「跨多类：经验沉淀」）：

- **文件 1（content/insights/党支部管理与实务经验沉淀.md）**：党支部管理与实务 + 共识性组织智慧——面向"管理事，服务人"叙事
- **文件 2（content/insights/工程演进与设计方法论.md）**：工程演进 + 设计方法论 + 架构迁移方法论 + 共识性组织智慧——面向 AI-driven 仓库工作流

**2026-09-04 二次分流（工程方法论 → 各知识类型权威文件）**：文件 2 中属仓库级系统治理规范与制度判例的章节，按知识类型归并至既有权威文件——03_doc_system/（PROCESS_GUIDE、USAGE_POLICY、DOC_MAP、SSOT_INDEX、OPERATIONS_GUIDE）与 02_institution/（COMMISSIONER_DUTY_FRAMEWORK）承接各自同题章节，并入文本均保留出处注「（原 insights §N）」，去重融合、不产生双份；源文件已删除（2026-09-04，承接声明见 [content/insights/README.md](../insights/README.md)）。

**拆分条件**（什么条件下用知识类型拆分）：① 单文件已膨胀到 10+ 章或 1000+ 行——跨主题切换上下文成本已高于拆分成本；② 知识类型存在明确的理论边界——同一类知识的内部细分不构成拆分依据；③ 拆分后每个文件都能独立承载完整的知识子体系。

**拆分粒度的边界**：以"文件能独立承载完整知识子体系"为界——共识性组织智慧横跨"管理事"与"AI-driven"两类工作，须在两文件中都存在；面向同一叙事、强耦合的知识（管理事类；工程演进/设计方法论/架构迁移类）不继续细分——拆分会切断耦合、增加跨文件引用成本。

**操作要点**：拆分前完成知识类型分类 + 母本子本关系梳理；拆分后全仓库一改具改（H30.1），Grep 验证旧文件名零残留、双文件内容无重叠、章节编号连续。

---

## 四、按任务分类的快速入口

| 我想做什么 | 先读哪里 | 再读哪里 |
|-----------|---------|---------|
| 了解项目全貌 | README.md | content/03_doc_system/ARCHITECTURE.md |
| 查看待办任务 | CLAUDE.md §C | .ctx/logs/DECISION_LOG.md |
| 查 SOP 流程 | content/02_institution/sop/INDEX.md | 对应功能委员 SOP |
| 使用 Skill 工作流 | content/05_ai_coding/README.md | 对应 Skill 定义 |
| 提交改进反馈 | content/04_web_design/module/SOP_WEBSITE_GUIDE.md §E | content/02_institution/sop/对应文件 |
| 了解角色分类体系 | content/02_institution/ROLE_CLASSIFICATION.md | （含可扩展性评估 §六） |
| 查看设计系统规范 | content/04_web_design/design-system/DESIGN_SYSTEM.md | docs/src/styles.css |
| 了解 Emoji 使用规范 | content/03_doc_system/USAGE_POLICY.md §三 | CLAUDE.md 钩稽矩阵 |
| 查看日历功能规划（设计论证档案） | content/04_web_design/module/MODULE_UI_DESIGN.md（已落地 2026-09-03） | docs/src/components/calendar.js |
| 查看品牌标签设计 | content/04_web_design/data/DATA_MODEL.md | CLAUDE.md |
| 查官方合规 | content/01_strategy/references/合规文件/ | content/02_institution/sop/溯源 |
| 查看执行日志 | .ctx/logs/EXECUTION_LOG_INDEX.md | 对应月份日志 |
| 查看 SOP 系统优化 | content/04_web_design/module/SOP_WEBSITE_GUIDE.md | content/02_institution/sop/对应 SOP |
| 了解支委系统设计 | content/02_institution/COMMISSIONER_DUTY_FRAMEWORK.md | content/04_web_design/module/MODULE_UI_DESIGN.md（已落地 2026-09-03） |
| 了解登录系统设计前置 | content/04_web_design/data/DATA_FLOW.md | DATA_MODEL.md §登录态打桩设计 |
| 查看服务清单与权限矩阵 | content/03_doc_system/SERVICE_CATALOG.md | content/02_institution/ROLE_CLASSIFICATION.md §九 |
| 运行/编写测试 | [server/README.md](../../server/README.md) 测试说明 | CLAUDE.md H25（AI 必知测试命令） |
| 理解架构变更 | content/03_doc_system/ARCHITECTURE.md §八 | content/03_doc_system/SSOT_INDEX.md |
| 了解三类文件角色规范 | content/03_doc_system/OPERATIONS_GUIDE.md §14 | content/02_institution/ROLE_CLASSIFICATION.md |
| 查看文档权威层级 | content/03_doc_system/OPERATIONS_GUIDE.md §1.1 | 本文档 §二 |
| 查看母本子本关系 | content/03_doc_system/SSOT_INDEX.md | content/03_doc_system/OPERATIONS_GUIDE.md §1.1 |
| 查看书记重要论断 | content/01_strategy/SECRETARY_DIRECTIVES.md | CLAUDE.md H90 |
