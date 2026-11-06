---
title: "CLAUDE — 项目宪法与路由"
type: governance
role: "[工程师]+[AI]"
last_updated: "2026-11-03"
status: active
---

# CLAUDE.md

> **定位（2026-11-03 批次 529 改准）**：本文件是**宪法 + 路由**，不是历史档案。每次会话只读 **本文件 + `.ctx/ACTIVE_CONTEXT.md`**；细则 / 判例 / 方法按指针去 `content/01–05`；历史去 `.ctx/logs/`。
> **预算**：≤600 行 / ≤85KB；甲部引用框 ≤15；乙部 ≤12 行；丙部 ≤4 条。超出时先降级细节，不堆叙述。
> **H 编号保留**：H10–H100 编号与顺序不变；子节只合并不改号（H26.1–4 保留标题、压缩正文）。

# 甲部：通用流程与指导思想（Harness）

# 热层：每次工作必读

## H10. 总纲

**H10.1 最小三成本＝最高验收标准。** 每个界面 / 流程必须通过「找得到、看得懂、点得动」三关；不能用「功能已实现」替代体验验收。

**H10.2 `content/04_web_design/` 的规范必须外部可读。** 设计文档写给不看代码的人也能执行；只写「是什么、为什么、怎么判」，不写实现流水。

**H10.3 表达四禁。** 不得使用极端词（最/唯一/彻底）、反论（不是…而是…）、等号式定义（A＝B 当口号）、`=≠` 符号论证；规则直接写「必须 / 不得」。

**H10.4 扩充规则五条同时满足。** ① 有真实判例；② 能布尔化；③ 有单一落点；④ 有守卫或检查方式；⑤ 不与既有规则冲突；缺一不立。

**H10.5 排序按逻辑，不按时间。** 文档、清单、代码目录一律按「先总后分、先规则后示例、先主路径后边界」排；时间线只进日志。

**H10.6 不替支书定性。** 涉及制度、角色、权限、产品取向的取舍，AI 只给选项、证据、推荐与影响；裁定权归支书。

**H10.7 主客回环。** 每条结论必须能回到「谁在什么场景下做什么判断」；只写抽象原则、不写适用场景的，视为未完成。

## H20. 标准化工作流

### H20.1 审查（每次启动时必做）

1. 读取 `.ctx/ACTIVE_CONTEXT.md`（当前状态 / 当前判断 / 下一步）。
2. 阅读本文件甲部约束与乙部在办项。
3. 需要系统形态 / 文件时间时再读 `.ctx/SNAPSHOT.md` / `.ctx/TIMESTAMPS.md`（reference，按需）。

### H20.2 执行（单次迭代标准流程）

> **多视角审查前置**：涉及脏乱繁 / 最小三成本 / 功能与美观 / 全栈数据结构设计的改动，先按 **H21** 完成独立审查与支书裁定，再进入实施。

1. **定范围**：写清改哪些文件、不改哪些文件、验收判据。
2. **先证伪**：能复现的先复现；不能复现的写「无法复现」与证据，不猜。
3. **最小改动**：只改与目标直接相关的代码 / 文档；不顺手重构。
4. **当场验证**：定向测试 + 必要的真机检查；失败先定位根因，不连续重试同一命令。

### H20.3 收尾（每批必做）

1. **commit 主记录**：本批至少一个 commit，message 按模板 `批次号｜为什么｜改动面｜验证读数｜D/任务号`；改动事实以 `git show <hash>` 为准（`H26.1`）。
2. **执行日志**：只写「为什么 / 拿不准 / 边界 / 读数 / commit hash」，不复述逐文件 diff / 改动清单。
3. **决策日志**：追加新 `D-xxx`（如有裁定）。
4. **刷新投影**：`.ctx/ACTIVE_CONTEXT.md`（状态 / 风险 / 下一步 / `latest_decision`）；`.ctx/SNAPSHOT.md` 仅结构变化时更新；`.ctx/TIMESTAMPS.md` 登记改过的文件。
5. **当场验证**：定向测试；发布前跑 `npm run test:daily` 与 `node scripts/audit-tabs.mjs --all`（P0/P1=0）。
6. **输出 `next_prompt`（六要素，缺一即未完成）**：
   1. **未完成项**及 ID（乙部无则写「乙部当前无未完成项」）；
   2. **恢复上下文**要点（下轮先读哪两个文件、当前判断与风险）；
   3. **执行顺序**（先做什么、再做什么）；
   4. **Skill 提醒**（涉及可调用 Skill 的场景必须标注 skill 名）；
   5. **专项台账快照**（`ENGINEERING_ASSESSMENT §四` 的现行专项、状态、下轮建议）；
   6. **本批 commit hash**（无 commit 须说明原因）。

   丙部有未决必须逐条列出；**未输出 next_prompt 视为工作未完成**，不得回报「已完成」。

