---
title: "网站设计层索引——网站系统的设计想法"
type: index
role: "[工程师]+[AI]"
last_updated: "2026-09-03"
status: active
---

# 网站设计层索引——网站系统的设计想法

> **定位：** 本目录存放**知识类型 4：网站系统的设计想法**——回答"网站功能、数据架构、UI 设计"。
> **受众：** [工程师]（系统维护者、开发者）
> **结构：** 2026-08-27（T-286）按主题分子目录分组，各子目录文件间可互相引用；跨组引用使用相对路径（`../组名/`）。
> **归类原则（书记 2026-09-03）：** content 与 spec/台账的边界**不是机械等式**，而是逐份**实时判断**——判断标准：是否承载"为什么这样做、选了哪个方向、模型长什么样"的设计价值。有设计价值（含必要字段模型与行为口径）→ 留 content；纯执行步骤/测试清单/过程台账 → `.trae/specs/`（用后即删）或 `.ctx/logs/`。

---

## 目录结构

| 子目录 | 内容 | 文件 |
|--------|------|------|
| [`design-system/`](design-system/) | 设计系统规范（视觉/色彩/组件/点击落点） | [DESIGN_SYSTEM.md](design-system/DESIGN_SYSTEM.md) · [COLOR_SYSTEM.md](design-system/COLOR_SYSTEM.md) · [COMPONENT_SPEC.md](design-system/COMPONENT_SPEC.md) · [CLICK_MAP.md](design-system/CLICK_MAP.md) |
| [`data/`](data/) | 数据架构（模型/流） | [DATA_MODEL.md](data/DATA_MODEL.md) · [DATA_FLOW.md](data/DATA_FLOW.md) |
| [`deploy/`](deploy/) | 部署与集成（路径/认证/外部对接） | [DEPLOYMENT_ROADMAP.md](deploy/DEPLOYMENT_ROADMAP.md) · [DEPLOYMENT_AUTH_MODEL.md](deploy/DEPLOYMENT_AUTH_MODEL.md) · [PKU_PARTY_INTEGRATION.md](deploy/PKU_PARTY_INTEGRATION.md) · [WECHAT_INTEGRATION.md](deploy/WECHAT_INTEGRATION.md) |
| [`module/`](module/) | 页面/模块设计（UI 与 SOP 联动） | [SOP_WEB.md](module/SOP_WEB.md) · [MODULE_UI_DESIGN.md](module/MODULE_UI_DESIGN.md) · [ABOUT_DESIGN_SYSTEM.md](module/ABOUT_DESIGN_SYSTEM.md) · [AGENDA_AND_REFERENCE_DESIGN.md](module/AGENDA_AND_REFERENCE_DESIGN.md)（草案） |
| [`evolution/`](evolution/) | 演进与校验（架构演进/组件化评估/契约与画布/党委两级治理） | [ARCHITECTURE_EVOLUTION.md](evolution/ARCHITECTURE_EVOLUTION.md) · [MODULARIZATION_ASSESSMENT.md](evolution/MODULARIZATION_ASSESSMENT.md) · [BLOCK_MANIFEST_CONTRACT.md](evolution/BLOCK_MANIFEST_CONTRACT.md) · [L4_CANVAS_DESIGN.md](evolution/L4_CANVAS_DESIGN.md) · [PARTY_COMMITTEE_DESIGN.md](evolution/PARTY_COMMITTEE_DESIGN.md) · [ROLE_SSOT_DESIGN.md](evolution/ROLE_SSOT_DESIGN.md) |

---

## 权威源速查

### 数据架构（data/）

| 文件 | 一句话说明 | 权威源 |
|------|-----------|--------|
| [DATA_MODEL.md](data/DATA_MODEL.md) | 数据模型设计：20 类数据模型字段定义 + 写入验证 + 待办/通知派生 + 归档扩展字段 | **唯一权威**——静态数据模型定义（2026-08-24 拆分自原数据架构总文件，路由文件已删） |
| [DATA_FLOW.md](data/DATA_FLOW.md) | 数据流设计：数据架构总览 + 参与者数据流 + 前端数据流（状态管理/持久化/数据源边界/DataAdapter） | **唯一权威**——动态数据流设计（2026-08-24 拆分自原数据架构总文件，路由文件已删） |

> 引用指引（原数据架构路由壳并入说明）：查"字段定义/数据结构" → DATA_MODEL.md；查"数据如何产生、流动、聚合 / DataAdapter / 持久化键" → DATA_FLOW.md。

### 设计系统（design-system/）

| 文件 | 一句话说明 | 权威源 |
|------|-----------|--------|
| [DESIGN_SYSTEM.md](design-system/DESIGN_SYSTEM.md) | 设计系统规范（设计哲学/排版/交互/响应式/深色模式/设计资产/快速参考） | **唯一权威**——前端视觉规范（2026-08-24 拆分 §二→COLOR_SYSTEM、§四→COMPONENT_SPEC） |
| [COLOR_SYSTEM.md](design-system/COLOR_SYSTEM.md) | 色彩系统规范（色盘/主色/辅助色/中性色/功能色/表面色/配色规则） | **唯一权威**——查色值优先（2026-08-24 拆分） |
| [COMPONENT_SPEC.md](design-system/COMPONENT_SPEC.md) | 组件规范（按钮/卡片/输入/侧边栏/导航/日历图例/数据展示/图标/选人/状态徽章等） | **唯一权威**——写组件优先（2026-08-24 拆分） |
| [CLICK_MAP.md](design-system/CLICK_MAP.md) | 点击落点映射表（什么地方可点击、点击落在哪里——分层原则 2026-08-29 书记裁定） | **唯一权威**——点击落点规范 |

