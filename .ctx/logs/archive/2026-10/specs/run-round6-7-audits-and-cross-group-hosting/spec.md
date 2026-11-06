# 第六、七轮专项审查 ＋ 跨组承办落地 Spec

## Why

支书要求「这样的工作还要进行至少 3–4 次」，并先做两轮：① 前端脏乱繁复审，重点审「繁」里的**此地无银式注释**；② 数据生命周期审查——所有「没有信息的字段」必须有改写入口，「工作流相关的硬编码」必须改成计算/派生，mock 跟着代码走、不削足适履。

同时有一条必须落实的口径修正：**跨组活动同样落实承办党小组；组织者一般来自承办组；深度参与者可跨组招募，由组织委员协调。** 现行代码把 `cross-group` 当成与 `party-group` / `branch` 并列的**第三种组织落点**（支书台建活动一律写 `organizingScope='cross-group'`），语义与支书口径相反，必须改实现逻辑，而不是改文案。

## Sample-diff（本轮学习）

- **ai_assumption**：跨组是一种组织落点（第三档），支书建活动默认 `cross-group`；只要带了责任组就算「已落实」。
- **human_intent**：承办党小组永远唯一；跨组只表示参与/招募范围；组织者一般来自承办组；跨组深参由组织委员协调。
- **divergence_type**：`definition_mismatch`（把「参与范围」误当成「组织落点」）。
- **generalization（Boolean）**：IF 活动非支部级 THEN 必须有且只有一个承办党小组，组织落点一律 `party-group`；IF 参与者来自其他党小组 THEN 只体现在 `recruitmentScope` / 成员 `crossGroup`，不得改写组织落点。
- **evidence**：`docs/src/entries/tabs/secretary/calendar-tab.js:1700`（支书建活动固定写 `ACTIVITY_SCOPES.CROSS_GROUP`）；`server/routes/resources/workgroup-routes.js:227-230`（把 `cross-group` 当落点门）；`docs/src/components/governance/activity-progress.js:62`（展示「跨组承办」）。

## What Changes

### A. 跨组承办（必须先做，BREAKING）

- 活动组织落点收敛为**两档**：`branch`（支部级法定会议）／`party-group`（其余全部，必填承办党小组）。`cross-group` **不再写入**。
- 读侧兼容：旧数据中的 `organizingScope='cross-group'` 迁移为 `party-group`，并把「跨组」语义搬到 `recruitmentScope='cross-group'`（原 `hostGroupId` 保留；缺失的继续 `legacyHostGroup` 待补，不猜测）。
- 支书台写入：非支部级一律 `party-group` ＋ 必选承办党小组；「跨组」只由「需从其他党小组招募深度参与者」勾选表达（`recruitmentScope` ＋ `crossGroupCoordinatorId`＝组织委员）。
- 组织者：选择器默认只列承办组成员，可切「显示全部成员」；选他组时软提示 ＋ 必填说明 `organizerExceptionReason`；**服务端补校验**——组织者不属于承办组且无说明 → 400（防绕过 UI 的静默越组）。
- 组长台 / 组织台 / 活动进度 / 工作组镜像：判据与措辞同步（「跨组承办」→「跨组招募」；组织台补选历史活动时写 `party-group`）。
- **BREAKING**：外部调用方若仍传 `organizingScope='cross-group'`，服务端按 `party-group` 归一（不拒绝），响应里回写归一后的值；`ACTIVITY_SCOPES.CROSS_GROUP` 从生产路径退场，仅保留读取别名。

### B. 第六轮：前端脏乱繁复审（重点「繁」＝此地无银注释）

- 以既有报告为种子（`UI_REDUNDANCY_AUDIT_R2.md`、`AUDIT_R5_A/B/C`），**只读审查当前 HEAD**，逐条回读确认是否仍存在，不照抄旧结论。
- 判据：**删掉这句注释/文案，读者是否仍能完成动作或理解代码？** 能 ⇒ 删；不能且承载动作 ⇒ 改为按钮/短标签/徽章；结构性问题 ⇒ 立项。
- 「此地无银」两类都要审：
  - **代码注释**：复述代码字面（`// 设置 x 为 y`）、防御式自证（`// 这里不是 bug`）、对显而易见的实现反复解释、把设计沿革塞进行内注释。
  - **界面文案**：既有七形态（title/aria、placeholder、折叠说明、导语/空态、小标题、同义重复、帮助页重复）。
