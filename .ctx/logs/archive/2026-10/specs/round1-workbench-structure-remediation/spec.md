# Round 1 工作台结构修复 Spec

## Why

Round 1 三路审计（`web-design-guidelines` / `design-with-taste` / `frontend-design`）已对 53 条完成 disposition：9 条共识结项、5 条共识确认、5 条分歧；支书已裁定 U-05 保留修复、U-01 开小调查、P7 先归因、修复 spec 纳入 U-23/U-35。

本 spec 只把已裁定项转成可执行计划，**不在本批实施**。目标是让下一批能直接从 tasks 开工，不再重新争论范围。

## What Changes

- **U-04 纪检考勤**：保留「确认与录入 / 数据查看」两段；修确认段三卡纵排的可访问性与操作路径。
- **U-05 专班管理**：保留顶层三视图；修视图钮 `aria-pressed`、招募浮窗 dialog 语义、折叠按钮 `aria-expanded`。
- **U-09 项目分工空态**：空态增加「去我的分工 / 全局分工」出口；子视图补 `aria-pressed`；去掉 `transition-all`。
- **U-23 活动材料闭环**：补齐独立承载页与入口；定义三步流程、空态、失败态；复用既有服务，不新造数据源。
- **U-35 组长台「我的任务」**：在组长台增加「我的任务」承载面，复用成员台已有的 `listMyProjectTasks` / `completeMyProjectTask`。
- **证据门（不改代码）**：U-01 周期归档入口调查、U-06 表档归因、U-10 平板量测、U-22 page-sweep 红灯归因。
- **不做**：U-53 块决定 tab + 画布（留 Round 4）；不做 68 页签全局重写；不改后端 API/数据模型。

## Impact

- 受影响页面：纪检考勤、组织台专班管理、成员台项目分工、活动详情/材料闭环、组长台待办/本组活动。
- 受影响代码：`disc/attendance-tab.js`、`org/taskforce-tab.js`、`visitor/projects-tab.js`、`components/ui/list-filter.js`、`components/ui/empty-state.js`、`leader-workspace.js`、`leader/*`、`workflow/definitions.js` 等。
- 受影响守卫：新增/更新 a11y 与空态出口守卫；page-sweep 归因记录。
- 不受影响：后端权限链、数据模型、IAAA、U-53 画布。

## ADDED Requirements

### Requirement: U-04 考勤确认段可访问且不三卡纵排

系统 SHALL 保留「确认与录入 / 数据查看」两段，并在「确认与录入」段：

1. 待确认队列整行点击只作鼠标增强；键盘路径保留 checkbox/链接，整行不得是唯一入口。
2. 会议活动 `<label>` 必须与 `<select>` 通过 `for`/`id` 关联。
3. 申诉打回不得使用 `window.prompt`；复用项目内确认浮窗或 `components/ui/modal.js`。
4. 三张卡（待确认 / 申诉 / 会议录入）在 1440 下不得纵向堆满首屏；会议卡默认收起，主行动在首屏可见。

#### Scenario: 键盘用户处理待确认

- **WHEN** 用户只用键盘进入考勤确认段
- **THEN** 能通过 checkbox/按钮完成确认，不依赖整行 `div` 点击
- **THEN** 会议选择 label 可被读屏关联

### Requirement: U-05 专班三视图与浮窗语义

系统 SHALL 保留「专班工作组 / 活动工作组 / 报名总表」三视图，并：

1. 视图钮补 `aria-pressed`，当前视图对读屏可见。
2. 招募浮窗复用 `components/ui/modal.js`（`role="dialog"`、`aria-modal`、Esc、焦点接管与回还）。
3. 「自动发布通知」折叠改 `<button aria-expanded>`，键盘可达。

#### Scenario: 读屏切换视图

- **WHEN** 读屏用户切换到「活动工作组」
- **THEN** 能听到该视图为当前选中
- **THEN** 打开招募浮窗后焦点进入对话框，Esc 关闭并回到触发按钮

