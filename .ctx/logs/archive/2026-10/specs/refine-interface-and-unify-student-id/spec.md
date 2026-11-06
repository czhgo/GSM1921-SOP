# 界面细化 × 两轮平行审查 × 学号唯一 id Spec

## Why

支书在真机审阅中直接看到五类问题：下拉控件没有完全跟随「外观」设置；首页与档案页存在「此地无银三百两」的冗余说明；字少且不可改的信息仍占大块版面；字段名不可理解；档案编号仍是内部 `p` 编号。说明前几轮 parallel agent 审查不够细。本轮要把「繁」的判定标准落到**冗余注释**上，并把数据生命周期（空值字段、硬编码、mock 漂移）纳入常设审查。

## What Changes

### 1. 五处直接修复

- 首页删除 `<p id="dashboard-hero-subtitle">组织生活与工作台账</p>`。
- `person.html`「组织事实」压成一行小标签 + 两列事实；去掉独立 `h2` 与解释性长句。
- `dt`「进入当前阶段」→「阶段起始日」；删除「系统随阶段变更落档，本页只读」。
- 删除「仅新增时采集」「同时是登录账号」一类**无动作、只解释内部口径**的冗余小字。
- 档案编号统一用**学号**；界面不再出现 `p*` 内部 id。

### 2. 下拉控件完整实现「外观」

`components/ui/custom-select.js` + `styles.css`：菜单项、分组标题、搜索框、空态必须随 `html.font-size-large` 放大；暗色主题用既有变量；选中态用主题色。补守卫。

### 3. 第一轮：前端「脏乱繁」平行审查（重点：冗余注释）

- 全站扫描「此地无银三百两」文案：只解释内部规则、不提供动作、不改变决策的小字/副标题/括注。
- 判据：**删掉后用户仍能完成动作 ⇒ 删**；需要保留的改成可执行提示（按钮/短标签）。
- 同屏卡片数、首屏信息密度、标题层级一并复核。
- 产出 `.ctx/logs/archive/2026-10/UI_REDUNDANCY_AUDIT.md`（结论进正式文档，原文归档）。

### 4. 第二轮：数据生命周期平行审查

- 所有「无信息字段」：是否显示 `—`、是否有**改写入口**；无入口的只读展示必须说明来源或不再占位。
- 所有与工作流相关的**硬编码**：状态、计数、日期、人数、进度、支部 id；能派生的一律改为计算。
- mock 数据与当前代码同步：枚举、`workgroupId`、已撤页签、种子人数与账号。
- 产出 `.ctx/logs/archive/2026-10/DATA_LIFECYCLE_AUDIT.md`。

### 5. 学号唯一 id（**BREAKING**，Phase 2）

- `users.id` 一律改为学号；教工/党委用**工号**；不再生成 `p*`。
- 迁移 v6：按 `users.studentId` 把全库人员引用（活动 organizer、工作组成员、待办、考勤、考察、评分、通知受众、授权、分组等）从 `p*` 映射为学号，再改 `users.id`；无法映射者列清单并阻断，不静默丢。
- mock 全量重写为学号；`accounts.js` 的 `personId` 改学号；登录支持旧 `p*` 仅作迁移期别名（一次告警，不落库）。
- 界面、链接、导出、通知一律用学号；内部日志可留旧 id 仅作迁移证据。
- 守卫：全库不得再新增 `p*` 人员 id；人员引用必须能在 `users.id` 找到。

## Impact

- 前端：`docs/index.html`、`person-entry.js`、`custom-select.js`、`styles.css`、`person-profile-sections.js`、各台概览/档案相关 tab。
- 数据：`docs/src/data/mock/**`、`server/seed.js`、`server/db.js`（migration v6）、`docs/src/services/core/auth.js`、`docs/src/data/api-adapter.js`。
- 文档：`DESIGN_SYSTEM.md`（冗余注释判据）、`DATA_MODEL.md`（id 口径）、`OPERATIONS_GUIDE`/`DATA_CONSISTENCY_CHECKLIST`（审查常设化）。
- 测试：新增 `ui-redundancy-guard` / `data-lifecycle-guard` / `identity-student-id-guard`；现有大量 `p*` 断言同步。

## Acceptance

- 五处直接修复真机可见；下拉在「大字号 / 暗色 / 主题色」三态下与输入框同档。
- 两轮审查各 ≥20 条发现，按「删 / 改 / 立项」处置；冗余注释清单归零或进入白名单。
- 无入口的空值字段不再以「未填写」占位；硬编码计数改为派生。
- Phase 2：全库无 `p*` 人员 id；登录、档案、活动、工作组、待办、考察链路全绿；迁移可重跑且有映射率读数。
- `npm run test:daily` 全绿；版本戳前进；中文提交。

## Non-goals

- 不做视觉改版；不改业务流程与权限语义。
- 不删除历史日志；审计原文进 archive。
- 不在 Phase 1 混入 Phase 2 的主键迁移提交。