### H20.4 支书指示分级

| 档 | 触发 | 处理 |
|---|---|---|
| **探索性** | 「看看 / 想想 / 有没有可能」 | 先给方案与证据，不直接改代码；可先做只读探查。 |
| **命令性** | 「做 / 改 / 落地」 | 直接执行；遇边界写清，不反复请示。 |
| **禁止性** | 「不要 / 不得 / 别」 | 视为硬约束；同族场景一并检查，不只改字面一处。 |

## H21. 多代理独立审查协议

**H21 协议八条**

1. **独立审查**：每个代理只加载一个 skill；主代理不得给多个 lens 混合提示。
2. **独立性**：不读其他代理报告；各自从源码 / 页面 / 数据独立取证。
3. **证据**：每条发现必须带 `file:line`；无证据的发现不入汇总。
4. **汇总三分类**：共识 / 分歧 / 待裁定；不得把分歧压成共识。
5. **人类裁定**：用 AskUserQuestion 给互斥选项；裁定权归属支书，不得替支书决定。
6. **落 spec**：结论落 `spec.md` / `tasks.md` / `checklist.md`，任务可验收。
7. **复盘**：按 sample-diff-learning 记录「AI 假设 / 人类意图 / 偏差类型 / 泛化规则」。
8. **不重复劳动**：同一文件同一问题只由一个 lens 主审，其他 lens 只做交叉验证。

**H21.1 判例（2026-10-19）**：三路 lens＝web-design-guidelines / design-with-taste / frontend-design；产出 **6 项共识**、**5 项分歧**、**支书四项裁定**。判例全文见 `content/05_ai_coding/PARALLEL_SKILL_AUDIT.md §8`。

**H21.2 四轮路线图**：Round 1 脏乱繁复审计 → Round 2 最小三成本 → Round 3 功能与美观 → Round 4 全栈数据结构设计。**逐轮启动**，**不得同时开四轮**；路线图详见同手册 §9。

**H21.3 批判性 IA 审查**：每个入口先问三问——「这个 tab 是否必须存在」「这张卡是否改变一个决策」「这枚链接是否指向对的对象」；**mock 可删改**，mock 数据只是验证辅助，不得让 mock 结构决定产品结构；**数据适配功能**，不是功能适配数据。详细判据见同手册 §11 与 `AP-IA-01…05`。

**H21.4 角色与启动纪律**

- 主代理：拆 lens、发独立提示、收报告、做汇总，不改子代理结论。
- 子代理：只加载一个 skill、只读自己的证据面、输出 `file:line` 与可复现命令。
- 汇总：共识 / 分歧 / 待裁定三栏；分歧必须保留反方证据，不得平均成一句。
- 裁定：用 AskUserQuestion 给互斥选项；支书未裁前不进入实施。
- 启动：逐轮启动；前一轮裁定落 spec 后再开下一轮；不得同时开四轮。
- 复盘：每轮结束按 sample-diff-learning 记录偏差与泛化规则；未记录视为未完成。
- 禁止：用「多代理」代替真实验证；用「共识」压掉反例；把子代理报告直接当最终结论。

**H21.5 每轮产出**

- 报告必须写覆盖范围 / 未覆盖范围 / 证据条数，缺一不算完成。
- 结论落 `spec.md` / `tasks.md` / `checklist.md`，任务可验收。
- 决策记录必须含未选方案与不选理由，不得静默丢弃。
- 可复用偏差写回 `content/05_ai_coding/TEST_AND_VERIFICATION.md` 判例节。

## H25. 测试系统（AI 必知）

- **三层**：`test:daily`（纯 node / HTTP，日常）、`test:precommit`（daily + 真机 e2e）、`test:full`（发布前全量）。档位登记单一源＝`server/test-tier-registry.mjs`。
- **验证顺序**：先定向跑改到的文件 → 再跑同域守卫 → 收尾跑 daily；发布前跑 full。
- **不以 GetDiagnostics 代替测试**；不以「模块能 import」代替行为验证。
- **红项分类**：环境 / 陈旧断言 / 真回归；不得把红改成 `skip` 或删断言。

