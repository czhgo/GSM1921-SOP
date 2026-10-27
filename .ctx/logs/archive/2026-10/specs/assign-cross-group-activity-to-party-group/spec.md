# 跨组活动的党小组落实与跨组招募 Spec

## Why

支书 2026-10-21 补充两条工作组口径：

1. **跨组活动也要落实到党小组**：现有数据把 `cross-group` 定义为「不指定承办党小组」（`hostGroupId` 必须为 null），导致跨组活动没有责任党小组，任务、考察、汇报汇总都失去组织落点。
2. **组织者一般是本组的；深度参与者可按需跨组招募，由组织委员协调**：现有数据允许任意同支部成员进工作组，但没有「是否跨组招募」「谁协调」的表达，组织委员无从汇总与协调。

这两条属于数据模型与组织口径的补充，不是页面补丁：必须先把字段、校验、迁移与汇总落清，再改页面。

## Sample-diff（本轮学习）

- **ai_assumption**：跨组承办＝没有承办党小组，`hostGroupId` 置 null 即正确。
- **human_intent**：跨组是「参与/招募跨组」，活动本身仍须落到一个责任党小组；组织者一般来自该组，跨组深参由组织委员协调。
- **divergence_type**：definition_mismatch（把「跨组参与」误当成「无组织归属」）。
- **generalization（Boolean）**：IF 活动允许跨组参与 THEN 仍必须存在唯一责任党小组；IF 工作组成员来自其他党小组 THEN 必须标记跨组并由组织委员协调，不得静默入组。
- **evidence**：`DATA_MODEL.md §2.1` 现写「`cross-group` 时必须为 null」；`calendar-tab.js` 支书创建跨组活动时硬编码 `hostGroupId: null`。

## What Changes

- **BREAKING**：活动数据模型改为「所有非支部级活动都有责任党小组」；`cross-group` 不再等于 `hostGroupId = null`。支部级法定会议（支委会 / 党员大会 / 党课）单列 `organizingScope='branch'`，不指定责任党小组。已有空值记录标 `legacyHostGroup: true`，不猜测、不静默补组。
- 新增「跨组招募」表达与协调责任：`recruitmentScope`、`crossGroupCoordinatorId`；工作组成员行可标 `crossGroup` 与 `coordinatedBy`。
- 创建/编辑、服务端校验、工作组写入、组织台协调面、迁移与守卫同步。
- 同步 content 文档（DATA_MODEL / SOP / SECRETARY_DIRECTIVES）与 CLAUDE.md 乙部；剩余工作按批次落到乙部。
- 新增/修正 Boolean 规则并落 `PARALLEL_SKILL_AUDIT §11.3`。

## Impact

- Affected specs：`round5-dirty-audit-and-truth-baseline`（本 spec 是其工作组维度的细化）、`report-parent-and-issue-projection`（汇报按工作组/党小组汇总依赖责任组）。
- Affected code：`docs/src/entries/tabs/secretary/calendar-tab.js`、`docs/src/entries/tabs/leader/write-tab.js`、`docs/src/entries/tabs/org/*`、`docs/src/services/activity/{activity,workgroup-members,taskforce}.js`、`docs/src/core/domain/{constants,workgroup-policy,domain}.js`、`server/routes/resources/{index,workgroup-routes}.js`、`docs/src/data/mock/activities.js`、`server/seed.js`。
- Affected docs：`DATA_MODEL.md`、`SECRETARY_DIRECTIVES.md`、`组织委员工作流程指南.md`、`党小组组长工作手册.md`、`PARALLEL_SKILL_AUDIT.md`、`CLAUDE.md`。

## ADDED Requirements

### Requirement: 责任党小组必填（支部级法定会议除外）

所有非支部级活动 SHALL 指向唯一责任党小组；跨组活动只改变参与/招募范围，不改变组织落点。

#### Scenario: 支书创建跨组活动
- **WHEN** 支书/副支书创建 `organizingScope='cross-group'` 的活动
- **THEN** 必须选择责任党小组；未选不得提交，提示「请选择责任党小组」

#### Scenario: 支部级法定会议
- **WHEN** 创建支委会 / 支部党员大会 / 党课
- **THEN** 组织落点必须是 `branch`，不得指定责任党小组；旧客户端不传 `organizingScope` 时按 `type` 推断为 `branch`

