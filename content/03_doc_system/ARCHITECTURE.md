---
title: "架构与单一事实源"
type: architecture
role: "[工程师]+[AI]"
last_updated: "2026-09-28"
version: "7.3"
status: active
related_files: [CLAUDE.md, content/03_doc_system/DOC_MAP.md, content/02_institution/SYSTEM_ROLE_PERMISSION.md, content/04_web_design/]
---

# 架构与单一事实源

> **总述：** 本文是系统**架构与单一事实源**的唯一权威源，回答三件事——① **系统怎么分层、物理分布在哪**（§四 分层架构 / §五 仓库结构）；② **母本/子本关系怎么注册、变更怎么传播**（§八 SSOT 双向变更流水线 / §十 单一事实源注册表与权威源治理）；③ **系统有哪些服务、谁有权限**（§十一 统一服务目录与角色-服务权限矩阵）。三分互为依据：分层架构是物理承载，注册表规定「谁是母本、冲突以谁为准」，服务目录把架构与制度落成可盘的实现清单——任一处改动的溯源链路都回 §八 与 §十。
> **受众：** [工程师]+[AI]
> **本文不回答**：① **沿革与「哪一批做了什么」** → `.ctx/logs/YYYY-MM-EXECUTION_LOG.md`；② **数据结构与数据流（实体字段表 / 枚举 / 表结构）** → [DATA_MODEL.md](../04_web_design/data/DATA_MODEL.md)；③ **系统角色权限矩阵（角色键级权威）** → [SYSTEM_ROLE_PERMISSION.md](../02_institution/SYSTEM_ROLE_PERMISSION.md)；④ **文档导航与权威层级定义** → [DOC_MAP.md](./DOC_MAP.md) 与 [OPERATIONS_GUIDE.md §1.1](./OPERATIONS_GUIDE.md)；⑤ **术语与使用规范 / 文件角色分类** → [OPERATIONS_GUIDE.md](./OPERATIONS_GUIDE.md)（《运行与协作规范》：§19 术语 / §20 AI 展开 / §21 Emoji / §24–§31 文件角色分类）；⑥ **前端设计规范** → [DESIGN_SYSTEM.md](../04_web_design/design-system/DESIGN_SYSTEM.md)。

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
| 周期任务机制 | 周/月/季/年级自动唤醒任务（含 W4 专项评议循环） | [OPERATIONS_GUIDE.md §17](./OPERATIONS_GUIDE.md) |
| Skill 工作流 | 专项任务按 Skill 规范执行（SOP→代码、经验提炼、日志归档等） | [05 AI 协作方法论层 README](../05_ai_coding/README.md) |
| 文件角色分类 | `[用户]/[工程师]/[AI]` 三类受众 + 复合标记，AI 权限边界 | [OPERATIONS_GUIDE.md §24–§31](./OPERATIONS_GUIDE.md) |

### 任务优先级

架构治理 > 各工作形式运行（三会一课、主题党日、专班、共建活动、发展党员、考勤考察等） > 经验提炼

---

## 四、分层架构