### Requirement: U-09 项目分工空态出口

系统 SHALL 在项目分工空态提供可行动出口：

1. 空态增加「去我的分工」或「浏览全局分工」按钮；优先使用 `empty-state.js` 的 `actionHtml` 槽。
2. 若统一检索 `list-filter.js` 的空态仍为纯文本，增加 `emptyActionHtml` 选项并只在本页启用。
3. 子视图按钮补 `aria-pressed`；去掉 `transition-all`，改具体属性。

#### Scenario: 空态不再死胡同

- **WHEN** 用户看到「暂无可承接的项目任务」
- **THEN** 能直接点「去我的分工」或「浏览全局分工」
- **THEN** 不返回空白页

### Requirement: U-23 活动材料闭环承载页

系统 SHALL 提供活动材料闭环的独立承载面：

1. 入口：活动详情、支书/组织台相关活动区至少各有一个入口；不要求新增首页入口。
2. 三步流程：材料清单 → 上传/核对 → 提交归档；每步有完成态与失败态。
3. 空态：无材料时显示「暂无材料」+ 上传入口；失败态显示错误原因 + 重试。
4. 复用既有 `imageRecords` / 活动材料服务；不新造数据源、不新增后端 API。

#### Scenario: 活动结束后收口材料

- **WHEN** 支书从活动详情进入材料闭环
- **THEN** 能看到清单、上传/核对、提交归档三步
- **THEN** 提交后状态变为「已归档」，失败时能重试

### Requirement: U-35 组长台「我的任务」

系统 SHALL 在组长台提供「我的任务」承载面：

1. 位置：组长台「待办」或「本组活动」内的一个分段；不新增顶级 tab，除非另有裁定。
2. 数据：复用 `services/activity/activity.js::listMyProjectTasks` 与 `completeMyProjectTask`；不新造数据源。
3. 空态：无任务时显示「暂无我的任务」+ 去本组活动入口。
4. 与「待办聚合」口径区分：本段只显示按项目身份分配给组长的任务。

#### Scenario: 组长查看自己的项目任务

- **WHEN** 组长进入组长台
- **THEN** 能在「待办」或「本组活动」内看到「我的任务」
- **THEN** 能直接完成任务，不切到成员台

### Requirement: 证据门（不改代码）

本批 SHALL 产出四项证据，不直接改代码：

| 编号 | 证据 | 产出 |
|---|---|---|
| U-01 | 「周期归档·支书待审核」是否还有页面入口；「待我处理」是否应含周报待审 | 一页调查结论 + 建议归属轮次 |
| U-06 | 表头 12px / 首列 14px 是有意新档还是重构遗留 | 归因结论；若有意则更新 P7/DESIGN_SYSTEM，若遗留则回退 13px |
| U-10 | 768 / 1024 视口截图与页签溢出量测 | 平板证据包；不直接修 |
| U-22 | page-sweep P7 / S1 / S19 红灯归因 | 归因报告；区分口径过期 / 页面缺陷 / 环境差异 |

#### Scenario: P7 红灯归因

- **WHEN** page-sweep 报 P7 表头 12px / 首列 14px
- **THEN** 先判定是设计档位还是重构遗留
- **THEN** 不在归因前改代码或放松守卫

## MODIFIED Requirements

无。

## REMOVED Requirements

无。

## Acceptance

- U-04 / U-05 / U-09 的键盘与读屏路径通过手工检查。
- U-23 有独立承载页，三步流程、空态、失败态齐备。
- U-35 组长台可见「我的任务」，能直接完成。
- 四项证据门有书面结论。
- 不修改后端 API/数据模型；不实施 U-53。
- 版本戳更新，相关守卫与真机复核通过。

## Non-goals

- 不做 68 页签全局重写。
- 不实现 U-53 块决定 tab + 画布。
- 不改 IAAA、权限链、数据模型。
- 不在本批实施；本批只写 spec。
