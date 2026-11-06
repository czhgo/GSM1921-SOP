# 四轮审查全局规划与 Round 1 Spec

## Why

H21 多代理独立审查协议已经落盘，但四轮审查还没有可持久化的全局计划。当前 `.ctx/UNFINISHED_AUDIT_BACKLOG.md` 有 53 条未完成项，跨工作台信息结构、代码健康、数据/API、权限与文档；如果直接开 Round 1，会在上下文压缩后丢失「哪条属于哪一轮、哪条已排除、哪条等支书裁定」。

支书已定：**一步一步做，但必须尽快把 Round 2–4 先行落盘**，防止上下文窗口压缩造成信息损失。本 spec 先把四轮程序钉死，再执行 Round 1；Round 1 只审到 spec，不做修复。

## What Changes

- 落盘 **四轮审查程序**：Round 1 脏乱繁、Round 2 最小三成本、Round 3 功能与美观、Round 4 全栈数据结构设计；每轮写清 lens、输入、输出、停线与触发条件。
- **四轮程序同时写入持久层**：`CLAUDE.md` H21.2 + `content/05_ai_coding/PARALLEL_SKILL_AUDIT.md` §9；`.trae/specs` 只是执行稿，不作为唯一落点。
- 落盘 **Round 2–4 的 lens 矩阵**（支书已确认）：
  - Round 2：`better-layout` / `better-accessibility` / `better-writing`。
  - Round 3：`frontend-design` / `design-with-taste` / `uicraft`。
  - Round 4：`fullstack-developer` / `domain-modeling` / `backend-architect`（Round 4 启动前安装/确认）。
- 执行 **Round 1**：对 53 条全部做 triage（每条都有三路 disposition），其中高风险 + 分层样本做三路深审；输出 Round 1 审计报告与修复 spec，**不做任何修复**。
- 明确「53 条全审」的定义：**全量 triage ≠ 53 条都做三路深审**；深审样本按 `sample-diff-learning` 分层抽取，最多 15 条，其余每条仍须有三路一句话结论与归属轮次。
- **临时上下文退出**：`.ctx` 里只承担临时讨论/盘点/待办合并作用的文件，在对应轮次完成后必须退出——可复用内容并入权威文档后删除；有历史价值才归档；不得让已完成的临时台账长期驻留。
- **裁定集中**：每轮汇总后只开**一次** grilling frontier（所有待裁定一起问，每题给推荐答案）；执行中遇到的问题先进「待问清单」，在批次收口时集中问，不零散打断。
- 使用 `sample-diff-learning` 做样本选择、diff 提取与持久化。
- **不做**：不启动 Round 2–4；不实施 53 条中的任何修复；不改生产代码。

## Impact

- 受影响规范：本 spec、Round 1 审计报告、Round 1 修复 spec、`.ctx/UNFINISHED_AUDIT_BACKLOG.md` 的轮次标注。
- 受影响持久层：`CLAUDE.md` H21.2、`content/05_ai_coding/PARALLEL_SKILL_AUDIT.md` §9（四轮程序表）。
- 受影响临时上下文：`.ctx/WORKBENCH_INFORMATION_AUDIT.md`、`.ctx/WORKBENCH_68_TAB_AUDIT_DRAFT.md`、`.ctx/UNFINISHED_AUDIT_BACKLOG.md`（按退出规则处理）。
- 受影响代码：无生产代码改动；只新增审计报告与 spec 文档。
- 受影响流程：H21 从「协议」进入「第一轮实战」；四轮程序有持久化落点。

## ADDED Requirements

### Requirement: 四轮程序先行落盘

系统 SHALL 在 Round 1 启动前把四轮程序写入本 spec，至少包含：

| 轮次 | lens | 输入 | 输出 | 停线 | 触发 |
|---|---|---|---|---|---|
| Round 1 脏乱繁 | `web-design-guidelines` / `design-with-taste` / `frontend-design` | 53 条清单 + 当前页面 | 53 条 triage + 共识/分歧/裁定 + 修复 spec | 停在 spec | 本 spec 批准 |
| Round 2 最小三成本 | `better-layout` / `better-accessibility` / `better-writing` | Round 1 归属到 R2 的条目 + 页面 | 信息/操作/学习成本裁定 + 修复 spec | 停在 spec | Round 1 修复批完成后 |
| Round 3 功能与美观 | `frontend-design` / `design-with-taste` / `uicraft` | Round 1 归属到 R3 的条目 + 页面 | 功能完整性/视觉主张/手感裁定 + 修复 spec | 停在 spec | Round 2 修复批完成后 |
| Round 4 全栈数据结构 | `fullstack-developer` / `domain-modeling` / `backend-architect` | Round 1 归属到 R4 的条目 + 数据/API | 前端呈现/服务端/数据模型裁定 + 修复 spec | 停在 spec | Round 3 修复批完成后；三个 lens 均可用 |