## H26. 上下文与台账纪律

**H26 总则**：`.ctx` 是仓库，不是 active context；active context ＝ 本文件 + `.ctx/ACTIVE_CONTEXT.md`。规则 / 判例 / 方法正文进 `content/01–05`；`.ctx` 只留当前投影、索引与证据。

**H26.1 日志分层。** **git commit message 是第一主记录**；`EXECUTION_LOG` 只写「为什么 / 拿不准 / 边界 / 读数 / commit hash」，不得复述逐文件 diff / 改动清单。改动事实用 `git show <hash>` / `git log --grep` 取回；message 模板见 `H20.3`。

**H26.2 一文件一问答。** 每个台账只答一个问题；完成即删，沿革归 git。`ACTIVE_RULINGS` 只做索引，不存规则正文。

**H26.3 `.ctx` 准入。** 顶层白名单 **10 项**：`logs/`、`evidence/`、`TIMESTAMPS.md`、`SNAPSHOT.md`、`REVIEW_QUEUE.md`、`ACTIVE_RULINGS.md`、`ENGINEERING_ASSESSMENT.md`、`ACTIVE_CONTEXT.md`、`README.md`、`AGENTS.md`。新增文件未命中即先沉淀到 content，再归档。

> 历史锚点（守卫 `docs-governance::G12` 依赖）：批次 521 将设计系统分编为父索引 ＋ 五编；该句只作历史事实保留，不构成现行规则。

**H26.4 Active Context 预算与冲突。** `.ctx/ACTIVE_CONTEXT.md` ≤300 行 / ≤30KB；`latest_decision` 必须 ≥ 当月决策日志末条；冲突顺序＝当月 `DECISION_LOG` ＞ `ACTIVE_CONTEXT` ＞ `content` 权威 ＞ `SNAPSHOT` ＞ `ENGINEERING_ASSESSMENT` ＞ `logs` / `evidence`。

## H27. AI 逃逸捕捉

**定义**：本应 rule-based（确定性执行）却写成 AI 可自行取舍的软性表述＝逃逸点。

**五维扫描**：`E1` 规则软化 · `E2` 判据缺位 · `E3` 边界模糊 · `E4` 例外无闸 · `E5` 验证无闭环。详细流程并入 `H60.5` 第⑦行，不另设长节。

## H30. 一改具改原则与母本子本关系

- **一改具改**：改一条口径，必须全仓搜索所有引用（文档 / 代码 / 守卫 / 日志），一次改完；只改一处＝没改完。
- **母本优先**：母本（制度 / 设计规范 / 数据模型）与子本（实现 / README / 帮助页）冲突时，以母本为准；子本只做指针，不复述母本全文。
- **先删后加**：新增规则前先查是否已有同一规则；有则合并，不另起一份。
- **落点单一**：规范进 `content/03/04`，方法进 `content/05`，判例进 `CASES`，过程进 `.ctx/logs/`。

## H31. 组件复用纪律

- 同一 UI 语义只允许一个组件出口（按钮 / 输入 / 表格 / 徽章 / 分页 / 筛选条）；
- 新代码不得直接写裸控件或复制样式；存量按 `style-baseline.mjs` 的棘轮只减不增；
- 组件变更必须同批检查调用点，不做「只改组件、调用方各自兼容」。

## H32. 数据接入口径

- UI 不直接读 `mock/` 或 `localStorage`；只经 `data-adapter` / `api-adapter` 门面。
- 新数据域先定「表 / 字段 / 读写口 / 权限门 / 种子」五件，再写 UI。
- 活动内嵌数据与独立表的选择：能独立查询、授权、留痕的，建表；纯展示快照才内嵌。

## H40. 文件修改检查清单

### H40.1 通用检查

1. 改前读 `DATA_CONSISTENCY_CHECKLIST §0.2` 相关规则；
2. 改中先数同类病灶规模（>1 处即建台账 + 真机覆盖）；
3. 改后更新守卫 / 基线 / README 清单；
4. 交付报告第一屏给提交命令与未提交规模；
5. 定向测试为主，交付前才跑全量。

### H40.2 UI 变更前置卡

