# 多代理独立审查协议 Spec

## Why

2026-10-19 的「脏乱繁」专项采用了一个有效做法：三个子代理各自持一个独立 skill（`web-design-guidelines` / `design-with-taste` / `frontend-design`）并行审查，彼此不读对方结论；主代理只做汇总，支书在分歧点上做选择。结果既发现了共识问题，也保留了真实分歧，避免了单一视角的一刀切。

这套做法还要至少再跑四轮（脏乱繁复审计、最小三成本、功能与美观、全栈数据结构设计），因此必须从「一次成功经验」升级为 CLAUDE.md 热层里可泛化的协议，并把未完成的审计工作接入第一轮，而不是每次重新发明流程。

## What Changes

- 在 CLAUDE.md 热层新增 **H21. 多代理独立审查协议**（规则 + 判例 + 四轮路线图，正文控制在 30–40 行）。
- 新增 `content/05_ai_coding/PARALLEL_SKILL_AUDIT.md` 作为 H21 的详版操作手册：代理提示词模板、输出 schema、汇总模板、决策记录模板、反模式清单。
- 新增守卫 `server/test/claude-parallel-audit.test.mjs`：检查 H21 存在、协议关键词齐备、判例与四轮路线图齐备，并登记进 `test:daily`。
- 建立 **skill 发现矩阵**：四轮各 3 个独立 lens，先列候选与可用性，交支书确认后再启动 Round 1；不把未确认的 skill 写死进流程。
- 把两份未结项审计稿（`.ctx/WORKBENCH_INFORMATION_AUDIT.md`、`.ctx/WORKBENCH_68_TAB_AUDIT_DRAFT.md`）与 `.ctx/REVIEW_QUEUE.md` 的未闭环项合并成一张 **未完成清单**，作为 Round 1 的输入；本批只盘点，不实施修复。
- **不做**：不在本批启动 Round 1，不改任何 UI/数据/接口；四轮审查在协议批准后逐轮启动。

## Impact

- 受影响规范：CLAUDE.md 热层（新增 H21）、`content/05_ai_coding/`（新增详版手册）、`server/package.json`（test:daily 登记）。
- 受影响代码：仅新增守卫测试；不改 `docs/` 业务代码。
- 受影响流程：后续所有多视角审计统一走 H21；单 skill 单代理、独立审查、主代理汇总、人类裁定、落 spec 实施。

## ADDED Requirements

### Requirement: 多代理独立审查协议（H21）

系统 SHALL 在 CLAUDE.md 热层提供 H21，规定以下最小协议：

1. **定题**：主代理先写清审查范围、页面/文件清单、四个待回答问题；范围必须能在一轮内完成。
2. **独立审查**：启动 N 个并行子代理；每个代理**只使用一个 skill**，不读其他代理的报告，不共享中间结论。
3. **证据**：每条发现必须带证据——`file:line`、DOM/计算样式、截图或运行结果；禁止只有形容词（「很脏」「不美观」）。
4. **输出 schema**：每条发现写「现象 / 证据 / 影响 / 建议方向 / 严重度 / 是否与其他 lens 可能冲突」。
5. **汇总**：主代理只做三件事——共识、分歧、待裁定；不得平均意见、不得替支书决定。
6. **人类裁定**：每个分歧点用 `AskUserQuestion` 给出 2–4 个互斥选项；记录支书原话选择与日期；支书的选择优先于任何 agent 建议。
7. **落 spec**：裁定转成 `spec.md` / `tasks.md` / `checklist.md`，再实施与验证。
8. **复盘**：把「AI 假设 vs 人类意图」的偏差按 `sample-diff-learning` 记录；可泛化规则写入 DESIGN_SYSTEM 或 H21 判例，不重复造第二套。

#### Scenario: 一轮三路审查

- **WHEN** 支书要求对一组页面做「脏乱繁」审查
- **THEN** 主代理启动三个子代理，分别只加载 `web-design-guidelines`、`design-with-taste`、`frontend-design`
- **THEN** 每个子代理独立输出带证据的发现，主代理汇总为「共识 / 分歧 / 待裁定」
- **THEN** 主代理用 `AskUserQuestion` 请支书逐项裁定，不自行合并分歧

#### Scenario: 代理意见冲突

- **WHEN** 两个 lens 对同一元素给出相反建议（如移动表格「卡式行」vs「冻结列」）
- **THEN** 主代理并列呈现两方证据与代价，不选边
- **THEN** 支书选择后，未选方案作为「已考虑但未采用」记录在 spec，不静默丢弃

