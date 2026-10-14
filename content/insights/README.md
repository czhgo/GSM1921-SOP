---
title: "全栈工程与经验沉淀学习入口"
type: index
role: "[用户]+[工程师]"
last_updated: "2026-10-14"
status: active
---

# 全栈工程与经验沉淀学习入口

> **定位：** 这是给人阅读的工程与组织经验入口。它串联前端、后端、数据库、权限、测试、部署、架构和 AI 协作方法；**规范的唯一权威源仍在 `content/03_doc_system/`、`content/04_web_design/` 与 `content/05_ai_coding/`**。本目录解释怎么把它们连起来，不复制规则。
> **受众：** [用户]+[工程师]（支委、党员、系统维护者）
> **来源：** `.ctx/logs/DECISION_LOG.md` 定期沉淀（H30.4 经验沉淀规则，优先级：上下文文档 → CLAUDE.md → insights 去语境化后写入）

---

## 文件清单

## 按主题继续学习

| 你要弄清楚什么 | 从这里开始 | 项目权威源 / 深入入口 |
|---|---|---|
| 页面行为怎么连到数据库结果 | [沿用户任务追数据](工程与AI协作的全栈实践.md#1-先从用户任务追数据) | [数据模型](../04_web_design/data/DATA_MODEL.md) · [数据一致性手册](../05_ai_coding/DATA_CONSISTENCY_CHECKLIST.md) |
| 数据表、身份、状态、事务和删除如何定口径 | [数据口径与生命周期](工程与AI协作的全栈实践.md#2-先定数据口径再写代码) | [数据模型](../04_web_design/data/DATA_MODEL.md) · [数据库服务说明](../../server/README.md) |
| 前端隐藏按钮是否等于权限控制 | [权限由服务端保证](工程与AI协作的全栈实践.md#3-把可见与有权分开) | [角色与权限模型](../02_institution/SYSTEM_ROLE_PERMISSION.md) · [运行与协作规范](../03_doc_system/OPERATIONS_GUIDE.md) |
| 如何测试计算逻辑和避免动到日常库 | [用反例验证规则](工程与AI协作的全栈实践.md#4-测试业务结果与失败路径) | [测试验证纪律](../05_ai_coding/TEST_AND_VERIFICATION.md) · [服务器测试说明](../../server/README.md) |
| 系统本地怎么运行、何时考虑换部署形态 | [运行、部署与复用边界](工程与AI协作的全栈实践.md#6-先把部署边界说清) | [项目 README](../../README.md) · [后端 README](../../server/README.md) · [部署指南](../04_web_design/deploy/DEPLOYMENT_GUIDE.md) |
| 怎么判断简并还是过度合并 | [按语义合并模块](工程与AI协作的全栈实践.md#5-合并应减少维护面且不改变语义) | [架构文档](../03_doc_system/ARCHITECTURE.md) · [工程评估](../../.ctx/ENGINEERING_ASSESSMENT.md) |
| 怎么跟 AI 一起改已有系统 | [AI 协作闭环](工程与AI协作的全栈实践.md#7-ai-协作要有闭环) | [上下文管理](../05_ai_coding/CONTEXT_MANAGEMENT.md) · [评议与表达](../05_ai_coding/REVIEW_AND_EXPRESSION.md) · [测试纪律](../05_ai_coding/TEST_AND_VERIFICATION.md) |

> 工程评分、残项与阻断风险见 [.ctx/ENGINEERING_ASSESSMENT.md](../../.ctx/ENGINEERING_ASSESSMENT.md)。本入口串联学习路径，不复制规范或评分。

| 文件 | 一句话说明 | 覆盖知识类型 |
|------|-----------|------------|
| [工程与 AI 协作的全栈实践](工程与AI协作的全栈实践.md) | 从用户任务一路追到页面、服务、API、数据库和部署；结合本项目判例讲清工程检查顺序与 AI 协作方法 | [3]工程与架构 + [4]前后端实践 + [5]AI coding |
| [党支部管理与实务经验沉淀.md](党支部管理与实务经验沉淀.md) | 组织性（管理事、服务人）、条块二元结构、支委角色设计、活动分类体系、专班经验 | \[1]支部战略 + \[2]支部制度 |

> **工程类经验：**跨层解释与学习顺序见本目录的《工程与 AI 协作的全栈实践》；判例、可执行规范和机器守卫分别归 [数据一致性手册](../05_ai_coding/DATA_CONSISTENCY_CHECKLIST.md) 与 [测试验证纪律](../05_ai_coding/TEST_AND_VERIFICATION.md)，避免双份维护。
> **沿革去向（2026-09-26 批次 208）**：本条原有两条**追加型沿革注记**（「2026-09-14 批次 37–39 追加」「2026-09-15 批次 44 追加」——只记「哪一批往 05 域加了哪些范本 / 自查问句」的编辑动作，不含现行规则）已**成段迁出**至 `.ctx/logs/archive/2026-09-EXECUTION_LOG.md`「附：`content/**` 沿革注记迁出（2026-09-26 批次 208）」（含「原句 → 去向」逐字对照）。各范本、§0.1 自查问句与 §0.2 总索引的**现行正文**仍在 [DATA_CONSISTENCY_CHECKLIST.md](../05_ai_coding/DATA_CONSISTENCY_CHECKLIST.md)，对应判例仍在 [TEST_AND_VERIFICATION.md](../05_ai_coding/TEST_AND_VERIFICATION.md)。

---

## 规范归属说明：2026-09-04 工程方法论分流

原「工程演进与设计方法论.md」中的规范、设计判例与 AI 编码规则，已按知识类型分流至各权威文件，源文件于 2026-09-04 删除。新建的《工程与 AI 协作的全栈实践》是面向人的跨层解释与学习路线，不恢复旧文，也不另立规范。去向：

- **[4] 网站设计方法论与判例** → `content/04_web_design/`：总承接档 [evolution/DESIGN_METHODOLOGY.md](../04_web_design/evolution/DESIGN_METHODOLOGY.md)（设计论证/反论/判例档案）；论证对应的规范正文归位各权威源——design-system/DESIGN_SYSTEM.md（原 §4.2 组件设计论证、原 §4.5/§4.7 动效分层段）、data/DATA_MODEL.md §4.7/§4.8（原 §4.9/§6.13 视图按需取用、§6.14 看板动态派生）、module/SOP_WEBSITE_GUIDE.md §C（原 §4.11 SOP 回写）
- **[5] AI coding 方法** → `content/05_ai_coding/` 各分篇：CONTEXT_MANAGEMENT.md（原 §2.1/§2.2/§2.5/§3.1/§6.1/§6.5 等）、REVIEW_AND_EXPRESSION.md（原 §1.6/§3.4/§3.7/§4.6/§4.7/§4.8/§4.15/§5.10/§6.2/§6.18/§7.1 段/§7.2~§7.5 等）、FILE_OPERATION_RULES.md（原 §2.3/§5.1/§5.11 等）
- **[3] 文档系统管理** → content/03_doc_system/：DOC_MAP.md（原 §5.6 梳理方法论 / §7.6 拆分操作经验，见其 3.1/3.2 节）、OPERATIONS_GUIDE.md（原 §3.8 等，2026-09-26 批次 202 起为《运行与协作规范》，含原 `PROCESS_GUIDE` / `USAGE_POLICY` / `ROLE_CLASSIFICATION`；原 `SSOT_INDEX.md` 已于 2026-09-25 批次 179 并入 ARCHITECTURE.md §十）（各承接同题章节）；文档治理类小节另归 [content/05_ai_coding/DOCUMENT_GOVERNANCE.md](../05_ai_coding/DOCUMENT_GOVERNANCE.md)（原 §1.1/§1.2/§1.3/§3.6/§5.2-§5.4——命名/SSOT/历史不可变/文件归置；原 §4.8/§4.18/§5.9/§6.4/§6.15/§6.27——内容治理/spec 全流程/被否决残留）
- **[2] 支部制度判例** → `content/02_institution/COMMISSIONER_DUTY_FRAMEWORK.md`（原 §6.12 补课闭环）

各承接文本均保留「（原 insights §N）」出处注记；逐小节出处映射详见 [DOC_MAP.md §3.2 分流来源声明](../03_doc_system/DOC_MAP.md) 与各承接文件内注记。无法精确对应的历史交叉引用，以本文档承接声明兜底指路。

---

## insights 内容写入标准

> **来源：** 原「工程演进与设计方法论.md」§7.1「去语境化写作规范」

- insights 是供人类阅读的知识资产，不是 AI 工作时的活跃上下文
- 内容直接写"别的语境也能成立的通用表述"，不留项目语境依赖；不出现改写痕迹（如「泛化」「现状→」等元标签）
- 每条经验带判断路由：有的讲"为什么重要"，多数讲"在什么条件下重要"（与好坏尺度判断一致，或关系）
- 项目判例作支撑：通用命题在前，判例在后
- **生效条件**：适用于 insights 全部内容的写作与修订；01-05 上下文文档不适用（那里保留项目原生表述）

---

## 与其他知识类型的关系

- **知识类型 1（战略）**：战略经验沉淀，源自 `content/01_strategy/`
- **知识类型 2（制度）**：制度经验沉淀，源自 `content/02_institution/`
- **知识类型 3（文档系统管理）**：治理经验沉淀，源自 `content/03_doc_system/`
- **知识类型 4（网站设计）**：设计经验沉淀，源自 `content/04_web_design/`
- **知识类型 5（AI coding）**：编码经验沉淀，源自 `content/05_ai_coding/`