- Round 4 启动前必须确认 `domain-modeling` 已安装、`backend-architect` 可用；不可用则改用专用子代理角色，并在 spec 中登记替代。
- 不得四轮同时开；每轮必须先完成上一轮的修复批（或支书明确跳轮）。

#### Scenario: 上下文压缩后恢复

- **WHEN** 会话上下文丢失、只剩本 spec
- **THEN** 能从表格读出四轮顺序、每轮 lens、输入、输出与触发条件
- **THEN** 不重新发明轮次或 lens

### Requirement: 临时上下文退出

系统 SHALL 在每个轮次完成后清理只承担临时上下文作用的 `.ctx` 文件：

| 文件 | 作用 | 退出条件 | 退出方式 |
|---|---|---|---|
| `.ctx/WORKBENCH_INFORMATION_AUDIT.md` | 68 页签信息结构讨论稿 | Round 1 triage 完成、可复用结论已并入权威文档 | 并入 DESIGN_SYSTEM / INFORMATION_COMPUTATION / 审计报告后删除；有历史价值才归档 |
| `.ctx/WORKBENCH_68_TAB_AUDIT_DRAFT.md` | 68 页签结构盘点底稿 | Round 1 triage 完成、结构结论已并入 README-server / ARCHITECTURE | 并入后删除 |
| `.ctx/UNFINISHED_AUDIT_BACKLOG.md` | Round 1 输入清单 | Round 1 修复 spec 落盘、剩余项已分配轮次 | 删除；只在 `REVIEW_QUEUE` 留一行指针（如仍需跨批引用） |

- 不复用「已完成但仍挂着」的临时台账；不得把已完成清单改名为「历史」继续驻留。
- `.ctx/logs/*` 是持久日志，不适用本规则；`.ctx/REVIEW_QUEUE.md` 只删已闭环项（既有 H26.2 规则）。
- `.trae/specs/*` 是执行稿；四轮程序表已写入持久层后，按既有「spec 用后即删」纪律处理。

#### Scenario: 临时文件已完成

- **WHEN** Round 1 已产出审计报告与修复 spec
- **THEN** 三份临时 `.ctx` 文件按上表退出
- **THEN** 不留下「已完成但仍在」的清单

### Requirement: 集中 Grill

裁定 SHALL 集中进行，不零散打断：

1. **每轮一次 frontier**：主代理汇总完共识 / 分歧 / 待裁定后，一次性把当前所有待裁定问题按 grilling 格式列出（编号 + 推荐答案），等支书回答后再进入下一轮。
2. **执行中待问清单**：审计/实施过程中遇到的问题先记入「待问清单」，能继续的独立工作继续做；在任务收口或轮次收口时集中问。
3. **一次最多 4 题**：使用 `AskUserQuestion` 时每批最多 4 个问题；超过则拆成连续两批，但仍在同一收口点。
4. **不替支书决定**：未回答的问题保持「待裁定」，不得写成默认值或已裁定。

#### Scenario: 执行中遇到新问题

- **WHEN** 某个子代理发现一个需要支书定方向的新问题
- **THEN** 记入待问清单，不立即打断
- **THEN** 在收口点与其他问题一起集中问

### Requirement: Round 1 全量 triage（53 条）

Round 1 SHALL 对 `.ctx/UNFINISHED_AUDIT_BACKLOG.md` 的 53 条逐条给出三路 disposition：

| 字段 | 取值 |
|---|---|
| 条目编号 | U-01…U-53 |
| 类别 | 页面/信息结构 · 交互/流程 · 数据/API/权限 · 文档/证据 |
| lens A 结论 | 确认 · 需补证 · 重复 · 本轮不适用 · 已闭环 |
| lens B 结论 | 同上 |
| lens C 结论 | 同上 |
| 汇总 | 共识确认 / 分歧 / 待裁定 / 转轮次 |
| 建议轮次 | Round 1 / 2 / 3 / 4 |
| 是否待支书裁定 | 是 / 否 |

