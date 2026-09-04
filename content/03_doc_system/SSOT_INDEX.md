---
title: "单一权威源索引"
type: index
role: "[工程师]+[AI]"
last_updated: "2026-09-04"
version: "3.9"
status: active
related_files: [CLAUDE.md, ARCHITECTURE.md, content/01_strategy/, content/04_web_design/, content/03_doc_system/, content/02_institution/sop/, content/insights/]
---

# SSOT_INDEX.md

## 定位

本文件是全工作区母本子本关系的**完整注册表**——所有"哪个文件是哪个文件的母本"的级联关系都在此注册。

**与相关文件的关系**（参见 [CLAUDE.md H30.2](../../CLAUDE.md#h302-设计母本与子本)）：
- **CLAUDE.md H30.2**：提炼5条核心原则（制度→代码 / 理论→工程 / 路线图→执行 / 经验→沉淀 / 术语→全仓）
- **本文件（SSOT_INDEX.md）**：注册全部约25条级联关系，是母本子本关系的唯一权威注册表
- **OPERATIONS_GUIDE.md §1.1**：定义文档权威层级（5 类知识类型）与冲突裁决规则
- **DOC_MAP.md**：按目录结构组织的导航图，标注每个文件的权威层级

三者关系：H30.2 提炼核心原则 → SSOT_INDEX 注册全部关系 → OPERATIONS_GUIDE §1.1 定义层级 → DOC_MAP 标注层级。

---

## 注册表映射

> 按 5 类知识类型（见 [OPERATIONS_GUIDE.md §1.1](./OPERATIONS_GUIDE.md)）组织。每条关系标注母本→子本及同步规则。

### 根目录 → content/ 各知识类型

| 母本 | 子本 | 同步规则 |
|------|------|---------|
| `CLAUDE.md` 甲部 H30.2 | `content/01_strategy/`、`content/04_web_design/`、`content/03_doc_system/` | Harness 是 guides 的摘要和索引（非副本）。甲部保留核心原则+判例，详细设计归 guides。甲部引用的原则变更必须同步更新 guides |
| `CLAUDE.md` 乙部 | `.ctx/logs/YYYY-MM-EXECUTION_LOG.md` | 路线图→执行。完成事项从乙部删除，写入执行日志 |
| `SECRETARY_DIRECTIVES.md` | `CLAUDE.md` H90（外部权威源索引） | 党支书工作交接文档是理论基石的母本。新增论断时同步更新 CLAUDE.md H90 索引表 |
| `SECRETARY_DIRECTIVES.md` | `content/01_strategy/DEVELOPMENT_PATH.md` | 理论基石→战略展开。党支书工作交接文档是母本（木本），DEVELOPMENT_PATH 是子本（AI 扩充的战略叙事）。冲突时以 SECRETARY_DIRECTIVES 为准 |
| `SECRETARY_DIRECTIVES.md` | `content/02_institution/FLAT_ORGANIZATION_DESIGN.md` | 理论基石→制度设计。扁平化论断（P-009/P-010）的母本，FLAT_ORGANIZATION_DESIGN 是子本展开 |
| `SSOT_INDEX.md` | `ARCHITECTURE.md` | 注册表是架构说明的溯源参考 |

### content/ 内部及交叉（strategy ↔ institution ↔ doc_system ↔ web_design ↔ insights）

| 母本 | 子本 | 同步规则 |
|------|------|---------|
| `content/01_strategy/DEVELOPMENT_PATH.md` | `content/04_web_design/data/DATA_FLOW.md` | 战略→设计。DEVELOPMENT_PATH 是上游战略依据，DATA_FLOW 是数据流设计的落地（原 PARTICIPANT_DATAFLOW.md，2026-08-24 拆分） |
| `content/01_strategy/DEVELOPMENT_PATH.md` | `content/02_institution/FLAT_ORGANIZATION_DESIGN.md` | 战略→设计。FLAT_ORGANIZATION_DESIGN 的扁平化是"理解真实"认知的具体实现。冲突时以 DEVELOPMENT_PATH 为准 |
| `content/04_web_design/data/DATA_FLOW.md` | `content/02_institution/COMMISSIONER_DUTY_FRAMEWORK.md` | 数据流→支委系统。DATA_FLOW 定义三级参与者数据流，COMMISSIONER_DUTY_FRAMEWORK 细化支委系统设计 |
| `content/04_web_design/module/SOP_WEBSITE_GUIDE.md` | `content/02_institution/sop/*.md`（双向） | 双向修改规则（CLAUDE.md H30.2 制度→代码）。规则0：文本SOP是母本；规则2：先改SOP母本→再改系统代码→验证 |
| `content/insights/党支部管理与实务经验沉淀.md` | `content/01_strategy/`、`content/04_web_design/` | 经验→设计反馈。insights 是经验沉淀，可反哺战略和设计校准。当经验与战略冲突时提交书记决策 |

### content/ → docs/src/（设计/制度 → 代码）

| 母本 | 子本 | 同步规则 |
|------|------|---------|
| `content/02_institution/sop/*.md` | `docs/src/workflow/`、`docs/src/` | 制度→代码（H30.2 规则1）。SOP 制度文本是系统代码的母本。凡涉及流程步骤、术语、权限规则，必须先检查 content/02_institution/sop/ |
| `content/04_web_design/data/DATA_FLOW.md` | `docs/src/`（角色权限引擎） | 设计→代码。数据流架构定义角色数据流、§登录态打桩设计，代码实现设计（原 PARTICIPANT_DATAFLOW.md） |
| `content/02_institution/COMMISSIONER_DUTY_FRAMEWORK.md` | `docs/src/`（专班管理 + 审批流程） | 设计→代码。支委系统设计定义专班管理逻辑和§审批流程规范，代码实现 |
| `content/04_web_design/design-system/DESIGN_SYSTEM.md` | `docs/src/styles.css` | 设计→样式。设计系统规范是全局样式的母本（2026-08-24 拆分：色彩→COLOR_SYSTEM，组件→COMPONENT_SPEC） |
| `content/04_web_design/design-system/COLOR_SYSTEM.md` | `docs/src/styles.css`（色彩变量） | 设计→样式。色彩系统规范是色值定义的母本（查色值优先） |
| `content/04_web_design/design-system/COMPONENT_SPEC.md` | `docs/src/components/*` | 设计→代码。组件规范是各组件实现的母本（写组件优先） |
| `content/04_web_design/module/MODULE_UI_DESIGN.md`（已落地 2026-09-03） | `docs/src/components/calendar.js` | 设计→代码。日历功能规划（原 CALENDAR.md，已合并入 MODULE_UI_DESIGN）是日历渲染引擎的历史母本 |
| `content/04_web_design/data/DATA_MODEL.md` | `docs/src/core/domain.js` | 数据→代码。数据字段定义权威源（含§写入数据验证设计，原 DATA.md），代码中的数据结构必须与 DATA_MODEL.md 一致 |
| `content/04_web_design/data/DATA_FLOW.md` | `docs/src/core/state.js` | 设计→代码。DATA_FLOW §登录态打桩设计是状态中心登录逻辑的母本（原 LOGIN_STUB.md §一~§五，原 PARTICIPANT_DATAFLOW.md） |
| `content/04_web_design/data/DATA_FLOW.md` | `docs/src/services/auth.js`（未来） | 设计→代码（预留）。登录系统设计前置规范定义未来登录系统的用户身份模型和认证机制（原 LOGIN_STUB.md §六~§十一，原 LOGIN_SYSTEM_DESIGN.md） |
| `content/04_web_design/data/DATA_FLOW.md` | `docs/src/services/auth.js`（T110 新增 API） | 设计→代码。DATA_FLOW 定义角色数据流模型，auth.js 实现 `getUserProjectRoles` / `hasProjectRole` / `getAccessibleWorkspacePages` 三个公开 API（T110 新增，含 `getPageForRole` 内部映射） |
| `content/04_web_design/module/MODULE_UI_DESIGN.md`（已落地 2026-09-03） | `docs/index.html`（Module 4） | 设计→代码。模块界面设计（原 PAFFAIRS_UI.md，原 ORG_BUILDING.md 拆分后的系统设计部分）是工作台模块 UI 的历史母本 |
| `content/03_doc_system/SERVICE_CATALOG.md` | `docs/src/entries/*.js` | 治理→代码。服务清单是各入口文件服务实现的母本（原 design/ 迁移至 governance/） |

### doc_system/ → 全仓库

| 母本 | 子本 | 同步规则 |
|------|------|---------|
| `content/03_doc_system/USAGE_POLICY.md` | 全仓库 + `docs/src/core/constants.js` | 术语→全仓。术语变更触发一改具改（H30.1）。代码中的术语必须与 USAGE_POLICY.md §一 一致（2026-07-12 合并自 TERMINOLOGY.md + EMOJI_POLICY.md） |
| `content/03_doc_system/OPERATIONS_GUIDE.md` | 全仓库 | 运行标准→全仓。YAML/编码/编号/文档关系/权威层级/三类文件角色规范/§15 周期性任务，全仓库必须遵守（2026-07-12 合并原 RECURRING_TASKS.md 为 §15） |
| `content/02_institution/ROLE_CLASSIFICATION.md` | `docs/src/core/state.js` | 角色分类→代码。文件角色分类体系是 state.js 角色常量的母本 |

### 审计参考层 → content/ 制度

| 母本 | 子本 | 同步规则 |
|------|------|---------|
| `content/01_strategy/references/合规文件/` | `content/02_institution/sop/` | 官方文件→SOP。官方文件与党章是所有 SOP 文本的母本。任何 SOP 文本调整，必须先回查 content/01_strategy/references/ |

### 审计参考层 → content/ 理论

| 母本 | 子本 | 同步规则 |
|------|------|---------|
| `.ctx/logs/DECISION_LOG.md` | `content/insights/*.md` | 经验→沉淀。决策日志定期沉淀为经验沉淀（H30.4 经验沉淀规则） |

---

## Agent/Skill 配置（已迁出）

> **2026-07-21 D-186 终结**：`.github/` 目录已物理迁出至 `D:\GitHub\System-Residual\.github\`，不再属于本仓库。VSCode Agent/Skill 配置外部管理，以下注册表仅作为历史档案保留。本文件不再保留 Agent 注册表与 Skill 配置清单表格。

## 文档变更同步机制

### 权威源治理模式（原 insights §5.7 并入）

> **确立日期**：2026-09-04（insights 分流归位）。本节是权威源治理大命题的执行面——唯一权威源（结构）、权威源转移（迁移）、变更传播（更新）；下方注册表映射、同步触发矩阵、溯源修改强制原则即三个维度的实例化。

**唯一权威源与切面视图**：同一主题只能有一个权威源，其他描述同一主题的文件是"切面视图"——只提供该主题的概要或特定角度，冲突时以权威源为准；切面视图必须标注"权威源指向"（如"详细见 XX.md"），让读者知道完整内容在哪里。为什么权威源必须唯一：多文件描述导致散落、漂移与不一致——修改 A 遗漏 B 时读者无法判断哪个准确，唯一权威源消除"哪个是对的"的判断成本。为什么不是"切面视图也算权威源"：切面视图是摘要或特定角度，可能为简洁省略细节或做适用性裁剪；权威源唯一性确保"去哪里找完整答案"是确定的。

**迁移场景：权威源转移与交叉引用保留**：文件合并/拆分迁移时，权威源地位随之转移——合并后的目标文件承接原权威源地位、拆分后的各部分分别承接各自主题的权威源地位，并同步更新本文件注册表映射。内容从 A 迁到 B 后，A 文件原位置应保留交叉引用 + 迁移说明（如"本节内容已迁移至 B.md §X"）而非直接删除——外部引用不会随迁移自动更新，保留交叉引用让原有指向 A 的引用仍然有效（读者到达 A 后能看到"已迁移至 B"指引）。

**更新场景：变更传播——「变更已记录」≠「变更已传播」**：权威源更新后，下游文件不会自动同步。判例：一次定义更新，6 天后全仓仍有 5 处旧定义残留（sop/INDEX.md 母本、ARCHITECTURE.md、DEVELOPMENT_PATH.md 附录 B、COMMISSIONER_FRAMEWORK.md、SERVICE_CATALOG.md 均沿用旧定义）——沉淀机制的价值在于纠正过一次的问题应永久记住、不再反复提起。"更改"指一切权威源内容变更：**降级**（旧定义被新定义取代）只是其中一种，还包括**替换**（术语换用新词）、**合并**（多文件并为单一权威源）、**退役**（概念不再使用）。

**区分「定义残留」与「合法功能分区」**：
- **必须改**：与权威源不一致的旧定义——权威源变更后旧表述即属残留，须全仓同步；"那是旧的划分"这类表述同样不写，只讲"当前定义是什么"
- **保留**：功能分区本身不是旧定义的载体——分区标题与 UI 标签归位到现行分区即可；2026-09-03 起分区统一为「党建」Tab 组名，不再出现党建/党务二分章节标题与场景前缀

**Boolean 条件**：定义/术语变更传播完成 ⇔ 全仓 Grep 旧表述零残留（合法功能分区除外）**且** 权威源所有链接指向的下游文件已同步。

**预防机制**：CLAUDE.md H70 反思触发流——"反思"被提起时强制 ① 定位权威源最近变更 → ② 沿链接追踪下游文件 → ③ 全仓 Grep 旧表述 → ④ 一改具改 → ⑤ 机制补缺 → ⑥ 沉淀验证；C-5 术语审计纳入「已降级定义残留」扫描项。

**生效条件**：权威源模式适用于同一主题被多个文件描述、且各文件详细程度不同的场景；迁移交叉引用适用于文件合并、拆分、内容迁移的所有场景；变更传播适用于任何定义/术语/层级更新后的一改具改。验证方法：从权威源沿链接逐文件核对 + 全仓 Grep 旧表述。

### 同步触发矩阵

| 变更源（母本） | 触发条件 | 必须同步的子本 |
|---|---|---|
| CLAUDE.md | 规则增删改、链长策略变更、/ask 与 /confirm 规范变更 | 全仓库所有引用方 |
| SSOT_INDEX.md | 映射关系增删改 | 受影响的子本文件 |
| content/02_institution/sop/*.md | 制度条款/流程步骤/术语变更 | docs/src/ 对应代码文件（见 sop-web-sync 映射表） |
| content/03_doc_system/USAGE_POLICY.md | 术语增删改 | docs/src/core/constants.js + 全仓库引用 |
| content/04_web_design/data/DATA_MODEL.md | 数据字段定义变更 | docs/src/ 对应数据结构代码 |

### 同步执行步骤

1. **变更源识别**：确定变更发起的母本文件与具体变更内容。
2. **影响面分析**：基于本注册表的映射关系，列出所有受影响的子本文件。
3. **逐文件同步**：按审查顺序逐个更新子本。
4. **一致性校验**：同步完成后，输出《同步校验报告》。
5. **日志记录**：将同步操作记录至当月执行日志。

## 溯源修改强制原则

1. 任何涉及修改子本的请求，必须前置检查母本。
2. 若子本与母本存在冲突，以母本为准。
3. 严禁头痛医头式的孤立修改。
4. 任何对下游文件的变更规划，必须明确写出对应母本来源与影响链路。
5. 对于跨层修改，必须先完成母本确认，再执行子本收敛。
6. 若母本未明确，则禁止进入写盘阶段，只能输出只读审查结论。

## 审查顺序

1. 先查核心层：CLAUDE.md
2. 再查项目中枢：CLAUDE.md（未来执行路线图）
3. 再查文本母本层：content/02_institution/sop/
4. 再查代码内容层：docs/src/workflow/

> 注：VSCode Agent/Skill 配置已于 2026-07-21 迁出至 `D:\GitHub\System-Residual\.github\`，不再纳入本仓库审查范围。

## 已迁移文件索引

| 原路径 | 新路径/处理方式（现行） | 迁移日期 |
|--------|----------------|---------|
| governance/* | → CLAUDE.md §五/§六（整合）或删除 | 2026-05-02 |
| backlog/* | → CLAUDE.md §五（整合）或删除 | 2026-05-02 |
| .vibe_context/* | → .ctx/（迁移）或删除 | 2026-05-02 |
| knowledge/SOP/ | → content/02_institution/sop/（经 content/sop/ 过渡） | 2026-05-02 |
| docs/ | → content/01_strategy/ + content/04_web_design/ + content/03_doc_system/ + content/insights/（经 content/guides/ 过渡） | 2026-05-02 |
| 参考资料/ | → content/01_strategy/references/ | 2026-05-02 |
| AI_ENTRYPOINT.md | → 已合并至 ARCHITECTURE.md | 2026-05-01 |
| SYSTEM_CLAUDE.md | → CLAUDE.md | 2026-05-02 |
| .github/SSOT_INDEX.md | → SSOT_INDEX.md（移至根目录） | 2026-05-18 |
| content/design/PERMISSION_MATRIX.md | → content/02_institution/ROLE_CLASSIFICATION.md §九 角色权限矩阵（经 MANAGEMENT_MODE.md 过渡） | 2026-07-08 |
| content/design/LOGIN_STUB.md | → content/04_web_design/data/DATA_FLOW.md（登录态打桩设计 §一~§五 + 登录系统设计前置 §六~§十一；2026-07 先并入数据架构总文件，2026-08-24 拆分后归 DATA_FLOW） | 2026-07-08 |
| content/design/APPROVAL_FLOW.md | → content/02_institution/COMMISSIONER_FRAMEWORK.md §审批流程规范（全量合并） | 2026-07-08 |
| content/design/WRITE_VERIFY.md | → content/04_web_design/data/DATA_MODEL.md §写入数据验证设计（精简合并，§三/§五删除；2026-07 并入数据架构总文件，2026-08-24 拆分后归 DATA_MODEL） | 2026-07-08 |
| content/governance/LAYERING_FRAMEWORK.md | → content/03_doc_system/OPERATIONS_GUIDE.md §1.3/§1.4（独有内容合并）+ content/05_ai_coding/DOCUMENT_GOVERNANCE.md（分层体系冲突记录节，原 §7）+ OPERATIONS_GUIDE.md §17（原 RECURRING_TASKS Q4，5 步流程） | 2026-07-09 |
| content/design/SERVICE_CATALOG.md | → content/03_doc_system/SERVICE_CATALOG.md（迁移至治理层） | 2026-07-11 |
| content/design/ORG_BUILDING.md | → content/04_web_design/module/MODULE_UI_DESIGN.md（系统设计部分，经 PAFFAIRS_UI.md 合并）+ content/01_strategy/DEVELOPMENT_PATH.md 附录 B（战略分类部分，原"第七章"） | 2026-07-11 |
| content/design/COMMISSIONER_SYSTEM.md | → content/02_institution/COMMISSIONER_FRAMEWORK.md（迁移+重命名，"FRAMEWORK"避免"SYSTEM"歧义） | 2026-07-11 |
| content/design/DATA.md | → content/04_web_design/data/DATA_MODEL.md（数据模型定义；2026-07-12 并入数据架构总文件，2026-08-24 拆分后归 DATA_MODEL） | 2026-07-12 |
| content/design/PARTICIPANT_DATAFLOW.md | → content/04_web_design/data/DATA_FLOW.md（动态数据流；2026-07-12 并入数据架构总文件，2026-08-24 拆分后归 DATA_FLOW） | 2026-07-12 |
| content/design/LOGIN_SYSTEM_DESIGN.md | → content/04_web_design/data/DATA_FLOW.md（登录系统设计前置 §六~§十一；2026-07-12 并入数据架构总文件，2026-08-24 拆分后归 DATA_FLOW） | 2026-07-12 |
| content/design/BRAND_ACTIVITY.md | → content/04_web_design/data/DATA_MODEL.md + DATA_FLOW.md（品牌/活动内容随 2026-07-12 并入数据架构总文件、2026-08-24 拆分归位） | 2026-07-12 |
| content/design/PAFFAIRS_UI.md | → content/04_web_design/module/MODULE_UI_DESIGN.md（合并至模块界面设计总文件） | 2026-07-12 |
| content/design/CALENDAR.md | → content/04_web_design/module/MODULE_UI_DESIGN.md（合并至模块界面设计总文件） | 2026-07-12 |
| content/design/SOP_WEB.md | → content/04_web_design/module/SOP_WEBSITE_GUIDE.md（2026-07-12 迁移至 web_design 层；2026-09-04 命名规范化） | 2026-07-12 |
| content/design/FLAT_DESIGN.md | → content/02_institution/FLAT_DESIGN.md（迁移至 institution 层） | 2026-07-12 |
| content/governance/TERMINOLOGY.md | → content/03_doc_system/USAGE_POLICY.md §一（合并至使用规范） | 2026-07-12 |
| content/governance/EMOJI_POLICY.md | → content/03_doc_system/USAGE_POLICY.md §三（合并至使用规范） | 2026-07-12 |
| content/governance/RECURRING_TASKS.md | → content/03_doc_system/OPERATIONS_GUIDE.md §17（合并为周期性任务章节，删除原 §五附录初始化清单） | 2026-07-12 |

## 使用规则

- 这是全局一致性判断的唯一参考入口。
- 任何局部修改规划，都必须标注其母本链路。
- 若出现多文件联动修改，必须先验证母本是否同意该变化方向。
- 若出现功能、措辞、流程三者不一致，以母本优先修正。
- 若出现新旧两套说法并存，必须先消除母本歧义，再处理子本。