- **何时读**：任务涉及 UI / 布局 / 交互改动时。
- **去哪读**：先读 `content/05_ai_coding/UI_REVIEW_CHECKLIST.md` 对应任务组，再读 `content/04_web_design/design-system/DS_03_COMPONENTS.md` / `DS_06_LAYOUT_AND_DENSITY.md` 对应条文（设计哲学与外包入口见 `content/04_web_design/design-system/DESIGN_SYSTEM.md §0`）。
- **答不出怎么办**：先补证据（真机 / 读数 / 现有判据），证据补齐前不动笔；不得凭手感加色块 / 加边框。

### H40.3 常驻界面约束（批次 524 收口）

1. `section` 必须有可访问名称、同页不得嵌套；布局用 `div`。
2. 指标 / 状态用 `--status-*-text` 或 `--neutral-800`；动作 / 导航 / 选中态才用主题色。
3. 只读文案由 `view-capability.js::readonlyMeta` 派生，不写死「· 只读」。
4. 输入 / 下拉只经 `forms.js`；裸输入存量只减不增。
5. 待办跳转只经 `todo-actions.js` + `workspace-nav.js`。
6. 页签密度 / 筛选条 / 建议输入见 `DS_06 §二`（SD-57/58/59）。
7. 发布前跑 `audit-tabs --all`，P0/P1=0。

## H50. 乙部与丙部生命周期

**H50.1 乙部只留在办项。**

- 写入：每条必须有 ID、一句话、判据 / 出处、状态、目标批次；
- 完成：确认已写执行日志后，**整行删除**，不标 ✅；
- 假任务 / 冻结件 / 只需支书本人操作的事项，不得留在乙部。

**H50.2 丙部只留待裁。**

- 触发：AI 拿不定主意，或发现需人类判断的产品 / 制度取向；
- 写法：问题 + 选项 + 推荐 + 影响；
- 裁定后：决策日志归档 → 执行 → 从丙部删除。

## H60. 支书评议工作流

**H60.1 入口**：支书说「评议 / 审查 / 复盘」即启动；先读 `REVIEW_QUESTION_SET` 与 `REVIEW_QUEUE` 未闭环。

### H60.2 提示词模板（指针）

完整模板见 `content/05_ai_coding/PARALLEL_SKILL_AUDIT.md §3` 与 `REVIEW_AND_EXPRESSION.md`；本文件不复制。

### H60.3 分流表

结论分「立即改 / 排批 / 只登记」三档；改判据与改实现同批，动同一 DOM / IA 的一次做完。

### H60.4 输出 schema（指针）

完整 schema 见 `content/05_ai_coding/PARALLEL_SKILL_AUDIT.md §4`；报告至少含覆盖范围、未覆盖范围、证据条数、共识 / 分歧 / 待裁定。

### H60.5 检查要点生命周期（指针）

触发式入库、去重、降级与废止规则见 `content/05_ai_coding/REVIEW_AND_EXPRESSION.md` 与 `REVIEW_QUEUE` 附录；本文件只留入口。

### H60.6 触发式入库（指针）

新检查要点先入 `REVIEW_QUEUE` 方法总索引，出现 2 次以上再升 `content/05_ai_coding`；细则见 `REVIEW_AND_EXPRESSION.md`。

**H60.7 归口**：评议产物必须归口到 `CLAUDE.md` 乙部（在办）、`REVIEW_QUEUE`（待议）或 `content`（规则 / 判例）；不得只留在会话里。

> H60.2–H60.6 的完整方法见 `content/05_ai_coding/REVIEW_AND_EXPRESSION.md` 与 `PARALLEL_SKILL_AUDIT.md`；本文件只留入口与归口。

## H70. 反思触发流

支书说「反思 / 值得思考」时，按六步执行：① 复述原话；② 找事实与假设；③ 找反例；④ 定判据；⑤ 落 content / 守卫；⑥ 回报改动与未决。不得只写感想。

## H80. 反馈学习闭环

1. 收到修正 → 提取 `ai_assumption / human_intent / divergence_type / generalization`；
2. 泛化规则必须能布尔化；
3. 规则写入 `content/05_ai_coding/TEST_AND_VERIFICATION.md` 或 `CLAUDE.md` 对应 H 节；
4. 与既有规则冲突时先问支书，不静默覆盖；
5. 下一轮按 Top-5 稀疏检索应用，并报告命中。

# 温层：修改时必读

# 冷层：按需参考

## H90. 外部权威源索引