### Requirement: 判例与四轮路线图

H21 SHALL 包含 2026-10-19 判例与四轮路线图：

- **判例**：三路审计（`web-design-guidelines` / `design-with-taste` / `frontend-design`）；6 项共识、5 项分歧；支书四项裁定（390 表格卡式行、主 CTA 角色色全强度、待答复默认露 2 条、页签渐隐 + 箭头）。
- **Round 1 脏乱繁复审计**：三路前端 lens；输入 = 当前页面 + 两份 68 页签审计稿 + REVIEW_QUEUE 未闭环项。
- **Round 2 最小三成本**：信息 / 操作 / 学习成本三路；skill 待发现后确认。
- **Round 3 功能与美观**：功能完整性、视觉主张、交互手感三路；前端设计 skill 至少 3 个。
- **Round 4 全栈数据结构设计**：前端呈现、服务端 API、数据模型三路；skill 与 agent 类型待发现后确认。

#### Scenario: 路线图不被一次性执行

- **WHEN** H21 写入四轮路线图
- **THEN** 每轮必须单独定题、单独裁定、单独落 spec；不得四轮同时启动
- **THEN** Round 1 只在支书批准本 spec 后启动

### Requirement: Skill 发现矩阵

系统 SHALL 在启动 Round 1 前产出一张 skill 矩阵，至少包含：

| 轮次 | lens 1 | lens 2 | lens 3 | 状态 |
|---|---|---|---|---|
| Round 1 脏乱繁 | `web-design-guidelines` | `design-with-taste` | `frontend-design` | 已验证 |
| Round 2 最小三成本 | 待发现 | 待发现 | 待发现 | 待支书确认 |
| Round 3 功能与美观 | `frontend-design` | `design-with-taste` | `uicraft` 或 `better-ui` | 待确认 |
| Round 4 全栈数据结构 | `fullstack-developer` | 待发现（服务端） | 待发现（数据模型） | 待支书确认 |

- 发现方式：现有 `<available_skills>` 清单 + `npx skills find <keyword>`；每个候选注明「能力边界 / 是否可用 / 为什么选它」。
- 禁止：同一 skill 在一个轮次里被两个代理重复使用（会失去独立性）。
- 未确认的 skill 不得写死进 H21 正文，只留在矩阵的「待确认」列。

#### Scenario: skill 不可用

- **WHEN** 某个候选 skill 在当前环境不存在
- **THEN** 矩阵标记「不可用」，并给出替代 lens 或专用 agent 类型
- **THEN** 不假装已加载该 skill

### Requirement: 未完成清单接入 Round 1

系统 SHALL 在 Round 1 启动前把以下未完成工作合并成一张清单：

- `.ctx/WORKBENCH_INFORMATION_AUDIT.md`（68 页签信息结构）
- `.ctx/WORKBENCH_68_TAB_AUDIT_DRAFT.md`（68 页签结构盘点）
- `.ctx/REVIEW_QUEUE.md` 的未闭环项

清单每条至少包含：来源、问题、证据、当前状态、建议轮次、是否需要支书裁定。
本批只盘点，不实施；Round 1 定题时从清单中选择本轮范围。

#### Scenario: 盘点不丢项

- **WHEN** 合并三份来源
- **THEN** 每个未闭环项在清单中有且只有一条记录
- **THEN** 已闭环项标注「已闭环」并从 Round 1 候选中排除

## MODIFIED Requirements

### Requirement: H20.2 执行流程

在 H20.2 的「实施」之前增加一条显式入口：涉及多视角审查时，先按 H21 完成独立审查与人类裁定，再进入实施；H20.2 的其余步骤不变。

## REMOVED Requirements

无。

## Acceptance

- CLAUDE.md 热层存在 H21，且包含协议八条、2026-10-19 判例、四轮路线图。
- `PARALLEL_SKILL_AUDIT.md` 含代理提示词模板、输出 schema、汇总模板、决策记录模板、反模式清单。
- 守卫测试通过，并登记进 `test:daily`。
- skill 矩阵产出，Round 1 的三个 lens 已验证；其余轮次明确标注「待确认」。
- 未完成清单覆盖三份来源，无静默丢项。
- 本批不改任何 UI/数据/接口。

## Non-goals

- 不在本批启动 Round 1 或任何子代理审查。
- 不重写 68 个页签，不实施两份审计稿里的具体条目。
- 不修改 H20/H40 既有规则的语义，只增加 H21 与一条 H20.2 入口。
- 不把未确认的 skill 写成硬性规则。