- 产出独立报告（`.ctx/logs/YYYY-MM-AUDIT_R6_FRONTEND.md`），P1/P2 本轮修，P3 登记乙部。

### C. 第七轮：数据生命周期

- **空值字段**：逐字段、逐屏列「无信息且无改写入口」的占位。处置三选一并写明理由：① 补受控写入口（留痕、权限按现行制度）；② 按设计不采集 ⇒ 隐藏该行或标「登记时未采集」，并在文案里说清归属方；③ 可从既有记录派生 ⇒ 派生。禁止长期「未填写」死信息。
- **工作流相关硬编码**：身份/角色集合、人数、时限、状态集合、页签计数、日期阈值、支部 id 等，一律改为**读单一源或按数据现算**；同一事实只留一份定义。
- **mock 跟随代码**：代码改了字段/枚举/角色/流程，mock 与种子同批更新；不得为迁就旧 mock 而改产品逻辑（削足适履）。
- 既有 `DATA_LIFECYCLE_AUDIT.md` / `DATA_LIFECYCLE_AUDIT_R2.md` **逐条回读**（其中 `p*` 主键类问题多已随学号迁移解决），只修**当前仍存在**的。
- 产出独立报告（`.ctx/logs/YYYY-MM-AUDIT_R7_DATA.md`），P1/P2 本轮修，P3 登记乙部。

### D. 遗留与后续轮次

- 盘点并逐条登记：`CLAUDE.md` 乙部 `B-500-*`、`.ctx/REVIEW_QUEUE.md`、`.ctx/ENGINEERING_ASSESSMENT.md §四`、最近审查报告未落地项。能并入本轮的并入，不能的写清原因与下一轮。
- 后续轮次（**本轮只登记、不实施**）：第八轮「最小三成本原则专项」；第九轮「功能与美观提升专项 ＋ 全栈开发数据结构设计专项」。
- 拿不准即问：涉及制度口径、权限边界、跨角色行为的选择，先用 `AskUserQuestion` 呈报，不自行推定。

## Impact

- Affected specs：`assign-cross-group-activity-to-party-group`（本轮替换其「第三档落点」实现口径）、`round5-dirty-audit-and-truth-baseline`、`plan-four-round-audit-program`。
- Affected code：`docs/src/core/domain/{constants,domain,work-map}.js`、`docs/src/entries/tabs/secretary/calendar-tab.js`、`docs/src/entries/tabs/leader/write-tab.js`、`docs/src/entries/tabs/org/activity-calendar-tab.js`、`docs/src/components/governance/{activity-progress,workgroup-member-editor}.js`、`docs/src/data/{workgroup-seed-sync,mock-adapter}.js`、`server/routes/resources/{workgroup-routes,index}.js`、`server/db.js`、`server/seed*.js`、相关测试；以及第六/七轮审查报告点名的文件。
- Affected docs：`DATA_MODEL.md §2.1/§2.3`、`SECRETARY_DIRECTIVES.md`（P-018 补句）、`组织委员工作流程指南.md`、`党小组组长工作手册.md`、`README-server.md`、`CLAUDE.md` 乙部、`.ctx/**` 台账。

## ADDED Requirements

### Requirement: 承办党小组唯一

所有非支部级活动 SHALL 有且只有一个承办党小组；跨组不改变该落点。

#### Scenario: 支书创建活动
- **WHEN** 支书 / 副支书创建任意非支部级活动
- **THEN** 必须选择承办党小组，提交值 `organizingScope='party-group'`；未选不得提交

#### Scenario: 支书勾选跨组招募
- **WHEN** 勾选「需从其他党小组招募深度参与者」
- **THEN** 活动写 `recruitmentScope='cross-group'` 与协调人（默认本支部组织委员）；`organizingScope` 仍为 `party-group`

#### Scenario: 旧值兼容
- **WHEN** 客户端或历史数据带 `organizingScope='cross-group'`
- **THEN** 服务端/迁移归一为 `party-group`；`hostGroupId` 保留；缺失承办组且无 `legacyHostGroup` 的，标 `legacyHostGroup` 并在组织台列「待补承办党小组」

#### Scenario: 支部级会议
- **WHEN** 创建支委会 / 支部党员大会 / 党课
- **THEN** `organizingScope='branch'`，不得指定承办党小组

### Requirement: 组织者默认来自承办组（例外可留痕）