| 需要什么 | 去哪 |
|---|---|
| 战略 / 支书原话 | `content/01_strategy/SECRETARY_DIRECTIVES.md` |
| 制度 / 角色 / 权限 | `content/02_institution/SYSTEM_ROLE_PERMISSION.md`、`COMMISSIONER_DUTY_FRAMEWORK.md`、`sop/*` |
| 架构 / 单一事实源 | `content/03_doc_system/ARCHITECTURE.md` |
| 文档导航 / 术语 | `content/03_doc_system/DOC_MAP.md`、`TERMINOLOGY.md` |
| 设计 / 数据 / 部署 | `content/04_web_design/design-system/*`、`data/DATA_MODEL.md`、`deploy/DEPLOYMENT_GUIDE.md` |
| UI 审查（改界面时） | `content/05_ai_coding/UI_REVIEW_CHECKLIST.md`、`content/04_web_design/design-system/DS_03_COMPONENTS.md` / `DS_06_LAYOUT_AND_DENSITY.md` |
| 页签审计 | `content/05_ai_coding/TAB_AUDIT_PLAYBOOK.md`、`content/05_ai_coding/AUDIT_CANON.md` |
| AI 方法 / 判例 | `content/05_ai_coding/*` |
| 当前状态 | `.ctx/ACTIVE_CONTEXT.md` |
| 历史 / 证据 | `.ctx/logs/`、`.ctx/evidence/` |

## H100. 项目产出声明

本项目产出：① 可运行的支部管理网页系统；② 可复用的制度 / 设计 / 数据文档；③ 可复用的 AI 协作方法（`content/05_ai_coding`）。不以「代码量 / 文档量」作为产出证明；以「可运行、可验证、可交接」为准。

# 乙部：具体执行事项（常为新的）

> **规则**：只留在办项；每条有 ID、一句话、判据 / 出处、状态、目标批次；完成即整行删除（`H50.1`）。假任务 / 冻结件 / 只需支书本人操作的事项不入表。

## 持续任务

| ID | 事项 | 判据 / 出处 | 状态 |
|---|---|---|---|
| C-3 | 经验沉淀：从日志提炼可复用模式写入 insights | `H30` + `OPERATIONS_GUIDE §10.1` | 在办 |
| C-4 | 视觉体验持续优化：颜色 / 卡片 / 排序审校 | `DESIGN_SYSTEM` §12.11–§12.14 | 在办 |

## 评议待办 · 执行型（H60.7 归口）

| ID | 一句话结论 | 引用流程 | 状态 |
|---|---|---|---|

## 在办任务（批次 530–532）

| 目标批次 | 条目 | 一句话 | 判据 / 出处 | 状态 |
|---|---|---|---|---|
| 530 | B-520-3 / B-520-5 / B-518-1 / B-518-2 / B-515-3 / B-515-5 | 低风险收口（分片）：常量层、旧色名、状态胶囊两族、加载态骨架、content 重复表达、text-xs/form-loop 口径 | `DS_03`、`GUARD_INVENTORY`、`DOC_MAP §七` | 在办 |
| 531 | B-500-1 / B-515-6 / B-516-1 | 审查存量清欠：R5 P2/P3、真缺陷 4 + 复跑 1 + e2e 9、12 条人工核 | `.ctx/logs/archive/2026-10/AUDIT_R5_*.md`、两份 tasks.md | 待启动 |
| 532 | B-500-7 / B-522-1 / B-522-2 | 结构性：待办派生服务端化；「今天 / 归档」先收拢卡片；help.html 532 处硬编码色分步棘轮 | `todo.js`、`density-audit.json`、`color-audit.json` | 待启动 |

> **已清出**：批次 524 七条规则已并入 `H40.3` 与 `DS_06`；`B-518-4` 并入 `B-522-2`；`V-10b`（支书本人上传）移出；About 冻结件 `B-520-1` / `B-521-3` / `B-522-3` 删除；`B-521-2` 作为 `H26.1` 备注保留。**批次 530 已核实完成**：`B-500-6`（`branches` / `appointmentRecords` 已是 `party-staff` 写门）、`B-520-2`（`.btn-md` 五个调用点已改类名驱动）、`B-518-3`（全站仅 About 冻结件保留 `scrollIntoView smooth`）。

# 丙部：待决策事项

> 只留真待裁：问题 + 选项 + 推荐 + 影响；裁定后归档并删除（`H50.2`）。

| ID | 问题 | 选项 | 推荐 | 影响 |
|---|---|---|---|---|