## 附录 A：Skill 发现矩阵（2026-10-19）

> 状态口径：可用 = 当前环境存在且能加载；待确认 = 存在但尚未由支书确认；不可用 = 当前环境不存在。
> Round 1 的三个 lens 已验证；其余轮次不得在支书确认前写死。

| 轮次 | lens 1 | lens 2 | lens 3 | 状态 | 备注 |
|---|---|---|---|---|---|
| Round 1 脏乱繁复审计 | web-design-guidelines（可用） | design-with-taste（可用） | frontend-design（可用） | 可用 | 2026-10-19 判例已验证 |
| Round 2 最小三成本 | better-layout（待确认） | better-accessibility（待确认） | better-writing（待确认） | 待确认 | 信息 / 操作 / 学习成本各一路 |
| Round 3 功能与美观 | frontend-design（可用） | design-with-taste（可用） | uicraft / better-ui（待确认） | 待确认 | 前端 skill 至少 3 个 |
| Round 4 全栈数据结构设计 | fullstack-developer（可用） | backend-architect（agent，待确认） | domain-modeling（待确认，未安装） | 待确认 | 服务端 / 数据模型需补 skill 或专用 agent |

### 发现方式与证据

- `npx skills find`（2026-10-19，PowerShell 以 `;` 顺序执行 5 条）：
  - `frontend design` → `anthropics/skills@frontend-design`（1M installs）、`leonxlnx/taste-skill@design-taste-frontend` 等。
  - `ux` → `vercel-labs/agent-skills@web-design-guidelines`（755.7K installs）、`nextlevelbuilder/ui-ux-pro-max-skill@ui-ux-pro-max` 等。
  - `data model` → `mattpocock/skills@domain-modeling`（845.1K installs）、`prisma/skills@prisma-client-api`（371.7K installs）。
  - `backend` → 仅返回 Azure / Firebase / Convex 等云厂商 skill，未返回通用后端架构 skill。
  - `grill` → `mattpocock/skills@grill-me`（1.4M installs）、`grill-with-docs` 等。
  - 以上均为**注册表结果，不代表本机已安装**。
- 本机目录：
  - `c:\Users\储子禾\.trae-cn\skills`：`web-design-guidelines`、`design-with-taste`、`frontend-design`、`better-*`、`brainstorming`、`internal-comms` 等。
  - `c:\Users\储子禾\.trae-cn\plugins\trae-remote-official`：`frontend-design\0.0.0\skills\frontend-design`、`web-app-development\0.1.1\skills\uicraft` 等。

### 候选说明