系统 SHALL 默认从承办党小组选组织者；选他组时软提示并留存原因；服务端 SHALL 拒绝「他组组织者且无说明」的写入。

#### Scenario: 默认候选
- **WHEN** 打开组织者选择器
- **THEN** 默认只列承办组成员；可切换「显示全部成员」

#### Scenario: 例外
- **WHEN** 选择他组成员且未填说明
- **THEN** 前端不得提交（就地提示）；绕过前端直连 API → 400 且文案可懂

#### Scenario: 已填说明
- **WHEN** 他组组织者带 `organizerExceptionReason`
- **THEN** 正常保存，留痕随活动保留

### Requirement: 跨组深度参与者由组织委员协调（保持并改准措辞）

#### Scenario: 加跨组深参
- **WHEN** 深度参与者不属于承办组
- **THEN** 必须有 `recruitmentScope='cross-group'` 与协调人，否则拒绝；成员行写 `crossGroup/coordinatedBy`

#### Scenario: 展示
- **WHEN** 任意页面展示该活动的组织落点
- **THEN** 显示「承办党小组：X」，跨组只显示为「跨组招募 N 人（组织委员协调）」，不出现「跨组承办」

### Requirement: 注释型冗余（此地无银）审查

审查 SHALL 覆盖代码注释与界面文案两类，并按「删掉后是否仍能完成动作/理解代码」定处置。

#### Scenario: 代码注释
- **WHEN** 注释复述代码字面、自证「不是 bug」或解释显而易见的行为
- **THEN** 删除；若确有非显然原因，改写成一句「为什么」

#### Scenario: 界面文案
- **WHEN** 界面已表达过的事实再被一句话解释
- **THEN** 删除或改为承载动作的控件

### Requirement: 空值字段必须有出口或明确不提供入口

#### Scenario: 无信息且无入口
- **WHEN** 字段在界面上长期显示「未填写 / —」且没有任何写入口
- **THEN** 本轮须三选一：补受控写入口 / 隐藏或标注归属方 / 从既有记录派生；不得保留死信息

#### Scenario: 有入口但读侧不刷新
- **WHEN** 字段可编辑但保存后读侧不更新
- **THEN** 视为缺陷修复（写读同源），不得只改文案

### Requirement: 工作流硬编码必须计算或派生

#### Scenario: 集合与计数
- **WHEN** 代码中出现角色集合、状态集合、人数、页签数、时限、日期阈值等与工作流相关的字面量
- **THEN** 改为读单一源常量或按数据现算；同一事实只有一处定义

#### Scenario: mock 跟随
- **WHEN** 字段/枚举/角色/流程变更
- **THEN** mock 与种子同批更新；不得为兼容旧 mock 回退产品逻辑

### Requirement: 未完成工作盘点

#### Scenario: 每轮收尾
- **WHEN** 本轮结束
- **THEN** `CLAUDE.md` 乙部列出未完成项（含来源、引用流程、状态）；下一轮范围（最小三成本 / 功能与美观＋全栈数据结构）已登记

## MODIFIED Requirements

### Requirement: 活动承办范围（`DATA_MODEL.md §2.1`）

`organizingScope` 只允许 `party-group` / `branch`；`cross-group` 退出落点枚举（保留读取别名）。「跨组」改由 `recruitmentScope='cross-group'` ＋ `crossGroupCoordinatorId` 表达；`hostGroupId` 对非支部级活动必填。

### Requirement: 服务端活动创建门（`activityCreationDeny`）

非支部级活动一律要求 `hostGroupId` 且落 `party-group`；新增「组织者属承办组，或已带 `organizerExceptionReason`」校验；跨组深参仍须招募标记与协调人。

### Requirement: 活动进度与工作组镜像

活动进度的落点标签、工作组 `organizingScope` 镜像、组织台补选与协调清单，均按两档落点 ＋ 跨组招募表达。

## REMOVED Requirements

### Requirement: 跨组作为独立组织落点

**Reason**：跨组是参与/招募范围，不是组织落点；把它当第三档会让「承办党小组唯一」失真，任务、考察、汇报的组织归属随之含糊。
**Migration**：迁移 `v10` 将既有 `organizingScope='cross-group'` 归一为 `party-group`；有承办组的保留，无承办组的标 `legacyHostGroup` 并在组织台待补；`recruitmentScope` 缺失且成员含跨组深参时补 `cross-group` ＋ 组织委员协调人。迁移幂等。