#### Scenario: 组内活动
- **WHEN** 党小组组长创建组内活动
- **THEN** 责任党小组固定为本组，不可改为他组

#### Scenario: 历史空值
- **WHEN** 读取既有 `cross-group` 且 `hostGroupId=null` 的活动
- **THEN** 以 `legacyHostGroup: true` 标记为「待补责任党小组」；不猜测归属；再次编辑时要求补选

### Requirement: 组织者默认来自责任党小组

系统 SHALL 默认从责任党小组中选组织者；选他组成员时给出软提示并记录原因，不硬阻断。

#### Scenario: 默认候选
- **WHEN** 打开组织者选择器
- **THEN** 候选默认限定责任党小组；可切换「显示全部成员」

#### Scenario: 例外
- **WHEN** 选择他组成员作为组织者
- **THEN** 弹软提示说明「组织者一般由本组承担」，确认后保存并在记录中留 `organizerExceptionReason`

### Requirement: 跨组深度参与者与组织委员协调

深度参与者可跨组招募，但 SHALL 被显式标记并由组织委员协调。

#### Scenario: 标记跨组招募
- **WHEN** 活动需要从其他党小组招募深度参与者
- **THEN** 活动/工作组写 `recruitmentScope='cross-group'`，并指定协调人（默认本支部组织委员）

#### Scenario: 跨组入组
- **WHEN** 向工作组添加的深度参与者不属于责任党小组
- **THEN** 必须已有跨组招募标记与协调人；成员行记录 `crossGroup: true` 与 `coordinatedBy`；否则拒绝并提示先由组织委员协调

#### Scenario: 组织委员协调面
- **WHEN** 组织委员进入组织台
- **THEN** 能看到「跨组招募待协调」清单（活动 / 责任组 / 已招人数 / 协调状态），可就地标记协调完成

#### Scenario: 不伪造权限
- **WHEN** 组织委员未参与该活动
- **THEN** 协调动作仅限标记与通知，不自动获得活动写权

### Requirement: 数据与文档同步

字段、校验、迁移、种子与文档 SHALL 同批落地，不得只改页面。

#### Scenario: 结构一致
- **WHEN** mock / 种子 / 服务端 / 快照读写同一活动
- **THEN** `hostGroupId`、`recruitmentScope`、`crossGroupCoordinatorId` 与成员行 `crossGroup/coordinatedBy` 结构一致

#### Scenario: 原则落盘
- **WHEN** 本轮完成
- **THEN** `SECRETARY_DIRECTIVES.md` 有逐字原话；`DATA_MODEL.md` 与 SOP 母本同步；`PARALLEL_SKILL_AUDIT §11.3` 有 Boolean 规则

### Requirement: 后续批次规划入乙部

剩余工作 SHALL 按实际批次写入 `CLAUDE.md` 乙部，含引用流程与状态。

#### Scenario: 每批交接
- **WHEN** 本 spec 收尾
- **THEN** 乙部列出未完成项（本 spec 余项、报告汇总、跨角色派生待办、mock 真值、测试分层、第五轮审查、IA 剩余、数据生命周期、任命事务化、宽表卡式化），每行带引用与状态

## MODIFIED Requirements

### Requirement: 活动承办范围（§2.1）

`hostGroupId` 由「`party-group` 必填 / `cross-group` 必须为 null」改为「所有非支部级活动必填；`cross-group` 表示可跨组参与与招募；`branch` 表示支部级法定会议且必须为 null」；`hostGroup` 名称仍为兼容展示字段。

### Requirement: 工作组成员写入

成员仍须同支部；新增「跨组」判定：成员所属党小组 ≠ 责任党小组时，必须有跨组招募标记与协调人，并记录 `crossGroup/coordinatedBy`。

## REMOVED Requirements

### Requirement: 跨组承办不指定党小组

**Reason**：使跨组活动失去组织落点，任务、考察与汇报无法按党小组汇总。
**Migration**：既有 `hostGroupId=null` 的跨组活动标 `legacyHostGroup: true`，在组织台列「待补责任党小组」；不自动猜测，编辑时强制补选。