> 文档按"5 类知识类型"组织（完整定义见 [OPERATIONS_GUIDE.md §1.1](./OPERATIONS_GUIDE.md#11-文档权威层级5-类知识类型)）。本节给出各层物理分布。

```
Layer 0: 核心层（最高权威）
  └─ CLAUDE.md                            [工程师]+[AI] 全局系统指令（Harness，最高层上下文入口）
  └─ content/03_doc_system/ARCHITECTURE.md [工程师]+[AI] 架构与单一事实源（母本注册表见 §十、服务目录见 §十一）

Layer 1: 知识类型 1 — 战略（支部为什么存在、根本目标、战略路线）
  └─ content/01_strategy/                 [用户]+[AI] 战略路线与设计理念
      ├── DEVELOPMENT_PATH.md             [用户]+[AI] "管理事、服务人"战略
      ├── SECRETARY_DIRECTIVES.md     [用户]+[AI] 党支书工作交接文档（项目顶级战略文档）
      └── references/                     [用户] 参考材料与模板（合规文件/历史会议材料/建设探索）

Layer 2: 知识类型 2 — 制度（组织架构、分工、SOP）
  └─ content/02_institution/              [用户]+[AI] 组织制度层
      ├── sop/                            [用户]+[AI] 制度母本，所有代码逻辑的来源
      ├── COMMISSIONER_DUTY_FRAMEWORK.md       [用户]+[AI] 支部组织与委员体系（含扁平化设计 §G）
      └── SYSTEM_ROLE_PERMISSION.md       [工程师]+[AI] 系统角色权限矩阵（代码键级权威）

Layer 3: 知识类型 3 — 文档系统治理（文档怎么治理、术语、运行标准）
  └─ content/03_doc_system/               [工程师]+[AI] 系统治理层
      ├── ARCHITECTURE.md                 [工程师]+[AI] 架构与单一事实源（分层架构 + 单一事实源注册表 + 统一服务目录，本文件）
      ├── OPERATIONS_GUIDE.md             [工程师]+[AI] 运行与协作规范（§1–§14 文档规范 ＋ §15–§18 流程机制 ＋ §19–§23 使用规范 ＋ §24–§31 文件角色分类体系；2026-09-26 批次 202 四份合一并迁入 `02_institution/ROLE_CLASSIFICATION`）
      └── DOC_MAP.md                      [工程师]+[AI] 文档导航中心

Layer 4: 知识类型 4+5 — 网站设计 + AI 编码
  └─ content/04_web_design/               [工程师]+[AI] 设计理念层（子目录：data/ 数据模型与数据流、design-system/ 全站规范、module/ 页面模块设计、deploy/ 部署与集成、evolution/ 演进契约与评估；逐文件清单与一句话说明见 content/04_web_design/README.md）
  └─ content/05_ai_coding/                [工程师]+[AI] AI 协作方法论层（唯一 AI 协作方法论层：README + 5 分篇 + DATA_CONSISTENCY_CHECKLIST）

Layer 5: 经验沉淀（跨多类知识类型）
  └─ content/insights/                    [用户]+[AI] 经验沉淀（双文件）

Layer 6: 实现层（代码实现与运行时）
  └─ docs/                                [用户]+[AI] 前端代码层（根页面 + 工作台 + ESM 模块化源码，页面清单以 docs/ 实测为准）
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
├── docs/                              [工程师]+[AI] 前端代码层（根页面 + 工作台 + ESM 模块化源码，页面清单以 docs/ 实测为准）
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
│   ├── wizard.html                    [用户]+[AI] 换组织向导独立页（支书/副支书本支部、党委任意支部；5 步换壳）
│   ├── settings.html                  [用户]+[AI] 设置中心（外观/我的工作台/支部治理·域参数，按登录角色分区）
│   ├── workspace/                     [用户]+[AI] 角色工作台页面（HTML，清单见下）
│   │   ├── secretary.html             [用户]+[AI] 支书工作台（工作台+赋权管理+issue管理+通知发布+待办）
│   │   ├── leader.html                [用户]+[AI] 党小组组长工作台（活动写入+考勤上传+考察上传+复盘提交+待办）
│   │   ├── org.html                   [用户]+[AI] 组织委员工作台（考察上传+专班管理+人才库+发展党员+待办）
│   │   ├── prop.html                  [用户]+[AI] 宣传委员工作台（宣传任务+项目看板+档案归档+周报报送+待办）
│   │   ├── disc.html                  [用户]+[AI] 纪检委员工作台（考勤管理（含补课分段）+监督复盘+考察管理+知情查看+待办）
│   │   ├── visitor.html               [用户]+[AI] 成员工作台（含待办）
│   │   └── party-committee.html       [工程师]+[AI] 党委后台工作台（支部实例+支书任命+上报审批，P1-P3）
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
│   │   ├── SECRETARY_DIRECTIVES.md [用户]+[AI] 党支书工作交接文档（项目顶级战略文档，论断清单以文件实际为准）
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
│   │   ├── COMMISSIONER_DUTY_FRAMEWORK.md [用户]+[AI] 支部组织与委员体系（含扁平化设计 §G）
│   │   ├── SYSTEM_ROLE_PERMISSION.md [工程师]+[AI] 系统角色权限矩阵（角色键全表 + 权限矩阵，代码键级权威）
│   │   └── README.md                 [用户]+[AI] 制度层目录索引
│   ├── 03_doc_system/                [工程师]+[AI] 文档系统治理层（文档怎么治理、术语、运行标准）
│   │   ├── ARCHITECTURE.md           [工程师]+[AI] 架构与单一事实源（本文件）
│   │   ├── OPERATIONS_GUIDE.md       [工程师]+[AI] 运行与协作规范（§1–§14 文档规范 ＋ §15–§18 流程机制 ＋ §19–§23 使用规范 ＋ §24–§31 文件角色分类体系）
│   │   ├── DOC_MAP.md                [工程师]+[AI] 文档导航中心
│   │   ├── 工作模板/                  [用户]+[AI] 经验沉淀辅助提示词
│   │   └── README.md                 [工程师]+[AI] 文档系统治理层目录索引
│   ├── 04_web_design/                [工程师]+[AI] 网站设计层（设计理念与思路档案）
│   │   ├── data/                      [工程师]+[AI] 数据权威（DATA_MODEL 数据模型与数据流）
│   │   ├── design-system/             [工程师]+[AI] 全站通用规范（DESIGN_SYSTEM：设计哲学/色彩/排版/组件/交互/响应式/深色/资产/点击落点）
│   │   ├── module/                    [工程师]+[AI] 页面与模块设计（SOP_WEBSITE_GUIDE / MODULE_UI_DESIGN / ABOUT_PAGE_DESIGN / AGENDA_AND_REFERENCE_DESIGN）
│   │   ├── deploy/                    [工程师]+[AI] 部署与集成设计（DEPLOYMENT_GUIDE）
│   │   ├── evolution/                 [工程师]+[AI] 演进、契约与评估（ARCHITECTURE_EVOLUTION / WORKFLOW_BLOCK_CONTRACT / BRANCH_WORK_MAP / PARTY_COMMITTEE_DESIGN / ROLE_PERMISSION_DESIGN / DESIGN_METHODOLOGY；工程化评估见 .ctx/ENGINEERING_ASSESSMENT.md）
│   │   └── README.md                 [工程师]+[AI] 网站设计层目录索引（逐文件一句话说明）
│   ├── 05_ai_coding/                 [工程师]+[AI] AI 协作方法论层（唯一 AI 协作方法论层：README + 5 分篇 + DATA_CONSISTENCY_CHECKLIST）
│   │   ├── README.md                         [工程师]+[AI] AI 协作方法论层目录索引（层索引表 + 分流来源声明）
│   │   ├── FILE_OPERATION_RULES.md           [工程师]+[AI] 文件操作纪律分篇
│   │   ├── TEST_AND_VERIFICATION.md         [工程师]+[AI] 测试验证纪律分篇（含数据同源一致性校验节）
│   │   ├── DOCUMENT_GOVERNANCE.md           [工程师]+[AI] 文档治理与一改具改分篇
│   │   ├── CONTEXT_MANAGEMENT.md            [工程师]+[AI] 上下文管理与防失忆分篇（read_strategy: active）
│   │   ├── REVIEW_AND_EXPRESSION.md         [工程师]+[AI] 评议与表达纪律分篇
│   │   └── DATA_CONSISTENCY_CHECKLIST.md    [工程师]+[AI] 数据同源一致性校验手册（工程质检纪律）
│   ├── insights/                     [用户]+[AI] 经验沉淀（党建实务保留）
│   │   ├── README.md                 [用户]+[工程师] 经验沉淀层目录索引
│   │   └── 党支部管理与实务经验沉淀.md [用户]+[AI] 按 5 类知识类型组织的经验沉淀（党建实务）
│   └── README.md                     [用户]+[AI] 内容中心索引
│
├── .ctx/                              [AI] 运行时上下文（审计底座）
│   ├── TIMESTAMPS.md                  [工程师]+[AI] 文件时间戳注册表
│   ├── SNAPSHOT.md                    [AI] 当前基线快照
│   ├── REVIEW_QUEUE.md                [工程师]+[AI] 支书评议队列
│   ├── ENGINEERING_ASSESSMENT.md     [工程师]+[AI] 工程化评估与改造行动线（评估职能归审计底座）
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

> **字段级定义见权威源**：[DATA_MODEL.md](../04_web_design/data/DATA_MODEL.md) §2.1（Activity 全量字段主表；status 存储字面值为 `draft`/`published`/`ongoing`/`completed`/`cancelled` 五态——含 `cancelled`，见 [domain.js:16](../../docs/src/core/domain.js) 与 DATA_MODEL §2.1 字段表，展示一律用生命周期派生态；组织者由 `assignments` 主源派生）与 [DATA_MODEL.md §第二部分](../04_web_design/data/DATA_MODEL.md)（数据流权威）。本处只记架构语义，不复刻字段表，避免双载体未同步。

mockDB 为唯一数据源，所有视图经 Service 层读取；按角色过滤经 `services/core/auth.js`（以 `activity.assignments` 为主源，`syncProjectRoles()` 保证与顶层 organizer 一致）。

### Task（任务）

> **字段级定义见权威源**：[DATA_MODEL.md](../04_web_design/data/DATA_MODEL.md) §2.12（任务数据字段）。任务与所属活动、分工记录的关系同上，UI 不直接操作 `mockDB.tasks`。

### Storage Model

- **键名**： `workflowos_branch_db_v1`（`localStorage`，见 `docs/src/services/core/mock.js`）
- **版本防御**： `loadDB()` 检查 `_schema !== SCHEMA_VERSION` 时拒绝脏数据并 `console.warn`
- **根结构完整键表见权威源**：[DATA_MODEL.md §4.2.1](../04_web_design/data/DATA_MODEL.md)（存储键/字段/版本校验全量清单），本处不复刻。

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

> **定位：** 定义"制度文本（SSOT 母本）→ 代码（docs/src/）"的双向变更传播链路与溯源铁律——上游改制度如何落到代码、代码改如何回流登记，以及每次修改必须输出的溯源要素。母本子本关系的完整注册见 §十。

```
                    ┌─────────────────────────────────┐
                    │  CLAUDE.md                       │ ← 核心层（治理起点）
                    │  本文 §十 母本注册表              │ ← 母本注册表
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
- 修改 Skill 定义前，必须确认 §十 注册表已同步
- 跨层修改须先完成上层确认方可推进下层

### Change Trace 四要素（修改 docs/src/ 或 docs/index.html 前必须输出）

1. `SSOT source`: 母本变更依据（引用 §十 注册表链路）
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
| 查母本链路 | 本文 §十（单一事实源注册表） |
| 查服务清单与服务粒度权限切面 | 本文 §十一 |
| 查审查状态 | .ctx/SNAPSHOT.md |
| 查 SOP 流程 | content/02_institution/sop/INDEX.md |
| 查执行日志 | .ctx/logs/YYYY-MM-EXECUTION_LOG.md |
| 取用工作模板 | content/03_doc_system/工作模板/ |
| 提交改进反馈 | docs/feedback.html（在线反馈入口） |
| 查官方合规文件 | content/01_strategy/references/合规文件/ |

---

## 十、单一事实源注册表与权威源治理

### 10.1 定位

本文件（§十）是全工作区母本子本关系的**完整注册表**——所有"哪个文件是哪个文件的母本"的级联关系都在此注册。

**与相关文件的关系**（参见 [CLAUDE.md H30.2](../../CLAUDE.md#h302-设计母本与子本)）：
- **CLAUDE.md H30.2**：提炼5条核心原则（制度→代码 / 理论→工程 / 路线图→执行 / 经验→沉淀 / 术语→全仓）
- **本文 §十（单一事实源注册表）**：注册全部约25条级联关系，是母本子本关系的唯一权威注册表
- **OPERATIONS_GUIDE.md §1.1**：定义文档权威层级（5 类知识类型）与冲突裁决规则
- **DOC_MAP.md**：按目录结构组织的导航图，标注每个文件的权威层级

三者关系：H30.2 提炼核心原则 → 本文 §十 注册全部关系 → OPERATIONS_GUIDE §1.1 定义层级 → DOC_MAP 标注层级。

---

### 10.2 注册表映射

> 按 5 类知识类型（见 [OPERATIONS_GUIDE.md §1.1](./OPERATIONS_GUIDE.md)）组织。每条关系标注母本→子本及同步规则。

#### 根目录 → content/ 各知识类型

| 母本 | 子本 | 同步规则 |
|------|------|---------|
| `CLAUDE.md` 甲部 H30.2 | `content/01_strategy/`、`content/04_web_design/`、`content/03_doc_system/` | Harness 是 guides 的摘要和索引（非副本）。甲部保留核心原则+判例，详细设计归 guides。甲部引用的原则变更必须同步更新 guides |
| `CLAUDE.md` 乙部 | `.ctx/logs/YYYY-MM-EXECUTION_LOG.md` | 路线图→执行。完成事项从乙部删除，写入执行日志 |
| `SECRETARY_DIRECTIVES.md` | `CLAUDE.md` H90（外部权威源索引） | 党支书工作交接文档是理论基石的母本。新增论断时同步更新 CLAUDE.md H90 索引表 |
| `SECRETARY_DIRECTIVES.md` | `content/01_strategy/DEVELOPMENT_PATH.md` | 理论基石→战略展开。党支书工作交接文档是母本（木本），DEVELOPMENT_PATH 是子本（AI 扩充的战略叙事）。冲突时以 SECRETARY_DIRECTIVES 为准 |
| `SECRETARY_DIRECTIVES.md` | `content/02_institution/COMMISSIONER_DUTY_FRAMEWORK.md §G` | 理论基石→制度设计。扁平化论断（P-009/P-010）的母本；§G 扁平化设计是子本展开 |
| `本文 §十` | `本文 §一~§八（架构主体）` | 注册表是架构说明的溯源参考 |

#### content/ 内部及交叉（strategy ↔ institution ↔ doc_system ↔ web_design ↔ insights）

| 母本 | 子本 | 同步规则 |
|------|------|---------|
| `content/01_strategy/DEVELOPMENT_PATH.md` | `content/04_web_design/data/DATA_MODEL.md §第二部分（数据流）` | 战略→设计。DEVELOPMENT_PATH 是上游战略依据，DATA_MODEL 的数据流部分是数据流设计的落地 |
| `content/01_strategy/DEVELOPMENT_PATH.md` | `content/02_institution/COMMISSIONER_DUTY_FRAMEWORK.md §G` | 战略→设计。§G 扁平化设计是"理解真实"认知的具体实现。冲突时以 DEVELOPMENT_PATH 为准 |
| `content/04_web_design/data/DATA_MODEL.md §3（参与者数据流设计）` | `content/02_institution/COMMISSIONER_DUTY_FRAMEWORK.md` | 数据流→支委系统。DATA_MODEL §3 定义三级参与者数据流，COMMISSIONER_DUTY_FRAMEWORK 细化支委系统设计 |
| `content/04_web_design/module/SOP_WEBSITE_GUIDE.md` | `content/02_institution/sop/*.md`（双向） | 双向修改规则（CLAUDE.md H30.2 制度→代码）。规则0：文本SOP是母本；规则2：先改SOP母本→再改系统代码→验证 |
| `content/insights/党支部管理与实务经验沉淀.md` | `content/01_strategy/`、`content/04_web_design/` | 经验→设计反馈。insights 是经验沉淀，可反哺战略和设计校准。当经验与战略冲突时提交支书决策 |

#### content/ → docs/src/（设计/制度 → 代码）

| 母本 | 子本 | 同步规则 |
|------|------|---------|
| `content/02_institution/sop/*.md` | `docs/src/workflow/`、`docs/src/` | 制度→代码（H30.2 规则1）。SOP 制度文本是系统代码的母本。凡涉及流程步骤、术语、权限规则，必须先检查 content/02_institution/sop/ |
| `content/04_web_design/data/DATA_MODEL.md §3（参与者数据流设计）` | `docs/src/`（角色权限引擎） | 设计→代码。数据流架构定义角色数据流与登录态说明（§3.4，已实现登录态），代码实现设计 |
| `content/02_institution/COMMISSIONER_DUTY_FRAMEWORK.md` | `docs/src/`（专班管理 + 审批流程） | 设计→代码。支委系统设计定义专班管理逻辑和§审批流程规范，代码实现 |
| `content/04_web_design/design-system/DESIGN_SYSTEM.md` | `docs/src/styles.css`、`docs/src/components/*` | 设计→样式/代码。设计系统是全局样式与各组件实现的母本（查色值见 §二，写组件见 §四，点击落点见 §十） |
| `content/04_web_design/module/MODULE_UI_DESIGN.md` | `docs/src/components/record/calendar.js` | 设计→代码。日历功能规划是日历渲染引擎的母本 |
| `content/04_web_design/data/DATA_MODEL.md` | `docs/src/core/domain.js` | 数据→代码。数据字段定义权威源（含§写入数据验证设计），代码中的数据结构必须与 DATA_MODEL.md 一致 |
| `content/04_web_design/data/DATA_MODEL.md §3.4（登录态说明）` | `docs/src/core/state.js` | 设计→代码。DATA_MODEL §3.4 登录态说明是状态中心登录逻辑的母本 |
| `content/04_web_design/data/DATA_MODEL.md §3.4（登录态说明）` | `docs/src/services/core/auth.js`（未来） | 设计→代码（预留）。登录系统设计前置规范定义未来登录系统的用户身份模型和认证机制 |
| `content/04_web_design/data/DATA_MODEL.md §3（参与者数据流设计）` | `docs/src/services/core/auth.js` | 设计→代码。DATA_MODEL §3 定义角色数据流模型，auth.js 实现 `getUserProjectRoles` / `hasProjectRole` / `getAccessibleWorkspacePages` 三个公开 API（含 `getPageForRole` 内部映射） |
| `content/04_web_design/module/MODULE_UI_DESIGN.md` | `docs/index.html`（Module 4） | 设计→代码。模块界面设计是工作台模块 UI 的母本 |
| `本文 §十一（服务目录）` | `docs/src/entries/*.js` | 治理→代码。服务清单是各入口文件服务实现的母本 |

#### doc_system/ → 全仓库

| 母本 | 子本 | 同步规则 |
|------|------|---------|
| `content/03_doc_system/OPERATIONS_GUIDE.md` §19（术语使用规范） | 全仓库 + `docs/src/core/constants.js` | 术语→全仓。术语变更触发一改具改（H30.1）。代码中的术语必须与 OPERATIONS_GUIDE.md §19 一致 |
| `content/03_doc_system/OPERATIONS_GUIDE.md` | 全仓库 | 运行与协作规范→全仓。§1–§14 文档规范 / §15–§18 流程机制 / §19–§23 使用规范 / §24–§31 文件角色分类，全仓库必须遵守 |
| `content/02_institution/SYSTEM_ROLE_PERMISSION.md` + `docs/src/core/constants.js` | `docs/src/core/state.js`（角色枚举消费方） | 系统角色键→代码。角色键权威全表在 SYSTEM_ROLE_PERMISSION.md §9a0，代码侧单一源 `ROLE_KEYS`（constants.js）；state.js `ROLE_TYPES` 为首页日历分组用途的角色枚举 |

#### 审计参考层 → content/ 制度

| 母本 | 子本 | 同步规则 |
|------|------|---------|
| `content/01_strategy/references/合规文件/` | `content/02_institution/sop/` | 官方文件→SOP。官方文件与党章是所有 SOP 文本的母本。任何 SOP 文本调整，必须先回查 content/01_strategy/references/ |

#### 审计参考层 → content/ 理论

| 母本 | 子本 | 同步规则 |
|------|------|---------|
| `.ctx/logs/DECISION_LOG.md` | `content/insights/*.md` | 经验→沉淀。决策日志定期沉淀为经验沉淀（H30.4 经验沉淀规则） |

---

### 10.3 文档变更同步机制

#### 权威源治理模式

> **确立日期**：2026-09-04。本节是权威源治理大命题的执行面——唯一权威源（结构）、权威源转移（迁移）、变更传播（更新）；下方注册表映射、同步触发矩阵、溯源修改强制原则即三个维度的实例化。

**唯一权威源与切面视图**：同一主题只能有一个权威源，其他描述同一主题的文件是"切面视图"——只提供该主题的概要或特定角度，冲突时以权威源为准；切面视图必须标注"权威源指向"（如"详细见 XX.md"），让读者知道完整内容在哪里。为什么权威源必须唯一：多文件描述导致散落、未同步与不一致——修改 A 遗漏 B 时读者无法判断哪个准确，唯一权威源消除"哪个是对的"的判断成本。为什么不是"切面视图也算权威源"：切面视图是摘要或特定角度，可能为简洁省略细节或做适用性裁剪；权威源唯一性确保"去哪里找完整答案"是确定的。

**迁移场景：权威源转移与交叉引用保留**：文件合并/拆分迁移时，权威源地位随之转移——合并后的目标文件承接原权威源地位、拆分后的各部分分别承接各自主题的权威源地位，并同步更新本文件注册表映射。内容从 A 迁到 B 后，A 文件原位置应保留交叉引用 + 迁移说明（如"本节内容已迁移至 B.md §X"）而非直接删除——外部引用不会随迁移自动更新，保留交叉引用让原有指向 A 的引用仍然有效（读者到达 A 后能看到"已迁移至 B"指引）。

**更新场景：变更传播——「变更已记录」≠「变更已传播」**：权威源更新后，下游文件不会自动同步。沉淀机制的价值在于纠正过一次的问题应永久记住、不再反复提起。"更改"指一切权威源内容变更：**降级**（旧定义被新定义取代）只是其中一种，还包括**替换**（术语换用新词）、**合并**（多文件并为单一权威源）、**退役**（概念不再使用）。

**区分「定义残留」与「合法功能分区」**：
- **必须改**：与权威源不一致的旧定义——权威源变更后旧表述即属残留，须全仓同步；"那是旧的划分"这类表述同样不写，只讲"当前定义是什么"
- **保留**：功能分区本身不是旧定义的载体——分区标题与 UI 标签归位到现行分区即可；工作台 Tab 组名按行为性质分「工作台 / 我的职责 / 知情查看 / 制度与答复」四组，不再出现党建/党务二分章节标题与场景前缀

**Boolean 条件**：定义/术语变更传播完成 ⇔ 全仓 Grep 旧表述零残留（合法功能分区除外）**且** 权威源所有链接指向的下游文件已同步。

**预防机制**：CLAUDE.md H70 反思触发流——"反思"被提起时强制 ① 定位权威源最近变更 → ② 沿链接追踪下游文件 → ③ 全仓 Grep 旧表述 → ④ 一改具改 → ⑤ 机制补缺 → ⑥ 沉淀验证；C-5 术语审计纳入「已降级定义残留」扫描项。

**生效条件**：权威源模式适用于同一主题被多个文件描述、且各文件详细程度不同的场景；迁移交叉引用适用于文件合并、拆分、内容迁移的所有场景；变更传播适用于任何定义/术语/层级更新后的一改具改。验证方法：从权威源沿链接逐文件核对 + 全仓 Grep 旧表述。

#### 同步触发矩阵

| 变更源（母本） | 触发条件 | 必须同步的子本 |
|---|---|---|
| CLAUDE.md | 规则增删改、链长策略变更、/ask 与 /confirm 规范变更 | 全仓库所有引用方 |
| 本文 §十（注册表） | 映射关系增删改 | 受影响的子本文件 |
| content/02_institution/sop/*.md | 制度条款/流程步骤/术语变更 | docs/src/ 对应代码文件（见 sop-web-sync 映射表） |
| content/03_doc_system/OPERATIONS_GUIDE.md §19（术语使用规范） | 术语增删改 | docs/src/core/constants.js + 全仓库引用 |
| content/04_web_design/data/DATA_MODEL.md | 数据字段定义变更 | docs/src/ 对应数据结构代码 |

#### 同步执行步骤

1. **变更源识别**：确定变更发起的母本文件与具体变更内容。
2. **影响面分析**：基于本注册表的映射关系，列出所有受影响的子本文件。
3. **逐文件同步**：按审查顺序逐个更新子本。
4. **一致性校验**：同步完成后，输出《同步校验报告》。
5. **日志记录**：将同步操作记录至当月执行日志。

---

### 10.4 溯源修改强制原则

1. 任何涉及修改子本的请求，必须前置检查母本（同 §八 溯源铁律：子本变更若无法指向母本 → 禁止写盘）。
2. 若子本与母本存在冲突，以母本为准。
3. 严禁头痛医头式的孤立修改。
4. 任何对下游文件的变更规划，必须明确写出对应母本来源与影响链路。
5. 对于跨层修改，必须先完成母本确认，再执行子本收敛。
6. 若母本未明确，则禁止进入写盘阶段，只能输出只读审查结论。

---

### 10.5 审查顺序

1. 先查核心层：CLAUDE.md
2. 再查项目中枢：CLAUDE.md（未来执行路线图）
3. 再查文本母本层：content/02_institution/sop/
4. 再查代码内容层：docs/src/workflow/

---

### 10.6 使用规则

- 这是全局一致性判断的唯一参考入口。
- 任何局部修改规划，都必须标注其母本链路。
- 若出现多文件联动修改，必须先验证母本是否同意该变化方向。
- 若出现功能、措辞、流程三者不一致，以母本优先修正。
- 若出现新旧两套说法并存，必须先消除母本歧义，再处理子本。

---

## 十一、统一服务目录与角色-服务权限矩阵

> **定位：** 本节汇总系统所有服务功能及其角色权限映射，作为功能盘点和权限设计的统一参考。
>
> **受众：** [工程师]+[AI] — 工程师决策参考 + AI 自主读取作为实施上下文。
>
> 引用流程：[OPERATIONS_GUIDE.md §19–§31](./OPERATIONS_GUIDE.md)（《运行与协作规范》：术语与使用规范 ＋ 文件角色分类，含 2026-09-03 支书裁定；原 `USAGE_POLICY.md` / `ROLE_CLASSIFICATION.md` 已于 2026-09-26 批次 202 并入）→ [DATA_MODEL.md](../04_web_design/data/DATA_MODEL.md)（数据模型）→ [COMMISSIONER_DUTY_FRAMEWORK.md](../02_institution/COMMISSIONER_DUTY_FRAMEWORK.md)（支委系统）→ [系统角色权限矩阵](../02_institution/SYSTEM_ROLE_PERMISSION.md)（SYSTEM_ROLE_PERMISSION.md）
>
> **阅读约定**：本节只盘点「有哪些服务、由哪些代码实现、谁有权限」。服务间数据流与依赖见 [DATA_MODEL.md §1.3](../04_web_design/data/DATA_MODEL.md)；页面路由与入口映射见 §五 仓库结构；权限矩阵权威源为 [系统角色权限矩阵 §9b](../02_institution/SYSTEM_ROLE_PERMISSION.md)。

### 11.1 服务清单

> 文件路径均相对于 `docs/src/`（`server/routes/` 后端路由单独标注）。
>
> **范围声明**：本表为**主要服务索引**（非全量枚举，随系统演进补充）——**全量以 [`docs/src/services/`](../../docs/src/services/)（前端）与 [`server/routes/`](../../server/routes/)（后端）目录实际文件为准**。
>
> 关联制度缩写：CF=[COMMISSIONER_DUTY_FRAMEWORK.md](../02_institution/COMMISSIONER_DUTY_FRAMEWORK.md)、DA=[DATA_MODEL.md](../04_web_design/data/DATA_MODEL.md)（数据模型与数据流）、FLAT=[COMMISSIONER_DUTY_FRAMEWORK.md](../02_institution/COMMISSIONER_DUTY_FRAMEWORK.md)（§G 扁平化设计；2026-09-26 原 FLAT_ORGANIZATION_DESIGN.md 并入）、RC=[SYSTEM_ROLE_PERMISSION.md](../02_institution/SYSTEM_ROLE_PERMISSION.md)（系统角色权限矩阵，9a0~9g）、PC=[PARTY_COMMITTEE_DESIGN.md](../04_web_design/evolution/PARTY_COMMITTEE_DESIGN.md)（党委后台 P1-P3）；其余为 [sop/](../02_institution/sop/) 制度指南。

| 服务 | 服务文件 | 入口页面 | 核心操作 | 关联制度 |
|------|---------|---------|---------|---------|
| 活动管理 | `services/core/runtime.js`（BranchService 插槽）+ `services/activity/decision-tree.js` + `services/activity/activity.js`（读） | `workspace/secretary.html`、`workspace/leader.html` | 创建/编辑/发布/归档/品牌标签；决策树式创建引导（三会一课 / 主题党日，含共建性质、是否外出、活动载体三正交维度） | CF §审批 §一 |
| 专班管理 | `services/activity/taskforce.js` | `workspace/org.html` | 创建/招募（赋权）/运行跟踪/解散/工作量汇总 | CF §A.4/§A.6/§A.7 + CF §审批 §二 |
| 分工记录 | `core/data-adapter.js`（assignments 主源）+ `services/core/auth.js`（syncProjectRoles） | 工作台分工闭环（leader/secretary） | 指派分工/跟踪完成度/标记完成/逾期检测/提交参与角色确认 | DA §2.6（AssignmentRecord）+ FLAT |
| 考察记录 | `services/activity/inspection.js` | `workspace/disc.html` | 上传/修改/确认录入总表/类别标签/超期提醒/单一活动或人员查询 | CF §C.1a + DA §2.5.1（InspectionRecord） |
| 考勤管理 | `services/activity/attendance.js` | `workspace/disc.html`、`workspace/visitor.html`（个人出勤率） | 上传/修改/确认+录入总表/总表修改/超期提醒/单一活动或人员查询；出勤率汇总（支委会内部，不公示、不对外）与个人出勤率（当事人本人可见，只算自己） | CF §C.1a + CF §审批 §四 |
| 补课管理 | `services/activity/makeup.js` | `workspace/disc.html` | 自动生成补课任务/标记完成+回写考勤/导出统计 | [纪检委员工作流程指南](../02_institution/sop/纪检委员工作流程指南.md) |
| 复盘服务 | `services/governance/review.js` | `workspace/disc.html` | 提交复盘/批注/打回/确认/超期提醒（未提交 → 已上传 → 批注中 → 确认/打回） | CF §审批 §五 + CF §C.1a |
| 发展党员 | `core/domain.js`（developStage 四阶段）+ `core/data-adapter.js`（持久化） | `workspace/org.html` | 查看候选人列表/修改阶段状态/上传更新材料/标记缺失并提醒（思想汇报已数字化并实现：`services/governance/thought-report.js` 提交即入库即归档，组织委员查看/调用——2026-08-30 支书决策） | [组织委员工作流程指南](../02_institution/sop/组织委员工作流程指南.md) + CF §C.1b |
| 档案宣传 | `core/data-adapter.js`（imageRecords 聚合）+ `modules/references.js` | `workspace/prop.html` | 档案归档/材料标准/模板管理/周报报送（图片随宣传材料走「档案归档」；**图片记录只有数据通道、图片管理界面未实现**） | [宣传委员工作流程指南](../02_institution/sop/宣传委员工作流程指南.md) + CF §C.1b |
| 人员管理 | `services/member/person.js` | 各工作台（人才库/人员选择） | 人员查询/名称解析/档案展示 | — |
| 待办服务 | `services/governance/todo.js` | 各工作台 | 待办派生/标记完成/按分类展开收起（幂等去重） | — |
| 支书总览 | `services/governance/secretary-overview.js` | `workspace/secretary.html` | 全局统计/总览待办派生 | — |
| 认证服务 | `services/core/auth.js`（AuthStore） | `login.html`（全站共用） | 登录态管理/赋权记录 CRUD/角色-页面映射（ROLE_PAGE_MAP） | — |
| 权限服务 | `services/core/auth.js`（canDo + ROLE_PERMISSIONS）+ `services/core/roles.js` | 全站共用（侧边栏身份视图） | 统一角色选择/权限判定/角色赋权共享 | RC §9a0/9b/9e |
| 通知服务 | `services/governance/notice.js` | `index.html`、各工作台 | 发布/阅读/删除/审批流程关键节点触发 | — |
| 反馈服务 | `services/governance/issues.js` + `services/governance/milestones.js` | `feedback.html` | 成员提交 / 支委会处置、由支书主持支委会（GitHub Issue 风格：列表/详情/新建） | — |
| 归档检索 | `core/data-adapter.js`（只读聚合） | `archive.html`、`search.html` | 归档库（列表+画册视图）/全量资料查询 | — |
| 会议议程编辑 | `services/activity/agenda-editing.js` | 活动详情（三会一课议程编辑） | 议程结构化事项的纯数据处理：保持业务字段不被 UI 编辑覆盖 | — |
| 会议议程会后衔接 | `services/activity/agenda-follow-up.js` | 活动详情（会后） | 记录「通过/不通过」→ 派生文件/成员变更动作；支部党员大会做出席/赞成过半数硬校验 | — |
| 线上支委会表态 | `services/activity/committee-vote.js` | 活动详情（表决区块）、`party-committee-meeting.html`（支委会会议页） | 委员异步表态（同意/异议/附言）→ 支书汇总 → 截止锁定（votesLocked 写入活动）；线上与线下完全同等效力 | — |
| 支部服务 | `services/branch/branch.js` | `workspace/party-committee.html` | 支部边界收敛点：人→支部归属、支部配置档案（header/主题/启停模块/工作地图/产出块策略） | PC（P1 支部实例） |
| 支书任命 | `services/branch/appointment.js` | `workspace/party-committee.html` | 任命 + 任期记录闭环（现任记录封口 → 新建现任；换届档案可查），双方 users.role 同步 | PC（P2 支书任命） |
| 支部上报审批 | `services/governance/review-request.js` | `workspace/party-committee.html`（党委审批侧） | 支书上报（发展党员关键节点/重要活动报备）→ 党委逐项审批（approve/reject + 意见）→ 支部侧可见结果 | PC（P3 上报审批） |
| 报名登记 | `services/activity/signup.js` | 活动/专班详情（报名区块） | 统一报名渠道：participant 报名即加入；organizer/deep 报名 + 发起人审核（pending → 通过/拒绝） | — |
| 外发确认 | `services/activity/external-dispatch.js` | 各工作台（任务/材料外发） | 发送方标记「已通过微信发送给 XX」→ 接收方工作台「确认收到」→ 可审计闭环（谁/何时/发给谁/何时确认） | — |
| 三委数据交接 | `services/governance/handoff.js` | disc/org 工作台 | 交接生成 → 自动为接收方派生待办 → 确认 → 待办销项 + 状态落库（双向可追溯）；协议三条＝纪检→组织（考勤统计、考察记录）· 组织→纪检（补课需求回执） | CF §E.2（数据交接协议） |
| 思想汇报 | `services/governance/thought-report.js` | `workspace/visitor.html`（提交）、`workspace/org.html`（查看/调用） | 提交即入库即归档：按 personId 算法自动归集至个人档案，无人工归档环节 | [组织委员工作流程指南](../02_institution/sop/组织委员工作流程指南.md) |
| 全员可见性矩阵 | `services/core/visibility.js` | 全站共用（数据维度投影） | 「谁看谁」可见性投影（L0 个人 / L1 条线 / L2 全局）；看 ≠ 做，不授予操作权 | RC §9b + P-011（SECRETARY_DIRECTIVES） |
| 表决配置 | `services/activity/vote-config.js` | 活动创建（表决配置区块） | voteConfig 解析与场景默认：deliberative（交流式）/ formal（正式表决）参数化（optionSet/quorumCheck/voterScope） | — |
| 支部分工提议 | `services/branch/workforce.js` | `workspace/secretary.html`（支部分工）、各工作台概况（履职卡） | 改派提议（可会前草稿）→ 生成支委会议题 → 支委经表决 UI 表态（门槛：应到 2/3 且无异议，2026-09-05）→ 支书采纳生效 → 合并 config.workforce 落库 → 各工作台概况「支部安排·我的分工」履职卡可见 | BRANCH_WORK_MAP.md（L4 M2 闭环） |
| Mock 服务层 | `services/core/mock.js` | （数据基础设施） | Mock 持久化/种子引擎（saveDB/loadDB/seed 同步收敛至 core/mock-adapter.js） | — |
| 线上表决 API | `server/routes/committee.js` | `/api/v1/agenda-votes`（API） | 异步表态提交/汇总/截止锁定服务端（voteConfig 校验；角色名单单一源 constants.js） | 与前端 committee-vote 配套（活动详情表决区块 ＋ 支委会会议页共用） |
| 成员变更审批 API | `server/routes/member.js` | `/api/v1/member-change-requests`（API） | 成员变更申请 → 组织委员审批 → 全体支委广播 → 支书确认 → 更新 developStage | [组织委员工作流程指南](../02_institution/sop/组织委员工作流程指南.md) |
| 数据上报 API | `server/routes/report.js` | `/api/v1/report`（API） | 四域（member/activity/attendance/study）JSON 拉取 / CSV 导出 / 触发推送 | DEPLOYMENT_GUIDE.md（数据上报对接） |

---

### 11.2 角色-服务权限矩阵

> **权威源**：[系统角色权限矩阵 §9b/§9c](../02_institution/SYSTEM_ROLE_PERMISSION.md)（操作粒度权限矩阵）。本表为该权威源在服务粒度上的切面视图，冲突时以权威源为准。
> 行：服务；列：9 个角色。单元格：M=管理权限 / R=只读 / Self=仅自身 / —=无权限。副支书与党支书同权，共享支书工作台（`workspace/secretary.html`）。

| 服务 | 党支书 | 副支书 | 组织委员 | 宣传委员 | 纪检委员 | 党小组组长 | 组织者 | 深度参与者 | 普通成员 |
|------|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| 活动管理 | M | M | R | R | R | M | M* | Self | R |
| 专班管理 | M | M | M | R | R | R | R | R | — |
| 分工记录 | M | M | R | R | R | M | M | Self | — |
| 考察记录 | M | M | R | R | M | M† | M† | Self | Self |
| 考勤管理 | M | M | R | R | M | M† | M† | R | Self |
| 补课管理 | M | M | R | — | M | R | R | Self | Self |
| 复盘 | M | M | — | — | M | R | R | — | — |
| 发展党员 | M | M | M | R | R | — | — | — | — |
| 档案宣传 | M | M | M‡ | M | R | — | — | — | — |
| 待办 | M | M | M | M | M | M | Self | Self | Self |
| 人员 | M | M | M | R | R | R | — | — | — |
| 支书总览 | M | M | — | — | — | — | — | — | — |
| 认证服务 | M | M | M | R | R | M | Self | Self | Self |
| 权限服务 | M | M | M | M | M | M | R | R | R |
| 通知服务 | M | M | M | M | M | R | R | R | R |
| 反馈服务 | M | M | R | — | — | 提交 | 提交 | 提交 | 提交 |
| 归档检索 | R | R | R | R | R | R | R | R | R |

**注释**：

- **\*** 组织者对活动管理的 M 权限仅限被赋权的活动范围内（不能独立创建活动，只能在承包活动内做分工记录闭环）。
- **†** 党小组组长 / 组织者对考勤、考察的 M 权限仅限"上传 / 修改党小组活动表单"；总表的确认 + 录入 + 修改权归纪检委员。
- **‡** 组织委员对档案宣传的 M 权限仅限"制度文件引用增删"，档案归档 / 材料标准 / 模板管理归宣传委员。

---

### 11.3 权威源与配套文档

- **服务间数据流与依赖**：[DATA_MODEL.md §1.3](../04_web_design/data/DATA_MODEL.md) — 端到端数据流交织图（活动上下文链 + 副产物聚合 + 赋权 → 工作台 → 入档），含挂靠 / 聚合双语义
- **权限矩阵权威源**：[系统角色权限矩阵](../02_institution/SYSTEM_ROLE_PERMISSION.md)（SYSTEM_ROLE_PERMISSION.md）— 角色 × 操作矩阵（§9b/§9c）+ 赋权链 §9e + 权限名语义 §9f
- **页面路由与入口映射**：本文 §五 仓库结构 — 仓库结构（根页面 + workspace/ 工作台，页面清单以 docs/ 实测为准 + 入口 JS）
- **支委系统设计**：[COMMISSIONER_DUTY_FRAMEWORK.md](../02_institution/COMMISSIONER_DUTY_FRAMEWORK.md) — 专班生命周期 + §C 权限矩阵 + §审批流程规范
- **数据模型与数据流**：[DATA_MODEL.md](../04_web_design/data/DATA_MODEL.md)（数据模型与数据流：§2.x 静态模型 + §1.x/§3.x/§4.x 动态数据流）

---

## 十二、边界与引用

> 本文为**架构与单一事实源**的唯一权威源；下列内容本文不重复展开，一律以对应权威源为准。

| 本文不重复展开的 | 权威源 |
|---|---|
| 数据结构与数据流（实体字段表、枚举、表结构） | [DATA_MODEL.md](../04_web_design/data/DATA_MODEL.md) |
| 系统角色权限矩阵（角色键级权威、操作粒度矩阵） | [SYSTEM_ROLE_PERMISSION.md](../02_institution/SYSTEM_ROLE_PERMISSION.md) |
| 支委职责与赋权框架 | [COMMISSIONER_DUTY_FRAMEWORK.md](../02_institution/COMMISSIONER_DUTY_FRAMEWORK.md) |
| 文档导航与权威层级定义 | [DOC_MAP.md](./DOC_MAP.md) / [OPERATIONS_GUIDE.md §1.1](./OPERATIONS_GUIDE.md) |
| 运行标准·文档规范 / 流程机制 / 使用规范 / 文件角色分类 | [OPERATIONS_GUIDE.md](./OPERATIONS_GUIDE.md)（《运行与协作规范》） |
| 前端设计规范 | [DESIGN_SYSTEM.md](../04_web_design/design-system/DESIGN_SYSTEM.md) |
| 支书裁定原文（P-xxx 系列） | [SECRETARY_DIRECTIVES.md](../01_strategy/SECRETARY_DIRECTIVES.md) |
| 沿革与「哪一批做了什么」 | `.ctx/logs/YYYY-MM-EXECUTION_LOG.md` |
