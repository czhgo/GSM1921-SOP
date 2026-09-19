---
title: "经验沉淀索引——跨多类组织智慧"
type: index
role: "[用户]+[工程师]"
last_updated: "2026-09-15"
status: active
---

# 经验沉淀索引——跨多类组织智慧

> **定位：** 经验沉淀（党建实务保留）——本目录存放历届支委集体萃取的、可跨届复用的组织智慧；工程方法论内容已于 2026-09-04 分流至 04/05/03/02 各权威文件（见下承接声明）。
> **受众：** [用户]+[工程师]（支委、党员、系统维护者）
> **来源：** `.ctx/logs/DECISION_LOG.md` 定期沉淀（H30.4 经验沉淀规则，优先级：上下文文档 → CLAUDE.md → insights 去语境化后写入）

---

## 文件清单

| 文件 | 一句话说明 | 覆盖知识类型 |
|------|-----------|------------|
| [党支部管理与实务经验沉淀.md](党支部管理与实务经验沉淀.md) | 组织性（管理事、服务人）、条块二元结构、支委角色设计、活动分类体系、专班经验 | \[1]支部战略 + \[2]支部制度 |

> **工程类经验（2026-09-14/15 集中沉淀）**：本轮整改（分页引擎化 / 人×项目矩阵单一源 / 档位口径 / 非闭环修复 / 仲裁落地 / 同类病灶规模扩大 / 口径守卫化）提炼的**判例与可复用判据**集中在 [content/05_ai_coding/DATA_CONSISTENCY_CHECKLIST.md](../05_ai_coding/DATA_CONSISTENCY_CHECKLIST.md)（**第六~第十四范本** + **§0.2 规则 → 守卫 → 状态 总索引**）与 [content/05_ai_coding/TEST_AND_VERIFICATION.md](../05_ai_coding/TEST_AND_VERIFICATION.md)（判例立规），并把它们压成 **[§0.1 AI 自查问句十四问](../05_ai_coding/DATA_CONSISTENCY_CHECKLIST.md)**——AI 每接一个「改表格/改控件/改数据/加能力/改说明文件」的任务先自问，**答不实就问支书**。此处不另开文件，避免与 05 域重复维护。
> **2026-09-14 批次 37–39 追加**：新增**第十一范本「能力已收进引擎 ≠ 已收口」**（单一源只覆盖「已在单一源内的调用点」，覆盖不了「绕过单一源、各写一版」的地方，须**反向枚举**「谁在做同一件事却没走单一源」）与**第十二范本「移动单一源的位置 = 一次全仓改签」**（搬迁前 grep 旧路径全量引用、搬迁后旧路径 0 命中；局部绿、全量红），同址刊于 [DATA_CONSISTENCY_CHECKLIST.md](../05_ai_coding/DATA_CONSISTENCY_CHECKLIST.md)；[TEST_AND_VERIFICATION.md](../05_ai_coding/TEST_AND_VERIFICATION.md) 新增对应判例「单一源搬迁后的引用改签遗漏（局部绿、全量红）」。**§0.1 自查问句由十问扩为十二问**（新增「引用完整性」「反向枚举」两问）。
> **2026-09-15 批次 44 追加**：新增**第十三范本「同一病灶只修一处＝没修完」**（病灶是「一类形态」不是「一处 bug」：修完须先数同类规模，>1 处即建台账 + 真机覆盖，`form-loop-registry` 92 条 / `form-loop-sweep` S0–S4 + 10 条真机闭环）与**第十四范本「工具脚本会把数据当代码改写」**（补戳正则把台账里的路径数据补上 `?v=` 致 113 条被改坏 → 构造免疫 + 防污染断言）；**§0.1 自查问句扩为十四问**（新增「同类规模」「工具脚本的改写面」）；并新建 **§0.2 规则 → 守卫 → 状态 总索引**（21+ 行，由 `doc-consistency.test.mjs::S9` 守卫其引用真实性）。历史整合与沿革见 `.ctx/ENGINEERING_ASSESSMENT.md §五「经验索引与沿革」`。

---

## 2026-09-04 工程方法论分流（承接声明）

原「工程演进与设计方法论.md」（[3]文档系统管理 + [4]网站设计 + [5]AI coding 工程方法论，专供人类阅读）已按知识类型分流归位至各权威文件，源文件于 2026-09-04 删除。去向：

- **[4] 网站设计方法论与判例** → `content/04_web_design/`：总承接档 [evolution/DESIGN_METHODOLOGY.md](../04_web_design/evolution/DESIGN_METHODOLOGY.md)（设计论证/反论/判例档案）；论证对应的规范正文归位各权威源——design-system/COMPONENT_SPEC.md（原 §4.2 组件设计论证）、design-system/DESIGN_SYSTEM.md（原 §4.5/§4.7 动效分层段）、data/DATA_FLOW.md §4.7/§4.8（原 §4.9/§6.13 视图按需取用、§6.14 看板动态派生）、module/SOP_WEBSITE_GUIDE.md §C（原 §4.11 SOP 回写）
- **[5] AI coding 方法** → `content/05_ai_coding/` 各分篇：CONTEXT_MANAGEMENT.md（原 §2.1/§2.2/§2.5/§3.1/§6.1/§6.5 等）、REVIEW_AND_EXPRESSION.md（原 §1.6/§3.4/§3.7/§4.6/§4.7/§4.8/§4.15/§5.10/§6.2/§6.18/§7.1 段/§7.2~§7.5 等）、FILE_OPERATION_RULES.md（原 §2.3/§5.1/§5.11 等）
- **[3] 文档系统管理** → content/03_doc_system/：DOC_MAP.md（原 §5.6 梳理方法论 / §7.6 拆分操作经验，见其 3.1/3.2 节）、PROCESS_GUIDE.md（原 §3.8/§6.8 等）、OPERATIONS_GUIDE.md、USAGE_POLICY.md、SSOT_INDEX.md（各承接同题章节）；文档治理类小节另归 [content/05_ai_coding/DOCUMENT_GOVERNANCE.md](../05_ai_coding/DOCUMENT_GOVERNANCE.md)（原 §1.1/§1.2/§1.3/§3.6/§5.2-§5.4——命名/SSOT/历史不可变/文件归置；原 §4.8/§4.18/§5.9/§6.4/§6.15/§6.27——内容治理/spec 全流程/被否决残留）
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
