---
title: "系统架构说明"
type: architecture
role: "[工程师]+[AI]"
last_updated: "2026-09-05"
version: "7.3"
status: active
related_files: [CLAUDE.md, content/04_web_design/]
---

# Architecture

> **定位：** 光华管理学院本科生党支部组织操作系统 — 核心架构说明
> **受众：** [工程师]+[AI]

---

## 一、项目概述

Org OS 是光华管理学院本科生党支部的组织运行操作系统。它将党支部制度文本（SOP）转化为可执行的代码工作流，并通过 Vibe Coding 模式由 AI 协作维护与迭代。

**核心命题**： 如何让一套制度文本持续驱动一个可运行的软件系统？

**答案**： SSOT（单一信息源）溯源治理 + AI 工具协作 + 版本日志追踪。

---

## 二、领域模型

### 条块概念 [工作表达]

- **条条**： 功能委员线（组织委员 / 宣传委员 / 纪检委员）
- **块块**： 党小组组长线（group1 / group2 / group3）

---

## 三、Vibe Coding 协作模式

系统通过 Vibe Coding 模式由 AI 协作维护与迭代——不依赖固定 Agent 群，而是由 AI 按需调用工具与 Skill 完成开发与治理任务。工具形态随开发阶段演进（当前：Trae IDE + Skill 工作流 + 周期任务机制），AI 工具的使用规律与使用建议见 [05 AI 协作方法论层 README](../05_ai_coding/README.md)（AI 协作方法论 5 分篇索引）与各 Skill 定义。

### 协作机制

| 机制 | 说明 | 权威源 |
|------|------|--------|
| Harness 工作流 | CLAUDE.md 甲乙丙三部：工作流、执行事项、待决策 | CLAUDE.md |
| 周期任务机制 | 周/月/季/年级自动唤醒任务（含 W4 专项评议循环） | [PROCESS_GUIDE.md §17](./PROCESS_GUIDE.md) |
| Skill 工作流 | 专项任务按 Skill 规范执行（SOP→代码、经验提炼、日志归档等） | [05 AI 协作方法论层 README](../05_ai_coding/README.md) |
| 文件角色分类 | `[用户]/[工程师]/[AI]` 三类受众 + 复合标记，AI 权限边界 | [ROLE_CLASSIFICATION.md](../02_institution/ROLE_CLASSIFICATION.md) |

### 任务优先级

架构治理 > 各工作形式运行（三会一课、主题党日、专班、共建活动、发展党员、考勤考察等） > 经验提炼

---

## 四、分层架构