### 部署与集成（deploy/）

| 文件 | 一句话说明 | 权威源 |
|------|-----------|--------|
| [DEPLOYMENT_ROADMAP.md](deploy/DEPLOYMENT_ROADMAP.md) | 部署落地总览（四条落地路径 + 计算中心对接全案 + 决策矩阵） | **唯一权威**——部署落地视图与路径决策（2026-08-24 并入原 SCHOOL_IT_DEPLOYMENT 内容） |
| [DEPLOYMENT_AUTH_MODEL.md](deploy/DEPLOYMENT_AUTH_MODEL.md) | 部署与认证场景模型（5 场景两轴正交 + 侧边栏统一 + 登录门控四层 + 构建注入配置） | **唯一权威**——部署形态 / 登录态 / 门控的统一模型 |
| [PKU_PARTY_INTEGRATION.md](deploy/PKU_PARTY_INTEGRATION.md) | 北大党校与智慧党建系统对接设计 | **唯一权威**——北大党建系统对接总体设计 |
| [WECHAT_INTEGRATION.md](deploy/WECHAT_INTEGRATION.md) | 微信协同与小程序设计方案 | **唯一权威**——小程序侧设计 |

### 页面/模块设计（module/）

| 文件 | 一句话说明 | 权威源 |
|------|-----------|--------|
| [SOP_WEB.md](module/SOP_WEB.md) | SOP-系统联动方法论（SOP 文档优化方法论 + 架构/数据/鉴权权威引用，2026-09-03 精简） | **唯一权威**——SOP 与系统的双向修改指南 |
| [ABOUT_DESIGN_SYSTEM.md](module/ABOUT_DESIGN_SYSTEM.md) | About 页面设计系统（叙事册风：超参数设定原则/防风格疲劳/无竖线红线） | **唯一权威**——about 页设计的超参数设定原则 |
| [MODULE_UI_DESIGN.md](module/MODULE_UI_DESIGN.md) | 模块界面设计：「党建」Tab 分组界面+日历功能模块（已落地 2026-09-03，设计论证档案） | **已落地**——与 SOP_WEB/COMPONENT_SPEC 重叠停更，权威源 = COMPONENT_SPEC + SOP_WEB |
| [AGENDA_AND_REFERENCE_DESIGN.md](module/AGENDA_AND_REFERENCE_DESIGN.md) | 会议议程与资料查询联动设计（会前草案关联/会后少重复录入/单一数据源） | 设计（**草案·待实施**，2026-08-31） |

### 演进与校验（evolution/）

| 文件 | 一句话说明 | 权威源 |
|------|-----------|--------|
| [ARCHITECTURE_EVOLUTION.md](evolution/ARCHITECTURE_EVOLUTION.md) | 架构演进（2026-09-03 精简：评估正文压为 §二 历史结论段，保留 §八 工作流块拖拽编排远期愿景；评估承接见 MODULARIZATION_ASSESSMENT） | 历史探索与愿景定位（现行方向判断依据 = MODULARIZATION_ASSESSMENT） |
| [MODULARIZATION_ASSESSMENT.md](evolution/MODULARIZATION_ASSESSMENT.md) | 模块化/插件化/开源化 100 分评估（统一扎口范式 + 冗余审计去重队列 P0~P2 + 执行状态） | **唯一权威**——模块化方向与去重优先级（2026-09-03） |
| [BLOCK_MANIFEST_CONTRACT.md](evolution/BLOCK_MANIFEST_CONTRACT.md) | L3 工作流块封装契约 v1.1（块差异化三维度 + 契约总则 + manifest 字段定义） | **唯一权威**——工作流块封装契约（2026-09-03 定稿） |
| [L4_CANVAS_DESIGN.md](evolution/L4_CANVAS_DESIGN.md) | L4 支部工作地图设计稿 v2.1（平铺模块清单 + 按人双视图，书记 2026-09-03 放行编码） | **唯一权威**——支部工作地图/分工载体设计 |
| [PARTY_COMMITTEE_DESIGN.md](evolution/PARTY_COMMITTEE_DESIGN.md) | 院系党委后台设计定案（支部多实例两级治理：P1 支部实例+台账 / P2 书记任命 / P3 上报审批+下发） | **唯一权威**——党委两级治理架构与方向选择说明 |
| [ROLE_SSOT_DESIGN.md](evolution/ROLE_SSOT_DESIGN.md) | 权限功能合一收敛设计（角色权限四处分散声明 → 单一事实源 ROLE_KEYS + 派生） | **已落地 2026-09-03**（S1~S10 已验收达成，设计论证档案）；权威源 = [ROLE_CLASSIFICATION.md](../02_institution/ROLE_CLASSIFICATION.md) §9a0/§9b/§9c + 代码 `ROLE_KEYS` |

---

## 与其他知识类型的关系

- **知识类型 1（战略）**：设计的战略依据，见 `content/01_strategy/`
- **知识类型 2（制度）**：设计落地的制度，见 `content/02_institution/`
- **知识类型 3（文档系统管理）**：本目录文档的治理规范，见 `content/03_doc_system/`
- **知识类型 5（AI coding）**：本目录设计的 AI coding 实践，见 `content/05_ai_coding/`
