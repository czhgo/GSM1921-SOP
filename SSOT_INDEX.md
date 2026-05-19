---
title: "单一权威源索引"
type: index
role: "[AI]"
owner: "Org OS Agent 集群"
last_updated: "2026-05-18"
status: active
---

# SSOT_INDEX.md

## 绝对母本参考图

本文件是全工作区内在一致性审查与修改规划的绝对母本参考图。

## 注册表映射

| 母本层级 | 母本文件/目录 | 子本文件/目录 | 关系说明 |
|---|---|---|---|
| 党章 / 官方文件层 | content/references/ | content/SOP/ | 官方文件与党章是所有 SOP 文本的母本。任何 SOP 文本调整，必须先回查 content/references/。 |
| 文本内容层 | content/SOP/*.md | docs/src/workflow/ | 文本内容层是代码内容层的母本。凡涉及 workflow、字段含义、流程解释，必须先检查 content/SOP/。 |
| 文本内容层 | content/SOP/*.md | docs/src/ | SOP 制度文本是网页代码的母本。凡涉及流程步骤、术语、权限规则，必须先检查 content/SOP/。 |
| 设计理念层 | content/guides/governance/TERMINOLOGY.md | docs/src/core/constants.js | 术语权威源。代码中的术语必须与 TERMINOLOGY.md 保持一致。 |
| 设计理念层 | content/guides/architecture/DATA.md | docs/src/ 数据结构代码 | 数据字段定义权威源。代码中的数据结构必须与 DATA.md 保持一致。 |
| 宪章层 | .github/copilot-instructions.md | .github/agents/*.md, .github/skills/*/SKILL.md | 宪章是所有 Agent 配置文件与 Skill 定义的母本。凡涉及 Agent 行为、边界、写盘、交互、链长控制、/ask 与 /confirm 指令规范，必须先检查宪章。 |
| Skill 层 | .github/skills/*/SKILL.md | .github/agents/*.md（引用侧） | Skill 接口定义是 Agent 挂载引用的母本。Skill 变更时必须同步更新所有挂载该 Skill 的 Agent 文件。 |

## Agent 注册表 (基于 VS Code 原生子代理机制)

| Agent 文件名 | Agent 名称 (frontmatter) | Agent 类型 | 主要职责 | 工具配置 | 是否支持 Handoff | 关联 Skill |
|---|---|---|---|---|---|---|
| mishuchu.agent.md | "秘书处" | 协调型（Coordinator） | 计划、拆解、排序、依赖梳理 | ['read', 'search'] | ✅ (可委派给其他 Agent) | — |
| zuzhibu.agent.md | "组织部" | 执行型（Worker） | 文档规范化、术语治理 | ['read', 'agent', 'edit', 'search'] | ✅ (可委派给档案馆) | term-cleaner, anchor-fixer |
| fagaiwei.agent.md | "发改委" | 执行型（Worker） | 文本母本与内容层治理 | ['read', 'agent', 'edit', 'search'] | ✅ (可委派给档案馆) | sop-sync, sop-web-sync, yaml-slim |
| gongxinbu.agent.md | "工信部" | 执行型（Worker） | 代码内容层与 SOP 映射 | ['read', 'agent', 'edit', 'search'] | ✅ (可委派给档案馆) | sop2code, data-inspector |
| waijiaobu.agent.md | "外交部" | 执行型（Worker） | UI 交互与可用性 | ['read', 'agent', 'edit', 'search'] | ✅ (可委派给档案馆) | ui-verifier |
| sifabu.agent.md | "司法部" | 执行型（Worker） | 违宪审查与合规纠偏 | ['read', 'agent', 'edit', 'search'] | ✅ (可委派给档案馆) | audit-report |
| jianchayuan.agent.md | "检察院" | 审查型（Auditor） | 三层合规审查与独立巡视 | ['read', 'search'] | ❌ (纯只读) | audit-report, data-inspector, ui-verifier |
| jiguandangwei.agent.md | "机关党委" | 监督型（Supervisor） | 全局宪章与架构监督 | ['read', 'agent', 'edit', 'search'] | ❌ (高权限，不直接委派) | — |
| shekeyuan.agent.md | "社科院" | 分析型（Analyst） | 经验提炼与沉淀 | ['read', 'edit', 'search'] | ❌ (历史档案层) | experience-distiller |
| danganguan.agent.md | "档案馆" | 记录型（Recorder） | 系统变更日志记录 | ['read', 'edit', 'search'] | ❌ (历史档案层) | log-recorder |

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

当 `.github/` 目录下的任何 Agent 相关文档被修改时，必须按以下流程执行全仓库一致性同步：

### 同步触发矩阵

| 变更源（母本） | 触发条件 | 必须同步的子本 |
|---|---|---|
| copilot-instructions.md | 规则增删改、链长策略变更、/ask 与 /confirm 规范变更 | 所有 agents/*.agent.md、所有 skills/*/SKILL.md |
| SSOT_INDEX.md | 映射关系增删改 | 受影响的 agents/*.agent.md |
| agents/*.agent.md | 职责/权限/链长规则变更 | copilot-instructions.md（反向校验）、同层其他 agent 文件（交叉引用校验） |
| skills/*/SKILL.md | 接口/流程/输出契约变更 | 所有挂载该 Skill 的 agent 文件 |
| content/SOP/*.md | 制度条款/流程步骤/术语变更 | docs/src/ 对应代码文件（见 sop-web-sync 映射表） |
| content/guides/governance/TERMINOLOGY.md | 术语增删改 | docs/src/core/constants.js + 全仓库引用 |
| content/guides/architecture/DATA.md | 数据字段定义变更 | docs/src/ 对应数据结构代码 |

### 同步执行步骤

1. **变更源识别**：确定变更发起的母本文件与具体变更内容。
2. **影响面分析**：基于本注册表的映射关系，列出所有受影响的子本文件。
3. **逐文件同步**：按审查顺序（宪章层 → Skill 层 → Agent 配置层）逐个更新子本。
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

1. 先查宪章层：.github/copilot-instructions.md
2. 再查项目中枢：CLAUDE.md（未来执行路线图）
3. 再查文本母本层：content/SOP/
4. 再查代码内容层：docs/src/workflow/
5. 再查 Skill 层：.github/skills/*/SKILL.md
6. 最后查执行配置层：.github/agents/

## 已迁移文件索引

| 原路径 | 新路径/处理方式 | 迁移日期 |
|--------|----------------|---------|
| governance/* | → CLAUDE.md §五/§六（整合）或删除 | 2026-05-02 |
| backlog/* | → CLAUDE.md §五（整合）或删除 | 2026-05-02 |
| .vibe_context/* | → .ctx/（迁移）或删除 | 2026-05-02 |
| knowledge/SOP/ | → content/SOP/ | 2026-05-02 |
| docs/ | → content/guides/ + content/insights/ | 2026-05-02 |
| 参考资料/ | → content/references/ | 2026-05-02 |
| AI_ENTRYPOINT.md | → 已合并至 ARCHITECTURE.md | 2026-05-01 |
| SYSTEM_CLAUDE.md | → CLAUDE.md | 2026-05-02 |
| .github/SSOT_INDEX.md | → SSOT_INDEX.md（移至根目录） | 2026-05-18 |

## 使用规则

- 这是全局一致性判断的唯一参考入口。
- 任何局部修改规划，都必须标注其母本链路。
- 若出现多文件联动修改，必须先验证母本是否同意该变化方向。
- 若出现功能、措辞、流程三者不一致，以母本优先修正。
- 若出现新旧两套说法并存，必须先消除母本歧义，再处理子本。