> 文档按"5 类知识类型"组织（完整定义见 [OPERATIONS_GUIDE.md §1.1](./OPERATIONS_GUIDE.md#11-文档权威层级5-类知识类型)）。本节给出各层物理分布。

```
Layer 0: 核心层（最高权威）
  └─ CLAUDE.md                            [工程师]+[AI] 全局系统指令（Harness，最高层上下文入口）
  └─ content/03_doc_system/SSOT_INDEX.md  [AI] 母本注册表与溯源参考

Layer 1: 知识类型 1 — 战略（支部为什么存在、根本目标、战略路线）
  └─ content/01_strategy/                 [用户]+[AI] 战略路线与设计理念
      ├── DEVELOPMENT_PATH.md             [用户]+[AI] "管理事、服务人"战略
      ├── SECRETARY_DIRECTIVES.md     [用户]+[AI] 党支书工作交接文档（项目顶级战略文档）
      └── references/                     [用户] 参考材料与模板（合规文件/历史会议材料/建设探索）

Layer 2: 知识类型 2 — 制度（组织架构、分工、SOP）
  └─ content/02_institution/              [用户]+[AI] 组织制度层
      ├── sop/                            [用户]+[AI] 制度母本，所有代码逻辑的来源
      ├── COMMISSIONER_DUTY_FRAMEWORK.md       [用户]+[AI] 支委系统框架
      ├── FLAT_ORGANIZATION_DESIGN.md                  [用户]+[AI] 扁平化设计
      ├── ROLE_CLASSIFICATION.md          [用户]+[AI] 文件角色分类体系
      └── SYSTEM_ROLE_PERMISSION.md       [工程师]+[AI] 系统角色权限矩阵（代码键级权威）

Layer 3: 知识类型 3 — 文档系统治理（文档怎么治理、术语、运行标准）
  └─ content/03_doc_system/               [工程师]+[AI] 系统治理层
      ├── OPERATIONS_GUIDE.md             [工程师]+[AI] 运行标准·文档规范（§1-14）
      ├── PROCESS_GUIDE.md                [工程师]+[AI] 运行标准·流程机制（§15-18）
      ├── USAGE_POLICY.md                 [工程师]+[AI] 使用规范（术语+Emoji）
      ├── DOC_MAP.md                      [工程师]+[AI] 文档导航中心
      ├── SERVICE_CATALOG.md              [工程师]+[AI] 统一服务目录
      └── ARCHITECTURE.md                 [工程师]+[AI] 核心架构说明（本文件）

Layer 4: 知识类型 4+5 — 网站设计 + AI 编码
  └─ content/04_web_design/               [工程师]+[AI] 设计理念层（子目录：data/ 数据模型与数据流、design-system/ 全站规范、module/ 页面模块设计、deploy/ 部署与集成、evolution/ 演进契约与评估；逐文件清单与一句话说明见 content/04_web_design/README.md）
  └─ content/05_ai_coding/                [工程师]+[AI] AI 协作方法论层（唯一 AI 协作方法论层：README + 5 分篇 + DATA_CONSISTENCY_CHECKLIST）

Layer 5: 经验沉淀（跨多类知识类型）
  └─ content/insights/                    [用户]+[AI] 经验沉淀（双文件）

Layer 6: 实现层（代码实现与运行时）
  └─ docs/                                [用户]+[AI] 前端代码层（12 根 HTML + workspace/ 7 工作台 + ESM 模块化源码）
  └─ server/                              [工程师]+[AI] Node 一体化后端（Express + better-sqlite3）

Layer 7: 审计参考层（审计与参考）
  └─ .ctx/                                [AI]/[工程师]+[AI] 审计底座（logs/TIMESTAMPS/SNAPSHOT/REVIEW_QUEUE）
```

---

## 五、仓库结构

```
/
├── README.md                          [用户] 对外门面，最后编辑环节
├── CLAUDE.md                         [工程师]+[AI] 上下文入口（甲部 Harness + 乙部执行 + 丙部待决策）
├── server/                            [工程师]+[AI] Node 一体化后端（Express + better-sqlite3）
│   ├── server.js / app.js / db.js / seed.js   [工程师]+[AI] 后端核心
│   ├── routes/                        [工程师]+[AI] auth / committee / member / report / resources / uploads
│   └── test/                          [工程师]+[AI] 测试
├── docs/                              [工程师]+[AI] 前端代码层（12 根 HTML + workspace/ 7 工作台 + ESM 模块化源码）
│   ├── index.html                     [用户]+[AI] 主页（通知/招募/活动日历/待办）
│   ├── notice.html                    [用户]+[AI] 通知独立页
│   ├── about.html                     [用户]+[AI] 支部的故事
│   ├── archive.html                   [用户]+[AI] 归档库
│   ├── search.html                    [用户]+[AI] 资料查询
│   ├── feedback.html                  [用户]+[AI] 意见反馈
│   ├── help.html                      [用户]+[AI] 系统说明书
│   ├── login.html                     [用户]+[AI] 登录页
│   ├── activity.html                  [用户]+[AI] 活动详情独立页（访客动态 / 通知直达详情）
│   ├── taskforce.html                 [用户]+[AI] 专班详情独立页（通知直达详情）
│   ├── wizard.html                    [用户]+[AI] 换组织向导独立页（书记/副书记本支部、党委任意支部；5 步换壳）
│   ├── settings.html                  [用户]+[AI] 设置中心（外观/我的工作台/支部治理·域参数，按登录角色分区）
│   ├── workspace/                     [用户]+[AI] 角色工作台页面（7 个 HTML）
│   │   ├── secretary.html             [用户]+[AI] 书记工作台（工作台+赋权管理+issue管理+通知发布+待办）
│   │   ├── leader.html                [用户]+[AI] 党小组组长工作台（活动写入+考勤上传+考察上传+复盘提交+待办）
│   │   ├── org.html                   [用户]+[AI] 组织委员工作台（考察上传+专班管理+人才库+发展党员+待办）
│   │   ├── prop.html                  [用户]+[AI] 宣传委员工作台（宣传任务+项目看板+档案归档+周报报送+待办）
│   │   ├── disc.html                  [用户]+[AI] 纪检委员工作台（考勤管理+监督复盘+考察管理+补课制度+公邮管理+待办）
│   │   ├── visitor.html               [用户]+[AI] 成员工作台（含待办）
│   │   └── party-committee.html       [工程师]+[AI] 党委后台工作台（支部实例+书记任命+上报审批，P1-P3）
│   └── src/                           [工程师]+[AI] ESM 模块化源码
│       ├── entries/                   [工程师]+[AI] 页面入口（基础页 entry + ws-* 工作台入口 + tabs/ 角色 Tab，非全量）
│       ├── components/                [工程师]+[AI] 共享组件（含 todo-list/custom-select/tab-bar/workspace-shell 等，非全量）
│       ├── core/                      [工程师]+[AI] 核心工具（含 domain/data-adapter/api-adapter/mock-adapter 等，非全量）
│       ├── services/                  [工程师]+[AI] 服务层（含 todo/auth/notice/decision-tree 等，非全量）
│       ├── mock/                      [工程师]+[AI] Mock 数据（accounts/seed/thought-reports 等，非全量）
│       ├── modules/                   [工程师]+[AI] 业务模块（references + help-catalog + capabilities/ 能力清单，非全量）
│       ├── workflow/                  [工程师]+[AI] 工作流引擎（definitions/engine/renderer/sop 等，非全量）
│       └── styles.css                 [工程师]+[AI] 全局样式（各子目录全量清单以 docs/src/ 实际文件为准）
│
├── .markdownlint.json                 [工具] 代码风格规范
│
├── content/                           [用户]+[AI] 内容中心（按 5 类知识类型组织，见第四章）
│   ├── 01_strategy/                  [用户]+[AI] 战略层（支部为什么存在、根本目标、战略路线）
│   │   ├── DEVELOPMENT_PATH.md       [用户]+[AI] "管理事、服务人"战略
│   │   ├── SECRETARY_DIRECTIVES.md [用户]+[AI] 党支书工作交接文档（项目顶级战略文档，17 条论断）
│   │   ├── README.md                 [用户]+[AI] 战略层目录索引
│   │   └── references/               [用户] 参考材料与模板（合规文件/历史会议材料/建设探索）
│   ├── 02_institution/               [用户]+[AI] 制度层（组织架构、分工、SOP）
│   │   ├── sop/                      [用户]+[AI] 制度母本层（所有代码逻辑的来源）
│   │   │   ├── INDEX.md              [用户]+[AI] SOP 导航目录
│   │   │   ├── 常见工作场景快速指南.md [用户]+[AI] 快速使用指南
│   │   │   ├── 支委与党小组定人定责定岗说明.md [用户]+[AI] 职责分工文档
│   │   │   ├── 宣传委员工作流程指南.md [用户]+[AI] 宣传委员 SOP
│   │   │   ├── 组织委员工作流程指南.md [用户]+[AI] 组织委员 SOP
│   │   │   ├── 纪检委员工作流程指南.md [用户]+[AI] 纪检委员 SOP
│   │   │   └── 党小组组长工作手册.md   [用户]+[AI] 党小组组长操作指南
│   │   ├── COMMISSIONER_DUTY_FRAMEWORK.md [用户]+[AI] 支委系统框架
│   │   ├── FLAT_ORGANIZATION_DESIGN.md            [用户]+[AI] 扁平化设计
│   │   ├── ROLE_CLASSIFICATION.md    [用户]+[AI] 文件角色分类体系
│   │   ├── SYSTEM_ROLE_PERMISSION.md [工程师]+[AI] 系统角色权限矩阵（角色键全表 + 权限矩阵，代码键级权威）
│   │   └── README.md                 [用户]+[AI] 制度层目录索引
│   ├── 03_doc_system/                [工程师]+[AI] 文档系统治理层（文档怎么治理、术语、运行标准）
│   │   ├── SSOT_INDEX.md             [AI] 母本注册表与溯源参考
│   │   ├── OPERATIONS_GUIDE.md       [工程师]+[AI] 运行标准·文档规范（§1-14）
│   │   ├── PROCESS_GUIDE.md          [工程师]+[AI] 运行标准·流程机制（§15-18）
│   │   ├── USAGE_POLICY.md           [工程师]+[AI] 使用规范（术语+Emoji）
│   │   ├── DOC_MAP.md                [工程师]+[AI] 文档导航中心
│   │   ├── SERVICE_CATALOG.md        [工程师]+[AI] 统一服务目录
│   │   ├── ARCHITECTURE.md           [工程师]+[AI] 核心架构说明（本文件）
│   │   ├── 工作模板/                  [用户]+[AI] 经验沉淀辅助提示词
│   │   └── README.md                 [工程师]+[AI] 文档系统治理层目录索引
│   ├── 04_web_design/                [工程师]+[AI] 网站设计层（设计理念与思路档案）
│   │   ├── data/                      [工程师]+[AI] 数据权威（DATA_MODEL 静态模型 / DATA_FLOW 数据流）
│   │   ├── design-system/             [工程师]+[AI] 全站通用规范（DESIGN_SYSTEM / COLOR_SYSTEM / COMPONENT_SPEC / CLICK_ROUTING）
│   │   ├── module/                    [工程师]+[AI] 页面与模块设计（SOP_WEBSITE_GUIDE / MODULE_UI_DESIGN / ABOUT_PAGE_DESIGN / AGENDA_AND_REFERENCE_DESIGN）
│   │   ├── deploy/                    [工程师]+[AI] 部署与集成设计（DEPLOYMENT_GUIDE / AUTHENTICATION_MODEL / WECHAT_INTEGRATION / PKU_PARTY_INTEGRATION）
│   │   ├── evolution/                 [工程师]+[AI] 演进、契约与评估（ARCHITECTURE_EVOLUTION / WORKFLOW_BLOCK_CONTRACT / BRANCH_WORK_MAP / PARTY_COMMITTEE_DESIGN / ROLE_PERMISSION_DESIGN / DESIGN_METHODOLOGY；工程化评估已迁 .ctx/ENGINEERING_ASSESSMENT.md（2026-09-08 迁入、2026-09-09 更名））
│   │   └── README.md                 [工程师]+[AI] 网站设计层目录索引（逐文件一句话说明）
│   ├── 05_ai_coding/                 [工程师]+[AI] AI 协作方法论层（唯一 AI 协作方法论层：README + 5 分篇 + DATA_CONSISTENCY_CHECKLIST）
│   │   ├── README.md                         [工程师]+[AI] AI 协作方法论层目录索引（层索引表 + 分流来源声明）
│   │   ├── FILE_OPERATION_RULES.md           [工程师]+[AI] 文件操作纪律分篇（原 §1/§3/§6/§13/§14/§18）
│   │   ├── TEST_AND_VERIFICATION.md         [工程师]+[AI] 测试验证纪律分篇（原 §11/§12/§15/§16/§17/§19；含数据同源一致性校验节）
│   │   ├── DOCUMENT_GOVERNANCE.md           [工程师]+[AI] 文档治理与一改具改分篇（原 §2/§7/§10）
│   │   ├── CONTEXT_MANAGEMENT.md            [工程师]+[AI] 上下文管理与防失忆分篇（原 §4/§8/§9；read_strategy: active）
│   │   ├── REVIEW_AND_EXPRESSION.md         [工程师]+[AI] 评议与表达纪律分篇（原 §5）
│   │   └── DATA_CONSISTENCY_CHECKLIST.md    [工程师]+[AI] 数据同源一致性校验手册（工程质检纪律，2026-09-04 自 04 evolution 迁入）
│   ├── insights/                     [用户]+[AI] 经验沉淀（党建实务保留）
│   │   ├── README.md                 [用户]+[工程师] 经验沉淀层目录索引（含 2026-09-04 工程方法论分流承接声明）
│   │   └── 党支部管理与实务经验沉淀.md [用户]+[AI] 按 5 类知识类型组织的经验沉淀（党建实务）
│   └── README.md                     [用户]+[AI] 内容中心索引
│
├── .ctx/                              [AI] 运行时上下文（审计底座）
│   ├── TIMESTAMPS.md                  [工程师]+[AI] 文件时间戳注册表
│   ├── SNAPSHOT.md                    [AI] 当前基线快照
│   ├── REVIEW_QUEUE.md                [工程师]+[AI] 书记评议队列
│   ├── ENGINEERING_ASSESSMENT.md     [工程师]+[AI] 工程化评估与改造行动线（原 MODULARIZATION_ASSESSMENT；2026-09-08 自 04_web_design/evolution 迁入、2026-09-09 更名，评估职能归审计底座）
│   ├── snapshots/                     [AI] 历史快照归档
│   └── logs/                          [工程师]+[AI] 月度执行日志与决策日志
│       ├── archive/                   [工程师]+[AI] 历史日志归档
│       ├── EXECUTION_LOG_INDEX.md     [工程师]+[AI] 日志导航索引
│       ├── YYYY-MM-EXECUTION_LOG.md   [工程师]+[AI] 月度执行日志
│       └── YYYY-MM-DECISION_LOG.md    [工程师]+[AI] 月度决策日志
```

---

## 六、数据模型

### Activity（活动记录）

> **字段级定义见权威源**：[DATA_MODEL.md](../04_web_design/data/DATA_MODEL.md) §2.1（Activity 全量字段主表；status 存储字面值为 `draft`/`published`/`ongoing`/`completed`/`cancelled` 五态——含 `cancelled`，见 [domain.js:16](../../docs/src/core/domain.js) 与 DATA_MODEL §2.1 字段表，展示一律用生命周期派生态；组织者由 `assignments` 主源派生）与 [DATA_FLOW.md](../04_web_design/data/DATA_FLOW.md)（数据流权威）。本处只记架构语义，不复刻字段表，避免双载体漂移。

mockDB 为唯一数据源，所有视图经 Service 层读取；按角色过滤经 `services/auth.js`（以 `activity.assignments` 为主源，`syncProjectRoles()` 保证与顶层 organizer 一致）。

### Task（任务）

> **字段级定义见权威源**：[DATA_MODEL.md](../04_web_design/data/DATA_MODEL.md) §2.12（任务数据字段）。任务与所属活动、分工记录的关系同上，UI 不直接操作 `mockDB.tasks`。

### Storage Model

- **键名**： `workflowos_branch_db_v1`（`localStorage`，见 `docs/src/services/mock.js`）
- **版本防御**： `loadDB()` 检查 `_schema !== SCHEMA_VERSION` 时拒绝脏数据并 `console.warn`
- **根结构完整键表见权威源**：[DATA_FLOW.md](../04_web_design/data/DATA_FLOW.md) §4.2.1（存储键/字段/版本校验全量清单），本处不复刻。

---

## 七、依赖链与数据变更规则

### 依赖链

```
content/02_institution/sop/ → docs/src/workflow/ → core/constants/utils → services → state → components → entries/main-entry.js → UI
```

所有 mutation 必须经过 Service 层；UI 层禁止直接操作 `mockDB`。

### 数据变更规则

**所有数据变更必须经过 Service 层。**

**禁止操作（Service 层之外）**：
- `mockDB` 直接变更（例如 `.push()`、直接赋值）
- `localStorage` 直接写入（`localStorage.setItem`）

**允许写入操作（通过 API）**：
- `BranchService.createActivity()`
- `BranchService.updateActivity()`
- `BranchService.archiveActivity()`
- `BranchService.createTask()`
- `BranchService.toggleTaskStatus()`

**读取操作例外**： 为避免过度限制并确保渲染性能，读取操作（list、get）可直接从 `mockDB` 读取，但优先使用 Service 层访问以确保严格一致性。

---

## 八、SSOT 双向变更流水线

> **定位：** 定义"制度文本（SSOT 母本）→ 代码（docs/src/）"的双向变更传播链路与溯源铁律——上游改制度如何落到代码、代码改如何回流登记，以及每次修改必须输出的溯源要素。

```
                    ┌─────────────────────────────────┐
                    │  CLAUDE.md                       │ ← 核心层（治理起点）
                    │  SSOT_INDEX.md                   │ ← 母本注册表
                    └──────────────┬──────────────────┘
                                   │ 溯源校验
                                   ▼
                          content/02_institution/sop/*.md
                          文本母本层
                                   │ 下游传播
                                   ▼
                          docs/src/workflow/
                          代码内容层
                                   │
                                   ▼
                    ┌─────────────────────────┐
                    │  docs/src/*  (service + UI)   │ ← 运行时层
                    │  docs/index.html              │
                    └─────────────────────────┘
```

### 溯源铁律

修改子本前必须先查母本。子本变更若无法指向母本 → 禁止写盘。

### 适用规则（Gate Check）

- 修改 `docs/src/workflow/` 或更下层前，必须确认母本 `content/02_institution/sop/` 已更新
- 修改 Skill 定义前，必须确认 `SSOT_INDEX.md` 注册表已同步
- 跨层修改须先完成上层确认方可推进下层

### Change Trace 四要素（修改 docs/src/ 或 docs/index.html 前必须输出）

1. `SSOT source`: 母本变更依据（引用 `SSOT_INDEX.md` 注册表链路）
2. `SOP impact`: 本次 SOP 变更情况（引用 `content/02_institution/sop/` 具体文件与条款，无变化写 `none`）
3. `Schema impact`: 数据结构变更情况（无变化写 `none`）
4. `Service impact`: 服务层方法变更情况（无变化写 `none`）

---

## 九、快速导航

| 我需要... | 去哪里 |
|----------|--------|
| 快速了解项目 | README.md |
| 看待办任务 | CLAUDE.md 乙部（具体执行事项） |
| 查全局系统指令 | CLAUDE.md |
| 查母本链路 | SSOT_INDEX.md |
| 查审查状态 | .ctx/SNAPSHOT.md |
| 查 SOP 流程 | content/02_institution/sop/INDEX.md |
| 查执行日志 | .ctx/logs/YYYY-MM-EXECUTION_LOG.md |
| 取用工作模板 | content/03_doc_system/工作模板/ |
| 提交改进反馈 | docs/feedback.html（在线反馈入口） |
| 查官方合规文件 | content/01_strategy/references/合规文件/ |
