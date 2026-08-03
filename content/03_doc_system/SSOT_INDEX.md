---
title: "单一权威源索引"
type: index
role: "[工程师]+[AI]"
last_updated: "2026-08-03"
version: "3.7"
status: active
related_files: [CLAUDE.md, ARCHITECTURE.md, content/01_strategy/, content/04_web_design/, content/03_doc_system/, content/02_institution/sop/, content/insights/]
---

# SSOT_INDEX.md

## 定位

本文件是全工作区母本子本关系的**完整注册表**——所有"哪个文件是哪个文件的母本"的级联关系都在此注册。

**与相关文件的关系**（参见 [CLAUDE.md H2.2](CLAUDE.md#h22-设计母本与子本)）：
- **CLAUDE.md H2.2**：提炼5条核心原则（制度→代码 / 理论→工程 / 路线图→执行 / 经验→沉淀 / 术语→全仓）
- **本文件（SSOT_INDEX.md）**：注册全部约25条级联关系，是母本子本关系的唯一权威注册表
- **OPERATIONS_GUIDE.md §7.1**：定义文档权威层级（5 类知识类型）与冲突裁决规则
- **DOC_MAP.md**：按目录结构组织的导航图，标注每个文件的权威层级

三者关系：H2.2 提炼核心原则 → SSOT_INDEX 注册全部关系 → OPERATIONS_GUIDE §7.1 定义层级 → DOC_MAP 标注层级。

---

## 注册表映射

> 按 5 类知识类型（见 [OPERATIONS_GUIDE.md §7.1](./OPERATIONS_GUIDE.md)）组织。每条关系标注母本→子本及同步规则。

### 根目录 → content/ 各知识类型

| 母本 | 子本 | 同步规则 |
|------|------|---------|
| `CLAUDE.md` 甲部 H2.2 | `content/01_strategy/`、`content/04_web_design/`、`content/03_doc_system/` | Harness 是 guides 的摘要和索引（非副本）。甲部保留核心原则+判例，详细设计归 guides。甲部引用的原则变更必须同步更新 guides |
| `CLAUDE.md` 乙部 | `.ctx/logs/YYYY-MM-EXECUTION_LOG.md` | 路线图→执行。完成事项从乙部删除，写入执行日志 |
| `SECRETARY_PRONOUNCEMENTS.md` | `CLAUDE.md` H6（外部权威源索引） | 书记论断汇编是理论基石的母本。新增论断时同步更新 CLAUDE.md H6 索引表 |
| `SSOT_INDEX.md` | `ARCHITECTURE.md` | 注册表是架构说明的溯源参考 |

### content/ 内部及交叉（strategy ↔ institution ↔ doc_system ↔ web_design ↔ insights）

| 母本 | 子本 | 同步规则 |
|------|------|---------|
| `content/01_strategy/DEVELOPMENT_PATH.md` | `content/04_web_design/DATA_ARCHITECTURE.md` | 战略→设计。DEVELOPMENT_PATH 是上游哲学锚点，DATA_ARCHITECTURE 是数据流设计的落地（原 PARTICIPANT_DATAFLOW.md） |
| `content/01_strategy/DEVELOPMENT_PATH.md` | `content/02_institution/FLAT_DESIGN.md` | 战略→设计。FLAT_DESIGN 的扁平化是"理解真实"认知的具体实现。冲突时以 DEVELOPMENT_PATH 为准 |
| `content/04_web_design/DATA_ARCHITECTURE.md` | `content/02_institution/COMMISSIONER_FRAMEWORK.md` | 数据流→支委系统。DATA_ARCHITECTURE 定义三级参与者数据流，COMMISSIONER_FRAMEWORK 细化支委系统设计 |
| `content/04_web_design/SOP_WEB.md` | `content/02_institution/sop/*.md`（双向） | 双向修改规则（CLAUDE.md H2.2 制度→代码）。规则0：文本SOP是母本；规则2：先改SOP母本→再改系统代码→验证 |
| `content/insights/党支部管理与实务经验沉淀.md` | `content/01_strategy/`、`content/04_web_design/` | 经验→设计反馈。insights 是经验沉淀，可反哺战略和设计校准。当经验与战略冲突时提交书记决策 |

### content/ → docs/src/（设计/制度 → 代码）

| 母本 | 子本 | 同步规则 |
|------|------|---------|
| `content/02_institution/sop/*.md` | `docs/src/workflow/`、`docs/src/` | 制度→代码（H2.2 规则1）。SOP 制度文本是系统代码的母本。凡涉及流程步骤、术语、权限规则，必须先检查 content/02_institution/sop/ |
| `content/04_web_design/DATA_ARCHITECTURE.md` | `docs/src/`（角色权限引擎） | 设计→代码。数据流架构定义角色数据流、§登录态打桩设计，代码实现设计（原 PARTICIPANT_DATAFLOW.md） |
| `content/02_institution/COMMISSIONER_FRAMEWORK.md` | `docs/src/`（专班管理 + 审批流程） | 设计→代码。支委系统设计定义专班管理逻辑和§审批流程规范，代码实现 |
| `content/04_web_design/DESIGN_SYSTEM.md` | `docs/src/styles.css` | 设计→样式。设计系统规范是全局样式的母本 |
| `content/04_web_design/MODULE_UI_DESIGN.md` | `docs/src/components/calendar.js` | 设计→代码。日历功能规划（原 CALENDAR.md）是日历渲染引擎的母本 |
| `content/04_web_design/DATA_ARCHITECTURE.md` | `docs/src/core/domain.js` | 数据→代码。数据字段定义权威源（含§写入数据验证设计，原 DATA.md），代码中的数据结构必须与 DATA_ARCHITECTURE.md 一致 |
| `content/04_web_design/DATA_ARCHITECTURE.md` | `docs/src/core/state.js` | 设计→代码。DATA_ARCHITECTURE §登录态打桩设计是状态中心登录逻辑的母本（原 LOGIN_STUB.md §一~§五，原 PARTICIPANT_DATAFLOW.md） |
| `content/04_web_design/DATA_ARCHITECTURE.md` | `docs/src/services/auth.js`（未来） | 设计→代码（预留）。登录系统设计前置规范定义未来登录系统的用户身份模型和认证机制（原 LOGIN_STUB.md §六~§十一，原 LOGIN_SYSTEM_DESIGN.md） |
| `content/04_web_design/DATA_ARCHITECTURE.md` | `docs/src/services/auth.js`（T110 新增 API） | 设计→代码。DATA_ARCHITECTURE 定义角色数据流模型，auth.js 实现 `getUserProjectRoles` / `hasProjectRole` / `getAccessibleWorkspacePages` 三个公开 API（T110 新增，含 `getPageForRole` 内部映射） |
| `content/04_web_design/MODULE_UI_DESIGN.md` | `docs/index.html`（Module 4） | 设计→代码。模块界面设计（原 PAFFAIRS_UI.md，原 ORG_BUILDING.md 拆分后的系统设计部分）是党务模块UI的母本 |
| `content/03_doc_system/SERVICE_CATALOG.md` | `docs/src/entries/*.js` | 治理→代码。服务清单是各入口文件服务实现的母本（原 design/ 迁移至 governance/） |

### doc_system/ → 全仓库

| 母本 | 子本 | 同步规则 |
|------|------|---------|
| `content/03_doc_system/USAGE_POLICY.md` | 全仓库 + `docs/src/core/constants.js` | 术语→全仓。术语变更触发一改具改（H2.1）。代码中的术语必须与 USAGE_POLICY.md §一 一致（2026-07-12 合并自 TERMINOLOGY.md + EMOJI_POLICY.md） |
| `content/03_doc_system/OPERATIONS_GUIDE.md` | 全仓库 | 运行标准→全仓。YAML/编码/编号/文档关系/权威层级/三类文件角色规范/§15 周期性任务，全仓库必须遵守（2026-07-12 合并原 RECURRING_TASKS.md 为 §15） |
| `content/02_institution/ROLE_CLASSIFICATION.md` | `docs/src/core/state.js` | 角色分类→代码。文件角色分类体系是 state.js 角色常量的母本 |

### 审计参考层 → content/ 制度

| 母本 | 子本 | 同步规则 |
|------|------|---------|
| `content/01_strategy/references/合规文件/` | `content/02_institution/sop/` | 官方文件→SOP。官方文件与党章是所有 SOP 文本的母本。任何 SOP 文本调整，必须先回查 content/01_strategy/references/ |

### 审计参考层 → content/ 理论

| 母本 | 子本 | 同步规则 |
|------|------|---------|
| `.ctx/logs/DECISION_LOG.md` | `content/insights/*.md` | 经验→沉淀。决策日志定期沉淀为经验沉淀（H2.4 经验沉淀规则） |

---

## Agent 注册表（已迁出）

> **2026-07-21 D-186 终结**：`.github/` 目录已物理迁出至 `D:\GitHub\System-Residual\.github\`，不再属于本仓库。VSCode Agent/Skill 配置外部管理，以下注册表仅作为历史档案保留。

| Agent 文件名 | Agent 名称 (frontmatter) | Agent 类型 | 主要职责 | 工具配置 | 是否支持 Handoff | 关联 Skill |
|---|---|---|---|---|---|---|
| mishuchu.agent.md | "协调调度Agent" | 协调型（Coordinator） | 计划、拆解、排序、依赖梳理 | ['read', 'search'] | ✅ (可委派给其他 Agent) | — |
| zuzhibu.agent.md | "规范执行Agent" | 执行型（Worker） | 文档规范化、术语治理 | ['read', 'agent', 'edit', 'search'] | ✅ (可委派给日志记录Agent) | term-cleaner, anchor-fixer |
| fagaiwei.agent.md | "文本执行Agent" | 执行型（Worker） | 文本母本与内容层治理 | ['read', 'agent', 'edit', 'search'] | ✅ (可委派给日志记录Agent) | sop-sync, sop-web-sync, yaml-slim |
| gongxinbu.agent.md | "代码执行Agent" | 执行型（Worker） | 代码内容层与 SOP 映射 | ['read', 'agent', 'edit', 'search'] | ✅ (可委派给日志记录Agent) | sop2code, data-inspector |
| waijiaobu.agent.md | "UI执行Agent" | 执行型（Worker） | UI 交互与可用性 | ['read', 'agent', 'edit', 'search'] | ✅ (可委派给日志记录Agent) | ui-verifier |
| sifabu.agent.md | "合规执行Agent" | 执行型（Worker） | 规则审查与合规纠偏 | ['read', 'agent', 'edit', 'search'] | ✅ (可委派给日志记录Agent) | audit-report |
| jianchayuan.agent.md | "独立审查Agent" | 审查型（Auditor） | 三层合规审查与独立巡视 | ['read', 'search'] | ❌ (纯只读) | audit-report, data-inspector, ui-verifier |
| jiguandangwei.agent.md | "架构监督Agent" | 监督型（Supervisor） | 全局核心原则与架构监督 | ['read', 'agent', 'edit', 'search'] | ❌ (高权限，不直接委派) | — |
| shekeyuan.agent.md | "经验分析Agent" | 分析型（Analyst） | 经验提炼与沉淀 | ['read', 'edit', 'search'] | ❌ (历史档案层) | experience-distiller |
| danganguan.agent.md | "日志记录Agent" | 记录型（Recorder） | 系统变更日志记录 | ['read', 'edit', 'search'] | ❌ (历史档案层) | log-recorder |

## Skill 配置清单

| Skill 名称 | 行数 | 估计 Tokens | context: fork | 主要 Gotchas |
|---|---|---|---|---|
| audit-report | 51 | ~1200 | ✅ | 抽样置信度边界、Agent frontmatter 属性检查 |
| data-inspector | 48 | ~1100 | ✅ | JS 对象字面量非 JSON、sibling 字段一致性 |
| ui-verifier | 50 | ~1150 | ✅ | DOM 动态绑定、CSS/JS 选择器交叉验证 |
| term-cleaner | 42 | ~1000 | — | 代码豁免、锚点同步 |
| anchor-fixer | 42 | ~1000 | — | GitHub 锚点规则、同名标题后缀 |
| yaml-slim | 40 | ~950 | — | version 强制保留、frontmatter 边界 |
| sop-sync | 44 | ~1050 | — | 结构优先、锚点重验证 |
| log-recorder | 52 | ~1200 | — | 来源门禁、append-only、模板复制 |
| experience-distiller | 43 | ~1050 | ✅ | 两阶段不可跳跃、先写后改标签 |
| sop2code | 52 | ~1200 | — | SSOT 铁律、场景约束必读 |
| sop-web-sync | 75 | ~1800 | — | 母本优先、映射表驱动、术语权威源 |

## 文档变更同步机制

### 同步触发矩阵

| 变更源（母本） | 触发条件 | 必须同步的子本 |
|---|---|---|
| CLAUDE.md | 规则增删改、链长策略变更、/ask 与 /confirm 规范变更 | 全仓库所有引用方 |
| SSOT_INDEX.md | 映射关系增删改 | 受影响的子本文件 |
| content/02_institution/sop/*.md | 制度条款/流程步骤/术语变更 | docs/src/ 对应代码文件（见 sop-web-sync 映射表） |
| content/03_doc_system/USAGE_POLICY.md | 术语增删改 | docs/src/core/constants.js + 全仓库引用 |
| content/04_web_design/DATA_ARCHITECTURE.md | 数据字段定义变更 | docs/src/ 对应数据结构代码 |

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

| 原路径 | 新路径/处理方式 | 迁移日期 |
|--------|----------------|---------|
| governance/* | → CLAUDE.md §五/§六（整合）或删除 | 2026-05-02 |
| backlog/* | → CLAUDE.md §五（整合）或删除 | 2026-05-02 |
| .vibe_context/* | → .ctx/（迁移）或删除 | 2026-05-02 |
| knowledge/SOP/ | → content/sop/ | 2026-05-02 |
| docs/ | → content/guides/ + content/insights/ | 2026-05-02 |
| 参考资料/ | → content/01_strategy/references/ | 2026-05-02 |
| AI_ENTRYPOINT.md | → 已合并至 ARCHITECTURE.md | 2026-05-01 |
| SYSTEM_CLAUDE.md | → CLAUDE.md | 2026-05-02 |
| .github/SSOT_INDEX.md | → SSOT_INDEX.md（移至根目录） | 2026-05-18 |
| content/design/PERMISSION_MATRIX.md | → MANAGEMENT_MODE.md §权限矩阵权威源（精简合并） | 2026-07-08 |
| content/design/LOGIN_STUB.md | → MANAGEMENT_MODE.md §登录态打桩设计（§一~§五）+ DATA_ARCHITECTURE.md §登录系统设计前置（§六~§十一，经 LOGIN_SYSTEM_DESIGN.md 合并） | 2026-07-08 |
| content/design/APPROVAL_FLOW.md | → COMMISSIONER_FRAMEWORK.md §审批流程规范（全量合并） | 2026-07-08 |
| content/design/WRITE_VERIFY.md | → DATA_ARCHITECTURE.md §写入数据验证设计（精简合并，§三/§五删除，经 DATA.md 合并） | 2026-07-08 |
| content/governance/LAYERING_FRAMEWORK.md | → OPERATIONS_GUIDE.md §7.3/§7.4（独有内容合并）+ KNOWN_PITFALLS.md §7（历史冲突记录）+ RECURRING_TASKS.md Q4（5 步流程） | 2026-07-09 |
| content/design/SERVICE_CATALOG.md | → content/governance/SERVICE_CATALOG.md（迁移至治理层） | 2026-07-11 |
| content/design/ORG_BUILDING.md | → content/design/MODULE_UI_DESIGN.md（系统设计部分，经 PAFFAIRS_UI.md 合并）+ content/strategy/DEVELOPMENT_PATH.md 第七章（战略分类部分） | 2026-07-11 |
| content/design/COMMISSIONER_SYSTEM.md | → content/strategy/COMMISSIONER_FRAMEWORK.md（迁移至战略层+重命名，"FRAMEWORK"避免"SYSTEM"歧义） | 2026-07-11 |
| content/design/DATA.md | → content/design/DATA_ARCHITECTURE.md（合并至数据架构总文件） | 2026-07-12 |
| content/design/PARTICIPANT_DATAFLOW.md | → content/design/DATA_ARCHITECTURE.md（合并至数据架构总文件） | 2026-07-12 |
| content/design/LOGIN_SYSTEM_DESIGN.md | → content/design/DATA_ARCHITECTURE.md（合并至数据架构总文件） | 2026-07-12 |
| content/design/BRAND_ACTIVITY.md | → content/design/DATA_ARCHITECTURE.md（合并至数据架构总文件） | 2026-07-12 |
| content/design/PAFFAIRS_UI.md | → content/design/MODULE_UI_DESIGN.md（合并至模块界面设计总文件） | 2026-07-12 |
| content/design/CALENDAR.md | → content/design/MODULE_UI_DESIGN.md（合并至模块界面设计总文件） | 2026-07-12 |
| content/design/SOP_WEB.md | → content/governance/SOP_WEB.md（迁移至治理层） | 2026-07-12 |
| content/design/FLAT_DESIGN.md | → content/strategy/FLAT_DESIGN.md（迁移至战略层） | 2026-07-12 |
| content/governance/TERMINOLOGY.md | → content/governance/USAGE_POLICY.md §一（合并至使用规范） | 2026-07-12 |
| content/governance/EMOJI_POLICY.md | → content/governance/USAGE_POLICY.md §二（合并至使用规范） | 2026-07-12 |
| content/governance/RECURRING_TASKS.md | → content/governance/OPERATIONS_GUIDE.md §15（合并为周期性任务章节，删除原 §五附录初始化清单） | 2026-07-12 |

## 使用规则

- 这是全局一致性判断的唯一参考入口。
- 任何局部修改规划，都必须标注其母本链路。
- 若出现多文件联动修改，必须先验证母本是否同意该变化方向。
- 若出现功能、措辞、流程三者不一致，以母本优先修正。
- 若出现新旧两套说法并存，必须先消除母本歧义，再处理子本。