| 候选 | 能力边界 | 适合哪一轮 | 可用性证据 |
|---|---|---|---|
| web-design-guidelines | 按 Web Interface Guidelines 逐条对照 UI 代码，输出 `file:line` | Round 1 规则合规 | 可用；`c:\Users\储子禾\.trae-cn\skills\web-design-guidelines\SKILL.md` |
| design-with-taste | Family Values 三原则（渐进揭示、流动、克制惊喜），偏审美主张与整体气质 | Round 1 / Round 3 视觉主张 | 可用；`c:\Users\储子禾\.trae-cn\skills\design-with-taste\SKILL.md` |
| frontend-design | 构建有辨识度的前端界面，负责视觉方向、排版与整体设计语言 | Round 1 / Round 3 | 可用；`c:\Users\储子禾\.trae-cn\skills\frontend-design\SKILL.md`，另有插件副本 `...\plugins\trae-remote-official\frontend-design\0.0.0\skills\frontend-design\SKILL.md` |
| uicraft | 生产级界面的创建 / 审计 / 打磨，覆盖响应式、排版、色彩、动效、UX 文案、无障碍、性能、空状态 | Round 3 第三路（交互手感 / 综合） | 可用；`...\plugins\trae-remote-official\web-app-development\0.1.1\skills\uicraft\SKILL.md`；与 design-with-taste 部分重叠，需支书二选一 |
| better-ui | 圆角、阴影、图标、动效与按压反馈等视觉细节 | Round 3 交互手感 | 可用；`c:\Users\储子禾\.trae-cn\skills\better-ui\SKILL.md` |
| better-interface | 只做编排：把界面路由到各 `better-*` 并汇总为一个裁决，本身不拥有规则 | **不适合作为独立 lens**（会聚合其他 lens，破坏独立性）；仅供主代理汇总参考 | 可用；`c:\Users\储子禾\.trae-cn\skills\better-interface\SKILL.md`（SKILL.md 自述「Orchestration is all it owns」） |
| better-layout | 分组、间距、对齐、阅读顺序、渐进披露、断点与响应式结构 | Round 2 信息成本 | 可用；`c:\Users\储子禾\.trae-cn\skills\better-layout\SKILL.md` |
| better-accessibility | 键盘路径、焦点环、命中区域、表单错误、语义与 ARIA | Round 2 操作成本 | 可用；`c:\Users\储子禾\.trae-cn\skills\better-accessibility\SKILL.md` |
| better-writing | 界面文案、按钮标签、错误 / 空状态、术语一致性、语气 | Round 2 学习成本（术语与文案）；也可用于 Round 3 | 可用；`c:\Users\储子禾\.trae-cn\skills\better-writing\SKILL.md` |
| better-typography / better-colors | 字体、字距、换行、对比度与配色 token | 备选 lens；本轮未排入 | 可用；`c:\Users\储子禾\.trae-cn\skills\better-typography\SKILL.md`、`...\skills\better-colors\SKILL.md` |
| brainstorming | 需求澄清与方案发散 | 定题阶段，不承担审查 lens | 可用（本会话 `available_skills`）；`c:\Users\储子禾\.trae-cn\skills\brainstorming\SKILL.md` |
| internal-comms | 内部沟通写作（状态报告、FAQ、事故报告等） | 与 UI 审查无直接关系，不选 | 可用（本会话 `available_skills`）；`c:\Users\储子禾\.trae-cn\skills\internal-comms\SKILL.md` |
| fullstack-developer | React / Node / 数据库 / API 全栈实现 | Round 4 前端呈现或服务端 | 可用（本会话 `available_skills` 可加载）；本机 `Glob **/fullstack-developer/SKILL.md` 无结果，可能由客户端内置或远程注入 |
| backend-architect（agent 类型） | 后端架构 agent | Round 4 服务端 | 待确认；本机未找到 agent 定义文件，仅 `.ctx\logs\archive\2026-05-early-EXECUTION_LOG.md` 有历史提及，不能视为可用 |
| frontend-architect（agent 类型） | 前端架构 agent | Round 4 前端呈现备选 | 待确认；本机未找到定义文件 |
| domain-modeling | 领域建模（语言 / 框架无关） | Round 4 数据模型 | 待确认（注册表存在，本机未安装）；`npx skills find "data model"` → `mattpocock/skills@domain-modeling` 845.1K installs |
| prisma-client-api | Prisma Client API | Round 4 数据模型备选 | 待确认；`npx skills find "data model"` → `prisma/skills@prisma-client-api` 371.7K installs；仅在项目使用 Prisma 时适用（现状未核实） |

### 不可用候选与替代

- **grill-me：不可用**（本会话 `available_skills` 无此 skill，本机未安装）。注册表存在 `mattpocock/skills@grill-me`（1.4M installs），但安装前不得假装可加载。替代：定题阶段用 `AskUserQuestion` 做结构化追问（范围 / 证据 / 成功标准 / 边界），不引入该 skill。
- **backend-architect / frontend-architect：不可用（本机）**。未找到 agent 定义文件，不能写死；Round 4 暂以 `fullstack-developer` + 主代理拆分「服务端 / 数据模型」两路，待支书确认后再启用专用 agent。
- **通用后端 skill：不存在**。`npx skills find "backend"` 只返回 Azure / Firebase / Convex 等云厂商 skill，不能作为本项目（Node + 自建服务）的通用服务端 lens。

### 独立性约束

- 同一 skill 不得在同一轮被两个代理重复使用。
- `better-interface` 只做编排，不作为任何一轮的独立 lens。
- Round 1 已用 `frontend-design` / `design-with-taste` / `web-design-guidelines`；Round 3 复用前两者属于不同轮次，不违反同轮唯一性，但必须重新独立出报告、不读 Round 1 结论。

### 待支书确认

- Round 2 的三路 lens 最终选哪三个？（当前建议：`better-layout` / `better-accessibility` / `better-writing`，分别对应信息 / 操作 / 学习成本）
- Round 3 的第三路用 `uicraft` 还是 `better-ui`？
- Round 4 的服务端与数据模型 lens 用哪个 skill / agent 类型？（`backend-architect` 是否可用；`domain-modeling` 是否安装，或用 `prisma-client-api` / 仅 `fullstack-developer`）