- 三条 lens 必须各自独立给结论；不得由主代理代填。
- 对「本轮不适用」的条目，必须写明归到哪一轮，不能只写「不适用」。
- 每条必须有证据指针（来源文件 + 行号 / 原编号）。

#### Scenario: 非 UI 条目

- **WHEN** 条目属于数据/API/权限（如 U-12 `POST /agenda-votes` 归属校验）
- **THEN** 三路前端 lens 均给「本轮不适用 · 转 Round 4」，并保留证据
- **THEN** 不因「不是 UI」而从 53 条中消失

### Requirement: 分层深审样本

Round 1 SHALL 用 `sample-diff-learning` 选择深审样本，规则：

1. **全部高风险条目**：`是否待支书裁定 = 是` 且属于页面/信息结构的条目，全部进入深审。
2. **分层样本**：页面/信息结构、交互/流程、数据/API/权限、文档/证据四类，每类至少 2 条。
3. **上限 15 条**：超出时按风险与语义独特性取舍，并在报告中写明取舍理由。
4. **非深审条目**：仍须有三路一句话 disposition，不得空白。

#### Scenario: 样本不足

- **WHEN** 某一类不足 2 条
- **THEN** 取该类全部条目，并在报告注明「该类样本不足」
- **THEN** 不从其他类硬凑

### Requirement: Round 1 输出

Round 1 SHALL 产出两份文件，且停在这里：

1. `.ctx/AUDIT_ROUND1_WORKBENCH_STRUCTURE.md`：53 条 triage 表 + 共识 / 分歧 / 待裁定 + 深审样本证据 + 支书裁定记录。
2. `.trae/specs/round1-workbench-structure-remediation/{spec,tasks,checklist}.md`：只包含支书已裁定的修复项；未裁定项留在审计报告的「待裁定」区，不得写入实施任务。

- 不在本批修改 `docs/` 生产代码。
- 审计报告必须能被下一次会话独立读懂，不依赖本会话上下文。

#### Scenario: 裁定未齐

- **WHEN** 某个分歧支书尚未裁定
- **THEN** 该条只留在审计报告「待裁定」，不进入修复 spec
- **THEN** 修复 spec 的 tasks 不得包含未裁定项

### Requirement: Grill 与 Diff 纪律

- 裁定轮 SHALL 使用 `grill-me` / `grilling` 的 design tree 方式：每轮只问当前 frontier，逐题给推荐答案，等支书回答后再推进下一轮。
- 每个裁定 SHALL 记录：决策点 / 选项 / 支书选择 / 日期 / 未选方案处理。
- 支书纠正 AI 理解时 SHALL 按 `sample-diff-learning` 记录 `ai_assumption` / `human_intent` / `divergence_type` / `generalization` / `evidence`；可泛化规则写入 DESIGN_SYSTEM 或 H21 判例。

#### Scenario: 裁定与 AI 建议冲突

- **WHEN** 支书选择与三路共识不同
- **THEN** 以支书选择为准，记录为一次 diff
- **THEN** 不把支书选择改写成「agent 共识」

## MODIFIED Requirements

### Requirement: H21 Round 1 状态

H21 的 Round 1 状态从「协议批准后启动」更新为「本 spec 批准后启动；停在审计报告 + 修复 spec」。Round 2–4 状态保持「待触发」。

## REMOVED Requirements

无。

## Acceptance

- 四轮程序表与 R2–R4 lens 矩阵写入本 spec。
- 四轮程序表同步写入 `CLAUDE.md` H21.2 与 `content/05_ai_coding/PARALLEL_SKILL_AUDIT.md` §9。
- Round 1 对 53 条全部产出三路 disposition，无空白、无静默丢项。
- 深审样本符合分层规则，最多 15 条，取舍有理由。
- 审计报告含共识 / 分歧 / 待裁定 / 支书裁定记录。
- 修复 spec 只含已裁定项；未裁定项不进入实施。
- 本批不改生产代码。
- 三份临时 `.ctx` 文件按退出表处理，不留「已完成但仍在」的清单。
- 裁定集中进行：每轮一次 frontier；执行中待问清单在收口点集中问。
- Grill 与 diff 记录齐备。

## Non-goals

- 不启动 Round 2–4。
- 不实施 53 条中的任何修复。
- 不重写 68 个页签。
- 不修改 H21 协议正文（只更新 Round 1 状态）。
- 不保留已完成的临时 `.ctx` 台账；有历史价值才归档。
